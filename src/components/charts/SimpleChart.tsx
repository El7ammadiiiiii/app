"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

interface SimpleChartProps {
  data: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    timestamp: number[];
  };
}

export function SimpleChart({ data }: SimpleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !chartRef.current || !data || data.close.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, "dark");
    }

    const chart = chartInstance.current;

    const timestamps = data.timestamp.map((t) => new Date(t).toLocaleDateString());
    const ohlcData = data.timestamp.map((_, i) => [
      data.open[i],
      data.close[i],
      data.low[i],
      data.high[i],
    ]);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      grid: {
        left: 60,
        right: 20,
        top: 40,
        bottom: 60,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: "#1a1a2e" } },
        axisLabel: { color: "#888", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "#1a1a2e" } },
        axisLabel: { color: "#888" },
      },
      dataZoom: [
        { type: "inside", start: 70, end: 100 },
        { type: "slider", bottom: 10, height: 20 },
      ],
      series: [
        {
          type: "candlestick",
          data: ohlcData,
          itemStyle: {
            color: "#00ff88",
            color0: "#ff4444",
            borderColor: "#00ff88",
            borderColor0: "#ff4444",
          },
        },
      ],
    };

    chart.setOption(option);
    chart.resize();

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mounted, data]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  if (!mounted) {
    return (
      <div className="h-[500px] flex items-center justify-center theme-card">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      style={{ height: "500px", width: "100%", background: 'linear-gradient(90deg, #030508, #0d3b3b)' }}
    />
  );
}
