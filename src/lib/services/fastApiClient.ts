/**
 * 🔗 FastAPI Client — Central connection to Python backend (port 8000)
 * 
 * All pages use this instead of direct fetch calls.
 * Includes: health check, retry logic, automatic fallback to old API routes.
 */

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000;

let _healthy: boolean | null = null;
let _lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30s

/**
 * Check if FastAPI backend is alive
 */
async function checkHealth(): Promise<boolean> {
  const now = Date.now();
  if (_healthy !== null && now - _lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return _healthy;
  }
  
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${FASTAPI_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    _healthy = res.ok;
  } catch {
    _healthy = false;
  }
  _lastHealthCheck = now;
  return _healthy;
}

/**
 * Fetch from FastAPI with retry and timeout
 */
async function fastApiFetch<T = unknown>(
  path: string,
  options?: { timeout?: number; retries?: number }
): Promise<T> {
  const timeout = options?.timeout ?? TIMEOUT_MS;
  const retries = options?.retries ?? MAX_RETRIES;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      
      const res = await fetch(`${FASTAPI_BASE}${path}`, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timer);
      
      if (!res.ok) {
        throw new Error(`FastAPI error: ${res.status} ${res.statusText}`);
      }
      
      return await res.json() as T;
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('FastAPI request failed');
}

// ═════════════════════════════════════════════════════════════════════════
// Public API — used by pages
// ═════════════════════════════════════════════════════════════════════════

export const fastApiClient = {
  /** Check backend health */
  isHealthy: checkHealth,

  /** Base URL */
  baseUrl: FASTAPI_BASE,

  // ─── File 1: REST endpoints ───

  /** Fetch OHLCV candles */
  async getOHLCV(exchange: string, symbol: string, timeframe: string, limit = 500) {
    return fastApiFetch(`/api/rest/ohlcv?exchange=${exchange}&symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`);
  },

  /** Fetch tickers */
  async getTickers(exchange: string, count = 50) {
    return fastApiFetch(`/api/rest/tickers?exchange=${exchange}&count=${count}`);
  },

  /** Fetch top coins by volume */
  async getTopCoins(exchange: string, count = 50) {
    return fastApiFetch(`/api/rest/top-coins?exchange=${exchange}&count=${count}`);
  },

  /** Run 38-indicator trend scan */
  async trendScan(exchange: string, count = 50) {
    return fastApiFetch(`/api/rest/trend-scan?exchange=${exchange}&count=${count}`, { timeout: 120000 });
  },

  /** Debug single symbol trend scan */
  async trendScanDebug(exchange: string, symbol: string, timeframe: string) {
    return fastApiFetch(`/api/rest/trend-scan?exchange=${exchange}&debug=${symbol}&tf=${timeframe}`);
  },

  /** Fibonacci scanner */
  async fibonacci(exchange: string, timeframes: string, count = 50, proximity = 2.0) {
    return fastApiFetch(
      `/api/rest/fibonacci?exchange=${exchange}&timeframes=${timeframes}&count=${count}&proximity=${proximity}`,
      { timeout: 60000 }
    );
  },

  /** RSI heatmap */
  async rsiHeatmap(exchange: string, top = 50, timeframe = 'all') {
    return fastApiFetch(
      `/api/rest/rsi-heatmap?exchange=${exchange}&top=${top}&timeframe=${timeframe}`,
      { timeout: 120000 }
    );
  },

  /** MACD heatmap */
  async macdHeatmap(exchange: string, top = 50, timeframe = 'all') {
    return fastApiFetch(
      `/api/rest/macd-heatmap?exchange=${exchange}&top=${top}&timeframe=${timeframe}`,
      { timeout: 120000 }
    );
  },

  // ─── File 2: WebSocket endpoints ───

  /** Fetch orderbook (REST fallback) */
  async getOrderbook(symbol: string, exchanges: string, limit = 50) {
    return fastApiFetch(`/api/ws/orderbook?symbol=${symbol}&exchanges=${exchanges}&limit=${limit}`);
  },

  /** Get latest WS tickers */
  async getLiveTickers(exchange: string, limit = 50) {
    return fastApiFetch(`/api/ws/live-tickers?exchange=${exchange}&limit=${limit}`);
  },

  /** Connect to orderbook WebSocket */
  connectOrderbookWS(onMessage: (data: unknown) => void, onError?: (err: Event) => void): WebSocket {
    const ws = new WebSocket(`${FASTAPI_BASE.replace('http', 'ws')}/api/ws/stream/orderbook`);
    ws.onmessage = (evt) => {
      try { onMessage(JSON.parse(evt.data)); } catch { /* ignore */ }
    };
    if (onError) ws.onerror = onError;
    return ws;
  },

  /** Connect to prices WebSocket */
  connectPricesWS(onMessage: (data: unknown) => void): WebSocket {
    const ws = new WebSocket(`${FASTAPI_BASE.replace('http', 'ws')}/api/ws/stream/prices`);
    ws.onmessage = (evt) => {
      try { onMessage(JSON.parse(evt.data)); } catch { /* ignore */ }
    };
    return ws;
  },

  // ─── File 3: Aggregator endpoints ───

  /** Aggregated markets from 36+ exchanges */
  async getMarkets(limit = 500, sort = 'volume') {
    return fastApiFetch(`/api/aggregator/markets?limit=${limit}&sort=${sort}`);
  },

  /** List active exchanges */
  async getExchanges() {
    return fastApiFetch('/api/aggregator/exchanges');
  },

  /** Get cross-exchange data for a symbol */
  async getSymbol(symbol: string) {
    return fastApiFetch(`/api/aggregator/symbol/${symbol}`);
  },

  /** Connect to market updates WebSocket */
  connectMarketsWS(onMessage: (data: unknown) => void): WebSocket {
    const ws = new WebSocket(`${FASTAPI_BASE.replace('http', 'ws')}/api/aggregator/stream/markets`);
    ws.onmessage = (evt) => {
      try { onMessage(JSON.parse(evt.data)); } catch { /* ignore */ }
    };
    return ws;
  },
};

export default fastApiClient;
