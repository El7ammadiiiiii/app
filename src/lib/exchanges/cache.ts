/**
 * 🔷 In-Memory Cache
 * High-performance caching layer with TTL
 */

import type { CacheEntry, CacheConfig } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ Cache Configuration
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ticker: 1000, // 1 second
  orderbook: 500, // 500ms for real-time feel
  ohlcv: 5000, // 5 seconds
  trades: 1000, // 1 second
  funding: 60000, // 60 seconds
};

// ═══════════════════════════════════════════════════════════════════════════
// 💾 Cache Manager
// ═══════════════════════════════════════════════════════════════════════════

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.orderbook, // default to shortest TTL
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific exchange
   */
  clearExchange(exchangeId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${exchangeId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear cache for specific channel
   */
  clearChannel(channel: keyof CacheConfig): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`:${channel}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    const entries = Array.from(this.cache.values());
    const timestamps = entries.map((e) => e.timestamp);

    return {
      size: this.cache.size,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every 5 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔑 Cache Key Builders
// ═══════════════════════════════════════════════════════════════════════════

export function buildCacheKey(
  exchange: string,
  channel: string,
  symbol: string,
  ...extra: string[]
): string {
  const parts = [exchange, channel, symbol, ...extra].filter(Boolean);
  return parts.join(':');
}

export function parseCacheKey(key: string): {
  exchange: string;
  channel: string;
  symbol: string;
  extra: string[];
} | null {
  const parts = key.split(':');
  if (parts.length < 3) return null;

  return {
    exchange: parts[0],
    channel: parts[1],
    symbol: parts[2],
    extra: parts.slice(3),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Export Singleton
// ═══════════════════════════════════════════════════════════════════════════

export const cache = new CacheManager();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    cache.destroy();
  });
}
