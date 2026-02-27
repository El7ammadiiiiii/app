/**
 * Double Top Pattern Detection
 * From ajaygm18/chart repository
 * A bearish reversal pattern with two peaks at approximately the same level
 */

export interface DoubleTopPattern {
  type: 'double_top';
  direction: 'bearish';
  firstPeak: { index: number; price: number };
  secondPeak: { index: number; price: number };
  valley: { index: number; price: number };
  neckline: number;
  target: number;
  confidence: number;
}

export interface DoubleTopConfig {
  peakSymmetry: number; // 0.98 = 98% price similarity
  maxPeakSymmetry: number; // Maximum symmetry (avoid fake patterns)
  minRetracement: number; // 0.10 = 10% min retracement
  maxRetracement: number; // 0.30 = 30% max retracement
  minPatternBars: number;
  minTimeBetweenPeaks: number; // Minimum bars between peaks
  maxTimeBetweenPeaks: number; // Maximum bars between peaks
  adaptivePivotWindow: boolean;
}

const DEFAULT_CONFIG: DoubleTopConfig = {
  peakSymmetry: 0.97, // Increased from 0.95
  maxPeakSymmetry: 1.02, // Peaks shouldn't be identical
  minRetracement: 0.10, // Increased from 0.08
  maxRetracement: 0.30, // Decreased from 0.35
  minPatternBars: 15, // Increased from 10
  minTimeBetweenPeaks: 5, // At least 5 bars between peaks
  maxTimeBetweenPeaks: 60, // Max 60 bars between peaks
  adaptivePivotWindow: true,
};

export function detectDoubleTop(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<DoubleTopConfig> = {}
): DoubleTopPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: DoubleTopPattern[] = [];

  // Adaptive pivot window
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 2;
  
  // Find pivot highs
  const pivotHighs = findPivotHighs(highs, pivotWindow);

  for (let i = 0; i < pivotHighs.length - 1; i++) {
    const firstPeak = pivotHighs[i];
    const secondPeak = pivotHighs[i + 1];

    // Time constraint validation
    const timeBetweenPeaks = secondPeak.index - firstPeak.index;
    if (timeBetweenPeaks < cfg.minTimeBetweenPeaks || timeBetweenPeaks > cfg.maxTimeBetweenPeaks) {
      continue;
    }

    // Check peak symmetry (not too different, not too identical)
    const peakRatio = Math.min(firstPeak.price, secondPeak.price) / 
                     Math.max(firstPeak.price, secondPeak.price);
    
    if (peakRatio < cfg.peakSymmetry || peakRatio > cfg.maxPeakSymmetry) {
      continue;
    }

    // Find valley between peaks
    const valleyIdx = findLowestBetween(lows, firstPeak.index, secondPeak.index);
    const valleyPrice = lows[valleyIdx];
    const avgPeakPrice = (firstPeak.price + secondPeak.price) / 2;

    // Valley should be roughly in the middle (not too close to either peak)
    const valleyPosition = (valleyIdx - firstPeak.index) / timeBetweenPeaks;
    if (valleyPosition < 0.25 || valleyPosition > 0.75) {
      continue;
    }

    // Check retracement
    const retracement = (avgPeakPrice - valleyPrice) / avgPeakPrice;
    if (retracement < cfg.minRetracement || retracement > cfg.maxRetracement) {
      continue;
    }

    // Neckline at valley
    const neckline = valleyPrice;
    const target = neckline - (avgPeakPrice - neckline);

    // Multi-factor confidence scoring
    const symmetryScore = peakRatio;
    const retracementScore = Math.min(retracement / 0.20, 1); // Optimal retracement ~20%
    const valleyPositionScore = 1 - Math.abs(valleyPosition - 0.5) * 2; // Best if valley is centered
    const timeProportionScore = calculateTimeProportionScore(timeBetweenPeaks, cfg.minTimeBetweenPeaks, cfg.maxTimeBetweenPeaks);
    const priceActionScore = validatePriceAction(closes, firstPeak.index, secondPeak.index, valleyIdx);

    const confidence = (
      symmetryScore * 0.25 +
      retracementScore * 0.20 +
      valleyPositionScore * 0.20 +
      timeProportionScore * 0.15 +
      priceActionScore * 0.20
    );

    // Only add patterns with sufficient confidence
    if (confidence < 0.60) continue;

    patterns.push({
      type: 'double_top',
      direction: 'bearish',
      firstPeak,
      secondPeak,
      valley: { index: valleyIdx, price: valleyPrice },
      neckline,
      target,
      confidence: Math.min(confidence, 1),
    });
  }

  return removeDuplicatePatterns(patterns);
}

function findPivotHighs(highs: number[], window: number): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  
  for (let i = window; i < highs.length - window; i++) {
    let isPivot = true;
    for (let j = 1; j <= window; j++) {
      if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      pivots.push({ index: i, price: highs[i] });
    }
  }
  
  return pivots;
}

function findLowestBetween(lows: number[], start: number, end: number): number {
  let minIdx = start;
  let minVal = lows[start];
  
  for (let i = start + 1; i <= end && i < lows.length; i++) {
    if (lows[i] < minVal) {
      minVal = lows[i];
      minIdx = i;
    }
  }
  
  return minIdx;
}

// Calculate adaptive pivot window based on volatility
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

// Validate price action between peaks
function validatePriceAction(closes: number[], firstIdx: number, secondIdx: number, valleyIdx: number): number {
  // Check if there's a clear down-up-down movement
  const firstToValley = closes.slice(firstIdx, valleyIdx + 1);
  const valleyToSecond = closes.slice(valleyIdx, secondIdx + 1);
  
  let downTrend = 0, upTrend = 0;
  for (let i = 1; i < firstToValley.length; i++) {
    if (firstToValley[i] < firstToValley[i - 1]) downTrend++;
  }
  for (let i = 1; i < valleyToSecond.length; i++) {
    if (valleyToSecond[i] > valleyToSecond[i - 1]) upTrend++;
  }
  
  const downRatio = downTrend / Math.max(1, firstToValley.length - 1);
  const upRatio = upTrend / Math.max(1, valleyToSecond.length - 1);
  
  return (downRatio + upRatio) / 2;
}

// Remove duplicate patterns
function removeDuplicatePatterns(patterns: DoubleTopPattern[]): DoubleTopPattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: DoubleTopPattern[] = [];
  const usedIndices = new Set<number>();
  
  for (const pattern of patterns) {
    const indices = [pattern.firstPeak.index, pattern.secondPeak.index];
    if (!indices.some(idx => usedIndices.has(idx))) {
      result.push(pattern);
      indices.forEach(idx => usedIndices.add(idx));
    }
  }
  
  return result;
}
