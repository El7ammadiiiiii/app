'use client';

/**
 * 🎛️ Divergence Scanner Filters - فلاتر ماسح الدايفرجنس
 * 
 * واجهة متقدمة لتصفية نتائج البحث
 * Advanced filtering interface for scan results
 * 
 * @author CCWAYS Team
 * @version 2.1.0
 * @created 2026-01-19
 */

import React, { useState, useCallback } from 'react';
import {
  DivergenceType,
  DivergenceDirection,
  IndicatorType,
  DIVERGENCE_TYPE_LABELS,
  DIRECTION_LABELS,
  INDICATOR_LABELS
} from '@/lib/scanners/advanced-divergence-detector';
import {
  DEFAULT_EXCHANGES,
  DEFAULT_PAIRS,
  DEFAULT_TIMEFRAMES
} from '@/lib/scanners/divergence-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface FilterState {
  indicators: IndicatorType[];
  types: DivergenceType[];
  directions: DivergenceDirection[];
  exchanges: string[];
  pairs: string[];
  timeframes: string[];
  minScore: number;
  showFavoritesOnly: boolean;
}

// القيم الافتراضية
export const DEFAULT_FILTER_STATE: FilterState = {
  indicators: ['RSI', 'MACD', 'OBV'],
  types: ['strong', 'medium', 'weak', 'hidden'],
  directions: ['bullish', 'bearish'],
  exchanges: ['bybit', 'coinbase'],
  pairs: DEFAULT_PAIRS.slice(0, 20),
  timeframes: DEFAULT_TIMEFRAMES,
  minScore: 60,
  showFavoritesOnly: false
};

interface DivergenceFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  resultsCount: number;
  favoritesCount: number;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function DivergenceFilters({
  filters,
  onFiltersChange,
  isScanning,
  onStartScan,
  onStopScan,
  resultsCount,
  favoritesCount
}: DivergenceFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    indicators: false,
    types: false,
    directions: false,
    exchanges: false,
    pairs: false,
    timeframes: false
  });

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Update filter values
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  // Toggle item in array filter
  const toggleArrayItem = useCallback(<T extends string>(
    key: keyof FilterState,
    item: T,
    currentArray: T[]
  ) => {
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFilter(key, newArray as FilterState[typeof key]);
  }, [updateFilter]);

  // Select all items
  const selectAll = useCallback(<T extends string>(
    key: keyof FilterState,
    allItems: T[]
  ) => {
    updateFilter(key, allItems as FilterState[typeof key]);
  }, [updateFilter]);

  // Clear all items
  const clearAll = useCallback((key: keyof FilterState) => {
    updateFilter(key, [] as FilterState[typeof key]);
  }, [updateFilter]);

  return (
    <div className="rounded-xl overflow-hidden bg-transparent">
      {/* Header - Hidden in mobile dropdown as it has its own header */}
      <div className="hidden lg:flex px-4 py-3 border-b border-white/[0.08] items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          الفلاتر
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {favoritesCount > 0 && (
            <span className="text-yellow-500">★ {favoritesCount}</span>
          )}
        </div>
      </div>

      {/* Filter Sections */}
      <div className="lg:max-h-[calc(100vh-300px)] overflow-y-auto">
        
        {/* Indicators */}
        <FilterSection
          title="Indicators"
          isExpanded={expandedSections.indicators}
          onToggle={() => toggleSection('indicators')}
          count={filters.indicators.length}
          total={Object.keys(INDICATOR_LABELS).length}
        >
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(INDICATOR_LABELS) as IndicatorType[]).map(indicator => (
              <FilterChip
                key={indicator}
                label={indicator}
                isSelected={filters.indicators.includes(indicator)}
                onClick={() => toggleArrayItem('indicators', indicator, filters.indicators)}
              />
            ))}
          </div>
          <FilterActions
            onSelectAll={() => selectAll('indicators', Object.keys(INDICATOR_LABELS) as IndicatorType[])}
            onClearAll={() => clearAll('indicators')}
          />
        </FilterSection>

        {/* Types */}
        <FilterSection
          title="Divergence Types"
          isExpanded={expandedSections.types}
          onToggle={() => toggleSection('types')}
          count={filters.types.length}
          total={Object.keys(DIVERGENCE_TYPE_LABELS).length}
        >
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DIVERGENCE_TYPE_LABELS) as DivergenceType[]).map(type => (
              <FilterChip
                key={type}
                label={DIVERGENCE_TYPE_LABELS[type].en}
                isSelected={filters.types.includes(type)}
                onClick={() => toggleArrayItem('types', type, filters.types)}
                color={type === 'strong' ? 'emerald' : type === 'hidden' ? 'purple' : 'gray'}
              />
            ))}
          </div>
          <FilterActions
            onSelectAll={() => selectAll('types', Object.keys(DIVERGENCE_TYPE_LABELS) as DivergenceType[])}
            onClearAll={() => clearAll('types')}
          />
        </FilterSection>

        {/* Direction */}
        <FilterSection
          title="Direction"
          isExpanded={expandedSections.directions}
          onToggle={() => toggleSection('directions')}
          count={filters.directions.length}
          total={2}
        >
          <div className="flex gap-2">
            <FilterChip
              label="Bullish"
              isSelected={filters.directions.includes('bullish')}
              onClick={() => toggleArrayItem('directions', 'bullish', filters.directions)}
              color="green"
            />
            <FilterChip
              label="Bearish"
              isSelected={filters.directions.includes('bearish')}
              onClick={() => toggleArrayItem('directions', 'bearish', filters.directions)}
              color="red"
            />
          </div>
        </FilterSection>

        {/* Exchanges */}
        <FilterSection
          title="Exchanges"
          isExpanded={expandedSections.exchanges}
          onToggle={() => toggleSection('exchanges')}
          count={filters.exchanges.length}
          total={DEFAULT_EXCHANGES.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_EXCHANGES.map(exchange => (
              <FilterChip
                key={exchange}
                label={exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                isSelected={filters.exchanges.includes(exchange)}
                onClick={() => toggleArrayItem('exchanges', exchange, filters.exchanges)}
              />
            ))}
          </div>
          <FilterActions
            onSelectAll={() => selectAll('exchanges', DEFAULT_EXCHANGES)}
            onClearAll={() => clearAll('exchanges')}
          />
        </FilterSection>

        {/* Pairs */}
        <FilterSection
          title="Trading Pairs"
          isExpanded={expandedSections.pairs}
          onToggle={() => toggleSection('pairs')}
          count={filters.pairs.length}
          total={DEFAULT_PAIRS.length}
        >
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {DEFAULT_PAIRS.map(pair => (
              <FilterChip
                key={pair}
                label={pair.replace('USDT', '')}
                isSelected={filters.pairs.includes(pair)}
                onClick={() => toggleArrayItem('pairs', pair, filters.pairs)}
                size="sm"
              />
            ))}
          </div>
          <FilterActions
            onSelectAll={() => selectAll('pairs', DEFAULT_PAIRS)}
            onClearAll={() => clearAll('pairs')}
          />
        </FilterSection>

        {/* Timeframes */}
        <FilterSection
          title="Timeframes"
          isExpanded={expandedSections.timeframes}
          onToggle={() => toggleSection('timeframes')}
          count={filters.timeframes.length}
          total={DEFAULT_TIMEFRAMES.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_TIMEFRAMES.map(tf => (
              <FilterChip
                key={tf}
                label={tf}
                isSelected={filters.timeframes.includes(tf)}
                onClick={() => toggleArrayItem('timeframes', tf, filters.timeframes)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Min Score */}
        <div className="p-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">الحد الأدنى للنتيجة</span>
            <span className="text-xs text-cyan-400 font-mono">{filters.minScore}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => updateFilter('minScore', parseInt(e.target.value))}
            className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Favorites Only */}
        <div className="p-3 border-t border-white/[0.08]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="favorites-only-checkbox"
              name="favorites-only"
              type="checkbox"
              checked={filters.showFavoritesOnly}
              onChange={(e) => updateFilter('showFavoritesOnly', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-white/[0.08] text-yellow-500 focus:ring-yellow-500/50"
            />
            <span className="text-sm text-gray-300">المنفذة فقط</span>
            {favoritesCount > 0 && (
              <span className="text-xs text-yellow-500">({favoritesCount})</span>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 📦 SUB-COMPONENTS
// ============================================================================

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
  total: number;
  children: React.ReactNode;
}

function FilterSection({ title, isExpanded, onToggle, count, total, children }: FilterSectionProps) {
  return (
    <div className="border-t border-white/[0.08]">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/[0.05] transition-colors"
      >
        <span className="text-xs font-medium text-gray-300">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{count}/{total}</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  color?: 'gray' | 'green' | 'red' | 'emerald' | 'purple';
  size?: 'sm' | 'md';
}

function FilterChip({ label, isSelected, onClick, color = 'gray', size = 'md' }: FilterChipProps) {
  const colorClasses = {
    gray: isSelected 
      ? 'bg-gray-500/30 text-white border-gray-500/50' 
      : 'bg-white/[0.05] text-gray-400 border-white/[0.08] hover:border-gray-500',
    green: isSelected 
      ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50' 
      : 'bg-white/[0.05] text-gray-400 border-white/[0.08] hover:border-emerald-500',
    red: isSelected 
      ? 'bg-red-500/30 text-red-400 border-red-500/50' 
      : 'bg-white/[0.05] text-gray-400 border-white/[0.08] hover:border-red-500',
    emerald: isSelected 
      ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50' 
      : 'bg-white/[0.05] text-gray-400 border-white/[0.08] hover:border-emerald-500',
    purple: isSelected 
      ? 'bg-purple-500/30 text-purple-400 border-purple-500/50' 
      : 'bg-white/[0.05] text-gray-400 border-white/[0.08] hover:border-purple-500'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-md border font-medium transition-all ${colorClasses[color]} ${sizeClasses[size]}`}
    >
      {label}
    </button>
  );
}

interface FilterActionsProps {
  onSelectAll: () => void;
  onClearAll: () => void;
}

function FilterActions({ onSelectAll, onClearAll }: FilterActionsProps) {
  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={onSelectAll}
        className="text-[10px] text-cyan-400 hover:text-cyan-300"
      >
        تحديد الكل
      </button>
      <span className="text-gray-600">|</span>
      <button
        onClick={onClearAll}
        className="text-[10px] text-gray-400 hover:text-gray-300"
      >
        مسح
      </button>
    </div>
  );
}

export default DivergenceFilters;
