// ========================================
// Aggregation Merger — Combines order books from multiple exchanges
// Fills the TapeSurf px() stub with actual implementation
// ========================================

import { PackedSnapshot } from './types';
import { OrderBookEngine } from './OrderBookEngine';
import { regroupLevels, autoDetectGrouping, filterByDepth } from './PriceBinning';
import { packOrderBook } from './PackedSnapshot';
import { DEPTH_LIMIT_FACTOR } from './types';

/**
 * Manages multiple exchange order book engines and merges them
 */
export class AggregationMerger {
  private engines: Map<string, OrderBookEngine> = new Map();
  private _activeExchanges: Set<string> = new Set();
  private _grouping: number | 'auto' = 'auto';
  private _resolvedGrouping: number = 10;
  private _symbol: string = 'BTCUSDT';

  constructor() {}

  /**
   * Set active exchanges for aggregation
   */
  setActiveExchanges(exchanges: string[]): void {
    this._activeExchanges = new Set(exchanges);
    // Create engines for new exchanges
    for (const ex of exchanges) {
      if (!this.engines.has(ex)) {
        this.engines.set(ex, new OrderBookEngine(ex, this._symbol));
      }
    }
  }

  /**
   * Set the trading symbol
   */
  setSymbol(symbol: string): void {
    this._symbol = symbol;
    // Reset all engines
    this.engines.clear();
    for (const ex of this._activeExchanges) {
      this.engines.set(ex, new OrderBookEngine(ex, symbol));
    }
  }

  /**
   * Set grouping (or 'auto')
   */
  setGrouping(grouping: number | 'auto'): void {
    this._grouping = grouping;
  }

  get resolvedGrouping(): number {
    return this._resolvedGrouping;
  }

  /**
   * Update a single exchange's order book
   */
  updateExchange(
    exchange: string,
    bids: [number, number][],
    asks: [number, number][],
    isSnapshot: boolean
  ): void {
    let engine = this.engines.get(exchange);
    if (!engine) {
      engine = new OrderBookEngine(exchange, this._symbol);
      this.engines.set(exchange, engine);
    }
    if (isSnapshot) {
      engine.applySnapshot(bids, asks);
    } else {
      engine.applyDelta(bids, asks);
    }
  }

  /**
   * Merge all active exchange order books into a single PackedSnapshot
   * This is the px() implementation that TapeSurf left as a stub
   */
  mergeAll(): PackedSnapshot | null {
    const activeEngines: OrderBookEngine[] = [];
    
    for (const exchange of this._activeExchanges) {
      const engine = this.engines.get(exchange);
      if (engine && engine.hasData) {
        activeEngines.push(engine);
      }
    }

    if (activeEngines.length === 0) return null;

    // If only one exchange, use it directly
    if (activeEngines.length === 1) {
      const engine = activeEngines[0];
      return this.packSingleEngine(engine);
    }

    // === Multi-exchange merge ===
    
    // 1. Collect all levels from all exchanges
    const allBids: [number, number][] = [];
    const allAsks: [number, number][] = [];
    const midPrices: number[] = [];
    const exchanges: string[] = [];

    for (const engine of activeEngines) {
      const mid = engine.midPrice;
      if (mid !== null) {
        midPrices.push(mid);
      }
      allBids.push(...engine.bids);
      allAsks.push(...engine.asks);
      exchanges.push(engine.exchange);
    }

    if (allBids.length === 0 && allAsks.length === 0) return null;

    // 2. Determine grouping
    if (this._grouping === 'auto') {
      // Use all levels combined to detect optimal grouping
      const allLevels = [...allBids, ...allAsks].sort((a, b) => a[0] - b[0]);
      this._resolvedGrouping = autoDetectGrouping(allLevels);
    } else {
      this._resolvedGrouping = this._grouping;
    }

    // 3. Calculate average midprice
    const avgMid = midPrices.length > 0
      ? midPrices.reduce((s, p) => s + p, 0) / midPrices.length
      : (allBids[0]?.[0] || 0);

    // 4. Filter by depth from average midprice
    const filteredBids = filterByDepth(allBids, avgMid, DEPTH_LIMIT_FACTOR);
    const filteredAsks = filterByDepth(allAsks, avgMid, DEPTH_LIMIT_FACTOR);

    // 5. Regroup — this sums amounts at the same bucketed price across all exchanges
    const groupedBids = regroupLevels(filteredBids, this._resolvedGrouping);
    const groupedAsks = regroupLevels(filteredAsks, this._resolvedGrouping);

    // 6. Convert back to sorted arrays
    const mergedBids: [number, number][] = Array.from(groupedBids.entries())
      .sort((a, b) => b[0] - a[0]);
    const mergedAsks: [number, number][] = Array.from(groupedAsks.entries())
      .sort((a, b) => a[0] - b[0]);

    // 7. Pack into snapshot
    return packOrderBook(
      mergedBids,
      mergedAsks,
      this._resolvedGrouping,
      exchanges,
      Date.now()
    );
  }

  /**
   * Pack a single engine (no merge needed)
   */
  private packSingleEngine(engine: OrderBookEngine): PackedSnapshot {
    const bids = engine.bids;
    const asks = engine.asks;

    if (this._grouping === 'auto') {
      const allLevels = [...bids, ...asks].sort((a, b) => a[0] - b[0]);
      this._resolvedGrouping = autoDetectGrouping(allLevels);
    } else {
      this._resolvedGrouping = this._grouping;
    }

    return packOrderBook(
      bids,
      asks,
      this._resolvedGrouping,
      [engine.exchange],
      Date.now()
    );
  }

  /**
   * Get count of active exchanges with data
   */
  get activeCount(): number {
    let count = 0;
    for (const exchange of this._activeExchanges) {
      const engine = this.engines.get(exchange);
      if (engine && engine.hasData) count++;
    }
    return count;
  }

  /**
   * Get list of active exchanges with data
   */
  get activeExchangesWithData(): string[] {
    const result: string[] = [];
    for (const exchange of this._activeExchanges) {
      const engine = this.engines.get(exchange);
      if (engine && engine.hasData) result.push(exchange);
    }
    return result;
  }

  /**
   * Clear all engines
   */
  clear(): void {
    for (const engine of this.engines.values()) {
      engine.clear();
    }
  }
}
