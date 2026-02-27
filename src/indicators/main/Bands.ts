/**
 * Band Indicators
 * Bollinger Bands, Keltner Channels, Donchian Channels, ATR Bands
 */

import { calculateSMA } from './MovingAverages';
import { CandleData } from './types';

export type { CandleData };

// ============================================
// Bollinger Bands
// ============================================

export function calculateBollingerBands(data: CandleData[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - sma[i];
      sumSquaredDiff += diff * diff;
    }
    const sd = Math.sqrt(sumSquaredDiff / period);
    
    upper.push(sma[i] + stdDev * sd);
    lower.push(sma[i] - stdDev * sd);
  }
  
  return { middle: sma, upper, lower };
}

export function generateBollingerBandsSeries(data: CandleData[]) {
  const bb = calculateBollingerBands(data);
  
  return [
    {
      name: 'BB Upper',
      type: 'line',
      data: bb.upper,
      lineStyle: { color: '#9C27B0', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    },
    {
      name: 'BB Middle',
      type: 'line',
      data: bb.middle,
      lineStyle: { color: '#9C27B0', width: 1 },
      showSymbol: false,
      z: 1
    },
    {
      name: 'BB Lower',
      type: 'line',
      data: bb.lower,
      lineStyle: { color: '#9C27B0', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    }
  ];
}

// ============================================
// Keltner Channels
// ============================================

function calculateATR(data: CandleData[], period: number = 14): number[] {
  const atr: number[] = [];
  let sum = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      atr.push(NaN);
      continue;
    }
    
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    
    if (i < period) {
      sum += tr;
      atr.push(NaN);
    } else if (i === period) {
      sum += tr;
      atr.push(sum / period);
    } else {
      const newATR = (atr[i - 1] * (period - 1) + tr) / period;
      atr.push(newATR);
    }
  }
  
  return atr;
}

export function calculateKeltnerChannels(data: CandleData[], period: number = 20, multiplier: number = 2) {
  const ema = data.map(d => d.close); // Simplified - should use EMA
  const atr = calculateATR(data, period);
  
  const upper = ema.map((e, i) => e + multiplier * (atr[i] || 0));
  const lower = ema.map((e, i) => e - multiplier * (atr[i] || 0));
  
  return { middle: ema, upper, lower };
}

export function generateKeltnerSeries(data: CandleData[]) {
  const kc = calculateKeltnerChannels(data);
  
  return [
    {
      name: 'Keltner Upper',
      type: 'line',
      data: kc.upper,
      lineStyle: { color: '#00BCD4', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    },
    {
      name: 'Keltner Middle',
      type: 'line',
      data: kc.middle,
      lineStyle: { color: '#00BCD4', width: 1 },
      showSymbol: false,
      z: 1
    },
    {
      name: 'Keltner Lower',
      type: 'line',
      data: kc.lower,
      lineStyle: { color: '#00BCD4', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    }
  ];
}

// ============================================
// Donchian Channels
// ============================================

export function calculateDonchianChannels(data: CandleData[], period: number = 20) {
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      middle.push(NaN);
      continue;
    }
    
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = 0; j < period; j++) {
      highest = Math.max(highest, data[i - j].high);
      lowest = Math.min(lowest, data[i - j].low);
    }
    
    upper.push(highest);
    lower.push(lowest);
    middle.push((highest + lowest) / 2);
  }
  
  return { upper, middle, lower };
}

export function generateDonchianSeries(data: CandleData[]) {
  const dc = calculateDonchianChannels(data);
  
  return [
    {
      name: 'Donchian Upper',
      type: 'line',
      data: dc.upper,
      lineStyle: { color: '#FF5722', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    },
    {
      name: 'Donchian Middle',
      type: 'line',
      data: dc.middle,
      lineStyle: { color: '#FF5722', width: 1 },
      showSymbol: false,
      z: 1
    },
    {
      name: 'Donchian Lower',
      type: 'line',
      data: dc.lower,
      lineStyle: { color: '#FF5722', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    }
  ];
}

// ============================================
// ATR Bands
// ============================================

export function generateATRBandsSeries(data: CandleData[], multiplier: number = 2) {
  const atr = calculateATR(data);
  const sma = calculateSMA(data, 20);
  
  const upper = sma.map((s, i) => s + multiplier * (atr[i] || 0));
  const lower = sma.map((s, i) => s - multiplier * (atr[i] || 0));
  
  return [
    {
      name: 'ATR Band Upper',
      type: 'line',
      data: upper,
      lineStyle: { color: '#FFC107', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    },
    {
      name: 'ATR Band Lower',
      type: 'line',
      data: lower,
      lineStyle: { color: '#FFC107', width: 1, type: 'dashed' },
      showSymbol: false,
      z: 1
    }
  ];
}
