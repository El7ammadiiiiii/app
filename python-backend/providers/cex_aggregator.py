"""
🌍 Central File 3 — cex_aggregator.py
cryptofeed-based aggregator for 36+ exchanges.

Feeds: cryptocurrencies page with live prices from all exchanges.
Endpoints:
  GET /api/aggregator/markets
  GET /api/aggregator/exchanges
  WS  /ws/aggregator/prices
"""

import asyncio
import logging
import time
from typing import Optional, Dict, List, Any, Set

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

import config

logger = logging.getLogger("cex_aggregator")
aggregator_router = APIRouter()

# ═════════════════════════════════════════════════════════════════════════
# 🔧 State — aggregated market data
# ═════════════════════════════════════════════════════════════════════════

# Aggregated prices: symbol -> {exchange -> price_data}
_agg_prices: Dict[str, Dict[str, Dict]] = {}
# Last known aggregated market data
_markets_cache: Optional[Dict] = None
_markets_cache_ts: float = 0
_http: Optional[httpx.AsyncClient] = None
_bg_tasks: List[asyncio.Task] = []
_ws_clients: Set[WebSocket] = set()

# Whether cryptofeed is available
_cryptofeed_available = False


# ═════════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═════════════════════════════════════════════════════════════════════════

async def init_aggregator():
    global _http, _cryptofeed_available
    _http = httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(max_connections=50))

    # Try to import cryptofeed
    try:
        import cryptofeed
        _cryptofeed_available = True
        _cf_ver = getattr(cryptofeed, '__version__', getattr(cryptofeed, 'VERSION', 'unknown'))
        logger.info("✅ cryptofeed available (v%s) — starting aggregator feeds", _cf_ver)
        _bg_tasks.append(asyncio.create_task(_run_cryptofeed()))
    except ImportError:
        _cryptofeed_available = False
        logger.warning("⚠️ cryptofeed not installed — using REST polling fallback")
        _bg_tasks.append(asyncio.create_task(_rest_polling_loop()))


async def shutdown_aggregator():
    global _http
    for task in _bg_tasks:
        task.cancel()
    _bg_tasks.clear()
    if _http:
        await _http.aclose()
        _http = None
    logger.info("🛑 Aggregator shutdown")


# ═════════════════════════════════════════════════════════════════════════
# 📡 Cryptofeed Integration
# ═════════════════════════════════════════════════════════════════════════

async def _run_cryptofeed():
    """Start cryptofeed with TICKER channel on multiple exchanges"""
    try:
        from cryptofeed import FeedHandler
        from cryptofeed.defines import TICKER

        def _normalize_cryptofeed_symbol(sym: str) -> str:
            """Convert symbols like BTCUSDT -> BTC-USDT (best-effort)."""
            s = (sym or "").upper().replace("/", "").replace("-", "")
            if s.endswith("USDT") and len(s) > 4:
                base = s[:-4]
                return f"{base}-USDT"
            return sym

        def _resolve_exchange_classes():
            """Resolve config.AGGREGATOR_EXCHANGES -> cryptofeed Exchange classes safely."""
            try:
                from cryptofeed import exchanges as cf_exchanges
            except Exception as e:
                logger.error("Failed to import cryptofeed.exchanges: %s", e)
                return [], [*config.AGGREGATOR_EXCHANGES]

            # Config uses uppercase names; cryptofeed uses class names.
            # Provide multiple candidates for tricky ones.
            candidates = {
                "BINANCE": ["Binance"],
                "BYBIT": ["Bybit"],
                "OKX": ["OKX"],
                "COINBASE": ["Coinbase"],
                "KRAKEN": ["Kraken"],
                "KUCOIN": ["KuCoin", "Kucoin"],
                "GATEIO": ["Gateio", "GateIO", "GateIo"],
                "BITGET": ["Bitget"],
                "BITFINEX": ["Bitfinex"],
                "GEMINI": ["Gemini"],
                "BITSTAMP": ["Bitstamp"],
                "MEXC": ["MEXC", "Mexc"],
                "BINGX": ["BingX", "Bingx"],
                "PHEMEX": ["Phemex"],
                # HTX was historically Huobi in some libs; try both.
                "HTX": ["HTX", "Huobi"],
            }

            resolved = []
            missing = []
            for name in (config.AGGREGATOR_EXCHANGES or []):
                key = (name or "").upper()
                cand = candidates.get(key) or [key.title()]
                found = None
                for attr in cand:
                    if hasattr(cf_exchanges, attr):
                        found = getattr(cf_exchanges, attr)
                        break
                if found is None:
                    missing.append(name)
                    continue
                resolved.append(found)

            return resolved, missing

        # Top symbols to track
        symbols = [_normalize_cryptofeed_symbol(s) for s in (config.TOP_SYMBOLS or [])]
        symbols = [s for s in symbols if isinstance(s, str) and s]

        exchange_classes, missing_exchanges = _resolve_exchange_classes()
        if missing_exchanges:
            logger.warning(
                "⚠️ Some configured aggregator exchanges are not available in cryptofeed: %s",
                ", ".join(missing_exchanges),
            )
        if not exchange_classes:
            raise RuntimeError("No cryptofeed exchanges resolved from config.AGGREGATOR_EXCHANGES")

        async def on_ticker(ticker, receipt_timestamp):
            exchange = ticker.exchange.lower()
            sym = ticker.symbol.replace("-", "").replace("/", "")
            if sym not in _agg_prices:
                _agg_prices[sym] = {}
            _agg_prices[sym][exchange] = {
                "price": float(ticker.bid + ticker.ask) / 2 if ticker.bid and ticker.ask else 0,
                "bid": float(ticker.bid) if ticker.bid else 0,
                "ask": float(ticker.ask) if ticker.ask else 0,
                "timestamp": int(receipt_timestamp * 1000),
            }

        fh = FeedHandler()

        for ExchangeClass in exchange_classes:
            try:
                # Not all exchanges support all symbols
                fh.add_feed(ExchangeClass(
                    symbols=symbols[:10],  # Start with top 10 for stability
                    channels=[TICKER],
                    callbacks={TICKER: on_ticker}
                ))
                logger.info("Added %s to cryptofeed", ExchangeClass.__name__)
            except Exception as e:
                logger.warning("Failed to add %s: %s", ExchangeClass.__name__, e)

        logger.info("🌍 Starting cryptofeed with %d exchanges", len(exchange_classes))
        fh.run(start_loop=False)

    except Exception as e:
        logger.error("Cryptofeed failed: %s — falling back to REST polling", e)
        _bg_tasks.append(asyncio.create_task(_rest_polling_loop()))


# ═════════════════════════════════════════════════════════════════════════
# 🔄 REST Polling Fallback (when cryptofeed is not installed)
# ═════════════════════════════════════════════════════════════════════════

async def _rest_polling_loop():
    """Poll multiple exchanges via REST every 30 seconds as fallback"""
    while True:
        try:
            await _poll_binance()
            await _poll_bybit_tickers()
            await _poll_okx_tickers()
            logger.debug("REST polling cycle complete, %d symbols tracked", len(_agg_prices))
        except Exception as e:
            logger.warning("REST polling error: %s", e)
        await asyncio.sleep(30)


async def _poll_binance():
    """Poll Binance 24hr tickers"""
    try:
        resp = await _http.get(f"{config.BINANCE_REST_URL}/api/v3/ticker/24hr")
        resp.raise_for_status()
        for t in resp.json():
            sym = t.get("symbol", "")
            if not sym.endswith("USDT"):
                continue
            if any(x in sym for x in ["UPUSDT", "DOWNUSDT", "BULLUSDT", "BEARUSDT"]):
                continue
            if sym not in _agg_prices:
                _agg_prices[sym] = {}
            _agg_prices[sym]["binance"] = {
                "price": float(t.get("lastPrice", 0)),
                "bid": float(t.get("bidPrice", 0)),
                "ask": float(t.get("askPrice", 0)),
                "high": float(t.get("highPrice", 0)),
                "low": float(t.get("lowPrice", 0)),
                "volume": float(t.get("volume", 0)),
                "quoteVolume": float(t.get("quoteVolume", 0)),
                "change24h": float(t.get("priceChangePercent", 0)),
                "timestamp": int(time.time() * 1000),
            }
    except Exception as e:
        logger.warning("Binance poll failed: %s", e)


async def _poll_bybit_tickers():
    """Poll Bybit tickers"""
    try:
        resp = await _http.get(f"{config.BYBIT_REST_URL}/v5/market/tickers", params={"category": "spot"})
        resp.raise_for_status()
        data = resp.json().get("result", {}).get("list", [])
        for t in data:
            sym = t.get("symbol", "")
            if not sym.endswith("USDT"):
                continue
            if sym not in _agg_prices:
                _agg_prices[sym] = {}
            _agg_prices[sym]["bybit"] = {
                "price": float(t.get("lastPrice", 0)),
                "bid": float(t.get("bid1Price", 0)),
                "ask": float(t.get("ask1Price", 0)),
                "high": float(t.get("highPrice24h", 0)),
                "low": float(t.get("lowPrice24h", 0)),
                "volume": float(t.get("volume24h", 0)),
                "quoteVolume": float(t.get("turnover24h", 0)),
                "change24h": float(t.get("price24hPcnt", 0)) * 100,
                "timestamp": int(time.time() * 1000),
            }
    except Exception as e:
        logger.warning("Bybit poll failed: %s", e)


async def _poll_okx_tickers():
    """Poll OKX tickers"""
    try:
        resp = await _http.get(f"{config.OKX_REST_URL}/api/v5/market/tickers", params={"instType": "SPOT"})
        resp.raise_for_status()
        for t in resp.json().get("data", []):
            inst_id = t.get("instId", "")
            if not inst_id.endswith("-USDT"):
                continue
            sym = inst_id.replace("-USDT", "USDT")
            if sym not in _agg_prices:
                _agg_prices[sym] = {}
            _agg_prices[sym]["okx"] = {
                "price": float(t.get("last", 0)),
                "bid": float(t.get("bidPx", 0)),
                "ask": float(t.get("askPx", 0)),
                "high": float(t.get("high24h", 0)),
                "low": float(t.get("low24h", 0)),
                "volume": float(t.get("vol24h", 0)),
                "quoteVolume": float(t.get("volCcy24h", 0)),
                "timestamp": int(time.time() * 1000),
            }
    except Exception as e:
        logger.warning("OKX poll failed: %s", e)


# ═════════════════════════════════════════════════════════════════════════
# 🌐 API Endpoints
# ═════════════════════════════════════════════════════════════════════════

def _build_market_entry(symbol: str, exchange_data: Dict[str, Dict]) -> Dict:
    """Build aggregated market entry from multiple exchanges"""
    # Use Binance as primary, fallback to others
    primary = exchange_data.get("binance") or next(iter(exchange_data.values()), {})

    prices = [d["price"] for d in exchange_data.values() if d.get("price", 0) > 0]
    avg_price = sum(prices) / len(prices) if prices else 0

    volumes = [d.get("quoteVolume", 0) for d in exchange_data.values()]
    total_volume = sum(v for v in volumes if v)

    raw_symbol = symbol
    base_symbol = symbol.replace("USDT", "") if symbol.endswith("USDT") else symbol
    current_price = avg_price or primary.get("price", 0)

    # Frontend compatibility: CryptoTable expects id/price fields similar to CoinGecko.
    # We keep both the original aggregator fields and the aliases.
    return {
        "id": (raw_symbol or "").lower() or base_symbol.lower(),
        "symbol": base_symbol,
        "pair_symbol": raw_symbol,
        "name": base_symbol,
        "price": current_price,
        "current_price": current_price,
        "high_24h": primary.get("high", 0),
        "low_24h": primary.get("low", 0),
        "price_change_24h": primary.get("change24h", 0),
        "price_change_percentage_24h": primary.get("change24h", 0),
        "total_volume": total_volume,
        "market_cap": 0,  # Not available from exchange data
        "exchanges": list(exchange_data.keys()),
        "exchange_count": len(exchange_data),
        "timestamp": int(time.time() * 1000),
    }


@aggregator_router.get("/markets")
async def get_markets(
    limit: int = Query(default=500, le=2000),
    sort: str = Query(default="volume"),
):
    """Aggregated market data from all exchanges — replaces static JSON"""
    global _markets_cache, _markets_cache_ts

    # Use cache if fresh
    if _markets_cache and time.time() - _markets_cache_ts < 15:
        data = _markets_cache["data"][:limit]
        return {**_markets_cache, "count": len(data), "data": data}

    markets = []
    for symbol, exchange_data in _agg_prices.items():
        if not exchange_data:
            continue
        entry = _build_market_entry(symbol, exchange_data)
        if entry["current_price"] > 0:
            markets.append(entry)

    # Sort
    if sort == "volume":
        markets.sort(key=lambda x: x.get("total_volume", 0), reverse=True)
    elif sort == "change":
        markets.sort(key=lambda x: x.get("price_change_percentage_24h", 0), reverse=True)
    else:
        markets.sort(key=lambda x: x.get("total_volume", 0), reverse=True)

    result = {
        "success": True,
        "count": len(markets[:limit]),
        "total": len(markets),
        "source": "cryptofeed" if _cryptofeed_available else "rest-polling",
        "exchanges_active": list(set(ex for m in markets for ex in m.get("exchanges", []))),
        "data": markets[:limit],
        "timestamp": int(time.time() * 1000),
    }

    _markets_cache = {**result, "data": markets}
    _markets_cache_ts = time.time()

    return result


@aggregator_router.get("/exchanges")
async def get_exchanges():
    """List of active exchanges with data"""
    active = set()
    for exchange_data in _agg_prices.values():
        active.update(exchange_data.keys())

    configured = [str(x) for x in (config.AGGREGATOR_EXCHANGES or []) if x]

    supported = []
    missing = []
    if _cryptofeed_available:
        try:
            from cryptofeed import exchanges as cf_exchanges

            # Attempt the same resolution logic used at runtime (best-effort).
            # Keep it lightweight here; if it fails, we still return active/configured.
            name_to_candidates = {
                "BINANCE": ["Binance"],
                "BYBIT": ["Bybit"],
                "OKX": ["OKX"],
                "COINBASE": ["Coinbase"],
                "KRAKEN": ["Kraken"],
                "KUCOIN": ["KuCoin", "Kucoin"],
                "GATEIO": ["Gateio", "GateIO", "GateIo"],
                "BITGET": ["Bitget"],
                "BITFINEX": ["Bitfinex"],
                "GEMINI": ["Gemini"],
                "BITSTAMP": ["Bitstamp"],
                "MEXC": ["MEXC", "Mexc"],
                "BINGX": ["BingX", "Bingx"],
                "PHEMEX": ["Phemex"],
                "HTX": ["HTX", "Huobi"],
            }

            for name in configured:
                key = name.upper()
                cand = name_to_candidates.get(key) or [key.title()]
                found = None
                for attr in cand:
                    if hasattr(cf_exchanges, attr):
                        found = attr
                        break
                if found is None:
                    missing.append(name)
                else:
                    supported.append(name)
        except Exception as e:
            logger.debug("Could not compute supported exchanges list: %s", e)

    return {
        "success": True,
        "count": len(active),
        "exchanges": sorted(active),
        "configured": configured,
        "supported": supported,
        "missing": missing,
        "cryptofeed": _cryptofeed_available,
    }


@aggregator_router.get("/symbol/{symbol}")
async def get_symbol(symbol: str):
    """Get detailed cross-exchange data for a specific symbol"""
    sym = symbol.upper()
    if sym not in _agg_prices:
        return {"success": False, "error": f"Symbol {sym} not found"}

    exchange_data = _agg_prices[sym]
    entry = _build_market_entry(sym, exchange_data)
    entry["exchanges_detail"] = exchange_data

    return {"success": True, "data": entry}


@aggregator_router.websocket("/stream/markets")
async def ws_markets(websocket: WebSocket):
    """WebSocket for live market updates"""
    await websocket.accept()
    _ws_clients.add(websocket)
    last_sent: Dict[str, float] = {}
    try:
        while True:
            await asyncio.sleep(2)
            updates = {}
            for sym, exchange_data in _agg_prices.items():
                primary = exchange_data.get("binance") or next(iter(exchange_data.values()), {})
                price = primary.get("price", 0)
                if price and (sym not in last_sent or last_sent[sym] != price):
                    updates[sym] = _build_market_entry(sym, exchange_data)
                    last_sent[sym] = price

            if updates:
                await websocket.send_json({
                    "type": "market_update",
                    "count": len(updates),
                    "data": updates,
                })
    except WebSocketDisconnect:
        _ws_clients.discard(websocket)
    except Exception:
        _ws_clients.discard(websocket)
