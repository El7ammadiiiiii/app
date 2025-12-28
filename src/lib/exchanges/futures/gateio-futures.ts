/**
 * 🔵 Gate.io Futures Exchange Integration
 * REST API + WebSocket configuration for perpetual contracts
 */

import ccxt from 'ccxt';
import type { Ticker, OrderBook, OHLCV, Trade, FundingRate } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 REST API Methods
// ═══════════════════════════════════════════════════════════════════════════

export async function getTicker(symbol: string): Promise<Ticker> {
  const exchange = new ccxt.gateio({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const ticker = await exchange.fetchTicker(symbol);

  return {
    exchange: 'gateio-futures',
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
    options: {
      defaultType: 'swap',
    },
  });

  const orderbook = await exchange.fetchOrderBook(symbol, limit);

  return {
    exchange: 'gateio-futures',
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
  const exchange = new ccxt.gateio({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const trades = await exchange.fetchTrades(symbol, since, limit);

  return trades.map((trade) => ({
    id: trade.id || '',
    exchange: 'gateio-futures',
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
  const exchange = new ccxt.gateio({
    enableRateLimit: false,
    timeout: 10000,
    options: {
      defaultType: 'swap',
    },
  });

  const funding = await exchange.fetchFundingRate(symbol);

  return {
    exchange: 'gateio-futures',
    symbol,
    timestamp: funding.timestamp || Date.now(),
    datetime: funding.datetime || new Date().toISOString(),
    fundingRate: funding.fundingRate ?? 0,
    fundingTimestamp: funding.fundingTimestamp ?? Date.now(),
    nextFundingTimestamp: funding.nextFundingTimestamp,
  };
}

export async function getMarkets(): Promise<string[]> {
  const exchange = new ccxt.gateio({
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
  url: 'wss://fx-ws.gateio.ws/v4/ws/usdt',
  
  subscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      time: Math.floor(Date.now() / 1000),
      channel,
      event: 'subscribe',
      payload: [symbol],
    });
  },

  unsubscribe: (channel: string, symbol: string) => {
    return JSON.stringify({
      time: Math.floor(Date.now() / 1000),
      channel,
      event: 'unsubscribe',
      payload: [symbol],
    });
  },

  channels: {
    ticker: 'futures.tickers',
    orderbook: 'futures.order_book',
    trades: 'futures.trades',
  },

  parseMessage: (data: any) => {
    if (!data || !data.channel) return null;

    const channel = data.channel;
    const event = data.event;

    if (event === 'subscribe' || event === 'unsubscribe') {
      return null;
    }

    if (channel === 'futures.tickers') {
      const ticker = data.result?.[0];
      if (!ticker) return null;
      
      return {
        type: 'ticker',
        data: {
          symbol: ticker.contract,
          last: parseFloat(ticker.last),
          high: parseFloat(ticker.high_24h),
          low: parseFloat(ticker.low_24h),
          volume: parseFloat(ticker.volume_24h),
          change: parseFloat(ticker.change_percentage),
          fundingRate: parseFloat(ticker.funding_rate),
          timestamp: Date.now(),
        },
      };
    }

    if (channel === 'futures.order_book') {
      const orderbook = data.result;
      return {
        type: 'orderbook',
        data: {
          symbol: orderbook.contract,
          bids: orderbook.bids?.map((b: any) => ({
            price: parseFloat(b.p),
            amount: parseFloat(b.s),
          })),
          asks: orderbook.asks?.map((a: any) => ({
            price: parseFloat(a.p),
            amount: parseFloat(a.s),
          })),
          timestamp: orderbook.t * 1000,
        },
      };
    }

    if (channel === 'futures.trades') {
      const trade = data.result?.[0];
      if (!trade) return null;
      
      return {
        type: 'trade',
        data: {
          symbol: trade.contract,
          side: trade.size > 0 ? 'buy' : 'sell',
          price: parseFloat(trade.price),
          amount: Math.abs(parseFloat(trade.size)),
          timestamp: trade.create_time * 1000,
        },
      };
    }

    return null;
  },
};
