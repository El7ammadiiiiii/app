"""
📡 Central File 2 — cex_ws.py
6 WebSocket exchanges with Binance WS as PRIMARY source.

Feeds: macd-heatmap, rsi-heatmap, orderbook-heatmap, fibonacci-scanner, divergence-scanner
Endpoints:
  WS  /ws/orderbook-heatmap
  WS  /ws/prices
  GET /api/ws/orderbook (REST fallback)
"""

import asyncio
import json
import logging
import time
from typing import Optional, Dict, List, Any, Set
from collections import defaultdict

import httpx
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

import config

logger = logging.getLogger("cex_ws")
ws_router = APIRouter()

# ═════════════════════════════════════════════════════════════════════════
# 🔧 State
# ═════════════════════════════════════════════════════════════════════════

# Latest orderbook snapshots
_orderbooks: Dict[str, Dict] = {}  # key: "exchange:symbol"
# Latest price tickers from WS
_ws_tickers: Dict[str, Dict] = {}  # key: "exchange:symbol"
# Connected WebSocket clients
_clients: Set[WebSocket] = set()
# Background tasks
_bg_tasks: List[asyncio.Task] = []
_http: Optional[httpx.AsyncClient] = None


# ═════════════════════════════════════════════════════════════════════════
# 🚀 Lifecycle
# ═════════════════════════════════════════════════════════════════════════

async def init_ws_provider():
    global _http
    _http = httpx.AsyncClient(timeout=30.0)
    logger.info("✅ WS provider initialized (primary: Binance WS, 6 exchanges)")
    # Start background WebSocket connections
    _bg_tasks.append(asyncio.create_task(_binance_ws_loop()))
    _bg_tasks.append(asyncio.create_task(_bybit_ws_loop()))


async def shutdown_ws_provider():
    global _http
    for task in _bg_tasks:
        task.cancel()
    _bg_tasks.clear()
    if _http:
        await _http.aclose()
        _http = None
    logger.info("🛑 WS provider shutdown")


# ═════════════════════════════════════════════════════════════════════════
# 🟡 BINANCE WebSocket — PRIMARY
# ═════════════════════════════════════════════════════════════════════════

async def _binance_ws_loop():
    """Connect to Binance !ticker@arr stream for all USDT pairs"""
    url = f"{config.BINANCE_WS_URL}!ticker@arr"
    while True:
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                logger.info("🟡 Binance WS connected: !ticker@arr")
                async for msg in ws:
                    try:
                        data = json.loads(msg)
                        for t in data:
                            if not t.get("s", "").endswith("USDT"):
                                continue
                            sym = t["s"]
                            _ws_tickers[f"binance:{sym}"] = {
                                "symbol": sym,
                                "last": float(t.get("c", 0)),
                                "high": float(t.get("h", 0)),
                                "low": float(t.get("l", 0)),
                                "volume": float(t.get("v", 0)),
                                "quoteVolume": float(t.get("q", 0)),
                                "change24h": float(t.get("P", 0)),
                                "timestamp": int(t.get("E", time.time() * 1000)),
                            }
                    except Exception as e:
                        logger.debug("Binance WS parse error: %s", e)
        except Exception as e:
            logger.warning("Binance WS disconnected: %s — reconnecting in 5s", e)
            await asyncio.sleep(5)


async def _binance_orderbook(symbol: str, limit: int = 20) -> Dict:
    """Fetch orderbook via REST (WS orderbook requires separate stream per symbol)"""
    url = f"{config.BINANCE_REST_URL}/api/v3/depth"
    resp = await _http.get(url, params={"symbol": symbol, "limit": limit})
    resp.raise_for_status()
    data = resp.json()
    return {
        "exchange": "binance",
        "symbol": symbol,
        "bids": [[float(b[0]), float(b[1])] for b in data.get("bids", [])],
        "asks": [[float(a[0]), float(a[1])] for a in data.get("asks", [])],
        "timestamp": int(time.time() * 1000),
    }


# ═════════════════════════════════════════════════════════════════════════
# 🟠 BYBIT WebSocket
# ═════════════════════════════════════════════════════════════════════════

async def _bybit_ws_loop():
    """Connect to Bybit tickers stream"""
    url = config.BYBIT_WS_URL
    while True:
        try:
            async with websockets.connect(url, ping_interval=20) as ws:
                await ws.send(json.dumps({"op": "subscribe", "args": ["tickers.BTCUSDT", "tickers.ETHUSDT", "tickers.SOLUSDT"]}))
                logger.info("🟠 Bybit WS connected")
                async for msg in ws:
                    try:
                        data = json.loads(msg)
                        if data.get("topic", "").startswith("tickers."):
                            d = data.get("data", {})
                            sym = d.get("symbol", "")
                            if sym:
                                _ws_tickers[f"bybit:{sym}"] = {
                                    "symbol": sym,
                                    "last": float(d.get("lastPrice", 0)),
                                    "high": float(d.get("highPrice24h", 0)),
                                    "low": float(d.get("lowPrice24h", 0)),
                                    "volume": float(d.get("volume24h", 0)),
                                    "quoteVolume": float(d.get("turnover24h", 0)),
                                    "change24h": float(d.get("price24hPcnt", 0)) * 100,
                                    "timestamp": int(time.time() * 1000),
                                }
                    except Exception as e:
                        logger.debug("Bybit WS parse error: %s", e)
        except Exception as e:
            logger.warning("Bybit WS disconnected: %s — reconnecting in 5s", e)
            await asyncio.sleep(5)


async def _bybit_orderbook(symbol: str, limit: int = 50) -> Dict:
    url = f"{config.BYBIT_REST_URL}/v5/market/orderbook"
    resp = await _http.get(url, params={"category": "spot", "symbol": symbol, "limit": limit})
    resp.raise_for_status()
    data = resp.json().get("result", {})
    return {
        "exchange": "bybit",
        "symbol": symbol,
        "bids": [[float(b[0]), float(b[1])] for b in data.get("b", [])],
        "asks": [[float(a[0]), float(a[1])] for a in data.get("a", [])],
        "timestamp": int(data.get("ts", time.time() * 1000)),
    }


# ═════════════════════════════════════════════════════════════════════════
# 🔵 OKX — REST fallback for orderbook
# ═════════════════════════════════════════════════════════════════════════

async def _okx_orderbook(symbol: str, limit: int = 50) -> Dict:
    inst_id = symbol.replace("USDT", "-USDT")
    url = f"{config.OKX_REST_URL}/api/v5/market/books"
    resp = await _http.get(url, params={"instId": inst_id, "sz": str(min(limit, 400))})
    resp.raise_for_status()
    data = resp.json().get("data", [{}])[0]
    return {
        "exchange": "okx",
        "symbol": symbol,
        "bids": [[float(b[0]), float(b[1])] for b in data.get("bids", [])],
        "asks": [[float(a[0]), float(a[1])] for a in data.get("asks", [])],
        "timestamp": int(data.get("ts", time.time() * 1000)),
    }


# ═════════════════════════════════════════════════════════════════════════
# 🌐 API Endpoints
# ═════════════════════════════════════════════════════════════════════════

@ws_router.get("/orderbook")
async def get_orderbook(
    symbol: str = Query(default="BTCUSDT"),
    exchanges: str = Query(default="binance,bybit,okx"),
    limit: int = Query(default=50, le=200),
):
    """Aggregated orderbook from multiple exchanges"""
    try:
        exchange_list = [e.strip() for e in exchanges.split(",")]
        fetchers = {
            "binance": _binance_orderbook,
            "bybit": _bybit_orderbook,
            "okx": _okx_orderbook,
        }

        tasks = []
        for ex in exchange_list:
            if ex in fetchers:
                tasks.append(fetchers[ex](symbol, limit))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        orderbooks = []
        for r in results:
            if not isinstance(r, Exception):
                orderbooks.append(r)

        # Merge bids/asks across exchanges
        all_bids = []
        all_asks = []
        for ob in orderbooks:
            for b in ob["bids"]:
                all_bids.append({"price": b[0], "amount": b[1], "exchange": ob["exchange"]})
            for a in ob["asks"]:
                all_asks.append({"price": a[0], "amount": a[1], "exchange": ob["exchange"]})

        all_bids.sort(key=lambda x: x["price"], reverse=True)
        all_asks.sort(key=lambda x: x["price"])

        return {
            "success": True,
            "symbol": symbol,
            "exchanges": [ob["exchange"] for ob in orderbooks],
            "bids": all_bids[:limit],
            "asks": all_asks[:limit],
            "timestamp": int(time.time() * 1000),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@ws_router.get("/live-tickers")
async def get_live_tickers(exchange: str = Query(default="binance"), limit: int = Query(default=50)):
    """Get latest WS tickers"""
    prefix = f"{exchange}:"
    tickers = [v for k, v in _ws_tickers.items() if k.startswith(prefix)]
    tickers.sort(key=lambda x: x.get("quoteVolume", 0), reverse=True)
    return {"success": True, "exchange": exchange, "count": len(tickers[:limit]), "data": tickers[:limit]}


# ─── WebSocket endpoint for real-time orderbook ───
@ws_router.websocket("/stream/orderbook")
async def ws_orderbook(websocket: WebSocket):
    await websocket.accept()
    _clients.add(websocket)
    try:
        while True:
            # Client sends subscribe messages like {"symbol": "BTCUSDT", "exchanges": ["binance", "bybit"]}
            msg = await websocket.receive_text()
            data = json.loads(msg)
            symbol = data.get("symbol", "BTCUSDT")
            exchanges = data.get("exchanges", ["binance"])

            # Fetch and send orderbook
            fetchers = {"binance": _binance_orderbook, "bybit": _bybit_orderbook, "okx": _okx_orderbook}
            tasks = [fetchers[ex](symbol) for ex in exchanges if ex in fetchers]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            response = []
            for r in results:
                if not isinstance(r, Exception):
                    response.append(r)

            await websocket.send_json({"type": "orderbook", "data": response})
    except WebSocketDisconnect:
        _clients.discard(websocket)
    except Exception:
        _clients.discard(websocket)


# ─── WebSocket endpoint for real-time ticker prices ───
@ws_router.websocket("/stream/prices")
async def ws_prices(websocket: WebSocket):
    await websocket.accept()
    last_sent = {}
    try:
        while True:
            # Send latest tickers every second
            await asyncio.sleep(1)
            updates = {}
            for key, ticker in _ws_tickers.items():
                if key not in last_sent or last_sent[key] != ticker.get("last"):
                    updates[key] = ticker
                    last_sent[key] = ticker.get("last")

            if updates:
                await websocket.send_json({"type": "tickers", "count": len(updates), "data": updates})
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
