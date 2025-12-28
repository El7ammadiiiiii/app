# 🌐 CCXT Exchange Integration System

Complete integration system for 20+ cryptocurrency exchanges using CCXT library with Next.js 16, TypeScript, and free WebSocket support.

## 📋 Table of Contents

- [Features](#features)
- [Supported Exchanges](#supported-exchanges)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
  - [API Routes](#api-routes)
  - [React Hooks](#react-hooks)
  - [Direct Usage](#direct-usage)
  - [WebSocket](#websocket)
- [Examples](#examples)
- [Performance](#performance)
- [Roadmap](#roadmap)

## ✨ Features

- 🚀 **20+ Exchanges** - Binance, Bybit, OKX, Bitget, KuCoin, Gate.io, and more
- 📊 **Multiple Data Types** - Ticker, OrderBook, OHLCV, Trades, Funding Rates
- ⚡ **Smart Rate Limiting** - Background queue + cached responses (no blocking)
- 🔄 **In-Memory Cache** - Ultra-fast with automatic TTL management
- 🔌 **Free WebSocket** - Real-time updates without CCXT Pro
- 🔗 **Aggregated OrderBook** - Merge order books from multiple exchanges
- 🎯 **Priority Queue** - HIGH/NORMAL/LOW priority for API calls
- 🎣 **React Hooks** - Ready-to-use hooks for Next.js components
- 🏪 **Zustand Store** - Global state management for real-time data
- 📡 **REST API Routes** - Next.js API endpoints for all data types

## 🏢 Supported Exchanges

### ✅ Fully Integrated (Top 5)

| Exchange | Spot | Futures | WebSocket | Funding Rate |
|----------|------|---------|-----------|--------------|
| **Binance** | ✅ | ✅ USDⓈ-M | ✅ | ✅ |
| **Bybit** | ✅ | ✅ Linear | ✅ | ✅ |
| **OKX** | ✅ | ✅ Swap | ✅ | ✅ |
| **Bitget** | ✅ | ✅ USDT | ✅ | ✅ |
| **KuCoin** | ✅ | ✅ Perpetual | ✅ | ✅ |

### 🔜 Supported (via CCXT - WebSocket pending)

Gate.io, BingX, HTX, MEXC, WOO, Kraken, Crypto.com, Binance US, OKX US, Coinbase, Gemini, Bullish, and more...

## 🏗️ Architecture

```
nexus-webapp/src/
├── lib/exchanges/
│   ├── types.ts              # TypeScript interfaces
│   ├── config.ts             # Exchange configurations (27 exchanges)
│   ├── cache.ts              # In-Memory cache with TTL
│   ├── rate-limiter.ts       # Smart rate limiting queue
│   ├── ccxt-manager.ts       # CCXT unified manager
│   ├── aggregator.ts         # Multi-exchange orderbook merger
│   ├── spot/                 # Spot exchange integrations
│   │   ├── binance.ts
│   │   ├── bybit.ts
│   │   ├── okx.ts
│   │   ├── bitget.ts
│   │   └── kucoin.ts
│   ├── futures/              # Futures exchange integrations
│   │   ├── binance-usdm.ts
│   │   ├── bybit-linear.ts
│   │   ├── okx-swap.ts
│   │   ├── bitget-futures.ts
│   │   └── kucoin-futures.ts
│   └── index.ts              # Main export
│
├── app/api/exchanges/        # Next.js API Routes
│   ├── ticker/route.ts
│   ├── orderbook/route.ts
│   ├── ohlcv/route.ts
│   ├── trades/route.ts
│   ├── markets/route.ts
│   └── aggregated/route.ts
│
├── hooks/
│   └── useExchangeData.ts    # React hooks (useTicker, useOrderBook, etc.)
│
└── stores/
    └── exchangeStore.ts      # Zustand global state
```

## 📦 Installation

```bash
# Install dependencies
npm install ccxt zustand

# Or with yarn
yarn add ccxt zustand
```

## 🚀 Usage

### 1️⃣ API Routes

#### Get Ticker
```typescript
GET /api/exchanges/ticker?exchange=binance&symbol=BTC/USDT&priority=high

Response:
{
  "success": true,
  "data": {
    "exchange": "binance",
    "symbol": "BTC/USDT",
    "last": 95234.50,
    "bid": 95234.00,
    "ask": 95234.50,
    "high": 96500.00,
    "low": 94000.00,
    "volume": 123456.78,
    ...
  },
  "timestamp": 1735000000000,
  "cached": false
}
```

#### Get Order Book
```typescript
GET /api/exchanges/orderbook?exchange=binance&symbol=BTC/USDT&limit=50

Response:
{
  "success": true,
  "data": {
    "exchange": "binance",
    "symbol": "BTC/USDT",
    "bids": [
      { "price": 95234.00, "amount": 1.234 },
      { "price": 95233.50, "amount": 2.456 },
      ...
    ],
    "asks": [
      { "price": 95234.50, "amount": 0.987 },
      { "price": 95235.00, "amount": 1.543 },
      ...
    ],
    "timestamp": 1735000000000
  }
}
```

#### Get Aggregated Order Book (Multiple Exchanges)
```typescript
GET /api/exchanges/aggregated?exchanges=binance,bybit,okx&symbol=BTC/USDT&limit=100

Response:
{
  "success": true,
  "data": {
    "symbol": "BTC/USDT",
    "bids": [...],  // Merged from all exchanges
    "asks": [...],
    "exchanges": ["binance", "bybit", "okx"],
    "spread": 0.50,
    "spreadPercent": 0.0005,
    "timestamp": 1735000000000
  }
}
```

### 2️⃣ React Hooks

```typescript
'use client';

import { useTicker, useOrderBook, useOHLCV, useTrades } from '@/hooks/useExchangeData';

export default function TradingView() {
  // Auto-refresh every 1 second
  const { data: ticker, loading, error, cached } = useTicker({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    refreshInterval: 1000,
  });

  // Auto-refresh every 500ms
  const { data: orderBook } = useOrderBook({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    limit: 50,
    refreshInterval: 500,
  });

  // Get OHLCV candles
  const { data: candles } = useOHLCV({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    limit: 100,
    refreshInterval: 5000,
  });

  // Get recent trades
  const { data: trades } = useTrades({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    limit: 50,
    refreshInterval: 1000,
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>BTC/USDT - ${ticker?.last.toFixed(2)}</h1>
      <p>Volume: {ticker?.volume}</p>
      <p>Cached: {cached ? 'Yes' : 'No'}</p>
      
      <h2>Order Book</h2>
      <div>
        <h3>Bids</h3>
        {orderBook?.bids.slice(0, 10).map((bid, i) => (
          <div key={i}>
            {bid.price.toFixed(2)} - {bid.amount.toFixed(4)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3️⃣ Direct Usage (Server-side or API Routes)

```typescript
import { ccxtManager, aggregator, Priority } from '@/lib/exchanges';

// Get ticker with HIGH priority
const ticker = await ccxtManager.fetchTicker('binance', 'BTC/USDT', Priority.HIGH);

// Get order book
const orderBook = await ccxtManager.fetchOrderBook('bybit', 'ETH/USDT', 100);

// Get OHLCV candles
const candles = await ccxtManager.fetchOHLCV('okx', 'BTC/USDT', '1h', undefined, 100);

// Get trades
const trades = await ccxtManager.fetchTrades('bitget', 'BTC/USDT', undefined, 50);

// Get funding rate (futures only)
const funding = await ccxtManager.fetchFundingRate('binance-usdm', 'BTC/USDT:USDT');

// Get aggregated order book from multiple exchanges
const aggregated = await aggregator.getAggregatedOrderBook(
  ['binance', 'bybit', 'okx'],
  'BTC/USDT',
  100
);

// Detect arbitrage opportunities
const bestPrices = await aggregator.getBestPrices(
  ['binance', 'bybit', 'okx'],
  'BTC/USDT'
);

if (bestPrices.success && bestPrices.data) {
  console.log('Best Bid:', bestPrices.data.bestBid);
  console.log('Best Ask:', bestPrices.data.bestAsk);
  console.log('Arbitrage Opportunity:', bestPrices.data.arbitrageOpportunity, '%');
}
```

### 4️⃣ WebSocket (Real-time Updates)

```typescript
'use client';

import { useEffect } from 'react';
import { useExchangeStore, useTicker, useOrderBook } from '@/stores/exchangeStore';
import { binanceSpotWebSocket } from '@/lib/exchanges';

export default function RealTimeData() {
  const store = useExchangeStore();
  const ticker = useTicker('binance', 'BTC/USDT');
  const orderBook = useOrderBook('binance', 'BTC/USDT');

  useEffect(() => {
    // Connect to Binance WebSocket
    const url = binanceSpotWebSocket.tickerStream('BTC/USDT');
    store.connectWebSocket('binance', url);

    // Subscribe to ticker channel
    store.subscribeToChannel('binance', 'ticker');

    return () => {
      store.disconnectWebSocket('binance');
    };
  }, []);

  return (
    <div>
      <h1>Real-time Price: ${ticker?.price}</h1>
      <p>Volume: {ticker?.volume}</p>
    </div>
  );
}
```

## 📊 Examples

### Example 1: Multi-Exchange Price Comparison

```typescript
const exchanges = ['binance', 'bybit', 'okx', 'bitget', 'kucoin'];
const symbol = 'BTC/USDT';

const prices = await Promise.all(
  exchanges.map(async (exchange) => {
    const result = await ccxtManager.fetchTicker(exchange as ExchangeId, symbol);
    return {
      exchange,
      price: result.data?.last || 0,
    };
  })
);

// Sort by price
prices.sort((a, b) => a.price - b.price);

console.log('Lowest:', prices[0]);
console.log('Highest:', prices[prices.length - 1]);
```

### Example 2: Order Book Depth Analysis

```typescript
const orderBook = await ccxtManager.fetchOrderBook('binance', 'BTC/USDT', 100);

if (orderBook.success && orderBook.data) {
  const imbalance = aggregator.getOrderBookImbalance(orderBook.data, 10);
  
  console.log('Bid Volume:', imbalance.bidVolume);
  console.log('Ask Volume:', imbalance.askVolume);
  console.log('Imbalance:', imbalance.imbalance); // -1 to 1
  
  if (imbalance.imbalance > 0.3) {
    console.log('Strong buy pressure detected!');
  }
}
```

## ⚡ Performance

### Cache TTL Settings

| Data Type | TTL | Refresh Interval |
|-----------|-----|------------------|
| Ticker | 1s | Every 1s |
| OrderBook | 500ms | Every 500ms |
| OHLCV | 5s | Every 5s |
| Trades | 1s | Every 1s |
| Funding Rate | 60s | Every 60s |

### Rate Limiting

- **Token Bucket Algorithm** - Smooth distribution of requests
- **Priority Queue** - HIGH > NORMAL > LOW
- **Background Refresh** - Returns cached data instantly, refreshes in background
- **Per-Exchange Limits** - Configurable per exchange

### Smart Caching

```typescript
// First call: Fetches from API (200ms)
const result1 = await ccxtManager.fetchTicker('binance', 'BTC/USDT');
console.log(result1.cached); // false

// Second call within TTL: Returns from cache (1ms)
const result2 = await ccxtManager.fetchTicker('binance', 'BTC/USDT');
console.log(result2.cached); // true
```

## 🗺️ Roadmap

### Phase 1: Core Infrastructure ✅
- [x] TypeScript types
- [x] Exchange configurations
- [x] In-Memory cache
- [x] Rate limiter
- [x] CCXT manager
- [x] Order book aggregator

### Phase 2: Top 5 Exchanges ✅
- [x] Binance (Spot + USDⓈ-M Futures)
- [x] Bybit (Spot + Linear Futures)
- [x] OKX (Spot + Swap)
- [x] Bitget (Spot + Futures)
- [x] KuCoin (Spot + Futures)

### Phase 3: API Routes ✅
- [x] Ticker endpoint
- [x] Order book endpoint
- [x] OHLCV endpoint
- [x] Trades endpoint
- [x] Markets endpoint
- [x] Aggregated endpoint

### Phase 4: React Integration ✅
- [x] React hooks (useTicker, useOrderBook, etc.)
- [x] Zustand store
- [x] WebSocket support

### Phase 5: Additional Exchanges 🔜
- [ ] Gate.io
- [ ] BingX
- [ ] HTX (Huobi)
- [ ] MEXC
- [ ] WOO
- [ ] Kraken
- [ ] Crypto.com
- [ ] US Exchanges (Binance US, OKX US, Coinbase, Gemini)

### Phase 6: Advanced Features 🔜
- [ ] WebSocket auto-reconnect
- [ ] Historical data export
- [ ] Advanced analytics (volatility, momentum, etc.)
- [ ] Multi-timeframe analysis
- [ ] Trading signals
- [ ] Portfolio tracking

## 📚 Resources

- [CCXT Documentation](https://docs.ccxt.com/)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Binance WebSocket API](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
- [Bybit WebSocket API](https://bybit-exchange.github.io/docs/v5/ws/connect)
- [OKX WebSocket API](https://www.okx.com/docs-v5/en/#websocket-api)

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ using Next.js 16 + CCXT + TypeScript**
