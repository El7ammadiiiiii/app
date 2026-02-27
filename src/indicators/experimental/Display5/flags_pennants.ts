// Converted to TypeScript for Display 5 Models
// Original: Flags and Pennants [Trendoscope®]
// License: CC BY-NC-SA 4.0

/**
 * Flags and Pennants Pattern Detector
 * 
 * Advanced pattern recognition system using multi-timeframe zigzag analysis:
 * 
 * FLAG PATTERNS:
 * - Bullish Flag: Strong uptrend (pole) + downward channel (flag body)
 * - Bearish Flag: Strong downtrend (pole) + upward channel (flag body)
 * - Characteristics: Counter-trend consolidation, typically 38-62% retracement
 * 
 * PENNANT PATTERNS:
 * - Bullish Pennant: Strong uptrend + converging triangle
 * - Bearish Pennant: Strong downtrend + converging triangle
 * - Characteristics: Symmetrical consolidation, smaller range
 * 
 * Uses 4 zigzag configurations for multi-scale detection
 */

export interface FlagsPennantsConfig {
  // Zigzag Configurations
  useZigzag1: boolean;
  zigzagLength1: number;      // 3 default
  depth1: number;             // 144 default
  
  useZigzag2: boolean;
  zigzagLength2: number;      // 5 default
  depth2: number;             // 89 default
  
  useZigzag3: boolean;
  zigzagLength3: number;      // 8 default
  depth3: number;             // 55 default
  
  useZigzag4: boolean;
  zigzagLength4: number;      // 13 default
  depth4: number;             // 34 default
  
  // Pattern Validation
  errorThreshold: number;     // 20% default - error tolerance for trendline fit
  flatThreshold: number;      // 20% default - minimum slope for valid trendlines
  maxRetracement: number;     // 0.618 default - max ABC retracement ratio
  checkBarRatio: boolean;     // Verify proportional bar spacing
  barRatioLimit: number;      // 0.382 default
  avoidOverlap: boolean;      // Don't detect overlapping patterns
  
  // Display
  showZigzag: boolean;
  showPatternLabels: boolean;
  showPivotLabels: boolean;
}

export const defaultFlagsPennantsConfig: FlagsPennantsConfig = {
  useZigzag1: true,
  zigzagLength1: 3,
  depth1: 144,
  useZigzag2: true,
  zigzagLength2: 5,
  depth2: 89,
  useZigzag3: true,
  zigzagLength3: 8,
  depth3: 55,
  useZigzag4: true,
  zigzagLength4: 13,
  depth4: 34,
  errorThreshold: 20,
  flatThreshold: 20,
  maxRetracement: 0.618,
  checkBarRatio: false,
  barRatioLimit: 0.382,
  avoidOverlap: true,
  showZigzag: true,
  showPatternLabels: true,
  showPivotLabels: true,
};

export interface ZigzagPivot {
  index: number;
  price: number;
  direction: number;  // 1 = high, -1 = low
}

export interface FlagPennantPattern {
  type: 'bullish_flag' | 'bearish_flag' | 'bullish_pennant' | 'bearish_pennant';
  pivots: ZigzagPivot[];
  poleStart: ZigzagPivot;    // Start of strong move
  poleEnd: ZigzagPivot;      // End of strong move (start of consolidation)
  consolidationEnd: ZigzagPivot;
  upperLine: { x1: number; y1: number; x2: number; y2: number };
  lowerLine: { x1: number; y1: number; x2: number; y2: number };
  retracement: number;       // ABC retracement ratio
  breakoutTarget: number;    // Projected target
  zigzagConfig: { length: number; depth: number };
}

export interface FlagsPennantsResult {
  patterns: FlagPennantPattern[];
  zigzagLines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

/**
 * Calculate Zigzag pivots using peak/trough detection
 */
function calculateZigzag(
  highs: number[],
  lows: number[],
  length: number,
  depth: number
): ZigzagPivot[] {
  const pivots: ZigzagPivot[] = [];
  
  // Detect pivot highs
  for (let i = length; i < highs.length - length; i++) {
    let isHigh = true;
    for (let j = 1; j <= length; j++) {
      if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      pivots.push({ index: i, price: highs[i], direction: 1 });
    }
  }
  
  // Detect pivot lows
  for (let i = length; i < lows.length - length; i++) {
    let isLow = true;
    for (let j = 1; j <= length; j++) {
      if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      pivots.push({ index: i, price: lows[i], direction: -1 });
    }
  }
  
  // Sort by index
  pivots.sort((a, b) => a.index - b.index);
  
  // Filter by depth (minimum price difference)
  const filtered: ZigzagPivot[] = [];
  if (pivots.length === 0) return filtered;
  
  filtered.push(pivots[0]);
  
  for (let i = 1; i < pivots.length; i++) {
    const last = filtered[filtered.length - 1];
    const current = pivots[i];
    
    // Alternate between highs and lows
    if (current.direction === last.direction) {
      // Same direction - keep the more extreme one
      if (current.direction === 1 && current.price > last.price) {
        filtered[filtered.length - 1] = current;
      } else if (current.direction === -1 && current.price < last.price) {
        filtered[filtered.length - 1] = current;
      }
    } else {
      // Different direction - check depth
      const priceDiff = Math.abs(current.price - last.price);
      const avgPrice = (current.price + last.price) / 2;
      const percentDiff = (priceDiff / avgPrice) * 100;
      
      if (percentDiff >= depth / 10) {  // Adjust depth threshold
        filtered.push(current);
      }
    }
  }
  
  return filtered;
}

/**
 * Calculate line slope and intercept
 */
function calculateLine(p1: ZigzagPivot, p2: ZigzagPivot): { slope: number; intercept: number } {
  const slope = (p2.price - p1.price) / (p2.index - p1.index);
  const intercept = p1.price - slope * p1.index;
  return { slope, intercept };
}

/**
 * Check if point fits trendline within error threshold
 */
function checkTrendlineFit(
  point: ZigzagPivot,
  slope: number,
  intercept: number,
  errorRatio: number
): boolean {
  const expectedPrice = slope * point.index + intercept;
  const error = Math.abs(point.price - expectedPrice) / point.price;
  return error <= errorRatio;
}

/**
 * Detect Flag pattern (counter-trend channel after strong move)
 */
function detectFlag(
  pivots: ZigzagPivot[],
  config: FlagsPennantsConfig,
  zigzagConfig: { length: number; depth: number }
): FlagPennantPattern | null {
  if (pivots.length < 5) return null;
  
  const errorRatio = config.errorThreshold / 100;
  const flatRatio = config.flatThreshold / 100;
  
  // Look for pattern: Strong move (pole) + counter-trend consolidation (flag)
  for (let i = 0; i < pivots.length - 4; i++) {
    const p0 = pivots[i];      // Pole start
    const p1 = pivots[i + 1];  // Pole end
    const p2 = pivots[i + 2];  // Flag start
    const p3 = pivots[i + 3];  // Flag middle
    const p4 = pivots[i + 4];  // Flag end
    
    // Calculate pole move
    const poleRange = Math.abs(p1.price - p0.price);
    const poleDirection = p1.price > p0.price ? 1 : -1;
    
    // Calculate retracement
    const flagRange = Math.abs(p4.price - p1.price);
    const retracement = flagRange / poleRange;
    
    // Check retracement within limits
    if (retracement > config.maxRetracement) continue;
    
    // Check flag direction (counter-trend)
    const flagDirection = p4.price > p1.price ? 1 : -1;
    if (flagDirection === poleDirection) continue;
    
    // Calculate flag channel lines
    const upperLine = calculateLine(p1, p3);
    const lowerLine = calculateLine(p2, p4);
    
    // Check if lines are relatively flat (not too steep)
    const upperSlope = Math.abs(upperLine.slope / p1.price);
    const lowerSlope = Math.abs(lowerLine.slope / p2.price);
    
    if (upperSlope > flatRatio || lowerSlope > flatRatio) continue;
    
    // Check if intermediate pivots fit the channel
    const fitsUpper = checkTrendlineFit(p3, upperLine.slope, upperLine.intercept, errorRatio);
    const fitsLower = checkTrendlineFit(p2, lowerLine.slope, lowerLine.intercept, errorRatio);
    const fitsLower2 = checkTrendlineFit(p4, lowerLine.slope, lowerLine.intercept, errorRatio);
    
    if (!fitsUpper || !fitsLower || !fitsLower2) continue;
    
    // Calculate breakout target (pole length projected from flag end)
    const breakoutTarget = p4.price + (poleDirection * poleRange);
    
    const type = poleDirection === 1 ? 'bullish_flag' : 'bearish_flag';
    
    return {
      type,
      pivots: [p0, p1, p2, p3, p4],
      poleStart: p0,
      poleEnd: p1,
      consolidationEnd: p4,
      upperLine: {
        x1: p1.index,
        y1: p1.price,
        x2: p3.index,
        y2: upperLine.slope * p3.index + upperLine.intercept
      },
      lowerLine: {
        x1: p2.index,
        y1: p2.price,
        x2: p4.index,
        y2: lowerLine.slope * p4.index + lowerLine.intercept
      },
      retracement,
      breakoutTarget,
      zigzagConfig
    };
  }
  
  return null;
}

/**
 * Detect Pennant pattern (converging triangle after strong move)
 */
function detectPennant(
  pivots: ZigzagPivot[],
  config: FlagsPennantsConfig,
  zigzagConfig: { length: number; depth: number }
): FlagPennantPattern | null {
  if (pivots.length < 6) return null;
  
  const errorRatio = config.errorThreshold / 100;
  
  // Look for: Strong move + converging triangle (3+ touches each side)
  for (let i = 0; i < pivots.length - 5; i++) {
    const p0 = pivots[i];      // Pole start
    const p1 = pivots[i + 1];  // Pole end / Triangle start
    const p2 = pivots[i + 2];
    const p3 = pivots[i + 3];
    const p4 = pivots[i + 4];
    const p5 = pivots[i + 5];  // Triangle end
    
    // Calculate pole
    const poleRange = Math.abs(p1.price - p0.price);
    const poleDirection = p1.price > p0.price ? 1 : -1;
    
    // Calculate triangle lines (converging)
    const upperLine = calculateLine(p1, p3);
    const lowerLine = calculateLine(p2, p4);
    
    // Check convergence (slopes must have opposite signs or converge)
    const slopeProduct = upperLine.slope * lowerLine.slope;
    const isConverging = slopeProduct < 0 || Math.abs(upperLine.slope - lowerLine.slope) > 0.0001;
    
    if (!isConverging) continue;
    
    // Check if pivots fit the triangle
    const fitsUpper1 = checkTrendlineFit(p1, upperLine.slope, upperLine.intercept, errorRatio);
    const fitsUpper2 = checkTrendlineFit(p3, upperLine.slope, upperLine.intercept, errorRatio);
    const fitsLower1 = checkTrendlineFit(p2, lowerLine.slope, lowerLine.intercept, errorRatio);
    const fitsLower2 = checkTrendlineFit(p4, lowerLine.slope, lowerLine.intercept, errorRatio);
    
    if (!fitsUpper1 || !fitsUpper2 || !fitsLower1 || !fitsLower2) continue;
    
    // Check triangle is relatively small compared to pole
    const triangleRange = Math.max(
      Math.abs(p3.price - p2.price),
      Math.abs(p4.price - p3.price)
    );
    
    if (triangleRange / poleRange > config.maxRetracement) continue;
    
    // Calculate breakout target
    const breakoutTarget = p5.price + (poleDirection * poleRange);
    
    const type = poleDirection === 1 ? 'bullish_pennant' : 'bearish_pennant';
    
    return {
      type,
      pivots: [p0, p1, p2, p3, p4, p5],
      poleStart: p0,
      poleEnd: p1,
      consolidationEnd: p5,
      upperLine: {
        x1: p1.index,
        y1: p1.price,
        x2: p5.index,
        y2: upperLine.slope * p5.index + upperLine.intercept
      },
      lowerLine: {
        x1: p2.index,
        y1: p2.price,
        x2: p5.index,
        y2: lowerLine.slope * p5.index + lowerLine.intercept
      },
      retracement: triangleRange / poleRange,
      breakoutTarget,
      zigzagConfig
    };
  }
  
  return null;
}

/**
 * Check if patterns overlap
 */
function checkOverlap(p1: FlagPennantPattern, p2: FlagPennantPattern): boolean {
  const start1 = p1.poleStart.index;
  const end1 = p1.consolidationEnd.index;
  const start2 = p2.poleStart.index;
  const end2 = p2.consolidationEnd.index;
  
  return (start2 >= start1 && start2 <= end1) || (end2 >= start1 && end2 <= end1);
}

/**
 * Main calculation function
 */
export function detectFlagsAndPennants(
  highs: number[],
  lows: number[],
  config: FlagsPennantsConfig = defaultFlagsPennantsConfig
): FlagsPennantsResult {
  const patterns: FlagPennantPattern[] = [];
  const zigzagLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  
  // Run detection for each enabled zigzag configuration
  const zigzagConfigs = [
    { enabled: config.useZigzag1, length: config.zigzagLength1, depth: config.depth1 },
    { enabled: config.useZigzag2, length: config.zigzagLength2, depth: config.depth2 },
    { enabled: config.useZigzag3, length: config.zigzagLength3, depth: config.depth3 },
    { enabled: config.useZigzag4, length: config.zigzagLength4, depth: config.depth4 },
  ];
  
  for (const zzConfig of zigzagConfigs) {
    if (!zzConfig.enabled) continue;
    
    // Calculate zigzag
    const pivots = calculateZigzag(highs, lows, zzConfig.length, zzConfig.depth);
    
    // Build zigzag lines
    for (let i = 0; i < pivots.length - 1; i++) {
      zigzagLines.push({
        x1: pivots[i].index,
        y1: pivots[i].price,
        x2: pivots[i + 1].index,
        y2: pivots[i + 1].price
      });
    }
    
    // Detect flags
    const flag = detectFlag(pivots, config, { length: zzConfig.length, depth: zzConfig.depth });
    if (flag) {
      // Check overlap with existing patterns
      const hasOverlap = config.avoidOverlap && patterns.some(p => checkOverlap(p, flag));
      if (!hasOverlap) {
        patterns.push(flag);
      }
    }
    
    // Detect pennants
    const pennant = detectPennant(pivots, config, { length: zzConfig.length, depth: zzConfig.depth });
    if (pennant) {
      const hasOverlap = config.avoidOverlap && patterns.some(p => checkOverlap(p, pennant));
      if (!hasOverlap) {
        patterns.push(pennant);
      }
    }
  }
  
  // Sort by most recent first
  patterns.sort((a, b) => b.consolidationEnd.index - a.consolidationEnd.index);
  
  return { patterns, zigzagLines };
}
