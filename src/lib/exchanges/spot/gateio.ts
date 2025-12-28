/**
 * 🟢 Gate.io Spot Exchange Integration
 * REST API + WebSocket configuration
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.gateio({
    enableRateLimit: false,
    timeout: 10000,
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'gateio',
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
  const exchange = new ccxt.gateio({
    enableRateLimit: false,
    timeout: 10000,
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'gateio',
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
  const exchange = new ccxt.gateio({
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
  const exchange = new ccxt.gateio({
    enableRateLimit: false,
    timeout: 10000,
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'gateio',
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
  const exchange = new ccxt.gateio({
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
  url: 'wss://api.gateio.ws/ws/v4/',
  
  subscribe: (channel: string, symbol: string) => {
    const [base, quote] = symbol.split('/');
    const gateSymbol = `${base}_${quote}`;
    
    return JSON.stringify({
      time: Math.floor(Date.now() / 1000),
      channel,
      event: 'subscribe',
      payload: [gateSymbol],
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    const [base, quote] = symbol.split('/');
    const gateSymbol = `${base}_${quote}`;
    
    return JSON.stringify({
      time: Math.floor(Date.now() / 1000),
      channel,
      event: 'unsubscribe',
      payload: [gateSymbol],
    });
  },

  channels: {
    ticker: 'spot.tickers',
    orderbook: 'spot.order_book',
    trades: 'spot.trades',
  },

  parseMessage: (data: any) => {
    if (!data || !data.channel) return null;

    const channel = data.channel;
    const event = data.event;

    if (event === 'subscribe' || event === 'unsubscribe') {
      return null;
    }

    if (channel === 'spot.tickers') {
      const ticker = data.result;
      return {
        type: 'ticker',
        data: {
          symbol: ticker.currency_pair?.replace('_', '/'),
          last: parseFloat(ticker.last),
          bid: parseFloat(ticker.highest_bid),
          ask: parseFloat(ticker.lowest_ask),
          high: parseFloat(ticker.high_24h),
          low: parseFloat(ticker.low_24h),
          volume: parseFloat(ticker.base_volume),
          quoteVolume: parseFloat(ticker.quote_volume),
          change: parseFloat(ticker.change_percentage),
          timestamp: Date.now(),
        },
      };
    }

    if (channel === 'spot.order_book') {
      const orderbook = data.result;
      return {
        type: 'orderbook',
        data: {
          symbol: orderbook.s?.replace('_', '/'),
          bids: orderbook.bids?.map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })),
          asks: orderbook.asks?.map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })),
          timestamp: orderbook.t * 1000,
        },
      };
    }

    if (channel === 'spot.trades') {
      const trade = data.result;
      return {
        type: 'trade',
        data: {
          symbol: trade.currency_pair?.replace('_', '/'),
          side: trade.side,
          price: parseFloat(trade.price),
          amount: parseFloat(trade.amount),
          timestamp: trade.create_time * 1000,
        },
      };
    }

    return null;
  },
};
