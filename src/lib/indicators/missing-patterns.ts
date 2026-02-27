/**
 * Missing Chart Patterns - الأنماط المفقودة
 * 
 * Professional detection algorithms for classic patterns:
 * - Head and Shoulders / Inverse H&S
 * - Double Top/Bottom
 * - Triple Top/Bottom
 * - Cup and Handle
 * - Rectangle/Range
 * - Rounding Bottom/Top
 * 
 * @author CCWAYS Elite Trading System
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// INTERFACES
// ==========================================================

export interface HeadAndShouldersPattern {
  type: 'head_and_shoulders' | 'inverse_head_and_shoulders';
  leftShoulder: { index: number; price: number };
  head: { index: number; price: number };
  rightShoulder: { index: number; price: number };
  necklineStart: { index: number; price: number };
  necklineEnd: { index: number; price: number };
  necklineSlope: number;
  targetPrice: number;
  confidence: number;
  breakoutDirection: 'up' | 'down';
  patternHeight: number;
  startIndex: number;
  endIndex: number;
}

export interface DoublePattern {
  type: 'double_top' | 'double_bottom';
  first: { index: number; price: number };
  second: { index: number; price: number };
  middle: { index: number; price: number };
  neckline: number;
  targetPrice: number;
  confidence: number;
  breakoutDirection: 'up' | 'down';
  patternHeight: number;
  startIndex: number;
  endIndex: number;
}

export interface TriplePattern {
  type: 'triple_top' | 'triple_bottom';
  first: { index: number; price: number };
  second: { index: number; price: number };
  third: { index: number; price: number };
  neckline: number;
  targetPrice: number;
  confidence: number;
  breakoutDirection: 'up' | 'down';
  startIndex: number;
  endIndex: number;
}

export interface CupAndHandlePattern {
  type: 'cup_and_handle' | 'inverse_cup_and_handle';
  cupStart: { index: number; price: number };
  cupBottom: { index: number; price: number };
  cupEnd: { index: number; price: number };
  handleStart: { index: number; price: number };
  handleBottom: { index: number; price: number };
  handleEnd: { index: number; price: number };
  rimLevel: number;
  targetPrice: number;
  confidence: number;
  breakoutDirection: 'up' | 'down';
  cupDepth: number;
  handleDepth: number;
  startIndex: number;
  endIndex: number;
}

export interface RectanglePattern {
  type: 'rectangle_top' | 'rectangle_bottom' | 'rectangle_continuation';
  topBoundary: number;
  bottomBoundary: number;
  touches: { index: number; price: number; boundary: 'top' | 'bottom' }[];
  breakoutDirection: 'up' | 'down' | 'neutral';
  targetPrice: number;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface RoundingPattern {
  type: 'rounding_bottom' | 'rounding_top';
  arcPoints: { index: number; price: number }[];
  pivotPoint: { index: number; price: number };
  rimLevel: number;
  targetPrice: number;
  confidence: number;
  breakoutDirection: 'up' | 'down';
  startIndex: number;
  endIndex: number;
}

export type PatternDetectionMode = 'strict' | 'balanced' | 'early';

export interface PatternDetectionOptions {
  mode?: PatternDetectionMode;
}

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function linearRegressionSlope(values: number[]): number {
  // x = 0..n-1, return slope in "value per bar"
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function findSwingPoints(candles: OHLCV[], leftBars: number = 5, rightBars: number = 5): SwingPoint[] {
  const points: SwingPoint[] = [];
  
  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const start = i - leftBars;
    const end = i + rightBars;

    // Compute window extremes once.
    let maxHigh = -Infinity;
    let minLow = Infinity;
    for (let j = start; j <= end; j++) {
      const h = candles[j].high;
      const l = candles[j].low;
      if (h > maxHigh) maxHigh = h;
      if (l < minLow) minLow = l;
    }

    const hi = candles[i].high;
    const lo = candles[i].low;

    // Tie-safe pivot rule:
    // - swingHigh if it's the max in window
    // - and no earlier bar in the window has the same max (prevents plateaus from producing 0 pivots)
    // - and at least one neighbor differs (avoids all-equal flat windows)
    if (hi === maxHigh) {
      let hasEarlierEqual = false;
      let hasStrictDiff = false;
      for (let j = start; j <= end; j++) {
        if (j === i) continue;
        if (candles[j].high === hi && j < i) hasEarlierEqual = true;
        if (candles[j].high !== hi) hasStrictDiff = true;
        if (hasEarlierEqual && hasStrictDiff) break;
      }
      if (!hasEarlierEqual && hasStrictDiff) {
        points.push({ index: i, price: hi, type: 'high' });
      }
    }

    if (lo === minLow) {
      let hasEarlierEqual = false;
      let hasStrictDiff = false;
      for (let j = start; j <= end; j++) {
        if (j === i) continue;
        if (candles[j].low === lo && j < i) hasEarlierEqual = true;
        if (candles[j].low !== lo) hasStrictDiff = true;
        if (hasEarlierEqual && hasStrictDiff) break;
      }
      if (!hasEarlierEqual && hasStrictDiff) {
        points.push({ index: i, price: lo, type: 'low' });
      }
    }
  }
  
  return points.sort((a, b) => a.index - b.index);
}

function mergeSwingPoints(candles: OHLCV[], configs: Array<[number, number]>): SwingPoint[] {
  return configs
    .flatMap(([l, r]) => findSwingPoints(candles, l, r))
    .sort((a, b) => a.index - b.index)
    // De-dup: same type + same index.
    .filter((p, i, arr) => i === 0 || p.index !== arr[i - 1].index || p.type !== arr[i - 1].type);
}

function mergePoints(points: SwingPoint[]): SwingPoint[] {
  return points
    .slice()
    .sort((a, b) => a.index - b.index)
    .filter((p, i, arr) => i === 0 || p.index !== arr[i - 1].index || p.type !== arr[i - 1].type);
}

/**
 * ATR-adaptive ZigZag pivots.
 * This is more robust than pure fractal swings on many exchanges/timeframes
 * (especially when there are plateaus / equal highs/lows).
 */
function computeZigZagPivots(
  candles: OHLCV[],
  atrSeries: number[],
  deviationATR: number = 1.0,
  minBarsBetweenPivots: number = 3
): SwingPoint[] {
  const n = candles.length;
  if (n < 10) return [];

  const pivots: SwingPoint[] = [];

  // Helpers
  const getDev = (i: number) => {
    const atr = atrSeries[clamp(i, 0, atrSeries.length - 1)] || 0;
    // Fallback for assets/timeframes with missing/zero ATR
    const fallback = candles[i].close * 0.002;
    return Math.max(atr * deviationATR, fallback);
  };

  let direction: 'up' | 'down' | null = null;
  let extremeIdx = 0;
  let extremePrice = candles[0].close;
  let lastPivotIdx = 0;

  // Determine initial direction
  for (let i = 1; i < n; i++) {
    const dev = getDev(i);
    if (candles[i].high - candles[0].close >= dev) {
      direction = 'up';
      extremeIdx = i;
      extremePrice = candles[i].high;
      break;
    }
    if (candles[0].close - candles[i].low >= dev) {
      direction = 'down';
      extremeIdx = i;
      extremePrice = candles[i].low;
      break;
    }
  }

  if (!direction) return [];

  for (let i = extremeIdx + 1; i < n; i++) {
    const dev = getDev(i);

    if (direction === 'up') {
      // extend current up leg
      if (candles[i].high > extremePrice) {
        extremePrice = candles[i].high;
        extremeIdx = i;
      }

      // reversal condition: drop from extreme by dev
      if (extremePrice - candles[i].low >= dev && (i - extremeIdx) >= minBarsBetweenPivots && (extremeIdx - lastPivotIdx) >= minBarsBetweenPivots) {
        pivots.push({ index: extremeIdx, price: extremePrice, type: 'high' });
        lastPivotIdx = extremeIdx;
        direction = 'down';
        extremeIdx = i;
        extremePrice = candles[i].low;
      }
    } else {
      // extend current down leg
      if (candles[i].low < extremePrice) {
        extremePrice = candles[i].low;
        extremeIdx = i;
      }

      // reversal condition: rise from extreme by dev
      if (candles[i].high - extremePrice >= dev && (i - extremeIdx) >= minBarsBetweenPivots && (extremeIdx - lastPivotIdx) >= minBarsBetweenPivots) {
        pivots.push({ index: extremeIdx, price: extremePrice, type: 'low' });
        lastPivotIdx = extremeIdx;
        direction = 'up';
        extremeIdx = i;
        extremePrice = candles[i].high;
      }
    }
  }

  // Add last (unconfirmed) extreme as a helpful pivot for early/potential patterns.
  pivots.push({ index: extremeIdx, price: extremePrice, type: direction === 'up' ? 'high' : 'low' });

  return mergePoints(pivots);
}

function calculateATR(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || candles[i].open;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    atrSum += tr;
  }
  
  return atrSum / period;
}

function calculateATRSeries(candles: OHLCV[], period: number = 14): number[] {
  const n = candles.length;
  const atr: number[] = new Array(n).fill(0);
  if (n < period + 1) return atr;

  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  // Simple moving average ATR (stable + deterministic)
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  atr[period] = sum / period;

  for (let i = period + 1; i < n; i++) {
    sum += tr[i] - tr[i - period];
    atr[i] = sum / period;
  }

  // Fill leading values with first computed ATR so callers can index safely
  for (let i = 0; i < period; i++) atr[i] = atr[period];
  return atr;
}

function avgVolumeAround(candles: OHLCV[], centerIndex: number, radius: number = 2): number {
  const s = clamp(centerIndex - radius, 0, candles.length - 1);
  const e = clamp(centerIndex + radius, 0, candles.length - 1);
  const vols: number[] = [];
  for (let i = s; i <= e; i++) {
    const v = candles[i].volume;
    if (typeof v === 'number' && isFinite(v) && v > 0) vols.push(v);
  }
  return vols.length ? mean(vols) : 0;
}

function argMinLow(candles: OHLCV[], startIndex: number, endIndex: number): { index: number; price: number } {
  const s = clamp(startIndex, 0, candles.length - 1);
  const e = clamp(endIndex, 0, candles.length - 1);
  let bestIdx = s;
  let best = candles[s].low;
  for (let i = s + 1; i <= e; i++) {
    if (candles[i].low < best) {
      best = candles[i].low;
      bestIdx = i;
    }
  }
  return { index: bestIdx, price: best };
}

function argMaxHigh(candles: OHLCV[], startIndex: number, endIndex: number): { index: number; price: number } {
  const s = clamp(startIndex, 0, candles.length - 1);
  const e = clamp(endIndex, 0, candles.length - 1);
  let bestIdx = s;
  let best = candles[s].high;
  for (let i = s + 1; i <= e; i++) {
    if (candles[i].high > best) {
      best = candles[i].high;
      bestIdx = i;
    }
  }
  return { index: bestIdx, price: best };
}

function pricesAreEqual(price1: number, price2: number, tolerance: number): boolean {
  return Math.abs(price1 - price2) <= tolerance;
}

// ==========================================================
// HEAD AND SHOULDERS DETECTION
// ==========================================================

export function detectHeadAndShoulders(candles: OHLCV[], options: PatternDetectionOptions = {}): HeadAndShouldersPattern[] {
  if (candles.length < 50) return [];

  const patterns: HeadAndShouldersPattern[] = [];
  const atrSeries = calculateATRSeries(candles, 14);
  if (!atrSeries.some(v => v > 0)) return [];

  // Multi-resolution swing points + ZigZag pivots (best of both worlds)
  const swingPoints = mergePoints([
    ...mergeSwingPoints(candles, [
      [3, 3],
      [4, 4],
      [5, 5],
      [6, 6],
    ]),
    ...computeZigZagPivots(candles, atrSeries, 1.05, 3),
  ]);

  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');

  // Helper: regression trend strength normalized by ATR (stable across assets/timeframes)
  const getTrend = (startIndex: number, endIndex: number, atrAt: number): { dir: 'up' | 'down' | 'sideways'; strength: number } => {
    const s = clamp(startIndex, 0, candles.length - 1);
    const e = clamp(endIndex, 0, candles.length - 1);
    if (e - s < 12 || !atrAt) return { dir: 'sideways', strength: 0 };

    const closes: number[] = [];
    for (let i = s; i <= e; i++) closes.push(candles[i].close);

    const slope = linearRegressionSlope(closes); // price per bar
    const strength = Math.min(10, Math.abs(slope) / atrAt); // normalized

    // require some slope relative to ATR to call trend
    if (strength >= 0.06) return { dir: slope > 0 ? 'up' : 'down', strength };
    return { dir: 'sideways', strength };
  };

  // Mode tuning (more recall in balanced/early, stricter in strict)
  const mode: PatternDetectionMode = options.mode || 'balanced';
  const minConfidence = mode === 'strict' ? 70 : mode === 'early' ? 40 : 50; // Significantly lowered
  const minTrendStrength = mode === 'strict' ? 0.04 : mode === 'early' ? 0.01 : 0.02; // Significantly lowered
  const tolAtrMult = mode === 'strict' ? 1.0 : mode === 'early' ? 2.0 : 1.5; // Significantly increased tolerance
  const minHeightAtrMult = mode === 'strict' ? 0.5 : mode === 'early' ? 0.2 : 0.3; // Significantly lowered height requirement
  const requireSwingInNeckSegment = false; // Disabled strict requirement for Genius Mode

  // ================================
  // Bearish Head & Shoulders
  // ================================
  for (let h = 1; h < swingHighs.length - 1; h++) {
    const head = swingHighs[h];

    const atrAtHead = atrSeries[clamp(head.index, 0, atrSeries.length - 1)] || calculateATR(candles, 14);
    if (!atrAtHead) continue;

    // Tolerance is ATR-scaled (tight but realistic)
    const tolerance = atrAtHead * tolAtrMult;

    // Require clear prior uptrend into the pattern
    const trendBefore = getTrend(head.index - 50, head.index - 6, atrAtHead);
    if (trendBefore.dir !== 'up' || trendBefore.strength < minTrendStrength) continue;

    // Find left shoulder (before head, lower than head)
    for (let ls = h - 1; ls >= 0; ls--) {
      const leftShoulder = swingHighs[ls];
      if (leftShoulder.price >= head.price) continue;
      if (head.index - leftShoulder.index < 5) continue;
      if (head.index - leftShoulder.index > 50) break;

      // Find right shoulder (after head, similar to left shoulder)
      for (let rs = h + 1; rs < swingHighs.length; rs++) {
        const rightShoulder = swingHighs[rs];
        if (rightShoulder.price >= head.price) continue;
        if (rightShoulder.index - head.index < 5) continue;
        if (rightShoulder.index - head.index > 50) break;

        // Check shoulder symmetry (height)
        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
        // Use a more generous tolerance for symmetry check
        if (shoulderDiff > tolerance * 3.0) continue; // Relaxed from 1.5

        // Neckline anchor points: use TRUE candle extremes for pixel-perfect geometry.
        // We still require the segment to contain at least one swing-low to avoid noisy micro-valleys.
        if (requireSwingInNeckSegment) {
          const hasLeftSwingLow = swingLows.some(l => l.index > leftShoulder.index + 1 && l.index < head.index - 1);
          const hasRightSwingLow = swingLows.some(l => l.index > head.index + 1 && l.index < rightShoulder.index - 1);
          if (!hasLeftSwingLow || !hasRightSwingLow) continue;
        }

        const leftNeckLow = argMinLow(candles, leftShoulder.index + 2, head.index - 2);
        const rightNeckLow = argMinLow(candles, head.index + 2, rightShoulder.index - 2);

        if (!leftNeckLow || !rightNeckLow) continue;

        // Calculate neckline
        const necklineSlope = (rightNeckLow.price - leftNeckLow.price) /
          (rightNeckLow.index - leftNeckLow.index);
        const avgNeckline = (leftNeckLow.price + rightNeckLow.price) / 2;
        const patternHeight = head.price - avgNeckline;

        if (patternHeight < atrAtHead * minHeightAtrMult) continue; // head must stand out

        // Neckline should not be too steep
        const maxSlopePerBar = atrAtHead * 0.50; // Increased from 0.25 for Genius Mode
        if (Math.abs(necklineSlope) > maxSlopePerBar) continue;

        // Target price (measured move)
        const necklineAtBreak = rightNeckLow.price +
          necklineSlope * (rightShoulder.index - rightNeckLow.index);
        const targetPrice = necklineAtBreak - patternHeight;

        // ===== Confidence scoring (0-100) =====
        const shoulderSymmetry = Math.max(0, 1 - (shoulderDiff / (tolerance * 1.35)));
        const timeLeft = head.index - leftShoulder.index;
        const timeRight = rightShoulder.index - head.index;
        const timeSymmetry = Math.max(0,
          1 - Math.abs(timeLeft - timeRight) / Math.max(timeLeft, timeRight)
        );

        const headDominance = Math.min(1, patternHeight / (atrAtHead * 2));
        const necklineFlatness = Math.max(0,
          1 - Math.abs(leftNeckLow.price - rightNeckLow.price) / (atrAtHead * 1.6)
        );

        // Volume behaviour: ideally volume contracts into right shoulder
        let volumeScore = 0.55;
        const volLS = avgVolumeAround(candles, leftShoulder.index, 2);
        const volRS = avgVolumeAround(candles, rightShoulder.index, 2);
        if (volLS > 0 && volRS > 0) {
          const volRatio = volRS / volLS;
          // Bearish H&S: volume often weakens into right shoulder
          if (volRatio <= 0.75) volumeScore = 1;
          else if (volRatio <= 1.0) volumeScore = 0.75;
          else volumeScore = 0.45;
        }

        const trendScore = Math.min(1, trendBefore.strength / 0.18);

        const confidence = (
          shoulderSymmetry * 0.25 +
          timeSymmetry * 0.2 +
          headDominance * 0.2 +
          necklineFlatness * 0.15 +
          volumeScore * 0.1 +
          trendScore * 0.1
        ) * 100;

        if (confidence >= minConfidence) {
          patterns.push({
            type: 'head_and_shoulders',
            leftShoulder: { index: leftShoulder.index, price: leftShoulder.price },
            head: { index: head.index, price: head.price },
            rightShoulder: { index: rightShoulder.index, price: rightShoulder.price },
            necklineStart: { index: leftNeckLow.index, price: leftNeckLow.price },
            necklineEnd: { index: rightNeckLow.index, price: rightNeckLow.price },
            necklineSlope,
            targetPrice,
            confidence,
            breakoutDirection: 'down',
            patternHeight,
            startIndex: leftShoulder.index,
            endIndex: rightShoulder.index,
          });
        }
      }
    }
  }

  // ================================
  // Bullish Inverse Head & Shoulders
  // ================================
  for (let h = 1; h < swingLows.length - 1; h++) {
    const head = swingLows[h];

    const atrAtHead = atrSeries[clamp(head.index, 0, atrSeries.length - 1)] || calculateATR(candles, 14);
    if (!atrAtHead) continue;

    const tolerance = atrAtHead * tolAtrMult;

    // Require clear prior downtrend into the pattern
    const trendBefore = getTrend(head.index - 50, head.index - 6, atrAtHead);
    if (trendBefore.dir !== 'down' || trendBefore.strength < minTrendStrength) continue;

    for (let ls = h - 1; ls >= 0; ls--) {
      const leftShoulder = swingLows[ls];
      if (leftShoulder.price <= head.price) continue;
      if (head.index - leftShoulder.index < 5) continue;
      if (head.index - leftShoulder.index > 50) break;

      for (let rs = h + 1; rs < swingLows.length; rs++) {
        const rightShoulder = swingLows[rs];
        if (rightShoulder.price <= head.price) continue;
        if (rightShoulder.index - head.index < 5) continue;
        if (rightShoulder.index - head.index > 50) break;

        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
        if (shoulderDiff > tolerance * 3.0) continue; // Relaxed from 1.0

        // Inverse neckline anchor points: TRUE candle extremes (highest highs).
        if (requireSwingInNeckSegment) {
          const hasLeftSwingHigh = swingHighs.some(p => p.index > leftShoulder.index + 1 && p.index < head.index - 1);
          const hasRightSwingHigh = swingHighs.some(p => p.index > head.index + 1 && p.index < rightShoulder.index - 1);
          if (!hasLeftSwingHigh || !hasRightSwingHigh) continue;
        }

        const leftNeckHigh = argMaxHigh(candles, leftShoulder.index + 2, head.index - 2);
        const rightNeckHigh = argMaxHigh(candles, head.index + 2, rightShoulder.index - 2);

        if (!leftNeckHigh || !rightNeckHigh) continue;

        const necklineSlope = (rightNeckHigh.price - leftNeckHigh.price) /
          (rightNeckHigh.index - leftNeckHigh.index);
        const avgNeckline = (leftNeckHigh.price + rightNeckHigh.price) / 2;
        const patternHeight = avgNeckline - head.price;

        if (patternHeight < atrAtHead * minHeightAtrMult) continue;

        const maxSlopePerBar = atrAtHead * 0.50; // Increased from 0.18 for Genius Mode
        if (Math.abs(necklineSlope) > maxSlopePerBar) continue;

        const necklineAtBreak = rightNeckHigh.price +
          necklineSlope * (rightShoulder.index - rightNeckHigh.index);
        const targetPrice = necklineAtBreak + patternHeight;

        const shoulderSymmetry = Math.max(0, 1 - (shoulderDiff / (tolerance * 1.5)));
        const timeLeft = head.index - leftShoulder.index;
        const timeRight = rightShoulder.index - head.index;
        const timeSymmetry = Math.max(0,
          1 - Math.abs(timeLeft - timeRight) / Math.max(timeLeft, timeRight)
        );

        const headDominance = Math.min(1, patternHeight / (atrAtHead * 2));
        const necklineFlatness = Math.max(0,
          1 - Math.abs(leftNeckHigh.price - rightNeckHigh.price) / (atrAtHead * 1.6)
        );

        let volumeScore = 0.55;
        const volLS = avgVolumeAround(candles, leftShoulder.index, 2);
        const volRS = avgVolumeAround(candles, rightShoulder.index, 2);
        if (volLS > 0 && volRS > 0) {
          const volRatio = volRS / volLS;
          // Inverse H&S: volume often improves into right shoulder / breakout
          if (volRatio >= 1.25) volumeScore = 1;
          else if (volRatio >= 1.0) volumeScore = 0.75;
          else volumeScore = 0.45;
        }

        const trendScore = Math.min(1, trendBefore.strength / 0.18);

        const confidence = (
          shoulderSymmetry * 0.25 +
          timeSymmetry * 0.2 +
          headDominance * 0.2 +
          necklineFlatness * 0.15 +
          volumeScore * 0.1 +
          trendScore * 0.1
        ) * 100;

        if (confidence >= minConfidence) {
          patterns.push({
            type: 'inverse_head_and_shoulders',
            leftShoulder: { index: leftShoulder.index, price: leftShoulder.price },
            head: { index: head.index, price: head.price },
            rightShoulder: { index: rightShoulder.index, price: rightShoulder.price },
            necklineStart: { index: leftNeckHigh.index, price: leftNeckHigh.price },
            necklineEnd: { index: rightNeckHigh.index, price: rightNeckHigh.price },
            necklineSlope,
            targetPrice,
            confidence,
            breakoutDirection: 'up',
            patternHeight,
            startIndex: leftShoulder.index,
            endIndex: rightShoulder.index,
          });
        }
      }
    }
  }

  // De-overlap: keep only best patterns when ranges overlap heavily.
  const filtered: HeadAndShouldersPattern[] = [];
  const sorted = patterns
    .slice()
    .sort((a, b) => b.confidence - a.confidence || a.startIndex - b.startIndex);

  for (const p of sorted) {
    const overlaps = filtered.some(x => !(p.endIndex < x.startIndex || p.startIndex > x.endIndex));
    if (!overlaps) filtered.push(p);
  }

  // Sort back by time for stable drawing
  return filtered.sort((a, b) => a.startIndex - b.startIndex);
}

// ==========================================================
// DOUBLE TOP/BOTTOM DETECTION - خوارزمية محسنة
// ==========================================================

export function detectDoubleTopBottom(candles: OHLCV[], options: PatternDetectionOptions = {}): DoublePattern[] {
  if (candles.length < 30) return [];
  
  const patterns: DoublePattern[] = [];
  const mode: PatternDetectionMode = options.mode || 'balanced';

  const swingPoints = mergeSwingPoints(candles, [
    [4, 4],
    [5, 5],
    [6, 6],
  ]);
  const atrSeries = calculateATRSeries(candles, 14);
  const fallbackAtr = calculateATR(candles, 14);
  if (!atrSeries.some(v => v > 0) && !fallbackAtr) return [];
  
  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');

  const getAtrAt = (idx: number) => {
    const i = clamp(idx, 0, atrSeries.length - 1);
    return atrSeries[i] || fallbackAtr || 0;
  };

  const getTrend = (startIndex: number, endIndex: number, atrAt: number): { dir: 'up' | 'down' | 'sideways'; strength: number } => {
    const s = clamp(startIndex, 0, candles.length - 1);
    const e = clamp(endIndex, 0, candles.length - 1);
    if (e - s < 12 || !atrAt) return { dir: 'sideways', strength: 0 };
    const closes: number[] = [];
    for (let i = s; i <= e; i++) closes.push(candles[i].close);
    const slope = linearRegressionSlope(closes);
    const strength = Math.min(10, Math.abs(slope) / atrAt);
    if (strength >= 0.05) return { dir: slope > 0 ? 'up' : 'down', strength };
    return { dir: 'sideways', strength };
  };

  const overlapFilter = (items: DoublePattern[]): DoublePattern[] => {
    const kept: DoublePattern[] = [];
    const sorted = items.slice().sort((a, b) => b.confidence - a.confidence || a.startIndex - b.startIndex);
    for (const p of sorted) {
      const overlaps = kept.some(x => !(p.endIndex < x.startIndex || p.startIndex > x.endIndex));
      if (!overlaps) kept.push(p);
    }
    return kept.sort((a, b) => a.startIndex - b.startIndex);
  };
  
  // Double Top
  for (let i = 0; i < swingHighs.length - 1; i++) {
    const first = swingHighs[i];
    
    for (let j = i + 1; j < swingHighs.length; j++) {
      const second = swingHighs[j];
      
      const span = second.index - first.index;
      if (span < 8) continue;
      if (span > 80) break;

      const midIdx = Math.floor((first.index + second.index) / 2);
      const atrAt = getAtrAt(midIdx);
      if (!atrAt) continue;

      // Adaptive tolerance: ATR-scaled with a small % floor for low-vol / stable pairs.
      const avgPeak = (first.price + second.price) / 2;
      const tolerance = Math.max(atrAt * 1.5, avgPeak * 0.003); // Relaxed from 0.7 / 0.0015
      if (!pricesAreEqual(first.price, second.price, tolerance)) continue;

      // Require an uptrend into the first top (reduces sideways noise).
      const trendBefore = getTrend(first.index - 45, first.index - 3, atrAt);
      if (mode === 'strict' && (trendBefore.dir !== 'up' || trendBefore.strength < 0.04)) continue; // Relaxed from 0.07

      // Use true candle extreme for the valley (pixel-tight neckline)
      if (second.index - first.index < 3) continue;
      const middleLow = argMinLow(candles, first.index + 1, second.index - 1);
      const patternHeight = avgPeak - middleLow.price;
      if (patternHeight < atrAt * 0.4) continue; // Relaxed from 0.8

      // Avoid "higher-high" between the two peaks (would be a rising trend, not a double top)
      const intramax = argMaxHigh(candles, first.index + 1, second.index - 1);
      if (intramax.price > avgPeak + tolerance * 1.2) continue; // Relaxed from 0.6

      const targetPrice = middleLow.price - patternHeight;

      const priceEquality = clamp(1 - (Math.abs(first.price - second.price) / tolerance), 0, 1);
      const depthScore = clamp(patternHeight / (atrAt * 2.2), 0, 1);
      const timeSymmetry = clamp(1 - Math.abs((second.index - midIdx) - (midIdx - first.index)) / Math.max(1, span), 0, 1);

      const confidence = (priceEquality * 0.45 + depthScore * 0.35 + timeSymmetry * 0.2) * 100;

      const minConfidence = mode === 'strict' ? 60 : mode === 'early' ? 40 : 50; // Relaxed from 75/58/65
      if (confidence >= minConfidence) {
        patterns.push({
          type: 'double_top',
          first: { index: first.index, price: first.price },
          second: { index: second.index, price: second.price },
          middle: { index: middleLow.index, price: middleLow.price },
          neckline: middleLow.price,
          targetPrice,
          confidence,
          breakoutDirection: 'down',
          patternHeight,
          startIndex: first.index,
          endIndex: second.index,
        });
      }
    }
  }
  
  // Double Bottom
  for (let i = 0; i < swingLows.length - 1; i++) {
    const first = swingLows[i];
    
    for (let j = i + 1; j < swingLows.length; j++) {
      const second = swingLows[j];
      
      const span = second.index - first.index;
      if (span < 8) continue;
      if (span > 80) break;

      const midIdx = Math.floor((first.index + second.index) / 2);
      const atrAt = getAtrAt(midIdx);
      if (!atrAt) continue;

      const avgTrough = (first.price + second.price) / 2;
      const tolerance = Math.max(atrAt * 1.5, avgTrough * 0.003); // Relaxed from 0.7 / 0.0015
      if (!pricesAreEqual(first.price, second.price, tolerance)) continue;

      const trendBefore = getTrend(first.index - 45, first.index - 3, atrAt);
      if (mode === 'strict' && (trendBefore.dir !== 'down' || trendBefore.strength < 0.04)) continue; // Relaxed from 0.07

      const middleHigh = argMaxHigh(candles, first.index + 1, second.index - 1);
      const patternHeight = middleHigh.price - avgTrough;
      if (patternHeight < atrAt * 0.4) continue; // Relaxed from 0.8

      const intramin = argMinLow(candles, first.index + 1, second.index - 1);
      if (intramin.price < avgTrough - tolerance * 1.2) continue; // Relaxed from 0.6

      const targetPrice = middleHigh.price + patternHeight;

      const priceEquality = clamp(1 - (Math.abs(first.price - second.price) / tolerance), 0, 1);
      const depthScore = clamp(patternHeight / (atrAt * 2.2), 0, 1);
      const timeSymmetry = clamp(1 - Math.abs((second.index - midIdx) - (midIdx - first.index)) / Math.max(1, span), 0, 1);

      const confidence = (priceEquality * 0.45 + depthScore * 0.35 + timeSymmetry * 0.2) * 100;

      const minConfidence = mode === 'strict' ? 60 : mode === 'early' ? 40 : 50; // Relaxed from 75/58/65
      if (confidence >= minConfidence) {
        patterns.push({
          type: 'double_bottom',
          first: { index: first.index, price: first.price },
          second: { index: second.index, price: second.price },
          middle: { index: middleHigh.index, price: middleHigh.price },
          neckline: middleHigh.price,
          targetPrice,
          confidence,
          breakoutDirection: 'up',
          patternHeight,
          startIndex: first.index,
          endIndex: second.index,
        });
      }
    }
  }
  
  return overlapFilter(patterns);
}

// ==========================================================
// TRIPLE TOP/BOTTOM DETECTION - خوارزمية محسنة
// ==========================================================

export function detectTripleTopBottom(candles: OHLCV[], options: PatternDetectionOptions = {}): TriplePattern[] {
  if (candles.length < 45) return []; // Reduced minimum
  
  const patterns: TriplePattern[] = [];
  const mode: PatternDetectionMode = options.mode || 'balanced';

  const swingPoints = mergeSwingPoints(candles, [
    [4, 4],
    [5, 5],
    [6, 6],
  ]);
  const atrSeries = calculateATRSeries(candles, 14);
  const fallbackAtr = calculateATR(candles, 14);
  if (!atrSeries.some(v => v > 0) && !fallbackAtr) return [];
  
  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');

  const getAtrAt = (idx: number) => {
    const i = clamp(idx, 0, atrSeries.length - 1);
    return atrSeries[i] || fallbackAtr || 0;
  };

  const getTrend = (startIndex: number, endIndex: number, atrAt: number): { dir: 'up' | 'down' | 'sideways'; strength: number } => {
    const s = clamp(startIndex, 0, candles.length - 1);
    const e = clamp(endIndex, 0, candles.length - 1);
    if (e - s < 12 || !atrAt) return { dir: 'sideways', strength: 0 };
    const closes: number[] = [];
    for (let i = s; i <= e; i++) closes.push(candles[i].close);
    const slope = linearRegressionSlope(closes);
    const strength = Math.min(10, Math.abs(slope) / atrAt);
    if (strength >= 0.05) return { dir: slope > 0 ? 'up' : 'down', strength };
    return { dir: 'sideways', strength };
  };

  const overlapFilter = (items: TriplePattern[]): TriplePattern[] => {
    const kept: TriplePattern[] = [];
    const sorted = items.slice().sort((a, b) => b.confidence - a.confidence || a.startIndex - b.startIndex);
    for (const p of sorted) {
      const overlaps = kept.some(x => !(p.endIndex < x.startIndex || p.startIndex > x.endIndex));
      if (!overlaps) kept.push(p);
    }
    return kept.sort((a, b) => a.startIndex - b.startIndex);
  };
  
  // Triple Top
  for (let i = 0; i < swingHighs.length - 2; i++) {
    const first = swingHighs[i];
    
    for (let j = i + 1; j < swingHighs.length - 1; j++) {
      const second = swingHighs[j];
      const span12 = second.index - first.index;
      if (span12 < 6) continue;
      if (span12 > 70) break;

      const midIdx12 = Math.floor((first.index + second.index) / 2);
      const atrAt12 = getAtrAt(midIdx12);
      if (!atrAt12) continue;
      const avg12 = (first.price + second.price) / 2;
      const tolerance = Math.max(atrAt12 * 0.85, avg12 * 0.002);

      if (!pricesAreEqual(first.price, second.price, tolerance)) continue;
      
      for (let k = j + 1; k < swingHighs.length; k++) {
        const third = swingHighs[k];
        const span23 = third.index - second.index;
        if (span23 < 6) continue;
        if (span23 > 70) break;

        if (!pricesAreEqual(second.price, third.price, tolerance)) continue;
        
        const totalSpan = third.index - first.index;
        if (totalSpan > 140) break;

        const midIdx = Math.floor((first.index + third.index) / 2);
        const atrAt = getAtrAt(midIdx);
        if (!atrAt) continue;

        // Require an uptrend into the first top.
        const trendBefore = getTrend(first.index - 55, first.index - 3, atrAt);
        if (mode === 'strict' && (trendBefore.dir !== 'up' || trendBefore.strength < 0.07)) continue;

        const avgPeak = (first.price + second.price + third.price) / 3;

        // Valleys between peaks must exist and be meaningful.
        const valley1 = argMinLow(candles, first.index + 1, second.index - 1);
        const valley2 = argMinLow(candles, second.index + 1, third.index - 1);
        const neckline = Math.min(valley1.price, valley2.price);
        const patternHeight = avgPeak - neckline;
        if (patternHeight < atrAt * 0.9) continue;

        // Avoid higher-high between first and third (invalidates triple top)
        const intramax = argMaxHigh(candles, first.index + 1, third.index - 1);
        if (intramax.price > avgPeak + tolerance * 0.7) continue;

        const targetPrice = neckline - patternHeight;

        const priceSpread = Math.max(first.price, second.price, third.price) - Math.min(first.price, second.price, third.price);
        const priceConsistency = clamp(1 - priceSpread / tolerance, 0, 1);
        const depthScore = clamp(patternHeight / (atrAt * 2.5), 0, 1);
        const timeSymmetry = clamp(1 - Math.abs(span12 - span23) / Math.max(1, Math.max(span12, span23)), 0, 1);

        const confidence = (priceConsistency * 0.45 + depthScore * 0.35 + timeSymmetry * 0.2) * 100;

        const minConfidence = mode === 'strict' ? 78 : mode === 'early' ? 60 : 68;
        if (confidence >= minConfidence) {
          patterns.push({
            type: 'triple_top',
            first: { index: first.index, price: first.price },
            second: { index: second.index, price: second.price },
            third: { index: third.index, price: third.price },
            neckline,
            targetPrice,
            confidence,
            breakoutDirection: 'down',
            startIndex: first.index,
            endIndex: third.index,
          });
        }
      }
    }
  }
  
  // Triple Bottom
  for (let i = 0; i < swingLows.length - 2; i++) {
    const first = swingLows[i];
    
    for (let j = i + 1; j < swingLows.length - 1; j++) {
      const second = swingLows[j];
      const span12 = second.index - first.index;
      if (span12 < 6) continue;
      if (span12 > 70) break;

      const midIdx12 = Math.floor((first.index + second.index) / 2);
      const atrAt12 = getAtrAt(midIdx12);
      if (!atrAt12) continue;
      const avg12 = (first.price + second.price) / 2;
      const tolerance = Math.max(atrAt12 * 0.85, avg12 * 0.002);

      if (!pricesAreEqual(first.price, second.price, tolerance)) continue;
      
      for (let k = j + 1; k < swingLows.length; k++) {
        const third = swingLows[k];
        const span23 = third.index - second.index;
        if (span23 < 6) continue;
        if (span23 > 70) break;

        if (!pricesAreEqual(second.price, third.price, tolerance)) continue;
        
        const totalSpan = third.index - first.index;
        if (totalSpan > 140) break;

        const midIdx = Math.floor((first.index + third.index) / 2);
        const atrAt = getAtrAt(midIdx);
        if (!atrAt) continue;

        const trendBefore = getTrend(first.index - 55, first.index - 3, atrAt);
        if (mode === 'strict' && (trendBefore.dir !== 'down' || trendBefore.strength < 0.07)) continue;

        const avgTrough = (first.price + second.price + third.price) / 3;

        const peak1 = argMaxHigh(candles, first.index + 1, second.index - 1);
        const peak2 = argMaxHigh(candles, second.index + 1, third.index - 1);
        const neckline = Math.max(peak1.price, peak2.price);
        const patternHeight = neckline - avgTrough;
        if (patternHeight < atrAt * 0.9) continue;

        const intramin = argMinLow(candles, first.index + 1, third.index - 1);
        if (intramin.price < avgTrough - tolerance * 0.7) continue;

        const targetPrice = neckline + patternHeight;

        const priceSpread = Math.max(first.price, second.price, third.price) - Math.min(first.price, second.price, third.price);
        const priceConsistency = clamp(1 - priceSpread / tolerance, 0, 1);
        const depthScore = clamp(patternHeight / (atrAt * 2.5), 0, 1);
        const timeSymmetry = clamp(1 - Math.abs(span12 - span23) / Math.max(1, Math.max(span12, span23)), 0, 1);

        const confidence = (priceConsistency * 0.45 + depthScore * 0.35 + timeSymmetry * 0.2) * 100;

        const minConfidence = mode === 'strict' ? 78 : mode === 'early' ? 60 : 68;
        if (confidence >= minConfidence) {
          patterns.push({
            type: 'triple_bottom',
            first: { index: first.index, price: first.price },
            second: { index: second.index, price: second.price },
            third: { index: third.index, price: third.price },
            neckline,
            targetPrice,
            confidence,
            breakoutDirection: 'up',
            startIndex: first.index,
            endIndex: third.index,
          });
        }
      }
    }
  }
  
  return overlapFilter(patterns);
}

// ==========================================================
// CUP AND HANDLE DETECTION
// ==========================================================

export function detectCupAndHandle(candles: OHLCV[]): CupAndHandlePattern[] {
  if (candles.length < 60) return [];
  
  const patterns: CupAndHandlePattern[] = [];
  const swingPoints = findSwingPoints(candles, 5, 5);
  const atr = calculateATR(candles);
  const tolerance = atr * 0.5;
  
  const swingHighs = swingPoints.filter(p => p.type === 'high');
  const swingLows = swingPoints.filter(p => p.type === 'low');
  
  // Cup and Handle (bullish)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    const cupStart = swingHighs[i];
    
    for (let j = i + 1; j < swingHighs.length; j++) {
      const cupEnd = swingHighs[j];
      
      if (cupEnd.index - cupStart.index < 20) continue;
      if (cupEnd.index - cupStart.index > 80) break;
      
      // Cup rim should be at similar levels
      if (!pricesAreEqual(cupStart.price, cupEnd.price, tolerance)) continue;
      
      // Find cup bottom
      const lowsInCup = swingLows.filter(l => 
        l.index > cupStart.index && l.index < cupEnd.index
      );
      
      if (lowsInCup.length === 0) continue;
      
      const cupBottom = lowsInCup.reduce((min, l) => l.price < min.price ? l : min, lowsInCup[0]);
      
      // Cup should be U-shaped (bottom roughly in the middle)
      const cupWidth = cupEnd.index - cupStart.index;
      const bottomPosition = (cupBottom.index - cupStart.index) / cupWidth;
      if (bottomPosition < 0.3 || bottomPosition > 0.7) continue;
      
      const cupDepth = (cupStart.price + cupEnd.price) / 2 - cupBottom.price;
      const rimLevel = (cupStart.price + cupEnd.price) / 2;
      
      // Look for handle
      const handleHighs = swingHighs.filter(h => h.index > cupEnd.index && h.index < cupEnd.index + 20);
      const handleLows = swingLows.filter(l => l.index > cupEnd.index && l.index < cupEnd.index + 20);
      
      if (handleLows.length === 0) {
        // No handle yet, still valid cup
        const confidence = 65;
        const targetPrice = rimLevel + cupDepth;
        
        patterns.push({
          type: 'cup_and_handle',
          cupStart: { index: cupStart.index, price: cupStart.price },
          cupBottom: { index: cupBottom.index, price: cupBottom.price },
          cupEnd: { index: cupEnd.index, price: cupEnd.price },
          handleStart: { index: cupEnd.index, price: cupEnd.price },
          handleBottom: { index: cupEnd.index, price: cupEnd.price },
          handleEnd: { index: cupEnd.index, price: cupEnd.price },
          rimLevel,
          targetPrice,
          confidence,
          breakoutDirection: 'up',
          cupDepth,
          handleDepth: 0,
          startIndex: cupStart.index,
          endIndex: cupEnd.index,
        });
        continue;
      }
      
      const handleBottom = handleLows.reduce((min, l) => l.price < min.price ? l : min, handleLows[0]);
      const handleDepth = cupEnd.price - handleBottom.price;
      
      // Handle should retrace 30-50% of cup depth
      const handleRetracement = handleDepth / cupDepth;
      if (handleRetracement < 0.1 || handleRetracement > 0.6) continue;
      
      const handleEnd = handleHighs.length > 0 
        ? handleHighs[handleHighs.length - 1]
        : { index: candles.length - 1, price: candles[candles.length - 1].close };
      
      const confidence = 70 + (1 - Math.abs(handleRetracement - 0.35)) * 25;
      const targetPrice = rimLevel + cupDepth;
      
      patterns.push({
        type: 'cup_and_handle',
        cupStart: { index: cupStart.index, price: cupStart.price },
        cupBottom: { index: cupBottom.index, price: cupBottom.price },
        cupEnd: { index: cupEnd.index, price: cupEnd.price },
        handleStart: { index: cupEnd.index, price: cupEnd.price },
        handleBottom: { index: handleBottom.index, price: handleBottom.price },
        handleEnd: { index: handleEnd.index, price: handleEnd.price },
        rimLevel,
        targetPrice,
        confidence,
        breakoutDirection: 'up',
        cupDepth,
        handleDepth,
        startIndex: cupStart.index,
        endIndex: handleEnd.index,
      });
    }
  }
  
  // ==========================================================
  // INVERSE CUP AND HANDLE (bearish) - خوارزمية جديدة
  // ==========================================================
  for (let i = 0; i < swingLows.length - 1; i++) {
    const cupStart = swingLows[i];
    
    for (let j = i + 1; j < swingLows.length; j++) {
      const cupEnd = swingLows[j];
      
      if (cupEnd.index - cupStart.index < 20) continue;
      if (cupEnd.index - cupStart.index > 80) break;
      
      // Cup rim (bottom) should be at similar levels
      if (!pricesAreEqual(cupStart.price, cupEnd.price, tolerance)) continue;
      
      // Find cup top (inverted - looking for highest point)
      const highsInCup = swingHighs.filter(h => 
        h.index > cupStart.index && h.index < cupEnd.index
      );
      
      if (highsInCup.length === 0) continue;
      
      const cupTop = highsInCup.reduce((max, h) => h.price > max.price ? h : max, highsInCup[0]);
      
      // Inverted cup should be inverted U-shaped (top roughly in the middle)
      const cupWidth = cupEnd.index - cupStart.index;
      const topPosition = (cupTop.index - cupStart.index) / cupWidth;
      if (topPosition < 0.3 || topPosition > 0.7) continue;
      
      const cupDepth = cupTop.price - (cupStart.price + cupEnd.price) / 2;
      const rimLevel = (cupStart.price + cupEnd.price) / 2;
      
      // Look for handle (inverted - handle goes up slightly)
      const handleLows = swingLows.filter(l => l.index > cupEnd.index && l.index < cupEnd.index + 20);
      const handleHighs = swingHighs.filter(h => h.index > cupEnd.index && h.index < cupEnd.index + 20);
      
      if (handleHighs.length === 0) {
        // No handle yet, still valid inverted cup
        const confidence = 65;
        const targetPrice = rimLevel - cupDepth;
        
        patterns.push({
          type: 'inverse_cup_and_handle',
          cupStart: { index: cupStart.index, price: cupStart.price },
          cupBottom: { index: cupTop.index, price: cupTop.price }, // Actually cup top for inverted
          cupEnd: { index: cupEnd.index, price: cupEnd.price },
          handleStart: { index: cupEnd.index, price: cupEnd.price },
          handleBottom: { index: cupEnd.index, price: cupEnd.price },
          handleEnd: { index: cupEnd.index, price: cupEnd.price },
          rimLevel,
          targetPrice,
          confidence,
          breakoutDirection: 'down',
          cupDepth,
          handleDepth: 0,
          startIndex: cupStart.index,
          endIndex: cupEnd.index,
        });
        continue;
      }
      
      const handleTop = handleHighs.reduce((max, h) => h.price > max.price ? h : max, handleHighs[0]);
      const handleDepth = handleTop.price - cupEnd.price;
      
      // Handle should retrace 30-50% of cup depth
      const handleRetracement = handleDepth / cupDepth;
      if (handleRetracement < 0.1 || handleRetracement > 0.6) continue;
      
      const handleEnd = handleLows.length > 0 
        ? handleLows[handleLows.length - 1]
        : { index: candles.length - 1, price: candles[candles.length - 1].close };
      
      const confidence = 70 + (1 - Math.abs(handleRetracement - 0.35)) * 25;
      const targetPrice = rimLevel - cupDepth;
      
      patterns.push({
        type: 'inverse_cup_and_handle',
        cupStart: { index: cupStart.index, price: cupStart.price },
        cupBottom: { index: cupTop.index, price: cupTop.price }, // Actually cup top for inverted
        cupEnd: { index: cupEnd.index, price: cupEnd.price },
        handleStart: { index: cupEnd.index, price: cupEnd.price },
        handleBottom: { index: handleTop.index, price: handleTop.price }, // Actually handle top
        handleEnd: { index: handleEnd.index, price: handleEnd.price },
        rimLevel,
        targetPrice,
        confidence,
        breakoutDirection: 'down',
        cupDepth,
        handleDepth,
        startIndex: cupStart.index,
        endIndex: handleEnd.index,
      });
    }
  }
  
  return patterns;
}

// ==========================================================
// RECTANGLE DETECTION
// ==========================================================

export function detectRectangle(candles: OHLCV[]): RectanglePattern[] {
  if (candles.length < 30) return [];
  
  const patterns: RectanglePattern[] = [];
  const atr = calculateATR(candles);
  const tolerance = atr * 0.3;
  
  // Sliding window approach
  for (let start = 0; start < candles.length - 20; start++) {
    for (let end = start + 20; end < Math.min(start + 80, candles.length); end++) {
      const window = candles.slice(start, end + 1);
      
      const highs = window.map(c => c.high);
      const lows = window.map(c => c.low);
      
      const maxHigh = Math.max(...highs);
      const minLow = Math.min(...lows);
      const range = maxHigh - minLow;
      
      // Rectangle should have contained range
      if (range > atr * 4) continue;
      
      // Count touches of boundaries
      const topBoundary = maxHigh - tolerance / 2;
      const bottomBoundary = minLow + tolerance / 2;
      
      const touches: { index: number; price: number; boundary: 'top' | 'bottom' }[] = [];
      
      for (let i = 0; i < window.length; i++) {
        if (window[i].high >= topBoundary) {
          touches.push({ index: start + i, price: window[i].high, boundary: 'top' });
        }
        if (window[i].low <= bottomBoundary) {
          touches.push({ index: start + i, price: window[i].low, boundary: 'bottom' });
        }
      }
      
      const topTouches = touches.filter(t => t.boundary === 'top').length;
      const bottomTouches = touches.filter(t => t.boundary === 'bottom').length;
      
      if (topTouches < 2 || bottomTouches < 2) continue;
      
      // Determine pattern context
      const priorTrend = candles[start].close > candles[Math.max(0, start - 20)].close ? 'up' : 'down';
      let type: 'rectangle_top' | 'rectangle_bottom' | 'rectangle_continuation';
      let breakoutDirection: 'up' | 'down' | 'neutral';
      
      if (priorTrend === 'up') {
        type = 'rectangle_top';
        breakoutDirection = 'neutral';
      } else {
        type = 'rectangle_bottom';
        breakoutDirection = 'neutral';
      }
      
      const confidence = Math.min(90, 50 + (topTouches + bottomTouches) * 5);
      // Target defaults to upside since breakoutDirection is always 'neutral' until actual breakout
      const targetPrice = maxHigh + range;
      
      patterns.push({
        type,
        topBoundary: maxHigh,
        bottomBoundary: minLow,
        touches,
        breakoutDirection,
        targetPrice,
        confidence,
        startIndex: start,
        endIndex: end,
      });
    }
  }
  
  // Remove overlapping patterns, keep highest confidence
  const filtered: RectanglePattern[] = [];
  for (const pattern of patterns.sort((a, b) => b.confidence - a.confidence)) {
    const overlaps = filtered.some(p => 
      (pattern.startIndex >= p.startIndex && pattern.startIndex <= p.endIndex) ||
      (pattern.endIndex >= p.startIndex && pattern.endIndex <= p.endIndex)
    );
    if (!overlaps) {
      filtered.push(pattern);
    }
  }
  
  return filtered;
}

// ==========================================================
// ALL MISSING PATTERNS DETECTION
// ==========================================================

export interface AllMissingPatterns {
  headAndShoulders: HeadAndShouldersPattern[];
  doublePatterns: DoublePattern[];
  triplePatterns: TriplePattern[];
  cupAndHandle: CupAndHandlePattern[];
  rectangles: RectanglePattern[];
}

export function detectAllMissingPatterns(candles: OHLCV[]): AllMissingPatterns {
  return {
    headAndShoulders: detectHeadAndShoulders(candles, { mode: 'balanced' }),
    doublePatterns: detectDoubleTopBottom(candles, { mode: 'balanced' }),
    triplePatterns: detectTripleTopBottom(candles, { mode: 'balanced' }),
    cupAndHandle: detectCupAndHandle(candles),
    rectangles: detectRectangle(candles),
  };
}

export default {
  detectHeadAndShoulders,
  detectDoubleTopBottom,
  detectTripleTopBottom,
  detectCupAndHandle,
  detectRectangle,
  detectAllMissingPatterns,
};
