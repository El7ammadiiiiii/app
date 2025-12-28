// ═══════════════════════════════════════════════════════════════
// NEXUS Technical Analysis - API Client
// ═══════════════════════════════════════════════════════════════
// TypeScript client for Python analysis API
// ═══════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OHLCVData {
  timestamp: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface IndicatorConfig {
  supertrend?: boolean;
  bollinger_bands?: boolean;
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
  rsi?: boolean;
  stoch_rsi?: boolean;
  macd?: boolean;
  adx?: boolean;
  obv?: boolean;
}

export interface TrendlineConfig {
  trendlines?: boolean;
  horizontal_levels?: boolean;
  fibonacci_retracements?: boolean;
  vertical_resistance?: boolean;
  vertical_support?: boolean;
}

export interface PatternConfig {
  // Bullish
  ascending_channel?: boolean;
  ascending_triangle?: boolean;
  bull_flag?: boolean;
  bull_pennant?: boolean;
  continuation_falling_wedge?: boolean;
  descending_broadening_wedge?: boolean;
  reversal_falling_wedge?: boolean;
  // Bearish
  ascending_broadening_wedge?: boolean;
  bear_flag?: boolean;
  bear_pennant?: boolean;
  continuation_rising_wedge?: boolean;
  descending_channel?: boolean;
  descending_triangle?: boolean;
  reversal_rising_wedge?: boolean;
  // Neutral
  symmetrical_triangle?: boolean;
}

export interface AnalysisRequest {
  ohlcv: OHLCVData;
  indicators?: IndicatorConfig;
  trendlines?: TrendlineConfig;
  patterns?: PatternConfig;
}

export interface Signal {
  source: string;
  type: string;
  name?: string;
  price?: number;
  timestamp?: string | number;
  strength?: string;
  target?: number;
  stop_loss?: number;
  probability?: number;
}

export interface IndicatorResult {
  name: string;
  values: Record<string, number[]>;
  signals: Signal[];
  metadata: Record<string, unknown>;
}

export interface PatternResult {
  name: string;
  type: string;
  strength: string;
  start_index: number;
  end_index: number;
  points: Array<{ index: number; price: number; type?: string }>;
  target_price?: number;
  stop_loss?: number;
  probability: number;
  description: string;
}

export interface TrendlineResult {
  start: [number, number];
  end: [number, number];
  slope: number;
  intercept: number;
  touches: number;
  strength: number;
  type: string;
}

export interface FibonacciResult {
  swing_high: number;
  swing_low: number;
  direction: string;
  levels: Record<number, number>;
}

export interface AnalysisResponse {
  success: boolean;
  timestamp: string;
  symbol?: string;
  timeframe?: string;
  indicators?: Record<string, IndicatorResult>;
  trendlines?: {
    trendlines?: TrendlineResult[];
    horizontal_levels?: Array<{
      price: number;
      touches: number;
      strength: number;
      type: string;
      volume: number;
    }>;
    fibonacci?: FibonacciResult;
    vertical_resistance?: Array<{
      index: number;
      price: number;
      reversal_strength: number;
    }>;
    vertical_support?: Array<{
      index: number;
      price: number;
      reversal_strength: number;
    }>;
    price_channel?: {
      type: string;
      resistance_slope: number;
      support_slope: number;
      channel_width: number;
      current_resistance: number;
      current_support: number;
    };
  };
  patterns?: {
    bullish: PatternResult[];
    bearish: PatternResult[];
    neutral: PatternResult[];
  };
  signals?: Signal[];
  error?: string;
}


// ═══════════════════════════════════════════════════════════════
// API CLIENT CLASS
// ═══════════════════════════════════════════════════════════════

export class AnalysisAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const data = await response.json();
      return data.status === 'online';
    } catch {
      return false;
    }
  }

  /**
   * Perform full technical analysis
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Calculate specific indicators
   */
  async calculateIndicators(
    ohlcv: OHLCVData,
    config: IndicatorConfig
  ): Promise<Record<string, IndicatorResult>> {
    const response = await fetch(`${this.baseUrl}/indicators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ohlcv, config })
    });

    const data = await response.json();
    return data.indicators;
  }

  /**
   * Detect chart patterns
   */
  async detectPatterns(
    ohlcv: OHLCVData,
    config: PatternConfig
  ): Promise<{
    bullish: PatternResult[];
    bearish: PatternResult[];
    neutral: PatternResult[];
  }> {
    const response = await fetch(`${this.baseUrl}/patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ohlcv, config })
    });

    const data = await response.json();
    return data.patterns;
  }

  /**
   * Analyze trendlines and levels
   */
  async analyzeTrendlines(
    ohlcv: OHLCVData,
    config: TrendlineConfig
  ): Promise<AnalysisResponse['trendlines']> {
    const response = await fetch(`${this.baseUrl}/trendlines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ohlcv, config })
    });

    const data = await response.json();
    return data.trendlines;
  }

  /**
   * Get live analysis from exchange
   */
  async getLiveAnalysis(
    exchange: string,
    symbol: string,
    timeframe: string,
    limit: number = 200
  ): Promise<AnalysisResponse & { current_price: number }> {
    const response = await fetch(
      `${this.baseUrl}/live/${exchange}/${symbol}/${timeframe}?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get available indicators info
   */
  async getAvailableIndicators(): Promise<{
    overlay_indicators: Array<{ id: string; name: string; category: string }>;
    panel_indicators: Array<{ id: string; name: string; category: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/info/indicators`);
    return response.json();
  }

  /**
   * Get available patterns info
   */
  async getAvailablePatterns(): Promise<{
    bullish: Array<{ id: string; name: string }>;
    bearish: Array<{ id: string; name: string }>;
    neutral: Array<{ id: string; name: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/info/patterns`);
    return response.json();
  }
}


// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert candlestick array to OHLCV format
 */
export function candlesToOHLCV(
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>
): OHLCVData {
  return {
    timestamp: candles.map(c => c.time),
    open: candles.map(c => c.open),
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    volume: candles.map(c => c.volume || 0)
  };
}

/**
 * Convert Binance klines to OHLCV format
 */
export function binanceKlinesToOHLCV(
  klines: Array<[number, string, string, string, string, string, ...unknown[]]>
): OHLCVData {
  return {
    timestamp: klines.map(k => k[0]),
    open: klines.map(k => parseFloat(k[1])),
    high: klines.map(k => parseFloat(k[2])),
    low: klines.map(k => parseFloat(k[3])),
    close: klines.map(k => parseFloat(k[4])),
    volume: klines.map(k => parseFloat(k[5]))
  };
}

/**
 * Create default indicator config
 */
export function createDefaultIndicatorConfig(): IndicatorConfig {
  return {
    supertrend: false,
    bollinger_bands: false,
    sma10: false,
    sma25: false,
    sma50: true,
    sma100: false,
    sma200: true,
    ema10: false,
    ema25: false,
    ema50: false,
    ema100: false,
    ema200: false,
    rsi: true,
    stoch_rsi: false,
    macd: true,
    adx: true,
    obv: true
  };
}

/**
 * Create default pattern config
 */
export function createDefaultPatternConfig(): PatternConfig {
  return {
    ascending_channel: true,
    ascending_triangle: true,
    bull_flag: true,
    bull_pennant: true,
    continuation_falling_wedge: true,
    descending_broadening_wedge: true,
    reversal_falling_wedge: true,
    ascending_broadening_wedge: true,
    bear_flag: true,
    bear_pennant: true,
    continuation_rising_wedge: true,
    descending_channel: true,
    descending_triangle: true,
    reversal_rising_wedge: true,
    symmetrical_triangle: true
  };
}

/**
 * Create default trendline config
 */
export function createDefaultTrendlineConfig(): TrendlineConfig {
  return {
    trendlines: true,
    horizontal_levels: true,
    fibonacci_retracements: true,
    vertical_resistance: false,
    vertical_support: false
  };
}


// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

export const analysisAPI = new AnalysisAPI();

export default analysisAPI;
