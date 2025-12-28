/**
 * Recursive Reversal Chart Patterns (RRCP)
 * Based on Trendoscope® indicator
 * 
 * Features:
 * 1. Multi-level Zigzag detection
 * 2. Double Tap (Double Top/Bottom) detection
 * 3. Triple Tap (Triple Top/Bottom) detection
 * 4. Cup and Handle detection
 * 5. Head and Shoulders detection
 * 6. Divergence analysis (RSI, Volume)
 */

export interface ReversalPattern {
  type: 'double_tap' | 'triple_tap' | 'cup_handle' | 'head_shoulders';
  direction: 'bullish' | 'bearish';
  pivots: { index: number; price: number }[];
  zigzagLevel: number;
  confidence: number;
  hasDivergence: boolean;
  targets: number[];
  stopLoss: number;
}

export interface RRCPResult {
  patterns: ReversalPattern[];
  zigzagLevels: {
    level: number;
    pivots: { index: number; price: number; direction: 1 | -1 }[];
  }[];
}

// Helper: Multi-level Zigzag
function detectMultiLevelZigzag(
  highs: number[],
  lows: number[],
  baseLength: number,
  maxLevels: number = 3
): { level: number; pivots: { index: number; price: number; direction: 1 | -1 }[] }[] {
  const levels: { level: number; pivots: { index: number; price: number; direction: 1 | -1 }[] }[] = [];
  
  for (let level = 0; level < maxLevels; level++) {
    const length = baseLength * Math.pow(1.5, level); // Increase length for each level
    const pivots = detectZigzag(highs, lows, Math.round(length));
    
    if (pivots.length >= 4) {
      levels.push({ level, pivots });
    }
  }
  
  return levels;
}

// Helper: Zigzag detection
function detectZigzag(
  highs: number[],
  lows: number[],
  length: number
): { index: number; price: number; direction: 1 | -1 }[] {
  const pivots: { index: number; price: number; direction: 1 | -1 }[] = [];
  const len = highs.length;
  
  if (len < length * 2 + 1) return pivots;
  
  // Find pivot highs and lows
  const pivotHighs: { index: number; price: number }[] = [];
  const pivotLows: { index: number; price: number }[] = [];
  
  for (let i = length; i < len - length; i++) {
    // Pivot high
    let isPivotHigh = true;
    for (let j = 1; j <= length; j++) {
      if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) {
        isPivotHigh = false;
        break;
      }
    }
    if (isPivotHigh) pivotHighs.push({ index: i, price: highs[i] });
    
    // Pivot low
    let isPivotLow = true;
    for (let j = 1; j <= length; j++) {
      if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) {
        isPivotLow = false;
        break;
      }
    }
    if (isPivotLow) pivotLows.push({ index: i, price: lows[i] });
  }
  
  // Merge and build zigzag
  const allPivots: { index: number; price: number; dir: 1 | -1 }[] = [];
  pivotHighs.forEach(p => allPivots.push({ ...p, dir: 1 }));
  pivotLows.forEach(p => allPivots.push({ ...p, dir: -1 }));
  allPivots.sort((a, b) => a.index - b.index);
  
  if (allPivots.length === 0) return pivots;
  
  let lastDir = allPivots[0].dir;
  pivots.push({ index: allPivots[0].index, price: allPivots[0].price, direction: lastDir });
  
  for (let i = 1; i < allPivots.length; i++) {
    const curr = allPivots[i];
    if (curr.dir !== lastDir) {
      pivots.push({ index: curr.index, price: curr.price, direction: curr.dir });
      lastDir = curr.dir;
    } else {
      const lastPivot = pivots[pivots.length - 1];
      if ((curr.dir === 1 && curr.price > lastPivot.price) ||
          (curr.dir === -1 && curr.price < lastPivot.price)) {
        lastPivot.index = curr.index;
        lastPivot.price = curr.price;
      }
    }
  }
  
  return pivots;
}

// Helper: Check for RSI divergence
function checkDivergence(
  pivots: { index: number; price: number }[],
  rsi: number[],
  isBullish: boolean
): boolean {
  if (pivots.length < 2) return false;
  
  const p1 = pivots[pivots.length - 2];
  const p2 = pivots[pivots.length - 1];
  
  const priceDiff = p2.price - p1.price;
  const rsiDiff = rsi[p2.index] - rsi[p1.index];
  
  if (isBullish) {
    // Bullish divergence: price lower low, RSI higher low
    return priceDiff < 0 && rsiDiff > 0;
  } else {
    // Bearish divergence: price higher high, RSI lower high
    return priceDiff > 0 && rsiDiff < 0;
  }
}

// Pattern: Double Tap (Double Top/Bottom)
function scanDoubleTap(
  pivots: { index: number; price: number; direction: 1 | -1 }[],
  errorPercent: number
): { valid: boolean; isBullish: boolean; pivots: { index: number; price: number }[] } | null {
  if (pivots.length < 4) return null;
  
  const a = pivots[pivots.length - 1];
  const b = pivots[pivots.length - 2];
  const c = pivots[pivots.length - 3];
  const d = pivots[pivots.length - 4];
  
  // Check if it's a double top or bottom pattern
  const isBullish = a.direction === -1;
  
  if (isBullish) {
    // Double Bottom: two lows at similar levels
    const priceDiff = Math.abs(a.price - c.price);
    const avgPrice = (a.price + c.price) / 2;
    const error = (priceDiff / avgPrice) * 100;
    
    if (error <= errorPercent && b.price > a.price && b.price > c.price) {
      return { valid: true, isBullish: true, pivots: [d, c, b, a].map(p => ({ index: p.index, price: p.price })) };
    }
  } else {
    // Double Top: two highs at similar levels
    const priceDiff = Math.abs(a.price - c.price);
    const avgPrice = (a.price + c.price) / 2;
    const error = (priceDiff / avgPrice) * 100;
    
    if (error <= errorPercent && b.price < a.price && b.price < c.price) {
      return { valid: true, isBullish: false, pivots: [d, c, b, a].map(p => ({ index: p.index, price: p.price })) };
    }
  }
  
  return null;
}

// Pattern: Triple Tap
function scanTripleTap(
  pivots: { index: number; price: number; direction: 1 | -1 }[],
  errorPercent: number
): { valid: boolean; isBullish: boolean; pivots: { index: number; price: number }[] } | null {
  if (pivots.length < 6) return null;
  
  const recent = pivots.slice(-6);
  const isBullish = recent[5].direction === -1;
  
  if (isBullish) {
    // Triple Bottom
    const lows = [recent[1], recent[3], recent[5]];
    const avgLow = lows.reduce((sum, p) => sum + p.price, 0) / 3;
    const maxError = Math.max(...lows.map(p => Math.abs(p.price - avgLow) / avgLow * 100));
    
    if (maxError <= errorPercent) {
      return { valid: true, isBullish: true, pivots: recent.map(p => ({ index: p.index, price: p.price })) };
    }
  } else {
    // Triple Top
    const highs = [recent[1], recent[3], recent[5]];
    const avgHigh = highs.reduce((sum, p) => sum + p.price, 0) / 3;
    const maxError = Math.max(...highs.map(p => Math.abs(p.price - avgHigh) / avgHigh * 100));
    
    if (maxError <= errorPercent) {
      return { valid: true, isBullish: false, pivots: recent.map(p => ({ index: p.index, price: p.price })) };
    }
  }
  
  return null;
}

// Pattern: Cup and Handle
function scanCupHandle(
  pivots: { index: number; price: number; direction: 1 | -1 }[],
  shoulderStart: number,
  shoulderEnd: number
): { valid: boolean; isBullish: boolean; pivots: { index: number; price: number }[] } | null {
  if (pivots.length < 6) return null;
  
  const recent = pivots.slice(-6);
  const isBullish = recent[5].direction === -1;
  
  // Cup: U-shaped bottom with handle
  if (isBullish) {
    const rim1 = recent[0];
    const bottom = recent[2];
    const rim2 = recent[4];
    const handle = recent[5];
    
    const handleDepth = Math.abs(rim2.price - handle.price) / Math.abs(rim2.price - bottom.price);
    
    if (handleDepth >= shoulderStart && handleDepth <= shoulderEnd) {
      return { valid: true, isBullish: true, pivots: recent.map(p => ({ index: p.index, price: p.price })) };
    }
  }
  
  return null;
}

// Pattern: Head and Shoulders
function scanHeadShoulders(
  pivots: { index: number; price: number; direction: 1 | -1 }[],
  shoulderStart: number,
  shoulderEnd: number
): { valid: boolean; isBullish: boolean; pivots: { index: number; price: number }[] } | null {
  if (pivots.length < 6) return null;
  
  const recent = pivots.slice(-6);
  const isBullish = recent[5].direction === -1;
  
  if (!isBullish) {
    // H&S Top: shoulder - head - shoulder
    const ls = recent[1]; // Left shoulder
    const head = recent[3];
    const rs = recent[5]; // Right shoulder
    
    const lsRatio = ls.price / head.price;
    const rsRatio = rs.price / head.price;
    
    if (lsRatio >= shoulderStart && lsRatio <= shoulderEnd &&
        rsRatio >= shoulderStart && rsRatio <= shoulderEnd) {
      return { valid: true, isBullish: false, pivots: recent.map(p => ({ index: p.index, price: p.price })) };
    }
  } else {
    // Inverse H&S
    const ls = recent[1];
    const head = recent[3];
    const rs = recent[5];
    
    const lsRatio = head.price / ls.price;
    const rsRatio = head.price / rs.price;
    
    if (lsRatio >= shoulderStart && lsRatio <= shoulderEnd &&
        rsRatio >= shoulderStart && rsRatio <= shoulderEnd) {
      return { valid: true, isBullish: true, pivots: recent.map(p => ({ index: p.index, price: p.price })) };
    }
  }
  
  return null;
}

// Calculate RSI
function calculateRSI(closes: number[], period: number): number[] {
  const result = new Array(closes.length).fill(0);
  let gains = 0, losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
  
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
  }
  
  return result;
}

export interface RRCPConfig {
  zigzagLength?: number;
  errorPercent?: number;
  shoulderStart?: number;
  shoulderEnd?: number;
  enableDoubleTap?: boolean;
  enableTripleTap?: boolean;
  enableCupHandle?: boolean;
  enableHeadShoulders?: boolean;
  riskAdjustment?: number;
}

export function detectReversalPatterns(
  closes: number[],
  highs: number[],
  lows: number[],
  config: RRCPConfig = {}
): RRCPResult {
  const {
    zigzagLength = 8,
    errorPercent = 13,
    shoulderStart = 0.1,
    shoulderEnd = 0.5,
    enableDoubleTap = true,
    enableTripleTap = true,
    enableCupHandle = false,
    enableHeadShoulders = false,
    riskAdjustment = 13
  } = config;

  const patterns: ReversalPattern[] = [];
  
  // Calculate RSI for divergence
  const rsi = calculateRSI(closes, 14);
  
  // Detect multi-level zigzag
  const zigzagLevels = detectMultiLevelZigzag(highs, lows, zigzagLength, 3);
  
  // Scan each zigzag level for patterns
  zigzagLevels.forEach(zz => {
    const pivots = zz.pivots;
    
    // Double Tap
    if (enableDoubleTap) {
      const result = scanDoubleTap(pivots, errorPercent);
      if (result && result.valid) {
        const hasDivergence = checkDivergence(result.pivots, rsi, result.isBullish);
        const lastPivot = result.pivots[result.pivots.length - 1];
        const neckline = result.pivots[result.pivots.length - 2];
        const range = Math.abs(lastPivot.price - neckline.price);
        
        patterns.push({
          type: 'double_tap',
          direction: result.isBullish ? 'bullish' : 'bearish',
          pivots: result.pivots,
          zigzagLevel: zz.level,
          confidence: hasDivergence ? 0.9 : 0.7,
          hasDivergence,
          targets: [
            lastPivot.price + (result.isBullish ? 1 : -1) * range * 1.0,
            lastPivot.price + (result.isBullish ? 1 : -1) * range * 1.618
          ],
          stopLoss: lastPivot.price - (result.isBullish ? 1 : -1) * range * (riskAdjustment / 100)
        });
      }
    }
    
    // Triple Tap
    if (enableTripleTap) {
      const result = scanTripleTap(pivots, errorPercent);
      if (result && result.valid) {
        const hasDivergence = checkDivergence(result.pivots, rsi, result.isBullish);
        const lastPivot = result.pivots[result.pivots.length - 1];
        const neckline = result.pivots[result.pivots.length - 2];
        const range = Math.abs(lastPivot.price - neckline.price);
        
        patterns.push({
          type: 'triple_tap',
          direction: result.isBullish ? 'bullish' : 'bearish',
          pivots: result.pivots,
          zigzagLevel: zz.level,
          confidence: hasDivergence ? 0.95 : 0.8,
          hasDivergence,
          targets: [
            lastPivot.price + (result.isBullish ? 1 : -1) * range * 1.0,
            lastPivot.price + (result.isBullish ? 1 : -1) * range * 2.0
          ],
          stopLoss: lastPivot.price - (result.isBullish ? 1 : -1) * range * (riskAdjustment / 100)
        });
      }
    }
    
    // Cup and Handle
    if (enableCupHandle) {
      const result = scanCupHandle(pivots, shoulderStart, shoulderEnd);
      if (result && result.valid) {
        const lastPivot = result.pivots[result.pivots.length - 1];
        const rim = result.pivots[result.pivots.length - 2];
        const range = Math.abs(rim.price - lastPivot.price);
        
        patterns.push({
          type: 'cup_handle',
          direction: result.isBullish ? 'bullish' : 'bearish',
          pivots: result.pivots,
          zigzagLevel: zz.level,
          confidence: 0.75,
          hasDivergence: false,
          targets: [lastPivot.price + range * 1.5],
          stopLoss: lastPivot.price - range * (riskAdjustment / 100)
        });
      }
    }
    
    // Head and Shoulders
    if (enableHeadShoulders) {
      const result = scanHeadShoulders(pivots, shoulderStart, shoulderEnd);
      if (result && result.valid) {
        const lastPivot = result.pivots[result.pivots.length - 1];
        const neckline = result.pivots[result.pivots.length - 2];
        const range = Math.abs(lastPivot.price - neckline.price);
        
        patterns.push({
          type: 'head_shoulders',
          direction: result.isBullish ? 'bullish' : 'bearish',
          pivots: result.pivots,
          zigzagLevel: zz.level,
          confidence: 0.85,
          hasDivergence: false,
          targets: [lastPivot.price + (result.isBullish ? 1 : -1) * range * 1.5],
          stopLoss: lastPivot.price - (result.isBullish ? 1 : -1) * range * (riskAdjustment / 100)
        });
      }
    }
  });

  return { patterns, zigzagLevels };
}
