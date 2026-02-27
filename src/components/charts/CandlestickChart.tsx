"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartConfig } from "../../lib/ChartConfig";
import { ChartContainer } from "./ChartContainer";

type Candle = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type CandlestickChartProps = {
  title?: string;
  candles: Candle[];
  theme?: "light" | "dark";
  height?: number;
};

const CandlestickChart = ( {
  title = "Price Action",
  candles,
  theme = "dark",
  height = 420
}: CandlestickChartProps ) =>
{

  const chartOption = useMemo( () =>
  {
    // Convert data to format expected by ECharts
    const data = candles.map( c => ( {
      time: typeof c.time === 'string' ? new Date( c.time ).getTime() : c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    } ) );

    const dates = data.map( item =>
    {
      const date = new Date( item.time );
      return date.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
    } );

    const values = data.map( item => [
      item.open,
      item.close,
      item.low,
      item.high,
      item.volume
    ] );

    const volumes = data.map( ( item, index ) => [ index, item.volume, item.open > item.close ? -1 : 1 ] );

    const colors = theme === 'dark' ? ChartConfig.COLORS_DARK : ChartConfig.COLORS_LIGHT;

    return {
      backgroundColor: 'transparent', // Let container gradient show through
      animation: false,
      grid: [
        {
          left: '3%',
          right: '3%',
          top: '10%',
          height: '65%',
          containLabel: true
        },
        {
          left: '3%',
          right: '3%',
          top: '78%',
          height: '15%',
          containLabel: true
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
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
      axisPointer: {
        link: [ { xAxisIndex: 'all' } ],
        label: {
          backgroundColor: '#777'
        }
      },
      xAxis: [
        {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false, lineStyle: { color: colors.border } },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax',
          axisLabel: { color: colors.textSecondary }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false, lineStyle: { color: colors.border } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: false
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: colors.grid
            }
          },
          axisLabel: {
            color: colors.textSecondary
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [ 0, 1 ],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [ 0, 1 ],
          type: 'slider',
          bottom: '0%',
          start: 50,
          end: 100,
          borderColor: colors.border,
          textStyle: { color: colors.textSecondary }
        }
      ],
      series: [
        {
          name: title,
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: colors.candleUp,
            color0: colors.candleDown,
            borderColor: colors.candleUp,
            borderColor0: colors.candleDown
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: {
            color: ( params: any ) =>
            {
              return params.value[ 2 ] === 1 ? colors.candleUp : colors.candleDown;
            }
          }
        }
      ]
    };
  }, [ candles, theme, title ] );

  return (
    <ChartContainer title={ title } height={ `${ height }px` }>
      <ReactECharts
        option={ chartOption }
        className="h-full w-full"
        theme={ theme }
      />
    </ChartContainer>
  );
};

export default CandlestickChart;
