/**
 * Wedge and Flag Finder (Multi-zigzag) [Trendoscope]
 * Converted from Pine Script
 * 
 * Detects wedge and flag patterns using multiple zigzag configurations.
 * Uses pivot point analysis and trend line validation.
 */

import { CandleData } from "@/components/charts/TradingChart";

// ============ TYPES ============

export interface ZigZagPivot {
  price: number;
  bar: number;
  timestamp: number;
  direction: 1 | -1; // 1 = high pivot, -1 = low pivot
  ratio: number;
}

export interface TrendLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  timestamp1: number;
  timestamp2: number;
}

export interface WedgePattern {
  type: 'wedge';
  wedgeType: 1 | 2; // Type 1: contracting from above, Type 2: contracting from below
  direction: 'bullish' | 'bearish';
  pivots: ZigZagPivot[];
  upperTrendLine: TrendLine;
  lowerTrendLine: TrendLine;
  angleDiff: number;
  startBar: number;
  endBar: number;
  startTime: number;
  endTime: number;
  color: string;
  zigzagLevel: number;
}

export interface FlagPattern {
  type: 'flag';
  direction: 'bullish' | 'bearish';
  pivots: ZigZagPivot[];
  poleLine: TrendLine;
  upperTrendLine: TrendLine;
  lowerTrendLine: TrendLine;
  flagRatio: number;
  startBar: number;
  endBar: number;
  startTime: number;
  endTime: number;
  color: string;
  zigzagLevel: number;
}

export type DetectedPattern = WedgePattern | FlagPattern;

export interface WedgeFlagConfig {
  wedgeSize: 5 | 6;
  theme: 'dark' | 'light';
  avoidOverlap: boolean;
  drawZigzag: boolean;
  
  // Zigzag levels
  zigzag1: { enabled: boolean; length: number };
  zigzag2: { enabled: boolean; length: number };
  zigzag3: { enabled: boolean; length: number };
  zigzag4: { enabled: boolean; length: number };
  
  // Pattern filters
  allowFlag: boolean;
  allowWedge: boolean;
  
  // Angle filters
  applyAngleDiff: boolean;
  minAngleDiff: number;
  maxAngleDiff: number;
  applyAngleLimit: boolean;
  minAngleRange: number;
  maxAngleRange: number;
}

export const defaultWedgeFlagConfig: WedgeFlagConfig = {
  wedgeSize: 5,
  theme: 'dark',
  avoidOverlap: true,
  drawZigzag: true,
  
  zigzag1: { enabled: true, length: 5 },
  zigzag2: { enabled: true, length: 8 },
  zigzag3: { enabled: true, length: 13 },
  zigzag4: { enabled: true, length: 21 },
  
  allowFlag: true,
  allowWedge: true,
  
  applyAngleDiff: false,
  minAngleDiff: 5,
  maxAngleDiff: 20,
  applyAngleLimit: false,
  minAngleRange: 10,
  maxAngleRange: 60
};

// Theme colors
const darkThemeColors = [
  '#fbf46d', '#8dba51', '#4a9ff5', '#ff998c', '#ff9500',
  '#00ead3', '#a799b7', '#ffd271', '#77d970', '#5f81e4',
  '#eb92be', '#c68b59', '#c89595', '#c4b6b6', '#ffbe0f',
  '#c0e218', '#998ceb', '#ce1f6b', '#fb3640', '#c2ffd9',
  '#ffdc5', '#79b4b7'
];

const lightThemeColors = [
  '#3d56b2', '#39a388', '#fa1e0e', '#a9333a', '#e1578a',
  '#3e7c17', '#f4a442', '#864879', '#719fb0', '#aa2ee6',
  '#a12568', '#bd2000', '#105652', '#c85c5c', '#3f3351',
  '#726a95', '#ab6d23', '#f78812', '#334756', '#0c7b93',
  '#c32bad'
];

// ============ ZIGZAG CALCULATION ============

/**
 * Calculate ZigZag pivots
 */
function calculateZigZag(data: CandleData[], length: number): ZigZagPivot[] {
  const pivots: ZigZagPivot[] = [];
  if (data.length < length * 2) return pivots;
  
  let lastPivotHigh = -Infinity;
  let lastPivotLow = Infinity;
  let lastPivotHighBar = 0;
  let lastPivotLowBar = 0;
  let direction = 0; // 0 = undetermined, 1 = looking for low, -1 = looking for high
  
  for (let i = length; i < data.length - length; i++) {
    // Check for pivot high
    let isPivotHigh = true;
    for (let j = 1; j <= length; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isPivotHigh = false;
        break;
      }
    }
    
    // Check for pivot low
    let isPivotLow = true;
    for (let j = 1; j <= length; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isPivotLow = false;
        break;
      }
    }
    
    if (isPivotHigh) {
      if (direction === 0 || direction === -1) {
        // First pivot or was looking for high
        if (pivots.length > 0 && pivots[pivots.length - 1].direction === 1) {
          // Update existing high if this is higher
          if (data[i].high > pivots[pivots.length - 1].price) {
            pivots[pivots.length - 1] = {
              price: data[i].high,
              bar: i,
              timestamp: Number(data[i].time),
              direction: 1,
              ratio: 0
            };
          }
        } else {
          pivots.push({
            price: data[i].high,
            bar: i,
            timestamp: Number(data[i].time),
            direction: 1,
            ratio: 0
          });
          direction = 1; // Now look for low
        }
        lastPivotHigh = data[i].high;
        lastPivotHighBar = i;
      }
    }
    
    if (isPivotLow) {
      if (direction === 0 || direction === 1) {
        // First pivot or was looking for low
        if (pivots.length > 0 && pivots[pivots.length - 1].direction === -1) {
          // Update existing low if this is lower
          if (data[i].low < pivots[pivots.length - 1].price) {
            pivots[pivots.length - 1] = {
              price: data[i].low,
              bar: i,
              timestamp: Number(data[i].time),
              direction: -1,
              ratio: 0
            };
          }
        } else {
          pivots.push({
            price: data[i].low,
            bar: i,
            timestamp: Number(data[i].time),
            direction: -1,
            ratio: 0
          });
          direction = -1; // Now look for high
        }
        lastPivotLow = data[i].low;
        lastPivotLowBar = i;
      }
    }
  }
  
  // Calculate ratios
  for (let i = 1; i < pivots.length - 1; i++) {
    const prev = Math.abs(pivots[i].price - pivots[i - 1].price);
    const next = Math.abs(pivots[i + 1].price - pivots[i].price);
    pivots[i].ratio = next !== 0 ? prev / next : 0;
  }
  
  return pivots;
}

// ============ ANGLE CALCULATION ============

/**
 * Calculate angle of a line in degrees
 */
function calculateAngle(data: CandleData[], startBar: number, startPrice: number, endBar: number, endPrice: number): number {
  if (startBar === endBar) return 0;
  
  // Calculate average true range for normalization
  let atrSum = 0;
  const loopback = Math.abs(endBar - startBar);
  const startIdx = Math.min(startBar, endBar);
  const endIdx = Math.max(startBar, endBar);
  
  for (let i = startIdx; i <= endIdx && i < data.length; i++) {
    if (i > 0) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      atrSum += tr;
    }
  }
  
  const avgTR = atrSum / (loopback + 1);
  if (avgTR === 0) return 0;
  
  const rad2degree = 180 / Math.PI;
  const angle = rad2degree * Math.atan((startPrice - endPrice) / (2 * avgTR));
  
  return angle;
}

/**
 * Get price at a specific bar on a line
 */
function getLinePrice(x1: number, y1: number, x2: number, y2: number, targetX: number): number {
  if (x2 === x1) return y1;
  const slope = (y2 - y1) / (x2 - x1);
  return y1 + slope * (targetX - x1);
}

// ============ PATTERN DETECTION ============

interface ExistingPattern {
  aBar: number;
  bBar: number;
  cBar: number;
  dBar: number;
  eBar: number;
  fBar: number;
}

/**
 * Check if pattern already exists
 */
function patternExists(
  existing: ExistingPattern[],
  aBar: number, bBar: number, cBar: number, dBar: number, eBar: number, fBar: number,
  wedgeSize: number,
  avoidOverlap: boolean
): boolean {
  for (const pattern of existing) {
    let commonPivots = 0;
    if (pattern.aBar === aBar) commonPivots++;
    if (pattern.bBar === bBar) commonPivots++;
    if (pattern.cBar === cBar) commonPivots++;
    if (pattern.dBar === dBar) commonPivots++;
    if (pattern.eBar === eBar) commonPivots++;
    if (wedgeSize === 6 && pattern.fBar === fBar) commonPivots++;
    
    if (commonPivots >= 2) return true;
    
    const lastPivotBar = wedgeSize === 6 ? fBar : eBar;
    if (avoidOverlap && lastPivotBar < pattern.aBar && lastPivotBar > pattern.fBar) {
      return true;
    }
  }
  return false;
}

/**
 * Find trend series for flag detection
 */
function getTrendSeries(pivots: ZigZagPivot[], startIndex: number): number[] {
  const indices: number[] = [];
  if (startIndex >= pivots.length) return indices;
  
  const startDir = pivots[startIndex].direction;
  
  for (let i = startIndex + 1; i < pivots.length; i++) {
    if (pivots[i].direction === startDir) {
      indices.push(i);
    }
  }
  
  return indices;
}

/**
 * Detect wedge pattern
 */
function detectWedgePattern(
  data: CandleData[],
  pivots: ZigZagPivot[],
  startIndex: number,
  config: WedgeFlagConfig,
  existingPatterns: ExistingPattern[],
  colorIndex: number,
  zigzagLevel: number
): DetectedPattern | null {
  const wedgeSize = config.wedgeSize;
  const numPivots = wedgeSize;
  
  if (pivots.length < startIndex + numPivots) return null;
  
  // Get pivot points (newest first in array, so index 0 is most recent)
  const a = pivots[startIndex];
  const b = pivots[startIndex + 1];
  const c = pivots[startIndex + 2];
  const d = pivots[startIndex + 3];
  const e = pivots[startIndex + 4];
  const f = wedgeSize === 6 ? pivots[startIndex + 5] : e;
  
  // Check if pattern already exists
  if (patternExists(existingPatterns, a.bar, b.bar, c.bar, d.bar, e.bar, f.bar, wedgeSize, config.avoidOverlap)) {
    return null;
  }
  
  // Calculate ratios
  const aRatio = Math.abs(a.price - b.price) / Math.abs(b.price - c.price);
  const bRatio = Math.abs(b.price - c.price) / Math.abs(c.price - d.price);
  const cRatio = Math.abs(c.price - d.price) / Math.abs(d.price - e.price);
  const dRatio = wedgeSize === 6 ? Math.abs(d.price - e.price) / Math.abs(e.price - f.price) : 0;
  
  // Determine trend line points
  const l1StartX = e.bar;
  const l1StartY = e.price;
  const l1EndX = a.bar;
  const l1EndY = a.price;
  
  const l2StartX = wedgeSize === 6 ? f.bar : d.bar;
  const l2StartY = wedgeSize === 6 ? f.price : d.price;
  const l2EndX = b.bar;
  const l2EndY = b.price;
  
  // Calculate extended line values
  const startBar = Math.min(l2StartX, l1StartX);
  const endBar = l1EndX;
  
  const l1Start = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, startBar);
  const l1End = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, endBar);
  const l2Start = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, startBar);
  const l2End = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, endBar);
  
  // Calculate angles
  const l1Angle = calculateAngle(data, startBar, l1Start, endBar, l1End);
  const l2Angle = calculateAngle(data, startBar, l2Start, endBar, l2End);
  
  const l1Diff = Math.abs(l1Start - l1End);
  const l2Diff = Math.abs(l2Start - l2End);
  
  // Check wedge type
  const isType1Wedge = aRatio >= 1 && bRatio < 1 && cRatio >= 1 && (dRatio < 1 || wedgeSize === 5) && l1Diff < l2Diff;
  const isType2Wedge = aRatio < 1 && bRatio >= 1 && cRatio < 1 && (dRatio >= 1 || wedgeSize === 5) && l1Diff > l2Diff;
  
  // Angle filters
  const angleDiff = Math.abs(l1Angle - l2Angle);
  const angleDiffInRange = !config.applyAngleDiff || (angleDiff >= config.minAngleDiff && angleDiff <= config.maxAngleDiff);
  const angleInRange = !config.applyAngleLimit || 
    (Math.max(Math.abs(l1Angle), Math.abs(l2Angle)) >= config.minAngleRange && 
     Math.min(Math.abs(l1Angle), Math.abs(l2Angle)) <= config.maxAngleRange);
  
  let isWedge = (isType1Wedge || isType2Wedge) && angleDiffInRange && angleInRange;
  
  if (!isWedge) return null;
  
  // Validate that price stays within the wedge
  const lastPivotBar = wedgeSize === 6 ? f.bar : e.bar;
  for (let i = a.bar; i >= lastPivotBar && i >= 0 && i < data.length; i--) {
    const candle = data[i];
    const l1Price = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, i);
    const l2Price = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, i);
    
    if (candle.high < Math.min(l1Price, l2Price) || candle.low > Math.max(l1Price, l2Price)) {
      isWedge = false;
      break;
    }
    
    if (i === c.bar && (l1Price > candle.high || l1Price < candle.low)) {
      isWedge = false;
      break;
    }
    
    if (i === d.bar && (l2Price > candle.high || l2Price < candle.low)) {
      isWedge = false;
      break;
    }
  }
  
  if (!isWedge) return null;
  
  const lastPivot = wedgeSize === 6 ? f : e;
  const llastPivot = wedgeSize === 6 ? e : d;
  
  // Check for flag pattern
  const xIndexes = getTrendSeries(pivots, startIndex + wedgeSize - 1);
  let isFlag = false;
  let flagPole: TrendLine | null = null;
  
  for (let i = xIndexes.length - 1; i >= 0; i--) {
    const xIndex = xIndexes[i];
    if (xIndex >= pivots.length) continue;
    
    const x = pivots[xIndex];
    const linePrice = getLinePrice(
      wedgeSize === 6 ? l1StartX : l2StartX,
      wedgeSize === 6 ? l1StartY : l2StartY,
      wedgeSize === 6 ? l1EndX : l2EndX,
      wedgeSize === 6 ? l1EndY : l2EndY,
      lastPivot.bar
    );
    
    const flagRatio = Math.abs(lastPivot.price - linePrice) / Math.abs(x.price - lastPivot.price);
    
    const lastPivotDir = (lastPivot.price - x.price) / Math.abs(lastPivot.price - x.price);
    const wedgeDir = (lastPivot.price - (wedgeSize === 6 ? b.price : a.price)) / 
                     Math.abs(lastPivot.price - (wedgeSize === 6 ? b.price : a.price));
    
    if (flagRatio < 0.618 && lastPivotDir === wedgeDir) {
      isFlag = true;
      flagPole = {
        x1: x.bar,
        y1: x.price,
        x2: lastPivot.bar,
        y2: lastPivot.price,
        angle: calculateAngle(data, x.bar, x.price, lastPivot.bar, lastPivot.price),
        timestamp1: x.timestamp,
        timestamp2: lastPivot.timestamp
      };
      break;
    }
  }
  
  // Get color
  const colors = config.theme === 'dark' ? darkThemeColors : lightThemeColors;
  const color = colors[colorIndex % colors.length];
  
  // Build pattern pivots
  const patternPivots = [a, b, c, d, e];
  if (wedgeSize === 6) patternPivots.push(f);
  
  // Add to existing patterns
  existingPatterns.push({
    aBar: a.bar,
    bBar: b.bar,
    cBar: c.bar,
    dBar: d.bar,
    eBar: e.bar,
    fBar: f.bar
  });
  
  // Determine upper and lower trend lines
  const upperLine: TrendLine = l1StartY > l2StartY ? {
    x1: l1StartX, y1: l1StartY, x2: l1EndX, y2: l1EndY,
    angle: l1Angle,
    timestamp1: Number(data[l1StartX]?.time) || 0,
    timestamp2: Number(data[l1EndX]?.time) || 0
  } : {
    x1: l2StartX, y1: l2StartY, x2: l2EndX, y2: l2EndY,
    angle: l2Angle,
    timestamp1: Number(data[l2StartX]?.time) || 0,
    timestamp2: Number(data[l2EndX]?.time) || 0
  };
  
  const lowerLine: TrendLine = l1StartY <= l2StartY ? {
    x1: l1StartX, y1: l1StartY, x2: l1EndX, y2: l1EndY,
    angle: l1Angle,
    timestamp1: Number(data[l1StartX]?.time) || 0,
    timestamp2: Number(data[l1EndX]?.time) || 0
  } : {
    x1: l2StartX, y1: l2StartY, x2: l2EndX, y2: l2EndY,
    angle: l2Angle,
    timestamp1: Number(data[l2StartX]?.time) || 0,
    timestamp2: Number(data[l2EndX]?.time) || 0
  };
  
  if (isFlag && config.allowFlag && flagPole) {
    const direction: 'bullish' | 'bearish' = flagPole.y1 < flagPole.y2 ? 'bullish' : 'bearish';
    
    return {
      type: 'flag',
      direction,
      pivots: patternPivots,
      poleLine: flagPole,
      upperTrendLine: upperLine,
      lowerTrendLine: lowerLine,
      flagRatio: Math.abs(lastPivot.price - getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, lastPivot.bar)) / 
                 Math.abs(flagPole.y1 - lastPivot.price),
      startBar: lastPivotBar,
      endBar: a.bar,
      startTime: lastPivot.timestamp,
      endTime: a.timestamp,
      color,
      zigzagLevel
    };
  } else if (!isFlag && config.allowWedge) {
    const direction: 'bullish' | 'bearish' = lastPivot.price > llastPivot.price ? 'bearish' : 'bullish';
    
    return {
      type: 'wedge',
      wedgeType: isType1Wedge ? 1 : 2,
      direction,
      pivots: patternPivots,
      upperTrendLine: upperLine,
      lowerTrendLine: lowerLine,
      angleDiff,
      startBar: lastPivotBar,
      endBar: a.bar,
      startTime: lastPivot.timestamp,
      endTime: a.timestamp,
      color,
      zigzagLevel
    };
  }
  
  return null;
}

// ============ MAIN FUNCTION ============

export interface WedgeFlagResult {
  patterns: DetectedPattern[];
  zigzagPivots: Map<number, ZigZagPivot[]>; // Key is zigzag level
}

/**
 * Calculate Wedge and Flag patterns
 */
export function calculateWedgeFlag(
  data: CandleData[],
  config: WedgeFlagConfig = defaultWedgeFlagConfig
): WedgeFlagResult {
  const patterns: DetectedPattern[] = [];
  const zigzagPivots = new Map<number, ZigZagPivot[]>();
  const existingPatterns: ExistingPattern[] = [];
  let colorIndex = 0;
  
  const zigzagConfigs = [
    { enabled: config.zigzag1.enabled, length: config.zigzag1.length, level: 1 },
    { enabled: config.zigzag2.enabled, length: config.zigzag2.length, level: 2 },
    { enabled: config.zigzag3.enabled, length: config.zigzag3.length, level: 3 },
    { enabled: config.zigzag4.enabled, length: config.zigzag4.length, level: 4 }
  ];
  
  for (const zzConfig of zigzagConfigs) {
    if (!zzConfig.enabled) continue;
    
    const pivots = calculateZigZag(data, zzConfig.length);
    zigzagPivots.set(zzConfig.level, pivots);
    
    if (pivots.length < config.wedgeSize + 1) continue;
    
    // Reverse pivots to have newest first (like Pine Script)
    const reversedPivots = [...pivots].reverse();
    
    // Scan for patterns
    for (let startIndex = 0; startIndex <= 1; startIndex++) {
      if (reversedPivots.length < startIndex + config.wedgeSize) continue;
      
      const pattern = detectWedgePattern(
        data,
        reversedPivots,
        startIndex,
        config,
        existingPatterns,
        colorIndex,
        zzConfig.level
      );
      
      if (pattern) {
        patterns.push(pattern);
        colorIndex++;
      }
    }
  }
  
  return { patterns, zigzagPivots };
}

/**
 * Get recent patterns
 */
export function getRecentWedgeFlagPatterns(
  data: CandleData[],
  config: WedgeFlagConfig = defaultWedgeFlagConfig,
  maxPatterns: number = 10
): DetectedPattern[] {
  const result = calculateWedgeFlag(data, config);
  return result.patterns.slice(0, maxPatterns);
}
