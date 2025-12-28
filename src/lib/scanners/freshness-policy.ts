// Unified freshness/expiry policy for divergences (fresh-only default)
// Occurrence-time based, per timeframe

import { DivergenceResult } from './advanced-divergence-detector';

export const SUPPORTED_TIMEFRAMES = ['15m', '1h', '4h', '1d', '3d'] as const;
export type SupportedTimeframe = (typeof SUPPORTED_TIMEFRAMES)[number];

export const TIMEFRAME_MS: Record<SupportedTimeframe, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
};

// ✅ NEW: Detection window - last 50 candles for all timeframes
export const DETECTION_WINDOW_BARS = 50;

// ✅ NEW: Fresh window (bars) — patterns disappear after these candles
// 15m: 20 candles, 1h/4h: 10 candles, 1d/3d: 5 candles
export const FRESH_BARS: Record<SupportedTimeframe, number> = {
  '15m': 20,
  '1h': 10,
  '4h': 10,
  '1d': 5,
  '3d': 5,
};

// Hard expiry (bars) — same as fresh (no grace period)
export const HARD_EXPIRE_BARS: Record<SupportedTimeframe, number> = {
  '15m': 20,
  '1h': 10,
  '4h': 10,
  '1d': 5,
  '3d': 5,
};

export type FreshnessStatus = 'fresh' | 'expired' | 'invalid';

/** Normalize various timestamp shapes to epoch milliseconds */
export function normalizeEpochMs(value: number | string | Date | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.getTime();

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'number') {
    // Treat < 1e12 as seconds
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  return null;
}

/** Occurrence time of the divergence (anchor for freshness) */
export function getOccurrenceTimeMs(divergence: DivergenceResult): number | null {
  const fromEnd = normalizeEpochMs(divergence.endPoint?.timestamp as number | undefined);
  if (fromEnd !== null) return fromEnd;
  return normalizeEpochMs(divergence.timestamp);
}

/** Bars since occurrence; null if cannot compute */
export function getBarsSinceOccurrence(divergence: DivergenceResult, nowMs: number = Date.now()): number | null {
  const occurrence = getOccurrenceTimeMs(divergence);
  const tfMs = TIMEFRAME_MS[divergence.timeframe as SupportedTimeframe];
  if (!occurrence || !tfMs) return null;
  const delta = nowMs - occurrence;
  // Ignore strongly future-skewed timestamps
  if (delta < -120_000) return null;
  return Math.max(0, Math.floor(delta / tfMs));
}

export interface FreshnessState {
  status: FreshnessStatus;
  barsSince: number | null;
  freshLimit: number;
  hardLimit: number;
}

export function getFreshnessState(divergence: DivergenceResult, nowMs: number = Date.now()): FreshnessState {
  const bars = getBarsSinceOccurrence(divergence, nowMs);
  const freshLimit = FRESH_BARS[divergence.timeframe as SupportedTimeframe] ?? 0;
  const hardLimit = HARD_EXPIRE_BARS[divergence.timeframe as SupportedTimeframe] ?? freshLimit;

  if (bars === null) {
    return { status: 'invalid', barsSince: null, freshLimit, hardLimit };
  }

  if (bars <= freshLimit) {
    return { status: 'fresh', barsSince: bars, freshLimit, hardLimit };
  }

  if (bars > hardLimit) {
    return { status: 'expired', barsSince: bars, freshLimit, hardLimit };
  }

  // Between fresh and hard: treat as expired for default view
  return { status: 'expired', barsSince: bars, freshLimit, hardLimit };
}

/** Default fresh-only gate */
export function isFresh(divergence: DivergenceResult, nowMs: number = Date.now()): boolean {
  return getFreshnessState(divergence, nowMs).status === 'fresh';
}
