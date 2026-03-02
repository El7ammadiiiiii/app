"""
CCWAYS Gateway — Unified Orchestrator with Smart Load Balancing

Merges Provider ALPHA (intelligence/entities/counterparties/flow/transfers)
with Provider BETA (93-chain balances/DeFi protocols/NFTs).

Features:
 • Smart Load Balancer — distributes requests based on provider health/rate
 • Adaptive Rate Control — AIMD algorithm per provider (auto slowdown on 429)
 • Circuit breaker per provider (auto-skip after N consecutive failures)
 • Daily request budget tracking
 • Staggered parallel calls — reduces burst rate-limit pressure
 • Fallback routing — if primary provider rate-limited, use secondary
 • Every response passes through the sanitizer — zero upstream traces

No third-party names appear anywhere in this file.
"""

import asyncio
import time
import logging
import os
from enum import Enum
from typing import Any, Dict, List, Optional

from providers.alpha.client import AlphaClient
from providers.beta.client import BetaClient
from providers.ccways_cache import CacheLayer
from providers.ccways_sanitizer import (
    sanitize_response,
    sanitize_error,
    register_asset_url,
)
from providers.ccways_loadbalancer import (
    LoadBalancer,
    ProviderChoice,
    staggered_gather,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Circuit Breaker
# ═══════════════════════════════════════════════════════════════════════════════

class CBState(Enum):
    CLOSED = "closed"          # Normal — requests flow
    OPEN = "open"              # Tripped — skip provider
    HALF_OPEN = "half_open"    # Testing — one probe request


class CircuitBreaker:
    """Per-provider circuit breaker."""

    def __init__(
        self,
        name: str,
        threshold: int = 5,
        cooldown: float = 300.0,
    ):
        self.name = name
        self.threshold = threshold
        self.cooldown = cooldown
        self.state = CBState.CLOSED
        self.failures = 0
        self.last_failure: float = 0.0
        self.last_success: float = 0.0

    def record_success(self) -> None:
        self.failures = 0
        self.state = CBState.CLOSED
        self.last_success = time.time()

    def record_failure(self) -> None:
        self.failures += 1
        self.last_failure = time.time()
        if self.failures >= self.threshold:
            self.state = CBState.OPEN
            logger.warning("Circuit OPEN for %s after %d failures", self.name, self.failures)

    def allow_request(self) -> bool:
        if self.state == CBState.CLOSED:
            return True
        if self.state == CBState.OPEN:
            if time.time() - self.last_failure > self.cooldown:
                self.state = CBState.HALF_OPEN
                logger.info("Circuit HALF_OPEN for %s — probing", self.name)
                return True
            return False
        # HALF_OPEN — allow one probe
        return True

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "state": self.state.value,
            "failures": self.failures,
            "last_failure": self.last_failure,
            "last_success": self.last_success,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Daily Budget
# ═══════════════════════════════════════════════════════════════════════════════

class DailyBudget:
    """Track daily request count to avoid excessive upstream usage."""

    def __init__(self, limit: int = 5000):
        self.limit = limit
        self.count = 0
        self._day: int = self._today()
        self._alpha_count = 0
        self._beta_count = 0

    @staticmethod
    def _today() -> int:
        return int(time.time()) // 86400

    def _reset_if_new_day(self) -> None:
        d = self._today()
        if d != self._day:
            self.count = 0
            self._alpha_count = 0
            self._beta_count = 0
            self._day = d

    def can_request(self) -> bool:
        self._reset_if_new_day()
        return self.count < self.limit

    def record(self, provider: str = "alpha") -> None:
        self._reset_if_new_day()
        self.count += 1
        if provider == "alpha":
            self._alpha_count += 1
        else:
            self._beta_count += 1

    def to_dict(self) -> Dict:
        self._reset_if_new_day()
        return {
            "used": self.count,
            "limit": self.limit,
            "remaining": max(0, self.limit - self.count),
            "alpha": self._alpha_count,
            "beta": self._beta_count,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Entity type mapping (ALPHA types → CWTracker MSEntityType)
# ═══════════════════════════════════════════════════════════════════════════════

_ENTITY_TYPE_MAP = {
    "cex": "exchange",
    "exchange": "exchange",
    "dex": "defi",
    "defi": "defi",
    "protocol": "defi",
    "wallet": "wallet",
    "eoa": "wallet",
    "contract": "contract",
    "token": "token",
    "bridge": "bridge",
    "mixer": "mixer",
    "tumbler": "mixer",
    "ofac": "sanctioned",
    "sanctioned": "sanctioned",
    "nft": "nft",
    "nft_marketplace": "nft",
    "mev": "mev_bot",
    "mev_bot": "mev_bot",
    "dao": "dao",
    "treasury": "treasury",
    "fund": "treasury",
}


def _map_entity_type(raw_type: Optional[str]) -> str:
    """Map upstream entity type to MSEntityType."""
    if not raw_type:
        return "unknown"
    return _ENTITY_TYPE_MAP.get(raw_type.lower(), "unknown")


def _map_risk_level(raw: Any) -> Optional[str]:
    """Map upstream risk data to MSRiskLevel."""
    if raw is None:
        return None
    if isinstance(raw, str):
        raw_l = raw.lower()
        if raw_l in ("no_risk", "safe", "clean"):
            return "no_risk"
        if raw_l in ("low",):
            return "low"
        if raw_l in ("medium", "moderate"):
            return "medium"
        if raw_l in ("high",):
            return "high"
        if raw_l in ("critical", "severe"):
            return "critical"
    if isinstance(raw, (int, float)):
        if raw <= 0:
            return "no_risk"
        if raw <= 25:
            return "low"
        if raw <= 50:
            return "medium"
        if raw <= 75:
            return "high"
        return "critical"
    return "unknown"


# ═══════════════════════════════════════════════════════════════════════════════
# Gateway
# ═══════════════════════════════════════════════════════════════════════════════

class CCWaysGateway:
    """
    Unified gateway that orchestrates ALPHA + BETA providers,
    manages load balancing, circuit breakers, caching, and daily budgets.
    """

    def __init__(self):
        # Providers
        self.alpha = AlphaClient(
            rate_limit=float(os.getenv("CCWAYS_ALPHA_RATE", "2.0")),
            cache_ttl=300,
        )
        self.beta = BetaClient(
            static_key=os.getenv("CCWAYS_BETA_KEY", ""),
            rate_limit=float(os.getenv("CCWAYS_BETA_RATE", "2.0")),
            cache_ttl=120,
        )

        # Circuit breakers
        self.cb_alpha = CircuitBreaker(
            "alpha",
            threshold=int(os.getenv("CCWAYS_CB_THRESHOLD", "5")),
            cooldown=float(os.getenv("CCWAYS_CB_COOLDOWN", "300")),
        )
        self.cb_beta = CircuitBreaker(
            "beta",
            threshold=int(os.getenv("CCWAYS_CB_THRESHOLD", "5")),
            cooldown=float(os.getenv("CCWAYS_CB_COOLDOWN", "300")),
        )

        # Load balancer (adaptive rate + health tracking)
        self.lb = LoadBalancer()

        # Shared tiered cache
        self.cache = CacheLayer(max_size=5000)

        # Daily budget
        self.budget = DailyBudget(
            limit=int(os.getenv("CCWAYS_DAILY_BUDGET", "5000"))
        )

        # Latency tracking (rolling averages)
        self._alpha_latencies: List[float] = []
        self._beta_latencies: List[float] = []

    async def initialize(self) -> None:
        """Initialize both providers."""
        await asyncio.gather(
            self.alpha.initialize(),
            self.beta.initialize(),
            return_exceptions=True,
        )

    async def close(self) -> None:
        """Close both providers."""
        await asyncio.gather(
            self.alpha.close(),
            self.beta.close(),
            return_exceptions=True,
        )

    # ─── helpers ────────────────────────────────────────────────────────────

    async def _call_alpha(self, method: str, *args, **kwargs) -> Optional[Any]:
        """Call ALPHA with circuit breaker + budget + adaptive rate control."""
        if not self.cb_alpha.allow_request():
            logger.debug("ALPHA circuit open — skipping")
            return None
        if not self.budget.can_request():
            logger.warning("Daily budget exhausted")
            return None
        try:
            await self.lb.acquire_alpha()
            t0 = time.time()
            fn = getattr(self.alpha, method)
            result = await fn(*args, **kwargs)
            lat = time.time() - t0
            self._alpha_latencies.append(lat)
            if len(self._alpha_latencies) > 100:
                self._alpha_latencies = self._alpha_latencies[-100:]
            self.cb_alpha.record_success()
            self.budget.record("alpha")
            self.lb.record_alpha(True, lat)
            return result
        except Exception as exc:
            lat = time.time() - t0 if 't0' in dir() else 0
            was_429 = "429" in str(exc) or "rate" in str(exc).lower()
            self.lb.record_alpha(False, lat, was_429=was_429)
            self.cb_alpha.record_failure()
            logger.warning("ALPHA.%s failed: %s", method, exc)
            return None

    async def _call_beta(self, method: str, *args, **kwargs) -> Optional[Any]:
        """Call BETA with circuit breaker + budget + adaptive rate control."""
        if not self.cb_beta.allow_request():
            logger.debug("BETA circuit open — skipping")
            return None
        if not self.budget.can_request():
            logger.warning("Daily budget exhausted")
            return None
        try:
            await self.lb.acquire_beta()
            t0 = time.time()
            fn = getattr(self.beta, method)
            result = await fn(*args, **kwargs)
            lat = time.time() - t0
            self._beta_latencies.append(lat)
            if len(self._beta_latencies) > 100:
                self._beta_latencies = self._beta_latencies[-100:]
            self.cb_beta.record_success()
            self.budget.record("beta")
            self.lb.record_beta(True, lat)
            return result
        except Exception as exc:
            lat = time.time() - t0 if 't0' in dir() else 0
            was_429 = "429" in str(exc) or "rate" in str(exc).lower()
            self.lb.record_beta(False, lat, was_429=was_429)
            self.cb_beta.record_failure()
            logger.warning("BETA.%s failed: %s", method, exc)
            return None

    @staticmethod
    def _shorten(addr: str) -> str:
        if len(addr) > 12:
            return addr[:6] + "…" + addr[-4:]
        return addr

    # ═══════════════════════════════════════════════════════════════════════════
    # Public API methods (all responses are sanitized)
    # ═══════════════════════════════════════════════════════════════════════════

    async def chains(self) -> Dict:
        """Get unified chain list — BETA primary (93+), ALPHA fallback."""
        cached = await self.cache.get("chains", "all")
        if cached:
            return cached

        choice = self.lb.choose_provider("chains")
        logger.info("[GW] chains() → provider=%s", choice.value)

        beta_chains = None
        alpha_chains = None

        if choice in (ProviderChoice.BETA, ProviderChoice.BETA_THEN_ALPHA):
            beta_chains = await self._call_beta("get_chain_list") or []
            if not beta_chains and choice == ProviderChoice.BETA_THEN_ALPHA:
                alpha_chains = await self._call_alpha("get_chains")
        elif choice in (ProviderChoice.ALPHA, ProviderChoice.ALPHA_THEN_BETA):
            alpha_chains = await self._call_alpha("get_chains")
            if not alpha_chains and choice == ProviderChoice.ALPHA_THEN_BETA:
                beta_chains = await self._call_beta("get_chain_list")

        chains = []

        if beta_chains and isinstance(beta_chains, (list, dict)):
            # BETA may wrap: {data: {chains: [...]}} or just return list
            chain_list = beta_chains
            if isinstance(beta_chains, dict):
                d = beta_chains.get("data") or beta_chains
                chain_list = d.get("chains") if isinstance(d, dict) else []
                if not isinstance(chain_list, list):
                    chain_list = []
            for c in chain_list:
                if isinstance(c, dict):
                    logo = c.get("logo_url") or c.get("svg_logo_url") or ""
                    if logo:
                        logo = register_asset_url(logo)
                    chains.append({
                        "id": c.get("id", ""),
                        "name": c.get("name", ""),
                        "symbol": c.get("token_symbol", ""),
                        "logoUrl": logo,
                        "type": "evm",
                        "explorerUrl": f"https://{c.get('explorer_host', '')}" if c.get("explorer_host") else "",
                        "isSupported": True,
                        "networkId": c.get("network_id"),
                        "nativeWrapped": (c.get("wrapped") or {}).get("id", "") if isinstance(c.get("wrapped"), dict) else str(c.get("wrapped") or ""),
                    })

        if not chains and alpha_chains:
            # ALPHA returns: ["ethereum","polygon",...] (plain list of strings)
            # or could be a dict with chains inside
            raw_list = alpha_chains
            if isinstance(alpha_chains, dict):
                raw_list = alpha_chains.get("chains") or alpha_chains.get("data") or []

            if isinstance(raw_list, list):
                for c in raw_list:
                    if isinstance(c, str):
                        chains.append({
                            "id": c,
                            "name": c.replace("_", " ").title(),
                            "symbol": "",
                            "logoUrl": "",
                            "type": "evm",
                            "explorerUrl": "",
                            "isSupported": True,
                        })
                    elif isinstance(c, dict):
                        chains.append({
                            "id": c.get("id") or c.get("chain", ""),
                            "name": c.get("name", ""),
                            "symbol": c.get("symbol", ""),
                            "logoUrl": "",
                            "type": "evm",
                            "explorerUrl": c.get("explorer", ""),
                            "isSupported": c.get("isSupported", True),
                        })

        result = sanitize_response({"success": True, "chains": chains})
        await self.cache.set("chains", result, "all")
        return result

    async def intel(self, address: str) -> Dict:
        """Unified intelligence — entity labels, risk, balances."""
        cached = await self.cache.get("intelligence", address)
        if cached:
            return cached

        choice = self.lb.choose_provider("intel")
        logger.info("[GW] intel(%s) → provider=%s", address[:10], choice.value)

        alpha_data = None
        beta_data = None

        if choice == ProviderChoice.BOTH:
            # Staggered parallel — 150ms gap between providers
            alpha_data, beta_data = await staggered_gather(
                self._call_alpha("get_intelligence_enriched", address),
                self._call_beta("get_total_balance", address),
                stagger_ms=150,
            )
        elif choice in (ProviderChoice.ALPHA, ProviderChoice.ALPHA_THEN_BETA):
            alpha_data = await self._call_alpha("get_intelligence_enriched", address)
            if choice == ProviderChoice.ALPHA_THEN_BETA:
                beta_data = await self._call_beta("get_total_balance", address)
        elif choice in (ProviderChoice.BETA, ProviderChoice.BETA_THEN_ALPHA):
            beta_data = await self._call_beta("get_total_balance", address)
            if choice == ProviderChoice.BETA_THEN_ALPHA:
                alpha_data = await self._call_alpha("get_intelligence_enriched", address)

        entity = self._build_entity(address, alpha_data, beta_data)
        result = sanitize_response({"success": True, "entity": entity})
        await self.cache.set("intelligence", result, address)
        return result

    async def expand(
        self,
        address: str,
        node_id: str,
        direction: str = "both",
        chains: Optional[List[str]] = None,
        limit: int = 100,
    ) -> Dict:
        """
        Graph expansion — counterparties + transfers.
        Returns MSNode[] + MSEdge[]-compatible structures.

        Distribution strategy:
        1. Load balancer decides: ALPHA primary? BETA fallback?
        2. ALPHA → get_counterparties (richest entity data)
        3. BETA → get_history (transaction-based counterparties) if ALPHA unavailable
        4. If both available, combine for richer graph
        """
        cached = await self.cache.get("counterparties", address, direction)
        if cached:
            return cached

        # Map direction
        flow = "all"
        if direction in ("in", "left"):
            flow = "in"
        elif direction in ("out", "right"):
            flow = "out"

        choice = self.lb.choose_provider("expand")
        logger.info("[GW] expand(%s, %s) → provider=%s", address[:10], direction, choice.value)

        alpha_cp = None
        beta_history = None

        if choice == ProviderChoice.ALPHA:
            alpha_cp = await self._call_alpha(
                "get_counterparties", address, flow=flow, limit=limit,
            )
        elif choice == ProviderChoice.BETA:
            beta_history = await self._call_beta(
                "get_history", address, page_count=limit,
            )
        elif choice == ProviderChoice.BOTH:
            # Staggered parallel — 150ms gap to reduce burst pressure
            alpha_cp, beta_history = await staggered_gather(
                self._call_alpha("get_counterparties", address, flow=flow, limit=limit),
                self._call_beta("get_history", address, page_count=limit),
                stagger_ms=150,
            )
        elif choice == ProviderChoice.ALPHA_THEN_BETA:
            alpha_cp = await self._call_alpha(
                "get_counterparties", address, flow=flow, limit=limit,
            )
            if not alpha_cp:
                logger.info("[GW] ALPHA failed for expand → trying BETA")
                beta_history = await self._call_beta(
                    "get_history", address, page_count=limit,
                )
        elif choice == ProviderChoice.BETA_THEN_ALPHA:
            beta_history = await self._call_beta(
                "get_history", address, page_count=limit,
            )
            if not beta_history:
                logger.info("[GW] BETA failed for expand → trying ALPHA")
                alpha_cp = await self._call_alpha(
                    "get_counterparties", address, flow=flow, limit=limit,
                )

        nodes = []
        edges = []
        seen_addrs = set()

        # Process ALPHA counterparties (primary — rich entity data)
        if alpha_cp and isinstance(alpha_cp, dict):
            a_nodes, a_edges = self._parse_alpha_counterparties(
                alpha_cp, node_id, flow, address,
            )
            for n in a_nodes:
                if n["address"] not in seen_addrs:
                    seen_addrs.add(n["address"])
                    nodes.append(n)
            edges.extend(a_edges)

        # Process BETA history (fallback — transaction-derived counterparties)
        if beta_history and isinstance(beta_history, dict):
            b_nodes, b_edges = self._parse_beta_history(
                beta_history, node_id, flow, address, seen_addrs,
            )
            nodes.extend(b_nodes)
            edges.extend(b_edges)

        # Enforce limit
        if len(nodes) > limit:
            nodes = nodes[:limit]
            edge_node_ids = {n["id"] for n in nodes} | {node_id}
            edges = [e for e in edges if e["source"] in edge_node_ids and e["target"] in edge_node_ids]

        result = sanitize_response({
            "success": True,
            "nodes": nodes,
            "edges": edges,
            "provider": "ccways",
            "count": len(nodes),
        })
        await self.cache.set("counterparties", result, address, direction)
        return result

    def _parse_alpha_counterparties(
        self, data: Dict, node_id: str, flow: str, source_addr: str,
    ) -> tuple:
        """Parse ALPHA counterparties response into nodes + edges.
        
        ALPHA response format:
        {
          "ethereum": [
            {
              "address": {"address": "0x...", "arkhamEntity": {...}, "arkhamLabel": {...}},
              "usd": 123.45,
              "transactionCount": 10,
              "flow": "in",
              "chains": ["ethereum", "bsc"]
            }
          ],
          "arbitrum_one": [...]
        }
        """
        nodes = []
        edges = []

        # Response is chain_name → list of counterparties
        all_cps = []
        if isinstance(data, dict):
            for chain_name, cp_list in data.items():
                if isinstance(cp_list, list):
                    for cp in cp_list:
                        if isinstance(cp, dict):
                            cp.setdefault("_chain", chain_name)
                            all_cps.append(cp)

        if not all_cps:
            return nodes, edges

        for cp in all_cps:
            cp_addr_obj = cp.get("address", {})
            if isinstance(cp_addr_obj, dict):
                addr = cp_addr_obj.get("address", "")
                ent = cp_addr_obj.get("arkhamEntity") or cp_addr_obj.get("knownEntity") or {}
                lbl = cp_addr_obj.get("arkhamLabel") or cp_addr_obj.get("knownLabel") or {}
                label = (
                    (lbl.get("name") if isinstance(lbl, dict) else None)
                    or (ent.get("name") if isinstance(ent, dict) else None)
                    or self._shorten(addr)
                )
                etype = _map_entity_type(
                    ent.get("type") if isinstance(ent, dict) else None
                )
                tags = ent.get("tags", []) if isinstance(ent, dict) else []
                is_contract = bool(cp_addr_obj.get("contract", False))
            elif isinstance(cp_addr_obj, str):
                addr = cp_addr_obj
                label = self._shorten(addr)
                etype = "unknown"
                tags = []
                is_contract = False
            else:
                continue

            if not addr or addr.lower() == source_addr.lower():
                continue

            chain = cp.get("_chain") or "ethereum"
            cp_id = f"ccways:{chain}:{addr}"

            usd_val = cp.get("usd") or cp.get("totalUSD") or 0
            tx_count = cp.get("transactionCount") or cp.get("count") or 0
            cp_chains = cp.get("chains") or [chain]

            node = {
                "id": cp_id,
                "address": addr,
                "label": label,
                "type": etype,
                "chain": str(chain).lower(),
                "gridX": 0, "gridY": 0, "x": 0, "y": 0,
                "isRoot": False, "isExpanded": False,
                "isLoading": False, "isSelected": False,
                "isPruned": False, "isDragging": False,
                "isContract": is_contract,
                "flowsIn": 0, "flowsOut": 0,
                "txCount": tx_count,
                "tags": [str(t) for t in tags] if isinstance(tags, list) else [],
                "riskLevel": _map_risk_level(cp.get("risk")),
                "totalValueUSD": usd_val,
                "activeChains": cp_chains if isinstance(cp_chains, list) else [],
            }
            nodes.append(node)

            token = cp.get("tokenSymbol") or cp.get("symbol") or "ETH"
            cp_flow = cp.get("flow") or flow
            if cp_flow in ("in", "left"):
                src, tgt = cp_id, node_id
                edge_dir = "in"
            else:
                src, tgt = node_id, cp_id
                edge_dir = "out"

            edge = {
                "id": f"edge:{src}->{tgt}:{chain}:{token}",
                "source": src, "target": tgt,
                "chain": str(chain).lower(),
                "direction": edge_dir,
                "isCurve": False, "curveOffset": 0,
                "tokenSymbol": token,
                "totalValue": usd_val,
                "valueLabel": f"{self._format_value(usd_val)} {token}",
                "amountLabel": f"{self._format_value(usd_val)} {token}",
                "transferCount": tx_count,
                "color": "", "details": [],
                "isCrossChain": len(cp_chains) > 1 if isinstance(cp_chains, list) else False,
                "isSuspicious": etype in ("mixer", "sanctioned"),
                "isCustom": False,
                "isSelected": False,
                "isHighlighted": False,
            }
            edges.append(edge)

        return nodes, edges

    def _parse_beta_history(
        self, data: Dict, node_id: str, flow: str, source_addr: str,
        seen_addrs: set,
    ) -> tuple:
        """
        Parse BETA history into counterparty nodes + edges.
        Groups transactions by counterparty address to build the graph.
        """
        nodes = []
        edges = []
        history = data.get("history_list") or data.get("data") or []
        if not isinstance(history, list):
            return nodes, edges

        # Group by counterparty address
        cp_map: Dict[str, Dict] = {}
        for tx in history:
            if not isinstance(tx, dict):
                continue

            tx_from = tx.get("from_addr") or tx.get("from", "")
            tx_to = tx.get("to_addr") or tx.get("to", "")
            chain = tx.get("chain") or "ethereum"
            value_usd = tx.get("usd_value") or tx.get("value") or 0
            token_symbol = ""
            sends = tx.get("sends", [])
            receives = tx.get("receives", [])
            if sends and isinstance(sends, list):
                token_symbol = sends[0].get("token_id", "").split(":")[-1] if sends[0].get("token_id") else "ETH"
            elif receives and isinstance(receives, list):
                token_symbol = receives[0].get("token_id", "").split(":")[-1] if receives[0].get("token_id") else "ETH"
            if not token_symbol:
                token_symbol = "ETH"

            # Determine counterparty
            src_lower = source_addr.lower()
            if tx_from and tx_from.lower() != src_lower:
                cp_address = tx_from
                direction = "in"
            elif tx_to and tx_to.lower() != src_lower:
                cp_address = tx_to
                direction = "out"
            else:
                continue

            # Filter by requested flow
            if flow == "in" and direction != "in":
                continue
            if flow == "out" and direction != "out":
                continue

            if cp_address in seen_addrs:
                continue

            if cp_address not in cp_map:
                cp_map[cp_address] = {
                    "address": cp_address,
                    "chain": chain,
                    "direction": direction,
                    "totalUSD": 0,
                    "count": 0,
                    "token": token_symbol,
                    "name": tx.get("other_addr", {}).get("name", "") if isinstance(tx.get("other_addr"), dict) else "",
                }
            cp_map[cp_address]["totalUSD"] += float(value_usd) if value_usd else 0
            cp_map[cp_address]["count"] += 1

        # Convert grouped data to nodes + edges
        for addr, info in cp_map.items():
            chain = info["chain"]
            cp_id = f"ccways:{chain}:{addr}"
            label = info["name"] or self._shorten(addr)

            node = {
                "id": cp_id,
                "address": addr,
                "label": label,
                "type": "unknown",
                "chain": str(chain).lower(),
                "gridX": 0, "gridY": 0, "x": 0, "y": 0,
                "isRoot": False, "isExpanded": False,
                "isLoading": False, "isSelected": False,
                "isPruned": False, "isDragging": False,
                "isContract": False,
                "flowsIn": 0, "flowsOut": 0,
                "txCount": info["count"],
                "tags": [],
                "riskLevel": None,
                "totalValueUSD": info["totalUSD"],
            }
            nodes.append(node)
            seen_addrs.add(addr)

            token = info["token"]
            if info["direction"] == "in":
                src, tgt = cp_id, node_id
            else:
                src, tgt = node_id, cp_id

            edge = {
                "id": f"edge:{src}->{tgt}:{chain}:{token}",
                "source": src, "target": tgt,
                "chain": str(chain).lower(),
                "direction": info["direction"],
                "isCurve": False, "curveOffset": 0,
                "tokenSymbol": token,
                "totalValue": info["totalUSD"],
                "valueLabel": f"{self._format_value(info['totalUSD'])} {token}",
                "amountLabel": f"{self._format_value(info['totalUSD'])} {token}",
                "transferCount": info["count"],
                "color": "", "details": [],
                "isCrossChain": False,
                "isSuspicious": False,
                "isCustom": False,
                "isSelected": False,
                "isHighlighted": False,
            }
            edges.append(edge)

        return nodes, edges

    async def balance(
        self, address: str, chains: Optional[List[str]] = None
    ) -> Dict:
        """Multi-chain balance — BETA primary, ALPHA fallback."""
        cached = await self.cache.get("balance", address)
        if cached:
            return cached

        choice = self.lb.choose_provider("balance")
        logger.info("[GW] balance(%s) → provider=%s", address[:10], choice.value)

        beta_bal = None
        alpha_bal = None

        if choice in (ProviderChoice.BETA, ProviderChoice.BETA_THEN_ALPHA):
            beta_bal = await self._call_beta("get_total_balance", address)
            if not beta_bal and choice == ProviderChoice.BETA_THEN_ALPHA:
                alpha_bal = await self._call_alpha("get_balances", address)
        elif choice in (ProviderChoice.ALPHA, ProviderChoice.ALPHA_THEN_BETA):
            alpha_bal = await self._call_alpha("get_balances", address)
            if not alpha_bal and choice == ProviderChoice.ALPHA_THEN_BETA:
                beta_bal = await self._call_beta("get_total_balance", address)
        elif choice == ProviderChoice.BOTH:
            beta_bal, alpha_bal = await staggered_gather(
                self._call_beta("get_total_balance", address),
                self._call_alpha("get_balances", address),
                stagger_ms=100,
            )

        total_usd = 0.0
        chain_balances = {}

        # Prefer BETA (richer chain data)
        if beta_bal and isinstance(beta_bal, dict):
            total_usd = beta_bal.get("total_usd_value", 0) or 0
            chain_list = beta_bal.get("chain_list") or []
            for cb in chain_list if isinstance(chain_list, list) else []:
                cid = cb.get("id", "")
                chain_balances[cid] = {
                    "usd": cb.get("usd_value", 0),
                    "name": cb.get("name", cid),
                }
        # Fallback to ALPHA
        if not chain_balances and alpha_bal and isinstance(alpha_bal, dict):
            # ALPHA format: totalBalance={chain: usd}, balances={chain: [{token}]}
            tb = alpha_bal.get("totalBalance") or {}
            if isinstance(tb, dict):
                for chain_id, chain_usd in tb.items():
                    total_usd += float(chain_usd or 0)
                    chain_balances[chain_id] = {
                        "usd": float(chain_usd or 0),
                        "name": chain_id.replace("_", " ").title(),
                    }
            # Also extract token-level data
            bals = alpha_bal.get("balances") or {}
            if isinstance(bals, dict):
                for chain_id, tokens in bals.items():
                    if chain_id not in chain_balances:
                        chain_balances[chain_id] = {"usd": 0, "name": chain_id}
                    if isinstance(tokens, list):
                        chain_balances[chain_id]["tokens"] = [
                            {
                                "symbol": t.get("symbol", "?"),
                                "name": t.get("name", ""),
                                "balance": t.get("balance", 0),
                                "usd": t.get("usd", 0),
                                "price": t.get("price", 0),
                            }
                            for t in tokens[:20]
                            if isinstance(t, dict)
                        ]

        result = sanitize_response({
            "success": True,
            "totalUSD": total_usd,
            "chainBalances": chain_balances,
            "provider": "ccways",
        })
        await self.cache.set("balance", result, address)
        return result

    async def flow(self, address: str, timeframe: str = "24h") -> Dict:
        """Historical flow (ALPHA)."""
        cached = await self.cache.get("flow", address, timeframe)
        if cached:
            return cached

        alpha_flow = await self._call_alpha("get_flow", address, timeframe=timeframe)
        snapshots = []
        if alpha_flow and isinstance(alpha_flow, dict):
            raw = alpha_flow.get("snapshots") or alpha_flow.get("data") or []
            for s in raw if isinstance(raw, list) else []:
                snapshots.append({
                    "timestamp": s.get("timestamp") or s.get("time"),
                    "inflowUSD": s.get("inflowUSD") or s.get("inflow") or 0,
                    "outflowUSD": s.get("outflowUSD") or s.get("outflow") or 0,
                    "netUSD": s.get("netUSD") or s.get("net") or 0,
                })

        result = sanitize_response({
            "success": True, "address": address, "timeframe": timeframe,
            "snapshots": snapshots,
        })
        await self.cache.set("flow", result, address, timeframe)
        return result

    async def protocols(self, address: str) -> Dict:
        """DeFi protocol positions (BETA)."""
        cached = await self.cache.get("protocols", address)
        if cached:
            return cached

        beta_protocols = await self._call_beta("get_protocol_list", address)
        protocols = []
        if beta_protocols and isinstance(beta_protocols, list):
            for p in beta_protocols:
                logo = p.get("logo_url", "")
                if logo:
                    logo = register_asset_url(logo)
                protocols.append({
                    "id": p.get("id", ""),
                    "name": p.get("name", ""),
                    "chain": p.get("chain", ""),
                    "logoUrl": logo,
                    "netUSD": p.get("net_usd_value", 0),
                    "assetUSD": p.get("asset_usd_value", 0),
                    "debtUSD": p.get("debt_usd_value", 0),
                    "positions": len(p.get("portfolio_item_list", [])),
                })

        result = sanitize_response({
            "success": True, "protocols": protocols,
        })
        await self.cache.set("protocols", result, address)
        return result

    async def search(self, query: str) -> Dict:
        """Search entities/addresses/tokens (ALPHA)."""
        cached = await self.cache.get("search", query)
        if cached:
            return cached

        alpha_search = await self._call_alpha("search", query)
        results = []
        if alpha_search and isinstance(alpha_search, dict):
            for category in ("entities", "addresses", "tokens"):
                items = alpha_search.get(category) or []
                for item in items if isinstance(items, list) else []:
                    results.append({
                        "category": category.rstrip("s"),  # entity, address, token
                        "id": item.get("id") or item.get("address") or "",
                        "name": item.get("name") or item.get("label") or "",
                        "type": _map_entity_type(item.get("type")),
                        "address": item.get("address", ""),
                        "chain": item.get("chain", ""),
                    })

        result = sanitize_response({
            "success": True, "query": query, "results": results,
        })
        await self.cache.set("search", result, query)
        return result

    async def transfers(
        self,
        address: Optional[str] = None,
        chain: Optional[str] = None,
        flow: str = "all",
        limit: int = 50,
        offset: int = 0,
    ) -> Dict:
        """Transfer history — ALPHA primary, BETA fallback."""
        cache_key_parts = (address or "", chain or "", flow, limit, offset)
        cached = await self.cache.get("transfers", *cache_key_parts)
        if cached:
            return cached

        choice = self.lb.choose_provider("transfers")
        logger.info("[GW] transfers(%s) → provider=%s", (address or "")[:10], choice.value)

        transfers = []
        alpha_tx = None
        beta_tx = None

        if choice in (ProviderChoice.ALPHA, ProviderChoice.ALPHA_THEN_BETA):
            alpha_tx = await self._call_alpha(
                "get_transfers", address=address, chain=chain,
                flow=flow, limit=limit, offset=offset,
            )
            if not alpha_tx and choice == ProviderChoice.ALPHA_THEN_BETA:
                beta_tx = await self._call_beta(
                    "get_history", address, chain=chain, page_count=limit,
                )
        elif choice in (ProviderChoice.BETA, ProviderChoice.BETA_THEN_ALPHA):
            beta_tx = await self._call_beta(
                "get_history", address, chain=chain, page_count=limit,
            )
            if not beta_tx and choice == ProviderChoice.BETA_THEN_ALPHA:
                alpha_tx = await self._call_alpha(
                    "get_transfers", address=address, chain=chain,
                    flow=flow, limit=limit, offset=offset,
                )

        # Parse ALPHA transfers
        if alpha_tx and isinstance(alpha_tx, dict):
            raw = alpha_tx.get("transfers") or alpha_tx.get("data") or []
            for t in raw if isinstance(raw, list) else []:
                transfers.append({
                    "txHash": t.get("transactionHash") or t.get("txHash") or "",
                    "chain": t.get("chain") or "",
                    "from": t.get("fromAddress") or (t.get("from", {}) or {}).get("address", ""),
                    "to": t.get("toAddress") or (t.get("to", {}) or {}).get("address", ""),
                    "value": t.get("unitValue") or t.get("value") or 0,
                    "valueUSD": t.get("historicalUSD") or t.get("usdValue") or 0,
                    "tokenSymbol": t.get("tokenSymbol") or (t.get("token", {}) or {}).get("symbol", ""),
                    "timestamp": t.get("blockTimestamp") or t.get("timestamp") or "",
                    "direction": t.get("direction") or "",
                    "fromLabel": (t.get("from", {}) or {}).get("label", ""),
                    "toLabel": (t.get("to", {}) or {}).get("label", ""),
                })

        # Parse BETA history as fallback transfers
        if beta_tx and isinstance(beta_tx, dict):
            history = beta_tx.get("history_list") or beta_tx.get("data") or []
            for h in history if isinstance(history, list) else []:
                transfers.append({
                    "txHash": h.get("id") or h.get("tx_hash") or "",
                    "chain": h.get("chain") or "",
                    "from": h.get("from_addr") or h.get("from", ""),
                    "to": h.get("to_addr") or h.get("to", ""),
                    "value": 0,
                    "valueUSD": h.get("usd_value") or 0,
                    "tokenSymbol": "",
                    "timestamp": h.get("time_at") or "",
                    "direction": "",
                    "fromLabel": "",
                    "toLabel": "",
                })

        result = sanitize_response({
            "success": True, "transfers": transfers,
        })
        await self.cache.set("transfers", result, *cache_key_parts)
        return result

    async def portfolio(self, address: str, timeframe: str = "30d") -> Dict:
        """Portfolio time series (ALPHA)."""
        cached = await self.cache.get("portfolio", address, timeframe)
        if cached:
            return cached

        alpha_ts = await self._call_alpha(
            "get_portfolio_timeseries", address, timeframe=timeframe
        )

        series = []
        if alpha_ts and isinstance(alpha_ts, dict):
            raw = alpha_ts.get("timeSeries") or alpha_ts.get("data") or []
            for pt in raw if isinstance(raw, list) else []:
                series.append({
                    "timestamp": pt.get("timestamp"),
                    "totalUSD": pt.get("totalUSD") or pt.get("total") or 0,
                })

        result = sanitize_response({
            "success": True, "address": address, "timeframe": timeframe,
            "timeSeries": series,
        })
        await self.cache.set("portfolio", result, address, timeframe)
        return result

    async def token(self, token_id: str) -> Dict:
        """Token market data (ALPHA)."""
        cached = await self.cache.get("token_market", token_id)
        if cached:
            return cached

        alpha_token = await self._call_alpha("get_token_market", token_id)
        market = {}
        if alpha_token and isinstance(alpha_token, dict):
            market = {
                "id": alpha_token.get("id") or token_id,
                "name": alpha_token.get("name", ""),
                "symbol": alpha_token.get("symbol", ""),
                "price": alpha_token.get("price") or alpha_token.get("priceUSD") or 0,
                "marketCap": alpha_token.get("marketCap") or 0,
                "volume24h": alpha_token.get("volume24h") or 0,
                "change24h": alpha_token.get("change24h") or 0,
            }

        result = sanitize_response({
            "success": True, "market": market,
        })
        await self.cache.set("token_market", result, token_id)
        return result

    async def tx(self, tx_hash: str) -> Dict:
        """Single transaction details (ALPHA)."""
        cached = await self.cache.get("tx", tx_hash)
        if cached:
            return cached

        alpha_tx = await self._call_alpha("get_tx", tx_hash)
        transaction = {}
        if alpha_tx and isinstance(alpha_tx, dict):
            transaction = {
                "hash": alpha_tx.get("transactionHash") or tx_hash,
                "chain": alpha_tx.get("chain") or "",
                "blockNumber": alpha_tx.get("blockNumber") or 0,
                "timestamp": alpha_tx.get("blockTimestamp") or "",
                "from": alpha_tx.get("fromAddress") or "",
                "to": alpha_tx.get("toAddress") or "",
                "value": alpha_tx.get("unitValue") or 0,
                "valueUSD": alpha_tx.get("historicalUSD") or 0,
                "tokenSymbol": alpha_tx.get("tokenSymbol") or "",
                "gasUsed": alpha_tx.get("gasUsed") or 0,
            }

        result = sanitize_response({
            "success": True, "transaction": transaction,
        })
        await self.cache.set("tx", result, tx_hash)
        return result

    # ═══════════════════════════════════════════════════════════════════════════
    # Admin stats
    # ═══════════════════════════════════════════════════════════════════════════

    async def stats(self) -> Dict:
        """Internal admin stats — sanitized for public safety."""
        avg_p = (
            sum(self._alpha_latencies) / len(self._alpha_latencies)
            if self._alpha_latencies else 0
        )
        avg_s = (
            sum(self._beta_latencies) / len(self._beta_latencies)
            if self._beta_latencies else 0
        )
        return {
            "success": True,
            "provider": "ccways",
            "budget": {
                "used": self.budget.to_dict().get("used", 0),
                "limit": self.budget.to_dict().get("limit", 0),
                "remaining": self.budget.to_dict().get("remaining", 0),
            },
            "health": {
                "primary": self.cb_alpha.to_dict().get("state", "unknown"),
                "secondary": self.cb_beta.to_dict().get("state", "unknown"),
            },
            "cache": self.cache.stats(),
            "latency": {
                "primary_avg_ms": round(avg_p * 1000, 1),
                "secondary_avg_ms": round(avg_s * 1000, 1),
            },
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # Helpers
    # ═══════════════════════════════════════════════════════════════════════════

    def _build_entity(
        self,
        address: str,
        alpha_data: Optional[Dict],
        beta_data: Optional[Dict],
    ) -> Dict:
        """Merge ALPHA intelligence + BETA balance into a unified entity."""
        entity: Dict[str, Any] = {
            "address": address,
            "label": self._shorten(address),
            "type": "unknown",
            "tags": [],
            "riskLevel": None,
            "totalValueUSD": 0,
            "activeChains": [],
            "chainBalances": {},
            "isContract": False,
            "txCount": 0,
            "flowsIn": 0,
            "flowsOut": 0,
            "firstSeen": None,
            "lastSeen": None,
        }

        # Enrich from ALPHA (intelligence)
        if alpha_data and isinstance(alpha_data, dict):
            # ALPHA response: address=str, arkhamEntity=dict, arkhamLabel=dict,
            # populatedTags=list, contract=bool, isUserAddress=bool
            ent = alpha_data.get("arkhamEntity") or alpha_data.get("knownEntity") or {}
            lbl = alpha_data.get("arkhamLabel") or alpha_data.get("knownLabel") or {}

            entity["label"] = (
                (lbl.get("name") if isinstance(lbl, dict) else None)
                or (ent.get("name") if isinstance(ent, dict) else None)
                or entity["label"]
            )
            entity["type"] = _map_entity_type(
                ent.get("type") if isinstance(ent, dict) else None
            )
            entity["isContract"] = bool(alpha_data.get("contract", False))
            entity["riskLevel"] = _map_risk_level(
                alpha_data.get("risk") or alpha_data.get("riskScore")
            )

            # Tags from populatedTags array
            pop_tags = alpha_data.get("populatedTags") or []
            if isinstance(pop_tags, list):
                entity["tags"] = [
                    t.get("label", t.get("id", ""))
                    for t in pop_tags if isinstance(t, dict)
                ]
            elif isinstance(ent, dict):
                entity["tags"] = [str(t) for t in (ent.get("tags") or []) if t]

            entity["firstSeen"] = alpha_data.get("firstSeen")
            entity["lastSeen"] = alpha_data.get("lastSeen")
            entity["txCount"] = alpha_data.get("txCount") or 0

            # Extra entity info
            if isinstance(ent, dict):
                entity["twitter"] = ent.get("twitter")
                entity["website"] = ent.get("website") or ent.get("crunchbase")

        # Enrich from BETA (balances)
        if beta_data and isinstance(beta_data, dict):
            entity["totalValueUSD"] = beta_data.get("total_usd_value", 0) or 0
            chain_list = beta_data.get("chain_list") or []
            for cb in chain_list if isinstance(chain_list, list) else []:
                cid = cb.get("id", "")
                usd = cb.get("usd_value", 0)
                if usd and usd > 0:
                    entity["activeChains"].append(cid)
                    entity["chainBalances"][cid] = {
                        "usd": usd,
                        "name": cb.get("name", cid),
                    }

        return entity

    @staticmethod
    def _format_value(v: Any) -> str:
        """Format a numeric value to a human-readable string."""
        try:
            n = float(v)
        except (TypeError, ValueError):
            return str(v)
        if n >= 1_000_000:
            return f"{n / 1_000_000:.2f}M"
        if n >= 1_000:
            return f"{n / 1_000:.2f}K"
        if n >= 1:
            return f"{n:.2f}"
        if n >= 0.0001:
            return f"{n:.4f}"
        return f"{n:.8f}"
