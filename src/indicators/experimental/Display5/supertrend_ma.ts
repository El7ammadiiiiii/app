// Converted to TypeScript for Display 5 Models

/**
 * SuperTrended Moving Averages (ST MA)
 * 
 * Combines any moving average type with SuperTrend indicator logic
 * to create dynamic support/resistance bands that adapt to volatility.
 * 
 * Components:
 * 1. Moving Average: Choice of 11 different MA types
 * 2. ATR Bands: Upper and lower bands based on ATR multiplier
 * 3. Trend Detection: Identifies bullish/bearish trends
 * 4. Buy/Sell Signals: Generated on trend reversals
 * 
 * MA Types Available:
 * - SMA: Simple Moving Average
 * - EMA: Exponential Moving Average
 * - WMA: Weighted Moving Average
 * - DEMA: Double Exponential Moving Average
 * - TMA: Triangular Moving Average
 * - VAR: Variable Index Dynamic Average
 * - WWMA: Welles Wilder Moving Average
 * - ZLEMA: Zero Lag Exponential Moving Average
 * - TSF: Time Series Forecast
 * - HULL: Hull Moving Average
 * - TILL: Tillson T3 Moving Average
 * 
 * Trading Signals:
 * - Buy: When trend changes from down to up (close > lower band)
 * - Sell: When trend changes from up to down (close < upper band)
 */

export type MAType = 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TMA' | 'VAR' | 'WWMA' | 'ZLEMA' | 'TSF' | 'HULL' | 'TILL';

export interface SuperTrendMAConfig {
  maType: MAType;              // Moving average type
  length: number;              // MA length (default: 100)
  atrPeriod: number;           // ATR period (default: 10)
  atrMultiplier: number;       // ATR multiplier (default: 0.5)
  useStandardATR: boolean;     // Use standard ATR vs SMA of TR
  tillsonVolumeFactor: number; // T3 volume factor (0.7 default)
  showSignals: boolean;        // Show buy/sell labels
  highlighting: boolean;       // Show trend fill areas
}

export const defaultSuperTrendMAConfig: SuperTrendMAConfig = {
  maType: 'EMA',
  length: 100,
  atrPeriod: 10,
  atrMultiplier: 0.5,
  useStandardATR: true,
  tillsonVolumeFactor: 0.7,
  showSignals: false,
  highlighting: true,
};

export interface SuperTrendMAResult {
  ma: (number | null)[];
  upperBand: (number | null)[];
  lowerBand: (number | null)[];
  trend: (1 | -1)[];           // 1 = uptrend, -1 = downtrend
  buySignals: number[];        // Indices of buy signals
  sellSignals: number[];       // Indices of sell signals
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += data[i];
  }
  ema /= period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * Calculate Weighted Moving Average
 */
function calculateWMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weightSum = (period * (period + 1)) / 2;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j] * (period - j);
      }
      result.push(sum / weightSum);
    }
  }
  
  return result;
}

/**
 * Calculate Variable Index Dynamic Average (VAR)
 */
function calculateVAR(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const alpha = 2 / (period + 1);
  let var_val = data[0];
  
  for (let i = 0; i < data.length; i++) {
    if (i < 9) {
      result.push(null);
      continue;
    }
    
    // Calculate CMO
    let ud = 0, dd = 0;
    for (let j = 0; j < 9; j++) {
      const idx = i - j;
      if (data[idx] > data[idx - 1]) {
        ud += data[idx] - data[idx - 1];
      } else {
        dd += data[idx - 1] - data[idx];
      }
    }
    
    const cmo = ud + dd > 0 ? (ud - dd) / (ud + dd) : 0;
    var_val = alpha * Math.abs(cmo) * data[i] + (1 - alpha * Math.abs(cmo)) * var_val;
    result.push(var_val);
  }
  
  return result;
}

/**
 * Calculate Hull Moving Average
 */
function calculateHMA(data: number[], period: number): (number | null)[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.round(Math.sqrt(period));
  
  const wma1 = calculateWMA(data, halfPeriod);
  const wma2 = calculateWMA(data, period);
  
  const rawHMA: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (wma1[i] !== null && wma2[i] !== null) {
      rawHMA.push(2 * wma1[i]! - wma2[i]!);
    } else {
      rawHMA.push(0);
    }
  }
  
  return calculateWMA(rawHMA, sqrtPeriod);
}

/**
 * Calculate Tillson T3 Moving Average
 */
function calculateT3(data: number[], period: number, volumeFactor: number): (number | null)[] {
  const e1 = calculateEMA(data, period);
  const e2 = calculateEMA(e1.map(v => v ?? 0), period);
  const e3 = calculateEMA(e2.map(v => v ?? 0), period);
  const e4 = calculateEMA(e3.map(v => v ?? 0), period);
  const e5 = calculateEMA(e4.map(v => v ?? 0), period);
  const e6 = calculateEMA(e5.map(v => v ?? 0), period);
  
  const a = volumeFactor;
  const c1 = -a * a * a;
  const c2 = 3 * a * a + 3 * a * a * a;
  const c3 = -6 * a * a - 3 * a - 3 * a * a * a;
  const c4 = 1 + 3 * a + a * a * a + 3 * a * a;
  
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (e3[i] !== null && e4[i] !== null && e5[i] !== null && e6[i] !== null) {
      result.push(c1 * e6[i]! + c2 * e5[i]! + c3 * e4[i]! + c4 * e3[i]!);
    } else {
      result.push(null);
    }
  }
  
  return result;
}

/**
 * Calculate moving average based on type
 */
function calculateMA(data: number[], period: number, type: MAType, config: SuperTrendMAConfig): (number | null)[] {
  switch (type) {
    case 'SMA':
      return calculateSMA(data, period);
    case 'EMA':
      return calculateEMA(data, period);
    case 'WMA':
      return calculateWMA(data, period);
    case 'DEMA': {
      const ema1 = calculateEMA(data, period);
      const ema2 = calculateEMA(ema1.map(v => v ?? 0), period);
      return ema1.map((v, i) => v !== null && ema2[i] !== null ? 2 * v - ema2[i]! : null);
    }
    case 'TMA': {
      const halfPeriod = Math.ceil(period / 2);
      const sma1 = calculateSMA(data, halfPeriod);
      return calculateSMA(sma1.map(v => v ?? 0), Math.floor(period / 2) + 1);
    }
    case 'VAR':
      return calculateVAR(data, period);
    case 'WWMA': {
      const alpha = 1 / period;
      const result: (number | null)[] = [];
      let wwma = data[0];
      for (let i = 0; i < data.length; i++) {
        wwma = alpha * data[i] + (1 - alpha) * wwma;
        result.push(wwma);
      }
      return result;
    }
    case 'ZLEMA': {
      const lag = period % 2 === 0 ? period / 2 : (period - 1) / 2;
      const zdata: number[] = [];
      for (let i = 0; i < data.length; i++) {
        zdata.push(i >= lag ? data[i] + (data[i] - data[i - lag]) : data[i]);
      }
      return calculateEMA(zdata, period);
    }
    case 'TSF': {
      const result: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
        } else {
          // Linear regression forecast
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
          for (let j = 0; j < period; j++) {
            const x = j;
            const y = data[i - period + 1 + j];
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
          }
          const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / period;
          result.push(intercept + slope * period);
        }
      }
      return result;
    }
    case 'HULL':
      return calculateHMA(data, period);
    case 'TILL':
      return calculateT3(data, period, config.tillsonVolumeFactor);
    default:
      return calculateEMA(data, period);
  }
}

/**
 * Calculate ATR
 */
function calculateATR(highs: number[], lows: number[], closes: number[], period: number, useStandard: boolean): (number | null)[] {
  const tr: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      tr.push(highs[i] - lows[i]);
    } else {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  
  if (useStandard) {
    return calculateEMA(tr, period);
  } else {
    return calculateSMA(tr, period);
  }
}

/**
 * Calculate SuperTrend MA
 */
export function calculateSuperTrendMA(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  config: SuperTrendMAConfig = defaultSuperTrendMAConfig
): SuperTrendMAResult {
  const length = closes.length;
  const ma = calculateMA(closes, config.length, config.maType, config);
  const atr = calculateATR(highs, lows, closes, config.atrPeriod, config.useStandardATR);
  
  const upperBand: (number | null)[] = [];
  const lowerBand: (number | null)[] = [];
  const trend: (1 | -1)[] = [];
  const buySignals: number[] = [];
  const sellSignals: number[] = [];
  
  let up = 0, dn = 0;
  let currentTrend: 1 | -1 = 1;
  
  for (let i = 0; i < length; i++) {
    if (ma[i] === null || atr[i] === null) {
      upperBand.push(null);
      lowerBand.push(null);
      trend.push(1);
      continue;
    }
    
    const basicUp = ma[i]! - config.atrMultiplier * atr[i]!;
    const basicDn = ma[i]! + config.atrMultiplier * atr[i]!;
    
    if (i === 0) {
      up = basicUp;
      dn = basicDn;
    } else {
      up = closes[i - 1] > up ? Math.max(basicUp, up) : basicUp;
      dn = closes[i - 1] < dn ? Math.min(basicDn, dn) : basicDn;
    }
    
    // Determine trend
    if (i > 0) {
      if (currentTrend === -1 && closes[i] > dn) {
        currentTrend = 1;
        buySignals.push(i);
      } else if (currentTrend === 1 && closes[i] < up) {
        currentTrend = -1;
        sellSignals.push(i);
      }
    }
    
    trend.push(currentTrend);
    upperBand.push(currentTrend === 1 ? up : null);
    lowerBand.push(currentTrend === -1 ? dn : null);
  }
  
  return { ma, upperBand, lowerBand, trend, buySignals, sellSignals };
}
