"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { PatternResult } from '@/types/patterns';
import { 
  MousePointer2, TrendingUp, Minus, ArrowUpRight, 
  Percent, Square, Type, Trash2, Undo2, 
  ZoomIn, ZoomOut, Move, Crosshair,
  ChevronLeft, ChevronRight, RotateCcw, Download,
  Eye, EyeOff
} from 'lucide-react';

type DrawingTool = 
  | 'cursor' 
  | 'crosshair' 
  | 'trendline' 
  | 'ray' 
  | 'horizontal' 
  | 'vertical' 
  | 'rectangle' 
  | 'fibonacci' 
  | 'text'
  | 'measure';

interface DrawingObject {
  id: string;
  type: DrawingTool;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  visible: boolean;
  locked: boolean;
  label?: string;
}

interface TradingViewChartProps {
  pattern: PatternResult;
  symbol: string;
  timeframe: string;
  ohlcvData?: number[][];
  showPatternOverlay?: boolean;
  onClose?: () => void;
}

const DRAWING_COLORS = [
  '#2962FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFFFFF'
];

export default function TradingViewChart({
  pattern,
  symbol,
  timeframe,
  ohlcvData = [],
  showPatternOverlay = true,
  onClose
}: TradingViewChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const isDraggingYAxis = useRef(false);
  const lastYPosition = useRef(0);
  const yAxisRange = useRef({ min: 0, max: 0, originalMin: 0, originalMax: 0 });
  
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [drawingColor, setDrawingColor] = useState('#2962FF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempPoints, setTempPoints] = useState<{ x: number; y: number }[]>([]);
  const [showOverlay, setShowOverlay] = useState(showPatternOverlay);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [crosshairPosition, setCrosshairPosition] = useState<{ x: number; y: number; price: number; time: string } | null>(null);

  // Normalize OHLCV data
  const normalizedData = React.useMemo(() => {
    return ohlcvData.map(candle => {
      if (!Array.isArray(candle)) return candle;
      const ts = candle[0];
      const normalizedTs = ts < 1e12 ? ts * 1000 : ts;
      return [normalizedTs, candle[1], candle[2], candle[3], candle[4], candle[5]];
    });
  }, [ohlcvData]);

  const xData = React.useMemo(() => normalizedData.map(c => c[0]), [normalizedData]);
  
  const formatTime = useCallback((timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  }, []);

  // Build pattern overlay lines that stay visible during zoom
  // Note: buildPatternGraphics is kept for potential future use with custom graphic elements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const buildPatternGraphics = useCallback(() => {
    if (!showOverlay || !pattern.lines?.length) return [];
    
    const lineColor = pattern.type === 'bullish' ? '#10b981' : 
                      pattern.type === 'bearish' ? '#ef4444' : '#eab308';
    
    return pattern.lines.map((line, idx) => {
      const coords = line.coords || [];
      if (coords.length < 2) return null;
      
      const start = coords[0];
      const end = coords[coords.length - 1];
      
      // Validate indices
      if (start.xAxis < 0 || start.xAxis >= normalizedData.length) return null;
      if (end.xAxis < 0 || end.xAxis >= normalizedData.length) return null;
      
      return {
        type: 'line' as const,
        id: `pattern-line-${idx}`,
        $action: 'merge' as const,
        shape: {
          x1: start.xAxis,
          y1: start.yAxis,
          x2: end.xAxis,
          y2: end.yAxis,
        },
        style: {
          stroke: lineColor,
          lineWidth: 2,
          shadowBlur: 6,
          shadowColor: lineColor,
        },
        z: 100,
      };
    }).filter(Boolean);
  }, [showOverlay, pattern, normalizedData.length]);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !normalizedData.length) return;

    const chart = echarts.init(chartRef.current, 'dark');
    chartInstance.current = chart;

    const candleData = normalizedData.map(c => [c[1], c[4], c[3], c[2]]); // OHLC
    const volumeData = normalizedData.map((c) => ({
      value: c[5],
      itemStyle: { color: c[4] >= c[1] ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)' }
    }));

    const lineColor = pattern.type === 'bullish' ? '#10b981' : 
                      pattern.type === 'bearish' ? '#ef4444' : '#eab308';

    // Build markLine data with proper coordinate binding
    const markLineData = showOverlay ? (pattern.lines || [])
      .map(line => {
        const coords = line.coords || [];
        if (coords.length < 2) return null;
        const start = coords[0];
        const end = coords[coords.length - 1];
        if (start.xAxis < 0 || start.xAxis >= normalizedData.length) return null;
        if (end.xAxis < 0 || end.xAxis >= normalizedData.length) return null;
        return [
          { xAxis: start.xAxis, yAxis: start.yAxis },
          { xAxis: end.xAxis, yAxis: end.yAxis }
        ];
      })
      .filter(Boolean) : [];

    const markPointData = showOverlay ? [
      ...(pattern.pivot_highs?.map(([idx, price], i) => {
        if (idx < 0 || idx >= normalizedData.length) return null;
        return {
          name: `H${i}`,
          coord: [idx, price],
          symbol: 'triangle',
          symbolSize: 10,
          symbolRotate: 180,
          itemStyle: { color: '#ef4444' },
          label: { show: false }
        };
      }) || []),
      ...(pattern.pivot_lows?.map(([idx, price], i) => {
        if (idx < 0 || idx >= normalizedData.length) return null;
        return {
          name: `L${i}`,
          coord: [idx, price],
          symbol: 'triangle',
          symbolSize: 10,
          itemStyle: { color: '#10b981' },
          label: { show: false }
        };
      }) || []),
    ].filter(Boolean) : [];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      grid: [
        { left: 60, right: 60, top: 30, height: '65%' },
        { left: 60, right: 60, top: '78%', height: '15%' }
      ],
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { backgroundColor: '#0f3133' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(19, 23, 34, 0.95)',
        borderColor: '#1a4a4d',
        textStyle: { color: '#d1d4dc', fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const candleParam = Array.isArray(params) ? params.find((p: { seriesName: string }) => p.seriesName === 'K') : null;
          if (!candleParam) return '';
          const idx = candleParam.dataIndex;
          const c = normalizedData[idx];
          if (!c) return '';
          const [ts, o, h, l, close, vol] = c;
          const change = ((close - o) / o * 100).toFixed(2);
          const color = close >= o ? '#10b981' : '#ef4444';
          return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="color: #ffffff; margin-bottom: 4px;">${formatTime(ts)}</div>
              <div style="display: grid; grid-template-columns: 50px 80px; gap: 2px;">
                <span style="color: #ffffff;">O</span><span style="color: ${color}">${o.toFixed(2)}</span>
                <span style="color: #ffffff;">H</span><span style="color: ${color}">${h.toFixed(2)}</span>
                <span style="color: #ffffff;">L</span><span style="color: ${color}">${l.toFixed(2)}</span>
                <span style="color: #ffffff;">C</span><span style="color: ${color}">${close.toFixed(2)}</span>
                <span style="color: #ffffff;">Vol</span><span style="color: #ffffff">${vol?.toLocaleString() || '-'}</span>
                <span style="color: #ffffff;">Chg</span><span style="color: ${color}">${change}%</span>
              </div>
            </div>
          `;
        }
      },
      xAxis: [
        {
          type: 'category',
          data: xData,
          gridIndex: 0,
          boundaryGap: true,
          axisLine: { lineStyle: { color: '#1a4a4d' } },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
          axisPointer: { 
            label: { 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (p: any) => formatTime(p.value as number) 
            } 
          }
        },
        {
          type: 'category',
          data: xData,
          gridIndex: 1,
          boundaryGap: true,
          axisLine: { lineStyle: { color: '#1a4a4d' } },
          axisTick: { show: false },
          axisLabel: { 
            color: '#ffffff',
            fontSize: 10,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (v: any) => formatTime(v as number)
          },
          splitLine: { show: false }
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
          splitLine: { lineStyle: { color: '#0f3133', type: 'dashed' } },
          axisLabel: { color: '#ffffff', fontSize: 10 },
        },
        {
          type: 'value',
          gridIndex: 1,
          scale: true,
          position: 'right',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 70,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          preventDefaultMouseMove: false,
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          start: 70,
          end: 100,
          bottom: 5,
          height: 20,
          borderColor: '#1a4a4d',
          backgroundColor: 'transparent',
          dataBackground: {
            lineStyle: { color: '#1a4a4d' },
            areaStyle: { color: 'rgba(54, 58, 69, 0.3)' }
          },
          selectedDataBackground: {
            lineStyle: { color: '#2962ff' },
            areaStyle: { color: 'rgba(41, 98, 255, 0.3)' }
          },
          fillerColor: 'rgba(41, 98, 255, 0.2)',
          handleStyle: { color: '#2962ff', borderColor: '#2962ff' },
          moveHandleStyle: { color: '#2962ff' },
          textStyle: { color: '#ffffff' }
        }
      ],
      series: [
        {
          name: 'K',
          type: 'candlestick',
          data: candleData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: '#10b981',
            color0: '#ef4444',
            borderColor: '#10b981',
            borderColor0: '#ef4444',
            borderWidth: 1
          },
          markLine: showOverlay ? {
            symbol: ['none', 'none'],
            animation: false,
            lineStyle: {
              type: 'solid',
              color: lineColor,
              width: 2,
              shadowBlur: 8,
              shadowColor: lineColor,
            },
            label: {
              show: true,
              position: 'end',
              color: '#fff',
              backgroundColor: lineColor,
              padding: [4, 8],
              borderRadius: 4,
              fontSize: 10,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (p: any) => p.value ? Number(p.value).toFixed(2) : ''
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: markLineData as any,
          } : undefined,
          markPoint: showOverlay ? {
            symbol: 'triangle',
            symbolSize: 10,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: markPointData as any,
            animation: false,
          } : undefined,
        },
        {
          name: 'Volume',
          type: 'bar',
          data: volumeData,
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '60%'
        }
      ]
    };

    chart.setOption(option);

    // Custom mouse tracking for crosshair tool
    chart.getZr().on('mousemove', (e) => {
      if (activeTool !== 'crosshair') {
        setCrosshairPosition(null);
        return;
      }
      const pointInPixel = [e.offsetX, e.offsetY];
      if (chart.containPixel('grid', pointInPixel)) {
        const xIndex = chart.convertFromPixel({ seriesIndex: 0 }, pointInPixel)[0];
        const yValue = chart.convertFromPixel({ seriesIndex: 0 }, pointInPixel)[1];
        if (xIndex >= 0 && xIndex < normalizedData.length) {
          setCrosshairPosition({
            x: e.offsetX,
            y: e.offsetY,
            price: yValue,
            time: formatTime(normalizedData[xIndex][0])
          });
        }
      }
    });

    chart.getZr().on('mouseout', () => setCrosshairPosition(null));

    // Y-axis drag to zoom functionality (like TradingView)
    const chartElement = chartRef.current;
    const yAxisLeft = (chartElement?.clientWidth || 1000) - 60;
    
    // Calculate initial Y range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    normalizedData.forEach(c => {
      if (c[3] < minPrice) minPrice = c[3];
      if (c[2] > maxPrice) maxPrice = c[2];
    });
    const padding = (maxPrice - minPrice) * 0.05;
    yAxisRange.current = {
      min: minPrice - padding,
      max: maxPrice + padding,
      originalMin: minPrice - padding,
      originalMax: maxPrice + padding
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = chartElement?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      
      // Check if clicking on Y-axis area (right side)
      if (x >= yAxisLeft) {
        isDraggingYAxis.current = true;
        lastYPosition.current = e.clientY;
        
        // Store current yAxis range from options
        const opt = chart.getOption();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const yAxisOpt = (opt.yAxis as any)?.[0];
        if (yAxisOpt) {
          // Use stored range or calculate from visible data
          if (typeof yAxisOpt.min === 'number' && typeof yAxisOpt.max === 'number') {
            yAxisRange.current.min = yAxisOpt.min;
            yAxisRange.current.max = yAxisOpt.max;
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
      const zoomFactor = 1 + (deltaY * 0.006);
      
      const { min, max, originalMin, originalMax } = yAxisRange.current;
      const center = (min + max) / 2;
      const range = max - min;
      const newRange = range * zoomFactor;
      
      // Limit zoom range
      const originalRange = originalMax - originalMin;
      if (newRange < originalRange * 0.1 || newRange > originalRange * 5) return;
      
      const newMin = center - newRange / 2;
      const newMax = center + newRange / 2;
      
      yAxisRange.current.min = newMin;
      yAxisRange.current.max = newMax;
      
      chart.setOption({
        yAxis: [
          { gridIndex: 0, min: newMin, max: newMax },
          { gridIndex: 1 } // Keep volume axis unchanged
        ]
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
          yAxis: [
            { gridIndex: 0, min: 'dataMin', max: 'dataMax' },
            { gridIndex: 1 }
          ]
        });
        
        // Reset stored range
        yAxisRange.current.min = yAxisRange.current.originalMin;
        yAxisRange.current.max = yAxisRange.current.originalMax;
      }
    };

    // Add Y-axis event listeners
    chartElement?.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    chartElement?.addEventListener('dblclick', handleDoubleClick);

    // Handle clicks for drawing tools
    chart.getZr().on('click', (e) => {
      if (activeTool === 'cursor' || activeTool === 'crosshair') return;
      
      const pointInPixel = [e.offsetX, e.offsetY];
      if (!chart.containPixel('grid', pointInPixel)) return;
      
      const dataPoint = chart.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
      const point = { x: dataPoint[0], y: dataPoint[1] };
      
      if (['trendline', 'ray', 'horizontal', 'vertical', 'rectangle', 'fibonacci', 'measure'].includes(activeTool)) {
        if (!isDrawing) {
          setIsDrawing(true);
          setTempPoints([point]);
        } else {
          const newDrawing: DrawingObject = {
            id: `drawing-${Date.now()}`,
            type: activeTool,
            points: [...tempPoints, point],
            color: drawingColor,
            lineWidth: 2,
            visible: true,
            locked: false,
          };
          setDrawings(prev => [...prev, newDrawing]);
          setIsDrawing(false);
          setTempPoints([]);
        }
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(() => chart.resize());
    if (chartRef.current) ro.observe(chartRef.current);

    return () => {
      chartElement?.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      chartElement?.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      chart.dispose();
    };
  }, [normalizedData, pattern, showOverlay, activeTool, isDrawing, tempPoints, drawingColor, formatTime, xData]);

  // Render user drawings
  useEffect(() => {
    if (!chartInstance.current) return;
    
    const graphicElements = drawings.filter(d => d.visible).map(drawing => {
      const chart = chartInstance.current!;
      
      if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
        const y = drawing.points[0].y;
        return {
          type: 'line',
          id: drawing.id,
          shape: {
            x1: 0,
            y1: chart.convertToPixel({ seriesIndex: 0 }, [0, y])[1],
            x2: chartRef.current?.clientWidth || 1000,
            y2: chart.convertToPixel({ seriesIndex: 0 }, [0, y])[1],
          },
          style: { stroke: drawing.color, lineWidth: drawing.lineWidth, lineDash: [5, 5] },
          z: 100,
        };
      }
      
      if (drawing.type === 'trendline' && drawing.points.length >= 2) {
        const p1 = chart.convertToPixel({ seriesIndex: 0 }, [drawing.points[0].x, drawing.points[0].y]);
        const p2 = chart.convertToPixel({ seriesIndex: 0 }, [drawing.points[1].x, drawing.points[1].y]);
        return {
          type: 'line',
          id: drawing.id,
          shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
          style: { stroke: drawing.color, lineWidth: drawing.lineWidth },
          z: 100,
        };
      }
      
      if (drawing.type === 'rectangle' && drawing.points.length >= 2) {
        const p1 = chart.convertToPixel({ seriesIndex: 0 }, [drawing.points[0].x, drawing.points[0].y]);
        const p2 = chart.convertToPixel({ seriesIndex: 0 }, [drawing.points[1].x, drawing.points[1].y]);
        return {
          type: 'rect',
          id: drawing.id,
          shape: {
            x: Math.min(p1[0], p2[0]),
            y: Math.min(p1[1], p2[1]),
            width: Math.abs(p2[0] - p1[0]),
            height: Math.abs(p2[1] - p1[1]),
          },
          style: {
            fill: drawing.color + '20',
            stroke: drawing.color,
            lineWidth: drawing.lineWidth,
          },
          z: 100,
        };
      }
      
      return null;
    }).filter(Boolean);

    chartInstance.current.setOption({
      graphic: graphicElements
    }, { replaceMerge: ['graphic'] });
  }, [drawings]);

  const clearDrawings = () => setDrawings([]);
  
  const undoDrawing = () => {
    setDrawings(prev => prev.slice(0, -1));
  };

  const zoomIn = () => {
    if (!chartInstance.current) return;
    chartInstance.current.dispatchAction({
      type: 'dataZoom',
      start: 80,
      end: 100,
    });
  };

  const zoomOut = () => {
    if (!chartInstance.current) return;
    chartInstance.current.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100,
    });
  };

  const resetZoom = () => {
    if (!chartInstance.current) return;
    chartInstance.current.dispatchAction({
      type: 'dataZoom',
      start: 70,
      end: 100,
    });
  };

  const saveImage = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#040506'
    });
    const link = document.createElement('a');
    link.download = `${symbol}-${timeframe}-${pattern.name}-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  const toolGroups = [
    {
      name: 'Cursor',
      tools: [
        { id: 'cursor' as DrawingTool, icon: MousePointer2, label: 'Select' },
        { id: 'crosshair' as DrawingTool, icon: Crosshair, label: 'Crosshair' },
      ]
    },
    {
      name: 'Lines',
      tools: [
        { id: 'trendline' as DrawingTool, icon: TrendingUp, label: 'Trend Line' },
        { id: 'ray' as DrawingTool, icon: ArrowUpRight, label: 'Ray' },
        { id: 'horizontal' as DrawingTool, icon: Minus, label: 'Horizontal' },
      ]
    },
    {
      name: 'Shapes',
      tools: [
        { id: 'rectangle' as DrawingTool, icon: Square, label: 'Rectangle' },
        { id: 'fibonacci' as DrawingTool, icon: Percent, label: 'Fibonacci' },
      ]
    },
    {
      name: 'Other',
      tools: [
        { id: 'text' as DrawingTool, icon: Type, label: 'Text' },
        { id: 'measure' as DrawingTool, icon: Move, label: 'Measure' },
      ]
    }
  ];

  return (
    <div className="flex h-full w-full rounded-lg overflow-hidden theme-card">
      {/* Left Sidebar - Drawing Tools */}
      <div 
        className={`flex flex-col border-r border-[#1a4a4d] transition-all duration-300 ${
          sidebarCollapsed ? 'w-10' : 'w-12'
        }`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 hover:bg-[#0f3133] text-[#ffffff] hover:text-white transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Tool Groups */}
        <div className="flex-1 overflow-y-auto py-1">
          {toolGroups.map((group, groupIdx) => (
            <div key={group.name} className={groupIdx > 0 ? 'border-t border-[#1a4a4d] pt-1 mt-1' : ''}>
              {group.tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full p-2 flex items-center justify-center transition-all ${
                    activeTool === tool.id 
                      ? 'bg-[#2962ff] text-white' 
                      : 'text-[#ffffff] hover:bg-[#0f3133] hover:text-white'
                  }`}
                  title={tool.label}
                >
                  <tool.icon size={18} />
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-[#1a4a4d] py-1">
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full p-2 flex items-center justify-center text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
              title="Drawing Color"
            >
              <div 
                className="w-4 h-4 rounded border border-[#1a4a4d]"
                style={{ backgroundColor: drawingColor }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute left-full top-0 ml-2 p-2 bg-[#0f3133] border border-[#1a4a4d] rounded-lg grid grid-cols-5 gap-1 z-50">
                {DRAWING_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      setDrawingColor(color);
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded transition-transform hover:scale-110 ${
                      drawingColor === color ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={undoDrawing}
            className="w-full p-2 flex items-center justify-center text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
            title="Undo"
            disabled={drawings.length === 0}
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={clearDrawings}
            className="w-full p-2 flex items-center justify-center text-[#ffffff] hover:bg-[#0f3133] hover:text-red-400 transition-colors"
            title="Clear All"
            disabled={drawings.length === 0}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-10 border-b border-[#1a4a4d] flex items-center justify-between px-3 theme-header">
          {/* Left - Symbol Info */}
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">{symbol}</span>
            <span className="text-[#ffffff] text-sm">{timeframe}</span>
            <span 
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                pattern.type === 'bullish' ? 'bg-green-500/20 text-green-400' :
                pattern.type === 'bearish' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {pattern.name}
            </span>
          </div>

          {/* Right - Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`p-1.5 rounded transition-colors ${
                showOverlay ? 'bg-[#2962ff] text-white' : 'text-[#ffffff] hover:bg-[#0f3133] hover:text-white'
              }`}
              title={showOverlay ? 'Hide Pattern' : 'Show Pattern'}
            >
              {showOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <div className="w-px h-5 bg-[#1a4a4d] mx-1" />
            <button
              onClick={zoomIn}
              className="p-1.5 rounded text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 rounded text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 rounded text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
            <div className="w-px h-5 bg-[#1a4a4d] mx-1" />
            <button
              onClick={saveImage}
              className="p-1.5 rounded text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
              title="Save Image"
            >
              <Download size={16} />
            </button>
            {onClose && (
              <>
                <div className="w-px h-5 bg-[#1a4a4d] mx-1" />
                <button
                  onClick={onClose}
                  className="p-1.5 rounded text-[#ffffff] hover:bg-[#0f3133] hover:text-white transition-colors"
                  title="Close"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 relative">
          <div ref={chartRef} className="w-full h-full" />
          
          {/* Crosshair Overlay */}
          {crosshairPosition && activeTool === 'crosshair' && (
            <>
              {/* Horizontal line */}
              <div 
                className="absolute left-0 right-0 h-px bg-[#ffffff] pointer-events-none"
                style={{ top: crosshairPosition.y }}
              />
              {/* Vertical line */}
              <div 
                className="absolute top-0 bottom-0 w-px bg-[#ffffff] pointer-events-none"
                style={{ left: crosshairPosition.x }}
              />
              {/* Price label */}
              <div 
                className="absolute right-0 px-2 py-1 bg-[#2962ff] text-white text-xs rounded-l pointer-events-none"
                style={{ top: crosshairPosition.y - 10 }}
              >
                {crosshairPosition.price.toFixed(2)}
              </div>
              {/* Time label */}
              <div 
                className="absolute bottom-[45px] px-2 py-1 bg-[#2962ff] text-white text-xs rounded pointer-events-none"
                style={{ left: crosshairPosition.x - 40 }}
              >
                {crosshairPosition.time}
              </div>
            </>
          )}
          
          {/* Drawing mode indicator */}
          {isDrawing && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#2962ff] text-white text-xs rounded">
              Click to set second point
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-6 border-t border-[#1a4a4d] flex items-center justify-between px-3 text-[10px] text-[#d1d4dc] theme-header">
          <div className="flex items-center gap-4">
            <span>Confidence: {pattern.confidence}%</span>
            <span>Strength: {pattern.strength}</span>
            {pattern.breakout_target && <span>Target: ${pattern.breakout_target.toFixed(2)}</span>}
            {pattern.stop_loss && <span>Stop: ${pattern.stop_loss.toFixed(2)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span>Drawings: {drawings.length}</span>
            <span>|</span>
            <span>Tool: {activeTool}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
