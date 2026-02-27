/**
 * 🌐 Exchange Types - Unified definitions
 */

export type ExchangeId = 
  | 'binance' | 'bybit' | 'okx' | 'coinbase' | 'kraken' 
  | 'kucoin' | 'mexc' | 'gateio' | 'bitget' | 'htx' 
  | 'cryptocom' | 'bingx' | 'phemex' | 'pionex' 
  | 'bitmart' | 'coinex' | 'digifinex' | 'gemini' | 'bitstamp' | 'bitfinex' | 'tapbit';

export interface Ticker {
  symbol: string;
  last: number;
  high?: number;
  low?: number;
  volume?: number;
  change24h?: number;
  timestamp: number;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: number;
}
