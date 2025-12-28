/**
 * 🔵 Kraken Futures Exchange Integration
 * REST API + WebSocket configuration for perpetual contracts
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade, FundingRate } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'future',
    },
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'kraken-futures',
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
    options: {
      defaultType: 'future',
    },
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'kraken-futures',
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
    options: {
      defaultType: 'future',
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
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'future',
    },
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'kraken-futures',
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
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'future',
    },
  });

  const funding = await exchange.fetchFundingRate(symbol);

  return {
    exchange: 'kraken-futures',
    symbol,
    timestamp: funding.timestamp || Date.now(),
    datetime: funding.datetime || new Date().toISOString(),
    fundingRate: funding.fundingRate ?? 0,
    fundingTimestamp: funding.fundingTimestamp ?? Date.now(),
    nextFundingTimestamp: funding.nextFundingTimestamp,
  };
}

export async function getMarkets(): Promise<string[]> {
  const exchange = new ccxt.kraken({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'future',
    },
  });

  await exchange.loadMarkets();
  return exchange.symbols || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const websocketConfig = {
  url: 'wss://futures.kraken.com/ws/v1',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      event: 'subscribe',
      feed: channel,
      product_ids: [symbol],
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      event: 'unsubscribe',
      feed: channel,
      product_ids: [symbol],
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'book',
    trades: 'trade',
  },

  parseMessage: (data: any) => {
    if (!data || !data.feed) return null;

    const feed = data.feed;

    if (feed === 'ticker') {
      return {
        type: 'ticker',
        data: {
          symbol: data.product_id,
          last: parseFloat(data.last),
          bid: parseFloat(data.bid),
          ask: parseFloat(data.ask),
          volume: parseFloat(data.volume),
          change: parseFloat(data.change),
          fundingRate: parseFloat(data.funding_rate),
          timestamp: data.time,
        },
      };
    }

    if (feed === 'book') {
      return {
        type: 'orderbook',
        data: {
          symbol: data.product_id,
          bids: data.bids?.map((b: any) => ({
            price: parseFloat(b.price),
            amount: parseFloat(b.qty),
          })),
          asks: data.asks?.map((a: any) => ({
            price: parseFloat(a.price),
            amount: parseFloat(a.qty),
          })),
          timestamp: data.timestamp,
        },
      };
    }

    if (feed === 'trade') {
      return {
        type: 'trade',
        data: {
          symbol: data.product_id,
          side: data.side,
          price: parseFloat(data.price),
          amount: parseFloat(data.qty),
          timestamp: data.time,
        },
      };
    }

    return null;
  },
};
