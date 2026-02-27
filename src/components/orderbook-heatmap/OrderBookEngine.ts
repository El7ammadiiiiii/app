// ========================================
// Order Book Engine
// Maintains bids/asks state with snapshot/delta support
// Matches TapeSurf: sorted maps, crossed-level removal
// ========================================

import { OrderBookLevel } from './types';

/**
 * Maintains a single exchange's order book state
 * Supports full snapshot replacement and incremental delta updates
 */
export class OrderBookEngine {
  /** Bids sorted by price descending (highest first) */
  private _bids: Map<number, number> = new Map();
  /** Asks sorted by price ascending (lowest first) */
  private _asks: Map<number, number> = new Map();
  
  private _lastUpdateTime: number = 0;
  private _updateCount: number = 0;

  constructor(
    public readonly exchange: string,
    public readonly symbol: string
  ) {}

  /**
   * Apply a full snapshot — replaces entire book
   */
  applySnapshot(bids: [number, number][], asks: [number, number][]): void {
    this._bids.clear();
    this._asks.clear();

    for (const [price, amount] of bids) {
      if (amount > 0) {
        this._bids.set(price, amount);
      }
    }
    for (const [price, amount] of asks) {
      if (amount > 0) {
        this._asks.set(price, amount);
      }
    }

    this._lastUpdateTime = Date.now();
    this._updateCount++;
    this.removeCrossedLevels();
  }

  /**
   * Apply incremental delta — update individual levels
   * amount = 0 means remove that level
   */
  applyDelta(bids: [number, number][], asks: [number, number][]): void {
    for (const [price, amount] of bids) {
      if (amount <= 0) {
        this._bids.delete(price);
      } else {
        this._bids.set(price, amount);
      }
    }
    for (const [price, amount] of asks) {
      if (amount <= 0) {
        this._asks.delete(price);
      } else {
        this._asks.set(price, amount);
      }
    }

    this._lastUpdateTime = Date.now();
    this._updateCount++;
    this.removeCrossedLevels();
  }

  /**
   * Remove crossed levels where bid >= best ask
   * TapeSurf does this to handle stale/incorrect data
   */
  private removeCrossedLevels(): void {
    const bestAsk = this.bestAsk;
    const bestBid = this.bestBid;
    
    if (bestAsk === null || bestBid === null) return;
    if (bestBid < bestAsk) return; // no crossing

    // Remove bids >= best ask
    for (const price of this._bids.keys()) {
      if (price >= bestAsk) {
        this._bids.delete(price);
      }
    }
  }

  /** Get best (highest) bid price */
  get bestBid(): number | null {
    if (this._bids.size === 0) return null;
    return Math.max(...this._bids.keys());
  }

  /** Get best (lowest) ask price */
  get bestAsk(): number | null {
    if (this._asks.size === 0) return null;
    return Math.min(...this._asks.keys());
  }

  /** Get midprice */
  get midPrice(): number | null {
    const bid = this.bestBid;
    const ask = this.bestAsk;
    if (bid === null || ask === null) return null;
    return (bid + ask) / 2;
  }

  /** Get bids as sorted array [price, amount][] — descending by price */
  get bids(): [number, number][] {
    return Array.from(this._bids.entries())
      .sort((a, b) => b[0] - a[0]);
  }

  /** Get asks as sorted array [price, amount][] — ascending by price */
  get asks(): [number, number][] {
    return Array.from(this._asks.entries())
      .sort((a, b) => a[0] - b[0]);
  }

  /** Total number of levels */
  get totalLevels(): number {
    return this._bids.size + this._asks.size;
  }

  /** Has data been loaded? */
  get hasData(): boolean {
    return this._bids.size > 0 || this._asks.size > 0;
  }

  get lastUpdateTime(): number {
    return this._lastUpdateTime;
  }

  get updateCount(): number {
    return this._updateCount;
  }

  /** Clear all data */
  clear(): void {
    this._bids.clear();
    this._asks.clear();
    this._updateCount = 0;
  }
}
