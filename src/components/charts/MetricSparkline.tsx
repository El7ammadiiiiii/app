"use client";

import dynamic from "next/dynamic";
import React, { memo } from "react";
import type { PlotData, Layout } from "plotly.js";
import type { PlotParams } from "react-plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
}) as unknown as (props: PlotParams) => React.JSX.Element;

type MetricSparklineProps = {
  label: string;
  currentValue: number | string;
  changePct?: number;
  series: number[];
  suffix?: string;
};

const MetricSparkline = ({ label, currentValue, changePct, series, suffix = "" }: MetricSparklineProps) => {
  const changeColor = changePct ? (changePct >= 0 ? "text-emerald-400" : "text-rose-400") : "text-slate-400";
  const formattedChange = changePct ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-emerald-500/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-3xl font-semibold text-white">
            {currentValue}
            {suffix && <span className="text-base text-slate-400">{suffix}</span>}
          </p>
          {formattedChange && <p className={`text-sm font-medium ${changeColor}`}>{formattedChange}</p>}
        </div>
        <div className="h-16 w-32">
          <Plot
            data={[
              {
                type: "scatter",
                mode: "lines",
                hoverinfo: "skip",
                y: series,
                line: { shape: "spline", color: "#16f2b3", width: 2 },
                fill: "tozeroy",
                fillcolor: "rgba(22, 242, 179, 0.15)",
              } as Partial<PlotData>,
            ]}
            layout={
              {
                margin: { l: 0, r: 0, t: 0, b: 0 },
                paper_bgcolor: "#040506",
                plot_bgcolor: "#0f3133",
                xaxis: { visible: false },
                yaxis: { visible: false },
                height: 64,
                width: 128,
              } satisfies Partial<Layout>
            }
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(MetricSparkline);
