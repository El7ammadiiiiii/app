/**
 * 🔷 Exchange Integration Types
 * Unified TypeScript interfaces for all exchange data
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 Exchange Types
// ═══════════════════════════════════════════════════════════════════════════

export type ExchangeId =
  // Top 5
  | 'binance'
  | 'binance-usdm'
  | 'binance-coinm'
  | 'bybit'
  | 'bybit-linear'
  | 'okx'
  | 'okx-swap'
  | 'bitget'
  | 'bitget-futures'
  | 'kucoin'
  | 'kucoin-futures'
  // Global Tier 2
  | 'gateio'
  | 'gateio-futures'
  | 'bingx'
  | 'bingx-futures'
  | 'htx'
  | 'htx-futures'
  | 'mexc'
  | 'mexc-futures'
  | 'woo'
  | 'woo-futures'
  | 'kraken'
  | 'kraken-futures'
  // Regulated US Exchanges
  | 'cryptocom'
  | 'coinbase'
  | 'gemini';

export type MarketType = 'spot' | 'swap' | 'future' | 'option';
export type Region = 'global' | 'us';

export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  ccxtId: string;
  marketType: MarketType;
  region: Region;
  rateLimit: number; // requests per second
  websocketUrl?: string;
  restUrl?: string;
  features: {
    orderBook: boolean;
    ticker: boolean;
    ohlcv: boolean;
    trades: boolean;
    funding?: boolean; // for perpetual swaps
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 Market Data Types
// ═══════════════════════════════════════════════════════════════════════════

export interface Ticker {
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  datetime: string;
  high: number | null;
  low: number | null;
  bid: number | null;
  bidVolume: number | null;
  ask: number | null;
  askVolume: number | null;
  vwap: number | null;
  open: number | null;
  close: number | null;
  last: number | null;
  previousClose: number | null;
  change: number | null;
  percentage: number | null;
  average: number | null;
  baseVolume: number | null;
  quoteVolume: number | null;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total?: number; // cumulative
}

export interface OrderBook {
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  datetime: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  nonce?: number;
}

export interface AggregatedOrderBook {
  symbol: string;
  timestamp: number;
  exchanges: ExchangeId[];
  bids: (OrderBookLevel & { exchange: ExchangeId })[];
  asks: (OrderBookLevel & { exchange: ExchangeId })[];
  totalBidVolume: number;
  totalAskVolume: number;
  weightedMidPrice: number;
  spread: number;
  spreadPercentage: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  datetime: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  cost: number;
}

export interface FundingRate {
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  datetime: string;
  fundingRate: number;
  fundingTimestamp: number;
  nextFundingTimestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Cache Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

export interface CacheConfig {
  ticker: number; // 1 second
  orderbook: number; // 500ms
  ohlcv: number; // 5 seconds
  trades: number; // 1 second
  funding: number; // 60 seconds
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 Rate Limiter Types
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitConfig {
  requestsPerSecond: number;
  burst?: number; // max burst requests
}

export interface QueuedRequest<T> {
  key: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: number; // 0 = high, 1 = normal, 2 = low
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 WebSocket Types
// ═══════════════════════════════════════════════════════════════════════════

export type WebSocketChannel = 'ticker' | 'orderbook' | 'trades' | 'funding';

export interface WebSocketSubscription {
  exchange: ExchangeId;
  channel: WebSocketChannel;
  symbol: string;
  callback: (data: any) => void;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  channel?: WebSocketChannel;
  symbol?: string;
  data?: any;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📡 API Response Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  cached?: boolean;
  source?: ExchangeId;
}

export interface MultiExchangeResponse<T> {
  success: boolean;
  results: {
    exchange: ExchangeId;
    data?: T;
    error?: string;
  }[];
  timestamp: number;
}
