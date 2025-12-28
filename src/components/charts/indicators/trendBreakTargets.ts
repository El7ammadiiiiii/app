/**
 * Trend Break Targets [MarkitTick]
 * Converted from Pine Script to TypeScript for React/ECharts
 * 
 * Features:
 * - TBT: Trend-Based Targets with T1, T2, T3 levels
 * - CHOCH: Change of Character detection
 * - Automatic pivot detection
 * - Trendline breakout signals
 */

// ===================== DATA INTERFACE =====================

// Time type from lightweight-charts
type Time = string | number | { year: number; month: number; day: number };

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ===================== INTERFACES =====================

export interface TrendBreakTargetsConfig {
  // TBT Settings
  startIndex?: number;          // Start anchor bar index
  endIndex?: number;            // End anchor bar index
  priceSource: 'High' | 'Low';  // Price source for anchors
  pivotLeft: number;            // Pivot left lookback
  pivotRight: number;           // Pivot right lookback
  fallbackLookback: number;     // Fallback lookback for pivot
  targetExtendBars: number;     // Extend target lines (bars)
  showTarget2: boolean;         // Show T2
  showTarget3: boolean;         // Show T3
  
  // TBT Style
  anchorColor: string;          // Anchor point color
  trendlineColor: string;       // Trendline color
  breakoutBullColor: string;    // Bullish breakout label
  breakoutBearColor: string;    // Bearish breakout label
  target1Color: string;         // T1 color
  target2Color: string;         // T2 color
  target3Color: string;         // T3 color
  
  // CHOCH Settings
  chochLength: number;          // Swing detection length
  showChochLines: boolean;      // Show break levels
  
  // CHOCH Style
  chochBullColor: string;       // CHOCH bullish color
  chochBearColor: string;       // CHOCH bearish color
  
  // General
  lineWidth: number;
  maxChochLabels: number;       // Max CHOCH labels to keep
}

export interface TrendAnchor {
  index: number;
  price: number;
  label: string;
}

export interface TrendlineData {
  startIndex: number;
  startPrice: number;
  endIndex: number;
  endPrice: number;
  slope: number;
  isValid: boolean;
}

export interface BreakoutSignal {
  index: number;
  price: number;
  type: 'bullish' | 'bearish';
  trendlinePrice: number;
}

export interface TargetLevel {
  index: number;
  price: number;
  label: string;
  color: string;
  connectorStartPrice: number;
  extendBars: number;
}

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface ChochSignal {
  index: number;
  price: number;
  type: 'bullish' | 'bearish';
  breakLevel: number;
  levelStartIndex: number;
}

export interface TrendBreakTargetsResult {
  // TBT
  anchors: TrendAnchor[];
  trendline: TrendlineData | null;
  breakout: BreakoutSignal | null;
  targets: TargetLevel[];
  pivots: PivotPoint[];
  
  // CHOCH
  chochSignals: ChochSignal[];
  currentTrend: 'bullish' | 'bearish' | 'neutral';
  lastSwingHigh: number | null;
  lastSwingLow: number | null;
  
  // Stats
  totalBreakouts: number;
  bullishBreakouts: number;
  bearishBreakouts: number;
}

// ===================== DEFAULT CONFIG =====================

export const defaultTrendBreakTargetsConfig: TrendBreakTargetsConfig = {
  // TBT Settings
  startIndex: undefined,
  endIndex: undefined,
  priceSource: 'High',
  pivotLeft: 5,
  pivotRight: 5,
  fallbackLookback: 50,
  targetExtendBars: 100,
  showTarget2: false,
  showTarget3: false,
  
  // TBT Style
  anchorColor: '#3b82f6',
  trendlineColor: '#ffffff',
  breakoutBullColor: '#22c55e',
  breakoutBearColor: '#ef4444',
  target1Color: '#22c55e',
  target2Color: '#84cc16',
  target3Color: '#14b8a6',
  
  // CHOCH Settings
  chochLength: 5,
  showChochLines: true,
  
  // CHOCH Style
  chochBullColor: '#22c55e',
  chochBearColor: '#ef4444',
  
  // General
  lineWidth: 2,
  maxChochLabels: 10
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Get price based on source selection
 */
function getPrice(candle: CandleData, source: 'High' | 'Low'): number {
  return source === 'High' ? candle.high : candle.low;
}

/**
 * Calculate pivot highs
 */
function findPivotHighs(
  data: CandleData[],
  leftBars: number,
  rightBars: number
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentHigh = data[i].high;
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= leftBars; j++) {
      if (data[i - j].high >= currentHigh) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (data[i + j].high >= currentHigh) {
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
 * Calculate pivot lows
 */
function findPivotLows(
  data: CandleData[],
  leftBars: number,
  rightBars: number
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentLow = data[i].low;
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= leftBars; j++) {
      if (data[i - j].low <= currentLow) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= rightBars; j++) {
        if (data[i + j].low <= currentLow) {
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
 * Calculate trendline price at a specific bar
 */
function getTrendlinePriceAt(trendline: TrendlineData, barIndex: number): number {
  return trendline.startPrice + trendline.slope * (barIndex - trendline.startIndex);
}

/**
 * Find lowest low in range
 */
function findLowestLow(data: CandleData[], startIdx: number, lookback: number): number {
  let lowest = Infinity;
  const start = Math.max(0, startIdx - lookback);
  
  for (let i = start; i <= startIdx; i++) {
    if (data[i].low < lowest) {
      lowest = data[i].low;
    }
  }
  
  return lowest;
}

/**
 * Find highest high in range
 */
function findHighestHigh(data: CandleData[], startIdx: number, lookback: number): number {
  let highest = -Infinity;
  const start = Math.max(0, startIdx - lookback);
  
  for (let i = start; i <= startIdx; i++) {
    if (data[i].high > highest) {
      highest = data[i].high;
    }
  }
  
  return highest;
}

/**
 * Auto-detect anchors based on significant swing points
 */
function autoDetectAnchors(
  data: CandleData[],
  priceSource: 'High' | 'Low',
  pivotLeft: number,
  pivotRight: number
): { startIndex: number; endIndex: number } | null {
  const isHigh = priceSource === 'High';
  const pivots = isHigh 
    ? findPivotHighs(data, pivotLeft, pivotRight)
    : findPivotLows(data, pivotLeft, pivotRight);
  
  if (pivots.length < 2) return null;
  
  // Get the last two significant pivots for trendline
  const recentPivots = pivots.slice(-3);
  
  if (recentPivots.length >= 2) {
    return {
      startIndex: recentPivots[0].index,
      endIndex: recentPivots[recentPivots.length - 1].index
    };
  }
  
  return null;
}

// ===================== MAIN CALCULATION =====================

/**
 * Calculate Trend Break Targets and CHOCH
 */
export function calculateTrendBreakTargets(
  data: CandleData[],
  config: Partial<TrendBreakTargetsConfig> = {}
): TrendBreakTargetsResult {
  const cfg = { ...defaultTrendBreakTargetsConfig, ...config };
  
  const result: TrendBreakTargetsResult = {
    anchors: [],
    trendline: null,
    breakout: null,
    targets: [],
    pivots: [],
    chochSignals: [],
    currentTrend: 'neutral',
    lastSwingHigh: null,
    lastSwingLow: null,
    totalBreakouts: 0,
    bullishBreakouts: 0,
    bearishBreakouts: 0
  };
  
  if (data.length < cfg.pivotLeft + cfg.pivotRight + 10) {
    return result;
  }
  
  // ==================== TBT LOGIC ====================
  
  // Determine anchors
  let startIndex = cfg.startIndex;
  let endIndex = cfg.endIndex;
  
  // Auto-detect if not specified
  if (startIndex === undefined || endIndex === undefined) {
    const autoAnchors = autoDetectAnchors(data, cfg.priceSource, cfg.pivotLeft, cfg.pivotRight);
    if (autoAnchors) {
      startIndex = startIndex ?? autoAnchors.startIndex;
      endIndex = endIndex ?? autoAnchors.endIndex;
    }
  }
  
  // Validate anchors
  if (startIndex === undefined || endIndex === undefined || 
      startIndex >= endIndex || startIndex < 0 || endIndex >= data.length) {
    // Fall back to reasonable defaults
    startIndex = Math.floor(data.length * 0.3);
    endIndex = Math.floor(data.length * 0.7);
  }
  
  // Get anchor prices
  const startPrice = getPrice(data[startIndex], cfg.priceSource);
  const endPrice = getPrice(data[endIndex], cfg.priceSource);
  
  // Create anchors
  result.anchors = [
    { index: startIndex, price: startPrice, label: '1' },
    { index: endIndex, price: endPrice, label: '2' }
  ];
  
  // Calculate trendline
  const slope = (endPrice - startPrice) / (endIndex - startIndex);
  
  result.trendline = {
    startIndex,
    startPrice,
    endIndex,
    endPrice,
    slope,
    isValid: true
  };
  
  // Find all pivots for reference
  const pivotHighs = findPivotHighs(data, cfg.pivotLeft, cfg.pivotRight);
  const pivotLows = findPivotLows(data, cfg.pivotLeft, cfg.pivotRight);
  result.pivots = [...pivotHighs, ...pivotLows].sort((a, b) => a.index - b.index);
  
  // Track most recent pivots before potential breakout
  let lastPivotHigh: PivotPoint | null = null;
  let lastPivotLow: PivotPoint | null = null;
  
  for (const p of pivotHighs) {
    if (p.index < data.length - cfg.pivotRight) {
      lastPivotHigh = p;
    }
  }
  
  for (const p of pivotLows) {
    if (p.index < data.length - cfg.pivotRight) {
      lastPivotLow = p;
    }
  }
  
  // Detect breakout
  let breakoutDetected = false;
  let breakoutIndex = -1;
  let breakoutType: 'bullish' | 'bearish' = 'bullish';
  
  // Scan for breakouts after the trendline end
  for (let i = endIndex + 1; i < data.length && !breakoutDetected; i++) {
    const trendlinePrice = getTrendlinePriceAt(result.trendline, i);
    const closePrice = data[i].close;
    
    if (cfg.priceSource === 'High' && closePrice > trendlinePrice) {
      // Bullish breakout (price breaks above descending resistance)
      breakoutDetected = true;
      breakoutIndex = i;
      breakoutType = 'bullish';
      result.bullishBreakouts++;
    } else if (cfg.priceSource === 'Low' && closePrice < trendlinePrice) {
      // Bearish breakout (price breaks below ascending support)
      breakoutDetected = true;
      breakoutIndex = i;
      breakoutType = 'bearish';
      result.bearishBreakouts++;
    }
  }
  
  if (breakoutDetected && breakoutIndex >= 0) {
    result.totalBreakouts++;
    
    const trendlinePriceAtBreak = getTrendlinePriceAt(result.trendline, breakoutIndex);
    const breakoutPrice = breakoutType === 'bullish' ? data[breakoutIndex].high : data[breakoutIndex].low;
    
    result.breakout = {
      index: breakoutIndex,
      price: breakoutPrice,
      type: breakoutType,
      trendlinePrice: trendlinePriceAtBreak
    };
    
    // Calculate targets
    let pivotPrice: number | null = null;
    let pivotBar: number | null = null;
    
    if (breakoutType === 'bullish') {
      // For bullish breakout, find pivot low before break
      if (lastPivotLow && lastPivotLow.index < breakoutIndex) {
        pivotPrice = lastPivotLow.price;
        pivotBar = lastPivotLow.index;
      } else {
        pivotPrice = findLowestLow(data, breakoutIndex, cfg.fallbackLookback);
        pivotBar = breakoutIndex - Math.floor(cfg.fallbackLookback / 2);
      }
    } else {
      // For bearish breakout, find pivot high before break
      if (lastPivotHigh && lastPivotHigh.index < breakoutIndex) {
        pivotPrice = lastPivotHigh.price;
        pivotBar = lastPivotHigh.index;
      } else {
        pivotPrice = findHighestHigh(data, breakoutIndex, cfg.fallbackLookback);
        pivotBar = breakoutIndex - Math.floor(cfg.fallbackLookback / 2);
      }
    }
    
    if (pivotPrice !== null && pivotBar !== null) {
      const pivotLinePrice = getTrendlinePriceAt(result.trendline, pivotBar);
      const dist = Math.abs(pivotLinePrice - pivotPrice);
      
      // T1 (1:1)
      const t1Price = breakoutType === 'bullish' 
        ? trendlinePriceAtBreak + dist 
        : trendlinePriceAtBreak - dist;
      
      result.targets.push({
        index: breakoutIndex,
        price: t1Price,
        label: 'T1',
        color: cfg.target1Color,
        connectorStartPrice: trendlinePriceAtBreak,
        extendBars: cfg.targetExtendBars
      });
      
      // T2 (1.618)
      if (cfg.showTarget2) {
        const t2Price = breakoutType === 'bullish'
          ? trendlinePriceAtBreak + dist * 1.618
          : trendlinePriceAtBreak - dist * 1.618;
        
        result.targets.push({
          index: breakoutIndex,
          price: t2Price,
          label: 'T2',
          color: cfg.target2Color,
          connectorStartPrice: trendlinePriceAtBreak,
          extendBars: cfg.targetExtendBars
        });
      }
      
      // T3 (2.618)
      if (cfg.showTarget3) {
        const t3Price = breakoutType === 'bullish'
          ? trendlinePriceAtBreak + dist * 2.618
          : trendlinePriceAtBreak - dist * 2.618;
        
        result.targets.push({
          index: breakoutIndex,
          price: t3Price,
          label: 'T3',
          color: cfg.target3Color,
          connectorStartPrice: trendlinePriceAtBreak,
          extendBars: cfg.targetExtendBars
        });
      }
    }
  }
  
  // ==================== CHOCH LOGIC ====================
  
  const chochPivotHighs = findPivotHighs(data, cfg.chochLength, cfg.chochLength);
  const chochPivotLows = findPivotLows(data, cfg.chochLength, cfg.chochLength);
  
  let lastSwingHigh: number | null = null;
  let lastSwingLow: number | null = null;
  let lastSwingHighIndex = -1;
  let lastSwingLowIndex = -1;
  let trendState = 0; // 0: neutral, 1: bullish, -1: bearish
  
  // Build swing history
  interface SwingEvent {
    index: number;
    price: number;
    type: 'high' | 'low';
  }
  
  const swingEvents: SwingEvent[] = [];
  
  for (const ph of chochPivotHighs) {
    swingEvents.push({ index: ph.index, price: ph.price, type: 'high' });
  }
  
  for (const pl of chochPivotLows) {
    swingEvents.push({ index: pl.index, price: pl.price, type: 'low' });
  }
  
  swingEvents.sort((a, b) => a.index - b.index);
  
  // Process each bar for CHOCH detection
  for (let i = cfg.chochLength * 2; i < data.length; i++) {
    // Update swing levels from events that have confirmed
    for (const event of swingEvents) {
      if (event.index + cfg.chochLength === i) {
        if (event.type === 'high') {
          lastSwingHigh = event.price;
          lastSwingHighIndex = event.index;
        } else {
          lastSwingLow = event.price;
          lastSwingLowIndex = event.index;
        }
      }
    }
    
    const closePrice = data[i].close;
    
    // Bullish CHOCH: price closes above last swing high
    if (trendState !== 1 && lastSwingHigh !== null && closePrice > lastSwingHigh) {
      result.chochSignals.push({
        index: i,
        price: data[i].low,
        type: 'bullish',
        breakLevel: lastSwingHigh,
        levelStartIndex: lastSwingHighIndex
      });
      trendState = 1;
    }
    
    // Bearish CHOCH: price closes below last swing low
    if (trendState !== -1 && lastSwingLow !== null && closePrice < lastSwingLow) {
      result.chochSignals.push({
        index: i,
        price: data[i].high,
        type: 'bearish',
        breakLevel: lastSwingLow,
        levelStartIndex: lastSwingLowIndex
      });
      trendState = -1;
    }
  }
  
  // Limit CHOCH signals to max
  if (result.chochSignals.length > cfg.maxChochLabels) {
    result.chochSignals = result.chochSignals.slice(-cfg.maxChochLabels);
  }
  
  // Set final state
  result.currentTrend = trendState === 1 ? 'bullish' : trendState === -1 ? 'bearish' : 'neutral';
  result.lastSwingHigh = lastSwingHigh;
  result.lastSwingLow = lastSwingLow;
  
  return result;
}

// ===================== UTILITY EXPORTS =====================

/**
 * Get target info text
 */
export function getTargetInfo(target: TargetLevel): string {
  return `${target.label}: ${target.price.toFixed(2)}`;
}

/**
 * Calculate risk/reward for a target
 */
export function calculateRiskReward(
  entryPrice: number,
  targetPrice: number,
  stopLoss: number
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(targetPrice - entryPrice);
  return risk > 0 ? reward / risk : 0;
}

/**
 * Get CHOCH signal description
 */
export function getChochDescription(signal: ChochSignal): string {
  return signal.type === 'bullish' 
    ? `Bullish CHOCH @ ${signal.breakLevel.toFixed(2)}`
    : `Bearish CHOCH @ ${signal.breakLevel.toFixed(2)}`;
}
