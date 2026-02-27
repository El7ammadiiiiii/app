import { calculateOBV } from '../analysis/engine';

export function calculateOBVWithAnalysis(closes: number[], volumes: number[]) {
  const series = calculateOBV(closes, volumes);
  const n = series.length;
  const recent = series.slice(Math.max(0, n - 5));
  const slope = recent.reduce((acc, v, i, arr) => acc + (v - (arr[i - 1] ?? arr[0])), 0);
  const signal = slope > 0 ? 'bullish' : 'bearish';
  const divergence = signal; // simplistic placeholder
  return { series, signal, divergence } as const;
}