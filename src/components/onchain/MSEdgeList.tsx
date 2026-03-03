/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSEdgeList — CWTracker-parity Edge List bottom panel        ║
 * ║  8-column table: Checkbox, Eye, From, To, Total Amount,       ║
 * ║  Selected Amount, Token, Transaction List.                     ║
 * ║  Resizable height, sortable columns, Export (CSV/JSON).       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useCallback, useMemo, useState, useRef } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  type MSEdge,
  type MSNode,
  msShortenAddress,
  msFormatValue,
  msFormatTokenAmount,
  getMSChainIconUrl,
} from "@/lib/onchain/cwtracker-types";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════ */

const MIN_PANEL_H = 160;
const DEFAULT_PANEL_H = 280;
const MAX_PANEL_H = 600;

type SortField = "totalAmount" | "selectedAmount" | "token" | "from" | "to";
type SortDir = "asc" | "desc";

/* ════════════════════════════════════════════════════════════════
   EdgeRow — derived row for table display
   ════════════════════════════════════════════════════════════════ */

interface EdgeRow {
  edge: MSEdge;
  srcNode: MSNode | undefined;
  tgtNode: MSNode | undefined;
  fromLabel: string;
  fromAddress: string;
  toLabel: string;
  toAddress: string;
  totalAmount: number;
  selectedAmount: number;
  token: string;
  chain: string;
  txCount: number;
}

/* ════════════════════════════════════════════════════════════════
   SORT ICON
   ════════════════════════════════════════════════════════════════ */

function SortIcon({ field, current, dir }: { field: SortField; current: SortField | null; dir: SortDir }) {
  const isActive = current === field;
  return (
    <span className="inline-flex flex-col ml-1 -my-0.5 leading-none">
      <i
        className="iconfont icon-caret-up"
        style={{ fontSize: 8, color: isActive && dir === "asc" ? "var(--default-color)" : "var(--desc-color)", lineHeight: 1 }}
      />
      <i
        className="iconfont icon-caret-down"
        style={{ fontSize: 8, color: isActive && dir === "desc" ? "var(--default-color)" : "var(--desc-color)", lineHeight: 1 }}
      />
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════ */

export function MSEdgeList() {
  /* ── Store ── */
  const edges = useCWTrackerStore((s) => s.edges);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const edgeListOpen = useCWTrackerStore((s) => s.edgeListOpen);
  const closeEdgeList = useCWTrackerStore((s) => s.closeEdgeList);
  const toggleEdgeVisibility = useCWTrackerStore((s) => s.toggleEdgeVisibility);
  const selectEdge = useCWTrackerStore((s) => s.selectEdge);
  const exportEdgeListData = useCWTrackerStore((s) => s.exportEdgeListData);

  /* ── Local state ── */
  const [panelH, setPanelH] = useState(DEFAULT_PANEL_H);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);

  /* ── Derived rows ── */
  const rows: EdgeRow[] = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((edge) => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      return {
        edge,
        srcNode: src,
        tgtNode: tgt,
        fromLabel: src?.label || msShortenAddress(src?.address ?? edge.source),
        fromAddress: src?.address ?? edge.source,
        toLabel: tgt?.label || msShortenAddress(tgt?.address ?? edge.target),
        toAddress: tgt?.address ?? edge.target,
        totalAmount: edge.totalValue,
        selectedAmount: edge.isSelected ? edge.totalValue : 0,
        token: edge.tokenSymbol,
        chain: edge.chain,
        txCount: edge.transferCount,
      };
    });
  }, [edges, nodes]);

  /* ── Sorted rows ── */
  const sortedRows = useMemo(() => {
    if (!sortField) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "totalAmount":
          cmp = a.totalAmount - b.totalAmount;
          break;
        case "selectedAmount":
          cmp = a.selectedAmount - b.selectedAmount;
          break;
        case "token":
          cmp = a.token.localeCompare(b.token);
          break;
        case "from":
          cmp = a.fromLabel.localeCompare(b.fromLabel);
          break;
        case "to":
          cmp = a.toLabel.localeCompare(b.toLabel);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortField, sortDir]);

  /* ── Handlers ── */
  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir("desc");
      return field;
    });
  }, []);

  const toggleCheckAll = useCallback(() => {
    setCheckedIds((prev) => {
      if (prev.size === edges.length) return new Set();
      return new Set(edges.map((e) => e.id));
    });
  }, [edges]);

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExport = useCallback(
    (format: "csv" | "json") => {
      const data = exportEdgeListData(format);
      const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edge-list.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    },
    [exportEdgeListData]
  );

  /* ── Resize drag ── */
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startY: e.clientY, startH: panelH };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = resizeRef.current.startY - ev.clientY;
        const newH = Math.max(MIN_PANEL_H, Math.min(MAX_PANEL_H, resizeRef.current.startH + delta));
        setPanelH(newH);
      };
      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [panelH]
  );

  if (!edgeListOpen) return null;

  const allChecked = checkedIds.size === edges.length && edges.length > 0;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col"
      style={{
        height: panelH,
        background: "linear-gradient(180deg, rgba(29,43,40,0.96) 0%, rgba(38,74,70,0.15) 50%, rgba(20,31,31,0.96) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(38,74,70,0.4)",
      }}
    >
      {/* ── Resize handle ── */}
      <div
        className="h-1 cursor-ns-resize hover:bg-[var(--default-color)] transition-colors flex-shrink-0"
        onMouseDown={onResizeMouseDown}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0 border-b border-white/10">
        <div className="flex items-center gap-2">
          <i className="iconfont icon-swap" style={{ fontSize: 14, color: "var(--default-color)" }} />
          <span className="text-xs font-medium text-white">Edge List</span>
          <span className="text-[10px] text-white/60">({edges.length} edges)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/60 hover:text-white border border-white/15 hover:border-[var(--default-color)] rounded transition-colors"
            >
              <i className="iconfont icon-download" style={{ fontSize: 12 }} />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[rgba(30,28,24,0.95)] border border-white/15 rounded shadow-lg z-50 min-w-[80px]">
                <button
                  onClick={() => handleExport("csv")}
                  className="block w-full text-left px-3 py-1.5 text-[10px] text-white/60 hover:text-white hover:bg-[var(--action-hover)] transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="block w-full text-left px-3 py-1.5 text-[10px] text-white/60 hover:text-white hover:bg-[var(--action-hover)] transition-colors"
                >
                  JSON
                </button>
              </div>
            )}
          </div>
          {/* Close */}
          <button
            onClick={closeEdgeList}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: "rgba(30,28,24,0.92)" }}>
            <tr className="border-b border-white/10">
              {/* Checkbox */}
              <th className="w-8 px-2 py-1.5 text-center">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleCheckAll}
                  className="accent-[var(--default-color)] w-3 h-3 cursor-pointer"
                />
              </th>
              {/* Eye (visibility) */}
              <th className="w-8 px-1 py-1.5 text-center">
                <i className="iconfont icon-eye" style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />
              </th>
              {/* From */}
              <th
                className="px-2 py-1.5 text-left text-white/60 font-normal cursor-pointer select-none hover:text-white"
                onClick={() => toggleSort("from")}
              >
                From
                <SortIcon field="from" current={sortField} dir={sortDir} />
              </th>
              {/* To */}
              <th
                className="px-2 py-1.5 text-left text-white/60 font-normal cursor-pointer select-none hover:text-white"
                onClick={() => toggleSort("to")}
              >
                To
                <SortIcon field="to" current={sortField} dir={sortDir} />
              </th>
              {/* Total Amount */}
              <th
                className="px-2 py-1.5 text-right text-white/60 font-normal cursor-pointer select-none hover:text-white"
                onClick={() => toggleSort("totalAmount")}
              >
                Total Amount
                <SortIcon field="totalAmount" current={sortField} dir={sortDir} />
              </th>
              {/* Selected Amount */}
              <th
                className="px-2 py-1.5 text-right text-white/60 font-normal cursor-pointer select-none hover:text-white"
                onClick={() => toggleSort("selectedAmount")}
              >
                Selected Amount
                <SortIcon field="selectedAmount" current={sortField} dir={sortDir} />
              </th>
              {/* Token */}
              <th
                className="px-2 py-1.5 text-left text-white/60 font-normal cursor-pointer select-none hover:text-white"
                onClick={() => toggleSort("token")}
              >
                Token
                <SortIcon field="token" current={sortField} dir={sortDir} />
              </th>
              {/* Transaction List */}
              <th className="px-2 py-1.5 text-center text-white/60 font-normal">
                Transaction List
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-white/50 py-8">
                  No edges in the graph
                </td>
              </tr>
            )}
            {sortedRows.map((row, idx) => {
              const isChecked = checkedIds.has(row.edge.id);
              const isVisible = row.edge.isVisible !== false;
              return (
                <tr
                  key={row.edge.id}
                  className={`EDGES_TABLE_ROW_${row.edge.id} border-b border-white/8 hover:bg-[var(--action-hover)] transition-colors ${
                    !isVisible ? "opacity-40" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(row.edge.id)}
                      className="accent-[var(--default-color)] w-3 h-3 cursor-pointer"
                    />
                  </td>
                  {/* Eye */}
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => toggleEdgeVisibility(row.edge.id)}
                      className="text-white/50 hover:text-white transition-colors"
                      title={isVisible ? "Hide edge" : "Show edge"}
                    >
                      <i
                        className={`iconfont ${isVisible ? "icon-eye" : "icon-eye-invisible"}`}
                        style={{ fontSize: 12 }}
                      />
                    </button>
                  </td>
                  {/* From */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={getMSChainIconUrl(row.chain)}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      />
                      <span className="text-white truncate max-w-[120px]" title={row.fromAddress}>
                        {row.fromLabel}
                      </span>
                    </div>
                  </td>
                  {/* To */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={getMSChainIconUrl(row.chain)}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      />
                      <span className="text-white truncate max-w-[120px]" title={row.toAddress}>
                        {row.toLabel}
                      </span>
                    </div>
                  </td>
                  {/* Total Amount */}
                  <td className="px-2 py-1.5 text-right text-white tabular-nums">
                    {msFormatValue(row.totalAmount)}
                  </td>
                  {/* Selected Amount */}
                  <td className="px-2 py-1.5 text-right text-white/50 tabular-nums">
                    {row.selectedAmount > 0 ? msFormatValue(row.selectedAmount) : "—"}
                  </td>
                  {/* Token */}
                  <td className="px-2 py-1.5">
                    <span className="text-[var(--default-color)]">{row.token}</span>
                  </td>
                  {/* Transaction List */}
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => selectEdge(row.edge.id)}
                      className="text-[10px] text-[var(--default-color)] hover:text-white transition-colors"
                    >
                      ({row.txCount}/{row.edge.details.length}) Detail &gt;&gt;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer summary ── */}
      <div className="flex items-center justify-between px-3 py-1 flex-shrink-0 border-t border-white/10 text-[10px] text-white/60">
        <span>
          {checkedIds.size > 0 ? `${checkedIds.size} selected` : `${edges.length} edges total`}
        </span>
        <span>
          Total: {msFormatValue(rows.reduce((sum, r) => sum + r.totalAmount, 0))}
        </span>
      </div>
    </div>
  );
}
