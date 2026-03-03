'use client';

/**
 * 📈 Trendline Card with Embedded Chart
 * 
 * Displays candlestick chart with trendlines directly in the card.
 * Calculates trendlines locally from OHLCV data for accuracy.
 * 
 * @author CCWAYS Team
 * @version 3.0.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Star, RefreshCw } from 'lucide-react';
import { calculateTrendLines, TrendLine as LocalTrendLine } from '@/lib/trendlines';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface TrendLine {
  type: 'up' | 'down';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  strength: number;
  age_bars: number;
}

export interface TrendlineResult {
  id?: string;
  symbol: string;
  name: string;
  exchange: string;
  timeframe: string;
  price: number;
  filter_type: 'up' | 'down' | 'both' | 'none';
  lines: TrendLine[];
  line_count: number;
  detected_at: number;
}

interface TrendlineCardProps {
  trendline: TrendlineResult;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function TrendlineCard({
  trendline,
  isFavorite,
  onToggleFavorite,
}: TrendlineCardProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardId = trendline.id || `${trendline.symbol}-${trendline.timeframe}`;

  // Fetch OHLCV data
  const fetchCandles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const symbol = trendline.symbol.replace('/', '');
      const exchange = trendline.exchange || 'binance';
      const timeframe = trendline.timeframe || '1h';
      
      // MUST match scanner's 200 candles for correct index mapping
      const response = await fetch(
        `/api/ohlcv?symbol=${symbol}&exchange=${exchange}&interval=${timeframe}&limit=200`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        const formattedCandles = result.data.map((c: any) => ({
          time: Math.floor(c.timestamp / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        
        // Sort by time and remove duplicates
        const sortedCandles = formattedCandles.sort((a: Candle, b: Candle) => a.time - b.time);
        const uniqueCandles = sortedCandles.filter(
          (candle: Candle, index: number, arr: Candle[]) => 
            index === 0 || candle.time > arr[index - 1].time
        );
        
        setCandles(uniqueCandles);
      }
    } catch (err) {
      console.error('Failed to fetch candles:', err);
      setError('Error');
    } finally {
      setIsLoading(false);
    }
  }, [trendline.symbol, trendline.exchange, trendline.timeframe]);

  // Initial fetch
  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // Initialize chart when candles are loaded
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create chart
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
      crosshair: {
        mode: 0, // No crosshair for mini chart
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        visible: false, // Hide time axis for compact view
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Add candlestick series (v4 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(candles);

    // Calculate trendlines locally from actual candle data
    const localResult = calculateTrendLines(candles, 20, 3, 3);
    const allLines = [...localResult.uptrend_lines, ...localResult.downtrend_lines];
    
    console.log(`[${trendline.symbol}] Local calculation: ${allLines.length} lines, type: ${localResult.filter_type}`, {
      up: localResult.uptrend_lines.length,
      down: localResult.downtrend_lines.length,
      candles: candles.length
    });
    
    // Draw trendlines
    if (allLines.length > 0) {
      const lastCandleIndex = candles.length - 1;
      
      allLines.forEach((line) => {
        // Convert bar indices to timestamps
        const startIndex = Math.max(0, Math.min(line.x1, lastCandleIndex));
        const endIndex = Math.max(0, Math.min(line.x2, lastCandleIndex));
        
        if (startIndex >= candles.length || !candles[startIndex] || !candles[endIndex]) return;
        
        const time1 = candles[startIndex]?.time;
        const time2 = candles[endIndex]?.time;
        
        if (!time1 || !time2) return;
        
        // Skip if times are equal (can't draw a line with duplicate timestamps)
        if (time1 === time2) return;

        const lineColor = line.type === 'up' ? '#10b981' : '#ef4444';
        
        // Add line series (v4 API)
        const lineSeries = chart.addSeries(LineSeries, {
          color: lineColor,
          lineWidth: 2,
          lineStyle: 0,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        const lineData = [
          { time: time1, value: line.y1 },
          { time: time2, value: line.y2 },
        ].sort((a, b) => a.time - b.time);

        lineSeries.setData(lineData);
      });
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles]); // Only depends on candles - lines are calculated locally

  // Filter type badge
  const filterBadge = useMemo(() => {
    switch (trendline.filter_type) {
      case 'up':
        return { text: 'UPTREND', bg: 'bg-emerald-500/20', color: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'down':
        return { text: 'DOWNTREND', bg: 'bg-rose-500/20', color: 'text-rose-400', border: 'border-rose-500/30' };
      case 'both':
        return { text: 'UP & DOWN', bg: 'bg-amber-500/20', color: 'text-amber-400', border: 'border-amber-500/30' };
      default:
        return { text: 'NONE', bg: 'bg-gray-500/20', color: 'text-gray-400', border: 'border-gray-500/30' };
    }
  }, [trendline.filter_type]);

  // Price formatting
  const formattedPrice = useMemo(() => {
    if (trendline.price >= 1) {
      return trendline.price.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    return trendline.price.toFixed(6);
  }, [trendline.price]);

  // Count lines by type
  const upLines = trendline.lines.filter(l => l.type === 'up').length;
  const downLines = trendline.lines.filter(l => l.type === 'down').length;

  return (
    <div className={`rounded-xl overflow-hidden bg-[#0d1514] border ${filterBadge.border} hover:border-opacity-60 transition-all duration-300`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{trendline.symbol}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${filterBadge.bg} ${filterBadge.color}`}>
            {filterBadge.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase">{trendline.exchange}</span>
          <span className="text-[10px] text-cyan-400 font-mono">{trendline.timeframe}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchCandles();
            }}
            className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(cardId);
            }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-500 hover:text-amber-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Chart Area */}
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
        <div className="flex items-center gap-3">
          {upLines > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span className="text-[10px] text-emerald-400">{upLines}</span>
            </div>
          )}
          {downLines > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-rose-500 rounded" />
              <span className="text-[10px] text-rose-400">{downLines}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">
            {trendline.detected_at ? new Date(trendline.detected_at).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit', 
              hour: '2-digit',
              minute: '2-digit'
            }) : '--'}
          </span>
          <span className="text-xs text-gray-400 font-mono">${formattedPrice}</span>
        </div>
      </div>
    </div>
  );
}
