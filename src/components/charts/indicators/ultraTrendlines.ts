/**
 * Ultra Trendlines [Rathack]
 * Converted from Pine Script to TypeScript for React/ECharts
 * 
 * Features:
 * - Automatic pivot detection (highs and lows)
 * - Dynamic trendline drawing between pivots
 * - Multiple filtering options (slope, price threshold, compare)
 * - Broken trendline tracking and display
 * - Rising/Falling filter for trend direction
 * - Customizable line styles and extensions
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

export interface UltraTrendlinesConfig {
  // Trendline Settings
  pivotLength: number;           // Length for pivot calculation
  lookback: number;              // Bars to look back for detection
  priceThreshold: number;        // Price threshold percentage
  maxLinesPerPivot: number;      // Max lines per pivot
  maxSlopeFilter: number;        // Maximum slope filter
  compareSlopeFilter: number;    // Compare slope filter
  onlyFallingRising: boolean;    // Only falling high & rising low
  
  // Style - High Trendlines
  highColor: string;
  highStyle: 'solid' | 'dashed' | 'dotted';
  highWidth: number;
  
  // Style - Low Trendlines
  lowColor: string;
  lowStyle: 'solid' | 'dashed' | 'dotted';
  lowWidth: number;
  
  // Extension
  extend: 'right' | 'left' | 'both' | 'none' | 'user';
  extendBars: number;
  
  // Broken Style - High
  highBrokenColor: string;
  highBrokenStyle: 'solid' | 'dashed' | 'dotted';
  highBrokenWidth: number;
  
  // Broken Style - Low
  lowBrokenColor: string;
  lowBrokenStyle: 'solid' | 'dashed' | 'dotted';
  lowBrokenWidth: number;
  
  // Broken Extension
  extendBroken: 'right' | 'left' | 'both' | 'none' | 'user';
  extendBrokenBars: number;
  brokenPairs: number;           // Number of broken pairs to display
}

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface TrendLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  type: 'high' | 'low';
  isBroken: boolean;
  breakIndex?: number;
}

export interface UltraTrendlinesResult {
  // Active trendlines
  highTrendlines: TrendLine[];
  lowTrendlines: TrendLine[];
  
  // Broken trendlines
  brokenHighTrendlines: TrendLine[];
  brokenLowTrendlines: TrendLine[];
  
  // Pivots
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
  
  // Stats
  totalHighLines: number;
  totalLowLines: number;
  totalBrokenHigh: number;
  totalBrokenLow: number;
  
  // Price thresholds
  upperThreshold: number;
  lowerThreshold: number;
}

// ===================== DEFAULT CONFIG =====================

export const defaultUltraTrendlinesConfig: UltraTrendlinesConfig = {
  // Trendline Settings
  pivotLength: 15,
  lookback: 300,
  priceThreshold: 2.0,
  maxLinesPerPivot: 5,
  maxSlopeFilter: 10,
  compareSlopeFilter: 10,
  onlyFallingRising: false,
  
  // Style - High
  highColor: '#00bcd4',
  highStyle: 'solid',
  highWidth: 2,
  
  // Style - Low
  lowColor: '#00bcd4',
  lowStyle: 'solid',
  lowWidth: 2,
  
  // Extension
  extend: 'right',
  extendBars: 100,
  
  // Broken Style - High
  highBrokenColor: '#00bcd4',
  highBrokenStyle: 'dashed',
  highBrokenWidth: 1,
  
  // Broken Style - Low
  lowBrokenColor: '#00bcd4',
  lowBrokenStyle: 'dashed',
  lowBrokenWidth: 1,
  
  // Broken Extension
  extendBroken: 'user',
  extendBrokenBars: 20,
  brokenPairs: 1
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
 * Calculate SMA (Simple Moving Average)
 */
function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }
  return sum / period;
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
 * Get trendline price at specific bar index
 */
function getLinePriceAt(line: TrendLine, barIndex: number): number {
  if (line.x2 === line.x1) return line.y1;
  return line.y1 + line.slope * (barIndex - line.x1);
}

/**
 * Calculate price thresholds
 */
function calculateThresholds(
  data: CandleData[],
  priceThreshold: number,
  smaPeriod: number = 100
): { upper: number; lower: number } {
  if (data.length < smaPeriod) {
    const last = data[data.length - 1];
    return {
      upper: last.high * (1 + priceThreshold / 100),
      lower: last.low * (1 - priceThreshold / 100)
    };
  }
  
  // Calculate upper threshold (SMA of high + threshold)
  const upperValues: number[] = [];
  const lowerValues: number[] = [];
  
  for (let i = Math.max(0, data.length - smaPeriod); i < data.length; i++) {
    upperValues.push(data[i].high + (data[i].high / 100 * priceThreshold));
    lowerValues.push(data[i].low - (data[i].low / 100 * priceThreshold));
  }
  
  return {
    upper: calculateSMA(upperValues, Math.min(smaPeriod, upperValues.length)),
    lower: calculateSMA(lowerValues, Math.min(smaPeriod, lowerValues.length))
  };
}

/**
 * Check if price crosses a trendline
 */
function isPriceCrossingLine(
  data: CandleData[],
  line: TrendLine,
  startIdx: number,
  endIdx: number,
  isHighPivot: boolean
): boolean {
  for (let bar = startIdx; bar <= endIdx; bar++) {
    if (bar < 0 || bar >= data.length) continue;
    
    const barPrice = data[bar].close;
    const linePrice = getLinePriceAt(line, bar);
    
    if (isHighPivot ? barPrice > linePrice : barPrice < linePrice) {
      return true;
    }
  }
  return false;
}

/**
 * Filter trendline against existing lines
 */
function filterTrendline(
  existingLines: TrendLine[],
  newLine: TrendLine,
  data: CandleData[],
  pivotLength: number,
  atr: number,
  compareSlopeFilter: number
): boolean {
  const currentBarIndex = data.length - 1;
  
  for (const existingLine of existingLines) {
    // Check if existing line touches the new pivot
    const linePriceAtPivot = getLinePriceAt(existingLine, currentBarIndex - pivotLength);
    const pivotHigh = data[currentBarIndex - pivotLength]?.high || 0;
    const pivotLow = data[currentBarIndex - pivotLength]?.low || 0;
    
    if (linePriceAtPivot < pivotHigh && linePriceAtPivot > pivotLow) {
      return false; // Another line already touches this pivot
    }
    
    // Compare slopes
    const slopeDiff = Math.abs(newLine.slope - existingLine.slope);
    const threshold = atr / compareSlopeFilter;
    
    if (slopeDiff <= threshold || Math.abs(newLine.slope) > atr) {
      return false; // Similar slope exists or slope is too steep
    }
  }
  
  return true;
}

/**
 * Create extended trendline coordinates
 */
function extendLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  extend: string,
  extendBars: number,
  dataLength: number
): { x2: number; y2: number } {
  if (extend === 'user') {
    const slope = (y2 - y1) / (x2 - x1);
    const newX2 = x2 + extendBars;
    const newY2 = y1 + slope * (newX2 - x1);
    return { x2: newX2, y2: newY2 };
  } else if (extend === 'right') {
    const slope = (y2 - y1) / (x2 - x1);
    const newX2 = dataLength + 50;
    const newY2 = y1 + slope * (newX2 - x1);
    return { x2: newX2, y2: newY2 };
  }
  return { x2, y2 };
}

// ===================== MAIN CALCULATION =====================

/**
 * Calculate Ultra Trendlines
 */
export function calculateUltraTrendlines(
  data: CandleData[],
  config: Partial<UltraTrendlinesConfig> = {}
): UltraTrendlinesResult {
  const cfg = { ...defaultUltraTrendlinesConfig, ...config };
  
  const result: UltraTrendlinesResult = {
    highTrendlines: [],
    lowTrendlines: [],
    brokenHighTrendlines: [],
    brokenLowTrendlines: [],
    pivotHighs: [],
    pivotLows: [],
    totalHighLines: 0,
    totalLowLines: 0,
    totalBrokenHigh: 0,
    totalBrokenLow: 0,
    upperThreshold: 0,
    lowerThreshold: 0
  };
  
  if (data.length < cfg.pivotLength * 2 + 10) {
    return result;
  }
  
  // Find all pivots
  const allPivotHighs = findPivotHighs(data, cfg.pivotLength);
  const allPivotLows = findPivotLows(data, cfg.pivotLength);
  
  // Filter pivots within lookback
  const lookbackStart = data.length - cfg.lookback;
  result.pivotHighs = allPivotHighs.filter(p => p.index >= lookbackStart);
  result.pivotLows = allPivotLows.filter(p => p.index >= lookbackStart);
  
  // Calculate thresholds
  const thresholds = calculateThresholds(data, cfg.priceThreshold);
  result.upperThreshold = thresholds.upper;
  result.lowerThreshold = thresholds.lower;
  
  // Calculate ATR for slope filtering
  const atr = calculateATR(data, 21, data.length - 1) / cfg.maxSlopeFilter;
  
  // Process HIGH trendlines
  const highTrendlines: TrendLine[] = [];
  const brokenHighLines: TrendLine[] = [];
  
  // Build trendlines from pivot highs
  for (let i = 1; i < result.pivotHighs.length; i++) {
    const pivot2 = result.pivotHighs[i]; // Newer pivot
    
    // Connect to previous pivots (up to maxLinesPerPivot)
    for (let j = Math.max(0, i - cfg.maxLinesPerPivot); j < i; j++) {
      const pivot1 = result.pivotHighs[j]; // Older pivot
      
      const slope = (pivot2.price - pivot1.price) / (pivot2.index - pivot1.index);
      
      // Apply rising/falling filter
      if (cfg.onlyFallingRising && pivot1.price <= pivot2.price) {
        continue; // Skip rising high trendlines
      }
      
      // Apply slope filter
      if (Math.abs(slope) > atr) {
        continue;
      }
      
      // Create trendline
      const line: TrendLine = {
        x1: pivot1.index,
        y1: pivot1.price,
        x2: pivot2.index,
        y2: pivot2.price,
        slope,
        color: cfg.highColor,
        width: cfg.highWidth,
        style: cfg.highStyle,
        type: 'high',
        isBroken: false
      };
      
      // Check if price crosses the line between pivots
      if (isPriceCrossingLine(data, line, pivot1.index, pivot2.index, true)) {
        continue;
      }
      
      // Filter against existing lines
      if (!filterTrendline(highTrendlines, line, data, cfg.pivotLength, atr, cfg.compareSlopeFilter)) {
        continue;
      }
      
      // Extend the line
      const extended = extendLine(
        line.x1, line.y1, line.x2, line.y2,
        cfg.extend, cfg.extendBars, data.length
      );
      line.x2 = extended.x2;
      line.y2 = extended.y2;
      
      highTrendlines.push(line);
    }
  }
  
  // Check for broken high trendlines
  for (let i = highTrendlines.length - 1; i >= 0; i--) {
    const line = highTrendlines[i];
    const currentPrice = getLinePriceAt(line, data.length - 1);
    
    // Check if price crosses the line
    let isBroken = false;
    let breakIdx = -1;
    
    for (let bar = line.x1; bar < data.length; bar++) {
      const barClose = data[bar].close;
      const linePrice = getLinePriceAt(line, bar);
      
      if (barClose > linePrice) {
        isBroken = true;
        breakIdx = bar;
        break;
      }
    }
    
    if (isBroken) {
      // Create broken trendline
      const brokenLine: TrendLine = {
        ...line,
        x2: breakIdx,
        y2: getLinePriceAt(line, breakIdx),
        color: cfg.highBrokenColor,
        width: cfg.highBrokenWidth,
        style: cfg.highBrokenStyle,
        isBroken: true,
        breakIndex: breakIdx
      };
      
      // Extend broken line
      const extendedBroken = extendLine(
        brokenLine.x1, brokenLine.y1, brokenLine.x2, brokenLine.y2,
        cfg.extendBroken, cfg.extendBrokenBars, data.length
      );
      brokenLine.x2 = extendedBroken.x2;
      brokenLine.y2 = extendedBroken.y2;
      
      brokenHighLines.push(brokenLine);
      highTrendlines.splice(i, 1);
    } else if (currentPrice > thresholds.upper || currentPrice < thresholds.lower) {
      // Remove lines outside thresholds
      highTrendlines.splice(i, 1);
    }
  }
  
  // Process LOW trendlines
  const lowTrendlines: TrendLine[] = [];
  const brokenLowLines: TrendLine[] = [];
  
  // Build trendlines from pivot lows
  for (let i = 1; i < result.pivotLows.length; i++) {
    const pivot2 = result.pivotLows[i]; // Newer pivot
    
    // Connect to previous pivots
    for (let j = Math.max(0, i - cfg.maxLinesPerPivot); j < i; j++) {
      const pivot1 = result.pivotLows[j]; // Older pivot
      
      const slope = (pivot2.price - pivot1.price) / (pivot2.index - pivot1.index);
      
      // Apply rising/falling filter
      if (cfg.onlyFallingRising && pivot1.price >= pivot2.price) {
        continue; // Skip falling low trendlines
      }
      
      // Apply slope filter
      if (Math.abs(slope) > atr) {
        continue;
      }
      
      // Create trendline
      const line: TrendLine = {
        x1: pivot1.index,
        y1: pivot1.price,
        x2: pivot2.index,
        y2: pivot2.price,
        slope,
        color: cfg.lowColor,
        width: cfg.lowWidth,
        style: cfg.lowStyle,
        type: 'low',
        isBroken: false
      };
      
      // Check if price crosses the line between pivots
      if (isPriceCrossingLine(data, line, pivot1.index, pivot2.index, false)) {
        continue;
      }
      
      // Filter against existing lines
      if (!filterTrendline(lowTrendlines, line, data, cfg.pivotLength, atr, cfg.compareSlopeFilter)) {
        continue;
      }
      
      // Extend the line
      const extended = extendLine(
        line.x1, line.y1, line.x2, line.y2,
        cfg.extend, cfg.extendBars, data.length
      );
      line.x2 = extended.x2;
      line.y2 = extended.y2;
      
      lowTrendlines.push(line);
    }
  }
  
  // Check for broken low trendlines
  for (let i = lowTrendlines.length - 1; i >= 0; i--) {
    const line = lowTrendlines[i];
    const currentPrice = getLinePriceAt(line, data.length - 1);
    
    // Check if price crosses the line
    let isBroken = false;
    let breakIdx = -1;
    
    for (let bar = line.x1; bar < data.length; bar++) {
      const barClose = data[bar].close;
      const linePrice = getLinePriceAt(line, bar);
      
      if (barClose < linePrice) {
        isBroken = true;
        breakIdx = bar;
        break;
      }
    }
    
    if (isBroken) {
      // Create broken trendline
      const brokenLine: TrendLine = {
        ...line,
        x2: breakIdx,
        y2: getLinePriceAt(line, breakIdx),
        color: cfg.lowBrokenColor,
        width: cfg.lowBrokenWidth,
        style: cfg.lowBrokenStyle,
        isBroken: true,
        breakIndex: breakIdx
      };
      
      // Extend broken line
      const extendedBroken = extendLine(
        brokenLine.x1, brokenLine.y1, brokenLine.x2, brokenLine.y2,
        cfg.extendBroken, cfg.extendBrokenBars, data.length
      );
      brokenLine.x2 = extendedBroken.x2;
      brokenLine.y2 = extendedBroken.y2;
      
      brokenLowLines.push(brokenLine);
      lowTrendlines.splice(i, 1);
    } else if (currentPrice > thresholds.upper || currentPrice < thresholds.lower) {
      // Remove lines outside thresholds
      lowTrendlines.splice(i, 1);
    }
  }
  
  // Limit broken lines to brokenPairs
  result.brokenHighTrendlines = brokenHighLines.slice(0, cfg.brokenPairs);
  result.brokenLowTrendlines = brokenLowLines.slice(0, cfg.brokenPairs);
  
  // Set results
  result.highTrendlines = highTrendlines;
  result.lowTrendlines = lowTrendlines;
  result.totalHighLines = highTrendlines.length;
  result.totalLowLines = lowTrendlines.length;
  result.totalBrokenHigh = result.brokenHighTrendlines.length;
  result.totalBrokenLow = result.brokenLowTrendlines.length;
  
  return result;
}

// ===================== UTILITY EXPORTS =====================

/**
 * Get trendline description
 */
export function getTrendlineDescription(line: TrendLine): string {
  const direction = line.slope > 0 ? 'Rising' : 'Falling';
  const type = line.type === 'high' ? 'Resistance' : 'Support';
  const status = line.isBroken ? 'Broken' : 'Active';
  return `${direction} ${type} (${status})`;
}

/**
 * Check if price is near trendline
 */
export function isPriceNearLine(
  line: TrendLine,
  index: number,
  price: number,
  tolerance: number
): boolean {
  const linePrice = getLinePriceAt(line, index);
  return Math.abs(price - linePrice) <= tolerance;
}

/**
 * Get slope angle in degrees
 */
export function getSlopeAngle(slope: number): number {
  return Math.atan(slope) * (180 / Math.PI);
}

/**
 * Format slope for display
 */
export function formatSlope(slope: number, decimals: number = 4): string {
  const sign = slope >= 0 ? '+' : '';
  return `${sign}${slope.toFixed(decimals)}`;
}

/**
 * Get all active trendlines (both high and low)
 */
export function getAllActiveTrendlines(result: UltraTrendlinesResult): TrendLine[] {
  return [...result.highTrendlines, ...result.lowTrendlines];
}

/**
 * Get all broken trendlines
 */
export function getAllBrokenTrendlines(result: UltraTrendlinesResult): TrendLine[] {
  return [...result.brokenHighTrendlines, ...result.brokenLowTrendlines];
}
