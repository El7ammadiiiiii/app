/**
 * Cup and Handle Pattern Detection
 * From ajaygm18/chart repository
 * A bullish continuation pattern with U-shaped cup followed by small downward handle
 */

export interface CupAndHandlePattern {
  type: 'cup_and_handle';
  direction: 'bullish';
  cup: {
    leftRim: { index: number; price: number };
    bottom: { index: number; price: number };
    rightRim: { index: number; price: number };
  };
  handle: {
    start: { index: number; price: number };
    end: { index: number; price: number };
  };
  neckline: number;
  target: number;
  confidence: number;
}

export interface CupAndHandleConfig {
  minCupBars: number;
  maxCupBars: number;
  handleRatio: number; // Handle should be 1/3 to 1/2 of cup depth
  minHandleBars: number;
  maxHandleBars: number;
  minRimSymmetry: number; // Minimum rim symmetry
  maxHandleDepthRatio: number; // Maximum handle depth as ratio of cup depth
  minCupRoundness: number; // Minimum U-shape roundness score
}

const DEFAULT_CONFIG: CupAndHandleConfig = {
  minCupBars: 25, // Increased from 20
  maxCupBars: 100, // Increased from 80
  handleRatio: 0.40, // Tightened from 0.5
  minHandleBars: 5,
  maxHandleBars: 20, // Decreased from 25
  minRimSymmetry: 0.96, // Increased from 0.95
  maxHandleDepthRatio: 0.35, // Maximum handle depth
  minCupRoundness: 0.6, // Minimum U-shape score
};

export function detectCupAndHandle(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<CupAndHandleConfig> = {}
): CupAndHandlePattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: CupAndHandlePattern[] = [];

  const pivotLows = findPivotLows(lows, 3);
  const pivotHighs = findPivotHighs(highs, 2);

  // Find U-shaped cups
  for (let i = 0; i < pivotLows.length; i++) {
    const cupBottom = pivotLows[i];

    // Find left rim (high before bottom)
    const leftRim = findHighBeforeIndex(highs, cupBottom.index, cfg.minCupBars, cfg.maxCupBars);
    if (!leftRim) continue;

    // Find right rim (high after bottom, similar to left rim)
    const rightRim = findHighAfterIndex(highs, cupBottom.index, cfg.minCupBars, cfg.maxCupBars);
    if (!rightRim) continue;

    // Check rim symmetry (tighter requirement)
    const rimRatio = Math.min(leftRim.price, rightRim.price) / Math.max(leftRim.price, rightRim.price);
    if (rimRatio < cfg.minRimSymmetry) continue;

    // Validate cup shape (should be U-shaped, not V-shaped)
    const cupRoundness = validateCupShape(lows, leftRim.index, cupBottom.index, rightRim.index);
    if (cupRoundness < cfg.minCupRoundness) continue;

    // Cup depth validation
    const cupDepth = Math.max(leftRim.price, rightRim.price) - cupBottom.price;
    const neckline = Math.max(leftRim.price, rightRim.price);
    
    // Cup depth should be meaningful (at least 10% of price)
    const depthRatio = cupDepth / neckline;
    if (depthRatio < 0.08 || depthRatio > 0.40) continue;

    // Look for handle (small pullback after right rim)
    const handleStart = rightRim;
    const handleEndIdx = Math.min(
      rightRim.index + cfg.maxHandleBars,
      closes.length - 1
    );

    let handleEnd: { index: number; price: number } | null = null;
    let minHandlePrice = rightRim.price;
    let minHandleIdx = rightRim.index;

    for (let j = rightRim.index + cfg.minHandleBars; j <= handleEndIdx; j++) {
      if (lows[j] < minHandlePrice) {
        minHandlePrice = lows[j];
        minHandleIdx = j;
      }
    }

    // Handle pullback validation
    const handleDepth = rightRim.price - minHandlePrice;
    const handleDepthRatio = handleDepth / cupDepth;
    
    if (handleDepthRatio > cfg.maxHandleDepthRatio || handleDepthRatio < 0.08) {
      continue;
    }

    handleEnd = { index: minHandleIdx, price: minHandlePrice };

    // Validate handle doesn't go below cup bottom
    if (minHandlePrice < cupBottom.price) continue;

    // Calculate target
    const target = neckline + cupDepth;

    // Multi-factor confidence scoring
    const rimSymmetryScore = rimRatio;
    const cupRoundnessScore = cupRoundness;
    const depthScore = Math.min(depthRatio / 0.20, 1); // Optimal depth ~20%
    const handleDepthScore = 1 - handleDepthRatio / cfg.maxHandleDepthRatio;
    const cupDurationScore = validateCupDuration(leftRim.index, rightRim.index, cfg.minCupBars, cfg.maxCupBars);

    const confidence = (
      rimSymmetryScore * 0.25 +
      cupRoundnessScore * 0.25 +
      depthScore * 0.20 +
      handleDepthScore * 0.15 +
      cupDurationScore * 0.15
    );

    if (confidence < 0.60) continue;

    patterns.push({
      type: 'cup_and_handle',
      direction: 'bullish',
      cup: {
        leftRim,
        bottom: cupBottom,
        rightRim,
      },
      handle: {
        start: handleStart,
        end: handleEnd,
      },
      neckline,
      target,
      confidence: Math.min(confidence, 1),
    });
  }

  return removeDuplicatePatterns(patterns);
}

// Validate cup is U-shaped (not V-shaped)
function validateCupShape(lows: number[], leftIdx: number, bottomIdx: number, rightIdx: number): number {
  const leftHalf = lows.slice(leftIdx, bottomIdx + 1);
  const rightHalf = lows.slice(bottomIdx, rightIdx + 1);
  
  // Calculate smoothness of descent and ascent
  let leftJerkiness = 0, rightJerkiness = 0;
  
  for (let i = 2; i < leftHalf.length; i++) {
    const change1 = leftHalf[i - 1] - leftHalf[i - 2];
    const change2 = leftHalf[i] - leftHalf[i - 1];
    if ((change1 > 0 && change2 < 0) || (change1 < 0 && change2 > 0)) {
      leftJerkiness++;
    }
  }
  
  for (let i = 2; i < rightHalf.length; i++) {
    const change1 = rightHalf[i - 1] - rightHalf[i - 2];
    const change2 = rightHalf[i] - rightHalf[i - 1];
    if ((change1 > 0 && change2 < 0) || (change1 < 0 && change2 > 0)) {
      rightJerkiness++;
    }
  }
  
  const totalBars = leftHalf.length + rightHalf.length - 2;
  const jerkiness = (leftJerkiness + rightJerkiness) / Math.max(1, totalBars - 2);
  
  // Low jerkiness = smoother U-shape
  return Math.max(0, 1 - jerkiness * 2);
}

// Validate cup duration
function validateCupDuration(leftIdx: number, rightIdx: number, minBars: number, maxBars: number): number {
  const duration = rightIdx - leftIdx;
  const optimalDuration = (minBars + maxBars) / 2;
  const deviation = Math.abs(duration - optimalDuration) / optimalDuration;
  return Math.max(0, 1 - deviation);
}

// Remove duplicate patterns
function removeDuplicatePatterns(patterns: CupAndHandlePattern[]): CupAndHandlePattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: CupAndHandlePattern[] = [];
  const usedRanges: Array<{start: number; end: number}> = [];
  
  for (const pattern of patterns) {
    const start = pattern.cup.leftRim.index;
    const end = pattern.handle.end.index;
    
    const hasOverlap = usedRanges.some(range => 
      (start >= range.start && start <= range.end) ||
      (end >= range.start && end <= range.end)
    );
    
    if (!hasOverlap) {
      result.push(pattern);
      usedRanges.push({ start, end });
    }
  }
  
  return result;
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

function findHighBeforeIndex(
  highs: number[],
  index: number,
  minBars: number,
  maxBars: number
): { index: number; price: number } | null {
  let maxPrice = -Infinity;
  let maxIdx = -1;
  
  for (let i = Math.max(0, index - maxBars); i < index - minBars; i++) {
    if (highs[i] > maxPrice) {
      maxPrice = highs[i];
      maxIdx = i;
    }
  }
  
  return maxIdx >= 0 ? { index: maxIdx, price: maxPrice } : null;
}

function findHighAfterIndex(
  highs: number[],
  index: number,
  minBars: number,
  maxBars: number
): { index: number; price: number } | null {
  let maxPrice = -Infinity;
  let maxIdx = -1;
  
  for (let i = index + minBars; i < Math.min(highs.length, index + maxBars); i++) {
    if (highs[i] > maxPrice) {
      maxPrice = highs[i];
      maxIdx = i;
    }
  }
  
  return maxIdx >= 0 ? { index: maxIdx, price: maxPrice } : null;
}
