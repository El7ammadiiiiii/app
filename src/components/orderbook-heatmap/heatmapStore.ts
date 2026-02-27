// ========================================
// Zustand Store for Order Book Heatmap
// ========================================

import { create } from 'zustand';
import { DEFAULT_EXCHANGES, HeatmapSensitivity, HeatmapColumn, HeatmapTrade, VPVRLevel, SnapshotMetadata } from './types';

interface HeatmapState {
  // === Settings ===
  selectedExchanges: string[];
  selectedSymbol: string;
  sensitivity: HeatmapSensitivity;
  grouping: number | 'auto';
  resolvedGrouping: number;
  showVPVR: boolean;
  showTrades: boolean;

  // === Viewport ===
  priceMin: number;
  priceMax: number;
  autoFitPrice: boolean;  // auto-adjust price range to data

  // === Data ===
  columns: HeatmapColumn[];
  trades: HeatmapTrade[];
  vpvrLevels: VPVRLevel[];
  latestMetadata: SnapshotMetadata | null;

  // === Status ===
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  exchangeCount: number;  // number of exchanges with data
  lastUpdateTime: number;
  fps: number;

  // === Actions ===
  setSelectedExchanges: (exchanges: string[]) => void;
  toggleExchange: (exchange: string) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSensitivity: (sensitivity: HeatmapSensitivity) => void;
  setGrouping: (grouping: number | 'auto') => void;
  setResolvedGrouping: (grouping: number) => void;
  setShowVPVR: (show: boolean) => void;
  setShowTrades: (show: boolean) => void;
  setPriceRange: (min: number, max: number) => void;
  setAutoFitPrice: (fit: boolean) => void;
  addColumn: (column: HeatmapColumn) => void;
  setTrades: (trades: HeatmapTrade[]) => void;
  setVPVRLevels: (levels: VPVRLevel[]) => void;
  setLatestMetadata: (metadata: SnapshotMetadata) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setExchangeCount: (count: number) => void;
  setFps: (fps: number) => void;
  reset: () => void;
}

const MAX_COLUMNS = 1000; // Ring buffer size

export const useHeatmapStore = create<HeatmapState>((set, get) => ({
  // === Settings ===
  selectedExchanges: [...DEFAULT_EXCHANGES],
  selectedSymbol: 'BTCUSDT',
  sensitivity: { min: 0, max: 50 },
  grouping: 'auto',
  resolvedGrouping: 10,
  showVPVR: true,
  showTrades: true,

  // === Viewport ===
  priceMin: 0,
  priceMax: 100000,
  autoFitPrice: true,

  // === Data ===
  columns: [],
  trades: [],
  vpvrLevels: [],
  latestMetadata: null,

  // === Status ===
  isConnected: false,
  isLoading: false,
  error: null,
  exchangeCount: 0,
  lastUpdateTime: 0,
  fps: 0,

  // === Actions ===
  setSelectedExchanges: (exchanges) => set({ selectedExchanges: exchanges }),

  toggleExchange: (exchange) => {
    const { selectedExchanges } = get();
    const idx = selectedExchanges.indexOf(exchange);
    if (idx >= 0) {
      if (selectedExchanges.length <= 1) return; // keep at least one
      set({ selectedExchanges: selectedExchanges.filter((_, i) => i !== idx) });
    } else {
      set({ selectedExchanges: [...selectedExchanges, exchange] });
    }
  },

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol, columns: [], trades: [], vpvrLevels: [] }),

  setSensitivity: (sensitivity) => set({ sensitivity }),

  setGrouping: (grouping) => set({ grouping }),

  setResolvedGrouping: (grouping) => set({ resolvedGrouping: grouping }),

  setShowVPVR: (show) => set({ showVPVR: show }),

  setShowTrades: (show) => set({ showTrades: show }),

  setPriceRange: (min, max) => set({ priceMin: min, priceMax: max }),

  setAutoFitPrice: (fit) => set({ autoFitPrice: fit }),

  addColumn: (column) => {
    const { columns, autoFitPrice } = get();
    const newColumns = [...columns, column];

    // Ring buffer: remove oldest if over limit
    if (newColumns.length > MAX_COLUMNS) {
      newColumns.splice(0, newColumns.length - MAX_COLUMNS);
    }

    const update: Partial<HeatmapState> = {
      columns: newColumns,
      lastUpdateTime: Date.now(),
    };

    // Auto-fit price range
    if (autoFitPrice && column.metadata) {
      const padding = (column.metadata.maxPrice - column.metadata.minPrice) * 0.05;
      update.priceMin = column.metadata.minPrice - padding;
      update.priceMax = column.metadata.maxPrice + padding;
    }

    set(update);
  },

  setTrades: (trades) => set({ trades }),
  setVPVRLevels: (levels) => set({ vpvrLevels: levels }),
  setLatestMetadata: (metadata) => set({ latestMetadata: metadata }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setExchangeCount: (count) => set({ exchangeCount: count }),
  setFps: (fps) => set({ fps }),

  reset: () =>
    set({
      columns: [],
      trades: [],
      vpvrLevels: [],
      latestMetadata: null,
      isConnected: false,
      error: null,
      exchangeCount: 0,
    }),
}));
