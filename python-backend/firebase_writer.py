"""
🔥 firebase_writer.py — Firestore write service for scanner providers
Handles purge-then-write pattern, metadata updates, and batch operations.

Uses firebase-admin SDK (service account) — runs server-side only.
"""

import os
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import AsyncClient

logger = logging.getLogger("firebase_writer")

# ═══════════════════════════════════════════════════════════════════════
# 🔧 Initialization
# ═══════════════════════════════════════════════════════════════════════

_db: Optional[AsyncClient] = None
_initialized = False


def _get_credential_path() -> str:
    """Resolve service account key path from env or known locations."""
    # 1. Explicit env var
    path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if path and os.path.isfile(path):
        return path
    # 2. Parent workspace env
    parent_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.isfile(parent_env):
        with open(parent_env) as f:
            for line in f:
                if line.startswith("GOOGLE_APPLICATION_CREDENTIALS="):
                    p = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if os.path.isfile(p):
                        return p
    # 3. Default known locations
    defaults = [
        os.path.join(os.path.dirname(__file__), "keys", "service-account-key.json"),
        os.path.expanduser("~/elhammadi/backend-api-service/keys/service-account-key.json"),
        os.path.expanduser("~/ccways/python-backend/keys/service-account-key.json"),
    ]
    for default in defaults:
        if os.path.isfile(default):
            return default
    return ""


def init_firebase():
    """Initialize Firebase Admin SDK once."""
    global _db, _initialized
    if _initialized:
        return

    cred_path = _get_credential_path()
    if not cred_path:
        raise RuntimeError(
            "No Firebase service account key found. Set GOOGLE_APPLICATION_CREDENTIALS env var."
        )

    try:
        # Check if default app already exists
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "projectId": os.getenv("FIREBASE_PROJECT_ID", "ccways-5a160"),
        })

    _db = firestore.AsyncClient(project=os.getenv("FIREBASE_PROJECT_ID", "ccways-5a160"))
    _initialized = True
    logger.info("✅ Firebase Admin SDK initialized (project: ccways-5a160)")


def get_db() -> AsyncClient:
    """Get Firestore async client, initializing if needed."""
    if not _initialized:
        init_firebase()
    assert _db is not None, "Firebase not initialized"
    return _db


# ═══════════════════════════════════════════════════════════════════════
# 📝 Write Operations
# ═══════════════════════════════════════════════════════════════════════

async def write_scanner_result(
    page_id: str,
    exchange: str,
    timeframe: str,
    symbol: str,
    data: Dict[str, Any],
) -> bool:
    """
    Write a single scanner result to Firestore.
    Path: scanners_results/{pageId}/exchanges/{exchange}/timeframes/{tf}/data/{symbol}
    """
    try:
        db = get_db()
        doc_ref = (
            db.collection("scanners_results")
            .document(page_id)
            .collection("exchanges")
            .document(exchange)
            .collection("timeframes")
            .document(timeframe)
            .collection("data")
            .document(symbol)
        )
        await doc_ref.set({
            **data,
            "_updated_at": int(time.time() * 1000),
            "_exchange": exchange,
            "_timeframe": timeframe,
        })
        return True
    except Exception as e:
        logger.error("Write failed [%s/%s/%s/%s]: %s", page_id, exchange, timeframe, symbol, e)
        return False


async def write_batch(
    page_id: str,
    exchange: str,
    timeframe: str,
    results: List[Dict[str, Any]],
    symbol_key: str = "symbol",
) -> int:
    """
    Write multiple scanner results in a Firestore batch (max 500 per batch).
    Returns count of successful writes.
    """
    db = get_db()
    success = 0
    # Firestore batch limit = 500
    for i in range(0, len(results), 450):
        chunk = results[i:i + 450]
        batch = db.batch()
        for item in chunk:
            sym = item.get(symbol_key, "UNKNOWN").replace("/", "-")
            doc_ref = (
                db.collection("scanners_results")
                .document(page_id)
                .collection("exchanges")
                .document(exchange)
                .collection("timeframes")
                .document(timeframe)
                .collection("data")
                .document(sym)
            )
            batch.set(doc_ref, {
                **item,
                "_updated_at": int(time.time() * 1000),
                "_exchange": exchange,
                "_timeframe": timeframe,
            })
        try:
            await batch.commit()
            success += len(chunk)
        except Exception as e:
            logger.error("Batch write failed [%s/%s/%s chunk %d]: %s",
                         page_id, exchange, timeframe, i, e)
    return success


async def update_meta(
    page_id: str,
    exchange: str,
    timeframe: str,
    symbols_count: int,
    status: str = "ok",
    error: Optional[str] = None,
) -> None:
    """
    Update the _meta document for a page/exchange/timeframe combination.
    This tells the frontend when data was last refreshed.
    """
    try:
        db = get_db()
        meta_ref = (
            db.collection("scanners_results")
            .document(page_id)
            .collection("exchanges")
            .document(exchange)
            .collection("timeframes")
            .document(timeframe)
        )
        meta_data = {
            "last_updated": int(time.time() * 1000),
            "symbols_count": symbols_count,
            "status": status,
            "exchange": exchange,
            "timeframe": timeframe,
        }
        if error:
            meta_data["error"] = error
        await meta_ref.set(meta_data, merge=True)
    except Exception as e:
        logger.error("Meta update failed [%s/%s/%s]: %s", page_id, exchange, timeframe, e)


async def purge_and_write(
    page_id: str,
    exchange: str,
    timeframe: str,
    results: List[Dict[str, Any]],
    symbol_key: str = "symbol",
) -> int:
    """
    Purge-then-write pattern:
    1. Delete all existing data docs for this page/exchange/timeframe
    2. Write fresh results
    3. Update meta

    This prevents stale symbols from lingering in Firestore.
    """
    db = get_db()

    # Step 1: Purge existing data
    try:
        data_collection = (
            db.collection("scanners_results")
            .document(page_id)
            .collection("exchanges")
            .document(exchange)
            .collection("timeframes")
            .document(timeframe)
            .collection("data")
        )
        existing = data_collection.stream()
        delete_batch = db.batch()
        count = 0
        async for doc in existing:
            delete_batch.delete(doc.reference)
            count += 1
            if count % 450 == 0:
                await delete_batch.commit()
                delete_batch = db.batch()
        if count % 450 != 0:
            await delete_batch.commit()
        if count > 0:
            logger.debug("Purged %d old docs [%s/%s/%s]", count, page_id, exchange, timeframe)
    except Exception as e:
        logger.warning("Purge failed [%s/%s/%s]: %s — continuing with write", page_id, exchange, timeframe, e)

    # Step 2: Write fresh data
    written = await write_batch(page_id, exchange, timeframe, results, symbol_key)

    # Step 3: Update meta
    status = "ok" if written == len(results) else "partial"
    await update_meta(page_id, exchange, timeframe, written, status)

    logger.info("✅ [%s/%s/%s] Wrote %d/%d results", page_id, exchange, timeframe, written, len(results))
    return written
