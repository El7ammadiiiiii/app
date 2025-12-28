/**
 * Bear Flag Pattern Detection
 * From ajaygm18/chart repository
 * A continuation pattern with strong downward movement followed by parallel consolidation
 */

export interface BearFlagPattern {
  type: 'bear_flag';
  direction: 'bearish';
  pole: { start: { index: number; price: number }; end: { index: number; price: number }; height: number };
  flag: { 
    upperLine: { start: { index: number; price: number }; end: { index: number; price: number } };
    lowerLine: { start: { index: number; price: number }; end: { index: number; price: number } };
  };
  target: number;
  confidence: number;
}

export interface BearFlagConfig {
  minPoleDrop: number;
  flagSlopeTolerance: number;
  maxFlagDuration: number;
  minFlagDuration: number;
  minPoleBars: number;
  maxPoleBars: number;
  parallelismTolerance: number;
  minRSquared: number;
}

const DEFAULT_CONFIG: BearFlagConfig = {
  minPoleDrop: 0.05, // Increased from 0.04
  flagSlopeTolerance: 0.01, // Tightened from 0.015
  maxFlagDuration: 25, // Decreased from 30
  minFlagDuration: 5,
  minPoleBars: 5,
  maxPoleBars: 20,
  parallelismTolerance: 0.3,
  minRSquared: 0.70,
};

export function detectBearFlag(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<BearFlagConfig> = {}
): BearFlagPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: BearFlagPattern[] = [];

  // Scan for potential poles with variable lengths
  for (let poleLength = cfg.minPoleBars; poleLength <= cfg.maxPoleBars; poleLength++) {
    for (let i = poleLength; i < closes.length - cfg.minFlagDuration; i++) {
      const poleStart = i - poleLength;
      const poleEnd = i;
      const poleDrop = (closes[poleStart] - closes[poleEnd]) / closes[poleStart];

      if (poleDrop < cfg.minPoleDrop) continue;

      // Validate pole quality
      const poleQuality = validatePoleQuality(closes, poleStart, poleEnd, 'bearish');
      if (poleQuality < 0.6) continue;

      // Look for consolidation after pole
      const flagStart = poleEnd;
      const flagEnd = Math.min(flagStart + cfg.maxFlagDuration, closes.length - 1);

      const flagHighs = findPivotHighsInRange(highs, flagStart, flagEnd);
      const flagLows = findPivotLowsInRange(lows, flagStart, flagEnd);

      if (flagHighs.length < 2 || flagLows.length < 2) continue;

      // Calculate trendlines with R²
      const upperTrendline = calculateTrendlineWithRSquared(flagHighs);
      const lowerTrendline = calculateTrendlineWithRSquared(flagLows);

      if (upperTrendline.rSquared < cfg.minRSquared || lowerTrendline.rSquared < cfg.minRSquared) continue;

      // Flag should be slightly ascending or flat (counter-trend)
      if (upperTrendline.slope < -cfg.flagSlopeTolerance || lowerTrendline.slope < -cfg.flagSlopeTolerance) continue;

      // Check parallelism
      const slopeDiff = Math.abs(upperTrendline.slope - lowerTrendline.slope);
      const avgSlope = (Math.abs(upperTrendline.slope) + Math.abs(lowerTrendline.slope)) / 2;
      const parallelism = avgSlope > 0 ? 1 - (slopeDiff / avgSlope) : 1;
      if (parallelism < (1 - cfg.parallelismTolerance)) continue;

      const actualFlagEnd = flagHighs[flagHighs.length - 1].index;
      const flagDuration = actualFlagEnd - flagStart;
      if (flagDuration < cfg.minFlagDuration) continue;

      // Calculate target
      const poleHeight = closes[poleStart] - closes[poleEnd];
      const target = closes[actualFlagEnd] - poleHeight;

      // Multi-factor confidence scoring
      const confidence = (
        poleQuality * 0.25 +
        upperTrendline.rSquared * 0.20 +
        lowerTrendline.rSquared * 0.20 +
        parallelism * 0.20 +
        Math.max(0, 1 - Math.abs(upperTrendline.slope) / cfg.flagSlopeTolerance) * 0.15
      );

      if (confidence < 0.60) continue;

      patterns.push({
        type: 'bear_flag',
        direction: 'bearish',
        pole: { 
          start: { index: poleStart, price: closes[poleStart] },
          end: { index: poleEnd, price: closes[poleEnd] },
          height: poleHeight
        },
        flag: {
          upperLine: { start: flagHighs[0], end: flagHighs[flagHighs.length - 1] },
          lowerLine: { start: flagLows[0], end: flagLows[flagLows.length - 1] }
        },
        target,
        confidence: Math.min(confidence, 1),
      });
    }
  }

  return removeDuplicatePatterns(patterns);
}

function validatePoleQuality(closes: number[], start: number, end: number, direction: 'bullish' | 'bearish'): number {
  const poleData = closes.slice(start, end + 1);
  let trendingBars = 0;
  
  for (let i = 1; i < poleData.length; i++) {
    if (direction === 'bullish' && poleData[i] > poleData[i - 1]) trendingBars++;
    if (direction === 'bearish' && poleData[i] < poleData[i - 1]) trendingBars++;
  }
  
  return trendingBars / (poleData.length - 1);
}

function findPivotHighsInRange(highs: number[], start: number, end: number): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  for (let i = start + 1; i < end; i++) {
    if (i > 0 && i < highs.length - 1 &&
        highs[i] >= highs[i - 1] && highs[i] >= highs[i + 1]) {
      pivots.push({ index: i, price: highs[i] });
    }
  }
  return pivots;
}

function findPivotLowsInRange(lows: number[], start: number, end: number): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  for (let i = start + 1; i < end; i++) {
    if (i > 0 && i < lows.length - 1 &&
        lows[i] <= lows[i - 1] && lows[i] <= lows[i + 1]) {
      pivots.push({ index: i, price: lows[i] });
    }
  }
  return pivots;
}

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

function removeDuplicatePatterns(patterns: BearFlagPattern[]): BearFlagPattern[] {
  if (patterns.length <= 1) return patterns;
  
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const result: BearFlagPattern[] = [];
  const usedRanges: Array<{start: number; end: number}> = [];
  
  for (const pattern of patterns) {
    const start = pattern.pole.start.index;
    const end = pattern.flag.upperLine.end.index;
    
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
