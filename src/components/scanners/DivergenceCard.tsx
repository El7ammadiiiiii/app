'use client';

/**
 * 🎴 Divergence Card Component - Redesigned
 * 
 * عرض معلومات الدايفرجنس بشكل احترافي مع شارت كامل
 * Professional divergence info display with full candlestick chart
 * 
 * @author CCWAYS Team
 * @version 5.0.0
 * @updated 2026-02-04
 */

import React, { useMemo, useState, useRef } from 'react';
import
  {
    DivergenceResult,
  } from '@/lib/scanners/advanced-divergence-detector';
import { DivergenceTradingChart as DivergenceChart } from './DivergenceTradingChart';
import { getFreshnessState } from '@/lib/scanners/freshness-policy';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface DivergenceCardProps
{
  divergence: DivergenceResult;
  isFavorite: boolean;
  onToggleFavorite: ( id: string ) => void;
  onDownload: ( divergence: DivergenceResult ) => void;
  showMiniChart?: boolean;
  compact?: boolean; // Prop kept for compatibility but ignored in design
  onExpand?: ( divergence: DivergenceResult ) => void;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function DivergenceCard ( {
  divergence,
  isFavorite,
  onToggleFavorite,
  onDownload,
  showMiniChart = true,
  onExpand
}: DivergenceCardProps )
{
  const [ showChart, setShowChart ] = useState( true );
  const cardRef = useRef<HTMLDivElement>( null );

  const handleSaveImage = async ( e: React.MouseEvent ) =>
  {
    e.stopPropagation();
    if ( !cardRef.current ) return;

    try
    {
      // Dynamic import to avoid SSR/Turbopack issues
      const { toPng } = await import( 'html-to-image' );

      const dataUrl = await toPng( cardRef.current, {
        quality: 1.0,
        backgroundColor: '#1d2b28', // Match gradient middle color
      } );

      const link = document.createElement( 'a' );
      link.download = `divergence-${ divergence.symbol }-${ divergence.timeframe }-${ Date.now() }.png`;
      link.href = dataUrl;
      link.click();
    } catch ( err )
    {
      console.error( 'Failed to save image:', err );
    }
  };

  // Age info (candles since occurrence)
  const ageInfo = useMemo( () =>
  {
    const freshness = getFreshnessState( divergence );
    const bars = freshness.barsSince ?? 0;
    const maxAge = freshness.freshLimit;

    return {
      text: `${ bars }/${ maxAge }`,
      isExpired: freshness.status !== 'fresh'
    };
  }, [ divergence ] );

  const isExpired = ageInfo.isExpired;

  // Colors - إطار البطاقة متدرج مثل الخلفية، داخل البطاقة #2a4f4a
  const INNER_BG = 'bg-[#2a4f4a]';

  return (
    <div
      ref={ cardRef }
      className={ `rounded-lg overflow-hidden flex flex-col relative transition-opacity duration-300 ${ isExpired ? 'opacity-60' : 'opacity-100' }` }
      style={ {
        background: 'linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)',
        // إضاءة فاخرة على الجانب الأيسر والأسفل
        boxShadow: `
          -4px 0 20px rgba(74, 222, 200, 0.25),
          0 4px 20px rgba(74, 222, 200, 0.2),
          -2px 2px 30px rgba(74, 222, 200, 0.15),
          inset -1px -1px 0 rgba(255, 255, 255, 0.1),
          0 0 40px rgba(74, 222, 200, 0.08)
        `,
        borderLeft: '1px solid rgba(74, 222, 200, 0.35)',
        borderBottom: '1px solid rgba(74, 222, 200, 0.3)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      } }
    >
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-3 py-2 flex items-start justify-between">
        {/* Left Side: Symbol Info */ }
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold text-sm leading-none">
              { divergence.symbol.replace( 'USDT', '' ) }
            </span>
            <span className="text-gray-400 text-[10px] font-medium leading-none">
              /USDT
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="capitalize">{ divergence.exchange }</span>
            <span className="w-0.5 h-2 bg-gray-600/50 rounded-full"></span>
            <span className="font-mono">{ divergence.timeframe }</span>
          </div>
        </div>

        {/* Right Side: Actions & Badge */ }
        <div className="flex flex-col items-end gap-2">
          <span className={ `text-[10px] font-black tracking-widest uppercase ${ divergence.type === 'hidden' ? 'text-gray-500' : 'text-amber-500' }` }>
            { divergence.type === 'hidden' ? 'HIDDEN' : 'REGULAR' }
          </span>

          <div className="flex items-center gap-1.5">
            {/* Save Image */ }
            <button
              onClick={ handleSaveImage }
              className="text-gray-500 hover:text-white transition-colors p-0.5"
              title="Save Image"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Favorite */ }
            <button
              onClick={ ( e ) => { e.stopPropagation(); onToggleFavorite( divergence.id ) } }
              className={ `transition-colors p-0.5 ${ isFavorite ? 'text-yellow-400' : 'text-gray-500 hover:text-white' }` }
              title="Toggle Favorite"
            >
              <svg className="w-3.5 h-3.5" fill={ isFavorite ? "currentColor" : "none" } viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* Hide Chart Toggle */ }
            <button
              onClick={ ( e ) => { e.stopPropagation(); setShowChart( !showChart ); } }
              className="text-gray-500 hover:text-white transition-colors p-0.5"
              title={ showChart ? "Collapse" : "Expand" }
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d={ showChart ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7" } />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BODY (Inner Card)
      ═══════════════════════════════════════════════════════════════════ */}
      { showChart && divergence.candles && divergence.indicatorValues && (
        <div className={ `mx-2 mb-2 rounded ${ INNER_BG } flex flex-col relative overflow-hidden` } style={ { boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)' } }>

          {/* Charts Area */ }
          <div className="h-[250px] w-full relative">
            <DivergenceChart
              candles={ divergence.candles }
              divergence={ divergence }
              indicatorValues={ divergence.indicatorValues }
              height={ 250 }
              className="w-full"
            />
          </div>

          {/* Separator Line */ }
          <div className="h-[1px] w-full bg-[#2b403e]/40" />
        </div>
      ) }

      {/* View Full Chart Button */ }
      { showChart && onExpand && (
        <div className="px-4 pb-2">
          <button
            onClick={ () => onExpand( divergence ) }
            className="w-full py-2 text-[10px] uppercase font-bold text-gray-400 hover:text-white bg-[#2b403e]/30 hover:bg-[#2b403e]/50 transition-all outline-none rounded"
          >
            View full chart
          </button>
        </div>
      ) }

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-3 pb-2 mt-auto flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className={ `text-[11px] font-bold ${ divergence.volumeProfile === 'increasing' ? 'text-emerald-400' : 'text-rose-400' }` }>
            Volume: { divergence.volumeProfile === 'increasing' ? 'Increasing' : 'Decreasing' }
          </div>
          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>candles ago { ageInfo.text }</span>
          </div>
        </div>

        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
          { divergence.indicator }
        </div>
      </div>

    </div>
  );
}

export default DivergenceCard;
