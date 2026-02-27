/**
 * Technical Indicators Library
 * مكتبة المؤشرات الفنية للتحليل المتقدم
 */

export interface OHLCV
{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult
{
  value: number | null;
  signal?: 'bullish' | 'bearish' | 'neutral';
  strength?: number; // 0-100
}

export interface TrendAnalysis
{
  indicator: string;
  timeframe: string;
  result: IndicatorResult;
}

// ============================================
// Moving Averages - المتوسطات المتحركة
// ============================================

/**
 * Simple Moving Average (SMA)
 * المتوسط المتحرك البسيط
 */
export function calculateSMA ( data: number[], period: number ): number | null
{
  if ( data.length < period ) return null;
  const slice = data.slice( -period );
  return slice.reduce( ( sum, val ) => sum + val, 0 ) / period;
}

/**
 * Exponential Moving Average (EMA)
 * المتوسط المتحرك الأسي
 */
export function calculateEMA ( data: number[], period: number ): number | null
{
  if ( data.length < period ) return null;

  const multiplier = 2 / ( period + 1 );
  let ema = calculateSMA( data.slice( 0, period ), period );

  if ( ema === null ) return null;

  for ( let i = period; i < data.length; i++ )
  {
    ema = ( data[ i ] - ema ) * multiplier + ema;
  }

  return ema;
}

/**
 * EMA Array - حساب مصفوفة EMA كاملة
 */
export function calculateEMAArray ( data: number[], period: number ): number[]
{
  if ( data.length < period ) return [];

  const emaArray: number[] = [];
  const multiplier = 2 / ( period + 1 );

  // أول قيمة هي SMA
  let ema = data.slice( 0, period ).reduce( ( sum, val ) => sum + val, 0 ) / period;
  emaArray.push( ema );

  for ( let i = period; i < data.length; i++ )
  {
    ema = ( data[ i ] - ema ) * multiplier + ema;
    emaArray.push( ema );
  }

  return emaArray;
}

/**
 * Moving Average Signal
 * إشارة المتوسط المتحرك
 */
export function getMASignal (
  closes: number[],
  shortPeriod: number = 9,
  longPeriod: number = 21
): IndicatorResult
{
  const shortMA = calculateEMA( closes, shortPeriod );
  const longMA = calculateEMA( closes, longPeriod );
  const currentPrice = closes[ closes.length - 1 ];

  if ( shortMA === null || longMA === null )
  {
    return { value: null, signal: 'neutral', strength: 50 };
  }

  const diff = ( ( shortMA - longMA ) / longMA ) * 100;
  const priceAboveMA = currentPrice > shortMA;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;

  if ( shortMA > longMA && priceAboveMA )
  {
    signal = 'bullish';
    strength = Math.min( 100, 50 + Math.abs( diff ) * 10 );
  } else if ( shortMA < longMA && !priceAboveMA )
  {
    signal = 'bearish';
    strength = Math.min( 100, 50 + Math.abs( diff ) * 10 );
  }

  return { value: shortMA, signal, strength };
}

// ============================================
// RSI - مؤشر القوة النسبية
// ============================================

/**
 * Relative Strength Index (RSI)
 * مؤشر القوة النسبية
 */
export function calculateRSI ( closes: number[], period: number = 14 ): IndicatorResult
{
  if ( closes.length < period + 1 )
  {
    return { value: null, signal: 'neutral', strength: 50 };
  }

  const changes: number[] = [];
  for ( let i = 1; i < closes.length; i++ )
  {
    changes.push( closes[ i ] - closes[ i - 1 ] );
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for ( let i = 0; i < period; i++ )
  {
    if ( changes[ i ] > 0 )
    {
      avgGain += changes[ i ];
    } else
    {
      avgLoss += Math.abs( changes[ i ] );
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Smoothed averages
  for ( let i = period; i < changes.length; i++ )
  {
    const change = changes[ i ];
    if ( change > 0 )
    {
      avgGain = ( avgGain * ( period - 1 ) + change ) / period;
      avgLoss = ( avgLoss * ( period - 1 ) ) / period;
    } else
    {
      avgGain = ( avgGain * ( period - 1 ) ) / period;
      avgLoss = ( avgLoss * ( period - 1 ) + Math.abs( change ) ) / period;
    }
  }

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - ( 100 / ( 1 + rs ) );

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;

  if ( rsi < 30 )
  {
    signal = 'bullish'; // Oversold - إشارة شراء
    strength = Math.min( 100, 50 + ( 30 - rsi ) * 2 );
  } else if ( rsi > 70 )
  {
    signal = 'bearish'; // Overbought - إشارة بيع
    strength = Math.min( 100, 50 + ( rsi - 70 ) * 2 );
  } else if ( rsi > 50 )
  {
    signal = 'bullish';
    strength = 50 + ( ( rsi - 50 ) / 20 ) * 25;
  } else
  {
    signal = 'bearish';
    strength = 50 + ( ( 50 - rsi ) / 20 ) * 25;
  }

  return { value: rsi, signal, strength };
}

// ============================================
// MACD - مؤشر التقارب والتباعد
// ============================================

export interface MACDResult extends IndicatorResult
{
  macd: number;
  signalLine: number;
  histogram: number;
}

/**
 * Moving Average Convergence Divergence (MACD)
 * مؤشر التقارب والتباعد للمتوسطات المتحركة
 */
export function calculateMACD (
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult
{
  const nullResult: MACDResult = {
    value: null,
    signal: 'neutral',
    strength: 50,
    macd: 0,
    signalLine: 0,
    histogram: 0
  };

  if ( closes.length < slowPeriod + signalPeriod )
  {
    return nullResult;
  }

  const fastEMA = calculateEMAArray( closes, fastPeriod );
  const slowEMA = calculateEMAArray( closes, slowPeriod );

  if ( fastEMA.length === 0 || slowEMA.length === 0 )
  {
    return nullResult;
  }

  // Calculate MACD line
  const macdLine: number[] = [];
  const startIdx = slowPeriod - fastPeriod;

  for ( let i = 0; i < slowEMA.length; i++ )
  {
    const fastIdx = i + startIdx;
    if ( fastIdx >= 0 && fastIdx < fastEMA.length )
    {
      macdLine.push( fastEMA[ fastIdx ] - slowEMA[ i ] );
    }
  }

  if ( macdLine.length < signalPeriod )
  {
    return nullResult;
  }

  // Calculate Signal line (EMA of MACD)
  const signalLineArray = calculateEMAArray( macdLine, signalPeriod );

  if ( signalLineArray.length === 0 )
  {
    return nullResult;
  }

  const macd = macdLine[ macdLine.length - 1 ];
  const signalLine = signalLineArray[ signalLineArray.length - 1 ];
  const histogram = macd - signalLine;

  // Previous values for crossover detection
  const prevMACD = macdLine.length > 1 ? macdLine[ macdLine.length - 2 ] : macd;
  const prevSignal = signalLineArray.length > 1 ? signalLineArray[ signalLineArray.length - 2 ] : signalLine;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength = 50;

  // Bullish crossover
  if ( prevMACD <= prevSignal && macd > signalLine )
  {
    signal = 'bullish';
    strength = 80;
  }
  // Bearish crossover
  else if ( prevMACD >= prevSignal && macd < signalLine )
  {
    signal = 'bearish';
    strength = 80;
  }
  // Above signal line
  else if ( macd > signalLine )
  {
    signal = 'bullish';
    strength = 60 + Math.min( 20, Math.abs( histogram ) * 100 );
  }
  // Below signal line
  else
  {
    signal = 'bearish';
    strength = 60 + Math.min( 20, Math.abs( histogram ) * 100 );
  }

  return {
    value: macd,
    signal,
    strength,
    macd,
    signalLine,
    histogram
  };
}

// ============================================
// ATR - متوسط المدى الحقيقي
// ============================================

/**
 * Average True Range (ATR)
 * متوسط المدى الحقيقي
 */
export function calculateATR ( candles: OHLCV[], period: number = 14 ): number | null
{
  if ( candles.length < period + 1 ) return null;

  const trueRanges: number[] = [];

  for ( let i = 1; i < candles.length; i++ )
  {
    const high = candles[ i ].high;
    const low = candles[ i ].low;
    const prevClose = candles[ i - 1 ].close;

    const tr = Math.max(
      high - low,
      Math.abs( high - prevClose ),
      Math.abs( low - prevClose )
    );

    trueRanges.push( tr );
  }

  // First ATR is SMA
  let atr = trueRanges.slice( 0, period ).reduce( ( sum, val ) => sum + val, 0 ) / period;

  // Smoothed ATR
  for ( let i = period; i < trueRanges.length; i++ )
  {
    atr = ( atr * ( period - 1 ) + trueRanges[ i ] ) / period;
  }

  return atr;
}

// ============================================
// Supertrend - سوبرتريند
// ============================================

export interface SupertrendResult extends IndicatorResult
{
  supertrend: number;
  direction: 1 | -1; // 1 = bullish, -1 = bearish
}

/**
 * Supertrend Indicator
 * مؤشر سوبرتريند
 */
export function calculateSupertrend (
  candles: OHLCV[],
  period: number = 10,
  multiplier: number = 3
): SupertrendResult
{
  const nullResult: SupertrendResult = {
    value: null,
    signal: 'neutral',
    strength: 50,
    supertrend: 0,
    direction: 1
  };

  if ( candles.length < period + 1 )
  {
    return nullResult;
  }

  const atr = calculateATR( candles, period );
  if ( atr === null ) return nullResult;

  const currentCandle = candles[ candles.length - 1 ];
  const hl2 = ( currentCandle.high + currentCandle.low ) / 2;

  const upperBand = hl2 + ( multiplier * atr );
  const lowerBand = hl2 - ( multiplier * atr );

  // Simplified direction detection
  const prevCandle = candles[ candles.length - 2 ];
  const direction: 1 | -1 = currentCandle.close > hl2 ? 1 : -1;

  const supertrend = direction === 1 ? lowerBand : upperBand;

  let signal: 'bullish' | 'bearish' = direction === 1 ? 'bullish' : 'bearish';
  let strength = 70;

  // Increase strength if price is far from supertrend
  const distance = Math.abs( currentCandle.close - supertrend ) / currentCandle.close * 100;
  strength = Math.min( 100, 60 + distance * 5 );

  return {
    value: supertrend,
    signal,
    strength,
    supertrend,
    direction
  };
}

// ============================================
// ADX - مؤشر الاتجاه المتوسط
// ============================================

export interface ADXResult extends IndicatorResult
{
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'strong' | 'moderate' | 'weak' | 'no-trend';
}

/**
 * Average Directional Index (ADX)
 * مؤشر الاتجاه المتوسط
 */
export function calculateADX ( candles: OHLCV[], period: number = 14 ): ADXResult
{
  const nullResult: ADXResult = {
    value: null,
    signal: 'neutral',
    strength: 50,
    adx: 0,
    plusDI: 0,
    minusDI: 0,
    trendStrength: 'no-trend'
  };

  if ( candles.length < period * 2 )
  {
    return nullResult;
  }

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trueRanges: number[] = [];

  for ( let i = 1; i < candles.length; i++ )
  {
    const high = candles[ i ].high;
    const low = candles[ i ].low;
    const prevHigh = candles[ i - 1 ].high;
    const prevLow = candles[ i - 1 ].low;
    const prevClose = candles[ i - 1 ].close;

    // True Range
    const tr = Math.max(
      high - low,
      Math.abs( high - prevClose ),
      Math.abs( low - prevClose )
    );
    trueRanges.push( tr );

    // Directional Movement
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if ( upMove > downMove && upMove > 0 )
    {
      plusDM.push( upMove );
    } else
    {
      plusDM.push( 0 );
    }

    if ( downMove > upMove && downMove > 0 )
    {
      minusDM.push( downMove );
    } else
    {
      minusDM.push( 0 );
    }
  }

  // Smoothed values
  const smoothedTR = calculateSmoothed( trueRanges, period );
  const smoothedPlusDM = calculateSmoothed( plusDM, period );
  const smoothedMinusDM = calculateSmoothed( minusDM, period );

  if ( smoothedTR === 0 ) return nullResult;

  const plusDI = ( smoothedPlusDM / smoothedTR ) * 100;
  const minusDI = ( smoothedMinusDM / smoothedTR ) * 100;

  const dx = Math.abs( plusDI - minusDI ) / ( plusDI + minusDI ) * 100;

  // Simplified ADX (would need more history for proper calculation)
  const adx = dx;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let trendStrength: 'strong' | 'moderate' | 'weak' | 'no-trend' = 'no-trend';

  if ( adx >= 50 )
  {
    trendStrength = 'strong';
  } else if ( adx >= 25 )
  {
    trendStrength = 'moderate';
  } else if ( adx >= 20 )
  {
    trendStrength = 'weak';
  }

  if ( plusDI > minusDI )
  {
    signal = 'bullish';
  } else if ( minusDI > plusDI )
  {
    signal = 'bearish';
  }

  const strength = adx;

  return {
    value: adx,
    signal,
    strength,
    adx,
    plusDI,
    minusDI,
    trendStrength
  };
}

function calculateSmoothed ( data: number[], period: number ): number
{
  if ( data.length < period ) return 0;

  let smoothed = data.slice( 0, period ).reduce( ( sum, val ) => sum + val, 0 );

  for ( let i = period; i < data.length; i++ )
  {
    smoothed = smoothed - ( smoothed / period ) + data[ i ];
  }

  return smoothed;
}

// ============================================
// Trend Strength Calculator - حاسبة قوة الاتجاه
// ============================================

export interface TrendStrengthResult
{
  bullishScore: number; // 0-100
  bearishScore: number; // 0-100
  overallTrend: 'strong-bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong-bearish';
  score?: number;
  regime?: 'range' | 'trend' | 'strong_trend';
  positives?: string[];
  negatives?: string[];
  notes?: string[];
  indicators: {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  }[];
}

/**
 * Calculate Overall Trend Strength
 * حساب قوة الاتجاه الإجمالية
 */
export function calculateTrendStrength ( candles: OHLCV[] ): TrendStrengthResult
{
  const closes = candles.map( c => c.close );
  const volumes = candles.map( c => c.volume );

  const clamp = ( value: number, min: number = 0, max: number = 1 ) => Math.max( min, Math.min( max, value ) );

  const computeOBV = ( close: number[], volume: number[] ): number[] =>
  {
    const obv: number[] = [ 0 ];
    for ( let i = 1; i < close.length; i++ )
    {
      if ( close[ i ] > close[ i - 1 ] ) obv.push( obv[ i - 1 ] + volume[ i ] );
      else if ( close[ i ] < close[ i - 1 ] ) obv.push( obv[ i - 1 ] - volume[ i ] );
      else obv.push( obv[ i - 1 ] );
    }
    return obv;
  };

  const indicators: TrendStrengthResult[ 'indicators' ] = [];
  const positives: string[] = [];
  const negatives: string[] = [];
  const notes: string[] = [];

  const currentPrice = closes[ closes.length - 1 ] || 0;

  const ema200 = calculateEMA( closes, 200 );
  const ema50 = calculateEMA( closes, 50 );
  const ema9 = calculateEMA( closes, 9 );
  const ema21 = calculateEMA( closes, 21 );
  const sma20 = calculateSMA( closes, 20 );

  const rsiResult = calculateRSI( closes, 14 );
  const rsiValue = rsiResult.value ?? 50;

  const macdResult = calculateMACD( closes );
  const macdHist = macdResult.histogram;

  const obv = computeOBV( closes, volumes );
  const obvTrend = obv.length > 1 ? obv[ obv.length - 1 ] - obv[ Math.max( 0, obv.length - 11 ) ] : 0;

  const adxResult = calculateADX( candles );
  const currentAdx = adxResult.adx;

  let regime: TrendStrengthResult[ 'regime' ] = 'range';
  let regimeFactor = 0.4;
  if ( currentAdx >= 28 )
  {
    regime = 'strong_trend';
    regimeFactor = 1.0;
  } else if ( currentAdx >= 18 )
  {
    regime = 'trend';
    regimeFactor = 0.7;
  }

  const weights = {
    ema200: 0.28,
    maTrend: 0.18,
    emaShort: 0.10,
    macd: 0.20,
    rsi: 0.14,
    obv: 0.10
  };

  const trendComponents = new Set( [ 'ema200', 'maTrend', 'emaShort' ] );
  const adjustedWeights = Object.fromEntries(
    Object.entries( weights ).map( ( [ key, value ] ) => [
      key,
      trendComponents.has( key ) ? value * regimeFactor : value
    ] )
  ) as typeof weights;

  let bullishSum = 0;
  let bearishSum = 0;

  const register = (
    name: keyof typeof weights,
    direction: 'bullish' | 'bearish' | 'neutral',
    strength: number,
    bullishReason: string,
    bearishReason: string
  ) =>
  {
    const weight = adjustedWeights[ name ] ?? 0;
    const normStrength = clamp( strength );

    indicators.push( { name, signal: direction, strength: Math.round( normStrength * 100 ) } );

    if ( direction === 'bullish' )
    {
      bullishSum += weight * normStrength;
      positives.push( bullishReason );
    } else if ( direction === 'bearish' )
    {
      bearishSum += weight * normStrength;
      negatives.push( bearishReason );
    }
  };

  if ( ema200 && ema200 > 0 )
  {
    const diff = ( currentPrice - ema200 ) / ema200;
    register( 'ema200', diff >= 0 ? 'bullish' : 'bearish', Math.abs( diff ) / 0.02, 'السعر فوق EMA200', 'السعر تحت EMA200' );
  } else
  {
    register( 'ema200', 'neutral', 0, '', '' );
  }

  if ( ema50 && sma20 )
  {
    const diff = ( ema50 - sma20 ) / sma20;
    register( 'maTrend', ema50 >= sma20 ? 'bullish' : 'bearish', Math.abs( diff ) / 0.01, 'EMA50 فوق SMA20', 'EMA50 تحت SMA20' );
  } else
  {
    register( 'maTrend', 'neutral', 0, '', '' );
  }

  if ( ema21 )
  {
    const diff = ( ( ema9 || 0 ) - ema21 ) / ema21;
    register( 'emaShort', ( ema9 || 0 ) >= ema21 ? 'bullish' : 'bearish', Math.abs( diff ) / 0.006, 'EMA9 فوق EMA21', 'EMA9 تحت EMA21' );
  } else
  {
    register( 'emaShort', 'neutral', 0, '', '' );
  }

  if ( macdHist > 0 )
  {
    register( 'macd', 'bullish', Math.abs( macdHist ) / Math.max( currentPrice * 0.002, 1e-9 ), 'MACD هيستوجرام موجب', '' );
  } else if ( macdHist < 0 )
  {
    register( 'macd', 'bearish', Math.abs( macdHist ) / Math.max( currentPrice * 0.002, 1e-9 ), '', 'MACD هيستوجرام سالب' );
  } else
  {
    register( 'macd', 'neutral', 0, '', '' );
  }

  const rsiStrength = Math.abs( rsiValue - 50 ) / 25;
  if ( rsiValue >= 55 )
  {
    register( 'rsi', 'bullish', rsiStrength, 'RSI يميل للصعود', '' );
    if ( rsiValue >= 70 ) notes.push( 'RSI تشبع شرائي' );
  } else if ( rsiValue <= 45 )
  {
    register( 'rsi', 'bearish', rsiStrength, '', 'RSI يميل للهبوط' );
    if ( rsiValue <= 30 ) notes.push( 'RSI تشبع بيعي' );
  } else
  {
    register( 'rsi', 'neutral', 0, '', '' );
  }

  if ( obvTrend > 0 )
  {
    register( 'obv', 'bullish', 0.7, 'OBV يدعم الصعود', '' );
  } else if ( obvTrend < 0 )
  {
    register( 'obv', 'bearish', 0.7, '', 'OBV يدعم الهبوط' );
  } else
  {
    register( 'obv', 'neutral', 0, '', '' );
  }

  if ( regime === 'range' ) notes.push( 'الاتجاه ضعيف (ADX منخفض)' );

  const totalWeight = Object.values( adjustedWeights ).reduce( ( sum, value ) => sum + value, 0 );
  const bullishScore = totalWeight > 0 ? ( bullishSum / totalWeight ) * 100 : 0;
  const bearishScore = totalWeight > 0 ? ( bearishSum / totalWeight ) * 100 : 0;
  const score = totalWeight > 0 ? ( ( bullishSum - bearishSum ) / totalWeight ) * 100 : 0;

  let overallTrend: TrendStrengthResult[ 'overallTrend' ] = 'neutral';
  if ( bullishScore >= 70 ) overallTrend = 'strong-bullish';
  else if ( bullishScore >= 50 ) overallTrend = 'bullish';
  else if ( bearishScore >= 70 ) overallTrend = 'strong-bearish';
  else if ( bearishScore >= 50 ) overallTrend = 'bearish';

  return {
    bullishScore,
    bearishScore,
    overallTrend,
    score,
    regime,
    positives,
    negatives,
    notes,
    indicators
  };
}

// ============================================
// Bollinger Bands - بولنجر باندز
// ============================================

export interface BollingerBandsResult
{
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

/**
 * Bollinger Bands
 * نطاقات بولنجر
 */
export function calculateBollingerBands (
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult | null
{
  if ( closes.length < period ) return null;

  const slice = closes.slice( -period );
  const sma = slice.reduce( ( sum, val ) => sum + val, 0 ) / period;

  // Calculate standard deviation
  const squaredDiffs = slice.map( val => Math.pow( val - sma, 2 ) );
  const avgSquaredDiff = squaredDiffs.reduce( ( sum, val ) => sum + val, 0 ) / period;
  const standardDeviation = Math.sqrt( avgSquaredDiff );

  const upper = sma + ( stdDev * standardDeviation );
  const lower = sma - ( stdDev * standardDeviation );
  const bandwidth = ( ( upper - lower ) / sma ) * 100;
  const percentB = ( closes[ closes.length - 1 ] - lower ) / ( upper - lower ) * 100;

  return { upper, middle: sma, lower, bandwidth, percentB };
}

/**
 * Bollinger Bands Array - مصفوفة كاملة
 */
export function calculateBollingerBandsArray (
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: ( number | null )[]; middle: ( number | null )[]; lower: ( number | null )[] }
{
  const upper: ( number | null )[] = [];
  const middle: ( number | null )[] = [];
  const lower: ( number | null )[] = [];

  for ( let i = 0; i < closes.length; i++ )
  {
    if ( i < period - 1 )
    {
      upper.push( null );
      middle.push( null );
      lower.push( null );
    } else
    {
      const slice = closes.slice( i - period + 1, i + 1 );
      const sma = slice.reduce( ( sum, val ) => sum + val, 0 ) / period;

      const squaredDiffs = slice.map( val => Math.pow( val - sma, 2 ) );
      const avgSquaredDiff = squaredDiffs.reduce( ( sum, val ) => sum + val, 0 ) / period;
      const standardDeviation = Math.sqrt( avgSquaredDiff );

      upper.push( sma + ( stdDev * standardDeviation ) );
      middle.push( sma );
      lower.push( sma - ( stdDev * standardDeviation ) );
    }
  }

  return { upper, middle, lower };
}

// ============================================
// Supertrend Array - مصفوفة سوبرتريند
// ============================================

export interface SupertrendArrayResult
{
  values: ( number | null )[];
  directions: ( 1 | -1 )[];
  colors: string[];
}

/**
 * Supertrend Array
 * مصفوفة سوبرتريند كاملة
 */
export function calculateSupertrendArray (
  candles: OHLCV[],
  period: number = 10,
  multiplier: number = 3
): SupertrendArrayResult
{
  const values: ( number | null )[] = [];
  const directions: ( 1 | -1 )[] = [];
  const colors: string[] = [];

  if ( candles.length < period + 1 )
  {
    return { values: new Array( candles.length ).fill( null ), directions: [], colors: [] };
  }

  // Pre-calculate ATR for all periods
  const atrValues: ( number | null )[] = [];
  for ( let i = 0; i < candles.length; i++ )
  {
    if ( i < period )
    {
      atrValues.push( null );
    } else
    {
      const trueRanges: number[] = [];
      for ( let j = i - period + 1; j <= i; j++ )
      {
        const high = candles[ j ].high;
        const low = candles[ j ].low;
        const prevClose = j > 0 ? candles[ j - 1 ].close : candles[ j ].open;
        trueRanges.push( Math.max( high - low, Math.abs( high - prevClose ), Math.abs( low - prevClose ) ) );
      }
      atrValues.push( trueRanges.reduce( ( a, b ) => a + b, 0 ) / period );
    }
  }

  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection: 1 | -1 = 1;

  for ( let i = 0; i < candles.length; i++ )
  {
    if ( i < period || atrValues[ i ] === null )
    {
      values.push( null );
      directions.push( 1 );
      colors.push( '#22c55e' );
      continue;
    }

    const atr = atrValues[ i ]!;
    const hl2 = ( candles[ i ].high + candles[ i ].low ) / 2;

    let upperBand = hl2 + ( multiplier * atr );
    let lowerBand = hl2 - ( multiplier * atr );

    // Adjust bands based on previous values
    if ( i > period )
    {
      upperBand = upperBand < prevUpperBand || candles[ i - 1 ].close > prevUpperBand ? upperBand : prevUpperBand;
      lowerBand = lowerBand > prevLowerBand || candles[ i - 1 ].close < prevLowerBand ? lowerBand : prevLowerBand;
    }

    // Determine direction
    let direction: 1 | -1;
    if ( i === period )
    {
      direction = candles[ i ].close > hl2 ? 1 : -1;
    } else
    {
      if ( prevDirection === 1 )
      {
        direction = candles[ i ].close < lowerBand ? -1 : 1;
      } else
      {
        direction = candles[ i ].close > upperBand ? 1 : -1;
      }
    }

    const supertrend = direction === 1 ? lowerBand : upperBand;

    values.push( supertrend );
    directions.push( direction );
    colors.push( direction === 1 ? '#22c55e' : '#ef4444' );

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = supertrend;
    prevDirection = direction;
  }

  return { values, directions, colors };
}

// ============================================
// SMA Array - مصفوفة SMA كاملة
// ============================================

/**
 * SMA Array - حساب مصفوفة SMA كاملة
 * محسّن باستخدام Sliding Window للأداء العالي
 * بدلاً من O(n*period) أصبح O(n)
 */
export function calculateSMAArray ( data: number[], period: number ): ( number | null )[]
{
  if ( data.length < period )
  {
    return new Array( data.length ).fill( null );
  }

  const result: ( number | null )[] = new Array( period - 1 ).fill( null );

  // حساب أول مجموع
  let sum = 0;
  for ( let i = 0; i < period; i++ )
  {
    sum += data[ i ];
  }
  result.push( sum / period );

  // Sliding Window - نضيف الجديد ونطرح القديم
  for ( let i = period; i < data.length; i++ )
  {
    sum = sum - data[ i - period ] + data[ i ];
    result.push( sum / period );
  }

  return result;
}

// ============================================
// Timeframe Utilities - أدوات الإطار الزمني
// ============================================

export type Timeframe = '15m' | '1h' | '4h' | '1d' | '1w';

export const timeframeToMs: Record<Timeframe, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000
};

export const timeframeLabels: Record<Timeframe, string> = {
  '15m': '15 دقيقة',
  '1h': 'ساعة',
  '4h': '4 ساعات',
  '1d': 'يوم',
  '1w': '1W'
};
