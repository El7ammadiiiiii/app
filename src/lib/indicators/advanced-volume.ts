/**
 * Advanced Volume Analysis - تحليل الحجم المتقدم
 * 
 * Institutional-level volume indicators:
 * - VWAP: Volume Weighted Average Price with bands
 * - Volume Profile: POC, VAH, VAL, HVN, LVN
 * - Cumulative Volume Delta (CVD): Buying vs Selling pressure
 * - Klinger Volume Oscillator: Advanced trend-volume indicator
 * - Money Flow Index (MFI): Volume-weighted RSI
 * - Smart Money Volume: Anomaly detection & absorption
 */

import { OHLCV, IndicatorResult, calculateSMA, calculateEMAArray } from './technical';

// ==========================================================
// INTERFACES - الواجهات
// ==========================================================

export interface VWAPResult {
  vwap: number;
  upperBand1: number;   // +1 Standard Deviation
  upperBand2: number;   // +2 Standard Deviation
  lowerBand1: number;   // -1 Standard Deviation
  lowerBand2: number;   // -2 Standard Deviation
  vwapArray: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  pricePosition: 'above' | 'below' | 'at';
  distancePercent: number;
}

export interface VolumeProfileLevel {
  priceLevel: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  percent: number;
}

export interface VolumeProfileResult {
  levels: VolumeProfileLevel[];
  poc: number;              // Point of Control (highest volume price)
  pocVolume: number;
  valueAreaHigh: number;    // 70% volume above
  valueAreaLow: number;     // 70% volume below
  hvn: number[];            // High Volume Nodes
  lvn: number[];            // Low Volume Nodes
  totalVolume: number;
  buyPercent: number;
  sellPercent: number;
}

export interface CVDResult {
  cvd: number;
  cvdArray: number[];
  delta: number;
  deltaArray: number[];
  trend: 'accumulation' | 'distribution' | 'neutral';
  divergence: 'bullish' | 'bearish' | null;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface KlingerResult {
  kvo: number;
  signal: number;
  histogram: number;
  kvoArray: (number | null)[];
  signalArray: (number | null)[];
  trend: 'bullish' | 'bearish' | 'neutral';
  crossover: boolean;
  crossoverType: 'bullish' | 'bearish' | null;
}

export interface MFIResult extends IndicatorResult {
  mfi: number;
  mfiArray: (number | null)[];
  overbought: boolean;
  oversold: boolean;
  divergence: 'bullish' | 'bearish' | null;
}

export interface SmartMoneyVolumeResult {
  delta: number;
  deltaPct: number;
  cvd: number;
  cvdArray: number[];
  isVolumeAnomaly: boolean;
  volumeZScore: number;
  anomalyType: 'buying' | 'selling' | 'neutral' | null;
  isAbsorption: boolean;
  absorptionRatio: number;
  absorptionType: 'support' | 'resistance' | null;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

// ==========================================================
// VWAP - المتوسط السعري المرجح بالحجم
// ==========================================================

/**
 * Volume Weighted Average Price (VWAP)
 * The benchmark used by institutional traders
 * 
 * Formula: VWAP = Σ(Typical Price × Volume) / Σ(Volume)
 * 
 * Features:
 * - Main VWAP line (institutional benchmark)
 * - ±1 and ±2 Standard Deviation bands
 * - Position relative to VWAP
 * 
 * @param candles - OHLCV data
 * @param resetDaily - Reset VWAP each day (default: false)
 */
export function calculateVWAP(
  candles: OHLCV[],
  resetDaily: boolean = false
): VWAPResult {
  const nullResult: VWAPResult = {
    vwap: 0,
    upperBand1: 0,
    upperBand2: 0,
    lowerBand1: 0,
    lowerBand2: 0,
    vwapArray: [],
    signal: 'neutral',
    pricePosition: 'at',
    distancePercent: 0
  };
  
  if (candles.length < 1) return nullResult;
  
  const vwapArray: number[] = [];
  let cumulativeTPV = 0; // Typical Price × Volume
  let cumulativeVolume = 0;
  const tpvArray: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const tpv = typicalPrice * candle.volume;
    
    // Check for daily reset
    if (resetDaily && i > 0) {
      const currentDate = new Date(candle.timestamp);
      const prevDate = new Date(candles[i - 1].timestamp);
      
      if (currentDate.getDate() !== prevDate.getDate()) {
        cumulativeTPV = 0;
        cumulativeVolume = 0;
        tpvArray.length = 0;
      }
    }
    
    cumulativeTPV += tpv;
    cumulativeVolume += candle.volume;
    tpvArray.push(typicalPrice);
    
    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;
    vwapArray.push(vwap);
  }
  
  const currentVWAP = vwapArray[vwapArray.length - 1];
  const currentPrice = candles[candles.length - 1].close;
  
  // Calculate Standard Deviation for bands
  let sumSquaredDiff = 0;
  const recentBars = Math.min(20, vwapArray.length);
  
  for (let i = vwapArray.length - recentBars; i < vwapArray.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    sumSquaredDiff += Math.pow(tp - vwapArray[i], 2) * candles[i].volume;
  }
  
  const recentVolume = candles.slice(-recentBars).reduce((sum, c) => sum + c.volume, 0);
  const variance = recentVolume > 0 ? sumSquaredDiff / recentVolume : 0;
  const stdDev = Math.sqrt(variance);
  
  // Calculate bands
  const upperBand1 = currentVWAP + stdDev;
  const upperBand2 = currentVWAP + 2 * stdDev;
  const lowerBand1 = currentVWAP - stdDev;
  const lowerBand2 = currentVWAP - 2 * stdDev;
  
  // Position and signal
  let pricePosition: 'above' | 'below' | 'at' = 'at';
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  const distancePercent = currentVWAP !== 0 
    ? ((currentPrice - currentVWAP) / currentVWAP) * 100 
    : 0;
  
  if (currentPrice > upperBand1) {
    pricePosition = 'above';
    signal = 'bullish';
  } else if (currentPrice < lowerBand1) {
    pricePosition = 'below';
    signal = 'bearish';
  } else if (currentPrice > currentVWAP) {
    pricePosition = 'above';
    signal = 'bullish';
  } else if (currentPrice < currentVWAP) {
    pricePosition = 'below';
    signal = 'bearish';
  }
  
  return {
    vwap: currentVWAP,
    upperBand1,
    upperBand2,
    lowerBand1,
    lowerBand2,
    vwapArray,
    signal,
    pricePosition,
    distancePercent: Math.round(distancePercent * 100) / 100
  };
}

// ==========================================================
// VOLUME PROFILE - ملف الحجم
// ==========================================================

/**
 * Volume Profile Analysis
 * Shows volume distribution at each price level
 * 
 * Key levels:
 * - POC: Point of Control (highest volume, fair value)
 * - VAH: Value Area High (70% volume above)
 * - VAL: Value Area Low (70% volume below)
 * - HVN: High Volume Nodes (support/resistance)
 * - LVN: Low Volume Nodes (rejection zones)
 * 
 * @param candles - OHLCV data
 * @param numBuckets - Number of price levels (default: 24)
 * @param valueAreaPercent - Value area percentage (default: 0.7)
 */
export function calculateVolumeProfile(
  candles: OHLCV[],
  numBuckets: number = 24,
  valueAreaPercent: number = 0.7
): VolumeProfileResult {
  const nullResult: VolumeProfileResult = {
    levels: [],
    poc: 0,
    pocVolume: 0,
    valueAreaHigh: 0,
    valueAreaLow: 0,
    hvn: [],
    lvn: [],
    totalVolume: 0,
    buyPercent: 50,
    sellPercent: 50
  };
  
  if (candles.length < 10) return nullResult;
  
  // Find price range
  let maxHigh = -Infinity;
  let minLow = Infinity;
  let totalVolume = 0;
  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  
  for (const candle of candles) {
    if (candle.high > maxHigh) maxHigh = candle.high;
    if (candle.low < minLow) minLow = candle.low;
    totalVolume += candle.volume;
    
    // Estimate buy/sell volume using close position in range
    const range = candle.high - candle.low;
    if (range > 0) {
      const buyRatio = (candle.close - candle.low) / range;
      totalBuyVolume += candle.volume * buyRatio;
      totalSellVolume += candle.volume * (1 - buyRatio);
    }
  }
  
  const priceRange = maxHigh - minLow;
  const bucketSize = priceRange / numBuckets;
  
  // Initialize buckets
  const levels: VolumeProfileLevel[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const priceLevel = minLow + (i + 0.5) * bucketSize;
    levels.push({
      priceLevel,
      volume: 0,
      buyVolume: 0,
      sellVolume: 0,
      delta: 0,
      percent: 0
    });
  }
  
  // Distribute volume to buckets
  for (const candle of candles) {
    const range = candle.high - candle.low;
    const buyRatio = range > 0 ? (candle.close - candle.low) / range : 0.5;
    
    // Distribute volume across price range touched by this candle
    for (let i = 0; i < numBuckets; i++) {
      const bucketLow = minLow + i * bucketSize;
      const bucketHigh = bucketLow + bucketSize;
      
      if (candle.low <= bucketHigh && candle.high >= bucketLow) {
        // Candle touches this bucket
        const overlap = Math.min(candle.high, bucketHigh) - Math.max(candle.low, bucketLow);
        const contribution = range > 0 ? (overlap / range) * candle.volume : candle.volume / numBuckets;
        
        levels[i].volume += contribution;
        levels[i].buyVolume += contribution * buyRatio;
        levels[i].sellVolume += contribution * (1 - buyRatio);
      }
    }
  }
  
  // Calculate delta and percent for each level
  let maxVolume = 0;
  let pocIndex = 0;
  
  for (let i = 0; i < levels.length; i++) {
    levels[i].delta = levels[i].buyVolume - levels[i].sellVolume;
    levels[i].percent = totalVolume > 0 ? (levels[i].volume / totalVolume) * 100 : 0;
    
    if (levels[i].volume > maxVolume) {
      maxVolume = levels[i].volume;
      pocIndex = i;
    }
  }
  
  const poc = levels[pocIndex].priceLevel;
  const pocVolume = levels[pocIndex].volume;
  
  // Calculate Value Area (70% of volume around POC)
  const targetVolume = totalVolume * valueAreaPercent;
  let accumulatedVolume = levels[pocIndex].volume;
  let vahIndex = pocIndex;
  let valIndex = pocIndex;
  
  while (accumulatedVolume < targetVolume && (vahIndex < numBuckets - 1 || valIndex > 0)) {
    const volumeAbove = vahIndex < numBuckets - 1 ? levels[vahIndex + 1].volume : 0;
    const volumeBelow = valIndex > 0 ? levels[valIndex - 1].volume : 0;
    
    if (volumeAbove >= volumeBelow && vahIndex < numBuckets - 1) {
      vahIndex++;
      accumulatedVolume += levels[vahIndex].volume;
    } else if (valIndex > 0) {
      valIndex--;
      accumulatedVolume += levels[valIndex].volume;
    } else {
      break;
    }
  }
  
  const valueAreaHigh = levels[vahIndex].priceLevel + bucketSize / 2;
  const valueAreaLow = levels[valIndex].priceLevel - bucketSize / 2;
  
  // Find HVN and LVN
  const avgVolume = totalVolume / numBuckets;
  const hvn: number[] = [];
  const lvn: number[] = [];
  
  for (let i = 1; i < levels.length - 1; i++) {
    const isLocalMax = levels[i].volume > levels[i - 1].volume && levels[i].volume > levels[i + 1].volume;
    const isLocalMin = levels[i].volume < levels[i - 1].volume && levels[i].volume < levels[i + 1].volume;
    
    if (isLocalMax && levels[i].volume > avgVolume * 1.5) {
      hvn.push(levels[i].priceLevel);
    }
    if (isLocalMin && levels[i].volume < avgVolume * 0.5) {
      lvn.push(levels[i].priceLevel);
    }
  }
  
  return {
    levels,
    poc,
    pocVolume,
    valueAreaHigh,
    valueAreaLow,
    hvn,
    lvn,
    totalVolume,
    buyPercent: totalVolume > 0 ? (totalBuyVolume / totalVolume) * 100 : 50,
    sellPercent: totalVolume > 0 ? (totalSellVolume / totalVolume) * 100 : 50
  };
}

// ==========================================================
// CUMULATIVE VOLUME DELTA (CVD)
// ==========================================================

/**
 * Cumulative Volume Delta
 * Tracks buying vs selling pressure over time
 * 
 * Delta = Buying Volume - Selling Volume
 * CVD = Cumulative sum of Delta
 * 
 * Rising CVD + Rising Price = Strong uptrend
 * Falling CVD + Rising Price = Bearish divergence (distribution)
 * Rising CVD + Falling Price = Bullish divergence (accumulation)
 * 
 * @param candles - OHLCV data
 * @param lookback - Lookback for trend detection (default: 20)
 */
export function calculateCVD(
  candles: OHLCV[],
  lookback: number = 20
): CVDResult {
  const nullResult: CVDResult = {
    cvd: 0,
    cvdArray: [],
    delta: 0,
    deltaArray: [],
    trend: 'neutral',
    divergence: null,
    signal: 'neutral'
  };
  
  if (candles.length < 5) return nullResult;
  
  const deltaArray: number[] = [];
  const cvdArray: number[] = [];
  let cvd = 0;
  
  for (const candle of candles) {
    const range = candle.high - candle.low;
    
    let delta: number;
    if (range === 0) {
      delta = 0;
    } else {
      // Delta = (Close - Low) / Range * Volume (buying) - (High - Close) / Range * Volume (selling)
      const buyingPressure = ((candle.close - candle.low) / range) * candle.volume;
      const sellingPressure = ((candle.high - candle.close) / range) * candle.volume;
      delta = buyingPressure - sellingPressure;
    }
    
    deltaArray.push(delta);
    cvd += delta;
    cvdArray.push(cvd);
  }
  
  const currentDelta = deltaArray[deltaArray.length - 1];
  const currentCVD = cvdArray[cvdArray.length - 1];
  
  // Determine trend
  let trend: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
  
  if (cvdArray.length >= lookback) {
    const cvdChange = currentCVD - cvdArray[cvdArray.length - lookback];
    
    if (cvdChange > 0) {
      trend = 'accumulation';
    } else if (cvdChange < 0) {
      trend = 'distribution';
    }
  }
  
  // Check for divergence
  let divergence: 'bullish' | 'bearish' | null = null;
  
  if (candles.length >= lookback) {
    const priceChange = candles[candles.length - 1].close - candles[candles.length - lookback].close;
    const cvdChange = currentCVD - cvdArray[cvdArray.length - lookback];
    
    // Bullish divergence: Price falling but CVD rising
    if (priceChange < 0 && cvdChange > 0) {
      divergence = 'bullish';
    }
    // Bearish divergence: Price rising but CVD falling
    else if (priceChange > 0 && cvdChange < 0) {
      divergence = 'bearish';
    }
  }
  
  // Generate signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (divergence === 'bullish') {
    signal = 'bullish';
  } else if (divergence === 'bearish') {
    signal = 'bearish';
  } else if (trend === 'accumulation' && currentDelta > 0) {
    signal = 'bullish';
  } else if (trend === 'distribution' && currentDelta < 0) {
    signal = 'bearish';
  }
  
  return {
    cvd: currentCVD,
    cvdArray,
    delta: currentDelta,
    deltaArray,
    trend,
    divergence,
    signal
  };
}

// ==========================================================
// KLINGER VOLUME OSCILLATOR
// ==========================================================

/**
 * Klinger Volume Oscillator (KVO)
 * Advanced trend-volume indicator
 * 
 * Formula:
 * Trend = +1 if (H+L+C) > previous (H+L+C), else -1
 * dm = High - Low
 * cm = Previous cm + dm if Trend = Previous Trend, else dm + Previous dm
 * VF = Volume × |2×(dm/cm) - 1| × Trend × 100
 * KVO = EMA(VF, 34) - EMA(VF, 55)
 * Signal = EMA(KVO, 13)
 * 
 * @param candles - OHLCV data
 * @param fastPeriod - Fast EMA period (default: 34)
 * @param slowPeriod - Slow EMA period (default: 55)
 * @param signalPeriod - Signal EMA period (default: 13)
 */
export function calculateKlinger(
  candles: OHLCV[],
  fastPeriod: number = 34,
  slowPeriod: number = 55,
  signalPeriod: number = 13
): KlingerResult {
  const nullResult: KlingerResult = {
    kvo: 0,
    signal: 0,
    histogram: 0,
    kvoArray: [],
    signalArray: [],
    trend: 'neutral',
    crossover: false,
    crossoverType: null
  };
  
  if (candles.length < slowPeriod + signalPeriod) return nullResult;
  
  // Calculate HLC and Trend
  const hlc: number[] = candles.map(c => c.high + c.low + c.close);
  const trend: number[] = [1]; // First bar default to 1
  
  for (let i = 1; i < candles.length; i++) {
    trend.push(hlc[i] > hlc[i - 1] ? 1 : -1);
  }
  
  // Calculate dm and cm
  const dm: number[] = candles.map(c => c.high - c.low);
  const cm: number[] = [dm[0]];
  
  for (let i = 1; i < candles.length; i++) {
    if (trend[i] === trend[i - 1]) {
      cm.push(cm[i - 1] + dm[i]);
    } else {
      cm.push(dm[i - 1] + dm[i]);
    }
  }
  
  // Calculate Volume Force (VF)
  const vf: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const cmValue = cm[i] || 0.0001; // Avoid division by zero
    const vfValue = candles[i].volume * Math.abs(2 * (dm[i] / cmValue) - 1) * trend[i] * 100;
    vf.push(vfValue);
  }
  
  // Calculate KVO = EMA(VF, fast) - EMA(VF, slow)
  const emaFast = calculateEMAArray(vf, fastPeriod);
  const emaSlow = calculateEMAArray(vf, slowPeriod);
  
  if (emaFast.length === 0 || emaSlow.length === 0) return nullResult;
  
  // Fill initial period with null to align with candles length
  const kvoArray: (number | null)[] = new Array(slowPeriod - 1).fill(null);
  const startDiff = slowPeriod - fastPeriod;
  
  for (let i = 0; i < emaSlow.length; i++) {
    const fastIdx = i + startDiff;
    if (fastIdx >= 0 && fastIdx < emaFast.length) {
      kvoArray.push(emaFast[fastIdx] - emaSlow[i]);
    }
  }
  
  if (kvoArray.filter(v => v !== null).length < signalPeriod) return nullResult;
  
  // Calculate Signal = EMA(KVO, signal)
  const kvoNumbers = kvoArray.filter((v): v is number => v !== null);
  const signalRaw = calculateEMAArray(kvoNumbers, signalPeriod);
  
  // Align signal array with kvo array
  const signalArray: (number | null)[] = new Array(slowPeriod - 1 + signalPeriod - 1).fill(null);
  for (const val of signalRaw) {
    signalArray.push(val);
  }
  
  if (signalRaw.length === 0) return nullResult;
  
  const currentKVO = kvoNumbers[kvoNumbers.length - 1];
  const currentSignal = signalRaw[signalRaw.length - 1];
  const histogram = currentKVO - currentSignal;
  
  const prevKVO = kvoNumbers.length > 1 ? kvoNumbers[kvoNumbers.length - 2] : currentKVO;
  const prevSignal = signalRaw.length > 1 ? signalRaw[signalRaw.length - 2] : currentSignal;
  
  // Detect crossover
  let crossover = false;
  let crossoverType: 'bullish' | 'bearish' | null = null;
  
  if (prevKVO <= prevSignal && currentKVO > currentSignal) {
    crossover = true;
    crossoverType = 'bullish';
  } else if (prevKVO >= prevSignal && currentKVO < currentSignal) {
    crossover = true;
    crossoverType = 'bearish';
  }
  
  // Determine trend
  let trendSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (currentKVO > currentSignal && currentKVO > 0) {
    trendSignal = 'bullish';
  } else if (currentKVO < currentSignal && currentKVO < 0) {
    trendSignal = 'bearish';
  }
  
  return {
    kvo: currentKVO,
    signal: currentSignal,
    histogram,
    kvoArray,
    signalArray,
    trend: trendSignal,
    crossover,
    crossoverType
  };
}

// ==========================================================
// MONEY FLOW INDEX (MFI) - مؤشر تدفق الأموال
// ==========================================================

/**
 * Money Flow Index (MFI)
 * Volume-weighted RSI - measures buying/selling pressure
 * 
 * Formula:
 * Typical Price = (H + L + C) / 3
 * Raw Money Flow = TP × Volume
 * Money Flow Ratio = Positive MF / Negative MF
 * MFI = 100 - (100 / (1 + Money Flow Ratio))
 * 
 * Overbought: > 80, Oversold: < 20
 * 
 * @param candles - OHLCV data
 * @param period - MFI period (default: 14)
 */
export function calculateMFI(
  candles: OHLCV[],
  period: number = 14
): MFIResult {
  const nullResult: MFIResult = {
    value: null,
    signal: 'neutral',
    strength: 50,
    mfi: 50,
    mfiArray: [],
    overbought: false,
    oversold: false,
    divergence: null
  };
  
  if (candles.length < period + 1) return nullResult;
  
  // Calculate Typical Price and Raw Money Flow
  const tp: number[] = candles.map(c => (c.high + c.low + c.close) / 3);
  const rawMF: number[] = candles.map((c, i) => tp[i] * c.volume);
  
  // Fill initial period with null
  const mfiArray: (number | null)[] = new Array(period).fill(null);
  
  for (let i = period; i < candles.length; i++) {
    let positiveMF = 0;
    let negativeMF = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) {
        positiveMF += rawMF[j];
      } else if (tp[j] < tp[j - 1]) {
        negativeMF += rawMF[j];
      }
    }
    
    const mfRatio = negativeMF === 0 ? 100 : positiveMF / negativeMF;
    const mfi = 100 - (100 / (1 + mfRatio));
    mfiArray.push(mfi);
  }
  
  if (mfiArray.length === 0) return nullResult;
  
  // Get last non-null value
  const validMFI = mfiArray.filter((v): v is number => v !== null);
  if (validMFI.length === 0) return nullResult;
  
  const currentMFI = validMFI[validMFI.length - 1];
  const overbought = currentMFI > 80;
  const oversold = currentMFI < 20;
  
  // Check for divergence
  let divergence: 'bullish' | 'bearish' | null = null;
  
  if (validMFI.length >= 10) {
    const priceChange = candles[candles.length - 1].close - candles[candles.length - 10].close;
    const mfiChange = currentMFI - validMFI[validMFI.length - 10];
    
    if (priceChange < 0 && mfiChange > 0 && currentMFI < 40) {
      divergence = 'bullish';
    } else if (priceChange > 0 && mfiChange < 0 && currentMFI > 60) {
      divergence = 'bearish';
    }
  }
  
  // Generate signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  if (oversold) {
    signal = 'bullish';
    strength = 70 + (20 - currentMFI);
  } else if (overbought) {
    signal = 'bearish';
    strength = 70 + (currentMFI - 80);
  } else if (divergence === 'bullish') {
    signal = 'bullish';
    strength = 75;
  } else if (divergence === 'bearish') {
    signal = 'bearish';
    strength = 75;
  }
  
  return {
    value: currentMFI,
    signal,
    strength: Math.min(100, strength),
    mfi: currentMFI,
    mfiArray,
    overbought,
    oversold,
    divergence
  };
}

// ==========================================================
// SMART MONEY VOLUME ANALYSIS
// ==========================================================

/**
 * Smart Money Volume Analysis
 * Detects institutional activity through volume anomalies and absorption
 * 
 * Features:
 * - Delta analysis (buying vs selling pressure)
 * - Volume anomaly detection (Z-score > 2)
 * - Absorption detection (high volume + small price movement)
 * - CVD trend analysis
 * 
 * @param candles - OHLCV data
 * @param lookbackPeriod - Lookback for statistics (default: 20)
 * @param anomalyThreshold - Z-score threshold (default: 2.0)
 * @param absorptionATRThreshold - ATR threshold for absorption (default: 0.5)
 */
export function analyzeSmartMoneyVolume(
  candles: OHLCV[],
  lookbackPeriod: number = 20,
  anomalyThreshold: number = 2.0,
  absorptionATRThreshold: number = 0.5
): SmartMoneyVolumeResult {
  const nullResult: SmartMoneyVolumeResult = {
    delta: 0,
    deltaPct: 0,
    cvd: 0,
    cvdArray: [],
    isVolumeAnomaly: false,
    volumeZScore: 0,
    anomalyType: null,
    isAbsorption: false,
    absorptionRatio: 0,
    absorptionType: null,
    signal: 'neutral',
    strength: 50
  };
  
  if (candles.length < lookbackPeriod + 1) return nullResult;
  
  // Calculate Delta and CVD
  const deltaArray: number[] = [];
  const cvdArray: number[] = [];
  let cvd = 0;
  
  for (const candle of candles) {
    const range = candle.high - candle.low;
    let delta: number;
    
    if (range === 0) {
      delta = 0;
    } else {
      const buyingPressure = ((candle.close - candle.low) / range) * candle.volume;
      const sellingPressure = ((candle.high - candle.close) / range) * candle.volume;
      delta = buyingPressure - sellingPressure;
    }
    
    deltaArray.push(delta);
    cvd += delta;
    cvdArray.push(cvd);
  }
  
  const currentDelta = deltaArray[deltaArray.length - 1];
  const currentVolume = candles[candles.length - 1].volume;
  const deltaPct = currentVolume > 0 ? (currentDelta / currentVolume) * 100 : 0;
  
  // Calculate Volume Statistics
  const recentVolumes = candles.slice(-lookbackPeriod).map(c => c.volume);
  const volumeMean = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const volumeVariance = recentVolumes.reduce((sum, v) => sum + Math.pow(v - volumeMean, 2), 0) / recentVolumes.length;
  const volumeStdDev = Math.sqrt(volumeVariance);
  
  const volumeZScore = volumeStdDev > 0 ? (currentVolume - volumeMean) / volumeStdDev : 0;
  const isVolumeAnomaly = volumeZScore > anomalyThreshold;
  
  // Determine anomaly type
  let anomalyType: 'buying' | 'selling' | 'neutral' | null = null;
  if (isVolumeAnomaly) {
    if (deltaPct > 20) anomalyType = 'buying';
    else if (deltaPct < -20) anomalyType = 'selling';
    else anomalyType = 'neutral';
  }
  
  // Calculate ATR for absorption detection
  let atr = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    if (i < 1) continue;
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    atr += tr;
  }
  atr /= Math.min(14, candles.length - 1);
  
  // Check for Absorption
  const currentCandle = candles[candles.length - 1];
  const priceChange = Math.abs(currentCandle.close - currentCandle.open);
  const normalizedPriceChange = atr > 0 ? priceChange / atr : 0;
  
  const isAbsorption = isVolumeAnomaly && normalizedPriceChange < absorptionATRThreshold;
  const absorptionRatio = priceChange > 0 ? currentVolume / priceChange : 0;
  
  // Determine absorption type
  let absorptionType: 'support' | 'resistance' | null = null;
  if (isAbsorption) {
    const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
    const upperWick = currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
    
    if (lowerWick > upperWick * 1.5) absorptionType = 'support';
    else if (upperWick > lowerWick * 1.5) absorptionType = 'resistance';
  }
  
  // Generate Signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;
  
  const cvdChange = cvdArray.length >= 5 
    ? cvdArray[cvdArray.length - 1] - cvdArray[cvdArray.length - 5]
    : 0;
  
  if (isVolumeAnomaly && anomalyType === 'buying') {
    signal = 'bullish';
    strength = Math.min(95, 70 + volumeZScore * 5);
  } else if (isVolumeAnomaly && anomalyType === 'selling') {
    signal = 'bearish';
    strength = Math.min(95, 70 + volumeZScore * 5);
  } else if (isAbsorption && absorptionType === 'support') {
    signal = 'bullish';
    strength = 75;
  } else if (isAbsorption && absorptionType === 'resistance') {
    signal = 'bearish';
    strength = 75;
  } else if (cvdChange > 0 && deltaPct > 10) {
    signal = 'bullish';
    strength = 60;
  } else if (cvdChange < 0 && deltaPct < -10) {
    signal = 'bearish';
    strength = 60;
  }
  
  return {
    delta: Math.round(currentDelta),
    deltaPct: Math.round(deltaPct * 10) / 10,
    cvd: Math.round(cvd),
    cvdArray,
    isVolumeAnomaly,
    volumeZScore: Math.round(volumeZScore * 100) / 100,
    anomalyType,
    isAbsorption,
    absorptionRatio: Math.round(absorptionRatio),
    absorptionType,
    signal,
    strength
  };
}

// ==========================================================
// ANCHORED VWAP
// ==========================================================

/**
 * Anchored VWAP - VWAP from specific anchor point
 * 
 * @param candles - OHLCV data
 * @param anchorIndex - Starting index for VWAP calculation
 */
export function calculateAnchoredVWAP(
  candles: OHLCV[],
  anchorIndex: number
): VWAPResult {
  if (anchorIndex < 0 || anchorIndex >= candles.length) {
    return calculateVWAP(candles);
  }
  
  const anchoredCandles = candles.slice(anchorIndex);
  return calculateVWAP(anchoredCandles);
}

// ==========================================================
// EXPORTS
// ==========================================================

export const AdvancedVolume = {
  calculateVWAP,
  calculateAnchoredVWAP,
  calculateVolumeProfile,
  calculateCVD,
  calculateKlinger,
  calculateMFI,
  analyzeSmartMoneyVolume
};

export default AdvancedVolume;
