/**
 * Stochastic RSI Indicator
 * مؤشر ستوكاستيك RSI
 */

import { calculateRSI } from "./technical";

export interface StochRSIResult {
  k: number | null;
  d: number | null;
  signal: "bullish" | "bearish" | "neutral";
  overbought: boolean;
  oversold: boolean;
}

export interface StochRSIArrayResult {
  k: number[];
  d: number[];
  timestamps: number[];
}

/**
 * Calculate Stochastic RSI
 * حساب ستوكاستيك RSI
 */
export function calculateStochRSI(
  closes: number[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3
): StochRSIResult {
  const nullResult: StochRSIResult = {
    k: null,
    d: null,
    signal: "neutral",
    overbought: false,
    oversold: false
  };

  if (closes.length < rsiPeriod + stochPeriod + kSmooth + dSmooth) {
    return nullResult;
  }

  // Calculate RSI values array
  const rsiValues: number[] = [];
  for (let i = rsiPeriod; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const rsiResult = calculateRSI(slice, rsiPeriod);
    if (rsiResult.value !== null) {
      rsiValues.push(rsiResult.value);
    }
  }

  if (rsiValues.length < stochPeriod) {
    return nullResult;
  }

  // Calculate Stochastic of RSI
  const stochRSIValues: number[] = [];
  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    const period = rsiValues.slice(i - stochPeriod + 1, i + 1);
    const highestRSI = Math.max(...period);
    const lowestRSI = Math.min(...period);
    
    if (highestRSI === lowestRSI) {
      stochRSIValues.push(50);
    } else {
      const stochRSI = ((rsiValues[i] - lowestRSI) / (highestRSI - lowestRSI)) * 100;
      stochRSIValues.push(stochRSI);
    }
  }

  if (stochRSIValues.length < kSmooth) {
    return nullResult;
  }

  // Calculate %K (smoothed Stochastic RSI)
  const kValues: number[] = [];
  for (let i = kSmooth - 1; i < stochRSIValues.length; i++) {
    const slice = stochRSIValues.slice(i - kSmooth + 1, i + 1);
    const k = slice.reduce((sum, val) => sum + val, 0) / kSmooth;
    kValues.push(k);
  }

  if (kValues.length < dSmooth) {
    return nullResult;
  }

  // Calculate %D (smoothed %K)
  const dValues: number[] = [];
  for (let i = dSmooth - 1; i < kValues.length; i++) {
    const slice = kValues.slice(i - dSmooth + 1, i + 1);
    const d = slice.reduce((sum, val) => sum + val, 0) / dSmooth;
    dValues.push(d);
  }

  const k = kValues[kValues.length - 1];
  const d = dValues[dValues.length - 1];

  // Determine signal
  let signal: "bullish" | "bearish" | "neutral" = "neutral";
  const prevK = kValues.length > 1 ? kValues[kValues.length - 2] : k;
  const prevD = dValues.length > 1 ? dValues[dValues.length - 2] : d;

  // Bullish crossover
  if (prevK <= prevD && k > d) {
    signal = "bullish";
  }
  // Bearish crossover
  else if (prevK >= prevD && k < d) {
    signal = "bearish";
  }
  // Above midline
  else if (k > 50) {
    signal = "bullish";
  }
  // Below midline
  else if (k < 50) {
    signal = "bearish";
  }

  return {
    k,
    d,
    signal,
    overbought: k > 80,
    oversold: k < 20
  };
}

/**
 * Calculate Stochastic RSI Array for charting
 * حساب مصفوفة ستوكاستيك RSI للرسم البياني
 */
export function calculateStochRSIArray(
  closes: number[],
  timestamps: number[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3
): StochRSIArrayResult {
  const result: StochRSIArrayResult = { k: [], d: [], timestamps: [] };
  
  const minLength = rsiPeriod + stochPeriod + kSmooth + dSmooth;
  
  // First calculate all RSI values
  const rsiValues: number[] = [];
  for (let i = rsiPeriod; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const rsiResult = calculateRSI(slice, rsiPeriod);
    if (rsiResult.value !== null) {
      rsiValues.push(rsiResult.value);
    }
  }

  if (rsiValues.length < stochPeriod) {
    return result;
  }

  // Calculate Stochastic of RSI
  const stochRSIValues: number[] = [];
  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    const period = rsiValues.slice(i - stochPeriod + 1, i + 1);
    const highestRSI = Math.max(...period);
    const lowestRSI = Math.min(...period);
    
    if (highestRSI === lowestRSI) {
      stochRSIValues.push(50);
    } else {
      const stochRSI = ((rsiValues[i] - lowestRSI) / (highestRSI - lowestRSI)) * 100;
      stochRSIValues.push(stochRSI);
    }
  }

  // Calculate %K values
  const kValues: number[] = [];
  for (let i = kSmooth - 1; i < stochRSIValues.length; i++) {
    const slice = stochRSIValues.slice(i - kSmooth + 1, i + 1);
    const k = slice.reduce((sum, val) => sum + val, 0) / kSmooth;
    kValues.push(k);
  }

  // Calculate %D values
  const dValues: number[] = [];
  for (let i = dSmooth - 1; i < kValues.length; i++) {
    const slice = kValues.slice(i - dSmooth + 1, i + 1);
    const d = slice.reduce((sum, val) => sum + val, 0) / dSmooth;
    dValues.push(d);
  }

  // Align timestamps - the offset from the start
  const offset = minLength - 1;
  
  for (let i = 0; i < dValues.length; i++) {
    const tsIndex = offset + i;
    if (tsIndex < timestamps.length) {
      result.k.push(kValues[i + (kValues.length - dValues.length)]);
      result.d.push(dValues[i]);
      result.timestamps.push(timestamps[tsIndex]);
    }
  }
  
  return result;
}

/**
 * Classic Stochastic Oscillator (%K and %D)
 * مؤشر ستوكاستيك الكلاسيكي
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number | null; d: number | null } {
  if (closes.length < kPeriod + dPeriod) {
    return { k: null, d: null };
  }

  // Calculate %K values
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    
    if (highestHigh === lowestLow) {
      kValues.push(50);
    } else {
      const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }
  }

  // Calculate %D (SMA of %K)
  if (kValues.length < dPeriod) {
    return { k: kValues[kValues.length - 1] || null, d: null };
  }

  const dSlice = kValues.slice(-dPeriod);
  const d = dSlice.reduce((sum, val) => sum + val, 0) / dPeriod;

  return {
    k: kValues[kValues.length - 1],
    d
  };
}
