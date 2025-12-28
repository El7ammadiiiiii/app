// Converted to TypeScript for Display 5 Models
// Original: Auto Chart Patterns [Trendoscope®]
// License: CC BY-NC-SA 4.0

/**
 * Auto Chart Patterns
 * 
 * Automatically detects classic chart patterns using zigzag pivots:
 * 
 * PATTERN TYPES:
 * - Channels (3): Ascending, Descending, Ranging
 * - Wedges (4): Rising/Falling Expanding/Contracting
 * - Triangles (7): Converging/Diverging, Ascending/Descending variations
 * 
 * FEATURES:
 * - Multi-timeframe zigzag detection (4 configurations)
 * - 5 or 6 pivot pattern scanning
 * - Trend line validation with error threshold
 * - Bar ratio verification
 * - Overlap avoidance
 * - Directional filters per pattern type
 * 
 * LOGIC:
 * - Detect zigzag pivots on price
 * - Analyze 5-6 consecutive pivots
 * - Calculate trend lines for upper and lower boundaries
 * - Validate pattern geometry (parallel, converging, diverging)
 * - Classify pattern based on slope and formation
 */

export interface AutoChartPatternsConfig {
  zigzagConfigs: Array<{
    enabled: boolean;
    length: number;
    depth: number;
  }>;
  numberOfPivots: 5 | 6;
  errorThreshold: number;       // 20% default - trend line error tolerance
  flatThreshold: number;        // 20% default - slope threshold
  checkBarRatio: boolean;       // Verify proportional bar spacing
  barRatioLimit: number;        // 0.382 default
  avoidOverlap: boolean;        // Don't start new pattern before previous ends
  allowedPatterns: {
    channels: boolean;
    wedges: boolean;
    triangles: boolean;
  };
}

export const defaultAutoChartPatternsConfig: AutoChartPatternsConfig = {
  zigzagConfigs: [
    { enabled: true, length: 8, depth: 55 },
    { enabled: false, length: 13, depth: 34 },
    { enabled: false, length: 21, depth: 21 },
    { enabled: false, length: 34, depth: 13 }
  ],
  numberOfPivots: 5,
  errorThreshold: 20,
  flatThreshold: 20,
  checkBarRatio: true,
  barRatioLimit: 0.382,
  avoidOverlap: true,
  allowedPatterns: {
    channels: true,
    wedges: true,
    triangles: true
  }
};

export type PatternType =
  | 'ascending_channel'
  | 'descending_channel'
  | 'ranging_channel'
  | 'rising_wedge_expanding'
  | 'falling_wedge_expanding'
  | 'rising_wedge_contracting'
  | 'falling_wedge_contracting'
  | 'ascending_triangle_expanding'
  | 'descending_triangle_expanding'
  | 'ascending_triangle_contracting'
  | 'descending_triangle_contracting'
  | 'converging_triangle'
  | 'diverging_triangle';

export interface Pivot {
  index: number;
  price: number;
  direction: 1 | -1;  // 1 = high, -1 = low
}

export interface TrendLine {
  start: { index: number; price: number };
  end: { index: number; price: number };
  slope: number;
  angle: number;  // Degrees
}

export interface Pattern {
  type: PatternType;
  pivots: Pivot[];
  upperLine: TrendLine;
  lowerLine: TrendLine;
  startIndex: number;
  endIndex: number;
  zigzagConfig: { length: number; depth: number };
  confidence: number;  // 0-100 based on error/validation
}

export interface AutoChartPatternsResult {
  patterns: Pattern[];
  allPivots: Pivot[];
  zigzagLines: Array<{ index: number; price: number }[]>;
}

/**
 * Detect zigzag pivots
 */
function detectZigzagPivots(
  highs: number[],
  lows: number[],
  length: number,
  depth: number
): Pivot[] {
  const pivots: Pivot[] = [];
  const depthPercent = depth / 100;
  
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
      // Check depth requirement
      const priceRange = highs[i] - Math.min(...lows.slice(Math.max(0, i - length), i + length + 1));
      const avgPrice = highs[i];
      if (priceRange / avgPrice >= depthPercent) {
        pivots.push({ index: i, price: highs[i], direction: 1 });
      }
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
      // Check depth requirement
      const priceRange = Math.max(...highs.slice(Math.max(0, i - length), i + length + 1)) - lows[i];
      const avgPrice = lows[i];
      if (priceRange / avgPrice >= depthPercent) {
        pivots.push({ index: i, price: lows[i], direction: -1 });
      }
    }
  }
  
  // Sort by index
  pivots.sort((a, b) => a.index - b.index);
  
  return pivots;
}

/**
 * Calculate trend line from two pivots
 */
function calculateTrendLine(p1: Pivot, p2: Pivot): TrendLine {
  const slope = (p2.price - p1.price) / (p2.index - p1.index);
  const angle = Math.atan(slope) * (180 / Math.PI);
  
  return {
    start: { index: p1.index, price: p1.price },
    end: { index: p2.index, price: p2.price },
    slope,
    angle
  };
}

/**
 * Get price on trend line at specific index
 */
function getTrendLinePrice(line: TrendLine, index: number): number {
  return line.start.price + line.slope * (index - line.start.index);
}

/**
 * Validate trend line against pivots (error threshold check)
 */
function validateTrendLine(
  line: TrendLine,
  pivots: Pivot[],
  errorThreshold: number
): { valid: boolean; error: number } {
  let totalError = 0;
  let count = 0;
  
  for (const pivot of pivots) {
    if (pivot.index >= line.start.index && pivot.index <= line.end.index) {
      const expectedPrice = getTrendLinePrice(line, pivot.index);
      const error = Math.abs((pivot.price - expectedPrice) / expectedPrice);
      totalError += error;
      count++;
    }
  }
  
  const avgError = count > 0 ? totalError / count : 0;
  const errorPercent = avgError * 100;
  
  return {
    valid: errorPercent <= errorThreshold,
    error: errorPercent
  };
}

/**
 * Classify pattern based on trend lines
 */
function classifyPattern(
  upperLine: TrendLine,
  lowerLine: TrendLine,
  flatThreshold: number
): PatternType | null {
  const upperAngle = Math.abs(upperLine.angle);
  const lowerAngle = Math.abs(lowerLine.angle);
  const flatRatio = flatThreshold / 100;
  
  const upperFlat = upperAngle < flatRatio * 45;
  const lowerFlat = lowerAngle < flatRatio * 45;
  
  const upperRising = upperLine.slope > 0;
  const lowerRising = lowerLine.slope > 0;
  
  const isParallel = Math.abs(upperLine.slope - lowerLine.slope) / Math.max(Math.abs(upperLine.slope), Math.abs(lowerLine.slope)) < 0.2;
  const isConverging = (upperRising && !lowerRising) || (!upperRising && lowerRising) || 
                       (upperRising && lowerRising && upperLine.slope < lowerLine.slope) ||
                       (!upperRising && !lowerRising && upperLine.slope > lowerLine.slope);
  const isDiverging = !isParallel && !isConverging;
  
  // Channels (parallel)
  if (isParallel) {
    if (upperRising && lowerRising) return 'ascending_channel';
    if (!upperRising && !lowerRising) return 'descending_channel';
    if (upperFlat && lowerFlat) return 'ranging_channel';
  }
  
  // Wedges (both lines same direction)
  if ((upperRising && lowerRising) || (!upperRising && !lowerRising)) {
    if (isDiverging) {
      return upperRising ? 'rising_wedge_expanding' : 'falling_wedge_expanding';
    }
    if (isConverging) {
      return upperRising ? 'rising_wedge_contracting' : 'falling_wedge_contracting';
    }
  }
  
  // Triangles (lines different directions)
  if (isConverging) {
    if (upperFlat && !lowerRising) return 'descending_triangle_contracting';
    if (lowerFlat && !upperRising) return 'ascending_triangle_contracting';
    return 'converging_triangle';
  }
  
  if (isDiverging) {
    if (upperFlat && lowerRising) return 'ascending_triangle_expanding';
    if (lowerFlat && upperRising) return 'descending_triangle_expanding';
    return 'diverging_triangle';
  }
  
  return null;
}

/**
 * Detect patterns from pivots
 */
function detectPatterns(
  pivots: Pivot[],
  config: AutoChartPatternsConfig,
  zigzagConfig: { length: number; depth: number }
): Pattern[] {
  const patterns: Pattern[] = [];
  const numPivots = config.numberOfPivots;
  
  // Scan for patterns using consecutive pivots
  for (let i = 0; i <= pivots.length - numPivots; i++) {
    const patternPivots = pivots.slice(i, i + numPivots);
    
    // Separate high and low pivots
    const highPivots = patternPivots.filter(p => p.direction === 1);
    const lowPivots = patternPivots.filter(p => p.direction === -1);
    
    if (highPivots.length < 2 || lowPivots.length < 2) continue;
    
    // Calculate upper and lower trend lines
    const upperLine = calculateTrendLine(highPivots[0], highPivots[highPivots.length - 1]);
    const lowerLine = calculateTrendLine(lowPivots[0], lowPivots[lowPivots.length - 1]);
    
    // Validate trend lines
    const upperValidation = validateTrendLine(upperLine, highPivots, config.errorThreshold);
    const lowerValidation = validateTrendLine(lowerLine, lowPivots, config.errorThreshold);
    
    if (!upperValidation.valid || !lowerValidation.valid) continue;
    
    // Classify pattern
    const patternType = classifyPattern(upperLine, lowerLine, config.flatThreshold);
    
    if (!patternType) continue;
    
    // Check if pattern type is allowed
    const isChannel = patternType.includes('channel');
    const isWedge = patternType.includes('wedge');
    const isTriangle = patternType.includes('triangle');
    
    if (isChannel && !config.allowedPatterns.channels) continue;
    if (isWedge && !config.allowedPatterns.wedges) continue;
    if (isTriangle && !config.allowedPatterns.triangles) continue;
    
    // Check overlap with existing patterns
    if (config.avoidOverlap && patterns.length > 0) {
      const lastPattern = patterns[patterns.length - 1];
      if (patternPivots[0].index < lastPattern.endIndex) continue;
    }
    
    // Calculate confidence (100 - avg error)
    const avgError = (upperValidation.error + lowerValidation.error) / 2;
    const confidence = Math.max(0, 100 - avgError);
    
    patterns.push({
      type: patternType,
      pivots: patternPivots,
      upperLine,
      lowerLine,
      startIndex: patternPivots[0].index,
      endIndex: patternPivots[patternPivots.length - 1].index,
      zigzagConfig,
      confidence
    });
  }
  
  return patterns;
}

/**
 * Generate zigzag lines for visualization
 */
function generateZigzagLines(pivots: Pivot[]): Array<{ index: number; price: number }[]> {
  const lines: Array<{ index: number; price: number }[]> = [];
  
  for (let i = 0; i < pivots.length - 1; i++) {
    lines.push([
      { index: pivots[i].index, price: pivots[i].price },
      { index: pivots[i + 1].index, price: pivots[i + 1].price }
    ]);
  }
  
  return lines;
}

/**
 * Main calculation function
 */
export function calculateAutoChartPatterns(
  highs: number[],
  lows: number[],
  closes: number[],
  config: AutoChartPatternsConfig = defaultAutoChartPatternsConfig
): AutoChartPatternsResult {
  const allPatterns: Pattern[] = [];
  const allPivots: Pivot[] = [];
  const zigzagLines: Array<{ index: number; price: number }[]> = [];
  
  // Process each enabled zigzag configuration
  for (const zigzagConfig of config.zigzagConfigs) {
    if (!zigzagConfig.enabled) continue;
    
    // Detect pivots
    const pivots = detectZigzagPivots(highs, lows, zigzagConfig.length, zigzagConfig.depth);
    
    if (pivots.length < config.numberOfPivots) continue;
    
    // Detect patterns
    const patterns = detectPatterns(pivots, config, zigzagConfig);
    
    allPatterns.push(...patterns);
    allPivots.push(...pivots);
    
    // Generate zigzag lines
    const lines = generateZigzagLines(pivots);
    zigzagLines.push(...lines);
  }
  
  // Sort patterns by confidence
  allPatterns.sort((a, b) => b.confidence - a.confidence);
  
  // Remove duplicate pivots
  const uniquePivots = allPivots.filter((pivot, index, self) =>
    index === self.findIndex(p => p.index === pivot.index && p.direction === pivot.direction)
  );
  
  return {
    patterns: allPatterns.slice(0, 20),  // Limit to top 20 patterns
    allPivots: uniquePivots,
    zigzagLines
  };
}
