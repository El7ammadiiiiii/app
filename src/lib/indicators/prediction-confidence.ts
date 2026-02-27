/**
 * Prediction Confidence System - نظام ثقة التنبؤ
 * 
 * نظام متقدم لحساب مستوى الثقة في الإشارات بناءً على:
 * - عدد التأكيدات من مصادر مختلفة
 * - توسع الحجم
 * - توافق Smart Money Concepts
 * - توافق الأطر الزمنية
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import { OHLCV } from './technical';

// Define types locally if elite-trend-algorithms module doesn't exist
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';
export type MarketRegime = 'trending' | 'ranging' | 'volatile';

export interface EliteTrendResult
{
  direction: TrendDirection;
  score: number;
  confidence: number;
  confirmations: number;
  regime: MarketRegime;
}

// ==========================================================
// TYPES & INTERFACES
// ==========================================================

export interface ConfidenceBreakdown
{
  // Main Components
  indicatorAgreement: number;      // 0-100: How many indicators agree
  volumeConfirmation: number;      // 0-100: Volume supports the signal
  smcAlignment: number;            // 0-100: Smart Money alignment
  timeframeAlignment: number;      // 0-100: Multi-TF agreement
  regimeAlignment: number;         // 0-100: Signal matches market regime

  // Composite
  totalConfidence: number;         // 0-100: Weighted total
  confidenceLevel: 'high' | 'medium' | 'low' | 'very-low';

  // Details
  confirmationCount: number;
  maxPossibleConfirmations: number;
  qualityFactors: string[];
  riskFactors: string[];
}

export interface TimeframeAgreementResult
{
  agreementPercent: number;
  dominantDirection: TrendDirection;
  alignedTimeframes: string[];
  conflictingTimeframes: string[];
  strengthScore: number;
}

export interface RiskRewardContext
{
  hasGoodRR: boolean;
  estimatedRR: number;
  nearestSupport: number | null;
  nearestResistance: number | null;
  distanceToSupport: number;
  distanceToResistance: number;
}

export interface PredictionQuality
{
  isHighConfidence: boolean;
  isPremiumSignal: boolean;    // High confidence + good R:R
  shouldTrade: boolean;         // All criteria met
  reasons: string[];
  reasonsAr: string[];
}

// ==========================================================
// CONFIDENCE WEIGHTS
// ==========================================================

const CONFIDENCE_WEIGHTS = {
  indicatorAgreement: 0.35,    // 35% - Main factor
  volumeConfirmation: 0.20,   // 20% - Important validation
  smcAlignment: 0.15,         // 15% - Institutional flow
  timeframeAlignment: 0.20,   // 20% - Multi-TF confirmation
  regimeAlignment: 0.10       // 10% - Context fit
};

// ==========================================================
// VOLUME CONFIRMATION
// ==========================================================

/**
 * Calculate volume confirmation for the signal
 * Checks if volume supports the price movement
 */
export function calculateVolumeConfirmation (
  candles: OHLCV[],
  direction: TrendDirection,
  lookback: number = 20
): number
{
  if ( candles.length < lookback + 5 ) return 50;

  const recentCandles = candles.slice( -5 );
  const historicalCandles = candles.slice( -lookback - 5, -5 );

  // Calculate average historical volume
  const avgHistoricalVolume = historicalCandles.reduce( ( sum, c ) => sum + c.volume, 0 ) / historicalCandles.length;

  // Calculate recent average volume
  const avgRecentVolume = recentCandles.reduce( ( sum, c ) => sum + c.volume, 0 ) / recentCandles.length;

  // Volume expansion ratio
  const volumeRatio = avgRecentVolume / avgHistoricalVolume;

  // Check if volume confirms direction
  let directionConfirmation = 0;

  for ( const candle of recentCandles )
  {
    const isBullishCandle = candle.close > candle.open;
    const isBearishCandle = candle.close < candle.open;
    const isHighVolume = candle.volume > avgHistoricalVolume;

    if ( direction === 'bullish' && isBullishCandle && isHighVolume )
    {
      directionConfirmation += 20;
    } else if ( direction === 'bearish' && isBearishCandle && isHighVolume )
    {
      directionConfirmation += 20;
    } else if ( direction === 'neutral' )
    {
      directionConfirmation += 10;
    }
  }

  // Volume expansion bonus
  let expansionBonus = 0;
  if ( volumeRatio > 1.5 ) expansionBonus = 25;
  else if ( volumeRatio > 1.2 ) expansionBonus = 15;
  else if ( volumeRatio > 1.0 ) expansionBonus = 5;

  const confidence = Math.min( 100, directionConfirmation + expansionBonus );
  return Math.round( confidence );
}

// ==========================================================
// SMC ALIGNMENT (Simplified)
// ==========================================================

/**
 * Calculate Smart Money Concepts alignment
 * Checks for order blocks, fair value gaps, and structure
 */
export function calculateSMCAlignment (
  candles: OHLCV[],
  direction: TrendDirection
): number
{
  if ( candles.length < 50 ) return 50;

  const currentPrice = candles[ candles.length - 1 ].close;
  let alignmentScore = 50; // Start neutral

  // Find recent swing highs and lows
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for ( let i = 5; i < candles.length - 5; i++ )
  {
    const isSwingHigh = candles[ i ].high > candles[ i - 1 ].high &&
      candles[ i ].high > candles[ i - 2 ].high &&
      candles[ i ].high > candles[ i + 1 ].high &&
      candles[ i ].high > candles[ i + 2 ].high;

    const isSwingLow = candles[ i ].low < candles[ i - 1 ].low &&
      candles[ i ].low < candles[ i - 2 ].low &&
      candles[ i ].low < candles[ i + 1 ].low &&
      candles[ i ].low < candles[ i + 2 ].low;

    if ( isSwingHigh ) swingHighs.push( candles[ i ].high );
    if ( isSwingLow ) swingLows.push( candles[ i ].low );
  }

  // Check structure (Higher Highs/Higher Lows or Lower Highs/Lower Lows)
  if ( swingHighs.length >= 2 && swingLows.length >= 2 )
  {
    const recentSwingHighs = swingHighs.slice( -3 );
    const recentSwingLows = swingLows.slice( -3 );

    // Bullish structure: Higher Highs and Higher Lows
    const isHH = recentSwingHighs[ recentSwingHighs.length - 1 ] > recentSwingHighs[ 0 ];
    const isHL = recentSwingLows[ recentSwingLows.length - 1 ] > recentSwingLows[ 0 ];

    // Bearish structure: Lower Highs and Lower Lows
    const isLH = recentSwingHighs[ recentSwingHighs.length - 1 ] < recentSwingHighs[ 0 ];
    const isLL = recentSwingLows[ recentSwingLows.length - 1 ] < recentSwingLows[ 0 ];

    if ( direction === 'bullish' && isHH && isHL )
    {
      alignmentScore += 25; // Structure confirms bullish
    } else if ( direction === 'bearish' && isLH && isLL )
    {
      alignmentScore += 25; // Structure confirms bearish
    } else if ( direction === 'bullish' && ( isLH || isLL ) )
    {
      alignmentScore -= 15; // Structure conflicts with bullish
    } else if ( direction === 'bearish' && ( isHH || isHL ) )
    {
      alignmentScore -= 15; // Structure conflicts with bearish
    }
  }

  // Check for recent Fair Value Gaps (FVGs)
  for ( let i = 2; i < Math.min( 20, candles.length ); i++ )
  {
    const idx = candles.length - 1 - i;
    if ( idx < 2 ) break;

    const prev = candles[ idx - 1 ];
    const curr = candles[ idx ];
    const next = candles[ idx + 1 ];

    // Bullish FVG: gap between candle low and previous high
    if ( next.low > prev.high )
    {
      const fvgMid = ( next.low + prev.high ) / 2;
      if ( direction === 'bullish' && currentPrice > fvgMid )
      {
        alignmentScore += 10;
        break;
      }
    }

    // Bearish FVG: gap between candle high and previous low
    if ( next.high < prev.low )
    {
      const fvgMid = ( next.high + prev.low ) / 2;
      if ( direction === 'bearish' && currentPrice < fvgMid )
      {
        alignmentScore += 10;
        break;
      }
    }
  }

  return Math.max( 0, Math.min( 100, Math.round( alignmentScore ) ) );
}

// ==========================================================
// REGIME ALIGNMENT
// ==========================================================

/**
 * Check if signal aligns with market regime
 * Some signals work better in certain regimes
 */
export function calculateRegimeAlignment (
  direction: TrendDirection,
  regime: MarketRegime,
  score: number
): number
{
  let alignment = 50; // Start neutral

  // Strong directional signals are better in trending markets
  if ( regime === 'trending' )
  {
    if ( direction !== 'neutral' && Math.abs( score ) > 40 )
    {
      alignment = 80; // Strong signal in trending = good
    } else if ( direction !== 'neutral' )
    {
      alignment = 65;
    } else
    {
      alignment = 40; // Neutral signal in trending = not ideal
    }
  }

  // Mean-reversion signals are better in ranging markets
  if ( regime === 'ranging' )
  {
    if ( Math.abs( score ) > 60 )
    {
      alignment = 75; // Extreme readings in range = reversal likely
    } else if ( Math.abs( score ) > 30 )
    {
      alignment = 60;
    } else
    {
      alignment = 55; // Moderate signals okay in range
    }
  }

  // Volatile markets need strong confirmation
  if ( regime === 'volatile' )
  {
    if ( Math.abs( score ) > 70 )
    {
      alignment = 70; // Only strong signals in volatile
    } else if ( Math.abs( score ) > 50 )
    {
      alignment = 50;
    } else
    {
      alignment = 30; // Weak signals in volatile = risky
    }
  }

  return alignment;
}

// ==========================================================
// MULTI-TIMEFRAME AGREEMENT
// ==========================================================

/**
 * Calculate agreement across multiple timeframes
 */
export function getMultiTimeframeAgreement (
  results: Map<string, EliteTrendResult>,
  timeframeWeights: Record<string, number> = {
    '15m': 0.10,
    '1h': 0.15,
    '4h': 0.25,
    '1d': 0.30,
    '1w': 0.20
  }
): TimeframeAgreementResult
{
  const alignedTimeframes: string[] = [];
  const conflictingTimeframes: string[] = [];

  // Count directions with weights
  let bullishWeight = 0;
  let bearishWeight = 0;
  let neutralWeight = 0;
  let totalWeight = 0;

  results.forEach( ( result, tf ) =>
  {
    const weight = timeframeWeights[ tf ] || 0.1;
    totalWeight += weight;

    if ( result.direction === 'bullish' )
    {
      bullishWeight += weight;
    } else if ( result.direction === 'bearish' )
    {
      bearishWeight += weight;
    } else
    {
      neutralWeight += weight;
    }
  } );

  // Determine dominant direction
  let dominantDirection: TrendDirection = 'neutral';
  let dominantWeight = neutralWeight;

  if ( bullishWeight > bearishWeight && bullishWeight > neutralWeight )
  {
    dominantDirection = 'bullish';
    dominantWeight = bullishWeight;
  } else if ( bearishWeight > bullishWeight && bearishWeight > neutralWeight )
  {
    dominantDirection = 'bearish';
    dominantWeight = bearishWeight;
  }

  // Categorize timeframes
  results.forEach( ( result, tf ) =>
  {
    if ( result.direction === dominantDirection )
    {
      alignedTimeframes.push( tf );
    } else if ( result.direction !== 'neutral' && dominantDirection !== 'neutral' )
    {
      conflictingTimeframes.push( tf );
    }
  } );

  // Calculate agreement percentage
  const agreementPercent = totalWeight > 0
    ? Math.round( ( dominantWeight / totalWeight ) * 100 )
    : 0;

  // Strength score (penalize conflicts)
  const conflictPenalty = conflictingTimeframes.length * 10;
  const strengthScore = Math.max( 0, agreementPercent - conflictPenalty );

  return {
    agreementPercent,
    dominantDirection,
    alignedTimeframes,
    conflictingTimeframes,
    strengthScore
  };
}

// ==========================================================
// MAIN CONFIDENCE CALCULATION
// ==========================================================

/**
 * Calculate comprehensive signal confidence
 */
export function calculateSignalConfidence (
  candles: OHLCV[],
  eliteResult: EliteTrendResult,
  multiTFResults?: Map<string, EliteTrendResult>
): ConfidenceBreakdown
{
  const qualityFactors: string[] = [];
  const riskFactors: string[] = [];

  // 1. Indicator Agreement (from elite result)
  const indicatorAgreement = eliteResult.confidence;
  if ( indicatorAgreement >= 70 )
  {
    qualityFactors.push( 'Strong indicator agreement' );
  } else if ( indicatorAgreement < 50 )
  {
    riskFactors.push( 'Weak indicator agreement' );
  }

  // 2. Volume Confirmation
  const volumeConfirmation = calculateVolumeConfirmation(
    candles,
    eliteResult.direction
  );
  if ( volumeConfirmation >= 70 )
  {
    qualityFactors.push( 'Volume confirms signal' );
  } else if ( volumeConfirmation < 40 )
  {
    riskFactors.push( 'Volume does not confirm' );
  }

  // 3. SMC Alignment
  const smcAlignment = calculateSMCAlignment( candles, eliteResult.direction );
  if ( smcAlignment >= 70 )
  {
    qualityFactors.push( 'Structure supports signal' );
  } else if ( smcAlignment < 40 )
  {
    riskFactors.push( 'Structure conflicts with signal' );
  }

  // 4. Timeframe Alignment
  let timeframeAlignment = 50;
  if ( multiTFResults && multiTFResults.size > 1 )
  {
    const tfAgreement = getMultiTimeframeAgreement( multiTFResults );
    timeframeAlignment = tfAgreement.strengthScore;

    if ( tfAgreement.agreementPercent >= 70 )
    {
      qualityFactors.push( `${ tfAgreement.alignedTimeframes.length } timeframes aligned` );
    } else if ( tfAgreement.conflictingTimeframes.length > 1 )
    {
      riskFactors.push( `Conflicting timeframes: ${ tfAgreement.conflictingTimeframes.join( ', ' ) }` );
    }
  }

  // 5. Regime Alignment
  const regimeAlignment = calculateRegimeAlignment(
    eliteResult.direction,
    eliteResult.regime,
    eliteResult.score
  );
  if ( regimeAlignment >= 70 )
  {
    qualityFactors.push( `Signal fits ${ eliteResult.regime } market` );
  } else if ( regimeAlignment < 40 )
  {
    riskFactors.push( `Signal may not work in ${ eliteResult.regime } market` );
  }

  // Calculate Total Confidence
  const totalConfidence = Math.round(
    indicatorAgreement * CONFIDENCE_WEIGHTS.indicatorAgreement +
    volumeConfirmation * CONFIDENCE_WEIGHTS.volumeConfirmation +
    smcAlignment * CONFIDENCE_WEIGHTS.smcAlignment +
    timeframeAlignment * CONFIDENCE_WEIGHTS.timeframeAlignment +
    regimeAlignment * CONFIDENCE_WEIGHTS.regimeAlignment
  );

  // Determine Confidence Level
  let confidenceLevel: 'high' | 'medium' | 'low' | 'very-low';
  if ( totalConfidence >= 80 ) confidenceLevel = 'high';
  else if ( totalConfidence >= 60 ) confidenceLevel = 'medium';
  else if ( totalConfidence >= 40 ) confidenceLevel = 'low';
  else confidenceLevel = 'very-low';

  // Confirmation count
  const confirmationCount = eliteResult.confirmations;
  const maxPossibleConfirmations = 4; // 4 categories

  return {
    indicatorAgreement,
    volumeConfirmation,
    smcAlignment,
    timeframeAlignment,
    regimeAlignment,
    totalConfidence,
    confidenceLevel,
    confirmationCount,
    maxPossibleConfirmations,
    qualityFactors,
    riskFactors
  };
}

// ==========================================================
// HIGH CONFIDENCE CHECK
// ==========================================================

/**
 * Check if signal is high confidence (≥80%)
 */
export function isHighConfidence ( confidence: ConfidenceBreakdown ): boolean
{
  return confidence.totalConfidence >= 80;
}

/**
 * Get prediction quality assessment
 */
export function getPredictionQuality (
  eliteResult: EliteTrendResult,
  confidence: ConfidenceBreakdown
): PredictionQuality
{
  const reasons: string[] = [];
  const reasonsAr: string[] = [];

  const isHighConf = isHighConfidence( confidence );
  const hasConfirmations = eliteResult.confirmations >= 3;
  const isStrongSignal = Math.abs( eliteResult.score ) >= 40;

  // High Confidence
  if ( isHighConf )
  {
    reasons.push( 'High confidence signal (≥80%)' );
    reasonsAr.push( 'إشارة عالية الثقة (≥80%)' );
  } else
  {
    reasons.push( `Moderate confidence (${ confidence.totalConfidence }%)` );
    reasonsAr.push( `ثقة متوسطة (${ confidence.totalConfidence }%)` );
  }

  // Confirmations
  if ( hasConfirmations )
  {
    reasons.push( `${ eliteResult.confirmations }/4 categories confirm` );
    reasonsAr.push( `${ eliteResult.confirmations }/4 فئات تؤكد الإشارة` );
  } else
  {
    reasons.push( `Only ${ eliteResult.confirmations }/4 confirmations` );
    reasonsAr.push( `${ eliteResult.confirmations }/4 تأكيدات فقط` );
  }

  // Signal Strength
  if ( isStrongSignal )
  {
    reasons.push( 'Strong directional signal' );
    reasonsAr.push( 'إشارة اتجاهية قوية' );
  }

  // Quality Factors
  confidence.qualityFactors.forEach( f =>
  {
    reasons.push( `✓ ${ f }` );
  } );

  // Risk Factors
  confidence.riskFactors.forEach( f =>
  {
    reasons.push( `⚠ ${ f }` );
  } );

  // Premium Signal: High confidence + strong signal + good confirmations
  const isPremiumSignal = isHighConf && isStrongSignal && hasConfirmations;

  // Should Trade: All criteria met
  const shouldTrade = isPremiumSignal && confidence.riskFactors.length <= 1;

  return {
    isHighConfidence: isHighConf,
    isPremiumSignal,
    shouldTrade,
    reasons,
    reasonsAr
  };
}

// ==========================================================
// CONFIDENCE DISPLAY HELPERS
// ==========================================================

/**
 * Get confidence level display info
 */
export function getConfidenceLevelDisplay ( level: 'high' | 'medium' | 'low' | 'very-low' ):
  {
    label: string;
    labelAr: string;
    color: string;
    bgColor: string;
    emoji: string;
  }
{
  switch ( level )
  {
    case 'high':
      return {
        label: 'High Confidence',
        labelAr: 'ثقة عالية',
        color: '#FFD700',
        bgColor: 'rgba(255, 215, 0, 0.2)',
        emoji: '⭐'
      };
    case 'medium':
      return {
        label: 'Medium Confidence',
        labelAr: 'ثقة متوسطة',
        color: '#4CAF50',
        bgColor: 'rgba(76, 175, 80, 0.2)',
        emoji: '✓'
      };
    case 'low':
      return {
        label: 'Low Confidence',
        labelAr: 'ثقة منخفضة',
        color: '#FFA500',
        bgColor: 'rgba(255, 165, 0, 0.2)',
        emoji: '⚠'
      };
    case 'very-low':
      return {
        label: 'Very Low Confidence',
        labelAr: 'ثقة ضعيفة جداً',
        color: '#FF6B6B',
        bgColor: 'rgba(255, 107, 107, 0.2)',
        emoji: '❌'
      };
  }
}

/**
 * Get confidence bar segments for UI
 */
export function getConfidenceBarSegments ( confidence: ConfidenceBreakdown ):
  {
    segment: string;
    value: number;
    color: string;
  }[]
{
  return [
    {
      segment: 'Indicators',
      value: confidence.indicatorAgreement,
      color: '#6366F1'
    },
    {
      segment: 'Volume',
      value: confidence.volumeConfirmation,
      color: '#10B981'
    },
    {
      segment: 'Structure',
      value: confidence.smcAlignment,
      color: '#F59E0B'
    },
    {
      segment: 'Timeframes',
      value: confidence.timeframeAlignment,
      color: '#8B5CF6'
    },
    {
      segment: 'Regime',
      value: confidence.regimeAlignment,
      color: '#EC4899'
    }
  ];
}
