'use client';

/**
 * 🔍 Pattern Chart Modal - مودال عرض الشارت المتقدم للأنماط
 * 
 * نسخة مطابقة لمودال الدايفرجنس مع إضافة تفاصيل الأنماط الفنية
 * 
 * @author CCWAYS Team
 * @version 2.0.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Activity, Target, BarChart3, BarChart2, Zap, Waves } from 'lucide-react';
import { DetectedPattern, OHLCV } from './types';
import { PatternTradingChart } from './PatternTradingChart';

interface PatternModalProps
{
  pattern: DetectedPattern | null;
  candles: OHLCV[];
  onClose: () => void;
}

export default function PatternModal ( { pattern, candles, onClose }: PatternModalProps )
{
  const [ showVolume, setShowVolume ] = useState( true );
  const [ showRSI, setShowRSI ] = useState( false );
  const [ showMACD, setShowMACD ] = useState( false );
  const modalRef = useRef<HTMLDivElement>( null );

  // Close on ESC key + prevent body scroll + cleanup
  useEffect( () =>
  {
    if ( !pattern ) return;

    const handleEsc = ( e: KeyboardEvent ) =>
    {
      if ( e.key === 'Escape' ) onClose();
    };

    window.addEventListener( 'keydown', handleEsc );
    document.body.style.overflow = 'hidden';

    return () =>
    {
      window.removeEventListener( 'keydown', handleEsc );
      document.body.style.overflow = 'unset';
    };
  }, [ pattern, onClose ] );

  if ( !pattern ) return null;

  const isBullish = pattern.direction === 'bullish';
  const isBearish = pattern.direction === 'bearish';
  const COLOR_CLASSES = {
    bullish: { bg: 'bg-[#22c55e]/20', text: 'text-[#22c55e]' },
    bearish: { bg: 'bg-[#ef4444]/20', text: 'text-[#ef4444]' },
    neutral: { bg: 'bg-[#3b82f6]/20', text: 'text-[#3b82f6]' },
  };
  const colorClass = isBullish ? COLOR_CLASSES.bullish : isBearish ? COLOR_CLASSES.bearish : COLOR_CLASSES.neutral;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={ onClose }
    >
      <div
        className="relative w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-[var(--bg-gradient-card)] border border-white/[0.08] max-h-[90vh]"
        onClick={ ( e ) => e.stopPropagation() }
      >
        {/* Header */ }
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={ `p-2 md:p-3 rounded-xl ${ colorClass.bg } ${ colorClass.text }` }>
              { isBullish ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6" /> :
                isBearish ? <TrendingDown className="w-5 h-5 md:w-6 md:h-6" /> :
                  <Minus className="w-5 h-5 md:w-6 md:h-6" /> }
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">{ pattern.name }</h2>
              <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest">المستوى { pattern.level }</span>
                <span className="text-gray-600">•</span>
                <span className="text-[10px] md:text-xs text-cyan-400 font-mono">{ pattern.confidence.toFixed( 1 ) }% دقة</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={ onClose }
            aria-label="Close pattern modal"
            className="p-1.5 md:p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Chart Content */ }
        <div ref={ modalRef } className="flex-1 min-h-[400px] md:min-h-[550px] bg-black/20 relative group/chart">
          <PatternTradingChart
            candles={ candles }
            patterns={ [ pattern ] }
            height={ undefined } // Fill container
            className="w-full h-full"
            showVolume={ showVolume }
            showRSI={ showRSI }
            showMACD={ showMACD }
            showTimeline={ true }
          />

          {/* Floating Indicator Controls - Desktop */ }
          <div className="absolute top-4 left-4 hidden md:flex flex-col gap-2 z-20 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300">
            <div className="p-1.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col gap-1 shadow-2xl">
              <button
                onClick={ () => { setShowVolume( !showVolume ); setShowRSI( false ); setShowMACD( false ); } }
                className={ `p-2.5 rounded-lg transition-all flex items-center gap-3 group/btn ${ showVolume ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5' }` }
              >
                <BarChart2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider pr-2">Volume</span>
              </button>
              <button
                onClick={ () => { setShowRSI( !showRSI ); setShowVolume( false ); setShowMACD( false ); } }
                className={ `p-2.5 rounded-lg transition-all flex items-center gap-3 group/btn ${ showRSI ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-white/5' }` }
              >
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider pr-2">RSI Index</span>
              </button>
              <button
                onClick={ () => { setShowMACD( !showMACD ); setShowVolume( false ); setShowRSI( false ); } }
                className={ `p-2.5 rounded-lg transition-all flex items-center gap-3 group/btn ${ showMACD ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:bg-white/5' }` }
              >
                <Waves className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider pr-2">MACD Trend</span>
              </button>
            </div>
          </div>
        </div>

        {/* Indicator Toolbar - Mobile Friendly (Premium Style) */ }
        <div className="px-4 py-3 border-t border-white/[0.08] bg-white/10 backdrop-blur-2xl flex items-center justify-around md:hidden">
          <button
            onClick={ () => { setShowVolume( !showVolume ); setShowRSI( false ); setShowMACD( false ); } }
            className={ `flex flex-col items-center gap-1 transition-all ${ showVolume ? 'text-cyan-400 scale-110' : 'text-gray-500' }` }
          >
            <div className={ `p-2 rounded-xl border ${ showVolume ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-white/5 border-white/10' }` }>
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">Volume</span>
          </button>
          <button
            onClick={ () => { setShowRSI( !showRSI ); setShowVolume( false ); setShowMACD( false ); } }
            className={ `flex flex-col items-center gap-1 transition-all ${ showRSI ? 'text-purple-400 scale-110' : 'text-gray-500' }` }
          >
            <div className={ `p-2 rounded-xl border ${ showRSI ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/10' }` }>
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">RSI</span>
          </button>
          <button
            onClick={ () => { setShowMACD( !showMACD ); setShowVolume( false ); setShowRSI( false ); } }
            className={ `flex flex-col items-center gap-1 transition-all ${ showMACD ? 'text-amber-400 scale-110' : 'text-gray-500' }` }
          >
            <div className={ `p-2 rounded-xl border ${ showMACD ? 'bg-amber-500/20 border-amber-500/50' : 'bg-white/5 border-white/10' }` }>
              <Waves className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">MACD</span>
          </button>
        </div>

        {/* Stats Footer */ }
        <div className="px-4 md:px-6 py-4 md:py-6 border-t border-white/[0.08] bg-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10 text-center flex sm:flex-col items-center sm:justify-center justify-between px-4 sm:px-0">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] uppercase tracking-wider sm:mb-1">
                <Activity className="w-3 h-3" />
                <span>قوة الإشارة</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-cyan-400">{ pattern.confidence.toFixed( 1 ) }%</div>
            </div>

            <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10 text-center flex sm:flex-col items-center sm:justify-center justify-between px-4 sm:px-0">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] uppercase tracking-wider sm:mb-1">
                <Target className="w-3 h-3" />
                <span>النقاط المحورية</span>
              </div>
              <div className="text-lg md:text-xl font-bold text-white">{ pattern.pivots.length }</div>
            </div>

            <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10 text-center flex sm:flex-col items-center sm:justify-center justify-between px-4 sm:px-0">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] uppercase tracking-wider sm:mb-1">
                <BarChart3 className="w-3 h-3" />
                <span>الاتجاه المتوقع</span>
              </div>
              <div className={ `text-lg md:text-xl font-bold ${ colorClass.text }` }>
                { isBullish ? 'صاعد' : isBearish ? 'هابط' : 'عرضي' }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
