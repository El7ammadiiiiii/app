/**
 * Trend Line Methods [TLM]
 * Converted from Pine Script
 * 
 * Method 1: Pivot Span Trendline
 * - Connects oldest and newest pivots in a buffer
 * - Fills area between high and low trendlines
 * 
 * Method 2: 5-Point Straight Channel
 * - Linear regression on 5 segment extremes
 */

import type { CandleData } from "@/components/charts/types";

export interface TrendLineMethodsConfig {
  // Method 1: Pivot Span
  enablePivotSpan: boolean;
  pivotLeft: number;
  pivotRight: number;
  pivotCount: number;
  lookbackLength: number;
  colors: {
    highTrend: string;
    lowTrend: string;
    fill: string;
  };
  
  // Method 2: 5-Point Channel
  enableFivePoint: boolean;
  channelLength: number;
  fivePointColors: {
    high: string;
    low: string;
  };
}

export const defaultTrendLineMethodsConfig: TrendLineMethodsConfig = {
  enablePivotSpan: true,
  pivotLeft: 5,
  pivotRight: 5,
  pivotCount: 5,
  lookbackLength: 150,
  colors: {
    highTrend: '#ff7b00',
    lowTrend: '#ff7b00',
    fill: 'rgba(255, 123, 0, 0.1)' // 90 transparency
  },
  
  enableFivePoint: false,
  channelLength: 100,
  fivePointColors: {
    high: '#ff00d0',
    low: '#ff00d0'
  }
};

export interface PivotSpanResult {
  highTrendLine: { x1: number; y1: number; x2: number; y2: number } | null;
  lowTrendLine: { x1: number; y1: number; x2: number; y2: number } | null;
}

export interface FivePointResult {
  highChannelLine: { x1: number; y1: number; x2: number; y2: number } | null;
  lowChannelLine: { x1: number; y1: number; x2: number; y2: number } | null;
}

export interface TrendLineMethodsResult {
  pivotSpan: PivotSpanResult;
  fivePoint: FivePointResult;
}

interface PivotPoint {
  index: number;
  price: number;
}

// Helper to detect pivots
function detectPivots(
  data: CandleData[], 
  left: number, 
  right: number
): { highs: PivotPoint[]; lows: PivotPoint[] } {
  const highs: PivotPoint[] = [];
  const lows: PivotPoint[] = [];
  
  for (let i = left; i < data.length - right; i++) {
    let isHigh = true;
    let isLow = true;
    
    for (let j = 1; j <= left; j++) {
      if (data[i - j].high > data[i].high) isHigh = false;
      if (data[i - j].low < data[i].low) isLow = false;
    }
    for (let j = 1; j <= right; j++) {
      if (data[i + j].high > data[i].high) isHigh = false;
      if (data[i + j].low < data[i].low) isLow = false;
    }
    
    if (isHigh) highs.push({ index: i, price: data[i].high });
    if (isLow) lows.push({ index: i, price: data[i].low });
  }
  
  return { highs, lows };
}

// Helper for 5-Point Channel Calculation
function calculateFivePointChannel(
  data: CandleData[], 
  length: number, 
  currentIndex: number
): { slopeHi: number; interceptHi: number; slopeLo: number; interceptLo: number } | null {
  if (currentIndex < length) return null;
  
  const startIdx = currentIndex - length;
  const segmentLength = Math.max(1, Math.floor(length / 5));
  
  const pointsHi: { x: number; y: number }[] = [];
  const pointsLo: { x: number; y: number }[] = [];
  
  for (let k = 0; k < 5; k++) {
    const segStart = startIdx + k * segmentLength;
    const remaining = (currentIndex) - segStart; // Bars remaining until current
    if (remaining <= 0) break;
    
    const currentSegLen = k < 4 ? Math.min(segmentLength, remaining) : remaining;
    
    let maxHi = -Infinity;
    let maxHiIdx = -1;
    let minLo = Infinity;
    let minLoIdx = -1;
    
    for (let i = 0; i < currentSegLen; i++) {
      const idx = segStart + i;
      if (idx >= data.length) break;
      
      if (data[idx].high > maxHi) {
        maxHi = data[idx].high;
        maxHiIdx = idx;
      }
      if (data[idx].low < minLo) {
        minLo = data[idx].low;
        minLoIdx = idx;
      }
    }
    
    if (maxHiIdx !== -1) {
      // x is relative to current index (negative lookback)
      // In Pine: x_hi_int = bar_index - barsAgo_hi
      // Here: x = maxHiIdx - currentIndex
      pointsHi.push({ x: maxHiIdx - currentIndex, y: maxHi });
    }
    if (minLoIdx !== -1) {
      pointsLo.push({ x: minLoIdx - currentIndex, y: minLo });
    }
  }
  
  // Linear Regression Highs
  let slopeHi = 0, interceptHi = 0;
  if (pointsHi.length >= 2) {
    const n = pointsHi.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of pointsHi) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      slopeHi = (n * sumXY - sumX * sumY) / denom;
      interceptHi = (sumY - slopeHi * sumX) / n;
    }
  } else {
    return null;
  }
  
  // Linear Regression Lows
  let slopeLo = 0, interceptLo = 0;
  if (pointsLo.length >= 2) {
    const n = pointsLo.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of pointsLo) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      slopeLo = (n * sumXY - sumX * sumY) / denom;
      interceptLo = (sumY - slopeLo * sumX) / n;
    }
  } else {
    return null;
  }
  
  return { slopeHi, interceptHi, slopeLo, interceptLo };
}

export function calculateTrendLineMethods(
  data: CandleData[],
  config: TrendLineMethodsConfig = defaultTrendLineMethodsConfig
): TrendLineMethodsResult {
  const result: TrendLineMethodsResult = {
    pivotSpan: { highTrendLine: null, lowTrendLine: null },
    fivePoint: { highChannelLine: null, lowChannelLine: null }
  };
  
  const lastIndex = data.length - 1;
  
  // === Method 1: Pivot Span ===
  if (config.enablePivotSpan) {
    // We need to simulate the "var" arrays from Pine Script
    // Pine Script runs on every bar. We can just run detection on the whole dataset
    // and keep the last N pivots that are within the lookback range.
    
    const { highs, lows } = detectPivots(data, config.pivotLeft, config.pivotRight);
    
    // Filter pivots within lookback length from current bar
    const validHighs = highs.filter(p => p.index >= lastIndex - config.lookbackLength);
    const validLows = lows.filter(p => p.index >= lastIndex - config.lookbackLength);
    
    // Keep only the last 'pivotCount' pivots
    const recentHighs = validHighs.slice(-config.pivotCount);
    const recentLows = validLows.slice(-config.pivotCount);
    
    // Calculate High Trend Line
    if (recentHighs.length >= 2) {
      const far = recentHighs[0];
      const near = recentHighs[recentHighs.length - 1];
      
      const barDiff = near.index - far.index;
      const slope = barDiff !== 0 ? (near.price - far.price) / barDiff : 0;
      const intercept = far.price - slope * far.index;
      
      // Line from (lastIndex - lookback + 1) to lastIndex
      const x1 = lastIndex - config.lookbackLength + 1;
      const x2 = lastIndex;
      const y1 = intercept + slope * x1;
      const y2 = intercept + slope * x2;
      
      result.pivotSpan.highTrendLine = { x1, y1, x2, y2 };
    }
    
    // Calculate Low Trend Line
    if (recentLows.length >= 2) {
      const far = recentLows[0];
      const near = recentLows[recentLows.length - 1];
      
      const barDiff = near.index - far.index;
      const slope = barDiff !== 0 ? (near.price - far.price) / barDiff : 0;
      const intercept = far.price - slope * far.index;
      
      const x1 = lastIndex - config.lookbackLength + 1;
      const x2 = lastIndex;
      const y1 = intercept + slope * x1;
      const y2 = intercept + slope * x2;
      
      result.pivotSpan.lowTrendLine = { x1, y1, x2, y2 };
    }
  }
  
  // === Method 2: 5-Point Channel ===
  if (config.enableFivePoint) {
    const channel = calculateFivePointChannel(data, config.channelLength, lastIndex);
    
    if (channel) {
      const x1 = lastIndex - config.channelLength + 1;
      const x2 = lastIndex;
      
      // x in regression was relative to lastIndex (negative)
      // y = slope * x + intercept
      // x1 relative = -config.channelLength + 1
      // x2 relative = 0
      
      const x1Rel = -config.channelLength + 1;
      const x2Rel = 0;
      
      const y1Hi = channel.slopeHi * x1Rel + channel.interceptHi;
      const y2Hi = channel.slopeHi * x2Rel + channel.interceptHi;
      
      const y1Lo = channel.slopeLo * x1Rel + channel.interceptLo;
      const y2Lo = channel.slopeLo * x2Rel + channel.interceptLo;
      
      result.fivePoint.highChannelLine = { x1, y1: y1Hi, x2, y2: y2Hi };
      result.fivePoint.lowChannelLine = { x1, y1: y1Lo, x2, y2: y2Lo };
    }
  }
  
  return result;
}
