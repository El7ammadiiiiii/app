/**
 * Falling Wedge Pattern Detection
 * From ajaygm18/chart repository
 * A bullish reversal pattern with both support and resistance lines falling but converging
 */

export interface FallingWedgePattern {
  type: 'falling_wedge';
  direction: 'bullish';
  upperLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
  lowerLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
  apex: { index: number; price: number };
  target: number;
  confidence: number;
}

export interface FallingWedgeConfig {
  minTouches: number;
  minPatternBars: number;
  minRSquared: number;
  minConvergenceRate: number;
  maxSlopeRatio: number;
  adaptivePivotWindow: boolean;
}

const DEFAULT_CONFIG: FallingWedgeConfig = {
  minTouches: 3, // Increased from 2
  minPatternBars: 15, // Increased from 10
  minRSquared: 0.80,
  minConvergenceRate: 0.0005,
  maxSlopeRatio: 0.9,
  adaptivePivotWindow: true,
};

export function detectFallingWedge(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<FallingWedgeConfig> = {}
): FallingWedgePattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: FallingWedgePattern[] = [];

  // Adaptive pivot window
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 2;
  
  const pivotHighs = findPivotHighs(highs, pivotWindow);
  const pivotLows = findPivotLows(lows, pivotWindow);

  if (pivotHighs.length < 2 || pivotLows.length < 2) return patterns;

  // Find wedge patterns using trendline regression
  for (let startIdx = 0; startIdx < Math.min(pivotHighs.length - 1, pivotLows.length - 1); startIdx++) {
    const upperStart = pivotHighs[startIdx];
    const lowerStart = pivotLows.find(l => Math.abs(l.index - upperStart.index) <= 5);
    
    if (!lowerStart) continue;

    // Find all pivots in a reasonable range
    for (let endOffset = 1; endOffset < Math.min(5, pivotHighs.length - startIdx, pivotLows.length); endOffset++) {
      const rangeEnd = upperStart.index + 50;
      
      const rangeHighs = pivotHighs.filter(h => 
        h.index >= upperStart.index && h.index <= rangeEnd
      );
      const rangeLows = pivotLows.filter(l => 
        l.index >= lowerStart.index && l.index <= rangeEnd
      );

      if (rangeHighs.length < cfg.minTouches || rangeLows.length < cfg.minTouches) continue;

      const duration = Math.max(...rangeHighs.map(h => h.index), ...rangeLows.map(l => l.index)) - 
                       Math.min(upperStart.index, lowerStart.index);
      if (duration < cfg.minPatternBars) continue;

      // Calculate trendlines with R²
      const upperTrendline = calculateTrendlineWithRSquared(rangeHighs);
      const lowerTrendline = calculateTrendlineWithRSquared(rangeLows);

      // Both lines must be falling
      if (upperTrendline.slope >= 0 || lowerTrendline.slope >= 0) continue;

      // Check R² for both lines
      if (upperTrendline.rSquared < cfg.minRSquared || lowerTrendline.rSquared < cfg.minRSquared) continue;

      // Upper line must fall faster (converging) - |upper slope| > |lower slope|
      const slopeRatio = Math.abs(lowerTrendline.slope) / Math.abs(upperTrendline.slope);
      if (slopeRatio >= 1 || slopeRatio < cfg.maxSlopeRatio * 0.5) continue;

      // Calculate convergence rate
      const startGap = (upperTrendline.slope * upperStart.index + upperTrendline.intercept) -
                      (lowerTrendline.slope * lowerStart.index + lowerTrendline.intercept);
      const endIdx = rangeHighs[rangeHighs.length - 1].index;
      const endGap = (upperTrendline.slope * endIdx + upperTrendline.intercept) -
                    (lowerTrendline.slope * endIdx + lowerTrendline.intercept);
      const convergenceRate = (startGap - endGap) / duration;

      if (convergenceRate < cfg.minConvergenceRate) continue;

      // Calculate apex
      const apexIndex = Math.round((lowerTrendline.intercept - upperTrendline.intercept) / 
                                   (upperTrendline.slope - lowerTrendline.slope));
      const apexPrice = upperTrendline.slope * apexIndex + upperTrendline.intercept;

      // Validate apex is in the future
      if (apexIndex <= endIdx) continue;

      // Target: pattern height projected upward
      const patternHeight = (upperTrendline.slope * upperStart.index + upperTrendline.intercept) -
                           (lowerTrendline.slope * lowerStart.index + lowerTrendline.intercept);
      const target = upperStart.price + patternHeight;

      // Multi-factor confidence scoring
      const upperRSquaredScore = upperTrendline.rSquared;
      const lowerRSquaredScore = lowerTrendline.rSquared;
      const convergenceScore = Math.min(convergenceRate / 0.002, 1);
      const touchesScore = Math.min((rangeHighs.length + rangeLows.length) / 8, 1);
      const durationScore = Math.min(duration / 30, 1);

      const confidence = (
        upperRSquaredScore * 0.20 +
        lowerRSquaredScore * 0.20 +
        convergenceScore * 0.25 +
        touchesScore * 0.20 +
        durationScore * 0.15
      );

      if (confidence < 0.60) continue;

      patterns.push({
        type: 'falling_wedge',
        direction: 'bullish',
        upperLine: { start: rangeHighs[0], end: rangeHighs[rangeHighs.length - 1], slope: upperTrendline.slope },
        lowerLine: { start: rangeLows[0], end: rangeLows[rangeLows.length - 1], slope: lowerTrendline.slope },
        apex: { index: apexIndex, price: apexPrice },
        target,
        confidence: Math.min(confidence, 1),
      });
      
      break;
    }
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
function removeDuplicatePatterns(patterns: FallingWedgePattern[]): FallingWedgePattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: FallingWedgePattern[] = [];
  const usedRanges: Array<{start: number; end: number}> = [];
  
  for (const pattern of patterns) {
    const start = Math.min(pattern.upperLine.start.index, pattern.lowerLine.start.index);
    const end = Math.max(pattern.upperLine.end.index, pattern.lowerLine.end.index);
    
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
