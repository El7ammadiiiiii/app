/**
 * TraderDemircan Trend Based Fibonacci + XABCD Formation
 * Based on TradingView indicator by TraderDemircan
 * 
 * Features:
 * - Swing High/Low Detection for downtrend
 * - Fibonacci Retracement Levels (0.0 to 2.618)
 * - XABCD Harmonic Pattern Formation
 * - C Target Projection
 * - Dynamic B level detection (0.382 or 0.5)
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface XABCDConfig {
  // Lookback settings
  lookbackBars: number;  // Period for swing detection (default: 50)
  
  // Fibonacci level visibility
  showFib0: boolean;     // 0.0 (A)
  showFib382: boolean;   // 0.382 (B)
  showFib5: boolean;     // 0.5 (B)
  showFib618: boolean;   // 0.618
  showFib786: boolean;   // 0.786
  showFib1: boolean;     // 1.0 (X)
  showFib1272: boolean;  // 1.272
  showFib1414: boolean;  // 1.414
  showFib1618: boolean;  // 1.618 (C Target)
  showFib2: boolean;     // 2.0
  showFib2618: boolean;  // 2.618
  
  // Colors
  colors: {
    fib0: string;      // 0.0 (A)
    fib382: string;    // 0.382 (B)
    fib5: string;      // 0.5 (B)
    fib618: string;    // 0.618
    fib786: string;    // 0.786
    fib1: string;      // 1.0 (X)
    fib1272: string;   // 1.272
    fib1414: string;   // 1.414
    fib1618: string;   // 1.618 (C)
    fib2: string;      // 2.0
    fib2618: string;   // 2.618
    xabcLine: string;  // XABC formation line
    cTarget: string;   // C target color
  };
  
  // Display options
  showXABC: boolean;
  showCTarget: boolean;
  showLabels: boolean;
  showPercent: boolean;
  extendLines: boolean;
  extendRight: boolean;
  lineWidth: number;
  xabcWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface FibLevel {
  level: number;
  price: number;
  color: string;
  label: string;
  show: boolean;
}

export interface XABCDPoint {
  label: string;
  index: number;
  price: number;
  color: string;
  levelText?: string;
}

export interface XABCDLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface XABCDResult {
  // Swing points
  swingHigh: { index: number; price: number } | null;
  swingLow: { index: number; price: number } | null;
  
  // XABCD Points
  xPoint: XABCDPoint | null;
  aPoint: XABCDPoint | null;
  bPoint: XABCDPoint | null;
  cPoint: XABCDPoint | null;
  
  // B level info
  bLevel: number;      // 0.382 or 0.5
  bLevelText: string;  // "0.382" or "0.5"
  
  // Fibonacci levels
  fibLevels: FibLevel[];
  
  // XABCD Lines
  xabcLines: XABCDLine[];
  
  // Formation validity
  isValidFormation: boolean;
  
  // Trend direction
  trend: 'downtrend' | 'uptrend' | 'neutral';
  
  // Price difference
  priceDiff: number;
}

export const defaultXABCDConfig: XABCDConfig = {
  lookbackBars: 50,
  
  // Show all levels by default
  showFib0: true,
  showFib382: true,
  showFib5: true,
  showFib618: true,
  showFib786: true,
  showFib1: true,
  showFib1272: true,
  showFib1414: true,
  showFib1618: true,
  showFib2: true,
  showFib2618: true,
  
  colors: {
    fib0: '#ff1500',      // 0.0 (A) - Red
    fib382: '#ff0077',    // 0.382 (B) - Pink
    fib5: '#9C27B0',      // 0.5 (B) - Purple
    fib618: '#2196F3',    // 0.618 - Blue
    fib786: '#00BCD4',    // 0.786 - Cyan
    fib1: '#ff7700',      // 1.0 (X) - Orange
    fib1272: '#CDDC39',   // 1.272 - Lime
    fib1414: '#FF5722',   // 1.414 - Deep Orange
    fib1618: '#FFC107',   // 1.618 (C) - Amber
    fib2: '#FF9800',      // 2.0 - Orange
    fib2618: '#9C27B0',   // 2.618 - Purple
    xabcLine: '#FFFF00',  // Yellow
    cTarget: '#FF00FF'    // Magenta
  },
  
  showXABC: true,
  showCTarget: true,
  showLabels: true,
  showPercent: true,
  extendLines: false,
  extendRight: true,
  lineWidth: 1,
  xabcWidth: 2,
  lineStyle: 'solid'
};

// Fibonacci level definitions
const FIB_LEVEL_DEFS = [
  { level: 0.0, key: 'fib0', label: '0.0 (A)', showKey: 'showFib0' },
  { level: 0.382, key: 'fib382', label: '0.382 (B)', showKey: 'showFib382' },
  { level: 0.5, key: 'fib5', label: '0.5 (B)', showKey: 'showFib5' },
  { level: 0.618, key: 'fib618', label: '0.618', showKey: 'showFib618' },
  { level: 0.786, key: 'fib786', label: '0.786', showKey: 'showFib786' },
  { level: 1.0, key: 'fib1', label: '1.0 (X)', showKey: 'showFib1' },
  { level: 1.272, key: 'fib1272', label: '1.272', showKey: 'showFib1272' },
  { level: 1.414, key: 'fib1414', label: '1.414', showKey: 'showFib1414' },
  { level: 1.618, key: 'fib1618', label: '1.618 (C)', showKey: 'showFib1618' },
  { level: 2.0, key: 'fib2', label: '2.0', showKey: 'showFib2' },
  { level: 2.618, key: 'fib2618', label: '2.618', showKey: 'showFib2618' }
] as const;

/**
 * Find highest high within lookback period
 */
function findHighestHigh(data: CandleData[], endIndex: number, lookback: number): { price: number; index: number } {
  let maxPrice = -Infinity;
  let maxIndex = endIndex;
  const startIndex = Math.max(0, endIndex - lookback + 1);
  
  for (let i = startIndex; i <= endIndex; i++) {
    if (data[i].high > maxPrice) {
      maxPrice = data[i].high;
      maxIndex = i;
    }
  }
  
  return { price: maxPrice, index: maxIndex };
}

/**
 * Find lowest low after a given index
 */
function findLowestLowAfter(data: CandleData[], afterIndex: number, endIndex: number, lookback: number): { price: number; index: number } {
  let minPrice = Infinity;
  let minIndex = endIndex;
  const maxLookback = Math.min(endIndex - afterIndex, lookback);
  
  for (let i = endIndex; i > afterIndex && i >= endIndex - maxLookback; i--) {
    if (data[i].low < minPrice) {
      minPrice = data[i].low;
      minIndex = i;
    }
  }
  
  return { price: minPrice, index: minIndex };
}

/**
 * Check if formation is valid (price hasn't exceeded B level)
 */
function checkFormationValidity(data: CandleData[], lowIndex: number, bPrice: number, endIndex: number): boolean {
  const checkBars = Math.min(endIndex - lowIndex, 50);
  
  for (let i = 0; i <= checkBars; i++) {
    const idx = endIndex - i;
    if (idx >= 0 && data[idx].high > bPrice) {
      return false;
    }
  }
  
  return true;
}

/**
 * Main calculation function for XABCD Formation
 */
export function calculateXABCDFormation(
  data: CandleData[],
  config: Partial<XABCDConfig> = {}
): XABCDResult {
  const cfg = { ...defaultXABCDConfig, ...config };
  const { lookbackBars } = cfg;
  
  // Initialize result
  const result: XABCDResult = {
    swingHigh: null,
    swingLow: null,
    xPoint: null,
    aPoint: null,
    bPoint: null,
    cPoint: null,
    bLevel: 0.5,
    bLevelText: '0.5',
    fibLevels: [],
    xabcLines: [],
    isValidFormation: false,
    trend: 'neutral',
    priceDiff: 0
  };
  
  if (data.length < lookbackBars) return result;
  
  const currentIndex = data.length - 1;
  
  // Find highest high within lookback (X point - starting peak)
  const highest = findHighestHigh(data, currentIndex, lookbackBars);
  result.swingHigh = { index: highest.index, price: highest.price };
  
  // Find lowest low after the high (A point - bottom)
  if (highest.index < currentIndex) {
    const lowest = findLowestLowAfter(data, highest.index, currentIndex, lookbackBars);
    
    // Only valid if low comes after high (downtrend)
    if (lowest.index > highest.index) {
      result.swingLow = { index: lowest.index, price: lowest.price };
      result.trend = 'downtrend';
      
      // Calculate price difference
      const diff = highest.price - lowest.price;
      result.priceDiff = diff;
      
      // X and A prices
      const xPrice = highest.price;  // X = highest high
      const aPrice = lowest.price;   // A = lowest low after high
      
      // Calculate 0.382 and 0.5 retracement levels (from A upward)
      const fib382Price = aPrice + (diff * 0.382);
      const fib5Price = aPrice + (diff * 0.5);
      
      // Determine B level based on current price
      const currentPrice = data[currentIndex].close;
      let bPrice: number;
      let bLevel: number;
      let bLevelText: string;
      
      if (currentPrice < fib5Price) {
        // Price below 0.5 level - use 0.5 as B
        bPrice = fib5Price;
        bLevel = 0.5;
        bLevelText = '0.5';
      } else {
        // Price above 0.5 level - use 0.382 as B
        bPrice = fib382Price;
        bLevel = 0.382;
        bLevelText = '0.382';
      }
      
      result.bLevel = bLevel;
      result.bLevelText = bLevelText;
      
      // Calculate C target (extend XA distance from B downward)
      const xaDistance = xPrice - aPrice;
      const cPrice = bPrice - xaDistance;
      
      // Check formation validity
      result.isValidFormation = checkFormationValidity(data, lowest.index, bPrice, currentIndex);
      
      // Set XABCD points
      result.xPoint = {
        label: 'X',
        index: highest.index,
        price: xPrice,
        color: cfg.colors.fib1,
        levelText: '1.0'
      };
      
      result.aPoint = {
        label: 'A',
        index: lowest.index,
        price: aPrice,
        color: cfg.colors.fib0,
        levelText: '0.0'
      };
      
      result.bPoint = {
        label: `B (${bLevelText})`,
        index: currentIndex,
        price: bPrice,
        color: bLevel === 0.5 ? cfg.colors.fib5 : cfg.colors.fib382,
        levelText: bLevelText
      };
      
      result.cPoint = {
        label: 'C (Target)',
        index: currentIndex + 10,
        price: cPrice,
        color: cfg.colors.cTarget,
        levelText: 'Target'
      };
      
      // Calculate Fibonacci levels (from A downward)
      FIB_LEVEL_DEFS.forEach(def => {
        const show = cfg[def.showKey as keyof XABCDConfig] as boolean;
        // Price calculated from A (0.0) with X at 1.0
        // A is the base (0.0), X is 1.0
        // Levels below A go negative (1.272, 1.414, 1.618, etc.)
        const price = aPrice - (diff * (def.level - 1.0));
        
        result.fibLevels.push({
          level: def.level,
          price,
          color: cfg.colors[def.key as keyof typeof cfg.colors],
          label: def.label,
          show
        });
      });
      
      // Create XABC lines if formation is valid
      if (cfg.showXABC && result.isValidFormation) {
        // X-A line
        result.xabcLines.push({
          startIndex: highest.index,
          endIndex: lowest.index,
          startPrice: xPrice,
          endPrice: aPrice,
          color: cfg.colors.xabcLine,
          width: cfg.xabcWidth,
          style: 'solid'
        });
        
        // A-B line
        result.xabcLines.push({
          startIndex: lowest.index,
          endIndex: currentIndex,
          startPrice: aPrice,
          endPrice: bPrice,
          color: cfg.colors.xabcLine,
          width: cfg.xabcWidth,
          style: 'solid'
        });
        
        // B-C line (target projection)
        if (cfg.showCTarget) {
          result.xabcLines.push({
            startIndex: currentIndex,
            endIndex: currentIndex + 10,
            startPrice: bPrice,
            endPrice: cPrice,
            color: cfg.colors.cTarget,
            width: cfg.xabcWidth,
            style: 'dashed'
          });
        }
      }
    }
  }
  
  return result;
}

/**
 * Get color for B level
 */
export function getBLevelColor(bLevel: number, config: Partial<XABCDConfig> = {}): string {
  const cfg = { ...defaultXABCDConfig, ...config };
  return bLevel === 0.5 ? cfg.colors.fib5 : cfg.colors.fib382;
}

/**
 * Format price for display
 */
export function formatXABCDPrice(price: number): string {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 1) return price.toFixed(2);
  return price.toPrecision(4);
}

/**
 * Calculate potential profit/loss from current price to C target
 */
export function calculateTargetDistance(currentPrice: number, cTargetPrice: number): {
  distance: number;
  percentage: number;
  direction: 'up' | 'down';
} {
  const distance = cTargetPrice - currentPrice;
  const percentage = (distance / currentPrice) * 100;
  const direction = distance >= 0 ? 'up' : 'down';
  
  return { distance, percentage, direction };
}

export default calculateXABCDFormation;
