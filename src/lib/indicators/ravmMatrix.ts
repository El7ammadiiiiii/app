/**
 * RAVM Matrix - RSI Analytic Volume Matrix
 * Converted from Pine Script v6
 * 
 * Simplified version - Structure only (no reports/dashboard)
 * Detects reversal signals using RSI + Geometric Engine + Volume Analysis
 */

import type { CandleData } from "@/components/charts/types";

// ============ TYPES ============

export interface RAVMSignal {
  bar: number;
  timestamp: number;
  price: number;
  type: 'bullish' | 'bearish';
  source: 'oversold' | 'overbought' | 'geometric_bull' | 'geometric_bear';
  isConfirmed: boolean;
  score: number;
  rsiValue: number;
  zScoreAoT: number;
  volumePower: number;
}

export interface RAVMConfig {
  // RSI Settings
  rsiLength: number;
  rsiOverbought: number;
  rsiOversold: number;
  
  // Geometric Engine
  useGeometric: boolean;
  aotSigma: number;
  confirmationRatio: number;
  normLengthMult: number;
  
  // Volume
  volumeZThreshold: number;
  
  // Colors
  bullishColor: string;
  bearishColor: string;
  warningColor: string;
}

export const defaultRAVMConfig: RAVMConfig = {
  rsiLength: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  
  useGeometric: true,
  aotSigma: 2.5,
  confirmationRatio: 0.6,
  normLengthMult: 2,
  
  volumeZThreshold: 2.0,
  
  bullishColor: '#00E676',
  bearishColor: '#ff0000',
  warningColor: '#888888'
};

// ============ HELPER FUNCTIONS ============

/**
 * Calculate RSI
 */
function calculateRSI(data: CandleData[], length: number): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50);
      continue;
    }
    
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
    
    if (i < length) {
      rsi.push(50);
      continue;
    }
    
    // Calculate average gain and loss
    let avgGain = 0;
    let avgLoss = 0;
    
    if (i === length) {
      // First calculation - simple average
      for (let j = i - length + 1; j <= i; j++) {
        avgGain += gains[j];
        avgLoss += losses[j];
      }
      avgGain /= length;
      avgLoss /= length;
    } else {
      // Smoothed average
      const prevAvgGain = rsi.length > 0 ? gains[i - 1] : 0;
      const prevAvgLoss = rsi.length > 0 ? losses[i - 1] : 0;
      avgGain = (prevAvgGain * (length - 1) + gains[i]) / length;
      avgLoss = (prevAvgLoss * (length - 1) + losses[i]) / length;
    }
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

/**
 * Calculate SMA
 */
function sma(values: number[], period: number, index: number): number {
  if (index < period - 1) return values[index] || 0;
  
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += values[i] || 0;
  }
  return sum / period;
}

/**
 * Calculate Standard Deviation
 */
function stdev(values: number[], period: number, index: number): number {
  if (index < period - 1) return 0;
  
  const avg = sma(values, period, index);
  let sumSq = 0;
  
  for (let i = index - period + 1; i <= index; i++) {
    sumSq += Math.pow((values[i] || 0) - avg, 2);
  }
  
  return Math.sqrt(sumSq / period);
}

/**
 * Normalize Z-Score to 0-1 range
 */
function normalizeZ(zScore: number, cap: number): number {
  return Math.min(Math.abs(zScore), cap) / cap;
}

// ============ VOLUME ANALYSIS ============

interface VolumePack {
  total: number;
  buy: number;
  sell: number;
  delta: number;
}

/**
 * Calculate geometric volume distribution
 */
function getGeometricVolume(candle: CandleData): VolumePack {
  const range = candle.high - candle.low;
  const volume = candle.volume ?? 0;
  let vBuy = 0;
  let vSell = 0;
  
  if (range === 0) {
    vBuy = volume * 0.5;
    vSell = volume * 0.5;
  } else {
    vBuy = volume * ((candle.close - candle.low) / range);
    vSell = volume * ((candle.high - candle.close) / range);
  }
  
  return {
    total: volume,
    buy: vBuy,
    sell: vSell,
    delta: vBuy - vSell
  };
}

// ============ MAIN CALCULATION ============

export interface RAVMResult {
  signals: RAVMSignal[];
  rsiValues: number[];
  zScoreAoT: number[];
  volumePower: number[];
}

/**
 * Calculate RAVM Matrix signals
 */
export function calculateRAVM(
  data: CandleData[],
  config: RAVMConfig = defaultRAVMConfig
): RAVMResult {
  const signals: RAVMSignal[] = [];
  const rsiValues = calculateRSI(data, config.rsiLength);
  const zScoreAoT: number[] = [];
  const volumePower: number[] = [];
  
  const normPeriod = config.rsiLength * config.normLengthMult;
  const confirmationThreshold = config.aotSigma * config.confirmationRatio;
  
  // Calculate RSI velocity and acceleration
  const rsiVelocity: number[] = [];
  const rsiAcceleration: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsiVelocity.push(0);
      rsiAcceleration.push(0);
    } else {
      rsiVelocity.push(rsiValues[i] - rsiValues[i - 1]);
      if (i === 1) {
        rsiAcceleration.push(0);
      } else {
        rsiAcceleration.push(rsiVelocity[i] - rsiVelocity[i - 1]);
      }
    }
  }
  
  // Calculate Z-Score of Angle of Turn
  for (let i = 0; i < data.length; i++) {
    if (i < normPeriod) {
      zScoreAoT.push(0);
      volumePower.push(0);
      continue;
    }
    
    const avgAccel = sma(rsiAcceleration, normPeriod, i);
    const stdAccel = stdev(rsiAcceleration, normPeriod, i);
    
    const zAoT = stdAccel !== 0 ? (rsiAcceleration[i] - avgAccel) / stdAccel : 0;
    zScoreAoT.push(zAoT);
    
    // Volume Z-Score
    const volumes: number[] = [];
    for (let j = 0; j <= i; j++) {
      volumes.push(data[j].volume ?? 0);
    }
    const avgVol = sma(volumes, normPeriod, i);
    const stdVol = stdev(volumes, normPeriod, i);
    const zVol = stdVol !== 0 ? ((data[i].volume ?? 0) - avgVol) / stdVol : 0;
    volumePower.push(normalizeZ(zVol, config.volumeZThreshold));
  }
  
  // Detect signals
  for (let i = normPeriod + 1; i < data.length; i++) {
    const rsi = rsiValues[i];
    const prevRsi = rsiValues[i - 1];
    const zAoT = zScoreAoT[i];
    const prevZAoT = zScoreAoT[i - 1];
    
    const inOBZone = rsi >= config.rsiOverbought;
    const inOSZone = rsi <= config.rsiOversold;
    
    const justEnteredOS = prevRsi > config.rsiOversold && rsi <= config.rsiOversold;
    const justEnteredOB = prevRsi < config.rsiOverbought && rsi >= config.rsiOverbought;
    
    // Contextual triggers (inside 30/70 zones)
    const contextualBullTrigger = prevZAoT <= confirmationThreshold && zAoT > confirmationThreshold;
    const contextualBearTrigger = prevZAoT >= -confirmationThreshold && zAoT < -confirmationThreshold;
    
    // Hidden triggers (outside 30/70 zones)
    const hiddenBullTrigger = config.useGeometric && prevZAoT <= config.aotSigma && zAoT > config.aotSigma;
    const hiddenBearTrigger = config.useGeometric && prevZAoT >= -config.aotSigma && zAoT < -config.aotSigma;
    
    // Calculate score
    const msi = normalizeZ(zAoT, config.aotSigma);
    const volPwr = volumePower[i];
    
    // Bullish scenarios
    if (inOSZone) {
      if (contextualBullTrigger) {
        // Confirmed bullish in oversold
        const score = calculateScore(true, true, msi, volPwr, rsi, config);
        signals.push({
          bar: i,
          timestamp: Number(data[i].time),
          price: data[i].low,
          type: 'bullish',
          source: 'oversold',
          isConfirmed: true,
          score,
          rsiValue: rsi,
          zScoreAoT: zAoT,
          volumePower: volPwr
        });
      } else if (justEnteredOS) {
        // Warning - just entered oversold
        const score = calculateScore(true, false, msi, volPwr, rsi, config);
        signals.push({
          bar: i,
          timestamp: Number(data[i].time),
          price: data[i].low,
          type: 'bullish',
          source: 'oversold',
          isConfirmed: false,
          score,
          rsiValue: rsi,
          zScoreAoT: zAoT,
          volumePower: volPwr
        });
      }
    } else if (hiddenBullTrigger && rsi < config.rsiOverbought - 5) {
      // Hidden geometric bullish
      const score = calculateScore(true, true, msi, volPwr, rsi, config);
      signals.push({
        bar: i,
        timestamp: Number(data[i].time),
        price: data[i].low,
        type: 'bullish',
        source: 'geometric_bull',
        isConfirmed: true,
        score,
        rsiValue: rsi,
        zScoreAoT: zAoT,
        volumePower: volPwr
      });
    }
    
    // Bearish scenarios
    if (inOBZone) {
      if (contextualBearTrigger) {
        // Confirmed bearish in overbought
        const score = calculateScore(false, true, msi, volPwr, rsi, config);
        signals.push({
          bar: i,
          timestamp: Number(data[i].time),
          price: data[i].high,
          type: 'bearish',
          source: 'overbought',
          isConfirmed: true,
          score,
          rsiValue: rsi,
          zScoreAoT: zAoT,
          volumePower: volPwr
        });
      } else if (justEnteredOB) {
        // Warning - just entered overbought
        const score = calculateScore(false, false, msi, volPwr, rsi, config);
        signals.push({
          bar: i,
          timestamp: Number(data[i].time),
          price: data[i].high,
          type: 'bearish',
          source: 'overbought',
          isConfirmed: false,
          score,
          rsiValue: rsi,
          zScoreAoT: zAoT,
          volumePower: volPwr
        });
      }
    } else if (hiddenBearTrigger && rsi > config.rsiOversold + 5) {
      // Hidden geometric bearish
      const score = calculateScore(false, true, msi, volPwr, rsi, config);
      signals.push({
        bar: i,
        timestamp: Number(data[i].time),
        price: data[i].high,
        type: 'bearish',
        source: 'geometric_bear',
        isConfirmed: true,
        score,
        rsiValue: rsi,
        zScoreAoT: zAoT,
        volumePower: volPwr
      });
    }
  }
  
  return { signals, rsiValues, zScoreAoT, volumePower };
}

/**
 * Calculate signal score
 */
function calculateScore(
  isBullish: boolean,
  isConfirmed: boolean,
  msi: number,
  volumePower: number,
  rsi: number,
  config: RAVMConfig
): number {
  let score = 0;
  
  // Volume Power (40%)
  score += volumePower * 40;
  
  // Geometry + Zone (30%)
  let zoneScore = 0;
  if (isBullish) {
    zoneScore = rsi <= config.rsiOversold ? 1.0 : (rsi < 50 ? 0.5 : 0);
  } else {
    zoneScore = rsi >= config.rsiOverbought ? 1.0 : (rsi > 50 ? 0.5 : 0);
  }
  const geoZoneScore = msi * 0.7 + zoneScore * 0.3;
  score += geoZoneScore * 30;
  
  // Delta context (30%)
  score += volumePower * 30;
  
  // Educational capping - unconfirmed signals max 49%
  if (!isConfirmed) {
    score = Math.min(score, 49);
  }
  
  return Math.max(0, Math.min(score, 100));
}

/**
 * Get recent signals
 */
export function getRecentRAVMSignals(
  data: CandleData[],
  config: RAVMConfig = defaultRAVMConfig,
  maxSignals: number = 20
): RAVMSignal[] {
  const result = calculateRAVM(data, config);
  return result.signals.slice(-maxSignals);
}
