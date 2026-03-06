"""
📈 trendline_scanner.py — Trend Lines Scanner Provider
Scans 6 exchanges × 300 symbols × 4 timeframes for trend lines.

Exchanges: BINANCE (default), BYBIT, COINBASE, CRYPTO_COM, KUCOIN, OKX
Timeframes: 1h, 4h, 1d, 1w
Break confirmation: 2 candles

Results are written to Firebase:
  scanners_results/trendlines/exchanges/{exchange}/timeframes/{tf}/data/{symbol}
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional
from dataclasses import asdict

from fastapi import APIRouter

import config
from indicators.trend_lines import TrendLinesDetector, TrendLine
from firebase_writer import purge_and_write, update_meta, init_firebase

logger = logging.getLogger("trendline_scanner")
trendline_scanner_router = APIRouter()

# ═══════════════════════════════════════════════════════════════════════
# 🔧 Configuration
# ═══════════════════════════════════════════════════════════════════════

# 6 Exchanges only
TRENDLINE_EXCHANGES = [
    "binance",   # Default
    "bybit",
    "coinbase",
    "cryptocom",
    "kucoin",
    "okx",
]

# 4 Timeframes for trend lines (no 15m - higher TFs only)
TRENDLINE_TIMEFRAMES = ["1h", "4h", "1d", "1w"]

# Refresh intervals (seconds)
TRENDLINE_REFRESH_INTERVALS = {
    "1h": 5 * 60,       # 5 minutes
    "4h": 15 * 60,      # 15 minutes
    "1d": 60 * 60,      # 1 hour
    "1w": 4 * 60 * 60,  # 4 hours
}

# Top 200 symbols by volume (base universe)
TOP_200_SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "TRXUSDT",
    "LINKUSDT", "MATICUSDT", "SHIBUSDT", "LTCUSDT", "BCHUSDT",
    "NEARUSDT", "UNIUSDT", "APTUSDT", "OPUSDT", "ARBUSDT",
    "FILUSDT", "ATOMUSDT", "IMXUSDT", "GRTUSDT", "INJUSDT",
    "STXUSDT", "RENDERUSDT", "FETUSDT", "SUIUSDT", "SEIUSDT",
    "TIAUSDT", "JUPUSDT", "WIFUSDT", "PEPEUSDT", "FLOKIUSDT",
    "RUNEUSDT", "AAVEUSDT", "MKRUSDT", "SNXUSDT", "LDOUSDT",
    "ENAUSDT", "PENDLEUSDT", "EIGENUSDT", "ETHENAUSDT", "ONDOUSDT",
    "WLDUSDT", "KASUSDT", "THETAUSDT", "ALGOUSDT", "VETUSDT",
    # Extended to 200 symbols
    "ICPUSDT", "XLMUSDT", "HBARUSDT", "FTMUSDT", "SANDUSDT",
    "MANAUSDT", "AXSUSDT", "EGLDUSDT", "FLOWUSDT", "XTZUSDT",
    "EOSUSDT", "CHZUSDT", "CRVUSDT", "LRCUSDT", "APEUSDT",
    "ARUSDT", "MINAUSDT", "QNTUSDT", "CFXUSDT", "NEOUSDT",
    "KAVAUSDT", "KLAYUSDT", "1INCHUSDT", "ENJUSDT", "GALAUSDT",
    "WOOUSDT", "GMXUSDT", "ROSEUSDT", "COMPUSDT", "YFIUSDT",
    "SKLUSDT", "ZILUSDT", "BATUSDT", "ANKRUSDT", "IOTAUSDT",
    "ZRXUSDT", "COTIUSDT", "CELRUSDT", "OCEANUSDT", "BANDUSDT",
    "HOTUSDT", "ONTUSDT", "DGBUSDT", "RVNUSDT", "SCUSDT",
    "ZENUSDT", "WAVESUSDT", "DASHUSDT", "ZECUSDT", "KSMUSDT",
    "IOSTUSDT", "HNTUSDT", "SNUSDT", "MASKUSDT", "DYDXUSDT",
    "API3USDT", "AGLDUSDT", "ILVUSDT", "AUDIOUSDT", "ENSUSDT",
    "SPELLUSDT", "JSTUSDT", "SUNUSDT", "BTTUSDT", "WINUSDT",
    "TWTUSDT", "TOMOUSDT", "REEFUSDT", "DENTUSDT", "PEOPLEUSDT",
    "LOOKSUSDT", "HIGHUSDT", "ASTRUSDT", "GLMRUSDT", "MOVRUSDT",
    "AGIXUSDT", "CKBUSDT", "ACHUSDT", "SSVUSDT", "RDNTUSDT",
    "MAGICUSDT", "HOOKUSDT", "IDUSDT", "ARBUSDT", "EDUUSDT",
    "SUIUSDT", "BLURUSDT", "LEVERUSDT", "UMAUSDT", "KEYUSDT",
    "COMBOUSDT", "MAVUSDT", "XVSUSDT", "MDTUSDT", "XEMUSDT",
    "POLYXUSDT", "GASUSDT", "POWRUSDT", "SLPUSDT", "TLMUSDT",
    "ALPHAUSDT", "BELUSDT", "REQUSDT", "OGNUSDT", "MLNUSDT",
    "PERPUSDT", "TRUUSDT", "LITUSDT", "FORTHUSDT", "BONDUSDT",
    "BADGERUSDT", "CVCUSDT", "FISUSDT", "FXSUSDT", "GTCUSDT",
    "FARMUSDT", "ALCXUSDT", "TORNUSDT", "RARIUSDT", "SUPERUSDT",
    "QIUSDT", "BICOUSDT", "FLUXUSDT", "XNOUSDT", "PROSUSDT",
    "SYSUSDT", "VIBUSDT", "ELFUSDT", "IQUSDT", "CVXUSDT",
    "CHRAUSDT", "MBLUSDT", "STPTUSDT", "DATAUSDT", "MTLUSDT",
    "STORJUSDT", "NMRUSDT", "PAXGUSDT", "BTRSTUSDT", "VOXELUSDT",
    "QUICKUSDT", "RADUSDT", "RGTUSDT", "LCXUSDT", "PLAUSDT",
    "PYRUSDT", "RNDRUSDT", "SANTOSUSDT", "LAZIOUSDT", "PORTOUSDT",
]

# Extra 100 symbols to reach 300 per exchange
EXTRA_100_SYMBOLS = [
    "CTSIUSDT", "PHBUSDT", "LPTUSDT", "AMBUSDT", "OAXUSDT",
    "OGUSDT", "NKNUSDT", "STEEMUSDT", "WANUSDT", "DOCKUSDT",
    "FUNUSDT", "CTKUSDT", "AKROUSDT", "HARDUSDT", "DREPUSDT",
    "FIROUSDT", "VITEUSDT", "COSUSDT", "CTXCUSDT", "BURGERUSDT",
    "MOBUSDT", "PUNDIXUSDT", "BETAUSDT", "NBSUSDT", "EPXUSDT",
    "ERNUSDT", "USTCUSDT", "GALUSDT", "LUNAUSDT", "LUNCUSDT",
    "ANCUSDT", "ASTUSDT", "GMTUSDT", "BNXUSDT", "MULTIUSDT",
    "BSWUSDT", "REIUSDT", "STGUSDT", "POLSUSDT", "OOKIUSDT",
    "JASMYUSDT", "PHAUSDT", "VGXUSDT", "KDAUSDT", "LOKAUSDT",
    "SFPUSDT", "ALPACAUSDT", "DFUSDT", "FIDAUSDT", "FRONTUSDT",
    "CVPUSDT", "PSGUSDT", "JUVUSDT", "ACMUSDT", "BARUSDT",
    "CITYUSDT", "ONGUSDT", "QKCUSDT", "PIVXUSDT", "MDXUSDT",
    "DIAUSDT", "DUSKUSDT", "OMUSDT", "VIDTUSDT", "FORUSDT",
    "ATMUSDT", "ASRUSDT", "ADXUSDT", "AIONUSDT", "ARDRUSDT",
    "BRDUSDT", "CMTUSDT", "GXSUSDT", "LENDUSDT", "LSKUSDT",
    "LUNUSDT", "MCOUSDT", "MFTUSDT", "NASUSDT", "NAVUSDT",
    "NCASHUSDT", "POEUSDT", "POLYUSDT", "PPTUSDT", "QSPUSDT",
    "RCLCUSDT", "RCNUSDT", "RDNUSDT", "REPUSDT", "RLCUSDT",
    "SALTUSDT", "SKYUSDT", "SNTUSDT", "SNMUSDT", "SUBUSDT",
    "TNBUSDT",
]

TOP_300_SYMBOLS = (TOP_200_SYMBOLS + EXTRA_100_SYMBOLS)[:300]

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
    "detected_lines": 0,
}


# ═══════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═══════════════════════════════════════════════════════════════════════

async def init_trendline_scanner():
    """Start background scanner loops."""
    global _running
    try:
        init_firebase()
    except Exception as e:
        logger.error("❌ Firebase init failed — trendline scanner disabled: %s", e)
        return

    _running = True
    # One task per timeframe
    for tf in TRENDLINE_TIMEFRAMES:
        _bg_tasks.append(asyncio.create_task(_scan_loop(tf)))
    
    logger.info(
        "✅ Trendline scanner started (%d timeframes, %d exchanges, %d symbols)",
        len(TRENDLINE_TIMEFRAMES), len(TRENDLINE_EXCHANGES), len(TOP_300_SYMBOLS)
    )


async def shutdown_trendline_scanner():
    """Cancel all background tasks."""
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 Trendline scanner shutdown")


# ═══════════════════════════════════════════════════════════════════════
# 🔄 Main Scan Loop
# ═══════════════════════════════════════════════════════════════════════

async def _scan_loop(timeframe: str):
    """Run scanner for a specific timeframe at configured interval."""
    interval = TRENDLINE_REFRESH_INTERVALS.get(timeframe, 900)
    logger.info("🔄 Trendline scanner loop started: tf=%s, interval=%ds", timeframe, interval)

    # Stagger initial start
    tf_index = TRENDLINE_TIMEFRAMES.index(timeframe)
    await asyncio.sleep(tf_index * 15)

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
            logger.info("✅ Trendline scan complete: tf=%s, elapsed=%.1fs", timeframe, elapsed)
        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ Trendline scan error [tf=%s]: %s", timeframe, e)

        await asyncio.sleep(interval)


async def _scan_all_exchanges(timeframe: str):
    """Scan all 6 exchanges for trend lines."""
    from providers.cex_rest import fetch_ohlcv

    for exchange in TRENDLINE_EXCHANGES:
        try:
            # Fetch OHLCV for all symbols
            all_ohlcv = await _fetch_symbols_ohlcv(exchange, timeframe)
            if not all_ohlcv:
                logger.warning("No OHLCV data for %s/%s", exchange, timeframe)
                continue

            # Compute trend lines
            results = _compute_trendlines(all_ohlcv, exchange, timeframe)
            
            if results:
                written = await purge_and_write("trendlines", exchange, timeframe, results)
                _stats["total_writes"] += 1
                _stats["detected_lines"] += sum(
                    len(r.get("lines", [])) for r in results
                )
                logger.info(
                    "📈 [trendlines/%s/%s] Wrote %d symbols with trend lines",
                    exchange, timeframe, written
                )
            else:
                # Write empty to clear stale data
                await purge_and_write("trendlines", exchange, timeframe, [])

            _last_run[f"{exchange}:{timeframe}"] = time.time()

        except Exception as e:
            _stats["errors"] += 1
            logger.error("Exchange scan failed [%s/%s]: %s", exchange, timeframe, e)


async def _fetch_symbols_ohlcv(exchange: str, timeframe: str) -> Dict[str, List[Dict]]:
    """Fetch OHLCV for all 300 symbols from one exchange."""
    from providers.cex_rest import fetch_ohlcv

    results = {}
    symbols = TOP_300_SYMBOLS

    # Fetch in batches
    batch_size = 10
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        tasks = [fetch_ohlcv(exchange, sym, timeframe, 200) for sym in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for sym, res in zip(batch, batch_results):
            if isinstance(res, Exception):
                continue
            if res and len(res) > 50:  # Need enough data for trend detection
                results[sym] = res

        # Rate limit
        if i + batch_size < len(symbols):
            await asyncio.sleep(0.3)

    return results


def _compute_trendlines(
    all_ohlcv: Dict[str, List[Dict]], 
    exchange: str, 
    timeframe: str
) -> List[Dict[str, Any]]:
    """Compute trend lines for all symbols using PineScript algorithm."""
    results = []
    # Use PineScript default parameters: pivot_period=20, pp_num=3, max_lines=3
    detector = TrendLinesDetector(pivot_period=20, pp_num=3, max_lines=3)
    
    for symbol, candles in all_ohlcv.items():
        try:
            if len(candles) < 50:
                continue
            
            detection = detector.detect(candles)
            
            up_lines = detection.get("uptrend_lines", [])
            down_lines = detection.get("downtrend_lines", [])
            filter_type = detection.get("filter_type", "none")
            
            # Skip if no lines detected
            if filter_type == "none":
                continue
            
            # Convert TrendLine objects to dicts
            lines = []
            for line in up_lines:
                lines.append({
                    "type": "up",
                    "x1": line.x1,
                    "y1": round(line.y1, 8),
                    "x2": line.x2,
                    "y2": round(line.y2, 8),
                    "slope": round(line.slope, 10),
                    "strength": line.strength,
                    "age_bars": line.age_bars,
                })
            for line in down_lines:
                lines.append({
                    "type": "down",
                    "x1": line.x1,
                    "y1": round(line.y1, 8),
                    "x2": line.x2,
                    "y2": round(line.y2, 8),
                    "slope": round(line.slope, 10),
                    "strength": line.strength,
                    "age_bars": line.age_bars,
                })
            
            # Get current price
            price = candles[-1]["close"] if candles else 0
            
            results.append({
                "symbol": symbol,
                "name": symbol.replace("USDT", ""),
                "exchange": exchange,
                "timeframe": timeframe,
                "price": round(price, 8),
                "filter_type": filter_type,  # up, down, both
                "lines": lines,
                "line_count": len(lines),
                "detected_at": int(time.time() * 1000),
            })
            
        except Exception as e:
            logger.debug("Trendline calc failed for %s: %s", symbol, e)
    
    return results


# ═══════════════════════════════════════════════════════════════════════
# 📡 API Endpoints
# ═══════════════════════════════════════════════════════════════════════

@trendline_scanner_router.get("/status")
async def get_trendline_status():
    """Get scanner status and statistics."""
    return {
        "running": _running,
        "exchanges": TRENDLINE_EXCHANGES,
        "timeframes": TRENDLINE_TIMEFRAMES,
        "symbols_count": len(TOP_300_SYMBOLS),
        "stats": _stats,
        "last_runs": _last_run,
    }


@trendline_scanner_router.get("/exchanges")
async def get_trendline_exchanges():
    """Get list of supported exchanges."""
    return {
        "exchanges": [
            {"id": "binance", "name": "Binance", "default": True},
            {"id": "bybit", "name": "Bybit", "default": False},
            {"id": "coinbase", "name": "Coinbase", "default": False},
            {"id": "cryptocom", "name": "Crypto.com", "default": False},
            {"id": "kucoin", "name": "KuCoin", "default": False},
            {"id": "okx", "name": "OKX", "default": False},
        ],
        "timeframes": TRENDLINE_TIMEFRAMES,
    }


@trendline_scanner_router.post("/scan/{exchange}/{timeframe}")
async def trigger_scan(exchange: str, timeframe: str):
    """Manually trigger a scan for specific exchange/timeframe."""
    if exchange not in TRENDLINE_EXCHANGES:
        return {"error": f"Exchange {exchange} not supported"}
    if timeframe not in TRENDLINE_TIMEFRAMES:
        return {"error": f"Timeframe {timeframe} not supported"}
    
    try:
        await _scan_all_exchanges(timeframe)
        return {"success": True, "message": f"Scan triggered for {exchange}/{timeframe}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
