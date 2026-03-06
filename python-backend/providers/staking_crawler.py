"""
🥩 staking_crawler.py — StakingRewards crawler provider (Firebase lifecycle)

Crawls staking data from stakingrewards.com every 4 hours.
Enriches with CoinGecko market data.
Writes to Firebase: crawler_data/stakingrewards
"""

import asyncio
import logging
import os
import sys
import time
from typing import Any, Dict, List

from fastapi import APIRouter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_writer import init_firebase, get_db

logger = logging.getLogger("staking_crawler")
staking_crawler_router = APIRouter()

STAKING_REFRESH_INTERVAL = 4 * 60 * 60  # 4 hours

_bg_tasks: List[asyncio.Task] = []
_running = False
_stats: Dict[str, Any] = {
    "total_runs": 0,
    "assets_count": 0,
    "errors": 0,
    "last_run": None,
}


async def _write_staking_to_firebase(data: Dict[str, Any]) -> bool:
    """Write full staking data to Firebase."""
    try:
        db = get_db()
        doc_ref = db.collection("crawler_data").document("stakingrewards")
        await doc_ref.set({
            **data,
            "_updated_at": int(time.time() * 1000),
        })
        return True
    except Exception as e:
        logger.error("Write staking data failed: %s", e)
        return False


async def _run_staking_crawler() -> Dict[str, Any]:
    """Run staking rewards crawler and write to Firebase."""
    results = {"success": False, "assets": 0}

    try:
        from crawler.scheduler import run_once_stakingrewards

        logger.info("🥩 Running StakingRewards crawler...")
        result = await run_once_stakingrewards()

        if result and hasattr(result, 'assets') and result.assets:
            data = result.to_dict() if hasattr(result, 'to_dict') else {"assets": result.assets}
            ok = await _write_staking_to_firebase(data)
            if ok:
                results["success"] = True
                results["assets"] = len(result.assets)
                logger.info("✅ StakingRewards: %d assets written to Firebase", len(result.assets))
            else:
                logger.error("❌ StakingRewards: Firebase write failed")
        else:
            logger.warning("⚠️ StakingRewards: No data returned")

    except ImportError as e:
        logger.error("❌ Crawler module import failed: %s", e)
    except Exception as e:
        logger.error("❌ StakingRewards crawl failed: %s", e)
        _stats["errors"] += 1

    return results


async def _staking_crawler_loop():
    """Background loop: run every 4 hours."""
    await asyncio.sleep(60)  # Initial delay

    while _running:
        try:
            logger.info("🔄 StakingRewards crawler starting...")
            start = time.time()
            result = await _run_staking_crawler()
            elapsed = time.time() - start

            _stats["total_runs"] += 1
            _stats["assets_count"] = result.get("assets", 0)
            _stats["last_run"] = {
                "success": result["success"],
                "assets": result["assets"],
                "elapsed_s": round(elapsed, 1),
                "timestamp": int(time.time() * 1000),
            }

            logger.info("✅ StakingRewards cycle done: %d assets, %.0fs", result["assets"], elapsed)

        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ StakingRewards loop error: %s", e)

        await asyncio.sleep(STAKING_REFRESH_INTERVAL)


async def init_staking_crawler():
    global _running
    try:
        init_firebase()
    except Exception as e:
        logger.error("❌ Firebase init failed — staking crawler disabled: %s", e)
        return
    _running = True
    _bg_tasks.append(asyncio.create_task(_staking_crawler_loop()))
    logger.info("✅ StakingRewards crawler started (every %dh)", STAKING_REFRESH_INTERVAL // 3600)


async def shutdown_staking_crawler():
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 StakingRewards crawler shutdown")


@staking_crawler_router.get("/status")
async def staking_status():
    return {"running": _running, "stats": _stats}


@staking_crawler_router.post("/trigger")
async def trigger_staking():
    try:
        result = await _run_staking_crawler()
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
