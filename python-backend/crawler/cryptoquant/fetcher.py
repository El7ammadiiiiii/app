"""
📥 CryptoQuant Studio — Multi-Asset Fetcher
=============================================
جلب بيانات الشارتات عبر DrissionPage مع اعتراض الشبكة (90+ يوم).

استراتيجيتان:
    1. Preview API (سريع، 7 أيام فقط) — fallback
    2. Page Crawl + Network Intercept (بطيء، 90+ يوم) — أساسي

State Tracking:
    يحفظ حالة الجلب لكل أصل لتجنب إعادة جلب البيانات غير المتغيرة.
"""

import os
import sys
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from loguru import logger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from crawler.models import ChartDataPoint, ChartTimeSeries
from crawler.cryptoquant.config import (
    BASE_URL, SITE_URL, TARGET_ASSETS, ASSET_INFO,
    STATE_DIR, CHROME_PATHS, BROWSER_ARGS,
    WARMUP_WAIT, CHALLENGE_WAIT, MAX_CHALLENGE_RETRIES,
    DELAY_BETWEEN_METRICS, PAGE_LOAD_WAIT, NETWORK_INTERCEPT_WAIT,
    FETCH_STATE_TTL_HOURS, CATEGORY_CHART_TYPE, MetricType,
    CHARTS_SOURCE_KEY,
)
from crawler.cryptoquant.registry import RegistryManager


class CryptoQuantStudioFetcher:
    """جلب بيانات CryptoQuant لعدة أصول — preview API أو page crawl"""

    def __init__(
        self,
        headless: bool = False,
        delay: float = DELAY_BETWEEN_METRICS,
        use_page_crawl: bool = True,
        max_metrics_per_asset: int = 0,  # 0 = unlimited
    ):
        self.headless = headless
        self.delay = delay
        self.use_page_crawl = use_page_crawl
        self.max_metrics_per_asset = max_metrics_per_asset
        self._browser = None
        self._warmed_up = False
        self._registry = RegistryManager()

    # ─── إدارة المتصفح ──────────────────────────────────────

    def _ensure_browser(self):
        if self._browser is not None:
            return
        try:
            from DrissionPage import ChromiumPage, ChromiumOptions
        except ImportError:
            logger.error("❌ DrissionPage غير مثبت")
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
        logger.info("🌐 Fetcher — تم تشغيل المتصفح")

    def _warmup(self):
        if self._warmed_up:
            return
        self._ensure_browser()
        logger.info("🔄 Fetcher — تسخين (تجاوز Cloudflare)...")
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
        logger.info("✅ Fetcher — تم تجاوز Cloudflare")

    # ─── جلب عبر Preview API (7 أيام) ──────────────────────

    def _fetch_preview(self, metric_id: str) -> Optional[dict]:
        """جلب بيانات سريعة عبر Preview API"""
        self._warmup()
        url = f"{BASE_URL}/live/v4/ms/{metric_id}/charts/preview"
        try:
            self._browser.get(url)
            time.sleep(2)
            body = self._browser.ele("tag:pre") or self._browser.ele("tag:body")
            if not body:
                return None
            text = body.text.strip()
            if not text.startswith("{"):
                return None
            return json.loads(text)
        except Exception as e:
            logger.error(f"❌ Preview خطأ {metric_id}: {e}")
            return None

    # ─── جلب عبر Page Crawl (90+ يوم) ──────────────────────

    def _fetch_page_crawl(self, symbol: str, category_slug: str, metric_slug: str, metric_id: str) -> Optional[dict]:
        """
        جلب بيانات كاملة عبر زيارة صفحة الشارت واعتراض الشبكة.
        """
        self._warmup()
        try:
            # بدء الاستماع لاستجابات الشبكة
            self._browser.listen.start(f"api.cryptoquant.com")

            # زيارة صفحة الشارت (مع الفئة)
            page_url = f"{SITE_URL}/asset/{symbol}/chart/{category_slug}/{metric_slug}"
            self._browser.get(page_url)
            time.sleep(PAGE_LOAD_WAIT)

            # انتظار واعتراض استجابة API
            chart_data = None
            deadline = time.time() + NETWORK_INTERCEPT_WAIT

            while time.time() < deadline:
                packets = self._browser.listen.steps()
                for packet in packets:
                    try:
                        url = packet.url if hasattr(packet, 'url') else str(packet)
                        if "charts" in url and metric_id in url:
                            resp = packet.response
                            if hasattr(resp, 'body'):
                                body = resp.body
                                if isinstance(body, str):
                                    chart_data = json.loads(body)
                                elif isinstance(body, dict):
                                    chart_data = body
                                if chart_data:
                                    break
                    except Exception:
                        continue

                if chart_data:
                    break
                time.sleep(0.5)

            self._browser.listen.stop()
            return chart_data

        except Exception as e:
            logger.error(f"❌ Page crawl خطأ {metric_slug}: {e}")
            try:
                self._browser.listen.stop()
            except Exception:
                pass
            return None

    # ─── تحويل البيانات ──────────────────────────────────────

    def _parse_chart_data(
        self,
        metric_info: dict,
        api_data: dict,
        category_slug: str = "",
    ) -> Optional[ChartTimeSeries]:
        """تحويل بيانات API إلى ChartTimeSeries"""

        raw_data = api_data.get("data", [])
        data_keys = api_data.get("dataKeys", [])

        if not raw_data:
            return None

        # تحديد عمود القيمة
        val_idx = 1
        if len(data_keys) > 1:
            # استخدام أول عمود بعد datetime
            val_idx = 1

        data_points: List[ChartDataPoint] = []
        for row in raw_data:
            if not isinstance(row, (list, tuple)) or len(row) < 2:
                continue
            ts_ms = row[0]
            val = row[val_idx]
            if ts_ms is None or val is None:
                continue
            try:
                dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
                data_points.append(ChartDataPoint(
                    date=dt.strftime("%Y-%m-%d"),
                    value=float(val),
                    timestamp=int(ts_ms),
                ))
            except (ValueError, OSError, TypeError):
                continue

        if len(data_points) < 2:
            return None

        # تجميع يومي (آخر نقطة لكل يوم)
        daily: Dict[str, ChartDataPoint] = {}
        for dp in data_points:
            daily[dp.date] = dp
        data_points = sorted(daily.values(), key=lambda p: p.timestamp)

        metric_key = self._build_metric_key(metric_info, category_slug)
        chart_type = (api_data.get("chartStyle", "LINE") or "LINE").upper()
        unit = metric_info.get("unit", "")

        return ChartTimeSeries(
            metric_key=metric_key,
            metric_name=metric_info.get("name", metric_key),
            data=data_points,
            unit=unit,
            description=metric_info.get("description", ""),
        )

    @staticmethod
    def _build_metric_key(metric_info: dict, category_slug: str) -> str:
        """بناء مفتاح فريد للمقياس: category__slug"""
        slug = metric_info.get("slug", "")
        if not slug:
            slug = metric_info.get("name", "unknown").lower().replace(" ", "_")
        if category_slug:
            return f"{category_slug}__{slug}"
        return slug

    # ─── State Management ──────────────────────────────────

    def _state_path(self, symbol: str) -> str:
        return str(STATE_DIR / f"fetch_state_{symbol}.json")

    def _load_state(self, symbol: str) -> dict:
        path = self._state_path(symbol)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"fetched_metrics": {}, "last_run": ""}

    def _save_state(self, symbol: str, state: dict):
        state["last_run"] = datetime.now(timezone.utc).isoformat()
        path = self._state_path(symbol)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)

    def _is_metric_fresh(self, state: dict, metric_id: str) -> bool:
        """هل المقياس مُجلب حديثاً؟"""
        fetched = state.get("fetched_metrics", {}).get(metric_id, {})
        if not fetched:
            return False
        last = fetched.get("fetched_at", "")
        try:
            t = datetime.fromisoformat(last.replace("Z", "+00:00"))
            return (datetime.now(timezone.utc) - t) < timedelta(hours=FETCH_STATE_TTL_HOURS)
        except (ValueError, TypeError):
            return False

    # ─── الجلب الرئيسي ──────────────────────────────────────

    def fetch_asset(
        self,
        symbol: str,
        force: bool = False,
        categories_filter: Optional[List[str]] = None,
    ) -> Dict[str, ChartTimeSeries]:
        """
        جلب كل المقاييس المجانية لأصل واحد.

        Args:
            symbol: رمز الأصل (btc, eth, ...)
            force: تجاهل state والجلب من جديد
            categories_filter: فئات محددة فقط (اختياري)

        Returns: {metric_key: ChartTimeSeries}
        """
        logger.info(f"\n{'═' * 50}")
        logger.info(f"📥 جلب مقاييس {symbol.upper()} من CryptoQuant")
        logger.info(f"{'═' * 50}")

        # 1. جلب المقاييس من السجل
        metrics_by_cat = self._registry.get_metrics_by_category(symbol)
        if not metrics_by_cat:
            logger.error(f"❌ لا يوجد سجل لـ {symbol} — شغّل Discovery أولاً")
            return {}

        # فلترة بالفئة
        if categories_filter:
            metrics_by_cat = {
                k: v for k, v in metrics_by_cat.items()
                if k in categories_filter
            }

        # 2. حالة الجلب
        state = self._load_state(symbol)
        results: Dict[str, ChartTimeSeries] = {}
        success = 0
        skipped = 0
        failed = 0
        total = 0

        for cat_slug, metrics in metrics_by_cat.items():
            logger.info(f"\n📁 {cat_slug}:")
            for metric in metrics:
                total += 1
                if self.max_metrics_per_asset and total > self.max_metrics_per_asset:
                    break

                metric_id = metric.get("id", "")
                metric_name = metric.get("name", "?")
                metric_slug = metric.get("slug", "")

                # تخطي إذا مُجلب حديثاً
                if not force and self._is_metric_fresh(state, metric_id):
                    skipped += 1
                    logger.info(f"  ⏭️ {metric_name} (مُجلب حديثاً)")
                    continue

                logger.info(f"  📊 [{total}] {metric_name}...")

                # محاولة جلب
                api_data = None
                if self.use_page_crawl and metric_slug:
                    api_data = self._fetch_page_crawl(symbol, cat_slug, metric_slug, metric_id)
                    if not api_data:
                        # Fallback: ربما بدون الفئة؟
                        pass

                if not api_data:
                    api_data = self._fetch_preview(metric_id)

                if api_data:
                    series = self._parse_chart_data(metric, api_data, cat_slug)
                    if series:
                        key = series.metric_key
                        results[key] = series
                        success += 1
                        days = len(series.data)
                        logger.info(f"    ✅ {days} نقطة يومية")

                        # تحديث الحالة
                        state.setdefault("fetched_metrics", {})[metric_id] = {
                            "fetched_at": datetime.now(timezone.utc).isoformat(),
                            "points": days,
                            "key": key,
                        }
                    else:
                        failed += 1
                        logger.warning(f"    ⛔ فشل التحليل")
                else:
                    failed += 1
                    logger.warning(f"    ⛔ فشل الجلب")

                time.sleep(self.delay)

            if self.max_metrics_per_asset and total >= self.max_metrics_per_asset:
                logger.info(f"  ⏹️ الحد الأقصى ({self.max_metrics_per_asset}) — إيقاف")
                break

        # حفظ الحالة
        self._save_state(symbol, state)

        logger.info(f"\n📊 {symbol}: ✅ {success} | ⏭️ {skipped} | ⛔ {failed}")
        return results

    def fetch_all_assets(
        self,
        force: bool = False,
        symbols: Optional[List[str]] = None,
    ) -> Dict[str, Dict[str, ChartTimeSeries]]:
        """
        جلب بيانات كل الأصول المستهدفة.
        Returns: {symbol: {metric_key: ChartTimeSeries}}
        """
        symbols = symbols or TARGET_ASSETS
        all_results = {}

        for symbol in symbols:
            charts = self.fetch_asset(symbol, force=force)
            if charts:
                all_results[symbol] = charts

        return all_results

    # ─── تنظيف ──────────────────────────────────────────────

    def close(self):
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

    parser = argparse.ArgumentParser(description="CryptoQuant Studio Fetcher")
    parser.add_argument("--asset", type=str, default="btc", help="الأصل (btc, eth, ...)")
    parser.add_argument("--max", type=int, default=5, help="حد المقاييس")
    parser.add_argument("--force", action="store_true", help="جلب من جديد")
    parser.add_argument("--preview-only", action="store_true", help="Preview API فقط")
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    fetcher = CryptoQuantStudioFetcher(
        headless=args.headless,
        use_page_crawl=not args.preview_only,
        max_metrics_per_asset=args.max,
    )
    try:
        charts = fetcher.fetch_asset(args.asset, force=args.force)
        print(f"\n📊 النتيجة: {len(charts)} شارت")
        for key, series in charts.items():
            print(f"  {key}: {len(series.data)} نقطة — آخر: {series.data[-1].date}")
    finally:
        fetcher.close()
