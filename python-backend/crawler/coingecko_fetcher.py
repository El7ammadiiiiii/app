"""
💎 جالب بيانات CoinGecko — CoinGecko Historical Data Fetcher
================================================================
بديل موثوق لجلب بيانات الشارتات التاريخية من CoinGecko API.
مزايا:
- ✅ مجاني (50 calls/minute)
- ✅ بيانات دقيقة وموثوقة
- ✅ تاريخ كامل (سنوات)
- ✅ يغطي 15,000+ عملة

الاستخدام:
    fetcher = CoinGeckoFetcher()
    
    # جلب شارتات لسلسلة واحدة
    charts = await fetcher.fetch_chain_charts("ethereum")
    
    # النتيجة: dict مع price_history, market_cap_history, volume_history
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

import aiohttp
from loguru import logger

from .models import ChartTimeSeries, ChartDataPoint


# خريطة السلاسل → CoinGecko IDs  
CHAIN_TO_COINGECKO = {
    "ethereum": "ethereum",
    "bitcoin": "bitcoin",
    "bsc": "binancecoin",
    "polygon": "matic-network",
    "arbitrum": "ethereum",  # ARB token
    "optimism": "optimism",
    "base": "ethereum",  # Base uses ETH
    "avalanche": "avalanche-2",
    "fantom": "fantom",
    "cronos": "crypto-com-chain",
    "gnosis": "gnosis",
    "celo": "celo",
    "moonbeam": "moonbeam",
    "moonriver": "moonriver",
    "harmony": "harmony",
    "aurora": "aurora-near",
    "metis": "metis-token",
    "kava": "kava",
    "linea": "ethereum",
    "scroll": "ethereum",
    "zksync": "ethereum",
    "blast": "ethereum",
    "mantle": "mantle",
    "polygon_zkevm": "matic-network",
    "litecoin": "litecoin",
    "cosmos": "cosmos",
    "polkadot": "polkadot",
    "aptos": "aptos",
    "stacks": "blockstack",
    "celestia": "celestia",
    "kaspa": "kaspa",
}


class CoinGeckoFetcher:
    """جالب بيانات تاريخية من CoinGecko API"""
    
    BASE_URL = "https://api.coingecko.com/api/v3"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: مفتاح API اختياري (للحسابات المدفوعة، rate limit أعلى)
        """
        self.api_key = api_key
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_request_time = 0
        self._min_delay = 1.5  # Free tier: 50 calls/min = 1.2s between calls
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """إنشاء أو استرجاع جلسة HTTP"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session
    
    async def close(self):
        """إغلاق الجلسة"""
        if self._session and not self._session.closed:
            await self._session.close()
            await asyncio.sleep(0.5)
    
    async def _rate_limit(self):
        """التحكم بمعدل الطلبات"""
        now = time.time()
        elapsed = now - self._last_request_time
        if elapsed < self._min_delay:
            wait = self._min_delay - elapsed
            await asyncio.sleep(wait)
        self._last_request_time = time.time()
    
    async def _fetch(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """طلب HTTP مع إعادة محاولة"""
        await self._rate_limit()
        
        session = await self._get_session()
        url = f"{self.BASE_URL}/{endpoint}"
        
        headers = {}
        if self.api_key:
            headers["x-cg-demo-api-key"] = self.api_key
        
        for attempt in range(3):
            try:
                async with session.get(url, params=params, headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    elif resp.status == 429:
                        # Rate limited
                        retry_after = int(resp.headers.get("Retry-After", 60))
                        logger.warning(f"⏳ CoinGecko rate limited, waiting {retry_after}s")
                        await asyncio.sleep(retry_after)
                        continue
                    else:
                        logger.warning(f"❌ CoinGecko error {resp.status}: {url}")
                        return None
            except Exception as e:
                logger.error(f"❗ CoinGecko fetch error: {e}")
                if attempt < 2:
                    await asyncio.sleep(5 * (attempt + 1))
                    continue
                return None
        
        return None
    
    async def fetch_market_chart(
        self,
        coin_id: str,
        days: int = 365,
    ) -> Optional[Dict[str, ChartTimeSeries]]:
        """
        جلب بيانات السعر + Market Cap + حجم التداول
        
        Args:
            coin_id: معرف CoinGecko (مثل "ethereum", "bitcoin")
            days: عدد الأيام (1, 7, 14, 30, 90, 180, 365, max)
            
        Returns:
            dict مع keys: price_history, market_cap_history, volume_history
        """
        logger.info(f"📊 جلب بيانات {coin_id} من CoinGecko ({days} يوم)")
        
        data = await self._fetch(
            f"coins/{coin_id}/market_chart",
            params={"vs_currency": "usd", "days": days, "interval": "daily"}
        )
        
        if not data:
            return None
        
        results = {}
        
        # معالجة السعر
        if "prices" in data and data["prices"]:
            points = self._parse_series(data["prices"])
            if points:
                results["price_history"] = ChartTimeSeries(
                    metric_key="daily_price",
                    metric_name="Daily Price (USD)",
                    data=points,
                    unit="USD",
                    description=f"Source: CoinGecko ({coin_id})",
                )
        
        # معالجة Market Cap
        if "market_caps" in data and data["market_caps"]:
            points = self._parse_series(data["market_caps"])
            if points:
                results["market_cap_history"] = ChartTimeSeries(
                    metric_key="market_cap",
                    metric_name="Market Capitalization",
                    data=points,
                    unit="USD",
                    description=f"Source: CoinGecko ({coin_id})",
                )
        
        # معالجة حجم التداول
        if "total_volumes" in data and data["total_volumes"]:
            points = self._parse_series(data["total_volumes"])
            if points:
                results["volume_history"] = ChartTimeSeries(
                    metric_key="volume_24h",
                    metric_name="Trading Volume (24h)",
                    data=points,
                    unit="USD",
                    description=f"Source: CoinGecko ({coin_id})",
                )
        
        logger.info(f"✅ تم جلب {len(results)} سلاسل من CoinGecko")
        return results
    
    def _parse_series(self, raw: List[List]) -> List[ChartDataPoint]:
        """تحويل بيانات CoinGecko إلى ChartDataPoint"""
        points = []
        
        for item in raw:
            if len(item) >= 2:
                ts_ms = int(item[0])
                value = float(item[1])
                
                dt = datetime.fromtimestamp(ts_ms / 1000.0)
                date_str = dt.strftime("%Y-%m-%d")
                
                points.append(ChartDataPoint(
                    date=date_str,
                    value=round(value, 2),
                    timestamp=ts_ms,
                ))
        
        return points
    
    async def fetch_chain_charts(
        self,
        chain_key: str,
        days: int = 365,
    ) -> Optional[Dict[str, ChartTimeSeries]]:
        """
        جلب بيانات تاريخية لسلسلة blockchain كاملة
        
        Args:
            chain_key: مفتاح السلسلة (مثل "ethereum", "bsc")
            days: عدد الأيام
            
        Returns:
            dict مع الشارتات التاريخية
        """
        coin_id = CHAIN_TO_COINGECKO.get(chain_key)
        
        if not coin_id:
            logger.warning(f"⚠️ السلسلة {chain_key} غير مدعومة في CoinGecko")
            return None
        
        return await self.fetch_market_chart(coin_id, days)


# ══════════════════════════════════════════════════════════════════
# 🧪 اختبار
# ══════════════════════════════════════════════════════════════════

async def test_coingecko():
    """اختبار سريع"""
    fetcher = CoinGeckoFetcher()
    
    try:
        # اختبار على Ethereum
        charts = await fetcher.fetch_chain_charts("ethereum", days=90)
        
        if charts:
            print("\n✅ نتائج الاختبار:")
            for key, chart in charts.items():
                print(f"\n  📊 {chart.metric_name}")
                print(f"     نقاط البيانات: {len(chart.data)}")
                if chart.data:
                    first = chart.data[0]
                    last = chart.data[-1]
                    print(f"     النطاق: {first.date} → {last.date}")
                    print(f"     القيم: {first.value:.2f} → {last.value:.2f}")
        else:
            print("❌ فشل جلب البيانات")
    
    finally:
        await fetcher.close()


if __name__ == "__main__":
    asyncio.run(test_coingecko())
