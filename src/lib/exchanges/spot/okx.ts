/**
 * 🔵 OKX Spot Exchange Integration
 * REST API + Free WebSocket
 */

import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, ApiResponse } from '../types';
import { ccxtManager } from '../ccxt-manager';
import { Priority } from '../rate-limiter';

const EXCHANGE_ID: ExchangeId = 'okx';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const okxSpot = {
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

export const okxSpotWebSocket = {
  baseUrl: 'wss://ws.okx.com:8443/ws/v5/public',
  
  /**
   * Subscribe to ticker stream
   */
  subscribeTickerMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        channel: 'tickers',
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to order book stream
   */
  subscribeOrderBookMessage(symbol: string, depth: string = 'books50-l2-tbt'): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        channel: depth,
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to trades stream
   */
  subscribeTradesMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        channel: 'trades',
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to OHLCV (candlestick) stream
   */
  subscribeOHLCVMessage(symbol: string, interval: string = '1m'): string {
    const normalizedSymbol = symbol.replace('/', '-');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        channel: `candle${interval}`,
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Parse WebSocket message
   */
  parseMessage(data: any): any {
    if (!data || !data.arg || !data.data) return null;

    const channel = data.arg.channel;
    const instId = data.arg.instId;

    // Ticker message
    if (channel === 'tickers') {
      const ticker = data.data[0];
      return {
        type: 'ticker',
        symbol: instId,
        price: parseFloat(ticker.last),
        high: parseFloat(ticker.high24h),
        low: parseFloat(ticker.low24h),
        volume: parseFloat(ticker.vol24h),
        bid: parseFloat(ticker.bidPx),
        ask: parseFloat(ticker.askPx),
        timestamp: parseInt(ticker.ts),
      };
    }

    // Order book message
    if (channel.startsWith('books')) {
      const book = data.data[0];
      return {
        type: 'orderbook',
        symbol: instId,
        bids: book.bids.map(([price, amount, , liquidations]: [string, string, string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        asks: book.asks.map(([price, amount, , liquidations]: [string, string, string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        timestamp: parseInt(book.ts),
      };
    }

    // Trade message
    if (channel === 'trades') {
      return data.data.map((trade: any) => ({
        type: 'trade',
        symbol: instId,
        id: trade.tradeId,
        price: parseFloat(trade.px),
        amount: parseFloat(trade.sz),
        side: trade.side.toLowerCase(),
        timestamp: parseInt(trade.ts),
      }));
    }

    // Candlestick (OHLCV) message
    if (channel.startsWith('candle')) {
      return data.data.map((candle: any) => ({
        type: 'ohlcv',
        symbol: instId,
        interval: channel.replace('candle', ''),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        timestamp: parseInt(candle[0]),
        isClosed: candle[8] === '1',
      }));
    }

    return null;
  },

  /**
   * Build ping message (keep connection alive)
   */
  pingMessage(): string {
    return 'ping';
  },
};
