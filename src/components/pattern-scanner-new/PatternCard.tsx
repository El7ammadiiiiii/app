'use client';

/**
 * 🎴 Pattern Card Component - بطاقة النمط الفني
 * 
 * نسخة مطابقة لبطاقة الدايفرجنس 100% بناءً على الصورة المرفقة
 * 
 * @author CCWAYS Team
 * @version 3.1.0
 */

import React, { useMemo } from 'react';
import
  {
    TrendingUp,
    TrendingDown,
    Minus,
    Clock,
    BarChart2,
    ShieldCheck,
    ShieldAlert
  } from 'lucide-react';
import { DetectedPattern } from './types';
import { PatternTradingChart } from './PatternTradingChart';

interface PatternCardProps
{
  pattern: DetectedPattern;
  onClick: ( pattern: DetectedPattern ) => void;
}

export default function PatternCard ( { pattern, onClick }: PatternCardProps )
{
  const isBullish = pattern.direction === 'bullish';
  const isBearish = pattern.direction === 'bearish';
  const color = isBullish ? '#22c55e' : isBearish ? '#ef4444' : '#3b82f6';
  const signalClass = useMemo( () =>
  {
    const key = isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral';
    return `pattern-signal-${ key }`;
  }, [ isBullish, isBearish ] );
  const signalStyle = useMemo( () =>
  {
    return `.${ signalClass }{background-color:${ color }15;color:${ color };border-left:3px solid ${ color };}`;
  }, [ signalClass, color ] );

  // Determine signal strength
  const isStrong = pattern.confidence >= 80;

  // Format time
  const formattedTime = useMemo( () =>
  {
    if ( !pattern.timestamp ) return '--:--';
    const date = new Date( pattern.timestamp );
    return date.toLocaleString( 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    } );
  }, [ pattern.timestamp ] );

  return (
    <div
      className="rounded-xl overflow-hidden transition-all group hover:scale-[1.02] duration-300 bg-[var(--bg-gradient-card)] border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
    >
      <style>{ signalStyle }</style>
      {/* Header - Top Icons & Info */ }
      <div className="px-2 md:px-3 py-1.5 md:py-2 border-b border-white/[0.08] flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-1 md:gap-2">
          <div
            className={ `px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${ isStrong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }` }
          >
            { isStrong ? <ShieldCheck className="w-2 md:w-2.5 h-2 md:h-2.5" /> : <ShieldAlert className="w-2 md:w-2.5 h-2 md:h-2.5" /> }
            <span className="hidden xs:inline">{ isStrong ? 'STRONG' : 'NORMAL' }</span>
            <span className="xs:hidden">{ isStrong ? 'S' : 'N' }</span>
          </div>

          <div className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] text-gray-400 font-medium">
            <span>{ pattern.timeframe || '1h' }</span>
            <span className="opacity-30">|</span>
            <span className="capitalize hidden xs:inline">{ pattern.exchange || 'Bybit' }</span>
          </div>

          {/* Pattern Name - Moved to Header as requested */ }
          <div className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] md:text-[10px] font-bold text-cyan-400">
            { pattern.name }
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs md:text-sm font-bold text-white">{ ( pattern.symbol || 'BTC' ).replace( 'USDT', '' ) }</span>
          <span className="text-[8px] md:text-[10px] text-gray-500">/USDT</span>
        </div>
      </div>

      {/* Mini Chart Area - Fixed height to prevent content cutoff */ }
      <div className="h-[220px] md:h-[260px] relative border-b border-white/[0.05]">
        { pattern.candles && pattern.candles.length > 0 ? (
          <PatternTradingChart
            candles={ pattern.candles }
            patterns={ [ pattern ] }
            height={ 260 }
            className="w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[10px] italic bg-[#223a37] rounded-lg">
            جاري تحميل البيانات...
          </div>
        ) }
        {/* تم حذف Overlay Pattern Name من هنا نهائياً لضمان عدم ظهوره داخل الشارت */ }
      </div>

      {/* Content & Actions */ }
      <div className="p-2 md:p-3 space-y-2 md:space-y-3">
        <div className="flex items-center justify-between">
          <div className="px-1 md:px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] md:text-[9px] text-gray-400 font-bold">
            Trendoscope®
          </div>

          <div
            className={ `px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-2 ${ signalClass }` }
          >
            { isBullish ? <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5" /> : isBearish ? <TrendingDown className="w-3 md:w-3.5 h-3 md:h-3.5" /> : <Minus className="w-3 md:w-3.5 h-3 md:h-3.5" /> }
            <span>{ isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral' }</span>
          </div>
        </div>

        {/* Full Chart Button */ }
        <button
          onClick={ () => onClick( pattern ) }
          className="w-full py-1.5 md:py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] md:text-xs font-bold transition-all border border-cyan-500/30 flex items-center justify-center gap-1 md:gap-2 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        >
          <BarChart2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
          عرض الشارت الكامل
        </button>

        {/* Footer Info */ }
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-[9px] text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-medium">الحجم: متزايد</span>
            <span className="opacity-30">•</span>
            <span className="text-amber-400/80 font-medium">منذ 8/10 شموع</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 opacity-40" />
            <span>{ formattedTime }</span>
          </div>
        </div>
      </div>
    </div>
  );
}
