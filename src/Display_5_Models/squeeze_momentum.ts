/**
 * Squeeze Momentum Oscillator
 * Detects volatility squeezes using Bollinger Bands vs Keltner Channels
 * Combined with Linear Regression Momentum
 */

export interface SqueezeSignal {
  index: number;
  momentum: number;
  inSqueeze: boolean;
  isBullishBreakout: boolean;
  isBearishBreakout: boolean;
  histogramColor: 'bullish_increasing' | 'bullish_decreasing' | 'bearish_decreasing' | 'bearish_increasing';
  dotColor: 'squeeze_on' | 'squeeze_off' | 'bullish_breakout' | 'bearish_breakout';
}

export interface SqueezeResult {
  signals: SqueezeSignal[];
  momentum: number[];
  squeezeBars: number[];  // Indices where squeeze is active
  breakoutBars: { index: number; type: 'bullish' | 'bearish' }[];
}

// Helper: Simple Moving Average
function sma(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(0);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result[i] = sum / period;
  }
  return result;
}

// Helper: Exponential Moving Average
function ema(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(0);
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  return result;
}

// Helper: Standard Deviation
function stdev(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(0);
  const smaValues = sma(data, period);
  
  for (let i = period - 1; i < data.length; i++) {
    let sumSqDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j] - smaValues[i];
      sumSqDiff += diff * diff;
    }
    result[i] = Math.sqrt(sumSqDiff / period);
  }
  return result;
}

// Helper: True Range
function trueRange(highs: number[], lows: number[], closes: number[]): number[] {
  const result = new Array(highs.length).fill(0);
  result[0] = highs[0] - lows[0];
  
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    result[i] = Math.max(hl, hc, lc);
  }
  return result;
}

// Helper: Average True Range
function atr(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const tr = trueRange(highs, lows, closes);
  return ema(tr, period);
}

// Helper: Highest value in lookback
function highest(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(0);
  for (let i = 0; i < data.length; i++) {
    let max = -Infinity;
    const start = Math.max(0, i - period + 1);
    for (let j = start; j <= i; j++) {
      if (data[j] > max) max = data[j];
    }
    result[i] = max;
  }
  return result;
}

// Helper: Lowest value in lookback
function lowest(data: number[], period: number): number[] {
  const result = new Array(data.length).fill(0);
  for (let i = 0; i < data.length; i++) {
    let min = Infinity;
    const start = Math.max(0, i - period + 1);
    for (let j = start; j <= i; j++) {
      if (data[j] < min) min = data[j];
    }
    result[i] = min;
  }
  return result;
}

// Helper: Linear Regression
function linreg(data: number[], period: number, offset: number = 0): number[] {
  const result = new Array(data.length).fill(0);
  
  for (let i = period - 1; i < data.length; i++) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let j = 0; j < period; j++) {
      const x = j;
      const y = data[i - period + 1 + j];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const n = period;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    result[i] = intercept + slope * (period - 1 - offset);
  }
  return result;
}

export interface SqueezeConfig {
  bbLength?: number;
  bbMult?: number;
  kcLength?: number;
  kcMult?: number;
  momentumLength?: number;
  useBreakoutColors?: boolean;
}

export function calculateSqueezeMomentum(
  closes: number[],
  highs: number[],
  lows: number[],
  config: SqueezeConfig = {}
): SqueezeResult {
  const {
    bbLength = 20,
    bbMult = 2.0,
    kcLength = 20,
    kcMult = 2.0,
    momentumLength = 20,
    useBreakoutColors = true
  } = config;

  const len = closes.length;
  const signals: SqueezeSignal[] = [];
  const momentumValues: number[] = new Array(len).fill(0);
  const squeezeBars: number[] = [];
  const breakoutBars: { index: number; type: 'bullish' | 'bearish' }[] = [];

  // Calculate Bollinger Bands
  const bbSma = sma(closes, bbLength);
  const bbStd = stdev(closes, bbLength);
  const upperBB = bbSma.map((v, i) => v + bbMult * bbStd[i]);
  const lowerBB = bbSma.map((v, i) => v - bbMult * bbStd[i]);

  // Calculate Keltner Channels
  const kcEma = ema(closes, kcLength);
  const atrValues = atr(highs, lows, closes, kcLength);
  const upperKC = kcEma.map((v, i) => v + kcMult * atrValues[i]);
  const lowerKC = kcEma.map((v, i) => v - kcMult * atrValues[i]);

  // Calculate Squeeze State
  const inSqueeze = upperBB.map((ub, i) => ub < upperKC[i] && lowerBB[i] > lowerKC[i]);

  // Calculate Momentum
  const highestHigh = highest(highs, momentumLength);
  const lowestLow = lowest(lows, momentumLength);
  const avgPrice = highestHigh.map((h, i) => (h + lowestLow[i]) / 2);
  const momentumSource = closes.map((c, i) => c - avgPrice[i]);
  const momentum = linreg(momentumSource, momentumLength, 0);

  // Process each bar
  for (let i = momentumLength; i < len; i++) {
    const m = momentum[i];
    const prevM = momentum[i - 1];
    const squeeze = inSqueeze[i];
    const prevSqueeze = inSqueeze[i - 1];
    
    // Breakout detection
    const squeezeReleaseUp = prevSqueeze && closes[i] > upperBB[i];
    const squeezeReleaseDown = prevSqueeze && closes[i] < lowerBB[i];
    const isSlopingUp = bbSma[i] > bbSma[i - 1];
    const isSlopingDown = bbSma[i] < bbSma[i - 1];
    
    const isBullishBreakout = squeezeReleaseUp && isSlopingUp;
    const isBearishBreakout = squeezeReleaseDown && isSlopingDown;

    // Histogram color
    let histogramColor: SqueezeSignal['histogramColor'];
    if (m >= 0) {
      histogramColor = m > prevM ? 'bullish_increasing' : 'bullish_decreasing';
    } else {
      histogramColor = m < prevM ? 'bearish_decreasing' : 'bearish_increasing';
    }

    // Dot color
    let dotColor: SqueezeSignal['dotColor'];
    if (squeeze) {
      dotColor = 'squeeze_on';
      squeezeBars.push(i);
    } else if (useBreakoutColors && isBullishBreakout) {
      dotColor = 'bullish_breakout';
      breakoutBars.push({ index: i, type: 'bullish' });
    } else if (useBreakoutColors && isBearishBreakout) {
      dotColor = 'bearish_breakout';
      breakoutBars.push({ index: i, type: 'bearish' });
    } else {
      dotColor = 'squeeze_off';
    }

    momentumValues[i] = m;

    signals.push({
      index: i,
      momentum: m,
      inSqueeze: squeeze,
      isBullishBreakout,
      isBearishBreakout,
      histogramColor,
      dotColor
    });
  }

  return {
    signals,
    momentum: momentumValues,
    squeezeBars,
    breakoutBars
  };
}
