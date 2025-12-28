/**
 * 🔵 HTX (Huobi) Futures Exchange Integration
 * REST API + WebSocket configuration for linear swaps
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade, FundingRate } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.htx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'htx-futures',
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
  const exchange = new ccxt.htx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'htx-futures',
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
  const exchange = new ccxt.htx({
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
  const exchange = new ccxt.htx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'htx-futures',
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
  const exchange = new ccxt.htx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const funding = await exchange.fetchFundingRate(symbol);

  return {
    exchange: 'htx-futures',
    symbol,
    timestamp: funding.timestamp || Date.now(),
    datetime: funding.datetime || new Date().toISOString(),
    fundingRate: funding.fundingRate ?? 0,
    fundingTimestamp: funding.fundingTimestamp ?? Date.now(),
    nextFundingTimestamp: funding.nextFundingTimestamp,
  };
}

export async function getMarkets(): Promise<string[]> {
  const exchange = new ccxt.htx({
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
  url: 'wss://api.hbdm.com/linear-swap-ws',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      sub: `market.${symbol}.${channel}`,
      id: Date.now().toString(),
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      unsub: `market.${symbol}.${channel}`,
      id: Date.now().toString(),
    });
  },

  channels: {
    ticker: 'detail',
    orderbook: 'depth.step0',
    trades: 'trade.detail',
  },

  parseMessage: (data: any) => {
    if (!data || !data.ch) return null;

    const channel = data.ch;
    const tick = data.tick;

    if (!tick) return null;

    if (channel.includes('.detail')) {
      const symbol = channel.split('.')[1];
      return {
        type: 'ticker',
        data: {
          symbol,
          last: tick.close,
          high: tick.high,
          low: tick.low,
          volume: tick.vol,
          amount: tick.amount,
          open: tick.open,
          timestamp: tick.ts || Date.now(),
        },
      };
    }

    if (channel.includes('.depth')) {
      const symbol = channel.split('.')[1];
      return {
        type: 'orderbook',
        data: {
          symbol,
          bids: tick.bids?.map((b: any) => ({
            price: b[0],
            amount: b[1],
          })),
          asks: tick.asks?.map((a: any) => ({
            price: a[0],
            amount: a[1],
          })),
          timestamp: tick.ts || Date.now(),
        },
      };
    }

    if (channel.includes('.trade')) {
      const symbol = channel.split('.')[1];
      const trades = tick.data || [];
      
      return {
        type: 'trade',
        data: trades.map((trade: any) => ({
          symbol,
          side: trade.direction,
          price: trade.price,
          amount: typeof trade.amount === 'number' ? trade.amount : (trade.amount ? parseFloat(String(trade.amount)) : 0),
          timestamp: trade.ts,
        })),
      };
    }

    return null;
  },
};
