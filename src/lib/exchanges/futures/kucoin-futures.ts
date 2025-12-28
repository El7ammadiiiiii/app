/**
 * 🟢 KuCoin Futures (Perpetual) Integration
 * REST API + Free WebSocket
 */

import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, FundingRate, ApiResponse } from '../types';
import { ccxtManager } from '../ccxt-manager';
import { Priority } from '../rate-limiter';

const EXCHANGE_ID: ExchangeId = 'kucoin-futures';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const kucoinFutures = {
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

export const kucoinFuturesWebSocket = {
  baseUrl: 'wss://ws-api-futures.kucoin.com',
  tokenUrl: 'https://api-futures.kucoin.com/api/v1/bullet-public',
  
  /**
   * Get WebSocket connection token
   */
  async getConnectionToken(): Promise<{ token: string; endpoint: string }> {
    const response = await fetch(this.tokenUrl, { method: 'POST' });
    const data = await response.json();
    return {
      token: data.data.token,
      endpoint: data.data.instanceServers[0].endpoint,
    };
  },

  /**
   * Build WebSocket URL with token
   */
  async getWebSocketUrl(): Promise<string> {
    const { token, endpoint } = await this.getConnectionToken();
    return `${endpoint}?token=${token}`;
  },

  /**
   * Subscribe to ticker stream
   */
  subscribeTickerMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/contractMarket/ticker:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Subscribe to order book stream (Level 2)
   */
  subscribeOrderBookMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/contractMarket/level2:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Subscribe to trades stream
   */
  subscribeTradesMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/contractMarket/execution:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Subscribe to funding rate stream
   */
  subscribeFundingRateMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/contract/fundingRate:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Parse WebSocket message
   */
  parseMessage(data: any): any {
    if (!data || !data.topic) return null;

    // Ticker message
    if (data.topic?.includes('/contractMarket/ticker:')) {
      const ticker = data.data;
      return {
        type: 'ticker',
        symbol: data.subject,
        price: parseFloat(ticker.price),
        high: parseFloat(ticker.high),
        low: parseFloat(ticker.low),
        volume: parseFloat(ticker.volume),
        fundingRate: parseFloat(ticker.fundingRate),
        timestamp: ticker.ts,
      };
    }

    // Order book message
    if (data.topic?.includes('/contractMarket/level2:')) {
      const book = data.data;
      return {
        type: 'orderbook',
        symbol: data.subject,
        bids: book.bids.map(([price, amount]: [number, number]) => ({
          price,
          amount,
        })),
        asks: book.asks.map(([price, amount]: [number, number]) => ({
          price,
          amount,
        })),
        timestamp: book.timestamp,
      };
    }

    // Trade message
    if (data.topic?.includes('/contractMarket/execution:')) {
      const trade = data.data;
      return {
        type: 'trade',
        symbol: data.subject,
        id: trade.tradeId,
        price: parseFloat(trade.price),
        amount: parseFloat(trade.size),
        side: trade.side.toLowerCase(),
        timestamp: trade.ts,
      };
    }

    // Funding rate message
    if (data.topic?.includes('/contract/fundingRate:')) {
      const funding = data.data;
      return {
        type: 'funding',
        symbol: data.subject,
        fundingRate: parseFloat(funding.fundingRate),
        predictedRate: parseFloat(funding.predictedRate),
        timestamp: funding.timePoint,
      };
    }

    return null;
  },

  /**
   * Build ping message (keep connection alive)
   */
  pingMessage(id: string = Date.now().toString()): string {
    return JSON.stringify({
      type: 'ping',
      id,
    });
  },
};
