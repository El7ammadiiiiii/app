/**
 * Smart Money Concepts (SMC) - مفاهيم السيولة الذكية
 * Professional Grade Algorithms for Institutional Trading Analysis
 * خوارزميات احترافية لتحليل التداول المؤسسي
 * 
 * Based on ICT (Inner Circle Trader) Concepts
 */

export interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ============================================
// MARKET STRUCTURE - هيكل السوق
// ============================================

export interface SwingPoint {
  time: number | string;
  price: number;
  type: 'high' | 'low';
  index: number;
  strength: number; // 1-5 based on how many candles confirm it
}

export interface StructureBreak {
  time: number | string;
  price: number;
  type: 'BOS' | 'CHoCH'; // Break of Structure / Change of Character
  direction: 'bullish' | 'bearish';
  swingPoint: SwingPoint;
  strength: number;
}

/**
 * Detect Swing Highs and Swing Lows
 * كشف القمم والقيعان المتأرجحة
 */
export function detectSwingPoints(data: CandleData[], lookback: number = 3): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];
  
  if (data.length < lookback * 2 + 1) return swingPoints;
  
  for (let i = lookback; i < data.length - lookback; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    
    // Check for Swing High
    let isSwingHigh = true;
    let highStrength = 0;
    for (let j = 1; j <= lookback; j++) {
      if (data[i - j].high >= currentHigh || data[i + j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
      highStrength++;
    }
    
    if (isSwingHigh) {
      swingPoints.push({
        time: data[i].time,
        price: currentHigh,
        type: 'high',
        index: i,
        strength: Math.min(5, highStrength)
      });
    }
    
    // Check for Swing Low
    let isSwingLow = true;
    let lowStrength = 0;
    for (let j = 1; j <= lookback; j++) {
      if (data[i - j].low <= currentLow || data[i + j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
      lowStrength++;
    }
    
    if (isSwingLow) {
      swingPoints.push({
        time: data[i].time,
        price: currentLow,
        type: 'low',
        index: i,
        strength: Math.min(5, lowStrength)
      });
    }
  }
  
  return swingPoints.sort((a, b) => a.index - b.index);
}

/**
 * Detect Market Structure Breaks (BOS & CHoCH)
 * كشف كسر هيكل السوق وتغيير الشخصية
 * 
 * BOS = Break of Structure (استمرار الاتجاه)
 * CHoCH = Change of Character (تغيير الاتجاه)
 */
export function detectStructureBreaks(data: CandleData[], swingPoints: SwingPoint[]): StructureBreak[] {
  const breaks: StructureBreak[] = [];
  
  if (data.length < 20) return breaks;
  
  // If no swing points provided, generate them
  const swings = swingPoints.length >= 3 ? swingPoints : detectSwingPoints(data, 2);
  
  if (swings.length < 3) return breaks;
  
  // Separate highs and lows
  const swingHighs = swings.filter(sp => sp.type === 'high');
  const swingLows = swings.filter(sp => sp.type === 'low');
  
  // Determine initial trend
  let currentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  // Track key swing levels
  let lastSwingHigh = swingHighs.length > 0 ? swingHighs[0] : null;
  let lastSwingLow = swingLows.length > 0 ? swingLows[0] : null;
  let prevSwingHigh = swingHighs.length > 1 ? swingHighs[1] : null;
  let prevSwingLow = swingLows.length > 1 ? swingLows[1] : null;
  
  // Determine initial trend from price action
  if (data.length > 30) {
    const firstPart = data.slice(0, 15);
    const secondPart = data.slice(15, 30);
    const firstAvg = firstPart.reduce((sum, c) => sum + c.close, 0) / firstPart.length;
    const secondAvg = secondPart.reduce((sum, c) => sum + c.close, 0) / secondPart.length;
    currentTrend = secondAvg > firstAvg * 1.005 ? 'bullish' : 
                   secondAvg < firstAvg * 0.995 ? 'bearish' : 'neutral';
  }
  
  // Process each swing point for structure breaks
  for (let i = 2; i < swings.length; i++) {
    const currentSwing = swings[i];
    
    // Get previous swings of same type
    const prevSameType = swings.slice(0, i).filter(s => s.type === currentSwing.type);
    if (prevSameType.length < 2) continue;
    
    const prevSwing = prevSameType[prevSameType.length - 1];
    const prevPrevSwing = prevSameType[prevSameType.length - 2];
    
    if (currentSwing.type === 'high') {
      // Higher High - potential BOS bullish
      if (currentSwing.price > prevSwing.price) {
        if (currentTrend === 'bullish' || currentTrend === 'neutral') {
          breaks.push({
            time: data[Math.min(currentSwing.index + 1, data.length - 1)].time,
            price: prevSwing.price,
            type: 'BOS',
            direction: 'bullish',
            swingPoint: prevSwing,
            strength: currentSwing.strength
          });
          currentTrend = 'bullish';
        } else {
          // Was bearish, now making higher high - CHoCH
          breaks.push({
            time: data[Math.min(currentSwing.index + 1, data.length - 1)].time,
            price: prevSwing.price,
            type: 'CHoCH',
            direction: 'bullish',
            swingPoint: prevSwing,
            strength: currentSwing.strength
          });
          currentTrend = 'bullish';
        }
      }
      // Lower High - potential CHoCH bearish
      else if (currentSwing.price < prevSwing.price && currentTrend === 'bullish') {
        // Mark as potential weakness but not a full structure break
      }
    } else {
      // Swing Low
      // Lower Low - potential BOS bearish
      if (currentSwing.price < prevSwing.price) {
        if (currentTrend === 'bearish' || currentTrend === 'neutral') {
          breaks.push({
            time: data[Math.min(currentSwing.index + 1, data.length - 1)].time,
            price: prevSwing.price,
            type: 'BOS',
            direction: 'bearish',
            swingPoint: prevSwing,
            strength: currentSwing.strength
          });
          currentTrend = 'bearish';
        } else {
          // Was bullish, now making lower low - CHoCH
          breaks.push({
            time: data[Math.min(currentSwing.index + 1, data.length - 1)].time,
            price: prevSwing.price,
            type: 'CHoCH',
            direction: 'bearish',
            swingPoint: prevSwing,
            strength: currentSwing.strength
          });
          currentTrend = 'bearish';
        }
      }
    }
  }
  
  // Also check for candle-level breaks
  for (let i = 20; i < data.length; i++) {
    const candle = data[i];
    
    // Get relevant swings before this candle
    const relevantHighs = swingHighs.filter(sh => sh.index < i - 2 && sh.index > i - 50);
    const relevantLows = swingLows.filter(sl => sl.index < i - 2 && sl.index > i - 50);
    
    if (relevantHighs.length >= 2) {
      const lastHigh = relevantHighs[relevantHighs.length - 1];
      
      // Bullish break - Close above significant high
      if (candle.close > lastHigh.price && data[i-1].close <= lastHigh.price) {
        const exists = breaks.find(b => Math.abs(Number(b.time) - Number(candle.time)) < 3600);
        if (!exists) {
          breaks.push({
            time: candle.time,
            price: lastHigh.price,
            type: currentTrend === 'bearish' ? 'CHoCH' : 'BOS',
            direction: 'bullish',
            swingPoint: lastHigh,
            strength: lastHigh.strength
          });
          if (currentTrend === 'bearish') currentTrend = 'bullish';
        }
      }
    }
    
    if (relevantLows.length >= 2) {
      const lastLow = relevantLows[relevantLows.length - 1];
      
      // Bearish break - Close below significant low
      if (candle.close < lastLow.price && data[i-1].close >= lastLow.price) {
        const exists = breaks.find(b => Math.abs(Number(b.time) - Number(candle.time)) < 3600);
        if (!exists) {
          breaks.push({
            time: candle.time,
            price: lastLow.price,
            type: currentTrend === 'bullish' ? 'CHoCH' : 'BOS',
            direction: 'bearish',
            swingPoint: lastLow,
            strength: lastLow.strength
          });
          if (currentTrend === 'bullish') currentTrend = 'bearish';
        }
      }
    }
  }
  
  // Remove duplicates (keep unique by time and type)
  const uniqueBreaks = breaks.reduce((acc, curr) => {
    const exists = acc.find(b => 
      Math.abs(Number(b.time) - Number(curr.time)) < 7200 && b.type === curr.type
    );
    if (!exists) acc.push(curr);
    return acc;
  }, [] as StructureBreak[]);
  
  return uniqueBreaks.sort((a, b) => Number(a.time) - Number(b.time));
}

// ============================================
// ORDER BLOCKS - كتل الأوامر
// ============================================

export interface OrderBlock {
  time: number | string;
  timeEnd?: number | string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  strength: number; // 1-100
  mitigated: boolean;
  mitigationTime?: number | string;
  index: number;
}

/**
 * Detect Order Blocks (Supply/Demand Zones)
 * كشف كتل الأوامر (مناطق العرض والطلب)
 * 
 * Bullish OB: Last bearish candle before a strong bullish move
 * Bearish OB: Last bullish candle before a strong bearish move
 */
export function detectOrderBlocks(data: CandleData[], minStrength: number = 0.3): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  if (data.length < 10) return orderBlocks;
  
  // Calculate ATR for measuring move strength
  const atrPeriod = 14;
  const atrs: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    atrs.push(tr);
  }
  
  // Calculate rolling ATR
  const getATR = (index: number): number => {
    const start = Math.max(0, index - atrPeriod);
    const slice = atrs.slice(start, index);
    return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
  };
  
  for (let i = 2; i < data.length - 2; i++) {
    const current = data[i];
    const atr = getATR(i);
    
    if (atr === 0) continue;
    
    const isBearishCandle = current.close < current.open;
    const isBullishCandle = current.close > current.open;
    const candleBody = Math.abs(current.close - current.open);
    
    // Look for Bullish Order Block
    if (isBearishCandle && candleBody > atr * 0.3) {
      // Check if followed by strong bullish move
      let bullishMoveSize = 0;
      let consecutiveBullish = 0;
      
      for (let j = i + 1; j < Math.min(i + 4, data.length); j++) {
        if (data[j].close > data[j].open) {
          consecutiveBullish++;
          bullishMoveSize += data[j].close - data[j].open;
        }
      }
      
      // Strong move: at least 1 consecutive bullish candle with move > 1.5 ATR
      if (consecutiveBullish >= 1 && bullishMoveSize > atr * 1.5) {
        const strength = Math.min(100, (bullishMoveSize / atr) * 30);
        
        if (strength >= minStrength * 100) {
          // Check if order block has been mitigated
          let mitigated = false;
          let mitigationTime: number | string | undefined;
          
          for (let k = i + 1; k < data.length; k++) {
            if (data[k].low <= current.low) {
              mitigated = true;
              mitigationTime = data[k].time;
              break;
            }
          }
          
          orderBlocks.push({
            time: current.time,
            high: current.high,
            low: current.low,
            type: 'bullish',
            strength,
            mitigated,
            mitigationTime,
            index: i
          });
        }
      }
    }
    
    // Look for Bearish Order Block
    if (isBullishCandle && candleBody > atr * 0.3) {
      // Check if followed by strong bearish move
      let bearishMoveSize = 0;
      let consecutiveBearish = 0;
      
      for (let j = i + 1; j < Math.min(i + 4, data.length); j++) {
        if (data[j].close < data[j].open) {
          consecutiveBearish++;
          bearishMoveSize += data[j].open - data[j].close;
        }
      }
      
      // Strong move: at least 1 consecutive bearish candle with move > 1.5 ATR
      if (consecutiveBearish >= 1 && bearishMoveSize > atr * 1.5) {
        const strength = Math.min(100, (bearishMoveSize / atr) * 30);
        
        if (strength >= minStrength * 100) {
          // Check if order block has been mitigated
          let mitigated = false;
          let mitigationTime: number | string | undefined;
          
          for (let k = i + 1; k < data.length; k++) {
            if (data[k].high >= current.high) {
              mitigated = true;
              mitigationTime = data[k].time;
              break;
            }
          }
          
          orderBlocks.push({
            time: current.time,
            high: current.high,
            low: current.low,
            type: 'bearish',
            strength,
            mitigated,
            mitigationTime,
            index: i
          });
        }
      }
    }
  }
  
  return orderBlocks;
}

// ============================================
// FAIR VALUE GAPS (FVG) - فجوات القيمة العادلة
// ============================================

export interface FairValueGap {
  time: number | string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  size: number;
  percentSize: number;
  filled: boolean;
  fillPercentage: number;
  index: number;
}

/**
 * Detect Fair Value Gaps (Imbalances)
 * كشف فجوات القيمة العادلة (عدم التوازن)
 * 
 * Bullish FVG: Gap between candle 1's high and candle 3's low
 * Bearish FVG: Gap between candle 1's low and candle 3's high
 */
export function detectFairValueGaps(data: CandleData[], minGapPercent: number = 0.05): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  
  if (data.length < 5) return fvgs;
  
  for (let i = 2; i < data.length; i++) {
    const candle1 = data[i - 2];
    const candle2 = data[i - 1];
    const candle3 = data[i];
    
    const midPrice = (candle2.high + candle2.low) / 2;
    
    // Bullish FVG: Candle 1's high < Candle 3's low
    if (candle1.high < candle3.low) {
      const gapSize = candle3.low - candle1.high;
      const percentSize = (gapSize / midPrice) * 100;
      
      if (percentSize >= minGapPercent) {
        // Check if gap has been filled
        let filled = false;
        let fillPercentage = 0;
        
        for (let j = i + 1; j < data.length; j++) {
          if (data[j].low <= candle1.high) {
            filled = true;
            fillPercentage = 100;
            break;
          }
          // Partial fill
          const partialFill = Math.max(0, candle3.low - data[j].low);
          fillPercentage = Math.max(fillPercentage, (partialFill / gapSize) * 100);
        }
        
        fvgs.push({
          time: candle2.time,
          high: candle3.low,
          low: candle1.high,
          type: 'bullish',
          size: gapSize,
          percentSize,
          filled,
          fillPercentage,
          index: i - 1
        });
      }
    }
    
    // Bearish FVG: Candle 1's low > Candle 3's high
    if (candle1.low > candle3.high) {
      const gapSize = candle1.low - candle3.high;
      const percentSize = (gapSize / midPrice) * 100;
      
      if (percentSize >= minGapPercent) {
        // Check if gap has been filled
        let filled = false;
        let fillPercentage = 0;
        
        for (let j = i + 1; j < data.length; j++) {
          if (data[j].high >= candle1.low) {
            filled = true;
            fillPercentage = 100;
            break;
          }
          // Partial fill
          const partialFill = Math.max(0, data[j].high - candle3.high);
          fillPercentage = Math.max(fillPercentage, (partialFill / gapSize) * 100);
        }
        
        fvgs.push({
          time: candle2.time,
          high: candle1.low,
          low: candle3.high,
          type: 'bearish',
          size: gapSize,
          percentSize,
          filled,
          fillPercentage,
          index: i - 1
        });
      }
    }
  }
  
  return fvgs;
}

// ============================================
// LIQUIDITY ZONES - مناطق السيولة
// ============================================

export interface LiquidityZone {
  time: number | string;
  price: number;
  type: 'buy-side' | 'sell-side'; // Above highs = buy-side, Below lows = sell-side
  strength: number; // Number of equal highs/lows
  swept: boolean;
  sweepTime?: number | string;
  index: number;
}

/**
 * Detect Liquidity Zones (Equal Highs/Lows)
 * كشف مناطق السيولة (القمم والقيعان المتساوية)
 */
export function detectLiquidityZones(data: CandleData[], tolerance: number = 0.003): LiquidityZone[] {
  const liquidityZones: LiquidityZone[] = [];
  
  if (data.length < 15) return liquidityZones;
  
  const swingPoints = detectSwingPoints(data, 2);
  
  if (swingPoints.length < 3) return liquidityZones;
  
  const swingHighs = swingPoints.filter(sp => sp.type === 'high');
  const swingLows = swingPoints.filter(sp => sp.type === 'low');
  
  // Also check for recent highs/lows that might form liquidity pools
  // Find local maxima and minima
  for (let i = 5; i < data.length - 3; i++) {
    const candle = data[i];
    const lookback = data.slice(Math.max(0, i - 10), i);
    const lookforward = data.slice(i + 1, Math.min(i + 6, data.length));
    
    // Check for potential buy-side liquidity (highs)
    const isLocalHigh = lookback.every(c => c.high <= candle.high) && 
                        lookforward.slice(0, 3).every(c => c.high < candle.high);
    
    if (isLocalHigh) {
      // Count how many times price approached this level
      const level = candle.high;
      let touches = 1;
      
      for (let j = i + 1; j < data.length; j++) {
        if (Math.abs(data[j].high - level) / level < tolerance) {
          touches++;
        }
      }
      
      if (touches >= 1) {
        // Check if swept
        let swept = false;
        let sweepTime: number | string | undefined;
        
        for (let k = i + 1; k < data.length; k++) {
          if (data[k].high > level * 1.001) {
            swept = true;
            sweepTime = data[k].time;
            break;
          }
        }
        
        liquidityZones.push({
          time: candle.time,
          price: level,
          type: 'buy-side',
          strength: Math.min(5, touches),
          swept,
          sweepTime,
          index: i
        });
      }
    }
    
    // Check for potential sell-side liquidity (lows)
    const isLocalLow = lookback.every(c => c.low >= candle.low) &&
                       lookforward.slice(0, 3).every(c => c.low > candle.low);
    
    if (isLocalLow) {
      const level = candle.low;
      let touches = 1;
      
      for (let j = i + 1; j < data.length; j++) {
        if (Math.abs(data[j].low - level) / level < tolerance) {
          touches++;
        }
      }
      
      if (touches >= 1) {
        let swept = false;
        let sweepTime: number | string | undefined;
        
        for (let k = i + 1; k < data.length; k++) {
          if (data[k].low < level * 0.999) {
            swept = true;
            sweepTime = data[k].time;
            break;
          }
        }
        
        liquidityZones.push({
          time: candle.time,
          price: level,
          type: 'sell-side',
          strength: Math.min(5, touches),
          swept,
          sweepTime,
          index: i
        });
      }
    }
  }
  
  // Also add from swing points
  for (let i = 0; i < swingHighs.length; i++) {
    const currentHigh = swingHighs[i];
    let equalHighs = 1;
    let lastEqualIndex = currentHigh.index;
    
    for (let j = i + 1; j < swingHighs.length; j++) {
      const otherHigh = swingHighs[j];
      const priceDiff = Math.abs(currentHigh.price - otherHigh.price) / currentHigh.price;
      
      if (priceDiff <= tolerance) {
        equalHighs++;
        lastEqualIndex = Math.max(lastEqualIndex, otherHigh.index);
      }
    }
    
    if (equalHighs >= 2) {
      let swept = false;
      let sweepTime: number | string | undefined;
      
      for (let k = lastEqualIndex + 1; k < data.length; k++) {
        if (data[k].high > currentHigh.price) {
          swept = true;
          sweepTime = data[k].time;
          break;
        }
      }
      
      // Avoid duplicates
      const exists = liquidityZones.find(lz => Math.abs(lz.price - currentHigh.price) / currentHigh.price < 0.001);
      if (!exists) {
        liquidityZones.push({
          time: currentHigh.time,
          price: currentHigh.price,
          type: 'buy-side',
          strength: equalHighs,
          swept,
          sweepTime,
          index: currentHigh.index
        });
      }
    }
  }
  
  for (let i = 0; i < swingLows.length; i++) {
    const currentLow = swingLows[i];
    let equalLows = 1;
    let lastEqualIndex = currentLow.index;
    
    for (let j = i + 1; j < swingLows.length; j++) {
      const otherLow = swingLows[j];
      const priceDiff = Math.abs(currentLow.price - otherLow.price) / currentLow.price;
      
      if (priceDiff <= tolerance) {
        equalLows++;
        lastEqualIndex = Math.max(lastEqualIndex, otherLow.index);
      }
    }
    
    if (equalLows >= 2) {
      let swept = false;
      let sweepTime: number | string | undefined;
      
      for (let k = lastEqualIndex + 1; k < data.length; k++) {
        if (data[k].low < currentLow.price) {
          swept = true;
          sweepTime = data[k].time;
          break;
        }
      }
      
      const exists = liquidityZones.find(lz => Math.abs(lz.price - currentLow.price) / currentLow.price < 0.001);
      if (!exists) {
        liquidityZones.push({
          time: currentLow.time,
          price: currentLow.price,
          type: 'sell-side',
          strength: equalLows,
          swept,
          sweepTime,
          index: currentLow.index
        });
      }
    }
  }
  
  return liquidityZones.slice(-20); // Return last 20
}

// ============================================
// BREAKER BLOCKS - كتل الكسر
// ============================================

export interface BreakerBlock {
  time: number | string;
  high: number;
  low: number;
  type: 'bullish' | 'bearish';
  originalOrderBlock: OrderBlock;
  breakTime: number | string;
  strength: number;
  index: number;
}

/**
 * Detect Breaker Blocks (Failed Order Blocks)
 * كشف كتل الكسر (كتل الأوامر الفاشلة التي تحولت)
 * 
 * Bullish Breaker: Bearish OB that got violated and now acts as support
 * Bearish Breaker: Bullish OB that got violated and now acts as resistance
 */
export function detectBreakerBlocks(data: CandleData[], orderBlocks: OrderBlock[]): BreakerBlock[] {
  const breakerBlocks: BreakerBlock[] = [];
  
  for (const ob of orderBlocks) {
    if (!ob.mitigated) continue;
    
    const mitigationIndex = data.findIndex(d => d.time === ob.mitigationTime);
    if (mitigationIndex === -1) continue;
    
    // Check if price returned to the OB zone and respected it
    let respectCount = 0;
    
    for (let i = mitigationIndex + 1; i < data.length; i++) {
      if (ob.type === 'bullish') {
        // Failed bullish OB becomes bearish breaker
        // Check if price returned to zone and rejected
        if (data[i].high >= ob.low && data[i].high <= ob.high) {
          if (data[i].close < data[i].open) {
            respectCount++;
          }
        }
      } else {
        // Failed bearish OB becomes bullish breaker
        // Check if price returned to zone and rejected
        if (data[i].low >= ob.low && data[i].low <= ob.high) {
          if (data[i].close > data[i].open) {
            respectCount++;
          }
        }
      }
    }
    
    if (respectCount >= 1) {
      breakerBlocks.push({
        time: ob.time,
        high: ob.high,
        low: ob.low,
        type: ob.type === 'bullish' ? 'bearish' : 'bullish', // Flipped
        originalOrderBlock: ob,
        breakTime: ob.mitigationTime!,
        strength: Math.min(100, respectCount * 30 + ob.strength / 2),
        index: ob.index
      });
    }
  }
  
  return breakerBlocks;
}

// ============================================
// WYCKOFF EVENTS - أحداث وايكوف
// ============================================

export interface WyckoffEvent {
  time: number | string;
  type: 
    | 'PS' // Preliminary Support
    | 'SC' // Selling Climax
    | 'AR' // Automatic Rally
    | 'ST' // Secondary Test
    | 'SPRING' // Spring (False breakdown)
    | 'TEST' // Test of Spring
    | 'SOS' // Sign of Strength
    | 'LPS' // Last Point of Support
    | 'BU' // Back-up
    | 'PSY' // Preliminary Supply
    | 'BC' // Buying Climax
    | 'AR_D' // Automatic Reaction (Distribution)
    | 'ST_D' // Secondary Test (Distribution)
    | 'UTAD' // Upthrust After Distribution
    | 'LPSY' // Last Point of Supply
    | 'SOW'; // Sign of Weakness
  price: number;
  phase: 'accumulation' | 'distribution' | 'markup' | 'markdown';
  description: string;
  strength: number;
  index: number;
}

/**
 * Detect Wyckoff Events
 * كشف أحداث وايكوف لتحليل دورات السوق
 */
export function detectWyckoffEvents(data: CandleData[]): WyckoffEvent[] {
  const events: WyckoffEvent[] = [];
  
  if (data.length < 30) return events;
  
  const swingPoints = detectSwingPoints(data, 3);
  
  if (swingPoints.length < 4) return events;
  
  // Calculate volume profile
  const volumes = data.map(d => d.volume || 0);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length || 1;
  
  // Analyze price action for Wyckoff patterns
  for (let i = 10; i < data.length - 3; i++) {
    const candle = data[i];
    const prevCandles = data.slice(Math.max(0, i - 10), i);
    const volume = candle.volume || avgVolume;
    
    const spread = candle.high - candle.low;
    const avgSpread = prevCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / prevCandles.length;
    const highVolume = volume > avgVolume * 1.3;
    const veryHighVolume = volume > avgVolume * 1.8;
    const wideSpread = spread > avgSpread * 1.3;
    
    // Find local high/low
    const localHigh = Math.max(...prevCandles.map(c => c.high));
    const localLow = Math.min(...prevCandles.map(c => c.low));
    
    // Selling Climax (SC): Low with very high volume and wide spread
    if (candle.low <= localLow && veryHighVolume && wideSpread && candle.close > candle.low + spread * 0.3) {
      events.push({
        time: candle.time,
        type: 'SC',
        price: candle.low,
        phase: 'accumulation',
        description: 'Selling Climax - ذروة البيع: حجم عالي مع انتشار واسع وإغلاق من القاع',
        strength: Math.min(100, (volume / avgVolume) * 40),
        index: i
      });
    }
    
    // Buying Climax (BC): High with very high volume and wide spread
    if (candle.high >= localHigh && veryHighVolume && wideSpread && candle.close < candle.high - spread * 0.3) {
      events.push({
        time: candle.time,
        type: 'BC',
        price: candle.high,
        phase: 'distribution',
        description: 'Buying Climax - ذروة الشراء: حجم عالي مع انتشار واسع وإغلاق من القمة',
        strength: Math.min(100, (volume / avgVolume) * 40),
        index: i
      });
    }
    
    // Spring: Quick breakdown below support then recovery
    if (candle.low < localLow && candle.close > localLow) {
      const nextCandles = data.slice(i + 1, Math.min(i + 4, data.length));
      const recovers = nextCandles.some(c => c.close > localLow + (localHigh - localLow) * 0.3);
      
      if (recovers) {
        events.push({
          time: candle.time,
          type: 'SPRING',
          price: candle.low,
          phase: 'accumulation',
          description: 'Spring - النابض: اختراق وهمي للدعم مع تعافي سريع',
          strength: 75,
          index: i
        });
      }
    }
    
    // UTAD: Quick breakout above resistance then rejection
    if (candle.high > localHigh && candle.close < localHigh) {
      const nextCandles = data.slice(i + 1, Math.min(i + 4, data.length));
      const rejects = nextCandles.some(c => c.close < localHigh - (localHigh - localLow) * 0.3);
      
      if (rejects) {
        events.push({
          time: candle.time,
          type: 'UTAD',
          price: candle.high,
          phase: 'distribution',
          description: 'UTAD - اختراق وهمي للمقاومة مع هبوط سريع',
          strength: 75,
          index: i
        });
      }
    }
    
    // Sign of Strength (SOS): Strong bullish move on high volume
    if (highVolume && candle.close > candle.open && candle.close > localHigh * 0.95) {
      const bullishMove = candle.close - candle.open;
      if (bullishMove > avgSpread * 1.2) {
        events.push({
          time: candle.time,
          type: 'SOS',
          price: candle.close,
          phase: 'markup',
          description: 'Sign of Strength - علامة القوة: حركة صعودية قوية مع حجم',
          strength: Math.min(100, (bullishMove / avgSpread) * 50),
          index: i
        });
      }
    }
    
    // Sign of Weakness (SOW): Strong bearish move on high volume
    if (highVolume && candle.close < candle.open && candle.close < localLow * 1.05) {
      const bearishMove = candle.open - candle.close;
      if (bearishMove > avgSpread * 1.2) {
        events.push({
          time: candle.time,
          type: 'SOW',
          price: candle.close,
          phase: 'markdown',
          description: 'Sign of Weakness - علامة الضعف: حركة هبوطية قوية مع حجم',
          strength: Math.min(100, (bearishMove / avgSpread) * 50),
          index: i
        });
      }
    }
    
    // Last Point of Support (LPS)
    if (candle.low > localLow && candle.low < localLow + (localHigh - localLow) * 0.3) {
      const nextCandles = data.slice(i + 1, Math.min(i + 5, data.length));
      const breaksUp = nextCandles.some(c => c.close > localHigh);
      
      if (breaksUp && volume < avgVolume * 1.2) {
        events.push({
          time: candle.time,
          type: 'LPS',
          price: candle.low,
          phase: 'accumulation',
          description: 'Last Point of Support - آخر نقطة دعم قبل الارتفاع',
          strength: 70,
          index: i
        });
      }
    }
    
    // Last Point of Supply (LPSY)
    if (candle.high < localHigh && candle.high > localHigh - (localHigh - localLow) * 0.3) {
      const nextCandles = data.slice(i + 1, Math.min(i + 5, data.length));
      const breaksDown = nextCandles.some(c => c.close < localLow);
      
      if (breaksDown && volume < avgVolume * 1.2) {
        events.push({
          time: candle.time,
          type: 'LPSY',
          price: candle.high,
          phase: 'distribution',
          description: 'Last Point of Supply - آخر نقطة عرض قبل الهبوط',
          strength: 70,
          index: i
        });
      }
    }
  }
  
  // Remove duplicates and limit results
  const uniqueEvents = events.reduce((acc, curr) => {
    const exists = acc.find(e => Math.abs(e.index - curr.index) < 3 && e.type === curr.type);
    if (!exists) acc.push(curr);
    return acc;
  }, [] as WyckoffEvent[]);
  
  return uniqueEvents.slice(-20); // Return last 20 events
}

// ============================================
// COMPREHENSIVE SMC ANALYSIS
// ============================================

export interface SMCAnalysis {
  swingPoints: SwingPoint[];
  structureBreaks: StructureBreak[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityZones: LiquidityZone[];
  breakerBlocks: BreakerBlock[];
  wyckoffEvents: WyckoffEvent[];
  marketBias: 'bullish' | 'bearish' | 'neutral';
  trendStrength: number;
}

/**
 * Comprehensive Smart Money Concepts Analysis
 * تحليل شامل لمفاهيم السيولة الذكية
 */
export function analyzeSMC(data: CandleData[]): SMCAnalysis {
  // Detect all components
  const swingPoints = detectSwingPoints(data);
  const structureBreaks = detectStructureBreaks(data, swingPoints);
  const orderBlocks = detectOrderBlocks(data);
  const fairValueGaps = detectFairValueGaps(data);
  const liquidityZones = detectLiquidityZones(data);
  const breakerBlocks = detectBreakerBlocks(data, orderBlocks);
  const wyckoffEvents = detectWyckoffEvents(data);
  
  // Determine market bias
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // Recent structure breaks
  const recentBreaks = structureBreaks.slice(-5);
  recentBreaks.forEach(b => {
    if (b.direction === 'bullish') bullishSignals += b.type === 'CHoCH' ? 2 : 1;
    else bearishSignals += b.type === 'CHoCH' ? 2 : 1;
  });
  
  // Active order blocks
  const activeOBs = orderBlocks.filter(ob => !ob.mitigated);
  activeOBs.forEach(ob => {
    if (ob.type === 'bullish') bullishSignals++;
    else bearishSignals++;
  });
  
  // Unfilled FVGs
  const unfilledFVGs = fairValueGaps.filter(fvg => !fvg.filled);
  unfilledFVGs.forEach(fvg => {
    if (fvg.type === 'bullish') bullishSignals++;
    else bearishSignals++;
  });
  
  const totalSignals = bullishSignals + bearishSignals;
  const marketBias: 'bullish' | 'bearish' | 'neutral' = 
    bullishSignals > bearishSignals * 1.5 ? 'bullish' :
    bearishSignals > bullishSignals * 1.5 ? 'bearish' : 'neutral';
  
  const trendStrength = totalSignals > 0 
    ? Math.abs(bullishSignals - bearishSignals) / totalSignals * 100 
    : 0;
  
  return {
    swingPoints,
    structureBreaks,
    orderBlocks,
    fairValueGaps,
    liquidityZones,
    breakerBlocks,
    wyckoffEvents,
    marketBias,
    trendStrength
  };
}

export default {
  detectSwingPoints,
  detectStructureBreaks,
  detectOrderBlocks,
  detectFairValueGaps,
  detectLiquidityZones,
  detectBreakerBlocks,
  detectWyckoffEvents,
  analyzeSMC
};
