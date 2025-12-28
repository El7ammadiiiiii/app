/**
 * Confluence Analysis & Risk Management Indicators
 * خوارزميات تحليل التلاقي وإدارة المخاطر المتقدمة
 * 
 * Professional-grade algorithms for:
 * - Multi-level confluence detection
 * - Fibonacci confluence zones
 * - Pivot point analysis
 * - Risk/Reward zone mapping
 * - Pattern quality scoring
 */

export interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ==========================================================
// CONFLUENCE ZONE - مناطق التلاقي
// ==========================================================

export interface ConfluenceZone {
  price: number;
  strength: number; // 1-10
  type: 'support' | 'resistance';
  sources: string[];
  startTime: number | string;
  endTime?: number | string;
  touches: number;
  reliability: number; // 0-100
}

export interface ConfluenceResult {
  zones: ConfluenceZone[];
  strongestSupport: ConfluenceZone | null;
  strongestResistance: ConfluenceZone | null;
  currentBias: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Automatic Confluence Detection
 * كشف التلاقي التلقائي - يجمع مستويات متعددة من مصادر مختلفة
 */
export function detectConfluenceZones(data: CandleData[]): ConfluenceResult {
  if (data.length < 50) {
    return { zones: [], strongestSupport: null, strongestResistance: null, currentBias: 'neutral' };
  }
  
  const currentPrice = data[data.length - 1].close;
  const zones: ConfluenceZone[] = [];
  
  // 1. Detect Swing Highs/Lows
  const swingLevels = detectSwingLevels(data);
  
  // 2. Calculate Moving Average levels
  const maLevels = calculateMALevels(data);
  
  // 3. Calculate Round Number levels
  const roundNumbers = calculateRoundNumbers(currentPrice);
  
  // 4. Detect Volume Profile POC
  const volumeLevels = detectVolumeLevels(data);
  
  // Combine all levels and find confluences
  const allLevels: { price: number; type: 'support' | 'resistance'; source: string }[] = [
    ...swingLevels.map(l => ({ ...l, source: 'swing' })),
    ...maLevels.map(l => ({ ...l, source: 'ma' })),
    ...roundNumbers.map(l => ({ ...l, source: 'round' })),
    ...volumeLevels.map(l => ({ ...l, source: 'volume' }))
  ];
  
  // Group levels by proximity (within 0.3% of each other)
  const tolerance = currentPrice * 0.003;
  const grouped: Map<number, typeof allLevels> = new Map();
  
  for (const level of allLevels) {
    let foundGroup = false;
    for (const [key, group] of grouped.entries()) {
      if (Math.abs(level.price - key) <= tolerance) {
        group.push(level);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      grouped.set(level.price, [level]);
    }
  }
  
  // Create confluence zones from grouped levels
  for (const [basePrice, levels] of grouped.entries()) {
    if (levels.length >= 2) {
      const avgPrice = levels.reduce((sum, l) => sum + l.price, 0) / levels.length;
      const sources = [...new Set(levels.map(l => l.source))];
      const type = avgPrice < currentPrice ? 'support' : 'resistance';
      
      // Calculate strength based on number of confluences
      const strength = Math.min(10, levels.length * 2);
      
      // Calculate reliability based on source diversity
      const reliability = Math.min(100, sources.length * 25 + levels.length * 10);
      
      // Count historical touches
      const touches = countTouches(data, avgPrice, tolerance);
      
      zones.push({
        price: avgPrice,
        strength,
        type,
        sources,
        startTime: data[Math.max(0, data.length - 100)].time,
        touches,
        reliability
      });
    }
  }
  
  // Sort by strength
  zones.sort((a, b) => b.strength - a.strength);
  
  // Find strongest support and resistance
  const supports = zones.filter(z => z.type === 'support').slice(0, 5);
  const resistances = zones.filter(z => z.type === 'resistance').slice(0, 5);
  
  // Determine bias
  let currentBias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (supports.length > 0 && resistances.length > 0) {
    const nearestSupport = supports[0];
    const nearestResistance = resistances[0];
    const distToSupport = currentPrice - nearestSupport.price;
    const distToResistance = nearestResistance.price - currentPrice;
    
    if (distToSupport < distToResistance * 0.5) {
      currentBias = 'bullish'; // Near support
    } else if (distToResistance < distToSupport * 0.5) {
      currentBias = 'bearish'; // Near resistance
    }
  }
  
  return {
    zones: zones.slice(0, 10),
    strongestSupport: supports[0] || null,
    strongestResistance: resistances[0] || null,
    currentBias
  };
}

function detectSwingLevels(data: CandleData[]): { price: number; type: 'support' | 'resistance' }[] {
  const levels: { price: number; type: 'support' | 'resistance' }[] = [];
  const lookback = 5;
  
  for (let i = lookback; i < data.length - lookback; i++) {
    const current = data[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (data[i - j].high >= current.high || data[i + j].high >= current.high) {
        isSwingHigh = false;
      }
      if (data[i - j].low <= current.low || data[i + j].low <= current.low) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) {
      levels.push({ price: current.high, type: 'resistance' });
    }
    if (isSwingLow) {
      levels.push({ price: current.low, type: 'support' });
    }
  }
  
  return levels;
}

function calculateMALevels(data: CandleData[]): { price: number; type: 'support' | 'resistance' }[] {
  const levels: { price: number; type: 'support' | 'resistance' }[] = [];
  const periods = [20, 50, 100, 200];
  const currentPrice = data[data.length - 1].close;
  
  for (const period of periods) {
    if (data.length >= period) {
      const sum = data.slice(-period).reduce((s, d) => s + d.close, 0);
      const ma = sum / period;
      levels.push({
        price: ma,
        type: ma < currentPrice ? 'support' : 'resistance'
      });
    }
  }
  
  return levels;
}

function calculateRoundNumbers(currentPrice: number): { price: number; type: 'support' | 'resistance' }[] {
  const levels: { price: number; type: 'support' | 'resistance' }[] = [];
  
  // Determine the appropriate round number interval
  let interval: number;
  if (currentPrice > 10000) {
    interval = 1000;
  } else if (currentPrice > 1000) {
    interval = 100;
  } else if (currentPrice > 100) {
    interval = 10;
  } else if (currentPrice > 10) {
    interval = 1;
  } else {
    interval = 0.1;
  }
  
  // Find round numbers near current price
  const baseRound = Math.floor(currentPrice / interval) * interval;
  for (let i = -3; i <= 3; i++) {
    const roundPrice = baseRound + i * interval;
    if (roundPrice > 0) {
      levels.push({
        price: roundPrice,
        type: roundPrice < currentPrice ? 'support' : 'resistance'
      });
    }
  }
  
  return levels;
}

function detectVolumeLevels(data: CandleData[]): { price: number; type: 'support' | 'resistance' }[] {
  const levels: { price: number; type: 'support' | 'resistance' }[] = [];
  const currentPrice = data[data.length - 1].close;
  
  // Simple volume profile - find high volume price levels
  const priceVolume: Map<number, number> = new Map();
  const pricePrecision = currentPrice > 100 ? 1 : currentPrice > 10 ? 0.1 : 0.01;
  
  for (const candle of data.slice(-100)) {
    const avgPrice = Math.round((candle.high + candle.low) / 2 / pricePrecision) * pricePrecision;
    const vol = candle.volume || 0;
    priceVolume.set(avgPrice, (priceVolume.get(avgPrice) || 0) + vol);
  }
  
  // Find top volume levels
  const sortedLevels = [...priceVolume.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  for (const [price] of sortedLevels) {
    levels.push({
      price,
      type: price < currentPrice ? 'support' : 'resistance'
    });
  }
  
  return levels;
}

function countTouches(data: CandleData[], price: number, tolerance: number): number {
  let touches = 0;
  for (const candle of data) {
    if (Math.abs(candle.high - price) <= tolerance || Math.abs(candle.low - price) <= tolerance) {
      touches++;
    }
  }
  return touches;
}

// ==========================================================
// FIBONACCI CONFLUENCE - تلاقي فيبوناتشي
// ==========================================================

export interface FibonacciLevel {
  level: number;
  price: number;
  type: 'retracement' | 'extension';
  strength: number;
}

export interface FibonacciConfluenceResult {
  levels: FibonacciLevel[];
  confluenceZones: { price: number; levels: number[]; strength: number }[];
  trend: 'up' | 'down';
  swingHigh: number;
  swingLow: number;
}

/**
 * Fibonacci Confluence Analysis
 * تحليل تلاقي فيبوناتشي - يكتشف مناطق تجمع مستويات فيبوناتشي
 */
export function calculateFibonacciConfluence(data: CandleData[]): FibonacciConfluenceResult {
  const emptyResult: FibonacciConfluenceResult = {
    levels: [],
    confluenceZones: [],
    trend: 'up',
    swingHigh: 0,
    swingLow: 0
  };
  
  if (data.length < 30) return emptyResult;
  
  // Find significant swing high and low
  const { swingHigh, swingLow, trend } = findSwingPoints(data);
  
  if (swingHigh === 0 || swingLow === 0) return emptyResult;
  
  const range = swingHigh - swingLow;
  const levels: FibonacciLevel[] = [];
  
  // Fibonacci ratios
  const retracementRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const extensionRatios = [1.272, 1.414, 1.618, 2.0, 2.618];
  
  // Calculate retracement levels
  for (const ratio of retracementRatios) {
    const price = trend === 'up' 
      ? swingHigh - range * ratio 
      : swingLow + range * ratio;
    
    levels.push({
      level: ratio,
      price,
      type: 'retracement',
      strength: ratio === 0.618 ? 10 : ratio === 0.5 ? 8 : ratio === 0.382 ? 7 : 5
    });
  }
  
  // Calculate extension levels
  for (const ratio of extensionRatios) {
    const price = trend === 'up'
      ? swingLow + range * ratio
      : swingHigh - range * ratio;
    
    levels.push({
      level: ratio,
      price,
      type: 'extension',
      strength: ratio === 1.618 ? 9 : ratio === 1.272 ? 7 : 5
    });
  }
  
  // Find confluence zones (where multiple Fib levels cluster)
  const tolerance = range * 0.02;
  const confluenceZones: { price: number; levels: number[]; strength: number }[] = [];
  const visited = new Set<number>();
  
  for (let i = 0; i < levels.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster: number[] = [levels[i].level];
    let sumPrice = levels[i].price;
    let sumStrength = levels[i].strength;
    visited.add(i);
    
    for (let j = i + 1; j < levels.length; j++) {
      if (visited.has(j)) continue;
      
      if (Math.abs(levels[i].price - levels[j].price) <= tolerance) {
        cluster.push(levels[j].level);
        sumPrice += levels[j].price;
        sumStrength += levels[j].strength;
        visited.add(j);
      }
    }
    
    if (cluster.length >= 2) {
      confluenceZones.push({
        price: sumPrice / cluster.length,
        levels: cluster,
        strength: Math.min(10, sumStrength / cluster.length + cluster.length)
      });
    }
  }
  
  confluenceZones.sort((a, b) => b.strength - a.strength);
  
  return {
    levels,
    confluenceZones: confluenceZones.slice(0, 5),
    trend,
    swingHigh,
    swingLow
  };
}

function findSwingPoints(data: CandleData[]): { swingHigh: number; swingLow: number; trend: 'up' | 'down' } {
  let swingHigh = data[0].high;
  let swingLow = data[0].low;
  let highIdx = 0;
  let lowIdx = 0;
  
  // Find highest high and lowest low in recent data
  const lookback = Math.min(100, data.length);
  for (let i = data.length - lookback; i < data.length; i++) {
    if (data[i].high > swingHigh) {
      swingHigh = data[i].high;
      highIdx = i;
    }
    if (data[i].low < swingLow) {
      swingLow = data[i].low;
      lowIdx = i;
    }
  }
  
  const trend = highIdx > lowIdx ? 'up' : 'down';
  
  return { swingHigh, swingLow, trend };
}

// ==========================================================
// PIVOT POINTS - نقاط الارتكاز
// ==========================================================

export interface PivotPointResult {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  type: 'standard' | 'fibonacci' | 'camarilla' | 'woodie';
  timeframe: string;
}

export interface PivotConfluenceResult {
  pivots: PivotPointResult[];
  confluenceZones: { price: number; pivotTypes: string[]; strength: number }[];
  currentPosition: 'above_pp' | 'below_pp' | 'at_pp';
}

/**
 * Multi-Pivot Point Confluence
 * تلاقي نقاط الارتكاز المتعددة - يحسب 4 أنواع من نقاط الارتكاز
 */
export function calculatePivotConfluence(data: CandleData[]): PivotConfluenceResult {
  const emptyResult: PivotConfluenceResult = {
    pivots: [],
    confluenceZones: [],
    currentPosition: 'at_pp'
  };
  
  if (data.length < 2) return emptyResult;
  
  // Use previous candle for pivot calculation
  const prevCandle = data[data.length - 2];
  const currentPrice = data[data.length - 1].close;
  
  const high = prevCandle.high;
  const low = prevCandle.low;
  const close = prevCandle.close;
  const range = high - low;
  
  const pivots: PivotPointResult[] = [];
  
  // 1. Standard Pivot Points
  const ppStd = (high + low + close) / 3;
  pivots.push({
    pp: ppStd,
    r1: 2 * ppStd - low,
    r2: ppStd + range,
    r3: high + 2 * (ppStd - low),
    s1: 2 * ppStd - high,
    s2: ppStd - range,
    s3: low - 2 * (high - ppStd),
    type: 'standard',
    timeframe: 'daily'
  });
  
  // 2. Fibonacci Pivot Points
  pivots.push({
    pp: ppStd,
    r1: ppStd + range * 0.382,
    r2: ppStd + range * 0.618,
    r3: ppStd + range * 1.0,
    s1: ppStd - range * 0.382,
    s2: ppStd - range * 0.618,
    s3: ppStd - range * 1.0,
    type: 'fibonacci',
    timeframe: 'daily'
  });
  
  // 3. Camarilla Pivot Points
  pivots.push({
    pp: ppStd,
    r1: close + range * 1.1 / 12,
    r2: close + range * 1.1 / 6,
    r3: close + range * 1.1 / 4,
    s1: close - range * 1.1 / 12,
    s2: close - range * 1.1 / 6,
    s3: close - range * 1.1 / 4,
    type: 'camarilla',
    timeframe: 'daily'
  });
  
  // 4. Woodie Pivot Points
  const ppWoodie = (high + low + 2 * close) / 4;
  pivots.push({
    pp: ppWoodie,
    r1: 2 * ppWoodie - low,
    r2: ppWoodie + range,
    r3: high + 2 * (ppWoodie - low),
    s1: 2 * ppWoodie - high,
    s2: ppWoodie - range,
    s3: low - 2 * (high - ppWoodie),
    type: 'woodie',
    timeframe: 'daily'
  });
  
  // Find confluence zones
  const allLevels: { price: number; type: string; level: string }[] = [];
  for (const pivot of pivots) {
    allLevels.push({ price: pivot.pp, type: pivot.type, level: 'PP' });
    allLevels.push({ price: pivot.r1, type: pivot.type, level: 'R1' });
    allLevels.push({ price: pivot.r2, type: pivot.type, level: 'R2' });
    allLevels.push({ price: pivot.r3, type: pivot.type, level: 'R3' });
    allLevels.push({ price: pivot.s1, type: pivot.type, level: 'S1' });
    allLevels.push({ price: pivot.s2, type: pivot.type, level: 'S2' });
    allLevels.push({ price: pivot.s3, type: pivot.type, level: 'S3' });
  }
  
  // Group by proximity
  const tolerance = range * 0.01;
  const confluenceZones: { price: number; pivotTypes: string[]; strength: number }[] = [];
  const visited = new Set<number>();
  
  for (let i = 0; i < allLevels.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster: string[] = [allLevels[i].type];
    let sumPrice = allLevels[i].price;
    visited.add(i);
    
    for (let j = i + 1; j < allLevels.length; j++) {
      if (visited.has(j)) continue;
      
      if (Math.abs(allLevels[i].price - allLevels[j].price) <= tolerance) {
        if (!cluster.includes(allLevels[j].type)) {
          cluster.push(allLevels[j].type);
        }
        sumPrice += allLevels[j].price;
        visited.add(j);
      }
    }
    
    if (cluster.length >= 2) {
      confluenceZones.push({
        price: sumPrice / (cluster.length + 1),
        pivotTypes: cluster,
        strength: Math.min(10, cluster.length * 2.5)
      });
    }
  }
  
  confluenceZones.sort((a, b) => b.strength - a.strength);
  
  // Determine current position
  const avgPP = pivots.reduce((s, p) => s + p.pp, 0) / pivots.length;
  let currentPosition: 'above_pp' | 'below_pp' | 'at_pp' = 'at_pp';
  if (currentPrice > avgPP * 1.002) {
    currentPosition = 'above_pp';
  } else if (currentPrice < avgPP * 0.998) {
    currentPosition = 'below_pp';
  }
  
  return {
    pivots,
    confluenceZones: confluenceZones.slice(0, 8),
    currentPosition
  };
}

// ==========================================================
// RISK/REWARD ZONES - مناطق المخاطرة والعائد
// ==========================================================

export interface RiskRewardZone {
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  riskPercent: number;
  rewardPercent: number;
  type: 'long' | 'short';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface RiskRewardResult {
  zones: RiskRewardZone[];
  bestLongSetup: RiskRewardZone | null;
  bestShortSetup: RiskRewardZone | null;
  overallQuality: number;
}

/**
 * Risk/Reward Zone Analysis
 * تحليل مناطق المخاطرة والعائد - يحدد أفضل نقاط الدخول مع نسب RR عالية
 */
export function calculateRiskRewardZones(data: CandleData[]): RiskRewardResult {
  const emptyResult: RiskRewardResult = {
    zones: [],
    bestLongSetup: null,
    bestShortSetup: null,
    overallQuality: 0
  };
  
  if (data.length < 50) return emptyResult;
  
  const currentPrice = data[data.length - 1].close;
  const zones: RiskRewardZone[] = [];
  
  // Find support and resistance levels
  const { supports, resistances } = findSRLevels(data);
  
  // Calculate ATR for stop loss sizing
  const atr = calculateATR(data, 14);
  
  // Generate Long setups (buy at support)
  for (const support of supports.slice(0, 3)) {
    if (support < currentPrice) {
      const entryPrice = support;
      const stopLoss = support - atr * 1.5;
      const risk = entryPrice - stopLoss;
      
      // Find nearest resistance levels for take profits
      const validResistances = resistances.filter(r => r > entryPrice).slice(0, 3);
      if (validResistances.length === 0) continue;
      
      const tp1 = validResistances[0] || entryPrice + risk * 1.5;
      const tp2 = validResistances[1] || entryPrice + risk * 2.5;
      const tp3 = validResistances[2] || entryPrice + risk * 4;
      
      const reward = tp1 - entryPrice;
      const rrRatio = reward / risk;
      
      const quality = getRRQuality(rrRatio);
      
      zones.push({
        entryPrice,
        stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: rrRatio,
        riskPercent: (risk / entryPrice) * 100,
        rewardPercent: (reward / entryPrice) * 100,
        type: 'long',
        quality
      });
    }
  }
  
  // Generate Short setups (sell at resistance)
  for (const resistance of resistances.slice(0, 3)) {
    if (resistance > currentPrice) {
      const entryPrice = resistance;
      const stopLoss = resistance + atr * 1.5;
      const risk = stopLoss - entryPrice;
      
      // Find nearest support levels for take profits
      const validSupports = supports.filter(s => s < entryPrice).slice(-3).reverse();
      if (validSupports.length === 0) continue;
      
      const tp1 = validSupports[0] || entryPrice - risk * 1.5;
      const tp2 = validSupports[1] || entryPrice - risk * 2.5;
      const tp3 = validSupports[2] || entryPrice - risk * 4;
      
      const reward = entryPrice - tp1;
      const rrRatio = reward / risk;
      
      const quality = getRRQuality(rrRatio);
      
      zones.push({
        entryPrice,
        stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        riskRewardRatio: rrRatio,
        riskPercent: (risk / entryPrice) * 100,
        rewardPercent: (reward / entryPrice) * 100,
        type: 'short',
        quality
      });
    }
  }
  
  // Sort by RR ratio
  zones.sort((a, b) => b.riskRewardRatio - a.riskRewardRatio);
  
  const longZones = zones.filter(z => z.type === 'long');
  const shortZones = zones.filter(z => z.type === 'short');
  
  const overallQuality = zones.length > 0
    ? zones.reduce((s, z) => s + z.riskRewardRatio, 0) / zones.length * 20
    : 0;
  
  return {
    zones: zones.slice(0, 6),
    bestLongSetup: longZones[0] || null,
    bestShortSetup: shortZones[0] || null,
    overallQuality: Math.min(100, overallQuality)
  };
}

function findSRLevels(data: CandleData[]): { supports: number[]; resistances: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];
  const currentPrice = data[data.length - 1].close;
  
  const lookback = 5;
  for (let i = lookback; i < data.length - lookback; i++) {
    const current = data[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (data[i - j].high >= current.high || data[i + j].high >= current.high) {
        isSwingHigh = false;
      }
      if (data[i - j].low <= current.low || data[i + j].low <= current.low) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) resistances.push(current.high);
    if (isSwingLow) supports.push(current.low);
  }
  
  // Sort and remove duplicates
  // Keep full precision (no forced rounding) for "بالمللي" rendering.
  // De-dup exact repeats only (multiple equal highs/lows can happen on flat markets).
  const uniqueSupports = [...new Set(supports)].sort((a, b) => b - a);
  const uniqueResistances = [...new Set(resistances)].sort((a, b) => a - b);
  
  return {
    supports: uniqueSupports.filter(s => s < currentPrice),
    resistances: uniqueResistances.filter(r => r > currentPrice)
  };
}

function calculateATR(data: CandleData[], period: number): number {
  if (data.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1]?.close || data[i].open;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atrSum += tr;
  }
  
  return atrSum / period;
}

function getRRQuality(rr: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (rr >= 3) return 'excellent';
  if (rr >= 2) return 'good';
  if (rr >= 1.5) return 'fair';
  return 'poor';
}

// ==========================================================
// PATTERN QUALITY SCORE - تقييم جودة الأنماط
// ==========================================================

export interface PatternQuality {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  score: number; // 0-100
  reliability: number; // 0-100
  components: string[];
  description: string;
}

export interface PatternQualityResult {
  patterns: PatternQuality[];
  overallScore: number;
  marketCondition: 'trending' | 'ranging' | 'volatile';
  recommendation: string;
}

/**
 * Pattern Quality Scoring System
 * نظام تقييم جودة الأنماط - يحلل ويقيم قوة الأنماط السعرية
 */
export function analyzePatternQuality(data: CandleData[]): PatternQualityResult {
  const emptyResult: PatternQualityResult = {
    patterns: [],
    overallScore: 0,
    marketCondition: 'ranging',
    recommendation: 'انتظر تأكيد إضافي'
  };
  
  if (data.length < 50) return emptyResult;
  
  const patterns: PatternQuality[] = [];
  
  // 1. Check for Engulfing patterns
  const engulfing = checkEngulfingPattern(data);
  if (engulfing) patterns.push(engulfing);
  
  // 2. Check for Doji patterns
  const doji = checkDojiPattern(data);
  if (doji) patterns.push(doji);
  
  // 3. Check for Pin Bar / Hammer
  const pinBar = checkPinBarPattern(data);
  if (pinBar) patterns.push(pinBar);
  
  // 4. Check for Inside Bar
  const insideBar = checkInsideBarPattern(data);
  if (insideBar) patterns.push(insideBar);
  
  // 5. Check for Three Bar patterns
  const threeBar = checkThreeBarPattern(data);
  if (threeBar) patterns.push(threeBar);
  
  // 6. Check for Double Top/Bottom
  const doublePattern = checkDoublePattern(data);
  if (doublePattern) patterns.push(doublePattern);
  
  // Determine market condition
  const marketCondition = determineMarketCondition(data);
  
  // Calculate overall score
  const overallScore = patterns.length > 0
    ? patterns.reduce((s, p) => s + p.score * p.reliability / 100, 0) / patterns.length
    : 0;
  
  // Generate recommendation
  let recommendation = 'انتظر تأكيد إضافي';
  if (overallScore >= 70) {
    const bullishPatterns = patterns.filter(p => p.type === 'bullish');
    const bearishPatterns = patterns.filter(p => p.type === 'bearish');
    
    if (bullishPatterns.length > bearishPatterns.length) {
      recommendation = 'إشارة شراء قوية - أنماط صعودية متعددة';
    } else if (bearishPatterns.length > bullishPatterns.length) {
      recommendation = 'إشارة بيع قوية - أنماط هبوطية متعددة';
    }
  } else if (overallScore >= 50) {
    recommendation = 'إشارة متوسطة - انتظر تأكيد إضافي';
  }
  
  return {
    patterns: patterns.sort((a, b) => b.score - a.score),
    overallScore: Math.round(overallScore),
    marketCondition,
    recommendation
  };
}

function checkEngulfingPattern(data: CandleData[]): PatternQuality | null {
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  
  const lastBody = Math.abs(last.close - last.open);
  const prevBody = Math.abs(prev.close - prev.open);
  
  // Bullish Engulfing
  if (prev.close < prev.open && last.close > last.open &&
      last.open <= prev.close && last.close >= prev.open &&
      lastBody > prevBody * 1.1) {
    return {
      name: 'Bullish Engulfing',
      type: 'bullish',
      score: 75,
      reliability: 70,
      components: ['شمعة هابطة سابقة', 'شمعة صاعدة ابتلاعية'],
      description: 'نمط ابتلاعي صعودي - إشارة انعكاس قوية'
    };
  }
  
  // Bearish Engulfing
  if (prev.close > prev.open && last.close < last.open &&
      last.open >= prev.close && last.close <= prev.open &&
      lastBody > prevBody * 1.1) {
    return {
      name: 'Bearish Engulfing',
      type: 'bearish',
      score: 75,
      reliability: 70,
      components: ['شمعة صاعدة سابقة', 'شمعة هابطة ابتلاعية'],
      description: 'نمط ابتلاعي هبوطي - إشارة انعكاس قوية'
    };
  }
  
  return null;
}

function checkDojiPattern(data: CandleData[]): PatternQuality | null {
  const last = data[data.length - 1];
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  
  if (range > 0 && body / range < 0.1) {
    const upperWick = last.high - Math.max(last.open, last.close);
    const lowerWick = Math.min(last.open, last.close) - last.low;
    
    let name = 'Doji';
    let type: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (upperWick > lowerWick * 2) {
      name = 'Gravestone Doji';
      type = 'bearish';
    } else if (lowerWick > upperWick * 2) {
      name = 'Dragonfly Doji';
      type = 'bullish';
    }
    
    return {
      name,
      type,
      score: 60,
      reliability: 55,
      components: ['جسم صغير جداً', 'ظلال متوازنة أو غير متوازنة'],
      description: 'نمط دوجي - تردد في السوق'
    };
  }
  
  return null;
}

function checkPinBarPattern(data: CandleData[]): PatternQuality | null {
  const last = data[data.length - 1];
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  
  if (range === 0) return null;
  
  // Hammer / Bullish Pin Bar
  if (lowerWick >= body * 2 && upperWick < body * 0.5 && body / range < 0.3) {
    return {
      name: 'Hammer / Pin Bar',
      type: 'bullish',
      score: 70,
      reliability: 65,
      components: ['ذيل سفلي طويل', 'جسم صغير', 'ذيل علوي قصير'],
      description: 'نمط المطرقة - رفض للأسعار المنخفضة'
    };
  }
  
  // Shooting Star / Bearish Pin Bar
  if (upperWick >= body * 2 && lowerWick < body * 0.5 && body / range < 0.3) {
    return {
      name: 'Shooting Star / Pin Bar',
      type: 'bearish',
      score: 70,
      reliability: 65,
      components: ['ذيل علوي طويل', 'جسم صغير', 'ذيل سفلي قصير'],
      description: 'نمط الشهاب - رفض للأسعار المرتفعة'
    };
  }
  
  return null;
}

function checkInsideBarPattern(data: CandleData[]): PatternQuality | null {
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  
  if (last.high <= prev.high && last.low >= prev.low) {
    return {
      name: 'Inside Bar',
      type: 'neutral',
      score: 55,
      reliability: 60,
      components: ['شمعة داخلية', 'انكماش في النطاق'],
      description: 'نمط الشمعة الداخلية - تجميع قبل حركة قوية'
    };
  }
  
  return null;
}

function checkThreeBarPattern(data: CandleData[]): PatternQuality | null {
  if (data.length < 3) return null;
  
  const c1 = data[data.length - 3];
  const c2 = data[data.length - 2];
  const c3 = data[data.length - 1];
  
  // Morning Star (bullish)
  const c1Bearish = c1.close < c1.open;
  const c2Small = Math.abs(c2.close - c2.open) < Math.abs(c1.close - c1.open) * 0.3;
  const c3Bullish = c3.close > c3.open && c3.close > (c1.open + c1.close) / 2;
  
  if (c1Bearish && c2Small && c3Bullish) {
    return {
      name: 'Morning Star',
      type: 'bullish',
      score: 80,
      reliability: 75,
      components: ['شمعة هابطة كبيرة', 'شمعة صغيرة', 'شمعة صاعدة كبيرة'],
      description: 'نمط نجمة الصباح - انعكاس صعودي قوي'
    };
  }
  
  // Evening Star (bearish)
  const c1Bullish = c1.close > c1.open;
  const c3Bearish = c3.close < c3.open && c3.close < (c1.open + c1.close) / 2;
  
  if (c1Bullish && c2Small && c3Bearish) {
    return {
      name: 'Evening Star',
      type: 'bearish',
      score: 80,
      reliability: 75,
      components: ['شمعة صاعدة كبيرة', 'شمعة صغيرة', 'شمعة هابطة كبيرة'],
      description: 'نمط نجمة المساء - انعكاس هبوطي قوي'
    };
  }
  
  return null;
}

function checkDoublePattern(data: CandleData[]): PatternQuality | null {
  if (data.length < 30) return null;
  
  // Find swing highs and lows
  const swings: { price: number; type: 'high' | 'low'; idx: number }[] = [];
  
  for (let i = 5; i < data.length - 5; i++) {
    let isHigh = true;
    let isLow = true;
    
    for (let j = 1; j <= 5; j++) {
      if (data[i - j].high >= data[i].high || data[i + j].high >= data[i].high) isHigh = false;
      if (data[i - j].low <= data[i].low || data[i + j].low <= data[i].low) isLow = false;
    }
    
    if (isHigh) swings.push({ price: data[i].high, type: 'high', idx: i });
    if (isLow) swings.push({ price: data[i].low, type: 'low', idx: i });
  }
  
  // Check for Double Top
  const highs = swings.filter(s => s.type === 'high').slice(-3);
  if (highs.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const tolerance = h1.price * 0.005;
    
    if (Math.abs(h1.price - h2.price) <= tolerance && h2.idx - h1.idx >= 10) {
      return {
        name: 'Double Top',
        type: 'bearish',
        score: 75,
        reliability: 70,
        components: ['قمتان متقاربتان', 'قاع بينهما'],
        description: 'نمط القمة المزدوجة - انعكاس هبوطي محتمل'
      };
    }
  }
  
  // Check for Double Bottom
  const lows = swings.filter(s => s.type === 'low').slice(-3);
  if (lows.length >= 2) {
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];
    const tolerance = l1.price * 0.005;
    
    if (Math.abs(l1.price - l2.price) <= tolerance && l2.idx - l1.idx >= 10) {
      return {
        name: 'Double Bottom',
        type: 'bullish',
        score: 75,
        reliability: 70,
        components: ['قاعان متقاربان', 'قمة بينهما'],
        description: 'نمط القاع المزدوج - انعكاس صعودي محتمل'
      };
    }
  }
  
  return null;
}

function determineMarketCondition(data: CandleData[]): 'trending' | 'ranging' | 'volatile' {
  if (data.length < 20) return 'ranging';
  
  const recentData = data.slice(-20);
  const closes = recentData.map(d => d.close);
  
  // Calculate trend
  const firstHalf = closes.slice(0, 10);
  const secondHalf = closes.slice(10);
  const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const trendStrength = Math.abs(secondAvg - firstAvg) / firstAvg;
  
  // Calculate volatility
  let sumSq = 0;
  const mean = closes.reduce((s, v) => s + v, 0) / closes.length;
  for (const c of closes) {
    sumSq += (c - mean) ** 2;
  }
  const stdDev = Math.sqrt(sumSq / closes.length);
  const volatility = stdDev / mean;
  
  if (volatility > 0.03) return 'volatile';
  if (trendStrength > 0.02) return 'trending';
  return 'ranging';
}

// ==========================================================
// EXPORTS
// ==========================================================

export const ConfluenceIndicators = {
  detectConfluenceZones,
  calculateFibonacciConfluence,
  calculatePivotConfluence,
  calculateRiskRewardZones,
  analyzePatternQuality
};

export default ConfluenceIndicators;
