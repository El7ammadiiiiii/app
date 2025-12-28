// Converted to TypeScript for Display 5 Models
// Original: Pivot Trendlines with Breaks [HG]
// License: MPL 2.0

/**
 * Pivot Trendlines with Breakout Detection
 * 
 * Automatically draws trendlines connecting pivot highs/lows and detects breakouts:
 * 
 * FEATURES:
 * - Pivot Detection: Normal (built-in) or Fast (every reversal)
 * - Trendline Construction: Connects consecutive higher lows / lower highs
 * - Breakout Detection: Alerts when price crosses trendlines
 * - Target Levels: Horizontal lines at breakout prices
 * 
 * LOGIC:
 * - Bull Trendline: Connects rising pivot lows (support)
 * - Bear Trendline: Connects falling pivot highs (resistance)
 * - Breakout: Close crosses below bull line or above bear line
 */

export interface PivotTrendlinesConfig {
  pivotLength: number;        // 20 default
  pivotType: 'Normal' | 'Fast';  // Normal uses standard pivots, Fast tracks every reversal
  showTargets: boolean;       // Show horizontal target levels
  repaint: boolean;          // Wait for bar confirmation
  useSourceForCross: boolean; // Use custom source for breakout detection
}

export const defaultPivotTrendlinesConfig: PivotTrendlinesConfig = {
  pivotLength: 20,
  pivotType: 'Normal',
  showTargets: false,
  repaint: true,
  useSourceForCross: false,
};

export interface Pivot {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface Trendline {
  start: Pivot;
  end: Pivot;
  slope: number;
  intercept: number;
  type: 'bull' | 'bear';  // bull = support, bear = resistance
  broken: boolean;
  breakoutIndex?: number;
  breakoutPrice?: number;
}

export interface PivotTrendlinesResult {
  bullTrendlines: Trendline[];
  bearTrendlines: Trendline[];
  activeBullLine: Trendline | null;
  activeBearLine: Trendline | null;
  recentBreakouts: Array<{
    index: number;
    price: number;
    type: 'bull' | 'bear';
  }>;
}

/**
 * Detect pivot highs using left/right bars
 */
function detectPivotHighs(
  highs: number[],
  length: number,
  pivotType: 'Normal' | 'Fast'
): Pivot[] {
  const pivots: Pivot[] = [];
  const leftBars = pivotType === 'Normal' ? length : 1;
  const rightBars = length;
  
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
      pivots.push({ index: i, price: highs[i], type: 'high' });
    }
  }
  
  return pivots;
}

/**
 * Detect pivot lows using left/right bars
 */
function detectPivotLows(
  lows: number[],
  length: number,
  pivotType: 'Normal' | 'Fast'
): Pivot[] {
  const pivots: Pivot[] = [];
  const leftBars = pivotType === 'Normal' ? length : 1;
  const rightBars = length;
  
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
      pivots.push({ index: i, price: lows[i], type: 'low' });
    }
  }
  
  return pivots;
}

/**
 * Calculate trendline slope and intercept
 */
function calculateTrendline(p1: Pivot, p2: Pivot): { slope: number; intercept: number } {
  const slope = (p2.price - p1.price) / (p2.index - p1.index);
  const intercept = p1.price - slope * p1.index;
  return { slope, intercept };
}

/**
 * Get price at specific index on trendline
 */
function getTrendlinePrice(slope: number, intercept: number, index: number): number {
  return slope * index + intercept;
}

/**
 * Detect bull trendlines (rising support from pivot lows)
 */
function detectBullTrendlines(
  pivotLows: Pivot[],
  closes: number[],
  config: PivotTrendlinesConfig
): Trendline[] {
  const trendlines: Trendline[] = [];
  
  // Connect consecutive higher lows
  for (let i = 0; i < pivotLows.length - 1; i++) {
    const p1 = pivotLows[i];
    const p2 = pivotLows[i + 1];
    
    // Only create trendline if second pivot is higher (rising support)
    if (p2.price > p1.price) {
      const { slope, intercept } = calculateTrendline(p1, p2);
      
      // Check for breakout
      let broken = false;
      let breakoutIndex: number | undefined;
      let breakoutPrice: number | undefined;
      
      for (let j = p2.index + 1; j < closes.length; j++) {
        const trendPrice = getTrendlinePrice(slope, intercept, j);
        
        // Breakout when close drops below trendline
        if (closes[j] < trendPrice) {
          broken = true;
          breakoutIndex = j;
          breakoutPrice = closes[j];
          break;
        }
      }
      
      trendlines.push({
        start: p1,
        end: p2,
        slope,
        intercept,
        type: 'bull',
        broken,
        breakoutIndex,
        breakoutPrice
      });
    }
  }
  
  return trendlines;
}

/**
 * Detect bear trendlines (falling resistance from pivot highs)
 */
function detectBearTrendlines(
  pivotHighs: Pivot[],
  closes: number[],
  config: PivotTrendlinesConfig
): Trendline[] {
  const trendlines: Trendline[] = [];
  
  // Connect consecutive lower highs
  for (let i = 0; i < pivotHighs.length - 1; i++) {
    const p1 = pivotHighs[i];
    const p2 = pivotHighs[i + 1];
    
    // Only create trendline if second pivot is lower (falling resistance)
    if (p2.price < p1.price) {
      const { slope, intercept } = calculateTrendline(p1, p2);
      
      // Check for breakout
      let broken = false;
      let breakoutIndex: number | undefined;
      let breakoutPrice: number | undefined;
      
      for (let j = p2.index + 1; j < closes.length; j++) {
        const trendPrice = getTrendlinePrice(slope, intercept, j);
        
        // Breakout when close rises above trendline
        if (closes[j] > trendPrice) {
          broken = true;
          breakoutIndex = j;
          breakoutPrice = closes[j];
          break;
        }
      }
      
      trendlines.push({
        start: p1,
        end: p2,
        slope,
        intercept,
        type: 'bear',
        broken,
        breakoutIndex,
        breakoutPrice
      });
    }
  }
  
  return trendlines;
}

/**
 * Find most recent active (unbroken) trendline
 */
function getActiveTrendline(trendlines: Trendline[]): Trendline | null {
  // Get most recent unbroken trendline
  for (let i = trendlines.length - 1; i >= 0; i--) {
    if (!trendlines[i].broken) {
      return trendlines[i];
    }
  }
  return null;
}

/**
 * Get recent breakouts (last 10 bars)
 */
function getRecentBreakouts(
  trendlines: Trendline[],
  currentIndex: number,
  lookback: number = 10
): Array<{ index: number; price: number; type: 'bull' | 'bear' }> {
  const breakouts: Array<{ index: number; price: number; type: 'bull' | 'bear' }> = [];
  
  for (const line of trendlines) {
    if (line.broken && line.breakoutIndex && line.breakoutPrice) {
      // Only include recent breakouts
      if (currentIndex - line.breakoutIndex <= lookback) {
        breakouts.push({
          index: line.breakoutIndex,
          price: line.breakoutPrice,
          type: line.type
        });
      }
    }
  }
  
  return breakouts;
}

/**
 * Main calculation function
 */
export function detectPivotTrendlines(
  highs: number[],
  lows: number[],
  closes: number[],
  config: PivotTrendlinesConfig = defaultPivotTrendlinesConfig
): PivotTrendlinesResult {
  // Detect pivots
  const pivotHighs = detectPivotHighs(highs, config.pivotLength, config.pivotType);
  const pivotLows = detectPivotLows(lows, config.pivotLength, config.pivotType);
  
  // Detect trendlines
  const bullTrendlines = detectBullTrendlines(pivotLows, closes, config);
  const bearTrendlines = detectBearTrendlines(pivotHighs, closes, config);
  
  // Get active trendlines
  const activeBullLine = getActiveTrendline(bullTrendlines);
  const activeBearLine = getActiveTrendline(bearTrendlines);
  
  // Get recent breakouts
  const recentBreakouts = getRecentBreakouts(
    [...bullTrendlines, ...bearTrendlines],
    closes.length - 1,
    10
  );
  
  return {
    bullTrendlines,
    bearTrendlines,
    activeBullLine,
    activeBearLine,
    recentBreakouts
  };
}
