/**
 * Channel Up Pattern Detection
 * From ajaygm18/chart repository
 * A bullish pattern with parallel ascending support and resistance lines
 */

export interface ChannelUpPattern {
  type: 'channel_up';
  direction: 'bullish';
  upperLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
  lowerLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
  width: number;
  confidence: number;
}

export interface ChannelUpConfig {
  minTouches: number;
  parallelTolerance: number; // How parallel lines should be
  minPatternBars: number;
  minRSquared: number;
  minSlopeAngle: number; // Minimum slope for ascending
  adaptivePivotWindow: boolean;
}

const DEFAULT_CONFIG: ChannelUpConfig = {
  minTouches: 3, // Increased from 2
  parallelTolerance: 0.15, // Tightened from 0.2
  minPatternBars: 15, // Increased from 10
  minRSquared: 0.80,
  minSlopeAngle: 0.0001, // Minimum positive slope
  adaptivePivotWindow: true,
};

export function detectChannelUp(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<ChannelUpConfig> = {}
): ChannelUpPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: ChannelUpPattern[] = [];

  // Adaptive pivot window
  const pivotWindow = cfg.adaptivePivotWindow ? calculateAdaptiveWindow(highs, lows) : 2;
  
  const pivotHighs = findPivotHighs(highs, pivotWindow);
  const pivotLows = findPivotLows(lows, pivotWindow);

  if (pivotHighs.length < cfg.minTouches || pivotLows.length < cfg.minTouches) return patterns;

  // Find ascending channel using multiple pivot points
  for (let startIdx = 0; startIdx < pivotLows.length - 1; startIdx++) {
    const lowerStart = pivotLows[startIdx];
    
    // Look for channels of various lengths
    for (let endOffset = 1; endOffset < Math.min(5, pivotLows.length - startIdx); endOffset++) {
      const lowerEnd = pivotLows[startIdx + endOffset];
      const duration = lowerEnd.index - lowerStart.index;
      
      if (duration < cfg.minPatternBars) continue;

      // Get all lows in this range for trendline
      const rangeLows = pivotLows.filter(l => 
        l.index >= lowerStart.index && l.index <= lowerEnd.index
      );
      
      if (rangeLows.length < cfg.minTouches) continue;

      // Calculate lower trendline with R²
      const lowerTrendline = calculateTrendlineWithRSquared(rangeLows);
      
      // Must be ascending with good fit
      if (lowerTrendline.slope < cfg.minSlopeAngle || lowerTrendline.rSquared < cfg.minRSquared) continue;

      // Find corresponding highs for upper line
      const rangeHighs = pivotHighs.filter(h => 
        h.index >= lowerStart.index && h.index <= lowerEnd.index
      );

      if (rangeHighs.length < cfg.minTouches) continue;

      // Calculate upper trendline with R²
      const upperTrendline = calculateTrendlineWithRSquared(rangeHighs);

      // Upper must also be ascending with good fit
      if (upperTrendline.slope < cfg.minSlopeAngle || upperTrendline.rSquared < cfg.minRSquared) continue;

      // Check parallelism
      const slopeDiff = Math.abs(upperTrendline.slope - lowerTrendline.slope) / Math.abs(lowerTrendline.slope);
      if (slopeDiff > cfg.parallelTolerance) continue;

      // Calculate channel width (should be relatively consistent)
      const startWidth = (upperTrendline.slope * lowerStart.index + upperTrendline.intercept) - lowerStart.price;
      const endWidth = (upperTrendline.slope * lowerEnd.index + upperTrendline.intercept) - lowerEnd.price;
      const widthConsistency = Math.min(startWidth, endWidth) / Math.max(startWidth, endWidth);
      
      if (widthConsistency < 0.7) continue; // Width should be fairly consistent

      const width = (startWidth + endWidth) / 2;

      // Multi-factor confidence scoring
      const upperRSquaredScore = upperTrendline.rSquared;
      const lowerRSquaredScore = lowerTrendline.rSquared;
      const parallelismScore = 1 - slopeDiff / cfg.parallelTolerance;
      const widthConsistencyScore = widthConsistency;
      const touchesScore = Math.min((rangeHighs.length + rangeLows.length) / 8, 1);

      const confidence = (
        upperRSquaredScore * 0.20 +
        lowerRSquaredScore * 0.20 +
        parallelismScore * 0.25 +
        widthConsistencyScore * 0.20 +
        touchesScore * 0.15
      );

      if (confidence < 0.60) continue;

      patterns.push({
        type: 'channel_up',
        direction: 'bullish',
        upperLine: {
          start: rangeHighs[0],
          end: rangeHighs[rangeHighs.length - 1],
          slope: upperTrendline.slope,
        },
        lowerLine: {
          start: lowerStart,
          end: lowerEnd,
          slope: lowerTrendline.slope,
        },
        width,
        confidence: Math.min(confidence, 1),
      });
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
function removeDuplicatePatterns(patterns: ChannelUpPattern[]): ChannelUpPattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: ChannelUpPattern[] = [];
  const usedRanges: Array<{start: number; end: number}> = [];
  
  for (const pattern of patterns) {
    const start = pattern.lowerLine.start.index;
    const end = pattern.lowerLine.end.index;
    
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
