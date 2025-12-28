"""
CoinGecko Python Utility - مكتبة pycoingecko المجانية
=====================================================
✅ مجاني بالكامل - بدون مفتاح API
⚠️ الحد: 10-30 طلب/دقيقة

استخدام:
    from coingecko import CryptoTracker
    
    tracker = CryptoTracker()
    price = tracker.get_price('bitcoin')
    trending = tracker.get_trending()
"""

from pycoingecko import CoinGeckoAPI
from typing import List, Dict, Any, Optional, Union
import time
from functools import lru_cache
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CryptoTracker:
    """
    CryptoTracker - واجهة موحدة للحصول على بيانات العملات المشفرة
    يستخدم pycoingecko للتواصل مع CoinGecko API مجاناً
    """
    
    def __init__(self):
        """تهيئة CoinGecko API client"""
        self.cg = CoinGeckoAPI()
        self.last_request_time = 0
        self.min_request_interval = 2.5  # 2.5 ثانية بين الطلبات
        
    def _rate_limit(self):
        """Rate limiting لضمان عدم تجاوز حد API المجاني"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def ping(self) -> Dict[str, str]:
        """
        اختبار الاتصال بـ CoinGecko API
        
        Returns:
            dict: {'gecko_says': '(V3) To the Moon!'}
        """
        self._rate_limit()
        try:
            return self.cg.ping()
        except Exception as e:
            logger.error(f"Ping failed: {e}")
            return {"error": str(e)}
    
    def get_price(
        self, 
        coin_ids: Union[str, List[str]], 
        vs_currencies: Union[str, List[str]] = 'usd',
        include_market_cap: bool = False,
        include_24hr_vol: bool = False,
        include_24hr_change: bool = False,
        include_last_updated_at: bool = False
    ) -> Dict[str, Dict[str, float]]:
        """
        جلب سعر عملة أو عدة عملات
        
        Args:
            coin_ids: معرف العملة أو قائمة معرفات (مثل 'bitcoin' أو ['bitcoin', 'ethereum'])
            vs_currencies: العملة المقابلة (افتراضي 'usd')
            include_market_cap: إضافة القيمة السوقية
            include_24hr_vol: إضافة حجم التداول 24 ساعة
            include_24hr_change: إضافة تغيير السعر 24 ساعة
            include_last_updated_at: إضافة وقت آخر تحديث
            
        Returns:
            dict: {'bitcoin': {'usd': 45000, 'usd_market_cap': 850000000000, ...}}
            
        Example:
            >>> tracker.get_price('bitcoin', 'usd', include_24hr_change=True)
            {'bitcoin': {'usd': 45000, 'usd_24h_change': 2.5}}
        """
        self._rate_limit()
        try:
            return self.cg.get_price(
                ids=coin_ids,
                vs_currencies=vs_currencies,
                include_market_cap=include_market_cap,
                include_24hr_vol=include_24hr_vol,
                include_24hr_change=include_24hr_change,
                include_last_updated_at=include_last_updated_at
            )
        except Exception as e:
            logger.error(f"Failed to get price: {e}")
            return {"error": str(e)}
    
    @lru_cache(maxsize=1)
    def get_coins_list(self) -> List[Dict[str, str]]:
        """
        جلب قائمة كل العملات المدعومة
        (مع كاش لتقليل الطلبات - البيانات نادراً ما تتغير)
        
        Returns:
            list: [{'id': 'bitcoin', 'symbol': 'btc', 'name': 'Bitcoin'}, ...]
        """
        self._rate_limit()
        try:
            return self.cg.get_coins_list()
        except Exception as e:
            logger.error(f"Failed to get coins list: {e}")
            return []
    
    def get_coin_by_id(
        self, 
        coin_id: str,
        localization: bool = False,
        tickers: bool = False,
        market_data: bool = True,
        community_data: bool = False,
        developer_data: bool = False
    ) -> Dict[str, Any]:
        """
        جلب معلومات شاملة عن عملة محددة
        
        Args:
            coin_id: معرف العملة (مثل 'bitcoin')
            localization: تضمين الترجمات
            tickers: تضمين بيانات المنصات
            market_data: تضمين بيانات السوق (أسعار، قيمة سوقية، إلخ)
            community_data: تضمين بيانات المجتمع
            developer_data: تضمين بيانات المطورين
            
        Returns:
            dict: معلومات شاملة عن العملة
        """
        self._rate_limit()
        try:
            return self.cg.get_coin_by_id(
                id=coin_id,
                localization=localization,
                tickers=tickers,
                market_data=market_data,
                community_data=community_data,
                developer_data=developer_data
            )
        except Exception as e:
            logger.error(f"Failed to get coin by id: {e}")
            return {"error": str(e)}
    
    def get_coin_market_chart(
        self,
        coin_id: str,
        vs_currency: str = 'usd',
        days: Union[int, str] = 30
    ) -> Dict[str, List]:
        """
        جلب بيانات السوق التاريخية (للرسوم البيانية)
        
        Args:
            coin_id: معرف العملة
            vs_currency: العملة المقابلة
            days: عدد الأيام (1, 7, 14, 30, 90, 180, 365, 'max')
            
        Returns:
            dict: {
                'prices': [[timestamp, price], ...],
                'market_caps': [[timestamp, market_cap], ...],
                'total_volumes': [[timestamp, volume], ...]
            }
        """
        self._rate_limit()
        try:
            return self.cg.get_coin_market_chart_by_id(
                id=coin_id,
                vs_currency=vs_currency,
                days=days
            )
        except Exception as e:
            logger.error(f"Failed to get market chart: {e}")
            return {"error": str(e)}
    
    def get_coin_ohlc(
        self,
        coin_id: str,
        vs_currency: str = 'usd',
        days: int = 30
    ) -> List[List[float]]:
        """
        جلب بيانات OHLC (Open, High, Low, Close) للرسم البياني
        
        Args:
            coin_id: معرف العملة
            vs_currency: العملة المقابلة
            days: عدد الأيام (1, 7, 14, 30, 90, 180, 365)
            
        Returns:
            list: [[timestamp, open, high, low, close], ...]
        """
        self._rate_limit()
        try:
            return self.cg.get_coin_ohlc_by_id(
                id=coin_id,
                vs_currency=vs_currency,
                days=days
            )
        except Exception as e:
            logger.error(f"Failed to get OHLC: {e}")
            return []
    
    def get_top_coins(
        self,
        vs_currency: str = 'usd',
        limit: int = 100,
        page: int = 1,
        sparkline: bool = False,
        price_change_percentage: str = '24h'
    ) -> List[Dict[str, Any]]:
        """
        جلب أفضل العملات حسب القيمة السوقية
        
        Args:
            vs_currency: العملة المقابلة
            limit: عدد العملات (1-250)
            page: رقم الصفحة
            sparkline: تضمين sparkline data
            price_change_percentage: فترات التغيير ('1h', '24h', '7d', '14d', '30d', '200d', '1y')
            
        Returns:
            list: قائمة العملات مع بياناتها
        """
        self._rate_limit()
        try:
            return self.cg.get_coins_markets(
                vs_currency=vs_currency,
                order='market_cap_desc',
                per_page=limit,
                page=page,
                sparkline=sparkline,
                price_change_percentage=price_change_percentage
            )
        except Exception as e:
            logger.error(f"Failed to get top coins: {e}")
            return []
    
    def get_trending(self) -> Dict[str, List]:
        """
        جلب العملات الرائجة (Trending)
        
        Returns:
            dict: {
                'coins': [قائمة العملات الرائجة],
                'nfts': [قائمة NFTs الرائجة]
            }
        """
        self._rate_limit()
        try:
            return self.cg.get_search_trending()
        except Exception as e:
            logger.error(f"Failed to get trending: {e}")
            return {"coins": [], "nfts": []}
    
    def get_global_data(self) -> Dict[str, Any]:
        """
        جلب بيانات السوق العالمية
        
        Returns:
            dict: {
                'data': {
                    'active_cryptocurrencies': int,
                    'markets': int,
                    'total_market_cap': dict,
                    'total_volume': dict,
                    'market_cap_percentage': dict,
                    'market_cap_change_percentage_24h_usd': float,
                    ...
                }
            }
        """
        self._rate_limit()
        try:
            return self.cg.get_global()
        except Exception as e:
            logger.error(f"Failed to get global data: {e}")
            return {"error": str(e)}
    
    def search_coins(self, query: str) -> Dict[str, List]:
        """
        البحث عن العملات
        
        Args:
            query: نص البحث (اسم العملة أو رمزها)
            
        Returns:
            dict: {
                'coins': [نتائج البحث],
                'exchanges': [],
                'icos': [],
                'categories': [],
                'nfts': []
            }
        """
        self._rate_limit()
        try:
            return self.cg.search(query=query)
        except Exception as e:
            logger.error(f"Failed to search: {e}")
            return {"coins": []}
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """
        جلب فئات العملات (DeFi, NFT, Gaming, إلخ)
        
        Returns:
            list: [
                {
                    'id': str,
                    'name': str,
                    'market_cap': float,
                    'market_cap_change_24h': float,
                    'volume_24h': float,
                    'top_3_coins': [str, str, str]
                },
                ...
            ]
        """
        self._rate_limit()
        try:
            return self.cg.get_coins_categories()
        except Exception as e:
            logger.error(f"Failed to get categories: {e}")
            return []
    
    def get_exchanges(self, limit: int = 100, page: int = 1) -> List[Dict[str, Any]]:
        """
        جلب قائمة منصات التداول
        
        Args:
            limit: عدد المنصات
            page: رقم الصفحة
            
        Returns:
            list: قائمة المنصات مع بياناتها
        """
        self._rate_limit()
        try:
            return self.cg.get_exchanges_list(per_page=limit, page=page)
        except Exception as e:
            logger.error(f"Failed to get exchanges: {e}")
            return []


# ============================================================================
# دوال مساعدة سريعة (Utility Functions)
# ============================================================================

def quick_price(coin_id: str) -> Optional[float]:
    """
    جلب سعر سريع لعملة واحدة
    
    Args:
        coin_id: معرف العملة (مثل 'bitcoin')
        
    Returns:
        float: السعر بالدولار أو None إذا فشل
        
    Example:
        >>> quick_price('bitcoin')
        45000.0
    """
    tracker = CryptoTracker()
    result = tracker.get_price(coin_id)
    
    if coin_id in result and 'usd' in result[coin_id]:
        return result[coin_id]['usd']
    return None


def quick_trending() -> List[str]:
    """
    جلب قائمة سريعة بأسماء العملات الرائجة
    
    Returns:
        list: أسماء العملات الرائجة
        
    Example:
        >>> quick_trending()
        ['bitcoin', 'ethereum', 'cardano', ...]
    """
    tracker = CryptoTracker()
    result = tracker.get_trending()
    
    if 'coins' in result:
        return [coin['item']['id'] for coin in result['coins']]
    return []


def quick_top_10() -> List[Dict[str, Any]]:
    """
    جلب أفضل 10 عملات
    
    Returns:
        list: أفضل 10 عملات مع بياناتها
    """
    tracker = CryptoTracker()
    return tracker.get_top_coins(limit=10)


# ============================================================================
# مثال للاستخدام (Usage Example)
# ============================================================================

if __name__ == "__main__":
    # تهيئة CryptoTracker
    tracker = CryptoTracker()
    
    # 1. اختبار الاتصال
    print("=" * 50)
    print("🔌 Ping Test")
    print("=" * 50)
    ping_result = tracker.ping()
    print(ping_result)
    print()
    
    # 2. جلب سعر Bitcoin
    print("=" * 50)
    print("💰 Bitcoin Price")
    print("=" * 50)
    btc_price = tracker.get_price('bitcoin', include_24hr_change=True)
    if 'bitcoin' in btc_price:
        print(f"Price: ${btc_price['bitcoin']['usd']:,.2f}")
        if 'usd_24h_change' in btc_price['bitcoin']:
            print(f"24h Change: {btc_price['bitcoin']['usd_24h_change']:.2f}%")
    print()
    
    # 3. جلب أفضل 5 عملات
    print("=" * 50)
    print("🏆 Top 5 Cryptocurrencies")
    print("=" * 50)
    top_coins = tracker.get_top_coins(limit=5)
    for i, coin in enumerate(top_coins, 1):
        print(f"{i}. {coin['name']} ({coin['symbol'].upper()})")
        print(f"   Price: ${coin['current_price']:,.2f}")
        print(f"   24h Change: {coin['price_change_percentage_24h']:.2f}%")
        print()
    
    # 4. جلب العملات الرائجة
    print("=" * 50)
    print("🔥 Trending Coins")
    print("=" * 50)
    trending = tracker.get_trending()
    if 'coins' in trending:
        for i, coin_data in enumerate(trending['coins'][:5], 1):
            coin = coin_data['item']
            print(f"{i}. {coin['name']} ({coin['symbol']})")
    print()
    
    # 5. البحث عن عملة
    print("=" * 50)
    print("🔍 Search: Ethereum")
    print("=" * 50)
    search_results = tracker.search_coins('ethereum')
    if 'coins' in search_results:
        for coin in search_results['coins'][:3]:
            print(f"- {coin['name']} ({coin['symbol']})")
    print()
    
    # 6. دوال مساعدة سريعة
    print("=" * 50)
    print("⚡ Quick Functions")
    print("=" * 50)
    print(f"BTC Quick Price: ${quick_price('bitcoin'):,.2f}")
    print(f"Trending: {', '.join(quick_trending()[:5])}")
    print()
    
    print("✅ All tests completed!")
