/**
 * Double Bottom Pattern Detection
 * From ajaygm18/chart repository
 * A bullish reversal pattern with two troughs at approximately the same level
 */

export interface DoubleBottomPattern {
  type: 'double_bottom';
  direction: 'bullish';
  firstBottom: { index: number; price: number };
  secondBottom: { index: number; price: number };
  peak: { index: number; price: number };
  neckline: number;
  target: number;
  confidence: number;
}

export interface DoubleBottomConfig {
  bottomSymmetry: number;
  maxBottomSymmetry: number;
  minRetracement: number;
  maxRetracement: number;
  minPatternBars: number;
  minTimeBetweenBottoms: number;
  maxTimeBetweenBottoms: number;
  adaptivePivotWindow: boolean;
}

const DEFAULT_CONFIG: DoubleBottomConfig = {
  bottomSymmetry: 0.97, // Increased from 0.95
  maxBottomSymmetry: 1.02,
  minRetracement: 0.10, // Increased from 0.08
  maxRetracement: 0.30, // Decreased from 0.35
  minPatternBars: 15, // Increased from 10
  minTimeBetweenBottoms: 5,
  maxTimeBetweenBottoms: 60,
  adaptivePivotWindow: true,
};

export function detectDoubleBottom(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<DoubleBottomConfig> = {}
): DoubleBottomPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: DoubleBottomPattern[] = [];

  // Adaptive pivot window
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 2;
  
  const pivotLows = findPivotLows(lows, pivotWindow);

  for (let i = 0; i < pivotLows.length - 1; i++) {
    const firstBottom = pivotLows[i];
    const secondBottom = pivotLows[i + 1];

    // Time constraint validation
    const timeBetweenBottoms = secondBottom.index - firstBottom.index;
    if (timeBetweenBottoms < cfg.minTimeBetweenBottoms || timeBetweenBottoms > cfg.maxTimeBetweenBottoms) {
      continue;
    }

    // Check bottom symmetry
    const bottomRatio = Math.min(firstBottom.price, secondBottom.price) / 
                       Math.max(firstBottom.price, secondBottom.price);
    
    if (bottomRatio < cfg.bottomSymmetry || bottomRatio > cfg.maxBottomSymmetry) {
      continue;
    }

    // Find peak between bottoms
    const peakIdx = findHighestBetween(highs, firstBottom.index, secondBottom.index);
    const peakPrice = highs[peakIdx];
    const avgBottomPrice = (firstBottom.price + secondBottom.price) / 2;

    // Peak should be roughly in the middle
    const peakPosition = (peakIdx - firstBottom.index) / timeBetweenBottoms;
    if (peakPosition < 0.25 || peakPosition > 0.75) {
      continue;
    }

    // Check retracement
    const retracement = (peakPrice - avgBottomPrice) / avgBottomPrice;
    if (retracement < cfg.minRetracement || retracement > cfg.maxRetracement) {
      continue;
    }

    // Neckline at peak
    const neckline = peakPrice;
    const target = neckline + (neckline - avgBottomPrice);

    // Multi-factor confidence scoring
    const symmetryScore = bottomRatio;
    const retracementScore = Math.min(retracement / 0.20, 1);
    const peakPositionScore = 1 - Math.abs(peakPosition - 0.5) * 2;
    const timeProportionScore = calculateTimeProportionScore(timeBetweenBottoms, cfg.minTimeBetweenBottoms, cfg.maxTimeBetweenBottoms);
    const priceActionScore = validatePriceAction(closes, firstBottom.index, secondBottom.index, peakIdx, 'bottom');

    const confidence = (
      symmetryScore * 0.25 +
      retracementScore * 0.20 +
      peakPositionScore * 0.20 +
      timeProportionScore * 0.15 +
      priceActionScore * 0.20
    );

    if (confidence < 0.60) continue;

    patterns.push({
      type: 'double_bottom',
      direction: 'bullish',
      firstBottom,
      secondBottom,
      peak: { index: peakIdx, price: peakPrice },
      neckline,
      target,
      confidence: Math.min(confidence, 1),
    });
  }

  return removeDuplicatePatterns(patterns);
}

function findPivotLows(lows: number[], window: number): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  
  for (let i = window; i < lows.length - window; i++) {
    let isPivot = true;
    for (let j = 1; j <= window; j++) {
      if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      pivots.push({ index: i, price: lows[i] });
    }
  }
  
  return pivots;
}

function findHighestBetween(highs: number[], start: number, end: number): number {
  let maxIdx = start;
  let maxVal = highs[start];
  
  for (let i = start + 1; i <= end && i < highs.length; i++) {
    if (highs[i] > maxVal) {
      maxVal = highs[i];
      maxIdx = i;
    }
  }
  
  return maxIdx;
}

// Calculate adaptive pivot window
function calculateAdaptiveWindow(highs: number[], lows: number[]): number {
  if (highs.length < 20) return 2;
  
  let totalRange = 0;
  for (let i = 1; i < Math.min(20, highs.length); i++) {
    totalRange += highs[i] - lows[i];
  }
  const avgRange = totalRange / 19;
  const avgPrice = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
  const volatility = avgRange / avgPrice;
  
  if (volatility > 0.05) return 4;
  if (volatility > 0.03) return 3;
  return 2;
}

// Calculate time proportion score
function calculateTimeProportionScore(time: number, min: number, max: number): number {
  const optimalTime = (min + max) / 2;
  const deviation = Math.abs(time - optimalTime) / optimalTime;
  return Math.max(0, 1 - deviation);
}

// Validate price action
function validatePriceAction(closes: number[], firstIdx: number, secondIdx: number, midIdx: number, type: 'top' | 'bottom'): number {
  const firstToMid = closes.slice(firstIdx, midIdx + 1);
  const midToSecond = closes.slice(midIdx, secondIdx + 1);
  
  let firstTrend = 0, secondTrend = 0;
  for (let i = 1; i < firstToMid.length; i++) {
    if (type === 'bottom') {
      if (firstToMid[i] > firstToMid[i - 1]) firstTrend++;
    } else {
      if (firstToMid[i] < firstToMid[i - 1]) firstTrend++;
    }
  }
  for (let i = 1; i < midToSecond.length; i++) {
    if (type === 'bottom') {
      if (midToSecond[i] < midToSecond[i - 1]) secondTrend++;
    } else {
      if (midToSecond[i] > midToSecond[i - 1]) secondTrend++;
    }
  }
  
  const firstRatio = firstTrend / Math.max(1, firstToMid.length - 1);
  const secondRatio = secondTrend / Math.max(1, midToSecond.length - 1);
  
  return (firstRatio + secondRatio) / 2;
}

// Remove duplicate patterns
function removeDuplicatePatterns(patterns: DoubleBottomPattern[]): DoubleBottomPattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: DoubleBottomPattern[] = [];
  const usedIndices = new Set<number>();
  
  for (const pattern of patterns) {
    const indices = [pattern.firstBottom.index, pattern.secondBottom.index];
    if (!indices.some(idx => usedIndices.has(idx))) {
      result.push(pattern);
      indices.forEach(idx => usedIndices.add(idx));
    }
  }
  
  return result;
}
