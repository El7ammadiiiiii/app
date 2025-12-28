"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { Time } from "lightweight-charts";
import {
  detectChartPatterns,
  detectUltraPatterns,
  generatePatternLines,
  detectWolfeWaves,
  calculateSmartSignal,
  updateTradeManagement,
  type DetectedPattern,
  type PatternType,
  type SmartTradeSignal,
} from "@/lib/indicators/chart-patterns";
import { evaluateChartPatternLifecycle } from "@/lib/indicators/pattern-lifecycle-chart";
import {
  detectHeadAndShoulders,
  detectDoubleTopBottom,
  detectTripleTopBottom,
  detectCupAndHandle,
  detectRectangle,
} from "@/lib/indicators/missing-patterns";
import { evaluatePatternLifecycle } from "@/lib/indicators/pattern-lifecycle";
import { resolveEffectiveBreakoutDirection } from "@/lib/indicators/effective-breakout-direction";
import { OHLCV } from "@/lib/indicators/technical";
import {
  calculateSuperSmoother,
  calculateInstantaneousTrendline,
  calculateFisherTransform,
  calculateMAMA,
  calculateFRAMA,
  calculateCyberCycle,
} from "@/lib/indicators/ehlers-dsp";
import {
  calculateIchimoku,
  calculateATRBands,
  calculateParabolicSAR,
  calculateSmartPivots,
  calculateWilliamsR,
  calculateAdvancedCCI,
  calculateMomentumROC,
  calculateUltimateOscillator,
  calculateKeltnerChannels,
  calculateDonchianChannels,
  calculateCMF,
  calculateForceIndex,
  calculateChoppinessIndex,
  calculateTRIX,
  calculateAwesomeOscillator,
} from "@/lib/indicators/advanced-indicators";

// Display 5 Models - Static Imports
import { detectSmartMoneyDynamics, calculateP25TrendLine, calculatePearsonMatrix } from '@/Display_5_Models/smart_money_dynamics';
import { calculateRAVMMatrix } from '@/Display_5_Models/ravm_model';
import { calculateTrendBreakTargets } from '@/Display_5_Models/trend_break_targets';
import { calculateSqueezeMomentum } from '@/Display_5_Models/squeeze_momentum';
import { detectWedgesAndFlags } from '@/Display_5_Models/wedge_flag_finder';
import { detectReversalPatterns } from '@/Display_5_Models/recursive_reversal_patterns';
import { detectHTFAscendingTriangles, detectAscendingTriangleBreakout, calculateTriangleTarget as calculateAscTriangleTarget } from '@/Display_5_Models/htf_ascending_triangle';
import { detectHTFDescendingTriangles, detectDescendingTriangleBreakout, calculateTriangleTarget as calculateDescTriangleTarget } from '@/Display_5_Models/htf_descending_triangle';
import { calculateWedgeMaker, getExtendedLineData, checkWedgeBreakout } from '@/Display_5_Models/wedge_maker';
import { detectWolfeWaves as detectWolfeWavesModel, getWaveLineData as getWolfeWaveLineData } from '@/Display_5_Models/wolfe_waves';
import { detectLuxWolfeWaves, getWaveLineData as getLuxWaveLineData } from '@/Display_5_Models/wolfe_waves_lux';
import { detectAutoChannel, getChannelLineData, getChannelFillData } from '@/Display_5_Models/auto_channel';
import { detectTrendlineBreakoutNavigator } from '@/Display_5_Models/trendline_breakout_navigator';
import { detectLuxTrendLines } from '@/Display_5_Models/trend_lines_lux';
import { detectSessionBreakout } from '@/Display_5_Models/session_breakout';
import { detectGartleyPattern } from '@/Display_5_Models/gartley_pattern';
import { detectAlternateBatPattern } from '@/Display_5_Models/alternate_bat_pattern';
import { detectABCDPattern } from '@/Display_5_Models/abcd_pattern';
import { detectAlternativeSharkPattern } from '@/Display_5_Models/alternative_shark_pattern';
import { detectThreeDrivePattern } from '@/Display_5_Models/three_drive_pattern';
import { calculateEhlersIT, detectEhlersITCrossovers } from '@/Display_5_Models/ehlers_instantaneous_trend';
import { calculateSuperTrendMA } from '@/Display_5_Models/supertrend_ma';
import { calculateTrendLineMethods as calculateTrendLineMethodsDisplay5 } from '@/Display_5_Models/trend_line_methods';
import { calculateDynamicSR } from '@/Display_5_Models/dynamic_support_resistance';
import { detectFlagsAndPennants } from '@/Display_5_Models/flags_pennants';
import { detectPivotTrendlines } from '@/Display_5_Models/pivot_trendlines';
import { calculateDynamicFibonacci } from '@/Display_5_Models/dynamic_fibonacci';
import { calculateSRPowerChannel } from '@/Display_5_Models/sr_power_channel';
import { calculateDivergenceScreener } from '@/Display_5_Models/divergence_screener';
import { calculateAutoChartPatterns as calculateAutoChartPatternsDisplay5 } from '@/Display_5_Models/auto_chart_patterns';
import { calculateRangeBreakout } from '@/Display_5_Models/range_breakout';
import { calculateHarmonicSystem, getPatternName, getPatternSymbol, getStatusSymbol } from '@/Display_5_Models/harmonic_pattern_system';
import { calculateDragonPattern, getDragonPatternInfo, formatRatio } from '@/Display_5_Models/dragon_pattern';
import { calculatePivotTrendlinesV2, getLineStyle } from '@/Display_5_Models/pivot_trendlines_v2';
import { calculateCypherPattern, getCypherPatternInfo, formatCypherRatio } from '@/Display_5_Models/cypher_pattern';
import { calculateSupportResistance as calculateSupportResistanceMajorMinor, getRecentSRLevels, getLevelColor, getLevelLineStyle, getLevelLineWidth, defaultSRConfig, type SRLevel } from '@/lib/indicators/supportResistanceMajorMinor';
import { detectWolfeWavesBigBeluga, getRecentWolfeWaves, getWolfeWaveColor, defaultWolfeWaveConfig, type WolfeWavePattern } from '@/lib/indicators/wolfeWavesBigBeluga';
import { calculateDeviationTrendProfile, getRecentTrendSignals, defaultDeviationTrendConfig } from '@/lib/indicators/deviationTrendProfile';
import { calculateLogRegressionOscillator, defaultLogRegressionOscConfig } from '@/lib/indicators/logRegressionOscillator';
import { calculateDonAltToolkit, defaultDonAltConfig } from '@/lib/indicators/donAltToolkit';
import { detectPsychologicalSR, defaultPsychologicalSRConfig } from '@/lib/indicators/psychologicalSR';
import { calculateWedgeFlag, defaultWedgeFlagConfig } from '@/lib/indicators/wedgeFlagFinder';
import { calculatePriceHeatMeter, defaultHeatMeterConfig, getHeatDescription } from '@/lib/indicators/priceHeatMeter';
import { calculateIchimokuPourSamadi } from "@/lib/indicators/ichimokuPourSamadi";
import { calculateTrendLineMethods as calculateTrendLineMethodsLib } from "@/lib/indicators/trendLineMethods";
import { calculateAutoChartPatterns, getPatternDisplayName, getPatternColor } from "@/lib/indicators/autoChartPatterns";
import { calculateNadarayaWatsonEnvelope, defaultNadarayaWatsonConfig } from "@/lib/indicators/nadarayaWatsonEnvelope";
import { calculateCyclicRSI, detectCyclicRSISignals, defaultCyclicRSIConfig } from "@/lib/indicators/cyclicRSI";
import { calculateChronoPulse, defaultChronoPulseConfig } from "@/lib/indicators/chronoPulse";
import { calculateLuxySuperTrend, defaultLuxySuperTrendConfig } from "@/lib/indicators/luxySuperTrend";
import { calculateSupportResistance, defaultSupportResistanceConfig } from "@/lib/indicators/supportResistanceRegression";
import { calculateRAVM, defaultRAVMConfig } from '@/lib/indicators/ravmMatrix';
import { calculateLinearRegressionChannel, defaultLRCConfig } from './indicators/linearRegressionChannel';
import { calculateFibonacciProjection, defaultFibProjectionConfig, formatVolume } from './indicators/fibonacciProjection';
import { calculateXABCDFormation, defaultXABCDConfig, formatXABCDPrice, calculateTargetDistance } from './indicators/xabcdFormation';
import { calculateLiquidationReversal, defaultLiquidationReversalConfig, getLiquidationColor, getSignalDescription } from './indicators/liquidationReversal';
import { calculateWolfeScanner, defaultWolfeScannerConfig, getWolfePatternDescription } from './indicators/wolfeScanner';
import { calculateWedgeFlagMultiZigzag, defaultWedgeFlagConfig as defaultWedgeFlagMultiZZConfig, getPatternLabel } from './indicators/wedgeFlagMultiZigzag';
import { calculateHarmonicProjections, defaultHarmonicConfig, getPatternDisplayInfo, getPatternColor as getHarmonicPatternColor } from './indicators/harmonicProjections';
import { calculateBatPattern, defaultBatPatternConfig, getBatRatioText, getBatPRZ } from './indicators/batHarmonicPattern';
import { calculateTrendBreakTargets as calcTBTMarkitTick, defaultTrendBreakTargetsConfig, getTargetInfo, getChochDescription } from './indicators/trendBreakTargets';
import { calculateTrendChannels, defaultTrendChannelsConfig, getLiquidityColor, getBreakDescription } from './indicators/trendChannelsLiquidity';
import { calculateRMRChannel, defaultRMRChannelConfig, getRegressionPriceAt, formatSlope } from './indicators/repeatedMedianChannel';
import { calculateUltraTrendlines, defaultUltraTrendlinesConfig, getTrendlineDescription, formatSlope as formatUltraSlope } from './indicators/ultraTrendlines';
import { calculateTrendlinesBreaks, defaultTrendlinesBreaksConfig, getBreakoutDescription as getLuxBreakoutDesc, formatSlopeValue } from './indicators/trendlinesBreaks';

// === Helper Functions for Trendlines & Support/Resistance ===

function calculateAutoTrendlines(data: { high: number; low: number; close: number }[]) {
  if (data.length < 20) return { support: [], resistance: [] };
  
  const highs: { idx: number; price: number }[] = [];
  const lows: { idx: number; price: number }[] = [];
  
  // Find local highs and lows (fractals)
  for (let i = 2; i < data.length - 2; i++) {
    if (data[i].high > data[i-1].high && data[i].high > data[i-2].high &&
        data[i].high > data[i+1].high && data[i].high > data[i+2].high) {
      highs.push({ idx: i, price: data[i].high });
    }
    if (data[i].low < data[i-1].low && data[i].low < data[i-2].low &&
        data[i].low < data[i+1].low && data[i].low < data[i+2].low) {
      lows.push({ idx: i, price: data[i].low });
    }
  }
  
  const supportLines: number[][] = [];
  const resistanceLines: number[][] = [];
  
  // Draw trendlines between consecutive lows (support)
  for (let i = 0; i < lows.length - 1; i++) {
    const line = new Array(data.length).fill(null);
    const slope = (lows[i+1].price - lows[i].price) / (lows[i+1].idx - lows[i].idx);
    for (let j = lows[i].idx; j < data.length; j++) {
      line[j] = lows[i].price + slope * (j - lows[i].idx);
    }
    supportLines.push(line);
  }
  
  // Draw trendlines between consecutive highs (resistance)
  for (let i = 0; i < highs.length - 1; i++) {
    const line = new Array(data.length).fill(null);
    const slope = (highs[i+1].price - highs[i].price) / (highs[i+1].idx - highs[i].idx);
    for (let j = highs[i].idx; j < data.length; j++) {
      line[j] = highs[i].price + slope * (j - highs[i].idx);
    }
    resistanceLines.push(line);
  }
  
  return { support: supportLines.slice(-2), resistance: resistanceLines.slice(-2) };
}

function calculateHorizontalLevels(data: { high: number; low: number; close: number }[]) {
  if (data.length < 20) return { support: [], resistance: [] };
  
  const recentData = data.slice(-100);
  const highs = recentData.map(d => d.high).sort((a, b) => b - a);
  const lows = recentData.map(d => d.low).sort((a, b) => a - b);
  
  // Get significant levels
  const resistanceLevels = [highs[0], highs[Math.floor(highs.length * 0.1)]];
  const supportLevels = [lows[0], lows[Math.floor(lows.length * 0.1)]];
  
  return { support: supportLevels, resistance: resistanceLevels };
}

function calculateFibonacciLevels(data: { high: number; low: number }[]) {
  if (data.length < 20) return [];
  
  const recentData = data.slice(-50);
  const high = Math.max(...recentData.map(d => d.high));
  const low = Math.min(...recentData.map(d => d.low));
  const diff = high - low;
  
  const fiboLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  return fiboLevels.map(level => ({
    level,
    price: low + diff * level,
    label: `${(level * 100).toFixed(1)}%`
  }));
}

// --- Interfaces ---

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartIndicatorSettings {
  // Moving Averages
  sma10?: boolean;
  sma25?: boolean;
  sma50?: boolean;
  sma100?: boolean;
  sma200?: boolean;
  ema10?: boolean;
  ema25?: boolean;
  ema50?: boolean;
  ema100?: boolean;
  ema200?: boolean;
  
  // Bollinger Bands & SuperTrend
  bollingerBands?: boolean;
  supertrend?: boolean;
  
  // SMC (Smart Money Concepts) Indicators
  orderBlocks?: boolean;
  fairValueGaps?: boolean;
  marketStructure?: boolean;
  liquidityZones?: boolean;
  wyckoffEvents?: boolean;
  breakerBlocks?: boolean;
  
  // Ehlers DSP Indicators
  superSmoother?: boolean;
  instantaneousTrendline?: boolean;
  fisherTransform?: boolean;
  mama?: boolean;
  frama?: boolean;
  cyberCycle?: boolean;
  
  // Confluence & Risk Management
  confluenceZones?: boolean;
  fibonacciConfluence?: boolean;
  pivotPointConfluence?: boolean;
  riskRewardZones?: boolean;
  patternQualityScore?: boolean;
  
  // Breakout Detection
  breakoutDetection?: boolean;
  rangeBreakout?: boolean;
  volumeSurgeBreakout?: boolean;
  
  // Classic Reversal Patterns
  headAndShoulders?: boolean;
  inverseHeadAndShoulders?: boolean;
  doubleTop?: boolean;
  doubleBottom?: boolean;
  tripleTop?: boolean;
  tripleBottom?: boolean;
  cupAndHandle?: boolean;
  invertedCupAndHandle?: boolean;
  rectangle?: boolean;
  
  // Trendlines / Levels / Fibonacci
  trendlines?: boolean;
  horizontalLevels?: boolean;
  fibonacciRetracements?: boolean;
  verticalResistance?: boolean;
  verticalSupport?: boolean;
  
  // Chart Patterns (Channels / Triangles / Flags / Wedges)
  ascendingChannel?: boolean;
  descendingChannel?: boolean;
  ascendingTriangle?: boolean;
  descendingTriangle?: boolean;
  symmetricalTriangle?: boolean;
  bullFlag?: boolean;
  bearFlag?: boolean;
  bullPennant?: boolean;
  bearPennant?: boolean;
  continuationFallingWedge?: boolean;
  reversalFallingWedge?: boolean;
  continuationRisingWedge?: boolean;
  reversalRisingWedge?: boolean;
  ascendingBroadeningWedge?: boolean;
  descendingBroadeningWedge?: boolean;
  
  // Elite Overlay Indicators
  ichimoku?: boolean;
  parabolicSar?: boolean;
  pivots?: boolean;
  keltner?: boolean;
  donchian?: boolean;
  atrBands?: boolean;
  
  // Ultra-Precision Patterns (R² ≥ 0.82)
  ultraAscendingTriangle?: boolean;
  ultraDescendingTriangle?: boolean;
  ultraSymmetricalTriangle?: boolean;
  ultraRisingWedge?: boolean;
  ultraFallingWedge?: boolean;
  ultraSymmetricalBroadening?: boolean;
  ultraBroadeningBottom?: boolean;
  ultraBroadeningTop?: boolean;
  ultraAscendingBroadeningRA?: boolean;
  ultraDescendingBroadeningRA?: boolean;
  ultraAscendingChannel?: boolean;
  ultraDescendingChannel?: boolean;
  ultraBullFlag?: boolean;
  ultraBearFlag?: boolean;
  
  // Additional SMC
  liquiditySweeps?: boolean;
  
  // Wolfe Wave
  wolfeWavePattern?: boolean;
  
  // 🤖 AI Agents - مفاتيح التحكم بالوكلاء
  agent1UltraPrecision?: boolean;    // Agent 1: القنوات والأعلام الدقيقة
  agent2ClassicPatterns?: boolean;   // Agent 2: الأنماط الكلاسيكية
  agent3GeometricPatterns?: boolean; // Agent 3: المثلثات والأوتاد
  agent4ContinuationPatterns?: boolean; // Agent 4: الرايات والاستمرارية
  
  // 💎 Display 5 - Custom Models
  smartMoneyDynamics?: boolean;      // Smart Money Dynamics - Pearson Matrix
  ravmMatrix?: boolean;              // RAVM Matrix - RSI Analytic Volume Matrix
  trendBreakTargets?: boolean;       // Trend Break Targets + CHOCH
  squeezeMomentum?: boolean;         // Squeeze Momentum Oscillator
  wedgeFlagFinder?: boolean;         // Wedge and Flag Finder (Multi-Zigzag)
  recursiveReversalPatterns?: boolean; // Recursive Reversal Chart Patterns
  htfAscendingTriangle?: boolean;    // HTF Ascending Triangle
  htfDescendingTriangle?: boolean;   // HTF Descending Triangle
  wedgeMaker?: boolean;              // Wedge Maker - Pivot Trendlines
  wolfeWaves?: boolean;              // Wolfe Waves - 5-Point Reversal
  wolfeWavesLux?: boolean;           // Wolfe Waves LuxAlgo - Advanced Detection
  autoChannel?: boolean;             // Auto Channel - Parallel Channel Detection
  trendlineNavigator?: boolean;      // Trendline Breakout Navigator [LuxAlgo]
  luxTrendLines?: boolean;           // Trend Lines [LuxAlgo]
  sessionBreakout?: boolean;         // Session Breakout - Time Range Breakouts
  gartleyPattern?: boolean;          // Gartley Harmonic Pattern - XABCD
  alternateBatPattern?: boolean;     // Alternate Bat Harmonic Pattern - ALT Bat
  abcdPattern?: boolean;             // ABCD Harmonic Pattern - 4 Point
  alternativeSharkPattern?: boolean; // Alternative Shark Harmonic Pattern
  threeDrivePattern?: boolean;       // Three Drive Pattern [LuxAlgo]
  ehlersIT?: boolean;                // Ehlers Instantaneous Trend [LazyBear]
  supertrendMA?: boolean;            // SuperTrended Moving Averages
  ichimokuPourSamadi?: boolean;      // Ichimoku PourSamadi Signal [TradingFinder]
  trendLineMethods?: boolean;        // Trend Line Methods [Pivot Span & 5-Point]
  autoChartPatterns?: boolean;       // Auto Chart Patterns [Trendoscope®]
  nadarayaWatsonEnvelope?: boolean;  // Nadaraya-Watson Envelope [LuxAlgo]
  cyclicRSI?: boolean;               // RSI Cyclic Smoothed [whentotrade]
  chronoPulse?: boolean;             // ChronoPulse MS-MACD Resonance
  luxySuperTrend?: boolean;          // Luxy Super-Duper SuperTrend
  supportResistanceRegression?: boolean; // S/R Polynomial Regression
  linearRegressionChannel?: boolean;    // Linear Regression Channel Screener
  fibonacciProjection?: boolean;        // Fibonacci Projection with Volume & Delta Profile
  xabcdFormation?: boolean;             // TraderDemircan XABCD Formation
  liquidationReversal?: boolean;        // AlgoAlpha Liquidation Reversal Signals
  wolfeScanner?: boolean;               // Wolfe Scanner [Trendoscope®] - 5-Point Wolfe Wave
  wedgeFlagMultiZigzag?: boolean;       // Wedge and Flag Finder (Multi-Zigzag) [Trendoscope®]
  harmonicProjections?: boolean;        // Manual Harmonic Projections - 25 Pattern Types
  batHarmonicPattern?: boolean;         // Bat Harmonic Pattern [TradingFinder]
  tbtMarkitTick?: boolean;              // Trend Break Targets [MarkitTick] + CHOCH
  trendChannelsLiquidity?: boolean;     // Trend Channels With Liquidity Breaks [ChartPrime]
  repeatedMedianChannel?: boolean;      // Repeated Median Regression Channel [tbiktag]
  ultraTrendlines?: boolean;            // Ultra Trendlines [Rathack]
  trendlinesBreaksLuxAlgo?: boolean;    // Trendlines with Breaks [LuxAlgo]
}

export interface TradingChartProps {
  data: CandleData[];
  height?: number;
  theme?: "dark" | "light";
  showVolume?: boolean;
  autosize?: boolean;
  indicators?: ChartIndicatorSettings;
  onCrosshairMove?: (param: any) => void;
}

// --- Helpers ---

function calculateSMA(data: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push(sum / period);
  }
  return result;
}

function calculateEMA(data: CandleData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let ema = 0;
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  ema = sum / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i].close - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  return result;
}

function calculateBollingerBands(data: CandleData[], period: number = 20, stdDev: number = 2) {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const sma = sum / period;
    
    let sumSq = 0;
    for (let j = 0; j < period; j++) sumSq += Math.pow(data[i - j].close - sma, 2);
    const std = Math.sqrt(sumSq / period);

    middle.push(sma);
    upper.push(sma + std * stdDev);
    lower.push(sma - std * stdDev);
  }
  return { upper, middle, lower };
}

function toOHLCV(data: CandleData[]): OHLCV[] {
  return data.map((d, i) => ({
    timestamp: typeof d.time === 'number' ? d.time * 1000 : i,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume || 0
  }));
}

// --- TradingView-Style Constants ---
const Y_AXIS_WIDTH = 70;
const X_AXIS_HEIGHT = 25;
const SLIDER_HEIGHT = 25;
const MIN_BARS_VISIBLE = 10;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// --- Main Component ---

export function TradingChart({
  data,
  height = 600,
  indicators = {},
  onCrosshairMove
}: TradingChartProps): React.ReactElement {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // === TradingView-Style Zoom State ===
  const [xRange, setXRange] = useState({ start: 70, end: 100 });
  const [yRange, setYRange] = useState<{ min: number | null, max: number | null }>({ min: null, max: null });
  const [dragMode, setDragMode] = useState<'none' | 'pan' | 'yScale' | 'xScale'>('none');
  
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startXRange: { start: 70, end: 100 },
    startYRange: { min: 0, max: 0 }
  });

  // === Calculate visible price range ===
  const visibleDataRange = useMemo(() => {
    if (!data || data.length === 0) return { min: 0, max: 100 };
    
    const startIdx = Math.floor(data.length * xRange.start / 100);
    const endIdx = Math.ceil(data.length * xRange.end / 100);
    const visible = data.slice(Math.max(0, startIdx), Math.min(data.length, endIdx + 1));
    
    if (visible.length === 0) return { min: 0, max: 100 };
    
    let min = Infinity, max = -Infinity;
    visible.forEach(d => {
      min = Math.min(min, d.low);
      max = Math.max(max, d.high);
    });
    
    const pad = (max - min) * 0.1;
    return { min: min - pad, max: max + pad };
  }, [data, xRange]);

  // === Current Y bounds ===
  const currentYBounds = useMemo(() => {
    if (yRange.min !== null && yRange.max !== null) {
      return { min: yRange.min, max: yRange.max };
    }
    return visibleDataRange;
  }, [yRange, visibleDataRange]);

  // === Wheel Handler - TradingView Style (Zoom In/Out) ===
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current || !data || data.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const chartW = rect.width - Y_AXIS_WIDTH;
    const chartH = rect.height - X_AXIS_HEIGHT - SLIDER_HEIGHT;
    
    // اتجاه التكبير: عجلة للأعلى = تكبير (zoom in)، للأسفل = تصغير (zoom out)
    const zoomIn = e.deltaY < 0;
    
    // Ctrl + Wheel = تكبير عمودي (الأسعار)
    if (e.ctrlKey) {
      const factor = zoomIn ? 0.9 : 1.1;
      const { min, max } = currentYBounds;
      const range = max - min;
      const center = (min + max) / 2;
      const baseRange = visibleDataRange.max - visibleDataRange.min;
      const newRange = clamp(range * factor, baseRange * 0.1, baseRange * 5);
      
      setYRange({
        min: center - newRange / 2,
        max: center + newRange / 2
      });
      return;
    }
    
    // Y-Axis zone: zoom price vertically
    if (mouseX > chartW && mouseY < chartH) {
      const factor = zoomIn ? 0.9 : 1.1;
      const { min, max } = currentYBounds;
      const range = max - min;
      const center = (min + max) / 2;
      const baseRange = visibleDataRange.max - visibleDataRange.min;
      const newRange = clamp(range * factor, baseRange * 0.1, baseRange * 5);
      
      setYRange({
        min: center - newRange / 2,
        max: center + newRange / 2
      });
      return;
    }

    // Chart area: zoom time horizontally (centered on cursor position)
    const ratio = clamp(mouseX / chartW, 0, 1);
    const { start, end } = xRange;
    const range = end - start;
    
    // تكبير = نطاق أصغر، تصغير = نطاق أكبر
    const factor = zoomIn ? 0.85 : 1.18;
    const minR = (MIN_BARS_VISIBLE / data.length) * 100;
    let newRange = clamp(range * factor, minR, 100);
    
    // حساب الموقع الجديد متمركزاً على موقع المؤشر
    const cursorPos = start + range * ratio;
    let newStart = cursorPos - newRange * ratio;
    let newEnd = newStart + newRange;
    
    // ضبط الحدود
    if (newStart < 0) { 
      newStart = 0; 
      newEnd = Math.min(newRange, 100); 
    }
    if (newEnd > 100) { 
      newEnd = 100; 
      newStart = Math.max(0, 100 - newRange); 
    }
    
    setXRange({ start: newStart, end: newEnd });
  }, [data, xRange, currentYBounds, visibleDataRange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // === Mouse Down - Detect zone ===
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartW = rect.width - Y_AXIS_WIDTH;
    const chartH = rect.height - X_AXIS_HEIGHT - SLIDER_HEIGHT;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startXRange: { ...xRange },
      startYRange: { ...currentYBounds }
    };

    if (x > chartW && y < chartH) {
      setDragMode('yScale');
    } else if (y > chartH && y < chartH + X_AXIS_HEIGHT && x < chartW) {
      setDragMode('xScale');
    } else if (x < chartW && y < chartH) {
      setDragMode('pan');
    }
  }, [xRange, currentYBounds]);

  // === Mouse Move ===
  useEffect(() => {
    if (dragMode === 'none') return;

    const onMove = (e: MouseEvent) => {
      const { startX, startY, startXRange, startYRange } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const chartW = rect.width - Y_AXIS_WIDTH;
      const chartH = rect.height - X_AXIS_HEIGHT - SLIDER_HEIGHT;

      if (dragMode === 'pan') {
        // Pan horizontally
        const xLen = startXRange.end - startXRange.start;
        const pxPerPct = chartW / xLen;
        const shift = -(dx / pxPerPct);
        
        let ns = clamp(startXRange.start + shift, 0, 100 - xLen);
        let ne = ns + xLen;
        if (ne > 100) { ne = 100; ns = 100 - xLen; }
        
        setXRange({ start: ns, end: ne });
      }
      
      if (dragMode === 'yScale') {
        // Y-axis drag: down = zoom in, up = zoom out
        const factor = 1 + dy * 0.006;
        const range = startYRange.max - startYRange.min;
        const center = (startYRange.min + startYRange.max) / 2;
        const minRange = (visibleDataRange.max - visibleDataRange.min) * 0.05;
        const maxRange = (visibleDataRange.max - visibleDataRange.min) * 10;
        const newRange = clamp(range * factor, minRange, maxRange);
        
        setYRange({
          min: center - newRange / 2,
          max: center + newRange / 2
        });
      }
      
      if (dragMode === 'xScale') {
        // X-axis drag: right = zoom out, left = zoom in
        const xLen = startXRange.end - startXRange.start;
        const center = (startXRange.start + startXRange.end) / 2;
        const minR = (MIN_BARS_VISIBLE / (data?.length || 100)) * 100;
        const change = dx * 0.2;
        const newLen = clamp(xLen + change, minR, 100);
        
        let ns = clamp(center - newLen / 2, 0, 100);
        let ne = clamp(center + newLen / 2, 0, 100);
        if (ns === 0) ne = Math.min(newLen, 100);
        if (ne === 100) ns = Math.max(0, 100 - newLen);
        
        setXRange({ start: ns, end: ne });
      }
    };

    const onUp = () => setDragMode('none');

    const cursors = { pan: 'grabbing', yScale: 'ns-resize', xScale: 'ew-resize' };
    document.body.style.cursor = cursors[dragMode] || '';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragMode, data, visibleDataRange]);

  // === Double-click reset ===
  const handleDoubleClick = useCallback(() => {
    setXRange({ start: 70, end: 100 });
    setYRange({ min: null, max: null });
  }, []);

  // === Sync zoom with chart ===
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.dispatchAction({
        type: 'dataZoom',
        start: xRange.start,
        end: xRange.end
      });
    }
  }, [xRange]);

  // === Build Option ===
  const option = useMemo(() => {
    if (!data || data.length === 0) return {};

    const dates = data.map(d => {
      if (typeof d.time === 'number') return new Date(d.time * 1000).toLocaleString();
      return d.time.toString();
    });

    const values = data.map(d => [d.open, d.close, d.low, d.high]);

    const series: any[] = [
      {
        name: 'Price',
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350'
        },
        markPoint: {
          label: { formatter: (p: any) => p != null ? Math.round(p.value) + '' : '' },
          data: [
            { name: 'Max', type: 'max', valueDim: 'highest' },
            { name: 'Min', type: 'min', valueDim: 'lowest' }
          ]
        }
      }
    ];

    // Indicators
    if (indicators.sma10) series.push({ name: 'SMA 10', type: 'line', data: calculateSMA(data, 10), smooth: true, lineStyle: { width: 1, color: '#2196f3' }, symbol: 'none' });
    if (indicators.sma25) series.push({ name: 'SMA 25', type: 'line', data: calculateSMA(data, 25), smooth: true, lineStyle: { width: 1, color: '#9c27b0' }, symbol: 'none' });
    if (indicators.sma50) series.push({ name: 'SMA 50', type: 'line', data: calculateSMA(data, 50), smooth: true, lineStyle: { width: 1, color: '#ff9800' }, symbol: 'none' });
    if (indicators.sma100) series.push({ name: 'SMA 100', type: 'line', data: calculateSMA(data, 100), smooth: true, lineStyle: { width: 1, color: '#4caf50' }, symbol: 'none' });
    if (indicators.sma200) series.push({ name: 'SMA 200', type: 'line', data: calculateSMA(data, 200), smooth: true, lineStyle: { width: 2, color: '#f44336' }, symbol: 'none' });

    if (indicators.ema10) series.push({ name: 'EMA 10', type: 'line', data: calculateEMA(data, 10), smooth: true, lineStyle: { width: 1 }, symbol: 'none' });
    if (indicators.ema25) series.push({ name: 'EMA 25', type: 'line', data: calculateEMA(data, 25), smooth: true, lineStyle: { width: 1 }, symbol: 'none' });
    if (indicators.ema50) series.push({ name: 'EMA 50', type: 'line', data: calculateEMA(data, 50), smooth: true, lineStyle: { width: 1 }, symbol: 'none' });
    if (indicators.ema100) series.push({ name: 'EMA 100', type: 'line', data: calculateEMA(data, 100), smooth: true, lineStyle: { width: 1 }, symbol: 'none' });
    if (indicators.ema200) series.push({ name: 'EMA 200', type: 'line', data: calculateEMA(data, 200), smooth: true, lineStyle: { width: 2 }, symbol: 'none' });

    if (indicators.bollingerBands) {
      const bb = calculateBollingerBands(data);
      series.push(
        { name: 'BB Upper', type: 'line', data: bb.upper, smooth: true, lineStyle: { opacity: 0.5, color: '#2196f3' }, symbol: 'none' },
        { name: 'BB Middle', type: 'line', data: bb.middle, smooth: true, lineStyle: { opacity: 0.5, color: '#ff9800' }, symbol: 'none' },
        { name: 'BB Lower', type: 'line', data: bb.lower, smooth: true, lineStyle: { opacity: 0.5, color: '#2196f3' }, symbol: 'none' }
      );
    }

    const ohlcv = toOHLCV(data);
    

    if (indicators.ichimoku) {
      const result = calculateIchimoku(ohlcv);
      series.push(
        { name: 'Tenkan', type: 'line', data: result.tenkan, smooth: true, lineStyle: { width: 1, color: '#2962ff' }, symbol: 'none' },
        { name: 'Kijun', type: 'line', data: result.kijun, smooth: true, lineStyle: { width: 1, color: '#b71c1c' }, symbol: 'none' },
        { name: 'Senkou A', type: 'line', data: result.senkouA, smooth: true, lineStyle: { width: 1, color: 'rgba(76, 175, 80, 0.5)' }, symbol: 'none' },
        { name: 'Senkou B', type: 'line', data: result.senkouB, smooth: true, lineStyle: { width: 1, color: 'rgba(244, 67, 54, 0.5)' }, symbol: 'none' }
      );
    }
    
    if (indicators.keltner) {
      const result = calculateKeltnerChannels(ohlcv);
      series.push(
        { name: 'Keltner Upper', type: 'line', data: result.upper, smooth: true, lineStyle: { opacity: 0.6, color: '#00bcd4' }, symbol: 'none' },
        { name: 'Keltner Middle', type: 'line', data: result.middle, smooth: true, lineStyle: { opacity: 0.6, color: '#00bcd4' }, symbol: 'none' },
        { name: 'Keltner Lower', type: 'line', data: result.lower, smooth: true, lineStyle: { opacity: 0.6, color: '#00bcd4' }, symbol: 'none' }
      );
    }
    
    if (indicators.donchian) {
      const result = calculateDonchianChannels(ohlcv);
      series.push(
        { name: 'Donchian Upper', type: 'line', data: result.upper, smooth: false, lineStyle: { opacity: 0.5, color: '#9c27b0' }, symbol: 'none' },
        { name: 'Donchian Middle', type: 'line', data: result.middle, smooth: false, lineStyle: { opacity: 0.5, color: '#9c27b0', type: 'dashed' }, symbol: 'none' },
        { name: 'Donchian Lower', type: 'line', data: result.lower, smooth: false, lineStyle: { opacity: 0.5, color: '#9c27b0' }, symbol: 'none' }
      );
    }
    
    if (indicators.atrBands) {
      const result = calculateATRBands(ohlcv);
      series.push(
        { name: 'ATR Upper', type: 'line', data: result.upper, smooth: true, lineStyle: { opacity: 0.4, type: 'dashed', color: '#ff5722' }, symbol: 'none' },
        { name: 'ATR Lower', type: 'line', data: result.lower, smooth: true, lineStyle: { opacity: 0.4, type: 'dashed', color: '#ff5722' }, symbol: 'none' }
      );
    }
    
    if (indicators.parabolicSar) {
      const result = calculateParabolicSAR(ohlcv);
      series.push({
        name: 'PSAR',
        type: 'scatter',
        data: result.sar,
        symbolSize: 4,
        itemStyle: { color: '#ffc107' }
      });
    }

    // خطوط الاتجاه التلقائية
    if (indicators.trendlines) {
      const trendlines = calculateAutoTrendlines(ohlcv);
      // خطوط الدعم
      trendlines.support.forEach((lineData, idx) => {
        series.push({
          name: `Support Trendline ${idx + 1}`,
          type: 'line',
          data: lineData,
          symbol: 'none',
          lineStyle: { color: '#4caf50', width: 2, type: 'solid' }
        });
      });
      // خطوط المقاومة
      trendlines.resistance.forEach((lineData, idx) => {
        series.push({
          name: `Resistance Trendline ${idx + 1}`,
          type: 'line',
          data: lineData,
          symbol: 'none',
          lineStyle: { color: '#f44336', width: 2, type: 'solid' }
        });
      });
    }

    // المستويات الأفقية (الدعم والمقاومة)
    if (indicators.horizontalLevels) {
      const levels = calculateHorizontalLevels(ohlcv);
      // مستويات الدعم
      levels.support.forEach((price, idx) => {
        const levelData = new Array(data.length).fill(price);
        series.push({
          name: `Support Level ${idx + 1}`,
          type: 'line',
          data: levelData,
          symbol: 'none',
          lineStyle: { color: '#2196f3', width: 1.5, type: 'dashed' }
        });
      });
      // مستويات المقاومة
      levels.resistance.forEach((price, idx) => {
        const levelData = new Array(data.length).fill(price);
        series.push({
          name: `Resistance Level ${idx + 1}`,
          type: 'line',
          data: levelData,
          symbol: 'none',
          lineStyle: { color: '#ff5722', width: 1.5, type: 'dashed' }
        });
      });
    }

    // فيبوناتشي
    if (indicators.fibonacciRetracements) {
      const fibLevels = calculateFibonacciLevels(ohlcv);
      const fibColors: Record<string, string> = {
        '0.0%': '#ffffff',
        '23.6%': '#2196f3',
        '38.2%': '#4caf50',
        '50.0%': '#ff9800',
        '61.8%': '#f44336',
        '78.6%': '#9c27b0',
        '100.0%': '#ffffff'
      };
      fibLevels.forEach(fib => {
        const fibData = new Array(data.length).fill(fib.price);
        series.push({
          name: `Fib ${fib.label}`,
          type: 'line',
          data: fibData,
          symbol: 'none',
          lineStyle: { 
            color: fibColors[fib.label] || '#ffffff', 
            width: 1, 
            type: 'dotted' 
          }
        });
      });
    }

    // الدعم والمقاومة العمودية
    if (indicators.verticalSupport || indicators.verticalResistance) {
      const recentData = ohlcv.slice(-50);
      const highs = recentData.map(d => d.high);
      const lows = recentData.map(d => d.low);
      
      if (indicators.verticalResistance) {
        const maxHigh = Math.max(...highs);
        series.push({
          name: 'Vertical Resistance',
          type: 'line',
          data: new Array(data.length).fill(maxHigh),
          symbol: 'none',
          lineStyle: { color: '#f44336', width: 2, type: 'solid' }
        });
      }
      
      if (indicators.verticalSupport) {
        const minLow = Math.min(...lows);
        series.push({
          name: 'Vertical Support',
          type: 'line',
          data: new Array(data.length).fill(minLow),
          symbol: 'none',
          lineStyle: { color: '#4caf50', width: 2, type: 'solid' }
        });
      }
    }

    // مناطق التلاقي (Confluence Zones)
    if (indicators.confluenceZones) {
      // حساب مناطق التلاقي من تقاطع مستويات متعددة
      const ma20 = ohlcv.slice(-20).reduce((sum, d) => sum + d.close, 0) / 20;
      const ma50 = ohlcv.slice(-50).reduce((sum, d) => sum + d.close, 0) / Math.min(50, ohlcv.length);
      const tolerance = Math.abs(ma20 - ma50) / ma20;
      
      if (tolerance < 0.02) { // إذا كانت المتوسطات قريبة من بعضها
        const confluencePrice = (ma20 + ma50) / 2;
        series.push({
          name: 'Confluence Zone',
          type: 'line',
          data: new Array(data.length).fill(confluencePrice),
          symbol: 'none',
          lineStyle: { color: '#ff9800', width: 3, type: 'solid' },
          areaStyle: {
            color: 'rgba(255, 152, 0, 0.1)'
          }
        });
      }
    }

    // كشف الاختراقات
    if (indicators.breakoutDetection) {
      const lookback = Math.min(20, ohlcv.length);
      const recentHigh = Math.max(...ohlcv.slice(-lookback).map(d => d.high));
      const recentLow = Math.min(...ohlcv.slice(-lookback).map(d => d.low));
      const lastClose = ohlcv[ohlcv.length - 1].close;
      
      // اختراق صعودي
      if (lastClose > recentHigh * 0.99) {
        series.push({
          name: 'Breakout Level',
          type: 'line',
          data: new Array(data.length).fill(recentHigh),
          symbol: 'none',
          lineStyle: { color: '#4caf50', width: 2, type: 'solid' },
          markPoint: {
            data: [{ 
              name: 'Breakout ↑', 
              coord: [data.length - 1, recentHigh],
              symbol: 'triangle',
              symbolSize: 15,
              itemStyle: { color: '#4caf50' }
            }]
          }
        });
      }
      
      // اختراق هبوطي
      if (lastClose < recentLow * 1.01) {
        series.push({
          name: 'Breakdown Level',
          type: 'line',
          data: new Array(data.length).fill(recentLow),
          symbol: 'none',
          lineStyle: { color: '#f44336', width: 2, type: 'solid' },
          markPoint: {
            data: [{ 
              name: 'Breakdown ↓', 
              coord: [data.length - 1, recentLow],
              symbol: 'triangle',
              symbolRotate: 180,
              symbolSize: 15,
              itemStyle: { color: '#f44336' }
            }]
          }
        });
      }
    }

    // مناطق المخاطرة/العائد
    if (indicators.riskRewardZones) {
      const lastPrice = ohlcv[ohlcv.length - 1].close;
      const atr = ohlcv.slice(-14).reduce((sum, d) => sum + (d.high - d.low), 0) / 14;
      
      // منطقة الهدف (2:1 R/R)
      const targetUp = lastPrice + (atr * 2);
      const targetDown = lastPrice - (atr * 2);
      const stopLoss = lastPrice - atr;
      
      series.push({
        name: 'Target Zone Up',
        type: 'line',
        data: new Array(data.length).fill(targetUp),
        symbol: 'none',
        lineStyle: { color: '#4caf50', width: 1, type: 'dashed' }
      });
      
      series.push({
        name: 'Stop Loss',
        type: 'line',
        data: new Array(data.length).fill(stopLoss),
        symbol: 'none',
        lineStyle: { color: '#f44336', width: 1, type: 'dashed' }
      });
    }

    // Order Blocks (كتل الأوامر - SMC)
    if (indicators.orderBlocks) {
      const lookback = Math.min(50, ohlcv.length);
      for (let i = ohlcv.length - lookback; i < ohlcv.length - 2; i++) {
        if (i < 0) continue;
        const curr = ohlcv[i];
        const next = ohlcv[i + 1];
        
        // Bullish Order Block
        if (curr.close < curr.open && next.close > next.open && next.close > curr.high) {
          series.push({
            name: 'Bullish OB',
            type: 'line',
            data: new Array(data.length).fill(null).map((_, idx) => 
              idx >= i && idx <= data.length - 1 ? curr.low : null
            ),
            symbol: 'none',
            lineStyle: { color: '#4caf50', width: 2, opacity: 0.7 },
            areaStyle: { color: 'rgba(76, 175, 80, 0.1)' }
          });
        }
        
        // Bearish Order Block
        if (curr.close > curr.open && next.close < next.open && next.close < curr.low) {
          series.push({
            name: 'Bearish OB',
            type: 'line',
            data: new Array(data.length).fill(null).map((_, idx) => 
              idx >= i && idx <= data.length - 1 ? curr.high : null
            ),
            symbol: 'none',
            lineStyle: { color: '#f44336', width: 2, opacity: 0.7 },
            areaStyle: { color: 'rgba(244, 67, 54, 0.1)' }
          });
        }
      }
    }

    // Fair Value Gaps (FVG - فجوات القيمة العادلة)
    if (indicators.fairValueGaps) {
      for (let i = 1; i < ohlcv.length - 1; i++) {
        const prev = ohlcv[i - 1];
        const next = ohlcv[i + 1];
        
        // Bullish FVG
        if (prev.high < next.low) {
          const fvgData = new Array(data.length).fill(null);
          for (let j = i; j < Math.min(i + 20, data.length); j++) {
            fvgData[j] = (prev.high + next.low) / 2;
          }
          series.push({
            name: 'Bullish FVG',
            type: 'line',
            data: fvgData,
            symbol: 'none',
            lineStyle: { color: '#4caf50', width: 1, type: 'dotted' }
          });
        }
        
        // Bearish FVG
        if (prev.low > next.high) {
          const fvgData = new Array(data.length).fill(null);
          for (let j = i; j < Math.min(i + 20, data.length); j++) {
            fvgData[j] = (prev.low + next.high) / 2;
          }
          series.push({
            name: 'Bearish FVG',
            type: 'line',
            data: fvgData,
            symbol: 'none',
            lineStyle: { color: '#f44336', width: 1, type: 'dotted' }
          });
        }
      }
    }

    // Liquidity Sweeps (كشف السيولة)
    if (indicators.liquiditySweeps) {
      const lookback = 20;
      for (let i = lookback; i < ohlcv.length; i++) {
        const curr = ohlcv[i];
        const prevHighs = ohlcv.slice(i - lookback, i).map(d => d.high);
        const prevLows = ohlcv.slice(i - lookback, i).map(d => d.low);
        const maxPrevHigh = Math.max(...prevHighs);
        const minPrevLow = Math.min(...prevLows);
        
        // كشف صعود السيولة (sweep up)
        if (curr.high > maxPrevHigh && curr.close < maxPrevHigh) {
          series.push({
            name: 'Liquidity Sweep Up',
            type: 'scatter',
            data: [[i, curr.high]],
            symbolSize: 12,
            symbol: 'diamond',
            itemStyle: { color: '#f44336' }
          });
        }
        
        // كشف هبوط السيولة (sweep down)
        if (curr.low < minPrevLow && curr.close > minPrevLow) {
          series.push({
            name: 'Liquidity Sweep Down',
            type: 'scatter',
            data: [[i, curr.low]],
            symbolSize: 12,
            symbol: 'diamond',
            itemStyle: { color: '#4caf50' }
          });
        }
      }
    }

    // Patterns
    const enabledPatternTypes: PatternType[] = [];
    if (indicators.ascendingChannel) enabledPatternTypes.push("ascending_channel");
    if (indicators.descendingChannel) enabledPatternTypes.push("descending_channel");
    if (indicators.ascendingTriangle) enabledPatternTypes.push("ascending_triangle");
    if (indicators.descendingTriangle) enabledPatternTypes.push("descending_triangle");
    if (indicators.symmetricalTriangle) enabledPatternTypes.push("symmetrical_triangle");
    if (indicators.bullFlag) enabledPatternTypes.push("bull_flag");
    if (indicators.bearFlag) enabledPatternTypes.push("bear_flag");
    if (indicators.bullPennant) enabledPatternTypes.push("bull_pennant");
    if (indicators.bearPennant) enabledPatternTypes.push("bear_pennant");
    if (indicators.continuationRisingWedge || indicators.reversalRisingWedge) enabledPatternTypes.push("rising_wedge");
    if (indicators.continuationFallingWedge || indicators.reversalFallingWedge) enabledPatternTypes.push("falling_wedge");
    if (indicators.ascendingBroadeningWedge) enabledPatternTypes.push("ascending_broadening_wedge");
    if (indicators.descendingBroadeningWedge) enabledPatternTypes.push("descending_broadening_wedge");

    if (enabledPatternTypes.length > 0 && data.length >= 40) {
      const patterns = detectChartPatterns(ohlcv, { enabledPatterns: enabledPatternTypes });
      
      const visiblePatterns = patterns.filter(p => {
        const bars = Math.max(1, (p.endIdx - p.startIdx) + 1);
        const lookback = Math.min(1000, Math.max(100, Math.round(bars * 10)));
        return p.endIdx >= (data.length - 1) - lookback;
      }).slice(0, 20);

      visiblePatterns.forEach((pattern) => {
        if (pattern.breakoutDirection === 'neutral') {
           const resolution = resolveEffectiveBreakoutDirection({
              originalDirection: pattern.breakoutDirection,
              priorTrend: pattern.priorTrend,
           });
           pattern.effectiveBreakoutDirection = resolution.effectiveDirection;
        }

        const lifecycle = evaluateChartPatternLifecycle(pattern, ohlcv);
        const lines = generatePatternLines(pattern, data.length, 15);
        const color = lifecycle.direction === 'up' ? '#4caf50' : '#f44336';

        series.push({
          name: `${pattern.name} Upper`,
          type: 'line',
          data: lines.upper,
          symbol: 'none',
          lineStyle: { color, type: 'solid', width: 2 }
        });

        series.push({
          name: `${pattern.name} Lower`,
          type: 'line',
          data: lines.lower,
          symbol: 'none',
          lineStyle: { color, type: 'solid', width: 2 }
        });
      });
    }

    if (indicators.headAndShoulders) {
      const hsPatterns = detectHeadAndShoulders(ohlcv);
      hsPatterns.forEach(p => {
        const necklineData = new Array(data.length).fill(null);
        for (let i = p.startIndex; i <= p.endIndex; i++) {
           necklineData[i] = p.necklineStart.price + p.necklineSlope * (i - p.necklineStart.index);
        }
        series.push({
          name: 'H&S Neckline',
          type: 'line',
          data: necklineData,
          lineStyle: { color: '#f44336', width: 2, type: 'dashed' },
          symbol: 'none'
        });
      });
    }

    // Double Top / Double Bottom
    if (indicators.doubleTop || indicators.doubleBottom) {
      const dtPatterns = detectDoubleTopBottom(ohlcv);
      dtPatterns.forEach(p => {
        const levelData = new Array(data.length).fill(null);
        const peakPrice = p.first.price;
        for (let i = p.startIndex; i <= Math.min(p.endIndex + 10, data.length - 1); i++) {
          levelData[i] = peakPrice;
        }
        
        // فقط إذا كان النوع المطلوب مفعّل
        const isDoubleTop = p.type === 'double_top' && indicators.doubleTop;
        const isDoubleBottom = p.type === 'double_bottom' && indicators.doubleBottom;
        
        if (isDoubleTop || isDoubleBottom) {
          series.push({
            name: p.type === 'double_top' ? 'Double Top' : 'Double Bottom',
            type: 'line',
            data: levelData,
            lineStyle: { 
              color: p.type === 'double_top' ? '#f44336' : '#4caf50', 
              width: 2, 
              type: 'dashed' 
            },
            symbol: 'none'
          });
        }
      });
    }

    // ==========================================================
    // ⚠️ OLD ULTRA CODE DISABLED - Now using AI Agents System below
    // ==========================================================

    // ==========================================================
    // 🤖 AI AGENTS SYSTEM - نظام الوكلاء الذكيين
    // ==========================================================
    
    // Get all detected patterns once (for efficiency)
    const allUltraPatterns = detectUltraPatterns(ohlcv);
    const recentThreshold = Math.floor(data.length * 0.1); // أحدث 10% من البيانات

    // ==========================================================
    // 🎯 AGENT 1: Ultra Precision - القنوات والأعلام الدقيقة
    // ==========================================================
    if ((indicators as any).agent1UltraPrecision) {
      
      
      // Ascending Channel
      allUltraPatterns.filter(p => p.type === 'ascending_channel' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A1: Ascending Channel Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#00e676', width: 3, type: 'solid' } });
        series.push({ name: 'A1: Ascending Channel Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#00e676', width: 3, type: 'solid' } });
      });
      
      // Descending Channel
      allUltraPatterns.filter(p => p.type === 'descending_channel' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A1: Descending Channel Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#ff1744', width: 3, type: 'solid' } });
        series.push({ name: 'A1: Descending Channel Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#ff1744', width: 3, type: 'solid' } });
      });
      
      // Bull Flag
      allUltraPatterns.filter(p => p.type === 'bull_flag' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A1: Bull Flag Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#4ade80', width: 2, type: 'dashed' } });
        series.push({ name: 'A1: Bull Flag Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#4ade80', width: 2, type: 'dashed' } });
      });
      
      // Bear Flag
      allUltraPatterns.filter(p => p.type === 'bear_flag' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A1: Bear Flag Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#f87171', width: 2, type: 'dashed' } });
        series.push({ name: 'A1: Bear Flag Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#f87171', width: 2, type: 'dashed' } });
      });
    }

    // ==========================================================
    // 📊 AGENT 2: Classic Patterns - الأنماط الكلاسيكية
    // ==========================================================
    if ((indicators as any).agent2ClassicPatterns) {
      
      
      // Head and Shoulders
      allUltraPatterns.filter(p => p.type === 'head_and_shoulders' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: H&S Neckline', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#ef4444', width: 3, type: 'dashed' } });
      });
      
      // Inverse Head and Shoulders
      allUltraPatterns.filter(p => p.type === 'inverse_head_and_shoulders' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: Inv H&S Neckline', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#22c55e', width: 3, type: 'dashed' } });
      });
      
      // Double Top
      allUltraPatterns.filter(p => p.type === 'double_top' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: Double Top', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#dc2626', width: 3, type: 'solid' } });
        series.push({ name: 'A2: Double Top Neck', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#fbbf24', width: 2, type: 'dashed' } });
      });
      
      // Double Bottom
      allUltraPatterns.filter(p => p.type === 'double_bottom' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: Double Bottom', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#16a34a', width: 3, type: 'solid' } });
        series.push({ name: 'A2: Double Bottom Neck', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#fbbf24', width: 2, type: 'dashed' } });
      });
      
      // Triple Top
      allUltraPatterns.filter(p => p.type === 'triple_top' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: Triple Top', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#b91c1c', width: 3, type: 'solid' } });
      });
      
      // Triple Bottom
      allUltraPatterns.filter(p => p.type === 'triple_bottom' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: Triple Bottom', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#15803d', width: 3, type: 'solid' } });
      });
      
      // Cup and Handle
      allUltraPatterns.filter(p => p.type === 'cup_and_handle' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A2: Cup Rim', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#8b5cf6', width: 3, type: 'solid' } });
      });
    }

    // ==========================================================
    // 📐 AGENT 3: Geometric Patterns - المثلثات والأوتاد
    // ==========================================================
    if ((indicators as any).agent3GeometricPatterns) {
      
      
      // Ascending Triangle
      allUltraPatterns.filter(p => p.type === 'ascending_triangle' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A3: Asc Triangle Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#4ade80', width: 2, type: 'solid' } });
        series.push({ name: 'A3: Asc Triangle Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#4ade80', width: 2, type: 'dashed' } });
      });
      
      // Descending Triangle
      allUltraPatterns.filter(p => p.type === 'descending_triangle' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A3: Desc Triangle Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#f87171', width: 2, type: 'dashed' } });
        series.push({ name: 'A3: Desc Triangle Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#f87171', width: 2, type: 'solid' } });
      });
      
      // Symmetrical Triangle
      allUltraPatterns.filter(p => p.type === 'symmetrical_triangle' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A3: Sym Triangle Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#facc15', width: 2, type: 'solid' } });
        series.push({ name: 'A3: Sym Triangle Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#facc15', width: 2, type: 'solid' } });
      });
      
      // Rising Wedge
      allUltraPatterns.filter(p => p.type === 'rising_wedge' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A3: Rising Wedge Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#fb923c', width: 2, type: 'solid' } });
        series.push({ name: 'A3: Rising Wedge Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#fb923c', width: 2, type: 'solid' } });
      });
      
      // Falling Wedge
      allUltraPatterns.filter(p => p.type === 'falling_wedge' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A3: Falling Wedge Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2, type: 'solid' } });
        series.push({ name: 'A3: Falling Wedge Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2, type: 'solid' } });
      });
    }

    // ==========================================================
    // 🏳️ AGENT 4: Continuation Patterns - الرايات والاستمرارية
    // ==========================================================
    if ((indicators as any).agent4ContinuationPatterns) {
      
      
      // Bull Pennant
      allUltraPatterns.filter(p => p.type === 'bull_pennant' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A4: Bull Pennant Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#22d3ee', width: 2, type: 'solid' } });
        series.push({ name: 'A4: Bull Pennant Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#22d3ee', width: 2, type: 'solid' } });
      });
      
      // Bear Pennant
      allUltraPatterns.filter(p => p.type === 'bear_pennant' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A4: Bear Pennant Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#f472b6', width: 2, type: 'solid' } });
        series.push({ name: 'A4: Bear Pennant Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#f472b6', width: 2, type: 'solid' } });
      });
      
      // Rectangle
      allUltraPatterns.filter(p => p.type === 'rectangle' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A4: Rectangle Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#8b5cf6', width: 2, type: 'solid' } });
        series.push({ name: 'A4: Rectangle Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#8b5cf6', width: 2, type: 'solid' } });
      });
      
      // Broadening Pattern
      allUltraPatterns.filter(p => p.type === 'broadening_pattern' && p.startIdx >= recentThreshold).forEach(pattern => {
        const lines = generatePatternLines(pattern, data.length, 0);
        series.push({ name: 'A4: Broadening Upper', type: 'line', data: lines.upper, symbol: 'none', lineStyle: { color: '#ec4899', width: 2, type: 'solid' } });
        series.push({ name: 'A4: Broadening Lower', type: 'line', data: lines.lower, symbol: 'none', lineStyle: { color: '#ec4899', width: 2, type: 'solid' } });
      });
    }

    // 🌊 Wolfe Wave Pattern Detection
    if ((indicators as any).wolfeWavePattern) {
      const wolfePatterns = detectWolfeWaves(ohlcv);
      wolfePatterns.forEach((pattern, idx) => {
        const isBullish = pattern.type === 'wolfe_wave_bullish';
        const color = isBullish ? '#06b6d4' : '#f43f5e';
        
        // رسم خطوط النموذج (1-3-5 و 2-4)
        const points = pattern.points;
        
        // خط 1-3-5 (القيعان أو القمم)
        const line135Data = new Array(data.length).fill(null);
        for (let i = points[0].index; i <= points[4].index; i++) {
          const slope = (points[2].price - points[0].price) / (points[2].index - points[0].index);
          line135Data[i] = points[0].price + slope * (i - points[0].index);
        }
        series.push({
          name: `Wolfe Wave ${idx + 1} - Line 1-3-5`,
          type: 'line',
          data: line135Data,
          symbol: 'none',
          lineStyle: { color, width: 2, type: 'dashed' }
        });
        
        // خط 2-4
        const line24Data = new Array(data.length).fill(null);
        for (let i = points[1].index; i <= points[3].index; i++) {
          const slope = (points[3].price - points[1].price) / (points[3].index - points[1].index);
          line24Data[i] = points[1].price + slope * (i - points[1].index);
        }
        series.push({
          name: `Wolfe Wave ${idx + 1} - Line 2-4`,
          type: 'line',
          data: line24Data,
          symbol: 'none',
          lineStyle: { color, width: 2, type: 'dashed' }
        });
        
        // خط الهدف (1-4 ممتد)
        const targetLineData = new Array(data.length).fill(null);
        const targetSlope = pattern.targetLine.slope;
        for (let i = points[0].index; i < Math.min(data.length, points[4].index + 30); i++) {
          targetLineData[i] = pattern.targetLine.intercept + targetSlope * i;
        }
        series.push({
          name: `Wolfe Wave ${idx + 1} - Target Line`,
          type: 'line',
          data: targetLineData,
          symbol: 'none',
          lineStyle: { color: '#fbbf24', width: 3, type: 'solid' }
        });
        
        // رسم نقاط 1-5
        const pointsData = points.map(p => [p.index, p.price]);
        series.push({
          name: `Wolfe Wave ${idx + 1} - Points`,
          type: 'scatter',
          data: pointsData,
          symbol: 'circle',
          symbolSize: 12,
          itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
          label: {
            show: true,
            formatter: (params: any) => `${params.dataIndex + 1}`,
            position: 'top',
            color: '#fff',
            fontSize: 10
          }
        });
        
        // رسم مستويات الدخول والهدف ووقف الخسارة
        const entryLine = new Array(data.length).fill(null);
        const slLine = new Array(data.length).fill(null);
        const tpLine = new Array(data.length).fill(null);
        
        for (let i = points[4].index; i < data.length; i++) {
          entryLine[i] = pattern.entryPrice;
          slLine[i] = pattern.stopLoss;
          tpLine[i] = pattern.targetPrice;
        }
        
        // Entry Line
        series.push({
          name: `Wolfe Wave ${idx + 1} - Entry`,
          type: 'line',
          data: entryLine,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' },
          markPoint: {
            symbol: 'pin',
            data: [{ coord: [points[4].index, pattern.entryPrice], value: `Entry: ${pattern.entryPrice.toFixed(2)}` }]
          }
        });
        
        // Stop Loss Line
        series.push({
          name: `Wolfe Wave ${idx + 1} - SL`,
          type: 'line',
          data: slLine,
          symbol: 'none',
          lineStyle: { color: '#ef4444', width: 2, type: 'solid' }
        });
        
        // Target Price Line
        series.push({
          name: `Wolfe Wave ${idx + 1} - TP`,
          type: 'line',
          data: tpLine,
          symbol: 'none',
          lineStyle: { color: '#22c55e', width: 2, type: 'solid' }
        });
      });
    }

    // 📊 Smart Trade Signals - رسم إشارات التداول الذكية
    // يتم رسم Entry/SL/TP لكل نمط مكتشف مع ثقة عالية
    const allDetectedPatterns = detectUltraPatterns(ohlcv).filter(p => p.confidence >= 85);
    if (allDetectedPatterns.length > 0) {
      allDetectedPatterns.slice(0, 3).forEach((pattern, idx) => { // أقصى 3 أنماط
        const signal = calculateSmartSignal(pattern, ohlcv, '1h');
        if (signal) {
          const startIdx = Math.max(pattern.endIdx, data.length - 50);
          const isLong = signal.direction === 'long';
          
          // Entry Line (Blue)
          const entryData = new Array(data.length).fill(null);
          for (let i = startIdx; i < data.length; i++) {
            entryData[i] = signal.entry;
          }
          series.push({
            name: `Trade Signal ${idx + 1} - Entry`,
            type: 'line',
            data: entryData,
            symbol: 'none',
            lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' }
          });
          
          // Stop Loss Line (Red)
          const slData = new Array(data.length).fill(null);
          for (let i = startIdx; i < data.length; i++) {
            slData[i] = signal.stopLoss;
          }
          series.push({
            name: `Trade Signal ${idx + 1} - SL`,
            type: 'line',
            data: slData,
            symbol: 'none',
            lineStyle: { color: '#ef4444', width: 2, type: 'solid' },
            areaStyle: isLong ? { color: 'rgba(239, 68, 68, 0.1)' } : undefined
          });
          
          // Take Profit 1 (Light Green)
          const tp1Data = new Array(data.length).fill(null);
          for (let i = startIdx; i < data.length; i++) {
            tp1Data[i] = signal.takeProfit1;
          }
          series.push({
            name: `Trade Signal ${idx + 1} - TP1`,
            type: 'line',
            data: tp1Data,
            symbol: 'none',
            lineStyle: { color: '#86efac', width: 1, type: 'dotted' }
          });
          
          // Take Profit 2 (Green)
          const tp2Data = new Array(data.length).fill(null);
          for (let i = startIdx; i < data.length; i++) {
            tp2Data[i] = signal.takeProfit2;
          }
          series.push({
            name: `Trade Signal ${idx + 1} - TP2`,
            type: 'line',
            data: tp2Data,
            symbol: 'none',
            lineStyle: { color: '#22c55e', width: 2, type: 'solid' }
          });
          
          // Take Profit 3 (Dark Green)
          const tp3Data = new Array(data.length).fill(null);
          for (let i = startIdx; i < data.length; i++) {
            tp3Data[i] = signal.takeProfit3;
          }
          series.push({
            name: `Trade Signal ${idx + 1} - TP3`,
            type: 'line',
            data: tp3Data,
            symbol: 'none',
            lineStyle: { color: '#15803d', width: 1, type: 'dashed' }
          });
          
          // Area between Entry and TP (Green zone)
          if (isLong) {
            series.push({
              name: `Trade Signal ${idx + 1} - Profit Zone`,
              type: 'line',
              data: tp2Data,
              symbol: 'none',
              lineStyle: { opacity: 0 },
              areaStyle: { color: 'rgba(34, 197, 94, 0.08)' }
            });
          }
        }
      });
    }

    // ==========================================================
    // 💎 SMART MONEY DYNAMICS - Pearson Matrix
    // ==========================================================
    if ((indicators as any).smartMoneyDynamics && data.length >= 100) {
      
      
      try {
        // Using static imports from top of file
        
        // Detect signals
        const signals = detectSmartMoneyDynamics(ohlcv, {
          rangeAMin: 0.80,
          rangeAMax: 1.00,
          rangeBMin: -1.00,
          rangeBMax: -0.80,
          volumeLookback: 100
        });
        
        
        
        // Draw signals on chart
        signals.forEach((signal: { type: string; index: number; price: number; volume?: number }, idx: number) => {
          const isHeavy = signal.type === 'Heavy Buy' || signal.type === 'Heavy Sell';
          const isRPlus = signal.type === 'R+';
          const isRMinus = signal.type === 'R-';
          
          let color = '#ff9800'; // Default orange
          let symbolSize = 10;
          let labelText = signal.type;
          
          if (isRPlus) {
            color = '#ff9800'; // Orange for R+
            labelText = 'Start R+';
          } else if (isRMinus) {
            color = '#2196f3'; // Blue for R-
            labelText = 'Start R-';
          } else if (signal.type === 'Heavy Buy') {
            color = '#089981'; // Green for Heavy Buy
            symbolSize = 14;
            labelText = `Heavy Buy\\n${(signal.volume || 0).toFixed(0)}`;
          } else if (signal.type === 'Heavy Sell') {
            color = '#F23645'; // Red for Heavy Sell
            symbolSize = 14;
            labelText = `Heavy Sell\\n${(signal.volume || 0).toFixed(0)}`;
          }
          
          // Add marker
          series.push({
            name: `SMDB ${signal.type} ${idx + 1}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: isHeavy ? 'diamond' : 'circle',
            symbolSize: symbolSize,
            itemStyle: { 
              color: color,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: labelText,
              position: signal.type.includes('Buy') || isRMinus ? 'bottom' : 'top',
              fontSize: 10,
              color: '#fff',
              backgroundColor: color,
              padding: [3, 6],
              borderRadius: 3
            },
            z: 100
          });
        });
        
        // Calculate and draw P25 Trend Line
        const avgRValues = calculatePearsonMatrix(ohlcv);
        const trendLine = calculateP25TrendLine(ohlcv, avgRValues, 100);
        
        if (trendLine) {
          
          
          // Main trend line (Orange)
          const trendData = new Array(data.length).fill(null);
          for (let i = trendLine.startIndex; i <= trendLine.endIndex; i++) {
            const progress = (i - trendLine.startIndex) / (trendLine.endIndex - trendLine.startIndex);
            trendData[i] = trendLine.startPrice + (trendLine.endPrice - trendLine.startPrice) * progress;
          }
          
          series.push({
            name: 'SMDB P25 Trend',
            type: 'line',
            data: trendData,
            symbol: 'none',
            lineStyle: { 
              color: '#ff9800',
              width: 2,
              type: 'solid'
            },
            z: 50
          });
          
          // Upper band (Red)
          const upperBandData = trendData.map((v, i) => 
            v !== null ? v + trendLine.upperBand : null
          );
          
          series.push({
            name: 'SMDB Upper Band',
            type: 'line',
            data: upperBandData,
            symbol: 'none',
            lineStyle: { 
              color: '#ff6352',
              width: 1,
              type: 'solid'
            },
            z: 49
          });
          
          // Lower band (Green)
          const lowerBandData = trendData.map((v, i) => 
            v !== null ? v - trendLine.lowerBand : null
          );
          
          series.push({
            name: 'SMDB Lower Band',
            type: 'line',
            data: lowerBandData,
            symbol: 'none',
            lineStyle: { 
              color: '#158b13',
              width: 1,
              type: 'solid'
            },
            z: 49
          });
        }
        
      } catch (error) {
        console.error('[SMDB] Error:', error);
      }
    }

    // ==========================================================
    // 🚀 RAVM Matrix - RSI Analytic Volume Matrix
    // ==========================================================
    if ((indicators as any).ravmMatrix && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        
        const closes = ohlcv.map(c => c.close);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const volumes = ohlcv.map(c => c.volume);
        
        const result = calculateRAVMMatrix(closes, highs, lows, volumes);
        
        // Draw Signals
        result.signals.forEach((signal, idx) => {
          const isBullish = signal.type === 'bullish';
          const color = isBullish ? '#00E676' : '#F23645'; // Green / Red
          const warningColor = '#9e9e9e'; // Gray
          const finalColor = signal.confirmed ? color : warningColor;
          
          series.push({
            name: `RAVM Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, isBullish ? lows[signal.index] * 0.995 : highs[signal.index] * 1.005]],
            symbol: 'arrow',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 12,
            itemStyle: {
              color: finalColor,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: signal.label,
              position: isBullish ? 'bottom' : 'top',
              fontSize: 9,
              color: '#fff',
              backgroundColor: finalColor,
              padding: [2, 4],
              borderRadius: 2,
              distance: 10
            },
            z: 100
          });
        });
        
      } catch (error) {
        console.error('[RAVM] Error:', error);
      }
    }

    // ==========================================================
    // 📈 Trend Break Targets + CHOCH
    // ==========================================================
    if ((indicators as any).trendBreakTargets && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        
        const closes = ohlcv.map(c => c.close);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        
        const result = calculateTrendBreakTargets(closes, highs, lows, {
          pivotLeft: 5,
          pivotRight: 5,
          fallbackLookback: 50,
          showTarget2: true,
          showTarget3: true,
          chochLength: 5
        });
        
        // Draw Trendline
        if (result.trendline) {
          const tl = result.trendline;
          const trendlineData = new Array(data.length).fill(null);
          
          for (let i = tl.startIndex; i < data.length; i++) {
            trendlineData[i] = tl.startPrice + tl.slope * (i - tl.startIndex);
          }
          
          series.push({
            name: 'TBT Trendline',
            type: 'line',
            data: trendlineData,
            symbol: 'none',
            lineStyle: {
              color: '#ffffff',
              width: 1,
              type: 'solid'
            },
            z: 40
          });
        }
        
        // Draw TBT Signals & Targets
        result.tbtSignals.forEach((signal, idx) => {
          const isBullish = signal.type === 'bullish_break';
          const color = isBullish ? '#22c55e' : '#ef4444';
          
          // Breakout marker
          series.push({
            name: `TBT Break ${idx}`,
            type: 'scatter',
            data: [[signal.index, isBullish ? lows[signal.index] * 0.998 : highs[signal.index] * 1.002]],
            symbol: 'triangle',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 14,
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: 'BC',
              position: isBullish ? 'bottom' : 'top',
              fontSize: 10,
              color: '#fff',
              backgroundColor: color,
              padding: [2, 4],
              borderRadius: 2
            },
            z: 100
          });
          
          // Target 1 Line
          const t1Data = new Array(data.length).fill(null);
          for (let i = signal.index; i < Math.min(signal.index + 100, data.length); i++) {
            t1Data[i] = signal.targets.t1;
          }
          series.push({
            name: `TBT T1 ${idx}`,
            type: 'line',
            data: t1Data,
            symbol: 'none',
            lineStyle: { color: '#22c55e', width: 1, type: 'dotted' },
            z: 30
          });
          
          // Target 2 Line
          if (signal.targets.t2) {
            const t2Data = new Array(data.length).fill(null);
            for (let i = signal.index; i < Math.min(signal.index + 100, data.length); i++) {
              t2Data[i] = signal.targets.t2;
            }
            series.push({
              name: `TBT T2 ${idx}`,
              type: 'line',
              data: t2Data,
              symbol: 'none',
              lineStyle: { color: '#84cc16', width: 1, type: 'dotted' },
              z: 30
            });
          }
          
          // Target 3 Line
          if (signal.targets.t3) {
            const t3Data = new Array(data.length).fill(null);
            for (let i = signal.index; i < Math.min(signal.index + 100, data.length); i++) {
              t3Data[i] = signal.targets.t3;
            }
            series.push({
              name: `TBT T3 ${idx}`,
              type: 'line',
              data: t3Data,
              symbol: 'none',
              lineStyle: { color: '#14b8a6', width: 1, type: 'dotted' },
              z: 30
            });
          }
        });
        
        // Draw CHOCH Signals
        result.chochSignals.forEach((signal, idx) => {
          const isBullish = signal.type === 'bullish';
          const color = isBullish ? '#22c55e' : '#ef4444';
          
          series.push({
            name: `CHOCH ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'diamond',
            symbolSize: 10,
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: 'CHOCH',
              position: isBullish ? 'bottom' : 'top',
              fontSize: 8,
              color: '#fff',
              backgroundColor: color,
              padding: [1, 3],
              borderRadius: 2
            },
            z: 95
          });
          
          // CHOCH Level Line
          const levelData = new Array(data.length).fill(null);
          const startIdx = Math.max(0, signal.index - 10);
          for (let i = startIdx; i <= signal.index; i++) {
            levelData[i] = signal.swingLevel;
          }
          series.push({
            name: `CHOCH Level ${idx}`,
            type: 'line',
            data: levelData,
            symbol: 'none',
            lineStyle: { color: color, width: 1, type: 'dashed' },
            z: 25
          });
        });
        
        // Draw Pivot Points
        result.pivotHighs.slice(-10).forEach((pivot, idx) => {
          series.push({
            name: `PH ${idx}`,
            type: 'scatter',
            data: [[pivot.index, pivot.price]],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: '#f59e0b', opacity: 0.7 },
            z: 20
          });
        });
        
        result.pivotLows.slice(-10).forEach((pivot, idx) => {
          series.push({
            name: `PL ${idx}`,
            type: 'scatter',
            data: [[pivot.index, pivot.price]],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: '#3b82f6', opacity: 0.7 },
            z: 20
          });
        });
        
      } catch (error) {
        console.error('[TBT] Error:', error);
      }
    }

    // ==========================================================
    // 🟢 Squeeze Momentum Oscillator
    // ==========================================================
    if ((indicators as any).squeezeMomentum && data.length >= 30) {
      
      
      try {
        // Using static imports from top of file
        
        const closes = ohlcv.map(c => c.close);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        
        const result = calculateSqueezeMomentum(closes, highs, lows, {
          bbLength: 20,
          bbMult: 2.0,
          kcLength: 20,
          kcMult: 2.0,
          momentumLength: 20,
          useBreakoutColors: true
        });
        
        // Color mapping
        const histColors: Record<string, string> = {
          'bullish_increasing': 'rgba(34, 197, 94, 0.8)',   // Green bright
          'bullish_decreasing': 'rgba(34, 197, 94, 0.4)',   // Green faded
          'bearish_decreasing': 'rgba(239, 68, 68, 0.8)',   // Red bright
          'bearish_increasing': 'rgba(239, 68, 68, 0.4)'    // Red faded
        };
        
        const dotColors: Record<string, string> = {
          'squeeze_on': '#ef4444',       // Red - squeeze active
          'squeeze_off': 'rgba(34, 197, 94, 0.5)', // Green - no squeeze
          'bullish_breakout': '#d946ef', // Fuchsia
          'bearish_breakout': '#3b82f6'  // Blue
        };
        
        // Draw breakout markers on the price chart
        result.breakoutBars.forEach((breakout, idx) => {
          const isBullish = breakout.type === 'bullish';
          const color = isBullish ? '#d946ef' : '#3b82f6';
          const price = isBullish ? lows[breakout.index] * 0.997 : highs[breakout.index] * 1.003;
          
          series.push({
            name: `Squeeze Breakout ${idx}`,
            type: 'scatter',
            data: [[breakout.index, price]],
            symbol: 'pin',
            symbolSize: 16,
            symbolRotate: isBullish ? 0 : 180,
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: isBullish ? 'SQ↑' : 'SQ↓',
              position: isBullish ? 'bottom' : 'top',
              fontSize: 9,
              color: '#fff',
              backgroundColor: color,
              padding: [2, 4],
              borderRadius: 2,
              distance: 5
            },
            z: 110
          });
        });
        
        // Draw squeeze zones (where BB is inside KC)
        result.squeezeBars.forEach((barIndex) => {
          series.push({
            name: `Squeeze Zone ${barIndex}`,
            type: 'scatter',
            data: [[barIndex, lows[barIndex] * 0.999]],
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: {
              color: '#ef4444',
              opacity: 0.8
            },
            z: 15
          });
        });
        
        // Add momentum info to the last few bars as visual cues
        const lastSignals = result.signals.slice(-5);
        lastSignals.forEach((signal, idx) => {
          const color = histColors[signal.histogramColor];
          const isBullish = signal.momentum >= 0;
          
          // Small momentum indicator on price
          series.push({
            name: `Momentum Cue ${idx}`,
            type: 'scatter',
            data: [[signal.index, isBullish ? highs[signal.index] * 1.001 : lows[signal.index] * 0.999]],
            symbol: 'rect',
            symbolSize: [3, 8],
            itemStyle: {
              color: color
            },
            z: 10
          });
        });
        
      } catch (error) {
        console.error('[Squeeze] Error:', error);
      }
    }

    // ==========================================================
    // 🔷 Wedge and Flag Finder (Multi-Zigzag)
    // ==========================================================
    if ((indicators as any).wedgeFlagFinder && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        
        const closes = ohlcv.map(c => c.close);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        
        const result = detectWedgesAndFlags(closes, highs, lows, {
          zigzagLengths: [5, 8, 13, 21],
          wedgeSize: 5,
          allowWedge: true,
          allowFlag: true,
          minAngleDiff: 5,
          maxAngleDiff: 30
        });
        
        // Color palette for different zigzag levels
        const levelColors = ['#fbbf24', '#8dba51', '#4a9ff5', '#ff998c', '#ff9500'];
        
        // Draw Zigzag lines for each level
        result.zigzags.forEach((zz, levelIdx) => {
          const color = levelColors[levelIdx % levelColors.length];
          
          // Draw zigzag lines connecting pivots
          for (let i = 0; i < zz.pivots.length - 1; i++) {
            const p1 = zz.pivots[i];
            const p2 = zz.pivots[i + 1];
            
            // Create line data
            const lineData = new Array(data.length).fill(null);
            const steps = p2.index - p1.index;
            const priceStep = (p2.price - p1.price) / steps;
            
            for (let j = p1.index; j <= p2.index; j++) {
              lineData[j] = p1.price + priceStep * (j - p1.index);
            }
            
            series.push({
              name: `ZZ L${levelIdx + 1} Seg ${i}`,
              type: 'line',
              data: lineData,
              symbol: 'none',
              lineStyle: {
                color: color,
                width: 1,
                opacity: 0.6
              },
              z: 15
            });
          }
          
          // Draw pivot markers
          zz.pivots.slice(0, 10).forEach((pivot, idx) => {
            series.push({
              name: `ZZ L${levelIdx + 1} P${idx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: pivot.direction === 1 ? 'triangle' : 'triangle',
              symbolRotate: pivot.direction === 1 ? 0 : 180,
              symbolSize: 6,
              itemStyle: {
                color: color,
                opacity: 0.8
              },
              z: 18
            });
          });
        });
        
        // Draw detected patterns
        result.patterns.forEach((pattern, idx) => {
          const isWedge = pattern.type === 'wedge';
          const isBullish = pattern.direction === 'bullish';
          const patternColor = isBullish ? '#22c55e' : '#ef4444';
          const levelColor = levelColors[(pattern.zigzagLevel - 1) % levelColors.length];
          
          // Draw upper trend line
          const upperLineData = new Array(data.length).fill(null);
          const ul = pattern.trendLines.upper;
          const upperSlope = (ul.endPrice - ul.startPrice) / (ul.endIndex - ul.startIndex);
          
          for (let i = ul.startIndex; i <= Math.min(ul.endIndex + 20, data.length - 1); i++) {
            upperLineData[i] = ul.startPrice + upperSlope * (i - ul.startIndex);
          }
          
          series.push({
            name: `Pattern ${idx} Upper`,
            type: 'line',
            data: upperLineData,
            symbol: 'none',
            lineStyle: {
              color: levelColor,
              width: 2,
              type: 'solid'
            },
            z: 35
          });
          
          // Draw lower trend line
          const lowerLineData = new Array(data.length).fill(null);
          const ll = pattern.trendLines.lower;
          const lowerSlope = (ll.endPrice - ll.startPrice) / (ll.endIndex - ll.startIndex);
          
          for (let i = ll.startIndex; i <= Math.min(ll.endIndex + 20, data.length - 1); i++) {
            lowerLineData[i] = ll.startPrice + lowerSlope * (i - ll.startIndex);
          }
          
          series.push({
            name: `Pattern ${idx} Lower`,
            type: 'line',
            data: lowerLineData,
            symbol: 'none',
            lineStyle: {
              color: levelColor,
              width: 2,
              type: 'solid'
            },
            z: 35
          });
          
          // Draw pattern label
          const labelPivot = pattern.pivots[0]; // Most recent pivot
          const labelText = isWedge ? 'Wedge' : 'Flag';
          const labelY = isBullish ? lows[labelPivot.index] * 0.995 : highs[labelPivot.index] * 1.005;
          
          series.push({
            name: `Pattern Label ${idx}`,
            type: 'scatter',
            data: [[labelPivot.index, labelY]],
            symbol: 'roundRect',
            symbolSize: [50, 20],
            itemStyle: {
              color: levelColor,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: labelText,
              position: 'inside',
              fontSize: 10,
              fontWeight: 'bold',
              color: '#000'
            },
            z: 100
          });
          
          // Draw numbered pivot labels
          pattern.pivots.forEach((pivot, pIdx) => {
            series.push({
              name: `Pattern ${idx} Pivot ${pIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'circle',
              symbolSize: 12,
              itemStyle: {
                color: 'rgba(0,0,0,0)',
                borderColor: levelColor,
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: `${pattern.pivots.length - pIdx}`,
                position: pivot.direction === 1 ? 'top' : 'bottom',
                fontSize: 9,
                color: levelColor,
                distance: 5
              },
              z: 90
            });
          });
        });
        
      } catch (error) {
        console.error('[Wedge/Flag] Error:', error);
      }
    }

    // ==========================================================
    // 🔄 Recursive Reversal Chart Patterns (RRCP)
    // ==========================================================
    if ((indicators as any).recursiveReversalPatterns && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        
        const closes = ohlcv.map(c => c.close);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        
        const result = detectReversalPatterns(closes, highs, lows, {
          zigzagLength: 8,
          errorPercent: 13,
          shoulderStart: 0.1,
          shoulderEnd: 0.5,
          enableDoubleTap: true,
          enableTripleTap: true,
          enableCupHandle: true,
          enableHeadShoulders: true,
          riskAdjustment: 13
        });
        
        // Pattern colors
        const patternColors: Record<string, string> = {
          'double_tap': '#fbbf24',
          'triple_tap': '#8dba51',
          'cup_handle': '#4a9ff5',
          'head_shoulders': '#ff998c'
        };
        
        // Draw patterns
        result.patterns.forEach((pattern, idx) => {
          const color = patternColors[pattern.type] || '#ffffff';
          const isBullish = pattern.direction === 'bullish';
          
          // Draw pattern lines connecting pivots
          for (let i = 0; i < pattern.pivots.length - 1; i++) {
            const p1 = pattern.pivots[i];
            const p2 = pattern.pivots[i + 1];
            
            const lineData = new Array(data.length).fill(null);
            const steps = p2.index - p1.index;
            const priceStep = (p2.price - p1.price) / steps;
            
            for (let j = p1.index; j <= p2.index; j++) {
              lineData[j] = p1.price + priceStep * (j - p1.index);
            }
            
            series.push({
              name: `RRCP ${pattern.type} Line ${i}`,
              type: 'line',
              data: lineData,
              symbol: 'none',
              lineStyle: {
                color: color,
                width: 3,
                type: 'solid'
              },
              z: 40
            });
          }
          
          // Draw pivot points
          pattern.pivots.forEach((pivot, pIdx) => {
            series.push({
              name: `RRCP Pivot ${idx}-${pIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color: color,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 45
            });
          });
          
          // Pattern label
          const lastPivot = pattern.pivots[pattern.pivots.length - 1];
          const patternNames: Record<string, string> = {
            'double_tap': 'Double Tap',
            'triple_tap': 'Triple Tap',
            'cup_handle': 'Cup & Handle',
            'head_shoulders': 'H&S'
          };
          
          const labelText = `${patternNames[pattern.type]}\n${Math.round(pattern.confidence * 100)}%${pattern.hasDivergence ? ' ⚡' : ''}`;
          const labelY = isBullish ? lows[lastPivot.index] * 0.993 : highs[lastPivot.index] * 1.007;
          
          series.push({
            name: `RRCP Label ${idx}`,
            type: 'scatter',
            data: [[lastPivot.index, labelY]],
            symbol: 'roundRect',
            symbolSize: [80, 30],
            itemStyle: {
              color: color,
              borderColor: '#000',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: labelText,
              position: 'inside',
              fontSize: 9,
              fontWeight: 'bold',
              color: '#000'
            },
            z: 110
          });
          
          // Draw targets
          pattern.targets.forEach((target, tIdx) => {
            const targetData = new Array(data.length).fill(null);
            for (let i = lastPivot.index; i < Math.min(lastPivot.index + 50, data.length); i++) {
              targetData[i] = target;
            }
            
            series.push({
              name: `RRCP Target ${idx}-${tIdx}`,
              type: 'line',
              data: targetData,
              symbol: 'none',
              lineStyle: {
                color: isBullish ? '#22c55e' : '#ef4444',
                width: 1,
                type: 'dashed'
              },
              z: 30
            });
          });
          
          // Draw stop loss
          const slData = new Array(data.length).fill(null);
          for (let i = lastPivot.index; i < Math.min(lastPivot.index + 50, data.length); i++) {
            slData[i] = pattern.stopLoss;
          }
          
          series.push({
            name: `RRCP SL ${idx}`,
            type: 'line',
            data: slData,
            symbol: 'none',
            lineStyle: {
              color: '#ef4444',
              width: 1,
              type: 'dotted'
            },
            z: 30
          });
        });
        
      } catch (error) {
        console.error('[RRCP] Error:', error);
      }
    }

    // ==========================================================
    // 🔺 HTF Ascending Triangle
    // ==========================================================
    if ((indicators as any).htfAscendingTriangle && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        const calculateTriangleTarget = calculateAscTriangleTarget;
        
        const opens = ohlcv.map(c => c.open);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const closes = ohlcv.map(c => c.close);
        
        const result = detectHTFAscendingTriangles(opens, highs, lows, closes, {
          htfMultiplier: 5,  // 5x current timeframe
          minValidBars: 3,
          highFactor: 0.0,
          adjustTriangle: true,
          highEnabled: true
        });
        
        // Draw all detected triangles
        result.triangles.forEach((triangle, idx) => {
          const isCurrent = result.currentTriangle?.left === triangle.left;
          const color = isCurrent ? '#22c55e' : '#84cc16';
          const opacity = isCurrent ? 0.3 : 0.1;
          
          // Top horizontal resistance line
          const topLineData = new Array(data.length).fill(null);
          for (let i = triangle.left; i <= triangle.right; i++) {
            topLineData[i] = triangle.top;
          }
          
          series.push({
            name: `HTF Triangle ${idx} Top`,
            type: 'line',
            data: topLineData,
            symbol: 'none',
            lineStyle: {
              color: color,
              width: 2,
              type: 'solid'
            },
            z: 40
          });
          
          // Bottom ascending support line
          const bottomLineData = new Array(data.length).fill(null);
          const slope = (triangle.bottomRight - triangle.bottom) / (triangle.right - triangle.left);
          for (let i = triangle.left; i <= triangle.right; i++) {
            bottomLineData[i] = triangle.bottom + slope * (i - triangle.left);
          }
          
          series.push({
            name: `HTF Triangle ${idx} Bottom`,
            type: 'line',
            data: bottomLineData,
            symbol: 'none',
            lineStyle: {
              color: color,
              width: 2,
              type: 'solid'
            },
            z: 40
          });
          
          // Fill area
          series.push({
            name: `HTF Triangle ${idx} Fill`,
            type: 'line',
            data: topLineData,
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: color,
              opacity: opacity
            },
            z: 5
          });
          
          // Label
          const labelX = Math.floor((triangle.left + triangle.right) / 2);
          const labelY = (triangle.top + triangle.bottom) / 2;
          
          series.push({
            name: `HTF Triangle Label ${idx}`,
            type: 'scatter',
            data: [[labelX, labelY]],
            symbol: 'roundRect',
            symbolSize: [80, 25],
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Asc Triangle\n${Math.round(triangle.confidence * 100)}%`,
              position: 'inside',
              fontSize: 9,
              color: '#000',
              fontWeight: 'bold'
            },
            z: 100
          });
          
          // Check for breakout
          if (isCurrent) {
            const breakout = detectAscendingTriangleBreakout(triangle, closes, closes.length - 1);
            
            if (breakout.breakout && breakout.direction) {
              const isBullish = breakout.direction === 'bullish';
              const target = calculateTriangleTarget(triangle, breakout.direction);
              
              // Breakout marker
              const breakoutIdx = closes.length - 1;
              series.push({
                name: 'HTF Breakout',
                type: 'scatter',
                data: [[breakoutIdx, closes[breakoutIdx]]],
                symbol: 'arrow',
                symbolRotate: isBullish ? 0 : 180,
                symbolSize: 16,
                itemStyle: {
                  color: isBullish ? '#22c55e' : '#ef4444',
                  borderColor: '#fff',
                  borderWidth: 2
                },
                label: {
                  show: true,
                  formatter: isBullish ? 'BREAKOUT ↑' : 'BREAKDOWN ↓',
                  position: isBullish ? 'top' : 'bottom',
                  fontSize: 10,
                  color: '#fff',
                  backgroundColor: isBullish ? '#22c55e' : '#ef4444',
                  padding: [3, 6],
                  borderRadius: 3
                },
                z: 110
              });
              
              // Target line
              const targetData = new Array(data.length).fill(null);
              for (let i = breakoutIdx; i < Math.min(breakoutIdx + 30, data.length); i++) {
                targetData[i] = target;
              }
              
              series.push({
                name: 'HTF Target',
                type: 'line',
                data: targetData,
                symbol: 'none',
                lineStyle: {
                  color: isBullish ? '#22c55e' : '#ef4444',
                  width: 2,
                  type: 'dashed'
                },
                z: 35
              });
            }
          }
        });
        
      } catch (error) {
        console.error('[HTF Triangle] Error:', error);
      }
    }

    // ==========================================================
    // 🔻 HTF Descending Triangle
    // ==========================================================
    if ((indicators as any).htfDescendingTriangle && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        const calculateTriangleTarget = calculateDescTriangleTarget;
        
        const opens = ohlcv.map(c => c.open);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const closes = ohlcv.map(c => c.close);
        
        const result = detectHTFDescendingTriangles(opens, highs, lows, closes, {
          htfMultiplier: 5,
          minValidBars: 3,
          lowFactor: 0.0,
          adjustTriangle: true,
          lowEnabled: true
        });
        
        // Draw all detected descending triangles
        result.triangles.forEach((triangle, idx) => {
          const isCurrent = result.currentTriangle?.left === triangle.left;
          const color = isCurrent ? '#ef4444' : '#f87171';
          const opacity = isCurrent ? 0.3 : 0.1;
          
          // Bottom horizontal support line
          const bottomLineData = new Array(data.length).fill(null);
          for (let i = triangle.left; i <= triangle.right; i++) {
            bottomLineData[i] = triangle.bottom;
          }
          
          series.push({
            name: `HTF Desc Triangle ${idx} Bottom`,
            type: 'line',
            data: bottomLineData,
            symbol: 'none',
            lineStyle: {
              color: color,
              width: 2,
              type: 'solid'
            },
            z: 40
          });
          
          // Top descending resistance line
          const topLineData = new Array(data.length).fill(null);
          const slope = (triangle.topRight - triangle.top) / (triangle.right - triangle.left);
          for (let i = triangle.left; i <= triangle.right; i++) {
            topLineData[i] = triangle.top + slope * (i - triangle.left);
          }
          
          series.push({
            name: `HTF Desc Triangle ${idx} Top`,
            type: 'line',
            data: topLineData,
            symbol: 'none',
            lineStyle: {
              color: color,
              width: 2,
              type: 'solid'
            },
            z: 40
          });
          
          // Fill area
          series.push({
            name: `HTF Desc Triangle ${idx} Fill`,
            type: 'line',
            data: bottomLineData,
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: color,
              opacity: opacity
            },
            z: 5
          });
          
          // Label
          const labelX = Math.floor((triangle.left + triangle.right) / 2);
          const labelY = (triangle.top + triangle.bottom) / 2;
          
          series.push({
            name: `HTF Desc Triangle Label ${idx}`,
            type: 'scatter',
            data: [[labelX, labelY]],
            symbol: 'roundRect',
            symbolSize: [80, 25],
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Desc Triangle\n${Math.round(triangle.confidence * 100)}%`,
              position: 'inside',
              fontSize: 9,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 100
          });
          
          // Check for breakout
          if (isCurrent) {
            const breakout = detectDescendingTriangleBreakout(triangle, closes, closes.length - 1);
            
            if (breakout.breakout && breakout.direction) {
              const isBearish = breakout.direction === 'bearish';
              const target = calculateTriangleTarget(triangle, breakout.direction);
              
              // Breakout marker
              const breakoutIdx = closes.length - 1;
              series.push({
                name: 'HTF Desc Breakout',
                type: 'scatter',
                data: [[breakoutIdx, closes[breakoutIdx]]],
                symbol: 'arrow',
                symbolRotate: isBearish ? 180 : 0,
                symbolSize: 16,
                itemStyle: {
                  color: isBearish ? '#ef4444' : '#22c55e',
                  borderColor: '#fff',
                  borderWidth: 2
                },
                label: {
                  show: true,
                  formatter: isBearish ? 'BREAKDOWN ↓' : 'BREAKOUT ↑',
                  position: isBearish ? 'bottom' : 'top',
                  fontSize: 10,
                  color: '#fff',
                  backgroundColor: isBearish ? '#ef4444' : '#22c55e',
                  padding: [3, 6],
                  borderRadius: 3
                },
                z: 110
              });
              
              // Target line
              const targetData = new Array(data.length).fill(null);
              for (let i = breakoutIdx; i < Math.min(breakoutIdx + 30, data.length); i++) {
                targetData[i] = target;
              }
              
              series.push({
                name: 'HTF Desc Target',
                type: 'line',
                data: targetData,
                symbol: 'none',
                lineStyle: {
                  color: isBearish ? '#ef4444' : '#22c55e',
                  width: 2,
                  type: 'dashed'
                },
                z: 35
              });
            }
          }
        });
        
      } catch (error) {
        console.error('[HTF Desc Triangle] Error:', error);
      }
    }

    // ==========================================================
    // 📐 Wedge Maker - Pivot Trendlines
    // ==========================================================
    if ((indicators as any).wedgeMaker && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const closes = ohlcv.map(c => c.close);
        
        const result = calculateWedgeMaker(highs, lows, {
          upperLength: 20,
          lowerLength: 20,
          upperStartPivot: 2,
          upperEndPivot: 0,
          lowerStartPivot: 3,
          lowerEndPivot: 0,
          lineColor: 'RedGreen',
          lineWidth: 2,
          extendBars: 50
        });
        
        // Draw upper line (resistance)
        if (result.upperLine) {
          const upperLineData = getExtendedLineData(result.upperLine, data.length);
          
          series.push({
            name: 'Wedge Upper Line',
            type: 'line',
            data: upperLineData,
            symbol: 'none',
            lineStyle: {
              color: result.upperLine.color,
              width: 2,
              type: 'solid'
            },
            z: 45
          });
          
          // Mark pivot highs used
          const pivotHighMarkers: [number, number][] = [];
          result.pivotHighs.slice(-5).forEach(p => {
            pivotHighMarkers.push([p.index, p.price]);
          });
          
          series.push({
            name: 'Wedge Pivot Highs',
            type: 'scatter',
            data: pivotHighMarkers,
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 10,
            itemStyle: {
              color: '#ef4444',
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 50
          });
        }
        
        // Draw lower line (support)
        if (result.lowerLine) {
          const lowerLineData = getExtendedLineData(result.lowerLine, data.length);
          
          series.push({
            name: 'Wedge Lower Line',
            type: 'line',
            data: lowerLineData,
            symbol: 'none',
            lineStyle: {
              color: result.lowerLine.color,
              width: 2,
              type: 'solid'
            },
            z: 45
          });
          
          // Mark pivot lows used
          const pivotLowMarkers: [number, number][] = [];
          result.pivotLows.slice(-5).forEach(p => {
            pivotLowMarkers.push([p.index, p.price]);
          });
          
          series.push({
            name: 'Wedge Pivot Lows',
            type: 'scatter',
            data: pivotLowMarkers,
            symbol: 'triangle',
            symbolSize: 10,
            itemStyle: {
              color: '#22c55e',
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 50
          });
        }
        
        // Show wedge type label
        if (result.wedgeType && result.upperLine && result.lowerLine) {
          const labelIndex = Math.floor((result.upperLine.startIndex + result.lowerLine.startIndex) / 2);
          const labelPrice = (result.upperLine.startPrice + result.lowerLine.startPrice) / 2;
          
          const wedgeLabels: Record<string, string> = {
            'rising': '📈 Rising Wedge',
            'falling': '📉 Falling Wedge',
            'expanding': '🔄 Expanding',
            'contracting': '🔻 Contracting',
            'parallel': '➡️ Channel'
          };
          
          const wedgeColors: Record<string, string> = {
            'rising': '#ef4444',
            'falling': '#22c55e',
            'expanding': '#f59e0b',
            'contracting': '#8b5cf6',
            'parallel': '#6b7280'
          };
          
          series.push({
            name: 'Wedge Type Label',
            type: 'scatter',
            data: [[labelIndex, labelPrice]],
            symbol: 'roundRect',
            symbolSize: [100, 25],
            itemStyle: {
              color: wedgeColors[result.wedgeType] || '#6b7280',
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: wedgeLabels[result.wedgeType] || result.wedgeType,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 100
          });
        }
        
        // Show convergence point
        if (result.convergenceIndex !== null && result.convergencePrice !== null) {
          series.push({
            name: 'Wedge Convergence',
            type: 'scatter',
            data: [[result.convergenceIndex, result.convergencePrice]],
            symbol: 'diamond',
            symbolSize: 14,
            itemStyle: {
              color: '#f59e0b',
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: '⚡ Apex',
              position: 'top',
              fontSize: 10,
              color: '#f59e0b',
              fontWeight: 'bold'
            },
            z: 105
          });
        }
        
        // Check for breakout
        const breakout = checkWedgeBreakout(
          result.upperLine,
          result.lowerLine,
          closes,
          closes.length - 1
        );
        
        if (breakout.breakout && breakout.direction) {
          const isBullish = breakout.direction === 'bullish';
          
          series.push({
            name: 'Wedge Breakout',
            type: 'scatter',
            data: [[closes.length - 1, closes[closes.length - 1]]],
            symbol: 'arrow',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 18,
            itemStyle: {
              color: isBullish ? '#22c55e' : '#ef4444',
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: isBullish ? '🚀 BREAKOUT' : '💥 BREAKDOWN',
              position: isBullish ? 'top' : 'bottom',
              fontSize: 11,
              color: '#fff',
              backgroundColor: isBullish ? '#22c55e' : '#ef4444',
              padding: [4, 8],
              borderRadius: 4
            },
            z: 110
          });
        }
        
      } catch (error) {
        console.error('[Wedge Maker] Error:', error);
      }
    }

    // ==========================================================
    // 🐺 Wolfe Waves - 5-Point Reversal Pattern
    // ==========================================================
    if ((indicators as any).wolfeWaves && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        const detectWolfeWaves = detectWolfeWavesModel;
        const getWaveLineData = getWolfeWaveLineData;
        
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const closes = ohlcv.map(c => c.close);
        
        const result = detectWolfeWaves(highs, lows, closes, {
          sensitivity: 10,
          waveType: 'both',
          maxWaves: 3
        });
        
        // Draw each detected Wolfe Wave
        result.waves.forEach((wave, waveIdx) => {
          const { waveLines, projectionLines } = getWaveLineData(wave, data.length);
          const baseColor = wave.type === 'bullish' ? '#22c55e' : '#f97316';
          const lineColor = wave.isInvalidated ? '#ef4444' : baseColor;
          
          // Draw main wave lines (1-2, 2-3, 3-4, 4-5)
          waveLines.forEach((line, idx) => {
            const lineData = new Array(data.length).fill(null);
            const startIdx = Math.round(line.start[0]);
            const endIdx = Math.round(line.end[0]);
            const slope = (line.end[1] - line.start[1]) / (endIdx - startIdx);
            
            for (let i = startIdx; i <= endIdx && i < data.length; i++) {
              lineData[i] = line.start[1] + slope * (i - startIdx);
            }
            
            series.push({
              name: `Wolfe Wave ${waveIdx} Line ${idx + 1}`,
              type: 'line',
              data: lineData,
              symbol: 'none',
              lineStyle: {
                color: lineColor,
                width: 2,
                type: 'solid'
              },
              z: 45
            });
          });
          
          // Draw projection lines
          projectionLines.forEach((line, idx) => {
            const lineData = new Array(data.length).fill(null);
            const startIdx = Math.round(line.start[0]);
            const endIdx = Math.min(Math.round(line.end[0]), data.length - 1);
            const slope = (line.end[1] - line.start[1]) / (line.end[0] - line.start[0]);
            
            for (let i = startIdx; i <= endIdx && i < data.length; i++) {
              lineData[i] = line.start[1] + slope * (i - startIdx);
            }
            
            series.push({
              name: `Wolfe Projection ${waveIdx}-${idx}`,
              type: 'line',
              data: lineData,
              symbol: 'none',
              lineStyle: {
                color: '#9ca3af',
                width: 1,
                type: line.style === 'dashed' ? 'dashed' : [2, 4]
              },
              z: 40
            });
          });
          
          // Draw pivot labels (1-5)
          wave.pivots.forEach((pivot, pivotIdx) => {
            const labelText = pivotIdx === 4 
              ? `5\n${wave.type === 'bullish' ? 'Bullish' : 'Bearish'}` 
              : String(pivotIdx + 1);
            
            series.push({
              name: `Wolfe Pivot ${waveIdx}-${pivotIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.value]],
              symbol: pivot.isPivotHigh ? 'triangle' : 'triangle',
              symbolRotate: pivot.isPivotHigh ? 180 : 0,
              symbolSize: pivotIdx === 4 ? 14 : 10,
              itemStyle: {
                color: pivotIdx === 4 ? lineColor : '#6b7280',
                borderColor: '#fff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: labelText,
                position: pivot.isPivotHigh ? 'top' : 'bottom',
                fontSize: pivotIdx === 4 ? 10 : 9,
                color: pivotIdx === 4 ? lineColor : '#d1d5db',
                fontWeight: pivotIdx === 4 ? 'bold' : 'normal',
                backgroundColor: pivotIdx === 4 ? 'rgba(0,0,0,0.6)' : 'transparent',
                padding: pivotIdx === 4 ? [2, 4] : 0,
                borderRadius: 3
              },
              z: 100
            });
          });
          
          // Add target price marker
          if (!wave.isInvalidated) {
            series.push({
              name: `Wolfe Target ${waveIdx}`,
              type: 'scatter',
              data: [[wave.projectionLine.endIndex, wave.targetPrice]],
              symbol: 'pin',
              symbolSize: 20,
              itemStyle: {
                color: baseColor,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: `🎯 ${wave.targetPrice.toFixed(2)}`,
                position: 'right',
                fontSize: 10,
                color: '#fff',
                backgroundColor: baseColor,
                padding: [3, 6],
                borderRadius: 3
              },
              z: 105
            });
          }
          
          // Wave info label
          const midPivot = wave.pivots[2];
          series.push({
            name: `Wolfe Info ${waveIdx}`,
            type: 'scatter',
            data: [[midPivot.index, midPivot.value]],
            symbol: 'roundRect',
            symbolSize: [90, 30],
            itemStyle: {
              color: wave.isInvalidated ? 'rgba(239,68,68,0.8)' : `${baseColor}cc`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: wave.isInvalidated 
                ? '❌ Invalid' 
                : `🐺 ${wave.type === 'bullish' ? 'Bull' : 'Bear'}\n${Math.round(wave.confidence * 100)}%`,
              position: 'inside',
              fontSize: 9,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 110
          });
        });
        
      } catch (error) {
        console.error('[Wolfe Waves] Error:', error);
      }
    }

    // ==========================================================
    // 🐺 Wolfe Waves LuxAlgo - Advanced Detection
    // ==========================================================
    if ((indicators as any).wolfeWavesLux && data.length >= 100) {
      
      
      try {
        // Using static imports from top of file
        const getWaveLineData = getLuxWaveLineData;
        
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const closes = ohlcv.map(c => c.close);
        
        const result = detectLuxWolfeWaves(highs, lows, closes, {
          swingMin: 2,
          swingMax: 50,
          margin: 0.7,
          angle: 0.7,
          showBullish: true,
          showBearish: true,
          extendTarget: 20,
          showProgression: 'Full'
        });
        
        // Draw each detected Wolfe Wave
        result.waves.forEach((wave, waveIdx) => {
          if (!wave.isActive && !wave.isConfirmed) return;
          
          const isBull = wave.direction === 'bull';
          const baseColor = isBull ? '#089981' : '#f23645';
          const dimColor = '#9ca3af';
          
          // Draw A-C dotted line (slope0)
          const acLineData = getWaveLineData(
            wave.points.A.index, wave.points.A.price,
            wave.points.D.index + 30, wave.points.A.price + wave.slope0 * (wave.points.D.index + 30 - wave.points.A.index),
            data.length
          );
          
          series.push({
            name: `Lux Wolfe AC ${waveIdx}`,
            type: 'line',
            data: acLineData,
            symbol: 'none',
            lineStyle: {
              color: dimColor,
              width: 1,
              type: [4, 4]
            },
            z: 35
          });
          
          // Draw B-D dotted line (slope1)
          const bdLineData = getWaveLineData(
            wave.points.B.index, wave.points.B.price,
            wave.points.D.index + 30, wave.points.B.price + wave.slope1 * (wave.points.D.index + 30 - wave.points.B.index),
            data.length
          );
          
          series.push({
            name: `Lux Wolfe BD ${waveIdx}`,
            type: 'line',
            data: bdLineData,
            symbol: 'none',
            lineStyle: {
              color: dimColor,
              width: 1,
              type: [4, 4]
            },
            z: 35
          });
          
          // Draw main wave lines (A-B, B-C, C-D)
          const waveSegments = [
            { from: wave.points.A, to: wave.points.B },
            { from: wave.points.B, to: wave.points.C },
            { from: wave.points.C, to: wave.points.D }
          ];
          
          waveSegments.forEach((seg, segIdx) => {
            const segData = new Array(data.length).fill(null);
            const slope = (seg.to.price - seg.from.price) / (seg.to.index - seg.from.index);
            
            for (let i = seg.from.index; i <= seg.to.index && i < data.length; i++) {
              segData[i] = seg.from.price + slope * (i - seg.from.index);
            }
            
            series.push({
              name: `Lux Wolfe Seg ${waveIdx}-${segIdx}`,
              type: 'line',
              data: segData,
              symbol: 'none',
              lineStyle: {
                color: baseColor,
                width: 2,
                type: 'solid'
              },
              z: 45
            });
          });
          
          // Draw pivot labels (A, B, C, D)
          const pivotLabels = [
            { label: 'A', ...wave.points.A },
            { label: 'B', ...wave.points.B },
            { label: 'C', ...wave.points.C },
            { label: 'D', ...wave.points.D }
          ];
          
          pivotLabels.forEach((pivot, pIdx) => {
            const isHigh = pIdx % 2 === (isBull ? 1 : 0);
            
            series.push({
              name: `Lux Pivot ${waveIdx}-${pIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: baseColor,
                borderColor: '#fff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: pivot.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 10,
                color: '#d1d5db',
                fontWeight: 'bold'
              },
              z: 100
            });
          });
          
          // Draw Wave 5 target zone
          if (wave.isActive && !wave.isConfirmed) {
            const zone = wave.wave5Zone;
            
            // Zone box represented as area
            const zoneTopData = new Array(data.length).fill(null);
            const zoneBotData = new Array(data.length).fill(null);
            
            for (let i = zone.x1; i <= zone.x2 && i < data.length; i++) {
              zoneTopData[i] = zone.y1;
              zoneBotData[i] = zone.y2;
            }
            
            series.push({
              name: `Lux Zone ${waveIdx}`,
              type: 'line',
              data: zoneTopData,
              symbol: 'none',
              lineStyle: { opacity: 0 },
              areaStyle: {
                color: baseColor,
                opacity: 0.15
              },
              z: 5
            });
            
            // Zone label
            series.push({
              name: `Lux Zone Label ${waveIdx}`,
              type: 'scatter',
              data: [[Math.round((zone.x1 + zone.x2) / 2), (zone.y1 + zone.y2) / 2]],
              symbol: 'roundRect',
              symbolSize: [60, 20],
              itemStyle: {
                color: 'rgba(0,0,0,0.6)',
                borderColor: baseColor,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: 'Wave 5 Zone',
                position: 'inside',
                fontSize: 9,
                color: '#fff'
              },
              z: 90
            });
          }
          
          // Draw confirmed wave (D-E and target lines)
          if (wave.isConfirmed && wave.breakIndex && wave.breakPrice) {
            // D-E line
            const deData = new Array(data.length).fill(null);
            const deSlope = (wave.breakPrice - wave.points.D.price) / (wave.breakIndex - wave.points.D.index);
            
            for (let i = wave.points.D.index; i <= wave.breakIndex && i < data.length; i++) {
              deData[i] = wave.points.D.price + deSlope * (i - wave.points.D.index);
            }
            
            series.push({
              name: `Lux DE ${waveIdx}`,
              type: 'line',
              data: deData,
              symbol: 'none',
              lineStyle: {
                color: baseColor,
                width: 2,
                type: 'solid'
              },
              z: 45
            });
            
            // E point marker
            series.push({
              name: `Lux E ${waveIdx}`,
              type: 'scatter',
              data: [[wave.breakIndex, wave.breakPrice]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color: baseColor,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: 'E',
                position: isBull ? 'bottom' : 'top',
                fontSize: 10,
                color: '#fff',
                backgroundColor: baseColor,
                padding: [2, 4],
                borderRadius: 3
              },
              z: 105
            });
            
            // Projection/target line (dashed)
            const projData = getWaveLineData(
              wave.projectionLine.startIndex, wave.projectionLine.startPrice,
              wave.projectionLine.endIndex, wave.projectionLine.endPrice,
              data.length
            );
            
            series.push({
              name: `Lux Target ${waveIdx}`,
              type: 'line',
              data: projData,
              symbol: 'none',
              lineStyle: {
                color: isBull ? '#f23645' : '#089981',
                width: 1,
                type: 'dashed'
              },
              z: 40
            });
            
            // Target reached marker
            if (wave.targetReached) {
              series.push({
                name: `Lux Target Hit ${waveIdx}`,
                type: 'scatter',
                data: [[wave.breakIndex + 5, wave.projectionLine.endPrice]],
                symbol: 'pin',
                symbolSize: 25,
                itemStyle: {
                  color: baseColor,
                  borderColor: '#fff',
                  borderWidth: 2
                },
                label: {
                  show: true,
                  formatter: '●',
                  position: 'inside',
                  fontSize: 14,
                  color: baseColor
                },
                z: 110
              });
            }
          }
          
          // Wave info badge
          const badgeX = wave.points.B.index;
          const badgeY = wave.points.B.price;
          
          series.push({
            name: `Lux Info ${waveIdx}`,
            type: 'scatter',
            data: [[badgeX, badgeY]],
            symbol: 'roundRect',
            symbolSize: [85, 35],
            itemStyle: {
              color: `${baseColor}dd`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🐺 ${isBull ? 'Bullish' : 'Bearish'}\n${wave.isConfirmed ? '✅ Confirmed' : '⏳ Pending'}`,
              position: 'inside',
              fontSize: 9,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 12
            },
            z: 115
          });
        });
        
        // Stats badge
        if (result.waves.length > 0) {
          const statsX = data.length - 20;
          const statsY = ohlcv[ohlcv.length - 1]?.high * 1.01 || 0;
          
          series.push({
            name: 'Lux Wolfe Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [120, 50],
            itemStyle: {
              color: 'rgba(30,34,45,0.9)',
              borderColor: '#373a46',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Bull: ${result.stats.bullishCount} (🎯${result.stats.bullishTargetReached})\nBear: ${result.stats.bearishCount} (🎯${result.stats.bearishTargetReached})`,
              position: 'inside',
              fontSize: 9,
              color: '#fff',
              lineHeight: 14
            },
            z: 120
          });
        }
        
      } catch (error) {
        console.error('[Wolfe Waves Lux] Error:', error);
      }
    }

    // ==========================================================
    // 📊 Auto Channel - Parallel Channel Detection
    // ==========================================================
    if ((indicators as any).autoChannel && data.length >= 50) {
      
      
      try {
        // Using static imports from top of file
        
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);
        const closes = ohlcv.map(c => c.close);
        
        const result = detectAutoChannel(highs, lows, closes, {
          priceDeviation: 0.2,
          pivotLegs: 2,
          lookback: 12,
          slopeTolerance: 0.0005,
          priceTolerance: 0,
          minInRatio: 0.8
        });
        
        if (result.channel) {
          const { upperLine, lowerLine, inRatio, confidence } = result.channel;
          
          // Draw upper channel line (red)
          const upperLineData = getChannelLineData(upperLine, data.length, 50, 30);
          series.push({
            name: 'Auto Channel Upper',
            type: 'line',
            data: upperLineData,
            symbol: 'none',
            lineStyle: {
              color: '#ef4444',
              width: 2,
              type: 'solid'
            },
            z: 45
          });
          
          // Draw lower channel line (green)
          const lowerLineData = getChannelLineData(lowerLine, data.length, 50, 30);
          series.push({
            name: 'Auto Channel Lower',
            type: 'line',
            data: lowerLineData,
            symbol: 'none',
            lineStyle: {
              color: '#22c55e',
              width: 2,
              type: 'solid'
            },
            z: 45
          });
          
          // Channel fill area
          const fillData = getChannelFillData(upperLine, lowerLine, data.length);
          series.push({
            name: 'Auto Channel Fill Upper',
            type: 'line',
            data: fillData.upper,
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: '#6366f1',
              opacity: 0.1
            },
            z: 5
          });
          
          // Draw high pivots used
          const highPivotMarkers: [number, number][] = result.highPivots.map(p => [p.index, p.price]);
          series.push({
            name: 'Auto Channel High Pivots',
            type: 'scatter',
            data: highPivotMarkers,
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 8,
            itemStyle: {
              color: '#ef4444',
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 50
          });
          
          // Draw low pivots used
          const lowPivotMarkers: [number, number][] = result.lowPivots.map(p => [p.index, p.price]);
          series.push({
            name: 'Auto Channel Low Pivots',
            type: 'scatter',
            data: lowPivotMarkers,
            symbol: 'triangle',
            symbolSize: 8,
            itemStyle: {
              color: '#22c55e',
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 50
          });
          
          // Draw anchor points (the 4 pivots defining the channel)
          const anchorPoints: [number, number][] = [
            [upperLine.x1, upperLine.y1],
            [upperLine.x2, upperLine.y2],
            [lowerLine.x1, lowerLine.y1],
            [lowerLine.x2, lowerLine.y2]
          ];
          
          series.push({
            name: 'Auto Channel Anchors',
            type: 'scatter',
            data: anchorPoints,
            symbol: 'circle',
            symbolSize: 10,
            itemStyle: {
              color: '#6366f1',
              borderColor: '#fff',
              borderWidth: 2
            },
            z: 55
          });
          
          // Channel info label
          const labelX = Math.floor((upperLine.x1 + upperLine.x2) / 2);
          const labelY = (upperLine.y1 + lowerLine.y1) / 2;
          
          const slope = upperLine.slope;
          const trend = slope > 0.0001 ? '↗️ Up' : slope < -0.0001 ? '↘️ Down' : '➡️ Flat';
          
          series.push({
            name: 'Auto Channel Label',
            type: 'scatter',
            data: [[labelX, labelY]],
            symbol: 'roundRect',
            symbolSize: [100, 35],
            itemStyle: {
              color: 'rgba(99, 102, 241, 0.9)',
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `📊 Auto Channel\n${trend} | ${Math.round(inRatio * 100)}% fit`,
              position: 'inside',
              fontSize: 9,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 12
            },
            z: 100
          });
          
          // Draw breakouts
          result.breakouts.forEach((breakout, idx) => {
            const isUp = breakout.direction === 'up';
            
            series.push({
              name: `Auto Channel Breakout ${idx}`,
              type: 'scatter',
              data: [[breakout.index, breakout.price]],
              symbol: 'triangle',
              symbolRotate: isUp ? 0 : 180,
              symbolSize: 14,
              itemStyle: {
                color: isUp ? '#22c55e' : '#ef4444',
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: isUp ? '↑' : '↓',
                position: isUp ? 'top' : 'bottom',
                fontSize: 12,
                color: isUp ? '#22c55e' : '#ef4444',
                fontWeight: 'bold'
              },
              z: 110
            });
          });
          
          // Current price position indicator
          if (result.currentUpperPrice !== null && result.currentLowerPrice !== null) {
            const currentClose = closes[closes.length - 1];
            const currentIdx = closes.length - 1;
            const channelMid = (result.currentUpperPrice + result.currentLowerPrice) / 2;
            const channelRange = result.currentUpperPrice - result.currentLowerPrice;
            
            let position = 'Middle';
            let posColor = '#6366f1';
            
            if (currentClose > result.currentUpperPrice) {
              position = '⚠️ Above';
              posColor = '#22c55e';
            } else if (currentClose < result.currentLowerPrice) {
              position = '⚠️ Below';
              posColor = '#ef4444';
            } else if (currentClose > channelMid + channelRange * 0.25) {
              position = 'Upper Half';
              posColor = '#f59e0b';
            } else if (currentClose < channelMid - channelRange * 0.25) {
              position = 'Lower Half';
              posColor = '#06b6d4';
            }
            
            // Position badge
            series.push({
              name: 'Channel Position',
              type: 'scatter',
              data: [[currentIdx - 5, currentClose]],
              symbol: 'roundRect',
              symbolSize: [70, 20],
              itemStyle: {
                color: posColor,
                borderColor: '#fff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: position,
                position: 'inside',
                fontSize: 9,
                color: '#fff',
                fontWeight: 'bold'
              },
              z: 105
            });
          }
        }
        
      } catch (error) {
        console.error('[Auto Channel] Error:', error);
      }
    }

    // ==========================================================
    // 🧭 Trendline Breakout Navigator [LuxAlgo]
    // ==========================================================
    if ((indicators as any).trendlineNavigator && data.length >= 80) {
      
      try {
        // Using static imports from top of file
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectTrendlineBreakoutNavigator(highs, lows, closes, {
          swingLengths: [
            { label: 'Long', length: 60, enabled: true, style: 'solid', width: 2 },
            { label: 'Medium', length: 30, enabled: true, style: 'dashed', width: 2 },
            { label: 'Short', length: 10, enabled: true, style: 'dotted', width: 1 }
          ],
          hhllMode: 'hhll_prev',
          extendBars: 40,
          deviationFilter: 0.0015
        });

        const lineCounts: Record<'Long' | 'Medium' | 'Short', { bull: number; bear: number }> = {
          Long: { bull: 0, bear: 0 },
          Medium: { bull: 0, bear: 0 },
          Short: { bull: 0, bear: 0 }
        };

        result.segments.forEach((segment, idx) => {
          const color = segment.direction === 'bullish' ? '#089981' : '#f23645';
          const lineData = new Array(data.length).fill(null);
          const startIdx = Math.max(0, Math.min(segment.start.index, data.length - 1));
          const endIdx = Math.min(data.length - 1, segment.projectEndIndex);

          for (let i = startIdx; i <= endIdx; i++) {
            lineData[i] = segment.start.price + segment.slope * (i - segment.start.index);
          }

          const bucket = lineCounts[segment.lengthLabel];
          if (bucket) {
            if (segment.direction === 'bullish') bucket.bull += 1;
            else bucket.bear += 1;
          }

          series.push({
            name: `TL ${segment.lengthLabel} ${segment.direction} ${idx}`,
            type: 'line',
            data: lineData,
            symbol: 'none',
            lineStyle: {
              color,
              width: segment.width,
              type: segment.style === 'solid' ? 'solid' : segment.style === 'dashed' ? 'dashed' : 'dotted'
            },
            z: 60
          });

          series.push({
            name: `TL Anchors ${segment.lengthLabel} ${idx}`,
            type: 'scatter',
            data: [
              [segment.start.index, segment.start.price],
              [segment.end.index, segment.end.price]
            ],
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color,
              borderColor: '#0f172a',
              borderWidth: 1.5
            },
            z: 65
          });
        });

        result.hhllLabels.forEach((label, idx) => {
          const isHigh = label.pivotType === 'high';
          const labelColor = isHigh ? '#089981' : '#f59e0b';
          const bgColor = isHigh ? 'rgba(8, 153, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
          const symbolSize = label.emphasizePrevious ? [60, 20] : [48, 18];

          series.push({
            name: `HHLL ${label.lengthLabel} ${idx}`,
            type: 'scatter',
            data: [[label.index, label.price]],
            symbol: 'roundRect',
            symbolSize,
            itemStyle: {
              color: bgColor,
              borderColor: labelColor,
              borderWidth: label.emphasizePrevious ? 2 : 1
            },
            label: {
              show: true,
              formatter: label.label,
              position: 'inside',
              fontSize: label.emphasizePrevious ? 11 : 10,
              fontWeight: label.emphasizePrevious ? 'bold' : 'normal',
              color: labelColor
            },
            z: 95
          });
        });

        result.breakoutSignals.forEach((signal, idx) => {
          const isBullBreak = signal.direction === 'bullish_break';
          series.push({
            name: `TL Breakout ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'arrow',
            symbolRotate: isBullBreak ? 0 : 180,
            symbolSize: 18,
            itemStyle: {
              color: isBullBreak ? '#22c55e' : '#ef4444',
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: isBullBreak ? 'BREAK ↑' : 'BREAK ↓',
              position: isBullBreak ? 'top' : 'bottom',
              fontSize: 10,
              color: '#fff',
              backgroundColor: isBullBreak ? '#22c55e' : '#ef4444',
              padding: [3, 6],
              borderRadius: 3
            },
            z: 110
          });
        });

        const statsLines = ['Long', 'Medium', 'Short'].map((label) => {
          const bucket = lineCounts[label as 'Long' | 'Medium' | 'Short'];
          return `${label[0]} ➚${bucket?.bull ?? 0} | ➘${bucket?.bear ?? 0}`;
        });

        const statsX = Math.max(0, data.length - 15);
        const statsY = (ohlcv[ohlcv.length - 1]?.high ?? ohlcv[ohlcv.length - 1]?.close ?? 0) * 1.02;

        series.push({
          name: 'Trendline Navigator Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [120, 55],
          itemStyle: {
            color: 'rgba(8, 14, 33, 0.85)',
            borderColor: '#1d4ed8',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `🧭 Trendlines\n${statsLines.join('\n')}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 115
        });
      } catch (error) {
        console.error('[Trendline Navigator] Error:', error);
      }
    }

    // ==========================================================
    // 📐 Trend Lines [LuxAlgo]
    // ==========================================================
    if ((indicators as any).luxTrendLines && data.length >= 80) {
      
      try {
        // Using static imports from top of file
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectLuxTrendLines(highs, lows, closes, {
          length: 50,
          ratio: 3,
          toggleMode: 'AB',
          sourceMode: 'close',
          minBarsBeforeBreak: 3,
          extendBars: 60,
          maxLinesPerDirection: 3,
          showAngles: true
        });

        result.lines.forEach((line, idx) => {
          const color = line.direction === 'bullish' ? '#22c55e' : '#f23645';
          const lineData = new Array(data.length).fill(null);
          const startIdx = Math.max(0, Math.min(line.start.index, data.length - 1));
          const endIdx = Math.min(data.length - 1, line.projectEndIndex);

          for (let i = startIdx; i <= endIdx; i++) {
            lineData[i] = line.start.price + line.slope * (i - line.start.index);
          }

          series.push({
            name: `Lux TL ${line.direction} ${idx}`,
            type: 'line',
            data: lineData,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: line.direction === 'bullish' ? 'solid' : 'dashed'
            },
            z: 70
          });

          series.push({
            name: `Lux TL Anchors ${line.direction} ${idx}`,
            type: 'scatter',
            data: [
              [line.start.index, line.start.price],
              [line.end.index, line.end.price]
            ],
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color,
              borderColor: '#0f172a',
              borderWidth: 2
            },
            z: 75
          });
        });

        result.angleLabels.forEach((label, idx) => {
          const color = label.direction === 'bullish' ? '#22c55e' : '#f23645';
          series.push({
            name: `Lux TL Angle ${idx}`,
            type: 'scatter',
            data: [[label.index, label.price]],
            symbol: 'roundRect',
            symbolSize: [60, 20],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.8)',
              borderColor: color,
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `${label.angle.toFixed(1)}°`,
              position: 'inside',
              fontSize: 10,
              color
            },
            z: 90
          });
        });

        result.breakSignals.forEach((signal, idx) => {
          const isBullish = signal.direction === 'bullish_break';
          series.push({
            name: `Lux TL Break ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'arrow',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 18,
            itemStyle: {
              color: isBullish ? '#22c55e' : '#f23645',
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: isBullish ? 'TL ↑' : 'TL ↓',
              position: isBullish ? 'top' : 'bottom',
              fontSize: 10,
              color: '#fff',
              backgroundColor: isBullish ? '#22c55e' : '#f23645',
              padding: [2, 5],
              borderRadius: 3
            },
            z: 105
          });
        });

        if (result.lines.length > 0) {
          const stats = {
            bull: result.lines.filter((l) => l.direction === 'bullish').length,
            bear: result.lines.filter((l) => l.direction === 'bearish').length,
            breaksUp: result.breakSignals.filter((s) => s.direction === 'bullish_break').length,
            breaksDown: result.breakSignals.filter((s) => s.direction === 'bearish_break').length
          };

          const statsX = Math.max(0, data.length - 25);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? ohlcv[ohlcv.length - 1]?.close ?? 0) * 1.04;

          series.push({
            name: 'Lux TL Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [150, 60],
            itemStyle: {
              color: 'rgba(8, 15, 35, 0.9)',
              borderColor: '#4c1d95',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Trend Lines\nBull: ${stats.bull} | Breaks ↑ ${stats.breaksUp}\nBear: ${stats.bear} | Breaks ↓ ${stats.breaksDown}`,
              position: 'inside',
              fontSize: 10,
              color: '#e0e7ff',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[Lux Trend Lines] Error:', error);
      }
    }

    // ==========================================================
    // ⏰ Session Breakout
    // ==========================================================
    if ((indicators as any).sessionBreakout && data.length >= 50) {
      
      try {
        // Using static imports from top of file
        const timestamps = ohlcv.map((c) => c.timestamp);
        const opens = ohlcv.map((c) => c.open);
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectSessionBreakout(timestamps, opens, highs, lows, closes, {
          sessionStartHour: 18,
          sessionStartMinute: 0,
          sessionEndHour: 1,
          sessionEndMinute: 1,
          useCloseAsConfirmation: false,
          detectionMethod: 'breakout',
          showSessionBox: true,
          showLevels: true,
          extendHours: 5,
          maxSessions: 5
        });

        result.sessions.forEach((session, idx) => {
          if (!session.isConfirmed && !session.isActive) return;

          // Session box
          if (result.config.showSessionBox) {
            const boxData = new Array(data.length).fill(null);
            for (let i = session.startIndex; i <= session.endIndex; i++) {
              boxData[i] = session.high;
            }

            series.push({
              name: `Session ${idx} Upper`,
              type: 'line',
              data: boxData,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(239, 68, 68, 0.3)',
                width: 1,
                type: 'solid'
              },
              z: 10
            });

            const boxLower = new Array(data.length).fill(null);
            for (let i = session.startIndex; i <= session.endIndex; i++) {
              boxLower[i] = session.low;
            }

            series.push({
              name: `Session ${idx} Lower`,
              type: 'line',
              data: boxLower,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(239, 68, 68, 0.3)',
                width: 1,
                type: 'solid'
              },
              areaStyle: {
                color: 'rgba(239, 68, 68, 0.1)'
              },
              z: 10
            });

            series.push({
              name: `Session ${idx} Markers`,
              type: 'scatter',
              data: [
                [session.startIndex, session.high],
                [session.endIndex, session.high]
              ],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: '#ef4444',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 15
            });
          }

          // Session levels (high, mid, low)
          if (result.config.showLevels && session.isConfirmed) {
            const extendBars = Math.min(50, result.config.extendHours * 12);
            const endIdx = Math.min(data.length - 1, session.endIndex + extendBars);

            // High level
            const highLevelData = new Array(data.length).fill(null);
            for (let i = session.endIndex; i <= endIdx; i++) {
              highLevelData[i] = session.high;
            }
            series.push({
              name: `Session ${idx} High`,
              type: 'line',
              data: highLevelData,
              symbol: 'none',
              lineStyle: {
                color: '#ef4444',
                width: 2,
                type: 'solid'
              },
              z: 55
            });

            // Mid level
            const midLevelData = new Array(data.length).fill(null);
            for (let i = session.endIndex; i <= endIdx; i++) {
              midLevelData[i] = session.mid;
            }
            series.push({
              name: `Session ${idx} Mid`,
              type: 'line',
              data: midLevelData,
              symbol: 'none',
              lineStyle: {
                color: '#f59e0b',
                width: 1,
                type: 'dashed'
              },
              z: 54
            });

            // Low level
            const lowLevelData = new Array(data.length).fill(null);
            for (let i = session.endIndex; i <= endIdx; i++) {
              lowLevelData[i] = session.low;
            }
            series.push({
              name: `Session ${idx} Low`,
              type: 'line',
              data: lowLevelData,
              symbol: 'none',
              lineStyle: {
                color: '#22c55e',
                width: 2,
                type: 'solid'
              },
              z: 55
            });
          }
        });

        // Draw breakouts
        result.breakouts.forEach((breakout, idx) => {
          const isBullish = breakout.type === 'bullish_breakout';
          const color = isBullish ? '#22c55e' : '#ef4444';
          const label = result.config.detectionMethod === 'breakout'
            ? (isBullish ? 'BULL' : 'BEAR')
            : (isBullish ? 'SELL SWEEP' : 'BUY SWEEP');

          series.push({
            name: `Breakout ${idx}`,
            type: 'scatter',
            data: [[breakout.index, breakout.price]],
            symbol: 'triangle',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 14,
            itemStyle: {
              color,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: label,
              position: isBullish ? 'top' : 'bottom',
              fontSize: 9,
              color: '#fff',
              backgroundColor: color,
              padding: [2, 5],
              borderRadius: 3
            },
            z: 110
          });
        });

        // Previous day/week levels
        if (result.previousLevels) {
          if (result.config.showPreviousDayLevels) {
            const dayHighData = new Array(data.length).fill(result.previousLevels.dayHigh);
            const dayLowData = new Array(data.length).fill(result.previousLevels.dayLow);

            series.push({
              name: 'Prev Day High',
              type: 'line',
              data: dayHighData,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(59, 130, 246, 0.5)',
                width: 1,
                type: 'dashed'
              },
              z: 30
            });

            series.push({
              name: 'Prev Day Low',
              type: 'line',
              data: dayLowData,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(59, 130, 246, 0.5)',
                width: 1,
                type: 'dashed'
              },
              z: 30
            });
          }

          if (result.config.showPreviousWeekLevels) {
            const weekHighData = new Array(data.length).fill(result.previousLevels.weekHigh);
            const weekLowData = new Array(data.length).fill(result.previousLevels.weekLow);

            series.push({
              name: 'Prev Week High',
              type: 'line',
              data: weekHighData,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(34, 197, 94, 0.4)',
                width: 1,
                type: 'dotted'
              },
              z: 29
            });

            series.push({
              name: 'Prev Week Low',
              type: 'line',
              data: weekLowData,
              symbol: 'none',
              lineStyle: {
                color: 'rgba(34, 197, 94, 0.4)',
                width: 1,
                type: 'dotted'
              },
              z: 29
            });
          }
        }

        // Stats badge
        if (result.sessions.length > 0) {
          const stats = {
            sessions: result.sessions.filter((s) => s.isConfirmed).length,
            bullish: result.breakouts.filter((b) => b.type === 'bullish_breakout').length,
            bearish: result.breakouts.filter((b) => b.type === 'bearish_breakout').length
          };

          const statsX = Math.max(0, data.length - 20);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? ohlcv[ohlcv.length - 1]?.close ?? 0) * 1.06;

          series.push({
            name: 'Session Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [140, 55],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#ef4444',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `⏰ Session Breakout\nSessions: ${stats.sessions}\nBull: ${stats.bullish} | Bear: ${stats.bearish}`,
              position: 'inside',
              fontSize: 10,
              color: '#e2e8f0',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[Session Breakout] Error:', error);
      }
    }

    // ==========================================================
    // 🔷 Gartley Harmonic Pattern
    // ==========================================================
    if ((indicators as any).gartleyPattern && data.length >= 50) {
      
      try {
        // Using static imports from top of file
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectGartleyPattern(highs, lows, closes, {
          zigzagPeriod: 3,
          showValidOnly: true,
          requireLastPivotConfirm: false,
          confirmPeriod: 2
        });

        result.patterns.forEach((pattern, idx) => {
          const color = pattern.direction === 'bullish' ? '#22c55e' : '#ef4444';
          const lightColor = pattern.direction === 'bullish' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

          // Draw pattern lines: X-A-B-C-D
          const points = [pattern.X, pattern.A, pattern.B, pattern.C, pattern.D];

          // XA line
          const xaLine = new Array(data.length).fill(null);
          for (let i = pattern.X.index; i <= pattern.A.index; i++) {
            const progress = (i - pattern.X.index) / (pattern.A.index - pattern.X.index);
            xaLine[i] = pattern.X.price + (pattern.A.price - pattern.X.price) * progress;
          }
          series.push({
            name: `Gartley ${idx} XA`,
            type: 'line',
            data: xaLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // AB line
          const abLine = new Array(data.length).fill(null);
          for (let i = pattern.A.index; i <= pattern.B.index; i++) {
            const progress = (i - pattern.A.index) / (pattern.B.index - pattern.A.index);
            abLine[i] = pattern.A.price + (pattern.B.price - pattern.A.price) * progress;
          }
          series.push({
            name: `Gartley ${idx} AB`,
            type: 'line',
            data: abLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // BC line
          const bcLine = new Array(data.length).fill(null);
          for (let i = pattern.B.index; i <= pattern.C.index; i++) {
            const progress = (i - pattern.B.index) / (pattern.C.index - pattern.B.index);
            bcLine[i] = pattern.B.price + (pattern.C.price - pattern.B.price) * progress;
          }
          series.push({
            name: `Gartley ${idx} BC`,
            type: 'line',
            data: bcLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // CD line
          const cdLine = new Array(data.length).fill(null);
          for (let i = pattern.C.index; i <= pattern.D.index; i++) {
            const progress = (i - pattern.C.index) / (pattern.D.index - pattern.C.index);
            cdLine[i] = pattern.C.price + (pattern.D.price - pattern.C.price) * progress;
          }
          series.push({
            name: `Gartley ${idx} CD`,
            type: 'line',
            data: cdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // XD line (completing the pattern)
          const xdLine = new Array(data.length).fill(null);
          for (let i = pattern.X.index; i <= pattern.D.index; i++) {
            const progress = (i - pattern.X.index) / (pattern.D.index - pattern.X.index);
            xdLine[i] = pattern.X.price + (pattern.D.price - pattern.X.price) * progress;
          }
          series.push({
            name: `Gartley ${idx} XD`,
            type: 'line',
            data: xdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.6
            },
            z: 79
          });

          // Draw XABCD points
          const pointLabels = ['X', 'A', 'B', 'C', 'D'];
          points.forEach((point, pIdx) => {
            series.push({
              name: `Gartley ${idx} Point ${pointLabels[pIdx]}`,
              type: 'scatter',
              data: [[point.index, point.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: pointLabels[pIdx],
                position: point.type === 'high' ? 'top' : 'bottom',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: color,
                padding: [3, 6],
                borderRadius: 3
              },
              z: 85
            });
          });

          // PRZ (Potential Reversal Zone) at point D
          const przRange = Math.abs(pattern.D.price) * 0.005; // 0.5% range
          const przUpper = pattern.D.price + (pattern.direction === 'bullish' ? przRange : 0);
          const przLower = pattern.D.price - (pattern.direction === 'bearish' ? przRange : 0);

          const przData = new Array(data.length).fill(null);
          const startIdx = Math.max(0, pattern.D.index - 3);
          const endIdx = Math.min(data.length - 1, pattern.D.index + 10);
          for (let i = startIdx; i <= endIdx; i++) {
            przData[i] = przUpper;
          }

          series.push({
            name: `Gartley ${idx} PRZ`,
            type: 'line',
            data: przData,
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: lightColor
            },
            z: 75
          });

          // Fibonacci ratio labels
          const ratioLabels = [
            { pos: pattern.B, label: `AB: ${pattern.XA_ratio.toFixed(3)}`, offset: 0.5 },
            { pos: pattern.C, label: `BC: ${pattern.AB_ratio.toFixed(3)}`, offset: 0.5 },
            { pos: pattern.D, label: `CD: ${pattern.BC_ratio.toFixed(3)}\nXD: ${pattern.CD_ratio.toFixed(3)}`, offset: 1 }
          ];

          ratioLabels.forEach((ratio, rIdx) => {
            series.push({
              name: `Gartley ${idx} Ratio ${rIdx}`,
              type: 'scatter',
              data: [[ratio.pos.index + 1, ratio.pos.price]],
              symbol: 'roundRect',
              symbolSize: [65, rIdx === 2 ? 35 : 22],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: color,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: ratio.label,
                position: 'inside',
                fontSize: 9,
                color: color,
                lineHeight: 12
              },
              z: 82
            });
          });

          // Pattern info badge
          const midIndex = Math.floor((pattern.X.index + pattern.D.index) / 2);
          const midPrice = (pattern.X.price + pattern.A.price) / 2;

          series.push({
            name: `Gartley ${idx} Info`,
            type: 'scatter',
            data: [[midIndex, midPrice]],
            symbol: 'roundRect',
            symbolSize: [100, 45],
            itemStyle: {
              color: `${color}dd`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🔷 Gartley\n${pattern.direction === 'bullish' ? 'BULLISH' : 'BEARISH'}\n${pattern.isValid ? '✅ Valid' : '⚠️ Check'}`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 13
            },
            z: 90
          });

          // Confirmation arrow
          if (pattern.isConfirmed) {
            series.push({
              name: `Gartley ${idx} Confirm`,
              type: 'scatter',
              data: [[pattern.D.index + 1, pattern.D.price]],
              symbol: 'arrow',
              symbolRotate: pattern.direction === 'bullish' ? 0 : 180,
              symbolSize: 20,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 100
            });
          }
        });

        // Stats badge
        if (result.patterns.length > 0) {
          const stats = {
            total: result.patterns.length,
            bullish: result.patterns.filter((p) => p.direction === 'bullish').length,
            bearish: result.patterns.filter((p) => p.direction === 'bearish').length,
            valid: result.patterns.filter((p) => p.isValid).length
          };

          const statsX = Math.max(0, data.length - 18);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

          series.push({
            name: 'Gartley Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [140, 60],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#8b5cf6',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🔷 Gartley Patterns\nTotal: ${stats.total} (✅${stats.valid})\n🟢${stats.bullish} | 🔴${stats.bearish}`,
              position: 'inside',
              fontSize: 10,
              color: '#e2e8f0',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[Gartley Pattern] Error:', error);
      }
    }

    // ==========================================================
    // 🦇 Alternate Bat Harmonic Pattern
    // ==========================================================
    if ((indicators as any).alternateBatPattern && data.length >= 50) {
      
      try {
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectAlternateBatPattern(highs, lows, closes, {
          zigzagPeriod: 3,
          showValidFormat: true,
          confirmLastPivot: false,
          confirmPeriod: 2,
          showBullish: true,
          showBearish: true,
          minXA_Ratio: 0.345,
          maxXA_Ratio: 0.399,
          minAB_Ratio: 0.382,
          maxAB_Ratio: 0.886,
          minBC_Ratio: 2.0,
          maxBC_Ratio: 3.618,
          minXA_D_Ratio: 1.00,
          maxXA_D_Ratio: 1.2
        });

        result.patterns.forEach((pattern, idx) => {
          const color = pattern.type === 'bullish' ? '#10b981' : '#f97316';
          const lightColor = pattern.type === 'bullish' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)';

          const X = pattern.points.X;
          const A = pattern.points.A;
          const B = pattern.points.B;
          const C = pattern.points.C;
          const D = pattern.points.D;

          // Draw XA line
          const xaLine = new Array(data.length).fill(null);
          for (let i = X.index; i <= A.index; i++) {
            const progress = (i - X.index) / (A.index - X.index);
            xaLine[i] = X.price + (A.price - X.price) * progress;
          }
          series.push({
            name: `AltBat ${idx} XA`,
            type: 'line',
            data: xaLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw AB line
          const abLine = new Array(data.length).fill(null);
          for (let i = A.index; i <= B.index; i++) {
            const progress = (i - A.index) / (B.index - A.index);
            abLine[i] = A.price + (B.price - A.price) * progress;
          }
          series.push({
            name: `AltBat ${idx} AB`,
            type: 'line',
            data: abLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw BC line
          const bcLine = new Array(data.length).fill(null);
          for (let i = B.index; i <= C.index; i++) {
            const progress = (i - B.index) / (C.index - B.index);
            bcLine[i] = B.price + (C.price - C.price) * progress;
          }
          series.push({
            name: `AltBat ${idx} BC`,
            type: 'line',
            data: bcLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw CD line
          const cdLine = new Array(data.length).fill(null);
          for (let i = C.index; i <= D.index; i++) {
            const progress = (i - C.index) / (D.index - C.index);
            cdLine[i] = C.price + (D.price - C.price) * progress;
          }
          series.push({
            name: `AltBat ${idx} CD`,
            type: 'line',
            data: cdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw XD line (completing pattern)
          const xdLine = new Array(data.length).fill(null);
          for (let i = X.index; i <= D.index; i++) {
            const progress = (i - X.index) / (D.index - X.index);
            xdLine[i] = X.price + (D.price - X.price) * progress;
          }
          series.push({
            name: `AltBat ${idx} XD`,
            type: 'line',
            data: xdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.6
            },
            z: 79
          });

          // Draw XABCD point labels
          const pointLabels = [
            { label: 'X', point: X },
            { label: 'A', point: A },
            { label: 'B', point: B },
            { label: 'C', point: C },
            { label: 'D', point: D }
          ];

          pointLabels.forEach((item) => {
            const isHigh = item.point.price > (item.label === 'A' || item.label === 'C' ? X.price : A.price);
            series.push({
              name: `AltBat ${idx} Point ${item.label}`,
              type: 'scatter',
              data: [[item.point.index, item.point.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: item.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: color,
                padding: [3, 6],
                borderRadius: 3
              },
              z: 85
            });
          });

          // PRZ (Potential Reversal Zone) highlighting
          const przData = new Array(data.length).fill(null);
          const startIdx = Math.max(0, D.index - 3);
          const endIdx = Math.min(data.length - 1, D.index + 10);
          for (let i = startIdx; i <= endIdx; i++) {
            przData[i] = pattern.prz.upper;
          }

          series.push({
            name: `AltBat ${idx} PRZ`,
            type: 'line',
            data: przData,
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: lightColor
            },
            z: 75
          });

          // Fibonacci ratio labels
          const ratioLabels = [
            { pos: B, label: `XA: ${pattern.ratios.XA_B.toFixed(3)}`, offset: 0.5 },
            { pos: C, label: `AB: ${pattern.ratios.AB_C.toFixed(3)}`, offset: 0.5 },
            { pos: D, label: `BC: ${pattern.ratios.BC_D.toFixed(3)}\nXA_D: ${pattern.ratios.XA_D.toFixed(3)}`, offset: 1 }
          ];

          ratioLabels.forEach((ratio, rIdx) => {
            series.push({
              name: `AltBat ${idx} Ratio ${rIdx}`,
              type: 'scatter',
              data: [[ratio.pos.index + 1, ratio.pos.price]],
              symbol: 'roundRect',
              symbolSize: [70, rIdx === 2 ? 35 : 22],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: color,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: ratio.label,
                position: 'inside',
                fontSize: 9,
                color: color,
                lineHeight: 12
              },
              z: 82
            });
          });

          // Pattern info badge
          const midIndex = Math.floor((X.index + D.index) / 2);
          const midPrice = (X.price + A.price) / 2;

          series.push({
            name: `AltBat ${idx} Info`,
            type: 'scatter',
            data: [[midIndex, midPrice]],
            symbol: 'roundRect',
            symbolSize: [110, 45],
            itemStyle: {
              color: `${color}dd`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🦇 Alt Bat\n${pattern.type === 'bullish' ? 'BULLISH' : 'BEARISH'}\n${pattern.isValid ? '✅ Valid' : '⚠️ Check'}`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 13
            },
            z: 90
          });

          // Confirmation arrow at D point
          if (pattern.confirmed) {
            series.push({
              name: `AltBat ${idx} Confirm`,
              type: 'scatter',
              data: [[D.index + 1, D.price]],
              symbol: 'arrow',
              symbolRotate: pattern.type === 'bullish' ? 0 : 180,
              symbolSize: 20,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 100
            });
          }
        });

        // Stats badge
        if (result.patterns.length > 0) {
          const stats = {
            total: result.patterns.length,
            bullish: result.patterns.filter((p) => p.type === 'bullish').length,
            bearish: result.patterns.filter((p) => p.type === 'bearish').length,
            valid: result.patterns.filter((p) => p.isValid).length
          };

          const statsX = Math.max(0, data.length - 18);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

          series.push({
            name: 'AltBat Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [150, 60],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#f97316',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🦇 Alternate Bat\nTotal: ${stats.total} (✅${stats.valid})\n🟢${stats.bullish} | 🔴${stats.bearish}`,
              position: 'inside',
              fontSize: 10,
              color: '#e2e8f0',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[Alternate Bat Pattern] Error:', error);
      }
    }

    // ==========================================================
    // 🔶 ABCD Harmonic Pattern (4-Point)
    // ==========================================================
    if ((indicators as any).abcdPattern && data.length >= 40) {
      
      try {
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectABCDPattern(highs, lows, closes, {
          zigzagPeriod: 3,
          showValidFormat: true,
          confirmLastPivot: false,
          confirmPeriod: 2,
          showBullish: true,
          showBearish: true,
          minAB_Ratio: 0.382,
          maxAB_Ratio: 0.886,
          minBC_Ratio: 1.13,
          maxBC_Ratio: 2.618
        });

        result.patterns.forEach((pattern, idx) => {
          const color = pattern.type === 'bullish' ? '#14b8a6' : '#f59e0b';
          const lightColor = pattern.type === 'bullish' ? 'rgba(20, 184, 166, 0.2)' : 'rgba(245, 158, 11, 0.2)';

          const A = pattern.points.A;
          const B = pattern.points.B;
          const C = pattern.points.C;
          const D = pattern.points.D;

          // Draw AB line
          const abLine = new Array(data.length).fill(null);
          for (let i = A.index; i <= B.index; i++) {
            const progress = (i - A.index) / (B.index - A.index);
            abLine[i] = A.price + (B.price - A.price) * progress;
          }
          series.push({
            name: `ABCD ${idx} AB`,
            type: 'line',
            data: abLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw BC line
          const bcLine = new Array(data.length).fill(null);
          for (let i = B.index; i <= C.index; i++) {
            const progress = (i - B.index) / (C.index - B.index);
            bcLine[i] = B.price + (C.price - B.price) * progress;
          }
          series.push({
            name: `ABCD ${idx} BC`,
            type: 'line',
            data: bcLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw CD line
          const cdLine = new Array(data.length).fill(null);
          for (let i = C.index; i <= D.index; i++) {
            const progress = (i - C.index) / (D.index - C.index);
            cdLine[i] = C.price + (D.price - C.price) * progress;
          }
          series.push({
            name: `ABCD ${idx} CD`,
            type: 'line',
            data: cdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw ABCD point labels
          const pointLabels = [
            { label: 'A', point: A },
            { label: 'B', point: B },
            { label: 'C', point: C },
            { label: 'D', point: D }
          ];

          pointLabels.forEach((item) => {
            const isHigh = (item.label === 'A' || item.label === 'C') === (pattern.type === 'bullish');
            series.push({
              name: `ABCD ${idx} Point ${item.label}`,
              type: 'scatter',
              data: [[item.point.index, item.point.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: item.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: color,
                padding: [3, 6],
                borderRadius: 3
              },
              z: 85
            });
          });

          // Target levels (38.2% and 61.8% CD retracement)
          const endIdx = Math.min(data.length - 1, D.index + 20);
          
          // Target 1 (38.2%)
          const target1Line = new Array(data.length).fill(null);
          for (let i = D.index; i <= endIdx; i++) {
            target1Line[i] = pattern.targetLevels.target1;
          }
          series.push({
            name: `ABCD ${idx} Target1`,
            type: 'line',
            data: target1Line,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.6
            },
            z: 78
          });

          // Target 2 (61.8%)
          const target2Line = new Array(data.length).fill(null);
          for (let i = D.index; i <= endIdx; i++) {
            target2Line[i] = pattern.targetLevels.target2;
          }
          series.push({
            name: `ABCD ${idx} Target2`,
            type: 'line',
            data: target2Line,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.8
            },
            z: 78
          });

          // Target labels
          series.push({
            name: `ABCD ${idx} T1 Label`,
            type: 'scatter',
            data: [[endIdx - 1, pattern.targetLevels.target1]],
            symbol: 'roundRect',
            symbolSize: [45, 18],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.85)',
              borderColor: color,
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: 'T1: 38.2%',
              position: 'inside',
              fontSize: 8,
              color: color
            },
            z: 82
          });

          series.push({
            name: `ABCD ${idx} T2 Label`,
            type: 'scatter',
            data: [[endIdx - 1, pattern.targetLevels.target2]],
            symbol: 'roundRect',
            symbolSize: [45, 18],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.85)',
              borderColor: color,
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: 'T2: 61.8%',
              position: 'inside',
              fontSize: 8,
              color: color
            },
            z: 82
          });

          // Fibonacci ratio labels
          const ratioLabels = [
            { pos: C, label: `AB: ${pattern.ratios.AB_C.toFixed(3)}`, offset: 0.5 },
            { pos: D, label: `BC: ${pattern.ratios.BC_D.toFixed(3)}`, offset: 1 }
          ];

          ratioLabels.forEach((ratio, rIdx) => {
            series.push({
              name: `ABCD ${idx} Ratio ${rIdx}`,
              type: 'scatter',
              data: [[ratio.pos.index + 1, ratio.pos.price]],
              symbol: 'roundRect',
              symbolSize: [65, 22],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: color,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: ratio.label,
                position: 'inside',
                fontSize: 9,
                color: color,
                lineHeight: 12
              },
              z: 82
            });
          });

          // Pattern info badge
          const midIndex = Math.floor((A.index + D.index) / 2);
          const midPrice = (A.price + C.price) / 2;

          series.push({
            name: `ABCD ${idx} Info`,
            type: 'scatter',
            data: [[midIndex, midPrice]],
            symbol: 'roundRect',
            symbolSize: [100, 45],
            itemStyle: {
              color: `${color}dd`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🔶 ABCD\n${pattern.type === 'bullish' ? 'BULLISH' : 'BEARISH'}\n${pattern.isValid ? '✅ Valid' : '⚠️ Check'}`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 13
            },
            z: 90
          });

          // Confirmation arrow at D point
          if (pattern.confirmed) {
            series.push({
              name: `ABCD ${idx} Confirm`,
              type: 'scatter',
              data: [[D.index + 1, D.price]],
              symbol: 'arrow',
              symbolRotate: pattern.type === 'bullish' ? 0 : 180,
              symbolSize: 20,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 100
            });
          }
        });

        // Stats badge
        if (result.patterns.length > 0) {
          const stats = {
            total: result.patterns.length,
            bullish: result.patterns.filter((p) => p.type === 'bullish').length,
            bearish: result.patterns.filter((p) => p.type === 'bearish').length,
            valid: result.patterns.filter((p) => p.isValid).length
          };

          const statsX = Math.max(0, data.length - 18);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

          series.push({
            name: 'ABCD Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [140, 60],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#14b8a6',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🔶 ABCD Patterns\nTotal: ${stats.total} (✅${stats.valid})\n🟢${stats.bullish} | 🔴${stats.bearish}`,
              position: 'inside',
              fontSize: 10,
              color: '#e2e8f0',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[ABCD Pattern] Error:', error);
      }
    }

    // ==========================================================
    // 🦈 Alternative Shark Harmonic Pattern
    // ==========================================================
    if ((indicators as any).alternativeSharkPattern && data.length >= 50) {
      
      try {
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectAlternativeSharkPattern(highs, lows, closes, {
          zigzagPeriod: 3,
          showValidFormat: true,
          confirmLastPivot: false,
          confirmPeriod: 2,
          showBullish: true,
          showBearish: true,
          minXA_Ratio: 0.382,
          maxXA_Ratio: 0.618,
          minAB_Ratio: 1.13,
          maxAB_Ratio: 1.618,
          minBC_Ratio: 1.618,
          maxBC_Ratio: 2.24,
          minXA_D_Ratio: 0.886,
          maxXA_D_Ratio: 1.13
        });

        result.patterns.forEach((pattern, idx) => {
          const color = pattern.type === 'bullish' ? '#06b6d4' : '#e11d48';
          const lightColor = pattern.type === 'bullish' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(225, 29, 72, 0.2)';

          const X = pattern.points.X;
          const A = pattern.points.A;
          const B = pattern.points.B;
          const C = pattern.points.C;
          const D = pattern.points.D;

          // Draw XA line
          const xaLine = new Array(data.length).fill(null);
          for (let i = X.index; i <= A.index; i++) {
            const progress = (i - X.index) / (A.index - X.index);
            xaLine[i] = X.price + (A.price - X.price) * progress;
          }
          series.push({
            name: `AltShark ${idx} XA`,
            type: 'line',
            data: xaLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw AB line
          const abLine = new Array(data.length).fill(null);
          for (let i = A.index; i <= B.index; i++) {
            const progress = (i - A.index) / (B.index - A.index);
            abLine[i] = A.price + (B.price - A.price) * progress;
          }
          series.push({
            name: `AltShark ${idx} AB`,
            type: 'line',
            data: abLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw BC line
          const bcLine = new Array(data.length).fill(null);
          for (let i = B.index; i <= C.index; i++) {
            const progress = (i - B.index) / (C.index - B.index);
            bcLine[i] = B.price + (C.price - B.price) * progress;
          }
          series.push({
            name: `AltShark ${idx} BC`,
            type: 'line',
            data: bcLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw CD line
          const cdLine = new Array(data.length).fill(null);
          for (let i = C.index; i <= D.index; i++) {
            const progress = (i - C.index) / (D.index - C.index);
            cdLine[i] = C.price + (D.price - C.price) * progress;
          }
          series.push({
            name: `AltShark ${idx} CD`,
            type: 'line',
            data: cdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw XD line (completing pattern)
          const xdLine = new Array(data.length).fill(null);
          for (let i = X.index; i <= D.index; i++) {
            const progress = (i - X.index) / (D.index - X.index);
            xdLine[i] = X.price + (D.price - X.price) * progress;
          }
          series.push({
            name: `AltShark ${idx} XD`,
            type: 'line',
            data: xdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.6
            },
            z: 79
          });

          // Draw XABCD point labels
          const pointLabels = [
            { label: 'X', point: X },
            { label: 'A', point: A },
            { label: 'B', point: B },
            { label: 'C', point: C },
            { label: 'D', point: D }
          ];

          pointLabels.forEach((item) => {
            const isHigh = item.point.price > (item.label === 'A' || item.label === 'C' ? X.price : A.price);
            series.push({
              name: `AltShark ${idx} Point ${item.label}`,
              type: 'scatter',
              data: [[item.point.index, item.point.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: item.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: color,
                padding: [3, 6],
                borderRadius: 3
              },
              z: 85
            });
          });

          // PRZ (Potential Reversal Zone) highlighting
          const przData = new Array(data.length).fill(null);
          const startIdx = Math.max(0, D.index - 3);
          const endIdx = Math.min(data.length - 1, D.index + 10);
          for (let i = startIdx; i <= endIdx; i++) {
            przData[i] = pattern.prz.upper;
          }

          series.push({
            name: `AltShark ${idx} PRZ`,
            type: 'line',
            data: przData,
            symbol: 'none',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: lightColor
            },
            z: 75
          });

          // Fibonacci ratio labels
          const ratioLabels = [
            { pos: B, label: `XA: ${pattern.ratios.XA_B.toFixed(3)}`, offset: 0.5 },
            { pos: C, label: `AB: ${pattern.ratios.AB_C.toFixed(3)}`, offset: 0.5 },
            { pos: D, label: `BC: ${pattern.ratios.BC_D.toFixed(3)}\nXA_D: ${pattern.ratios.XA_D.toFixed(3)}`, offset: 1 }
          ];

          ratioLabels.forEach((ratio, rIdx) => {
            series.push({
              name: `AltShark ${idx} Ratio ${rIdx}`,
              type: 'scatter',
              data: [[ratio.pos.index + 1, ratio.pos.price]],
              symbol: 'roundRect',
              symbolSize: [70, rIdx === 2 ? 35 : 22],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: color,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: ratio.label,
                position: 'inside',
                fontSize: 9,
                color: color,
                lineHeight: 12
              },
              z: 82
            });
          });

          // Pattern info badge
          const midIndex = Math.floor((X.index + D.index) / 2);
          const midPrice = (X.price + A.price) / 2;

          series.push({
            name: `AltShark ${idx} Info`,
            type: 'scatter',
            data: [[midIndex, midPrice]],
            symbol: 'roundRect',
            symbolSize: [110, 45],
            itemStyle: {
              color: `${color}dd`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🦈 Alt Shark\n${pattern.type === 'bullish' ? 'BULLISH' : 'BEARISH'}\n${pattern.isValid ? '✅ Valid' : '⚠️ Check'}`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 13
            },
            z: 90
          });

          // Confirmation arrow at D point
          if (pattern.confirmed) {
            series.push({
              name: `AltShark ${idx} Confirm`,
              type: 'scatter',
              data: [[D.index + 1, D.price]],
              symbol: 'arrow',
              symbolRotate: pattern.type === 'bullish' ? 0 : 180,
              symbolSize: 20,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 100
            });
          }
        });

        // Stats badge
        if (result.patterns.length > 0) {
          const stats = {
            total: result.patterns.length,
            bullish: result.patterns.filter((p) => p.type === 'bullish').length,
            bearish: result.patterns.filter((p) => p.type === 'bearish').length,
            valid: result.patterns.filter((p) => p.isValid).length
          };

          const statsX = Math.max(0, data.length - 18);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

          series.push({
            name: 'AltShark Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [160, 60],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#06b6d4',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🦈 Alternative Shark\nTotal: ${stats.total} (✅${stats.valid})\n🟢${stats.bullish} | 🔴${stats.bearish}`,
              position: 'inside',
              fontSize: 10,
              color: '#e2e8f0',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[Alternative Shark Pattern] Error:', error);
      }
    }

    // ==========================================================
    // 🛣️ Three Drive Pattern [LuxAlgo]
    // ==========================================================
    if ((indicators as any).threeDrivePattern && data.length >= 60) {
      
      try {
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = detectThreeDrivePattern(highs, lows, closes, {
          zigzagPeriod: 3,
          showValidOnly: true,
          showBullish: true,
          showBearish: true,
          minRetracement: 0.618,
          maxRetracement: 0.786,
          minExtension: 1.272,
          maxExtension: 1.618,
          widthMarginPercent: 100
        });

        result.patterns.forEach((pattern, idx) => {
          const color = pattern.type === 'bullish' ? '#8b5cf6' : '#ec4899';
          const lightColor = pattern.type === 'bullish' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)';

          const Y = pattern.points.Y;
          const Z = pattern.points.Z;
          const A = pattern.points.A;
          const B = pattern.points.B;
          const C = pattern.points.C;
          const D = pattern.points.D;

          // Draw YZ line (First Drive)
          const yzLine = new Array(data.length).fill(null);
          for (let i = Y.index; i <= Z.index; i++) {
            const progress = (i - Y.index) / (Z.index - Y.index);
            yzLine[i] = Y.price + (Z.price - Y.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} YZ`,
            type: 'line',
            data: yzLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw ZA line (First Retracement)
          const zaLine = new Array(data.length).fill(null);
          for (let i = Z.index; i <= A.index; i++) {
            const progress = (i - Z.index) / (A.index - Z.index);
            zaLine[i] = Z.price + (A.price - Z.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} ZA`,
            type: 'line',
            data: zaLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw AB line (Second Drive)
          const abLine = new Array(data.length).fill(null);
          for (let i = A.index; i <= B.index; i++) {
            const progress = (i - A.index) / (B.index - A.index);
            abLine[i] = A.price + (B.price - A.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} AB`,
            type: 'line',
            data: abLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw BC line (Second Retracement)
          const bcLine = new Array(data.length).fill(null);
          for (let i = B.index; i <= C.index; i++) {
            const progress = (i - B.index) / (C.index - B.index);
            bcLine[i] = B.price + (C.price - B.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} BC`,
            type: 'line',
            data: bcLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw CD line (Third Drive)
          const cdLine = new Array(data.length).fill(null);
          for (let i = C.index; i <= D.index; i++) {
            const progress = (i - C.index) / (D.index - C.index);
            cdLine[i] = C.price + (D.price - C.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} CD`,
            type: 'line',
            data: cdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 2,
              type: 'solid'
            },
            z: 80
          });

          // Draw Y-A and Z-B connection lines (dashed)
          const yaLine = new Array(data.length).fill(null);
          for (let i = Y.index; i <= A.index; i++) {
            const progress = (i - Y.index) / (A.index - Y.index);
            yaLine[i] = Y.price + (A.price - Y.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} YA`,
            type: 'line',
            data: yaLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.5
            },
            z: 79
          });

          const zbLine = new Array(data.length).fill(null);
          for (let i = Z.index; i <= B.index; i++) {
            const progress = (i - Z.index) / (B.index - Z.index);
            zbLine[i] = Z.price + (B.price - Z.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} ZB`,
            type: 'line',
            data: zbLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.5
            },
            z: 79
          });

          const acLine = new Array(data.length).fill(null);
          for (let i = A.index; i <= C.index; i++) {
            const progress = (i - A.index) / (C.index - A.index);
            acLine[i] = A.price + (C.price - A.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} AC`,
            type: 'line',
            data: acLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.5
            },
            z: 79
          });

          const bdLine = new Array(data.length).fill(null);
          for (let i = B.index; i <= D.index; i++) {
            const progress = (i - B.index) / (D.index - B.index);
            bdLine[i] = B.price + (D.price - B.price) * progress;
          }
          series.push({
            name: `3Drive ${idx} BD`,
            type: 'line',
            data: bdLine,
            symbol: 'none',
            lineStyle: {
              color,
              width: 1,
              type: 'dashed',
              opacity: 0.5
            },
            z: 79
          });

          // Draw YABCD point labels
          const pointLabels = [
            { label: 'Y', point: Y },
            { label: 'Z', point: Z },
            { label: 'A', point: A },
            { label: 'B', point: B },
            { label: 'C', point: C },
            { label: 'D', point: D }
          ];

          pointLabels.forEach((item) => {
            const isDrive = item.label === 'Z' || item.label === 'B' || item.label === 'D';
            const isHigh = pattern.type === 'bullish' ? isDrive : !isDrive;
            
            series.push({
              name: `3Drive ${idx} Point ${item.label}`,
              type: 'scatter',
              data: [[item.point.index, item.point.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: item.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: color,
                padding: [3, 6],
                borderRadius: 3
              },
              z: 85
            });
          });

          // Fibonacci ratio labels
          const ratioLabels = [
            { pos: A, label: `Ret: ${pattern.ratios.ZA_retracement.toFixed(3)}`, name: 'ZA' },
            { pos: B, label: `Ext: ${pattern.ratios.AB_extension.toFixed(3)}`, name: 'AB' },
            { pos: C, label: `Ret: ${pattern.ratios.BC_retracement.toFixed(3)}`, name: 'BC' },
            { pos: D, label: `Ext: ${pattern.ratios.CD_extension.toFixed(3)}`, name: 'CD' }
          ];

          ratioLabels.forEach((ratio, rIdx) => {
            series.push({
              name: `3Drive ${idx} Ratio ${ratio.name}`,
              type: 'scatter',
              data: [[ratio.pos.index + 1, ratio.pos.price]],
              symbol: 'roundRect',
              symbolSize: [65, 22],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: color,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: ratio.label,
                position: 'inside',
                fontSize: 9,
                color: color,
                lineHeight: 12
              },
              z: 82
            });
          });

          // Drive labels (1, 2, 3)
          const driveLabels = [
            { pos: { index: Math.floor((Y.index + Z.index) / 2), price: (Y.price + Z.price) / 2 }, label: 'Drive 1' },
            { pos: { index: Math.floor((A.index + B.index) / 2), price: (A.price + B.price) / 2 }, label: 'Drive 2' },
            { pos: { index: Math.floor((C.index + D.index) / 2), price: (C.price + D.price) / 2 }, label: 'Drive 3' }
          ];

          driveLabels.forEach((drive) => {
            series.push({
              name: `3Drive ${idx} ${drive.label}`,
              type: 'scatter',
              data: [[drive.pos.index, drive.pos.price]],
              symbol: 'roundRect',
              symbolSize: [70, 22],
              itemStyle: {
                color: lightColor,
                borderColor: color,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: drive.label,
                position: 'inside',
                fontSize: 9,
                color: color,
                fontWeight: 'bold'
              },
              z: 81
            });
          });

          // Pattern info badge
          const midIndex = Math.floor((Y.index + D.index) / 2);
          const midPrice = (Math.max(Y.price, Z.price, A.price, B.price, C.price, D.price) + 
                            Math.min(Y.price, Z.price, A.price, B.price, C.price, D.price)) / 2;

          series.push({
            name: `3Drive ${idx} Info`,
            type: 'scatter',
            data: [[midIndex, midPrice]],
            symbol: 'roundRect',
            symbolSize: [120, 45],
            itemStyle: {
              color: `${color}dd`,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🛣️ 3 Drive\n${pattern.type === 'bullish' ? 'BULLISH' : 'BEARISH'}\n${pattern.isValid ? '✅ Valid' : '⚠️ Check'}`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 13
            },
            z: 90
          });
        });

        // Stats badge
        if (result.patterns.length > 0) {
          const stats = {
            total: result.patterns.length,
            bullish: result.patterns.filter((p) => p.type === 'bullish').length,
            bearish: result.patterns.filter((p) => p.type === 'bearish').length,
            valid: result.patterns.filter((p) => p.isValid).length
          };

          const statsX = Math.max(0, data.length - 18);
          const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

          series.push({
            name: '3Drive Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [150, 60],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#8b5cf6',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `🛣️ Three Drive [Lux]\nTotal: ${stats.total} (✅${stats.valid})\n🟢${stats.bullish} | 🔴${stats.bearish}`,
              position: 'inside',
              fontSize: 10,
              color: '#e2e8f0',
              lineHeight: 14
            },
            z: 120
          });
        }
      } catch (error) {
        console.error('[Three Drive Pattern] Error:', error);
      }
    }

    // ==========================================================
    // 📊 Ehlers Instantaneous Trend [LazyBear]
    // ==========================================================
    if ((indicators as any).ehlersIT && data.length >= 10) {
      
      try {
        const opens = ohlcv.map((c) => c.open);
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = calculateEhlersIT(opens, highs, lows, closes, {
          alpha: 0.07,
          source: 'hl2',
          showFillRegion: true,
          enableBarColors: false
        });

        const crossovers = detectEhlersITCrossovers(result);

        // Draw IT line (Instantaneous Trend)
        series.push({
          name: 'Ehlers IT',
          type: 'line',
          data: result.it,
          symbol: 'none',
          lineStyle: {
            color: '#ef4444',
            width: 2,
            type: 'solid'
          },
          z: 85
        });

        // Draw Lag line (Trigger)
        series.push({
          name: 'Ehlers Lag',
          type: 'line',
          data: result.lag,
          symbol: 'none',
          lineStyle: {
            color: '#3b82f6',
            width: 2,
            type: 'solid'
          },
          z: 85
        });

        // Fill regions between IT and Lag
        // Green fill when IT > Lag (uptrend)
        const upFillData: (number | null)[] = [];
        for (let i = 0; i < data.length; i++) {
          if (result.it[i] !== null && result.lag[i] !== null) {
            upFillData.push(result.it[i]! > result.lag[i]! ? result.lag[i] : null);
          } else {
            upFillData.push(null);
          }
        }

        series.push({
          name: 'EIT UpTrend Fill',
          type: 'line',
          data: upFillData,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: 'rgba(34, 197, 94, 0.25)',
            origin: 'start'
          },
          stack: 'eit',
          z: 75
        });

        // Red fill when IT < Lag (downtrend)
        const downFillData: (number | null)[] = [];
        for (let i = 0; i < data.length; i++) {
          if (result.it[i] !== null && result.lag[i] !== null) {
            downFillData.push(result.it[i]! < result.lag[i]! ? result.it[i] : null);
          } else {
            downFillData.push(null);
          }
        }

        series.push({
          name: 'EIT DownTrend Fill',
          type: 'line',
          data: downFillData,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: 'rgba(239, 68, 68, 0.25)',
            origin: 'start'
          },
          stack: 'eit',
          z: 75
        });

        // Draw bullish crossover signals
        crossovers.bullishCrosses.forEach((idx) => {
          if (result.it[idx] !== null) {
            series.push({
              name: `EIT Bull Cross ${idx}`,
              type: 'scatter',
              data: [[idx, result.it[idx]!]],
              symbol: 'arrow',
              symbolRotate: 0,
              symbolSize: 18,
              itemStyle: {
                color: '#22c55e',
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 95
            });
          }
        });

        // Draw bearish crossover signals
        crossovers.bearishCrosses.forEach((idx) => {
          if (result.it[idx] !== null) {
            series.push({
              name: `EIT Bear Cross ${idx}`,
              type: 'scatter',
              data: [[idx, result.it[idx]!]],
              symbol: 'arrow',
              symbolRotate: 180,
              symbolSize: 18,
              itemStyle: {
                color: '#ef4444',
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 95
            });
          }
        });

        // Stats badge
        const lastTrend = result.trend[result.trend.length - 1];
        const bullCrossCount = crossovers.bullishCrosses.length;
        const bearCrossCount = crossovers.bearishCrosses.length;

        const statsX = Math.max(0, data.length - 18);
        const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

        series.push({
          name: 'EIT Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: lastTrend === 'up' ? '#22c55e' : lastTrend === 'down' ? '#ef4444' : '#64748b',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `📊 Ehlers IT [LB]\nTrend: ${lastTrend === 'up' ? '↑ UP' : lastTrend === 'down' ? '↓ DOWN' : '↔ FLAT'}\nCrosses: 🟢${bullCrossCount} | 🔴${bearCrossCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
      } catch (error) {
        console.error('[Ehlers IT] Error:', error);
      }
    }

    // ==========================================================
    // 📈 SuperTrended Moving Averages
    // ==========================================================
    if ((indicators as any).supertrendMA && data.length >= 10) {
      
      try {
        const opens = ohlcv.map((c) => c.open);
        const highs = ohlcv.map((c) => c.high);
        const lows = ohlcv.map((c) => c.low);
        const closes = ohlcv.map((c) => c.close);

        const result = calculateSuperTrendMA(opens, highs, lows, closes, {
          maType: 'EMA',
          length: 100,
          atrPeriod: 10,
          atrMultiplier: 0.5,
          useStandardATR: true,
          tillsonVolumeFactor: 0.7,
          showSignals: true,
          highlighting: true
        });

        // Draw Upper Band (green - uptrend)
        series.push({
          name: 'SuperTrend Up',
          type: 'line',
          data: result.upperBand,
          symbol: 'none',
          lineStyle: {
            color: '#22c55e',
            width: 2,
            type: 'solid'
          },
          z: 85
        });

        // Draw Lower Band (red - downtrend)
        series.push({
          name: 'SuperTrend Down',
          type: 'line',
          data: result.lowerBand,
          symbol: 'none',
          lineStyle: {
            color: '#ef4444',
            width: 2,
            type: 'solid'
          },
          z: 85
        });

        // Fill area for uptrend (between price and upper band)
        const upFillData: (number | null)[] = [];
        for (let i = 0; i < data.length; i++) {
          if (result.trend[i] === 1 && result.upperBand[i] !== null) {
            upFillData.push(result.upperBand[i]);
          } else {
            upFillData.push(null);
          }
        }

        series.push({
          name: 'SuperTrend Up Fill',
          type: 'line',
          data: upFillData,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: 'rgba(34, 197, 94, 0.15)'
          },
          z: 70
        });

        // Fill area for downtrend (between price and lower band)
        const downFillData: (number | null)[] = [];
        for (let i = 0; i < data.length; i++) {
          if (result.trend[i] === -1 && result.lowerBand[i] !== null) {
            downFillData.push(result.lowerBand[i]);
          } else {
            downFillData.push(null);
          }
        }

        series.push({
          name: 'SuperTrend Down Fill',
          type: 'line',
          data: downFillData,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: 'rgba(239, 68, 68, 0.15)'
          },
          z: 70
        });

        // Draw buy signals
        result.buySignals.forEach((idx) => {
          if (result.upperBand[idx] !== null) {
            series.push({
              name: `ST Buy ${idx}`,
              type: 'scatter',
              data: [[idx, result.upperBand[idx]!]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: '#22c55e',
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: 'BUY',
                position: 'bottom',
                fontSize: 9,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#22c55e',
                padding: [2, 5],
                borderRadius: 2
              },
              z: 95
            });
          }
        });

        // Draw sell signals
        result.sellSignals.forEach((idx) => {
          if (result.lowerBand[idx] !== null) {
            series.push({
              name: `ST Sell ${idx}`,
              type: 'scatter',
              data: [[idx, result.lowerBand[idx]!]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: '#ef4444',
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: 'SELL',
                position: 'top',
                fontSize: 9,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#ef4444',
                padding: [2, 5],
                borderRadius: 2
              },
              z: 95
            });
          }
        });

        // Stats badge
        const lastTrend = result.trend[result.trend.length - 1];
        const buyCount = result.buySignals.length;
        const sellCount = result.sellSignals.length;

        const statsX = Math.max(0, data.length - 18);
        const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.03;

        series.push({
          name: 'SuperTrend MA Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [150, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: lastTrend === 1 ? '#22c55e' : '#ef4444',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `📈 SuperTrend MA\nTrend: ${lastTrend === 1 ? '↑ UP' : '↓ DOWN'}\nSignals: 🟢${buyCount} | 🔴${sellCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
      } catch (error) {
        console.error('[SuperTrend MA] Error:', error);
      }
    }

    // ====================
    // TREND LINE METHODS (TLM)
    // ====================
    if ((indicators as any).trendLineMethods) {
      try {
        const highs = ohlcv.map(d => d.high);
        const lows = ohlcv.map(d => d.low);
        
        const config = (indicators as any).trendLineMethods.config || {};
        const result = calculateTrendLineMethodsLib(data, config);
        
        // Method 1: Pivot Span Trendline
        if (config.enablePivotSpan !== false && result.pivotSpan) {
          const hl = result.pivotSpan.highTrendLine; // high line
          const ll = result.pivotSpan.lowTrendLine; // low line
          
          if (hl) {
          
          // High trend line
          series.push({
            name: 'Pivot Span High Line',
            type: 'line',
            data: dates.map((d, i) => {
              if (i >= hl.x1 && i <= hl.x2) {
                const progress = (i - hl.x1) / (hl.x2 - hl.x1);
                const y = hl.y1 + progress * (hl.y2 - hl.y1);
                return [d, y];
              }
              return [d, null];
            }),
            lineStyle: {
              color: '#22c55e',
              width: 2,
              type: 'solid'
            },
            symbol: 'none',
            z: 80
          });
          
          // Low trend line
          if (ll) {
            series.push({
              name: 'Pivot Span Low Line',
              type: 'line',
              data: dates.map((d, i) => {
                if (i >= ll.x1 && i <= ll.x2) {
                  const progress = (i - ll.x1) / (ll.x2 - ll.x1);
                  const y = ll.y1 + progress * (ll.y2 - ll.y1);
                  return [d, y];
                }
                return [d, null];
              }),
              lineStyle: {
                color: '#ef4444',
                width: 2,
                type: 'solid'
              },
              symbol: 'none',
              z: 80
            });
            
            // Fill area between lines
            const fillData: any[] = [];
            for (let i = Math.floor(hl.x1); i <= Math.ceil(hl.x2); i++) {
              if (i >= 0 && i < dates.length) {
                const progressHigh = (i - hl.x1) / (hl.x2 - hl.x1);
                const yHigh = hl.y1 + progressHigh * (hl.y2 - hl.y1);
                
                const progressLow = (i - ll.x1) / (ll.x2 - ll.x1);
                const yLow = ll.y1 + progressLow * (ll.y2 - ll.y1);
                
                fillData.push([dates[i], yHigh, yLow]);
              }
            }
            
            series.push({
              name: 'Pivot Span Fill',
              type: 'custom',
              renderItem: (params: any, api: any) => {
                const idx = params.dataIndex;
                if (idx >= fillData.length) return null;
                
                const [date, yHigh, yLow] = fillData[idx];
                const coord1 = api.coord([date, yHigh]);
                const coord2 = api.coord([date, yLow]);
                
                return {
                  type: 'rect',
                  shape: {
                    x: coord1[0] - 2,
                    y: coord1[1],
                    width: 4,
                    height: coord2[1] - coord1[1]
                  },
                  style: api.style({
                    fill: 'rgba(59, 130, 246, 0.1)',
                    stroke: 'none'
                  })
                };
              },
              data: fillData,
              z: 70
            });
          }
          
          // Pivot points
          ((result.pivotSpan as any).highPivots || []).forEach((pivot: { index: number; price: number }) => {
            series.push({
              name: 'Pivot High',
              type: 'scatter',
              data: [[dates[pivot.index], pivot.price]],
              symbol: 'triangle',
              symbolSize: 8,
              itemStyle: {
                color: '#22c55e',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 85
            });
          });
          
          ((result.pivotSpan as any).lowPivots || []).forEach((pivot: { index: number; price: number }) => {
            series.push({
              name: 'Pivot Low',
              type: 'scatter',
              data: [[dates[pivot.index], pivot.price]],
              symbol: 'triangle',
              symbolRotate: 180,
              symbolSize: 8,
              itemStyle: {
                color: '#ef4444',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 85
            });
          });
        }
        
        // Method 2: 5-Point Straight Channel
        if (config.enableFivePoint && result.fivePoint) {
          const hl = result.fivePoint.highChannelLine;
          const ll = result.fivePoint.lowChannelLine;
          
          if (hl) {
          
          // High channel line
          series.push({
            name: '5-Point High Channel',
            type: 'line',
            data: dates.map((d, i) => {
              if (i >= hl.x1 && i <= hl.x2) {
                const progress = (i - hl.x1) / (hl.x2 - hl.x1);
                const y = hl.y1 + progress * (hl.y2 - hl.y1);
                return [d, y];
              }
              return [d, null];
            }),
            lineStyle: {
              color: '#8b5cf6',
              width: 2,
              type: 'dashed'
            },
            symbol: 'none',
            z: 80
          });
          
          // Low channel line
          if (ll) {
            series.push({
              name: '5-Point Low Channel',
              type: 'line',
              data: dates.map((d, i) => {
                if (i >= ll.x1 && i <= ll.x2) {
                  const progress = (i - ll.x1) / (ll.x2 - ll.x1);
                  const y = ll.y1 + progress * (ll.y2 - ll.y1);
                  return [d, y];
                }
                return [d, null];
              }),
              lineStyle: {
                color: '#8b5cf6',
                width: 2,
                type: 'dashed'
              },
              symbol: 'none',
              z: 80
            });
            
            // Fill area
            const fillData: any[] = [];
            for (let i = Math.floor(hl.x1); i <= Math.ceil(hl.x2); i++) {
              if (i >= 0 && i < dates.length) {
                const progressHigh = (i - hl.x1) / (hl.x2 - hl.x1);
                const yHigh = hl.y1 + progressHigh * (hl.y2 - hl.y1);
                
                const progressLow = (i - ll.x1) / (ll.x2 - ll.x1);
                const yLow = ll.y1 + progressLow * (ll.y2 - ll.y1);
                
                fillData.push([dates[i], yHigh, yLow]);
              }
            }
            
            series.push({
              name: '5-Point Fill',
              type: 'custom',
              renderItem: (params: any, api: any) => {
                const idx = params.dataIndex;
                if (idx >= fillData.length) return null;
                
                const [date, yHigh, yLow] = fillData[idx];
                const coord1 = api.coord([date, yHigh]);
                const coord2 = api.coord([date, yLow]);
                
                return {
                  type: 'rect',
                  shape: {
                    x: coord1[0] - 2,
                    y: coord1[1],
                    width: 4,
                    height: coord2[1] - coord1[1]
                  },
                  style: api.style({
                    fill: 'rgba(139, 92, 246, 0.1)',
                    stroke: 'none'
                  })
                };
              },
              data: fillData,
              z: 70
            });
          }
          // Channel endpoints markers
          if (hl) {
            series.push({
              name: '5-Point High Start',
              type: 'scatter',
              data: [[dates[hl.x1], hl.y1]],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: '#8b5cf6',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 85
            });
            series.push({
              name: '5-Point High End',
              type: 'scatter',
              data: [[dates[hl.x2], hl.y2]],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: '#8b5cf6',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 85
            });
          }
          if (ll) {
            series.push({
              name: '5-Point Low Start',
              type: 'scatter',
              data: [[dates[ll.x1], ll.y1]],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: '#8b5cf6',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 85
            });
            series.push({
              name: '5-Point Low End',
              type: 'scatter',
              data: [[dates[ll.x2], ll.y2]],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: '#8b5cf6',
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 85
            });
          }
          }
        }
        
        const pivotHighCount = (result.pivotSpan as any).highPivots?.length || 0;
        const pivotLowCount = (result.pivotSpan as any).lowPivots?.length || 0;
        const fivePointHighCount = result.fivePoint.highChannelLine ? 2 : 0;
        const fivePointLowCount = result.fivePoint.lowChannelLine ? 2 : 0;
        
        const statsX = Math.max(0, data.length - 18);
        const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.04;
        
        let statsText = '📏 Trend Line Methods\n';
        if (config.enablePivotSpan !== false) {
          statsText += `Pivot Span: ${result.pivotSpan?.highTrendLine ? '✓' : '✗'} | 🔺${pivotHighCount} 🔻${pivotLowCount}\n`;
        }
        if (config.enableFivePoint) {
          statsText += `5-Point Channel: ${result.fivePoint?.highChannelLine ? '✓' : '✗'} | ⚫${fivePointHighCount}/${fivePointLowCount}`;
        }
        
        series.push({
          name: 'TLM Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [180, config.enablePivotSpan && config.enableFivePoint ? 75 : 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#3b82f6',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: statsText,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        }
      } catch (error) {
        console.error('[Trend Line Methods] Error:', error);
      }
    }

    // ====================
    // DYNAMIC SUPPORT & RESISTANCE (DSR)
    // ====================
    if ((indicators as any).dynamicSR) {
      try {
        const highs = ohlcv.map(d => d.high);
        const lows = ohlcv.map(d => d.low);
        const closes = ohlcv.map(d => d.close);
        const volumes = ohlcv.map(d => d.volume);
        
        const config = (indicators as any).dynamicSR.config || {};
        
        // Get dynamic levels from trend line methods if enabled
        let dynamicR: number | null = null;
        let dynamicS: number | null = null;
        
        if ((indicators as any).trendLineMethods) {
          const tlmConfig = (indicators as any).trendLineMethods.config || {};
          const tlmResult = calculateTrendLineMethodsLib(data, tlmConfig);
          
          // Use 5-point channel if enabled, otherwise pivot span
          if (tlmConfig.enableFivePoint && tlmResult.fivePoint?.highChannelLine) {
            dynamicR = tlmResult.fivePoint.highChannelLine.y2;
            dynamicS = tlmResult.fivePoint.lowChannelLine?.y2 ?? null;
          } else if (tlmConfig.enablePivotSpan !== false && tlmResult.pivotSpan?.highTrendLine) {
            dynamicR = tlmResult.pivotSpan.highTrendLine.y2;
            dynamicS = tlmResult.pivotSpan.lowTrendLine?.y2 ?? null;
          }
        }
        
        const result = calculateDynamicSR(highs, lows, closes, volumes, dynamicR, dynamicS, config);
        
        // Matrix Resistance Zone
        if (config.showMatrixResistance !== false && result.matrixResistance) {
          const zone = result.matrixResistance;
          const startIdx = Math.max(0, zone.index);
          const endIdx = data.length - 1;
          
          series.push({
            name: 'Matrix R Top',
            type: 'line',
            data: dates.map((d, i) => i >= startIdx && i <= endIdx ? [d, zone.top] : [d, null]),
            lineStyle: { color: '#FF5258', width: 1, type: 'solid' },
            symbol: 'none',
            z: 65,
            areaStyle: { color: 'rgba(255, 82, 82, 0.05)', origin: 'start' }
          });
          
          series.push({
            name: 'Matrix R Bottom',
            type: 'line',
            data: dates.map((d, i) => i >= startIdx && i <= endIdx ? [d, zone.bottom] : [d, null]),
            lineStyle: { color: '#FF5258', width: 1, type: 'solid' },
            symbol: 'none',
            z: 65
          });
        }
        
        // Matrix Support Zone
        if (config.showMatrixSupport !== false && result.matrixSupport) {
          const zone = result.matrixSupport;
          const startIdx = Math.max(0, zone.index);
          const endIdx = data.length - 1;
          
          series.push({
            name: 'Matrix S Top',
            type: 'line',
            data: dates.map((d, i) => i >= startIdx && i <= endIdx ? [d, zone.top] : [d, null]),
            lineStyle: { color: '#00E676', width: 1, type: 'solid' },
            symbol: 'none',
            z: 65,
            areaStyle: { color: 'rgba(0, 230, 118, 0.05)', origin: 'start' }
          });
          
          series.push({
            name: 'Matrix S Bottom',
            type: 'line',
            data: dates.map((d, i) => i >= startIdx && i <= endIdx ? [d, zone.bottom] : [d, null]),
            lineStyle: { color: '#00E676', width: 1, type: 'solid' },
            symbol: 'none',
            z: 65
          });
        }
        
        // Extremes Resistance Zone
        if (config.showExtremesResistance !== false && result.extremesResistance) {
          const zone = result.extremesResistance;
          const startIdx = Math.max(0, data.length - (config.universalLookback || 100));
          
          series.push({
            name: 'Extremes R',
            type: 'line',
            data: dates.map((d, i) => i >= startIdx ? [d, zone.top] : [d, null]),
            lineStyle: { color: '#ff9100', width: 2, type: 'dashed' },
            symbol: 'none',
            z: 65,
            markLine: {
              silent: true,
              symbol: 'none',
              data: [[
                { coord: [dates[startIdx], zone.top] },
                { coord: [dates[dates.length - 1], zone.top] }
              ]],
              lineStyle: { color: '#ff9100', width: 2, type: 'dashed' }
            }
          });
        }
        
        // Extremes Support Zone
        if (config.showExtremesSupport !== false && result.extremesSupport) {
          const zone = result.extremesSupport;
          const startIdx = Math.max(0, data.length - (config.universalLookback || 100));
          
          series.push({
            name: 'Extremes S',
            type: 'line',
            data: dates.map((d, i) => i >= startIdx ? [d, zone.bottom] : [d, null]),
            lineStyle: { color: '#00e5ff', width: 2, type: 'dashed' },
            symbol: 'none',
            z: 65,
            markLine: {
              silent: true,
              symbol: 'none',
              data: [[
                { coord: [dates[startIdx], zone.bottom] },
                { coord: [dates[dates.length - 1], zone.bottom] }
              ]],
              lineStyle: { color: '#00e5ff', width: 2, type: 'dashed' }
            }
          });
        }
        
        // Dashboard Badge
        const statsX = Math.max(0, data.length - 22);
        const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.12;
        
        const interp = result.interpretation;
        const rZone = result.extremesResistance;
        const sZone = result.extremesSupport;
        
        const dashText = `📊 ${interp.title}\\nBias: ${interp.bias}\\n\\n${interp.signal.substring(0, 60)}...\\n\\nR: [${rZone ? rZone.bottom.toFixed(2) + '-' + rZone.top.toFixed(2) : 'N/A'}]\\nS: [${sZone ? sZone.bottom.toFixed(2) + '-' + sZone.top.toFixed(2) : 'N/A'}]\\n\\nMatrix: S${result.sState} × D${result.dState}`;
        
        series.push({
          name: 'DSR Dashboard',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [220, 180],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: interp.color,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: dashText,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 130
        });
        
      } catch (error) {
        console.error('[Dynamic S/R] Error:', error);
      }
    }

    // ====================
    // FLAGS & PENNANTS
    // ====================
    if ((indicators as any).flagsPennants) {
      try {
        const highs = ohlcv.map(d => d.high);
        const lows = ohlcv.map(d => d.low);
        
        const config = (indicators as any).flagsPennants.config || {};
        const result = detectFlagsAndPennants(highs, lows, config);
        
        // Draw zigzag lines
        if (config.showZigzag !== false) {
          result.zigzagLines.forEach(line => {
            series.push({
              name: 'Zigzag Line',
              type: 'line',
              data: dates.map((d, i) => {
                if (i === line.x1) return [d, line.y1];
                if (i === line.x2) return [d, line.y2];
                if (i > line.x1 && i < line.x2) {
                  const progress = (i - line.x1) / (line.x2 - line.x1);
                  const y = line.y1 + progress * (line.y2 - line.y1);
                  return [d, y];
                }
                return [d, null];
              }),
              lineStyle: { color: '#3b82f6', width: 1, type: 'solid' },
              symbol: 'none',
              z: 70
            });
          });
        }
        
        // Draw patterns
        result.patterns.forEach((pattern, idx) => {
          // Pattern colors
          const isBullish = pattern.type.includes('bullish');
          const patternColor = isBullish ? '#00C853' : '#D50000';
          const poleColor = isBullish ? '#22c55e' : '#ef4444';
          
          // Draw pole (strong move)
          series.push({
            name: 'Pattern Pole',
            type: 'line',
            data: [[dates[pattern.poleStart.index], pattern.poleStart.price], [dates[pattern.poleEnd.index], pattern.poleEnd.price]],
            lineStyle: { color: poleColor, width: 3, type: 'solid' },
            symbol: 'none',
            z: 85
          });
          
          // Draw upper consolidation line
          series.push({
            name: 'Pattern Upper Line',
            type: 'line',
            data: dates.map((d, i) => {
              if (i >= pattern.upperLine.x1 && i <= pattern.upperLine.x2) {
                const progress = (i - pattern.upperLine.x1) / (pattern.upperLine.x2 - pattern.upperLine.x1);
                const y = pattern.upperLine.y1 + progress * (pattern.upperLine.y2 - pattern.upperLine.y1);
                return [d, y];
              }
              return [d, null];
            }),
            lineStyle: { color: patternColor, width: 2, type: 'dashed' },
            symbol: 'none',
            z: 80
          });
          
          // Draw lower consolidation line
          series.push({
            name: 'Pattern Lower Line',
            type: 'line',
            data: dates.map((d, i) => {
              if (i >= pattern.lowerLine.x1 && i <= pattern.lowerLine.x2) {
                const progress = (i - pattern.lowerLine.x1) / (pattern.lowerLine.x2 - pattern.lowerLine.x1);
                const y = pattern.lowerLine.y1 + progress * (pattern.lowerLine.y2 - pattern.lowerLine.y1);
                return [d, y];
              }
              return [d, null];
            }),
            lineStyle: { color: patternColor, width: 2, type: 'dashed' },
            symbol: 'none',
            z: 80
          });
          
          // Draw pivot points
          if (config.showPivotLabels !== false) {
            pattern.pivots.forEach((pivot, pidx) => {
              series.push({
                name: `Pivot ${pidx}`,
                type: 'scatter',
                data: [[dates[pivot.index], pivot.price]],
                symbol: pivot.direction === 1 ? 'triangle' : 'triangle',
                symbolRotate: pivot.direction === 1 ? 0 : 180,
                symbolSize: 6,
                itemStyle: {
                  color: pivot.direction === 1 ? '#22c55e' : '#ef4444',
                  borderColor: '#fff',
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: String.fromCharCode(65 + pidx), // A, B, C, D...
                  position: pivot.direction === 1 ? 'top' : 'bottom',
                  fontSize: 9,
                  color: '#fff',
                  fontWeight: 'bold'
                },
                z: 90
              });
            });
          }
          
          // Draw breakout target line
          const targetX = pattern.consolidationEnd.index + 5;
          series.push({
            name: 'Breakout Target',
            type: 'line',
            data: [[dates[pattern.consolidationEnd.index], pattern.consolidationEnd.price], [dates[Math.min(targetX, dates.length - 1)], pattern.breakoutTarget]],
            lineStyle: { color: patternColor, width: 2, type: 'dotted' },
            symbol: 'arrow',
            symbolSize: 8,
            z: 85
          });
          
          // Draw pattern label
          if (config.showPatternLabels !== false) {
            const labelX = pattern.consolidationEnd.index;
            const labelY = (pattern.upperLine.y2 + pattern.lowerLine.y2) / 2;
            
            const patternName = pattern.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const labelText = `${patternName}\nRetrace: ${(pattern.retracement * 100).toFixed(1)}%\nTarget: ${pattern.breakoutTarget.toFixed(2)}`;
            
            series.push({
              name: 'Pattern Label',
              type: 'scatter',
              data: [[dates[labelX], labelY]],
              symbol: 'roundRect',
              symbolSize: [120, 60],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.9)',
                borderColor: patternColor,
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: labelText,
                position: 'inside',
                fontSize: 9,
                color: '#e2e8f0',
                lineHeight: 12
              },
              z: 95
            });
          }
        });
        
        // Stats badge
        const bullishCount = result.patterns.filter(p => p.type.includes('bullish')).length;
        const bearishCount = result.patterns.filter(p => p.type.includes('bearish')).length;
        const flagCount = result.patterns.filter(p => p.type.includes('flag')).length;
        const pennantCount = result.patterns.filter(p => p.type.includes('pennant')).length;
        
        const statsX = Math.max(0, data.length - 18);
        const statsY = (ohlcv[ohlcv.length - 1]?.high ?? 0) * 1.06;
        
        series.push({
          name: 'F&P Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [150, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#3b82f6',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `🚩 Flags & Pennants\nTotal: ${result.patterns.length}\nFlags: ${flagCount} | Pennants: ${pennantCount}\n🟢 ${bullishCount} | 🔴 ${bearishCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Flags & Pennants] Error:', error);
      }
    }

    // === PIVOT TRENDLINES WITH BREAKS ===
    if ((indicators as any).pivotTrendlines) {
      try {
        const highs = ohlcv.map((d: OHLCV) => d.high);
        const lows = ohlcv.map((d: OHLCV) => d.low);
        const closes = ohlcv.map((d: OHLCV) => d.close);
        
        const config = {
          pivotLength: 20,
          pivotType: 'Normal' as 'Normal' | 'Fast',
          showTargets: true,
          repaint: true,
          useSourceForCross: false
        };
        
        const result = detectPivotTrendlines(highs, lows, closes, config);
        
        // Render bull trendlines (support - green)
        result.bullTrendlines.forEach((line, idx) => {
          // Draw trendline from start to end pivot
          const lineData: [number, number][] = [];
          for (let i = line.start.index; i <= Math.min(line.end.index + 20, data.length - 1); i++) {
            const price = line.slope * i + line.intercept;
            lineData.push([i, price]);
          }
          
          series.push({
            name: `Bull Line ${idx}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: line.broken ? '#666' : '#10b981',
              width: line.broken ? 1 : 2,
              type: 'dotted'
            },
            z: 50
          });
          
          // Pivot markers
          series.push({
            name: `Bull Pivots ${idx}`,
            type: 'scatter',
            data: [
              [line.start.index, line.start.price],
              [line.end.index, line.end.price]
            ],
            symbol: 'triangle',
            symbolSize: 8,
            itemStyle: {
              color: '#10b981',
              borderColor: '#065f46',
              borderWidth: 1
            },
            z: 60
          });
          
          // Breakout marker
          if (line.broken && line.breakoutIndex && line.breakoutPrice) {
            series.push({
              name: `Bull Break ${idx}`,
              type: 'scatter',
              data: [[line.breakoutIndex, line.breakoutPrice]],
              symbol: 'arrow',
              symbolRotate: 270,
              symbolSize: 12,
              itemStyle: { color: '#ef4444' },
              label: {
                show: true,
                formatter: 'Br ↓',
                position: 'bottom',
                fontSize: 9,
                color: '#ef4444',
                fontWeight: 'bold'
              },
              z: 70
            });
            
            // Target level (horizontal line)
            if (config.showTargets) {
              series.push({
                name: `Bull Target ${idx}`,
                type: 'line',
                markLine: {
                  silent: true,
                  symbol: 'none',
                  label: { show: false },
                  lineStyle: {
                    color: '#ef4444',
                    type: 'dashed',
                    width: 1,
                    opacity: 0.5
                  },
                  data: [{
                    yAxis: line.breakoutPrice,
                    xAxis: line.breakoutIndex
                  }]
                },
                z: 45
              });
            }
          }
        });
        
        // Render bear trendlines (resistance - red)
        result.bearTrendlines.forEach((line, idx) => {
          // Draw trendline from start to end pivot
          const lineData: [number, number][] = [];
          for (let i = line.start.index; i <= Math.min(line.end.index + 20, data.length - 1); i++) {
            const price = line.slope * i + line.intercept;
            lineData.push([i, price]);
          }
          
          series.push({
            name: `Bear Line ${idx}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: line.broken ? '#666' : '#ef4444',
              width: line.broken ? 1 : 2,
              type: 'dotted'
            },
            z: 50
          });
          
          // Pivot markers
          series.push({
            name: `Bear Pivots ${idx}`,
            type: 'scatter',
            data: [
              [line.start.index, line.start.price],
              [line.end.index, line.end.price]
            ],
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 8,
            itemStyle: {
              color: '#ef4444',
              borderColor: '#991b1b',
              borderWidth: 1
            },
            z: 60
          });
          
          // Breakout marker
          if (line.broken && line.breakoutIndex && line.breakoutPrice) {
            series.push({
              name: `Bear Break ${idx}`,
              type: 'scatter',
              data: [[line.breakoutIndex, line.breakoutPrice]],
              symbol: 'arrow',
              symbolRotate: 90,
              symbolSize: 12,
              itemStyle: { color: '#10b981' },
              label: {
                show: true,
                formatter: 'Br ↑',
                position: 'top',
                fontSize: 9,
                color: '#10b981',
                fontWeight: 'bold'
              },
              z: 70
            });
            
            // Target level (horizontal line)
            if (config.showTargets) {
              series.push({
                name: `Bear Target ${idx}`,
                type: 'line',
                markLine: {
                  silent: true,
                  symbol: 'none',
                  label: { show: false },
                  lineStyle: {
                    color: '#10b981',
                    type: 'dashed',
                    width: 1,
                    opacity: 0.5
                  },
                  data: [{
                    yAxis: line.breakoutPrice,
                    xAxis: line.breakoutIndex
                  }]
                },
                z: 45
              });
            }
          }
        });
        
        // Stats badge
        const activeBullCount = result.bullTrendlines.filter(l => !l.broken).length;
        const activeBearCount = result.bearTrendlines.filter(l => !l.broken).length;
        const breakoutCount = result.recentBreakouts.length;
        
        const statsX = data.length - 5;
        const statsY = ohlcv[ohlcv.length - 1]?.high * 1.05 || 0;
        
        series.push({
          name: 'Pivot TL Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#8b5cf6',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `📐 Pivot Trendlines\n🟢 Bull: ${activeBullCount} | 🔴 Bear: ${activeBearCount}\nBreakouts: ${breakoutCount}\nPivot Length: ${config.pivotLength}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Pivot Trendlines] Error:', error);
      }
    }

    // === DYNAMIC FIBONACCI RETRACEMENT ===
    if ((indicators as any).dynamicFibonacci) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          lookback: 50,
          extendLines: 'right' as 'right',
          showTrendline: true,
          showLabels: true,
          showPrices: false,
          labelOffset: 5,
          levels: {
            use236: true,
            use382: true,
            use50: true,
            use618: true,
            use786: true
          },
          levelValues: {
            level236: 0.236,
            level382: 0.382,
            level50: 0.5,
            level618: 0.618,
            level786: 0.786
          }
        };
        
        const result = calculateDynamicFibonacci(highs, lows, closes, config);
        
        const color = result.direction === 'bull' ? '#10b981' : '#ef4444';
        const colorDim = result.direction === 'bull' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        
        // Render trendline (diagonal line connecting swing points)
        if (config.showTrendline) {
          series.push({
            name: 'Fib Trendline',
            type: 'line',
            data: [
              [result.trendlineStart.index, result.trendlineStart.price],
              [result.trendlineEnd.index, result.trendlineEnd.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: color,
              width: 2,
              type: 'dashed'
            },
            z: 50
          });
        }
        
        // Render horizontal Fibonacci levels
        result.activeLevels.forEach((level) => {
          const levelColor = level.ratio === 0 || level.ratio === 1 ? color : 
                            level.ratio === 0.5 ? '#fbbf24' : 
                            level.ratio === 0.618 ? '#f59e0b' : 
                            color;
          
          const levelWidth = level.ratio === 0 || level.ratio === 1 ? 2 : 
                            level.ratio === 0.618 ? 2 : 1;
          
          const lineData: [number, number][] = [];
          const startIdx = result.sinceIndex;
          
          // Extend based on config
          if (config.extendLines === 'right' || config.extendLines === 'both') {
            for (let i = startIdx; i < data.length; i++) {
              lineData.push([i, level.price]);
            }
          } else {
            lineData.push([startIdx, level.price]);
            lineData.push([data.length - 1, level.price]);
          }
          
          series.push({
            name: `Fib ${level.label}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: levelColor,
              width: levelWidth,
              type: 'solid',
              opacity: 0.7
            },
            z: 45
          });
          
          // Add labels
          if (config.showLabels) {
            const labelX = data.length - 1 + config.labelOffset;
            const labelText = config.showPrices 
              ? `${level.label} (${level.price.toFixed(2)})`
              : level.label;
            
            series.push({
              name: `Fib Label ${level.label}`,
              type: 'scatter',
              data: [[labelX, level.price]],
              symbol: 'roundRect',
              symbolSize: [60, 18],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.8)',
                borderColor: levelColor,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: labelText,
                position: 'inside',
                fontSize: 9,
                color: levelColor,
                fontWeight: level.ratio === 0.618 ? 'bold' : 'normal'
              },
              z: 110
            });
          }
        });
        
        // Fill zone between 0% and 100%
        const zoneData: [number, number, number][] = [];
        for (let i = result.sinceIndex; i < data.length; i++) {
          zoneData.push([i, result.activeLevels[0].price, result.activeLevels[result.activeLevels.length - 1].price]);
        }
        
        series.push({
          name: 'Fib Zone',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const x = api.coord([api.value(0), 0])[0];
            const y1 = api.coord([0, api.value(1)])[1];
            const y2 = api.coord([0, api.value(2)])[1];
            
            return {
              type: 'rect',
              shape: {
                x: x - 2,
                y: Math.min(y1, y2),
                width: 4,
                height: Math.abs(y2 - y1)
              },
              style: {
                fill: colorDim,
                stroke: 'transparent'
              }
            };
          },
          data: zoneData,
          z: 40
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.88 : data[data.length - 1].high * 1.02;
        
        const dirEmoji = result.direction === 'bull' ? '🟢' : '🔴';
        const dirText = result.direction === 'bull' ? 'BULL' : 'BEAR';
        const range = (result.outerHigh - result.outerLow).toFixed(2);
        
        series.push({
          name: 'Fib Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: color,
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `📊 Dynamic Fibonacci\n${dirEmoji} ${dirText} Retracement\nRange: ${range}\nLevels: ${result.activeLevels.length}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Dynamic Fibonacci] Error:', error);
      }
    }

    // === SUPPORT & RESISTANCE POWER CHANNEL ===
    if ((indicators as any).srPowerChannel) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const opens = data.map(d => d.open);
        const closes = data.map(d => d.close);
        
        const config = {
          length: 130,
          extend: 30,
          atrPeriod: 200,
          atrMultiplier: 0.5
        };
        
        const result = calculateSRPowerChannel(highs, lows, opens, closes, config);
        
        const currentIndex = data.length - 1;
        const startIndex = Math.max(0, currentIndex - config.length);
        const endIndex = Math.min(data.length - 1 + config.extend, data.length + 30);
        
        // Resistance channel (top - fuchsia)
        const resistanceBoxData: [number, number, number, number][] = [];
        for (let i = startIndex; i <= currentIndex; i++) {
          resistanceBoxData.push([i, result.channel.resistanceTop, i, result.channel.resistanceBottom]);
        }
        
        series.push({
          name: 'Resistance Zone',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const x = api.coord([api.value(0), 0])[0];
            const y1 = api.coord([0, api.value(1)])[1];
            const y2 = api.coord([0, api.value(3)])[1];
            
            return {
              type: 'rect',
              shape: {
                x: x - 2,
                y: Math.min(y1, y2),
                width: 4,
                height: Math.abs(y2 - y1)
              },
              style: {
                fill: 'rgba(255, 0, 255, 0.15)',
                stroke: 'transparent'
              }
            };
          },
          data: resistanceBoxData,
          z: 40
        });
        
        // Support channel (bottom - lime)
        const supportBoxData: [number, number, number, number][] = [];
        for (let i = startIndex; i <= currentIndex; i++) {
          supportBoxData.push([i, result.channel.supportTop, i, result.channel.supportBottom]);
        }
        
        series.push({
          name: 'Support Zone',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const x = api.coord([api.value(0), 0])[0];
            const y1 = api.coord([0, api.value(1)])[1];
            const y2 = api.coord([0, api.value(3)])[1];
            
            return {
              type: 'rect',
              shape: {
                x: x - 2,
                y: Math.min(y1, y2),
                width: 4,
                height: Math.abs(y2 - y1)
              },
              style: {
                fill: 'rgba(0, 255, 0, 0.15)',
                stroke: 'transparent'
              }
            };
          },
          data: supportBoxData,
          z: 40
        });
        
        // Resistance boundary lines
        const resTopLine: [number, number][] = [];
        const resBottomLine: [number, number][] = [];
        for (let i = startIndex; i <= endIndex; i++) {
          resTopLine.push([i, result.channel.resistanceTop]);
          resBottomLine.push([i, result.channel.resistanceBottom]);
        }
        
        series.push(
          {
            name: 'Resistance Top',
            type: 'line',
            data: resTopLine,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: '#ff00ff', width: 2, type: 'solid' },
            z: 50
          },
          {
            name: 'Resistance Bottom',
            type: 'line',
            data: resBottomLine,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: '#ff00ff', width: 2, type: 'solid' },
            z: 50
          }
        );
        
        // Support boundary lines
        const supTopLine: [number, number][] = [];
        const supBottomLine: [number, number][] = [];
        for (let i = startIndex; i <= endIndex; i++) {
          supTopLine.push([i, result.channel.supportTop]);
          supBottomLine.push([i, result.channel.supportBottom]);
        }
        
        series.push(
          {
            name: 'Support Top',
            type: 'line',
            data: supTopLine,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: '#00ff00', width: 2, type: 'solid' },
            z: 50
          },
          {
            name: 'Support Bottom',
            type: 'line',
            data: supBottomLine,
            smooth: false,
            showSymbol: false,
            lineStyle: { color: '#00ff00', width: 2, type: 'solid' },
            z: 50
          }
        );
        
        // Midpoint line (dotted gray)
        const midLine: [number, number][] = [];
        for (let i = startIndex; i <= endIndex; i++) {
          midLine.push([i, result.channel.midpoint]);
        }
        
        series.push({
          name: 'Midpoint',
          type: 'line',
          data: midLine,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: '#6b7280', width: 1, type: 'dotted' },
          z: 45
        });
        
        // Max/Min markers (✖)
        series.push(
          {
            name: 'Max High Marker',
            type: 'scatter',
            data: [[result.channel.maxIndex, result.channel.maxHigh]],
            symbol: 'diamond',
            symbolSize: 12,
            itemStyle: { color: '#ff00ff', borderColor: '#fff', borderWidth: 2 },
            label: {
              show: true,
              formatter: '✖',
              position: 'top',
              fontSize: 12,
              color: '#ff00ff',
              fontWeight: 'bold'
            },
            z: 60
          },
          {
            name: 'Min Low Marker',
            type: 'scatter',
            data: [[result.channel.minIndex, result.channel.minLow]],
            symbol: 'diamond',
            symbolSize: 12,
            itemStyle: { color: '#00ff00', borderColor: '#fff', borderWidth: 2 },
            label: {
              show: true,
              formatter: '✖',
              position: 'bottom',
              fontSize: 12,
              color: '#00ff00',
              fontWeight: 'bold'
            },
            z: 60
          }
        );
        
        // Price labels
        const labelX = endIndex + 15;
        
        series.push(
          {
            name: 'Max Label',
            type: 'scatter',
            data: [[labelX, result.channel.maxHigh]],
            symbol: 'roundRect',
            symbolSize: [70, 18],
            itemStyle: { color: 'rgba(15, 23, 42, 0.8)', borderColor: '#ff00ff', borderWidth: 1 },
            label: {
              show: true,
              formatter: `🡅 ${result.channel.maxHigh.toFixed(2)}`,
              position: 'inside',
              fontSize: 9,
              color: '#ff00ff'
            },
            z: 110
          },
          {
            name: 'Min Label',
            type: 'scatter',
            data: [[labelX, result.channel.minLow]],
            symbol: 'roundRect',
            symbolSize: [70, 18],
            itemStyle: { color: 'rgba(15, 23, 42, 0.8)', borderColor: '#00ff00', borderWidth: 1 },
            label: {
              show: true,
              formatter: `🡇 ${result.channel.minLow.toFixed(2)}`,
              position: 'inside',
              fontSize: 9,
              color: '#00ff00'
            },
            z: 110
          },
          {
            name: 'Mid Label',
            type: 'scatter',
            data: [[endIndex, result.channel.midpoint]],
            symbol: 'roundRect',
            symbolSize: [70, 18],
            itemStyle: { color: 'rgba(15, 23, 42, 0.8)', borderColor: '#6b7280', borderWidth: 1 },
            label: {
              show: true,
              formatter: `🡆 ${result.channel.midpoint.toFixed(2)}`,
              position: 'inside',
              fontSize: 9,
              color: '#6b7280'
            },
            z: 110
          }
        );
        
        // Buy/Sell signals (◈)
        const buySignals = result.signals.filter(s => s.type === 'buy');
        const sellSignals = result.signals.filter(s => s.type === 'sell');
        
        if (buySignals.length > 0) {
          series.push({
            name: 'Buy Signals',
            type: 'scatter',
            data: buySignals.map(s => [s.index, s.price]),
            symbol: 'diamond',
            symbolSize: 14,
            itemStyle: { color: '#00ff00' },
            label: {
              show: true,
              formatter: '◈',
              position: 'bottom',
              fontSize: 14,
              color: '#00ff00',
              fontWeight: 'bold'
            },
            z: 70
          });
        }
        
        if (sellSignals.length > 0) {
          series.push({
            name: 'Sell Signals',
            type: 'scatter',
            data: sellSignals.map(s => [s.index, s.price]),
            symbol: 'diamond',
            symbolSize: 14,
            itemStyle: { color: '#ff00ff' },
            label: {
              show: true,
              formatter: '◈',
              position: 'top',
              fontSize: 14,
              color: '#ff00ff',
              fontWeight: 'bold'
            },
            z: 70
          });
        }
        
        // Power stats badges
        const statsX = data.length - 5;
        const resStatsY = yRange.max !== null ? yRange.max * 0.98 : result.channel.resistanceTop * 1.02;
        const supStatsY = yRange.min !== null ? yRange.min * 1.02 : result.channel.supportBottom * 0.98;
        
        const totalBars = result.power.buyPower + result.power.sellPower;
        const buyPercent = totalBars > 0 ? ((result.power.buyPower / totalBars) * 100).toFixed(0) : '0';
        const sellPercent = totalBars > 0 ? ((result.power.sellPower / totalBars) * 100).toFixed(0) : '0';
        
        series.push(
          {
            name: 'Sell Power Badge',
            type: 'scatter',
            data: [[statsX, resStatsY]],
            symbol: 'roundRect',
            symbolSize: [120, 50],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#ff00ff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Sell Power: ${result.power.sellPower}\n(${sellPercent}%)`,
              position: 'inside',
              fontSize: 10,
              color: '#ff00ff',
              lineHeight: 14
            },
            z: 120
          },
          {
            name: 'Buy Power Badge',
            type: 'scatter',
            data: [[statsX, supStatsY]],
            symbol: 'roundRect',
            symbolSize: [120, 50],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: '#00ff00',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Buy Power: ${result.power.buyPower}\n(${buyPercent}%)`,
              position: 'inside',
              fontSize: 10,
              color: '#00ff00',
              lineHeight: 14
            },
            z: 120
          }
        );
        
        // Main stats badge
        const mainStatsX = data.length - 5;
        const mainStatsY = result.channel.midpoint;
        
        series.push({
          name: 'S&R Power Stats',
          type: 'scatter',
          data: [[mainStatsX, mainStatsY]],
          symbol: 'roundRect',
          symbolSize: [140, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#8b5cf6',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `⚡ S&R Power Channel\nRange: ${(result.channel.maxHigh - result.channel.minLow).toFixed(2)}\nATR: ${result.channel.atr.toFixed(2)}\nSignals: 🟢${buySignals.length} | 🟣${sellSignals.length}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[S&R Power Channel] Error:', error);
      }
    }

    // === DIVERGENCE SCREENER ===
    if ((indicators as any).divergenceScreener) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          oscillatorType: 'rsi' as 'rsi',
          oscillatorLength: 14,
          zigzagLength: 13,
          trendMethod: 'zigzag' as 'zigzag',
          maLength: 200,
          repaint: true
        };
        
        const result = calculateDivergenceScreener(highs, lows, closes, config);
        
        // Define colors for divergence types
        const divergenceColors = {
          bullish: '#10b981',           // green
          bearish: '#ef4444',           // red
          bullish_hidden: '#84cc16',    // lime
          bearish_hidden: '#f97316'     // orange
        };
        
        // Render divergence lines on price chart
        result.divergences.forEach((div, idx) => {
          const color = div.broken ? '#6b7280' : divergenceColors[div.type];
          const width = div.broken ? 1 : 2;
          
          // Price divergence line
          series.push({
            name: `Div Price ${idx}`,
            type: 'line',
            data: [
              [div.priceStart.index, div.priceStart.price],
              [div.priceEnd.index, div.priceEnd.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: color,
              width: width,
              type: 'solid'
            },
            z: 55
          });
          
          // Price divergence label
          series.push({
            name: `Div Label ${idx}`,
            type: 'scatter',
            data: [[div.priceEnd.index, div.priceEnd.price]],
            symbol: 'roundRect',
            symbolSize: [20, 20],
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: div.label,
              position: 'inside',
              fontSize: 11,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 65
          });
          
          // Pivot markers
          series.push(
            {
              name: `Div Start Pivot ${idx}`,
              type: 'scatter',
              data: [[div.priceStart.index, div.priceStart.price]],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: color,
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 60
            },
            {
              name: `Div End Pivot ${idx}`,
              type: 'scatter',
              data: [[div.priceEnd.index, div.priceEnd.price]],
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: color,
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 60
            }
          );
          
          // Broken indicator
          if (div.broken) {
            series.push({
              name: `Div Broken ${idx}`,
              type: 'scatter',
              data: [[div.priceEnd.index, div.priceEnd.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color: 'transparent',
                borderColor: '#ef4444',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: '✖',
                position: 'top',
                fontSize: 12,
                color: '#ef4444',
                fontWeight: 'bold',
                offset: [0, -5]
              },
              z: 70
            });
          }
        });
        
        // Count divergences by type
        const bullishCount = result.divergences.filter(d => d.type === 'bullish' && !d.broken).length;
        const bearishCount = result.divergences.filter(d => d.type === 'bearish' && !d.broken).length;
        const bullishHiddenCount = result.divergences.filter(d => d.type === 'bullish_hidden' && !d.broken).length;
        const bearishHiddenCount = result.divergences.filter(d => d.type === 'bearish_hidden' && !d.broken).length;
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.95 : data[data.length - 1].high * 1.05;
        
        const currentOsc = result.oscillator[result.oscillator.length - 1].toFixed(2);
        const totalDivergences = result.divergences.filter(d => !d.broken).length;
        
        series.push({
          name: 'Divergence Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [150, 100],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#8b5cf6',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `📊 Divergence Screener\nRSI: ${currentOsc}\n🟢 Bull: ${bullishCount} | 💚 Hidden: ${bullishHiddenCount}\n🔴 Bear: ${bearishCount} | 🟠 Hidden: ${bearishHiddenCount}\nActive: ${totalDivergences}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
        // Oscillator panel badge (showing current status)
        if (result.lastActiveDivergence) {
          const activeDivColor = divergenceColors[result.lastActiveDivergence];
          const activeDivName = result.lastActiveDivergence.replace('_', ' ').toUpperCase();
          
          const oscStatsX = data.length - 10;
          const oscStatsY = yRange.min !== null ? yRange.min * 1.1 : data[data.length - 1].low * 0.9;
          
          series.push({
            name: 'Active Divergence',
            type: 'scatter',
            data: [[oscStatsX, oscStatsY]],
            symbol: 'roundRect',
            symbolSize: [140, 40],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: activeDivColor,
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `⚡ ACTIVE\n${activeDivName}`,
              position: 'inside',
              fontSize: 10,
              color: activeDivColor,
              lineHeight: 14,
              fontWeight: 'bold'
            },
            z: 120
          });
        }
        
      } catch (error) {
        console.error('[Divergence Screener] Error:', error);
      }
    }

    // === AUTO CHART PATTERNS ===
    if ((indicators as any).autoChartPatterns) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const acpConfig = {
          zigzags: [
            { enabled: true, length: 8, depth: 55 },
            { enabled: false, length: 13, depth: 34 },
            { enabled: false, length: 21, depth: 21 },
            { enabled: false, length: 34, depth: 13 }
          ],
          numberOfPivots: 5 as 5 | 6,
          errorThreshold: 20,
          flatThreshold: 20,
          checkBarRatio: true,
          barRatioLimit: 0.382,
          avoidOverlap: true,
          maxPatterns: 10,
          allowChannels: true,
          allowWedges: true,
          allowTriangles: true,
          allowRisingPatterns: true,
          allowFallingPatterns: true,
          allowNonDirectionalPatterns: true,
          allowExpandingPatterns: true,
          allowContractingPatterns: true,
          allowParallelChannels: true,
          patterns: {
            ascendingChannel: true,
            descendingChannel: true,
            rangingChannel: true,
            risingWedgeExpanding: true,
            fallingWedgeExpanding: true,
            risingWedgeContracting: true,
            fallingWedgeContracting: true,
            ascendingTriangleExpanding: true,
            descendingTriangleExpanding: true,
            ascendingTriangleContracting: true,
            descendingTriangleContracting: true,
            convergingTriangle: true,
            divergingTriangle: true
          }
        };
        
        const result = calculateAutoChartPatterns(data, acpConfig);
        
        // Pattern colors (rotating palette)
        const patternColors = [
          '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
          '#14b8a6', '#6366f1', '#a855f7', '#ef4444', '#84cc16'
        ];
        
        // Pattern name formatting
        const formatPatternName = (type: string): string => {
          return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        };
        
        // Render zigzag lines
        if ((result as any).zigzagLines) {
          ((result as any).zigzagLines as any[]).forEach((line: any, idx: number) => {
            const lineData = Array.isArray(line) ? line : [];
            series.push({
              name: `Zigzag ${idx}`,
              type: 'line',
              data: lineData.map((point: any) => [point.index, point.price]),
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: '#3b82f6',
                width: 1,
                type: 'solid',
                opacity: 0.4
              },
              z: 30
            });
          });
        }
        
        // Render patterns
        const patterns = result.patterns || [];
        patterns.forEach((pattern: any, idx: number) => {
          const color = patternColors[idx % patternColors.length];
          
          // Check if pattern has upperLine/lowerLine structure or use alternative
          const hasLineStructure = pattern.upperLine && pattern.lowerLine;
          const startIndex = pattern.startIndex ?? (pattern.pivots?.[0]?.index ?? 0);
          const endIndex = pattern.endIndex ?? (pattern.pivots?.[pattern.pivots?.length - 1]?.index ?? data.length - 1);
          
          if (hasLineStructure) {
            // Upper trend line
            const upperLineData: [number, number][] = [];
            for (let i = startIndex; i <= endIndex; i++) {
              const price = pattern.upperLine.start.price + 
                           pattern.upperLine.slope * (i - pattern.upperLine.start.index);
              upperLineData.push([i, price]);
            }
            
            series.push({
              name: `Pattern ${idx} Upper`,
              type: 'line',
              data: upperLineData,
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: color,
                width: 2,
                type: 'solid'
              },
              z: 55
            });
            
            // Lower trend line
            const lowerLineData: [number, number][] = [];
            for (let i = startIndex; i <= endIndex; i++) {
              const price = pattern.lowerLine.start.price + 
                           pattern.lowerLine.slope * (i - pattern.lowerLine.start.index);
              lowerLineData.push([i, price]);
            }
            
            series.push({
              name: `Pattern ${idx} Lower`,
              type: 'line',
              data: lowerLineData,
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: color,
                width: 2,
                type: 'solid'
              },
              z: 55
            });
            
            // Pattern fill
            const fillData: [number, number, number][] = [];
            for (let i = startIndex; i <= endIndex; i++) {
              const upperPrice = pattern.upperLine.start.price + 
                                pattern.upperLine.slope * (i - pattern.upperLine.start.index);
              const lowerPrice = pattern.lowerLine.start.price + 
                                pattern.lowerLine.slope * (i - pattern.lowerLine.start.index);
              fillData.push([i, lowerPrice, upperPrice]);
            }
            
            series.push({
              name: `Pattern ${idx} Fill`,
              type: 'custom',
              renderItem: (params: any, api: any) => {
                const x = api.coord([api.value(0), 0])[0];
                const y1 = api.coord([0, api.value(1)])[1];
                const y2 = api.coord([0, api.value(2)])[1];
                
                return {
                  type: 'rect',
                  shape: {
                    x: x - 2,
                    y: Math.min(y1, y2),
                    width: 4,
                    height: Math.abs(y2 - y1)
                  },
                  style: {
                    fill: `${color}20`,
                    stroke: 'transparent'
                  }
                };
              },
              data: fillData,
              z: 35
            });
          } else if (pattern.pivots && pattern.pivots.length > 0) {
            // Draw pattern using pivot points connected by lines
            const pivotLineData = pattern.pivots.map((p: any) => [p.index, p.price]);
            series.push({
              name: `Pattern ${idx} Line`,
              type: 'line',
              data: pivotLineData,
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: color,
                width: 2,
                type: 'solid'
              },
              z: 55
            });
          }
          
          // Pivot markers
          if (pattern.pivots && pattern.pivots.length > 0) {
            const pivotData = pattern.pivots.map((p: any) => [p.index, p.price]);
            series.push({
              name: `Pattern ${idx} Pivots`,
              type: 'scatter',
              data: pivotData,
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: {
                color: color,
                borderColor: '#fff',
                borderWidth: 1
              },
              z: 60
            });
            
            // Pivot labels (A, B, C, D, E, F)
            pattern.pivots.forEach((pivot: any, pIdx: number) => {
              const label = String.fromCharCode(65 + pIdx);  // A, B, C...
              series.push({
                name: `Pivot Label ${idx}-${pIdx}`,
                type: 'scatter',
                data: [[pivot.index, pivot.price]],
                symbol: 'circle',
                symbolSize: 16,
                itemStyle: {
                  color: color,
                  borderColor: '#fff',
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: label,
                  position: 'inside',
                  fontSize: 10,
                  color: '#fff',
                  fontWeight: 'bold'
                },
                z: 65
              });
            });
            
            // Pattern name label
            const labelX = startIndex + (endIndex - startIndex) * 0.5;
            const pivotPrices = pattern.pivots.map((p: any) => p.price);
            const labelY = (Math.max(...pivotPrices) + Math.min(...pivotPrices)) / 2;
            
            series.push({
              name: `Pattern ${idx} Label`,
              type: 'scatter',
              data: [[labelX, labelY]],
              symbol: 'roundRect',
              symbolSize: [120, 40],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.9)',
                borderColor: color,
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: `${formatPatternName(pattern.type || 'Pattern')}\n${(pattern.confidence ?? 0).toFixed(0)}% confidence`,
                position: 'inside',
                fontSize: 9,
                color: color,
                lineHeight: 14,
                fontWeight: 'bold'
              },
              z: 70
            });
          }
        });
        
        // Count patterns by type
        const patternCounts: Record<string, number> = {};
        patterns.forEach((p: any) => {
          const pType = p.type || 'unknown';
          patternCounts[pType] = (patternCounts[pType] || 0) + 1;
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.95 : data[data.length - 1].high * 1.05;
        
        const channelCount = patterns.filter((p: any) => (p.type || '').includes('channel')).length;
        const wedgeCount = patterns.filter((p: any) => (p.type || '').includes('wedge')).length;
        const triangleCount = patterns.filter((p: any) => (p.type || '').includes('triangle')).length;
        
        series.push({
          name: 'Pattern Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 90],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#8b5cf6',
            borderWidth: 1
          },
          label: {
            show: true,
            formatter: `📈 Auto Chart Patterns\nTotal: ${patterns.length}\n▭ Channels: ${channelCount}\n◆ Wedges: ${wedgeCount}\n△ Triangles: ${triangleCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Auto Chart Patterns] Error:', error);
      }
    }

    // === RANGE BREAKOUT ===
    if ((indicators as any).rangeBreakout) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          channelWidth: 4,
          showFakeouts: false,
          filterSignals: false,
          atrPeriod: 200,
          atrSmoothing: 100,
          initBar: Math.min(301, data.length - 1),
          resetThreshold: 100
        };
        
        const result = calculateRangeBreakout(highs, lows, closes, config);
        
        // Colors
        const bullColor = '#1dac70';
        const bearColor = '#df3a79';
        const midColor = '#ffffff';
        
        // Draw upper boundary line
        const upperLineData: [number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i === 0 || result.channels[i].upper !== result.channels[i - 1]?.upper) {
            if (upperLineData.length > 0) {
              series.push({
                name: `Upper Boundary ${i}`,
                type: 'line',
                data: upperLineData.slice(),
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: bullColor,
                  width: 1,
                  type: 'solid'
                },
                z: 50
              });
            }
            upperLineData.length = 0;
          }
          upperLineData.push([i, result.channels[i].upper]);
        }
        if (upperLineData.length > 0) {
          series.push({
            name: 'Upper Boundary Final',
            type: 'line',
            data: upperLineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: bullColor,
              width: 1,
              type: 'solid'
            },
            z: 50
          });
        }
        
        // Draw lower boundary line
        const lowerLineData: [number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i === 0 || result.channels[i].lower !== result.channels[i - 1]?.lower) {
            if (lowerLineData.length > 0) {
              series.push({
                name: `Lower Boundary ${i}`,
                type: 'line',
                data: lowerLineData.slice(),
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: bearColor,
                  width: 1,
                  type: 'solid'
                },
                z: 50
              });
            }
            lowerLineData.length = 0;
          }
          lowerLineData.push([i, result.channels[i].lower]);
        }
        if (lowerLineData.length > 0) {
          series.push({
            name: 'Lower Boundary Final',
            type: 'line',
            data: lowerLineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: bearColor,
              width: 1,
              type: 'solid'
            },
            z: 50
          });
        }
        
        // Draw center line (every other bar)
        const centerLineData: [number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i % 2 === 0) {
            centerLineData.push([i, result.channels[i].center]);
          }
        }
        series.push({
          name: 'Center Line',
          type: 'line',
          data: centerLineData,
          smooth: false,
          showSymbol: false,
          lineStyle: {
            color: midColor,
            width: 1,
            type: 'solid'
          },
          z: 45
        });
        
        // Draw upper mid line
        const upperMidData: [number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i === 0 || result.channels[i].upperMid !== result.channels[i - 1]?.upperMid) {
            if (upperMidData.length > 0) {
              series.push({
                name: `Upper Mid ${i}`,
                type: 'line',
                data: upperMidData.slice(),
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: midColor,
                  width: 1,
                  type: 'solid',
                  opacity: 0.5
                },
                z: 45
              });
            }
            upperMidData.length = 0;
          }
          upperMidData.push([i, result.channels[i].upperMid]);
        }
        if (upperMidData.length > 0) {
          series.push({
            name: 'Upper Mid Final',
            type: 'line',
            data: upperMidData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: midColor,
              width: 1,
              type: 'solid',
              opacity: 0.5
            },
            z: 45
          });
        }
        
        // Draw lower mid line
        const lowerMidData: [number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i === 0 || result.channels[i].lowerMid !== result.channels[i - 1]?.lowerMid) {
            if (lowerMidData.length > 0) {
              series.push({
                name: `Lower Mid ${i}`,
                type: 'line',
                data: lowerMidData.slice(),
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: midColor,
                  width: 1,
                  type: 'solid',
                  opacity: 0.5
                },
                z: 45
              });
            }
            lowerMidData.length = 0;
          }
          lowerMidData.push([i, result.channels[i].lowerMid]);
        }
        if (lowerMidData.length > 0) {
          series.push({
            name: 'Lower Mid Final',
            type: 'line',
            data: lowerMidData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: midColor,
              width: 1,
              type: 'solid',
              opacity: 0.5
            },
            z: 45
          });
        }
        
        // Draw gradient fills
        // Upper zone (between upper boundary and upper mid)
        const upperFillData: [number, number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i === 0 || result.channels[i].upper === result.channels[i - 1]?.upper) {
            upperFillData.push([i, result.channels[i].upperMid, result.channels[i].upper]);
          }
        }
        
        series.push({
          name: 'Upper Zone Fill',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const x = api.coord([api.value(0), 0])[0];
            const y1 = api.coord([0, api.value(1)])[1];
            const y2 = api.coord([0, api.value(2)])[1];
            
            return {
              type: 'rect',
              shape: {
                x: x - 2,
                y: Math.min(y1, y2),
                width: 4,
                height: Math.abs(y2 - y1)
              },
              style: {
                fill: `${bullColor}33`,
                stroke: 'transparent'
              }
            };
          },
          data: upperFillData,
          z: 35
        });
        
        // Lower zone (between lower mid and lower boundary)
        const lowerFillData: [number, number, number][] = [];
        for (let i = 0; i < data.length; i++) {
          if (i === 0 || result.channels[i].lower === result.channels[i - 1]?.lower) {
            lowerFillData.push([i, result.channels[i].lower, result.channels[i].lowerMid]);
          }
        }
        
        series.push({
          name: 'Lower Zone Fill',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const x = api.coord([api.value(0), 0])[0];
            const y1 = api.coord([0, api.value(1)])[1];
            const y2 = api.coord([0, api.value(2)])[1];
            
            return {
              type: 'rect',
              shape: {
                x: x - 2,
                y: Math.min(y1, y2),
                width: 4,
                height: Math.abs(y2 - y1)
              },
              style: {
                fill: `${bearColor}33`,
                stroke: 'transparent'
              }
            };
          },
          data: lowerFillData,
          z: 35
        });
        
        // Draw signals
        const breakoutBullish = result.signals.filter(s => s.type === 'bullish_breakout');
        const breakoutBearish = result.signals.filter(s => s.type === 'bearish_breakout');
        const buySignals = result.signals.filter(s => s.type === 'buy');
        const sellSignals = result.signals.filter(s => s.type === 'sell');
        const fakeoutUp = result.signals.filter(s => s.type === 'fakeout_up');
        const fakeoutDown = result.signals.filter(s => s.type === 'fakeout_down');
        
        // Bullish breakouts (⦿ green)
        breakoutBullish.forEach(signal => {
          series.push({
            name: `Bullish Break ${signal.index}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'circle',
            symbolSize: 20,
            itemStyle: {
              color: 'transparent',
              borderColor: bullColor,
              borderWidth: 3
            },
            label: {
              show: true,
              formatter: '⦿',
              position: 'inside',
              fontSize: 16,
              color: bullColor,
              fontWeight: 'bold'
            },
            z: 70
          });
        });
        
        // Bearish breakouts (⦿ red)
        breakoutBearish.forEach(signal => {
          series.push({
            name: `Bearish Break ${signal.index}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'circle',
            symbolSize: 20,
            itemStyle: {
              color: 'transparent',
              borderColor: bearColor,
              borderWidth: 3
            },
            label: {
              show: true,
              formatter: '⦿',
              position: 'inside',
              fontSize: 16,
              color: bearColor,
              fontWeight: 'bold'
            },
            z: 70
          });
        });
        
        // Buy signals (▲ green)
        if (buySignals.length > 0) {
          series.push({
            name: 'Buy Signals',
            type: 'scatter',
            data: buySignals.map(s => [s.index, s.price]),
            symbol: 'triangle',
            symbolSize: 12,
            itemStyle: {
              color: bullColor
            },
            label: {
              show: true,
              formatter: '▲',
              position: 'bottom',
              fontSize: 14,
              color: bullColor,
              fontWeight: 'bold',
              offset: [0, 5]
            },
            z: 65
          });
        }
        
        // Sell signals (▼ red)
        if (sellSignals.length > 0) {
          series.push({
            name: 'Sell Signals',
            type: 'scatter',
            data: sellSignals.map(s => [s.index, s.price]),
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 12,
            itemStyle: {
              color: bearColor
            },
            label: {
              show: true,
              formatter: '▼',
              position: 'top',
              fontSize: 14,
              color: bearColor,
              fontWeight: 'bold',
              offset: [0, -5]
            },
            z: 65
          });
        }
        
        // Fakeout signals (X)
        if (config.showFakeouts) {
          fakeoutUp.forEach(signal => {
            series.push({
              name: `Fakeout Up ${signal.index}`,
              type: 'scatter',
              data: [[signal.index, signal.price]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: 'transparent'
              },
              label: {
                show: true,
                formatter: 'X',
                position: 'top',
                fontSize: 12,
                color: bearColor,
                fontWeight: 'bold',
                offset: [0, -5]
              },
              z: 65
            });
          });
          
          fakeoutDown.forEach(signal => {
            series.push({
              name: `Fakeout Down ${signal.index}`,
              type: 'scatter',
              data: [[signal.index, signal.price]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: 'transparent'
              },
              label: {
                show: true,
                formatter: 'X',
                position: 'bottom',
                fontSize: 12,
                color: bullColor,
                fontWeight: 'bold',
                offset: [0, 5]
              },
              z: 65
            });
          });
        }
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.88 : data[data.length - 1].high * 1.02;
        
        const trendColor = result.currentTrend === 'bullish' ? bullColor : bearColor;
        const trendEmoji = result.currentTrend === 'bullish' ? '🟢' : '🔴';
        const trendText = result.currentTrend === 'bullish' ? 'BULLISH' : 'BEARISH';
        
        series.push({
          name: 'Range Breakout Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 100],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.9)',
            borderColor: trendColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `⦿ Range Breakout\n${trendEmoji} ${trendText}\n▲ Buys: ${buySignals.length}\n▼ Sells: ${sellSignals.length}\nBreaks: ${breakoutBullish.length + breakoutBearish.length}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Range Breakout] Error:', error);
      }
    }

    // === HARMONIC PATTERN SYSTEM ===
    if ((indicators as any).harmonicSystem) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          gartleyOn: true,
          batOn: true,
          butterflyOn: true,
          crabOn: true,
          sharkOn: true,
          cypherOn: true,
          bullishOn: true,
          bearishOn: true,
          incompleteOn: true,
          allowedFibError: 15,
          allowedAsymmetry: 250,
          validationBars: 1,
          weightError: 4,
          weightPRZ: 2,
          weightD: 3,
          minScore: 70,
          stopPercent: 75
        };
        
        const result = calculateHarmonicSystem(highs, lows, closes, config);
        
        // Colors
        const bullColor = '#22c55e';
        const bearColor = '#ef4444';
        const incompleteColor = '#f59e0b';
        
        // Draw each pattern
        result.patterns.forEach((pattern, idx) => {
          const color = !pattern.complete ? incompleteColor : pattern.bullish ? bullColor : bearColor;
          const dimColor = `${color}80`;
          
          // Draw pattern lines (X-A-B-C-D)
          const points = [
            pattern.x,
            pattern.a,
            pattern.b,
            pattern.c,
            pattern.d
          ].filter(p => p !== null) as { index: number; price: number }[];
          
          // Draw connecting lines
          for (let i = 0; i < points.length - 1; i++) {
            const isLastLeg = i === points.length - 2 && !pattern.complete;
            series.push({
              name: `Harmonic Line ${idx}-${i}`,
              type: 'line',
              data: [
                [points[i].index, points[i].price],
                [points[i + 1].index, points[i + 1].price]
              ],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: color,
                width: 2,
                type: isLastLeg ? 'dashed' : 'solid'
              },
              z: 50
            });
          }
          
          // Draw XA-CD diagonal (pattern fill)
          if (points.length >= 4) {
            series.push({
              name: `Harmonic Diag1 ${idx}`,
              type: 'line',
              data: [
                [pattern.x.index, pattern.x.price],
                [pattern.c.index, pattern.c.price]
              ],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: dimColor,
                width: 1,
                type: 'dotted'
              },
              z: 45
            });
            
            series.push({
              name: `Harmonic Diag2 ${idx}`,
              type: 'line',
              data: [
                [pattern.a.index, pattern.a.price],
                [pattern.b.index, pattern.b.price]
              ],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: dimColor,
                width: 1,
                type: 'dotted'
              },
              z: 45
            });
          }
          
          // Draw point labels
          const labels = ['X', 'A', 'B', 'C', 'D'];
          points.forEach((point, pIdx) => {
            const isBullishPivot = pattern.bullish ? (pIdx % 2 === 0) : (pIdx % 2 === 1);
            series.push({
              name: `Harmonic Point ${idx}-${pIdx}`,
              type: 'scatter',
              data: [[point.index, point.price]],
              symbol: 'circle',
              symbolSize: 20,
              itemStyle: {
                color: color,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: labels[pIdx],
                position: 'inside',
                fontSize: 11,
                color: '#fff',
                fontWeight: 'bold'
              },
              z: 70
            });
          });
          
          // Draw PRZ zone for incomplete patterns
          if (!pattern.complete && pattern.przLevels.length >= 2) {
            const przTop = Math.max(...pattern.przLevels);
            const przBottom = Math.min(...pattern.przLevels);
            const przStart = pattern.c.index;
            const przEnd = Math.min(przStart + 30, data.length - 1);
            
            // PRZ zone fill
            const przFillData: [number, number, number][] = [];
            for (let i = przStart; i <= przEnd; i++) {
              przFillData.push([i, przBottom, przTop]);
            }
            
            series.push({
              name: `PRZ Zone ${idx}`,
              type: 'custom',
              renderItem: (params: any, api: any) => {
                const x = api.coord([api.value(0), 0])[0];
                const y1 = api.coord([0, api.value(1)])[1];
                const y2 = api.coord([0, api.value(2)])[1];
                
                return {
                  type: 'rect',
                  shape: {
                    x: x - 2,
                    y: Math.min(y1, y2),
                    width: 4,
                    height: Math.abs(y2 - y1)
                  },
                  style: {
                    fill: `${color}20`,
                    stroke: 'transparent'
                  }
                };
              },
              data: przFillData,
              z: 35
            });
            
            // PRZ level lines
            pattern.przLevels.forEach((level, lIdx) => {
              series.push({
                name: `PRZ Level ${idx}-${lIdx}`,
                type: 'line',
                data: [[przStart, level], [przEnd, level]],
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: color,
                  width: 1,
                  type: 'dashed'
                },
                z: 40
              });
            });
          }
          
          // Draw targets and stop for complete patterns
          if (pattern.complete && pattern.d) {
            const targetStart = pattern.d.index;
            const targetEnd = Math.min(targetStart + 50, data.length - 1);
            
            // Target 1
            if (pattern.target1) {
              series.push({
                name: `Target1 ${idx}`,
                type: 'line',
                data: [[targetStart, pattern.target1], [targetEnd, pattern.target1]],
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: bullColor,
                  width: 1,
                  type: 'dashed'
                },
                z: 40
              });
              
              series.push({
                name: `T1 Label ${idx}`,
                type: 'scatter',
                data: [[targetEnd, pattern.target1]],
                symbol: 'roundRect',
                symbolSize: [35, 16],
                itemStyle: {
                  color: 'rgba(15, 23, 42, 0.8)',
                  borderColor: bullColor,
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: 'T1',
                  position: 'inside',
                  fontSize: 9,
                  color: bullColor
                },
                z: 75
              });
            }
            
            // Target 2
            if (pattern.target2) {
              series.push({
                name: `Target2 ${idx}`,
                type: 'line',
                data: [[targetStart, pattern.target2], [targetEnd, pattern.target2]],
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: '#3b82f6',
                  width: 1,
                  type: 'dashed'
                },
                z: 40
              });
              
              series.push({
                name: `T2 Label ${idx}`,
                type: 'scatter',
                data: [[targetEnd, pattern.target2]],
                symbol: 'roundRect',
                symbolSize: [35, 16],
                itemStyle: {
                  color: 'rgba(15, 23, 42, 0.8)',
                  borderColor: '#3b82f6',
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: 'T2',
                  position: 'inside',
                  fontSize: 9,
                  color: '#3b82f6'
                },
                z: 75
              });
            }
            
            // Stop loss
            if (pattern.stop) {
              series.push({
                name: `Stop ${idx}`,
                type: 'line',
                data: [[targetStart, pattern.stop], [targetEnd, pattern.stop]],
                smooth: false,
                showSymbol: false,
                lineStyle: {
                  color: bearColor,
                  width: 1,
                  type: 'dotted'
                },
                z: 40
              });
              
              series.push({
                name: `Stop Label ${idx}`,
                type: 'scatter',
                data: [[targetEnd, pattern.stop]],
                symbol: 'roundRect',
                symbolSize: [35, 16],
                itemStyle: {
                  color: 'rgba(15, 23, 42, 0.8)',
                  borderColor: bearColor,
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: 'SL',
                  position: 'inside',
                  fontSize: 9,
                  color: bearColor
                },
                z: 75
              });
            }
          }
          
          // Pattern name badge
          const badgeX = pattern.b.index;
          const badgeY = pattern.bullish ? 
            Math.max(pattern.a.price, pattern.c.price) * 1.02 :
            Math.min(pattern.a.price, pattern.c.price) * 0.98;
          
          const statusSym = getStatusSymbol(pattern.status);
          const patternSym = getPatternSymbol(pattern.type);
          const patternName = getPatternName(pattern.type);
          
          series.push({
            name: `Pattern Badge ${idx}`,
            type: 'scatter',
            data: [[badgeX, badgeY]],
            symbol: 'roundRect',
            symbolSize: [100, 45],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: color,
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `${patternSym} ${patternName}\n${(pattern.score * 100).toFixed(0)}% ${statusSym}`,
              position: 'inside',
              fontSize: 10,
              color: color,
              lineHeight: 14,
              fontWeight: 'bold'
            },
            z: 80
          });
        });
        
        // Stats table badge
        const statsX = data.length - 8;
        const statsY = yRange.max !== null ? yRange.max * 0.82 : data[data.length - 1].high * 1.05;
        
        const completePatterns = result.patterns.filter(p => p.complete);
        const incompletePatterns = result.patterns.filter(p => !p.complete);
        const bullishPatterns = completePatterns.filter(p => p.bullish);
        const bearishPatterns = completePatterns.filter(p => !p.bullish);
        const successPatterns = completePatterns.filter(p => 
          p.status === 'success_t1' || p.status === 'success_t2'
        );
        
        series.push({
          name: 'Harmonic Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [160, 110],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#8b5cf6',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🎯 Harmonic System\nComplete: ${completePatterns.length}\nPotential: ${incompletePatterns.length}\n🟢 Bull: ${bullishPatterns.length} | 🔴 Bear: ${bearishPatterns.length}\n✅ Success: ${successPatterns.length}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Harmonic System] Error:', error);
      }
    }

    // === DRAGON HARMONIC PATTERN ===
    if ((indicators as any).dragonPattern) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          pivotPeriod: 3,
          showValidFormat: false,
          showLastPivotConfirm: true,
          lastPivotPeriod: 2,
          showBullish: true,
          showBearish: true,
          // Dragon pattern ratios
          xabMin: 0.38,
          xabMax: 0.62,
          abcMin: 0.8,
          abcMax: 1.1,
          bcdMin: 0.4,
          bcdMax: 0.8,
          xadMin: 0.2,
          xadMax: 0.4
        };
        
        const result = calculateDragonPattern(highs, lows, closes, config);
        
        // Draw each Dragon pattern
        result.patterns.forEach((pattern, idx) => {
          const info = getDragonPatternInfo(pattern);
          const color = info.color;
          const dimColor = `${color}60`;
          
          // Pattern points
          const points = [pattern.x, pattern.a, pattern.b, pattern.c, pattern.d];
          
          // Draw XABCD connecting lines
          for (let i = 0; i < points.length - 1; i++) {
            series.push({
              name: `Dragon Line ${idx}-${i}`,
              type: 'line',
              data: [
                [points[i].index, points[i].price],
                [points[i + 1].index, points[i + 1].price]
              ],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: '#0609bb',
                width: 1,
                type: 'solid'
              },
              z: 50
            });
          }
          
          // Draw diagonal lines for pattern fill
          // X to C diagonal
          series.push({
            name: `Dragon XC ${idx}`,
            type: 'line',
            data: [
              [pattern.x.index, pattern.x.price],
              [pattern.c.index, pattern.c.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: dimColor,
              width: 1,
              type: 'dotted'
            },
            z: 45
          });
          
          // A to D diagonal
          series.push({
            name: `Dragon AD ${idx}`,
            type: 'line',
            data: [
              [pattern.a.index, pattern.a.price],
              [pattern.d.index, pattern.d.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: dimColor,
              width: 1,
              type: 'dotted'
            },
            z: 45
          });
          
          // Draw point labels
          const labels = ['X', 'A', 'B', 'C', 'D'];
          points.forEach((point, pIdx) => {
            series.push({
              name: `Dragon Point ${idx}-${pIdx}`,
              type: 'scatter',
              data: [[point.index, point.price]],
              symbol: 'circle',
              symbolSize: 18,
              itemStyle: {
                color: '#0609bb',
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: labels[pIdx],
                position: 'inside',
                fontSize: 10,
                color: '#fff',
                fontWeight: 'bold'
              },
              z: 70
            });
          });
          
          // Draw ratio labels along legs
          // XAB ratio
          const xabMidX = Math.floor((pattern.x.index + pattern.b.index) / 2);
          const xabMidY = (pattern.x.price + pattern.b.price) / 2;
          series.push({
            name: `XAB Ratio ${idx}`,
            type: 'scatter',
            data: [[xabMidX, xabMidY]],
            symbol: 'roundRect',
            symbolSize: [50, 16],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.8)',
              borderColor: '#0609bb',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: formatRatio(pattern.ratios.xab),
              position: 'inside',
              fontSize: 9,
              color: '#e2e8f0'
            },
            z: 75
          });
          
          // ABC ratio
          const abcMidX = Math.floor((pattern.a.index + pattern.c.index) / 2);
          const abcMidY = (pattern.a.price + pattern.c.price) / 2;
          series.push({
            name: `ABC Ratio ${idx}`,
            type: 'scatter',
            data: [[abcMidX, abcMidY]],
            symbol: 'roundRect',
            symbolSize: [50, 16],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.8)',
              borderColor: '#0609bb',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: formatRatio(pattern.ratios.abc),
              position: 'inside',
              fontSize: 9,
              color: '#e2e8f0'
            },
            z: 75
          });
          
          // BCD ratio
          const bcdMidX = Math.floor((pattern.b.index + pattern.d.index) / 2);
          const bcdMidY = (pattern.b.price + pattern.d.price) / 2;
          series.push({
            name: `BCD Ratio ${idx}`,
            type: 'scatter',
            data: [[bcdMidX, bcdMidY]],
            symbol: 'roundRect',
            symbolSize: [50, 16],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.8)',
              borderColor: '#0609bb',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: formatRatio(pattern.ratios.bcd),
              position: 'inside',
              fontSize: 9,
              color: '#e2e8f0'
            },
            z: 75
          });
          
          // Pattern name badge
          const badgeX = Math.floor((pattern.a.index + pattern.c.index) / 2);
          const badgeY = pattern.type === 'bullish' ?
            Math.max(pattern.a.price, pattern.c.price) * 1.02 :
            Math.min(pattern.a.price, pattern.c.price) * 0.98;
          
          series.push({
            name: `Dragon Badge ${idx}`,
            type: 'scatter',
            data: [[badgeX, badgeY]],
            symbol: 'roundRect',
            symbolSize: [110, 45],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: color,
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `${info.symbol} ${info.name}\nScore: ${pattern.score.toFixed(0)}%`,
              position: 'inside',
              fontSize: 10,
              color: color,
              lineHeight: 14,
              fontWeight: 'bold'
            },
            z: 80
          });
        });
        
        // Draw confirmation signals
        // Bullish confirmation arrows
        result.signals.bullish.forEach((signal, idx) => {
          series.push({
            name: `Bull Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'triangle',
            symbolSize: 14,
            itemStyle: {
              color: '#22c55e'
            },
            label: {
              show: true,
              formatter: '▲',
              position: 'bottom',
              fontSize: 16,
              color: '#22c55e',
              fontWeight: 'bold',
              offset: [0, 8]
            },
            z: 85
          });
        });
        
        // Bearish confirmation arrows
        result.signals.bearish.forEach((signal, idx) => {
          series.push({
            name: `Bear Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 14,
            itemStyle: {
              color: '#ef4444'
            },
            label: {
              show: true,
              formatter: '▼',
              position: 'top',
              fontSize: 16,
              color: '#ef4444',
              fontWeight: 'bold',
              offset: [0, -8]
            },
            z: 85
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.85 : data[data.length - 1].high * 1.03;
        
        const bullishCount = result.patterns.filter(p => p.type === 'bullish').length;
        const bearishCount = result.patterns.filter(p => p.type === 'bearish').length;
        const confirmedCount = result.patterns.filter(p => p.confirmed).length;
        
        series.push({
          name: 'Dragon Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 90],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#0609bb',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🐉 Dragon Pattern\nTotal: ${result.patterns.length}\n🟢 Bull: ${bullishCount} | 🔴 Bear: ${bearishCount}\n✅ Confirmed: ${confirmedCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Dragon Pattern] Error:', error);
      }
    }

    // === PIVOT TRENDLINES V2 ===
    if ((indicators as any).pivotTrendlinesV2) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          pivotLength: 20,
          pivotType: 'Normal' as 'Normal' | 'Fast',
          repaint: true,
          showTargets: true,
          extendLines: 'none' as 'none',
          lineStyle: 'dotted' as 'dotted',
          targetStyle: 'dashed' as 'dashed',
          overrideSource: false,
          useSourceForCross: false
        };
        
        const result = calculatePivotTrendlinesV2(highs, lows, closes, config);
        
        const bullColor = '#22c55e';
        const bearColor = '#ef4444';
        
        // Draw bull trendlines (from pivot highs - resistance lines)
        result.bullTrendlines.forEach((line, idx) => {
          const endIndex = line.broken && line.breakoutIndex 
            ? line.breakoutIndex 
            : Math.min(line.end.index + 30, data.length - 1);
          
          // Calculate extended line points
          const lineData: [number, number][] = [];
          for (let i = line.start.index; i <= endIndex; i++) {
            const price = line.start.price + line.slope * (i - line.start.index);
            lineData.push([i, price]);
          }
          
          series.push({
            name: `Bull TL ${idx}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: line.broken ? '#666' : bullColor,
              width: 2,
              type: 'dotted'
            },
            z: 50
          });
          
          // Pivot markers
          series.push({
            name: `Bull Pivots ${idx}`,
            type: 'scatter',
            data: [
              [line.start.index, line.start.price],
              [line.end.index, line.end.price]
            ],
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 10,
            itemStyle: {
              color: bullColor,
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 60
          });
          
          // Target level if broken
          if (line.broken && line.targetLevel && config.showTargets) {
            const targetStart = line.breakoutIndex || line.end.index;
            const targetEnd = Math.min(targetStart + 20, data.length - 1);
            
            series.push({
              name: `Bull Target ${idx}`,
              type: 'line',
              data: [[targetStart, line.targetLevel], [targetEnd, line.targetLevel]],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: bullColor,
                width: 1,
                type: 'dashed'
              },
              z: 45
            });
          }
        });
        
        // Draw bear trendlines (from pivot lows - support lines)
        result.bearTrendlines.forEach((line, idx) => {
          const endIndex = line.broken && line.breakoutIndex 
            ? line.breakoutIndex 
            : Math.min(line.end.index + 30, data.length - 1);
          
          // Calculate extended line points
          const lineData: [number, number][] = [];
          for (let i = line.start.index; i <= endIndex; i++) {
            const price = line.start.price + line.slope * (i - line.start.index);
            lineData.push([i, price]);
          }
          
          series.push({
            name: `Bear TL ${idx}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: line.broken ? '#666' : bearColor,
              width: 2,
              type: 'dotted'
            },
            z: 50
          });
          
          // Pivot markers
          series.push({
            name: `Bear Pivots ${idx}`,
            type: 'scatter',
            data: [
              [line.start.index, line.start.price],
              [line.end.index, line.end.price]
            ],
            symbol: 'triangle',
            symbolSize: 10,
            itemStyle: {
              color: bearColor,
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 60
          });
          
          // Target level if broken
          if (line.broken && line.targetLevel && config.showTargets) {
            const targetStart = line.breakoutIndex || line.end.index;
            const targetEnd = Math.min(targetStart + 20, data.length - 1);
            
            series.push({
              name: `Bear Target ${idx}`,
              type: 'line',
              data: [[targetStart, line.targetLevel], [targetEnd, line.targetLevel]],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: bearColor,
                width: 1,
                type: 'dashed'
              },
              z: 45
            });
          }
        });
        
        // Draw breakout signals
        result.breakouts.forEach((breakout, idx) => {
          const isBull = breakout.type === 'bullish';
          const color = isBull ? bullColor : bearColor;
          
          series.push({
            name: `Breakout ${idx}`,
            type: 'scatter',
            data: [[breakout.index, breakout.price]],
            symbol: isBull ? 'triangle' : 'triangle',
            symbolRotate: isBull ? 0 : 180,
            symbolSize: 16,
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 2
            },
            z: 75
          });
          
          // Breakout label
          series.push({
            name: `Breakout Label ${idx}`,
            type: 'scatter',
            data: [[breakout.index, breakout.price]],
            symbol: 'roundRect',
            symbolSize: [30, 18],
            itemStyle: {
              color: color
            },
            label: {
              show: true,
              formatter: 'Br',
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 80
          });
        });
        
        // Active trendline indicators
        if (result.activeBullLine) {
          const line = result.activeBullLine;
          const currentPrice = line.start.price + line.slope * (data.length - 1 - line.start.index);
          
          series.push({
            name: 'Active Bull Indicator',
            type: 'scatter',
            data: [[data.length - 1, currentPrice]],
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: bullColor,
              borderColor: '#fff',
              borderWidth: 2
            },
            z: 85
          });
        }
        
        if (result.activeBearLine) {
          const line = result.activeBearLine;
          const currentPrice = line.start.price + line.slope * (data.length - 1 - line.start.index);
          
          series.push({
            name: 'Active Bear Indicator',
            type: 'scatter',
            data: [[data.length - 1, currentPrice]],
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: bearColor,
              borderColor: '#fff',
              borderWidth: 2
            },
            z: 85
          });
        }
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.82 : data[data.length - 1].high * 1.02;
        
        const activeBull = result.bullTrendlines.filter(t => !t.broken).length;
        const activeBear = result.bearTrendlines.filter(t => !t.broken).length;
        const bullBreaks = result.breakouts.filter(b => b.type === 'bullish').length;
        const bearBreaks = result.breakouts.filter(b => b.type === 'bearish').length;
        
        series.push({
          name: 'Pivot TL V2 Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [150, 100],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#8b5cf6',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📈 Pivot Trendlines\n🟢 Bull Active: ${activeBull}\n🔴 Bear Active: ${activeBear}\nBreakouts: ▲${bullBreaks} | ▼${bearBreaks}\nPivot: ${config.pivotLength} (${config.pivotType})`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Pivot Trendlines V2] Error:', error);
      }
    }

    // === CYPHER HARMONIC PATTERN ===
    if ((indicators as any).cypherPattern) {
      try {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        
        const config = {
          pivotPeriod: 3,
          showValidFormat: false,
          showLastPivotConfirm: true,
          lastPivotPeriod: 2,
          showBullish: true,
          showBearish: true
        };
        
        const result = calculateCypherPattern(highs, lows, closes, config);
        
        const patternColor = '#0609bb'; // Same blue as original
        const bullColor = '#22c55e';
        const bearColor = '#ef4444';
        
        // Draw each pattern
        result.patterns.forEach((pattern, idx) => {
          const { X, A, B, C, D, ratios, score, type, isValid } = pattern;
          const color = patternColor;
          
          // Draw XABCD lines
          const lineData = [
            [X.index, X.price],
            [A.index, A.price],
            [B.index, B.price],
            [C.index, C.price],
            [D.index, D.price]
          ];
          
          series.push({
            name: `Cypher ${idx}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: color,
              width: 2,
              type: isValid ? 'solid' : 'dashed'
            },
            z: 55
          });
          
          // Draw diagonal fill lines (XB, XC, AC, BD)
          const diagonals = [
            { from: X, to: B, name: 'XB' },
            { from: A, to: C, name: 'AC' },
            { from: X, to: D, name: 'XD' },
            { from: B, to: D, name: 'BD' }
          ];
          
          diagonals.forEach((diag, dIdx) => {
            series.push({
              name: `Cypher ${idx} ${diag.name}`,
              type: 'line',
              data: [
                [diag.from.index, diag.from.price],
                [diag.to.index, diag.to.price]
              ],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: color,
                width: 1,
                type: 'dotted',
                opacity: 0.5
              },
              z: 50
            });
          });
          
          // Draw pivot labels
          const pivots = [
            { point: X, label: 'X' },
            { point: A, label: 'A' },
            { point: B, label: 'B' },
            { point: C, label: 'C' },
            { point: D, label: 'D' }
          ];
          
          pivots.forEach((pivot, pIdx) => {
            const isHigh = pivot.point.type === 'high';
            const offsetY = isHigh ? -15 : 15;
            
            series.push({
              name: `Cypher ${idx} ${pivot.label}`,
              type: 'scatter',
              data: [[pivot.point.index, pivot.point.price]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: color,
                borderColor: '#fff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: pivot.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 12,
                fontWeight: 'bold',
                color: color,
                distance: 5
              },
              z: 65
            });
          });
          
          // Draw ratio labels along legs
          const ratioLabels = [
            { from: A, to: B, ratio: ratios.XAB, label: `XAB: ${formatCypherRatio(ratios.XAB)}` },
            { from: B, to: C, ratio: ratios.ABC, label: `ABC: ${formatCypherRatio(ratios.ABC)}` },
            { from: C, to: D, ratio: ratios.BCD, label: `BCD: ${formatCypherRatio(ratios.BCD)}` }
          ];
          
          ratioLabels.forEach((rl, rIdx) => {
            const midX = Math.round((rl.from.index + rl.to.index) / 2);
            const midY = (rl.from.price + rl.to.price) / 2;
            
            series.push({
              name: `Cypher ${idx} Ratio ${rIdx}`,
              type: 'scatter',
              data: [[midX, midY]],
              symbol: 'roundRect',
              symbolSize: [70, 16],
              itemStyle: {
                color: 'rgba(6, 9, 187, 0.8)'
              },
              label: {
                show: true,
                formatter: rl.label,
                position: 'inside',
                fontSize: 9,
                color: '#fff'
              },
              z: 70
            });
          });
          
          // Pattern name badge near D point
          const badgeX = D.index;
          const badgeY = type === 'bullish' ? D.price * 0.97 : D.price * 1.03;
          
          series.push({
            name: `Cypher ${idx} Badge`,
            type: 'scatter',
            data: [[badgeX, badgeY]],
            symbol: 'roundRect',
            symbolSize: [120, 35],
            itemStyle: {
              color: type === 'bullish' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
              borderColor: color,
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `${type === 'bullish' ? '▲' : '▼'} CYPHER\nScore: ${score.toFixed(0)}%`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              lineHeight: 14
            },
            z: 80
          });
          
          // XAD ratio badge (most important for Cypher)
          const xadBadgeX = Math.round((X.index + D.index) / 2);
          const xadBadgeY = (X.price + D.price) / 2;
          
          series.push({
            name: `Cypher ${idx} XAD`,
            type: 'scatter',
            data: [[xadBadgeX, xadBadgeY]],
            symbol: 'roundRect',
            symbolSize: [75, 18],
            itemStyle: {
              color: 'rgba(139, 92, 246, 0.9)'
            },
            label: {
              show: true,
              formatter: `XAD: ${formatCypherRatio(ratios.XAD)}`,
              position: 'inside',
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 72
          });
        });
        
        // Draw confirmation arrows
        result.bullishConfirmations.forEach((idx, i) => {
          if (idx < data.length) {
            series.push({
              name: `Cypher Bull Confirm ${i}`,
              type: 'scatter',
              data: [[idx, data[idx].low]],
              symbol: 'triangle',
              symbolSize: 16,
              itemStyle: {
                color: bullColor,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 85
            });
          }
        });
        
        result.bearishConfirmations.forEach((idx, i) => {
          if (idx < data.length) {
            series.push({
              name: `Cypher Bear Confirm ${i}`,
              type: 'scatter',
              data: [[idx, data[idx].high]],
              symbol: 'triangle',
              symbolRotate: 180,
              symbolSize: 16,
              itemStyle: {
                color: bearColor,
                borderColor: '#fff',
                borderWidth: 2
              },
              z: 85
            });
          }
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.78 : data[data.length - 1].high * 1.02;
        
        const bullishPatterns = result.patterns.filter(p => p.type === 'bullish').length;
        const bearishPatterns = result.patterns.filter(p => p.type === 'bearish').length;
        const validPatterns = result.patterns.filter(p => p.isValid).length;
        const avgScore = result.patterns.length > 0 
          ? result.patterns.reduce((sum, p) => sum + p.score, 0) / result.patterns.length 
          : 0;
        
        series.push({
          name: 'Cypher Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 90],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#0609bb',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🔷 Cypher Pattern\n▲ Bullish: ${bullishPatterns}\n▼ Bearish: ${bearishPatterns}\nValid: ${validPatterns}\nAvg Score: ${avgScore.toFixed(0)}%`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Cypher Pattern] Error:', error);
      }
    }

    // === SUPPORT RESISTANCE MAJOR/MINOR (TFlab Market Structure) ===
    if ((indicators as any).srMajorMinor) {
      try {
        const srLevels = getRecentSRLevels(data, defaultSRConfig, 4);
        
        srLevels.forEach((level, idx) => {
          const color = getLevelColor(level, defaultSRConfig);
          const lineStyle = getLevelLineStyle(level);
          const lineWidth = getLevelLineWidth(level);
          
          // Draw horizontal line from pivot point to end of chart
          const lineData = [
            [level.index, level.price],
            [data.length - 1, level.price]
          ];
          
          series.push({
            name: `SR ${level.term} ${level.type} ${idx}`,
            type: 'line',
            data: lineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: color,
              width: lineWidth,
              type: lineStyle === 'solid' ? 'solid' : lineStyle === 'dashed' ? 'dashed' : [2, 2]
            },
            z: 45
          });
          
          // Add pivot marker
          const isResistance = level.type.includes('resistance');
          series.push({
            name: `SR Pivot ${idx}`,
            type: 'scatter',
            data: [[level.index, level.price]],
            symbol: 'circle',
            symbolSize: lineWidth + 4,
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 50
          });
          
          // Add label at the end of line
          const labelText = level.term === 'long' 
            ? (level.type.includes('major') ? (isResistance ? 'LT-MR' : 'LT-MS') : (isResistance ? 'LT-mr' : 'LT-ms'))
            : (level.type.includes('major') ? (isResistance ? 'ST-MR' : 'ST-MS') : (isResistance ? 'ST-mr' : 'ST-ms'));
          
          series.push({
            name: `SR Label ${idx}`,
            type: 'scatter',
            data: [[data.length - 1, level.price]],
            symbol: 'roundRect',
            symbolSize: [50, 16],
            itemStyle: {
              color: color + 'CC'
            },
            label: {
              show: true,
              formatter: `${labelText} ${level.pivotType}`,
              position: 'inside',
              fontSize: 8,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 55
          });
        });
        
        // Stats badge
        const allLevels = calculateSupportResistanceMajorMinor(data, defaultSRConfig);
        const longMajorCount = allLevels.filter(l => l.term === 'long' && l.type.includes('major')).length;
        const longMinorCount = allLevels.filter(l => l.term === 'long' && l.type.includes('minor')).length;
        const shortMajorCount = allLevels.filter(l => l.term === 'short' && l.type.includes('major')).length;
        const shortMinorCount = allLevels.filter(l => l.term === 'short' && l.type.includes('minor')).length;
        
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.72 : data[data.length - 1].high * 1.02;
        
        series.push({
          name: 'SR Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#085d31',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 S/R Market Structure\nLT Major: ${longMajorCount}\nLT Minor: ${longMinorCount}\nST Major: ${shortMajorCount}\nST Minor: ${shortMinorCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[SR Major/Minor] Error:', error);
      }
    }

    // === WOLFE WAVES [BigBeluga] ===
    if ((indicators as any).wolfeWavesBigBeluga) {
      try {
        const patterns = getRecentWolfeWaves(data, defaultWolfeWaveConfig, 3);
        
        patterns.forEach((pattern, idx) => {
          const color = getWolfeWaveColor(pattern, defaultWolfeWaveConfig);
          const { pivots, type, projectionLines, invalidated } = pattern;
          
          // Draw wave lines (1-2, 2-3, 3-4, 4-5)
          for (let i = 0; i < pivots.length - 1; i++) {
            const p1 = pivots[i];
            const p2 = pivots[i + 1];
            
            series.push({
              name: `Wolfe Wave ${idx} Line ${i}`,
              type: 'line',
              data: [
                [p1.index, p1.price],
                [p2.index, p2.price]
              ],
              smooth: false,
              showSymbol: false,
              lineStyle: {
                color: invalidated ? '#ef4444' : color,
                width: 2,
                type: 'solid'
              },
              z: 55
            });
          }
          
          // Draw pivot labels (1-5)
          pivots.forEach((pivot, pIdx) => {
            const labelText = pIdx === 4 
              ? (type === 'bullish' ? '5\nBullish' : 'Bearish\n5')
              : String(pIdx + 1);
            
            series.push({
              name: `Wolfe Pivot ${idx}-${pIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color: invalidated ? '#ef4444' : color,
                borderColor: '#fff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: labelText,
                position: pivot.isHigh ? 'top' : 'bottom',
                fontSize: pIdx === 4 ? 11 : 12,
                fontWeight: 'bold',
                color: invalidated ? '#ef4444' : color,
                distance: 5
              },
              z: 65
            });
          });
          
          // Draw projection line 1-4 (target line - dashed)
          series.push({
            name: `Wolfe Target ${idx}`,
            type: 'line',
            data: [
              [pivots[0].index, pivots[0].price],
              [projectionLines.line1_4.end.index, projectionLines.line1_4.end.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: '#94a3b8',
              width: 1,
              type: 'dashed'
            },
            z: 50
          });
          
          // Draw projection line 1-3 (dotted)
          series.push({
            name: `Wolfe Proj 1-3 ${idx}`,
            type: 'line',
            data: [
              [pivots[0].index, pivots[0].price],
              [projectionLines.line1_3.end.index, projectionLines.line1_3.end.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: '#94a3b8',
              width: 1,
              type: [2, 4] // dotted
            },
            z: 48
          });
          
          // Draw projection line 2-4 (dotted)
          series.push({
            name: `Wolfe Proj 2-4 ${idx}`,
            type: 'line',
            data: [
              [pivots[1].index, pivots[1].price],
              [projectionLines.line2_4.end.index, projectionLines.line2_4.end.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: '#94a3b8',
              width: 1,
              type: [2, 4] // dotted
            },
            z: 48
          });
        });
        
        // Stats badge
        const allPatterns = detectWolfeWavesBigBeluga(data, defaultWolfeWaveConfig);
        const bullishCount = allPatterns.filter(p => p.type === 'bullish').length;
        const bearishCount = allPatterns.filter(p => p.type === 'bearish').length;
        const validCount = allPatterns.filter(p => !p.invalidated).length;
        
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.66 : data[data.length - 1].high * 1.02;
        
        series.push({
          name: 'Wolfe Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 70],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#ffa500',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🐺 Wolfe Waves\n▲ Bullish: ${bullishCount}\n▼ Bearish: ${bearishCount}\n✓ Valid: ${validCount}`,
            position: 'inside',
            fontSize: 10,
            color: '#e2e8f0',
            lineHeight: 14
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Wolfe Waves BigBeluga] Error:', error);
      }
    }

    // === DEVIATION TREND PROFILE [BigBeluga] ===
    if ((indicators as any).deviationTrendProfile) {
      try {
        const result = calculateDeviationTrendProfile(data, defaultDeviationTrendConfig);
        
        // Draw SMA line with gradient color
        const smaLineData: [number, number][] = [];
        for (let i = 0; i < result.smaValues.length; i++) {
          if (!isNaN(result.smaValues[i])) {
            smaLineData.push([i, result.smaValues[i]]);
          }
        }
        
        // Split SMA into segments for coloring
        const smaSegments: { data: [number, number][]; color: string }[] = [];
        let currentSegment: [number, number][] = [];
        let currentColor = result.smaColors[0] || '#12d1eb';
        
        for (let i = 0; i < result.smaValues.length; i++) {
          if (!isNaN(result.smaValues[i])) {
            currentSegment.push([i, result.smaValues[i]]);
            
            // Check if color changes significantly
            if (i > 0 && currentSegment.length > 5) {
              smaSegments.push({ data: [...currentSegment], color: currentColor });
              currentSegment = [[i, result.smaValues[i]]];
              currentColor = result.smaColors[i] || currentColor;
            }
          }
        }
        if (currentSegment.length > 0) {
          smaSegments.push({ data: currentSegment, color: currentColor });
        }
        
        // Draw main SMA line
        series.push({
          name: 'Deviation SMA',
          type: 'line',
          data: smaLineData,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: result.smaColors[result.smaColors.length - 1] || '#12d1eb',
            width: 3
          },
          z: 40
        });
        
        // Draw upper deviation bands
        const bandStyles = [
          { mult: '+1', data: result.upperBands.stdv1, opacity: 0.8 },
          { mult: '+2', data: result.upperBands.stdv2, opacity: 0.6 },
          { mult: '+3', data: result.upperBands.stdv3, opacity: 0.4 },
        ];
        
        bandStyles.forEach(band => {
          const lineData: [number, number][] = [];
          for (let i = 0; i < band.data.length; i++) {
            if (!isNaN(band.data[i])) {
              lineData.push([i, band.data[i]]);
            }
          }
          
          series.push({
            name: `StdDev ${band.mult}`,
            type: 'line',
            data: lineData,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              color: '#94a3b8',
              width: 1,
              type: 'dashed',
              opacity: band.opacity
            },
            z: 35
          });
        });
        
        // Draw lower deviation bands
        const lowerBandStyles = [
          { mult: '-1', data: result.lowerBands.stdv1, opacity: 0.8 },
          { mult: '-2', data: result.lowerBands.stdv2, opacity: 0.6 },
          { mult: '-3', data: result.lowerBands.stdv3, opacity: 0.4 },
        ];
        
        lowerBandStyles.forEach(band => {
          const lineData: [number, number][] = [];
          for (let i = 0; i < band.data.length; i++) {
            if (!isNaN(band.data[i])) {
              lineData.push([i, band.data[i]]);
            }
          }
          
          series.push({
            name: `StdDev ${band.mult}`,
            type: 'line',
            data: lineData,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              color: '#94a3b8',
              width: 1,
              type: 'dashed',
              opacity: band.opacity
            },
            z: 35
          });
        });
        
        // Draw level labels at the end
        result.currentLevels.forEach(level => {
          if (!isNaN(level.price)) {
            series.push({
              name: `Level ${level.label}`,
              type: 'scatter',
              data: [[data.length + 3, level.price]],
              symbol: 'roundRect',
              symbolSize: [25, 14],
              itemStyle: {
                color: 'rgba(148, 163, 184, 0.8)'
              },
              label: {
                show: true,
                formatter: level.label,
                position: 'inside',
                fontSize: 9,
                color: '#fff',
                fontWeight: 'bold'
              },
              z: 45
            });
          }
        });
        
        // Draw trend signals
        const recentSignals = getRecentTrendSignals(result, 10);
        recentSignals.forEach((signal, idx) => {
          const color = signal.type === 'bullish' ? '#12d1eb' : '#fa2856';
          
          // Outer circle (larger, semi-transparent)
          series.push({
            name: `Trend Signal Outer ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'circle',
            symbolSize: 16,
            itemStyle: {
              color: color + '80',
              borderColor: color,
              borderWidth: 1
            },
            z: 58
          });
          
          // Inner circle (smaller, solid)
          series.push({
            name: `Trend Signal Inner ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: color,
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 60
          });
        });
        
        // Draw trend profile histogram
        if (result.trendProfile && result.trendProfile.bins.length > 0) {
          const profileStartX = data.length + defaultDeviationTrendConfig.profileOffset;
          
          result.trendProfile.bins.forEach((bin, idx) => {
            if (bin.count > 0) {
              const barWidth = bin.count;
              
              series.push({
                name: `Profile Bin ${idx}`,
                type: 'scatter',
                data: [[profileStartX - barWidth / 2, (bin.lower + bin.upper) / 2]],
                symbol: 'rect',
                symbolSize: [barWidth, (bin.upper - bin.lower) * 0.8],
                itemStyle: {
                  color: bin.color,
                  opacity: 0.7
                },
                z: 30
              });
            }
          });
        }
        
        // Stats badge
        const bullishSignals = result.trendSignals.filter(s => s.type === 'bullish').length;
        const bearishSignals = result.trendSignals.filter(s => s.type === 'bearish').length;
        const trendBars = data.length - result.trendStartIndex;
        
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.60 : data[data.length - 1].high * 1.02;
        
        series.push({
          name: 'Deviation Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: result.currentTrend === 'bullish' ? '#12d1eb' : '#fa2856',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 Deviation Trend\n🔵 Bullish: ${bullishSignals}\n🔴 Bearish: ${bearishSignals}\n📈 Trend: ${trendBars} bars\n${result.currentTrend === 'bullish' ? '▲ Uptrend' : '▼ Downtrend'}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Deviation Trend Profile] Error:', error);
      }
    }

    // === LOG REGRESSION OSCILLATOR CHANNEL [BigBeluga] ===
    if ((indicators as any).logRegressionOscillator) {
      try {
        const result = calculateLogRegressionOscillator(data, defaultLogRegressionOscConfig);
        const { channel, oscillator, upperThreshold, lowerThreshold } = result;
        
        // Draw upper channel line
        series.push({
          name: 'Log Reg Upper',
          type: 'line',
          data: [
            [channel.upperLine.startIndex, channel.upperLine.startPrice],
            [channel.upperLine.endIndex, channel.upperLine.endPrice]
          ],
          smooth: false,
          showSymbol: false,
          lineStyle: {
            color: defaultLogRegressionOscConfig.colors.upperLine,
            width: 2
          },
          z: 40
        });
        
        // Draw lower channel line
        series.push({
          name: 'Log Reg Lower',
          type: 'line',
          data: [
            [channel.lowerLine.startIndex, channel.lowerLine.startPrice],
            [channel.lowerLine.endIndex, channel.lowerLine.endPrice]
          ],
          smooth: false,
          showSymbol: false,
          lineStyle: {
            color: defaultLogRegressionOscConfig.colors.lowerLine,
            width: 2
          },
          z: 40
        });
        
        // Draw mid channel line (optional)
        if (defaultLogRegressionOscConfig.showMidLine) {
          series.push({
            name: 'Log Reg Mid',
            type: 'line',
            data: [
              [channel.midLine.startIndex, channel.midLine.startPrice],
              [channel.midLine.endIndex, channel.midLine.endPrice]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: defaultLogRegressionOscConfig.colors.midLine,
              width: 1,
              type: 'dashed'
            },
            z: 38
          });
        }
        
        // Draw oscillator line (mapped to channel)
        if (oscillator.scaledValues.length > 0) {
          const oscLineData = oscillator.scaledValues.map(v => [v.index, v.price] as [number, number]);
          
          series.push({
            name: `${oscillator.type} Oscillator`,
            type: 'line',
            data: oscLineData,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              color: defaultLogRegressionOscConfig.colors.oscillator,
              width: 2
            },
            z: 45
          });
        }
        
        // Draw signal line (optional)
        if (defaultLogRegressionOscConfig.showSignalLine && oscillator.scaledSignal.length > 0) {
          const sigLineData = oscillator.scaledSignal.map(v => [v.index, v.price] as [number, number]);
          
          series.push({
            name: 'Signal Line',
            type: 'line',
            data: sigLineData,
            smooth: true,
            showSymbol: false,
            lineStyle: {
              color: defaultLogRegressionOscConfig.colors.signal,
              width: 1
            },
            z: 44
          });
        }
        
        // Draw threshold labels
        const lastIdx = data.length - 1;
        const upperThresholdY = channel.upperLine.endPrice;
        const lowerThresholdY = channel.lowerLine.endPrice;
        const currentOscValue = oscillator.values[lastIdx];
        
        // Upper threshold label
        series.push({
          name: 'Upper Threshold Label',
          type: 'scatter',
          data: [[lastIdx + 3, upperThresholdY]],
          symbol: 'roundRect',
          symbolSize: [40, 14],
          itemStyle: {
            color: 'rgba(167, 171, 185, 0.8)'
          },
          label: {
            show: true,
            formatter: `${upperThreshold}`,
            position: 'inside',
            fontSize: 9,
            color: '#fff'
          },
          z: 50
        });
        
        // Lower threshold label
        series.push({
          name: 'Lower Threshold Label',
          type: 'scatter',
          data: [[lastIdx + 3, lowerThresholdY]],
          symbol: 'roundRect',
          symbolSize: [40, 14],
          itemStyle: {
            color: 'rgba(167, 171, 185, 0.8)'
          },
          label: {
            show: true,
            formatter: `${lowerThreshold}`,
            position: 'inside',
            fontSize: 9,
            color: '#fff'
          },
          z: 50
        });
        
        // Current oscillator value label
        if (!isNaN(currentOscValue) && oscillator.scaledValues.length > 0) {
          const lastScaled = oscillator.scaledValues[oscillator.scaledValues.length - 1];
          
          series.push({
            name: 'Current Osc Value',
            type: 'scatter',
            data: [[lastIdx + 3, lastScaled.price]],
            symbol: 'roundRect',
            symbolSize: [60, 16],
            itemStyle: {
              color: defaultLogRegressionOscConfig.colors.oscillator + 'CC'
            },
            label: {
              show: true,
              formatter: `${oscillator.type}: ${currentOscValue.toFixed(1)}`,
              position: 'inside',
              fontSize: 9,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 52
          });
        }
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.54 : data[data.length - 1].high * 1.02;
        
        const oscAbove70 = oscillator.values.filter(v => !isNaN(v) && v > upperThreshold).length;
        const oscBelow30 = oscillator.values.filter(v => !isNaN(v) && v < lowerThreshold).length;
        
        series.push({
          name: 'Log Reg Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#7e57c2',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📈 Log Regression\n${oscillator.type}\nOverbought: ${oscAbove70}\nOversold: ${oscBelow30}\nLookback: ${defaultLogRegressionOscConfig.lookbackPeriod}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Log Regression Oscillator] Error:', error);
      }
    }

    // === DONALT TOOLKIT [BigBeluga] ===
    if ((indicators as any).donAltToolkit) {
      try {
        const result = calculateDonAltToolkit(data, defaultDonAltConfig);
        
        // Draw Support/Resistance Levels
        result.levels.forEach((level, idx) => {
          // Draw horizontal line
          series.push({
            name: `DonAlt Level ${idx}`,
            type: 'line',
            data: [
              [level.index, level.price],
              [data.length + 50, level.price]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: level.color + 'CC',
              width: 1,
              type: defaultDonAltConfig.levelsStyle === 'dashed' ? 'dashed' : 'solid'
            },
            z: 42
          });
          
          // Mark at pivot point
          series.push({
            name: `DonAlt Level Pivot ${idx}`,
            type: 'scatter',
            data: [[level.index, level.price]],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
              color: level.color,
              borderColor: '#fff',
              borderWidth: 1
            },
            z: 45
          });
        });
        
        // Draw Order Blocks
        result.orderBlocks.forEach((block, idx) => {
          const color = block.type === 'bullish' 
            ? defaultDonAltConfig.orderBlocksBullColor 
            : defaultDonAltConfig.orderBlocksBearColor;
          
          // Draw filled rectangle for order block
          const corners = [
            [block.startIndex, block.top],
            [block.endIndex, block.top],
            [block.endIndex, block.bottom],
            [block.startIndex, block.bottom],
            [block.startIndex, block.top]
          ];
          
          series.push({
            name: `Order Block ${idx}`,
            type: 'line',
            data: corners,
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: color + '30',
              width: 1
            },
            areaStyle: {
              color: color + '50'
            },
            z: 35
          });
          
          // Add label
          const labelX = block.startIndex + (block.endIndex - block.startIndex) / 2;
          const labelY = (block.top + block.bottom) / 2;
          
          series.push({
            name: `OB Label ${idx}`,
            type: 'scatter',
            data: [[labelX, labelY]],
            symbol: 'roundRect',
            symbolSize: [50, 14],
            itemStyle: {
              color: color + 'AA'
            },
            label: {
              show: true,
              formatter: block.type === 'bullish' ? '▲ OB' : '▼ OB',
              position: 'inside',
              fontSize: 8,
              color: '#fff',
              fontWeight: 'bold'
            },
            z: 40
          });
        });
        
        // Draw Trend Lines
        result.trendLines.forEach((line, idx) => {
          const color = line.type === 'bullish' 
            ? defaultDonAltConfig.trendLinesBullColor 
            : defaultDonAltConfig.trendLinesBearColor;
          
          series.push({
            name: `Trend Line ${idx}`,
            type: 'line',
            data: [
              [line.startIndex, line.startPrice],
              [line.endIndex, line.endPrice]
            ],
            smooth: false,
            showSymbol: false,
            lineStyle: {
              color: color,
              width: 1,
              type: defaultDonAltConfig.trendLinesStyle === 'dashed' ? 'dashed' : 'solid'
            },
            z: 43
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.48 : data[data.length - 1].high * 1.02;
        
        const supportLevels = result.levels.filter(l => l.type === 'support').length;
        const resistanceLevels = result.levels.filter(l => l.type === 'resistance').length;
        const bullishOBs = result.orderBlocks.filter(b => b.type === 'bullish').length;
        const bearishOBs = result.orderBlocks.filter(b => b.type === 'bearish').length;
        
        series.push({
          name: 'DonAlt Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 85],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#23b850',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🎯 DonAlt Toolkit\nS/R: ${supportLevels}/${resistanceLevels}\nOB: ${bullishOBs}▲ ${bearishOBs}▼\nTrendlines: ${result.trendLines.length}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[DonAlt Toolkit] Error:', error);
      }
    }

    // === Psychological Support/Resistance [HunterAlgos] ===
    if ((indicators as any).psychologicalSR) {
      try {
        const config = { ...defaultPsychologicalSRConfig, ...(indicators as any).psychologicalSR };
        const zones = detectPsychologicalSR(data, config);

        zones.forEach((zone, idx) => {
          const zoneStartTime = dates[zone.startTime] || dates[0];
          const zoneEndTime = dates[zone.endTime] || dates[dates.length - 1];
          const zoneColor = zone.type === 'support' ? config.colors.support : config.colors.resistance;

          // Draw filled zone rectangle
          series.push({
            name: `${zone.type === 'support' ? 'Support' : 'Resistance'} Zone ${idx + 1}`,
            type: 'custom',
            renderItem: (params: any, api: any) => {
              const x1 = api.coord([zoneStartTime, 0])[0];
              const x2 = api.coord([zoneEndTime, 0])[0];
              const y1 = api.coord([0, zone.bottom])[1];
              const y2 = api.coord([0, zone.top])[1];

              return {
                type: 'rect',
                shape: {
                  x: x1,
                  y: y2,
                  width: x2 - x1,
                  height: y1 - y2
                },
                style: {
                  fill: zoneColor.includes('rgb') 
                    ? zoneColor.replace(')', ', 0.15)').replace('rgb', 'rgba')
                    : `${zoneColor}33`,
                  stroke: 'rgba(255, 255, 255, 0)',
                  lineWidth: 0
                }
              };
            },
            data: [[zoneStartTime, zone.bottom]],
            z: 8
          });

          // Draw key level line (extended)
          const lastTime = dates[dates.length - 1];
          const lastIdx = data.length - 1;
          
          series.push({
            name: `${zone.type} Level ${idx + 1}`,
            type: 'line',
            data: [
              [zoneStartTime, zone.level],
              [lastTime, zone.level]
            ],
            lineStyle: {
              color: zoneColor,
              width: 2,
              type: 'solid'
            },
            markLine: {
              symbol: 'none',
              data: [{
                xAxis: lastTime,
                yAxis: zone.level,
                lineStyle: {
                  color: zoneColor,
                  width: 2,
                  type: 'dashed'
                }
              }]
            },
            symbol: 'none',
            z: 10
          });

          // Volume label (if not hidden)
          if (!config.hideVolume && zone.volume) {
            const labelIdx = Math.floor((zone.startTime + zone.endTime) / 2);
            const labelX = dates[labelIdx] || dates[0];
            const labelY = (zone.top + zone.bottom) / 2;
            
            series.push({
              name: `Zone Volume ${idx + 1}`,
              type: 'scatter',
              data: [[labelX, labelY]],
              symbolSize: 0,
              label: {
                show: true,
                formatter: `Vol: ${zone.volume}`,
                color: config.colors.text,
                fontSize: 9,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: [3, 6],
                borderRadius: 3
              },
              z: 11
            });
          }
        });

        // Stats badge
        const supportCount = zones.filter(z => z.type === 'support').length;
        const resistanceCount = zones.filter(z => z.type === 'resistance').length;
        const statsX = dates[Math.floor(data.length * 0.02)];
        const statsY = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.01;

        series.push({
          name: 'Psychological SR Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [120, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#00bfff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🧠 Psychological S/R\nSupport: ${supportCount}\nResistance: ${resistanceCount}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });

      } catch (error) {
        console.error('[Psychological SR] Error:', error);
      }
    }

    // === Wedge and Flag Finder [Trendoscope] ===
    if ((indicators as any).wedgeFlagFinder) {
      try {
        const config = { ...defaultWedgeFlagConfig, ...(indicators as any).wedgeFlagFinder };
        const result = calculateWedgeFlag(data, config);

        // Draw zigzag pivots if enabled
        if (config.drawZigzag) {
          result.zigzagPivots.forEach((pivots, level) => {
            const levelColors = ['#fbf46d', '#4a9ff5', '#ff998c', '#00ead3'];
            const color = levelColors[(level - 1) % levelColors.length];
            
            // Draw zigzag lines
            const zigzagData: [number, number][] = [];
            pivots.forEach(pivot => {
              zigzagData.push([pivot.timestamp, pivot.price]);
            });
            
            if (zigzagData.length > 1) {
              series.push({
                name: `ZigZag L${level}`,
                type: 'line',
                data: zigzagData,
                lineStyle: {
                  color: color,
                  width: 1,
                  opacity: 0.5
                },
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: {
                  color: color
                },
                z: 5
              });
            }
          });
        }

        // Draw patterns
        result.patterns.forEach((pattern, idx) => {
          const patternColor = pattern.color;

          if (pattern.type === 'flag') {
            // Draw flag pole
            series.push({
              name: `Flag Pole ${idx + 1}`,
              type: 'line',
              data: [
                [pattern.poleLine.timestamp1, pattern.poleLine.y1],
                [pattern.poleLine.timestamp2, pattern.poleLine.y2]
              ],
              lineStyle: {
                color: patternColor,
                width: 2
              },
              symbol: 'none',
              z: 15
            });
          }

          // Draw upper trend line
          series.push({
            name: `${pattern.type === 'wedge' ? 'Wedge' : 'Flag'} Upper TL ${idx + 1}`,
            type: 'line',
            data: [
              [pattern.upperTrendLine.timestamp1, pattern.upperTrendLine.y1],
              [pattern.upperTrendLine.timestamp2, pattern.upperTrendLine.y2]
            ],
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            symbol: 'none',
            z: 16
          });

          // Draw lower trend line
          series.push({
            name: `${pattern.type === 'wedge' ? 'Wedge' : 'Flag'} Lower TL ${idx + 1}`,
            type: 'line',
            data: [
              [pattern.lowerTrendLine.timestamp1, pattern.lowerTrendLine.y1],
              [pattern.lowerTrendLine.timestamp2, pattern.lowerTrendLine.y2]
            ],
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            symbol: 'none',
            z: 16
          });

          // Draw pivot labels
          pattern.pivots.forEach((pivot, pIdx) => {
            const labelNum = pattern.pivots.length - pIdx;
            series.push({
              name: `Pivot ${labelNum}`,
              type: 'scatter',
              data: [[pivot.timestamp, pivot.price]],
              symbolSize: 0,
              label: {
                show: true,
                formatter: `${labelNum}`,
                color: patternColor,
                fontSize: 10,
                fontWeight: 'bold',
                position: pivot.direction === 1 ? 'top' : 'bottom'
              },
              z: 17
            });
          });

          // Pattern label
          const labelPivot = pattern.pivots[pattern.pivots.length - 1];
          const labelDir = labelPivot.direction;
          series.push({
            name: `Pattern Label ${idx + 1}`,
            type: 'scatter',
            data: [[labelPivot.timestamp, labelPivot.price]],
            symbol: 'roundRect',
            symbolSize: [50, 20],
            itemStyle: {
              color: patternColor
            },
            label: {
              show: true,
              formatter: pattern.type === 'wedge' ? 'Wedge' : 'Flag',
              color: '#000000',
              fontSize: 10,
              fontWeight: 'bold',
              position: 'inside'
            },
            z: 18
          });
        });

        // Stats badge
        const wedgeCount = result.patterns.filter(p => p.type === 'wedge').length;
        const flagCount = result.patterns.filter(p => p.type === 'flag').length;
        const statsX = dates[Math.floor(data.length * 0.04)];
        const statsY = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.01;

        series.push({
          name: 'Wedge/Flag Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 70],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#fbf46d',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📐 Wedge & Flag Finder\nWedges: ${wedgeCount}\nFlags: ${flagCount}\nZigzag Levels: ${result.zigzagPivots.size}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });

      } catch (error) {
        console.error('[Wedge/Flag Finder] Error:', error);
      }
    }

    // === Price Heat Meter [ChartPrime] ===
    if ((indicators as any).priceHeatMeter) {
      try {
        const config = { ...defaultHeatMeterConfig, ...(indicators as any).priceHeatMeter };
        const result = calculatePriceHeatMeter(data, config);

        // Draw heat candles (replace standard candles with colored ones)
        if (config.showHeatCandles && result.candles.length > 0) {
          // Group candles by color for efficient rendering
          const candlesByColor = new Map<string, Array<{ timestamp: number; open: number; close: number; high: number; low: number }>>();
          
          result.candles.forEach(candle => {
            if (!candlesByColor.has(candle.heatColor)) {
              candlesByColor.set(candle.heatColor, []);
            }
            candlesByColor.get(candle.heatColor)!.push({
              timestamp: typeof candle.timestamp === 'string' ? parseInt(candle.timestamp, 10) : candle.timestamp as number,
              open: candle.open,
              close: candle.close,
              high: candle.high,
              low: candle.low
            });
          });

          // Render heat candles as custom series
          let colorIdx = 0;
          candlesByColor.forEach((candles, color) => {
            candles.forEach((candle, idx) => {
              // Draw body
              const isUp = candle.close >= candle.open;
              series.push({
                name: `Heat Candle Body ${colorIdx}-${idx}`,
                type: 'custom',
                renderItem: (params: any, api: any) => {
                  const x = api.coord([candle.timestamp, 0])[0];
                  const yOpen = api.coord([0, candle.open])[1];
                  const yClose = api.coord([0, candle.close])[1];
                  const yHigh = api.coord([0, candle.high])[1];
                  const yLow = api.coord([0, candle.low])[1];
                  const width = 6;
                  
                  return {
                    type: 'group',
                    children: [
                      // Wick
                      {
                        type: 'line',
                        shape: {
                          x1: x,
                          y1: yHigh,
                          x2: x,
                          y2: yLow
                        },
                        style: {
                          stroke: color,
                          lineWidth: 1
                        }
                      },
                      // Body
                      {
                        type: 'rect',
                        shape: {
                          x: x - width / 2,
                          y: Math.min(yOpen, yClose),
                          width: width,
                          height: Math.abs(yClose - yOpen) || 1
                        },
                        style: {
                          fill: isUp ? color : color,
                          stroke: color,
                          lineWidth: 1
                        }
                      }
                    ]
                  };
                },
                data: [[candle.timestamp, candle.close]],
                z: 25
              });
            });
            colorIdx++;
          });
        }

        // Draw extreme levels
        if (config.showExtremeLevels) {
          result.extremeLevels.forEach((level, idx) => {
            if (level.count > 0) {
              const opacity = Math.max(0.1, level.opacity);
              const levelColor = level.type === 'upper' 
                ? `rgba(255, 0, 0, ${opacity})`
                : `rgba(0, 255, 255, ${opacity})`;
              
              series.push({
                name: `${level.type === 'upper' ? 'Upper' : 'Lower'} Extreme ${idx + 1}`,
                type: 'line',
                data: [
                  [level.startTime, level.price],
                  [level.endTime, level.price]
                ],
                lineStyle: {
                  color: levelColor,
                  width: 2,
                  type: 'solid'
                },
                symbol: 'none',
                z: 12
              });
            }
          });
        }

        // Draw labels at extreme persistence points
        if (config.showLabels) {
          result.labels.forEach((label, idx) => {
            series.push({
              name: `Heat Label ${idx + 1}`,
              type: 'scatter',
              data: [[label.timestamp, label.price]],
              symbolSize: 0,
              label: {
                show: true,
                formatter: `${label.heatPercent.toFixed(1)}%`,
                color: label.color,
                fontSize: 10,
                fontWeight: 'bold',
                position: label.type === 'upper' ? 'top' : 'bottom',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: [2, 4],
                borderRadius: 2
              },
              z: 30
            });
          });
        }

        // Heat meter bar at bottom (simplified representation)
        const meterY = data.reduce((min, d) => Math.min(min, d.low), Infinity) * 0.995;
        const meterStartIdx = Math.floor(data.length * 0.3);
        const meterEndIdx = Math.floor(data.length * 0.7);
        const meterStartX = Number(dates[meterStartIdx]);
        const meterEndX = Number(dates[meterEndIdx]);
        
        // Draw meter segments
        const segmentCount = 20;
        const timeStep = (meterEndX - meterStartX) / segmentCount;
        
        for (let i = 0; i < segmentCount; i++) {
          const segmentX = meterStartX + i * timeStep;
          const ratio = i / (segmentCount - 1);
          let segmentColor: string;
          
          if (ratio < 0.5) {
            // Cold to mid
            const r = Math.round(0 + ratio * 2 * 255);
            const g = Math.round(255);
            const b = Math.round(255 - ratio * 2 * 255);
            segmentColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            // Mid to hot
            const r = 255;
            const g = Math.round(255 - (ratio - 0.5) * 2 * 255);
            const b = 0;
            segmentColor = `rgb(${r}, ${g}, ${b})`;
          }
          
          series.push({
            name: `Meter Segment ${i}`,
            type: 'scatter',
            data: [[segmentX, meterY]],
            symbol: 'rect',
            symbolSize: [Math.max(2, (meterEndX - meterStartX) / segmentCount / 50), 8],
            itemStyle: {
              color: segmentColor
            },
            z: 5
          });
        }

        // Current position marker on meter
        const positionX = meterStartX + (result.currentHeat / 100) * (meterEndX - meterStartX);
        series.push({
          name: 'Heat Position',
          type: 'scatter',
          data: [[positionX, meterY]],
          symbol: 'triangle',
          symbolSize: 12,
          symbolRotate: 180,
          itemStyle: {
            color: result.currentHeatColor
          },
          label: {
            show: true,
            formatter: `${result.currentHeat.toFixed(1)}%`,
            position: 'bottom',
            color: result.currentHeatColor,
            fontSize: 10,
            fontWeight: 'bold'
          },
          z: 6
        });

        // Stats badge
        const description = getHeatDescription(result.currentHeat);
        const statsX = dates[Math.floor(data.length * 0.06)];
        const statsY = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.01;

        series.push({
          name: 'Heat Meter Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 75],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: result.currentHeatColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🌡️ Price Heat Meter\nHeat: ${result.currentHeat.toFixed(1)}%\n${description}\nLevels: ${result.extremeLevels.length}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });

      } catch (error) {
        console.error('[Price Heat Meter] Error:', error);
      }
    }

    // === RAVM Matrix - RSI Analytic Volume Matrix (Structure Only) ===
    if ((indicators as any).ravmMatrix) {
      try {
        const config = { ...defaultRAVMConfig, ...(indicators as any).ravmMatrix };
        const result = calculateRAVM(data, config);

        // Draw signals only (no dashboard/reports)
        result.signals.forEach((signal, idx) => {
          const signalColor = signal.isConfirmed 
            ? (signal.type === 'bullish' ? config.bullishColor : config.bearishColor)
            : config.warningColor;
          
          // Draw connector line
          const lineLength = signal.type === 'bullish' ? -1 : 1;
          const atr = data.reduce((sum: number, d: typeof data[number], i: number) => {
            if (i === 0) return 0;
            return sum + Math.max(d.high - d.low, Math.abs(d.high - data[i-1].close), Math.abs(d.low - data[i-1].close));
          }, 0) / data.length;
          
          const labelOffset = atr * 1.5 * lineLength;
          const labelY = signal.price + labelOffset;

          // Connector line
          series.push({
            name: `RAVM Connector ${idx}`,
            type: 'line',
            data: [
              [signal.timestamp, signal.price],
              [signal.timestamp, labelY]
            ],
            lineStyle: {
              color: signalColor,
              width: signal.isConfirmed ? 2 : 1,
              type: signal.isConfirmed ? 'solid' : 'dotted',
              opacity: signal.isConfirmed ? 0.8 : 0.5
            },
            symbol: 'none',
            z: 25
          });

          // Signal label
          const sourceText = signal.source === 'oversold' ? 'OS' 
            : signal.source === 'overbought' ? 'OB'
            : signal.source === 'geometric_bull' ? 'GEO▲'
            : 'GEO▼';
          
          const statusIcon = signal.isConfirmed ? '✅' : '⚠️';
          
          series.push({
            name: `RAVM Signal ${idx}`,
            type: 'scatter',
            data: [[signal.timestamp, labelY]],
            symbol: signal.type === 'bullish' ? 'triangle' : 'triangle',
            symbolRotate: signal.type === 'bullish' ? 0 : 180,
            symbolSize: signal.isConfirmed ? 14 : 10,
            itemStyle: {
              color: signalColor,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `${sourceText} ${statusIcon}\n${signal.score.toFixed(0)}%`,
              color: signalColor,
              fontSize: 9,
              fontWeight: signal.isConfirmed ? 'bold' : 'normal',
              position: signal.type === 'bullish' ? 'bottom' : 'top',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: [2, 4],
              borderRadius: 3
            },
            z: 26
          });
        });

      } catch (error) {
        console.error('[RAVM Matrix] Error:', error);
      }
    }

    // === Ichimoku PourSamadi [TradingFinder] ===
    if ((indicators as any).ichimokuPourSamadi) {
      try {
        const result = calculateIchimokuPourSamadi(data);
        
        // Tenkan-sen
        series.push({
          name: 'Tenkan-sen',
          type: 'line',
          data: result.tenkanSen,
          symbol: 'none',
          lineStyle: { color: '#2962FF', width: 1.5 },
          z: 5
        });
        
        // Kijun-sen
        series.push({
          name: 'Kijun-sen',
          type: 'line',
          data: result.kijunSen,
          symbol: 'none',
          lineStyle: { color: '#B71C1C', width: 1.5 },
          z: 5
        });
        
        // Logical Kijun
        series.push({
          name: 'Logical Kijun',
          type: 'line',
          data: result.logicalKijunSen,
          symbol: 'none',
          lineStyle: { color: '#4A148C', width: 1.5, type: 'dashed' },
          z: 5
        });
        
        // Chikou Span
        series.push({
          name: 'Chikou Span',
          type: 'line',
          data: result.chikouSpan,
          symbol: 'none',
          lineStyle: { color: '#43A047', width: 1.5 },
          z: 5
        });
        
        // Senkou Span A
        series.push({
          name: 'Senkou Span A',
          type: 'line',
          data: result.spanA,
          symbol: 'none',
          lineStyle: { color: '#A5D6A7', width: 0 },
          areaStyle: {
            color: 'rgba(67, 160, 71, 0.1)',
            origin: 'start'
          },
          z: 4
        });
        
        // Senkou Span B
        series.push({
          name: 'Senkou Span B',
          type: 'line',
          data: result.spanB,
          symbol: 'none',
          lineStyle: { color: '#EF9A9A', width: 0 },
          areaStyle: {
            color: 'rgba(244, 67, 54, 0.1)',
            origin: 'start'
          },
          z: 4
        });
        
        // Timing Boxes
        result.timingBoxes.forEach((box, idx) => {
          const color = 'rgba(76, 175, 80, 0.2)';
          const borderColor = '#4CAF50';
          
          series.push({
            name: `Timing Box ${idx}`,
            type: 'line',
            markArea: {
              silent: true,
              itemStyle: {
                color: color,
                borderWidth: 1,
                borderColor: borderColor,
                borderType: 'dashed'
              },
              data: [[
                { xAxis: box.triggerIndex, yAxis: box.bottom },
                { xAxis: box.triggerIndex + 26, yAxis: box.top }
              ]]
            }
          });
        });
        
      } catch (error) {
        console.error('[Ichimoku PourSamadi] Error:', error);
      }
    }

    // === Trend Line Methods [Pivot Span & 5-Point] ===
    if ((indicators as any).trendLineMethods) {
      try {
        const tlmConfig = {
          enablePivotSpan: true,
          pivotLeft: 5,
          pivotRight: 5,
          pivotCount: 5,
          lookbackLength: 150,
          colors: {
            highTrend: '#ff7b00',
            lowTrend: '#ff7b00',
            fill: 'rgba(255, 123, 0, 0.1)'
          },
          enableFivePoint: false,
          channelLength: 100,
          fivePointColors: {
            high: '#ff00d0',
            low: '#ff00d0'
          }
        };
        const result = calculateTrendLineMethodsLib(data, tlmConfig);
        
        // Pivot Span High Trend
        if (result.pivotSpan.highTrendLine) {
          const line = result.pivotSpan.highTrendLine;
          series.push({
            name: 'Pivot Span High',
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#ff7b00', width: 2 },
              data: [[
                { coord: [line.x1, line.y1] },
                { coord: [line.x2, line.y2] }
              ]]
            }
          });
        }
        
        // Pivot Span Low Trend
        if (result.pivotSpan.lowTrendLine) {
          const line = result.pivotSpan.lowTrendLine;
          series.push({
            name: 'Pivot Span Low',
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#ff7b00', width: 2 },
              data: [[
                { coord: [line.x1, line.y1] },
                { coord: [line.x2, line.y2] }
              ]]
            }
          });
        }
        
        // 5-Point Channel High
        if (result.fivePoint.highChannelLine) {
          const line = result.fivePoint.highChannelLine;
          series.push({
            name: '5-Point Channel High',
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#ff00d0', width: 2 },
              data: [[
                { coord: [line.x1, line.y1] },
                { coord: [line.x2, line.y2] }
              ]]
            }
          });
        }
        
        // 5-Point Channel Low
        if (result.fivePoint.lowChannelLine) {
          const line = result.fivePoint.lowChannelLine;
          series.push({
            name: '5-Point Channel Low',
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#ff00d0', width: 2 },
              data: [[
                { coord: [line.x1, line.y1] },
                { coord: [line.x2, line.y2] }
              ]]
            }
          });
        }
        
      } catch (error) {
        console.error('[Trend Line Methods] Error:', error);
      }
    }

    // === Auto Chart Patterns [Trendoscope®] - Multi-Zigzag System ===
    if ((indicators as any).autoChartPatterns) {
      try {
        const result = calculateAutoChartPatterns(data);
        
        // Draw detected patterns
        result.patterns.forEach((pattern, idx) => {
          const color = getPatternColor(pattern.type);
          const name = getPatternDisplayName(pattern.type);
          
          // Upper trendline
          series.push({
            name: `${name} Upper`,
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color, width: 2 },
              data: [[
                { coord: [pattern.upperTrendLine.x1, pattern.upperTrendLine.y1] },
                { coord: [pattern.upperTrendLine.x2, pattern.upperTrendLine.y2] }
              ]],
              label: {
                show: true,
                position: 'middle',
                formatter: `${name}\n${pattern.confidence.toFixed(0)}%`,
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 'bold',
                backgroundColor: color,
                padding: [3, 6],
                borderRadius: 3
              }
            }
          });
          
          // Lower trendline
          series.push({
            name: `${name} Lower`,
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color, width: 2 },
              data: [[
                { coord: [pattern.lowerTrendLine.x1, pattern.lowerTrendLine.y1] },
                { coord: [pattern.lowerTrendLine.x2, pattern.lowerTrendLine.y2] }
              ]]
            }
          });
          
          // Draw zigzag pivots
          pattern.pivots.forEach((pivot, pIdx) => {
            series.push({
              name: `Pivot ${idx}-${pIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: pivot.direction === 1 ? 'triangle' : 'triangle',
              symbolRotate: pivot.direction === 1 ? 0 : 180,
              symbolSize: 8,
              itemStyle: {
                color: color,
                borderColor: '#ffffff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: pivot.direction === 1 ? 'H' : 'L',
                position: pivot.direction === 1 ? 'top' : 'bottom',
                fontSize: 8,
                color: '#ffffff',
                backgroundColor: color,
                padding: [1, 3],
                borderRadius: 2
              },
              z: 25
            });
            
            // Connect pivots with zigzag line
            if (pIdx > 0) {
              const prevPivot = pattern.pivots[pIdx - 1];
              series.push({
                name: `Zigzag ${idx}-${pIdx}`,
                type: 'line',
                data: [
                  [prevPivot.index, prevPivot.price],
                  [pivot.index, pivot.price]
                ],
                lineStyle: {
                  color: color,
                  width: 1,
                  type: 'solid',
                  opacity: 0.6
                },
                symbol: 'none',
                z: 24
              });
            }
          });
          
          // Pattern fill area
          series.push({
            name: `${name} Fill`,
            type: 'line',
            markArea: {
              silent: true,
              itemStyle: {
                color: `${color}20`,
                borderWidth: 0
              },
              data: [[
                { xAxis: pattern.startIndex, yAxis: pattern.lowerTrendLine.y1 },
                { xAxis: pattern.endIndex, yAxis: pattern.upperTrendLine.y2 }
              ]]
            }
          });
        });
        
      } catch (error) {
        console.error('[Auto Chart Patterns] Error:', error);
      }
    }

    // === Nadaraya-Watson Envelope [LuxAlgo] - Kernel Regression ===
    if ((indicators as any).nadarayaWatsonEnvelope) {
      try {
        const config = { ...defaultNadarayaWatsonConfig, ...(indicators as any).nadarayaWatsonEnvelope };
        const result = calculateNadarayaWatsonEnvelope(data, config);
        
        // Upper envelope
        const upperData = result.points.map(p => [p.index, p.upper]);
        series.push({
          name: 'NW Upper',
          type: 'line',
          data: upperData,
          symbol: 'none',
          lineStyle: {
            color: config.upColor,
            width: 2,
            type: 'solid'
          },
          z: 10
        });
        
        // Lower envelope
        const lowerData = result.points.map(p => [p.index, p.lower]);
        series.push({
          name: 'NW Lower',
          type: 'line',
          data: lowerData,
          symbol: 'none',
          lineStyle: {
            color: config.downColor,
            width: 2,
            type: 'solid'
          },
          z: 10
        });
        
        // Estimate line (middle)
        const estimateData = result.points.map(p => [p.index, p.value]);
        series.push({
          name: 'NW Estimate',
          type: 'line',
          data: estimateData,
          symbol: 'none',
          lineStyle: {
            color: '#888888',
            width: 1,
            type: 'dashed',
            opacity: 0.5
          },
          z: 9
        });
        
        // Fill area between bands
        series.push({
          name: 'NW Fill',
          type: 'line',
          data: upperData,
          areaStyle: {
            color: `${config.upColor}15`,
            origin: 'start'
          },
          lineStyle: { width: 0 },
          symbol: 'none',
          z: 8
        });
        
        series.push({
          name: 'NW Fill Lower',
          type: 'line',
          data: lowerData,
          areaStyle: {
            color: `${config.downColor}15`,
            origin: 'start'
          },
          lineStyle: { width: 0 },
          symbol: 'none',
          z: 8
        });
        
        // Draw signals
        result.signals.forEach((signal, idx) => {
          const isBullish = signal.type === 'crossunder';
          const color = isBullish ? config.upColor : config.downColor;
          const symbol = isBullish ? 'triangle' : 'triangle';
          const rotation = isBullish ? 0 : 180;
          
          series.push({
            name: `NW Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: symbol,
            symbolRotate: rotation,
            symbolSize: 12,
            itemStyle: {
              color: color,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: isBullish ? '▲' : '▼',
              position: isBullish ? 'bottom' : 'top',
              color: color,
              fontSize: 12,
              fontWeight: 'bold'
            },
            z: 30
          });
        });
        
        // Info badge
        const badgeX = dates[Math.floor(data.length * 0.05)];
        const badgeY = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.015;
        
        series.push({
          name: 'NW Info',
          type: 'scatter',
          data: [[badgeX, badgeY]],
          symbol: 'roundRect',
          symbolSize: [140, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: config.upColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 Nadaraya-Watson\nBandwidth: ${config.bandwidth}\n${config.repaint ? 'Repainting' : 'Non-Repainting'}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Nadaraya-Watson Envelope] Error:', error);
      }
    }

    // === RSI Cyclic Smoothed (cRSI) [whentotrade] ===
    if ((indicators as any).cyclicRSI) {
      try {
        const config = { ...defaultCyclicRSIConfig, ...(indicators as any).cyclicRSI };
        const result = calculateCyclicRSI(data, config);
        const signals = detectCyclicRSISignals(result);
        
        // This indicator is displayed in a separate pane (oscillator)
        // We'll add it to the main chart for now, but ideally it should be in its own pane
        
        // Normalize to chart scale (map 0-100 to price range)
        const priceMin = Math.min(...data.map(d => d.low));
        const priceMax = Math.max(...data.map(d => d.high));
        const priceRange = priceMax - priceMin;
        
        const normalize = (value: number | null): number | null => {
          if (value === null) return null;
          return priceMin + (value / 100) * priceRange * 0.3; // Scale to 30% of price range
        };
        
        // cRSI line
        const crsiData = result.crsi.map((v, i) => [i, normalize(v)]);
        series.push({
          name: 'cRSI',
          type: 'line',
          data: crsiData,
          symbol: 'none',
          lineStyle: {
            color: '#FF00FF',
            width: 2
          },
          yAxisIndex: 1,
          z: 15
        });
        
        // Upper band
        const upperData = result.upperBand.map((v, i) => [i, normalize(v)]);
        series.push({
          name: 'cRSI Upper',
          type: 'line',
          data: upperData,
          symbol: 'none',
          lineStyle: {
            color: '#00BCD4',
            width: 1,
            type: 'solid'
          },
          yAxisIndex: 1,
          z: 14
        });
        
        // Lower band
        const lowerData = result.lowerBand.map((v, i) => [i, normalize(v)]);
        series.push({
          name: 'cRSI Lower',
          type: 'line',
          data: lowerData,
          symbol: 'none',
          lineStyle: {
            color: '#00BCD4',
            width: 1,
            type: 'solid'
          },
          yAxisIndex: 1,
          z: 14
        });
        
        // Fill between bands
        series.push({
          name: 'cRSI Band Fill',
          type: 'line',
          data: upperData,
          areaStyle: {
            color: 'rgba(128, 128, 128, 0.1)',
            origin: 'start'
          },
          lineStyle: { width: 0 },
          symbol: 'none',
          yAxisIndex: 1,
          z: 13
        });
        
        // Reference lines (30 and 70)
        const ref30 = data.map((_, i) => [i, normalize(30)]);
        const ref70 = data.map((_, i) => [i, normalize(70)]);
        
        series.push({
          name: 'cRSI 30',
          type: 'line',
          data: ref30,
          symbol: 'none',
          lineStyle: {
            color: '#C0C0C0',
            width: 1,
            type: 'dashed'
          },
          yAxisIndex: 1,
          z: 12
        });
        
        series.push({
          name: 'cRSI 70',
          type: 'line',
          data: ref70,
          symbol: 'none',
          lineStyle: {
            color: '#C0C0C0',
            width: 1,
            type: 'dashed'
          },
          yAxisIndex: 1,
          z: 12
        });
        
        // Draw signals
        signals.forEach((signal, idx) => {
          const isBullish = signal.type === 'crossunder_lower';
          const color = isBullish ? '#00BCD4' : '#FF00FF';
          const symbol = isBullish ? 'triangle' : 'triangle';
          const rotation = isBullish ? 0 : 180;
          
          series.push({
            name: `cRSI Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, data[signal.index][isBullish ? 'low' : 'high']]],
            symbol: symbol,
            symbolRotate: rotation,
            symbolSize: 10,
            itemStyle: {
              color: color,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            z: 30
          });
        });
        
        // Info badge
        const badgeX = dates[Math.floor(data.length * 0.92)];
        const badgeY = priceMax * 0.98;
        
        series.push({
          name: 'cRSI Info',
          type: 'scatter',
          data: [[badgeX, badgeY]],
          symbol: 'roundRect',
          symbolSize: [120, 55],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#FF00FF',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📈 cRSI\nCycle: ${config.dominantCycle}\nVib: ${config.vibration}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Cyclic RSI] Error:', error);
      }
    }
// === ChronoPulse MS-MACD Resonance ===
    if ((indicators as any).chronoPulse) {
      try {
        const config = { ...defaultChronoPulseConfig, ...(indicators as any).chronoPulse };
        const result = calculateChronoPulse(data, config);
        
        series.push({
          name: 'Directional EMA',
          type: 'line',
          data: result.directionalEma.map((v, i) => [i, v]),
          symbol: 'none',
          lineStyle: { color: '#FF9800', width: 2 },
          z: 10
        });
        
        series.push({
          name: 'Trend Guide',
          type: 'line',
          data: result.trendGuide.map((v, i) => [i, v]),
          symbol: 'none',
          lineStyle: { color: '#2196F3', width: 1, type: 'dashed' },
          z: 9
        });
        
        result.structureEvents.forEach((event, idx) => {
          const colors = {
            choch_bull: '#4CAF50',
            choch_bear: '#F44336',
            bos_bull: '#009688',
            bos_bear: '#D32F2F'
          };
          const labels = {
            choch_bull: 'CHOCH↑',
            choch_bear: 'CHOCH↓',
            bos_bull: 'BOS↑',
            bos_bear: 'BOS↓'
          };
          const isBull = event.type.includes('bull');
          
          series.push({
            name: `Structure ${idx}`,
            type: 'scatter',
            data: [[event.index, event.price]],
            symbol: isBull ? 'triangle' : 'triangle',
            symbolRotate: isBull ? 0 : 180,
            symbolSize: 12,
            itemStyle: {
              color: colors[event.type],
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: labels[event.type],
              position: isBull ? 'bottom' : 'top',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 'bold',
              backgroundColor: colors[event.type],
              padding: [2, 4],
              borderRadius: 2
            },
            z: 30
          });
        });
        
        result.signals.forEach((signal, idx) => {
          const color = signal.type === 'long' ? '#00E676' : '#FF5252';
          const isLong = signal.type === 'long';
          
          series.push({
            name: `Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'diamond',
            symbolSize: 15,
            itemStyle: {
              color: color,
              borderColor: '#ffffff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `${isLong ? 'LONG' : 'SHORT'}\nQ:${(signal.qualityScore * 100).toFixed(0)}%`,
              position: isLong ? 'bottom' : 'top',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 'bold',
              backgroundColor: color,
              padding: [3, 5],
              borderRadius: 3
            },
            z: 35
          });
          
          series.push({
            name: `Stop ${idx}`,
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#F44336', width: 1, type: 'dashed' },
              data: [[
                { xAxis: signal.index, yAxis: signal.stop },
                { xAxis: Math.min(signal.index + 20, data.length - 1), yAxis: signal.stop }
              ]]
            }
          });
          
          series.push({
            name: `Target ${idx}`,
            type: 'line',
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#4CAF50', width: 1, type: 'dashed' },
              data: [[
                { xAxis: signal.index, yAxis: signal.target },
                { xAxis: Math.min(signal.index + 20, data.length - 1), yAxis: signal.target }
              ]]
            }
          });
        });
        
        const badgeX = dates[Math.floor(data.length * 0.08)];
        const badgeY = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.02;
        const lastBias = result.structureBias[result.structureBias.length - 1];
        const biasText = lastBias === 1 ? 'Bull' : lastBias === -1 ? 'Bear' : 'Neutral';
        const lastQuality = result.qualityScore[result.qualityScore.length - 1];
        
        series.push({
          name: 'ChronoPulse Info',
          type: 'scatter',
          data: [[badgeX, badgeY]],
          symbol: 'roundRect',
          symbolSize: [130, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#0095FF',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `⚡ ChronoPulse\nBias: ${biasText}\nQ: ${((lastQuality ?? 0) * 100).toFixed(0)}%`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[ChronoPulse] Error:', error);
      }
    }

    // === Luxy Super-Duper SuperTrend ===
    if ((indicators as any).luxySuperTrend) {
      try {
        const config = { ...defaultLuxySuperTrendConfig, ...(indicators as any).luxySuperTrend };
        const result = calculateLuxySuperTrend(data, config);
        
        series.push({
          name: 'SuperTrend',
          type: 'line',
          data: result.supertrend.map((v, i) => [i, v]),
          symbol: 'none',
          lineStyle: { color: '#FF9800', width: 2 },
          z: 10
        });
        
        result.ribbonLayers.forEach((layer, idx) => {
          const opacity = 85 - (idx * 4);
          series.push({
            name: `Ribbon ${idx}`,
            type: 'line',
            data: layer.map((v, i) => [i, v]),
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: `rgba(76, 175, 80, ${opacity / 100})` },
                  { offset: 1, color: `rgba(244, 67, 54, ${opacity / 100})` }
                ]
              },
              opacity: opacity / 100
            },
            z: 5 - idx
          });
        });
        
        result.signals.forEach((signal, idx) => {
          const color = signal.type === 'long' ? '#4CAF50' : '#F44336';
          const isLong = signal.type === 'long';
          
          series.push({
            name: `Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: isLong ? 'triangle' : 'triangle',
            symbolRotate: isLong ? 0 : 180,
            symbolSize: 15,
            itemStyle: {
              color: color,
              borderColor: '#ffffff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `${isLong ? 'BUY' : 'SELL'}\nQ:${signal.qualityScore}`,
              position: isLong ? 'bottom' : 'top',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 'bold',
              backgroundColor: color,
              padding: [3, 5],
              borderRadius: 3
            },
            z: 30
          });
        });
        
        result.predictions.forEach((pred, idx) => {
          const baseY = data[pred.startIndex].low;
          const boxHeight = (data.reduce((max, d) => Math.max(max, d.high), 0) - baseY) * 0.05;
          
          for (let i = 0; i < 30; i++) {
            const boxLeft = pred.startIndex + (i * pred.predictedEnd / 30);
            const boxRight = pred.startIndex + ((i + 1) * pred.predictedEnd / 30);
            const opacity = 5 + (i / 29) * 90;
            
            series.push({
              name: `Pred Box ${idx}-${i}`,
              type: 'custom',
              renderItem: (params: any, api: any) => ({
                type: 'rect',
                shape: {
                  x: api.coord([boxLeft, baseY])[0],
                  y: api.coord([boxLeft, baseY + boxHeight])[1],
                  width: api.coord([boxRight, baseY])[0] - api.coord([boxLeft, baseY])[0],
                  height: api.coord([boxLeft, baseY])[1] - api.coord([boxLeft, baseY + boxHeight])[1]
                },
                style: { fill: `rgba(76, 175, 80, ${opacity / 100})` }
              }),
              data: [[boxLeft, baseY]],
              z: 8
            });
          }
          
          pred.milestones.forEach((milestone, mIdx) => {
            series.push({
              name: `Milestone ${idx}-${mIdx}`,
              type: 'scatter',
              data: [[milestone.bar, baseY - boxHeight * 0.5]],
              symbol: 'none',
              label: {
                show: true,
                formatter: `${milestone.probability}%`,
                position: 'bottom',
                color: '#000000',
                fontSize: 8,
                fontWeight: 'bold'
              },
              z: 25
            });
          });
        });
        
        const badgeX2 = dates[Math.floor(data.length * 0.08)];
        const badgeY2 = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.02;
        const lastQuality2 = result.qualityScore[result.qualityScore.length - 1];
        const lastDir = result.direction[result.direction.length - 1];
        
        series.push({
          name: 'Luxy Info',
          type: 'scatter',
          data: [[badgeX2, badgeY2]],
          symbol: 'roundRect',
          symbolSize: [130, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#FF9800',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🔸 Luxy SuperTrend\nDir: ${lastDir === 1 ? 'Bull' : 'Bear'}\nQ: ${lastQuality2}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Luxy SuperTrend] Error:', error);
      }
    }

    // === Support/Resistance Polynomial Regression ===
    if ((indicators as any).supportResistanceRegression) {
      try {
        const config = { ...defaultSupportResistanceConfig, ...(indicators as any).supportResistanceRegression };
        const result = calculateSupportResistance(data, config);
        
        if (result.resistanceLine) {
          const forecastData = result.resistanceLine.forecast.map(f => [f.index, f.value]);
          series.push({
            name: 'Resistance',
            type: 'line',
            data: forecastData,
            symbol: 'none',
            lineStyle: { color: '#F44336', width: 2 },
            z: 12
          });
        }
        
        if (result.supportLine) {
          const forecastData = result.supportLine.forecast.map(f => [f.index, f.value]);
          series.push({
            name: 'Support',
            type: 'line',
            data: forecastData,
            symbol: 'none',
            lineStyle: { color: '#4CAF50', width: 2 },
            z: 12
          });
        }
        
        if (result.centerLine) {
          const centerData = result.centerLine.map(c => [c.index, c.value]);
          series.push({
            name: 'Center',
            type: 'line',
            data: centerData,
            symbol: 'none',
            lineStyle: { color: 'rgba(255, 255, 255, 0.3)', width: 1, type: 'dashed' },
            z: 11
          });
        }
        
        result.resistancePivots.forEach((pivot, idx) => {
          series.push({
            name: `Res Pivot ${idx}`,
            type: 'scatter',
            data: [[pivot.index, pivot.price]],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
              color: '#F44336',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            z: 20
          });
        });
        
        result.supportPivots.forEach((pivot, idx) => {
          series.push({
            name: `Sup Pivot ${idx}`,
            type: 'scatter',
            data: [[pivot.index, pivot.price]],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
              color: '#4CAF50',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            z: 20
          });
        });
        
        result.breakTests.forEach((bt, idx) => {
          const isBreak = bt.type === 'break';
          const isResistance = bt.level === 'resistance';
          const color = isBreak ? '#2196F3' : (isResistance ? '#F44336' : '#4CAF50');
          const text = isBreak ? 'B' : 'R';
          
          series.push({
            name: `BT ${idx}`,
            type: 'scatter',
            data: [[bt.index, bt.price]],
            symbol: isBreak ? 'diamond' : (isResistance ? 'triangleDown' : 'triangle'),
            symbolSize: 10,
            itemStyle: {
              color: color,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: text,
              position: isResistance ? 'top' : 'bottom',
              color: '#ffffff',
              fontSize: 8,
              fontWeight: 'bold',
              backgroundColor: color,
              padding: [2, 4],
              borderRadius: 2
            },
            z: 25
          });
        });
        
        const badgeX3 = dates[Math.floor(data.length * 0.08)];
        const badgeY3 = data.reduce((max, d) => Math.max(max, d.high), 0) * 1.02;
        
        series.push({
          name: 'S/R Info',
          type: 'scatter',
          data: [[badgeX3, badgeY3]],
          symbol: 'roundRect',
          symbolSize: [130, 60],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#673AB7',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 S/R Regression\nSup: ${result.supportPivots.length}\nRes: ${result.resistancePivots.length}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 13
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[S/R Regression] Error:', error);
      }
    }

    // === LINEAR REGRESSION CHANNEL SCREENER ===
    if ((indicators as any).linearRegressionChannel) {
      try {
        const config = { ...defaultLRCConfig, ...(indicators as any).linearRegressionChannel };
        const result = calculateLinearRegressionChannel(data, config);
        
        if (!isNaN(result.lines.middleEnd)) {
          const trendColor = result.trend === 'bullish' ? config.colors.upTrend : 
                            result.trend === 'bearish' ? config.colors.downTrend : config.colors.neutral;
          
          // Upper channel line (dashed)
          series.push({
            name: 'LRC Upper',
            type: 'line',
            data: [
              [result.lines.startIndex, result.lines.upperStart],
              [result.lines.endIndex, result.lines.upperEnd]
            ],
            symbol: 'none',
            lineStyle: {
              color: trendColor,
              width: config.lineWidth,
              type: 'dashed'
            },
            z: 15
          });
          
          // Middle regression line (solid)
          series.push({
            name: 'LRC Middle',
            type: 'line',
            data: [
              [result.lines.startIndex, result.lines.middleStart],
              [result.lines.endIndex, result.lines.middleEnd]
            ],
            symbol: 'none',
            lineStyle: {
              color: trendColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // Lower channel line (dashed)
          series.push({
            name: 'LRC Lower',
            type: 'line',
            data: [
              [result.lines.startIndex, result.lines.lowerStart],
              [result.lines.endIndex, result.lines.lowerEnd]
            ],
            symbol: 'none',
            lineStyle: {
              color: trendColor,
              width: config.lineWidth,
              type: 'dashed'
            },
            z: 15
          });
          
          // Fill area between upper and lower
          series.push({
            name: 'LRC Fill',
            type: 'line',
            markArea: {
              silent: true,
              itemStyle: {
                color: `${trendColor}15`
              },
              data: [[
                { xAxis: result.lines.startIndex, yAxis: result.lines.lowerStart },
                { xAxis: result.lines.endIndex, yAxis: result.lines.upperEnd }
              ]]
            }
          });
          
          // Trend direction label
          const labelY = result.trend === 'bullish' ? result.lines.lowerStart : 
                        result.trend === 'bearish' ? result.lines.upperStart : result.lines.middleStart;
          
          series.push({
            name: 'LRC Direction',
            type: 'scatter',
            data: [[result.lines.startIndex, labelY]],
            symbol: 'roundRect',
            symbolSize: [30, 25],
            itemStyle: {
              color: trendColor
            },
            label: {
              show: true,
              formatter: result.trendDirection,
              position: 'inside',
              fontSize: 16,
              color: '#ffffff',
              fontWeight: 'bold'
            },
            z: 25
          });
          
          // Draw signals
          result.signals.forEach((signal, idx) => {
            const isBullish = signal.type === 'bullish' || signal.type === 'broken_up';
            const signalColor = isBullish ? config.colors.upTrend : config.colors.downTrend;
            const signalLabel = signal.type === 'bullish' ? '⇑ Bullish' : 
                               signal.type === 'bearish' ? '⇓ Bearish' :
                               signal.type === 'broken_up' ? '↑ Break' : '↓ Break';
            
            series.push({
              name: `LRC Signal ${idx}`,
              type: 'scatter',
              data: [[signal.index, signal.price]],
              symbol: isBullish ? 'triangle' : 'triangle',
              symbolRotate: isBullish ? 0 : 180,
              symbolSize: 14,
              itemStyle: {
                color: signalColor,
                borderColor: '#ffffff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: signalLabel,
                position: isBullish ? 'bottom' : 'top',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 'bold',
                backgroundColor: signalColor,
                padding: [2, 4],
                borderRadius: 3
              },
              z: 30
            });
          });
          
          // Stats badge
          const statsX = data.length - 5;
          const statsY = yRange.max !== null ? yRange.max * 0.42 : data[data.length - 1].high * 1.02;
          
          series.push({
            name: 'LRC Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [140, 90],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.95)',
              borderColor: trendColor,
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `📈 Linear Regression\nTrend: ${result.trend === 'bullish' ? 'Bullish' : result.trend === 'bearish' ? 'Bearish' : 'Neutral'} ${result.trendDirection}\nStrength: ${result.trendStrength}\nPosition: ${result.pricePosition === 'above' ? 'Above' : result.pricePosition === 'below' ? 'Below' : 'Middle'}\nStatus: ${result.channelStatus === 'inside' ? 'Inside' : result.channelStatus === 'broken_above' ? 'Break ↑' : 'Break ↓'}`,
              position: 'inside',
              fontSize: 9,
              color: '#e2e8f0',
              lineHeight: 13
            },
            z: 120
          });
        }
        
      } catch (error) {
        console.error('[Linear Regression Channel] Error:', error);
      }
    }

    // === FIBONACCI PROJECTION WITH VOLUME & DELTA PROFILE ===
    if ((indicators as any).fibonacciProjection) {
      try {
        const config = { ...defaultFibProjectionConfig, ...(indicators as any).fibonacciProjection };
        const result = calculateFibonacciProjection(data, config);
        
        if (result.swingHigh && result.swingLow) {
          // Draw Swing High line
          series.push({
            name: 'Swing High',
            type: 'line',
            data: [
              [result.swingHigh.index, result.swingHigh.price],
              [data.length - 1, result.swingHigh.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: config.colors.swingHigh,
              width: config.swingLineWidth,
              type: 'solid'
            },
            z: 12
          });
          
          // Draw Swing Low line
          series.push({
            name: 'Swing Low',
            type: 'line',
            data: [
              [result.swingLow.index, result.swingLow.price],
              [data.length - 1, result.swingLow.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: config.colors.swingLow,
              width: config.swingLineWidth,
              type: 'solid'
            },
            z: 12
          });
          
          // Draw Fibonacci retracement levels
          const baseOffset = Math.min(result.swingHigh.barsSince, result.swingLow.barsSince);
          const xFibStart = data.length - 1 - baseOffset;
          
          result.fibLevels.forEach((fib, idx) => {
            // Fib line
            series.push({
              name: `Fib ${fib.label}`,
              type: 'line',
              data: [
                [xFibStart, fib.price],
                [data.length - 1, fib.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: fib.color,
                width: config.fibLineWidth,
                type: 'solid'
              },
              z: 11
            });
            
            // Fib label
            if (config.showFibLabels) {
              series.push({
                name: `Fib Label ${fib.label}`,
                type: 'scatter',
                data: [[data.length + 1, fib.price]],
                symbol: 'roundRect',
                symbolSize: [45, 16],
                itemStyle: {
                  color: fib.color
                },
                label: {
                  show: true,
                  formatter: fib.label,
                  position: 'inside',
                  fontSize: 10,
                  color: '#ffffff',
                  fontWeight: 'bold'
                },
                z: 25
              });
            }
          });
          
          // Draw projection segments
          result.projectionSegments.forEach((seg, idx) => {
            const lineColor = seg.isBullish ? config.colors.projectionBull : config.colors.projectionBear;
            
            // Projection line
            series.push({
              name: `Projection ${idx}`,
              type: 'line',
              data: [
                [seg.startIndex, seg.startPrice],
                [seg.endIndex, seg.endPrice]
              ],
              symbol: ['none', 'arrow'],
              symbolSize: 8,
              lineStyle: {
                color: lineColor,
                width: config.projectionLineWidth,
                type: 'dashed'
              },
              z: 20
            });
            
            // Projection box at end point
            const boxWidth = Math.abs(seg.endIndex - seg.startIndex) / 4;
            const boxHeight = Math.abs(seg.endPrice - seg.startPrice) / 10;
            
            series.push({
              name: `Proj Box ${idx}`,
              type: 'scatter',
              data: [[seg.endIndex, seg.endPrice]],
              symbol: 'roundRect',
              symbolSize: [50, 20],
              itemStyle: {
                color: config.showBoxBackground ? config.colors.boxBackground : 'transparent',
                borderColor: config.showBoxBorder ? config.colors.boxBorder : 'transparent',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: seg.levelLabel,
                position: 'inside',
                fontSize: 10,
                color: '#ffffff',
                fontWeight: 'bold'
              },
              z: 22
            });
            
            // Percentage label at midpoint
            const midX = Math.floor((seg.startIndex + seg.endIndex) / 2);
            const midY = (seg.startPrice + seg.endPrice) / 2;
            const percText = `${(seg.percentChange * 100).toFixed(1)}%`;
            
            series.push({
              name: `Proj Perc ${idx}`,
              type: 'scatter',
              data: [[midX, midY]],
              symbol: 'roundRect',
              symbolSize: [50, 18],
              itemStyle: {
                color: seg.isBullish ? config.colors.projectionBull : config.colors.projectionBear
              },
              label: {
                show: true,
                formatter: percText,
                position: 'inside',
                fontSize: 9,
                color: '#ffffff',
                fontWeight: 'bold'
              },
              z: 23
            });
          });
          
          // Draw Volume Profile
          if (config.showFibProfile && result.volumeProfile.length > 0) {
            const startBar = Math.min(result.swingHigh.index, result.swingLow.index);
            
            result.volumeProfile.forEach((row, idx) => {
              const bullColor = `rgba(0, 128, 128, ${0.3 + (0.5 * idx / result.volumeProfile.length)})`;
              const bearColor = `rgba(255, 165, 0, ${0.3 + (0.5 * idx / result.volumeProfile.length)})`;
              
              // Bull volume bar
              if (row.normalizedBullWidth > 0) {
                const leftBull = config.flipBullBear ? startBar : startBar + row.normalizedBearWidth;
                const rightBull = config.flipBullBear ? startBar + row.normalizedBullWidth : startBar + row.normalizedBearWidth + row.normalizedBullWidth;
                
                series.push({
                  name: `Vol Bull ${idx}`,
                  type: 'line',
                  markArea: {
                    silent: true,
                    itemStyle: {
                      color: bullColor,
                      borderColor: bullColor,
                      borderWidth: 1,
                      borderType: 'dotted'
                    },
                    data: [[
                      { xAxis: leftBull, yAxis: row.bottom },
                      { xAxis: rightBull, yAxis: row.top }
                    ]]
                  }
                });
              }
              
              // Bear volume bar
              if (row.normalizedBearWidth > 0) {
                const leftBear = config.flipBullBear ? startBar + row.normalizedBullWidth : startBar;
                const rightBear = config.flipBullBear ? startBar + row.normalizedBullWidth + row.normalizedBearWidth : startBar + row.normalizedBearWidth;
                
                series.push({
                  name: `Vol Bear ${idx}`,
                  type: 'line',
                  markArea: {
                    silent: true,
                    itemStyle: {
                      color: bearColor,
                      borderColor: bearColor,
                      borderWidth: 1,
                      borderType: 'dotted'
                    },
                    data: [[
                      { xAxis: leftBear, yAxis: row.bottom },
                      { xAxis: rightBear, yAxis: row.top }
                    ]]
                  }
                });
              }
            });
          }
          
          // Draw Volume Delta Profile
          if (config.showFibDelta && result.volumeDelta.length > 0) {
            const startBar = Math.min(result.swingHigh.index, result.swingLow.index);
            
            result.volumeDelta.forEach((band, idx) => {
              const color = band.isBullish ? config.colors.deltaBull : config.colors.deltaBear;
              const xEnd = startBar;
              const xStart = startBar - band.normalizedWidth;
              
              series.push({
                name: `Delta ${idx}`,
                type: 'line',
                markArea: {
                  silent: true,
                  itemStyle: {
                    color: color,
                    borderColor: color.replace('0.2', '0.8'),
                    borderWidth: 1
                  },
                  data: [[
                    { xAxis: xStart, yAxis: band.bottom },
                    { xAxis: xEnd, yAxis: band.top }
                  ]]
                }
              });
              
              // Delta label
              series.push({
                name: `Delta Label ${idx}`,
                type: 'scatter',
                data: [[(xStart + xEnd) / 2, (band.top + band.bottom) / 2]],
                symbol: 'rect',
                symbolSize: 1,
                label: {
                  show: true,
                  formatter: `Δ ${formatVolume(Math.abs(band.delta))}`,
                  position: 'inside',
                  fontSize: 8,
                  color: '#ffffff'
                },
                z: 15
              });
            });
          }
          
          // Stats badge
          const statsX = data.length - 5;
          const statsY = yRange.max !== null ? yRange.max * 0.36 : data[data.length - 1].high * 1.02;
          
          const projTarget = result.projectionTargets.trendFib;
          const currentPrice = data[data.length - 1].close;
          const distToTarget = ((projTarget - currentPrice) / currentPrice * 100).toFixed(1);
          
          series.push({
            name: 'Fib Projection Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [150, 100],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.95)',
              borderColor: result.trend === 'bullish' ? '#00ff00' : '#ff0000',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `📊 Fib Projection\nTrend: ${result.trend === 'bullish' ? '▲ Bullish' : '▼ Bearish'}\nSwing H: ${result.swingHigh.price.toFixed(2)}\nSwing L: ${result.swingLow.price.toFixed(2)}\nTarget 127.2%: ${projTarget.toFixed(2)}\nDist: ${distToTarget}%`,
              position: 'inside',
              fontSize: 9,
              color: '#e2e8f0',
              lineHeight: 13
            },
            z: 120
          });
        }
        
      } catch (error) {
        console.error('[Fibonacci Projection] Error:', error);
      }
    }

    // === XABCD FORMATION (TraderDemircan) ===
    if ((indicators as any).xabcdFormation) {
      try {
        const config = { ...defaultXABCDConfig, ...(indicators as any).xabcdFormation };
        const result = calculateXABCDFormation(data, config);
        
        if (result.isValidFormation && result.xPoint && result.aPoint && result.bPoint && result.cPoint) {
          // Draw Fibonacci retracement levels
          const fibStartX = result.xPoint.index;
          
          result.fibLevels.forEach((fib, idx) => {
            if (fib.show) {
              // Fib horizontal line
              series.push({
                name: `XABCD Fib ${fib.label}`,
                type: 'line',
                data: [
                  [fibStartX, fib.price],
                  [data.length - 1, fib.price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: fib.color,
                  width: config.lineWidth,
                  type: config.lineStyle
                },
                z: 10
              });
              
              // Price label on right
              if (config.showLabels) {
                series.push({
                  name: `XABCD Price ${fib.label}`,
                  type: 'scatter',
                  data: [[data.length + 2, fib.price]],
                  symbol: 'roundRect',
                  symbolSize: [55, 16],
                  itemStyle: {
                    color: fib.color + '20',
                    borderColor: fib.color,
                    borderWidth: 1
                  },
                  label: {
                    show: true,
                    formatter: formatXABCDPrice(fib.price),
                    position: 'inside',
                    fontSize: 9,
                    color: fib.color
                  },
                  z: 20
                });
              }
              
              // Percent label on left
              if (config.showPercent) {
                series.push({
                  name: `XABCD Perc ${fib.label}`,
                  type: 'scatter',
                  data: [[fibStartX - 2, fib.price]],
                  symbol: 'roundRect',
                  symbolSize: [60, 16],
                  itemStyle: {
                    color: fib.color + '20',
                    borderColor: fib.color,
                    borderWidth: 1
                  },
                  label: {
                    show: true,
                    formatter: fib.label,
                    position: 'inside',
                    fontSize: 9,
                    color: fib.color
                  },
                  z: 20
                });
              }
            }
          });
          
          // Draw XABC formation lines
          if (config.showXABC) {
            result.xabcLines.forEach((line, idx) => {
              series.push({
                name: `XABCD Line ${idx}`,
                type: 'line',
                data: [
                  [line.startIndex, line.startPrice],
                  [line.endIndex, line.endPrice]
                ],
                symbol: 'none',
                lineStyle: {
                  color: line.color,
                  width: line.width,
                  type: line.style
                },
                z: 15
              });
            });
            
            // Draw X point label
            series.push({
              name: 'X Point',
              type: 'scatter',
              data: [[result.xPoint.index, result.xPoint.price]],
              symbol: 'circle',
              symbolSize: 20,
              itemStyle: {
                color: result.xPoint.color,
                borderColor: '#ffffff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: 'X',
                position: 'top',
                fontSize: 12,
                color: '#ffffff',
                fontWeight: 'bold',
                backgroundColor: result.xPoint.color,
                padding: [2, 6],
                borderRadius: 3
              },
              z: 30
            });
            
            // Draw A point label
            series.push({
              name: 'A Point',
              type: 'scatter',
              data: [[result.aPoint.index, result.aPoint.price]],
              symbol: 'circle',
              symbolSize: 20,
              itemStyle: {
                color: result.aPoint.color,
                borderColor: '#ffffff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: 'A',
                position: 'bottom',
                fontSize: 12,
                color: '#ffffff',
                fontWeight: 'bold',
                backgroundColor: result.aPoint.color,
                padding: [2, 6],
                borderRadius: 3
              },
              z: 30
            });
            
            // Draw B point label
            series.push({
              name: 'B Point',
              type: 'scatter',
              data: [[result.bPoint.index, result.bPoint.price]],
              symbol: 'circle',
              symbolSize: 20,
              itemStyle: {
                color: result.bPoint.color,
                borderColor: '#ffffff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: `B (${result.bLevelText})`,
                position: 'top',
                fontSize: 10,
                color: '#ffffff',
                fontWeight: 'bold',
                backgroundColor: result.bPoint.color,
                padding: [2, 6],
                borderRadius: 3
              },
              z: 30
            });
            
            // Draw C target point and label
            if (config.showCTarget && result.cPoint) {
              series.push({
                name: 'C Target Point',
                type: 'scatter',
                data: [[result.cPoint.index, result.cPoint.price]],
                symbol: 'diamond',
                symbolSize: 25,
                itemStyle: {
                  color: result.cPoint.color,
                  borderColor: '#ffffff',
                  borderWidth: 2
                },
                label: {
                  show: true,
                  formatter: `C Target\n${formatXABCDPrice(result.cPoint.price)}`,
                  position: 'bottom',
                  fontSize: 10,
                  color: '#ffffff',
                  fontWeight: 'bold',
                  backgroundColor: result.cPoint.color,
                  padding: [3, 6],
                  borderRadius: 3,
                  lineHeight: 14
                },
                z: 30
              });
              
              // C target horizontal line
              series.push({
                name: 'C Target Line',
                type: 'line',
                data: [
                  [result.cPoint.index, result.cPoint.price],
                  [result.cPoint.index + 10, result.cPoint.price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: result.cPoint.color,
                  width: config.lineWidth,
                  type: 'dashed'
                },
                z: 14
              });
            }
          }
          
          // Stats badge / Info table
          const statsX = data.length - 5;
          const statsY = yRange.max !== null ? yRange.max * 0.30 : data[data.length - 1].high * 1.02;
          
          const currentPrice = data[data.length - 1].close;
          const targetInfo = calculateTargetDistance(currentPrice, result.cPoint?.price || 0);
          
          series.push({
            name: 'XABCD Stats',
            type: 'scatter',
            data: [[statsX, statsY]],
            symbol: 'roundRect',
            symbolSize: [140, 110],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.95)',
              borderColor: config.colors.xabcLine,
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: `📐 XABCD ↓\nX (1.0): ${formatXABCDPrice(result.xPoint.price)}\nA (0.0): ${formatXABCDPrice(result.aPoint.price)}\nB (${result.bLevelText}): ${formatXABCDPrice(result.bPoint.price)}\nC Target: ${formatXABCDPrice(result.cPoint?.price || 0)}\nDist: ${targetInfo.percentage.toFixed(1)}%`,
              position: 'inside',
              fontSize: 9,
              color: '#e2e8f0',
              lineHeight: 13
            },
            z: 120
          });
        }
        
      } catch (error) {
        console.error('[XABCD Formation] Error:', error);
      }
    }

    // === LIQUIDATION REVERSAL SIGNALS [AlgoAlpha] ===
    if ((indicators as any).liquidationReversal) {
      try {
        const config = { ...defaultLiquidationReversalConfig, ...(indicators as any).liquidationReversal };
        const result = calculateLiquidationReversal(data, config);
        
        // Draw Supertrend lines based on plot trend
        if (result.supertrend.length > 0) {
          // Bullish trend line (when plotTrend === -1)
          const bullishTrendData: [number, number][] = [];
          // Bearish trend line (when plotTrend === 1)
          const bearishTrendData: [number, number][] = [];
          
          let currentPlotTrend = 0;
          let lastLiqDir = 0;
          let lastLiqIndex = 0;
          let valid = 0;
          
          for (let i = 0; i < result.supertrend.length; i++) {
            const st = result.supertrend[i];
            if (isNaN(st.value)) continue;
            
            const prevDirection = i > 0 ? result.supertrend[i - 1].direction : st.direction;
            const directionCrossed = i > 0 && st.direction !== prevDirection;
            
            if (directionCrossed) {
              currentPlotTrend = 0;
            }
            
            // Check for short liquidation
            if (result.shortLiquidations.some(l => l.index === i)) {
              lastLiqDir = -1;
              lastLiqIndex = i;
              valid = 1;
            }
            // Check for long liquidation
            if (result.longLiquidations.some(l => l.index === i)) {
              lastLiqDir = 1;
              lastLiqIndex = i;
              valid = 1;
            }
            
            if (directionCrossed && st.direction > 0 && prevDirection < 0) {
              if (lastLiqDir === 1 && valid === 1) {
                if (config.timeoutBars === 0 || i - lastLiqIndex < config.timeoutBars) {
                  currentPlotTrend = 1;
                }
              }
              valid = 0;
            }
            
            if (directionCrossed && st.direction < 0 && prevDirection > 0) {
              if (lastLiqDir === -1 && valid === 1) {
                if (config.timeoutBars === 0 || i - lastLiqIndex < config.timeoutBars) {
                  currentPlotTrend = -1;
                }
              }
              valid = 0;
            }
            
            if (currentPlotTrend === -1) {
              bullishTrendData.push([i, st.value]);
            } else if (currentPlotTrend === 1) {
              bearishTrendData.push([i, st.value]);
            }
          }
          
          // Draw bullish supertrend (when visible after short liquidation reversal)
          if (bullishTrendData.length > 0) {
            series.push({
              name: 'Liquidation Bullish ST',
              type: 'line',
              data: bullishTrendData,
              symbol: 'none',
              lineStyle: {
                color: config.colors.bearish,
                width: 2,
                type: 'solid'
              },
              areaStyle: {
                color: config.colors.bearish + '20',
                origin: 'start'
              },
              z: 8
            });
          }
          
          // Draw bearish supertrend (when visible after long liquidation reversal)
          if (bearishTrendData.length > 0) {
            series.push({
              name: 'Liquidation Bearish ST',
              type: 'line',
              data: bearishTrendData,
              symbol: 'none',
              lineStyle: {
                color: config.colors.bullish,
                width: 2,
                type: 'solid'
              },
              areaStyle: {
                color: config.colors.bullish + '20',
                origin: 'start'
              },
              z: 8
            });
          }
        }
        
        // Draw short liquidation dots (above candles)
        result.shortLiquidations.forEach((liq, idx) => {
          const color = getLiquidationColor('short', liq.transparency, config);
          series.push({
            name: `Short Liq ${idx}`,
            type: 'scatter',
            data: [[liq.index, liq.price]],
            symbol: 'circle',
            symbolSize: 10,
            itemStyle: {
              color: color
            },
            label: {
              show: false
            },
            z: 25
          });
        });
        
        // Draw long liquidation dots (below candles)
        result.longLiquidations.forEach((liq, idx) => {
          const color = getLiquidationColor('long', liq.transparency, config);
          series.push({
            name: `Long Liq ${idx}`,
            type: 'scatter',
            data: [[liq.index, liq.price]],
            symbol: 'circle',
            symbolSize: 10,
            itemStyle: {
              color: color
            },
            label: {
              show: false
            },
            z: 25
          });
        });
        
        // Draw reversal signals
        result.reversalSignals.forEach((signal, idx) => {
          const isBullish = signal.type === 'bullish';
          const color = isBullish ? config.colors.bearish : config.colors.bullish;
          const symbol = isBullish ? '▼' : '▲';
          
          series.push({
            name: `Reversal Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: isBullish ? 'triangle' : 'triangle',
            symbolRotate: isBullish ? 180 : 0,
            symbolSize: 16,
            itemStyle: {
              color: color + 'B0',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: symbol,
              position: isBullish ? 'top' : 'bottom',
              fontSize: 14,
              color: '#ffffff',
              fontWeight: 'bold'
            },
            z: 30
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.24 : data[data.length - 1].high * 1.02;
        
        const shortLiqCount = result.shortLiquidations.length;
        const longLiqCount = result.longLiquidations.length;
        const bullishSignals = result.reversalSignals.filter(s => s.type === 'bullish').length;
        const bearishSignals = result.reversalSignals.filter(s => s.type === 'bearish').length;
        
        let trendText = 'Neutral';
        if (result.currentTrend === 'bullish') trendText = '▲ Bullish';
        else if (result.currentTrend === 'bearish') trendText = '▼ Bearish';
        
        series.push({
          name: 'Liquidation Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 95],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: result.currentTrend === 'bullish' ? config.colors.bullish : 
                        result.currentTrend === 'bearish' ? config.colors.bearish : '#6b7280',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `💧 Liquidation Reversal\nTrend: ${trendText}\nShort Liq: ${shortLiqCount}\nLong Liq: ${longLiqCount}\n🟢 Bull Signals: ${bullishSignals}\n🔴 Bear Signals: ${bearishSignals}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
        // Warning badge if no volume
        if (result.noVolumeWarning) {
          series.push({
            name: 'No Volume Warning',
            type: 'scatter',
            data: [[data.length - 15, yRange.max !== null ? yRange.max * 0.95 : data[data.length - 1].high * 1.05]],
            symbol: 'roundRect',
            symbolSize: [80, 25],
            itemStyle: {
              color: config.colors.bearish,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: '⚠️ No Volume',
              position: 'inside',
              fontSize: 10,
              color: '#ffffff',
              fontWeight: 'bold'
            },
            z: 130
          });
        }
        
      } catch (error) {
        console.error('[Liquidation Reversal] Error:', error);
      }
    }

    // === WOLFE SCANNER [Trendoscope®] ===
    if ((indicators as any).wolfeScanner) {
      try {
        const config = { ...defaultWolfeScannerConfig, ...(indicators as any).wolfeScanner };
        const result = calculateWolfeScanner(data, config);
        
        // Draw each Wolfe Wave pattern
        result.patterns.forEach((pattern, patternIdx) => {
          const isBullish = pattern.direction === 'bullish';
          const patternColor = pattern.color;
          
          // Draw zigzag lines connecting 5 points (if drawZigzag is enabled)
          if (config.drawZigzag) {
            // Line 1-2
            series.push({
              name: `Wolfe ZZ 1-2 ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.point1.index, pattern.point1.price],
                [pattern.point2.index, pattern.point2.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dotted'
              },
              z: 15
            });
            
            // Line 2-3
            series.push({
              name: `Wolfe ZZ 2-3 ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.point2.index, pattern.point2.price],
                [pattern.point3.index, pattern.point3.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dotted'
              },
              z: 15
            });
            
            // Line 3-4
            series.push({
              name: `Wolfe ZZ 3-4 ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.point3.index, pattern.point3.price],
                [pattern.point4.index, pattern.point4.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dotted'
              },
              z: 15
            });
            
            // Line 4-5
            series.push({
              name: `Wolfe ZZ 4-5 ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.point4.index, pattern.point4.price],
                [pattern.point5.index, pattern.point5.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dotted'
              },
              z: 15
            });
          }
          
          // Draw upper wedge line (1-5)
          series.push({
            name: `Wolfe Upper ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.upperLine.startIndex, pattern.upperLine.startPrice],
              [pattern.upperLine.endIndex, pattern.upperLine.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 18
          });
          
          // Draw lower wedge line (2-4)
          series.push({
            name: `Wolfe Lower ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.lowerLine.startIndex, pattern.lowerLine.startPrice],
              [pattern.lowerLine.endIndex, pattern.lowerLine.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 18
          });
          
          // Draw projection line (1-4 extended to closing point) if enabled
          if (config.drawProjection) {
            series.push({
              name: `Wolfe Projection ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.projectionLine.startIndex, pattern.projectionLine.startPrice],
                [pattern.projectionLine.endIndex, pattern.projectionLine.endPrice]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dashed'
              },
              z: 17
            });
            
            // Vertical line at closing point (target connector)
            series.push({
              name: `Wolfe Target Line ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.closingIndex, pattern.closingPrice],
                [pattern.closingIndex, pattern.targetPrice]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dashed'
              },
              z: 17
            });
          }
          
          // Mark pivot points with labels
          const pivotPoints = [
            { label: '1', ...pattern.point1 },
            { label: '2', ...pattern.point2 },
            { label: '3', ...pattern.point3 },
            { label: '4', ...pattern.point4 },
            { label: '5', ...pattern.point5 }
          ];
          
          pivotPoints.forEach((pivot, idx) => {
            const isHigh = idx % 2 === 0 ? !isBullish : isBullish;
            series.push({
              name: `Wolfe Point ${pivot.label} ${patternIdx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: {
                color: patternColor,
                borderColor: '#ffffff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: pivot.label,
                position: isHigh ? 'top' : 'bottom',
                fontSize: 11,
                color: patternColor,
                fontWeight: 'bold',
                distance: 5
              },
              z: 25
            });
          });
          
          // Target marker
          if (config.drawProjection) {
            const targetSymbol = isBullish ? 'triangle' : 'triangle';
            const targetRotate = isBullish ? 0 : 180;
            
            series.push({
              name: `Wolfe Target ${patternIdx}`,
              type: 'scatter',
              data: [[pattern.closingIndex, pattern.targetPrice]],
              symbol: targetSymbol,
              symbolRotate: targetRotate,
              symbolSize: 14,
              itemStyle: {
                color: patternColor + 'CC',
                borderColor: '#ffffff',
                borderWidth: 2
              },
              label: {
                show: true,
                formatter: `T: ${pattern.targetPrice.toFixed(2)}`,
                position: isBullish ? 'top' : 'bottom',
                fontSize: 10,
                color: patternColor,
                fontWeight: 'bold',
                distance: 8,
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 3,
                padding: [2, 4]
              },
              z: 28
            });
          }
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.30 : data[data.length - 1].high * 1.05;
        
        const bullishPatterns = result.bullishCount;
        const bearishPatterns = result.bearishCount;
        const activeCount = result.activePatterns.length;
        
        const badgeBorderColor = bullishPatterns > bearishPatterns ? '#22c55e' : 
                                bearishPatterns > bullishPatterns ? '#ef4444' : '#6b7280';
        
        series.push({
          name: 'Wolfe Scanner Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 75],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: badgeBorderColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🐺 Wolfe Scanner\nPivots: ${result.pivots.length}\n🟢 Bullish: ${bullishPatterns}\n🔴 Bearish: ${bearishPatterns}\n⚡ Active: ${activeCount}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Wolfe Scanner] Error:', error);
      }
    }

    // === WEDGE AND FLAG FINDER (Multi-Zigzag) [Trendoscope®] ===
    if ((indicators as any).wedgeFlagMultiZigzag) {
      try {
        const config = { ...defaultWedgeFlagMultiZZConfig, ...(indicators as any).wedgeFlagMultiZigzag };
        const result = calculateWedgeFlagMultiZigzag(data, config);
        
        // Draw Wedge patterns
        result.wedges.forEach((wedge, wedgeIdx) => {
          const isBullish = wedge.direction === 'bullish';
          const patternColor = wedge.color;
          
          // Draw zigzag lines if enabled
          if (config.drawZigzag) {
            const points = [
              wedge.pivots.a,
              wedge.pivots.b,
              wedge.pivots.c,
              wedge.pivots.d,
              wedge.pivots.e
            ];
            if (wedge.pivots.f) {
              points.push(wedge.pivots.f);
            }
            
            // Sort by index
            points.sort((a, b) => a.index - b.index);
            
            // Draw zigzag connecting lines
            for (let i = 0; i < points.length - 1; i++) {
              series.push({
                name: `Wedge ZZ ${wedgeIdx}-${i}`,
                type: 'line',
                data: [
                  [points[i].index, points[i].price],
                  [points[i + 1].index, points[i + 1].price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: patternColor,
                  width: 1,
                  type: 'dotted'
                },
                z: 14
              });
            }
            
            // Draw pivot labels (1-5 or 0-5)
            const labelOrder = wedge.pivots.f ? ['0', '1', '2', '3', '4', '5'] : ['1', '2', '3', '4', '5'];
            points.forEach((point, idx) => {
              const isHigh = idx % 2 === (isBullish ? 1 : 0);
              series.push({
                name: `Wedge Pivot ${wedgeIdx}-${idx}`,
                type: 'scatter',
                data: [[point.index, point.price]],
                symbol: 'circle',
                symbolSize: 6,
                itemStyle: {
                  color: patternColor,
                  borderColor: '#ffffff',
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: labelOrder[idx] || String(idx + 1),
                  position: isHigh ? 'top' : 'bottom',
                  fontSize: 10,
                  color: patternColor,
                  fontWeight: 'bold',
                  distance: 4
                },
                z: 22
              });
            });
          }
          
          // Draw upper trendline
          series.push({
            name: `Wedge Upper ${wedgeIdx}`,
            type: 'line',
            data: [
              [wedge.upperLine.startIndex, wedge.upperLine.startPrice],
              [wedge.upperLine.endIndex, wedge.upperLine.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 16
          });
          
          // Draw lower trendline
          series.push({
            name: `Wedge Lower ${wedgeIdx}`,
            type: 'line',
            data: [
              [wedge.lowerLine.startIndex, wedge.lowerLine.startPrice],
              [wedge.lowerLine.endIndex, wedge.lowerLine.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 16
          });
          
          // Pattern label
          const labelPoint = wedge.pivots.f || wedge.pivots.e;
          const labelY = isBullish ? labelPoint.price * 0.995 : labelPoint.price * 1.005;
          
          series.push({
            name: `Wedge Label ${wedgeIdx}`,
            type: 'scatter',
            data: [[labelPoint.index, labelY]],
            symbol: 'roundRect',
            symbolSize: [55, 22],
            itemStyle: {
              color: patternColor,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `Wedge ${wedge.subType === 'type1' ? 'T1' : 'T2'}`,
              position: 'inside',
              fontSize: 9,
              color: '#000000',
              fontWeight: 'bold'
            },
            z: 25
          });
        });
        
        // Draw Flag patterns
        result.flags.forEach((flag, flagIdx) => {
          const isBullish = flag.direction === 'bullish';
          const patternColor = flag.color;
          
          // Draw flag pole
          series.push({
            name: `Flag Pole ${flagIdx}`,
            type: 'line',
            data: [
              [flag.pole.startIndex, flag.pole.startPrice],
              [flag.pole.endIndex, flag.pole.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 17
          });
          
          // Draw flag zigzag if enabled
          if (config.drawZigzag) {
            const points = [
              flag.flag.a,
              flag.flag.b,
              flag.flag.c,
              flag.flag.d,
              flag.flag.e
            ];
            if (flag.flag.f) {
              points.push(flag.flag.f);
            }
            
            // Sort by index
            points.sort((a, b) => a.index - b.index);
            
            // Draw zigzag connecting lines
            for (let i = 0; i < points.length - 1; i++) {
              series.push({
                name: `Flag ZZ ${flagIdx}-${i}`,
                type: 'line',
                data: [
                  [points[i].index, points[i].price],
                  [points[i + 1].index, points[i + 1].price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: patternColor,
                  width: 1,
                  type: 'dotted'
                },
                z: 14
              });
            }
          }
          
          // Draw flag channel lines
          series.push({
            name: `Flag Upper ${flagIdx}`,
            type: 'line',
            data: [
              [flag.upperLine.startIndex, flag.upperLine.startPrice],
              [flag.upperLine.endIndex, flag.upperLine.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 16
          });
          
          series.push({
            name: `Flag Lower ${flagIdx}`,
            type: 'line',
            data: [
              [flag.lowerLine.startIndex, flag.lowerLine.startPrice],
              [flag.lowerLine.endIndex, flag.lowerLine.endPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 2,
              type: 'solid'
            },
            z: 16
          });
          
          // Flag label at pole start
          const labelY = isBullish ? flag.pole.startPrice * 0.995 : flag.pole.startPrice * 1.005;
          
          series.push({
            name: `Flag Label ${flagIdx}`,
            type: 'scatter',
            data: [[flag.pole.startIndex, labelY]],
            symbol: 'roundRect',
            symbolSize: [40, 22],
            itemStyle: {
              color: patternColor,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: 'Flag',
              position: 'inside',
              fontSize: 10,
              color: '#000000',
              fontWeight: 'bold'
            },
            z: 25
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.36 : data[data.length - 1].high * 1.08;
        
        const totalPivots = result.pivotsByLevel.level1.length + 
                          result.pivotsByLevel.level2.length + 
                          result.pivotsByLevel.level3.length + 
                          result.pivotsByLevel.level4.length;
        
        const badgeBorderColor = result.bullishCount > result.bearishCount ? '#22c55e' : 
                                result.bearishCount > result.bullishCount ? '#ef4444' : '#6b7280';
        
        series.push({
          name: 'Wedge Flag Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 85],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: badgeBorderColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📐 Wedge & Flag\nPivots: ${totalPivots}\n📈 Wedges: ${result.wedgeCount}\n🚩 Flags: ${result.flagCount}\n🟢 Bull: ${result.bullishCount}\n🔴 Bear: ${result.bearishCount}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Wedge Flag Multi-Zigzag] Error:', error);
      }
    }

    // === HARMONIC PROJECTIONS [HeWhoMustNotBeNamed] ===
    if ((indicators as any).harmonicProjections) {
      try {
        const config = { ...defaultHarmonicConfig, ...(indicators as any).harmonicProjections };
        const result = calculateHarmonicProjections(data, config);
        
        // Draw each harmonic pattern
        result.patterns.forEach((pattern, patternIdx) => {
                  const isBullish = pattern.direction === 'bullish';
          const patternColor = getHarmonicPatternColor(pattern);
          const displayInfo = getPatternDisplayInfo(pattern);
          
          // Draw XABCD lines
          if (config.showXABCD) {
            // XA line (solid)
            series.push({
              name: `Harmonic XA ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.x.index, pattern.x.price],
                [pattern.a.index, pattern.a.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'solid'
              },
              z: 15
            });
            
            // AB line (solid)
            series.push({
              name: `Harmonic AB ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.a.index, pattern.a.price],
                [pattern.b.index, pattern.b.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'solid'
              },
              z: 15
            });
            
            // BC line (solid)
            series.push({
              name: `Harmonic BC ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.b.index, pattern.b.price],
                [pattern.c.index, pattern.c.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'solid'
              },
              z: 15
            });
            
            // XB line (dashed - diagonal)
            series.push({
              name: `Harmonic XB ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.x.index, pattern.x.price],
                [pattern.b.index, pattern.b.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dashed'
              },
              z: 14
            });
            
            // AC line (dotted - diagonal)
            series.push({
              name: `Harmonic AC ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.a.index, pattern.a.price],
                [pattern.c.index, pattern.c.price]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dotted'
              },
              z: 14
            });
            
            // If D point exists, draw CD, BD, XD lines
            if (pattern.d) {
              // CD line (solid)
              series.push({
                name: `Harmonic CD ${patternIdx}`,
                type: 'line',
                data: [
                  [pattern.c.index, pattern.c.price],
                  [pattern.d.index, pattern.d.price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: patternColor,
                  width: 1,
                  type: 'solid'
                },
                z: 15
              });
              
              // BD line (dashed)
              series.push({
                name: `Harmonic BD ${patternIdx}`,
                type: 'line',
                data: [
                  [pattern.b.index, pattern.b.price],
                  [pattern.d.index, pattern.d.price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: patternColor,
                  width: 1,
                  type: 'dashed'
                },
                z: 14
              });
              
              // XD line (dotted)
              series.push({
                name: `Harmonic XD ${patternIdx}`,
                type: 'line',
                data: [
                  [pattern.x.index, pattern.x.price],
                  [pattern.d.index, pattern.d.price]
                ],
                symbol: 'none',
                lineStyle: {
                  color: patternColor,
                  width: 1,
                  type: 'dotted'
                },
                z: 14
              });
            }
            
            // Draw XABCD point labels
            const points = [
              { pointLabel: 'X', price: pattern.x.price, index: pattern.x.index, isTop: isBullish },
              { pointLabel: 'A', price: pattern.a.price, index: pattern.a.index, isTop: !isBullish },
              { pointLabel: 'B', price: pattern.b.price, index: pattern.b.index, isTop: isBullish },
              { pointLabel: 'C', price: pattern.c.price, index: pattern.c.index, isTop: !isBullish }
            ];
            
            if (pattern.d) {
              points.push({ pointLabel: 'D', price: pattern.d.price, index: pattern.d.index, isTop: isBullish });
            }
            
            points.forEach((point, idx) => {
              series.push({
                name: `Harmonic Point ${point.pointLabel} ${patternIdx}`,
                type: 'scatter',
                data: [[point.index, point.price]],
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: {
                  color: patternColor,
                  borderColor: '#ffffff',
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: point.pointLabel,
                  position: point.isTop ? 'top' : 'bottom',
                  fontSize: 11,
                  color: patternColor,
                  fontWeight: 'bold',
                  distance: 5
                },
                z: 22
              });
            });
          }
          
          // Draw ratio labels if enabled
          if (config.showRatios) {
            // XAB ratio
            const xabMidIndex = Math.round((pattern.x.index + pattern.b.index) / 2);
            const xabMidPrice = (pattern.x.price + pattern.b.price) / 2;
            
            series.push({
              name: `XAB Ratio ${patternIdx}`,
              type: 'scatter',
              data: [[xabMidIndex, xabMidPrice]],
              symbol: 'roundRect',
              symbolSize: [55, 16],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: patternColor,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: `${pattern.xabRatio.toFixed(3)}`,
                position: 'inside',
                fontSize: 9,
                color: patternColor
              },
              z: 20
            });
            
            // ABC ratio
            const abcMidIndex = Math.round((pattern.a.index + pattern.c.index) / 2);
            const abcMidPrice = (pattern.a.price + pattern.c.price) / 2;
            
            series.push({
              name: `ABC Ratio ${patternIdx}`,
              type: 'scatter',
              data: [[abcMidIndex, abcMidPrice]],
              symbol: 'roundRect',
              symbolSize: [55, 16],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.85)',
                borderColor: patternColor,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: `${pattern.abcRatio.toFixed(3)}`,
                position: 'inside',
                fontSize: 9,
                color: patternColor
              },
              z: 20
            });
            
            // BCD and XAD ratios if D exists
            if (pattern.d && pattern.bcdRatio && pattern.xadRatio) {
              const bcdMidIndex = Math.round((pattern.b.index + pattern.d.index) / 2);
              const bcdMidPrice = (pattern.b.price + pattern.d.price) / 2;
              
              series.push({
                name: `BCD Ratio ${patternIdx}`,
                type: 'scatter',
                data: [[bcdMidIndex, bcdMidPrice]],
                symbol: 'roundRect',
                symbolSize: [55, 16],
                itemStyle: {
                  color: 'rgba(15, 23, 42, 0.85)',
                  borderColor: patternColor,
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: `${pattern.bcdRatio.toFixed(3)}`,
                  position: 'inside',
                  fontSize: 9,
                  color: patternColor
                },
                z: 20
              });
              
              const xadMidIndex = Math.round((pattern.x.index + pattern.d.index) / 2);
              const xadMidPrice = (pattern.x.price + pattern.d.price) / 2;
              
              series.push({
                name: `XAD Ratio ${patternIdx}`,
                type: 'scatter',
                data: [[xadMidIndex, xadMidPrice]],
                symbol: 'roundRect',
                symbolSize: [55, 16],
                itemStyle: {
                  color: 'rgba(15, 23, 42, 0.85)',
                  borderColor: patternColor,
                  borderWidth: 1
                },
                label: {
                  show: true,
                  formatter: `${pattern.xadRatio.toFixed(3)}`,
                  position: 'inside',
                  fontSize: 9,
                  color: patternColor
                },
                z: 20
              });
            }
          }
          
          // Draw PRZ boxes
          pattern.przRanges.forEach((prz, przIdx) => {
            const przStartIndex = pattern.c.index;
            const przEndIndex = pattern.d ? pattern.d.index + 10 : pattern.c.index + 20;
            
            // PRZ area (using markArea would be ideal but scatter works)
            series.push({
              name: `PRZ Area ${patternIdx}-${przIdx}`,
              type: 'line',
              data: [
                [przStartIndex, prz.startPrice],
                [przEndIndex, prz.startPrice],
                [przEndIndex, prz.endPrice],
                [przStartIndex, prz.endPrice],
                [przStartIndex, prz.startPrice]
              ],
              symbol: 'none',
              lineStyle: {
                color: patternColor,
                width: 1,
                type: 'dotted'
              },
              areaStyle: {
                color: patternColor + '30'
              },
              z: 12
            });
            
            // PRZ label
            const przMidPrice = (prz.startPrice + prz.endPrice) / 2;
            series.push({
              name: `PRZ Label ${patternIdx}-${przIdx}`,
              type: 'scatter',
              data: [[przEndIndex - 5, przMidPrice]],
              symbol: 'roundRect',
              symbolSize: [65, 35],
              itemStyle: {
                color: 'rgba(15, 23, 42, 0.9)',
                borderColor: patternColor,
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: `${pattern.name}\n${prz.startPrice.toFixed(2)}\n${prz.endPrice.toFixed(2)}`,
                position: 'inside',
                fontSize: 8,
                color: '#e2e8f0',
                lineHeight: 10
              },
              z: 25
            });
          });
          
          // Pattern name label at X point
          const labelY = isBullish ? pattern.x.price * 0.995 : pattern.x.price * 1.005;
          
          series.push({
            name: `Pattern Label ${patternIdx}`,
            type: 'scatter',
            data: [[pattern.x.index, labelY]],
            symbol: 'roundRect',
            symbolSize: [75, 22],
            itemStyle: {
              color: patternColor + 'DD',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: displayInfo.shortLabel,
              position: 'inside',
              fontSize: 10,
              color: '#ffffff',
              fontWeight: 'bold'
            },
            z: 26
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.42 : data[data.length - 1].high * 1.10;
        
        const badgeBorderColor = result.bullishCount > result.bearishCount ? '#22c55e' : 
                                result.bearishCount > result.bullishCount ? '#ef4444' : '#9333ea';
        
        series.push({
          name: 'Harmonic Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [130, 95],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: badgeBorderColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🔷 Harmonic Patterns\nTotal: ${result.patterns.length}\n📈 Classic: ${result.classicCount}\n🔄 Anti: ${result.antiCount}\n⚡ NonStd: ${result.nonStandardCount}\n🟢 Bull: ${result.bullishCount} | 🔴 Bear: ${result.bearishCount}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Harmonic Projections] Error:', error);
      }
    }

    // === BAT HARMONIC PATTERN [TradingFinder] ===
    if ((indicators as any).batHarmonicPattern) {
      try {
        const config = { ...defaultBatPatternConfig, ...(indicators as any).batHarmonicPattern };
        const result = calculateBatPattern(data, config);
        
        // Draw each Bat pattern
        result.patterns.forEach((pattern, patternIdx) => {
          const isBullish = pattern.type === 'bullish';
          const patternColor = pattern.color || (isBullish ? config.bullishColor : config.bearishColor);
          
          // Draw XABCD lines
          // XA line (solid)
          series.push({
            name: `Bat XA ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.x.index, pattern.x.price],
              [pattern.a.index, pattern.a.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // AB line (solid)
          series.push({
            name: `Bat AB ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.a.index, pattern.a.price],
              [pattern.b.index, pattern.b.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // BC line (solid)
          series.push({
            name: `Bat BC ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.b.index, pattern.b.price],
              [pattern.c.index, pattern.c.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // CD line (solid)
          series.push({
            name: `Bat CD ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.c.index, pattern.c.price],
              [pattern.d.index, pattern.d.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // XB diagonal (dashed)
          series.push({
            name: `Bat XB ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.x.index, pattern.x.price],
              [pattern.b.index, pattern.b.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 1,
              type: 'dashed'
            },
            z: 14
          });
          
          // BD diagonal (dashed)
          series.push({
            name: `Bat BD ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.b.index, pattern.b.price],
              [pattern.d.index, pattern.d.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 1,
              type: 'dashed'
            },
            z: 14
          });
          
          // AC diagonal (dotted)
          series.push({
            name: `Bat AC ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.a.index, pattern.a.price],
              [pattern.c.index, pattern.c.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 1,
              type: 'dotted'
            },
            z: 14
          });
          
          // XD diagonal (dotted)
          series.push({
            name: `Bat XD ${patternIdx}`,
            type: 'line',
            data: [
              [pattern.x.index, pattern.x.price],
              [pattern.d.index, pattern.d.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 1,
              type: 'dotted'
            },
            z: 14
          });
          
          // Draw XABCD point labels
          const points = [
            { lbl: 'X', price: pattern.x.price, index: pattern.x.index, isTop: isBullish },
            { lbl: 'A', price: pattern.a.price, index: pattern.a.index, isTop: !isBullish },
            { lbl: 'B', price: pattern.b.price, index: pattern.b.index, isTop: isBullish },
            { lbl: 'C', price: pattern.c.price, index: pattern.c.index, isTop: !isBullish },
            { lbl: 'D', price: pattern.d.price, index: pattern.d.index, isTop: isBullish }
          ];
          
          points.forEach((point) => {
            series.push({
              name: `Bat Point ${point.lbl} ${patternIdx}`,
              type: 'scatter',
              data: [[point.index, point.price]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: patternColor,
                borderColor: '#ffffff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: point.lbl,
                position: point.isTop ? 'top' : 'bottom',
                fontSize: 11,
                color: patternColor,
                fontWeight: 'bold',
                distance: 5
              },
              z: 22
            });
          });
          
          // Draw PRZ zone
          const prz = getBatPRZ(pattern);
          const przStartIndex = pattern.c.index;
          const przEndIndex = pattern.d.index + 15;
          
          series.push({
            name: `Bat PRZ ${patternIdx}`,
            type: 'line',
            data: [
              [przStartIndex, prz.min],
              [przEndIndex, prz.min],
              [przEndIndex, prz.max],
              [przStartIndex, prz.max],
              [przStartIndex, prz.min]
            ],
            symbol: 'none',
            lineStyle: {
              color: patternColor,
              width: 1,
              type: 'dotted'
            },
            areaStyle: {
              color: patternColor + '25'
            },
            z: 12
          });
          
          // PRZ label
          series.push({
            name: `Bat PRZ Label ${patternIdx}`,
            type: 'scatter',
            data: [[przEndIndex - 5, (prz.min + prz.max) / 2]],
            symbol: 'roundRect',
            symbolSize: [65, 30],
            itemStyle: {
              color: 'rgba(15, 23, 42, 0.9)',
              borderColor: patternColor,
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `PRZ\n${prz.min.toFixed(2)}\n${prz.max.toFixed(2)}`,
              position: 'inside',
              fontSize: 8,
              color: '#e2e8f0',
              lineHeight: 9
            },
            z: 25
          });
          
          // Target and Stop Loss lines if available
          if (pattern.potentialTarget) {
            series.push({
              name: `Bat Target ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.d.index, pattern.potentialTarget],
                [pattern.d.index + 25, pattern.potentialTarget]
              ],
              symbol: 'none',
              lineStyle: {
                color: '#22c55e',
                width: 1,
                type: 'dashed'
              },
              z: 13
            });
          }
          
          if (pattern.stopLoss) {
            series.push({
              name: `Bat StopLoss ${patternIdx}`,
              type: 'line',
              data: [
                [pattern.d.index, pattern.stopLoss],
                [pattern.d.index + 25, pattern.stopLoss]
              ],
              symbol: 'none',
              lineStyle: {
                color: '#ef4444',
                width: 1,
                type: 'dashed'
              },
              z: 13
            });
          }
          
          // Pattern name label
          const labelY = isBullish ? pattern.x.price * 0.995 : pattern.x.price * 1.005;
          const validFormatText = pattern.isValidFormat ? ' ✓' : '';
          
          series.push({
            name: `Bat Label ${patternIdx}`,
            type: 'scatter',
            data: [[pattern.x.index, labelY]],
            symbol: 'roundRect',
            symbolSize: [85, 22],
            itemStyle: {
              color: patternColor + 'DD',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: `${pattern.name}${validFormatText}`,
              position: 'inside',
              fontSize: 9,
              color: '#ffffff',
              fontWeight: 'bold'
            },
            z: 26
          });
        });
        
        // Draw confirmation signals
        result.bullishSignals.forEach((signal, idx) => {
          series.push({
            name: `Bat Bull Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'triangle',
            symbolSize: 14,
            itemStyle: {
              color: '#22c55e',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            z: 28
          });
        });
        
        result.bearishSignals.forEach((signal, idx) => {
          series.push({
            name: `Bat Bear Signal ${idx}`,
            type: 'scatter',
            data: [[signal.index, signal.price]],
            symbol: 'triangle',
            symbolRotate: 180,
            symbolSize: 14,
            itemStyle: {
              color: '#ef4444',
              borderColor: '#ffffff',
              borderWidth: 1
            },
            z: 28
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.48 : data[data.length - 1].high * 1.12;
        
        const badgeBorderColor = result.bullishCount > result.bearishCount ? '#22c55e' : 
                                result.bearishCount > result.bullishCount ? '#ef4444' : '#0609bb';
        
        series.push({
          name: 'Bat Pattern Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [120, 75],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: badgeBorderColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `🦇 Bat Harmonic\nTotal: ${result.patterns.length}\n🟢 Bullish: ${result.bullishCount}\n🔴 Bearish: ${result.bearishCount}\nXAD: 0.886`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Bat Harmonic Pattern] Error:', error);
      }
    }

    // === TREND BREAK TARGETS [MarkitTick] + CHOCH ===
    if ((indicators as any).tbtMarkitTick) {
      try {
        const config = { ...defaultTrendBreakTargetsConfig, ...(indicators as any).tbtMarkitTick };
        const result = calcTBTMarkitTick(data, config);
        
        // Draw anchor points (1 and 2)
        result.anchors.forEach((anchor, idx) => {
          const isHigh = config.priceSource === 'High';
          series.push({
            name: `TBT Anchor ${anchor.label}`,
            type: 'scatter',
            data: [[anchor.index, anchor.price]],
            symbol: 'circle',
            symbolSize: 12,
            itemStyle: {
              color: config.anchorColor,
              borderColor: '#ffffff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: anchor.label,
              position: isHigh ? 'top' : 'bottom',
              fontSize: 12,
              color: '#ffffff',
              fontWeight: 'bold',
              distance: 8
            },
            z: 25
          });
        });
        
        // Draw trendline (extended)
        if (result.trendline && result.trendline.isValid) {
          const tl = result.trendline;
          const extendedEndIndex = data.length + 50;
          const extendedEndPrice = tl.startPrice + tl.slope * (extendedEndIndex - tl.startIndex);
          
          series.push({
            name: 'TBT Trendline',
            type: 'line',
            data: [
              [tl.startIndex, tl.startPrice],
              [extendedEndIndex, extendedEndPrice]
            ],
            symbol: 'none',
            lineStyle: {
              color: config.trendlineColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
        }
        
        // Draw breakout signal
        if (result.breakout) {
          const bo = result.breakout;
          const isBullish = bo.type === 'bullish';
          
          series.push({
            name: 'TBT Breakout',
            type: 'scatter',
            data: [[bo.index, bo.price]],
            symbol: isBullish ? 'triangle' : 'triangle',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 16,
            itemStyle: {
              color: isBullish ? config.breakoutBullColor : config.breakoutBearColor,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: 'BC',
              position: isBullish ? 'top' : 'bottom',
              fontSize: 10,
              color: '#ffffff',
              fontWeight: 'bold',
              backgroundColor: isBullish ? config.breakoutBullColor : config.breakoutBearColor,
              padding: [2, 4],
              borderRadius: 2,
              distance: 5
            },
            z: 28
          });
        }
        
        // Draw target levels (T1, T2, T3)
        result.targets.forEach((target, idx) => {
          const isHigh = config.priceSource === 'High';
          
          // Target line (dotted horizontal)
          series.push({
            name: `TBT ${target.label} Line`,
            type: 'line',
            data: [
              [target.index, target.price],
              [target.index + target.extendBars, target.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: target.color,
              width: 1,
              type: 'dotted'
            },
            z: 14
          });
          
          // Connector line (vertical from trendline to target)
          series.push({
            name: `TBT ${target.label} Connector`,
            type: 'line',
            data: [
              [target.index, target.connectorStartPrice],
              [target.index, target.price]
            ],
            symbol: 'none',
            lineStyle: {
              color: target.color,
              width: 1,
              type: 'solid'
            },
            z: 14
          });
          
          // Target label
          series.push({
            name: `TBT ${target.label} Label`,
            type: 'scatter',
            data: [[target.index + 5, target.price]],
            symbol: 'roundRect',
            symbolSize: [28, 18],
            itemStyle: {
              color: target.color,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: target.label,
              position: 'inside',
              fontSize: 10,
              color: '#ffffff',
              fontWeight: 'bold'
            },
            z: 22
          });
        });
        
        // Draw CHOCH signals
        if (config.showChochLines) {
          result.chochSignals.forEach((signal, idx) => {
            const isBullish = signal.type === 'bullish';
            const chochColor = isBullish ? config.chochBullColor : config.chochBearColor;
            
            // CHOCH break level line (dashed)
            series.push({
              name: `CHOCH Level ${idx}`,
              type: 'line',
              data: [
                [signal.levelStartIndex, signal.breakLevel],
                [signal.index, signal.breakLevel]
              ],
              symbol: 'none',
              lineStyle: {
                color: chochColor,
                width: 1,
                type: 'dashed'
              },
              z: 13
            });
            
            // CHOCH label
            series.push({
              name: `CHOCH Label ${idx}`,
              type: 'scatter',
              data: [[signal.index, signal.price]],
              symbol: 'roundRect',
              symbolSize: [45, 18],
              itemStyle: {
                color: chochColor,
                borderColor: '#ffffff',
                borderWidth: 1
              },
              label: {
                show: true,
                formatter: 'CHOCH',
                position: 'inside',
                fontSize: 8,
                color: '#ffffff',
                fontWeight: 'bold'
              },
              z: 24
            });
          });
        }
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.42 : data[data.length - 1].high * 1.15;
        
        const trendEmoji = result.currentTrend === 'bullish' ? '🟢' : 
                          result.currentTrend === 'bearish' ? '🔴' : '⚪';
        const trendText = result.currentTrend.charAt(0).toUpperCase() + result.currentTrend.slice(1);
        
        series.push({
          name: 'TBT Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [135, 85],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: result.currentTrend === 'bullish' ? '#22c55e' : 
                        result.currentTrend === 'bearish' ? '#ef4444' : '#3b82f6',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 Trend Break Targets\nBreakouts: ${result.totalBreakouts}\n🟢 Bull: ${result.bullishBreakouts} | 🔴 Bear: ${result.bearishBreakouts}\nTargets: ${result.targets.length}\n${trendEmoji} Trend: ${trendText}\nCHOCH: ${result.chochSignals.length}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Trend Break Targets] Error:', error);
      }
    }

    // === TREND CHANNELS WITH LIQUIDITY BREAKS [ChartPrime] ===
    if ((indicators as any).trendChannelsLiquidity) {
      try {
        const config = { ...defaultTrendChannelsConfig, ...(indicators as any).trendChannelsLiquidity };
        const result = calculateTrendChannels(data, config);
        
        // Helper to convert hex to rgba
        const hexToRgba = (hex: string, alpha: number): string => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        // Draw Down Channel (descending)
        if (result.downChannel && result.downChannel.isActive) {
          const dc = result.downChannel;
          
          // Top line (resistance)
          series.push({
            name: 'Down Channel Top',
            type: 'line',
            data: [[dc.topLine.x1, dc.topLine.y1], [dc.topLine.x2, dc.topLine.y2]],
            symbol: 'none',
            lineStyle: {
              color: config.topColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // Bottom line (support)
          series.push({
            name: 'Down Channel Bottom',
            type: 'line',
            data: [[dc.bottomLine.x1, dc.bottomLine.y1], [dc.bottomLine.x2, dc.bottomLine.y2]],
            symbol: 'none',
            lineStyle: {
              color: config.bottomColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // Center line (dashed)
          series.push({
            name: 'Down Channel Center',
            type: 'line',
            data: [[dc.centerLine.x1, dc.centerLine.y1], [dc.centerLine.x2, dc.centerLine.y2]],
            symbol: 'none',
            lineStyle: {
              color: config.centerColor,
              width: config.lineWidth,
              type: 'dashed'
            },
            z: 14
          });
          
          // Top zone fill
          series.push({
            name: 'Down Channel Top Zone',
            type: 'line',
            data: [
              [dc.topLine.x1, dc.topLine.y1],
              [dc.topLine.x2, dc.topLine.y2],
              [dc.topZone.bottomLine.x2, dc.topZone.bottomLine.y2],
              [dc.topZone.bottomLine.x1, dc.topZone.bottomLine.y1],
              [dc.topLine.x1, dc.topLine.y1]
            ],
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: {
              color: hexToRgba(config.topColor, 0.2)
            },
            z: 10
          });
          
          // Bottom zone fill
          series.push({
            name: 'Down Channel Bottom Zone',
            type: 'line',
            data: [
              [dc.bottomZone.topLine.x1, dc.bottomZone.topLine.y1],
              [dc.bottomZone.topLine.x2, dc.bottomZone.topLine.y2],
              [dc.bottomLine.x2, dc.bottomLine.y2],
              [dc.bottomLine.x1, dc.bottomLine.y1],
              [dc.bottomZone.topLine.x1, dc.bottomZone.topLine.y1]
            ],
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: {
              color: hexToRgba(config.bottomColor, 0.2)
            },
            z: 10
          });
        }
        
        // Draw Up Channel (ascending)
        if (result.upChannel && result.upChannel.isActive) {
          const uc = result.upChannel;
          
          // Top line (resistance)
          series.push({
            name: 'Up Channel Top',
            type: 'line',
            data: [[uc.topLine.x1, uc.topLine.y1], [uc.topLine.x2, uc.topLine.y2]],
            symbol: 'none',
            lineStyle: {
              color: config.topColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // Bottom line (support)
          series.push({
            name: 'Up Channel Bottom',
            type: 'line',
            data: [[uc.bottomLine.x1, uc.bottomLine.y1], [uc.bottomLine.x2, uc.bottomLine.y2]],
            symbol: 'none',
            lineStyle: {
              color: config.bottomColor,
              width: config.lineWidth,
              type: 'solid'
            },
            z: 15
          });
          
          // Center line (dashed)
          series.push({
            name: 'Up Channel Center',
            type: 'line',
            data: [[uc.centerLine.x1, uc.centerLine.y1], [uc.centerLine.x2, uc.centerLine.y2]],
            symbol: 'none',
            lineStyle: {
              color: config.centerColor,
              width: config.lineWidth,
              type: 'dashed'
            },
            z: 14
          });
          
          // Top zone fill
          series.push({
            name: 'Up Channel Top Zone',
            type: 'line',
            data: [
              [uc.topLine.x1, uc.topLine.y1],
              [uc.topLine.x2, uc.topLine.y2],
              [uc.topZone.bottomLine.x2, uc.topZone.bottomLine.y2],
              [uc.topZone.bottomLine.x1, uc.topZone.bottomLine.y1],
              [uc.topLine.x1, uc.topLine.y1]
            ],
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: {
              color: hexToRgba(config.topColor, 0.2)
            },
            z: 10
          });
          
          // Bottom zone fill
          series.push({
            name: 'Up Channel Bottom Zone',
            type: 'line',
            data: [
              [uc.bottomZone.topLine.x1, uc.bottomZone.topLine.y1],
              [uc.bottomZone.topLine.x2, uc.bottomZone.topLine.y2],
              [uc.bottomLine.x2, uc.bottomLine.y2],
              [uc.bottomLine.x1, uc.bottomLine.y1],
              [uc.bottomZone.topLine.x1, uc.bottomZone.topLine.y1]
            ],
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: {
              color: hexToRgba(config.bottomColor, 0.2)
            },
            z: 10
          });
        }
        
        // Draw Liquidity Breaks
        result.liquidityBreaks.forEach((breakInfo, idx) => {
          const isBullish = breakInfo.type === 'bullish';
          const breakColor = isBullish ? config.topColor : config.bottomColor;
          const liquidityColor = getLiquidityColor(breakInfo.score);
          
          // Break label
          series.push({
            name: `Liquidity Break ${idx}`,
            type: 'scatter',
            data: [[breakInfo.index, breakInfo.price]],
            symbol: isBullish ? 'triangle' : 'triangle',
            symbolRotate: isBullish ? 0 : 180,
            symbolSize: 16,
            itemStyle: {
              color: breakColor,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: breakInfo.score,
              position: isBullish ? 'bottom' : 'top',
              fontSize: 9,
              color: '#ffffff',
              backgroundColor: liquidityColor,
              padding: [2, 4],
              borderRadius: 2,
              distance: 5
            },
            z: 26
          });
        });
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.36 : data[data.length - 1].high * 1.18;
        
        const activeUp = result.upChannel?.isActive ? '✅' : '❌';
        const activeDown = result.downChannel?.isActive ? '✅' : '❌';
        
        series.push({
          name: 'Trend Channels Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [145, 75],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: result.upChannel?.isActive ? '#337c4f' : 
                        result.downChannel?.isActive ? '#a52d2d' : '#888888',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 Trend Channels [ChartPrime]\n${activeUp} Up Channel | ${activeDown} Down Channel\n📈 Pivots H: ${result.pivotHighs.length} | L: ${result.pivotLows.length}\n💧 Liquidity Breaks: ${result.liquidityBreaks.length}\n🔊 Vol Score: ${result.volumeScore.toFixed(0)}%`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Trend Channels Liquidity] Error:', error);
      }
    }

    // === REPEATED MEDIAN REGRESSION CHANNEL [tbiktag] ===
    if ((indicators as any).repeatedMedianChannel) {
      try {
        const config = { ...defaultRMRChannelConfig, ...(indicators as any).repeatedMedianChannel };
        const result = calculateRMRChannel(data, config);
        
        // Draw center regression line
        if (result.centerLine) {
          const cl = result.centerLine;
          const extendedX2 = cl.extended ? data.length + 50 : cl.x2;
          const extendedY2 = cl.extended ? cl.y1 + cl.slope * (extendedX2 - cl.x1) : cl.y2;
          
          series.push({
            name: 'RMR Center Line',
            type: 'line',
            data: [[cl.x1, cl.y1], [extendedX2, extendedY2]],
            symbol: 'none',
            lineStyle: {
              color: cl.color,
              width: cl.width,
              type: 'solid'
            },
            z: 16
          });
        }
        
        // Draw upper channel line
        if (result.upperLine && config.showChannel) {
          const ul = result.upperLine;
          const extendedX2 = ul.extended ? data.length + 50 : ul.x2;
          const extendedY2 = ul.extended ? ul.y1 + ul.slope * (extendedX2 - ul.x1) : ul.y2;
          
          series.push({
            name: 'RMR Upper Line',
            type: 'line',
            data: [[ul.x1, ul.y1], [extendedX2, extendedY2]],
            symbol: 'none',
            lineStyle: {
              color: ul.color,
              width: ul.width,
              type: 'dashed'
            },
            z: 15
          });
        }
        
        // Draw lower channel line
        if (result.lowerLine && config.showChannel) {
          const ll = result.lowerLine;
          const extendedX2 = ll.extended ? data.length + 50 : ll.x2;
          const extendedY2 = ll.extended ? ll.y1 + ll.slope * (extendedX2 - ll.x1) : ll.y2;
          
          series.push({
            name: 'RMR Lower Line',
            type: 'line',
            data: [[ll.x1, ll.y1], [extendedX2, extendedY2]],
            symbol: 'none',
            lineStyle: {
              color: ll.color,
              width: ll.width,
              type: 'dashed'
            },
            z: 15
          });
        }
        
        // Draw channel fill (between upper and lower)
        if (result.upperLine && result.lowerLine && config.showChannel) {
          const ul = result.upperLine;
          const ll = result.lowerLine;
          const fillColor = result.slopeDirection === 'up' ? config.colorUp : config.colorDown;
          
          series.push({
            name: 'RMR Channel Fill',
            type: 'line',
            data: [
              [ul.x1, ul.y1],
              [ul.x2, ul.y2],
              [ll.x2, ll.y2],
              [ll.x1, ll.y1],
              [ul.x1, ul.y1]
            ],
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: {
              color: result.isBroken ? config.colorBroken + '15' : fillColor + '15'
            },
            z: 10
          });
        }
        
        // Draw historical broken channels
        if (config.showHistoricalBroken) {
          result.brokenChannels.forEach((broken, idx) => {
            // Upper broken line
            series.push({
              name: `RMR Broken Upper ${idx}`,
              type: 'line',
              data: [[broken.upperLine.x1, broken.upperLine.y1], [broken.upperLine.x2, broken.upperLine.y2]],
              symbol: 'none',
              lineStyle: {
                color: config.colorBroken,
                width: 1,
                type: 'dashed'
              },
              z: 12
            });
            
            // Lower broken line
            series.push({
              name: `RMR Broken Lower ${idx}`,
              type: 'line',
              data: [[broken.lowerLine.x1, broken.lowerLine.y1], [broken.lowerLine.x2, broken.lowerLine.y2]],
              symbol: 'none',
              lineStyle: {
                color: config.colorBroken,
                width: 1,
                type: 'dashed'
              },
              z: 12
            });
          });
        }
        
        // Draw slope label
        if (result.slopeLabel && config.showSlopeLabel) {
          const sl = result.slopeLabel;
          
          series.push({
            name: 'RMR Slope Label',
            type: 'scatter',
            data: [[sl.index, sl.price]],
            symbol: sl.position === 'below' ? 'triangle' : 'triangle',
            symbolRotate: sl.position === 'below' ? 0 : 180,
            symbolSize: 12,
            itemStyle: {
              color: sl.color,
              borderColor: '#ffffff',
              borderWidth: 1
            },
            label: {
              show: true,
              formatter: sl.text,
              position: sl.position === 'below' ? 'bottom' : 'top',
              fontSize: 10,
              color: '#ffffff',
              backgroundColor: sl.color,
              padding: [3, 6],
              borderRadius: 3,
              distance: 8
            },
            z: 25
          });
        }
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.30 : data[data.length - 1].high * 1.20;
        
        const trendIcon = result.slopeDirection === 'up' ? '📈' : '📉';
        const statusIcon = result.isBroken ? '⚠️' : '✅';
        const statusText = result.isBroken ? `Broken ${result.breakDirection}` : 'Intact';
        
        series.push({
          name: 'RMR Channel Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [150, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: result.slopeDirection === 'up' ? config.colorUp : config.colorDown,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📊 RM Regression Channel\n${trendIcon} Slope: ${formatSlope(result.slope)}\n📐 RMSE: ${result.rmse.toFixed(4)}\n📏 Dev: ±${result.deviation.toFixed(2)}\n${statusIcon} ${statusText}\n📜 Hist Breaks: ${result.brokenChannels.length}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Repeated Median Channel] Error:', error);
      }
    }

    // === ULTRA TRENDLINES [Rathack] ===
    if ((indicators as any).ultraTrendlines) {
      try {
        const config = { ...defaultUltraTrendlinesConfig, ...(indicators as any).ultraTrendlines };
        const result = calculateUltraTrendlines(data, config);
        
        // Draw HIGH trendlines (resistance)
        result.highTrendlines.forEach((line, idx) => {
          series.push({
            name: `Ultra High TL ${idx}`,
            type: 'line',
            data: [[line.x1, line.y1], [line.x2, line.y2]],
            symbol: 'none',
            lineStyle: {
              color: line.color,
              width: line.width,
              type: line.style
            },
            z: 16
          });
        });
        
        // Draw LOW trendlines (support)
        result.lowTrendlines.forEach((line, idx) => {
          series.push({
            name: `Ultra Low TL ${idx}`,
            type: 'line',
            data: [[line.x1, line.y1], [line.x2, line.y2]],
            symbol: 'none',
            lineStyle: {
              color: line.color,
              width: line.width,
              type: line.style
            },
            z: 16
          });
        });
        
        // Draw broken HIGH trendlines
        result.brokenHighTrendlines.forEach((line, idx) => {
          series.push({
            name: `Ultra Broken High ${idx}`,
            type: 'line',
            data: [[line.x1, line.y1], [line.x2, line.y2]],
            symbol: 'none',
            lineStyle: {
              color: line.color,
              width: line.width,
              type: line.style
            },
            z: 14
          });
          
          // Break marker
          if (line.breakIndex !== undefined) {
            series.push({
              name: `Ultra Break H ${idx}`,
              type: 'scatter',
              data: [[line.breakIndex, data[line.breakIndex]?.high || line.y2]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: config.highBrokenColor,
                borderColor: '#ffffff',
                borderWidth: 1
              },
              z: 20
            });
          }
        });
        
        // Draw broken LOW trendlines
        result.brokenLowTrendlines.forEach((line, idx) => {
          series.push({
            name: `Ultra Broken Low ${idx}`,
            type: 'line',
            data: [[line.x1, line.y1], [line.x2, line.y2]],
            symbol: 'none',
            lineStyle: {
              color: line.color,
              width: line.width,
              type: line.style
            },
            z: 14
          });
          
          // Break marker
          if (line.breakIndex !== undefined) {
            series.push({
              name: `Ultra Break L ${idx}`,
              type: 'scatter',
              data: [[line.breakIndex, data[line.breakIndex]?.low || line.y2]],
              symbol: 'circle',
              symbolSize: 8,
              itemStyle: {
                color: config.lowBrokenColor,
                borderColor: '#ffffff',
                borderWidth: 1
              },
              z: 20
            });
          }
        });
        
        // Draw pivot markers (optional - small dots)
        if (config.pivotLength <= 20) {
          // Pivot Highs
          result.pivotHighs.slice(-10).forEach((pivot, idx) => {
            series.push({
              name: `Ultra PH ${idx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'diamond',
              symbolSize: 6,
              itemStyle: {
                color: config.highColor + '80',
                borderColor: config.highColor,
                borderWidth: 1
              },
              z: 18
            });
          });
          
          // Pivot Lows
          result.pivotLows.slice(-10).forEach((pivot, idx) => {
            series.push({
              name: `Ultra PL ${idx}`,
              type: 'scatter',
              data: [[pivot.index, pivot.price]],
              symbol: 'diamond',
              symbolSize: 6,
              itemStyle: {
                color: config.lowColor + '80',
                borderColor: config.lowColor,
                borderWidth: 1
              },
              z: 18
            });
          });
        }
        
        // Stats badge
        const statsX = data.length - 5;
        const statsY = yRange.max !== null ? yRange.max * 0.24 : data[data.length - 1].high * 1.22;
        
        const totalActive = result.totalHighLines + result.totalLowLines;
        const totalBroken = result.totalBrokenHigh + result.totalBrokenLow;
        
        series.push({
          name: 'Ultra Trendlines Stats',
          type: 'scatter',
          data: [[statsX, statsY]],
          symbol: 'roundRect',
          symbolSize: [140, 80],
          itemStyle: {
            color: 'rgba(15, 23, 42, 0.95)',
            borderColor: config.highColor,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: `📐 Ultra Trendlines\n━━━━━━━━━━━━━━\n📈 High Lines: ${result.totalHighLines}\n📉 Low Lines: ${result.totalLowLines}\n💔 Broken: ${totalBroken}\n🔍 Pivots: H${result.pivotHighs.length} / L${result.pivotLows.length}`,
            position: 'inside',
            fontSize: 9,
            color: '#e2e8f0',
            lineHeight: 12
          },
          z: 120
        });
        
      } catch (error) {
        console.error('[Ultra Trendlines] Error:', error);
      }
    }

    // === Trendlines with Breaks [LuxAlgo] ===
    if (indicators.trendlinesBreaksLuxAlgo) {
      try {
        const trendlinesResult = calculateTrendlinesBreaks(data, {
          length: 14,
          slopeMultiplier: 1.0,
          calcMethod: 'Atr',
          backpaint: true,
          showExtended: true
        });

        // Upper trendline points (solid line)
        if (trendlinesResult.upperPoints.length > 0) {
          const upperLineData: [number, number][] = trendlinesResult.upperPoints
            .filter(p => p.index >= 0 && p.index < data.length)
            .map(p => [p.index, p.price]);
          
          if (upperLineData.length > 0) {
            series.push({
              name: 'Upper Trendline (LuxAlgo)',
              type: 'line',
              data: upperLineData,
              symbol: 'none',
              lineStyle: {
                color: '#14b8a6',
                width: 2,
                type: 'solid'
              },
              z: 90
            });
          }
        }

        // Lower trendline points (solid line)
        if (trendlinesResult.lowerPoints.length > 0) {
          const lowerLineData: [number, number][] = trendlinesResult.lowerPoints
            .filter(p => p.index >= 0 && p.index < data.length)
            .map(p => [p.index, p.price]);
          
          if (lowerLineData.length > 0) {
            series.push({
              name: 'Lower Trendline (LuxAlgo)',
              type: 'line',
              data: lowerLineData,
              symbol: 'none',
              lineStyle: {
                color: '#ef4444',
                width: 2,
                type: 'solid'
              },
              z: 90
            });
          }
        }

        // Extended upper trendline (dashed)
        if (trendlinesResult.upperExtended) {
          const ext = trendlinesResult.upperExtended;
          const extPoints: [number, number][] = [];
          const startX = Math.max(0, Math.floor(ext.x1));
          const endX = Math.min(data.length - 1, Math.floor(ext.x2));
          
          for (let i = startX; i <= endX; i++) {
            const y = ext.y1 + ext.slope * (i - ext.x1);
            if (y > 0) extPoints.push([i, y]);
          }
          
          if (extPoints.length > 0) {
            series.push({
              name: 'Upper Extended (LuxAlgo)',
              type: 'line',
              data: extPoints,
              symbol: 'none',
              lineStyle: {
                color: '#14b8a6',
                width: 1,
                type: 'dashed',
                opacity: 0.6
              },
              z: 85
            });
          }
        }

        // Extended lower trendline (dashed)
        if (trendlinesResult.lowerExtended) {
          const ext = trendlinesResult.lowerExtended;
          const extPoints: [number, number][] = [];
          const startX = Math.max(0, Math.floor(ext.x1));
          const endX = Math.min(data.length - 1, Math.floor(ext.x2));
          
          for (let i = startX; i <= endX; i++) {
            const y = ext.y1 + ext.slope * (i - ext.x1);
            if (y > 0) extPoints.push([i, y]);
          }
          
          if (extPoints.length > 0) {
            series.push({
              name: 'Lower Extended (LuxAlgo)',
              type: 'line',
              data: extPoints,
              symbol: 'none',
              lineStyle: {
                color: '#ef4444',
                width: 1,
                type: 'dashed',
                opacity: 0.6
              },
              z: 85
            });
          }
        }

        // Upward breakout signals
        if (trendlinesResult.upBreakouts.length > 0) {
          const upBreakData = trendlinesResult.upBreakouts
            .filter(b => b.index >= 0 && b.index < data.length)
            .map(b => ({
              value: [b.index, b.price],
              itemStyle: { color: '#14b8a6' }
            }));
          
          if (upBreakData.length > 0) {
            series.push({
              name: 'Up Break (LuxAlgo)',
              type: 'scatter',
              data: upBreakData,
              symbol: 'triangle',
              symbolSize: 10,
              symbolOffset: [0, 8],
              label: {
                show: true,
                position: 'bottom',
                formatter: 'B',
                fontSize: 9,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#14b8a6',
                padding: [2, 4],
                borderRadius: 2
              },
              z: 130
            });
          }
        }

        // Downward breakout signals
        if (trendlinesResult.downBreakouts.length > 0) {
          const downBreakData = trendlinesResult.downBreakouts
            .filter(b => b.index >= 0 && b.index < data.length)
            .map(b => ({
              value: [b.index, b.price],
              itemStyle: { color: '#ef4444' }
            }));
          
          if (downBreakData.length > 0) {
            series.push({
              name: 'Down Break (LuxAlgo)',
              type: 'scatter',
              data: downBreakData,
              symbol: 'triangle',
              symbolSize: 10,
              symbolRotate: 180,
              symbolOffset: [0, -8],
              label: {
                show: true,
                position: 'top',
                formatter: 'B',
                fontSize: 9,
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#ef4444',
                padding: [2, 4],
                borderRadius: 2
              },
              z: 130
            });
          }
        }

        // Pivot high markers (small dots)
        if (trendlinesResult.pivotHighs.length > 0) {
          const phData = trendlinesResult.pivotHighs
            .filter(p => p.index >= 0 && p.index < data.length)
            .map(p => [p.index, p.price]);
          
          series.push({
            name: 'Pivot Highs (LuxAlgo)',
            type: 'scatter',
            data: phData,
            symbol: 'circle',
            symbolSize: 5,
            itemStyle: {
              color: '#14b8a6',
              opacity: 0.7
            },
            z: 80
          });
        }

        // Pivot low markers (small dots)
        if (trendlinesResult.pivotLows.length > 0) {
          const plData = trendlinesResult.pivotLows
            .filter(p => p.index >= 0 && p.index < data.length)
            .map(p => [p.index, p.price]);
          
          series.push({
            name: 'Pivot Lows (LuxAlgo)',
            type: 'scatter',
            data: plData,
            symbol: 'circle',
            symbolSize: 5,
            itemStyle: {
              color: '#ef4444',
              opacity: 0.7
            },
            z: 80
          });
        }

        // Stats badge
        const lastIdx = data.length - 1;
        const statsY = trendlinesResult.currentUpper > 0 
          ? trendlinesResult.currentUpper 
          : data[lastIdx].high * 1.01;
        
        series.push({
          name: 'Trendlines Stats (LuxAlgo)',
          type: 'scatter',
          data: [[lastIdx, statsY]],
          symbol: 'roundRect',
          symbolSize: [120, 55],
          itemStyle: { color: 'rgba(30, 34, 45, 0.9)', borderColor: '#14b8a6', borderWidth: 1 },
          label: {
            show: true,
            formatter: [
              '{title|TRENDLINES}',
              '{up|▲ ' + trendlinesResult.upBreakoutCount + '} {dn|▼ ' + trendlinesResult.downBreakoutCount + '}',
              '{slope|Slope: ' + formatSlopeValue(trendlinesResult.currentSlopeUp) + '}'
            ].join('\n'),
            rich: {
              title: { fontSize: 10, fontWeight: 'bold', color: '#14b8a6', padding: [0, 0, 2, 0] },
              up: { fontSize: 9, color: '#14b8a6' },
              dn: { fontSize: 9, color: '#ef4444' },
              slope: { fontSize: 8, color: '#9ca3af' }
            }
          },
          z: 120
        });

      } catch (error) {
        console.error('[Trendlines Breaks LuxAlgo] Error:', error);
      }
    }

    const yMin = yRange.min !== null ? yRange.min : 'dataMin';
    const yMax = yRange.max !== null ? yRange.max : 'dataMax';

    return {
      backgroundColor: 'transparent',
      animation: false,
      animationThreshold: 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#758696' },
          lineStyle: { color: '#758696', type: 'dashed' },
          label: { 
            backgroundColor: '#2a2e39',
            color: '#d1d4dc',
            borderColor: '#363a45'
          }
        },
        backgroundColor: 'rgba(42, 46, 57, 0.96)',
        borderColor: '#363a45',
        textStyle: { color: '#d1d4dc', fontSize: 12 }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { backgroundColor: '#2a2e39' }
      },
      grid: {
        left: 10,
        right: Y_AXIS_WIDTH,
        top: 20,
        bottom: X_AXIS_HEIGHT + SLIDER_HEIGHT + 5,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#363a45' } },
        axisTick: { show: false },
        axisLabel: { 
          color: '#ffffff',
          fontSize: 11,
          margin: 8
        },
        splitLine: { show: false },
        axisPointer: {
          label: {
            backgroundColor: '#2a2e39',
            color: '#d1d4dc'
          }
        }
      },
      yAxis: {
        type: 'value',
        position: 'right',
        scale: true,
        min: yMin,
        max: yMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#ffffff',
          fontSize: 11,
          inside: false,
          margin: 8,
          formatter: (val: number) => {
            if (val >= 1000) return val.toFixed(0);
            if (val >= 1) return val.toFixed(2);
            return val.toPrecision(4);
          }
        },
        splitLine: { 
          lineStyle: { 
            color: '#2a2e39',
            type: 'dashed'
          } 
        },
        axisPointer: {
          show: true,
          label: {
            backgroundColor: '#2962ff',
            color: '#fff',
            formatter: (p: any) => {
              const v = p.value;
              if (v >= 1000) return v.toFixed(0);
              if (v >= 1) return v.toFixed(2);
              return v.toPrecision(4);
            }
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: xRange.start,
          end: xRange.end,
          zoomOnMouseWheel: false,
          moveOnMouseWheel: false,
          moveOnMouseMove: false
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          start: xRange.start,
          end: xRange.end,
          bottom: 5,
          height: SLIDER_HEIGHT - 5,
          borderColor: 'transparent',
          backgroundColor: 'rgba(47, 51, 65, 0.5)',
          fillerColor: 'rgba(41, 98, 255, 0.2)',
          handleStyle: {
            color: '#2962ff',
            borderColor: '#2962ff'
          },
          moveHandleSize: 8,
          textStyle: { color: '#ffffff', fontSize: 10 },
          dataBackground: {
            lineStyle: { color: '#363a45' },
            areaStyle: { color: 'rgba(54, 58, 69, 0.5)' }
          },
          selectedDataBackground: {
            lineStyle: { color: '#2962ff' },
            areaStyle: { color: 'rgba(41, 98, 255, 0.3)' }
          }
        }
      ],
      series
    };
  }, [data, indicators, xRange, yRange]);

  // Cursor style
  const cursor = useMemo(() => {
    if (dragMode !== 'none') {
      const cursors = { pan: 'grabbing', yScale: 'ns-resize', xScale: 'ew-resize', none: 'default' };
      return cursors[dragMode];
    }
    return 'crosshair';
  }, [dragMode]);

  return (
    <div 
      ref={containerRef}
      className="relative select-none overflow-hidden"
      style={{ 
        height, 
        width: '100%', 
        background: 'linear-gradient(90deg, #030508, #0d3b3b)',
        cursor
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Y-Axis interaction zone */}
      <div
        className="absolute top-0 right-0 z-20"
        style={{ 
          width: Y_AXIS_WIDTH, 
          height: `calc(100% - ${X_AXIS_HEIGHT + SLIDER_HEIGHT}px)`,
          cursor: 'ns-resize',
          background: dragMode === 'yScale' ? 'rgba(41, 98, 255, 0.1)' : 'transparent'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startXRange: { ...xRange },
            startYRange: { ...currentYBounds }
          };
          setDragMode('yScale');
        }}
      />

      {/* X-Axis interaction zone */}
      <div
        className="absolute left-0 z-20"
        style={{ 
          bottom: SLIDER_HEIGHT,
          height: X_AXIS_HEIGHT,
          width: `calc(100% - ${Y_AXIS_WIDTH}px)`,
          cursor: 'ew-resize',
          background: dragMode === 'xScale' ? 'rgba(41, 98, 255, 0.1)' : 'transparent'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startXRange: { ...xRange },
            startYRange: { ...currentYBounds }
          };
          setDragMode('xScale');
        }}
      />

      {/* Main chart interaction overlay - captures wheel events over chart area */}
      <div
        className="absolute z-10 pointer-events-auto"
        style={{ 
          top: 0,
          left: 0,
          width: `calc(100% - ${Y_AXIS_WIDTH}px)`,
          height: `calc(100% - ${X_AXIS_HEIGHT + SLIDER_HEIGHT}px)`,
          cursor: dragMode === 'pan' ? 'grabbing' : 'crosshair'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startXRange: { ...xRange },
            startYRange: { ...currentYBounds }
          };
          setDragMode('pan');
        }}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!data || data.length === 0) return;
          
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const chartW = rect.width;
          
          // اتجاه التكبير: عجلة للأعلى = تكبير، للأسفل = تصغير
          const zoomIn = e.deltaY < 0;
          
          // Ctrl + Wheel = تكبير عمودي
          if (e.ctrlKey) {
            const factor = zoomIn ? 0.88 : 1.14;
            const { min, max } = currentYBounds;
            const range = max - min;
            const center = (min + max) / 2;
            const baseRange = visibleDataRange.max - visibleDataRange.min;
            const newRange = clamp(range * factor, baseRange * 0.1, baseRange * 5);
            setYRange({ min: center - newRange / 2, max: center + newRange / 2 });
            return;
          }
          
          // تكبير أفقي متمركز على موقع المؤشر
          const ratio = clamp(mouseX / chartW, 0, 1);
          const { start, end } = xRange;
          const range = end - start;
          const factor = zoomIn ? 0.82 : 1.22;
          const minR = (MIN_BARS_VISIBLE / data.length) * 100;
          let newRange = clamp(range * factor, minR, 100);
          
          const cursorPos = start + range * ratio;
          let newStart = cursorPos - newRange * ratio;
          let newEnd = newStart + newRange;
          
          if (newStart < 0) { newStart = 0; newEnd = Math.min(newRange, 100); }
          if (newEnd > 100) { newEnd = 100; newStart = Math.max(0, 100 - newRange); }
          
          setXRange({ start: newStart, end: newEnd });
        }}
      />

      {/* ECharts */}
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
        onChartReady={(instance) => {
          chartRef.current = instance;
        }}
      />

      {/* Reset button */}
      <button
        className="absolute top-2 right-20 z-30 px-2 py-1 text-xs bg-[#2a2e39]/90 hover:bg-[#363a45] 
                   text-[#ffffff] hover:text-[#d1d4dc] rounded border border-[#363a45]/50 
                   transition-colors duration-150 backdrop-blur-sm"
        onClick={handleDoubleClick}
        title="Reset zoom (Double-click)"
      >
        ↺ Reset
      </button>

      {/* Zoom indicator */}
      <div className="absolute bottom-8 left-2 z-30 text-[10px] text-[#ffffff]/60 font-mono pointer-events-none">
        {Math.round(xRange.end - xRange.start)}%
      </div>
    </div>
  );
}
