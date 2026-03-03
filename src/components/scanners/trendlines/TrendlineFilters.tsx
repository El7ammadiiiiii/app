'use client';

/**
 * 🎛️ Trendline Filters Component
 * 
 * Filter controls for the Trendlines Scanner page.
 * Mobile responsive with dropdowns.
 * 
 * @author CCWAYS Team
 * @version 1.1.0
 */

import React from 'react';
import { SortField, SortOrder } from './TrendlineGrid';
import { ChevronDown, Filter as FilterIcon, RefreshCw } from 'lucide-react';

// Dropdown select style - solid dark background with white text
const selectStyle = "appearance-none bg-[#0d1514] border border-[#2b403d] rounded-md px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer [&>option]:bg-[#0d1514] [&>option]:text-white";

// ============================================================================
// 📊 TYPES
// ============================================================================

export type FilterType = 'all' | 'up' | 'down' | 'both';

export interface TrendlineFilterState {
  timeframe: string;
  filterType: FilterType;
  sortField: SortField;
  sortOrder: SortOrder;
  itemsPerPage: number;
}

export const DEFAULT_FILTER_STATE: TrendlineFilterState = {
  timeframe: '1h',
  filterType: 'all',
  sortField: 'detected_at',
  sortOrder: 'desc',
  itemsPerPage: 20,
};

const TIMEFRAMES = ['1h', '4h', '1d', '1w'];
const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'up', label: 'Bullish Only' },
  { value: 'down', label: 'Bearish Only' },
  { value: 'both', label: 'Mixed' },
];
const ITEMS_PER_PAGE_OPTIONS = [20, 30, 40];

interface TrendlineFiltersProps {
  filters: TrendlineFilterState;
  onFiltersChange: (filters: TrendlineFilterState) => void;
  resultCount: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function TrendlineFilters({
  filters,
  onFiltersChange,
  resultCount,
  isLoading,
  onRefresh
}: TrendlineFiltersProps) {

  const updateFilter = <K extends keyof TrendlineFilterState>(
    key: K,
    value: TrendlineFilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#2b403d]/70 bg-[#1a2625]/80">
      
      {/* Timeframe - Desktop: Buttons, Mobile: Dropdown */}
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

      {/* Filter Type */}
      <div className="flex items-center gap-2">
        <FilterIcon className="w-4 h-4 text-gray-400" />
        <div className="relative">
          <select
            value={filters.filterType}
            onChange={(e) => updateFilter('filterType', e.target.value as FilterType)}
            className={selectStyle}
          >
            {FILTER_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#2b403d] hidden sm:block" />

      {/* Items Per Page - Desktop: Buttons, Mobile: Dropdown */}
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

      {/* Right Side: Result Count & Refresh */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="text-sm text-gray-400">
          <span className="text-cyan-400 font-bold">{resultCount}</span> results
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

export default TrendlineFilters;
