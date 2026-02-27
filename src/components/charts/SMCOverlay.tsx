"use client";

/**
 * Smart Money Concepts Overlay Component
 * مكون عرض مفاهيم السيولة الذكية على الشارت
 */

import { useEffect, useRef, useCallback } from "react";
import
  {
    analyzeSMC,
    SMCAnalysis,
    OrderBlock,
    FairValueGap,
    StructureBreak,
    LiquidityZone,
    BreakerBlock,
    WyckoffEvent,
    CandleData
  } from "@/lib/indicators/smartMoneyConcepts";

export interface SMCSettings
{
  orderBlocks: boolean;
  fairValueGaps: boolean;
  marketStructure: boolean;
  liquidityZones: boolean;
  wyckoffEvents: boolean;
  breakerBlocks: boolean;
}

interface SMCOverlayProps
{
  data: CandleData[];
  settings: SMCSettings;
  onAnalysisComplete?: ( analysis: SMCAnalysis ) => void;
}

/**
 * Hook to calculate SMC indicators
 */
export function useSMCAnalysis ( data: CandleData[], settings: SMCSettings )
{
  const analysisRef = useRef<SMCAnalysis | null>( null );

  useEffect( () =>
  {
    if ( data.length < 50 ) return;

    // Run analysis
    const analysis = analyzeSMC( data );
    analysisRef.current = analysis;
  }, [ data ] );

  return analysisRef.current;
}

/**
 * Format SMC data for chart display
 */
export function formatSMCForChart ( analysis: SMCAnalysis | null, settings: SMCSettings )
{
  if ( !analysis ) return null;

  const result: {
    orderBlocks: { bullish: OrderBlock[]; bearish: OrderBlock[] };
    fairValueGaps: { bullish: FairValueGap[]; bearish: FairValueGap[] };
    structureBreaks: { bos: StructureBreak[]; choch: StructureBreak[] };
    liquidityZones: { buySide: LiquidityZone[]; sellSide: LiquidityZone[] };
    breakerBlocks: BreakerBlock[];
    wyckoffEvents: WyckoffEvent[];
    bias: string;
    strength: number;
  } = {
    orderBlocks: { bullish: [], bearish: [] },
    fairValueGaps: { bullish: [], bearish: [] },
    structureBreaks: { bos: [], choch: [] },
    liquidityZones: { buySide: [], sellSide: [] },
    breakerBlocks: [],
    wyckoffEvents: [],
    bias: analysis.marketBias,
    strength: analysis.trendStrength
  };

  if ( settings.orderBlocks )
  {
    result.orderBlocks.bullish = analysis.orderBlocks.filter( ob => ob.type === 'bullish' && !ob.mitigated );
    result.orderBlocks.bearish = analysis.orderBlocks.filter( ob => ob.type === 'bearish' && !ob.mitigated );
  }

  if ( settings.fairValueGaps )
  {
    result.fairValueGaps.bullish = analysis.fairValueGaps.filter( fvg => fvg.type === 'bullish' && !fvg.filled );
    result.fairValueGaps.bearish = analysis.fairValueGaps.filter( fvg => fvg.type === 'bearish' && !fvg.filled );
  }

  if ( settings.marketStructure )
  {
    result.structureBreaks.bos = analysis.structureBreaks.filter( sb => sb.type === 'BOS' );
    result.structureBreaks.choch = analysis.structureBreaks.filter( sb => sb.type === 'CHoCH' );
  }

  if ( settings.liquidityZones )
  {
    result.liquidityZones.buySide = analysis.liquidityZones.filter( lz => lz.type === 'buy-side' && !lz.swept );
    result.liquidityZones.sellSide = analysis.liquidityZones.filter( lz => lz.type === 'sell-side' && !lz.swept );
  }

  if ( settings.breakerBlocks )
  {
    result.breakerBlocks = analysis.breakerBlocks;
  }

  if ( settings.wyckoffEvents )
  {
    result.wyckoffEvents = analysis.wyckoffEvents;
  }

  return result;
}

/**
 * SMC Summary Component
 */
export function SMCSummary ( { analysis }: { analysis: SMCAnalysis | null } )
{
  if ( !analysis ) return null;

  const activeOBs = analysis.orderBlocks.filter( ob => !ob.mitigated );
  const unfilledFVGs = analysis.fairValueGaps.filter( fvg => !fvg.filled );
  const activeZones = analysis.liquidityZones.filter( lz => !lz.swept );

  const biasColor = analysis.marketBias === 'bullish' ? 'text-emerald-400' :
    analysis.marketBias === 'bearish' ? 'text-red-400' : 'text-yellow-400';

  const biasText = analysis.marketBias === 'bullish' ? 'صاعد 📈' :
    analysis.marketBias === 'bearish' ? 'هابط 📉' : 'محايد ⚖️';

  const strengthValue = Math.min( 100, Math.max( 0, Number( analysis.trendStrength.toFixed( 2 ) ) ) );
  const strengthClass = `smc-strength-${ String( strengthValue ).replace( /\./g, '_' ) }`;
  const strengthStyle = `.${ strengthClass }{width:${ strengthValue }%;}`;

  return (
    <div className="border border-[#1a4a4d] rounded-lg p-4 space-y-3 theme-card">
      <style>{ strengthStyle }</style>
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
        <span>🎯</span>
        تحليل السيولة الذكية (SMC)
      </h3>

      {/* Market Bias */ }
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">اتجاه السوق:</span>
        <span className={ `text-sm font-bold ${ biasColor }` }>{ biasText }</span>
      </div>

      {/* Trend Strength */ }
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">قوة الاتجاه:</span>
          <span className="text-xs font-medium">{ analysis.trendStrength.toFixed( 0 ) }%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={ `h-full rounded-full transition-all ${ strengthClass } ${ analysis.marketBias === 'bullish' ? 'bg-emerald-500' :
                analysis.marketBias === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'
              }` }
          />
        </div>
      </div>

      {/* Statistics */ }
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a4a4d]">
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-emerald-400">{ activeOBs.filter( ob => ob.type === 'bullish' ).length }</div>
          <div className="text-[10px] text-muted-foreground">كتل أوامر صاعدة</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-red-400">{ activeOBs.filter( ob => ob.type === 'bearish' ).length }</div>
          <div className="text-[10px] text-muted-foreground">كتل أوامر هابطة</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-blue-400">{ unfilledFVGs.length }</div>
          <div className="text-[10px] text-muted-foreground">فجوات غير مملوءة</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-purple-400">{ activeZones.length }</div>
          <div className="text-[10px] text-muted-foreground">مناطق سيولة</div>
        </div>
      </div>

      {/* Recent Events */ }
      { analysis.structureBreaks.length > 0 && (
        <div className="pt-2 border-t border-[#1a4a4d]">
          <div className="text-xs text-muted-foreground mb-2">آخر كسر للهيكل:</div>
          { analysis.structureBreaks.slice( -2 ).map( ( sb, idx ) => (
            <div key={ idx } className="flex items-center gap-2 text-xs mb-1">
              <span className={ `px-1.5 py-0.5 rounded text-[10px] font-bold ${ sb.type === 'CHoCH' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }` }>
                { sb.type }
              </span>
              <span className={ sb.direction === 'bullish' ? 'text-emerald-400' : 'text-red-400' }>
                { sb.direction === 'bullish' ? '↑ صاعد' : '↓ هابط' }
              </span>
              <span className="text-muted-foreground">@ { sb.price.toFixed( 2 ) }</span>
            </div>
          ) ) }
        </div>
      ) }

      {/* Wyckoff Events */ }
      { analysis.wyckoffEvents.length > 0 && (
        <div className="pt-2 border-t border-[#1a4a4d]">
          <div className="text-xs text-muted-foreground mb-2">أحداث وايكوف:</div>
          { analysis.wyckoffEvents.slice( -3 ).map( ( event, idx ) => (
            <div key={ idx } className="flex items-center gap-2 text-xs mb-1">
              <span className={ `px-1.5 py-0.5 rounded text-[10px] font-bold ${ event.phase === 'accumulation' ? 'bg-emerald-500/20 text-emerald-400' :
                  event.phase === 'distribution' ? 'bg-red-500/20 text-red-400' :
                    event.phase === 'markup' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                }` }>
                { event.type }
              </span>
              <span className="text-muted-foreground truncate flex-1" title={ event.description }>
                { event.description.slice( 0, 30 ) }...
              </span>
            </div>
          ) ) }
        </div>
      ) }
    </div>
  );
}

/**
 * Generate chart markers for SMC elements
 */
export function generateSMCMarkers ( analysis: SMCAnalysis | null, settings: SMCSettings )
{
  if ( !analysis ) return [];

  const markers: Array<{
    time: number | string;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
    size?: number;
  }> = [];

  // Structure breaks
  if ( settings.marketStructure )
  {
    analysis.structureBreaks.forEach( sb =>
    {
      markers.push( {
        time: sb.time,
        position: sb.direction === 'bullish' ? 'belowBar' : 'aboveBar',
        color: sb.type === 'CHoCH'
          ? ( sb.direction === 'bullish' ? '#a855f7' : '#ec4899' )
          : ( sb.direction === 'bullish' ? '#22c55e' : '#ef4444' ),
        shape: sb.type === 'CHoCH' ? 'square' : 'circle',
        text: sb.type,
        size: 2
      } );
    } );
  }

  // Wyckoff events
  if ( settings.wyckoffEvents )
  {
    analysis.wyckoffEvents.forEach( event =>
    {
      markers.push( {
        time: event.time,
        position: event.phase === 'accumulation' || event.phase === 'markup' ? 'belowBar' : 'aboveBar',
        color: event.phase === 'accumulation' ? '#22c55e' :
          event.phase === 'distribution' ? '#ef4444' :
            event.phase === 'markup' ? '#3b82f6' : '#f59e0b',
        shape: event.type === 'SPRING' || event.type === 'UTAD' ? 'arrowUp' : 'circle',
        text: event.type,
        size: 2
      } );
    } );
  }

  return markers;
}

export default {
  useSMCAnalysis,
  formatSMCForChart,
  SMCSummary,
  generateSMCMarkers
};
