/**
 * CoinGecko API Service
 * خدمة جلب البيانات من CoinGecko API
 * ✅ مجاني بالكامل - بدون مفتاح API
 * ⚠️ الحد: 10-30 طلب/دقيقة
 */

// أنواع البيانات
export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  sparkline_in_7d?: {
    price: number[];
  };
  last_updated: string;
}

export interface TrendingCoin {
  item: {
    id: string;
    coin_id: number;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    small: string;
    large: string;
    slug: string;
    price_btc: number;
    score: number;
    data?: {
      price: number;
      price_change_percentage_24h: { [key: string]: number };
      sparkline: string;
    };
  };
}

export interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    upcoming_icos: number;
    ongoing_icos: number;
    ended_icos: number;
    markets: number;
    total_market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    market_cap_percentage: { [key: string]: number };
    market_cap_change_percentage_24h_usd: number;
    updated_at: number;
  };
}

// نوع بيانات OHLC: [timestamp, open, high, low, close]
export type OHLCData = [number, number, number, number, number]; // [timestamp, open, high, low, close]

// نوع مختصر لبيانات العملة
export type CoinData = CoinMarketData;

// استخدام API Route الداخلية لتجنب مشاكل CORS
const isClient = typeof window !== "undefined";
const API_PROXY = "/api/coingecko";
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Cache للبيانات
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // دقيقة واحدة للكاش
const CACHE_DURATION_LONG = 300 * 1000; // 5 دقائق للبيانات الثابتة

// Rate limiting - CoinGecko Free API: 10-30 طلب/دقيقة
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2500; // 2.5 ثانية بين الطلبات (أكثر أماناً)

// دالة مساعدة للطلبات
async function fetchWithCache<T>(
  endpoint: string,
  cacheKey: string,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  // التحقق من الكاش
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data as T;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    // استخدام API Proxy في المتصفح، والاتصال المباشر في الخادم
    const url = isClient 
      ? `${API_PROXY}?endpoint=${encodeURIComponent(endpoint)}`
      : `${COINGECKO_API}${endpoint}`;
    
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // حفظ في الكاش
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data as T;
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    throw error;
  }
}

/**
 * جلب بيانات السوق للعملات
 */
export async function getMarketData(
  page: number = 1,
  perPage: number = 100,
  sparkline: boolean = true
): Promise<CoinMarketData[]> {
  const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=${sparkline}&price_change_percentage=24h,7d`;
  return fetchWithCache<CoinMarketData[]>(endpoint, `markets_${page}_${perPage}`);
}

/**
 * جلب العملات الرائجة
 */
export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  const data = await fetchWithCache<{ coins: TrendingCoin[] }>(
    "/search/trending",
    "trending"
  );
  return data.coins;
}

/**
 * جلب البيانات العالمية
 */
export async function getGlobalData(): Promise<GlobalData> {
  return fetchWithCache<GlobalData>("/global", "global");
}

/**
 * جلب بيانات عملة محددة
 */
export async function getCoinData(coinId: string): Promise<CoinMarketData | null> {
  try {
    const markets = await getMarketData(1, 250);
    return markets.find((coin) => coin.id === coinId) || null;
  } catch {
    return null;
  }
}

/**
 * جلب أسعار OHLC
 */
export async function getOHLC(
  coinId: string,
  days: number = 7
): Promise<OHLCData[]> {
  const endpoint = `/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
  return fetchWithCache<OHLCData[]>(endpoint, `ohlc_${coinId}_${days}`);
}

/**
 * البحث عن عملات
 */
export async function searchCoins(query: string): Promise<{
  coins: Array<{
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
  }>;
}> {
  const endpoint = `/search?query=${encodeURIComponent(query)}`;
  return fetchWithCache(endpoint, `search_${query}`);
}

/**
 * حساب قوة الاتجاه بناءً على البيانات
 */
export function calculateTrendStrength(coin: CoinMarketData): {
  strength: number;
  signal: "strong-buy" | "buy" | "neutral" | "sell" | "strong-sell";
  momentum: number;
} {
  const change24h = coin.price_change_percentage_24h || 0;
  const change7d = coin.price_change_percentage_7d_in_currency || 0;
  const volumeToMcap = coin.total_volume / coin.market_cap;
  
  // حساب الزخم
  let momentum = 50;
  momentum += change24h * 2;
  momentum += change7d * 0.5;
  momentum += volumeToMcap > 0.1 ? 10 : volumeToMcap > 0.05 ? 5 : 0;
  momentum = Math.max(0, Math.min(100, momentum));

  // حساب قوة الاتجاه
  let strength = 0;
  if (change24h > 0 && change7d > 0) strength += 30;
  if (change24h > 5) strength += 20;
  if (change7d > 10) strength += 20;
  if (volumeToMcap > 0.1) strength += 15;
  if (coin.ath_change_percentage > -20) strength += 15;
  strength = Math.min(100, strength);

  // تحديد الإشارة
  let signal: "strong-buy" | "buy" | "neutral" | "sell" | "strong-sell";
  if (change24h > 10 && change7d > 15) signal = "strong-buy";
  else if (change24h > 3 && change7d > 5) signal = "buy";
  else if (change24h < -10 && change7d < -15) signal = "strong-sell";
  else if (change24h < -3 && change7d < -5) signal = "sell";
  else signal = "neutral";

  return { strength, signal, momentum };
}

/**
 * تصنيف العملات حسب الأداء
 */
export function categorizeCoins(coins: CoinMarketData[]): {
  hot: CoinMarketData[];
  bullish: CoinMarketData[];
  bearish: CoinMarketData[];
  highVolume: CoinMarketData[];
} {
  const hot = coins
    .filter((c) => {
      const volumeRatio = c.total_volume / c.market_cap;
      return volumeRatio > 0.15 && Math.abs(c.price_change_percentage_24h) > 5;
    })
    .slice(0, 10);

  const bullish = coins
    .filter((c) => c.price_change_percentage_24h > 3)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 20);

  const bearish = coins
    .filter((c) => c.price_change_percentage_24h < -3)
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, 20);

  const highVolume = coins
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 10);

  return { hot, bullish, bearish, highVolume };
}

// ============================================================================
// 🆕 دوال إضافية مستوحاة من pycoingecko
// ============================================================================

/**
 * ping - اختبار الاتصال
 */
export async function ping(): Promise<{ gecko_says: string }> {
  return fetchWithCache("/ping", "ping", CACHE_DURATION_LONG);
}

/**
 * جلب سعر عملة أو عدة عملات
 * مثال: getPrice(['bitcoin', 'ethereum'], ['usd', 'eur'])
 */
export async function getPrice(
  ids: string | string[],
  vsCurrencies: string | string[] = 'usd',
  options?: {
    includeMarketCap?: boolean;
    include24hrVol?: boolean;
    include24hrChange?: boolean;
    includeLastUpdatedAt?: boolean;
  }
): Promise<Record<string, Record<string, number>>> {
  const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
  const vsStr = Array.isArray(vsCurrencies) ? vsCurrencies.join(',') : vsCurrencies;
  
  let endpoint = `/simple/price?ids=${idsStr}&vs_currencies=${vsStr}`;
  if (options?.includeMarketCap) endpoint += '&include_market_cap=true';
  if (options?.include24hrVol) endpoint += '&include_24hr_vol=true';
  if (options?.include24hrChange) endpoint += '&include_24hr_change=true';
  if (options?.includeLastUpdatedAt) endpoint += '&include_last_updated_at=true';
  
  return fetchWithCache(endpoint, `price_${idsStr}_${vsStr}`);
}

/**
 * جلب قائمة كل العملات المدعومة
 */
export async function getCoinsList(): Promise<Array<{
  id: string;
  symbol: string;
  name: string;
}>> {
  return fetchWithCache("/coins/list", "coins_list", CACHE_DURATION_LONG);
}

/**
 * جلب معلومات شاملة عن عملة محددة
 */
export async function getCoinById(coinId: string): Promise<any> {
  const endpoint = `/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
  return fetchWithCache(endpoint, `coin_${coinId}`);
}

/**
 * جلب بيانات السوق التاريخية (chart data)
 */
export async function getCoinMarketChart(
  coinId: string,
  vsCurrency: string = 'usd',
  days: number | 'max' = 30
): Promise<{
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}> {
  const endpoint = `/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}`;
  return fetchWithCache(endpoint, `chart_${coinId}_${days}`);
}

/**
 * جلب بيانات OHLC للرسم البياني
 */
export async function getCoinOHLC(
  coinId: string,
  vsCurrency: string = 'usd',
  days: 1 | 7 | 14 | 30 | 90 | 180 | 365 | 'max' = 30
): Promise<OHLCData[]> {
  const endpoint = `/coins/${coinId}/ohlc?vs_currency=${vsCurrency}&days=${days}`;
  return fetchWithCache(endpoint, `ohlc_${coinId}_${vsCurrency}_${days}`);
}

/**
 * جلب أفضل العملات حسب Market Cap
 */
export async function getTopCoins(
  limit: number = 100,
  page: number = 1,
  sparkline: boolean = false
): Promise<CoinMarketData[]> {
  const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=${sparkline}&price_change_percentage=24h,7d`;
  return fetchWithCache(endpoint, `top_${limit}_${page}`);
}

/**
 * جلب الفئات (DeFi, NFT, etc)
 */
export async function getCategories(): Promise<Array<{
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  top_3_coins: string[];
}>> {
  return fetchWithCache("/coins/categories", "categories", CACHE_DURATION_LONG);
}

/**
 * جلب بيانات المنصات (Exchanges)
 */
export async function getExchanges(limit: number = 100): Promise<Array<{
  id: string;
  name: string;
  year_established: number;
  country: string;
  image: string;
  trust_score: number;
  trust_score_rank: number;
  trade_volume_24h_btc: number;
}>> {
  const endpoint = `/exchanges?per_page=${limit}`;
  return fetchWithCache(endpoint, `exchanges_${limit}`, CACHE_DURATION_LONG);
}

/**
 * جلب العملات الرائجة (Trending)
 */
export async function getSearchTrending(): Promise<{
  coins: TrendingCoin[];
  nfts: Array<{ id: string; name: string; symbol: string; thumb: string }>;
}> {
  return fetchWithCache("/search/trending", "trending");
}

/**
 * جلب بيانات السوق العالمية
 */
export async function getGlobalMarketData(): Promise<{
  total_market_cap: number;
  total_volume: number;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h: number;
  active_cryptocurrencies: number;
  markets: number;
}> {
  const data = await fetchWithCache<GlobalData>("/global", "global_market");
  return {
    total_market_cap: data.data.total_market_cap.usd,
    total_volume: data.data.total_volume.usd,
    market_cap_percentage: data.data.market_cap_percentage,
    market_cap_change_percentage_24h: data.data.market_cap_change_percentage_24h_usd,
    active_cryptocurrencies: data.data.active_cryptocurrencies,
    markets: data.data.markets
  };
}

// ============================================================================
// 🔧 Utility Class - مثل pycoingecko
// ============================================================================

/**
 * CryptoTracker class - واجهة موحدة مثل pycoingecko
 */
export class CryptoTracker {
  /**
   * اختبار الاتصال
   */
  async ping() {
    return ping();
  }

  /**
   * جلب سعر عملة
   */
  async getPrice(coinId: string) {
    const data = await getPrice(coinId, 'usd', {
      include24hrChange: true,
      includeMarketCap: true,
      include24hrVol: true
    });
    return data[coinId];
  }

  /**
   * جلب أسعار عدة عملات
   */
  async getPrices(coinIds: string[]) {
    return getPrice(coinIds, 'usd', {
      include24hrChange: true,
      includeMarketCap: true
    });
  }

  /**
   * جلب أفضل العملات
   */
  async getTopCoins(limit: number = 10) {
    return getTopCoins(limit);
  }

  /**
   * جلب معلومات عملة
   */
  async getCoinInfo(coinId: string) {
    return getCoinById(coinId);
  }

  /**
   * البحث عن عملة
   */
  async searchCoin(query: string) {
    const results = await searchCoins(query);
    return results.coins;
  }

  /**
   * جلب العملات الرائجة
   */
  async getTrending() {
    const data = await getSearchTrending();
    return data.coins;
  }

  /**
   * جلب بيانات السوق العالمية
   */
  async getGlobalData() {
    return getGlobalMarketData();
  }

  /**
   * جلب بيانات الرسم البياني
   */
  async getChartData(coinId: string, days: number = 30) {
    return getCoinMarketChart(coinId, 'usd', days);
  }

  /**
   * جلب OHLC
   */
  async getOHLC(coinId: string, days: 1 | 7 | 14 | 30 | 90 | 180 | 365 = 30) {
    return getCoinOHLC(coinId, 'usd', days);
  }
}

// تصدير instance جاهز للاستخدام
export const cryptoTracker = new CryptoTracker();
