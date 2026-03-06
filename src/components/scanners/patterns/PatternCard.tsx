'use client';

/**
 * 🔷 Pattern Card with Embedded Lightweight Chart
 * 
 * Fetches OHLCV candles and renders backend-provided pattern lines.
 * No local pattern detection is executed in the browser.
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { RefreshCw } from 'lucide-react';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface PatternCardData {
  symbol: string;
  exchange: string;
  timeframe: string;
  pattern?: BackendPattern | null;
}

export type PatternDirection = 'bullish' | 'bearish' | 'neutral';

export interface BackendPattern {
  type: string;
  name: string;
  nameAr?: string;
  direction: PatternDirection;
  confidence: number;
  startIdx: number;
  endIdx: number;
  upperLine: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    slope?: number;
    touches?: number;
  };
  lowerLine: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    slope?: number;
    touches?: number;
  };
}

interface PatternCardProps {
  data: PatternCardData;
  /** Called after detection completes with the result (or null) */
  onPatternDetected?: (symbol: string, pattern: BackendPattern | null) => void;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Direction badge styling
function getDirectionBadge(direction: PatternDirection) {
  switch (direction) {
    case 'bullish':
      return { text: 'BULLISH', bg: 'bg-emerald-500/20', color: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'bearish':
      return { text: 'BEARISH', bg: 'bg-rose-500/20', color: 'text-rose-400', border: 'border-rose-500/30' };
    default:
      return { text: 'NEUTRAL', bg: 'bg-amber-500/20', color: 'text-amber-400', border: 'border-amber-500/30' };
  }
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function PatternCard({ data, onPatternDetected }: PatternCardProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(Boolean(data.pattern));

  // ── Fetch OHLCV ──
  const fetchCandles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const symbol = data.symbol.replace('/', '');
      const response = await fetch(
        `/api/ohlcv?symbol=${symbol}&exchange=${data.exchange}&interval=${data.timeframe}&limit=200`
      );
      if (!response.ok) throw new Error('Failed to fetch');

      const result = await response.json();
      if (result.data && Array.isArray(result.data)) {
        const formatted = result.data
          .map((c: any) => ({
            time: Math.floor(c.timestamp / 1000),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
          .sort((a: Candle, b: Candle) => a.time - b.time)
          .filter((c: Candle, i: number, arr: Candle[]) => i === 0 || c.time > arr[i - 1].time);

        setCandles(formatted);
      }
    } catch (err) {
      console.error('PatternCard fetch error:', err);
      setError('Error');
    } finally {
      setIsLoading(false);
    }
  }, [data.symbol, data.exchange, data.timeframe]);

  // Initial fetch
  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // ── Detect pattern & draw chart ──
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Need at least 50 candles
    if (candles.length < 50) {
      setVisible(false);
      onPatternDetected?.(data.symbol, null);
      return;
    }

    // Backend-only mode: card renders only if a precomputed pattern exists.
    const bestPattern = data.pattern;
    if (!bestPattern) {
      setVisible(false);
      onPatternDetected?.(data.symbol, null);
      return;
    }

    setVisible(true);
    onPatternDetected?.(data.symbol, bestPattern);

    // ── Create chart ──
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 180,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 9,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        visible: false,
        rightOffset: 12,
      },
      handleScale: false,
      handleScroll: false,
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeries.setData(candles as any);

    // ── Draw pattern lines ──
    const drawPatternLine = (line: typeof bestPattern.upperLine, color: string) => {
      const si = Math.max(0, Math.min(line.x1, candles.length - 1));
      const ei = Math.max(0, Math.min(line.x2, candles.length - 1));
      if (si >= candles.length || ei >= candles.length) return;
      const t1 = candles[si]?.time;
      const t2 = candles[ei]?.time;
      if (!t1 || !t2 || t1 === t2) return;

      const lineSeries = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        lineStyle: 0,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const lineData = [
        { time: t1, value: line.y1 },
        { time: t2, value: line.y2 },
      ].sort((a, b) => a.time - b.time);

      lineSeries.setData(lineData as any);
    };

    // Upper line color: rising=green, flat/falling=red
    const upperColor = (bestPattern.upperLine.slope ?? 0) >= 0 ? '#10b981' : '#ef4444';
    const lowerColor = (bestPattern.lowerLine.slope ?? 0) >= 0 ? '#10b981' : '#ef4444';
    drawPatternLine(bestPattern.upperLine, upperColor);
    drawPatternLine(bestPattern.lowerLine, lowerColor);

    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, data.pattern, data.symbol, onPatternDetected]);

  // Badge
  const badge = useMemo(() => {
    if (!data.pattern) return getDirectionBadge('neutral');
    return getDirectionBadge(data.pattern.direction);
  }, [data.pattern]);

  // Price
  const formattedPrice = useMemo(() => {
    if (candles.length === 0) return '--';
    const last = candles[candles.length - 1].close;
    return last >= 1
      ? last.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : last.toFixed(6);
  }, [candles]);

  // Don't render if no pattern and not loading
  if (!visible && !isLoading) return null;

  return (
    <div className={`rounded-xl overflow-hidden bg-[#0d1514] border ${badge.border} hover:border-opacity-60 transition-all duration-300`}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{data.symbol}</span>
            {data.pattern && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color}`}>
              {badge.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase">{data.exchange}</span>
          <span className="text-[10px] text-cyan-400 font-mono">{data.timeframe}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); fetchCandles(); }}
          className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Chart */}
      <div className="relative h-[180px]">
        {isLoading && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1514]">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}
        {error && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1514]">
            <span className="text-rose-400 text-xs">{error}</span>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {data.pattern && (
            <span className="text-[11px] text-cyan-400 font-medium truncate max-w-[180px]">
              {data.pattern.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data.pattern && (
            <span className="text-[10px] text-gray-500">
              conf: <span className="text-cyan-300 font-mono">{data.pattern.confidence}%</span>
            </span>
          )}
          <span className="text-xs text-gray-400 font-mono">${formattedPrice}</span>
        </div>
      </div>
    </div>
  );
}

export default PatternCard;
