"""
📡 ws_scanner.py — File 2 Provider
Background scanner for real-time / multi-TF scoring pages:
  - trend       (38-check DYOR-style scoring)
  - volume      (volume anomaly detection)
  - rsi-heatmap (multi-TF RSI values)
  - macd-heatmap(multi-TF MACD histogram)
  - favorites   (price + change data)

Loops through WS_SCANNER_EXCHANGES × SCANNER_TIMEFRAMES × SCANNER_SYMBOLS
on a per-timeframe refresh schedule and writes results to Firebase.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional

from fastapi import APIRouter

import config
from exchanges_config import (
    WS_SCANNER_EXCHANGES,
    WS_SCANNER_PAGES,
    SCANNER_SYMBOLS_COMPACT,
    SCANNER_TIMEFRAMES,
    REFRESH_INTERVALS,
)
from firebase_writer import purge_and_write, update_meta, init_firebase

logger = logging.getLogger("ws_scanner")
ws_scanner_router = APIRouter()

# ═══════════════════════════════════════════════════════════════════════
# 🔧 State
# ═══════════════════════════════════════════════════════════════════════

_bg_tasks: List[asyncio.Task] = []
_last_run: Dict[str, float] = {}
_running = False
_stats: Dict[str, Any] = {
    "total_writes": 0,
    "last_cycle": None,
    "errors": 0,
}


# ═══════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═══════════════════════════════════════════════════════════════════════

async def init_ws_scanner():
    """Start background scanner loops."""
    global _running
    try:
        init_firebase()
    except Exception as e:
        logger.error("❌ Firebase init failed — WS scanner disabled: %s", e)
        return

    _running = True
    for tf in SCANNER_TIMEFRAMES:
        _bg_tasks.append(asyncio.create_task(_scan_loop(tf)))
    logger.info("✅ WS scanner started (%d timeframes, %d exchanges)",
                len(SCANNER_TIMEFRAMES), len(WS_SCANNER_EXCHANGES))


async def shutdown_ws_scanner():
    """Cancel all background tasks."""
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 WS scanner shutdown")


# ═══════════════════════════════════════════════════════════════════════
# 🔄 Main Scan Loop (per timeframe)
# ═══════════════════════════════════════════════════════════════════════

async def _scan_loop(timeframe: str):
    """Run scanner for a specific timeframe at the configured interval."""
    interval = REFRESH_INTERVALS.get(timeframe, 900)
    logger.info("🔄 WS Scanner loop started: tf=%s, interval=%ds", timeframe, interval)

    # Stagger: start after cryptofeed_scanner (offset by 5s per TF)
    tf_index = SCANNER_TIMEFRAMES.index(timeframe)
    await asyncio.sleep(30 + tf_index * 5)

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
            logger.info("✅ WS scan cycle: tf=%s, elapsed=%.1fs", timeframe, elapsed)
        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ WS scan cycle error [tf=%s]: %s", timeframe, e)

        await asyncio.sleep(interval)


async def _scan_all_exchanges(timeframe: str):
    """Scan all WS exchanges for a given timeframe."""
    from providers.cex_rest import fetch_ohlcv, run_38_checks, calc_rsi, calc_macd

    for exchange in WS_SCANNER_EXCHANGES:
        try:
            # Fetch OHLCV for all symbols
            all_ohlcv = await _fetch_all_symbols(exchange, timeframe)
            if not all_ohlcv:
                logger.warning("No OHLCV data for %s/%s", exchange, timeframe)
                continue

            # ─── Page: trend (38-check scoring) ───
            trend_results = await _compute_trend(all_ohlcv, exchange, timeframe)
            if trend_results:
                await purge_and_write("trend", exchange, timeframe, trend_results)

            # ─── Page: rsi-heatmap ───
            rsi_results = _compute_rsi_heatmap(all_ohlcv)
            if rsi_results:
                await purge_and_write("rsi-heatmap", exchange, timeframe, rsi_results)

            # ─── Page: macd-heatmap ───
            macd_results = _compute_macd_heatmap(all_ohlcv)
            if macd_results:
                await purge_and_write("macd-heatmap", exchange, timeframe, macd_results)

            # ─── Page: volume ───
            volume_results = _compute_volume(all_ohlcv)
            if volume_results:
                await purge_and_write("volume", exchange, timeframe, volume_results)

            # ─── Page: favorites (basic price data) ───
            favorites_results = _compute_favorites(all_ohlcv)
            if favorites_results:
                await purge_and_write("favorites", exchange, timeframe, favorites_results)

            _last_run[f"{exchange}:{timeframe}"] = time.time()
            _stats["total_writes"] += 1

        except Exception as e:
            _stats["errors"] += 1
            logger.error("WS exchange scan failed [%s/%s]: %s", exchange, timeframe, e)


async def _fetch_all_symbols(exchange: str, timeframe: str) -> Dict[str, List[Dict]]:
    """Fetch OHLCV for all scanner symbols from one exchange."""
    from providers.cex_rest import fetch_ohlcv

    results = {}
    symbols = SCANNER_SYMBOLS_COMPACT
    batch_size = 5

    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        tasks = [fetch_ohlcv(exchange, sym, timeframe, 200) for sym in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for sym, res in zip(batch, batch_results):
            if isinstance(res, Exception):
                continue
            if res and len(res) > 10:
                results[sym] = res

        if i + batch_size < len(symbols):
            await asyncio.sleep(0.5)

    return results


# ═══════════════════════════════════════════════════════════════════════
# 📊 Analysis Functions
# ═══════════════════════════════════════════════════════════════════════

async def _compute_trend(
    all_ohlcv: Dict[str, List[Dict]],
    exchange: str,
    timeframe: str,
) -> List[Dict]:
    """Run 38-check DYOR-style trend scoring for all symbols."""
    from providers.cex_rest import run_38_checks

    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 60:
                continue

            closes = [c["close"] for c in candles]
            highs = [c["high"] for c in candles]
            lows = [c["low"] for c in candles]
            volumes = [c["volume"] for c in candles]

            price = closes[-1]
            checks = run_38_checks(closes, highs, lows)

            bullish = sum(1 for ch in checks if ch["result"] == "buy")
            bearish = sum(1 for ch in checks if ch["result"] == "sell")
            neutral = sum(1 for ch in checks if ch["result"] == "neutral")
            total = bullish + bearish + neutral
            score = bullish - bearish if total > 0 else 0

            # 24h change approximation from candles
            if len(closes) >= 2:
                change24h = (closes[-1] - closes[0]) / closes[0] * 100
            else:
                change24h = 0

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "change24h": round(change24h, 4),
                "high24h": max(highs[-24:]) if len(highs) >= 24 else max(highs),
                "low24h": min(lows[-24:]) if len(lows) >= 24 else min(lows),
                "volume24h": sum(volumes[-24:]) if len(volumes) >= 24 else sum(volumes),
                "bullishCount": bullish,
                "bearishCount": bearish,
                "neutralCount": neutral,
                "bullishScore": round(bullish / total * 100, 1) if total > 0 else 0,
                "bearishScore": round(bearish / total * 100, 1) if total > 0 else 0,
                "score": score,
            })
        except Exception as e:
            logger.debug("Trend calc failed for %s: %s", symbol, e)

    return results


def _compute_rsi_heatmap(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Compute RSI(14) for all symbols."""
    from providers.cex_rest import calc_rsi

    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 30:
                continue

            closes = [c["close"] for c in candles]
            volumes = [c["volume"] for c in candles]
            price = closes[-1]

            rsi_values = calc_rsi(closes, 14)
            rsi = round(rsi_values[-1], 2) if rsi_values else None

            if rsi is None:
                continue

            # Price change
            change = ((closes[-1] - closes[0]) / closes[0] * 100) if len(closes) >= 2 else 0

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "rsi": rsi,
                "volume24h": sum(volumes[-24:]) if len(volumes) >= 24 else sum(volumes),
                "price24hPcnt": round(change / 100, 6),
            })
        except Exception as e:
            logger.debug("RSI calc failed for %s: %s", symbol, e)

    return results


def _compute_macd_heatmap(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Compute MACD(12,26,9) histogram for all symbols."""
    from providers.cex_rest import calc_macd

    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 40:
                continue

            closes = [c["close"] for c in candles]
            volumes = [c["volume"] for c in candles]
            price = closes[-1]

            macd_line, signal_line, histogram = calc_macd(closes)
            macd_val = round(histogram[-1], 8) if histogram else None

            if macd_val is None:
                continue

            change = ((closes[-1] - closes[0]) / closes[0] * 100) if len(closes) >= 2 else 0

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "macd": macd_val,
                "macdLine": round(macd_line[-1], 8) if macd_line else None,
                "signal": round(signal_line[-1], 8) if signal_line else None,
                "volume24h": sum(volumes[-24:]) if len(volumes) >= 24 else sum(volumes),
                "price24hPcnt": round(change / 100, 6),
            })
        except Exception as e:
            logger.debug("MACD calc failed for %s: %s", symbol, e)

    return results


def _compute_volume(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Compute volume analysis: spikes, trends, divergences."""
    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 30:
                continue

            closes = [c["close"] for c in candles]
            volumes = [c["volume"] for c in candles]
            price = closes[-1]

            # Volume stats
            avg_volume = sum(volumes) / len(volumes)
            recent_volume = volumes[-1]
            volume_ratio = recent_volume / avg_volume if avg_volume > 0 else 1

            # Volume trend (last 10 vs previous 10)
            if len(volumes) >= 20:
                recent_avg = sum(volumes[-10:]) / 10
                prev_avg = sum(volumes[-20:-10]) / 10
                volume_trend = ((recent_avg - prev_avg) / prev_avg * 100) if prev_avg > 0 else 0
            else:
                volume_trend = 0

            # Spike detection (> 2x average)
            is_spike = volume_ratio > 2.0

            # Price change
            change = ((closes[-1] - closes[0]) / closes[0] * 100) if len(closes) >= 2 else 0

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "change24h": round(change, 4),
                "volume": recent_volume,
                "avgVolume": round(avg_volume, 2),
                "volumeRatio": round(volume_ratio, 4),
                "volumeTrend": round(volume_trend, 2),
                "isSpike": is_spike,
                "candles": candles[-20:],  # Last 20 for chart
            })
        except Exception as e:
            logger.debug("Volume calc failed for %s: %s", symbol, e)

    return results


def _compute_favorites(all_ohlcv: Dict[str, List[Dict]]) -> List[Dict]:
    """Basic price data for favorites page."""
    results = []
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 5:
                continue

            closes = [c["close"] for c in candles]
            highs = [c["high"] for c in candles]
            lows = [c["low"] for c in candles]
            volumes = [c["volume"] for c in candles]
            price = closes[-1]

            change = ((closes[-1] - closes[0]) / closes[0] * 100) if len(closes) >= 2 else 0

            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "price": price,
                "change24h": round(change, 4),
                "high24h": max(highs[-24:]) if len(highs) >= 24 else max(highs),
                "low24h": min(lows[-24:]) if len(lows) >= 24 else min(lows),
                "volume24h": sum(volumes[-24:]) if len(volumes) >= 24 else sum(volumes),
            })
        except Exception as e:
            logger.debug("Favorites calc failed for %s: %s", symbol, e)

    return results


# ═══════════════════════════════════════════════════════════════════════
# 🌐 API Endpoints
# ═══════════════════════════════════════════════════════════════════════

@ws_scanner_router.get("/status")
async def scanner_status():
    """Get WS scanner status."""
    return {
        "running": _running,
        "exchanges": len(WS_SCANNER_EXCHANGES),
        "pages": WS_SCANNER_PAGES,
        "timeframes": SCANNER_TIMEFRAMES,
        "stats": _stats,
        "last_runs": {k: int(v * 1000) for k, v in _last_run.items()},
    }


@ws_scanner_router.post("/refresh/{page_id}")
async def manual_refresh(page_id: str, exchange: str = "binance", timeframe: str = "1h"):
    """Manually trigger a scan for a specific page/exchange/timeframe."""
    if page_id not in WS_SCANNER_PAGES:
        return {"error": f"Invalid page: {page_id}. Valid: {WS_SCANNER_PAGES}"}

    from providers.cex_rest import fetch_ohlcv

    try:
        all_ohlcv = await _fetch_all_symbols(exchange, timeframe)
        if not all_ohlcv:
            return {"error": f"No OHLCV data for {exchange}/{timeframe}"}

        compute_fn = {
            "trend": lambda data: asyncio.get_event_loop().run_until_complete(
                _compute_trend(data, exchange, timeframe)
            ),
            "rsi-heatmap": _compute_rsi_heatmap,
            "macd-heatmap": _compute_macd_heatmap,
            "volume": _compute_volume,
            "favorites": _compute_favorites,
        }.get(page_id)

        if page_id == "trend":
            results = await _compute_trend(all_ohlcv, exchange, timeframe)
        elif compute_fn:
            results = compute_fn(all_ohlcv)
        else:
            return {"error": "Unknown page"}

        written = await purge_and_write(page_id, exchange, timeframe, results)
        return {"success": True, "written": written, "total": len(results)}
    except Exception as e:
        return {"error": str(e)}
