"use client";

import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { PatternResult } from '../../types/patterns';
import { Target, Shield, Maximize2 } from 'lucide-react';
import PatternChart from './PatternChart';
import TradingViewChart from './TradingViewChart';

interface PatternCardProps {
  pattern: PatternResult;
  symbol: string;
  timeframe: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ohlcvData?: any[];
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onExpand?: (pattern: PatternResult) => void;
}

// Pattern type colors
const PATTERN_COLORS = {
  bullish: '#10b981',
  bearish: '#ef4444',
  neutral: '#eab308'
};

export default function PatternCard({ 
  pattern, 
  symbol, 
  timeframe, 
  ohlcvData,
  isFavorite = false,
  onToggleFavorite,
  onExpand
}: PatternCardProps) {
  const [showChart, setShowChart] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get color based on pattern type
  const color = useMemo(() => PATTERN_COLORS[pattern.type] || PATTERN_COLORS.neutral, [pattern.type]);

  const displaySymbol = useMemo(() => {
    if (!symbol) return '';
    if (symbol.includes('/')) return symbol.toUpperCase();
    if (symbol.toUpperCase().endsWith('USDT')) {
      const base = symbol.toUpperCase().replace(/USDT$/i, '');
      return `${base}/USDT`;
    }
    return symbol.toUpperCase();
  }, [symbol]);

  // Handle save as image
  const handleSaveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        backgroundColor: '#040506',
      });
      
      const link = document.createElement('a');
      link.download = `pattern-${symbol}-${timeframe}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    }
  };

  // Get confidence bar color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#10b981';
    if (confidence >= 65) return '#eab308';
    return '#ef4444';
  };

  return (
    <div 
      ref={cardRef} 
      className="rounded-xl overflow-hidden transition-all group animate-border-glow relative"
      style={{ 
        background: 'linear-gradient(90deg, #030508, #0d3b3b)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 15px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Symbol */}
          <div>
            <span className="text-sm font-bold text-white">
              {displaySymbol}
            </span>
          </div>
          
          {/* Timeframe */}
          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-gray-400 uppercase">
            {timeframe}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-gray-400 uppercase">
            Binance
          </span>
          
          {/* Pattern Type Badge */}
          <span 
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ 
              backgroundColor: color + '20',
              color: color,
              borderLeft: `2px solid ${color}`
            }}
          >
            {pattern.type.toUpperCase()}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(`${symbol}-${timeframe}-${pattern.name}`);
              }}
              className={`p-1 rounded-lg transition-all ${
                isFavorite 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'hover:bg-white/[0.05] text-gray-500 hover:text-yellow-400'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          
          <button
            onClick={handleSaveImage}
            className="p-1 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-cyan-400 transition-all"
            title="Save as image"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChart(!showChart);
            }}
            className="p-1 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition-all"
            title={showChart ? 'Hide chart' : 'Show chart'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showChart ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Pattern Info Bar */}
      <div className="px-2.5 py-1.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Pattern Name */}
          <span className="text-sm font-semibold text-white">{pattern.name}</span>
          
          {/* Category */}
          <span className="px-1.5 py-0.5 rounded-[4px] bg-white/[0.05] text-[10px] text-gray-300 font-medium border border-white/[0.08] capitalize">
            {pattern.category.replace('_', ' ')}
          </span>
          
          {/* Strength Badge */}
          <span 
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
            style={{ 
              backgroundColor: pattern.strength === 'strong' ? '#10b98120' : pattern.strength === 'medium' ? '#eab30820' : '#ef444420',
              color: pattern.strength === 'strong' ? '#10b981' : pattern.strength === 'medium' ? '#eab308' : '#ef4444',
            }}
          >
            {pattern.strength}
          </span>
        </div>
        
        {/* Confidence Score */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pattern.confidence}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: getConfidenceColor(pattern.confidence) }}
            />
          </div>
          <span 
            className="text-xs font-bold"
            style={{ color: getConfidenceColor(pattern.confidence) }}
          >
            {pattern.confidence.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Chart */}
      {showChart && ohlcvData && (
        <div className="border-b border-white/[0.08] relative group/chart">
          <PatternChart 
            pattern={pattern}
            symbol={symbol}
            timeframe={timeframe}
            ohlcvData={ohlcvData}
          />
          {/* Fullscreen button */}
          <button
            onClick={() => setFullscreenChart(true)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-gray-400 hover:text-white opacity-0 group-hover/chart:opacity-100 transition-all"
            title="Fullscreen Chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Fullscreen Chart Modal */}
      {fullscreenChart && ohlcvData && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full h-full">
            <TradingViewChart
              pattern={pattern}
              symbol={symbol}
              timeframe={timeframe}
              ohlcvData={ohlcvData}
              showPatternOverlay={true}
              onClose={() => setFullscreenChart(false)}
            />
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="p-2.5 space-y-2">
        {/* Scores Grid */}
        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05] text-center">
            <div className="text-gray-500">Line</div>
            <div className="text-white font-semibold">{pattern.scores?.line_quality || 0}</div>
          </div>
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05] text-center">
            <div className="text-gray-500">Geo</div>
            <div className="text-white font-semibold">{pattern.scores?.geometric || 0}</div>
          </div>
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05] text-center">
            <div className="text-gray-500">Vol</div>
            <div className="text-white font-semibold">{pattern.scores?.volume || 0}</div>
          </div>
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05] text-center">
            <div className="text-gray-500">Pos</div>
            <div className="text-white font-semibold">{pattern.scores?.position || 0}</div>
          </div>
        </div>
        
        {/* Targets */}
        {(pattern.breakout_target || pattern.stop_loss) && (
          <div className="flex items-center justify-between text-[11px] p-2 rounded bg-white/[0.03] border border-white/[0.05]">
            {pattern.breakout_target && (
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-green-400" />
                <span className="text-gray-400">Target:</span>
                <span className="font-mono font-semibold text-green-400">
                  ${pattern.breakout_target.toFixed(4)}
                </span>
              </div>
            )}
            {pattern.stop_loss && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-red-400" />
                <span className="text-gray-400">SL:</span>
                <span className="font-mono font-semibold text-red-400">
                  ${pattern.stop_loss.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Expand Button */}
        {onExpand && (
          <button
            onClick={() => onExpand(pattern)}
            className="w-full py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium transition-all border border-cyan-500/30"
          >
            📊 View Full Chart
          </button>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px] text-gray-500">
          <span>Formation: {pattern.formation_time} bars</span>
          <span 
            className="font-medium"
            style={{ color }}
          >
            {pattern.type === 'bullish' ? '↗ Bullish' : pattern.type === 'bearish' ? '↘ Bearish' : '→ Neutral'}
          </span>
        </div>
      </div>
    </div>
  );
}
