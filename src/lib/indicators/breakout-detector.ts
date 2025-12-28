/**
 * Breakout Detector - كاشف الاختراقات
 * 
 * Real-time breakout detection with:
 * - Volume surge confirmation
 * - Candlestick pattern confirmation
 * - Fakeout warning system
 * - Multi-timeframe validation
 * 
 * @author CCCWAYS Elite Trading System
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// INTERFACES
// ==========================================================

export type BreakoutType = 
  | 'resistance_breakout'
  | 'support_breakdown'
  | 'channel_breakout_up'
  | 'channel_breakout_down'
  | 'range_breakout_up'
  | 'range_breakout_down'
  | 'trendline_breakout'
  | 'pattern_breakout';

export type BreakoutStrength = 'strong' | 'moderate' | 'weak';
export type BreakoutStatus = 'confirmed' | 'pending' | 'fakeout' | 'failed';

export interface BreakoutSignal {
  type: BreakoutType;
  status: BreakoutStatus;
  strength: BreakoutStrength;
  index: number;
  timestamp: number;
  breakoutPrice: number;
  levelPrice: number;
  currentPrice: number;
  volumeSurge: number;
  confirmationBars: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
  lastTouchIndex: number;
  isActive: boolean;
}

export interface BreakoutAnalysis {
  currentBreakouts: BreakoutSignal[];
  pendingBreakouts: BreakoutSignal[];
  recentFakeouts: BreakoutSignal[];
  keyLevels: SupportResistanceLevel[];
  overallBias: 'bullish' | 'bearish' | 'neutral';
}

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

function calculateAverageVolume(candles: OHLCV[], period: number = 20): number {
  if (candles.length < period) return 0;
  
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += candles[i].volume;
  }
  
  return sum / period;
}

function isBullishCandle(candle: OHLCV): boolean {
  return candle.close > candle.open;
}

function isBearishCandle(candle: OHLCV): boolean {
  return candle.close < candle.open;
}

function getCandleBody(candle: OHLCV): number {
  return Math.abs(candle.close - candle.open);
}

function getCandleRange(candle: OHLCV): number {
  return candle.high - candle.low;
}

function isStrongBullishCandle(candle: OHLCV, avgBody: number): boolean {
  return isBullishCandle(candle) && getCandleBody(candle) > avgBody * 1.5;
}

function isStrongBearishCandle(candle: OHLCV, avgBody: number): boolean {
  return isBearishCandle(candle) && getCandleBody(candle) > avgBody * 1.5;
}

// ==========================================================
// SUPPORT/RESISTANCE DETECTION
// ==========================================================

export function detectSupportResistanceLevels(
  candles: OHLCV[],
  options: {
    lookback?: number;
    minTouches?: number;
    tolerance?: number;
  } = {}
): SupportResistanceLevel[] {
  const {
    lookback = 100,
    minTouches = 2,
    tolerance = 0.005, // 0.5% tolerance
  } = options;
  
  if (candles.length < 20) return [];
  
  const relevantCandles = candles.slice(-lookback);
  const levels: SupportResistanceLevel[] = [];
  const atr = calculateATR(candles);
  
  // Find swing points
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];
  
  for (let i = 2; i < relevantCandles.length - 2; i++) {
    const c = relevantCandles[i];
    const isSwingHigh = c.high > relevantCandles[i-1].high && 
                        c.high > relevantCandles[i-2].high &&
                        c.high > relevantCandles[i+1].high && 
                        c.high > relevantCandles[i+2].high;
    const isSwingLow = c.low < relevantCandles[i-1].low && 
                       c.low < relevantCandles[i-2].low &&
                       c.low < relevantCandles[i+1].low && 
                       c.low < relevantCandles[i+2].low;
    
    if (isSwingHigh) swingHighs.push({ index: candles.length - lookback + i, price: c.high });
    if (isSwingLow) swingLows.push({ index: candles.length - lookback + i, price: c.low });
  }
  
  // Cluster swing points into levels
  const allSwings = [
    ...swingHighs.map(s => ({ ...s, type: 'resistance' as const })),
    ...swingLows.map(s => ({ ...s, type: 'support' as const })),
  ].sort((a, b) => a.price - b.price);
  
  const clusteredLevels: { price: number; type: 'support' | 'resistance'; touches: number; lastIndex: number }[] = [];
  
  for (const swing of allSwings) {
    const existingLevel = clusteredLevels.find(l => 
      Math.abs(l.price - swing.price) / swing.price < tolerance
    );
    
    if (existingLevel) {
      existingLevel.price = (existingLevel.price * existingLevel.touches + swing.price) / (existingLevel.touches + 1);
      existingLevel.touches++;
      existingLevel.lastIndex = Math.max(existingLevel.lastIndex, swing.index);
      if (swing.type === 'resistance') existingLevel.type = 'resistance';
    } else {
      clusteredLevels.push({
        price: swing.price,
        type: swing.type,
        touches: 1,
        lastIndex: swing.index,
      });
    }
  }
  
  // Filter and score levels
  const currentPrice = candles[candles.length - 1].close;
  
  for (const level of clusteredLevels) {
    if (level.touches < minTouches) continue;
    
    const isActive = level.lastIndex > candles.length - 30;
    const strength = Math.min(100, level.touches * 20 + (isActive ? 20 : 0));
    
    // Determine if it's support or resistance relative to current price
    const type: 'support' | 'resistance' = level.price < currentPrice ? 'support' : 'resistance';
    
    levels.push({
      price: level.price,
      type,
      strength,
      touches: level.touches,
      lastTouchIndex: level.lastIndex,
      isActive,
    });
  }
  
  return levels.sort((a, b) => b.strength - a.strength);
}

// ==========================================================
// VOLUME SURGE DETECTION
// ==========================================================

export function detectVolumeSurge(
  candles: OHLCV[],
  index: number,
  period: number = 20
): { surge: number; isSignificant: boolean } {
  if (index < period) return { surge: 1, isSignificant: false };
  
  const avgVolume = calculateAverageVolume(candles.slice(0, index), period);
  const currentVolume = candles[index].volume;
  
  const surge = avgVolume > 0 ? currentVolume / avgVolume : 1;
  const isSignificant = surge > 1.5;
  
  return { surge, isSignificant };
}

// ==========================================================
// BREAKOUT DETECTION
// ==========================================================

export function detectBreakouts(
  candles: OHLCV[],
  options: {
    levels?: SupportResistanceLevel[];
    minConfirmationBars?: number;
    volumeMultiplier?: number;
  } = {}
): BreakoutSignal[] {
  if (candles.length < 30) return [];
  
  const {
    levels = detectSupportResistanceLevels(candles),
    minConfirmationBars = 2,
    volumeMultiplier = 1.3,
  } = options;
  
  const signals: BreakoutSignal[] = [];
  const atr = calculateATR(candles);
  const avgVolume = calculateAverageVolume(candles);
  
  // Calculate average candle body for comparison
  let avgBody = 0;
  for (let i = candles.length - 20; i < candles.length; i++) {
    avgBody += getCandleBody(candles[i]);
  }
  avgBody /= 20;
  
  // Check each level for breakouts
  for (const level of levels) {
    // Only check recent candles
    for (let i = candles.length - 10; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      
      if (!prevCandle) continue;
      
      // Resistance breakout
      if (level.type === 'resistance' && prevCandle.close <= level.price && candle.close > level.price) {
        const { surge } = detectVolumeSurge(candles, i);
        const isVolumeConfirmed = surge >= volumeMultiplier;
        const isCandleStrong = isStrongBullishCandle(candle, avgBody);
        
        // Count confirmation bars
        let confirmationBars = 0;
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].close > level.price) confirmationBars++;
          else break;
        }
        
        // Check for fakeout
        const isFakeout = candles.length - 1 > i && candles[candles.length - 1].close < level.price;
        
        const reasons: string[] = [];
        const warnings: string[] = [];
        
        if (isVolumeConfirmed) reasons.push(`Volume surge ${surge.toFixed(1)}x`);
        if (isCandleStrong) reasons.push('Strong bullish candle');
        if (confirmationBars >= minConfirmationBars) reasons.push(`${confirmationBars} confirmation bars`);
        if (level.touches >= 3) reasons.push(`Level tested ${level.touches} times`);
        
        if (!isVolumeConfirmed) warnings.push('Low volume breakout');
        if (isFakeout) warnings.push('Potential fakeout detected');
        if (confirmationBars < minConfirmationBars) warnings.push('Awaiting confirmation');
        
        const confidence = calculateBreakoutConfidence(
          isVolumeConfirmed,
          isCandleStrong,
          confirmationBars,
          level.strength,
          isFakeout
        );
        
        const targetPrice = level.price + (level.price - (level.price - atr * 2));
        const stopLoss = level.price - atr * 0.5;
        const riskReward = (targetPrice - candle.close) / (candle.close - stopLoss);
        
        signals.push({
          type: 'resistance_breakout',
          status: isFakeout ? 'fakeout' : confirmationBars >= minConfirmationBars ? 'confirmed' : 'pending',
          strength: confidence >= 70 ? 'strong' : confidence >= 50 ? 'moderate' : 'weak',
          index: i,
          timestamp: i,
          breakoutPrice: candle.close,
          levelPrice: level.price,
          currentPrice: candles[candles.length - 1].close,
          volumeSurge: surge,
          confirmationBars,
          targetPrice,
          stopLoss,
          riskRewardRatio: riskReward,
          confidence,
          reasons,
          warnings,
        });
      }
      
      // Support breakdown
      if (level.type === 'support' && prevCandle.close >= level.price && candle.close < level.price) {
        const { surge } = detectVolumeSurge(candles, i);
        const isVolumeConfirmed = surge >= volumeMultiplier;
        const isCandleStrong = isStrongBearishCandle(candle, avgBody);
        
        let confirmationBars = 0;
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].close < level.price) confirmationBars++;
          else break;
        }
        
        const isFakeout = candles.length - 1 > i && candles[candles.length - 1].close > level.price;
        
        const reasons: string[] = [];
        const warnings: string[] = [];
        
        if (isVolumeConfirmed) reasons.push(`Volume surge ${surge.toFixed(1)}x`);
        if (isCandleStrong) reasons.push('Strong bearish candle');
        if (confirmationBars >= minConfirmationBars) reasons.push(`${confirmationBars} confirmation bars`);
        if (level.touches >= 3) reasons.push(`Level tested ${level.touches} times`);
        
        if (!isVolumeConfirmed) warnings.push('Low volume breakdown');
        if (isFakeout) warnings.push('Potential fakeout detected');
        if (confirmationBars < minConfirmationBars) warnings.push('Awaiting confirmation');
        
        const confidence = calculateBreakoutConfidence(
          isVolumeConfirmed,
          isCandleStrong,
          confirmationBars,
          level.strength,
          isFakeout
        );
        
        const targetPrice = level.price - atr * 2;
        const stopLoss = level.price + atr * 0.5;
        const riskReward = (candle.close - targetPrice) / (stopLoss - candle.close);
        
        signals.push({
          type: 'support_breakdown',
          status: isFakeout ? 'fakeout' : confirmationBars >= minConfirmationBars ? 'confirmed' : 'pending',
          strength: confidence >= 70 ? 'strong' : confidence >= 50 ? 'moderate' : 'weak',
          index: i,
          timestamp: i,
          breakoutPrice: candle.close,
          levelPrice: level.price,
          currentPrice: candles[candles.length - 1].close,
          volumeSurge: surge,
          confirmationBars,
          targetPrice,
          stopLoss,
          riskRewardRatio: riskReward,
          confidence,
          reasons,
          warnings,
        });
      }
    }
  }
  
  return signals;
}

// ==========================================================
// RANGE BREAKOUT DETECTION
// ==========================================================

export function detectRangeBreakout(
  candles: OHLCV[],
  options: {
    rangePeriod?: number;
    minRangeBars?: number;
  } = {}
): BreakoutSignal[] {
  const {
    rangePeriod = 20,
    minRangeBars = 10,
  } = options;
  
  if (candles.length < rangePeriod + 5) return [];
  
  const signals: BreakoutSignal[] = [];
  const atr = calculateATR(candles);
  
  // Find consolidation range
  const rangeCandles = candles.slice(-rangePeriod - 5, -1);
  const rangeHighs = rangeCandles.map(c => c.high);
  const rangeLows = rangeCandles.map(c => c.low);
  
  const rangeHigh = Math.max(...rangeHighs.slice(0, -3));
  const rangeLow = Math.min(...rangeLows.slice(0, -3));
  const rangeSize = rangeHigh - rangeLow;
  
  // Check if it's a valid consolidation (range should be less than 2x ATR)
  if (rangeSize > atr * 3) return [];
  
  const currentCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  
  // Breakout up
  if (prevCandle.close <= rangeHigh && currentCandle.close > rangeHigh) {
    const { surge } = detectVolumeSurge(candles, candles.length - 1);
    const targetPrice = rangeHigh + rangeSize;
    const stopLoss = rangeLow;
    const riskReward = (targetPrice - currentCandle.close) / (currentCandle.close - stopLoss);
    
    signals.push({
      type: 'range_breakout_up',
      status: 'pending',
      strength: surge > 1.5 ? 'strong' : 'moderate',
      index: candles.length - 1,
      timestamp: candles.length - 1,
      breakoutPrice: currentCandle.close,
      levelPrice: rangeHigh,
      currentPrice: currentCandle.close,
      volumeSurge: surge,
      confirmationBars: 0,
      targetPrice,
      stopLoss,
      riskRewardRatio: riskReward,
      confidence: surge > 1.5 ? 75 : 60,
      reasons: [`Range breakout after ${rangePeriod} bar consolidation`],
      warnings: surge < 1.3 ? ['Low volume breakout'] : [],
    });
  }
  
  // Breakdown
  if (prevCandle.close >= rangeLow && currentCandle.close < rangeLow) {
    const { surge } = detectVolumeSurge(candles, candles.length - 1);
    const targetPrice = rangeLow - rangeSize;
    const stopLoss = rangeHigh;
    const riskReward = (currentCandle.close - targetPrice) / (stopLoss - currentCandle.close);
    
    signals.push({
      type: 'range_breakout_down',
      status: 'pending',
      strength: surge > 1.5 ? 'strong' : 'moderate',
      index: candles.length - 1,
      timestamp: candles.length - 1,
      breakoutPrice: currentCandle.close,
      levelPrice: rangeLow,
      currentPrice: currentCandle.close,
      volumeSurge: surge,
      confirmationBars: 0,
      targetPrice,
      stopLoss,
      riskRewardRatio: riskReward,
      confidence: surge > 1.5 ? 75 : 60,
      reasons: [`Range breakdown after ${rangePeriod} bar consolidation`],
      warnings: surge < 1.3 ? ['Low volume breakdown'] : [],
    });
  }
  
  return signals;
}

// ==========================================================
// FAKEOUT DETECTION
// ==========================================================

export function detectFakeout(
  candles: OHLCV[],
  breakoutSignal: BreakoutSignal,
  options: {
    maxBarsAfterBreakout?: number;
    retraceThreshold?: number;
  } = {}
): { isFakeout: boolean; confidence: number; reason: string } {
  const {
    maxBarsAfterBreakout = 5,
    retraceThreshold = 0.5,
  } = options;
  
  const currentIndex = candles.length - 1;
  const barsSinceBreakout = currentIndex - breakoutSignal.index;
  
  if (barsSinceBreakout > maxBarsAfterBreakout || barsSinceBreakout < 1) {
    return { isFakeout: false, confidence: 0, reason: '' };
  }
  
  const currentPrice = candles[currentIndex].close;
  const breakoutPrice = breakoutSignal.breakoutPrice;
  const levelPrice = breakoutSignal.levelPrice;
  
  // Check if price has returned through the level
  if (breakoutSignal.type.includes('up') || breakoutSignal.type.includes('resistance')) {
    if (currentPrice < levelPrice) {
      const retraceAmount = (breakoutPrice - currentPrice) / (breakoutPrice - levelPrice);
      const confidence = Math.min(95, 50 + retraceAmount * 45);
      return {
        isFakeout: true,
        confidence,
        reason: `Price returned below breakout level (${retraceAmount.toFixed(1)}x retracement)`,
      };
    }
  } else {
    if (currentPrice > levelPrice) {
      const retraceAmount = (currentPrice - breakoutPrice) / (levelPrice - breakoutPrice);
      const confidence = Math.min(95, 50 + retraceAmount * 45);
      return {
        isFakeout: true,
        confidence,
        reason: `Price returned above breakdown level (${retraceAmount.toFixed(1)}x retracement)`,
      };
    }
  }
  
  // Check for weak follow-through
  let weakFollowThrough = 0;
  for (let i = breakoutSignal.index + 1; i <= currentIndex; i++) {
    const c = candles[i];
    if (breakoutSignal.type.includes('up') && c.close < c.open) weakFollowThrough++;
    if (breakoutSignal.type.includes('down') && c.close > c.open) weakFollowThrough++;
  }
  
  if (weakFollowThrough >= barsSinceBreakout * 0.6) {
    return {
      isFakeout: false,
      confidence: 40,
      reason: 'Weak follow-through - potential fakeout developing',
    };
  }
  
  return { isFakeout: false, confidence: 0, reason: '' };
}

// ==========================================================
// CONFIDENCE CALCULATION
// ==========================================================

function calculateBreakoutConfidence(
  volumeConfirmed: boolean,
  strongCandle: boolean,
  confirmationBars: number,
  levelStrength: number,
  isFakeout: boolean
): number {
  if (isFakeout) return 20;
  
  let confidence = 30;
  
  if (volumeConfirmed) confidence += 25;
  if (strongCandle) confidence += 15;
  confidence += Math.min(20, confirmationBars * 5);
  confidence += Math.min(10, levelStrength / 10);
  
  return Math.min(95, confidence);
}

// ==========================================================
// COMPLETE BREAKOUT ANALYSIS
// ==========================================================

export function analyzeBreakouts(candles: OHLCV[]): BreakoutAnalysis {
  if (candles.length < 30) {
    return {
      currentBreakouts: [],
      pendingBreakouts: [],
      recentFakeouts: [],
      keyLevels: [],
      overallBias: 'neutral',
    };
  }
  
  const keyLevels = detectSupportResistanceLevels(candles);
  const allBreakouts = [
    ...detectBreakouts(candles, { levels: keyLevels }),
    ...detectRangeBreakout(candles),
  ];
  
  const currentBreakouts = allBreakouts.filter(b => b.status === 'confirmed');
  const pendingBreakouts = allBreakouts.filter(b => b.status === 'pending');
  const recentFakeouts = allBreakouts.filter(b => b.status === 'fakeout');
  
  // Determine overall bias
  let bullishCount = 0;
  let bearishCount = 0;
  
  for (const b of currentBreakouts) {
    if (b.type.includes('up') || b.type.includes('resistance')) bullishCount++;
    else bearishCount++;
  }
  
  const overallBias: 'bullish' | 'bearish' | 'neutral' = 
    bullishCount > bearishCount ? 'bullish' : 
    bearishCount > bullishCount ? 'bearish' : 'neutral';
  
  return {
    currentBreakouts,
    pendingBreakouts,
    recentFakeouts,
    keyLevels,
    overallBias,
  };
}

export default {
  detectSupportResistanceLevels,
  detectVolumeSurge,
  detectBreakouts,
  detectRangeBreakout,
  detectFakeout,
  analyzeBreakouts,
};
