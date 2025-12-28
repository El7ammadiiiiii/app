/**
 * 🌐 Exchange Integration - Main Export
 * Centralized access to all exchange integrations
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🔷 Core Infrastructure
// ═══════════════════════════════════════════════════════════════════════════

export * from './types';
export * from './config';
export { cache, buildCacheKey } from './cache';
export { rateLimiter, Priority } from './rate-limiter';
export { ccxtManager } from './ccxt-manager';
export { aggregator } from './aggregator';

// ═══════════════════════════════════════════════════════════════════════════
// 🟡 Binance
// ═══════════════════════════════════════════════════════════════════════════

export { binanceSpot, binanceSpotWebSocket } from './spot/binance';
export { binanceUsdm, binanceUsdmWebSocket } from './futures/binance-usdm';

// ═══════════════════════════════════════════════════════════════════════════
// 🟢 Bybit
// ═══════════════════════════════════════════════════════════════════════════

export { bybitSpot, bybitSpotWebSocket } from './spot/bybit';
export { bybitLinear, bybitLinearWebSocket } from './futures/bybit-linear';

// ═══════════════════════════════════════════════════════════════════════════
// 🔵 OKX
// ═══════════════════════════════════════════════════════════════════════════

export { okxSpot, okxSpotWebSocket } from './spot/okx';
export { okxSwap, okxSwapWebSocket } from './futures/okx-swap';

// ═══════════════════════════════════════════════════════════════════════════
// 🟣 Bitget
// ═══════════════════════════════════════════════════════════════════════════

export { bitgetSpot, bitgetSpotWebSocket } from './spot/bitget';
export { bitgetFutures, bitgetFuturesWebSocket } from './futures/bitget-futures';

// ═══════════════════════════════════════════════════════════════════════════
// 🟢 KuCoin
// ═══════════════════════════════════════════════════════════════════════════

export { kucoinSpot, kucoinSpotWebSocket } from './spot/kucoin';
export { kucoinFutures, kucoinFuturesWebSocket } from './futures/kucoin-futures';
