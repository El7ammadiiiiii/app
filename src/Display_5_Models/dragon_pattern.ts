// Dragon Harmonic Pattern [TradingFinder]
// License: MPL 2.0 - https://mozilla.org/MPL/2.0/
// © TFlab
//
// TypeScript implementation for Next.js/ECharts
// Dragon pattern is a specific XABCD harmonic with unique Fibonacci ratios

export interface DragonPatternConfig {
  pivotPeriod: number;          // ZigZag pivot period (default: 3)
  showValidFormat: boolean;     // Show valid format patterns
  showLastPivotConfirm: boolean; // Show formation last pivot confirm
  lastPivotPeriod: number;      // Period for last pivot confirmation (default: 2)
  showBullish: boolean;         // Show bullish patterns
  showBearish: boolean;         // Show bearish patterns
  // Dragon pattern Fibonacci ratios
  xabMin: number;               // XAB minimum ratio (default: 0.38)
  xabMax: number;               // XAB maximum ratio (default: 0.62)
  abcMin: number;               // ABC minimum ratio (default: 0.8)
  abcMax: number;               // ABC maximum ratio (default: 1.1)
  bcdMin: number;               // BCD minimum ratio (default: 0.4)
  bcdMax: number;               // BCD maximum ratio (default: 0.8)
  xadMin: number;               // XAD minimum ratio (default: 0.2)
  xadMax: number;               // XAD maximum ratio (default: 0.4)
}

export interface Point {
  index: number;
  price: number;
}

export interface DragonPattern {
  type: 'bullish' | 'bearish';
  x: Point;
  a: Point;
  b: Point;
  c: Point;
  d: Point;
  ratios: {
    xab: number;
    abc: number;
    bcd: number;
    xad: number;
  };
  valid: boolean;
  confirmed: boolean;
  score: number;
}

export interface DragonPatternResult {
  patterns: DragonPattern[];
  pivots: {
    highs: Point[];
    lows: Point[];
  };
  signals: {
    bullish: Point[];
    bearish: Point[];
  };
}

/**
 * Detect pivot highs and lows using zigzag method
 */
function detectPivots(
  highs: number[],
  lows: number[],
  period: number
): { highs: Point[]; lows: Point[] } {
  const pivotHighs: Point[] = [];
  const pivotLows: Point[] = [];

  for (let i = period; i < highs.length - period; i++) {
    let isHigh = true;
    let isLow = true;

    // Check left side
    for (let j = 1; j <= period; j++) {
      if (highs[i] <= highs[i - j]) isHigh = false;
      if (lows[i] >= lows[i - j]) isLow = false;
    }

    // Check right side
    for (let j = 1; j <= period; j++) {
      if (highs[i] <= highs[i + j]) isHigh = false;
      if (lows[i] >= lows[i + j]) isLow = false;
    }

    if (isHigh) {
      pivotHighs.push({ index: i, price: highs[i] });
    }
    if (isLow) {
      pivotLows.push({ index: i, price: lows[i] });
    }
  }

  return { highs: pivotHighs, lows: pivotLows };
}

/**
 * Check if a ratio is within the specified range
 */
function isRatioValid(ratio: number, min: number, max: number): boolean {
  return ratio >= min && ratio <= max;
}

/**
 * Calculate pattern score based on how close ratios are to ideal values
 */
function calculateScore(
  ratios: DragonPattern['ratios'],
  config: DragonPatternConfig
): number {
  const xabIdeal = (config.xabMin + config.xabMax) / 2;
  const abcIdeal = (config.abcMin + config.abcMax) / 2;
  const bcdIdeal = (config.bcdMin + config.bcdMax) / 2;
  const xadIdeal = (config.xadMin + config.xadMax) / 2;

  const xabError = Math.abs(ratios.xab - xabIdeal) / xabIdeal;
  const abcError = Math.abs(ratios.abc - abcIdeal) / abcIdeal;
  const bcdError = Math.abs(ratios.bcd - bcdIdeal) / bcdIdeal;
  const xadError = Math.abs(ratios.xad - xadIdeal) / xadIdeal;

  const avgError = (xabError + abcError + bcdError + xadError) / 4;
  return Math.max(0, 1 - avgError) * 100;
}

/**
 * Validate Dragon pattern structure
 */
function validateDragonPattern(
  x: Point,
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  bullish: boolean,
  config: DragonPatternConfig
): DragonPattern | null {
  // Calculate leg distances
  const xa = Math.abs(a.price - x.price);
  const ab = Math.abs(b.price - a.price);
  const bc = Math.abs(c.price - b.price);
  const cd = Math.abs(d.price - c.price);
  const ad = Math.abs(d.price - a.price);

  if (xa === 0 || ab === 0 || bc === 0) return null;

  // Calculate ratios
  const xab = ab / xa;
  const abc = bc / ab;
  const bcd = cd / bc;
  const xad = ad / xa;

  // Validate Dragon pattern ratios
  if (!isRatioValid(xab, config.xabMin, config.xabMax)) return null;
  if (!isRatioValid(abc, config.abcMin, config.abcMax)) return null;
  if (!isRatioValid(bcd, config.bcdMin, config.bcdMax)) return null;
  if (!isRatioValid(xad, config.xadMin, config.xadMax)) return null;

  // Validate structure
  if (bullish) {
    // Bullish Dragon: X is low, A is high, B is higher low, C is lower high, D is potential reversal
    if (!(a.price > x.price && b.price < a.price && c.price > b.price && d.price < c.price)) {
      return null;
    }
    // B should be above X (higher low)
    if (b.price < x.price) return null;
  } else {
    // Bearish Dragon: X is high, A is low, B is lower high, C is higher low, D is potential reversal
    if (!(a.price < x.price && b.price > a.price && c.price < b.price && d.price > c.price)) {
      return null;
    }
    // B should be below X (lower high)
    if (b.price > x.price) return null;
  }

  const ratios = { xab, abc, bcd, xad };
  const score = calculateScore(ratios, config);

  return {
    type: bullish ? 'bullish' : 'bearish',
    x,
    a,
    b,
    c,
    d,
    ratios,
    valid: true,
    confirmed: false,
    score
  };
}

/**
 * Check for candle confirmation after pattern D point
 */
function checkConfirmation(
  pattern: DragonPattern,
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): boolean {
  const dIndex = pattern.d.index;
  
  if (dIndex + period >= highs.length) return false;

  if (pattern.type === 'bullish') {
    // Bullish confirmation: price moves up after D
    for (let i = 1; i <= period; i++) {
      if (closes[dIndex + i] > pattern.d.price && lows[dIndex + i] >= pattern.d.price * 0.995) {
        return true;
      }
    }
  } else {
    // Bearish confirmation: price moves down after D
    for (let i = 1; i <= period; i++) {
      if (closes[dIndex + i] < pattern.d.price && highs[dIndex + i] <= pattern.d.price * 1.005) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find Dragon patterns
 */
function findDragonPatterns(
  pivotHighs: Point[],
  pivotLows: Point[],
  bullish: boolean,
  config: DragonPatternConfig
): DragonPattern[] {
  const patterns: DragonPattern[] = [];
  
  // For bullish: X and B are lows, A and C are highs, D is low
  // For bearish: X and B are highs, A and C are lows, D is high
  const xSource = bullish ? pivotLows : pivotHighs;
  const aSource = bullish ? pivotHighs : pivotLows;
  const bSource = bullish ? pivotLows : pivotHighs;
  const cSource = bullish ? pivotHighs : pivotLows;
  const dSource = bullish ? pivotLows : pivotHighs;

  // Need at least 3 pivots of each type
  if (xSource.length < 3 || aSource.length < 3) return patterns;

  const maxPatterns = 5;
  const maxLookback = Math.min(xSource.length, 15);

  // Search for XABCD patterns
  for (let xi = xSource.length - maxLookback; xi < xSource.length - 2 && patterns.length < maxPatterns; xi++) {
    const x = xSource[xi];
    if (!x) continue;

    // Find A after X
    for (const a of aSource) {
      if (a.index <= x.index) continue;

      // Validate X-A direction
      if (bullish && a.price <= x.price) continue;
      if (!bullish && a.price >= x.price) continue;

      // Find B after A
      for (const b of bSource) {
        if (b.index <= a.index) continue;

        // Validate A-B direction
        if (bullish && b.price >= a.price) continue;
        if (!bullish && b.price <= a.price) continue;

        // Find C after B
        for (const c of cSource) {
          if (c.index <= b.index) continue;

          // Validate B-C direction
          if (bullish && c.price <= b.price) continue;
          if (!bullish && c.price >= b.price) continue;

          // Find D after C
          for (const d of dSource) {
            if (d.index <= c.index) continue;

            // Validate C-D direction
            if (bullish && d.price >= c.price) continue;
            if (!bullish && d.price <= c.price) continue;

            const pattern = validateDragonPattern(x, a, b, c, d, bullish, config);
            
            if (pattern && pattern.score >= 60) {
              patterns.push(pattern);
              if (patterns.length >= maxPatterns) break;
            }
          }
          if (patterns.length >= maxPatterns) break;
        }
        if (patterns.length >= maxPatterns) break;
      }
      if (patterns.length >= maxPatterns) break;
    }
  }

  return patterns;
}

/**
 * Main function to detect Dragon Harmonic Patterns
 */
export function calculateDragonPattern(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<DragonPatternConfig> = {}
): DragonPatternResult {
  const cfg: DragonPatternConfig = {
    pivotPeriod: config.pivotPeriod ?? 3,
    showValidFormat: config.showValidFormat ?? false,
    showLastPivotConfirm: config.showLastPivotConfirm ?? false,
    lastPivotPeriod: config.lastPivotPeriod ?? 2,
    showBullish: config.showBullish ?? true,
    showBearish: config.showBearish ?? true,
    // Dragon pattern specific ratios
    xabMin: config.xabMin ?? 0.38,
    xabMax: config.xabMax ?? 0.62,
    abcMin: config.abcMin ?? 0.8,
    abcMax: config.abcMax ?? 1.1,
    bcdMin: config.bcdMin ?? 0.4,
    bcdMax: config.bcdMax ?? 0.8,
    xadMin: config.xadMin ?? 0.2,
    xadMax: config.xadMax ?? 0.4
  };

  // Detect pivots
  const { highs: pivotHighs, lows: pivotLows } = detectPivots(highs, lows, cfg.pivotPeriod);

  const patterns: DragonPattern[] = [];
  const bullishSignals: Point[] = [];
  const bearishSignals: Point[] = [];

  // Find bullish Dragon patterns
  if (cfg.showBullish) {
    const bullishPatterns = findDragonPatterns(pivotHighs, pivotLows, true, cfg);
    
    for (const pattern of bullishPatterns) {
      // Check confirmation
      if (cfg.showLastPivotConfirm) {
        pattern.confirmed = checkConfirmation(pattern, highs, lows, closes, cfg.lastPivotPeriod);
        if (pattern.confirmed) {
          bullishSignals.push(pattern.d);
        }
      }
      patterns.push(pattern);
    }
  }

  // Find bearish Dragon patterns
  if (cfg.showBearish) {
    const bearishPatterns = findDragonPatterns(pivotHighs, pivotLows, false, cfg);
    
    for (const pattern of bearishPatterns) {
      // Check confirmation
      if (cfg.showLastPivotConfirm) {
        pattern.confirmed = checkConfirmation(pattern, highs, lows, closes, cfg.lastPivotPeriod);
        if (pattern.confirmed) {
          bearishSignals.push(pattern.d);
        }
      }
      patterns.push(pattern);
    }
  }

  // Sort by recency (most recent first)
  patterns.sort((a, b) => b.d.index - a.d.index);

  // Limit to top patterns
  const limitedPatterns = patterns.slice(0, 10);

  return {
    patterns: limitedPatterns,
    pivots: {
      highs: pivotHighs,
      lows: pivotLows
    },
    signals: {
      bullish: bullishSignals,
      bearish: bearishSignals
    }
  };
}

/**
 * Get Dragon pattern display info
 */
export function getDragonPatternInfo(pattern: DragonPattern): {
  name: string;
  symbol: string;
  color: string;
} {
  if (pattern.type === 'bullish') {
    return {
      name: 'Bullish Dragon',
      symbol: '🐉',
      color: '#22c55e'
    };
  } else {
    return {
      name: 'Bearish Dragon',
      symbol: '🐲',
      color: '#ef4444'
    };
  }
}

/**
 * Format ratio for display
 */
export function formatRatio(ratio: number): string {
  return ratio.toFixed(3);
}
