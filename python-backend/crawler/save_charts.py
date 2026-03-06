"""
💾 حفظ شارتات Etherscan في ملفات JSON
========================================
يجلب الشارتات بالمتصفح ويدمجها في ملفات crawler/data/latest/{chain}.json
التي يقرأها الفرونت‌إند.

الاستخدام:
    python -m crawler.save_charts                      # Ethereum فقط
    python -m crawler.save_charts --chains ethereum bsc polygon
    python -m crawler.save_charts --all                # كل السلاسل
    python -m crawler.save_charts --max-charts 18      # أقصى عدد شارتات
"""

import os
import sys
import json
import argparse
import dataclasses
from datetime import datetime
from typing import Dict, List, Optional

from loguru import logger

# إضافة المسار الأب حتى يعمل الاستيراد
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler.browser_fetcher import BrowserChartFetcher
from crawler.models import ChartTimeSeries
from crawler.config import ETHERSCAN_CHAINS


# ══════════════════════════════════════════════════════════════════
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "latest")


def charts_to_dict(charts: Dict[str, ChartTimeSeries]) -> dict:
    """تحويل Dict[str, ChartTimeSeries] إلى dict قابل للحفظ كـ JSON"""
    result = {}
    for key, series in charts.items():
        result[key] = dataclasses.asdict(series)
    return result


def merge_charts_into_json(chain_key: str, charts: Dict[str, ChartTimeSeries]) -> bool:
    """
    دمج شارتات Etherscan في ملف JSON الحالي للسلسلة.
    
    إذا لم يوجد ملف JSON مسبقاً، يتم إنشاء ملف جديد مع الشارتات فقط.
    
    Returns:
        True إذا نجح الحفظ
    """
    json_path = os.path.join(DATA_DIR, f"{chain_key}.json")
    
    # قراءة الملف الحالي إن وُجد
    existing_data = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            logger.info(f"📂 تم قراءة {json_path} ({len(existing_data)} مفتاح)")
        except Exception as e:
            logger.error(f"❌ خطأ قراءة {json_path}: {e}")
            existing_data = {}
    else:
        logger.warning(f"⚠️ لا يوجد ملف سابق لـ {chain_key}، سيتم إنشاؤه")
        os.makedirs(DATA_DIR, exist_ok=True)

    # تحويل الشارتات إلى dict
    charts_dict = charts_to_dict(charts)
    
    # دمج في البيانات الحالية
    existing_data["etherscan_charts"] = charts_dict
    existing_data["etherscan_charts_updated"] = datetime.now().isoformat()
    
    # حفظ
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2, default=str)
        
        file_size_mb = os.path.getsize(json_path) / (1024 * 1024)
        logger.info(f"💾 تم حفظ {chain_key}.json ({file_size_mb:.2f} MB) — {len(charts_dict)} شارت")
        return True
    except Exception as e:
        logger.error(f"❌ خطأ حفظ {json_path}: {e}")
        return False


def run(
    chain_keys: List[str],
    max_charts: int = 15,
    delay: float = 4.0,
):
    """
    جلب وحفظ شارتات لسلسلة واحدة أو أكثر.
    """
    logger.info(f"🚀 بدء جلب شارتات {len(chain_keys)} سلسلة")
    logger.info(f"   السلاسل: {', '.join(chain_keys)}")
    logger.info(f"   أقصى شارتات: {max_charts}")
    
    fetcher = BrowserChartFetcher(headless=False)
    
    success_count = 0
    fail_count = 0
    
    try:
        for i, chain_key in enumerate(chain_keys):
            logger.info(f"\n{'═' * 60}")
            logger.info(f"🔗 [{i+1}/{len(chain_keys)}] {chain_key}")
            logger.info(f"{'═' * 60}")
            
            if chain_key not in ETHERSCAN_CHAINS:
                logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
                fail_count += 1
                continue
            
            # جلب الشارتات
            charts = fetcher.crawl_chain_charts(
                chain_key, 
                max_charts=max_charts,
                delay=delay,
            )
            
            if not charts:
                logger.warning(f"⚠️ لم يتم جلب أي شارتات لـ {chain_key}")
                fail_count += 1
                continue
            
            # عرض ملخص
            logger.info(f"\n📊 ملخص {chain_key}:")
            for key, series in charts.items():
                pts = len(series.data)
                date_range = ""
                if series.data:
                    date_range = f" ({series.data[0].date} → {series.data[-1].date})"
                logger.info(f"   • {series.metric_name}: {pts} نقطة{date_range}")
            
            # حفظ في JSON
            if merge_charts_into_json(chain_key, charts):
                success_count += 1
            else:
                fail_count += 1
            
            # تأخير بين السلاسل
            if i < len(chain_keys) - 1:
                import time, random
                wait = 8 + random.uniform(2, 5)
                logger.info(f"⏳ انتظار {wait:.0f}ث قبل السلسلة التالية...")
                time.sleep(wait)
    
    finally:
        fetcher.close()
    
    # ملخص نهائي
    logger.info(f"\n{'═' * 60}")
    logger.info(f"🏁 اكتمل: {success_count} نجاح، {fail_count} فشل")
    logger.info(f"{'═' * 60}")


def main():
    parser = argparse.ArgumentParser(description="جلب وحفظ شارتات Etherscan")
    parser.add_argument(
        "--chains", 
        nargs="+", 
        default=["ethereum"],
        help="قائمة السلاسل (مثل: ethereum bsc polygon)"
    )
    parser.add_argument(
        "--all", 
        action="store_true",
        help="جلب شارتات كل السلاسل العشرين"
    )
    parser.add_argument(
        "--max-charts", 
        type=int, 
        default=18,
        help="أقصى عدد شارتات لكل سلسلة (افتراضي: 18)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=4.0,
        help="تأخير بين الطلبات بالثواني (افتراضي: 4)"
    )
    
    args = parser.parse_args()
    
    if args.all:
        chain_keys = list(ETHERSCAN_CHAINS.keys())
    else:
        chain_keys = args.chains
    
    run(chain_keys, max_charts=args.max_charts, delay=args.delay)


if __name__ == "__main__":
    main()
