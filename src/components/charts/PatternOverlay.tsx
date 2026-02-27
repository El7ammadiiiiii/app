/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 PATTERN OVERLAY - طبقة الأنماط للشارت
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * مكون يضيف طبقة رسم الأنماط فوق الشارت الرئيسي
 * يتلقى البيانات من Pattern Master ويحولها لرسومات ECharts
 */

"use client";

import { useEffect, useMemo } from "react";
import
{
  usePatternGraphics,
  type DetectedPattern,
  type ChartSignal,
  type AnalysisResult,
  type OHLCVData
} from "@/lib/agents/pattern-master/use-pattern-master";
import type { EChartsCoreOption as EChartsOption } from "echarts";

export interface PatternOverlayProps
{
  data: OHLCVData | null;
  symbol: string;
  timeframe: string;
  onPatternsChange?: ( patterns: DetectedPattern[] ) => void;
  onSignalsChange?: ( signals: ChartSignal[] ) => void;
  onSummaryChange?: ( summary: AnalysisResult[ "summary" ] | null ) => void;
}

export interface PatternOverlayResult
{
  isAnalyzing: boolean;
  patterns: DetectedPattern[];
  signals: ChartSignal[];
  summary: AnalysisResult[ "summary" ] | null;
  echartsMarkLine: unknown;
  echartsMarkPoint: unknown;
  echartsMarkArea: unknown;
}

export function usePatternOverlay ( {
  data,
  symbol,
  timeframe,
  onPatternsChange,
  onSignalsChange,
  onSummaryChange,
}: PatternOverlayProps ): PatternOverlayResult
{
  const { graphics, patterns, signals, isAnalyzing, summary } = usePatternGraphics(
    data,
    symbol,
    timeframe
  );

  // Notify parent of changes
  useEffect( () =>
  {
    if ( onPatternsChange ) onPatternsChange( patterns );
  }, [ patterns, onPatternsChange ] );

  useEffect( () =>
  {
    if ( onSignalsChange ) onSignalsChange( signals );
  }, [ signals, onSignalsChange ] );

  useEffect( () =>
  {
    if ( onSummaryChange ) onSummaryChange( summary );
  }, [ summary, onSummaryChange ] );

  // Convert graphics to ECharts format
  const echartsMarkLine = useMemo( () =>
  {
    if ( graphics.markLines.length === 0 ) return undefined;

    // Flatten all markLine data
    const allData: unknown[][] = [];

    for ( const ml of graphics.markLines )
    {
      for ( const lineData of ml.data )
      {
        allData.push( lineData.map( point => ( {
          coord: point.coord,
          lineStyle: ml.lineStyle,
          label: ml.label,
        } ) ) );
      }
    }

    return {
      silent: true,
      symbol: [ "none", "none" ],
      data: allData,
    };
  }, [ graphics.markLines ] );

  const echartsMarkPoint = useMemo( () =>
  {
    if ( graphics.markPoints.length === 0 ) return undefined;

    // Flatten all markPoint data
    const allData: unknown[] = [];

    for ( const mp of graphics.markPoints )
    {
      for ( const point of mp.data )
      {
        allData.push( {
          coord: point.coord,
          value: point.value,
          symbol: mp.symbol,
          symbolSize: mp.symbolSize,
          symbolRotate: mp.symbolRotate,
          label: mp.label,
          itemStyle: mp.itemStyle,
        } );
      }
    }

    return {
      data: allData,
    };
  }, [ graphics.markPoints ] );

  const echartsMarkArea = useMemo( () =>
  {
    if ( graphics.markAreas.length === 0 ) return undefined;

    // Flatten all markArea data
    const allData: unknown[][] = [];

    for ( const ma of graphics.markAreas )
    {
      for ( const areaData of ma.data )
      {
        allData.push( [
          { coord: areaData[ 0 ].coord, itemStyle: ma.itemStyle },
          { coord: areaData[ 1 ].coord },
        ] );
      }
    }

    return {
      silent: true,
      data: allData,
    };
  }, [ graphics.markAreas ] );

  return {
    isAnalyzing,
    patterns,
    signals,
    summary,
    echartsMarkLine,
    echartsMarkPoint,
    echartsMarkArea,
  };
}

// ============================================
// SIGNALS PANEL COMPONENT
// ============================================

interface SignalsPanelProps
{
  signals: ChartSignal[];
  patterns: DetectedPattern[];
  summary: AnalysisResult[ "summary" ] | null;
  isAnalyzing: boolean;
}

export function PatternSignalsPanel ( { signals, patterns, summary, isAnalyzing }: SignalsPanelProps )
{
  const buySignals = signals.filter( s => s.type === "buy" );
  const sellSignals = signals.filter( s => s.type === "sell" );
  const strongSignals = signals.filter( s => s.strength === "strong" );

  if ( isAnalyzing )
  {
    return (
      <div className="p-4 bg-white/10 rounded-lg border border-teal-700/30">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          <span className="text-slate-400">جاري تحليل الأنماط...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */ }
      { summary && (
        <div className="p-4 bg-white/10 rounded-lg border border-teal-700/30">
          <h3 className="text-lg font-bold text-white mb-3">ملخص التحليل</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">{ summary.bullishPatterns }</div>
              <div className="text-xs text-slate-400">أنماط صعودية</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{ summary.bearishPatterns }</div>
              <div className="text-xs text-slate-400">أنماط هبوطية</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{ summary.strongSignals }</div>
              <div className="text-xs text-slate-400">إشارات قوية</div>
            </div>
            <div className="text-center">
              <div className={ `text-2xl font-bold ${ summary.overallBias === "bullish" ? "text-emerald-500" :
                summary.overallBias === "bearish" ? "text-red-500" : "text-slate-400"
                }` }>
                { summary.overallBias === "bullish" ? "صعودي" :
                  summary.overallBias === "bearish" ? "هبوطي" : "محايد" }
              </div>
              <div className="text-xs text-slate-400">الاتجاه العام</div>
            </div>
          </div>
          { summary.recommendationAr && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <span className="text-slate-300">{ summary.recommendationAr }</span>
            </div>
          ) }
        </div>
      ) }

      {/* Signals - Large Mobile-Friendly Header */ }
      <div className="bg-white/10 rounded-lg border border-teal-700/30 overflow-hidden">
        {/* Header - Side by Side */ }
        <div className="flex border-b border-teal-700/30">
          <div className="flex-1 px-6 py-6 text-center border-r border-teal-700/30 bg-emerald-500/10">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400">▲ إشارات الشراء ({ buySignals.length })</span>
          </div>
          <div className="flex-1 px-6 py-6 text-center bg-red-500/10">
            <span className="text-2xl sm:text-3xl font-bold text-red-400">▼ إشارات البيع ({ sellSignals.length })</span>
          </div>
        </div>

        {/* Content - Side by Side */ }
        <div className="grid grid-cols-2">
          {/* Buy Signals */ }
          <div className="p-6 border-r border-teal-700/30">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              { buySignals.map( signal => (
                <div
                  key={ signal.id }
                  className={ `px-5 py-4 rounded-lg ${ signal.strength === "strong"
                    ? "bg-emerald-500/20 border-l-4 border-emerald-500"
                    : "bg-emerald-500/10 border-l-2 border-emerald-500/50"
                    }` }
                >
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-white text-xl sm:text-2xl font-medium">{ signal.patternAr }</span>
                    <span className="text-emerald-400 font-bold text-2xl sm:text-3xl whitespace-nowrap">{ signal.confidence.toFixed( 0 ) }%</span>
                  </div>
                </div>
              ) ) }
              { buySignals.length === 0 && (
                <div className="text-slate-500 text-center py-8 text-xl sm:text-2xl">لا توجد إشارات شراء قوية حالياً</div>
              ) }
            </div>
          </div>

          {/* Sell Signals */ }
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              { sellSignals.map( signal => (
                <div
                  key={ signal.id }
                  className={ `px-5 py-4 rounded-lg ${ signal.strength === "strong"
                    ? "bg-red-500/20 border-l-4 border-red-500"
                    : "bg-red-500/10 border-l-2 border-red-500/50"
                    }` }
                >
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-white text-xl sm:text-2xl font-medium">{ signal.patternAr }</span>
                    <span className="text-red-400 font-bold text-2xl sm:text-3xl whitespace-nowrap">{ signal.confidence.toFixed( 0 ) }%</span>
                  </div>
                </div>
              ) ) }
              { sellSignals.length === 0 && (
                <div className="text-slate-500 text-center py-8 text-xl sm:text-2xl">لا توجد إشارات بيع قوية حالياً</div>
              ) }
            </div>
          </div>
        </div>
      </div>

      {/* Patterns List */ }
      { patterns.length > 0 && (
        <div className="p-4 bg-white/10 rounded-lg border border-teal-700/30">
          <h3 className="text-lg font-bold text-white mb-3">الأنماط المكتشفة ({ patterns.length })</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            { patterns.map( pattern => (
              <div
                key={ pattern.id }
                className={ `p-3 rounded-lg border ${ pattern.type === "bullish"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : pattern.type === "bearish"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-white/10 border-teal-700/30"
                  }` }
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-white">{ pattern.nameAr }</div>
                  <span className={ `text-xs px-2 py-1 rounded ${ pattern.overallConfirmation === "strong" ? "bg-emerald-500/30 text-emerald-400" :
                    pattern.overallConfirmation === "moderate" ? "bg-amber-500/30 text-amber-400" :
                      pattern.overallConfirmation === "trap" ? "bg-red-500/30 text-red-400" :
                        "bg-slate-600/50 text-slate-400"
                    }` }>
                    { pattern.overallConfirmation === "strong" ? "✓ مؤكد" :
                      pattern.overallConfirmation === "moderate" ? "⚠ متوسط" :
                        pattern.overallConfirmation === "trap" ? "✕ فخ" : "ضعيف" }
                  </span>
                </div>
                <div className="text-sm text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>النوع:</span>
                    <span className={ pattern.type === "bullish" ? "text-emerald-400" : "text-red-400" }>
                      { pattern.type === "bullish" ? "صعودي" : "هبوطي" }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>الثقة:</span>
                    <span className="text-white">{ pattern.confidence.toFixed( 0 ) }%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الدخول:</span>
                    <span className="text-amber-400">{ pattern.tradeSetup.entry.toFixed( 2 ) }</span>
                  </div>
                  <div className="flex justify-between">
                    <span>وقف الخسارة:</span>
                    <span className="text-red-400">{ pattern.tradeSetup.stopLoss.toFixed( 2 ) }</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R/R:</span>
                    <span className={ pattern.tradeSetup.riskReward >= 2 ? "text-emerald-400" : "text-slate-400" }>
                      { pattern.tradeSetup.riskReward.toFixed( 1 ) }
                    </span>
                  </div>
                </div>
              </div>
            ) ) }
          </div>
        </div>
      ) }

      {/* Strong Signals Alert */ }
      { strongSignals.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-lg border border-emerald-500/50">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-2xl">⚡</span> إشارات قوية تحتاج انتباهك!
          </h3>
          <div className="space-y-2">
            { strongSignals.map( signal => (
              <div key={ signal.id } className="flex items-center gap-3 p-2 bg-white/10 rounded">
                <span className={ `text-xl ${ signal.type === "buy" ? "text-emerald-500" : "text-red-500" }` }>
                  { signal.type === "buy" ? "▲" : "▼" }
                </span>
                <div className="flex-1">
                  <div className="font-bold text-white">{ signal.patternAr }</div>
                  <div className="text-sm text-slate-400">
                    { signal.type === "buy" ? "شراء" : "بيع" } عند { signal.price.toFixed( 2 ) }
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">{ signal.confidence.toFixed( 0 ) }%</div>
                  <div className="text-xs text-slate-500">{ signal.confirmationsAr.length } تأكيدات</div>
                </div>
              </div>
            ) ) }
          </div>
        </div>
      ) }
    </div>
  );
}
