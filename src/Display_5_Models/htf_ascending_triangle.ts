/**
 * HTF Ascending Triangle Detector
 * Detects ascending triangle patterns using higher timeframe analysis
 * 
 * Features:
 * 1. Multi-timeframe analysis
 * 2. Pattern validation with minimum bars
 * 3. Triangle adjustment based on highs/lows
 * 4. Alert generation on pattern detection
 */

export interface AscendingTriangle {
  left: number;      // Start bar index
  right: number;     // End bar index
  top: number;       // Horizontal resistance level
  bottom: number;    // Rising support level (left side)
  bottomRight: number; // Rising support level (right side)
  confidence: number;
  validBars: number;
}

export interface HTFAscTriangleResult {
  triangles: AscendingTriangle[];
  currentTriangle: AscendingTriangle | null;
}

// Helper: Calculate highest value in range
function highest(data: number[], startIdx: number, length: number): number {
  let max = -Infinity;
  const endIdx = Math.min(startIdx + length, data.length);
  for (let i = startIdx; i < endIdx; i++) {
    if (data[i] > max) max = data[i];
  }
  return max;
}

// Helper: Calculate lowest value in range
function lowest(data: number[], startIdx: number, length: number): number {
  let min = Infinity;
  const endIdx = Math.min(startIdx + length, data.length);
  for (let i = startIdx; i < endIdx; i++) {
    if (data[i] < min) min = data[i];
  }
  return min;
}

// Helper: Find index of lowest value in range
function lowestBars(data: number[], startIdx: number, length: number): number {
  let min = Infinity;
  let minIdx = startIdx;
  const endIdx = Math.min(startIdx + length, data.length);
  for (let i = startIdx; i < endIdx; i++) {
    if (data[i] < min) {
      min = data[i];
      minIdx = i;
    }
  }
  return minIdx - startIdx;
}

// Simulate higher timeframe bars by aggregating lower timeframe data
function aggregateToHTF(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  htfMultiplier: number
): { open: number; high: number; low: number; close: number; leftIndex: number; rightIndex: number }[] {
  const htfBars: { open: number; high: number; low: number; close: number; leftIndex: number; rightIndex: number }[] = [];
  
  for (let i = 0; i < opens.length; i += htfMultiplier) {
    const endIdx = Math.min(i + htfMultiplier, opens.length);
    const slice = {
      open: opens[i],
      high: highest(highs, i, htfMultiplier),
      low: lowest(lows, i, htfMultiplier),
      close: closes[endIdx - 1],
      leftIndex: i,
      rightIndex: endIdx - 1
    };
    htfBars.push(slice);
  }
  
  return htfBars;
}

export interface HTFAscTriangleConfig {
  htfMultiplier?: number;  // How many current TF bars = 1 HTF bar (e.g., 5 means 5m on 1m chart)
  minValidBars?: number;   // Minimum consecutive bars to validate pattern
  highFactor?: number;     // Factor for high validation (0-1)
  adjustTriangle?: boolean; // Adjust triangle using actual highs/lows
  highEnabled?: boolean;   // Enable high factor validation
}

export function detectHTFAscendingTriangles(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  config: HTFAscTriangleConfig = {}
): HTFAscTriangleResult {
  const {
    htfMultiplier = 5,
    minValidBars = 3,
    highFactor = 0.0,
    adjustTriangle = true,
    highEnabled = true
  } = config;

  const triangles: AscendingTriangle[] = [];
  let currentTriangle: AscendingTriangle | null = null;

  // Aggregate to higher timeframe
  const htfBars = aggregateToHTF(opens, highs, lows, closes, htfMultiplier);

  if (htfBars.length < minValidBars + 1) {
    return { triangles, currentTriangle };
  }

  // Scan for ascending triangle patterns
  for (let refIdx = minValidBars; refIdx < htfBars.length; refIdx++) {
    const refBar = htfBars[refIdx]; // Reference bar (oldest in pattern)
    let isValid = true;
    
    // Check pattern validity with previous bars
    for (let i = 0; i < minValidBars; i++) {
      const currentBar = htfBars[refIdx - i - 1]; // More recent bars
      const prevBar = htfBars[refIdx - i];
      
      // Criteria for ascending triangle:
      // 1. Each low is higher than the previous low (rising lows)
      // 2. Highs are relatively flat (below reference high)
      // 3. Optional: High factor check
      
      const lowsRising = currentBar.low > prevBar.low;
      const maxBodyPrice = Math.max(currentBar.close, currentBar.open);
      const highsFlat = maxBodyPrice < refBar.high;
      
      let highFactorValid = true;
      if (highEnabled) {
        const refBodyTop = Math.max(refBar.close, refBar.open);
        const refRange = refBar.high - refBodyTop;
        const requiredHigh = refBodyTop + highFactor * refRange;
        highFactorValid = currentBar.high >= requiredHigh;
      }
      
      if (!lowsRising || !highsFlat || !highFactorValid) {
        isValid = false;
        break;
      }
    }
    
    if (isValid) {
      // Pattern detected - create triangle
      const leftBar = htfBars[refIdx];
      const rightBar = htfBars[refIdx - minValidBars];
      
      let top = refBar.high;
      let bottom = refBar.low;
      let left = leftBar.leftIndex;
      let right = rightBar.rightIndex + htfMultiplier;
      
      // Adjust triangle using actual highs/lows from lower timeframe
      if (adjustTriangle) {
        const lookbackLength = right - left;
        const lowestValue = lowest(lows, left, lookbackLength);
        const lowestIdx = left + lowestBars(lows, left, lookbackLength);
        const highestValue = highest(highs, left, lookbackLength);
        
        bottom = lowestValue;
        left = lowestIdx;
        
        if (highestValue < top) {
          top = highestValue;
        }
      }
      
      // Calculate bottom-right price (ascending support line)
      const slope = (top - bottom) / (right - left);
      const bottomRight = bottom + slope * (right - left);
      
      const triangle: AscendingTriangle = {
        left,
        right,
        top,
        bottom,
        bottomRight,
        confidence: 0.8,
        validBars: minValidBars
      };
      
      triangles.push(triangle);
      
      // Keep only the most recent as current
      if (refIdx === htfBars.length - 1) {
        currentTriangle = triangle;
      }
    }
  }

  return { triangles, currentTriangle };
}

// Detect breakout from ascending triangle
export function detectAscendingTriangleBreakout(
  triangle: AscendingTriangle,
  closes: number[],
  currentIndex: number
): { breakout: boolean; direction: 'bullish' | 'bearish' | null } {
  if (currentIndex <= triangle.right) {
    return { breakout: false, direction: null };
  }
  
  // Calculate current support level (ascending line)
  const supportSlope = (triangle.bottomRight - triangle.bottom) / (triangle.right - triangle.left);
  const currentSupport = triangle.bottom + supportSlope * (currentIndex - triangle.left);
  
  const currentPrice = closes[currentIndex];
  
  // Bullish breakout: price above resistance
  if (currentPrice > triangle.top) {
    return { breakout: true, direction: 'bullish' };
  }
  
  // Bearish breakout (false breakout): price below support
  if (currentPrice < currentSupport) {
    return { breakout: true, direction: 'bearish' };
  }
  
  return { breakout: false, direction: null };
}

// Calculate target price after breakout
export function calculateTriangleTarget(
  triangle: AscendingTriangle,
  breakoutDirection: 'bullish' | 'bearish'
): number {
  const height = triangle.top - triangle.bottom;
  
  if (breakoutDirection === 'bullish') {
    return triangle.top + height; // Target above resistance
  } else {
    return triangle.bottom - height; // Target below support
  }
}
