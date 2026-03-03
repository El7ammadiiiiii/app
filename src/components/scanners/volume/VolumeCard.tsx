'use client';

/**
 * 📊 Volume Card - بطاقة نتيجة الفوليوم
 * نسخة مطورة تدعم العرض المدمج والشارت التفاعلي
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import
  {
    VolumeResult,
    SignalStrength,
    SIGNAL_COLORS,
    formatVolume,
    formatUSD,
    formatPercent,
  } from '@/lib/scanners/volume-scanner';
import { VolumeTradingChart } from './VolumeTradingChart';

interface VolumeCardProps
{
  result: VolumeResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onViewChart: () => void;
  onSetAlert: ( result: VolumeResult ) => void;
  compact?: boolean;
}

const SIGNAL_LABELS: Record<SignalStrength, { ar: string; emoji: string }> = {
  EXTREME: { ar: 'استثنائي', emoji: '🔴' },
  VERY_HIGH: { ar: 'مرتفع جداً', emoji: '🟠' },
  HIGH: { ar: 'مرتفع', emoji: '🟡' },
  MODERATE: { ar: 'متوسط', emoji: '🟢' },
};

export function VolumeCard ( {
  result,
  isFavorite,
  onToggleFavorite,
  onViewChart,
  onSetAlert,
  compact = false,
}: VolumeCardProps )
{
  const { symbol, exchange, timeframe, signalStrength, metrics, advanced, candles } = result;
  const [ showChart, setShowChart ] = useState( !compact );

  const color = SIGNAL_COLORS[ signalStrength ];
  const priceChangeColor = metrics.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400';
  const signalBadgeClass = `volume-signal-${ String(signalStrength).toLowerCase() }`;

  if ( compact )
  {
    return (
      <div
        className="rounded-lg p-3 transition-all cursor-pointer bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]"
        onClick={ onViewChart }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{ symbol.replace( 'USDT', '' ) }</span>
            <span className="text-[10px] text-gray-500">{ exchange }</span>
          </div>
          <div
            className={ `px-2 py-0.5 rounded text-[10px] font-medium ${ signalBadgeClass }` }
          >
            { SIGNAL_LABELS[ signalStrength ].ar }
          </div>
          <style>{ `.${ signalBadgeClass }{background-color:${ color }20;color:${ color };border-left:2px solid ${ color };}` }</style>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px]">
          <span className="text-gray-400">{ timeframe }</span>
          <span className={ priceChangeColor }>{ formatPercent( metrics.priceChange24h ) }</span>
          <span className="font-mono text-cyan-400">{ metrics.volumeRatio.toFixed( 1 ) }x</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={ { opacity: 0, y: 20 } }
      animate={ { opacity: 1, y: 0 } }
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] hover:border-white/[0.15] transition-all group"
    >
      {/* Header */ }
      <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{ symbol }</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-gray-400 uppercase">{ exchange }</span>
          <span className="text-[10px] text-gray-500">{ timeframe }</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={ isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة' }
            title={ isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة' }
            onClick={ ( e ) => { e.stopPropagation(); onToggleFavorite(); } }
            className={ `p-1 rounded-lg transition-all ${ isFavorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400' }` }
          >
            <svg className="w-3.5 h-3.5" fill={ isFavorite ? "currentColor" : "none" } viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={ showChart ? 'إخفاء الشارت' : 'عرض الشارت' }
            title={ showChart ? 'إخفاء الشارت' : 'عرض الشارت' }
            onClick={ ( e ) => { e.stopPropagation(); setShowChart( !showChart ); } }
            className="p-1 rounded-lg text-gray-500 hover:text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart */ }
      { showChart && candles && (
        <div className="border-b border-white/[0.08] bg-black/40">
          <VolumeTradingChart candles={ candles } symbol={ symbol } height={ 150 } />
        </div>
      ) }

      {/* Stats */ }
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">
              ${ ( metrics.currentPrice || 0 ).toFixed( ( metrics.currentPrice || 0 ) < 1 ? 6 : 2 ) }
            </span>
            <span className={ `text-xs font-medium ${ priceChangeColor }` }>{ formatPercent( metrics.priceChange24h || 0 ) }</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase">Volume Ratio</div>
            <div className="text-lg font-bold text-cyan-400">{ metrics.volumeRatio.toFixed( 2 ) }x</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="text-[9px] text-gray-500 uppercase mb-1">Z-Score</div>
            <div className={ `text-sm font-bold ${ metrics.zScore > 2 ? 'text-orange-400' : 'text-white' }` }>{ metrics.zScore.toFixed( 2 ) }</div>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="text-[9px] text-gray-500 uppercase mb-1">24h Volume</div>
            <div className="text-sm font-bold text-white">{ formatVolume( metrics.volumeUSD ) }</div>
          </div>
        </div>

        <button
          onClick={ onViewChart }
          className="w-full py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold transition-all border border-cyan-500/30"
        >
          📊 عرض الشارت الكامل
        </button>
      </div>
    </motion.div>
  );
}
