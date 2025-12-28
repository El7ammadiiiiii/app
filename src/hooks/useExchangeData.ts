/**
 * 🎣 useExchangeData Hook
 * Fetch and manage exchange data with automatic updates
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExchangeId, Ticker, OrderBook, OHLCV, Trade, ApiResponse } from '@/lib/exchanges/types';

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Hook Options
// ═══════════════════════════════════════════════════════════════════════════

interface UseExchangeDataOptions {
  exchange: ExchangeId;
  symbol: string;
  enabled?: boolean;
  refreshInterval?: number; // milliseconds (0 = no auto-refresh)
  priority?: 'high' | 'normal' | 'low';
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 Ticker Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useTicker(options: UseExchangeDataOptions) {
  const { exchange, symbol, enabled = true, refreshInterval = 1000, priority = 'normal' } = options;
  
  const [data, setData] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTicker = useCallback(async () => {
    if (!enabled) return;

    try {
      const url = `/api/exchanges/ticker?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&priority=${priority}`;
      const response = await fetch(url);
      const result: ApiResponse<Ticker> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setCached(result.cached || false);
        setError(null);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [exchange, symbol, enabled, priority]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    if (!enabled) return;

    fetchTicker();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTicker, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTicker, refreshInterval, enabled]);

  return { data, loading, error, cached, refetch: fetchTicker };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📖 Order Book Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useOrderBook(options: UseExchangeDataOptions & { limit?: number }) {
  const { exchange, symbol, limit = 100, enabled = true, refreshInterval = 500, priority = 'normal' } = options;
  
  const [data, setData] = useState<OrderBook | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrderBook = useCallback(async () => {
    if (!enabled) return;

    try {
      const url = `/api/exchanges/orderbook?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&limit=${limit}&priority=${priority}`;
      const response = await fetch(url);
      const result: ApiResponse<OrderBook> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setCached(result.cached || false);
        setError(null);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [exchange, symbol, limit, enabled, priority]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    if (!enabled) return;

    fetchOrderBook();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchOrderBook, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchOrderBook, refreshInterval, enabled]);

  return { data, loading, error, cached, refetch: fetchOrderBook };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📈 OHLCV Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useOHLCV(options: UseExchangeDataOptions & { timeframe?: string; limit?: number }) {
  const { exchange, symbol, timeframe = '1h', limit = 100, enabled = true, refreshInterval = 5000, priority = 'normal' } = options;
  
  const [data, setData] = useState<OHLCV[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOHLCV = useCallback(async () => {
    if (!enabled) return;

    try {
      const url = `/api/exchanges/ohlcv?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}&priority=${priority}`;
      const response = await fetch(url);
      const result: ApiResponse<OHLCV[]> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setCached(result.cached || false);
        setError(null);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [exchange, symbol, timeframe, limit, enabled, priority]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    if (!enabled) return;

    fetchOHLCV();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchOHLCV, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchOHLCV, refreshInterval, enabled]);

  return { data, loading, error, cached, refetch: fetchOHLCV };
}

// ═══════════════════════════════════════════════════════════════════════════
// 💱 Trades Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useTrades(options: UseExchangeDataOptions & { limit?: number }) {
  const { exchange, symbol, limit = 50, enabled = true, refreshInterval = 1000, priority = 'normal' } = options;
  
  const [data, setData] = useState<Trade[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!enabled) return;

    try {
      const url = `/api/exchanges/trades?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&limit=${limit}&priority=${priority}`;
      const response = await fetch(url);
      const result: ApiResponse<Trade[]> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setCached(result.cached || false);
        setError(null);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [exchange, symbol, limit, enabled, priority]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    if (!enabled) return;

    fetchTrades();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchTrades, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTrades, refreshInterval, enabled]);

  return { data, loading, error, cached, refetch: fetchTrades };
}
