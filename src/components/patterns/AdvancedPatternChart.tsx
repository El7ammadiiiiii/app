"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { PatternResult } from '@/types/patterns';
import { 
  TrendingUp, Minus, MousePointer, ZoomIn, ZoomOut, 
  RotateCcw, Download, Crosshair, 
  Pencil, Trash2, Eye, EyeOff
} from 'lucide-react';

type DrawingTool = 'select' | 'trendline' | 'horizontal' | 'vertical' | 'ray' | 'fib' | 'rect' | 'measure' | 'crosshair';

interface DrawingObject {
  id: string;
  type: DrawingTool;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  visible: boolean;
  locked: boolean;
}

interface OHLCVCandle {
  0: number; // timestamp
  1: number; // open
  2: number; // high
  3: number; // low
  4: number; // close
  5: number; // volume
}

interface AdvancedPatternChartProps {
  pattern: PatternResult;
  symbol: string;
  timeframe: string;
  ohlcvData?: OHLCVCandle[];
  height?: string;
  showToolbar?: boolean;
}

export default function AdvancedPatternChart({ 
  pattern, 
  symbol, 
  timeframe, 
  ohlcvData,
  height = 'h-96',
  showToolbar = true
}: AdvancedPatternChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  
  // State
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Partial<DrawingObject> | null>(null);
  const [showPatternOverlay, setShowPatternOverlay] = useState(true);
  const [crosshairEnabled] = useState(true);

  // Colors for drawings
  const drawingColors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  const [selectedColor, setSelectedColor] = useState(drawingColors[0]);

  // Process OHLCV data
  const normalizedData = React.useMemo(() => {
    if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) return [];
    
    return ohlcvData.map(candle => {
      if (!Array.isArray(candle)) return candle;
      const ts = candle[0];
      const normalizedTs = typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts;
      return [normalizedTs, candle[1], candle[2], candle[3], candle[4], candle[5]];
    });
  }, [ohlcvData]);

  const hasTimestamps = normalizedData.length > 0 && typeof normalizedData[0]?.[0] === 'number';

  // Format timestamp
  const formatTimestamp = useCallback((value: string | number) => {
    if (!hasTimestamps) return `Bar ${value}`;
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return String(value ?? '');
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(numericValue));
  }, [hasTimestamps]);

  // Generate unique ID
  const generateId = () => `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Build markLine data from pattern and user drawings
  const buildMarkLineData = useCallback(() => {
    const patternLines: Array<[{ xAxis: number; yAxis: number }, { xAxis: number; yAxis: number }]> = [];
    
    if (showPatternOverlay && pattern.lines) {
      pattern.lines.forEach(line => {
        const lineCoords = line.coords || [];
        if (lineCoords.length < 2) return;
        
        const startPoint = lineCoords[0];
        const endPoint = lineCoords[lineCoords.length - 1];
        
        if (startPoint.xAxis < 0 || startPoint.xAxis >= normalizedData.length) return;
        if (endPoint.xAxis < 0 || endPoint.xAxis >= normalizedData.length) return;
        
        patternLines.push([
          { xAxis: startPoint.xAxis, yAxis: startPoint.yAxis },
          { xAxis: endPoint.xAxis, yAxis: endPoint.yAxis }
        ]);
      });
    }

    // Add user drawings
    drawings.forEach(drawing => {
      if (!drawing.visible) return;
      if (drawing.type === 'trendline' && drawing.points.length >= 2) {
        patternLines.push([
          { xAxis: drawing.points[0].x, yAxis: drawing.points[0].y },
          { xAxis: drawing.points[1].x, yAxis: drawing.points[1].y }
        ]);
      } else if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
        patternLines.push([
          { xAxis: 0, yAxis: drawing.points[0].y },
          { xAxis: normalizedData.length - 1, yAxis: drawing.points[0].y }
        ]);
      } else if (drawing.type === 'vertical' && drawing.points.length >= 1) {
        // Vertical lines need different handling
      }
    });

    return patternLines;
  }, [pattern.lines, drawings, normalizedData.length, showPatternOverlay]);

  // Build markPoint data
  const buildMarkPointData = useCallback(() => {
    const points: Array<{
      name: string;
      coord: [number, number];
      symbol: string;
      symbolSize: number;
      symbolRotate?: number;
      itemStyle: { color: string };
      label: { show: boolean };
    }> = [];
    
    if (showPatternOverlay) {
      pattern.pivot_highs?.forEach(([idx, price]) => {
        if (idx >= 0 && idx < normalizedData.length) {
          points.push({
            name: `pivot_high_${idx}`,
            coord: [idx, price],
            symbol: 'triangle',
            symbolSize: 10,
            symbolRotate: 180,
            itemStyle: { color: '#ef4444' },
            label: { show: false },
          });
        }
      });
      
      pattern.pivot_lows?.forEach(([idx, price]) => {
        if (idx >= 0 && idx < normalizedData.length) {
          points.push({
            name: `pivot_low_${idx}`,
            coord: [idx, price],
            symbol: 'triangle',
            symbolSize: 10,
            itemStyle: { color: '#10b981' },
            label: { show: false },
          });
        }
      });
    }

    return points;
  }, [pattern.pivot_highs, pattern.pivot_lows, normalizedData.length, showPatternOverlay]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || normalizedData.length === 0) return;

    const chart = chartInstanceRef.current || echarts.init(chartRef.current, 'dark');
    chartInstanceRef.current = chart;

    const xData = hasTimestamps
      ? normalizedData.map(candle => candle[0])
      : normalizedData.map((_, i) => i);

    const candleData = normalizedData.map(candle => [
      candle[1], // open
      candle[4], // close
      candle[3], // low
      candle[2], // high
    ]);

    const volumeData = normalizedData.map((candle) => ({
      value: candle[5],
      itemStyle: {
        color: candle[4] >= candle[1] ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }
    }));

    const lineColor = pattern.type === 'bullish' ? '#10b981' : pattern.type === 'bearish' ? '#ef4444' : '#eab308';
    const markLineData = buildMarkLineData();
    const markPointData = buildMarkPointData();

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 200,
      grid: [
        {
          left: '8%',
          right: '3%',
          top: '5%',
          height: '65%',
        },
        {
          left: '8%',
          right: '3%',
          top: '75%',
          height: '15%',
        }
      ],
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: {
          backgroundColor: '#0f3133',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: crosshairEnabled ? 'cross' : 'line',
          crossStyle: {
            color: '#999',
            width: 1,
            type: 'dashed',
          },
          lineStyle: {
            color: '#999',
            width: 1,
            type: 'dashed',
          },
        },
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        borderColor: '#444',
        borderWidth: 1,
        padding: [10, 15],
        textStyle: {
          color: '#fff',
          fontSize: 12,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const candleParam = Array.isArray(params) ? params.find((p: any) => p.seriesName === 'Price') : params;
          if (!candleParam) return '';
          
          const idx = candleParam.dataIndex;
          const candle = normalizedData[idx];
          if (!candle) return '';

          const ts = candle[0];
          const o = candle[1];
          const h = candle[2];
          const l = candle[3];
          const c = candle[4];
          const v = candle[5];
          const change = ((c - o) / o * 100).toFixed(2);
          const changeColor = c >= o ? '#10b981' : '#ef4444';
          const arrow = c >= o ? '▲' : '▼';

          return `
            <div style="font-family: monospace;">
              <div style="color: #888; margin-bottom: 8px;">${formatTimestamp(ts)}</div>
              <div style="display: grid; grid-template-columns: 60px 1fr; gap: 4px;">
                <span style="color: #888;">Open:</span><span style="color: #fff;">${o.toFixed(2)}</span>
                <span style="color: #888;">High:</span><span style="color: #10b981;">${h.toFixed(2)}</span>
                <span style="color: #888;">Low:</span><span style="color: #ef4444;">${l.toFixed(2)}</span>
                <span style="color: #888;">Close:</span><span style="color: #fff;">${c.toFixed(2)}</span>
                <span style="color: #888;">Vol:</span><span style="color: #888;">${(v/1000000).toFixed(2)}M</span>
                <span style="color: #888;">Chg:</span><span style="color: ${changeColor};">${arrow} ${change}%</span>
              </div>
            </div>
          `;
        },
      },
      toolbox: {
        show: true,
        orient: 'vertical',
        right: '1%',
        top: '5%',
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: { zoom: 'Zoom Area', back: 'Reset Zoom' },
            icon: {
              zoom: 'path://M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
              back: 'path://M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
            },
          },
          restore: {
            title: 'Restore',
          },
          saveAsImage: {
            title: 'Save Image',
            pixelRatio: 2,
          },
        },
        iconStyle: {
          borderColor: '#666',
        },
        emphasis: {
          iconStyle: {
            borderColor: '#fff',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 60,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          start: 60,
          end: 100,
          bottom: '2%',
          height: 20,
          borderColor: '#444',
          backgroundColor: 'rgba(47, 69, 84, 0.3)',
          fillerColor: 'rgba(47, 69, 84, 0.4)',
          handleStyle: {
            color: '#a7b7cc',
          },
          textStyle: {
            color: '#aaa',
          },
        },
      ],
      xAxis: [
        {
          type: 'category',
          data: xData,
          gridIndex: 0,
          boundaryGap: true,
          axisLine: { lineStyle: { color: '#444' } },
          axisLabel: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
        {
          type: 'category',
          data: xData,
          gridIndex: 1,
          boundaryGap: true,
          axisLine: { lineStyle: { color: '#444' } },
          axisLabel: {
            formatter: (value: string | number) => formatTimestamp(value),
            color: '#888',
            fontSize: 10,
          },
          axisTick: { show: false },
          splitLine: { show: false },
        }
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          scale: true,
          position: 'right',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#888',
            fontSize: 10,
            formatter: (value: number) => value.toFixed(0),
          },
          splitLine: {
            lineStyle: { color: '#333', type: 'dashed' },
          },
        },
        {
          type: 'value',
          gridIndex: 1,
          scale: true,
          position: 'right',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        }
      ],
      series: [
        {
          name: 'Price',
          type: 'candlestick',
          data: candleData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: '#10b981',
            color0: '#ef4444',
            borderColor: '#10b981',
            borderColor0: '#ef4444',
            borderWidth: 1,
          },
          markLine: {
            symbol: ['none', 'none'],
            animation: true,
            silent: false,
            lineStyle: {
              color: lineColor,
              width: 2,
              type: 'solid',
            },
            label: {
              show: true,
              position: 'end',
              color: '#fff',
              backgroundColor: lineColor,
              padding: [4, 8],
              borderRadius: 4,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (params: any) => {
                const value = params.value;
                return value ? Number(value).toFixed(2) : '';
              },
            },
            data: markLineData,
            emphasis: {
              lineStyle: { width: 3, shadowBlur: 8, shadowColor: lineColor },
            },
          },
          markPoint: {
            symbol: 'triangle',
            symbolSize: 12,
            data: markPointData,
            animation: true,
          },
        },
        {
          name: 'Volume',
          type: 'bar',
          data: volumeData,
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '60%',
        },
        // Current price line
        {
          name: 'Current Price',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: [],
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: {
              color: '#3b82f6',
              width: 1,
              type: 'dashed',
            },
            label: {
              position: 'end',
              color: '#fff',
              backgroundColor: '#3b82f6',
              padding: [4, 8],
              borderRadius: 4,
              formatter: () => normalizedData[normalizedData.length - 1]?.[4].toFixed(2) || '',
            },
            data: [
              {
                yAxis: normalizedData[normalizedData.length - 1]?.[4],
              }
            ],
          },
        },
      ],
    };

    chart.setOption(option as echarts.EChartsOption, true);

    // Event handlers for drawing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = (params: any) => {
      if (activeTool === 'select' || activeTool === 'crosshair') return;
      
      if (params.componentType === 'series') {
        const x = params.dataIndex;
        const y = params.value?.[1] || params.value; // Close price or value
        
        if (activeTool === 'horizontal') {
          // Complete horizontal line on single click
          const newDrawing: DrawingObject = {
            id: generateId(),
            type: 'horizontal',
            points: [{ x, y: typeof y === 'number' ? y : parseFloat(y) }],
            color: selectedColor,
            lineWidth: 2,
            visible: true,
            locked: false,
          };
          setDrawings(prev => [...prev, newDrawing]);
        } else if (activeTool === 'trendline' || activeTool === 'ray' || activeTool === 'fib') {
          if (!isDrawing) {
            // Start drawing
            setIsDrawing(true);
            setCurrentDrawing({
              id: generateId(),
              type: activeTool,
              points: [{ x, y: typeof y === 'number' ? y : parseFloat(y) }],
              color: selectedColor,
              lineWidth: 2,
              visible: true,
              locked: false,
            });
          } else {
            // Complete drawing
            if (currentDrawing && currentDrawing.points) {
              const newDrawing: DrawingObject = {
                ...currentDrawing as DrawingObject,
                points: [...currentDrawing.points, { x, y: typeof y === 'number' ? y : parseFloat(y) }],
              };
              setDrawings(prev => [...prev, newDrawing]);
            }
            setIsDrawing(false);
            setCurrentDrawing(null);
          }
        }
      }
    };

    chart.on('click', handleClick);

    // Resize handling
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => chart.resize())
      : null;
    if (resizeObserver && chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      chart.off('click', handleClick);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [normalizedData, pattern, buildMarkLineData, buildMarkPointData, formatTimestamp, hasTimestamps, crosshairEnabled, activeTool, isDrawing, currentDrawing, selectedColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  // Tool handlers
  const handleZoomIn = () => {
    chartInstanceRef.current?.dispatchAction({
      type: 'dataZoom',
      start: 70,
      end: 100,
    });
  };

  const handleZoomOut = () => {
    chartInstanceRef.current?.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100,
    });
  };

  const handleReset = () => {
    chartInstanceRef.current?.dispatchAction({
      type: 'restore',
    });
  };

  const handleSaveImage = () => {
    const url = chartInstanceRef.current?.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#040506',
    });
    if (url) {
      const link = document.createElement('a');
      link.download = `${symbol}_${timeframe}_${pattern.name}.png`;
      link.href = url;
      link.click();
    }
  };

  const clearDrawings = () => {
    setDrawings([]);
    setCurrentDrawing(null);
    setIsDrawing(false);
  };

  const tools: { id: DrawingTool; icon: React.ReactNode; label: string }[] = [
    { id: 'crosshair', icon: <Crosshair className="w-4 h-4" />, label: 'Crosshair' },
    { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Select' },
    { id: 'trendline', icon: <TrendingUp className="w-4 h-4" />, label: 'Trendline' },
    { id: 'horizontal', icon: <Minus className="w-4 h-4" />, label: 'Horizontal Line' },
    { id: 'fib', icon: <Pencil className="w-4 h-4" />, label: 'Fibonacci' },
  ];

  return (
    <div className="relative rounded-xl overflow-hidden theme-card">
      {/* Toolbar */}
      {showToolbar && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 p-1.5 rounded-lg border border-white/10 theme-surface">
          {/* Drawing Tools */}
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-2 rounded-md transition-all ${
                activeTool === tool.id
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
          
          <div className="w-full h-px bg-white/10 my-1" />
          
          {/* Action Buttons */}
          <button onClick={handleZoomIn} className="p-2 rounded-md text-gray-400 hover:bg-white/10 hover:text-white" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-md text-gray-400 hover:bg-white/10 hover:text-white" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-md text-gray-400 hover:bg-white/10 hover:text-white" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <div className="w-full h-px bg-white/10 my-1" />
          
          <button 
            onClick={() => setShowPatternOverlay(!showPatternOverlay)} 
            className={`p-2 rounded-md transition-all ${showPatternOverlay ? 'text-green-400' : 'text-gray-400'} hover:bg-white/10`}
            title="Toggle Pattern"
          >
            {showPatternOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button onClick={clearDrawings} className="p-2 rounded-md text-gray-400 hover:bg-red-500/20 hover:text-red-400" title="Clear Drawings">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={handleSaveImage} className="p-2 rounded-md text-gray-400 hover:bg-white/10 hover:text-white" title="Save Image">
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Color Picker */}
      {showToolbar && (activeTool === 'trendline' || activeTool === 'horizontal' || activeTool === 'fib') && (
        <div className="absolute top-2 left-14 z-10 flex gap-1 p-1.5 rounded-lg border border-white/10 theme-surface">
          {drawingColors.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                selectedColor === color ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Status Bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 theme-surface">
        <span className="text-xs text-gray-300">{symbol}</span>
        <span className="text-xs text-gray-500">•</span>
        <span className="text-xs text-gray-400">{timeframe}</span>
        {pattern.name && (
          <>
            <span className="text-xs text-gray-500">•</span>
            <span className={`text-xs font-medium ${
              pattern.type === 'bullish' ? 'text-green-400' : 
              pattern.type === 'bearish' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {pattern.name}
            </span>
          </>
        )}
      </div>

      {/* Drawing Mode Indicator */}
      {isDrawing && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10 bg-blue-500/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-500/50">
          <span className="text-sm text-blue-400">Click to set endpoint • Press ESC to cancel</span>
        </div>
      )}

      {/* Chart */}
      <div 
        ref={chartRef} 
        className={`w-full ${height} bg-transparent cursor-${activeTool === 'crosshair' ? 'crosshair' : activeTool === 'select' ? 'default' : 'cell'}`}
      />
    </div>
  );
}
