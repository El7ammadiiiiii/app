// ========================================
// Price Binning & Precision Math
// Matches TapeSurf algorithm: m(), f(), h(), p(), F(), Q()
// ========================================

/**
 * Count decimal places of a number
 * TapeSurf equivalent: f()
 */
export function countDecimals(value: number): number {
  if (Math.floor(value) === value) return 0;
  const str = value.toString();
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return 0;
  return str.length - dotIndex - 1;
}

/**
 * Precision-safe floor division
 * TapeSurf equivalent: h()
 */
export function precisionDiv(a: number, b: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round((a * factor) / b);
}

/**
 * Precision-safe subtraction
 * TapeSurf equivalent: p()
 */
export function precisionSub(a: number, b: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return (a * factor - b * factor) / factor;
}

/**
 * Precision-safe addition
 */
export function precisionAdd(a: number, b: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return (a * factor + b * factor) / factor;
}

/**
 * Floor-round price to grouping bucket
 * TapeSurf equivalent: m(price, grouping, precision)
 * Formula: Math.floor(price / grouping) * grouping with decimal precision correction
 */
export function binPrice(price: number, grouping: number): number {
  const precision = Math.max(countDecimals(price), countDecimals(grouping));
  const factor = Math.pow(10, precision);
  return Math.floor((price * factor) / (grouping * factor)) * grouping;
}

/**
 * Regroup order book levels by price step, summing amounts in same bucket
 * TapeSurf equivalent: F(levels, grouping, precision)
 * 
 * @param levels Array of [price, amount] pairs (sorted)
 * @param grouping Price step size for bucketing
 * @returns Map of bucketed_price → summed_amount
 */
export function regroupLevels(
  levels: [number, number][],
  grouping: number
): Map<number, number> {
  const grouped = new Map<number, number>();
  
  for (const [price, amount] of levels) {
    if (amount <= 0) continue;
    const bucket = binPrice(price, grouping);
    grouped.set(bucket, (grouped.get(bucket) || 0) + amount);
  }
  
  return grouped;
}

/**
 * Auto-detect optimal grouping by finding the most common price step
 * TapeSurf equivalent: Q(levels, exchange)
 * Uses frequency analysis of price differences
 */
export function autoDetectGrouping(levels: [number, number][]): number {
  if (levels.length < 2) return 1;

  // Calculate all price differences
  const diffs: number[] = [];
  const sorted = [...levels].sort((a, b) => a[0] - b[0]);
  
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i][0] - sorted[i - 1][0]);
    if (diff > 0) {
      // Round to avoid floating point artifacts
      const precision = Math.max(countDecimals(sorted[i][0]), countDecimals(sorted[i - 1][0]));
      const factor = Math.pow(10, precision);
      const roundedDiff = Math.round(diff * factor) / factor;
      diffs.push(roundedDiff);
    }
  }

  if (diffs.length === 0) return 1;

  // Find most frequent step
  const freq = new Map<number, number>();
  for (const d of diffs) {
    freq.set(d, (freq.get(d) || 0) + 1);
  }

  let bestStep = diffs[0];
  let bestCount = 0;
  for (const [step, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      bestStep = step;
    }
  }

  // Use a reasonable multiple of the base step for heatmap visibility
  // For very fine-grained books (e.g., 0.01 step), group into larger buckets
  const midPrice = sorted[Math.floor(sorted.length / 2)][0];
  const priceRange = sorted[sorted.length - 1][0] - sorted[0][0];
  const targetLevels = 200; // aim for ~200 visible levels
  
  if (priceRange / bestStep > targetLevels * 2) {
    // Too many levels — increase grouping
    const multiplier = Math.ceil(priceRange / bestStep / targetLevels);
    bestStep = bestStep * multiplier;
  }

  return bestStep;
}

/**
 * Filter levels within depth limit of midprice
 * TapeSurf: DEPTH_LIMIT = 0.3 (±30%)
 */
export function filterByDepth(
  levels: [number, number][],
  midPrice: number,
  depthFactor: number = 0.3
): [number, number][] {
  const lower = midPrice * (1 - depthFactor);
  const upper = midPrice * (1 + depthFactor);
  return levels.filter(([price]) => price >= lower && price <= upper);
}

/**
 * Standard grouping values for UI selector
 */
export const GROUPING_OPTIONS = [
  { label: 'Auto', value: 'auto' as const },
  { label: '0.01', value: 0.01 },
  { label: '0.1', value: 0.1 },
  { label: '1', value: 1 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '250', value: 250 },
  { label: '500', value: 500 },
  { label: '1000', value: 1000 },
];
