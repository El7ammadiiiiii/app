'use client';

/**
 * 📈 Trendlines Scanner Page
 * 
 * Detects support and resistance trend lines across 6 exchanges,
 * 200 symbols, and 4 timeframes (1h, 4h, 1d, 1w).
 * 
 * Uses 2-candle break confirmation for line invalidation.
 * All computation happens server-side (Firebase), frontend only displays results.
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  TrendlineGrid, 
  TrendlineFilters, 
  TrendlineFilterState, 
  DEFAULT_FILTER_STATE,
  TrendlineResult,
  FilterType
} from '@/components/scanners/trendlines';
import { useScannerData } from '@/hooks/useScannerData';
import { useExchangeStore } from '@/stores/exchangeStore';
import { TrendingUp, ChevronDown } from 'lucide-react';

// Supported exchanges for this scanner
const TRENDLINE_EXCHANGES = [
  { id: 'binance', name: 'Binance' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'coinbase', name: 'Coinbase' },
  { id: 'cryptocom', name: 'Crypto.com' },
  { id: 'kucoin', name: 'KuCoin' },
  { id: 'okx', name: 'OKX' },
];

// ============================================================================
// 📊 PAGE COMPONENT
// ============================================================================

export default function TrendlinesScannerPage() {
  const { activeExchange, setActiveExchange } = useExchangeStore();
  
  // Filter state
  const [filters, setFilters] = useState<TrendlineFilterState>(DEFAULT_FILTER_STATE);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [exchangeDropdownOpen, setExchangeDropdownOpen] = useState(false);
  const exchangeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exchangeDropdownRef.current && !exchangeDropdownRef.current.contains(event.target as Node)) {
        setExchangeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current exchange name
  const currentExchangeName = useMemo(() => {
    const ex = TRENDLINE_EXCHANGES.find(e => e.id === activeExchange.toLowerCase());
    return ex?.name || 'Binance';
  }, [activeExchange]);

  // Fetch data from Firestore (backend pre-computed)
  const { 
    results: firestoreResults, 
    isLoading, 
    error, 
    refresh 
  } = useScannerData<TrendlineResult>({
    pageId: 'trendlines',
    timeframe: filters.timeframe,
    exchange: activeExchange.toLowerCase(),
  });

  // Debug log
  useEffect(() => {
    console.log('[Trendlines] Exchange:', activeExchange.toLowerCase());
    console.log('[Trendlines] Timeframe:', filters.timeframe);
    console.log('[Trendlines] Results:', firestoreResults?.length || 0);
    console.log('[Trendlines] isLoading:', isLoading);
    console.log('[Trendlines] error:', error);
  }, [activeExchange, filters.timeframe, firestoreResults, isLoading, error]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('trendlines_favorites_v1');
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load trendline favorites', e);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('trendlines_favorites_v1', JSON.stringify([...favorites]));
  }, [favorites]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.timeframe, filters.filterType, filters.sortField, filters.sortOrder, activeExchange]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter results based on filter state
  const filteredResults = useMemo(() => {
    let results = firestoreResults || [];

    // Filter by filter_type
    if (filters.filterType !== 'all') {
      results = results.filter(r => r.filter_type === filters.filterType);
    }

    return results;
  }, [firestoreResults, filters.filterType]);

  return (
    <div className="min-h-screen">
      {/* Page Container */}
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-6">
          {/* Title Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Trendlines Scanner</h1>
                <p className="text-sm text-gray-500">Support & Resistance Lines</p>
              </div>
            </div>

            {/* Exchange Selector - Only 6 exchanges */}
            <div className="relative" ref={exchangeDropdownRef}>
              <button
                onClick={() => setExchangeDropdownOpen(!exchangeDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d1514] border border-[#2b403d] text-white hover:border-cyan-500/30 transition-colors"
              >
                <span className="font-medium">{currentExchangeName}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${exchangeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {exchangeDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-lg bg-[#0d1514] border border-[#2b403d] shadow-xl z-50 overflow-hidden">
                  {TRENDLINE_EXCHANGES.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setActiveExchange(ex.id);
                        setExchangeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        activeExchange.toLowerCase() === ex.id
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-white hover:bg-[#1a2625]'
                      }`}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            FILTERS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-6">
          <TrendlineFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filteredResults.length}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-1">
              Path: scanners_results/trendlines/exchanges/{activeExchange.toLowerCase()}/timeframes/{filters.timeframe}/data
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            RESULTS GRID
        ═══════════════════════════════════════════════════════════════════ */}
        <TrendlineGrid
          results={filteredResults}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          isLoading={isLoading}
          error={error}
          sortField={filters.sortField}
          sortOrder={filters.sortOrder}
          itemsPerPage={filters.itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

      </div>
    </div>
  );
}
