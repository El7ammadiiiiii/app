'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.4 — PriceChartWidget
 * ═══════════════════════════════════════════════════════════════
 * Interactive crypto price chart widget rendered inline in chat.
 * Displays candlestick/line chart for a given token.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PriceChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceChartWidgetProps {
  symbol: string;
  data?: PriceChartData[];
  currentPrice?: number;
  change24h?: number;
  /** Chart mode */
  chartType?: 'line' | 'candlestick';
}

const TIMEFRAMES = ['1H', '24H', '7D', '30D', '1Y'] as const;

export function PriceChartWidget({
  symbol,
  data = [],
  currentPrice,
  change24h = 0,
  chartType = 'line',
}: PriceChartWidgetProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<string>('24H');
  const isPositive = change24h >= 0;

  // Generate demo sparkline path from data or fallback
  const sparklinePath = useMemo(() => {
    if (data.length === 0) {
      // Generate a demo sine wave
      const points = Array.from({ length: 48 }, (_, i) => {
        const x = (i / 47) * 280;
        const y = 40 + Math.sin(i * 0.3) * 20 + Math.random() * 8;
        return `${x},${y}`;
      });
      return `M${points.join(' L')}`;
    }

    const prices = data.map((d) => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * 280;
      const y = 70 - ((p - min) / range) * 60;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  }, [data]);

  const formatPrice = (price?: number) => {
    if (!price) return '—';
    return price >= 1
      ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${price.toFixed(6)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-black/40 to-black/20',
        'backdrop-blur-xl border border-white/[0.08]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
        'w-full max-w-[360px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-black">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{symbol}</div>
            <div className="text-[11px] text-white/50">Price Chart</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono font-semibold text-white">
            {formatPrice(currentPrice)}
          </div>
          <div
            className={cn(
              'flex items-center gap-0.5 text-[11px] font-medium',
              isPositive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="px-3 py-1">
        <svg viewBox="0 0 280 80" className="w-full h-20">
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#34d399' : '#f87171'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#34d399' : '#f87171'} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={`${sparklinePath} L280,80 L0,80 Z`}
            fill={`url(#grad-${symbol})`}
          />
          {/* Line */}
          <path
            d={sparklinePath}
            fill="none"
            stroke={isPositive ? '#34d399' : '#f87171'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center justify-center gap-1 px-3 pb-3 pt-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setActiveTimeframe(tf)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
              activeTimeframe === tf
                ? 'bg-white/[0.12] text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
            )}
          >
            {tf}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
