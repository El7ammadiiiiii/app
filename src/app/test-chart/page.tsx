"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

export default function TestChartPage ()
{
  const chartRef = useRef<HTMLDivElement>( null );
  const [ mounted, setMounted ] = useState( false );
  const [ status, setStatus ] = useState( "initializing..." );

  useEffect( () =>
  {
    setMounted( true );
    setStatus( "mounted" );
  }, [] );

  useEffect( () =>
  {
    if ( !mounted || !chartRef.current )
    {
      return;
    }

    setStatus( "creating chart..." );

    try
    {
      const chart = echarts.init( chartRef.current, "dark" );
      setStatus( "chart initialized" );

      // Simple test data
      const testData = [
        [ 100, 110, 95, 105 ],
        [ 105, 115, 100, 112 ],
        [ 112, 120, 108, 118 ],
        [ 118, 125, 115, 122 ],
        [ 122, 130, 118, 128 ],
      ];

      const option: echarts.EChartsOption = {
        backgroundColor: "#040506",
        title: {
          text: "Test Chart",
          left: "center",
          textStyle: { color: "#fff" },
        },
        xAxis: {
          type: "category",
          data: [ "Mon", "Tue", "Wed", "Thu", "Fri" ],
        },
        yAxis: {
          type: "value",
          scale: true,
        },
        series: [
          {
            type: "candlestick",
            data: testData,
            itemStyle: {
              color: "#00ff88",
              color0: "#ff4444",
              borderColor: "#00ff88",
              borderColor0: "#ff4444",
            },
          },
        ],
      };

      chart.setOption( option );
      setStatus( "chart rendered successfully!" );

      return () =>
      {
        chart.dispose();
      };
    } catch ( error )
    {
      setStatus( `Error: ${ error instanceof Error ? error.message : String( error ) }` );
    }
  }, [ mounted ] );

  return (
    <div className="min-h-screen p-8 theme-bg">
      <h1 className="text-white text-2xl mb-4">ECharts Test Page</h1>
      <p className="text-yellow-400 mb-4">Status: { status }</p>
      <p className="text-white/60 mb-4">Mounted: { mounted ? "Yes" : "No" }</p>

      <div
        ref={ chartRef }
        className="w-full h-[500px] border-2 border-[#1a4a4d] bg-[linear-gradient(90deg,_#030508,_#0d3b3b)]"
      />
    </div>
  );
}
