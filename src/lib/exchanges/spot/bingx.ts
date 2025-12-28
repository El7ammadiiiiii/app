/**
 * 🟢 BingX Spot Exchange Integration
 * REST API + WebSocket configuration
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.bingx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'spot',
    },
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'bingx',
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
  const exchange = new ccxt.bingx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'spot',
    },
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'bingx',
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
  const exchange = new ccxt.bingx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'spot',
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
  const exchange = new ccxt.bingx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'spot',
    },
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'bingx',
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
  const exchange = new ccxt.bingx({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'spot',
    },
  });

  await exchange.loadMarkets();
  return exchange.symbols || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const websocketConfig = {
  url: 'wss://open-api-ws.bingx.com/market',
  
  subscribe: (channel: string, symbol: string) => {
    const bingxSymbol = symbol.replace('/', '-');
    
    return JSON.stringify({
      id: Date.now().toString(),
      reqType: 'sub',
      dataType: `${bingxSymbol}@${channel}`,
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    const bingxSymbol = symbol.replace('/', '-');
    
    return JSON.stringify({
      id: Date.now().toString(),
      reqType: 'unsub',
      dataType: `${bingxSymbol}@${channel}`,
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'depth',
    trades: 'trade',
  },

  parseMessage: (data: any) => {
    if (!data || !data.dataType) return null;

    const dataType = data.dataType;

    if (dataType.includes('@ticker')) {
      const ticker = data.data;
      return {
        type: 'ticker',
        data: {
          symbol: dataType.split('@')[0].replace('-', '/'),
          last: parseFloat(ticker.c),
          bid: parseFloat(ticker.b),
          ask: parseFloat(ticker.a),
          high: parseFloat(ticker.h),
          low: parseFloat(ticker.l),
          volume: parseFloat(ticker.v),
          quoteVolume: parseFloat(ticker.q),
          change: parseFloat(ticker.P),
          timestamp: ticker.E,
        },
      };
    }

    if (dataType.includes('@depth')) {
      const orderbook = data.data;
      return {
        type: 'orderbook',
        data: {
          symbol: dataType.split('@')[0].replace('-', '/'),
          bids: orderbook.bids?.map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })),
          asks: orderbook.asks?.map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })),
          timestamp: orderbook.T,
        },
      };
    }

    if (dataType.includes('@trade')) {
      const trade = data.data;
      return {
        type: 'trade',
        data: {
          symbol: dataType.split('@')[0].replace('-', '/'),
          side: trade.m ? 'sell' : 'buy',
          price: parseFloat(trade.p),
          amount: parseFloat(trade.q),
          timestamp: trade.T,
        },
      };
    }

    return null;
  },
};
