/**
 * 🟢 KuCoin Spot Exchange Integration
 * REST API + Free WebSocket
 */

import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, ApiResponse } from '../types';
import { ccxtManager } from '../ccxt-manager';
import { Priority } from '../rate-limiter';

const EXCHANGE_ID: ExchangeId = 'kucoin';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const kucoinSpot = {
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
   * Get all markets
   */
  async getMarkets(): Promise<ApiResponse<string[]>> {
    return ccxtManager.fetchMarkets(EXCHANGE_ID);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const kucoinSpotWebSocket = {
  baseUrl: 'wss://ws-api-spot.kucoin.com',
  tokenUrl: 'https://api.kucoin.com/api/v1/bullet-public',
  
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
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/market/ticker:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Subscribe to order book stream (Level 2)
   */
  subscribeOrderBookMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/market/level2:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Subscribe to trades stream
   */
  subscribeTradesMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/market/match:${normalizedSymbol}`,
      response: true,
    });
  },

  /**
   * Subscribe to OHLCV (candlestick) stream
   */
  subscribeOHLCVMessage(symbol: string, interval: string = '1min'): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      type: 'subscribe',
      topic: `/market/candles:${normalizedSymbol}_${interval}`,
      response: true,
    });
  },

  /**
   * Parse WebSocket message
   */
  parseMessage(data: any): any {
    if (!data || !data.topic) return null;

    // Ticker message
    if (data.topic?.includes('/market/ticker:')) {
      const ticker = data.data;
      return {
        type: 'ticker',
        symbol: data.subject,
        price: parseFloat(ticker.price),
        high: parseFloat(ticker.high),
        low: parseFloat(ticker.low),
        volume: parseFloat(ticker.vol),
        bid: parseFloat(ticker.bestBid),
        ask: parseFloat(ticker.bestAsk),
        timestamp: ticker.time,
      };
    }

    // Order book message
    if (data.topic?.includes('/market/level2:')) {
      const book = data.data;
      return {
        type: 'orderbook',
        symbol: data.subject,
        bids: book.bids.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        asks: book.asks.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        timestamp: book.timestamp,
      };
    }

    // Trade message
    if (data.topic?.includes('/market/match:')) {
      const trade = data.data;
      return {
        type: 'trade',
        symbol: data.subject,
        id: trade.tradeId,
        price: parseFloat(trade.price),
        amount: parseFloat(trade.size),
        side: trade.side.toLowerCase(),
        timestamp: trade.time,
      };
    }

    // Candlestick (OHLCV) message
    if (data.topic?.includes('/market/candles:')) {
      const candle = data.data.candles;
      return {
        type: 'ohlcv',
        symbol: data.subject,
        interval: data.data.symbol.split('_')[1],
        open: parseFloat(candle[1]),
        close: parseFloat(candle[2]),
        high: parseFloat(candle[3]),
        low: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        timestamp: parseInt(candle[0]),
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
