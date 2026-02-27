/**
 * 🔢 Fibonacci 0.618 Dynamic Retracement Scanner
 * ماسح فيبوناتشي الديناميكي — يكتشف العملات عند مستوى التراجع الذهبي
 *
 * Based on HoanGhetti's "Dynamic Fibonacci Retracement" Pine Script logic:
 *   - pivotHigh / pivotLow with configurable lookback
 *   - Outer tracking (actual extreme, not just pivot value)
 *   - Direction detection via pivot change + price cross
 *   - Works for BOTH bull retracement (correction in uptrend)
 *     and bear retracement (bounce in downtrend)
 *
 * Enhanced with:
 *   - EMA 20/50 cross confirmation
 *   - Multi-timeframe support (4h, 1d, 1w)
 *   - 3-zone proximity alerts (AT_LEVEL ≤2%, APPROACHING 2-5%, AWAY >5%)
 *   - R² swing quality scoring
 *   - Visual Fibonacci ruler position
 */

import type { OHLCV } from '@/lib/indicators/technical';
import { calculateEMAArray } from '@/lib/indicators/technical';

// ───────────────────────── Types ─────────────────────────

export type FibDirection = 'bull' | 'bear';
export type ProximityZone = 'AT_LEVEL' | 'APPROACHING' | 'AWAY';
export type EMACrossType = 'bullish' | 'bearish' | 'none';

export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface FibScanResult {
  symbol: string;
  name: string;
  timeframe: string;
  direction: FibDirection;
  currentPrice: number;
  fib618Price: number;
  proximityPercent: number;
  zone: ProximityZone;
  swingHigh: number;
  swingLow: number;
  swingHighIdx: number;
  swingLowIdx: number;
  outerHigh: number;
  outerLow: number;
  fibRange: number;
  allLevels: FibLevel[];
  /** where the current price sits on the fib ruler 0..1 (0=swing low, 1=swing high) */
  rulerPosition: number;
  r2: number;
  ema20: number;
  ema50: number;
  emaCross: EMACrossType;
  emaCrossRecent: boolean;
  timestamp: number;
  candleTimestamp: number;
}

export interface ScanProgress {
  current: number;
  total: number;
  currentSymbol: string;
  timeframe: string;
  found: number;
}

// ───────────────────────── Constants ─────────────────────────

/** Lookback per timeframe — smaller for higher TF to avoid stale pivots */
const LOOKBACK_BY_TF: Record<string, number> = {
  '1h': 20,
  '4h': 15,
  '1d': 10,
  '1w': 8,
};

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/** How many recent candles to check for an EMA cross event */
const EMA_CROSS_LOOKBACK = 5;

// ───────────────────────── Pivot Detection ─────────────────────────

interface PivotPoint {
  index: number;
  price: number;
}

/**
 * Detect pivot highs — a bar whose high is strictly greater than
 * `lookback` bars on each side. Equivalent to ta.pivothigh(lookback, lookback).
 */
function detectPivotHighs(data: OHLCV[], lookback: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isPivot = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push({ index: i, price: data[i].high });
  }
  return pivots;
}

/**
 * Detect pivot lows — a bar whose low is strictly less than
 * `lookback` bars on each side. Equivalent to ta.pivotlow(lookback, lookback).
 */
function detectPivotLows(data: OHLCV[], lookback: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isPivot = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push({ index: i, price: data[i].low });
  }
  return pivots;
}

// ───────────────────────── Core: detectLatestSwingFibonacci ─────────────────────────

/**
 * The main detection engine inspired by HoanGhetti's Pine Script.
 *
 * Walk forward through bars, maintaining:
 *   - lastPH / lastPL  — most recent confirmed pivot high / low (fixnan semantics)
 *   - outerH / outerL  — actual extreme reached since that pivot
 *   - dir              — 'bull' | 'bear' toggled by pivot changes / price crosses
 *
 * At the end, compute Fibonacci levels from outerL → outerH and check proximity to 0.618.
 */
export function detectLatestSwingFibonacci(
  data: OHLCV[],
  timeframe: string,
): Omit<FibScanResult, 'symbol' | 'name' | 'timeframe' | 'timestamp'> | null {
  const lookback = LOOKBACK_BY_TF[timeframe] ?? 15;
  if (data.length < lookback * 3) return null;

  // 1) Detect all pivots
  const pivotHighs = detectPivotHighs(data, lookback);
  const pivotLows = detectPivotLows(data, lookback);

  if (pivotHighs.length === 0 || pivotLows.length === 0) return null;

  // 2) Build chronological pivot timeline with fixnan (carry-forward)
  //    Walk bar-by-bar and maintain lastPH, lastPL like Pine's fixnan(ta.pivothigh(...))
  const phMap = new Map<number, number>(); // index → price
  const plMap = new Map<number, number>();
  for (const p of pivotHighs) phMap.set(p.index, p.price);
  for (const p of pivotLows) plMap.set(p.index, p.price);

  let lastPH: PivotPoint | null = null;
  let lastPL: PivotPoint | null = null;
  let outerH = -Infinity;
  let outerL = Infinity;
  let dir: FibDirection = 'bull';

  // Track when pivots change for barssince logic
  let phChangedAt = -1;
  let plChangedAt = -1;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];

    // Check if we have a new pivot at this index
    const newPH = phMap.get(i);
    const newPL = plMap.get(i);

    if (newPH !== undefined) {
      lastPH = { index: i, price: newPH };
      phChangedAt = i;
      // Reset outer high to pivot value on new pivot
      outerH = newPH;
    }

    if (newPL !== undefined) {
      lastPL = { index: i, price: newPL };
      plChangedAt = i;
      // Reset outer low to pivot value on new pivot
      outerL = newPL;
    }

    // Outer tracking: track actual extreme since last pivot
    if (lastPH && bar.high > outerH) outerH = bar.high;
    if (lastPL && bar.low < outerL) outerL = bar.low;

    // Direction detection (Pine logic)
    if (lastPL && lastPH) {
      const phBarsSince = phChangedAt >= 0 ? i - phChangedAt : Infinity;
      const plBarsSince = plChangedAt >= 0 ? i - plChangedAt : Infinity;

      // New pivot high appeared OR price crossed under last pivot low → bear
      if (newPH !== undefined || (lastPL && bar.low < lastPL.price && dir !== 'bear')) {
        dir = 'bear';
      }
      // New pivot low appeared OR price crossed over last pivot high → bull
      if (newPL !== undefined || (lastPH && bar.high > lastPH.price && dir !== 'bull')) {
        dir = 'bull';
      }
    }
  }

  if (!lastPH || !lastPL || outerH <= outerL) return null;

  // 3) Compute Fibonacci levels
  const range = outerH - outerL;
  if (range <= 0) return null;

  const allLevels: FibLevel[] = FIB_RATIOS.map(ratio => {
    const price = dir === 'bull'
      ? outerH - range * ratio   // Bull: retrace down from high
      : outerL + range * ratio;  // Bear: retrace up from low
    return { ratio, price, label: `${(ratio * 100).toFixed(1)}%` };
  });

  const fib618 = allLevels.find(l => l.ratio === 0.618)!;
  const currentPrice = data[data.length - 1].close;
  const proximityPercent = Math.abs(currentPrice - fib618.price) / fib618.price * 100;

  // Zone classification
  let zone: ProximityZone = 'AWAY';
  if (proximityPercent <= 2) zone = 'AT_LEVEL';
  else if (proximityPercent <= 5) zone = 'APPROACHING';

  // Ruler position: where price sits between outerLow (0) and outerHigh (1)
  const rulerPosition = Math.max(0, Math.min(1, (currentPrice - outerL) / range));

  // 4) R² swing quality
  const swingStart = Math.min(lastPL.index, lastPH.index);
  const swingEnd = Math.max(lastPL.index, lastPH.index);
  const swingSlice = data.slice(swingStart, swingEnd + 1);
  const r2 = computeSwingR2(swingSlice, dir);

  // 5) EMA 20/50
  const closes = data.map(d => d.close);
  const ema20Arr = calculateEMAArray(closes, 20);
  const ema50Arr = calculateEMAArray(closes, 50);

  const ema20 = ema20Arr.length > 0 ? ema20Arr[ema20Arr.length - 1] : 0;
  const ema50 = ema50Arr.length > 0 ? ema50Arr[ema50Arr.length - 1] : 0;

  let emaCross: EMACrossType = 'none';
  if (ema20 > 0 && ema50 > 0) {
    emaCross = ema20 > ema50 ? 'bullish' : 'bearish';
  }

  // Check if cross happened in last N candles
  let emaCrossRecent = false;
  if (ema20Arr.length >= EMA_CROSS_LOOKBACK && ema50Arr.length >= EMA_CROSS_LOOKBACK) {
    for (let k = 1; k <= Math.min(EMA_CROSS_LOOKBACK, ema20Arr.length - 1); k++) {
      const prevE20 = ema20Arr[ema20Arr.length - 1 - k];
      const prevE50 = ema50Arr[ema50Arr.length - 1 - k];
      const currE20 = ema20Arr[ema20Arr.length - k];
      const currE50 = ema50Arr[ema50Arr.length - k];
      // Cross: sign change
      if ((prevE20 - prevE50) * (currE20 - currE50) < 0) {
        emaCrossRecent = true;
        break;
      }
    }
  }

  return {
    currentPrice,
    fib618Price: fib618.price,
    proximityPercent: Math.round(proximityPercent * 100) / 100,
    zone,
    direction: dir,
    swingHigh: lastPH.price,
    swingLow: lastPL.price,
    swingHighIdx: lastPH.index,
    swingLowIdx: lastPL.index,
    outerHigh: outerH,
    outerLow: outerL,
    fibRange: range,
    allLevels,
    rulerPosition,
    r2: Math.round(r2 * 1000) / 1000,
    ema20: Math.round(ema20 * 100) / 100,
    ema50: Math.round(ema50 * 100) / 100,
    emaCross,
    emaCrossRecent,
    candleTimestamp: data[data.length - 1].timestamp,
  };
}

// ───────────────────────── Scan single symbol ─────────────────────────

/**
 * Run the Fibonacci scanner on a single symbol's OHLCV data.
 * Returns a result only if proximityPercent ≤ maxProximity, otherwise null.
 */
export function scanSymbolFibonacci(
  ohlcvData: OHLCV[],
  symbol: string,
  name: string,
  timeframe: string,
  maxProximity: number = 5,
): FibScanResult | null {
  const result = detectLatestSwingFibonacci(ohlcvData, timeframe);
  if (!result) return null;

  // Filter by proximity threshold
  if (result.proximityPercent > maxProximity) return null;

  return {
    ...result,
    symbol,
    name,
    timeframe,
    timestamp: Date.now(),
  };
}

// ───────────────────────── R² calculation ─────────────────────────

function computeSwingR2(swingData: OHLCV[], direction: FibDirection): number {
  if (swingData.length < 3) return 0;

  const n = swingData.length;
  const prices = swingData.map((d, i) => ({
    x: i,
    y: direction === 'bull' ? d.close : -d.close,
  }));

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const { x, y } of prices) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of prices) {
    const predicted = slope * x + intercept;
    ssTot += (y - yMean) ** 2;
    ssRes += (y - predicted) ** 2;
  }

  return ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
}
