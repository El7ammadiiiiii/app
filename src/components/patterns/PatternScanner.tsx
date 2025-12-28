"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Scan, TrendingUp, RefreshCw, Square } from 'lucide-react';
import PatternGrid from './PatternGrid';
import PatternFilters from './PatternFilters';
// Update the import path below to the correct relative path for your project structure.
// For example, if your types are in 'src/types/patterns.ts', use:
import { PatternResult, ScannerConfig } from '../../types/patterns';
import { getCategories } from '../../lib/indicators/patterns/registry';

interface PatternScannerProps {
  symbol?: string;
  timeframe?: string;
  autoScan?: boolean;
}

type OHLCVTuple = [number, number, number, number, number, number];

interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const isAbortError = (err: unknown): boolean => {
  if (err instanceof DOMException) return err.name === 'AbortError';
  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    return typeof name === 'string' && name === 'AbortError';
  }
  return false;
};

export default function PatternScanner({
  symbol = 'BTCUSDT',
  timeframe = '1h',
  autoScan = false
}: PatternScannerProps) {
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ohlcvData, setOhlcvData] = useState<OHLCVTuple[]>([]);
  const [ohlcvMap, setOhlcvMap] = useState<Record<string, OHLCVTuple[]>>({});
  const [symbols, setSymbols] = useState<{ value: string; display: string }[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState<boolean>(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeframe);
  
  // Draft state: user selections (editable, not applied until Scan pressed)
  const [draftConfig, setDraftConfig] = useState<ScannerConfig>({
    categories: ['all'],
    minConfidence: 80,
    strengthFilter: 'all',
    typeFilter: 'all',
  });
  
  const [stats, setStats] = useState({
    total: 0,
    bullish: 0,
    bearish: 0,
    neutral: 0,
    categoryBreakdown: {} as Record<string, number>
  });

  const abortRef = useRef<AbortController | null>(null);
  const cancelRef = useRef<boolean>(false);

  const selectedSymbolDisplay = useMemo(() => {
    if (selectedSymbol === '__ALL__') return 'All Binance USDT';
    if (selectedSymbol.includes('/')) return selectedSymbol;
    if (selectedSymbol.toUpperCase().endsWith('USDT')) {
      const base = selectedSymbol.toUpperCase().replace(/USDT$/i, '');
      return `${base}/USDT`;
    }
    return selectedSymbol;
  }, [selectedSymbol]);

  const loadSymbols = useCallback(async () => {
    setSymbolsLoading(true);
    try {
      const res = await fetch('/api/exchanges/markets?exchange=binance');
      const body = await res.json();
      const list: string[] = body?.data || [];
      const filtered = list.filter((s) => s.toUpperCase().endsWith('/USDT'));
      const mapped = filtered
        .map((s) => {
          const display = s.toUpperCase();
          const value = display.replace('/', '');
          return { display, value };
        })
        .sort((a, b) => a.display.localeCompare(b.display));
      setSymbols(mapped);
    } catch (err) {
      
    } finally {
      setSymbolsLoading(false);
    }
  }, []);

  const filterPatterns = useCallback((allPatterns: PatternResult[], filterConfig: ScannerConfig) => {
    return allPatterns.filter(pattern => {
      // Category filter
      if (!filterConfig.categories.includes('all') && 
          !filterConfig.categories.includes(pattern.category)) {
        return false;
      }
      
      // Confidence filter
      if (pattern.confidence < filterConfig.minConfidence) {
        return false;
      }
      
      // Strength filter
      if (filterConfig.strengthFilter !== 'all' && 
          pattern.strength !== filterConfig.strengthFilter) {
        return false;
      }
      
      // Type filter
      if (filterConfig.typeFilter !== 'all' && 
          pattern.type !== filterConfig.typeFilter) {
        return false;
      }
      
      return true;
    });
  }, []);

  const calculateStats = useCallback((patterns: PatternResult[], categoryBreakdown: Record<string, number>) => {
    const bullish = patterns.filter(p => p.type === 'bullish').length;
    const bearish = patterns.filter(p => p.type === 'bearish').length;
    const neutral = patterns.filter(p => p.type === 'neutral').length;
    
    setStats({
      total: patterns.length,
      bullish,
      bearish,
      neutral,
      categoryBreakdown
    });
  }, []);

  // Scan for patterns
  const scanPatterns = useCallback(async () => {
    setLoading(true);
    cancelRef.current = false;
    setError(null);
    setOhlcvMap({});
    
    try {
      const symbolsToScan = selectedSymbol === '__ALL__' ? symbols.map(s => s.value) : [selectedSymbol];
      const timeframesToScan = selectedTimeframe === '__ALL_TF__' ? ['15m','1h','4h','1d','3d'] : [selectedTimeframe];
      const aggregated: PatternResult[] = [];

      outer: for (const sym of symbolsToScan) {
        for (const tf of timeframesToScan) {
          if (cancelRef.current) break outer;
          const controller = new AbortController();
          abortRef.current = controller;

          // Fetch OHLCV data first - increased from 200 to 500 for better historical pattern visibility
          const ohlcvResponse = await fetch(
            `/api/ohlcv?symbol=${sym}&exchange=binance&interval=${tf}&limit=500`,
            { signal: controller.signal }
          );
          
          if (!ohlcvResponse.ok) {
            throw new Error(`Failed to fetch market data for ${sym} ${tf}`);
          }
          
          const ohlcvDataResp = await ohlcvResponse.json();
          
          const ohlcvArray: OHLCVTuple[] = (ohlcvDataResp.data || ohlcvDataResp).map((candle: OHLCVCandle) => [
            candle.timestamp,
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume
          ]);

          const key = `${sym}-${tf}`;
          setOhlcvMap(prev => ({ ...prev, [key]: ohlcvArray }));
          setOhlcvData(ohlcvArray);
          
          let scanResponse;
          try {
            scanResponse = await fetch('/api/patterns/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                symbol: sym,
                timeframe: tf,
                ohlcv: ohlcvArray
              }),
              signal: controller.signal,
            });
          } catch (fetchError) {
            if (isAbortError(fetchError) || cancelRef.current) {
              break outer;
            }
            
            setPatterns([]);
            setError('Pattern analysis server is not available. Start the Python server with: python python_analysis/run_server.py');
            setLoading(false);
            return;
          }
          
          if (!scanResponse.ok) {
            const errorData: unknown = await scanResponse.json().catch(() => undefined);
            const maybeObj = (typeof errorData === 'object' && errorData !== null) ? (errorData as Record<string, unknown>) : undefined;
            const details = String((maybeObj?.details ?? maybeObj?.error ?? '') as unknown);

            if (
              scanResponse.status === 503 ||
              details.toLowerCase().includes('fetch failed') ||
              details.toLowerCase().includes('not available')
            ) {
              setPatterns([]);
              setError(
                'Pattern analysis server is not available. Start the Python server with: python python_analysis/run_server.py (port 8001)'
              );
              setLoading(false);
              return;
            }

            setPatterns([]);
            setError(details || `Pattern scanning failed for ${sym} ${tf}`);
            setLoading(false);
            return;
          }
          
          const result = await scanResponse.json();
          const patternsWithMeta = (result.patterns || []).map((p: PatternResult) => ({
            ...p,
            symbol: sym,
            timeframe: tf,
          }));
          aggregated.push(...patternsWithMeta);
        }
      }

      const filteredPatterns = filterPatterns(aggregated, draftConfig);
      setPatterns(filteredPatterns);
      calculateStats(filteredPatterns, {});
      
    } catch (err) {
      if (isAbortError(err) || cancelRef.current) {
        setError('Scan stopped');
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
      // Avoid Next.js dev overlay spam from console.error for expected network conditions
      
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [calculateStats, draftConfig, filterPatterns, selectedSymbol, selectedTimeframe, symbols]);

  const stopScan = () => {
    cancelRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setLoading(false);
  };

  // Load symbols once on mount
  useEffect(() => {
    loadSymbols();
  }, [loadSymbols]);

  // Auto-scan when enabled and selection changes
  useEffect(() => {
    if (autoScan) {
      scanPatterns();
    }
  }, [selectedSymbol, selectedTimeframe, autoScan, scanPatterns]);

  // No auto-filtering on config change - filters only apply when Scan button pressed
  // This gives historical data display first, then filtering happens at user's command

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Pattern Scanner</h2>
            <p className="text-sm text-gray-400">
              77 patterns across {getCategories().length} categories • Real-time detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="__ALL__">All Binance USDT</option>
            {symbolsLoading && <option value="">Loading symbols...</option>}
            {!symbolsLoading && selectedSymbol && !symbols.find(s => s.value === selectedSymbol) && (
              <option value={selectedSymbol}>{selectedSymbolDisplay}</option>
            )}
            {symbols.map((s) => (
              <option key={s.value} value={s.value}>{s.display}</option>
            ))}
          </select>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="__ALL_TF__">All timeframes</option>
            {['15m','1h','4h','1d','3d'].map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
        
        <motion.button
          onClick={scanPatterns}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-xl transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Scan className="w-5 h-5" />
              Scan Patterns
            </>
          )}
        </motion.button>

        {loading && (
          <motion.button
            onClick={stopScan}
            className="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Square className="w-5 h-5" />
            Stop
          </motion.button>
        )}
      </div>

      {/* Stats Bar */}
      {stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4"
        >
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-sm text-gray-400">Total Patterns</div>
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-sm text-gray-400">Bullish</div>
            <div className="text-2xl font-bold text-green-400">{stats.bullish}</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-sm text-gray-400">Bearish</div>
            <div className="text-2xl font-bold text-red-400">{stats.bearish}</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-sm text-gray-400">Neutral</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.neutral}</div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <PatternFilters config={draftConfig} onChange={setDraftConfig} />

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Pattern Grid */}
      <PatternGrid 
        patterns={patterns} 
        loading={loading}
        symbol={selectedSymbol === '__ALL__' ? symbol : selectedSymbol}
        timeframe={selectedTimeframe === '__ALL_TF__' ? timeframe : selectedTimeframe}
        ohlcvData={ohlcvData}
        ohlcvMap={ohlcvMap}
      />
    </div>
  );
}
