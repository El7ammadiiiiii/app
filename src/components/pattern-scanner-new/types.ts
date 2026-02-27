export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Pivot {
  index: number;
  price: number;
  dir: number; // 1 for high, -1 for low
  level: number;
  ratio?: number;
}

export interface RegressionLine {
  slope: number;
  intercept: number;
  r2: number;
}

export interface PatternBreakout {
  detected: boolean;
  index: number;
  price: number;
}

export interface DetectedPattern {
  valid: boolean;
  name: string;
  type?: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  pivots: Pivot[];
  confidence: number;
  level: number;
  timestamp: number;
  symbol?: string;
  exchange?: string;
  timeframe?: string;
  candles?: OHLCV[];
  indicatorValues?: number[];
  pole?: {
    start: Pivot;
    end: Pivot;
  };
  regression?: {
    high: RegressionLine;
    low: RegressionLine;
  };
  breakout?: PatternBreakout;
  status?: 'forming' | 'confirmed';
}

export interface ScannerConfig {
  numberOfPivots: number;
  errorRatio: number;
  flatRatio: number;
  flagRatio: number;
  checkBarRatio: boolean;
  barRatioLimit: number;
  avoidOverlap: boolean;
  applyAngleDiff: boolean;
  minAngleDiff: number;
  maxAngleDiff: number;
  maxPatterns: number;
  zigzags: Array<{
    enabled: boolean;
    length: number;
    depth: number;
  }>;
}
