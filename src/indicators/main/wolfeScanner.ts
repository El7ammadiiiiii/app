/**
 * Wolfe Scanner [Trendoscope®]
 * Based on TradingView indicator by Trendoscope
 * 
 * Features:
 * - Multi-level Zigzag analysis
 * - Wolfe Wave pattern detection (5-point reversal)
 * - Wedge line drawing
 * - Price projection to target
 * - Pattern overlap suppression
 * 
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface WolfeScannerConfig {
  // Zigzag settings
  zigzagLength: number;      // Pivot detection length (default: 3)
  zigzagDepth: number;       // Maximum pivots to track (default: 250)
  minLevel: number;          // Minimum zigzag level for patterns (default: 2)
  
  // Display options
  theme: 'dark' | 'light';
  avoidOverlap: boolean;     // Suppress overlapping patterns
  drawZigzag: boolean;       // Draw zigzag lines within wedge
  drawProjection: boolean;   // Draw Wolfe projection line
  
  // Max patterns
  maxPatterns: number;       // Maximum patterns to store (default: 10)
}

export interface ZigzagPivot {
  price: number;
  index: number;
  type: 'high' | 'low';
  direction: number;  // 1 = up, -1 = down
}

export interface WolfeWavePattern {
  // 5 pivot points (1 is oldest, 5 is newest)
  point1: { index: number; price: number };
  point2: { index: number; price: number };
  point3: { index: number; price: number };
  point4: { index: number; price: number };
  point5: { index: number; price: number };
  
  // Pattern properties
  direction: 'bullish' | 'bearish';  // bullish = expecting price up, bearish = expecting price down
  color: string;
  
  // Wedge lines
  upperLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  lowerLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  
  // Projection
  closingIndex: number;
  closingPrice: number;
  projectionLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  targetPrice: number;
  
  // Validity
  isValid: boolean;
  isClosingSoon: boolean;
}

export interface WolfeScannerResult {
  // Zigzag pivots
  pivots: ZigzagPivot[];
  
  // Detected Wolfe Wave patterns
  patterns: WolfeWavePattern[];
  
  // Current pattern count
  bullishCount: number;
  bearishCount: number;
  
  // Active patterns (not yet reached target)
  activePatterns: WolfeWavePattern[];
}

export const defaultWolfeScannerConfig: WolfeScannerConfig = {
  zigzagLength: 3,
  zigzagDepth: 250,
  minLevel: 2,
  theme: 'dark',
  avoidOverlap: false,
  drawZigzag: true,
  drawProjection: true,
  maxPatterns: 10
};

// Theme colors
const DARK_THEME_COLORS = [
  '#fbf46d', '#8dba51', '#4a9ff5', '#ff998c', '#ff9500',
  '#00ead3', '#a799b7', '#ffd271', '#77d970', '#5f81e4',
  '#eb92be', '#c68b59', '#c89595', '#c4b6b6', '#ffbe0f',
  '#c0e218', '#998ceb', '#ce1f6b', '#fb3640', '#c2ffd9',
  '#ffdbc5', '#79b4b7'
];

const LIGHT_THEME_COLORS = [
  '#3d56b2', '#39a388', '#fa1e0e', '#a9333a', '#e1578a',
  '#3e7c17', '#f4a442', '#864879', '#719fb0', '#aa2ee6',
  '#a12568', '#bd2000', '#105652', '#c85c5c', '#3f3351',
  '#726a95', '#ab6d23', '#f78812', '#334756', '#0c7b93',
  '#c32bad'
];

/**
 * Find local high/low pivots using zigzag logic
 */
function findZigzagPivots(data: CandleData[], length: number, maxPivots: number): ZigzagPivot[] {
  const pivots: ZigzagPivot[] = [];
  
  if (data.length < length * 2 + 1) return pivots;
  
  let lastPivotType: 'high' | 'low' | null = null;
  let lastPivotIndex = -1;
  let lastPivotPrice = 0;
  
  // Find pivots
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
    
    // Add pivot based on alternation
    if (isPivotHigh) {
      if (lastPivotType === 'high') {
        // Replace last pivot high with higher one if current is higher
        if (data[i].high > lastPivotPrice && pivots.length > 0) {
          pivots.pop();
        } else {
          continue;  // Skip this pivot high, keep previous
        }
      }
      
      pivots.push({
        price: data[i].high,
        index: i,
        type: 'high',
        direction: -1  // After high, expect down
      });
      lastPivotType = 'high';
      lastPivotIndex = i;
      lastPivotPrice = data[i].high;
    } else if (isPivotLow) {
      if (lastPivotType === 'low') {
        // Replace last pivot low with lower one if current is lower
        if (data[i].low < lastPivotPrice && pivots.length > 0) {
          pivots.pop();
        } else {
          continue;  // Skip this pivot low, keep previous
        }
      }
      
      pivots.push({
        price: data[i].low,
        index: i,
        type: 'low',
        direction: 1  // After low, expect up
      });
      lastPivotType = 'low';
      lastPivotIndex = i;
      lastPivotPrice = data[i].low;
    }
    
    // Limit pivots
    if (pivots.length > maxPivots) {
      pivots.shift();
    }
  }
  
  return pivots;
}

/**
 * Calculate line price at given index
 */
function getLinePrice(x1: number, y1: number, x2: number, y2: number, targetX: number): number {
  if (x2 === x1) return y1;
  const slope = (y2 - y1) / (x2 - x1);
  return y1 + slope * (targetX - x1);
}

/**
 * Check if pattern already exists (by pivot bars)
 */
function patternExists(
  existingPatterns: WolfeWavePattern[],
  p1Bar: number, p2Bar: number, p3Bar: number, p4Bar: number, p5Bar: number,
  avoidOverlap: boolean
): boolean {
  for (const pattern of existingPatterns) {
    let commonPivots = 0;
    if (p1Bar === pattern.point1.index) commonPivots++;
    if (p2Bar === pattern.point2.index) commonPivots++;
    if (p3Bar === pattern.point3.index) commonPivots++;
    if (p4Bar === pattern.point4.index) commonPivots++;
    if (p5Bar === pattern.point5.index) commonPivots++;
    
    if (commonPivots >= 3) return true;
    
    if (avoidOverlap) {
      if (p1Bar >= pattern.point1.index && p1Bar <= pattern.point5.index) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Analyze wedge and calculate closing point
 */
function analyzeWedge(
  l1StartX: number, l1StartY: number, l1EndX: number, l1EndY: number,
  l2StartX: number, l2StartY: number, l2EndX: number, l2EndY: number,
  lastDir: number
): {
  closingEndBar: number;
  closingEndPrice: number;
  isWolfeWedge: boolean;
  closingSoon: boolean;
} {
  const startBar = l1StartX;
  const endBar = l1EndX;
  
  // Get l2 prices at l1 x coordinates
  const l2Start = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, startBar);
  const l2End = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, endBar);
  
  const l1Diff = l1StartY - l1EndY;
  const l2Diff = l2Start - l2End;
  
  const width = Math.abs(endBar - startBar);
  
  let closingEndBar = endBar;
  let closingEndPrice = l2End;
  let closingSoon = false;
  
  // Check if contracting (wedge narrows)
  const isContracting = Math.abs(l1StartY - l2Start) > Math.abs(l1EndY - l2End);
  
  // Check if not a triangle (both lines slope same direction)
  const isNotTriangle = Math.sign(l1StartY - l1EndY) === Math.sign(l2Start - l2End);
  
  const isWolfeWedge = isContracting && isNotTriangle;
  
  if (isWolfeWedge) {
    // Find closing point (where lines meet)
    for (let i = endBar; i <= endBar + Math.min(500, 2 * width); i++) {
      const l1Price = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, i);
      const l2Price = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, i);
      
      if (lastDir * (l1Price - l2Price) <= 0) {
        closingEndBar = i;
        closingSoon = true;
        closingEndPrice = (l1Price + l2Price) / 2;
        break;
      }
    }
  }
  
  return { closingEndBar, closingEndPrice, isWolfeWedge, closingSoon: isWolfeWedge && closingSoon };
}

/**
 * Find Wolfe Wave pattern from 5 pivots
 */
function findWolfeWave(
  pivots: ZigzagPivot[],
  startIndex: number,
  existingPatterns: WolfeWavePattern[],
  colorIndex: number,
  config: WolfeScannerConfig
): WolfeWavePattern | null {
  if (pivots.length < startIndex + 5) return null;
  
  // Get 5 pivots (newest to oldest)
  const p5 = pivots[pivots.length - 1 - startIndex];
  const p4 = pivots[pivots.length - 2 - startIndex];
  const p3 = pivots[pivots.length - 3 - startIndex];
  const p2 = pivots[pivots.length - 4 - startIndex];
  const p1 = pivots[pivots.length - 5 - startIndex];
  
  if (!p1 || !p2 || !p3 || !p4 || !p5) return null;
  
  const lastDir = p5.direction;
  
  // Check if pattern already exists
  if (patternExists(existingPatterns, p1.index, p2.index, p3.index, p4.index, p5.index, config.avoidOverlap)) {
    return null;
  }
  
  // Basic Wolfe Wave conditions
  let basicCondition: boolean;
  
  if (lastDir > 0) {
    // Bullish Wolfe Wave (expecting price to go up)
    // Point 2 is the lowest, Point 5 is the highest
    // Point 1 < Point 3 and Point 1 > Point 4
    basicCondition = 
      p2.price < Math.min(p1.price, p3.price, p4.price, p5.price) &&
      p5.price > Math.max(p1.price, p2.price, p3.price, p4.price) &&
      p1.price < p3.price &&
      p1.price > p4.price;
  } else {
    // Bearish Wolfe Wave (expecting price to go down)
    // Point 2 is the highest, Point 5 is the lowest
    // Point 1 > Point 3 and Point 1 < Point 4
    basicCondition = 
      p2.price > Math.max(p1.price, p3.price, p4.price, p5.price) &&
      p5.price < Math.min(p1.price, p2.price, p3.price, p4.price) &&
      p1.price > p3.price &&
      p1.price < p4.price;
  }
  
  if (!basicCondition) return null;
  
  // Analyze wedge
  const wedgeResult = analyzeWedge(
    p1.index, p1.price, p5.index, p5.price,  // Line 1-5
    p2.index, p2.price, p4.index, p4.price,  // Line 2-4
    lastDir
  );
  
  if (!wedgeResult.closingSoon) return null;
  
  // Calculate projection (line from point 1 to point 4, extended to closing bar)
  const projectionEndPrice = getLinePrice(p1.index, p1.price, p4.index, p4.price, wedgeResult.closingEndBar);
  
  // Get color
  const colors = config.theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  const color = colors[colorIndex % colors.length];
  
  return {
    point1: { index: p1.index, price: p1.price },
    point2: { index: p2.index, price: p2.price },
    point3: { index: p3.index, price: p3.price },
    point4: { index: p4.index, price: p4.price },
    point5: { index: p5.index, price: p5.price },
    direction: lastDir > 0 ? 'bullish' : 'bearish',
    color,
    upperLine: {
      startIndex: p1.index,
      startPrice: p1.price,
      endIndex: wedgeResult.closingEndBar,
      endPrice: getLinePrice(p1.index, p1.price, p5.index, p5.price, wedgeResult.closingEndBar)
    },
    lowerLine: {
      startIndex: p1.index,
      startPrice: getLinePrice(p2.index, p2.price, p4.index, p4.price, p1.index),
      endIndex: wedgeResult.closingEndBar,
      endPrice: wedgeResult.closingEndPrice
    },
    closingIndex: wedgeResult.closingEndBar,
    closingPrice: wedgeResult.closingEndPrice,
    projectionLine: {
      startIndex: p1.index,
      startPrice: p1.price,
      endIndex: wedgeResult.closingEndBar,
      endPrice: projectionEndPrice
    },
    targetPrice: projectionEndPrice,
    isValid: true,
    isClosingSoon: wedgeResult.closingSoon
  };
}

/**
 * Main calculation function
 */
export function calculateWolfeScanner(
  data: CandleData[],
  config: Partial<WolfeScannerConfig> = {}
): WolfeScannerResult {
  const cfg = { ...defaultWolfeScannerConfig, ...config };
  
  const result: WolfeScannerResult = {
    pivots: [],
    patterns: [],
    bullishCount: 0,
    bearishCount: 0,
    activePatterns: []
  };
  
  if (data.length < cfg.zigzagLength * 2 + 5) return result;
  
  // Find zigzag pivots
  result.pivots = findZigzagPivots(data, cfg.zigzagLength, cfg.zigzagDepth);
  
  if (result.pivots.length < 5) return result;
  
  // Scan for patterns at different starting indices
  let colorIndex = 0;
  
  for (let level = 0; level < cfg.minLevel + 3; level++) {
    for (let startIndex = 0; startIndex <= 2; startIndex++) {
      const pattern = findWolfeWave(result.pivots, startIndex, result.patterns, colorIndex, cfg);
      
      if (pattern) {
        result.patterns.push(pattern);
        colorIndex++;
        
        if (pattern.direction === 'bullish') {
          result.bullishCount++;
        } else {
          result.bearishCount++;
        }
        
        // Check if pattern is still active (not reached target yet)
        const currentIndex = data.length - 1;
        if (currentIndex < pattern.closingIndex) {
          result.activePatterns.push(pattern);
        }
      }
    }
  }
  
  // Limit patterns
  if (result.patterns.length > cfg.maxPatterns) {
    result.patterns = result.patterns.slice(-cfg.maxPatterns);
  }
  
  return result;
}

/**
 * Get pattern description
 */
export function getWolfePatternDescription(pattern: WolfeWavePattern): string {
  const dirText = pattern.direction === 'bullish' ? 'Bullish (↑)' : 'Bearish (↓)';
  const targetDist = ((pattern.targetPrice - pattern.point5.price) / pattern.point5.price * 100).toFixed(2);
  return `Wolfe Wave ${dirText}\nTarget: ${pattern.targetPrice.toFixed(2)} (${targetDist}%)`;
}

/**
 * Check if price has reached target
 */
export function isTargetReached(pattern: WolfeWavePattern, currentPrice: number): boolean {
  if (pattern.direction === 'bullish') {
    return currentPrice >= pattern.targetPrice;
  } else {
    return currentPrice <= pattern.targetPrice;
  }
}

export default calculateWolfeScanner;
