/**
 * 🔷 CCXT Manager
 * Unified CCXT client manager for all exchanges
 */

import * as ccxt from 'ccxt';
import type {
  ExchangeId,
  Ticker,
  OrderBook,
  OHLCV,
  Trade,
  FundingRate,
  ApiResponse,
} from './types';
import { EXCHANGE_CONFIGS } from './config';
import { cache, buildCacheKey } from './cache';
import { rateLimiter, Priority } from './rate-limiter';

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 CCXT Manager Class
// ═══════════════════════════════════════════════════════════════════════════

class CCXTManager {
  private exchanges: Map<ExchangeId, ccxt.Exchange>;
  private marketsLoaded: Set<ExchangeId>;

  constructor() {
    this.exchanges = new Map();
    this.marketsLoaded = new Set();
  }

  /**
   * Get or create exchange instance
   */
  private getExchange(exchangeId: ExchangeId): ccxt.Exchange {
    if (!this.exchanges.has(exchangeId)) {
      const config = EXCHANGE_CONFIGS[exchangeId];
      const ExchangeClass = (ccxt as any)[config.ccxtId] as typeof ccxt.Exchange;

      const exchange = new ExchangeClass({
        enableRateLimit: false, // We handle rate limiting ourselves
        timeout: 10000,
      });

      this.exchanges.set(exchangeId, exchange);
    }

    return this.exchanges.get(exchangeId)!;
  }

  /**
   * Ensure markets are loaded
   */
  private async ensureMarkets(exchangeId: ExchangeId): Promise<void> {
    if (this.marketsLoaded.has(exchangeId)) {
      return;
    }

    const exchange = this.getExchange(exchangeId);
    await exchange.loadMarkets();
    this.marketsLoaded.add(exchangeId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 📊 Ticker
  // ═════════════════════════════════════════════════════════════════════════

  async fetchTicker(
    exchangeId: ExchangeId,
    symbol: string,
    priority: Priority = Priority.NORMAL
  ): Promise<ApiResponse<Ticker>> {
    const cacheKey = buildCacheKey(exchangeId, 'ticker', symbol);

    try {
      const data = await rateLimiter.execute(
        exchangeId,
        cacheKey,
        async () => {
          await this.ensureMarkets(exchangeId);
          const exchange = this.getExchange(exchangeId);
          const ticker = await exchange.fetchTicker(symbol);

          const normalized: Ticker = {
            exchange: exchangeId,
            symbol,
            timestamp: ticker.timestamp || Date.now(),
            datetime: ticker.datetime || new Date().toISOString(),
            high: ticker.high ?? null,
            low: ticker.low ?? null,
            bid: ticker.bid ?? null,
            bidVolume: ticker.bidVolume ?? null,
            ask: ticker.ask ?? null,
            askVolume: ticker.askVolume ?? null,
            vwap: ticker.vwap ?? null,
            open: ticker.open ?? null,
            close: ticker.close ?? null,
            last: ticker.last ?? null,
            previousClose: ticker.previousClose ?? null,
            change: ticker.change ?? null,
            percentage: ticker.percentage ?? null,
            average: ticker.average ?? null,
            baseVolume: ticker.baseVolume ?? null,
            quoteVolume: ticker.quoteVolume ?? null,
          };

          cache.set(cacheKey, normalized, 1000); // 1 second TTL
          return normalized;
        },
        { priority, ttl: 1000 }
      );

      return {
        success: true,
        data,
        timestamp: Date.now(),
        cached: cache.get(cacheKey) !== null,
        source: exchangeId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        source: exchangeId,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 📖 Order Book
  // ═════════════════════════════════════════════════════════════════════════

  async fetchOrderBook(
    exchangeId: ExchangeId,
    symbol: string,
    limit: number = 100,
    priority: Priority = Priority.NORMAL
  ): Promise<ApiResponse<OrderBook>> {
    const cacheKey = buildCacheKey(exchangeId, 'orderbook', symbol, limit.toString());

    try {
      const data = await rateLimiter.execute(
        exchangeId,
        cacheKey,
        async () => {
          await this.ensureMarkets(exchangeId);
          const exchange = this.getExchange(exchangeId);
          const orderbook = await exchange.fetchOrderBook(symbol, limit);

          const normalized: OrderBook = {
            exchange: exchangeId,
            symbol,
            timestamp: orderbook.timestamp || Date.now(),
            datetime: orderbook.datetime || new Date().toISOString(),
            bids: orderbook.bids.map(([price, amount]: any) => ({
              price: typeof price === 'number' ? price : parseFloat(String(price)),
              amount: typeof amount === 'number' ? amount : parseFloat(String(amount)),
            })),
            asks: orderbook.asks.map(([price, amount]: any) => ({
              price: typeof price === 'number' ? price : parseFloat(String(price)),
              amount: typeof amount === 'number' ? amount : parseFloat(String(amount)),
            })),
            nonce: orderbook.nonce,
          };

          cache.set(cacheKey, normalized, 500); // 500ms TTL for real-time feel
          return normalized;
        },
        { priority, ttl: 500 }
      );

      return {
        success: true,
        data,
        timestamp: Date.now(),
        cached: cache.get(cacheKey) !== null,
        source: exchangeId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        source: exchangeId,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 📈 OHLCV
  // ═════════════════════════════════════════════════════════════════════════

  async fetchOHLCV(
    exchangeId: ExchangeId,
    symbol: string,
    timeframe: string = '1h',
    since?: number,
    limit: number = 100,
    priority: Priority = Priority.NORMAL
  ): Promise<ApiResponse<OHLCV[]>> {
    const cacheKey = buildCacheKey(
      exchangeId,
      'ohlcv',
      symbol,
      timeframe,
      limit.toString()
    );

    try {
      const data = await rateLimiter.execute(
        exchangeId,
        cacheKey,
        async () => {
          await this.ensureMarkets(exchangeId);
          const exchange = this.getExchange(exchangeId);
          const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);

          const normalized: OHLCV[] = ohlcv.map((data: any) => {
            const [timestamp, open, high, low, close, volume] = data;
            return {
              timestamp: typeof timestamp === 'number' ? timestamp : parseInt(String(timestamp)),
              open: typeof open === 'number' ? open : parseFloat(String(open)),
              high: typeof high === 'number' ? high : parseFloat(String(high)),
              low: typeof low === 'number' ? low : parseFloat(String(low)),
              close: typeof close === 'number' ? close : parseFloat(String(close)),
              volume: typeof volume === 'number' ? volume : parseFloat(String(volume)),
            };
          });

          cache.set(cacheKey, normalized, 5000); // 5 seconds TTL
          return normalized;
        },
        { priority, ttl: 5000 }
      );

      return {
        success: true,
        data,
        timestamp: Date.now(),
        cached: cache.get(cacheKey) !== null,
        source: exchangeId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        source: exchangeId,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 💱 Trades
  // ═════════════════════════════════════════════════════════════════════════

  async fetchTrades(
    exchangeId: ExchangeId,
    symbol: string,
    since?: number,
    limit: number = 50,
    priority: Priority = Priority.NORMAL
  ): Promise<ApiResponse<Trade[]>> {
    const cacheKey = buildCacheKey(
      exchangeId,
      'trades',
      symbol,
      limit.toString()
    );

    try {
      const data = await rateLimiter.execute(
        exchangeId,
        cacheKey,
        async () => {
          await this.ensureMarkets(exchangeId);
          const exchange = this.getExchange(exchangeId);
          const trades = await exchange.fetchTrades(symbol, since, limit);

          const normalized: Trade[] = trades.map((trade: any) => ({
            id: trade.id || '',
            exchange: exchangeId,
            symbol,
            timestamp: trade.timestamp || Date.now(),
            datetime: trade.datetime || new Date().toISOString(),
            side: trade.side as 'buy' | 'sell',
            price: trade.price,
            amount: trade.amount,
            cost: trade.cost || trade.price * trade.amount,
          }));

          cache.set(cacheKey, normalized, 1000); // 1 second TTL
          return normalized;
        },
        { priority, ttl: 1000 }
      );

      return {
        success: true,
        data,
        timestamp: Date.now(),
        cached: cache.get(cacheKey) !== null,
        source: exchangeId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        source: exchangeId,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 💰 Funding Rate (for perpetual swaps)
  // ═════════════════════════════════════════════════════════════════════════

  async fetchFundingRate(
    exchangeId: ExchangeId,
    symbol: string,
    priority: Priority = Priority.NORMAL
  ): Promise<ApiResponse<FundingRate>> {
    const cacheKey = buildCacheKey(exchangeId, 'funding', symbol);

    try {
      const data = await rateLimiter.execute(
        exchangeId,
        cacheKey,
        async () => {
          await this.ensureMarkets(exchangeId);
          const exchange = this.getExchange(exchangeId);
          
          // Check if exchange supports funding rates
          if (!exchange.has['fetchFundingRate']) {
            throw new Error(`Exchange ${exchangeId} does not support funding rates`);
          }

          const funding = await exchange.fetchFundingRate(symbol);

          const normalized: FundingRate = {
            exchange: exchangeId,
            symbol,
            timestamp: funding.timestamp || Date.now(),
            datetime: funding.datetime || new Date().toISOString(),
            fundingRate: funding.fundingRate ?? 0,
            fundingTimestamp: funding.fundingTimestamp ?? Date.now(),
            nextFundingTimestamp: funding.nextFundingTimestamp,
          };

          cache.set(cacheKey, normalized, 60000); // 60 seconds TTL
          return normalized;
        },
        { priority, ttl: 60000 }
      );

      return {
        success: true,
        data,
        timestamp: Date.now(),
        cached: cache.get(cacheKey) !== null,
        source: exchangeId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        source: exchangeId,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 📋 Markets
  // ═════════════════════════════════════════════════════════════════════════

  async fetchMarkets(
    exchangeId: ExchangeId
  ): Promise<ApiResponse<string[]>> {
    try {
      await this.ensureMarkets(exchangeId);
      const exchange = this.getExchange(exchangeId);
      const symbols = exchange.symbols || [];

      return {
        success: true,
        data: symbols,
        timestamp: Date.now(),
        source: exchangeId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        source: exchangeId,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 🧹 Cleanup
  // ═════════════════════════════════════════════════════════════════════════

  destroy(): void {
    this.exchanges.forEach((exchange) => {
      if ((exchange as any).destroy) {
        (exchange as any).destroy();
      }
    });
    this.exchanges.clear();
    this.marketsLoaded.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Export Singleton
// ═══════════════════════════════════════════════════════════════════════════

export const ccxtManager = new CCXTManager();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    ccxtManager.destroy();
  });
}

