"""
🚀 FastAPI Backend — Central Exchange Data Server
Port 8000 — Serves all exchange data to Next.js frontend (port 3001)

Central Files:
  File 1 → providers/cex_rest.py   — 15 REST exchanges (python-binance primary)
  File 2 → providers/cex_ws.py     — 6 WebSocket exchanges (Binance WS primary)
  File 3 → providers/cex_aggregator.py — cryptofeed 36+ exchanges
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from providers.cex_rest import rest_router, init_rest_provider, shutdown_rest_provider
from providers.cex_ws import ws_router, init_ws_provider, shutdown_ws_provider
from providers.cex_aggregator import aggregator_router, init_aggregator, shutdown_aggregator

# ─── Logging ───
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("main")


# ─── Lifespan ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown hooks"""
    logger.info("🚀 Starting FastAPI backend on port %s", config.PORT)
    await init_rest_provider()
    await init_ws_provider()
    await init_aggregator()
    logger.info("✅ All providers initialized")
    yield
    logger.info("🛑 Shutting down...")
    await shutdown_rest_provider()
    await shutdown_ws_provider()
    await shutdown_aggregator()
    logger.info("✅ Shutdown complete")


# ─── App ───
app = FastAPI(
    title="Nexus Exchange Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health ───
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "exchanges": {
        "rest": len(config.REST_EXCHANGES),
        "ws": len(config.WS_EXCHANGES),
        "aggregator": len(config.AGGREGATOR_EXCHANGES),
    }}

# ─── Mount Routers ───
app.include_router(rest_router, prefix="/api/rest", tags=["REST - File 1"])
app.include_router(ws_router, prefix="/api/ws", tags=["WebSocket - File 2"])
app.include_router(aggregator_router, prefix="/api/aggregator", tags=["Aggregator - File 3"])


# ─── Run ───
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
