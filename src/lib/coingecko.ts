/**
 * CoinGecko API Service
 * Template for live data integration.
 * Free API: https://api.coingecko.com/api/v3
 * Pro API:  https://pro-api.coingecko.com/api/v3
 */

const BASE_URL = 'https://api.coingecko.com/api/v3';

// If you have a Pro API key, set it here or use env var
const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '';

function headers() {
  const h: Record<string, string> = { 'Accept': 'application/json' };
  if (API_KEY) h['x-cg-pro-api-key'] = API_KEY;
  return h;
}

// ─── Types ──────────────────────────────────────────────────────────

export interface CoinMarketData {
  market_cap: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d: number | null;
  price_change_percentage_30d: number | null;
  market_cap_fdv_ratio: number | null;
  total_value_locked: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: { large: string; small: string; thumb: string };
  description: { en: string };
  links: {
    homepage: string[];
    whitepaper: string;
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    announcement_url: string[];
    twitter_screen_name: string;
    facebook_username: string;
    telegram_channel_identifier: string;
    subreddit_url: string;
    repos_url: { github: string[]; bitbucket: string[] };
  };
  categories: string[];
  genesis_date: string | null;
  sentiment_votes_up_percentage: number | null;
  sentiment_votes_down_percentage: number | null;
  market_cap_rank: number | null;
  market_data: CoinMarketData;
  community_data: {
    twitter_followers: number | null;
    reddit_subscribers: number | null;
    telegram_channel_user_count: number | null;
  };
  developer_data: {
    forks: number | null;
    stars: number | null;
    subscribers: number | null;
    total_issues: number | null;
    closed_issues: number | null;
    pull_requests_merged: number | null;
    commit_count_4_weeks: number | null;
  };
  tickers: Array<{
    base: string;
    target: string;
    market: { name: string; identifier: string };
    last: number;
    volume: number;
    trust_score: string;
    trade_url: string;
  }>;
}

export interface CoinChartData {
  prices: [number, number][];       // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface CoinOHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// ─── API Functions ──────────────────────────────────────────────────

/**
 * Get full coin detail from CoinGecko
 * GET /coins/{id}
 */
export async function getCoinDetail(coinId: string): Promise<CoinDetail | null> {
  try {
    const url = `${BASE_URL}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=false`;
    const res = await fetch(url, { headers: headers(), next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      image: data.image,
      description: data.description,
      links: data.links,
      categories: data.categories || [],
      genesis_date: data.genesis_date,
      sentiment_votes_up_percentage: data.sentiment_votes_up_percentage,
      sentiment_votes_down_percentage: data.sentiment_votes_down_percentage,
      market_cap_rank: data.market_cap_rank,
      market_data: {
        market_cap: data.market_data?.market_cap?.usd ?? null,
        fully_diluted_valuation: data.market_data?.fully_diluted_valuation?.usd ?? null,
        total_volume: data.market_data?.total_volume?.usd ?? null,
        circulating_supply: data.market_data?.circulating_supply ?? null,
        total_supply: data.market_data?.total_supply ?? null,
        max_supply: data.market_data?.max_supply ?? null,
        current_price: data.market_data?.current_price?.usd ?? null,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h ?? null,
        price_change_percentage_7d: data.market_data?.price_change_percentage_7d_in_currency?.usd ?? null,
        price_change_percentage_30d: data.market_data?.price_change_percentage_30d_in_currency?.usd ?? null,
        market_cap_fdv_ratio: data.market_data?.market_cap_fdv_ratio ?? null,
        total_value_locked: data.market_data?.total_value_locked?.usd ?? null,
        ath: data.market_data?.ath?.usd ?? null,
        ath_date: data.market_data?.ath_date?.usd ?? null,
        atl: data.market_data?.atl?.usd ?? null,
        atl_date: data.market_data?.atl_date?.usd ?? null,
      },
      community_data: data.community_data || {},
      developer_data: data.developer_data || {},
      tickers: (data.tickers || []).slice(0, 20),
    };
  } catch (err) {
    console.error('CoinGecko getCoinDetail error:', err);
    return null;
  }
}

/**
 * Get market chart data (prices, volumes, market_caps)
 * GET /coins/{id}/market_chart?vs_currency=usd&days=X
 */
export async function getCoinChart(coinId: string, days: number = 30): Promise<CoinChartData | null> {
  try {
    const url = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { headers: headers(), next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('CoinGecko getCoinChart error:', err);
    return null;
  }
}

/**
 * Get OHLC data for candlestick charts
 * GET /coins/{id}/ohlc?vs_currency=usd&days=X
 */
export async function getCoinOHLC(coinId: string, days: number = 30): Promise<CoinOHLC[] | null> {
  try {
    const url = `${BASE_URL}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { headers: headers(), next: { revalidate: 300 } });
    if (!res.ok) return null;
    const raw: [number, number, number, number, number][] = await res.json();
    return raw.map(([time, open, high, low, close]) => ({ time, open, high, low, close }));
  } catch (err) {
    console.error('CoinGecko getCoinOHLC error:', err);
    return null;
  }
}

/**
 * Get top 200 coins market data for the main table
 * GET /coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=true
 */
export async function getTopCoins(page: number = 1, perPage: number = 100) {
  try {
    const url = `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h%2C24h%2C7d%2C30d`;
    const res = await fetch(url, { headers: headers(), next: { revalidate: 120 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('CoinGecko getTopCoins error:', err);
    return [];
  }
}

// ─── Formatting Helpers ─────────────────────────────────────────────

export function formatCurrency(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(decimals)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
  return `$${value.toFixed(decimals)}`;
}

export function formatLargeCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatSupply(value: number | null, symbol?: string): string {
  if (value === null || value === undefined) return '∞';
  const formatted = value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return symbol ? `${formatted} ${symbol.toUpperCase()}` : formatted;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function percentColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  return value >= 0 ? 'text-green-400' : 'text-red-400';
}
