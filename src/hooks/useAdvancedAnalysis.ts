/**
 * Advanced Analysis Hook
 * Uses the internal analysis engine for enhanced trend detection
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  analyzeTimeframe, 
  analyzeMultiTimeframe,
  type FullAnalysis,
  type TrendStrength,
  type OHLCVData,
  type TimeframeData 
} from '@/lib/analysis/engine';

const TIMEFRAMES = ['15m', '1h', '4h', '1d', '3d'] as const;
type Timeframe = typeof TIMEFRAMES[number];

interface TimeframeAnalysis {
  data: OHLCVData;
  analysis: FullAnalysis;
}

export interface MultiTimeframeResult {
  timeframes: Record<string, TimeframeAnalysis>;
  combined: TrendStrength;
  recommendation: string;
  priceInfo: {
    price: number;
    change24h: number;
  };
  loading: boolean;
  error: string | null;
}

/**
 * Hook for advanced multi-timeframe analysis
 */
export function useAdvancedAnalysis(
  symbol: string,
  exchange: string = 'binance'
): MultiTimeframeResult {
  const [result, setResult] = useState<MultiTimeframeResult>({
    timeframes: {},
    combined: {
      bullishScore: 50,
      bearishScore: 50,
      trend: 'neutral',
      strength: 0,
      confidence: 0
    },
    recommendation: 'انتظار',
    priceInfo: { price: 0, change24h: 0 },
    loading: true,
    error: null
  });

  const fetchAndAnalyze = useCallback(async () => {
    try {
      const exchangeParam = exchange === 'all' ? 'binance' : exchange;
      
      // Fetch all timeframes in parallel
      const timeframeResults = await Promise.all(
        TIMEFRAMES.map(async (tf) => {
          try {
            const response = await fetch(
              `/api/ohlcv?symbol=${symbol}&interval=${tf}&limit=500&exchange=${exchangeParam}`
            );
            
            if (!response.ok) throw new Error(`Failed to fetch ${tf}`);
            
            const result = await response.json();
            const rawData = result.data || [];
            
            // Transform to OHLCVData format
            const ohlcv: OHLCVData = {
              open: rawData.map((d: { open?: number } | number[]) => 
                Array.isArray(d) ? d[1] : (d.open ?? 0)
              ),
              high: rawData.map((d: { high?: number } | number[]) => 
                Array.isArray(d) ? d[2] : (d.high ?? 0)
              ),
              low: rawData.map((d: { low?: number } | number[]) => 
                Array.isArray(d) ? d[3] : (d.low ?? 0)
              ),
              close: rawData.map((d: { close?: number } | number[]) => 
                Array.isArray(d) ? d[4] : (d.close ?? 0)
              ),
              volume: rawData.map((d: { volume?: number } | number[]) => 
                Array.isArray(d) ? d[5] : (d.volume ?? 0)
              ),
              timestamp: rawData.map((d: { timestamp?: number } | number[]) => 
                Array.isArray(d) ? d[0] : (d.timestamp ?? 0)
              ),
            };
            
            // Run analysis
            const analysis = analyzeTimeframe(ohlcv, symbol, tf);
            
            return { 
              tf, 
              data: ohlcv, 
              analysis,
              success: true 
            };
          } catch (err) {
            console.error(`Error analyzing ${symbol} ${tf}:`, err);
            return { 
              tf, 
              data: null, 
              analysis: null, 
              success: false 
            };
          }
        })
      );

      // Build timeframes record
      const timeframes: Record<string, TimeframeAnalysis> = {};
      const timeframeData: TimeframeData[] = [];
      
      for (const r of timeframeResults) {
        if (r.success && r.data && r.analysis) {
          timeframes[r.tf] = {
            data: r.data,
            analysis: r.analysis
          };
          timeframeData.push({
            timeframe: r.tf,
            data: r.data
          });
        }
      }

      // Run multi-timeframe analysis
      const multiResult = analyzeMultiTimeframe(timeframeData, symbol);

      // Calculate price info from daily data
      const dailyData = timeframes['1d']?.data;
      let price = 0;
      let change24h = 0;
      
      if (dailyData && dailyData.close.length > 0) {
        price = dailyData.close[dailyData.close.length - 1];
        const prevPrice = dailyData.close.length > 1 
          ? dailyData.close[dailyData.close.length - 2] 
          : price;
        change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
      }

      setResult({
        timeframes,
        combined: multiResult.combined,
        recommendation: multiResult.recommendation,
        priceInfo: { price, change24h },
        loading: false,
        error: null
      });

    } catch (err) {
      console.error(`Error in advanced analysis for ${symbol}:`, err);
      setResult(prev => ({
        ...prev,
        loading: false,
        error: String(err)
      }));
    }
  }, [symbol, exchange]);

  useEffect(() => {
    setResult(prev => ({ ...prev, loading: true, error: null }));
    fetchAndAnalyze();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchAndAnalyze, 60000);
    return () => clearInterval(interval);
  }, [fetchAndAnalyze]);

  return result;
}

/**
 * Hook for single timeframe detailed analysis
 */
export function useDetailedAnalysis(
  symbol: string,
  timeframe: string = '1d',
  exchange: string = 'binance'
): {
  data: OHLCVData | null;
  analysis: FullAnalysis | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<OHLCVData | null>(null);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndAnalyze = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const exchangeParam = exchange === 'all' ? 'binance' : exchange;
      const response = await fetch(
        `/api/ohlcv?symbol=${symbol}&interval=${timeframe}&limit=500&exchange=${exchangeParam}`
      );
      
      if (!response.ok) throw new Error(`Failed to fetch data`);
      
      const result = await response.json();
      const rawData = result.data || [];
      
      // Transform to OHLCVData format
      const ohlcv: OHLCVData = {
        open: rawData.map((d: { open?: number } | number[]) => 
          Array.isArray(d) ? d[1] : (d.open ?? 0)
        ),
        high: rawData.map((d: { high?: number } | number[]) => 
          Array.isArray(d) ? d[2] : (d.high ?? 0)
        ),
        low: rawData.map((d: { low?: number } | number[]) => 
          Array.isArray(d) ? d[3] : (d.low ?? 0)
        ),
        close: rawData.map((d: { close?: number } | number[]) => 
          Array.isArray(d) ? d[4] : (d.close ?? 0)
        ),
        volume: rawData.map((d: { volume?: number } | number[]) => 
          Array.isArray(d) ? d[5] : (d.volume ?? 0)
        ),
        timestamp: rawData.map((d: { timestamp?: number } | number[]) => 
          Array.isArray(d) ? d[0] : (d.timestamp ?? 0)
        ),
      };
      
      setData(ohlcv);
      
      // Run analysis
      const analysisResult = analyzeTimeframe(ohlcv, symbol, timeframe);
      setAnalysis(analysisResult);
      
    } catch (err) {
      console.error(`Error in detailed analysis:`, err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, exchange]);

  useEffect(() => {
    fetchAndAnalyze();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchAndAnalyze, 60000);
    return () => clearInterval(interval);
  }, [fetchAndAnalyze]);

  return { data, analysis, loading, error, refetch: fetchAndAnalyze };
}

/**
 * Transform analysis to simple format for existing components
 */
export function toSimpleTrendStrength(analysis: FullAnalysis | null): {
  bullishScore: number;
  bearishScore: number;
  overallTrend: string;
  indicators: {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  }[];
} | null {
  if (!analysis) return null;
  
  const indicators = [
    ...analysis.signals.buySignals.map(s => ({
      name: s.indicator,
      signal: 'bullish' as const,
      strength: s.strength
    })),
    ...analysis.signals.sellSignals.map(s => ({
      name: s.indicator,
      signal: 'bearish' as const,
      strength: s.strength
    }))
  ];
  
  return {
    bullishScore: analysis.trendStrength.bullishScore,
    bearishScore: analysis.trendStrength.bearishScore,
    overallTrend: analysis.trendStrength.trend,
    indicators
  };
}
