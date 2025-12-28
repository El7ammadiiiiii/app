/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SIGNAL CONFIRMATION ENGINE - محرك تأكيد الإشارات
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نظام ذكي لتأكيد صحة الإشارات وكشف الفخاخ
 * 
 * المميزات:
 * ✅ تحليل الدايفرجنس (RSI, MACD, OBV)
 * ✅ تأكيد الحجم والسيولة
 * ✅ كشف مناطق Smart Money
 * ✅ تحليل Order Flow
 * ✅ تصنيف: إشارة حقيقية ✅ / تحتاج تأكيد ⚠️ / فخ ❌
 */

import type { DetectedPattern, OHLCVData, SignalConfirmation } from './index';

// ============================================
// TYPES
// ============================================

export interface DivergenceSignal {
  type: "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish";
  indicator: string;
  strength: number;
  startIndex: number;
  endIndex: number;
  pricePoints: { index: number; price: number }[];
  indicatorPoints: { index: number; value: number }[];
  description: string;
  descriptionAr: string;
}

export interface VolumeAnalysis {
  trend: "accumulation" | "distribution" | "neutral";
  strength: number;
  volumeSpike: boolean;
  spikeMultiplier: number;
  averageVolume: number;
  currentVolume: number;
  description: string;
  descriptionAr: string;
}

export interface SmartMoneyAnalysis {
  orderBlocks: {
    type: "bullish" | "bearish";
    startIndex: number;
    endIndex: number;
    highPrice: number;
    lowPrice: number;
    strength: number;
    tested: boolean;
  }[];
  liquidityPools: {
    price: number;
    type: "buy_side" | "sell_side";
    strength: number;
  }[];
  fairValueGaps: {
    type: "bullish" | "bearish";
    startIndex: number;
    highPrice: number;
    lowPrice: number;
    filled: boolean;
    fillPercent: number;
  }[];
  breaksOfStructure: {
    type: "bullish" | "bearish";
    index: number;
    price: number;
    isSignificant: boolean;
  }[];
}

export interface MarketStructure {
  trend: "uptrend" | "downtrend" | "ranging";
  strength: number;
  higherHighs: number;
  higherLows: number;
  lowerHighs: number;
  lowerLows: number;
  swingPoints: { index: number; price: number; type: "high" | "low" }[];
}

export interface ConfirmationResult {
  isConfirmed: boolean;
  status: "real" | "needs_confirmation" | "trap";
  overallScore: number; // 0-100
  
  divergences: DivergenceSignal[];
  volumeAnalysis: VolumeAnalysis;
  smartMoney: SmartMoneyAnalysis;
  marketStructure: MarketStructure;
  
  confirmations: SignalConfirmation[];
  warnings: string[];
  warningsAr: string[];
  
  finalVerdict: string;
  finalVerdictAr: string;
}

// ============================================
// INDICATOR CALCULATIONS
// ============================================

function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }
    
    const change = closes[i] - closes[i - 1];
    
    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        rsi.push(50);
      }
    } else {
      const prevGain = gains / period;
      const prevLoss = losses / period;
      
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? -change : 0;
      
      gains = prevGain * (period - 1) + currentGain;
      losses = prevLoss * (period - 1) + currentLoss;
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateMACD(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  const macd: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macd.push(ema12[i] - ema26[i]);
  }
  
  const signal = calculateEMA(macd, 9);
  const histogram: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macd[i] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
    ema.push(sum / (i + 1));
  }
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    const value = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema.push(value);
  }
  
  return ema;
}

function calculateOBV(closes: number[], volumes: number[]): number[] {
  const obv: number[] = [0];
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  
  return obv;
}

// ============================================
// DIVERGENCE DETECTION
// ============================================

function findPivotPoints(data: number[], lookback: number = 5): { index: number; value: number; type: "high" | "low" }[] {
  const pivots: { index: number; value: number; type: "high" | "low" }[] = [];
  
  for (let i = lookback; i < data.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (data[i - j] >= data[i] || data[i + j] >= data[i]) isHigh = false;
      if (data[i - j] <= data[i] || data[i + j] <= data[i]) isLow = false;
    }
    
    if (isHigh) pivots.push({ index: i, value: data[i], type: "high" });
    if (isLow) pivots.push({ index: i, value: data[i], type: "low" });
  }
  
  return pivots.sort((a, b) => a.index - b.index);
}

export function detectDivergences(data: OHLCVData): DivergenceSignal[] {
  const { close, high, low } = data;
  const divergences: DivergenceSignal[] = [];
  
  // Calculate indicators
  const rsi = calculateRSI(close);
  const { macd } = calculateMACD(close);
  const obv = calculateOBV(close, data.volume);
  
  // Find price pivots
  const priceHighPivots = findPivotPoints(high, 3).filter(p => p.type === "high");
  const priceLowPivots = findPivotPoints(low, 3).filter(p => p.type === "low");
  
  // RSI Divergences
  const rsiPivots = findPivotPoints(rsi, 3);
  
  // Check for bullish divergence (price makes lower low, RSI makes higher low)
  for (let i = 1; i < priceLowPivots.length; i++) {
    const prevLow = priceLowPivots[i - 1];
    const currLow = priceLowPivots[i];
    
    if (currLow.value < prevLow.value) {
      // Price made lower low, check RSI
      const rsiAtPrev = rsi[prevLow.index];
      const rsiAtCurr = rsi[currLow.index];
      
      if (rsiAtCurr > rsiAtPrev) {
        const strength = Math.min(100, Math.abs(currLow.value - prevLow.value) / prevLow.value * 1000);
        divergences.push({
          type: "bullish",
          indicator: "RSI",
          strength,
          startIndex: prevLow.index,
          endIndex: currLow.index,
          pricePoints: [
            { index: prevLow.index, price: prevLow.value },
            { index: currLow.index, price: currLow.value },
          ],
          indicatorPoints: [
            { index: prevLow.index, value: rsiAtPrev },
            { index: currLow.index, value: rsiAtCurr },
          ],
          description: "Bullish RSI Divergence: Price lower low, RSI higher low",
          descriptionAr: "دايفرجنس صعودي RSI: السعر قاع أدنى، RSI قاع أعلى",
        });
      }
    }
  }
  
  // Check for bearish divergence (price makes higher high, RSI makes lower high)
  for (let i = 1; i < priceHighPivots.length; i++) {
    const prevHigh = priceHighPivots[i - 1];
    const currHigh = priceHighPivots[i];
    
    if (currHigh.value > prevHigh.value) {
      const rsiAtPrev = rsi[prevHigh.index];
      const rsiAtCurr = rsi[currHigh.index];
      
      if (rsiAtCurr < rsiAtPrev) {
        const strength = Math.min(100, Math.abs(currHigh.value - prevHigh.value) / prevHigh.value * 1000);
        divergences.push({
          type: "bearish",
          indicator: "RSI",
          strength,
          startIndex: prevHigh.index,
          endIndex: currHigh.index,
          pricePoints: [
            { index: prevHigh.index, price: prevHigh.value },
            { index: currHigh.index, price: currHigh.value },
          ],
          indicatorPoints: [
            { index: prevHigh.index, value: rsiAtPrev },
            { index: currHigh.index, value: rsiAtCurr },
          ],
          description: "Bearish RSI Divergence: Price higher high, RSI lower high",
          descriptionAr: "دايفرجنس هبوطي RSI: السعر قمة أعلى، RSI قمة أدنى",
        });
      }
    }
  }
  
  // Hidden bullish divergence (price makes higher low, RSI makes lower low)
  for (let i = 1; i < priceLowPivots.length; i++) {
    const prevLow = priceLowPivots[i - 1];
    const currLow = priceLowPivots[i];
    
    if (currLow.value > prevLow.value) {
      const rsiAtPrev = rsi[prevLow.index];
      const rsiAtCurr = rsi[currLow.index];
      
      if (rsiAtCurr < rsiAtPrev) {
        divergences.push({
          type: "hidden_bullish",
          indicator: "RSI",
          strength: 75,
          startIndex: prevLow.index,
          endIndex: currLow.index,
          pricePoints: [
            { index: prevLow.index, price: prevLow.value },
            { index: currLow.index, price: currLow.value },
          ],
          indicatorPoints: [
            { index: prevLow.index, value: rsiAtPrev },
            { index: currLow.index, value: rsiAtCurr },
          ],
          description: "Hidden Bullish Divergence - Trend continuation signal",
          descriptionAr: "دايفرجنس صعودي مخفي - إشارة استمرار الاتجاه",
        });
      }
    }
  }
  
  return divergences;
}

// ============================================
// VOLUME ANALYSIS
// ============================================

export function analyzeVolume(data: OHLCVData): VolumeAnalysis {
  const { close, volume } = data;
  const lookback = 20;
  
  // Calculate average volume
  const recentVolumes = volume.slice(-lookback);
  const averageVolume = recentVolumes.reduce((a, b) => a + b, 0) / lookback;
  const currentVolume = volume[volume.length - 1];
  
  // Check for volume spike
  const spikeMultiplier = currentVolume / averageVolume;
  const volumeSpike = spikeMultiplier > 2;
  
  // Calculate OBV trend
  const obv = calculateOBV(close, volume);
  const obvSlope = (obv[obv.length - 1] - obv[obv.length - 10]) / 10;
  const priceSlope = (close[close.length - 1] - close[close.length - 10]) / 10;
  
  // Determine trend
  let trend: "accumulation" | "distribution" | "neutral" = "neutral";
  let strength = 50;
  let description = "Volume is neutral";
  let descriptionAr = "الحجم محايد";
  
  if (obvSlope > 0 && priceSlope > 0) {
    trend = "accumulation";
    strength = Math.min(100, 50 + spikeMultiplier * 20);
    description = "Accumulation phase - buying pressure";
    descriptionAr = "مرحلة تجميع - ضغط شرائي";
  } else if (obvSlope < 0 && priceSlope < 0) {
    trend = "distribution";
    strength = Math.min(100, 50 + spikeMultiplier * 20);
    description = "Distribution phase - selling pressure";
    descriptionAr = "مرحلة توزيع - ضغط بيعي";
  } else if (obvSlope > 0 && priceSlope < 0) {
    trend = "accumulation";
    strength = 70;
    description = "Hidden accumulation - smart money buying";
    descriptionAr = "تجميع مخفي - الأموال الذكية تشتري";
  } else if (obvSlope < 0 && priceSlope > 0) {
    trend = "distribution";
    strength = 70;
    description = "Hidden distribution - smart money selling";
    descriptionAr = "توزيع مخفي - الأموال الذكية تبيع";
  }
  
  return {
    trend,
    strength,
    volumeSpike,
    spikeMultiplier,
    averageVolume,
    currentVolume,
    description,
    descriptionAr,
  };
}

// ============================================
// SMART MONEY CONCEPTS
// ============================================

export function analyzeSmartMoney(data: OHLCVData): SmartMoneyAnalysis {
  const { open, high, low, close } = data;
  
  const orderBlocks: SmartMoneyAnalysis["orderBlocks"] = [];
  const liquidityPools: SmartMoneyAnalysis["liquidityPools"] = [];
  const fairValueGaps: SmartMoneyAnalysis["fairValueGaps"] = [];
  const breaksOfStructure: SmartMoneyAnalysis["breaksOfStructure"] = [];
  
  // Find Order Blocks (last down candle before up move / last up candle before down move)
  for (let i = 2; i < close.length - 2; i++) {
    const prevCandle = { open: open[i - 1], close: close[i - 1], high: high[i - 1], low: low[i - 1] };
    const currCandle = { open: open[i], close: close[i], high: high[i], low: low[i] };
    const nextCandle = { open: open[i + 1], close: close[i + 1], high: high[i + 1], low: low[i + 1] };
    
    // Bullish Order Block: bearish candle followed by strong bullish move
    if (currCandle.close < currCandle.open && 
        nextCandle.close > nextCandle.open && 
        nextCandle.close > currCandle.high) {
      orderBlocks.push({
        type: "bullish",
        startIndex: i,
        endIndex: i,
        highPrice: currCandle.high,
        lowPrice: currCandle.low,
        strength: 80,
        tested: false,
      });
    }
    
    // Bearish Order Block: bullish candle followed by strong bearish move
    if (currCandle.close > currCandle.open && 
        nextCandle.close < nextCandle.open && 
        nextCandle.close < currCandle.low) {
      orderBlocks.push({
        type: "bearish",
        startIndex: i,
        endIndex: i,
        highPrice: currCandle.high,
        lowPrice: currCandle.low,
        strength: 80,
        tested: false,
      });
    }
  }
  
  // Find Fair Value Gaps (imbalance)
  for (let i = 2; i < close.length; i++) {
    // Bullish FVG: Gap up (high of candle 1 < low of candle 3)
    if (high[i - 2] < low[i]) {
      fairValueGaps.push({
        type: "bullish",
        startIndex: i - 1,
        highPrice: low[i],
        lowPrice: high[i - 2],
        filled: false,
        fillPercent: 0,
      });
    }
    
    // Bearish FVG: Gap down (low of candle 1 > high of candle 3)
    if (low[i - 2] > high[i]) {
      fairValueGaps.push({
        type: "bearish",
        startIndex: i - 1,
        highPrice: low[i - 2],
        lowPrice: high[i],
        filled: false,
        fillPercent: 0,
      });
    }
  }
  
  // Find Liquidity Pools (clusters of equal highs/lows)
  const tolerance = 0.002; // 0.2%
  
  // Buy-side liquidity (equal highs)
  for (let i = 0; i < high.length - 1; i++) {
    for (let j = i + 1; j < high.length; j++) {
      if (Math.abs(high[i] - high[j]) / high[i] < tolerance) {
        liquidityPools.push({
          price: (high[i] + high[j]) / 2,
          type: "buy_side",
          strength: 70,
        });
      }
    }
  }
  
  // Sell-side liquidity (equal lows)
  for (let i = 0; i < low.length - 1; i++) {
    for (let j = i + 1; j < low.length; j++) {
      if (Math.abs(low[i] - low[j]) / low[i] < tolerance) {
        liquidityPools.push({
          price: (low[i] + low[j]) / 2,
          type: "sell_side",
          strength: 70,
        });
      }
    }
  }
  
  // Find Breaks of Structure
  const pivots = findPivotPoints(close, 3);
  for (let i = 2; i < pivots.length; i++) {
    if (pivots[i].type === "high" && pivots[i - 2].type === "high") {
      if (pivots[i].value > pivots[i - 2].value) {
        breaksOfStructure.push({
          type: "bullish",
          index: pivots[i].index,
          price: pivots[i].value,
          isSignificant: true,
        });
      }
    }
    if (pivots[i].type === "low" && pivots[i - 2].type === "low") {
      if (pivots[i].value < pivots[i - 2].value) {
        breaksOfStructure.push({
          type: "bearish",
          index: pivots[i].index,
          price: pivots[i].value,
          isSignificant: true,
        });
      }
    }
  }
  
  return {
    orderBlocks: orderBlocks.slice(-10), // Keep last 10
    liquidityPools: liquidityPools.slice(-10),
    fairValueGaps: fairValueGaps.slice(-10),
    breaksOfStructure: breaksOfStructure.slice(-10),
  };
}

// ============================================
// MARKET STRUCTURE ANALYSIS
// ============================================

export function analyzeMarketStructure(data: OHLCVData): MarketStructure {
  const { high, low, close } = data;
  
  const pivots = findPivotPoints(close, 5);
  const highPivots = pivots.filter(p => p.type === "high");
  const lowPivots = pivots.filter(p => p.type === "low");
  
  let higherHighs = 0;
  let higherLows = 0;
  let lowerHighs = 0;
  let lowerLows = 0;
  
  // Count structure
  for (let i = 1; i < highPivots.length; i++) {
    if (highPivots[i].value > highPivots[i - 1].value) higherHighs++;
    else lowerHighs++;
  }
  
  for (let i = 1; i < lowPivots.length; i++) {
    if (lowPivots[i].value > lowPivots[i - 1].value) higherLows++;
    else lowerLows++;
  }
  
  // Determine trend
  let trend: "uptrend" | "downtrend" | "ranging" = "ranging";
  let strength = 50;
  
  if (higherHighs >= 2 && higherLows >= 2 && lowerHighs <= 1 && lowerLows <= 1) {
    trend = "uptrend";
    strength = Math.min(100, 60 + (higherHighs + higherLows) * 5);
  } else if (lowerHighs >= 2 && lowerLows >= 2 && higherHighs <= 1 && higherLows <= 1) {
    trend = "downtrend";
    strength = Math.min(100, 60 + (lowerHighs + lowerLows) * 5);
  }
  
  return {
    trend,
    strength,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    swingPoints: pivots.slice(-20).map(p => ({
      index: p.index,
      price: p.value,
      type: p.type,
    })),
  };
}

// ============================================
// MAIN CONFIRMATION FUNCTION
// ============================================

export function confirmSignal(
  pattern: DetectedPattern,
  data: OHLCVData
): ConfirmationResult {
  const divergences = detectDivergences(data);
  const volumeAnalysis = analyzeVolume(data);
  const smartMoney = analyzeSmartMoney(data);
  const marketStructure = analyzeMarketStructure(data);
  
  const confirmations: SignalConfirmation[] = [];
  const warnings: string[] = [];
  const warningsAr: string[] = [];
  let score = 50;
  
  // 1. Check divergence alignment
  const bullishDivergences = divergences.filter(d => d.type === "bullish" || d.type === "hidden_bullish");
  const bearishDivergences = divergences.filter(d => d.type === "bearish" || d.type === "hidden_bearish");
  
  if (pattern.type === "bullish" && bullishDivergences.length > 0) {
    score += 15;
    confirmations.push({
      indicator: "Divergence",
      signal: "confirms",
      strength: 85,
      description: `${bullishDivergences.length} bullish divergence(s) support this pattern`,
      descriptionAr: `${bullishDivergences.length} دايفرجنس صعودي يدعم هذا النمط`,
    });
  } else if (pattern.type === "bearish" && bearishDivergences.length > 0) {
    score += 15;
    confirmations.push({
      indicator: "Divergence",
      signal: "confirms",
      strength: 85,
      description: `${bearishDivergences.length} bearish divergence(s) support this pattern`,
      descriptionAr: `${bearishDivergences.length} دايفرجنس هبوطي يدعم هذا النمط`,
    });
  } else if (pattern.type === "bullish" && bearishDivergences.length > 0) {
    score -= 10;
    warnings.push("Bearish divergence contradicts bullish pattern");
    warningsAr.push("دايفرجنس هبوطي يتعارض مع النمط الصعودي");
  } else if (pattern.type === "bearish" && bullishDivergences.length > 0) {
    score -= 10;
    warnings.push("Bullish divergence contradicts bearish pattern");
    warningsAr.push("دايفرجنس صعودي يتعارض مع النمط الهبوطي");
  }
  
  // 2. Check volume confirmation
  if (volumeAnalysis.volumeSpike) {
    score += 10;
    confirmations.push({
      indicator: "Volume",
      signal: "confirms",
      strength: 80,
      description: `Volume spike ${volumeAnalysis.spikeMultiplier.toFixed(1)}x average`,
      descriptionAr: `ارتفاع الحجم ${volumeAnalysis.spikeMultiplier.toFixed(1)} مرة من المتوسط`,
    });
  }
  
  if (pattern.type === "bullish" && volumeAnalysis.trend === "accumulation") {
    score += 10;
    confirmations.push({
      indicator: "Volume Trend",
      signal: "confirms",
      strength: 75,
      description: "Accumulation supports bullish pattern",
      descriptionAr: "التجميع يدعم النمط الصعودي",
    });
  } else if (pattern.type === "bearish" && volumeAnalysis.trend === "distribution") {
    score += 10;
    confirmations.push({
      indicator: "Volume Trend",
      signal: "confirms",
      strength: 75,
      description: "Distribution supports bearish pattern",
      descriptionAr: "التوزيع يدعم النمط الهبوطي",
    });
  } else if (pattern.type === "bullish" && volumeAnalysis.trend === "distribution") {
    score -= 15;
    warnings.push("TRAP WARNING: Distribution during bullish pattern");
    warningsAr.push("تحذير فخ: توزيع أثناء نمط صعودي");
  } else if (pattern.type === "bearish" && volumeAnalysis.trend === "accumulation") {
    score -= 15;
    warnings.push("TRAP WARNING: Accumulation during bearish pattern");
    warningsAr.push("تحذير فخ: تجميع أثناء نمط هبوطي");
  }
  
  // 3. Check market structure alignment
  if (pattern.type === "bullish" && marketStructure.trend === "uptrend") {
    score += 10;
    confirmations.push({
      indicator: "Market Structure",
      signal: "confirms",
      strength: 85,
      description: "Bullish pattern aligned with uptrend",
      descriptionAr: "النمط الصعودي متوافق مع الاتجاه الصاعد",
    });
  } else if (pattern.type === "bearish" && marketStructure.trend === "downtrend") {
    score += 10;
    confirmations.push({
      indicator: "Market Structure",
      signal: "confirms",
      strength: 85,
      description: "Bearish pattern aligned with downtrend",
      descriptionAr: "النمط الهبوطي متوافق مع الاتجاه الهابط",
    });
  } else if (pattern.type === "bullish" && marketStructure.trend === "downtrend") {
    // Counter-trend - could be reversal or trap
    warnings.push("Counter-trend signal - higher risk");
    warningsAr.push("إشارة عكس الاتجاه - مخاطرة أعلى");
  }
  
  // 4. Check Smart Money concepts
  const recentOrderBlocks = smartMoney.orderBlocks.filter(ob => 
    ob.type === (pattern.type === "bullish" ? "bullish" : "bearish")
  );
  
  if (recentOrderBlocks.length > 0) {
    score += 10;
    confirmations.push({
      indicator: "Order Blocks",
      signal: "confirms",
      strength: 80,
      description: `${recentOrderBlocks.length} ${pattern.type} order block(s) nearby`,
      descriptionAr: `${recentOrderBlocks.length} أوردر بلوك ${pattern.type === "bullish" ? "صعودي" : "هبوطي"} قريب`,
    });
  }
  
  // Check for liquidity traps
  const nearbyLiquidity = smartMoney.liquidityPools.filter(lp => {
    const price = pattern.tradeSetup.entry;
    return Math.abs(lp.price - price) / price < 0.01; // Within 1%
  });
  
  if (nearbyLiquidity.length > 0) {
    warnings.push(`Liquidity pool at ${nearbyLiquidity[0].price.toFixed(2)} - possible stop hunt`);
    warningsAr.push(`تجمع سيولة عند ${nearbyLiquidity[0].price.toFixed(2)} - احتمال اصطياد الستوبات`);
  }
  
  // Determine status
  let status: "real" | "needs_confirmation" | "trap" = "needs_confirmation";
  let finalVerdict = "";
  let finalVerdictAr = "";
  
  if (score >= 75) {
    status = "real";
    finalVerdict = `✅ CONFIRMED: Strong ${pattern.type} signal with ${confirmations.length} confirmations`;
    finalVerdictAr = `✅ مؤكد: إشارة ${pattern.type === "bullish" ? "صعودية" : "هبوطية"} قوية مع ${confirmations.length} تأكيدات`;
  } else if (score >= 50 && warnings.length <= 1) {
    status = "needs_confirmation";
    finalVerdict = `⚠️ NEEDS CONFIRMATION: ${pattern.type} signal requires additional confirmation`;
    finalVerdictAr = `⚠️ تحتاج تأكيد: الإشارة ${pattern.type === "bullish" ? "الصعودية" : "الهبوطية"} تحتاج تأكيد إضافي`;
  } else {
    status = "trap";
    finalVerdict = `❌ TRAP WARNING: High probability this is a false signal`;
    finalVerdictAr = `❌ تحذير فخ: احتمال عالي أن هذه إشارة وهمية`;
  }
  
  return {
    isConfirmed: status === "real",
    status,
    overallScore: Math.max(0, Math.min(100, score)),
    divergences,
    volumeAnalysis,
    smartMoney,
    marketStructure,
    confirmations,
    warnings,
    warningsAr,
    finalVerdict,
    finalVerdictAr,
  };
}
