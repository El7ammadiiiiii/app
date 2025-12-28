/**
 * Cypher Harmonic Pattern [TradingFinder]
 * 
 * This source code is subject to the terms of the Mozilla Public License 2.0
 * https://mozilla.org/MPL/2.0/
 * © TFlab
 * 
 * Cypher Pattern Detector - Detects bullish and bearish Cypher harmonic patterns
 * using specific Fibonacci ratios:
 * - XAB: 0.382 - 0.618
 * - ABC: 1.13 - 1.414 (extension)
 * - BCD: 1.272 - 2.00 (extension)
 * - XAD: 0.756 - 0.796
 */

// ============ INTERFACES ============

export interface CypherPatternConfig {
  pivotPeriod: number;           // ZigZag pivot period (default: 3)
  showValidFormat: boolean;      // Show valid format patterns
  showLastPivotConfirm: boolean; // Show formation last pivot confirmation
  lastPivotPeriod: number;       // Period for last pivot confirmation (default: 2)
  showBullish: boolean;          // Show bullish patterns
  showBearish: boolean;          // Show bearish patterns
  // Cypher Fibonacci ratios
  xabMin: number;    // 0.382
  xabMax: number;    // 0.618
  abcMin: number;    // 1.13 (extension)
  abcMax: number;    // 1.414 (extension)
  bcdMin: number;    // 1.272 (extension)
  bcdMax: number;    // 2.00 (extension)
  xadMin: number;    // 0.756
  xadMax: number;    // 0.796
}

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface CypherPattern {
  type: 'bullish' | 'bearish';
  X: PivotPoint;
  A: PivotPoint;
  B: PivotPoint;
  C: PivotPoint;
  D: PivotPoint;
  ratios: {
    XAB: number;
    ABC: number;
    BCD: number;
    XAD: number;
  };
  score: number;
  isValid: boolean;
  confirmed: boolean;
}

export interface CypherPatternResult {
  patterns: CypherPattern[];
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
  bullishConfirmations: number[];
  bearishConfirmations: number[];
}

// ============ HELPER FUNCTIONS ============

/**
 * Detect pivot highs using left/right bar comparison
 */
function detectPivotHighs(highs: number[], period: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = period; i < highs.length - period; i++) {
    let isPivot = true;
    const currentHigh = highs[i];
    
    // Check left bars
    for (let j = 1; j <= period; j++) {
      if (highs[i - j] >= currentHigh) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= period; j++) {
        if (highs[i + j] >= currentHigh) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: currentHigh, type: 'high' });
    }
  }
  
  return pivots;
}

/**
 * Detect pivot lows using left/right bar comparison
 */
function detectPivotLows(lows: number[], period: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = period; i < lows.length - period; i++) {
    let isPivot = true;
    const currentLow = lows[i];
    
    // Check left bars
    for (let j = 1; j <= period; j++) {
      if (lows[i - j] <= currentLow) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= period; j++) {
        if (lows[i + j] <= currentLow) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: currentLow, type: 'low' });
    }
  }
  
  return pivots;
}

/**
 * Build ZigZag from pivot points
 */
function buildZigZag(pivotHighs: PivotPoint[], pivotLows: PivotPoint[]): PivotPoint[] {
  const allPivots = [...pivotHighs, ...pivotLows].sort((a, b) => a.index - b.index);
  
  if (allPivots.length < 2) return allPivots;
  
  // Remove consecutive same-type pivots, keeping extremes
  const zigzag: PivotPoint[] = [allPivots[0]];
  
  for (let i = 1; i < allPivots.length; i++) {
    const current = allPivots[i];
    const last = zigzag[zigzag.length - 1];
    
    if (current.type !== last.type) {
      zigzag.push(current);
    } else {
      // Same type - keep the more extreme one
      if (current.type === 'high' && current.price > last.price) {
        zigzag[zigzag.length - 1] = current;
      } else if (current.type === 'low' && current.price < last.price) {
        zigzag[zigzag.length - 1] = current;
      }
    }
  }
  
  return zigzag;
}

/**
 * Calculate Fibonacci ratio between two legs
 */
function calculateRatio(leg1Start: number, leg1End: number, leg2Start: number, leg2End: number): number {
  const leg1 = Math.abs(leg1End - leg1Start);
  const leg2 = Math.abs(leg2End - leg2Start);
  
  if (leg1 === 0) return 0;
  return leg2 / leg1;
}

/**
 * Check if ratio is within range
 */
function isRatioInRange(ratio: number, min: number, max: number, tolerance: number = 0.05): boolean {
  return ratio >= (min - tolerance) && ratio <= (max + tolerance);
}

/**
 * Calculate pattern score based on ratio accuracy
 */
function calculatePatternScore(ratios: CypherPattern['ratios'], config: CypherPatternConfig): number {
  let score = 100;
  
  // XAB ratio scoring
  const xabMid = (config.xabMin + config.xabMax) / 2;
  const xabError = Math.abs(ratios.XAB - xabMid) / (config.xabMax - config.xabMin);
  score -= xabError * 20;
  
  // ABC ratio scoring
  const abcMid = (config.abcMin + config.abcMax) / 2;
  const abcError = Math.abs(ratios.ABC - abcMid) / (config.abcMax - config.abcMin);
  score -= abcError * 25;
  
  // BCD ratio scoring
  const bcdMid = (config.bcdMin + config.bcdMax) / 2;
  const bcdError = Math.abs(ratios.BCD - bcdMid) / (config.bcdMax - config.bcdMin);
  score -= bcdError * 25;
  
  // XAD ratio scoring (most important for Cypher)
  const xadMid = (config.xadMin + config.xadMax) / 2;
  const xadError = Math.abs(ratios.XAD - xadMid) / (config.xadMax - config.xadMin);
  score -= xadError * 30;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Validate Cypher pattern ratios
 */
function validateCypherRatios(
  X: PivotPoint,
  A: PivotPoint,
  B: PivotPoint,
  C: PivotPoint,
  D: PivotPoint,
  config: CypherPatternConfig
): { isValid: boolean; ratios: CypherPattern['ratios'] } {
  // XAB = AB / XA (retracement)
  const XAB = calculateRatio(X.price, A.price, A.price, B.price);
  
  // ABC = BC / AB (extension - C goes beyond A)
  const ABC = calculateRatio(A.price, B.price, B.price, C.price);
  
  // BCD = CD / BC (extension)
  const BCD = calculateRatio(B.price, C.price, C.price, D.price);
  
  // XAD = AD / XA (specific tight range for Cypher)
  const XAD = calculateRatio(X.price, A.price, X.price, D.price);
  
  const ratios = { XAB, ABC, BCD, XAD };
  
  const tolerance = 0.05;
  
  const isValid = 
    isRatioInRange(XAB, config.xabMin, config.xabMax, tolerance) &&
    isRatioInRange(ABC, config.abcMin, config.abcMax, tolerance) &&
    isRatioInRange(BCD, config.bcdMin, config.bcdMax, tolerance) &&
    isRatioInRange(XAD, config.xadMin, config.xadMax, tolerance);
  
  return { isValid, ratios };
}

/**
 * Detect Cypher patterns from zigzag pivots
 */
function detectCypherPatterns(
  zigzag: PivotPoint[],
  config: CypherPatternConfig
): CypherPattern[] {
  const patterns: CypherPattern[] = [];
  
  if (zigzag.length < 5) return patterns;
  
  // Look for XABCD patterns in recent zigzag points
  for (let i = 0; i <= zigzag.length - 5; i++) {
    const X = zigzag[i];
    const A = zigzag[i + 1];
    const B = zigzag[i + 2];
    const C = zigzag[i + 3];
    const D = zigzag[i + 4];
    
    // Determine pattern type based on X position
    // Bullish Cypher: X is low, pattern ends with D at potential reversal up
    // Bearish Cypher: X is high, pattern ends with D at potential reversal down
    
    if (X.type === 'low' && A.type === 'high' && B.type === 'low' && C.type === 'high' && D.type === 'low') {
      // Potential Bullish Cypher
      if (!config.showBullish) continue;
      
      // Cypher structure: C must be higher than A (extension)
      if (C.price <= A.price) continue;
      
      // D must be between X and C
      if (D.price >= C.price || D.price <= X.price) continue;
      
      const { isValid, ratios } = validateCypherRatios(X, A, B, C, D, config);
      
      if (isValid || config.showValidFormat) {
        const score = calculatePatternScore(ratios, config);
        
        patterns.push({
          type: 'bullish',
          X, A, B, C, D,
          ratios,
          score,
          isValid,
          confirmed: false
        });
      }
    }
    
    if (X.type === 'high' && A.type === 'low' && B.type === 'high' && C.type === 'low' && D.type === 'high') {
      // Potential Bearish Cypher
      if (!config.showBearish) continue;
      
      // Cypher structure: C must be lower than A (extension)
      if (C.price >= A.price) continue;
      
      // D must be between X and C
      if (D.price <= C.price || D.price >= X.price) continue;
      
      const { isValid, ratios } = validateCypherRatios(X, A, B, C, D, config);
      
      if (isValid || config.showValidFormat) {
        const score = calculatePatternScore(ratios, config);
        
        patterns.push({
          type: 'bearish',
          X, A, B, C, D,
          ratios,
          score,
          isValid,
          confirmed: false
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Check for candle confirmation after D point
 */
function checkConfirmation(
  pattern: CypherPattern,
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): boolean {
  const dIndex = pattern.D.index;
  
  if (dIndex + period >= closes.length) return false;
  
  if (pattern.type === 'bullish') {
    // Look for bullish confirmation: higher close after D
    for (let i = 1; i <= period; i++) {
      if (dIndex + i < closes.length) {
        if (closes[dIndex + i] > closes[dIndex] && lows[dIndex + i] > pattern.D.price * 0.995) {
          return true;
        }
      }
    }
  } else {
    // Look for bearish confirmation: lower close after D
    for (let i = 1; i <= period; i++) {
      if (dIndex + i < closes.length) {
        if (closes[dIndex + i] < closes[dIndex] && highs[dIndex + i] < pattern.D.price * 1.005) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// ============ MAIN FUNCTION ============

/**
 * Calculate Cypher Harmonic Patterns
 */
export function calculateCypherPattern(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<CypherPatternConfig> = {}
): CypherPatternResult {
  // Default configuration with Cypher-specific ratios
  const fullConfig: CypherPatternConfig = {
    pivotPeriod: 3,
    showValidFormat: false,
    showLastPivotConfirm: false,
    lastPivotPeriod: 2,
    showBullish: true,
    showBearish: true,
    // Cypher Fibonacci ratios
    xabMin: 0.382,
    xabMax: 0.618,
    abcMin: 1.13,
    abcMax: 1.414,
    bcdMin: 1.272,
    bcdMax: 2.00,
    xadMin: 0.756,
    xadMax: 0.796,
    ...config
  };
  
  // Detect pivots
  const pivotHighs = detectPivotHighs(highs, fullConfig.pivotPeriod);
  const pivotLows = detectPivotLows(lows, fullConfig.pivotPeriod);
  
  // Build zigzag
  const zigzag = buildZigZag(pivotHighs, pivotLows);
  
  // Detect patterns
  const patterns = detectCypherPatterns(zigzag, fullConfig);
  
  // Check confirmations
  const bullishConfirmations: number[] = [];
  const bearishConfirmations: number[] = [];
  
  patterns.forEach(pattern => {
    if (fullConfig.showLastPivotConfirm) {
      pattern.confirmed = checkConfirmation(pattern, highs, lows, closes, fullConfig.lastPivotPeriod);
      
      if (pattern.confirmed) {
        const confirmIndex = pattern.D.index + fullConfig.lastPivotPeriod;
        if (pattern.type === 'bullish') {
          bullishConfirmations.push(confirmIndex);
        } else {
          bearishConfirmations.push(confirmIndex);
        }
      }
    }
  });
  
  return {
    patterns,
    pivotHighs,
    pivotLows,
    bullishConfirmations,
    bearishConfirmations
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get pattern information string
 */
export function getCypherPatternInfo(pattern: CypherPattern): string {
  const type = pattern.type === 'bullish' ? 'Bullish' : 'Bearish';
  return `${type} Cypher (Score: ${pattern.score.toFixed(0)}%)`;
}

/**
 * Format ratio for display
 */
export function formatCypherRatio(ratio: number): string {
  return ratio.toFixed(3);
}

/**
 * Get ideal Cypher ratios for reference
 */
export function getIdealCypherRatios(): { name: string; ideal: string; range: string }[] {
  return [
    { name: 'XAB', ideal: '0.382-0.618', range: '38.2%-61.8%' },
    { name: 'ABC', ideal: '1.13-1.414', range: '113%-141.4%' },
    { name: 'BCD', ideal: '1.272-2.00', range: '127.2%-200%' },
    { name: 'XAD', ideal: '0.786', range: '75.6%-79.6%' }
  ];
}
