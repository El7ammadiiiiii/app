'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Star, Search, ChevronLeft, ChevronRight, Filter, Columns, X, ChevronDown } from 'lucide-react';
import { readFavoriteIds, subscribeFavorites, toggleFavoriteId } from '@/lib/crypto-favorites';
import { fastApiClient } from '@/lib/services/fastApiClient';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface UnifiedCoin {
  id: string;
  cmc_id: number;
  name: string;
  symbol: string;
  slug: string;
  image: string;
  rank: number;
  coin_type: number | null;
  price: number;
  live_price: number;
  cg_price: number;
  market_cap: number;
  fdv: number;
  total_volume: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  high_24h: number;
  low_24h: number;
  change_1h: number;
  change_24h: number;
  change_7d: number;
  change_30d: number;
  ath: number;
  ath_change: number;
  sparkline_7d: number[];
  sector: string;
  category: string;
  sectors_v2: string[];
  sources: string[];
  // New fields from CCXT + DeFi Llama
  tvl: number;
  defi_protocol: string;
  defi_chain: string;
  primary_exchange: string;
  exchange_count: number;
  bid: number;
  ask: number;
  live_source_type: string;
  price_updated_at: number;
}

interface UnifiedResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  coins: UnifiedCoin[];
}

interface SectorInfo {
  sector: string;
  count: number;
}

interface StatsInfo {
  cmc_coins: number;
  coin_markets: number;
  coin_details: number;
  messari_projects: number;
  coins_with_price: number;
  unique_sectors: number;
  // New stats
  live_prices?: number;
  defi_tokens?: number;
  cex_exchanges?: number;
}

type SortField = 'rank' | 'name' | 'price' | 'market_cap' | 'volume' | 'change_24h';
type ViewMode = 'all' | 'priced' | 'favorites';

type ColumnKey =
  | 'change_1h'
  | 'change_24h'
  | 'change_7d'
  | 'change_30d'
  | 'high_24h'
  | 'low_24h'
  | 'market_cap'
  | 'fdv'
  | 'total_volume'
  | 'circulating_supply'
  | 'total_supply'
  | 'max_supply'
  | 'chart_7d'
  | 'sector'
  | 'sources'
  | 'tvl'
  | 'exchange';

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  change_1h: true,
  change_24h: true,
  change_7d: true,
  change_30d: false,
  high_24h: false,
  low_24h: false,
  market_cap: true,
  fdv: false,
  total_volume: true,
  circulating_supply: false,
  total_supply: false,
  max_supply: false,
  chart_7d: true,
  sector: true,
  sources: true,
  tvl: false,
  exchange: true,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  change_1h: '1h %',
  change_24h: '24h %',
  change_7d: '7d %',
  change_30d: '30d %',
  high_24h: 'High 24h',
  low_24h: 'Low 24h',
  market_cap: 'Market Cap',
  fdv: 'FDV',
  total_volume: 'Volume 24h',
  circulating_supply: 'Circulating',
  total_supply: 'Total Supply',
  max_supply: 'Max Supply',
  chart_7d: 'Chart 7d',
  sector: 'Sector',
  sources: 'Sources',
  tvl: 'TVL',
  exchange: 'Exchange',
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function formatPrice(n: number | null | undefined): string {
  if (!n || n === 0) return '—';
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return '$' + n.toFixed(4);
  if (n >= 0.0001) return '$' + n.toFixed(6);
  return '$' + n.toExponential(2);
}

function formatCompact(n: number | null | undefined): string {
  if (!n || n === 0) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

function formatSupply(n: number | null | undefined): string {
  if (!n || n === 0) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function PctCell({ value }: { value: number | null | undefined }) {
  if (!value || value === 0) return <span className="text-gray-500">—</span>;
  const color = value > 0 ? 'text-emerald-400' : 'text-red-400';
  const arrow = value > 0 ? '▲' : '▼';
  return <span className={color}>{arrow} {Math.abs(value).toFixed(2)}%</span>;
}

function SourceBadges({ sources }: { sources: string[] }) {
  return (
    <div className="flex gap-0.5 flex-wrap">
      {sources.includes('ccxt') && (
        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-900/50 text-amber-300 border border-amber-700/40" title="Live price from CEX (CCXT)">LIVE</span>
      )}
      {sources.includes('coingecko') && (
        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-green-900/50 text-green-300 border border-green-700/40" title="CoinGecko market data">CG</span>
      )}
      {sources.includes('cmc') && (
        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700/40" title="CoinMarketCap identity">CMC</span>
      )}
      {sources.includes('messari') && (
        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/40" title="Messari research">M</span>
      )}
      {sources.includes('defillama') && (
        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-pink-900/50 text-pink-300 border border-pink-700/40" title="DeFi Llama TVL">DL</span>
      )}
    </div>
  );
}

function MiniSparkline({ data, width = 100, height = 28 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return <span className="text-gray-600">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) =>
    `${((i / (data.length - 1)) * width).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`
  ).join(' ');
  const up = data[data.length - 1] >= data[0];
  const color = up ? '#34d399' : '#f87171';
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function UnifiedCryptoTable() {
  // ── State ──
  const [coins, setCoins] = useState<UnifiedCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCoins, setTotalCoins] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [sectorFilter, setSectorFilter] = useState('');
  const [sectors, setSectors] = useState<SectorInfo[]>([]);
  const [stats, setStats] = useState<StatsInfo | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sectorRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load favorites ──
  useEffect(() => {
    setFavoriteIds(readFavoriteIds());
    const unsub = subscribeFavorites(() => setFavoriteIds(readFavoriteIds()));
    return unsub;
  }, []);

  // ── Load sectors and stats on mount ──
  useEffect(() => {
    fastApiClient.getUnifiedSectors()
      .then((data: any) => { if (Array.isArray(data)) setSectors(data); })
      .catch(() => {});
    fastApiClient.getUnifiedStats()
      .then((data: any) => setStats(data))
      .catch(() => {});
  }, []);

  // ── Debounced search ──
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fastApiClient.getUnifiedCoins({
        page: currentPage,
        per_page: perPage,
        search: search || undefined,
        sort: sortField,
        order: sortOrder,
        sector: sectorFilter || undefined,
        has_price: viewMode === 'priced' ? true : undefined,
      }) as UnifiedResponse;

      let coinsList = resp.coins || [];

      // Client-side favorites filter
      if (viewMode === 'favorites') {
        coinsList = coinsList.filter(c => favoriteIds.has(c.id) || favoriteIds.has(c.slug));
      }

      setCoins(coinsList);
      setTotalCoins(resp.total);
      setTotalPages(resp.total_pages);
    } catch (err) {
      console.error('Failed to fetch unified coins:', err);
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, search, sortField, sortOrder, sectorFilter, viewMode, favoriteIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Click outside handlers ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowColumns(false);
      if (sectorRef.current && !sectorRef.current.contains(e.target as Node)) setShowSectorDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Sort handler ──
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  }

  function SortHeader({ field, label, className = '' }: { field: SortField; label: string; className?: string }) {
    const active = sortField === field;
    return (
      <th
        className={`px-3 py-2.5 text-xs font-medium text-gray-400 cursor-pointer hover:text-white select-none whitespace-nowrap ${className}`}
        onClick={() => handleSort(field)}
      >
        {label}{active ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    );
  }

  // ── Toggle favorite ──
  function toggleFav(id: string) {
    toggleFavoriteId(id);
    setFavoriteIds(readFavoriteIds());
  }

  const favCount = favoriteIds.size;
  const isCol = (k: ColumnKey) => visibleColumns[k];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-4" dir="ltr">
      {/* ── Stats Banner ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Total Coins', value: stats.cmc_coins?.toLocaleString() || '0', color: 'text-blue-300' },
            { label: 'Live Prices', value: stats.live_prices?.toLocaleString() || '0', color: 'text-amber-300' },
            { label: 'CG Markets', value: stats.coin_markets?.toLocaleString() || '0', color: 'text-emerald-300' },
            { label: 'CG Details', value: stats.coin_details?.toLocaleString() || '0', color: 'text-cyan-300' },
            { label: 'Messari', value: stats.messari_projects?.toLocaleString() || '0', color: 'text-purple-300' },
            { label: 'DeFi Tokens', value: stats.defi_tokens?.toLocaleString() || '0', color: 'text-pink-300' },
            { label: 'CEX', value: stats.cex_exchanges?.toLocaleString() || '55', color: 'text-orange-300' },
            { label: 'Sectors', value: stats.unique_sectors?.toString() || '0', color: 'text-teal-300' },
          ].map(s => (
            <div key={s.label} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Controls Bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search coins..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/10">
          {([
            { mode: 'all' as ViewMode, label: '🌐 All', desc: 'All coins' },
            { mode: 'priced' as ViewMode, label: '💰 Priced', desc: 'With price data' },
            { mode: 'favorites' as ViewMode, label: `★ ${favCount}`, desc: 'Favorites' },
          ]).map(v => (
            <button
              key={v.mode}
              onClick={() => { setViewMode(v.mode); setCurrentPage(1); }}
              title={v.desc}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === v.mode
                  ? 'bg-cyan-600/25 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Sector Filter */}
        <div className="relative" ref={sectorRef}>
          <button
            onClick={() => setShowSectorDropdown(!showSectorDropdown)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              sectorFilter
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                : 'bg-white/[0.03] text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            {sectorFilter || 'Sector'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSectorDropdown && (
            <div className="absolute z-50 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg bg-gray-900 border border-white/10 shadow-xl">
              <button
                onClick={() => { setSectorFilter(''); setShowSectorDropdown(false); setCurrentPage(1); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-gray-300"
              >
                All Sectors
              </button>
              {sectors.map(s => (
                <button
                  key={s.sector}
                  onClick={() => { setSectorFilter(s.sector); setShowSectorDropdown(false); setCurrentPage(1); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex justify-between ${
                    sectorFilter === s.sector ? 'text-purple-300 bg-purple-900/20' : 'text-gray-300'
                  }`}
                >
                  <span>{s.sector}</span>
                  <span className="text-gray-500">{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column Customizer */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowColumns(!showColumns)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.03] text-gray-400 border border-white/10 hover:text-white transition-all"
          >
            <Columns className="w-3 h-3" />
            Columns
          </button>
          {showColumns && (
            <div className="absolute z-50 right-0 mt-1 w-56 rounded-lg bg-gray-900 border border-white/10 shadow-xl p-3">
              <div className="text-xs font-medium text-gray-300 mb-2">Visible Columns</div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map(key => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="accent-cyan-400 w-3.5 h-3.5"
                    />
                    {COLUMN_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Per Page */}
        <select
          value={perPage}
          onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
          className="px-2 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-gray-300 focus:outline-none"
        >
          {[50, 100, 200, 500].map(n => (
            <option key={n} value={n}>{n} rows</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]"><th className="w-8 px-2 py-2.5"></th><SortHeader field="rank" label="#" className="w-12 text-center" /><SortHeader field="name" label="Name" className="text-left min-w-[180px]" /><SortHeader field="price" label="Price" className="text-right" />{isCol('change_1h') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap cursor-pointer hover:text-white" onClick={() => handleSort('change_24h')}>1h %</th> : null}{isCol('change_24h') ? <SortHeader field="change_24h" label="24h %" className="text-right" /> : null}{isCol('change_7d') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">7d %</th> : null}{isCol('change_30d') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">30d %</th> : null}{isCol('high_24h') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">High 24h</th> : null}{isCol('low_24h') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">Low 24h</th> : null}{isCol('market_cap') ? <SortHeader field="market_cap" label="Market Cap" className="text-right" /> : null}{isCol('fdv') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">FDV</th> : null}{isCol('total_volume') ? <SortHeader field="volume" label="Volume 24h" className="text-right" /> : null}{isCol('circulating_supply') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">Circulating</th> : null}{isCol('total_supply') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">Total Supply</th> : null}{isCol('max_supply') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">Max Supply</th> : null}{isCol('chart_7d') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-center whitespace-nowrap">Chart 7d</th> : null}{isCol('sector') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-left whitespace-nowrap">Sector</th> : null}{isCol('tvl') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-right whitespace-nowrap">TVL</th> : null}{isCol('exchange') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-center whitespace-nowrap">Exchange</th> : null}{isCol('sources') ? <th className="px-3 py-2.5 text-xs font-medium text-gray-400 text-center whitespace-nowrap">Sources</th> : null}</tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  <td colSpan={20} className="px-4 py-3">
                    <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : coins.length === 0 ? (
              <tr>
                <td colSpan={20} className="text-center py-12 text-gray-500">
                  {search ? `No coins matching "${search}"` : 'No coins found'}
                </td>
              </tr>
            ) : coins.map(coin => {
              const coinId = coin.id || coin.slug;
              const isFav = favoriteIds.has(coinId);

              return (
                <tr
                  key={`${coin.cmc_id}-${coin.slug}`}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Favorite */}
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => coinId && toggleFav(coinId)} className="opacity-50 group-hover:opacity-100 transition-opacity">
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-600 hover:text-amber-400'}`} />
                    </button>
                  </td>

                  {/* Rank */}
                  <td className="px-2 py-2 text-center text-xs text-gray-500">
                    {coin.rank || '—'}
                  </td>

                  {/* Name + Symbol + Image */}
                  <td className="px-3 py-2">
                    <Link
                      href={coinId ? `/chat/cryptocurrencies/${coinId}` : '#'}
                      className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                    >
                      {coin.image ? (
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
                          {coin.symbol?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm truncate max-w-[140px]">{coin.name}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span>{coin.symbol}</span>
                          {coin.coin_type === 2 && <span className="px-1 py-0 rounded bg-cyan-900/30 text-cyan-400 text-[8px]">TOKEN</span>}
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* Price */}
                  <td className="px-3 py-2 text-right text-sm font-mono text-white">
                    {formatPrice(coin.price)}
                  </td>

                  {/* Change columns */}
                  {isCol('change_1h') && <td className="px-3 py-2 text-right text-xs"><PctCell value={coin.change_1h} /></td>}
                  {isCol('change_24h') && <td className="px-3 py-2 text-right text-xs"><PctCell value={coin.change_24h} /></td>}
                  {isCol('change_7d') && <td className="px-3 py-2 text-right text-xs"><PctCell value={coin.change_7d} /></td>}
                  {isCol('change_30d') && <td className="px-3 py-2 text-right text-xs"><PctCell value={coin.change_30d} /></td>}

                  {/* High/Low */}
                  {isCol('high_24h') && <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{formatPrice(coin.high_24h)}</td>}
                  {isCol('low_24h') && <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{formatPrice(coin.low_24h)}</td>}

                  {/* Market Cap */}
                  {isCol('market_cap') && <td className="px-3 py-2 text-right text-xs text-gray-300 font-mono">{formatCompact(coin.market_cap)}</td>}

                  {/* FDV */}
                  {isCol('fdv') && <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">{formatCompact(coin.fdv)}</td>}

                  {/* Volume */}
                  {isCol('total_volume') && <td className="px-3 py-2 text-right text-xs text-gray-300 font-mono">{formatCompact(coin.total_volume)}</td>}

                  {/* Supply columns */}
                  {isCol('circulating_supply') && <td className="px-3 py-2 text-right text-xs text-gray-400">{formatSupply(coin.circulating_supply)}</td>}
                  {isCol('total_supply') && <td className="px-3 py-2 text-right text-xs text-gray-400">{formatSupply(coin.total_supply)}</td>}
                  {isCol('max_supply') && <td className="px-3 py-2 text-right text-xs text-gray-400">{formatSupply(coin.max_supply ?? undefined)}</td>}

                  {/* Sparkline */}
                  {isCol('chart_7d') && (
                    <td className="px-2 py-2 text-center">
                      <MiniSparkline data={coin.sparkline_7d} width={80} height={24} />
                    </td>
                  )}

                  {/* Sector */}
                  {isCol('sector') && (
                    <td className="px-3 py-2 text-left">
                      {coin.sector ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-300 border border-purple-700/30 truncate max-w-[100px]">
                          {coin.sector}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  )}

                  {/* TVL (DeFi Llama) */}
                  {isCol('tvl') && (
                    <td className="px-3 py-2 text-right text-xs text-gray-300 font-mono">
                      {coin.tvl > 0 ? formatCompact(coin.tvl) : <span className="text-gray-600">—</span>}
                    </td>
                  )}

                  {/* Exchange (CCXT primary) */}
                  {isCol('exchange') && (
                    <td className="px-3 py-2 text-center">
                      {coin.primary_exchange ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-amber-900/30 text-amber-300 border border-amber-700/30 uppercase">
                            {coin.primary_exchange}
                          </span>
                          {coin.exchange_count > 1 && (
                            <span className="text-[8px] text-gray-500">+{coin.exchange_count - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  )}

                  {/* Sources */}
                  {isCol('sources') && (
                    <td className="px-3 py-2 text-center">
                      <SourceBadges sources={coin.sources} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Showing {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, totalCoins)} of {totalCoins.toLocaleString()} coins
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage <= 1}
            className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            ««
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>

          {/* Page numbers */}
          {(() => {
            const pages: number[] = [];
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, currentPage + 2);
            for (let i = start; i <= end; i++) pages.push(i);
            return pages.map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                    : 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {p}
              </button>
            ));
          })()}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            »»
          </button>
        </div>
      </div>
    </div>
  );
}
