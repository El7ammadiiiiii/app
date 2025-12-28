// ═══════════════════════════════════════════════════════════════
// NEXUS Technical Analysis - React Hook
// ═══════════════════════════════════════════════════════════════
// Custom hook for using Python analysis API in React components
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  analysisAPI,
  OHLCVData,
  IndicatorConfig,
  PatternConfig,
  TrendlineConfig,
  AnalysisResponse,
  IndicatorResult,
  PatternResult,
  Signal,
  candlesToOHLCV,
  createDefaultIndicatorConfig,
  createDefaultPatternConfig,
  createDefaultTrendlineConfig
} from '@/lib/analysis-api';


// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface UseAnalysisOptions {
  autoAnalyze?: boolean;
  refreshInterval?: number;  // ms, 0 = disabled
  defaultIndicators?: IndicatorConfig;
  defaultPatterns?: PatternConfig;
  defaultTrendlines?: TrendlineConfig;
}

export interface UseAnalysisReturn {
  // State
  isLoading: boolean;
  isApiAvailable: boolean;
  error: string | null;
  
  // Results
  indicators: Record<string, IndicatorResult> | null;
  patterns: {
    bullish: PatternResult[];
    bearish: PatternResult[];
    neutral: PatternResult[];
  } | null;
  trendlines: AnalysisResponse['trendlines'] | null;
  signals: Signal[];
  lastUpdated: Date | null;
  
  // Configs
  indicatorConfig: IndicatorConfig;
  patternConfig: PatternConfig;
  trendlineConfig: TrendlineConfig;
  
  // Actions
  analyze: (ohlcv: OHLCVData) => Promise<void>;
  setIndicatorConfig: (config: IndicatorConfig) => void;
  setPatternConfig: (config: PatternConfig) => void;
  setTrendlineConfig: (config: TrendlineConfig) => void;
  toggleIndicator: (key: keyof IndicatorConfig) => void;
  togglePattern: (key: keyof PatternConfig) => void;
  toggleTrendline: (key: keyof TrendlineConfig) => void;
  clearResults: () => void;
  checkApiHealth: () => Promise<boolean>;
}


// ═══════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════

export function useAnalysis(options: UseAnalysisOptions = {}): UseAnalysisReturn {
  const {
    autoAnalyze = false,
    refreshInterval = 0,
    defaultIndicators = createDefaultIndicatorConfig(),
    defaultPatterns = createDefaultPatternConfig(),
    defaultTrendlines = createDefaultTrendlineConfig()
  } = options;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [indicators, setIndicators] = useState<Record<string, IndicatorResult> | null>(null);
  const [patterns, setPatterns] = useState<{
    bullish: PatternResult[];
    bearish: PatternResult[];
    neutral: PatternResult[];
  } | null>(null);
  const [trendlines, setTrendlines] = useState<AnalysisResponse['trendlines'] | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Configs
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>(defaultIndicators);
  const [patternConfig, setPatternConfig] = useState<PatternConfig>(defaultPatterns);
  const [trendlineConfig, setTrendlineConfig] = useState<TrendlineConfig>(defaultTrendlines);
  
  // Refs
  const ohlcvRef = useRef<OHLCVData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const available = await analysisAPI.healthCheck();
      setIsApiAvailable(available);
    };
    checkHealth();
  }, []);

  // Analyze function
  const analyze = useCallback(async (ohlcv: OHLCVData) => {
    if (!isApiAvailable) {
      setError('Python API is not available. Please start the server.');
      return;
    }

    setIsLoading(true);
    setError(null);
    ohlcvRef.current = ohlcv;

    try {
      const response = await analysisAPI.analyze({
        ohlcv,
        indicators: indicatorConfig,
        patterns: patternConfig,
        trendlines: trendlineConfig
      });

      if (response.success) {
        setIndicators(response.indicators || null);
        setPatterns(response.patterns || null);
        setTrendlines(response.trendlines || null);
        setSignals(response.signals || []);
        setLastUpdated(new Date());
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isApiAvailable, indicatorConfig, patternConfig, trendlineConfig]);

  // Toggle functions
  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicatorConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const togglePattern = useCallback((key: keyof PatternConfig) => {
    setPatternConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const toggleTrendline = useCallback((key: keyof TrendlineConfig) => {
    setTrendlineConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setIndicators(null);
    setPatterns(null);
    setTrendlines(null);
    setSignals([]);
    setLastUpdated(null);
    setError(null);
  }, []);

  // Check API health
  const checkApiHealth = useCallback(async () => {
    const available = await analysisAPI.healthCheck();
    setIsApiAvailable(available);
    return available;
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && ohlcvRef.current && autoAnalyze) {
      intervalRef.current = setInterval(() => {
        if (ohlcvRef.current) {
          analyze(ohlcvRef.current);
        }
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, autoAnalyze, analyze]);

  return {
    // State
    isLoading,
    isApiAvailable,
    error,
    
    // Results
    indicators,
    patterns,
    trendlines,
    signals,
    lastUpdated,
    
    // Configs
    indicatorConfig,
    patternConfig,
    trendlineConfig,
    
    // Actions
    analyze,
    setIndicatorConfig,
    setPatternConfig,
    setTrendlineConfig,
    toggleIndicator,
    togglePattern,
    toggleTrendline,
    clearResults,
    checkApiHealth
  };
}


// ═══════════════════════════════════════════════════════════════
// SPECIALIZED HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Hook for indicator-only analysis
 */
export function useIndicators(defaultConfig?: IndicatorConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, IndicatorResult> | null>(null);
  const [config, setConfig] = useState<IndicatorConfig>(
    defaultConfig || createDefaultIndicatorConfig()
  );

  const calculate = useCallback(async (ohlcv: OHLCVData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analysisAPI.calculateIndicators(ohlcv, config);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculating indicators');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const toggle = useCallback((key: keyof IndicatorConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { isLoading, error, results, config, setConfig, calculate, toggle };
}

/**
 * Hook for pattern-only analysis
 */
export function usePatterns(defaultConfig?: PatternConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    bullish: PatternResult[];
    bearish: PatternResult[];
    neutral: PatternResult[];
  } | null>(null);
  const [config, setConfig] = useState<PatternConfig>(
    defaultConfig || createDefaultPatternConfig()
  );

  const detect = useCallback(async (ohlcv: OHLCVData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analysisAPI.detectPatterns(ohlcv, config);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error detecting patterns');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const toggle = useCallback((key: keyof PatternConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { isLoading, error, results, config, setConfig, detect, toggle };
}

/**
 * Hook for trendline-only analysis
 */
export function useTrendlines(defaultConfig?: TrendlineConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResponse['trendlines'] | null>(null);
  const [config, setConfig] = useState<TrendlineConfig>(
    defaultConfig || createDefaultTrendlineConfig()
  );

  const analyze = useCallback(async (ohlcv: OHLCVData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analysisAPI.analyzeTrendlines(ohlcv, config);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing trendlines');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const toggle = useCallback((key: keyof TrendlineConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { isLoading, error, results, config, setConfig, analyze, toggle };
}

/**
 * Hook for live exchange analysis
 */
export function useLiveAnalysis(
  exchange: string,
  symbol: string,
  timeframe: string,
  refreshInterval: number = 60000  // 1 minute default
) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisResponse & { current_price: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await analysisAPI.getLiveAnalysis(exchange, symbol, timeframe);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching live data');
    } finally {
      setIsLoading(false);
    }
  }, [exchange, symbol, timeframe]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval]);

  return { isLoading, error, data, refresh: fetchData };
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { candlesToOHLCV };
export type { OHLCVData, IndicatorConfig, PatternConfig, TrendlineConfig };
