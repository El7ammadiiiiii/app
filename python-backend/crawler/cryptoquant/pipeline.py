"""
🔄 CryptoQuant Studio — Pipeline Orchestrator
===============================================
خط أنابيب متكامل: اكتشاف → سجل → جلب → حفظ → تنظيف

الاستخدام:
    python -m crawler.cryptoquant.pipeline                    # كل الأصول
    python -m crawler.cryptoquant.pipeline --asset btc        # أصل محدد
    python -m crawler.cryptoquant.pipeline --discover-only    # اكتشاف فقط
    python -m crawler.cryptoquant.pipeline --fetch-only       # جلب فقط
    python -m crawler.cryptoquant.pipeline --max 10           # حد المقاييس
    python -m crawler.cryptoquant.pipeline --force            # تجاهل cache
"""

import os
import sys
import json
import dataclasses
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Optional
from loguru import logger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from crawler.models import ChartTimeSeries
from crawler.cryptoquant.config import (
    TARGET_ASSETS, ASSET_JSON_MAP, ASSET_INFO,
    DATA_DIR, LOG_DIR, CHARTS_SOURCE_KEY, CATEGORIES_SOURCE_KEY,
)
from crawler.cryptoquant.discovery import CryptoQuantDiscovery
from crawler.cryptoquant.registry import RegistryManager
from crawler.cryptoquant.fetcher import CryptoQuantStudioFetcher


class CryptoQuantPipeline:
    """
    خط الأنابيب المتكامل — يدير العملية الكاملة من الاكتشاف إلى الحفظ.

    المراحل:
        1. Discovery: اكتشاف الأصول والمقاييس وبناء السجل
        2. Fetch: جلب بيانات الشارتات عبر DrissionPage
        3. Save: حفظ في ملفات JSON + فئات القائمة الجانبية
    """

    def __init__(
        self,
        headless: bool = False,
        max_metrics_per_asset: int = 0,
        use_page_crawl: bool = True,
    ):
        self.headless = headless
        self.max_metrics_per_asset = max_metrics_per_asset
        self.use_page_crawl = use_page_crawl
        self._registry = RegistryManager()

    # ─── المرحلة 1: الاكتشاف ──────────────────────────────

    def run_discovery(
        self,
        symbols: Optional[List[str]] = None,
        force: bool = False,
    ) -> Dict[str, dict]:
        """اكتشاف الأصول والمقاييس — يتخطى الأصول الصالحة"""
        symbols = symbols or TARGET_ASSETS

        # فحص أي أصول تحتاج تحديث
        if not force:
            stale = [s for s in symbols if not self._registry.is_registry_fresh(s)]
            if not stale:
                logger.info("✅ كل السجلات صالحة — لا حاجة للاكتشاف")
                return {}
            symbols = stale
            logger.info(f"🔍 اكتشاف {len(symbols)} أصل منتهي الصلاحية: {symbols}")

        discovery = CryptoQuantDiscovery(headless=self.headless)
        try:
            results = discovery.run_full_discovery(symbols)
            # إبطال cache السجل
            self._registry.invalidate_cache()
            return results
        finally:
            discovery.close()

    # ─── المرحلة 2: الجلب ──────────────────────────────────

    def run_fetch(
        self,
        symbols: Optional[List[str]] = None,
        force: bool = False,
    ) -> Dict[str, Dict[str, ChartTimeSeries]]:
        """جلب بيانات الشارتات لكل الأصول"""
        symbols = symbols or TARGET_ASSETS

        fetcher = CryptoQuantStudioFetcher(
            headless=self.headless,
            use_page_crawl=self.use_page_crawl,
            max_metrics_per_asset=self.max_metrics_per_asset,
        )
        try:
            return fetcher.fetch_all_assets(force=force, symbols=symbols)
        finally:
            fetcher.close()

    # ─── المرحلة 3: الحفظ ──────────────────────────────────

    def save_results(
        self,
        all_charts: Dict[str, Dict[str, ChartTimeSeries]],
    ) -> Dict[str, bool]:
        """حفظ نتائج الجلب في ملفات JSON"""
        results = {}

        for symbol, charts in all_charts.items():
            if not charts:
                results[symbol] = False
                continue

            json_filename = ASSET_JSON_MAP.get(symbol)
            if not json_filename:
                logger.warning(f"⚠️ لا يوجد ملف JSON معيّن لـ {symbol}")
                results[symbol] = False
                continue

            json_path = DATA_DIR / json_filename

            # قراءة الملف الحالي
            existing = {}
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                except Exception as e:
                    logger.error(f"❌ خطأ قراءة {json_path}: {e}")

            # ضمان الحقول الأساسية
            info = ASSET_INFO.get(symbol, {})
            if not existing.get("chain_name"):
                existing.update({
                    "chain_name": info.get("name", symbol.upper()),
                    "chain_symbol": info.get("symbol", symbol.upper()),
                    "chain_id": info.get("chain_id", 0),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "crawler_version": "2.0.0",
                })

            # دمج الشارتات
            charts_dict = {
                key: dataclasses.asdict(series)
                for key, series in charts.items()
            }

            # دمج مع البيانات الموجودة (لا نمسح القديم)
            existing_charts = existing.get(CHARTS_SOURCE_KEY, {})
            existing_charts.update(charts_dict)
            existing[CHARTS_SOURCE_KEY] = existing_charts
            existing[f"{CHARTS_SOURCE_KEY}_updated"] = datetime.now(timezone.utc).isoformat()
            existing[f"{CHARTS_SOURCE_KEY}_count"] = len(existing_charts)

            # حفظ قائمة الفئات (للقائمة الجانبية)
            categories = self._registry.get_category_list(symbol)
            if categories:
                existing[CATEGORIES_SOURCE_KEY] = categories
                # ربط كل شارت بفئته
                cat_metrics_map = {}
                for cat in categories:
                    cat_slug = cat["slug"]
                    cat_name = cat["name"]
                    matching_keys = [k for k in existing_charts if k.startswith(f"{cat_slug}__")]
                    if matching_keys:
                        cat_metrics_map[cat_slug] = {
                            "name": cat_name,
                            "chart_type": cat.get("chart_type", "line"),
                            "metrics": matching_keys,
                            "count": len(matching_keys),
                        }
                existing[f"{CATEGORIES_SOURCE_KEY}_map"] = cat_metrics_map

            # حفظ الملف
            try:
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2, default=str)

                size_mb = json_path.stat().st_size / (1024 * 1024)
                logger.info(
                    f"💾 {json_filename}: {len(existing_charts)} شارت "
                    f"({size_mb:.2f} MB)"
                )
                results[symbol] = True
            except Exception as e:
                logger.error(f"❌ خطأ حفظ {json_path}: {e}")
                results[symbol] = False

        return results

    # ─── التشغيل الكامل ──────────────────────────────────

    def run(
        self,
        symbols: Optional[List[str]] = None,
        force: bool = False,
        discover_only: bool = False,
        fetch_only: bool = False,
    ) -> dict:
        """
        تشغيل خط الأنابيب الكامل.

        Returns:
            {
                "discovery": {...},
                "fetch": {symbol: count},
                "save": {symbol: bool},
                "summary": {...}
            }
        """
        symbols = symbols or TARGET_ASSETS
        start = datetime.now()

        logger.info(f"\n{'═' * 60}")
        logger.info(f"🚀 CryptoQuant Studio Pipeline — {', '.join(symbols)}")
        logger.info(f"{'═' * 60}")

        result = {
            "discovery": {},
            "fetch": {},
            "save": {},
            "summary": {},
        }

        # 1. الاكتشاف
        if not fetch_only:
            logger.info("\n📍 المرحلة 1: الاكتشاف")
            result["discovery"] = self.run_discovery(symbols, force)

        if discover_only:
            return result

        # 2. الجلب
        logger.info("\n📍 المرحلة 2: الجلب")
        all_charts = self.run_fetch(symbols, force)
        result["fetch"] = {
            sym: len(charts) for sym, charts in all_charts.items()
        }

        # 3. الحفظ
        logger.info("\n📍 المرحلة 3: الحفظ")
        result["save"] = self.save_results(all_charts)

        # ملخص
        duration = (datetime.now() - start).total_seconds()
        total_charts = sum(result["fetch"].values())
        saved_ok = sum(1 for v in result["save"].values() if v)

        result["summary"] = {
            "duration_seconds": round(duration, 1),
            "total_charts": total_charts,
            "assets_saved": saved_ok,
            "assets_total": len(symbols),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(f"\n{'═' * 60}")
        logger.info(f"🏁 Pipeline اكتمل في {duration:.0f}ث")
        logger.info(f"   📊 {total_charts} شارت | 💾 {saved_ok}/{len(symbols)} أصل")
        for sym in symbols:
            charts_n = result["fetch"].get(sym, 0)
            saved = "✅" if result["save"].get(sym) else "⛔"
            logger.info(f"   {sym}: {charts_n} شارت {saved}")
        logger.info(f"{'═' * 60}")

        return result


# ══════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(
        description="🔄 CryptoQuant Studio Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--asset", type=str, help="أصل محدد (btc, eth, xrp, all-stablecoins)")
    parser.add_argument("--max", type=int, default=0, help="حد المقاييس لكل أصل (0=بدون حد)")
    parser.add_argument("--force", action="store_true", help="تجاهل cache")
    parser.add_argument("--discover-only", action="store_true", help="اكتشاف فقط")
    parser.add_argument("--fetch-only", action="store_true", help="جلب فقط (بدون اكتشاف)")
    parser.add_argument("--preview-only", action="store_true", help="Preview API فقط")
    parser.add_argument("--headless", action="store_true", help="بدون واجهة")
    args = parser.parse_args()

    symbols = [args.asset] if args.asset else None

    pipeline = CryptoQuantPipeline(
        headless=args.headless,
        max_metrics_per_asset=args.max,
        use_page_crawl=not args.preview_only,
    )

    result = pipeline.run(
        symbols=symbols,
        force=args.force,
        discover_only=args.discover_only,
        fetch_only=args.fetch_only,
    )

    # طباعة JSON مختصر
    summary = result.get("summary", {})
    print(f"\n✅ {summary.get('total_charts', 0)} charts saved for {summary.get('assets_saved', 0)} assets in {summary.get('duration_seconds', 0)}s")


if __name__ == "__main__":
    main()
