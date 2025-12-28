/**
 * Auto Chart Patterns [Trendoscope®]
 * Converted from Pine Script v6
 * 
 * Multi-Zigzag Pattern Detection System
 * Detects: Channels, Wedges, Triangles (Expanding & Contracting)
 */

import { CandleData } from "@/components/charts/TradingChart";

// ============ TYPES ============

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

export interface ZigzagPivot {
  index: number;
  price: number;
  direction: 1 | -1; // 1 = high pivot, -1 = low pivot
}

export interface DetectedPattern {
  type: PatternType;
  pivots: ZigzagPivot[];
  startIndex: number;
  endIndex: number;
  upperTrendLine: { x1: number; y1: number; x2: number; y2: number };
  lowerTrendLine: { x1: number; y1: number; x2: number; y2: number };
  error: number;
  confidence: number;
  zigzagLevel: number;
}

export interface AutoChartPatternsConfig {
  // Zigzag configurations (up to 4)
  zigzags: Array<{
    enabled: boolean;
    length: number;
    depth: number;
  }>;
  
  numberOfPivots: 5 | 6;
  errorThreshold: number; // 0-100 percentage
  flatThreshold: number; // 0-30 percentage
  checkBarRatio: boolean;
  barRatioLimit: number;
  avoidOverlap: boolean;
  
  // Pattern filters
  allowChannels: boolean;
  allowWedges: boolean;
  allowTriangles: boolean;
  allowRisingPatterns: boolean;
  allowFallingPatterns: boolean;
  allowNonDirectionalPatterns: boolean;
  allowExpandingPatterns: boolean;
  allowContractingPatterns: boolean;
  allowParallelChannels: boolean;
  
  // Individual pattern toggles
  patterns: {
    ascendingChannel: boolean;
    descendingChannel: boolean;
    rangingChannel: boolean;
    risingWedgeExpanding: boolean;
    fallingWedgeExpanding: boolean;
    risingWedgeContracting: boolean;
    fallingWedgeContracting: boolean;
    ascendingTriangleExpanding: boolean;
    descendingTriangleExpanding: boolean;
    ascendingTriangleContracting: boolean;
    descendingTriangleContracting: boolean;
    convergingTriangle: boolean;
    divergingTriangle: boolean;
  };
  
  maxPatterns: number;
}

export const defaultAutoChartPatternsConfig: AutoChartPatternsConfig = {
  zigzags: [
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
  
  allowChannels: true,
  allowWedges: true,
  allowTriangles: true,
  allowRisingPatterns: true,
  allowFallingPatterns: true,
  allowNonDirectionalPatterns: true,
  allowExpandingPatterns: true,
  allowContractingPatterns: true,
  allowParallelChannels: true,
  
  patterns: {
    ascendingChannel: true,
    descendingChannel: true,
    rangingChannel: true,
    risingWedgeExpanding: true,
    fallingWedgeExpanding: true,
    risingWedgeContracting: true,
    fallingWedgeContracting: true,
    ascendingTriangleExpanding: true,
    descendingTriangleExpanding: true,
    ascendingTriangleContracting: true,
    descendingTriangleContracting: true,
    convergingTriangle: true,
    divergingTriangle: true
  },
  
  maxPatterns: 20
};

// ============ ZIGZAG DETECTION ============

function detectZigzagPivots(
  data: CandleData[],
  length: number,
  depth: number
): ZigzagPivot[] {
  const pivots: ZigzagPivot[] = [];
  
  for (let i = length; i < data.length - length; i++) {
    let isHighPivot = true;
    let isLowPivot = true;
    
    // Check left side
    for (let j = 1; j <= length; j++) {
      if (data[i - j].high >= data[i].high) isHighPivot = false;
      if (data[i - j].low <= data[i].low) isLowPivot = false;
    }
    
    // Check right side
    for (let j = 1; j <= length; j++) {
      if (i + j >= data.length) break;
      if (data[i + j].high >= data[i].high) isHighPivot = false;
      if (data[i + j].low <= data[i].low) isLowPivot = false;
    }
    
    if (isHighPivot) {
      pivots.push({ index: i, price: data[i].high, direction: 1 });
    } else if (isLowPivot) {
      pivots.push({ index: i, price: data[i].low, direction: -1 });
    }
  }
  
  // Filter by depth (minimum price movement between pivots)
  const filtered: ZigzagPivot[] = [];
  for (let i = 0; i < pivots.length; i++) {
    if (filtered.length === 0) {
      filtered.push(pivots[i]);
      continue;
    }
    
    const last = filtered[filtered.length - 1];
    const current = pivots[i];
    
    // Only add if direction alternates and depth is sufficient
    if (last.direction !== current.direction) {
      const priceMove = Math.abs(current.price - last.price);
      const avgPrice = (current.price + last.price) / 2;
      const percentMove = (priceMove / avgPrice) * 100;
      
      if (percentMove >= depth / 10) {
        filtered.push(current);
      }
    }
  }
  
  return filtered;
}

// ============ PATTERN DETECTION ============

function calculateTrendLine(p1: ZigzagPivot, p2: ZigzagPivot): { slope: number; intercept: number } {
  const dx = p2.index - p1.index;
  const dy = p2.price - p1.price;
  const slope = dx !== 0 ? dy / dx : 0;
  const intercept = p1.price - slope * p1.index;
  return { slope, intercept };
}

function getTrendLinePrice(slope: number, intercept: number, index: number): number {
  return slope * index + intercept;
}

function calculateError(pivots: ZigzagPivot[], slope: number, intercept: number): number {
  let totalError = 0;
  for (const pivot of pivots) {
    const expectedPrice = getTrendLinePrice(slope, intercept, pivot.index);
    const error = Math.abs(pivot.price - expectedPrice) / pivot.price;
    totalError += error;
  }
  return (totalError / pivots.length) * 100;
}

function isFlat(slope: number, avgPrice: number, flatThreshold: number): boolean {
  const priceChange = Math.abs(slope);
  const ratio = (priceChange / avgPrice) * 100;
  return ratio < flatThreshold;
}

function detectPattern(
  pivots: ZigzagPivot[],
  config: AutoChartPatternsConfig,
  zigzagLevel: number
): DetectedPattern | null {
  if (pivots.length < config.numberOfPivots) return null;
  
  // Take last N pivots
  const selectedPivots = pivots.slice(-config.numberOfPivots);
  
  // Separate high and low pivots
  const highPivots = selectedPivots.filter(p => p.direction === 1);
  const lowPivots = selectedPivots.filter(p => p.direction === -1);
  
  if (highPivots.length < 2 || lowPivots.length < 2) return null;
  
  // Calculate trendlines
  const upperLine = calculateTrendLine(highPivots[0], highPivots[highPivots.length - 1]);
  const lowerLine = calculateTrendLine(lowPivots[0], lowPivots[lowPivots.length - 1]);
  
  // Calculate errors
  const upperError = calculateError(highPivots, upperLine.slope, upperLine.intercept);
  const lowerError = calculateError(lowPivots, lowerLine.slope, lowerLine.intercept);
  const avgError = (upperError + lowerError) / 2;
  
  if (avgError > config.errorThreshold) return null;
  
  // Determine pattern type
  const avgPrice = (highPivots[0].price + lowPivots[0].price) / 2;
  const upperFlat = isFlat(upperLine.slope, avgPrice, config.flatThreshold);
  const lowerFlat = isFlat(lowerLine.slope, avgPrice, config.flatThreshold);
  const upperRising = upperLine.slope > 0;
  const lowerRising = lowerLine.slope > 0;
  
  const slopeRatio = Math.abs(upperLine.slope / lowerLine.slope);
  const isParallel = slopeRatio > 0.8 && slopeRatio < 1.2;
  const isConverging = (upperRising && !lowerRising) || (!upperRising && lowerRising);
  const isDiverging = (upperRising && lowerRising && upperLine.slope < lowerLine.slope) ||
                      (!upperRising && !lowerRising && upperLine.slope > lowerLine.slope);
  
  let patternType: PatternType | null = null;
  
  // Channels (Parallel)
  if (isParallel && config.allowChannels && config.allowParallelChannels) {
    if (upperRising && lowerRising && config.patterns.ascendingChannel && config.allowRisingPatterns) {
      patternType = 'ascending_channel';
    } else if (!upperRising && !lowerRising && config.patterns.descendingChannel && config.allowFallingPatterns) {
      patternType = 'descending_channel';
    } else if (upperFlat && lowerFlat && config.patterns.rangingChannel && config.allowNonDirectionalPatterns) {
      patternType = 'ranging_channel';
    }
  }
  
  // Wedges (Same direction, converging/diverging)
  if (config.allowWedges && upperRising === lowerRising) {
    if (upperRising) {
      if (isDiverging && config.patterns.risingWedgeExpanding && config.allowExpandingPatterns) {
        patternType = 'rising_wedge_expanding';
      } else if (isConverging && config.patterns.risingWedgeContracting && config.allowContractingPatterns) {
        patternType = 'rising_wedge_contracting';
      }
    } else {
      if (isDiverging && config.patterns.fallingWedgeExpanding && config.allowExpandingPatterns) {
        patternType = 'falling_wedge_expanding';
      } else if (isConverging && config.patterns.fallingWedgeContracting && config.allowContractingPatterns) {
        patternType = 'falling_wedge_contracting';
      }
    }
  }
  
  // Triangles (Opposite directions)
  if (config.allowTriangles && isConverging) {
    if (upperFlat && !lowerFlat) {
      if (lowerRising && config.patterns.ascendingTriangleContracting && config.allowContractingPatterns) {
        patternType = 'ascending_triangle_contracting';
      } else if (!lowerRising && config.patterns.descendingTriangleContracting && config.allowContractingPatterns) {
        patternType = 'descending_triangle_contracting';
      }
    } else if (lowerFlat && !upperFlat) {
      if (!upperRising && config.patterns.ascendingTriangleContracting && config.allowContractingPatterns) {
        patternType = 'ascending_triangle_contracting';
      } else if (upperRising && config.patterns.descendingTriangleContracting && config.allowContractingPatterns) {
        patternType = 'descending_triangle_contracting';
      }
    } else if (config.patterns.convergingTriangle && config.allowNonDirectionalPatterns) {
      patternType = 'converging_triangle';
    }
  }
  
  if (isDiverging && config.allowTriangles && config.allowExpandingPatterns) {
    if (upperFlat && lowerRising && config.patterns.ascendingTriangleExpanding) {
      patternType = 'ascending_triangle_expanding';
    } else if (lowerFlat && !upperRising && config.patterns.descendingTriangleExpanding) {
      patternType = 'descending_triangle_expanding';
    } else if (!upperFlat && !lowerFlat && config.patterns.divergingTriangle && config.allowNonDirectionalPatterns) {
      patternType = 'diverging_triangle';
    }
  }
  
  if (!patternType) return null;
  
  const startIndex = selectedPivots[0].index;
  const endIndex = selectedPivots[selectedPivots.length - 1].index;
  
  return {
    type: patternType,
    pivots: selectedPivots,
    startIndex,
    endIndex,
    upperTrendLine: {
      x1: startIndex,
      y1: getTrendLinePrice(upperLine.slope, upperLine.intercept, startIndex),
      x2: endIndex,
      y2: getTrendLinePrice(upperLine.slope, upperLine.intercept, endIndex)
    },
    lowerTrendLine: {
      x1: startIndex,
      y1: getTrendLinePrice(lowerLine.slope, lowerLine.intercept, startIndex),
      x2: endIndex,
      y2: getTrendLinePrice(lowerLine.slope, lowerLine.intercept, endIndex)
    },
    error: avgError,
    confidence: Math.max(0, 100 - avgError * 2),
    zigzagLevel
  };
}

// ============ MAIN CALCULATION ============

export interface AutoChartPatternsResult {
  patterns: DetectedPattern[];
  zigzagPivots: Map<number, ZigzagPivot[]>; // Level -> Pivots
}

export function calculateAutoChartPatterns(
  data: CandleData[],
  config: AutoChartPatternsConfig = defaultAutoChartPatternsConfig
): AutoChartPatternsResult {
  const allPatterns: DetectedPattern[] = [];
  const zigzagPivots = new Map<number, ZigzagPivot[]>();
  
  // Process each enabled zigzag
  config.zigzags.forEach((zigzagConfig, level) => {
    if (!zigzagConfig.enabled) return;
    
    const pivots = detectZigzagPivots(data, zigzagConfig.length, zigzagConfig.depth);
    zigzagPivots.set(level, pivots);
    
    // Detect patterns for this zigzag level
    const pattern = detectPattern(pivots, config, level);
    if (pattern) {
      // Check for overlap if avoidOverlap is enabled
      if (config.avoidOverlap) {
        const hasOverlap = allPatterns.some(p => 
          p.startIndex < pattern.endIndex && pattern.startIndex < p.endIndex
        );
        if (!hasOverlap) {
          allPatterns.push(pattern);
        }
      } else {
        allPatterns.push(pattern);
      }
    }
  });
  
  // Keep only the last N patterns
  const patterns = allPatterns.slice(-config.maxPatterns);
  
  return { patterns, zigzagPivots };
}

// ============ PATTERN DISPLAY NAMES ============

export function getPatternDisplayName(type: PatternType): string {
  const names: Record<PatternType, string> = {
    ascending_channel: 'Ascending Channel',
    descending_channel: 'Descending Channel',
    ranging_channel: 'Ranging Channel',
    rising_wedge_expanding: 'Rising Wedge (Expanding)',
    falling_wedge_expanding: 'Falling Wedge (Expanding)',
    rising_wedge_contracting: 'Rising Wedge (Contracting)',
    falling_wedge_contracting: 'Falling Wedge (Contracting)',
    ascending_triangle_expanding: 'Ascending Triangle (Expanding)',
    descending_triangle_expanding: 'Descending Triangle (Expanding)',
    ascending_triangle_contracting: 'Ascending Triangle (Contracting)',
    descending_triangle_contracting: 'Descending Triangle (Contracting)',
    converging_triangle: 'Converging Triangle',
    diverging_triangle: 'Diverging Triangle'
  };
  return names[type];
}

export function getPatternColor(type: PatternType): string {
  // Channels
  if (type.includes('channel')) {
    if (type === 'ascending_channel') return '#4CAF50';
    if (type === 'descending_channel') return '#F44336';
    return '#FFC107';
  }
  
  // Wedges
  if (type.includes('wedge')) {
    if (type.includes('rising')) return '#FF9800';
    return '#9C27B0';
  }
  
  // Triangles
  if (type.includes('ascending')) return '#2196F3';
  if (type.includes('descending')) return '#E91E63';
  if (type === 'converging_triangle') return '#00BCD4';
  if (type === 'diverging_triangle') return '#FF5722';
  
  return '#607D8B';
}
