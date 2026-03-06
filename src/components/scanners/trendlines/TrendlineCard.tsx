'use client';

/**
 * 📈 Trendline Card with Embedded Chart
 * 
 * Displays candlestick chart with trendlines directly in the card.
 * Uses pre-computed candles and trendlines from Firebase (backend).
 * 
 * @author CCWAYS Team
 * @version 4.0.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Star } from 'lucide-react';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface TrendLine {
  type: 'up' | 'down';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x1_ts?: number;
  x2_ts?: number;
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
  candles?: { timestamp: number; open: number; high: number; low: number; close: number }[];
  detected_at: number;
}

interface TrendlineCardProps {
  trendline: TrendlineResult;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
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
  const [visible, setVisible] = useState(true);

  const cardId = trendline.id || `${trendline.symbol}-${trendline.timeframe}`;

  // Convert embedded candles from Firebase to chart format
  const candles = useMemo(() => {
    if (!trendline.candles || trendline.candles.length === 0) return [];
    
    const formatted = trendline.candles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as number,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    
    // Sort by time and remove duplicates
    const sorted = formatted.sort((a, b) => a.time - b.time);
    return sorted.filter(
      (candle, index, arr) => index === 0 || candle.time > arr[index - 1].time
    );
  }, [trendline.candles]);

  // Initialize chart when candles are available
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Hide card if insufficient candles or no lines
    if (candles.length < 30 || trendline.lines.length === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);

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
        rightOffset: 12, // Push chart left to avoid label overlap
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

    // Use pre-computed trendlines from backend (with timestamp alignment)
    const allLines = trendline.lines;
    
    // Draw trendlines
    if (allLines.length > 0) {
      allLines.forEach((line) => {
        let startIdx: number;
        let endIdx: number;
        
        // Prefer timestamp-based alignment
        if (line.x1_ts && line.x2_ts) {
          const ts1 = line.x1_ts > 1e12 ? Math.floor(line.x1_ts / 1000) : line.x1_ts;
          const ts2 = line.x2_ts > 1e12 ? Math.floor(line.x2_ts / 1000) : line.x2_ts;
          startIdx = candles.findIndex(c => c.time === ts1);
          endIdx = candles.findIndex(c => c.time === ts2);
          if (startIdx < 0 || endIdx < 0) return;
        } else {
          // Fallback: use raw indices (may drift)
          const lastCandleIndex = candles.length - 1;
          startIdx = Math.max(0, Math.min(line.x1, lastCandleIndex));
          endIdx = Math.max(0, Math.min(line.x2, lastCandleIndex));
        }
        
        if (!candles[startIdx] || !candles[endIdx]) return;
        
        const time1 = candles[startIdx].time;
        const time2 = candles[endIdx].time;
        
        if (!time1 || !time2 || time1 === time2) return;

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
  }, [candles, trendline.lines]); // Depends on candles + backend lines

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

  // Don't render cards with no trendlines or insufficient data
  if (!visible) return null;

  // No candles from Firebase → skip this card
  if (!trendline.candles || trendline.candles.length === 0) return null;

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
