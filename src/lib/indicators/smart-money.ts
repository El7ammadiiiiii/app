/**
 * Smart Money Concepts (SMC) - مفاهيم الأموال الذكية
 * 
 * Institutional-level trading concepts used by hedge funds:
 * - Order Blocks: Institutional entry zones
 * - Fair Value Gaps (FVG): Imbalance zones
 * - Break of Structure (BOS) / Change of Character (CHoCH)
 * - Liquidity Pools: Stop hunt zones
 * - Wyckoff Spring/Upthrust: Manipulation patterns
 * - Breaker Blocks: Failed order blocks that flip
 * - Volume Spread Analysis (VSA)
 */

import { OHLCV, IndicatorResult, calculateATR } from './technical';

// ==========================================================
// INTERFACES - الواجهات
// ==========================================================

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  startIndex: number;
  endIndex: number;
  high: number;
  low: number;
  midpoint: number;
  strength: number;     // 0-100 based on move strength
  mitigated: boolean;   // Has price returned and touched
  mitigationIndex?: number;
  volume: number;       // Volume at creation
  imbalanceRatio: number; // Strength of the move away
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  index: number;
  high: number;         // Top of gap
  low: number;          // Bottom of gap
  size: number;         // Gap size in price
  sizePercent: number;  // Gap size as %
  filled: boolean;
  fillPercentage: number;
  fillIndex?: number;
}

export interface StructurePoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  broken: boolean;
  breakIndex?: number;
  breakType?: 'BOS' | 'CHoCH';
}

export interface StructureBreak {
  type: 'BOS' | 'CHoCH';
  direction: 'bullish' | 'bearish';
  index: number;
  price: number;
  previousSwingIndex: number;
  previousSwingPrice: number;
  strength: number;
}

export interface LiquidityPool {
  type: 'equal_highs' | 'equal_lows' | 'swing_high' | 'swing_low';
  indices: number[];
  price: number;
  tolerance: number;
  swept: boolean;
  sweepIndex?: number;
  liquidity: number;    // Estimated stop orders
}

export interface BreakerBlock extends OrderBlock {
  originalType: 'bullish' | 'bearish';
  breakerType: 'bullish' | 'bearish';
  flipIndex: number;
}

export interface WyckoffEvent {
  type: 'spring' | 'upthrust' | 'test' | 'sign_of_strength' | 'sign_of_weakness';
  index: number;
  price: number;
  level: number;        // Support/resistance level tested
  volumeSpike: boolean;
  displacement: boolean;
  confidence: number;
}

export interface VSAResult {
  barType: 'accumulation' | 'distribution' | 'no_demand' | 'no_supply' | 'stopping_volume' | 'neutral';
  volumeSpread: 'wide' | 'narrow' | 'average';
  closePosition: 'high' | 'middle' | 'low';
  effort: number;       // Volume relative to average
  result: number;       // Price movement relative to average
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface SMCAnalysis {
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  structureBreaks: StructureBreak[];
  liquidityPools: LiquidityPool[];
  wyckoffEvents: WyckoffEvent[];
  breakerBlocks: BreakerBlock[];
  bias: 'bullish' | 'bearish' | 'neutral';
  keyLevels: number[];
}

// ==========================================================
// SWING DETECTION - اكتشاف القمم والقيعان
// ==========================================================

/**
 * Find swing highs and lows using fractal method
 */
export function findSwingPoints(
  candles: OHLCV[],
  leftBars: number = 3,
  rightBars: number = 3
): StructurePoint[] {
  const points: StructurePoint[] = [];
  
  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    
    let isSwingHigh = true;
    let isSwingLow = true;
    
    // Check left bars
    for (let j = 1; j <= leftBars; j++) {
      if (candles[i - j].high >= currentHigh) isSwingHigh = false;
      if (candles[i - j].low <= currentLow) isSwingLow = false;
    }
    
    // Check right bars
    for (let j = 1; j <= rightBars; j++) {
      if (candles[i + j].high >= currentHigh) isSwingHigh = false;
      if (candles[i + j].low <= currentLow) isSwingLow = false;
    }
    
    if (isSwingHigh) {
      points.push({
        index: i,
        price: currentHigh,
        type: 'high',
        broken: false
      });
    }
    
    if (isSwingLow) {
      points.push({
        index: i,
        price: currentLow,
        type: 'low',
        broken: false
      });
    }
  }
  
  return points.sort((a, b) => a.index - b.index);
}

// ==========================================================
// ORDER BLOCKS - كتل الأوامر
// ==========================================================

/**
 * Detect Order Blocks - Institutional Entry Zones
 * 
 * Bullish OB: Last down candle before strong up move
 * Bearish OB: Last up candle before strong down move
 * 
 * @param candles - OHLCV data
 * @param minMoveATR - Minimum move in ATR multiples (default: 1.5)
 * @param lookback - How many bars back to look (default: 100)
 */
export function detectOrderBlocks(
  candles: OHLCV[],
  minMoveATR: number = 1.5,
  lookback: number = 100
): OrderBlock[] {
  if (candles.length < 20) return [];
  
  const orderBlocks: OrderBlock[] = [];
  const atr = calculateATR(candles, 14) || 1;
  const minMove = atr * minMoveATR;
  
  const startIdx = Math.max(3, candles.length - lookback);
  
  for (let i = startIdx; i < candles.length - 3; i++) {
    const candle = candles[i];
    const isBullishCandle = candle.close > candle.open;
    const isBearishCandle = candle.close < candle.open;
    
    // Check for strong move after this candle
    let moveHigh = candle.high;
    let moveLow = candle.low;
    let maxMove = 0;
    let moveDirection: 'up' | 'down' | null = null;
    
    // Look at next 3 candles for displacement
    for (let j = 1; j <= 3 && i + j < candles.length; j++) {
      moveHigh = Math.max(moveHigh, candles[i + j].high);
      moveLow = Math.min(moveLow, candles[i + j].low);
    }
    
    const upMove = moveHigh - candle.high;
    const downMove = candle.low - moveLow;
    
    if (upMove > downMove && upMove >= minMove) {
      moveDirection = 'up';
      maxMove = upMove;
    } else if (downMove > upMove && downMove >= minMove) {
      moveDirection = 'down';
      maxMove = downMove;
    }
    
    // Bullish Order Block: bearish candle before up move
    if (isBearishCandle && moveDirection === 'up') {
      const strength = Math.min(100, (maxMove / minMove) * 50);
      
      orderBlocks.push({
        type: 'bullish',
        startIndex: i,
        endIndex: i,
        high: candle.high,
        low: candle.low,
        midpoint: (candle.high + candle.low) / 2,
        strength,
        mitigated: false,
        volume: candle.volume,
        imbalanceRatio: maxMove / atr
      });
    }
    
    // Bearish Order Block: bullish candle before down move
    if (isBullishCandle && moveDirection === 'down') {
      const strength = Math.min(100, (maxMove / minMove) * 50);
      
      orderBlocks.push({
        type: 'bearish',
        startIndex: i,
        endIndex: i,
        high: candle.high,
        low: candle.low,
        midpoint: (candle.high + candle.low) / 2,
        strength,
        mitigated: false,
        volume: candle.volume,
        imbalanceRatio: maxMove / atr
      });
    }
  }
  
  // Check for mitigation
  for (const ob of orderBlocks) {
    for (let i = ob.endIndex + 1; i < candles.length; i++) {
      if (ob.type === 'bullish') {
        // Bullish OB is mitigated when price enters the zone
        if (candles[i].low <= ob.high && candles[i].low >= ob.low) {
          ob.mitigated = true;
          ob.mitigationIndex = i;
          break;
        }
      } else {
        // Bearish OB is mitigated when price enters the zone
        if (candles[i].high >= ob.low && candles[i].high <= ob.high) {
          ob.mitigated = true;
          ob.mitigationIndex = i;
          break;
        }
      }
    }
  }
  
  return orderBlocks;
}

// ==========================================================
// FAIR VALUE GAPS - فجوات القيمة العادلة
// ==========================================================

/**
 * Detect Fair Value Gaps (Imbalances)
 * 
 * Bullish FVG: Gap between candle 1 high and candle 3 low (in uptrend)
 * Bearish FVG: Gap between candle 1 low and candle 3 high (in downtrend)
 * 
 * @param candles - OHLCV data
 * @param minGapPercent - Minimum gap size as % (default: 0.1)
 */
export function detectFairValueGaps(
  candles: OHLCV[],
  minGapPercent: number = 0.1
): FairValueGap[] {
  if (candles.length < 3) return [];
  
  const fvgs: FairValueGap[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const candle1 = candles[i - 2];
    const candle2 = candles[i - 1];
    const candle3 = candles[i];
    
    const avgPrice = (candle1.close + candle2.close + candle3.close) / 3;
    const minGap = avgPrice * (minGapPercent / 100);
    
    // Bullish FVG: candle3.low > candle1.high (gap up)
    if (candle3.low > candle1.high) {
      const gapSize = candle3.low - candle1.high;
      
      if (gapSize >= minGap) {
        fvgs.push({
          type: 'bullish',
          index: i - 1, // Middle candle index
          high: candle3.low,
          low: candle1.high,
          size: gapSize,
          sizePercent: (gapSize / avgPrice) * 100,
          filled: false,
          fillPercentage: 0
        });
      }
    }
    
    // Bearish FVG: candle3.high < candle1.low (gap down)
    if (candle3.high < candle1.low) {
      const gapSize = candle1.low - candle3.high;
      
      if (gapSize >= minGap) {
        fvgs.push({
          type: 'bearish',
          index: i - 1,
          high: candle1.low,
          low: candle3.high,
          size: gapSize,
          sizePercent: (gapSize / avgPrice) * 100,
          filled: false,
          fillPercentage: 0
        });
      }
    }
  }
  
  // Check for FVG fill
  for (const fvg of fvgs) {
    for (let i = fvg.index + 2; i < candles.length; i++) {
      if (fvg.type === 'bullish') {
        // Bullish FVG filled when price comes back down into it
        if (candles[i].low <= fvg.high) {
          const fillDepth = fvg.high - Math.max(candles[i].low, fvg.low);
          fvg.fillPercentage = Math.min(100, (fillDepth / fvg.size) * 100);
          
          if (candles[i].low <= fvg.low) {
            fvg.filled = true;
            fvg.fillIndex = i;
            break;
          }
        }
      } else {
        // Bearish FVG filled when price comes back up into it
        if (candles[i].high >= fvg.low) {
          const fillDepth = Math.min(candles[i].high, fvg.high) - fvg.low;
          fvg.fillPercentage = Math.min(100, (fillDepth / fvg.size) * 100);
          
          if (candles[i].high >= fvg.high) {
            fvg.filled = true;
            fvg.fillIndex = i;
            break;
          }
        }
      }
    }
  }
  
  return fvgs;
}

// ==========================================================
// MARKET STRUCTURE - هيكل السوق (BOS/CHoCH)
// ==========================================================

/**
 * Analyze Market Structure - BOS and CHoCH
 * 
 * BOS (Break of Structure): Continuation pattern
 * - Bullish BOS: Higher high breaks previous swing high
 * - Bearish BOS: Lower low breaks previous swing low
 * 
 * CHoCH (Change of Character): Reversal pattern
 * - Bullish CHoCH: After downtrend, swing high is broken
 * - Bearish CHoCH: After uptrend, swing low is broken
 * 
 * @param candles - OHLCV data
 * @param swingLookback - Swing point detection lookback (default: 5)
 */
export function analyzeMarketStructure(
  candles: OHLCV[],
  swingLookback: number = 5
): StructureBreak[] {
  if (candles.length < swingLookback * 3) return [];
  
  const structureBreaks: StructureBreak[] = [];
  const swingPoints = findSwingPoints(candles, swingLookback, swingLookback);
  
  // Separate highs and lows
  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');
  
  // Determine initial trend
  let currentTrend: 'up' | 'down' | 'neutral' = 'neutral';
  
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const lastTwoHighs = swingHighs.slice(-2);
    const lastTwoLows = swingLows.slice(-2);
    
    const higherHighs = lastTwoHighs[1].price > lastTwoHighs[0].price;
    const higherLows = lastTwoLows[1].price > lastTwoLows[0].price;
    const lowerHighs = lastTwoHighs[1].price < lastTwoHighs[0].price;
    const lowerLows = lastTwoLows[1].price < lastTwoLows[0].price;
    
    if (higherHighs && higherLows) currentTrend = 'up';
    else if (lowerHighs && lowerLows) currentTrend = 'down';
  }
  
  // Track structure breaks
  for (let i = swingLookback; i < candles.length; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    
    // Find most recent unbroken swing points
    const recentSwingHigh = swingHighs
      .filter(p => p.index < i && !p.broken)
      .sort((a, b) => b.index - a.index)[0];
    
    const recentSwingLow = swingLows
      .filter(p => p.index < i && !p.broken)
      .sort((a, b) => b.index - a.index)[0];
    
    // Check for break of swing high
    if (recentSwingHigh && currentHigh > recentSwingHigh.price) {
      recentSwingHigh.broken = true;
      recentSwingHigh.breakIndex = i;
      
      const breakType: 'BOS' | 'CHoCH' = currentTrend === 'down' ? 'CHoCH' : 'BOS';
      recentSwingHigh.breakType = breakType;
      
      const strength = Math.min(100, ((currentHigh - recentSwingHigh.price) / recentSwingHigh.price) * 1000);
      
      structureBreaks.push({
        type: breakType,
        direction: 'bullish',
        index: i,
        price: currentHigh,
        previousSwingIndex: recentSwingHigh.index,
        previousSwingPrice: recentSwingHigh.price,
        strength
      });
      
      if (breakType === 'CHoCH') {
        currentTrend = 'up';
      }
    }
    
    // Check for break of swing low
    if (recentSwingLow && currentLow < recentSwingLow.price) {
      recentSwingLow.broken = true;
      recentSwingLow.breakIndex = i;
      
      const breakType: 'BOS' | 'CHoCH' = currentTrend === 'up' ? 'CHoCH' : 'BOS';
      recentSwingLow.breakType = breakType;
      
      const strength = Math.min(100, ((recentSwingLow.price - currentLow) / recentSwingLow.price) * 1000);
      
      structureBreaks.push({
        type: breakType,
        direction: 'bearish',
        index: i,
        price: currentLow,
        previousSwingIndex: recentSwingLow.index,
        previousSwingPrice: recentSwingLow.price,
        strength
      });
      
      if (breakType === 'CHoCH') {
        currentTrend = 'down';
      }
    }
  }
  
  return structureBreaks;
}

// ==========================================================
// LIQUIDITY POOLS - مجمعات السيولة
// ==========================================================

/**
 * Detect Liquidity Pools - Stop Hunt Zones
 * 
 * Equal Highs: Multiple swing highs at same level (stops above)
 * Equal Lows: Multiple swing lows at same level (stops below)
 * 
 * @param candles - OHLCV data
 * @param tolerance - Price tolerance % for "equal" levels (default: 0.1)
 * @param minTouches - Minimum touches to form pool (default: 2)
 */
export function detectLiquidityPools(
  candles: OHLCV[],
  tolerance: number = 0.1,
  minTouches: number = 2
): LiquidityPool[] {
  if (candles.length < 20) return [];
  
  const pools: LiquidityPool[] = [];
  const swingPoints = findSwingPoints(candles, 3, 3);
  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');
  
  // Find equal highs
  const processedHighs: Set<number> = new Set();
  
  for (let i = 0; i < swingHighs.length; i++) {
    if (processedHighs.has(i)) continue;
    
    const basePrice = swingHighs[i].price;
    const toleranceAmount = basePrice * (tolerance / 100);
    const equalHighIndices = [swingHighs[i].index];
    
    for (let j = i + 1; j < swingHighs.length; j++) {
      if (Math.abs(swingHighs[j].price - basePrice) <= toleranceAmount) {
        equalHighIndices.push(swingHighs[j].index);
        processedHighs.add(j);
      }
    }
    
    if (equalHighIndices.length >= minTouches) {
      const avgPrice = equalHighIndices.reduce((sum, idx) => sum + candles[idx].high, 0) / equalHighIndices.length;
      
      pools.push({
        type: 'equal_highs',
        indices: equalHighIndices,
        price: avgPrice,
        tolerance: toleranceAmount,
        swept: false,
        liquidity: equalHighIndices.length * 10 // Estimated stops
      });
    }
  }
  
  // Find equal lows
  const processedLows: Set<number> = new Set();
  
  for (let i = 0; i < swingLows.length; i++) {
    if (processedLows.has(i)) continue;
    
    const basePrice = swingLows[i].price;
    const toleranceAmount = basePrice * (tolerance / 100);
    const equalLowIndices = [swingLows[i].index];
    
    for (let j = i + 1; j < swingLows.length; j++) {
      if (Math.abs(swingLows[j].price - basePrice) <= toleranceAmount) {
        equalLowIndices.push(swingLows[j].index);
        processedLows.add(j);
      }
    }
    
    if (equalLowIndices.length >= minTouches) {
      const avgPrice = equalLowIndices.reduce((sum, idx) => sum + candles[idx].low, 0) / equalLowIndices.length;
      
      pools.push({
        type: 'equal_lows',
        indices: equalLowIndices,
        price: avgPrice,
        tolerance: toleranceAmount,
        swept: false,
        liquidity: equalLowIndices.length * 10
      });
    }
  }
  
  // Check if liquidity was swept
  for (const pool of pools) {
    const lastIndex = Math.max(...pool.indices);
    
    for (let i = lastIndex + 1; i < candles.length; i++) {
      if (pool.type === 'equal_highs' && candles[i].high > pool.price) {
        pool.swept = true;
        pool.sweepIndex = i;
        break;
      }
      if (pool.type === 'equal_lows' && candles[i].low < pool.price) {
        pool.swept = true;
        pool.sweepIndex = i;
        break;
      }
    }
  }
  
  return pools;
}

// ==========================================================
// WYCKOFF ANALYSIS - تحليل وايكوف
// ==========================================================

/**
 * Detect Wyckoff Events - Spring and Upthrust
 * 
 * Spring: Price breaks below support with volume spike, then recovers (manipulation to accumulate)
 * Upthrust: Price breaks above resistance with volume spike, then rejects (manipulation to distribute)
 * 
 * @param candles - OHLCV data
 * @param volumeMultiplier - Volume spike threshold (default: 2.0)
 * @param atrMultiplier - Displacement threshold in ATR (default: 1.5)
 */
export function detectWyckoffEvents(
  candles: OHLCV[],
  volumeMultiplier: number = 2.0,
  atrMultiplier: number = 1.5
): WyckoffEvent[] {
  if (candles.length < 30) return [];
  
  const events: WyckoffEvent[] = [];
  const atr = calculateATR(candles, 14) || 1;
  const swingPoints = findSwingPoints(candles, 5, 5);
  
  // Calculate average volume
  const volumes = candles.slice(-20).map(c => c.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  // Find support and resistance levels
  const supports = swingPoints.filter(p => p.type === 'low').map(p => p.price);
  const resistances = swingPoints.filter(p => p.type === 'high').map(p => p.price);
  
  for (let i = 10; i < candles.length - 2; i++) {
    const candle = candles[i];
    const nextCandle = candles[i + 1];
    const volumeSpike = candle.volume > avgVolume * volumeMultiplier;
    
    // Check for Spring (break below support with recovery)
    for (const support of supports) {
      const tolerance = atr * 0.5;
      
      if (candle.low < support - tolerance) {
        // Price broke below support
        const recovery = nextCandle.close > support;
        const displacement = nextCandle.close - candle.low > atr * atrMultiplier;
        
        if (recovery) {
          const confidence = Math.min(100,
            30 + // Base
            (volumeSpike ? 25 : 0) +
            (displacement ? 25 : 0) +
            Math.min(20, ((support - candle.low) / atr) * 10)
          );
          
          events.push({
            type: 'spring',
            index: i,
            price: candle.low,
            level: support,
            volumeSpike,
            displacement,
            confidence
          });
          break;
        }
      }
    }
    
    // Check for Upthrust (break above resistance with rejection)
    for (const resistance of resistances) {
      const tolerance = atr * 0.5;
      
      if (candle.high > resistance + tolerance) {
        // Price broke above resistance
        const rejection = nextCandle.close < resistance;
        const displacement = candle.high - nextCandle.close > atr * atrMultiplier;
        
        if (rejection) {
          const confidence = Math.min(100,
            30 +
            (volumeSpike ? 25 : 0) +
            (displacement ? 25 : 0) +
            Math.min(20, ((candle.high - resistance) / atr) * 10)
          );
          
          events.push({
            type: 'upthrust',
            index: i,
            price: candle.high,
            level: resistance,
            volumeSpike,
            displacement,
            confidence
          });
          break;
        }
      }
    }
  }
  
  return events;
}

// ==========================================================
// LIQUIDITY SWEEP WITH DISPLACEMENT
// ==========================================================

export interface LiquiditySweep {
  type: 'bullish' | 'bearish';
  sweepIndex: number;
  sweepPrice: number;
  levelSwept: number;
  displacementBars: number;
  displacementATR: number;
  confirmed: boolean;
  strength: number;
}

/**
 * Detect Liquidity Sweeps with Displacement Confirmation
 * 
 * A valid sweep has:
 * 1. Price takes out a swing high/low
 * 2. Price immediately moves away (displacement)
 * 3. Strong candle close in opposite direction
 * 
 * @param candles - OHLCV data
 * @param displacementATR - Minimum displacement in ATR (default: 1.5)
 * @param confirmationBars - Bars for confirmation (default: 3)
 */
export function detectLiquiditySweeps(
  candles: OHLCV[],
  displacementATR: number = 1.5,
  confirmationBars: number = 3
): LiquiditySweep[] {
  if (candles.length < 30) return [];
  
  const sweeps: LiquiditySweep[] = [];
  const atr = calculateATR(candles, 14) || 1;
  const minDisplacement = atr * displacementATR;
  
  const swingPoints = findSwingPoints(candles, 5, 5);
  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');
  
  for (let i = 15; i < candles.length - confirmationBars; i++) {
    // Check for bearish sweep (takes high, reverses down)
    for (const sh of swingHighs) {
      if (sh.index >= i - 3 || sh.index < i - 50) continue;
      
      if (candles[i].high > sh.price) {
        // Swept the high - check for displacement down
        let maxDisplacement = 0;
        let confirmed = false;
        
        for (let j = 1; j <= confirmationBars; j++) {
          const displacement = candles[i].high - candles[i + j].close;
          if (displacement > maxDisplacement) maxDisplacement = displacement;
          
          if (displacement >= minDisplacement && candles[i + j].close < candles[i].open) {
            confirmed = true;
          }
        }
        
        if (maxDisplacement >= minDisplacement * 0.5) {
          sweeps.push({
            type: 'bearish',
            sweepIndex: i,
            sweepPrice: candles[i].high,
            levelSwept: sh.price,
            displacementBars: confirmationBars,
            displacementATR: maxDisplacement / atr,
            confirmed,
            strength: Math.min(100, (maxDisplacement / minDisplacement) * 50 + (confirmed ? 30 : 0))
          });
          break;
        }
      }
    }
    
    // Check for bullish sweep (takes low, reverses up)
    for (const sl of swingLows) {
      if (sl.index >= i - 3 || sl.index < i - 50) continue;
      
      if (candles[i].low < sl.price) {
        // Swept the low - check for displacement up
        let maxDisplacement = 0;
        let confirmed = false;
        
        for (let j = 1; j <= confirmationBars; j++) {
          const displacement = candles[i + j].close - candles[i].low;
          if (displacement > maxDisplacement) maxDisplacement = displacement;
          
          if (displacement >= minDisplacement && candles[i + j].close > candles[i].open) {
            confirmed = true;
          }
        }
        
        if (maxDisplacement >= minDisplacement * 0.5) {
          sweeps.push({
            type: 'bullish',
            sweepIndex: i,
            sweepPrice: candles[i].low,
            levelSwept: sl.price,
            displacementBars: confirmationBars,
            displacementATR: maxDisplacement / atr,
            confirmed,
            strength: Math.min(100, (maxDisplacement / minDisplacement) * 50 + (confirmed ? 30 : 0))
          });
          break;
        }
      }
    }
  }
  
  return sweeps;
}

// ==========================================================
// BREAKER BLOCKS - كتل الكسر
// ==========================================================

/**
 * Detect Breaker Blocks - Failed Order Blocks that Flip
 * 
 * When an order block fails and price breaks through it with displacement,
 * it becomes a breaker block acting in the opposite direction
 * 
 * @param candles - OHLCV data
 */
export function detectBreakerBlocks(candles: OHLCV[]): BreakerBlock[] {
  const orderBlocks = detectOrderBlocks(candles);
  const breakerBlocks: BreakerBlock[] = [];
  const atr = calculateATR(candles, 14) || 1;
  
  for (const ob of orderBlocks) {
    // Check for break through the order block (doesn't need to be mitigated first)
    for (let i = ob.endIndex + 5; i < candles.length; i++) {
      if (ob.type === 'bullish') {
        // Bullish OB broken down becomes bearish breaker
        if (candles[i].close < ob.low - atr * 0.2) {
          // Check for displacement (strong move)
          const bodySize = Math.abs(candles[i].close - candles[i].open);
          if (bodySize > atr * 0.3) {
            breakerBlocks.push({
              ...ob,
              mitigated: true,
              mitigationIndex: i - 1,
              originalType: 'bullish',
              breakerType: 'bearish',
              flipIndex: i
            });
            break;
          }
        }
      } else {
        // Bearish OB broken up becomes bullish breaker
        if (candles[i].close > ob.high + atr * 0.2) {
          const bodySize = Math.abs(candles[i].close - candles[i].open);
          if (bodySize > atr * 0.3) {
            breakerBlocks.push({
              ...ob,
              mitigated: true,
              mitigationIndex: i - 1,
              originalType: 'bearish',
              breakerType: 'bullish',
              flipIndex: i
            });
            break;
          }
        }
      }
    }
  }
  
  return breakerBlocks;
}

// ==========================================================
// VOLUME SPREAD ANALYSIS (VSA)
// ==========================================================

/**
 * Volume Spread Analysis - Wyckoff-based volume analysis
 * 
 * Analyzes the relationship between volume, spread (range), and close position
 * to detect institutional activity
 * 
 * @param candles - OHLCV data
 * @param lookback - Lookback for average calculations (default: 20)
 */
export function analyzeVSA(
  candles: OHLCV[],
  lookback: number = 20
): VSAResult[] {
  if (candles.length < lookback) return [];
  
  const results: VSAResult[] = [];
  
  for (let i = lookback; i < candles.length; i++) {
    const candle = candles[i];
    const spread = candle.high - candle.low;
    const body = Math.abs(candle.close - candle.open);
    
    // Calculate averages
    const recentCandles = candles.slice(i - lookback, i);
    const avgSpread = recentCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / lookback;
    const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / lookback;
    
    // Classify spread
    let volumeSpread: 'wide' | 'narrow' | 'average' = 'average';
    if (spread > avgSpread * 1.5) volumeSpread = 'wide';
    else if (spread < avgSpread * 0.5) volumeSpread = 'narrow';
    
    // Close position in range
    let closePosition: 'high' | 'middle' | 'low' = 'middle';
    if (spread > 0) {
      const closePercent = (candle.close - candle.low) / spread;
      if (closePercent > 0.7) closePosition = 'high';
      else if (closePercent < 0.3) closePosition = 'low';
    }
    
    // Effort vs Result
    const effort = candle.volume / avgVolume;
    const result = spread / avgSpread;
    
    // Classify bar type
    let barType: VSAResult['barType'] = 'neutral';
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    // High volume, wide spread, close at top = buying climax (potential top)
    // High volume, wide spread, close at bottom = selling climax (potential bottom)
    
    if (effort > 1.5 && result < 0.7) {
      // High effort, low result = absorption
      if (closePosition === 'high') {
        barType = 'accumulation';
        signal = 'bullish';
      } else if (closePosition === 'low') {
        barType = 'distribution';
        signal = 'bearish';
      }
    } else if (effort < 0.5 && result > 1.3) {
      // Low effort, high result = no resistance
      if (candle.close > candle.open) {
        barType = 'no_supply';
        signal = 'bullish';
      } else {
        barType = 'no_demand';
        signal = 'bearish';
      }
    } else if (effort > 2 && volumeSpread === 'wide') {
      // Very high volume with wide spread = stopping volume
      barType = 'stopping_volume';
      signal = closePosition === 'high' ? 'bullish' : 'bearish';
    }
    
    results.push({
      barType,
      volumeSpread,
      closePosition,
      effort,
      result,
      signal
    });
  }
  
  return results;
}

// ==========================================================
// COMPLETE SMC ANALYSIS - تحليل SMC الكامل
// ==========================================================

/**
 * Complete Smart Money Concepts Analysis
 * Combines all SMC elements for comprehensive market view
 * 
 * @param candles - OHLCV data
 */
export function analyzeSMC(candles: OHLCV[]): SMCAnalysis {
  const orderBlocks = detectOrderBlocks(candles);
  const fvgs = detectFairValueGaps(candles);
  const structureBreaks = analyzeMarketStructure(candles);
  const liquidityPools = detectLiquidityPools(candles);
  const wyckoffEvents = detectWyckoffEvents(candles);
  const breakerBlocks = detectBreakerBlocks(candles);
  
  // Determine overall bias
  let bullishScore = 0;
  let bearishScore = 0;
  
  // Recent structure breaks
  const recentBreaks = structureBreaks.slice(-3);
  for (const brk of recentBreaks) {
    if (brk.direction === 'bullish') bullishScore += brk.type === 'CHoCH' ? 2 : 1;
    else bearishScore += brk.type === 'CHoCH' ? 2 : 1;
  }
  
  // Unmitigated order blocks
  const freshOBs = orderBlocks.filter(ob => !ob.mitigated).slice(-5);
  for (const ob of freshOBs) {
    if (ob.type === 'bullish') bullishScore += 0.5;
    else bearishScore += 0.5;
  }
  
  // Unfilled FVGs
  const unfilledFVGs = fvgs.filter(fvg => !fvg.filled).slice(-3);
  for (const fvg of unfilledFVGs) {
    if (fvg.type === 'bullish') bullishScore += 0.3;
    else bearishScore += 0.3;
  }
  
  // Recent Wyckoff events
  const recentWyckoff = wyckoffEvents.slice(-2);
  for (const event of recentWyckoff) {
    if (event.type === 'spring') bullishScore += 1.5;
    else if (event.type === 'upthrust') bearishScore += 1.5;
  }
  
  // Determine bias
  let bias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (bullishScore > bearishScore * 1.3) bias = 'bullish';
  else if (bearishScore > bullishScore * 1.3) bias = 'bearish';
  
  // Collect key levels
  const keyLevels: number[] = [];
  
  for (const ob of orderBlocks.filter(o => !o.mitigated)) {
    keyLevels.push(ob.high, ob.low);
  }
  
  for (const fvg of fvgs.filter(f => !f.filled)) {
    keyLevels.push(fvg.high, fvg.low);
  }
  
  for (const pool of liquidityPools.filter(p => !p.swept)) {
    keyLevels.push(pool.price);
  }
  
  // Remove duplicates and sort
  const uniqueLevels = [...new Set(keyLevels.map(l => Math.round(l * 100) / 100))].sort((a, b) => a - b);
  
  return {
    orderBlocks,
    fvgs,
    structureBreaks,
    liquidityPools,
    wyckoffEvents,
    breakerBlocks,
    bias,
    keyLevels: uniqueLevels
  };
}

// ==========================================================
// EXPORTS
// ==========================================================

export const SmartMoneyConcepts = {
  findSwingPoints,
  detectOrderBlocks,
  detectFairValueGaps,
  analyzeMarketStructure,
  detectLiquidityPools,
  detectWyckoffEvents,
  detectLiquiditySweeps,
  detectBreakerBlocks,
  analyzeVSA,
  analyzeSMC
};

export default SmartMoneyConcepts;
