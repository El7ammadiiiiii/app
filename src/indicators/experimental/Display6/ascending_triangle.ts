/**
 * Ascending Triangle Pattern Detection
 * From ajaygm18/chart repository
 * A continuation/reversal pattern with horizontal resistance and rising support
 */

export interface AscendingTrianglePattern {
  type: 'ascending_triangle';
  direction: 'bullish';
  resistanceLine: { start: { index: number; price: number }; end: { index: number; price: number } };
  supportLine: { start: { index: number; price: number }; end: { index: number; price: number } };
  apex: { index: number; price: number };
  target: number;
  confidence: number;
}

export interface AscendingTriangleConfig {
  resistanceDeviation: number; // Max deviation for horizontal resistance
  minTouches: number; // Min touches for each line
  minPatternBars: number;
  minRSquared: number; // Minimum R² for trendline fit
  minConvergenceRate: number; // Minimum convergence rate
  adaptivePivotWindow: boolean;
}

const DEFAULT_CONFIG: AscendingTriangleConfig = {
  resistanceDeviation: 0.015, // Tightened from 0.02
  minTouches: 3, // Increased from 2
  minPatternBars: 15, // Increased from 10
  minRSquared: 0.85, // Minimum R² for trendline
  minConvergenceRate: 0.001, // Minimum convergence
  adaptivePivotWindow: true,
};

export function detectAscendingTriangle(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<AscendingTriangleConfig> = {}
): AscendingTrianglePattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: AscendingTrianglePattern[] = [];

  // Adaptive pivot window
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 2;
  
  const pivotHighs = findPivotHighs(highs, pivotWindow);
  const pivotLows = findPivotLows(lows, pivotWindow);

  // Find horizontal resistance (roughly equal highs)
  for (let i = 0; i < pivotHighs.length - 1; i++) {
    const resistStart = pivotHighs[i];
    const resistEnd = pivotHighs[i + 1];

    // Check pattern duration
    const duration = resistEnd.index - resistStart.index;
    if (duration < cfg.minPatternBars) continue;

    // Check if resistance is horizontal
    const resistDev = Math.abs(resistEnd.price - resistStart.price) / resistStart.price;
    if (resistDev > cfg.resistanceDeviation) {
      continue;
    }

    const resistPrice = (resistStart.price + resistEnd.price) / 2;

    // Find ascending support line (rising lows)
    const relevantLows = pivotLows.filter(
      l => l.index >= resistStart.index && l.index <= resistEnd.index
    );

    if (relevantLows.length < cfg.minTouches) {
      continue;
    }

    // Linear regression with R² validation
    const supportLine = calculateTrendlineWithRSquared(relevantLows);
    
    // Verify support is ascending with good fit
    if (supportLine.slope <= 0 || supportLine.rSquared < cfg.minRSquared) {
      continue;
    }

    // Verify convergence (lines coming together)
    const startGap = resistPrice - (supportLine.slope * resistStart.index + supportLine.intercept);
    const endGap = resistPrice - (supportLine.slope * resistEnd.index + supportLine.intercept);
    const convergenceRate = (startGap - endGap) / duration;
    
    if (convergenceRate < cfg.minConvergenceRate) {
      continue;
    }

    // Calculate apex (intersection point)
    const apexIndex = Math.round((resistPrice - supportLine.intercept) / supportLine.slope);
    const apexPrice = resistPrice;

    // Validate apex is in the future
    if (apexIndex <= resistEnd.index) continue;

    // Calculate target (height of pattern projected upward)
    const patternHeight = resistPrice - supportLine.intercept;
    const target = resistPrice + patternHeight;

    // Multi-factor confidence scoring
    const rSquaredScore = supportLine.rSquared;
    const touchesScore = Math.min(relevantLows.length / 5, 1); // More touches = better
    const horizontalScore = 1 - (resistDev / cfg.resistanceDeviation);
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
      type: 'ascending_triangle',
      direction: 'bullish',
      resistanceLine: { start: resistStart, end: resistEnd },
      supportLine: { 
        start: relevantLows[0], 
        end: relevantLows[relevantLows.length - 1] 
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

// Calculate trendline with R² (coefficient of determination)
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

  // Calculate R²
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
function removeDuplicatePatterns(patterns: AscendingTrianglePattern[]): AscendingTrianglePattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: AscendingTrianglePattern[] = [];
  const usedRanges: Array<{start: number; end: number}> = [];
  
  for (const pattern of patterns) {
    const start = pattern.supportLine.start.index;
    const end = pattern.resistanceLine.end.index;
    
    // Check for overlap
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
