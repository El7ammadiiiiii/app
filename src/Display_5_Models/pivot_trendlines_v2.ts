// Pivot Trendlines with Breaks [HG] - Enhanced Version
// License: MPL 2.0 - https://mozilla.org/MPL/2.0/
// © HoanGhetti
//
// TypeScript implementation for Next.js/ECharts
// Advanced pivot-based trendline system with breakout detection and targets

export interface PivotTrendlinesV2Config {
  pivotLength: number;          // Pivot detection length (default: 20)
  pivotType: 'Normal' | 'Fast'; // Normal uses standard pivots, Fast tracks every reversal
  repaint: boolean;             // Wait for bar confirmation if false
  showTargets: boolean;         // Show target levels after breakout
  extendLines: 'none' | 'right' | 'left' | 'both';
  lineStyle: 'dotted' | 'dashed' | 'solid';
  targetStyle: 'dotted' | 'dashed' | 'solid';
  overrideSource: boolean;      // Use custom source for trendlines
  useSourceForCross: boolean;   // Use source instead of close for cross detection
}

export interface Point {
  index: number;
  price: number;
}

export interface Trendline {
  start: Point;
  end: Point;
  slope: number;
  broken: boolean;
  breakoutIndex?: number;
  breakoutPrice?: number;
  targetLevel?: number;
}

export interface Breakout {
  index: number;
  price: number;
  type: 'bullish' | 'bearish';
  trendlineStart: Point;
  trendlineEnd: Point;
}

export interface PivotTrendlinesV2Result {
  pivotHighs: Point[];
  pivotLows: Point[];
  bullTrendlines: Trendline[];   // From pivot highs (resistance becoming support)
  bearTrendlines: Trendline[];   // From pivot lows (support becoming resistance)
  breakouts: Breakout[];
  activeBullLine: Trendline | null;
  activeBearLine: Trendline | null;
}

/**
 * Detect pivot highs
 */
function detectPivotHighs(
  highs: number[],
  leftBars: number,
  rightBars: number
): Point[] {
  const pivots: Point[] = [];

  for (let i = leftBars; i < highs.length - rightBars; i++) {
    let isPivot = true;

    // Check left side
    for (let j = 1; j <= leftBars; j++) {
      if (highs[i] <= highs[i - j]) {
        isPivot = false;
        break;
      }
    }

    // Check right side
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (highs[i] <= highs[i + j]) {
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
 * Detect pivot lows
 */
function detectPivotLows(
  lows: number[],
  leftBars: number,
  rightBars: number
): Point[] {
  const pivots: Point[] = [];

  for (let i = leftBars; i < lows.length - rightBars; i++) {
    let isPivot = true;

    // Check left side
    for (let j = 1; j <= leftBars; j++) {
      if (lows[i] >= lows[i - j]) {
        isPivot = false;
        break;
      }
    }

    // Check right side
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (lows[i] >= lows[i + j]) {
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
 * Fast pivot detection - tracks every reversal
 */
function detectFastPivots(
  prices: number[],
  rightBars: number,
  isHigh: boolean
): Point[] {
  const pivots: Point[] = [];

  for (let i = 1; i < prices.length - rightBars; i++) {
    let isPivot = true;

    // Only check right side for fast pivots (left bars = 1)
    const prev = prices[i - 1];
    const curr = prices[i];

    if (isHigh) {
      if (curr <= prev) isPivot = false;
    } else {
      if (curr >= prev) isPivot = false;
    }

    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (isHigh) {
          if (prices[i] <= prices[i + j]) {
            isPivot = false;
            break;
          }
        } else {
          if (prices[i] >= prices[i + j]) {
            isPivot = false;
            break;
          }
        }
      }
    }

    if (isPivot) {
      pivots.push({ index: i, price: prices[i] });
    }
  }

  return pivots;
}

/**
 * Create trendlines from consecutive pivots
 */
function createTrendlines(
  pivots: Point[],
  isBullish: boolean
): Trendline[] {
  const trendlines: Trendline[] = [];

  for (let i = 1; i < pivots.length; i++) {
    const prev = pivots[i - 1];
    const curr = pivots[i];

    // Bull trendline: from pivot highs with lower highs (descending resistance)
    // Bear trendline: from pivot lows with higher lows (ascending support)
    const isValid = isBullish 
      ? curr.price < prev.price  // Lower highs for bull breakout setup
      : curr.price > prev.price; // Higher lows for bear breakout setup

    if (isValid) {
      const slope = (curr.price - prev.price) / (curr.index - prev.index);
      
      trendlines.push({
        start: prev,
        end: curr,
        slope,
        broken: false
      });
    }
  }

  return trendlines;
}

/**
 * Get trendline price at specific index
 */
function getTrendlinePrice(trendline: Trendline, index: number): number {
  return trendline.end.price + trendline.slope * (index - trendline.end.index);
}

/**
 * Check for trendline breakouts
 */
function checkBreakouts(
  trendlines: Trendline[],
  closes: number[],
  highs: number[],
  lows: number[],
  isBullish: boolean,
  config: PivotTrendlinesV2Config
): { updatedTrendlines: Trendline[]; breakouts: Breakout[] } {
  const breakouts: Breakout[] = [];
  const updatedTrendlines: Trendline[] = [];

  for (const line of trendlines) {
    const updated = { ...line };
    
    if (!updated.broken) {
      // Check each bar after trendline end
      for (let i = line.end.index + 1; i < closes.length; i++) {
        const trendlinePrice = getTrendlinePrice(line, i);
        const checkPrice = closes[i];
        
        // Bullish breakout: price crosses above descending resistance
        // Bearish breakout: price crosses below ascending support
        const hasCrossed = isBullish 
          ? checkPrice > trendlinePrice
          : checkPrice < trendlinePrice;

        if (hasCrossed) {
          // Check confirmation if repaint is disabled
          if (!config.repaint && i === closes.length - 1) {
            continue; // Wait for bar close
          }

          updated.broken = true;
          updated.breakoutIndex = i;
          updated.breakoutPrice = trendlinePrice;
          
          // Set target level (horizontal line at breakout price)
          if (config.showTargets) {
            updated.targetLevel = line.end.price;
          }

          breakouts.push({
            index: i,
            price: trendlinePrice,
            type: isBullish ? 'bullish' : 'bearish',
            trendlineStart: line.start,
            trendlineEnd: line.end
          });

          break;
        }
      }
    }

    updatedTrendlines.push(updated);
  }

  return { updatedTrendlines, breakouts };
}

/**
 * Find the most recent active (unbroken) trendline
 */
function findActiveTrendline(trendlines: Trendline[]): Trendline | null {
  const active = trendlines.filter(t => !t.broken);
  if (active.length === 0) return null;
  
  // Return the most recent one
  return active.reduce((latest, current) => 
    current.end.index > latest.end.index ? current : latest
  );
}

/**
 * Main function to calculate Pivot Trendlines with Breaks
 */
export function calculatePivotTrendlinesV2(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<PivotTrendlinesV2Config> = {}
): PivotTrendlinesV2Result {
  const cfg: PivotTrendlinesV2Config = {
    pivotLength: config.pivotLength ?? 20,
    pivotType: config.pivotType ?? 'Normal',
    repaint: config.repaint ?? true,
    showTargets: config.showTargets ?? false,
    extendLines: config.extendLines ?? 'none',
    lineStyle: config.lineStyle ?? 'dotted',
    targetStyle: config.targetStyle ?? 'dashed',
    overrideSource: config.overrideSource ?? false,
    useSourceForCross: config.useSourceForCross ?? false
  };

  // Detect pivots based on mode
  let pivotHighs: Point[];
  let pivotLows: Point[];

  if (cfg.pivotType === 'Normal') {
    pivotHighs = detectPivotHighs(highs, cfg.pivotLength, cfg.pivotLength);
    pivotLows = detectPivotLows(lows, cfg.pivotLength, cfg.pivotLength);
  } else {
    // Fast mode: left bars = 1, right bars = pivotLength
    pivotHighs = detectFastPivots(highs, cfg.pivotLength, true);
    pivotLows = detectFastPivots(lows, cfg.pivotLength, false);
  }

  // Create trendlines
  // Bull trendlines: from pivot highs (resistance lines that become support when broken upward)
  let bullTrendlines = createTrendlines(pivotHighs, true);
  
  // Bear trendlines: from pivot lows (support lines that become resistance when broken downward)
  let bearTrendlines = createTrendlines(pivotLows, false);

  // Check for breakouts
  const bullResult = checkBreakouts(bullTrendlines, closes, highs, lows, true, cfg);
  const bearResult = checkBreakouts(bearTrendlines, closes, highs, lows, false, cfg);

  bullTrendlines = bullResult.updatedTrendlines;
  bearTrendlines = bearResult.updatedTrendlines;

  const allBreakouts = [...bullResult.breakouts, ...bearResult.breakouts]
    .sort((a, b) => b.index - a.index);

  // Find active (unbroken) trendlines
  const activeBullLine = findActiveTrendline(bullTrendlines);
  const activeBearLine = findActiveTrendline(bearTrendlines);

  return {
    pivotHighs,
    pivotLows,
    bullTrendlines: bullTrendlines.slice(-20), // Limit to recent trendlines
    bearTrendlines: bearTrendlines.slice(-20),
    breakouts: allBreakouts.slice(0, 20),
    activeBullLine,
    activeBearLine
  };
}

/**
 * Extend trendline to specified index
 */
export function extendTrendline(
  trendline: Trendline,
  toIndex: number
): Point[] {
  const points: Point[] = [];
  
  for (let i = trendline.start.index; i <= toIndex; i++) {
    const price = trendline.start.price + trendline.slope * (i - trendline.start.index);
    points.push({ index: i, price });
  }
  
  return points;
}

/**
 * Get line style for ECharts
 */
export function getLineStyle(style: 'dotted' | 'dashed' | 'solid'): string {
  switch (style) {
    case 'dotted': return 'dotted';
    case 'dashed': return 'dashed';
    case 'solid': return 'solid';
    default: return 'dotted';
  }
}
