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

// ============================================
// ADX - Average Directional Index
// ============================================

export function calculateADX(data: CandleData[], period: number = 14): { adx: number[], pdi: number[], mdi: number[] } {
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
      plusDM.push(0);
      minusDM.push(0);
      continue;
    }
    
    const highDiff = data[i].high - data[i - 1].high;
    const lowDiff = data[i - 1].low - data[i].low;
    
    tr.push(Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    ));
    
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }
  
  const smoothTR = smoothedMA(tr, period);
  const smoothPlusDM = smoothedMA(plusDM, period);
  const smoothMinusDM = smoothedMA(minusDM, period);
  
  const pdi: number[] = [];
  const mdi: number[] = [];
  const dx: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const plusDI = smoothTR[i] !== 0 ? (smoothPlusDM[i] / smoothTR[i]) * 100 : 0;
    const minusDI = smoothTR[i] !== 0 ? (smoothMinusDM[i] / smoothTR[i]) * 100 : 0;
    pdi.push(plusDI);
    mdi.push(minusDI);
    
    const sum = plusDI + minusDI;
    dx.push(sum !== 0 ? (Math.abs(plusDI - minusDI) / sum) * 100 : 0);
  }
  
  const adx = smoothedMA(dx, period);
  
  return { adx, pdi, mdi };
}

function smoothedMA(data: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      sum += data[i];
      result.push(sum / (i + 1));
    } else {
      const smoothed = result[i - 1] - (result[i - 1] / period) + data[i];
      result.push(smoothed);
    }
  }
  
  return result;
}

// ============================================
// MFI - Money Flow Index
// ============================================

export function calculateMFI(data: CandleData[], period: number = 14): number[] {
  const mfi: number[] = [];
  const typicalPrices: number[] = [];
  const rawMoneyFlow: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    typicalPrices.push(tp);
    rawMoneyFlow.push(tp * (data[i].volume || 1));
  }
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      mfi.push(NaN);
      continue;
    }
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negativeFlow += rawMoneyFlow[j];
      }
    }
    
    const ratio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow;
    mfi.push(100 - (100 / (1 + ratio)));
  }
  
  return mfi;
}

// ============================================
// Williams %R
// ============================================

export function calculateWilliamsR(data: CandleData[], period: number = 14): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > highest) highest = data[j].high;
      if (data[j].low < lowest) lowest = data[j].low;
    }
    
    const wr = ((highest - data[i].close) / (highest - lowest)) * -100;
    result.push(wr);
  }
  
  return result;
}

// ============================================
// CCI - Commodity Channel Index
// ============================================

export function calculateCCI(data: CandleData[], period: number = 20): number[] {
  const result: number[] = [];
  const typicalPrices: number[] = data.map(d => (d.high + d.low + d.close) / 3);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += typicalPrices[j];
    }
    const sma = sum / period;
    
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDev += Math.abs(typicalPrices[j] - sma);
    }
    meanDev /= period;
    
    const cci = meanDev !== 0 ? (typicalPrices[i] - sma) / (0.015 * meanDev) : 0;
    result.push(cci);
  }
  
  return result;
}

// ============================================
// ROC - Rate of Change
// ============================================

export function calculateROC(data: CandleData[], period: number = 12): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    const roc = ((data[i].close - data[i - period].close) / data[i - period].close) * 100;
    result.push(roc);
  }
  
  return result;
}

// ============================================
// Ultimate Oscillator
// ============================================

export function calculateUltimateOscillator(data: CandleData[], period1 = 7, period2 = 14, period3 = 28): number[] {
  const result: number[] = [];
  const bp: number[] = [];
  const tr: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      bp.push(0);
      tr.push(data[i].high - data[i].low);
      result.push(NaN);
      continue;
    }
    
    const prevClose = data[i - 1].close;
    bp.push(data[i].close - Math.min(data[i].low, prevClose));
    tr.push(Math.max(data[i].high, prevClose) - Math.min(data[i].low, prevClose));
  }
  
  for (let i = 0; i < data.length; i++) {
    if (i < period3) {
      result.push(NaN);
      continue;
    }
    
    const avg1 = sumRange(bp, i - period1 + 1, i) / sumRange(tr, i - period1 + 1, i);
    const avg2 = sumRange(bp, i - period2 + 1, i) / sumRange(tr, i - period2 + 1, i);
    const avg3 = sumRange(bp, i - period3 + 1, i) / sumRange(tr, i - period3 + 1, i);
    
    const uo = 100 * ((4 * avg1) + (2 * avg2) + avg3) / 7;
    result.push(uo);
  }
  
  return result;
}

function sumRange(arr: number[], start: number, end: number): number {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += arr[i] || 0;
  }
  return sum;
}

// ============================================
// CMF - Chaikin Money Flow
// ============================================

export function calculateCMF(data: CandleData[], period: number = 20): number[] {
  const result: number[] = [];
  const mfv: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const range = data[i].high - data[i].low;
    const mfMultiplier = range !== 0 ? ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / range : 0;
    mfv.push(mfMultiplier * (data[i].volume || 1));
  }
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let sumMFV = 0;
    let sumVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumMFV += mfv[j];
      sumVol += data[j].volume || 1;
    }
    
    result.push(sumVol !== 0 ? sumMFV / sumVol : 0);
  }
  
  return result;
}

// ============================================
// Force Index
// ============================================

export function calculateForceIndex(data: CandleData[], period: number = 13): number[] {
  const forceRaw: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      forceRaw.push(0);
      continue;
    }
    forceRaw.push((data[i].close - data[i - 1].close) * (data[i].volume || 1));
  }
  
  return calculateEMA(forceRaw, period);
}

function calculateEMA(data: number[], period: number): number[] {
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

// ============================================
// Choppiness Index
// ============================================

export function calculateChoppiness(data: CandleData[], period: number = 14): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    let atrSum = 0;
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      const tr = Math.max(
        data[j].high - data[j].low,
        j > 0 ? Math.abs(data[j].high - data[j - 1].close) : 0,
        j > 0 ? Math.abs(data[j].low - data[j - 1].close) : 0
      );
      atrSum += tr;
      if (data[j].high > highest) highest = data[j].high;
      if (data[j].low < lowest) lowest = data[j].low;
    }
    
    const range = highest - lowest;
    const chop = range !== 0 ? 100 * Math.log10(atrSum / range) / Math.log10(period) : 50;
    result.push(chop);
  }
  
  return result;
}

// ============================================
// TRIX
// ============================================

export function calculateTRIX(data: CandleData[], period: number = 14): number[] {
  const closes = data.map(d => d.close);
  const ema1 = calculateEMA(closes, period);
  const ema2 = calculateEMA(ema1, period);
  const ema3 = calculateEMA(ema2, period);
  
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0 || isNaN(ema3[i]) || isNaN(ema3[i - 1]) || ema3[i - 1] === 0) {
      result.push(NaN);
      continue;
    }
    result.push(((ema3[i] - ema3[i - 1]) / ema3[i - 1]) * 100);
  }
  
  return result;
}

// ============================================
// Awesome Oscillator
// ============================================

export function calculateAwesomeOscillator(data: CandleData[]): number[] {
  const midpoints = data.map(d => (d.high + d.low) / 2);
  
  const sma5: number[] = [];
  const sma34: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < 4) {
      sma5.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - 4; j <= i; j++) sum += midpoints[j];
      sma5.push(sum / 5);
    }
    
    if (i < 33) {
      sma34.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - 33; j <= i; j++) sum += midpoints[j];
      sma34.push(sum / 34);
    }
  }
  
  return sma5.map((v, i) => v - sma34[i]);
}

// ============================================
// Connors RSI
// ============================================

export function calculateConnorsRSI(data: CandleData[]): number[] {
  const rsi = calculateRSI(data, 3);
  const streakRSI = calculateStreakRSI(data);
  const percentRank = calculatePercentRank(data, 100);
  
  return rsi.map((r, i) => (r + streakRSI[i] + percentRank[i]) / 3);
}

function calculateStreakRSI(data: CandleData[]): number[] {
  const streaks: number[] = [];
  let streak = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      streaks.push(0);
      continue;
    }
    
    if (data[i].close > data[i - 1].close) {
      streak = streak > 0 ? streak + 1 : 1;
    } else if (data[i].close < data[i - 1].close) {
      streak = streak < 0 ? streak - 1 : -1;
    } else {
      streak = 0;
    }
    streaks.push(streak);
  }
  
  // Convert streaks to RSI-like value
  return streaks.map(s => 50 + (s * 5)); // Simplified mapping
}

function calculatePercentRank(data: CandleData[], period: number): number[] {
  const result: number[] = [];
  
  if (!data || data.length === 0) return result;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period + 1) {
      result.push(50);
      continue;
    }
    
    if (!data[i] || !data[i - 1]) {
      result.push(50);
      continue;
    }
    
    const currentReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
    let count = 0;
    
    for (let j = i - period; j < i; j++) {
      if (j < 1 || !data[j] || !data[j - 1]) continue;
      const pastReturn = (data[j].close - data[j - 1].close) / data[j - 1].close;
      if (pastReturn < currentReturn) count++;
    }
    
    result.push((count / period) * 100);
  }
  
  return result;
}

// ============================================
// Laguerre RSI
// ============================================

export function calculateLaguerreRSI(data: CandleData[], gamma: number = 0.5): number[] {
  const result: number[] = [];
  let L0 = 0, L1 = 0, L2 = 0, L3 = 0;
  
  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    
    const L0_1 = L0;
    const L1_1 = L1;
    const L2_1 = L2;
    const L3_1 = L3;
    
    L0 = (1 - gamma) * price + gamma * L0_1;
    L1 = -gamma * L0 + L0_1 + gamma * L1_1;
    L2 = -gamma * L1 + L1_1 + gamma * L2_1;
    L3 = -gamma * L2 + L2_1 + gamma * L3_1;
    
    const cu = (L0 >= L1 ? L0 - L1 : 0) + (L1 >= L2 ? L1 - L2 : 0) + (L2 >= L3 ? L2 - L3 : 0);
    const cd = (L0 < L1 ? L1 - L0 : 0) + (L1 < L2 ? L2 - L1 : 0) + (L2 < L3 ? L3 - L2 : 0);
    
    const rsi = (cu + cd) !== 0 ? cu / (cu + cd) : 0;
    result.push(rsi);
  }
  
  return result;
}

// ============================================
// VWAP - Volume Weighted Average Price
// ============================================

export function calculateVWAP(data: CandleData[]): number[] {
  const result: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < data.length; i++) {
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    const volume = data[i].volume || 1;
    
    cumulativeTPV += tp * volume;
    cumulativeVolume += volume;
    
    result.push(cumulativeTPV / cumulativeVolume);
  }
  
  return result;
}

// ============================================
// CVD - Cumulative Volume Delta
// ============================================

export function calculateCVD(data: CandleData[]): number[] {
  const result: number[] = [];
  let cumulative = 0;
  
  for (let i = 0; i < data.length; i++) {
    const volume = data[i].volume || 1;
    const range = data[i].high - data[i].low;
    
    // Estimate buy/sell volume based on close position in range
    const delta = range !== 0 
      ? volume * ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / range
      : 0;
    
    cumulative += delta;
    result.push(cumulative);
  }
  
  return result;
}

// ============================================
// Klinger Volume Oscillator
// ============================================

export function calculateKlinger(data: CandleData[], short = 34, long = 55, signal = 13): { kvo: number[], signal: number[] } {
  const vf: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      vf.push(0);
      continue;
    }
    
    const hlc = data[i].high + data[i].low + data[i].close;
    const hlcPrev = data[i - 1].high + data[i - 1].low + data[i - 1].close;
    const trend = hlc > hlcPrev ? 1 : -1;
    
    const dm = data[i].high - data[i].low;
    const cm = i > 0 && hlc > hlcPrev === (data[i - 1].high + data[i - 1].low + data[i - 1].close > (i > 1 ? data[i - 2].high + data[i - 2].low + data[i - 2].close : 0))
      ? (vf[i - 1] ? dm + vf[i - 1] : dm) : dm;
    
    const volumeForce = dm !== 0 ? (data[i].volume || 1) * Math.abs(2 * (dm / cm) - 1) * trend * 100 : 0;
    vf.push(volumeForce);
  }
  
  const shortEMA = calculateEMA(vf, short);
  const longEMA = calculateEMA(vf, long);
  
  const kvo = shortEMA.map((s, i) => s - longEMA[i]);
  const signalLine = calculateEMA(kvo, signal);
  
  return { kvo, signal: signalLine };
}

// ============================================
// Fisher Transform
// ============================================

export function calculateFisherTransform(data: CandleData[], period: number = 10): { fisher: number[], trigger: number[] } {
  const result: number[] = [];
  let prevFisher = 0;
  let value = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = i - period + 1; j <= i; j++) {
      const hl2 = (data[j].high + data[j].low) / 2;
      if (hl2 > highest) highest = hl2;
      if (hl2 < lowest) lowest = hl2;
    }
    
    const hl2 = (data[i].high + data[i].low) / 2;
    const range = highest - lowest;
    
    value = range !== 0 
      ? 0.66 * ((hl2 - lowest) / range - 0.5) + 0.67 * value
      : 0;
    
    value = Math.max(-0.999, Math.min(0.999, value));
    
    const fisher = 0.5 * Math.log((1 + value) / (1 - value)) + 0.5 * prevFisher;
    prevFisher = fisher;
    result.push(fisher);
  }
  
  const trigger = result.map((_, i) => i > 0 ? result[i - 1] : NaN);
  
  return { fisher: result, trigger };
}
