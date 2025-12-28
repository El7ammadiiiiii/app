/**
 * Triple Top Pattern Detection
 * From ajaygm18/chart repository
 * A bearish reversal pattern with three peaks at approximately the same level
 */

export interface TripleTopPattern {
  type: 'triple_top';
  direction: 'bearish';
  firstPeak: { index: number; price: number };
  secondPeak: { index: number; price: number };
  thirdPeak: { index: number; price: number };
  neckline: number;
  target: number;
  confidence: number;
}

export interface TripleTopConfig {
  peakSymmetry: number;
  minPatternBars: number;
}

const DEFAULT_CONFIG: TripleTopConfig = {
  peakSymmetry: 0.95,
  minPatternBars: 15,
};

export function detectTripleTop(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<TripleTopConfig> = {}
): TripleTopPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: TripleTopPattern[] = [];

  const pivotHighs = findPivotHighs(highs, 2);

  for (let i = 0; i < pivotHighs.length - 2; i++) {
    const firstPeak = pivotHighs[i];
    const secondPeak = pivotHighs[i + 1];
    const thirdPeak = pivotHighs[i + 2];

    // Check all three peaks are roughly equal
    const avgPeakPrice = (firstPeak.price + secondPeak.price + thirdPeak.price) / 3;
    const maxDev = Math.max(
      Math.abs(firstPeak.price - avgPeakPrice) / avgPeakPrice,
      Math.abs(secondPeak.price - avgPeakPrice) / avgPeakPrice,
      Math.abs(thirdPeak.price - avgPeakPrice) / avgPeakPrice
    );

    if (maxDev > (1 - cfg.peakSymmetry)) {
      continue;
    }

    // Find neckline (lowest low between peaks)
    const neckline1 = lows[findLowestBetween(lows, firstPeak.index, secondPeak.index)];
    const neckline2 = lows[findLowestBetween(lows, secondPeak.index, thirdPeak.index)];
    const neckline = Math.min(neckline1, neckline2);

    const target = neckline - (avgPeakPrice - neckline);
    const confidence = 1 - maxDev;

    patterns.push({
      type: 'triple_top',
      direction: 'bearish',
      firstPeak,
      secondPeak,
      thirdPeak,
      neckline,
      target,
      confidence,
    });
  }

  return patterns;
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
