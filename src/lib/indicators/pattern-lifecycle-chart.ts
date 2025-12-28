/**
 * Chart-Pattern Lifecycle Engine (Channels / Wedges / Triangles / Flags)
 * =====================================================================
 *
 * Extends the classic lifecycle idea (forming → triggered → confirmed → hit_target → invalidated → expired)
 * to the geometric patterns produced by `chart-patterns.ts`.
 *
 * Confirmation policy (same spirit as classic patterns):
 *   B + C
 *   B: 1 close beyond boundary with ATR buffer
 *   C: Volume expansion OR RSI regime confirmation (fallback if volume missing)
 */

import type { OHLCV } from "./technical";
import type { DetectedPattern } from "./chart-patterns";

export type PatternLifecycleStage =
  | "forming"
  | "triggered"
  | "confirmed"
  | "hit_target"
  | "invalidated"
  | "expired";

export interface ChartPatternLifecycleOptions {
  atrPeriod?: number;
  atrK?: number;

  volumeSmaPeriod?: number;
  volumeConfirmMultiple?: number;

  rsiPeriod?: number;
  rsiConfirmBull?: number;
  rsiConfirmBear?: number;

  confirmWindowBars?: number;

  /** Expiry before confirmation (from pattern.endIdx) */
  expiryMultiplier?: number;
  expiryMinBars?: number;
  expiryMaxBars?: number;

  /** Expiry after trigger/confirmation */
  resolvedExpiryMultiplier?: number;
  resolvedExpiryMinBars?: number;
  resolvedExpiryMaxBars?: number;
}

export interface ChartPatternLifecycleEvaluation {
  stage: PatternLifecycleStage;
  direction: "up" | "down";
  triggerIndex?: number;
  confirmIndex?: number;
  targetHitIndex?: number;
  invalidationIndex?: number;

  usedVolumeConfirm: boolean;
  usedRsiFallback: boolean;
  reasons: string[];
}

const DEFAULTS: Required<ChartPatternLifecycleOptions> = {
  atrPeriod: 14,
  atrK: 0.5, // Relaxed from 1.4 for Genius Mode

  volumeSmaPeriod: 20,
  volumeConfirmMultiple: 1.1, // Relaxed from 1.6

  rsiPeriod: 14,
  rsiConfirmBull: 50, // Relaxed from 55
  rsiConfirmBear: 50, // Relaxed from 45

  confirmWindowBars: 15, // Relaxed from 5

  expiryMultiplier: 5.0, // Relaxed from 2.0
  expiryMinBars: 10,
  expiryMaxBars: 500, // Relaxed from 120

  resolvedExpiryMultiplier: 5.0, // Relaxed from 3.0
  resolvedExpiryMinBars: 20,
  resolvedExpiryMaxBars: 500, // Relaxed from 240
};

function normalizeDirection(pattern: DetectedPattern): "up" | "down" {
  const d = pattern.breakoutDirection;
  if (d === "up" || d === "down") return d;

  // Use effective direction if provided and not neutral (from strict parser/logic)
  if (pattern.effectiveBreakoutDirection && pattern.effectiveBreakoutDirection !== "neutral") {
    return pattern.effectiveBreakoutDirection;
  }

  const type = (pattern as any).type as string | undefined;
  if (type) {
    if (type.includes("bear") || type.includes("descending")) return "down";
    if (type.includes("bull") || type.includes("ascending")) return "up";
  }

  const slope = (pattern.upperLine?.slope ?? pattern.lowerLine?.slope ?? 0);
  if (slope < 0) return "down";
  return "up";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
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
  }
  return out;
}

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
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = 0; i < period; i++) rsi[i] = rsi[period];
  return rsi;
}

function hasUsableVolume(candles: OHLCV[]): boolean {
  let positives = 0;
  for (const c of candles) {
    if (isFiniteNumber(c.volume) && c.volume > 0) positives++;
    if (positives >= 10) return true;
  }
  return false;
}

function patternBars(p: DetectedPattern): number {
  return Math.max(1, (p.endIdx - p.startIdx) + 1);
}

function expiryBarsFromPattern(p: DetectedPattern, opts: Required<ChartPatternLifecycleOptions>): number {
  return clamp(Math.round(patternBars(p) * opts.expiryMultiplier), opts.expiryMinBars, opts.expiryMaxBars);
}

function resolvedExpiryBarsFromPattern(p: DetectedPattern, opts: Required<ChartPatternLifecycleOptions>): number {
  return clamp(
    Math.round(patternBars(p) * opts.resolvedExpiryMultiplier),
    opts.resolvedExpiryMinBars,
    opts.resolvedExpiryMaxBars
  );
}

function upperAt(p: DetectedPattern, i: number): number | null {
  if (!p.upperLine) return null;
  return p.upperLine.slope * i + p.upperLine.intercept;
}

function lowerAt(p: DetectedPattern, i: number): number | null {
  if (!p.lowerLine) return null;
  return p.lowerLine.slope * i + p.lowerLine.intercept;
}

function breakoutBoundaryAt(p: DetectedPattern, i: number, dir: "up" | "down"): number | null {
  return dir === "up" ? upperAt(p, i) : lowerAt(p, i);
}

function invalidationBoundaryAt(p: DetectedPattern, i: number, dir: "up" | "down"): number | null {
  // Invalidate only if price breaks the OPPOSITE side (Stop Loss logic).
  // Previously this checked for re-entry (fakeout), but that hides valid retests.
  return dir === "up" ? lowerAt(p, i) : upperAt(p, i);
}

function isBreakoutB(close: number, boundary: number, buffer: number, dir: "up" | "down"): boolean {
  return dir === "up" ? close >= boundary + buffer : close <= boundary - buffer;
}

function isInvalidation(close: number, boundary: number, buffer: number, dir: "up" | "down"): boolean {
  // invalidate if price closes back inside by buffer.
  return dir === "up" ? close <= boundary - buffer : close >= boundary + buffer;
}

function isTargetHit(c: OHLCV, target: number, dir: "up" | "down"): boolean {
  return dir === "up" ? c.high >= target : c.low <= target;
}

export function evaluateChartPatternLifecycle(
  pattern: DetectedPattern,
  candles: OHLCV[],
  options: ChartPatternLifecycleOptions = {}
): ChartPatternLifecycleEvaluation {
  const opts: Required<ChartPatternLifecycleOptions> = { ...DEFAULTS, ...options };

  const direction: "up" | "down" = normalizeDirection(pattern);

  const n = candles.length;
  const reasons: string[] = [];
  if (n < 30) {
    return {
      stage: "expired",
      direction,
      usedVolumeConfirm: false,
      usedRsiFallback: true,
      reasons: ["insufficient_candles"],
    };
  }

  const startIdx = clamp(pattern.startIdx, 0, n - 1);
  const endIdx = clamp(pattern.endIdx, 0, n - 1);
  if (endIdx < startIdx) {
    return {
      stage: "expired",
      direction,
      usedVolumeConfirm: false,
      usedRsiFallback: true,
      reasons: ["invalid_pattern_indices"],
    };
  }

  const lastIdx = n - 1;

  const expiryBars = expiryBarsFromPattern(pattern, opts);
  const expiryIdx = endIdx + expiryBars;

  const atrSeries = computeATRSeries(candles, opts.atrPeriod);
  const closes = candles.map(c => c.close);
  const rsi = computeRSISeries(closes, opts.rsiPeriod);

  const volumeOk = hasUsableVolume(candles);
  const volumes = candles.map(c => (isFiniteNumber(c.volume) ? c.volume : 0));
  const volSma = computeSMASeries(volumes, opts.volumeSmaPeriod);

  // Find trigger (B)
  let triggerIndex: number | undefined;
  for (let i = endIdx; i <= lastIdx; i++) {
    const boundary = breakoutBoundaryAt(pattern, i, direction);
    if (boundary == null) continue;

    const atrAt = atrSeries[i] || 0;
    const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001);

    if (isBreakoutB(candles[i].close, boundary, buffer, direction)) {
      triggerIndex = i;
      reasons.push("trigger_B");
      break;
    }
  }

  if (triggerIndex == null) {
    if (lastIdx > expiryIdx) {
      return {
        stage: "expired",
        direction,
        usedVolumeConfirm: false,
        usedRsiFallback: !volumeOk,
        reasons: ["past_expiry_before_trigger"],
      };
    }
    return {
      stage: "forming",
      direction,
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
    const boundary = breakoutBoundaryAt(pattern, i, direction);
    if (boundary == null) continue;

    const atrAt = atrSeries[i] || 0;
    const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001);

    // still beyond breakout
    const stillBeyond = isBreakoutB(candles[i].close, boundary, buffer, direction);
    if (!stillBeyond) continue;

    const volConfirmed =
      volumeOk &&
      isFiniteNumber(volumes[i]) &&
      isFiniteNumber(volSma[i]) &&
      volSma[i] > 0 &&
      volumes[i] >= volSma[i] * opts.volumeConfirmMultiple;

    const rsiVal = rsi[i] ?? 50;
    const rsiConfirmed = direction === "up" ? rsiVal >= opts.rsiConfirmBull : rsiVal <= opts.rsiConfirmBear;

    if (volConfirmed) {
      usedVolumeConfirm = true;
      confirmIndex = i;
      reasons.push("confirm_C_volume");
      break;
    }

    // RSI fallback if volume unusable or weak
    if (!volumeOk && rsiConfirmed) {
      usedRsiFallback = true;
      confirmIndex = i;
      reasons.push("confirm_C_rsi_fallback");
      break;
    }

    if (volumeOk && rsiConfirmed) {
      // Allow RSI as secondary confirmation even when volume exists (useful on exchanges with noisy volume)
      usedRsiFallback = true;
      confirmIndex = i;
      reasons.push("confirm_C_rsi");
      break;
    }
  }

  if (confirmIndex == null) {
    // Triggered but not confirmed: expire if takes too long.
    const triggeredExpiryBars = resolvedExpiryBarsFromPattern(pattern, opts);
    if (lastIdx > triggerIndex + triggeredExpiryBars) {
      return {
        stage: "expired",
        direction,
        triggerIndex,
        usedVolumeConfirm,
        usedRsiFallback: usedRsiFallback || !volumeOk,
        reasons: [...reasons, "past_expiry_after_trigger"],
      };
    }

    // Check immediate invalidation before confirmation (failed breakout)
    for (let i = triggerIndex; i <= lastIdx; i++) {
      const boundary = invalidationBoundaryAt(pattern, i, direction);
      if (boundary == null) continue;

      const atrAt = atrSeries[i] || 0;
      const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001);

      if (isInvalidation(candles[i].close, boundary, buffer, direction)) {
        return {
          stage: "invalidated",
          direction,
          triggerIndex,
          invalidationIndex: i,
          usedVolumeConfirm,
          usedRsiFallback: usedRsiFallback || !volumeOk,
          reasons: [...reasons, "invalidation_before_confirm"],
        };
      }
    }

    return {
      stage: "triggered",
      direction,
      triggerIndex,
      usedVolumeConfirm,
      usedRsiFallback: usedRsiFallback || !volumeOk,
      reasons,
    };
  }

  // Confirmed: check target hit / invalidation / expiry
  const resolvedExpiryBars = resolvedExpiryBarsFromPattern(pattern, opts);
  const resolvedExpiryIdx = confirmIndex + resolvedExpiryBars;

  // target hit
  if (pattern.targetPrice != null && Number.isFinite(pattern.targetPrice)) {
    for (let i = confirmIndex; i <= lastIdx; i++) {
      if (isTargetHit(candles[i], pattern.targetPrice, direction)) {
        return {
          stage: "hit_target",
          direction,
          triggerIndex,
          confirmIndex,
          targetHitIndex: i,
          usedVolumeConfirm,
          usedRsiFallback,
          reasons: [...reasons, "hit_target"],
        };
      }
    }
  }

  // invalidation after confirmation
  for (let i = confirmIndex; i <= lastIdx; i++) {
    const boundary = invalidationBoundaryAt(pattern, i, direction);
    if (boundary == null) continue;

    const atrAt = atrSeries[i] || 0;
    const buffer = Math.max(atrAt * opts.atrK, candles[i].close * 0.001);

    if (isInvalidation(candles[i].close, boundary, buffer, direction)) {
      return {
        stage: "invalidated",
        direction,
        triggerIndex,
        confirmIndex,
        invalidationIndex: i,
        usedVolumeConfirm,
        usedRsiFallback,
        reasons: [...reasons, "invalidation_after_confirm"],
      };
    }
  }

  if (lastIdx > resolvedExpiryIdx) {
    return {
      stage: "expired",
      direction,
      triggerIndex,
      confirmIndex,
      usedVolumeConfirm,
      usedRsiFallback,
      reasons: [...reasons, "past_expiry_after_confirm"],
    };
  }

  return {
    stage: "confirmed",
    direction,
    triggerIndex,
    confirmIndex,
    usedVolumeConfirm,
    usedRsiFallback,
    reasons,
  };
}
