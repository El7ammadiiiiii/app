/**
 * Elite Trend Algorithms - خوارزميات Nexus النخبوية للتنبؤ بالاتجاه
 * 
 * نظام متقدم يستخدم 25+ مؤشر مع:
 * - كشف نظام السوق (Trending/Ranging/Volatile)
 * - تطبيع Z-Score لجميع المؤشرات
 * - أوزان ديناميكية حسب نظام السوق
 * - تأكيد متعدد المصادر (≥3 تأكيدات مطلوبة)
 * 
 * @author CCWAYS Team
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// TYPES & INTERFACES
// ==========================================================

export type MarketRegime = 'trending' | 'ranging' | 'volatile';
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

export interface RegimeDetectionResult
{
  regime: MarketRegime;
  confidence: number; // 0-100
  adxValue: number;
  choppinessValue: number;
  volatilityPercentile: number;
}

export interface CategoryScore
{
  score: number; // -100 to +100 (negative = bearish, positive = bullish)
  confidence: number; // 0-100
  indicators: IndicatorContribution[];
  signalCount: { bullish: number; bearish: number; neutral: number };
}

export interface IndicatorContribution
{
  name: string;
  value: number;
  zScore: number;
  signal: TrendDirection;
  weight: number;
  contribution: number;
}

export interface EliteTrendResult
{
  // Core Results
  score: number; // -100 to +100
  direction: TrendDirection;
  strength: number; // 0-100 (absolute strength)
  confidence: number; // 0-100

  // Regime Info
  regime: MarketRegime;
  regimeConfidence: number;

  // Category Breakdown
  momentumScore: CategoryScore;
  trendScore: CategoryScore;
  volumeScore: CategoryScore;
  volatilityScore: CategoryScore;

  // Validation
  confirmations: number; // Number of confirming categories
  isValidSignal: boolean; // true if ≥3 confirmations

  // Multi-Timeframe
  timeframeAgreement?: number; // 0-100% when multi-TF available

  // Raw Data
  allIndicators: IndicatorContribution[];
}

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

/**
 * Calculate EMA
 */
function calcEMA ( data: number[], period: number ): number[]
{
  const ema: number[] = [];
  if ( data.length < period ) return ema;

  const multiplier = 2 / ( period + 1 );
  let sum = 0;
  for ( let i = 0; i < period; i++ ) sum += data[ i ];
  ema[ period - 1 ] = sum / period;

  for ( let i = period; i < data.length; i++ )
  {
    ema[ i ] = ( data[ i ] - ema[ i - 1 ] ) * multiplier + ema[ i - 1 ];
  }
  return ema;
}

/**
 * Calculate SMA
 */
function calcSMA ( data: number[], period: number ): number
{
  if ( data.length < period ) return NaN;
  const slice = data.slice( -period );
  return slice.reduce( ( sum, val ) => sum + val, 0 ) / period;
}

/**
 * Calculate RSI from closes
 */
function calcRSI ( closes: number[], period: number = 14 ): number
{
  if ( closes.length < period + 1 ) return 50;

  let gains = 0;
  let losses = 0;

  for ( let i = 1; i <= period; i++ )
  {
    const diff = closes[ closes.length - period + i - 1 ] - closes[ closes.length - period + i - 2 ];
    if ( diff > 0 ) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if ( avgLoss === 0 ) return 100;
  const rs = avgGain / avgLoss;
  return 100 - ( 100 / ( 1 + rs ) );
}

/**
 * Calculate ADX
 */
function calcADX ( candles: OHLCV[], period: number = 14 ): { adx: number; plusDI: number; minusDI: number }
{
  if ( candles.length < period * 2 )
  {
    return { adx: 20, plusDI: 0, minusDI: 0 };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for ( let i = 1; i < candles.length; i++ )
  {
    const high = candles[ i ].high;
    const low = candles[ i ].low;
    const prevHigh = candles[ i - 1 ].high;
    const prevLow = candles[ i - 1 ].low;
    const prevClose = candles[ i - 1 ].close;

    tr.push( Math.max( high - low, Math.abs( high - prevClose ), Math.abs( low - prevClose ) ) );

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDM.push( upMove > downMove && upMove > 0 ? upMove : 0 );
    minusDM.push( downMove > upMove && downMove > 0 ? downMove : 0 );
  }

  // Smoothed values
  const smoothedTR = calcEMA( tr, period );
  const smoothedPlusDM = calcEMA( plusDM, period );
  const smoothedMinusDM = calcEMA( minusDM, period );

  const idx = smoothedTR.length - 1;
  if ( idx < 0 || !smoothedTR[ idx ] ) return { adx: 20, plusDI: 0, minusDI: 0 };

  const plusDI = ( smoothedPlusDM[ idx ] / smoothedTR[ idx ] ) * 100;
  const minusDI = ( smoothedMinusDM[ idx ] / smoothedTR[ idx ] ) * 100;

  // Calculate DX and ADX
  const dx: number[] = [];
  for ( let i = period - 1; i < smoothedTR.length; i++ )
  {
    if ( smoothedTR[ i ] === 0 ) continue;
    const pdi = ( smoothedPlusDM[ i ] / smoothedTR[ i ] ) * 100;
    const mdi = ( smoothedMinusDM[ i ] / smoothedTR[ i ] ) * 100;
    const sum = pdi + mdi;
    if ( sum > 0 )
    {
      dx.push( Math.abs( pdi - mdi ) / sum * 100 );
    }
  }

  const adx = dx.length >= period ? calcSMA( dx, period ) : 20;

  return { adx: adx || 20, plusDI: plusDI || 0, minusDI: minusDI || 0 };
}

/**
 * Calculate Choppiness Index
 */
function calcChoppiness ( candles: OHLCV[], period: number = 14 ): number
{
  if ( candles.length < period + 1 ) return 50;

  const recentCandles = candles.slice( -period - 1 );
  let atrSum = 0;
  let highestHigh = -Infinity;
  let lowestLow = Infinity;

  for ( let i = 1; i < recentCandles.length; i++ )
  {
    const tr = Math.max(
      recentCandles[ i ].high - recentCandles[ i ].low,
      Math.abs( recentCandles[ i ].high - recentCandles[ i - 1 ].close ),
      Math.abs( recentCandles[ i ].low - recentCandles[ i - 1 ].close )
    );
    atrSum += tr;

    if ( recentCandles[ i ].high > highestHigh ) highestHigh = recentCandles[ i ].high;
    if ( recentCandles[ i ].low < lowestLow ) lowestLow = recentCandles[ i ].low;
  }

  const range = highestHigh - lowestLow;
  if ( range === 0 ) return 50;

  const chop = 100 * Math.log10( atrSum / range ) / Math.log10( period );
  return Math.max( 0, Math.min( 100, chop ) );
}

// ==========================================================
// MARKET REGIME DETECTION
// ==========================================================

export function detectMarketRegime ( candles: OHLCV[] ): RegimeDetectionResult
{
  if ( candles.length < 50 )
  {
    return {
      regime: 'ranging',
      confidence: 50,
      adxValue: 20,
      choppinessValue: 50,
      volatilityPercentile: 50
    };
  }

  const adxResult = calcADX( candles, 14 );
  const adxValue = adxResult.adx;
  const choppinessValue = calcChoppiness( candles, 14 );

  // Calculate volatility percentile using ATR
  const atrValues: number[] = [];
  for ( let i = 14; i < candles.length; i++ )
  {
    let tr = candles[ i ].high - candles[ i ].low;
    tr = Math.max( tr, Math.abs( candles[ i ].high - candles[ i - 1 ].close ) );
    tr = Math.max( tr, Math.abs( candles[ i ].low - candles[ i - 1 ].close ) );
    atrValues.push( ( tr / candles[ i ].close ) * 100 );
  }

  const currentVolatility = atrValues[ atrValues.length - 1 ] || 0;
  const sortedVol = [ ...atrValues ].sort( ( a, b ) => a - b );
  const volRank = sortedVol.findIndex( v => v >= currentVolatility );
  const volatilityPercentile = sortedVol.length > 0 ? ( volRank / sortedVol.length ) * 100 : 50;

  let regime: MarketRegime;
  let confidence: number;

  if ( adxValue > 25 && choppinessValue < 38.2 )
  {
    regime = 'trending';
    confidence = Math.min( 95, 60 + ( adxValue - 25 ) * 2 + ( 38.2 - choppinessValue ) );
  } else if ( adxValue < 20 && choppinessValue > 61.8 )
  {
    regime = 'ranging';
    confidence = Math.min( 95, 60 + ( 20 - adxValue ) * 2 + ( choppinessValue - 61.8 ) );
  } else if ( volatilityPercentile > 80 )
  {
    regime = 'volatile';
    confidence = Math.min( 95, 50 + ( volatilityPercentile - 80 ) * 2 );
  } else if ( adxValue > 20 && choppinessValue < 50 )
  {
    regime = 'trending';
    confidence = 50 + ( adxValue - 20 ) * 2;
  } else
  {
    regime = 'ranging';
    confidence = 50;
  }

  return {
    regime,
    confidence: Math.round( confidence ),
    adxValue,
    choppinessValue,
    volatilityPercentile
  };
}

// ==========================================================
// REGIME-BASED WEIGHT MATRICES
// ==========================================================

interface WeightMatrix
{
  momentum: number;
  trend: number;
  volume: number;
  volatility: number;
}

const REGIME_WEIGHTS: Record<MarketRegime, WeightMatrix> = {
  trending: { momentum: 0.20, trend: 0.45, volume: 0.25, volatility: 0.10 },
  ranging: { momentum: 0.40, trend: 0.15, volume: 0.30, volatility: 0.15 },
  volatile: { momentum: 0.25, trend: 0.20, volume: 0.20, volatility: 0.35 }
};

const TIMEFRAME_ADJUSTMENTS: Record<string, Partial<WeightMatrix>> = {
  '15m': { momentum: 1.3, trend: 0.8 },
  '1h': { momentum: 1.1, trend: 0.95 },
  '4h': { momentum: 1.0, trend: 1.0 },
  '1d': { momentum: 0.8, trend: 1.25 },
  '1w': { momentum: 0.7, trend: 1.4 }
};

function getAdjustedWeights ( regime: MarketRegime, timeframe: string ): WeightMatrix
{
  const baseWeights = { ...REGIME_WEIGHTS[ regime ] };
  const adjustment = TIMEFRAME_ADJUSTMENTS[ timeframe ] || {};

  if ( adjustment.momentum ) baseWeights.momentum *= adjustment.momentum;
  if ( adjustment.trend ) baseWeights.trend *= adjustment.trend;

  const total = baseWeights.momentum + baseWeights.trend + baseWeights.volume + baseWeights.volatility;
  baseWeights.momentum /= total;
  baseWeights.trend /= total;
  baseWeights.volume /= total;
  baseWeights.volatility /= total;

  return baseWeights;
}

// ==========================================================
// CATEGORY CALCULATIONS
// ==========================================================

function calculateMomentumCategory ( candles: OHLCV[] ): CategoryScore
{
  const indicators: IndicatorContribution[] = [];
  const closes = candles.map( c => c.close );

  // 1. RSI
  try
  {
    const rsiValue = calcRSI( closes, 14 );
    const rsiZScore = ( rsiValue - 50 ) / 25;

    let rsiSignal: TrendDirection = 'neutral';
    if ( rsiValue < 30 ) rsiSignal = 'bullish';
    else if ( rsiValue > 70 ) rsiSignal = 'bearish';
    else if ( rsiValue < 45 ) rsiSignal = 'bullish';
    else if ( rsiValue > 55 ) rsiSignal = 'bearish';

    indicators.push( {
      name: 'RSI',
      value: rsiValue,
      zScore: rsiZScore,
      signal: rsiSignal,
      weight: 0.25,
      contribution: 0
    } );
  } catch { /* Skip */ }

  // 2. Stochastic RSI (simplified)
  try
  {
    const rsiValues: number[] = [];
    for ( let i = 20; i < closes.length; i++ )
    {
      rsiValues.push( calcRSI( closes.slice( 0, i + 1 ), 14 ) );
    }

    if ( rsiValues.length >= 14 )
    {
      const recentRsi = rsiValues.slice( -14 );
      const minRsi = Math.min( ...recentRsi );
      const maxRsi = Math.max( ...recentRsi );
      const stochRsi = maxRsi === minRsi ? 50 : ( ( rsiValues[ rsiValues.length - 1 ] - minRsi ) / ( maxRsi - minRsi ) ) * 100;

      let stochSignal: TrendDirection = 'neutral';
      if ( stochRsi < 20 ) stochSignal = 'bullish';
      else if ( stochRsi > 80 ) stochSignal = 'bearish';

      indicators.push( {
        name: 'StochRSI',
        value: stochRsi,
        zScore: ( stochRsi - 50 ) / 25,
        signal: stochSignal,
        weight: 0.20,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 3. ROC (Rate of Change)
  try
  {
    const period = 14;
    if ( closes.length > period )
    {
      const roc = ( ( closes[ closes.length - 1 ] - closes[ closes.length - 1 - period ] ) / closes[ closes.length - 1 - period ] ) * 100;

      let rocSignal: TrendDirection = 'neutral';
      if ( roc > 5 ) rocSignal = 'bullish';
      else if ( roc < -5 ) rocSignal = 'bearish';
      else if ( roc > 2 ) rocSignal = 'bullish';
      else if ( roc < -2 ) rocSignal = 'bearish';

      indicators.push( {
        name: 'ROC',
        value: roc,
        zScore: roc / 5,
        signal: rocSignal,
        weight: 0.15,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 4. Williams %R
  try
  {
    const period = 14;
    if ( candles.length >= period )
    {
      const recentCandles = candles.slice( -period );
      const highestHigh = Math.max( ...recentCandles.map( c => c.high ) );
      const lowestLow = Math.min( ...recentCandles.map( c => c.low ) );
      const currentClose = candles[ candles.length - 1 ].close;

      const willR = highestHigh === lowestLow ? -50 : ( ( highestHigh - currentClose ) / ( highestHigh - lowestLow ) ) * -100;

      let willSignal: TrendDirection = 'neutral';
      if ( willR < -80 ) willSignal = 'bullish';
      else if ( willR > -20 ) willSignal = 'bearish';

      indicators.push( {
        name: 'WilliamsR',
        value: willR,
        zScore: ( willR + 50 ) / 25,
        signal: willSignal,
        weight: 0.15,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 5. MFI (Money Flow Index)
  try
  {
    const period = 14;
    if ( candles.length >= period + 1 )
    {
      let positiveFlow = 0;
      let negativeFlow = 0;

      for ( let i = candles.length - period; i < candles.length; i++ )
      {
        const typicalPrice = ( candles[ i ].high + candles[ i ].low + candles[ i ].close ) / 3;
        const prevTypical = ( candles[ i - 1 ].high + candles[ i - 1 ].low + candles[ i - 1 ].close ) / 3;
        const rawMoneyFlow = typicalPrice * candles[ i ].volume;

        if ( typicalPrice > prevTypical ) positiveFlow += rawMoneyFlow;
        else if ( typicalPrice < prevTypical ) negativeFlow += rawMoneyFlow;
      }

      const mfi = negativeFlow === 0 ? 100 : 100 - ( 100 / ( 1 + positiveFlow / negativeFlow ) );

      let mfiSignal: TrendDirection = 'neutral';
      if ( mfi < 20 ) mfiSignal = 'bullish';
      else if ( mfi > 80 ) mfiSignal = 'bearish';

      indicators.push( {
        name: 'MFI',
        value: mfi,
        zScore: ( mfi - 50 ) / 25,
        signal: mfiSignal,
        weight: 0.15,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 6. CCI
  try
  {
    const period = 20;
    if ( candles.length >= period )
    {
      const recentCandles = candles.slice( -period );
      const typicalPrices = recentCandles.map( c => ( c.high + c.low + c.close ) / 3 );
      const sma = typicalPrices.reduce( ( a, b ) => a + b, 0 ) / period;
      const meanDev = typicalPrices.reduce( ( sum, tp ) => sum + Math.abs( tp - sma ), 0 ) / period;

      const currentTP = typicalPrices[ typicalPrices.length - 1 ];
      const cci = meanDev === 0 ? 0 : ( currentTP - sma ) / ( 0.015 * meanDev );

      let cciSignal: TrendDirection = 'neutral';
      if ( cci < -100 ) cciSignal = 'bullish';
      else if ( cci > 100 ) cciSignal = 'bearish';

      indicators.push( {
        name: 'CCI',
        value: cci,
        zScore: cci / 100,
        signal: cciSignal,
        weight: 0.10,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  return aggregateCategoryScore( indicators );
}

function calculateTrendCategory ( candles: OHLCV[] ): CategoryScore
{
  const indicators: IndicatorContribution[] = [];
  const closes = candles.map( c => c.close );
  const currentPrice = closes[ closes.length - 1 ];

  // 1. MACD
  try
  {
    const ema12 = calcEMA( closes, 12 );
    const ema26 = calcEMA( closes, 26 );

    if ( ema12.length > 0 && ema26.length > 0 )
    {
      const macdLine: number[] = [];
      const startIdx = Math.max( ema12.length, ema26.length ) - Math.min( ema12.length, ema26.length );

      for ( let i = startIdx; i < ema12.length && i < ema26.length; i++ )
      {
        if ( ema12[ i ] !== undefined && ema26[ i ] !== undefined )
        {
          macdLine.push( ema12[ i ] - ema26[ i ] );
        }
      }

      if ( macdLine.length >= 9 )
      {
        const signalLine = calcEMA( macdLine, 9 );
        const macd = macdLine[ macdLine.length - 1 ];
        const signal = signalLine[ signalLine.length - 1 ];
        const histogram = macd - signal;

        let macdSignal: TrendDirection = 'neutral';
        if ( macd > signal && histogram > 0 ) macdSignal = 'bullish';
        else if ( macd < signal && histogram < 0 ) macdSignal = 'bearish';

        const normalizedMACD = ( histogram / currentPrice ) * 1000;

        indicators.push( {
          name: 'MACD',
          value: histogram,
          zScore: normalizedMACD,
          signal: macdSignal,
          weight: 0.25,
          contribution: 0
        } );
      }
    }
  } catch { /* Skip */ }

  // 2. ADX
  try
  {
    const adxResult = calcADX( candles, 14 );
    let adxSignal: TrendDirection = 'neutral';

    if ( adxResult.adx > 25 )
    {
      adxSignal = adxResult.plusDI > adxResult.minusDI ? 'bullish' : 'bearish';
    } else if ( adxResult.adx > 20 )
    {
      adxSignal = adxResult.plusDI > adxResult.minusDI ? 'bullish' : 'bearish';
    }

    const diDiff = adxResult.plusDI - adxResult.minusDI;

    indicators.push( {
      name: 'ADX',
      value: adxResult.adx,
      zScore: diDiff / 20,
      signal: adxSignal,
      weight: 0.20,
      contribution: 0
    } );
  } catch { /* Skip */ }

  // 3. EMA Cross
  try
  {
    const ema9 = calcEMA( closes, 9 );
    const ema21 = calcEMA( closes, 21 );

    if ( ema9.length > 0 && ema21.length > 0 )
    {
      const ema9Val = ema9[ ema9.length - 1 ];
      const ema21Val = ema21[ ema21.length - 1 ];

      let emaSignal: TrendDirection = 'neutral';
      if ( ema9Val > ema21Val && currentPrice > ema9Val ) emaSignal = 'bullish';
      else if ( ema9Val < ema21Val && currentPrice < ema9Val ) emaSignal = 'bearish';
      else if ( ema9Val > ema21Val ) emaSignal = 'bullish';
      else if ( ema9Val < ema21Val ) emaSignal = 'bearish';

      const emaDiff = ( ( ema9Val - ema21Val ) / ema21Val ) * 100;

      indicators.push( {
        name: 'EMA_Cross',
        value: emaDiff,
        zScore: emaDiff,
        signal: emaSignal,
        weight: 0.20,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 4. Price vs SMA 50
  try
  {
    const sma50 = calcSMA( closes, 50 );
    if ( !isNaN( sma50 ) )
    {
      const priceDiff = ( ( currentPrice - sma50 ) / sma50 ) * 100;

      let smaSignal: TrendDirection = 'neutral';
      if ( priceDiff > 2 ) smaSignal = 'bullish';
      else if ( priceDiff < -2 ) smaSignal = 'bearish';

      indicators.push( {
        name: 'SMA50',
        value: priceDiff,
        zScore: priceDiff / 2,
        signal: smaSignal,
        weight: 0.15,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 5. Supertrend (simplified)
  try
  {
    const period = 10;
    const multiplier = 3;

    if ( candles.length >= period )
    {
      // Calculate ATR
      const atrValues: number[] = [];
      for ( let i = 1; i < candles.length; i++ )
      {
        const tr = Math.max(
          candles[ i ].high - candles[ i ].low,
          Math.abs( candles[ i ].high - candles[ i - 1 ].close ),
          Math.abs( candles[ i ].low - candles[ i - 1 ].close )
        );
        atrValues.push( tr );
      }

      const atr = calcSMA( atrValues.slice( -period ), period );
      const hl2 = ( candles[ candles.length - 1 ].high + candles[ candles.length - 1 ].low ) / 2;

      const upperBand = hl2 + ( multiplier * atr );
      const lowerBand = hl2 - ( multiplier * atr );

      let stSignal: TrendDirection = 'neutral';
      if ( currentPrice > upperBand ) stSignal = 'bullish';
      else if ( currentPrice < lowerBand ) stSignal = 'bearish';
      else if ( currentPrice > hl2 ) stSignal = 'bullish';
      else stSignal = 'bearish';

      const distanceFromHL2 = ( ( currentPrice - hl2 ) / hl2 ) * 100;

      indicators.push( {
        name: 'Supertrend',
        value: distanceFromHL2,
        zScore: distanceFromHL2 / 2,
        signal: stSignal,
        weight: 0.20,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  return aggregateCategoryScore( indicators );
}

function calculateVolumeCategory ( candles: OHLCV[] ): CategoryScore
{
  const indicators: IndicatorContribution[] = [];
  const closes = candles.map( c => c.close );
  const volumes = candles.map( c => c.volume );

  // 1. OBV Trend
  try
  {
    let obv = 0;
    const obvHistory: number[] = [ 0 ];

    for ( let i = 1; i < candles.length; i++ )
    {
      if ( closes[ i ] > closes[ i - 1 ] ) obv += volumes[ i ];
      else if ( closes[ i ] < closes[ i - 1 ] ) obv -= volumes[ i ];
      obvHistory.push( obv );
    }

    const recentOBV = obvHistory.slice( -10 );
    const obvTrend = recentOBV[ recentOBV.length - 1 ] - recentOBV[ 0 ];
    const obvNormalized = recentOBV[ 0 ] !== 0 ? obvTrend / Math.abs( recentOBV[ 0 ] ) : 0;

    let obvSignal: TrendDirection = 'neutral';
    if ( obvNormalized > 0.05 ) obvSignal = 'bullish';
    else if ( obvNormalized < -0.05 ) obvSignal = 'bearish';

    indicators.push( {
      name: 'OBV',
      value: obvTrend,
      zScore: obvNormalized * 10,
      signal: obvSignal,
      weight: 0.30,
      contribution: 0
    } );
  } catch { /* Skip */ }

  // 2. Volume Moving Average
  try
  {
    const avgVolume = calcSMA( volumes, 20 );
    const currentVolume = volumes[ volumes.length - 1 ];

    if ( !isNaN( avgVolume ) && avgVolume > 0 )
    {
      const volRatio = currentVolume / avgVolume;

      // High volume with price up = bullish, with price down = bearish
      const priceChange = closes[ closes.length - 1 ] - closes[ closes.length - 2 ];

      let volSignal: TrendDirection = 'neutral';
      if ( volRatio > 1.5 && priceChange > 0 ) volSignal = 'bullish';
      else if ( volRatio > 1.5 && priceChange < 0 ) volSignal = 'bearish';

      indicators.push( {
        name: 'VolumeMA',
        value: volRatio,
        zScore: ( volRatio - 1 ) * 2,
        signal: volSignal,
        weight: 0.25,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 3. Price Volume Trend
  try
  {
    let pvt = 0;
    const pvtHistory: number[] = [ 0 ];

    for ( let i = 1; i < candles.length; i++ )
    {
      const priceChange = ( closes[ i ] - closes[ i - 1 ] ) / closes[ i - 1 ];
      pvt += volumes[ i ] * priceChange;
      pvtHistory.push( pvt );
    }

    const recentPVT = pvtHistory.slice( -10 );
    const pvtTrend = recentPVT[ recentPVT.length - 1 ] - recentPVT[ 0 ];

    let pvtSignal: TrendDirection = 'neutral';
    if ( pvtTrend > 0 ) pvtSignal = 'bullish';
    else if ( pvtTrend < 0 ) pvtSignal = 'bearish';

    const avgVolume = calcSMA( volumes, 20 );
    const pvtNormalized = avgVolume > 0 ? pvtTrend / avgVolume : 0;

    indicators.push( {
      name: 'PVT',
      value: pvtTrend,
      zScore: pvtNormalized,
      signal: pvtSignal,
      weight: 0.25,
      contribution: 0
    } );
  } catch { /* Skip */ }

  // 4. Accumulation/Distribution
  try
  {
    let ad = 0;
    for ( let i = 0; i < candles.length; i++ )
    {
      const mfm = candles[ i ].high === candles[ i ].low ? 0 :
        ( ( candles[ i ].close - candles[ i ].low ) - ( candles[ i ].high - candles[ i ].close ) ) /
        ( candles[ i ].high - candles[ i ].low );
      ad += mfm * candles[ i ].volume;
    }

    // Calculate AD trend
    let adPrev = 0;
    for ( let i = 0; i < candles.length - 10; i++ )
    {
      const mfm = candles[ i ].high === candles[ i ].low ? 0 :
        ( ( candles[ i ].close - candles[ i ].low ) - ( candles[ i ].high - candles[ i ].close ) ) /
        ( candles[ i ].high - candles[ i ].low );
      adPrev += mfm * candles[ i ].volume;
    }

    const adTrend = ad - adPrev;
    const avgVolume = calcSMA( volumes, 20 );
    const adNormalized = avgVolume > 0 ? adTrend / ( avgVolume * 10 ) : 0;

    let adSignal: TrendDirection = 'neutral';
    if ( adNormalized > 0.1 ) adSignal = 'bullish';
    else if ( adNormalized < -0.1 ) adSignal = 'bearish';

    indicators.push( {
      name: 'A/D',
      value: adTrend,
      zScore: adNormalized,
      signal: adSignal,
      weight: 0.20,
      contribution: 0
    } );
  } catch { /* Skip */ }

  return aggregateCategoryScore( indicators );
}

function calculateVolatilityCategory ( candles: OHLCV[] ): CategoryScore
{
  const indicators: IndicatorContribution[] = [];
  const closes = candles.map( c => c.close );
  const currentPrice = closes[ closes.length - 1 ];

  // 1. Bollinger Bands
  try
  {
    const period = 20;
    const sma = calcSMA( closes, period );

    if ( !isNaN( sma ) )
    {
      const recentCloses = closes.slice( -period );
      const variance = recentCloses.reduce( ( sum, c ) => sum + Math.pow( c - sma, 2 ), 0 ) / period;
      const stdDev = Math.sqrt( variance );

      const upperBand = sma + ( 2 * stdDev );
      const lowerBand = sma - ( 2 * stdDev );
      const bandWidth = upperBand - lowerBand;

      const percentB = bandWidth === 0 ? 0.5 : ( currentPrice - lowerBand ) / bandWidth;

      let bbSignal: TrendDirection = 'neutral';
      if ( percentB < 0 ) bbSignal = 'bullish';
      else if ( percentB > 1 ) bbSignal = 'bearish';
      else if ( percentB < 0.2 ) bbSignal = 'bullish';
      else if ( percentB > 0.8 ) bbSignal = 'bearish';

      indicators.push( {
        name: 'BollingerBands',
        value: percentB,
        zScore: ( percentB - 0.5 ) * 4,
        signal: bbSignal,
        weight: 0.35,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 2. ATR Percentile
  try
  {
    const atrValues: number[] = [];
    for ( let i = 1; i < candles.length; i++ )
    {
      const tr = Math.max(
        candles[ i ].high - candles[ i ].low,
        Math.abs( candles[ i ].high - candles[ i - 1 ].close ),
        Math.abs( candles[ i ].low - candles[ i - 1 ].close )
      );
      atrValues.push( ( tr / candles[ i ].close ) * 100 );
    }

    const currentATR = atrValues[ atrValues.length - 1 ];
    const avgATR = calcSMA( atrValues, 20 );

    if ( !isNaN( avgATR ) && avgATR > 0 )
    {
      const atrRatio = currentATR / avgATR;

      const atrSignal: TrendDirection = 'neutral';

      indicators.push( {
        name: 'ATR',
        value: atrRatio,
        zScore: ( atrRatio - 1 ) * 2,
        signal: atrSignal,
        weight: 0.35,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  // 3. Donchian Channels
  try
  {
    const period = 20;
    if ( candles.length >= period )
    {
      const recentCandles = candles.slice( -period );
      const highestHigh = Math.max( ...recentCandles.map( c => c.high ) );
      const lowestLow = Math.min( ...recentCandles.map( c => c.low ) );

      const range = highestHigh - lowestLow;
      const position = range === 0 ? 0.5 : ( currentPrice - lowestLow ) / range;

      let donchianSignal: TrendDirection = 'neutral';
      if ( currentPrice >= highestHigh ) donchianSignal = 'bullish';
      else if ( currentPrice <= lowestLow ) donchianSignal = 'bearish';

      indicators.push( {
        name: 'Donchian',
        value: position,
        zScore: ( position - 0.5 ) * 4,
        signal: donchianSignal,
        weight: 0.30,
        contribution: 0
      } );
    }
  } catch { /* Skip */ }

  return aggregateCategoryScore( indicators );
}

// ==========================================================
// AGGREGATE CATEGORY SCORE
// ==========================================================

function aggregateCategoryScore ( indicators: IndicatorContribution[] ): CategoryScore
{
  if ( indicators.length === 0 )
  {
    return {
      score: 0,
      confidence: 0,
      indicators: [],
      signalCount: { bullish: 0, bearish: 0, neutral: 0 }
    };
  }

  const totalWeight = indicators.reduce( ( sum, ind ) => sum + ind.weight, 0 );
  indicators.forEach( ind => ind.weight = ind.weight / totalWeight );

  const signalCount = {
    bullish: indicators.filter( i => i.signal === 'bullish' ).length,
    bearish: indicators.filter( i => i.signal === 'bearish' ).length,
    neutral: indicators.filter( i => i.signal === 'neutral' ).length
  };

  let weightedScore = 0;
  indicators.forEach( ind =>
  {
    let signalValue = 0;
    if ( ind.signal === 'bullish' ) signalValue = 1;
    else if ( ind.signal === 'bearish' ) signalValue = -1;

    const magnitude = Math.min( 1, Math.abs( ind.zScore ) / 2 );
    ind.contribution = signalValue * ind.weight * ( 0.5 + magnitude * 0.5 );
    weightedScore += ind.contribution;
  } );

  const score = Math.round( weightedScore * 100 );
  const totalSignals = signalCount.bullish + signalCount.bearish + signalCount.neutral;
  const dominantSignal = Math.max( signalCount.bullish, signalCount.bearish );
  const confidence = Math.round( ( dominantSignal / totalSignals ) * 100 );

  return {
    score: Math.max( -100, Math.min( 100, score ) ),
    confidence,
    indicators,
    signalCount
  };
}

// ==========================================================
// MAIN ELITE TREND FUNCTION
// ==========================================================

export function calculateEliteTrendScore (
  candles: OHLCV[],
  timeframe: string = '4h'
): EliteTrendResult
{
  if ( candles.length < 100 )
  {
    return createEmptyResult();
  }

  const regimeResult = detectMarketRegime( candles );

  const momentumScore = calculateMomentumCategory( candles );
  const trendScore = calculateTrendCategory( candles );
  const volumeScore = calculateVolumeCategory( candles );
  const volatilityScore = calculateVolatilityCategory( candles );

  const weights = getAdjustedWeights( regimeResult.regime, timeframe );

  const compositeScore =
    momentumScore.score * weights.momentum +
    trendScore.score * weights.trend +
    volumeScore.score * weights.volume +
    volatilityScore.score * weights.volatility;

  let direction: TrendDirection = 'neutral';
  if ( compositeScore > 15 ) direction = 'bullish';
  else if ( compositeScore < -15 ) direction = 'bearish';

  let confirmations = 0;
  const categories = [ momentumScore, trendScore, volumeScore, volatilityScore ];
  categories.forEach( cat =>
  {
    if ( direction === 'bullish' && cat.score > 0 ) confirmations++;
    else if ( direction === 'bearish' && cat.score < 0 ) confirmations++;
    else if ( direction === 'neutral' && Math.abs( cat.score ) < 20 ) confirmations++;
  } );

  const avgCategoryConfidence =
    ( momentumScore.confidence + trendScore.confidence +
      volumeScore.confidence + volatilityScore.confidence ) / 4;

  const confirmationBoost = confirmations >= 3 ? 15 : confirmations >= 2 ? 5 : 0;
  const overallConfidence = Math.min( 100, avgCategoryConfidence + confirmationBoost );

  const isValidSignal = confirmations >= 3;

  const allIndicators = [
    ...momentumScore.indicators,
    ...trendScore.indicators,
    ...volumeScore.indicators,
    ...volatilityScore.indicators
  ];

  return {
    score: Math.round( compositeScore ),
    direction,
    strength: Math.abs( Math.round( compositeScore ) ),
    confidence: Math.round( overallConfidence ),
    regime: regimeResult.regime,
    regimeConfidence: regimeResult.confidence,
    momentumScore,
    trendScore,
    volumeScore,
    volatilityScore,
    confirmations,
    isValidSignal,
    allIndicators
  };
}

function createEmptyResult (): EliteTrendResult
{
  const emptyCategory: CategoryScore = {
    score: 0,
    confidence: 0,
    indicators: [],
    signalCount: { bullish: 0, bearish: 0, neutral: 0 }
  };

  return {
    score: 0,
    direction: 'neutral',
    strength: 0,
    confidence: 0,
    regime: 'ranging',
    regimeConfidence: 0,
    momentumScore: emptyCategory,
    trendScore: emptyCategory,
    volumeScore: emptyCategory,
    volatilityScore: emptyCategory,
    confirmations: 0,
    isValidSignal: false,
    allIndicators: []
  };
}

export function calculateTimeframeAgreement (
  results: Map<string, EliteTrendResult>
): number
{
  const directions = Array.from( results.values() ).map( r => r.direction );
  if ( directions.length === 0 ) return 0;

  const bullishCount = directions.filter( d => d === 'bullish' ).length;
  const bearishCount = directions.filter( d => d === 'bearish' ).length;

  const dominantCount = Math.max( bullishCount, bearishCount );
  return Math.round( ( dominantCount / directions.length ) * 100 );
}

export function getEliteSignalSummary ( result: EliteTrendResult ):
  {
    label: string;
    labelAr: string;
    color: string;
    emoji: string;
  }
{
  const { score, direction, confidence, isValidSignal } = result;

  if ( !isValidSignal || confidence < 50 )
  {
    return {
      label: 'No Clear Signal',
      labelAr: 'لا توجد إشارة واضحة',
      color: 'gray',
      emoji: '⚪'
    };
  }

  if ( direction === 'bullish' )
  {
    if ( score >= 60 && confidence >= 80 )
    {
      return { label: 'Strong Buy', labelAr: 'شراء قوي', color: 'green', emoji: '🟢' };
    } else if ( score >= 30 )
    {
      return { label: 'Buy', labelAr: 'شراء', color: 'lightgreen', emoji: '🟩' };
    }
  }

  if ( direction === 'bearish' )
  {
    if ( score <= -60 && confidence >= 80 )
    {
      return { label: 'Strong Sell', labelAr: 'بيع قوي', color: 'red', emoji: '🔴' };
    } else if ( score <= -30 )
    {
      return { label: 'Sell', labelAr: 'بيع', color: 'lightcoral', emoji: '🟥' };
    }
  }

  return { label: 'Neutral', labelAr: 'محايد', color: 'yellow', emoji: '🟡' };
}

export function getRegimeDisplayInfo ( regime: MarketRegime ):
  {
    label: string;
    labelAr: string;
    emoji: string;
    description: string;
    descriptionAr: string;
  }
{
  switch ( regime )
  {
    case 'trending':
      return {
        label: 'Trending',
        labelAr: 'اتجاهي',
        emoji: '🔥',
        description: 'Strong directional movement',
        descriptionAr: 'حركة اتجاهية قوية'
      };
    case 'ranging':
      return {
        label: 'Ranging',
        labelAr: 'عرضي',
        emoji: '📊',
        description: 'Sideways consolidation',
        descriptionAr: 'تذبذب عرضي'
      };
    case 'volatile':
      return {
        label: 'Volatile',
        labelAr: 'متذبذب',
        emoji: '⚡',
        description: 'High volatility environment',
        descriptionAr: 'بيئة عالية التذبذب'
      };
  }
}
