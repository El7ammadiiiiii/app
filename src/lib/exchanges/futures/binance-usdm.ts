/**
 * 🟡 Binance USDⓈ-M Futures Integration
 * Perpetual contracts settled in USDT
 */

import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, FundingRate, ApiResponse } from '../types';
import { ccxtManager } from '../ccxt-manager';
import { Priority } from '../rate-limiter';

const EXCHANGE_ID: ExchangeId = 'binance-usdm';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const binanceUsdm = {
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

export const binanceUsdmWebSocket = {
  baseUrl: 'wss://fstream.binance.com/ws',
  
  /**
   * Build ticker stream URL
   */
  tickerStream(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return `${this.baseUrl}/${normalizedSymbol}@ticker`;
  },

  /**
   * Build order book stream URL
   */
  orderBookStream(symbol: string, depth: number = 20): string {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return `${this.baseUrl}/${normalizedSymbol}@depth${depth}@100ms`;
  },

  /**
   * Build trades stream URL
   */
  tradesStream(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return `${this.baseUrl}/${normalizedSymbol}@aggTrade`;
  },

  /**
   * Build OHLCV (kline) stream URL
   */
  ohlcvStream(symbol: string, interval: string = '1m'): string {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return `${this.baseUrl}/${normalizedSymbol}@kline_${interval}`;
  },

  /**
   * Build mark price stream URL
   */
  markPriceStream(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return `${this.baseUrl}/${normalizedSymbol}@markPrice@1s`;
  },

  /**
   * Build funding rate stream URL
   */
  fundingRateStream(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return `${this.baseUrl}/${normalizedSymbol}@markPrice`;
  },

  /**
   * Parse WebSocket message
   */
  parseMessage(data: any): any {
    // Ticker message
    if (data.e === '24hrTicker') {
      return {
        type: 'ticker',
        symbol: data.s,
        price: parseFloat(data.c),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        volume: parseFloat(data.v),
        timestamp: data.E,
      };
    }

    // Order book message
    if (data.e === 'depthUpdate') {
      return {
        type: 'orderbook',
        symbol: data.s,
        bids: data.b.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        asks: data.a.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        timestamp: data.E,
      };
    }

    // Trade message
    if (data.e === 'aggTrade') {
      return {
        type: 'trade',
        symbol: data.s,
        id: data.a,
        price: parseFloat(data.p),
        amount: parseFloat(data.q),
        side: data.m ? 'sell' : 'buy',
        timestamp: data.T,
      };
    }

    // Kline (OHLCV) message
    if (data.e === 'kline') {
      const k = data.k;
      return {
        type: 'ohlcv',
        symbol: data.s,
        interval: k.i,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        timestamp: k.t,
        isClosed: k.x,
      };
    }

    // Mark price & funding rate message
    if (data.e === 'markPriceUpdate') {
      return {
        type: 'funding',
        symbol: data.s,
        markPrice: parseFloat(data.p),
        fundingRate: parseFloat(data.r),
        nextFundingTime: data.T,
        timestamp: data.E,
      };
    }

    return null;
  },
};
