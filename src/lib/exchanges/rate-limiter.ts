/**
 * 🔷 Smart Rate Limiter
 * Background queue system that returns cached data instantly
 * while refreshing in the background
 */

import type { QueuedRequest, RateLimitConfig, ExchangeId } from './types';
import { cache, buildCacheKey } from './cache';
import { EXCHANGE_CONFIGS } from './config';

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ Rate Limiter Configuration
// ═══════════════════════════════════════════════════════════════════════════

const RATE_LIMIT_CONFIGS: Record<ExchangeId, RateLimitConfig> = Object.entries(
  EXCHANGE_CONFIGS
).reduce((acc, [id, config]) => {
  acc[id as ExchangeId] = {
    requestsPerSecond: config.rateLimit,
    burst: config.rateLimit * 2, // 2x burst allowance
  };
  return acc;
}, {} as Record<ExchangeId, RateLimitConfig>);

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Priority Levels
// ═══════════════════════════════════════════════════════════════════════════

export enum Priority {
  HIGH = 0, // User-initiated requests
  NORMAL = 1, // Background refreshes
  LOW = 2, // Prefetch/warmup
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 Rate Limiter Class
// ═══════════════════════════════════════════════════════════════════════════

class RateLimiter {
  private queues: Map<ExchangeId, QueuedRequest<any>[]>;
  private tokens: Map<ExchangeId, number>;
  private lastRefill: Map<ExchangeId, number>;
  private processing: Map<ExchangeId, boolean>;
  private intervals: Map<ExchangeId, NodeJS.Timeout>;

  constructor() {
    this.queues = new Map();
    this.tokens = new Map();
    this.lastRefill = new Map();
    this.processing = new Map();
    this.intervals = new Map();

    // Initialize for each exchange
    Object.keys(EXCHANGE_CONFIGS).forEach((id) => {
      const exchangeId = id as ExchangeId;
      this.queues.set(exchangeId, []);
      this.tokens.set(exchangeId, RATE_LIMIT_CONFIGS[exchangeId].requestsPerSecond);
      this.lastRefill.set(exchangeId, Date.now());
      this.processing.set(exchangeId, false);
      this.startProcessor(exchangeId);
    });
  }

  /**
   * Execute request with rate limiting
   * Returns cached data immediately if available, queues refresh in background
   */
  async execute<T>(
    exchangeId: ExchangeId,
    key: string,
    requestFn: () => Promise<T>,
    options: {
      priority?: Priority;
      ttl?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const { priority = Priority.NORMAL, ttl, skipCache = false } = options;

    // Try to return cached data immediately
    if (!skipCache) {
      const cached = cache.get<T>(key);
      if (cached !== null) {
        // Queue a background refresh if needed
        this.queueBackgroundRefresh(exchangeId, key, requestFn, ttl);
        return cached;
      }
    }

    // No cache available - wait for real request
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        key,
        execute: requestFn,
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
      };

      const queue = this.queues.get(exchangeId)!;
      
      // Insert based on priority
      const insertIndex = queue.findIndex((r) => r.priority > priority);
      if (insertIndex === -1) {
        queue.push(request);
      } else {
        queue.splice(insertIndex, 0, request);
      }

      this.processQueue(exchangeId);
    });
  }

  /**
   * Queue a background refresh (low priority)
   */
  private queueBackgroundRefresh<T>(
    exchangeId: ExchangeId,
    key: string,
    requestFn: () => Promise<T>,
    ttl?: number
  ): void {
    const queue = this.queues.get(exchangeId)!;
    
    // Don't queue if already in queue
    if (queue.some((r) => r.key === key)) {
      return;
    }

    const request: QueuedRequest<T> = {
      key,
      execute: async () => {
        const data = await requestFn();
        cache.set(key, data, ttl);
        return data;
      },
      resolve: () => {}, // Background - no one waiting
      reject: (error) => {
        console.error(`Background refresh failed for ${key}:`, error);
      },
      timestamp: Date.now(),
      priority: Priority.LOW,
    };

    queue.push(request);
  }

  /**
   * Process queue for specific exchange
   */
  private async processQueue(exchangeId: ExchangeId): Promise<void> {
    // Already processing
    if (this.processing.get(exchangeId)) {
      return;
    }

    const queue = this.queues.get(exchangeId)!;
    if (queue.length === 0) {
      return;
    }

    this.processing.set(exchangeId, true);

    while (queue.length > 0) {
      // Refill tokens
      this.refillTokens(exchangeId);

      // Check if we have tokens
      const tokens = this.tokens.get(exchangeId)!;
      if (tokens < 1) {
        // Wait a bit and try again
        await this.sleep(100);
        continue;
      }

      // Get next request
      const request = queue.shift()!;
      this.tokens.set(exchangeId, tokens - 1);

      // Execute request
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error as Error);
      }
    }

    this.processing.set(exchangeId, false);
  }

  /**
   * Refill tokens based on time passed
   */
  private refillTokens(exchangeId: ExchangeId): void {
    const now = Date.now();
    const lastRefill = this.lastRefill.get(exchangeId)!;
    const timePassed = now - lastRefill;

    const config = RATE_LIMIT_CONFIGS[exchangeId];
    const tokensToAdd = (timePassed / 1000) * config.requestsPerSecond;

    if (tokensToAdd >= 1) {
      const currentTokens = this.tokens.get(exchangeId)!;
      const newTokens = Math.min(
        currentTokens + Math.floor(tokensToAdd),
        config.burst || config.requestsPerSecond
      );
      
      this.tokens.set(exchangeId, newTokens);
      this.lastRefill.set(exchangeId, now);
    }
  }

  /**
   * Start automatic queue processor
   */
  private startProcessor(exchangeId: ExchangeId): void {
    const interval = setInterval(() => {
      this.processQueue(exchangeId);
    }, 100); // Check every 100ms

    this.intervals.set(exchangeId, interval);
  }

  /**
   * Get queue stats for monitoring
   */
  getStats(exchangeId: ExchangeId): {
    queueLength: number;
    tokens: number;
    processing: boolean;
  } {
    return {
      queueLength: this.queues.get(exchangeId)?.length || 0,
      tokens: this.tokens.get(exchangeId) || 0,
      processing: this.processing.get(exchangeId) || false,
    };
  }

  /**
   * Clear queue for specific exchange
   */
  clearQueue(exchangeId: ExchangeId): void {
    const queue = this.queues.get(exchangeId);
    if (queue) {
      queue.forEach((request) => {
        request.reject(new Error('Queue cleared'));
      });
      queue.length = 0;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.queues.clear();
    this.tokens.clear();
    this.lastRefill.clear();
    this.processing.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Export Singleton
// ═══════════════════════════════════════════════════════════════════════════

export const rateLimiter = new RateLimiter();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    rateLimiter.destroy();
  });
}
