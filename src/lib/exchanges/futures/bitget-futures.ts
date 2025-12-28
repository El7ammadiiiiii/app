/**
 * 🟣 Bitget Futures (USDT) Integration
 * REST API + Free WebSocket
 */

import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, FundingRate, ApiResponse } from '../types';
import { ccxtManager } from '../ccxt-manager';
import { Priority } from '../rate-limiter';

const EXCHANGE_ID: ExchangeId = 'bitget-futures';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export const bitgetFutures = {
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

export const bitgetFuturesWebSocket = {
  baseUrl: 'wss://ws.bitget.com/v2/ws/public',
  
  /**
   * Subscribe to ticker stream
   */
  subscribeTickerMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        instType: 'USDT-FUTURES',
        channel: 'ticker',
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to order book stream
   */
  subscribeOrderBookMessage(symbol: string, depth: string = 'books15'): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        instType: 'USDT-FUTURES',
        channel: depth,
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to trades stream
   */
  subscribeTradesMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        instType: 'USDT-FUTURES',
        channel: 'trade',
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to OHLCV (candlestick) stream
   */
  subscribeOHLCVMessage(symbol: string, interval: string = '1m'): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        instType: 'USDT-FUTURES',
        channel: `candle${interval}`,
        instId: normalizedSymbol,
      }],
    });
  },

  /**
   * Subscribe to funding rate stream
   */
  subscribeFundingRateMessage(symbol: string): string {
    const normalizedSymbol = symbol.replace('/', '');
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        instType: 'USDT-FUTURES',
        channel: 'funding-rate',
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
    if (channel === 'ticker') {
      const ticker = data.data[0];
      return {
        type: 'ticker',
        symbol: instId,
        price: parseFloat(ticker.lastPr),
        high: parseFloat(ticker.high24h),
        low: parseFloat(ticker.low24h),
        volume: parseFloat(ticker.baseVolume),
        bid: parseFloat(ticker.bidPr),
        ask: parseFloat(ticker.askPr),
        change: parseFloat(ticker.change24h),
        fundingRate: parseFloat(ticker.fundingRate),
        timestamp: parseInt(ticker.ts),
      };
    }

    // Order book message
    if (channel.startsWith('books')) {
      const book = data.data[0];
      return {
        type: 'orderbook',
        symbol: instId,
        bids: book.bids.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        asks: book.asks.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        timestamp: parseInt(book.ts),
      };
    }

    // Trade message
    if (channel === 'trade') {
      return data.data.map((trade: any) => ({
        type: 'trade',
        symbol: instId,
        id: trade.tradeId,
        price: parseFloat(trade.price),
        amount: parseFloat(trade.size),
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
      }));
    }

    // Funding rate message
    if (channel === 'funding-rate') {
      const funding = data.data[0];
      return {
        type: 'funding',
        symbol: instId,
        fundingRate: parseFloat(funding.fundingRate),
        nextFundingTime: parseInt(funding.nextFundingTime),
        timestamp: parseInt(funding.fundingTime),
      };
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
