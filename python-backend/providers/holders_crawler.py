"""
📊 holders_crawler.py — TokenTerminal top-holders crawler provider (Firebase lifecycle)

Crawls top 200 holders data from tokenterminal.com every 12 hours.
Writes to Firebase: crawler_data/holders/{project}
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

logger = logging.getLogger("holders_crawler")
holders_crawler_router = APIRouter()

HOLDERS_REFRESH_INTERVAL = 12 * 60 * 60  # 12 hours

_bg_tasks: List[asyncio.Task] = []
_running = False
_stats: Dict[str, Any] = {
    "total_runs": 0,
    "projects_count": 0,
    "holders_total": 0,
    "errors": 0,
    "last_run": None,
}


async def _write_holders_to_firebase(holders_data: Dict[str, Any]) -> bool:
    """Write all holders data to Firebase."""
    try:
        db = get_db()
        batch = db.batch()
        count = 0

        for project_key, project_data in holders_data.items():
            doc_ref = db.collection("crawler_data").document("holders") \
                        .collection("projects").document(project_key)
            batch.set(doc_ref, {
                **project_data,
                "_updated_at": int(time.time() * 1000),
            })
            count += 1

            if count % 400 == 0:
                await batch.commit()
                batch = db.batch()

        if count % 400 != 0:
            await batch.commit()

        # Write summary doc
        summary_ref = db.collection("crawler_data").document("holders_summary")
        await summary_ref.set({
            "projects_count": len(holders_data),
            "updated_at": int(time.time() * 1000),
            "project_keys": list(holders_data.keys())[:200],
        })

        return True
    except Exception as e:
        logger.error("Write holders data failed: %s", e)
        return False


async def _run_holders_crawler() -> Dict[str, Any]:
    """Run TokenTerminal holders crawler and write to Firebase."""
    results = {"success": False, "projects": 0, "holders": 0}

    try:
        from crawler.tokenterminal_scraper import run_tokenterminal_scraper

        logger.info("📊 Running TokenTerminal holders crawler...")
        holders_data = await run_tokenterminal_scraper(batch_size=50)

        if holders_data and isinstance(holders_data, dict) and len(holders_data) > 0:
            total_holders = sum(
                len(p.get("holders", []))
                for p in holders_data.values()
                if isinstance(p, dict)
            )
            ok = await _write_holders_to_firebase(holders_data)
            if ok:
                results["success"] = True
                results["projects"] = len(holders_data)
                results["holders"] = total_holders
                logger.info(
                    "✅ Holders: %d projects, %d holders written to Firebase",
                    len(holders_data), total_holders
                )
            else:
                logger.error("❌ Holders: Firebase write failed")
        else:
            logger.warning("⚠️ Holders: No data returned")

    except ImportError as e:
        logger.error("❌ Crawler module import failed: %s", e)
    except Exception as e:
        logger.error("❌ Holders crawl failed: %s", e)
        _stats["errors"] += 1

    return results


async def _holders_crawler_loop():
    """Background loop: run every 12 hours."""
    await asyncio.sleep(120)  # Initial delay (let chain crawler start first)

    while _running:
        try:
            logger.info("🔄 TokenTerminal holders crawler starting...")
            start = time.time()
            result = await _run_holders_crawler()
            elapsed = time.time() - start

            _stats["total_runs"] += 1
            _stats["projects_count"] = result.get("projects", 0)
            _stats["holders_total"] = result.get("holders", 0)
            _stats["last_run"] = {
                "success": result["success"],
                "projects": result["projects"],
                "holders": result["holders"],
                "elapsed_s": round(elapsed, 1),
                "timestamp": int(time.time() * 1000),
            }

            logger.info(
                "✅ Holders cycle done: %d projects, %.0fs",
                result["projects"], elapsed
            )

        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ Holders loop error: %s", e)

        await asyncio.sleep(HOLDERS_REFRESH_INTERVAL)


async def init_holders_crawler():
    global _running
    try:
        init_firebase()
    except Exception:
        pass
    _running = True
    _bg_tasks.append(asyncio.create_task(_holders_crawler_loop()))
    logger.info("✅ Holders crawler started (every %dh)", HOLDERS_REFRESH_INTERVAL // 3600)


async def shutdown_holders_crawler():
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 Holders crawler shutdown")


@holders_crawler_router.get("/status")
async def holders_status():
    return {"running": _running, "stats": _stats}


@holders_crawler_router.post("/trigger")
async def trigger_holders():
    try:
        result = await _run_holders_crawler()
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
