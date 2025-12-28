/**
 * Descending Triangle Pattern Detection
 * From ajaygm18/chart repository
 * A continuation/reversal pattern with horizontal support and falling resistance
 */

export interface DescendingTrianglePattern {
  type: 'descending_triangle';
  direction: 'bearish';
  supportLine: { start: { index: number; price: number }; end: { index: number; price: number } };
  resistanceLine: { start: { index: number; price: number }; end: { index: number; price: number } };
  apex: { index: number; price: number };
  target: number;
  confidence: number;
}

export interface DescendingTriangleConfig {
  supportDeviation: number;
  minTouches: number;
  minPatternBars: number;
  minRSquared: number;
  minConvergenceRate: number;
  adaptivePivotWindow: boolean;
}

const DEFAULT_CONFIG: DescendingTriangleConfig = {
  supportDeviation: 0.015, // Tightened from 0.02
  minTouches: 3, // Increased from 2
  minPatternBars: 15, // Increased from 10
  minRSquared: 0.85,
  minConvergenceRate: 0.001,
  adaptivePivotWindow: true,
};

export function detectDescendingTriangle(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<DescendingTriangleConfig> = {}
): DescendingTrianglePattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: DescendingTrianglePattern[] = [];

  // Adaptive pivot window
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 2;
  
  const pivotHighs = findPivotHighs(highs, pivotWindow);
  const pivotLows = findPivotLows(lows, pivotWindow);

  // Find horizontal support (roughly equal lows)
  for (let i = 0; i < pivotLows.length - 1; i++) {
    const supportStart = pivotLows[i];
    const supportEnd = pivotLows[i + 1];

    // Check pattern duration
    const duration = supportEnd.index - supportStart.index;
    if (duration < cfg.minPatternBars) continue;

    // Check if support is horizontal
    const supportDev = Math.abs(supportEnd.price - supportStart.price) / supportStart.price;
    if (supportDev > cfg.supportDeviation) {
      continue;
    }

    const supportPrice = (supportStart.price + supportEnd.price) / 2;

    // Find descending resistance line (falling highs)
    const relevantHighs = pivotHighs.filter(
      h => h.index >= supportStart.index && h.index <= supportEnd.index
    );

    if (relevantHighs.length < cfg.minTouches) {
      continue;
    }

    // Linear regression with R² validation
    const resistanceLine = calculateTrendlineWithRSquared(relevantHighs);
    
    // Verify resistance is descending with good fit
    if (resistanceLine.slope >= 0 || resistanceLine.rSquared < cfg.minRSquared) {
      continue;
    }

    // Verify convergence
    const startGap = (resistanceLine.slope * supportStart.index + resistanceLine.intercept) - supportPrice;
    const endGap = (resistanceLine.slope * supportEnd.index + resistanceLine.intercept) - supportPrice;
    const convergenceRate = (startGap - endGap) / duration;
    
    if (convergenceRate < cfg.minConvergenceRate) {
      continue;
    }

    // Calculate apex
    const apexIndex = Math.round((supportPrice - resistanceLine.intercept) / resistanceLine.slope);
    const apexPrice = supportPrice;

    // Validate apex is in the future
    if (apexIndex <= supportEnd.index) continue;

    // Calculate target
    const patternHeight = resistanceLine.intercept - supportPrice;
    const target = supportPrice - patternHeight;

    // Multi-factor confidence scoring
    const rSquaredScore = resistanceLine.rSquared;
    const touchesScore = Math.min(relevantHighs.length / 5, 1);
    const horizontalScore = 1 - (supportDev / cfg.supportDeviation);
    const convergenceScore = Math.min(convergenceRate / 0.005, 1);
    const durationScore = Math.min(duration / 30, 1);

    const confidence = (
      rSquaredScore * 0.25 +
      touchesScore * 0.20 +
      horizontalScore * 0.20 +
      convergenceScore * 0.20 +
      durationScore * 0.15
    );

    if (confidence < 0.60) continue;

    patterns.push({
      type: 'descending_triangle',
      direction: 'bearish',
      supportLine: { start: supportStart, end: supportEnd },
      resistanceLine: { 
        start: relevantHighs[0], 
        end: relevantHighs[relevantHighs.length - 1] 
      },
      apex: { index: apexIndex, price: apexPrice },
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

function calculateTrendline(points: Array<{ index: number; price: number }>): { slope: number; intercept: number } {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const p of points) {
    sumX += p.index;
    sumY += p.price;
    sumXY += p.index * p.price;
    sumX2 += p.index * p.index;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// Calculate trendline with R²
function calculateTrendlineWithRSquared(points: Array<{ index: number; price: number }>): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const p of points) {
    sumX += p.index;
    sumY += p.price;
    sumXY += p.index * p.price;
    sumX2 += p.index * p.index;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssTotal = 0, ssResidual = 0;
  
  for (const p of points) {
    const predicted = slope * p.index + intercept;
    ssTotal += Math.pow(p.price - meanY, 2);
    ssResidual += Math.pow(p.price - predicted, 2);
  }

  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  return { slope, intercept, rSquared };
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

// Remove duplicate patterns
function removeDuplicatePatterns(patterns: DescendingTrianglePattern[]): DescendingTrianglePattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: DescendingTrianglePattern[] = [];
  const usedRanges: Array<{start: number; end: number}> = [];
  
  for (const pattern of patterns) {
    const start = pattern.resistanceLine.start.index;
    const end = pattern.supportLine.end.index;
    
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
