/**
 * Moving Averages Indicators
 * SMA (Simple Moving Average) & EMA (Exponential Moving Average)
 */

import { CandleData } from './types';

// ============================================
// SMA Calculation
// ============================================

export function calculateSMA(data: CandleData[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push(sum / period);
  }
  
  return result;
}

// ============================================
// EMA Calculation
// ============================================

export function calculateEMA(data: CandleData[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i].close;
    result.push(NaN);
  }
  
  if (data.length < period) return result;
  
  result[period - 1] = sum / period;
  
  // Calculate EMA for the rest
  for (let i = period; i < data.length; i++) {
    const ema = (data[i].close - result[i - 1]) * multiplier + result[i - 1];
    result.push(ema);
  }
  
  return result;
}

// ============================================
// ECharts Series Generators
// ============================================

export function generateSMASeries(
  data: CandleData[],
  periods: { sma10?: boolean; sma25?: boolean; sma50?: boolean; sma100?: boolean; sma200?: boolean }
) {
  const series: any[] = [];
  
  if (periods.sma10) {
    const sma10 = calculateSMA(data, 10);
    series.push({
      name: 'SMA 10',
      type: 'line',
      data: sma10,
      smooth: true,
      lineStyle: { color: '#2962FF', width: 1 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.sma25) {
    const sma25 = calculateSMA(data, 25);
    series.push({
      name: 'SMA 25',
      type: 'line',
      data: sma25,
      smooth: true,
      lineStyle: { color: '#FF6D00', width: 1 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.sma50) {
    const sma50 = calculateSMA(data, 50);
    series.push({
      name: 'SMA 50',
      type: 'line',
      data: sma50,
      smooth: true,
      lineStyle: { color: '#00E676', width: 2 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.sma100) {
    const sma100 = calculateSMA(data, 100);
    series.push({
      name: 'SMA 100',
      type: 'line',
      data: sma100,
      smooth: true,
      lineStyle: { color: '#FFAB00', width: 2 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.sma200) {
    const sma200 = calculateSMA(data, 200);
    series.push({
      name: 'SMA 200',
      type: 'line',
      data: sma200,
      smooth: true,
      lineStyle: { color: '#FF1744', width: 2.5 },
      showSymbol: false,
      z: 1
    });
  }
  
  return series;
}

export function generateEMASeries(
  data: CandleData[],
  periods: { ema10?: boolean; ema25?: boolean; ema50?: boolean; ema100?: boolean; ema200?: boolean }
) {
  const series: any[] = [];
  
  if (periods.ema10) {
    const ema10 = calculateEMA(data, 10);
    series.push({
      name: 'EMA 10',
      type: 'line',
      data: ema10,
      smooth: true,
      lineStyle: { color: '#00BCD4', width: 1 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.ema25) {
    const ema25 = calculateEMA(data, 25);
    series.push({
      name: 'EMA 25',
      type: 'line',
      data: ema25,
      smooth: true,
      lineStyle: { color: '#FF9800', width: 1 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.ema50) {
    const ema50 = calculateEMA(data, 50);
    series.push({
      name: 'EMA 50',
      type: 'line',
      data: ema50,
      smooth: true,
      lineStyle: { color: '#4CAF50', width: 2 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.ema100) {
    const ema100 = calculateEMA(data, 100);
    series.push({
      name: 'EMA 100',
      type: 'line',
      data: ema100,
      smooth: true,
      lineStyle: { color: '#FFC107', width: 2 },
      showSymbol: false,
      z: 1
    });
  }
  
  if (periods.ema200) {
    const ema200 = calculateEMA(data, 200);
    series.push({
      name: 'EMA 200',
      type: 'line',
      data: ema200,
      smooth: true,
      lineStyle: { color: '#F44336', width: 2.5 },
      showSymbol: false,
      z: 1
    });
  }
  
  return series;
}
