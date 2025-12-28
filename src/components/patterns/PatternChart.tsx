"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { PatternResult } from '@/types/patterns';

interface PatternChartProps {
  pattern: PatternResult;
  symbol: string;
  timeframe: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ohlcvData?: any[];
}

export default function PatternChart({ pattern, ohlcvData }: PatternChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const isDraggingYAxis = useRef(false);
  const lastYPosition = useRef(0);
  const yAxisRange = useRef({ min: 0, max: 0, originalMin: 0, originalMax: 0 });

  // Calculate price range from data
  const getPriceRange = useCallback((data: number[][]) => {
    if (!data.length) return { min: 0, max: 100 };
    let min = Infinity;
    let max = -Infinity;
    data.forEach(candle => {
      const low = candle[3];
      const high = candle[2];
      if (low < min) min = low;
      if (high > max) max = high;
    });
    const padding = (max - min) * 0.05;
    return { min: min - padding, max: max + padding };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !ohlcvData?.length) return;

    const chart = echarts.init(chartRef.current, 'dark');
    chartInstanceRef.current = chart;

    // Normalize timestamps
    const normalizedData = ohlcvData.map(candle => {
      if (!Array.isArray(candle)) return candle;
      const ts = candle[0];
      const normalizedTs = ts < 1e12 ? ts * 1000 : ts;
      return [normalizedTs, candle[1], candle[2], candle[3], candle[4], candle[5]];
    });

    const xData = normalizedData.map((_, i) => i);
    const candleData = normalizedData.map(c => [c[1], c[4], c[3], c[2]]); // O,C,L,H

    // Calculate initial Y range
    const priceRange = getPriceRange(normalizedData);
    yAxisRange.current = {
      min: priceRange.min,
      max: priceRange.max,
      originalMin: priceRange.min,
      originalMax: priceRange.max
    };

    const lineColor = pattern.type === 'bullish' ? '#10b981' : 
                      pattern.type === 'bearish' ? '#ef4444' : '#eab308';

    const formatTimestamp = (idx: number) => {
      if (idx < 0 || idx >= normalizedData.length) return '';
      const ts = normalizedData[idx][0];
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(ts));
    };

    // Build markLine data using coord system - stays visible during zoom
    const markLineData = (pattern.lines || [])
      .map(line => {
        const coords = line.coords || [];
        if (coords.length < 2) return null;
        const start = coords[0];
        const end = coords[coords.length - 1];
        if (start.xAxis < 0 || start.xAxis >= normalizedData.length) return null;
        if (end.xAxis < 0 || end.xAxis >= normalizedData.length) return null;
        return [
          { coord: [start.xAxis, start.yAxis] },
          { coord: [end.xAxis, end.yAxis] }
        ];
      })
      .filter(Boolean);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        left: 10,
        right: 60,
        top: 10,
        bottom: 50,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#0f3133' },
        },
        backgroundColor: 'rgba(19, 23, 34, 0.95)',
        borderColor: '#1a4a4d',
        textStyle: { color: '#d1d4dc', fontSize: 11 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const first = Array.isArray(params) ? params[0] : params;
          if (!first) return '';
          const idx = first.dataIndex;
          const c = normalizedData[idx];
          if (!c) return '';
          const [, o, h, l, close] = c;
          const change = ((close - o) / o * 100).toFixed(2);
          const color = close >= o ? '#10b981' : '#ef4444';
          return `
            <div style="font-size:10px;color:#ffffff;margin-bottom:4px;">${formatTimestamp(idx)}</div>
            <div style="display:grid;grid-template-columns:25px 65px;gap:1px;font-size:11px;">
              <span style="color:#ffffff;">O</span><span style="color:${color}">${o.toFixed(2)}</span>
              <span style="color:#ffffff;">H</span><span style="color:${color}">${h.toFixed(2)}</span>
              <span style="color:#ffffff;">L</span><span style="color:${color}">${l.toFixed(2)}</span>
              <span style="color:#ffffff;">C</span><span style="color:${color}">${close.toFixed(2)}</span>
              <span style="color:#ffffff;">%</span><span style="color:${color}">${change}%</span>
            </div>
          `;
        }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          preventDefaultMouseMove: false,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          start: 0,
          end: 100,
          bottom: 8,
          height: 20,
          borderColor: 'transparent',
          backgroundColor: 'rgba(47, 69, 84, 0.3)',
          fillerColor: 'rgba(47, 69, 84, 0.5)',
          handleStyle: { color: '#5470c6' },
          textStyle: { color: '#ffffff', fontSize: 9 },
          brushSelect: false,
        },
      ],
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#1a4a4d' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#ffffff',
          fontSize: 9,
          formatter: (v: string) => formatTimestamp(Number(v)),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        position: 'right',
        min: (value) => value.min - (value.max - value.min) * 0.05,
        max: (value) => value.max + (value.max - value.min) * 0.05,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#ffffff',
          fontSize: 9,
          inside: false,
          formatter: (v: number) => v.toFixed(0),
        },
        splitLine: {
          lineStyle: { color: '#0f3133', type: 'dashed' },
        },
        splitArea: { show: false },
      },
      series: [
        {
          name: 'K',
          type: 'candlestick',
          data: candleData,
          clip: false, // Important: Don't clip markLine/markPoint
          itemStyle: {
            color: '#10b981',
            color0: '#ef4444',
            borderColor: '#10b981',
            borderColor0: '#ef4444',
            borderWidth: 1,
          },
          // Pattern overlay lines using coord system
          markLine: markLineData.length > 0 ? {
            silent: true,
            symbol: ['none', 'none'],
            animation: false,
            lineStyle: {
              type: 'solid',
              color: lineColor,
              width: 2,
              shadowBlur: 6,
              shadowColor: lineColor,
            },
            label: {
              show: true,
              position: 'end',
              color: '#fff',
              backgroundColor: lineColor,
              padding: [2, 6],
              borderRadius: 3,
              fontSize: 9,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (p: any) => {
                const val = p.data?.coord?.[1] ?? p.value;
                return val ? Number(val).toFixed(0) : '';
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: markLineData as any,
          } : undefined,
          markPoint: (pattern.pivot_highs?.length || pattern.pivot_lows?.length) ? {
            symbol: 'triangle',
            symbolSize: 8,
            animation: false,
            data: [
              ...(pattern.pivot_highs?.map(([idx, price], i) => {
                if (idx < 0 || idx >= normalizedData.length) return null;
                return {
                  name: `H${i}`,
                  coord: [idx, price],
                  symbolRotate: 180,
                  itemStyle: { color: '#ef4444' },
                  label: { show: false }
                };
              }).filter(Boolean) || []),
              ...(pattern.pivot_lows?.map(([idx, price], i) => {
                if (idx < 0 || idx >= normalizedData.length) return null;
                return {
                  name: `L${i}`,
                  coord: [idx, price],
                  itemStyle: { color: '#10b981' },
                  label: { show: false }
                };
              }).filter(Boolean) || []),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any,
          } : undefined,
        },
      ],
    };

    chart.setOption(option);

    // Y-axis drag to zoom functionality (like TradingView)
    const chartElement = chartRef.current;
    const yAxisLeft = chartElement.clientWidth - 60;
    
    const handleMouseDown = (e: MouseEvent) => {
      const rect = chartElement?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      
      // Check if clicking on Y-axis area (right side)
      if (x >= yAxisLeft) {
        isDraggingYAxis.current = true;
        lastYPosition.current = e.clientY;
        
        // Store current yAxis range
        const opt = chart.getOption();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const yAxisOpt = (opt.yAxis as any)?.[0] || opt.yAxis;
        if (yAxisOpt) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const model = (chart as any).getModel();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const yAxisModel = (model as any).getComponent('yAxis', 0);
          if (yAxisModel) {
            const extent = yAxisModel.axis.scale.getExtent();
            yAxisRange.current.min = extent[0];
            yAxisRange.current.max = extent[1];
          }
        }
        
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingYAxis.current) return;
      
      const deltaY = e.clientY - lastYPosition.current;
      lastYPosition.current = e.clientY;
      
      // Calculate zoom factor based on drag direction
      const zoomFactor = 1 + (deltaY * 0.008); // Drag down = zoom out, drag up = zoom in
      
      const { min, max } = yAxisRange.current;
      const center = (min + max) / 2;
      const range = max - min;
      const newRange = range * zoomFactor;
      
      // Limit zoom range
      const originalRange = yAxisRange.current.originalMax - yAxisRange.current.originalMin;
      if (newRange < originalRange * 0.1 || newRange > originalRange * 5) return;
      
      const newMin = center - newRange / 2;
      const newMax = center + newRange / 2;
      
      yAxisRange.current.min = newMin;
      yAxisRange.current.max = newMax;
      
      chart.setOption({
        yAxis: {
          min: newMin,
          max: newMax,
        }
      }, { lazyUpdate: true });
      
      e.preventDefault();
    };

    const handleMouseUp = () => {
      isDraggingYAxis.current = false;
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const rect = chartElement?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      
      // Double-click on Y-axis to reset to auto-scale
      if (x >= yAxisLeft) {
        chart.setOption({
          yAxis: {
            min: 'dataMin',
            max: 'dataMax',
          }
        });
        
        // Reset stored range
        const newRange = getPriceRange(normalizedData);
        yAxisRange.current = {
          ...yAxisRange.current,
          min: newRange.min,
          max: newRange.max
        };
      }
    };

    // Add event listeners
    chartElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    chartElement.addEventListener('dblclick', handleDoubleClick);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    
    const ro = new ResizeObserver(() => chart.resize());
    if (chartElement) ro.observe(chartElement);

    return () => {
      chartElement?.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      chartElement?.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      chart.dispose();
    };
  }, [pattern, ohlcvData, getPriceRange]);

  return (
    <div 
      ref={chartRef} 
      className="w-full h-52 bg-transparent"
      style={{ touchAction: 'none', cursor: 'crosshair' }}
      title="اسحب على محور Y للتكبير/التصغير - انقر مرتين للإعادة"
    />
  );
}
