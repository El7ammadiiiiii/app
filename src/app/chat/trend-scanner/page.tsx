"use client";

/**
 * 📊 DYOR-Style Trend Scanner
 * 38 Technical Indicators × 5 Timeframes
 * Identical scoring to DYOR.net — SMA, EMA, Ichimoku, ADX, MACD, Supertrend, StochRSI
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, RefreshCw, Star, ChevronDown, ChevronUp, TrendingUp, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import { useFavoriteCoins } from "@/lib/hooks/useFavoriteCoins";
import { InlineFavoriteStar } from "@/components/market/FavoriteButton";
import { useExchangeStore } from "@/stores/exchangeStore";
import { ExchangeSelector } from "@/components/layout/ExchangeSelector";
import { fastApiClient } from "@/lib/services/fastApiClient";
import TrendScannerPairOverlay from "@/components/trend-scanner/TrendScannerPairOverlay";

// ─── Types ───

interface TFResult {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bullishScore: number;
  bearishScore: number;
  score: number;
}

interface CoinResult {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timeframes: Record<string, TFResult>;
}

// ─── Constants ───

const TIMEFRAMES = ["15m", "1h", "4h", "1d", "1w"] as const;

type SortColumn = "coin" | "15m" | "1h" | "4h" | "1d" | "1w" | "price" | "change24h" | "high24h" | "low24h" | "volume24h";
type SortDir = "ASC" | "DESC";

// ─── Score Bar Component (DYOR-style) ───

function ScoreBar({ result }: { result?: TFResult }) {
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
        <div className="w-full h-[6px] bg-white/5 rounded-full" />
        <div className="flex justify-between w-full text-[9px] text-white/20">
          <span>—</span>
          <span>—</span>
        </div>
      </div>
    );
  }

  const { bullishScore, bearishScore, score } = result;
  const absScore = Math.min(Math.abs(score), 100);
  const isBullish = score > 0;
  const isNeutral = score === 0;

  return (
    <div className="flex flex-col items-center gap-[2px] min-w-[56px]">
      {/* Score bar */}
      <div className="w-full h-[6px] bg-white/[0.08] rounded-full overflow-hidden relative">
        {!isNeutral && (
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBullish
                ? "bg-gradient-to-r from-[#1a6b3f] to-[#22c55e]"
                : "bg-gradient-to-r from-[#dc2626] to-[#ef4444]"
            }`}
            style={{ width: `${absScore}%` }}
          />
        )}
      </div>
      {/* Buy / Sell counts */}
      <div className="flex justify-between w-full text-[9px] leading-none">
        <span className="text-[#22c55e] font-medium flex items-center gap-[1px]">
          {bullishScore}
          <ArrowUp className="w-[7px] h-[7px]" />
        </span>
        <span className="text-[#ef4444] font-medium flex items-center gap-[1px]">
          {bearishScore}
          <ArrowDown className="w-[7px] h-[7px]" />
        </span>
      </div>
    </div>
  );
}

// ─── Format Helpers ───

function formatPrice(price: number): string {
  if (!price || price === 0) return "—";
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (price >= 0.01) return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
}

function formatVolume(vol: number): string {
  if (!vol) return "—";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

function formatChange(change: number): string {
  if (change === 0) return "0.00%";
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

// ─── Main Page ───

export default function DYORTrendScannerPage() {
  const { activeExchange } = useExchangeStore();
  const { favorites, isFavorite, toggleFavorite } = useFavoriteCoins();

  const [results, setResults] = useState<CoinResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("coin");
  const [sortDir, setSortDir] = useState<SortDir>("ASC");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [coinCount, setCoinCount] = useState(100);
  const [overlaySymbol, setOverlaySymbol] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);

  // ─── Fetch Data ───

  const fetchData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setProgress(5);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 1000);

      let json: { success: boolean; results?: CoinResult[]; error?: string };
      try {
        json = await fastApiClient.trendScan(activeExchange, coinCount) as typeof json;
      } catch {
        // Fallback to old route
        const res = await fetch(
          `/api/trend-scanner-dyor?exchange=${activeExchange}&count=${coinCount}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        json = await res.json();
      }

      clearInterval(progressInterval);

      if (json.success && json.results) {
        setResults(json.results);
        setLastUpdate(new Date());
        setProgress(100);
      } else {
        throw new Error(json.error || "Unknown error");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
      loadingRef.current = false;
      setTimeout(() => setProgress(0), 500);
    }
  }, [activeExchange, coinCount]);

  // Auto-fetch on mount and exchange change
  useEffect(() => {
    fetchData();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [activeExchange, coinCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sort ───

  const handleSort = useCallback((col: SortColumn) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDir(d => d === "ASC" ? "DESC" : "ASC");
        return col;
      }
      const defaultDir: SortDir = col === "coin" ? "ASC" : "DESC";
      setSortDir(defaultDir);
      return col;
    });
  }, []);

  // ─── Filter & Sort ───

  const displayData = useMemo(() => {
    let filtered = [...results];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => (c.name || "").toLowerCase().includes(q) || (c.symbol || "").toLowerCase().includes(q));
    }

    // Favorites
    if (showFavoritesOnly) {
      const favSet = new Set(favorites.map(f => f.symbol.toUpperCase()));
      filtered = filtered.filter(c => favSet.has(c.symbol.toUpperCase()));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = 0, bVal = 0;

      if (sortColumn === "coin") {
        return sortDir === "ASC" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortColumn === "price") {
        aVal = a.price; bVal = b.price;
      } else if (sortColumn === "change24h") {
        aVal = a.change24h; bVal = b.change24h;
      } else if (sortColumn === "high24h") {
        aVal = a.high24h; bVal = b.high24h;
      } else if (sortColumn === "low24h") {
        aVal = a.low24h; bVal = b.low24h;
      } else if (sortColumn === "volume24h") {
        aVal = a.volume24h; bVal = b.volume24h;
      } else {
        // Timeframe sort — by score
        aVal = a.timeframes[sortColumn]?.score ?? -999;
        bVal = b.timeframes[sortColumn]?.score ?? -999;
      }

      return sortDir === "ASC" ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [results, searchQuery, showFavoritesOnly, favorites, sortColumn, sortDir]);

  // ─── Pagination ───

  const totalPages = Math.max(1, Math.ceil(displayData.length / itemsPerPage));
  const paginated = displayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  // ─── Sort Header Component ───

  const SortHeader = useCallback(({ col, label, align = "center", minW }: { col: SortColumn; label: string; align?: string; minW?: string }) => (
    <th
      className={`py-3 px-2 font-medium text-xs cursor-pointer select-none hover:text-cyan-400 transition-colors whitespace-nowrap ${
        sortColumn === col ? "text-cyan-400" : "text-gray-400"
      } ${align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center"}`}
      style={minW ? { minWidth: minW } : undefined}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortColumn === col && (
          sortDir === "ASC" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </span>
    </th>
  ), [sortColumn, sortDir, handleSort]);

  return (
    <div className="min-h-screen text-white">
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1900px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Trend Scanner</h1>
                <p className="text-[10px] text-gray-500 mt-0.5">38 indicators × 5 timeframes — DYOR method</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 w-44 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Favorites */}
              <button
                onClick={() => { setShowFavoritesOnly(p => !p); setCurrentPage(1); }}
                className={`p-1.5 rounded-lg border transition-all ${
                  showFavoritesOnly
                    ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
                title="Favorites"
              >
                <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-yellow-400" : ""}`} />
              </button>

              {/* Coin count */}
              <select
                value={coinCount}
                onChange={e => { setCoinCount(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs focus:outline-none cursor-pointer"
              >
                  <option value={50} className="bg-[#0c0e1a]">50 coins</option>
                <option value={100} className="bg-[#0c0e1a]">100 coins</option>
              </select>

              {/* Per page */}
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs focus:outline-none cursor-pointer"
              >
                {[20, 50, 100].map(n => (
                  <option key={n} value={n} className="bg-[#0c0e1a]">Show {n}</option>
                ))}
              </select>

              <ExchangeSelector />

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              {/* Last update */}
              <div className="text-[10px] text-gray-500 ml-1" suppressHydrationWarning>
                {lastUpdate ? lastUpdate.toLocaleTimeString("en-US") : "—"}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {loading && progress > 0 && (
            <div className="mt-2 w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* ═══ Info Banner ═══ */}
      <div className="max-w-[1900px] mx-auto px-4 mt-3 mb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-panel text-[11px] text-white/70">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            38 checks per timeframe: <strong>SMA</strong>(10/25/50/100/200) × 15 + <strong>EMA</strong>(10/25/50/100/200) × 15 + <strong>Ichimoku</strong> × 4 + <strong>ADX</strong> + <strong>MACD</strong> + <strong>Supertrend</strong> + <strong>StochRSI</strong>
          </span>
        </div>
      </div>

      {/* ═══ Loading State ═══ */}
      {loading && results.length === 0 && (
        <div className="max-w-[1900px] mx-auto px-4 py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            <div className="text-sm text-gray-400">
              Scanning {coinCount} coins × {TIMEFRAMES.length} timeframes × 38 indicators...
            </div>
            <div className="text-xs text-gray-500">This may take 30-60 seconds</div>
          </div>
        </div>
      )}

      {/* ═══ Error State ═══ */}
      {error && !loading && (
        <div className="max-w-[1900px] mx-auto px-4 py-10">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={fetchData} className="mt-2 px-4 py-1.5 bg-red-500/20 rounded text-xs text-red-300 hover:bg-red-500/30">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ═══ Results Table ═══ */}
      {results.length > 0 && (
        <main className="max-w-[1900px] mx-auto px-4 pb-6">
          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-2 text-[11px] text-gray-500">
            <span><span className="text-white font-medium">{displayData.length}</span> coins</span>
            <span className="text-white/10">|</span>
            <span><span className="text-cyan-400">{TIMEFRAMES.length}</span> timeframes</span>
            <span className="text-white/10">|</span>
            <span><span className="text-cyan-400">38</span> indicators per cell</span>
          </div>

          <div className="rounded-xl glass-panel overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  {TIMEFRAMES.map(tf => <col key={tf} style={{ width: "8%" }} />)}
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <SortHeader col="coin" label="Coin" align="left" />
                    {TIMEFRAMES.map(tf => (
                      <SortHeader key={tf} col={tf as SortColumn} label={tf} />
                    ))}
                    <SortHeader col="price" label="Price" align="right" minW="90px" />
                    <SortHeader col="change24h" label="24h %" align="right" minW="70px" />
                    <SortHeader col="high24h" label="High 24h" align="right" minW="90px" />
                    <SortHeader col="low24h" label="Low 24h" align="right" minW="90px" />
                    <SortHeader col="volume24h" label="Volume 24h" align="right" minW="100px" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((coin) => (
                    <CoinRow
                      key={coin.symbol}
                      coin={coin}
                      isFav={isFavorite(coin.symbol)}
                      onToggleFav={() => toggleFavorite({ symbol: coin.symbol, name: coin.name, coingeckoId: "" })}
                      onOpenPair={(tf) => {
                        const symbol = coin.symbol.toUpperCase();
                        if (tf) {
                          // timeframe click opens the same overlay template for this pair
                        }
                        setOverlaySymbol(symbol);
                      }}
                    />
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-sm text-gray-500">
                        No coins found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400 min-w-[80px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      <TrendScannerPairOverlay
        symbol={overlaySymbol ?? "BTCUSDT"}
        isOpen={overlaySymbol !== null}
        onClose={() => setOverlaySymbol(null)}
      />
    </div>
  );
}

// ─── Coin Row Component ───

function CoinRow({
  coin,
  isFav,
  onToggleFav,
  onOpenPair,
}: {
  coin: CoinResult;
  isFav: boolean;
  onToggleFav: () => void;
  onOpenPair: (tf?: string) => void;
}) {
  const changeColor = coin.change24h >= 0 ? "text-[#22c55e]" : "text-[#ef4444]";

  return (
    <tr
      className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer"
      onClick={() => onOpenPair()}
      title="Open pair details"
    >
      {/* Coin name */}
      <td className="py-2.5 px-2">
        <div className="flex items-center gap-1.5">
          <span onClick={(e) => e.stopPropagation()}>
            <InlineFavoriteStar isFavorite={isFav} onToggle={onToggleFav} />
          </span>
          <div>
            <span className="text-white font-medium text-sm">{coin.name}</span>
            <span className="text-gray-500 text-[10px] ml-1">/USDT</span>
          </div>
        </div>
      </td>

      {/* Timeframe cells */}
      {TIMEFRAMES.map(tf => (
        <td key={tf} className="py-2.5 px-1.5">
          <button
            type="button"
            className="w-full flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPair(tf);
            }}
            title={`Open ${coin.symbol.toUpperCase()} at ${tf}`}
          >
            <ScoreBar result={coin.timeframes[tf]} />
          </button>
        </td>
      ))}

      {/* Price */}
      <td className="py-2.5 px-2 text-right">
        <span className="text-white font-mono text-xs">${formatPrice(coin.price)}</span>
      </td>

      {/* 24h % */}
      <td className="py-2.5 px-2 text-right">
        <span className={`font-mono text-xs ${changeColor}`}>
          {formatChange(coin.change24h)}
        </span>
      </td>

      {/* High 24h */}
      <td className="py-2.5 px-2 text-right">
        <span className="text-white/70 font-mono text-xs">${formatPrice(coin.high24h)}</span>
      </td>

      {/* Low 24h */}
      <td className="py-2.5 px-2 text-right">
        <span className="text-white/70 font-mono text-xs">${formatPrice(coin.low24h)}</span>
      </td>

      {/* Volume */}
      <td className="py-2.5 px-2 text-right">
        <span className="text-white/60 font-mono text-xs">{formatVolume(coin.volume24h)}</span>
      </td>
    </tr>
  );
}
