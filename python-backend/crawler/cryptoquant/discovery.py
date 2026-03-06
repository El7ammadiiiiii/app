"""
🔍 CryptoQuant Studio — Auto-Discovery Engine
===============================================
اكتشاف تلقائي لكل الأصول والفئات والمقاييس المتاحة من CryptoQuant.

يستخدم نقطتي API:
    1. GET /live/v4/assets → قائمة كل الأصول مع IDs
    2. GET /live/v4/assets/{assetId}/ms → كل الفئات والمقاييس لأصل معين

النتيجة: ملف سجل JSON لكل أصل يحتوي على شجرة كاملة:
    {
        "asset_id": "61712eb35a176168a02409e8",
        "symbol": "btc",
        "discovered_at": "...",
        "categories": {
            "exchange-flows": {
                "name": "Exchange Flows",
                "metrics": [
                    {"id": "...", "name": "Exchange Reserve", "slug": "..."},
                    ...
                ]
            }
        }
    }
"""

import os
import sys
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from loguru import logger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from crawler.cryptoquant.config import (
    BASE_URL, SITE_URL, TARGET_ASSETS, ASSET_INFO,
    REGISTRY_DIR, CHROME_PATHS, BROWSER_ARGS,
    WARMUP_WAIT, CHALLENGE_WAIT, MAX_CHALLENGE_RETRIES,
)


class CryptoQuantDiscovery:
    """محرك الاكتشاف التلقائي — يكتشف كل المقاييس لكل أصل مستهدف"""

    def __init__(self, headless: bool = False):
        self.headless = headless
        self._browser = None
        self._warmed_up = False

    # ─── إدارة المتصفح ──────────────────────────────────────

    def _ensure_browser(self):
        """تشغيل المتصفح عند الحاجة"""
        if self._browser is not None:
            return
        try:
            from DrissionPage import ChromiumPage, ChromiumOptions
        except ImportError:
            logger.error("❌ DrissionPage غير مثبت: pip install DrissionPage")
            raise

        co = ChromiumOptions()
        for p in CHROME_PATHS:
            if os.path.exists(p):
                co.set_browser_path(p)
                break

        if self.headless:
            co.headless()

        for arg in BROWSER_ARGS:
            co.set_argument(arg)

        self._browser = ChromiumPage(co)
        logger.info("🌐 Discovery — تم تشغيل المتصفح")

    def _warmup(self):
        """زيارة الصفحة الرئيسية لتجاوز Cloudflare"""
        if self._warmed_up:
            return
        self._ensure_browser()
        logger.info("🔄 Discovery — تسخين (تجاوز Cloudflare)...")
        self._browser.get(f"{SITE_URL}/")
        time.sleep(WARMUP_WAIT)

        for attempt in range(MAX_CHALLENGE_RETRIES):
            title = (self._browser.title or "").lower()
            if any(w in title for w in ["just a moment", "checking", "cloudflare"]):
                logger.info(f"  ⏳ تحدي Cloudflare... محاولة {attempt + 1}")
                time.sleep(CHALLENGE_WAIT)
            else:
                break

        self._warmed_up = True
        logger.info("✅ Discovery — تم تجاوز Cloudflare")

    def _fetch_json(self, url: str) -> Optional[dict]:
        """جلب JSON من API عبر المتصفح"""
        self._warmup()
        try:
            self._browser.get(url)
            time.sleep(2)
            body = self._browser.ele("tag:pre") or self._browser.ele("tag:body")
            if not body:
                return None
            text = body.text.strip()
            if not text.startswith("{") and not text.startswith("["):
                logger.warning(f"⚠️ استجابة غير JSON من {url}")
                return None
            return json.loads(text)
        except Exception as e:
            logger.error(f"❌ خطأ جلب {url}: {e}")
            return None

    # ─── اكتشاف الأصول ──────────────────────────────────────

    def discover_all_assets(self) -> Dict[str, dict]:
        """
        اكتشاف كل الأصول المتاحة وإرجاع القائمة الكاملة.
        Returns: {symbol: {id, name, symbol, ...}}
        """
        logger.info("🔍 اكتشاف الأصول المتاحة...")
        url = f"{BASE_URL}/live/v4/assets"
        data = self._fetch_json(url)

        if not data:
            logger.error("❌ فشل جلب قائمة الأصول")
            return {}

        assets = {}
        # الاستجابة قد تكون مصفوفة أو قاموس بمفتاح 'data' أو 'assets'
        items = data if isinstance(data, list) else data.get("data", data.get("assets", []))

        for item in items:
            if isinstance(item, dict):
                symbol = (item.get("symbol", "") or item.get("slug", "")).lower()
                asset_id = item.get("_id", "") or item.get("id", "")
                raw_name = item.get("name", symbol.upper())
                name = self._extract_en(raw_name) if isinstance(raw_name, dict) else (raw_name or symbol.upper())
                if symbol and asset_id:
                    assets[symbol] = {
                        "id": asset_id,
                        "name": name,
                        "symbol": symbol,
                        "raw": item,
                    }

        logger.info(f"✅ تم اكتشاف {len(assets)} أصل")
        for sym in TARGET_ASSETS:
            if sym in assets:
                logger.info(f"  ✅ {sym} → {assets[sym]['id']}")
            else:
                logger.warning(f"  ⚠️ {sym} غير موجود في القائمة")

        return assets

    def discover_asset_metrics(self, asset_id: str, symbol: str) -> Dict[str, Any]:
        """
        اكتشاف كل الفئات والمقاييس لأصل معين.
        Returns: {category_slug: {name, metrics: [{id, name, slug, ...}]}}

        بنية الاستجابة الفعلية:
        {
          "categories": [
            {
              "id": "...", "path": "exchange-flows",
              "name": {"en": "Exchange Flows", "ko": "..."},
              "metrics": [
                {"id": "...", "title": {"en": "Exchange Reserve"}, "path": "exchange-reserve",
                 "minimumPlanType": "free|advanced|professional", ...}
              ]
            }
          ]
        }
        """
        logger.info(f"🔍 اكتشاف مقاييس {symbol} (ID: {asset_id})...")
        url = f"{BASE_URL}/live/v4/assets/{asset_id}/ms"
        data = self._fetch_json(url)

        if not data:
            logger.error(f"❌ فشل جلب مقاييس {symbol}")
            return {}

        # بنية API الحقيقية: {"categories": [...]}
        raw_categories = data.get("categories", [])
        if not raw_categories:
            logger.warning(f"⚠️ لا توجد فئات في استجابة {symbol}")
            return {}

        parsed_categories = {}
        total_metrics = 0
        free_metrics = 0

        for cat in raw_categories:
            if not isinstance(cat, dict):
                continue

            cat_slug = cat.get("path", "") or self._slugify(self._extract_en(cat.get("name", "")))
            cat_name = self._extract_en(cat.get("name", ""))
            if not cat_slug:
                continue

            metrics_list = cat.get("metrics", [])
            total_metrics += len(metrics_list)

            free = []
            for metric in metrics_list:
                if not isinstance(metric, dict):
                    continue

                # minimumPlanType: "free" = مجاني — أي شيء آخر = مدفوع
                plan = (metric.get("minimumPlanType", "") or "").lower()
                is_premium = plan not in ("", "free")

                metric_id = metric.get("id", "") or metric.get("_id", "")
                metric_name = self._extract_en(metric.get("title", ""))
                metric_slug = metric.get("path", "") or self._slugify(metric_name)
                description = self._extract_en(metric.get("description", ""))

                if not metric_id or not metric_name:
                    continue

                entry = {
                    "id": metric_id,
                    "name": metric_name,
                    "slug": metric_slug,
                    "description": description[:200] if description else "",
                    "plan": plan or "free",
                    "is_premium": is_premium,
                }

                if not is_premium:
                    free.append(entry)

            free_metrics += len(free)

            if free:
                parsed_categories[cat_slug] = {
                    "name": cat_name,
                    "metrics": free,
                    "total_count": len(metrics_list),
                    "free_count": len(free),
                }

        logger.info(f"✅ {symbol}: {len(parsed_categories)} فئة، {free_metrics}/{total_metrics} مقياس مجاني")
        for slug, cat in parsed_categories.items():
            logger.info(f"  📁 {cat['name']}: {cat['free_count']}/{cat['total_count']} مقياس")

        return parsed_categories

    # ─── التشغيل الكامل ──────────────────────────────────────

    def run_full_discovery(self, symbols: Optional[List[str]] = None) -> Dict[str, dict]:
        """
        تشغيل اكتشاف كامل لكل الأصول المستهدفة.
        يحفظ النتائج في ملفات سجل.
        """
        symbols = symbols or TARGET_ASSETS
        logger.info(f"🚀 بدء الاكتشاف الكامل لـ {len(symbols)} أصل: {symbols}")

        # 1. اكتشاف الأصول
        all_assets = self.discover_all_assets()
        if not all_assets:
            logger.error("❌ فشل اكتشاف الأصول")
            return {}

        results = {}
        for symbol in symbols:
            if symbol not in all_assets:
                # محاولة البحث بكل الطرق الممكنة
                found = False
                for key, val in all_assets.items():
                    if (symbol.replace("-", "") in key or
                        key in symbol or
                        val.get("name", "").lower().replace(" ", "-") == symbol):
                        all_assets[symbol] = val
                        found = True
                        break
                if not found:
                    logger.warning(f"⚠️ تخطي {symbol} — غير موجود")
                    continue

            asset = all_assets[symbol]
            categories = self.discover_asset_metrics(asset["id"], symbol)

            if categories:
                registry = {
                    "asset_id": asset["id"],
                    "symbol": symbol,
                    "name": asset["name"],
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                    "categories": categories,
                    "total_categories": len(categories),
                    "total_free_metrics": sum(
                        cat["free_count"] for cat in categories.values()
                    ),
                }

                # حفظ الملف
                reg_path = REGISTRY_DIR / f"cryptoquant_{symbol}.json"
                with open(reg_path, "w", encoding="utf-8") as f:
                    json.dump(registry, f, ensure_ascii=False, indent=2)

                logger.info(f"💾 تم حفظ سجل {symbol} → {reg_path}")
                results[symbol] = registry

            time.sleep(2)

        # ملخص
        logger.info(f"\n{'═' * 60}")
        logger.info(f"🏁 ملخص الاكتشاف:")
        for sym, reg in results.items():
            logger.info(f"  {sym}: {reg['total_categories']} فئة، {reg['total_free_metrics']} مقياس مجاني")
        logger.info(f"{'═' * 60}")

        return results

    # ─── أدوات مساعدة ──────────────────────────────────────

    @staticmethod
    def _extract_en(val) -> str:
        """استخراج النص الإنجليزي من حقل متعدد اللغات"""
        if isinstance(val, dict):
            return val.get("en", "") or val.get("ko", "") or ""
        if isinstance(val, str):
            return val
        return ""

    @staticmethod
    def _slugify(text: str) -> str:
        """تحويل نص إلى slug"""
        import re
        text = text.lower().strip()
        text = re.sub(r"[^a-z0-9\s-]", "", text)
        text = re.sub(r"[\s]+", "-", text)
        return text.strip("-")

    def close(self):
        """إغلاق المتصفح"""
        if self._browser:
            try:
                self._browser.quit()
            except Exception:
                pass
            self._browser = None

    def __del__(self):
        self.close()


# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="CryptoQuant Auto-Discovery")
    parser.add_argument("--asset", type=str, help="أصل محدد (btc, eth, xrp, all-stablecoins)")
    parser.add_argument("--headless", action="store_true", help="تشغيل بدون واجهة")
    args = parser.parse_args()

    discovery = CryptoQuantDiscovery(headless=args.headless)
    try:
        symbols = [args.asset] if args.asset else None
        results = discovery.run_full_discovery(symbols)
        for sym, reg in results.items():
            print(f"\n{sym}:")
            for cat_slug, cat in reg["categories"].items():
                print(f"  {cat['name']} ({cat['free_count']} free):")
                for m in cat["metrics"][:3]:
                    print(f"    - {m['name']} [{m['id'][:8]}...]")
                if len(cat["metrics"]) > 3:
                    print(f"    ... +{len(cat['metrics']) - 3} more")
    finally:
        discovery.close()
