/**
 * 🟢 Bybit Linear (USDT) Futures Integration
 * Perpetual contracts settled in USDT
 */

import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, FundingRate, ApiResponse } from '../types';
import { ccxtManager } from '../ccxt-manager';
import { Priority } from '../rate-limiter';

const EXCHANGE_ID: ExchangeId = 'bybit-linear';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const bybitLinear = {
  /**
   * Get ticker data
   */
  async getTicker(symbol: string, priority?: Priority): Promise<ApiResponse<Ticker>> {
    return ccxtManager.fetchTicker(EXCHANGE_ID, symbol, priority);
  },

  /**
   * Get order book
   */
  async getOrderBook(
    symbol: string,
    limit?: number,
    priority?: Priority
  ): Promise<ApiResponse<OrderBook>> {
    return ccxtManager.fetchOrderBook(EXCHANGE_ID, symbol, limit, priority);
  },

  /**
   * Get OHLCV candles
   */
  async getOHLCV(
    symbol: string,
    timeframe?: string,
    since?: number,
    limit?: number,
    priority?: Priority
  ): Promise<ApiResponse<OHLCV[]>> {
    return ccxtManager.fetchOHLCV(EXCHANGE_ID, symbol, timeframe, since, limit, priority);
  },

  /**
   * Get recent trades
   */
  async getTrades(
    symbol: string,
    since?: number,
    limit?: number,
    priority?: Priority
  ): Promise<ApiResponse<Trade[]>> {
    return ccxtManager.fetchTrades(EXCHANGE_ID, symbol, since, limit, priority);
  },

  /**
   * Get funding rate
   */
  async getFundingRate(symbol: string, priority?: Priority): Promise<ApiResponse<FundingRate>> {
    return ccxtManager.fetchFundingRate(EXCHANGE_ID, symbol, priority);
  },

  /**
   * Get all markets
   */
  async getMarkets(): Promise<ApiResponse<string[]>> {
    return ccxtManager.fetchMarkets(EXCHANGE_ID);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const bybitLinearWebSocket = {
  baseUrl: 'wss://stream.bybit.com/v5/public/linear',
  
  /**
   * Subscribe to ticker stream
   */
  subscribeTickerMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [`tickers.${normalizedSymbol}`],
    });
  },

  /**
   * Subscribe to order book stream
   */
  subscribeOrderBookMessage(symbol: string, depth: number = 50): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [`orderbook.${depth}.${normalizedSymbol}`],
    });
  },

  /**
   * Subscribe to trades stream
   */
  subscribeTradesMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [`publicTrade.${normalizedSymbol}`],
    });
  },

  /**
   * Subscribe to OHLCV (kline) stream
   */
  subscribeOHLCVMessage(symbol: string, interval: string = '1'): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [`kline.${interval}.${normalizedSymbol}`],
    });
  },

  /**
   * Subscribe to liquidation stream
   */
  subscribeLiquidationMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [`liquidation.${normalizedSymbol}`],
    });
  },

  /**
   * Parse WebSocket message
   */
  parseMessage(data: any): any {
    if (!data || !data.topic) return null;

    // Ticker message (includes funding rate)
    if (data.topic?.startsWith('tickers.')) {
      const ticker = data.data;
      return {
        type: 'ticker',
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        high: parseFloat(ticker.highPrice24h),
        low: parseFloat(ticker.lowPrice24h),
        volume: parseFloat(ticker.volume24h),
        fundingRate: parseFloat(ticker.fundingRate),
        nextFundingTime: ticker.nextFundingTime,
        timestamp: ticker.ts,
      };
    }

    // Order book message
    if (data.topic?.startsWith('orderbook.')) {
      const book = data.data;
      return {
        type: 'orderbook',
        symbol: book.s,
        bids: book.b.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        asks: book.a.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        timestamp: book.ts,
      };
    }

    // Trade message
    if (data.topic?.startsWith('publicTrade.')) {
      const trades = data.data;
      if (Array.isArray(trades)) {
        return trades.map(trade => ({
          type: 'trade',
          symbol: trade.s,
          id: trade.i,
          price: parseFloat(trade.p),
          amount: parseFloat(trade.v),
          side: trade.S.toLowerCase(),
          timestamp: trade.T,
        }));
      }
    }

    // Kline (OHLCV) message
    if (data.topic?.startsWith('kline.')) {
      const klines = data.data;
      if (Array.isArray(klines)) {
        return klines.map(k => ({
          type: 'ohlcv',
          symbol: k.symbol,
          interval: k.interval,
          open: parseFloat(k.open),
          high: parseFloat(k.high),
          low: parseFloat(k.low),
          close: parseFloat(k.close),
          volume: parseFloat(k.volume),
          timestamp: k.start,
          isClosed: k.confirm,
        }));
      }
    }

    // Liquidation message
    if (data.topic?.startsWith('liquidation.')) {
      const liq = data.data;
      return {
        type: 'liquidation',
        symbol: liq.symbol,
        side: liq.side.toLowerCase(),
        price: parseFloat(liq.price),
        size: parseFloat(liq.size),
        timestamp: liq.updatedTime,
      };
    }

    return null;
  },

  /**
   * Build ping message (keep connection alive)
   */
  pingMessage(): string {
    return JSON.stringify({ op: 'ping' });
  },
};
