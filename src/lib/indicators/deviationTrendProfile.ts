/**
 * Deviation Trend Profile [BigBeluga]
 * Converted from Pine Script
 * 
 * This indicator shows:
 * - SMA with trend coloring
 * - Standard deviation bands (±1, ±2, ±3 ATR)
 * - Trend distribution profile (histogram)
 * - Trend change signals
 */

import type { CandleData } from "@/components/charts/types";

export interface DeviationLevel {
  price: number;
  label: string;
  isUpper: boolean;
}

export interface TrendProfile {
  bins: { lower: number; upper: number; count: number; color: string }[];
  maxCount: number;
}

export interface TrendSignal {
  index: number;
  price: number;
  type: 'bullish' | 'bearish';
}

export interface DeviationTrendResult {
  smaValues: number[];
  smaColors: string[];
  upperBands: {
    stdv1: number[];
    stdv2: number[];
    stdv3: number[];
  };
  lowerBands: {
    stdv1: number[];
    stdv2: number[];
    stdv3: number[];
  };
  trendSignals: TrendSignal[];
  currentLevels: DeviationLevel[];
  trendProfile: TrendProfile | null;
  trendStartIndex: number;
  currentTrend: 'bullish' | 'bearish' | null;
}

export interface DeviationTrendConfig {
  smaLength: number;
  mult1: number;
  mult2: number;
  mult3: number;
  showProfile: boolean;
  binsAmount: number;
  profileOffset: number;
  upColor: string;
  downColor: string;
}

export const defaultDeviationTrendConfig: DeviationTrendConfig = {
  smaLength: 50,
  mult1: 1,
  mult2: 2,
  mult3: 3,
  showProfile: true,
  binsAmount: 50,
  profileOffset: 30,
  upColor: '#12d1eb',  // cyan
  downColor: '#fa2856', // red/pink
};

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data: number[], length: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < length; j++) {
      sum += data[i - j];
    }
    result.push(sum / length);
  }
  
  return result;
}

/**
 * Calculate Average True Range
 */
function calculateATR(data: CandleData[], length: number): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
      continue;
    }
    
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trueRanges.push(tr);
  }
  
  // Calculate SMA of true ranges
  const result: number[] = [];
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < length - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < length; j++) {
      sum += trueRanges[i - j];
    }
    result.push(sum / length);
  }
  
  return result;
}

/**
 * Calculate percentile using linear interpolation
 */
function percentileLinear(data: number[], length: number, percentile: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1 || isNaN(data[i])) {
      result.push(NaN);
      continue;
    }
    
    const window: number[] = [];
    for (let j = 0; j < length; j++) {
      if (!isNaN(data[i - j])) {
        window.push(data[i - j]);
      }
    }
    
    if (window.length === 0) {
      result.push(NaN);
      continue;
    }
    
    window.sort((a, b) => a - b);
    const rank = (percentile / 100) * (window.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const weight = rank - lower;
    
    if (lower === upper || upper >= window.length) {
      result.push(window[lower]);
    } else {
      result.push(window[lower] * (1 - weight) + window[upper] * weight);
    }
  }
  
  return result;
}

/**
 * Interpolate color between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  // Clamp factor between 0 and 1
  factor = Math.max(0, Math.min(1, factor));
  
  // Parse hex colors
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Calculate gradient color based on value
 */
function gradientColor(value: number, min: number, max: number, colorMin: string, colorMax: string): string {
  if (max === min) return colorMax;
  const factor = (value - min) / (max - min);
  return interpolateColor(colorMin, colorMax, factor);
}

/**
 * Calculate Deviation Trend Profile
 */
export function calculateDeviationTrendProfile(
  data: CandleData[],
  config: DeviationTrendConfig = defaultDeviationTrendConfig
): DeviationTrendResult {
  const closes = data.map(d => d.close);
  
  // Calculate SMA
  const sma = calculateSMA(closes, config.smaLength);
  
  // Calculate ATR (200 period as in original)
  const atr = calculateATR(data, 200);
  
  // Calculate standard deviation bands
  const upperBands = {
    stdv1: sma.map((avg, i) => !isNaN(avg) && !isNaN(atr[i]) ? avg + atr[i] * config.mult1 : NaN),
    stdv2: sma.map((avg, i) => !isNaN(avg) && !isNaN(atr[i]) ? avg + atr[i] * config.mult2 : NaN),
    stdv3: sma.map((avg, i) => !isNaN(avg) && !isNaN(atr[i]) ? avg + atr[i] * config.mult3 : NaN),
  };
  
  const lowerBands = {
    stdv1: sma.map((avg, i) => !isNaN(avg) && !isNaN(atr[i]) ? avg - atr[i] * config.mult1 : NaN),
    stdv2: sma.map((avg, i) => !isNaN(avg) && !isNaN(atr[i]) ? avg - atr[i] * config.mult2 : NaN),
    stdv3: sma.map((avg, i) => !isNaN(avg) && !isNaN(atr[i]) ? avg - atr[i] * config.mult3 : NaN),
  };
  
  // Calculate avg_diff (SMA change over 5 periods)
  const avgDiff: number[] = sma.map((avg, i) => {
    if (i < 5 || isNaN(avg) || isNaN(sma[i - 5])) return NaN;
    return avg - sma[i - 5];
  });
  
  // Calculate percentile for normalization
  const avgDiffPercentile = percentileLinear(avgDiff, 500, 100);
  
  // Calculate normalized avg_col
  const avgCol: number[] = avgDiff.map((diff, i) => {
    if (isNaN(diff) || isNaN(avgDiffPercentile[i]) || avgDiffPercentile[i] === 0) return 0;
    return diff / avgDiffPercentile[i];
  });
  
  // Calculate SMA colors based on gradient
  const smaColors: string[] = avgCol.map(col => {
    const factor = (col + 0.3) / 0.6; // Map -0.3 to 0.3 → 0 to 1
    return interpolateColor(config.downColor, config.upColor, factor);
  });
  
  // Detect trend changes and signals
  let trend: boolean | null = null;
  let startIndex = 0;
  const trendSignals: TrendSignal[] = [];
  
  for (let i = 1; i < avgCol.length; i++) {
    const prevCol = avgCol[i - 1];
    const currCol = avgCol[i];
    
    // Crossover 0.1 (trend turns bullish)
    if (prevCol <= 0.1 && currCol > 0.1 && trend !== true) {
      trend = true;
      startIndex = i;
      trendSignals.push({
        index: i,
        price: sma[i],
        type: 'bullish'
      });
    }
    
    // Crossunder -0.1 (trend turns bearish)
    if (prevCol >= -0.1 && currCol < -0.1 && trend !== false) {
      trend = false;
      startIndex = i;
      trendSignals.push({
        index: i,
        price: sma[i],
        type: 'bearish'
      });
    }
  }
  
  // Calculate current levels
  const lastIdx = data.length - 1;
  const currentLevels: DeviationLevel[] = [];
  
  if (!isNaN(upperBands.stdv1[lastIdx])) {
    currentLevels.push({ price: upperBands.stdv3[lastIdx], label: '+3', isUpper: true });
    currentLevels.push({ price: upperBands.stdv2[lastIdx], label: '+2', isUpper: true });
    currentLevels.push({ price: upperBands.stdv1[lastIdx], label: '+1', isUpper: true });
    currentLevels.push({ price: lowerBands.stdv1[lastIdx], label: '-1', isUpper: false });
    currentLevels.push({ price: lowerBands.stdv2[lastIdx], label: '-2', isUpper: false });
    currentLevels.push({ price: lowerBands.stdv3[lastIdx], label: '-3', isUpper: false });
  }
  
  // Calculate trend profile (histogram)
  let trendProfile: TrendProfile | null = null;
  
  if (config.showProfile && startIndex > 0 && lastIdx > startIndex) {
    const lookback = lastIdx - startIndex;
    const max = upperBands.stdv3[lastIdx];
    const min = lowerBands.stdv3[lastIdx];
    
    if (!isNaN(max) && !isNaN(min) && max > min) {
      const step = (max - min) / config.binsAmount;
      const bins: { lower: number; upper: number; count: number; color: string }[] = [];
      const binCounts: number[] = new Array(config.binsAmount).fill(0);
      
      // Count price occurrences in each bin
      for (let l = 0; l <= lookback; l++) {
        const idx = lastIdx - l;
        if (idx < 0) break;
        
        const c = closes[idx];
        const mi = lowerBands.stdv3[idx];
        const s = !isNaN(upperBands.stdv3[idx]) && !isNaN(mi) 
          ? (upperBands.stdv3[idx] - mi) / config.binsAmount 
          : step;
        
        for (let i = 0; i < config.binsAmount; i++) {
          const lower = mi + s * i;
          const upper = lower + s;
          
          if (c >= lower - s && c <= upper + s) {
            binCounts[i]++;
          }
        }
      }
      
      const maxCount = Math.max(...binCounts);
      const avgColor = smaColors[lastIdx] || config.upColor;
      
      // Create bin objects with colors
      for (let j = 0; j < config.binsAmount; j++) {
        const lower = min + step * j;
        const upper = lower + step;
        const count = binCounts[j];
        
        // Color gradient based on count
        const factor = maxCount > 0 ? count / maxCount : 0;
        const col = interpolateColor('rgba(128,128,128,0.2)', avgColor, factor);
        
        bins.push({ lower, upper, count, color: col });
      }
      
      trendProfile = { bins, maxCount };
    }
  }
  
  return {
    smaValues: sma,
    smaColors,
    upperBands,
    lowerBands,
    trendSignals,
    currentLevels,
    trendProfile,
    trendStartIndex: startIndex,
    currentTrend: trend === true ? 'bullish' : trend === false ? 'bearish' : null
  };
}

/**
 * Get only the most recent trend signals
 */
export function getRecentTrendSignals(
  result: DeviationTrendResult,
  maxSignals: number = 10
): TrendSignal[] {
  return result.trendSignals.slice(-maxSignals);
}
