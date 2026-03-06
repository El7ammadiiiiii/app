/**
 * \ud83d\udd37 Chart Pattern Detection Engine v3 \u2014 PineScript Trend Lines v2 Approach
 * 
 * KEY CHANGES from v2:
 * 1. Lines built from 2-pivot pairs (like PineScript) \u2014 NOT regression
 *    \u2192 Lines ALWAYS sit on actual candle pivots
 * 2. Strict PineScript-style validation (max 8% violations)
 * 3. pivotPeriod: 15, flatThreshold: 0.015 (truly horizontal only)
 * 4. Largest windows first \u2192 big patterns priority
 * 5. A-B-C 3-point gap geometry for classification
 * 
 * @author CCWAYS Team
 * @version 3.0.0
 */

import { type Candle, detectPivotHigh, detectPivotLow } from './trendlines';

// ============================================================================
// 📊 TYPES
// ============================================================================

export type ChartPatternType =
  | 'ascending_channel'
  | 'descending_channel'
  | 'rectangle'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'rising_wedge_continuation'
  | 'rising_wedge_reversal'
  | 'falling_wedge_continuation'
  | 'falling_wedge_reversal'
  | 'ascending_broadening'
  | 'descending_broadening'
  | 'bull_flag'
  | 'bear_flag'
  | 'bull_pennant'
  | 'bear_pennant';

export type PatternDirection = 'bullish' | 'bearish' | 'neutral';

export interface PatternLine {
  startIdx: number;
  startPrice: number;
  endIdx: number;
  endPrice: number;
  slope: number;        // price-per-bar (positive = rising, negative = falling)
  slopeNorm: number;    // ATR-normalised slope for classification
  r2: number;           // goodness of fit 0..1
  touchCount: number;   // how many pivots touch this line
}

export interface DetectedChartPattern {
  type: ChartPatternType;
  name: string;
  nameAr: string;
  direction: PatternDirection;
  upperLine: PatternLine;
  lowerLine: PatternLine;
  confidence: number;    // 0..100
  startIdx: number;
  endIdx: number;
  pivotHighs: [number, number][];  // [barIdx, price]
  pivotLows: [number, number][];
  priorTrend: 'up' | 'down' | 'neutral';
}

export interface PatternDetectionResult {
  patterns: DetectedChartPattern[];
  allPivotHighs: [number, number][];
  allPivotLows: [number, number][];
}

export interface PatternDetectionConfig {
  pivotPeriod: number;
  maxPivots: number;
  minPatternBars: number;
  flatThreshold: number;
  parallelThreshold: number;
  maxViolationPct: number;
  minConfidence: number;
}

const DEFAULT_CONFIG: PatternDetectionConfig = {
  pivotPeriod: 15,       // PineScript uses 20; 15 = compromise for 1h data
  maxPivots: 16,
  minPatternBars: 30,    // hide patterns below 30 candles
  flatThreshold: 0.01,   // strict horizontal: ±0.01 ATR
  parallelThreshold: 0.35,
  maxViolationPct: 8,    // strict like PineScript (was 18)
  minConfidence: 30,
};

// ============================================================================
// 🔬 PATTERN INFO MAP
// ============================================================================

const PATTERN_INFO: Record<ChartPatternType, { name: string; nameAr: string; direction: PatternDirection }> = {
  ascending_channel:          { name: 'Ascending Channel',          nameAr: 'قناة صاعدة',             direction: 'bullish' },
  descending_channel:         { name: 'Descending Channel',         nameAr: 'قناة هابطة',             direction: 'bearish' },
  rectangle:                  { name: 'Rectangle',                  nameAr: 'مستطيل',                direction: 'neutral' },
  ascending_triangle:         { name: 'Ascending Triangle',         nameAr: 'مثلث صاعد',             direction: 'bullish' },
  descending_triangle:        { name: 'Descending Triangle',        nameAr: 'مثلث هابط',             direction: 'bearish' },
  symmetrical_triangle:       { name: 'Symmetrical Triangle',       nameAr: 'مثلث متماثل',           direction: 'neutral' },
  rising_wedge_continuation:  { name: 'Continuation Rising Wedge',  nameAr: 'وتد صاعد استمراري',     direction: 'bearish' },
  rising_wedge_reversal:      { name: 'Reversal Rising Wedge',      nameAr: 'وتد صاعد انعكاسي',      direction: 'bearish' },
  falling_wedge_continuation: { name: 'Continuation Falling Wedge', nameAr: 'وتد هابط استمراري',     direction: 'bullish' },
  falling_wedge_reversal:     { name: 'Reversal Falling Wedge',     nameAr: 'وتد هابط انعكاسي',      direction: 'bullish' },
  ascending_broadening:       { name: 'Ascending Broadening Wedge', nameAr: 'وتد توسع صاعد',         direction: 'bearish' },
  descending_broadening:      { name: 'Descending Broadening Wedge',nameAr: 'وتد توسع هابط',         direction: 'bullish' },
  bull_flag:                  { name: 'Bull Flag',                  nameAr: 'علم صعودي',             direction: 'bullish' },
  bear_flag:                  { name: 'Bear Flag',                  nameAr: 'علم هبوطي',             direction: 'bearish' },
  bull_pennant:               { name: 'Bull Pennant',               nameAr: 'راية صعودية',           direction: 'bullish' },
  bear_pennant:               { name: 'Bear Pennant',               nameAr: 'راية هبوطية',           direction: 'bearish' },
};

// ============================================================================
// 📐 MATH UTILITIES
// ============================================================================

// linearRegression removed in v3 — using PineScript 2-pivot-pair approach instead

/** Average True Range */
function computeATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 1;
  let sum = 0;
  const count = Math.min(period, candles.length - 1);
  for (let i = candles.length - count; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    sum += tr;
  }
  return sum / count || 1;
}

// countTouches inlined into buildLineOnRange in v3

/** Count violations: how many candle closes cross a line */
function countViolations(
  candles: Candle[],
  slope: number,
  intercept: number,
  startIdx: number,
  endIdx: number,
  side: 'above' | 'below'
): number {
  let violations = 0;
  for (let i = startIdx; i <= endIdx && i < candles.length; i++) {
    const lineVal = slope * i + intercept;
    if (side === 'above' && candles[i].close > lineVal) violations++;
    if (side === 'below' && candles[i].close < lineVal) violations++;
  }
  return violations;
}

/** Detect prior trend direction before a given index */
function detectPriorTrend(candles: Candle[], beforeIdx: number, lookback: number = 20): 'up' | 'down' | 'neutral' {
  const startIdx = Math.max(0, beforeIdx - lookback);
  if (startIdx >= beforeIdx) return 'neutral';
  const startPrice = candles[startIdx].close;
  const endPrice = candles[beforeIdx].close;
  const changePct = (endPrice - startPrice) / startPrice;
  if (changePct > 0.025) return 'up';
  if (changePct < -0.025) return 'down';
  return 'neutral';
}

/** Check if there's a strong impulse move (pole) before pattern start */
function detectPole(
  candles: Candle[],
  patternStartIdx: number,
  minPoleChangePct: number = 0.04
): { found: boolean; direction: 'up' | 'down'; strength: number } {
  // Look back 5-15 bars for a sharp move
  for (const lookback of [5, 8, 10, 15]) {
    const poleStart = patternStartIdx - lookback;
    if (poleStart < 0) continue;
    const change = (candles[patternStartIdx].close - candles[poleStart].close) / candles[poleStart].close;
    if (Math.abs(change) >= minPoleChangePct) {
      return { found: true, direction: change > 0 ? 'up' : 'down', strength: Math.abs(change) };
    }
  }
  return { found: false, direction: 'up', strength: 0 };
}

/** Return pivots close to a target index (for boundary anchoring) */
function pivotsNearIndex(
  pivots: [number, number][],
  targetIdx: number,
  maxDist: number = 2
): [number, number][] {
  return pivots.filter(([idx]) => Math.abs(idx - targetIdx) <= maxDist);
}

/** Pick boundary anchor candidates adaptively: 2 → 4 → 6 → 8 bars, then nearest fallback. */
function pickBoundaryAnchors(
  pivots: [number, number][],
  targetIdx: number,
  maxCandidates: number = 3
): [number, number][] {
  for (const d of [2, 4, 6, 8]) {
    const found = pivotsNearIndex(pivots, targetIdx, d)
      .sort((a, b) => Math.abs(a[0] - targetIdx) - Math.abs(b[0] - targetIdx));
    if (found.length > 0) return found.slice(0, maxCandidates);
  }

  // Hard fallback: nearest pivots so detection doesn't collapse to empty results.
  return [...pivots]
    .sort((a, b) => Math.abs(a[0] - targetIdx) - Math.abs(b[0] - targetIdx))
    .slice(0, maxCandidates);
}

/**
 * Structured touch rule:
 * - Prefer body-based contact at the line (not just wick tip).
 * - Allow wick-only touch only if previous candle body confirms structure near the same line.
 */
function validateStructuredTouch(
  candles: Candle[],
  idx: number,
  lineY: number,
  side: 'upper' | 'lower',
  tol: number
): boolean {
  if (idx < 0 || idx >= candles.length) return false;
  const c = candles[idx];
  const prev = idx > 0 ? candles[idx - 1] : null;

  const bodyTop = Math.max(c.open, c.close);
  const bodyBottom = Math.min(c.open, c.close);

  if (side === 'upper') {
    const bodyTouch = Math.abs(bodyTop - lineY) <= tol;
    const wickTouch = c.high >= lineY - tol && c.high <= lineY + tol;
    if (bodyTouch) return true;
    if (!wickTouch || !prev) return false;

    const prevBodyTop = Math.max(prev.open, prev.close);
    const prevWickTouch = prev.high >= lineY - tol * 1.5 && prev.high <= lineY + tol * 1.5;
    return Math.abs(prevBodyTop - lineY) <= tol * 1.5 || prevWickTouch;
  }

  const bodyTouch = Math.abs(bodyBottom - lineY) <= tol;
  const wickTouch = c.low >= lineY - tol && c.low <= lineY + tol;
  if (bodyTouch) return true;
  if (!wickTouch || !prev) return false;

  const prevBodyBottom = Math.min(prev.open, prev.close);
  const prevWickTouch = prev.low >= lineY - tol * 1.5 && prev.low <= lineY + tol * 1.5;
  return Math.abs(prevBodyBottom - lineY) <= tol * 1.5 || prevWickTouch;
}

// ============================================================================
// 🔵 PIVOT COLLECTION
// ============================================================================

export function collectAllPivots(
  candles: Candle[],
  pivotPeriod: number = 10,
  maxPivots: number = 12
): { pivotHighs: [number, number][]; pivotLows: [number, number][] } {
  const n = candles.length;
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const pivotHighs: [number, number][] = [];
  const pivotLows: [number, number][] = [];

  for (let i = pivotPeriod; i < n; i++) {
    const ph = detectPivotHigh(highs, i, pivotPeriod);
    if (ph !== null) {
      pivotHighs.push([i - pivotPeriod, ph]);
      if (pivotHighs.length > maxPivots) pivotHighs.shift();
    }
    const pl = detectPivotLow(lows, i, pivotPeriod);
    if (pl !== null) {
      pivotLows.push([i - pivotPeriod, pl]);
      if (pivotLows.length > maxPivots) pivotLows.shift();
    }
  }

  return { pivotHighs, pivotLows };
}

// ============================================================================
// 🏗️ BUILD A LINE — PineScript 2-pivot pair + edge anchoring on candles
// ============================================================================

/**
 * PineScript-inspired line building with candle-anchored endpoints:
 *
 * 1. Try ALL 2-pivot pairs (like PineScript Trend Lines v2)
 * 2. For each pair: draw a direct line through 2 actual candle pivots
 * 3. Validate with strict violation check (max 8% closes crossing)
 * 4. EDGE PENALTY: strongly prefer pivots at the shared range boundaries
 *    → minimises projection distance → lines visually sit ON candles
 * 5. SNAP: if winning pivot is within 2 bars of boundary, use the actual
 *    candle high/low value instead of projecting → line anchored ON wick
 */
function buildLineOnRange(
  pivots: [number, number][],
  candles: Candle[],
  atr: number,
  side: 'upper' | 'lower',
  sharedStart: number,
  sharedEnd: number,
  cfg: PatternDetectionConfig
): PatternLine | null {
  if (pivots.length < 2) return null;

  const totalBars = sharedEnd - sharedStart + 1;
  if (totalBars < cfg.minPatternBars) return null;

  // Adaptive boundary anchors keep line attached to structure without killing recall.
  const leftAnchors = pickBoundaryAnchors(pivots, sharedStart, 3);
  const rightAnchors = pickBoundaryAnchors(pivots, sharedEnd, 3);

  if (leftAnchors.length === 0 || rightAnchors.length === 0) return null;

  let bestScore = -Infinity;
  let bestPair: {
    x1: number; y1: number; x2: number; y2: number;
    slope: number; intercept: number; slopeNorm: number;
    r2: number; touches: number;
  } | null = null;

  // ── Try boundary-anchored pivot pairs only (edge-first Pine-like behavior) ──
  for (const [x1, y1] of leftAnchors) {
    for (const [x2, y2] of rightAnchors) {
      if (x2 === x1) continue;
      if (x2 < x1) continue;

      // Direct line through 2 pivot candles
      const slope = (y2 - y1) / (x2 - x1);
      const intercept = y1 - slope * x1;
      const slopeNorm = atr > 0 ? slope / atr : 0;
      const touchTol = atr * 0.4;

      // C endpoint must be structurally valid on candle touch.
      if (!validateStructuredTouch(candles, x2, y2, side, touchTol)) continue;

      // ── PineScript-style strict validation ──
      const violations = countViolations(
        candles, slope, intercept, sharedStart, sharedEnd,
        side === 'upper' ? 'above' : 'below'
      );
      const violationPct = (violations / totalBars) * 100;
      if (violationPct > cfg.maxViolationPct) continue;

      // ── Count how many pivots touch this line ──
      let touches = 0;
      for (const [px, py] of pivots) {
        const lineY = slope * px + intercept;
        const pivotNearLine = Math.abs(py - lineY) <= touchTol;
        if (!pivotNearLine) continue;
        touches++;
      }
      if (touches < 2) continue;

      // ── R² against ALL pivots ──
      const yMean = pivots.reduce((s, p) => s + p[1], 0) / pivots.length;
      let ssTot = 0, ssRes = 0;
      for (const [px, py] of pivots) {
        ssTot += (py - yMean) ** 2;
        ssRes += (py - (slope * px + intercept)) ** 2;
      }
      const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 0;

      // ── EDGE PENALTY: prefer pivots at shared range boundaries ──
      // This is the KEY fix: ensures line endpoints land ON candle wicks
      // instead of projecting far from actual pivot positions
      const span = x2 - x1;
      const startDist = Math.abs(x1 - sharedStart);
      const endDist = Math.abs(x2 - sharedEnd);
      const score = span * 2 + touches * 15 + r2 * 20
                    - violationPct * 5
                    - (startDist + endDist) * 8;

      if (score > bestScore) {
        bestScore = score;
        bestPair = { x1, y1, x2, y2, slope, intercept, slopeNorm, r2, touches };
      }
    }
  }

  if (!bestPair) return null;

  // ── SNAP endpoints to boundary anchor pivots ──
  const { x1, y1, x2, y2, slope, intercept, slopeNorm, r2, touches } = bestPair;

  return {
    // True anchored endpoints on actual pivot candles
    startIdx: x1,
    startPrice: y1,
    endIdx: x2,
    endPrice: y2,
    slope,
    slopeNorm,
    r2,
    touchCount: touches,
  };
}

// ============================================================================
// 🏷️ CLASSIFY PATTERN — A-B-C 3-Point Gap Geometry
// ============================================================================

/**
 * Classification via A-B-C gap geometry:
 *
 *   gapA = upper(start) – lower(start)      (gap at left edge)
 *   gapB = upper(mid)   – lower(mid)        (gap at midpoint)
 *   gapC = upper(end)   – lower(end)        (gap at right edge)
 *
 *   PARALLEL  : gapA ≈ gapB ≈ gapC
 *   CONVERGING: gapA > gapB > gapC
 *   DIVERGING : gapA < gapB < gapC
 *
 * Flat means truly horizontal: |slopeNorm| <= flatThreshold (0.01 ATR).
 * If the geometry doesn't strictly match any pattern \u2192 return null.
 */
function classifyPattern(
  upper: PatternLine,
  lower: PatternLine,
  candles: Candle[],
  cfg: PatternDetectionConfig
): ChartPatternType | null {
  const startIdx = Math.max(upper.startIdx, lower.startIdx);
  const endIdx = Math.min(upper.endIdx, lower.endIdx);
  if (endIdx <= startIdx) return null;

  const upperIntercept = upper.startPrice - upper.slope * upper.startIdx;
  const lowerIntercept = lower.startPrice - lower.slope * lower.startIdx;

  const uS = upper.slopeNorm;
  const lS = lower.slopeNorm;
  const flat = cfg.flatThreshold; // 0.01

  // ── Slope directions ──
  const upperUp   = uS >  flat;
  const upperDown = uS < -flat;
  const upperFlat = !upperUp && !upperDown;

  const lowerUp   = lS >  flat;
  const lowerDown = lS < -flat;
  const lowerFlat = !lowerUp && !lowerDown;

  // ── A-B-C gap geometry ──
  const midIdx = Math.round((startIdx + endIdx) / 2);
  const upperStart = upper.slope * startIdx + upperIntercept;
  const lowerStart = lower.slope * startIdx + lowerIntercept;
  const upperMid = upper.slope * midIdx + upperIntercept;
  const lowerMid = lower.slope * midIdx + lowerIntercept;
  const upperEnd = upper.slope * endIdx + upperIntercept;
  const lowerEnd = lower.slope * endIdx + lowerIntercept;

  const gapA = upperStart - lowerStart; // gap at start
  const gapB = upperMid - lowerMid;                 // gap at midpoint
  const gapC = upperEnd - lowerEnd;                 // gap at end

  // Sanity: upper must be above lower everywhere
  if (gapA <= 0 || gapC <= 0) return null;

  const gapRatioAB = gapA > 0 ? gapB / gapA : 0;
  const gapRatioBC = gapB > 0 ? gapC / gapB : 0;
  const gapRatioAC = gapA > 0 ? gapC / gapA : 0;

  const isParallel =
    gapRatioAC >= 0.9 && gapRatioAC <= 1.1 &&
    gapRatioAB >= 0.9 && gapRatioAB <= 1.1 &&
    gapRatioBC >= 0.9 && gapRatioBC <= 1.1;

  const isConverging =
    gapA > gapB && gapB > gapC &&
    gapRatioAC < 0.9;

  const isDiverging =
    gapA < gapB && gapB < gapC &&
    gapRatioAC > 1.1;

  // ── Prior context ──
  const patternStart = startIdx;
  const pole = detectPole(candles, patternStart);
  const priorTrend = detectPriorTrend(candles, patternStart);

  // ═══════════════════════════════════════════════════════════════════
  // 1. FLAT + FLAT + PARALLEL  →  Rectangle
  // ═══════════════════════════════════════════════════════════════════
  if (upperFlat && lowerFlat && isParallel) {
    return 'rectangle';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. FALLING upper + FLAT lower + CONVERGING  →  Ascending Triangle
  //    الخط السفلي أفقي + الخط العلوي ينحني للأسفل ويلتقون بالنهاية
  // ═══════════════════════════════════════════════════════════════════
  if (upperDown && lowerFlat && isConverging) {
    return 'ascending_triangle';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. FLAT upper + RISING lower + CONVERGING  →  Descending Triangle
  //    الخط العلوي أفقي + الخط السفلي يصعد تدريجيا حتى يلتقون
  // ═══════════════════════════════════════════════════════════════════
  if (upperFlat && lowerUp && isConverging) {
    return 'descending_triangle';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. FALLING upper + RISING lower + CONVERGING  →  Sym Triangle / Pennants
  // ═══════════════════════════════════════════════════════════════════
  if (upperDown && lowerUp && isConverging) {
    const slopeBalance = Math.abs(uS / (lS || 1e-12));
    if (slopeBalance < 0.35 || slopeBalance > 2.8) return null;
    if (pole.found && pole.strength >= 0.06 && pole.direction === 'up')   return 'bull_pennant';
    if (pole.found && pole.strength >= 0.06 && pole.direction === 'down') return 'bear_pennant';
    return 'symmetrical_triangle';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. Both UP + PARALLEL  →  Ascending Channel
  // ═══════════════════════════════════════════════════════════════════
  if (upperUp && lowerUp && isParallel) {
    return 'ascending_channel';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. Both DOWN + PARALLEL  →  Descending Channel
  // ═══════════════════════════════════════════════════════════════════
  if (upperDown && lowerDown && isParallel) {
    return 'descending_channel';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6.b Flags: converging opposite drift after a strong pole
  // ═══════════════════════════════════════════════════════════════════
  if (upperDown && lowerDown && isConverging && pole.found && pole.strength >= 0.05 && pole.direction === 'up') {
    return 'bull_flag';
  }
  if (upperUp && lowerUp && isConverging && pole.found && pole.strength >= 0.05 && pole.direction === 'down') {
    return 'bear_flag';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. Both UP + CONVERGING  →  Rising Wedge
  // ═══════════════════════════════════════════════════════════════════
  if (upperUp && lowerUp && isConverging) {
    if (priorTrend === 'up') return 'rising_wedge_reversal';
    return 'rising_wedge_continuation';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. Both DOWN + CONVERGING  →  Falling Wedge
  // ═══════════════════════════════════════════════════════════════════
  if (upperDown && lowerDown && isConverging) {
    if (priorTrend === 'down') return 'falling_wedge_reversal';
    return 'falling_wedge_continuation';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 9. Both UP + DIVERGING  →  Ascending Broadening
  //    or RISING upper + FLAT lower + DIVERGING
  // ═══════════════════════════════════════════════════════════════════
  if ((upperUp && lowerUp && isDiverging)
      || (upperUp && lowerFlat && isDiverging)) {
    return 'ascending_broadening';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 10. Both DOWN + DIVERGING  →  Descending Broadening
  //     or FLAT upper + FALLING lower + DIVERGING
  // ═══════════════════════════════════════════════════════════════════
  if ((upperDown && lowerDown && isDiverging)
      || (upperFlat && lowerDown && isDiverging)) {
    return 'descending_broadening';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 11. RISING upper + FALLING lower + DIVERGING  →  Broadening megaphone
  // ═══════════════════════════════════════════════════════════════════
  if (upperUp && lowerDown && isDiverging) {
    if (uS > Math.abs(lS)) return 'ascending_broadening';
    return 'descending_broadening';
  }

  // ── Nothing matched strictly → return null (don't guess) ──
  return null;
}

// ============================================================================
// 🚀 MAIN DETECTION ENTRY POINT
// ============================================================================

export function detectPatterns(
  candles: Candle[],
  userConfig: Partial<PatternDetectionConfig> = {}
): PatternDetectionResult {
  const cfg = { ...DEFAULT_CONFIG, ...userConfig };
  const n = candles.length;

  if (n < cfg.pivotPeriod * 2 + cfg.minPatternBars) {
    return { patterns: [], allPivotHighs: [], allPivotLows: [] };
  }

  const atr = computeATR(candles);

  // ── Collect pivots at multiple scales ──
  const allPH: [number, number][] = [];
  const allPL: [number, number][] = [];

  const scales = [cfg.pivotPeriod, Math.round(cfg.pivotPeriod * 1.5), cfg.pivotPeriod * 2];
  for (const pp of scales) {
    const { pivotHighs, pivotLows } = collectAllPivots(candles, pp, cfg.maxPivots);
    for (const p of pivotHighs) {
      if (!allPH.some(e => Math.abs(e[0] - p[0]) < 3)) allPH.push(p);
    }
    for (const p of pivotLows) {
      if (!allPL.some(e => Math.abs(e[0] - p[0]) < 3)) allPL.push(p);
    }
  }

  allPH.sort((a, b) => a[0] - b[0]);
  allPL.sort((a, b) => a[0] - b[0]);

  if (allPH.length < 2 || allPL.length < 2) {
    return { patterns: [], allPivotHighs: allPH, allPivotLows: allPL };
  }

  // ── Try sliding windows ──
  const patterns: DetectedChartPattern[] = [];
  const usedRanges: [number, number][] = [];

  // ── LARGEST windows first → bigger patterns get priority ──
  const maxWin = Math.min(8, allPH.length, allPL.length);
  for (let windowSize = maxWin; windowSize >= 3; windowSize--) {
    for (let hi = 0; hi <= allPH.length - windowSize; hi++) {
      const highsWindow = allPH.slice(hi, hi + windowSize);

      for (let li = 0; li <= allPL.length - windowSize; li++) {
        const lowsWindow = allPL.slice(li, li + windowSize);

        // ── SHARED RANGE: both lines start and end at the same bar ──
        const hStart = highsWindow[0][0];
        const hEnd = highsWindow[highsWindow.length - 1][0];
        const lStart = lowsWindow[0][0];
        const lEnd = lowsWindow[lowsWindow.length - 1][0];

        const sharedStart = Math.max(hStart, lStart);
        const sharedEnd = Math.min(hEnd, lEnd);
        if (sharedEnd - sharedStart < cfg.minPatternBars) continue;

        // Skip already-used ranges
        if (usedRanges.some(([s, e]) => sharedStart < e && sharedEnd > s)) continue;

        // ── Build lines on the SHARED range ──
        const upperLine = buildLineOnRange(highsWindow, candles, atr, 'upper', sharedStart, sharedEnd, cfg);
        const lowerLine = buildLineOnRange(lowsWindow, candles, atr, 'lower', sharedStart, sharedEnd, cfg);
        if (!upperLine || !lowerLine) continue;

        const upperLen = upperLine.endIdx - upperLine.startIdx;
        const lowerLen = lowerLine.endIdx - lowerLine.startIdx;

        // Line lengths can differ, but by no more than 10 candles.
        if (Math.abs(upperLen - lowerLen) > 10) continue;

        // Pattern span filter is enforced on shared range (hard minimum 30 candles).
        const patternStart = sharedStart;
        const patternEnd = sharedEnd;

        const upperIntercept = upperLine.startPrice - upperLine.slope * upperLine.startIdx;
        const lowerIntercept = lowerLine.startPrice - lowerLine.slope * lowerLine.startIdx;
        const upperAtStart = upperLine.slope * patternStart + upperIntercept;
        const lowerAtStart = lowerLine.slope * patternStart + lowerIntercept;
        const upperAtEnd = upperLine.slope * patternEnd + upperIntercept;
        const lowerAtEnd = lowerLine.slope * patternEnd + lowerIntercept;

        // Upper must remain above lower at shared-range endpoints.
        if (upperAtStart < lowerAtStart) continue;
        if (upperAtEnd < lowerAtEnd) continue;

        // ── Classify ──
        const patternType = classifyPattern(upperLine, lowerLine, candles, cfg);
        if (!patternType) continue;

        const info = PATTERN_INFO[patternType];
        const priorTrend = detectPriorTrend(candles, patternStart);

        // ── Confidence scoring ──
        const r2Score = ((upperLine.r2 + lowerLine.r2) / 2) * 40;
        const touchScore = Math.min((upperLine.touchCount + lowerLine.touchCount) / 8, 1) * 30;
        const sizeScore = Math.min((patternEnd - patternStart) / 50, 1) * 15;
        const recencyScore = (patternEnd > n - 30 ? 15 : patternEnd > n - 60 ? 10 : 5);
        const confidence = Math.round(r2Score + touchScore + sizeScore + recencyScore);

        if (confidence < cfg.minConfidence) continue;

        patterns.push({
          type: patternType,
          name: info.name,
          nameAr: info.nameAr,
          direction: info.direction,
          upperLine,
          lowerLine,
          confidence,
          startIdx: patternStart,
          endIdx: patternEnd,
          pivotHighs: highsWindow,
          pivotLows: lowsWindow,
          priorTrend,
        });

        usedRanges.push([patternStart, patternEnd]);
      }
    }
  }

  patterns.sort((a, b) => b.confidence - a.confidence);

  return { patterns, allPivotHighs: allPH, allPivotLows: allPL };
}

/** Quick helper: detect the single best pattern from candles */
export function detectBestPattern(candles: Candle[]): DetectedChartPattern | null {
  const result = detectPatterns(candles);
  return result.patterns[0] || null;
}
