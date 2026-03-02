"""
CCWAYS API Routes — White-Label Intelligence Gateway

All endpoints under /ccways/. Responses are fully sanitized — zero upstream traces.
"""

import asyncio
import logging
from typing import List, Optional

import aiohttp
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from providers.ccways_gateway import CCWaysGateway
from providers.ccways_sanitizer import (
    resolve_asset_url,
    sanitize_error,
    sanitize_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ccways", tags=["CCWAYS Intelligence"])

# ─── singleton gateway (initialized on first request) ──────────────────────
_gateway: Optional[CCWaysGateway] = None


async def _get_gateway() -> CCWaysGateway:
    global _gateway
    if _gateway is None:
        _gateway = CCWaysGateway()
        await _gateway.initialize()
    return _gateway


# ═══════════════════════════════════════════════════════════════════════════════
# Request models
# ═══════════════════════════════════════════════════════════════════════════════


class ExpandRequest(BaseModel):
    address: str = Field(..., description="Target address to expand")
    nodeId: str = Field(..., description="Parent node ID in the graph")
    direction: str = Field("both", description="'in', 'out', 'left', 'right', 'both'")
    chains: Optional[List[str]] = Field(None, description="Filter by chains")
    limit: int = Field(100, ge=1, le=500, description="Max counterparties")


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/chains")
async def get_chains():
    """Get all supported chains (93+)."""
    try:
        gw = await _get_gateway()
        return await gw.chains()
    except Exception as exc:
        logger.exception("GET /ccways/chains failed")
        return sanitize_error(exc)


@router.get("/intel/{address}")
async def get_intel(address: str):
    """Get unified intelligence for an address — entity labels, risk, balances."""
    try:
        gw = await _get_gateway()
        return await gw.intel(address)
    except Exception as exc:
        logger.exception("GET /ccways/intel/%s failed", address)
        return sanitize_error(exc)


@router.post("/expand")
async def expand_graph(req: ExpandRequest):
    """
    Expand graph from an address — returns counterparties as MSNode[] + MSEdge[].
    This is the core endpoint called by the frontend CWTracker.
    """
    try:
        gw = await _get_gateway()
        return await gw.expand(
            address=req.address,
            node_id=req.nodeId,
            direction=req.direction,
            chains=req.chains,
            limit=req.limit,
        )
    except Exception as exc:
        logger.exception("POST /ccways/expand failed")
        return sanitize_error(exc)


@router.get("/balance/{address}")
async def get_balance(
    address: str,
    chains: Optional[str] = Query(None, description="Comma-separated chain IDs"),
):
    """Get multi-chain balance (93+ chains)."""
    try:
        gw = await _get_gateway()
        chain_list = chains.split(",") if chains else None
        return await gw.balance(address, chains=chain_list)
    except Exception as exc:
        logger.exception("GET /ccways/balance/%s failed", address)
        return sanitize_error(exc)


@router.get("/flow/{address}")
async def get_flow(
    address: str,
    timeframe: str = Query("24h", description="e.g. 1h, 24h, 7d, 30d"),
):
    """Get historical flow snapshots."""
    try:
        gw = await _get_gateway()
        return await gw.flow(address, timeframe=timeframe)
    except Exception as exc:
        logger.exception("GET /ccways/flow/%s failed", address)
        return sanitize_error(exc)


@router.get("/protocols/{address}")
async def get_protocols(address: str):
    """Get DeFi protocol positions."""
    try:
        gw = await _get_gateway()
        return await gw.protocols(address)
    except Exception as exc:
        logger.exception("GET /ccways/protocols/%s failed", address)
        return sanitize_error(exc)


@router.get("/search")
async def search_entities(
    q: str = Query(..., min_length=1, description="Search query"),
):
    """Search entities, addresses, and tokens."""
    try:
        gw = await _get_gateway()
        return await gw.search(q)
    except Exception as exc:
        logger.exception("GET /ccways/search failed")
        return sanitize_error(exc)


@router.get("/transfers")
async def get_transfers(
    address: Optional[str] = Query(None),
    chain: Optional[str] = Query(None),
    flow: str = Query("all", description="'all', 'in', 'out'"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get transfer history."""
    try:
        gw = await _get_gateway()
        return await gw.transfers(
            address=address, chain=chain, flow=flow, limit=limit, offset=offset
        )
    except Exception as exc:
        logger.exception("GET /ccways/transfers failed")
        return sanitize_error(exc)


@router.get("/portfolio/{address}")
async def get_portfolio(
    address: str,
    timeframe: str = Query("30d", description="e.g. 7d, 30d, 90d, 1y"),
):
    """Get portfolio time series."""
    try:
        gw = await _get_gateway()
        return await gw.portfolio(address, timeframe=timeframe)
    except Exception as exc:
        logger.exception("GET /ccways/portfolio/%s failed", address)
        return sanitize_error(exc)


@router.get("/token/{token_id}")
async def get_token(token_id: str):
    """Get token market data."""
    try:
        gw = await _get_gateway()
        return await gw.token(token_id)
    except Exception as exc:
        logger.exception("GET /ccways/token/%s failed", token_id)
        return sanitize_error(exc)


@router.get("/tx/{tx_hash}")
async def get_tx(tx_hash: str):
    """Get transaction details."""
    try:
        gw = await _get_gateway()
        return await gw.tx(tx_hash)
    except Exception as exc:
        logger.exception("GET /ccways/tx/%s failed", tx_hash)
        return sanitize_error(exc)


@router.get("/asset/{asset_hash}")
async def get_asset(asset_hash: str):
    """
    Proxy external asset (logo/icon) through our domain.
    Client sees /api/ccways/asset/{hash} — never the original CDN URL.
    """
    original_url = resolve_asset_url(asset_hash)
    if not original_url:
        raise HTTPException(status_code=404, detail="Asset not found")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(original_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=resp.status, detail="Upstream asset error")
                content = await resp.read()
                content_type = resp.headers.get("Content-Type", "image/png")
                return Response(
                    content=content,
                    media_type=content_type,
                    headers={
                        "Cache-Control": "public, max-age=86400",  # 24h browser cache
                    },
                )
    except aiohttp.ClientError:
        raise HTTPException(status_code=502, detail="Asset proxy error")


@router.get("/stats")
async def get_stats():
    """Admin stats endpoint — request counts, cache, circuit breakers, latency."""
    try:
        gw = await _get_gateway()
        return await gw.stats()
    except Exception as exc:
        logger.exception("GET /ccways/stats failed")
        return sanitize_error(exc)
