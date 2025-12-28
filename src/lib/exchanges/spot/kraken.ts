/**
 * 🟢 Kraken Spot Exchange Integration
 * REST API + WebSocket configuration
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'kraken',
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
}

export async function getOrderBook(symbol: string, limit: number = 100): Promise<OrderBook> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'kraken',
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
}

export async function getOHLCV(
  symbol: string,
  timeframe: string = '1h',
  since?: number,
  limit: number = 100
): Promise<OHLCV[]> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
  });

  const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);

  return ohlcv.map((data: any) => {
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
}

export async function getTrades(
  symbol: string,
  since?: number,
  limit: number = 50
): Promise<Trade[]> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'kraken',
    symbol,
    timestamp: trade.timestamp || Date.now(),
    datetime: trade.datetime || new Date().toISOString(),
    side: trade.side as 'buy' | 'sell',
    price: trade.price,
    amount: typeof trade.amount === 'number' ? trade.amount : (trade.amount ? parseFloat(String(trade.amount)) : 0),
    cost: trade.cost || trade.price * (typeof trade.amount === 'number' ? trade.amount : (trade.amount ? parseFloat(String(trade.amount)) : 0)),
  }));
}

export async function getMarkets(): Promise<string[]> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
  });

  await exchange.loadMarkets();
  return exchange.symbols || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const websocketConfig = {
  url: 'wss://ws.kraken.com',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      event: 'subscribe',
      pair: [symbol],
      subscription: {
        name: channel,
      },
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      event: 'unsubscribe',
      pair: [symbol],
      subscription: {
        name: channel,
      },
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'book',
    trades: 'trade',
  },

  parseMessage: (data: any) => {
    if (!Array.isArray(data)) return null;

    const channelName = data[2];
    const pair = data[3];

    if (channelName === 'ticker') {
      const ticker = data[1];
      return {
        type: 'ticker',
        data: {
          symbol: pair,
          last: parseFloat(ticker.c?.[0]),
          bid: parseFloat(ticker.b?.[0]),
          ask: parseFloat(ticker.a?.[0]),
          high: parseFloat(ticker.h?.[0]),
          low: parseFloat(ticker.l?.[0]),
          volume: parseFloat(ticker.v?.[0]),
          vwap: parseFloat(ticker.p?.[0]),
          open: parseFloat(ticker.o?.[0]),
          timestamp: Date.now(),
        },
      };
    }

    if (channelName === 'book-10' || channelName === 'book-25' || channelName === 'book-100') {
      const orderbook = data[1];
      return {
        type: 'orderbook',
        data: {
          symbol: pair,
          bids: orderbook.b?.map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })) || orderbook.bs?.map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })),
          asks: orderbook.a?.map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })) || orderbook.as?.map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })),
          timestamp: Date.now(),
        },
      };
    }

    if (channelName === 'trade') {
      const trades = data[1];
      return {
        type: 'trade',
        data: trades.map((trade: any) => ({
          symbol: pair,
          side: trade[3] === 'b' ? 'buy' : 'sell',
          price: parseFloat(trade[0]),
          amount: parseFloat(trade[1]),
          timestamp: Math.floor(parseFloat(trade[2]) * 1000),
        })),
      };
    }

    return null;
  },
};
