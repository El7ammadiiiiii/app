"use client";

/**
 * React hook wrapper for the Pattern Master engine.
 *
 * `PatternOverlay` expects a hook that returns:
 * - the analysis result (patterns/signals/summary)
 * - the ECharts graphics representation of that analysis
 */

import { useMemo } from "react";

import {
  analyzePatterns,
  type AnalysisResult,
  type ChartSignal,
  type DetectedPattern,
  type OHLCVData,
  type SupportResistanceLevel,
  type TrendLineData,
} from "./index";
import { renderPatterns, type PatternGraphics } from "./pattern-renderer";

export type { AnalysisResult, ChartSignal, DetectedPattern, OHLCVData };

export interface UsePatternGraphicsResult {
  graphics: PatternGraphics;
  patterns: DetectedPattern[];
  signals: ChartSignal[];
  isAnalyzing: boolean;
  summary: AnalysisResult["summary"] | null;

  // Expose these in case the UI needs them later.
  trendLines?: TrendLineData[];
  supportResistance?: SupportResistanceLevel[];
}

const EMPTY_GRAPHICS: PatternGraphics = {
  markLines: [],
  markPoints: [],
  markAreas: [],
  graphic: [],
};

export function usePatternGraphics(
  data: OHLCVData | null,
  symbol: string,
  timeframe: string
): UsePatternGraphicsResult {
  return useMemo(() => {
    if (!data || !data.close || data.close.length < 20) {
      return {
        graphics: EMPTY_GRAPHICS,
        patterns: [],
        signals: [],
        isAnalyzing: false,
        summary: null,
      };
    }

    const analysis = analyzePatterns(data, symbol, timeframe);
    const graphics = renderPatterns(
      analysis.patterns,
      analysis.signals,
      analysis.trendLines,
      analysis.supportResistance,
      data.close.length
    );

    return {
      graphics,
      patterns: analysis.patterns,
      signals: analysis.signals,
      isAnalyzing: false,
      summary: analysis.summary,
      trendLines: analysis.trendLines,
      supportResistance: analysis.supportResistance,
    };
  }, [data, symbol, timeframe]);
}
