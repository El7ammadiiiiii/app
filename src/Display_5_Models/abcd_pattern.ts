// This code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © TFlab - Converted to TypeScript for Display 5 Models

/**
 * ABCD Harmonic Pattern Detection
 * 
 * The ABCD pattern is a 4-point harmonic pattern with specific Fibonacci ratios:
 * - AB Retracement (C): 0.382 to 0.886 (typically 61.8% or 78.6%)
 * - BC Projection (D): 1.13 to 2.618 (typically 127.2% or 161.8%)
 * 
 * This is the simplest harmonic pattern and forms the foundation for more complex patterns.
 * Unlike 5-point XABCD patterns (Gartley, Bat, etc.), ABCD only requires 4 pivot points.
 * 
 * Pattern Structure:
 * - Bullish: A(high) -> B(low) -> C(high) -> D(low)
 * - Bearish: A(low) -> B(high) -> C(low) -> D(high)
 * 
 * Trade Setup:
 * - Entry: At D point
 * - Stop Loss: Below D for bullish, above D for bearish
 * - Target 1: 38.2% CD retracement
 * - Target 2: 61.8% CD retracement
 */

export interface ABCDConfig {
  zigzagPeriod: number;           // Pivot detection period (default: 3)
  showValidFormat: boolean;        // Show only valid patterns
  confirmLastPivot: boolean;       // Wait for pivot confirmation
  confirmPeriod: number;           // Bars for pivot confirmation
  showBullish: boolean;            // Display bullish patterns
  showBearish: boolean;            // Display bearish patterns
  // Fibonacci ratio ranges for ABCD
  minAB_Ratio: number;            // Min AB retracement at C (0.382)
  maxAB_Ratio: number;            // Max AB retracement at C (0.886)
  minBC_Ratio: number;            // Min BC projection at D (1.13)
  maxBC_Ratio: number;            // Max BC projection at D (2.618)
}

export const defaultABCDConfig: ABCDConfig = {
  zigzagPeriod: 3,
  showValidFormat: false,
  confirmLastPivot: false,
  confirmPeriod: 2,
  showBullish: true,
  showBearish: true,
  minAB_Ratio: 0.382,
  maxAB_Ratio: 0.886,
  minBC_Ratio: 1.13,
  maxBC_Ratio: 2.618,
};

interface Pivot {
  index: number;
  price: number;
  isHigh: boolean;
}

export interface ABCDPattern {
  type: 'bullish' | 'bearish';
  points: {
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
  };
  ratios: {
    AB_C: number;     // C retracement of AB
    BC_D: number;     // D projection of BC
  };
  targetLevels: {
    target1: number;  // 38.2% CD retracement
    target2: number;  // 61.8% CD retracement
  };
  isValid: boolean;
  confirmed: boolean;
}

export interface ABCDResult {
  patterns: ABCDPattern[];
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
 * Validate if the pattern ratios match ABCD requirements
 */
function validateABCDRatios(
  pattern: ABCDPattern,
  config: ABCDConfig
): boolean {
  const { AB_C, BC_D } = pattern.ratios;
  
  // Check AB retracement at C (should be 0.382-0.886, typically 61.8%)
  if (AB_C < config.minAB_Ratio || AB_C > config.maxAB_Ratio) return false;
  
  // Check BC projection at D (should be 1.13-2.618, typically 127.2% or 161.8%)
  if (BC_D < config.minBC_Ratio || BC_D > config.maxBC_Ratio) return false;
  
  return true;
}

/**
 * Detect ABCD harmonic patterns in price data
 */
export function detectABCDPattern(
  highs: number[],
  lows: number[],
  closes: number[],
  config: ABCDConfig = defaultABCDConfig
): ABCDResult {
  const patterns: ABCDPattern[] = [];
  
  // Detect pivots
  const pivots = detectPivots(highs, lows, config.zigzagPeriod);
  
  if (pivots.length < 4) {
    return { patterns, currentPivots: pivots };
  }
  
  // Look for 4-point ABCD patterns
  for (let i = 0; i < pivots.length - 3; i++) {
    const A = pivots[i];
    const B = pivots[i + 1];
    const C = pivots[i + 2];
    const D = pivots[i + 3];
    
    // Determine pattern type based on pivot sequence
    // Bullish: A(high) -> B(low) -> C(high) -> D(low)
    // Bearish: A(low) -> B(high) -> C(low) -> D(high)
    
    const isBullish = A.isHigh && !B.isHigh && C.isHigh && !D.isHigh;
    const isBearish = !A.isHigh && B.isHigh && !C.isHigh && D.isHigh;
    
    if (!isBullish && !isBearish) continue;
    if (isBullish && !config.showBullish) continue;
    if (isBearish && !config.showBearish) continue;
    
    // Calculate Fibonacci ratios
    const AB_C = calculateRatio(A.price, B.price, C.price);
    const BC_D = calculateRatio(B.price, C.price, D.price);
    
    // Calculate target levels (38.2% and 61.8% CD retracement)
    const CD_move = D.price - C.price;
    const target1 = D.price + CD_move * 0.382 * (isBullish ? 1 : -1);
    const target2 = D.price + CD_move * 0.618 * (isBullish ? 1 : -1);
    
    const pattern: ABCDPattern = {
      type: isBullish ? 'bullish' : 'bearish',
      points: {
        A: { index: A.index, price: A.price },
        B: { index: B.index, price: B.price },
        C: { index: C.index, price: C.price },
        D: { index: D.index, price: D.price },
      },
      ratios: {
        AB_C,
        BC_D,
      },
      targetLevels: {
        target1,
        target2,
      },
      isValid: false,
      confirmed: false,
    };
    
    // Validate ratios
    pattern.isValid = validateABCDRatios(pattern, config);
    
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
