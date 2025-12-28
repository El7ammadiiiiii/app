/**
 * Trend Break Targets [TBT] + CHOCH (Change of Character)
 * Converted from Pine Script by MarkitTick
 * 
 * Features:
 * 1. TBT: Trendline-based breakout detection with Fibonacci targets
 * 2. CHOCH: Market structure change detection (bullish/bearish)
 */

export interface TBTSignal {
  index: number;
  type: 'bullish_break' | 'bearish_break';
  breakPrice: number;
  trendlinePrice: number;
  targets: {
    t1: number;
    t2?: number;
    t3?: number;
  };
  pivotPrice: number;
  distance: number;
}

export interface CHOCHSignal {
  index: number;
  type: 'bullish' | 'bearish';
  price: number;
  swingLevel: number;
}

export interface TrendBreakResult {
  tbtSignals: TBTSignal[];
  chochSignals: CHOCHSignal[];
  trendline: {
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
    slope: number;
  } | null;
  pivotHighs: { index: number; price: number }[];
  pivotLows: { index: number; price: number }[];
}

// Helper: Find Pivot Highs
function findPivotHighs(highs: number[], left: number, right: number): { index: number; price: number }[] {
  const pivots: { index: number; price: number }[] = [];
  
  for (let i = left; i < highs.length - right; i++) {
    let isPivot = true;
    const currentHigh = highs[i];
    
    // Check left bars
    for (let j = 1; j <= left; j++) {
      if (highs[i - j] >= currentHigh) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= right; j++) {
        if (highs[i + j] >= currentHigh) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: currentHigh });
    }
  }
  
  return pivots;
}

// Helper: Find Pivot Lows
function findPivotLows(lows: number[], left: number, right: number): { index: number; price: number }[] {
  const pivots: { index: number; price: number }[] = [];
  
  for (let i = left; i < lows.length - right; i++) {
    let isPivot = true;
    const currentLow = lows[i];
    
    // Check left bars
    for (let j = 1; j <= left; j++) {
      if (lows[i - j] <= currentLow) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= right; j++) {
        if (lows[i + j] <= currentLow) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({ index: i, price: currentLow });
    }
  }
  
  return pivots;
}

// Helper: Calculate lowest value in range
function lowestInRange(data: number[], endIndex: number, lookback: number): number {
  let lowest = Infinity;
  const startIndex = Math.max(0, endIndex - lookback);
  for (let i = startIndex; i <= endIndex; i++) {
    if (data[i] < lowest) lowest = data[i];
  }
  return lowest;
}

// Helper: Calculate highest value in range
function highestInRange(data: number[], endIndex: number, lookback: number): number {
  let highest = -Infinity;
  const startIndex = Math.max(0, endIndex - lookback);
  for (let i = startIndex; i <= endIndex; i++) {
    if (data[i] > highest) highest = data[i];
  }
  return highest;
}

export interface TBTConfig {
  pivotLeft?: number;
  pivotRight?: number;
  fallbackLookback?: number;
  showTarget2?: boolean;
  showTarget3?: boolean;
  chochLength?: number;
  priceSource?: 'high' | 'low' | 'auto';
}

export function calculateTrendBreakTargets(
  closes: number[],
  highs: number[],
  lows: number[],
  config: TBTConfig = {}
): TrendBreakResult {
  const {
    pivotLeft = 5,
    pivotRight = 5,
    fallbackLookback = 50,
    showTarget2 = true,
    showTarget3 = true,
    chochLength = 5,
    priceSource = 'auto'
  } = config;

  const len = closes.length;
  const tbtSignals: TBTSignal[] = [];
  const chochSignals: CHOCHSignal[] = [];

  // Find all pivot points
  const pivotHighs = findPivotHighs(highs, pivotLeft, pivotRight);
  const pivotLows = findPivotLows(lows, pivotLeft, pivotRight);

  // For auto-detection, we'll create trendlines dynamically
  // Using the last two significant pivots to form a trendline

  // =====================================================
  // TBT Logic: Dynamic Trendline Detection
  // =====================================================
  
  // We'll look for breakouts from dynamic trendlines
  // formed by recent pivot points
  
  let trendline: TrendBreakResult['trendline'] = null;
  
  // Build descending trendline from pivot highs (for bullish breaks)
  if (pivotHighs.length >= 2) {
    const recentHighs = pivotHighs.slice(-3); // Last 3 pivot highs
    
    for (let i = 0; i < recentHighs.length - 1; i++) {
      const p1 = recentHighs[i];
      const p2 = recentHighs[i + 1];
      
      // Check if it forms a descending trendline
      if (p2.price <= p1.price && p2.index > p1.index) {
        const slope = (p2.price - p1.price) / (p2.index - p1.index);
        
        // Check for breakout after the trendline
        for (let j = p2.index + 1; j < len; j++) {
          const trendlinePrice = p1.price + slope * (j - p1.index);
          
          // Bullish breakout
          if (closes[j] > trendlinePrice && closes[j - 1] <= trendlinePrice) {
            // Find the pivot low before the break
            const pivotBefore = pivotLows.filter(p => p.index < j).pop();
            const pivotPrice = pivotBefore ? pivotBefore.price : lowestInRange(lows, j, fallbackLookback);
            const pivotIndex = pivotBefore ? pivotBefore.index : j - Math.floor(fallbackLookback / 2);
            
            // Calculate pivot's trendline price
            const pivotTrendlinePrice = p1.price + slope * (pivotIndex - p1.index);
            const distance = Math.abs(pivotTrendlinePrice - pivotPrice);
            
            const signal: TBTSignal = {
              index: j,
              type: 'bullish_break',
              breakPrice: closes[j],
              trendlinePrice: trendlinePrice,
              targets: {
                t1: trendlinePrice + distance,
                t2: showTarget2 ? trendlinePrice + distance * 1.618 : undefined,
                t3: showTarget3 ? trendlinePrice + distance * 2.618 : undefined
              },
              pivotPrice: pivotPrice,
              distance: distance
            };
            
            tbtSignals.push(signal);
            
            // Update trendline for display
            trendline = {
              startIndex: p1.index,
              startPrice: p1.price,
              endIndex: p2.index,
              endPrice: p2.price,
              slope: slope
            };
            
            break; // Only one break per trendline segment
          }
        }
      }
    }
  }

  // Build ascending trendline from pivot lows (for bearish breaks)
  if (pivotLows.length >= 2) {
    const recentLows = pivotLows.slice(-3); // Last 3 pivot lows
    
    for (let i = 0; i < recentLows.length - 1; i++) {
      const p1 = recentLows[i];
      const p2 = recentLows[i + 1];
      
      // Check if it forms an ascending trendline
      if (p2.price >= p1.price && p2.index > p1.index) {
        const slope = (p2.price - p1.price) / (p2.index - p1.index);
        
        // Check for breakout after the trendline
        for (let j = p2.index + 1; j < len; j++) {
          const trendlinePrice = p1.price + slope * (j - p1.index);
          
          // Bearish breakout
          if (closes[j] < trendlinePrice && closes[j - 1] >= trendlinePrice) {
            // Find the pivot high before the break
            const pivotBefore = pivotHighs.filter(p => p.index < j).pop();
            const pivotPrice = pivotBefore ? pivotBefore.price : highestInRange(highs, j, fallbackLookback);
            const pivotIndex = pivotBefore ? pivotBefore.index : j - Math.floor(fallbackLookback / 2);
            
            // Calculate pivot's trendline price
            const pivotTrendlinePrice = p1.price + slope * (pivotIndex - p1.index);
            const distance = Math.abs(pivotTrendlinePrice - pivotPrice);
            
            const signal: TBTSignal = {
              index: j,
              type: 'bearish_break',
              breakPrice: closes[j],
              trendlinePrice: trendlinePrice,
              targets: {
                t1: trendlinePrice - distance,
                t2: showTarget2 ? trendlinePrice - distance * 1.618 : undefined,
                t3: showTarget3 ? trendlinePrice - distance * 2.618 : undefined
              },
              pivotPrice: pivotPrice,
              distance: distance
            };
            
            tbtSignals.push(signal);
            
            // Update trendline for display
            if (!trendline) {
              trendline = {
                startIndex: p1.index,
                startPrice: p1.price,
                endIndex: p2.index,
                endPrice: p2.price,
                slope: slope
              };
            }
            
            break; // Only one break per trendline segment
          }
        }
      }
    }
  }

  // =====================================================
  // CHOCH Logic: Change of Character Detection
  // =====================================================
  
  // Find swing highs and lows for CHOCH
  const chochPivotHighs = findPivotHighs(highs, chochLength, chochLength);
  const chochPivotLows = findPivotLows(lows, chochLength, chochLength);
  
  let lastSwingHigh: number | null = null;
  let lastSwingHighIndex: number = -1;
  let lastSwingLow: number | null = null;
  let lastSwingLowIndex: number = -1;
  let trendState = 0; // 0 = neutral, 1 = bullish, -1 = bearish
  
  // Process bar by bar
  for (let i = chochLength; i < len; i++) {
    // Update swing levels
    const phMatch = chochPivotHighs.find(p => p.index === i - chochLength);
    const plMatch = chochPivotLows.find(p => p.index === i - chochLength);
    
    if (phMatch) {
      lastSwingHigh = phMatch.price;
      lastSwingHighIndex = phMatch.index;
    }
    if (plMatch) {
      lastSwingLow = plMatch.price;
      lastSwingLowIndex = plMatch.index;
    }
    
    // Bullish CHOCH: Price breaks above last swing high
    if (trendState !== 1 && lastSwingHigh !== null && closes[i] > lastSwingHigh) {
      chochSignals.push({
        index: i,
        type: 'bullish',
        price: lows[i],
        swingLevel: lastSwingHigh
      });
      trendState = 1;
    }
    
    // Bearish CHOCH: Price breaks below last swing low
    if (trendState !== -1 && lastSwingLow !== null && closes[i] < lastSwingLow) {
      chochSignals.push({
        index: i,
        type: 'bearish',
        price: highs[i],
        swingLevel: lastSwingLow
      });
      trendState = -1;
    }
  }

  return {
    tbtSignals,
    chochSignals,
    trendline,
    pivotHighs,
    pivotLows
  };
}
