"""
CCWAYS Load Balancer — Smart Distribution Between Providers

Distributes requests between ALPHA and BETA to:
 • Avoid rate limits on any single provider
 • Automatically fallback when one provider is slow/down
 • Adapt request rate based on 429 responses
 • Stagger parallel requests to reduce burst pressure
 • Track per-provider health score for optimal routing

Provider capabilities overlap:
  ┌──────────────┬─────────┬──────────┐
  │   Function   │  ALPHA  │   BETA   │
  ├──────────────┼─────────┼──────────┤
  │ expand/cp    │ Primary │ Fallback │ (history→counterparties)
  │ intel/entity │ Primary │ Enrich   │ (balance data)
  │ balance      │ Fallback│ Primary  │
  │ transfers    │ Primary │ Fallback │ (history_list)
  │ flow         │ Only    │ —        │
  │ protocols    │ —       │ Only     │
  │ search       │ Primary │ —        │
  │ portfolio    │ Primary │ —        │
  │ token/market │ Primary │ —        │
  │ chains       │ Fallback│ Primary  │
  │ tx           │ Primary │ —        │
  │ nft          │ —       │ Only     │
  └──────────────┴─────────┴──────────┘

No third-party names appear anywhere in this file.
"""

import asyncio
import random
import time
import logging
from collections import deque
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Adaptive Rate Controller
# ═══════════════════════════════════════════════════════════════════════════════

class AdaptiveRateController:
    """
    Adaptive rate controller per provider.
    
    Starts at base_rps, slows down on 429s, speeds up on success streaks.
    Uses AIMD (Additive Increase, Multiplicative Decrease) algorithm.
    """

    def __init__(
        self,
        name: str,
        base_rps: float = 2.0,
        min_rps: float = 0.2,
        max_rps: float = 5.0,
        decrease_factor: float = 0.5,     # Halve on 429
        increase_step: float = 0.1,       # +0.1 rps per success window
        success_window: int = 10,         # Increase after N successes
    ):
        self.name = name
        self.base_rps = base_rps
        self.min_rps = min_rps
        self.max_rps = max_rps
        self.current_rps = base_rps
        self.decrease_factor = decrease_factor
        self.increase_step = increase_step
        self.success_window = success_window

        self._consecutive_success = 0
        self._last_request_time: float = 0.0
        self._lock = asyncio.Lock()
        self._total_throttled = 0
        self._total_requests = 0

    async def acquire(self) -> None:
        """Wait until next request is allowed based on current rate."""
        async with self._lock:
            now = time.monotonic()
            min_interval = 1.0 / self.current_rps
            elapsed = now - self._last_request_time
            if elapsed < min_interval:
                wait = min_interval - elapsed
                # Add jitter (10-30% of wait) to desync parallel callers
                jitter = wait * random.uniform(0.1, 0.3)
                await asyncio.sleep(wait + jitter)
            self._last_request_time = time.monotonic()
            self._total_requests += 1

    def record_success(self) -> None:
        """Record a successful request — may increase rate."""
        self._consecutive_success += 1
        if self._consecutive_success >= self.success_window:
            old = self.current_rps
            self.current_rps = min(self.max_rps, self.current_rps + self.increase_step)
            self._consecutive_success = 0
            if self.current_rps != old:
                logger.debug(
                    "[LB] %s rate UP: %.2f → %.2f rps",
                    self.name, old, self.current_rps,
                )

    def record_rate_limit(self) -> None:
        """Record a 429 — multiplicative decrease."""
        old = self.current_rps
        self.current_rps = max(self.min_rps, self.current_rps * self.decrease_factor)
        self._consecutive_success = 0
        self._total_throttled += 1
        logger.warning(
            "[LB] %s rate DOWN (429): %.2f → %.2f rps (throttled %d times)",
            self.name, old, self.current_rps, self._total_throttled,
        )

    def record_error(self) -> None:
        """Record a non-429 error — mild decrease."""
        self._consecutive_success = 0
        old = self.current_rps
        self.current_rps = max(self.min_rps, self.current_rps * 0.8)
        if self.current_rps != old:
            logger.debug("[LB] %s rate mild-down: %.2f → %.2f", self.name, old, self.current_rps)

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "current_rps": round(self.current_rps, 2),
            "base_rps": self.base_rps,
            "total_requests": self._total_requests,
            "total_throttled": self._total_throttled,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Provider Health Score
# ═══════════════════════════════════════════════════════════════════════════════

class ProviderHealth:
    """
    Tracks rolling health of a provider.
    Score 0.0 (dead) → 1.0 (perfect).
    Based on: success rate, latency, recent errors.
    """

    def __init__(self, name: str, window: int = 50):
        self.name = name
        self.window = window
        self._results: deque = deque(maxlen=window)  # True=success, False=fail
        self._latencies: deque = deque(maxlen=window)
        self._last_429_time: float = 0.0
        self._is_rate_limited = False

    def record(self, success: bool, latency: float, was_429: bool = False) -> None:
        self._results.append(success)
        self._latencies.append(latency)
        if was_429:
            self._last_429_time = time.time()
            self._is_rate_limited = True
        elif success:
            self._is_rate_limited = False

    @property
    def score(self) -> float:
        """Current health score 0.0→1.0."""
        if not self._results:
            return 0.5  # Unknown — neutral

        success_rate = sum(self._results) / len(self._results)
        avg_latency = sum(self._latencies) / len(self._latencies) if self._latencies else 1.0

        # Penalize high latency (>5s = bad)
        latency_score = max(0.0, 1.0 - (avg_latency / 5.0))

        # Penalize recent rate limiting
        rate_penalty = 0.0
        if self._is_rate_limited:
            since_429 = time.time() - self._last_429_time
            if since_429 < 60:
                rate_penalty = 0.3 * (1.0 - since_429 / 60.0)

        return max(0.0, min(1.0, success_rate * 0.5 + latency_score * 0.3 + 0.2 - rate_penalty))

    @property
    def avg_latency(self) -> float:
        return sum(self._latencies) / len(self._latencies) if self._latencies else 0.0

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "score": round(self.score, 3),
            "avg_latency_ms": round(self.avg_latency * 1000, 1),
            "samples": len(self._results),
            "is_rate_limited": self._is_rate_limited,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Load Balancer
# ═══════════════════════════════════════════════════════════════════════════════

class ProviderChoice(Enum):
    ALPHA = "alpha"
    BETA = "beta"
    BOTH = "both"           # Parallel call
    ALPHA_THEN_BETA = "alpha_then_beta"  # Sequential fallback
    BETA_THEN_ALPHA = "beta_then_alpha"  # Sequential fallback


# Provider capability map: which provider handles which data type
_CAPABILITIES: Dict[str, Dict[str, bool]] = {
    "expand":     {"alpha": True,  "beta": True},   # BETA via history
    "intel":      {"alpha": True,  "beta": True},   # Parallel merge
    "balance":    {"alpha": True,  "beta": True},   # BETA primary
    "transfers":  {"alpha": True,  "beta": True},   # BETA via history
    "flow":       {"alpha": True,  "beta": False},
    "protocols":  {"alpha": False, "beta": True},
    "search":     {"alpha": True,  "beta": False},
    "portfolio":  {"alpha": True,  "beta": False},
    "token":      {"alpha": True,  "beta": False},
    "chains":     {"alpha": True,  "beta": True},   # BETA primary
    "tx":         {"alpha": True,  "beta": False},
    "nft":        {"alpha": False, "beta": True},
}

# Default preference: which provider is better for each type
_PRIMARY: Dict[str, str] = {
    "expand":    "alpha",
    "intel":     "alpha",   # BETA rate-limited → use ALPHA (Phase 2.5: re-enable)
    "balance":   "alpha",   # BETA rate-limited → use ALPHA (Phase 2.5: re-enable)
    "transfers": "alpha",
    "flow":      "alpha",
    "protocols": "alpha",   # BETA rate-limited → fallback (Phase 2.5: re-enable)
    "search":    "alpha",
    "portfolio": "alpha",
    "token":     "alpha",
    "chains":    "alpha",   # BETA rate-limited → use ALPHA 14 chains (Phase 2.5: re-enable)
    "tx":        "alpha",
    "nft":       "alpha",   # BETA rate-limited → fallback (Phase 2.5: re-enable)
}


class LoadBalancer:
    """
    Smart load balancer that chooses which provider(s) to call for each
    request type, based on health, rate limits, and provider capabilities.
    """

    def __init__(self):
        self.rate_alpha = AdaptiveRateController(
            "alpha", base_rps=2.0, min_rps=0.3, max_rps=5.0,
        )
        self.rate_beta = AdaptiveRateController(
            "beta", base_rps=2.0, min_rps=0.3, max_rps=5.0,
        )
        self.health_alpha = ProviderHealth("alpha")
        self.health_beta = ProviderHealth("beta")

        # Request counter for round-robin when both providers are equal
        self._request_counter = 0
        self._lock = asyncio.Lock()

    def choose_provider(self, data_type: str) -> ProviderChoice:
        """
        Decide which provider(s) to call for a given data type.

        Logic:
        1. If only one provider has the capability → use it
        2. If data_type is 'intel' → always BOTH (merge)
        3. If primary provider is rate-limited → use secondary
        4. Choose the healthier provider, with round-robin tiebreaker
        """
        caps = _CAPABILITIES.get(data_type, {"alpha": True, "beta": True})
        can_alpha = caps.get("alpha", False)
        can_beta = caps.get("beta", False)

        # Only one can do it
        if can_alpha and not can_beta:
            return ProviderChoice.ALPHA
        if can_beta and not can_alpha:
            return ProviderChoice.BETA

        # Both can do it
        primary = _PRIMARY.get(data_type, "alpha")

        # If type requires merge, always use BOTH
        if primary == "both":
            return ProviderChoice.BOTH

        # Check health
        alpha_ok = self.health_alpha.score > 0.2
        beta_ok = self.health_beta.score > 0.2
        alpha_limited = self.health_alpha._is_rate_limited
        beta_limited = self.health_beta._is_rate_limited

        # If primary is rate-limited, switch
        if primary == "alpha" and alpha_limited and beta_ok:
            logger.info("[LB] %s: ALPHA rate-limited → fallback BETA", data_type)
            return ProviderChoice.BETA_THEN_ALPHA
        if primary == "beta" and beta_limited and alpha_ok:
            logger.info("[LB] %s: BETA rate-limited → fallback ALPHA", data_type)
            return ProviderChoice.ALPHA_THEN_BETA

        # If both healthy, use primary with fallback
        if primary == "alpha":
            return ProviderChoice.ALPHA_THEN_BETA if beta_ok else ProviderChoice.ALPHA
        else:
            return ProviderChoice.BETA_THEN_ALPHA if alpha_ok else ProviderChoice.BETA

    async def acquire_alpha(self) -> None:
        """Wait for ALPHA rate permit."""
        await self.rate_alpha.acquire()

    async def acquire_beta(self) -> None:
        """Wait for BETA rate permit."""
        await self.rate_beta.acquire()

    def record_alpha(self, success: bool, latency: float, was_429: bool = False) -> None:
        """Record ALPHA result for health/rate tracking."""
        self.health_alpha.record(success, latency, was_429)
        if was_429:
            self.rate_alpha.record_rate_limit()
        elif success:
            self.rate_alpha.record_success()
        else:
            self.rate_alpha.record_error()

    def record_beta(self, success: bool, latency: float, was_429: bool = False) -> None:
        """Record BETA result for health/rate tracking."""
        self.health_beta.record(success, latency, was_429)
        if was_429:
            self.rate_beta.record_rate_limit()
        elif success:
            self.rate_beta.record_success()
        else:
            self.rate_beta.record_error()

    def to_dict(self) -> Dict:
        return {
            "alpha": {
                "rate": self.rate_alpha.to_dict(),
                "health": self.health_alpha.to_dict(),
            },
            "beta": {
                "rate": self.rate_beta.to_dict(),
                "health": self.health_beta.to_dict(),
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Staggered Parallel Executor
# ═══════════════════════════════════════════════════════════════════════════════

async def staggered_gather(
    *coros,
    stagger_ms: int = 150,
) -> List[Any]:
    """
    Run coroutines with staggered start times to avoid burst pressure.
    Unlike asyncio.gather, this starts each coroutine with a small delay
    between them, reducing the chance of simultaneous upstream requests.

    Returns results in the same order as input coroutines.
    Failed coroutines return None instead of raising.
    """
    tasks = []
    for i, coro in enumerate(coros):
        if i > 0:
            await asyncio.sleep(stagger_ms / 1000.0)
        tasks.append(asyncio.create_task(coro))

    results = []
    for task in tasks:
        try:
            results.append(await task)
        except Exception as exc:
            logger.warning("[LB] Staggered task failed: %s", exc)
            results.append(None)
    return results
