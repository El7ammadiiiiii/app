"""
💾 حفظ شارتات من مصادر خارجية متعددة
==========================================
يجلب الشارتات من Blockchain.com و CryptoQuant ويدمجها في JSON.

المصادر المدعومة:
    1. Blockchain.com  — Bitcoin فقط (HTTP API مباشر، بدون متصفح)
    2. CryptoQuant     — Bitcoin فقط (DrissionPage + Cloudflare bypass)
    3. Etherscan       — EVM chains (موجود في save_charts.py)

الاستخدام:
    python -m crawler.save_external_charts                        # كل المصادر
    python -m crawler.save_external_charts --source blockchain    # blockchain.com فقط
    python -m crawler.save_external_charts --source cryptoquant   # CryptoQuant فقط
    python -m crawler.save_external_charts --source all           # الكل
    python -m crawler.save_external_charts --max-charts 10        # تحديد العدد
"""

import os
import sys
import json
import argparse
import dataclasses
from datetime import datetime
from typing import Dict, List, Optional

from loguru import logger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler.models import ChartTimeSeries


# ══════════════════════════════════════════════════════════════════
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "latest")


def charts_to_dict(charts: Dict[str, ChartTimeSeries]) -> dict:
    """تحويل charts إلى dict قابل للحفظ"""
    return {key: dataclasses.asdict(series) for key, series in charts.items()}


def merge_source_into_json(
    json_filename: str,
    source_key: str,
    charts: Dict[str, ChartTimeSeries],
) -> bool:
    """
    دمج شارتات مصدر معين في ملف JSON.
    
    Args:
        json_filename: اسم الملف (مثل bitcoin.json)
        source_key: مفتاح المصدر (مثل blockchain_charts, cryptoquant_charts)
        charts: الشارتات المُجلبة
    """
    json_path = os.path.join(DATA_DIR, json_filename)
    
    # قراءة الملف الحالي
    existing_data = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            logger.info(f"📂 تم قراءة {json_path}")
        except Exception as e:
            logger.error(f"❌ خطأ قراءة {json_path}: {e}")
    else:
        logger.info(f"📁 إنشاء ملف جديد: {json_filename}")
        os.makedirs(DATA_DIR, exist_ok=True)
    
    # ضمان الحقول الأساسية لبيتكوين
    if json_filename == "bitcoin.json" and not existing_data.get("chain_name"):
        existing_data.update({
            "chain_name": "Bitcoin",
            "chain_symbol": "BTC",
            "chain_id": 0,
            "timestamp": datetime.now().isoformat(),
            "crawler_version": "1.0.0",
        })
    
    # دمج الشارتات
    charts_dict = charts_to_dict(charts)
    existing_data[source_key] = charts_dict
    existing_data[f"{source_key}_updated"] = datetime.now().isoformat()
    
    # حفظ
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2, default=str)
        
        size_mb = os.path.getsize(json_path) / (1024 * 1024)
        logger.info(f"💾 تم حفظ {json_filename} ({size_mb:.2f} MB) — {len(charts_dict)} شارت في {source_key}")
        return True
    except Exception as e:
        logger.error(f"❌ خطأ حفظ {json_path}: {e}")
        return False


# ══════════════════════════════════════════════════════════════════
# 🔗 Blockchain.com
# ══════════════════════════════════════════════════════════════════

def fetch_and_save_blockchain(max_charts: int = 33, delay: float = 1.5):
    """جلب وحفظ شارتات Bitcoin من Blockchain.com"""
    logger.info("=" * 60)
    logger.info("🔗 Blockchain.com — بدء جلب شارتات Bitcoin")
    logger.info("=" * 60)
    
    from crawler.blockchain_fetcher import BlockchainFetcher
    
    fetcher = BlockchainFetcher(delay=delay)
    charts = fetcher.fetch_all_charts(max_charts=max_charts)
    
    if not charts:
        logger.error("⛔ لم يتم جلب أي شارتات من Blockchain.com")
        return False
    
    # عرض ملخص
    logger.info(f"\n📊 ملخص Blockchain.com:")
    for key, series in charts.items():
        pts = len(series.data)
        dr = f" ({series.data[0].date} → {series.data[-1].date})" if series.data else ""
        logger.info(f"   • {series.metric_name}: {pts} نقطة{dr}")
    
    return merge_source_into_json("bitcoin.json", "blockchain_charts", charts)


# ══════════════════════════════════════════════════════════════════
# 📈 CryptoQuant
# ══════════════════════════════════════════════════════════════════

def fetch_and_save_cryptoquant(max_charts: int = 9, delay: float = 3.0):
    """جلب وحفظ شارتات Bitcoin من CryptoQuant"""
    logger.info("=" * 60)
    logger.info("📈 CryptoQuant — بدء جلب شارتات Bitcoin")
    logger.info("=" * 60)
    
    from crawler.cryptoquant_fetcher import CryptoQuantFetcher
    
    fetcher = CryptoQuantFetcher(headless=False, delay=delay)
    try:
        charts = fetcher.fetch_all_charts(max_charts=max_charts)
    finally:
        fetcher.close()
    
    if not charts:
        logger.error("⛔ لم يتم جلب أي شارتات من CryptoQuant")
        return False
    
    # عرض ملخص
    logger.info(f"\n📊 ملخص CryptoQuant:")
    for key, series in charts.items():
        pts = len(series.data)
        dr = f" ({series.data[0].date} → {series.data[-1].date})" if series.data else ""
        logger.info(f"   • {series.metric_name}: {pts} نقطة{dr}")
    
    return merge_source_into_json("bitcoin.json", "cryptoquant_charts", charts)


# ══════════════════════════════════════════════════════════════════
# � CryptoQuant Studio (Multi-Asset)
# ══════════════════════════════════════════════════════════════════

def fetch_and_save_cryptoquant_studio(max_charts: int = 0):
    """جلب وحفظ شارتات متعددة الأصول من CryptoQuant Studio"""
    logger.info("=" * 60)
    logger.info("📈 CryptoQuant Studio — بدء خط الأنابيب")
    logger.info("=" * 60)

    from crawler.cryptoquant.pipeline import CryptoQuantPipeline

    pipeline = CryptoQuantPipeline(
        headless=False,
        max_metrics_per_asset=max_charts,
        use_page_crawl=True,
    )

    result = pipeline.run()
    total = result.get("summary", {}).get("total_charts", 0)
    saved = result.get("summary", {}).get("assets_saved", 0)

    logger.info(f"📊 CryptoQuant Studio: {total} شارت لـ {saved} أصل")
    return saved > 0


# ══════════════════════════════════════════════════════════════════
# �🚀 Main
# ══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="جلب وحفظ شارتات من مصادر خارجية")
    parser.add_argument(
        "--source",
        choices=["blockchain", "cryptoquant", "cryptoquant-studio", "all"],
        default="all",
        help="المصدر المراد جلبه (افتراضي: all)",
    )
    parser.add_argument(
        "--max-charts",
        type=int,
        default=33,
        help="أقصى عدد شارتات (افتراضي: 33)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.5,
        help="تأخير بين الطلبات بالثواني (افتراضي: 1.5)",
    )
    args = parser.parse_args()

    results = []

    if args.source in ("blockchain", "all"):
        ok = fetch_and_save_blockchain(
            max_charts=args.max_charts,
            delay=args.delay,
        )
        results.append(("Blockchain.com", ok))

    if args.source in ("cryptoquant", "all"):
        ok = fetch_and_save_cryptoquant(
            max_charts=min(args.max_charts, 9),
            delay=max(args.delay, 3.0),
        )
        results.append(("CryptoQuant", ok))

    if args.source in ("cryptoquant-studio", "all"):
        ok = fetch_and_save_cryptoquant_studio(
            max_charts=args.max_charts,
        )
        results.append(("CryptoQuant Studio", ok))

    # ملخص نهائي
    logger.info(f"\n{'═' * 60}")
    logger.info(f"🏁 النتائج النهائية:")
    for name, ok in results:
        status = "✅ نجاح" if ok else "⛔ فشل"
        logger.info(f"   {name}: {status}")
    logger.info(f"{'═' * 60}")


if __name__ == "__main__":
    main()
