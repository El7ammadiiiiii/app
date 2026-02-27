/**
 * Unified Technical Indicators Library
 * مكتبة المؤشرات الفنية الموحدة
 * 
 * جميع المؤشرات في ملف واحد للأداء الأفضل
 */

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// MACD - Moving Average Convergence Divergence
// ============================================================================

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  values: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  crossover: 'bullish' | 'bearish' | 'none';
  trend: 'bullish' | 'bearish' | 'neutral';
  tradingSignal: 'buy' | 'sell' | 'none';
}

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < values.length; i++) {
    sum += values[i];
  }
  ema[period - 1] = sum / period;
  
  for (let i = period; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }
  
  return ema;
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  
  if (closes.length < slowPeriod + signalPeriod) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
      values: { macd: [], signal: [], histogram: [] },
      crossover: 'none',
      trend: 'neutral',
      tradingSignal: 'none'
    };
  }

  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = slowPeriod - 1; i < closes.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  const histogram: number[] = [];
  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  const current = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const currentHist = histogram[histogram.length - 1];
  const prevHist = histogram[histogram.length - 2] || 0;

  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevHist <= 0 && currentHist > 0) crossover = 'bullish';
  else if (prevHist >= 0 && currentHist < 0) crossover = 'bearish';

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (current > 0 && currentHist > 0) trend = 'bullish';
  else if (current < 0 && currentHist < 0) trend = 'bearish';

  let tradingSignal: 'buy' | 'sell' | 'none' = 'none';
  if (crossover === 'bullish' && current < 0) tradingSignal = 'buy';
  else if (crossover === 'bearish' && current > 0) tradingSignal = 'sell';

  return {
    macd: current,
    signal: currentSignal,
    histogram: currentHist,
    values: { macd: macdLine, signal: signalLine, histogram },
    crossover,
    trend,
    tradingSignal
  };
}

// ============================================================================
// STOCHASTIC OSCILLATOR
// ============================================================================

export interface StochasticResult {
  k: number;
  d: number;
  values: {
    k: number[];
    d: number[];
  };
  zone: 'oversold' | 'overbought' | 'neutral';
  crossover: 'bullish' | 'bearish' | 'none';
}

export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  kSlowing: number = 3,
  dPeriod: number = 3
): StochasticResult {
  
  if (closes.length < kPeriod + kSlowing + dPeriod) {
    return {
      k: 50,
      d: 50,
      values: { k: [], d: [] },
      zone: 'neutral',
      crossover: 'none'
    };
  }

  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    
    if (highestHigh === lowestLow) {
      rawK.push(50);
    } else {
      const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      rawK.push(k);
    }
  }

  const kValues: number[] = [];
  for (let i = kSlowing - 1; i < rawK.length; i++) {
    const slice = rawK.slice(i - kSlowing + 1, i + 1);
    const k = slice.reduce((sum, val) => sum + val, 0) / kSlowing;
    kValues.push(k);
  }

  const dValues: number[] = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const slice = kValues.slice(i - dPeriod + 1, i + 1);
    const d = slice.reduce((sum, val) => sum + val, 0) / dPeriod;
    dValues.push(d);
  }

  const currentK = kValues[kValues.length - 1];
  const currentD = dValues[dValues.length - 1];
  const prevK = kValues[kValues.length - 2];
  const prevD = dValues[dValues.length - 2];

  let zone: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (currentK <= 20 && currentD <= 20) zone = 'oversold';
  else if (currentK >= 80 && currentD >= 80) zone = 'overbought';

  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevK <= prevD && currentK > currentD) crossover = 'bullish';
  else if (prevK >= prevD && currentK < currentD) crossover = 'bearish';

  return {
    k: currentK,
    d: currentD,
    values: { k: kValues, d: dValues },
    zone,
    crossover
  };
}

// ============================================================================
// OBV - On Balance Volume
// ============================================================================

export interface OBVResult {
  value: number;
  values: number[];
  trend: 'rising' | 'falling' | 'stable';
  divergence: 'bullish' | 'bearish' | 'none';
  sma: number;
}

export function calculateOBV(
  closes: number[],
  volumes: number[],
  smaPeriod: number = 20
): OBVResult {
  
  if (closes.length < smaPeriod) {
    return {
      value: 0,
      values: [],
      trend: 'stable',
      divergence: 'none',
      sma: 0
    };
  }

  const obvValues: number[] = [0];
  let obv = 0;
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    obvValues.push(obv);
  }

  const smaSlice = obvValues.slice(-smaPeriod);
  const sma = smaSlice.reduce((sum, val) => sum + val, 0) / smaPeriod;

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (obvValues.length >= 5) {
    const recent = obvValues.slice(-5);
    const change = recent[recent.length - 1] - recent[0];
    if (change > 0) trend = 'rising';
    else if (change < 0) trend = 'falling';
  }

  let divergence: 'bullish' | 'bearish' | 'none' = 'none';
  if (obvValues.length >= 10 && closes.length >= 10) {
    const recentOBV = obvValues.slice(-10);
    const recentPrice = closes.slice(-10);
    const obvTrend = recentOBV[recentOBV.length - 1] - recentOBV[0];
    const priceTrend = recentPrice[recentPrice.length - 1] - recentPrice[0];
    
    if (obvTrend > 0 && priceTrend < 0) divergence = 'bullish';
    else if (obvTrend < 0 && priceTrend > 0) divergence = 'bearish';
  }

  return {
    value: obv,
    values: obvValues,
    trend,
    divergence,
    sma
  };
}

// ============================================================================
// ADX - Average Directional Index
// ============================================================================

export interface ADXResult {
  adx: number;
  plusDI: number;
  minusDI: number;
  values: {
    adx: number[];
    plusDI: number[];
    minusDI: number[];
  };
  trendStrength: 'strong' | 'moderate' | 'weak' | 'no_trend';
  trendDirection: 'bullish' | 'bearish' | 'neutral';
}

export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): ADXResult {
  
  if (closes.length < period * 2) {
    return {
      adx: 0,
      plusDI: 0,
      minusDI: 0,
      values: { adx: [], plusDI: [], minusDI: [] },
      trendStrength: 'no_trend',
      trendDirection: 'neutral'
    };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevHigh = highs[i - 1];
    const prevLow = lows[i - 1];
    const prevClose = closes[i - 1];

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    tr.push(Math.max(tr1, tr2, tr3));

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  const atr = calculateEMA(tr, period);
  const plusDI: number[] = [];
  const minusDI: number[] = [];

  for (let i = 0; i < atr.length; i++) {
    if (atr[i] !== 0) {
      plusDI.push((plusDM[i] / atr[i]) * 100);
      minusDI.push((minusDM[i] / atr[i]) * 100);
    } else {
      plusDI.push(0);
      minusDI.push(0);
    }
  }

  const dx: number[] = [];
  for (let i = 0; i < plusDI.length; i++) {
    const sum = plusDI[i] + minusDI[i];
    if (sum !== 0) {
      dx.push((Math.abs(plusDI[i] - minusDI[i]) / sum) * 100);
    } else {
      dx.push(0);
    }
  }

  const adxValues = calculateEMA(dx, period);
  const adx = adxValues[adxValues.length - 1];
  const currentPlusDI = plusDI[plusDI.length - 1];
  const currentMinusDI = minusDI[minusDI.length - 1];

  let trendStrength: 'strong' | 'moderate' | 'weak' | 'no_trend';
  if (adx >= 50) trendStrength = 'strong';
  else if (adx >= 25) trendStrength = 'moderate';
  else if (adx >= 20) trendStrength = 'weak';
  else trendStrength = 'no_trend';

  let trendDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (currentPlusDI > currentMinusDI) trendDirection = 'bullish';
  else if (currentMinusDI > currentPlusDI) trendDirection = 'bearish';

  return {
    adx,
    plusDI: currentPlusDI,
    minusDI: currentMinusDI,
    values: { adx: adxValues, plusDI, minusDI },
    trendStrength,
    trendDirection
  };
}

// ============================================================================
// MFI - Money Flow Index
// ============================================================================

export interface MFIResult {
  value: number;
  values: number[];
  zone: 'oversold' | 'overbought' | 'neutral';
  trend: 'rising' | 'falling' | 'stable';
  divergence: 'bullish' | 'bearish' | 'none';
}

export function calculateMFI(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period: number = 14,
  oversoldLevel: number = 20,
  overboughtLevel: number = 80
): MFIResult {
  
  if (closes.length < period + 1) {
    return {
      value: 50,
      values: [],
      zone: 'neutral',
      trend: 'stable',
      divergence: 'none'
    };
  }

  const typicalPrices: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  const rawMoneyFlow: number[] = [];
  for (let i = 0; i < typicalPrices.length; i++) {
    rawMoneyFlow.push(typicalPrices[i] * volumes[i]);
  }

  const mfiValues: number[] = [];
  for (let i = period; i < typicalPrices.length; i++) {
    let positiveMF = 0;
    let negativeMF = 0;

    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveMF += rawMoneyFlow[j];
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negativeMF += rawMoneyFlow[j];
      }
    }

    if (negativeMF === 0) {
      mfiValues.push(100);
    } else {
      const moneyRatio = positiveMF / negativeMF;
      const mfi = 100 - (100 / (1 + moneyRatio));
      mfiValues.push(mfi);
    }
  }

  const current = mfiValues[mfiValues.length - 1];

  let zone: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (current <= oversoldLevel) zone = 'oversold';
  else if (current >= overboughtLevel) zone = 'overbought';

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (mfiValues.length >= 5) {
    const recent = mfiValues.slice(-5);
    const change = recent[recent.length - 1] - recent[0];
    if (change > 5) trend = 'rising';
    else if (change < -5) trend = 'falling';
  }

  let divergence: 'bullish' | 'bearish' | 'none' = 'none';
  if (mfiValues.length >= 10 && closes.length >= 10) {
    const recentMFI = mfiValues.slice(-10);
    const recentPrice = closes.slice(-10);
    const mfiTrend = recentMFI[recentMFI.length - 1] - recentMFI[0];
    const priceTrend = recentPrice[recentPrice.length - 1] - recentPrice[0];
    
    if (mfiTrend > 0 && priceTrend < 0) divergence = 'bullish';
    else if (mfiTrend < 0 && priceTrend > 0) divergence = 'bearish';
  }

  return {
    value: current,
    values: mfiValues,
    zone,
    trend,
    divergence
  };
}

// ============================================================================
// CONNORS RSI
// ============================================================================

export interface ConnorsRSIResult {
  value: number;
  components: {
    rsi: number;
    upDownRSI: number;
    rocPercentile: number;
  };
  values: number[];
  zone: 'oversold' | 'overbought' | 'neutral';
  signal: 'buy' | 'sell' | 'none';
}

function calculateSimpleRSI(closes: number[], period: number): number[] {
  const rsi: number[] = [];
  
  for (let i = period; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateUpDownStreak(closes: number[]): number[] {
  const streak: number[] = [0];
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      streak.push(streak[i - 1] >= 0 ? streak[i - 1] + 1 : 1);
    } else if (closes[i] < closes[i - 1]) {
      streak.push(streak[i - 1] <= 0 ? streak[i - 1] - 1 : -1);
    } else {
      streak.push(0);
    }
  }
  
  return streak;
}

function calculatePercentileRank(values: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(50);
      continue;
    }
    
    const periodValues = values.slice(i - period + 1, i + 1);
    const current = values[i];
    const belowCount = periodValues.filter(v => v < current).length;
    const percentile = (belowCount / period) * 100;
    result.push(percentile);
  }
  
  return result;
}

export function calculateConnorsRSI(
  closes: number[],
  rsiPeriod: number = 3,
  upDownPeriod: number = 2,
  rocPeriod: number = 100
): ConnorsRSIResult {
  
  if (closes.length < rocPeriod) {
    return {
      value: 50,
      components: { rsi: 50, upDownRSI: 50, rocPercentile: 50 },
      values: [],
      zone: 'neutral',
      signal: 'none'
    };
  }

  const rsiValues = calculateSimpleRSI(closes, rsiPeriod);
  const streak = calculateUpDownStreak(closes);
  const upDownRSI = calculateSimpleRSI(streak, upDownPeriod);
  
  const roc: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    roc.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
  }
  const rocPercentile = calculatePercentileRank(roc, rocPeriod);

  const connorsValues: number[] = [];
  const minLength = Math.min(rsiValues.length, upDownRSI.length, rocPercentile.length);
  
  for (let i = 0; i < minLength; i++) {
    const crsi = (rsiValues[i] + upDownRSI[i] + rocPercentile[rocPercentile.length - minLength + i]) / 3;
    connorsValues.push(crsi);
  }

  const current = connorsValues[connorsValues.length - 1];
  const currentRSI = rsiValues[rsiValues.length - 1];
  const currentUpDown = upDownRSI[upDownRSI.length - 1];
  const currentROC = rocPercentile[rocPercentile.length - 1];

  let zone: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (current <= 15) zone = 'oversold';
  else if (current >= 85) zone = 'overbought';

  let signal: 'buy' | 'sell' | 'none' = 'none';
  if (zone === 'oversold') signal = 'buy';
  else if (zone === 'overbought') signal = 'sell';

  return {
    value: current,
    components: {
      rsi: currentRSI,
      upDownRSI: currentUpDown,
      rocPercentile: currentROC
    },
    values: connorsValues,
    zone,
    signal
  };
}

// ============================================================================
// LAGUERRE RSI
// ============================================================================

export interface LaguerreRSIResult {
  value: number;
  values: number[];
  zone: 'oversold' | 'overbought' | 'neutral';
  crossover: 'up' | 'down' | 'none';
  signal: 'buy' | 'sell' | 'none';
}

export function calculateLaguerreRSI(
  closes: number[],
  gamma: number = 0.5
): LaguerreRSIResult {
  
  if (closes.length < 10) {
    return {
      value: 50,
      values: [],
      zone: 'neutral',
      crossover: 'none',
      signal: 'none'
    };
  }

  const lrsiValues: number[] = [];
  let L0 = 0, L1 = 0, L2 = 0, L3 = 0;
  let L0_1 = 0, L1_1 = 0, L2_1 = 0, L3_1 = 0;
  
  for (let i = 0; i < closes.length; i++) {
    L0 = (1 - gamma) * closes[i] + gamma * L0_1;
    L1 = -gamma * L0 + L0_1 + gamma * L1_1;
    L2 = -gamma * L1 + L1_1 + gamma * L2_1;
    L3 = -gamma * L2 + L2_1 + gamma * L3_1;
    
    L0_1 = L0;
    L1_1 = L1;
    L2_1 = L2;
    L3_1 = L3;
    
    const cu = (L0 > L1 ? L0 - L1 : 0) + (L1 > L2 ? L1 - L2 : 0) + (L2 > L3 ? L2 - L3 : 0);
    const cd = (L0 < L1 ? L1 - L0 : 0) + (L1 < L2 ? L2 - L1 : 0) + (L2 < L3 ? L3 - L2 : 0);
    
    let lrsi = 50;
    if (cu + cd !== 0) {
      lrsi = (cu / (cu + cd)) * 100;
    }
    
    lrsiValues.push(lrsi);
  }

  const current = lrsiValues[lrsiValues.length - 1];
  const prev = lrsiValues[lrsiValues.length - 2];

  let zone: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (current <= 20) zone = 'oversold';
  else if (current >= 80) zone = 'overbought';

  let crossover: 'up' | 'down' | 'none' = 'none';
  if (prev <= 20 && current > 20) crossover = 'up';
  else if (prev >= 80 && current < 80) crossover = 'down';

  let signal: 'buy' | 'sell' | 'none' = 'none';
  if (crossover === 'up') signal = 'buy';
  else if (crossover === 'down') signal = 'sell';

  return {
    value: current,
    values: lrsiValues,
    zone,
    crossover,
    signal
  };
}

// ============================================================================
// VWAP - Volume Weighted Average Price
// ============================================================================

export interface VWAPResult {
  vwap: number;
  upperBand: number;
  lowerBand: number;
  values: number[];
  deviation: number;
  pricePosition: 'above' | 'below' | 'at';
  signal: 'buy' | 'sell' | 'none';
}

export function calculateVWAP(
  data: OHLCV[],
  bandMultiplier: number = 2
): VWAPResult {
  
  if (data.length < 2) {
    return {
      vwap: data[0]?.close || 0,
      upperBand: 0,
      lowerBand: 0,
      values: [],
      deviation: 0,
      pricePosition: 'at',
      signal: 'none'
    };
  }

  const vwapValues: number[] = [];
  const typicalPrices: number[] = [];
  
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    typicalPrices.push(typicalPrice);
    
    cumulativeTPV += typicalPrice * data[i].volume;
    cumulativeVolume += data[i].volume;
    
    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;
    vwapValues.push(vwap);
  }

  const currentVWAP = vwapValues[vwapValues.length - 1];
  const currentPrice = data[data.length - 1].close;

  let sumSquaredDiff = 0;
  for (let i = 0; i < typicalPrices.length; i++) {
    const diff = typicalPrices[i] - vwapValues[i];
    sumSquaredDiff += diff * diff;
  }
  const stdDev = Math.sqrt(sumSquaredDiff / typicalPrices.length);

  const upperBand = currentVWAP + (stdDev * bandMultiplier);
  const lowerBand = currentVWAP - (stdDev * bandMultiplier);

  let pricePosition: 'above' | 'below' | 'at' = 'at';
  const threshold = currentVWAP * 0.001;
  
  if (currentPrice > currentVWAP + threshold) pricePosition = 'above';
  else if (currentPrice < currentVWAP - threshold) pricePosition = 'below';

  let signal: 'buy' | 'sell' | 'none' = 'none';
  if (currentPrice < lowerBand) signal = 'buy';
  else if (currentPrice > upperBand) signal = 'sell';

  return {
    vwap: currentVWAP,
    upperBand,
    lowerBand,
    values: vwapValues,
    deviation: stdDev,
    pricePosition,
    signal
  };
}

// ============================================================================
// CVD - Cumulative Volume Delta
// ============================================================================

export interface CVDResult {
  value: number;
  delta: number;
  values: number[];
  deltaValues: number[];
  trend: 'bullish' | 'bearish' | 'neutral';
  divergence: 'bullish' | 'bearish' | 'none';
  signal: 'buy' | 'sell' | 'none';
}

export function calculateCVD(data: OHLCV[]): CVDResult {
  
  if (data.length < 2) {
    return {
      value: 0,
      delta: 0,
      values: [],
      deltaValues: [],
      trend: 'neutral',
      divergence: 'none',
      signal: 'none'
    };
  }

  const cvdValues: number[] = [];
  const deltaValues: number[] = [];
  
  let cvd = 0;

  for (let i = 0; i < data.length; i++) {
    const { open, high, low, close, volume } = data[i];
    
    let delta = 0;
    if (high !== low) {
      const range = high - low;
      const buyRatio = (close - low) / range;
      const buyVolume = volume * buyRatio;
      const sellVolume = volume * (1 - buyRatio);
      delta = buyVolume - sellVolume;
    }
    
    cvd += delta;
    cvdValues.push(cvd);
    deltaValues.push(delta);
  }

  const current = cvdValues[cvdValues.length - 1];
  const currentDelta = deltaValues[deltaValues.length - 1];

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (cvdValues.length >= 10) {
    const recent = cvdValues.slice(-10);
    const change = recent[recent.length - 1] - recent[0];
    if (change > 0) trend = 'bullish';
    else if (change < 0) trend = 'bearish';
  }

  let divergence: 'bullish' | 'bearish' | 'none' = 'none';
  if (cvdValues.length >= 20 && data.length >= 20) {
    const recentCVD = cvdValues.slice(-20);
    const recentPrice = data.slice(-20).map(d => d.close);
    const cvdTrend = recentCVD[recentCVD.length - 1] - recentCVD[0];
    const priceTrend = recentPrice[recentPrice.length - 1] - recentPrice[0];
    
    if (cvdTrend > 0 && priceTrend < 0) divergence = 'bullish';
    else if (cvdTrend < 0 && priceTrend > 0) divergence = 'bearish';
  }

  let signal: 'buy' | 'sell' | 'none' = 'none';
  if (trend === 'bullish' && currentDelta > 0) signal = 'buy';
  else if (trend === 'bearish' && currentDelta < 0) signal = 'sell';

  return {
    value: current,
    delta: currentDelta,
    values: cvdValues,
    deltaValues,
    trend,
    divergence,
    signal
  };
}

// ============================================================================
// KLINGER VOLUME OSCILLATOR
// ============================================================================

export interface KlingerResult {
  kvo: number;
  signal: number;
  histogram: number;
  values: {
    kvo: number[];
    signal: number[];
  };
  crossover: 'bullish' | 'bearish' | 'none';
  trend: 'bullish' | 'bearish' | 'neutral';
  tradingSignal: 'buy' | 'sell' | 'none';
}

export function calculateKlinger(
  data: OHLCV[],
  fastPeriod: number = 34,
  slowPeriod: number = 55,
  signalPeriod: number = 13
): KlingerResult {
  
  if (data.length < slowPeriod + signalPeriod) {
    return {
      kvo: 0,
      signal: 0,
      histogram: 0,
      values: { kvo: [], signal: [] },
      crossover: 'none',
      trend: 'neutral',
      tradingSignal: 'none'
    };
  }

  const vf: number[] = [];
  let prevTrend = 0;
  let cm = 0;

  for (let i = 0; i < data.length; i++) {
    const { high, low, close, volume } = data[i];
    const hlc = high + low + close;
    
    let trend = 0;
    if (i > 0) {
      const prevHLC = data[i - 1].high + data[i - 1].low + data[i - 1].close;
      trend = hlc > prevHLC ? 1 : -1;
    }
    
    const dm = high - low;
    
    if (trend === prevTrend) {
      cm = cm + dm;
    } else {
      cm = dm;
    }
    
    let volumeForce = 0;
    if (cm !== 0) {
      volumeForce = volume * Math.abs(2 * (dm / cm) - 1) * trend * 100;
    }
    
    vf.push(volumeForce);
    prevTrend = trend;
  }

  const emaFast = calculateEMA(vf, fastPeriod);
  const emaSlow = calculateEMA(vf, slowPeriod);
  
  const kvoLine: number[] = [];
  for (let i = slowPeriod - 1; i < vf.length; i++) {
    kvoLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = calculateEMA(kvoLine, signalPeriod);

  const currentKVO = kvoLine[kvoLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const histogram = currentKVO - currentSignal;
  const prevHistogram = (kvoLine[kvoLine.length - 2] || 0) - (signalLine[signalLine.length - 2] || 0);

  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevHistogram <= 0 && histogram > 0) crossover = 'bullish';
  else if (prevHistogram >= 0 && histogram < 0) crossover = 'bearish';

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (currentKVO > 0) trend = 'bullish';
  else if (currentKVO < 0) trend = 'bearish';

  let tradingSignal: 'buy' | 'sell' | 'none' = 'none';
  if (crossover === 'bullish') tradingSignal = 'buy';
  else if (crossover === 'bearish') tradingSignal = 'sell';

  return {
    kvo: currentKVO,
    signal: currentSignal,
    histogram,
    values: { kvo: kvoLine, signal: signalLine },
    crossover,
    trend,
    tradingSignal
  };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const UnifiedIndicators = {
  calculateMACD,
  calculateStochastic,
  calculateOBV,
  calculateADX,
  calculateMFI,
  calculateConnorsRSI,
  calculateLaguerreRSI,
  calculateVWAP,
  calculateCVD,
  calculateKlinger
};
