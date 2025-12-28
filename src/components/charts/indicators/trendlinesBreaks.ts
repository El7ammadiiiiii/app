/**
 * Trendlines with Breaks [LuxAlgo]
 * Converted from Pine Script to TypeScript for React/ECharts
 * 
 * Features:
 * - Automatic trendline detection from pivot points
 * - Multiple slope calculation methods (ATR, Stdev, Linreg)
 * - Breakout detection with signals
 * - Extended trendlines
 * - Backpaint toggle for real-time vs historical display
 */

// ===================== DATA INTERFACE =====================

type Time = string | number | { year: number; month: number; day: number };

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ===================== INTERFACES =====================

export interface TrendlinesBreaksConfig {
  length: number;                        // Swing detection lookback
  slopeMultiplier: number;               // Slope multiplier
  calcMethod: 'Atr' | 'Stdev' | 'Linreg'; // Slope calculation method
  backpaint: boolean;                    // Backpainting toggle
  upColor: string;                       // Up trendline color
  downColor: string;                     // Down trendline color
  showExtended: boolean;                 // Show extended lines
  lineWidth: number;                     // Line width
}

export interface TrendLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  color: string;
  type: 'upper' | 'lower';
  extended: boolean;
}

export interface BreakoutSignal {
  index: number;
  price: number;
  type: 'up' | 'down';
  label: string;
}

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface TrendlinesBreaksResult {
  // Trendlines
  upperTrendline: TrendLine | null;
  lowerTrendline: TrendLine | null;
  
  // Extended lines (dashed)
  upperExtended: TrendLine | null;
  lowerExtended: TrendLine | null;
  
  // Trendline data points for plotting
  upperPoints: { index: number; price: number }[];
  lowerPoints: { index: number; price: number }[];
  
  // Breakout signals
  breakouts: BreakoutSignal[];
  upBreakouts: BreakoutSignal[];
  downBreakouts: BreakoutSignal[];
  
  // Pivots
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
  
  // Current state
  currentUpper: number;
  currentLower: number;
  currentSlopeUp: number;
  currentSlopeDown: number;
  
  // Stats
  totalBreakouts: number;
  upBreakoutCount: number;
  downBreakoutCount: number;
}

// ===================== DEFAULT CONFIG =====================

export const defaultTrendlinesBreaksConfig: TrendlinesBreaksConfig = {
  length: 14,
  slopeMultiplier: 1.0,
  calcMethod: 'Atr',
  backpaint: true,
  upColor: '#14b8a6',    // Teal
  downColor: '#ef4444',  // Red
  showExtended: true,
  lineWidth: 2
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(data: CandleData[], period: number, endIndex: number): number {
  if (endIndex < period) return 0;
  
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = i > 0 ? data[i - 1].close : data[i].open;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    sum += tr;
  }
  
  return sum / period;
}

/**
 * Calculate Standard Deviation
 */
function calculateStdev(values: number[], period: number, endIndex: number): number {
  if (endIndex < period - 1 || values.length < period) return 0;
  
  const slice = values.slice(endIndex - period + 1, endIndex + 1);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  
  const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / slice.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate Linear Regression slope
 */
function calculateLinregSlope(
  data: CandleData[],
  period: number,
  endIndex: number
): number {
  if (endIndex < period - 1) return 0;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = period;
  
  for (let i = 0; i < period; i++) {
    const idx = endIndex - period + 1 + i;
    const x = idx;
    const y = data[idx].close;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.abs(slope) / 2;
}

/**
 * Find pivot highs
 */
function findPivotHighs(data: CandleData[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = length; i < data.length - length; i++) {
    const currentHigh = data[i].high;
    let isPivot = true;
    
    for (let j = 1; j <= length; j++) {
      if (data[i - j].high >= currentHigh || data[i + j].high >= currentHigh) {
        isPivot = false;
        break;
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: currentHigh, type: 'high' });
    }
  }
  
  return pivots;
}

/**
 * Find pivot lows
 */
function findPivotLows(data: CandleData[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = length; i < data.length - length; i++) {
    const currentLow = data[i].low;
    let isPivot = true;
    
    for (let j = 1; j <= length; j++) {
      if (data[i - j].low <= currentLow || data[i + j].low <= currentLow) {
        isPivot = false;
        break;
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: currentLow, type: 'low' });
    }
  }
  
  return pivots;
}

/**
 * Calculate slope based on method
 */
function calculateSlope(
  data: CandleData[],
  method: 'Atr' | 'Stdev' | 'Linreg',
  length: number,
  mult: number,
  endIndex: number
): number {
  switch (method) {
    case 'Atr':
      return (calculateATR(data, length, endIndex) / length) * mult;
    
    case 'Stdev':
      const closes = data.map(d => d.close);
      return (calculateStdev(closes, length, endIndex) / length) * mult;
    
    case 'Linreg':
      return calculateLinregSlope(data, length, endIndex) * mult;
    
    default:
      return (calculateATR(data, length, endIndex) / length) * mult;
  }
}

// ===================== MAIN CALCULATION =====================

/**
 * Calculate Trendlines with Breaks
 */
export function calculateTrendlinesBreaks(
  data: CandleData[],
  config: Partial<TrendlinesBreaksConfig> = {}
): TrendlinesBreaksResult {
  const cfg = { ...defaultTrendlinesBreaksConfig, ...config };
  
  const result: TrendlinesBreaksResult = {
    upperTrendline: null,
    lowerTrendline: null,
    upperExtended: null,
    lowerExtended: null,
    upperPoints: [],
    lowerPoints: [],
    breakouts: [],
    upBreakouts: [],
    downBreakouts: [],
    pivotHighs: [],
    pivotLows: [],
    currentUpper: 0,
    currentLower: 0,
    currentSlopeUp: 0,
    currentSlopeDown: 0,
    totalBreakouts: 0,
    upBreakoutCount: 0,
    downBreakoutCount: 0
  };
  
  if (data.length < cfg.length * 2 + 10) {
    return result;
  }
  
  const offset = cfg.backpaint ? cfg.length : 0;
  
  // Find all pivots
  result.pivotHighs = findPivotHighs(data, cfg.length);
  result.pivotLows = findPivotLows(data, cfg.length);
  
  // State variables
  let upper = 0;
  let lower = 0;
  let slopePH = 0;
  let slopePL = 0;
  let upos = 0;
  let dnos = 0;
  
  let lastPHIndex = -1;
  let lastPLIndex = -1;
  let lastPHPrice = 0;
  let lastPLPrice = 0;
  
  // Process each bar
  for (let i = cfg.length * 2; i < data.length; i++) {
    const slope = calculateSlope(data, cfg.calcMethod, cfg.length, cfg.slopeMultiplier, i);
    
    // Check for pivot high at this bar (with offset)
    const pivotHighIdx = i - cfg.length;
    const isPH = result.pivotHighs.some(p => p.index === pivotHighIdx);
    
    // Check for pivot low at this bar (with offset)
    const pivotLowIdx = i - cfg.length;
    const isPL = result.pivotLows.some(p => p.index === pivotLowIdx);
    
    // Update slopes when new pivot detected
    if (isPH) {
      const ph = result.pivotHighs.find(p => p.index === pivotHighIdx);
      if (ph) {
        slopePH = slope;
        upper = ph.price;
        lastPHIndex = pivotHighIdx;
        lastPHPrice = ph.price;
        upos = 0;
      }
    } else {
      upper = upper - slopePH;
    }
    
    if (isPL) {
      const pl = result.pivotLows.find(p => p.index === pivotLowIdx);
      if (pl) {
        slopePL = slope;
        lower = pl.price;
        lastPLIndex = pivotLowIdx;
        lastPLPrice = pl.price;
        dnos = 0;
      }
    } else {
      lower = lower + slopePL;
    }
    
    // Calculate display values
    const upperDisplay = cfg.backpaint ? upper : upper - slopePH * cfg.length;
    const lowerDisplay = cfg.backpaint ? lower : lower + slopePL * cfg.length;
    
    // Store trendline points
    if (!isPH && upper > 0) {
      result.upperPoints.push({ index: i - offset, price: upperDisplay });
    }
    if (!isPL && lower > 0) {
      result.lowerPoints.push({ index: i - offset, price: lowerDisplay });
    }
    
    // Check for breakouts
    const prevUpos = upos;
    const prevDnos = dnos;
    
    if (data[i].close > upper - slopePH * cfg.length) {
      upos = 1;
    }
    
    if (data[i].close < lower + slopePL * cfg.length) {
      dnos = 1;
    }
    
    // Upward breakout
    if (upos > prevUpos) {
      const breakout: BreakoutSignal = {
        index: i,
        price: data[i].low,
        type: 'up',
        label: 'B'
      };
      result.breakouts.push(breakout);
      result.upBreakouts.push(breakout);
    }
    
    // Downward breakout
    if (dnos > prevDnos) {
      const breakout: BreakoutSignal = {
        index: i,
        price: data[i].high,
        type: 'down',
        label: 'B'
      };
      result.breakouts.push(breakout);
      result.downBreakouts.push(breakout);
    }
  }
  
  // Create final trendlines from last pivots
  const lastIdx = data.length - 1;
  
  if (lastPHIndex >= 0 && slopePH > 0) {
    const y1 = cfg.backpaint ? lastPHPrice : upper - slopePH * cfg.length;
    const y2 = cfg.backpaint ? lastPHPrice - slopePH : upper - slopePH * (cfg.length + 1);
    
    result.upperTrendline = {
      x1: lastPHIndex - offset,
      y1,
      x2: lastIdx,
      y2: y1 - slopePH * (lastIdx - lastPHIndex + offset),
      slope: -slopePH,
      color: cfg.upColor,
      type: 'upper',
      extended: false
    };
    
    if (cfg.showExtended) {
      result.upperExtended = {
        x1: lastPHIndex - offset,
        y1,
        x2: data.length + 50,
        y2: y1 - slopePH * (data.length + 50 - lastPHIndex + offset),
        slope: -slopePH,
        color: cfg.upColor,
        type: 'upper',
        extended: true
      };
    }
  }
  
  if (lastPLIndex >= 0 && slopePL > 0) {
    const y1 = cfg.backpaint ? lastPLPrice : lower + slopePL * cfg.length;
    const y2 = cfg.backpaint ? lastPLPrice + slopePL : lower + slopePL * (cfg.length + 1);
    
    result.lowerTrendline = {
      x1: lastPLIndex - offset,
      y1,
      x2: lastIdx,
      y2: y1 + slopePL * (lastIdx - lastPLIndex + offset),
      slope: slopePL,
      color: cfg.downColor,
      type: 'lower',
      extended: false
    };
    
    if (cfg.showExtended) {
      result.lowerExtended = {
        x1: lastPLIndex - offset,
        y1,
        x2: data.length + 50,
        y2: y1 + slopePL * (data.length + 50 - lastPLIndex + offset),
        slope: slopePL,
        color: cfg.downColor,
        type: 'lower',
        extended: true
      };
    }
  }
  
  // Set current state
  result.currentUpper = upper;
  result.currentLower = lower;
  result.currentSlopeUp = slopePH;
  result.currentSlopeDown = slopePL;
  
  // Stats
  result.totalBreakouts = result.breakouts.length;
  result.upBreakoutCount = result.upBreakouts.length;
  result.downBreakoutCount = result.downBreakouts.length;
  
  return result;
}

// ===================== UTILITY EXPORTS =====================

/**
 * Get trendline price at specific index
 */
export function getTrendlinePriceAt(line: TrendLine, index: number): number {
  return line.y1 + line.slope * (index - line.x1);
}

/**
 * Check if price broke above trendline
 */
export function isBrokenAbove(line: TrendLine, index: number, price: number): boolean {
  return price > getTrendlinePriceAt(line, index);
}

/**
 * Check if price broke below trendline
 */
export function isBrokenBelow(line: TrendLine, index: number, price: number): boolean {
  return price < getTrendlinePriceAt(line, index);
}

/**
 * Get breakout description
 */
export function getBreakoutDescription(breakout: BreakoutSignal): string {
  return breakout.type === 'up' 
    ? `⬆️ Upward Breakout @ ${breakout.price.toFixed(2)}`
    : `⬇️ Downward Breakout @ ${breakout.price.toFixed(2)}`;
}

/**
 * Format slope for display
 */
export function formatSlopeValue(slope: number, decimals: number = 4): string {
  const sign = slope >= 0 ? '+' : '';
  return `${sign}${slope.toFixed(decimals)}`;
}

/**
 * Get method description
 */
export function getMethodDescription(method: 'Atr' | 'Stdev' | 'Linreg'): string {
  switch (method) {
    case 'Atr': return 'Average True Range';
    case 'Stdev': return 'Standard Deviation';
    case 'Linreg': return 'Linear Regression';
    default: return method;
  }
}
