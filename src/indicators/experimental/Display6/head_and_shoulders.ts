/**
 * Head and Shoulders Pattern Detection
 * From ajaygm18/chart repository
 * A reversal pattern with three peaks - higher middle peak (head) between two lower peaks (shoulders)
 */

export interface HeadAndShouldersPattern {
  type: 'head_and_shoulders';
  direction: 'bearish';
  leftShoulder: { index: number; price: number };
  head: { index: number; price: number };
  rightShoulder: { index: number; price: number };
  neckline: { start: number; end: number; price: number };
  target: number;
  confidence: number;
}

export interface HeadAndShouldersConfig {
  minShoulderSymmetry: number; // 0.95 = 95% symmetry
  maxShoulderSymmetry: number; // Maximum symmetry ratio
  necklineDeviation: number; // 0.02 = 2% max deviation
  minPatternBars: number; // minimum bars for pattern
  minHeadProminence: number; // Head must be X% higher than shoulders
  maxNecklineSlope: number; // Maximum neckline slope
  minTimeBetweenPivots: number; // Min bars between pivots
  adaptivePivotWindow: boolean; // Use adaptive pivot detection
}

const DEFAULT_CONFIG: HeadAndShouldersConfig = {
  minShoulderSymmetry: 0.90, // Increased from 0.85
  maxShoulderSymmetry: 1.05, // Shoulders shouldn't be too identical (suspicious)
  necklineDeviation: 0.03, // Tightened from 0.05
  minPatternBars: 20, // Increased from 15
  minHeadProminence: 0.02, // Head must be 2% higher than shoulders
  maxNecklineSlope: 0.15, // Neckline shouldn't be too steep
  minTimeBetweenPivots: 3, // At least 3 bars between pivots
  adaptivePivotWindow: true, // Use adaptive detection
};

export function detectHeadAndShoulders(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<HeadAndShouldersConfig> = {}
): HeadAndShouldersPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: HeadAndShouldersPattern[] = [];
  const len = highs.length;

  if (len < cfg.minPatternBars) return patterns;

  // Adaptive pivot window based on data volatility
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 3;
  
  // Find pivot highs with adaptive window
  const pivotHighs = findPivotHighs(highs, pivotWindow);

  for (let i = 2; i < pivotHighs.length; i++) {
    const leftShoulder = pivotHighs[i - 2];
    const head = pivotHighs[i - 1];
    const rightShoulder = pivotHighs[i];

    // Time spacing validation
    if (head.index - leftShoulder.index < cfg.minTimeBetweenPivots ||
        rightShoulder.index - head.index < cfg.minTimeBetweenPivots) {
      continue;
    }

    // Head must be significantly higher than both shoulders
    const minHeadHeight = Math.max(leftShoulder.price, rightShoulder.price) * (1 + cfg.minHeadProminence);
    if (head.price < minHeadHeight) {
      continue;
    }

    // Shoulders should be roughly equal (symmetry check) but not suspiciously identical
    const shoulderRatio = Math.min(leftShoulder.price, rightShoulder.price) / 
                         Math.max(leftShoulder.price, rightShoulder.price);
    
    if (shoulderRatio < cfg.minShoulderSymmetry || shoulderRatio > cfg.maxShoulderSymmetry) {
      continue;
    }

    // Find neckline points (lows between shoulders)
    const necklineStart = findLowestBetween(lows, leftShoulder.index, head.index);
    const necklineEnd = findLowestBetween(lows, head.index, rightShoulder.index);
    
    // Validate neckline slope (shouldn't be too steep)
    const necklineSlope = Math.abs(lows[necklineEnd] - lows[necklineStart]) / 
                          Math.max(lows[necklineStart], lows[necklineEnd]);
    if (necklineSlope > cfg.maxNecklineSlope) {
      continue;
    }
    
    const necklinePrice = (lows[necklineStart] + lows[necklineEnd]) / 2;

    // Validate pattern proportions
    const leftHeight = head.price - lows[necklineStart];
    const rightHeight = head.price - lows[necklineEnd];
    const heightRatio = Math.min(leftHeight, rightHeight) / Math.max(leftHeight, rightHeight);
    if (heightRatio < 0.7) continue; // Heights should be balanced

    // Calculate target with Fibonacci extension
    const headToNeckline = head.price - necklinePrice;
    const target = necklinePrice - headToNeckline * 1.0; // 100% projection

    // Multi-factor confidence scoring
    const symmetryScore = shoulderRatio;
    const prominenceScore = Math.min((head.price / minHeadHeight - 1) / 0.05, 1); // Bonus for clearer head
    const necklineScore = 1 - (necklineSlope / cfg.maxNecklineSlope);
    const heightBalanceScore = heightRatio;
    const timeSymmetryScore = calculateTimeSymmetry(leftShoulder.index, head.index, rightShoulder.index);
    const volumeValidation = validateVolumePattern(closes, leftShoulder.index, head.index, rightShoulder.index);

    const confidence = (
      symmetryScore * 0.25 +
      prominenceScore * 0.15 +
      necklineScore * 0.15 +
      heightBalanceScore * 0.15 +
      timeSymmetryScore * 0.15 +
      volumeValidation * 0.15
    );

    // Only add patterns with sufficient confidence
    if (confidence < 0.6) continue;

    patterns.push({
      type: 'head_and_shoulders',
      direction: 'bearish',
      leftShoulder,
      head,
      rightShoulder,
      neckline: { start: necklineStart, end: necklineEnd, price: necklinePrice },
      target,
      confidence: Math.min(confidence, 1),
    });
  }

  // Sort by confidence and remove overlapping patterns
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

// Calculate adaptive pivot window based on price volatility
function calculateAdaptiveWindow(highs: number[], lows: number[]): number {
  if (highs.length < 20) return 3;
  
  // Calculate ATR-like volatility
  let totalRange = 0;
  for (let i = 1; i < Math.min(20, highs.length); i++) {
    totalRange += highs[i] - lows[i];
  }
  const avgRange = totalRange / 19;
  const avgPrice = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
  const volatility = avgRange / avgPrice;
  
  // Higher volatility = larger window
  if (volatility > 0.05) return 5;
  if (volatility > 0.03) return 4;
  return 3;
}

// Calculate time symmetry between left shoulder, head, and right shoulder
function calculateTimeSymmetry(leftIdx: number, headIdx: number, rightIdx: number): number {
  const leftDuration = headIdx - leftIdx;
  const rightDuration = rightIdx - headIdx;
  const ratio = Math.min(leftDuration, rightDuration) / Math.max(leftDuration, rightDuration);
  return ratio;
}

// Validate volume pattern (volume should be highest at left shoulder, decline at head)
function validateVolumePattern(
  closes: number[],
  leftIdx: number,
  headIdx: number,
  rightIdx: number
): number {
  // Using price change as proxy for volume if volume not available
  const leftChange = Math.abs(closes[leftIdx] - closes[Math.max(0, leftIdx - 1)]);
  const headChange = Math.abs(closes[headIdx] - closes[Math.max(0, headIdx - 1)]);
  const rightChange = Math.abs(closes[rightIdx] - closes[Math.max(0, rightIdx - 1)]);
  
  // Ideal: left > head > right or left > right > head
  if (leftChange >= headChange && headChange >= rightChange) return 1.0;
  if (leftChange >= rightChange) return 0.8;
  return 0.6;
}

// Remove overlapping/duplicate patterns, keeping highest confidence
function removeDuplicatePatterns(patterns: HeadAndShouldersPattern[]): HeadAndShouldersPattern[] {
  if (patterns.length <= 1) return patterns;
  
  // Sort by confidence descending
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: HeadAndShouldersPattern[] = [];
  const usedIndices = new Set<number>();
  
  for (const pattern of patterns) {
    const indices = [
      pattern.leftShoulder.index,
      pattern.head.index,
      pattern.rightShoulder.index
    ];
    
    // Check if any key index is already used
    if (!indices.some(idx => usedIndices.has(idx))) {
      result.push(pattern);
      indices.forEach(idx => usedIndices.add(idx));
    }
  }
  
  return result;
}
