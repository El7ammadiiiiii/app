/**
 * 🔵 MEXC Futures Exchange Integration
 * REST API + WebSocket configuration for perpetual contracts
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade, FundingRate } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.mexc({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'mexc-futures',
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
  const exchange = new ccxt.mexc({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'mexc-futures',
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
  const exchange = new ccxt.mexc({
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
  const exchange = new ccxt.mexc({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'mexc-futures',
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
  const exchange = new ccxt.mexc({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const funding = await exchange.fetchFundingRate(symbol);

  return {
    exchange: 'mexc-futures',
    symbol,
    timestamp: funding.timestamp || Date.now(),
    datetime: funding.datetime || new Date().toISOString(),
    fundingRate: funding.fundingRate ?? 0,
    fundingTimestamp: funding.fundingTimestamp ?? Date.now(),
    nextFundingTimestamp: funding.nextFundingTimestamp,
  };
}

export async function getMarkets(): Promise<string[]> {
  const exchange = new ccxt.mexc({
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
  url: 'wss://contract.mexc.com/ws',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      method: 'sub.ticker',
      param: {
        symbol,
      },
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      method: 'unsub.ticker',
      param: {
        symbol,
      },
    });
  },

  channels: {
    ticker: 'ticker',
    orderbook: 'depth',
    trades: 'deal',
  },

  parseMessage: (data: any) => {
    if (!data || !data.channel) return null;

    const channel = data.channel;
    const d = data.data;

    if (channel.includes('ticker')) {
      return {
        type: 'ticker',
        data: {
          symbol: d.symbol,
          last: parseFloat(d.lastPrice),
          bid: parseFloat(d.bid1),
          ask: parseFloat(d.ask1),
          high: parseFloat(d.high24Price),
          low: parseFloat(d.low24Price),
          volume: parseFloat(d.volume24),
          change: parseFloat(d.riseFallRate),
          fundingRate: parseFloat(d.fundingRate),
          timestamp: d.timestamp,
        },
      };
    }

    if (channel.includes('depth')) {
      return {
        type: 'orderbook',
        data: {
          symbol: d.symbol,
          bids: d.bids?.map((b: any) => ({
            price: parseFloat(b.price),
            amount: parseFloat(b.vol),
          })),
          asks: d.asks?.map((a: any) => ({
            price: parseFloat(a.price),
            amount: parseFloat(a.vol),
          })),
          timestamp: d.timestamp,
        },
      };
    }

    if (channel.includes('deal')) {
      return {
        type: 'trade',
        data: {
          symbol: d.symbol,
          side: d.takerSide === 1 ? 'buy' : 'sell',
          price: parseFloat(d.price),
          amount: parseFloat(d.vol),
          timestamp: d.timestamp,
        },
      };
    }

    return null;
  },
};
