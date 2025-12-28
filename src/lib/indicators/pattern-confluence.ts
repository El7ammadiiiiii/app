/**
 * Pattern Confluence - التقاء الأنماط
 * 
 * Multi-layer confluence validation:
 * - Multi-Timeframe pattern validation
 * - Fibonacci confluence zones
 * - Support/Resistance confluence
 * - Volume profile confluence
 * - Moving average confluence
 * 
 * @author CCCWAYS Elite Trading System
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// INTERFACES
// ==========================================================

export type TimeframeType = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface ConfluenceZone {
  price: number;
  priceRange: { min: number; max: number };
  strength: number; // 0-100
  sources: ConfluenceSource[];
  type: 'support' | 'resistance' | 'neutral';
  recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

export interface ConfluenceSource {
  type: ConfluenceSourceType;
  price: number;
  weight: number;
  description: string;
}

export type ConfluenceSourceType = 
  | 'fibonacci_retracement'
  | 'fibonacci_extension'
  | 'support_resistance'
  | 'pivot_point'
  | 'moving_average'
  | 'pattern_target'
  | 'volume_poc'
  | 'psychological_level'
  | 'previous_high_low'
  | 'trendline';

export interface FibonacciLevel {
  ratio: number;
  price: number;
  label: string;
  isExtension: boolean;
}

export interface MultiTimeframeConfluence {
  timeframe: TimeframeType;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  keyLevels: { price: number; type: string }[];
  weight: number;
}

export interface PatternConfluenceResult {
  overallScore: number; // 0-100
  confluenceZones: ConfluenceZone[];
  fibonacciLevels: FibonacciLevel[];
  mtfAlignment: MultiTimeframeConfluence[];
  recommendation: {
    action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    confidence: number;
    reasons: string[];
    risks: string[];
  };
}

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function findSwingHigh(candles: OHLCV[], lookback: number = 50): { index: number; price: number } | null {
  if (candles.length < 10) return null;
  
  const startIndex = Math.max(0, candles.length - lookback);
  let maxHigh = -Infinity;
  let maxIndex = -1;
  
  for (let i = startIndex; i < candles.length; i++) {
    if (candles[i].high > maxHigh) {
      maxHigh = candles[i].high;
      maxIndex = i;
    }
  }
  
  return maxIndex >= 0 ? { index: maxIndex, price: maxHigh } : null;
}

function findSwingLow(candles: OHLCV[], lookback: number = 50): { index: number; price: number } | null {
  if (candles.length < 10) return null;
  
  const startIndex = Math.max(0, candles.length - lookback);
  let minLow = Infinity;
  let minIndex = -1;
  
  for (let i = startIndex; i < candles.length; i++) {
    if (candles[i].low < minLow) {
      minLow = candles[i].low;
      minIndex = i;
    }
  }
  
  return minIndex >= 0 ? { index: minIndex, price: minLow } : null;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += prices[j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[0]);
    } else {
      ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  
  return ema;
}

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

// ==========================================================
// FIBONACCI CALCULATIONS
// ==========================================================

export const FIBONACCI_RATIOS = {
  retracement: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
  extension: [1.272, 1.414, 1.618, 2.0, 2.272, 2.618, 3.0],
};

export function calculateFibonacciLevels(
  swingHigh: number,
  swingLow: number,
  isUptrend: boolean
): FibonacciLevel[] {
  const levels: FibonacciLevel[] = [];
  const range = swingHigh - swingLow;
  
  // Retracement levels
  for (const ratio of FIBONACCI_RATIOS.retracement) {
    const price = isUptrend
      ? swingHigh - range * ratio
      : swingLow + range * ratio;
    
    levels.push({
      ratio,
      price,
      label: `${(ratio * 100).toFixed(1)}%`,
      isExtension: false,
    });
  }
  
  // Extension levels
  for (const ratio of FIBONACCI_RATIOS.extension) {
    const price = isUptrend
      ? swingLow + range * ratio
      : swingHigh - range * ratio;
    
    levels.push({
      ratio,
      price,
      label: `${(ratio * 100).toFixed(1)}%`,
      isExtension: true,
    });
  }
  
  return levels;
}

// ==========================================================
// FIBONACCI CONFLUENCE DETECTION
// ==========================================================

export function detectFibonacciConfluence(
  candles: OHLCV[],
  options: {
    lookback?: number;
    tolerance?: number;
  } = {}
): ConfluenceZone[] {
  const {
    lookback = 100,
    tolerance = 0.005, // 0.5%
  } = options;
  
  if (candles.length < 20) return [];
  
  const zones: ConfluenceZone[] = [];
  const currentPrice = candles[candles.length - 1].close;
  const atr = calculateATR(candles);
  
  // Find multiple swing points to create Fibonacci clusters
  const swingHigh = findSwingHigh(candles, lookback);
  const swingLow = findSwingLow(candles, lookback);
  
  if (!swingHigh || !swingLow) return [];
  
  // Determine trend
  const isUptrend = swingLow.index < swingHigh.index;
  
  // Calculate Fibonacci levels
  const fibLevels = calculateFibonacciLevels(swingHigh.price, swingLow.price, isUptrend);
  
  // Cluster nearby Fibonacci levels
  const priceToSources: Map<number, ConfluenceSource[]> = new Map();
  
  for (const fib of fibLevels) {
    // Find if this price is close to an existing cluster
    let foundCluster = false;
    for (const [clusterPrice, sources] of priceToSources) {
      if (Math.abs(fib.price - clusterPrice) / clusterPrice < tolerance) {
        sources.push({
          type: fib.isExtension ? 'fibonacci_extension' : 'fibonacci_retracement',
          price: fib.price,
          weight: fib.ratio === 0.618 || fib.ratio === 0.5 ? 2 : 1,
          description: `Fib ${fib.label}${fib.isExtension ? ' ext' : ' ret'}`,
        });
        foundCluster = true;
        break;
      }
    }
    
    if (!foundCluster) {
      priceToSources.set(fib.price, [{
        type: fib.isExtension ? 'fibonacci_extension' : 'fibonacci_retracement',
        price: fib.price,
        weight: fib.ratio === 0.618 || fib.ratio === 0.5 ? 2 : 1,
        description: `Fib ${fib.label}${fib.isExtension ? ' ext' : ' ret'}`,
      }]);
    }
  }
  
  // Create confluence zones from clusters with 2+ sources
  for (const [price, sources] of priceToSources) {
    if (sources.length >= 1) {
      const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
      const strength = Math.min(100, totalWeight * 25);
      
      zones.push({
        price,
        priceRange: { min: price - atr * 0.2, max: price + atr * 0.2 },
        strength,
        sources,
        type: price > currentPrice ? 'resistance' : 'support',
        recommendation: 'neutral',
      });
    }
  }
  
  return zones.sort((a, b) => b.strength - a.strength);
}

// ==========================================================
// MOVING AVERAGE CONFLUENCE
// ==========================================================

export function detectMAConfluence(
  candles: OHLCV[],
  options: {
    maPeriods?: number[];
    tolerance?: number;
  } = {}
): ConfluenceZone[] {
  const {
    maPeriods = [20, 50, 100, 200],
    tolerance = 0.01, // 1%
  } = options;
  
  if (candles.length < Math.max(...maPeriods)) return [];
  
  const zones: ConfluenceZone[] = [];
  const closes = candles.map(c => c.close);
  const currentPrice = candles[candles.length - 1].close;
  const atr = calculateATR(candles);
  
  // Calculate all MAs
  const maValues: { period: number; value: number; type: 'sma' | 'ema' }[] = [];
  
  for (const period of maPeriods) {
    const sma = calculateSMA(closes, period);
    const ema = calculateEMA(closes, period);
    
    const smaValue = sma[sma.length - 1];
    const emaValue = ema[ema.length - 1];
    
    if (!isNaN(smaValue)) {
      maValues.push({ period, value: smaValue, type: 'sma' });
    }
    if (!isNaN(emaValue)) {
      maValues.push({ period, value: emaValue, type: 'ema' });
    }
  }
  
  // Cluster nearby MAs
  const clusters: { price: number; sources: ConfluenceSource[] }[] = [];
  
  for (const ma of maValues) {
    let foundCluster = false;
    for (const cluster of clusters) {
      if (Math.abs(ma.value - cluster.price) / cluster.price < tolerance) {
        cluster.sources.push({
          type: 'moving_average',
          price: ma.value,
          weight: ma.period >= 100 ? 2 : 1,
          description: `${ma.type.toUpperCase()} ${ma.period}`,
        });
        cluster.price = (cluster.price * (cluster.sources.length - 1) + ma.value) / cluster.sources.length;
        foundCluster = true;
        break;
      }
    }
    
    if (!foundCluster) {
      clusters.push({
        price: ma.value,
        sources: [{
          type: 'moving_average',
          price: ma.value,
          weight: ma.period >= 100 ? 2 : 1,
          description: `${ma.type.toUpperCase()} ${ma.period}`,
        }],
      });
    }
  }
  
  // Create zones from clusters with 2+ MAs
  for (const cluster of clusters) {
    if (cluster.sources.length >= 2) {
      const totalWeight = cluster.sources.reduce((sum, s) => sum + s.weight, 0);
      const strength = Math.min(100, totalWeight * 20);
      
      zones.push({
        price: cluster.price,
        priceRange: { min: cluster.price - atr * 0.3, max: cluster.price + atr * 0.3 },
        strength,
        sources: cluster.sources,
        type: cluster.price > currentPrice ? 'resistance' : 'support',
        recommendation: cluster.price > currentPrice 
          ? (strength > 70 ? 'sell' : 'neutral')
          : (strength > 70 ? 'buy' : 'neutral'),
      });
    }
  }
  
  return zones.sort((a, b) => b.strength - a.strength);
}

// ==========================================================
// PSYCHOLOGICAL LEVELS
// ==========================================================

export function detectPsychologicalLevels(
  candles: OHLCV[],
  options: {
    roundingFactor?: number;
    range?: number;
  } = {}
): ConfluenceSource[] {
  if (candles.length === 0) return [];
  
  const currentPrice = candles[candles.length - 1].close;
  
  // Determine appropriate rounding based on price magnitude
  let roundingFactor: number;
  if (currentPrice >= 10000) roundingFactor = 1000;
  else if (currentPrice >= 1000) roundingFactor = 100;
  else if (currentPrice >= 100) roundingFactor = 10;
  else if (currentPrice >= 10) roundingFactor = 1;
  else roundingFactor = 0.1;
  
  const range = roundingFactor * 5;
  const sources: ConfluenceSource[] = [];
  
  // Find round numbers near current price
  const lowerBound = Math.floor(currentPrice / roundingFactor) * roundingFactor - range;
  const upperBound = Math.ceil(currentPrice / roundingFactor) * roundingFactor + range;
  
  for (let level = lowerBound; level <= upperBound; level += roundingFactor) {
    if (level <= 0) continue;
    
    // Weight based on how "round" the number is
    let weight = 1;
    if (level % (roundingFactor * 10) === 0) weight = 3;
    else if (level % (roundingFactor * 5) === 0) weight = 2;
    
    sources.push({
      type: 'psychological_level',
      price: level,
      weight,
      description: `Round number ${level}`,
    });
  }
  
  return sources;
}

// ==========================================================
// PREVIOUS HIGH/LOW LEVELS
// ==========================================================

export function detectPreviousHighLows(
  candles: OHLCV[],
  options: {
    periods?: { name: string; bars: number }[];
  } = {}
): ConfluenceSource[] {
  const {
    periods = [
      { name: 'Daily', bars: 1 },
      { name: 'Weekly', bars: 5 },
      { name: 'Monthly', bars: 20 },
    ],
  } = options;
  
  if (candles.length < 30) return [];
  
  const sources: ConfluenceSource[] = [];
  
  for (const period of periods) {
    const barsBack = period.bars * 24; // Approximate for intraday
    if (candles.length < barsBack + 1) continue;
    
    const periodCandles = candles.slice(-barsBack - 1, -1);
    const high = Math.max(...periodCandles.map(c => c.high));
    const low = Math.min(...periodCandles.map(c => c.low));
    
    sources.push({
      type: 'previous_high_low',
      price: high,
      weight: period.name === 'Monthly' ? 3 : period.name === 'Weekly' ? 2 : 1,
      description: `Previous ${period.name} High`,
    });
    
    sources.push({
      type: 'previous_high_low',
      price: low,
      weight: period.name === 'Monthly' ? 3 : period.name === 'Weekly' ? 2 : 1,
      description: `Previous ${period.name} Low`,
    });
  }
  
  return sources;
}

// ==========================================================
// PIVOT POINTS
// ==========================================================

export function calculatePivotPoints(candles: OHLCV[]): ConfluenceSource[] {
  if (candles.length < 2) return [];
  
  // Use previous day's data
  const prevCandle = candles[candles.length - 2];
  const high = prevCandle.high;
  const low = prevCandle.low;
  const close = prevCandle.close;
  
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const r3 = high + 2 * (pivot - low);
  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);
  const s3 = low - 2 * (high - pivot);
  
  return [
    { type: 'pivot_point', price: pivot, weight: 3, description: 'Pivot Point (PP)' },
    { type: 'pivot_point', price: r1, weight: 2, description: 'Resistance 1 (R1)' },
    { type: 'pivot_point', price: r2, weight: 2, description: 'Resistance 2 (R2)' },
    { type: 'pivot_point', price: r3, weight: 1, description: 'Resistance 3 (R3)' },
    { type: 'pivot_point', price: s1, weight: 2, description: 'Support 1 (S1)' },
    { type: 'pivot_point', price: s2, weight: 2, description: 'Support 2 (S2)' },
    { type: 'pivot_point', price: s3, weight: 1, description: 'Support 3 (S3)' },
  ];
}

// ==========================================================
// COMPLETE CONFLUENCE ANALYSIS
// ==========================================================

export function analyzePatternConfluence(
  candles: OHLCV[],
  options: {
    tolerance?: number;
    includeExtensions?: boolean;
  } = {}
): PatternConfluenceResult {
  const {
    tolerance = 0.01, // 1%
  } = options;
  
  if (candles.length < 50) {
    return {
      overallScore: 0,
      confluenceZones: [],
      fibonacciLevels: [],
      mtfAlignment: [],
      recommendation: {
        action: 'hold',
        confidence: 0,
        reasons: ['Insufficient data'],
        risks: [],
      },
    };
  }
  
  const currentPrice = candles[candles.length - 1].close;
  const atr = calculateATR(candles);
  
  // Gather all confluence sources
  const allSources: ConfluenceSource[] = [];
  
  // Fibonacci levels
  const swingHigh = findSwingHigh(candles, 100);
  const swingLow = findSwingLow(candles, 100);
  let fibonacciLevels: FibonacciLevel[] = [];
  
  if (swingHigh && swingLow) {
    const isUptrend = swingLow.index < swingHigh.index;
    fibonacciLevels = calculateFibonacciLevels(swingHigh.price, swingLow.price, isUptrend);
    
    for (const fib of fibonacciLevels) {
      allSources.push({
        type: fib.isExtension ? 'fibonacci_extension' : 'fibonacci_retracement',
        price: fib.price,
        weight: [0.382, 0.5, 0.618].includes(fib.ratio) ? 3 : fib.ratio === 0.786 ? 2 : 1,
        description: `Fib ${fib.label}`,
      });
    }
  }
  
  // Moving averages
  const maZones = detectMAConfluence(candles);
  for (const zone of maZones) {
    allSources.push(...zone.sources);
  }
  
  // Pivot points
  allSources.push(...calculatePivotPoints(candles));
  
  // Psychological levels
  allSources.push(...detectPsychologicalLevels(candles));
  
  // Previous highs/lows
  allSources.push(...detectPreviousHighLows(candles));
  
  // Cluster all sources into confluence zones
  const clusters: { price: number; sources: ConfluenceSource[] }[] = [];
  
  for (const source of allSources) {
    let foundCluster = false;
    for (const cluster of clusters) {
      if (Math.abs(source.price - cluster.price) / cluster.price < tolerance) {
        cluster.sources.push(source);
        // Update cluster price as weighted average
        const totalWeight = cluster.sources.reduce((sum, s) => sum + s.weight, 0);
        cluster.price = cluster.sources.reduce((sum, s) => sum + s.price * s.weight, 0) / totalWeight;
        foundCluster = true;
        break;
      }
    }
    
    if (!foundCluster) {
      clusters.push({ price: source.price, sources: [source] });
    }
  }
  
  // Create confluence zones
  const confluenceZones: ConfluenceZone[] = [];
  
  for (const cluster of clusters) {
    if (cluster.sources.length >= 2) {
      const totalWeight = cluster.sources.reduce((sum, s) => sum + s.weight, 0);
      const uniqueTypes = new Set(cluster.sources.map(s => s.type)).size;
      
      // Strength based on weight and variety
      const strength = Math.min(100, (totalWeight * 10) + (uniqueTypes * 15));
      
      const type: 'support' | 'resistance' = cluster.price > currentPrice ? 'resistance' : 'support';
      
      let recommendation: ConfluenceZone['recommendation'] = 'neutral';
      if (strength >= 80) {
        recommendation = type === 'support' ? 'strong_buy' : 'strong_sell';
      } else if (strength >= 60) {
        recommendation = type === 'support' ? 'buy' : 'sell';
      }
      
      confluenceZones.push({
        price: cluster.price,
        priceRange: { min: cluster.price - atr * 0.2, max: cluster.price + atr * 0.2 },
        strength,
        sources: cluster.sources,
        type,
        recommendation,
      });
    }
  }
  
  // Sort by strength
  confluenceZones.sort((a, b) => b.strength - a.strength);
  
  // Calculate overall score
  const nearbyZones = confluenceZones.filter(z => 
    Math.abs(z.price - currentPrice) / currentPrice < 0.05
  );
  
  const overallScore = nearbyZones.length > 0
    ? Math.min(100, nearbyZones.reduce((sum, z) => sum + z.strength, 0) / nearbyZones.length)
    : 0;
  
  // Generate recommendation
  const supportZones = nearbyZones.filter(z => z.type === 'support');
  const resistanceZones = nearbyZones.filter(z => z.type === 'resistance');
  
  const supportStrength = supportZones.reduce((sum, z) => sum + z.strength, 0);
  const resistanceStrength = resistanceZones.reduce((sum, z) => sum + z.strength, 0);
  
  let action: PatternConfluenceResult['recommendation']['action'] = 'hold';
  const reasons: string[] = [];
  const risks: string[] = [];
  
  if (supportStrength > resistanceStrength * 1.5) {
    action = supportStrength > 150 ? 'strong_buy' : 'buy';
    reasons.push(`Strong support confluence (${supportZones.length} zones)`);
    if (supportZones[0]) {
      reasons.push(`Key support at ${supportZones[0].price.toFixed(2)}`);
    }
  } else if (resistanceStrength > supportStrength * 1.5) {
    action = resistanceStrength > 150 ? 'strong_sell' : 'sell';
    reasons.push(`Strong resistance confluence (${resistanceZones.length} zones)`);
    if (resistanceZones[0]) {
      reasons.push(`Key resistance at ${resistanceZones[0].price.toFixed(2)}`);
    }
  } else {
    action = 'hold';
    reasons.push('Mixed confluence signals');
  }
  
  if (nearbyZones.length === 0) {
    risks.push('Price in low-confluence zone');
  }
  if (supportZones.length > 0 && resistanceZones.length > 0) {
    risks.push('Price between support and resistance');
  }
  
  const confidence = Math.min(95, overallScore + uniqueTypesCount(confluenceZones) * 5);
  
  return {
    overallScore,
    confluenceZones,
    fibonacciLevels,
    mtfAlignment: [], // Would require multi-timeframe data
    recommendation: {
      action,
      confidence,
      reasons,
      risks,
    },
  };
}

function uniqueTypesCount(zones: ConfluenceZone[]): number {
  const allTypes = new Set<ConfluenceSourceType>();
  for (const zone of zones) {
    for (const source of zone.sources) {
      allTypes.add(source.type);
    }
  }
  return allTypes.size;
}

export default {
  calculateFibonacciLevels,
  detectFibonacciConfluence,
  detectMAConfluence,
  detectPsychologicalLevels,
  detectPreviousHighLows,
  calculatePivotPoints,
  analyzePatternConfluence,
  FIBONACCI_RATIOS,
};
