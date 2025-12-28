/**
 * Pattern Lifecycle Engine
 * ========================
 *
 * Evaluates detected chart patterns and classifies them into lifecycle stages:
 * - forming: identified but no breakout trigger yet
 * - triggered: breakout trigger (B) happened
 * - confirmed: breakout trigger + confirmation (C) happened
 * - hit_target: confirmed and target touched
 * - invalidated: confirmed then invalidated (failed)
 * - expired: took too long to confirm / resolve
 *
 * Confirmation policy (professional default):
 *   B + C
 *   B: 1 close beyond breakout line with ATR buffer
 *   C: Volume expansion OR RSI regime confirmation (fallback if volume missing)
 */

import type { OHLCV } from './technical';
import type {
  HeadAndShouldersPattern,
  DoublePattern,
  TriplePattern,
  CupAndHandlePattern,
  RectanglePattern,
} from './missing-patterns';

export type PatternLifecycleStage =
  | 'forming'
  | 'triggered'
  | 'confirmed'
  | 'hit_target'
  | 'invalidated'
  | 'expired';

export interface PatternLifecycleOptions {
  atrPeriod?: number;
  atrK?: number;

  volumeSmaPeriod?: number;
  volumeConfirmMultiple?: number;

  rsiPeriod?: number;
  rsiConfirmBull?: number;
  rsiConfirmBear?: number;

  confirmWindowBars?: number;

  /** Expiry before confirmation (from pattern.endIndex) */
  expiryMultiplier?: number;
  expiryMinBars?: number;
  expiryMaxBars?: number;

  /** Expiry after confirmation (from confirmIndex) */
  resolvedExpiryMultiplier?: number;
  resolvedExpiryMinBars?: number;
  resolvedExpiryMaxBars?: number;
}

export interface PatternLifecycleEvaluation {
  stage: PatternLifecycleStage;
  direction: 'up' | 'down' | 'neutral';
  triggerIndex?: number;
  confirmIndex?: number;
  targetHitIndex?: number;
  invalidationIndex?: number;

  atrAtTrigger?: number;
  bufferAtTrigger?: number;

  usedVolumeConfirm: boolean;
  usedRsiFallback: boolean;
  reasons: string[];
}

export type ClassicPattern =
  | HeadAndShouldersPattern
  | DoublePattern
  | TriplePattern
  | CupAndHandlePattern
  | RectanglePattern;

const DEFAULTS: Required<PatternLifecycleOptions> = {
  atrPeriod: 14,
  atrK: 0.5, // Relaxed from 1.5

  volumeSmaPeriod: 20,
  volumeConfirmMultiple: 1.1, // Relaxed from 2.0

  rsiPeriod: 14,
  rsiConfirmBull: 50, // Relaxed from 55
  rsiConfirmBear: 50, // Relaxed from 45

  confirmWindowBars: 15, // Relaxed from 5

  expiryMultiplier: 5.0, // Relaxed from 1.8
  expiryMinBars: 8,
  expiryMaxBars: 500, // Relaxed from 90

  resolvedExpiryMultiplier: 5.0, // Relaxed from 3.0
  resolvedExpiryMinBars: 20,
  resolvedExpiryMaxBars: 200,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function computeATRSeries(candles: OHLCV[], period: number): number[] {
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

  // SMA ATR series (deterministic)
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  atr[period] = sum / period;

  for (let i = period + 1; i < n; i++) {
    sum += tr[i] - tr[i - period];
    atr[i] = sum / period;
  }

  for (let i = 0; i < period; i++) atr[i] = atr[period];
  return atr;
}

function computeSMASeries(values: number[], period: number): number[] {
  const n = values.length;
  const out: number[] = new Array(n).fill(0);
  if (period <= 1) return values.slice();
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
    else out[i] = 0;
  }
  return out;
}

// Standard RSI with Wilder smoothing (stable + common)
function computeRSISeries(closes: number[], period: number): number[] {
  const n = closes.length;
  const rsi: number[] = new Array(n).fill(50);
  if (n < period + 1) return rsi;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += -diff;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rs0 = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0);

  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  // Fill pre-period values with first computed RSI
  for (let i = 0; i < period; i++) rsi[i] = rsi[period];
  return rsi;
}

function patternBars(p: ClassicPattern): number {
  return Math.max(1, (p.endIndex - p.startIndex) + 1);
}

function expiryBarsFromPattern(p: ClassicPattern, opts: Required<PatternLifecycleOptions>): number {
  return clamp(Math.round(patternBars(p) * opts.expiryMultiplier), opts.expiryMinBars, opts.expiryMaxBars);
}

function resolvedExpiryBarsFromPattern(p: ClassicPattern, opts: Required<PatternLifecycleOptions>): number {
  return clamp(
    Math.round(patternBars(p) * opts.resolvedExpiryMultiplier),
    opts.resolvedExpiryMinBars,
    opts.resolvedExpiryMaxBars
  );
}

function necklineAt(
  pattern: ClassicPattern,
  i: number
): { level: number; top?: number; bottom?: number; dirHint: 'up' | 'down' | 'neutral' } {
  // H&S
  if ('necklineSlope' in pattern) {
    const start = pattern.necklineStart;
    const level = start.price + pattern.necklineSlope * (i - start.index);
    return { level, dirHint: pattern.breakoutDirection };
  }

  // Double/Triple
  if ('neckline' in pattern) {
    return { level: pattern.neckline, dirHint: pattern.breakoutDirection };
  }

  // Cup & Handle
  if ('rimLevel' in pattern) {
    return { level: pattern.rimLevel, dirHint: pattern.breakoutDirection };
  }

  // Rectangle
  const top = pattern.topBoundary;
  const bottom = pattern.bottomBoundary;
  // If neutral, direction is determined by actual breakout.
  const dirHint = pattern.breakoutDirection === 'neutral' ? 'neutral' : pattern.breakoutDirection;
  // For rectangles we return a "center level" only as a fallback.
  return { level: (top + bottom) / 2, top, bottom, dirHint };
}

function hasUsableVolume(candles: OHLCV[]): boolean {
  // If most volumes are 0 or missing, treat as unusable.
  let positives = 0;
  for (const c of candles) {
    if (isFiniteNumber(c.volume) && c.volume > 0) positives++;
    if (positives >= 10) return true; // enough evidence
  }
  return false;
}

function isBreakoutB(
  close: number,
  level: number,
  buffer: number,
  dir: 'up' | 'down'
): boolean {
  if (dir === 'up') return close >= level + buffer;
  return close <= level - buffer;
}

function isInvalidation(
  close: number,
  level: number,
  buffer: number,
  dir: 'up' | 'down'
): boolean {
  // Invalidate if price closes back across the opposite side with buffer.
  // For Genius Mode, we want to allow deep retests.
  // So we multiply the buffer by 5 for invalidation checks to prevent killing valid retests.
  const deepBuffer = buffer * 5;
  if (dir === 'up') return close <= level - deepBuffer;
  return close >= level + deepBuffer;
}

function isTargetHit(c: OHLCV, target: number, dir: 'up' | 'down'): boolean {
  if (dir === 'up') return c.high >= target;
  return c.low <= target;
}

export function evaluatePatternLifecycle(
  pattern: ClassicPattern,
  candles: OHLCV[],
  options: PatternLifecycleOptions = {}
): PatternLifecycleEvaluation {
  const opts: Required<PatternLifecycleOptions> = { ...DEFAULTS, ...options };
  const n = candles.length;

  const reasons: string[] = [];
  const startIdx = clamp(pattern.startIndex, 0, n - 1);
  const endIdx = clamp(pattern.endIndex, 0, n - 1);
  if (endIdx < startIdx) {
    return {
      stage: 'expired',
      direction: 'neutral',
      usedVolumeConfirm: false,
      usedRsiFallback: false,
      reasons: ['invalid_pattern_indices'],
    };
  }
  if (n < 5 || endIdx >= n) {
    return {
      stage: 'expired',
      direction: 'neutral',
      usedVolumeConfirm: false,
      usedRsiFallback: false,
      reasons: ['insufficient_candles'],
    };
  }

  const expiryBars = expiryBarsFromPattern(pattern, opts);
  const expiryIdx = endIdx + expiryBars;
  const lastIdx = n - 1;

  const atrSeries = computeATRSeries(candles, opts.atrPeriod);
  const closes = candles.map(c => c.close);
  const rsi = computeRSISeries(closes, opts.rsiPeriod);

  const volumeOk = hasUsableVolume(candles);
  const volumes = candles.map(c => (isFiniteNumber(c.volume) ? c.volume : 0));
  const volSma = computeSMASeries(volumes, opts.volumeSmaPeriod);

  // Determine base direction hint
  const dirHint = ('breakoutDirection' in pattern ? pattern.breakoutDirection : 'neutral') as
    | 'up'
    | 'down'
    | 'neutral';

  // If pattern never triggers and time is past expiry => expired.
  if (lastIdx > expiryIdx) {
    reasons.push('past_expiry_before_confirm');
  }

  // Scan for trigger (B)
  let triggerIndex: number | undefined;
  let direction: 'up' | 'down' | 'neutral' = dirHint;
  let atrAtTrigger = 0;
  let bufferAtTrigger = 0;

  for (let i = endIdx; i <= lastIdx; i++) {
    const atrAt = atrSeries[i] || 0;
    const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001); // % floor

    const nl = necklineAt(pattern, i);

    if (nl.top != null && nl.bottom != null && (dirHint === 'neutral')) {
      // rectangle: decide direction by actual breakout
      const brokeUp = candles[i].close >= nl.top + buffer;
      const brokeDown = candles[i].close <= nl.bottom - buffer;
      if (brokeUp || brokeDown) {
        triggerIndex = i;
        direction = brokeUp ? 'up' : 'down';
        atrAtTrigger = atrAt;
        bufferAtTrigger = buffer;
        reasons.push('trigger_B_rectangle');
        break;
      }
      continue;
    }

    if (direction === 'neutral') {
      // fall back to pattern hint if it exists
      if (nl.dirHint !== 'neutral') direction = nl.dirHint;
      else direction = 'up';
    }

    const level = nl.level;
    if (isBreakoutB(candles[i].close, level, buffer, direction)) {
      triggerIndex = i;
      atrAtTrigger = atrAt;
      bufferAtTrigger = buffer;
      reasons.push('trigger_B');
      break;
    }
  }

  if (triggerIndex == null) {
    if (lastIdx > expiryIdx) {
      return {
        stage: 'expired',
        direction: dirHint,
        usedVolumeConfirm: false,
        usedRsiFallback: !volumeOk,
        reasons,
      };
    }
    return {
      stage: 'forming',
      direction: dirHint,
      usedVolumeConfirm: false,
      usedRsiFallback: !volumeOk,
      reasons,
    };
  }

  // Confirmation (C) within confirm window after trigger
  const confirmWindowEnd = Math.min(lastIdx, triggerIndex + opts.confirmWindowBars);
  let confirmIndex: number | undefined;
  let usedVolumeConfirm = false;
  let usedRsiFallback = false;

  for (let i = triggerIndex; i <= confirmWindowEnd; i++) {
    const atrAt = atrSeries[i] || atrAtTrigger || 0;
    const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001);

    const nl = necklineAt(pattern, i);

    // define level(s)
    let level = nl.level;
    if (nl.top != null && nl.bottom != null) {
      level = direction === 'up' ? nl.top : nl.bottom;
    }

    const stillBeyond = isBreakoutB(candles[i].close, level, buffer, direction === 'neutral' ? 'up' : direction);

    const volConfirmed =
      volumeOk &&
      isFiniteNumber(volumes[i]) &&
      isFiniteNumber(volSma[i]) &&
      volSma[i] > 0 &&
      volumes[i] >= volSma[i] * opts.volumeConfirmMultiple;

    const rsiVal = rsi[i] ?? 50;
    const rsiConfirmed =
      direction === 'up'
        ? rsiVal >= opts.rsiConfirmBull
        : rsiVal <= opts.rsiConfirmBear;

    const confirmC = (volConfirmed || (!volumeOk && rsiConfirmed) || (volumeOk && !volConfirmed && rsiConfirmed));

    if (stillBeyond && confirmC) {
      confirmIndex = i;
      usedVolumeConfirm = volConfirmed;
      usedRsiFallback = rsiConfirmed && (!volConfirmed);
      reasons.push(volConfirmed ? 'confirm_C_volume' : 'confirm_C_rsi');
      break;
    }
  }

  if (confirmIndex == null) {
    // Not confirmed yet
    if (lastIdx > expiryIdx) {
      reasons.push('expired_after_trigger');
      return {
        stage: 'expired',
        direction,
        triggerIndex,
        atrAtTrigger,
        bufferAtTrigger,
        usedVolumeConfirm: false,
        usedRsiFallback: !volumeOk,
        reasons,
      };
    }
    return {
      stage: 'triggered',
      direction,
      triggerIndex,
      atrAtTrigger,
      bufferAtTrigger,
      usedVolumeConfirm: false,
      usedRsiFallback: !volumeOk,
      reasons,
    };
  }

  // After confirmation: hit_target / invalidated / resolved-expired / confirmed
  let targetPrice: number | undefined = isFiniteNumber(pattern.targetPrice) ? pattern.targetPrice : undefined;

  // Rectangle downside target correction if needed
  if ('topBoundary' in pattern && 'bottomBoundary' in pattern) {
    const range = pattern.topBoundary - pattern.bottomBoundary;
    if (direction === 'down') targetPrice = pattern.bottomBoundary - range;
  }

  const resolvedExpiryBars = resolvedExpiryBarsFromPattern(pattern, opts);
  const resolvedExpiryIdx = confirmIndex + resolvedExpiryBars;

  let targetHitIndex: number | undefined;
  let invalidationIndex: number | undefined;

  for (let i = confirmIndex; i <= lastIdx; i++) {
    const atrAt = atrSeries[i] || atrAtTrigger || 0;
    const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001);

    const nl = necklineAt(pattern, i);
    let level = nl.level;
    if (nl.top != null && nl.bottom != null) {
      level = direction === 'up' ? nl.top : nl.bottom;
    }

    if (targetPrice != null && isTargetHit(candles[i], targetPrice, direction === 'neutral' ? 'up' : direction)) {
      targetHitIndex = i;
      reasons.push('hit_target');
      break;
    }

    if (direction !== 'neutral' && isInvalidation(candles[i].close, level, buffer, direction)) {
      invalidationIndex = i;
      reasons.push('invalidated');
      break;
    }

    if (i > resolvedExpiryIdx) {
      reasons.push('expired_after_confirm');
      return {
        stage: 'expired',
        direction,
        triggerIndex,
        confirmIndex,
        atrAtTrigger,
        bufferAtTrigger,
        usedVolumeConfirm,
        usedRsiFallback,
        reasons,
      };
    }
  }

  if (targetHitIndex != null) {
    return {
      stage: 'hit_target',
      direction,
      triggerIndex,
      confirmIndex,
      targetHitIndex,
      atrAtTrigger,
      bufferAtTrigger,
      usedVolumeConfirm,
      usedRsiFallback,
      reasons,
    };
  }

  if (invalidationIndex != null) {
    return {
      stage: 'invalidated',
      direction,
      triggerIndex,
      confirmIndex,
      invalidationIndex,
      atrAtTrigger,
      bufferAtTrigger,
      usedVolumeConfirm,
      usedRsiFallback,
      reasons,
    };
  }

  return {
    stage: 'confirmed',
    direction,
    triggerIndex,
    confirmIndex,
    atrAtTrigger,
    bufferAtTrigger,
    usedVolumeConfirm,
    usedRsiFallback,
    reasons,
  };
}

export function filterPatternsByLifecycle(
  patterns: ClassicPattern[],
  candles: OHLCV[],
  options: PatternLifecycleOptions = {}
): Array<{ pattern: ClassicPattern; evaluation: PatternLifecycleEvaluation }> {
  return patterns
    .map(p => ({ pattern: p, evaluation: evaluatePatternLifecycle(p, candles, options) }))
    .filter(x => x.evaluation.stage !== 'expired' && x.evaluation.stage !== 'invalidated');
}
