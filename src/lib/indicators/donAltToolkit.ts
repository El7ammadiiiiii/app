/**
 * DonAlt Toolkit [BigBeluga]
 * Converted from Pine Script
 * 
 * This toolkit includes:
 * - Dynamic Support/Resistance Levels based on pivot points
 * - Order Blocks (Bullish/Bearish imbalances)
 * - Automatic Trend Lines
 */

import { CandleData } from "@/components/charts/TradingChart";

export interface DonAltLevel {
  index: number;
  price: number;
  type: 'support' | 'resistance';
  color: string;
  active: boolean;
}

export interface OrderBlock {
  startIndex: number;
  endIndex: number;
  top: number;
  bottom: number;
  type: 'bullish' | 'bearish';
  active: boolean;
}

export interface TrendLine {
  startIndex: number;
  startPrice: number;
  endIndex: number;
  endPrice: number;
  type: 'bullish' | 'bearish';
  slope: number;
}

export interface DonAltToolkitResult {
  levels: DonAltLevel[];
  orderBlocks: OrderBlock[];
  trendLines: TrendLine[];
}

export interface DonAltToolkitConfig {
  // Levels
  displayLevels: boolean;
  levelsPeriod: number;
  levelsStyle: 'solid' | 'dashed';
  levelsFilter: number;
  levelsUpColor: string;
  levelsDownColor: string;
  
  // Order Blocks
  displayOrderBlocks: boolean;
  orderBlocksBullColor: string;
  orderBlocksBearColor: string;
  
  // Trend Lines
  displayTrendLines: boolean;
  trendLinesPeriod: number;
  trendLinesStyle: 'solid' | 'dashed';
  trendLinesExtend: number;
  trendLinesBullColor: string;
  trendLinesBearColor: string;
  
  // General
  maxBarsBack: number;
}

export const defaultDonAltConfig: DonAltToolkitConfig = {
  displayLevels: true,
  levelsPeriod: 20,
  levelsStyle: 'solid',
  levelsFilter: 20,
  levelsUpColor: '#23b850',
  levelsDownColor: '#ff5252',
  
  displayOrderBlocks: true,
  orderBlocksBullColor: '#14be93',
  orderBlocksBearColor: '#c21919',
  
  displayTrendLines: true,
  trendLinesPeriod: 10,
  trendLinesStyle: 'solid',
  trendLinesExtend: 10,
  trendLinesBullColor: '#1bd663',
  trendLinesBearColor: '#d61b7f',
  
  maxBarsBack: 400
};

/**
 * Detect pivot high
 */
function pivotHigh(data: CandleData[], index: number, leftBars: number, rightBars: number): number | null {
  if (index < leftBars || index >= data.length - rightBars) return null;
  
  const pivotValue = data[index].open;
  
  for (let i = 1; i <= leftBars; i++) {
    if (data[index - i].open >= pivotValue) return null;
  }
  
  for (let i = 1; i <= rightBars; i++) {
    if (data[index + i].open >= pivotValue) return null;
  }
  
  return pivotValue;
}

/**
 * Detect pivot low
 */
function pivotLow(data: CandleData[], index: number, leftBars: number, rightBars: number): number | null {
  if (index < leftBars || index >= data.length - rightBars) return null;
  
  const pivotValue = data[index].close;
  
  for (let i = 1; i <= leftBars; i++) {
    if (data[index - i].close <= pivotValue) return null;
  }
  
  for (let i = 1; i <= rightBars; i++) {
    if (data[index + i].close <= pivotValue) return null;
  }
  
  return pivotValue;
}

/**
 * Calculate SMA
 */
function calculateSMA(data: number[], length: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < length; j++) {
      sum += data[i - j];
    }
    result.push(sum / length);
  }
  
  return result;
}

/**
 * Normalize values between 0 and 100
 */
function normalize(data: number[], lookback: number = 200): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < lookback - 1) {
      result.push(NaN);
      continue;
    }
    
    let min = Infinity;
    let max = -Infinity;
    
    for (let j = 0; j < lookback; j++) {
      const val = data[i - j];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    
    const range = max - min;
    if (range === 0) {
      result.push(50);
    } else {
      result.push(((data[i] - min) / range) * 100);
    }
  }
  
  return result;
}

/**
 * Calculate ATR
 */
function calculateATR(data: CandleData[], length: number): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
      continue;
    }
    
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    
    trueRanges.push(tr);
  }
  
  return calculateSMA(trueRanges, length);
}

/**
 * Detect Support/Resistance Levels
 */
function detectLevels(
  data: CandleData[],
  config: DonAltToolkitConfig,
  volatility: number[],
  normalizedVolatility: number[]
): DonAltLevel[] {
  const levels: DonAltLevel[] = [];
  const startIndex = Math.max(0, data.length - config.maxBarsBack);
  
  for (let i = startIndex; i < data.length; i++) {
    const ph = pivotHigh(data, i, config.levelsPeriod, config.levelsPeriod);
    const pl = pivotLow(data, i, config.levelsPeriod, config.levelsPeriod);
    
    const candle = data[i - config.levelsPeriod];
    if (!candle) continue;
    
    const high_ = candle.close > candle.open ? candle.close : candle.open;
    const low_ = candle.close > candle.open ? candle.open : candle.close;
    
    // Pivot high detected
    if (ph !== null && normalizedVolatility[i - config.levelsPeriod] > config.levelsFilter) {
      const price = high_;
      
      levels.push({
        index: i - config.levelsPeriod,
        price: price,
        type: 'resistance',
        color: config.levelsUpColor,
        active: true
      });
    }
    
    // Pivot low detected
    if (pl !== null && normalizedVolatility[i - config.levelsPeriod] > config.levelsFilter) {
      const price = low_;
      
      levels.push({
        index: i - config.levelsPeriod,
        price: price,
        type: 'support',
        color: config.levelsDownColor,
        active: true
      });
    }
  }
  
  // Update colors based on current price
  const currentPrice = data[data.length - 1].close;
  levels.forEach(level => {
    if (currentPrice > level.price) {
      level.color = config.levelsUpColor;
    } else {
      level.color = config.levelsDownColor;
    }
  });
  
  // Keep only the most recent 15 levels
  return levels.slice(-15);
}

/**
 * Detect Order Blocks
 */
function detectOrderBlocks(
  data: CandleData[],
  config: DonAltToolkitConfig,
  atr: number[]
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  const startIndex = Math.max(0, data.length - config.maxBarsBack);
  
  for (let i = startIndex + 5; i < data.length; i++) {
    const bearCandle = (idx: number) => data[idx].close < data[idx].open;
    const bullCandle = (idx: number) => data[idx].close > data[idx].open;
    
    const bearCandles = bearCandle(i) || bearCandle(i - 1) || bearCandle(i - 2) || bearCandle(i - 3) || bearCandle(i - 4);
    const bullCandles = bullCandle(i) || bullCandle(i - 1) || bullCandle(i - 2) || bullCandle(i - 3) || bullCandle(i - 4);
    
    // Bullish gap (Bullish Order Block)
    const isBullGap = 
      data[i - 2].high < data[i].low &&
      data[i - 2].high < data[i - 1].high &&
      data[i - 2].low < data[i].low &&
      (data[i].low - data[i - 2].high) > atr[i] * 0.5 &&
      bearCandles;
    
    // Bearish gap (Bearish Order Block)
    const isBearGap = 
      data[i - 2].low > data[i].high &&
      data[i - 2].low > data[i - 1].low &&
      data[i - 2].high > data[i].high &&
      (data[i - 2].low - data[i].high) > atr[i] * 0.5 &&
      bullCandles;
    
    if (isBullGap) {
      // Find the bearish candle
      let index = 1;
      let srcL = data[i - 1].close;
      let srcH = data[i - 1].open;
      
      for (let j = 1; j <= 4; j++) {
        if (bearCandle(i - j)) {
          index = j;
          srcL = data[i - j].close;
          srcH = data[i - j].open;
          break;
        }
      }
      
      if (srcH - srcL >= atr[i] * 0.5) {
        orderBlocks.push({
          startIndex: i - index,
          endIndex: data.length + 25,
          top: srcH,
          bottom: srcL,
          type: 'bullish',
          active: true
        });
      }
    }
    
    if (isBearGap) {
      // Find the bullish candle
      let index = 1;
      let srcL = data[i - 1].open;
      let srcH = data[i - 1].close;
      
      for (let j = 1; j <= 4; j++) {
        if (bullCandle(i - j)) {
          index = j;
          srcL = data[i - j].open;
          srcH = data[i - j].close;
          break;
        }
      }
      
      if (srcH - srcL >= atr[i] * 0.5) {
        orderBlocks.push({
          startIndex: i - index,
          endIndex: data.length + 25,
          top: srcH,
          bottom: srcL,
          type: 'bearish',
          active: true
        });
      }
    }
  }
  
  // Filter out invalidated order blocks
  const currentPrice = data[data.length - 1].close;
  const activeBlocks = orderBlocks.filter(block => {
    if (block.type === 'bullish' && currentPrice < block.bottom) {
      return false;
    }
    if (block.type === 'bearish' && currentPrice > block.top) {
      return false;
    }
    return true;
  });
  
  // Keep only the most recent 20 blocks
  return activeBlocks.slice(-20);
}

/**
 * Detect Trend Lines
 */
function detectTrendLines(
  data: CandleData[],
  config: DonAltToolkitConfig
): TrendLine[] {
  const trendLines: TrendLine[] = [];
  const startIndex = Math.max(0, data.length - config.maxBarsBack);
  
  for (let i = startIndex; i < data.length; i++) {
    const ph = pivotHigh(data, i, config.trendLinesPeriod, config.trendLinesPeriod);
    const pl = pivotLow(data, i, config.trendLinesPeriod, config.trendLinesPeriod);
    
    if (ph !== null) {
      const pivotIndex = i - config.trendLinesPeriod;
      const pivot = data[pivotIndex];
      
      if (pivotIndex > 0) {
        const prevPivot = data[pivotIndex - 1];
        const slope = (pivot.high - prevPivot.high);
        
        const extendBars = config.trendLinesExtend * 2;
        const endPrice = pivot.high + slope * extendBars;
        
        if (slope > 0) {
          trendLines.push({
            startIndex: pivotIndex - 1,
            startPrice: prevPivot.high,
            endIndex: pivotIndex + extendBars,
            endPrice: endPrice,
            type: 'bearish',
            slope: slope
          });
        }
      }
    }
    
    if (pl !== null) {
      const pivotIndex = i - config.trendLinesPeriod;
      const pivot = data[pivotIndex];
      
      if (pivotIndex > 0) {
        const prevPivot = data[pivotIndex - 1];
        const slope = (pivot.low - prevPivot.low);
        
        const extendBars = config.trendLinesExtend * 2;
        const endPrice = pivot.low + slope * extendBars;
        
        if (slope < 0) {
          trendLines.push({
            startIndex: pivotIndex - 1,
            startPrice: prevPivot.low,
            endIndex: pivotIndex + extendBars,
            endPrice: endPrice,
            type: 'bullish',
            slope: slope
          });
        }
      }
    }
  }
  
  return trendLines.slice(-5);
}

/**
 * Calculate DonAlt Toolkit
 */
export function calculateDonAltToolkit(
  data: CandleData[],
  config: DonAltToolkitConfig = defaultDonAltConfig
): DonAltToolkitResult {
  // Calculate volatility
  const ranges = data.map(d => d.high - d.low);
  const volatility = calculateSMA(ranges, 200);
  const normalizedVolatility = normalize(ranges, 200);
  
  // Calculate ATR for order blocks
  const atr = calculateATR(data, 200).map(val => val * 0.5);
  
  // Detect levels
  const levels = config.displayLevels ? detectLevels(data, config, volatility, normalizedVolatility) : [];
  
  // Detect order blocks
  const orderBlocks = config.displayOrderBlocks ? detectOrderBlocks(data, config, atr) : [];
  
  // Detect trend lines
  const trendLines = config.displayTrendLines ? detectTrendLines(data, config) : [];
  
  return {
    levels,
    orderBlocks,
    trendLines
  };
}
