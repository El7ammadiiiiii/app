"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
 *  Constants
 * ═══════════════════════════════════════════════════════════════ */
const TICK = 2.5;                       // Price grouping interval ($2.50)
const ROW_H = 22;                       // Row height in pixels
const DEPTH_LEVELS = 1000;              // Binance REST depth snapshot
const WS_DEPTH = 20;                    // WS partial book depth
const PRICE_TRAIL_LEN = 120;            // Number of mid-price ticks to remember
const REST_POLL_MS = 3000;              // Deep snapshot polling interval

/* Colors matching the screenshot perfectly */
const ASK_BAR   = "rgba(140,30,30,0.55)";
const ASK_BAR_H = "rgba(160,40,40,0.70)";
const BID_BAR   = "rgba(15,120,110,0.45)";
const BID_BAR_H = "rgba(20,145,130,0.60)";
const PRICE_LINE_COLOR = "#14b8a6";     // Current price teal line

/* ═══════════════════════════════════════════════════════════════
 *  Types
 * ═══════════════════════════════════════════════════════════════ */
interface GroupedLevel {
  price: number;        // Bucketed price (e.g. 1967.5)
  volume: number;       // Aggregated volume in ETH
  side: "ask" | "bid";
}

/* ═══════════════════════════════════════════════════════════════
 *  Helpers
 * ═══════════════════════════════════════════════════════════════ */
function bucketPrice(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

function fmtVol(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(1);
}

/* ═══════════════════════════════════════════════════════════════
 *  Component
 * ═══════════════════════════════════════════════════════════════ */
export function VerticalOrderBook() {
  /* ── Raw order book data ── */
  const [rawBids, setRawBids] = useState<[number, number][]>([]);
  const [rawAsks, setRawAsks] = useState<[number, number][]>([]);
  const [connected, setConnected] = useState(false);
  const [midPriceTrail, setMidPriceTrail] = useState<number[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const restTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const spreadRowRef = useRef<HTMLDivElement | null>(null);
  const hasScrolled = useRef(false);

  const symbol = "ethusdt";
  const SYMBOL_UP = "ETHUSDT";

  /* ─────────── Deep REST snapshot (1000 levels) ─────────── */
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${SYMBOL_UP}&limit=${DEPTH_LEVELS}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const bids: [number, number][] = data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]);
      const asks: [number, number][] = data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]);
      setRawBids(bids);
      setRawAsks(asks);
    } catch { /* silent */ }
  }, []);

  /* ─────────── WebSocket for real-time top-of-book ─────────── */
  useEffect(() => {
    // Initial deep snapshot
    fetchSnapshot();
    restTimer.current = setInterval(fetchSnapshot, REST_POLL_MS);

    // WebSocket for fast top-of-book updates
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth${WS_DEPTH}@100ms`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); wsRef.current = null; };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.bids || !data.asks) return;

        const wsBids: [number, number][] = data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]);
        const wsAsks: [number, number][] = data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]);

        // Merge WS top levels into deep snapshot
        setRawBids(prev => mergeLevels(prev, wsBids, "bid"));
        setRawAsks(prev => mergeLevels(prev, wsAsks, "ask"));
      } catch { /* silent */ }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      if (restTimer.current) clearInterval(restTimer.current);
    };
  }, [fetchSnapshot]);

  /* ─────────── Merge WS levels into snapshot ─────────── */
  function mergeLevels(
    snapshot: [number, number][],
    wsLevels: [number, number][],
    side: "bid" | "ask"
  ): [number, number][] {
    const map = new Map<number, number>();
    for (const [p, q] of snapshot) map.set(p, q);
    for (const [p, q] of wsLevels) {
      if (q === 0) map.delete(p);
      else map.set(p, q);
    }
    const arr = Array.from(map.entries());
    arr.sort((a, b) => side === "bid" ? b[0] - a[0] : a[0] - b[0]);
    return arr;
  }

  /* ─────────── Group into $2.50 price buckets ─────────── */
  const { askLevels, bidLevels, bestBid, bestAsk, midPrice, maxVol, totalBidVol, totalAskVol } = useMemo(() => {
    if (rawBids.length === 0 || rawAsks.length === 0) {
      return { askLevels: [], bidLevels: [], bestBid: 0, bestAsk: 0, midPrice: 0, maxVol: 1, totalBidVol: 0, totalAskVol: 0 };
    }

    const bBid = rawBids[0][0];
    const bAsk = rawAsks[0][0];
    const mid = (bBid + bAsk) / 2;

    // Group asks
    const askMap = new Map<number, number>();
    for (const [p, q] of rawAsks) {
      const bucket = bucketPrice(p, TICK);
      askMap.set(bucket, (askMap.get(bucket) || 0) + q);
    }
    const askArr: GroupedLevel[] = Array.from(askMap.entries())
      .map(([price, volume]) => ({ price, volume, side: "ask" as const }))
      .sort((a, b) => a.price - b.price);

    // Group bids
    const bidMap = new Map<number, number>();
    for (const [p, q] of rawBids) {
      const bucket = bucketPrice(p, TICK);
      bidMap.set(bucket, (bidMap.get(bucket) || 0) + q);
    }
    const bidArr: GroupedLevel[] = Array.from(bidMap.entries())
      .map(([price, volume]) => ({ price, volume, side: "bid" as const }))
      .sort((a, b) => b.price - a.price);

    const allVols = [...askArr.map(l => l.volume), ...bidArr.map(l => l.volume)];
    const mv = Math.max(...allVols, 1);
    const tbv = bidArr.reduce((s, l) => s + l.volume, 0);
    const tav = askArr.reduce((s, l) => s + l.volume, 0);

    return { askLevels: askArr, bidLevels: bidArr, bestBid: bBid, bestAsk: bAsk, midPrice: mid, maxVol: mv, totalBidVol: tbv, totalAskVol: tav };
  }, [rawBids, rawAsks]);

  /* ─────────── Mid-price trail for the outline trace ─────────── */
  useEffect(() => {
    if (midPrice <= 0) return;
    setMidPriceTrail(prev => {
      const next = [...prev, midPrice];
      if (next.length > PRICE_TRAIL_LEN) next.shift();
      return next;
    });
  }, [midPrice]);

  /* ─────────── Auto-scroll to spread on first load ─────────── */
  useEffect(() => {
    if (hasScrolled.current || !spreadRowRef.current || !scrollRef.current) return;
    if (askLevels.length > 0 && bidLevels.length > 0) {
      spreadRowRef.current.scrollIntoView({ block: "center" });
      hasScrolled.current = true;
    }
  }, [askLevels, bidLevels]);

  /* ─────────── Spread calculations ─────────── */
  const spread = bestAsk - bestBid;
  const spreadPct = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

  /* ═══════════════════════════════════════════════════════════════
   *  Price Trail SVG Overlay — orange jagged price path
   *  Drawn on top of the ask bars to show recent price movement
   * ═══════════════════════════════════════════════════════════════ */
  const trailPath = useMemo(() => {
    if (midPriceTrail.length < 2 || askLevels.length === 0) return null;

    // We need the full price range visible
    const topPrice = askLevels.length > 0 ? askLevels[askLevels.length - 1].price : midPrice + 100;
    const botPrice = bidLevels.length > 0 ? bidLevels[bidLevels.length - 1].price : midPrice - 100;
    const totalRows = askLevels.length + bidLevels.length + 1; // +1 for spread row
    const totalH = totalRows * ROW_H;
    const priceRange = topPrice - botPrice || 1;

    const points = midPriceTrail.map((mp, i) => {
      const x = (i / (PRICE_TRAIL_LEN - 1)) * 100; // % of width
      const y = ((topPrice - mp) / priceRange) * totalH;
      return `${x},${y}`;
    });

    return `M${points.join(" L")}`;
  }, [midPriceTrail, askLevels, bidLevels, midPrice]);

  /* ═══════════════════════════════════════════════════════════════
   *  Render
   * ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full w-full select-none" style={{ background: 'rgba(255,255,255,0.04)' }}>

      {/* ───── Header ───── */}
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-gray-100 tracking-tight">Order Book ETH</span>
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0 transition-colors",
              connected
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
            )} />
          </div>
        </div>
        <div className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-widest font-semibold">
          Aggregated 4 markets
        </div>
        <div className="inline-block mt-1.5 text-xs text-blue-400/80 border border-dashed border-blue-400/30 rounded px-2 py-0.5 cursor-pointer hover:text-blue-300 hover:border-blue-300/40 transition-colors">
          Binance ETH / USDT
        </div>
      </div>

      {/* ───── Scrollable depth rows ───── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}
      >
        {/* SVG Price Trail Overlay */}
        {trailPath && (
          <svg
            className="absolute inset-0 w-full pointer-events-none z-10"
            style={{ height: (askLevels.length + bidLevels.length + 1) * ROW_H }}
            viewBox={`0 0 100 ${(askLevels.length + bidLevels.length + 1) * ROW_H}`}
            preserveAspectRatio="none"
          >
            <path
              d={trailPath}
              fill="none"
              stroke="rgba(245,158,11,0.55)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* ── ASKS (sells) — reversed so highest price at top ── */}
        {[...askLevels].reverse().map((level) => (
          <DepthRow key={`a-${level.price}`} level={level} maxVol={maxVol} />
        ))}

        {/* ── SPREAD / CURRENT PRICE LINE ── */}
        <div
          ref={spreadRowRef}
          className="relative z-20 flex items-center justify-between shrink-0"
          style={{ height: ROW_H + 6 }}
        >
          {/* Teal horizontal line spanning full width */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-px h-[2px]" style={{ background: PRICE_LINE_COLOR, boxShadow: `0 0 8px ${PRICE_LINE_COLOR}` }} />

          <div className="relative z-10 pl-3 flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: PRICE_LINE_COLOR }}>
              {midPrice > 0 ? midPrice.toFixed(1) : "—"}
            </span>
          </div>
          <div className="relative z-10 pr-3 flex items-center gap-2">
            <span className="text-[10px] text-gray-500">▲</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: PRICE_LINE_COLOR }}>
              {fmtVol(totalBidVol + totalAskVol)}
            </span>
          </div>
        </div>

        {/* ── BIDS (buys) ── */}
        {bidLevels.map((level) => (
          <DepthRow key={`b-${level.price}`} level={level} maxVol={maxVol} />
        ))}
      </div>

      {/* ───── Footer ───── */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] text-[9px] text-gray-600 flex items-center justify-between shrink-0 bg-white/[0.06]">
        <span className="uppercase tracking-widest">Real-time • 100ms • $2.50 grouping</span>
        <span className="tabular-nums">{spread > 0 ? `Spread ${spread.toFixed(2)} (${spreadPct.toFixed(3)}%)` : ""}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  DepthRow — Single price level row with depth bar
 * ═══════════════════════════════════════════════════════════════ */
const DepthRow = React.memo(function DepthRow({
  level,
  maxVol,
}: {
  level: GroupedLevel;
  maxVol: number;
}) {
  const pct = Math.min((level.volume / maxVol) * 100, 100);
  const isAsk = level.side === "ask";

  /* Determine if this is a "whale" row (large volume) for extra-large text overlay */
  const isLarge = level.volume > maxVol * 0.15;
  const isHuge = level.volume > maxVol * 0.35;

  return (
    <div
      className="relative flex items-center justify-between group cursor-pointer"
      style={{ height: ROW_H }}
    >
      {/* ── Depth Bar ── */}
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-200 ease-out"
        style={{
          width: `${pct}%`,
          background: isAsk ? ASK_BAR : BID_BAR,
        }}
      />
      {/* Hover highlight */}
      <div
        className="absolute inset-y-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          width: `${pct}%`,
          background: isAsk ? ASK_BAR_H : BID_BAR_H,
        }}
      />

      {/* ── Price label (left) ── */}
      <span className="relative z-10 pl-2 text-[11px] font-mono font-semibold tabular-nums text-gray-400">
        {level.price.toFixed(1)}
      </span>

      {/* ── Large volume overlay (center, only for big walls) ── */}
      {isLarge && (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center z-10 font-extrabold tabular-nums text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]",
            isHuge ? "text-[28px]" : "text-[18px]"
          )}
        >
          {fmtVol(level.volume)}
        </span>
      )}

      {/* ── Volume label (right) ── */}
      <span className="relative z-10 pr-2 text-[11px] font-mono tabular-nums text-gray-400 group-hover:text-gray-200 transition-colors">
        {fmtVol(level.volume)}
      </span>
    </div>
  );
});
