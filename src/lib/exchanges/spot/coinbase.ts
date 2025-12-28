/**
 * 🟢 Coinbase Spot Exchange Integration
 * REST API + WebSocket configuration
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.coinbase({
    enableRateLimit: false,
    timeout: 10000,
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'coinbase',
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
  const exchange = new ccxt.coinbase({
    enableRateLimit: false,
    timeout: 10000,
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'coinbase',
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
  const exchange = new ccxt.coinbase({
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
  const exchange = new ccxt.coinbase({
    enableRateLimit: false,
    timeout: 10000,
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'coinbase',
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
  const exchange = new ccxt.coinbase({
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
  url: 'wss://ws-feed.exchange.coinbase.com',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      type: 'subscribe',
      product_ids: [symbol],
      channels: [channel],
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      type: 'unsubscribe',
      product_ids: [symbol],
      channels: [channel],
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'level2',
    trades: 'matches',
  },

  parseMessage: (data: any) => {
    if (!data || !data.type) return null;

    const type = data.type;

    if (type === 'ticker') {
      return {
        type: 'ticker',
        data: {
          symbol: data.product_id,
          last: parseFloat(data.price),
          bid: parseFloat(data.best_bid),
          ask: parseFloat(data.best_ask),
          high: parseFloat(data.high_24h),
          low: parseFloat(data.low_24h),
          volume: parseFloat(data.volume_24h),
          timestamp: new Date(data.time).getTime(),
        },
      };
    }

    if (type === 'snapshot' || type === 'l2update') {
      return {
        type: 'orderbook',
        data: {
          symbol: data.product_id,
          bids: data.bids?.map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })) || [],
          asks: data.asks?.map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })) || [],
          timestamp: new Date(data.time).getTime(),
        },
      };
    }

    if (type === 'match' || type === 'last_match') {
      return {
        type: 'trade',
        data: {
          symbol: data.product_id,
          side: data.side,
          price: parseFloat(data.price),
          amount: parseFloat(data.size),
          timestamp: new Date(data.time).getTime(),
        },
      };
    }

    return null;
  },
};
