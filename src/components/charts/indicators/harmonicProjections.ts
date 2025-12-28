/**
 * Manual Harmonic Projections [HeWhoMustNotBeNamed]
 * Based on TradingView indicator by HeWhoMustNotBeNamed
 * 
 * Features:
 * - 25 Harmonic pattern types detection
 * - XABCD pattern drawing with ratios
 * - PRZ (Potential Reversal Zone) projection
 * - Classic, Anti, and Non-Standard patterns
 * - Automatic D point projection
 * 
 * Mozilla Public License 2.0
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface HarmonicProjectionsConfig {
  // Display options
  showXABCD: boolean;
  showRatios: boolean;
  fillMajorTriangles: boolean;
  majorFillTransparency: number;
  fillMinorTriangles: boolean;
  minorFillTransparency: number;
  
  // Error tolerance
  errorPercent: number;
  
  // Pattern color
  patternColor: string;
  
  // Category toggles
  classic: boolean;
  anti: boolean;
  nonStandard: boolean;
  
  // Classic Patterns
  gartley: boolean;
  bat: boolean;
  butterfly: boolean;
  crab: boolean;
  deepCrab: boolean;
  cypher: boolean;
  shark: boolean;
  nenStar: boolean;
  
  // Anti Patterns
  antiNenStar: boolean;
  antiShark: boolean;
  antiCypher: boolean;
  antiCrab: boolean;
  antiButterfly: boolean;
  antiBat: boolean;
  antiGartley: boolean;
  navarro200: boolean;
  
  // Non-Standard Patterns
  fiveZero: boolean;
  threeDrives: boolean;
  whiteSwann: boolean;
  blackSwann: boolean;
  seaPony: boolean;
  leonardo: boolean;
  oneTwoOne: boolean;
  snorm: boolean;
  totalPattern: boolean;
  
  // Auto-detection settings
  autoDetect: boolean;
  zigzagLength: number;
  minPatternBars: number;
  maxPatternBars: number;
}

export interface HarmonicPoint {
  price: number;
  index: number;
  label: string;
}

export interface HarmonicRatio {
  name: string;
  value: number;
  position: { index: number; price: number };
}

export interface PRZRange {
  startPrice: number;
  endPrice: number;
  patternNames: string[];
}

export interface HarmonicPattern {
  // Pattern identification
  name: string;
  type: 'classic' | 'anti' | 'nonstandard';
  direction: 'bullish' | 'bearish';
  
  // XABCD Points
  x: HarmonicPoint;
  a: HarmonicPoint;
  b: HarmonicPoint;
  c: HarmonicPoint;
  d?: HarmonicPoint;  // Projected D point
  
  // Ratios
  xabRatio: number;
  abcRatio: number;
  bcdRatio?: number;
  xadRatio?: number;
  axcRatio?: number;  // For Cypher
  xcdRatio?: number;  // For Cypher
  
  // PRZ (Potential Reversal Zone)
  przRanges: PRZRange[];
  
  // Pattern validity
  isValid: boolean;
  confidence: number;  // 0-100
  
  // Color
  color: string;
}

export interface HarmonicProjectionsResult {
  // Detected patterns
  patterns: HarmonicPattern[];
  
  // All zigzag pivots (for auto-detection)
  pivots: HarmonicPoint[];
  
  // Summary
  classicCount: number;
  antiCount: number;
  nonStandardCount: number;
  bullishCount: number;
  bearishCount: number;
}

export const defaultHarmonicConfig: HarmonicProjectionsConfig = {
  showXABCD: true,
  showRatios: true,
  fillMajorTriangles: true,
  majorFillTransparency: 70,
  fillMinorTriangles: true,
  minorFillTransparency: 90,
  errorPercent: 8,
  patternColor: '#9333ea',  // Purple
  classic: true,
  anti: true,
  nonStandard: true,
  gartley: true,
  bat: true,
  butterfly: true,
  crab: true,
  deepCrab: true,
  cypher: true,
  shark: true,
  nenStar: true,
  antiNenStar: true,
  antiShark: true,
  antiCypher: true,
  antiCrab: true,
  antiButterfly: true,
  antiBat: true,
  antiGartley: true,
  navarro200: true,
  fiveZero: true,
  threeDrives: true,
  whiteSwann: true,
  blackSwann: true,
  seaPony: true,
  leonardo: true,
  oneTwoOne: true,
  snorm: true,
  totalPattern: true,
  autoDetect: true,
  zigzagLength: 5,
  minPatternBars: 10,
  maxPatternBars: 200
};

// Pattern definitions with ratio requirements
interface PatternDefinition {
  name: string;
  type: 'classic' | 'anti' | 'nonstandard';
  xabMin: number;
  xabMax: number;
  abcMin: number;
  abcMax: number;
  bcdMin: number;
  bcdMax: number;
  xadMin: number;
  xadMax: number;
  usesAXC?: boolean;  // For Cypher-type patterns
  axcMin?: number;
  axcMax?: number;
}

const PATTERN_DEFINITIONS: PatternDefinition[] = [
  // Classic Patterns
  { name: 'Gartley', type: 'classic', xabMin: 0.618, xabMax: 0.618, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.272, bcdMax: 1.618, xadMin: 0.786, xadMax: 0.786 },
  { name: 'Crab', type: 'classic', xabMin: 0.382, xabMax: 0.618, abcMin: 0.382, abcMax: 0.886, bcdMin: 2.240, bcdMax: 3.618, xadMin: 1.618, xadMax: 1.618 },
  { name: 'Deep Crab', type: 'classic', xabMin: 0.886, xabMax: 0.886, abcMin: 0.382, abcMax: 0.886, bcdMin: 2.000, bcdMax: 3.618, xadMin: 1.618, xadMax: 1.618 },
  { name: 'Bat', type: 'classic', xabMin: 0.382, xabMax: 0.500, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.618, bcdMax: 2.618, xadMin: 0.886, xadMax: 0.886 },
  { name: 'Butterfly', type: 'classic', xabMin: 0.786, xabMax: 0.786, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.618, bcdMax: 2.618, xadMin: 1.272, xadMax: 1.618 },
  { name: 'Shark', type: 'classic', xabMin: 0.446, xabMax: 0.618, abcMin: 1.130, abcMax: 1.618, bcdMin: 1.618, bcdMax: 2.236, xadMin: 0.886, xadMax: 0.886 },
  { name: 'Cypher', type: 'classic', xabMin: 0.382, xabMax: 0.618, abcMin: 1.130, abcMax: 1.414, bcdMin: 1.272, bcdMax: 2.000, xadMin: 0.786, xadMax: 0.786, usesAXC: true, axcMin: 0.786, axcMax: 0.786 },
  { name: 'Nen Star', type: 'classic', xabMin: 0.382, xabMax: 0.618, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.272, bcdMax: 2.000, xadMin: 1.272, xadMax: 1.272 },
  
  // Anti Patterns
  { name: 'Anti Nen Star', type: 'anti', xabMin: 0.500, xabMax: 0.786, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.618, bcdMax: 2.618, xadMin: 0.786, xadMax: 0.786 },
  { name: 'Anti Shark', type: 'anti', xabMin: 0.446, xabMax: 0.618, abcMin: 0.618, abcMax: 0.886, bcdMin: 1.618, bcdMax: 2.618, xadMin: 1.130, xadMax: 1.130 },
  { name: 'Anti Cypher', type: 'anti', xabMin: 0.500, xabMax: 0.786, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.618, bcdMax: 2.618, xadMin: 1.272, xadMax: 1.272 },
  { name: 'Anti Crab', type: 'anti', xabMin: 0.382, xabMax: 0.618, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.618, bcdMax: 2.618, xadMin: 0.618, xadMax: 0.618 },
  { name: 'Anti Butterfly', type: 'anti', xabMin: 0.382, xabMax: 0.618, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.272, bcdMax: 1.272, xadMin: 0.618, xadMax: 0.786 },
  { name: 'Anti Bat', type: 'anti', xabMin: 0.382, xabMax: 0.618, abcMin: 0.382, abcMax: 0.886, bcdMin: 2.000, bcdMax: 2.618, xadMin: 1.128, xadMax: 1.128 },
  { name: 'Anti Gartley', type: 'anti', xabMin: 0.618, xabMax: 0.786, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.168, bcdMax: 1.618, xadMin: 1.272, xadMax: 1.618 },
  { name: 'Navarro 200', type: 'anti', xabMin: 0.382, xabMax: 0.786, abcMin: 0.886, abcMax: 1.127, bcdMin: 0.886, bcdMax: 3.618, xadMin: 0.886, xadMax: 1.127 },
  
  // Non-Standard Patterns
  { name: 'Five Zero', type: 'nonstandard', xabMin: 1.130, xabMax: 1.618, abcMin: 1.618, abcMax: 2.240, bcdMin: 0.500, bcdMax: 0.500, xadMin: 0.500, xadMax: 0.500 },
  { name: 'Three Drives', type: 'nonstandard', xabMin: 0.618, xabMax: 0.786, abcMin: 1.272, abcMax: 1.618, bcdMin: 0.618, bcdMax: 0.786, xadMin: 1.272, xadMax: 1.618 },
  { name: 'White Swan', type: 'nonstandard', xabMin: 0.382, xabMax: 0.786, abcMin: 2.000, abcMax: 4.237, bcdMin: 0.500, bcdMax: 0.886, xadMin: 0.236, xadMax: 0.500 },
  { name: 'Black Swan', type: 'nonstandard', xabMin: 1.382, xabMax: 2.618, abcMin: 0.236, abcMax: 0.500, bcdMin: 1.128, bcdMax: 2.000, xadMin: 2.000, xadMax: 4.237 },
  { name: 'Sea Pony', type: 'nonstandard', xabMin: 0.128, xabMax: 0.618, abcMin: 0.618, abcMax: 3.618, bcdMin: 1.618, bcdMax: 2.618, xadMin: 0.786, xadMax: 0.786 },
  { name: 'Leonardo', type: 'nonstandard', xabMin: 0.500, xabMax: 0.500, abcMin: 0.382, abcMax: 0.886, bcdMin: 1.128, bcdMax: 2.618, xadMin: 0.786, xadMax: 0.786 },
  { name: '121', type: 'nonstandard', xabMin: 0.500, xabMax: 0.786, abcMin: 1.128, abcMax: 3.618, bcdMin: 0.382, bcdMax: 0.786, xadMin: 0.382, xadMax: 0.786 },
  { name: 'Snorm', type: 'nonstandard', xabMin: 0.900, xabMax: 1.100, abcMin: 0.618, abcMax: 0.786, bcdMin: 0.900, bcdMax: 1.100, xadMin: 0.618, xadMax: 0.786 },
  { name: 'Total', type: 'nonstandard', xabMin: 0.236, xabMax: 0.786, abcMin: 1.128, abcMax: 2.618, bcdMin: 1.618, bcdMax: 2.618, xadMin: 0.786, xadMax: 0.886 }
];

/**
 * Check if a ratio is within tolerance
 */
function isRatioInRange(value: number, min: number, max: number, errorPercent: number): boolean {
  const tolerance = (max - min) * (errorPercent / 100) + 0.001;
  const adjustedMin = min - tolerance;
  const adjustedMax = max + tolerance;
  return value >= adjustedMin && value <= adjustedMax;
}

/**
 * Calculate PRZ range for a pattern
 */
function calculatePRZRange(
  x: number, a: number, b: number, c: number,
  xadMin: number, xadMax: number,
  bcdMin: number, bcdMax: number,
  errorPercent: number
): { start: number; end: number } | null {
  const xa = Math.abs(a - x);
  const bc = Math.abs(c - b);
  const dir = c > b ? 1 : -1;
  
  // Calculate D based on XAD ratio
  const dFromXAD_min = a - dir * xa * xadMin;
  const dFromXAD_max = a - dir * xa * xadMax;
  
  // Calculate D based on BCD ratio
  const dFromBCD_min = c - dir * bc * bcdMin;
  const dFromBCD_max = c - dir * bc * bcdMax;
  
  // Find overlapping range
  const tolerance = (errorPercent / 100);
  
  let start: number, end: number;
  
  if (dir > 0) {
    // Bearish pattern (D below C)
    start = Math.min(dFromXAD_min, dFromXAD_max, dFromBCD_min, dFromBCD_max);
    end = Math.max(dFromXAD_min, dFromXAD_max, dFromBCD_min, dFromBCD_max);
  } else {
    // Bullish pattern (D above C)
    start = Math.max(dFromXAD_min, dFromXAD_max, dFromBCD_min, dFromBCD_max);
    end = Math.min(dFromXAD_min, dFromXAD_max, dFromBCD_min, dFromBCD_max);
  }
  
  return { start, end };
}

/**
 * Find zigzag pivots
 */
function findZigzagPivots(data: CandleData[], length: number): HarmonicPoint[] {
  const pivots: HarmonicPoint[] = [];
  
  if (data.length < length * 2 + 1) return pivots;
  
  let lastPivotType: 'high' | 'low' | null = null;
  let lastPivotPrice = 0;
  
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
    
    if (isPivotHigh && lastPivotType !== 'high') {
      pivots.push({
        price: data[i].high,
        index: i,
        label: 'H'
      });
      lastPivotType = 'high';
      lastPivotPrice = data[i].high;
    } else if (isPivotLow && lastPivotType !== 'low') {
      pivots.push({
        price: data[i].low,
        index: i,
        label: 'L'
      });
      lastPivotType = 'low';
      lastPivotPrice = data[i].low;
    }
  }
  
  return pivots;
}

/**
 * Check if XABC matches a harmonic pattern
 */
function checkPatternMatch(
  x: number, a: number, b: number, c: number,
  definition: PatternDefinition,
  errorPercent: number
): { matches: boolean; xabRatio: number; abcRatio: number; axcRatio?: number } {
  const xa = Math.abs(a - x);
  const ab = Math.abs(b - a);
  const bc = Math.abs(c - b);
  
  const xabRatio = ab / xa;
  const abcRatio = bc / ab;
  
  // Check XAB ratio
  if (!isRatioInRange(xabRatio, definition.xabMin, definition.xabMax, errorPercent)) {
    return { matches: false, xabRatio, abcRatio };
  }
  
  // Check ABC ratio
  if (!isRatioInRange(abcRatio, definition.abcMin, definition.abcMax, errorPercent)) {
    return { matches: false, xabRatio, abcRatio };
  }
  
  // For Cypher-type patterns, check AXC ratio
  if (definition.usesAXC && definition.axcMin !== undefined && definition.axcMax !== undefined) {
    const xc = Math.abs(c - x);
    const axcRatio = xc / xa;
    
    if (!isRatioInRange(axcRatio, definition.axcMin, definition.axcMax, errorPercent)) {
      return { matches: false, xabRatio, abcRatio, axcRatio };
    }
    
    return { matches: true, xabRatio, abcRatio, axcRatio };
  }
  
  return { matches: true, xabRatio, abcRatio };
}

/**
 * Detect harmonic patterns from XABC points
 */
function detectHarmonicPatterns(
  x: HarmonicPoint,
  a: HarmonicPoint,
  b: HarmonicPoint,
  c: HarmonicPoint,
  config: HarmonicProjectionsConfig
): HarmonicPattern[] {
  const patterns: HarmonicPattern[] = [];
  
  const dir = c.price > b.price ? 1 : -1;  // 1 = bearish, -1 = bullish
  const direction: 'bullish' | 'bearish' = dir > 0 ? 'bearish' : 'bullish';
  
  for (const def of PATTERN_DEFINITIONS) {
    // Check if pattern type is enabled
    if (def.type === 'classic' && !config.classic) continue;
    if (def.type === 'anti' && !config.anti) continue;
    if (def.type === 'nonstandard' && !config.nonStandard) continue;
    
    // Check if specific pattern is enabled
    const patternKey = def.name.toLowerCase().replace(/ /g, '').replace('-', '');
    if (!isPatternEnabled(def.name, config)) continue;
    
    // Check if XABC matches pattern
    const { matches, xabRatio, abcRatio, axcRatio } = checkPatternMatch(
      x.price, a.price, b.price, c.price,
      def,
      config.errorPercent
    );
    
    if (!matches) continue;
    
    // Calculate PRZ
    const przResult = calculatePRZRange(
      x.price, a.price, b.price, c.price,
      def.xadMin, def.xadMax,
      def.bcdMin, def.bcdMax,
      config.errorPercent
    );
    
    if (!przResult) continue;
    
    // Calculate projected D point
    const dPrice = (przResult.start + przResult.end) / 2;
    const dIndex = c.index + Math.round((c.index - b.index) * 0.618);
    
    // Calculate additional ratios for D
    const xa = Math.abs(a.price - x.price);
    const bc = Math.abs(c.price - b.price);
    const cd = Math.abs(dPrice - c.price);
    const ad = Math.abs(dPrice - a.price);
    
    const bcdRatio = cd / bc;
    const xadRatio = ad / xa;
    
    // Calculate confidence based on how close ratios are to ideal
    const xabError = Math.abs(xabRatio - (def.xabMin + def.xabMax) / 2) / ((def.xabMax - def.xabMin) / 2 + 0.01);
    const abcError = Math.abs(abcRatio - (def.abcMin + def.abcMax) / 2) / ((def.abcMax - def.abcMin) / 2 + 0.01);
    const confidence = Math.max(0, Math.min(100, 100 - (xabError + abcError) * 25));
    
    patterns.push({
      name: def.name,
      type: def.type,
      direction,
      x,
      a,
      b,
      c,
      d: {
        price: dPrice,
        index: dIndex,
        label: 'D'
      },
      xabRatio,
      abcRatio,
      bcdRatio,
      xadRatio,
      axcRatio,
      przRanges: [{
        startPrice: przResult.start,
        endPrice: przResult.end,
        patternNames: [def.name]
      }],
      isValid: true,
      confidence,
      color: config.patternColor
    });
  }
  
  return patterns;
}

/**
 * Check if specific pattern is enabled in config
 */
function isPatternEnabled(patternName: string, config: HarmonicProjectionsConfig): boolean {
  const mapping: Record<string, boolean> = {
    'Gartley': config.gartley,
    'Crab': config.crab,
    'Deep Crab': config.deepCrab,
    'Bat': config.bat,
    'Butterfly': config.butterfly,
    'Shark': config.shark,
    'Cypher': config.cypher,
    'Nen Star': config.nenStar,
    'Anti Nen Star': config.antiNenStar,
    'Anti Shark': config.antiShark,
    'Anti Cypher': config.antiCypher,
    'Anti Crab': config.antiCrab,
    'Anti Butterfly': config.antiButterfly,
    'Anti Bat': config.antiBat,
    'Anti Gartley': config.antiGartley,
    'Navarro 200': config.navarro200,
    'Five Zero': config.fiveZero,
    'Three Drives': config.threeDrives,
    'White Swan': config.whiteSwann,
    'Black Swan': config.blackSwann,
    'Sea Pony': config.seaPony,
    'Leonardo': config.leonardo,
    '121': config.oneTwoOne,
    'Snorm': config.snorm,
    'Total': config.totalPattern
  };
  
  return mapping[patternName] ?? true;
}

/**
 * Merge overlapping PRZ ranges
 */
function mergePRZRanges(patterns: HarmonicPattern[]): PRZRange[] {
  const mergedRanges: PRZRange[] = [];
  
  for (const pattern of patterns) {
    for (const prz of pattern.przRanges) {
      let merged = false;
      
      for (const existing of mergedRanges) {
        const dir = prz.startPrice > prz.endPrice ? 1 : -1;
        const overlaps = (
          (prz.startPrice * dir <= existing.startPrice * dir && prz.startPrice * dir >= existing.endPrice * dir) ||
          (existing.startPrice * dir <= prz.startPrice * dir && existing.startPrice * dir >= prz.endPrice * dir)
        );
        
        if (overlaps) {
          if (dir > 0) {
            existing.startPrice = Math.max(prz.startPrice, existing.startPrice);
            existing.endPrice = Math.min(prz.endPrice, existing.endPrice);
          } else {
            existing.startPrice = Math.min(prz.startPrice, existing.startPrice);
            existing.endPrice = Math.max(prz.endPrice, existing.endPrice);
          }
          existing.patternNames.push(...prz.patternNames);
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        mergedRanges.push({
          startPrice: prz.startPrice,
          endPrice: prz.endPrice,
          patternNames: [...prz.patternNames]
        });
      }
    }
  }
  
  return mergedRanges;
}

/**
 * Auto-detect harmonic patterns from candle data
 */
function autoDetectPatterns(
  data: CandleData[],
  config: HarmonicProjectionsConfig
): HarmonicPattern[] {
  const pivots = findZigzagPivots(data, config.zigzagLength);
  const patterns: HarmonicPattern[] = [];
  
  if (pivots.length < 4) return patterns;
  
  // Look for potential XABC combinations
  for (let xIdx = 0; xIdx < pivots.length - 3; xIdx++) {
    const x = pivots[xIdx];
    const a = pivots[xIdx + 1];
    const b = pivots[xIdx + 2];
    const c = pivots[xIdx + 3];
    
    // Check pattern bar range
    const patternBars = c.index - x.index;
    if (patternBars < config.minPatternBars || patternBars > config.maxPatternBars) continue;
    
    // Detect patterns for this XABC
    const detected = detectHarmonicPatterns(x, a, b, c, config);
    
    // Add unique patterns
    for (const pattern of detected) {
      const isDuplicate = patterns.some(p => 
        p.name === pattern.name &&
        p.x.index === pattern.x.index &&
        p.c.index === pattern.c.index
      );
      
      if (!isDuplicate) {
        patterns.push(pattern);
      }
    }
  }
  
  return patterns;
}

/**
 * Main calculation function
 */
export function calculateHarmonicProjections(
  data: CandleData[],
  config: Partial<HarmonicProjectionsConfig> = {},
  manualPoints?: { x?: HarmonicPoint; a?: HarmonicPoint; b?: HarmonicPoint; c?: HarmonicPoint }
): HarmonicProjectionsResult {
  const cfg = { ...defaultHarmonicConfig, ...config };
  
  const result: HarmonicProjectionsResult = {
    patterns: [],
    pivots: [],
    classicCount: 0,
    antiCount: 0,
    nonStandardCount: 0,
    bullishCount: 0,
    bearishCount: 0
  };
  
  if (data.length < 20) return result;
  
  // Find pivots for reference
  result.pivots = findZigzagPivots(data, cfg.zigzagLength);
  
  // If manual points provided, use them
  if (manualPoints?.x && manualPoints?.a && manualPoints?.b && manualPoints?.c) {
    result.patterns = detectHarmonicPatterns(
      manualPoints.x,
      manualPoints.a,
      manualPoints.b,
      manualPoints.c,
      cfg
    );
  } else if (cfg.autoDetect) {
    // Auto-detect patterns
    result.patterns = autoDetectPatterns(data, cfg);
  }
  
  // Count patterns by type
  for (const pattern of result.patterns) {
    if (pattern.type === 'classic') result.classicCount++;
    else if (pattern.type === 'anti') result.antiCount++;
    else result.nonStandardCount++;
    
    if (pattern.direction === 'bullish') result.bullishCount++;
    else result.bearishCount++;
  }
  
  return result;
}

/**
 * Get pattern display info
 */
export function getPatternDisplayInfo(pattern: HarmonicPattern): {
  label: string;
  shortLabel: string;
  ratioText: string;
  przText: string;
} {
  const shortLabel = pattern.name.split(' ').map(w => w[0]).join('');
  const dirArrow = pattern.direction === 'bullish' ? '↑' : '↓';
  
  const ratioText = [
    `XAB: ${pattern.xabRatio.toFixed(3)}`,
    `ABC: ${pattern.abcRatio.toFixed(3)}`,
    pattern.bcdRatio ? `BCD: ${pattern.bcdRatio.toFixed(3)}` : '',
    pattern.xadRatio ? `XAD: ${pattern.xadRatio.toFixed(3)}` : '',
    pattern.axcRatio ? `AXC: ${pattern.axcRatio.toFixed(3)}` : ''
  ].filter(Boolean).join('\n');
  
  const przText = pattern.przRanges.length > 0 ?
    `PRZ: ${pattern.przRanges[0].startPrice.toFixed(2)} - ${pattern.przRanges[0].endPrice.toFixed(2)}` : '';
  
  return {
    label: `${pattern.name} ${dirArrow}`,
    shortLabel: `${shortLabel}${dirArrow}`,
    ratioText,
    przText
  };
}

/**
 * Get color for pattern based on type
 */
export function getPatternColor(pattern: HarmonicPattern): string {
  if (pattern.type === 'classic') {
    return pattern.direction === 'bullish' ? '#22c55e' : '#ef4444';
  } else if (pattern.type === 'anti') {
    return pattern.direction === 'bullish' ? '#3b82f6' : '#f97316';
  } else {
    return pattern.direction === 'bullish' ? '#a855f7' : '#ec4899';
  }
}

export default calculateHarmonicProjections;
