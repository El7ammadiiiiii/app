// This code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © TFlab - Converted to TypeScript for Display 5 Models

/**
 * Alternative Shark Harmonic Pattern Detection
 * 
 * The Alternative Shark pattern is a 5-point (XABCD) harmonic pattern with specific Fibonacci ratios:
 * - XA Retracement (B): 0.382 to 0.618 (typically 38.2% or 50%)
 * - AB Projection (C): 1.13 to 1.618 (C extends beyond A, typically 113% or 161.8%)
 * - BC Projection (D): 1.618 to 2.24 (D extends significantly, typically 161.8% or 224%)
 * - XA Projection (D): 0.886 to 1.13 (D near or beyond X, typically 88.6% or 113%)
 * 
 * Unlike the standard Shark, the Alternative Shark has:
 * - More flexible B retracement (38.2%-61.8%)
 * - C extends beyond A (instead of retracing AB)
 * - Large BC projection at D (161.8%-224%)
 * - D can extend slightly beyond X
 * 
 * Trade Setup:
 * - Entry: At D point (PRZ - Potential Reversal Zone)
 * - Stop Loss: Below D for bullish, above D for bearish
 * - Target 1: 38.2% CD retracement (C level)
 * - Target 2: 61.8% CD retracement
 */

export interface AlternativeSharkConfig {
  zigzagPeriod: number;           // Pivot detection period (default: 3)
  showValidFormat: boolean;        // Show only valid patterns
  confirmLastPivot: boolean;       // Wait for pivot confirmation
  confirmPeriod: number;           // Bars for pivot confirmation
  showBullish: boolean;            // Display bullish patterns
  showBearish: boolean;            // Display bearish patterns
  // Fibonacci ratio ranges for Alternative Shark
  minXA_Ratio: number;            // Min XA retracement at B (0.382)
  maxXA_Ratio: number;            // Max XA retracement at B (0.618)
  minAB_Ratio: number;            // Min AB projection at C (1.13)
  maxAB_Ratio: number;            // Max AB projection at C (1.618)
  minBC_Ratio: number;            // Min BC projection at D (1.618)
  maxBC_Ratio: number;            // Max BC projection at D (2.24)
  minXA_D_Ratio: number;          // Min XA projection at D (0.886)
  maxXA_D_Ratio: number;          // Max XA projection at D (1.13)
}

export const defaultAlternativeSharkConfig: AlternativeSharkConfig = {
  zigzagPeriod: 3,
  showValidFormat: false,
  confirmLastPivot: false,
  confirmPeriod: 2,
  showBullish: true,
  showBearish: true,
  minXA_Ratio: 0.382,
  maxXA_Ratio: 0.618,
  minAB_Ratio: 1.13,
  maxAB_Ratio: 1.618,
  minBC_Ratio: 1.618,
  maxBC_Ratio: 2.24,
  minXA_D_Ratio: 0.886,
  maxXA_D_Ratio: 1.13,
};

interface Pivot {
  index: number;
  price: number;
  isHigh: boolean;
}

export interface AlternativeSharkPattern {
  type: 'bullish' | 'bearish';
  points: {
    X: { index: number; price: number };
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
  };
  ratios: {
    XA_B: number;     // B retracement of XA
    AB_C: number;     // C projection of AB
    BC_D: number;     // D projection of BC
    XA_D: number;     // D projection of XA
  };
  prz: {            // Potential Reversal Zone
    upper: number;
    lower: number;
  };
  isValid: boolean;
  confirmed: boolean;
}

export interface AlternativeSharkResult {
  patterns: AlternativeSharkPattern[];
  currentPivots: Pivot[];
}

/**
 * Detect pivots (swing highs and lows) using the specified period
 */
function detectPivots(
  highs: number[],
  lows: number[],
  period: number
): Pivot[] {
  const pivots: Pivot[] = [];
  
  for (let i = period; i < highs.length - period; i++) {
    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - period; j <= i + period; j++) {
      if (j !== i && highs[j] >= highs[i]) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      pivots.push({ index: i, price: highs[i], isHigh: true });
    }
    
    // Check for swing low
    let isSwingLow = true;
    for (let j = i - period; j <= i + period; j++) {
      if (j !== i && lows[j] <= lows[i]) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      pivots.push({ index: i, price: lows[i], isHigh: false });
    }
  }
  
  return pivots.sort((a, b) => a.index - b.index);
}

/**
 * Calculate Fibonacci retracement/projection ratio
 */
function calculateRatio(
  startPrice: number,
  endPrice: number,
  retracementPrice: number
): number {
  const move = endPrice - startPrice;
  if (Math.abs(move) < 0.0001) return 0;
  return Math.abs((retracementPrice - startPrice) / move);
}

/**
 * Validate if the pattern ratios match Alternative Shark requirements
 */
function validateAlternativeSharkRatios(
  pattern: AlternativeSharkPattern,
  config: AlternativeSharkConfig
): boolean {
  const { XA_B, AB_C, BC_D, XA_D } = pattern.ratios;
  
  // Check XA retracement at B (should be 0.382-0.618)
  if (XA_B < config.minXA_Ratio || XA_B > config.maxXA_Ratio) return false;
  
  // Check AB projection at C (should be 1.13-1.618, C extends beyond A)
  if (AB_C < config.minAB_Ratio || AB_C > config.maxAB_Ratio) return false;
  
  // Check BC projection at D (should be 1.618-2.24, large extension)
  if (BC_D < config.minBC_Ratio || BC_D > config.maxBC_Ratio) return false;
  
  // Check XA projection at D (should be 0.886-1.13, D near or beyond X)
  if (XA_D < config.minXA_D_Ratio || XA_D > config.maxXA_D_Ratio) return false;
  
  return true;
}

/**
 * Detect Alternative Shark harmonic patterns in price data
 */
export function detectAlternativeSharkPattern(
  highs: number[],
  lows: number[],
  closes: number[],
  config: AlternativeSharkConfig = defaultAlternativeSharkConfig
): AlternativeSharkResult {
  const patterns: AlternativeSharkPattern[] = [];
  
  // Detect pivots
  const pivots = detectPivots(highs, lows, config.zigzagPeriod);
  
  if (pivots.length < 5) {
    return { patterns, currentPivots: pivots };
  }
  
  // Look for 5-point XABCD patterns
  for (let i = 0; i < pivots.length - 4; i++) {
    const X = pivots[i];
    const A = pivots[i + 1];
    const B = pivots[i + 2];
    const C = pivots[i + 3];
    const D = pivots[i + 4];
    
    // Determine pattern type based on pivot sequence
    // Bullish: X(low) -> A(high) -> B(low) -> C(high) -> D(low)
    // Bearish: X(high) -> A(low) -> B(high) -> C(low) -> D(high)
    
    const isBullish = !X.isHigh && A.isHigh && !B.isHigh && C.isHigh && !D.isHigh;
    const isBearish = X.isHigh && !A.isHigh && B.isHigh && !C.isHigh && D.isHigh;
    
    if (!isBullish && !isBearish) continue;
    if (isBullish && !config.showBullish) continue;
    if (isBearish && !config.showBearish) continue;
    
    // Calculate Fibonacci ratios
    const XA_B = calculateRatio(X.price, A.price, B.price);
    const AB_C = calculateRatio(A.price, B.price, C.price);
    const BC_D = calculateRatio(B.price, C.price, D.price);
    const XA_D = calculateRatio(X.price, A.price, D.price);
    
    const pattern: AlternativeSharkPattern = {
      type: isBullish ? 'bullish' : 'bearish',
      points: {
        X: { index: X.index, price: X.price },
        A: { index: A.index, price: A.price },
        B: { index: B.index, price: B.price },
        C: { index: C.index, price: C.price },
        D: { index: D.index, price: D.price },
      },
      ratios: {
        XA_B,
        AB_C,
        BC_D,
        XA_D,
      },
      prz: {
        upper: isBullish 
          ? Math.min(D.price * 1.02, C.price)
          : Math.max(D.price * 0.98, C.price),
        lower: isBullish 
          ? Math.max(D.price * 0.98, X.price)
          : Math.min(D.price * 1.02, X.price),
      },
      isValid: false,
      confirmed: false,
    };
    
    // Validate ratios
    pattern.isValid = validateAlternativeSharkRatios(pattern, config);
    
    // Check confirmation if required
    if (config.confirmLastPivot) {
      const barsAfterD = closes.length - 1 - D.index;
      pattern.confirmed = barsAfterD >= config.confirmPeriod;
    } else {
      pattern.confirmed = true;
    }
    
    // Only add valid patterns if showValidFormat is enabled
    if (config.showValidFormat && !pattern.isValid) continue;
    
    patterns.push(pattern);
  }
  
  return { patterns, currentPivots: pivots };
}
