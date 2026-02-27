// Converted to TypeScript for Display 5 Models
// Original: Dynamic Fibonacci Retracement [HG]
// License: MPL 2.0

/**
 * Dynamic Fibonacci Retracement
 * 
 * Automatically draws Fibonacci retracement levels based on recent pivot highs/lows:
 * 
 * FEATURES:
 * - Pivot Detection: Detects swing highs/lows using configurable lookback
 * - Direction Detection: Bull (uptrend) or Bear (downtrend) based on pivot changes
 * - Outer Values: Tracks extreme high/low beyond pivots in current direction
 * - Fibonacci Levels: 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
 * - Trendline: Optional diagonal line connecting swing points
 * 
 * LOGIC:
 * - Bull Direction: Connects low to high, retracements measure pullback from high
 * - Bear Direction: Connects high to low, retracements measure bounce from low
 * - Levels update dynamically as new pivots form or extremes extend
 */

export interface DynamicFibonacciConfig {
  lookback: number;           // 50 default - pivot detection lookback
  extendLines: 'none' | 'right' | 'left' | 'both';
  showTrendline: boolean;     // Show diagonal line connecting swing points
  showLabels: boolean;        // Show level labels
  showPrices: boolean;        // Show prices in labels
  labelOffset: number;        // 5 default - offset labels to the right
  levels: {
    use236: boolean;
    use382: boolean;
    use50: boolean;
    use618: boolean;
    use786: boolean;
  };
  levelValues: {
    level236: number;   // 0.236
    level382: number;   // 0.382
    level50: number;    // 0.5
    level618: number;   // 0.618
    level786: number;   // 0.786
  };
}

export const defaultDynamicFibonacciConfig: DynamicFibonacciConfig = {
  lookback: 50,
  extendLines: 'right',
  showTrendline: true,
  showLabels: true,
  showPrices: false,
  labelOffset: 5,
  levels: {
    use236: true,
    use382: true,
    use50: true,
    use618: true,
    use786: true
  },
  levelValues: {
    level236: 0.236,
    level382: 0.382,
    level50: 0.5,
    level618: 0.618,
    level786: 0.786
  }
};

export interface Pivot {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface FibonacciLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface DynamicFibonacciResult {
  direction: 'bull' | 'bear';
  trendlineStart: { index: number; price: number };
  trendlineEnd: { index: number; price: number };
  levels: FibonacciLevel[];
  activeLevels: FibonacciLevel[];  // Only enabled levels
  outerHigh: number;
  outerLow: number;
  sinceIndex: number;  // Start index for current swing
}

/**
 * Detect pivot highs using left/right lookback
 */
function detectPivotHighs(highs: number[], lookback: number): Pivot[] {
  const pivots: Pivot[] = [];
  
  for (let i = lookback; i < highs.length - lookback; i++) {
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= lookback; j++) {
      if (highs[i - j] >= highs[i]) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= lookback; j++) {
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
 * Detect pivot lows using left/right lookback
 */
function detectPivotLows(lows: number[], lookback: number): Pivot[] {
  const pivots: Pivot[] = [];
  
  for (let i = lookback; i < lows.length - lookback; i++) {
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= lookback; j++) {
      if (lows[i - j] <= lows[i]) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= lookback; j++) {
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
 * Get bars since last change in pivot value
 */
function barsSinceChange(pivots: Pivot[], currentIndex: number): number {
  if (pivots.length === 0) return currentIndex;
  
  // Find most recent pivot
  const lastPivot = pivots[pivots.length - 1];
  return currentIndex - lastPivot.index;
}

/**
 * Determine current direction (bull or bear)
 */
function determineDirection(
  pivotHighs: Pivot[],
  pivotLows: Pivot[],
  highs: number[],
  lows: number[],
  currentIndex: number
): 'bull' | 'bear' {
  const phBarsSince = barsSinceChange(pivotHighs, currentIndex);
  const plBarsSince = barsSinceChange(pivotLows, currentIndex);
  
  const lastPivotLow = pivotLows.length > 0 ? pivotLows[pivotLows.length - 1].price : lows[0];
  const lastPivotHigh = pivotHighs.length > 0 ? pivotHighs[pivotHighs.length - 1].price : highs[0];
  
  // Check for pivot changes or crossovers
  let direction: 'bull' | 'bear' = 'bull';
  
  // Bear: if pivot high changed recently OR price crossed under pivot low
  if (phBarsSince < plBarsSince || (currentIndex > 0 && lows[currentIndex] < lastPivotLow)) {
    direction = 'bear';
  }
  
  // Bull: if pivot low changed recently OR price crossed over pivot high
  if (plBarsSince < phBarsSince || (currentIndex > 0 && highs[currentIndex] > lastPivotHigh)) {
    direction = 'bull';
  }
  
  return direction;
}

/**
 * Track outer values (extreme high/low beyond pivot in current direction)
 */
function getOuterValues(
  pivotHighs: Pivot[],
  pivotLows: Pivot[],
  highs: number[],
  lows: number[],
  direction: 'bull' | 'bear',
  currentIndex: number
): { outerHigh: number; outerLow: number; startIndex: number } {
  const lastPivotHigh = pivotHighs.length > 0 ? pivotHighs[pivotHighs.length - 1] : { index: 0, price: highs[0] };
  const lastPivotLow = pivotLows.length > 0 ? pivotLows[pivotLows.length - 1] : { index: 0, price: lows[0] };
  
  let outerHigh = lastPivotHigh.price;
  let outerLow = lastPivotLow.price;
  let startIndex = Math.max(lastPivotHigh.index, lastPivotLow.index);
  
  // Track extreme values since last pivot
  if (direction === 'bull') {
    // In bull direction, track highest high
    for (let i = lastPivotLow.index; i <= currentIndex; i++) {
      if (highs[i] > outerHigh) {
        outerHigh = highs[i];
      }
    }
    outerLow = lastPivotLow.price;
    startIndex = lastPivotLow.index;
  } else {
    // In bear direction, track lowest low
    for (let i = lastPivotHigh.index; i <= currentIndex; i++) {
      if (lows[i] < outerLow) {
        outerLow = lows[i];
      }
    }
    outerHigh = lastPivotHigh.price;
    startIndex = lastPivotHigh.index;
  }
  
  return { outerHigh, outerLow, startIndex };
}

/**
 * Calculate Fibonacci level price
 */
function calcFib(
  outerLow: number,
  outerHigh: number,
  ratio: number,
  direction: 'bull' | 'bear'
): number {
  if (direction === 'bull') {
    // Bull: measure retracement from high down to low
    return outerLow - (outerLow - outerHigh) * ratio;
  } else {
    // Bear: measure retracement from low up to high
    return outerHigh - (outerHigh - outerLow) * ratio;
  }
}

/**
 * Main calculation function
 */
export function calculateDynamicFibonacci(
  highs: number[],
  lows: number[],
  closes: number[],
  config: DynamicFibonacciConfig = defaultDynamicFibonacciConfig
): DynamicFibonacciResult {
  const currentIndex = closes.length - 1;
  
  // Detect pivots
  const pivotHighs = detectPivotHighs(highs, config.lookback);
  const pivotLows = detectPivotLows(lows, config.lookback);
  
  // Determine direction
  const direction = determineDirection(pivotHighs, pivotLows, highs, lows, currentIndex);
  
  // Get outer values (extreme high/low)
  const { outerHigh, outerLow, startIndex } = getOuterValues(
    pivotHighs,
    pivotLows,
    highs,
    lows,
    direction,
    currentIndex
  );
  
  // Build levels array (0%, enabled levels, 100%)
  const levelsArray: { ratio: number; enabled: boolean }[] = [
    { ratio: 0, enabled: true }
  ];
  
  if (config.levels.use236) {
    levelsArray.push({ ratio: config.levelValues.level236, enabled: true });
  }
  if (config.levels.use382) {
    levelsArray.push({ ratio: config.levelValues.level382, enabled: true });
  }
  if (config.levels.use50) {
    levelsArray.push({ ratio: config.levelValues.level50, enabled: true });
  }
  if (config.levels.use618) {
    levelsArray.push({ ratio: config.levelValues.level618, enabled: true });
  }
  if (config.levels.use786) {
    levelsArray.push({ ratio: config.levelValues.level786, enabled: true });
  }
  
  levelsArray.push({ ratio: 1, enabled: true });
  
  // Calculate Fibonacci levels
  const levels: FibonacciLevel[] = levelsArray.map(({ ratio, enabled }) => {
    const price = calcFib(outerLow, outerHigh, ratio, direction);
    const label = `${(ratio * 100).toFixed(1)}%`;
    return { ratio, price, label };
  });
  
  const activeLevels = levels.filter((_, i) => levelsArray[i].enabled);
  
  // Calculate trendline endpoints
  let trendlineStart: { index: number; price: number };
  let trendlineEnd: { index: number; price: number };
  
  if (direction === 'bull') {
    trendlineStart = { index: startIndex, price: outerLow };
    trendlineEnd = { index: currentIndex, price: outerHigh };
  } else {
    trendlineStart = { index: startIndex, price: outerHigh };
    trendlineEnd = { index: currentIndex, price: outerLow };
  }
  
  return {
    direction,
    trendlineStart,
    trendlineEnd,
    levels,
    activeLevels,
    outerHigh,
    outerLow,
    sinceIndex: startIndex
  };
}
