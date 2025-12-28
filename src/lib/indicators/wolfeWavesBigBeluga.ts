/**
 * Wolfe Waves [BigBeluga]
 * Converted from Pine Script
 * 
 * Wolfe Waves are a naturally occurring trading pattern present in all financial markets.
 * They consist of 5 waves showing supply and demand and the price equilibrium.
 */

import { CandleData } from "@/components/charts/TradingChart";

export interface WolfeWavePivot {
  price: number;
  index: number;
  isHigh: boolean;
}

export interface WolfeWavePattern {
  pivots: WolfeWavePivot[];
  type: 'bullish' | 'bearish';
  targetLine: {
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
  };
  projectionLines: {
    line1_4: { start: WolfeWavePivot; end: { index: number; price: number } };
    line1_3: { start: WolfeWavePivot; end: { index: number; price: number } };
    line2_4: { start: WolfeWavePivot; end: { index: number; price: number } };
  };
  isValid: boolean;
  invalidated: boolean;
}

export interface WolfeWaveConfig {
  sensitivity: number;
  showBullish: boolean;
  showBearish: boolean;
  bullishColor: string;
  bearishColor: string;
}

export const defaultWolfeWaveConfig: WolfeWaveConfig = {
  sensitivity: 10,
  showBullish: true,
  showBearish: true,
  bullishColor: '#00ff00', // lime
  bearishColor: '#ffa500', // orange
};

/**
 * Detect pivot points (swing highs and lows)
 */
function detectPivots(data: CandleData[], sensitivity: number): WolfeWavePivot[] {
  const pivots: WolfeWavePivot[] = [];
  
  let direction: boolean | null = null;
  let indexLow = 0;
  let lowValue = data[0]?.low ?? 0;
  let indexHigh = 0;
  let highValue = data[0]?.high ?? 0;
  
  for (let i = sensitivity; i < data.length - 1; i++) {
    // Calculate highest and lowest in the lookback period
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = i - sensitivity; j <= i; j++) {
      if (j >= 0 && j < data.length) {
        if (data[j].high > highest) highest = data[j].high;
        if (data[j].low < lowest) lowest = data[j].low;
      }
    }
    
    const prevDirection: boolean | null = direction;
    
    // Update direction
    if (data[i].high === highest) {
      direction = true; // up
    }
    if (data[i].low === lowest) {
      direction = false; // down
    }
    
    // Detect pivot low
    if (i > 0 && data[i - 1].low === lowest && data[i].low > lowest) {
      indexLow = i - 1;
      lowValue = data[i - 1].low;
    }
    
    // Detect pivot high
    if (i > 0 && data[i - 1].high === highest && data[i].high < highest) {
      indexHigh = i - 1;
      highValue = data[i - 1].high;
    }
    
    // Direction changed from down to up - add pivot low
    if (direction !== prevDirection && direction === true && prevDirection !== null) {
      pivots.push({
        price: lowValue,
        index: indexLow,
        isHigh: false
      });
    }
    
    // Direction changed from up to down - add pivot high
    if (direction !== prevDirection && direction === false && prevDirection !== null) {
      pivots.push({
        price: highValue,
        index: indexHigh,
        isHigh: true
      });
    }
  }
  
  return pivots;
}

/**
 * Check if 5 pivots form a valid Bearish Wolfe Wave
 * Bearish: piv1 > piv2, piv2 < piv3, piv3 > piv1, piv4 > piv2, piv4 < piv1, piv5 > piv3
 */
function isBearishWolfeWave(pivots: WolfeWavePivot[]): boolean {
  if (pivots.length !== 5) return false;
  
  const [p1, p2, p3, p4, p5] = pivots;
  
  return (
    p1.price > p2.price &&     // Point 1 higher than point 2
    p2.price < p3.price &&     // Point 2 lower than point 3
    p3.price > p1.price &&     // Point 3 higher than point 1
    p4.price > p2.price &&     // Point 4 higher than point 2
    p4.price < p1.price &&     // Point 4 lower than point 1
    p5.price > p3.price        // Point 5 higher than point 3
  );
}

/**
 * Check if 5 pivots form a valid Bullish Wolfe Wave
 * Bullish: piv1 < piv2, piv2 > piv4, piv3 < piv1, piv4 > piv1, piv5 < piv3
 */
function isBullishWolfeWave(pivots: WolfeWavePivot[]): boolean {
  if (pivots.length !== 5) return false;
  
  const [p1, p2, p3, p4, p5] = pivots;
  
  return (
    p1.price < p2.price &&     // Point 1 lower than point 2
    p2.price > p4.price &&     // Point 2 higher than point 4
    p3.price < p1.price &&     // Point 3 lower than point 1
    p4.price > p1.price &&     // Point 4 higher than point 1
    p5.price < p3.price        // Point 5 lower than point 3
  );
}

/**
 * Calculate projection lines for the Wolfe Wave
 */
function calculateProjections(pivots: WolfeWavePivot[]): WolfeWavePattern['projectionLines'] {
  const [p1, p2, p3, p4, p5] = pivots;
  
  // Line 1-4 projection (target line)
  const bars1_4 = p4.index - p1.index;
  const slope1_4 = (p1.price - p4.price) / bars1_4;
  const extendedIndex1_4 = p4.index + bars1_4;
  const extendedPrice1_4 = p4.price - slope1_4 * bars1_4;
  
  // Line 1-3 projection
  const bars1_3 = p3.index - p1.index;
  const slope1_3 = (p3.price - p1.price) / bars1_3;
  const extendBars1_3 = p5.index - p3.index;
  const extendedIndex1_3 = p3.index + extendBars1_3;
  const extendedPrice1_3 = p3.price + slope1_3 * extendBars1_3;
  
  // Line 2-4 projection
  const bars2_4 = p4.index - p2.index;
  const slope2_4 = (p4.price - p2.price) / bars2_4;
  const extendBars2_4 = p5.index - p4.index;
  const extendedIndex2_4 = p4.index + extendBars2_4;
  const extendedPrice2_4 = p4.price + slope2_4 * extendBars2_4;
  
  return {
    line1_4: {
      start: p1,
      end: { index: extendedIndex1_4, price: extendedPrice1_4 }
    },
    line1_3: {
      start: p1,
      end: { index: extendedIndex1_3, price: extendedPrice1_3 }
    },
    line2_4: {
      start: p2,
      end: { index: extendedIndex2_4, price: extendedPrice2_4 }
    }
  };
}

/**
 * Detect Wolfe Wave patterns in the data
 */
export function detectWolfeWavesBigBeluga(
  data: CandleData[],
  config: WolfeWaveConfig = defaultWolfeWaveConfig
): WolfeWavePattern[] {
  const patterns: WolfeWavePattern[] = [];
  
  if (data.length < config.sensitivity * 3) {
    return patterns;
  }
  
  const allPivots = detectPivots(data, config.sensitivity);
  
  if (allPivots.length < 5) {
    return patterns;
  }
  
  // Slide window through pivots to find patterns
  const usedIndices = new Set<number>();
  
  for (let i = 0; i <= allPivots.length - 5; i++) {
    const windowPivots = allPivots.slice(i, i + 5);
    
    // Skip if we've already used these pivots
    const firstPivotIndex = windowPivots[0].index;
    if (usedIndices.has(firstPivotIndex)) {
      continue;
    }
    
    // Check for Bearish Wolfe Wave
    if (config.showBearish && isBearishWolfeWave(windowPivots)) {
      const projections = calculateProjections(windowPivots);
      
      patterns.push({
        pivots: windowPivots,
        type: 'bearish',
        targetLine: {
          startIndex: windowPivots[0].index,
          startPrice: windowPivots[0].price,
          endIndex: projections.line1_4.end.index,
          endPrice: projections.line1_4.end.price
        },
        projectionLines: projections,
        isValid: true,
        invalidated: false
      });
      
      usedIndices.add(firstPivotIndex);
    }
    
    // Check for Bullish Wolfe Wave
    if (config.showBullish && isBullishWolfeWave(windowPivots)) {
      const projections = calculateProjections(windowPivots);
      
      patterns.push({
        pivots: windowPivots,
        type: 'bullish',
        targetLine: {
          startIndex: windowPivots[0].index,
          startPrice: windowPivots[0].price,
          endIndex: projections.line1_4.end.index,
          endPrice: projections.line1_4.end.price
        },
        projectionLines: projections,
        isValid: true,
        invalidated: false
      });
      
      usedIndices.add(firstPivotIndex);
    }
  }
  
  // Validate patterns (check if price crossed the target before reaching it)
  patterns.forEach(pattern => {
    const p5 = pattern.pivots[4];
    const targetPrice = pattern.projectionLines.line1_4.end.price;
    
    // Check bars after point 5 for invalidation
    for (let i = p5.index + 1; i < Math.min(p5.index + 15, data.length); i++) {
      if (pattern.type === 'bullish') {
        // Bullish invalidated if price drops below point 5
        if (data[i].high < targetPrice) {
          pattern.invalidated = true;
          break;
        }
      } else {
        // Bearish invalidated if price rises above point 5
        if (data[i].low > targetPrice) {
          pattern.invalidated = true;
          break;
        }
      }
    }
  });
  
  return patterns;
}

/**
 * Get the most recent Wolfe Wave patterns
 */
export function getRecentWolfeWaves(
  data: CandleData[],
  config: WolfeWaveConfig = defaultWolfeWaveConfig,
  maxPatterns: number = 3
): WolfeWavePattern[] {
  const allPatterns = detectWolfeWavesBigBeluga(data, config);
  
  // Sort by most recent (based on point 5 index)
  allPatterns.sort((a, b) => b.pivots[4].index - a.pivots[4].index);
  
  // Return only valid, non-invalidated patterns first, then others
  const validPatterns = allPatterns.filter(p => p.isValid && !p.invalidated);
  const otherPatterns = allPatterns.filter(p => !p.isValid || p.invalidated);
  
  return [...validPatterns, ...otherPatterns].slice(0, maxPatterns);
}

/**
 * Get color for pattern
 */
export function getWolfeWaveColor(pattern: WolfeWavePattern, config: WolfeWaveConfig = defaultWolfeWaveConfig): string {
  if (pattern.invalidated) {
    return '#ef4444'; // Red for invalidated
  }
  return pattern.type === 'bullish' ? config.bullishColor : config.bearishColor;
}
