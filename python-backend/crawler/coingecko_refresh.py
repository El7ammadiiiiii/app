"""
🔄 CoinGecko Refresh — تحديث خفيف للأسعار والأحجام كل ساعة
══════════════════════════════════════════════════════════════
يُحدّث JSON الموجود بدون إعادة زحف StakingRewards.

الفكرة:
  1. يقرأ __stakingrewards__.json الحالي
  2. يجلب بيانات CoinGecko (price, volume, market_cap, changes)
  3. يدمج البيانات الجديدة في كل أصل
  4. يحفظ JSON المُحدّث

يستغرق ~10 ثوانٍ فقط (طلب واحد أو اثنين لـ CoinGecko).
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from loguru import logger

from .asset_registry import enrich_asset
from .coingecko_enricher import fetch_all_coingecko_data, merge_coingecko_into_asset
from .storage import DataStorage


async def refresh_prices(
    api_key: Optional[str] = None,
    data_dir: Optional[str] = None,
) -> bool:
    """
    تحديث خفيف — يحدّث الأسعار والأحجام من CoinGecko.

    Returns:
        True إذا نجح التحديث
    """
    start = time.time()
    storage = DataStorage()

    # ── تحميل البيانات الحالية ──
    logger.info("🔄 بدء تحديث CoinGecko السريع...")

    current = storage.load_latest("__stakingrewards__")
    if not current:
        logger.error("❌ لا توجد بيانات StakingRewards — شغّل الزاحف الكامل أولاً")
        return False

    assets = current.get("assets", [])
    if not assets:
        logger.error("❌ لا توجد أصول في البيانات الحالية")
        return False

    logger.info(f"📦 تحديث {len(assets)} أصل...")

    # ── جلب بيانات CoinGecko ──
    cg_data = await fetch_all_coingecko_data(api_key)
    if not cg_data:
        logger.error("❌ فشل جلب بيانات CoinGecko")
        return False

    # ── دمج البيانات ──
    updated = 0
    for asset in assets:
        old_price = asset.get("price_usd")
        merge_coingecko_into_asset(asset, cg_data)
        enrich_asset(asset)
        new_price = asset.get("price_usd")

        if new_price != old_price:
            updated += 1

    # ── تحديث الطابع الزمني ──
    current["timestamp"] = datetime.utcnow().isoformat()
    current["last_refresh"] = datetime.utcnow().isoformat()
    current["refresh_type"] = "coingecko_quick"

    # ── حفظ ──
    storage.save_raw("__stakingrewards__", current)

    elapsed = time.time() - start
    logger.info(
        f"🔄 تحديث CoinGecko اكتمل: "
        f"{updated}/{len(assets)} أسعار محدّثة ({elapsed:.1f}s)"
    )
    return True


async def run_refresh_loop(
    interval_seconds: int = 3600,
    api_key: Optional[str] = None,
):
    """
    حلقة تحديث مستمرة — تعمل كل ساعة.
    """
    logger.info(f"🔄 بدء حلقة تحديث CoinGecko — كل {interval_seconds // 60} دقيقة")

    while True:
        try:
            success = await refresh_prices(api_key)
            if success:
                logger.success("✅ تحديث CoinGecko ناجح")
            else:
                logger.warning("⚠️ فشل التحديث — سنحاول مجدداً")
        except Exception as e:
            logger.error(f"❌ خطأ في التحديث: {e}")

        await asyncio.sleep(interval_seconds)


def main():
    """نقطة دخول CLI."""
    import argparse
    parser = argparse.ArgumentParser(description="🔄 CoinGecko Quick Refresh")
    parser.add_argument("--once", action="store_true", help="تشغيل مرة واحدة")
    parser.add_argument("--interval", type=int, default=3600, help="فترة التحديث بالثواني")
    parser.add_argument("--api-key", type=str, default=None, help="CoinGecko API key")
    args = parser.parse_args()

    if args.once:
        asyncio.run(refresh_prices(args.api_key))
    else:
        asyncio.run(run_refresh_loop(args.interval, args.api_key))


if __name__ == "__main__":
    main()
