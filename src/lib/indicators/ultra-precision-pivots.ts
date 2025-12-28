/**
 * 🎯 ULTRA-PRECISION PIVOT DETECTION
 * Float-Index Pivot Detection with Sub-Bar Accuracy
 * 
 * Features:
 * - Multi-Scale Detection: Fibonacci windows [2,3,5,8,13,21]
 * - Parabolic Interpolation: Sub-bar pivot positioning
 * - Prominence Scoring: Multi-scale confirmation
 * - Alternation Enforcement: H-L-H-L pattern validation
 * - Kalman-Smoothed Detection: Noise-resistant pivots
 * 
 * Precision: 0.01 bar (1% of bar width)
 * 
 * @version 3.0.0 Ultra-Precision Edition
 */

import {
  type OHLCV,
  type FloatPivot,
  ULTRA_PRECISION_CONFIG,
  KalmanFilter,
  savitzkyGolaySmooth,
  getCurrentATR,
  getFloatPivotIndex,
  parabolicInterpolation,
  median,
  mean,
} from './ultra-precision-math';

// ============================================
// TYPES
// ============================================

export interface PivotDetectionResult {
  highs: FloatPivot[];
  lows: FloatPivot[];
  alternatingPivots: FloatPivot[];  // H-L-H-L ordered sequence
  quality: {
    totalPivots: number;
    confirmedPivots: number;
    avgConfidence: number;
    alternationScore: number;
  };
}

interface RawPivot {
  index: number;
  price: number;
  type: 'high' | 'low';
  detectionCount: number;  // How many scales detected this
  windows: number[];       // Which window sizes detected this
}

// ============================================
// MULTI-SCALE PIVOT DETECTION
// ============================================

/**
 * Detect pivots at multiple scales using Fibonacci windows
 * Returns raw pivot candidates with detection counts
 */
function detectMultiScalePivots(
  data: OHLCV[],
  type: 'high' | 'low'
): Map<number, RawPivot> {
  const windows = ULTRA_PRECISION_CONFIG.PIVOT_WINDOWS;
  const candidates: Map<number, RawPivot> = new Map();
  
  for (const window of windows) {
    for (let i = window; i < data.length - window; i++) {
      let isPivot = true;
      const currentValue = type === 'high' ? data[i].high : data[i].low;
      
      // Check all bars in window
      for (let j = 1; j <= window; j++) {
        const leftValue = type === 'high' ? data[i - j].high : data[i - j].low;
        const rightValue = type === 'high' ? data[i + j].high : data[i + j].low;
        
        if (type === 'high') {
          if (currentValue <= leftValue || currentValue <= rightValue) {
            isPivot = false;
            break;
          }
        } else {
          if (currentValue >= leftValue || currentValue >= rightValue) {
            isPivot = false;
            break;
          }
        }
      }
      
      if (isPivot) {
        const existing = candidates.get(i);
        if (existing) {
          existing.detectionCount++;
          existing.windows.push(window);
        } else {
          candidates.set(i, {
            index: i,
            price: currentValue,
            type,
            detectionCount: 1,
            windows: [window],
          });
        }
      }
    }
  }
  
  return candidates;
}

/**
 * Calculate prominence for a pivot point
 * Prominence = height above/below surrounding valleys/peaks
 */
function calculateProminence(
  data: OHLCV[],
  pivotIndex: number,
  pivotType: 'high' | 'low',
  lookback: number = 30
): number {
  const pivotPrice = pivotType === 'high' ? data[pivotIndex].high : data[pivotIndex].low;
  
  let leftExtreme = pivotPrice;
  let rightExtreme = pivotPrice;
  
  // Find extreme on left
  for (let i = pivotIndex - 1; i >= Math.max(0, pivotIndex - lookback); i--) {
    const price = pivotType === 'high' ? data[i].low : data[i].high;
    if (pivotType === 'high') {
      leftExtreme = Math.min(leftExtreme, price);
    } else {
      leftExtreme = Math.max(leftExtreme, price);
    }
  }
  
  // Find extreme on right
  for (let i = pivotIndex + 1; i < Math.min(data.length, pivotIndex + lookback); i++) {
    const price = pivotType === 'high' ? data[i].low : data[i].high;
    if (pivotType === 'high') {
      rightExtreme = Math.min(rightExtreme, price);
    } else {
      rightExtreme = Math.max(rightExtreme, price);
    }
  }
  
  // Prominence is the smaller of the two drops/rises
  if (pivotType === 'high') {
    return pivotPrice - Math.max(leftExtreme, rightExtreme);
  } else {
    return Math.min(leftExtreme, rightExtreme) - pivotPrice;
  }
}

/**
 * Convert raw pivot to float pivot with sub-bar precision
 */
function convertToFloatPivot(
  data: OHLCV[],
  raw: RawPivot,
  atr: number
): FloatPivot {
  // Get float index using parabolic interpolation
  const { floatIndex, exactPrice } = getFloatPivotIndex(data, raw.index, raw.type);
  
  // Calculate prominence
  const prominence = calculateProminence(data, raw.index, raw.type);
  
  // Calculate confidence based on:
  // 1. Detection count (multi-scale confirmation)
  // 2. Prominence relative to ATR
  // 3. Number of windows that detected it
  
  const multiScaleScore = Math.min(1, raw.detectionCount / 4);  // Max score at 4+ scales
  const prominenceScore = Math.min(1, prominence / (atr * 2));  // Max score at 2x ATR
  const windowScore = raw.windows.includes(8) || raw.windows.includes(13) ? 1 : 0.7;  // Bonus for larger windows
  
  const confidence = (multiScaleScore * 40 + prominenceScore * 40 + windowScore * 20);
  const confirmed = raw.detectionCount >= ULTRA_PRECISION_CONFIG.PIVOT_MULTI_SCALE_THRESHOLD;
  
  return {
    index: floatIndex,
    exactIndex: raw.index,
    subBarOffset: floatIndex - raw.index,
    price: exactPrice,
    type: raw.type,
    prominence,
    confidence,
    confirmed,
  };
}

// ============================================
// KALMAN-ENHANCED PIVOT DETECTION
// ============================================

/**
 * Detect pivots on Kalman-smoothed data for noise resistance
 */
function detectKalmanEnhancedPivots(
  data: OHLCV[],
  type: 'high' | 'low'
): Map<number, RawPivot> {
  // Extract price series
  const prices = data.map(d => type === 'high' ? d.high : d.low);
  
  // Apply Kalman smoothing
  const smoothed: number[] = [];
  const filter = new KalmanFilter(prices[0]);
  for (const p of prices) {
    smoothed.push(filter.update(p));
  }
  
  // Detect pivots on smoothed data
  const candidates: Map<number, RawPivot> = new Map();
  const window = 5;  // Fixed window for Kalman detection
  
  for (let i = window; i < smoothed.length - window; i++) {
    let isPivot = true;
    
    for (let j = 1; j <= window; j++) {
      if (type === 'high') {
        if (smoothed[i] <= smoothed[i - j] || smoothed[i] <= smoothed[i + j]) {
          isPivot = false;
          break;
        }
      } else {
        if (smoothed[i] >= smoothed[i - j] || smoothed[i] >= smoothed[i + j]) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      // Use original price, not smoothed
      const originalPrice = type === 'high' ? data[i].high : data[i].low;
      candidates.set(i, {
        index: i,
        price: originalPrice,
        type,
        detectionCount: 1,
        windows: [-1],  // Special marker for Kalman detection
      });
    }
  }
  
  return candidates;
}

/**
 * Merge multi-scale and Kalman pivot detections
 */
function mergePivotDetections(
  multiScale: Map<number, RawPivot>,
  kalman: Map<number, RawPivot>,
  tolerance: number = 2
): Map<number, RawPivot> {
  const merged = new Map(multiScale);
  
  for (const [idx, kalmanPivot] of kalman) {
    // Check if there's a nearby multi-scale pivot
    let foundMatch = false;
    for (let offset = -tolerance; offset <= tolerance; offset++) {
      if (merged.has(idx + offset)) {
        // Boost the existing pivot
        const existing = merged.get(idx + offset)!;
        existing.detectionCount++;
        existing.windows.push(-1);  // Mark Kalman confirmation
        foundMatch = true;
        break;
      }
    }
    
    // If no match, add as new (but with lower priority)
    if (!foundMatch) {
      merged.set(idx, kalmanPivot);
    }
  }
  
  return merged;
}

// ============================================
// ALTERNATION ENFORCEMENT
// ============================================

/**
 * Enforce H-L-H-L alternation pattern
 * Returns ordered sequence of alternating pivots
 */
function enforceAlternation(
  highs: FloatPivot[],
  lows: FloatPivot[]
): { alternating: FloatPivot[]; score: number } {
  // Combine and sort by index
  const all = [...highs, ...lows].sort((a, b) => a.index - b.index);
  
  if (all.length < 2) {
    return { alternating: all, score: 1 };
  }
  
  const result: FloatPivot[] = [all[0]];
  let violations = 0;
  let total = 0;
  
  for (let i = 1; i < all.length; i++) {
    const prev = result[result.length - 1];
    const curr = all[i];
    
    total++;
    
    // Check alternation
    if (prev.type !== curr.type) {
      // Good - alternating
      result.push(curr);
    } else {
      // Same type - keep the more prominent one
      violations++;
      
      if (prev.type === 'high') {
        // Keep higher high
        if (curr.price > prev.price) {
          result[result.length - 1] = curr;
        }
      } else {
        // Keep lower low
        if (curr.price < prev.price) {
          result[result.length - 1] = curr;
        }
      }
    }
  }
  
  const score = total > 0 ? 1 - (violations / total) : 1;
  
  return { alternating: result, score };
}

/**
 * Select best pivots for pattern detection
 * Filters by prominence and confirmation
 */
function selectBestPivots(
  pivots: FloatPivot[],
  atr: number,
  maxCount: number = 20
): FloatPivot[] {
  const minProminence = atr * ULTRA_PRECISION_CONFIG.PIVOT_MIN_PROMINENCE_ATR;
  
  // Filter by prominence and confirmation
  const filtered = pivots.filter(p => 
    p.prominence >= minProminence || p.confirmed
  );
  
  // Sort by confidence (descending)
  const sorted = [...filtered].sort((a, b) => b.confidence - a.confidence);
  
  // Take top pivots
  return sorted.slice(0, maxCount);
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

/**
 * Detect pivots with ultra-precision
 * Combines multi-scale, Kalman, and parabolic interpolation
 */
export function detectUltraPrecisionPivots(
  data: OHLCV[]
): PivotDetectionResult {
  if (data.length < 50) {
    return {
      highs: [],
      lows: [],
      alternatingPivots: [],
      quality: {
        totalPivots: 0,
        confirmedPivots: 0,
        avgConfidence: 0,
        alternationScore: 0,
      },
    };
  }
  
  const atr = getCurrentATR(data);
  
  // Multi-scale detection
  const multiScaleHighs = detectMultiScalePivots(data, 'high');
  const multiScaleLows = detectMultiScalePivots(data, 'low');
  
  // Kalman-enhanced detection
  const kalmanHighs = detectKalmanEnhancedPivots(data, 'high');
  const kalmanLows = detectKalmanEnhancedPivots(data, 'low');
  
  // Merge detections
  const mergedHighs = mergePivotDetections(multiScaleHighs, kalmanHighs);
  const mergedLows = mergePivotDetections(multiScaleLows, kalmanLows);
  
  // Convert to float pivots
  const floatHighs: FloatPivot[] = [];
  const floatLows: FloatPivot[] = [];
  
  for (const raw of mergedHighs.values()) {
    floatHighs.push(convertToFloatPivot(data, raw, atr));
  }
  
  for (const raw of mergedLows.values()) {
    floatLows.push(convertToFloatPivot(data, raw, atr));
  }
  
  // Select best pivots
  const bestHighs = selectBestPivots(floatHighs, atr);
  const bestLows = selectBestPivots(floatLows, atr);
  
  // Sort by index
  bestHighs.sort((a, b) => a.index - b.index);
  bestLows.sort((a, b) => a.index - b.index);
  
  // Enforce alternation
  const { alternating, score: alternationScore } = enforceAlternation(bestHighs, bestLows);
  
  // Calculate quality metrics
  const allPivots = [...bestHighs, ...bestLows];
  const confirmedCount = allPivots.filter(p => p.confirmed).length;
  const avgConfidence = allPivots.length > 0 
    ? mean(allPivots.map(p => p.confidence))
    : 0;
  
  return {
    highs: bestHighs,
    lows: bestLows,
    alternatingPivots: alternating,
    quality: {
      totalPivots: allPivots.length,
      confirmedPivots: confirmedCount,
      avgConfidence,
      alternationScore,
    },
  };
}

// ============================================
// SPECIALIZED PIVOT SELECTION
// ============================================

/**
 * Get recent pivots for pattern detection
 * Focuses on the most recent N pivots
 */
export function getRecentPivots(
  result: PivotDetectionResult,
  count: number = 10
): { highs: FloatPivot[]; lows: FloatPivot[] } {
  const highs = result.highs.slice(-count);
  const lows = result.lows.slice(-count);
  
  return { highs, lows };
}

/**
 * Get pivots within a specific index range
 */
export function getPivotsInRange(
  result: PivotDetectionResult,
  startIdx: number,
  endIdx: number
): { highs: FloatPivot[]; lows: FloatPivot[] } {
  const highs = result.highs.filter(p => p.index >= startIdx && p.index <= endIdx);
  const lows = result.lows.filter(p => p.index >= startIdx && p.index <= endIdx);
  
  return { highs, lows };
}

/**
 * Get confirmed pivots only
 */
export function getConfirmedPivots(
  result: PivotDetectionResult
): { highs: FloatPivot[]; lows: FloatPivot[] } {
  const highs = result.highs.filter(p => p.confirmed);
  const lows = result.lows.filter(p => p.confirmed);
  
  return { highs, lows };
}

/**
 * Get high-confidence pivots (confidence > threshold)
 */
export function getHighConfidencePivots(
  result: PivotDetectionResult,
  threshold: number = 70
): { highs: FloatPivot[]; lows: FloatPivot[] } {
  const highs = result.highs.filter(p => p.confidence >= threshold);
  const lows = result.lows.filter(p => p.confidence >= threshold);
  
  return { highs, lows };
}

// ============================================
// PIVOT VALIDATION
// ============================================

/**
 * Validate pivot sequence for a specific pattern type
 */
export function validatePivotSequence(
  pivots: FloatPivot[],
  expectedPattern: 'H-L-H-L' | 'L-H-L-H' | 'ascending' | 'descending'
): { valid: boolean; score: number } {
  if (pivots.length < 4) {
    return { valid: false, score: 0 };
  }
  
  let violations = 0;
  const total = pivots.length - 1;
  
  for (let i = 1; i < pivots.length; i++) {
    const prev = pivots[i - 1];
    const curr = pivots[i];
    
    switch (expectedPattern) {
      case 'H-L-H-L':
      case 'L-H-L-H':
        // Check alternation
        if (prev.type === curr.type) violations++;
        break;
        
      case 'ascending':
        // Each pivot should be higher than previous of same type
        if (prev.type === curr.type && curr.price <= prev.price) violations++;
        break;
        
      case 'descending':
        // Each pivot should be lower than previous of same type
        if (prev.type === curr.type && curr.price >= prev.price) violations++;
        break;
    }
  }
  
  const score = 1 - (violations / total);
  const valid = score >= 0.8;  // 80% compliance required
  
  return { valid, score };
}

/**
 * Calculate pivot density (pivots per bar)
 */
export function calculatePivotDensity(
  result: PivotDetectionResult,
  dataLength: number
): number {
  return result.quality.totalPivots / dataLength;
}
