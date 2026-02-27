/**
 * Inverse Head and Shoulders Pattern Detection
 * From ajaygm18/chart repository
 * A bullish reversal pattern with three troughs - lower middle trough (head) between two higher troughs (shoulders)
 */

export interface InverseHeadAndShouldersPattern {
  type: 'inverse_head_and_shoulders';
  direction: 'bullish';
  leftShoulder: { index: number; price: number };
  head: { index: number; price: number };
  rightShoulder: { index: number; price: number };
  neckline: { start: number; end: number; price: number };
  target: number;
  confidence: number;
}

export interface InverseHeadAndShouldersConfig {
  minShoulderSymmetry: number;
  necklineDeviation: number;
  minPatternBars: number;
}

const DEFAULT_CONFIG: InverseHeadAndShouldersConfig = {
  minShoulderSymmetry: 0.85,
  necklineDeviation: 0.05,
  minPatternBars: 15,
};

export function detectInverseHeadAndShoulders(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<InverseHeadAndShouldersConfig> = {}
): InverseHeadAndShouldersPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: InverseHeadAndShouldersPattern[] = [];
  const len = lows.length;

  if (len < cfg.minPatternBars) return patterns;

  // Find pivot lows for potential shoulders and head
  const pivotLows = findPivotLows(lows, 3);

  for (let i = 2; i < pivotLows.length - 1; i++) {
    const leftShoulder = pivotLows[i - 2];
    const head = pivotLows[i - 1];
    const rightShoulder = pivotLows[i];

    // Head must be lower than both shoulders
    if (head.price >= leftShoulder.price || head.price >= rightShoulder.price) {
      continue;
    }

    // Shoulders should be roughly equal
    const shoulderRatio = Math.min(leftShoulder.price, rightShoulder.price) / 
                         Math.max(leftShoulder.price, rightShoulder.price);
    
    if (shoulderRatio < cfg.minShoulderSymmetry) {
      continue;
    }

    // Find neckline (highs between shoulders)
    const necklineStart = findHighestBetween(highs, leftShoulder.index, head.index);
    const necklineEnd = findHighestBetween(highs, head.index, rightShoulder.index);
    const necklinePrice = (highs[necklineStart] + highs[necklineEnd]) / 2;

    // Calculate target
    const necklineToHead = necklinePrice - head.price;
    const target = necklinePrice + necklineToHead;

    const confidence = shoulderRatio * 0.7 + 
                      (Math.min(leftShoulder.price, rightShoulder.price) / head.price) * 0.3;

    patterns.push({
      type: 'inverse_head_and_shoulders',
      direction: 'bullish',
      leftShoulder,
      head,
      rightShoulder,
      neckline: { start: necklineStart, end: necklineEnd, price: necklinePrice },
      target,
      confidence: Math.min(confidence, 1),
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
