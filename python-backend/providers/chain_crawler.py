"""
🌐 chain_crawler.py — Chain Explorer crawler provider (Firebase lifecycle)

Runs all 6 chain families + DeFiLlama every 4 hours.
Writes results to Firebase collection: crawler_data/chains/{chainKey}
Also writes summary to: crawler_data/chains/__all__

Families: Etherscan (20+), Blockscout (8), Independent (24),
          Subscan (6), Cosmos (12), Level2 (11)
"""

import asyncio
import json
import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter

# Ensure crawler module is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_writer import init_firebase, get_db

logger = logging.getLogger("chain_crawler")
chain_crawler_router = APIRouter()

# ═══════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════

CHAIN_REFRESH_INTERVAL = 4 * 60 * 60  # 4 hours
QUICK_REFRESH_INTERVAL = 60 * 60       # 1 hour for quick updates

_bg_tasks: List[asyncio.Task] = []
_running = False
_stats: Dict[str, Any] = {
    "total_runs": 0,
    "successful_chains": 0,
    "errors": 0,
    "last_run": None,
    "last_run_type": None,
}


# ═══════════════════════════════════════════════
# Firebase Write Helpers
# ═══════════════════════════════════════════════

async def _write_chain_to_firebase(chain_key: str, data: Dict[str, Any]) -> bool:
    """Write a single chain snapshot to Firebase."""
    try:
        db = get_db()
        doc_ref = db.collection("crawler_data").document("chains").collection("data").document(chain_key)
        await doc_ref.set({
            **data,
            "_updated_at": int(time.time() * 1000),
        })
        return True
    except Exception as e:
        logger.error("Write chain failed [%s]: %s", chain_key, e)
        return False


async def _write_chain_summary(chains: List[Dict[str, Any]]) -> bool:
    """Write chain summary for hub page."""
    try:
        db = get_db()
        doc_ref = db.collection("crawler_data").document("chains_summary")
        await doc_ref.set({
            "chains": chains,
            "count": len(chains),
            "updated_at": int(time.time() * 1000),
        })
        return True
    except Exception as e:
        logger.error("Write chain summary failed: %s", e)
        return False


async def _write_defillama_to_firebase(data: Dict[str, Any]) -> bool:
    """Write DeFiLlama cross-chain data to Firebase."""
    try:
        db = get_db()
        doc_ref = db.collection("crawler_data").document("defillama")
        await doc_ref.set({
            **data,
            "_updated_at": int(time.time() * 1000),
        })
        return True
    except Exception as e:
        logger.error("Write DeFiLlama failed: %s", e)
        return False


# ═══════════════════════════════════════════════
# Crawler Execution
# ═══════════════════════════════════════════════

async def _run_chain_crawlers(quick: bool = False) -> Dict[str, Any]:
    """Run all chain family crawlers and write results to Firebase."""
    results = {"chains_ok": 0, "chains_fail": 0, "defillama": False}

    try:
        from crawler.config import (
            ETHERSCAN_CHAINS, BLOCKSCOUT_CHAINS, INDEPENDENT_CHAINS,
            SUBSCAN_CHAINS, COSMOS_CHAINS, LEVEL2_CHAINS, DEFAULT_SETTINGS,
        )
        from crawler.scheduler import (
            run_once, run_once_blockscout, run_once_independent,
            run_once_subscan, run_once_cosmos, run_once_level2,
            run_once_defillama,
        )
        from crawler.storage import DataStorage

        storage = DataStorage(DEFAULT_SETTINGS.data_dir)

        # Run DeFiLlama first (cross-chain TVL data)
        try:
            logger.info("🦙 Running DeFiLlama crawler...")
            dl_result = await run_once_defillama(quick=quick)
            if dl_result:
                dl_data = dl_result.to_dict() if hasattr(dl_result, 'to_dict') else dl_result
                await _write_defillama_to_firebase(dl_data)
                results["defillama"] = True
                logger.info("✅ DeFiLlama data written to Firebase")
        except Exception as e:
            logger.error("❌ DeFiLlama crawler failed: %s", e)

        # Run each chain family
        families = [
            ("Etherscan", list(ETHERSCAN_CHAINS.keys()), run_once),
            ("Blockscout", list(BLOCKSCOUT_CHAINS.keys()), run_once_blockscout),
            ("Independent", list(INDEPENDENT_CHAINS.keys()), run_once_independent),
            ("Subscan", list(SUBSCAN_CHAINS.keys()), run_once_subscan),
            ("Cosmos", list(COSMOS_CHAINS.keys()), run_once_cosmos),
            ("Level2", list(LEVEL2_CHAINS.keys()), run_once_level2),
        ]

        all_chain_summaries = []

        for family_name, chain_keys, runner in families:
            try:
                logger.info("🔗 [%s] Crawling %d chains...", family_name, len(chain_keys))

                import inspect
                sig = inspect.signature(runner)
                if quick and "pages" in sig.parameters:
                    chain_results = await runner(chain_keys, pages=["homepage", "charts"])
                else:
                    chain_results = await runner(chain_keys)

                if chain_results:
                    for key, snapshot in chain_results.items():
                        try:
                            data = snapshot.to_dict() if hasattr(snapshot, 'to_dict') else snapshot
                            ok = await _write_chain_to_firebase(key, data)
                            if ok:
                                results["chains_ok"] += 1
                                # Build summary entry
                                net = data.get("network", {})
                                tokens = data.get("tokens", {})
                                all_chain_summaries.append({
                                    "key": key,
                                    "chain_name": data.get("chain_name", key),
                                    "chain_symbol": data.get("chain_symbol", ""),
                                    "native_price_usd": tokens.get("native_price_usd"),
                                    "native_market_cap": tokens.get("native_market_cap"),
                                    "total_transactions": net.get("total_transactions"),
                                    "tps": net.get("tps"),
                                    "total_nodes": data.get("health", {}).get("total_nodes"),
                                    "total_addresses": net.get("total_addresses"),
                                    "tvl": None,
                                    "timestamp": data.get("timestamp"),
                                })
                            else:
                                results["chains_fail"] += 1
                        except Exception as e:
                            results["chains_fail"] += 1
                            logger.error("Write chain [%s] failed: %s", key, e)

                logger.info("✅ [%s] %d chains processed", family_name, len(chain_results) if chain_results else 0)

            except Exception as e:
                logger.error("❌ [%s] Family crawl failed: %s", family_name, e)
                _stats["errors"] += 1

        # Write summary for hub page
        if all_chain_summaries:
            await _write_chain_summary(all_chain_summaries)
            logger.info("📊 Chain summary written: %d chains", len(all_chain_summaries))

    except ImportError as e:
        logger.error("❌ Crawler module import failed: %s", e)
        _stats["errors"] += 1
    except Exception as e:
        logger.error("❌ Chain crawler run failed: %s", e)
        _stats["errors"] += 1

    return results


# ═══════════════════════════════════════════════
# Background Loop
# ═══════════════════════════════════════════════

async def _chain_crawler_loop():
    """Background loop: full update every 4h, quick update every 1h."""
    cycle = 0
    cycles_per_full = CHAIN_REFRESH_INTERVAL // QUICK_REFRESH_INTERVAL  # 4

    # Initial full run (delay a bit to let other providers start first)
    await asyncio.sleep(30)

    while _running:
        try:
            cycle += 1
            is_full = (cycle % cycles_per_full == 0) or cycle == 1
            mode = "full" if is_full else "quick"

            logger.info("🔄 Chain crawler cycle #%d (%s)...", cycle, mode)
            start = time.time()
            results = await _run_chain_crawlers(quick=not is_full)
            elapsed = time.time() - start

            _stats["total_runs"] += 1
            _stats["successful_chains"] += results["chains_ok"]
            _stats["last_run"] = {
                "cycle": cycle,
                "mode": mode,
                "chains_ok": results["chains_ok"],
                "chains_fail": results["chains_fail"],
                "defillama": results["defillama"],
                "elapsed_s": round(elapsed, 1),
                "timestamp": int(time.time() * 1000),
            }
            _stats["last_run_type"] = mode

            logger.info(
                "✅ Chain crawler cycle #%d done: %d ok, %d fail, DL=%s, %.0fs",
                cycle, results["chains_ok"], results["chains_fail"],
                results["defillama"], elapsed,
            )

        except Exception as e:
            _stats["errors"] += 1
            logger.error("❌ Chain crawler loop error: %s", e)

        # Wait for next cycle
        await asyncio.sleep(QUICK_REFRESH_INTERVAL)


# ═══════════════════════════════════════════════
# Lifecycle
# ═══════════════════════════════════════════════

async def init_chain_crawler():
    """Start chain crawler background loop."""
    global _running
    try:
        init_firebase()
    except Exception as e:
        logger.error("❌ Firebase init failed — chain crawler disabled: %s", e)
        return

    _running = True
    _bg_tasks.append(asyncio.create_task(_chain_crawler_loop()))
    logger.info("✅ Chain crawler started (full every %dh, quick every %dh)",
                CHAIN_REFRESH_INTERVAL // 3600, QUICK_REFRESH_INTERVAL // 3600)


async def shutdown_chain_crawler():
    """Stop chain crawler."""
    global _running
    _running = False
    for t in _bg_tasks:
        t.cancel()
    _bg_tasks.clear()
    logger.info("🛑 Chain crawler shutdown")


# ═══════════════════════════════════════════════
# API
# ═══════════════════════════════════════════════

@chain_crawler_router.get("/status")
async def chain_crawler_status():
    return {"running": _running, "stats": _stats}


@chain_crawler_router.post("/trigger")
async def trigger_chain_crawl(quick: bool = True):
    try:
        results = await _run_chain_crawlers(quick=quick)
        return {"success": True, **results}
    except Exception as e:
        return {"success": False, "error": str(e)}
