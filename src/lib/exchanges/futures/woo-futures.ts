/**
 * 🔵 WOO X Futures Exchange Integration
 * REST API + WebSocket configuration for perpetual contracts
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade, FundingRate } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.woo({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'woo-futures',
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
  const exchange = new ccxt.woo({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'woo-futures',
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
  const exchange = new ccxt.woo({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
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
  const exchange = new ccxt.woo({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'woo-futures',
    symbol,
    timestamp: trade.timestamp || Date.now(),
    datetime: trade.datetime || new Date().toISOString(),
    side: trade.side as 'buy' | 'sell',
    price: trade.price,
    amount: typeof trade.amount === 'number' ? trade.amount : (trade.amount ? parseFloat(String(trade.amount)) : 0),
    cost: trade.cost || trade.price * (typeof trade.amount === 'number' ? trade.amount : (trade.amount ? parseFloat(String(trade.amount)) : 0)),
  }));
}

export async function getFundingRate(symbol: string): Promise<FundingRate> {
  const exchange = new ccxt.woo({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const funding = await exchange.fetchFundingRate(symbol);

  return {
    exchange: 'woo-futures',
    symbol,
    timestamp: funding.timestamp || Date.now(),
    datetime: funding.datetime || new Date().toISOString(),
    fundingRate: funding.fundingRate ?? 0,
    fundingTimestamp: funding.fundingTimestamp ?? Date.now(),
    nextFundingTimestamp: funding.nextFundingTimestamp,
  };
}

export async function getMarkets(): Promise<string[]> {
  const exchange = new ccxt.woo({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  await exchange.loadMarkets();
  return exchange.symbols || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const websocketConfig = {
  url: 'wss://wss.woo.org/ws/stream',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      id: Date.now(),
      event: 'subscribe',
      topic: `${symbol}@${channel}`,
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      id: Date.now(),
      event: 'unsubscribe',
      topic: `${symbol}@${channel}`,
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'orderbook',
    trades: 'trade',
  },

  parseMessage: (data: any) => {
    if (!data || !data.topic) return null;

    const topic = data.topic;
    const d = data.data;

    if (!d) return null;

    if (topic.includes('@ticker')) {
      return {
        type: 'ticker',
        data: {
          symbol: topic.split('@')[0],
          last: parseFloat(d.close),
          high: parseFloat(d.high),
          low: parseFloat(d.low),
          volume: parseFloat(d.volume),
          open: parseFloat(d.open),
          fundingRate: parseFloat(d.fundingRate),
          timestamp: d.timestamp,
        },
      };
    }

    if (topic.includes('@orderbook')) {
      return {
        type: 'orderbook',
        data: {
          symbol: topic.split('@')[0],
          bids: d.bids?.map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })),
          asks: d.asks?.map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })),
          timestamp: d.timestamp,
        },
      };
    }

    if (topic.includes('@trade')) {
      return {
        type: 'trade',
        data: {
          symbol: topic.split('@')[0],
          side: d.side,
          price: parseFloat(d.price),
          amount: parseFloat(d.size),
          timestamp: d.timestamp,
        },
      };
    }

    return null;
  },
};
