'use client';

/**
 * 🔷 Patterns V2 Scanner Page
 * 
 * Detects 16 chart patterns across top symbols using the TrendLines V2 engine.
 * Each card fetches OHLCV data and computes patterns locally.
 * Cards auto-hide when no pattern is detected.
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PatternGrid,
  PatternFilters,
  PatternFilterState,
  DEFAULT_PATTERN_FILTER_STATE,
} from '@/components/scanners/patterns';
import { useScannerData } from '@/hooks/useScannerData';
import { useExchangeStore } from '@/stores/exchangeStore';
import type { ExchangeId } from '@/types/exchanges';
import { Shapes, ChevronDown } from 'lucide-react';

// Supported exchanges (same as trendlines scanner)
const PATTERN_EXCHANGES = [
  { id: 'binance', name: 'Binance' },
  { id: 'kucoin', name: 'KuCoin' },
  { id: 'okx', name: 'OKX' },
  { id: 'bitget', name: 'Bitget' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'mexc', name: 'MEXC' },
  { id: 'gateio', name: 'Gate.io' },
];

// ============================================================================
// 📊 PAGE COMPONENT
// ============================================================================

export default function PatternsV2ScannerPage() {
  const { activeExchange, setActiveExchange } = useExchangeStore();

  const [filters, setFilters] = useState<PatternFilterState>(DEFAULT_PATTERN_FILTER_STATE);
  const [currentPage, setCurrentPage] = useState(1);
  const [exchangeDropdownOpen, setExchangeDropdownOpen] = useState(false);
  const exchangeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Default to binance if the active exchange isn't in our list
  const effectiveExchange = useMemo(() => {
    const found = PATTERN_EXCHANGES.find(e => e.id === activeExchange.toLowerCase());
    return found ? found.id : 'binance';
  }, [activeExchange]);

  const currentExchangeName = useMemo(() => {
    const ex = PATTERN_EXCHANGES.find(e => e.id === effectiveExchange);
    return ex?.name || 'Binance';
  }, [effectiveExchange]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exchangeDropdownRef.current && !exchangeDropdownRef.current.contains(event.target as Node)) {
        setExchangeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.timeframe, filters.direction, filters.itemsPerPage, effectiveExchange]);

  const {
    results: firestoreResults,
    isLoading,
    error,
    refresh,
  } = useScannerData<any>({
    pageId: 'pattern',
    timeframe: filters.timeframe,
    exchange: effectiveExchange,
  });

  const filteredResults = useMemo(() => {
    const arr = Array.isArray(firestoreResults) ? firestoreResults : [];
    if (filters.direction === 'all') return arr;
    return arr.filter((r: any) => (r.direction || r.pattern?.direction) === filters.direction);
  }, [firestoreResults, filters.direction]);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 py-6">

        {/* ═══ HEADER ═══ */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                <Shapes className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Chart Patterns Scanner</h1>
                <p className="text-sm text-gray-500">16 Patterns &bull; TrendLines V2 Engine</p>
              </div>
            </div>

            {/* Exchange Selector */}
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
                  {PATTERN_EXCHANGES.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setActiveExchange(ex.id as ExchangeId);
                        setExchangeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        effectiveExchange === ex.id
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

        {/* ═══ FILTERS ═══ */}
        <div className="mb-6">
          <PatternFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filteredResults.length}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ═══ RESULTS GRID ═══ */}
        <PatternGrid
          results={filteredResults.map((r: any) => ({
            symbol: r.symbol,
            exchange: effectiveExchange,
            timeframe: filters.timeframe,
            pattern: r.pattern,
          }))}
          exchange={effectiveExchange}
          timeframe={filters.timeframe}
          isLoading={isLoading}
          itemsPerPage={filters.itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

      </div>
    </div>
  );
}
