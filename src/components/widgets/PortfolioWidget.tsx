'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.4 — PortfolioWidget
 * ═══════════════════════════════════════════════════════════════
 * Inline portfolio overview widget rendered inside chat messages.
 * Displays token holdings with allocation breakdown.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PortfolioHolding {
  symbol: string;
  name?: string;
  amount: number;
  valueUSD: number;
  change24h: number;
  /** Percentage of total portfolio */
  allocation?: number;
}

export interface PortfolioWidgetProps {
  holdings?: PortfolioHolding[];
  totalValueUSD?: number;
  totalChange24h?: number;
}

const COLORS = [
  'from-orange-400 to-yellow-500',
  'from-blue-400 to-cyan-500',
  'from-purple-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-red-400 to-orange-500',
  'from-indigo-400 to-blue-500',
];

export function PortfolioWidget({
  holdings = [],
  totalValueUSD,
  totalChange24h = 0,
}: PortfolioWidgetProps) {
  const total = totalValueUSD ?? holdings.reduce((sum, h) => sum + h.valueUSD, 0);
  const isPositive = totalChange24h >= 0;

  // Compute allocations if not provided
  const enrichedHoldings = useMemo(
    () =>
      holdings.map((h) => ({
        ...h,
        allocation: h.allocation ?? (total > 0 ? (h.valueUSD / total) * 100 : 0),
      })),
    [holdings, total]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-black/40 to-black/20',
        'backdrop-blur-xl border border-white/[0.08]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
        'w-full max-w-[360px] p-4'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white/70" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Portfolio</div>
            <div className="text-[11px] text-white/40">{enrichedHoldings.length} assets</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-semibold text-white">
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            className={cn(
              'flex items-center gap-0.5 text-[11px] font-medium justify-end',
              isPositive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{totalChange24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Allocation Bar */}
      {enrichedHoldings.length > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-4">
          {enrichedHoldings.map((h, i) => (
            <div
              key={h.symbol}
              className={cn('bg-gradient-to-r', COLORS[i % COLORS.length])}
              style={{ width: `${h.allocation}%` }}
              title={`${h.symbol}: ${h.allocation?.toFixed(1)}%`}
            />
          ))}
        </div>
      )}

      {/* Holdings List */}
      <div className="space-y-2">
        {enrichedHoldings.map((h, i) => (
          <div
            key={h.symbol}
            className="flex items-center justify-between py-1.5 px-1"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-[8px] font-bold text-white',
                  COLORS[i % COLORS.length]
                )}
              >
                {h.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{h.symbol}</div>
                <div className="text-[10px] text-white/40">
                  {h.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-white">
                ${h.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div
                className={cn(
                  'text-[10px]',
                  h.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {h.change24h >= 0 ? '+' : ''}{h.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {enrichedHoldings.length === 0 && (
        <div className="text-center py-4 text-white/30 text-xs">
          No holdings data available
        </div>
      )}
    </motion.div>
  );
}
