// ========================================
// Packed Snapshot — Binary format for WebGL texture upload
// Matches TapeSurf: packed_snapshot with steps/amounts/cumAmounts
// ========================================

import { PackedSnapshot, TextureData, SnapshotMetadata } from './types';
import { regroupLevels, filterByDepth, autoDetectGrouping, binPrice, countDecimals } from './PriceBinning';
import { DEPTH_LIMIT_FACTOR } from './types';

/**
 * Pack raw order book levels into a PackedSnapshot
 * 
 * @param bids [price, amount][] sorted descending
 * @param asks [price, amount][] sorted ascending
 * @param grouping Price grouping/bucketing size
 * @param exchanges List of exchanges that contributed
 */
export function packOrderBook(
  bids: [number, number][],
  asks: [number, number][],
  grouping: number,
  exchanges: string[],
  timestamp: number = Date.now()
): PackedSnapshot {
  // Calculate mid price
  const bestBid = bids.length > 0 ? bids[0][0] : 0;
  const bestAsk = asks.length > 0 ? asks[0][0] : 0;
  const basePrice = (bestBid + bestAsk) / 2;

  // Filter by depth
  const filteredBids = filterByDepth(bids, basePrice, DEPTH_LIMIT_FACTOR);
  const filteredAsks = filterByDepth(asks, basePrice, DEPTH_LIMIT_FACTOR);

  // Regroup to target grouping
  const groupedBids = regroupLevels(filteredBids, grouping);
  const groupedAsks = regroupLevels(filteredAsks, grouping);

  // Sort and build arrays
  const bidEntries = Array.from(groupedBids.entries()).sort((a, b) => b[0] - a[0]); // desc
  const askEntries = Array.from(groupedAsks.entries()).sort((a, b) => a[0] - b[0]); // asc

  // Calculate steps relative to basePrice (in grouping units)
  const precision = countDecimals(grouping);
  const factor = Math.pow(10, precision);

  const bidSteps = new Int16Array(bidEntries.length);
  const bidAmounts = new Float64Array(bidEntries.length);
  const bidCumAmounts = new Float64Array(bidEntries.length);

  const askSteps = new Int16Array(askEntries.length);
  const askAmounts = new Float64Array(askEntries.length);
  const askCumAmounts = new Float64Array(askEntries.length);

  let minAmount = Infinity;
  let maxAmount = -Infinity;

  // Pack bids
  let cumBid = 0;
  for (let i = 0; i < bidEntries.length; i++) {
    const [price, amount] = bidEntries[i];
    bidSteps[i] = Math.round(((price - basePrice) * factor) / (grouping * factor));
    bidAmounts[i] = amount;
    cumBid += amount;
    bidCumAmounts[i] = cumBid;
    minAmount = Math.min(minAmount, amount);
    maxAmount = Math.max(maxAmount, amount);
  }

  // Pack asks
  let cumAsk = 0;
  for (let i = 0; i < askEntries.length; i++) {
    const [price, amount] = askEntries[i];
    askSteps[i] = Math.round(((price - basePrice) * factor) / (grouping * factor));
    askAmounts[i] = amount;
    cumAsk += amount;
    askCumAmounts[i] = cumAsk;
    minAmount = Math.min(minAmount, amount);
    maxAmount = Math.max(maxAmount, amount);
  }

  if (minAmount === Infinity) minAmount = 0;
  if (maxAmount === -Infinity) maxAmount = 0;

  return {
    basePrice,
    grouping,
    timestamp,
    bids: { steps: bidSteps, amounts: bidAmounts, cumAmounts: bidCumAmounts },
    asks: { steps: askSteps, amounts: askAmounts, cumAmounts: askCumAmounts },
    minAmount,
    maxAmount,
    exchanges,
  };
}

/**
 * Convert PackedSnapshot to Float32Array for WebGL RG32F texture upload
 * Format: interleaved [price, dominantAmount, price, dominantAmount, ...]
 * - Bids are stored with NEGATIVE amounts (to distinguish from asks in shader)
 * - Asks are stored with POSITIVE amounts
 * - Sorted by price ascending
 */
export function snapshotToTextureData(snapshot: PackedSnapshot): TextureData {
  const bidCount = snapshot.bids.steps.length;
  const askCount = snapshot.asks.steps.length;
  const totalLevels = bidCount + askCount;

  // Build price-amount pairs
  const levels: [number, number][] = [];

  // Bids: negative amount (convention for shader)
  for (let i = 0; i < bidCount; i++) {
    const price = snapshot.basePrice + snapshot.bids.steps[i] * snapshot.grouping;
    levels.push([price, -snapshot.bids.amounts[i]]);
  }

  // Asks: positive amount
  for (let i = 0; i < askCount; i++) {
    const price = snapshot.basePrice + snapshot.asks.steps[i] * snapshot.grouping;
    levels.push([price, snapshot.asks.amounts[i]]);
  }

  // Sort by price ascending (required for binary search in shader)
  levels.sort((a, b) => a[0] - b[0]);

  // Pack into Float32Array
  const data = new Float32Array(totalLevels * 2);
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (let i = 0; i < levels.length; i++) {
    data[i * 2] = levels[i][0];      // R = price
    data[i * 2 + 1] = levels[i][1];  // G = amount (neg=bid, pos=ask)
    minPrice = Math.min(minPrice, levels[i][0]);
    maxPrice = Math.max(maxPrice, levels[i][0]);
  }

  return {
    data,
    length: totalLevels,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
    minAmount: snapshot.minAmount,
    maxAmount: snapshot.maxAmount,
  };
}

/**
 * Extract metadata from a PackedSnapshot
 */
export function extractMetadata(snapshot: PackedSnapshot, textureData: TextureData): SnapshotMetadata {
  return {
    timestamp: snapshot.timestamp,
    basePrice: snapshot.basePrice,
    grouping: snapshot.grouping,
    bidLevels: snapshot.bids.steps.length,
    askLevels: snapshot.asks.steps.length,
    minAmount: snapshot.minAmount,
    maxAmount: snapshot.maxAmount,
    minPrice: textureData.minPrice,
    maxPrice: textureData.maxPrice,
    exchanges: snapshot.exchanges,
    exchangeCount: snapshot.exchanges.length,
  };
}

/**
 * Create an empty texture data (for initialization)
 */
export function createEmptyTextureData(): TextureData {
  return {
    data: new Float32Array(0),
    length: 0,
    minPrice: 0,
    maxPrice: 0,
    minAmount: 0,
    maxAmount: 0,
  };
}
