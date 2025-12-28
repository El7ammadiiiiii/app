/**
 * Ehlers Digital Signal Processing (DSP) Indicators
 * مؤشرات معالجة الإشارات الرقمية لـ John Ehlers
 * 
 * Elite-level indicators used by institutional traders:
 * - SuperSmoother: 2-pole Butterworth filter for noise reduction
 * - Instantaneous Trendline: Ultra-smooth trend with minimal lag
 * - Fisher Transform: Early reversal detection using Hilbert normalization
 * - MAMA/FAMA: MESA Adaptive Moving Average with Hilbert Transform
 * - Laguerre RSI: Zero-lag oscillator using 4-element Laguerre filter
 * - Cyber Cycle: Dominant cycle extraction
 */

import { OHLCV, IndicatorResult } from './technical';

// ==========================================================
// DATA VALIDATION FOR DSP - التحقق من البيانات لـ DSP
// ==========================================================

/**
 * Validates and cleans data for DSP calculations
 * يتحقق من البيانات وينظفها لحسابات DSP
 */
export function validateDataForDSP(data: number[], fillMethod: 'zero' | 'previous' | 'interpolate' = 'previous'): number[] {
  if (!data || data.length === 0) return [];
  
  const result: number[] = [];
  let lastValid = 0;
  
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      if (fillMethod === 'zero') {
        result.push(0);
      } else if (fillMethod === 'previous') {
        result.push(lastValid);
      } else {
        // Interpolation: use average of neighbors if available
        const prev = i > 0 ? result[i - 1] : 0;
        const next = i < data.length - 1 && isFinite(data[i + 1]) ? data[i + 1] : prev;
        result.push((prev + next) / 2);
      }
    } else {
      result.push(value);
      lastValid = value;
    }
  }
  
  return result;
}

/**
 * Validates OHLCV data for DSP calculations
 * يتحقق من بيانات OHLCV لحسابات DSP
 */
export function validateOHLCV(candles: OHLCV[]): OHLCV[] {
  return candles.filter(c =>
    c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 &&
    c.volume >= 0 && c.high >= c.low &&
    !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close) &&
    isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close)
  );
}

// ==========================================================
// EHLERS SUPERSMOOTHER - فلتر SuperSmoother
// ==========================================================

export interface SuperSmootherResult {
  values: number[];
  current: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  trend: 'up' | 'down' | 'flat';
}

/**
 * Ehlers SuperSmoother Filter
 * 2-pole Butterworth low-pass filter with minimal lag
 * 
 * Superior to SMA/EMA: eliminates more noise while preserving signal
 * Used for: trend detection, noise reduction before other calculations
 * 
 * @param data - Price data array
 * @param period - Cutoff period (default: 10)
 */
export function calculateSuperSmoother(data: number[], period: number = 10): SuperSmootherResult {
  const cleanData = validateDataForDSP(data);
  
  const nullResult: SuperSmootherResult = {
    values: [],
    current: 0,
    signal: 'neutral',
    trend: 'flat'
  };
  
  if (cleanData.length < 3) return nullResult;
  
  // Calculate coefficients
  const a1 = Math.exp(-1.414 * Math.PI / period);
  const b1 = 2 * a1 * Math.cos(1.414 * Math.PI / period);
  const c2 = b1;
  const c3 = -a1 * a1;
  const c1 = 1 - c2 - c3;
  
  const ss: number[] = new Array(cleanData.length).fill(0);
  
  // Initialize first two values
  ss[0] = cleanData[0];
  ss[1] = cleanData[1];
  
  // Apply filter
  for (let i = 2; i < cleanData.length; i++) {
    ss[i] = c1 * (cleanData[i] + cleanData[i - 1]) / 2 + c2 * ss[i - 1] + c3 * ss[i - 2];
  }
  
  const current = ss[ss.length - 1];
  const prev = ss[ss.length - 2];
  const prevPrev = ss.length > 2 ? ss[ss.length - 3] : prev;
  
  // Determine trend and signal
  let trend: 'up' | 'down' | 'flat' = 'flat';
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (current > prev && prev > prevPrev) {
    trend = 'up';
    signal = 'bullish';
  } else if (current < prev && prev < prevPrev) {
    trend = 'down';
    signal = 'bearish';
  }
  
  return { values: ss, current, signal, trend };
}

// ==========================================================
// INSTANTANEOUS TRENDLINE - خط الاتجاه الفوري
// ==========================================================

export interface InstantaneousTrendlineResult {
  values: number[];
  current: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  crossover: boolean;
  crossoverType: 'bullish' | 'bearish' | null;
}

/**
 * Ehlers Instantaneous Trendline
 * Ultra-smooth trendline with minimal lag using 2-pole smoothing
 * 
 * @param data - Price data array (typically HL2 or close)
 * @param alpha - Smoothing factor (default: 0.07, lower = smoother)
 */
export function calculateInstantaneousTrendline(
  data: number[],
  alpha: number = 0.07
): InstantaneousTrendlineResult {
  const cleanData = validateDataForDSP(data);
  
  const nullResult: InstantaneousTrendlineResult = {
    values: [],
    current: 0,
    signal: 'neutral',
    crossover: false,
    crossoverType: null
  };
  
  if (cleanData.length < 3) return nullResult;
  
  const it: number[] = new Array(cleanData.length).fill(0);
  
  // Initialize
  it[0] = cleanData[0];
  it[1] = (cleanData[1] + cleanData[0]) / 2;
  
  // Calculate Instantaneous Trendline
  for (let i = 2; i < cleanData.length; i++) {
    it[i] = (alpha - (alpha * alpha) / 4) * cleanData[i] +
            (alpha * alpha / 2) * cleanData[i - 1] -
            (alpha - 3 * alpha * alpha / 4) * cleanData[i - 2] +
            2 * (1 - alpha) * it[i - 1] -
            (1 - alpha) * (1 - alpha) * it[i - 2];
  }
  
  const current = it[it.length - 1];
  const prev = it[it.length - 2];
  const currentPrice = cleanData[cleanData.length - 1];
  const prevPrice = cleanData[cleanData.length - 2];
  
  // Detect crossover
  let crossover = false;
  let crossoverType: 'bullish' | 'bearish' | null = null;
  
  if (prevPrice <= prev && currentPrice > current) {
    crossover = true;
    crossoverType = 'bullish';
  } else if (prevPrice >= prev && currentPrice < current) {
    crossover = true;
    crossoverType = 'bearish';
  }
  
  // Signal based on price position relative to trendline
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (currentPrice > current && current > prev) {
    signal = 'bullish';
  } else if (currentPrice < current && current < prev) {
    signal = 'bearish';
  }
  
  return { values: it, current, signal, crossover, crossoverType };
}

// ==========================================================
// FISHER TRANSFORM - تحويل فيشر
// ==========================================================

export interface FisherTransformResult {
  fisher: number;
  trigger: number;
  fisherArray: (number | null)[];
  triggerArray: (number | null)[];
  signal: 'bullish' | 'bearish' | 'neutral';
  crossover: boolean;
  strength: number;
}

/**
 * Ehlers Fisher Transform
 * Converts prices to Gaussian normal distribution for early reversal detection
 * 
 * Formula: fisher = 0.5 * ln((1 + value) / (1 - value))
 * 
 * Advantages:
 * - Very early reversal signals (2-3 bars earlier than RSI)
 * - Clear turning points (sharp peaks/troughs)
 * - Works well in all market conditions
 * 
 * @param candles - OHLCV data
 * @param period - Lookback period (default: 10)
 */
export function calculateFisherTransform(
  candles: OHLCV[],
  period: number = 10
): FisherTransformResult {
  const nullResult: FisherTransformResult = {
    fisher: 0,
    trigger: 0,
    fisherArray: [],
    triggerArray: [],
    signal: 'neutral',
    crossover: false,
    strength: 50
  };
  
  const validCandles = validateOHLCV(candles);
  if (validCandles.length < period + 1) return nullResult;
  
  // Calculate HL2 (median price)
  const hl2: number[] = validCandles.map(c => (c.high + c.low) / 2);
  
  // Fill initial period with null
  const fisherArray: (number | null)[] = new Array(period - 1).fill(null);
  const triggerArray: (number | null)[] = new Array(period - 1).fill(null);
  let value = 0;
  let fisher = 0;
  
  for (let i = period - 1; i < hl2.length; i++) {
    // Find highest high and lowest low in period
    let maxHigh = -Infinity;
    let minLow = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (hl2[j] > maxHigh) maxHigh = hl2[j];
      if (hl2[j] < minLow) minLow = hl2[j];
    }
    
    // Normalize to range -1 to 1
    const range = maxHigh - minLow;
    let rawValue = range !== 0 ? 2 * ((hl2[i] - minLow) / range - 0.5) : 0;
    
    // Smooth the value
    value = 0.33 * rawValue + 0.67 * value;
    
    // Clamp to avoid infinity in log
    value = Math.max(-0.999, Math.min(0.999, value));
    
    // Fisher Transform
    const prevFisher = fisher;
    fisher = 0.5 * Math.log((1 + value) / (1 - value));
    
    // Smooth Fisher
    fisher = 0.5 * fisher + 0.5 * prevFisher;
    
    fisherArray.push(fisher);
    triggerArray.push(prevFisher);
  }
  
  if (fisherArray.length < 2) return nullResult;
  
  // Get last valid values (non-null)
  const validFisher = fisherArray.filter((v): v is number => v !== null);
  const validTrigger = triggerArray.filter((v): v is number => v !== null);
  
  if (validFisher.length < 2 || validTrigger.length < 2) return nullResult;
  
  const currentFisher = validFisher[validFisher.length - 1];
  const currentTrigger = validTrigger[validTrigger.length - 1];
  const prevFisher = validFisher[validFisher.length - 2];
  const prevTrigger = validTrigger[validTrigger.length - 2];
  
  // Detect crossover
  let crossover = false;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (prevFisher <= prevTrigger && currentFisher > currentTrigger) {
    crossover = true;
    signal = 'bullish';
  } else if (prevFisher >= prevTrigger && currentFisher < currentTrigger) {
    crossover = true;
    signal = 'bearish';
  } else if (currentFisher > currentTrigger) {
    signal = 'bullish';
  } else if (currentFisher < currentTrigger) {
    signal = 'bearish';
  }
  
  // Strength based on Fisher magnitude
  const strength = Math.min(100, 50 + Math.abs(currentFisher) * 20);
  
  return {
    fisher: currentFisher,
    trigger: currentTrigger,
    fisherArray,
    triggerArray,
    signal,
    crossover,
    strength
  };
}

// ==========================================================
// LAGUERRE RSI - RSI لاغير
// ==========================================================

export interface LaguerreRSIResult extends IndicatorResult {
  lrsi: number;
  lrsiArray: number[];
  overbought: boolean;
  oversold: boolean;
  gamma: number;
}

/**
 * Laguerre RSI - Zero-lag RSI using 4-element Laguerre filter
 * 
 * Superior to standard RSI:
 * - Virtually no lag
 * - Smoother without losing responsiveness
 * - Better at catching reversals
 * 
 * @param data - Price data (typically close)
 * @param gamma - Damping factor 0-1 (default: 0.8, higher = smoother)
 */
export function calculateLaguerreRSI(
  data: number[],
  gamma: number = 0.8
): LaguerreRSIResult {
  const cleanData = validateDataForDSP(data);
  
  const nullResult: LaguerreRSIResult = {
    value: null,
    signal: 'neutral',
    strength: 50,
    lrsi: 50,
    lrsiArray: [],
    overbought: false,
    oversold: false,
    gamma
  };
  
  if (cleanData.length < 4) return nullResult;
  
  // Laguerre filter elements
  let L0 = 0, L1 = 0, L2 = 0, L3 = 0;
  let L0_1 = 0, L1_1 = 0, L2_1 = 0, L3_1 = 0;
  
  const lrsiArray: number[] = [];
  
  for (let i = 0; i < cleanData.length; i++) {
    const price = cleanData[i];
    
    // Update Laguerre filter
    L0 = (1 - gamma) * price + gamma * L0_1;
    L1 = -gamma * L0 + L0_1 + gamma * L1_1;
    L2 = -gamma * L1 + L1_1 + gamma * L2_1;
    L3 = -gamma * L2 + L2_1 + gamma * L3_1;
    
    // Calculate cumulative up and down
    let cu = 0;
    let cd = 0;
    
    if (L0 >= L1) cu += L0 - L1; else cd += L1 - L0;
    if (L1 >= L2) cu += L1 - L2; else cd += L2 - L1;
    if (L2 >= L3) cu += L2 - L3; else cd += L3 - L2;
    
    // Calculate Laguerre RSI
    const lrsi = (cu + cd) !== 0 ? cu / (cu + cd) * 100 : 50;
    lrsiArray.push(lrsi);
    
    // Store previous values
    L0_1 = L0; L1_1 = L1; L2_1 = L2; L3_1 = L3;
  }
  
  const currentLRSI = lrsiArray[lrsiArray.length - 1];
  const prevLRSI = lrsiArray.length > 1 ? lrsiArray[lrsiArray.length - 2] : currentLRSI;
  
  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  const overbought = currentLRSI > 80;
  const oversold = currentLRSI < 20;
  
  if (oversold) {
    signal = 'bullish';
    strength = Math.min(100, 60 + (20 - currentLRSI) * 2);
  } else if (overbought) {
    signal = 'bearish';
    strength = Math.min(100, 60 + (currentLRSI - 80) * 2);
  } else if (currentLRSI > prevLRSI && currentLRSI > 50) {
    signal = 'bullish';
    strength = 50 + (currentLRSI - 50) * 0.5;
  } else if (currentLRSI < prevLRSI && currentLRSI < 50) {
    signal = 'bearish';
    strength = 50 + (50 - currentLRSI) * 0.5;
  }
  
  return {
    value: currentLRSI,
    signal,
    strength,
    lrsi: currentLRSI,
    lrsiArray,
    overbought,
    oversold,
    gamma
  };
}

// ==========================================================
// CONNORS RSI - RSI كونورز
// ==========================================================

export interface ConnorsRSIResult extends IndicatorResult {
  crsi: number;
  rsiComponent: number;
  streakRSI: number;
  percentRankROC: number;
  crsiArray: (number | null)[];
}

/**
 * Connors RSI - 3-component RSI with documented 70%+ win rate
 * 
 * Formula: CRSI = (RSI(3) + PercentRank(UpDown, 2) + PercentRank(ROC(1), 100)) / 3
 * 
 * Components:
 * 1. RSI(3) - Short-term RSI
 * 2. UpDown Streak RSI - Consecutive closes streak
 * 3. ROC PercentRank - 1-day ROC position over 100 periods
 * 
 * @param closes - Close prices
 * @param rsiPeriod - RSI period (default: 3)
 * @param streakPeriod - Streak lookback (default: 2)
 * @param rocPeriod - ROC percentile lookback (default: 100)
 */
export function calculateConnorsRSI(
  closes: number[],
  rsiPeriod: number = 3,
  streakPeriod: number = 2,
  rocPeriod: number = 100
): ConnorsRSIResult {
  const cleanData = validateDataForDSP(closes);
  
  const nullResult: ConnorsRSIResult = {
    value: null,
    signal: 'neutral',
    strength: 50,
    crsi: 50,
    rsiComponent: 50,
    streakRSI: 50,
    percentRankROC: 50,
    crsiArray: []
  };
  
  if (cleanData.length < Math.max(rsiPeriod + 1, rocPeriod + 1)) return nullResult;
  
  // Component 1: Calculate short-term RSI
  const changes: number[] = [];
  for (let i = 1; i < cleanData.length; i++) {
    changes.push(cleanData[i] - cleanData[i - 1]);
  }
  
  // Component 2: Calculate UpDown Streak
  const streaks: number[] = [0];
  for (let i = 1; i < cleanData.length; i++) {
    if (cleanData[i] > cleanData[i - 1]) {
      streaks.push(streaks[i - 1] > 0 ? streaks[i - 1] + 1 : 1);
    } else if (cleanData[i] < cleanData[i - 1]) {
      streaks.push(streaks[i - 1] < 0 ? streaks[i - 1] - 1 : -1);
    } else {
      streaks.push(0);
    }
  }
  
  // Component 3: Calculate ROC
  const roc: number[] = [];
  for (let i = 0; i < cleanData.length; i++) {
    if (i === 0) {
      roc.push(0);
    } else {
      roc.push(cleanData[i - 1] !== 0 ? (cleanData[i] - cleanData[i - 1]) / cleanData[i - 1] * 100 : 0);
    }
  }
  
  // Calculate CRSI for each bar - fill with null for initial periods
  const crsiArray: (number | null)[] = new Array(rocPeriod).fill(null);
  
  for (let i = rocPeriod; i < cleanData.length; i++) {
    // RSI Component
    let avgGain = 0, avgLoss = 0;
    for (let j = i - rsiPeriod; j < i; j++) {
      if (changes[j] > 0) avgGain += changes[j];
      else avgLoss += Math.abs(changes[j]);
    }
    avgGain /= rsiPeriod;
    avgLoss /= rsiPeriod;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsiComponent = 100 - (100 / (1 + rs));
    
    // Streak PercentRank
    const currentStreak = streaks[i];
    const streakHistory = streaks.slice(Math.max(0, i - streakPeriod * 20), i);
    const streakRSI = streakHistory.filter(s => currentStreak > s).length / streakHistory.length * 100;
    
    // ROC PercentRank
    const currentROC = roc[i];
    const rocHistory = roc.slice(i - rocPeriod, i);
    const percentRankROC = rocHistory.filter(r => currentROC > r).length / rocHistory.length * 100;
    
    // CRSI
    const crsi = (rsiComponent + streakRSI + percentRankROC) / 3;
    crsiArray.push(crsi);
  }
  
  if (crsiArray.length === 0) return nullResult;
  
  // Get valid (non-null) values
  const validCRSI = crsiArray.filter((v): v is number => v !== null);
  if (validCRSI.length === 0) return nullResult;
  
  const currentCRSI = validCRSI[validCRSI.length - 1];
  
  // Generate signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (currentCRSI < 10) {
    signal = 'bullish'; // Strong oversold
    strength = 95;
  } else if (currentCRSI < 20) {
    signal = 'bullish';
    strength = 80;
  } else if (currentCRSI > 90) {
    signal = 'bearish'; // Strong overbought
    strength = 95;
  } else if (currentCRSI > 80) {
    signal = 'bearish';
    strength = 80;
  } else if (currentCRSI > 50) {
    signal = 'bullish';
    strength = 50 + (currentCRSI - 50);
  } else {
    signal = 'bearish';
    strength = 50 + (50 - currentCRSI);
  }
  
  // Get component values for last bar
  const lastIdx = cleanData.length - 1;
  let avgGain = 0, avgLoss = 0;
  for (let j = lastIdx - rsiPeriod; j < lastIdx; j++) {
    if (changes[j] > 0) avgGain += changes[j];
    else avgLoss += Math.abs(changes[j]);
  }
  avgGain /= rsiPeriod;
  avgLoss /= rsiPeriod;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsiComponent = 100 - (100 / (1 + rs));
  
  const currentStreak = streaks[lastIdx];
  const streakHistory = streaks.slice(Math.max(0, lastIdx - streakPeriod * 20), lastIdx);
  const streakRSI = streakHistory.filter(s => currentStreak > s).length / streakHistory.length * 100;
  
  const currentROC = roc[lastIdx];
  const rocHistory = roc.slice(lastIdx - rocPeriod, lastIdx);
  const percentRankROC = rocHistory.filter(r => currentROC > r).length / rocHistory.length * 100;
  
  return {
    value: currentCRSI,
    signal,
    strength,
    crsi: currentCRSI,
    rsiComponent,
    streakRSI,
    percentRankROC,
    crsiArray
  };
}

// ==========================================================
// MAMA/FAMA - MESA Adaptive Moving Average
// ==========================================================

export interface MAMAResult {
  mama: number;
  fama: number;
  mamaArray: number[];
  famaArray: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  crossover: boolean;
  phase: number;
}

/**
 * MESA Adaptive Moving Average (MAMA/FAMA)
 * Adapts to market cycles using Hilbert Transform phase detection
 * 
 * Superior to standard moving averages:
 * - Automatically adjusts to dominant cycle
 * - MAMA is fast-adapting, FAMA is following
 * - Crossovers generate high-quality signals
 * 
 * @param data - Price data (typically HL2)
 * @param fastLimit - Maximum alpha (default: 0.5)
 * @param slowLimit - Minimum alpha (default: 0.05)
 */
export function calculateMAMA(
  data: number[],
  fastLimit: number = 0.5,
  slowLimit: number = 0.05
): MAMAResult {
  const cleanData = validateDataForDSP(data);
  
  const nullResult: MAMAResult = {
    mama: 0,
    fama: 0,
    mamaArray: [],
    famaArray: [],
    signal: 'neutral',
    crossover: false,
    phase: 0
  };
  
  if (cleanData.length < 50) return nullResult;
  
  // Initialize arrays
  const smooth: number[] = new Array(cleanData.length).fill(0);
  const detrender: number[] = new Array(cleanData.length).fill(0);
  const Q1: number[] = new Array(cleanData.length).fill(0);
  const I1: number[] = new Array(cleanData.length).fill(0);
  const I2: number[] = new Array(cleanData.length).fill(0);
  const Q2: number[] = new Array(cleanData.length).fill(0);
  const Re: number[] = new Array(cleanData.length).fill(0);
  const Im: number[] = new Array(cleanData.length).fill(0);
  const period: number[] = new Array(cleanData.length).fill(0);
  const smoothPeriod: number[] = new Array(cleanData.length).fill(0);
  const phase: number[] = new Array(cleanData.length).fill(0);
  const mamaArray: number[] = new Array(cleanData.length).fill(0);
  const famaArray: number[] = new Array(cleanData.length).fill(0);
  
  // Initialize with input data
  for (let i = 0; i < 6; i++) {
    mamaArray[i] = cleanData[i];
    famaArray[i] = cleanData[i];
  }
  
  for (let i = 6; i < cleanData.length; i++) {
    // Smooth price
    smooth[i] = (4 * cleanData[i] + 3 * cleanData[i - 1] + 2 * cleanData[i - 2] + cleanData[i - 3]) / 10;
    
    // Compute Detrender
    detrender[i] = (0.0962 * smooth[i] + 0.5769 * smooth[i - 2] - 0.5769 * smooth[i - 4] - 0.0962 * smooth[i - 6]) * (0.075 * (period[i - 1] || 6) + 0.54);
    
    // Compute InPhase and Quadrature
    Q1[i] = (0.0962 * detrender[i] + 0.5769 * detrender[i - 2] - 0.5769 * detrender[i - 4] - 0.0962 * detrender[i - 6]) * (0.075 * (period[i - 1] || 6) + 0.54);
    I1[i] = detrender[i - 3];
    
    // Advance Phase by 90 degrees
    const jI = (0.0962 * I1[i] + 0.5769 * I1[i - 2] - 0.5769 * I1[i - 4] - 0.0962 * I1[i - 6]) * (0.075 * (period[i - 1] || 6) + 0.54);
    const jQ = (0.0962 * Q1[i] + 0.5769 * Q1[i - 2] - 0.5769 * Q1[i - 4] - 0.0962 * Q1[i - 6]) * (0.075 * (period[i - 1] || 6) + 0.54);
    
    // Phasor addition
    I2[i] = I1[i] - jQ;
    Q2[i] = Q1[i] + jI;
    
    // Smooth I2 and Q2
    I2[i] = 0.2 * I2[i] + 0.8 * I2[i - 1];
    Q2[i] = 0.2 * Q2[i] + 0.8 * Q2[i - 1];
    
    // Homodyne Discriminator
    Re[i] = I2[i] * I2[i - 1] + Q2[i] * Q2[i - 1];
    Im[i] = I2[i] * Q2[i - 1] - Q2[i] * I2[i - 1];
    
    Re[i] = 0.2 * Re[i] + 0.8 * Re[i - 1];
    Im[i] = 0.2 * Im[i] + 0.8 * Im[i - 1];
    
    // Calculate Period
    if (Im[i] !== 0 && Re[i] !== 0) {
      period[i] = (2 * Math.PI) / Math.atan(Im[i] / Re[i]);
    }
    
    // Limit Period
    if (period[i] > 1.5 * period[i - 1]) period[i] = 1.5 * period[i - 1];
    if (period[i] < 0.67 * period[i - 1]) period[i] = 0.67 * period[i - 1];
    if (period[i] < 6) period[i] = 6;
    if (period[i] > 50) period[i] = 50;
    
    period[i] = 0.2 * period[i] + 0.8 * period[i - 1];
    smoothPeriod[i] = 0.33 * period[i] + 0.67 * smoothPeriod[i - 1];
    
    // Calculate Phase
    if (I1[i] !== 0) {
      phase[i] = Math.atan(Q1[i] / I1[i]) * (180 / Math.PI);
    }
    
    // Calculate Delta Phase
    let deltaPhase = phase[i - 1] - phase[i];
    if (deltaPhase < 1) deltaPhase = 1;
    
    // Calculate Alpha
    let alpha = fastLimit / deltaPhase;
    if (alpha < slowLimit) alpha = slowLimit;
    if (alpha > fastLimit) alpha = fastLimit;
    
    // Calculate MAMA and FAMA
    mamaArray[i] = alpha * cleanData[i] + (1 - alpha) * mamaArray[i - 1];
    famaArray[i] = 0.5 * alpha * mamaArray[i] + (1 - 0.5 * alpha) * famaArray[i - 1];
  }
  
  const currentMAMA = mamaArray[mamaArray.length - 1];
  const currentFAMA = famaArray[famaArray.length - 1];
  const prevMAMA = mamaArray[mamaArray.length - 2];
  const prevFAMA = famaArray[famaArray.length - 2];
  
  // Detect crossover
  let crossover = false;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (prevMAMA <= prevFAMA && currentMAMA > currentFAMA) {
    crossover = true;
    signal = 'bullish';
  } else if (prevMAMA >= prevFAMA && currentMAMA < currentFAMA) {
    crossover = true;
    signal = 'bearish';
  } else if (currentMAMA > currentFAMA) {
    signal = 'bullish';
  } else if (currentMAMA < currentFAMA) {
    signal = 'bearish';
  }
  
  return {
    mama: currentMAMA,
    fama: currentFAMA,
    mamaArray,
    famaArray,
    signal,
    crossover,
    phase: phase[phase.length - 1]
  };
}

// ==========================================================
// FRAMA - Fractal Adaptive Moving Average
// ==========================================================

export interface FRAMAResult {
  frama: number;
  framaArray: number[];
  alpha: number;
  fractalDimension: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Fractal Adaptive Moving Average (FRAMA)
 * Adapts based on fractal dimension (market complexity)
 * 
 * - High fractal dimension (choppy) → slower MA
 * - Low fractal dimension (trending) → faster MA
 * 
 * @param candles - OHLCV data
 * @param period - Lookback period (default: 16, must be even)
 */
export function calculateFRAMA(
  candles: OHLCV[],
  period: number = 16
): FRAMAResult {
  const validCandles = validateOHLCV(candles);
  
  const nullResult: FRAMAResult = {
    frama: 0,
    framaArray: [],
    alpha: 0,
    fractalDimension: 1.5,
    signal: 'neutral'
  };
  
  if (validCandles.length < period * 2) return nullResult;
  
  const closes = validCandles.map(c => c.close);
  const highs = validCandles.map(c => c.high);
  const lows = validCandles.map(c => c.low);
  
  const framaArray: number[] = [];
  const halfPeriod = Math.floor(period / 2);
  let frama = closes[0];
  let currentAlpha = 0.5;
  let currentFD = 1.5;
  
  for (let i = period; i < closes.length; i++) {
    // Calculate N1 (first half)
    let hn1 = -Infinity, ln1 = Infinity;
    for (let j = i - period; j < i - halfPeriod; j++) {
      if (highs[j] > hn1) hn1 = highs[j];
      if (lows[j] < ln1) ln1 = lows[j];
    }
    const N1 = (hn1 - ln1) / halfPeriod;
    
    // Calculate N2 (second half)
    let hn2 = -Infinity, ln2 = Infinity;
    for (let j = i - halfPeriod; j < i; j++) {
      if (highs[j] > hn2) hn2 = highs[j];
      if (lows[j] < ln2) ln2 = lows[j];
    }
    const N2 = (hn2 - ln2) / halfPeriod;
    
    // Calculate N3 (full period)
    let hn3 = -Infinity, ln3 = Infinity;
    for (let j = i - period; j < i; j++) {
      if (highs[j] > hn3) hn3 = highs[j];
      if (lows[j] < ln3) ln3 = lows[j];
    }
    const N3 = (hn3 - ln3) / period;
    
    // Calculate Fractal Dimension
    let D = 1.5; // Default
    if (N1 > 0 && N2 > 0 && N3 > 0 && (N1 + N2) > 0) {
      D = (Math.log(N1 + N2) - Math.log(N3)) / Math.log(2);
    }
    
    // Limit D
    D = Math.max(1, Math.min(2, D));
    currentFD = D;
    
    // Calculate Alpha from D
    const alpha = Math.exp(-4.6 * (D - 1));
    currentAlpha = Math.max(0.01, Math.min(1, alpha));
    
    // Calculate FRAMA
    frama = currentAlpha * closes[i] + (1 - currentAlpha) * frama;
    framaArray.push(frama);
  }
  
  if (framaArray.length < 2) return nullResult;
  
  const currentFRAMA = framaArray[framaArray.length - 1];
  const prevFRAMA = framaArray[framaArray.length - 2];
  const currentPrice = closes[closes.length - 1];
  
  // Generate signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (currentPrice > currentFRAMA && currentFRAMA > prevFRAMA) {
    signal = 'bullish';
  } else if (currentPrice < currentFRAMA && currentFRAMA < prevFRAMA) {
    signal = 'bearish';
  }
  
  return {
    frama: currentFRAMA,
    framaArray,
    alpha: currentAlpha,
    fractalDimension: currentFD,
    signal
  };
}

// ==========================================================
// CYBER CYCLE - دورة السايبر
// ==========================================================

export interface CyberCycleResult {
  cycle: number;
  cycleArray: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  trigger: number;
  triggerArray: number[];
}

/**
 * Ehlers Cyber Cycle
 * Extracts dominant cycle from price data
 * 
 * @param data - Price data
 * @param alpha - Smoothing factor (default: 0.07)
 */
export function calculateCyberCycle(
  data: number[],
  alpha: number = 0.07
): CyberCycleResult {
  const cleanData = validateDataForDSP(data);
  
  const nullResult: CyberCycleResult = {
    cycle: 0,
    cycleArray: [],
    signal: 'neutral',
    trigger: 0,
    triggerArray: []
  };
  
  if (cleanData.length < 10) return nullResult;
  
  const smooth: number[] = new Array(cleanData.length).fill(0);
  const cycle: number[] = new Array(cleanData.length).fill(0);
  const trigger: number[] = new Array(cleanData.length).fill(0);
  
  // Initialize
  for (let i = 0; i < 7; i++) {
    smooth[i] = cleanData[i];
  }
  
  for (let i = 7; i < cleanData.length; i++) {
    // Smooth the data
    smooth[i] = (cleanData[i] + 2 * cleanData[i - 1] + 2 * cleanData[i - 2] + cleanData[i - 3]) / 6;
    
    // High-pass filter to remove trend
    cycle[i] = (1 - 0.5 * alpha) * (1 - 0.5 * alpha) * (smooth[i] - 2 * smooth[i - 1] + smooth[i - 2]) +
               2 * (1 - alpha) * cycle[i - 1] -
               (1 - alpha) * (1 - alpha) * cycle[i - 2];
    
    // Trigger is 1-bar delayed cycle
    trigger[i] = cycle[i - 1];
  }
  
  const currentCycle = cycle[cycle.length - 1];
  const currentTrigger = trigger[trigger.length - 1];
  const prevCycle = cycle[cycle.length - 2];
  const prevTrigger = trigger[trigger.length - 2];
  
  // Generate signal based on crossover
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (prevCycle <= prevTrigger && currentCycle > currentTrigger) {
    signal = 'bullish';
  } else if (prevCycle >= prevTrigger && currentCycle < currentTrigger) {
    signal = 'bearish';
  } else if (currentCycle > currentTrigger) {
    signal = 'bullish';
  } else if (currentCycle < currentTrigger) {
    signal = 'bearish';
  }
  
  return {
    cycle: currentCycle,
    cycleArray: cycle,
    signal,
    trigger: currentTrigger,
    triggerArray: trigger
  };
}

// ==========================================================
// EXPORT ALL EHLERS INDICATORS
// ==========================================================

export const EhlersIndicators = {
  SuperSmoother: calculateSuperSmoother,
  InstantaneousTrendline: calculateInstantaneousTrendline,
  FisherTransform: calculateFisherTransform,
  LaguerreRSI: calculateLaguerreRSI,
  ConnorsRSI: calculateConnorsRSI,
  MAMA: calculateMAMA,
  FRAMA: calculateFRAMA,
  CyberCycle: calculateCyberCycle,
  validateData: validateDataForDSP,
  validateOHLCV
};

export default EhlersIndicators;
