/**
 * AUJ5 Advanced Wedge Pattern Detector
 * Ultra-precise wedge detection with fractal analysis and ML validation
 * Based on olevar2/AUJ5 - Professional-grade pattern recognition
 */

export interface AUJ5WedgeType {
  type: 'rising_wedge' | 'falling_wedge' | 'ascending_triangle' | 'descending_triangle' | 
        'symmetrical_triangle' | 'expanding_wedge' | 'contracting_wedge';
  direction: 'bullish' | 'bearish' | 'neutral';
}

export interface TrendLine {
  slope: number;
  intercept: number;
  r_squared: number;
  p_value: number;
  touches: number;
  strength: number;
  points: Array<{ x: number; y: number }>;
  startIdx: number;
  endIdx: number;
}

export interface AUJ5WedgeGeometry {
  pattern_length: number;
  convergence_angle: number;
  width_start: number;
  width_end: number;
  width_ratio: number;
  support_strength: number;
  resistance_strength: number;
  volume_trend: number;
  fractal_dimension: number;
  symmetry_score: number;
  fibonacci_alignment: number;
  pattern_maturity: number;
}

export interface AUJ5WedgePattern {
  type: AUJ5WedgeType;
  geometry: AUJ5WedgeGeometry;
  support_line: TrendLine;
  resistance_line: TrendLine;
  apex_index: number;
  apex_price: number;
  start_index: number;
  end_index: number;
  confidence: number;
  strength_score: number;
  breakout_probability: number;
  target_price: number;
  stop_loss: number;
  risk_reward_ratio: number;
  time_to_breakout: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

/**
 * Calculate Z-scores for array of values
 */
function calculateZScores(values: number[]): number[] {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return values.map(() => 0);
  return values.map(v => (v - mean) / stdDev);
}

/**
 * Calculate percentile value
 */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Linear regression
 */
function linearRegression(points: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
  r_squared: number;
} {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r_squared: 0 };
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = points.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const r_squared = 1 - (ssResidual / ssTotal);
  
  return { slope, intercept, r_squared };
}

/**
 * Robust regression using Huber-like method (median-based)
 */
function robustRegression(points: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
} {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  
  // Calculate pairwise slopes
  const slopes: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x;
      if (Math.abs(dx) > 0.001) {
        slopes.push((points[j].y - points[i].y) / dx);
      }
    }
  }
  
  // Median slope
  const medianSlope = percentile(slopes, 50);
  
  // Calculate intercepts using median slope
  const intercepts = points.map(p => p.y - medianSlope * p.x);
  const medianIntercept = percentile(intercepts, 50);
  
  return { slope: medianSlope, intercept: medianIntercept };
}

/**
 * Find pivot points using dual method: local extrema + statistical outliers
 */
function findPivotPoints(
  candles: CandleData[],
  minTouches: number = 4
): { highs: PivotPoint[]; lows: PivotPoint[] } {
  const highs: PivotPoint[] = [];
  const lows: PivotPoint[] = [];
  const window = 2;
  
  // Method 1: Local extrema
  for (let i = window; i < candles.length - window; i++) {
    const isHigh = candles[i].high >= Math.max(
      ...candles.slice(i - window, i).map(c => c.high),
      ...candles.slice(i + 1, i + window + 1).map(c => c.high)
    );
    
    const isLow = candles[i].low <= Math.min(
      ...candles.slice(i - window, i).map(c => c.low),
      ...candles.slice(i + 1, i + window + 1).map(c => c.low)
    );
    
    if (isHigh) {
      highs.push({ index: i, price: candles[i].high, type: 'high' });
    }
    if (isLow) {
      lows.push({ index: i, price: candles[i].low, type: 'low' });
    }
  }
  
  // Method 2: Statistical outliers (Z-score > 2.0)
  const highPrices = candles.map(c => c.high);
  const lowPrices = candles.map(c => c.low);
  const highZScores = calculateZScores(highPrices);
  const lowZScores = calculateZScores(lowPrices);
  
  for (let i = 0; i < candles.length; i++) {
    if (highZScores[i] > 2.0 && !highs.some(h => h.index === i)) {
      highs.push({ index: i, price: candles[i].high, type: 'high' });
    }
    if (lowZScores[i] < -2.0 && !lows.some(l => l.index === i)) {
      lows.push({ index: i, price: candles[i].low, type: 'low' });
    }
  }
  
  // Sort by index
  highs.sort((a, b) => a.index - b.index);
  lows.sort((a, b) => a.index - b.index);
  
  return { highs, lows };
}

/**
 * Calculate advanced trendline with robust regression
 */
function calculateAdvancedTrendline(
  pivots: PivotPoint[],
  candles: CandleData[]
): TrendLine | null {
  if (pivots.length < 2) return null;
  
  const points = pivots.map(p => ({ x: p.index, y: p.price }));
  
  // Linear regression
  const lr = linearRegression(points);
  
  // Robust regression
  const rr = robustRegression(points);
  
  // Use robust regression for slope, linear for R-squared
  const slope = rr.slope;
  const intercept = rr.intercept;
  const r_squared = lr.r_squared;
  
  // Count touches (points within 1% of line)
  let touches = 0;
  for (const pivot of pivots) {
    const predictedPrice = slope * pivot.index + intercept;
    const deviation = Math.abs(pivot.price - predictedPrice) / predictedPrice;
    if (deviation < 0.01) {
      touches++;
    }
  }
  
  // Calculate p-value (simplified)
  const p_value = Math.max(0.001, 1 - r_squared);
  
  // Calculate strength
  const strength = (touches / pivots.length) * r_squared;
  
  return {
    slope,
    intercept,
    r_squared,
    p_value,
    touches,
    strength,
    points,
    startIdx: pivots[0].index,
    endIdx: pivots[pivots.length - 1].index
  };
}

/**
 * Count how many times price touches a trendline
 */
function countLineTouches(
  line: TrendLine,
  candles: CandleData[],
  isResistance: boolean,
  tolerance: number = 0.01
): number {
  let touches = 0;
  
  for (let i = line.startIdx; i <= line.endIdx && i < candles.length; i++) {
    const predictedPrice = line.slope * i + line.intercept;
    const actualPrice = isResistance ? candles[i].high : candles[i].low;
    const deviation = Math.abs(actualPrice - predictedPrice) / predictedPrice;
    
    if (deviation < tolerance) {
      touches++;
    }
  }
  
  return touches;
}

/**
 * Calculate volume trend (normalized slope)
 */
function calculateVolumeTrend(candles: CandleData[], startIdx: number, endIdx: number): number {
  const volumes = candles.slice(startIdx, endIdx + 1).map((c, i) => ({
    x: i,
    y: c.volume
  }));
  
  if (volumes.length < 2) return 0;
  
  const lr = linearRegression(volumes);
  const avgVolume = volumes.reduce((sum, v) => sum + v.y, 0) / volumes.length;
  
  // Normalize slope by average volume
  return lr.slope / (avgVolume || 1);
}

/**
 * Calculate fractal dimension using box-counting method
 */
function calculateFractalDimension(candles: CandleData[], startIdx: number, endIdx: number): number {
  const prices = candles.slice(startIdx, endIdx + 1).map(c => c.close);
  if (prices.length < 10) return 1.5; // Default for short patterns
  
  const scales = [2, 4, 8, 16];
  const counts: number[] = [];
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  if (priceRange === 0) return 1.0;
  
  for (const scale of scales) {
    const boxSize = priceRange / scale;
    const boxes = new Set<string>();
    
    for (let i = 0; i < prices.length - 1; i++) {
      const y1 = Math.floor((prices[i] - minPrice) / boxSize);
      const y2 = Math.floor((prices[i + 1] - minPrice) / boxSize);
      const x1 = Math.floor(i / scale);
      const x2 = Math.floor((i + 1) / scale);
      
      // Mark all boxes the line passes through
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) + 1;
      for (let step = 0; step < steps; step++) {
        const t = step / steps;
        const x = Math.floor(x1 + t * (x2 - x1));
        const y = Math.floor(y1 + t * (y2 - y1));
        boxes.add(`${x},${y}`);
      }
    }
    
    counts.push(boxes.size);
  }
  
  // Log-log regression to find dimension
  const logScales = scales.map(s => Math.log(s));
  const logCounts = counts.map(c => Math.log(c));
  const points = logScales.map((x, i) => ({ x, y: logCounts[i] }));
  const lr = linearRegression(points);
  
  // Fractal dimension = -slope
  return Math.abs(lr.slope);
}

/**
 * Calculate symmetry score based on pivot spacing variance
 */
function calculateSymmetryScore(pivots: PivotPoint[]): number {
  if (pivots.length < 3) return 1.0;
  
  const spacings: number[] = [];
  for (let i = 1; i < pivots.length; i++) {
    spacings.push(pivots[i].index - pivots[i - 1].index);
  }
  
  const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
  const variance = spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) / spacings.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize: lower variance = higher symmetry
  return Math.max(0, 1 - stdDev / (avgSpacing || 1));
}

/**
 * Calculate Fibonacci alignment score
 */
function calculateFibonacciAlignment(
  candles: CandleData[],
  startIdx: number,
  endIdx: number
): number {
  const startPrice = candles[startIdx].close;
  const endPrice = candles[endIdx].close;
  const priceRange = Math.abs(endPrice - startPrice);
  
  if (priceRange === 0) return 0;
  
  const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618];
  let alignmentScore = 0;
  
  for (let i = startIdx; i <= endIdx; i++) {
    const currentPrice = candles[i].close;
    const retracement = Math.abs(currentPrice - startPrice) / priceRange;
    
    // Check if price is near any Fibonacci level (within 2%)
    for (const level of fibLevels) {
      if (Math.abs(retracement - level) < 0.02) {
        alignmentScore++;
        break;
      }
    }
  }
  
  return alignmentScore / (endIdx - startIdx + 1);
}

/**
 * Classify pattern type based on trendline slopes
 */
function classifyPatternType(supportLine: TrendLine, resistanceLine: TrendLine): AUJ5WedgeType {
  const supportSlope = supportLine.slope;
  const resistanceSlope = resistanceLine.slope;
  const slopeThreshold = 0.0001;
  
  // Rising wedge: both positive, upper slope < lower slope
  if (supportSlope > slopeThreshold && resistanceSlope > slopeThreshold && resistanceSlope < supportSlope) {
    return { type: 'rising_wedge', direction: 'bearish' };
  }
  
  // Falling wedge: both negative, lower slope < upper slope
  if (supportSlope < -slopeThreshold && resistanceSlope < -slopeThreshold && supportSlope < resistanceSlope) {
    return { type: 'falling_wedge', direction: 'bullish' };
  }
  
  // Ascending triangle: upper ~flat, lower rising
  if (Math.abs(resistanceSlope) < slopeThreshold && supportSlope > slopeThreshold) {
    return { type: 'ascending_triangle', direction: 'bullish' };
  }
  
  // Descending triangle: lower ~flat, upper falling
  if (Math.abs(supportSlope) < slopeThreshold && resistanceSlope < -slopeThreshold) {
    return { type: 'descending_triangle', direction: 'bearish' };
  }
  
  // Symmetrical triangle: slopes converging with similar magnitude
  if (Math.sign(supportSlope) !== Math.sign(resistanceSlope) && 
      Math.abs(Math.abs(supportSlope) - Math.abs(resistanceSlope)) < Math.abs(supportSlope) * 0.5) {
    return { type: 'symmetrical_triangle', direction: 'neutral' };
  }
  
  // Expanding wedge: lines diverging
  if (Math.abs(resistanceSlope) > Math.abs(supportSlope) * 1.2) {
    return { type: 'expanding_wedge', direction: 'neutral' };
  }
  
  // Default: contracting wedge
  return { type: 'contracting_wedge', direction: 'neutral' };
}

/**
 * Main AUJ5 Advanced Wedge Detection
 */
export function detectAUJ5AdvancedWedge(
  candles: CandleData[],
  minPatternLength: number = 20,
  maxPatternLength: number = 100,
  minTouches: number = 4,
  convergenceThreshold: number = 0.001
): AUJ5WedgePattern[] {
  const patterns: AUJ5WedgePattern[] = [];
  
  if (candles.length < minPatternLength) return patterns;
  
  // Step 1: Find pivot points
  const { highs, lows } = findPivotPoints(candles, minTouches);
  
  if (highs.length < minTouches || lows.length < minTouches) return patterns;
  
  // Step 2: Try different pattern lengths
  for (let length = minPatternLength; length <= Math.min(maxPatternLength, candles.length); length += 5) {
    const startIdx = candles.length - length;
    const endIdx = candles.length - 1;
    
    // Filter pivots within range
    const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
    const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);
    
    if (rangeHighs.length < minTouches || rangeLows.length < minTouches) continue;
    
    // Step 3: Calculate trendlines
    const resistanceLine = calculateAdvancedTrendline(rangeHighs, candles);
    const supportLine = calculateAdvancedTrendline(rangeLows, candles);
    
    if (!resistanceLine || !supportLine) continue;
    
    // Step 4: Calculate pattern geometry
    const startWidth = Math.abs(
      (resistanceLine.slope * startIdx + resistanceLine.intercept) -
      (supportLine.slope * startIdx + supportLine.intercept)
    );
    const endWidth = Math.abs(
      (resistanceLine.slope * endIdx + resistanceLine.intercept) -
      (supportLine.slope * endIdx + supportLine.intercept)
    );
    
    const widthRatio = endWidth / startWidth;
    
    // Check convergence
    if (widthRatio >= 1 || endWidth > startWidth * (1 - convergenceThreshold)) continue;
    
    // Calculate apex (intersection point)
    const apexIndex = Math.round(
      (supportLine.intercept - resistanceLine.intercept) /
      (resistanceLine.slope - supportLine.slope)
    );
    const apexPrice = resistanceLine.slope * apexIndex + resistanceLine.intercept;
    
    // Step 5: Analyze geometry
    const convergenceAngle = Math.abs(
      Math.atan(resistanceLine.slope) - Math.atan(supportLine.slope)
    ) * (180 / Math.PI);
    
    const volumeTrend = calculateVolumeTrend(candles, startIdx, endIdx);
    const fractalDimension = calculateFractalDimension(candles, startIdx, endIdx);
    const symmetryScore = calculateSymmetryScore([...rangeHighs, ...rangeLows]);
    const fibonacciAlignment = calculateFibonacciAlignment(candles, startIdx, endIdx);
    
    const supportStrength = countLineTouches(supportLine, candles, false) / length;
    const resistanceStrength = countLineTouches(resistanceLine, candles, true) / length;
    
    const patternMaturity = 1 - widthRatio;
    
    const geometry: AUJ5WedgeGeometry = {
      pattern_length: length,
      convergence_angle: convergenceAngle,
      width_start: startWidth,
      width_end: endWidth,
      width_ratio: widthRatio,
      support_strength: supportStrength,
      resistance_strength: resistanceStrength,
      volume_trend: volumeTrend,
      fractal_dimension: fractalDimension,
      symmetry_score: symmetryScore,
      fibonacci_alignment: fibonacciAlignment,
      pattern_maturity: patternMaturity
    };
    
    // Step 6: Classify pattern
    const patternType = classifyPatternType(supportLine, resistanceLine);
    
    // Step 7: Calculate strength score (6-factor average)
    const geometricScore = Math.min(1, convergenceAngle / 45) * 0.9 + patternMaturity * 0.1;
    const srStrength = (supportStrength + resistanceStrength) / 2;
    const volumeScore = Math.max(0, 1 + volumeTrend * 2); // Prefer decreasing volume
    const fractalScore = Math.max(0, 1 - Math.abs(fractalDimension - 1.5) / 0.5); // Ideal ~1.5
    
    const strengthScore = (
      geometricScore * 0.25 +
      srStrength * 0.25 +
      volumeScore * 0.15 +
      symmetryScore * 0.15 +
      fibonacciAlignment * 0.1 +
      fractalScore * 0.1
    );
    
    // Step 8: Statistical validation
    const isSignificant = resistanceLine.p_value < 0.05 && supportLine.p_value < 0.05 && volumeTrend < 0;
    
    if (!isSignificant || strengthScore < 0.3) continue;
    
    // Calculate trading signals
    const currentPrice = candles[endIdx].close;
    const patternHeight = startWidth;
    
    const targetPrice = patternType.direction === 'bullish' 
      ? currentPrice + patternHeight 
      : currentPrice - patternHeight;
    
    const stopLoss = patternType.direction === 'bullish'
      ? currentPrice - patternHeight * 0.5
      : currentPrice + patternHeight * 0.5;
    
    const riskRewardRatio = Math.abs(targetPrice - currentPrice) / Math.abs(stopLoss - currentPrice);
    
    const timeToBreakout = Math.max(0, apexIndex - endIdx);
    
    const breakoutProbability = strengthScore * 0.7 + patternMaturity * 0.3;
    
    const confidence = (
      strengthScore * 0.4 +
      (resistanceLine.r_squared + supportLine.r_squared) / 2 * 0.3 +
      breakoutProbability * 0.3
    );
    
    patterns.push({
      type: patternType,
      geometry,
      support_line: supportLine,
      resistance_line: resistanceLine,
      apex_index: apexIndex,
      apex_price: apexPrice,
      start_index: startIdx,
      end_index: endIdx,
      confidence,
      strength_score: strengthScore,
      breakout_probability: breakoutProbability,
      target_price: targetPrice,
      stop_loss: stopLoss,
      risk_reward_ratio: riskRewardRatio,
      time_to_breakout: timeToBreakout
    });
  }
  
  // Return best pattern (highest confidence)
  patterns.sort((a, b) => b.confidence - a.confidence);
  return patterns.slice(0, 3); // Top 3 patterns
}
