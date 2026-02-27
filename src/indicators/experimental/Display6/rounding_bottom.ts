/**
 * Rounding Bottom Pattern Detection
 * From ajaygm18/chart repository
 * A bullish reversal pattern forming a U-shape (saucer bottom)
 */

export interface RoundingBottomPattern {
  type: 'rounding_bottom';
  direction: 'bullish';
  leftEdge: { index: number; price: number };
  bottom: { index: number; price: number };
  rightEdge: { index: number; price: number };
  neckline: number;
  target: number;
  confidence: number;
}

export interface RoundingBottomConfig {
  minPatternBars: number;
  maxPatternBars: number;
  symmetryTolerance: number;
}

const DEFAULT_CONFIG: RoundingBottomConfig = {
  minPatternBars: 20,
  maxPatternBars: 60,
  symmetryTolerance: 0.15,
};

export function detectRoundingBottom(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<RoundingBottomConfig> = {}
): RoundingBottomPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: RoundingBottomPattern[] = [];

  const pivotLows = findPivotLows(lows, 3);

  for (let i = 0; i < pivotLows.length; i++) {
    const bottom = pivotLows[i];

    // Look for left edge (higher low before bottom)
    const leftEdge = findHigherLowBefore(lows, bottom.index, 10, 30);
    if (!leftEdge) continue;

    // Look for right edge (higher low after bottom)
    const rightEdge = findHigherLowAfter(lows, bottom.index, 10, 30);
    if (!rightEdge) continue;

    // Check pattern duration
    const patternDuration = rightEdge.index - leftEdge.index;
    if (patternDuration < cfg.minPatternBars || patternDuration > cfg.maxPatternBars) {
      continue;
    }

    // Check symmetry
    const leftDuration = bottom.index - leftEdge.index;
    const rightDuration = rightEdge.index - bottom.index;
    const symmetry = Math.min(leftDuration, rightDuration) / Math.max(leftDuration, rightDuration);
    
    if (symmetry < (1 - cfg.symmetryTolerance)) continue;

    // Check U-shape (should have smooth curve, not V-shape)
    const leftSlope = (leftEdge.price - bottom.price) / leftDuration;
    const rightSlope = (rightEdge.price - bottom.price) / rightDuration;
    const slopeRatio = Math.abs(rightSlope / leftSlope);
    
    if (slopeRatio < 0.5 || slopeRatio > 2.0) continue; // Too asymmetric

    // Neckline at higher of left/right edges
    const neckline = Math.max(leftEdge.price, rightEdge.price);
    
    // Target: depth of pattern projected upward
    const depth = neckline - bottom.price;
    const target = neckline + depth;

    const confidence = symmetry * 0.7 + 0.3;

    patterns.push({
      type: 'rounding_bottom',
      direction: 'bullish',
      leftEdge,
      bottom,
      rightEdge,
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
    if (isPivot) pivots.push({ index: i, price: lows[i] });
  }
  return pivots;
}

function findHigherLowBefore(
  lows: number[], 
  bottomIndex: number, 
  minBars: number, 
  maxBars: number
): { index: number; price: number } | null {
  for (let i = bottomIndex - minBars; i >= Math.max(0, bottomIndex - maxBars); i--) {
    if (lows[i] > lows[bottomIndex]) {
      return { index: i, price: lows[i] };
    }
  }
  return null;
}

function findHigherLowAfter(
  lows: number[], 
  bottomIndex: number, 
  minBars: number, 
  maxBars: number
): { index: number; price: number } | null {
  for (let i = bottomIndex + minBars; i < Math.min(lows.length, bottomIndex + maxBars); i++) {
    if (lows[i] > lows[bottomIndex]) {
      return { index: i, price: lows[i] };
    }
  }
  return null;
}
