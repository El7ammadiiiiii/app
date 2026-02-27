'use client';

/**
 * 🎛️ Levels Scanner Filters - فلاتر ماسح المستويات
 * 
 * واجهة متقدمة لتصفية نتائج البحث
 * Advanced filtering interface for scan results
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2025-12-31
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LevelStatus,
  LEVEL_STATUS_LABELS,
  TIMEFRAME_LABELS,
} from '@/lib/scanners/levels-detector';
import {
  DEFAULT_EXCHANGES,
  DEFAULT_TIMEFRAMES,
} from '@/lib/scanners/levels-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface LevelsFilterState {
  status: LevelStatus;
  timeframe: string;
  exchange: string;
  searchQuery: string;
  showFavoritesOnly: boolean;
}

export const DEFAULT_LEVELS_FILTER: LevelsFilterState = {
  status: 'all',
  timeframe: '1h',
  exchange: 'bybit',
  searchQuery: '',
  showFavoritesOnly: false,
};

interface LevelsFiltersProps {
  filters: LevelsFilterState;
  onFiltersChange: (filters: LevelsFilterState) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  onRefresh: () => void;
  resultsCount: number;
  favoritesCount: number;
  lastUpdated: Date | null;
}

// ============================================================================
// 🏷️ LABELS
// ============================================================================

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Centralized',
  bybit: 'Bybit',
  okx: 'OKX',
  kucoin: 'KuCoin',
  mexc: 'MEXC',
  bitget: 'Bitget',
  gate: 'Gate.io',
  htx: 'HTX',
  bingx: 'BingX',
  phemex: 'Phemex',
  cryptocom: 'Crypto.com',
  kraken: 'Kraken',
  coinbase: 'Coinbase',
};

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function LevelsFilters({
  filters,
  onFiltersChange,
  isScanning,
  onStartScan,
  onStopScan,
  onRefresh,
  resultsCount,
  favoritesCount,
  lastUpdated,
}: LevelsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // تحديث فلتر
  const updateFilter = useCallback(<K extends keyof LevelsFilterState>(
    key: K,
    value: LevelsFilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  // تنسيق وقت آخر تحديث
  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="space-y-3">
      {/* الصف الأول: البحث وأزرار التحكم */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* البحث */}
        <div className="relative flex-1">
          <svg 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="البحث عن عملة..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm
                     bg-white/[0.03] border border-white/[0.08]
                     text-white placeholder:text-gray-500
                     focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05]
                     transition-all"
          />
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2">
          {/* زر الفلاتر */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
                      transition-all border ${
                        isExpanded 
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                          : 'bg-white/[0.03] border-white/[0.08] text-gray-300 hover:bg-white/[0.06]'
                      }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">فلاتر</span>
          </button>

          {/* زر المفضلة */}
          <button
            onClick={() => updateFilter('showFavoritesOnly', !filters.showFavoritesOnly)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
                      transition-all border ${
                        filters.showFavoritesOnly 
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                          : 'bg-white/[0.03] border-white/[0.08] text-gray-300 hover:bg-white/[0.06]'
                      }`}
          >
            <svg className="w-4 h-4" fill={filters.showFavoritesOnly ? 'currentColor' : 'none'} 
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {favoritesCount > 0 && (
              <span className="text-xs">{favoritesCount}</span>
            )}
          </button>

          {/* زر التحديث */}
          <button
            onClick={isScanning ? onStopScan : onRefresh}
            disabled={false}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
                      transition-all border ${
                        isScanning
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                      }`}
          >
            {isScanning ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="hidden sm:inline">إيقاف</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">تحديث</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* فلاتر موسعة */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
              {/* الحالة */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">الحالة</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(LEVEL_STATUS_LABELS) as LevelStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateFilter('status', status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filters.status === status
                          ? status === 'near_resistance' || status === 'broke_resistance'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : status === 'near_support' || status === 'broke_support'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-white/[0.03] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]'
                      }`}
                    >
                      {LEVEL_STATUS_LABELS[status].ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* الفريم */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">الإطار الزمني</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => updateFilter('timeframe', tf)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filters.timeframe === tf
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-white/[0.03] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]'
                      }`}
                    >
                      {TIMEFRAME_LABELS[tf]?.ar || tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* المنصة */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">المنصة</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_EXCHANGES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => updateFilter('exchange', ex)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filters.exchange === ex
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : 'bg-white/[0.03] text-gray-400 border border-white/[0.08] hover:bg-white/[0.06]'
                      }`}
                    >
                      {EXCHANGE_LABELS[ex] || ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط المعلومات */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-white font-medium">{resultsCount}</span> نتيجة
          </span>
          {filters.showFavoritesOnly && favoritesCount > 0 && (
            <span className="text-yellow-400">
              {favoritesCount} مفضلة
            </span>
          )}
        </div>
        {lastUpdated && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Updated {formatLastUpdated()}
          </span>
        )}
      </div>
    </div>
  );
}

export default LevelsFilters;
