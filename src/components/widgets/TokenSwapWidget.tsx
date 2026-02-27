'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.4 — TokenSwapWidget
 * ═══════════════════════════════════════════════════════════════
 * Inline token swap interface rendered inside chat messages.
 * Allows user to preview swap parameters (not execute — display only).
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TokenSwapWidgetProps {
  fromToken?: string;
  toToken?: string;
  fromAmount?: number;
  toAmount?: number;
  exchangeRate?: number;
  /** Slippage tolerance % */
  slippage?: number;
  /** If true, shows "connect wallet" instead of swap */
  requiresWallet?: boolean;
}

const POPULAR_TOKENS = ['ETH', 'BTC', 'USDT', 'USDC', 'SOL', 'BNB', 'ARB', 'OP'];

export function TokenSwapWidget({
  fromToken = 'ETH',
  toToken = 'USDT',
  fromAmount = 1,
  toAmount,
  exchangeRate,
  slippage = 0.5,
  requiresWallet = true,
}: TokenSwapWidgetProps) {
  const [from, setFrom] = useState({ token: fromToken, amount: fromAmount });
  const [to, setTo] = useState({ token: toToken, amount: toAmount ?? 0 });
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const rate = exchangeRate ?? (to.amount && from.amount ? to.amount / from.amount : 0);

  const handleSwapDirection = useCallback(() => {
    setFrom((prev) => ({ token: to.token, amount: to.amount }));
    setTo((prev) => ({ token: from.token, amount: from.amount }));
  }, [from, to]);

  const TokenSelector = ({
    selected,
    onSelect,
    show,
    setShow,
  }: {
    selected: string;
    onSelect: (t: string) => void;
    show: boolean;
    setShow: (v: boolean) => void;
  }) => (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg',
          'bg-white/[0.08] hover:bg-white/[0.12] transition-colors',
          'text-sm font-semibold text-white'
        )}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white">
          {selected.slice(0, 2)}
        </div>
        {selected}
        <ChevronDown className="w-3 h-3 text-white/50" />
      </button>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'absolute top-full mt-1 left-0 z-10',
            'bg-black/90 backdrop-blur-xl border border-white/[0.1] rounded-xl',
            'p-1 min-w-[120px] shadow-xl'
          )}
        >
          {POPULAR_TOKENS.filter((t) => t !== selected).map((token) => (
            <button
              key={token}
              onClick={() => {
                onSelect(token);
                setShow(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              {token}
            </button>
          ))}
        </motion.div>
      )}
    </div>
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
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Token Swap</span>
        <div className="flex items-center gap-1 text-[11px] text-white/40">
          <Info className="w-3 h-3" />
          Slippage: {slippage}%
        </div>
      </div>

      {/* From */}
      <div className="bg-white/[0.04] rounded-xl p-3 mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-white/40">From</span>
        </div>
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={from.amount}
            onChange={(e) => setFrom((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
            className="bg-transparent text-lg font-mono font-semibold text-white w-[140px] outline-none"
            placeholder="0.0"
          />
          <TokenSelector
            selected={from.token}
            onSelect={(t) => setFrom((p) => ({ ...p, token: t }))}
            show={showFromDropdown}
            setShow={setShowFromDropdown}
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-2 relative z-[2]">
        <button
          onClick={handleSwapDirection}
          className={cn(
            'w-8 h-8 rounded-full',
            'bg-white/[0.08] border border-white/[0.12]',
            'flex items-center justify-center',
            'hover:bg-white/[0.15] transition-colors'
          )}
        >
          <ArrowDownUp className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>

      {/* To */}
      <div className="bg-white/[0.04] rounded-xl p-3 mt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-white/40">To (estimated)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-mono font-semibold text-white/70">
            {to.amount ? to.amount.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '0.0'}
          </span>
          <TokenSelector
            selected={to.token}
            onSelect={(t) => setTo((p) => ({ ...p, token: t }))}
            show={showToDropdown}
            setShow={setShowToDropdown}
          />
        </div>
      </div>

      {/* Rate info */}
      {rate > 0 && (
        <div className="mt-2 px-1 text-[11px] text-white/30">
          1 {from.token} ≈ {rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {to.token}
        </div>
      )}

      {/* Action button */}
      <button
        className={cn(
          'w-full mt-3 py-2.5 rounded-xl text-sm font-semibold',
          'bg-gradient-to-r from-blue-500 to-purple-500',
          'text-white hover:opacity-90 transition-opacity',
          'disabled:opacity-40'
        )}
        disabled
      >
        {requiresWallet ? 'Connect Wallet' : 'Preview Swap'}
      </button>
    </motion.div>
  );
}
