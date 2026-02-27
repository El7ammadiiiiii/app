/**
 * Wedge Maker - Dynamic Trendline Drawing from Pivot Points
 * Based on Pine Script by veryfid
 * 
 * Creates wedge patterns by connecting specific pivot highs and lows
 * with extendable trendlines
 */

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface WedgeLine {
  startIndex: number;
  startPrice: number;
  endIndex: number;
  endPrice: number;
  slope: number;
  type: 'upper' | 'lower';
  color: string;
}

export interface WedgeMakerConfig {
  upperLength: number;      // Pivot high detection length
  lowerLength: number;      // Pivot low detection length
  upperStartPivot: number;  // Draw upper line from pivot # (0 = most recent)
  upperEndPivot: number;    // Draw upper line to pivot #
  lowerStartPivot: number;  // Draw lower line from pivot #
  lowerEndPivot: number;    // Draw lower line to pivot #
  lineColor: 'RedGreen' | 'White' | 'Yellow' | 'Blue';
  lineWidth: number;
  extendBars: number;       // How many bars to extend lines
}

export interface WedgeMakerResult {
  upperLine: WedgeLine | null;
  lowerLine: WedgeLine | null;
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
  wedgeType: 'rising' | 'falling' | 'expanding' | 'contracting' | 'parallel' | null;
  convergenceIndex: number | null;  // Where lines would meet
  convergencePrice: number | null;
}

/**
 * Detect pivot highs
 */
function detectPivotHighs(highs: number[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = length; i < highs.length - length; i++) {
    let isPivot = true;
    const currentHigh = highs[i];
    
    // Check left side
    for (let j = 1; j <= length; j++) {
      if (highs[i - j] >= currentHigh) {
        isPivot = false;
        break;
      }
    }
    
    // Check right side
    if (isPivot) {
      for (let j = 1; j <= length; j++) {
        if (highs[i + j] > currentHigh) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({
        index: i,
        price: currentHigh,
        type: 'high'
      });
    }
  }
  
  return pivots;
}

/**
 * Detect pivot lows
 */
function detectPivotLows(lows: number[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = length; i < lows.length - length; i++) {
    let isPivot = true;
    const currentLow = lows[i];
    
    // Check left side
    for (let j = 1; j <= length; j++) {
      if (lows[i - j] <= currentLow) {
        isPivot = false;
        break;
      }
    }
    
    // Check right side
    if (isPivot) {
      for (let j = 1; j <= length; j++) {
        if (lows[i + j] < currentLow) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({
        index: i,
        price: currentLow,
        type: 'low'
      });
    }
  }
  
  return pivots;
}

/**
 * Get the Nth pivot from the end (0 = most recent)
 */
function getNthPivot(pivots: PivotPoint[], n: number): PivotPoint | null {
  // Pivots are ordered oldest to newest, so reverse index
  const reverseIndex = pivots.length - 1 - n;
  if (reverseIndex >= 0 && reverseIndex < pivots.length) {
    return pivots[reverseIndex];
  }
  return null;
}

/**
 * Calculate line at a given index
 */
function getLineValueAtIndex(line: WedgeLine, index: number): number {
  return line.startPrice + line.slope * (index - line.startIndex);
}

/**
 * Find convergence point of two lines
 */
function findConvergence(
  upperLine: WedgeLine,
  lowerLine: WedgeLine,
  maxBars: number
): { index: number; price: number } | null {
  // If slopes are equal (parallel), no convergence
  if (Math.abs(upperLine.slope - lowerLine.slope) < 0.0000001) {
    return null;
  }
  
  // Solve for intersection:
  // upperPrice + upperSlope * (x - upperStart) = lowerPrice + lowerSlope * (x - lowerStart)
  const a = upperLine.slope - lowerLine.slope;
  const b = (lowerLine.startPrice - lowerLine.slope * lowerLine.startIndex) -
            (upperLine.startPrice - upperLine.slope * upperLine.startIndex);
  
  const convergenceIndex = -b / a;
  
  // Only return if convergence is in the future and within reasonable range
  const currentIndex = Math.max(upperLine.endIndex, lowerLine.endIndex);
  if (convergenceIndex > currentIndex && convergenceIndex < currentIndex + maxBars) {
    const convergencePrice = getLineValueAtIndex(upperLine, convergenceIndex);
    return { index: Math.round(convergenceIndex), price: convergencePrice };
  }
  
  return null;
}

/**
 * Determine wedge type based on slopes
 */
function determineWedgeType(
  upperLine: WedgeLine | null,
  lowerLine: WedgeLine | null
): 'rising' | 'falling' | 'expanding' | 'contracting' | 'parallel' | null {
  if (!upperLine || !lowerLine) return null;
  
  const upperSlope = upperLine.slope;
  const lowerSlope = lowerLine.slope;
  const slopeDiff = Math.abs(upperSlope - lowerSlope);
  
  // Check if parallel (similar slopes)
  if (slopeDiff < 0.0001) {
    if (upperSlope > 0) return 'rising';
    if (upperSlope < 0) return 'falling';
    return 'parallel';
  }
  
  // Both slopes positive (rising wedge)
  if (upperSlope > 0 && lowerSlope > 0) {
    if (upperSlope < lowerSlope) return 'rising'; // Contracting upward
    return 'expanding';
  }
  
  // Both slopes negative (falling wedge)
  if (upperSlope < 0 && lowerSlope < 0) {
    if (Math.abs(upperSlope) > Math.abs(lowerSlope)) return 'falling'; // Contracting downward
    return 'expanding';
  }
  
  // Converging (upper falling, lower rising)
  if (upperSlope < 0 && lowerSlope > 0) {
    return 'contracting';
  }
  
  // Expanding (upper rising, lower falling)
  if (upperSlope > 0 && lowerSlope < 0) {
    return 'expanding';
  }
  
  return null;
}

/**
 * Main function to create wedge lines
 */
export function calculateWedgeMaker(
  highs: number[],
  lows: number[],
  config: WedgeMakerConfig
): WedgeMakerResult {
  const {
    upperLength = 20,
    lowerLength = 20,
    upperStartPivot = 2,
    upperEndPivot = 0,
    lowerStartPivot = 3,
    lowerEndPivot = 0,
    lineColor = 'RedGreen',
    extendBars = 50
  } = config;
  
  const result: WedgeMakerResult = {
    upperLine: null,
    lowerLine: null,
    pivotHighs: [],
    pivotLows: [],
    wedgeType: null,
    convergenceIndex: null,
    convergencePrice: null
  };
  
  // Detect pivots
  result.pivotHighs = detectPivotHighs(highs, upperLength);
  result.pivotLows = detectPivotLows(lows, lowerLength);
  
  // Get colors
  let upperColor = '#ef4444'; // Red
  let lowerColor = '#22c55e'; // Green
  
  if (lineColor === 'White') {
    upperColor = '#ffffff';
    lowerColor = '#ffffff';
  } else if (lineColor === 'Yellow') {
    upperColor = '#eab308';
    lowerColor = '#eab308';
  } else if (lineColor === 'Blue') {
    upperColor = '#3b82f6';
    lowerColor = '#3b82f6';
  }
  
  // Create upper line from pivot highs
  const upperStart = getNthPivot(result.pivotHighs, upperStartPivot);
  const upperEnd = getNthPivot(result.pivotHighs, upperEndPivot);
  
  if (upperStart && upperEnd && upperStart.index !== upperEnd.index) {
    const slope = (upperEnd.price - upperStart.price) / (upperEnd.index - upperStart.index);
    result.upperLine = {
      startIndex: upperStart.index,
      startPrice: upperStart.price,
      endIndex: upperEnd.index + extendBars,
      endPrice: upperEnd.price + slope * extendBars,
      slope,
      type: 'upper',
      color: upperColor
    };
  }
  
  // Create lower line from pivot lows
  const lowerStart = getNthPivot(result.pivotLows, lowerStartPivot);
  const lowerEnd = getNthPivot(result.pivotLows, lowerEndPivot);
  
  if (lowerStart && lowerEnd && lowerStart.index !== lowerEnd.index) {
    const slope = (lowerEnd.price - lowerStart.price) / (lowerEnd.index - lowerStart.index);
    result.lowerLine = {
      startIndex: lowerStart.index,
      startPrice: lowerStart.price,
      endIndex: lowerEnd.index + extendBars,
      endPrice: lowerEnd.price + slope * extendBars,
      slope,
      type: 'lower',
      color: lowerColor
    };
  }
  
  // Determine wedge type
  result.wedgeType = determineWedgeType(result.upperLine, result.lowerLine);
  
  // Find convergence point
  if (result.upperLine && result.lowerLine) {
    const convergence = findConvergence(result.upperLine, result.lowerLine, extendBars * 2);
    if (convergence) {
      result.convergenceIndex = convergence.index;
      result.convergencePrice = convergence.price;
    }
  }
  
  return result;
}

/**
 * Get extended line data for rendering
 */
export function getExtendedLineData(
  line: WedgeLine,
  dataLength: number
): (number | null)[] {
  const data = new Array(dataLength).fill(null);
  
  for (let i = line.startIndex; i <= Math.min(line.endIndex, dataLength - 1); i++) {
    data[i] = getLineValueAtIndex(line, i);
  }
  
  return data;
}

/**
 * Check for breakout from wedge
 */
export function checkWedgeBreakout(
  upperLine: WedgeLine | null,
  lowerLine: WedgeLine | null,
  closes: number[],
  currentIndex: number
): { breakout: boolean; direction: 'bullish' | 'bearish' | null; strength: number } {
  if (!upperLine || !lowerLine || currentIndex < 2) {
    return { breakout: false, direction: null, strength: 0 };
  }
  
  const currentClose = closes[currentIndex];
  const prevClose = closes[currentIndex - 1];
  
  const upperValue = getLineValueAtIndex(upperLine, currentIndex);
  const lowerValue = getLineValueAtIndex(lowerLine, currentIndex);
  const prevUpperValue = getLineValueAtIndex(upperLine, currentIndex - 1);
  const prevLowerValue = getLineValueAtIndex(lowerLine, currentIndex - 1);
  
  // Bullish breakout (above upper line)
  if (currentClose > upperValue && prevClose <= prevUpperValue) {
    const strength = (currentClose - upperValue) / upperValue * 100;
    return { breakout: true, direction: 'bullish', strength };
  }
  
  // Bearish breakout (below lower line)
  if (currentClose < lowerValue && prevClose >= prevLowerValue) {
    const strength = (lowerValue - currentClose) / lowerValue * 100;
    return { breakout: true, direction: 'bearish', strength };
  }
  
  return { breakout: false, direction: null, strength: 0 };
}
