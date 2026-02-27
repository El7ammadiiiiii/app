/**
 * Log Regression Oscillator Channel [BigBeluga]
 * Converted from Pine Script
 * 
 * This indicator combines:
 * - Logarithmic Regression Channel
 * - Oscillator (RSI, Stochastic, Stochastic RSI, MFI) overlaid on the channel
 * - Signal line for the oscillator
 */

import type { CandleData } from "@/components/charts/types";

export interface LogRegressionChannel {
  upperLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  midLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  lowerLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  slope: number;
}

export interface OscillatorData {
  values: number[];
  signalLine: number[];
  scaledValues: { index: number; price: number }[]; // Oscillator mapped to channel
  scaledSignal: { index: number; price: number }[];
  type: 'RSI' | 'STOCHASTIC' | 'STOCHASTIC RSI' | 'MFI';
}

export interface LogRegressionOscResult {
  channel: LogRegressionChannel;
  oscillator: OscillatorData;
  upperThreshold: number;
  lowerThreshold: number;
}

export interface LogRegressionOscConfig {
  lookbackPeriod: number;
  channelWidth: number;
  showMidLine: boolean;
  fillBackground: boolean;
  oscillatorType: 'RSI' | 'STOCHASTIC' | 'STOCHASTIC RSI' | 'MFI';
  oscillatorLength: number;
  upperThreshold: number;
  showSignalLine: boolean;
  signalLength: number;
  colors: {
    upperLine: string;
    midLine: string;
    lowerLine: string;
    oscillator: string;
    signal: string;
  };
}

export const defaultLogRegressionOscConfig: LogRegressionOscConfig = {
  lookbackPeriod: 150,
  channelWidth: 1.5,
  showMidLine: true,
  fillBackground: true,
  oscillatorType: 'RSI',
  oscillatorLength: 14,
  upperThreshold: 70,
  showSignalLine: true,
  signalLength: 14,
  colors: {
    upperLine: '#a7abb9',
    midLine: '#808080',
    lowerLine: '#a7abb9',
    oscillator: '#7e57c2',
    signal: '#ffff00'
  }
};

/**
 * Calculate logarithmic regression
 */
function calculateLogRegression(closes: number[], length: number): { slope: number; intercept: number } {
  let sumX = 0;
  let sumY = 0;
  let sumXSqr = 0;
  let sumXY = 0;

  for (let i = 0; i < length; i++) {
    const val = Math.log(closes[i]);
    const per = i + 1;
    sumX += per;
    sumY += val;
    sumXSqr += per * per;
    sumXY += val * per;
  }

  const slope = (length * sumXY - sumX * sumY) / (length * sumXSqr - sumX * sumX);
  const intercept = (sumY - slope * sumX) / length;

  return { slope, intercept };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(data: number[], length: number): number {
  if (length <= 0) return 0;
  
  const mean = data.slice(0, length).reduce((sum, val) => sum + val, 0) / length;
  const variance = data.slice(0, length).reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate RSI
 */
function calculateRSI(closes: number[], length: number): number[] {
  const rsi: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < length) {
      rsi.push(NaN);
      continue;
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let j = 1; j <= length; j++) {
      const change = closes[i - j + 1] - closes[i - j];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / length;
    const avgLoss = losses / length;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

/**
 * Calculate Stochastic
 */
function calculateStochastic(data: CandleData[], length: number): number[] {
  const stoch: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      stoch.push(NaN);
      continue;
    }
    
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = 0; j < length; j++) {
      const idx = i - j;
      if (data[idx].high > highest) highest = data[idx].high;
      if (data[idx].low < lowest) lowest = data[idx].low;
    }
    
    const close = data[i].close;
    const range = highest - lowest;
    
    if (range === 0) {
      stoch.push(50);
    } else {
      stoch.push(((close - lowest) / range) * 100);
    }
  }
  
  return stoch;
}

/**
 * Calculate Stochastic RSI
 */
function calculateStochasticRSI(closes: number[], length: number): number[] {
  const rsi = calculateRSI(closes, length);
  const stochRSI: number[] = [];
  
  for (let i = 0; i < rsi.length; i++) {
    if (i < length - 1 || isNaN(rsi[i])) {
      stochRSI.push(NaN);
      continue;
    }
    
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = 0; j < length; j++) {
      const idx = i - j;
      if (!isNaN(rsi[idx])) {
        if (rsi[idx] > highest) highest = rsi[idx];
        if (rsi[idx] < lowest) lowest = rsi[idx];
      }
    }
    
    const range = highest - lowest;
    
    if (range === 0) {
      stochRSI.push(50);
    } else {
      stochRSI.push(((rsi[i] - lowest) / range) * 100);
    }
  }
  
  // Apply 3-period SMA
  const smoothed: number[] = [];
  for (let i = 0; i < stochRSI.length; i++) {
    if (i < 2 || isNaN(stochRSI[i])) {
      smoothed.push(stochRSI[i]);
    } else {
      const sum = stochRSI[i] + stochRSI[i - 1] + stochRSI[i - 2];
      smoothed.push(sum / 3);
    }
  }
  
  return smoothed;
}

/**
 * Calculate MFI (Money Flow Index)
 */
function calculateMFI(data: CandleData[], length: number): number[] {
  const mfi: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length) {
      mfi.push(NaN);
      continue;
    }
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let j = 1; j <= length; j++) {
      const idx = i - j + 1;
      const prevIdx = idx - 1;
      
      const typicalPrice = (data[idx].high + data[idx].low + data[idx].close) / 3;
      const prevTypicalPrice = (data[prevIdx].high + data[prevIdx].low + data[prevIdx].close) / 3;
      const rawMoneyFlow = typicalPrice * (data[idx].volume ?? 0);
      
      if (typicalPrice > prevTypicalPrice) {
        positiveFlow += rawMoneyFlow;
      } else if (typicalPrice < prevTypicalPrice) {
        negativeFlow += rawMoneyFlow;
      }
    }
    
    if (negativeFlow === 0) {
      mfi.push(100);
    } else {
      const moneyFlowRatio = positiveFlow / negativeFlow;
      mfi.push(100 - (100 / (1 + moneyFlowRatio)));
    }
  }
  
  return mfi;
}

/**
 * Calculate SMA
 */
function calculateSMA(data: number[], length: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1 || isNaN(data[i])) {
      sma.push(NaN);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    
    for (let j = 0; j < length; j++) {
      if (!isNaN(data[i - j])) {
        sum += data[i - j];
        count++;
      }
    }
    
    sma.push(count > 0 ? sum / count : NaN);
  }
  
  return sma;
}

/**
 * Calculate Log Regression Oscillator Channel
 */
export function calculateLogRegressionOscillator(
  data: CandleData[],
  config: LogRegressionOscConfig = defaultLogRegressionOscConfig
): LogRegressionOscResult {
  const length = Math.min(config.lookbackPeriod, data.length);
  const closes = data.slice(-length).reverse().map(d => d.close);
  
  // Calculate logarithmic regression
  const { slope, intercept } = calculateLogRegression(closes, length);
  
  // Calculate regression line endpoints
  const regStart = Math.exp(intercept + slope * length);
  const regEnd = Math.exp(intercept);
  
  // Calculate deviation for channel width
  const deviation = calculateStdDev(closes, length);
  
  // Calculate channel boundaries
  const upperStart = regStart + deviation * config.channelWidth;
  const upperEnd = regEnd + deviation * config.channelWidth;
  const lowerStart = regStart - deviation * config.channelWidth;
  const lowerEnd = regEnd - deviation * config.channelWidth;
  
  const startIndex = data.length - length;
  const endIndex = data.length - 1;
  
  const channel: LogRegressionChannel = {
    upperLine: { startIndex, startPrice: upperStart, endIndex, endPrice: upperEnd },
    midLine: { startIndex, startPrice: regStart, endIndex, endPrice: regEnd },
    lowerLine: { startIndex, startPrice: lowerStart, endIndex, endPrice: lowerEnd },
    slope: (regStart - regEnd) / length
  };
  
  // Calculate oscillator
  let oscillatorValues: number[] = [];
  const allCloses = data.map(d => d.close);
  
  switch (config.oscillatorType) {
    case 'RSI':
      oscillatorValues = calculateRSI(allCloses, config.oscillatorLength);
      break;
    case 'STOCHASTIC':
      oscillatorValues = calculateStochastic(data, config.oscillatorLength);
      break;
    case 'STOCHASTIC RSI':
      oscillatorValues = calculateStochasticRSI(allCloses, config.oscillatorLength);
      break;
    case 'MFI':
      oscillatorValues = calculateMFI(data, config.oscillatorLength);
      break;
  }
  
  // Calculate signal line
  const signalLine = calculateSMA(oscillatorValues, config.signalLength);
  
  // Map oscillator values to channel prices
  const lowerThreshold = 100 - config.upperThreshold;
  const step = (upperEnd - lowerEnd) / (config.upperThreshold - lowerThreshold);
  
  const scaledValues: { index: number; price: number }[] = [];
  const scaledSignal: { index: number; price: number }[] = [];
  
  for (let i = 0; i < length; i++) {
    const dataIdx = data.length - length + i;
    const oscValue = oscillatorValues[dataIdx];
    const sigValue = signalLine[dataIdx];
    
    if (!isNaN(oscValue)) {
      const val = oscValue - lowerThreshold;
      const lower = lowerEnd + channel.slope * i;
      const price = lower + step * val;
      
      scaledValues.push({ index: dataIdx, price });
    }
    
    if (!isNaN(sigValue)) {
      const val = sigValue - lowerThreshold;
      const lower = lowerEnd + channel.slope * i;
      const price = lower + step * val;
      
      scaledSignal.push({ index: dataIdx, price });
    }
  }
  
  return {
    channel,
    oscillator: {
      values: oscillatorValues,
      signalLine,
      scaledValues,
      scaledSignal,
      type: config.oscillatorType
    },
    upperThreshold: config.upperThreshold,
    lowerThreshold
  };
}
