/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    ADVANCED BREAKOUT DETECTION SYSTEM                         ║
 * ║                           كشف الاختراقات المتقدم                              ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Three Professional Algorithms:                                               ║
 * ║  1. Smart Breakout Detection - الاختراق الذكي (Multi-Factor Analysis)        ║
 * ║  2. Range Breakout - اختراق النطاق (Consolidation & Expansion)               ║
 * ║  3. Volume Surge Breakout - اختراق بحجم قوي (Volume Confirmation)            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================
// INTERFACES
// ============================================

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// NOTE: This project uses epoch seconds for chart time (Lightweight Charts `Time`).
// Keep all breakout time comparisons in seconds.
const DAY_SECONDS = 86400;

export interface SmartBreakout {
  time: number;
  price: number;
  direction: 'bullish' | 'bearish';
  type: 'resistance_break' | 'support_break' | 'channel_break' | 'trendline_break';
  strength: number; // 0-100
  volumeConfirmed: boolean;
  momentumConfirmed: boolean;
  retestExpected: boolean;
  targetPrice: number;
  stopLoss: number;
  riskReward: number;
  description: string;
}

export interface RangeBreakout {
  time: number;
  breakoutPrice: number;
  rangeHigh: number;
  rangeLow: number;
  direction: 'bullish' | 'bearish';
  rangeWidth: number;
  rangeWidthPercent: number;
  consolidationBars: number;
  breakoutStrength: number; // 0-100
  projectedTarget: number;
  expectedRetest: number;
  volumeExpansion: number;
  description: string;
}

export interface VolumeSurgeBreakout {
  time: number;
  price: number;
  direction: 'bullish' | 'bearish';
  volumeMultiple: number; // How many times average volume
  priceChange: number;
  priceChangePercent: number;
  volumeSpikeRank: number; // 0-100
  breakoutQuality: number; // 0-100
  isFakeout: boolean;
  fakeoutProbability: number;
  targetPrice: number;
  description: string;
}

export interface BreakoutAnalysisResult {
  smartBreakouts: SmartBreakout[];
  rangeBreakouts: RangeBreakout[];
  volumeSurgeBreakouts: VolumeSurgeBreakout[];
  summary: {
    totalBreakouts: number;
    bullishBreakouts: number;
    bearishBreakouts: number;
    avgBreakoutStrength: number;
    recentTrend: 'bullish' | 'bearish' | 'neutral';
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateATR(data: CandleData[], period: number = 14): number[] {
  const atr: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const highLow = data[i].high - data[i].low;
      const highClose = Math.abs(data[i].high - data[i - 1].close);
      const lowClose = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(highLow, highClose, lowClose));
    }
  }

  // Simple average for first ATR
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      atr.push(0);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += tr[j];
      }
      atr.push(sum / period);
    } else {
      atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
    }
  }

  return atr;
}

function calculateRSI(data: CandleData[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

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

    if (i < period) {
      rsi.push(50);
      continue;
    }

    let avgGain = 0;
    let avgLoss = 0;

    if (i === period) {
      for (let j = 1; j <= period; j++) {
        avgGain += gains[j];
        avgLoss += losses[j];
      }
      avgGain /= period;
      avgLoss /= period;
    } else {
      avgGain = (gains[i] + (rsi[i - 1] > 50 ? (100 - rsi[i - 1]) * 0.14 : 0)) / period;
      avgLoss = (losses[i] + (rsi[i - 1] < 50 ? rsi[i - 1] * 0.14 : 0)) / period;
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

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(0);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateStdDev(data: number[], period: number): number[] {
  const stdDev: number[] = [];
  const sma = calculateSMA(data, period);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      stdDev.push(0);
    } else {
      let sumSq = 0;
      for (let j = 0; j < period; j++) {
        sumSq += Math.pow(data[i - j] - sma[i], 2);
      }
      stdDev.push(Math.sqrt(sumSq / period));
    }
  }
  return stdDev;
}

function findSwingHighs(data: CandleData[], lookback: number = 5): { index: number; price: number }[] {
  const swings: { index: number; price: number }[] = [];

  for (let i = lookback; i < data.length - lookback; i++) {
    let isSwingHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swings.push({ index: i, price: data[i].high });
    }
  }

  return swings;
}

function findSwingLows(data: CandleData[], lookback: number = 5): { index: number; price: number }[] {
  const swings: { index: number; price: number }[] = [];

  for (let i = lookback; i < data.length - lookback; i++) {
    let isSwingLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swings.push({ index: i, price: data[i].low });
    }
  }

  return swings;
}

// ============================================
// 1. SMART BREAKOUT DETECTION
// الاختراق الذكي - تحليل متعدد العوامل
// ============================================

export function detectSmartBreakouts(
  data: CandleData[],
  options: {
    lookbackPeriod?: number;
    minStrength?: number;
    atrMultiple?: number;
    volumeThreshold?: number;
  } = {}
): SmartBreakout[] {
  const {
    lookbackPeriod = 20,
    minStrength = 60,
    atrMultiple = 1.5,
    volumeThreshold = 1.3
  } = options;

  if (data.length < lookbackPeriod * 2) return [];

  const breakouts: SmartBreakout[] = [];
  const atr = calculateATR(data, 14);
  const rsi = calculateRSI(data, 14);
  
  const volumes = data.map(d => d.volume || 0);
  const avgVolumes = calculateSMA(volumes, 20);

  // Find key levels (resistance and support)
  const swingHighs = findSwingHighs(data, 5);
  const swingLows = findSwingLows(data, 5);

  // Build resistance levels from swing highs
  const resistanceLevels: { price: number; strength: number; touches: number }[] = [];
  const supportLevels: { price: number; strength: number; touches: number }[] = [];

  // Cluster swing highs to find resistance
  for (const swing of swingHighs) {
    const tolerance = atr[swing.index] * 0.5 || swing.price * 0.005;
    let merged = false;
    
    for (const level of resistanceLevels) {
      if (Math.abs(swing.price - level.price) <= tolerance) {
        level.price = (level.price * level.touches + swing.price) / (level.touches + 1);
        level.touches++;
        level.strength = Math.min(100, level.strength + 10);
        merged = true;
        break;
      }
    }
    
    if (!merged) {
      resistanceLevels.push({ price: swing.price, strength: 50, touches: 1 });
    }
  }

  // Cluster swing lows to find support
  for (const swing of swingLows) {
    const tolerance = atr[swing.index] * 0.5 || swing.price * 0.005;
    let merged = false;
    
    for (const level of supportLevels) {
      if (Math.abs(swing.price - level.price) <= tolerance) {
        level.price = (level.price * level.touches + swing.price) / (level.touches + 1);
        level.touches++;
        level.strength = Math.min(100, level.strength + 10);
        merged = true;
        break;
      }
    }
    
    if (!merged) {
      supportLevels.push({ price: swing.price, strength: 50, touches: 1 });
    }
  }

  // Detect breakouts
  for (let i = lookbackPeriod; i < data.length; i++) {
    const candle = data[i];
    const prevCandle = data[i - 1];
    const currentATR = atr[i] || candle.close * 0.02;
    const currentRSI = rsi[i];
    const currentVolume = candle.volume || 0;
    const avgVolume = avgVolumes[i] || 1;
    const volumeRatio = currentVolume / avgVolume;

    // Check for resistance breakout (bullish)
    for (const resistance of resistanceLevels) {
      if (
        prevCandle.close < resistance.price &&
        candle.close > resistance.price &&
        candle.close - prevCandle.close > currentATR * 0.5
      ) {
        // Calculate breakout strength
        let strength = 50;
        
        // Volume confirmation
        const volumeConfirmed = volumeRatio >= volumeThreshold;
        if (volumeConfirmed) strength += 15;
        
        // Momentum confirmation (RSI)
        const momentumConfirmed = currentRSI > 50 && currentRSI < 80;
        if (momentumConfirmed) strength += 10;
        
        // Candle strength (close near high)
        const candleStrength = (candle.close - candle.low) / (candle.high - candle.low);
        if (candleStrength > 0.7) strength += 10;
        
        // Level strength bonus
        strength += resistance.touches * 3;
        strength = Math.min(100, strength);

        if (strength >= minStrength) {
          const targetDistance = currentATR * atrMultiple * 2;
          const stopDistance = currentATR * atrMultiple;

          breakouts.push({
            time: candle.time,
            price: candle.close,
            direction: 'bullish',
            type: 'resistance_break',
            strength,
            volumeConfirmed,
            momentumConfirmed,
            retestExpected: resistance.touches >= 3,
            targetPrice: candle.close + targetDistance,
            stopLoss: resistance.price - stopDistance,
            riskReward: targetDistance / stopDistance,
            description: `🚀 اختراق مقاومة قوي عند ${resistance.price.toFixed(2)} - القوة: ${strength}%`
          });
        }
      }
    }

    // Check for support breakout (bearish)
    for (const support of supportLevels) {
      if (
        prevCandle.close > support.price &&
        candle.close < support.price &&
        prevCandle.close - candle.close > currentATR * 0.5
      ) {
        // Calculate breakout strength
        let strength = 50;
        
        // Volume confirmation
        const volumeConfirmed = volumeRatio >= volumeThreshold;
        if (volumeConfirmed) strength += 15;
        
        // Momentum confirmation (RSI)
        const momentumConfirmed = currentRSI < 50 && currentRSI > 20;
        if (momentumConfirmed) strength += 10;
        
        // Candle strength (close near low)
        const candleStrength = (candle.high - candle.close) / (candle.high - candle.low);
        if (candleStrength > 0.7) strength += 10;
        
        // Level strength bonus
        strength += support.touches * 3;
        strength = Math.min(100, strength);

        if (strength >= minStrength) {
          const targetDistance = currentATR * atrMultiple * 2;
          const stopDistance = currentATR * atrMultiple;

          breakouts.push({
            time: candle.time,
            price: candle.close,
            direction: 'bearish',
            type: 'support_break',
            strength,
            volumeConfirmed,
            momentumConfirmed,
            retestExpected: support.touches >= 3,
            targetPrice: candle.close - targetDistance,
            stopLoss: support.price + stopDistance,
            riskReward: targetDistance / stopDistance,
            description: `📉 كسر دعم قوي عند ${support.price.toFixed(2)} - القوة: ${strength}%`
          });
        }
      }
    }
  }

  return breakouts;
}

// ============================================
// 2. RANGE BREAKOUT DETECTION
// اختراق النطاق - كشف التجميع والانفجار
// ============================================

export function detectRangeBreakouts(
  data: CandleData[],
  options: {
    minConsolidationBars?: number;
    maxRangeWidthPercent?: number;
    minBreakoutStrength?: number;
  } = {}
): RangeBreakout[] {
  const {
    minConsolidationBars = 10,
    maxRangeWidthPercent = 5,
    minBreakoutStrength = 50
  } = options;

  if (data.length < minConsolidationBars + 5) return [];

  const breakouts: RangeBreakout[] = [];
  const atr = calculateATR(data, 14);
  const volumes = data.map(d => d.volume || 0);
  const avgVolumes = calculateSMA(volumes, 20);

  // Find consolidation ranges
  for (let i = minConsolidationBars; i < data.length; i++) {
    // Look back for consolidation
    let consolidationStart = -1;
    let rangeHigh = 0;
    let rangeLow = Infinity;

    // Find the range
    for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
      const tempHigh = Math.max(...data.slice(j, i).map(d => d.high));
      const tempLow = Math.min(...data.slice(j, i).map(d => d.low));
      const rangeWidth = tempHigh - tempLow;
      const rangeWidthPercent = (rangeWidth / tempLow) * 100;

      if (rangeWidthPercent <= maxRangeWidthPercent && i - j >= minConsolidationBars) {
        consolidationStart = j;
        rangeHigh = tempHigh;
        rangeLow = tempLow;
      } else if (consolidationStart !== -1) {
        break;
      }
    }

    if (consolidationStart === -1) continue;

    const consolidationBars = i - consolidationStart;
    const rangeWidth = rangeHigh - rangeLow;
    const rangeWidthPercent = (rangeWidth / rangeLow) * 100;

    const candle = data[i];
    const currentVolume = candle.volume || 0;
    const avgVolume = avgVolumes[i] || 1;
    const volumeExpansion = currentVolume / avgVolume;

    // Check for bullish breakout
    if (candle.close > rangeHigh && data[i - 1].close <= rangeHigh) {
      const breakoutStrength = calculateRangeBreakoutStrength(
        candle,
        rangeHigh,
        rangeLow,
        volumeExpansion,
        consolidationBars,
        atr[i]
      );

      if (breakoutStrength >= minBreakoutStrength) {
        breakouts.push({
          time: candle.time,
          breakoutPrice: candle.close,
          rangeHigh,
          rangeLow,
          direction: 'bullish',
          rangeWidth,
          rangeWidthPercent,
          consolidationBars,
          breakoutStrength,
          projectedTarget: rangeHigh + rangeWidth, // Measured move
          expectedRetest: rangeHigh,
          volumeExpansion,
          description: `📈 اختراق صاعد للنطاق (${consolidationBars} شمعة) - الهدف: ${(rangeHigh + rangeWidth).toFixed(2)}`
        });
      }
    }

    // Check for bearish breakout
    if (candle.close < rangeLow && data[i - 1].close >= rangeLow) {
      const breakoutStrength = calculateRangeBreakoutStrength(
        candle,
        rangeHigh,
        rangeLow,
        volumeExpansion,
        consolidationBars,
        atr[i]
      );

      if (breakoutStrength >= minBreakoutStrength) {
        breakouts.push({
          time: candle.time,
          breakoutPrice: candle.close,
          rangeHigh,
          rangeLow,
          direction: 'bearish',
          rangeWidth,
          rangeWidthPercent,
          consolidationBars,
          breakoutStrength,
          projectedTarget: rangeLow - rangeWidth, // Measured move
          expectedRetest: rangeLow,
          volumeExpansion,
          description: `📉 اختراق هابط للنطاق (${consolidationBars} شمعة) - الهدف: ${(rangeLow - rangeWidth).toFixed(2)}`
        });
      }
    }
  }

  // Remove duplicate breakouts (within ~5 bars)
  // We infer bar duration from the data itself to support multiple timeframes.
  const barSeconds = Math.max(
    1,
    Math.abs((data[1]?.time ?? data[0]?.time ?? 0) - (data[0]?.time ?? 0)) || DAY_SECONDS
  );

  const filteredBreakouts: RangeBreakout[] = [];
  for (const breakout of breakouts) {
    const isDuplicate = filteredBreakouts.some(
      b => Math.abs(b.time - breakout.time) < 5 * barSeconds && b.direction === breakout.direction
    );
    if (!isDuplicate) {
      filteredBreakouts.push(breakout);
    }
  }

  return filteredBreakouts;
}

function calculateRangeBreakoutStrength(
  candle: CandleData,
  rangeHigh: number,
  rangeLow: number,
  volumeExpansion: number,
  consolidationBars: number,
  atr: number
): number {
  let strength = 40;

  // Volume expansion bonus
  if (volumeExpansion > 2) strength += 20;
  else if (volumeExpansion > 1.5) strength += 15;
  else if (volumeExpansion > 1.2) strength += 10;

  // Consolidation length bonus
  if (consolidationBars > 30) strength += 15;
  else if (consolidationBars > 20) strength += 10;
  else if (consolidationBars > 10) strength += 5;

  // Candle body strength
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  const bodyRatio = body / range;
  if (bodyRatio > 0.7) strength += 10;

  // Breakout magnitude
  const breakoutMagnitude = candle.close > rangeHigh
    ? (candle.close - rangeHigh) / atr
    : (rangeLow - candle.close) / atr;
  if (breakoutMagnitude > 1) strength += 10;

  return Math.min(100, strength);
}

// ============================================
// 3. VOLUME SURGE BREAKOUT DETECTION
// اختراق بحجم قوي - تأكيد الحجم
// ============================================

export function detectVolumeSurgeBreakouts(
  data: CandleData[],
  options: {
    volumeMultipleThreshold?: number;
    priceChangeThreshold?: number;
    lookbackPeriod?: number;
    fakeoutDetection?: boolean;
  } = {}
): VolumeSurgeBreakout[] {
  const {
    volumeMultipleThreshold = 2.0,
    priceChangeThreshold = 1.5,
    lookbackPeriod = 20,
    fakeoutDetection = true
  } = options;

  if (data.length < lookbackPeriod + 5) return [];

  const breakouts: VolumeSurgeBreakout[] = [];
  const atr = calculateATR(data, 14);
  const volumes = data.map(d => d.volume || 0);
  const avgVolumes = calculateSMA(volumes, lookbackPeriod);
  const stdVolumes = calculateStdDev(volumes, lookbackPeriod);

  for (let i = lookbackPeriod; i < data.length; i++) {
    const candle = data[i];
    const currentVolume = candle.volume || 0;
    const avgVolume = avgVolumes[i] || 1;
    const stdVolume = stdVolumes[i] || 1;
    const currentATR = atr[i] || candle.close * 0.02;

    const volumeMultiple = currentVolume / avgVolume;
    const volumeZScore = (currentVolume - avgVolume) / stdVolume;

    // Skip if volume is not significant
    if (volumeMultiple < volumeMultipleThreshold) continue;

    const priceChange = candle.close - candle.open;
    const priceChangePercent = (priceChange / candle.open) * 100;
    const priceChangeATR = Math.abs(priceChange) / currentATR;

    // Skip if price change is not significant
    if (priceChangeATR < priceChangeThreshold * 0.5) continue;

    const direction: 'bullish' | 'bearish' = priceChange > 0 ? 'bullish' : 'bearish';

    // Calculate volume spike rank (0-100)
    const volumeSpikeRank = Math.min(100, volumeZScore * 20 + 50);

    // Calculate breakout quality
    let breakoutQuality = 50;
    
    // Body ratio (close near high for bullish, close near low for bearish)
    const bodyRatio = Math.abs(candle.close - candle.open) / (candle.high - candle.low);
    if (bodyRatio > 0.7) breakoutQuality += 15;
    
    // Volume confirmation
    if (volumeMultiple > 3) breakoutQuality += 20;
    else if (volumeMultiple > 2) breakoutQuality += 10;
    
    // Price movement significance
    if (priceChangeATR > 2) breakoutQuality += 15;
    else if (priceChangeATR > 1) breakoutQuality += 10;

    breakoutQuality = Math.min(100, breakoutQuality);

    // Fakeout detection
    let isFakeout = false;
    let fakeoutProbability = 0;

    if (fakeoutDetection && i + 3 < data.length) {
      // Check next 3 candles for reversal
      const followUp = data.slice(i + 1, i + 4);
      const reversalCount = followUp.filter(c => {
        const change = c.close - c.open;
        return (direction === 'bullish' && change < 0) || (direction === 'bearish' && change > 0);
      }).length;

      fakeoutProbability = (reversalCount / 3) * 100;
      isFakeout = fakeoutProbability > 66;
    } else {
      // Estimate fakeout probability based on patterns
      // Extreme volume with small price move often indicates fakeout
      if (volumeMultiple > 4 && priceChangeATR < 1) {
        fakeoutProbability = 60;
      } else if (volumeMultiple > 3 && priceChangeATR < 0.5) {
        fakeoutProbability = 50;
      } else {
        fakeoutProbability = Math.max(0, 30 - breakoutQuality * 0.3);
      }
    }

    // Calculate target price
    const targetDistance = currentATR * 2 * (direction === 'bullish' ? 1 : -1);
    const targetPrice = candle.close + targetDistance;

    breakouts.push({
      time: candle.time,
      price: candle.close,
      direction,
      volumeMultiple,
      priceChange,
      priceChangePercent,
      volumeSpikeRank,
      breakoutQuality,
      isFakeout,
      fakeoutProbability,
      targetPrice,
      description: direction === 'bullish'
        ? `🔥 اختراق صاعد بحجم ${volumeMultiple.toFixed(1)}x - القوة: ${breakoutQuality}%`
        : `🔥 اختراق هابط بحجم ${volumeMultiple.toFixed(1)}x - القوة: ${breakoutQuality}%`
    });
  }

  // Filter out fakeouts if requested
  return breakouts.filter(b => !b.isFakeout || b.breakoutQuality > 70);
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeBreakouts(
  data: CandleData[],
  options: {
    smartBreakout?: boolean;
    rangeBreakout?: boolean;
    volumeSurgeBreakout?: boolean;
  } = {}
): BreakoutAnalysisResult {
  const {
    smartBreakout = true,
    rangeBreakout = true,
    volumeSurgeBreakout = true
  } = options;

  const result: BreakoutAnalysisResult = {
    smartBreakouts: [],
    rangeBreakouts: [],
    volumeSurgeBreakouts: [],
    summary: {
      totalBreakouts: 0,
      bullishBreakouts: 0,
      bearishBreakouts: 0,
      avgBreakoutStrength: 0,
      recentTrend: 'neutral'
    }
  };

  if (data.length < 30) return result;

  // Run detections
  if (smartBreakout) {
    result.smartBreakouts = detectSmartBreakouts(data);
  }

  if (rangeBreakout) {
    result.rangeBreakouts = detectRangeBreakouts(data);
  }

  if (volumeSurgeBreakout) {
    result.volumeSurgeBreakouts = detectVolumeSurgeBreakouts(data);
  }

  // Calculate summary
  const allBreakouts = [
    ...result.smartBreakouts.map(b => ({ direction: b.direction, strength: b.strength, time: b.time })),
    ...result.rangeBreakouts.map(b => ({ direction: b.direction, strength: b.breakoutStrength, time: b.time })),
    ...result.volumeSurgeBreakouts.map(b => ({ direction: b.direction, strength: b.breakoutQuality, time: b.time }))
  ];

  result.summary.totalBreakouts = allBreakouts.length;
  result.summary.bullishBreakouts = allBreakouts.filter(b => b.direction === 'bullish').length;
  result.summary.bearishBreakouts = allBreakouts.filter(b => b.direction === 'bearish').length;

  if (allBreakouts.length > 0) {
    result.summary.avgBreakoutStrength = allBreakouts.reduce((sum, b) => sum + b.strength, 0) / allBreakouts.length;
  }

  // Determine recent trend from last 10 breakouts
  const recentBreakouts = allBreakouts.slice(-10);
  const recentBullish = recentBreakouts.filter(b => b.direction === 'bullish').length;
  const recentBearish = recentBreakouts.filter(b => b.direction === 'bearish').length;

  if (recentBullish > recentBearish + 2) {
    result.summary.recentTrend = 'bullish';
  } else if (recentBearish > recentBullish + 2) {
    result.summary.recentTrend = 'bearish';
  } else {
    result.summary.recentTrend = 'neutral';
  }

  return result;
}

// Export types
export type { BreakoutAnalysisResult as BreakoutResult };
