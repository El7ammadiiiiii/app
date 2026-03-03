'use client';

/**
 * 📊 Pivot Levels Card with Embedded Chart
 * 
 * Displays candlestick chart with support/resistance levels directly in the card.
 * Fetches candles locally and draws levels.
 * Same style as TrendlineCard.
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Star, RefreshCw, Download } from 'lucide-react';
import { LevelResult, PivotLevel, LEVEL_COLORS } from '@/lib/scanners/levels-detector';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface PivotLevelsCardProps {
  result: LevelResult;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onExpand?: (result: LevelResult) => void;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// ============================================================================
//  COMPONENT
// ============================================================================

export function PivotLevelsCard({
  result,
  isFavorite,
  onToggleFavorite,
  onExpand,
}: PivotLevelsCardProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardId = result.id || `${result.symbol}-${result.timeframe}`;

  // Fetch OHLCV data
  const fetchCandles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const symbol = result.symbol.replace('/', '');
      const exchange = result.exchange || 'binance';
      const timeframe = result.timeframe || '1h';
      
      const response = await fetch(
        `/api/ohlcv?symbol=${symbol}&exchange=${exchange}&interval=${timeframe}&limit=200`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const formattedCandles = data.data.map((c: any) => ({
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
  }, [result.symbol, result.exchange, result.timeframe]);

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
        rightOffset: 12, // Push chart left to avoid label overlap
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(candles);

    // Draw support/resistance levels as horizontal lines
    if (result.levels && result.levels.length > 0) {
      const currentPrice = candles[candles.length - 1]?.close || result.currentPrice;
      
      // Get top 2 resistance (above price) and top 2 support (below price)
      const resistanceLevels = result.levels
        .filter(l => l.price > currentPrice)
        .sort((a, b) => (b.strength || 0) - (a.strength || 0))
        .slice(0, 2);
      
      const supportLevels = result.levels
        .filter(l => l.price < currentPrice)
        .sort((a, b) => (b.strength || 0) - (a.strength || 0))
        .slice(0, 2);
      
      const displayLevels = [...resistanceLevels, ...supportLevels];
      
      // Create price lines for each level
      displayLevels.forEach((level) => {
        const isResistance = level.price > currentPrice;
        const color = isResistance ? LEVEL_COLORS.resistance : LEVEL_COLORS.support;
        
        candleSeries.createPriceLine({
          price: level.price,
          color: color,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: isResistance ? 'R' : 'S',
        });
      });

      // Draw current price line in blue
      candleSeries.createPriceLine({
        price: currentPrice,
        color: '#3b82f6', // Blue
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: '',
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
  }, [candles, result.levels, result.currentPrice]);

  // Status badge
  const statusBadge = useMemo(() => {
    switch (result.status) {
      case 'near_resistance':
        return { text: 'NEAR RESISTANCE', bg: 'bg-rose-500/20', color: 'text-rose-400', border: 'border-rose-500/30' };
      case 'near_support':
        return { text: 'NEAR SUPPORT', bg: 'bg-emerald-500/20', color: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'broke_resistance':
        return { text: 'BROKE RESISTANCE', bg: 'bg-cyan-500/20', color: 'text-cyan-400', border: 'border-cyan-500/30' };
      case 'broke_support':
        return { text: 'BROKE SUPPORT', bg: 'bg-amber-500/20', color: 'text-amber-400', border: 'border-amber-500/30' };
      default:
        return { text: 'ALL', bg: 'bg-gray-500/20', color: 'text-gray-400', border: 'border-gray-500/30' };
    }
  }, [result.status]);

  // Price formatting
  const formattedPrice = useMemo(() => {
    const price = result.currentPrice;
    if (price >= 1) {
      return price.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    return price.toFixed(6);
  }, [result.currentPrice]);

  // Count levels by type
  const resistanceCount = result.levels?.filter(l => l.type === 'resistance' || l.price > result.currentPrice).length || 0;
  const supportCount = result.levels?.filter(l => l.type === 'support' || l.price < result.currentPrice).length || 0;

  return (
    <div className={`rounded-xl overflow-hidden bg-[#0d1514] border ${statusBadge.border} hover:border-opacity-60 transition-all duration-300`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{result.symbol}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusBadge.bg} ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase">{result.exchange}</span>
          <span className="text-[10px] text-cyan-400 font-mono">{result.timeframe}</span>
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
      <div 
        className="relative h-[180px] cursor-pointer"
        onClick={() => onExpand?.(result)}
      >
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
          {resistanceCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-rose-500 rounded" />
              <span className="text-[10px] text-rose-400">{resistanceCount} R</span>
            </div>
          )}
          {supportCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span className="text-[10px] text-emerald-400">{supportCount} S</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">
            {result.detected_at ? new Date(result.detected_at).toLocaleString('en-GB', {
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

export default PivotLevelsCard;
