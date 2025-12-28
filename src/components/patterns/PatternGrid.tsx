"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PatternResult } from '@/types/patterns';
import PatternCard from './PatternCard';
import { Loader2 } from 'lucide-react';

interface PatternGridProps {
  patterns: PatternResult[];
  loading: boolean;
  symbol: string;
  timeframe: string;
  ohlcvData?: any[];
  ohlcvMap?: Record<string, any[]>;
}

export default function PatternGrid({ patterns, loading, symbol, timeframe, ohlcvData, ohlcvMap }: PatternGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-400">Scanning {symbol} for patterns...</p>
        </div>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="text-6xl">📊</div>
          <p className="text-xl text-gray-400">No patterns detected</p>
          <p className="text-sm text-gray-500">
            Try adjusting filters or scan a different symbol
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {patterns.map((pattern, index) => (
          <motion.div
            key={`${pattern.name}-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
          >
            <PatternCard 
              pattern={pattern}
              symbol={pattern.symbol || symbol}
              timeframe={pattern.timeframe || timeframe}
              ohlcvData={ohlcvMap?.[`${pattern.symbol || symbol}-${pattern.timeframe || timeframe}`] || ohlcvData}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
