/**
 * NEXUS Quantum Trend Intelligence Engine v1.0
 * 
 * Layer 2: Advanced Indicators Engine - محرك المؤشرات المتقدم
 * 
 * Computes 13 advanced indicators with deep state extraction:
 * 1. Volume Analysis
 * 2. RSI (Relative Strength Index)
 * 3. Stochastic RSI
 * 4. MACD (Moving Average Convergence Divergence)
 * 5. OBV (On-Balance Volume)
 * 6. ADX (Average Directional Index)
 * 7. Connors RSI
 * 8. Laguerre RSI
 * 9. Fisher Transform
 * 10. Cyber Cycle
 * 11. CVD (Cumulative Volume Delta)
 * 12. Klinger Oscillator
 * 13. MFI (Money Flow Index)
 * 
 * @author CCWAYS Elite Trading System
 * @version 1.0.0
 */

import {
  OHLCV,
  Timeframe,
  TrendDirection,
  NexusConfig,
  DEFAULT_NEXUS_CONFIG,
  VolumeAnalysis,
  RSIState,
  StochRSIState,
  MACDState,
  OBVState,
  ADXState,
  ConnorsRSIState,
  LaguerreRSIState,
  FisherTransformState,
  CyberCycleState,
  CVDState,
  KlingerState,
  MFIState,
  AllIndicatorsState,
  TimeframeIndicators,
} from './types';

// ==========================================================
// HELPER FUNCTIONS - دوال مساعدة
// ==========================================================

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
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

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

function wma(data: number[], period: number): number[] {
  const result: number[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j] * weights[period - 1 - j];
      }
      result.push(sum / weightSum);
    }
  }
  return result;
}

function tr(candles: OHLCV[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1];
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
  });
}

function atr(candles: OHLCV[], period: number = 14): number[] {
  const trValues = tr(candles);
  return ema(trValues, period);
}

function stdDev(data: number[], period: number): number[] {
  const result: number[] = [];
  const smaValues = sma(data, period);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || isNaN(smaValues[i])) {
      result.push(NaN);
    } else {
      let sumSq = 0;
      for (let j = 0; j < period; j++) {
        sumSq += Math.pow(data[i - j] - smaValues[i], 2);
      }
      result.push(Math.sqrt(sumSq / period));
    }
  }
  return result;
}

function detectDivergence(
  prices: number[],
  indicator: number[],
  lookback: number = 20
): 'bullish' | 'bearish' | 'none' {
  if (prices.length < lookback || indicator.length < lookback) return 'none';
  
  const priceSlice = prices.slice(-lookback);
  const indSlice = indicator.slice(-lookback);
  
  // Find local extrema in prices
  let priceHighIdx = 0, priceLowIdx = 0;
  for (let i = 1; i < priceSlice.length; i++) {
    if (priceSlice[i] > priceSlice[priceHighIdx]) priceHighIdx = i;
    if (priceSlice[i] < priceSlice[priceLowIdx]) priceLowIdx = i;
  }
  
  const currentPrice = priceSlice[priceSlice.length - 1];
  const currentInd = indSlice[indSlice.length - 1];
  
  // Bullish divergence: price makes lower low, indicator makes higher low
  if (currentPrice <= priceSlice[priceLowIdx] * 1.01) {
    const prevLowInd = indSlice[priceLowIdx];
    if (currentInd > prevLowInd * 1.02) return 'bullish';
  }
  
  // Bearish divergence: price makes higher high, indicator makes lower high
  if (currentPrice >= priceSlice[priceHighIdx] * 0.99) {
    const prevHighInd = indSlice[priceHighIdx];
    if (currentInd < prevHighInd * 0.98) return 'bearish';
  }
  
  return 'none';
}

function getDirection(current: number, previous: number): TrendDirection {
  if (current > previous * 1.001) return 'bullish';
  if (current < previous * 0.999) return 'bearish';
  return 'neutral';
}

function getMomentum(values: number[], period: number = 10): number {
  if (values.length < period + 1) return 0;
  const current = values[values.length - 1];
  const past = values[values.length - 1 - period];
  if (past === 0) return 0;
  return ((current - past) / Math.abs(past)) * 100;
}

// ==========================================================
// 1. VOLUME ANALYSIS - تحليل الحجم
// ==========================================================

export function calculateVolumeAnalysis(
  candles: OHLCV[],
  period: number = 20
): VolumeAnalysis {
  const volumes = candles.map(c => c.volume);
  const closes = candles.map(c => c.close);
  
  const current = volumes[volumes.length - 1];
  const avgVolume = sma(volumes, period);
  const average = avgVolume[avgVolume.length - 1];
  const ratio = average > 0 ? current / average : 1;
  
  // Volume trend
  const volumeMA = sma(volumes, 10);
  const recentMA = volumeMA[volumeMA.length - 1];
  const prevMA = volumeMA[volumeMA.length - 5] || recentMA;
  const trend: TrendDirection = recentMA > prevMA * 1.05 ? 'bullish' : 
                                 recentMA < prevMA * 0.95 ? 'bearish' : 'neutral';
  
  // Spike detection
  const isSpike = ratio > 2.0;
  const spikeIntensity = Math.min(100, (ratio - 1) * 50);
  
  // Accumulation/Distribution
  const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
  const accumulation = priceChange > 0 && current > average;
  const distribution = priceChange < 0 && current > average;
  
  return {
    current,
    average,
    ratio,
    trend,
    isSpike,
    spikeIntensity,
    accumulation,
    distribution,
  };
}

// ==========================================================
// 2. RSI - مؤشر القوة النسبية
// ==========================================================

export function calculateRSI(
  candles: OHLCV[],
  period: number = 14
): { values: number[]; state: RSIState } {
  const closes = candles.map(c => c.close);
  const changes = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
  
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  
  const avgGain = ema(gains, period);
  const avgLoss = ema(losses, period);
  
  const rsi: number[] = avgGain.map((g, i) => {
    if (avgLoss[i] === 0) return 100;
    const rs = g / avgLoss[i];
    return 100 - (100 / (1 + rs));
  });
  
  const current = rsi[rsi.length - 1];
  const previous = rsi[rsi.length - 2] || current;
  
  // Failure swing detection
  let failureSwing: 'bullish' | 'bearish' | 'none' = 'none';
  if (rsi.length >= 10) {
    const recent = rsi.slice(-10);
    const wasOversold = recent.some(r => r < 30);
    const wasOverbought = recent.some(r => r > 70);
    if (wasOversold && current > 30 && current < previous) failureSwing = 'bullish';
    if (wasOverbought && current < 70 && current > previous) failureSwing = 'bearish';
  }
  
  const divergence = detectDivergence(closes, rsi);
  
  const state: RSIState = {
    value: current,
    previousValue: previous,
    direction: getDirection(current, previous),
    momentum: getMomentum(rsi),
    isOverbought: current > 70,
    isOversold: current < 30,
    hasDivergence: divergence !== 'none',
    divergenceType: divergence,
    crossover: previous < 50 && current >= 50 ? 'bullish' : 
               previous > 50 && current <= 50 ? 'bearish' : 'none',
    strength: Math.abs(current - 50) * 2,
    zone: current > 70 ? 'overbought' : current < 30 ? 'oversold' : 'neutral',
    failureSwing,
  };
  
  return { values: rsi, state };
}

// ==========================================================
// 3. STOCHASTIC RSI - مؤشر ستوكاستيك RSI
// ==========================================================

export function calculateStochRSI(
  candles: OHLCV[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3
): { k: number[]; d: number[]; state: StochRSIState } {
  const { values: rsi } = calculateRSI(candles, rsiPeriod);
  
  // Stochastic of RSI
  const stochK: number[] = [];
  for (let i = 0; i < rsi.length; i++) {
    if (i < stochPeriod - 1) {
      stochK.push(NaN);
    } else {
      const slice = rsi.slice(i - stochPeriod + 1, i + 1);
      const min = Math.min(...slice.filter(v => !isNaN(v)));
      const max = Math.max(...slice.filter(v => !isNaN(v)));
      const range = max - min;
      stochK.push(range > 0 ? ((rsi[i] - min) / range) * 100 : 50);
    }
  }
  
  const k = sma(stochK, kSmooth);
  const d = sma(k, dSmooth);
  
  const currentK = k[k.length - 1];
  const currentD = d[d.length - 1];
  const prevK = k[k.length - 2] || currentK;
  const prevD = d[d.length - 2] || currentD;
  
  const crossoverType: 'bullish' | 'bearish' | 'none' = 
    prevK < prevD && currentK >= currentD ? 'bullish' :
    prevK > prevD && currentK <= currentD ? 'bearish' : 'none';
  
  const state: StochRSIState = {
    value: currentK,
    previousValue: prevK,
    direction: getDirection(currentK, prevK),
    momentum: getMomentum(k),
    isOverbought: currentK > 80,
    isOversold: currentK < 20,
    hasDivergence: false,
    divergenceType: 'none',
    crossover: crossoverType,
    strength: Math.abs(currentK - 50) * 2,
    k: currentK,
    d: currentD,
    kDirection: getDirection(currentK, prevK),
    dDirection: getDirection(currentD, prevD),
    crossoverType,
    inExtremeZone: currentK > 80 || currentK < 20,
  };
  
  return { k, d, state };
}

// ==========================================================
// 4. MACD - تقارب وتباعد المتوسطات المتحركة
// ==========================================================

export function calculateMACD(
  candles: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[]; state: MACDState } {
  const closes = candles.map(c => c.close);
  
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);
  
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const currentHist = histogram[histogram.length - 1];
  const prevMACD = macdLine[macdLine.length - 2] || currentMACD;
  const prevSignal = signalLine[signalLine.length - 2] || currentSignal;
  const prevHist = histogram[histogram.length - 2] || currentHist;
  
  const zeroCross: 'bullish' | 'bearish' | 'none' = 
    prevMACD < 0 && currentMACD >= 0 ? 'bullish' :
    prevMACD > 0 && currentMACD <= 0 ? 'bearish' : 'none';
    
  const signalCross: 'bullish' | 'bearish' | 'none' = 
    prevMACD < prevSignal && currentMACD >= currentSignal ? 'bullish' :
    prevMACD > prevSignal && currentMACD <= currentSignal ? 'bearish' : 'none';
  
  const divergence = detectDivergence(closes, macdLine);
  
  const state: MACDState = {
    value: currentMACD,
    previousValue: prevMACD,
    direction: getDirection(currentMACD, prevMACD),
    momentum: getMomentum(macdLine),
    isOverbought: false,
    isOversold: false,
    hasDivergence: divergence !== 'none',
    divergenceType: divergence,
    crossover: signalCross,
    strength: Math.abs(currentHist) / (Math.abs(currentSignal) + 0.0001) * 100,
    macdLine: currentMACD,
    signalLine: currentSignal,
    histogram: currentHist,
    histogramTrend: getDirection(currentHist, prevHist),
    histogramMomentum: getMomentum(histogram),
    zeroCross,
    signalCross,
  };
  
  return { macd: macdLine, signal: signalLine, histogram, state };
}

// ==========================================================
// 5. OBV - حجم التداول المتوازن
// ==========================================================

export function calculateOBV(
  candles: OHLCV[],
  smaPeriod: number = 20
): { obv: number[]; obvSma: number[]; state: OBVState } {
  const obv: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      obv.push(candles[i].volume);
    } else {
      const priceChange = candles[i].close - candles[i - 1].close;
      if (priceChange > 0) {
        obv.push(obv[i - 1] + candles[i].volume);
      } else if (priceChange < 0) {
        obv.push(obv[i - 1] - candles[i].volume);
      } else {
        obv.push(obv[i - 1]);
      }
    }
  }
  
  const obvSma = sma(obv, smaPeriod);
  const closes = candles.map(c => c.close);
  
  const current = obv[obv.length - 1];
  const previous = obv[obv.length - 2] || current;
  const currentSma = obvSma[obvSma.length - 1];
  
  const divergence = detectDivergence(closes, obv);
  
  const state: OBVState = {
    value: current,
    previousValue: previous,
    direction: getDirection(current, previous),
    momentum: getMomentum(obv),
    isOverbought: false,
    isOversold: false,
    hasDivergence: divergence !== 'none',
    divergenceType: divergence,
    crossover: previous < currentSma && current >= currentSma ? 'bullish' :
               previous > currentSma && current <= currentSma ? 'bearish' : 'none',
    strength: Math.abs(getMomentum(obv)),
    obv: current,
    obvSma: currentSma,
    trend: getDirection(current, previous),
    divergenceWithPrice: divergence,
    breakout: current > currentSma * 1.05 || current < currentSma * 0.95,
  };
  
  return { obv, obvSma, state };
}

// ==========================================================
// 6. ADX - مؤشر الاتجاه المتوسط
// ==========================================================

export function calculateADX(
  candles: OHLCV[],
  period: number = 14
): { adx: number[]; plusDI: number[]; minusDI: number[]; state: ADXState } {
  const trValues = tr(candles);
  
  // +DM and -DM
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const upMove = candles[i].high - candles[i - 1].high;
      const downMove = candles[i - 1].low - candles[i].low;
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
  }
  
  // Smoothed values
  const atrValues = ema(trValues, period);
  const smoothPlusDM = ema(plusDM, period);
  const smoothMinusDM = ema(minusDM, period);
  
  // +DI and -DI
  const plusDI = smoothPlusDM.map((dm, i) => 
    atrValues[i] > 0 ? (dm / atrValues[i]) * 100 : 0
  );
  const minusDI = smoothMinusDM.map((dm, i) => 
    atrValues[i] > 0 ? (dm / atrValues[i]) * 100 : 0
  );
  
  // DX and ADX
  const dx = plusDI.map((p, i) => {
    const sum = p + minusDI[i];
    return sum > 0 ? (Math.abs(p - minusDI[i]) / sum) * 100 : 0;
  });
  const adx = ema(dx, period);
  
  const currentADX = adx[adx.length - 1];
  const currentPlusDI = plusDI[plusDI.length - 1];
  const currentMinusDI = minusDI[minusDI.length - 1];
  const prevPlusDI = plusDI[plusDI.length - 2] || currentPlusDI;
  const prevMinusDI = minusDI[minusDI.length - 2] || currentMinusDI;
  const prevADX = adx[adx.length - 2] || currentADX;
  
  const trendStrength: 'strong' | 'moderate' | 'weak' | 'no_trend' = 
    currentADX >= 50 ? 'strong' :
    currentADX >= 25 ? 'moderate' :
    currentADX >= 15 ? 'weak' : 'no_trend';
  
  const diCrossover: 'bullish' | 'bearish' | 'none' = 
    prevPlusDI < prevMinusDI && currentPlusDI >= currentMinusDI ? 'bullish' :
    prevPlusDI > prevMinusDI && currentPlusDI <= currentMinusDI ? 'bearish' : 'none';
  
  const state: ADXState = {
    value: currentADX,
    previousValue: prevADX,
    direction: currentPlusDI > currentMinusDI ? 'bullish' : 
               currentPlusDI < currentMinusDI ? 'bearish' : 'neutral',
    momentum: getMomentum(adx),
    isOverbought: false,
    isOversold: false,
    hasDivergence: false,
    divergenceType: 'none',
    crossover: diCrossover,
    strength: currentADX,
    adx: currentADX,
    plusDI: currentPlusDI,
    minusDI: currentMinusDI,
    trendStrength,
    diCrossover,
    adxRising: currentADX > prevADX,
  };
  
  return { adx, plusDI, minusDI, state };
}

// ==========================================================
// 7. CONNORS RSI - مؤشر كونورز RSI
// ==========================================================

export function calculateConnorsRSI(
  candles: OHLCV[],
  rsiPeriod: number = 3,
  streakPeriod: number = 2,
  rankPeriod: number = 100
): { values: number[]; state: ConnorsRSIState } {
  const closes = candles.map(c => c.close);
  
  // 1. Standard RSI
  const { values: rsiValues } = calculateRSI(candles, rsiPeriod);
  
  // 2. Streak RSI (consecutive up/down days)
  const streaks: number[] = [];
  let currentStreak = 0;
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      currentStreak = 0;
    } else if (closes[i] > closes[i - 1]) {
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    } else if (closes[i] < closes[i - 1]) {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    } else {
      currentStreak = 0;
    }
    streaks.push(currentStreak);
  }
  
  // RSI of streaks
  const streakRSI: number[] = [];
  for (let i = 0; i < streaks.length; i++) {
    if (i < streakPeriod) {
      streakRSI.push(50);
    } else {
      const slice = streaks.slice(i - streakPeriod + 1, i + 1);
      const gains = slice.filter(s => s > 0).reduce((a, b) => a + b, 0);
      const losses = Math.abs(slice.filter(s => s < 0).reduce((a, b) => a + b, 0));
      const rs = losses === 0 ? 100 : gains / losses;
      streakRSI.push(100 - (100 / (1 + rs)));
    }
  }
  
  // 3. Percent Rank
  const percentRank: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < rankPeriod) {
      percentRank.push(50);
    } else {
      const change = closes[i] - closes[i - 1];
      const slice: number[] = [];
      for (let j = i - rankPeriod; j < i; j++) {
        slice.push(closes[j + 1] - closes[j]);
      }
      const countLess = slice.filter(c => c < change).length;
      percentRank.push((countLess / rankPeriod) * 100);
    }
  }
  
  // Composite Connors RSI
  const connorsRSI = rsiValues.map((r, i) => 
    (r + streakRSI[i] + percentRank[i]) / 3
  );
  
  const current = connorsRSI[connorsRSI.length - 1];
  const previous = connorsRSI[connorsRSI.length - 2] || current;
  
  const state: ConnorsRSIState = {
    value: current,
    previousValue: previous,
    direction: getDirection(current, previous),
    momentum: getMomentum(connorsRSI),
    isOverbought: current > 90,
    isOversold: current < 10,
    hasDivergence: false,
    divergenceType: 'none',
    crossover: previous < 50 && current >= 50 ? 'bullish' :
               previous > 50 && current <= 50 ? 'bearish' : 'none',
    strength: Math.abs(current - 50) * 2,
    composite: current,
    rsiComponent: rsiValues[rsiValues.length - 1],
    streakComponent: streakRSI[streakRSI.length - 1],
    percentRankComponent: percentRank[percentRank.length - 1],
    extremeReading: current > 90 || current < 10,
  };
  
  return { values: connorsRSI, state };
}

// ==========================================================
// 8. LAGUERRE RSI - مؤشر لاجير RSI
// ==========================================================

export function calculateLaguerreRSI(
  candles: OHLCV[],
  gamma: number = 0.8
): { values: number[]; state: LaguerreRSIState } {
  const closes = candles.map(c => c.close);
  const lrsi: number[] = [];
  
  let L0 = 0, L1 = 0, L2 = 0, L3 = 0;
  let L0_1 = 0, L1_1 = 0, L2_1 = 0, L3_1 = 0;
  
  for (let i = 0; i < closes.length; i++) {
    L0_1 = L0;
    L1_1 = L1;
    L2_1 = L2;
    L3_1 = L3;
    
    L0 = (1 - gamma) * closes[i] + gamma * L0_1;
    L1 = -gamma * L0 + L0_1 + gamma * L1_1;
    L2 = -gamma * L1 + L1_1 + gamma * L2_1;
    L3 = -gamma * L2 + L2_1 + gamma * L3_1;
    
    const cu = (L0 > L1 ? L0 - L1 : 0) + (L1 > L2 ? L1 - L2 : 0) + (L2 > L3 ? L2 - L3 : 0);
    const cd = (L0 < L1 ? L1 - L0 : 0) + (L1 < L2 ? L2 - L1 : 0) + (L2 < L3 ? L3 - L2 : 0);
    
    const cucd = cu + cd;
    lrsi.push(cucd !== 0 ? cu / cucd : 0);
  }
  
  const current = lrsi[lrsi.length - 1];
  const previous = lrsi[lrsi.length - 2] || current;
  const prevPrev = lrsi[lrsi.length - 3] || previous;
  
  // Turning point detection
  const turningPoint = (previous > current && previous > prevPrev) || 
                       (previous < current && previous < prevPrev);
  const turningDirection: TrendDirection = 
    previous > current && previous > prevPrev ? 'bearish' :
    previous < current && previous < prevPrev ? 'bullish' : 'neutral';
  
  const state: LaguerreRSIState = {
    value: current,
    previousValue: previous,
    direction: getDirection(current, previous),
    momentum: getMomentum(lrsi),
    isOverbought: current > 0.8,
    isOversold: current < 0.2,
    hasDivergence: false,
    divergenceType: 'none',
    crossover: previous < 0.5 && current >= 0.5 ? 'bullish' :
               previous > 0.5 && current <= 0.5 ? 'bearish' : 'none',
    strength: Math.abs(current - 0.5) * 200,
    lrsi: current,
    gamma,
    turningPoint,
    turningDirection,
  };
  
  return { values: lrsi, state };
}

// ==========================================================
// 9. FISHER TRANSFORM - تحويل فيشر
// ==========================================================

export function calculateFisherTransform(
  candles: OHLCV[],
  period: number = 10
): { fisher: number[]; signal: number[]; state: FisherTransformState } {
  const hl2 = candles.map(c => (c.high + c.low) / 2);
  
  const fisher: number[] = [];
  const signal: number[] = [];
  let value = 0;
  let prevFisher = 0;
  
  for (let i = 0; i < hl2.length; i++) {
    if (i < period - 1) {
      fisher.push(0);
      signal.push(0);
    } else {
      const slice = hl2.slice(i - period + 1, i + 1);
      const maxHigh = Math.max(...slice);
      const minLow = Math.min(...slice);
      const range = maxHigh - minLow;
      
      if (range > 0) {
        const normalizedValue = ((hl2[i] - minLow) / range) * 2 - 1;
        value = 0.66 * Math.max(-0.999, Math.min(0.999, normalizedValue)) + 0.67 * value;
        value = Math.max(-0.999, Math.min(0.999, value));
        
        const fisherValue = 0.5 * Math.log((1 + value) / (1 - value)) + 0.5 * prevFisher;
        fisher.push(fisherValue);
        signal.push(prevFisher);
        prevFisher = fisherValue;
      } else {
        fisher.push(prevFisher);
        signal.push(prevFisher);
      }
    }
  }
  
  const currentFisher = fisher[fisher.length - 1];
  const currentSignal = signal[signal.length - 1];
  const prevF = fisher[fisher.length - 2] || currentFisher;
  
  const crossover: 'bullish' | 'bearish' | 'none' = 
    prevF < currentSignal && currentFisher >= currentSignal ? 'bullish' :
    prevF > currentSignal && currentFisher <= currentSignal ? 'bearish' : 'none';
  
  const extremeLevel = Math.abs(currentFisher) > 1.5;
  const reversalSignal = extremeLevel && crossover !== 'none';
  
  const state: FisherTransformState = {
    value: currentFisher,
    previousValue: prevF,
    direction: getDirection(currentFisher, prevF),
    momentum: getMomentum(fisher),
    isOverbought: currentFisher > 1.5,
    isOversold: currentFisher < -1.5,
    hasDivergence: false,
    divergenceType: 'none',
    crossover,
    strength: Math.abs(currentFisher) * 50,
    fisher: currentFisher,
    signal: currentSignal,
    extremeLevel,
    reversalSignal,
  };
  
  return { fisher, signal, state };
}

// ==========================================================
// 10. CYBER CYCLE - دورة السايبر
// ==========================================================

export function calculateCyberCycle(
  candles: OHLCV[],
  alpha: number = 0.07
): { cycle: number[]; trigger: number[]; state: CyberCycleState } {
  const hl2 = candles.map(c => (c.high + c.low) / 2);
  
  // Smooth the price
  const smooth: number[] = [];
  for (let i = 0; i < hl2.length; i++) {
    if (i < 3) {
      smooth.push(hl2[i]);
    } else {
      smooth.push(
        (hl2[i] + 2 * hl2[i - 1] + 2 * hl2[i - 2] + hl2[i - 3]) / 6
      );
    }
  }
  
  // Compute cycle
  const cycle: number[] = [];
  const c1 = (1 - 0.5 * alpha) * (1 - 0.5 * alpha);
  const c2 = 2 * (1 - alpha);
  const c3 = (1 - alpha) * (1 - alpha);
  
  for (let i = 0; i < smooth.length; i++) {
    if (i < 6) {
      cycle.push(0);
    } else {
      const cycleValue = c1 * (smooth[i] - 2 * smooth[i - 1] + smooth[i - 2]) +
                         c2 * (cycle[i - 1] || 0) - c3 * (cycle[i - 2] || 0);
      cycle.push(cycleValue);
    }
  }
  
  // Trigger line (1-bar delay)
  const trigger = [0, ...cycle.slice(0, -1)];
  
  const currentCycle = cycle[cycle.length - 1];
  const currentTrigger = trigger[trigger.length - 1];
  const prevCycle = cycle[cycle.length - 2] || currentCycle;
  
  const phase: 'up' | 'down' | 'turning' = 
    currentCycle > prevCycle && currentCycle > currentTrigger ? 'up' :
    currentCycle < prevCycle && currentCycle < currentTrigger ? 'down' : 'turning';
  
  const state: CyberCycleState = {
    value: currentCycle,
    previousValue: prevCycle,
    direction: getDirection(currentCycle, prevCycle),
    momentum: getMomentum(cycle),
    isOverbought: false,
    isOversold: false,
    hasDivergence: false,
    divergenceType: 'none',
    crossover: prevCycle < currentTrigger && currentCycle >= currentTrigger ? 'bullish' :
               prevCycle > currentTrigger && currentCycle <= currentTrigger ? 'bearish' : 'none',
    strength: Math.abs(currentCycle) * 1000,
    cycle: currentCycle,
    trigger: currentTrigger,
    phase,
    cycleStrength: Math.abs(currentCycle - currentTrigger) * 1000,
    leadingSignal: phase !== 'turning',
  };
  
  return { cycle, trigger, state };
}

// ==========================================================
// 11. CVD - دلتا الحجم التراكمي
// ==========================================================

export function calculateCVD(
  candles: OHLCV[],
  period: number = 14
): { delta: number[]; cumulative: number[]; state: CVDState } {
  const delta: number[] = [];
  const cumulative: number[] = [];
  
  let cumulativeValue = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const range = c.high - c.low;
    
    // Estimate buy/sell volume using price position
    let buyVolume = 0;
    let sellVolume = 0;
    
    if (range > 0) {
      const buyRatio = (c.close - c.low) / range;
      buyVolume = c.volume * buyRatio;
      sellVolume = c.volume * (1 - buyRatio);
    } else {
      buyVolume = c.volume * 0.5;
      sellVolume = c.volume * 0.5;
    }
    
    const barDelta = buyVolume - sellVolume;
    delta.push(barDelta);
    
    cumulativeValue += barDelta;
    cumulative.push(cumulativeValue);
  }
  
  const deltaMA = sma(delta, period);
  const closes = candles.map(c => c.close);
  
  const currentDelta = delta[delta.length - 1];
  const currentCumulative = cumulative[cumulative.length - 1];
  const prevCumulative = cumulative[cumulative.length - 2] || currentCumulative;
  const currentDeltaMA = deltaMA[deltaMA.length - 1];
  
  const divergence = detectDivergence(closes, cumulative);
  
  // Absorption detection (high volume but little price movement)
  const recentCandle = candles[candles.length - 1];
  const priceChange = Math.abs(recentCandle.close - recentCandle.open);
  const avgPriceChange = closes.slice(-20).reduce((sum, c, i, arr) => 
    i === 0 ? 0 : sum + Math.abs(c - arr[i - 1]), 0) / 19;
  const absorptionDetected = recentCandle.volume > deltaMA[deltaMA.length - 1] * 2 && 
                             priceChange < avgPriceChange * 0.5;
  
  const state: CVDState = {
    value: currentCumulative,
    previousValue: prevCumulative,
    direction: getDirection(currentCumulative, prevCumulative),
    momentum: getMomentum(cumulative),
    isOverbought: false,
    isOversold: false,
    hasDivergence: divergence !== 'none',
    divergenceType: divergence,
    crossover: 'none',
    strength: Math.abs(currentDelta / (currentDeltaMA + 0.0001)) * 50,
    delta: currentDelta,
    cumulativeDelta: currentCumulative,
    deltaMA: currentDeltaMA,
    trend: getDirection(currentCumulative, prevCumulative),
    divergenceWithPrice: divergence,
    absorptionDetected,
  };
  
  return { delta, cumulative, state };
}

// ==========================================================
// 12. KLINGER OSCILLATOR - مذبذب كلينجر
// ==========================================================

export function calculateKlinger(
  candles: OHLCV[],
  fastPeriod: number = 34,
  slowPeriod: number = 55,
  signalPeriod: number = 13
): { oscillator: number[]; signal: number[]; state: KlingerState } {
  // Calculate trend and volume force
  const hlc3 = candles.map(c => (c.high + c.low + c.close) / 3);
  const volumeForce: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      volumeForce.push(0);
    } else {
      const trend = hlc3[i] > hlc3[i - 1] ? 1 : -1;
      const dm = candles[i].high - candles[i].low;
      const cm = i < 1 ? dm : 
                 hlc3[i] > hlc3[i - 1] ? 
                   (volumeForce[i - 1] > 0 ? volumeForce[i - 1] + dm : dm) :
                   (volumeForce[i - 1] < 0 ? volumeForce[i - 1] - dm : -dm);
      
      const vf = dm > 0 ? 
                 candles[i].volume * Math.abs(2 * (dm / candles[i].high) - 1) * trend * 100 : 0;
      volumeForce.push(vf);
    }
  }
  
  const fastEMA = ema(volumeForce, fastPeriod);
  const slowEMA = ema(volumeForce, slowPeriod);
  const oscillator = fastEMA.map((f, i) => f - slowEMA[i]);
  const signal = ema(oscillator, signalPeriod);
  
  const currentOsc = oscillator[oscillator.length - 1];
  const currentSignal = signal[signal.length - 1];
  const prevOsc = oscillator[oscillator.length - 2] || currentOsc;
  const prevSignal = signal[signal.length - 2] || currentSignal;
  
  const crossover: 'bullish' | 'bearish' | 'none' = 
    prevOsc < prevSignal && currentOsc >= currentSignal ? 'bullish' :
    prevOsc > prevSignal && currentOsc <= currentSignal ? 'bearish' : 'none';
  
  const state: KlingerState = {
    value: currentOsc,
    previousValue: prevOsc,
    direction: getDirection(currentOsc, prevOsc),
    momentum: getMomentum(oscillator),
    isOverbought: false,
    isOversold: false,
    hasDivergence: false,
    divergenceType: 'none',
    crossover,
    strength: Math.abs(currentOsc - currentSignal),
    oscillator: currentOsc,
    signal: currentSignal,
    volumeForce: volumeForce[volumeForce.length - 1],
    trend: currentOsc > 0 ? 'bullish' : currentOsc < 0 ? 'bearish' : 'neutral',
    accumulationPhase: currentOsc > 0 && currentOsc > currentSignal,
  };
  
  return { oscillator, signal, state };
}

// ==========================================================
// 13. MFI - مؤشر التدفق النقدي
// ==========================================================

export function calculateMFI(
  candles: OHLCV[],
  period: number = 14
): { values: number[]; state: MFIState } {
  const typicalPrice = candles.map(c => (c.high + c.low + c.close) / 3);
  const rawMoneyFlow = typicalPrice.map((tp, i) => tp * candles[i].volume);
  
  const mfi: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      mfi.push(50);
    } else {
      let posFlow = 0;
      let negFlow = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        if (typicalPrice[j] > typicalPrice[j - 1]) {
          posFlow += rawMoneyFlow[j];
        } else if (typicalPrice[j] < typicalPrice[j - 1]) {
          negFlow += rawMoneyFlow[j];
        }
      }
      
      if (negFlow === 0) {
        mfi.push(100);
      } else {
        const mfRatio = posFlow / negFlow;
        mfi.push(100 - (100 / (1 + mfRatio)));
      }
    }
  }
  
  const closes = candles.map(c => c.close);
  const current = mfi[mfi.length - 1];
  const previous = mfi[mfi.length - 2] || current;
  
  const divergence = detectDivergence(closes, mfi);
  
  const state: MFIState = {
    value: current,
    previousValue: previous,
    direction: getDirection(current, previous),
    momentum: getMomentum(mfi),
    isOverbought: current > 80,
    isOversold: current < 20,
    hasDivergence: divergence !== 'none',
    divergenceType: divergence,
    crossover: previous < 50 && current >= 50 ? 'bullish' :
               previous > 50 && current <= 50 ? 'bearish' : 'none',
    strength: Math.abs(current - 50) * 2,
    mfi: current,
    zone: current > 80 ? 'overbought' : current < 20 ? 'oversold' : 'neutral',
    moneyFlowRatio: current / (100 - current + 0.0001),
    divergenceWithPrice: divergence,
    extremeReading: current > 80 || current < 20,
  };
  
  return { values: mfi, state };
}

// ==========================================================
// MAIN FUNCTION - الدالة الرئيسية
// ==========================================================

export function computeAllIndicators(
  candles: OHLCV[],
  config: NexusConfig = DEFAULT_NEXUS_CONFIG
): AllIndicatorsState {
  const { indicators: cfg } = config;
  
  return {
    volume: calculateVolumeAnalysis(candles),
    rsi: calculateRSI(candles, cfg.rsiPeriod).state,
    stochRsi: calculateStochRSI(candles, cfg.stochRsiPeriod).state,
    macd: calculateMACD(candles, cfg.macdFast, cfg.macdSlow, cfg.macdSignal).state,
    obv: calculateOBV(candles, cfg.obvSmaPeriod).state,
    adx: calculateADX(candles, cfg.adxPeriod).state,
    connorsRsi: calculateConnorsRSI(candles, ...cfg.connorsRsiPeriods).state,
    laguerreRsi: calculateLaguerreRSI(candles, cfg.laguerreGamma).state,
    fisher: calculateFisherTransform(candles, cfg.fisherPeriod).state,
    cyberCycle: calculateCyberCycle(candles, cfg.cyberCycleAlpha).state,
    cvd: calculateCVD(candles, cfg.cvdPeriod).state,
    klinger: calculateKlinger(candles, cfg.klingerFast, cfg.klingerSlow, cfg.klingerSignal).state,
    mfi: calculateMFI(candles, cfg.mfiPeriod).state,
  };
}

export function computeTimeframeIndicators(
  candles: OHLCV[],
  timeframe: Timeframe,
  config: NexusConfig = DEFAULT_NEXUS_CONFIG
): TimeframeIndicators {
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2] || lastCandle;
  
  return {
    timeframe,
    timestamp: lastCandle.timestamp,
    price: {
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      change: lastCandle.close - prevCandle.close,
      changePercent: ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100,
    },
    indicators: computeAllIndicators(candles, config),
  };
}
