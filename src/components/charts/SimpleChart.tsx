"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartConfig } from "../../lib/ChartConfig";
import { ChartContainer } from "./ChartContainer";

interface SimpleChartProps
{
  data: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    timestamp: number[];
  };
  title?: string;
  height?: number;
}

export function SimpleChart ( { data, title = "Market Overview", height = 500 }: SimpleChartProps )
{
  const chartOption = useMemo( () =>
  {
    if ( !data || data.close.length === 0 ) return {};

    const timestamps = data.timestamp.map( ( t ) => new Date( t ).toLocaleDateString() );
    const ohlcData = data.timestamp.map( ( _, i ) => [
      data.open[ i ],
      data.close[ i ],
      data.low[ i ],
      data.high[ i ],
    ] );

    const colors = ChartConfig.COLORS_DARK;

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: colors.textSecondary
          }
        },
        backgroundColor: colors.background.includes( 'gradient' ) ? 'rgba(12, 14, 13, 0.95)' : colors.background,
        borderColor: colors.border,
        textStyle: {
          color: colors.text
        }
      },
      grid: {
        left: '3%',
        right: '3%',
        top: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.textSecondary, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: colors.grid } },
        axisLabel: { color: colors.textSecondary },
      },
      dataZoom: [
        {
          type: "inside",
          start: 70,
          end: 100
        },
        {
          show: true,
          type: "slider",
          bottom: 10,
          height: 20,
          borderColor: colors.border,
          textStyle: { color: colors.textSecondary }
        },
      ],
      series: [
        {
          name: title,
          type: "candlestick",
          data: ohlcData,
          itemStyle: {
            color: colors.candleUp,
            color0: colors.candleDown,
            borderColor: colors.candleUp,
            borderColor0: colors.candleDown,
          },
        },
      ],
    };
  }, [ data, title ] );

  if ( !data || data.close.length === 0 )
  {
    return (
      <ChartContainer title={ title } height={ `${ height }px` }>
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title={ title } height={ `${ height }px` }>
      <ReactECharts
        option={ chartOption }
        className="h-full w-full"
        theme="dark"
      />
    </ChartContainer>
  );
}
