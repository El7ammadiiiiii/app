/**
 * 🔷 Exchange Configuration
 * All exchange metadata and settings
 */

import type { ExchangeConfig, ExchangeId } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 Exchange Configurations
// ═══════════════════════════════════════════════════════════════════════════

export const EXCHANGE_CONFIGS: Record<ExchangeId, ExchangeConfig> = {
  // ─────────────────────────────────────────────────────────────────────────
  // 🥇 Top 5 Exchanges
  // ─────────────────────────────────────────────────────────────────────────
  'binance': {
    id: 'binance',
    name: 'Binance',
    ccxtId: 'binance',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10, // 10 req/sec
    websocketUrl: 'wss://stream.binance.com:9443/ws',
    restUrl: 'https://api.binance.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'binance-usdm': {
    id: 'binance-usdm',
    name: 'Binance USDⓈ-M Futures',
    ccxtId: 'binanceusdm',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://fstream.binance.com/ws',
    restUrl: 'https://fapi.binance.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'binance-coinm': {
    id: 'binance-coinm',
    name: 'Binance COIN-M Futures',
    ccxtId: 'binancecoinm',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://dstream.binance.com/ws',
    restUrl: 'https://dapi.binance.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'bybit': {
    id: 'bybit',
    name: 'Bybit',
    ccxtId: 'bybit',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://stream.bybit.com/v5/public/spot',
    restUrl: 'https://api.bybit.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'bybit-linear': {
    id: 'bybit-linear',
    name: 'Bybit Linear (USDT)',
    ccxtId: 'bybit',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://stream.bybit.com/v5/public/linear',
    restUrl: 'https://api.bybit.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'okx': {
    id: 'okx',
    name: 'OKX',
    ccxtId: 'okx',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    restUrl: 'https://www.okx.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'okx-swap': {
    id: 'okx-swap',
    name: 'OKX Perpetual Swap',
    ccxtId: 'okx',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    restUrl: 'https://www.okx.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'bitget': {
    id: 'bitget',
    name: 'Bitget',
    ccxtId: 'bitget',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://ws.bitget.com/spot/v1/stream',
    restUrl: 'https://api.bitget.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'bitget-futures': {
    id: 'bitget-futures',
    name: 'Bitget Futures',
    ccxtId: 'bitget',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://ws.bitget.com/mix/v1/stream',
    restUrl: 'https://api.bitget.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'kucoin': {
    id: 'kucoin',
    name: 'KuCoin',
    ccxtId: 'kucoin',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://ws-api-spot.kucoin.com',
    restUrl: 'https://api.kucoin.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'kucoin-futures': {
    id: 'kucoin-futures',
    name: 'KuCoin Futures',
    ccxtId: 'kucoinfutures',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://ws-api-futures.kucoin.com',
    restUrl: 'https://api-futures.kucoin.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // � Global Tier 2 Exchanges
  // ─────────────────────────────────────────────────────────────────────────
  'gateio': {
    id: 'gateio',
    name: 'Gate.io',
    ccxtId: 'gateio',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://api.gateio.ws/ws/v4/',
    restUrl: 'https://api.gateio.ws',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'gateio-futures': {
    id: 'gateio-futures',
    name: 'Gate.io Futures',
    ccxtId: 'gateio',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://fx-ws.gateio.ws/v4/ws/usdt',
    restUrl: 'https://api.gateio.ws',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'bingx': {
    id: 'bingx',
    name: 'BingX',
    ccxtId: 'bingx',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://open-api-ws.bingx.com/market',
    restUrl: 'https://open-api.bingx.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'bingx-futures': {
    id: 'bingx-futures',
    name: 'BingX Futures',
    ccxtId: 'bingx',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://open-api-swap.bingx.com/swap-market',
    restUrl: 'https://open-api.bingx.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'htx': {
    id: 'htx',
    name: 'HTX (Huobi)',
    ccxtId: 'htx',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://api.huobi.pro/ws',
    restUrl: 'https://api.huobi.pro',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'htx-futures': {
    id: 'htx-futures',
    name: 'HTX Futures',
    ccxtId: 'htx',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://api.hbdm.com/linear-swap-ws',
    restUrl: 'https://api.hbdm.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'mexc': {
    id: 'mexc',
    name: 'MEXC',
    ccxtId: 'mexc',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://wbs.mexc.com/ws',
    restUrl: 'https://api.mexc.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'mexc-futures': {
    id: 'mexc-futures',
    name: 'MEXC Futures',
    ccxtId: 'mexc',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://contract.mexc.com/ws',
    restUrl: 'https://contract.mexc.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'woo': {
    id: 'woo',
    name: 'WOO X',
    ccxtId: 'woo',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://wss.woo.org/ws/stream',
    restUrl: 'https://api.woo.org',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'woo-futures': {
    id: 'woo-futures',
    name: 'WOO X Futures',
    ccxtId: 'woo',
    marketType: 'swap',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://wss.woo.org/ws/stream',
    restUrl: 'https://api.woo.org',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },
  'kraken': {
    id: 'kraken',
    name: 'Kraken',
    ccxtId: 'kraken',
    marketType: 'spot',
    region: 'global',
    rateLimit: 3,
    websocketUrl: 'wss://ws.kraken.com',
    restUrl: 'https://api.kraken.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'kraken-futures': {
    id: 'kraken-futures',
    name: 'Kraken Futures',
    ccxtId: 'kraken',
    marketType: 'swap',
    region: 'global',
    rateLimit: 3,
    websocketUrl: 'wss://futures.kraken.com/ws/v1',
    restUrl: 'https://futures.kraken.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
      funding: true,
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🇺🇸 US Regulated Exchanges
  // ─────────────────────────────────────────────────────────────────────────
  'cryptocom': {
    id: 'cryptocom',
    name: 'Crypto.com',
    ccxtId: 'cryptocom',
    marketType: 'spot',
    region: 'global',
    rateLimit: 10,
    websocketUrl: 'wss://stream.crypto.com/v2/market',
    restUrl: 'https://api.crypto.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'coinbase': {
    id: 'coinbase',
    name: 'Coinbase',
    ccxtId: 'coinbase',
    marketType: 'spot',
    region: 'us',
    rateLimit: 3,
    websocketUrl: 'wss://ws-feed.exchange.coinbase.com',
    restUrl: 'https://api.exchange.coinbase.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
  'gemini': {
    id: 'gemini',
    name: 'Gemini',
    ccxtId: 'gemini',
    marketType: 'spot',
    region: 'us',
    rateLimit: 1,
    websocketUrl: 'wss://api.gemini.com/v1/marketdata',
    restUrl: 'https://api.gemini.com',
    features: {
      orderBook: true,
      ticker: true,
      ohlcv: true,
      trades: true,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

export function getExchangeConfig(id: ExchangeId): ExchangeConfig {
  return EXCHANGE_CONFIGS[id];
}

export function getAllExchanges(): ExchangeConfig[] {
  return Object.values(EXCHANGE_CONFIGS);
}

export function getExchangesByType(type: 'spot' | 'futures'): ExchangeConfig[] {
  return Object.values(EXCHANGE_CONFIGS).filter((config) => {
    if (type === 'spot') return config.marketType === 'spot';
    return config.marketType === 'swap' || config.marketType === 'future';
  });
}

export function getExchangesByRegion(region: 'global' | 'us'): ExchangeConfig[] {
  return Object.values(EXCHANGE_CONFIGS).filter(
    (config) => config.region === region
  );
}

export function getTopExchanges(): ExchangeConfig[] {
  const topIds: ExchangeId[] = [
    'binance',
    'binance-usdm',
    'binance-coinm',
    'bybit',
    'bybit-linear',
    'okx',
    'okx-swap',
    'bitget',
    'bitget-futures',
    'kucoin',
    'kucoin-futures',
    'gateio',
    'gateio-futures',
    'bingx',
    'bingx-futures',
    'htx',
    'htx-futures',
    'mexc',
    'mexc-futures',
    'woo',
    'woo-futures',
    'kraken',
    'kraken-futures',
  ];
  return topIds.map((id) => EXCHANGE_CONFIGS[id]);
}


