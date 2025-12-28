/**
 * Triple Bottom Pattern Detection
 * From ajaygm18/chart repository
 * A bullish reversal pattern with three troughs at approximately the same level
 */

export interface TripleBottomPattern {
  type: 'triple_bottom';
  direction: 'bullish';
  firstBottom: { index: number; price: number };
  secondBottom: { index: number; price: number };
  thirdBottom: { index: number; price: number };
  neckline: number;
  target: number;
  confidence: number;
}

export interface TripleBottomConfig {
  bottomSymmetry: number;
  minPatternBars: number;
}

const DEFAULT_CONFIG: TripleBottomConfig = {
  bottomSymmetry: 0.95,
  minPatternBars: 15,
};

export function detectTripleBottom(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<TripleBottomConfig> = {}
): TripleBottomPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: TripleBottomPattern[] = [];

  const pivotLows = findPivotLows(lows, 2);

  for (let i = 0; i < pivotLows.length - 2; i++) {
    const firstBottom = pivotLows[i];
    const secondBottom = pivotLows[i + 1];
    const thirdBottom = pivotLows[i + 2];

    // Check all three bottoms are roughly equal
    const avgBottomPrice = (firstBottom.price + secondBottom.price + thirdBottom.price) / 3;
    const maxDev = Math.max(
      Math.abs(firstBottom.price - avgBottomPrice) / avgBottomPrice,
      Math.abs(secondBottom.price - avgBottomPrice) / avgBottomPrice,
      Math.abs(thirdBottom.price - avgBottomPrice) / avgBottomPrice
    );

    if (maxDev > (1 - cfg.bottomSymmetry)) {
      continue;
    }

    // Find neckline (highest high between bottoms)
    const neckline1 = highs[findHighestBetween(highs, firstBottom.index, secondBottom.index)];
    const neckline2 = highs[findHighestBetween(highs, secondBottom.index, thirdBottom.index)];
    const neckline = Math.max(neckline1, neckline2);

    const target = neckline + (neckline - avgBottomPrice);
    const confidence = 1 - maxDev;

    patterns.push({
      type: 'triple_bottom',
      direction: 'bullish',
      firstBottom,
      secondBottom,
      thirdBottom,
      neckline,
      target,
      confidence,
    });
  }

  return patterns;
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
