/**
 * Oscillator Indicators (for sub-charts)
 * RSI, MACD, Stochastic RSI, Williams %R, CCI, ADX, MFI, etc.
 */

import { CandleData } from './types';

// ============================================
// RSI Calculation
// ============================================

export function calculateRSI(data: CandleData[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsi.push(NaN);
      continue;
    }
    
    const change = data[i].close - data[i - 1].close;
    
    if (i <= period) {
      if (change > 0) gains += change;
      else losses += Math.abs(change);
      
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        rsi.push(NaN);
      }
    } else {
      const prevAvgGain = ((rsi[i - 1] / 100) * (period - 1) + (change > 0 ? change : 0)) / period;
      const prevAvgLoss = (((100 - rsi[i - 1]) / 100) * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
      const rs = prevAvgGain / prevAvgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

// ============================================
// MACD Calculation
// ============================================

function calculateEMAForOscillator(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
    result.push(NaN);
  }
  
  if (data.length < period) return result;
  
  result[period - 1] = sum / period;
  
  for (let i = period; i < data.length; i++) {
    const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
    result.push(ema);
  }
  
  return result;
}

export function calculateMACD(data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const closes = data.map(d => d.close);
  
  const fastEMA = calculateEMAForOscillator(closes, fastPeriod);
  const slowEMA = calculateEMAForOscillator(closes, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMAForOscillator(macdLine.filter(v => !isNaN(v)), signalPeriod);
  
  // Align signal line with macd line
  const alignedSignal: number[] = [];
  let signalIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      alignedSignal.push(NaN);
    } else {
      alignedSignal.push(signalLine[signalIndex] || NaN);
      signalIndex++;
    }
  }
  
  const histogram = macdLine.map((macd, i) => macd - (alignedSignal[i] || 0));
  
  return { macdLine, signalLine: alignedSignal, histogram };
}

// ============================================
// Stochastic RSI
// ============================================

export function calculateStochRSI(data: CandleData[], rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
  const rsi = calculateRSI(data, rsiPeriod);
  const stochRSI: number[] = [];
  
  for (let i = 0; i < rsi.length; i++) {
    if (i < stochPeriod - 1) {
      stochRSI.push(NaN);
      continue;
    }
    
    let minRSI = Infinity;
    let maxRSI = -Infinity;
    
    for (let j = 0; j < stochPeriod; j++) {
      const val = rsi[i - j];
      if (!isNaN(val)) {
        minRSI = Math.min(minRSI, val);
        maxRSI = Math.max(maxRSI, val);
      }
    }
    
    if (maxRSI === minRSI) {
      stochRSI.push(0);
    } else {
      stochRSI.push(((rsi[i] - minRSI) / (maxRSI - minRSI)) * 100);
    }
  }
  
  // Simple moving average for %K
  const kLine: number[] = [];
  for (let i = 0; i < stochRSI.length; i++) {
    if (i < kPeriod - 1) {
      kLine.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < kPeriod; j++) {
      sum += stochRSI[i - j] || 0;
    }
    kLine.push(sum / kPeriod);
  }
  
  // Simple moving average for %D
  const dLine: number[] = [];
  for (let i = 0; i < kLine.length; i++) {
    if (i < dPeriod - 1) {
      dLine.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kLine[i - j] || 0;
    }
    dLine.push(sum / dPeriod);
  }
  
  return { k: kLine, d: dLine };
}

// ============================================
// Placeholder for other oscillators
// ============================================

export function calculateOBV(data: CandleData[]): number[] {
  const obv: number[] = [0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) {
      obv.push(obv[i - 1] + (data[i].volume || 0));
    } else if (data[i].close < data[i - 1].close) {
      obv.push(obv[i - 1] - (data[i].volume || 0));
    } else {
      obv.push(obv[i - 1]);
    }
  }
  
  return obv;
}

// TODO: Add remaining oscillators (ADX, MFI, Williams %R, CCI, etc.)
// These will be imported from the old SubIndicatorChart.tsx
