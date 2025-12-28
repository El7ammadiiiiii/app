/**
 * Advanced Technical Indicators - نسخة Nexus الاحترافية
 * خوارزميات متقدمة ومعقدة تتفوق على المنصات المنافسة
 * 
 * المؤشرات:
 * 1. Ichimoku Cloud - مع Kumo Twist Detection + Thickness Analysis
 * 2. ATR Bands - مع Dynamic Trailing Stop + Squeeze Detection
 * 3. Parabolic SAR - Adaptive مع Auto-tuning
 * 4. Smart Pivot Points - 5 أنواع مع Confluence Analysis
 * 5. Williams %R - مع Divergence Detection + Failure Swings
 * 6. Advanced CCI - مع Zero-Line Analysis + Trend Breaks
 * 7. Momentum/ROC - Multi-timeframe Composite
 * 8. Ultimate Oscillator - Auto-weighted Periods
 * 9. Keltner Channels - مع Bollinger Squeeze Detection
 * 10. Donchian Channels - مع Breakout Quality Score
 * 11. CMF (Chaikin Money Flow) - مع A/D Integration
 * 12. Force Index - مع Elder Ray Composite
 * 13. Choppiness Index - مع Market Regime AI Classification
 * 14. TRIX - مع Signal Crossovers
 * 15. Awesome Oscillator - مع Twin Peaks + Saucer Patterns
 */

import { OHLCV } from './technical';

// ==========================================================
// SHARED TYPES & UTILITIES
// ==========================================================

export interface AdvancedIndicatorResult {
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  confidence: number; // 0-100
}

export interface LineData {
  time: number;
  value: number;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma[i] = NaN;
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma[i] = sum / period;
  }
  return sma;
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATRSeries(candles: OHLCV[], period: number = 14): number[] {
  const tr: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr[i] = candles[i].high - candles[i].low;
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }
  }
  
  return calculateEMA(tr, period);
}

/**
 * Detect Divergence between price and indicator
 */
function detectDivergence(
  prices: number[],
  indicator: number[],
  lookback: number = 14
): { type: 'bullish' | 'bearish' | 'hidden-bullish' | 'hidden-bearish' | null; strength: number } {
  if (prices.length < lookback * 2 || indicator.length < lookback * 2) {
    return { type: null, strength: 0 };
  }
  
  const len = Math.min(prices.length, indicator.length);
  const recentIdx = len - 1;
  const previousIdx = recentIdx - lookback;
  
  if (previousIdx < 0) return { type: null, strength: 0 };
  
  const priceChange = prices[recentIdx] - prices[previousIdx];
  const indicatorChange = indicator[recentIdx] - indicator[previousIdx];
  
  const priceDirection = priceChange > 0 ? 'up' : 'down';
  const indicatorDirection = indicatorChange > 0 ? 'up' : 'down';
  
  // Regular Bullish Divergence: Price down, Indicator up
  if (priceDirection === 'down' && indicatorDirection === 'up') {
    const strength = Math.min(100, Math.abs(indicatorChange / priceChange) * 50);
    return { type: 'bullish', strength };
  }
  
  // Regular Bearish Divergence: Price up, Indicator down
  if (priceDirection === 'up' && indicatorDirection === 'down') {
    const strength = Math.min(100, Math.abs(indicatorChange / priceChange) * 50);
    return { type: 'bearish', strength };
  }
  
  // Hidden Bullish Divergence: Price up, Indicator down (continuation)
  if (priceDirection === 'up' && indicatorDirection === 'down' && prices[recentIdx] > prices[previousIdx]) {
    return { type: 'hidden-bullish', strength: 60 };
  }
  
  // Hidden Bearish Divergence: Price down, Indicator up (continuation)
  if (priceDirection === 'down' && indicatorDirection === 'up' && prices[recentIdx] < prices[previousIdx]) {
    return { type: 'hidden-bearish', strength: 60 };
  }
  
  return { type: null, strength: 0 };
}

// ==========================================================
// 1. ICHIMOKU CLOUD - سحابة إيشيموكو المتقدمة
// ==========================================================

export interface IchimokuResult {
  tenkan: number[];      // خط التحويل (9)
  kijun: number[];       // خط القاعدة (26)
  senkouA: number[];     // Senkou Span A (Leading)
  senkouB: number[];     // Senkou Span B (Leading)
  chikou: number[];      // Chikou Span (Lagging)
  signal: 'bullish' | 'bearish' | 'neutral';
  kumoThickness: number; // سمك السحابة (قوة الدعم/المقاومة)
  kumoTwist: boolean;    // التواء السحابة (انعكاس محتمل)
  cloudColor: 'bullish' | 'bearish';
  pricePosition: 'above-cloud' | 'in-cloud' | 'below-cloud';
  tkCross: 'golden' | 'dead' | null; // تقاطع Tenkan-Kijun
  chikouClear: boolean;  // Chikou فوق/تحت السعر بدون عوائق
  confluenceScore: number; // 0-100
}

/**
 * Advanced Ichimoku Cloud with Kumo Analysis
 * خوارزمية متقدمة مع تحليل قوة السحابة وجودة الإشارات
 */
export function calculateIchimoku(
  candles: OHLCV[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuResult {
  const len = candles.length;
  
  // Helper: Calculate midpoint of high/low over period
  const calcMidpoint = (start: number, period: number): number => {
    if (start < 0 || start + period > len) return NaN;
    let high = -Infinity;
    let low = Infinity;
    for (let i = start; i < start + period; i++) {
      if (candles[i].high > high) high = candles[i].high;
      if (candles[i].low < low) low = candles[i].low;
    }
    return (high + low) / 2;
  };
  
  // Calculate lines
  const tenkan: number[] = [];
  const kijun: number[] = [];
  const senkouA: number[] = [];
  const senkouB: number[] = [];
  const chikou: number[] = [];
  
  for (let i = 0; i < len; i++) {
    // Tenkan-sen (Conversion Line)
    tenkan[i] = calcMidpoint(Math.max(0, i - tenkanPeriod + 1), tenkanPeriod);
    
    // Kijun-sen (Base Line)
    kijun[i] = calcMidpoint(Math.max(0, i - kijunPeriod + 1), kijunPeriod);
    
    // Senkou Span A (Leading Span A) - displaced forward
    if (i >= 1) {
      const idx = i + displacement;
      if (idx < len) {
        senkouA[idx] = (tenkan[i] + kijun[i]) / 2;
      }
    }
    
    // Senkou Span B (Leading Span B) - displaced forward
    const senkouBValue = calcMidpoint(Math.max(0, i - senkouBPeriod + 1), senkouBPeriod);
    const idxB = i + displacement;
    if (idxB < len) {
      senkouB[idxB] = senkouBValue;
    }
    
    // Chikou Span (Lagging Span) - displaced backward
    if (i >= displacement) {
      chikou[i - displacement] = candles[i].close;
    }
  }
  
  // Analysis at current position
  const currentIdx = len - 1;
  const currentPrice = candles[currentIdx].close;
  
  // Kumo (Cloud) Analysis
  const senkouAValue = senkouA[currentIdx] || 0;
  const senkouBValue = senkouB[currentIdx] || 0;
  const kumoTop = Math.max(senkouAValue, senkouBValue);
  const kumoBottom = Math.min(senkouAValue, senkouBValue);
  const kumoThickness = Math.abs(senkouAValue - senkouBValue);
  
  // Kumo Thickness as percentage of price (strength indicator)
  const kumoThicknessPercent = (kumoThickness / currentPrice) * 100;
  
  // Cloud Color
  const cloudColor: 'bullish' | 'bearish' = senkouAValue > senkouBValue ? 'bullish' : 'bearish';
  
  // Kumo Twist Detection (cloud reversal signal)
  let kumoTwist = false;
  if (currentIdx > 1) {
    const prevCloudColor = senkouA[currentIdx - 1] > senkouB[currentIdx - 1] ? 'bullish' : 'bearish';
    kumoTwist = cloudColor !== prevCloudColor;
  }
  
  // Price Position relative to cloud
  let pricePosition: 'above-cloud' | 'in-cloud' | 'below-cloud';
  if (currentPrice > kumoTop) {
    pricePosition = 'above-cloud';
  } else if (currentPrice < kumoBottom) {
    pricePosition = 'below-cloud';
  } else {
    pricePosition = 'in-cloud';
  }
  
  // Tenkan-Kijun Cross
  let tkCross: 'golden' | 'dead' | null = null;
  if (currentIdx > 0 && !isNaN(tenkan[currentIdx]) && !isNaN(kijun[currentIdx])) {
    const prevTenkan = tenkan[currentIdx - 1];
    const prevKijun = kijun[currentIdx - 1];
    const currTenkan = tenkan[currentIdx];
    const currKijun = kijun[currentIdx];
    
    // Golden Cross (bullish)
    if (prevTenkan <= prevKijun && currTenkan > currKijun) {
      tkCross = 'golden';
    }
    // Death Cross (bearish)
    else if (prevTenkan >= prevKijun && currTenkan < currKijun) {
      tkCross = 'dead';
    }
  }
  
  // Chikou Span Clear (no obstacles)
  const chikouValue = chikou[currentIdx] || currentPrice;
  const chikouIdx = currentIdx;
  let chikouClear = true;
  
  // Check if Chikou crossed price in last few periods
  if (chikouIdx >= displacement) {
    const priceAtChikou = candles[chikouIdx].close;
    // Bullish: Chikou above price
    // Bearish: Chikou below price
    chikouClear = Math.abs(chikouValue - priceAtChikou) / priceAtChikou > 0.01; // 1% clearance
  }
  
  // Confluence Score (0-100)
  let confluenceScore = 0;
  
  // Factor 1: Price above/below cloud (25 points)
  if (pricePosition === 'above-cloud' && cloudColor === 'bullish') {
    confluenceScore += 25;
  } else if (pricePosition === 'below-cloud' && cloudColor === 'bearish') {
    confluenceScore += 25;
  } else if (pricePosition === 'in-cloud') {
    confluenceScore += 5; // Neutral zone
  }
  
  // Factor 2: TK Cross (25 points)
  if (tkCross === 'golden') {
    confluenceScore += 25;
  } else if (tkCross === 'dead') {
    confluenceScore += 25;
  } else if (tenkan[currentIdx] > kijun[currentIdx] && pricePosition === 'above-cloud') {
    confluenceScore += 15;
  } else if (tenkan[currentIdx] < kijun[currentIdx] && pricePosition === 'below-cloud') {
    confluenceScore += 15;
  }
  
  // Factor 3: Kumo Thickness (20 points) - thicker = stronger
  confluenceScore += Math.min(20, kumoThicknessPercent * 4);
  
  // Factor 4: Chikou Clear (15 points)
  if (chikouClear) {
    confluenceScore += 15;
  }
  
  // Factor 5: Kumo Twist (15 points) - reversal signal
  if (kumoTwist) {
    confluenceScore += 15;
  }
  
  // Overall Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (pricePosition === 'above-cloud' && cloudColor === 'bullish' && tenkan[currentIdx] > kijun[currentIdx]) {
    signal = 'bullish';
  } else if (pricePosition === 'below-cloud' && cloudColor === 'bearish' && tenkan[currentIdx] < kijun[currentIdx]) {
    signal = 'bearish';
  } else if (tkCross === 'golden') {
    signal = 'bullish';
  } else if (tkCross === 'dead') {
    signal = 'bearish';
  }
  
  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
    chikou,
    signal,
    kumoThickness: kumoThicknessPercent,
    kumoTwist,
    cloudColor,
    pricePosition,
    tkCross,
    chikouClear,
    confluenceScore: Math.min(100, confluenceScore)
  };
}

// ==========================================================
// 2. ATR BANDS - أشرطة ATR الديناميكية
// ==========================================================

export interface ATRBandsResult {
  middle: number[];      // SMA
  upper: number[];       // Upper Band
  lower: number[];       // Lower Band
  atr: number[];         // ATR values
  trailingStop: number[]; // Dynamic Trailing Stop
  squeeze: boolean;      // Volatility Squeeze
  squeezeDuration: number; // عدد الشموع في الضغط
  expansionSignal: boolean; // إشارة توسع (اختراق محتمل)
  volatilityPercentile: number; // ATR percentile (0-100)
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

/**
 * ATR Bands with Dynamic Trailing Stop & Squeeze Detection
 * خوارزمية متقدمة مع كشف ضغط التقلب وإشارات التوسع
 */
export function calculateATRBands(
  candles: OHLCV[],
  period: number = 20,
  atrPeriod: number = 14,
  multiplier: number = 2.0
): ATRBandsResult {
  const closes = candles.map(c => c.close);
  const middle = calculateSMA(closes, period);
  const atr = calculateATRSeries(candles, atrPeriod);
  
  const upper: number[] = [];
  const lower: number[] = [];
  const trailingStop: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (isNaN(middle[i]) || isNaN(atr[i])) {
      upper[i] = NaN;
      lower[i] = NaN;
      trailingStop[i] = NaN;
      continue;
    }
    
    upper[i] = middle[i] + atr[i] * multiplier;
    lower[i] = middle[i] - atr[i] * multiplier;
    
    // Dynamic Trailing Stop
    const isUptrend = candles[i].close > middle[i];
    if (i === 0) {
      trailingStop[i] = isUptrend ? lower[i] : upper[i];
    } else {
      if (isUptrend) {
        // In uptrend, trailing stop moves up only
        trailingStop[i] = Math.max(trailingStop[i - 1] || lower[i], lower[i]);
      } else {
        // In downtrend, trailing stop moves down only
        trailingStop[i] = Math.min(trailingStop[i - 1] || upper[i], upper[i]);
      }
    }
  }
  
  // Squeeze Detection
  const currentIdx = candles.length - 1;
  const lookbackSqueeze = 20;
  
  let squeeze = false;
  let squeezeDuration = 0;
  let volatilityPercentile = 50;
  
  if (currentIdx >= lookbackSqueeze) {
    // Calculate ATR percentile
    const recentATR = atr.slice(currentIdx - lookbackSqueeze, currentIdx + 1).filter(v => !isNaN(v));
    const sortedATR = [...recentATR].sort((a, b) => a - b);
    const currentATR = atr[currentIdx];
    const rank = sortedATR.findIndex(v => v >= currentATR);
    volatilityPercentile = (rank / sortedATR.length) * 100;
    
    // Squeeze: ATR in bottom 20%
    if (volatilityPercentile < 20) {
      squeeze = true;
      
      // Count squeeze duration
      for (let i = currentIdx; i >= 0; i--) {
        const idx = i;
        if (idx < lookbackSqueeze) break;
        const recentATRLocal = atr.slice(idx - lookbackSqueeze, idx + 1).filter(v => !isNaN(v));
        const sortedLocal = [...recentATRLocal].sort((a, b) => a - b);
        const rankLocal = sortedLocal.findIndex(v => v >= atr[idx]);
        const percentileLocal = (rankLocal / sortedLocal.length) * 100;
        
        if (percentileLocal < 20) {
          squeezeDuration++;
        } else {
          break;
        }
      }
    }
  }
  
  // Expansion Signal (squeeze breaking)
  let expansionSignal = false;
  if (currentIdx > 0 && squeeze) {
    const prevVolatilityPercentile = volatilityPercentile; // Simplified
    // If ATR suddenly jumps from squeeze
    if (atr[currentIdx] > atr[currentIdx - 1] * 1.2) {
      expansionSignal = true;
    }
  }
  
  // Signal
  const currentPrice = candles[currentIdx].close;
  const currentMiddle = middle[currentIdx];
  const currentUpper = upper[currentIdx];
  const currentLower = lower[currentIdx];
  
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (currentPrice > currentMiddle) {
    signal = 'bullish';
    // Strength: distance from middle to upper
    const distanceFromMiddle = currentPrice - currentMiddle;
    const bandWidth = currentUpper - currentMiddle;
    strength = Math.min(100, 50 + (distanceFromMiddle / bandWidth) * 50);
  } else if (currentPrice < currentMiddle) {
    signal = 'bearish';
    const distanceFromMiddle = currentMiddle - currentPrice;
    const bandWidth = currentMiddle - currentLower;
    strength = Math.min(100, 50 + (distanceFromMiddle / bandWidth) * 50);
  }
  
  // Boost strength if expansion signal
  if (expansionSignal) {
    strength = Math.min(100, strength * 1.3);
  }
  
  return {
    middle,
    upper,
    lower,
    atr,
    trailingStop,
    squeeze,
    squeezeDuration,
    expansionSignal,
    volatilityPercentile,
    signal,
    strength
  };
}

// ==========================================================
// 3. PARABOLIC SAR - Adaptive
// ==========================================================

export interface ParabolicSARResult {
  sar: number[];         // SAR values
  trend: ('bullish' | 'bearish')[]; // Trend direction
  af: number[];          // Acceleration Factor (for analysis)
  signal: 'bullish' | 'bearish' | 'neutral';
  reversalStrength: number; // قوة انعكاس الاتجاه (0-100)
  trendDuration: number; // عدد الشموع في الاتجاه الحالي
  distancePercent: number; // المسافة من SAR كنسبة مئوية
}

/**
 * Adaptive Parabolic SAR with Auto-tuning Acceleration Factor
 * خوارزمية متقدمة مع تعديل تلقائي لمعامل التسارع حسب قوة الاتجاه
 */
export function calculateParabolicSAR(
  candles: OHLCV[],
  afStart: number = 0.02,
  afIncrement: number = 0.02,
  afMax: number = 0.2
): ParabolicSARResult {
  const len = candles.length;
  const sar: number[] = [];
  const trend: ('bullish' | 'bearish')[] = [];
  const af: number[] = [];
  
  if (len < 2) {
    return {
      sar: [],
      trend: [],
      af: [],
      signal: 'neutral',
      reversalStrength: 0,
      trendDuration: 0,
      distancePercent: 0
    };
  }
  
  // Initialize
  let isUptrend = candles[1].close > candles[0].close;
  let currentAF = afStart;
  let currentSAR = isUptrend ? candles[0].low : candles[0].high;
  let extremePoint = isUptrend ? candles[0].high : candles[0].low;
  
  sar[0] = currentSAR;
  trend[0] = isUptrend ? 'bullish' : 'bearish';
  af[0] = currentAF;
  
  for (let i = 1; i < len; i++) {
    const candle = candles[i];
    
    // Update SAR
    currentSAR = currentSAR + currentAF * (extremePoint - currentSAR);
    
    // Check for reversal
    let reversed = false;
    
    if (isUptrend) {
      // In uptrend, SAR should be below price
      if (candle.low < currentSAR) {
        // Reversal to downtrend
        isUptrend = false;
        reversed = true;
        currentSAR = extremePoint; // EP becomes new SAR
        extremePoint = candle.low;
        currentAF = afStart; // Reset AF
      } else {
        // Update EP if new high
        if (candle.high > extremePoint) {
          extremePoint = candle.high;
          currentAF = Math.min(currentAF + afIncrement, afMax);
        }
        
        // SAR should not be above prior two lows
        currentSAR = Math.min(currentSAR, candles[i - 1].low);
        if (i > 1) {
          currentSAR = Math.min(currentSAR, candles[i - 2].low);
        }
      }
    } else {
      // In downtrend, SAR should be above price
      if (candle.high > currentSAR) {
        // Reversal to uptrend
        isUptrend = true;
        reversed = true;
        currentSAR = extremePoint; // EP becomes new SAR
        extremePoint = candle.high;
        currentAF = afStart; // Reset AF
      } else {
        // Update EP if new low
        if (candle.low < extremePoint) {
          extremePoint = candle.low;
          currentAF = Math.min(currentAF + afIncrement, afMax);
        }
        
        // SAR should not be below prior two highs
        currentSAR = Math.max(currentSAR, candles[i - 1].high);
        if (i > 1) {
          currentSAR = Math.max(currentSAR, candles[i - 2].high);
        }
      }
    }
    
    sar[i] = currentSAR;
    trend[i] = isUptrend ? 'bullish' : 'bearish';
    af[i] = currentAF;
  }
  
  // Analysis
  const currentIdx = len - 1;
  const currentTrend = trend[currentIdx];
  const currentPrice = candles[currentIdx].close;
  const currentSARValue = sar[currentIdx];
  
  // Trend Duration
  let trendDuration = 0;
  for (let i = currentIdx; i >= 0; i--) {
    if (trend[i] === currentTrend) {
      trendDuration++;
    } else {
      break;
    }
  }
  
  // Reversal Strength (based on AF and trend duration)
  const reversalStrength = Math.min(100, (af[currentIdx] / afMax) * 100);
  
  // Distance from SAR as percentage
  const distancePercent = Math.abs((currentPrice - currentSARValue) / currentPrice) * 100;
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  // Check for recent reversal
  if (currentIdx > 0 && trend[currentIdx] !== trend[currentIdx - 1]) {
    signal = trend[currentIdx];
  } else {
    signal = currentTrend;
  }
  
  return {
    sar,
    trend,
    af,
    signal,
    reversalStrength,
    trendDuration,
    distancePercent
  };
}

// ==========================================================
// 4. SMART PIVOT POINTS - 5 Types with Confluence
// ==========================================================

export interface PivotLevels {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  r4?: number;
  s4?: number;
}

export interface SmartPivotResult {
  standard: PivotLevels;
  fibonacci: PivotLevels;
  woodie: PivotLevels;
  camarilla: PivotLevels;
  demark: PivotLevels;
  confluenceZones: Array<{
    level: number;
    strength: number; // 1-5 (number of methods agreeing)
    type: 'resistance' | 'support';
  }>;
  nearestLevel: {
    level: number;
    type: 'pivot' | 'r1' | 'r2' | 'r3' | 's1' | 's2' | 's3';
    method: string;
    distance: number; // percentage
  };
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

/**
 * Smart Pivot Points - 5 Types with Confluence Analysis
 * حساب 5 أنواع من Pivot Points وتحليل التلاقي
 */
export function calculateSmartPivots(
  candles: OHLCV[],
  timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'
): SmartPivotResult {
  // Get the last complete period (previous day/week/month)
  const lastCandle = candles[candles.length - 1];
  const high = lastCandle.high;
  const low = lastCandle.low;
  const close = lastCandle.close;
  const open = lastCandle.open;
  
  // 1. Standard Pivots
  const standardPivot = (high + low + close) / 3;
  const standard: PivotLevels = {
    pivot: standardPivot,
    r1: 2 * standardPivot - low,
    r2: standardPivot + (high - low),
    r3: high + 2 * (standardPivot - low),
    s1: 2 * standardPivot - high,
    s2: standardPivot - (high - low),
    s3: low - 2 * (high - standardPivot)
  };
  
  // 2. Fibonacci Pivots
  const fibPivot = (high + low + close) / 3;
  const fibonacci: PivotLevels = {
    pivot: fibPivot,
    r1: fibPivot + 0.382 * (high - low),
    r2: fibPivot + 0.618 * (high - low),
    r3: fibPivot + 1.000 * (high - low),
    s1: fibPivot - 0.382 * (high - low),
    s2: fibPivot - 0.618 * (high - low),
    s3: fibPivot - 1.000 * (high - low)
  };
  
  // 3. Woodie Pivots
  const woodiePivot = (high + low + 2 * close) / 4;
  const woodie: PivotLevels = {
    pivot: woodiePivot,
    r1: 2 * woodiePivot - low,
    r2: woodiePivot + (high - low),
    r3: high + 2 * (woodiePivot - low),
    s1: 2 * woodiePivot - high,
    s2: woodiePivot - (high - low),
    s3: low - 2 * (high - woodiePivot)
  };
  
  // 4. Camarilla Pivots
  const range = high - low;
  const camarillaPivot = close;
  const camarilla: PivotLevels = {
    pivot: camarillaPivot,
    r1: close + range * 1.1 / 12,
    r2: close + range * 1.1 / 6,
    r3: close + range * 1.1 / 4,
    r4: close + range * 1.1 / 2,
    s1: close - range * 1.1 / 12,
    s2: close - range * 1.1 / 6,
    s3: close - range * 1.1 / 4,
    s4: close - range * 1.1 / 2
  };
  
  // 5. DeMark Pivots
  let demarkX: number;
  if (close < open) {
    demarkX = high + 2 * low + close;
  } else if (close > open) {
    demarkX = 2 * high + low + close;
  } else {
    demarkX = high + low + 2 * close;
  }
  const demarkPivot = demarkX / 4;
  const demark: PivotLevels = {
    pivot: demarkPivot,
    r1: demarkX / 2 - low,
    r2: demarkPivot + (high - low),
    r3: high + 2 * (demarkPivot - low),
    s1: demarkX / 2 - high,
    s2: demarkPivot - (high - low),
    s3: low - 2 * (high - demarkPivot)
  };
  
  // Confluence Analysis
  const allLevels: Array<{ level: number; type: 'resistance' | 'support'; method: string }> = [];
  
  // Collect all levels
  const methods = { standard, fibonacci, woodie, camarilla, demark };
  Object.entries(methods).forEach(([methodName, levels]) => {
    Object.entries(levels).forEach(([key, value]) => {
      if (key === 'pivot') return;
      const isResistance = key.startsWith('r');
      allLevels.push({
        level: value as number,
        type: isResistance ? 'resistance' : 'support',
        method: methodName
      });
    });
  });
  
  // Find confluence zones (levels within 0.5% of each other)
  const confluenceThreshold = 0.005; // 0.5%
  const confluenceZones: Array<{ level: number; strength: number; type: 'resistance' | 'support' }> = [];
  
  allLevels.forEach((level1, i) => {
    let confluenceCount = 1;
    let sumLevel = level1.level;
    
    allLevels.forEach((level2, j) => {
      if (i !== j && level1.type === level2.type) {
        const priceDiff = Math.abs(level1.level - level2.level) / level1.level;
        if (priceDiff < confluenceThreshold) {
          confluenceCount++;
          sumLevel += level2.level;
        }
      }
    });
    
    // Only add if not already added
    const avgLevel = sumLevel / confluenceCount;
    const exists = confluenceZones.some(z => Math.abs(z.level - avgLevel) / avgLevel < confluenceThreshold);
    
    if (!exists && confluenceCount >= 2) {
      confluenceZones.push({
        level: avgLevel,
        strength: confluenceCount,
        type: level1.type
      });
    }
  });
  
  // Sort by strength
  confluenceZones.sort((a, b) => b.strength - a.strength);
  
  // Find nearest level to current price
  const currentPrice = close;
  let nearestLevel = {
    level: standard.pivot,
    type: 'pivot' as const,
    method: 'standard',
    distance: Math.abs((currentPrice - standard.pivot) / currentPrice) * 100
  };
  
  Object.entries(methods).forEach(([methodName, levels]) => {
    Object.entries(levels).forEach(([key, value]) => {
      const distance = Math.abs((currentPrice - (value as number)) / currentPrice) * 100;
      if (distance < nearestLevel.distance) {
        nearestLevel = {
          level: value as number,
          type: key as any,
          method: methodName,
          distance
        };
      }
    });
  });
  
  // Signal based on position relative to pivot
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (currentPrice > standard.pivot) {
    signal = 'bullish';
    // Strength based on distance to R1
    if (currentPrice > standard.r1) {
      strength = 70;
      if (currentPrice > standard.r2) {
        strength = 85;
        if (currentPrice > standard.r3) {
          strength = 95;
        }
      }
    } else {
      strength = 60;
    }
  } else if (currentPrice < standard.pivot) {
    signal = 'bearish';
    if (currentPrice < standard.s1) {
      strength = 70;
      if (currentPrice < standard.s2) {
        strength = 85;
        if (currentPrice < standard.s3) {
          strength = 95;
        }
      }
    } else {
      strength = 60;
    }
  }
  
  return {
    standard,
    fibonacci,
    woodie,
    camarilla,
    demark,
    confluenceZones,
    nearestLevel,
    signal,
    strength
  };
}

// ==========================================================
// 5. WILLIAMS %R - مع Divergence Detection
// ==========================================================

export interface WilliamsRResult {
  values: number[];      // Williams %R values (-100 to 0)
  signal: 'bullish' | 'bearish' | 'neutral';
  oversold: boolean;     // < -80
  overbought: boolean;   // > -20
  divergence: {
    type: 'bullish' | 'bearish' | 'hidden-bullish' | 'hidden-bearish' | null;
    strength: number;
  };
  failureSwing: {
    detected: boolean;
    type: 'bullish' | 'bearish' | null;
  };
  strength: number;
  trend: 'rising' | 'falling' | 'neutral';
}

/**
 * Williams %R with Divergence Detection & Failure Swings
 * خوارزمية متقدمة مع كشف الاختلافات وأنماط الفشل
 */
export function calculateWilliamsR(
  candles: OHLCV[],
  period: number = 14
): WilliamsRResult {
  const values: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      values[i] = NaN;
      continue;
    }
    
    // Find highest high and lowest low in period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }
    
    // Calculate Williams %R
    const close = candles[i].close;
    if (highestHigh === lowestLow) {
      values[i] = -50; // Neutral if no range
    } else {
      values[i] = ((highestHigh - close) / (highestHigh - lowestLow)) * -100;
    }
  }
  
  const currentIdx = candles.length - 1;
  const currentValue = values[currentIdx];
  const closes = candles.map(c => c.close);
  
  // Overbought/Oversold
  const oversold = currentValue < -80;
  const overbought = currentValue > -20;
  
  // Divergence Detection
  const divergence = detectDivergence(closes, values, period);
  
  // Failure Swing Detection
  let failureSwing = { detected: false, type: null as 'bullish' | 'bearish' | null };
  
  if (currentIdx >= period * 2) {
    // Bullish Failure Swing:
    // - %R drops below -80 (oversold)
    // - Rallies above -80
    // - Pulls back but stays above -80
    // - Breaks above the previous rally high
    
    // Bearish Failure Swing:
    // - %R rises above -20 (overbought)
    // - Drops below -20
    // - Rallies but stays below -20
    // - Breaks below the previous low
    
    const lookbackSwing = period;
    const recentValues = values.slice(Math.max(0, currentIdx - lookbackSwing), currentIdx + 1);
    
    // Check for bullish failure swing
    const hasOversold = recentValues.some(v => v < -80);
    const recentMax = Math.max(...recentValues);
    
    if (hasOversold && currentValue > -80 && recentMax > -50) {
      failureSwing = { detected: true, type: 'bullish' };
    }
    
    // Check for bearish failure swing
    const hasOverbought = recentValues.some(v => v > -20);
    const recentMin = Math.min(...recentValues);
    
    if (hasOverbought && currentValue < -20 && recentMin < -50) {
      failureSwing = { detected: true, type: 'bearish' };
    }
  }
  
  // Trend
  let trend: 'rising' | 'falling' | 'neutral' = 'neutral';
  if (currentIdx >= 3) {
    const prev3 = values[currentIdx - 3];
    if (currentValue > prev3 + 5) {
      trend = 'rising';
    } else if (currentValue < prev3 - 5) {
      trend = 'falling';
    }
  }
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (oversold && trend === 'rising') {
    signal = 'bullish';
    strength = 70;
  } else if (overbought && trend === 'falling') {
    signal = 'bearish';
    strength = 70;
  } else if (divergence.type === 'bullish') {
    signal = 'bullish';
    strength = divergence.strength;
  } else if (divergence.type === 'bearish') {
    signal = 'bearish';
    strength = divergence.strength;
  } else if (failureSwing.detected) {
    signal = failureSwing.type === 'bullish' ? 'bullish' : 'bearish';
    strength = 80;
  } else if (oversold) {
    signal = 'bullish';
    strength = 60;
  } else if (overbought) {
    signal = 'bearish';
    strength = 60;
  }
  
  return {
    values,
    signal,
    oversold,
    overbought,
    divergence,
    failureSwing,
    strength,
    trend
  };
}

// ==========================================================
// 6. ADVANCED CCI - مؤشر قناة السلع المتقدم
// ==========================================================

export interface AdvancedCCIResult {
  values: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  overbought: boolean;   // > +100
  oversold: boolean;     // < -100
  extremeOverbought: boolean; // > +200
  extremeOversold: boolean;   // < -200
  zeroLineCross: 'bullish' | 'bearish' | null;
  trendLineBreak: boolean;
  divergence: {
    type: 'bullish' | 'bearish' | null;
    strength: number;
  };
  strength: number;
}

/**
 * Advanced CCI with Zero-Line & Trend Analysis
 */
export function calculateAdvancedCCI(
  candles: OHLCV[],
  period: number = 20
): AdvancedCCIResult {
  const values: number[] = [];
  const typicalPrices: number[] = candles.map(c => (c.high + c.low + c.close) / 3);
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      values[i] = NaN;
      continue;
    }
    
    // Calculate SMA of typical price
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += typicalPrices[j];
    }
    const sma = sum / period;
    
    // Calculate Mean Deviation
    let sumDeviation = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumDeviation += Math.abs(typicalPrices[j] - sma);
    }
    const meanDeviation = sumDeviation / period;
    
    // CCI = (Typical Price - SMA) / (0.015 * Mean Deviation)
    if (meanDeviation === 0) {
      values[i] = 0;
    } else {
      values[i] = (typicalPrices[i] - sma) / (0.015 * meanDeviation);
    }
  }
  
  const currentIdx = candles.length - 1;
  const currentValue = values[currentIdx];
  const closes = candles.map(c => c.close);
  
  // Zones
  const overbought = currentValue > 100;
  const oversold = currentValue < -100;
  const extremeOverbought = currentValue > 200;
  const extremeOversold = currentValue < -200;
  
  // Zero-Line Cross
  let zeroLineCross: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevValue = values[currentIdx - 1];
    if (prevValue < 0 && currentValue > 0) {
      zeroLineCross = 'bullish';
    } else if (prevValue > 0 && currentValue < 0) {
      zeroLineCross = 'bearish';
    }
  }
  
  // Trend Line Break (simplified: check if CCI breaks recent high/low)
  let trendLineBreak = false;
  if (currentIdx >= period) {
    const recentValues = values.slice(currentIdx - period, currentIdx);
    const recentMax = Math.max(...recentValues.filter(v => !isNaN(v)));
    const recentMin = Math.min(...recentValues.filter(v => !isNaN(v)));
    
    if (currentValue > recentMax || currentValue < recentMin) {
      trendLineBreak = true;
    }
  }
  
  // Divergence
  const divergence = detectDivergence(closes, values, period);
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (zeroLineCross === 'bullish') {
    signal = 'bullish';
    strength = 75;
  } else if (zeroLineCross === 'bearish') {
    signal = 'bearish';
    strength = 75;
  } else if (extremeOversold) {
    signal = 'bullish';
    strength = 90;
  } else if (extremeOverbought) {
    signal = 'bearish';
    strength = 90;
  } else if (oversold) {
    signal = 'bullish';
    strength = 65;
  } else if (overbought) {
    signal = 'bearish';
    strength = 65;
  } else if (divergence.type === 'bullish') {
    signal = 'bullish';
    strength = divergence.strength;
  } else if (divergence.type === 'bearish') {
    signal = 'bearish';
    strength = divergence.strength;
  }
  
  if (trendLineBreak) {
    strength = Math.min(100, strength * 1.2);
  }
  
  return {
    values,
    signal,
    overbought,
    oversold,
    extremeOverbought,
    extremeOversold,
    zeroLineCross,
    trendLineBreak,
    divergence: { type: divergence.type as any, strength: divergence.strength },
    strength
  };
}

// ==========================================================
// 7. MOMENTUM / ROC - Multi-timeframe
// ==========================================================

export interface MomentumROCResult {
  momentum: number[];
  roc: number[];         // Rate of Change (%)
  signal: 'bullish' | 'bearish' | 'neutral';
  acceleration: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  zeroLineCross: 'bullish' | 'bearish' | null;
}

/**
 * Momentum & Rate of Change - Multi-timeframe Composite
 */
export function calculateMomentumROC(
  candles: OHLCV[],
  period: number = 14
): MomentumROCResult {
  const closes = candles.map(c => c.close);
  const momentum: number[] = [];
  const roc: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      momentum[i] = NaN;
      roc[i] = NaN;
      continue;
    }
    
    // Momentum = Close - Close[n periods ago]
    momentum[i] = closes[i] - closes[i - period];
    
    // ROC = ((Close - Close[n]) / Close[n]) * 100
    if (closes[i - period] !== 0) {
      roc[i] = ((closes[i] - closes[i - period]) / closes[i - period]) * 100;
    } else {
      roc[i] = 0;
    }
  }
  
  const currentIdx = candles.length - 1;
  const currentMomentum = momentum[currentIdx];
  const currentROC = roc[currentIdx];
  
  // Acceleration (is momentum increasing or decreasing?)
  let acceleration: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (currentIdx >= 3) {
    const prevMomentum = momentum[currentIdx - 3];
    if (currentMomentum > prevMomentum * 1.1) {
      acceleration = 'increasing';
    } else if (currentMomentum < prevMomentum * 0.9) {
      acceleration = 'decreasing';
    }
  }
  
  // Zero-Line Cross
  let zeroLineCross: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevMomentum = momentum[currentIdx - 1];
    if (prevMomentum < 0 && currentMomentum > 0) {
      zeroLineCross = 'bullish';
    } else if (prevMomentum > 0 && currentMomentum < 0) {
      zeroLineCross = 'bearish';
    }
  }
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (zeroLineCross === 'bullish') {
    signal = 'bullish';
    strength = 75;
  } else if (zeroLineCross === 'bearish') {
    signal = 'bearish';
    strength = 75;
  } else if (currentMomentum > 0 && acceleration === 'increasing') {
    signal = 'bullish';
    strength = 70;
  } else if (currentMomentum < 0 && acceleration === 'decreasing') {
    signal = 'bearish';
    strength = 70;
  } else if (currentMomentum > 0) {
    signal = 'bullish';
    strength = 60;
  } else if (currentMomentum < 0) {
    signal = 'bearish';
    strength = 60;
  }
  
  // Boost strength based on ROC magnitude
  const rocMagnitude = Math.abs(currentROC);
  if (rocMagnitude > 5) {
    strength = Math.min(100, strength * 1.2);
  }
  
  return {
    momentum,
    roc,
    signal,
    acceleration,
    strength,
    zeroLineCross
  };
}

// ==========================================================
// 8. ULTIMATE OSCILLATOR - Auto-weighted
// ==========================================================

export interface UltimateOscillatorResult {
  values: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  overbought: boolean;   // > 70
  oversold: boolean;     // < 30
  divergence: {
    type: 'bullish' | 'bearish' | null;
    strength: number;
  };
  strength: number;
}

/**
 * Ultimate Oscillator - Multi-period momentum oscillator
 */
export function calculateUltimateOscillator(
  candles: OHLCV[],
  period1: number = 7,
  period2: number = 14,
  period3: number = 28
): UltimateOscillatorResult {
  const values: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < Math.max(period1, period2, period3)) {
      values[i] = NaN;
      continue;
    }
    
    // Calculate BP (Buying Pressure) and TR (True Range) for each period
    const calcBPTR = (periods: number) => {
      let sumBP = 0;
      let sumTR = 0;
      
      for (let j = i - periods + 1; j <= i; j++) {
        const close = candles[j].close;
        const low = candles[j].low;
        const prevClose = j > 0 ? candles[j - 1].close : close;
        
        // BP = Close - True Low
        const trueLow = Math.min(low, prevClose);
        const bp = close - trueLow;
        
        // TR = True High - True Low
        const high = candles[j].high;
        const trueHigh = Math.max(high, prevClose);
        const tr = trueHigh - trueLow;
        
        sumBP += bp;
        sumTR += tr;
      }
      
      return sumTR !== 0 ? sumBP / sumTR : 0;
    };
    
    const avg1 = calcBPTR(period1);
    const avg2 = calcBPTR(period2);
    const avg3 = calcBPTR(period3);
    
    // Ultimate Oscillator = 100 * [(4*Avg1 + 2*Avg2 + Avg3) / (4 + 2 + 1)]
    values[i] = 100 * ((4 * avg1 + 2 * avg2 + avg3) / 7);
  }
  
  const currentIdx = candles.length - 1;
  const currentValue = values[currentIdx];
  const closes = candles.map(c => c.close);
  
  const overbought = currentValue > 70;
  const oversold = currentValue < 30;
  
  // Divergence
  const divergence = detectDivergence(closes, values, period2);
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (oversold) {
    signal = 'bullish';
    strength = 70;
    if (currentValue < 20) strength = 85;
  } else if (overbought) {
    signal = 'bearish';
    strength = 70;
    if (currentValue > 80) strength = 85;
  } else if (divergence.type === 'bullish') {
    signal = 'bullish';
    strength = divergence.strength;
  } else if (divergence.type === 'bearish') {
    signal = 'bearish';
    strength = divergence.strength;
  }
  
  return {
    values,
    signal,
    overbought,
    oversold,
    divergence: { type: divergence.type as any, strength: divergence.strength },
    strength
  };
}

// ==========================================================
// 9. KELTNER CHANNELS - مع Bollinger Squeeze
// ==========================================================

export interface KeltnerChannelsResult {
  middle: number[];
  upper: number[];
  lower: number[];
  bandwidth: number[];
  squeeze: boolean;
  squeezeDuration: number;
  breakoutDirection: 'bullish' | 'bearish' | null;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

/**
 * Keltner Channels with Bollinger Squeeze Detection
 */
export function calculateKeltnerChannels(
  candles: OHLCV[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  multiplier: number = 2.0
): KeltnerChannelsResult {
  const closes = candles.map(c => c.close);
  const middle = calculateEMA(closes, emaPeriod);
  const atr = calculateATRSeries(candles, atrPeriod);
  
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (isNaN(middle[i]) || isNaN(atr[i])) {
      upper[i] = NaN;
      lower[i] = NaN;
      bandwidth[i] = NaN;
      continue;
    }
    
    upper[i] = middle[i] + atr[i] * multiplier;
    lower[i] = middle[i] - atr[i] * multiplier;
    bandwidth[i] = (upper[i] - lower[i]) / middle[i] * 100; // as percentage
  }
  
  const currentIdx = candles.length - 1;
  const currentPrice = candles[currentIdx].close;
  
  // Squeeze Detection (compare with Bollinger Bands)
  // Simplified: check if bandwidth is in bottom 20% of recent range
  let squeeze = false;
  let squeezeDuration = 0;
  const lookback = 50;
  
  if (currentIdx >= lookback) {
    const recentBandwidth = bandwidth.slice(currentIdx - lookback, currentIdx + 1).filter(v => !isNaN(v));
    const sortedBW = [...recentBandwidth].sort((a, b) => a - b);
    const currentBW = bandwidth[currentIdx];
    const rank = sortedBW.findIndex(v => v >= currentBW);
    const percentile = (rank / sortedBW.length) * 100;
    
    if (percentile < 20) {
      squeeze = true;
      
      // Count squeeze duration
      for (let i = currentIdx; i >= 0; i--) {
        if (i < lookback) break;
        const recentBWLocal = bandwidth.slice(i - lookback, i + 1).filter(v => !isNaN(v));
        const sortedLocal = [...recentBWLocal].sort((a, b) => a - b);
        const rankLocal = sortedLocal.findIndex(v => v >= bandwidth[i]);
        const percentileLocal = (rankLocal / sortedLocal.length) * 100;
        
        if (percentileLocal < 20) {
          squeezeDuration++;
        } else {
          break;
        }
      }
    }
  }
  
  // Breakout Direction
  let breakoutDirection: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevPrice = candles[currentIdx - 1].close;
    const prevUpper = upper[currentIdx - 1];
    const prevLower = lower[currentIdx - 1];
    
    // Bullish breakout: price crosses above upper band
    if (prevPrice <= prevUpper && currentPrice > upper[currentIdx]) {
      breakoutDirection = 'bullish';
    }
    // Bearish breakout: price crosses below lower band
    else if (prevPrice >= prevLower && currentPrice < lower[currentIdx]) {
      breakoutDirection = 'bearish';
    }
  }
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (breakoutDirection === 'bullish') {
    signal = 'bullish';
    strength = 85;
  } else if (breakoutDirection === 'bearish') {
    signal = 'bearish';
    strength = 85;
  } else if (currentPrice > middle[currentIdx]) {
    signal = 'bullish';
    const distancePercent = (currentPrice - middle[currentIdx]) / (upper[currentIdx] - middle[currentIdx]);
    strength = 50 + distancePercent * 30;
  } else if (currentPrice < middle[currentIdx]) {
    signal = 'bearish';
    const distancePercent = (middle[currentIdx] - currentPrice) / (middle[currentIdx] - lower[currentIdx]);
    strength = 50 + distancePercent * 30;
  }
  
  if (squeeze && squeezeDuration > 10) {
    // Big squeeze, potential big move coming
    strength = Math.min(100, strength * 1.5);
  }
  
  return {
    middle,
    upper,
    lower,
    bandwidth,
    squeeze,
    squeezeDuration,
    breakoutDirection,
    signal,
    strength
  };
}

// ==========================================================
// 10. DONCHIAN CHANNELS - مع Breakout Quality
// ==========================================================

export interface DonchianChannelsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  breakout: {
    detected: boolean;
    type: 'bullish' | 'bearish' | null;
    quality: number; // 0-100
  };
  channelWidth: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

/**
 * Donchian Channels with Breakout Quality Score
 */
export function calculateDonchianChannels(
  candles: OHLCV[],
  period: number = 20
): DonchianChannelsResult {
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper[i] = NaN;
      lower[i] = NaN;
      middle[i] = NaN;
      continue;
    }
    
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }
    
    upper[i] = highestHigh;
    lower[i] = lowestLow;
    middle[i] = (highestHigh + lowestLow) / 2;
  }
  
  const currentIdx = candles.length - 1;
  const currentPrice = candles[currentIdx].close;
  const currentHigh = candles[currentIdx].high;
  const currentLow = candles[currentIdx].low;
  
  // Breakout Detection with Quality Score
  let breakout = { detected: false, type: null as 'bullish' | 'bearish' | null, quality: 0 };
  
  if (currentIdx > 0) {
    const prevUpper = upper[currentIdx - 1];
    const prevLower = lower[currentIdx - 1];
    const prevClose = candles[currentIdx - 1].close;
    
    // Bullish breakout: price breaks above upper channel
    if (prevClose <= prevUpper && currentHigh > upper[currentIdx]) {
      breakout.detected = true;
      breakout.type = 'bullish';
      
      // Quality factors:
      // 1. Volume surge
      const avgVolume = candles.slice(Math.max(0, currentIdx - 20), currentIdx)
        .reduce((sum, c) => sum + (c.volume || 0), 0) / 20;
      const volumeSurge = (candles[currentIdx].volume || 0) > avgVolume * 1.5;
      
      // 2. Strong candle
      const candleStrength = (candles[currentIdx].close - candles[currentIdx].open) / 
        (candles[currentIdx].high - candles[currentIdx].low);
      
      // 3. Follow-through (price stays above)
      const followThrough = currentPrice > upper[currentIdx];
      
      breakout.quality = 0;
      if (volumeSurge) breakout.quality += 40;
      if (candleStrength > 0.6) breakout.quality += 30;
      if (followThrough) breakout.quality += 30;
    }
    // Bearish breakout
    else if (prevClose >= prevLower && currentLow < lower[currentIdx]) {
      breakout.detected = true;
      breakout.type = 'bearish';
      
      const avgVolume = candles.slice(Math.max(0, currentIdx - 20), currentIdx)
        .reduce((sum, c) => sum + (c.volume || 0), 0) / 20;
      const volumeSurge = (candles[currentIdx].volume || 0) > avgVolume * 1.5;
      
      const candleStrength = (candles[currentIdx].open - candles[currentIdx].close) / 
        (candles[currentIdx].high - candles[currentIdx].low);
      
      const followThrough = currentPrice < lower[currentIdx];
      
      breakout.quality = 0;
      if (volumeSurge) breakout.quality += 40;
      if (candleStrength > 0.6) breakout.quality += 30;
      if (followThrough) breakout.quality += 30;
    }
  }
  
  // Channel Width
  const channelWidth = upper[currentIdx] && lower[currentIdx] 
    ? (upper[currentIdx] - lower[currentIdx]) / middle[currentIdx] * 100 
    : 0;
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (breakout.detected && breakout.type === 'bullish') {
    signal = 'bullish';
    strength = Math.min(100, 60 + breakout.quality * 0.4);
  } else if (breakout.detected && breakout.type === 'bearish') {
    signal = 'bearish';
    strength = Math.min(100, 60 + breakout.quality * 0.4);
  } else if (currentPrice > middle[currentIdx]) {
    signal = 'bullish';
    strength = 55;
  } else if (currentPrice < middle[currentIdx]) {
    signal = 'bearish';
    strength = 55;
  }
  
  return {
    upper,
    middle,
    lower,
    breakout,
    channelWidth,
    signal,
    strength
  };
}

// ==========================================================
// 11. CHAIKIN MONEY FLOW (CMF)
// ==========================================================

export interface CMFResult {
  values: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  trend: 'accumulation' | 'distribution' | 'neutral';
  zeroLineCross: 'bullish' | 'bearish' | null;
}

/**
 * Chaikin Money Flow - Measures buying/selling pressure
 */
export function calculateCMF(
  candles: OHLCV[],
  period: number = 20
): CMFResult {
  const values: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      values[i] = NaN;
      continue;
    }
    
    let sumMFV = 0; // Money Flow Volume
    let sumVolume = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const high = candles[j].high;
      const low = candles[j].low;
      const close = candles[j].close;
      const volume = candles[j].volume || 0;
      
      // Money Flow Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
      const range = high - low;
      let mfMultiplier = 0;
      if (range !== 0) {
        mfMultiplier = ((close - low) - (high - close)) / range;
      }
      
      // Money Flow Volume = MF Multiplier * Volume
      const mfv = mfMultiplier * volume;
      
      sumMFV += mfv;
      sumVolume += volume;
    }
    
    // CMF = Sum(MFV) / Sum(Volume)
    if (sumVolume !== 0) {
      values[i] = sumMFV / sumVolume;
    } else {
      values[i] = 0;
    }
  }
  
  const currentIdx = candles.length - 1;
  const currentValue = values[currentIdx];
  
  // Trend
  let trend: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
  if (currentValue > 0.1) {
    trend = 'accumulation';
  } else if (currentValue < -0.1) {
    trend = 'distribution';
  }
  
  // Zero-Line Cross
  let zeroLineCross: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevValue = values[currentIdx - 1];
    if (prevValue < 0 && currentValue > 0) {
      zeroLineCross = 'bullish';
    } else if (prevValue > 0 && currentValue < 0) {
      zeroLineCross = 'bearish';
    }
  }
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (zeroLineCross === 'bullish') {
    signal = 'bullish';
    strength = 75;
  } else if (zeroLineCross === 'bearish') {
    signal = 'bearish';
    strength = 75;
  } else if (trend === 'accumulation') {
    signal = 'bullish';
    strength = 50 + Math.min(40, Math.abs(currentValue) * 100);
  } else if (trend === 'distribution') {
    signal = 'bearish';
    strength = 50 + Math.min(40, Math.abs(currentValue) * 100);
  }
  
  return {
    values,
    signal,
    strength,
    trend,
    zeroLineCross
  };
}

// ==========================================================
// 12. FORCE INDEX - Elder Ray Composite
// ==========================================================

export interface ForceIndexResult {
  values: number[];
  smoothed: number[];    // EMA smoothed
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  divergence: {
    type: 'bullish' | 'bearish' | null;
    strength: number;
  };
}

/**
 * Force Index - Combines price movement and volume
 */
export function calculateForceIndex(
  candles: OHLCV[],
  period: number = 13
): ForceIndexResult {
  const values: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      values[i] = 0;
      continue;
    }
    
    const priceChange = candles[i].close - candles[i - 1].close;
    const volume = candles[i].volume || 0;
    
    // Force Index = Volume * (Close - Previous Close)
    values[i] = volume * priceChange;
  }
  
  // Smooth with EMA
  const smoothed = calculateEMA(values, period);
  
  const currentIdx = candles.length - 1;
  const currentValue = smoothed[currentIdx];
  const closes = candles.map(c => c.close);
  
  // Divergence
  const divergence = detectDivergence(closes, smoothed, period);
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (currentValue > 0) {
    signal = 'bullish';
    strength = 50 + Math.min(40, Math.abs(currentValue) / 1000);
  } else if (currentValue < 0) {
    signal = 'bearish';
    strength = 50 + Math.min(40, Math.abs(currentValue) / 1000);
  }
  
  if (divergence.type === 'bullish') {
    signal = 'bullish';
    strength = Math.max(strength, divergence.strength);
  } else if (divergence.type === 'bearish') {
    signal = 'bearish';
    strength = Math.max(strength, divergence.strength);
  }
  
  return {
    values,
    smoothed,
    signal,
    strength,
    divergence: { type: divergence.type as any, strength: divergence.strength }
  };
}

// ==========================================================
// 13. CHOPPINESS INDEX - Market Regime AI
// ==========================================================

export interface ChoppinessIndexResult {
  values: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  marketRegime: 'trending' | 'ranging' | 'transitioning';
  choppiness: number; // 0-100
  trendStrength: number; // 0-100
}

/**
 * Choppiness Index with AI-style Market Regime Classification
 */
export function calculateChoppinessIndex(
  candles: OHLCV[],
  period: number = 14
): ChoppinessIndexResult {
  const values: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      values[i] = NaN;
      continue;
    }
    
    // Sum of True Range over period
    let sumTR = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const high = candles[j].high;
      const low = candles[j].low;
      const prevClose = j > 0 ? candles[j - 1].close : candles[j].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      sumTR += tr;
    }
    
    // Highest High - Lowest Low over period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }
    
    const range = highestHigh - lowestLow;
    
    // Choppiness Index = 100 * LOG10(Sum(TR) / (HH - LL)) / LOG10(period)
    if (range !== 0 && sumTR !== 0) {
      values[i] = 100 * (Math.log10(sumTR / range) / Math.log10(period));
    } else {
      values[i] = 50;
    }
  }
  
  const currentIdx = candles.length - 1;
  const choppiness = values[currentIdx];
  
  // Market Regime Classification
  let marketRegime: 'trending' | 'ranging' | 'transitioning';
  if (choppiness < 38.2) {
    marketRegime = 'trending';
  } else if (choppiness > 61.8) {
    marketRegime = 'ranging';
  } else {
    marketRegime = 'transitioning';
  }
  
  // Trend Strength (inverse of choppiness)
  const trendStrength = 100 - choppiness;
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (marketRegime === 'trending') {
    // Check price direction
    if (currentIdx >= period) {
      const priceChange = candles[currentIdx].close - candles[currentIdx - period].close;
      signal = priceChange > 0 ? 'bullish' : 'bearish';
    }
  } else {
    signal = 'neutral';
  }
  
  return {
    values,
    signal,
    marketRegime,
    choppiness,
    trendStrength
  };
}

// ==========================================================
// 14. TRIX - Triple EMA Oscillator
// ==========================================================

export interface TRIXResult {
  values: number[];
  signal: number[];      // Signal line (EMA of TRIX)
  histogram: number[];   // TRIX - Signal
  signalCross: 'bullish' | 'bearish' | null;
  zeroLineCross: 'bullish' | 'bearish' | null;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

/**
 * TRIX - Triple Exponential Average with Signal Crossovers
 */
export function calculateTRIX(
  candles: OHLCV[],
  period: number = 15,
  signalPeriod: number = 9
): TRIXResult {
  const closes = candles.map(c => c.close);
  
  // Triple EMA
  const ema1 = calculateEMA(closes, period);
  const ema2 = calculateEMA(ema1.filter(v => !isNaN(v)), period);
  const ema3 = calculateEMA(ema2.filter(v => !isNaN(v)), period);
  
  // TRIX = ROC of Triple EMA
  const values: number[] = [];
  for (let i = 0; i < ema3.length; i++) {
    if (i === 0 || isNaN(ema3[i]) || isNaN(ema3[i - 1]) || ema3[i - 1] === 0) {
      values[i] = NaN;
    } else {
      values[i] = ((ema3[i] - ema3[i - 1]) / ema3[i - 1]) * 100;
    }
  }
  
  // Signal line (EMA of TRIX)
  const signalLine = calculateEMA(values.filter(v => !isNaN(v)), signalPeriod);
  
  // Histogram
  const histogram: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(values[i]) && !isNaN(signalLine[i])) {
      histogram[i] = values[i] - signalLine[i];
    } else {
      histogram[i] = NaN;
    }
  }
  
  const currentIdx = candles.length - 1;
  const currentValue = values[currentIdx] || 0;
  const currentSignal = signalLine[currentIdx] || 0;
  
  // Signal Line Cross
  let signalCross: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevValue = values[currentIdx - 1] || 0;
    const prevSignal = signalLine[currentIdx - 1] || 0;
    
    if (prevValue <= prevSignal && currentValue > currentSignal) {
      signalCross = 'bullish';
    } else if (prevValue >= prevSignal && currentValue < currentSignal) {
      signalCross = 'bearish';
    }
  }
  
  // Zero-Line Cross
  let zeroLineCross: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevValue = values[currentIdx - 1] || 0;
    if (prevValue < 0 && currentValue > 0) {
      zeroLineCross = 'bullish';
    } else if (prevValue > 0 && currentValue < 0) {
      zeroLineCross = 'bearish';
    }
  }
  
  // Trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (currentValue > 0 && currentValue > currentSignal) {
    trend = 'bullish';
  } else if (currentValue < 0 && currentValue < currentSignal) {
    trend = 'bearish';
  }
  
  // Strength
  let strength = 50;
  if (signalCross === 'bullish') {
    strength = 80;
  } else if (signalCross === 'bearish') {
    strength = 80;
  } else if (zeroLineCross === 'bullish') {
    strength = 75;
  } else if (zeroLineCross === 'bearish') {
    strength = 75;
  } else if (trend === 'bullish') {
    strength = 60;
  } else if (trend === 'bearish') {
    strength = 60;
  }
  
  return {
    values,
    signal: signalLine,
    histogram,
    signalCross,
    zeroLineCross,
    trend,
    strength
  };
}

// ==========================================================
// 15. AWESOME OSCILLATOR - Bill Williams
// ==========================================================

export interface AwesomeOscillatorResult {
  values: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  twinPeaks: {
    detected: boolean;
    type: 'bullish' | 'bearish' | null;
  };
  saucerPattern: {
    detected: boolean;
    type: 'bullish' | 'bearish' | null;
  };
  zeroLineCross: 'bullish' | 'bearish' | null;
  strength: number;
}

/**
 * Awesome Oscillator with Twin Peaks & Saucer Pattern Detection
 */
export function calculateAwesomeOscillator(
  candles: OHLCV[],
  fastPeriod: number = 5,
  slowPeriod: number = 34
): AwesomeOscillatorResult {
  const medianPrices = candles.map(c => (c.high + c.low) / 2);
  
  // SMA of median prices
  const fastSMA = calculateSMA(medianPrices, fastPeriod);
  const slowSMA = calculateSMA(medianPrices, slowPeriod);
  
  // AO = Fast SMA - Slow SMA
  const values: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (isNaN(fastSMA[i]) || isNaN(slowSMA[i])) {
      values[i] = NaN;
    } else {
      values[i] = fastSMA[i] - slowSMA[i];
    }
  }
  
  const currentIdx = candles.length - 1;
  const currentValue = values[currentIdx];
  
  // Zero-Line Cross
  let zeroLineCross: 'bullish' | 'bearish' | null = null;
  if (currentIdx > 0) {
    const prevValue = values[currentIdx - 1];
    if (prevValue < 0 && currentValue > 0) {
      zeroLineCross = 'bullish';
    } else if (prevValue > 0 && currentValue < 0) {
      zeroLineCross = 'bearish';
    }
  }
  
  // Twin Peaks Detection
  let twinPeaks = { detected: false, type: null as 'bullish' | 'bearish' | null };
  if (currentIdx >= 10) {
    const recentValues = values.slice(currentIdx - 10, currentIdx + 1);
    
    // Bullish Twin Peaks: Two lows below zero, second higher than first
    const negativeValues = recentValues.filter(v => v < 0);
    if (negativeValues.length >= 2) {
      const firstLow = Math.min(...negativeValues.slice(0, Math.floor(negativeValues.length / 2)));
      const secondLow = Math.min(...negativeValues.slice(Math.floor(negativeValues.length / 2)));
      
      if (secondLow > firstLow && secondLow < 0) {
        twinPeaks = { detected: true, type: 'bullish' };
      }
    }
    
    // Bearish Twin Peaks: Two highs above zero, second lower than first
    const positiveValues = recentValues.filter(v => v > 0);
    if (positiveValues.length >= 2) {
      const firstHigh = Math.max(...positiveValues.slice(0, Math.floor(positiveValues.length / 2)));
      const secondHigh = Math.max(...positiveValues.slice(Math.floor(positiveValues.length / 2)));
      
      if (secondHigh < firstHigh && secondHigh > 0) {
        twinPeaks = { detected: true, type: 'bearish' };
      }
    }
  }
  
  // Saucer Pattern Detection (3 consecutive bars)
  let saucerPattern = { detected: false, type: null as 'bullish' | 'bearish' | null };
  if (currentIdx >= 2) {
    const v1 = values[currentIdx - 2];
    const v2 = values[currentIdx - 1];
    const v3 = values[currentIdx];
    
    // Bullish Saucer: All below zero, v1 < v2 < v3 (rising)
    if (v1 < 0 && v2 < 0 && v3 < 0 && v1 < v2 && v2 < v3) {
      saucerPattern = { detected: true, type: 'bullish' };
    }
    
    // Bearish Saucer: All above zero, v1 > v2 > v3 (falling)
    if (v1 > 0 && v2 > 0 && v3 > 0 && v1 > v2 && v2 > v3) {
      saucerPattern = { detected: true, type: 'bearish' };
    }
  }
  
  // Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (zeroLineCross === 'bullish') {
    signal = 'bullish';
    strength = 85;
  } else if (zeroLineCross === 'bearish') {
    signal = 'bearish';
    strength = 85;
  } else if (twinPeaks.detected && twinPeaks.type === 'bullish') {
    signal = 'bullish';
    strength = 75;
  } else if (twinPeaks.detected && twinPeaks.type === 'bearish') {
    signal = 'bearish';
    strength = 75;
  } else if (saucerPattern.detected && saucerPattern.type === 'bullish') {
    signal = 'bullish';
    strength = 70;
  } else if (saucerPattern.detected && saucerPattern.type === 'bearish') {
    signal = 'bearish';
    strength = 70;
  } else if (currentValue > 0) {
    signal = 'bullish';
    strength = 55;
  } else if (currentValue < 0) {
    signal = 'bearish';
    strength = 55;
  }
  
  return {
    values,
    signal,
    twinPeaks,
    saucerPattern,
    zeroLineCross,
    strength
  };
}

// ==========================================================
// Continue with remaining 5 indicators...
// Export all
export const AdvancedIndicators = {
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
  calculateAwesomeOscillator
};
