/**
 * ML Feature Engineering - هندسة المميزات للتعلم الآلي
 * 
 * 50+ Elite features used by quantitative hedge funds:
 * - Price-based features (returns, momentum, volatility)
 * - Technical indicator features (RSI, MACD, Bollinger)
 * - Volume features (OBV, VWAP distance, volume profile)
 * - Candlestick features (body, wicks, patterns)
 * - Statistical features (skewness, kurtosis, entropy)
 * - Regime detection (Hurst exponent, ADX)
 * - Time features (hour, day, seasonality)
 */

import { OHLCV, calculateSMA, calculateEMA, calculateATR, calculateRSI, calculateMACD, calculateADX } from './technical';
import { calculateVWAP, calculateCVD } from './advanced-volume';

// ==========================================================
// INTERFACES
// ==========================================================

export interface FeatureSet {
  // Price Features (10)
  returns_1: number;
  returns_5: number;
  returns_10: number;
  returns_20: number;
  log_returns: number;
  price_momentum: number;
  price_acceleration: number;
  gap: number;
  high_low_range: number;
  true_range: number;
  
  // Volatility Features (8)
  volatility_5: number;
  volatility_10: number;
  volatility_20: number;
  volatility_ratio: number;
  atr_14: number;
  atr_ratio: number;
  bollinger_width: number;
  bollinger_position: number;
  
  // Moving Average Features (10)
  price_sma_5_ratio: number;
  price_sma_10_ratio: number;
  price_sma_20_ratio: number;
  price_sma_50_ratio: number;
  price_ema_9_ratio: number;
  price_ema_21_ratio: number;
  sma_5_slope: number;
  sma_20_slope: number;
  ma_cross_5_20: number;
  ma_cross_9_21: number;
  
  // Oscillator Features (8)
  rsi_14: number;
  rsi_7: number;
  rsi_21: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  macd_histogram_slope: number;
  stoch_k: number;
  
  // Trend Features (6)
  adx: number;
  plus_di: number;
  minus_di: number;
  trend_strength: number;
  trend_direction: number;
  di_crossover: number;
  
  // Volume Features (8)
  volume_ratio: number;
  volume_sma_5_ratio: number;
  obv_slope: number;
  cvd_slope: number;
  vwap_distance: number;
  price_volume_trend: number;
  volume_momentum: number;
  volume_volatility: number;
  
  // Candlestick Features (6)
  body_size: number;
  upper_shadow: number;
  lower_shadow: number;
  body_to_range: number;
  candle_direction: number;
  doji_score: number;
  
  // Statistical Features (6)
  skewness: number;
  kurtosis: number;
  hurst_exponent: number;
  entropy: number;
  autocorrelation: number;
  mean_reversion_score: number;
  
  // Time Features (4)
  hour_sin?: number;
  hour_cos?: number;
  day_sin?: number;
  day_cos?: number;
}

export interface NormalizedFeatureSet extends FeatureSet {
  normalized: boolean;
  normalizationType: 'minmax' | 'zscore' | 'robust';
}

export interface RegimeResult {
  regime: 'trending_up' | 'trending_down' | 'ranging' | 'volatile' | 'quiet';
  hurstExponent: number;
  adxValue: number;
  volatilityState: 'high' | 'low' | 'normal';
  momentum: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

// ==========================================================
// PRICE FEATURES - مميزات السعر
// ==========================================================

/**
 * Calculate returns over different periods
 */
function calculateReturns(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0;
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - period];
  return past !== 0 ? (current - past) / past : 0;
}

/**
 * Calculate log returns
 */
function calculateLogReturns(closes: number[]): number {
  if (closes.length < 2) return 0;
  const current = closes[closes.length - 1];
  const previous = closes[closes.length - 2];
  return previous > 0 && current > 0 ? Math.log(current / previous) : 0;
}

/**
 * Calculate price momentum (rate of change)
 */
function calculateMomentum(closes: number[], period: number = 10): number {
  return calculateReturns(closes, period);
}

/**
 * Calculate price acceleration (momentum of momentum)
 */
function calculateAcceleration(closes: number[], period: number = 5): number {
  if (closes.length < period * 2 + 1) return 0;
  const currentMomentum = calculateMomentum(closes, period);
  const pastCloses = closes.slice(0, -period);
  const pastMomentum = calculateMomentum(pastCloses, period);
  return currentMomentum - pastMomentum;
}

// ==========================================================
// VOLATILITY FEATURES - مميزات التقلب
// ==========================================================

/**
 * Calculate rolling volatility (standard deviation of returns)
 */
function calculateVolatility(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0;
  
  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    if (i > 0) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate Bollinger Band width and position
 */
function calculateBollingerFeatures(closes: number[], period: number = 20, stdDev: number = 2): { width: number; position: number } {
  if (closes.length < period) return { width: 0, position: 0.5 };
  
  const recentCloses = closes.slice(-period);
  const sma = recentCloses.reduce((a, b) => a + b, 0) / period;
  const variance = recentCloses.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  const upperBand = sma + stdDev * std;
  const lowerBand = sma - stdDev * std;
  const currentPrice = closes[closes.length - 1];
  
  const width = sma !== 0 ? (upperBand - lowerBand) / sma : 0;
  const position = (upperBand - lowerBand) !== 0 
    ? (currentPrice - lowerBand) / (upperBand - lowerBand) 
    : 0.5;
  
  return { width, position };
}

// ==========================================================
// STATISTICAL FEATURES - مميزات إحصائية
// ==========================================================

/**
 * Calculate skewness of returns
 */
function calculateSkewness(data: number[]): number {
  if (data.length < 3) return 0;
  
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const m2 = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const m3 = data.reduce((sum, x) => sum + Math.pow(x - mean, 3), 0) / n;
  
  const std = Math.sqrt(m2);
  if (std === 0) return 0;
  
  return m3 / Math.pow(std, 3);
}

/**
 * Calculate kurtosis of returns
 */
function calculateKurtosis(data: number[]): number {
  if (data.length < 4) return 0;
  
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const m2 = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const m4 = data.reduce((sum, x) => sum + Math.pow(x - mean, 4), 0) / n;
  
  if (m2 === 0) return 0;
  
  return (m4 / Math.pow(m2, 2)) - 3; // Excess kurtosis
}

/**
 * Calculate Hurst Exponent (market regime detection)
 * H > 0.5: Trending market
 * H = 0.5: Random walk
 * H < 0.5: Mean-reverting market
 */
function calculateHurstExponent(data: number[], maxLag: number = 20): number {
  if (data.length < maxLag * 2) return 0.5;
  
  const n = data.length;
  const lags: number[] = [];
  const rs: number[] = [];
  
  for (let lag = 2; lag <= maxLag; lag++) {
    const chunks = Math.floor(n / lag);
    if (chunks < 2) continue;
    
    let rsSum = 0;
    let validChunks = 0;
    
    for (let c = 0; c < chunks; c++) {
      const start = c * lag;
      const chunk = data.slice(start, start + lag);
      
      // Calculate mean
      const mean = chunk.reduce((a, b) => a + b, 0) / lag;
      
      // Calculate cumulative deviations
      let cumDev = 0;
      let maxCum = -Infinity;
      let minCum = Infinity;
      
      for (let i = 0; i < lag; i++) {
        cumDev += chunk[i] - mean;
        if (cumDev > maxCum) maxCum = cumDev;
        if (cumDev < minCum) minCum = cumDev;
      }
      
      const range = maxCum - minCum;
      
      // Calculate standard deviation
      const variance = chunk.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / lag;
      const std = Math.sqrt(variance);
      
      if (std > 0) {
        rsSum += range / std;
        validChunks++;
      }
    }
    
    if (validChunks > 0) {
      lags.push(Math.log(lag));
      rs.push(Math.log(rsSum / validChunks));
    }
  }
  
  if (lags.length < 3) return 0.5;
  
  // Linear regression to find Hurst exponent
  const n_points = lags.length;
  const sumX = lags.reduce((a, b) => a + b, 0);
  const sumY = rs.reduce((a, b) => a + b, 0);
  const sumXY = lags.reduce((sum, x, i) => sum + x * rs[i], 0);
  const sumX2 = lags.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n_points * sumXY - sumX * sumY) / (n_points * sumX2 - sumX * sumX);
  
  return Math.max(0, Math.min(1, slope));
}

/**
 * Calculate Shannon Entropy (market unpredictability)
 */
function calculateEntropy(data: number[], bins: number = 10): number {
  if (data.length < bins) return 0;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) return 0;
  
  const binCounts = new Array(bins).fill(0);
  
  for (const value of data) {
    const binIndex = Math.min(bins - 1, Math.floor(((value - min) / range) * bins));
    binCounts[binIndex]++;
  }
  
  let entropy = 0;
  const n = data.length;
  
  for (const count of binCounts) {
    if (count > 0) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy / Math.log2(bins); // Normalize to 0-1
}

/**
 * Calculate Autocorrelation (serial correlation)
 */
function calculateAutocorrelation(data: number[], lag: number = 1): number {
  if (data.length < lag + 2) return 0;
  
  const n = data.length - lag;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (data[i] - mean) * (data[i + lag] - mean);
  }
  
  for (let i = 0; i < data.length; i++) {
    denominator += Math.pow(data[i] - mean, 2);
  }
  
  return denominator !== 0 ? numerator / denominator : 0;
}

// ==========================================================
// CANDLESTICK FEATURES - مميزات الشموع
// ==========================================================

/**
 * Calculate candlestick features
 */
function calculateCandleFeatures(candle: OHLCV): {
  bodySize: number;
  upperShadow: number;
  lowerShadow: number;
  bodyToRange: number;
  direction: number;
  dojiScore: number;
} {
  const range = candle.high - candle.low;
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  
  return {
    bodySize: range !== 0 ? body / range : 0,
    upperShadow: range !== 0 ? upperShadow / range : 0,
    lowerShadow: range !== 0 ? lowerShadow / range : 0,
    bodyToRange: range !== 0 ? body / range : 0,
    direction: candle.close >= candle.open ? 1 : -1,
    dojiScore: range !== 0 ? 1 - (body / range) : 0 // High score = more doji-like
  };
}

// ==========================================================
// VOLUME FEATURES - مميزات الحجم
// ==========================================================

/**
 * Calculate OBV slope
 */
function calculateOBVSlope(candles: OHLCV[], period: number = 10): number {
  if (candles.length < period) return 0;
  
  let obv = 0;
  const obvArray: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      obvArray.push(0);
    } else {
      if (candles[i].close > candles[i - 1].close) {
        obv += candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        obv -= candles[i].volume;
      }
      obvArray.push(obv);
    }
  }
  
  // Calculate slope using linear regression
  const recentOBV = obvArray.slice(-period);
  const n = recentOBV.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = recentOBV.reduce((a, b) => a + b, 0);
  const sumXY = recentOBV.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Normalize by OBV magnitude
  const obvMean = sumY / n;
  return obvMean !== 0 ? slope / Math.abs(obvMean) : 0;
}

// ==========================================================
// MAIN FEATURE GENERATION
// ==========================================================

/**
 * Generate Elite ML Features (50+)
 * 
 * @param candles - OHLCV data (minimum 100 bars recommended)
 * @returns Complete feature set for ML models
 */
export function generateEliteFeatures(candles: OHLCV[]): FeatureSet | null {
  if (candles.length < 50) return null;
  
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const currentCandle = candles[candles.length - 1];
  
  // Calculate returns for statistical features
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  
  // Price Features
  const returns_1 = calculateReturns(closes, 1);
  const returns_5 = calculateReturns(closes, 5);
  const returns_10 = calculateReturns(closes, 10);
  const returns_20 = calculateReturns(closes, 20);
  const log_returns = calculateLogReturns(closes);
  const price_momentum = calculateMomentum(closes, 10);
  const price_acceleration = calculateAcceleration(closes, 5);
  const gap = candles.length > 1 
    ? (currentCandle.open - candles[candles.length - 2].close) / candles[candles.length - 2].close 
    : 0;
  const high_low_range = currentCandle.close !== 0 
    ? (currentCandle.high - currentCandle.low) / currentCandle.close 
    : 0;
  const true_range = candles.length > 1 
    ? Math.max(
        currentCandle.high - currentCandle.low,
        Math.abs(currentCandle.high - candles[candles.length - 2].close),
        Math.abs(currentCandle.low - candles[candles.length - 2].close)
      ) / currentCandle.close
    : 0;
  
  // Volatility Features
  const volatility_5 = calculateVolatility(closes, 5);
  const volatility_10 = calculateVolatility(closes, 10);
  const volatility_20 = calculateVolatility(closes, 20);
  const volatility_ratio = volatility_20 !== 0 ? volatility_5 / volatility_20 : 1;
  const atr = calculateATR(candles, 14) || 0;
  const atr_14 = atr;
  const atr_ratio = currentCandle.close !== 0 ? atr / currentCandle.close : 0;
  const bollingerFeatures = calculateBollingerFeatures(closes, 20, 2);
  const bollinger_width = bollingerFeatures.width;
  const bollinger_position = bollingerFeatures.position;
  
  // Moving Average Features
  const sma_5 = calculateSMA(closes, 5) || closes[closes.length - 1];
  const sma_10 = calculateSMA(closes, 10) || closes[closes.length - 1];
  const sma_20 = calculateSMA(closes, 20) || closes[closes.length - 1];
  const sma_50 = calculateSMA(closes, 50) || closes[closes.length - 1];
  const ema_9 = calculateEMA(closes, 9) || closes[closes.length - 1];
  const ema_21 = calculateEMA(closes, 21) || closes[closes.length - 1];
  
  const currentPrice = closes[closes.length - 1];
  const price_sma_5_ratio = sma_5 !== 0 ? currentPrice / sma_5 : 1;
  const price_sma_10_ratio = sma_10 !== 0 ? currentPrice / sma_10 : 1;
  const price_sma_20_ratio = sma_20 !== 0 ? currentPrice / sma_20 : 1;
  const price_sma_50_ratio = sma_50 !== 0 ? currentPrice / sma_50 : 1;
  const price_ema_9_ratio = ema_9 !== 0 ? currentPrice / ema_9 : 1;
  const price_ema_21_ratio = ema_21 !== 0 ? currentPrice / ema_21 : 1;
  
  // MA slopes
  const sma_5_prev = calculateSMA(closes.slice(0, -5), 5) || sma_5;
  const sma_20_prev = calculateSMA(closes.slice(0, -5), 20) || sma_20;
  const sma_5_slope = sma_5_prev !== 0 ? (sma_5 - sma_5_prev) / sma_5_prev : 0;
  const sma_20_slope = sma_20_prev !== 0 ? (sma_20 - sma_20_prev) / sma_20_prev : 0;
  
  // MA crossovers
  const ma_cross_5_20 = sma_5 > sma_20 ? 1 : sma_5 < sma_20 ? -1 : 0;
  const ma_cross_9_21 = ema_9 > ema_21 ? 1 : ema_9 < ema_21 ? -1 : 0;
  
  // Oscillator Features
  const rsiResult_14 = calculateRSI(closes, 14);
  const rsiResult_7 = calculateRSI(closes, 7);
  const rsiResult_21 = calculateRSI(closes, 21);
  const rsi_14 = (rsiResult_14.value ?? 50) / 100; // Normalize to 0-1
  const rsi_7 = (rsiResult_7.value ?? 50) / 100;
  const rsi_21 = (rsiResult_21.value ?? 50) / 100;
  
  const macdResult = calculateMACD(closes);
  const macd = macdResult.macd || 0;
  const macd_signal = macdResult.signalLine || 0;
  const macd_histogram = macdResult.histogram || 0;
  
  // MACD histogram slope
  const macdPrev = calculateMACD(closes.slice(0, -3));
  const macd_histogram_slope = (macd_histogram - (macdPrev.histogram || 0));
  
  // Stochastic
  const stoch_k = calculateStochasticK(candles, 14);
  
  // Trend Features
  const adxResult = calculateADX(candles, 14);
  const adx = (adxResult?.adx ?? 20) / 100;
  const plus_di = (adxResult?.plusDI ?? 25) / 100;
  const minus_di = (adxResult?.minusDI ?? 25) / 100;
  const trend_strength = adx;
  const trend_direction = plus_di > minus_di ? 1 : plus_di < minus_di ? -1 : 0;
  const di_crossover = plus_di > minus_di ? 1 : -1;
  
  // Volume Features
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volume_ratio = avgVolume !== 0 ? currentCandle.volume / avgVolume : 1;
  const volumeSMA5 = calculateSMA(volumes, 5) || avgVolume;
  const volume_sma_5_ratio = volumeSMA5 !== 0 ? currentCandle.volume / volumeSMA5 : 1;
  const obv_slope = calculateOBVSlope(candles, 10);
  
  // CVD
  const cvdResult = calculateCVD(candles, 10);
  const cvd_slope = cvdResult.cvdArray.length >= 10
    ? (cvdResult.cvdArray[cvdResult.cvdArray.length - 1] - cvdResult.cvdArray[cvdResult.cvdArray.length - 10]) / 
      Math.abs(cvdResult.cvdArray[cvdResult.cvdArray.length - 10] || 1)
    : 0;
  
  // VWAP distance
  const vwapResult = calculateVWAP(candles);
  const vwap_distance = vwapResult.distancePercent / 100;
  
  // Price-Volume trend
  const price_volume_trend = returns_1 * volume_ratio;
  
  // Volume momentum and volatility
  const volumeReturns: number[] = [];
  for (let i = volumes.length - 10; i < volumes.length && i > 0; i++) {
    volumeReturns.push((volumes[i] - volumes[i - 1]) / (volumes[i - 1] || 1));
  }
  const volume_momentum = volumeReturns.length > 0 
    ? volumeReturns.reduce((a, b) => a + b, 0) / volumeReturns.length 
    : 0;
  const volume_volatility = calculateVolatility(volumes, 10);
  
  // Candlestick Features
  const candleFeatures = calculateCandleFeatures(currentCandle);
  const body_size = candleFeatures.bodySize;
  const upper_shadow = candleFeatures.upperShadow;
  const lower_shadow = candleFeatures.lowerShadow;
  const body_to_range = candleFeatures.bodyToRange;
  const candle_direction = candleFeatures.direction;
  const doji_score = candleFeatures.dojiScore;
  
  // Statistical Features
  const recentReturns = returns.slice(-20);
  const skewness = calculateSkewness(recentReturns);
  const kurtosis = calculateKurtosis(recentReturns);
  const hurst_exponent = calculateHurstExponent(closes.slice(-50), 15);
  const entropy = calculateEntropy(recentReturns, 10);
  const autocorrelation = calculateAutocorrelation(recentReturns, 1);
  const mean_reversion_score = 0.5 - hurst_exponent; // Positive = mean reverting
  
  // Time Features (if timestamp is a valid date)
  let hour_sin: number | undefined;
  let hour_cos: number | undefined;
  let day_sin: number | undefined;
  let day_cos: number | undefined;
  
  if (currentCandle.timestamp > 0) {
    const date = new Date(currentCandle.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Cyclical encoding
    hour_sin = Math.sin(2 * Math.PI * hour / 24);
    hour_cos = Math.cos(2 * Math.PI * hour / 24);
    day_sin = Math.sin(2 * Math.PI * dayOfWeek / 7);
    day_cos = Math.cos(2 * Math.PI * dayOfWeek / 7);
  }
  
  return {
    // Price Features
    returns_1,
    returns_5,
    returns_10,
    returns_20,
    log_returns,
    price_momentum,
    price_acceleration,
    gap,
    high_low_range,
    true_range,
    
    // Volatility Features
    volatility_5,
    volatility_10,
    volatility_20,
    volatility_ratio,
    atr_14,
    atr_ratio,
    bollinger_width,
    bollinger_position,
    
    // Moving Average Features
    price_sma_5_ratio,
    price_sma_10_ratio,
    price_sma_20_ratio,
    price_sma_50_ratio,
    price_ema_9_ratio,
    price_ema_21_ratio,
    sma_5_slope,
    sma_20_slope,
    ma_cross_5_20,
    ma_cross_9_21,
    
    // Oscillator Features
    rsi_14,
    rsi_7,
    rsi_21,
    macd,
    macd_signal,
    macd_histogram,
    macd_histogram_slope,
    stoch_k,
    
    // Trend Features
    adx,
    plus_di,
    minus_di,
    trend_strength,
    trend_direction,
    di_crossover,
    
    // Volume Features
    volume_ratio,
    volume_sma_5_ratio,
    obv_slope,
    cvd_slope,
    vwap_distance,
    price_volume_trend,
    volume_momentum,
    volume_volatility,
    
    // Candlestick Features
    body_size,
    upper_shadow,
    lower_shadow,
    body_to_range,
    candle_direction,
    doji_score,
    
    // Statistical Features
    skewness,
    kurtosis,
    hurst_exponent,
    entropy,
    autocorrelation,
    mean_reversion_score,
    
    // Time Features
    hour_sin,
    hour_cos,
    day_sin,
    day_cos
  };
}

/**
 * Calculate Stochastic %K
 */
function calculateStochasticK(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period) return 0.5;
  
  const recentCandles = candles.slice(-period);
  const highestHigh = Math.max(...recentCandles.map(c => c.high));
  const lowestLow = Math.min(...recentCandles.map(c => c.low));
  const currentClose = candles[candles.length - 1].close;
  
  const range = highestHigh - lowestLow;
  return range !== 0 ? (currentClose - lowestLow) / range : 0.5;
}

// ==========================================================
// FEATURE NORMALIZATION
// ==========================================================

/**
 * Normalize features using MinMax scaling
 */
export function normalizeMinMax(
  features: FeatureSet,
  mins: Partial<FeatureSet>,
  maxs: Partial<FeatureSet>
): NormalizedFeatureSet {
  const normalized: any = { ...features };
  
  for (const key of Object.keys(features) as (keyof FeatureSet)[]) {
    const value = features[key];
    const min = mins[key] ?? -1;
    const max = maxs[key] ?? 1;
    
    if (typeof value === 'number' && typeof min === 'number' && typeof max === 'number') {
      const range = max - min;
      normalized[key] = range !== 0 ? (value - min) / range : 0.5;
    }
  }
  
  normalized.normalized = true;
  normalized.normalizationType = 'minmax';
  
  return normalized as NormalizedFeatureSet;
}

/**
 * Normalize features using Z-score scaling
 */
export function normalizeZScore(
  features: FeatureSet,
  means: Partial<FeatureSet>,
  stds: Partial<FeatureSet>
): NormalizedFeatureSet {
  const normalized: any = { ...features };
  
  for (const key of Object.keys(features) as (keyof FeatureSet)[]) {
    const value = features[key];
    const mean = means[key] ?? 0;
    const std = stds[key] ?? 1;
    
    if (typeof value === 'number' && typeof mean === 'number' && typeof std === 'number') {
      normalized[key] = std !== 0 ? (value - mean) / std : 0;
    }
  }
  
  normalized.normalized = true;
  normalized.normalizationType = 'zscore';
  
  return normalized as NormalizedFeatureSet;
}

// ==========================================================
// MARKET REGIME DETECTION
// ==========================================================

/**
 * Detect Market Regime
 * Combines Hurst Exponent, ADX, and Volatility analysis
 */
export function detectMarketRegime(candles: OHLCV[]): RegimeResult {
  const nullResult: RegimeResult = {
    regime: 'ranging',
    hurstExponent: 0.5,
    adxValue: 20,
    volatilityState: 'normal',
    momentum: 'neutral',
    confidence: 50
  };
  
  if (candles.length < 50) return nullResult;
  
  const closes = candles.map(c => c.close);
  
  // Calculate Hurst Exponent
  const hurstExponent = calculateHurstExponent(closes.slice(-50), 15);
  
  // Calculate ADX
  const adxResult = calculateADX(candles, 14);
  const adxValue = adxResult?.adx ?? 20;
  
  // Calculate Volatility
  const volatility_short = calculateVolatility(closes, 5);
  const volatility_long = calculateVolatility(closes, 20);
  const volatilityRatio = volatility_long !== 0 ? volatility_short / volatility_long : 1;
  
  // Determine volatility state
  let volatilityState: 'high' | 'low' | 'normal' = 'normal';
  if (volatilityRatio > 1.5) volatilityState = 'high';
  else if (volatilityRatio < 0.5) volatilityState = 'low';
  
  // Calculate momentum
  const momentum_10 = calculateMomentum(closes, 10);
  let momentum: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (momentum_10 > 0.02) momentum = 'positive';
  else if (momentum_10 < -0.02) momentum = 'negative';
  
  // Determine regime
  let regime: RegimeResult['regime'] = 'ranging';
  let confidence = 50;
  
  if (hurstExponent > 0.6 && adxValue > 25) {
    regime = momentum === 'positive' ? 'trending_up' : 'trending_down';
    confidence = Math.min(95, 60 + adxValue);
  } else if (hurstExponent < 0.4) {
    regime = 'ranging';
    confidence = Math.min(90, 60 + (0.5 - hurstExponent) * 100);
  } else if (volatilityState === 'high') {
    regime = 'volatile';
    confidence = 70;
  } else if (volatilityState === 'low' && adxValue < 20) {
    regime = 'quiet';
    confidence = 65;
  }
  
  return {
    regime,
    hurstExponent,
    adxValue,
    volatilityState,
    momentum,
    confidence
  };
}

// ==========================================================
// FEATURE IMPORTANCE (DEFAULT WEIGHTS)
// ==========================================================

/**
 * Get default feature importance weights
 * Based on research and backtesting
 */
export function getFeatureImportance(): FeatureImportance[] {
  return [
    // Price features - most important for direction
    { feature: 'returns_5', importance: 0.85, category: 'price' },
    { feature: 'price_momentum', importance: 0.82, category: 'price' },
    { feature: 'returns_20', importance: 0.78, category: 'price' },
    
    // Trend features
    { feature: 'adx', importance: 0.80, category: 'trend' },
    { feature: 'trend_direction', importance: 0.75, category: 'trend' },
    { feature: 'ma_cross_5_20', importance: 0.72, category: 'trend' },
    
    // Volatility features
    { feature: 'volatility_ratio', importance: 0.70, category: 'volatility' },
    { feature: 'atr_ratio', importance: 0.68, category: 'volatility' },
    { feature: 'bollinger_position', importance: 0.65, category: 'volatility' },
    
    // Oscillators
    { feature: 'rsi_14', importance: 0.72, category: 'oscillator' },
    { feature: 'macd_histogram', importance: 0.70, category: 'oscillator' },
    { feature: 'stoch_k', importance: 0.65, category: 'oscillator' },
    
    // Volume
    { feature: 'volume_ratio', importance: 0.68, category: 'volume' },
    { feature: 'cvd_slope', importance: 0.65, category: 'volume' },
    { feature: 'obv_slope', importance: 0.62, category: 'volume' },
    
    // Statistical
    { feature: 'hurst_exponent', importance: 0.75, category: 'statistical' },
    { feature: 'autocorrelation', importance: 0.60, category: 'statistical' },
    { feature: 'entropy', importance: 0.55, category: 'statistical' },
    
    // Candlestick
    { feature: 'body_size', importance: 0.50, category: 'candlestick' },
    { feature: 'candle_direction', importance: 0.48, category: 'candlestick' }
  ];
}

// ==========================================================
// GENERATE FEATURES FOR MULTIPLE BARS (TRAINING DATA)
// ==========================================================

/**
 * Generate feature matrix for training
 * Creates features for each bar in the dataset
 */
export function generateFeatureMatrix(
  candles: OHLCV[],
  minBars: number = 100
): (FeatureSet | null)[] {
  const features: (FeatureSet | null)[] = [];
  
  for (let i = minBars; i <= candles.length; i++) {
    const slice = candles.slice(0, i);
    features.push(generateEliteFeatures(slice));
  }
  
  return features;
}

// ==========================================================
// EXPORTS
// ==========================================================

export const MLFeatures = {
  generateEliteFeatures,
  generateFeatureMatrix,
  normalizeMinMax,
  normalizeZScore,
  detectMarketRegime,
  getFeatureImportance,
  calculateHurstExponent,
  calculateEntropy,
  calculateSkewness,
  calculateKurtosis,
  calculateAutocorrelation
};

export default MLFeatures;
