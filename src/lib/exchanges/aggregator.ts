/**
 * 🔗 Order Book Aggregator
 * Merges order books from multiple exchanges into unified view
 */

import type {
  ExchangeId,
  OrderBook,
  AggregatedOrderBook,
  OrderBookLevel,
  ApiResponse,
} from './types';
import { ccxtManager } from './ccxt-manager';
import { Priority } from './rate-limiter';

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 Aggregator Class
// ═══════════════════════════════════════════════════════════════════════════

class OrderBookAggregator {
  /**
   * Fetch order books from multiple exchanges in parallel
   */
  async fetchMultipleOrderBooks(
    exchanges: ExchangeId[],
    symbol: string,
    limit: number = 100
  ): Promise<OrderBook[]> {
    const promises = exchanges.map((exchangeId) =>
      ccxtManager.fetchOrderBook(exchangeId, symbol, limit, Priority.HIGH)
    );

    const results = await Promise.allSettled(promises);

    return results
      .filter(
        (result): result is PromiseFulfilledResult<ApiResponse<OrderBook>> =>
          result.status === 'fulfilled' && result.value.success
      )
      .map((result) => result.value.data!);
  }

  /**
   * Merge multiple order books into one aggregated book
   */
  aggregateOrderBooks(orderbooks: OrderBook[]): AggregatedOrderBook {
    // Merge all bids and asks with exchange tags
    const allBids: (OrderBookLevel & { exchange: ExchangeId })[] = [];
    const allAsks: (OrderBookLevel & { exchange: ExchangeId })[] = [];

    orderbooks.forEach((book) => {
      allBids.push(...book.bids.map(level => ({ ...level, exchange: book.exchange })));
      allAsks.push(...book.asks.map(level => ({ ...level, exchange: book.exchange })));
    });

    // Sort bids (descending by price)
    allBids.sort((a, b) => b.price - a.price);

    // Sort asks (ascending by price)
    allAsks.sort((a, b) => a.price - b.price);

    // Merge levels at same price
    const mergedBids = this.mergeLevels(allBids);
    const mergedAsks = this.mergeLevels(allAsks);

    // Calculate spread
    const bestBid = mergedBids[0]?.price || 0;
    const bestAsk = mergedAsks[0]?.price || 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const spreadPercentage =
      bestAsk > 0 && bestBid > 0 ? (spread / bestAsk) * 100 : 0;

    // Calculate volumes
    const totalBidVolume = mergedBids.reduce((sum, bid) => sum + bid.amount, 0);
    const totalAskVolume = mergedAsks.reduce((sum, ask) => sum + ask.amount, 0);
    
    // Calculate weighted mid price
    const weightedMidPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;

    return {
      symbol: orderbooks[0]?.symbol || '',
      timestamp: Date.now(),
      bids: mergedBids,
      asks: mergedAsks,
      exchanges: orderbooks.map((book) => book.exchange),
      totalBidVolume,
      totalAskVolume,
      weightedMidPrice,
      spread,
      spreadPercentage,
    };
  }

  /**
   * Merge price levels at same price point
   */
  private mergeLevels(
    levels: (OrderBookLevel & { exchange: ExchangeId })[]
  ): (OrderBookLevel & { exchange: ExchangeId })[] {
    const merged = new Map<number, { amount: number; exchange: ExchangeId }>();

    levels.forEach(({ price, amount, exchange }) => {
      const current = merged.get(price);
      if (current) {
        merged.set(price, { amount: current.amount + amount, exchange: current.exchange });
      } else {
        merged.set(price, { amount, exchange });
      }
    });

    return Array.from(merged.entries())
      .map(([price, { amount, exchange }]) => ({ price, amount, exchange }))
      .slice(0, 100); // Top 100 levels
  }

  /**
   * Get aggregated order book from multiple exchanges
   */
  async getAggregatedOrderBook(
    exchanges: ExchangeId[],
    symbol: string,
    limit: number = 100
  ): Promise<ApiResponse<AggregatedOrderBook>> {
    try {
      const orderbooks = await this.fetchMultipleOrderBooks(
        exchanges,
        symbol,
        limit
      );

      if (orderbooks.length === 0) {
        return {
          success: false,
          error: 'No order books available from any exchange',
          timestamp: Date.now(),
        };
      }

      const aggregated = this.aggregateOrderBooks(orderbooks);

      return {
        success: true,
        data: aggregated,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get best bid/ask across multiple exchanges (arbitrage detection)
   */
  async getBestPrices(
    exchanges: ExchangeId[],
    symbol: string
  ): Promise<
    ApiResponse<{
      bestBid: { exchange: ExchangeId; price: number; amount: number } | null;
      bestAsk: { exchange: ExchangeId; price: number; amount: number } | null;
      arbitrageOpportunity: number; // Percentage profit opportunity
    }>
  > {
    try {
      const orderbooks = await this.fetchMultipleOrderBooks(exchanges, symbol, 1);

      if (orderbooks.length === 0) {
        return {
          success: false,
          error: 'No order books available',
          timestamp: Date.now(),
        };
      }

      let bestBid: { exchange: ExchangeId; price: number; amount: number } | null =
        null;
      let bestAsk: { exchange: ExchangeId; price: number; amount: number } | null =
        null;

      orderbooks.forEach((book) => {
        // Find best bid (highest buy price)
        if (book.bids.length > 0) {
          const bid = book.bids[0];
          if (!bestBid || bid.price > bestBid.price) {
            bestBid = {
              exchange: book.exchange,
              price: bid.price,
              amount: bid.amount,
            };
          }
        }

        // Find best ask (lowest sell price)
        if (book.asks.length > 0) {
          const ask = book.asks[0];
          if (!bestAsk || ask.price < bestAsk.price) {
            bestAsk = {
              exchange: book.exchange,
              price: ask.price,
              amount: ask.amount,
            };
          }
        }
      });

      // Calculate arbitrage opportunity
      let arbitrageOpportunity = 0;
      if (bestBid && bestAsk) {
        const bid = bestBid as { exchange: ExchangeId; price: number; amount: number };
        const ask = bestAsk as { exchange: ExchangeId; price: number; amount: number };
        if (bid.price > ask.price) {
          arbitrageOpportunity = ((bid.price - ask.price) / ask.price) * 100;
        }
      }

      return {
        success: true,
        data: {
          bestBid,
          bestAsk,
          arbitrageOpportunity,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Calculate market depth (cumulative volume at price levels)
   */
  calculateMarketDepth(
    orderbook: AggregatedOrderBook,
    depthLevels: number = 10
  ): {
    bidDepth: { price: number; cumulativeVolume: number }[];
    askDepth: { price: number; cumulativeVolume: number }[];
  } {
    const bidDepth: { price: number; cumulativeVolume: number }[] = [];
    const askDepth: { price: number; cumulativeVolume: number }[] = [];

    let cumulativeBidVolume = 0;
    let cumulativeAskVolume = 0;

    // Calculate bid depth
    for (let i = 0; i < Math.min(depthLevels, orderbook.bids.length); i++) {
      cumulativeBidVolume += orderbook.bids[i].amount;
      bidDepth.push({
        price: orderbook.bids[i].price,
        cumulativeVolume: cumulativeBidVolume,
      });
    }

    // Calculate ask depth
    for (let i = 0; i < Math.min(depthLevels, orderbook.asks.length); i++) {
      cumulativeAskVolume += orderbook.asks[i].amount;
      askDepth.push({
        price: orderbook.asks[i].price,
        cumulativeVolume: cumulativeAskVolume,
      });
    }

    return { bidDepth, askDepth };
  }

  /**
   * Calculate mid price (average of best bid and ask)
   */
  getMidPrice(orderbook: AggregatedOrderBook): number | null {
    if (orderbook.bids.length === 0 || orderbook.asks.length === 0) {
      return null;
    }

    const bestBid = orderbook.bids[0].price;
    const bestAsk = orderbook.asks[0].price;

    return (bestBid + bestAsk) / 2;
  }

  /**
   * Calculate order book imbalance (buy pressure vs sell pressure)
   */
  getOrderBookImbalance(
    orderbook: AggregatedOrderBook,
    depth: number = 10
  ): {
    bidVolume: number;
    askVolume: number;
    imbalance: number; // -1 to 1 (-1 = sell pressure, 1 = buy pressure)
  } {
    const bidVolume = orderbook.bids
      .slice(0, depth)
      .reduce((sum, level) => sum + level.amount, 0);

    const askVolume = orderbook.asks
      .slice(0, depth)
      .reduce((sum, level) => sum + level.amount, 0);

    const totalVolume = bidVolume + askVolume;
    const imbalance =
      totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;

    return {
      bidVolume,
      askVolume,
      imbalance,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Export Singleton
// ═══════════════════════════════════════════════════════════════════════════

export const aggregator = new OrderBookAggregator();
