/**
 * Advanced Pattern Scoring System - نظام تقييم الأنماط المتقدم
 * 
 * World-class pattern quality assessment using 15+ criteria
 * خوارزميات عبقرية لتقييم جودة الأنماط بدقة لا مثيل لها
 * 
 * @author CCWAYS Elite Trading System
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// INTERFACES - الواجهات
// ==========================================================

export interface PatternQualityScore {
  overall: number;
  grade: 'ELITE' | 'STRONG' | 'VALID' | 'WEAK' | 'INVALID';
  gradeAr: string;
  gradeColor: string;
  
  geometric: number;
  volume: number;
  fibonacci: number;
  timing: number;
  priceAction: number;
  maturity: number;
  context: number;
  volatility: number;
  divergence: number;
  institutional: number;
  historical: number;
  mtfConfluence: number;
  breakoutProb: number;
  riskReward: number;
  freshness: number;
  
  details: PatternScoreDetails;
}

export interface PatternScoreDetails {
  touchCount: number;
  r2Score: number;
  volumeDecline: boolean;
  volumeDeclinePercent: number;
  fibonacciLevel: number | null;
  fibonacciDistance: number;
  timeSymmetry: number;
  completionPercent: number;
  trendAlignment: 'aligned' | 'counter' | 'neutral';
  bbSqueeze: boolean;
  bbSqueezePercent: number;
  rsiDivergence: 'bullish' | 'bearish' | 'none';
  nearbyOrderBlocks: number;
  nearbyFVGs: number;
  historicalWinRate: number;
  mtfPatterns: number;
  estimatedBreakoutProb: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  patternAge: number;
  barsToBreakout: number;
}

export interface PatternInfo {
  type: string;
  startIndex: number;
  endIndex: number;
  peakIndex?: number;
  upperLineR2: number;
  lowerLineR2: number;
  touchCount: number;
  breakoutDirection: 'up' | 'down' | 'neutral';
  targetPrice?: number;
  patternHigh: number;
  patternLow: number;
}

export interface ScoringConfig {
  weights: Record<string, number>;
  thresholds: {
    elite: number;
    strong: number;
    valid: number;
    weak: number;
  };
}

// ==========================================================
// DEFAULT CONFIGURATION
// ==========================================================

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    geometric: 0.15,
    volume: 0.12,
    fibonacci: 0.08,
    timing: 0.05,
    priceAction: 0.08,
    maturity: 0.06,
    context: 0.10,
    volatility: 0.06,
    divergence: 0.05,
    institutional: 0.08,
    historical: 0.05,
    mtfConfluence: 0.04,
    breakoutProb: 0.04,
    riskReward: 0.03,
    freshness: 0.01,
  },
  thresholds: {
    elite: 85,
    strong: 70,
    valid: 55,
    weak: 40,
  },
};

const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function calculateATR(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || candles[i].open;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    atrSum += tr;
  }
  
  return atrSum / period;
}

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateBBWidth(closes: number[], period: number = 20): number[] {
  const widths: number[] = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    const width = (4 * std) / sma * 100;
    widths.push(width);
  }
  
  return widths;
}

function detectRSIDivergence(
  closes: number[],
  patternStart: number,
  patternEnd: number
): 'bullish' | 'bearish' | 'none' {
  if (patternEnd - patternStart < 10) return 'none';
  
  const rsi = calculateRSI(closes);
  if (rsi.length < patternEnd - 13) return 'none';
  
  const startIdx = Math.max(0, patternStart - 14);
  const endIdx = Math.min(rsi.length - 1, patternEnd - 14);
  
  if (startIdx >= endIdx) return 'none';
  
  const priceStart = closes[patternStart];
  const priceEnd = closes[patternEnd];
  const rsiStart = rsi[startIdx];
  const rsiEnd = rsi[endIdx];
  
  if (priceEnd < priceStart && rsiEnd > rsiStart) return 'bullish';
  if (priceEnd > priceStart && rsiEnd < rsiStart) return 'bearish';
  
  return 'none';
}

function calculateVolumeDecline(volumes: number[], startIdx: number, endIdx: number): number {
  if (endIdx - startIdx < 5) return 0;
  
  const firstHalf = volumes.slice(startIdx, startIdx + Math.floor((endIdx - startIdx) / 2));
  const secondHalf = volumes.slice(startIdx + Math.floor((endIdx - startIdx) / 2), endIdx);
  
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  if (avgFirst === 0) return 0;
  return ((avgFirst - avgSecond) / avgFirst) * 100;
}

function findNearestFibLevel(
  price: number,
  high: number,
  low: number
): { level: number; distance: number } {
  const range = high - low;
  if (range === 0) return { level: 0.5, distance: 100 };
  
  const retracement = (high - price) / range;
  
  let nearestLevel = FIBONACCI_LEVELS[0];
  let minDistance = Math.abs(retracement - nearestLevel);
  
  for (const level of FIBONACCI_LEVELS) {
    const distance = Math.abs(retracement - level);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLevel = level;
    }
  }
  
  return { level: nearestLevel, distance: minDistance * 100 };
}

function calculateTimeSymmetry(
  patternStart: number,
  patternPeak: number,
  patternEnd: number
): number {
  const totalBars = patternEnd - patternStart;
  if (totalBars === 0) return 0;
  
  const firstLeg = patternPeak - patternStart;
  const secondLeg = patternEnd - patternPeak;
  
  if (secondLeg === 0) return 50;
  
  const ratio = firstLeg / secondLeg;
  const goldenRatio = 1.618;
  
  const distanceFromGolden = Math.min(
    Math.abs(ratio - goldenRatio),
    Math.abs(ratio - (1 / goldenRatio)),
    Math.abs(ratio - 1)
  );
  
  return Math.max(0, 100 - distanceFromGolden * 50);
}

function calculateBBSqueezeScore(
  closes: number[],
  patternStart: number,
  patternEnd: number
): { score: number; isSqueeze: boolean; squeezePercent: number } {
  const bbWidths = calculateBBWidth(closes);
  if (bbWidths.length < patternEnd - 19) {
    return { score: 50, isSqueeze: false, squeezePercent: 0 };
  }
  
  const startIdx = Math.max(0, patternStart - 19);
  const endIdx = Math.min(bbWidths.length - 1, patternEnd - 19);
  
  if (startIdx >= endIdx) {
    return { score: 50, isSqueeze: false, squeezePercent: 0 };
  }
  
  const patternWidths = bbWidths.slice(startIdx, endIdx + 1);
  const avgWidth = patternWidths.reduce((a, b) => a + b, 0) / patternWidths.length;
  const historicalAvg = bbWidths.reduce((a, b) => a + b, 0) / bbWidths.length;
  
  const squeezePercent = ((historicalAvg - avgWidth) / historicalAvg) * 100;
  const isSqueeze = squeezePercent > 20;
  const score = Math.min(100, 50 + squeezePercent);
  
  return { score, isSqueeze, squeezePercent };
}

function estimateBreakoutProbability(
  volumeScore: number,
  squeezScore: number,
  maturity: number,
  trendAlignment: boolean
): number {
  const baseProb = 0.5;
  
  const volumeFactor = (volumeScore - 50) / 100 * 0.2;
  const squeezeFactor = (squeezScore - 50) / 100 * 0.15;
  const maturityFactor = (maturity - 50) / 100 * 0.1;
  const trendFactor = trendAlignment ? 0.1 : -0.05;
  
  const probability = baseProb + volumeFactor + squeezeFactor + maturityFactor + trendFactor;
  
  return Math.max(0.1, Math.min(0.95, probability));
}

// ==========================================================
// MAIN SCORING FUNCTION
// ==========================================================

export function calculatePatternQualityScore(
  candles: OHLCV[],
  pattern: PatternInfo,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): PatternQualityScore {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  const currentPrice = closes[closes.length - 1];
  
  // 1. Geometric Score
  const avgR2 = (pattern.upperLineR2 + pattern.lowerLineR2) / 2;
  const touchScore = Math.min(100, pattern.touchCount * 15);
  const geometricScore = avgR2 * 70 + touchScore * 0.3;
  
  // 2. Volume Score
  const volumeDeclinePercent = calculateVolumeDecline(volumes, pattern.startIndex, pattern.endIndex);
  const isVolumeDecline = volumeDeclinePercent > 15;
  const volumeScore = isVolumeDecline ? 70 + volumeDeclinePercent * 0.5 : 40;
  
  // 3. Fibonacci Score
  const swingHigh = Math.max(...highs.slice(Math.max(0, pattern.startIndex - 50), pattern.startIndex));
  const swingLow = Math.min(...lows.slice(Math.max(0, pattern.startIndex - 50), pattern.startIndex));
  const fibResult = findNearestFibLevel(pattern.patternLow, swingHigh, swingLow);
  const fibonacciScore = Math.max(0, 100 - fibResult.distance * 2);
  
  // 4. Timing Score
  const peakIndex = pattern.peakIndex || Math.floor((pattern.startIndex + pattern.endIndex) / 2);
  const timingScore = calculateTimeSymmetry(pattern.startIndex, peakIndex, pattern.endIndex);
  
  // 5. Price Action Score
  const patternCandles = candles.slice(pattern.startIndex, pattern.endIndex + 1);
  let wickRatioSum = 0;
  for (const c of patternCandles) {
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    wickRatioSum += range > 0 ? body / range : 0.5;
  }
  const avgWickRatio = wickRatioSum / patternCandles.length;
  const priceActionScore = avgWickRatio * 100;
  
  // 6. Maturity Score
  const patternBars = pattern.endIndex - pattern.startIndex;
  const expectedBars = 25;
  const maturityScore = Math.min(100, (patternBars / expectedBars) * 100);
  
  // 7. Context Score
  const sma50 = calculateSMA(closes.slice(0, pattern.startIndex), 50);
  const isBullishTrend = currentPrice > sma50;
  const isBullishPattern = pattern.breakoutDirection === 'up';
  const trendAligned = (isBullishTrend && isBullishPattern) || (!isBullishTrend && !isBullishPattern);
  const contextScore = trendAligned ? 85 : pattern.breakoutDirection === 'neutral' ? 60 : 35;
  
  // 8. Volatility Score
  const bbResult = calculateBBSqueezeScore(closes, pattern.startIndex, pattern.endIndex);
  const volatilityScore = bbResult.score;
  
  // 9. Divergence Score
  const divergence = detectRSIDivergence(closes, pattern.startIndex, pattern.endIndex);
  let divergenceScore = 50;
  if (divergence === 'bullish' && pattern.breakoutDirection === 'up') divergenceScore = 90;
  else if (divergence === 'bearish' && pattern.breakoutDirection === 'down') divergenceScore = 90;
  else if (divergence !== 'none') divergenceScore = 30;
  
  // 10. Institutional Score
  const avgVolume = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const maxPatternVolume = Math.max(...volumes.slice(pattern.startIndex, pattern.endIndex + 1));
  const institutionalScore = maxPatternVolume > avgVolume * 2 ? 80 : 50;
  
  // 11-15. Placeholder scores
  const historicalScore = 65;
  const mtfScore = 60;
  const breakoutProb = estimateBreakoutProbability(volumeScore, volatilityScore, maturityScore, trendAligned);
  const breakoutProbScore = breakoutProb * 100;
  
  // Risk/Reward
  const stopLoss = pattern.breakoutDirection === 'up' ? pattern.patternLow : pattern.patternHigh;
  const patternHeight = pattern.patternHigh - pattern.patternLow;
  const takeProfit = pattern.breakoutDirection === 'up' 
    ? pattern.patternHigh + patternHeight 
    : pattern.patternLow - patternHeight;
  const riskRewardRatio = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss);
  const riskRewardScore = Math.min(100, riskRewardRatio * 30);
  
  // Freshness
  const patternAge = candles.length - pattern.endIndex;
  const freshnessScore = Math.max(0, 100 - patternAge * 3);
  
  // Calculate Overall Score
  const overallScore = 
    geometricScore * config.weights.geometric +
    volumeScore * config.weights.volume +
    fibonacciScore * config.weights.fibonacci +
    timingScore * config.weights.timing +
    priceActionScore * config.weights.priceAction +
    maturityScore * config.weights.maturity +
    contextScore * config.weights.context +
    volatilityScore * config.weights.volatility +
    divergenceScore * config.weights.divergence +
    institutionalScore * config.weights.institutional +
    historicalScore * config.weights.historical +
    mtfScore * config.weights.mtfConfluence +
    breakoutProbScore * config.weights.breakoutProb +
    riskRewardScore * config.weights.riskReward +
    freshnessScore * config.weights.freshness;
  
  // Determine Grade
  let grade: 'ELITE' | 'STRONG' | 'VALID' | 'WEAK' | 'INVALID';
  let gradeAr: string;
  let gradeColor: string;
  
  if (overallScore >= config.thresholds.elite) {
    grade = 'ELITE'; gradeAr = '🏆 نخبة'; gradeColor = '#fbbf24';
  } else if (overallScore >= config.thresholds.strong) {
    grade = 'STRONG'; gradeAr = '💪 قوي'; gradeColor = '#22c55e';
  } else if (overallScore >= config.thresholds.valid) {
    grade = 'VALID'; gradeAr = '✅ صالح'; gradeColor = '#3b82f6';
  } else if (overallScore >= config.thresholds.weak) {
    grade = 'WEAK'; gradeAr = '⚠️ ضعيف'; gradeColor = '#f97316';
  } else {
    grade = 'INVALID'; gradeAr = '❌ غير صالح'; gradeColor = '#ef4444';
  }
  
  return {
    overall: Math.round(overallScore * 10) / 10,
    grade,
    gradeAr,
    gradeColor,
    geometric: Math.round(geometricScore),
    volume: Math.round(volumeScore),
    fibonacci: Math.round(fibonacciScore),
    timing: Math.round(timingScore),
    priceAction: Math.round(priceActionScore),
    maturity: Math.round(maturityScore),
    context: Math.round(contextScore),
    volatility: Math.round(volatilityScore),
    divergence: Math.round(divergenceScore),
    institutional: Math.round(institutionalScore),
    historical: Math.round(historicalScore),
    mtfConfluence: Math.round(mtfScore),
    breakoutProb: Math.round(breakoutProbScore),
    riskReward: Math.round(riskRewardScore),
    freshness: Math.round(freshnessScore),
    details: {
      touchCount: pattern.touchCount,
      r2Score: avgR2,
      volumeDecline: isVolumeDecline,
      volumeDeclinePercent,
      fibonacciLevel: fibResult.level,
      fibonacciDistance: fibResult.distance,
      timeSymmetry: timingScore,
      completionPercent: maturityScore,
      trendAlignment: trendAligned ? 'aligned' : pattern.breakoutDirection === 'neutral' ? 'neutral' : 'counter',
      bbSqueeze: bbResult.isSqueeze,
      bbSqueezePercent: bbResult.squeezePercent,
      rsiDivergence: divergence,
      nearbyOrderBlocks: 0,
      nearbyFVGs: 0,
      historicalWinRate: 0.65,
      mtfPatterns: 1,
      estimatedBreakoutProb: breakoutProb,
      stopLoss,
      takeProfit,
      riskRewardRatio,
      patternAge,
      barsToBreakout: Math.max(1, Math.round((100 - maturityScore) / 10)),
    },
  };
}

export function scoreMultiplePatterns(
  candles: OHLCV[],
  patterns: PatternInfo[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): PatternQualityScore[] {
  return patterns.map(pattern => calculatePatternQualityScore(candles, pattern, config));
}

export function filterPatternsByGrade(
  scores: PatternQualityScore[],
  minGrade: 'ELITE' | 'STRONG' | 'VALID' | 'WEAK' = 'VALID'
): PatternQualityScore[] {
  const gradeOrder = ['INVALID', 'WEAK', 'VALID', 'STRONG', 'ELITE'];
  const minIndex = gradeOrder.indexOf(minGrade);
  
  return scores.filter(score => gradeOrder.indexOf(score.grade) >= minIndex);
}

export default {
  calculatePatternQualityScore,
  scoreMultiplePatterns,
  filterPatternsByGrade,
  DEFAULT_SCORING_CONFIG,
};
