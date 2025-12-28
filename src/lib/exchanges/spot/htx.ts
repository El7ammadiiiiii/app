/**
 * 🟢 HTX (Huobi) Spot Exchange Integration
 * REST API + WebSocket configuration
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.htx({
    enableRateLimit: false,
    timeout: 10000,
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'htx',
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
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'htx',
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
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'htx',
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
  const exchange = new ccxt.htx({
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
  url: 'wss://api.huobi.pro/ws',
  
  subscribe: (channel: string, symbol: string) => {
    const [base, quote] = symbol.split('/');
    const htxSymbol = `${base}${quote}`.toLowerCase();
    
    return JSON.stringify({
      sub: `market.${htxSymbol}.${channel}`,
      id: Date.now().toString(),
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    const [base, quote] = symbol.split('/');
    const htxSymbol = `${base}${quote}`.toLowerCase();
    
    return JSON.stringify({
      unsub: `market.${htxSymbol}.${channel}`,
      id: Date.now().toString(),
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'depth.step0',
    trades: 'trade.detail',
  },

  parseMessage: (data: any) => {
    if (!data || !data.ch) return null;

    const channel = data.ch;
    const tick = data.tick;

    if (!tick) return null;

    if (channel.includes('.ticker')) {
      const symbol = channel.split('.')[1].toUpperCase();
      return {
        type: 'ticker',
        data: {
          symbol: `${symbol.slice(0, -4)}/${symbol.slice(-4)}`,
          last: tick.close,
          bid: tick.bid?.[0],
          ask: tick.ask?.[0],
          high: tick.high,
          low: tick.low,
          volume: tick.vol,
          quoteVolume: tick.amount,
          open: tick.open,
          timestamp: tick.ts || Date.now(),
        },
      };
    }

    if (channel.includes('.depth')) {
      const symbol = channel.split('.')[1].toUpperCase();
      return {
        type: 'orderbook',
        data: {
          symbol: `${symbol.slice(0, -4)}/${symbol.slice(-4)}`,
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
      const symbol = channel.split('.')[1].toUpperCase();
      const trades = tick.data || [];
      
      return {
        type: 'trade',
        data: trades.map((trade: any) => ({
          symbol: `${symbol.slice(0, -4)}/${symbol.slice(-4)}`,
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
