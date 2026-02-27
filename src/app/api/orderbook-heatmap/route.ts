// ========================================
// Multi-Exchange Aggregated Order Book API
// Fetches order books from multiple exchanges in parallel
// Used by the Order Book Heatmap page
// ========================================

import { NextRequest, NextResponse } from "next/server";

const EXCHANGE_APIS: Record<string, string> = {
  bybit: "https://api.bybit.com/v5",
  mexc: "https://api.mexc.com/api/v3",
  coinbase: "https://api.exchange.coinbase.com",
  kucoin: "https://api.kucoin.com/api/v1",
  okx: "https://www.okx.com/api/v5",
  bitget: "https://api.bitget.com/api/v2/spot",
  bingx: "https://open-api.bingx.com/openApi/swap/v2",
  phemex: "https://api.phemex.com",
  htx: "https://api.huobi.pro",
  gate: "https://api.gateio.ws/api/v4",
  cryptocom: "https://api.crypto.com/exchange/v1",
  kraken: "https://api.kraken.com/0",
};

// Map user-facing exchange names to API keys
const EXCHANGE_ALIAS: Record<string, string> = {
  gateio: "gate",
};

interface OrderBookEntry {
  price: number;
  quantity: number;
}

interface ExchangeOrderBook {
  exchange: string;
  symbol: string;
  timestamp: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  error?: string;
}

function formatSymbol(symbol: string, exchange: string): string {
  const base = symbol.replace("USDT", "");
  switch (exchange) {
    case "bybit":
    case "mexc":
      return symbol;
    case "bingx":
      return `${base}-USDT`;
    case "coinbase":
      return `${base}-USD`;
    case "kucoin":
    case "okx":
    case "bitget":
    case "gate":
      return `${base}-USDT`;
    case "phemex":
    case "kraken":
      return `${base}USD`;
    case "htx":
      return `${base.toLowerCase()}usdt`;
    case "cryptocom":
      return `${base}_USDT`;
    default:
      return symbol;
  }
}

// ============ Per-exchange fetch functions ============

async function fetchExchange(
  exchange: string,
  symbol: string,
  limit: number
): Promise<ExchangeOrderBook> {
  const apiKey = EXCHANGE_ALIAS[exchange] || exchange;
  const formattedSymbol = formatSymbol(symbol, apiKey);
  const baseUrl = EXCHANGE_APIS[apiKey];
  
  if (!baseUrl) {
    return { exchange, symbol, timestamp: Date.now(), bids: [], asks: [], error: `Unknown exchange: ${exchange}` };
  }

  try {
    let url: string;
    let parseResponse: (data: Record<string, unknown>) => { 
      bids: OrderBookEntry[]; 
      asks: OrderBookEntry[] 
    };

    switch (apiKey) {
      case "bybit":
        url = `${baseUrl}/market/orderbook?category=spot&symbol=${formattedSymbol}&limit=${limit}`;
        parseResponse = (data) => {
          const r = (data as Record<string, Record<string, unknown>>).result;
          return {
            bids: ((r?.b as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: ((r?.a as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      case "mexc":
        url = `${baseUrl}/depth?symbol=${formattedSymbol}&limit=${limit}`;
        parseResponse = (data) => ({
          bids: ((data.bids as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          asks: ((data.asks as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
        });
        break;

      case "coinbase":
        url = `${baseUrl}/products/${formattedSymbol}/book?level=2`;
        parseResponse = (data) => ({
          bids: ((data.bids as [string, string, string][]) || []).slice(0, limit).map(([p, q]) => ({ price: +p, quantity: +q })),
          asks: ((data.asks as [string, string, string][]) || []).slice(0, limit).map(([p, q]) => ({ price: +p, quantity: +q })),
        });
        break;

      case "kucoin":
        url = `${baseUrl}/market/orderbook/level2_${limit <= 20 ? "20" : "100"}?symbol=${formattedSymbol}`;
        parseResponse = (data) => {
          const d = (data as Record<string, Record<string, unknown>>).data;
          return {
            bids: ((d?.bids as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: ((d?.asks as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      case "okx":
        url = `${baseUrl}/market/books?instId=${formattedSymbol}&sz=${Math.min(limit, 400)}`;
        parseResponse = (data) => {
          const book = ((data as Record<string, unknown[]>).data || [])[0] as Record<string, [string, string, string, string][]> | undefined;
          return {
            bids: (book?.bids || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: (book?.asks || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      case "bitget":
        url = `${baseUrl}/market/orderbook?symbol=${formattedSymbol.replace("-", "")}&limit=${limit}`;
        parseResponse = (data) => {
          const d = (data as Record<string, Record<string, unknown>>).data;
          return {
            bids: ((d?.bids as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: ((d?.asks as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      case "bingx":
        url = `${baseUrl}/quote/depth?symbol=${formattedSymbol}&limit=${limit}`;
        parseResponse = (data) => {
          const d = (data as Record<string, Record<string, unknown>>).data;
          return {
            bids: ((d?.bids as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: ((d?.asks as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      case "phemex":
        url = `${baseUrl}/md/orderbook?symbol=${formattedSymbol}`;
        parseResponse = (data) => {
          const r = (data as Record<string, Record<string, unknown>>).result;
          const book = r?.book as Record<string, [number, number][]> | undefined;
          return {
            bids: (book?.bids || []).slice(0, limit).map(([p, q]) => ({ price: p / 1e8, quantity: q })),
            asks: (book?.asks || []).slice(0, limit).map(([p, q]) => ({ price: p / 1e8, quantity: q })),
          };
        };
        break;

      case "htx":
        url = `${baseUrl}/market/depth?symbol=${formattedSymbol}&type=step0&depth=${limit}`;
        parseResponse = (data) => {
          const tick = (data as Record<string, Record<string, unknown>>).tick;
          return {
            bids: ((tick?.bids as [number, number][]) || []).map(([p, q]) => ({ price: p, quantity: q })),
            asks: ((tick?.asks as [number, number][]) || []).map(([p, q]) => ({ price: p, quantity: q })),
          };
        };
        break;

      case "gate":
        url = `${baseUrl}/spot/order_book?currency_pair=${formattedSymbol.replace("-", "_")}&limit=${limit}`;
        parseResponse = (data) => ({
          bids: ((data.bids as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          asks: ((data.asks as [string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
        });
        break;

      case "cryptocom":
        url = `${baseUrl}/public/get-book?instrument_name=${formattedSymbol}&depth=${limit}`;
        parseResponse = (data) => {
          const result = (data as Record<string, Record<string, unknown>>).result;
          const dataArr = (result?.data as Record<string, unknown>[]) || [];
          const book = dataArr[0] || {};
          return {
            bids: (((book as Record<string, unknown>).bids as [string, string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: (((book as Record<string, unknown>).asks as [string, string, string][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      case "kraken":
        url = `${baseUrl}/public/Depth?pair=${formattedSymbol}&count=${limit}`;
        parseResponse = (data) => {
          const pair = Object.keys((data as Record<string, unknown>).result || {})[0];
          const r = ((data as Record<string, Record<string, Record<string, unknown>>>).result || {})[pair];
          return {
            bids: ((r?.bids as [string, string, number][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
            asks: ((r?.asks as [string, string, number][]) || []).map(([p, q]) => ({ price: +p, quantity: +q })),
          };
        };
        break;

      default:
        return { exchange, symbol, timestamp: Date.now(), bids: [], asks: [], error: `Not implemented: ${exchange}` };
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "NexusTrader/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.json();
    const parsed = parseResponse(raw);

    return {
      exchange,
      symbol,
      timestamp: Date.now(),
      bids: parsed.bids.filter((b) => b.price > 0 && b.quantity > 0),
      asks: parsed.asks.filter((a) => a.price > 0 && a.quantity > 0),
    };
  } catch (err) {
    return {
      exchange,
      symbol,
      timestamp: Date.now(),
      bids: [],
      asks: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============ Cache ============
const multiCache = new Map<string, { data: ExchangeOrderBook[]; timestamp: number }>();
const CACHE_TTL = 2000; // 2s cache

// ============ MAIN HANDLER ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol")?.toUpperCase() || "BTCUSDT";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const exchangesParam = searchParams.get("exchanges") || "bybit,mexc,coinbase,kucoin,okx,bitget,bingx,phemex,htx,gateio,cryptocom,kraken";

    const exchanges = exchangesParam
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (exchanges.length === 0) {
      return NextResponse.json({ success: false, error: "No exchanges specified" }, { status: 400 });
    }

    // Check cache
    const cacheKey = `multi-${exchanges.sort().join(",")}-${symbol}-${limit}`;
    const cached = multiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: cached.timestamp,
      });
    }

    // Fetch all exchanges in parallel
    const results = await Promise.allSettled(
      exchanges.map((ex) => fetchExchange(ex, symbol, limit))
    );

    const orderBooks: ExchangeOrderBook[] = results
      .filter((r): r is PromiseFulfilledResult<ExchangeOrderBook> => r.status === "fulfilled")
      .map((r) => r.value);

    // Cache
    multiCache.set(cacheKey, { data: orderBooks, timestamp: Date.now() });

    // Clean old cache entries
    if (multiCache.size > 50) {
      const oldest = [...multiCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 25);
      for (const [key] of oldest) multiCache.delete(key);
    }

    const successCount = orderBooks.filter((ob) => !ob.error && ob.bids.length > 0).length;

    return NextResponse.json({
      success: true,
      data: orderBooks,
      summary: {
        total: exchanges.length,
        success: successCount,
        failed: exchanges.length - successCount,
        symbol,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[OrderBook Heatmap API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
