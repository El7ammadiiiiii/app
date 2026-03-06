"""
🌐 محرك جلب بالمتصفح — Browser Fetcher (DrissionPage)
=======================================================
يستخدم متصفح Chrome/Edge الحقيقي لتجاوز حماية Cloudflare.
يجلب صفحات شارتات Etherscan ويستخرج بيانات Highcharts.

الاستخدام:
    fetcher = BrowserChartFetcher()
    charts = fetcher.crawl_all_charts("ethereum")
    fetcher.close()
"""

import time
import random
from typing import Optional, Dict, List, Any

from loguru import logger

from .config import ETHERSCAN_CHAINS, ChainConfig
from .parsers.chart_pages import parse_chart_page, CHART_METRICS
from .models import ChartTimeSeries


# ══════════════════════════════════════════════════════════════════
# 📊 مسارات الشارتات لكل سلسلة
# ══════════════════════════════════════════════════════════════════
# بعض السلاسل لها مسارات مختلفة لصفحة السعر

CHAIN_PRICE_PATH: Dict[str, str] = {
    "ethereum": "/chart/etherprice",
    "bsc": "/chart/bnbprice",
    "polygon": "/chart/maticprice",
    "arbitrum": "/chart/price",
    "optimism": "/chart/price", 
    "base": "/chart/price",
    "linea": "/chart/price",
    "scroll": "/chart/price",
    "mantle": "/chart/price",
    "blast": "/chart/price",
    "celo": "/chart/price",
    "gnosis": "/chart/price",
    "moonbeam": "/chart/price",
    "moonriver": "/chart/price",
    "polygon_zkevm": "/chart/price",
    "taiko": "/chart/price",
    "fraxtal": "/chart/price",
    "berachain": "/chart/price",
    "worldcoin": "/chart/price",
    "core_dao": "/chart/price",
}

# مسارات العرض الكلي (خاصة بكل سلسلة)
CHAIN_SUPPLY_PATH: Dict[str, str] = {
    "ethereum": "/chart/ethersupplygrowth",
    "bsc": "/chart/bnbsupply",
    "polygon": "/chart/maticsupply",
}

# الشارتات المشتركة بين كل السلاسل (18 مقياس)
COMMON_CHART_PAGES: List[Dict[str, str]] = [
    {"key": "market_cap",          "path": "/chart/marketcap"},
    {"key": "daily_transactions",  "path": "/chart/tx"},
    {"key": "unique_addresses",    "path": "/chart/address"},
    {"key": "active_addresses",    "path": "/chart/active-address"},
    {"key": "avg_gas_price",       "path": "/chart/gasprice"},
    {"key": "avg_gas_limit",       "path": "/chart/gaslimit"},
    {"key": "daily_gas_used",      "path": "/chart/gasused"},
    {"key": "avg_block_size",      "path": "/chart/blocksize"},
    {"key": "avg_block_time",      "path": "/chart/blocktime"},
    {"key": "block_count_rewards", "path": "/chart/blocks"},
    {"key": "daily_block_rewards", "path": "/chart/blockreward"},
    {"key": "network_tx_fee",      "path": "/chart/transactionfee"},
    {"key": "network_utilization", "path": "/chart/networkutilization"},
    {"key": "pending_transactions","path": "/chart/pendingtx"},
    {"key": "verified_contracts",  "path": "/chart/verified-contracts"},
    {"key": "deployed_contracts",  "path": "/chart/deployed-contracts"},
]


class BrowserChartFetcher:
    """
    محرك جلب شارتات بمتصفح حقيقي — يتجاوز Cloudflare تلقائياً.
    """

    def __init__(self, headless: bool = False):
        """
        Args:
            headless: وضع بدون واجهة. False = يفتح نافذة متصفح مرئية
                      (ضروري لتجاوز Cloudflare). True = قد يُحظر.
        """
        self._page = None
        self._headless = headless
        self._request_count = 0

    def _ensure_browser(self):
        """إنشاء المتصفح عند الحاجة فقط (lazy init)"""
        if self._page is not None:
            return

        from DrissionPage import ChromiumPage, ChromiumOptions

        co = ChromiumOptions()
        if self._headless:
            co.headless(True)

        # تحديد مسار المتصفح (Chrome أو Edge)
        import os
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if os.path.exists(chrome_path):
            co.set_browser_path(chrome_path)
        elif os.path.exists(edge_path):
            co.set_browser_path(edge_path)

        co.set_argument('--no-sandbox')
        co.set_argument('--disable-gpu')
        co.set_argument('--disable-dev-shm-usage')
        co.set_argument('--disable-blink-features=AutomationControlled')
        co.set_argument('--window-size=1920,1080')
        co.set_argument('--disable-extensions')

        try:
            self._page = ChromiumPage(co)
            logger.info("🌐 تم فتح المتصفح بنجاح")
        except Exception as e:
            logger.error(f"❌ فشل فتح المتصفح: {e}")
            raise

    def close(self):
        """إغلاق المتصفح"""
        if self._page:
            try:
                self._page.quit()
            except Exception:
                pass
            self._page = None
            logger.info("🔒 تم إغلاق المتصفح")

    def _warmup(self, base_url: str):
        """
        زيارة الصفحة الرئيسية أولاً لتأسيس جلسة Cloudflare وملفات تعريف الارتباط.
        يحل تحدي Cloudflare مرة واحدة ثم جميع الطلبات التالية تمر.
        """
        self._ensure_browser()
        logger.info(f"🔥 تسخين الجلسة: {base_url}")
        self._page.get(base_url)
        time.sleep(3)
        
        # فحص وانتظار تحدي Cloudflare
        for attempt in range(6):
            html = self._page.html or ""
            page_title = self._page.title or ""
            is_cf = (
                "just a moment" in page_title.lower()
                or "_cf_chl_opt" in html
                or "cf-challenge" in html.lower()
            )
            if not is_cf:
                logger.info(f"✅ تم تجاوز Cloudflare بنجاح")
                return True
            wait = 4 + attempt * 2
            logger.info(f"🛡️ Cloudflare challenge ({attempt+1}/6), waiting {wait}s...")
            time.sleep(wait)
        
        logger.warning("⚠️ فشل تجاوز Cloudflare في التسخين")
        return False

    def fetch_page(self, url: str, wait_seconds: float = 5.0) -> Optional[str]:
        """
        جلب صفحة HTML بالمتصفح.
        يُفترض أن _warmup تم استدعاؤها سابقاً لتأسيس جلسة Cloudflare.
        """
        self._ensure_browser()

        try:
            logger.debug(f"🔗 جلب: {url}")
            self._page.get(url)
            time.sleep(wait_seconds)

            html = self._page.html or ""
            self._request_count += 1

            # فحص Cloudflare
            if "_cf_chl_opt" in html or "cf-challenge" in html.lower():
                # محاولة انتظار إضافية
                logger.info("🛡️ Cloudflare challenge on page, waiting...")
                time.sleep(10)
                html = self._page.html or ""
                if "_cf_chl_opt" in html:
                    logger.warning(f"⚠️ Cloudflare لا يزال يحجب")
                    return None

            if len(html) > 5000:
                logger.debug(f"✅ تم جلب {len(html):,} bytes")
                return html
            else:
                logger.warning(f"⚠️ صفحة قصيرة: {len(html)} bytes")
                return None

        except Exception as e:
            logger.error(f"❌ خطأ في جلب {url}: {e}")
            return None

    def crawl_chain_charts(
        self,
        chain_key: str,
        max_charts: int = 15,
        delay: float = 4.0,
    ) -> Dict[str, ChartTimeSeries]:
        """
        🔥 جلب كل شارتات سلسلة واحدة.
        
        Args:
            chain_key: مفتاح السلسلة (مثل "ethereum", "bsc")
            max_charts: أقصى عدد شارتات
            delay: تأخير بين الطلبات (ثواني)
            
        Returns:
            Dict[metric_key, ChartTimeSeries]
        """
        if chain_key not in ETHERSCAN_CHAINS:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return {}

        chain = ETHERSCAN_CHAINS[chain_key]
        base_url = chain.base_url
        results: Dict[str, ChartTimeSeries] = {}

        logger.info(f"{'═' * 60}")
        logger.info(f"📊 جلب شارتات {chain.name} ({base_url})")
        logger.info(f"{'═' * 60}")

        # تسخين الجلسة أولاً (زيارة الصفحة الرئيسية لتجاوز Cloudflare)
        if not self._warmup(base_url):
            logger.error(f"❌ فشل تجاوز Cloudflare لـ {chain.name}")
            return {}

        # بناء قائمة الشارتات
        charts_to_fetch: List[Dict[str, str]] = []

        # 1. شارت السعر (مسار خاص لكل سلسلة)
        price_path = CHAIN_PRICE_PATH.get(chain_key, "/chart/etherprice")
        charts_to_fetch.append({"key": "daily_price", "path": price_path})

        # 2. الشارتات المشتركة
        for chart in COMMON_CHART_PAGES:
            charts_to_fetch.append(chart)

        # 3. شارت العرض الكلي (مسار خاص لكل سلسلة)
        supply_path = CHAIN_SUPPLY_PATH.get(chain_key)
        if supply_path:
            charts_to_fetch.append({"key": "total_supply", "path": supply_path})

        # تحديد العدد
        charts_to_fetch = charts_to_fetch[:max_charts]

        for i, chart_info in enumerate(charts_to_fetch):
            metric_key = chart_info["key"]
            chart_path = chart_info["path"]
            url = f"{base_url}{chart_path}"

            # بناء meta إذا لم يكن موجوداً في CHART_METRICS
            meta_name = CHART_METRICS.get(metric_key, {}).get("name", metric_key)

            try:
                logger.info(f"  [{i+1}/{len(charts_to_fetch)}] 📊 {meta_name}...")

                html = self.fetch_page(url, wait_seconds=3.0)

                if not html:
                    logger.warning(f"  ⚠️ فشل جلب {metric_key}")
                    # تأخير إضافي عند الفشل
                    time.sleep(delay * 2)
                    continue

                # تحليل البيانات
                chart_data = parse_chart_page(html, metric_key)

                if chart_data and chart_data.series and len(chart_data.series.data) > 0:
                    results[metric_key] = chart_data.series
                    logger.info(
                        f"  ✅ {meta_name}: "
                        f"{len(chart_data.series.data)} نقطة بيانات "
                        f"({chart_data.series.data[0].date} → {chart_data.series.data[-1].date})"
                    )
                else:
                    logger.warning(f"  ⚠️ لا توجد بيانات لـ {metric_key}")

                # تأخير بين الطلبات
                jitter = random.uniform(0.5, 2.0)
                time.sleep(delay + jitter)

            except Exception as e:
                logger.error(f"  ❌ خطأ في {metric_key}: {e}")
                continue

        logger.info(f"{'─' * 60}")
        logger.info(f"✅ تم جلب {len(results)}/{len(charts_to_fetch)} شارت لـ {chain.name}")
        logger.info(f"{'═' * 60}")

        return results

    def crawl_all_chains(
        self,
        chain_keys: List[str] = None,
        max_charts_per_chain: int = 14,
        delay_between_chains: float = 10.0,
    ) -> Dict[str, Dict[str, ChartTimeSeries]]:
        """
        جلب شارتات لعدة سلاسل.
        
        Returns:
            Dict[chain_key, Dict[metric_key, ChartTimeSeries]]
        """
        keys = chain_keys or list(ETHERSCAN_CHAINS.keys())
        all_results = {}

        logger.info(f"🚀 بدء جلب شارتات {len(keys)} سلسلة")

        for i, chain_key in enumerate(keys):
            logger.info(f"\n{'🔗' * 3} سلسلة {i+1}/{len(keys)}: {chain_key}")

            try:
                charts = self.crawl_chain_charts(
                    chain_key,
                    max_charts=max_charts_per_chain,
                )
                if charts:
                    all_results[chain_key] = charts

                # تأخير بين السلاسل
                if i < len(keys) - 1:
                    wait = delay_between_chains + random.uniform(3, 8)
                    logger.info(f"⏳ انتظار {wait:.0f}ث قبل السلسلة التالية...")
                    time.sleep(wait)

            except Exception as e:
                logger.error(f"❌ فشل في {chain_key}: {e}")
                continue

        return all_results


# ══════════════════════════════════════════════════════════════════
# 🧪 اختبار سريع
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import json

    fetcher = BrowserChartFetcher(headless=False)

    try:
        # اختبار على سلسلة واحدة (3 شارتات فقط)
        charts = fetcher.crawl_chain_charts("ethereum", max_charts=3, delay=4.0)

        if charts:
            print(f"\n✅ تم جلب {len(charts)} شارت:")
            for key, series in charts.items():
                print(f"  📊 {series.metric_name}: {len(series.data)} نقطة")
                if series.data:
                    print(f"     {series.data[0].date} → {series.data[-1].date}")
                    print(f"     {series.data[0].value:.2f} → {series.data[-1].value:.2f}")
        else:
            print("❌ لم يتم جلب أي شارتات")
    finally:
        fetcher.close()
