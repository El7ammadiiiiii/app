// Harmonic Pattern Detection, Prediction, and Backtesting System
// License: MPL 2.0 - https://mozilla.org/MPL/2.0/
// © reees
//
// TypeScript implementation for Next.js/ECharts
// Multi-pattern harmonic detection with scoring, targets, and statistics

export interface HarmonicSystemConfig {
  // Pattern types to include
  gartleyOn: boolean;
  batOn: boolean;
  butterflyOn: boolean;
  crabOn: boolean;
  sharkOn: boolean;
  cypherOn: boolean;
  // Direction
  bullishOn: boolean;
  bearishOn: boolean;
  incompleteOn: boolean;
  // Validation
  allowedFibError: number;      // Allowed fib ratio error % (default: 15)
  allowedAsymmetry: number;     // Allowed leg length asymmetry % (default: 250)
  validationBars: number;       // Trailing bars for validation (default: 1)
  // Scoring weights
  weightError: number;          // Weight of retracement error (default: 4)
  weightPRZ: number;            // Weight of PRZ confluence (default: 2)
  weightD: number;              // Weight of D/PRZ confluence (default: 3)
  // Entry/Stop
  minScore: number;             // Minimum score for entry (default: 90)
  stopPercent: number;          // Stop loss % (default: 75)
}

export type PatternType = 'gartley' | 'bat' | 'butterfly' | 'crab' | 'shark' | 'cypher';

export interface Point {
  index: number;
  price: number;
}

export interface HarmonicRatios {
  xab: number;      // AB/XA ratio
  abc: number;      // BC/AB ratio
  bcd: number;      // CD/BC ratio
  xad: number;      // AD/XA or CD/XC ratio
}

export interface PatternRatioRanges {
  xab: [number, number];
  abc: [number, number];
  bcd: [number, number];
  xad: [number, number];
}

export interface HarmonicPattern {
  type: PatternType;
  bullish: boolean;
  complete: boolean;
  x: Point;
  a: Point;
  b: Point;
  c: Point;
  d: Point | null;
  ratios: HarmonicRatios;
  ratioErrors: HarmonicRatios;
  score: number;
  przLevels: number[];      // Potential Reversal Zone levels
  target1: number | null;
  target2: number | null;
  stop: number | null;
  entry: number | null;
  status: 'pending' | 'active' | 'success_t1' | 'success_t2' | 'failed' | 'timeout' | 'no_entry';
}

export interface HarmonicSystemResult {
  patterns: HarmonicPattern[];
  stats: PatternStats;
}

export interface PatternStats {
  total: number;
  byType: Record<PatternType, TypeStats>;
}

export interface TypeStats {
  count: number;
  trades: number;
  t1Success: number;
  t2Success: number;
  avgReturn: number;
  totalReturn: number;
}

// Harmonic pattern ratio definitions
const PATTERN_RATIOS: Record<PatternType, PatternRatioRanges> = {
  gartley: {
    xab: [0.618, 0.618],
    abc: [0.382, 0.886],
    bcd: [1.13, 1.618],
    xad: [0.786, 0.786]
  },
  bat: {
    xab: [0.382, 0.50],
    abc: [0.382, 0.886],
    bcd: [1.618, 2.618],
    xad: [0.886, 0.886]
  },
  butterfly: {
    xab: [0.786, 0.786],
    abc: [0.382, 0.886],
    bcd: [1.618, 2.618],
    xad: [1.27, 1.618]
  },
  crab: {
    xab: [0.382, 0.618],
    abc: [0.382, 0.886],
    bcd: [2.24, 3.618],
    xad: [1.618, 1.618]
  },
  shark: {
    xab: [0.446, 0.618],   // Actually OX/XA for shark
    abc: [1.13, 1.618],
    bcd: [1.618, 2.24],
    xad: [0.886, 1.13]
  },
  cypher: {
    xab: [0.382, 0.618],
    abc: [1.13, 1.414],
    bcd: [1.272, 2.0],
    xad: [0.786, 0.786]    // CD/XC for cypher
  }
};

// Pattern symbols for display
const PATTERN_SYMBOLS: Record<PatternType, string> = {
  gartley: '🦋',
  bat: '🦇',
  butterfly: '🦋',
  crab: '🦀',
  shark: '🦈',
  cypher: '🔷'
};

/**
 * Check if a ratio is within allowed error of target range
 */
function isRatioValid(ratio: number, range: [number, number], errorPct: number): boolean {
  const [min, max] = range;
  const errorMult = 1 + errorPct / 100;
  return ratio >= min / errorMult && ratio <= max * errorMult;
}

/**
 * Calculate ratio error percentage
 */
function getRatioError(ratio: number, range: [number, number]): number {
  const [min, max] = range;
  const target = (min + max) / 2;
  return Math.abs(ratio - target) / target;
}

/**
 * Detect pivot points (swing highs and lows)
 */
function detectPivots(
  highs: number[],
  lows: number[],
  leftBars: number = 5,
  rightBars: number = 2
): { highs: Point[]; lows: Point[] } {
  const pivotHighs: Point[] = [];
  const pivotLows: Point[] = [];

  for (let i = leftBars; i < highs.length - rightBars; i++) {
    let isHigh = true;
    let isLow = true;

    // Check left side
    for (let j = 1; j <= leftBars; j++) {
      if (highs[i] <= highs[i - j]) isHigh = false;
      if (lows[i] >= lows[i - j]) isLow = false;
    }

    // Check right side
    for (let j = 1; j <= rightBars; j++) {
      if (highs[i] <= highs[i + j]) isHigh = false;
      if (lows[i] >= lows[i + j]) isLow = false;
    }

    if (isHigh) pivotHighs.push({ index: i, price: highs[i] });
    if (isLow) pivotLows.push({ index: i, price: lows[i] });
  }

  return { highs: pivotHighs, lows: pivotLows };
}

/**
 * Check leg length symmetry
 */
function isSymmetryValid(
  leg1: number,
  leg2: number,
  leg3: number,
  leg4: number,
  asymPct: number
): boolean {
  const legs = [leg1, leg2, leg3, leg4].filter(l => l > 0);
  if (legs.length < 3) return true;
  
  const avg = legs.reduce((a, b) => a + b, 0) / legs.length;
  const maxDev = asymPct / 100;
  
  for (const leg of legs) {
    if (Math.abs(leg - avg) / avg > maxDev) return false;
  }
  return true;
}

/**
 * Calculate pattern score
 */
function calculateScore(
  ratioErrors: HarmonicRatios,
  przConfluence: number,
  dConfluence: number,
  weights: { error: number; prz: number; d: number }
): number {
  // Average ratio error (lower is better)
  const avgError = (
    ratioErrors.xab + 
    ratioErrors.abc + 
    ratioErrors.bcd + 
    ratioErrors.xad
  ) / 4;
  
  const errorScore = Math.max(0, 1 - avgError);
  const totalWeight = weights.error + weights.prz + weights.d;
  
  const score = (
    errorScore * weights.error +
    przConfluence * weights.prz +
    dConfluence * weights.d
  ) / totalWeight;
  
  return Math.min(1, Math.max(0, score));
}

/**
 * Calculate PRZ (Potential Reversal Zone) levels
 */
function calculatePRZ(
  type: PatternType,
  x: number,
  a: number,
  b: number,
  c: number,
  bullish: boolean
): number[] {
  const xa = Math.abs(a - x);
  const bc = Math.abs(c - b);
  const levels: number[] = [];
  
  const ratios = PATTERN_RATIOS[type];
  
  // BC projection levels
  const bcProj1 = bullish ? c - bc * ratios.bcd[0] : c + bc * ratios.bcd[0];
  const bcProj2 = bullish ? c - bc * ratios.bcd[1] : c + bc * ratios.bcd[1];
  
  // XA retracement levels
  let xaRet: number;
  if (type === 'cypher') {
    const xc = Math.abs(c - x);
    xaRet = bullish ? c - xc * ratios.xad[0] : c + xc * ratios.xad[0];
  } else {
    xaRet = bullish ? a - xa * (ratios.xad[0] - 1) : a + xa * (ratios.xad[0] - 1);
  }
  
  levels.push(bcProj1, bcProj2, xaRet);
  return levels.sort((a, b) => bullish ? a - b : b - a);
}

/**
 * Calculate target levels
 */
function calculateTargets(
  type: PatternType,
  x: number,
  a: number,
  d: number,
  bullish: boolean
): [number, number] {
  const ad = Math.abs(d - a);
  const xa = Math.abs(a - x);
  
  // Target 1: 0.618 AD retracement
  const t1 = bullish ? d + ad * 0.618 : d - ad * 0.618;
  
  // Target 2: 1.272 AD or A level
  const t2 = bullish ? d + ad * 1.272 : d - ad * 1.272;
  
  return [t1, t2];
}

/**
 * Calculate stop loss
 */
function calculateStop(
  x: number,
  d: number,
  entry: number,
  target1: number,
  bullish: boolean,
  stopPct: number
): number {
  const distToTarget = Math.abs(target1 - entry);
  const stopDist = distToTarget * (stopPct / 100);
  
  return bullish ? entry - stopDist : entry + stopDist;
}

/**
 * Validate XABC structure for potential pattern
 */
function validateXABC(
  x: Point,
  a: Point,
  b: Point,
  c: Point,
  bullish: boolean,
  config: HarmonicSystemConfig
): PatternType[] {
  const validTypes: PatternType[] = [];
  
  // Calculate ratios
  const xa = Math.abs(a.price - x.price);
  const ab = Math.abs(b.price - a.price);
  const bc = Math.abs(c.price - b.price);
  
  if (xa === 0 || ab === 0) return validTypes;
  
  const xab = ab / xa;
  const abc = bc / ab;
  
  // Check structure validity
  if (bullish) {
    if (!(a.price > x.price && b.price < a.price && b.price > x.price && c.price > b.price && c.price < a.price)) {
      return validTypes;
    }
  } else {
    if (!(a.price < x.price && b.price > a.price && b.price < x.price && c.price < b.price && c.price > a.price)) {
      return validTypes;
    }
  }
  
  // Check each pattern type
  const types: PatternType[] = ['gartley', 'bat', 'butterfly', 'crab', 'shark', 'cypher'];
  
  for (const type of types) {
    if (!isPatternEnabled(type, config)) continue;
    
    const ratios = PATTERN_RATIOS[type];
    
    if (isRatioValid(xab, ratios.xab, config.allowedFibError) &&
        isRatioValid(abc, ratios.abc, config.allowedFibError)) {
      validTypes.push(type);
    }
  }
  
  return validTypes;
}

/**
 * Check if pattern type is enabled
 */
function isPatternEnabled(type: PatternType, config: HarmonicSystemConfig): boolean {
  switch (type) {
    case 'gartley': return config.gartleyOn;
    case 'bat': return config.batOn;
    case 'butterfly': return config.butterflyOn;
    case 'crab': return config.crabOn;
    case 'shark': return config.sharkOn;
    case 'cypher': return config.cypherOn;
  }
}

/**
 * Validate complete XABCD pattern
 */
function validateXABCD(
  x: Point,
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  type: PatternType,
  bullish: boolean,
  config: HarmonicSystemConfig
): HarmonicPattern | null {
  const xa = Math.abs(a.price - x.price);
  const ab = Math.abs(b.price - a.price);
  const bc = Math.abs(c.price - b.price);
  const cd = Math.abs(d.price - c.price);
  const ad = Math.abs(d.price - a.price);
  const xc = Math.abs(c.price - x.price);
  
  if (xa === 0 || ab === 0 || bc === 0) return null;
  
  const ratios: HarmonicRatios = {
    xab: ab / xa,
    abc: bc / ab,
    bcd: cd / bc,
    xad: type === 'cypher' ? cd / xc : ad / xa
  };
  
  const patternRatios = PATTERN_RATIOS[type];
  
  // Validate all ratios
  if (!isRatioValid(ratios.xab, patternRatios.xab, config.allowedFibError) ||
      !isRatioValid(ratios.abc, patternRatios.abc, config.allowedFibError) ||
      !isRatioValid(ratios.bcd, patternRatios.bcd, config.allowedFibError) ||
      !isRatioValid(ratios.xad, patternRatios.xad, config.allowedFibError)) {
    return null;
  }
  
  // Check D point validity
  if (bullish) {
    if (d.price >= c.price || d.price >= b.price) return null;
  } else {
    if (d.price <= c.price || d.price <= b.price) return null;
  }
  
  // Check symmetry
  const leg1 = a.index - x.index;
  const leg2 = b.index - a.index;
  const leg3 = c.index - b.index;
  const leg4 = d.index - c.index;
  
  if (!isSymmetryValid(leg1, leg2, leg3, leg4, config.allowedAsymmetry)) {
    return null;
  }
  
  // Calculate ratio errors
  const ratioErrors: HarmonicRatios = {
    xab: getRatioError(ratios.xab, patternRatios.xab),
    abc: getRatioError(ratios.abc, patternRatios.abc),
    bcd: getRatioError(ratios.bcd, patternRatios.bcd),
    xad: getRatioError(ratios.xad, patternRatios.xad)
  };
  
  // Calculate PRZ levels
  const przLevels = calculatePRZ(type, x.price, a.price, b.price, c.price, bullish);
  
  // Calculate PRZ confluence (how close together the levels are)
  const przRange = Math.abs(przLevels[przLevels.length - 1] - przLevels[0]);
  const przConfluence = Math.max(0, 1 - przRange / xa);
  
  // Calculate D confluence with PRZ
  const dDistToPRZ = Math.min(...przLevels.map(l => Math.abs(d.price - l)));
  const dConfluence = Math.max(0, 1 - dDistToPRZ / przRange);
  
  // Calculate score
  const score = calculateScore(ratioErrors, przConfluence, dConfluence, {
    error: config.weightError,
    prz: config.weightPRZ,
    d: config.weightD
  });
  
  // Calculate targets
  const [target1, target2] = calculateTargets(type, x.price, a.price, d.price, bullish);
  
  // Calculate entry (at D or nearest PRZ)
  const entry = d.price;
  
  // Calculate stop
  const stop = calculateStop(x.price, d.price, entry, target1, bullish, config.stopPercent);
  
  return {
    type,
    bullish,
    complete: true,
    x, a, b, c, d,
    ratios,
    ratioErrors,
    score,
    przLevels,
    target1,
    target2,
    stop,
    entry,
    status: score >= config.minScore / 100 ? 'active' : 'no_entry'
  };
}

/**
 * Find potential XABC patterns (incomplete)
 */
function findIncompletePatterns(
  pivotHighs: Point[],
  pivotLows: Point[],
  bullish: boolean,
  config: HarmonicSystemConfig
): HarmonicPattern[] {
  const patterns: HarmonicPattern[] = [];
  const source = bullish ? pivotLows : pivotHighs;
  const opposite = bullish ? pivotHighs : pivotLows;
  
  // Need at least 2 pivots of each type for XABC
  if (source.length < 2 || opposite.length < 2) return patterns;
  
  // Look for recent patterns (last 20 pivot combinations)
  const maxPatterns = 5;
  const maxLookback = Math.min(source.length, 10);
  
  for (let xi = source.length - maxLookback; xi < source.length - 1 && patterns.length < maxPatterns; xi++) {
    const x = source[xi];
    if (!x) continue;
    
    // Find A (opposite direction pivot after X)
    for (const a of opposite) {
      if (a.index <= x.index) continue;
      
      // Validate X-A direction
      if (bullish && a.price <= x.price) continue;
      if (!bullish && a.price >= x.price) continue;
      
      // Find B (same direction pivot after A)
      for (const b of source) {
        if (b.index <= a.index) continue;
        
        // Validate A-B direction
        if (bullish && (b.price >= a.price || b.price <= x.price)) continue;
        if (!bullish && (b.price <= a.price || b.price >= x.price)) continue;
        
        // Find C (opposite direction pivot after B)
        for (const c of opposite) {
          if (c.index <= b.index) continue;
          
          // Validate B-C direction
          if (bullish && (c.price <= b.price || c.price >= a.price)) continue;
          if (!bullish && (c.price >= b.price || c.price <= a.price)) continue;
          
          // Validate pattern structure
          const validTypes = validateXABC(x, a, b, c, bullish, config);
          
          for (const type of validTypes) {
            // Calculate incomplete ratios
            const xa = Math.abs(a.price - x.price);
            const ab = Math.abs(b.price - a.price);
            const bc = Math.abs(c.price - b.price);
            
            const ratios: HarmonicRatios = {
              xab: ab / xa,
              abc: bc / ab,
              bcd: 0,
              xad: 0
            };
            
            const patternRatios = PATTERN_RATIOS[type];
            const ratioErrors: HarmonicRatios = {
              xab: getRatioError(ratios.xab, patternRatios.xab),
              abc: getRatioError(ratios.abc, patternRatios.abc),
              bcd: 0,
              xad: 0
            };
            
            // Calculate incomplete score
            const avgError = (ratioErrors.xab + ratioErrors.abc) / 2;
            const score = Math.max(0, 1 - avgError);
            
            // Calculate PRZ for potential D
            const przLevels = calculatePRZ(type, x.price, a.price, b.price, c.price, bullish);
            
            patterns.push({
              type,
              bullish,
              complete: false,
              x, a, b, c,
              d: null,
              ratios,
              ratioErrors,
              score,
              przLevels,
              target1: null,
              target2: null,
              stop: null,
              entry: przLevels[0],  // Nearest PRZ level as potential entry
              status: 'pending'
            });
          }
        }
      }
    }
  }
  
  return patterns;
}

/**
 * Find complete XABCD patterns
 */
function findCompletePatterns(
  pivotHighs: Point[],
  pivotLows: Point[],
  incompletePatterns: HarmonicPattern[],
  config: HarmonicSystemConfig
): HarmonicPattern[] {
  const patterns: HarmonicPattern[] = [];
  
  for (const inc of incompletePatterns) {
    const source = inc.bullish ? pivotLows : pivotHighs;
    
    // Look for D point after C
    for (const d of source) {
      if (d.index <= inc.c.index) continue;
      
      // Validate D direction
      if (inc.bullish && d.price >= inc.c.price) continue;
      if (!inc.bullish && d.price <= inc.c.price) continue;
      
      const pattern = validateXABCD(
        inc.x, inc.a, inc.b, inc.c, d,
        inc.type, inc.bullish, config
      );
      
      if (pattern && pattern.score >= config.minScore / 100) {
        patterns.push(pattern);
      }
    }
  }
  
  // Remove duplicates (keep highest score)
  const uniquePatterns = new Map<string, HarmonicPattern>();
  for (const p of patterns) {
    const key = `${p.type}_${p.x.index}_${p.a.index}_${p.b.index}_${p.c.index}`;
    const existing = uniquePatterns.get(key);
    if (!existing || p.score > existing.score) {
      uniquePatterns.set(key, p);
    }
  }
  
  return Array.from(uniquePatterns.values());
}

/**
 * Update pattern status based on price action
 */
function updatePatternStatus(
  pattern: HarmonicPattern,
  highs: number[],
  lows: number[],
  currentIndex: number
): HarmonicPattern {
  if (!pattern.complete || !pattern.d || pattern.status === 'success_t2' || pattern.status === 'failed') {
    return pattern;
  }
  
  const updated = { ...pattern };
  const dIndex = pattern.d.index;
  
  // Check bars after D
  for (let i = dIndex + 1; i <= currentIndex; i++) {
    const high = highs[i];
    const low = lows[i];
    
    if (pattern.bullish) {
      // Check stop hit
      if (pattern.stop && low <= pattern.stop) {
        updated.status = 'failed';
        return updated;
      }
      // Check target 1 hit
      if (pattern.target1 && high >= pattern.target1 && updated.status === 'active') {
        updated.status = 'success_t1';
      }
      // Check target 2 hit
      if (pattern.target2 && high >= pattern.target2 && updated.status === 'success_t1') {
        updated.status = 'success_t2';
        return updated;
      }
    } else {
      // Check stop hit
      if (pattern.stop && high >= pattern.stop) {
        updated.status = 'failed';
        return updated;
      }
      // Check target 1 hit
      if (pattern.target1 && low <= pattern.target1 && updated.status === 'active') {
        updated.status = 'success_t1';
      }
      // Check target 2 hit
      if (pattern.target2 && low <= pattern.target2 && updated.status === 'success_t1') {
        updated.status = 'success_t2';
        return updated;
      }
    }
  }
  
  // Check timeout (3x pattern length)
  const patternLength = pattern.d.index - pattern.x.index;
  if (currentIndex > pattern.d.index + patternLength * 3) {
    if (updated.status === 'active') {
      updated.status = 'timeout';
    }
  }
  
  return updated;
}

/**
 * Calculate statistics for all patterns
 */
function calculateStats(patterns: HarmonicPattern[]): PatternStats {
  const types: PatternType[] = ['gartley', 'bat', 'butterfly', 'crab', 'shark', 'cypher'];
  const byType: Record<PatternType, TypeStats> = {} as Record<PatternType, TypeStats>;
  
  for (const type of types) {
    const typePatterns = patterns.filter(p => p.type === type && p.complete);
    const trades = typePatterns.filter(p => 
      p.status === 'success_t1' || p.status === 'success_t2' || p.status === 'failed'
    );
    
    const t1Success = trades.filter(p => p.status === 'success_t1' || p.status === 'success_t2').length;
    const t2Success = trades.filter(p => p.status === 'success_t2').length;
    
    // Calculate returns
    let totalReturn = 0;
    for (const p of trades) {
      if (p.entry && p.target1 && p.target2 && p.stop) {
        if (p.status === 'success_t2') {
          totalReturn += Math.abs(p.target2 - p.entry) / p.entry;
        } else if (p.status === 'success_t1') {
          totalReturn += Math.abs(p.target1 - p.entry) / p.entry;
        } else if (p.status === 'failed') {
          totalReturn -= Math.abs(p.entry - p.stop) / p.entry;
        }
      }
    }
    
    byType[type] = {
      count: typePatterns.length,
      trades: trades.length,
      t1Success: trades.length > 0 ? (t1Success / trades.length) * 100 : 0,
      t2Success: trades.length > 0 ? (t2Success / trades.length) * 100 : 0,
      avgReturn: trades.length > 0 ? (totalReturn / trades.length) * 100 : 0,
      totalReturn: totalReturn * 100
    };
  }
  
  return {
    total: patterns.filter(p => p.complete).length,
    byType
  };
}

/**
 * Main function to detect harmonic patterns
 */
export function calculateHarmonicSystem(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<HarmonicSystemConfig> = {}
): HarmonicSystemResult {
  const cfg: HarmonicSystemConfig = {
    gartleyOn: config.gartleyOn ?? true,
    batOn: config.batOn ?? true,
    butterflyOn: config.butterflyOn ?? true,
    crabOn: config.crabOn ?? true,
    sharkOn: config.sharkOn ?? true,
    cypherOn: config.cypherOn ?? true,
    bullishOn: config.bullishOn ?? true,
    bearishOn: config.bearishOn ?? true,
    incompleteOn: config.incompleteOn ?? true,
    allowedFibError: config.allowedFibError ?? 15,
    allowedAsymmetry: config.allowedAsymmetry ?? 250,
    validationBars: config.validationBars ?? 1,
    weightError: config.weightError ?? 4,
    weightPRZ: config.weightPRZ ?? 2,
    weightD: config.weightD ?? 3,
    minScore: config.minScore ?? 70,
    stopPercent: config.stopPercent ?? 75
  };
  
  // Detect pivots with multiple lookback periods
  const allPatterns: HarmonicPattern[] = [];
  
  for (const pivotLen of [5, 8, 13, 21]) {
    const { highs: pivotHighs, lows: pivotLows } = detectPivots(highs, lows, pivotLen, 2);
    
    // Find incomplete patterns
    let incompletePatterns: HarmonicPattern[] = [];
    
    if (cfg.bullishOn) {
      incompletePatterns = incompletePatterns.concat(
        findIncompletePatterns(pivotHighs, pivotLows, true, cfg)
      );
    }
    
    if (cfg.bearishOn) {
      incompletePatterns = incompletePatterns.concat(
        findIncompletePatterns(pivotHighs, pivotLows, false, cfg)
      );
    }
    
    // Find complete patterns
    const completePatterns = findCompletePatterns(pivotHighs, pivotLows, incompletePatterns, cfg);
    
    // Update status for complete patterns
    const updatedPatterns = completePatterns.map(p => 
      updatePatternStatus(p, highs, lows, highs.length - 1)
    );
    
    allPatterns.push(...updatedPatterns);
    
    // Add incomplete patterns if enabled
    if (cfg.incompleteOn) {
      // Only add incomplete patterns that don't have complete versions
      const completeKeys = new Set(
        completePatterns.map(p => `${p.type}_${p.x.index}_${p.a.index}`)
      );
      
      const uniqueIncomplete = incompletePatterns.filter(p => 
        !completeKeys.has(`${p.type}_${p.x.index}_${p.a.index}`)
      );
      
      allPatterns.push(...uniqueIncomplete.slice(0, 5)); // Limit incomplete patterns
    }
  }
  
  // Remove duplicates and keep best scoring
  const patternMap = new Map<string, HarmonicPattern>();
  for (const p of allPatterns) {
    const key = `${p.type}_${p.bullish}_${p.x.index}_${p.a.index}_${p.complete}`;
    const existing = patternMap.get(key);
    if (!existing || p.score > existing.score) {
      patternMap.set(key, p);
    }
  }
  
  const patterns = Array.from(patternMap.values())
    .sort((a, b) => {
      // Sort by completion status first, then by recency
      if (a.complete !== b.complete) return a.complete ? -1 : 1;
      return (b.d?.index ?? b.c.index) - (a.d?.index ?? a.c.index);
    })
    .slice(0, 20); // Limit total patterns
  
  const stats = calculateStats(patterns);
  
  return { patterns, stats };
}

/**
 * Get pattern display name
 */
export function getPatternName(type: PatternType): string {
  const names: Record<PatternType, string> = {
    gartley: 'Gartley',
    bat: 'Bat',
    butterfly: 'Butterfly',
    crab: 'Crab',
    shark: 'Shark',
    cypher: 'Cypher'
  };
  return names[type];
}

/**
 * Get pattern symbol
 */
export function getPatternSymbol(type: PatternType): string {
  return PATTERN_SYMBOLS[type];
}

/**
 * Get status symbol
 */
export function getStatusSymbol(status: HarmonicPattern['status']): string {
  const symbols: Record<HarmonicPattern['status'], string> = {
    pending: '⏳',
    active: '🎯',
    success_t1: '✅',
    success_t2: '✅✅',
    failed: '❌',
    timeout: '🕐',
    no_entry: '⛔'
  };
  return symbols[status];
}
