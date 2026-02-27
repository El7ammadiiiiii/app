// This work is licensed under a Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
// © LuxAlgo - Converted to TypeScript for Display 5 Models

/**
 * Three Drive Pattern Detection
 * 
 * The Three Drive pattern is a 6-point (Y-Z-A-B-C-D) harmonic pattern consisting of three
 * consecutive drives (price movements) with specific Fibonacci relationships:
 * 
 * Pattern Structure:
 * - Y to Z: First drive (initial move)
 * - Z to A: First retracement (0.618-0.786 of YZ)
 * - A to B: Second drive (1.272-1.618 extension of YZ)
 * - B to C: Second retracement (0.618-0.786 of AB)
 * - C to D: Third drive (1.272-1.618 extension of AB)
 * 
 * Key Validations:
 * - Retracements must be within 61.8%-78.6% Fibonacci range
 * - Extensions must be within 127.2%-161.8% Fibonacci range
 * - Width (time duration) of moves should be relatively consistent
 * 
 * Trade Setup:
 * - Entry: At D point (completion of third drive)
 * - Stop Loss: Beyond D point
 * - Target 1: Point C
 * - Target 2: Point A
 */

export interface ThreeDriveConfig {
  zigzagPeriod: number;           // Pivot detection period (default: 3)
  showValidOnly: boolean;          // Show only valid patterns
  showBullish: boolean;            // Display bullish patterns
  showBearish: boolean;            // Display bearish patterns
  // Fibonacci ratio ranges
  minRetracement: number;          // Min retracement ratio (0.618)
  maxRetracement: number;          // Max retracement ratio (0.786)
  minExtension: number;            // Min extension ratio (1.272)
  maxExtension: number;            // Max extension ratio (1.618)
  widthMarginPercent: number;      // Max time duration variance % (100)
}

export const defaultThreeDriveConfig: ThreeDriveConfig = {
  zigzagPeriod: 3,
  showValidOnly: false,
  showBullish: true,
  showBearish: true,
  minRetracement: 0.618,
  maxRetracement: 0.786,
  minExtension: 1.272,
  maxExtension: 1.618,
  widthMarginPercent: 100,
};

interface Pivot {
  index: number;
  price: number;
  isHigh: boolean;
}

export interface ThreeDrivePattern {
  type: 'bullish' | 'bearish';
  points: {
    Y: { index: number; price: number };
    Z: { index: number; price: number };
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
  };
  ratios: {
    ZA_retracement: number;   // Z to A retracement of YZ
    AB_extension: number;     // A to B extension of YZ
    BC_retracement: number;   // B to C retracement of AB
    CD_extension: number;     // C to D extension of AB
  };
  widths: {
    retracements: number[];   // Durations of retracements
    extensions: number[];     // Durations of extensions
  };
  isValid: boolean;
}

export interface ThreeDriveResult {
  patterns: ThreeDrivePattern[];
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
 * Calculate Fibonacci retracement ratio
 */
function calculateRetracement(
  startPrice: number,
  endPrice: number,
  retracementPrice: number,
  isBullish: boolean
): number {
  const move = Math.abs(endPrice - startPrice);
  if (move < 0.0001) return 0;
  
  if (isBullish) {
    // For bullish: retracement goes down from high
    return (endPrice - retracementPrice) / move;
  } else {
    // For bearish: retracement goes up from low
    return (retracementPrice - endPrice) / move;
  }
}

/**
 * Calculate Fibonacci extension ratio
 */
function calculateExtension(
  startPrice: number,
  endPrice: number,
  extensionPrice: number,
  isBullish: boolean
): number {
  const move = Math.abs(endPrice - startPrice);
  if (move < 0.0001) return 0;
  
  if (isBullish) {
    // For bullish: extension goes up beyond start
    return 1 - (endPrice - extensionPrice) / move;
  } else {
    // For bearish: extension goes down beyond start
    return 1 - (extensionPrice - endPrice) / move;
  }
}

/**
 * Validate if ratios are within specified ranges
 */
function validateRatios(
  ratio: number,
  minRatio: number,
  maxRatio: number
): boolean {
  return ratio >= minRatio && ratio <= maxRatio;
}

/**
 * Detect Three Drive patterns in price data
 */
export function detectThreeDrivePattern(
  highs: number[],
  lows: number[],
  closes: number[],
  config: ThreeDriveConfig = defaultThreeDriveConfig
): ThreeDriveResult {
  const patterns: ThreeDrivePattern[] = [];
  
  // Detect pivots
  const pivots = detectPivots(highs, lows, config.zigzagPeriod);
  
  if (pivots.length < 6) {
    return { patterns, currentPivots: pivots };
  }
  
  // Look for 6-point YABCD patterns
  for (let i = 0; i < pivots.length - 5; i++) {
    const Y = pivots[i];
    const Z = pivots[i + 1];
    const A = pivots[i + 2];
    const B = pivots[i + 3];
    const C = pivots[i + 4];
    const D = pivots[i + 5];
    
    // Determine pattern type based on pivot sequence
    // Bullish: Y(low) -> Z(high) -> A(low) -> B(high) -> C(low) -> D(high)
    // Bearish: Y(high) -> Z(low) -> A(high) -> B(low) -> C(high) -> D(low)
    
    const isBullish = !Y.isHigh && Z.isHigh && !A.isHigh && B.isHigh && !C.isHigh && D.isHigh;
    const isBearish = Y.isHigh && !Z.isHigh && A.isHigh && !B.isHigh && C.isHigh && !D.isHigh;
    
    if (!isBullish && !isBearish) continue;
    if (isBullish && !config.showBullish) continue;
    if (isBearish && !config.showBearish) continue;
    
    // Calculate Fibonacci ratios
    const ZA_retracement = calculateRetracement(Y.price, Z.price, A.price, isBullish);
    const AB_extension = calculateExtension(Y.price, Z.price, B.price, isBullish);
    const BC_retracement = calculateRetracement(A.price, B.price, C.price, isBullish);
    const CD_extension = calculateExtension(A.price, B.price, D.price, isBullish);
    
    // Calculate time widths
    const width_ZA = A.index - Z.index;
    const width_BC = C.index - B.index;
    const width_YZ = Z.index - Y.index;
    const width_AB = B.index - A.index;
    const width_CD = D.index - C.index;
    
    const retracementWidths = [width_ZA, width_BC];
    const extensionWidths = [width_YZ, width_AB, width_CD];
    
    // Validate width consistency
    const minRetWidth = Math.min(...retracementWidths);
    const maxRetWidth = Math.max(...retracementWidths);
    const minExtWidth = Math.min(...extensionWidths);
    const maxExtWidth = Math.max(...extensionWidths);
    
    const retWidthVariance = minRetWidth > 0 ? (100 / minRetWidth * maxRetWidth - 100) : 0;
    const extWidthVariance = minExtWidth > 0 ? (100 / minExtWidth * maxExtWidth - 100) : 0;
    
    const pattern: ThreeDrivePattern = {
      type: isBullish ? 'bullish' : 'bearish',
      points: {
        Y: { index: Y.index, price: Y.price },
        Z: { index: Z.index, price: Z.price },
        A: { index: A.index, price: A.price },
        B: { index: B.index, price: B.price },
        C: { index: C.index, price: C.price },
        D: { index: D.index, price: D.price },
      },
      ratios: {
        ZA_retracement,
        AB_extension,
        BC_retracement,
        CD_extension,
      },
      widths: {
        retracements: retracementWidths,
        extensions: extensionWidths,
      },
      isValid: false,
    };
    
    // Validate all Fibonacci ratios and width consistency
    const validZA = validateRatios(ZA_retracement, config.minRetracement, config.maxRetracement);
    const validAB = validateRatios(AB_extension, config.minExtension, config.maxExtension);
    const validBC = validateRatios(BC_retracement, config.minRetracement, config.maxRetracement);
    const validCD = validateRatios(CD_extension, config.minExtension, config.maxExtension);
    const validWidths = retWidthVariance <= config.widthMarginPercent && 
                        extWidthVariance <= config.widthMarginPercent;
    
    pattern.isValid = validZA && validAB && validBC && validCD && validWidths;
    
    // Only add valid patterns if showValidOnly is enabled
    if (config.showValidOnly && !pattern.isValid) continue;
    
    patterns.push(pattern);
  }
  
  return { patterns, currentPivots: pivots };
}
