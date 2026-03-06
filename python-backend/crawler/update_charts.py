"""
📊 تحديث بيانات الشارتات — Chart Data Updater
=================================================
يجلب شارتات Etherscan باستخدام BrowserChartFetcher
ويدمجها في ملفات JSON الموجودة في crawler/data/latest/

الاستخدام:
    python -m crawler.update_charts                  # إيثريوم فقط
    python -m crawler.update_charts ethereum bsc     # سلاسل محددة
    python -m crawler.update_charts --all            # كل السلاسل
"""

import os
import sys
import json
import dataclasses
from typing import List

from loguru import logger

from .browser_fetcher import BrowserChartFetcher
from .config import ETHERSCAN_CHAINS


DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "latest")


def update_chain_charts(chain_key: str, fetcher: BrowserChartFetcher, max_charts: int = 15) -> bool:
    """
    جلب شارتات سلسلة ودمجها في ملف JSON الموجود.
    Returns True إذا نجح التحديث.
    """
    json_path = os.path.join(DATA_DIR, f"{chain_key}.json")
    
    if not os.path.exists(json_path):
        logger.warning(f"⚠️ ملف {chain_key}.json غير موجود — تخطي")
        return False

    # 1. جلب الشارتات
    logger.info(f"🔄 جلب شارتات {chain_key}...")
    charts = fetcher.crawl_chain_charts(chain_key, max_charts=max_charts, delay=4.0)

    if not charts:
        logger.warning(f"⚠️ لم يتم جلب أي شارتات لـ {chain_key}")
        return False

    # 2. تحويل ChartTimeSeries → dict
    charts_dict = {}
    for metric_key, series in charts.items():
        charts_dict[metric_key] = dataclasses.asdict(series)

    logger.info(f"📊 تم جلب {len(charts_dict)} شارت لـ {chain_key}")

    # 3. تحميل JSON الحالي
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 4. دمج etherscan_charts
    data["etherscan_charts"] = charts_dict

    # 5. حفظ
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    logger.info(f"💾 تم حفظ {chain_key}.json مع {len(charts_dict)} شارت")
    return True


def main():
    # تحديد السلاسل المطلوبة
    args = sys.argv[1:]

    if "--all" in args:
        chain_keys = list(ETHERSCAN_CHAINS.keys())
    elif args:
        chain_keys = [k for k in args if k in ETHERSCAN_CHAINS]
        if not chain_keys:
            print(f"❌ سلاسل غير معروفة: {args}")
            print(f"   المتاحة: {', '.join(ETHERSCAN_CHAINS.keys())}")
            sys.exit(1)
    else:
        # الافتراضي: إيثريوم فقط
        chain_keys = ["ethereum"]

    logger.info(f"🚀 تحديث شارتات {len(chain_keys)} سلسلة: {', '.join(chain_keys)}")

    fetcher = BrowserChartFetcher(headless=False)
    success = 0
    failed = 0

    try:
        for i, chain_key in enumerate(chain_keys):
            logger.info(f"\n{'═' * 60}")
            logger.info(f"🔗 [{i+1}/{len(chain_keys)}] {chain_key}")
            logger.info(f"{'═' * 60}")

            if update_chain_charts(chain_key, fetcher):
                success += 1
            else:
                failed += 1

    finally:
        fetcher.close()

    logger.info(f"\n{'═' * 60}")
    logger.info(f"✅ نجح: {success} | ❌ فشل: {failed} | 📊 إجمالي: {len(chain_keys)}")
    logger.info(f"{'═' * 60}")


if __name__ == "__main__":
    main()
