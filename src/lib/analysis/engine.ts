/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTERNAL ANALYSIS ENGINE - DO NOT EXPOSE
 * محرك التحليل الداخلي - لا تعرضه للمستخدمين
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Elite Trend Imports - REMOVED
import { 
  calculateSignalConfidence, 
  getMultiTimeframeAgreement,
  getPredictionQuality,
  getConfidenceLevelDisplay,
  ConfidenceBreakdown,
  type MarketRegime,
  type EliteTrendResult
} from '../indicators/prediction-confidence';
import { 
  recordPrediction, 
  getAccuracyStats,
  getAdaptiveWeights 
} from './accuracy-tracker';
import { 
  detectChartPatterns as detectAdvancedPatterns, 
  type OHLCV as PatternOHLCV,
  type DetectedPattern,
  type TrendDirection
} from '../indicators/chart-patterns';
import {
  detectHeadAndShoulders,
  detectDoubleTopBottom,
  detectTripleTopBottom,
  detectCupAndHandle,
  detectRectangle
} from '../indicators/missing-patterns';

// Types for internal use
export interface OHLCVData {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  timestamp: number[];
}

export interface TimeframeData {
  timeframe: string;
  data: OHLCVData;
}

export interface TrendStrength {
  bullishScore: number;
  bearishScore: number;
  trend: "bullish" | "bearish" | "neutral";
  strength: number;
  confidence: number;
}

export interface PriceLevel {
  price: number;
  type: "support" | "resistance";
  strength: number;
  touches: number;
}

export interface TrendLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  type: "ascending" | "descending";
  strength: number;
}

export interface ChartPattern {
  name: string;
  nameAr: string;
  type: "bullish" | "bearish" | "neutral";
  startIndex: number;
  endIndex: number;
  confidence: number;
  priceTarget?: number;
  stopLoss?: number;
  description: string;
}

export interface HarmonicPattern {
  name: string;
  type: "bullish" | "bearish";
  points: { x: number; price: number }[];
  prz: { min: number; max: number }; // Potential Reversal Zone
  targets: number[];
  stopLoss: number;
  confidence: number;
}

export interface SignalStrength {
  buySignals: {
    indicator: string;
    strength: number;
    description: string;
  }[];
  sellSignals: {
    indicator: string;
    strength: number;
    description: string;
  }[];
  overallBuyStrength: number;
  overallSellStrength: number;
}

export interface TradeSetup {
  direction: "long" | "short" | "neutral";
  entry: number;
  stopLoss: number;
  targets: number[];
  riskReward: number;
  confidence: number;
  reasoning: string[];
}

export interface FullAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: number;
  trendStrength: TrendStrength;
  priceLevels: PriceLevel[];
  trendLines: TrendLine[];
  patterns: ChartPattern[];
  harmonics: HarmonicPattern[];
  signals: SignalStrength;
  tradeSetup: TradeSetup;
  
  // Elite Trend Analysis (New) - REMOVED
  confidence?: ConfidenceBreakdown;
  predictionQuality?: {
    isHighConfidence: boolean;
    isPremiumSignal: boolean;
    shouldTrade: boolean;
    reasons: string[];
    reasonsAr: string[];
  };
}

// ============================================
// INDICATOR CALCULATIONS
// ============================================

export function calculateRSI(closes: number[], period: number = 14): number[] {
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
      else losses += Math.abs(change);
      
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        rsi.push(50);
      }
    } else {
      const prevAvgGain = rsi.length > 0 ? (100 - rsi[rsi.length - 1]) === 0 ? 0 : 
        (rsi[rsi.length - 1] * (period - 1)) / (100 - rsi[rsi.length - 1]) / period : 0;
      
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      const avgGain = (prevAvgGain * (period - 1) + gain) / period;
      const avgLoss = losses > 0 ? (losses / period * (period - 1) + loss) / period : loss / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
      
      losses = avgLoss * period;
    }
  }

  return rsi;
}

export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i]);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i]);
    } else if (i < period) {
      const sum = data.slice(0, i + 1).reduce((a, b) => a + b, 0);
      ema.push(sum / (i + 1));
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  
  return ema;
}

export function calculateMACD(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  
  return { macd, signal, histogram };
}

export function calculateStochRSI(closes: number[], period: number = 14): { k: number[]; d: number[] } {
  const rsi = calculateRSI(closes, period);
  const k: number[] = [];
  
  for (let i = 0; i < rsi.length; i++) {
    if (i < period - 1) {
      k.push(50);
    } else {
      const rsiSlice = rsi.slice(i - period + 1, i + 1);
      const minRsi = Math.min(...rsiSlice);
      const maxRsi = Math.max(...rsiSlice);
      
      if (maxRsi === minRsi) {
        k.push(50);
      } else {
        k.push(((rsi[i] - minRsi) / (maxRsi - minRsi)) * 100);
      }
    }
  }
  
  const d = calculateSMA(k, 3);
  
  return { k, d };
}

export function calculateATR(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const atr: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      atr.push(high[i] - low[i]);
    } else {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      );
      
      if (i < period) {
        atr.push(tr);
      } else {
        atr.push((atr[i - 1] * (period - 1) + tr) / period);
      }
    }
  }
  
  return atr;
}

export function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i]);
      lower.push(closes[i]);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const avg = middle[i];
      const squaredDiffs = slice.map(v => Math.pow(v - avg, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const std = Math.sqrt(variance);
      
      upper.push(avg + stdDev * std);
      lower.push(avg - stdDev * std);
    }
  }
  
  return { upper, middle, lower };
}

export function calculateOBV(closes: number[], volumes: number[]): number[] {
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

export function calculateADX(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const adx: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      plusDM.push(0);
      minusDM.push(0);
      tr.push(high[i] - low[i]);
    } else {
      const upMove = high[i] - high[i - 1];
      const downMove = low[i - 1] - low[i];
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      tr.push(Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      ));
    }
  }
  
  const smoothedTR = calculateEMA(tr, period);
  const smoothedPlusDM = calculateEMA(plusDM, period);
  const smoothedMinusDM = calculateEMA(minusDM, period);
  
  const plusDI = smoothedPlusDM.map((v, i) => smoothedTR[i] === 0 ? 0 : (v / smoothedTR[i]) * 100);
  const minusDI = smoothedMinusDM.map((v, i) => smoothedTR[i] === 0 ? 0 : (v / smoothedTR[i]) * 100);
  
  const dx = plusDI.map((v, i) => {
    const sum = v + minusDI[i];
    return sum === 0 ? 0 : (Math.abs(v - minusDI[i]) / sum) * 100;
  });
  
  return calculateEMA(dx, period);
}

// ============================================
// PATTERN DETECTION
// ============================================

export function detectSupportResistance(data: OHLCVData, lookback: number = 50): PriceLevel[] {
  const levels: PriceLevel[] = [];
  const { high, low, close } = data;
  const length = close.length;
  
  if (length < lookback) return levels;
  
  const recentHigh = high.slice(-lookback);
  const recentLow = low.slice(-lookback);
  const recentClose = close.slice(-lookback);
  
  // Find swing highs and lows
  for (let i = 2; i < lookback - 2; i++) {
    // Swing High (Resistance)
    if (recentHigh[i] > recentHigh[i - 1] && 
        recentHigh[i] > recentHigh[i - 2] &&
        recentHigh[i] > recentHigh[i + 1] && 
        recentHigh[i] > recentHigh[i + 2]) {
      
      const existingLevel = levels.find(l => 
        l.type === "resistance" && 
        Math.abs(l.price - recentHigh[i]) / recentHigh[i] < 0.005
      );
      
      if (existingLevel) {
        existingLevel.touches++;
        existingLevel.strength = Math.min(existingLevel.strength + 0.1, 1);
      } else {
        levels.push({
          price: recentHigh[i],
          type: "resistance",
          strength: 0.5,
          touches: 1
        });
      }
    }
    
    // Swing Low (Support)
    if (recentLow[i] < recentLow[i - 1] && 
        recentLow[i] < recentLow[i - 2] &&
        recentLow[i] < recentLow[i + 1] && 
        recentLow[i] < recentLow[i + 2]) {
      
      const existingLevel = levels.find(l => 
        l.type === "support" && 
        Math.abs(l.price - recentLow[i]) / recentLow[i] < 0.005
      );
      
      if (existingLevel) {
        existingLevel.touches++;
        existingLevel.strength = Math.min(existingLevel.strength + 0.1, 1);
      } else {
        levels.push({
          price: recentLow[i],
          type: "support",
          strength: 0.5,
          touches: 1
        });
      }
    }
  }
  
  // Sort by strength
  return levels.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

export function detectTrendLines(data: OHLCVData, lookback: number = 50): TrendLine[] {
  const lines: TrendLine[] = [];
  const { high, low, close } = data;
  const length = close.length;
  
  if (length < lookback) return lines;
  
  const startIdx = length - lookback;
  
  // Find ascending trendlines (connecting lows)
  const swingLows: { idx: number; price: number }[] = [];
  for (let i = startIdx + 2; i < length - 2; i++) {
    if (low[i] < low[i - 1] && low[i] < low[i - 2] &&
        low[i] < low[i + 1] && low[i] < low[i + 2]) {
      swingLows.push({ idx: i - startIdx, price: low[i] });
    }
  }
  
  // Connect swing lows to form ascending trendlines
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      if (swingLows[j].price > swingLows[i].price) {
        lines.push({
          startIndex: swingLows[i].idx,
          endIndex: swingLows[j].idx,
          startPrice: swingLows[i].price,
          endPrice: swingLows[j].price,
          type: "ascending",
          strength: 0.5 + (j - i) * 0.1
        });
      }
    }
  }
  
  // Find descending trendlines (connecting highs)
  const swingHighs: { idx: number; price: number }[] = [];
  for (let i = startIdx + 2; i < length - 2; i++) {
    if (high[i] > high[i - 1] && high[i] > high[i - 2] &&
        high[i] > high[i + 1] && high[i] > high[i + 2]) {
      swingHighs.push({ idx: i - startIdx, price: high[i] });
    }
  }
  
  // Connect swing highs to form descending trendlines
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      if (swingHighs[j].price < swingHighs[i].price) {
        lines.push({
          startIndex: swingHighs[i].idx,
          endIndex: swingHighs[j].idx,
          startPrice: swingHighs[i].price,
          endPrice: swingHighs[j].price,
          type: "descending",
          strength: 0.5 + (j - i) * 0.1
        });
      }
    }
  }
  
  return lines.sort((a, b) => b.strength - a.strength).slice(0, 6);
}

// Old detectChartPatterns removed - replaced by advanced engine integration

export function detectHarmonicPatterns(data: OHLCVData): HarmonicPattern[] {
  const patterns: HarmonicPattern[] = [];
  const { high, low, close } = data;
  const length = close.length;
  
  if (length < 100) return patterns;
  
  // Find swing points
  const swings: { idx: number; price: number; type: "high" | "low" }[] = [];
  
  for (let i = 5; i < length - 5; i++) {
    // Swing High
    if (high[i] === Math.max(...high.slice(i - 5, i + 6))) {
      swings.push({ idx: i, price: high[i], type: "high" });
    }
    // Swing Low
    if (low[i] === Math.min(...low.slice(i - 5, i + 6))) {
      swings.push({ idx: i, price: low[i], type: "low" });
    }
  }
  
  // Look for XABCD patterns in last 5 swings
  if (swings.length >= 5) {
    const lastSwings = swings.slice(-5);
    const [X, A, B, C, D] = lastSwings;
    
    if (X && A && B && C && D) {
      const XA = Math.abs(A.price - X.price);
      const AB = Math.abs(B.price - A.price);
      const BC = Math.abs(C.price - B.price);
      const CD = Math.abs(D.price - C.price);
      
      // Gartley Pattern (AB = 0.618 XA, BC = 0.382-0.886 AB, CD = 1.272-1.618 BC)
      const abRatio = AB / XA;
      const bcRatio = BC / AB;
      const cdRatio = CD / BC;
      
      if (abRatio >= 0.55 && abRatio <= 0.70 && 
          bcRatio >= 0.35 && bcRatio <= 0.90 &&
          cdRatio >= 1.2 && cdRatio <= 1.7) {
        
        const isBullish = D.type === "low";
        const prz = isBullish ? 
          { min: D.price * 0.98, max: D.price * 1.02 } :
          { min: D.price * 0.98, max: D.price * 1.02 };
        
        patterns.push({
          name: "Gartley",
          type: isBullish ? "bullish" : "bearish",
          points: [
            { x: X.idx, price: X.price },
            { x: A.idx, price: A.price },
            { x: B.idx, price: B.price },
            { x: C.idx, price: C.price },
            { x: D.idx, price: D.price }
          ],
          prz,
          targets: isBullish ? 
            [D.price * 1.05, D.price * 1.10, D.price * 1.15] :
            [D.price * 0.95, D.price * 0.90, D.price * 0.85],
          stopLoss: isBullish ? D.price * 0.95 : D.price * 1.05,
          confidence: 0.7
        });
      }
      
      // Butterfly Pattern (AB = 0.786 XA)
      if (abRatio >= 0.75 && abRatio <= 0.82) {
        const isBullish = D.type === "low";
        
        patterns.push({
          name: "Butterfly",
          type: isBullish ? "bullish" : "bearish",
          points: [
            { x: X.idx, price: X.price },
            { x: A.idx, price: A.price },
            { x: B.idx, price: B.price },
            { x: C.idx, price: C.price },
            { x: D.idx, price: D.price }
          ],
          prz: { min: D.price * 0.97, max: D.price * 1.03 },
          targets: isBullish ? 
            [D.price * 1.06, D.price * 1.12, D.price * 1.20] :
            [D.price * 0.94, D.price * 0.88, D.price * 0.80],
          stopLoss: isBullish ? D.price * 0.93 : D.price * 1.07,
          confidence: 0.65
        });
      }
      
      // Bat Pattern (AB = 0.382-0.50 XA)
      if (abRatio >= 0.36 && abRatio <= 0.52) {
        const isBullish = D.type === "low";
        
        patterns.push({
          name: "Bat",
          type: isBullish ? "bullish" : "bearish",
          points: [
            { x: X.idx, price: X.price },
            { x: A.idx, price: A.price },
            { x: B.idx, price: B.price },
            { x: C.idx, price: C.price },
            { x: D.idx, price: D.price }
          ],
          prz: { min: D.price * 0.98, max: D.price * 1.02 },
          targets: isBullish ? 
            [D.price * 1.04, D.price * 1.08, D.price * 1.13] :
            [D.price * 0.96, D.price * 0.92, D.price * 0.87],
          stopLoss: isBullish ? D.price * 0.96 : D.price * 1.04,
          confidence: 0.68
        });
      }
    }
  }
  
  return patterns;
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeTimeframe(data: OHLCVData, symbol: string, timeframe: string): FullAnalysis {
  const { open, high, low, close, volume, timestamp } = data;
  const length = close.length;
  
  if (length < 50) {
    return createEmptyAnalysis(symbol, timeframe);
  }
  
  // Calculate all indicators
  const rsi = calculateRSI(close);
  const { macd, signal: macdSignal, histogram } = calculateMACD(close);
  const { k: stochK, d: stochD } = calculateStochRSI(close);
  const atr = calculateATR(high, low, close);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calculateBollingerBands(close);
  const obv = calculateOBV(close, volume);
  const adx = calculateADX(high, low, close);
  const sma20 = calculateSMA(close, 20);
  const sma50 = calculateSMA(close, 50);
  const ema9 = calculateEMA(close, 9);
  const ema21 = calculateEMA(close, 21);
  
  const currentPrice = close[length - 1];
  const currentRsi = rsi[length - 1];
  const currentMacd = macd[length - 1];
  const currentMacdSignal = macdSignal[length - 1];
  const currentStochK = stochK[length - 1];
  const currentAtr = atr[length - 1];
  const currentAdx = adx[length - 1];
  
  // Calculate trend strength
  let bullishPoints = 0;
  let bearishPoints = 0;
  
  // RSI
  if (currentRsi < 30) bullishPoints += 15;
  else if (currentRsi < 40) bullishPoints += 8;
  else if (currentRsi > 70) bearishPoints += 15;
  else if (currentRsi > 60) bearishPoints += 8;
  
  // MACD
  if (currentMacd > currentMacdSignal) bullishPoints += 12;
  else bearishPoints += 12;
  if (histogram[length - 1] > histogram[length - 2]) bullishPoints += 5;
  else bearishPoints += 5;
  
  // Stochastic RSI
  if (currentStochK < 20) bullishPoints += 10;
  else if (currentStochK > 80) bearishPoints += 10;
  
  // Moving Averages
  if (currentPrice > sma20[length - 1]) bullishPoints += 8;
  else bearishPoints += 8;
  if (currentPrice > sma50[length - 1]) bullishPoints += 8;
  else bearishPoints += 8;
  if (ema9[length - 1] > ema21[length - 1]) bullishPoints += 6;
  else bearishPoints += 6;
  
  // Bollinger Bands
  if (currentPrice < bbLower[length - 1]) bullishPoints += 10;
  else if (currentPrice > bbUpper[length - 1]) bearishPoints += 10;
  
  // OBV trend
  const obvTrend = obv[length - 1] - obv[length - 10];
  if (obvTrend > 0) bullishPoints += 8;
  else bearishPoints += 8;
  
  // ADX (trend strength, not direction)
  const trendStrengthMultiplier = currentAdx > 25 ? 1.2 : currentAdx > 15 ? 1 : 0.8;
  
  const totalPoints = bullishPoints + bearishPoints;
  const bullishScore = Math.round((bullishPoints / totalPoints) * 100 * trendStrengthMultiplier);
  const bearishScore = 100 - bullishScore;
  
  const trendStrength: TrendStrength = {
    bullishScore: Math.min(bullishScore, 100),
    bearishScore: Math.min(bearishScore, 100),
    trend: bullishScore > 60 ? "bullish" : bearishScore > 60 ? "bearish" : "neutral",
    strength: Math.abs(bullishScore - 50) / 50,
    confidence: (currentAdx / 100) * (totalPoints / 82)
  };
  
  // Detect patterns and levels
  const priceLevels = detectSupportResistance(data);
  const trendLines = detectTrendLines(data);
  
  // Convert to OHLCV[] for advanced pattern detection
  const ohlcvList: PatternOHLCV[] = timestamp.map((t, i) => ({
    timestamp: t,
    open: open[i],
    high: high[i],
    low: low[i],
    close: close[i],
    volume: volume[i]
  }));

  // Detect patterns using advanced engine
  const advancedPatterns = detectAdvancedPatterns(ohlcvList);
  
  // Detect classic patterns (H&S, Double Top, etc.)
  const hsPatterns = detectHeadAndShoulders(ohlcvList);
  const doublePatterns = detectDoubleTopBottom(ohlcvList);
  const triplePatterns = detectTripleTopBottom(ohlcvList);
  const cupPatterns = detectCupAndHandle(ohlcvList);
  const rectanglePatterns = detectRectangle(ohlcvList);
  
  // Map to ChartPattern interface
  const patterns: ChartPattern[] = [
    ...advancedPatterns.map(p => ({
      name: p.name,
      nameAr: p.nameAr,
      type: (p.breakoutDirection === 'up' ? 'bullish' : p.breakoutDirection === 'down' ? 'bearish' : 'neutral') as "bullish" | "bearish" | "neutral",
      startIndex: p.startIdx,
      endIndex: p.endIdx,
      confidence: p.confidence / 100, // Convert 0-100 to 0-1
      priceTarget: p.targetPrice || undefined,
      stopLoss: undefined,
      description: p.description
    })),
    ...hsPatterns.map(p => ({
      name: p.type === 'head_and_shoulders' ? 'Head and Shoulders' : 'Inverse Head and Shoulders',
      nameAr: p.type === 'head_and_shoulders' ? 'رأس وكتفين' : 'رأس وكتفين معكوس',
      type: (p.breakoutDirection === 'up' ? 'bullish' : 'bearish') as "bullish" | "bearish",
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      confidence: p.confidence / 100,
      priceTarget: p.targetPrice,
      stopLoss: undefined,
      description: 'نمط انعكاسي كلاسيكي'
    })),
    ...doublePatterns.map(p => ({
      name: p.type === 'double_top' ? 'Double Top' : 'Double Bottom',
      nameAr: p.type === 'double_top' ? 'قمة مزدوجة' : 'قاع مزدوج',
      type: (p.breakoutDirection === 'up' ? 'bullish' : 'bearish') as "bullish" | "bearish",
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      confidence: p.confidence / 100,
      priceTarget: p.targetPrice,
      stopLoss: undefined,
      description: 'نمط انعكاسي قوي'
    })),
    ...triplePatterns.map(p => ({
      name: p.type === 'triple_top' ? 'Triple Top' : 'Triple Bottom',
      nameAr: p.type === 'triple_top' ? 'قمة ثلاثية' : 'قاع ثلاثي',
      type: (p.breakoutDirection === 'up' ? 'bullish' : 'bearish') as "bullish" | "bearish",
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      confidence: p.confidence / 100,
      priceTarget: p.targetPrice,
      stopLoss: undefined,
      description: 'نمط انعكاسي نادر'
    })),
    ...cupPatterns.map(p => ({
      name: p.type === 'cup_and_handle' ? 'Cup and Handle' : 'Inverted Cup and Handle',
      nameAr: p.type === 'cup_and_handle' ? 'كوب وعروة' : 'كوب وعروة معكوس',
      type: (p.breakoutDirection === 'up' ? 'bullish' : 'bearish') as "bullish" | "bearish",
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      confidence: p.confidence / 100,
      priceTarget: p.targetPrice,
      stopLoss: undefined,
      description: 'نمط استمراري قوي'
    })),
    ...rectanglePatterns.map(p => ({
      name: 'Rectangle',
      nameAr: 'مستطيل',
      type: (p.breakoutDirection === 'up' ? 'bullish' : 'bearish') as "bullish" | "bearish",
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      confidence: p.confidence / 100,
      priceTarget: p.targetPrice,
      stopLoss: undefined,
      description: 'نمط تجميع/تصريف'
    }))
  ];

  const harmonics = detectHarmonicPatterns(data);
  
  // Generate signals
  const buySignals: SignalStrength["buySignals"] = [];
  const sellSignals: SignalStrength["sellSignals"] = [];
  
  if (currentRsi < 30) {
    buySignals.push({ indicator: "RSI", strength: 0.8, description: "منطقة تشبع بيعي" });
  } else if (currentRsi > 70) {
    sellSignals.push({ indicator: "RSI", strength: 0.8, description: "منطقة تشبع شرائي" });
  }
  
  if (currentMacd > currentMacdSignal && macd[length - 2] <= macdSignal[length - 2]) {
    buySignals.push({ indicator: "MACD", strength: 0.75, description: "تقاطع إيجابي" });
  } else if (currentMacd < currentMacdSignal && macd[length - 2] >= macdSignal[length - 2]) {
    sellSignals.push({ indicator: "MACD", strength: 0.75, description: "تقاطع سلبي" });
  }
  
  if (currentStochK < 20 && stochK[length - 2] < stochD[length - 2] && currentStochK > stochD[length - 1]) {
    buySignals.push({ indicator: "Stoch RSI", strength: 0.7, description: "تقاطع من منطقة تشبع" });
  } else if (currentStochK > 80 && stochK[length - 2] > stochD[length - 2] && currentStochK < stochD[length - 1]) {
    sellSignals.push({ indicator: "Stoch RSI", strength: 0.7, description: "تقاطع من منطقة تشبع" });
  }
  
  if (currentPrice < bbLower[length - 1]) {
    buySignals.push({ indicator: "Bollinger", strength: 0.65, description: "السعر تحت الحد السفلي" });
  } else if (currentPrice > bbUpper[length - 1]) {
    sellSignals.push({ indicator: "Bollinger", strength: 0.65, description: "السعر فوق الحد العلوي" });
  }
  
  // Support/Resistance signals
  const nearestSupport = priceLevels.find(l => l.type === "support" && l.price < currentPrice);
  const nearestResistance = priceLevels.find(l => l.type === "resistance" && l.price > currentPrice);
  
  if (nearestSupport && (currentPrice - nearestSupport.price) / currentPrice < 0.01) {
    buySignals.push({ 
      indicator: "Support", 
      strength: nearestSupport.strength, 
      description: `اختبار دعم عند ${nearestSupport.price.toFixed(2)}` 
    });
  }
  
  if (nearestResistance && (nearestResistance.price - currentPrice) / currentPrice < 0.01) {
    sellSignals.push({ 
      indicator: "Resistance", 
      strength: nearestResistance.strength, 
      description: `اختبار مقاومة عند ${nearestResistance.price.toFixed(2)}` 
    });
  }
  
  // Volume signal
  const avgVolume = volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
  if (volume[length - 1] > avgVolume * 1.5) {
    if (close[length - 1] > open[length - 1]) {
      buySignals.push({ indicator: "Volume", strength: 0.6, description: "حجم تداول عالي مع شمعة صاعدة" });
    } else {
      sellSignals.push({ indicator: "Volume", strength: 0.6, description: "حجم تداول عالي مع شمعة هابطة" });
    }
  }
  
  const overallBuyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(buySignals.length, 1);
  const overallSellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(sellSignals.length, 1);
  
  const signals: SignalStrength = {
    buySignals,
    sellSignals,
    overallBuyStrength,
    overallSellStrength
  };
  
  // Generate trade setup
  const direction = bullishScore > 60 ? "long" : bearishScore > 60 ? "short" : "neutral";
  const entry = currentPrice;
  const stopLoss = direction === "long" ? 
    (nearestSupport?.price || currentPrice - currentAtr * 2) :
    (nearestResistance?.price || currentPrice + currentAtr * 2);
  
  const riskAmount = Math.abs(entry - stopLoss);
  const targets = direction === "long" ?
    [entry + riskAmount * 1.5, entry + riskAmount * 2.5, entry + riskAmount * 4] :
    [entry - riskAmount * 1.5, entry - riskAmount * 2.5, entry - riskAmount * 4];
  
  const tradeSetup: TradeSetup = {
    direction,
    entry,
    stopLoss,
    targets,
    riskReward: 2.5,
    confidence: trendStrength.confidence * (direction !== "neutral" ? 1 : 0.5),
    reasoning: [
      `RSI: ${currentRsi.toFixed(1)}`,
      `ADX: ${currentAdx.toFixed(1)}`,
      `Trend: ${trendStrength.trend}`,
      `Buy Signals: ${buySignals.length}`,
      `Sell Signals: ${sellSignals.length}`
    ]
  };
  
  // ============================================
  // ELITE TREND ANALYSIS - REMOVED
  // ============================================
  
  let confidence: ConfidenceBreakdown | undefined;
  let predictionQuality: FullAnalysis['predictionQuality'] | undefined;

  return {
    symbol,
    timeframe,
    timestamp: timestamp[length - 1] || Date.now(),
    trendStrength,
    priceLevels,
    trendLines,
    patterns,
    harmonics,
    signals,
    tradeSetup,
    confidence,
    predictionQuality
  };
}

function createEmptyAnalysis(symbol: string, timeframe: string): FullAnalysis {
  return {
    symbol,
    timeframe,
    timestamp: Date.now(),
    trendStrength: {
      bullishScore: 50,
      bearishScore: 50,
      trend: "neutral",
      strength: 0,
      confidence: 0
    },
    priceLevels: [],
    trendLines: [],
    patterns: [],
    harmonics: [],
    signals: {
      buySignals: [],
      sellSignals: [],
      overallBuyStrength: 0,
      overallSellStrength: 0
    },
    tradeSetup: {
      direction: "neutral",
      entry: 0,
      stopLoss: 0,
      targets: [],
      riskReward: 0,
      confidence: 0,
      reasoning: []
    }
  };
}

// ============================================
// MULTI-TIMEFRAME ANALYSIS
// ============================================

export interface MultiTimeframeResult {
  timeframes: Record<string, FullAnalysis>;
  combined: TrendStrength;
  recommendation: string;
  
  // Elite Multi-TF Analysis
  eliteAgreement?: {
    agreementPercent: number;
    dominantDirection: 'bullish' | 'bearish' | 'neutral';
    alignedTimeframes: string[];
    conflictingTimeframes: string[];
    strengthScore: number;
  };
  dominantRegime?: MarketRegime;
  overallConfidence?: number;
}

export function analyzeMultiTimeframe(
  timeframeData: TimeframeData[],
  symbol: string
): MultiTimeframeResult {
  const analyses: Record<string, FullAnalysis> = {};
  const eliteResults = new Map<string, EliteTrendResult>();
  
  const weights: Record<string, number> = {
    "15m": 0.10,
    "1h": 0.15,
    "4h": 0.25,
    "1d": 0.30,
    "3d": 0.20
  };
  
  let weightedBullish = 0;
  let weightedBearish = 0;
  let totalWeight = 0;
  
  // Regime counting
  const regimeCounts: Record<MarketRegime, number> = {
    trending: 0,
    ranging: 0,
    volatile: 0
  };
  
  for (const tf of timeframeData) {
    const analysis = analyzeTimeframe(tf.data, symbol, tf.timeframe);
    analyses[tf.timeframe] = analysis;
    
    const weight = weights[tf.timeframe] || 0.2;
    weightedBullish += analysis.trendStrength.bullishScore * weight;
    weightedBearish += analysis.trendStrength.bearishScore * weight;
    totalWeight += weight;
  }
  
  const bullishScore = Math.round(weightedBullish / totalWeight);
  const bearishScore = Math.round(weightedBearish / totalWeight);
  
  const combined: TrendStrength = {
    bullishScore,
    bearishScore,
    trend: bullishScore > 60 ? "bullish" : bearishScore > 60 ? "bearish" : "neutral",
    strength: Math.abs(bullishScore - 50) / 50,
    confidence: Object.values(analyses).reduce((sum, a) => sum + a.trendStrength.confidence, 0) / 
                Object.keys(analyses).length
  };
  
  // Calculate elite agreement
  let eliteAgreement;
  if (eliteResults.size > 0) {
    eliteAgreement = getMultiTimeframeAgreement(eliteResults, weights);
    
    // Enhance combined confidence with elite agreement
    if (eliteAgreement.agreementPercent >= 70) {
      combined.confidence = Math.min(1, combined.confidence * 1.2);
    }
  }
  
  // Determine dominant regime
  let dominantRegime: MarketRegime = 'ranging';
  let maxRegimeCount = 0;
  for (const [regime, count] of Object.entries(regimeCounts)) {
    if (count > maxRegimeCount) {
      maxRegimeCount = count;
      dominantRegime = regime as MarketRegime;
    }
  }
  
  // Calculate overall confidence from elite results
  const eliteConfidences = Array.from(eliteResults.values()).map(r => r.confidence);
  const overallConfidence = eliteConfidences.length > 0
    ? eliteConfidences.reduce((a, b) => a + b, 0) / eliteConfidences.length
    : undefined;
  
  let recommendation = "انتظار";
  if (combined.trend === "bullish" && combined.confidence > 0.6) {
    recommendation = eliteAgreement?.agreementPercent && eliteAgreement.agreementPercent >= 80 
      ? "شراء قوي ⭐" 
      : "شراء قوي";
  } else if (combined.trend === "bullish") {
    recommendation = "شراء";
  } else if (combined.trend === "bearish" && combined.confidence > 0.6) {
    recommendation = eliteAgreement?.agreementPercent && eliteAgreement.agreementPercent >= 80 
      ? "بيع قوي ⭐" 
      : "بيع قوي";
  } else if (combined.trend === "bearish") {
    recommendation = "بيع";
  }
  
  return {
    timeframes: analyses,
    combined,
    recommendation,
    eliteAgreement,
    dominantRegime,
    overallConfidence
  };
}
