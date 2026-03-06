'use client';

/**
 * 🎛️ Pattern Filters Component
 * 
 * Filter controls for the Patterns V2 Scanner page.
 * Includes timeframe, pattern type filter, and items-per-page.
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import React from 'react';
import { ChevronDown, Filter as FilterIcon, RefreshCw } from 'lucide-react';

const selectStyle = "appearance-none bg-[#0d1514] border border-[#2b403d] rounded-md px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer [&>option]:bg-[#0d1514] [&>option]:text-white";

// ============================================================================
// 📊 TYPES
// ============================================================================

export type PatternFilterDirection = 'all' | 'bullish' | 'bearish' | 'neutral';

export interface PatternFilterState {
  timeframe: string;
  direction: PatternFilterDirection;
  itemsPerPage: number;
}

export const DEFAULT_PATTERN_FILTER_STATE: PatternFilterState = {
  timeframe: '1h',
  direction: 'all',
  itemsPerPage: 20,
};

const TIMEFRAMES = ['1h', '4h', '1d', '1w'];
const DIRECTION_OPTIONS: { value: PatternFilterDirection; label: string }[] = [
  { value: 'all', label: 'All Patterns' },
  { value: 'bullish', label: 'Bullish Only' },
  { value: 'bearish', label: 'Bearish Only' },
  { value: 'neutral', label: 'Neutral' },
];
const ITEMS_PER_PAGE_OPTIONS = [20, 30, 40];

interface PatternFiltersProps {
  filters: PatternFilterState;
  onFiltersChange: (filters: PatternFilterState) => void;
  resultCount: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function PatternFilters({
  filters,
  onFiltersChange,
  resultCount,
  isLoading,
  onRefresh,
}: PatternFiltersProps) {

  const updateFilter = <K extends keyof PatternFilterState>(
    key: K,
    value: PatternFilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#2b403d]/70 bg-[#1a2625]/80">

      {/* Timeframe — Desktop: Buttons, Mobile: Dropdown */}
      <div className="hidden sm:flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => updateFilter('timeframe', tf)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              filters.timeframe === tf
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-[#1a2625] text-gray-400 hover:text-white border border-[#2b403d] hover:border-cyan-500/30'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
      <div className="relative sm:hidden">
        <select
          value={filters.timeframe}
          onChange={(e) => updateFilter('timeframe', e.target.value)}
          className={selectStyle}
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#2b403d] hidden sm:block" />

      {/* Direction Filter */}
      <div className="flex items-center gap-2">
        <FilterIcon className="w-4 h-4 text-gray-400" />
        <div className="relative">
          <select
            value={filters.direction}
            onChange={(e) => updateFilter('direction', e.target.value as PatternFilterDirection)}
            className={selectStyle}
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#2b403d] hidden sm:block" />

      {/* Items Per Page — Desktop: Buttons, Mobile: Dropdown */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="text-gray-400 text-xs">Show</span>
        <div className="flex gap-1">
          {ITEMS_PER_PAGE_OPTIONS.map((count) => (
            <button
              key={count}
              onClick={() => updateFilter('itemsPerPage', count)}
              className={`px-2.5 py-1.5 text-xs font-mono rounded-md transition-all ${
                filters.itemsPerPage === count
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-[#1a2625] text-gray-400 hover:text-white border border-[#2b403d] hover:border-cyan-500/30'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
      <div className="relative sm:hidden">
        <select
          value={filters.itemsPerPage}
          onChange={(e) => updateFilter('itemsPerPage', Number(e.target.value))}
          className={selectStyle}
        >
          {ITEMS_PER_PAGE_OPTIONS.map((count) => (
            <option key={count} value={count}>{count} items</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Right Side: Count + Refresh */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="text-sm text-gray-400">
          <span className="text-cyan-400 font-bold">{resultCount}</span> symbols
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-all ${
              isLoading
                ? 'bg-[#1a2625] text-gray-600 cursor-not-allowed'
                : 'bg-[#1a2625] text-gray-400 hover:text-white border border-[#2b403d] hover:border-cyan-500/30'
            }`}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

export default PatternFilters;
