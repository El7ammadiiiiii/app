"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { fastApiClient } from "@/lib/services/fastApiClient";
import { useExchangeStore } from "@/stores/exchangeStore";
import { ExchangeSelector } from "@/components/layout/ExchangeSelector";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/* ─── Types ─── */
interface MacdCoin {
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  turnover24h: number;
  price24hPcnt: number;
  macd: Record<string, { macd: number; signal: number; histogram: number } | null>;
}

interface ApiResult {
  success: boolean;
  timeframe: string;
  count: number;
  data: MacdCoin[];
  error?: string;
}

type Timeframe = "15m" | "1h" | "4h" | "24h" | "7d";

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
];

/* ─── MACD Histogram Color ─── */
function getMacdColor(histogram: number): string {
  if (histogram > 0.5) return "#10b981";     // Strong bullish
  if (histogram > 0.1) return "#4ade80";     // Moderate bullish
  if (histogram > 0) return "#86efac";       // Weak bullish
  if (histogram > -0.1) return "#fca5a5";    // Weak bearish
  if (histogram > -0.5) return "#f87171";    // Moderate bearish
  return "#ef4444";                          // Strong bearish
}

function getMacdLabel(histogram: number): string {
  if (histogram > 0.5) return "Strong Bullish";
  if (histogram > 0.1) return "Bullish";
  if (histogram > 0) return "Weak Bullish";
  if (histogram > -0.1) return "Weak Bearish";
  if (histogram > -0.5) return "Bearish";
  return "Strong Bearish";
}

/* ─── Helpers ─── */
function fmtVol(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

/* ═══════════════════════════════════════════════════════════ */
export default function MACDHeatmapPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("4h");
  const [topCount, setTopCount] = useState<number>(100);
  const [data, setData] = useState<MacdCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const activeExchange = useExchangeStore(s => s.activeExchange);

  /* ─── Fetch MACD data ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fastApiClient.macdHeatmap(activeExchange, topCount) as ApiResult;
      if (json.success && json.data) {
        setData(json.data);
        setLastUpdate(Date.now());
      } else {
        setError(json.error || "Failed to fetch MACD data");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [topCount, activeExchange]);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── ECharts Option ─── */
  const chartOption = useMemo(() => {
    if (!data.length) return {};

    const validData = data.filter(
      (d) => d.macd[timeframe] !== null && d.macd[timeframe] !== undefined
    );
    const sorted = [...validData].sort((a, b) => b.turnover24h - a.turnover24h);

    const scatterData = sorted.map((coin) => {
      const macdVal = coin.macd[timeframe]!;
      return {
        value: [coin.turnover24h, macdVal.histogram],
        name: coin.name,
        coinSymbol: coin.symbol,
        price: coin.price,
        turnover24h: coin.turnover24h,
        price24hPcnt: coin.price24hPcnt,
        macdAll: coin.macd,
        macdLine: macdVal.macd,
        signalLine: macdVal.signal,
        itemStyle: {
          color: getMacdColor(macdVal.histogram),
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
        },
      };
    });

    const maxTurnover = Math.max(...sorted.map((c) => c.turnover24h));
    const minTurnover = Math.min(...sorted.map((c) => c.turnover24h));
    const allHistograms = sorted
      .map((c) => c.macd[timeframe]?.histogram ?? 0)
      .filter((h) => h !== 0);
    const absMax = Math.max(Math.abs(Math.min(...allHistograms)), Math.abs(Math.max(...allHistograms)), 1);

    return {
      backgroundColor: "transparent",
      grid: { top: 40, right: 120, bottom: 55, left: 60 },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15, 23, 42, 0.97)",
        borderColor: "rgba(51, 65, 85, 0.5)",
        borderWidth: 1,
        padding: 0,
        textStyle: { color: "#e2e8f0", fontSize: 13 },
        extraCssText: "border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(8px);",
        formatter: (params: Record<string, unknown>) => {
          const d = (params as { data: {
            name: string; value: [number, number]; price: number;
            turnover24h: number; price24hPcnt: number;
            macdAll: Record<string, { macd: number; signal: number; histogram: number } | null>;
            macdLine: number; signalLine: number;
          } }).data;
          if (!d) return "";
          const pctColor = d.price24hPcnt >= 0 ? "#22c55e" : "#ef4444";
          const pctIcon = d.price24hPcnt >= 0 ? "▲" : "▼";
          const hist = d.value[1];
          const histColor = getMacdColor(hist);

          let macdRows = "";
          for (const tf of ["15m", "1h", "4h", "24h", "7d"]) {
            const val = d.macdAll?.[tf];
            if (val !== null && val !== undefined) {
              const c = getMacdColor(val.histogram);
              macdRows += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
                <span style="color:#94a3b8;font-size:12px">MACD (${tf})</span>
                <span style="color:${c};font-weight:600;font-size:12px">${val.histogram >= 0 ? '+' : ''}${val.histogram.toFixed(4)}</span>
              </div>`;
            } else {
              macdRows += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
                <span style="color:#94a3b8;font-size:12px">MACD (${tf})</span>
                <span style="color:#475569;font-size:12px">—</span>
              </div>`;
            }
          }

          return `<div style="min-width:250px;font-family:-apple-system,system-ui,sans-serif">
            <div style="padding:12px 16px 8px;border-bottom:1px solid rgba(51,65,85,0.4)">
              <div style="font-size:15px;font-weight:700;color:#f1f5f9;display:flex;align-items:center;gap:8px">
                <span style="width:10px;height:10px;border-radius:50%;background:${histColor};display:inline-block;box-shadow:0 0 6px ${histColor}60"></span>
                ${d.name}
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:2px">${getMacdLabel(hist)}</div>
            </div>
            <div style="padding:8px 16px 12px">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
                <span style="color:#94a3b8;font-size:12px">Price</span>
                <span style="color:#f1f5f9;font-weight:600;font-size:13px">${fmtPrice(d.price)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
                <span style="color:#94a3b8;font-size:12px">Volume 24h</span>
                <span style="color:#f1f5f9;font-weight:600;font-size:13px">${fmtVol(d.turnover24h)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
                <span style="color:#94a3b8;font-size:12px">Price 24h %</span>
                <span style="color:${pctColor};font-weight:600;font-size:13px">${pctIcon} ${Math.abs(d.price24hPcnt).toFixed(2)}%</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
                <span style="color:#94a3b8;font-size:12px">MACD Line</span>
                <span style="color:#60a5fa;font-weight:600;font-size:13px">${d.macdLine.toFixed(4)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">
                <span style="color:#94a3b8;font-size:12px">Signal Line</span>
                <span style="color:#f59e0b;font-weight:600;font-size:13px">${d.signalLine.toFixed(4)}</span>
              </div>
              <div style="height:1px;background:rgba(51,65,85,0.4);margin:6px 0"></div>
              ${macdRows}
            </div>
          </div>`;
        },
      },
      xAxis: {
        type: "log",
        min: minTurnover * 0.5,
        max: maxTurnover * 2,
        inverse: true,
        axisLabel: {
          color: "#64748b",
          fontSize: 11,
          formatter: (val: number) => fmtVol(val),
        },
        splitLine: { show: true, lineStyle: { color: "rgba(100,116,139,0.06)", type: "dashed" as const } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        position: "right",
        min: -absMax * 1.2,
        max: absMax * 1.2,
        axisLabel: {
          color: "#475569",
          fontSize: 10,
          margin: 4,
          formatter: (val: number) => val.toFixed(2),
        },
        splitLine: { show: true, lineStyle: { color: "rgba(100,116,139,0.06)", type: "dashed" as const } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "scatter",
          data: scatterData,
          symbolSize: (val: [number, number]) => {
            const logV = Math.log10(val[0] + 1);
            return Math.max(6, Math.min(50, (logV - 4) * 8));
          },
          emphasis: {
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
              shadowBlur: 20,
              shadowColor: "rgba(255,255,255,0.35)",
            },
            scale: 1.4,
          },
          label: {
            show: true,
            formatter: (params: Record<string, unknown>) => {
              const d = params as { data: { name: string; value: [number, number] } };
              if (d.data.value[0] > maxTurnover * 0.003) return d.data.name;
              return "";
            },
            position: "top",
            distance: 5,
            color: "#e2e8f0",
            fontSize: 10,
            fontWeight: 600,
            textShadowColor: "rgba(0,0,0,0.6)",
            textShadowBlur: 3,
          },
          animationDuration: 900,
          animationEasing: "cubicOut",
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed" as const, width: 1.5 },
            label: { show: false },
            data: [
              { yAxis: 0, lineStyle: { color: "rgba(148,163,184,0.4)" } },
            ],
          },
          markArea: {
            silent: true,
            data: [
              [
                {
                  yAxis: 0,
                  itemStyle: {
                    color: {
                      type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: "rgba(16,185,129,0.08)" },
                        { offset: 1, color: "rgba(16,185,129,0.01)" },
                      ],
                    },
                  },
                },
                { yAxis: absMax * 1.2 },
              ],
              [
                {
                  yAxis: -absMax * 1.2,
                  itemStyle: {
                    color: {
                      type: "linear", x: 0, y: 1, x2: 0, y2: 0,
                      colorStops: [
                        { offset: 0, color: "rgba(239,68,68,0.08)" },
                        { offset: 1, color: "rgba(239,68,68,0.01)" },
                      ],
                    },
                  },
                },
                { yAxis: 0 },
              ],
            ],
          },
        },
      ],
      graphic: [
        { type: "text", right: 5, top: 60, z: 100,
          style: { text: "Bullish Momentum", fill: "rgba(16,185,129,0.7)", fontSize: 11, fontWeight: 600, textAlign: "right" as const } },
        { type: "text", right: 5, bottom: 80, z: 100,
          style: { text: "Bearish Momentum", fill: "rgba(239,68,68,0.7)", fontSize: 11, fontWeight: 600, textAlign: "right" as const } },
      ],
    };
  }, [data, timeframe]);

  /* ─── Render ─── */
  return (
    <div className="w-full min-h-screen bg-[var(--app-bg)] p-4 md:p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Crypto MACD Heatmap
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            MACD histogram momentum across top coins — green = bullish, red = bearish
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Exchange selector */}
          <ExchangeSelector />
          {/* Timeframe selector */}
          <div className="flex items-center bg-[#0f172a]/80 rounded-lg border border-slate-700/50 p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  timeframe === tf.value
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Top count */}
          <div className="flex items-center gap-2 bg-[#0f172a]/80 rounded-lg border border-slate-700/50 px-2.5 py-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">Show</span>
            <select
              value={topCount}
              onChange={(e) => setTopCount(Number(e.target.value))}
              className="bg-transparent text-sm text-white outline-none cursor-pointer"
            >
              {[25, 50, 100, 150, 200].map((n) => (
                <option key={n} value={n} className="bg-[#0f172a] text-white">{n}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className={cn(
              "p-2 rounded-lg border border-slate-700/50 transition-all",
              loading ? "opacity-50 cursor-not-allowed" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
            title="Refresh"
          >
            <svg className={cn("w-5 h-5", loading && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          Strong Bullish
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-400" />
          Bullish
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-300" />
          Weak Bullish
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-300" />
          Weak Bearish
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          Bearish
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Strong Bearish
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-[#0f172a]/60 backdrop-blur-md border border-slate-700/40 rounded-xl overflow-hidden">
        {!isMounted || (loading && !data.length) ? (
          <div className="flex flex-col items-center justify-center h-[650px] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Calculating MACD across all timeframes...</p>
            <p className="text-slate-500 text-xs">This may take 30–60 seconds</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[650px] gap-4">
            <div className="text-red-400 text-5xl">⚠️</div>
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition">
              Retry
            </button>
          </div>
        ) : (
          <div className="relative">
            {loading && data.length > 0 && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            )}
            <ReactECharts
              option={chartOption}
              style={{ height: "650px", width: "100%" }}
              notMerge
              lazyUpdate
              theme="dark"
            />
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {lastUpdate > 0 && (
        <div className="text-xs text-slate-500">
          Last update: {new Date(lastUpdate).toLocaleTimeString("en-US")}
        </div>
      )}
    </div>
  );
}
