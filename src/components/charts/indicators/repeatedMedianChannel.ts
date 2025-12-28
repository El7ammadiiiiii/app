/**
 * Repeated Median Regression Channel [tbiktag]
 * Converted from Pine Script to TypeScript for React/ECharts
 * 
 * Features:
 * - Repeated Median (RM) robust linear regression
 * - Dynamic channel width based on RMSE
 * - Historical broken channel tracking
 * - Slope direction coloring
 * - Extendable regression lines
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

export interface RMRChannelConfig {
  source: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';
  length: number;              // Regression length
  channelMultiplier: number;   // Channel width in RMSE units
  showChannel: boolean;        // Show upper/lower channel lines
  showHistoricalBroken: boolean; // Show historical broken channels
  showSlopeLabel: boolean;     // Print slope value
  extendLine: boolean;         // Extend lines to the right
  lineWidth: number;           // Line width
  colorUp: string;             // Color when slope is up
  colorDown: string;           // Color when slope is down
  colorBroken: string;         // Color for broken channels
}

export interface RegressionLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  intercept: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed';
  extended: boolean;
}

export interface BrokenChannel {
  index: number;
  upperLine: RegressionLine;
  lowerLine: RegressionLine;
  breakType: 'above' | 'below';
}

export interface RMRChannelResult {
  // Main regression
  centerLine: RegressionLine | null;
  upperLine: RegressionLine | null;
  lowerLine: RegressionLine | null;
  
  // Statistics
  slope: number;
  intercept: number;
  rmse: number;
  deviation: number;
  
  // State
  isBroken: boolean;
  breakDirection: 'above' | 'below' | null;
  slopeDirection: 'up' | 'down';
  
  // Historical
  brokenChannels: BrokenChannel[];
  
  // Label info
  slopeLabel: {
    index: number;
    price: number;
    text: string;
    position: 'above' | 'below';
    color: string;
  } | null;
}

// ===================== DEFAULT CONFIG =====================

export const defaultRMRChannelConfig: RMRChannelConfig = {
  source: 'close',
  length: 100,
  channelMultiplier: 2,
  showChannel: true,
  showHistoricalBroken: false,
  showSlopeLabel: false,
  extendLine: true,
  lineWidth: 2,
  colorUp: '#22c55e',
  colorDown: '#ef4444',
  colorBroken: '#c0c0c0'
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Get source price based on selection
 */
function getSourcePrice(candle: CandleData, source: RMRChannelConfig['source']): number {
  switch (source) {
    case 'open': return candle.open;
    case 'high': return candle.high;
    case 'low': return candle.low;
    case 'close': return candle.close;
    case 'hl2': return (candle.high + candle.low) / 2;
    case 'hlc3': return (candle.high + candle.low + candle.close) / 3;
    case 'ohlc4': return (candle.open + candle.high + candle.low + candle.close) / 4;
    default: return candle.close;
  }
}

/**
 * Calculate median of an array
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Repeated Median Regression Algorithm
 * 
 * For each point i, calculate the median of slopes between point i and all other points.
 * The final slope is the median of all these medians.
 * The intercept is the median of (y - slope * x) for all points.
 */
function repeatedMedianRegression(
  values: number[],
  startIndex: number,
  length: number
): { slope: number; intercept: number } {
  const n = Math.min(length, values.length - startIndex);
  if (n < 2) return { slope: 0, intercept: values[startIndex] || 0 };
  
  // Extract the data window
  const y: number[] = [];
  const x: number[] = [];
  
  for (let i = 0; i < n; i++) {
    const idx = startIndex + i;
    if (idx < values.length) {
      y.push(values[idx]);
      x.push(i); // Use relative index (0 to n-1)
    }
  }
  
  const dataLen = y.length;
  if (dataLen < 2) return { slope: 0, intercept: y[0] || 0 };
  
  // Calculate Repeated Median slope
  const medianSlopes: number[] = [];
  
  for (let i = 0; i < dataLen; i++) {
    const slopes: number[] = [];
    
    for (let j = 0; j < dataLen; j++) {
      if (i !== j && x[j] !== x[i]) {
        const slope = (y[j] - y[i]) / (x[j] - x[i]);
        if (isFinite(slope)) {
          slopes.push(slope);
        }
      }
    }
    
    if (slopes.length > 0) {
      medianSlopes.push(median(slopes));
    }
  }
  
  const rmSlope = medianSlopes.length > 0 ? median(medianSlopes) : 0;
  
  // Calculate intercept as median of (y - slope * x)
  const intercepts: number[] = [];
  for (let i = 0; i < dataLen; i++) {
    intercepts.push(y[i] - rmSlope * x[i]);
  }
  
  const rmIntercept = median(intercepts);
  
  return { slope: rmSlope, intercept: rmIntercept };
}

/**
 * Calculate Root Mean Square Error (RMSE)
 */
function calculateRMSE(
  values: number[],
  startIndex: number,
  length: number,
  slope: number,
  intercept: number
): number {
  const n = Math.min(length, values.length - startIndex);
  if (n < 1) return 0;
  
  let sumSquaredError = 0;
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    const idx = startIndex + i;
    if (idx < values.length) {
      const predicted = intercept + slope * i;
      const actual = values[idx];
      const error = actual - predicted;
      sumSquaredError += error * error;
      count++;
    }
  }
  
  return count > 0 ? Math.sqrt(sumSquaredError / count) : 0;
}

/**
 * Check if two values crossed
 */
function crossed(current: number, previous: number, level: number): boolean {
  return (previous <= level && current > level) || (previous >= level && current < level);
}

// ===================== MAIN CALCULATION =====================

/**
 * Calculate Repeated Median Regression Channel
 */
export function calculateRMRChannel(
  data: CandleData[],
  config: Partial<RMRChannelConfig> = {}
): RMRChannelResult {
  const cfg = { ...defaultRMRChannelConfig, ...config };
  
  const result: RMRChannelResult = {
    centerLine: null,
    upperLine: null,
    lowerLine: null,
    slope: 0,
    intercept: 0,
    rmse: 0,
    deviation: 0,
    isBroken: false,
    breakDirection: null,
    slopeDirection: 'up',
    brokenChannels: [],
    slopeLabel: null
  };
  
  if (data.length < cfg.length || cfg.length < 3) {
    return result;
  }
  
  // Get source values
  const sourceValues = data.map(d => getSourcePrice(d, cfg.source));
  
  // Calculate regression for the most recent window
  const endIndex = data.length - 1;
  const startIndex = Math.max(0, endIndex - cfg.length + 1);
  
  // Apply Repeated Median regression
  const { slope, intercept } = repeatedMedianRegression(sourceValues, startIndex, cfg.length);
  
  result.slope = slope;
  result.intercept = intercept;
  result.slopeDirection = slope > 0 ? 'up' : 'down';
  
  // Calculate RMSE
  result.rmse = calculateRMSE(sourceValues, startIndex, cfg.length, slope, intercept);
  result.deviation = cfg.channelMultiplier * result.rmse;
  
  // Calculate line endpoints
  const x1 = startIndex;
  const x2 = endIndex;
  const y1 = intercept;  // y at x=0 (relative to start)
  const y2 = intercept + slope * (cfg.length - 1);  // y at x=length-1
  
  // Determine color
  const lineColor = slope > 0 ? cfg.colorUp : cfg.colorDown;
  
  // Check if current price breaks the channel
  const currentPrice = sourceValues[endIndex];
  const upperBand = y2 + result.deviation;
  const lowerBand = y2 - result.deviation;
  
  if (currentPrice > upperBand) {
    result.isBroken = true;
    result.breakDirection = 'above';
  } else if (currentPrice < lowerBand) {
    result.isBroken = true;
    result.breakDirection = 'below';
  }
  
  // Create center regression line
  result.centerLine = {
    x1,
    y1,
    x2,
    y2,
    slope,
    intercept,
    color: lineColor,
    width: cfg.lineWidth,
    style: 'solid',
    extended: cfg.extendLine
  };
  
  // Create channel lines
  if (cfg.showChannel) {
    const channelColor = result.isBroken ? cfg.colorBroken : lineColor;
    
    result.upperLine = {
      x1,
      y1: y1 + result.deviation,
      x2,
      y2: y2 + result.deviation,
      slope,
      intercept: intercept + result.deviation,
      color: channelColor,
      width: cfg.lineWidth,
      style: 'dashed',
      extended: cfg.extendLine
    };
    
    result.lowerLine = {
      x1,
      y1: y1 - result.deviation,
      x2,
      y2: y2 - result.deviation,
      slope,
      intercept: intercept - result.deviation,
      color: channelColor,
      width: cfg.lineWidth,
      style: 'dashed',
      extended: cfg.extendLine
    };
  }
  
  // Track historical broken channels
  if (cfg.showHistoricalBroken) {
    let lastSavedBreakBar = 0;
    
    for (let i = cfg.length; i < data.length; i++) {
      const windowStart = i - cfg.length + 1;
      const { slope: histSlope, intercept: histIntercept } = 
        repeatedMedianRegression(sourceValues, windowStart, cfg.length);
      
      const histRMSE = calculateRMSE(sourceValues, windowStart, cfg.length, histSlope, histIntercept);
      const histDev = cfg.channelMultiplier * histRMSE;
      
      const histY2 = histIntercept + histSlope * (cfg.length - 1);
      const histUpper = histY2 + histDev;
      const histLower = histY2 - histDev;
      
      const currentVal = sourceValues[i];
      const prevVal = i > 0 ? sourceValues[i - 1] : currentVal;
      
      // Check for crossing
      const crossedUpper = crossed(currentVal, prevVal, histUpper);
      const crossedLower = crossed(currentVal, prevVal, histLower);
      
      // Only save if enough bars have passed since last break
      const histPlotCondition = i - Math.floor(cfg.length * 0.5) > lastSavedBreakBar;
      
      if ((crossedUpper || crossedLower) && histPlotCondition) {
        const histY1 = histIntercept;
        
        result.brokenChannels.push({
          index: i,
          upperLine: {
            x1: windowStart,
            y1: histY1 + histDev,
            x2: i,
            y2: histY2 + histDev,
            slope: histSlope,
            intercept: histIntercept + histDev,
            color: cfg.colorBroken,
            width: 1,
            style: 'dashed',
            extended: false
          },
          lowerLine: {
            x1: windowStart,
            y1: histY1 - histDev,
            x2: i,
            y2: histY2 - histDev,
            slope: histSlope,
            intercept: histIntercept - histDev,
            color: cfg.colorBroken,
            width: 1,
            style: 'dashed',
            extended: false
          },
          breakType: crossedUpper ? 'above' : 'below'
        });
        
        lastSavedBreakBar = i;
      }
    }
  }
  
  // Create slope label
  if (cfg.showSlopeLabel) {
    const labelY = slope > 0 ? y1 - result.deviation : y1 + result.deviation;
    
    result.slopeLabel = {
      index: x1,
      price: labelY,
      text: `Slope ${slope.toFixed(4)}`,
      position: slope > 0 ? 'below' : 'above',
      color: lineColor
    };
  }
  
  return result;
}

// ===================== UTILITY EXPORTS =====================

/**
 * Get regression line price at specific index
 */
export function getRegressionPriceAt(line: RegressionLine, index: number): number {
  if (index < line.x1) return line.y1;
  const relativeX = index - line.x1;
  return line.y1 + line.slope * relativeX;
}

/**
 * Get channel description
 */
export function getChannelDescription(result: RMRChannelResult): string {
  const direction = result.slopeDirection === 'up' ? '📈 Uptrend' : '📉 Downtrend';
  const status = result.isBroken ? `⚠️ Broken ${result.breakDirection}` : '✅ Intact';
  return `${direction} | ${status}`;
}

/**
 * Calculate slope angle in degrees
 */
export function getSlopeAngle(slope: number): number {
  return Math.atan(slope) * (180 / Math.PI);
}

/**
 * Check if price is inside channel
 */
export function isPriceInChannel(
  result: RMRChannelResult,
  index: number,
  price: number
): boolean {
  if (!result.upperLine || !result.lowerLine) return true;
  
  const upper = getRegressionPriceAt(result.upperLine, index);
  const lower = getRegressionPriceAt(result.lowerLine, index);
  
  return price <= upper && price >= lower;
}

/**
 * Get position relative to channel
 */
export function getChannelPosition(
  result: RMRChannelResult,
  index: number,
  price: number
): 'above' | 'inside' | 'below' | 'center' {
  if (!result.centerLine || !result.upperLine || !result.lowerLine) return 'inside';
  
  const upper = getRegressionPriceAt(result.upperLine, index);
  const lower = getRegressionPriceAt(result.lowerLine, index);
  const center = getRegressionPriceAt(result.centerLine, index);
  
  if (price > upper) return 'above';
  if (price < lower) return 'below';
  if (Math.abs(price - center) < result.rmse * 0.1) return 'center';
  return 'inside';
}

/**
 * Format slope for display
 */
export function formatSlope(slope: number, decimals: number = 4): string {
  const sign = slope >= 0 ? '+' : '';
  return `${sign}${slope.toFixed(decimals)}`;
}
