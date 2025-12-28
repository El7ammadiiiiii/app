// Converted to TypeScript for Display 5 Models
// Original: Support and Resistance Power Channel [ChartPrime]
// License: MPL 2.0

/**
 * Support & Resistance Power Channel
 * 
 * Dynamic S/R channels based on recent highs/lows with buy/sell power analysis:
 * 
 * FEATURES:
 * - Max/Min Detection: Finds highest high and lowest low over lookback period
 * - ATR-Based Channels: Resistance (top) and Support (bottom) zones with ATR width
 * - Buy/Sell Power: Counts bullish vs bearish bars in lookback period
 * - Breakout Signals: Detects when price crosses channel boundaries
 * - Midpoint Reference: Shows average between resistance and support
 * 
 * LOGIC:
 * - Resistance Channel: max_high + ATR to max_high - ATR (sell zone)
 * - Support Channel: min_low + ATR to min_low - ATR (buy zone)
 * - Buy Signal: Price crosses above support channel top
 * - Sell Signal: Price crosses below resistance channel bottom
 */

export interface SRPowerChannelConfig {
  length: number;          // 130 default - lookback period for max/min
  extend: number;          // 30 default - extend channels forward (bars)
  atrPeriod: number;       // 200 default - ATR calculation period
  atrMultiplier: number;   // 0.5 default - ATR multiplier for channel width
}

export const defaultSRPowerChannelConfig: SRPowerChannelConfig = {
  length: 130,
  extend: 30,
  atrPeriod: 200,
  atrMultiplier: 0.5
};

export interface ChannelData {
  maxHigh: number;
  minLow: number;
  midpoint: number;
  maxIndex: number;      // Index where max high occurred
  minIndex: number;      // Index where min low occurred
  atr: number;
  resistanceTop: number;    // max + atr
  resistanceBottom: number; // max - atr
  supportTop: number;       // min + atr
  supportBottom: number;    // min - atr
}

export interface PowerStats {
  buyPower: number;   // Count of bullish bars
  sellPower: number;  // Count of bearish bars
}

export interface Signal {
  index: number;
  price: number;
  type: 'buy' | 'sell';
}

export interface SRPowerChannelResult {
  channel: ChannelData;
  power: PowerStats;
  signals: Signal[];
}

/**
 * Calculate Average True Range (ATR)
 */
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trueRanges.push(tr);
  }
  
  // Calculate ATR using simple moving average of TR
  let atr = 0;
  const startIdx = Math.max(0, trueRanges.length - period);
  
  for (let i = startIdx; i < trueRanges.length; i++) {
    atr += trueRanges[i];
  }
  
  return atr / Math.min(period, trueRanges.length);
}

/**
 * Find max high and min low over lookback period
 */
function findMaxMin(
  highs: number[],
  lows: number[],
  length: number
): { maxHigh: number; minLow: number; maxIndex: number; minIndex: number } {
  const currentIndex = highs.length - 1;
  const startIndex = Math.max(0, currentIndex - length + 1);
  
  let maxHigh = highs[startIndex];
  let minLow = lows[startIndex];
  let maxIndex = startIndex;
  let minIndex = startIndex;
  
  for (let i = startIndex; i <= currentIndex; i++) {
    if (highs[i] > maxHigh) {
      maxHigh = highs[i];
      maxIndex = i;
    }
    if (lows[i] < minLow) {
      minLow = lows[i];
      minIndex = i;
    }
  }
  
  return { maxHigh, minLow, maxIndex, minIndex };
}

/**
 * Calculate buy/sell power (count of bullish/bearish bars)
 */
function calculatePower(
  opens: number[],
  closes: number[],
  length: number
): PowerStats {
  const currentIndex = closes.length - 1;
  const startIndex = Math.max(0, currentIndex - length + 1);
  
  let buyPower = 0;
  let sellPower = 0;
  
  for (let i = startIndex; i <= currentIndex; i++) {
    if (closes[i] > opens[i]) {
      buyPower++;
    } else if (closes[i] < opens[i]) {
      sellPower++;
    }
  }
  
  return { buyPower, sellPower };
}

/**
 * Detect breakout signals
 */
function detectSignals(
  highs: number[],
  lows: number[],
  channel: ChannelData,
  length: number
): Signal[] {
  const signals: Signal[] = [];
  const currentIndex = highs.length - 1;
  const startIndex = Math.max(0, currentIndex - length + 1);
  
  for (let i = startIndex + 1; i <= currentIndex; i++) {
    const low_1 = lows[i];
    const low_2 = lows[i - 1];
    const high_1 = highs[i];
    const high_2 = highs[i - 1];
    
    // Buy signal: Price crosses above support channel top
    if (low_1 > channel.supportTop && low_2 <= channel.supportTop) {
      signals.push({
        index: i,
        price: low_2,
        type: 'buy'
      });
    }
    
    // Sell signal: Price crosses below resistance channel bottom
    if (high_1 < channel.resistanceBottom && high_2 >= channel.resistanceBottom) {
      signals.push({
        index: i,
        price: high_2,
        type: 'sell'
      });
    }
  }
  
  return signals;
}

/**
 * Main calculation function
 */
export function calculateSRPowerChannel(
  highs: number[],
  lows: number[],
  opens: number[],
  closes: number[],
  config: SRPowerChannelConfig = defaultSRPowerChannelConfig
): SRPowerChannelResult {
  // Find max/min over lookback period
  const { maxHigh, minLow, maxIndex, minIndex } = findMaxMin(highs, lows, config.length);
  
  // Calculate ATR
  const atr = calculateATR(highs, lows, closes, config.atrPeriod) * config.atrMultiplier;
  
  // Calculate midpoint
  const midpoint = (maxHigh + minLow) / 2;
  
  // Calculate channel boundaries
  // Resistance channel (top - sell zone): max ± atr
  const resistanceTop = maxHigh + atr;
  const resistanceBottom = maxHigh - atr;
  
  // Support channel (bottom - buy zone): min ± atr
  const supportTop = minLow + atr;
  const supportBottom = minLow - atr;
  
  const channel: ChannelData = {
    maxHigh,
    minLow,
    midpoint,
    maxIndex,
    minIndex,
    atr,
    resistanceTop,
    resistanceBottom,
    supportTop,
    supportBottom
  };
  
  // Calculate buy/sell power
  const power = calculatePower(opens, closes, config.length);
  
  // Detect signals
  const signals = detectSignals(highs, lows, channel, config.length);
  
  return {
    channel,
    power,
    signals
  };
}
