"""
CCWAYS Provider ALPHA — Intelligence & Entity Resolution
Handles: entity lookup, counterparties, transfers, flow, portfolio, token data
All external identifiers are obfuscated. No third-party names in code.
"""

import asyncio
import hashlib
import time
import logging
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from providers.base import BaseClient

logger = logging.getLogger(__name__)

# ─── obfuscated constants (loaded from env in production) ───────────────────
_ALPHA_BASE = "https://api.arkm.com"
_ALPHA_ORIGIN = "https://intel.arkm.com"
_ALPHA_SIGN_KEY = "gh67j345kl6hj5k432"


class AlphaClient(BaseClient):
    """
    Intelligence provider — entity labels, risk scores, counterparties,
    transfers, flow snapshots, portfolio, token market data.
    Signing: double-SHA-256 HMAC (verified).
    """

    def __init__(
        self,
        rate_limit: float = 0.5,
        cache_ttl: int = 300,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        super().__init__(
            base_url=_ALPHA_BASE,
            api_key=None,
            rate_limit=rate_limit,
            cache_ttl=cache_ttl,
            timeout=timeout,
            max_retries=max_retries,
        )
        self._time_offset: float = 0.0
        self._last_time_sync: float = 0.0

    # ═══════════════════════════════════════════════════════════════════════════
    # Signing
    # ═══════════════════════════════════════════════════════════════════════════

    async def _sync_server_time(self) -> None:
        """Sync clock offset with upstream (max once per 60s).
        Uses a lightweight GET to /chains and reads the Date header
        from the response (works even on error responses).
        """
        now = time.time()
        if now - self._last_time_sync < 60:
            return
        try:
            if not self._initialized:
                await self.initialize()
            # Use GET /chains — lightweight, always returns Date header
            headers = self._get_headers()
            async with self._session.get(
                f"{self.base_url}/chains", headers=headers
            ) as resp:
                server_date = resp.headers.get("Date", "")
                if server_date:
                    server_ts = parsedate_to_datetime(server_date).timestamp()
                    self._time_offset = server_ts - time.time()
                    logger.info(
                        "ALPHA clock offset: %.1fs (%.1f min)",
                        self._time_offset, self._time_offset / 60,
                    )
            self._last_time_sync = time.time()
        except Exception as exc:
            # Even error responses carry a Date header — try to extract it
            date_str = getattr(getattr(exc, 'headers', None), 'get', lambda *a: None)('Date')
            if date_str:
                try:
                    server_ts = parsedate_to_datetime(date_str).timestamp()
                    self._time_offset = server_ts - time.time()
                    self._last_time_sync = time.time()
                    logger.info(
                        "ALPHA clock offset (from error): %.1fs",
                        self._time_offset,
                    )
                except Exception:
                    pass
            else:
                logger.debug("Time sync failed: %s", exc)

    def _sign(self, pathname: str, timestamp: str) -> str:
        """
        Double-SHA-256 HMAC:
          inner = SHA256(pathname + ':' + timestamp + ':' + key)
          outer = SHA256(key + ':' + inner)
        """
        key = _ALPHA_SIGN_KEY
        inner = hashlib.sha256(f"{pathname}:{timestamp}:{key}".encode()).hexdigest()
        outer = hashlib.sha256(f"{key}:{inner}".encode()).hexdigest()
        return outer

    def _get_headers(self) -> Dict[str, str]:
        """Override base headers with signed auth headers."""
        return {
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Referer": _ALPHA_ORIGIN + "/",
            "Origin": _ALPHA_ORIGIN,
        }

    async def _signed_get(
        self,
        path: str,
        params: Optional[Dict] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """GET with HMAC signing."""
        await self._sync_server_time()
        ts = str(int(time.time() + self._time_offset))
        sig = self._sign(path, ts)

        if not self._initialized:
            await self.initialize()

        url = f"{self.base_url}{path}"

        # Build cache key
        cache_key = None
        if use_cache:
            import json as _json
            cache_key = self.cache._make_key(url, params)
            cached = await self.cache.get(cache_key)
            if cached is not None:
                return cached

        await self.rate_limiter.acquire()

        headers = self._get_headers()
        headers["X-Timestamp"] = ts
        headers["X-Payload"] = sig

        last_error = None
        for attempt in range(self.max_retries):
            try:
                async with self._session.get(
                    url, params=params, headers=headers
                ) as resp:
                    if resp.status == 429:
                        wait = int(resp.headers.get("Retry-After", 2))
                        logger.warning("ALPHA rate-limited, waiting %ds", wait)
                        await asyncio.sleep(wait)
                        # Re-sign with fresh timestamp
                        ts = str(int(time.time() + self._time_offset))
                        sig = self._sign(path, ts)
                        headers["X-Timestamp"] = ts
                        headers["X-Payload"] = sig
                        continue
                    resp.raise_for_status()
                    result = await resp.json()
                    if cache_key:
                        await self.cache.set(cache_key, result)
                    return result
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
        raise last_error or Exception("ALPHA request failed")

    # ═══════════════════════════════════════════════════════════════════════════
    # Intelligence endpoints
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_intelligence(self, address: str) -> Dict:
        """Basic entity lookup for an address."""
        return await self._signed_get(f"/intelligence/address/{address}")

    async def get_intelligence_enriched(self, address: str) -> Dict:
        """Enriched entity lookup — includes labels, tags, risk, entity type."""
        return await self._signed_get(f"/intelligence/address_enriched/{address}")

    async def search(self, query: str) -> Dict:
        """Full-text search across entities, addresses, tokens."""
        return await self._signed_get("/intelligence/search", params={"query": query})

    # ═══════════════════════════════════════════════════════════════════════════
    # Graph / Counterparty endpoints
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_counterparties(
        self,
        address: str,
        chain: Optional[str] = None,
        flow: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict:
        """
        Get counterparties for an address — the core graph expansion data.
        flow = None | 'in' | 'out'  (None = default/both, 'all' causes 500)
        """
        params: Dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }
        # NOTE: flow='all' causes HTTP 500 on upstream — omit to get all
        if flow and flow != "all":
            params["flow"] = flow
        if chain:
            params["chain"] = chain
        return await self._signed_get(
            f"/counterparties/address/{address}", params=params
        )

    async def get_transfers(
        self,
        address: Optional[str] = None,
        chain: Optional[str] = None,
        flow: str = "all",
        limit: int = 50,
        offset: int = 0,
        time_from: Optional[str] = None,
        time_to: Optional[str] = None,
    ) -> Dict:
        """Get transfer history."""
        params: Dict[str, Any] = {"flow": flow, "limit": limit, "offset": offset}
        if address:
            params["address"] = address
        if chain:
            params["chain"] = chain
        if time_from:
            params["timeGte"] = time_from
        if time_to:
            params["timeLte"] = time_to
        return await self._signed_get("/transfers", params=params)

    async def get_flow(
        self,
        address: str,
        chain: Optional[str] = None,
        timeframe: str = "24h",
    ) -> Dict:
        """Get flow snapshots (in/out over time)."""
        params: Dict[str, Any] = {"timeframe": timeframe}
        if chain:
            params["chain"] = chain
        return await self._signed_get(f"/flow/address/{address}", params=params)

    async def get_tx(self, tx_hash: str) -> Dict:
        """Get single transaction details."""
        return await self._signed_get(f"/tx/{tx_hash}")

    # ═══════════════════════════════════════════════════════════════════════════
    # Portfolio / Balance endpoints
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_portfolio(self, address: str) -> Dict:
        """Get current portfolio (asset breakdown)."""
        return await self._signed_get(f"/portfolio/address/{address}")

    async def get_portfolio_timeseries(
        self, address: str, timeframe: str = "30d"
    ) -> Dict:
        """Get portfolio value over time."""
        return await self._signed_get(
            f"/portfolio/timeSeries/address/{address}",
            params={"timeframe": timeframe},
        )

    async def get_balances(self, address: str) -> Dict:
        """Get address balances (multi-chain)."""
        return await self._signed_get(f"/balances/address/{address}")

    async def get_volume(self, address: str, timeframe: str = "24h") -> Dict:
        """Get address volume (in/out)."""
        return await self._signed_get(
            f"/volume/address/{address}", params={"timeframe": timeframe}
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # Entity / Token endpoints
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_entity(self, entity_id: str) -> Dict:
        """Get entity by ID."""
        return await self._signed_get(f"/entity/{entity_id}")

    async def get_token_market(self, token_id: str) -> Dict:
        """Get token market data."""
        return await self._signed_get(f"/token/market/{token_id}")

    async def get_chains(self) -> Dict:
        """Get supported chain list."""
        return await self._signed_get("/chains")

    async def get_networks_status(self) -> Dict:
        """Get network indexing status."""
        return await self._signed_get("/networks/status")

    # ═══════════════════════════════════════════════════════════════════════════
    # History / Batch endpoints (discovered from OpenAPI spec)
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_history(
        self,
        address: str,
        chain: Optional[str] = None,
        limit: int = 25,
        offset: int = 0,
    ) -> Dict:
        """Get transaction history for an address."""
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if chain:
            params["chain"] = chain
        return await self._signed_get(
            f"/history/address/{address}", params=params
        )

    async def get_intelligence_batch(
        self, addresses: List[str]
    ) -> Dict:
        """Batch intelligence lookup — up to 100 addresses at once."""
        return await self._signed_get(
            "/intelligence/address/batch",
            params={"addresses": ",".join(addresses[:100])},
        )

    async def get_entity_counterparties(
        self,
        entity_id: str,
        limit: int = 25,
        offset: int = 0,
    ) -> Dict:
        """Get counterparties by entity ID (e.g., 'vitalik-buterin')."""
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        return await self._signed_get(
            f"/counterparties/entity/{entity_id}", params=params
        )

    async def get_entity_summary(self, entity_id: str) -> Dict:
        """Get entity summary by ID."""
        return await self._signed_get(
            f"/intelligence/entity/{entity_id}/summary"
        )

    async def get_cluster_summary(self, cluster_id: str) -> Dict:
        """Get cluster (related addresses) summary."""
        return await self._signed_get(f"/cluster/{cluster_id}/summary")

    async def get_token_holders(
        self, token_id: str, limit: int = 25
    ) -> Dict:
        """Get top token holders."""
        return await self._signed_get(
            f"/token/holders/{token_id}", params={"limit": limit}
        )

    async def get_token_top_flow(self, token_id: str) -> Dict:
        """Get top token flows."""
        return await self._signed_get(f"/token/top_flow/{token_id}")

    async def get_loans(self, address: str) -> Dict:
        """Get DeFi loan positions."""
        return await self._signed_get(f"/loans/address/{address}")

    # ═══════════════════════════════════════════════════════════════════════════
    # BaseClient abstract methods
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_balance(self, address: str, **kwargs) -> Dict:
        """Implement BaseClient.get_balance via portfolio endpoint."""
        return await self.get_balances(address)

    async def get_transactions(self, address: str, **kwargs) -> Dict:
        """Implement BaseClient.get_transactions via transfers endpoint."""
        return await self.get_transfers(address=address, **kwargs)


# asyncio imported at top of file
