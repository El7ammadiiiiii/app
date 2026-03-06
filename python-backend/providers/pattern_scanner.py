"""
🔷 pattern_scanner.py — Backend chart pattern scanner (Firebase lifecycle)

Lifecycle rules (as requested):
- Seed detection window: 30..80 candles
- Store detected pattern in Firebase collection
- Keep updating while valid
- Delete when:
  1) age reaches 120 candles, OR
  2) pattern breaks and remains broken for 3 candles

Results path:
  scanners_results/pattern/exchanges/{exchange}/timeframes/{tf}/data/{symbol}
"""

import asyncio
import logging
import time
from typing import Dict, List, Any

from fastapi import APIRouter

from firebase_writer import purge_and_write, init_firebase
from indicators.chart_patterns import detect_chart_pattern
from providers.trendline_scanner import TOP_300_SYMBOLS

logger = logging.getLogger("pattern_scanner")
pattern_scanner_router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════
# 🔧 Configuration
# ═══════════════════════════════════════════════════════════════════════

PATTERN_EXCHANGES = [
    "binance",   # Default first
    "bybit",
    "coinbase",
    "cryptocom",
    "kucoin",
    "okx",
]

PATTERN_TIMEFRAMES = ["1h", "4h", "1d", "1w"]

PATTERN_REFRESH_INTERVALS = {
    "1h": 5 * 60,
    "4h": 15 * 60,
    "1d": 60 * 60,
    "1w": 4 * 60 * 60,
}

SEED_MIN_BARS = 30
SEED_MAX_BARS = 80
MAX_PATTERN_AGE_BARS = 120
BREAK_GRACE_BARS = 3

EXPLICIT_EXCLUDED_SYMBOLS = {
    "FDUSDUSDT",
    "USD1USDT",
    "USDCUSDT",
    "USDEUSDT",
    "BUSDTUSDT",
    "XUSDUSDT",
}

STABLE_BASES = {
    "USDT", "USDC", "FDUSD", "USDE", "USD1", "BUSD", "TUSD", "USDP", "DAI", "PYUSD", "XUSD", "BUSDT",
}


def _is_excluded_symbol(symbol: str) -> bool:
    s = symbol.upper().strip()
    if s in EXPLICIT_EXCLUDED_SYMBOLS:
        return True
    if not s.endswith("USDT"):
        return True

    base = s[:-4]
    if base in STABLE_BASES:
        return True

    # General stable/noise heuristic
    if base.endswith("USD"):
        return True

    return False


def _symbol_universe() -> List[str]:
    return [s for s in TOP_300_SYMBOLS if not _is_excluded_symbol(s)]


# ═══════════════════════════════════════════════════════════════════════
# 🔧 State
# ═══════════════════════════════════════════════════════════════════════

_bg_tasks: List[asyncio.Task] = []
_running = False
_last_run: Dict[str, float] = {}

# key = exchange:timeframe:symbol
_active_state: Dict[str, Dict[str, Any]] = {}

_stats: Dict[str, Any] = {
    "total_writes": 0,
    "errors": 0,
    "active_patterns": 0,
    "last_cycle": None,
}


# ═══════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═══════════════════════════════════════════════════════════════════════

async def init_pattern_scanner():
    """Start background scanner loops."""
    global _running
    try:
        init_firebase()
    except Exception as e:
        logger.error("❌ Firebase init failed — pattern scanner disabled: %s", e)
        return

    _running = True
    for tf in PATTERN_TIMEFRAMES:
        _bg_tasks.append(asyncio.create_task(_scan_loop(tf)))

    logger.info(
        "✅ Pattern scanner started (%d timeframes, %d exchanges, %d symbols)",
        len(PATTERN_TIMEFRAMES), len(PATTERN_EXCHANGES), len(_symbol_universe())
    )


async def shutdown_pattern_scanner():
    """Cancel all background tasks."""
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 Pattern scanner shutdown")


# ═══════════════════════════════════════════════════════════════════════
# 🔄 Main Scan Loop
# ═══════════════════════════════════════════════════════════════════════

async def _scan_loop(timeframe: str):
    interval = PATTERN_REFRESH_INTERVALS.get(timeframe, 900)
    logger.info("🔄 Pattern scanner loop started: tf=%s, interval=%ds", timeframe, interval)

    tf_index = PATTERN_TIMEFRAMES.index(timeframe)
    await asyncio.sleep(10 + tf_index * 15)

    while _running:
        try:
            cycle_start = time.time()
            await _scan_all_exchanges(timeframe)
            elapsed = time.time() - cycle_start
            _stats["last_cycle"] = {
                "timeframe": timeframe,
                "elapsed_s": round(elapsed, 1),
                "timestamp": int(time.time() * 1000),
            }
            logger.info("✅ Pattern scan complete: tf=%s, elapsed=%.1fs", timeframe, elapsed)
        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ Pattern scan error [tf=%s]: %s", timeframe, e)

        await asyncio.sleep(interval)


async def _scan_all_exchanges(timeframe: str):
    for exchange in PATTERN_EXCHANGES:
        try:
            all_ohlcv = await _fetch_symbols_ohlcv(exchange, timeframe)
            results = _compute_and_update_lifecycle(all_ohlcv, exchange, timeframe)

            # Purge+write ensures deleted/broken/expired symbols are removed from collection
            await purge_and_write("pattern", exchange, timeframe, results)

            _stats["total_writes"] += 1
            _stats["active_patterns"] = len(results)
            _last_run[f"{exchange}:{timeframe}"] = time.time()
            logger.info(
                "🔷 [pattern/%s/%s] Active patterns: %d",
                exchange,
                timeframe,
                len(results),
            )
        except Exception as e:
            _stats["errors"] += 1
            logger.error("Pattern exchange scan failed [%s/%s]: %s", exchange, timeframe, e)


async def _fetch_symbols_ohlcv(exchange: str, timeframe: str) -> Dict[str, List[Dict]]:
    from providers.cex_rest import fetch_ohlcv

    results: Dict[str, List[Dict]] = {}
    symbols = _symbol_universe()

    batch_size = 10
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        tasks = [fetch_ohlcv(exchange, sym, timeframe, 200) for sym in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for sym, res in zip(batch, batch_results):
            if isinstance(res, Exception):
                continue
            if res and len(res) >= SEED_MIN_BARS:
                results[sym] = res

        if i + batch_size < len(symbols):
            await asyncio.sleep(0.25)

    return results


def _count_new_bars(candles: List[Dict], last_ts: int) -> int:
    if last_ts <= 0:
        return 1
    return max(0, sum(1 for c in candles if int(c.get("timestamp", 0)) > last_ts))


def _state_key(exchange: str, timeframe: str, symbol: str) -> str:
    return f"{exchange}:{timeframe}:{symbol}"


def _compute_and_update_lifecycle(
    all_ohlcv: Dict[str, List[Dict]],
    exchange: str,
    timeframe: str,
) -> List[Dict[str, Any]]:
    now_ms = int(time.time() * 1000)
    active_docs: List[Dict[str, Any]] = []

    for symbol, candles in all_ohlcv.items():
        if len(candles) < SEED_MIN_BARS:
            continue

        key = _state_key(exchange, timeframe, symbol)
        state = _active_state.get(key)

        last_ts = int(candles[-1].get("timestamp", 0))
        new_bars = 1
        if state:
            new_bars = max(1, _count_new_bars(candles, int(state.get("last_bar_ts", 0))))

        detected = detect_chart_pattern(
            candles,
            seed_min_bars=SEED_MIN_BARS,
            seed_max_bars=SEED_MAX_BARS,
        )

        # No active state yet
        if state is None:
            if not detected:
                continue

            _active_state[key] = {
                "symbol": symbol,
                "exchange": exchange,
                "timeframe": timeframe,
                "pattern": detected,
                "age_bars": 0,
                "break_bars": 0,
                "detected_at": now_ms,
                "last_bar_ts": last_ts,
            }
            state = _active_state[key]

        else:
            # Update lifecycle counters
            state["age_bars"] = int(state.get("age_bars", 0)) + new_bars

            if detected:
                # Update line anchors/path with latest valid candidate on same stream
                state["pattern"] = detected
                state["break_bars"] = 0
            else:
                state["break_bars"] = int(state.get("break_bars", 0)) + new_bars

            state["last_bar_ts"] = last_ts

            # Removal rules
            if int(state.get("age_bars", 0)) >= MAX_PATTERN_AGE_BARS:
                _active_state.pop(key, None)
                continue

            if int(state.get("break_bars", 0)) >= BREAK_GRACE_BARS:
                _active_state.pop(key, None)
                continue

        patt = state["pattern"]
        current_price = float(candles[-1].get("close", 0.0)) if candles else 0.0

        active_docs.append({
            "symbol": symbol,
            "name": symbol.replace("USDT", ""),
            "exchange": exchange,
            "timeframe": timeframe,
            "price": round(current_price, 8),
            "pattern": patt,
            "type": patt.get("type"),
            "direction": patt.get("direction"),
            "confidence": patt.get("confidence"),
            "age_bars": int(state.get("age_bars", 0)),
            "break_bars": int(state.get("break_bars", 0)),
            "max_age_bars": MAX_PATTERN_AGE_BARS,
            "break_grace_bars": BREAK_GRACE_BARS,
            "seed_range": {
                "min": SEED_MIN_BARS,
                "max": SEED_MAX_BARS,
            },
            "detected_at": int(state.get("detected_at", now_ms)),
            "updated_at": now_ms,
        })

    return active_docs


# ═══════════════════════════════════════════════════════════════════════
# 📡 API Endpoints
# ═══════════════════════════════════════════════════════════════════════

@pattern_scanner_router.get("/status")
async def get_pattern_status():
    return {
        "running": _running,
        "exchanges": PATTERN_EXCHANGES,
        "timeframes": PATTERN_TIMEFRAMES,
        "symbols_count": len(_symbol_universe()),
        "stats": _stats,
        "last_runs": _last_run,
        "rules": {
            "seed_min_bars": SEED_MIN_BARS,
            "seed_max_bars": SEED_MAX_BARS,
            "max_pattern_age_bars": MAX_PATTERN_AGE_BARS,
            "break_grace_bars": BREAK_GRACE_BARS,
        },
    }


@pattern_scanner_router.get("/exchanges")
async def get_pattern_exchanges():
    return {
        "exchanges": [
            {"id": "binance", "name": "Binance", "default": True},
            {"id": "bybit", "name": "Bybit", "default": False},
            {"id": "coinbase", "name": "Coinbase", "default": False},
            {"id": "cryptocom", "name": "Crypto.com", "default": False},
            {"id": "kucoin", "name": "KuCoin", "default": False},
            {"id": "okx", "name": "OKX", "default": False},
        ],
        "timeframes": PATTERN_TIMEFRAMES,
    }


@pattern_scanner_router.post("/scan/{exchange}/{timeframe}")
async def trigger_pattern_scan(exchange: str, timeframe: str):
    if exchange not in PATTERN_EXCHANGES:
        return {"error": f"Exchange {exchange} not supported"}
    if timeframe not in PATTERN_TIMEFRAMES:
        return {"error": f"Timeframe {timeframe} not supported"}

    try:
        all_ohlcv = await _fetch_symbols_ohlcv(exchange, timeframe)
        results = _compute_and_update_lifecycle(all_ohlcv, exchange, timeframe)
        await purge_and_write("pattern", exchange, timeframe, results)
        return {"success": True, "active_patterns": len(results)}
    except Exception as e:
        return {"success": False, "error": str(e)}
