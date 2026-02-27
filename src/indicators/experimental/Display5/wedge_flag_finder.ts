/**
 * Wedge and Flag Finder (Multi-Zigzag)
 * Converted from Pine Script by Trendoscope
 * 
 * Features:
 * 1. Multi-level Zigzag Detection
 * 2. Wedge Pattern Recognition (5 or 6 pivots)
 * 3. Flag Pattern Recognition
 * 4. Trend Line Drawing
 */

export interface ZigzagPivot {
  index: number;
  price: number;
  direction: 1 | -1; // 1 = high, -1 = low
}

export interface WedgePattern {
  type: 'wedge' | 'flag';
  direction: 'bullish' | 'bearish';
  pivots: ZigzagPivot[];
  trendLines: {
    upper: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
    lower: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  };
  angle1: number;
  angle2: number;
  angleDiff: number;
  zigzagLevel: number;
}

export interface WedgeFlagResult {
  patterns: WedgePattern[];
  zigzags: {
    level: number;
    pivots: ZigzagPivot[];
  }[];
}

// Helper: Calculate angle between two points
function calculateAngle(startPrice: number, endPrice: number, bars: number, atr: number): number {
  const rad2degree = 180 / Math.PI;
  return rad2degree * Math.atan((startPrice - endPrice) / (2 * atr));
}

// Helper: Calculate ATR for angle normalization
function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const result = new Array(highs.length).fill(0);
  const tr = new Array(highs.length).fill(0);
  
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }
  
  // EMA of TR
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  result[period - 1] = sum / period;
  
  for (let i = period; i < highs.length; i++) {
    result[i] = (tr[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  
  return result;
}

// Zigzag Detection
function detectZigzag(highs: number[], lows: number[], length: number): ZigzagPivot[] {
  const pivots: ZigzagPivot[] = [];
  const len = highs.length;
  
  if (len < length * 2 + 1) return pivots;
  
  // Find pivot highs and lows
  const pivotHighs: { index: number; price: number }[] = [];
  const pivotLows: { index: number; price: number }[] = [];
  
  for (let i = length; i < len - length; i++) {
    // Check for pivot high
    let isPivotHigh = true;
    for (let j = 1; j <= length; j++) {
      if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) {
        isPivotHigh = false;
        break;
      }
    }
    if (isPivotHigh) {
      pivotHighs.push({ index: i, price: highs[i] });
    }
    
    // Check for pivot low
    let isPivotLow = true;
    for (let j = 1; j <= length; j++) {
      if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) {
        isPivotLow = false;
        break;
      }
    }
    if (isPivotLow) {
      pivotLows.push({ index: i, price: lows[i] });
    }
  }
  
  // Merge and sort by index
  const allPivots: { index: number; price: number; dir: 1 | -1 }[] = [];
  pivotHighs.forEach(p => allPivots.push({ ...p, dir: 1 }));
  pivotLows.forEach(p => allPivots.push({ ...p, dir: -1 }));
  allPivots.sort((a, b) => a.index - b.index);
  
  // Build zigzag by alternating highs and lows
  if (allPivots.length === 0) return pivots;
  
  let lastDir = allPivots[0].dir;
  pivots.push({ index: allPivots[0].index, price: allPivots[0].price, direction: lastDir });
  
  for (let i = 1; i < allPivots.length; i++) {
    const curr = allPivots[i];
    
    if (curr.dir !== lastDir) {
      // Direction changed - add new pivot
      pivots.push({ index: curr.index, price: curr.price, direction: curr.dir });
      lastDir = curr.dir;
    } else {
      // Same direction - update if better
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

// Check if pattern is a valid wedge
function isValidWedge(
  pivots: ZigzagPivot[],
  highs: number[],
  lows: number[],
  atr: number[]
): { valid: boolean; isFlag: boolean; angle1: number; angle2: number; trendLines: WedgePattern['trendLines'] } | null {
  
  if (pivots.length < 5) return null;
  
  // Get pivots (most recent first in our array, so reverse logic)
  const a = pivots[0]; // Most recent
  const b = pivots[1];
  const c = pivots[2];
  const d = pivots[3];
  const e = pivots[4];
  const f = pivots.length >= 6 ? pivots[5] : e;
  
  // Calculate ratios
  const aRatio = Math.abs(a.price - b.price) / Math.abs(b.price - c.price);
  const bRatio = Math.abs(b.price - c.price) / Math.abs(c.price - d.price);
  const cRatio = Math.abs(c.price - d.price) / Math.abs(d.price - e.price);
  
  // Upper line: through odd pivots (a, c, e)
  // Lower line: through even pivots (b, d, f)
  const dir = a.price > b.price ? 1 : -1;
  
  // Calculate trend lines
  const upperSlope = (a.price - e.price) / (a.index - e.index);
  const lowerSlope = (b.price - (pivots.length >= 6 ? f.price : d.price)) / 
                     (b.index - (pivots.length >= 6 ? f.index : d.index));
  
  // Get ATR for angle calculation
  const avgAtr = atr[a.index] || (a.price * 0.01);
  const bars = a.index - e.index;
  
  const upperStart = e.price;
  const upperEnd = a.price;
  const lowerStart = pivots.length >= 6 ? f.price : d.price;
  const lowerEnd = b.price;
  
  const angle1 = calculateAngle(upperEnd, upperStart, bars, avgAtr);
  const angle2 = calculateAngle(lowerEnd, lowerStart, bars, avgAtr);
  
  const l1Diff = Math.abs(upperStart - upperEnd);
  const l2Diff = Math.abs(lowerStart - lowerEnd);
  
  // Type 1 Wedge: Contracting from top
  const isType1 = aRatio >= 1 && bRatio < 1 && cRatio >= 1 && l1Diff < l2Diff;
  // Type 2 Wedge: Contracting from bottom  
  const isType2 = aRatio < 1 && bRatio >= 1 && cRatio < 1 && l1Diff > l2Diff;
  
  const isWedge = isType1 || isType2;
  
  if (!isWedge) return null;
  
  // Verify price stays within trendlines
  const startBar = Math.min(e.index, pivots.length >= 6 ? f.index : d.index);
  const endBar = a.index;
  
  for (let i = startBar; i <= endBar; i++) {
    const l1Price = e.price + upperSlope * (i - e.index);
    const l2Price = (pivots.length >= 6 ? f.price : d.price) + lowerSlope * (i - (pivots.length >= 6 ? f.index : d.index));
    
    const h = highs[i];
    const l = lows[i];
    
    if (h < Math.min(l1Price, l2Price) || l > Math.max(l1Price, l2Price)) {
      return null;
    }
  }
  
  // Check for flag pattern (continuation)
  let isFlag = false;
  const angleDiff = Math.abs(angle1 - angle2);
  if (angleDiff < 15) {
    isFlag = true;
  }
  
  return {
    valid: true,
    isFlag,
    angle1,
    angle2,
    trendLines: {
      upper: { startIndex: e.index, startPrice: e.price, endIndex: a.index, endPrice: a.price },
      lower: { 
        startIndex: pivots.length >= 6 ? f.index : d.index, 
        startPrice: pivots.length >= 6 ? f.price : d.price, 
        endIndex: b.index, 
        endPrice: b.price 
      }
    }
  };
}

export interface WedgeFlagConfig {
  zigzagLengths?: number[];
  wedgeSize?: 5 | 6;
  allowWedge?: boolean;
  allowFlag?: boolean;
  minAngleDiff?: number;
  maxAngleDiff?: number;
}

export function detectWedgesAndFlags(
  closes: number[],
  highs: number[],
  lows: number[],
  config: WedgeFlagConfig = {}
): WedgeFlagResult {
  const {
    zigzagLengths = [5, 8, 13, 21],
    wedgeSize = 5,
    allowWedge = true,
    allowFlag = true,
    minAngleDiff = 5,
    maxAngleDiff = 20
  } = config;

  const patterns: WedgePattern[] = [];
  const zigzags: WedgeFlagResult['zigzags'] = [];
  
  // Calculate ATR for angle normalization
  const atr = calculateATR(highs, lows, closes, 14);
  
  // Detect zigzag at each level
  zigzagLengths.forEach((length, levelIdx) => {
    const pivots = detectZigzag(highs, lows, length);
    
    if (pivots.length >= wedgeSize) {
      zigzags.push({ level: levelIdx + 1, pivots: pivots.slice(0, 20) }); // Keep last 20 pivots
      
      // Scan for patterns starting from most recent pivots
      for (let startIdx = 0; startIdx <= pivots.length - wedgeSize; startIdx++) {
        const patternPivots = pivots.slice(startIdx, startIdx + wedgeSize);
        
        const result = isValidWedge(patternPivots, highs, lows, atr);
        
        if (result && result.valid) {
          const angleDiff = Math.abs(result.angle1 - result.angle2);
          
          // Apply angle filters
          if (angleDiff >= minAngleDiff && angleDiff <= maxAngleDiff) {
            const isFlag = result.isFlag;
            
            if ((isFlag && allowFlag) || (!isFlag && allowWedge)) {
              // Determine direction
              const firstPivot = patternPivots[patternPivots.length - 1];
              const lastPivot = patternPivots[0];
              const direction: 'bullish' | 'bearish' = lastPivot.price > firstPivot.price ? 'bullish' : 'bearish';
              
              // Check for duplicate patterns
              const isDuplicate = patterns.some(p => 
                Math.abs(p.pivots[0].index - patternPivots[0].index) < 5 &&
                p.type === (isFlag ? 'flag' : 'wedge')
              );
              
              if (!isDuplicate) {
                patterns.push({
                  type: isFlag ? 'flag' : 'wedge',
                  direction,
                  pivots: patternPivots,
                  trendLines: result.trendLines,
                  angle1: result.angle1,
                  angle2: result.angle2,
                  angleDiff,
                  zigzagLevel: levelIdx + 1
                });
              }
            }
          }
        }
        
        // Only find first pattern per zigzag level
        if (patterns.filter(p => p.zigzagLevel === levelIdx + 1).length >= 2) break;
      }
    }
  });

  return { patterns, zigzags };
}
