/**
 * 📈 Trend Lines v2 - TypeScript Port
 * 
 * Exact port of the PineScript "Trend Lines v2" by LonesomeTheBlue.
 * This calculates trendlines locally from OHLCV data.
 */

export interface TrendLine {
  type: 'up' | 'down';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  strength: number;
  age_bars: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TrendLinesResult {
  uptrend_lines: TrendLine[];
  downtrend_lines: TrendLine[];
  filter_type: 'up' | 'down' | 'both' | 'none';
}

/**
 * Detect pivot high at position idx
 * A pivot high is the highest point with pivotPeriod bars on each side being lower
 */
function detectPivotHigh(highs: number[], idx: number, pivotPeriod: number): number | null {
  if (idx < pivotPeriod || idx >= highs.length - pivotPeriod) {
    return null;
  }
  
  const pivotIdx = idx - pivotPeriod;
  const pivotVal = highs[pivotIdx];
  
  // Check if it's a local maximum
  const leftRange = highs.slice(pivotIdx - pivotPeriod, pivotIdx);
  const rightRange = highs.slice(pivotIdx + 1, pivotIdx + pivotPeriod + 1);
  
  if (leftRange.length === 0 || rightRange.length === 0) {
    return null;
  }
  
  const leftMax = Math.max(...leftRange);
  const rightMax = Math.max(...rightRange);
  
  if (pivotVal >= leftMax && pivotVal >= rightMax) {
    return pivotVal;
  }
  return null;
}

/**
 * Detect pivot low at position idx
 * A pivot low is the lowest point with pivotPeriod bars on each side being higher
 */
function detectPivotLow(lows: number[], idx: number, pivotPeriod: number): number | null {
  if (idx < pivotPeriod || idx >= lows.length - pivotPeriod) {
    return null;
  }
  
  const pivotIdx = idx - pivotPeriod;
  const pivotVal = lows[pivotIdx];
  
  // Check if it's a local minimum
  const leftRange = lows.slice(pivotIdx - pivotPeriod, pivotIdx);
  const rightRange = lows.slice(pivotIdx + 1, pivotIdx + pivotPeriod + 1);
  
  if (leftRange.length === 0 || rightRange.length === 0) {
    return null;
  }
  
  const leftMin = Math.min(...leftRange);
  const rightMin = Math.min(...rightRange);
  
  if (pivotVal <= leftMin && pivotVal <= rightMin) {
    return pivotVal;
  }
  return null;
}

/**
 * Find valid uptrend lines from pivot lows
 */
function findUptrendLines(
  pivotLows: [number, number][],
  closes: number[],
  n: number,
  maxLines: number
): TrendLine[] {
  const lines: TrendLine[] = [];
  
  if (pivotLows.length < 2) {
    return lines;
  }
  
  // Try pairs of pivot lows (older to newer)
  for (let i = 0; i < pivotLows.length - 1; i++) {
    for (let j = i + 1; j < pivotLows.length; j++) {
      const [pos1, val1] = pivotLows[j]; // More recent (higher position)
      const [pos2, val2] = pivotLows[i]; // Older (lower position)
      
      // For uptrend, val1 should be > val2 (ascending lows)
      if (val1 <= val2) {
        continue;
      }
      
      // Calculate slope
      if (pos1 === pos2) {
        continue;
      }
      
      const slope = (val1 - val2) / (pos1 - pos2);
      
      // Validate: check if price never closes below the line
      let valid = true;
      for (let k = pos2 + 1; k < n; k++) {
        const lineVal = val2 + slope * (k - pos2);
        if (closes[k] < lineVal) {
          valid = false;
          break;
        }
      }
      
      if (valid) {
        // Extend line to current bar
        const endVal = val2 + slope * (n - 1 - pos2);
        lines.push({
          type: 'up',
          x1: pos2,
          y1: val2,
          x2: n - 1,
          y2: endVal,
          slope: slope,
          strength: 2,
          age_bars: n - 1 - pos2
        });
        
        if (lines.length >= maxLines) {
          return lines;
        }
      }
    }
  }
  
  return lines;
}

/**
 * Find valid downtrend lines from pivot highs
 */
function findDowntrendLines(
  pivotHighs: [number, number][],
  closes: number[],
  n: number,
  maxLines: number
): TrendLine[] {
  const lines: TrendLine[] = [];
  
  if (pivotHighs.length < 2) {
    return lines;
  }
  
  // Try pairs of pivot highs (older to newer)
  for (let i = 0; i < pivotHighs.length - 1; i++) {
    for (let j = i + 1; j < pivotHighs.length; j++) {
      const [pos1, val1] = pivotHighs[j]; // More recent
      const [pos2, val2] = pivotHighs[i]; // Older
      
      // For downtrend, val1 should be < val2 (descending highs)
      if (val1 >= val2) {
        continue;
      }
      
      // Calculate slope (negative for downtrend)
      if (pos1 === pos2) {
        continue;
      }
      
      const slope = (val1 - val2) / (pos1 - pos2);
      
      // Validate: check if price never closes above the line
      let valid = true;
      for (let k = pos2 + 1; k < n; k++) {
        const lineVal = val2 + slope * (k - pos2);
        if (closes[k] > lineVal) {
          valid = false;
          break;
        }
      }
      
      if (valid) {
        // Extend line to current bar
        const endVal = val2 + slope * (n - 1 - pos2);
        lines.push({
          type: 'down',
          x1: pos2,
          y1: val2,
          x2: n - 1,
          y2: endVal,
          slope: slope,
          strength: 2,
          age_bars: n - 1 - pos2
        });
        
        if (lines.length >= maxLines) {
          return lines;
        }
      }
    }
  }
  
  return lines;
}

/**
 * Calculate trend lines from OHLCV candles
 * 
 * @param candles - Array of candles sorted by time (oldest first)
 * @param pivotPeriod - Number of bars to look back/forward for pivot detection (default: 20)
 * @param ppNum - Number of pivot points to keep (default: 3)
 * @param maxLines - Maximum number of trend lines per direction (default: 3)
 */
export function calculateTrendLines(
  candles: Candle[],
  pivotPeriod: number = 20,
  ppNum: number = 3,
  maxLines: number = 3
): TrendLinesResult {
  const n = candles.length;
  
  if (n < pivotPeriod * 2 + 10) {
    return {
      uptrend_lines: [],
      downtrend_lines: [],
      filter_type: 'none'
    };
  }
  
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  
  // Storage for pivot values and positions
  const pivotHighs: [number, number][] = []; // [bar_index, value]
  const pivotLows: [number, number][] = [];
  
  // Detect all pivots
  for (let i = pivotPeriod; i < n; i++) {
    const ph = detectPivotHigh(highs, i, pivotPeriod);
    if (ph !== null) {
      const pivotBar = i - pivotPeriod;
      pivotHighs.push([pivotBar, ph]);
      // Keep only ppNum most recent
      if (pivotHighs.length > ppNum) {
        pivotHighs.shift();
      }
    }
    
    const pl = detectPivotLow(lows, i, pivotPeriod);
    if (pl !== null) {
      const pivotBar = i - pivotPeriod;
      pivotLows.push([pivotBar, pl]);
      if (pivotLows.length > ppNum) {
        pivotLows.shift();
      }
    }
  }
  
  // Find uptrend lines (connecting pivot lows - support)
  const uptrendLines = findUptrendLines(pivotLows, closes, n, maxLines);
  
  // Find downtrend lines (connecting pivot highs - resistance)
  const downtrendLines = findDowntrendLines(pivotHighs, closes, n, maxLines);
  
  // Determine filter type
  const hasUp = uptrendLines.length > 0;
  const hasDown = downtrendLines.length > 0;
  
  let filterType: 'up' | 'down' | 'both' | 'none';
  if (hasUp && hasDown) {
    filterType = 'both';
  } else if (hasUp) {
    filterType = 'up';
  } else if (hasDown) {
    filterType = 'down';
  } else {
    filterType = 'none';
  }
  
  return {
    uptrend_lines: uptrendLines,
    downtrend_lines: downtrendLines,
    filter_type: filterType
  };
}
