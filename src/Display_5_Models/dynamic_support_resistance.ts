// Converted to TypeScript for Display 5 Models

/**
 * Dynamic Support and Resistance with Trend Lines (Multi-Language)
 * 
 * Advanced S/R detection system combining:
 * 1. Static Levels (Matrix Climax + Volume Extremes strategies)
 * 2. Dynamic Trendlines (Pivot Span + 5-Point Channel)
 * 3. 3D State Matrix (5x5 = 25 market scenarios)
 * 4. Smart interpretation engine with contextual bias
 * 
 * Strategies:
 * - Matrix Climax: Top N volume bars define resistance/support zones
 * - Volume Extremes: Max/min volume bars for extreme levels
 * - State Detection: S-State (static position) x D-State (dynamic position)
 * - Interpretation: 25 scenarios with tactical titles, bias, signals
 */

export interface DynamicSRConfig {
  // General
  universalLookback: number;        // Lookback length (100 default)
  projectionBars: number;           // Forward projection (26 default)
  
  // Strategy A: Matrix Climax
  showMatrixResistance: boolean;
  showMatrixSupport: boolean;
  topRankCount: number;             // Top N volume bars (10 default)
  
  // Strategy B: Volume Extremes
  showExtremesResistance: boolean;
  showExtremesSupport: boolean;
  
  // Trend Lines (reuse from trend_line_methods.ts)
  enablePivotSpan: boolean;
  enableFivePointChannel: boolean;
}

export const defaultDynamicSRConfig: DynamicSRConfig = {
  universalLookback: 100,
  projectionBars: 26,
  showMatrixResistance: true,
  showMatrixSupport: true,
  topRankCount: 10,
  showExtremesResistance: true,
  showExtremesSupport: true,
  enablePivotSpan: true,
  enableFivePointChannel: false,
};

export interface BarVolume {
  index: number;
  buyVolume: number;
  sellVolume: number;
  high: number;
  low: number;
  close: number;
}

export interface SRZone {
  top: number;
  bottom: number;
  index: number;
}

export interface DynamicSRResult {
  // Static Levels
  matrixResistance: SRZone | null;
  matrixSupport: SRZone | null;
  extremesResistance: SRZone | null;
  extremesSupport: SRZone | null;
  
  // Dynamic Levels (from trendlines)
  dynamicResistance: number | null;
  dynamicSupport: number | null;
  
  // State Detection
  sState: number;  // 1=Breakout Up, 2=Inside Res, 3=Mid-Range, 4=Inside Sup, 5=Breakdown Down
  dState: number;  // 1=Overextended Up, 2=Near Res, 3=Channel Mid, 4=Near Sup, 5=Overextended Down
  
  // 3D Interpretation
  interpretation: MatrixInterpretation;
}

export interface MatrixInterpretation {
  title: string;
  bias: string;
  signal: string;
  color: string;      // Matrix cell color
  biasColor: string;  // Bias indicator color
}

/**
 * Calculate volume data (buy/sell split using geometry method)
 */
function calculateVolumeData(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): BarVolume[] {
  const data: BarVolume[] = [];
  
  for (let i = 0; i < highs.length; i++) {
    const range = highs[i] - lows[i];
    let buyVol = 0, sellVol = 0;
    
    if (range === 0) {
      buyVol = volumes[i] * 0.5;
      sellVol = volumes[i] * 0.5;
    } else {
      buyVol = volumes[i] * ((closes[i] - lows[i]) / range);
      sellVol = volumes[i] * ((highs[i] - closes[i]) / range);
    }
    
    data.push({
      index: i,
      buyVolume: buyVol,
      sellVolume: sellVol,
      high: highs[i],
      low: lows[i],
      close: closes[i]
    });
  }
  
  return data;
}

/**
 * Strategy A: Matrix Climax Detection
 * Finds top N volume bars and calculates resistance/support zones
 */
function calculateMatrixLevels(
  data: BarVolume[],
  topCount: number
): { resistance: SRZone | null; support: SRZone | null } {
  if (data.length === 0) {
    return { resistance: null, support: null };
  }
  
  // Calculate volume thresholds
  const buyVolumes = data.map(d => d.buyVolume).sort((a, b) => a - b);
  const sellVolumes = data.map(d => d.sellVolume).sort((a, b) => a - b);
  
  const thresholdBuy = buyVolumes.length > topCount ? buyVolumes[buyVolumes.length - topCount] : 0;
  const thresholdSell = sellVolumes.length > topCount ? sellVolumes[sellVolumes.length - topCount] : 0;
  
  // Sort by close price (descending for resistance, ascending for support)
  const sortedByHigh = [...data].sort((a, b) => b.close - a.close);
  const sortedByLow = [...data].sort((a, b) => a.close - b.close);
  
  // Find resistance (highest close with high volume)
  let resistance: SRZone | null = null;
  for (const bar of sortedByHigh.slice(0, Math.min(topCount + 5, sortedByHigh.length))) {
    if (bar.buyVolume >= thresholdBuy || bar.sellVolume >= thresholdSell) {
      resistance = {
        top: bar.high,
        bottom: bar.low,
        index: bar.index
      };
      break;
    }
  }
  
  // Find support (lowest close with high volume)
  let support: SRZone | null = null;
  for (const bar of sortedByLow.slice(0, Math.min(topCount + 5, sortedByLow.length))) {
    if (bar.buyVolume >= thresholdBuy || bar.sellVolume >= thresholdSell) {
      support = {
        top: bar.high,
        bottom: bar.low,
        index: bar.index
      };
      break;
    }
  }
  
  return { resistance, support };
}

/**
 * Strategy B: Volume Extremes Detection
 * Finds max/min volume bars for extreme levels
 */
function calculateExtremeLevels(
  data: BarVolume[]
): { resistance: SRZone | null; support: SRZone | null } {
  if (data.length === 0) {
    return { resistance: null, support: null };
  }
  
  // Find max volume bars
  let maxBuyIdx = 0, maxSellIdx = 0;
  let maxBuyVol = -1, maxSellVol = -1;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].buyVolume > maxBuyVol) {
      maxBuyVol = data[i].buyVolume;
      maxBuyIdx = i;
    }
    if (data[i].sellVolume > maxSellVol) {
      maxSellVol = data[i].sellVolume;
      maxSellIdx = i;
    }
  }
  
  // Calculate resistance zone
  const resBar1 = data[maxBuyIdx];
  const resBar2 = data[maxSellIdx];
  const resTop = Math.max(resBar1.high, resBar2.high);
  const resBot = Math.min(resBar1.high, resBar2.high);
  
  // Find min volume bars
  let minBuyIdx = 0, minSellIdx = 0;
  let minBuyVol = Infinity, minSellVol = Infinity;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].buyVolume > 0 && data[i].buyVolume < minBuyVol) {
      minBuyVol = data[i].buyVolume;
      minBuyIdx = i;
    }
    if (data[i].sellVolume > 0 && data[i].sellVolume < minSellVol) {
      minSellVol = data[i].sellVolume;
      minSellIdx = i;
    }
  }
  
  // Calculate support zone
  const supBar1 = data[minBuyIdx];
  const supBar2 = data[minSellIdx];
  const supTop = Math.max(supBar1.low, supBar2.low);
  const supBot = Math.min(supBar1.low, supBar2.low);
  
  // Flip logic: if support avg > resistance avg, swap them
  const resAvg = (resTop + resBot) / 2;
  const supAvg = (supTop + supBot) / 2;
  
  if (supAvg > resAvg) {
    return {
      resistance: { top: supTop, bottom: supBot, index: minBuyIdx },
      support: { top: resTop, bottom: resBot, index: maxBuyIdx }
    };
  }
  
  return {
    resistance: { top: resTop, bottom: resBot, index: maxBuyIdx },
    support: { top: supTop, bottom: supBot, index: minBuyIdx }
  };
}

/**
 * S-State Detection (Static Position)
 * 1 = Breakout Up (above resistance)
 * 2 = Inside Resistance zone
 * 3 = Mid-Range (between R and S)
 * 4 = Inside Support zone
 * 5 = Breakdown Down (below support)
 */
function getSState(
  close: number,
  resistance: SRZone | null,
  support: SRZone | null
): number {
  if (!resistance || !support) return 3;
  
  if (close > resistance.top) return 1;
  if (close >= resistance.bottom) return 2;
  if (close < support.bottom) return 5;
  if (close <= support.top) return 4;
  return 3;
}

/**
 * D-State Detection (Dynamic Position)
 * 1 = Overextended Up (above dynamic R + buffer)
 * 2 = Near Resistance (at dynamic R)
 * 3 = Channel Mid (between dynamic R and S)
 * 4 = Near Support (at dynamic S)
 * 5 = Overextended Down (below dynamic S - buffer)
 */
function getDState(
  close: number,
  dynamicR: number | null,
  dynamicS: number | null,
  atr: number
): number {
  if (!dynamicR || !dynamicS) return 3;
  
  const buffer = atr * 0.20;
  
  if (close > dynamicR + buffer) return 1;
  if (close >= dynamicR - buffer) return 2;
  if (close < dynamicS - buffer) return 5;
  if (close <= dynamicS + buffer) return 4;
  return 3;
}

/**
 * 3D Matrix Interpretation Engine
 * Maps S-State x D-State to tactical scenarios
 */
function interpretMatrix(sState: number, dState: number): MatrixInterpretation {
  // S1: Breakout Up
  if (sState === 1) {
    if (dState === 1) {
      return {
        title: "HYPER EXTENSION",
        bias: "Extreme Bullish",
        signal: "Caution: Exhaustion Risk. Trail stops.",
        color: "#ff007a",
        biasColor: "#00C853"
      };
    } else if (dState === 2) {
      return {
        title: "RESISTANCE CLASH",
        bias: "Bullish",
        signal: "Breakout confirmed but facing dynamic R.",
        color: "#ff9800",
        biasColor: "#69F0AE"
      };
    } else if (dState === 3) {
      return {
        title: "CHANNEL BREAKOUT",
        bias: "Strong Bullish",
        signal: "Ideal Trend Continuation. Buy dips.",
        color: "#00E676",
        biasColor: "#00C853"
      };
    } else if (dState === 4) {
      return {
        title: "SMART PULLBACK",
        bias: "Bullish (Pullback)",
        signal: "Pullback after breakout. Strong buy opportunity.",
        color: "#2962ff",
        biasColor: "#69F0AE"
      };
    } else {
      return {
        title: "CONFLICT (DIV)",
        bias: "Conflict/Reversal",
        signal: "Major Divergence. Static breakout failing. High Risk.",
        color: "#b0bec5",
        biasColor: "#FFD600"
      };
    }
  }
  
  // S2: Inside Resistance
  else if (sState === 2) {
    if (dState === 1) {
      return {
        title: "WEAK SPIKE",
        bias: "Neutral/Bullish",
        signal: "Testing resistance, overextended short-term.",
        color: "#ff5252",
        biasColor: "#69F0AE"
      };
    } else if (dState === 2) {
      return {
        title: "IRON FORTRESS (R)",
        bias: "Rejection Risk",
        signal: "Double Resistance. High probability of rejection.",
        color: "#d50000",
        biasColor: "#D50000"
      };
    } else if (dState === 3) {
      return {
        title: "TESTING RES",
        bias: "Neutral",
        signal: "Consolidating at resistance. Wait for break/rejection.",
        color: "#ffab00",
        biasColor: "#78909C"
      };
    } else if (dState === 4) {
      return {
        title: "COMPRESSION (UP)",
        bias: "Conflict (Squeeze)",
        signal: "Squeezed between Static R and Dynamic S. Volatility imminent.",
        color: "#00b0ff",
        biasColor: "#FFD600"
      };
    } else {
      return {
        title: "RES vs DOWN-TREND",
        bias: "Bearish",
        signal: "Strong downtrend meeting static resistance. Potential Short.",
        color: "#d50000",
        biasColor: "#D50000"
      };
    }
  }
  
  // S3: Mid-Range
  else if (sState === 3) {
    if (dState === 1) {
      return {
        title: "OVERBOUGHT RANGE",
        bias: "Rejection Risk (OB)",
        signal: "Overextended in range. Potential fade (short).",
        color: "#ff5252",
        biasColor: "#FF8A80"
      };
    } else if (dState === 2) {
      return {
        title: "RANGE HIGH LIMIT",
        bias: "Neutral/Bearish",
        signal: "At top of dynamic channel. Look for rejection.",
        color: "#ff9800",
        biasColor: "#FF8A80"
      };
    } else if (dState === 3) {
      return {
        title: "NEUTRAL / CHOPPY",
        bias: "Neutral (Choppy)",
        signal: "Dead Center. Low probability trades. Avoid.",
        color: "#9e9e9e",
        biasColor: "#78909C"
      };
    } else if (dState === 4) {
      return {
        title: "RANGE DIP BUY",
        bias: "Neutral/Bullish",
        signal: "At bottom of dynamic channel. Look for bounce.",
        color: "#00e5ff",
        biasColor: "#69F0AE"
      };
    } else {
      return {
        title: "WEAK RANGE (OS)",
        bias: "Bounce Risk (OS)",
        signal: "Oversold in range. Potential fade (long).",
        color: "#ff5252",
        biasColor: "#69F0AE"
      };
    }
  }
  
  // S4: Inside Support
  else if (sState === 4) {
    if (dState === 1) {
      return {
        title: "SUP vs UP-TREND",
        bias: "Bullish",
        signal: "Strong uptrend meeting static support. Potential Long.",
        color: "#00c853",
        biasColor: "#00C853"
      };
    } else if (dState === 2) {
      return {
        title: "COMPRESSION (DN)",
        bias: "Conflict (Squeeze)",
        signal: "Squeezed between Static S and Dynamic R. Volatility imminent.",
        color: "#ff9100",
        biasColor: "#FFD600"
      };
    } else if (dState === 3) {
      return {
        title: "TESTING SUPPORT",
        bias: "Neutral",
        signal: "Consolidating at support. Wait for bounce/break.",
        color: "#00b0ff",
        biasColor: "#78909C"
      };
    } else if (dState === 4) {
      return {
        title: "IRON FLOOR (S)",
        bias: "Bounce Risk",
        signal: "Double Support. High probability of bounce.",
        color: "#00c853",
        biasColor: "#00C853"
      };
    } else {
      return {
        title: "WEAK DIP",
        bias: "Neutral/Bearish",
        signal: "Testing support, oversold short-term.",
        color: "#ff5252",
        biasColor: "#FF8A80"
      };
    }
  }
  
  // S5: Breakdown Down
  else {
    if (dState === 1) {
      return {
        title: "CONFLICT (DIV)",
        bias: "Conflict/Reversal",
        signal: "Major Divergence. Static breakout failing. High Risk.",
        color: "#b0bec5",
        biasColor: "#FFD600"
      };
    } else if (dState === 2) {
      return {
        title: "BEAR PULLBACK",
        bias: "Bearish (Pullback)",
        signal: "Pullback after breakdown. Strong selling opportunity.",
        color: "#d50000",
        biasColor: "#FF8A80"
      };
    } else if (dState === 3) {
      return {
        title: "CHANNEL BREAKDOWN",
        bias: "Strong Bearish",
        signal: "Ideal Trend Continuation (Down). Sell rallies.",
        color: "#d50000",
        biasColor: "#D50000"
      };
    } else if (dState === 4) {
      return {
        title: "SUPPORT CLASH",
        bias: "Bearish",
        signal: "Breakdown confirmed but facing dynamic S.",
        color: "#ff9800",
        biasColor: "#FF8A80"
      };
    } else {
      return {
        title: "HYPER DROP (VOID)",
        bias: "Extreme Bearish",
        signal: "Caution: Climax risk. Trail stops (Shorts).",
        color: "#ff007a",
        biasColor: "#D50000"
      };
    }
  }
}

/**
 * Calculate ATR (Average True Range) for dynamic state detection
 */
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  
  const atrValues: number[] = [];
  let sum = 0;
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period) {
      sum += trueRanges[i];
      if (i === period - 1) {
        atrValues.push(sum / period);
      }
    } else {
      const prevATR = atrValues[atrValues.length - 1];
      const newATR = (prevATR * (period - 1) + trueRanges[i]) / period;
      atrValues.push(newATR);
    }
  }
  
  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
}

/**
 * Main calculation function
 */
export function calculateDynamicSR(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  dynamicR: number | null,  // From trendlines
  dynamicS: number | null,   // From trendlines
  config: DynamicSRConfig = defaultDynamicSRConfig
): DynamicSRResult {
  const currentIdx = highs.length - 1;
  const lookback = Math.min(config.universalLookback, currentIdx + 1);
  
  // Extract lookback window
  const windowHighs = highs.slice(currentIdx - lookback + 1, currentIdx + 1);
  const windowLows = lows.slice(currentIdx - lookback + 1, currentIdx + 1);
  const windowCloses = closes.slice(currentIdx - lookback + 1, currentIdx + 1);
  const windowVolumes = volumes.slice(currentIdx - lookback + 1, currentIdx + 1);
  
  // Calculate volume data
  const volumeData = calculateVolumeData(windowHighs, windowLows, windowCloses, windowVolumes);
  
  // Strategy A: Matrix Climax
  const matrixLevels = calculateMatrixLevels(volumeData, config.topRankCount);
  
  // Strategy B: Volume Extremes
  const extremeLevels = calculateExtremeLevels(volumeData);
  
  // Calculate ATR
  const atr = calculateATR(highs, lows, closes, 14);
  
  // Use extremes for state detection (primary levels)
  const resistance = extremeLevels.resistance;
  const support = extremeLevels.support;
  
  // Detect states
  const sState = getSState(closes[currentIdx], resistance, support);
  const dState = getDState(closes[currentIdx], dynamicR, dynamicS, atr);
  
  // Interpret matrix
  const interpretation = interpretMatrix(sState, dState);
  
  return {
    matrixResistance: matrixLevels.resistance,
    matrixSupport: matrixLevels.support,
    extremesResistance: extremeLevels.resistance,
    extremesSupport: extremeLevels.support,
    dynamicResistance: dynamicR,
    dynamicSupport: dynamicS,
    sState,
    dState,
    interpretation
  };
}
