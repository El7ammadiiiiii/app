'use client';

/**
 * 🎛️ Volume Scanner Filters - فلاتر ماسح الفوليوم
 * 
 * واجهة متقدمة لتصفية نتائج البحث
 * Advanced filtering interface for scan results
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2026-01-01
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VolumeStatus,
  VOLUME_STATUS_LABELS,
  TIMEFRAME_LABELS,
  DEFAULT_EXCHANGES,
  DEFAULT_TIMEFRAMES,
} from '@/lib/scanners/volume-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface VolumeFilterState {
  status: VolumeStatus;
  timeframe: string;
  exchange: string;
  searchQuery: string;
  showFavoritesOnly: boolean;
}

export const DEFAULT_VOLUME_FILTER: VolumeFilterState = {
  status: 'all',
  exchange: 'bybit',
  timeframe: '1h',
  searchQuery: '',
  showFavoritesOnly: false,
};

interface VolumeFiltersProps {
  filters: VolumeFilterState;
  onFiltersChange: (filters: VolumeFilterState) => void;
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

export function VolumeFilters({
  filters,
  onFiltersChange,
  isScanning,
  onStartScan,
  onStopScan,
  onRefresh,
  resultsCount,
  favoritesCount,
  lastUpdated,
}: VolumeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // تحديث فلتر
  const updateFilter = useCallback(<K extends keyof VolumeFilterState>(
    key: K,
    value: VolumeFilterState[K]
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
            <span>فلاتر</span>
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
            <svg className="w-4 h-4" fill={filters.showFavoritesOnly ? "currentColor" : "none"} 
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>{favoritesCount}</span>
          </button>

          {/* زر البدء/الإيقاف */}
          {isScanning ? (
            <button
              onClick={onStopScan}
              className="px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
                       bg-red-500/20 border border-red-500/50 text-red-400
                       hover:bg-red-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>إيقاف</span>
            </button>
          ) : (
            <button
              onClick={onStartScan}
              className="px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2
                       bg-gradient-to-r from-cyan-500 to-blue-500
                       text-white shadow-lg shadow-cyan-500/25
                       hover:shadow-cyan-500/40 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>مسح</span>
            </button>
          )}

          {/* زر التحديث */}
          <button
            onClick={onRefresh}
            disabled={isScanning}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]
                     text-gray-300 hover:bg-white/[0.06] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* الصف الثاني: الفلاتر الرئيسية */}
      <div className="flex flex-wrap gap-2">
        {/* فلتر المنصة */}
        <select
          value={filters.exchange}
          onChange={(e) => updateFilter('exchange', e.target.value)}
          className="px-4 py-2 rounded-xl text-sm bg-white/[0.03] border border-white/[0.08]
                   text-white focus:outline-none focus:border-cyan-500/50 transition-all
                   cursor-pointer"
        >
          {DEFAULT_EXCHANGES.map(ex => (
            <option key={ex} value={ex} className="bg-gray-900">
              {EXCHANGE_LABELS[ex] || ex}
            </option>
          ))}
        </select>

        {/* فلتر الإطار الزمني */}
        <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
          {DEFAULT_TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => updateFilter('timeframe', tf)}
              className={`px-3 py-2 text-sm font-medium transition-all ${
                filters.timeframe === tf
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {TIMEFRAME_LABELS[tf]?.en || tf}
            </button>
          ))}
        </div>

        {/* فلتر الحالة */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value as VolumeStatus)}
          className="px-4 py-2 rounded-xl text-sm bg-white/[0.03] border border-white/[0.08]
                   text-white focus:outline-none focus:border-cyan-500/50 transition-all
                   cursor-pointer"
        >
          {Object.entries(VOLUME_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-gray-900">
              {label.ar}
            </option>
          ))}
        </select>

        {/* عداد النتائج */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <span className="text-gray-400 text-sm">النتائج:</span>
          <span className="text-cyan-400 font-bold">{resultsCount}</span>
        </div>

        {/* وقت آخر تحديث */}
        {lastUpdated && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-400 text-sm">{formatLastUpdated()}</span>
          </div>
        )}
      </div>

      {/* فلاتر متقدمة */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
              <h4 className="text-sm font-medium text-gray-300">إعدادات متقدمة</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* الحد الأدنى للفوليوم */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">الحد الأدنى للفوليوم ($)</label>
                  <input
                    type="number"
                    defaultValue={100000}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08]
                             text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* عتبة Volume Ratio */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">عتبة نسبة الفوليوم</label>
                  <input
                    type="number"
                    defaultValue={2.0}
                    step={0.1}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08]
                             text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* عتبة Z-Score */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">عتبة Z-Score</label>
                  <input
                    type="number"
                    defaultValue={2.0}
                    step={0.1}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08]
                             text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* فترة المقارنة */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">فترة المقارنة</label>
                  <select
                    defaultValue={20}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08]
                             text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value={10} className="bg-gray-900">10 شموع</option>
                    <option value={20} className="bg-gray-900">20 شمعة</option>
                    <option value={50} className="bg-gray-900">50 شمعة</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
