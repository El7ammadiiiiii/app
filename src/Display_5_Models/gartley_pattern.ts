/**
 * Gartley Harmonic Pattern [TradingFinder]
 * Converted from Pine Script to TypeScript for Display 5 custom models.
 * Original: © TFlab
 * License: Mozilla Public License 2.0 (https://mozilla.org/MPL/2.0/)
 * 
 * Detects Gartley harmonic patterns - a 5-point (XABCD) pattern with specific
 * Fibonacci ratios that signal potential reversal zones.
 */

export type GartleyDirection = 'bullish' | 'bearish';

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface GartleyPattern {
  id: string;
  direction: GartleyDirection;
  X: PivotPoint;
  A: PivotPoint;
  B: PivotPoint;
  C: PivotPoint;
  D: PivotPoint;
  
  // Fibonacci ratios (actual values)
  XA: number;
  AB: number;
  BC: number;
  CD: number;
  
  // Ratio validations
  XA_ratio: number;  // AB retracement of XA (should be 0.618)
  AB_ratio: number;  // BC projection of AB (should be 0.382-0.886)
  BC_ratio: number;  // CD projection of BC (should be 1.13-1.618)
  CD_ratio: number;  // AD retracement of XA (should be 0.786)
  
  isValid: boolean;
  prz: number; // Potential Reversal Zone (point D)
  isConfirmed: boolean;
}

export interface GartleyConfig {
  zigzagPeriod: number;
  showValidOnly: boolean;
  requireLastPivotConfirm: boolean;
  confirmPeriod: number;
  
  // Gartley ratio tolerances
  XA_min: number;  // 0.58
  XA_max: number;  // 0.63
  AB_min: number;  // 0.382
  AB_max: number;  // 0.886
  BC_min: number;  // 1.13
  BC_max: number;  // 1.618
  CD_min: number;  // 0.77
  CD_max: number;  // 0.82
}

export interface GartleyResult {
  patterns: GartleyPattern[];
  pivots: PivotPoint[];
  config: GartleyConfig;
}

const DEFAULT_CONFIG: GartleyConfig = {
  zigzagPeriod: 3,
  showValidOnly: true, // Changed to true for higher accuracy
  requireLastPivotConfirm: true, // Changed to true
  confirmPeriod: 3, // Increased from 2
  // Tightened ratio tolerances for higher accuracy
  XA_min: 0.60, // Tightened from 0.58
  XA_max: 0.64, // Tightened from 0.63
  AB_min: 0.36, // Tightened from 0.382
  AB_max: 0.90, // Tightened from 0.886
  BC_min: 1.10, // Tightened from 1.13
  BC_max: 1.65, // Tightened from 1.618
  CD_min: 0.76, // Tightened from 0.77
  CD_max: 0.80  // Tightened from 0.82
};

/**
 * Detect ZigZag pivots with adaptive window and noise filtering
 */
function detectPivots(
  highs: number[],
  lows: number[],
  period: number
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  // Adaptive period based on volatility
  const adaptivePeriod = calculateAdaptivePeriod(highs, lows, period);
  
  for (let i = adaptivePeriod; i < highs.length - adaptivePeriod; i++) {
    // Pivot High with stronger validation
    let isHigh = true;
    let highConfidence = 0;
    for (let j = 1; j <= adaptivePeriod; j++) {
      if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) {
        isHigh = false;
        break;
      }
      // Count how much lower surrounding bars are
      highConfidence += (highs[i] - highs[i - j]) / highs[i];
      highConfidence += (highs[i] - highs[i + j]) / highs[i];
    }
    
    // Only add pivot if confidence is sufficient (bars are significantly lower)
    if (isHigh && highConfidence / (adaptivePeriod * 2) > 0.002) {
      pivots.push({ index: i, price: highs[i], type: 'high' });
    }
    
    // Pivot Low with stronger validation
    let isLow = true;
    let lowConfidence = 0;
    for (let j = 1; j <= adaptivePeriod; j++) {
      if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) {
        isLow = false;
        break;
      }
      // Count how much higher surrounding bars are
      lowConfidence += (lows[i - j] - lows[i]) / lows[i];
      lowConfidence += (lows[i + j] - lows[i]) / lows[i];
    }
    
    // Only add pivot if confidence is sufficient
    if (isLow && lowConfidence / (adaptivePeriod * 2) > 0.002) {
      pivots.push({ index: i, price: lows[i], type: 'low' });
    }
  }
  
  // Sort by index and filter alternating pivots
  const sortedPivots = pivots.sort((a, b) => a.index - b.index);
  return filterAlternatingPivots(sortedPivots);
}

/**
 * Calculate adaptive period based on volatility
 */
function calculateAdaptivePeriod(highs: number[], lows: number[], basePeriod: number): number {
  if (highs.length < 20) return basePeriod;
  
  let totalRange = 0;
  for (let i = 1; i < Math.min(20, highs.length); i++) {
    totalRange += highs[i] - lows[i];
  }
  const avgRange = totalRange / 19;
  const avgPrice = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
  const volatility = avgRange / avgPrice;
  
  // Higher volatility = larger period to filter noise
  if (volatility > 0.05) return basePeriod + 2;
  if (volatility > 0.03) return basePeriod + 1;
  return basePeriod;
}

/**
 * Filter to ensure alternating high/low pivots
 */
function filterAlternatingPivots(pivots: PivotPoint[]): PivotPoint[] {
  if (pivots.length < 2) return pivots;
  
  const result: PivotPoint[] = [pivots[0]];
  
  for (let i = 1; i < pivots.length; i++) {
    const last = result[result.length - 1];
    const current = pivots[i];
    
    if (last.type !== current.type) {
      // Alternating - good
      result.push(current);
    } else {
      // Same type - keep the more extreme one
      if (last.type === 'high' && current.price > last.price) {
        result[result.length - 1] = current;
      } else if (last.type === 'low' && current.price < last.price) {
        result[result.length - 1] = current;
      }
    }
  }
  
  return result;
}

/**
 * Calculate Fibonacci retracement ratio
 */
function fibRatio(startPrice: number, endPrice: number, retracementPrice: number): number {
  const range = Math.abs(endPrice - startPrice);
  if (range === 0) return 0;
  return Math.abs(retracementPrice - endPrice) / range;
}

/**
 * Calculate Fibonacci extension ratio
 */
function fibExtension(startPrice: number, endPrice: number, extensionPrice: number): number {
  const range = Math.abs(endPrice - startPrice);
  if (range === 0) return 0;
  return Math.abs(extensionPrice - endPrice) / range;
}

/**
 * Validate Gartley pattern ratios with confidence scoring
 */
function validateGartleyRatios(
  X: PivotPoint,
  A: PivotPoint,
  B: PivotPoint,
  C: PivotPoint,
  D: PivotPoint,
  config: GartleyConfig,
  direction: GartleyDirection
): { isValid: boolean; ratios: any; confidence: number } {
  const XA = Math.abs(A.price - X.price);
  const AB = Math.abs(B.price - A.price);
  const BC = Math.abs(C.price - B.price);
  const CD = Math.abs(D.price - C.price);
  const XD = Math.abs(D.price - X.price);
  
  // AB retracement of XA (0.618 ideal, but range 0.58-0.63)
  const AB_XA_ratio = AB / XA;
  
  // BC projection of AB (0.382-0.886)
  const BC_AB_ratio = BC / AB;
  
  // CD projection of BC (1.13-1.618)
  const CD_BC_ratio = CD / BC;
  
  // AD retracement of XA (0.786 ideal, but range 0.77-0.82)
  const XD_XA_ratio = XD / XA;
  
  // Check validity
  const AB_XA_valid = AB_XA_ratio >= config.XA_min && AB_XA_ratio <= config.XA_max;
  const BC_AB_valid = BC_AB_ratio >= config.AB_min && BC_AB_ratio <= config.AB_max;
  const CD_BC_valid = CD_BC_ratio >= config.BC_min && CD_BC_ratio <= config.BC_max;
  const XD_XA_valid = XD_XA_ratio >= config.CD_min && XD_XA_ratio <= config.CD_max;
  
  const isValid = AB_XA_valid && BC_AB_valid && CD_BC_valid && XD_XA_valid;
  
  // Calculate confidence score based on how close to ideal ratios
  const idealAB_XA = 0.618;
  const idealCD_XA = 0.786;
  
  const AB_XA_error = Math.abs(AB_XA_ratio - idealAB_XA) / idealAB_XA;
  const XD_XA_error = Math.abs(XD_XA_ratio - idealCD_XA) / idealCD_XA;
  
  // Confidence score (lower error = higher confidence)
  const errorScore = 1 - (AB_XA_error + XD_XA_error) / 2;
  
  // Symmetry score (timing between legs)
  const leftDuration = B.index - X.index;
  const rightDuration = D.index - B.index;
  const symmetryScore = Math.min(leftDuration, rightDuration) / Math.max(leftDuration, rightDuration);
  
  // Combined confidence
  const confidence = (
    errorScore * 0.6 +
    symmetryScore * 0.4
  );
  
  return {
    isValid,
    ratios: {
      XA,
      AB,
      BC,
      CD,
      XA_ratio: AB_XA_ratio,
      AB_ratio: BC_AB_ratio,
      BC_ratio: CD_BC_ratio,
      CD_ratio: XD_XA_ratio
    },
    confidence
  };
}

/**
 * Detect Gartley patterns from pivots
 */
function detectGartleyPatterns(
  pivots: PivotPoint[],
  config: GartleyConfig,
  closes: number[]
): GartleyPattern[] {
  const patterns: GartleyPattern[] = [];
  
  if (pivots.length < 5) return patterns;
  
  // Scan for 5-point patterns
  for (let i = 0; i <= pivots.length - 5; i++) {
    const X = pivots[i];
    const A = pivots[i + 1];
    const B = pivots[i + 2];
    const C = pivots[i + 3];
    const D = pivots[i + 4];
    
    // Bullish Gartley: X(low) -> A(high) -> B(low) -> C(high) -> D(low)
    if (
      X.type === 'low' &&
      A.type === 'high' &&
      B.type === 'low' &&
      C.type === 'high' &&
      D.type === 'low'
    ) {
      const validation = validateGartleyRatios(X, A, B, C, D, config, 'bullish');
      
      if (!config.showValidOnly || validation.isValid) {
        // Check if pattern is confirmed (price moved above D)
        let isConfirmed = false;
        if (D.index < closes.length - 1) {
          const confirmBars = Math.min(config.confirmPeriod, closes.length - D.index - 1);
          for (let j = 1; j <= confirmBars; j++) {
            if (closes[D.index + j] > D.price) {
              isConfirmed = true;
              break;
            }
          }
        }
        
        patterns.push({
          id: `gartley-bull-${X.index}-${D.index}`,
          direction: 'bullish',
          X,
          A,
          B,
          C,
          D,
          ...validation.ratios,
          isValid: validation.isValid,
          prz: D.price,
          isConfirmed
        });
      }
    }
    
    // Bearish Gartley: X(high) -> A(low) -> B(high) -> C(low) -> D(high)
    if (
      X.type === 'high' &&
      A.type === 'low' &&
      B.type === 'high' &&
      C.type === 'low' &&
      D.type === 'high'
    ) {
      const validation = validateGartleyRatios(X, A, B, C, D, config, 'bearish');
      
      if (!config.showValidOnly || validation.isValid) {
        // Check if pattern is confirmed (price moved below D)
        let isConfirmed = false;
        if (D.index < closes.length - 1) {
          const confirmBars = Math.min(config.confirmPeriod, closes.length - D.index - 1);
          for (let j = 1; j <= confirmBars; j++) {
            if (closes[D.index + j] < D.price) {
              isConfirmed = true;
              break;
            }
          }
        }
        
        patterns.push({
          id: `gartley-bear-${X.index}-${D.index}`,
          direction: 'bearish',
          X,
          A,
          B,
          C,
          D,
          ...validation.ratios,
          isValid: validation.isValid,
          prz: D.price,
          isConfirmed
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Main function to detect Gartley patterns
 */
export function detectGartleyPattern(
  highs: number[],
  lows: number[],
  closes: number[],
  config?: Partial<GartleyConfig>
): GartleyResult {
  const mergedConfig: GartleyConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (highs.length < 20) {
    return { patterns: [], pivots: [], config: mergedConfig };
  }
  
  // Detect pivots
  const pivots = detectPivots(highs, lows, mergedConfig.zigzagPeriod);
  
  // Detect patterns
  const patterns = detectGartleyPatterns(pivots, mergedConfig, closes);
  
  return {
    patterns,
    pivots,
    config: mergedConfig
  };
}
