'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createChart, ColorType, AreaSeries, CandlestickSeries } from 'lightweight-charts';
import { isFavoriteId, readFavoriteIds, subscribeFavorites, toggleFavoriteId } from '../../lib/crypto-favorites';
import { getDiaParams, DIA_EXCHANGE_LOGOS } from '../../lib/dia-mapping';

/* ════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════ */

interface OHLCVPoint { time: string; open: number; close: number; high: number; low: number; volume: number; }
interface FAQ { question: string; answer: string; }
interface ProjectLink { name: string; url: string; type: string; }
interface ContractAddr { address: string; network: string; networkSlug: string; }
interface TokenUnlock { timestamp: string; eventDate: string; eventType: string; status: string; priority: number; data: any; impact: any; importance: any; urgency: any; }
interface MarketPair { baseAsset: string; quoteAsset: string; exchange: string; exchangeLogo: string; price: number; volume: number; shareOfVolume: number; }
interface NewsAsset { id?: string; name: string; slug?: string; symbol?: string; }
interface NewsItem { headline: string; url: string; date: string; source: string; sourceLogo?: string; category: string; subCategory: string; summary?: string; assets?: (NewsAsset | string)[]; ogImageUrl?: string; contentType?: string; sourceType?: string; isPriceAnalysis?: boolean; }
interface KeyDevelopment { headline?: string; date?: string; category?: string; subCategory?: string; url?: string; details?: string; timestamp?: string; eventDate?: string; eventType?: string; status?: string; priority?: string | number; data?: any; impact?: any; importance?: any; urgency?: any; lastUpdated?: string; }

interface MessariProject {
  id: string; entityId: string; name: string; slug: string;
  overview: string; background: string;
  category: string; sector: string; sectors_v2: string[]; sub_sectors_v2: string[];
  logo_id: string; faqs: FAQ[]; links: ProjectLink[]; pageViews: number;
  asset: { id: string; name: string; slug: string; symbol: string; sector: string; sectors_v2: string[]; sub_sectors_v2: string[]; contract_addresses: ContractAddr[]; };
  price: number; priceChange: number; rank: number; assetId: string;
  ohlcv: OHLCVPoint[]; tokenUnlocks: TokenUnlock[]; developments: TokenUnlock[]; markets: MarketPair[];
}

interface CoinGeckoDetail {
  id: string; name: string; symbol: string; image: any;
  description: { en: string; } | string;
  categories: string[];
  links: { homepage: string[]; whitepaper: string; blockchain_site: string[]; repos_url: { github: string[]; }; twitter: string; telegram: string; reddit: string; github: string; };
  genesis_date: string; hashing_algorithm: string;
  market_data: {
    price: number; market_cap: number; market_cap_rank: number; fdv: number;
    total_volume: number; high_24h: number; low_24h: number;
    circulating_supply: number; total_supply: number; max_supply: number;
    ath: number; ath_date: string; ath_change: number;
    atl: number; atl_date: string; atl_change: number;
    price_change_1h: number; price_change_24h: number; price_change_7d: number;
    price_change_14d: number; price_change_30d: number; price_change_60d: number;
    price_change_200d: number; price_change_1y: number; mcap_fdv_ratio: number;
  };
  tickers: any[];
  community: any; developer: any;
  contract_address: string; platforms: Record<string, string>;
  chart_365d: any;
  last_updated: string;
}

interface CoinGeckoMarket {
  id: string; name: string; symbol: string; image: string;
  rank: number; price: number; market_cap: number; fdv: number;
  total_volume: number; circulating_supply: number; total_supply: number; max_supply: number;
  price_change_1h: number; price_change_24h: number; price_change_7d: number;
  price_change_14d: number; price_change_30d: number; price_change_200d: number; price_change_1y: number;
  ath: number; ath_change_percentage: number; ath_date: string;
  atl: number; atl_change_percentage: number; atl_date: string;
  sparkline_7d: number[];
}

/* Merged data for display */
interface CoinData {
  id: string; name: string; symbol: string;
  image: string; rank: number; price: number;
  market_cap: number; fdv: number; total_volume: number;
  circulating_supply: number; total_supply: number; max_supply: number | null;
  mcap_fdv_ratio: number;
  high_24h: number; low_24h: number;
  price_change_1h: number; price_change_24h: number; price_change_7d: number;
  price_change_14d: number; price_change_30d: number; price_change_200d: number; price_change_1y: number;
  ath: number; ath_date: string; ath_change: number;
  atl: number; atl_date: string; atl_change: number;
  description: string; aboutHtml: string; categories: string[];
  genesis_date: string; hashing_algorithm: string;
  homepage: string[]; whitepaper: string; blockchain_sites: string[];
  twitter: string; telegram: string; reddit: string; github: string[];
  platforms: Record<string, string>;
  contract_address: string;
  overview: string; background: string;
  sector: string; sectors_v2: string[]; sub_sectors_v2: string[];
  faqs: FAQ[]; messariLinks: ProjectLink[];
  messari_contract_addresses: ContractAddr[];
  ohlcv: OHLCVPoint[];
  tokenUnlocks: TokenUnlock[];
  developments: KeyDevelopment[];
  markets: MarketPair[];
  sparkline_7d: number[];
  tickers: any[];
  news: NewsItem[];
  sectorRank: string | number | null;
  subSectorRank: string | number | null;
  diaBlockchain?: string;
  diaAddress?: string;
}

type TabId = 'overview' | 'markets' | 'holders' | 'exchange-flows' | 'news' | 'history' | 'token-unlocks' | 'reports' | 'developments';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'markets', label: 'Markets', icon: '📈' },
  { id: 'holders', label: 'Holders', icon: '👥' },
  { id: 'exchange-flows', label: 'Exchange Flows', icon: '🔄' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'history', label: 'History', icon: '📈' },
  { id: 'token-unlocks', label: 'Token Unlocks', icon: '🔓' },
  { id: 'reports', label: 'Reports', icon: '📋' },
  { id: 'developments', label: 'Developments', icon: '🔧' },
];

/* Exchange logo URLs for well-known exchanges */
const EXCHANGE_LOGOS: Record<string, string> = {
  'Binance': 'https://assets.coingecko.com/markets/images/52/small/binance.jpg',
  'Coinbase Exchange': 'https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png',
  'OKX': 'https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png',
  'Bybit': 'https://assets.coingecko.com/markets/images/698/small/bybit_spot.png',
  'Gate.io': 'https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg',
  'Gate': 'https://assets.coingecko.com/markets/images/60/small/gate_io_logo1.jpg',
  'KuCoin': 'https://assets.coingecko.com/markets/images/61/small/kucoin.png',
  'Kraken': 'https://assets.coingecko.com/markets/images/29/small/kraken.jpg',
  'Bitget': 'https://assets.coingecko.com/markets/images/540/small/Bitget.jpeg',
  'MEXC': 'https://assets.coingecko.com/markets/images/409/small/MEXC_logo_square.jpeg',
  'HTX': 'https://assets.coingecko.com/markets/images/25/small/logo_V_colour_black.png',
  'Bitfinex': 'https://assets.coingecko.com/markets/images/4/small/BItfinex.png',
  'Crypto.com Exchange': 'https://assets.coingecko.com/markets/images/589/small/Crypto.jpg',
  'BingX': 'https://assets.coingecko.com/markets/images/812/small/BingX_brand_logo.png',
  'Bullish': 'https://assets.coingecko.com/markets/images/868/small/Bullish_Logo_Mark.png',
  'Bitstamp': 'https://assets.coingecko.com/markets/images/9/small/bitstamp.jpg',
  'Bittrex': 'https://assets.coingecko.com/markets/images/10/small/bittrex.jpg',
  'Gemini': 'https://assets.coingecko.com/markets/images/50/small/gemini.png',
  'Binance US': 'https://assets.coingecko.com/markets/images/419/small/Binance_US.png',
  'Upbit': 'https://assets.coingecko.com/markets/images/117/small/logo-square.jpeg',
  'LBank': 'https://assets.coingecko.com/markets/images/438/small/LBank_logo.png',
  'BitMart': 'https://assets.coingecko.com/markets/images/239/small/MjAxNy0wNi0yNSAxNjo1NzozMiAzMzQzOTQ.jpg',
  'Phemex': 'https://assets.coingecko.com/markets/images/508/small/phemex.png',
  'WhiteBIT': 'https://assets.coingecko.com/markets/images/418/small/whitebit.png',
  'DigiFinex': 'https://assets.coingecko.com/markets/images/225/small/Digifinex.png',
  'Pancakeswap V3 (BSC)': 'https://assets.coingecko.com/markets/images/687/small/pancakeswap.jpeg',
  'Uniswap V3 (Ethereum)': 'https://assets.coingecko.com/markets/images/665/small/uniswap-v3.png',
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */

export default function CryptoDetail({ id }: { id: string }) {
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedDev, setSelectedDev] = useState<KeyDevelopment | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBump, setFavoriteBump] = useState(false);

  /* ── Load data from all sources ── */
  useEffect(() => {
    const loadAll = async () => {
      try {
        const cb = `?v=${Date.now()}`;
        const [marketsRes, detailsRes, messariRes, aboutRes, ohlcvRes] = await Promise.allSettled([
          fetch(`/data/coingecko-markets.json${cb}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
          fetch(`/data/coingecko-details.json${cb}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
          fetch(`/data/messari-projects.json${cb}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
          fetch(`/data/coingecko-about.json${cb}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : {}),
          fetch(`/data/coingecko-ohlcv.json${cb}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : {}),
        ]);

        const markets: CoinGeckoMarket[] = marketsRes.status === 'fulfilled' ? marketsRes.value : [];
        const details: CoinGeckoDetail[] = detailsRes.status === 'fulfilled' ? detailsRes.value : [];
        const messariRaw = messariRes.status === 'fulfilled' ? messariRes.value : [];
        // messari-projects.json can be either an array or an object keyed by coin id
        const messari: MessariProject[] = Array.isArray(messariRaw) ? messariRaw : Object.values(messariRaw);
        const messariMap: Record<string, MessariProject> = Array.isArray(messariRaw) ? {} : messariRaw;
        const aboutMap: Record<string, { title: string; html: string }> = aboutRes.status === 'fulfilled' ? aboutRes.value : {};
        const ohlcvMap: Record<string, OHLCVPoint[]> = ohlcvRes.status === 'fulfilled' ? ohlcvRes.value : {};

        const mkt = markets.find(m => m.id === id || m.name?.toLowerCase() === id.toLowerCase());
        const det = details.find(d => d.id === id || d.name?.toLowerCase() === id.toLowerCase());
        // Try direct key lookup first (fast), then fallback to .find()
        const mes = messariMap[id] || messari.find(m => m.slug === id || m.id === id || m.messariSlug === id || m.name?.toLowerCase() === id.toLowerCase());

        if (!mkt && !det && !mes) {
          setCoin(null);
          setLoading(false);
          return;
        }

        const md = det?.market_data;
        const desc = typeof det?.description === 'object' ? (det.description as any)?.en || '' : (det?.description || '');

        const merged: CoinData = {
          id,
          name: mkt?.name || det?.name || mes?.name || id,
          symbol: (mkt?.symbol || det?.symbol || mes?.asset?.symbol || '').toUpperCase(),
          image: mkt?.image || (typeof det?.image === 'object' ? (det.image as any)?.large : det?.image) || (mes?.logo_id ? `https://asset-images.messari.io/images/${mes.logo_id}/128.png` : ''),
          rank: mkt?.rank || md?.market_cap_rank || mes?.rank || 0,
          price: md?.price || mkt?.price || mes?.price || 0,
          market_cap: md?.market_cap || mkt?.market_cap || 0,
          fdv: md?.fdv || mkt?.fdv || 0,
          total_volume: md?.total_volume || mkt?.total_volume || 0,
          circulating_supply: md?.circulating_supply || mkt?.circulating_supply || 0,
          total_supply: md?.total_supply || mkt?.total_supply || 0,
          max_supply: md?.max_supply || mkt?.max_supply || null,
          mcap_fdv_ratio: md?.mcap_fdv_ratio || (mkt?.market_cap && mkt?.fdv ? mkt.market_cap / mkt.fdv : 0),
          high_24h: md?.high_24h || 0,
          low_24h: md?.low_24h || 0,
          price_change_1h: md?.price_change_1h || mkt?.price_change_1h || 0,
          price_change_24h: md?.price_change_24h || mkt?.price_change_24h || 0,
          price_change_7d: md?.price_change_7d || mkt?.price_change_7d || 0,
          price_change_14d: md?.price_change_14d || mkt?.price_change_14d || 0,
          price_change_30d: md?.price_change_30d || mkt?.price_change_30d || 0,
          price_change_200d: md?.price_change_200d || mkt?.price_change_200d || 0,
          price_change_1y: md?.price_change_1y || mkt?.price_change_1y || 0,
          ath: md?.ath || mkt?.ath || 0,
          ath_date: md?.ath_date || mkt?.ath_date || '',
          ath_change: md?.ath_change || mkt?.ath_change_percentage || 0,
          atl: md?.atl || mkt?.atl || 0,
          atl_date: md?.atl_date || mkt?.atl_date || '',
          atl_change: md?.atl_change || mkt?.atl_change_percentage || 0,
          description: desc || mes?.overview || '',
          aboutHtml: aboutMap[id]?.html || '',
          categories: det?.categories || [],
          genesis_date: det?.genesis_date || '',
          hashing_algorithm: det?.hashing_algorithm || '',
          homepage: det?.links?.homepage?.filter(Boolean) || [],
          whitepaper: det?.links?.whitepaper || '',
          blockchain_sites: det?.links?.blockchain_site?.filter(Boolean) || [],
          twitter: det?.links?.twitter || '',
          telegram: det?.links?.telegram || '',
          reddit: det?.links?.reddit || '',
          github: det?.links?.repos_url?.github?.filter(Boolean) || (det?.links?.github ? [det.links.github] : []),
          platforms: det?.platforms || {},
          contract_address: det?.contract_address || '',
          overview: mes?.overview || '',
          background: mes?.background || '',
          sector: mes?.sector || '',
          sectors_v2: mes?.sectors_v2 || [],
          sub_sectors_v2: mes?.sub_sectors_v2 || [],
          faqs: mes?.faqs || [],
          messariLinks: mes?.links || [],
          messari_contract_addresses: mes?.asset?.contract_addresses || mes?.contract_addresses || [],
          ohlcv: ohlcvMap[id] || mes?.ohlcv || [],
          tokenUnlocks: mes?.tokenUnlocks || [],
          developments: mes?.developments || [],
          markets: mes?.markets || [],
          sparkline_7d: mkt?.sparkline_7d || [],
          tickers: det?.tickers || [],
          news: mes?.news || [],
          sectorRank: mes?.sectorRank || null,
          subSectorRank: mes?.subSectorRank || null,
        };

        // Resolve DIA blockchain mapping
        const diaP = getDiaParams(id, det?.platforms, det?.contract_address);
        if (diaP) {
          merged.diaBlockchain = diaP.blockchain;
          merged.diaAddress = diaP.address;
        }

        setCoin(merged);
      } catch (e) {
        console.error('Failed to load coin data:', e);
        setCoin(null);
      }
      setLoading(false);
    };

    loadAll();
  }, [id]);

  /* ── Fetch live data from API (fills ALL fields for coins without cached details) ── */
  useEffect(() => {
    if (!id) return;
    const fetchLive = async () => {
      try {
        const endpoint = encodeURIComponent(`/coins/${id}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`);
        const res = await fetch(`/api/coingecko?endpoint=${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          setLiveData(data);
          setCoin(prev => {
            if (!prev) return prev;
            const md = data.market_data;
            if (!md) return prev;
            // Extract links from API response
            const apiHomepage = data.links?.homepage?.filter((u: string) => u) || [];
            const apiBlockchainSites = data.links?.blockchain_site?.filter((u: string) => u) || [];
            const apiGithub = data.links?.repos_url?.github?.filter((u: string) => u) || [];
            const apiDesc = data.description?.en || '';
            const apiTickers = (data.tickers || []).slice(0, 30).map((t: any) => ({
              base: t.base,
              target: t.target,
              exchange: t.market?.name || '',
              exchange_logo: t.market?.logo || EXCHANGE_LOGOS[t.market?.name || ''] || '',
              last_price: t.last || 0,
              volume: t.converted_volume?.usd || t.volume || 0,
              trade_url: t.trade_url || '',
              trust_score: t.trust_score || '',
            }));
            return {
              ...prev,
              // Always update with live prices
              price: md.current_price?.usd || prev.price,
              market_cap: md.market_cap?.usd || prev.market_cap,
              fdv: md.fully_diluted_valuation?.usd || prev.fdv,
              total_volume: md.total_volume?.usd || prev.total_volume,
              high_24h: md.high_24h?.usd || prev.high_24h,
              low_24h: md.low_24h?.usd || prev.low_24h,
              circulating_supply: md.circulating_supply || prev.circulating_supply,
              total_supply: md.total_supply || prev.total_supply,
              max_supply: md.max_supply || prev.max_supply,
              price_change_1h: md.price_change_percentage_1h_in_currency?.usd || prev.price_change_1h,
              price_change_24h: md.price_change_percentage_24h || prev.price_change_24h,
              price_change_7d: md.price_change_percentage_7d || prev.price_change_7d,
              price_change_14d: md.price_change_percentage_14d || prev.price_change_14d,
              price_change_30d: md.price_change_percentage_30d || prev.price_change_30d,
              price_change_200d: md.price_change_percentage_200d || prev.price_change_200d,
              price_change_1y: md.price_change_percentage_1y || prev.price_change_1y,
              ath: md.ath?.usd || prev.ath,
              ath_date: md.ath_date?.usd || prev.ath_date,
              ath_change: md.ath_change_percentage?.usd || prev.ath_change,
              atl: md.atl?.usd || prev.atl,
              atl_date: md.atl_date?.usd || prev.atl_date,
              atl_change: md.atl_change_percentage?.usd || prev.atl_change,
              // Fill description/about - always prefer live if current is empty
              description: prev.description || apiDesc,
              // Fill categories from live API if missing
              categories: prev.categories?.length ? prev.categories : (data.categories || []),
              // Always update tickers from live API (better exchange names/logos)
              tickers: apiTickers.length > 0 ? apiTickers : prev.tickers,
              // Fill link/info fields from live API if missing from cached data
              homepage: prev.homepage?.length ? prev.homepage : apiHomepage,
              whitepaper: prev.whitepaper || data.links?.whitepaper || '',
              blockchain_sites: prev.blockchain_sites?.length ? prev.blockchain_sites : apiBlockchainSites,
              twitter: prev.twitter || data.links?.twitter_screen_name || '',
              telegram: prev.telegram || data.links?.telegram_channel_identifier || '',
              reddit: prev.reddit || data.links?.subreddit_url || '',
              github: prev.github?.length ? prev.github : apiGithub,
              platforms: (prev.platforms && Object.keys(prev.platforms).length > 0) ? prev.platforms : (data.platforms || {}),
              contract_address: prev.contract_address || data.contract_address || '',
              genesis_date: prev.genesis_date || data.genesis_date || '',
              hashing_algorithm: prev.hashing_algorithm || data.hashing_algorithm || '',
              // Fill image if missing
              image: prev.image || (typeof data.image === 'object' ? data.image?.large : data.image) || '',
              // Fill symbol/name if empty
              symbol: prev.symbol || (data.symbol || '').toUpperCase(),
              name: prev.name === id ? (data.name || prev.name) : prev.name,
            };
          });
        }
      } catch { /* silently fail, use cached data */ }
    };
    fetchLive();
  }, [id]);

  useEffect(() => {
    setIsFavorite(isFavoriteId(id));
    const unsubscribe = subscribeFavorites(() => setIsFavorite(readFavoriteIds().has(id)));
    return unsubscribe;
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 min-h-screen text-white">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400">Loading project data...</span>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen text-white p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-bold">Project Not Found</h2>
        <p className="text-gray-400">No data found for &quot;{id}&quot;</p>
        <Link href="/chat/cryptocurrencies" className="text-teal-400 hover:underline mt-4">← Back to list</Link>
      </div>
    );
  }

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  const handleToggleFavorite = () => {
    const next = toggleFavoriteId(id);
    setIsFavorite(next);
    setFavoriteBump(true);
    window.setTimeout(() => setFavoriteBump(false), 220);
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div dir="ltr" className="mb-4 text-sm text-gray-400 flex items-center gap-2">
          <Link href="/chat/cryptocurrencies" className="hover:text-teal-300 transition">Cryptocurrencies</Link>
          <span className="opacity-60">›</span>
          <span className="text-gray-300">{coin.name} Price</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[312px_minmax(0,1fr)] gap-5 items-start">
          <CoinSidebar
            coin={coin}
            liveData={liveData}
            isFavorite={isFavorite}
            favoriteBump={favoriteBump}
            onToggleFavorite={handleToggleFavorite}
          />

          <div>
            {/* ═══ Tab Navigation ═══ */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1 border-b border-white/10 scrollbar-hide" dir="ltr">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-4 py-3 text-sm whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id && tab.id !== 'developments'
                      ? 'border-teal-400 text-teal-300'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="mr-1.5">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* ═══ Tab Content ═══ */}
            {activeTab === 'overview' && <OverviewContent coin={coin} />}
            {activeTab === 'markets' && <MarketsTab coin={coin} />}
            {activeTab === 'holders' && <PlaceholderTab icon="👥" title="Holders" desc="Holder distribution and whale tracking data will be integrated here." />}
            {activeTab === 'exchange-flows' && <PlaceholderTab icon="🔄" title="Exchange Flows" desc="Real-time inflow/outflow data across major exchanges will appear here." />}
            {activeTab === 'news' && <NewsTab coin={coin} selectedNews={selectedNews} onSelectNews={setSelectedNews} />}
            {activeTab === 'history' && <HistoryTab coin={coin} />}
            {activeTab === 'token-unlocks' && <TokenUnlocksTab coin={coin} />}
            {activeTab === 'reports' && <ReportsTab coin={coin} />}
            {activeTab === 'developments' && <DevelopmentsTab coin={coin} selectedDev={selectedDev} onSelectDev={setSelectedDev} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ════════════════════════════════════════════════════════════ */

function OverviewTab({ coin }: { coin: CoinData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Right Column (first on mobile) ── */}
      <div className="space-y-6 order-1 lg:order-2">
        {/* Market Data */}
        <MarketDataGrid coin={coin} />

        {/* Info Card */}
        <InfoCard coin={coin} />

        {/* Price Changes */}
        <PriceChangesCard coin={coin} />


        {/* Market Pairs / Tickers */}
        <TickersCard coin={coin} />

        {/* Classifications */}
        <ClassificationsCard coin={coin} />
      </div>

      {/* ── Left Column ── */}
      <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
        {/* Price Chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <PriceChart coin={coin} />
        </div>

        {/* DIA Sources — Exchanges aggregated volume */}
        <DiaSourcesCard coin={coin} />

        {/* About Section */}
        <AboutSection coin={coin} />

        {/* Token Information / FAQ */}
        <TokenInfoSection coin={coin} />
      </div>

    </div>
  );
}

function CoinSidebar({
  coin,
  liveData,
  isFavorite,
  favoriteBump,
  onToggleFavorite,
}: {
  coin: CoinData;
  liveData: any;
  isFavorite: boolean;
  favoriteBump: boolean;
  onToggleFavorite: () => void;
}) {
  const btcPrice = liveData?.market_data?.current_price?.btc;
  const ethPrice = liveData?.market_data?.current_price?.eth;
  const btcChange = liveData?.market_data?.price_change_percentage_24h_in_currency?.btc;
  const ethChange = liveData?.market_data?.price_change_percentage_24h_in_currency?.eth;

  const hasRange = coin.high_24h > 0 && coin.low_24h > 0 && coin.high_24h > coin.low_24h;
  const rangeProgress = hasRange
    ? Math.min(100, Math.max(0, ((coin.price - coin.low_24h) / (coin.high_24h - coin.low_24h)) * 100))
    : 0;

  return (
    <aside className="space-y-3" dir="ltr">
      <div className="rounded-xl border border-white/[0.12] bg-gradient-to-b from-[#1f3f3b] to-[#1a3431] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3">
          {coin.image ? (
            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full bg-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-teal-900/40 flex items-center justify-center text-sm font-bold text-teal-300">
              {coin.symbol?.[0] || '?'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-[29px] leading-[1.05] tracking-tight truncate">{coin.name} <span className="text-gray-300 font-medium text-xs">{coin.symbol} Price</span></h1>
            {coin.rank > 0 && <div className="text-[11px] text-blue-300/90 mt-1">#{coin.rank}</div>}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[44px] font-semibold leading-none tracking-tight">{fmtPrice(coin.price)}</div>
          <div className="mt-1"><PriceChange value={coin.price_change_30d} suffix=" (3m)" /></div>
          {(btcPrice || ethPrice) && (
            <div className="mt-2 space-y-1 text-[11px]">
              {btcPrice ? (
                <div className="flex items-center gap-2 text-gray-300">
                  <span>{btcPrice.toFixed(8)} BTC</span>
                  <PriceChange value={btcChange} small />
                </div>
              ) : null}
              {ethPrice ? (
                <div className="flex items-center gap-2 text-gray-300">
                  <span>{ethPrice.toFixed(6)} ETH</span>
                  <PriceChange value={ethChange} small />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {hasRange && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-white/[0.14] overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${rangeProgress}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-300">
              <span>{fmtPrice(coin.low_24h)}</span>
              <span>{fmtPrice(coin.high_24h)}</span>
            </div>
          </div>
        )}

        <button
          onClick={onToggleFavorite}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
            isFavorite
              ? 'bg-amber-900/20 border-amber-500/35 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.08)] hover:bg-amber-900/30'
              : 'bg-white/[0.05] border-white/15 text-gray-200 hover:bg-white/[0.1] hover:text-white'
          }`}
        >
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-[13px] leading-none ${
            isFavorite
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
              : 'border-white/20 bg-white/[0.04] text-gray-400'
          } transition-transform duration-200 ${favoriteBump ? 'scale-110 -rotate-6' : 'scale-100 rotate-0'}`}>
            {isFavorite ? <SvgStarFilled /> : <SvgStar />}
          </span>
          {isFavorite ? 'Added to Favorites' : 'Add to Favorite'}
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-3">
        <MarketDataGrid coin={coin} />
      </div>

      <InfoCard coin={coin} />

      <PriceChangesCard coin={coin} />

      <ClassificationsCard coin={coin} />
    </aside>
  );
}

function OverviewContent({ coin }: { coin: CoinData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <PriceChart coin={coin} />
      </div>

      <AboutSection coin={coin} />

      {coin.faqs?.length > 0 && (
        <div
          className="rounded-2xl border border-emerald-400/25 bg-gradient-to-b from-[#1d4b43]/35 to-[#132a28]/55 p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          dir="ltr"
        >
          <h3 className="text-[22px] font-bold mb-4 tracking-tight text-white">❓ FAQ</h3>
          <div className="space-y-2.5">
            {coin.faqs.map((faq, i) => <FAQItem key={i} faq={faq} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MarketsTab({ coin }: { coin: CoinData }) {
  return (
    <div className="space-y-6" dir="ltr">
      <TickersCard coin={coin} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MARKET DATA GRID
   ════════════════════════════════════════════════════════════ */

function MarketDataGrid({ coin }: { coin: CoinData }) {
  const rows = [
    { label: 'Market Cap', value: fmtCompact(coin.market_cap) },
    { label: 'Fully Diluted Valuation', value: fmtCompact(coin.fdv) },
    { label: '24 Hour Trading Vol', value: fmtCompact(coin.total_volume) },
    { label: 'Circulating Supply', value: coin.circulating_supply ? `${fmtSupply(coin.circulating_supply)} ${coin.symbol}` : '—' },
    { label: 'Total Supply', value: coin.total_supply ? `${fmtSupply(coin.total_supply)} ${coin.symbol}` : '—' },
    { label: 'Max Supply', value: coin.max_supply ? `${fmtSupply(coin.max_supply)} ${coin.symbol}` : '∞' },
  ];

  return (
    <div dir="ltr" className="p-1">
      <div className="divide-y divide-white/[0.08] rounded-lg overflow-hidden">
        {rows.map((row, idx) => (
          <div key={idx} className="py-3 px-1.5 flex items-center justify-between gap-4">
            <span className="text-[13px] text-gray-300 inline-flex items-center gap-1">{row.label}</span>
            <span className="text-[14px] font-semibold text-white text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HISTORICAL PRICE CARD (ATH/ATL/Ranges)
   ════════════════════════════════════════════════════════════ */

function HistoricalPriceCard({ coin }: { coin: CoinData }) {
  const hasAnyData = coin.high_24h > 0 || coin.ath > 0 || coin.atl > 0 || (coin.sparkline_7d?.length > 0);
  if (!hasAnyData) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold mb-4">{coin.symbol} Historical Price</h3>
      <div className="space-y-0 divide-y divide-white/[0.06]">
        {/* 24h Range */}
        {(coin.high_24h > 0 || coin.low_24h > 0) && (
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-400 text-sm">24h Range</span>
            <span className="font-mono text-sm">{fmtPrice(coin.low_24h)} – {fmtPrice(coin.high_24h)}</span>
          </div>
        )}
        {/* 7d Range */}
        {coin.sparkline_7d?.length > 0 && (
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-400 text-sm">7d Range</span>
            <span className="font-mono text-sm">
              {fmtPrice(Math.min(...coin.sparkline_7d))} – {fmtPrice(Math.max(...coin.sparkline_7d))}
            </span>
          </div>
        )}
        {/* ATH */}
        {coin.ath > 0 && (
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-400 text-sm">All-Time High</span>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{fmtPrice(coin.ath)}</span>
                <PriceChange value={coin.ath_change} small />
              </div>
              {coin.ath_date && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(coin.ath_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' '}({timeAgo(coin.ath_date)})
                </div>
              )}
            </div>
          </div>
        )}
        {/* ATL */}
        {coin.atl > 0 && (
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-400 text-sm">All-Time Low</span>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{fmtPrice(coin.atl)}</span>
                <PriceChange value={coin.atl_change} small />
              </div>
              {coin.atl_date && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(coin.atl_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' '}({timeAgo(coin.atl_date)})
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ABOUT SECTION
   ════════════════════════════════════════════════════════════ */

function AboutSection({ coin }: { coin: CoinData }) {
  const [expanded, setExpanded] = useState(false);

  // Prefer the full crawled HTML, fall back to API description
  const hasRichContent = coin.aboutHtml && coin.aboutHtml.length > 100;
  const rawText = hasRichContent ? coin.aboutHtml : (coin.description || coin.overview || '');
  if (!rawText) return null;

  // Clean: remove CoinGecko/Messari links and references
  const cleanDescription = (html: string) => {
    return html
      .replace(/<a[^>]*href="[^"]*(?:coingecko\.com|messari\.io)[^"]*"[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(/\b(?:CoinGecko|Messari)\b/gi, '')
      // Remove empty href links
      .replace(/<a[^>]*href=""[^>]*>.*?<\/a>/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const text = cleanDescription(rawText);
  
  // For rich HTML content, show first ~800 chars with smart truncation at tag boundary
  const PREVIEW_LENGTH = hasRichContent ? 1200 : 600;
  let preview = text;
  if (text.length > PREVIEW_LENGTH) {
    // Find a good break point (end of paragraph or heading)
    let breakPoint = PREVIEW_LENGTH;
    const closeP = text.indexOf('</p>', PREVIEW_LENGTH - 200);
    const closeH3 = text.indexOf('</h3>', PREVIEW_LENGTH - 200);
    if (closeP > 0 && closeP < PREVIEW_LENGTH + 200) breakPoint = closeP + 4;
    else if (closeH3 > 0 && closeH3 < PREVIEW_LENGTH + 200) breakPoint = closeH3 + 5;
    preview = text.slice(0, breakPoint) + '<p class="mt-2 text-gray-500">...</p>';
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold mb-4">About {coin.name}</h3>
      <div
        dir="ltr"
        className="text-sm text-gray-300 leading-[1.8] text-left
          [&_a]:text-teal-400 [&_a]:underline [&_a:hover]:text-teal-300
          [&_p]:mb-3
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
          [&_li]:mb-2 [&_li]:leading-relaxed
          [&_br]:leading-[1.8]
          [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
          [&_h3]:text-white [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
          [&_h4]:text-gray-200 [&_h4]:font-medium [&_h4]:mt-4 [&_h4]:mb-1
          [&_strong]:text-white [&_strong]:font-semibold
          [&_em]:text-gray-200
          max-w-none"
        dangerouslySetInnerHTML={{ __html: expanded ? text : preview }}
      />
      {text.length > PREVIEW_LENGTH && (
        <button onClick={() => setExpanded(!expanded)} className="text-teal-400 text-sm mt-4 hover:underline font-medium">
          {expanded ? '▲ Show Less' : '▼ Read More'}
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SVG ICONS - Inline SVG components for crisp rendering
   ════════════════════════════════════════════════════════════ */

const SvgGlobe = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg>;
const SvgDoc = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const SvgSearch = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const SvgCopy = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const SvgCheck = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>;
const SvgChevron = ({ open }: { open: boolean }) => <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>;
const SvgExternal = () => <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const SvgGithub = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>;
const SvgReddit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 13.69c.11.25.17.53.17.82 0 2.21-2.57 4-5.74 4-3.17 0-5.73-1.79-5.73-4 0-.29.06-.57.17-.82-.55-.27-.93-.82-.93-1.45 0-.9.73-1.63 1.63-1.63.43 0 .82.17 1.1.44 1.07-.69 2.49-1.12 4.03-1.17l.82-3.87c.03-.12.15-.2.28-.17l2.73.58c.18-.37.56-.63 1-.63.61 0 1.11.5 1.11 1.11s-.5 1.11-1.11 1.11c-.56 0-1.03-.42-1.1-.97l-2.4-.51-.72 3.43c1.49.08 2.86.52 3.89 1.19.29-.28.68-.45 1.12-.45.9 0 1.63.73 1.63 1.63 0 .63-.36 1.17-.89 1.44zm-7.65.77c0 .61.5 1.11 1.11 1.11s1.11-.5 1.11-1.11-.5-1.11-1.11-1.11-1.11.5-1.11 1.11zm5.88 2.75c-.06.06-.65.57-2.24.57-.01 0-.03 0-.04 0-.02 0-.03 0-.05 0-1.59 0-2.18-.51-2.24-.57a.31.31 0 01.44-.44c.02.01.54.44 1.81.44h.08c1.27 0 1.79-.43 1.8-.44a.31.31 0 01.44.44zm-.36-1.64c-.61 0-1.11-.5-1.11-1.11 0-.61.5-1.11 1.11-1.11s1.11.5 1.11 1.11c0 .61-.5 1.11-1.11 1.11z"/></svg>;
const SvgTwitterX = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const SvgTelegram = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012.056 0h-.112zM17.9 6.54l-1.8 8.5c-.13.6-.49.75-.99.47l-2.73-2.01-1.32 1.27c-.15.15-.27.27-.55.27l.2-2.79 5.08-4.59c.22-.2-.05-.31-.34-.12l-6.28 3.95-2.7-.84c-.59-.19-.6-.59.12-.87l10.56-4.07c.49-.17.92.12.75.83z"/></svg>;
const SvgDiscord = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>;
const SvgFacebook = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const SvgWallet = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none"/></svg>;
const SvgExplorer = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 3 9 21"/><line x1="9" y1="9" x2="21" y2="9"/></svg>;
const SvgCalendar = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const SvgChain = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const SvgChartLine = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>;
const SvgChartBars = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="7" y1="6" x2="7" y2="18"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="17" y1="8" x2="17" y2="16"/><line x1="5" y1="10" x2="9" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/><line x1="15" y1="12" x2="19" y2="12"/></svg>;
const SvgDownload = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SvgExpand = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
const SvgStar = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const SvgStarFilled = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;

/* ════════════════════════════════════════════════════════════
   DROPDOWN BUTTON - CoinGecko-style dropdown for grouped items
   ════════════════════════════════════════════════════════════ */

function DropdownButton({ label, icon, items }: { label: string; icon: React.ReactNode; items: { label: string; url: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (items.length === 0) return null;
  if (items.length === 1) {
    return (
      <a href={items[0].url} target="_blank" rel="noopener noreferrer" className="info-btn group">
        {icon}<span>{items[0].label}</span><SvgExternal />
      </a>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="info-btn">
        {icon}<span>{label}</span><SvgChevron open={open} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 rounded-lg border border-white/15 bg-[#1e3938]/90 shadow-xl shadow-black/40 backdrop-blur-md">
          {items.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition"
            ><SvgExternal /><span>{item.label}</span></a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   INFO CARD (Links & Resources) - CoinGecko-style
   ════════════════════════════════════════════════════════════ */

function InfoCard({ coin }: { coin: CoinData }) {

  const isCleanUrl = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return !lower.includes('coingecko.com') && !lower.includes('messari.io');
  };

  // ── Websites ──
  const websites: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  coin.homepage?.filter(isCleanUrl).forEach(url => {
    const domain = extractDomain(url);
    if (domain && !seen.has(domain)) { websites.push({ label: domain, url }); seen.add(domain); }
  });
  coin.messariLinks?.filter(l => l.type === 'Website' && isCleanUrl(l.url)).forEach(l => {
    const domain = extractDomain(l.url);
    if (domain && !seen.has(domain)) { websites.push({ label: l.name || domain, url: l.url }); seen.add(domain); }
  });

  // ── Whitepaper ──
  const whitepaper = coin.whitepaper && isCleanUrl(coin.whitepaper) ? coin.whitepaper
    : coin.messariLinks?.find(l => l.name?.toLowerCase() === 'whitepaper' && isCleanUrl(l.url))?.url || '';

  // ── Explorers ──
  const explorers: { label: string; url: string }[] = [];
  const explorerSeen = new Set<string>();
  coin.blockchain_sites?.filter(isCleanUrl).forEach(url => {
    const domain = extractDomain(url);
    if (domain && !explorerSeen.has(domain)) {
      const label = domain.replace(/\.com$|\.io$|\.org$/, '').split('.').pop() || domain;
      explorers.push({ label: label.charAt(0).toUpperCase() + label.slice(1), url });
      explorerSeen.add(domain);
    }
  });
  coin.messariLinks?.filter(l => (l.type === 'Block\nExplorer' || l.type === 'Block Explorer') && isCleanUrl(l.url)).forEach(l => {
    const domain = extractDomain(l.url);
    if (domain && !explorerSeen.has(domain)) { explorers.push({ label: l.name || domain, url: l.url }); explorerSeen.add(domain); }
  });

  // ── Community ──
  const community: { icon: React.ReactNode; label: string; url: string }[] = [];
  if (coin.reddit && isCleanUrl(coin.reddit)) community.push({ icon: <SvgReddit />, label: 'Reddit', url: coin.reddit });
  coin.messariLinks?.filter(l => l.type === 'Social' && l.name === 'Reddit' && isCleanUrl(l.url)).forEach(l => {
    if (!community.find(c => c.label === 'Reddit')) community.push({ icon: <SvgReddit />, label: 'Reddit', url: l.url });
  });

  const twitterUrl = coin.twitter
    ? (coin.twitter.startsWith('http') ? coin.twitter : `https://x.com/${coin.twitter}`)
    : coin.messariLinks?.find(l => l.name === 'Twitter' && isCleanUrl(l.url))?.url || '';
  if (twitterUrl && isCleanUrl(twitterUrl)) community.push({ icon: <SvgTwitterX />, label: 'Twitter', url: twitterUrl });

  const fb = coin.messariLinks?.find(l => l.name === 'Facebook' && isCleanUrl(l.url));
  if (fb) community.push({ icon: <SvgFacebook />, label: 'Facebook', url: fb.url });

  const tgUrl = coin.telegram
    ? (coin.telegram.startsWith('http') ? coin.telegram : `https://t.me/${coin.telegram}`)
    : coin.messariLinks?.find(l => l.name === 'Telegram' && isCleanUrl(l.url))?.url || '';
  if (tgUrl && isCleanUrl(tgUrl)) community.push({ icon: <SvgTelegram />, label: 'Telegram', url: tgUrl });

  // Discord from messari
  const discord = coin.messariLinks?.find(l => l.name === 'Discord' && isCleanUrl(l.url));
  if (discord) community.push({ icon: <SvgDiscord />, label: 'Discord', url: discord.url });

  const forum = coin.messariLinks?.find(l => l.name === 'Forum' && isCleanUrl(l.url));
  if (forum) community.push({ icon: <SvgGlobe />, label: extractDomain(forum.url), url: forum.url });

  // ── Source Code ──
  const repos: { label: string; url: string }[] = [];
  const repoSeen = new Set<string>();
  coin.github?.filter(isCleanUrl).forEach(url => {
    if (!repoSeen.has(url)) { repos.push({ label: 'Github', url }); repoSeen.add(url); }
  });
  coin.messariLinks?.filter(l => l.name === 'Github' && isCleanUrl(l.url)).forEach(l => {
    if (!repoSeen.has(l.url)) { repos.push({ label: 'Github', url: l.url }); repoSeen.add(l.url); }
  });
  const docs = coin.messariLinks?.find(l => l.name === 'Documentation' && isCleanUrl(l.url));

  // ── Chains ──
  const chains = Object.keys(coin.platforms || {}).filter(k => k.length > 0).map(k => formatPlatformName(k));

  // ── Contracts (merged) ──
  const contracts: { network: string; address: string }[] = [];
  const contractSeen = new Set<string>();
  const pushContract = (network: string, address: string) => {
    const addr = (address || '').trim();
    if (!addr) return;
    const key = addr.toLowerCase();
    if (contractSeen.has(key)) return;
    contracts.push({ network: network || 'Contract', address: addr });
    contractSeen.add(key);
  };

  Object.entries(coin.platforms || {}).forEach(([network, address]) => {
    if (address) pushContract(formatPlatformName(network), address);
  });

  (coin.messari_contract_addresses || []).forEach(c => {
    pushContract(formatPlatformName(c.network || 'Contract'), c.address);
  });

  if (coin.contract_address) pushContract(chains[0] || 'Contract', coin.contract_address);

  // ── Wallets ──
  const WALLET_DB: Record<string, { label: string; url: string }[]> = {
    bitcoin: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trezor', url: 'https://trezor.io/' },
      { label: 'Electrum', url: 'https://electrum.org/' },
      { label: 'Xdefi', url: 'https://www.xdefi.io/' },
      { label: 'SafePal', url: 'https://www.safepal.com/' },
    ],
    ethereum: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trezor', url: 'https://trezor.io/' },
      { label: 'MetaMask', url: 'https://metamask.io/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
      { label: 'SafePal', url: 'https://www.safepal.com/' },
    ],
    solana: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Phantom', url: 'https://phantom.app/' },
      { label: 'Solflare', url: 'https://solflare.com/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
    ],
    ripple: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trezor', url: 'https://trezor.io/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
      { label: 'Xaman', url: 'https://xaman.app/' },
    ],
    dogecoin: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trezor', url: 'https://trezor.io/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
    ],
    cardano: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trezor', url: 'https://trezor.io/' },
      { label: 'Daedalus', url: 'https://daedaluswallet.io/' },
      { label: 'Yoroi', url: 'https://yoroi-wallet.com/' },
    ],
    binancecoin: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
      { label: 'MetaMask', url: 'https://metamask.io/' },
      { label: 'SafePal', url: 'https://www.safepal.com/' },
    ],
    tron: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'TronLink', url: 'https://www.tronlink.org/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
    ],
    monero: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'Trezor', url: 'https://trezor.io/' },
      { label: 'Monero GUI', url: 'https://www.getmonero.org/downloads/' },
    ],
    chainlink: [
      { label: 'Ledger', url: 'https://www.ledger.com/' },
      { label: 'MetaMask', url: 'https://metamask.io/' },
      { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
    ],
  };
  const defaultErc20Wallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'MetaMask', url: 'https://metamask.io/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];
  const solanaWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'Phantom', url: 'https://phantom.app/' },
    { label: 'Solflare', url: 'https://solflare.com/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];
  const bscWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'MetaMask', url: 'https://metamask.io/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
    { label: 'SafePal', url: 'https://www.safepal.com/' },
  ];
  const avalancheWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'MetaMask', url: 'https://metamask.io/' },
    { label: 'Core', url: 'https://core.app/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];
  const polygonWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'MetaMask', url: 'https://metamask.io/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];
  const cosmosWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'Keplr', url: 'https://www.keplr.app/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];
  const polkadotWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'Polkadot.js', url: 'https://polkadot.js.org/extension/' },
    { label: 'Talisman', url: 'https://www.talisman.xyz/' },
    { label: 'Nova Wallet', url: 'https://novawallet.io/' },
  ];
  const nearWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'NEAR Wallet', url: 'https://wallet.near.org/' },
    { label: 'Meteor', url: 'https://meteorwallet.app/' },
  ];
  const tonWallets = [
    { label: 'Tonkeeper', url: 'https://tonkeeper.com/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
    { label: 'MyTonWallet', url: 'https://mytonwallet.io/' },
  ];
  const tronWallets = [
    { label: 'Ledger', url: 'https://www.ledger.com/' },
    { label: 'TronLink', url: 'https://www.tronlink.org/' },
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];
  const defaultFallback = [
    { label: 'Trust Wallet', url: 'https://trustwallet.com/' },
  ];

  // Platform-based wallet detection
  const platformKeys = Object.keys(coin.platforms || {}).map(k => k.toLowerCase());
  let wallets = WALLET_DB[coin.id] || [];
  if (wallets.length === 0) {
    if (platformKeys.some(k => k.includes('solana'))) wallets = solanaWallets;
    else if (platformKeys.some(k => k.includes('near'))) wallets = nearWallets;
    else if (platformKeys.some(k => k.includes('polkadot'))) wallets = polkadotWallets;
    else if (platformKeys.some(k => k.includes('cosmos') || k.includes('osmosis'))) wallets = cosmosWallets;
    else if (platformKeys.some(k => k.includes('ton') || k === 'the-open-network')) wallets = tonWallets;
    else if (platformKeys.some(k => k.includes('tron'))) wallets = tronWallets;
    else if (platformKeys.some(k => k.includes('avalanche'))) wallets = avalancheWallets;
    else if (platformKeys.some(k => k.includes('polygon'))) wallets = polygonWallets;
    else if (platformKeys.some(k => k.includes('binance') || k === 'bsc' || k.includes('bnb'))) wallets = bscWallets;
    else if (platformKeys.some(k => k.includes('ethereum') || k.includes('arbitrum') || k.includes('optimism') || k.includes('base') || k.includes('zksync') || k.includes('linea') || k.includes('scroll') || k.includes('blast') || k === '')) wallets = defaultErc20Wallets;
    else if (platformKeys.length > 0) wallets = defaultFallback;
  }

  const hasAny = websites.length > 0 || whitepaper || explorers.length > 0 || community.length > 0 || repos.length > 0 || chains.length > 0 || contracts.length > 0 || wallets.length > 0;
  if (!hasAny) return null;

  /* ── CoinGecko-style button CSS class ── */
  const btnClass = "info-btn";

  return (
    <div dir="ltr" className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4">
      <h3 className="text-lg font-bold mb-4">Info</h3>

      {/* Shared button styles via style tag */}
      <style>{`
        .info-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 10px; border-radius: 9999px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          color: #d1d5db; font-size: 11px; font-weight: 500;
          transition: all 0.15s; cursor: pointer; white-space: nowrap;
          text-decoration: none;
        }
        .info-btn:hover { background: rgba(255,255,255,0.12); color: #5eead4; border-color: rgba(94,234,212,0.2); }
        .info-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: 9999px;
          font-size: 12px; font-weight: 500; white-space: nowrap;
        }

        .info-badge-purple { background: rgba(168,85,247,0.1); color: #c4b5fd; border: 1px solid rgba(168,85,247,0.15); }
      `}</style>

      <div className="divide-y divide-white/[0.06]">

        {/* ── Contract ── */}
        {contracts.length > 0 && (
          contracts.length <= 2 ? (
            <InfoRow label="Contract" icon={<SvgChain />}>
              <div className="flex flex-wrap gap-1.5 justify-end items-center">
                <ContractBadge contract={contracts[0]} />
                {contracts.length > 1 && (
                  <ContractBadge contract={contracts[1]} />
                )}
              </div>
            </InfoRow>
          ) : (
            <ContractsGrid contracts={contracts} />
          )
        )}

        {/* ── Website ── */}
        {(websites.length > 0 || whitepaper) && (
          <InfoRow label="Website" icon={<SvgGlobe />}>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {websites.map((w, i) => (
                <a key={i} href={w.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                  {w.label}<SvgExternal />
                </a>
              ))}
              {whitepaper && (
                <a href={whitepaper} target="_blank" rel="noopener noreferrer" className={btnClass}>
                  <SvgDoc />Whitepaper
                </a>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── Explorers ── */}
        {explorers.length > 0 && (
          <InfoRow label="Explorers" icon={<SvgExplorer />}>
            <div className="flex flex-wrap gap-1.5 justify-end items-center">
              {explorers.length <= 3 ? (
                explorers.map((e, i) => (
                  <a key={i} href={e.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                    {e.label}<SvgExternal />
                  </a>
                ))
              ) : (
                <>
                  <a href={explorers[0].url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                    {explorers[0].label}<SvgExternal />
                  </a>
                  <DropdownButton label={`${explorers.length - 1} more`} icon={<SvgExplorer />} items={explorers.slice(1)} />
                </>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── Wallets ── */}
        {wallets.length > 0 && (
          <InfoRow label="Wallets" icon={<SvgWallet />}>
            <div className="flex flex-wrap gap-1.5 justify-end items-center">
              {wallets.length <= 3 ? (
                wallets.map((w, i) => (
                  <a key={i} href={w.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                    {w.label}<SvgExternal />
                  </a>
                ))
              ) : (
                <>
                  {wallets.slice(0, 2).map((w, i) => (
                    <a key={i} href={w.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                      {w.label}<SvgExternal />
                    </a>
                  ))}
                  <DropdownButton label={`${wallets.length - 2} more`} icon={<SvgWallet />} items={wallets.slice(2)} />
                </>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── Community ── */}
        {community.length > 0 && (
          <InfoRow label="Community" icon={<SvgReddit />}>
            <div className="flex flex-wrap gap-1.5 justify-end items-center">
              {community.length <= 4 ? (
                community.map((c, i) => (
                  <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                    {c.icon}<span>{c.label}</span>
                  </a>
                ))
              ) : (
                <>
                  {community.slice(0, 3).map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                      {c.icon}<span>{c.label}</span>
                    </a>
                  ))}
                  <DropdownButton
                    label={`${community.length - 3} more`}
                    icon={<SvgReddit />}
                    items={community.slice(3).map((c) => ({ label: c.label, url: c.url }))}
                  />
                </>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── Search on ── */}
        {twitterUrl && (
          <InfoRow label="Search on" icon={<SvgSearch />}>
            <a href={`https://x.com/search?q=%24${coin.symbol}`} target="_blank" rel="noopener noreferrer" className={btnClass}>
              <SvgTwitterX />Twitter
            </a>
          </InfoRow>
        )}

        {/* ── Source Code ── */}
        {(repos.length > 0 || docs) && (
          <InfoRow label="Source Code" icon={<SvgGithub />}>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {repos.length <= 2 ? (
                repos.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                    <SvgGithub />{r.label}
                  </a>
                ))
              ) : (
                <>
                  <a href={repos[0].url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                    <SvgGithub />{repos[0].label}
                  </a>
                  <DropdownButton label={`${repos.length - 1} more`} icon={<SvgGithub />} items={repos.slice(1)} />
                </>
              )}
              {docs && (
                <a href={docs.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                  <SvgDoc />Docs
                </a>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── API ID ── */}
        <InfoRow label="API ID" icon={<SvgCopy />}>
          <CopyableId value={coin.id} />
        </InfoRow>

        {/* ── Sector ── */}
        {coin.sector && (
          <InfoRow label="Sector" icon={<SvgGlobe />}>
            <div className="flex items-center gap-2">
              <span className="info-badge info-badge-blue">{coin.sector}</span>
              {coin.sectorRank && (
                <span className="text-xs text-gray-400">#{coin.sectorRank}</span>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── Sub-Sector ── */}
        {(coin.sub_sectors_v2?.length > 0 || coin.sectors_v2?.length > 0) && (
          <InfoRow label="Sub-Sector" icon={<SvgGlobe />}>
            <div className="flex flex-wrap gap-1.5 justify-end items-center">
              {[...(coin.sub_sectors_v2 || []), ...(coin.sectors_v2 || [])].filter((v, i, a) => a.indexOf(v) === i).map((s, i) => (
                <span key={i} className="info-badge info-badge-teal">{s}</span>
              ))}
              {coin.subSectorRank && (
                <span className="text-xs text-gray-400">#{coin.subSectorRank}</span>
              )}
            </div>
          </InfoRow>
        )}

        {/* ── Chains ── */}
        {chains.length > 0 && (
          <InfoRow label="Chains" icon={<SvgChain />}>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {chains.map((c, i) => (
                <span key={i} className="info-badge info-badge-purple"><SvgChain />{c}</span>
              ))}
            </div>
          </InfoRow>
        )}

      </div>
    </div>
  );
}

/* Info Row - CoinGecko style layout with icon */
function InfoRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 py-3">
      <span className="flex items-center gap-2 text-gray-400 text-[13px] whitespace-nowrap pt-0.5">
        {icon && <span className="text-gray-500">{icon}</span>}
        {label}
      </span>
      <div className="min-w-0 flex justify-end text-right">{children}</div>
    </div>
  );
}

/* Copyable API ID - with SVG icon */
function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <button onClick={copy}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition border cursor-pointer ${
        copied ? 'bg-emerald-900/20 text-emerald-300 border-emerald-500/20' : 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.12] hover:text-teal-300 border-white/[0.08]'
      }`}
    >
      {value} {copied ? <SvgCheck /> : <SvgCopy />}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   PRICE CHANGES CARD
   ════════════════════════════════════════════════════════════ */

function PriceChangesCard({ coin }: { coin: CoinData }) {
  const changes = [
    { label: '1h', value: coin.price_change_1h },
    { label: '24h', value: coin.price_change_24h },
    { label: '7d', value: coin.price_change_7d },
    { label: '14d', value: coin.price_change_14d },
    { label: '30d', value: coin.price_change_30d },
    { label: '200d', value: coin.price_change_200d },
    { label: '1y', value: coin.price_change_1y },
  ];

  if (changes.every(c => !c.value)) return null;

  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4">
      <h3 className="text-lg font-bold mb-3">📉 Price Changes</h3>
      <div className="space-y-0 divide-y divide-white/[0.06]">
        {changes.map(c => (
          <div key={c.label} className="flex items-center justify-between py-2.5">
            <span className="text-gray-300 text-[13px]">{c.label}</span>
            <PriceChange value={c.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DIA SOURCES CARD  — Exchange volume aggregated by DIA
   ════════════════════════════════════════════════════════════ */

interface DiaExchangeInfo {
  Name: string;
  Volume24h: number;
  NumPairs: number;
  NumTrades: number;
}

interface DiaAssetInfo {
  Symbol: string;
  Name: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  ExchangeInfo: DiaExchangeInfo[];
}

function DiaSourcesCard({ coin }: { coin: CoinData }) {
  const [data, setData] = useState<DiaAssetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExchange, setExpandedExchange] = useState<string | null>(null);

  useEffect(() => {
    if (!coin.diaBlockchain || !coin.diaAddress) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchDia = async () => {
      try {
        const res = await fetch(
          `/api/dia?blockchain=${encodeURIComponent(coin.diaBlockchain!)}&address=${encodeURIComponent(coin.diaAddress!)}`,
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const json: DiaAssetInfo = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Silently fail — component won't render
      }
      if (!cancelled) setLoading(false);
    };
    fetchDia();
    return () => { cancelled = true; };
  }, [coin.diaBlockchain, coin.diaAddress]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse" />
          <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 rounded-lg bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // No data or no exchanges
  if (!data?.ExchangeInfo?.length) return null;

  const exchanges = [...data.ExchangeInfo].sort((a, b) => b.Volume24h - a.Volume24h);
  const totalVolume = data.VolumeYesterdayUSD || exchanges.reduce((s, e) => s + e.Volume24h, 0);

  return (
    <div className="rounded-xl border border-white/[0.12] bg-[#0d1421]/80 p-5" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Sources</h3>
        <span className="text-[13px] text-gray-400">
          24h Volume: <span className="text-white font-semibold">{fmtCompact(totalVolume)}</span>
        </span>
      </div>

      {/* Table header */}
      <div className="rounded-lg border border-white/[0.08] overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_120px_70px] gap-2 px-4 py-2.5 bg-white/[0.04] text-[11px] uppercase tracking-wide text-gray-400 font-medium">
          <div>Sources</div>
          <div className="text-right">Volume 24h</div>
          <div className="text-right">Trades 24h</div>
          <div className="text-right">Pairs</div>
        </div>

        {/* Exchange rows */}
        <div className="divide-y divide-white/[0.05]">
          {exchanges.map((ex) => {
            const isExpanded = expandedExchange === ex.Name;
            const logo = DIA_EXCHANGE_LOGOS[ex.Name];

            return (
              <div key={ex.Name}>
                <button
                  onClick={() => setExpandedExchange(isExpanded ? null : ex.Name)}
                  className="w-full grid grid-cols-[1fr_180px_120px_70px] gap-2 px-4 py-3 text-sm hover:bg-white/[0.03] transition items-center"
                >
                  {/* Exchange name + logo */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {logo ? (
                      <img src={logo} alt={ex.Name} className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex-shrink-0" />
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/15 text-[11px] text-gray-200 font-semibold flex-shrink-0">
                        {ex.Name[0]}
                      </span>
                    )}
                    <span className="text-[13px] font-semibold text-gray-100 truncate">{ex.Name}</span>
                  </div>

                  {/* Volume */}
                  <div className="text-right font-mono text-[13px] text-white">
                    {fmtCompact(ex.Volume24h)}
                  </div>

                  {/* Trades */}
                  <div className="text-right font-mono text-[13px] text-gray-200">
                    {ex.NumTrades > 0 ? ex.NumTrades.toLocaleString() : '—'}
                  </div>

                  {/* Pairs + chevron */}
                  <div className="text-right flex items-center justify-end gap-1.5">
                    <span className="font-mono text-[13px] text-gray-200">{ex.NumPairs}</span>
                    <SvgChevron open={isExpanded} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 bg-white/[0.015]">
                    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                      <div className="grid grid-cols-[1fr_180px_120px] gap-2 px-4 py-2 bg-white/[0.03] text-[11px] uppercase tracking-wide text-gray-500">
                        <div>Exchange</div>
                        <div className="text-right">Volume 24h</div>
                        <div className="text-right">Trades 24h</div>
                      </div>
                      <div className="px-4 py-2.5 text-[13px] text-gray-300">
                        <div className="grid grid-cols-[1fr_180px_120px] gap-2 items-center">
                          <div className="flex items-center gap-2">
                            {logo ? (
                              <img src={logo} alt={ex.Name} className="w-4 h-4 rounded-full" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-white/10 inline-flex items-center justify-center text-[9px]">{ex.Name[0]}</span>
                            )}
                            <span className="font-medium text-gray-100">{ex.Name}</span>
                            <span className="text-gray-500 text-[11px]">{ex.NumPairs} pair{ex.NumPairs !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="text-right font-mono text-white">{fmtCompact(ex.Volume24h)}</div>
                          <div className="text-right font-mono text-gray-300">{ex.NumTrades.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DIA attribution */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-gray-500">
        <span>Data by</span>
        <a href="https://www.diadata.org" target="_blank" rel="noopener noreferrer" className="text-teal-400/70 hover:text-teal-300 transition">
          diadata.org
        </a>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOKEN INFORMATION SECTION  — FAQ accordion (DIA-style)
   ════════════════════════════════════════════════════════════ */

function TokenInfoSection({ coin }: { coin: CoinData }) {
  // Build FAQ array: prefer Messari FAQs, then generate from description
  const faqs: FAQ[] = [];

  if (coin.faqs?.length > 0) {
    faqs.push(...coin.faqs);
  } else {
    // Auto-generate informational FAQs from available content
    const desc = coin.description || coin.overview || '';
    const bg = coin.background || '';

    if (desc) {
      faqs.push({
        question: `What is ${coin.name} (${coin.symbol})?`,
        answer: desc.replace(/<[^>]+>/g, '').slice(0, 1500),
      });
    }

    if (bg) {
      faqs.push({
        question: `How does ${coin.name} work?`,
        answer: bg.replace(/<[^>]+>/g, '').slice(0, 1500),
      });
    }

    // If we have categories, add a use-case question
    if (coin.categories?.length > 0 && desc) {
      const cats = coin.categories.slice(0, 5).join(', ');
      faqs.push({
        question: `What is ${coin.name} used for?`,
        answer: `${coin.name} is categorized under ${cats}. ${desc.replace(/<[^>]+>/g, '').slice(0, 400)}`,
      });
    }
  }

  if (faqs.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.12] bg-[#0d1421]/80 p-5" dir="ltr">
      <h3 className="text-lg font-bold text-white mb-4">Token Information</h3>
      <div className="space-y-2.5">
        {faqs.map((faq, i) => (
          <TokenInfoFAQItem key={i} faq={faq} />
        ))}
      </div>
    </div>
  );
}

function TokenInfoFAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden bg-[#151d2e]/80 border border-white/[0.06]" dir="ltr">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] transition"
        dir="ltr"
      >
        <span className="font-semibold text-[15px] text-gray-100 pr-4 leading-6">{faq.question}</span>
        <SvgChevron open={open} />
      </button>
      {open && (
        <div
          className="px-5 pb-5 pt-2 text-[14px] text-gray-300/90 leading-7 border-t border-white/[0.06]"
          dir="ltr"
        >
          {faq.answer}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TICKERS / MARKET PAIRS CARD
   ════════════════════════════════════════════════════════════ */

function TickersCard({ coin }: { coin: CoinData }) {
  const [showAll, setShowAll] = useState(false);
  const tickers = coin.tickers || [];
  const markets = coin.markets || [];

  const items = tickers.length > 0
    ? tickers.map((t: any) => ({
        pair: `${t.base}/${t.target}`,
        exchange: t.exchange || t.market?.name || 'Unknown',
        exchangeLogo: t.exchange_logo || t.market?.logo || EXCHANGE_LOGOS[t.exchange || t.market?.name || ''] || '',
        price: t.last_price || t.last || 0,
        volume: t.converted_volume?.usd || t.volume || 0,
        url: t.trade_url || '',
        trust: t.trust_score || '',
      }))
    : markets.map(m => ({
        pair: `${m.baseAsset}/${m.quoteAsset}`,
        exchange: m.exchange,
        exchangeLogo: m.exchangeLogo || EXCHANGE_LOGOS[m.exchange || ''] || '',
        price: m.price,
        volume: m.volume,
        url: '',
        trust: '',
      }));

  if (items.length === 0) return null;

  const displayed = showAll ? items : items.slice(0, 8);

  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold mb-3">Markets</h3>
      <div className="rounded-lg border border-white/[0.08] overflow-hidden" dir="ltr">
        <div className="grid grid-cols-[minmax(340px,1fr)_220px_140px_160px] gap-3 px-3 py-2 bg-white/[0.04] text-[11px] uppercase tracking-wide text-gray-400 sticky top-0 z-10">
          <div>Pair</div>
          <div>Exchange</div>
          <div className="text-right">Price</div>
          <div className="text-right">24h Volume</div>
        </div>

        <div className="max-h-[520px] overflow-y-auto divide-y divide-white/[0.05]">
          {displayed.map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-[minmax(340px,1fr)_220px_140px_160px] gap-3 px-3 py-2.5 text-sm hover:bg-white/[0.03] transition">
              <div className="min-w-0 flex items-center gap-1.5 text-white font-medium">
                <PairToken value={item.pair.split('/')[0] || ''} />
                <span className="text-gray-500">/</span>
                <PairToken value={item.pair.split('/')[1] || ''} />
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-teal-300"><SvgExternal /></a>
                ) : null}
              </div>

              <div className="min-w-0 flex items-center gap-2.5">
                <ExchangeLogo name={item.exchange} logo={item.exchangeLogo} />
                <span className="text-[13px] font-semibold text-gray-100 truncate">{item.exchange}</span>
              </div>

              <div className="text-right font-mono text-[13px] font-semibold text-white">
                {fmtPrice(item.price)}
              </div>

              <div className="text-right font-mono text-[13px] text-gray-200">
                {item.volume > 0 ? fmtCompact(item.volume) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length > 8 && (
        <button onClick={() => setShowAll(!showAll)} className="text-teal-400 text-sm mt-3 hover:underline w-full text-center">
          {showAll ? 'Show Less' : `Show All ${items.length} Markets`}
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CLASSIFICATIONS CARD
   ════════════════════════════════════════════════════════════ */

function ClassificationsCard({ coin }: { coin: CoinData }) {
  const [showAll, setShowAll] = useState(false);
  const cats = coin.categories || [];
  const sectors = coin.sectors_v2 || [];
  const subs = coin.sub_sectors_v2 || [];

  if (cats.length === 0 && sectors.length === 0 && subs.length === 0) return null;

  const displayedCats = showAll ? cats : cats.slice(0, 8);

  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/[0.02] p-4">
      <h3 className="text-lg font-bold mb-3">🏷️ Categories</h3>
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {displayedCats.map((c, i) => (
            <span key={i} className="bg-blue-900/20 text-blue-300 px-2.5 py-1 rounded-full text-xs border border-blue-500/20">{c}</span>
          ))}
          {!showAll && cats.length > 8 && (
            <button onClick={() => setShowAll(true)} className="text-gray-400 text-xs hover:text-teal-300 transition px-2 py-1">
              +{cats.length - 8} more
            </button>
          )}
          {showAll && cats.length > 8 && (
            <button onClick={() => setShowAll(false)} className="text-teal-400 text-xs hover:underline px-2 py-1">Show less</button>
          )}
        </div>
      )}
      {sectors.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1.5">Sectors</div>
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((s, i) => (
              <span key={i} className="bg-teal-900/30 text-teal-300 px-2.5 py-1 rounded-full text-xs border border-teal-500/20">{s}</span>
            ))}
          </div>
        </div>
      )}
      {subs.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Sub-sectors</div>
          <div className="flex flex-wrap gap-1.5">
            {subs.map((s, i) => (
              <span key={i} className="bg-white/[0.06] text-gray-300 px-2.5 py-1 rounded-full text-xs">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HISTORY TAB
   ════════════════════════════════════════════════════════════ */

function HistoryTab({ coin }: { coin: CoinData }) {
  const [liveOhlcv, setLiveOhlcv] = useState<OHLCVPoint[]>([]);
  const [loadingOhlcv, setLoadingOhlcv] = useState(false);

  // Fetch from CoinGecko OHLC API if no cached data
  useEffect(() => {
    if (coin.ohlcv?.length > 0) return;
    setLoadingOhlcv(true);
    const fetchOhlc = async () => {
      try {
        const endpoint = encodeURIComponent(`/coins/${coin.id}/ohlc?vs_currency=usd&days=90`);
        const res = await fetch(`/api/coingecko?endpoint=${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // CoinGecko OHLC format: [[timestamp, open, high, low, close], ...]
            // Group by day and aggregate
            const dayMap = new Map<string, { open: number; high: number; low: number; close: number; time: string; points: number }>();
            data.forEach((p: number[]) => {
              const date = new Date(p[0]).toISOString().split('T')[0];
              const existing = dayMap.get(date);
              if (!existing) {
                dayMap.set(date, { time: new Date(date).toISOString(), open: p[1], high: p[2], low: p[3], close: p[4], points: 1 });
              } else {
                existing.high = Math.max(existing.high, p[2]);
                existing.low = Math.min(existing.low, p[3]);
                existing.close = p[4]; // last close of the day
                existing.points++;
              }
            });
            setLiveOhlcv(Array.from(dayMap.values()).map(d => ({
              time: d.time, open: d.open, high: d.high, low: d.low, close: d.close, volume: 0,
            })));
          }
        }
      } catch { /* use cached */ }
      setLoadingOhlcv(false);
    };
    fetchOhlc();
  }, [coin.id, coin.ohlcv]);

  const ohlcvData = coin.ohlcv?.length > 0 ? coin.ohlcv : liveOhlcv;
  const last30 = ohlcvData
    .filter(p => {
      const t = new Date(p.time).getTime();
      return t > Date.now() - 90 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="space-y-6" dir="ltr">
      <HistoricalPriceCard coin={coin} />

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-lg font-bold mb-4">📈 Price History — Last 90 Days</h3>
        {last30.length > 0 ? (
          <>
            <CandlestickChart ohlcv={ohlcvData} />
            <div className="mt-4">
              <h4 className="font-medium mb-2 text-sm text-gray-300">Daily OHLCV ({last30.length} days)</h4>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] sticky top-0 z-10">
                    <tr className="text-gray-400">
                      <th className="p-2.5 text-left">Date</th>
                      <th className="p-2.5 text-right">Open</th>
                      <th className="p-2.5 text-right">High</th>
                      <th className="p-2.5 text-right">Low</th>
                      <th className="p-2.5 text-right">Close</th>
                      <th className="p-2.5 text-right">Change</th>
                      <th className="p-2.5 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {last30.map((p, i) => {
                      const change = p.open > 0 ? ((p.close - p.open) / p.open * 100) : 0;
                      const isUp = p.close >= p.open;
                      return (
                        <tr key={i} className={`transition ${isUp ? 'hover:bg-emerald-500/[0.04]' : 'hover:bg-red-500/[0.04]'}`}>
                          <td className="p-2.5 text-gray-300 text-xs font-mono">
                            {new Date(p.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-300">{fmtPrice(p.open)}</td>
                          <td className="p-2.5 text-right font-mono text-emerald-400">{fmtPrice(p.high)}</td>
                          <td className="p-2.5 text-right font-mono text-red-400">{fmtPrice(p.low)}</td>
                          <td className={`p-2.5 text-right font-mono font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPrice(p.close)}</td>
                          <td className={`p-2.5 text-right font-mono text-xs ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isUp ? '+' : ''}{change.toFixed(2)}%
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-400">{fmtCompact(p.volume)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : ohlcvData.length > 0 ? (
          <>
            <CandlestickChart ohlcv={ohlcvData} />
            <p className="text-sm text-gray-400 mt-2">OHLCV data available but none within the last 30 days. Showing chart with all available data.</p>
          </>
        ) : loadingOhlcv ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading price history from CoinGecko...</span>
          </div>
        ) : (
          <PlaceholderContent icon="📉" text="No historical OHLCV data available for this coin" />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOKEN UNLOCKS TAB
   ════════════════════════════════════════════════════════════ */

function TokenUnlocksTab({ coin }: { coin: CoinData }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold mb-4">🔓 Token Unlocks for {coin.name}</h3>
      {coin.tokenUnlocks?.length > 0 ? (
        <div className="space-y-3">
          {coin.tokenUnlocks.map((unlock, i) => (
            <div key={i} className="p-4 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{unlock.eventType}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {unlock.eventDate ? new Date(unlock.eventDate).toLocaleDateString() : 'Date TBD'}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  unlock.status === 'completed' ? 'bg-emerald-900/30 text-emerald-300' :
                  unlock.status === 'upcoming' ? 'bg-amber-900/30 text-amber-300' :
                  'bg-white/[0.06] text-gray-300'
                }`}>{unlock.status || 'pending'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PlaceholderContent icon="🔓" text="No token unlock events found" />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   REPORTS TAB
   ════════════════════════════════════════════════════════════ */

function ReportsTab({ coin }: { coin: CoinData }) {
  const reportLinks = coin.messariLinks?.filter(l =>
    l.type === 'Content' || l.name?.toLowerCase().includes('report') || l.name?.toLowerCase().includes('paper')
  ) || [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold mb-4">📋 Reports & Research</h3>
      {reportLinks.length > 0 ? (
        <div className="space-y-3">
          {reportLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <div>
                  <div className="font-medium group-hover:text-teal-300 transition">{link.name}</div>
                  <div className="text-xs text-gray-500">{link.type}</div>
                </div>
              </div>
              <span className="text-gray-500 group-hover:text-teal-400 transition">↗</span>
            </a>
          ))}
        </div>
      ) : (
        <PlaceholderContent icon="📋" text="No research reports available" />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DEVELOPMENTS MODAL
   ════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   NEWS TAB - Full news display like Messari
   ════════════════════════════════════════════════════════════ */

function NewsTab({ coin, selectedNews, onSelectNews }: { coin: CoinData; selectedNews: NewsItem | null; onSelectNews: (n: NewsItem | null) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [thumbs, setThumbs] = useState<Record<number, 'up' | 'down' | null>>({});
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  const allSources = Array.from(new Set((coin.news || []).map(n => n.source).filter(Boolean))).sort();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredSources = allSources.filter(s => s.toLowerCase().includes(sourceSearch.toLowerCase()));

  const filtered = (coin.news || []).filter(n => {
    if (searchTerm && !n.headline?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedSources.size > 0 && !selectedSources.has(n.source)) return false;
    return true;
  });

  const formatNewsDate = (d: string) => {
    if (!d) return '--';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      if (hours < 48) return 'Yesterday';
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  const getAssetLabel = (a: NewsAsset | string) => {
    if (typeof a === 'string') return a.substring(0, 6);
    return a.symbol || a.name?.substring(0, 6) || '??';
  };

  const parseSummaryBullets = (summary: string) => {
    if (!summary) return [];
    const lines = summary.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
    return lines;
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Header + Filters */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search News"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>
          {/* Source Filter Dropdown */}
          <div className="relative" ref={sourceDropdownRef}>
            <button
              onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
                selectedSources.size > 0
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                  : 'bg-white/[0.06] border-white/[0.08] text-gray-300 hover:border-white/20'
              }`}
            >
              <span>Source</span>
              {selectedSources.size > 0 && (
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] flex items-center justify-center font-bold">{selectedSources.size}</span>
              )}
              <span className="text-[10px]">▼</span>
            </button>
            {sourceDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {/* Search in sources */}
                <div className="p-3 border-b border-white/[0.06]">
                  <input
                    type="text"
                    placeholder="Search sources..."
                    value={sourceSearch}
                    onChange={e => setSourceSearch(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
                    autoFocus
                  />
                </div>
                {/* Select All */}
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={selectedSources.size === allSources.length && allSources.length > 0}
                      onChange={() => {
                        if (selectedSources.size === allSources.length) setSelectedSources(new Set());
                        else setSelectedSources(new Set(allSources));
                      }}
                      className="rounded border-gray-600 bg-white/[0.06] text-teal-500 focus:ring-teal-500"
                    />
                    Select All
                  </label>
                </div>
                {/* Source list */}
                <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
                  {filteredSources.map(s => (
                    <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.04] text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedSources.has(s)}
                        onChange={() => {
                          const next = new Set(selectedSources);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          setSelectedSources(next);
                        }}
                        className="rounded border-gray-600 bg-white/[0.06] text-teal-500 focus:ring-teal-500"
                      />
                      {s}
                    </label>
                  ))}
                  {filteredSources.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No sources found</p>}
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between p-3 border-t border-white/[0.06]">
                  <button onClick={() => { setSelectedSources(new Set()); }} className="text-xs text-gray-400 hover:text-white">Clear</button>
                  <div className="flex gap-2">
                    <button onClick={() => { setSourceDropdownOpen(false); setSelectedSources(new Set()); }} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={() => setSourceDropdownOpen(false)} className="px-3 py-1 text-xs rounded-lg bg-teal-600 text-white hover:bg-teal-500">Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* News Table */}
      {filtered.length > 0 ? (
        <div className="flex">
          {/* Table */}
          <div className={`${selectedNews ? 'w-[55%]' : 'w-full'} transition-all overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-white/10">
                  <th className="text-left px-4 py-3 font-medium">Headline</th>
                  <th className="text-left px-3 py-3 font-medium w-28">Date</th>
                  <th className="text-left px-3 py-3 font-medium w-28">Source</th>
                  <th className="text-left px-3 py-3 font-medium w-32">Assets</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((news, i) => (
                  <tr
                    key={i}
                    onClick={() => onSelectNews(selectedNews?.headline === news.headline ? null : news)}
                    className={`border-b border-white/[0.04] cursor-pointer transition h-[52px] ${
                      selectedNews?.headline === news.headline ? 'bg-teal-500/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="text-gray-200 hover:text-teal-300 transition line-clamp-1 text-[13px]">{news.headline}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">{formatNewsDate(news.date)}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{news.source || '--'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(news.assets || []).slice(0, 3).map((a, j) => (
                          <span key={j} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-300 font-medium whitespace-nowrap">
                            {getAssetLabel(a)}
                          </span>
                        ))}
                        {(news.assets || []).length > 3 && (
                          <span className="text-[10px] text-gray-500">+{(news.assets || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selectedNews && (
            <div className="w-[45%] border-l border-white/10 p-5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(selectedNews.assets || []).slice(0, 6).map((a, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[11px] text-gray-200 font-medium">
                      {getAssetLabel(a)}
                    </span>
                  ))}
                </div>
                <button onClick={() => onSelectNews(null)} className="text-gray-400 hover:text-white transition text-lg ml-2 flex-shrink-0">✕</button>
              </div>
              <h3 className="text-[15px] font-bold leading-snug mb-2">{selectedNews.headline}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span className="font-medium text-gray-300">{selectedNews.source}</span>
                <span className="text-gray-600">•</span>
                <span>{formatNewsDate(selectedNews.date)}</span>
              </div>
              {selectedNews.url && (
                <a href={selectedNews.url.startsWith('http') ? selectedNews.url : `https://messari.io${selectedNews.url}`}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-sm mb-4 font-medium">
                  View Full Article <span className="text-xs">↗</span>
                </a>
              )}
              {selectedNews.summary && (
                <div className="mt-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                  <h4 className="font-semibold mb-3 text-sm text-gray-200">Summary</h4>
                  <ul className="space-y-2">
                    {parseSummaryBullets(selectedNews.summary).map((bullet, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300 leading-relaxed">
                        <span className="text-teal-400 mt-1 flex-shrink-0">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Thumbs up/down */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <button
                  onClick={() => { const idx = filtered.indexOf(selectedNews); setThumbs(p => ({ ...p, [idx]: p[idx] === 'up' ? null : 'up' })); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition text-sm ${thumbs[filtered.indexOf(selectedNews)] === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-500 hover:text-white hover:bg-white/[0.08]'}`}
                >👍</button>
                <button
                  onClick={() => { const idx = filtered.indexOf(selectedNews); setThumbs(p => ({ ...p, [idx]: p[idx] === 'down' ? null : 'down' })); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition text-sm ${thumbs[filtered.indexOf(selectedNews)] === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.04] text-gray-500 hover:text-white hover:bg-white/[0.08]'}`}
                >👎</button>
              </div>
              {(selectedNews.category !== '--' || selectedNews.subCategory !== '--') && (
                <div className="mt-4 flex gap-2 text-xs">
                  {selectedNews.category && selectedNews.category !== '--' && <span className="px-2 py-1 rounded bg-white/[0.06] text-gray-300">{selectedNews.category}</span>}
                  {selectedNews.subCategory && selectedNews.subCategory !== '--' && <span className="px-2 py-1 rounded bg-white/[0.06] text-gray-300">{selectedNews.subCategory}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <PlaceholderContent icon="📰" text={`No news available for ${coin.name}`} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   KEY DEVELOPMENTS TAB - Full expandable development events
   ════════════════════════════════════════════════════════════ */

function DevelopmentsTab({ coin, selectedDev, onSelectDev }: { coin: CoinData; selectedDev: KeyDevelopment | null; onSelectDev: (d: KeyDevelopment | null) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const allCategories = Array.from(new Set((coin.developments || []).map(d => d.category || d.eventType || '').filter(Boolean)));

  const filtered = (coin.developments || []).filter(d => {
    const text = d.headline || d.eventType || d.data?.details || '';
    if (searchTerm && !text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    const cat = d.category || d.eventType || '';
    if (categoryFilter !== 'All' && cat !== categoryFilter) return false;
    return true;
  });

  const fmtDate = (raw: string | undefined) => {
    if (!raw) return '--';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return raw; }
  };

  const getDevTitle = (d: KeyDevelopment) => {
    if (d.headline) return d.headline;
    if (d.data?.details) return d.data.details.split('\n')[0]?.substring(0, 120) || d.eventType || 'Development Event';
    return d.eventType || 'Development Event';
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500/20 text-gray-400';
    const s = status.toLowerCase();
    if (s === 'completed') return 'bg-emerald-500/20 text-emerald-400';
    if (s === 'in progress' || s === 'live') return 'bg-blue-500/20 text-blue-400';
    if (s === 'upcoming' || s === 'planned') return 'bg-yellow-500/20 text-yellow-400';
    if (s === 'cancelled' || s === 'delayed') return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const getUrgencyColor = (u: any) => {
    if (!u) return '';
    const s = String(u).toLowerCase();
    if (s === 'high' || s === 'critical') return 'text-red-400';
    if (s === 'medium') return 'text-amber-400';
    if (s === 'low') return 'text-emerald-400';
    return 'text-gray-400';
  };

  const getImpactColor = (impact: any) => {
    if (!impact) return '';
    const s = String(impact).toLowerCase();
    if (s === 'high' || s === 'critical' || s === 'significant') return 'text-red-400';
    if (s === 'medium' || s === 'moderate') return 'text-amber-400';
    if (s === 'low' || s === 'minor') return 'text-emerald-400';
    return 'text-gray-400';
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search Developments"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>
          {allCategories.length > 1 && (
            <select className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">Category: All</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <span className="text-xs text-gray-500">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Developments Table */}
      {filtered.length > 0 ? (
        <div className="flex">
          <div className={`${selectedDev ? 'w-[55%]' : 'w-full'} transition-all overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-white/10">
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-2 py-3 font-medium w-20">Urgency</th>
                  <th className="text-left px-2 py-3 font-medium w-24">Status</th>
                  <th className="text-left px-2 py-3 font-medium w-28">Category</th>
                  <th className="text-left px-2 py-3 font-medium w-28">Sub-Category</th>
                  <th className="text-left px-2 py-3 font-medium w-20">Impact</th>
                  <th className="text-left px-2 py-3 font-medium w-28">Last Updated</th>
                  <th className="text-left px-2 py-3 font-medium w-28">Event Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dev, i) => (
                  <tr
                    key={i}
                    onClick={() => onSelectDev(selectedDev === dev ? null : dev)}
                    className={`border-b border-white/[0.04] cursor-pointer transition h-[48px] ${
                      selectedDev === dev ? 'bg-teal-500/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="text-gray-200 line-clamp-1 text-[13px]">{getDevTitle(dev)}</div>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`text-xs font-medium ${getUrgencyColor(dev.urgency)}`}>{dev.urgency || '--'}</span>
                    </td>
                    <td className="px-2 py-2">
                      {dev.status ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${getStatusColor(dev.status)}`}>{dev.status}</span>
                      ) : <span className="text-xs text-gray-500">--</span>}
                    </td>
                    <td className="px-2 py-2 text-gray-400 text-xs">{dev.category || dev.eventType || '--'}</td>
                    <td className="px-2 py-2 text-gray-500 text-xs">{dev.subCategory || '--'}</td>
                    <td className="px-2 py-2">
                      <span className={`text-xs font-medium ${getImpactColor(dev.impact)}`}>{dev.impact || '--'}</span>
                    </td>
                    <td className="px-2 py-2 text-gray-400 text-xs whitespace-nowrap">{fmtDate(dev.lastUpdated || dev.timestamp)}</td>
                    <td className="px-2 py-2 text-gray-400 text-xs whitespace-nowrap">{fmtDate(dev.eventDate || dev.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selectedDev && (
            <div className="w-[45%] border-l border-white/10 p-5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[15px] font-bold leading-snug flex-1 mr-2">{getDevTitle(selectedDev)}</h4>
                <button onClick={() => onSelectDev(null)} className="text-gray-400 hover:text-white transition text-lg flex-shrink-0">✕</button>
              </div>
              {/* Detail fields */}
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Event Date</div>
                    <div className="text-gray-200">{fmtDate(selectedDev.eventDate || selectedDev.date)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Last Updated</div>
                    <div className="text-gray-200">{fmtDate(selectedDev.lastUpdated || selectedDev.timestamp)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Urgency</div>
                    <div className={`font-medium ${getUrgencyColor(selectedDev.urgency)}`}>{selectedDev.urgency || '--'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</div>
                    {selectedDev.status ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(selectedDev.status)}`}>{selectedDev.status}</span>
                    ) : <span className="text-gray-400">--</span>}
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Category</div>
                    <div className="text-gray-200">{selectedDev.category || selectedDev.eventType || '--'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sub-Category</div>
                    <div className="text-gray-200">{selectedDev.subCategory || '--'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Impact</div>
                    <div className={`font-medium ${getImpactColor(selectedDev.impact)}`}>{selectedDev.impact || '--'}</div>
                  </div>
                  {(selectedDev.priority !== undefined && selectedDev.priority !== null) && (
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Priority</div>
                      <div className="text-gray-200">{selectedDev.priority}</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Details text */}
              {(selectedDev.details || selectedDev.data?.details) && (
                <div className="mt-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                  <h5 className="font-semibold mb-2 text-sm text-gray-200">Details</h5>
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{selectedDev.details || selectedDev.data?.details}</div>
                </div>
              )}
              {selectedDev.url && (
                <a href={selectedDev.url.startsWith('http') ? selectedDev.url : `https://messari.io${selectedDev.url}`}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-sm mt-4 font-medium">
                  View Full Details <span className="text-xs">↗</span>
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <PlaceholderContent icon="🔧" text={`No key development events tracked for ${coin.name}`} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PLACEHOLDER COMPONENTS
   ════════════════════════════════════════════════════════════ */

function PlaceholderTab({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-lg font-bold mb-4">{icon} {title}</h3>
      <div className="text-center py-16">
        <div className="text-5xl mb-4">{icon}</div>
        <p className="text-gray-400 text-lg mb-2">Coming Soon</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto">{desc}</p>
      </div>
    </div>
  );
}

function PlaceholderContent({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CHART COMPONENTS
   ════════════════════════════════════════════════════════════ */

function PriceChart({ coin }: { coin: CoinData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<'24H' | '7D' | '1M' | '3M' | '1Y' | 'Max'>('7D');
  const [chartMode, setChartMode] = useState<'line' | 'bars'>('line');

  const hasOhlcv = coin.ohlcv?.length > 0;
  const hasSparkline = coin.sparkline_7d?.length > 0;

  const rangeCutoffMs = (r: '24H' | '7D' | '1M' | '3M' | '1Y' | 'Max') => {
    const day = 24 * 60 * 60 * 1000;
    if (r === '24H') return Date.now() - day;
    if (r === '7D') return Date.now() - 7 * day;
    if (r === '1M') return Date.now() - 30 * day;
    if (r === '3M') return Date.now() - 90 * day;
    if (r === '1Y') return Date.now() - 365 * day;
    return 0;
  };

  const downloadChart = () => {
    const canvas = chartRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${coin.id}-${range.toLowerCase()}-chart.png`;
    link.href = (canvas as HTMLCanvasElement).toDataURL('image/png');
    link.click();
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;
    if (!hasOhlcv && !hasSparkline) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
      width: chartRef.current.clientWidth,
      height: 350,
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true },
      crosshair: { mode: 0 },
    });

    let chartData: any[];
    if (hasOhlcv) {
      const cutoff = rangeCutoffMs(range);
      const filtered = cutoff > 0
        ? coin.ohlcv.filter(p => new Date(p.time).getTime() >= cutoff)
        : coin.ohlcv;
      const useData = filtered.length > 0 ? filtered : coin.ohlcv;
      chartData = useData.map(p => ({
        time: Math.floor(new Date(p.time).getTime() / 1000) as any,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        value: p.close,
      }));
    } else {
      const now = Date.now();
      const interval = (7 * 24 * 60 * 60 * 1000) / coin.sparkline_7d!.length;
      const spark = coin.sparkline_7d!.map((val, i) => ({
        time: Math.floor((now - (coin.sparkline_7d!.length - 1 - i) * interval) / 1000) as any,
        value: val,
      }));
      chartData = range === '24H' ? spark.slice(Math.max(1, Math.floor(spark.length / 7))) : spark;
    }

    if (chartMode === 'bars' && hasOhlcv) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981', downColor: '#ef4444',
        borderDownColor: '#ef4444', borderUpColor: '#10b981',
        wickDownColor: '#ef4444', wickUpColor: '#10b981',
      });
      series.setData(chartData.map((d: any) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })));
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineColor: '#14b8a6',
        topColor: 'rgba(20, 184, 166, 0.3)',
        bottomColor: 'rgba(20, 184, 166, 0.02)',
        lineWidth: 2,
      });
      series.setData(chartData.map((d: any) => ({ time: d.time, value: d.value })));
    }
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [coin.ohlcv, coin.sparkline_7d, hasOhlcv, hasSparkline, range, chartMode]);

  if (!hasOhlcv && !hasSparkline) {
    return (
      <div className="h-[350px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-3xl mb-2">📉</div>
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full" dir="ltr">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="inline-flex items-center rounded-lg bg-white/[0.05] p-1 border border-white/[0.08]">
          <button className="px-3 py-1 text-xs rounded-md bg-white/[0.12] text-white">Price</button>
          <button className="px-3 py-1 text-xs rounded-md text-gray-300 hover:text-white">Market Cap</button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="inline-flex items-center rounded-lg bg-white/[0.05] p-1 border border-white/[0.08]">
            <button
              onClick={() => setChartMode('line')}
              className={`p-1.5 rounded-md transition ${chartMode === 'line' ? 'bg-white/[0.14] text-white' : 'text-gray-300 hover:text-white'}`}
              title="Line chart"
            >
              <SvgChartLine />
            </button>
            <button
              onClick={() => setChartMode('bars')}
              className={`p-1.5 rounded-md transition ${chartMode === 'bars' ? 'bg-white/[0.14] text-white' : 'text-gray-300 hover:text-white'}`}
              title="Bar/Candlestick chart"
            >
              <SvgChartBars />
            </button>
          </div>

          <div className="inline-flex items-center rounded-lg bg-white/[0.05] p-1 border border-white/[0.08]">
            {(['24H', '7D', '1M', '3M', '1Y', 'Max'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${range === r ? 'bg-white/[0.14] text-white' : 'text-gray-300 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center rounded-lg bg-white/[0.05] p-1 border border-white/[0.08]">
            <button onClick={downloadChart} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/[0.12] transition" title="Download chart">
              <SvgDownload />
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/[0.12] transition" title="Fullscreen">
              <SvgExpand />
            </button>
          </div>
        </div>
      </div>

      <div ref={chartRef} className="w-full" />
      <div className="text-xs text-gray-500 text-center mt-2">
        {hasOhlcv ? `${coin.ohlcv.length} data points` : '7-day sparkline'}
      </div>
    </div>
  );
}

function CandlestickChart({ ohlcv }: { ohlcv: OHLCVPoint[] }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || ohlcv.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
      width: chartRef.current.clientWidth,
      height: 400,
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderDownColor: '#ef4444', borderUpColor: '#10b981',
      wickDownColor: '#ef4444', wickUpColor: '#10b981',
    });

    series.setData(ohlcv.map(p => ({
      time: Math.floor(new Date(p.time).getTime() / 1000) as any,
      open: p.open, high: p.high, low: p.low, close: p.close,
    })));
    chart.timeScale().fitContent();

    const handleResize = () => { if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth }); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [ohlcv]);

  return <div ref={chartRef} className="w-full" />;
}

/* ════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ════════════════════════════════════════════════════════════ */

function PriceChange({ value, suffix, small }: { value: number | undefined | null; suffix?: string; small?: boolean }) {
  if (value === undefined || value === null || value === 0) return <span className="text-gray-500">—</span>;
  const isPositive = value >= 0;
  const color = isPositive ? 'text-emerald-400' : 'text-red-400';
  const arrow = isPositive ? '▲' : '▼';
  return (
    <span className={`${color} font-mono ${small ? 'text-[11px]' : 'text-sm'}`}>
      {arrow} {Math.abs(value).toFixed(1)}%{suffix || ''}
    </span>
  );
}

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.10] rounded-xl overflow-hidden bg-white/[0.015]" dir="ltr">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3.5 md:py-4 flex items-center justify-between hover:bg-white/[0.035] transition text-[16px] leading-6"
        dir="ltr"
      >
        <span className="font-semibold text-gray-100 pr-4">{faq.question}</span>
        <span className="text-gray-400 flex-shrink-0 text-[18px] leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div
          className="px-5 pb-4 pt-4 text-[15px] text-gray-200/95 leading-8 border-t border-white/[0.08] text-left"
          dir="ltr"
        >
          {faq.answer}
        </div>
      )}
    </div>
  );
}

/* ── Contracts Grid (Messari-style vertical list with chain logos) ── */
function ContractsGrid({ contracts }: { contracts: { network: string; address: string }[] }) {
  const [showAll, setShowAll] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const visible = showAll ? contracts : contracts.slice(0, 6);

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopiedAddr(addr);
      setTimeout(() => setCopiedAddr(prev => (prev === addr ? null : prev)), 1500);
    });
  };

  return (
    <div className="py-3 border-t border-white/[0.06] first:border-t-0">
      <div className="flex items-center gap-2 text-gray-400 text-[13px] mb-2.5">
        <span className="text-gray-500"><SvgChain /></span>
        Contracts
        <span className="text-[11px] text-gray-500 ml-1">({contracts.length})</span>
      </div>
      <div className="grid gap-1.5">
        {visible.map((c, i) => (
          <ContractRow key={`${c.network}-${c.address}-${i}`} contract={c} copied={copiedAddr === c.address} onCopy={() => copyAddr(c.address)} />
        ))}
      </div>

      {contracts.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-teal-400 hover:text-teal-300 transition"
        >
          {showAll ? 'Show less' : `Show all ${contracts.length} contracts`}
        </button>
      )}
    </div>
  );
}

function ContractRow({ contract, copied, onCopy }: { contract: { network: string; address: string }; copied: boolean; onCopy: () => void }) {
  const [errored, setErrored] = useState(false);
  const net = getNetworkMeta(contract.network);
  const explorerUrl = getContractExplorerUrl(contract.network, contract.address);

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition ${
        copied
          ? 'bg-emerald-900/15 border-emerald-500/20'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
      }`}
    >
      {/* Chain icon */}
      {net.icon && !errored ? (
        <img src={net.icon} alt={net.symbol} className="w-5 h-5 rounded-full flex-shrink-0" onError={() => setErrored(true)} />
      ) : (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 text-[10px] font-bold flex-shrink-0 text-gray-200">
          {net.symbol[0] || 'N'}
        </span>
      )}

      {/* Chain name */}
      <span className="text-[12px] font-semibold text-gray-200 min-w-[60px]">{net.symbol}</span>

      {/* Address */}
      <HoverTooltip text={contract.address}>
        <span className="font-mono text-xs text-gray-400 flex-1 truncate">{shortAddress(contract.address, 6, 6)}</span>
      </HoverTooltip>

      {/* Copy button */}
      <button
        onClick={onCopy}
        className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.06] text-gray-300 hover:text-teal-300 hover:bg-white/[0.12] transition flex-shrink-0"
        title={copied ? 'Copied' : 'Copy address'}
      >
        {copied ? <SvgCheck /> : <SvgCopy />}
      </button>

      {/* Explorer link */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-6 h-6 text-gray-400 hover:text-teal-300 transition flex-shrink-0"
          title="Open explorer"
        >
          <SvgExternal />
        </a>
      )}
    </div>
  );
}

function ContractBadge({ contract }: { contract: { network: string; address: string } }) {
  const [copied, setCopied] = useState(false);
  const { network, address } = contract;
  const copyAddress = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const explorerUrl = getContractExplorerUrl(network, address);
  const net = getNetworkMeta(network);

  return (
    <div
      title={`${network}: ${address}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition ${
        copied
          ? 'bg-emerald-900/20 text-emerald-300 border-emerald-500/30'
          : 'bg-white/[0.06] text-gray-200 border-white/[0.08]'
      }`}
    >
      <NetworkPill network={network} compact />
      <HoverTooltip text={address}>
        <span className="font-mono">{shortAddress(address, 5, 6)}</span>
      </HoverTooltip>
      <button
        onClick={copyAddress}
        className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.06] text-gray-300 hover:text-teal-300 hover:bg-white/[0.12] transition"
        title={copied ? 'Copied' : 'Copy address'}
      >
        {copied ? <SvgCheck /> : <SvgCopy />}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center text-gray-400 hover:text-teal-300 transition"
          title="Open explorer"
        >
          <SvgExternal />
        </a>
      )}
    </div>
  );
}

function ContractDropdown({ label, contracts }: { label: string; contracts: { network: string; address: string }[] }) {
  const [open, setOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (contracts.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="info-btn">
        <SvgChain /><span>{label}</span><SvgChevron open={open} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[320px] max-h-[320px] overflow-y-auto py-2 rounded-lg border border-white/15 bg-[#1e3938]/90 shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="space-y-1 px-2">
            {contracts.map((c, i) => {
              const explorerUrl = getContractExplorerUrl(c.network, c.address);
              const copied = copiedAddress === c.address;

              return (
                <div key={`${c.network}-${c.address}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] border border-transparent hover:border-white/[0.06] transition">
                  <NetworkPill network={c.network} compact />
                  <HoverTooltip text={c.address}>
                    <span className="font-mono text-xs text-gray-200">{shortAddress(c.address, 5, 6)}</span>
                  </HoverTooltip>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(c.address).then(() => {
                        setCopiedAddress(c.address);
                        setTimeout(() => setCopiedAddress(prev => (prev === c.address ? null : prev)), 1500);
                      });
                    }}
                    className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.06] text-gray-300 hover:text-teal-300 hover:bg-white/[0.12] transition"
                    title={copied ? 'Copied' : 'Copy address'}
                  >
                    {copied ? <SvgCheck /> : <SvgCopy />}
                  </button>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-gray-400 hover:text-teal-300 transition"
                      title="Open explorer"
                    >
                      <SvgExternal />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PairToken({ value }: { value: string }) {
  const looksLong = value.length > 16 || /^0x[a-fA-F0-9]{10,}$/.test(value);
  const display = looksLong ? shortAddress(value, 6, 6) : value;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    });
  };

  return (
    <span className="inline-flex items-center gap-1 max-w-[100%]">
      <HoverTooltip text={value} enabled={looksLong}>
        <span className="truncate">{display}</span>
      </HoverTooltip>
      {looksLong ? (
        <button
          onClick={copy}
          className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.05] text-gray-300 hover:text-teal-300 hover:bg-white/[0.12] transition"
          title={copied ? 'Copied' : 'Copy'}
          type="button"
        >
          {copied ? <SvgCheck /> : <SvgCopy />}
        </button>
      ) : null}
    </span>
  );
}

function HoverTooltip({
  text,
  children,
  enabled = true,
}: {
  text: string;
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [placeAbove, setPlaceAbove] = useState(true);
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      const wrapEl = wrapRef.current;
      const tipEl = tipRef.current;
      if (!wrapEl || !tipEl) return;

      const wrapRect = wrapEl.getBoundingClientRect();
      const tipRect = tipEl.getBoundingClientRect();
      const vw = window.innerWidth;

      // Vertical flip: if not enough space above, show below.
      setPlaceAbove(wrapRect.top > tipRect.height + 16);

      // Horizontal clamp: prefer center, then pin left/right when overflowing.
      const centeredLeft = wrapRect.left + wrapRect.width / 2 - tipRect.width / 2;
      const centeredRight = centeredLeft + tipRect.width;

      if (centeredLeft < 8) setAlign('left');
      else if (centeredRight > vw - 8) setAlign('right');
      else setAlign('center');
    });

    return () => window.cancelAnimationFrame(raf);
  }, [open, text]);

  if (!enabled) return <>{children}</>;
  return (
    <span
      ref={wrapRef}
      className="relative inline-flex max-w-full"
      title={text}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      <span
        ref={tipRef}
        className={`pointer-events-none absolute whitespace-nowrap rounded-md border border-white/15 bg-[#0f1f1d] px-2 py-1 text-[11px] text-gray-100 transition z-50 shadow-lg ${
          open ? 'opacity-100' : 'opacity-0'
        } ${
          placeAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        } ${
          align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-0' : 'right-0'
        }`}
      >
        {text}
      </span>
    </span>
  );
}

function ExchangeLogo({ name, logo }: { name: string; logo?: string }) {
  const [errored, setErrored] = useState(false);
  const fallback = (name || '?').slice(0, 1).toUpperCase();

  if (logo && !errored) {
    return (
      <img
        src={logo}
        alt={name}
        className="w-5 h-5 rounded-full bg-white/10 border border-white/15"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/15 text-[11px] text-gray-200 font-semibold">
      {fallback}
    </span>
  );
}

function NetworkPill({ network, compact }: { network: string; compact?: boolean }) {
  const net = getNetworkMeta(network);
  const [errored, setErrored] = useState(false);

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${compact ? 'text-[11px]' : 'text-[12px]'} text-gray-200 font-semibold`}>
      {net.icon && !errored ? (
        <img src={net.icon} alt={net.symbol} className="w-4 h-4 rounded-full" onError={() => setErrored(true)} />
      ) : (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/15 text-[9px] font-bold">{net.symbol[0] || 'N'}</span>
      )}
      <span>{net.symbol}</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════ */

function fmtPrice(price: number): string {
  if (!price) return '—';
  if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function fmtCompact(n: number): string {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtSupply(n: number): string {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `about ${months} months ago`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths > 0) return `about ${years} years ${remMonths} months`;
  return `about ${years} years`;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return ''; }
}

function shortAddress(address: string, start = 6, end = 4): string {
  if (!address) return '—';
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

function getNetworkMeta(network: string): { symbol: string; icon?: string } {
  const n = (network || '').toLowerCase();
  if (n.includes('ethereum')) return { symbol: 'ETH', icon: 'https://assets.coingecko.com/asset_platforms/images/279/small/ethereum.png' };
  if (n.includes('binance') || n.includes('bsc') || n.includes('bnb')) return { symbol: 'BNB', icon: 'https://assets.coingecko.com/asset_platforms/images/1/small/binance-smart-chain.png' };
  if (n.includes('base')) return { symbol: 'BASE', icon: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.png' };
  if (n.includes('optimism')) return { symbol: 'OP', icon: 'https://assets.coingecko.com/asset_platforms/images/10/small/Optimism.png' };
  if (n.includes('arbitrum')) return { symbol: 'ARB', icon: 'https://assets.coingecko.com/asset_platforms/images/33/small/AO_logomark.png' };
  if (n.includes('polygon') || n.includes('matic')) return { symbol: 'POL', icon: 'https://assets.coingecko.com/asset_platforms/images/20/small/polygon_pos.png' };
  if (n.includes('avalanche') || n.includes('avax')) return { symbol: 'AVAX', icon: 'https://assets.coingecko.com/asset_platforms/images/12/small/avalanche.png' };
  if (n.includes('solana')) return { symbol: 'SOL', icon: 'https://assets.coingecko.com/asset_platforms/images/5/small/solana.png' };
  if (n.includes('tron') || n.includes('trx')) return { symbol: 'TRX', icon: 'https://assets.coingecko.com/asset_platforms/images/109/small/tron-logo.png' };
  if (n.includes('fantom') || n.includes('ftm')) return { symbol: 'FTM', icon: 'https://assets.coingecko.com/asset_platforms/images/17/small/fantom.png' };
  if (n.includes('harmony') || n.includes('one')) return { symbol: 'ONE', icon: 'https://assets.coingecko.com/coins/images/4344/small/Y88JAze.png' };
  if (n.includes('cronos') || n.includes('cro')) return { symbol: 'CRO', icon: 'https://assets.coingecko.com/asset_platforms/images/25/small/cronos.jpeg' };
  if (n.includes('gnosis') || n.includes('xdai')) return { symbol: 'GNO', icon: 'https://assets.coingecko.com/asset_platforms/images/11062/small/Aatar_green_white.png' };
  if (n.includes('celo')) return { symbol: 'CELO', icon: 'https://assets.coingecko.com/asset_platforms/images/37/small/celo.jpeg' };
  if (n.includes('near')) return { symbol: 'NEAR', icon: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg' };
  if (n.includes('cosmos') || n.includes('atom')) return { symbol: 'ATOM', icon: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png' };
  if (n.includes('polkadot') || n.includes('dot')) return { symbol: 'DOT', icon: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' };
  if (n.includes('stellar') || n.includes('xlm')) return { symbol: 'XLM', icon: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' };
  if (n.includes('algorand') || n.includes('algo')) return { symbol: 'ALGO', icon: 'https://assets.coingecko.com/coins/images/4380/small/download.png' };
  if (n.includes('cardano') || n.includes('ada')) return { symbol: 'ADA', icon: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' };
  if (n.includes('moonbeam')) return { symbol: 'GLMR', icon: 'https://assets.coingecko.com/coins/images/22459/small/glmr.png' };
  if (n.includes('sui')) return { symbol: 'SUI', icon: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg' };
  if (n.includes('aptos') || n.includes('apt')) return { symbol: 'APT', icon: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png' };
  if (n.includes('mantle') || n.includes('mnt')) return { symbol: 'MNT', icon: 'https://assets.coingecko.com/coins/images/30980/small/token-logo.png' };
  if (n.includes('linea')) return { symbol: 'LINEA', icon: 'https://assets.coingecko.com/asset_platforms/images/135/small/linea.jpeg' };
  if (n.includes('zksync') || n.includes('era')) return { symbol: 'zkSync', icon: 'https://assets.coingecko.com/asset_platforms/images/121/small/zksync.jpeg' };
  if (n.includes('scroll')) return { symbol: 'SCROLL', icon: 'https://assets.coingecko.com/asset_platforms/images/153/small/scroll.jpeg' };
  if (n.includes('sora')) return { symbol: 'SORA', icon: 'https://assets.coingecko.com/coins/images/11093/small/sora.png' };
  if (n.includes('hedera') || n.includes('hbar')) return { symbol: 'HBAR', icon: 'https://assets.coingecko.com/coins/images/3688/small/hbar.png' };
  if (n.includes('ton') || n.includes('toncoin')) return { symbol: 'TON', icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png' };
  return { symbol: (network || 'NET').split(/\s+/).map(w => w[0]).join('').slice(0, 4).toUpperCase() || 'NET' };
}

function getContractExplorerUrl(network: string, address: string): string {
  const n = (network || '').toLowerCase();
  if (!address) return '';

  if (n.includes('ethereum')) return `https://etherscan.io/address/${address}`;
  if (n.includes('binance') || n.includes('bsc') || n.includes('bnb')) return `https://bscscan.com/address/${address}`;
  if (n.includes('base')) return `https://basescan.org/address/${address}`;
  if (n.includes('arbitrum')) return `https://arbiscan.io/address/${address}`;
  if (n.includes('optimism')) return `https://optimistic.etherscan.io/address/${address}`;
  if (n.includes('polygon') || n.includes('matic')) return `https://polygonscan.com/address/${address}`;
  if (n.includes('avalanche') || n.includes('avax')) return `https://snowtrace.io/address/${address}`;
  if (n.includes('fantom') || n.includes('ftm')) return `https://ftmscan.com/address/${address}`;
  if (n.includes('gnosis') || n.includes('xdai')) return `https://gnosisscan.io/address/${address}`;
  if (n.includes('tron') || n.includes('trx')) return `https://tronscan.org/#/contract/${address}`;
  if (n.includes('solana')) return `https://solscan.io/account/${address}`;
  if (n.includes('harmony') || n.includes('one')) return `https://explorer.harmony.one/address/${address}`;
  if (n.includes('cronos') || n.includes('cro')) return `https://cronoscan.com/address/${address}`;
  if (n.includes('celo')) return `https://celoscan.io/address/${address}`;
  if (n.includes('near')) return `https://nearblocks.io/address/${address}`;
  if (n.includes('sui')) return `https://suiscan.xyz/mainnet/account/${address}`;
  if (n.includes('aptos') || n.includes('apt')) return `https://aptoscan.com/account/${address}`;
  if (n.includes('moonbeam')) return `https://moonscan.io/address/${address}`;
  if (n.includes('linea')) return `https://lineascan.build/address/${address}`;
  if (n.includes('zksync') || n.includes('era')) return `https://era.zksync.network/address/${address}`;
  if (n.includes('scroll')) return `https://scrollscan.com/address/${address}`;
  if (n.includes('mantle') || n.includes('mnt')) return `https://explorer.mantle.xyz/address/${address}`;
  if (n.includes('hedera') || n.includes('hbar')) return `https://hashscan.io/mainnet/account/${address}`;
  if (n.includes('ton') || n.includes('toncoin')) return `https://tonscan.org/address/${address}`;

  return '';
}

function formatPlatformName(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
