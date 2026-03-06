"""
📡 cryptofeed_scanner.py — File 1 Provider
CryptoFeed-based background scanner for OHLCV-dependent pages:
  - fibonacci  (full Python analysis)
  - divergence (OHLCV cache + RSI for client-side analysis)
  - levels     (OHLCV cache for client-side analysis)

Loops through all CRYPTOFEED_EXCHANGES × SCANNER_TIMEFRAMES × SCANNER_SYMBOLS
on a per-timeframe refresh schedule and writes results to Firebase.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional

from fastapi import APIRouter

import config
from exchanges_config import (
    CRYPTOFEED_EXCHANGES,
    CRYPTOFEED_PAGES,
    SCANNER_SYMBOLS_COMPACT,
    SCANNER_TIMEFRAMES,
    REFRESH_INTERVALS,
    FAILOVER_CHAIN,
)
from firebase_writer import purge_and_write, update_meta, init_firebase

logger = logging.getLogger("cryptofeed_scanner")
cryptofeed_scanner_router = APIRouter()

# ═══════════════════════════════════════════════════════════════════════
# 🔧 State
# ═══════════════════════════════════════════════════════════════════════

_bg_tasks: List[asyncio.Task] = []
_last_run: Dict[str, float] = {}  # "{exchange}:{timeframe}" → timestamp
_running = False
_stats: Dict[str, Any] = {
    "total_writes": 0,
    "last_cycle": None,
    "errors": 0,
}


# ═══════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═══════════════════════════════════════════════════════════════════════

async def init_cryptofeed_scanner():
    """Start background scanner loops."""
    global _running
    try:
        init_firebase()
    except Exception as e:
        logger.error("❌ Firebase init failed — scanner disabled: %s", e)
        return

    _running = True
    # One task per timeframe — each runs at its own interval
    for tf in SCANNER_TIMEFRAMES:
        _bg_tasks.append(asyncio.create_task(_scan_loop(tf)))
    logger.info("✅ CryptoFeed scanner started (%d timeframes, %d exchanges)",
                len(SCANNER_TIMEFRAMES), len(CRYPTOFEED_EXCHANGES))


async def shutdown_cryptofeed_scanner():
    """Cancel all background tasks."""
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 CryptoFeed scanner shutdown")


# ═══════════════════════════════════════════════════════════════════════
# 🔄 Main Scan Loop (per timeframe)
# ═══════════════════════════════════════════════════════════════════════

async def _scan_loop(timeframe: str):
    """Run scanner for a specific timeframe at the configured interval."""
    interval = REFRESH_INTERVALS.get(timeframe, 900)
    logger.info("🔄 Scanner loop started: tf=%s, interval=%ds", timeframe, interval)

    # Stagger initial start to avoid thundering herd
    tf_index = SCANNER_TIMEFRAMES.index(timeframe)
    await asyncio.sleep(tf_index * 10)

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
            logger.info("✅ Scan cycle complete: tf=%s, elapsed=%.1fs", timeframe, elapsed)
        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ Scan cycle error [tf=%s]: %s", timeframe, e)

        await asyncio.sleep(interval)


async def _scan_all_exchanges(timeframe: str):
    """Scan all exchanges for a given timeframe, writing results to Firebase."""
    from providers.cex_rest import fetch_ohlcv, run_38_checks, calc_rsi, calc_macd

    exchange_names = [ex.lower() for ex in CRYPTOFEED_EXCHANGES]

    for exchange in exchange_names:
        key = f"{exchange}:{timeframe}"
        try:
            # Fetch OHLCV for all symbols
            all_ohlcv = await _fetch_all_symbols(exchange, timeframe)
            if not all_ohlcv:
                logger.warning("No OHLCV data for %s/%s", exchange, timeframe)
                continue

            # ─── Page: fibonacci ───
            fib_results = _compute_fibonacci(all_ohlcv)
            if fib_results:
                await purge_and_write("fibonacci", exchange, timeframe, fib_results)

            # ─── Page: divergence (RSI + price data for client-side detection) ───
            div_results = _compute_divergence_data(all_ohlcv)
            if div_results:
                await purge_and_write("divergence", exchange, timeframe, div_results)

            # ─── Page: levels (OHLCV summary for client-side S/R detection) ───
            levels_results = _compute_levels_data(all_ohlcv)
            if levels_results:
                await purge_and_write("levels", exchange, timeframe, levels_results)

            _last_run[key] = time.time()
            _stats["total_writes"] += 1

        except Exception as e:
            _stats["errors"] += 1
            logger.error("Exchange scan failed [%s/%s]: %s", exchange, timeframe, e)
            await update_meta(exchange=exchange, page_id="fibonacci",
                              timeframe=timeframe, symbols_count=0,
                              status="error", error=str(e))


async def _fetch_all_symbols(exchange: str, timeframe: str) -> Dict[str, List[Dict]]:
    """Fetch OHLCV for all scanner symbols from one exchange."""
    from providers.cex_rest import fetch_ohlcv

    results = {}
    symbols = SCANNER_SYMBOLS_COMPACT

    # Fetch in batches to avoid rate-limiting
    batch_size = 5
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        tasks = [fetch_ohlcv(exchange, sym, timeframe, 200) for sym in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for sym, res in zip(batch, batch_results):
            if isinstance(res, Exception):
                logger.debug("OHLCV fetch failed [%s/%s/%s]: %s", exchange, sym, timeframe, res)
                continue
            if res and len(res) > 10:
                results[sym] = res

        # Small delay between batches to respect rate limits
        if i + batch_size < len(symbols):
            await asyncio.sleep(0.5)

    return results


# ═══════════════════════════════════════════════════════════════════════
# 📊 Analysis Functions
# ═══════════════════════════════════════════════════════════════════════

def _compute_fibonacci(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Compute Fibonacci retracement levels for all symbols."""
    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 20:
                continue
            closes = [c["close"] for c in candles if "close" in c]
            highs = [c["high"] for c in candles if "high" in c]
            lows = [c["low"] for c in candles if "low" in c]

            if not closes or not highs or not lows:
                continue

            high = max(highs)
            low = min(lows)
            price = closes[-1]
            diff = high - low

            if diff <= 0:
                continue

            # Standard Fibonacci levels
            levels = {
                "0.0": round(high, 8),
                "0.236": round(high - diff * 0.236, 8),
                "0.382": round(high - diff * 0.382, 8),
                "0.5": round(high - diff * 0.5, 8),
                "0.618": round(high - diff * 0.618, 8),
                "0.786": round(high - diff * 0.786, 8),
                "1.0": round(low, 8),
            }

            # Find levels near current price (within 2%)
            near_levels = []
            for level_name, level_price in levels.items():
                if level_price > 0:
                    distance = abs(price - level_price) / level_price * 100
                    if distance <= 2.0:
                        near_levels.append({
                            "level": level_name,
                            "price": level_price,
                            "distance": round(distance, 4),
                            "direction": "above" if price >= level_price else "below",
                        })

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "high": high,
                "low": low,
                "levels": levels,
                "nearLevels": near_levels,
                "candleCount": len(candles),
            })
        except Exception as e:
            logger.debug("Fibonacci calc failed for %s: %s", symbol, e)

    return results


def _compute_divergence_data(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Compute RSI + price data for client-side divergence detection."""
    from providers.cex_rest import calc_rsi

    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 30:
                continue
            closes = [c["close"] for c in candles if "close" in c]
            if len(closes) < 30:
                continue

            rsi_values = calc_rsi(closes, 14)
            price = closes[-1]
            rsi = rsi_values[-1] if rsi_values else None

            # Provide last 50 candles + RSI for client-side divergence detection
            recent_candles = candles[-50:]
            recent_rsi = rsi_values[-50:] if len(rsi_values) >= 50 else rsi_values

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "rsi": round(rsi, 2) if rsi else None,
                "rsiHistory": [round(r, 2) for r in recent_rsi],
                "candles": recent_candles,
                "candleCount": len(candles),
            })
        except Exception as e:
            logger.debug("Divergence data failed for %s: %s", symbol, e)

    return results


def _compute_levels_data(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Compute support/resistance level data for client-side detection."""
    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 30:
                continue

            closes = [c["close"] for c in candles if "close" in c]
            highs = [c["high"] for c in candles if "high" in c]
            lows = [c["low"] for c in candles if "low" in c]
            volumes = [c["volume"] for c in candles if "volume" in c]

            if not closes:
                continue

            price = closes[-1]
            high_52 = max(highs) if highs else price
            low_52 = min(lows) if lows else price

            # Simple pivot points (classic)
            h = highs[-1] if highs else price
            l = lows[-1] if lows else price
            c = closes[-1]
            pivot = (h + l + c) / 3
            r1 = 2 * pivot - l
            s1 = 2 * pivot - h
            r2 = pivot + (h - l)
            s2 = pivot - (h - l)

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "high52": high_52,
                "low52": low_52,
                "pivot": round(pivot, 8),
                "r1": round(r1, 8),
                "r2": round(r2, 8),
                "s1": round(s1, 8),
                "s2": round(s2, 8),
                "avgVolume": round(sum(volumes) / len(volumes), 2) if volumes else 0,
                "candles": candles[-50:],  # Last 50 candles for client-side detection
                "candleCount": len(candles),
            })
        except Exception as e:
            logger.debug("Levels data failed for %s: %s", symbol, e)

    return results


def _compute_pattern_data(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Prepare OHLCV data for client-side pattern detection."""
    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 30:
                continue

            closes = [c["close"] for c in candles if "close" in c]
            if not closes:
                continue

            price = closes[-1]
            change = ((closes[-1] - closes[-2]) / closes[-2] * 100) if len(closes) >= 2 else 0

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "change": round(change, 4),
                "candles": candles[-100:],  # Last 100 candles for pattern detection
                "candleCount": len(candles),
            })
        except Exception as e:
            logger.debug("Pattern data failed for %s: %s", symbol, e)

    return results


# ═══════════════════════════════════════════════════════════════════════
# 🌐 API Endpoints
# ═══════════════════════════════════════════════════════════════════════

@cryptofeed_scanner_router.get("/status")
async def scanner_status():
    """Get scanner status and stats."""
    return {
        "running": _running,
        "exchanges": len(CRYPTOFEED_EXCHANGES),
        "pages": CRYPTOFEED_PAGES,
        "timeframes": SCANNER_TIMEFRAMES,
        "stats": _stats,
        "last_runs": {k: int(v * 1000) for k, v in _last_run.items()},
    }


@cryptofeed_scanner_router.post("/refresh/{page_id}")
async def manual_refresh(page_id: str, exchange: str = "binance", timeframe: str = "1h"):
    """Manually trigger a scan for a specific page/exchange/timeframe."""
    if page_id not in CRYPTOFEED_PAGES:
        return {"error": f"Invalid page: {page_id}. Valid: {CRYPTOFEED_PAGES}"}

    try:
        all_ohlcv = await _fetch_all_symbols(exchange, timeframe)
        if not all_ohlcv:
            return {"error": f"No OHLCV data for {exchange}/{timeframe}"}

        compute_fn = {
            "fibonacci": _compute_fibonacci,
            "divergence": _compute_divergence_data,
            "levels": _compute_levels_data,
        }.get(page_id)

        if compute_fn:
            results = compute_fn(all_ohlcv)
            written = await purge_and_write(page_id, exchange, timeframe, results)
            return {"success": True, "written": written, "total": len(results)}

        return {"error": "Unknown compute function"}
    except Exception as e:
        return {"error": str(e)}
