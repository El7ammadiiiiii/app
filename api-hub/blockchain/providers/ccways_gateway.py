"""
CCWAYS Gateway — Unified Orchestrator

Merges Provider ALPHA (intelligence/entities/counterparties/flow/transfers)
with Provider BETA (93-chain balances/DeFi protocols/NFTs).

Features:
 • Circuit breaker per provider (auto-skip after N consecutive failures)
 • Daily request budget tracking
 • Priority queue semantics (intel > balance > transfers > portfolio)
 • Fallback: if one provider is down, return partial data from the other
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
    manages circuit breakers, caching, and daily budgets.
    """

    def __init__(self):
        # Providers
        self.alpha = AlphaClient(
            rate_limit=float(os.getenv("CCWAYS_ALPHA_RATE", "0.5")),
            cache_ttl=300,
        )
        self.beta = BetaClient(
            static_key=os.getenv("CCWAYS_BETA_KEY", ""),
            rate_limit=float(os.getenv("CCWAYS_BETA_RATE", "0.5")),
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
        """Call ALPHA with circuit breaker + budget check."""
        if not self.cb_alpha.allow_request():
            logger.debug("ALPHA circuit open — skipping")
            return None
        if not self.budget.can_request():
            logger.warning("Daily budget exhausted")
            return None
        try:
            t0 = time.time()
            fn = getattr(self.alpha, method)
            result = await fn(*args, **kwargs)
            lat = time.time() - t0
            self._alpha_latencies.append(lat)
            if len(self._alpha_latencies) > 100:
                self._alpha_latencies = self._alpha_latencies[-100:]
            self.cb_alpha.record_success()
            self.budget.record("alpha")
            return result
        except Exception as exc:
            self.cb_alpha.record_failure()
            logger.warning("ALPHA.%s failed: %s", method, exc)
            return None

    async def _call_beta(self, method: str, *args, **kwargs) -> Optional[Any]:
        """Call BETA with circuit breaker + budget check."""
        if not self.cb_beta.allow_request():
            logger.debug("BETA circuit open — skipping")
            return None
        if not self.budget.can_request():
            logger.warning("Daily budget exhausted")
            return None
        try:
            t0 = time.time()
            fn = getattr(self.beta, method)
            result = await fn(*args, **kwargs)
            lat = time.time() - t0
            self._beta_latencies.append(lat)
            if len(self._beta_latencies) > 100:
                self._beta_latencies = self._beta_latencies[-100:]
            self.cb_beta.record_success()
            self.budget.record("beta")
            return result
        except Exception as exc:
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
        """Get unified chain list (93+ chains from BETA, enriched with ALPHA)."""
        cached = await self.cache.get("chains", "all")
        if cached:
            return cached

        beta_chains = await self._call_beta("get_chain_list") or []

        # Transform to CCWAYS format
        chains = []
        for c in beta_chains if isinstance(beta_chains, list) else []:
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
                "nativeWrapped": c.get("wrapped", {}).get("id", ""),
            })

        result = sanitize_response({"success": True, "chains": chains})
        await self.cache.set("chains", result, "all")
        return result

    async def intel(self, address: str) -> Dict:
        """Unified intelligence — entity labels, risk, balances."""
        cached = await self.cache.get("intelligence", address)
        if cached:
            return cached

        # Parallel fetch from both providers
        alpha_data, beta_data = await asyncio.gather(
            self._call_alpha("get_intelligence_enriched", address),
            self._call_beta("get_total_balance", address),
            return_exceptions=True,
        )

        if isinstance(alpha_data, Exception):
            alpha_data = None
        if isinstance(beta_data, Exception):
            beta_data = None

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
        limit: int = 25,
    ) -> Dict:
        """
        Graph expansion — counterparties + transfers.
        Returns MSNode[] + MSEdge[]-compatible structures.
        """
        cached = await self.cache.get("counterparties", address, direction)
        if cached:
            return cached

        # Map direction to ALPHA flow param
        flow = "all"
        if direction == "in" or direction == "left":
            flow = "in"
        elif direction == "out" or direction == "right":
            flow = "out"

        alpha_cp = await self._call_alpha(
            "get_counterparties", address, flow=flow, limit=limit
        )

        nodes = []
        edges = []

        if alpha_cp and isinstance(alpha_cp, dict):
            counterparties = alpha_cp.get("counterparties") or alpha_cp.get("data") or []
            if isinstance(counterparties, list):
                for i, cp in enumerate(counterparties):
                    cp_addr = cp.get("address", {})
                    if isinstance(cp_addr, dict):
                        addr = cp_addr.get("address", "")
                        label = cp_addr.get("label") or cp_addr.get("name") or self._shorten(addr)
                        entity_info = cp_addr.get("entity") or {}
                        etype = _map_entity_type(
                            entity_info.get("type") if isinstance(entity_info, dict) else None
                        )
                        tags = entity_info.get("tags", []) if isinstance(entity_info, dict) else []
                    elif isinstance(cp_addr, str):
                        addr = cp_addr
                        label = self._shorten(addr)
                        etype = "unknown"
                        tags = []
                    else:
                        continue

                    if not addr:
                        continue

                    chain = cp.get("chain") or cp.get("chainId") or "ethereum"
                    cp_id = f"ccways:{chain}:{addr}"

                    # Build MSNode-compatible dict
                    node = {
                        "id": cp_id,
                        "address": addr,
                        "label": label,
                        "type": etype,
                        "chain": str(chain).lower(),
                        "gridX": 0,
                        "gridY": 0,
                        "x": 0,
                        "y": 0,
                        "isRoot": False,
                        "isExpanded": False,
                        "isLoading": False,
                        "isSelected": False,
                        "isPruned": False,
                        "isDragging": False,
                        "isContract": cp.get("isContract", False),
                        "flowsIn": 0,
                        "flowsOut": 0,
                        "txCount": cp.get("transferCount") or cp.get("count") or 0,
                        "tags": [str(t) for t in tags] if isinstance(tags, list) else [],
                        "riskLevel": _map_risk_level(cp.get("risk")),
                        "totalValueUSD": cp.get("totalUSD") or cp.get("usdValue") or 0,
                    }
                    nodes.append(node)

                    # Build MSEdge-compatible dict
                    value = cp.get("totalUSD") or cp.get("usdValue") or 0
                    token = cp.get("tokenSymbol") or cp.get("symbol") or "ETH"
                    count = cp.get("transferCount") or cp.get("count") or 1

                    cp_flow = cp.get("direction") or cp.get("flow") or flow
                    if cp_flow in ("in", "left"):
                        src, tgt = cp_id, node_id
                        edge_dir = "in"
                    else:
                        src, tgt = node_id, cp_id
                        edge_dir = "out"

                    edge = {
                        "id": f"edge:{src}->{tgt}:{chain}:{token}",
                        "source": src,
                        "target": tgt,
                        "chain": str(chain).lower(),
                        "direction": edge_dir,
                        "isCurve": False,
                        "curveOffset": 0,
                        "tokenSymbol": token,
                        "totalValue": value,
                        "valueLabel": f"{self._format_value(value)} {token}",
                        "amountLabel": f"{self._format_value(value)} {token}",
                        "transferCount": count,
                        "color": "",
                        "details": [],
                        "isCrossChain": False,
                        "isSuspicious": etype in ("mixer", "sanctioned"),
                        "isCustom": False,
                        "isSelected": False,
                        "isHighlighted": False,
                    }
                    edges.append(edge)

        result = sanitize_response({
            "success": True, "nodes": nodes, "edges": edges
        })
        await self.cache.set("counterparties", result, address, direction)
        return result

    async def balance(
        self, address: str, chains: Optional[List[str]] = None
    ) -> Dict:
        """Multi-chain balance (93 chains from BETA)."""
        cached = await self.cache.get("balance", address)
        if cached:
            return cached

        beta_bal = await self._call_beta("get_total_balance", address)

        total_usd = 0.0
        chain_balances = {}

        if beta_bal and isinstance(beta_bal, dict):
            total_usd = beta_bal.get("total_usd_value", 0) or 0
            chain_list = beta_bal.get("chain_list") or []
            for cb in chain_list if isinstance(chain_list, list) else []:
                cid = cb.get("id", "")
                chain_balances[cid] = {
                    "usd": cb.get("usd_value", 0),
                    "name": cb.get("name", cid),
                }

        result = sanitize_response({
            "success": True,
            "totalUSD": total_usd,
            "chainBalances": chain_balances,
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
        """Transfer history (ALPHA)."""
        cache_key_parts = (address or "", chain or "", flow, limit, offset)
        cached = await self.cache.get("transfers", *cache_key_parts)
        if cached:
            return cached

        alpha_tx = await self._call_alpha(
            "get_transfers", address=address, chain=chain,
            flow=flow, limit=limit, offset=offset,
        )

        transfers = []
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
        """Internal admin stats — not sanitized (admin only)."""
        avg_alpha = (
            sum(self._alpha_latencies) / len(self._alpha_latencies)
            if self._alpha_latencies else 0
        )
        avg_beta = (
            sum(self._beta_latencies) / len(self._beta_latencies)
            if self._beta_latencies else 0
        )
        return {
            "success": True,
            "budget": self.budget.to_dict(),
            "circuitBreakers": {
                "alpha": self.cb_alpha.to_dict(),
                "beta": self.cb_beta.to_dict(),
            },
            "cache": self.cache.stats(),
            "latency": {
                "alpha_avg_ms": round(avg_alpha * 1000, 1),
                "beta_avg_ms": round(avg_beta * 1000, 1),
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
            addr_info = alpha_data.get("address") or alpha_data
            entity_info = alpha_data.get("entity") or addr_info.get("entity") or {}

            entity["label"] = (
                addr_info.get("label")
                or addr_info.get("name")
                or (entity_info.get("name") if isinstance(entity_info, dict) else None)
                or entity["label"]
            )
            entity["type"] = _map_entity_type(
                entity_info.get("type") if isinstance(entity_info, dict) else None
            )
            entity["isContract"] = addr_info.get("isContract", False)
            entity["riskLevel"] = _map_risk_level(
                addr_info.get("risk") or addr_info.get("riskScore")
            )

            tags = addr_info.get("tags") or (
                entity_info.get("tags") if isinstance(entity_info, dict) else []
            )
            entity["tags"] = [str(t) for t in tags] if isinstance(tags, list) else []

            entity["firstSeen"] = addr_info.get("firstSeen")
            entity["lastSeen"] = addr_info.get("lastSeen")
            entity["txCount"] = addr_info.get("txCount") or 0

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
