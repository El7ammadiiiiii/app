/**
 * 🏪 Exchange Store - Zustand State Management
 * Global state for exchange data with WebSocket support
 */

'use client';

import { create } from 'zustand';
import type { ExchangeId, Ticker, OrderBook, Trade } from '@/lib/exchanges/types';

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Store Types
// ═══════════════════════════════════════════════════════════════════════════

interface WebSocketConnection {
  url: string;
  ws: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscriptions: Set<string>;
}

interface ExchangeStore {
  // Data state
  tickers: Record<string, Ticker>; // key: `${exchange}:${symbol}`
  orderBooks: Record<string, OrderBook>;
  trades: Record<string, Trade[]>;
  
  // WebSocket state
  connections: Record<ExchangeId, WebSocketConnection>;
  
  // Actions
  setTicker: (exchange: ExchangeId, symbol: string, ticker: Ticker) => void;
  setOrderBook: (exchange: ExchangeId, symbol: string, orderBook: OrderBook) => void;
  addTrade: (exchange: ExchangeId, symbol: string, trade: Trade) => void;
  
  // WebSocket actions
  connectWebSocket: (exchange: ExchangeId, url: string) => void;
  disconnectWebSocket: (exchange: ExchangeId) => void;
  subscribeToChannel: (exchange: ExchangeId, channel: string) => void;
  unsubscribeFromChannel: (exchange: ExchangeId, channel: string) => void;
  
  // Utility
  clear: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏪 Store Implementation
// ═══════════════════════════════════════════════════════════════════════════

export const useExchangeStore = create<ExchangeStore>((set, get) => ({
  // Initial state
  tickers: {},
  orderBooks: {},
  trades: {},
  connections: {} as Record<ExchangeId, WebSocketConnection>,

  // ═════════════════════════════════════════════════════════════════════════
  // 📊 Data Actions
  // ═════════════════════════════════════════════════════════════════════════

  setTicker: (exchange, symbol, ticker) => {
    const key = `${exchange}:${symbol}`;
    set((state) => ({
      tickers: {
        ...state.tickers,
        [key]: ticker,
      },
    }));
  },

  setOrderBook: (exchange, symbol, orderBook) => {
    const key = `${exchange}:${symbol}`;
    set((state) => ({
      orderBooks: {
        ...state.orderBooks,
        [key]: orderBook,
      },
    }));
  },

  addTrade: (exchange, symbol, trade) => {
    const key = `${exchange}:${symbol}`;
    set((state) => {
      const existingTrades = state.trades[key] || [];
      const newTrades = [trade, ...existingTrades].slice(0, 100); // Keep last 100 trades
      
      return {
        trades: {
          ...state.trades,
          [key]: newTrades,
        },
      };
    });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 🔌 WebSocket Actions
  // ═════════════════════════════════════════════════════════════════════════

  connectWebSocket: (exchange, url) => {
    const existingConnection = get().connections[exchange];
    
    // Close existing connection if any
    if (existingConnection?.ws) {
      existingConnection.ws.close();
    }

    // Create new WebSocket
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      
      set((state) => ({
        connections: {
          ...state.connections,
          [exchange]: {
            ...state.connections[exchange],
            status: 'connected',
          },
        },
      }));
    };

    ws.onclose = () => {
      
      set((state) => ({
        connections: {
          ...state.connections,
          [exchange]: {
            ...state.connections[exchange],
            status: 'disconnected',
          },
        },
      }));
    };

    ws.onerror = (error) => {
      console.error(`[${exchange}] WebSocket error:`, error);
      set((state) => ({
        connections: {
          ...state.connections,
          [exchange]: {
            ...state.connections[exchange],
            status: 'error',
          },
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types (you can customize this per exchange)
        if (data.type === 'ticker' && data.symbol) {
          get().setTicker(exchange, data.symbol, data);
        } else if (data.type === 'orderbook' && data.symbol) {
          get().setOrderBook(exchange, data.symbol, data);
        } else if (data.type === 'trade' && data.symbol) {
          get().addTrade(exchange, data.symbol, data);
        }
      } catch (error) {
        console.error(`[${exchange}] Failed to parse WebSocket message:`, error);
      }
    };

    // Save connection
    set((state) => ({
      connections: {
        ...state.connections,
        [exchange]: {
          url,
          ws,
          status: 'connecting',
          subscriptions: new Set(),
        },
      },
    }));
  },

  disconnectWebSocket: (exchange) => {
    const connection = get().connections[exchange];
    
    if (connection?.ws) {
      connection.ws.close();
    }

    set((state) => {
      const newConnections = { ...state.connections };
      delete newConnections[exchange];
      
      return {
        connections: newConnections,
      };
    });
  },

  subscribeToChannel: (exchange, channel) => {
    const connection = get().connections[exchange];
    
    if (connection?.ws && connection.status === 'connected') {
      connection.subscriptions.add(channel);
      
      // Send subscribe message (format depends on exchange)
      connection.ws.send(JSON.stringify({
        op: 'subscribe',
        args: [channel],
      }));
    }
  },

  unsubscribeFromChannel: (exchange, channel) => {
    const connection = get().connections[exchange];
    
    if (connection?.ws && connection.status === 'connected') {
      connection.subscriptions.delete(channel);
      
      // Send unsubscribe message (format depends on exchange)
      connection.ws.send(JSON.stringify({
        op: 'unsubscribe',
        args: [channel],
      }));
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 🧹 Utility
  // ═════════════════════════════════════════════════════════════════════════

  clear: () => {
    // Disconnect all WebSockets
    const connections = get().connections;
    Object.keys(connections).forEach((exchange) => {
      get().disconnectWebSocket(exchange as ExchangeId);
    });

    // Clear state
    set({
      tickers: {},
      orderBooks: {},
      trades: {},
      connections: {} as Record<ExchangeId, WebSocketConnection>,
    });
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// 🎣 Selector Hooks
// ═══════════════════════════════════════════════════════════════════════════

export function useTicker(exchange: ExchangeId, symbol: string) {
  return useExchangeStore((state) => state.tickers[`${exchange}:${symbol}`]);
}

export function useOrderBook(exchange: ExchangeId, symbol: string) {
  return useExchangeStore((state) => state.orderBooks[`${exchange}:${symbol}`]);
}

export function useTrades(exchange: ExchangeId, symbol: string) {
  return useExchangeStore((state) => state.trades[`${exchange}:${symbol}`] || []);
}

export function useWebSocketStatus(exchange: ExchangeId) {
  return useExchangeStore((state) => state.connections[exchange]?.status || 'disconnected');
}
