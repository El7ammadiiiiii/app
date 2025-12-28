'use client';

/**
 * 📊 Divergence Trading Chart Component
 * مكون شارت الدايفرجنس المتقدم - نظام TradingView الكامل
 * 
 * Features:
 * - TradingView-style candlestick chart
 * - Full interactive zoom/pan like TradingView
 * - Mouse wheel zoom
 * - Drag to pan
 * - Y-axis scaling by drag
 * - Double-click to reset
 * - Synchronized crosshair
 * - Divergence lines overlay
 * - RSI indicator panel below
 * 
 * @author Nexus Elite Team
 * @version 2.0.0
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { DivergenceResult, OHLCV } from '@/lib/scanners/advanced-divergence-detector';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface DivergenceTradingChartProps {
  candles: OHLCV[];
  divergence: DivergenceResult;
  indicatorValues: number[];
  width?: number | string;
  height?: number;
  className?: string;
}

// ============================================================================
// 🎨 COLORS & THEME
// ============================================================================

const THEME = {
  background: 'transparent',
  candleUp: '#26a69a',
  candleDown: '#ef5350',
  candleUpBorder: '#26a69a',
  candleDownBorder: '#ef5350',
  grid: 'rgba(255, 255, 255, 0.05)',
  text: 'rgba(255, 255, 255, 0.6)',
  textBright: 'rgba(255, 255, 255, 0.9)',
  crosshair: 'rgba(120, 120, 120, 0.8)',
  crosshairLabel: 'rgba(0, 27, 66, 0.95)',
  bullishLine: '#22c55e',
  bearishLine: '#ef4444',
  rsiLine: '#2196f3',
};

// ============================================================================
// 🧮 HELPERS
// ============================================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(1);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function DivergenceTradingChart({
  candles,
  divergence,
  indicatorValues,
  width = '100%',
  height = 400,
  className = ''
}: DivergenceTradingChartProps) {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // === TradingView-Style State ===
  const [xRange, setXRange] = useState({ start: 0, end: 100 });
  const [yRange, setYRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [indicatorYRange, setIndicatorYRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [dragMode, setDragMode] = useState<'none' | 'pan' | 'yScale' | 'indicatorYScale'>('none');
  
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startXRange: { start: 0, end: 100 },
    startYRange: { min: 0, max: 0 },
    startIndicatorYRange: { min: 0, max: 100 }
  });

  // Get divergence color
  const divergenceColor = divergence.direction === 'bullish' ? THEME.bullishLine : THEME.bearishLine;
  const lineType = divergence.type === 'weak' || divergence.type === 'hidden' ? 'dashed' : 'solid';

  // Prepare chart data
  const chartData = useMemo(() => {
    const candleData = candles.map(c => [c.open, c.close, c.low, c.high]);
    const categoryData = candles.map(c => formatTime(c.timestamp));
    return { candleData, categoryData };
  }, [candles]);

  // Calculate visible price range
  const visiblePriceRange = useMemo(() => {
    if (!candles || candles.length === 0) return { min: 0, max: 100 };
    
    const startIdx = Math.floor(candles.length * xRange.start / 100);
    const endIdx = Math.ceil(candles.length * xRange.end / 100);
    const visible = candles.slice(Math.max(0, startIdx), Math.min(candles.length, endIdx + 1));
    
    if (visible.length === 0) return { min: 0, max: 100 };
    
    let min = Infinity, max = -Infinity;
    for (const c of visible) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    
    const padding = (max - min) * 0.05;
    return { min: min - padding, max: max + padding };
  }, [candles, xRange]);

  // Calculate divergence lines
  const divergenceLines = useMemo(() => {
    const priceStartValue = divergence.startPoint.isHigh 
      ? candles[divergence.startPoint.index]?.high 
      : candles[divergence.startPoint.index]?.low;
    const priceEndValue = divergence.endPoint.isHigh 
      ? candles[divergence.endPoint.index]?.high 
      : candles[divergence.endPoint.index]?.low;

    return {
      priceLine: {
        start: [divergence.startPoint.index, priceStartValue],
        end: [divergence.endPoint.index, priceEndValue]
      },
      indicatorLine: {
        start: [divergence.startPoint.indicatorPeakIndex, divergence.startPoint.indicatorValue],
        end: [divergence.endPoint.indicatorPeakIndex, divergence.endPoint.indicatorValue]
      }
    };
  }, [candles, divergence]);

  // Calculate visible indicator range for auto-scaling
  const visibleIndicatorRange = useMemo(() => {
    if (!indicatorValues || indicatorValues.length === 0) return { min: 0, max: 100 };
    
    const startIdx = Math.floor(indicatorValues.length * xRange.start / 100);
    const endIdx = Math.ceil(indicatorValues.length * xRange.end / 100);
    const visible = indicatorValues.slice(Math.max(0, startIdx), Math.min(indicatorValues.length, endIdx + 1));
    
    if (visible.length === 0) return { min: 0, max: 100 };
    
    let min = Math.min(...visible.filter(v => v !== null && v !== undefined));
    let max = Math.max(...visible.filter(v => v !== null && v !== undefined));
    
    // Add padding
    const padding = (max - min) * 0.15;
    min = Math.max(0, min - padding);
    max = Math.min(100, max + padding);
    
    // Ensure reasonable range
    if (max - min < 20) {
      const mid = (max + min) / 2;
      min = Math.max(0, mid - 15);
      max = Math.min(100, mid + 15);
    }
    
    return { min, max };
  }, [indicatorValues, xRange]);

  // Build ECharts option
  const option = useMemo(() => {
    const mainChartHeight = '58%';
    const indicatorChartHeight = '38%';
    const indicatorTop = '60%';

    return {
      backgroundColor: THEME.background,
      animation: false, // Disable for smoother interactions
      
      // Tooltip - disabled
      tooltip: {
        show: false
      },
      
      // Axis Pointer - crosshair only, no labels
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: {
          show: false,
          backgroundColor: THEME.crosshairLabel
        }
      },
      
      // Grids
      grid: [
        {
          left: 5,
          right: 45,
          top: 5,
          height: mainChartHeight,
          containLabel: false
        },
        {
          left: 5,
          right: 45,
          top: indicatorTop,
          height: indicatorChartHeight,
          containLabel: false,
          bottom: 10
        }
      ],
      
      // X Axes
      xAxis: [
        {
          type: 'category',
          data: chartData.categoryData,
          gridIndex: 0,
          scale: true,
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { 
            show: true,
            lineStyle: { color: THEME.grid, type: 'dashed' }
          },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          data: chartData.categoryData,
          gridIndex: 1,
          scale: true,
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: THEME.text,
            fontSize: 10,
            margin: 8
          },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      
      // Y Axes
      yAxis: [
        {
          scale: true,
          gridIndex: 0,
          position: 'right',
          min: yRange.min ?? visiblePriceRange.min,
          max: yRange.max ?? visiblePriceRange.max,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: THEME.text,
            fontSize: 10,
            inside: false,
            margin: 4,
            formatter: (value: number) => formatPrice(value)
          },
          splitLine: {
            show: true,
            lineStyle: { color: THEME.grid, type: 'dashed' }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          position: 'right',
          min: indicatorYRange.min ?? visibleIndicatorRange.min,
          max: indicatorYRange.max ?? visibleIndicatorRange.max,
          interval: indicatorYRange.min !== null ? undefined : undefined,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: THEME.text,
            fontSize: 9,
            inside: false,
            margin: 4,
            formatter: (value: number) => Math.round(value).toString()
          },
          splitLine: { 
            show: true,
            lineStyle: { color: THEME.grid, type: 'dashed', opacity: 0.3 }
          }
        }
      ],
      
      // Data Zoom - TradingView style
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: xRange.start,
          end: xRange.end,
          minSpan: 2,
          maxSpan: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: false,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false
        }
      ],
      
      // Series
      series: [
        // Candlestick
        {
          name: divergence.symbol,
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: chartData.candleData,
          itemStyle: {
            color: THEME.candleUp,
            color0: THEME.candleDown,
            borderColor: THEME.candleUpBorder,
            borderColor0: THEME.candleDownBorder,
            borderWidth: 1
          },
          // Price Divergence Line
          markLine: {
            symbol: ['circle', 'arrow'],
            symbolSize: [5, 10],
            label: { show: false },
            lineStyle: {
              color: divergenceColor,
              width: 2.5,
              type: lineType
            },
            data: [[
              { 
                coord: divergenceLines.priceLine.start,
                symbol: 'circle',
                symbolSize: 6
              },
              { 
                coord: divergenceLines.priceLine.end,
                symbol: 'arrow',
                symbolSize: 10
              }
            ]]
          }
        },
        
        // Indicator Line
        {
          name: divergence.indicator,
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: indicatorValues,
          smooth: 0.3,
          showSymbol: false,
          lineStyle: {
            width: 1.5,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#22c55e' },
              { offset: 0.3, color: '#22c55e' },
              { offset: 0.5, color: '#3b82f6' },
              { offset: 0.7, color: '#3b82f6' },
              { offset: 1, color: '#ef4444' }
            ])
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.12)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }
            ])
          },
          // Indicator Divergence Line
          markLine: {
            symbol: ['circle', 'arrow'],
            symbolSize: [5, 10],
            label: { show: false },
            lineStyle: {
              color: divergenceColor,
              width: 2.5,
              type: lineType
            },
            data: [[
              { 
                coord: divergenceLines.indicatorLine.start,
                symbol: 'circle',
                symbolSize: 6
              },
              { 
                coord: divergenceLines.indicatorLine.end,
                symbol: 'arrow',
                symbolSize: 10
              }
            ]]
          }
        }
      ]
    };
  }, [chartData, divergence, divergenceColor, lineType, divergenceLines, indicatorValues, xRange, yRange, indicatorYRange, visiblePriceRange, visibleIndicatorRange]);

  // === TradingView-Style Event Handlers ===
  
  // Handle chart ready
  const onChartReady = useCallback((chart: echarts.ECharts) => {
    chartRef.current = chart;
  }, []);

  // Handle mouse down - Start drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartWidth = rect.width - 55; // Account for Y axis
    const chartHeight = rect.height;
    
    // Calculate grid boundaries (match new layout: 58% main + 38% indicator)
    const mainChartBottom = chartHeight * 0.60; // 60% from top
    const indicatorTop = chartHeight * 0.60;
    
    // Check if clicking on Y axis area (right side)
    if (x > chartWidth) {
      // Determine which chart's Y axis
      if (y < mainChartBottom) {
        // Main chart Y axis
        setDragMode('yScale');
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startXRange: { ...xRange },
          startYRange: { 
            min: yRange.min ?? visiblePriceRange.min, 
            max: yRange.max ?? visiblePriceRange.max 
          },
          startIndicatorYRange: {
            min: indicatorYRange.min ?? 0,
            max: indicatorYRange.max ?? 100
          }
        };
      } else {
        // Indicator Y axis
        setDragMode('indicatorYScale');
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startXRange: { ...xRange },
          startYRange: { 
            min: yRange.min ?? visiblePriceRange.min, 
            max: yRange.max ?? visiblePriceRange.max 
          },
          startIndicatorYRange: {
            min: indicatorYRange.min ?? 0,
            max: indicatorYRange.max ?? 100
          }
        };
      }
    } else {
      // Pan mode
      setDragMode('pan');
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startXRange: { ...xRange },
        startYRange: { 
          min: yRange.min ?? visiblePriceRange.min, 
          max: yRange.max ?? visiblePriceRange.max 
        },
        startIndicatorYRange: {
          min: indicatorYRange.min ?? 0,
          max: indicatorYRange.max ?? 100
        }
      };
    }
  }, [xRange, yRange, indicatorYRange, visiblePriceRange]);

  // Handle mouse move - Drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragMode === 'none' || !containerRef.current) return;
    
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const rect = containerRef.current.getBoundingClientRect();
    
    if (dragMode === 'pan') {
      // Pan horizontally
      const rangeSpan = dragRef.current.startXRange.end - dragRef.current.startXRange.start;
      const pixelsPerPercent = rect.width / 100;
      const percentDelta = -deltaX / pixelsPerPercent;
      
      let newStart = dragRef.current.startXRange.start + percentDelta;
      let newEnd = dragRef.current.startXRange.end + percentDelta;
      
      // Clamp to bounds
      if (newStart < 0) {
        newEnd -= newStart;
        newStart = 0;
      }
      if (newEnd > 100) {
        newStart -= (newEnd - 100);
        newEnd = 100;
      }
      
      setXRange({ 
        start: Math.max(0, newStart), 
        end: Math.min(100, newEnd) 
      });
      
      // Also allow vertical scaling while panning
      if (Math.abs(deltaY) > 10) {
        const priceRange = dragRef.current.startYRange.max - dragRef.current.startYRange.min;
        const priceDelta = (deltaY / rect.height) * priceRange * 2;
        setYRange({
          min: dragRef.current.startYRange.min - priceDelta,
          max: dragRef.current.startYRange.max + priceDelta
        });
      }
    } else if (dragMode === 'yScale') {
      // Scale main chart Y axis
      const priceRange = dragRef.current.startYRange.max - dragRef.current.startYRange.min;
      const scaleFactor = 1 + (deltaY / rect.height) * 2;
      const midPrice = (dragRef.current.startYRange.max + dragRef.current.startYRange.min) / 2;
      const newHalfRange = (priceRange / 2) * scaleFactor;
      
      setYRange({
        min: midPrice - newHalfRange,
        max: midPrice + newHalfRange
      });
    } else if (dragMode === 'indicatorYScale') {
      // Scale indicator Y axis
      const indicatorRange = dragRef.current.startIndicatorYRange.max - dragRef.current.startIndicatorYRange.min;
      const scaleFactor = 1 + (deltaY / rect.height) * 2;
      const midValue = (dragRef.current.startIndicatorYRange.max + dragRef.current.startIndicatorYRange.min) / 2;
      const newHalfRange = Math.max(10, Math.min(100, (indicatorRange / 2) * scaleFactor));
      
      // Keep within reasonable bounds for RSI/indicators (0-100 range typically)
      const newMin = Math.max(-20, Math.round(midValue - newHalfRange));
      const newMax = Math.min(120, Math.round(midValue + newHalfRange));
      
      setIndicatorYRange({
        min: newMin,
        max: newMax
      });
    }
  }, [dragMode]);

  // Handle mouse up - End drag
  const handleMouseUp = useCallback(() => {
    setDragMode('none');
  }, []);

  // Handle double click - Reset zoom
  const handleDoubleClick = useCallback(() => {
    setXRange({ start: 0, end: 100 });
    setYRange({ min: null, max: null });
    setIndicatorYRange({ min: null, max: null });
    
    // Also reset the chart's dataZoom
    if (chartRef.current) {
      chartRef.current.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100
      });
    }
  }, []);

  // Handle wheel - Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidth = rect.width - 55;
    
    // Determine zoom center as percentage
    const zoomCenter = Math.min(100, Math.max(0, (x / chartWidth) * 100));
    
    // Zoom factor
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    const currentSpan = xRange.end - xRange.start;
    const newSpan = Math.min(100, Math.max(5, currentSpan * zoomFactor));
    
    // Calculate new range centered on mouse position
    const zoomPointInRange = xRange.start + (zoomCenter / 100) * currentSpan;
    const leftRatio = (zoomPointInRange - xRange.start) / currentSpan;
    
    let newStart = zoomPointInRange - leftRatio * newSpan;
    let newEnd = newStart + newSpan;
    
    // Clamp to bounds
    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > 100) {
      newStart -= (newEnd - 100);
      newEnd = 100;
    }
    
    setXRange({
      start: Math.max(0, newStart),
      end: Math.min(100, newEnd)
    });
  }, [xRange]);

  // Chart events
  const onEvents = useMemo(() => ({
    datazoom: (params: any) => {
      if (params.batch) {
        setXRange({
          start: params.batch[0].start || 0,
          end: params.batch[0].end || 100
        });
      } else if (params.start !== undefined) {
        setXRange({
          start: params.start,
          end: params.end
        });
      }
    }
  }), []);

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => setDragMode('none');
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative select-none ${className}`}
      style={{ 
        width, 
        height,
        background: 'linear-gradient(90deg, #030508, #0d3b3b)',
        borderRadius: '8px',
        cursor: dragMode === 'pan' ? 'grabbing' : (dragMode === 'yScale' || dragMode === 'indicatorYScale') ? 'ns-resize' : 'crosshair'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      {/* ECharts */}
      <ReactECharts
        ref={(e) => {
          if (e) onChartReady(e.getEchartsInstance());
        }}
        option={option}
        style={{ height: '100%', width: '100%', pointerEvents: 'none' }}
        opts={{ renderer: 'canvas' }}
        onEvents={onEvents}
      />
      

    </div>
  );
}

export default DivergenceTradingChart;
