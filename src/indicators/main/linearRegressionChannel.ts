/**
 * Linear Regression Channel Screener
 * Based on TradingView indicator by @Daveatt and @Lonesometheblue
 * https://www.tradingview.com/script/efXI515C-Linear-Regression-Channel/
 * 
 * Mozilla Public License 2.0
 */

export interface LRCConfig {
  length: number;           // Period for regression calculation (default: 100)
  deviation: number;        // Standard deviation multiplier (default: 2.0)
  source: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';
  extendLines: boolean;     // Extend lines to the right
  colors: {
    upTrend: string;        // Bullish color (default: lime)
    downTrend: string;      // Bearish color (default: red)
    neutral: string;        // Neutral color (default: blue)
  };
  lineWidth: number;
}

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;  // Support Time type from lightweight-charts
}

export interface ChannelResult {
  intercept: number;        // Y1 - start of middle line
  endY: number;             // Y2 - end of middle line
  deviation: number;        // Standard deviation
  slope: number;            // Slope of regression line
}

export interface LRCPoint {
  index: number;
  upper: number;            // Upper channel line
  middle: number;           // Middle regression line
  lower: number;            // Lower channel line
}

export interface LRCSignal {
  index: number;
  type: 'bullish' | 'bearish' | 'broken_up' | 'broken_down';
  price: number;
  timestamp?: number | string;
}

export interface LRCResult {
  // Channel lines data
  channelPoints: LRCPoint[];
  
  // Current channel values
  currentChannel: {
    upper: number;
    middle: number;
    lower: number;
    slope: number;
    deviation: number;
  };
  
  // Trend information
  trend: 'bullish' | 'bearish' | 'neutral';
  trendStrength: 'strong' | 'moderate' | 'weak';
  trendDirection: '⇑' | '⇗' | '⇒' | '⇘' | '⇓';
  
  // Position relative to middle line
  pricePosition: 'above' | 'below' | 'at_middle';
  
  // Channel status
  channelStatus: 'inside' | 'broken_above' | 'broken_below';
  
  // Signals
  signals: LRCSignal[];
  
  // For drawing lines
  lines: {
    startIndex: number;
    endIndex: number;
    upperStart: number;
    upperEnd: number;
    middleStart: number;
    middleEnd: number;
    lowerStart: number;
    lowerEnd: number;
  };
  
  // Previous values for comparison
  previousSlope: number | null;
}

export const defaultLRCConfig: LRCConfig = {
  length: 100,
  deviation: 2.0,
  source: 'close',
  extendLines: true,
  colors: {
    upTrend: '#00ff00',     // lime
    downTrend: '#ff0000',   // red
    neutral: '#2196F3'      // blue
  },
  lineWidth: 2
};

/**
 * Get source price based on configuration
 */
function getSourcePrice(candle: CandleData, source: LRCConfig['source']): number {
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
 * Calculate linear regression value at offset
 * Equivalent to ta.linreg in Pine Script
 */
function linearRegression(data: number[], length: number, offset: number): number {
  if (data.length < length) return NaN;
  
  const startIdx = data.length - length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < length; i++) {
    const x = i;
    const y = data[startIdx + i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  
  const n = length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Return value at (length - 1 - offset) from start
  return intercept + slope * (length - 1 - offset);
}

/**
 * Calculate Linear Regression Channel
 * Equivalent to get_channel() in Pine Script
 */
function getChannel(srcData: number[], length: number): ChannelResult {
  if (srcData.length < length) {
    return { intercept: NaN, endY: NaN, deviation: NaN, slope: NaN };
  }
  
  const startIdx = srcData.length - length;
  
  // Calculate mid (simple moving average)
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += srcData[startIdx + i];
  }
  const mid = sum / length;
  
  // Calculate slope using linear regression
  const linreg0 = linearRegression(srcData, length, 0);
  const linreg1 = linearRegression(srcData, length, 1);
  const slope = linreg0 - linreg1;
  
  // Calculate intercept
  const intercept = mid - slope * Math.floor(length / 2) + ((1 - length % 2) / 2) * slope;
  
  // Calculate end Y value
  const endY = intercept + slope * (length - 1);
  
  // Calculate standard deviation
  let devSum = 0;
  for (let x = 0; x < length; x++) {
    const expectedY = slope * (length - x) + intercept;
    const actualY = srcData[startIdx + (length - 1 - x)];
    devSum += Math.pow(actualY - expectedY, 2);
  }
  const deviation = Math.sqrt(devSum / length);
  
  return { intercept, endY, deviation, slope };
}

/**
 * Main calculation function for Linear Regression Channel
 */
export function calculateLinearRegressionChannel(
  data: CandleData[],
  config: Partial<LRCConfig> = {}
): LRCResult {
  const cfg = { ...defaultLRCConfig, ...config };
  const { length, deviation: devMultiplier, source } = cfg;
  
  // Extract source prices
  const srcData = data.map(candle => getSourcePrice(candle, source));
  
  // Initialize result
  const channelPoints: LRCPoint[] = [];
  const signals: LRCSignal[] = [];
  let previousSlope: number | null = null;
  
  // Need at least length bars
  if (data.length < length) {
    return {
      channelPoints: [],
      currentChannel: { upper: NaN, middle: NaN, lower: NaN, slope: NaN, deviation: NaN },
      trend: 'neutral',
      trendStrength: 'weak',
      trendDirection: '⇒',
      pricePosition: 'at_middle',
      channelStatus: 'inside',
      signals: [],
      lines: {
        startIndex: 0, endIndex: 0,
        upperStart: NaN, upperEnd: NaN,
        middleStart: NaN, middleEnd: NaN,
        lowerStart: NaN, lowerEnd: NaN
      },
      previousSlope: null
    };
  }
  
  // Calculate channel for each point (for historical visualization)
  for (let i = length; i <= data.length; i++) {
    const sliceData = srcData.slice(0, i);
    const channel = getChannel(sliceData, length);
    
    if (!isNaN(channel.endY)) {
      const devOffset = channel.deviation * devMultiplier;
      channelPoints.push({
        index: i - 1,
        upper: channel.endY + devOffset,
        middle: channel.endY,
        lower: channel.endY - devOffset
      });
    }
  }
  
  // Calculate current channel
  const currentChannelData = getChannel(srcData, length);
  const currentDevOffset = currentChannelData.deviation * devMultiplier;
  
  // Calculate previous channel for slope comparison
  if (srcData.length > length) {
    const prevSrcData = srcData.slice(0, -1);
    const prevChannel = getChannel(prevSrcData, length);
    previousSlope = prevChannel.slope;
  }
  
  // Current values
  const currentClose = data[data.length - 1].close;
  const currentSlope = currentChannelData.slope;
  const currentDeviation = currentChannelData.deviation;
  
  // Line coordinates
  const startIndex = data.length - length;
  const endIndex = data.length - 1;
  
  const upperStart = currentChannelData.intercept + currentDevOffset;
  const upperEnd = currentChannelData.endY + currentDevOffset;
  const middleStart = currentChannelData.intercept;
  const middleEnd = currentChannelData.endY;
  const lowerStart = currentChannelData.intercept - currentDevOffset;
  const lowerEnd = currentChannelData.endY - currentDevOffset;
  
  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let trendDirection: '⇑' | '⇗' | '⇒' | '⇘' | '⇓' = '⇒';
  let trendStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  
  if (currentSlope > 0) {
    trend = 'bullish';
    if (previousSlope !== null) {
      if (currentSlope > previousSlope) {
        trendDirection = '⇑';  // Strong upward
        trendStrength = 'strong';
      } else {
        trendDirection = '⇗';  // Moderate upward
        trendStrength = 'moderate';
      }
    } else {
      trendDirection = '⇗';
      trendStrength = 'moderate';
    }
  } else if (currentSlope < 0) {
    trend = 'bearish';
    if (previousSlope !== null) {
      if (currentSlope < previousSlope) {
        trendDirection = '⇓';  // Strong downward
        trendStrength = 'strong';
      } else {
        trendDirection = '⇘';  // Moderate downward
        trendStrength = 'moderate';
      }
    } else {
      trendDirection = '⇘';
      trendStrength = 'moderate';
    }
  }
  
  // Price position relative to middle line
  let pricePosition: 'above' | 'below' | 'at_middle' = 'at_middle';
  const middleTolerance = currentDeviation * 0.1;
  if (currentClose > middleEnd + middleTolerance) {
    pricePosition = 'above';
  } else if (currentClose < middleEnd - middleTolerance) {
    pricePosition = 'below';
  }
  
  // Channel status (broken or inside)
  let channelStatus: 'inside' | 'broken_above' | 'broken_below' = 'inside';
  if (currentSlope > 0 && currentClose < lowerEnd) {
    channelStatus = 'broken_below';
  } else if (currentSlope < 0 && currentClose > upperEnd) {
    channelStatus = 'broken_above';
  }
  
  // Detect trend change signals
  if (previousSlope !== null) {
    const prevSign = Math.sign(previousSlope);
    const currSign = Math.sign(currentSlope);
    
    if (prevSign !== currSign && currSign !== 0) {
      if (currentSlope > 0) {
        signals.push({
          index: endIndex,
          type: 'bullish',
          price: currentClose,
          timestamp: data[endIndex].time
        });
      } else {
        signals.push({
          index: endIndex,
          type: 'bearish',
          price: currentClose,
          timestamp: data[endIndex].time
        });
      }
    }
  }
  
  // Detect channel breaks
  if (channelStatus === 'broken_above') {
    signals.push({
      index: endIndex,
      type: 'broken_up',
      price: currentClose,
      timestamp: data[endIndex].time
    });
  } else if (channelStatus === 'broken_below') {
    signals.push({
      index: endIndex,
      type: 'broken_down',
      price: currentClose,
      timestamp: data[endIndex].time
    });
  }
  
  return {
    channelPoints,
    currentChannel: {
      upper: upperEnd,
      middle: middleEnd,
      lower: lowerEnd,
      slope: currentSlope,
      deviation: currentDeviation
    },
    trend,
    trendStrength,
    trendDirection,
    pricePosition,
    channelStatus,
    signals,
    lines: {
      startIndex,
      endIndex,
      upperStart,
      upperEnd,
      middleStart,
      middleEnd,
      lowerStart,
      lowerEnd
    },
    previousSlope
  };
}

/**
 * Multi-symbol screener data structure
 */
export interface SymbolScreenerData {
  symbol: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  trendDirection: string;
  pricePosition: 'above' | 'below' | 'at_middle';
  channelStatus: 'inside' | 'broken_above' | 'broken_below';
  slope: number;
  currentPrice: number;
  middleLine: number;
  upperChannel: number;
  lowerChannel: number;
  signal?: 'trend_up' | 'trend_down' | 'break_up' | 'break_down';
}

/**
 * Analyze multiple symbols for screener table
 */
export function analyzeSymbolsForScreener(
  symbolsData: Map<string, CandleData[]>,
  config: Partial<LRCConfig> = {}
): SymbolScreenerData[] {
  const results: SymbolScreenerData[] = [];
  
  symbolsData.forEach((data, symbol) => {
    if (data.length === 0) return;
    
    const lrcResult = calculateLinearRegressionChannel(data, config);
    const currentPrice = data[data.length - 1].close;
    
    // Determine signal
    let signal: SymbolScreenerData['signal'] | undefined;
    if (lrcResult.signals.length > 0) {
      const lastSignal = lrcResult.signals[lrcResult.signals.length - 1];
      switch (lastSignal.type) {
        case 'bullish': signal = 'trend_up'; break;
        case 'bearish': signal = 'trend_down'; break;
        case 'broken_up': signal = 'break_up'; break;
        case 'broken_down': signal = 'break_down'; break;
      }
    }
    
    results.push({
      symbol: symbol.includes(':') ? symbol.split(':')[1] : symbol,
      trend: lrcResult.trend,
      trendDirection: lrcResult.trendDirection,
      pricePosition: lrcResult.pricePosition,
      channelStatus: lrcResult.channelStatus,
      slope: lrcResult.currentChannel.slope,
      currentPrice,
      middleLine: lrcResult.currentChannel.middle,
      upperChannel: lrcResult.currentChannel.upper,
      lowerChannel: lrcResult.currentChannel.lower,
      signal
    });
  });
  
  return results;
}

/**
 * Get color based on trend
 */
export function getLRCColor(
  trend: 'bullish' | 'bearish' | 'neutral',
  config: Partial<LRCConfig> = {}
): string {
  const cfg = { ...defaultLRCConfig, ...config };
  switch (trend) {
    case 'bullish': return cfg.colors.upTrend;
    case 'bearish': return cfg.colors.downTrend;
    default: return cfg.colors.neutral;
  }
}

/**
 * Format screener data for display
 */
export function formatScreenerDisplay(data: SymbolScreenerData): {
  symbol: string;
  trend: string;
  trendColor: string;
  position: string;
  positionColor: string;
  signal: string;
} {
  const cfg = defaultLRCConfig;
  
  return {
    symbol: data.symbol,
    trend: data.trend.charAt(0).toUpperCase() + data.trend.slice(1),
    trendColor: data.trend === 'bullish' ? cfg.colors.upTrend : 
                data.trend === 'bearish' ? cfg.colors.downTrend : cfg.colors.neutral,
    position: data.pricePosition === 'above' ? 'Above' : 
              data.pricePosition === 'below' ? 'Below' : 'Middle',
    positionColor: data.pricePosition === 'above' ? cfg.colors.upTrend : 
                   data.pricePosition === 'below' ? cfg.colors.downTrend : cfg.colors.neutral,
    signal: data.signal ? 
            (data.signal === 'trend_up' ? '⇑' : 
             data.signal === 'trend_down' ? '⇓' : 
             data.signal === 'break_up' ? '↑B' : '↓B') : ''
  };
}

export default calculateLinearRegressionChannel;
