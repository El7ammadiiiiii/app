/**
 * 🧪 CCXT Integration - Test Suite
 * Test all exchange integrations and features
 */

import { ccxtManager, aggregator, Priority } from '@/lib/exchanges';
import type { ExchangeId } from '@/lib/exchanges/types';

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test Configuration
// ═══════════════════════════════════════════════════════════════════════════

const TEST_EXCHANGES: ExchangeId[] = [
  'binance',
  'binance-usdm',
  'bybit',
  'bybit-linear',
  'okx',
  'okx-swap',
  'bitget',
  'bitget-futures',
  'kucoin',
  'kucoin-futures',
];

const TEST_SYMBOL = 'BTC/USDT';

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 1: Ticker Fetch
// ═══════════════════════════════════════════════════════════════════════════

export async function testTickerFetch() {
  console.log('\n🧪 Test 1: Ticker Fetch');
  console.log('═'.repeat(50));

  for (const exchange of TEST_EXCHANGES) {
    try {
      const start = Date.now();
      const result = await ccxtManager.fetchTicker(exchange, TEST_SYMBOL, Priority.HIGH);
      const duration = Date.now() - start;

      if (result.success && result.data) {
        console.log(`✅ ${exchange.padEnd(20)} - $${result.data.last?.toFixed(2)} (${duration}ms) ${result.cached ? '📦' : '🌐'}`);
      } else {
        console.log(`❌ ${exchange.padEnd(20)} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${exchange.padEnd(20)} - Exception: ${(error as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 2: Order Book Fetch
// ═══════════════════════════════════════════════════════════════════════════

export async function testOrderBookFetch() {
  console.log('\n🧪 Test 2: Order Book Fetch');
  console.log('═'.repeat(50));

  for (const exchange of TEST_EXCHANGES) {
    try {
      const start = Date.now();
      const result = await ccxtManager.fetchOrderBook(exchange, TEST_SYMBOL, 10, Priority.HIGH);
      const duration = Date.now() - start;

      if (result.success && result.data) {
        const bestBid = result.data.bids[0]?.price || 0;
        const bestAsk = result.data.asks[0]?.price || 0;
        const spread = bestAsk - bestBid;

        console.log(
          `✅ ${exchange.padEnd(20)} - Bid: $${bestBid.toFixed(2)}, Ask: $${bestAsk.toFixed(2)}, Spread: $${spread.toFixed(2)} (${duration}ms)`
        );
      } else {
        console.log(`❌ ${exchange.padEnd(20)} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${exchange.padEnd(20)} - Exception: ${(error as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 3: OHLCV Fetch
// ═══════════════════════════════════════════════════════════════════════════

export async function testOHLCVFetch() {
  console.log('\n🧪 Test 3: OHLCV Fetch');
  console.log('═'.repeat(50));

  for (const exchange of TEST_EXCHANGES) {
    try {
      const start = Date.now();
      const result = await ccxtManager.fetchOHLCV(exchange, TEST_SYMBOL, '1h', undefined, 10, Priority.NORMAL);
      const duration = Date.now() - start;

      if (result.success && result.data) {
        const lastCandle = result.data[result.data.length - 1];
        console.log(
          `✅ ${exchange.padEnd(20)} - ${result.data.length} candles, Last: $${lastCandle?.close.toFixed(2)} (${duration}ms)`
        );
      } else {
        console.log(`❌ ${exchange.padEnd(20)} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${exchange.padEnd(20)} - Exception: ${(error as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 4: Trades Fetch
// ═══════════════════════════════════════════════════════════════════════════

export async function testTradesFetch() {
  console.log('\n🧪 Test 4: Trades Fetch');
  console.log('═'.repeat(50));

  for (const exchange of TEST_EXCHANGES) {
    try {
      const start = Date.now();
      const result = await ccxtManager.fetchTrades(exchange, TEST_SYMBOL, undefined, 10, Priority.NORMAL);
      const duration = Date.now() - start;

      if (result.success && result.data) {
        const lastTrade = result.data[0];
        console.log(
          `✅ ${exchange.padEnd(20)} - ${result.data.length} trades, Last: ${lastTrade?.side} $${lastTrade?.price.toFixed(2)} (${duration}ms)`
        );
      } else {
        console.log(`❌ ${exchange.padEnd(20)} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${exchange.padEnd(20)} - Exception: ${(error as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 5: Funding Rate Fetch (Futures Only)
// ═══════════════════════════════════════════════════════════════════════════

export async function testFundingRateFetch() {
  console.log('\n🧪 Test 5: Funding Rate Fetch (Futures Only)');
  console.log('═'.repeat(50));

  const futuresExchanges: ExchangeId[] = [
    'binance-usdm',
    'bybit-linear',
    'okx-swap',
    'bitget-futures',
    'kucoin-futures',
  ];

  for (const exchange of futuresExchanges) {
    try {
      const start = Date.now();
      const result = await ccxtManager.fetchFundingRate(exchange, TEST_SYMBOL + ':USDT', Priority.NORMAL);
      const duration = Date.now() - start;

      if (result.success && result.data) {
        const rate = (result.data.fundingRate || 0) * 100;
        console.log(
          `✅ ${exchange.padEnd(20)} - Funding Rate: ${rate.toFixed(4)}% (${duration}ms)`
        );
      } else {
        console.log(`❌ ${exchange.padEnd(20)} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${exchange.padEnd(20)} - Exception: ${(error as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 6: Aggregated Order Book
// ═══════════════════════════════════════════════════════════════════════════

export async function testAggregatedOrderBook() {
  console.log('\n🧪 Test 6: Aggregated Order Book');
  console.log('═'.repeat(50));

  const exchanges: ExchangeId[] = ['binance', 'bybit', 'okx', 'bitget', 'kucoin'];

  try {
    const start = Date.now();
    const result = await aggregator.getAggregatedOrderBook(exchanges, TEST_SYMBOL, 100);
    const duration = Date.now() - start;

    if (result.success && result.data) {
      console.log(`✅ Aggregated Order Book:`);
      console.log(`   Exchanges: ${result.data.exchanges.join(', ')}`);
      console.log(`   Best Bid: $${result.data.bids[0]?.price.toFixed(2)}`);
      console.log(`   Best Ask: $${result.data.asks[0]?.price.toFixed(2)}`);
      console.log(`   Spread: $${result.data.spread.toFixed(2)} (${result.data.spreadPercentage.toFixed(4)}%)`);
      console.log(`   Duration: ${duration}ms`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Exception: ${(error as Error).message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 7: Best Prices (Arbitrage Detection)
// ═══════════════════════════════════════════════════════════════════════════

export async function testBestPrices() {
  console.log('\n🧪 Test 7: Best Prices (Arbitrage Detection)');
  console.log('═'.repeat(50));

  const exchanges: ExchangeId[] = ['binance', 'bybit', 'okx', 'bitget', 'kucoin'];

  try {
    const start = Date.now();
    const result = await aggregator.getBestPrices(exchanges, TEST_SYMBOL);
    const duration = Date.now() - start;

    if (result.success && result.data) {
      console.log(`✅ Best Prices:`);
      if (result.data.bestBid) {
        console.log(`   Best Bid: ${result.data.bestBid.exchange} - $${result.data.bestBid.price.toFixed(2)}`);
      }
      if (result.data.bestAsk) {
        console.log(`   Best Ask: ${result.data.bestAsk.exchange} - $${result.data.bestAsk.price.toFixed(2)}`);
      }
      console.log(`   Arbitrage Opportunity: ${result.data.arbitrageOpportunity.toFixed(4)}%`);
      console.log(`   Duration: ${duration}ms`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Exception: ${(error as Error).message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Test 8: Cache Performance
// ═══════════════════════════════════════════════════════════════════════════

export async function testCachePerformance() {
  console.log('\n🧪 Test 8: Cache Performance');
  console.log('═'.repeat(50));

  const exchange: ExchangeId = 'binance';

  try {
    // First call (uncached)
    const start1 = Date.now();
    const result1 = await ccxtManager.fetchTicker(exchange, TEST_SYMBOL, Priority.HIGH);
    const duration1 = Date.now() - start1;

    // Second call (cached)
    const start2 = Date.now();
    const result2 = await ccxtManager.fetchTicker(exchange, TEST_SYMBOL, Priority.HIGH);
    const duration2 = Date.now() - start2;

    console.log(`First Call (Uncached):  ${duration1}ms ${result1.cached ? '📦' : '🌐'}`);
    console.log(`Second Call (Cached):   ${duration2}ms ${result2.cached ? '📦' : '🌐'}`);
    console.log(`Performance Gain:       ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);
  } catch (error) {
    console.log(`❌ Exception: ${(error as Error).message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 Run All Tests
// ═══════════════════════════════════════════════════════════════════════════

export async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('🧪 CCXT INTEGRATION TEST SUITE');
  console.log('═'.repeat(60));

  await testTickerFetch();
  await testOrderBookFetch();
  await testOHLCVFetch();
  await testTradesFetch();
  await testFundingRateFetch();
  await testAggregatedOrderBook();
  await testBestPrices();
  await testCachePerformance();

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('═'.repeat(60));
  console.log('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Export for CLI usage
// ═══════════════════════════════════════════════════════════════════════════

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
