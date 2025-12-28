import { NextRequest, NextResponse } from "next/server";

/**
 * Multi-Exchange Order Book API
 * واجهة برمجة تطبيقات دفتر الأوامر من منصات متعددة
 * 
 * Supported: Binance, Bybit, MEXC, Coinbase, KuCoin, OKX,
 *            Bitget, BingX, Phemex, HTX, Gate.io, Crypto.com, Kraken
 */

// Exchange API URLs
const EXCHANGE_APIS = {
  binance: "https://api.binance.com/api/v3",
  bybit: "https://api.bybit.com/v5",
  mexc: "https://api.mexc.com/api/v3",
  coinbase: "https://api.exchange.coinbase.com",
  kucoin: "https://api.kucoin.com/api/v1",
  okx: "https://www.okx.com/api/v5",
  bitget: "https://api.bitget.com/api/spot/v1",
  bingx: "https://open-api.bingx.com/openApi/swap/v2",
  phemex: "https://api.phemex.com",
  htx: "https://api.huobi.pro",
  gate: "https://api.gateio.ws/api/v4",
  cryptocom: "https://api.crypto.com/v2",
  kraken: "https://api.kraken.com/0"
};

// Symbol format for different exchanges
function formatSymbol(symbol: string, exchange: string): string {
  const base = symbol.replace("USDT", "");
  switch (exchange) {
    case "bybit":
    case "binance":
    case "mexc":
    case "bingx":
      return symbol; // BTCUSDT
    case "coinbase":
      return `${base}-USD`; // BTC-USD
    case "kucoin":
    case "okx":
    case "bitget":
    case "gate":
      return `${base}-USDT`; // BTC-USDT
    case "phemex":
      return `${base}USD`; // BTCUSD
    case "htx":
      return `${base.toLowerCase()}usdt`; // btcusdt
    case "cryptocom":
      return `${base}_USDT`; // BTC_USDT
    case "kraken":
      return `${base}USD`; // BTCUSD
    default:
      return symbol;
  }
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total?: number; // cumulative
}

export interface OrderBookData {
  symbol: string;
  exchange: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId?: number;
}

const cache = new Map<string, { data: OrderBookData; timestamp: number }>();
const CACHE_DURATION = 5 * 1000; // 5 seconds for order book

// ============================================================================
// FETCH FUNCTIONS FOR EACH EXCHANGE
// ============================================================================

async function fetchBinanceOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.binance}/depth?symbol=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();

  return {
    symbol,
    exchange: "binance",
    timestamp: Date.now(),
    bids: data.bids?.map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: data.asks?.map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || [],
    lastUpdateId: data.lastUpdateId
  };
}

async function fetchBybitOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.bybit}/market/orderbook?category=spot&symbol=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.result;

  return {
    symbol,
    exchange: "bybit",
    timestamp: Date.now(),
    bids: result?.b?.map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: result?.a?.map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || [],
    lastUpdateId: result?.u
  };
}

async function fetchMEXCOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.mexc}/depth?symbol=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();

  return {
    symbol,
    exchange: "mexc",
    timestamp: Date.now(),
    bids: data.bids?.map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: data.asks?.map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

async function fetchCoinbaseOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const level = limit <= 50 ? 2 : 3; // level 2 = top 50, level 3 = full
  const url = `${EXCHANGE_APIS.coinbase}/products/${symbol}/book?level=${level}`;
  const response = await fetch(url);
  const data = await response.json();

  return {
    symbol,
    exchange: "coinbase",
    timestamp: Date.now(),
    bids: data.bids?.slice(0, limit).map((b: [string, string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: data.asks?.slice(0, limit).map((a: [string, string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

async function fetchKuCoinOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.kucoin}/market/orderbook/level2_${limit <= 20 ? '20' : '100'}?symbol=${symbol}`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.data;

  return {
    symbol,
    exchange: "kucoin",
    timestamp: Date.now(),
    bids: result?.bids?.slice(0, limit).map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: result?.asks?.slice(0, limit).map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

async function fetchOKXOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.okx}/market/books?instId=${symbol}&sz=${Math.min(limit, 400)}`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.data?.[0];

  return {
    symbol,
    exchange: "okx",
    timestamp: Date.now(),
    bids: result?.bids?.map((b: [string, string, string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: result?.asks?.map((a: [string, string, string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

async function fetchBitgetOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.bitget}/market/depth?symbol=${symbol}&limit=${limit}&type=step0`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.data;

  return {
    symbol,
    exchange: "bitget",
    timestamp: Date.now(),
    bids: result?.bids?.map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: result?.asks?.map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

async function fetchBingXOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.bingx}/quote/depth?symbol=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.data;

  return {
    symbol,
    exchange: "bingx",
    timestamp: Date.now(),
    bids: result?.bids?.map((b: { price: string; volume: string }) => ({
      price: parseFloat(b.price),
      quantity: parseFloat(b.volume)
    })) || [],
    asks: result?.asks?.map((a: { price: string; volume: string }) => ({
      price: parseFloat(a.price),
      quantity: parseFloat(a.volume)
    })) || []
  };
}

async function fetchPhemexOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.phemex}/md/orderbook?symbol=${symbol}`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.result;

  return {
    symbol,
    exchange: "phemex",
    timestamp: Date.now(),
    bids: result?.book?.bids?.slice(0, limit).map((b: [number, number]) => ({
      price: b[0] / 10000, // Phemex uses scaled prices
      quantity: b[1]
    })) || [],
    asks: result?.book?.asks?.slice(0, limit).map((a: [number, number]) => ({
      price: a[0] / 10000,
      quantity: a[1]
    })) || []
  };
}

async function fetchHTXOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.htx}/market/depth?symbol=${symbol}&depth=${limit}&type=step0`;
  const response = await fetch(url);
  const data = await response.json();
  const tick = data.tick;

  return {
    symbol,
    exchange: "htx",
    timestamp: Date.now(),
    bids: tick?.bids?.slice(0, limit).map((b: [number, number]) => ({
      price: b[0],
      quantity: b[1]
    })) || [],
    asks: tick?.asks?.slice(0, limit).map((a: [number, number]) => ({
      price: a[0],
      quantity: a[1]
    })) || []
  };
}

async function fetchGateOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.gate}/spot/order_book?currency_pair=${symbol}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();

  return {
    symbol,
    exchange: "gate",
    timestamp: Date.now(),
    bids: data.bids?.map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: data.asks?.map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

async function fetchCryptocomOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.cryptocom}/public/get-book?instrument_name=${symbol}&depth=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.result?.data?.[0];

  return {
    symbol,
    exchange: "cryptocom",
    timestamp: Date.now(),
    bids: result?.bids?.map((b: [number, number, number]) => ({
      price: b[0],
      quantity: b[1]
    })) || [],
    asks: result?.asks?.map((a: [number, number, number]) => ({
      price: a[0],
      quantity: a[1]
    })) || []
  };
}

async function fetchKrakenOrderBook(
  symbol: string,
  limit: number
): Promise<OrderBookData> {
  const url = `${EXCHANGE_APIS.kraken}/public/Depth?pair=${symbol}&count=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  const pair = Object.keys(data.result || {})[0];
  const result = data.result?.[pair];

  return {
    symbol,
    exchange: "kraken",
    timestamp: Date.now(),
    bids: result?.bids?.map((b: [string, string, number]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1])
    })) || [],
    asks: result?.asks?.map((a: [string, string, number]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1])
    })) || []
  };
}

// ============================================================================
// MAIN GET HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const symbol = searchParams.get("symbol")?.toUpperCase() || "BTCUSDT";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const exchange = (searchParams.get("exchange") || "binance").toLowerCase();
    
    if (!Object.keys(EXCHANGE_APIS).includes(exchange)) {
      return NextResponse.json(
        { error: `Invalid exchange. Supported: ${Object.keys(EXCHANGE_APIS).join(", ")}` },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${exchange}-${symbol}-${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    const formattedSymbol = formatSymbol(symbol, exchange);
    let orderBook: OrderBookData;

    // Fetch from appropriate exchange
    switch (exchange) {
      case "binance":
        orderBook = await fetchBinanceOrderBook(formattedSymbol, limit);
        break;
      case "bybit":
        orderBook = await fetchBybitOrderBook(formattedSymbol, limit);
        break;
      case "mexc":
        orderBook = await fetchMEXCOrderBook(formattedSymbol, limit);
        break;
      case "coinbase":
        orderBook = await fetchCoinbaseOrderBook(formattedSymbol, limit);
        break;
      case "kucoin":
        orderBook = await fetchKuCoinOrderBook(formattedSymbol, limit);
        break;
      case "okx":
        orderBook = await fetchOKXOrderBook(formattedSymbol, limit);
        break;
      case "bitget":
        orderBook = await fetchBitgetOrderBook(formattedSymbol, limit);
        break;
      case "bingx":
        orderBook = await fetchBingXOrderBook(formattedSymbol, limit);
        break;
      case "phemex":
        orderBook = await fetchPhemexOrderBook(formattedSymbol, limit);
        break;
      case "htx":
        orderBook = await fetchHTXOrderBook(formattedSymbol, limit);
        break;
      case "gate":
        orderBook = await fetchGateOrderBook(formattedSymbol, limit);
        break;
      case "cryptocom":
        orderBook = await fetchCryptocomOrderBook(formattedSymbol, limit);
        break;
      case "kraken":
        orderBook = await fetchKrakenOrderBook(formattedSymbol, limit);
        break;
      default:
        throw new Error(`Exchange ${exchange} not implemented`);
    }

    // Calculate cumulative totals
    let bidTotal = 0;
    orderBook.bids.forEach(bid => {
      bidTotal += bid.quantity;
      bid.total = bidTotal;
    });

    let askTotal = 0;
    orderBook.asks.forEach(ask => {
      askTotal += ask.quantity;
      ask.total = askTotal;
    });

    // Cache the result
    cache.set(cacheKey, { data: orderBook, timestamp: Date.now() });

    return NextResponse.json(orderBook);
  } catch (error) {
    console.error("Order Book API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch order book",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
