/**
 * Shared Types for Chart Components
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTheme = 'light' | 'dark';

export interface ChartIndicatorSettings {
  // Moving Averages
  sma10?: boolean;
  sma25?: boolean;
  sma50?: boolean;
  sma100?: boolean;
  sma200?: boolean;
  ema10?: boolean;
  ema25?: boolean;
  ema50?: boolean;
  ema100?: boolean;
  ema200?: boolean;
  
  // Bands
  bollingerBands?: boolean;
  keltner?: boolean;
  donchian?: boolean;
  atrBands?: boolean;
  
  // ... other indicators
  [key: string]: boolean | undefined;
}
