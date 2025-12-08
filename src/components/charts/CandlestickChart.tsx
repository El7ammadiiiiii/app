"use client";

import dynamic from "next/dynamic";
import React, { memo } from "react";
import type { PlotData, Layout } from "plotly.js";
import type { PlotParams } from "react-plotly.js";

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
};

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
}) as unknown as (props: PlotParams) => React.JSX.Element;

const CandlestickChart = ({ title = "Price Action", candles, theme = "dark" }: CandlestickChartProps) => {
  const timestamps = candles.map((c) => c.time);
  const layoutBg = theme === "dark" ? "#05060a" : "#ffffff";
  const textColor = theme === "dark" ? "#f5f6fa" : "#1f2937";

  return (
    <div className="rounded-3xl border border-white/5 bg-black/40 p-4 backdrop-blur">
      <Plot
        data={[
          {
            type: "candlestick",
            x: timestamps,
            open: candles.map((c) => c.open),
            high: candles.map((c) => c.high),
            low: candles.map((c) => c.low),
            close: candles.map((c) => c.close),
            increasing: { line: { color: "#16f2b3" }, fillcolor: "#16f2b333" },
            decreasing: { line: { color: "#f97316" }, fillcolor: "#f9731633" },
            hoverinfo: "x+open+high+low+close" as PlotData["hoverinfo"],
          } as Partial<PlotData>,
        ]}
        layout={
          {
            dragmode: "pan",
            title: { text: title, font: { color: textColor, size: 16 } },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: layoutBg,
            xaxis: {
              rangeslider: { visible: false },
              color: textColor,
              gridcolor: "#1f2937",
            },
            yaxis: {
              color: textColor,
              gridcolor: "#1f2937",
              tickprefix: "$",
            },
            margin: { l: 48, r: 16, t: 48, b: 32 },
          } satisfies Partial<Layout>
        }
        useResizeHandler
        style={{ width: "100%", height: "420px" }}
        config={{ displaylogo: false, responsive: true }}
      />
    </div>
  );
};

export default memo(CandlestickChart);
