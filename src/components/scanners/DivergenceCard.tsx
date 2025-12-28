'use client';

/**
 * 🎴 Divergence Card Component - بطاقة الدايفرجنس
 * 
 * عرض معلومات الدايفرجنس بشكل احترافي مع شارت كامل
 * Professional divergence info display with full candlestick chart
 * 
 * @author Nexus Elite Team
 * @version 3.0.0
 * @created 2025-12-14
 * @updated 2025-12-14
 */

import React, { useMemo, useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  DivergenceResult,
  DIVERGENCE_TYPE_LABELS,
  DIRECTION_LABELS,
  INDICATOR_LABELS
} from '@/lib/scanners/advanced-divergence-detector';
import { DIVERGENCE_COLORS } from '@/lib/scanners/precision-drawing-engine';
import { DivergenceTradingChart as DivergenceChart } from './DivergenceTradingChart';
import { checkLifecycleStatus } from '@/lib/scanners/divergence-lifecycle';
import { getFreshnessState, getOccurrenceTimeMs } from '@/lib/scanners/freshness-policy';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface DivergenceCardProps {
  divergence: DivergenceResult;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onDownload: (divergence: DivergenceResult) => void;
  showMiniChart?: boolean;
  compact?: boolean;
  onExpand?: (divergence: DivergenceResult) => void; // New: للتوسيع في Modal
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function DivergenceCard({
  divergence,
  isFavorite,
  onToggleFavorite,
  onDownload,
  showMiniChart = true,
  compact = false,
  onExpand
}: DivergenceCardProps) {
  const [showChart, setShowChart] = useState(!compact);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSaveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        backgroundColor: '#040506',
      });
      
      const link = document.createElement('a');
      link.download = `divergence-${divergence.symbol}-${divergence.timeframe}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    }
  };
  
  // Get colors based on direction and type
  const color = useMemo(() => 
    DIVERGENCE_COLORS[divergence.direction][divergence.type],
    [divergence.direction, divergence.type]
  );
  
  // Format occurrence timestamp
  const formattedTime = useMemo(() => {
    const occ = getOccurrenceTimeMs(divergence) ?? divergence.timestamp;
    const date = new Date(occ);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [divergence]);
  
  // 🆕 حساب العمر بالشموع منذ حدوث النموذج (occurrence-based)
  const ageInfo = useMemo(() => {
    const freshness = getFreshnessState(divergence);
    const bars = freshness.barsSince ?? 0;
    const maxAge = freshness.freshLimit;

    let color = 'text-emerald-400';
    if (freshness.status === 'expired') color = 'text-red-400';
    else if (bars >= maxAge * 0.7) color = 'text-amber-400';

    return {
      text: `${bars}/${maxAge} شموع`,
      color,
      isExpired: freshness.status !== 'fresh'
    };
  }, [divergence]);
  
  // Calculate price change percentage
  const priceChangePercent = useMemo(() => {
    const change = ((divergence.endPoint.price - divergence.startPoint.price) / divergence.startPoint.price) * 100;
    return change.toFixed(2);
  }, [divergence]);
  
  // Calculate remaining candles (legacy display only)
  const lifecycleInfo = useMemo(() => {
    if (!divergence.totalCandlesAtDetection || !divergence.candles) {
      return null;
    }
    
    const currentCandleCount = divergence.candles.length;
    return checkLifecycleStatus(divergence, currentCandleCount);
  }, [divergence]);
  
  const freshness = useMemo(() => getFreshnessState(divergence), [divergence]);
  const isExpired = freshness.status !== 'fresh';
  
  if (compact) {
    return (
      <div 
        className="rounded-lg p-3 transition-all cursor-pointer animate-border-glow"
        style={{ 
          background: 'linear-gradient(90deg, #030508, #0d3b3b)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 0 15px rgba(255, 255, 255, 0.05)'
        }}
        onClick={() => onExpand?.(divergence)}
      >
        <div className="flex items-center justify-between">
          {/* Symbol and Exchange */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {divergence.symbol.replace('USDT', '')}
            </span>
            <span className="text-xs text-gray-500">{divergence.exchange}</span>
          </div>
          
          {/* Type Badge */}
          <div 
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ 
              backgroundColor: color + '20',
              color: color,
              borderLeft: `2px solid ${color}`
            }}
          >
            {DIVERGENCE_TYPE_LABELS[divergence.type].en} {divergence.direction === 'bullish' ? '↑' : '↓'}
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-400">{divergence.indicator}</span>
          <span className="text-gray-400">{divergence.timeframe}</span>
          <span 
            className="font-mono"
            style={{ color }}
          >
            {divergence.score}%
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={cardRef} 
      className={`rounded-xl overflow-hidden transition-all group ${
        isExpired ? 'opacity-40' : ''
      } animate-border-glow`}
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
              {divergence.symbol.replace('USDT', '')}
            </span>
            <span className="text-gray-500 text-[10px] ml-1">/USDT</span>
          </div>
          
          {/* Exchange Badge */}
          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-gray-400 capitalize">
            {divergence.exchange}
          </span>
          
          {/* Timeframe */}
          <span className="text-[10px] text-gray-500">{divergence.timeframe}</span>
          
          {/* Type Badge */}
          <span 
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ 
              backgroundColor: color + '20',
              color: color,
              borderLeft: `2px solid ${color}`
            }}
          >
            {divergence.type.toUpperCase()}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(divergence.id);
            }}
            className={`p-1 rounded-lg transition-all ${
              isFavorite 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'hover:bg-white/[0.05] text-gray-500 hover:text-yellow-400'
            }`}
            title={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <svg className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          
          <button
            onClick={handleSaveImage}
            className="p-1 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-cyan-400 transition-all"
            title="حفظ كصورة"
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
            title={showChart ? 'إخفاء الشارت' : 'إظهار الشارت'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showChart ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Professional Chart */}
      {showMiniChart && showChart && divergence.candles && divergence.indicatorValues && (
        <div className="border-b border-white/[0.08]">
          <DivergenceChart
            candles={divergence.candles}
            divergence={divergence}
            indicatorValues={divergence.indicatorValues}
            height={200}
            className="w-full"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="p-2.5 space-y-1.5">
        {/* Type Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div 
            className="px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1"
            style={{ 
              backgroundColor: color + '20',
              color: color,
              borderLeft: `2px solid ${color}`
            }}
          >
            <span>{DIVERGENCE_TYPE_LABELS[divergence.type].en}</span>
            <span>{DIRECTION_LABELS[divergence.direction].en}</span>
            <span className="text-sm">
              {divergence.direction === 'bullish' ? '↗' : '↘'}
            </span>
          </div>
          
          {/* Lifecycle Status Badge */}
          {isExpired && (
            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-medium border border-red-500/40">
              منتهي
            </span>
          )}
          
          {/* Remaining Candles Badge */}
          {lifecycleInfo && lifecycleInfo.status === 'active' && lifecycleInfo.candlesRemaining <= 3 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-medium border border-amber-500/40 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lifecycleInfo.candlesRemaining} شمعة متبقية
            </span>
          )}

          {/* Indicator Name */}
          <span className="px-1.5 py-0.5 rounded-[4px] bg-white/[0.05] text-[10px] text-gray-300 font-medium border border-white/[0.08]">
            {divergence.indicator}
          </span>
        </div>
        
        {/* Expand Button */}
        {onExpand && (
          <button
            onClick={() => onExpand(divergence)}
            className="w-full py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium transition-all border border-cyan-500/30"
          >
            📊 عرض الشارت الكامل
          </button>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px] text-gray-500">
          <div className="flex items-center gap-2">
            <span>{formattedTime}</span>
            <span className={`${ageInfo.color} font-medium`}>• منذ {ageInfo.text}</span>
          </div>
          <span className={`capitalize ${
            divergence.volumeProfile === 'increasing' ? 'text-emerald-500' :
            divergence.volumeProfile === 'decreasing' ? 'text-red-500' : ''
          }`}>
            الحجم: {divergence.volumeProfile === 'increasing' ? 'متزايد' : divergence.volumeProfile === 'decreasing' ? 'متناقص' : 'مستقر'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default DivergenceCard;
