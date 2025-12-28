/**
 * Order Book Analyzer - TypeScript Implementation
 * محلل دفتر الأوامر - نسخة TypeScript
 * 
 * Ported from: تحليل_العمق_والطلبات/محلل_العمق_والطلبات.py
 */

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total?: number;
}

export interface OrderBookData {
  symbol: string;
  exchange: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId?: number;
}

export interface BidAskSpread {
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPct: number;
  spreadBps: number;
  midPrice: number;
  quality: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
}

export interface ImbalanceSignal {
  timestamp: number;
  imbalanceRatio: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: 'قوي' | 'متوسط' | 'ضعيف';
  confidence: number;
}

export interface WhaleOrder {
  side: 'buy' | 'sell';
  price: number;
  volume: number;
  usdValue: number;
  depthLevel: number;
}

export interface DepthAnalysis {
  timestamp: number;
  currentPrice: number;
  depthLevels: {
    [key: string]: {
      bidVolume: number;
      askVolume: number;
      ratio: number;
      totalVolume: number;
    };
  };
  strongestSupport?: {
    price: number;
    volume: number;
  };
  strongestResistance?: {
    price: number;
    volume: number;
  };
}

export interface LiquidationZone {
  upside: Array<{
    price: number;
    level: number;
    distancePct: number;
  }>;
  downside: Array<{
    price: number;
    level: number;
    distancePct: number;
  }>;
}

export class OrderBookAnalyzer {
  private whaleThreshold: number;

  constructor(whaleThreshold: number = 100000) {
    this.whaleThreshold = whaleThreshold;
  }

  /**
   * Calculate Bid-Ask Spread
   * حساب فارق العرض والطلب
   */
  calculateBidAskSpread(orderBook: OrderBookData): BidAskSpread | null {
    if (!orderBook.bids.length || !orderBook.asks.length) {
      return null;
    }

    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPct = (spread / midPrice) * 100;
    const spreadBps = spreadPct * 100;

    let quality: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
    if (spreadPct < 0.05) quality = 'ممتاز';
    else if (spreadPct < 0.1) quality = 'جيد';
    else if (spreadPct < 0.2) quality = 'مقبول';
    else quality = 'ضعيف';

    return {
      bestBid,
      bestAsk,
      spread,
      spreadPct,
      spreadBps,
      midPrice,
      quality
    };
  }

  /**
   * Analyze Market Depth
   * تحليل عمق السوق
   */
  analyzeDepth(orderBook: OrderBookData, currentPrice: number): DepthAnalysis {
    const analysis: DepthAnalysis = {
      timestamp: Date.now(),
      currentPrice,
      depthLevels: {}
    };

    // Analyze at different depth levels
    for (const level of [5, 10, 20, 50]) {
      const bidVolume = orderBook.bids
        .slice(0, level)
        .reduce((sum, b) => sum + b.quantity, 0);
      
      const askVolume = orderBook.asks
        .slice(0, level)
        .reduce((sum, a) => sum + a.quantity, 0);

      analysis.depthLevels[`level_${level}`] = {
        bidVolume,
        askVolume,
        ratio: askVolume > 0 ? bidVolume / askVolume : Infinity,
        totalVolume: bidVolume + askVolume
      };
    }

    // Strongest support and resistance
    if (orderBook.bids.length && orderBook.asks.length) {
      analysis.strongestSupport = {
        price: orderBook.bids[0].price,
        volume: orderBook.bids[0].quantity
      };
      analysis.strongestResistance = {
        price: orderBook.asks[0].price,
        volume: orderBook.asks[0].quantity
      };
    }

    return analysis;
  }

  /**
   * Calculate Order Book Imbalance
   * حساب عدم التوازن في دفتر الأوامر
   */
  calculateImbalance(orderBook: OrderBookData, depthLevel: number = 10): ImbalanceSignal {
    const bids = orderBook.bids.slice(0, depthLevel);
    const asks = orderBook.asks.slice(0, depthLevel);

    const bidVolume = bids.reduce((sum, b) => sum + b.quantity, 0);
    const askVolume = asks.reduce((sum, a) => sum + a.quantity, 0);

    const totalVolume = bidVolume + askVolume;
    const imbalanceRatio = totalVolume > 0 ? bidVolume / totalVolume : 0.5;

    let direction: 'bullish' | 'bearish' | 'neutral';
    let strength: 'قوي' | 'متوسط' | 'ضعيف';
    let confidence: number;

    if (imbalanceRatio > 0.6) {
      direction = 'bullish';
      strength = imbalanceRatio > 0.75 ? 'قوي' : 'متوسط';
      confidence = imbalanceRatio - 0.5;
    } else if (imbalanceRatio < 0.4) {
      direction = 'bearish';
      strength = imbalanceRatio < 0.25 ? 'قوي' : 'متوسط';
      confidence = 0.5 - imbalanceRatio;
    } else {
      direction = 'neutral';
      strength = 'ضعيف';
      confidence = Math.min(Math.abs(imbalanceRatio - 0.5) * 2, 0.3);
    }

    return {
      timestamp: Date.now(),
      imbalanceRatio,
      direction,
      strength,
      confidence
    };
  }

  /**
   * Detect Whale Orders
   * كشف طلبات الحيتان
   */
  detectWhaleOrders(orderBook: OrderBookData, currentPrice: number): WhaleOrder[] {
    const whales: WhaleOrder[] = [];

    // Check bids (buy orders)
    orderBook.bids.forEach((bid, index) => {
      const usdValue = bid.price * bid.quantity;
      if (usdValue >= this.whaleThreshold) {
        whales.push({
          side: 'buy',
          price: bid.price,
          volume: bid.quantity,
          usdValue,
          depthLevel: index + 1
        });
      }
    });

    // Check asks (sell orders)
    orderBook.asks.forEach((ask, index) => {
      const usdValue = ask.price * ask.quantity;
      if (usdValue >= this.whaleThreshold) {
        whales.push({
          side: 'sell',
          price: ask.price,
          volume: ask.quantity,
          usdValue,
          depthLevel: index + 1
        });
      }
    });

    return whales;
  }

  /**
   * Detect Liquidation Zones
   * كشف مناطق التصفية
   */
  detectLiquidationZones(
    orderBook: OrderBookData,
    currentPrice: number,
    leverage: number = 10
  ): LiquidationZone {
    const zones: LiquidationZone = {
      upside: [],
      downside: []
    };

    // Downside liquidation zones (for long positions)
    for (const level of [3, 5, 10]) {
      const downsidePrice = currentPrice * (1 - 1 / leverage * level);
      zones.downside.push({
        price: downsidePrice,
        level,
        distancePct: ((currentPrice - downsidePrice) / currentPrice) * 100
      });
    }

    // Upside liquidation zones (for short positions)
    for (const level of [3, 5, 10]) {
      const upsidePrice = currentPrice * (1 + 1 / leverage * level);
      zones.upside.push({
        price: upsidePrice,
        level,
        distancePct: ((upsidePrice - currentPrice) / currentPrice) * 100
      });
    }

    return zones;
  }

  /**
   * Generate comprehensive summary
   * إنشاء ملخص شامل
   */
  generateSummary(orderBook: OrderBookData, currentPrice: number) {
    const spread = this.calculateBidAskSpread(orderBook);
    const depth = this.analyzeDepth(orderBook, currentPrice);
    const imbalance = this.calculateImbalance(orderBook);
    const whales = this.detectWhaleOrders(orderBook, currentPrice);
    const liquidationZones = this.detectLiquidationZones(orderBook, currentPrice);

    return {
      spread,
      depth,
      imbalance,
      whales,
      liquidationZones,
      timestamp: Date.now()
    };
  }
}

/**
 * Utility function to fetch order book from API
 */
export async function fetchOrderBook(
  symbol: string,
  exchange: string = 'binance',
  limit: number = 100
): Promise<OrderBookData> {
  const response = await fetch(
    `/api/orderbook?symbol=${symbol}&exchange=${exchange}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch order book: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook for real-time order book analysis
 */
export function useOrderBookAnalysis(
  symbol: string,
  exchange: string,
  currentPrice: number,
  refreshInterval: number = 5000
) {
  // This would be implemented as a React hook with useState and useEffect
  // For now, providing the interface
  return {
    orderBook: null as OrderBookData | null,
    analysis: null as ReturnType<OrderBookAnalyzer['generateSummary']> | null,
    isLoading: false,
    error: null as Error | null
  };
}
