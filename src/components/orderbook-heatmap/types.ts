// ========================================
// Order Book Heatmap — Type Definitions
// ========================================

/** Single price level in the order book */
export interface OrderBookLevel {
  price: number;
  amount: number;
}

/** Raw order book from an exchange */
export interface RawOrderBook {
  exchange: string;
  symbol: string;
  bids: [number, number][]; // [price, amount][]
  asks: [number, number][]; // [price, amount][]
  timestamp: number;
  isSnapshot: boolean;
}

/** Packed snapshot — compact binary-like representation for rendering */
export interface PackedSnapshot {
  basePrice: number;
  grouping: number;
  timestamp: number;
  bids: {
    steps: Int16Array;       // relative price offsets from basePrice (in grouping units)
    amounts: Float64Array;   // volume at each level
    cumAmounts: Float64Array; // cumulative volume
  };
  asks: {
    steps: Int16Array;
    amounts: Float64Array;
    cumAmounts: Float64Array;
  };
  minAmount: number;
  maxAmount: number;
  exchanges: string[];       // which exchanges contributed
}

/** Texture data ready for WebGL upload */
export interface TextureData {
  data: Float32Array;   // interleaved [price, amount, price, amount, ...]
  length: number;       // number of levels
  minPrice: number;
  maxPrice: number;
  minAmount: number;
  maxAmount: number;
}

/** Heatmap viewport state */
export interface HeatmapViewport {
  priceMin: number;
  priceMax: number;
  timeMin: number;
  timeMax: number;
}

/** Heatmap sensitivity config */
export interface HeatmapSensitivity {
  min: number;
  max: number;
}

/** Theme colors for the heatmap */
export interface HeatmapTheme {
  /** Base bid color (green) */
  bidColor: [number, number, number, number];
  /** Intense bid color (dark green) */
  bidColor2: [number, number, number, number];
  /** Base ask color (red) */
  askColor: [number, number, number, number];
  /** Intense ask color (dark red) */
  askColor2: [number, number, number, number];
  /** Background color */
  bgColor: [number, number, number, number];
  /** Text color */
  textColor: [number, number, number, number];
  /** Current price line color */
  priceLineColor: [number, number, number, number];
}

/** Default dark theme matching TapeSurf */
export const DEFAULT_THEME: HeatmapTheme = {
  bidColor:       [0.0, 0.6, 0.4, 1.0],   // green
  bidColor2:      [0.0, 0.9, 0.5, 1.0],   // bright green
  askColor:       [0.7, 0.15, 0.1, 1.0],  // red
  askColor2:      [1.0, 0.3, 0.1, 1.0],   // bright red/orange
  bgColor:        [0.078, 0.122, 0.122, 1.0], // teal dark (#141f1f)
  textColor:      [0.8, 0.8, 0.8, 1.0],   // light gray
  priceLineColor: [1.0, 0.85, 0.0, 1.0],  // yellow
};

/** Worker message types — Main → Worker */
export type WorkerInMessage =
  | { type: 'init'; exchanges: string[]; symbol: string; grouping: number | 'auto' }
  | { type: 'update'; exchange: string; symbol: string; bids: [number, number][]; asks: [number, number][]; isSnapshot: boolean; timestamp: number }
  | { type: 'setGrouping'; grouping: number | 'auto' }
  | { type: 'setExchanges'; exchanges: string[] };

/** Worker message types — Worker → Main */
export type WorkerOutMessage =
  | { type: 'snapshot'; textureData: Float32Array; metadata: SnapshotMetadata }
  | { type: 'history'; snapshots: SnapshotMetadata[] }
  | { type: 'error'; message: string };

/** Metadata accompanying each snapshot */
export interface SnapshotMetadata {
  timestamp: number;
  basePrice: number;
  grouping: number;
  bidLevels: number;
  askLevels: number;
  minAmount: number;
  maxAmount: number;
  minPrice: number;
  maxPrice: number;
  exchanges: string[];
  exchangeCount: number;
}

/** Column in the heatmap timeline */
export interface HeatmapColumn {
  timestamp: number;
  textureOffset: number;   // offset in the data texture
  metadata: SnapshotMetadata;
  textureData: Float32Array;
}

/** Trade for overlay */
export interface HeatmapTrade {
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}

/** VPVR level */
export interface VPVRLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  totalVolume: number;
}

/** Depth limit — only show levels within ±30% of midprice */
export const DEPTH_LIMIT_FACTOR = 0.3;

/** Max FPS cap */
export const MAX_FPS = 60;

/** Max snapshot history (ring buffer size) */
export const MAX_HISTORY = 1000;

/** Default exchanges for aggregation */
export const DEFAULT_EXCHANGES = [
  'bybit', 'mexc', 'coinbase', 'kucoin', 'okx', 'bitget',
  'bingx', 'phemex', 'htx', 'gateio', 'cryptocom', 'kraken'
] as const;

/** Exchange display names */
export const EXCHANGE_NAMES: Record<string, string> = {
  bybit: 'Bybit',
  mexc: 'MEXC',
  coinbase: 'Coinbase',
  kucoin: 'KuCoin',
  okx: 'OKX',
  bitget: 'Bitget',
  bingx: 'BingX',
  phemex: 'Phemex',
  htx: 'HTX',
  gateio: 'Gate.io',
  cryptocom: 'Crypto.com',
  kraken: 'Kraken',
};
