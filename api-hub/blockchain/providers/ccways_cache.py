"""
CCWAYS Tiered Cache — Intelligent TTL per data type.

Each data category has a different TTL based on how frequently the underlying
data changes.  Falls back to the base SimpleCache implementation.
"""

import asyncio
import json
import time
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# TTL tiers (seconds)
# ═══════════════════════════════════════════════════════════════════════════════

CACHE_TIERS: Dict[str, int] = {
    "chains":         86400,   # 24 h — chain list rarely changes
    "intelligence":   1800,    # 30 min — entity labels update slowly
    "search":         300,     # 5 min
    "balance":        120,     # 2 min — changes every block
    "token_list":     120,     # 2 min
    "transfers":      300,     # 5 min
    "flow":           900,     # 15 min — aggregated
    "protocols":      600,     # 10 min — DeFi positions
    "portfolio":      900,     # 15 min
    "token_market":   60,      # 1 min — market prices volatile
    "counterparties": 600,     # 10 min
    "tx":             3600,    # 1 h — immutable once confirmed
    "volume":         300,     # 5 min
    "nft":            600,     # 10 min
    "default":        300,     # 5 min fallback
}


class CacheLayer:
    """
    Multi-tier in-memory cache.
    Each tier has its own TTL.  All tiers share a single dict
    but entries carry per-tier expiry timestamps.
    """

    def __init__(self, max_size: int = 5000):
        self.max_size = max_size
        self._store: Dict[str, tuple] = {}  # key → (value, expire_at)
        self._hits = 0
        self._misses = 0
        self._lock = asyncio.Lock()

    @staticmethod
    def _make_key(tier: str, *args, **kwargs) -> str:
        raw = json.dumps({"t": tier, "a": args, "k": kwargs}, sort_keys=True)
        return raw

    async def get(self, tier: str, *key_parts, **key_kwargs) -> Optional[Any]:
        """Retrieve a cached value. Returns None on miss or expiry."""
        key = self._make_key(tier, *key_parts, **key_kwargs)
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            value, expire_at = entry
            if time.time() > expire_at:
                del self._store[key]
                self._misses += 1
                return None
            self._hits += 1
            return value

    async def set(self, tier: str, value: Any, *key_parts, **key_kwargs) -> None:
        """Store a value with tier-appropriate TTL."""
        key = self._make_key(tier, *key_parts, **key_kwargs)
        ttl = CACHE_TIERS.get(tier, CACHE_TIERS["default"])
        expire_at = time.time() + ttl

        async with self._lock:
            # Evict oldest if at capacity
            if len(self._store) >= self.max_size:
                oldest_key = min(self._store, key=lambda k: self._store[k][1])
                del self._store[oldest_key]
            self._store[key] = (value, expire_at)

    async def invalidate(self, pattern: str = "") -> int:
        """
        Invalidate cache entries.
        If pattern is empty, clears everything.
        Otherwise removes entries whose key contains the pattern.
        """
        async with self._lock:
            if not pattern:
                count = len(self._store)
                self._store.clear()
                return count
            to_remove = [k for k in self._store if pattern in k]
            for k in to_remove:
                del self._store[k]
            return len(to_remove)

    def stats(self) -> Dict[str, Any]:
        """Return cache statistics."""
        total = self._hits + self._misses
        return {
            "entries": len(self._store),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 4) if total else 0.0,
            "tiers": {k: f"{v}s" for k, v in CACHE_TIERS.items()},
        }
