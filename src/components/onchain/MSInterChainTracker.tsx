/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  MSInterChainTracker — CWTracker bottom panel (100% parity)   ║
 * ║  13-column table with drag-resize from top edge                ║
 * ║  Columns: ☐ | 👁 | # | Source Tx | From | Sent | Date |       ║
 * ║  Track | Dest Tx | To | Received | Date | Status               ║
 * ║  + Fund flow direction header + Footer                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  getMSChainIconUrl,
  msShortenAddress,
  msFormatTokenAmount,
  getMSTokenColor,
} from "@/lib/onchain/cwtracker-types";

/* ════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════ */

interface TrackerRow {
  id: string;
  index: number;
  sourceTx: string;
  from: string;
  fromLabel: string;
  fromChain: string;
  sent: string;
  sentToken: string;
  sentDate: string;
  destTx: string;
  to: string;
  toLabel: string;
  toChain: string;
  received: string;
  receivedToken: string;
  receivedDate: string;
  status: "completed" | "pending" | "failed";
}

/* ═══════ Helpers ═══════ */
const TokenTag = ({ symbol }: { symbol: string }) => (
  <span
    style={{
      background: "rgb(64,64,64)",
      color: "rgb(163,163,163)",
      fontSize: 10,
      borderRadius: 4,
      padding: "1px 4px",
      marginLeft: 4,
      whiteSpace: "nowrap",
    }}
  >
    {symbol}
  </span>
);

/* ════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════ */

export function MSInterChainTracker() {
  const toggleInterChain = useCWTrackerStore((s) => s.toggleInterChain);
  const edges = useCWTrackerStore((s) => s.edges);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const rootChain = useCWTrackerStore((s) => s.rootChain);
  const getUniqueChains = useCWTrackerStore((s) => s.getUniqueChains);
  const chains = useMemo(() => getUniqueChains(), [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Resize state ── */
  const [height, setHeight] = useState(320);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set());

  /* ── Resize handlers ── */
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startY.current = e.clientY;
    startH.current = height;

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const dy = startY.current - ev.clientY;
      const newH = Math.max(150, Math.min(600, startH.current + dy));
      setHeight(newH);
    };

    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  /* ── Build table data from edges ── */
  const rows = useMemo((): TrackerRow[] => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result: TrackerRow[] = [];
    let idx = 1;

    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      for (const detail of edge.details) {
        result.push({
          id: `${edge.id}_${detail.txHash}_${idx}`,
          index: idx++,
          sourceTx: detail.txHash || "",
          from: src.address,
          fromLabel: src.label,
          fromChain: src.chain,
          sent: msFormatTokenAmount(detail.value, detail.tokenSymbol),
          sentToken: detail.tokenSymbol,
          sentDate: detail.timestamp
            ? new Date(detail.timestamp).toLocaleDateString()
            : "—",
          destTx: detail.txHash || "",
          to: tgt.address,
          toLabel: tgt.label,
          toChain: tgt.chain,
          received: msFormatTokenAmount(detail.value, detail.tokenSymbol),
          receivedToken: detail.tokenSymbol,
          receivedDate: detail.timestamp
            ? new Date(detail.timestamp).toLocaleDateString()
            : "—",
          status: "completed",
        });
      }

      // If no details, add aggregate row
      if (edge.details.length === 0) {
        result.push({
          id: `${edge.id}_agg_${idx}`,
          index: idx++,
          sourceTx: "",
          from: src.address,
          fromLabel: src.label,
          fromChain: src.chain,
          sent: edge.valueLabel,
          sentToken: edge.tokenSymbol,
          sentDate: edge.latestTimestamp
            ? new Date(edge.latestTimestamp).toLocaleDateString()
            : "—",
          destTx: "",
          to: tgt.address,
          toLabel: tgt.label,
          toChain: tgt.chain,
          received: edge.valueLabel,
          receivedToken: edge.tokenSymbol,
          receivedDate: edge.latestTimestamp
            ? new Date(edge.latestTimestamp).toLocaleDateString()
            : "—",
          status: "completed",
        });
      }
    }

    return result;
  }, [edges, nodes]);

  /* ── Fund flow direction data ── */
  const fundFlowEntities = useMemo(() => {
    if (nodes.length < 2) return [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const seen = new Set<string>();
    const flow: Array<{ chain: string; label: string; address: string }> = [];
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (src && !seen.has(src.id)) {
        seen.add(src.id);
        flow.push({ chain: src.chain, label: src.label, address: src.address });
      }
      if (tgt && !seen.has(tgt.id)) {
        seen.add(tgt.id);
        flow.push({ chain: tgt.chain, label: tgt.label, address: tgt.address });
      }
    }
    return flow.slice(0, 6); // max 6 entities in the header
  }, [edges, nodes]);

  const toggleRow = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((r) => r.id)));
    }
  }, [selectedRows, rows]);

  const toggleVisibility = useCallback((id: string) => {
    setHiddenRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleTrack = useCallback((row: TrackerRow) => {
    // Focus graph on source → dest edge, or scroll to relevant nodes
    const store = useCWTrackerStore.getState();
    const node = store.nodes.find((n) => n.address === row.to);
    if (node) {
      store.selectNode(node.id);
    }
  }, []);

  return (
    <div style={{ height }} className="flex flex-col relative">
      {/* ── Resize Handle ── */}
      <div
        className="absolute w-full top-[-5px] h-[10px] cursor-row-resize z-10 hover:bg-[var(--default-color)]/20 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* ── Title Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--default-border-color)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">InterChain Tracker</span>
          <span className="text-[var(--desc-color)] text-xs">
            {rows.length} transfers
          </span>
        </div>

        <div className="flex items-center gap-2">
          {chains.map((c) => (
            <img
              key={c}
              src={getMSChainIconUrl(c)}
              alt={c}
              className="w-4 h-4 rounded-full"
            />
          ))}
          <button
            onClick={toggleInterChain}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors ml-2"
          >
            <i className="iconfont icon-close" style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>

      {/* ── Fund Flow Direction Header (CWTracker index_fundflowDirection parity) ── */}
      {fundFlowEntities.length >= 2 && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[var(--default-border-color)] flex-shrink-0 overflow-x-auto">
          {fundFlowEntities.map((entity, i) => (
            <React.Fragment key={entity.address}>
              <div className="flex items-center gap-1 flex-shrink-0">
                <img
                  src={getMSChainIconUrl(entity.chain)}
                  alt={entity.chain}
                  className="w-3.5 h-3.5 rounded-full"
                />
                <span className="text-[11px] text-white/80 max-w-[120px] truncate">
                  {entity.label !== entity.address
                    ? entity.label
                    : msShortenAddress(entity.address, 4)}
                </span>
              </div>
              {i < fundFlowEntities.length - 1 && (
                <i
                  className="iconfont icon-tx_to text-[var(--desc-color)]"
                  style={{ fontSize: 10, margin: "0 2px", flexShrink: 0 }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-[var(--secondary-background)] z-10">
            <tr className="text-left text-[var(--desc-color)]">
              <th className="px-2 py-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="accent-[var(--default-color)]"
                />
              </th>
              {/* Eye icon column header */}
              <th className="px-1 py-2 w-7 text-center font-normal">
                <i className="iconfont icon-eye" style={{ fontSize: 13, opacity: 0.5 }} />
              </th>
              <th className="px-1 py-2 w-8 text-center font-normal">#</th>
              <th className="px-2 py-2 font-normal" style={{ width: 138 }}>Source Tx</th>
              <th className="px-2 py-2 font-normal" style={{ width: "12%" }}>From</th>
              <th className="px-2 py-2 font-normal">Sent</th>
              <th className="px-2 py-2 font-normal">Date</th>
              {/* Track button column */}
              <th className="px-2 py-2 font-normal text-center" style={{ width: 90 }}>Action</th>
              <th className="px-2 py-2 font-normal" style={{ width: 138 }}>Destination Tx</th>
              <th className="px-2 py-2 font-normal" style={{ width: "12%" }}>To</th>
              <th className="px-2 py-2 font-normal">Received</th>
              <th className="px-2 py-2 font-normal">Date</th>
              <th className="px-2 py-2 font-normal text-center" style={{ width: 90 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isHidden = hiddenRows.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={`border-t border-[var(--default-border-color)] transition-colors ${
                    selectedRows.has(row.id)
                      ? "bg-[var(--table-active)]"
                      : "hover:bg-[var(--table-hover)]"
                  }${isHidden ? " opacity-30" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="accent-[var(--default-color)]"
                    />
                  </td>
                  {/* Eye icon — toggle row visibility on canvas */}
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => toggleVisibility(row.id)}
                      className="flex items-center justify-center w-5 h-5 mx-auto rounded hover:bg-white/10 transition-colors"
                    >
                      <i
                        className={`iconfont ${isHidden ? "icon-eye-close" : "icon-eye"}`}
                        style={{ fontSize: 13, color: isHidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)" }}
                      />
                    </button>
                  </td>
                  {/* Row # */}
                  <td className="px-1 py-1.5 text-center text-[var(--placeholder-color)]">
                    {row.index}
                  </td>
                  {/* Source Tx */}
                  <td className="px-2 py-1.5 font-mono text-[var(--default-color)] truncate max-w-[138px]">
                    {row.sourceTx ? msShortenAddress(row.sourceTx, 6) : "—"}
                  </td>
                  {/* From — structured cell with 14x14 logo + label + abbreviated address */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1 max-w-[275px]">
                      <img
                        src={getMSChainIconUrl(row.fromChain)}
                        className="flex-shrink-0 rounded-full"
                        style={{ width: 14, height: 14 }}
                        alt=""
                      />
                      <div className="flex flex-col min-w-0 leading-tight">
                        {row.fromLabel !== row.from && (
                          <span className="text-white text-[11px] truncate">{row.fromLabel}</span>
                        )}
                        <span className="text-[var(--desc-color)] text-[10px] font-mono truncate">
                          {msShortenAddress(row.from, 4)}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* Sent — chain logo + amount + token tag */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1 text-white">
                      <img
                        src={getMSChainIconUrl(row.fromChain)}
                        className="flex-shrink-0 rounded-full"
                        style={{ width: 12, height: 12 }}
                        alt=""
                      />
                      <span style={{ color: getMSTokenColor(row.sentToken) }}>{row.sent}</span>
                      <TokenTag symbol={row.sentToken} />
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-2 py-1.5 text-[var(--desc-color)]">{row.sentDate}</td>
                  {/* Track button (CWTracker index_trackBtn parity) */}
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => handleTrack(row)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white bg-[var(--default-color)] hover:brightness-110 transition-all"
                    >
                      <i className="iconfont icon-zhuizong" style={{ fontSize: 11 }} />
                      Track
                    </button>
                  </td>
                  {/* Dest Tx */}
                  <td className="px-2 py-1.5 font-mono text-[var(--default-color)] truncate max-w-[138px]">
                    {row.destTx ? msShortenAddress(row.destTx, 6) : "—"}
                  </td>
                  {/* To — structured cell with 14x14 logo + label + abbreviated address */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1 max-w-[275px]">
                      <img
                        src={getMSChainIconUrl(row.toChain)}
                        className="flex-shrink-0 rounded-full"
                        style={{ width: 14, height: 14 }}
                        alt=""
                      />
                      <div className="flex flex-col min-w-0 leading-tight">
                        {row.toLabel !== row.to && (
                          <span className="text-white text-[11px] truncate">{row.toLabel}</span>
                        )}
                        <span className="text-[var(--desc-color)] text-[10px] font-mono truncate">
                          {msShortenAddress(row.to, 4)}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* Received — chain logo + amount + token tag */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1 text-white">
                      <img
                        src={getMSChainIconUrl(row.toChain)}
                        className="flex-shrink-0 rounded-full"
                        style={{ width: 12, height: 12 }}
                        alt=""
                      />
                      <span style={{ color: getMSTokenColor(row.receivedToken) }}>{row.received}</span>
                      <TokenTag symbol={row.receivedToken} />
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-2 py-1.5 text-[var(--desc-color)]">{row.receivedDate}</td>
                  {/* Status */}
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        row.status === "completed"
                          ? "text-[#24c197] bg-[#24c19720]"
                          : row.status === "pending"
                          ? "text-[#f59e0b] bg-[#f59e0b20]"
                          : "text-[#ef4444] bg-[#ef444420]"
                      }`}
                    >
                      {row.status === "completed" ? "✓" : row.status === "pending" ? "⏳" : "✗"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-[var(--placeholder-color)]">
                  No transfers to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer (CWTracker index_footer parity) ── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-[var(--default-border-color)] flex-shrink-0 text-[10px] text-[var(--desc-color)]">
        <span>{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); /* TODO: open report dialog */ }}
          className="text-[var(--default-color)] hover:underline"
        >
          Report Bug
        </a>
      </div>
    </div>
  );
}
