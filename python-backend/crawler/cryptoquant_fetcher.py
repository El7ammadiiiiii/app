"""
📈 CryptoQuant Chart Fetcher
===============================
جلب بيانات شارتات Bitcoin من CryptoQuant عبر DrissionPage
(محمي بـ Cloudflare — يحتاج متصفح حقيقي)

المقاييس المتاحة:
    - Exchange Reserves, Netflow, Inflow
    - Exchange Whale Ratio
    - MVRV Ratio
    - Open Interest, Funding Rates
    - Taker Buy/Sell Ratio
    - Coinbase Premium Index

API Format:
    GET https://api.cryptoquant.com/live/v4/ms/{metricId}/charts/preview
    Response: {"previewWindow":"HOUR","chartStyle":"LINE","lastValue":...,
               "dataKeys":["datetime","metric"],"data":[[ts_ms, value],...]}
"""

import time
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional
from loguru import logger

from crawler.models import ChartDataPoint, ChartTimeSeries


# ══════════════════════════════════════════════════════════════════
# 📊 خريطة المقاييس: metricId → key & name
# ══════════════════════════════════════════════════════════════════

CRYPTOQUANT_METRICS: Dict[str, dict] = {
    "61762641142904287d6a7ecb": {
        "key": "exchange_reserve",
        "name": "Exchange Reserve (BTC)",
        "data_field": "reserve",
        "unit": "BTC",
    },
    "61762aa9142904287d6a7f18": {
        "key": "exchange_netflow",
        "name": "Exchange Netflow (BTC)",
        "data_field": "netflow_total",
        "unit": "BTC",
    },
    "61762cae142904287d6a7f39": {
        "key": "exchange_inflow",
        "name": "Exchange Inflow (BTC)",
        "data_field": "inflow_total",
        "unit": "BTC",
    },
    "617635b5142904287d6a8094": {
        "key": "exchange_whale_ratio",
        "name": "Exchange Whale Ratio",
        "data_field": "exchange_whale_ratio",
        "unit": "ratio",
    },
    "61764227142904287d6a80fa": {
        "key": "mvrv",
        "name": "MVRV Ratio (CryptoQuant)",
        "data_field": "mvrv",
        "unit": "ratio",
    },
    "61822e3e636af2229bbd4be0": {
        "key": "open_interest",
        "name": "Open Interest (USD)",
        "data_field": "open_interest",
        "unit": "USD",
    },
    "61822eeb636af2229bbd4be1": {
        "key": "funding_rates",
        "name": "Funding Rates",
        "data_field": "funding_rates",
        "unit": "%",
    },
    "61822f9c636af2229bbd4be3": {
        "key": "taker_buy_sell_ratio",
        "name": "Taker Buy/Sell Ratio",
        "data_field": "taker_buy_sell_ratio",
        "unit": "ratio",
    },
    "61823101636af2229bbd4be9": {
        "key": "coinbase_premium",
        "name": "Coinbase Premium Index",
        "data_field": "coinbase_premium_index",
        "unit": "index",
    },
}

API_BASE = "https://api.cryptoquant.com/live/v4/ms"


class CryptoQuantFetcher:
    """جلب شارتات Bitcoin من CryptoQuant عبر DrissionPage"""

    def __init__(self, headless: bool = False, delay: float = 3.0):
        self.headless = headless
        self.delay = delay
        self._browser = None
        self._warmed_up = False

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

        # كشف مسار Chrome / Edge / Brave
        import os
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            # Edge
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
            # Brave
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        ]
        for p in chrome_paths:
            if os.path.exists(p):
                co.set_browser_path(p)
                break

        if self.headless:
            co.headless()

        co.set_argument("--disable-blink-features=AutomationControlled")
        co.set_argument("--no-first-run")
        co.set_argument("--disable-extensions")

        self._browser = ChromiumPage(co)
        logger.info("🌐 CryptoQuant — تم تشغيل المتصفح")

    def _warmup(self):
        """زيارة الصفحة الرئيسية أولاً لتجاوز Cloudflare"""
        if self._warmed_up:
            return
        self._ensure_browser()
        logger.info("🔄 CryptoQuant — تسخين (تجاوز Cloudflare)...")
        self._browser.get("https://cryptoquant.com/")
        time.sleep(6)

        # انتظار حل التحدي
        for attempt in range(5):
            title = self._browser.title.lower() if self._browser.title else ""
            if "just a moment" in title or "checking" in title or "cloudflare" in title:
                logger.info(f"  ⏳ تحدي Cloudflare... محاولة {attempt+1}")
                time.sleep(5)
            else:
                break

        self._warmed_up = True
        logger.info("✅ CryptoQuant — تم تجاوز Cloudflare")

    def _fetch_metric(self, metric_id: str) -> Optional[dict]:
        """جلب بيانات مقياس واحد"""
        self._warmup()
        url = f"{API_BASE}/{metric_id}/charts/preview"
        try:
            self._browser.get(url)
            time.sleep(2)
            # استخراج JSON من الصفحة
            body = self._browser.ele("tag:pre") or self._browser.ele("tag:body")
            if not body:
                return None
            text = body.text.strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"❌ خطأ جلب {metric_id}: {e}")
            return None

    def _parse_chart(self, metric_id: str, api_data: dict) -> Optional[ChartTimeSeries]:
        """تحويل استجابة CryptoQuant إلى ChartTimeSeries"""
        meta = CRYPTOQUANT_METRICS.get(metric_id)
        if not meta:
            return None

        raw_data = api_data.get("data", [])
        data_keys = api_data.get("dataKeys", [])
        if not raw_data or len(data_keys) < 2:
            logger.warning(f"⚠️ لا توجد بيانات لـ {meta['key']}")
            return None

        # تحديد أعمدة البيانات
        ts_idx = 0  # أول عمود = timestamp
        val_idx = 1  # ثاني عمود = القيمة

        data_points: List[ChartDataPoint] = []
        for row in raw_data:
            if len(row) < 2:
                continue
            ts_ms = row[ts_idx]
            val = row[val_idx]
            if ts_ms and val is not None:
                try:
                    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
                    data_points.append(ChartDataPoint(
                        date=dt.strftime("%Y-%m-%d"),
                        value=float(val),
                        timestamp=int(ts_ms),
                    ))
                except (ValueError, OSError):
                    continue

        if len(data_points) < 2:
            logger.warning(f"⚠️ نقاط بيانات غير كافية لـ {meta['key']}: {len(data_points)}")
            return None

        # تجميع البيانات بالساعة → يومياً (أخذ آخر نقطة لكل يوم)
        daily: Dict[str, ChartDataPoint] = {}
        for dp in data_points:
            daily[dp.date] = dp  # آخر نقطة لكل يوم تكفي
        data_points = sorted(daily.values(), key=lambda p: p.timestamp)

        return ChartTimeSeries(
            metric_key=meta["key"],
            metric_name=meta["name"],
            data=data_points,
            unit=meta.get("unit", ""),
            description=f"CryptoQuant: {meta['name']}",
        )

    def fetch_all_charts(
        self,
        max_charts: int = 9,
        metric_ids: Optional[List[str]] = None,
    ) -> Dict[str, ChartTimeSeries]:
        """جلب كل المقاييس أو مجموعة محددة"""
        ids = metric_ids or list(CRYPTOQUANT_METRICS.keys())
        ids = ids[:max_charts]

        logger.info(f"📈 CryptoQuant — جلب {len(ids)} مقياس (delay={self.delay}s)")

        results: Dict[str, ChartTimeSeries] = {}
        success = 0
        fail = 0

        for i, mid in enumerate(ids):
            meta = CRYPTOQUANT_METRICS.get(mid, {})
            key = meta.get("key", mid)
            logger.info(f"  [{i+1}/{len(ids)}] {key}")

            api_data = self._fetch_metric(mid)
            if api_data:
                series = self._parse_chart(mid, api_data)
                if series:
                    results[key] = series
                    success += 1
                    logger.info(f"    ✅ {len(series.data)} points (daily)")
                else:
                    fail += 1
                    logger.warning(f"    ⛔ فشل التحليل")
            else:
                fail += 1
                logger.warning(f"    ⛔ فشل الجلب")

            if i < len(ids) - 1:
                time.sleep(self.delay)

        logger.info(f"📈 CryptoQuant — ✅ {success} نجح | ⛔ {fail} فشل")
        return results

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
    fetcher = CryptoQuantFetcher(delay=2.0)
    try:
        charts = fetcher.fetch_all_charts(max_charts=3)
        for key, series in charts.items():
            print(f"  {key}: {len(series.data)} نقطة — آخر: {series.data[-1].date}")
    finally:
        fetcher.close()
