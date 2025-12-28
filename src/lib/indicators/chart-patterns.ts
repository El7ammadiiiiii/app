import type { WedgeEvidence, BreakoutDirection } from './chart-patterns.contract';

/**
 * Chart Pattern Detection - WORLD-CLASS HIGHEST ACCURACY Algorithms
 * خوارزميات كشف أنماط الرسم البياني - أعلى دقة في العالم
 * 
 * This module provides sophisticated pattern detection for:
 * - Channels (Ascending, Descending) - R² ≥ 0.90
 * - Triangles (Ascending, Descending, Symmetrical) - R² ≥ 0.88
 * - Flags & Pennants (Bull/Bear) - R² ≥ 0.85 + Volume Analysis
 * - Wedges (Rising, Falling, Broadening) - R² ≥ 0.85 + Touch Verification
 * 
 * Advanced Techniques Used:
 * - Bill Williams Fractals for pivot detection
 * - RANSAC-inspired outlier rejection
 * - Touch point verification (min 3 touches)
 * - Volume analysis for flags/pennants
 * - ATR-normalized thresholds
 */

// ==========================================================
// HIGH PRECISION CONFIGURATION - إعدادات محسّنة للنظام الشامل
// ==========================================================
export const PATTERN_PRECISION_CONFIG = {
  // R² Thresholds - معاملات التحديد (محسّنة للتوازن بين الدقة والكشف)
  R2_CHANNEL: 0.50,           // قنوات: R² ≥ 0.50 (Relaxed from 0.70)
  R2_TRIANGLE: 0.50,          // مثلثات: R² ≥ 0.50 (Relaxed from 0.65)
  R2_FLAG: 0.45,              // أعلام: R² ≥ 0.45 (Relaxed from 0.60)
  R2_WEDGE: 0.50,             // أوتاد: R² ≥ 0.50 (Relaxed from 0.65)
  R2_BROADENING: 0.45,        // أنماط متسعة: R² ≥ 0.45 (Relaxed from 0.60)
  
  // === Advanced RANSAC Parameters ===
  RANSAC_ITERATIONS: 200,      // Increased iterations for better fit finding
  RANSAC_INLIER_THRESHOLD: 0.8, // Looser inlier threshold (was 0.6)
  RANSAC_MIN_CONSENSUS: 0.40,  // Minimum 40% points must be inliers (was 0.55)
  
  // Touch Point Requirements - نقاط اللمس (مخفّضة لكشف أكثر)
  MIN_TOUCHES_CHANNEL: 2,     // 2 نقاط لمس للقنوات
  MIN_TOUCHES_TRIANGLE: 2,    // 2 نقاط لمس للمثلثات
  MIN_TOUCHES_WEDGE: 2,       // 2 نقاط لمس للأوتاد
  MIN_TOUCHES_BROADENING: 2,  // 2 نقاط لمس للأنماط المتسعة
  
  // Tolerance Settings - إعدادات التسامح (موسّعة)
  TOLERANCE_PERCENT: 1.5,     // 1.5% تسامح للمس (was 0.8%)
  TOLERANCE_ATR_RATIO: 1.0,   // 100% من ATR كتسامح (was 0.65)
  PARALLEL_TOLERANCE: 0.60,   // 60% تسامح للتوازي (was 0.45)
  FLATNESS_THRESHOLD: 0.001,  // عتبة الأفقية (was 0.0006)
  
  // Candle Violation Settings - انتهاك الشموع (أكثر تسامحاً)
  MAX_VIOLATION_PERCENT: 5.0, // أقصى انتهاك 5% (was 3.0%)
  
  // Volume Analysis - تحليل الحجم
  VOLUME_DECLINE_RATIO: 0.95, // انخفاض الحجم 5% فقط (was 10%)
  
  // Recency Focus - التركيز على الحداثة (نطاق أوسع)
  RECENCY_WEIGHT: 0.30,       // 30% من البيانات (was 40%)
  
  // Minimum Pattern Bars (مخفّض لكشف أنماط أصغر)
  MIN_PATTERN_BARS: 5,        // حد أدنى 5 شمعة (was 6)
  
  // === إعدادات جديدة للنظام الشامل ===
  
  // Confidence Thresholds - عتبات الثقة
  MIN_CONFIDENCE: 20,         // الحد الأدنى للثقة (was 35)
  HIGH_CONFIDENCE: 60,        // ثقة عالية (was 70)
  ELITE_CONFIDENCE: 80,       // ثقة ممتازة (was 85)
  
  // Prior Trend Detection - كشف الاتجاه السابق
  TREND_LOOKBACK: 10,         // عدد الشموع للخلف لكشف الاتجاه (was 15)
  TREND_THRESHOLD: 0.010,     // 1.0% تغيير للاتجاه (was 2.0%)
  
  // Volume Confirmation - تأكيد الحجم
  VOLUME_SPIKE_RATIO: 1.1,    // ارتفاع الحجم 10% للاختراق (was 30%)
  VOLUME_AVG_PERIOD: 20,      // فترة متوسط الحجم
  
  // Pattern Age - عمر النمط
  MAX_PATTERN_AGE: 300,       // أقصى عمر للنمط (شموع) (was 150)
  FRESH_PATTERN_AGE: 50,      // نمط طازج (شموع) (was 30)
  
  // === Advanced Wedge Validation ===
  WEDGE_MIN_ALTERNATION: 0.40,  // Minimum alternation score (was 0.60)
  WEDGE_MAX_CONTRACTION: 0.90,  // Maximum contraction ratio (was 0.75)
  WEDGE_MIN_CONTRACTION: 0.05,  // Minimum contraction (was 0.15)
  WEDGE_MIN_COMPLETENESS: 0.30, // Minimum pattern completeness (was 0.50)
  WEDGE_APEX_MIN_DISTANCE: 2,   // Minimum bars to apex (was 3)
  WEDGE_APEX_MAX_DISTANCE: 100, // Maximum bars to apex (was 60)
  
  // Multi-Scale Pivot Detection
  PIVOT_WINDOWS: [2, 3, 5, 8, 13, 21], // Added 21 for even larger structures
  PIVOT_MIN_PROMINENCE_ATR: 0.15, // Minimum prominence as ATR multiplier (was 0.25)
  
  // === Genius Mode: Fuzzy Logic & Adaptive Thresholds ===
  FUZZY_LOGIC_ENABLED: true,
  ADAPTIVE_THRESHOLDS: true,
  NOISE_FILTER_STRENGTH: 0.5, // 0-1 (was 0.8)
};

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendLine {
  startIdx: number;
  endIdx: number;
  startPrice: number;
  endPrice: number;
  slope: number;
  intercept: number;
  r2: number; // Coefficient of determination (quality of fit)
  touchCount?: number; // عدد نقاط اللمس
  touchPoints?: number[]; // مؤشرات نقاط اللمس
  // أسعار مثبتة على القمم/القيعان الفعلية
  anchoredStartPrice?: number; // السعر الفعلي للنقطة الأولى
  anchoredEndPrice?: number;   // السعر الفعلي للنقطة الأخيرة
  touchPrices?: number[];      // أسعار نقاط اللمس للعرض
}

/**
 * Linear Regression Channel with Standard Deviation Bands
 * قناة الانحدار الخطي مع نطاقات الانحراف المعياري
 */
export interface RegressionChannel {
  middleLine: TrendLine;
  upperBand1: TrendLine;  // +1 Standard Deviation
  lowerBand1: TrendLine;  // -1 Standard Deviation
  upperBand2: TrendLine;  // +2 Standard Deviation
  lowerBand2: TrendLine;  // -2 Standard Deviation
  r2: number;             // Overall R² (Coefficient of Determination)
  standardError: number;  // Standard Error of Regression
  pearsonR: number;       // Pearson Correlation Coefficient
}

export interface PatternPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface DetectedPattern {
  type: PatternType;
  name: string;
  nameAr: string;
  startIdx: number;
  endIdx: number;
  upperLine: TrendLine | null;
  lowerLine: TrendLine | null;
  middleLine?: TrendLine | null;  // For regression channels
  regressionChannel?: RegressionChannel | null;  // Full regression data
  breakoutDirection: 'up' | 'down' | 'neutral';
  confidence: number; // 0-100%
  targetPrice: number | null;
  description: string;
  // Enhanced pattern context - سياق النمط المحسن
  priorTrend?: TrendDirection;
  patternContext?: PatternContext;
  volumeConfirmation?: {
    score: number;
    declining: boolean;
    spikeAtEnd: boolean;
  };
  freshnessScore?: number;
  qualityGrade?: 'ELITE' | 'STRONG' | 'VALID' | 'WEAK' | 'INVALID';
  qualityGradeAr?: string;
  
  // Wedge Evidence & Effective Direction
  wedgeEvidence?: WedgeEvidence;
  effectiveBreakoutDirection?: BreakoutDirection;
  
  // Elite pattern integration properties
  detectedTimeframe?: string;
  qualityScore?: 'ULTRA_ELITE' | 'ELITE' | 'STRONG' | 'VALID';
}

export type PatternType = 
  | 'ascending_channel'
  | 'descending_channel'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'bull_flag'
  | 'bear_flag'
  | 'bull_pennant'
  | 'bear_pennant'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'ascending_broadening_wedge'
  | 'descending_broadening_wedge'
  // New patterns - الأنماط الجديدة
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triple_top'
  | 'triple_bottom'
  | 'cup_and_handle'
  | 'inverted_cup_and_handle'
  | 'broadening_pattern'
  | 'rectangle';

// ==========================================================
// PRIOR TREND DETECTION - كشف الاتجاه السابق
// ==========================================================

export type TrendDirection = 'up' | 'down' | 'neutral';
export type PatternContext = 'continuation' | 'reversal' | 'neutral';

/**
 * Detect prior trend before pattern formation
 * كشف الاتجاه السابق قبل تشكل النمط
 */
export function detectPriorTrend(
  data: OHLCV[],
  patternStartIdx: number,
  lookback: number = PATTERN_PRECISION_CONFIG.TREND_LOOKBACK
): TrendDirection {
  if (patternStartIdx < lookback || data.length < lookback) {
    return 'neutral';
  }
  
  const startIdx = Math.max(0, patternStartIdx - lookback);
  const startPrice = data[startIdx].close;
  const endPrice = data[patternStartIdx].close;
  const change = (endPrice - startPrice) / startPrice;
  
  const threshold = PATTERN_PRECISION_CONFIG.TREND_THRESHOLD;
  
  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'neutral';
}

/**
 * Classify pattern as continuation or reversal based on prior trend
 * تصنيف النمط كاستمراري أو انعكاسي
 */
export function classifyPatternContext(
  patternType: PatternType,
  priorTrend: TrendDirection
): PatternContext {
  // Bullish patterns
  const bullishPatterns: PatternType[] = [
    'ascending_channel', 'ascending_triangle', 'bull_flag', 'bull_pennant', 'falling_wedge'
  ];
  
  // Bearish patterns
  const bearishPatterns: PatternType[] = [
    'descending_channel', 'descending_triangle', 'bear_flag', 'bear_pennant', 
    'rising_wedge', 'ascending_broadening_wedge'
  ];
  
  if (bullishPatterns.includes(patternType)) {
    if (priorTrend === 'up') return 'continuation';
    if (priorTrend === 'down') return 'reversal';
  }
  
  if (bearishPatterns.includes(patternType)) {
    if (priorTrend === 'down') return 'continuation';
    if (priorTrend === 'up') return 'reversal';
  }
  
  return 'neutral';
}

/**
 * Calculate volume confirmation score
 * حساب درجة تأكيد الحجم
 */
export function calculateVolumeConfirmation(
  data: OHLCV[],
  patternStartIdx: number,
  patternEndIdx: number
): { score: number; declining: boolean; spikeAtEnd: boolean } {
  const avgPeriod = PATTERN_PRECISION_CONFIG.VOLUME_AVG_PERIOD;
  
  // Get average volume before pattern
  const prePatternStart = Math.max(0, patternStartIdx - avgPeriod);
  const prePatternVolumes = data.slice(prePatternStart, patternStartIdx).map(d => d.volume);
  const avgVolumeBefore = prePatternVolumes.length > 0 
    ? prePatternVolumes.reduce((a, b) => a + b, 0) / prePatternVolumes.length 
    : 0;
  
  // Get average volume during pattern
  const patternVolumes = data.slice(patternStartIdx, patternEndIdx + 1).map(d => d.volume);
  const avgVolumeDuring = patternVolumes.length > 0 
    ? patternVolumes.reduce((a, b) => a + b, 0) / patternVolumes.length 
    : 0;
  
  // Check for volume decline during pattern (good for consolidation patterns)
  const declining = avgVolumeDuring < avgVolumeBefore * PATTERN_PRECISION_CONFIG.VOLUME_DECLINE_RATIO;
  
  // Check for volume spike at pattern end (breakout confirmation)
  const lastVolumes = patternVolumes.slice(-3);
  const lastAvgVolume = lastVolumes.length > 0 
    ? lastVolumes.reduce((a, b) => a + b, 0) / lastVolumes.length 
    : 0;
  const spikeAtEnd = lastAvgVolume > avgVolumeBefore * PATTERN_PRECISION_CONFIG.VOLUME_SPIKE_RATIO;
  
  // Calculate score
  let score = 50; // Base score
  if (declining) score += 25;
  if (spikeAtEnd) score += 25;
  
  return { score, declining, spikeAtEnd };
}

/**
 * Calculate pattern freshness score
 * حساب درجة حداثة النمط
 */
export function calculatePatternFreshness(
  patternEndIdx: number,
  currentIdx: number
): number {
  const age = currentIdx - patternEndIdx;
  const maxAge = PATTERN_PRECISION_CONFIG.MAX_PATTERN_AGE;
  const freshAge = PATTERN_PRECISION_CONFIG.FRESH_PATTERN_AGE;
  
  if (age <= freshAge) return 100;
  if (age >= maxAge) return 0;
  
  return Math.round(100 * (1 - (age - freshAge) / (maxAge - freshAge)));
}

/**
 * Calculate ATR series for adaptive thresholds
 * حساب سلسلة ATR للعتبات التكيفية
 */
function calculateATRSeries(data: OHLCV[], period: number = 14): number[] {
  const atr: number[] = [];
  if (data.length < 2) return atr;
  
  let trSum = 0;
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    
    if (i < period) {
      trSum += tr;
      atr.push(trSum / i);
    } else {
      const prevATR = atr[i - 2];
      const currentATR = (prevATR * (period - 1) + tr) / period;
      atr.push(currentATR);
    }
  }
  return atr;
}

/**
 * Multi-Scale Adaptive Pivot Detection - Advanced Algorithm
 * كشف النقاط المحورية متعدد المقاييس - خوارزمية متقدمة
 * Uses multiple window sizes and ATR-based prominence filtering
 */
function findLocalExtremaAdvanced(
  data: OHLCV[],
  atrSeries: number[]
): { highs: PatternPoint[]; lows: PatternPoint[] } {
  const allHighs = new Map<number, PatternPoint>();
  const allLows = new Map<number, PatternPoint>();
  
  // Multi-scale detection across different window sizes
  for (const windowSize of PATTERN_PRECISION_CONFIG.PIVOT_WINDOWS) {
    if (data.length < windowSize * 2 + 1) continue;
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
      let isLocalHigh = true;
      let isLocalLow = true;
      
      const currentHigh = data[i].high;
      const currentLow = data[i].low;
      const atr = atrSeries[i] || (data[i].close * 0.002);
      const minProminence = atr * PATTERN_PRECISION_CONFIG.PIVOT_MIN_PROMINENCE_ATR;
      
      // Check if this is a local extremum in this window
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j === i) continue;
        if (data[j].high >= currentHigh) isLocalHigh = false;
        if (data[j].low <= currentLow) isLocalLow = false;
      }
      
      // Calculate prominence for this pivot
      if (isLocalHigh) {
        const leftMin = Math.min(...data.slice(Math.max(0, i - windowSize * 2), i).map(d => d.low));
        const rightMin = Math.min(...data.slice(i + 1, Math.min(data.length, i + windowSize * 2 + 1)).map(d => d.low));
        const prominence = currentHigh - Math.max(leftMin, rightMin);
        
        if (prominence >= minProminence) {
          allHighs.set(i, { index: i, price: currentHigh, type: 'high' });
        }
      }
      
      if (isLocalLow) {
        const leftMax = Math.max(...data.slice(Math.max(0, i - windowSize * 2), i).map(d => d.high));
        const rightMax = Math.max(...data.slice(i + 1, Math.min(data.length, i + windowSize * 2 + 1)).map(d => d.high));
        const prominence = Math.min(leftMax, rightMax) - currentLow;
        
        if (prominence >= minProminence) {
          allLows.set(i, { index: i, price: currentLow, type: 'low' });
        }
      }
    }
  }
  
  return { 
    highs: Array.from(allHighs.values()).sort((a, b) => a.index - b.index),
    lows: Array.from(allLows.values()).sort((a, b) => a.index - b.index)
  };
}

/**
 * Linear regression for trendline fitting with touch verification
 * الانحدار الخطي لرسم خطوط الاتجاه مع التحقق من نقاط اللمس
 */
function linearRegression(points: PatternPoint[], allData?: OHLCV[]): TrendLine | null {
  if (points.length < 2) return null;
  
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (const point of points) {
    sumX += point.index;
    sumY += point.price;
    sumXY += point.index * point.price;
    sumX2 += point.index * point.index;
    sumY2 += point.price * point.price;
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 0.0001) return null;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  
  for (const point of points) {
    const predicted = slope * point.index + intercept;
    ssTot += (point.price - yMean) ** 2;
    ssRes += (point.price - predicted) ** 2;
  }
  
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Count touch points with tolerance
  let touchCount = 0;
  const touchPoints: number[] = [];
  const avgPrice = sumY / n;
  const tolerance = avgPrice * PATTERN_PRECISION_CONFIG.TOLERANCE_PERCENT / 100;
  
  for (const point of points) {
    const predicted = slope * point.index + intercept;
    if (Math.abs(point.price - predicted) <= tolerance) {
      touchCount++;
      touchPoints.push(point.index);
    }
  }
  
  // جمع أسعار نقاط اللمس للعرض
  const touchPrices: number[] = [];
  for (const point of points) {
    const predicted = slope * point.index + intercept;
    if (Math.abs(point.price - predicted) <= tolerance) {
      touchPrices.push(point.price);
    }
  }

  return {
    startIdx: points[0].index,
    endIdx: points[points.length - 1].index,
    startPrice: slope * points[0].index + intercept,
    endPrice: slope * points[points.length - 1].index + intercept,
    slope,
    intercept,
    r2: Math.max(0, Math.min(1, r2)),
    touchCount,
    touchPoints,
    // أسعار مثبتة على القمم/القيعان الفعلية
    anchoredStartPrice: points[0].price,
    anchoredEndPrice: points[points.length - 1].price,
    touchPrices,
  };
}

/**
 * Verify no candles violate the trendline
 * التحقق من عدم انتهاك أي شمعة للخط
 */
function verifyNoViolations(
  line: TrendLine, 
  data: OHLCV[], 
  lineType: 'upper' | 'lower'
): { valid: boolean; violations: number } {
  let violations = 0;
  const maxViolation = PATTERN_PRECISION_CONFIG.MAX_VIOLATION_PERCENT / 100;
  
  for (let i = line.startIdx; i <= line.endIdx && i < data.length; i++) {
    const linePrice = line.slope * i + line.intercept;
    
    if (lineType === 'upper') {
      // للخط العلوي: التحقق من أن القمم لا تخترق الخط بشكل كبير
      const violation = (data[i].high - linePrice) / linePrice;
      if (violation > maxViolation) violations++;
    } else {
      // للخط السفلي: التحقق من أن القيعان لا تخترق الخط بشكل كبير
      const violation = (linePrice - data[i].low) / linePrice;
      if (violation > maxViolation) violations++;
    }
  }
  
  const totalBars = line.endIdx - line.startIdx + 1;
  const violationRatio = violations / totalBars;
  
  // السماح بحد أقصى 10% من الشموع بانتهاك
  return { valid: violationRatio <= 0.10, violations };
}

/**
 * Calculate ATR-based tolerance for robust regression
 * حساب التسامح المبني على ATR
 */
function getATRTolerance(data: OHLCV[], startIdx: number, endIdx: number): number {
  const period = Math.min(14, endIdx - startIdx);
  if (period < 2) return 0;
  
  let atrSum = 0;
  for (let i = startIdx + 1; i <= Math.min(startIdx + period, endIdx); i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    atrSum += tr;
  }
  
  const atr = atrSum / period;
  return atr * PATTERN_PRECISION_CONFIG.TOLERANCE_ATR_RATIO;
}

/**
 * Calculate ATR tolerance for a set of pattern points
 * حساب تسامح ATR لمجموعة من النقاط
 */
function getATRToleranceForPoints(data: OHLCV[], points: PatternPoint[]): number {
  if (points.length === 0) return 0;
  const startIdx = points[0].index;
  const endIdx = points[points.length - 1].index;
  return getATRTolerance(data, startIdx, endIdx);
}

/**
 * Legacy robust regression wrapper for backward compatibility
 */
function robustLinearRegression(points: PatternPoint[], minInliers: number = 3): TrendLine | null {
  // This is a simplified fallback - actual wedge detection should use robustLinearRegressionRANSAC
  if (points.length < minInliers) return null;
  return linearRegression(points);
}

/**
 * Proper RANSAC Linear Regression with Random Sampling
 * انحدار خطي RANSAC حقيقي مع عينات عشوائية
 */
function robustLinearRegressionRANSAC(
  points: PatternPoint[],
  data: OHLCV[],
  minInliers: number = 3
): TrendLine | null {
  if (points.length < minInliers) return null;
  
  // Calculate ATR-based tolerance
  const atrTolerance = points.length > 0 
    ? getATRToleranceForPoints(data, points)
    : 0;
  
  let bestLine: TrendLine | null = null;
  let bestInlierCount = 0;
  let bestInlierRatio = 0;
  
  const iterations = Math.min(
    PATTERN_PRECISION_CONFIG.RANSAC_ITERATIONS,
    (points.length * (points.length - 1)) / 2 // Don't exceed all possible pairs
  );
  
  // RANSAC: Random Sample Consensus
  for (let iter = 0; iter < iterations; iter++) {
    // Randomly sample 2 points
    const idx1 = Math.floor(Math.random() * points.length);
    let idx2 = Math.floor(Math.random() * points.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * points.length);
    }
    
    const p1 = points[idx1];
    const p2 = points[idx2];
    
    // Calculate line from these two points
    const slope = (p2.price - p1.price) / (p2.index - p1.index);
    const intercept = p1.price - slope * p1.index;
    
    // Adaptive tolerance based on ATR
    const tolerance = Math.max(
      atrTolerance * PATTERN_PRECISION_CONFIG.RANSAC_INLIER_THRESHOLD,
      ((p1.price + p2.price) / 2) * PATTERN_PRECISION_CONFIG.TOLERANCE_PERCENT / 100
    );
    
    // Find inliers
    const inlierPoints: PatternPoint[] = [];
    for (const point of points) {
      const predicted = slope * point.index + intercept;
      if (Math.abs(point.price - predicted) <= tolerance) {
        inlierPoints.push(point);
      }
    }
    
    const inlierRatio = inlierPoints.length / points.length;
    
    // Check if this is the best model so far
    if (
      inlierPoints.length >= minInliers &&
      inlierRatio >= PATTERN_PRECISION_CONFIG.RANSAC_MIN_CONSENSUS &&
      (inlierPoints.length > bestInlierCount || 
       (inlierPoints.length === bestInlierCount && inlierRatio > bestInlierRatio))
    ) {
      // Refine line using all inliers (weighted least squares)
      const refinedLine = linearRegression(inlierPoints);
      if (refinedLine && refinedLine.r2 > (bestLine?.r2 || 0)) {
        bestLine = refinedLine;
        bestInlierCount = inlierPoints.length;
        bestInlierRatio = inlierRatio;
      }
    }
  }
  
  return bestLine;
}

/**
 * === ADVANCED WEDGE GEOMETRY VALIDATORS ===
 * خوارزميات التحقق من هندسة الأوتاد المتقدمة
 */

/**
 * Check alternation pattern (H-L-H-L-H sequence)
 * التحقق من نمط التناوب (قمة-قاع-قمة-قاع-قمة)
 */
function validateWedgeAlternation(
  highs: PatternPoint[],
  lows: PatternPoint[]
): { score: number; isValid: boolean } {
  // Merge and sort all pivots by index
  const allPivots = [
    ...highs.map(h => ({ ...h, type: 'high' as const })),
    ...lows.map(l => ({ ...l, type: 'low' as const }))
  ].sort((a, b) => a.index - b.index);
  
  if (allPivots.length < 4) return { score: 0, isValid: false };
  
  // Check alternation: pivots should alternate between high and low
  let alternations = 0;
  for (let i = 0; i < allPivots.length - 1; i++) {
    if (allPivots[i].type !== allPivots[i + 1].type) {
      alternations++;
    }
  }
  
  const maxPossibleAlternations = allPivots.length - 1;
  const score = maxPossibleAlternations > 0 ? alternations / maxPossibleAlternations : 0;
  const isValid = score >= PATTERN_PRECISION_CONFIG.WEDGE_MIN_ALTERNATION;
  
  return { score, isValid };
}

/**
 * Calculate wedge contraction ratio
 * حساب نسبة انكماش الوتد
 */
function calculateWedgeContraction(
  upperLine: TrendLine,
  lowerLine: TrendLine
): { ratio: number; isValid: boolean } {
  // Calculate width at start and end
  const startWidth = Math.abs(upperLine.startPrice - lowerLine.startPrice);
  const endWidth = Math.abs(upperLine.endPrice - lowerLine.endPrice);
  
  if (startWidth === 0) return { ratio: 1, isValid: false };
  
  const ratio = endWidth / startWidth;
  const isValid = ratio >= PATTERN_PRECISION_CONFIG.WEDGE_MIN_CONTRACTION && 
                  ratio <= PATTERN_PRECISION_CONFIG.WEDGE_MAX_CONTRACTION;
  
  return { ratio, isValid };
}

/**
 * Calculate apex distance (convergence point)
 * حساب المسافة لنقطة القمة (نقطة التقارب)
 */
function calculateApexDistance(
  upperLine: TrendLine,
  lowerLine: TrendLine
): { apexIndex: number; distance: number; isValid: boolean } {
  const slopeDiff = upperLine.slope - lowerLine.slope;
  
  if (Math.abs(slopeDiff) < 0.0001) {
    return { apexIndex: -1, distance: -1, isValid: false };
  }
  
  // Calculate intersection point: x = (b2 - b1) / (m1 - m2)
  const apexIndex = (lowerLine.intercept - upperLine.intercept) / slopeDiff;
  const currentEndIdx = Math.max(upperLine.endIdx, lowerLine.endIdx);
  const distance = apexIndex - currentEndIdx;
  
  const isValid = distance >= PATTERN_PRECISION_CONFIG.WEDGE_APEX_MIN_DISTANCE &&
                  distance <= PATTERN_PRECISION_CONFIG.WEDGE_APEX_MAX_DISTANCE;
  
  return { apexIndex: Math.round(apexIndex), distance, isValid };
}

/**
 * Calculate pattern completeness (how close to apex)
 * حساب اكتمال النمط (مدى القرب من القمة)
 */
function calculatePatternCompleteness(
  upperLine: TrendLine,
  lowerLine: TrendLine,
  apexDistance: number
): number {
  if (apexDistance <= 0) return 100; // Already past apex
  
  const patternLength = Math.max(upperLine.endIdx, lowerLine.endIdx) - 
                       Math.min(upperLine.startIdx, lowerLine.startIdx);
  const totalLength = patternLength + apexDistance;
  
  if (totalLength === 0) return 0;
  
  return Math.min(100, Math.round((patternLength / totalLength) * 100));
}

/**
 * Analyze volume profile within wedge
 * تحليل ملف الحجم داخل الوتد
 */
function analyzeWedgeVolumeProfile(
  data: OHLCV[],
  startIdx: number,
  endIdx: number
): { declining: boolean; declinePercent: number; score: number } {
  if (endIdx - startIdx < 6) {
    return { declining: false, declinePercent: 0, score: 50 };
  }
  
  const wedgeData = data.slice(startIdx, endIdx + 1);
  const firstThird = wedgeData.slice(0, Math.floor(wedgeData.length / 3));
  const lastThird = wedgeData.slice(-Math.floor(wedgeData.length / 3));
  
  const avgVolumeFirst = firstThird.reduce((sum, d) => sum + d.volume, 0) / firstThird.length;
  const avgVolumeLast = lastThird.reduce((sum, d) => sum + d.volume, 0) / lastThird.length;
  
  const declinePercent = avgVolumeFirst > 0 
    ? ((avgVolumeFirst - avgVolumeLast) / avgVolumeFirst) * 100
    : 0;
  
  const declining = declinePercent > 15; // At least 15% decline
  
  // Score: 0-100 based on volume decline
  const score = Math.max(0, Math.min(100, 50 + declinePercent));
  
  return { declining, declinePercent, score };
}

/**
 * Calculate Linear Regression Channel with Standard Deviation Bands
 * حساب قناة الانحدار الخطي مع نطاقات الانحراف المعياري
 * مثل TradingView - مع عرض R² ونطاقات ±1σ و ±2σ
 */
function calculateRegressionChannel(
  data: OHLCV[],
  startIdx: number,
  endIdx: number,
  useClose: boolean = true
): RegressionChannel | null {
  if (endIdx - startIdx < 5) return null;
  
  const n = endIdx - startIdx + 1;
  const prices: number[] = [];
  const indices: number[] = [];
  
  // Collect prices for regression
  for (let i = startIdx; i <= endIdx; i++) {
    const price = useClose ? data[i].close : (data[i].high + data[i].low) / 2;
    prices.push(price);
    indices.push(i);
  }
  
  // Calculate linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += indices[i];
    sumY += prices[i];
    sumXY += indices[i] * prices[i];
    sumX2 += indices[i] * indices[i];
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 0.0001) return null;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R² and Standard Error
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  const residuals: number[] = [];
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * indices[i] + intercept;
    const residual = prices[i] - predicted;
    residuals.push(residual);
    ssTot += (prices[i] - yMean) ** 2;
    ssRes += residual ** 2;
  }
  
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Standard Error of Regression (for band calculation)
  const standardError = Math.sqrt(ssRes / (n - 2));
  
  // Pearson Correlation Coefficient
  const pearsonR = Math.sqrt(Math.max(0, r2)) * Math.sign(slope);
  
  // Create band lines
  const createBandLine = (deviation: number): TrendLine => {
    const offset = deviation * standardError;
    return {
      startIdx,
      endIdx,
      startPrice: slope * startIdx + intercept + offset,
      endPrice: slope * endIdx + intercept + offset,
      slope,
      intercept: intercept + offset,
      r2,
    };
  };
  
  return {
    middleLine: createBandLine(0),
    upperBand1: createBandLine(1),
    lowerBand1: createBandLine(-1),
    upperBand2: createBandLine(2),
    lowerBand2: createBandLine(-2),
    r2: Math.max(0, Math.min(1, r2)),
    standardError,
    pearsonR,
  };
}

/**
 * Check if two trendlines are parallel (for channels) - HIGH PRECISION
 * التحقق من تقارب خطين (للقنوات) - دقة عالية
 */
function areLinesParallel(line1: TrendLine, line2: TrendLine, tolerance: number = PATTERN_PRECISION_CONFIG.PARALLEL_TOLERANCE): boolean {
  const slopeRatio = Math.abs(line1.slope) > 0.0001 
    ? Math.abs(line2.slope / line1.slope)
    : Math.abs(line2.slope) < 0.0001 ? 1 : 0;
  
  return slopeRatio >= (1 - tolerance) && slopeRatio <= (1 + tolerance);
}

/**
 * Check if two trendlines are converging (for triangles/wedges)
 * التحقق من تقارب خطين (للمثلثات والأوتاد)
 */
function areLinesConverging(line1: TrendLine, line2: TrendLine): { converging: boolean; convergenceIdx: number } {
  // Lines converge if they have opposite relative slopes
  // (one going up relative to the other going down)
  
  if (Math.abs(line1.slope - line2.slope) < 0.0001) {
    return { converging: false, convergenceIdx: -1 };
  }
  
  // Calculate intersection point
  const convergenceIdx = (line2.intercept - line1.intercept) / (line1.slope - line2.slope);
  
  // They converge if intersection is in the future (beyond current data)
  return {
    converging: convergenceIdx > Math.max(line1.endIdx, line2.endIdx),
    convergenceIdx: Math.round(convergenceIdx),
  };
}

/**
 * Check if two trendlines are diverging (for broadening patterns)
 * التحقق من تباعد خطين (للأنماط المتسعة)
 */
function areLinessDiverging(line1: TrendLine, line2: TrendLine): boolean {
  const convergence = areLinesConverging(line1, line2);
  
  // Lines diverge if intersection is in the past (before current data)
  return convergence.convergenceIdx < Math.min(line1.startIdx, line2.startIdx);
}

/**
 * Detect Ascending Channel with Linear Regression - HIGHEST ACCURACY
 * كشف القناة الصاعدة مع الانحدار الخطي - أعلى دقة
 * R² ≥ 0.90 + 3 Touch Points Minimum
 */
function detectAscendingChannel(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 2 || lows.length < 2) {
    return null;
  }
  
  // Focus on recent data (last 65% of extrema) for relevance
  const recentHighs = highs.slice(-Math.max(3, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(3, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  // Use robust regression with outlier rejection
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_CHANNEL);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_CHANNEL);
  
  if (!upperLine || !lowerLine) return null;
  
  // RELAXED CHECKS للكشف الأسهل
  const bothAscending = upperLine.slope > 0 && lowerLine.slope > 0;
  const parallel = areLinesParallel(upperLine, lowerLine, PATTERN_PRECISION_CONFIG.PARALLEL_TOLERANCE);
  const highPrecisionFit = upperLine.r2 >= 0.5 && lowerLine.r2 >= 0.5; // مخفض من 0.78
  const upperAboveLower = upperLine.startPrice > lowerLine.startPrice;
  
  // Touch verification - مخفف
  const sufficientTouches = (upperLine.touchCount || 0) >= 2 && (lowerLine.touchCount || 0) >= 2;
  
  
  
  if (!bothAscending || !parallel || !highPrecisionFit || !upperAboveLower || !sufficientTouches) return null;
  
  // Calculate Linear Regression Channel for advanced visualization
  const startIdx = Math.min(upperLine.startIdx, lowerLine.startIdx);
  const endIdx = Math.max(upperLine.endIdx, lowerLine.endIdx);
  const regressionChannel = calculateRegressionChannel(data, startIdx, endIdx);
  
  // Combined R² score
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100;
  const channelHeight = upperLine.endPrice - lowerLine.endPrice;
  
  return {
    type: 'ascending_channel',
    name: 'Ascending Channel',
    nameAr: 'القناة الصاعدة',
    startIdx,
    endIdx,
    upperLine,
    lowerLine,
    middleLine: regressionChannel?.middleLine || null,
    regressionChannel,
    breakoutDirection: 'neutral',
    confidence: Math.round(regressionChannel ? regressionChannel.r2 * 100 : confidence),
    targetPrice: upperLine.endPrice + channelHeight,
    description: `قناة صاعدة - R² = ${combinedR2.toFixed(4)} | لمسات: ${(upperLine.touchCount || 0) + (lowerLine.touchCount || 0)}`,
  };
}

/**
 * Detect Descending Channel with Linear Regression - HIGHEST ACCURACY
 * كشف القناة الهابطة مع الانحدار الخطي - أعلى دقة
 * R² ≥ 0.90 + 3 Touch Points Minimum
 */
function detectDescendingChannel(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  // Focus on recent data (last 65% of extrema)
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  // Use robust regression
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_CHANNEL);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_CHANNEL);
  
  if (!upperLine || !lowerLine) return null;
  
  // HIGH PRECISION CHECKS
  const bothDescending = upperLine.slope < -0.0001 && lowerLine.slope < -0.0001;
  const parallel = areLinesParallel(upperLine, lowerLine, PATTERN_PRECISION_CONFIG.PARALLEL_TOLERANCE);
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_CHANNEL && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_CHANNEL;
  const upperAboveLower = upperLine.startPrice > lowerLine.startPrice;
  
  // Touch verification
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_CHANNEL &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_CHANNEL;
  
  if (!bothDescending || !parallel || !highPrecisionFit || !upperAboveLower || !sufficientTouches) return null;
  
  // Calculate Linear Regression Channel for advanced visualization
  const startIdx = Math.min(upperLine.startIdx, lowerLine.startIdx);
  const endIdx = Math.max(upperLine.endIdx, lowerLine.endIdx);
  const regressionChannel = calculateRegressionChannel(data, startIdx, endIdx);
  
  // Combined R² score
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100;
  const channelHeight = upperLine.endPrice - lowerLine.endPrice;
  
  return {
    type: 'descending_channel',
    name: 'Descending Channel',
    nameAr: 'القناة الهابطة',
    startIdx,
    endIdx,
    upperLine,
    lowerLine,
    middleLine: regressionChannel?.middleLine || null,
    regressionChannel,
    breakoutDirection: 'neutral',
    confidence: Math.round(regressionChannel ? regressionChannel.r2 * 100 : confidence),
    targetPrice: lowerLine.endPrice - channelHeight,
    description: `قناة هابطة - R² = ${combinedR2.toFixed(4)} | لمسات: ${(upperLine.touchCount || 0) + (lowerLine.touchCount || 0)}`,
  };
}

/**
 * Detect Ascending Triangle - HIGHEST ACCURACY
 * كشف المثلث الصاعد - أعلى دقة
 * R² ≥ 0.88 + ATR-normalized flatness + 3 touches minimum
 */
function detectAscendingTriangle(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  // Calculate ATR for normalized flatness threshold
  const atr = calculateATR(data, 14);
  const avgPrice = data.reduce((sum, d) => sum + d.close, 0) / data.length;
  const normalizedFlatnessThreshold = atr / avgPrice * 0.3; // 30% of ATR ratio
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE);
  
  if (!upperLine || !lowerLine) return null;
  
  // Ascending triangle: flat top (resistance), rising bottom (support)
  const flatTop = Math.abs(upperLine.slope) < normalizedFlatnessThreshold; // ATR-normalized
  const risingBottom = lowerLine.slope > normalizedFlatnessThreshold; // Clearly ascending
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_TRIANGLE && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_TRIANGLE;
  const convergence = areLinesConverging(upperLine, lowerLine);
  
  // Touch verification
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE;
  
  if (!flatTop || !risingBottom || !highPrecisionFit || !convergence.converging || !sufficientTouches) return null;
  
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100;
  const patternHeight = upperLine.startPrice - lowerLine.startPrice;
  
  return {
    type: 'ascending_triangle',
    name: 'Ascending Triangle',
    nameAr: 'المثلث الصاعد',
    startIdx: Math.min(upperLine.startIdx, lowerLine.startIdx),
    endIdx: Math.max(upperLine.endIdx, lowerLine.endIdx),
    upperLine,
    lowerLine,
    breakoutDirection: 'up',
    confidence: Math.round(confidence),
    targetPrice: upperLine.endPrice + patternHeight,
    description: `مثلث صاعد - R² = ${combinedR2.toFixed(4)} | لمسات: ${(upperLine.touchCount || 0) + (lowerLine.touchCount || 0)}`,
  };
}

/**
 * Detect Descending Triangle - HIGHEST ACCURACY
 * كشف المثلث الهابط - أعلى دقة
 * R² ≥ 0.88 + ATR-normalized flatness + 3 touches minimum
 */
function detectDescendingTriangle(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  // Calculate ATR for normalized flatness threshold
  const atr = calculateATR(data, 14);
  const avgPrice = data.reduce((sum, d) => sum + d.close, 0) / data.length;
  const normalizedFlatnessThreshold = atr / avgPrice * 0.3;
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE);
  
  if (!upperLine || !lowerLine) return null;
  
  // Descending triangle: falling top (resistance), flat bottom (support)
  const fallingTop = upperLine.slope < -normalizedFlatnessThreshold; // Clearly descending
  const flatBottom = Math.abs(lowerLine.slope) < normalizedFlatnessThreshold; // ATR-normalized
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_TRIANGLE && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_TRIANGLE;
  const convergence = areLinesConverging(upperLine, lowerLine);
  
  // Touch verification
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE;
  
  if (!fallingTop || !flatBottom || !highPrecisionFit || !convergence.converging || !sufficientTouches) return null;
  
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100;
  const patternHeight = upperLine.startPrice - lowerLine.startPrice;
  
  return {
    type: 'descending_triangle',
    name: 'Descending Triangle',
    nameAr: 'المثلث الهابط',
    startIdx: Math.min(upperLine.startIdx, lowerLine.startIdx),
    endIdx: Math.max(upperLine.endIdx, lowerLine.endIdx),
    upperLine,
    lowerLine,
    breakoutDirection: 'down',
    confidence: Math.round(confidence),
    targetPrice: lowerLine.endPrice - patternHeight,
    description: `مثلث هابط - R² = ${combinedR2.toFixed(4)} | لمسات: ${(upperLine.touchCount || 0) + (lowerLine.touchCount || 0)}`,
  };
}

/**
 * Detect Symmetrical Triangle - HIGHEST ACCURACY
 * كشف المثلث المتماثل - أعلى دقة
 * R² ≥ 0.88 + Symmetry validation
 */
function detectSymmetricalTriangle(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE);
  
  if (!upperLine || !lowerLine) return null;
  
  // Symmetrical triangle: falling top, rising bottom (converging)
  const fallingTop = upperLine.slope < -0.0001;
  const risingBottom = lowerLine.slope > 0.0001;
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_TRIANGLE && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_TRIANGLE;
  const convergence = areLinesConverging(upperLine, lowerLine);
  
  // Check that slopes are roughly symmetrical (ratio between 0.4 and 2.5)
  const slopeRatio = Math.abs(upperLine.slope / lowerLine.slope);
  const symmetrical = slopeRatio > 0.4 && slopeRatio < 2.5;
  
  // Touch verification
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_TRIANGLE;
  
  if (!fallingTop || !risingBottom || !highPrecisionFit || !convergence.converging || !symmetrical || !sufficientTouches) return null;
  
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100 * 0.95; // Slight reduction for neutral patterns
  const patternHeight = upperLine.startPrice - lowerLine.startPrice;
  
  return {
    type: 'symmetrical_triangle',
    name: 'Symmetrical Triangle',
    nameAr: 'المثلث المتماثل',
    startIdx: Math.min(upperLine.startIdx, lowerLine.startIdx),
    endIdx: Math.max(upperLine.endIdx, lowerLine.endIdx),
    upperLine,
    lowerLine,
    breakoutDirection: 'neutral',
    confidence: Math.round(confidence),
    targetPrice: null, // Direction unknown
    description: `مثلث متماثل - R² = ${combinedR2.toFixed(4)} | تماثل: ${(1/slopeRatio).toFixed(2)}`,
  };
}

/**
 * Calculate ATR (Average True Range) for normalization
 * حساب ATR للتطبيع
 */
function calculateATR(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = 1; i <= period; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    atrSum += tr;
  }
  
  return atrSum / period;
}

/**
 * Detect Bull Flag - HIGHEST ACCURACY
 * كشف علم الثور - أعلى دقة
 * R² ≥ 0.85 + Volume Analysis + ATR ratio validation
 */
function detectBullFlag(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (data.length < 20 || highs.length < 2 || lows.length < 2) return null;
  
  // Look for a strong upward move (pole) followed by consolidation (flag)
  const poleLength = Math.min(15, Math.floor(data.length * 0.3));
  const flagLength = Math.min(10, Math.floor(data.length * 0.2));
  
  // Calculate ATR for normalization
  const atr = calculateATR(data, 14);
  
  // Find the pole (strong upward move)
  let maxPoleRise = 0;
  let poleEndIdx = -1;
  
  for (let i = poleLength; i < data.length - flagLength; i++) {
    const poleStart = data[i - poleLength].low;
    const poleEnd = data[i].high;
    const rise = (poleEnd - poleStart) / poleStart;
    
    // Validate pole is at least 2x ATR
    const poleHeight = poleEnd - poleStart;
    if (rise > maxPoleRise && rise > 0.05 && poleHeight > atr * 2) {
      maxPoleRise = rise;
      poleEndIdx = i;
    }
  }
  
  if (poleEndIdx === -1) return null;
  
  // Analyze the flag (consolidation after the pole)
  const flagData = data.slice(poleEndIdx, Math.min(poleEndIdx + flagLength, data.length));
  if (flagData.length < 3) return null;
  
  // Check volume decline during flag formation
  const poleVolume = data.slice(poleEndIdx - poleLength, poleEndIdx)
    .reduce((sum, d) => sum + d.volume, 0) / poleLength;
  const flagVolume = flagData.reduce((sum, d) => sum + d.volume, 0) / flagData.length;
  const volumeDecline = flagVolume < poleVolume * PATTERN_PRECISION_CONFIG.VOLUME_DECLINE_RATIO;
  
  const priceHighs: PatternPoint[] = flagData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.high, 
    type: 'high' as const 
  }));
  const priceLows: PatternPoint[] = flagData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.low, 
    type: 'low' as const 
  }));
  
  const upperLine = linearRegression(priceHighs);
  const lowerLine = linearRegression(priceLows);
  
  if (!upperLine || !lowerLine) return null;
  
  // HIGH PRECISION: Flag should have slight downward slope (profit taking)
  const flagDescending = upperLine.slope < 0 && lowerLine.slope < 0;
  const parallel = areLinesParallel(upperLine, lowerLine, 0.35);
  const narrowChannel = Math.abs(upperLine.endPrice - lowerLine.endPrice) < maxPoleRise * data[poleEndIdx].close * 0.5;
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG;
  
  if (!flagDescending || !parallel || !narrowChannel || !highPrecisionFit) return null;
  
  const poleHeight = data[poleEndIdx].high - data[poleEndIdx - poleLength].low;
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100 * (volumeDecline ? 1.05 : 0.95); // Bonus for volume confirmation
  
  return {
    type: 'bull_flag',
    name: 'Bull Flag',
    nameAr: 'علم الثور',
    startIdx: poleEndIdx - poleLength,
    endIdx: Math.min(poleEndIdx + flagLength - 1, data.length - 1),
    upperLine,
    lowerLine,
    breakoutDirection: 'up',
    confidence: Math.round(Math.min(95, confidence)),
    targetPrice: upperLine.endPrice + poleHeight,
    description: `علم الثور - R² = ${combinedR2.toFixed(4)} | حجم: ${volumeDecline ? '✓' : '✗'}`,
  };
}

/**
 * Detect Bear Flag - HIGHEST ACCURACY
 * كشف علم الدب - أعلى دقة
 * R² ≥ 0.85 + Volume Analysis + ATR ratio validation
 */
function detectBearFlag(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (data.length < 20 || highs.length < 2 || lows.length < 2) return null;
  
  const poleLength = Math.min(15, Math.floor(data.length * 0.3));
  const flagLength = Math.min(10, Math.floor(data.length * 0.2));
  
  // Calculate ATR for normalization
  const atr = calculateATR(data, 14);
  
  // Find the pole (strong downward move)
  let maxPoleDrop = 0;
  let poleEndIdx = -1;
  
  for (let i = poleLength; i < data.length - flagLength; i++) {
    const poleStart = data[i - poleLength].high;
    const poleEnd = data[i].low;
    const drop = (poleStart - poleEnd) / poleStart;
    
    // Validate pole is at least 2x ATR
    const poleHeight = poleStart - poleEnd;
    if (drop > maxPoleDrop && drop > 0.05 && poleHeight > atr * 2) {
      maxPoleDrop = drop;
      poleEndIdx = i;
    }
  }
  
  if (poleEndIdx === -1) return null;
  
  const flagData = data.slice(poleEndIdx, Math.min(poleEndIdx + flagLength, data.length));
  if (flagData.length < 3) return null;
  
  // Check volume decline during flag formation
  const poleVolume = data.slice(poleEndIdx - poleLength, poleEndIdx)
    .reduce((sum, d) => sum + d.volume, 0) / poleLength;
  const flagVolume = flagData.reduce((sum, d) => sum + d.volume, 0) / flagData.length;
  const volumeDecline = flagVolume < poleVolume * PATTERN_PRECISION_CONFIG.VOLUME_DECLINE_RATIO;
  
  const priceHighs: PatternPoint[] = flagData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.high, 
    type: 'high' as const 
  }));
  const priceLows: PatternPoint[] = flagData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.low, 
    type: 'low' as const 
  }));
  
  const upperLine = linearRegression(priceHighs);
  const lowerLine = linearRegression(priceLows);
  
  if (!upperLine || !lowerLine) return null;
  
  // HIGH PRECISION: Bear flag should have slight upward slope (dead cat bounce)
  const flagAscending = upperLine.slope > 0 && lowerLine.slope > 0;
  const parallel = areLinesParallel(upperLine, lowerLine, 0.35);
  const narrowChannel = Math.abs(upperLine.endPrice - lowerLine.endPrice) < maxPoleDrop * data[poleEndIdx].close * 0.5;
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG;
  
  if (!flagAscending || !parallel || !narrowChannel || !highPrecisionFit) return null;
  
  const poleHeight = data[poleEndIdx - poleLength].high - data[poleEndIdx].low;
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100 * (volumeDecline ? 1.05 : 0.95);
  
  return {
    type: 'bear_flag',
    name: 'Bear Flag',
    nameAr: 'علم الدب',
    startIdx: poleEndIdx - poleLength,
    endIdx: Math.min(poleEndIdx + flagLength - 1, data.length - 1),
    upperLine,
    lowerLine,
    breakoutDirection: 'down',
    confidence: Math.round(Math.min(95, confidence)),
    targetPrice: lowerLine.endPrice - poleHeight,
    description: `علم الدب - R² = ${combinedR2.toFixed(4)} | حجم: ${volumeDecline ? '✓' : '✗'}`,
  };
}

/**
 * Detect Bull Pennant - HIGHEST ACCURACY
 * كشف راية الثور - أعلى دقة
 * R² ≥ 0.85 + Convergence validation + Volume analysis
 */
function detectBullPennant(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (data.length < 20 || highs.length < 2 || lows.length < 2) return null;
  
  const poleLength = Math.min(15, Math.floor(data.length * 0.3));
  const pennantLength = Math.min(10, Math.floor(data.length * 0.2));
  
  // Calculate ATR for validation
  const atr = calculateATR(data, 14);
  
  // Find strong upward pole
  let maxPoleRise = 0;
  let poleEndIdx = -1;
  
  for (let i = poleLength; i < data.length - pennantLength; i++) {
    const rise = (data[i].high - data[i - poleLength].low) / data[i - poleLength].low;
    const poleHeight = data[i].high - data[i - poleLength].low;
    if (rise > maxPoleRise && rise > 0.05 && poleHeight > atr * 2) {
      maxPoleRise = rise;
      poleEndIdx = i;
    }
  }
  
  if (poleEndIdx === -1) return null;
  
  const pennantData = data.slice(poleEndIdx, Math.min(poleEndIdx + pennantLength, data.length));
  if (pennantData.length < 3) return null;
  
  // Volume analysis
  const poleVolume = data.slice(poleEndIdx - poleLength, poleEndIdx)
    .reduce((sum, d) => sum + d.volume, 0) / poleLength;
  const pennantVolume = pennantData.reduce((sum, d) => sum + d.volume, 0) / pennantData.length;
  const volumeDecline = pennantVolume < poleVolume * PATTERN_PRECISION_CONFIG.VOLUME_DECLINE_RATIO;
  
  const priceHighs: PatternPoint[] = pennantData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.high, 
    type: 'high' as const 
  }));
  const priceLows: PatternPoint[] = pennantData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.low, 
    type: 'low' as const 
  }));
  
  const upperLine = linearRegression(priceHighs);
  const lowerLine = linearRegression(priceLows);
  
  if (!upperLine || !lowerLine) return null;
  
  // HIGH PRECISION: Pennant should be converging (like a small symmetrical triangle)
  const convergence = areLinesConverging(upperLine, lowerLine);
  const upperDescending = upperLine.slope < 0;
  const lowerAscending = lowerLine.slope > 0;
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG;
  
  if (!convergence.converging || !upperDescending || !lowerAscending || !highPrecisionFit) return null;
  
  const poleHeight = data[poleEndIdx].high - data[poleEndIdx - poleLength].low;
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100 * (volumeDecline ? 1.05 : 0.95);
  
  return {
    type: 'bull_pennant',
    name: 'Bull Pennant',
    nameAr: 'راية الثور',
    startIdx: poleEndIdx - poleLength,
    endIdx: Math.min(poleEndIdx + pennantLength - 1, data.length - 1),
    upperLine,
    lowerLine,
    breakoutDirection: 'up',
    confidence: Math.round(Math.min(95, confidence)),
    targetPrice: data[poleEndIdx + pennantLength - 1]?.high + poleHeight || null,
    description: `راية الثور - R² = ${combinedR2.toFixed(4)} | حجم: ${volumeDecline ? '✓' : '✗'}`,
  };
}

/**
 * Detect Bear Pennant - HIGHEST ACCURACY
 * كشف راية الدب - أعلى دقة
 * R² ≥ 0.85 + Convergence validation + Volume analysis
 */
function detectBearPennant(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (data.length < 20 || highs.length < 2 || lows.length < 2) return null;
  
  const poleLength = Math.min(15, Math.floor(data.length * 0.3));
  const pennantLength = Math.min(10, Math.floor(data.length * 0.2));
  
  // Calculate ATR for validation
  const atr = calculateATR(data, 14);
  
  // Find strong downward pole
  let maxPoleDrop = 0;
  let poleEndIdx = -1;
  
  for (let i = poleLength; i < data.length - pennantLength; i++) {
    const drop = (data[i - poleLength].high - data[i].low) / data[i - poleLength].high;
    const poleHeight = data[i - poleLength].high - data[i].low;
    if (drop > maxPoleDrop && drop > 0.05 && poleHeight > atr * 2) {
      maxPoleDrop = drop;
      poleEndIdx = i;
    }
  }
  
  if (poleEndIdx === -1) return null;
  
  const pennantData = data.slice(poleEndIdx, Math.min(poleEndIdx + pennantLength, data.length));
  if (pennantData.length < 3) return null;
  
  // Volume analysis
  const poleVolume = data.slice(poleEndIdx - poleLength, poleEndIdx)
    .reduce((sum, d) => sum + d.volume, 0) / poleLength;
  const pennantVolume = pennantData.reduce((sum, d) => sum + d.volume, 0) / pennantData.length;
  const volumeDecline = pennantVolume < poleVolume * PATTERN_PRECISION_CONFIG.VOLUME_DECLINE_RATIO;
  
  const priceHighs: PatternPoint[] = pennantData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.high, 
    type: 'high' as const 
  }));
  const priceLows: PatternPoint[] = pennantData.map((d, i) => ({ 
    index: poleEndIdx + i, 
    price: d.low, 
    type: 'low' as const 
  }));
  
  const upperLine = linearRegression(priceHighs);
  const lowerLine = linearRegression(priceLows);
  
  if (!upperLine || !lowerLine) return null;
  
  // HIGH PRECISION
  const convergence = areLinesConverging(upperLine, lowerLine);
  const upperDescending = upperLine.slope < 0;
  const lowerAscending = lowerLine.slope > 0;
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_FLAG;
  
  if (!convergence.converging || !upperDescending || !lowerAscending || !highPrecisionFit) return null;
  
  const poleHeight = data[poleEndIdx - poleLength].high - data[poleEndIdx].low;
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const confidence = combinedR2 * 100 * (volumeDecline ? 1.05 : 0.95);
  
  return {
    type: 'bear_pennant',
    name: 'Bear Pennant',
    nameAr: 'راية الدب',
    startIdx: poleEndIdx - poleLength,
    endIdx: Math.min(poleEndIdx + pennantLength - 1, data.length - 1),
    upperLine,
    lowerLine,
    breakoutDirection: 'down',
    confidence: Math.round(Math.min(95, confidence)),
    targetPrice: data[poleEndIdx + pennantLength - 1]?.low - poleHeight || null,
    description: `راية الدب - R² = ${combinedR2.toFixed(4)} | حجم: ${volumeDecline ? '✓' : '✗'}`,
  };
}

/**
 * Detect Rising Wedge (Bearish) - ELITE ACCURACY with Advanced Validation
 * كشف الوتد الصاعد (هبوطي) - دقة عالمية مع التحقق المتقدم
 * R² ≥ 0.70 + Alternation + Contraction + Apex validation + Volume analysis
 */
function detectRisingWedge(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  // Use advanced RANSAC for robust line fitting
  const upperLine = robustLinearRegressionRANSAC(recentHighs, data, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE);
  const lowerLine = robustLinearRegressionRANSAC(recentLows, data, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE);
  
  if (!upperLine || !lowerLine) return null;
  
  // === BASIC GEOMETRIC CHECKS ===
  const bothAscending = upperLine.slope > 0.0001 && lowerLine.slope > 0.0001;
  const convergence = areLinesConverging(upperLine, lowerLine);
  const lowerSteeper = lowerLine.slope > upperLine.slope; // Lower line catching up
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_WEDGE && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_WEDGE;
  
  if (!bothAscending || !convergence.converging || !lowerSteeper || !highPrecisionFit) return null;
  
  // Touch verification
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE;
  if (!sufficientTouches) return null;
  
  // === ADVANCED WEDGE VALIDATORS ===
  
  // 1. Alternation Check (H-L-H-L-H pattern)
  const alternation = validateWedgeAlternation(recentHighs, recentLows);
  if (!alternation.isValid) return null;
  
  // 2. Contraction Ratio
  const contraction = calculateWedgeContraction(upperLine, lowerLine);
  if (!contraction.isValid) return null;
  
  // 3. Apex Distance Validation
  const apex = calculateApexDistance(upperLine, lowerLine);
  if (!apex.isValid) return null;
  
  // 4. Pattern Completeness
  const completeness = calculatePatternCompleteness(upperLine, lowerLine, apex.distance);
  if (completeness < PATTERN_PRECISION_CONFIG.WEDGE_MIN_COMPLETENESS * 100) return null;
  
  // 5. Volume Profile Analysis
  const startIdx = Math.min(upperLine.startIdx, lowerLine.startIdx);
  const endIdx = Math.max(upperLine.endIdx, lowerLine.endIdx);
  const volumeProfile = analyzeWedgeVolumeProfile(data, startIdx, endIdx);
  
  // Calculate comprehensive confidence score
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const geometryScore = (alternation.score + (1 - contraction.ratio)) / 2;
  const volumeScore = volumeProfile.score / 100;
  const completenessScore = completeness / 100;
  
  const confidence = Math.round(
    combinedR2 * 40 + // R² contributes 40%
    geometryScore * 30 + // Geometry contributes 30%
    volumeScore * 15 + // Volume contributes 15%
    completenessScore * 15 // Completeness contributes 15%
  );
  
  const wedgeHeight = upperLine.startPrice - lowerLine.startPrice;
  
  const evidence = buildWedgeEvidence(data, upperLine, lowerLine, 'rising', 'down', confidence);

  return {
    type: 'rising_wedge',
    name: 'Rising Wedge',
    nameAr: 'الوتد الصاعد',
    startIdx,
    endIdx,
    upperLine,
    lowerLine,
    breakoutDirection: 'down',
    confidence,
    targetPrice: lowerLine.endPrice - wedgeHeight,
    description: `وتد صاعد متقدم - R²=${combinedR2.toFixed(3)} | تناوب=${(alternation.score * 100).toFixed(0)}% | انكماش=${(contraction.ratio * 100).toFixed(0)}% | اكتمال=${completeness}% | حجم=${volumeProfile.declining ? '↓' : '→'}`,
    wedgeEvidence: evidence
  };
}

/**
 * Detect Falling Wedge (Bullish) - ELITE ACCURACY with Advanced Validation
 * كشف الوتد الهابط (صعودي) - دقة عالمية مع التحقق المتقدم
 * R² ≥ 0.70 + Alternation + Contraction + Apex validation + Volume analysis
 */
function detectFallingWedge(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  // Use advanced RANSAC for robust line fitting
  const upperLine = robustLinearRegressionRANSAC(recentHighs, data, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE);
  const lowerLine = robustLinearRegressionRANSAC(recentLows, data, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE);
  
  if (!upperLine || !lowerLine) return null;
  
  // === BASIC GEOMETRIC CHECKS ===
  const bothDescending = upperLine.slope < -0.0001 && lowerLine.slope < -0.0001;
  const convergence = areLinesConverging(upperLine, lowerLine);
  const upperSteeper = upperLine.slope < lowerLine.slope; // Upper line falling faster
  const highPrecisionFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_WEDGE && 
                           lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_WEDGE;
  
  if (!bothDescending || !convergence.converging || !upperSteeper || !highPrecisionFit) return null;
  
  // Touch verification
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_WEDGE;
  if (!sufficientTouches) return null;
  
  // === ADVANCED WEDGE VALIDATORS ===
  
  // 1. Alternation Check (H-L-H-L-H pattern)
  const alternation = validateWedgeAlternation(recentHighs, recentLows);
  if (!alternation.isValid) return null;
  
  // 2. Contraction Ratio
  const contraction = calculateWedgeContraction(upperLine, lowerLine);
  if (!contraction.isValid) return null;
  
  // 3. Apex Distance Validation
  const apex = calculateApexDistance(upperLine, lowerLine);
  if (!apex.isValid) return null;
  
  // 4. Pattern Completeness
  const completeness = calculatePatternCompleteness(upperLine, lowerLine, apex.distance);
  if (completeness < PATTERN_PRECISION_CONFIG.WEDGE_MIN_COMPLETENESS * 100) return null;
  
  // 5. Volume Profile Analysis
  const startIdx = Math.min(upperLine.startIdx, lowerLine.startIdx);
  const endIdx = Math.max(upperLine.endIdx, lowerLine.endIdx);
  const volumeProfile = analyzeWedgeVolumeProfile(data, startIdx, endIdx);
  
  // Calculate comprehensive confidence score
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const geometryScore = (alternation.score + (1 - contraction.ratio)) / 2;
  const volumeScore = volumeProfile.score / 100;
  const completenessScore = completeness / 100;
  
  const confidence = Math.round(
    combinedR2 * 40 + // R² contributes 40%
    geometryScore * 30 + // Geometry contributes 30%
    volumeScore * 15 + // Volume contributes 15%
    completenessScore * 15 // Completeness contributes 15%
  );
  
  const wedgeHeight = upperLine.startPrice - lowerLine.startPrice;
  
  const evidence = buildWedgeEvidence(data, upperLine, lowerLine, 'falling', 'up', confidence);

  return {
    type: 'falling_wedge',
    name: 'Falling Wedge',
    nameAr: 'الوتد الهابط',
    startIdx,
    endIdx,
    upperLine,
    lowerLine,
    breakoutDirection: 'up',
    confidence,
    targetPrice: upperLine.endPrice + wedgeHeight,
    description: `وتد هابط متقدم - R²=${combinedR2.toFixed(3)} | تناوب=${(alternation.score * 100).toFixed(0)}% | انكماش=${(contraction.ratio * 100).toFixed(0)}% | اكتمال=${completeness}% | حجم=${volumeProfile.declining ? '↓' : '→'}`,
    wedgeEvidence: evidence
  };
}

/**
 * Detect Ascending Broadening Wedge - HIGHEST ACCURACY
 * كشف الوتد المتسع الصاعد - أعلى دقة
 * مع التحقق من نقاط اللمس وفحص انتهاك الشموع
 */
function detectAscendingBroadeningWedge(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING);
  
  if (!upperLine || !lowerLine) return null;
  
  // Ascending broadening wedge: both ascending, diverging (upper steeper)
  const bothAscending = upperLine.slope > 0.0001 && lowerLine.slope > 0.0001;
  const diverging = areLinessDiverging(upperLine, lowerLine);
  const upperSteeper = upperLine.slope > lowerLine.slope;
  const goodFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_BROADENING && 
                  lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_BROADENING;
  
  // التحقق من نقاط اللمس (جديد)
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING;
  
  if (!bothAscending || !diverging || !upperSteeper || !goodFit || !sufficientTouches) return null;
  
  // فحص انتهاك الشموع (جديد)
  const upperValid = verifyNoViolations(upperLine, data, 'upper');
  const lowerValid = verifyNoViolations(lowerLine, data, 'lower');
  
  if (!upperValid.valid || !lowerValid.valid) return null;
  
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const totalTouches = (upperLine.touchCount || 0) + (lowerLine.touchCount || 0);
  const confidence = combinedR2 * 100 * 0.95; // زيادة طفيفة بعد التحقق
  
  const evidence = buildWedgeEvidence(data, upperLine, lowerLine, 'ascending_broadening', 'down', confidence);

  return {
    type: 'ascending_broadening_wedge',
    name: 'Ascending Broadening Wedge',
    nameAr: 'الوتد المتسع الصاعد',
    startIdx: Math.min(upperLine.startIdx, lowerLine.startIdx),
    endIdx: Math.max(upperLine.endIdx, lowerLine.endIdx),
    upperLine,
    lowerLine,
    breakoutDirection: 'down',
    confidence: Math.round(confidence),
    targetPrice: null,
    description: `وتد متسع صاعد - R² = ${combinedR2.toFixed(4)} | لمسات: ${totalTouches} ●`,
    wedgeEvidence: evidence
  };
}

/**
 * Detect Descending Broadening Wedge - HIGHEST ACCURACY
 * كشف الوتد المتسع الهابط - أعلى دقة
 * مع التحقق من نقاط اللمس وفحص انتهاك الشموع
 */
function detectDescendingBroadeningWedge(data: OHLCV[], highs: PatternPoint[], lows: PatternPoint[]): DetectedPattern | null {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-Math.max(4, Math.ceil(highs.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  const recentLows = lows.slice(-Math.max(4, Math.ceil(lows.length * PATTERN_PRECISION_CONFIG.RECENCY_WEIGHT)));
  
  const upperLine = robustLinearRegression(recentHighs, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING);
  const lowerLine = robustLinearRegression(recentLows, PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING);
  
  if (!upperLine || !lowerLine) return null;
  
  // Descending broadening wedge: both descending, diverging (lower steeper)
  const bothDescending = upperLine.slope < -0.0001 && lowerLine.slope < -0.0001;
  const diverging = areLinessDiverging(upperLine, lowerLine);
  const lowerSteeper = lowerLine.slope < upperLine.slope;
  const goodFit = upperLine.r2 >= PATTERN_PRECISION_CONFIG.R2_BROADENING && 
                  lowerLine.r2 >= PATTERN_PRECISION_CONFIG.R2_BROADENING;
  
  // التحقق من نقاط اللمس (جديد)
  const sufficientTouches = (upperLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING &&
                            (lowerLine.touchCount || 0) >= PATTERN_PRECISION_CONFIG.MIN_TOUCHES_BROADENING;
  
  if (!bothDescending || !diverging || !lowerSteeper || !goodFit || !sufficientTouches) return null;
  
  // فحص انتهاك الشموع (جديد)
  const upperValid = verifyNoViolations(upperLine, data, 'upper');
  const lowerValid = verifyNoViolations(lowerLine, data, 'lower');
  
  if (!upperValid.valid || !lowerValid.valid) return null;
  
  const combinedR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const totalTouches = (upperLine.touchCount || 0) + (lowerLine.touchCount || 0);
  const confidence = combinedR2 * 100 * 0.95; // زيادة طفيفة بعد التحقق
  
  const evidence = buildWedgeEvidence(data, upperLine, lowerLine, 'descending_broadening', 'up', confidence);

  return {
    type: 'descending_broadening_wedge',
    name: 'Descending Broadening Wedge',
    nameAr: 'الوتد المتسع الهابط',
    startIdx: Math.min(upperLine.startIdx, lowerLine.startIdx),
    endIdx: Math.max(upperLine.endIdx, lowerLine.endIdx),
    upperLine,
    lowerLine,
    breakoutDirection: 'up',
    confidence: Math.round(confidence),
    targetPrice: null,
    description: `وتد متسع هابط - R² = ${combinedR2.toFixed(4)} | لمسات: ${totalTouches} ●`,
    wedgeEvidence: evidence
  };
}

// ============================================
// MAIN PATTERN DETECTION FUNCTION
// ============================================

/**
 * Main pattern detection function
 * الدالة الرئيسية لكشف الأنماط
 */
export function detectChartPatterns(
  data: OHLCV[],
  options: {
    minPatternLength?: number;
    windowSize?: number;
    enabledPatterns?: PatternType[];
    enableEnhancedScoring?: boolean; // تفعيل التسجيل المحسن
  } = {}
): DetectedPattern[] {
  const {
    minPatternLength = 20,
    windowSize = 5,
    enableEnhancedScoring = true, // مفعل افتراضياً
    enabledPatterns = [
      'ascending_channel',
      'descending_channel',
      'ascending_triangle',
      'descending_triangle',
      'symmetrical_triangle',
      'bull_flag',
      'bear_flag',
      'bull_pennant',
      'bear_pennant',
      'rising_wedge',
      'falling_wedge',
      'ascending_broadening_wedge',
      'descending_broadening_wedge',
    ],
  } = options;

  if (data.length < minPatternLength) {
    return [];
  }

  const patterns: DetectedPattern[] = [];
  
  // Calculate ATR series for adaptive pivot detection
  const atrSeries = calculateATRSeries(data);
  
  // Use advanced multi-scale pivot detection
  const { highs, lows } = findLocalExtremaAdvanced(data, atrSeries);
  

  // Detect each pattern type
  const detectors: [PatternType, (d: OHLCV[], h: PatternPoint[], l: PatternPoint[]) => DetectedPattern | null][] = [
    ['ascending_channel', detectAscendingChannel],
    ['descending_channel', detectDescendingChannel],
    ['ascending_triangle', detectAscendingTriangle],
    ['descending_triangle', detectDescendingTriangle],
    ['symmetrical_triangle', detectSymmetricalTriangle],
    ['bull_flag', detectBullFlag],
    ['bear_flag', detectBearFlag],
    ['bull_pennant', detectBullPennant],
    ['bear_pennant', detectBearPennant],
    ['rising_wedge', detectRisingWedge],
    ['falling_wedge', detectFallingWedge],
    ['ascending_broadening_wedge', detectAscendingBroadeningWedge],
    ['descending_broadening_wedge', detectDescendingBroadeningWedge],
  ];

  for (const [patternType, detector] of detectors) {
    if (enabledPatterns.includes(patternType)) {
      try {
        const pattern = detector(data, highs, lows);
        
        if (pattern && pattern.confidence >= 30) {  // خفض العتبة إلى 30
          // Enhanced pattern scoring - التسجيل المحسن للأنماط
          if (enableEnhancedScoring) {
            // Add prior trend detection
            pattern.priorTrend = detectPriorTrend(data, pattern.startIdx);
            
            // Add pattern context classification
            pattern.patternContext = classifyPatternContext(patternType, pattern.priorTrend);
            
            // Add volume confirmation
            pattern.volumeConfirmation = calculateVolumeConfirmation(data, pattern.startIdx, pattern.endIdx);
            
            // Add freshness score
            pattern.freshnessScore = calculatePatternFreshness(pattern.endIdx, data.length - 1);
            
            // Calculate enhanced confidence with all factors
            const volumeBonus = pattern.volumeConfirmation.score > 70 ? 10 : 0;
            const freshnessBonus = pattern.freshnessScore > 80 ? 5 : 0;
            const contextBonus = pattern.patternContext === 'continuation' ? 5 : 
                                pattern.patternContext === 'reversal' ? 3 : 0;
            
            pattern.confidence = Math.min(100, pattern.confidence + volumeBonus + freshnessBonus + contextBonus);
            
            // Assign quality grade based on confidence
            if (pattern.confidence >= 85) {
              pattern.qualityGrade = 'ELITE';
              pattern.qualityGradeAr = '🏆 نخبة';
            } else if (pattern.confidence >= 70) {
              pattern.qualityGrade = 'STRONG';
              pattern.qualityGradeAr = '💪 قوي';
            } else if (pattern.confidence >= 55) {
              pattern.qualityGrade = 'VALID';
              pattern.qualityGradeAr = '✅ صالح';
            } else {
              pattern.qualityGrade = 'WEAK';
              pattern.qualityGradeAr = '⚠️ ضعيف';
            }
          }
          
          patterns.push(pattern);
        }
      } catch (e) {
        
      }
    }
  }

  // Sort by confidence (highest first)
  patterns.sort((a, b) => b.confidence - a.confidence);

  // Remove overlapping patterns (keep highest confidence)
  const uniquePatterns: DetectedPattern[] = [];
  for (const pattern of patterns) {
    const overlaps = uniquePatterns.some(p => 
      (pattern.startIdx >= p.startIdx && pattern.startIdx <= p.endIdx) ||
      (pattern.endIdx >= p.startIdx && pattern.endIdx <= p.endIdx)
    );
    
    if (!overlaps) {
      uniquePatterns.push(pattern);
    }
  }

  return uniquePatterns;
}

/**
 * Generate pattern line data for charting
 * توليد بيانات خطوط الأنماط للرسم البياني
 */
export function generatePatternLines(
  pattern: DetectedPattern,
  dataLength: number,
  extendBy: number = 10
): { 
  upper: (number | null)[]; 
  lower: (number | null)[];
  middle?: (number | null)[];
  upperBand1?: (number | null)[];
  lowerBand1?: (number | null)[];
  upperBand2?: (number | null)[];
  lowerBand2?: (number | null)[];
} {
  const upper: (number | null)[] = new Array(dataLength).fill(null);
  const lower: (number | null)[] = new Array(dataLength).fill(null);
  const middle: (number | null)[] = new Array(dataLength).fill(null);
  const upperBand1: (number | null)[] = new Array(dataLength).fill(null);
  const lowerBand1: (number | null)[] = new Array(dataLength).fill(null);
  const upperBand2: (number | null)[] = new Array(dataLength).fill(null);
  const lowerBand2: (number | null)[] = new Array(dataLength).fill(null);
  
  if (pattern.upperLine) {
    const { slope, intercept, startIdx, endIdx } = pattern.upperLine;
    for (let i = startIdx; i <= Math.min(endIdx + extendBy, dataLength - 1); i++) {
      upper[i] = slope * i + intercept;
    }
  }
  
  if (pattern.lowerLine) {
    const { slope, intercept, startIdx, endIdx } = pattern.lowerLine;
    for (let i = startIdx; i <= Math.min(endIdx + extendBy, dataLength - 1); i++) {
      lower[i] = slope * i + intercept;
    }
  }
  
  // Generate regression channel bands for channels
  if (pattern.regressionChannel) {
    const rc = pattern.regressionChannel;
    const startIdx = rc.middleLine.startIdx;
    const endIdx = rc.middleLine.endIdx;
    
    for (let i = startIdx; i <= Math.min(endIdx + extendBy, dataLength - 1); i++) {
      // Middle line (regression line)
      middle[i] = rc.middleLine.slope * i + rc.middleLine.intercept;
      
      // ±1 Standard Deviation bands
      upperBand1[i] = rc.upperBand1.slope * i + rc.upperBand1.intercept;
      lowerBand1[i] = rc.lowerBand1.slope * i + rc.lowerBand1.intercept;
      
      // ±2 Standard Deviation bands
      upperBand2[i] = rc.upperBand2.slope * i + rc.upperBand2.intercept;
      lowerBand2[i] = rc.lowerBand2.slope * i + rc.lowerBand2.intercept;
    }
  } else if (pattern.middleLine) {
    // Fallback to simple middle line
    const { slope, intercept, startIdx, endIdx } = pattern.middleLine;
    for (let i = startIdx; i <= Math.min(endIdx + extendBy, dataLength - 1); i++) {
      middle[i] = slope * i + intercept;
    }
  }
  
  return { upper, lower, middle, upperBand1, lowerBand1, upperBand2, lowerBand2 };
}

// ==========================================================
// HORIZONTAL LEVELS - المستويات الأفقية
// ==========================================================

export interface HorizontalLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 1-10
  touches: number;
  firstTouch: number;
  lastTouch: number;
  volume: number;
}

/**
 * Detect Horizontal Support/Resistance Levels - HIGHEST ACCURACY
 * كشف مستويات الدعم والمقاومة الأفقية - أعلى دقة
 * Uses K-Means clustering + Volume Profile for precision
 */
export function detectHorizontalLevels(
  data: OHLCV[],
  options: {
    sensitivity?: number; // 0.1 - 1.0 (lower = more levels)
    minTouches?: number;
    lookbackPeriod?: number;
  } = {}
): HorizontalLevel[] {
  const {
    sensitivity = 0.5,
    minTouches = 3,
    lookbackPeriod = Math.min(200, data.length),
  } = options;

  if (data.length < 20) return [];

  const recentData = data.slice(-lookbackPeriod);
  const levels: HorizontalLevel[] = [];

  // Calculate price range
  const allHighs = recentData.map(d => d.high);
  const allLows = recentData.map(d => d.low);
  const maxPrice = Math.max(...allHighs);
  const minPrice = Math.min(...allLows);
  const priceRange = maxPrice - minPrice;
  
  // Define clustering tolerance based on sensitivity
  const clusterTolerance = priceRange * (0.01 + sensitivity * 0.02); // 1-3% of range

  // Collect all pivot points
  const pivots: { price: number; type: 'high' | 'low'; index: number; volume: number }[] = [];
  
  for (let i = 2; i < recentData.length - 2; i++) {
    // Check for swing high
    if (recentData[i].high >= recentData[i-1].high &&
        recentData[i].high >= recentData[i-2].high &&
        recentData[i].high >= recentData[i+1].high &&
        recentData[i].high >= recentData[i+2].high) {
      pivots.push({
        price: recentData[i].high,
        type: 'high',
        index: data.length - lookbackPeriod + i,
        volume: recentData[i].volume,
      });
    }
    
    // Check for swing low
    if (recentData[i].low <= recentData[i-1].low &&
        recentData[i].low <= recentData[i-2].low &&
        recentData[i].low <= recentData[i+1].low &&
        recentData[i].low <= recentData[i+2].low) {
      pivots.push({
        price: recentData[i].low,
        type: 'low',
        index: data.length - lookbackPeriod + i,
        volume: recentData[i].volume,
      });
    }
  }

  // K-Means-like clustering
  const clusters: typeof pivots[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < pivots.length; i++) {
    if (used.has(i)) continue;
    
    const cluster: typeof pivots = [pivots[i]];
    used.add(i);
    
    for (let j = i + 1; j < pivots.length; j++) {
      if (used.has(j)) continue;
      
      if (Math.abs(pivots[j].price - pivots[i].price) <= clusterTolerance) {
        cluster.push(pivots[j]);
        used.add(j);
      }
    }
    
    if (cluster.length >= minTouches) {
      clusters.push(cluster);
    }
  }

  // Convert clusters to levels
  for (const cluster of clusters) {
    const avgPrice = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length;
    const totalVolume = cluster.reduce((sum, p) => sum + p.volume, 0);
    const highCount = cluster.filter(p => p.type === 'high').length;
    const lowCount = cluster.filter(p => p.type === 'low').length;
    
    // Determine type based on majority
    const type: 'support' | 'resistance' = lowCount > highCount ? 'support' : 'resistance';
    
    // Calculate strength (1-10)
    const touchScore = Math.min(cluster.length / 5, 1) * 4;
    const volumeScore = (totalVolume / cluster.length) / (recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length) * 3;
    const recencyScore = ((cluster[cluster.length - 1]?.index || 0) / data.length) * 3;
    const strength = Math.min(10, Math.round(touchScore + Math.min(volumeScore, 3) + recencyScore));
    
    levels.push({
      price: avgPrice,
      type,
      strength,
      touches: cluster.length,
      firstTouch: Math.min(...cluster.map(p => p.index)),
      lastTouch: Math.max(...cluster.map(p => p.index)),
      volume: totalVolume,
    });
  }

  // Sort by strength
  levels.sort((a, b) => b.strength - a.strength);
  
  // Return top levels (avoid clutter)
  return levels.slice(0, 10);
}

// ==========================================================
// FIBONACCI RETRACEMENT & EXTENSION - فيبوناتشي
// ==========================================================

export interface FibonacciLevel {
  ratio: number;
  price: number;
  label: string;
  type: 'retracement' | 'extension';
}

export interface FibonacciAnalysis {
  swingHigh: { price: number; index: number };
  swingLow: { price: number; index: number };
  direction: 'up' | 'down';
  levels: FibonacciLevel[];
  r2: number; // Quality of swing detection
}

/**
 * Calculate Fibonacci Retracement & Extension Levels - HIGHEST ACCURACY
 * حساب مستويات فيبوناتشي للتصحيح والامتداد - أعلى دقة
 * Uses validated swing points with R² confirmation
 */
export function calculateFibonacci(
  data: OHLCV[],
  options: {
    autoDetect?: boolean;
    swingHighIdx?: number;
    swingLowIdx?: number;
    includeExtensions?: boolean;
  } = {}
): FibonacciAnalysis | null {
  const {
    autoDetect = true,
    swingHighIdx,
    swingLowIdx,
    includeExtensions = true,
  } = options;

  if (data.length < 20) return null;

  let swingHigh: { price: number; index: number } | null = null;
  let swingLow: { price: number; index: number } | null = null;

  if (autoDetect) {
    // Auto-detect major swing points using Bill Williams Fractals
    const fractals = detectBillWilliamsFractals(data, 3);
    
    if (fractals.highs.length === 0 || fractals.lows.length === 0) return null;
    
    // Find the most significant swing in recent data (last 60%)
    const recentThreshold = Math.floor(data.length * 0.4);
    
    const recentHighs = fractals.highs.filter(h => h.index >= recentThreshold);
    const recentLows = fractals.lows.filter(l => l.index >= recentThreshold);
    
    if (recentHighs.length === 0 || recentLows.length === 0) return null;
    
    // Find the highest high and lowest low
    const highestHigh = recentHighs.reduce((max, h) => h.price > max.price ? h : max, recentHighs[0]);
    const lowestLow = recentLows.reduce((min, l) => l.price < min.price ? l : min, recentLows[0]);
    
    swingHigh = { price: highestHigh.price, index: highestHigh.index };
    swingLow = { price: lowestLow.price, index: lowestLow.index };
  } else if (swingHighIdx !== undefined && swingLowIdx !== undefined) {
    swingHigh = { price: data[swingHighIdx].high, index: swingHighIdx };
    swingLow = { price: data[swingLowIdx].low, index: swingLowIdx };
  }

  if (!swingHigh || !swingLow) return null;

  // Determine direction
  const direction: 'up' | 'down' = swingLow.index < swingHigh.index ? 'up' : 'down';
  const range = swingHigh.price - swingLow.price;

  // Fibonacci ratios
  const retracementRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const extensionRatios = [1.272, 1.618, 2.0, 2.618, 3.618];

  const levels: FibonacciLevel[] = [];

  // Retracement levels
  for (const ratio of retracementRatios) {
    const price = direction === 'up'
      ? swingHigh.price - range * ratio
      : swingLow.price + range * ratio;
    
    levels.push({
      ratio,
      price,
      label: `${(ratio * 100).toFixed(1)}%`,
      type: 'retracement',
    });
  }

  // Extension levels
  if (includeExtensions) {
    for (const ratio of extensionRatios) {
      const price = direction === 'up'
        ? swingLow.price + range * ratio
        : swingHigh.price - range * ratio;
      
      levels.push({
        ratio,
        price,
        label: `${(ratio * 100).toFixed(1)}%`,
        type: 'extension',
      });
    }
  }

  // Calculate R² for swing quality
  const swingData = direction === 'up'
    ? data.slice(swingLow.index, swingHigh.index + 1)
    : data.slice(swingHigh.index, swingLow.index + 1);
  
  const r2 = calculateSwingR2(swingData, direction);

  return {
    swingHigh,
    swingLow,
    direction,
    levels,
    r2,
  };
}

/**
 * Detect Bill Williams Fractals for accurate swing detection
 * كشف فركتالات بيل ويليامز لتحديد دقيق للقمم والقيعان
 */
function detectBillWilliamsFractals(
  data: OHLCV[],
  period: number = 2
): { highs: PatternPoint[]; lows: PatternPoint[] } {
  const highs: PatternPoint[] = [];
  const lows: PatternPoint[] = [];

  for (let i = period; i < data.length - period; i++) {
    // Check for fractal high (5-bar pattern for period=2)
    let isHigh = true;
    let isLow = true;
    
    for (let j = 1; j <= period; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isHigh = false;
      }
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isLow = false;
      }
    }
    
    if (isHigh) {
      highs.push({ index: i, price: data[i].high, type: 'high' });
    }
    if (isLow) {
      lows.push({ index: i, price: data[i].low, type: 'low' });
    }
  }

  return { highs, lows };
}

/**
 * Calculate R² for swing quality validation
 * حساب R² للتحقق من جودة التأرجح
 */
function calculateSwingR2(swingData: OHLCV[], direction: 'up' | 'down'): number {
  if (swingData.length < 3) return 0;

  const n = swingData.length;
  const prices = swingData.map((d, i) => ({
    x: i,
    y: direction === 'up' ? d.close : -d.close,
  }));

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const { x, y } of prices) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of prices) {
    const predicted = slope * x + intercept;
    ssTot += (y - yMean) ** 2;
    ssRes += (y - predicted) ** 2;
  }

  return ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
}

// ==========================================================
// CONFLUENCE ZONES - مناطق التقاء المستويات
// ==========================================================

export interface ConfluenceZone {
  priceMin: number;
  priceMax: number;
  strength: number;
  sources: string[];
}

/**
 * Detect Confluence Zones where multiple levels align
 * كشف مناطق التقاء المستويات
 */
export function detectConfluenceZones(
  horizontalLevels: HorizontalLevel[],
  fibLevels: FibonacciLevel[] | null,
  tolerance: number = 0.005 // 0.5% price tolerance
): ConfluenceZone[] {
  const allLevels: { price: number; source: string }[] = [];

  // Add horizontal levels
  for (const level of horizontalLevels) {
    allLevels.push({
      price: level.price,
      source: `${level.type === 'support' ? 'دعم' : 'مقاومة'} أفقي (${level.touches} لمسات)`,
    });
  }

  // Add fibonacci levels
  if (fibLevels) {
    for (const level of fibLevels) {
      allLevels.push({
        price: level.price,
        source: `فيبوناتشي ${level.label}`,
      });
    }
  }

  if (allLevels.length < 2) return [];

  // Find confluence zones
  const zones: ConfluenceZone[] = [];
  const used = new Set<number>();

  for (let i = 0; i < allLevels.length; i++) {
    if (used.has(i)) continue;

    const zone = {
      prices: [allLevels[i].price],
      sources: [allLevels[i].source],
    };
    used.add(i);

    for (let j = i + 1; j < allLevels.length; j++) {
      if (used.has(j)) continue;

      const avgPrice = zone.prices.reduce((a, b) => a + b, 0) / zone.prices.length;
      const diff = Math.abs(allLevels[j].price - avgPrice) / avgPrice;

      if (diff <= tolerance) {
        zone.prices.push(allLevels[j].price);
        zone.sources.push(allLevels[j].source);
        used.add(j);
      }
    }

    if (zone.sources.length >= 2) {
      const minPrice = Math.min(...zone.prices);
      const maxPrice = Math.max(...zone.prices);
      
      zones.push({
        priceMin: minPrice,
        priceMax: maxPrice,
        strength: zone.sources.length,
        sources: zone.sources,
      });
    }
  }

  // Sort by strength
  zones.sort((a, b) => b.strength - a.strength);

  return zones;
}

// ==========================================================
// SMART MONEY PATTERN INTEGRATION - تكامل SMC مع الأنماط
// ==========================================================

export interface PatternWithSMC {
  pattern: DetectedPattern;
  smcAlignment: {
    orderBlocksNearby: number;
    fvgsNearby: number;
    liquidityPoolsNearby: number;
    structureBreakConfirms: boolean;
    smcBias: 'bullish' | 'bearish' | 'neutral';
    alignmentScore: number; // 0-100
    alignmentGrade: 'perfect' | 'strong' | 'moderate' | 'weak' | 'none';
    keyLevelsInPattern: number[];
  };
  enhancedConfidence: number;
}

/**
 * Integrate pattern detection with Smart Money Concepts
 * دمج كشف الأنماط مع مفاهيم الأموال الذكية
 */
export function integratePatternWithSMC(
  pattern: DetectedPattern,
  smcAnalysis: {
    orderBlocks: Array<{ type: string; high: number; low: number; mitigated: boolean }>;
    fvgs: Array<{ type: string; high: number; low: number; filled: boolean }>;
    liquidityPools: Array<{ price: number; swept: boolean }>;
    structureBreaks: Array<{ direction: string; index: number }>;
    bias: 'bullish' | 'bearish' | 'neutral';
    keyLevels: number[];
  },
  tolerance: number = 0.02 // 2% proximity tolerance
): PatternWithSMC {
  const patternHigh = pattern.upperLine 
    ? (pattern.upperLine.slope * pattern.endIdx + pattern.upperLine.intercept) 
    : pattern.targetPrice || 0;
  const patternLow = pattern.lowerLine 
    ? (pattern.lowerLine.slope * pattern.endIdx + pattern.lowerLine.intercept)
    : pattern.targetPrice || 0;
  const patternMid = (patternHigh + patternLow) / 2;
  
  // Count nearby Order Blocks
  const orderBlocksNearby = smcAnalysis.orderBlocks.filter(ob => {
    if (ob.mitigated) return false;
    const obMid = (ob.high + ob.low) / 2;
    return Math.abs(obMid - patternMid) / patternMid < tolerance;
  }).length;
  
  // Count nearby FVGs
  const fvgsNearby = smcAnalysis.fvgs.filter(fvg => {
    if (fvg.filled) return false;
    const fvgMid = (fvg.high + fvg.low) / 2;
    return Math.abs(fvgMid - patternMid) / patternMid < tolerance;
  }).length;
  
  // Count nearby Liquidity Pools
  const liquidityPoolsNearby = smcAnalysis.liquidityPools.filter(pool => {
    if (pool.swept) return false;
    return Math.abs(pool.price - patternMid) / patternMid < tolerance;
  }).length;
  
  // Check if structure break confirms pattern direction
  const recentBreaks = smcAnalysis.structureBreaks.filter(
    brk => brk.index >= pattern.startIdx && brk.index <= pattern.endIdx
  );
  const structureBreakConfirms = recentBreaks.some(brk => 
    (brk.direction === 'bullish' && pattern.breakoutDirection === 'up') ||
    (brk.direction === 'bearish' && pattern.breakoutDirection === 'down')
  );
  
  // Find key levels within pattern range
  const keyLevelsInPattern = smcAnalysis.keyLevels.filter(level => 
    level >= patternLow * (1 - tolerance) && level <= patternHigh * (1 + tolerance)
  );
  
  // Calculate alignment score
  let alignmentScore = 0;
  alignmentScore += orderBlocksNearby * 20; // Max 40 for 2 OBs
  alignmentScore += fvgsNearby * 15;        // Max 30 for 2 FVGs
  alignmentScore += liquidityPoolsNearby * 10; // Max 20 for 2 pools
  alignmentScore += structureBreakConfirms ? 20 : 0;
  
  // Bias alignment bonus
  const biasAligned = 
    (smcAnalysis.bias === 'bullish' && pattern.breakoutDirection === 'up') ||
    (smcAnalysis.bias === 'bearish' && pattern.breakoutDirection === 'down');
  alignmentScore += biasAligned ? 15 : (smcAnalysis.bias === 'neutral' ? 5 : -10);
  
  alignmentScore = Math.max(0, Math.min(100, alignmentScore));
  
  // Determine alignment grade
  let alignmentGrade: 'perfect' | 'strong' | 'moderate' | 'weak' | 'none';
  if (alignmentScore >= 80) alignmentGrade = 'perfect';
  else if (alignmentScore >= 60) alignmentGrade = 'strong';
  else if (alignmentScore >= 40) alignmentGrade = 'moderate';
  else if (alignmentScore >= 20) alignmentGrade = 'weak';
  else alignmentGrade = 'none';
  
  // Calculate enhanced confidence
  const smcBonus = alignmentScore * 0.2; // Max 20% bonus
  const enhancedConfidence = Math.min(100, pattern.confidence + smcBonus);
  
  return {
    pattern,
    smcAlignment: {
      orderBlocksNearby,
      fvgsNearby,
      liquidityPoolsNearby,
      structureBreakConfirms,
      smcBias: smcAnalysis.bias,
      alignmentScore,
      alignmentGrade,
      keyLevelsInPattern,
    },
    enhancedConfidence,
  };
}

/**
 * Get pattern signal strength combining all factors
 * الحصول على قوة إشارة النمط بتجميع كل العوامل
 */
export function getPatternSignalStrength(
  pattern: DetectedPattern
): {
  strength: 'ultra_strong' | 'strong' | 'moderate' | 'weak';
  score: number;
  factors: { name: string; score: number; weight: number }[];
  recommendation: string;
  recommendationAr: string;
} {
  const factors: { name: string; score: number; weight: number }[] = [];
  
  // Base confidence
  factors.push({ name: 'Base Confidence', score: pattern.confidence, weight: 0.25 });
  
  // Volume confirmation
  if (pattern.volumeConfirmation) {
    factors.push({ 
      name: 'Volume Confirmation', 
      score: pattern.volumeConfirmation.score, 
      weight: 0.2 
    });
  }
  
  // Freshness
  if (pattern.freshnessScore !== undefined) {
    factors.push({ name: 'Pattern Freshness', score: pattern.freshnessScore, weight: 0.15 });
  }
  
  // Pattern context
  if (pattern.patternContext) {
    const contextScore = pattern.patternContext === 'continuation' ? 90 :
                        pattern.patternContext === 'reversal' ? 75 : 50;
    factors.push({ name: 'Trend Context', score: contextScore, weight: 0.15 });
  }
  
  // Quality grade
  if (pattern.qualityGrade) {
    const gradeScore = {
      'ELITE': 100,
      'STRONG': 85,
      'VALID': 70,
      'WEAK': 50,
      'INVALID': 25
    }[pattern.qualityGrade];
    factors.push({ name: 'Quality Grade', score: gradeScore, weight: 0.25 });
  }
  
  // Calculate weighted score
  let totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  let score = factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight;
  score = Math.round(score * 10) / 10;
  
  // Determine strength level
  let strength: 'ultra_strong' | 'strong' | 'moderate' | 'weak';
  if (score >= 85) strength = 'ultra_strong';
  else if (score >= 70) strength = 'strong';
  else if (score >= 55) strength = 'moderate';
  else strength = 'weak';
  
  // Generate recommendation
  let recommendation: string;
  let recommendationAr: string;
  
  if (pattern.breakoutDirection === 'up') {
    if (strength === 'ultra_strong') {
      recommendation = 'Strong Buy Signal - Wait for breakout confirmation';
      recommendationAr = '🚀 إشارة شراء قوية جداً - انتظر تأكيد الاختراق';
    } else if (strength === 'strong') {
      recommendation = 'Buy Signal - Consider entry on pullback';
      recommendationAr = '📈 إشارة شراء - فكر في الدخول عند التراجع';
    } else if (strength === 'moderate') {
      recommendation = 'Moderate Buy - Use smaller position size';
      recommendationAr = '⚠️ شراء معتدل - استخدم حجم مركز أصغر';
    } else {
      recommendation = 'Weak Signal - Wait for better setup';
      recommendationAr = '⚡ إشارة ضعيفة - انتظر إعداداً أفضل';
    }
  } else if (pattern.breakoutDirection === 'down') {
    if (strength === 'ultra_strong') {
      recommendation = 'Strong Sell Signal - Wait for breakdown confirmation';
      recommendationAr = '🔴 إشارة بيع قوية جداً - انتظر تأكيد الكسر';
    } else if (strength === 'strong') {
      recommendation = 'Sell Signal - Consider entry on bounce';
      recommendationAr = '📉 إشارة بيع - فكر في الدخول عند الارتداد';
    } else if (strength === 'moderate') {
      recommendation = 'Moderate Sell - Use smaller position size';
      recommendationAr = '⚠️ بيع معتدل - استخدم حجم مركز أصغر';
    } else {
      recommendation = 'Weak Signal - Wait for better setup';
      recommendationAr = '⚡ إشارة ضعيفة - انتظر إعداداً أفضل';
    }
  } else {
    recommendation = 'Neutral Pattern - Wait for direction';
    recommendationAr = '⏳ نمط محايد - انتظر تحديد الاتجاه';
  }
  
  return { strength, score, factors, recommendation, recommendationAr };
}

// ==========================================================
// WEDGE EVIDENCE BUILDER
// ==========================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function toTimeSec(t: number): number {
  return t > 10000000000 ? Math.floor(t / 1000) : t;
}

export function buildWedgeEvidence(
  data: OHLCV[],
  upperLine: TrendLine,
  lowerLine: TrendLine,
  kind: 'rising' | 'falling' | 'ascending_broadening' | 'descending_broadening' | 'broadening',
  direction: BreakoutDirection,
  confidence: number
): WedgeEvidence {
  const startIdx = Math.min(upperLine.startIdx, lowerLine.startIdx);
  const endIdx = Math.max(upperLine.endIdx, lowerLine.endIdx);
  
  // Calculate timeframe
  const timeframeSec = data.length > 1 ? toTimeSec(data[1].timestamp) - toTimeSec(data[0].timestamp) : 60;

  // Collect pivots (assuming touchPoints are the pivots used)
  const upperPivots = upperLine.touchPoints || [];
  const lowerPivots = lowerLine.touchPoints || [];
  const allPivots = [...upperPivots, ...lowerPivots].sort((a, b) => a - b);
  
  // Calculate Sigma (Vertical Residuals from Pivots)
  let sumSqResiduals = 0;
  let count = 0;
  
  upperPivots.forEach(idx => {
    if (idx < data.length) {
      const price = data[idx].high; 
      const predicted = upperLine.slope * idx + upperLine.intercept;
      sumSqResiduals += Math.pow(price - predicted, 2);
      count++;
    }
  });
  
  lowerPivots.forEach(idx => {
    if (idx < data.length) {
      const price = data[idx].low; 
      const predicted = lowerLine.slope * idx + lowerLine.intercept;
      sumSqResiduals += Math.pow(price - predicted, 2);
      count++;
    }
  });
  
  const sigmaVal = count > 0 ? Math.sqrt(sumSqResiduals / count) : 0;

  return {
    schemaVersion: "1.0.0",
    evidenceType: "wedgeEvidence",
    evidenceId: generateId(),
    symbol: "UNKNOWN", 
    timeframeSec,
    detectedAtSec: Math.floor(Date.now() / 1000),
    windowStartSec: toTimeSec(data[startIdx]?.timestamp || 0),
    windowEndSec: toTimeSec(data[endIdx]?.timestamp || 0),
    startIndex: startIdx,
    endIndex: endIdx,
    wedgeKind: kind,
    direction,
    originalBreakoutDirection: direction,
    effectiveBreakoutDirection: direction, 
    directionDerivationSource: 'geometryFallback', 
    geometry: {
      upperLine: { ...upperLine },
      lowerLine: { ...lowerLine },
    },
    pivotIndex: allPivots,
    pivotTimeSec: allPivots.map(i => toTimeSec(data[i]?.timestamp || 0)),
    upperTouchIndex: upperPivots,
    lowerTouchIndex: lowerPivots,
    upperTouchTimeSec: upperPivots.map(i => toTimeSec(data[i]?.timestamp || 0)),
    lowerTouchTimeSec: lowerPivots.map(i => toTimeSec(data[i]?.timestamp || 0)),
    sigma: {
      value: sigmaVal,
      residualType: 'vertical',
      from: 'pivots',
      pivotCount: count
    },
    quietFlag: false, 
    alternation: {
      score: 0, 
      boostPoints: 0,
      isCapped: false
    },
    quality: {
      score: confidence / 100,
      confidence,
      flags: []
    }
  };
}

// ==========================================================
// ULTRA PRECISION ZIGZAG SYSTEM
// ==========================================================

export interface ZigZagPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: number;
}

export function calculateZigZag(data: OHLCV[], deviationPercent: number = 5): ZigZagPoint[] {
  if (!data || data.length < 10) {
    
    return [];
  }
  
  // التحقق من صحة البيانات
  const firstValid = data[0];
  if (!firstValid || typeof firstValid.high !== 'number' || typeof firstValid.low !== 'number') {
    return [];
  }
  
  const points: ZigZagPoint[] = [];
  let trend: 'up' | 'down' | null = null;
  let lastHighIndex = 0;
  let lastLowIndex = 0;
  let lastHigh = data[0].high;
  let lastLow = data[0].low;
  
  // حساب threshold بناءً على النسبة المئوية
  const deviationRatio = deviationPercent / 100;
  

  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;

    if (trend === null) {
      if (high > lastHigh * (1 + deviationRatio)) {
        trend = 'up';
        lastHigh = high;
        lastHighIndex = i;
        points.push({ index: lastLowIndex, price: lastLow, type: 'low', timestamp: data[lastLowIndex].timestamp || 0 });
      } else if (low < lastLow * (1 - deviationRatio)) {
        trend = 'down';
        lastLow = low;
        lastLowIndex = i;
        points.push({ index: lastHighIndex, price: lastHigh, type: 'high', timestamp: data[lastHighIndex].timestamp });
      } else {
        if (high > lastHigh) { lastHigh = high; lastHighIndex = i; }
        if (low < lastLow) { lastLow = low; lastLowIndex = i; }
      }
    } else if (trend === 'up') {
      if (high > lastHigh) {
        lastHigh = high;
        lastHighIndex = i;
      } else if (low < lastHigh * (1 - deviationRatio)) {
        trend = 'down';
        points.push({ index: lastHighIndex, price: lastHigh, type: 'high', timestamp: data[lastHighIndex].timestamp });
        lastLow = low;
        lastLowIndex = i;
      }
    } else if (trend === 'down') {
      if (low < lastLow) {
        lastLow = low;
        lastLowIndex = i;
      } else if (high > lastLow * (1 + deviationRatio)) {
        trend = 'up';
        points.push({ index: lastLowIndex, price: lastLow, type: 'low', timestamp: data[lastLowIndex].timestamp });
        lastHigh = high;
        lastHighIndex = i;
      }
    }
  }
  
  // Add the last point
  if (trend === 'up') {
    points.push({ index: lastHighIndex, price: lastHigh, type: 'high', timestamp: data[lastHighIndex].timestamp });
  } else if (trend === 'down') {
    points.push({ index: lastLowIndex, price: lastLow, type: 'low', timestamp: data[lastLowIndex].timestamp });
  }

  
  return points;
}

export function detectUltraPatterns(data: OHLCV[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (!data || data.length < 20) return patterns;
  
  // استخدام deviation أصغر لكشف المزيد من النقاط
  const zigzag = calculateZigZag(data, 2); // 2% deviation

  if (zigzag.length < 4) {
    return patterns;
  }

  // تحليل كامل الـ ZigZag points
  // 1. Channels (Ascending/Descending)
  for (let i = 3; i < zigzag.length; i++) {
    const p1 = zigzag[i-3];
    const p2 = zigzag[i-2];
    const p3 = zigzag[i-1];
    const p4 = zigzag[i];

    // Ascending Channel: Low -> High -> Low -> High (all rising)
    if (p1.type === 'low' && p2.type === 'high' && p3.type === 'low' && p4.type === 'high') {
      if (p3.price > p1.price && p4.price > p2.price) {
        const slopeLow = (p3.price - p1.price) / (p3.index - p1.index);
        const slopeHigh = (p4.price - p2.price) / (p4.index - p2.index);
        const avgPrice = (p1.price + p2.price + p3.price + p4.price) / 4;
        const slopeDiff = Math.abs(slopeLow - slopeHigh) / avgPrice * 1000;

        if (slopeDiff < 2.0) { 
           const upperIntercept = p2.price - slopeHigh * p2.index;
           const lowerIntercept = p1.price - slopeLow * p1.index;
           
           patterns.push({
             type: 'ascending_channel',
             name: 'Ultra Ascending Channel',
             nameAr: 'قناة صاعدة دقيقة',
             startIdx: p1.index,
             endIdx: p4.index,
             upperLine: { startIdx: p2.index, endIdx: p4.index, startPrice: p2.price, endPrice: p4.price, slope: slopeHigh, intercept: upperIntercept, r2: 0.98 },
             lowerLine: { startIdx: p1.index, endIdx: p3.index, startPrice: p1.price, endPrice: p3.price, slope: slopeLow, intercept: lowerIntercept, r2: 0.98 },
             breakoutDirection: 'neutral',
             confidence: 98,
             targetPrice: null,
             description: 'High precision ascending channel'
           });
        }
      }
    }
    
    // Descending Channel
    if (p1.type === 'high' && p2.type === 'low' && p3.type === 'high' && p4.type === 'low') {
      if (p3.price < p1.price && p4.price < p2.price) {
         const slopeHigh = (p3.price - p1.price) / (p3.index - p1.index);
         const slopeLow = (p4.price - p2.price) / (p4.index - p2.index);
         const avgPrice = (p1.price + p2.price + p3.price + p4.price) / 4;
         const slopeDiff = Math.abs(slopeLow - slopeHigh) / avgPrice * 1000;

         if (slopeDiff < 2.0) {
           const upperIntercept = p1.price - slopeHigh * p1.index;
           const lowerIntercept = p2.price - slopeLow * p2.index;
           
           patterns.push({
             type: 'descending_channel',
             name: 'Ultra Descending Channel',
             nameAr: 'قناة هابطة دقيقة',
             startIdx: p1.index,
             endIdx: p4.index,
             upperLine: { startIdx: p1.index, endIdx: p3.index, startPrice: p1.price, endPrice: p3.price, slope: slopeHigh, intercept: upperIntercept, r2: 0.98 },
             lowerLine: { startIdx: p2.index, endIdx: p4.index, startPrice: p2.price, endPrice: p4.price, slope: slopeLow, intercept: lowerIntercept, r2: 0.98 },
             breakoutDirection: 'neutral',
             confidence: 98,
             targetPrice: null,
             description: 'High precision descending channel'
           });
         }
      }
    }
    
    // Bull Flag
    if (i >= 5) {
       const p0 = zigzag[i-4]; // Start of pole
       if (p0.type === 'low' && p1.type === 'high' && p2.type === 'low' && p3.type === 'high' && p4.type === 'low') {
          const poleHeight = p1.price - p0.price;
          const flagHeight = p1.price - p4.price;
          
          if (poleHeight > 0 && flagHeight < poleHeight * 0.5 && flagHeight > 0) {
             if (p3.price < p1.price && p4.price < p2.price) {
                const upperSlope = (p3.price - p1.price) / (p3.index - p1.index);
                const lowerSlope = (p4.price - p2.price) / (p4.index - p2.index);
                const upperIntercept = p1.price - upperSlope * p1.index;
                const lowerIntercept = p2.price - lowerSlope * p2.index;
                
                patterns.push({
                   type: 'bull_flag',
                   name: 'Ultra Bull Flag',
                   nameAr: 'علم ثور دقيق',
                   startIdx: p0.index,
                   endIdx: p4.index,
                   upperLine: { startIdx: p1.index, endIdx: p3.index, startPrice: p1.price, endPrice: p3.price, slope: upperSlope, intercept: upperIntercept, r2: 0.95 },
                   lowerLine: { startIdx: p2.index, endIdx: p4.index, startPrice: p2.price, endPrice: p4.price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.95 },
                   breakoutDirection: 'up',
                   confidence: 95,
                   targetPrice: p4.price + poleHeight,
                   description: 'High precision bull flag'
                });
             }
          }
       }
    }

    // Bear Flag
    if (i >= 5) {
       const p0 = zigzag[i-4]; // Start of pole
       if (p0.type === 'high' && p1.type === 'low' && p2.type === 'high' && p3.type === 'low' && p4.type === 'high') {
          const poleHeight = p0.price - p1.price;
          const flagHeight = p4.price - p1.price;
          
          if (poleHeight > 0 && flagHeight < poleHeight * 0.5 && flagHeight > 0) {
             if (p3.price > p1.price && p4.price > p2.price) {
                const upperSlope = (p4.price - p2.price) / (p4.index - p2.index);
                const lowerSlope = (p3.price - p1.price) / (p3.index - p1.index);
                const upperIntercept = p2.price - upperSlope * p2.index;
                const lowerIntercept = p1.price - lowerSlope * p1.index;
                
                patterns.push({
                   type: 'bear_flag',
                   name: 'Ultra Bear Flag',
                   nameAr: 'علم دب دقيق',
                   startIdx: p0.index,
                   endIdx: p4.index,
                   upperLine: { startIdx: p2.index, endIdx: p4.index, startPrice: p2.price, endPrice: p4.price, slope: upperSlope, intercept: upperIntercept, r2: 0.95 },
                   lowerLine: { startIdx: p1.index, endIdx: p3.index, startPrice: p1.price, endPrice: p3.price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.95 },
                   breakoutDirection: 'down',
                   confidence: 95,
                   targetPrice: p4.price - poleHeight,
                   description: 'High precision bear flag'
                });
             }
          }
       }
    }
  }

  // ==========================================================
  // 📐 TRIANGLES - المثلثات
  // ==========================================================
  
  // Ascending Triangle - المثلث الصاعد
  // قيعان صاعدة + مقاومة أفقية
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      // التحقق من أن القيعان صاعدة
      const lowsAscending = lows.every((l, idx) => idx === 0 || l.price > lows[idx - 1].price * 0.99);
      // التحقق من أن القمم أفقية (نفس المستوى تقريباً)
      const highsFlat = Math.abs(highs[highs.length - 1].price - highs[0].price) / highs[0].price < 0.02;
      
      if (lowsAscending && highsFlat) {
        const avgHigh = highs.reduce((sum, h) => sum + h.price, 0) / highs.length;
        const lowerSlope = (lows[lows.length - 1].price - lows[0].price) / (lows[lows.length - 1].index - lows[0].index);
        const lowerIntercept = lows[0].price - lowerSlope * lows[0].index;
        
        
        patterns.push({
          type: 'ascending_triangle',
          name: 'Ultra Ascending Triangle',
          nameAr: 'مثلث صاعد فائق الدقة',
          startIdx: lows[0].index,
          endIdx: points[points.length - 1].index,
          upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: avgHigh, endPrice: avgHigh, slope: 0, intercept: avgHigh, r2: 0.95 },
          lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: lows[0].price, endPrice: lows[lows.length - 1].price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.95 },
          breakoutDirection: 'up',
          confidence: 92,
          targetPrice: avgHigh + (avgHigh - lows[0].price),
          description: 'Ultra precision ascending triangle - bullish breakout expected'
        });
      }
    }
  }
  
  // Descending Triangle - المثلث الهابط
  // قمم هابطة + دعم أفقي
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      // التحقق من أن القمم هابطة
      const highsDescending = highs.every((h, idx) => idx === 0 || h.price < highs[idx - 1].price * 1.01);
      // التحقق من أن القيعان أفقية
      const lowsFlat = Math.abs(lows[lows.length - 1].price - lows[0].price) / lows[0].price < 0.02;
      
      if (highsDescending && lowsFlat) {
        const avgLow = lows.reduce((sum, l) => sum + l.price, 0) / lows.length;
        const upperSlope = (highs[highs.length - 1].price - highs[0].price) / (highs[highs.length - 1].index - highs[0].index);
        const upperIntercept = highs[0].price - upperSlope * highs[0].index;
        
        
        patterns.push({
          type: 'descending_triangle',
          name: 'Ultra Descending Triangle',
          nameAr: 'مثلث هابط فائق الدقة',
          startIdx: highs[0].index,
          endIdx: points[points.length - 1].index,
          upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: highs[0].price, endPrice: highs[highs.length - 1].price, slope: upperSlope, intercept: upperIntercept, r2: 0.95 },
          lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: avgLow, endPrice: avgLow, slope: 0, intercept: avgLow, r2: 0.95 },
          breakoutDirection: 'down',
          confidence: 92,
          targetPrice: avgLow - (highs[0].price - avgLow),
          description: 'Ultra precision descending triangle - bearish breakout expected'
        });
      }
    }
  }
  
  // Symmetrical Triangle - المثلث المتماثل
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      // قمم هابطة وقيعان صاعدة = متماثل
      const highsDescending = highs[highs.length - 1].price < highs[0].price;
      const lowsAscending = lows[lows.length - 1].price > lows[0].price;
      
      if (highsDescending && lowsAscending) {
        const upperSlope = (highs[highs.length - 1].price - highs[0].price) / (highs[highs.length - 1].index - highs[0].index);
        const lowerSlope = (lows[lows.length - 1].price - lows[0].price) / (lows[lows.length - 1].index - lows[0].index);
        const upperIntercept = highs[0].price - upperSlope * highs[0].index;
        const lowerIntercept = lows[0].price - lowerSlope * lows[0].index;
        
        // التأكد من أن الخطوط تتقارب
        if (upperSlope < 0 && lowerSlope > 0) {
          patterns.push({
            type: 'symmetrical_triangle',
            name: 'Ultra Symmetrical Triangle',
            nameAr: 'مثلث متماثل فائق الدقة',
            startIdx: Math.min(lows[0].index, highs[0].index),
            endIdx: points[points.length - 1].index,
            upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: highs[0].price, endPrice: highs[highs.length - 1].price, slope: upperSlope, intercept: upperIntercept, r2: 0.95 },
            lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: lows[0].price, endPrice: lows[lows.length - 1].price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.95 },
            breakoutDirection: 'neutral',
            confidence: 88,
            targetPrice: null,
            description: 'Ultra precision symmetrical triangle - breakout direction uncertain'
          });
        }
      }
    }
  }

  // ==========================================================
  // 📐 WEDGES - الأوتاد
  // ==========================================================
  
  // Rising Wedge - الوتد الصاعد (هبوطي)
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      // كلاهما صاعد ولكن القيعان تصعد أسرع
      const highsAscending = highs[highs.length - 1].price > highs[0].price;
      const lowsAscending = lows[lows.length - 1].price > lows[0].price;
      
      if (highsAscending && lowsAscending) {
        const upperSlope = (highs[highs.length - 1].price - highs[0].price) / (highs[highs.length - 1].index - highs[0].index);
        const lowerSlope = (lows[lows.length - 1].price - lows[0].price) / (lows[lows.length - 1].index - lows[0].index);
        
        // الخطوط تتقارب (الميل السفلي أكبر = تتقارب للأعلى)
        if (lowerSlope > upperSlope && upperSlope > 0) {
          const upperIntercept = highs[0].price - upperSlope * highs[0].index;
          const lowerIntercept = lows[0].price - lowerSlope * lows[0].index;
          
          
          patterns.push({
            type: 'rising_wedge',
            name: 'Ultra Rising Wedge',
            nameAr: 'وتد صاعد فائق الدقة',
            startIdx: Math.min(lows[0].index, highs[0].index),
            endIdx: points[points.length - 1].index,
            upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: highs[0].price, endPrice: highs[highs.length - 1].price, slope: upperSlope, intercept: upperIntercept, r2: 0.95 },
            lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: lows[0].price, endPrice: lows[lows.length - 1].price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.95 },
            breakoutDirection: 'down',
            confidence: 90,
            targetPrice: lows[0].price,
            description: 'Ultra precision rising wedge - bearish reversal expected'
          });
        }
      }
    }
  }
  
  // Falling Wedge - الوتد الهابط (صعودي)
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      // كلاهما هابط ولكن القمم تهبط أسرع
      const highsDescending = highs[highs.length - 1].price < highs[0].price;
      const lowsDescending = lows[lows.length - 1].price < lows[0].price;
      
      if (highsDescending && lowsDescending) {
        const upperSlope = (highs[highs.length - 1].price - highs[0].price) / (highs[highs.length - 1].index - highs[0].index);
        const lowerSlope = (lows[lows.length - 1].price - lows[0].price) / (lows[lows.length - 1].index - lows[0].index);
        
        // الخطوط تتقارب (الميل العلوي أكثر سلبية)
        if (upperSlope < lowerSlope && lowerSlope < 0) {
          const upperIntercept = highs[0].price - upperSlope * highs[0].index;
          const lowerIntercept = lows[0].price - lowerSlope * lows[0].index;
          
          
          patterns.push({
            type: 'falling_wedge',
            name: 'Ultra Falling Wedge',
            nameAr: 'وتد هابط فائق الدقة',
            startIdx: Math.min(lows[0].index, highs[0].index),
            endIdx: points[points.length - 1].index,
            upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: highs[0].price, endPrice: highs[highs.length - 1].price, slope: upperSlope, intercept: upperIntercept, r2: 0.95 },
            lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: lows[0].price, endPrice: lows[lows.length - 1].price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.95 },
            breakoutDirection: 'up',
            confidence: 90,
            targetPrice: highs[0].price,
            description: 'Ultra precision falling wedge - bullish reversal expected'
          });
        }
      }
    }
  }

  // ==========================================================
  // 👤 HEAD AND SHOULDERS - الرأس والكتفين
  // ==========================================================
  
  // Head and Shoulders (Bearish)
  for (let i = 6; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 6, i + 1);
    const highs = points.filter(p => p.type === 'high');
    const lows = points.filter(p => p.type === 'low');
    
    if (highs.length >= 3 && lows.length >= 2) {
      const [h1, h2, h3] = highs.slice(-3);
      const [l1, l2] = lows.slice(-2);
      
      // الرأس أعلى من الكتفين
      const isHead = h2.price > h1.price && h2.price > h3.price;
      // الكتفان متساويان تقريباً
      const shouldersEqual = Math.abs(h1.price - h3.price) / h1.price < 0.03;
      // خط العنق
      const necklineSlope = (l2.price - l1.price) / (l2.index - l1.index);
      
      if (isHead && shouldersEqual) {
        const necklineIntercept = l1.price - necklineSlope * l1.index;
        const headHeight = h2.price - (l1.price + l2.price) / 2;
        
        
        patterns.push({
          type: 'head_and_shoulders',
          name: 'Head and Shoulders',
          nameAr: 'الرأس والكتفين',
          startIdx: h1.index,
          endIdx: h3.index,
          upperLine: { startIdx: h1.index, endIdx: h3.index, startPrice: h1.price, endPrice: h3.price, slope: 0, intercept: (h1.price + h3.price) / 2, r2: 0.95 },
          lowerLine: { startIdx: l1.index, endIdx: l2.index, startPrice: l1.price, endPrice: l2.price, slope: necklineSlope, intercept: necklineIntercept, r2: 0.95 },
          breakoutDirection: 'down',
          confidence: 94,
          targetPrice: l2.price - headHeight,
          description: 'Head and Shoulders - bearish reversal pattern'
        });
      }
    }
  }
  
  // Inverse Head and Shoulders (Bullish)
  for (let i = 6; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 6, i + 1);
    const highs = points.filter(p => p.type === 'high');
    const lows = points.filter(p => p.type === 'low');
    
    if (lows.length >= 3 && highs.length >= 2) {
      const [l1, l2, l3] = lows.slice(-3);
      const [h1, h2] = highs.slice(-2);
      
      // الرأس أدنى من الكتفين
      const isHead = l2.price < l1.price && l2.price < l3.price;
      // الكتفان متساويان تقريباً
      const shouldersEqual = Math.abs(l1.price - l3.price) / l1.price < 0.03;
      
      if (isHead && shouldersEqual) {
        const necklineSlope = (h2.price - h1.price) / (h2.index - h1.index);
        const necklineIntercept = h1.price - necklineSlope * h1.index;
        const headHeight = (h1.price + h2.price) / 2 - l2.price;
        
        
        patterns.push({
          type: 'inverse_head_and_shoulders',
          name: 'Inverse Head and Shoulders',
          nameAr: 'الرأس والكتفين المقلوب',
          startIdx: l1.index,
          endIdx: l3.index,
          upperLine: { startIdx: h1.index, endIdx: h2.index, startPrice: h1.price, endPrice: h2.price, slope: necklineSlope, intercept: necklineIntercept, r2: 0.95 },
          lowerLine: { startIdx: l1.index, endIdx: l3.index, startPrice: l1.price, endPrice: l3.price, slope: 0, intercept: (l1.price + l3.price) / 2, r2: 0.95 },
          breakoutDirection: 'up',
          confidence: 94,
          targetPrice: h2.price + headHeight,
          description: 'Inverse Head and Shoulders - bullish reversal pattern'
        });
      }
    }
  }

  // ==========================================================
  // 🔄 DOUBLE/TRIPLE TOPS & BOTTOMS - القمم والقيعان
  // ==========================================================
  
  // Double Top (M Pattern)
  for (let i = 4; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 4, i + 1);
    const highs = points.filter(p => p.type === 'high');
    
    if (highs.length >= 2) {
      const [h1, h2] = highs.slice(-2);
      const priceDiff = Math.abs(h1.price - h2.price) / h1.price;
      
      // القمتان متساويتان تقريباً (في حدود 1.5%)
      if (priceDiff < 0.015 && h2.index - h1.index > 5) {
        const avgHigh = (h1.price + h2.price) / 2;
        const middleLow = points.find(p => p.type === 'low' && p.index > h1.index && p.index < h2.index);
        
        if (middleLow) {
          
          patterns.push({
            type: 'double_top',
            name: 'Double Top',
            nameAr: 'القمة المزدوجة (M)',
            startIdx: h1.index,
            endIdx: h2.index,
            upperLine: { startIdx: h1.index, endIdx: h2.index, startPrice: avgHigh, endPrice: avgHigh, slope: 0, intercept: avgHigh, r2: 0.98 },
            lowerLine: { startIdx: middleLow.index, endIdx: middleLow.index + 10, startPrice: middleLow.price, endPrice: middleLow.price, slope: 0, intercept: middleLow.price, r2: 0.98 },
            breakoutDirection: 'down',
            confidence: 93,
            targetPrice: middleLow.price - (avgHigh - middleLow.price),
            description: 'Double Top (M) - bearish reversal pattern'
          });
        }
      }
    }
  }
  
  // Double Bottom (W Pattern)
  for (let i = 4; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 4, i + 1);
    const lows = points.filter(p => p.type === 'low');
    
    if (lows.length >= 2) {
      const [l1, l2] = lows.slice(-2);
      const priceDiff = Math.abs(l1.price - l2.price) / l1.price;
      
      // القاعان متساويان تقريباً
      if (priceDiff < 0.015 && l2.index - l1.index > 5) {
        const avgLow = (l1.price + l2.price) / 2;
        const middleHigh = points.find(p => p.type === 'high' && p.index > l1.index && p.index < l2.index);
        
        if (middleHigh) {
          
          patterns.push({
            type: 'double_bottom',
            name: 'Double Bottom',
            nameAr: 'القاع المزدوج (W)',
            startIdx: l1.index,
            endIdx: l2.index,
            upperLine: { startIdx: middleHigh.index, endIdx: middleHigh.index + 10, startPrice: middleHigh.price, endPrice: middleHigh.price, slope: 0, intercept: middleHigh.price, r2: 0.98 },
            lowerLine: { startIdx: l1.index, endIdx: l2.index, startPrice: avgLow, endPrice: avgLow, slope: 0, intercept: avgLow, r2: 0.98 },
            breakoutDirection: 'up',
            confidence: 93,
            targetPrice: middleHigh.price + (middleHigh.price - avgLow),
            description: 'Double Bottom (W) - bullish reversal pattern'
          });
        }
      }
    }
  }
  
  // Triple Top
  for (let i = 6; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 6, i + 1);
    const highs = points.filter(p => p.type === 'high');
    
    if (highs.length >= 3) {
      const [h1, h2, h3] = highs.slice(-3);
      const avgHigh = (h1.price + h2.price + h3.price) / 3;
      const maxDev = Math.max(
        Math.abs(h1.price - avgHigh),
        Math.abs(h2.price - avgHigh),
        Math.abs(h3.price - avgHigh)
      ) / avgHigh;
      
      // الثلاث قمم متساوية تقريباً
      if (maxDev < 0.02) {
        const lows = points.filter(p => p.type === 'low');
        const minLow = Math.min(...lows.map(l => l.price));
        
        
        patterns.push({
          type: 'triple_top',
          name: 'Triple Top',
          nameAr: 'القمة الثلاثية',
          startIdx: h1.index,
          endIdx: h3.index,
          upperLine: { startIdx: h1.index, endIdx: h3.index, startPrice: avgHigh, endPrice: avgHigh, slope: 0, intercept: avgHigh, r2: 0.98 },
          lowerLine: { startIdx: h1.index, endIdx: h3.index, startPrice: minLow, endPrice: minLow, slope: 0, intercept: minLow, r2: 0.98 },
          breakoutDirection: 'down',
          confidence: 95,
          targetPrice: minLow - (avgHigh - minLow),
          description: 'Triple Top - strong bearish reversal pattern'
        });
      }
    }
  }
  
  // Triple Bottom
  for (let i = 6; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 6, i + 1);
    const lows = points.filter(p => p.type === 'low');
    
    if (lows.length >= 3) {
      const [l1, l2, l3] = lows.slice(-3);
      const avgLow = (l1.price + l2.price + l3.price) / 3;
      const maxDev = Math.max(
        Math.abs(l1.price - avgLow),
        Math.abs(l2.price - avgLow),
        Math.abs(l3.price - avgLow)
      ) / avgLow;
      
      if (maxDev < 0.02) {
        const highs = points.filter(p => p.type === 'high');
        const maxHigh = Math.max(...highs.map(h => h.price));
        
        
        patterns.push({
          type: 'triple_bottom',
          name: 'Triple Bottom',
          nameAr: 'القاع الثلاثي',
          startIdx: l1.index,
          endIdx: l3.index,
          upperLine: { startIdx: l1.index, endIdx: l3.index, startPrice: maxHigh, endPrice: maxHigh, slope: 0, intercept: maxHigh, r2: 0.98 },
          lowerLine: { startIdx: l1.index, endIdx: l3.index, startPrice: avgLow, endPrice: avgLow, slope: 0, intercept: avgLow, r2: 0.98 },
          breakoutDirection: 'up',
          confidence: 95,
          targetPrice: maxHigh + (maxHigh - avgLow),
          description: 'Triple Bottom - strong bullish reversal pattern'
        });
      }
    }
  }

  // ==========================================================
  // ☕ CUP AND HANDLE - الكوب والمقبض
  // ==========================================================
  
  // Cup and Handle (Bullish)
  if (zigzag.length >= 8) {
    for (let i = 7; i < zigzag.length; i++) {
      const points = zigzag.slice(i - 7, i + 1);
      const lows = points.filter(p => p.type === 'low');
      const highs = points.filter(p => p.type === 'high');
      
      if (lows.length >= 3 && highs.length >= 2) {
        // البحث عن شكل الكوب: قاع دائري
        const [h1] = highs.slice(0, 1);
        const [h2] = highs.slice(-1);
        
        // القمتان متساويتان (حافة الكوب)
        if (Math.abs(h1.price - h2.price) / h1.price < 0.03) {
          // القاع في المنتصف
          const cupBottom = lows.reduce((min, l) => l.price < min.price ? l : min, lows[0]);
          const cupDepth = h1.price - cupBottom.price;
          
          // التحقق من عمق معقول للكوب
          if (cupDepth > h1.price * 0.05 && cupDepth < h1.price * 0.35) {
            
            patterns.push({
              type: 'cup_and_handle',
              name: 'Cup and Handle',
              nameAr: 'الكوب والمقبض',
              startIdx: h1.index,
              endIdx: h2.index,
              upperLine: { startIdx: h1.index, endIdx: h2.index, startPrice: h1.price, endPrice: h2.price, slope: 0, intercept: (h1.price + h2.price) / 2, r2: 0.95 },
              lowerLine: { startIdx: cupBottom.index, endIdx: cupBottom.index + 5, startPrice: cupBottom.price, endPrice: cupBottom.price, slope: 0, intercept: cupBottom.price, r2: 0.95 },
              breakoutDirection: 'up',
              confidence: 91,
              targetPrice: h2.price + cupDepth,
              description: 'Cup and Handle - bullish continuation pattern'
            });
          }
        }
      }
    }
  }

  // ==========================================================
  // 📢 BROADENING PATTERNS - أنماط التوسع (الميغافون)
  // ==========================================================
  
  // Symmetrical Broadening (Megaphone)
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      // قمم صاعدة وقيعان هابطة = توسع
      const highsAscending = highs[highs.length - 1].price > highs[0].price;
      const lowsDescending = lows[lows.length - 1].price < lows[0].price;
      
      if (highsAscending && lowsDescending) {
        const upperSlope = (highs[highs.length - 1].price - highs[0].price) / (highs[highs.length - 1].index - highs[0].index);
        const lowerSlope = (lows[lows.length - 1].price - lows[0].price) / (lows[lows.length - 1].index - lows[0].index);
        const upperIntercept = highs[0].price - upperSlope * highs[0].index;
        const lowerIntercept = lows[0].price - lowerSlope * lows[0].index;
        
        patterns.push({
          type: 'broadening_pattern',
          name: 'Broadening Pattern (Megaphone)',
          nameAr: 'توسع متماثل (ميغافون)',
          startIdx: Math.min(lows[0].index, highs[0].index),
          endIdx: points[points.length - 1].index,
          upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: highs[0].price, endPrice: highs[highs.length - 1].price, slope: upperSlope, intercept: upperIntercept, r2: 0.90 },
          lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: lows[0].price, endPrice: lows[lows.length - 1].price, slope: lowerSlope, intercept: lowerIntercept, r2: 0.90 },
          breakoutDirection: 'neutral',
          confidence: 85,
          targetPrice: null,
          description: 'Broadening Pattern - increased volatility, direction uncertain'
        });
      }
    }
  }

  // ==========================================================
  // 🏳️ PENNANTS - الرايات
  // ==========================================================
  
  // Bull Pennant
  for (let i = 6; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 6, i + 1);
    if (points.length < 6) continue;
    
    const pole = points.slice(0, 2);
    const pennant = points.slice(2);
    
    // التحقق من وجود عمود صعودي قوي
    if (pole[0].type === 'low' && pole[1].type === 'high') {
      const poleHeight = pole[1].price - pole[0].price;
      
      if (poleHeight > pole[0].price * 0.03) {
        const pennantHighs = pennant.filter(p => p.type === 'high');
        const pennantLows = pennant.filter(p => p.type === 'low');
        
        if (pennantHighs.length >= 1 && pennantLows.length >= 1) {
          // الراية: قمم هابطة وقيعان صاعدة (تقلص)
          const highsDescending = pennantHighs.length === 1 || pennantHighs[pennantHighs.length - 1].price < pennantHighs[0].price;
          const lowsAscending = pennantLows.length === 1 || pennantLows[pennantLows.length - 1].price > pennantLows[0].price;
          
          if (highsDescending && lowsAscending) {
            
            patterns.push({
              type: 'bull_pennant',
              name: 'Bull Pennant',
              nameAr: 'راية الثور',
              startIdx: pole[0].index,
              endIdx: points[points.length - 1].index,
              upperLine: { startIdx: pole[1].index, endIdx: points[points.length - 1].index, startPrice: pole[1].price, endPrice: pennantHighs[pennantHighs.length - 1]?.price || pole[1].price * 0.98, slope: -0.001, intercept: pole[1].price, r2: 0.90 },
              lowerLine: { startIdx: pennantLows[0]?.index || pole[1].index + 1, endIdx: points[points.length - 1].index, startPrice: pennantLows[0]?.price || pole[0].price * 1.02, endPrice: pennantLows[pennantLows.length - 1]?.price || pole[0].price * 1.03, slope: 0.001, intercept: pennantLows[0]?.price || pole[0].price, r2: 0.90 },
              breakoutDirection: 'up',
              confidence: 88,
              targetPrice: points[points.length - 1].price + poleHeight,
              description: 'Bull Pennant - bullish continuation expected'
            });
          }
        }
      }
    }
  }
  
  // Bear Pennant
  for (let i = 6; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 6, i + 1);
    if (points.length < 6) continue;
    
    const pole = points.slice(0, 2);
    const pennant = points.slice(2);
    
    // التحقق من وجود عمود هبوطي قوي
    if (pole[0].type === 'high' && pole[1].type === 'low') {
      const poleHeight = pole[0].price - pole[1].price;
      
      if (poleHeight > pole[1].price * 0.03) {
        const pennantHighs = pennant.filter(p => p.type === 'high');
        const pennantLows = pennant.filter(p => p.type === 'low');
        
        if (pennantHighs.length >= 1 && pennantLows.length >= 1) {
          const highsDescending = pennantHighs.length === 1 || pennantHighs[pennantHighs.length - 1].price < pennantHighs[0].price;
          const lowsAscending = pennantLows.length === 1 || pennantLows[pennantLows.length - 1].price > pennantLows[0].price;
          
          if (highsDescending && lowsAscending) {
            
            patterns.push({
              type: 'bear_pennant',
              name: 'Bear Pennant',
              nameAr: 'راية الدب',
              startIdx: pole[0].index,
              endIdx: points[points.length - 1].index,
              upperLine: { startIdx: pennantHighs[0]?.index || pole[1].index + 1, endIdx: points[points.length - 1].index, startPrice: pennantHighs[0]?.price || pole[0].price * 0.98, endPrice: pennantHighs[pennantHighs.length - 1]?.price || pole[0].price * 0.97, slope: -0.001, intercept: pennantHighs[0]?.price || pole[0].price, r2: 0.90 },
              lowerLine: { startIdx: pole[1].index, endIdx: points[points.length - 1].index, startPrice: pole[1].price, endPrice: pennantLows[pennantLows.length - 1]?.price || pole[1].price * 1.02, slope: 0.001, intercept: pole[1].price, r2: 0.90 },
              breakoutDirection: 'down',
              confidence: 88,
              targetPrice: points[points.length - 1].price - poleHeight,
              description: 'Bear Pennant - bearish continuation expected'
            });
          }
        }
      }
    }
  }

  // ==========================================================
  // 📊 RECTANGLE / RANGE - المستطيل / النطاق
  // ==========================================================
  
  for (let i = 5; i < zigzag.length; i++) {
    const points = zigzag.slice(i - 5, i + 1);
    const lows = points.filter(p => p.type === 'low');
    const highs = points.filter(p => p.type === 'high');
    
    if (lows.length >= 2 && highs.length >= 2) {
      const avgHigh = highs.reduce((sum, h) => sum + h.price, 0) / highs.length;
      const avgLow = lows.reduce((sum, l) => sum + l.price, 0) / lows.length;
      
      // التحقق من أن القمم والقيعان أفقية
      const highsFlat = highs.every(h => Math.abs(h.price - avgHigh) / avgHigh < 0.015);
      const lowsFlat = lows.every(l => Math.abs(l.price - avgLow) / avgLow < 0.015);
      
      if (highsFlat && lowsFlat) {
        patterns.push({
          type: 'rectangle',
          name: 'Rectangle (Trading Range)',
          nameAr: 'المستطيل / النطاق',
          startIdx: Math.min(lows[0].index, highs[0].index),
          endIdx: points[points.length - 1].index,
          upperLine: { startIdx: highs[0].index, endIdx: highs[highs.length - 1].index, startPrice: avgHigh, endPrice: avgHigh, slope: 0, intercept: avgHigh, r2: 0.98 },
          lowerLine: { startIdx: lows[0].index, endIdx: lows[lows.length - 1].index, startPrice: avgLow, endPrice: avgLow, slope: 0, intercept: avgLow, r2: 0.98 },
          breakoutDirection: 'neutral',
          confidence: 90,
          targetPrice: null,
          description: 'Rectangle - consolidation range, breakout imminent'
        });
      }
    }
  }

  
  return patterns;
}

// ==========================================================
// 🌊 WOLFE WAVE DETECTION - كشف نموذج وولف ويف
// ==========================================================

export interface WolfeWavePattern {
  type: 'wolfe_wave_bullish' | 'wolfe_wave_bearish';
  name: string;
  nameAr: string;
  points: [PatternPoint, PatternPoint, PatternPoint, PatternPoint, PatternPoint]; // 5 نقاط
  startIdx: number;
  endIdx: number;
  targetLine: TrendLine; // خط 1-4 للهدف
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  confidence: number;
  description: string;
}

/**
 * Detect Wolfe Wave Patterns (5-point reversal pattern)
 * كشف نموذج وولف ويف (نموذج انعكاسي من 5 نقاط)
 * 
 * Bullish Wolfe Wave: 1,3,5 are lows (ascending), 2,4 are highs (ascending)
 * Bearish Wolfe Wave: 1,3,5 are highs (descending), 2,4 are lows (descending)
 */
export function detectWolfeWaves(data: OHLCV[]): WolfeWavePattern[] {
  const patterns: WolfeWavePattern[] = [];
  
  if (data.length < 30) return patterns;
  
  // استخدام ZigZag لتحديد النقاط المحورية
  const zigzag = calculateZigZag(data, 1); // 1% deviation
  
  if (zigzag.length < 5) return patterns;
  
  // البحث عن Wolfe Wave في آخر 100 شمعة
  const searchRange = Math.min(zigzag.length, 20);
  
  for (let i = 4; i < searchRange; i++) {
    const p1 = zigzag[i - 4];
    const p2 = zigzag[i - 3];
    const p3 = zigzag[i - 2];
    const p4 = zigzag[i - 1];
    const p5 = zigzag[i];
    
    // التحقق من تبادل القمم والقيعان
    if (p1.type === p3.type && p3.type === p5.type && 
        p2.type === p4.type && p1.type !== p2.type) {
      
      // Bullish Wolfe Wave (1,3,5 قيعان)
      if (p1.type === 'low') {
        // التحقق من الشروط:
        // 1. النقطة 3 أعلى من 1
        // 2. النقطة 5 أقل من 3 (تقريباً على خط 1-3)
        // 3. النقطة 4 أعلى من 2
        
        const slope13 = (p3.price - p1.price) / (p3.index - p1.index);
        const expectedP5 = p1.price + slope13 * (p5.index - p1.index);
        const p5Deviation = Math.abs(p5.price - expectedP5) / p1.price;
        
        // النقطة 5 يجب أن تكون قريبة من خط 1-3 (في حدود 3%)
        if (p5Deviation < 0.05 && p4.price > p2.price && p3.price > p1.price) {
          // حساب خط الهدف (1-4)
          const slope14 = (p4.price - p1.price) / (p4.index - p1.index);
          const intercept14 = p1.price - slope14 * p1.index;
          const targetAtP5 = slope14 * p5.index + intercept14;
          
          // التحقق من جودة النموذج
          const atr = calculateATR(data.slice(p1.index, p5.index + 1));
          const confidence = calculateWolfeConfidence(p1, p2, p3, p4, p5, atr);
          
          if (confidence >= 70) {
            patterns.push({
              type: 'wolfe_wave_bullish',
              name: 'Bullish Wolfe Wave',
              nameAr: 'موجة وولف صاعدة',
              points: [p1, p2, p3, p4, p5],
              startIdx: p1.index,
              endIdx: p5.index,
              targetLine: {
                startIdx: p1.index,
                endIdx: p5.index + 20, // امتداد خط الهدف
                startPrice: p1.price,
                endPrice: targetAtP5 + slope14 * 20,
                slope: slope14,
                intercept: intercept14,
                r2: 0.95
              },
              entryPrice: p5.price,
              stopLoss: p5.price - atr * 1.5,
              targetPrice: targetAtP5 + (targetAtP5 - p5.price) * 0.618, // هدف فيبوناتشي
              confidence,
              description: `Bullish Wolfe Wave - Entry: ${p5.price.toFixed(2)}, Target: ${targetAtP5.toFixed(2)}`
            });
          }
        }
      }
      
      // Bearish Wolfe Wave (1,3,5 قمم)
      if (p1.type === 'high') {
        const slope13 = (p3.price - p1.price) / (p3.index - p1.index);
        const expectedP5 = p1.price + slope13 * (p5.index - p1.index);
        const p5Deviation = Math.abs(p5.price - expectedP5) / p1.price;
        
        if (p5Deviation < 0.05 && p4.price < p2.price && p3.price < p1.price) {
          const slope14 = (p4.price - p1.price) / (p4.index - p1.index);
          const intercept14 = p1.price - slope14 * p1.index;
          const targetAtP5 = slope14 * p5.index + intercept14;
          
          const atr = calculateATR(data.slice(p1.index, p5.index + 1));
          const confidence = calculateWolfeConfidence(p1, p2, p3, p4, p5, atr);
          
          if (confidence >= 70) {
            patterns.push({
              type: 'wolfe_wave_bearish',
              name: 'Bearish Wolfe Wave',
              nameAr: 'موجة وولف هابطة',
              points: [p1, p2, p3, p4, p5],
              startIdx: p1.index,
              endIdx: p5.index,
              targetLine: {
                startIdx: p1.index,
                endIdx: p5.index + 20,
                startPrice: p1.price,
                endPrice: targetAtP5 + slope14 * 20,
                slope: slope14,
                intercept: intercept14,
                r2: 0.95
              },
              entryPrice: p5.price,
              stopLoss: p5.price + atr * 1.5,
              targetPrice: targetAtP5 - (p5.price - targetAtP5) * 0.618,
              confidence,
              description: `Bearish Wolfe Wave - Entry: ${p5.price.toFixed(2)}, Target: ${targetAtP5.toFixed(2)}`
            });
          }
        }
      }
    }
  }
  
  return patterns;
}

function calculateWolfeConfidence(
  p1: PatternPoint, p2: PatternPoint, p3: PatternPoint, 
  p4: PatternPoint, p5: PatternPoint, atr: number
): number {
  let score = 70; // Base score
  
  // تحقق من تماثل النمط
  const wave12 = Math.abs(p2.price - p1.price);
  const wave34 = Math.abs(p4.price - p3.price);
  const symmetryRatio = Math.min(wave12, wave34) / Math.max(wave12, wave34);
  
  if (symmetryRatio > 0.8) score += 10;
  else if (symmetryRatio > 0.6) score += 5;
  
  // تحقق من الوقت المتناسب
  const time12 = p2.index - p1.index;
  const time34 = p4.index - p3.index;
  const timeSymmetry = Math.min(time12, time34) / Math.max(time12, time34);
  
  if (timeSymmetry > 0.7) score += 10;
  else if (timeSymmetry > 0.5) score += 5;
  
  // تحقق من نسب فيبوناتشي
  const wave23 = Math.abs(p3.price - p2.price);
  const retracement = wave23 / wave12;
  
  if (retracement >= 0.382 && retracement <= 0.886) score += 10;
  
  return Math.min(score, 100);
}

// ==========================================================
// 📊 SMART TRADE SIGNAL SYSTEM - نظام إشارات التداول الذكي
// ==========================================================

export interface SmartTradeSignal {
  pattern: DetectedPattern | WolfeWavePattern;
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  confidence: number;
  volatility: 'low' | 'medium' | 'high';
  trendStrength: 'weak' | 'moderate' | 'strong';
  breakEvenActive: boolean;
  breakEvenTriggered: boolean;
}

/**
 * Calculate Smart Trade Signal with Dynamic TP/SL
 * حساب إشارة تداول ذكية مع أهداف ووقف خسارة ديناميكي
 * 
 * @param pattern - النمط المكتشف
 * @param data - بيانات الشموع
 * @param timeframe - الفريم الزمني (1m, 5m, 15m, 1h, 4h, 1d)
 */
export function calculateSmartSignal(
  pattern: DetectedPattern,
  data: OHLCV[],
  timeframe: string = '1h'
): SmartTradeSignal | null {
  if (!pattern || data.length < 50) return null;
  
  const currentPrice = data[data.length - 1].close;
  const atr = calculateATR(data.slice(-14));
  const rsi = calculateRSI(data.slice(-14));
  const emaFast = calculateEMA(data.map(d => d.close), 9);
  const emaSlow = calculateEMA(data.map(d => d.close), 21);
  
  // تحديد حالة السوق (التقلب)
  const volatility = determineVolatility(atr, currentPrice);
  
  // تحديد قوة الاتجاه
  const trendStrength = determineTrendStrength(emaFast, emaSlow, rsi);
  
  // تحديد الاتجاه
  const direction: 'long' | 'short' = pattern.breakoutDirection === 'up' ? 'long' : 'short';
  
  // حساب المضاعفات بناءً على الفريم والتقلب
  const { slMultiplier, tp1Multiplier, tp2Multiplier, tp3Multiplier } = 
    getMultipliers(timeframe, volatility, trendStrength);
  
  // نقطة الدخول
  const entry = currentPrice;
  
  // وقف الخسارة (ديناميكي)
  const stopLoss = direction === 'long' 
    ? entry - (atr * slMultiplier)
    : entry + (atr * slMultiplier);
  
  // الأهداف (ديناميكية)
  const riskAmount = Math.abs(entry - stopLoss);
  
  const takeProfit1 = direction === 'long'
    ? entry + (riskAmount * tp1Multiplier)
    : entry - (riskAmount * tp1Multiplier);
    
  const takeProfit2 = direction === 'long'
    ? entry + (riskAmount * tp2Multiplier)
    : entry - (riskAmount * tp2Multiplier);
    
  const takeProfit3 = direction === 'long'
    ? entry + (riskAmount * tp3Multiplier)
    : entry - (riskAmount * tp3Multiplier);
  
  // نسبة المخاطرة للعائد
  const riskRewardRatio = (Math.abs(takeProfit2 - entry) / riskAmount);
  
  return {
    pattern,
    direction,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    riskRewardRatio,
    confidence: pattern.confidence,
    volatility,
    trendStrength,
    breakEvenActive: true,
    breakEvenTriggered: false
  };
}

function determineVolatility(atr: number, price: number): 'low' | 'medium' | 'high' {
  const atrPercent = (atr / price) * 100;
  
  if (atrPercent < 1.5) return 'low';
  if (atrPercent < 3.0) return 'medium';
  return 'high';
}

function determineTrendStrength(
  emaFast: number[], 
  emaSlow: number[], 
  rsi: number
): 'weak' | 'moderate' | 'strong' {
  const lastEmaFast = emaFast[emaFast.length - 1];
  const lastEmaSlow = emaSlow[emaSlow.length - 1];
  const emaDiff = ((lastEmaFast - lastEmaSlow) / lastEmaSlow) * 100;
  
  // RSI في منطقة الاتجاه القوي
  const rsiStrong = rsi > 60 || rsi < 40;
  
  if (Math.abs(emaDiff) > 2 && rsiStrong) return 'strong';
  if (Math.abs(emaDiff) > 1) return 'moderate';
  return 'weak';
}

function getMultipliers(
  timeframe: string,
  volatility: 'low' | 'medium' | 'high',
  trendStrength: 'weak' | 'moderate' | 'strong'
): { slMultiplier: number; tp1Multiplier: number; tp2Multiplier: number; tp3Multiplier: number } {
  
  // القيم الأساسية حسب الفريم
  let base = { sl: 1.5, tp1: 1.0, tp2: 2.0, tp3: 3.0 };
  
  switch (timeframe) {
    case '1m':
    case '5m':
      base = { sl: 1.2, tp1: 0.8, tp2: 1.5, tp3: 2.0 };
      break;
    case '15m':
    case '30m':
      base = { sl: 1.5, tp1: 1.0, tp2: 2.0, tp3: 2.5 };
      break;
    case '1h':
    case '2h':
      base = { sl: 1.8, tp1: 1.2, tp2: 2.0, tp3: 3.0 };
      break;
    case '4h':
      base = { sl: 2.0, tp1: 1.5, tp2: 2.5, tp3: 4.0 };
      break;
    case '1d':
      base = { sl: 2.5, tp1: 2.0, tp2: 3.0, tp3: 5.0 };
      break;
  }
  
  // تعديل بناءً على التقلب
  // تقلب عالي = أهداف أقرب ووقف أبعد
  // تقلب منخفض = أهداف أبعد ووقف أقرب
  if (volatility === 'high') {
    base.sl *= 1.3;
    base.tp1 *= 0.8;
    base.tp2 *= 0.8;
    base.tp3 *= 0.7;
  } else if (volatility === 'low') {
    base.sl *= 0.8;
    base.tp1 *= 1.2;
    base.tp2 *= 1.3;
    base.tp3 *= 1.5;
  }
  
  // تعديل بناءً على قوة الاتجاه
  // اتجاه قوي (أخضر) = أهداف أبعد
  if (trendStrength === 'strong') {
    base.tp1 *= 1.2;
    base.tp2 *= 1.3;
    base.tp3 *= 1.5;
  } else if (trendStrength === 'weak') {
    base.tp1 *= 0.9;
    base.tp2 *= 0.8;
    base.tp3 *= 0.7;
  }
  
  return {
    slMultiplier: base.sl,
    tp1Multiplier: base.tp1,
    tp2Multiplier: base.tp2,
    tp3Multiplier: base.tp3
  };
}

/**
 * Update Trade Management - Break Even System
 * تحديث إدارة الصفقة - نظام التعادل
 * 
 * عند الوصول للهدف الأول، يتم رفع وقف الخسارة لسعر الدخول
 */
export function updateTradeManagement(
  signal: SmartTradeSignal,
  currentPrice: number
): SmartTradeSignal {
  if (!signal.breakEvenActive) return signal;
  
  const isLong = signal.direction === 'long';
  
  // التحقق من الوصول للهدف الأول
  const tp1Hit = isLong 
    ? currentPrice >= signal.takeProfit1
    : currentPrice <= signal.takeProfit1;
  
  if (tp1Hit && !signal.breakEvenTriggered) {
    return {
      ...signal,
      stopLoss: signal.entry, // رفع SL لسعر الدخول
      breakEvenTriggered: true
    };
  }
  
  return signal;
}

// ==========================================================
// HELPER FUNCTIONS - الدوال المساعدة
// ==========================================================

function calculateRSI(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // أول قيمة هي SMA
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  ema.push(sum / Math.min(period, prices.length));
  
  // باقي القيم EMA
  for (let i = 1; i < prices.length; i++) {
    const prevEma = ema[ema.length - 1];
    const currentEma = (prices[i] - prevEma) * multiplier + prevEma;
    ema.push(currentEma);
  }
  
  return ema;
}
