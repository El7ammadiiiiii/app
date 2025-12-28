/**
 * HTF Descending Triangle - Higher Timeframe Pattern Detection
 * Based on Pine Script by ZeroHeroTrading
 * 
 * Descending Triangle characteristics:
 * - Flat bottom (horizontal support)
 * - Descending highs (resistance slopes downward)
 * - Typically bearish continuation pattern
 */

export interface HTFBar {
  leftIndex: number;
  rightIndex: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DescendingTriangle {
  left: number;      // Start index
  right: number;     // End index
  top: number;       // Top price (descending from left)
  topRight: number;  // Top price at right side
  bottom: number;    // Bottom price (flat support)
  confidence: number;
}

export interface HTFDescendingTriangleConfig {
  htfMultiplier: number;   // Higher timeframe multiplier (e.g., 5 = 5x current TF)
  minValidBars: number;    // Minimum valid HTF bars for pattern
  lowFactor: number;       // Low factor adjustment (0-1)
  adjustTriangle: boolean; // Adjust using actual highs/lows
  lowEnabled: boolean;     // Enable low factor validation
}

export interface HTFDescendingTriangleResult {
  triangles: DescendingTriangle[];
  currentTriangle: DescendingTriangle | null;
  htfBars: HTFBar[];
  alerts: string[];
}

/**
 * Aggregate current timeframe bars into higher timeframe bars
 */
function aggregateToHTF(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  htfMultiplier: number
): HTFBar[] {
  const htfBars: HTFBar[] = [];
  const len = opens.length;
  
  for (let i = 0; i < len; i += htfMultiplier) {
    const end = Math.min(i + htfMultiplier, len);
    if (end - i < htfMultiplier && i > 0) break; // Skip incomplete bars
    
    let htfHigh = -Infinity;
    let htfLow = Infinity;
    const htfOpen = opens[i];
    const htfClose = closes[end - 1];
    
    for (let j = i; j < end; j++) {
      htfHigh = Math.max(htfHigh, highs[j]);
      htfLow = Math.min(htfLow, lows[j]);
    }
    
    htfBars.push({
      leftIndex: i,
      rightIndex: end - 1,
      open: htfOpen,
      high: htfHigh,
      low: htfLow,
      close: htfClose
    });
  }
  
  return htfBars;
}

/**
 * Find highest value and its index in range
 */
function findHighest(highs: number[], start: number, end: number): { value: number; index: number } {
  let highest = -Infinity;
  let highestIdx = start;
  
  for (let i = start; i <= end && i < highs.length; i++) {
    if (highs[i] > highest) {
      highest = highs[i];
      highestIdx = i;
    }
  }
  
  return { value: highest, index: highestIdx };
}

/**
 * Find lowest value in range
 */
function findLowest(lows: number[], start: number, end: number): number {
  let lowest = Infinity;
  
  for (let i = start; i <= end && i < lows.length; i++) {
    if (lows[i] < lowest) {
      lowest = lows[i];
    }
  }
  
  return lowest;
}

/**
 * Validate descending triangle pattern
 * - Highs must be descending
 * - Lows must touch flat support level
 */
function validateDescendingTriangle(
  htfBars: HTFBar[],
  refBarIndex: number,
  minValidBars: number,
  lowFactor: number,
  lowEnabled: boolean
): boolean {
  if (htfBars.length <= minValidBars) return false;
  
  const refBar = htfBars[refBarIndex];
  
  for (let i = 0; i < minValidBars; i++) {
    const currentBar = htfBars[i];
    const nextBar = htfBars[i + 1];
    
    // Highs must be descending
    if (currentBar.high >= nextBar.high) {
      return false;
    }
    
    // Body must be above reference low (support)
    const bodyMin = Math.min(currentBar.close, currentBar.open);
    if (bodyMin <= refBar.low) {
      return false;
    }
    
    // Low factor validation (lows should touch support area)
    if (lowEnabled) {
      const refBodyMin = Math.min(refBar.close, refBar.open);
      const threshold = refBodyMin - lowFactor * (refBodyMin - refBar.low);
      if (currentBar.low > threshold) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Main detection function for HTF Descending Triangles
 */
export function detectHTFDescendingTriangles(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  config: HTFDescendingTriangleConfig
): HTFDescendingTriangleResult {
  const {
    htfMultiplier = 5,
    minValidBars = 3,
    lowFactor = 0,
    adjustTriangle = true,
    lowEnabled = true
  } = config;
  
  const result: HTFDescendingTriangleResult = {
    triangles: [],
    currentTriangle: null,
    htfBars: [],
    alerts: []
  };
  
  if (opens.length < htfMultiplier * (minValidBars + 2)) {
    return result;
  }
  
  // Aggregate to higher timeframe
  const htfBars = aggregateToHTF(opens, highs, lows, closes, htfMultiplier);
  result.htfBars = htfBars;
  
  if (htfBars.length <= minValidBars + 1) {
    return result;
  }
  
  // Scan for descending triangles
  for (let refIdx = htfBars.length - 1; refIdx >= minValidBars; refIdx--) {
    // Create a window of bars for validation
    const windowBars = htfBars.slice(refIdx - minValidBars, refIdx + 1).reverse();
    
    if (windowBars.length <= minValidBars) continue;
    
    const refBar = windowBars[windowBars.length - 1];
    
    // Validate descending triangle pattern
    const isValid = validateDescendingTriangle(
      windowBars,
      windowBars.length - 1,
      minValidBars,
      lowFactor,
      lowEnabled
    );
    
    if (isValid) {
      const firstBar = windowBars[0];
      
      let triangle: DescendingTriangle = {
        left: refBar.rightIndex,
        right: firstBar.rightIndex + htfMultiplier,
        top: refBar.high,
        topRight: firstBar.high,  // Descending to this level
        bottom: refBar.low,
        confidence: 0.7
      };
      
      // Adjust triangle with actual highs/lows from lower timeframe
      if (adjustTriangle) {
        const lookbackStart = triangle.left;
        const lookbackEnd = firstBar.rightIndex;
        
        const highestResult = findHighest(highs, lookbackStart, lookbackEnd);
        triangle.top = highestResult.value;
        triangle.left = highestResult.index;
        
        const lowestValue = findLowest(lows, lookbackStart, lookbackEnd);
        if (lowestValue > triangle.bottom) {
          triangle.bottom = lowestValue;
        }
        
        // Recalculate topRight based on slope
        const slope = (triangle.topRight - triangle.top) / (triangle.right - triangle.left);
        triangle.topRight = triangle.top + slope * (triangle.right - triangle.left);
        
        triangle.confidence = 0.85;
      }
      
      // Check for pattern quality
      const height = triangle.top - triangle.bottom;
      const width = triangle.right - triangle.left;
      
      if (height > 0 && width > htfMultiplier * 2) {
        // Boost confidence for well-formed triangles
        const aspectRatio = width / (height * 100);
        if (aspectRatio > 0.5 && aspectRatio < 5) {
          triangle.confidence = Math.min(0.95, triangle.confidence + 0.1);
        }
        
        result.triangles.push(triangle);
        
        // Alert for new triangle
        result.alerts.push(
          `Descending Triangle - Top @${triangle.top.toFixed(2)} Bottom @${triangle.bottom.toFixed(2)}`
        );
      }
    }
  }
  
  // Set current (most recent) triangle
  if (result.triangles.length > 0) {
    result.currentTriangle = result.triangles[0];
  }
  
  return result;
}

/**
 * Check for breakout from descending triangle
 */
export function detectDescendingTriangleBreakout(
  triangle: DescendingTriangle,
  closes: number[],
  currentIndex: number
): { breakout: boolean; direction: 'bullish' | 'bearish' | null } {
  if (currentIndex < triangle.right) {
    return { breakout: false, direction: null };
  }
  
  const currentClose = closes[currentIndex];
  const prevClose = closes[currentIndex - 1] || currentClose;
  
  // Calculate current resistance level (descending)
  const slope = (triangle.topRight - triangle.top) / (triangle.right - triangle.left);
  const currentResistance = triangle.top + slope * (currentIndex - triangle.left);
  
  // Bearish breakout (breakdown below support) - Expected direction
  if (currentClose < triangle.bottom && prevClose >= triangle.bottom) {
    return { breakout: true, direction: 'bearish' };
  }
  
  // Bullish breakout (breakout above descending resistance) - Counter-trend
  if (currentClose > currentResistance && prevClose <= currentResistance) {
    return { breakout: true, direction: 'bullish' };
  }
  
  return { breakout: false, direction: null };
}

/**
 * Calculate target price after breakout
 */
export function calculateTriangleTarget(
  triangle: DescendingTriangle,
  direction: 'bullish' | 'bearish'
): number {
  const height = triangle.top - triangle.bottom;
  
  if (direction === 'bearish') {
    // Target below support
    return triangle.bottom - height;
  } else {
    // Target above resistance
    return triangle.top + height;
  }
}
