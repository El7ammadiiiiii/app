/**
 * Liquidation Reversal Signals [AlgoAlpha]
 * Based on TradingView indicator by AlgoAlpha
 * 
 * Features:
 * - Z-Score analysis of up/down volume
 * - Supertrend integration
 * - Liquidation spike detection (short & long)
 * - Reversal signals after liquidation events
 * - Dynamic transparency based on Z-score magnitude
 * 
 * Mozilla Public License 2.0
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface LiquidationReversalConfig {
  // Z-Score settings
  zScoreLength: number;      // Lookback for z-score calculation (default: 200)
  zScoreThreshold: number;   // Minimum z-score for liquidation spike (default: 3.0)
  
  // Detection
  timeoutBars: number;       // Max bars between liquidation and Supertrend flip (default: 50)
  
  // Supertrend settings
  supertrendFactor: number;  // ATR multiplier (default: 2)
  supertrendPeriod: number;  // ATR period (default: 10)
  
  // ATR for visual offset
  atrPeriod: number;         // ATR period for visual spacing (default: 14)
  
  // Colors
  colors: {
    bullish: string;         // Bullish color (default: #00ffbb)
    bearish: string;         // Bearish color (default: #ff1100)
  };
}

export interface LiquidationEvent {
  index: number;
  type: 'short' | 'long';
  price: number;
  zScore: number;
  timestamp?: number | string;
}

export interface ReversalSignal {
  index: number;
  type: 'bullish' | 'bearish';
  price: number;
  supertrendValue: number;
  liquidationIndex: number;
  barsSinceLiquidation: number;
}

export interface SupertrendData {
  value: number;
  direction: number;  // 1 = bullish (below price), -1 = bearish (above price)
}

export interface LiquidationReversalResult {
  // Supertrend data
  supertrend: SupertrendData[];
  
  // Current trend state
  currentTrend: 'bullish' | 'bearish' | 'neutral';
  plotTrend: number;  // -1 = bullish visible, 1 = bearish visible, 0 = none
  
  // Liquidation events
  liquidationEvents: LiquidationEvent[];
  shortLiquidations: { index: number; price: number; zScore: number; transparency: number }[];
  longLiquidations: { index: number; price: number; zScore: number; transparency: number }[];
  
  // Reversal signals
  reversalSignals: ReversalSignal[];
  newBullishSignal: boolean;
  newBearishSignal: boolean;
  
  // Z-Score data
  zScoreUp: number[];
  zScoreDown: number[];
  
  // Up/Down volume estimates
  upVolume: number[];
  downVolume: number[];
  
  // ATR values
  atr: number[];
  
  // Candle colors for visualization
  candleColors: string[];
  
  // Warning
  noVolumeWarning: boolean;
}

export const defaultLiquidationReversalConfig: LiquidationReversalConfig = {
  zScoreLength: 200,
  zScoreThreshold: 3.0,
  timeoutBars: 50,
  supertrendFactor: 2,
  supertrendPeriod: 10,
  atrPeriod: 14,
  colors: {
    bullish: '#00ffbb',
    bearish: '#ff1100'
  }
};

/**
 * Calculate Simple Moving Average
 */
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculate Standard Deviation
 */
function stdev(data: number[], period: number): number[] {
  const means = sma(data, period);
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || isNaN(means[i])) {
      result.push(NaN);
      continue;
    }
    
    let sumSqDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j] - means[i];
      sumSqDiff += diff * diff;
    }
    result.push(Math.sqrt(sumSqDiff / period));
  }
  return result;
}

/**
 * Calculate True Range
 */
function trueRange(data: CandleData[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const hl = data[i].high - data[i].low;
      const hc = Math.abs(data[i].high - data[i - 1].close);
      const lc = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  return tr;
}

/**
 * Calculate ATR (Average True Range)
 */
function atr(data: CandleData[], period: number): number[] {
  const tr = trueRange(data);
  const result: number[] = [];
  
  // Use RMA (Wilder's smoothing)
  let atrValue = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    if (i === period - 1) {
      // Initial ATR is SMA of first 'period' TR values
      let sum = 0;
      for (let j = 0; j <= i; j++) {
        sum += tr[j];
      }
      atrValue = sum / period;
    } else {
      // RMA formula
      atrValue = (atrValue * (period - 1) + tr[i]) / period;
    }
    result.push(atrValue);
  }
  return result;
}

/**
 * Calculate Supertrend
 */
function supertrend(data: CandleData[], factor: number, period: number): SupertrendData[] {
  const atrValues = atr(data, period);
  const result: SupertrendData[] = [];
  
  let upperBand = 0;
  let lowerBand = 0;
  let supertrend = 0;
  let direction = 1;  // Start with bullish
  
  for (let i = 0; i < data.length; i++) {
    const hl2 = (data[i].high + data[i].low) / 2;
    const atrVal = atrValues[i];
    
    if (isNaN(atrVal)) {
      result.push({ value: NaN, direction: 0 });
      continue;
    }
    
    const basicUpperBand = hl2 + factor * atrVal;
    const basicLowerBand = hl2 - factor * atrVal;
    
    // Calculate final bands
    if (i === 0 || isNaN(result[i - 1].value)) {
      upperBand = basicUpperBand;
      lowerBand = basicLowerBand;
    } else {
      upperBand = basicUpperBand < upperBand || data[i - 1].close > upperBand 
        ? basicUpperBand : upperBand;
      lowerBand = basicLowerBand > lowerBand || data[i - 1].close < lowerBand 
        ? basicLowerBand : lowerBand;
    }
    
    // Determine direction
    if (i > 0 && !isNaN(result[i - 1].value)) {
      const prevSupertrend = result[i - 1].value;
      const prevDirection = result[i - 1].direction;
      
      if (prevDirection === -1) {
        // Was bearish
        if (data[i].close > upperBand) {
          direction = 1;  // Flip to bullish
          supertrend = lowerBand;
        } else {
          direction = -1;
          supertrend = upperBand;
        }
      } else {
        // Was bullish
        if (data[i].close < lowerBand) {
          direction = -1;  // Flip to bearish
          supertrend = upperBand;
        } else {
          direction = 1;
          supertrend = lowerBand;
        }
      }
    } else {
      // Initial direction based on close vs bands
      if (data[i].close > hl2) {
        direction = 1;
        supertrend = lowerBand;
      } else {
        direction = -1;
        supertrend = upperBand;
      }
    }
    
    result.push({ value: supertrend, direction });
  }
  
  return result;
}

/**
 * Estimate up/down volume from candle data
 * Since we don't have actual up/down volume, we estimate based on candle structure
 */
function estimateUpDownVolume(data: CandleData[]): { up: number[]; down: number[] } {
  const up: number[] = [];
  const down: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const vol = data[i].volume || 0;
    const range = data[i].high - data[i].low;
    
    if (range === 0) {
      up.push(vol / 2);
      down.push(vol / 2);
      continue;
    }
    
    // Estimate based on close position within range
    const closePosition = (data[i].close - data[i].low) / range;
    
    // If close is near high, more up volume; if near low, more down volume
    const upRatio = closePosition;
    const downRatio = 1 - closePosition;
    
    // Also consider if candle is bullish or bearish
    const isBullish = data[i].close > data[i].open;
    const bodyRatio = Math.abs(data[i].close - data[i].open) / range;
    
    let adjustedUpRatio = upRatio;
    let adjustedDownRatio = downRatio;
    
    if (isBullish) {
      adjustedUpRatio = upRatio + bodyRatio * 0.3;
      adjustedDownRatio = downRatio - bodyRatio * 0.3;
    } else {
      adjustedUpRatio = upRatio - bodyRatio * 0.3;
      adjustedDownRatio = downRatio + bodyRatio * 0.3;
    }
    
    // Normalize
    const total = adjustedUpRatio + adjustedDownRatio;
    up.push((adjustedUpRatio / total) * vol);
    down.push((adjustedDownRatio / total) * vol);
  }
  
  return { up, down };
}

/**
 * Calculate Z-Score
 */
function zScore(data: number[], length: number): number[] {
  const means = sma(data, length);
  const stdevs = stdev(data, length);
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(means[i]) || isNaN(stdevs[i]) || stdevs[i] === 0) {
      result.push(NaN);
    } else {
      result.push((data[i] - means[i]) / stdevs[i]);
    }
  }
  
  return result;
}

/**
 * Calculate transparency based on Z-score magnitude
 */
function calculateTransparency(zMag: number, threshold: number): number {
  const transpMax = 70;
  const transpMin = 30;
  const normalized = Math.min(Math.max((zMag - threshold) / 5, 0), 1);
  return Math.round(transpMax - normalized * (transpMax - transpMin));
}

/**
 * Main calculation function
 */
export function calculateLiquidationReversal(
  data: CandleData[],
  config: Partial<LiquidationReversalConfig> = {}
): LiquidationReversalResult {
  const cfg = { ...defaultLiquidationReversalConfig, ...config };
  
  const result: LiquidationReversalResult = {
    supertrend: [],
    currentTrend: 'neutral',
    plotTrend: 0,
    liquidationEvents: [],
    shortLiquidations: [],
    longLiquidations: [],
    reversalSignals: [],
    newBullishSignal: false,
    newBearishSignal: false,
    zScoreUp: [],
    zScoreDown: [],
    upVolume: [],
    downVolume: [],
    atr: [],
    candleColors: [],
    noVolumeWarning: false
  };
  
  if (data.length < cfg.zScoreLength) return result;
  
  // Check for volume data
  const hasVolume = data.some(d => d.volume && d.volume > 0);
  result.noVolumeWarning = !hasVolume;
  
  // Estimate up/down volume
  const { up, down } = estimateUpDownVolume(data);
  result.upVolume = up;
  result.downVolume = down;
  
  // Calculate Z-scores
  result.zScoreUp = zScore(up, cfg.zScoreLength);
  result.zScoreDown = zScore(down, cfg.zScoreLength);
  
  // Calculate Supertrend
  result.supertrend = supertrend(data, cfg.supertrendFactor, cfg.supertrendPeriod);
  
  // Calculate ATR for visual offset
  result.atr = atr(data, cfg.atrPeriod);
  
  // State variables
  let lastLiqDir = 0;
  let lastLiqIndex = 0;
  let valid = 0;
  let plotTrend = 0;
  
  const plotTrendHistory: number[] = [];
  
  // Process each bar
  for (let i = 0; i < data.length; i++) {
    const zU = result.zScoreUp[i];
    const zD = result.zScoreDown[i];
    const st = result.supertrend[i];
    const atrVal = result.atr[i];
    
    // Skip if not enough data
    if (isNaN(zU) || isNaN(zD) || isNaN(st.value)) {
      plotTrendHistory.push(0);
      result.candleColors.push('transparent');
      continue;
    }
    
    // Check for direction change (cross)
    const prevDirection = i > 0 ? result.supertrend[i - 1].direction : st.direction;
    const directionCrossed = i > 0 && st.direction !== prevDirection;
    
    // Detect liquidation spikes
    const shortLiq = st.direction < 0 && zU > cfg.zScoreThreshold;
    const longLiq = st.direction > 0 && zD > cfg.zScoreThreshold;
    
    // Reset plot trend on any direction cross
    if (directionCrossed) {
      plotTrend = 0;
    }
    
    // Check for bullish signal (direction crosses under 0, meaning flips to bullish)
    if (directionCrossed && st.direction > 0 && prevDirection < 0) {
      // Crossunder - direction went from positive to negative in original, 
      // but in our impl, direction > 0 is bullish
      if (lastLiqDir === 1 && valid === 1) {
        if (cfg.timeoutBars === 0 || i - lastLiqIndex < cfg.timeoutBars) {
          plotTrend = 1;  // Bearish trend visible
          result.reversalSignals.push({
            index: i,
            type: 'bearish',
            price: data[i].low,
            supertrendValue: st.value,
            liquidationIndex: lastLiqIndex,
            barsSinceLiquidation: i - lastLiqIndex
          });
        }
      }
      valid = 0;
    }
    
    // Check for bearish signal (direction crosses over 0)
    if (directionCrossed && st.direction < 0 && prevDirection > 0) {
      if (lastLiqDir === -1 && valid === 1) {
        if (cfg.timeoutBars === 0 || i - lastLiqIndex < cfg.timeoutBars) {
          plotTrend = -1;  // Bullish trend visible
          result.reversalSignals.push({
            index: i,
            type: 'bullish',
            price: data[i].high,
            supertrendValue: st.value,
            liquidationIndex: lastLiqIndex,
            barsSinceLiquidation: i - lastLiqIndex
          });
        }
      }
      valid = 0;
    }
    
    // Record liquidation events
    if (shortLiq) {
      lastLiqDir = -1;
      lastLiqIndex = i;
      valid = 1;
      
      const transparency = calculateTransparency(Math.abs(zU), cfg.zScoreThreshold);
      result.shortLiquidations.push({
        index: i,
        price: data[i].high + (atrVal || 0),
        zScore: zU,
        transparency
      });
      
      result.liquidationEvents.push({
        index: i,
        type: 'short',
        price: data[i].high,
        zScore: zU,
        timestamp: data[i].time
      });
    }
    
    if (longLiq) {
      lastLiqDir = 1;
      lastLiqIndex = i;
      valid = 1;
      
      const transparency = calculateTransparency(Math.abs(zD), cfg.zScoreThreshold);
      result.longLiquidations.push({
        index: i,
        price: data[i].low - (atrVal || 0),
        zScore: zD,
        transparency
      });
      
      result.liquidationEvents.push({
        index: i,
        type: 'long',
        price: data[i].low,
        zScore: zD,
        timestamp: data[i].time
      });
    }
    
    plotTrendHistory.push(plotTrend);
    
    // Determine candle color
    if (plotTrend === -1) {
      result.candleColors.push(cfg.colors.bearish + '80');  // Bearish with some transparency
    } else if (plotTrend === 1) {
      result.candleColors.push(cfg.colors.bullish + '80');  // Bullish with some transparency
    } else {
      result.candleColors.push('transparent');
    }
  }
  
  // Set final state
  result.plotTrend = plotTrend;
  
  if (plotTrend === -1) {
    result.currentTrend = 'bullish';
  } else if (plotTrend === 1) {
    result.currentTrend = 'bearish';
  } else {
    result.currentTrend = 'neutral';
  }
  
  // Check for new signals on last bar
  if (plotTrendHistory.length >= 2) {
    const lastPlot = plotTrendHistory[plotTrendHistory.length - 1];
    const prevPlot = plotTrendHistory[plotTrendHistory.length - 2];
    
    result.newBullishSignal = lastPlot === -1 && prevPlot !== -1;
    result.newBearishSignal = lastPlot === 1 && prevPlot !== 1;
  }
  
  return result;
}

/**
 * Get color with transparency for liquidation dots
 */
export function getLiquidationColor(
  type: 'short' | 'long',
  transparency: number,
  config: Partial<LiquidationReversalConfig> = {}
): string {
  const cfg = { ...defaultLiquidationReversalConfig, ...config };
  const baseColor = type === 'short' ? cfg.colors.bullish : cfg.colors.bearish;
  
  // Convert transparency (30-70) to hex alpha (0-255)
  const alpha = Math.round((1 - transparency / 100) * 255);
  const alphaHex = alpha.toString(16).padStart(2, '0');
  
  return baseColor + alphaHex;
}

/**
 * Get signal description
 */
export function getSignalDescription(signal: ReversalSignal): string {
  if (signal.type === 'bullish') {
    return `Bullish reversal after ${signal.barsSinceLiquidation} bars from short liquidation`;
  } else {
    return `Bearish reversal after ${signal.barsSinceLiquidation} bars from long liquidation`;
  }
}

export default calculateLiquidationReversal;
