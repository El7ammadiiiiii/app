"""
📊 Central File 1 — cex_rest.py
15 REST exchanges with python-binance as PRIMARY source.

Feeds: trend-scanner, levels, volume-scanner, pattern, fibonacci-scanner
Endpoints:
  GET /api/rest/ohlcv
  GET /api/rest/tickers
  GET /api/rest/top-coins
  GET /api/rest/trend-scan
  GET /api/rest/fibonacci
"""

import asyncio
import logging
import time
import math
from typing import Optional, Dict, List, Any
from collections import OrderedDict

import httpx
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

import config

logger = logging.getLogger("cex_rest")
rest_router = APIRouter()

# ═════════════════════════════════════════════════════════════════════════
# 🔧 Cache
# ═════════════════════════════════════════════════════════════════════════

class TTLCache:
    """Simple in-memory TTL cache"""
    def __init__(self, max_size: int = 2000):
        self._cache: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._max_size = max_size

    def get(self, key: str, ttl: int) -> Any:
        if key in self._cache:
            ts, val = self._cache[key]
            if time.time() - ts < ttl:
                self._cache.move_to_end(key)
                return val
            del self._cache[key]
        return None

    def set(self, key: str, val: Any):
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (time.time(), val)
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)


cache = TTLCache()
_http: Optional[httpx.AsyncClient] = None


# ═════════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═════════════════════════════════════════════════════════════════════════

async def init_rest_provider():
    global _http
    _http = httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(max_connections=100))
    logger.info("✅ REST provider initialized (primary: binance, 15 exchanges)")


async def shutdown_rest_provider():
    global _http
    if _http:
        await _http.aclose()
        _http = None
    logger.info("🛑 REST provider shutdown")


def _client() -> httpx.AsyncClient:
    if not _http:
        raise RuntimeError("REST provider not initialized")
    return _http


# ═════════════════════════════════════════════════════════════════════════
# 🟡 BINANCE — PRIMARY (python-binance style REST via httpx)
# ═════════════════════════════════════════════════════════════════════════

BINANCE_BASE = "https://api.binance.com"

TF_MAP_BINANCE = {
    "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "2h": "2h", "4h": "4h", "6h": "6h", "8h": "8h",
    "12h": "12h", "1d": "1d", "3d": "3d", "1w": "1w", "1M": "1M",
}


async def binance_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    """Fetch OHLCV from Binance REST API"""
    ck = f"binance:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf = TF_MAP_BINANCE.get(timeframe, timeframe)
    url = f"{BINANCE_BASE}/api/v3/klines"
    params = {"symbol": symbol, "interval": tf, "limit": limit}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    raw = resp.json()

    candles = []
    for k in raw:
        candles.append({
            "timestamp": k[0],
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def binance_tickers(limit: int = 50) -> List[Dict]:
    """Get USDT tickers from Binance sorted by volume"""
    ck = f"binance:tickers:{limit}"
    cached = cache.get(ck, config.TICKER_CACHE_TTL)
    if cached is not None:
        return cached

    url = f"{BINANCE_BASE}/api/v3/ticker/24hr"
    resp = await _client().get(url)
    resp.raise_for_status()
    raw = resp.json()

    usdt = [t for t in raw if t["symbol"].endswith("USDT")
            and not any(s in t["symbol"] for s in ["UPUSDT", "DOWNUSDT", "BULLUSDT", "BEARUSDT"])]
    usdt.sort(key=lambda x: float(x.get("quoteVolume", 0)), reverse=True)
    usdt = usdt[:limit]

    tickers = []
    for t in usdt:
        tickers.append({
            "symbol": t["symbol"],
            "last": float(t.get("lastPrice", 0)),
            "high": float(t.get("highPrice", 0)),
            "low": float(t.get("lowPrice", 0)),
            "volume": float(t.get("volume", 0)),
            "quoteVolume": float(t.get("quoteVolume", 0)),
            "change24h": float(t.get("priceChangePercent", 0)),
        })

    cache.set(ck, tickers)
    return tickers


async def binance_top_symbols(count: int = 50) -> List[str]:
    """Top N USDT symbols by volume on Binance"""
    tickers = await binance_tickers(count)
    return [t["symbol"] for t in tickers]


# ═════════════════════════════════════════════════════════════════════════
# 🔄 FALLBACK EXCHANGES — REST via httpx
# ═════════════════════════════════════════════════════════════════════════

TF_MAP_BYBIT = {
    "1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "2h": "120", "4h": "240", "6h": "360", "12h": "720",
    "1d": "D", "1w": "W", "1M": "M",
}


async def bybit_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"bybit:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf = TF_MAP_BYBIT.get(timeframe, "60")
    url = "https://api.bybit.com/v5/market/kline"
    params = {"category": "spot", "symbol": symbol, "interval": tf, "limit": limit}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    candles = []
    for k in reversed(data.get("result", {}).get("list", [])):
        candles.append({
            "timestamp": int(k[0]),
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def okx_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"okx:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
              "1h": "1H", "2h": "2H", "4h": "4H", "6h": "6H", "12h": "12H",
              "1d": "1D", "1w": "1W", "1M": "1M"}
    tf = tf_map.get(timeframe, "1H")

    # OKX uses BTC-USDT not BTCUSDT
    inst_id = symbol.replace("USDT", "-USDT")
    url = "https://www.okx.com/api/v5/market/candles"
    params = {"instId": inst_id, "bar": tf, "limit": min(limit, 300)}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    candles = []
    for k in reversed(data.get("data", [])):
        candles.append({
            "timestamp": int(k[0]),
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def coinbase_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"coinbase:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    granularity_map = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600,
                       "6h": 21600, "1d": 86400}
    gran = granularity_map.get(timeframe, 3600)
    product_id = symbol.replace("USDT", "-USD")

    url = f"https://api.exchange.coinbase.com/products/{product_id}/candles"
    params = {"granularity": gran}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    raw = resp.json()

    candles = []
    for k in reversed(raw[:limit]):
        candles.append({
            "timestamp": k[0] * 1000,
            "open": float(k[3]),
            "high": float(k[2]),
            "low": float(k[1]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def kraken_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"kraken:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    interval_map = {"1m": 1, "5m": 5, "15m": 15, "30m": 30,
                    "1h": 60, "4h": 240, "1d": 1440, "1w": 10080}
    interval = interval_map.get(timeframe, 60)

    pair = symbol.replace("USDT", "USD")
    url = "https://api.kraken.com/0/public/OHLC"
    params = {"pair": pair, "interval": interval}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    result_data = data.get("result", {})
    pair_key = next((k for k in result_data if k != "last"), None)
    if not pair_key:
        return []

    candles = []
    for k in result_data[pair_key][-limit:]:
        candles.append({
            "timestamp": int(k[0]) * 1000,
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[6]),
        })

    cache.set(ck, candles)
    return candles


async def kucoin_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"kucoin:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1min", "3m": "3min", "5m": "5min", "15m": "15min",
              "30m": "30min", "1h": "1hour", "2h": "2hour", "4h": "4hour",
              "6h": "6hour", "8h": "8hour", "12h": "12hour", "1d": "1day", "1w": "1week"}
    tf = tf_map.get(timeframe, "1hour")

    pair = symbol.replace("USDT", "-USDT")
    url = "https://api.kucoin.com/api/v1/market/candles"
    params = {"type": tf, "symbol": pair}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    candles = []
    for k in reversed((data.get("data") or [])[:limit]):
        candles.append({
            "timestamp": int(k[0]) * 1000,
            "open": float(k[1]),
            "close": float(k[2]),
            "high": float(k[3]),
            "low": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def mexc_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"mexc:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    url = "https://api.mexc.com/api/v3/klines"
    params = {"symbol": symbol, "interval": timeframe, "limit": limit}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    raw = resp.json()

    candles = []
    for k in raw:
        candles.append({
            "timestamp": k[0],
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def gateio_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"gateio:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
              "1h": "1h", "4h": "4h", "8h": "8h", "1d": "1d", "1w": "7d"}
    tf = tf_map.get(timeframe, "1h")

    pair = symbol.replace("USDT", "_USDT")
    url = "https://api.gateio.ws/api/v4/spot/candlesticks"
    params = {"currency_pair": pair, "interval": tf, "limit": limit}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    raw = resp.json()

    candles = []
    for k in raw:
        candles.append({
            "timestamp": int(k[0]) * 1000,
            "open": float(k[5]),
            "high": float(k[3]),
            "low": float(k[4]),
            "close": float(k[2]),
            "volume": float(k[1]),
        })

    cache.set(ck, candles)
    return candles


async def bitget_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"bitget:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min",
              "1h": "1h", "4h": "4h", "6h": "6h", "12h": "12h", "1d": "1day", "1w": "1week"}
    tf = tf_map.get(timeframe, "1h")

    url = "https://api.bitget.com/api/v2/spot/market/candles"
    params = {"symbol": symbol, "granularity": tf, "limit": str(limit)}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    candles = []
    for k in reversed(data.get("data", [])):
        candles.append({
            "timestamp": int(k[0]),
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def htx_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"htx:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min",
              "1h": "60min", "4h": "4hour", "1d": "1day", "1w": "1week"}
    tf = tf_map.get(timeframe, "60min")

    sym = symbol.lower().replace("usdt", "usdt")
    url = "https://api.huobi.pro/market/history/kline"
    params = {"symbol": sym, "period": tf, "size": min(limit, 2000)}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    candles = []
    for k in reversed(data.get("data", [])):
        candles.append({
            "timestamp": k["id"] * 1000,
            "open": float(k["open"]),
            "high": float(k["high"]),
            "low": float(k["low"]),
            "close": float(k["close"]),
            "volume": float(k["vol"]),
        })

    cache.set(ck, candles)
    return candles


async def bitfinex_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"bitfinex:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
              "1h": "1h", "3h": "3h", "6h": "6h", "12h": "12h",
              "1d": "1D", "1w": "7D", "1M": "1M"}
    tf = tf_map.get(timeframe, "1h")

    # Bitfinex uses tBTCUST not BTCUSDT
    bfx_sym = "t" + symbol.replace("USDT", "UST")
    url = f"https://api-pub.bitfinex.com/v2/candles/trade:{tf}:{bfx_sym}/hist"
    params = {"limit": limit, "sort": 1}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    raw = resp.json()

    candles = []
    for k in raw:
        candles.append({
            "timestamp": k[0],
            "open": float(k[1]),
            "close": float(k[2]),
            "high": float(k[3]),
            "low": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def gemini_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"gemini:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    tf_map = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
              "1h": "1hr", "6h": "6hr", "1d": "1day"}
    tf = tf_map.get(timeframe, "1hr")

    sym = symbol.lower().replace("usdt", "usd")
    url = f"https://api.gemini.com/v2/candles/{sym}/{tf}"

    resp = await _client().get(url)
    resp.raise_for_status()
    raw = resp.json()

    candles = []
    for k in reversed(raw[:limit]):
        candles.append({
            "timestamp": k[0],
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })

    cache.set(ck, candles)
    return candles


async def bitstamp_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    ck = f"bitstamp:ohlcv:{symbol}:{timeframe}:{limit}"
    cached = cache.get(ck, config.OHLCV_CACHE_TTL)
    if cached is not None:
        return cached

    step_map = {"1m": 60, "5m": 300, "15m": 900, "30m": 1800,
                "1h": 3600, "3h": 10800, "6h": 21600, "12h": 43200, "1d": 86400}
    step = step_map.get(timeframe, 3600)

    pair = symbol.lower().replace("usdt", "usd")
    url = f"https://www.bitstamp.net/api/v2/ohlc/{pair}/"
    params = {"step": step, "limit": limit}

    resp = await _client().get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    candles = []
    for k in data.get("data", {}).get("ohlc", []):
        candles.append({
            "timestamp": int(k["timestamp"]) * 1000,
            "open": float(k["open"]),
            "high": float(k["high"]),
            "low": float(k["low"]),
            "close": float(k["close"]),
            "volume": float(k["volume"]),
        })

    cache.set(ck, candles)
    return candles


# Exchange dispatcher
EXCHANGE_FETCHERS = {
    "binance": binance_ohlcv,
    "bybit": bybit_ohlcv,
    "okx": okx_ohlcv,
    "coinbase": coinbase_ohlcv,
    "kraken": kraken_ohlcv,
    "kucoin": kucoin_ohlcv,
    "mexc": mexc_ohlcv,
    "gateio": gateio_ohlcv,
    "bitget": bitget_ohlcv,
    "htx": htx_ohlcv,
    "bitfinex": bitfinex_ohlcv,
    "gemini": gemini_ohlcv,
    "bitstamp": bitstamp_ohlcv,
}


FALLBACK_CHAIN = ["okx", "kucoin", "bitget", "mexc", "gateio", "htx"]


async def fetch_ohlcv(exchange: str, symbol: str, timeframe: str = "1h", limit: int = 500) -> List[Dict]:
    """Universal OHLCV fetcher — tries requested exchange, then fallback chain"""
    fetcher = EXCHANGE_FETCHERS.get(exchange)
    if fetcher:
        try:
            return await fetcher(symbol, timeframe, limit)
        except Exception as e:
            logger.warning("Exchange %s failed for %s: %s — trying fallbacks", exchange, symbol, e)

    # Try fallback chain (skip the already-failed exchange)
    for fb_exchange in FALLBACK_CHAIN:
        if fb_exchange == exchange:
            continue
        fb_fetcher = EXCHANGE_FETCHERS.get(fb_exchange)
        if not fb_fetcher:
            continue
        try:
            result = await fb_fetcher(symbol, timeframe, limit)
            if result:
                logger.info("Fallback %s succeeded for %s", fb_exchange, symbol)
                return result
        except Exception:
            continue

    raise HTTPException(status_code=502, detail=f"All exchanges failed for {symbol}")


# ═════════════════════════════════════════════════════════════════════════
# 📈 Technical Indicators — 38 DYOR-style checks
# ═════════════════════════════════════════════════════════════════════════

def calc_sma(closes: List[float], period: int) -> Optional[float]:
    if len(closes) < period:
        return None
    return sum(closes[-period:]) / period


def calc_ema(closes: List[float], period: int) -> Optional[float]:
    if len(closes) < period:
        return None
    # SMA-seeded EMA
    sma = sum(closes[:period]) / period
    k = 2.0 / (period + 1)
    ema = sma
    for i in range(period, len(closes)):
        ema = closes[i] * k + ema * (1 - k)
    return ema


def calc_rsi(closes: List[float], period: int = 14) -> Optional[float]:
    if len(closes) < period + 1:
        return None
    gains = []
    losses = []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def calc_stoch_rsi(closes: List[float], rsi_period: int = 14, stoch_period: int = 14, k_period: int = 3, d_period: int = 3):
    """Returns (K, D) or (None, None)"""
    if len(closes) < rsi_period + stoch_period + k_period:
        return None, None

    # compute RSI series
    rsi_vals = []
    gains = []
    losses = []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    if len(gains) < rsi_period:
        return None, None

    avg_gain = sum(gains[:rsi_period]) / rsi_period
    avg_loss = sum(losses[:rsi_period]) / rsi_period

    for i in range(rsi_period, len(gains)):
        avg_gain = (avg_gain * (rsi_period - 1) + gains[i]) / rsi_period
        avg_loss = (avg_loss * (rsi_period - 1) + losses[i]) / rsi_period
        if avg_loss == 0:
            rsi_vals.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi_vals.append(100 - (100 / (1 + rs)))

    if len(rsi_vals) < stoch_period:
        return None, None

    # Stoch of RSI
    stoch_k_vals = []
    for i in range(stoch_period - 1, len(rsi_vals)):
        window = rsi_vals[i - stoch_period + 1: i + 1]
        lo = min(window)
        hi = max(window)
        if hi == lo:
            stoch_k_vals.append(50)
        else:
            stoch_k_vals.append((rsi_vals[i] - lo) / (hi - lo) * 100)

    if len(stoch_k_vals) < k_period:
        return None, None

    # Smooth K
    smooth_k = []
    for i in range(k_period - 1, len(stoch_k_vals)):
        smooth_k.append(sum(stoch_k_vals[i - k_period + 1: i + 1]) / k_period)

    if len(smooth_k) < d_period:
        return None, None

    # Smooth D
    smooth_d = []
    for i in range(d_period - 1, len(smooth_k)):
        smooth_d.append(sum(smooth_k[i - d_period + 1: i + 1]) / d_period)

    return smooth_k[-1], smooth_d[-1]


def calc_macd(closes: List[float], fast: int = 12, slow: int = 26, signal: int = 9):
    """Returns (macd_line, signal_line, histogram) or (None, None, None)"""
    if len(closes) < slow + signal:
        return None, None, None

    fast_ema = calc_ema(closes, fast)
    slow_ema = calc_ema(closes, slow)
    if fast_ema is None or slow_ema is None:
        return None, None, None

    # Build MACD line series
    fast_k = 2.0 / (fast + 1)
    slow_k = 2.0 / (slow + 1)

    fast_e = sum(closes[:fast]) / fast
    slow_e = sum(closes[:slow]) / slow
    macd_series = []

    for i in range(slow, len(closes)):
        # update fast
        if i >= fast:
            fast_e = closes[i] * fast_k + fast_e * (1 - fast_k)
        slow_e = closes[i] * slow_k + slow_e * (1 - slow_k)
        macd_series.append(fast_e - slow_e)

    if len(macd_series) < signal:
        return None, None, None

    # Signal line (EMA of MACD)
    sig_k = 2.0 / (signal + 1)
    sig_e = sum(macd_series[:signal]) / signal
    for i in range(signal, len(macd_series)):
        sig_e = macd_series[i] * sig_k + sig_e * (1 - sig_k)

    macd_val = macd_series[-1]
    histogram = macd_val - sig_e

    return macd_val, sig_e, histogram


def calc_adx(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> Optional[float]:
    if len(closes) < period * 2:
        return None

    tr_list = []
    plus_dm = []
    minus_dm = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        tr_list.append(tr)

        up = highs[i] - highs[i - 1]
        down = lows[i - 1] - lows[i]
        plus_dm.append(up if up > down and up > 0 else 0)
        minus_dm.append(down if down > up and down > 0 else 0)

    if len(tr_list) < period:
        return None

    atr = sum(tr_list[:period]) / period
    plus_di_sum = sum(plus_dm[:period]) / period
    minus_di_sum = sum(minus_dm[:period]) / period

    dx_vals = []
    for i in range(period, len(tr_list)):
        atr = (atr * (period - 1) + tr_list[i]) / period
        plus_di_sum = (plus_di_sum * (period - 1) + plus_dm[i]) / period
        minus_di_sum = (minus_di_sum * (period - 1) + minus_dm[i]) / period

        if atr == 0:
            continue
        plus_di = (plus_di_sum / atr) * 100
        minus_di = (minus_di_sum / atr) * 100
        di_sum = plus_di + minus_di
        if di_sum == 0:
            continue
        dx = abs(plus_di - minus_di) / di_sum * 100
        dx_vals.append(dx)

    if len(dx_vals) < period:
        return None

    adx = sum(dx_vals[:period]) / period
    for i in range(period, len(dx_vals)):
        adx = (adx * (period - 1) + dx_vals[i]) / period

    return adx


def calc_ichimoku(highs: List[float], lows: List[float], closes: List[float]):
    """Returns (tenkan, kijun, senkou_a, senkou_b) or None tuple"""
    if len(closes) < 52:
        return None, None, None, None

    tenkan = (max(highs[-9:]) + min(lows[-9:])) / 2
    kijun = (max(highs[-26:]) + min(lows[-26:])) / 2
    senkou_a = (tenkan + kijun) / 2
    senkou_b = (max(highs[-52:]) + min(lows[-52:])) / 2

    return tenkan, kijun, senkou_a, senkou_b


def calc_supertrend(highs: List[float], lows: List[float], closes: List[float],
                    period: int = 10, multiplier: float = 3.0) -> Optional[dict]:
    if len(closes) < period + 1:
        return None

    # ATR
    tr_list = [highs[0] - lows[0]]
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        tr_list.append(tr)

    atr = sum(tr_list[:period]) / period
    for i in range(period, len(tr_list)):
        atr = (atr * (period - 1) + tr_list[i]) / period

    hl2 = (highs[-1] + lows[-1]) / 2
    upper = hl2 + multiplier * atr
    lower = hl2 - multiplier * atr

    # Simple determination
    is_uptrend = closes[-1] > upper if closes[-2] <= upper else closes[-1] > lower

    return {"value": lower if is_uptrend else upper, "direction": "up" if is_uptrend else "down"}


def run_38_checks(candles: List[Dict]) -> Dict:
    """Run all 38 DYOR-style indicator checks on candle data"""
    if not candles or len(candles) < 52:
        return {"checks": [], "bullishCount": 0, "bearishCount": 0, "neutralCount": 0}

    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    price = closes[-1]

    checks = []

    # ─── 1-5: SMA ───
    for period in [10, 25, 50, 100, 200]:
        sma = calc_sma(closes, period)
        if sma is None:
            checks.append({"name": f"SMA({period})", "category": "Moving Averages", "result": "neutral", "value": None})
        else:
            diff_pct = abs(price - sma) / sma * 100 if sma != 0 else 0
            if diff_pct < 0.5:
                result = "neutral"
            elif price > sma:
                result = "buy"
            else:
                result = "sell"
            checks.append({"name": f"SMA({period})", "category": "Moving Averages", "result": result, "value": round(sma, 6)})

    # ─── 6-10: EMA ───
    for period in [10, 25, 50, 100, 200]:
        ema = calc_ema(closes, period)
        if ema is None:
            checks.append({"name": f"EMA({period})", "category": "Moving Averages", "result": "neutral", "value": None})
        else:
            diff_pct = abs(price - ema) / ema * 100 if ema != 0 else 0
            if diff_pct < 0.5:
                result = "neutral"
            elif price > ema:
                result = "buy"
            else:
                result = "sell"
            checks.append({"name": f"EMA({period})", "category": "Moving Averages", "result": result, "value": round(ema, 6)})

    # ─── 11-14: Ichimoku ───
    tenkan, kijun, senkou_a, senkou_b = calc_ichimoku(highs, lows, closes)
    if tenkan is not None:
        checks.append({"name": "Ichimoku Tenkan", "category": "Ichimoku", "result": "buy" if price > tenkan else "sell", "value": round(tenkan, 6)})
        checks.append({"name": "Ichimoku Kijun", "category": "Ichimoku", "result": "buy" if price > kijun else "sell", "value": round(kijun, 6)})
        checks.append({"name": "Ichimoku Senkou A", "category": "Ichimoku", "result": "buy" if price > senkou_a else "sell", "value": round(senkou_a, 6)})
        checks.append({"name": "Ichimoku Senkou B", "category": "Ichimoku", "result": "buy" if price > senkou_b else "sell", "value": round(senkou_b, 6)})
    else:
        for name in ["Ichimoku Tenkan", "Ichimoku Kijun", "Ichimoku Senkou A", "Ichimoku Senkou B"]:
            checks.append({"name": name, "category": "Ichimoku", "result": "neutral", "value": None})

    # ─── 15: ADX ───
    adx = calc_adx(highs, lows, closes)
    if adx is not None:
        checks.append({"name": "ADX(14)", "category": "Oscillators", "result": "buy" if adx > 25 else ("sell" if adx < 20 else "neutral"), "value": round(adx, 2)})
    else:
        checks.append({"name": "ADX(14)", "category": "Oscillators", "result": "neutral", "value": None})

    # ─── 16: MACD ───
    macd_line, signal_line, histogram = calc_macd(closes)
    if histogram is not None:
        checks.append({"name": "MACD(12,26,9)", "category": "Oscillators", "result": "buy" if histogram > 0 else "sell", "value": round(histogram, 6)})
    else:
        checks.append({"name": "MACD(12,26,9)", "category": "Oscillators", "result": "neutral", "value": None})

    # ─── 17: Supertrend ───
    st = calc_supertrend(highs, lows, closes)
    if st:
        checks.append({"name": "Supertrend(10,3)", "category": "Oscillators", "result": "buy" if st["direction"] == "up" else "sell", "value": round(st["value"], 6)})
    else:
        checks.append({"name": "Supertrend(10,3)", "category": "Oscillators", "result": "neutral", "value": None})

    # ─── 18: StochRSI ───
    k_val, d_val = calc_stoch_rsi(closes)
    if k_val is not None:
        if k_val > 80:
            result = "sell"
        elif k_val < 20:
            result = "buy"
        else:
            result = "neutral"
        checks.append({"name": "StochRSI(14)", "category": "Oscillators", "result": result, "value": round(k_val, 2)})
    else:
        checks.append({"name": "StochRSI(14)", "category": "Oscillators", "result": "neutral", "value": None})

    # ─── Pad to 38 checks with SMA/EMA cross variants ───
    # 19-38: SMA cross pairs + EMA cross pairs
    sma_vals = {}
    ema_vals = {}
    for p in [10, 25, 50, 100, 200]:
        sma_vals[p] = calc_sma(closes, p)
        ema_vals[p] = calc_ema(closes, p)

    cross_pairs = [(10, 25), (10, 50), (10, 100), (10, 200), (25, 50),
                   (25, 100), (25, 200), (50, 100), (50, 200), (100, 200)]

    for fast_p, slow_p in cross_pairs:
        fast_sma = sma_vals.get(fast_p)
        slow_sma = sma_vals.get(slow_p)
        if fast_sma is not None and slow_sma is not None:
            result = "buy" if fast_sma > slow_sma else "sell"
        else:
            result = "neutral"
        checks.append({"name": f"SMA({fast_p}/{slow_p}) Cross", "category": "MA Crosses", "result": result, "value": None})

    for fast_p, slow_p in cross_pairs:
        fast_ema = ema_vals.get(fast_p)
        slow_ema = ema_vals.get(slow_p)
        if fast_ema is not None and slow_ema is not None:
            result = "buy" if fast_ema > slow_ema else "sell"
        else:
            result = "neutral"
        checks.append({"name": f"EMA({fast_p}/{slow_p}) Cross", "category": "MA Crosses", "result": result, "value": None})

    # Trim/adjust to exactly 38
    checks = checks[:38]

    bullish = sum(1 for c in checks if c["result"] == "buy")
    bearish = sum(1 for c in checks if c["result"] == "sell")
    neutral = sum(1 for c in checks if c["result"] == "neutral")

    return {
        "checks": checks,
        "bullishCount": bullish,
        "bearishCount": bearish,
        "neutralCount": neutral,
        "score": bullish - bearish,
    }


# ═════════════════════════════════════════════════════════════════════════
# 🌐 API Endpoints
# ═════════════════════════════════════════════════════════════════════════

@rest_router.get("/ohlcv")
async def get_ohlcv(
    exchange: str = Query(default="binance"),
    symbol: str = Query(default="BTCUSDT"),
    timeframe: str = Query(default="1h"),
    limit: int = Query(default=500, le=2000),
):
    """Fetch OHLCV candles from any exchange"""
    try:
        candles = await fetch_ohlcv(exchange, symbol, timeframe, limit)
        return {"success": True, "exchange": exchange, "symbol": symbol,
                "timeframe": timeframe, "count": len(candles), "data": candles}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("OHLCV error: %s", e)
        return {"success": False, "error": str(e)}


@rest_router.get("/tickers")
async def get_tickers(
    exchange: str = Query(default="binance"),
    count: int = Query(default=50, le=500),
):
    """Get top tickers by volume"""
    try:
        tickers = await binance_tickers(count)
        return {"success": True, "exchange": exchange, "count": len(tickers), "data": tickers}
    except Exception as e:
        return {"success": False, "error": str(e)}


@rest_router.get("/top-coins")
async def get_top_coins(
    exchange: str = Query(default="binance"),
    count: int = Query(default=50, le=500),
):
    """Get top N coins by volume"""
    try:
        symbols = await binance_top_symbols(count)
        return {"success": True, "exchange": exchange, "count": len(symbols), "data": symbols}
    except Exception as e:
        return {"success": False, "error": str(e)}


@rest_router.get("/trend-scan")
async def trend_scan(
    exchange: str = Query(default="binance"),
    count: int = Query(default=50, le=200),
    debug: Optional[str] = Query(default=None),
    tf: Optional[str] = Query(default=None),
):
    """Run 38-indicator trend scan (DYOR-style)"""
    try:
        # Debug mode — single symbol, single timeframe
        if debug:
            timeframe = tf or "1h"
            candles = await fetch_ohlcv(exchange, debug, timeframe, 500)
            result = run_38_checks(candles)
            return {
                "success": True,
                "symbol": debug,
                "timeframe": timeframe,
                "exchange": exchange,
                **result,
            }

        # Full scan — multiple symbols, multiple timeframes
        symbols = await binance_top_symbols(count)
        timeframes = ["15m", "1h", "4h", "1d", "1w"]

        results = []
        for symbol in symbols:
            coin_result = {"symbol": symbol, "timeframes": {}}

            # Get ticker data
            tickers = await binance_tickers(count)
            ticker_data = next((t for t in tickers if t["symbol"] == symbol), None)

            if ticker_data:
                coin_result["name"] = symbol.replace("USDT", "")
                coin_result["price"] = ticker_data["last"]
                coin_result["change24h"] = ticker_data["change24h"]
                coin_result["high24h"] = ticker_data["high"]
                coin_result["low24h"] = ticker_data["low"]
                coin_result["volume24h"] = ticker_data["quoteVolume"]

            # Run checks for each timeframe
            tasks = []
            for tfr in timeframes:
                tasks.append(fetch_ohlcv(exchange, symbol, tfr, 500))

            candle_results = await asyncio.gather(*tasks, return_exceptions=True)

            for tfr, candle_data in zip(timeframes, candle_results):
                if isinstance(candle_data, Exception):
                    coin_result["timeframes"][tfr] = {
                        "bullishCount": 0, "bearishCount": 0, "neutralCount": 0,
                        "bullishScore": 0, "bearishScore": 0, "score": 0
                    }
                else:
                    check_result = run_38_checks(candle_data)
                    total = check_result["bullishCount"] + check_result["bearishCount"] + check_result["neutralCount"]
                    coin_result["timeframes"][tfr] = {
                        "bullishCount": check_result["bullishCount"],
                        "bearishCount": check_result["bearishCount"],
                        "neutralCount": check_result["neutralCount"],
                        "bullishScore": round(check_result["bullishCount"] / max(total, 1) * 100, 1),
                        "bearishScore": round(check_result["bearishCount"] / max(total, 1) * 100, 1),
                        "score": check_result["score"],
                    }

            results.append(coin_result)

        return {"success": True, "exchange": exchange, "count": len(results), "results": results}

    except Exception as e:
        logger.error("Trend scan error: %s", e)
        return {"success": False, "error": str(e)}


@rest_router.get("/rsi-heatmap")
async def rsi_heatmap(
    exchange: str = Query(default="binance"),
    top: int = Query(default=50, le=200),
    timeframe: str = Query(default="all"),
):
    """RSI heatmap data — multiple timeframes, multiple exchanges"""
    try:
        ck = f"rsi_heatmap:{exchange}:{top}:{timeframe}"
        cached = cache.get(ck, config.RSI_HEATMAP_CACHE_TTL)
        if cached is not None:
            return cached

        symbols = await binance_top_symbols(top)
        tickers = await binance_tickers(top)
        timeframes = ["15m", "1h", "4h", "1d", "1w"] if timeframe == "all" else [timeframe]

        results = []
        for sym in symbols:
            ticker = next((t for t in tickers if t["symbol"] == sym), None)
            rsi_map = {}

            tasks = [fetch_ohlcv(exchange, sym, tf_i, 500) for tf_i in timeframes]
            candle_data = await asyncio.gather(*tasks, return_exceptions=True)

            tf_label_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "24h", "1w": "7d"}
            for tf_i, cd in zip(timeframes, candle_data):
                if isinstance(cd, Exception) or not cd:
                    rsi_map[tf_label_map.get(tf_i, tf_i)] = None
                else:
                    closes = [c["close"] for c in cd]
                    rsi_val = calc_rsi(closes)
                    rsi_map[tf_label_map.get(tf_i, tf_i)] = round(rsi_val, 2) if rsi_val is not None else None

            results.append({
                "symbol": sym,
                "name": sym.replace("USDT", ""),
                "price": ticker["last"] if ticker else 0,
                "volume24h": ticker["quoteVolume"] if ticker else 0,
                "turnover24h": ticker["quoteVolume"] if ticker else 0,
                "price24hPcnt": (ticker["change24h"] / 100) if ticker else 0,
                "rsi": rsi_map,
            })

        resp = {"success": True, "timeframe": timeframe, "count": len(results), "data": results}
        cache.set(ck, resp)
        return resp

    except Exception as e:
        logger.error("RSI heatmap error: %s", e)
        return {"success": False, "error": str(e)}


@rest_router.get("/macd-heatmap")
async def macd_heatmap(
    exchange: str = Query(default="binance"),
    top: int = Query(default=50, le=200),
    timeframe: str = Query(default="all"),
):
    """MACD heatmap data — multiple timeframes"""
    try:
        ck = f"macd_heatmap:{exchange}:{top}:{timeframe}"
        cached = cache.get(ck, config.MACD_HEATMAP_CACHE_TTL)
        if cached is not None:
            return cached

        symbols = await binance_top_symbols(top)
        tickers = await binance_tickers(top)
        timeframes = ["15m", "1h", "4h", "1d", "1w"] if timeframe == "all" else [timeframe]

        results = []
        for sym in symbols:
            ticker = next((t for t in tickers if t["symbol"] == sym), None)
            macd_map = {}

            tasks = [fetch_ohlcv(exchange, sym, tf_i, 500) for tf_i in timeframes]
            candle_data = await asyncio.gather(*tasks, return_exceptions=True)

            tf_label_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "24h", "1w": "7d"}
            for tf_i, cd in zip(timeframes, candle_data):
                if isinstance(cd, Exception) or not cd:
                    macd_map[tf_label_map.get(tf_i, tf_i)] = None
                else:
                    closes = [c["close"] for c in cd]
                    _, _, histogram = calc_macd(closes)
                    macd_map[tf_label_map.get(tf_i, tf_i)] = round(histogram, 6) if histogram is not None else None

            results.append({
                "symbol": sym,
                "name": sym.replace("USDT", ""),
                "price": ticker["last"] if ticker else 0,
                "volume24h": ticker["quoteVolume"] if ticker else 0,
                "turnover24h": ticker["quoteVolume"] if ticker else 0,
                "price24hPcnt": (ticker["change24h"] / 100) if ticker else 0,
                "macd": macd_map,
            })

        resp = {"success": True, "timeframe": timeframe, "count": len(results), "data": results}
        cache.set(ck, resp)
        return resp

    except Exception as e:
        logger.error("MACD heatmap error: %s", e)
        return {"success": False, "error": str(e)}


@rest_router.get("/fibonacci")
async def fibonacci_scan(
    exchange: str = Query(default="binance"),
    symbol: str = Query(default="BTCUSDT"),
    timeframes: str = Query(default="1h,4h,1d"),
    count: int = Query(default=50, le=200),
    proximity: float = Query(default=2.0),
):
    """Fibonacci retracement scanner"""
    try:
        tf_list = [t.strip() for t in timeframes.split(",")]
        symbols = await binance_top_symbols(count)

        results = []
        for sym in symbols:
            sym_result = {"symbol": sym, "name": sym.replace("USDT", ""), "timeframes": {}}

            for tf in tf_list:
                try:
                    candles = await fetch_ohlcv(exchange, sym, tf, 500)
                    if not candles:
                        continue

                    highs = [c["high"] for c in candles]
                    lows = [c["low"] for c in candles]
                    closes = [c["close"] for c in candles]
                    price = closes[-1]

                    high = max(highs)
                    low = min(lows)
                    diff = high - low

                    levels = {
                        "0.0": high,
                        "0.236": high - diff * 0.236,
                        "0.382": high - diff * 0.382,
                        "0.5": high - diff * 0.5,
                        "0.618": high - diff * 0.618,
                        "0.786": high - diff * 0.786,
                        "1.0": low,
                    }

                    near_levels = []
                    for name, level in levels.items():
                        dist_pct = abs(price - level) / level * 100 if level != 0 else 999
                        if dist_pct <= proximity:
                            near_levels.append({
                                "level": name,
                                "price": round(level, 6),
                                "distance": round(dist_pct, 2),
                                "direction": "above" if price > level else "below",
                            })

                    sym_result["timeframes"][tf] = {
                        "price": price,
                        "high": high,
                        "low": low,
                        "levels": levels,
                        "nearLevels": near_levels,
                    }
                except Exception:
                    pass

            if sym_result["timeframes"]:
                results.append(sym_result)

        return {"success": True, "exchange": exchange, "count": len(results), "results": results}

    except Exception as e:
        logger.error("Fibonacci error: %s", e)
        return {"success": False, "error": str(e)}
