"""
🔗 Blockchain.com Chart Fetcher
=================================
جلب بيانات شارتات Bitcoin من API العام لموقع blockchain.com

لا يحتاج متصفح أو مصادقة — JSON API مباشر.

API Format:
    GET https://api.blockchain.info/charts/{metric}?timespan=180days&format=json&cors=true
    Response: {"status":"ok","name":"...","unit":"...","period":"day",
               "description":"...","values":[{"x":unix_ts,"y":value},...]}

الاستخدام:
    from crawler.blockchain_fetcher import BlockchainFetcher
    fetcher = BlockchainFetcher()
    charts = fetcher.fetch_all_charts(max_charts=30)
"""

import time
import urllib.request
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from loguru import logger

from crawler.models import ChartDataPoint, ChartTimeSeries


# ══════════════════════════════════════════════════════════════════
# 📊 قائمة المقاييس المتاحة (28 مقياس)
# ══════════════════════════════════════════════════════════════════

BLOCKCHAIN_METRICS: Dict[str, dict] = {
    # ── Price & Market ──
    "market-price":       {"key": "market_price",       "name": "Bitcoin Market Price (USD)"},
    "market-cap":         {"key": "market_cap",          "name": "Bitcoin Market Cap"},
    "trade-volume":       {"key": "trade_volume",        "name": "Bitcoin Trade Volume (USD)"},

    # ── Transactions ──
    "n-transactions":                   {"key": "daily_transactions",    "name": "Daily Confirmed Transactions"},
    "n-transactions-total":             {"key": "total_transactions",    "name": "Total Confirmed Transactions"},
    "n-transactions-per-block":         {"key": "tx_per_block",          "name": "Transactions Per Block"},
    "n-transactions-excluding-popular": {"key": "tx_excluding_popular",  "name": "Transactions Excl. Popular Addresses"},
    "transactions-per-second":          {"key": "tx_per_second",         "name": "Transactions Per Second"},

    # ── Addresses ──
    "n-unique-addresses": {"key": "unique_addresses",    "name": "Daily Unique Addresses Used"},

    # ── Volume ──
    "output-volume":                    {"key": "output_volume_btc",     "name": "Output Volume (BTC)"},
    "estimated-transaction-volume":     {"key": "est_tx_volume_btc",     "name": "Estimated Tx Volume (BTC)"},
    "estimated-transaction-volume-usd": {"key": "est_tx_volume_usd",     "name": "Estimated Tx Volume (USD)"},

    # ── Mining ──
    "hash-rate":          {"key": "hash_rate",           "name": "Network Hash Rate (TH/s)"},
    "difficulty":         {"key": "difficulty",           "name": "Mining Difficulty"},
    "miners-revenue":     {"key": "miners_revenue",      "name": "Miners Revenue (USD)"},

    # ── Blocks ──
    "avg-block-size":     {"key": "avg_block_size",      "name": "Average Block Size (bytes)"},
    "blocks-size":        {"key": "blockchain_size",      "name": "Blockchain Size (MB)"},

    # ── Fees ──
    "transaction-fees":              {"key": "total_fees_btc",     "name": "Total Fees (BTC)"},
    "transaction-fees-usd":          {"key": "total_fees_usd",     "name": "Total Fees (USD)"},
    "cost-per-transaction":          {"key": "cost_per_tx",        "name": "Cost Per Transaction"},
    "cost-per-transaction-percent":  {"key": "cost_per_tx_pct",    "name": "Cost % of Transaction Volume"},

    # ── Mempool ──
    "mempool-count":      {"key": "mempool_count",       "name": "Mempool Transaction Count"},
    "mempool-size":       {"key": "mempool_size",        "name": "Mempool Size (Bytes)"},
    "mempool-growth":     {"key": "mempool_growth",      "name": "Mempool Growth Rate"},

    # ── Supply ──
    "total-bitcoins":     {"key": "total_supply",        "name": "Total BTC in Circulation"},
    "utxo-count":         {"key": "utxo_count",          "name": "UTXO Set Count"},

    # ── Confirmation ──
    "avg-confirmation-time":    {"key": "avg_confirmation_time",    "name": "Average Confirmation Time (min)"},
    "median-confirmation-time": {"key": "median_confirmation_time", "name": "Median Confirmation Time (min)"},
}

# ══════════════════════════════════════════════════════════════════
API_BASE = "https://api.blockchain.info/charts"
DEFAULT_TIMESPAN = "180days"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


class BlockchainFetcher:
    """جلب شارتات Bitcoin من blockchain.com API"""

    def __init__(self, timespan: str = DEFAULT_TIMESPAN, delay: float = 1.5):
        self.timespan = timespan
        self.delay = delay

    def _fetch_json(self, metric_slug: str) -> Optional[dict]:
        """جلب بيانات JSON لمقياس واحد"""
        url = f"{API_BASE}/{metric_slug}?timespan={self.timespan}&format=json&cors=true"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw)
        except Exception as e:
            logger.error(f"❌ خطأ جلب {metric_slug}: {e}")
            return None

    def _parse_chart(self, metric_slug: str, api_data: dict) -> Optional[ChartTimeSeries]:
        """تحويل استجابة API إلى ChartTimeSeries"""
        meta = BLOCKCHAIN_METRICS.get(metric_slug)
        if not meta:
            return None

        values = api_data.get("values", [])
        if not values:
            logger.warning(f"⚠️ لا توجد بيانات لـ {metric_slug}")
            return None

        data_points: List[ChartDataPoint] = []
        for v in values:
            ts_sec = v.get("x", 0)
            val = v.get("y", 0.0)
            if ts_sec and val is not None:
                dt = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
                data_points.append(ChartDataPoint(
                    date=dt.strftime("%Y-%m-%d"),
                    value=float(val),
                    timestamp=ts_sec * 1000,  # convert to milliseconds
                ))

        if len(data_points) < 2:
            logger.warning(f"⚠️ نقاط بيانات غير كافية لـ {metric_slug}: {len(data_points)}")
            return None

        return ChartTimeSeries(
            metric_key=meta["key"],
            metric_name=api_data.get("name", meta["name"]),
            data=data_points,
            unit=api_data.get("unit", ""),
            description=api_data.get("description", ""),
        )

    def fetch_chart(self, metric_slug: str) -> Optional[ChartTimeSeries]:
        """جلب وتحويل مقياس واحد"""
        api_data = self._fetch_json(metric_slug)
        if not api_data or api_data.get("status") != "ok":
            return None
        return self._parse_chart(metric_slug, api_data)

    def fetch_all_charts(
        self,
        max_charts: int = 33,
        metrics: Optional[List[str]] = None,
    ) -> Dict[str, ChartTimeSeries]:
        """جلب كل المقاييس أو مجموعة محددة"""
        slugs = metrics or list(BLOCKCHAIN_METRICS.keys())
        slugs = slugs[:max_charts]

        logger.info(f"🔗 Blockchain.com — جلب {len(slugs)} مقياس (delay={self.delay}s)")

        results: Dict[str, ChartTimeSeries] = {}
        success = 0
        fail = 0

        for i, slug in enumerate(slugs):
            meta = BLOCKCHAIN_METRICS.get(slug, {})
            key = meta.get("key", slug)
            logger.info(f"  [{i+1}/{len(slugs)}] {slug} → {key}")

            series = self.fetch_chart(slug)
            if series:
                results[key] = series
                success += 1
                logger.info(f"    ✅ {len(series.data)} points")
            else:
                fail += 1
                logger.warning(f"    ⛔ فشل")

            if i < len(slugs) - 1:
                time.sleep(self.delay)

        logger.info(f"🔗 Blockchain.com — ✅ {success} نجح | ⛔ {fail} فشل")
        return results


# ══════════════════════════════════════════════════════════════════
# اختبار سريع
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    fetcher = BlockchainFetcher(delay=1.0)
    # اختبار 3 مقاييس
    charts = fetcher.fetch_all_charts(max_charts=3, metrics=["market-price", "hash-rate", "n-transactions"])
    for key, series in charts.items():
        print(f"  {key}: {len(series.data)} نقطة — آخر: {series.data[-1].date} = {series.data[-1].value:.2f}")
