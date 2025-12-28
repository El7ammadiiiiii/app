// Converted to TypeScript for Display 5 Models

/**
 * Trend Line Methods (TLM)
 * 
 * Two advanced methods for detecting trend channels:
 * 
 * Method 1: Pivot Span Trendline
 * - Detects pivot highs and lows over time
 * - Stores multiple pivot points (configurable count)
 * - Calculates linear regression through pivot points
 * - Creates dynamic high/low trend lines
 * - Fills area between trend lines
 * 
 * Method 2: 5-Point Straight Channel
 * - Divides lookback window into 5 equal segments
 * - Finds highest high and lowest low in each segment
 * - Performs linear regression on 5 high points and 5 low points
 * - Creates smooth channel lines
 * - More stable than pivot-based method
 * 
 * Use Cases:
 * - Pivot Span: Better for volatile markets with clear pivots
 * - 5-Point Channel: Better for trending markets, smoother lines
 */

export interface TrendLineMethodsConfig {
  // Pivot Span Trendline (Method 1)
  enablePivotSpan: boolean;
  pivotLeft: number;           // Left bars for pivot detection (5 default)
  pivotRight: number;          // Right bars for pivot detection (5 default)
  pivotCount: number;          // Number of pivots to track (5 default)
  pivotLookback: number;       // Lookback length (150 default)
  
  // 5-Point Channel (Method 2)
  enableFivePoint: boolean;
  fivePointLength: number;     // Channel length in bars (100 default)
}

export const defaultTrendLineMethodsConfig: TrendLineMethodsConfig = {
  enablePivotSpan: true,
  pivotLeft: 5,
  pivotRight: 5,
  pivotCount: 5,
  pivotLookback: 150,
  enableFivePoint: false,
  fivePointLength: 100,
};

export interface TrendLineResult {
  // Method 1: Pivot Span
  pivotSpan: {
    highLine: { x1: number; y1: number; x2: number; y2: number } | null;
    lowLine: { x1: number; y1: number; x2: number; y2: number } | null;
    highPivots: Array<{ index: number; price: number }>;
    lowPivots: Array<{ index: number; price: number }>;
  };
  
  // Method 2: 5-Point Channel
  fivePoint: {
    highLine: { x1: number; y1: number; x2: number; y2: number } | null;
    lowLine: { x1: number; y1: number; x2: number; y2: number } | null;
    highPoints: Array<{ index: number; price: number }>;
    lowPoints: Array<{ index: number; price: number }>;
  };
}

/**
 * Detect pivot highs using left/right bars
 */
function detectPivotHighs(
  highs: number[],
  leftBars: number,
  rightBars: number
): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  
  for (let i = leftBars; i < highs.length - rightBars; i++) {
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= leftBars; j++) {
      if (highs[i - j] >= highs[i]) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (highs[i + j] >= highs[i]) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: highs[i] });
    }
  }
  
  return pivots;
}

/**
 * Detect pivot lows using left/right bars
 */
function detectPivotLows(
  lows: number[],
  leftBars: number,
  rightBars: number
): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  
  for (let i = leftBars; i < lows.length - rightBars; i++) {
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= leftBars; j++) {
      if (lows[i - j] <= lows[i]) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (lows[i + j] <= lows[i]) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: lows[i] });
    }
  }
  
  return pivots;
}

/**
 * Calculate linear regression for trend line
 */
function calculateLinearRegression(
  points: Array<{ index: number; price: number }>
): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (const point of points) {
    sumX += point.index;
    sumY += point.price;
    sumXY += point.index * point.price;
    sumX2 += point.index * point.index;
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return null;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

/**
 * Method 1: Pivot Span Trendline
 */
function calculatePivotSpanTrendline(
  highs: number[],
  lows: number[],
  config: TrendLineMethodsConfig
): TrendLineResult['pivotSpan'] {
  const currentIndex = highs.length - 1;
  
  // Detect all pivots
  const allHighPivots = detectPivotHighs(highs, config.pivotLeft, config.pivotRight);
  const allLowPivots = detectPivotLows(lows, config.pivotLeft, config.pivotRight);
  
  // Keep only last N pivots
  const highPivots = allHighPivots.slice(-config.pivotCount);
  const lowPivots = allLowPivots.slice(-config.pivotCount);
  
  let highLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  let lowLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  
  // Calculate high trend line
  if (highPivots.length >= 2) {
    const regression = calculateLinearRegression(highPivots);
    if (regression) {
      const x1 = currentIndex - config.pivotLookback + 1;
      const x2 = currentIndex;
      const y1 = regression.slope * x1 + regression.intercept;
      const y2 = regression.slope * x2 + regression.intercept;
      highLine = { x1, y1, x2, y2 };
    }
  }
  
  // Calculate low trend line
  if (lowPivots.length >= 2) {
    const regression = calculateLinearRegression(lowPivots);
    if (regression) {
      const x1 = currentIndex - config.pivotLookback + 1;
      const x2 = currentIndex;
      const y1 = regression.slope * x1 + regression.intercept;
      const y2 = regression.slope * x2 + regression.intercept;
      lowLine = { x1, y1, x2, y2 };
    }
  }
  
  return { highLine, lowLine, highPivots, lowPivots };
}

/**
 * Method 2: 5-Point Straight Channel
 */
function calculateFivePointChannel(
  highs: number[],
  lows: number[],
  length: number
): TrendLineResult['fivePoint'] {
  const currentIndex = highs.length - 1;
  
  if (currentIndex < length) {
    return {
      highLine: null,
      lowLine: null,
      highPoints: [],
      lowPoints: []
    };
  }
  
  const segmentLength = Math.max(1, Math.floor(length / 5));
  const highPoints: Array<{ index: number; price: number }> = [];
  const lowPoints: Array<{ index: number; price: number }> = [];
  
  // Divide into 5 segments and find highest/lowest in each
  for (let k = 0; k < 5; k++) {
    const segStart = k * segmentLength;
    const remaining = length - segStart;
    
    if (remaining <= 0) break;
    
    const segLen = k < 4 ? Math.min(segmentLength, remaining) : remaining;
    
    // Find highest high in segment
    let maxHigh = -Infinity;
    let maxHighIndex = -1;
    for (let i = 0; i < segLen; i++) {
      const idx = currentIndex - segStart - i;
      if (idx >= 0 && highs[idx] > maxHigh) {
        maxHigh = highs[idx];
        maxHighIndex = idx;
      }
    }
    if (maxHighIndex >= 0) {
      highPoints.push({ index: maxHighIndex, price: maxHigh });
    }
    
    // Find lowest low in segment
    let minLow = Infinity;
    let minLowIndex = -1;
    for (let i = 0; i < segLen; i++) {
      const idx = currentIndex - segStart - i;
      if (idx >= 0 && lows[idx] < minLow) {
        minLow = lows[idx];
        minLowIndex = idx;
      }
    }
    if (minLowIndex >= 0) {
      lowPoints.push({ index: minLowIndex, price: minLow });
    }
  }
  
  let highLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  let lowLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  
  // Calculate high channel line
  const highRegression = calculateLinearRegression(highPoints);
  if (highRegression) {
    const x1 = currentIndex - length + 1;
    const x2 = currentIndex;
    const y1 = highRegression.slope * x1 + highRegression.intercept;
    const y2 = highRegression.slope * x2 + highRegression.intercept;
    highLine = { x1, y1, x2, y2 };
  }
  
  // Calculate low channel line
  const lowRegression = calculateLinearRegression(lowPoints);
  if (lowRegression) {
    const x1 = currentIndex - length + 1;
    const x2 = currentIndex;
    const y1 = lowRegression.slope * x1 + lowRegression.intercept;
    const y2 = lowRegression.slope * x2 + lowRegression.intercept;
    lowLine = { x1, y1, x2, y2 };
  }
  
  return { highLine, lowLine, highPoints, lowPoints };
}

/**
 * Calculate Trend Line Methods
 */
export function calculateTrendLineMethods(
  highs: number[],
  lows: number[],
  config: TrendLineMethodsConfig = defaultTrendLineMethodsConfig
): TrendLineResult {
  let pivotSpan: TrendLineResult['pivotSpan'] = {
    highLine: null,
    lowLine: null,
    highPivots: [],
    lowPivots: []
  };
  
  let fivePoint: TrendLineResult['fivePoint'] = {
    highLine: null,
    lowLine: null,
    highPoints: [],
    lowPoints: []
  };
  
  if (config.enablePivotSpan) {
    pivotSpan = calculatePivotSpanTrendline(highs, lows, config);
  }
  
  if (config.enableFivePoint) {
    fivePoint = calculateFivePointChannel(highs, lows, config.fivePointLength);
  }
  
  return { pivotSpan, fivePoint };
}
