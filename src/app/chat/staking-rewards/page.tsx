"use client";

import { useCallback, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCrawlerData } from "@/hooks/use-crawler-data";

/* ================================================================
   Types
   ================================================================ */

type StakingItem = {
  slug: string;
  name: string;
  symbol: string;
  logo_url?: string;
  type_keys: string[];
  ecosystem_keys: string[];
  providers_count: number;
  about: string;
  providers: Array<{ name?: string; provider_type?: string; stakelink?: string }>;
  reward_rate_min?: number | null;
  reward_rate_max?: number | null;
  coingecko_rank?: number | null;
  timeframe: string;
  metrics: Record<string, number | null>;
  stakingrewards_url: string;
};

type ApiData = {
  items: StakingItem[];
  total: number;
  page: number;
  pageSize: number;
  timeframe: string;
  sort: string;
  order: string;
  columns: string[];
  availableColumns: Array<{ key: string; label: string; group: string }>;
  filters: {
    types: Array<{ key: string; name: string }>;
    ecosystems: Array<{ key: string; name: string }>;
  };
  timeframes: string[];
  lastUpdated?: string;
  lastRefresh?: string;
  hasTypeTagData: boolean;
  hasEcosystemTagData: boolean;
};

/* ================================================================
   Constants
   ================================================================ */

const DEFAULT_COLUMNS = [
  "reward_rate",
  "price",
  "staking_marketcap",
  "staking_ratio",
  "marketcap",
  "daily_trading_volume",
];

const PERCENT_KEYS = new Set([
  "reward_rate",
  "staking_ratio",
  "reputation",
  "real_reward_rate",
  "total_roi_365d",
  "staking_roi_365d",
  "price_roi_365d",
  "staked_tokens_trend_24h",
  "trading_volume_trend_24h",
  "price_change_24h",
]);

const USD_KEYS = new Set([
  "price",
  "staking_marketcap",
  "net_staking_flow_7d",
  "marketcap",
  "daily_trading_volume",
  "annualized_rewards_usd",
]);

/* ================================================================
   Helpers
   ================================================================ */

function fmtMetric(key: string, val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";

  if (PERCENT_KEYS.has(key)) {
    const sign = val > 0 ? "+" : "";
    if (key === "reward_rate" || key === "staking_ratio" || key === "reputation" || key === "real_reward_rate")
      return `${val.toFixed(2)}%`;
    return `${sign}${val.toFixed(2)}%`;
  }

  if (USD_KEYS.has(key)) {
    if (key === "price") {
      if (val >= 1000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (val >= 1) return `$${val.toFixed(2)}`;
      return `$${val.toPrecision(4)}`;
    }
    if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  }

  if (key === "staked_tokens") {
    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toFixed(2);
  }

  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function metricColor(key: string, val: number | null | undefined): string {
  if (val === null || val === undefined) return "text-white/40";
  if (key === "reward_rate" || key === "real_reward_rate") {
    if (val >= 10) return "text-emerald-400";
    if (val >= 5) return "text-teal-300";
    return "text-white/80";
  }
  if (key.includes("change") || key.includes("trend") || key.includes("roi")) {
    if (val > 0) return "text-emerald-400";
    if (val < 0) return "text-red-400";
  }
  return "text-white/80";
}

function updateParams(
  router: ReturnType<typeof useRouter>,
  searchParams: ReturnType<typeof useSearchParams>,
  patch: Record<string, string | null>,
) {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(patch).forEach(([k, v]) => {
    if (v === null || v === "") next.delete(k);
    else next.set(k, v);
  });
  router.replace(`/chat/staking-rewards?${next.toString()}`);
}

/* ================================================================
   Page Component
   ================================================================ */

export default function StakingRewardsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-white/40">Loading...</div>}>
      <StakingRewardsPage />
    </Suspense>
  );
}

function StakingRewardsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [columnsOpen, setColumnsOpen] = useState(false);

  // ── URL State ──
  const timeframe = sp.get("timeframe") || "7d";
  const type = sp.get("type") || "all";
  const ecosystem = sp.get("ecosystem") || "all";
  const page = Number(sp.get("page") || "0");
  const pageSize = Number(sp.get("pageSize") || "50");
  const search = sp.get("search") || "";
  const sort = sp.get("sort") || "staking_marketcap";
  const order = sp.get("order") || "desc";
  const tab = sp.get("tab") || "about";
  const selectedAsset = sp.get("asset") || "";
  const columns = (sp.get("columns") || DEFAULT_COLUMNS.join(",")).split(",").filter(Boolean);

  // ── API URL ──
  const apiUrl = useMemo(() => {
    const q = new URLSearchParams({
      timeframe,
      type,
      ecosystem,
      page: String(page),
      pageSize: String(pageSize),
      search,
      columns: columns.join(","),
      sort,
      order,
    });
    return `/api/crawler/stakingrewards?${q.toString()}`;
  }, [timeframe, type, ecosystem, page, pageSize, search, columns, sort, order]);

  const { data, loading, error } = useCrawlerData<ApiData>(apiUrl, { refreshInterval: 60_000 });

  const rows = data?.items || [];
  const total = data?.total || 0;
  const maxPage = Math.max(0, Math.ceil(total / Math.max(1, pageSize)) - 1);
  const selectedRow = rows.find((r) => r.slug === selectedAsset);

  const availableColumns = data?.availableColumns || [];
  const groupedColumns = useMemo(() => {
    return availableColumns.reduce<Record<string, Array<{ key: string; label: string; group: string }>>>(
      (acc, c) => {
        if (!acc[c.group]) acc[c.group] = [];
        acc[c.group].push(c);
        return acc;
      },
      {},
    );
  }, [availableColumns]);

  // ── Sort Handler ──
  const handleSort = useCallback(
    (key: string) => {
      if (sort === key) {
        updateParams(router, sp, { order: order === "desc" ? "asc" : "desc", page: "0" });
      } else {
        updateParams(router, sp, { sort: key, order: "desc", page: "0" });
      }
    },
    [sort, order, router, sp],
  );

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <ArrowUpDown className="w-3 h-3 text-white/30" />;
    return order === "desc" ? (
      <ArrowDown className="w-3 h-3 text-teal-400" />
    ) : (
      <ArrowUp className="w-3 h-3 text-teal-400" />
    );
  };

  // ── Render ──
  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-4 py-5 space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              🥩 Staking & Rewards
            </h1>
            <p className="text-sm text-white/50 mt-0.5">
              {total > 0 ? `${total} assets` : "Loading…"} · Timeframe: {timeframe}
              {data?.lastRefresh && (
                <span className="ml-2 text-white/30">
                  Updated {new Date(data.lastRefresh).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe pills */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {(data?.timeframes || ["24h", "7d", "30d", "90d", "1y"]).map((tf) => (
              <button
                key={tf}
                onClick={() => updateParams(router, sp, { timeframe: tf, page: "0" })}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  tf === timeframe
                    ? "bg-teal-500/30 text-teal-300"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={type}
            onChange={(e) => updateParams(router, sp, { type: e.target.value, page: "0" })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs"
          >
            {(data?.filters?.types || []).map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Ecosystem filter */}
          <select
            value={ecosystem}
            onChange={(e) => updateParams(router, sp, { ecosystem: e.target.value, page: "0" })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs"
          >
            {(data?.filters?.ecosystems || []).map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={String(pageSize)}
            onChange={(e) => updateParams(router, sp, { pageSize: e.target.value, page: "0" })}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              value={search}
              onChange={(e) => updateParams(router, sp, { search: e.target.value, page: "0" })}
              placeholder="Search asset…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs placeholder:text-white/30"
            />
          </div>

          {/* Columns toggle */}
          <button
            onClick={() => setColumnsOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1.5 transition-colors ${
              columnsOpen ? "bg-teal-500/20 border-teal-400/40 text-teal-300" : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Columns
          </button>
        </div>

        {/* ── Columns Picker ── */}
        {columnsOpen && (
          <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2.5 backdrop-blur-sm">
            {Object.entries(groupedColumns).map(([group, cols]) => (
              <div key={group}>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cols.map((c) => {
                    const active = columns.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => {
                          const next = active
                            ? columns.filter((x) => x !== c.key)
                            : [...columns, c.key];
                          updateParams(router, sp, {
                            columns: next.length ? next.join(",") : DEFAULT_COLUMNS.join(","),
                          });
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                          active
                            ? "bg-teal-500/25 border-teal-400/40 text-teal-200"
                            : "bg-white/5 border-white/10 text-white/50 hover:text-white/70"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        <div className="rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-white/50 text-xs">
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left min-w-[180px]">
                    <button
                      onClick={() => handleSort("name")}
                      className="inline-flex items-center gap-1 hover:text-white/80"
                    >
                      Asset <SortIcon col="name" />
                    </button>
                  </th>
                  {columns.map((c) => {
                    const found = availableColumns.find((x) => x.key === c);
                    return (
                      <th key={c} className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleSort(c)}
                          className="inline-flex items-center gap-1 hover:text-white/80 ml-auto"
                        >
                          {found?.label || c}
                          <SortIcon col={c} />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading && !rows.length && (
                  <tr>
                    <td colSpan={2 + columns.length} className="py-16 text-center">
                      <div className="inline-flex items-center gap-2 text-white/50">
                        <div className="w-4 h-4 border-2 border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />
                        Loading staking data…
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={2 + columns.length} className="py-16 text-center text-red-300/80">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={2 + columns.length} className="py-16 text-center text-white/40">
                      No assets found for current filters.
                    </td>
                  </tr>
                )}

                {rows.map((r, idx) => {
                  const rank = page * pageSize + idx + 1;
                  const isSelected = r.slug === selectedAsset;
                  return (
                    <tr
                      key={r.slug}
                      onClick={() =>
                        updateParams(router, sp, {
                          asset: isSelected ? null : r.slug,
                          tab: tab || "about",
                        })
                      }
                      className={`border-t border-white/[0.04] cursor-pointer transition-colors ${
                        isSelected ? "bg-teal-500/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="py-2.5 px-3 text-white/30 text-xs">{rank}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {r.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.logo_url}
                              alt={r.symbol}
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-400/30 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-white/90 truncate">{r.name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/40">{r.symbol}</span>
                              {r.coingecko_rank && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/30">
                                  #{r.coingecko_rank}
                                </span>
                              )}
                              {r.type_keys?.slice(0, 1).map((t) => (
                                <span
                                  key={t}
                                  className="text-[9px] px-1 py-0.5 rounded bg-teal-500/15 text-teal-300/70"
                                >
                                  {t.replace(/-/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      {columns.map((c) => {
                        const val = r.metrics?.[c];
                        return (
                          <td
                            key={c}
                            className={`py-2.5 px-3 text-right font-mono text-xs ${metricColor(c, val)}`}
                          >
                            {c === "reward_rate" && val !== null && val !== undefined ? (
                              <div>
                                <span>{fmtMetric(c, val)}</span>
                                {r.reward_rate_min != null && r.reward_rate_max != null && (
                                  <span className="block text-[9px] text-white/30">
                                    {r.reward_rate_min.toFixed(1)}–{r.reward_rate_max.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              fmtMetric(c, val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between text-xs">
          <button
            disabled={page <= 0}
            onClick={() => updateParams(router, sp, { page: String(Math.max(0, page - 1)) })}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 inline-flex items-center gap-1 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-white/40">
            Page {page + 1} of {maxPage + 1} · {total} assets
          </span>
          <button
            disabled={page >= maxPage}
            onClick={() => updateParams(router, sp, { page: String(Math.min(maxPage, page + 1)) })}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 disabled:opacity-30 inline-flex items-center gap-1 hover:bg-white/10 transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Detail Panel ── */}
        {selectedRow && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
            {/* Detail header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                {selectedRow.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedRow.logo_url} alt={selectedRow.symbol} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-400/30" />
                )}
                <div>
                  <h2 className="font-semibold text-lg leading-tight">{selectedRow.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/40">{selectedRow.symbol}</span>
                    {selectedRow.type_keys.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300/70">
                        {t.replace(/-/g, " ")}
                      </span>
                    ))}
                    {selectedRow.ecosystem_keys.map((e) => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300/70">
                        {e.replace("-ecosystem", "").replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedRow.stakingrewards_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-300 inline-flex items-center gap-1 text-xs hover:text-teal-200 transition-colors"
                >
                  StakingRewards <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => updateParams(router, sp, { asset: null })}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(["about", "providers"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateParams(router, sp, { tab: t })}
                  className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    tab === t
                      ? "border-teal-400 text-teal-300"
                      : "border-transparent text-white/50 hover:text-white/70"
                  }`}
                >
                  {t === "about" ? "About" : `Providers (${selectedRow.providers_count})`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">
              {tab === "about" ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/70 leading-relaxed">
                    {selectedRow.about || "No description available. Run the enrichment crawler to populate."}
                  </p>
                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {columns.slice(0, 8).map((c) => {
                      const found = availableColumns.find((x) => x.key === c);
                      const val = selectedRow.metrics?.[c];
                      return (
                        <div key={c} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">
                            {found?.label || c}
                          </p>
                          <p className={`text-sm font-mono mt-0.5 ${metricColor(c, val)}`}>
                            {fmtMetric(c, val)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(selectedRow.providers || []).length === 0 && (
                    <p className="text-sm text-white/40">
                      No providers data available. Run the crawler to populate provider information.
                    </p>
                  )}
                  {(selectedRow.providers || []).map((p, i) => (
                    <div
                      key={`${p.name || "prov"}-${i}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div>
                        <p className="font-medium text-sm">{p.name || "Provider"}</p>
                        {p.provider_type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 mt-1 inline-block">
                            {p.provider_type}
                          </span>
                        )}
                      </div>
                      {p.stakelink && (
                        <a
                          href={p.stakelink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-300 text-xs inline-flex items-center gap-1 hover:text-teal-200"
                        >
                          Stake <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
