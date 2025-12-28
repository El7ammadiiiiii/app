// Pattern Types
export interface PatternResult {
  name: string;
  category: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  strength: 'strong' | 'medium' | 'weak';
  symbol?: string;
  timeframe?: string;
  formation_time: number;
  breakout_target: number | null;
  stop_loss: number | null;
  entry_price?: number;
  target_price?: number;
  risk_reward?: number;
  lines: TrendLine[];
  pivot_highs: [number, number][];
  pivot_lows: [number, number][];
  scores?: {
    line_quality: number;
    geometric: number;
    volume: number;
    position: number;
    context: number;
  };
  rendering_coords: unknown;
  volume_confirmation?: boolean;
  completion?: number;
  raw_pattern?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TrendLine {
  slope: number;
  intercept: number;
  touches: number[];
  quality_score: number;
  coords: [{ xAxis: number; yAxis: number }, { xAxis: number; yAxis: number }];
}

export interface ScannerConfig {
  categories: string[];
  minConfidence: number;
  strengthFilter: 'all' | 'strong' | 'medium' | 'weak';
  typeFilter: 'all' | 'bullish' | 'bearish' | 'neutral';
}
