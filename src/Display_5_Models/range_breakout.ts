// Range Breakout [BigBeluga]
// License: CC BY-NC-SA 4.0 - https://creativecommons.org/licenses/by-nc-sa/4.0/
// © BigBeluga
//
// TypeScript implementation for Next.js/ECharts
// Dynamic ATR-based channel system with breakout and retest signals

export interface RangeBreakoutConfig {
  channelWidth: number;        // ATR multiplier for channel width (default: 4)
  showFakeouts: boolean;        // Show X fakeout signals (default: false)
  filterSignals: boolean;       // Filter ▲▼ signals by trend (default: false)
  atrPeriod: number;            // ATR calculation period (default: 200)
  atrSmoothing: number;         // ATR smoothing period (default: 100)
  initBar: number;              // Bar index to initialize channel (default: 301)
  resetThreshold: number;       // Bars outside channel before reset (default: 100)
}

export interface ChannelState {
  center: number;
  upper: number;
  lower: number;
  upperMid: number;
  lowerMid: number;
  barsOutside: number;
  trend: 'bullish' | 'bearish';
  startIndex: number;
}

export interface Signal {
  index: number;
  price: number;
  type: 'bullish_breakout' | 'bearish_breakout' | 'buy' | 'sell' | 'fakeout_up' | 'fakeout_down';
}

export interface RangeBreakoutResult {
  channels: ChannelState[];           // Array of all channel states (one per bar)
  signals: Signal[];                  // All detected signals
  currentTrend: 'bullish' | 'bearish';
  activeChannel: ChannelState;        // Current channel values
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const atr: number[] = [];
  
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      atr.push(highs[i] - lows[i]);
    } else {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      
      if (i < period) {
        // Simple average for initial period
        const sum = atr.reduce((a, b) => a + b, 0) + tr;
        atr.push(sum / (i + 1));
      } else {
        // Wilder's smoothing
        const prevATR = atr[i - 1];
        atr.push((prevATR * (period - 1) + tr) / period);
      }
    }
  }
  
  return atr;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i]); // Not enough data yet
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

/**
 * Detect Range Breakout with ATR-based channels
 */
export function calculateRangeBreakout(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<RangeBreakoutConfig> = {}
): RangeBreakoutResult {
  const cfg: RangeBreakoutConfig = {
    channelWidth: config.channelWidth ?? 4,
    showFakeouts: config.showFakeouts ?? false,
    filterSignals: config.filterSignals ?? false,
    atrPeriod: config.atrPeriod ?? 200,
    atrSmoothing: config.atrSmoothing ?? 100,
    initBar: config.initBar ?? 301,
    resetThreshold: config.resetThreshold ?? 100
  };

  const channels: ChannelState[] = [];
  const signals: Signal[] = [];
  
  // Calculate ATR and smooth it
  const atr = calculateATR(highs, lows, closes, cfg.atrPeriod);
  const smoothedATR = calculateSMA(atr, cfg.atrSmoothing);
  
  // Channel state variables
  let value: number | null = null;
  let valueUpper: number | null = null;
  let valueLower: number | null = null;
  let valueUpperMid: number | null = null;
  let valueLowerMid: number | null = null;
  let trend: 'bullish' | 'bearish' = 'bullish';
  let barsOutside = 0;
  let channelStartIndex = 0;
  
  for (let i = 0; i < highs.length; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    const atrValue = smoothedATR[i] * cfg.channelWidth;
    
    // Initialize channel at specified bar
    if (i === cfg.initBar && value === null) {
      value = hl2;
      valueUpper = hl2 + atrValue;
      valueLower = hl2 - atrValue;
      valueUpperMid = (value + valueUpper) / 2;
      valueLowerMid = (value + valueLower) / 2;
      channelStartIndex = i;
    }
    
    // Skip if not initialized yet
    if (value === null || valueUpper === null || valueLower === null) {
      channels.push({
        center: hl2,
        upper: hl2 + atrValue,
        lower: hl2 - atrValue,
        upperMid: hl2 + atrValue / 2,
        lowerMid: hl2 - atrValue / 2,
        barsOutside: 0,
        trend: 'bullish',
        startIndex: i
      });
      continue;
    }
    
    // Check for breakouts
    const prevLow = i > 0 ? lows[i - 1] : lows[i];
    const prevHigh = i > 0 ? highs[i - 1] : highs[i];
    
    const crossUpper = prevLow <= valueUpper && lows[i] > valueUpper;
    const crossLower = prevHigh >= valueLower && highs[i] < valueLower;
    
    // Count bars outside channel
    if (lows[i] > valueUpper || highs[i] < valueLower) {
      barsOutside++;
    }
    
    // Detect signals before potential reset
    const channelUnchanged = i > 0 && 
      value === channels[i - 1]?.center &&
      valueUpper === channels[i - 1]?.upper &&
      valueLower === channels[i - 1]?.lower;
    
    if (channelUnchanged && valueUpperMid !== null && valueLowerMid !== null) {
      // Buy signal: low crosses above lower mid
      if (i >= 10 && prevLow <= valueLowerMid && lows[i] > valueLowerMid) {
        const low10Ago = i >= 10 ? lows[i - 10] : lows[0];
        if (low10Ago > valueLowerMid) {
          if (!cfg.filterSignals || trend === 'bullish') {
            signals.push({
              index: i,
              price: lows[i],
              type: 'buy'
            });
          }
        }
      }
      
      // Sell signal: high crosses below upper mid
      if (i >= 10 && prevHigh >= valueUpperMid && highs[i] < valueUpperMid) {
        const high10Ago = i >= 10 ? highs[i - 10] : highs[0];
        if (high10Ago < valueUpperMid) {
          if (!cfg.filterSignals || trend === 'bearish') {
            signals.push({
              index: i,
              price: highs[i],
              type: 'sell'
            });
          }
        }
      }
      
      // Fakeout signals
      if (cfg.showFakeouts) {
        // Fakeout up: high crosses below upper boundary
        if (prevHigh >= valueUpper && highs[i] < valueUpper) {
          signals.push({
            index: i,
            price: highs[i],
            type: 'fakeout_up'
          });
        }
        
        // Fakeout down: low crosses above lower boundary
        if (prevLow <= valueLower && lows[i] > valueLower) {
          signals.push({
            index: i,
            price: lows[i],
            type: 'fakeout_down'
          });
        }
      }
    }
    
    // Reset channel on breakout or threshold
    if (crossUpper || crossLower || barsOutside >= cfg.resetThreshold) {
      // Record breakout signals
      if (crossUpper) {
        trend = 'bullish';
        signals.push({
          index: i,
          price: valueUpper,
          type: 'bullish_breakout'
        });
      }
      
      if (crossLower) {
        trend = 'bearish';
        signals.push({
          index: i,
          price: valueLower,
          type: 'bearish_breakout'
        });
      }
      
      // Reset channel
      barsOutside = 0;
      value = hl2;
      valueUpper = hl2 + atrValue;
      valueLower = hl2 - atrValue;
      valueUpperMid = (value + valueUpper) / 2;
      valueLowerMid = (value + valueLower) / 2;
      channelStartIndex = i;
    }
    
    // Store channel state
    channels.push({
      center: value,
      upper: valueUpper,
      lower: valueLower,
      upperMid: valueUpperMid ?? (value + valueUpper) / 2,
      lowerMid: valueLowerMid ?? (value + valueLower) / 2,
      barsOutside: barsOutside,
      trend: trend,
      startIndex: channelStartIndex
    });
  }
  
  const lastChannel = channels[channels.length - 1] || {
    center: closes[closes.length - 1],
    upper: closes[closes.length - 1],
    lower: closes[closes.length - 1],
    upperMid: closes[closes.length - 1],
    lowerMid: closes[closes.length - 1],
    barsOutside: 0,
    trend: 'bullish' as const,
    startIndex: 0
  };
  
  return {
    channels,
    signals,
    currentTrend: lastChannel.trend,
    activeChannel: lastChannel
  };
}
