/**
 * Rectangle Pattern Detection
 * From ajaygm18/chart repository
 * A consolidation pattern with horizontal support and resistance
 */

export interface RectanglePattern {
  type: 'rectangle';
  direction: 'neutral';
  resistance: number;
  support: number;
  startIndex: number;
  endIndex: number;
  breakoutTarget: number;
  confidence: number;
}

export interface RectangleConfig {
  minTouches: number; // Min touches on each level
  levelDeviation: number; // Max deviation for horizontal levels
  minPatternBars: number;
  maxPatternBars: number;
}

const DEFAULT_CONFIG: RectangleConfig = {
  minTouches: 2,
  levelDeviation: 0.015,
  minPatternBars: 10,
  maxPatternBars: 60,
};

export function detectRectangle(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<RectangleConfig> = {}
): RectanglePattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: RectanglePattern[] = [];

  const pivotHighs = findPivotHighs(highs, 2);
  const pivotLows = findPivotLows(lows, 2);

  // Try to find horizontal resistance and support
  for (let i = 0; i < pivotHighs.length - 1; i++) {
    const resistanceLevel = pivotHighs[i].price;
    const resistanceStartIdx = pivotHighs[i].index;

    // Find other highs at similar level (forming resistance)
    const resistanceTouches = pivotHighs.filter(h => {
      const deviation = Math.abs(h.price - resistanceLevel) / resistanceLevel;
      return h.index >= resistanceStartIdx && deviation < cfg.levelDeviation;
    });

    if (resistanceTouches.length < cfg.minTouches) continue;

    const resistanceEndIdx = resistanceTouches[resistanceTouches.length - 1].index;

    // Find support level in same time range
    const relevantLows = pivotLows.filter(
      l => l.index >= resistanceStartIdx && l.index <= resistanceEndIdx
    );

    if (relevantLows.length < cfg.minTouches) continue;

    // Calculate average support level
    const supportLevel = relevantLows.reduce((sum, l) => sum + l.price, 0) / relevantLows.length;

    // Check if lows are at similar level (forming support)
    const supportTouches = relevantLows.filter(l => {
      const deviation = Math.abs(l.price - supportLevel) / supportLevel;
      return deviation < cfg.levelDeviation;
    });

    if (supportTouches.length < cfg.minTouches) continue;

    const patternDuration = resistanceEndIdx - resistanceStartIdx;
    if (patternDuration < cfg.minPatternBars || patternDuration > cfg.maxPatternBars) {
      continue;
    }

    // Calculate breakout target (height of rectangle)
    const rectangleHeight = resistanceLevel - supportLevel;
    const breakoutTarget = rectangleHeight;

    const confidence = Math.min(
      (resistanceTouches.length + supportTouches.length) / (cfg.minTouches * 4),
      1
    );

    patterns.push({
      type: 'rectangle',
      direction: 'neutral',
      resistance: resistanceLevel,
      support: supportLevel,
      startIndex: resistanceStartIdx,
      endIndex: resistanceEndIdx,
      breakoutTarget,
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
    if (isPivot) pivots.push({ index: i, price: highs[i] });
  }
  return pivots;
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
