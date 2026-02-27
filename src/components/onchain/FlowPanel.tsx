/**
 * FlowPanel — CW-style flow summary with VIEWING header,
 * INFLOWS/OUTFLOWS tabs, pagination (10/page), per-node context,
 * and NEW TRACE button at bottom.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useTracerStore } from "@/lib/onchain/tracer-store";
import { shortenAddress, formatValue, ENTITY_TYPE_COLORS } from "@/lib/onchain/tracer-types";

const ITEMS_PER_PAGE = 10;

export function FlowPanel() {
  const flowPanelOpen = useTracerStore((s) => s.flowPanelOpen);
  const toggleFlowPanel = useTracerStore((s) => s.toggleFlowPanel);
  const nodes = useTracerStore((s) => s.nodes);
  const edges = useTracerStore((s) => s.edges);
  const selectedNodeId = useTracerStore((s) => s.selectedNodeId);
  const selectNode = useTracerStore((s) => s.selectNode);
  const toggleIncludedNode = useTracerStore((s) => s.toggleIncludedNode);
  const includedNodeIds = useTracerStore((s) => s.includedNodeIds);
  const resetTrace = useTracerStore((s) => s.resetTrace);

  const [activeTab, setActiveTab] = useState<"in" | "out">("out");
  const [page, setPage] = useState(0);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Reset page when tab changes
  const switchTab = useCallback((tab: "in" | "out") => {
    setActiveTab(tab);
    setPage(0);
  }, []);

  if (!flowPanelOpen) return null;

  // The "context node" — selected node, or root node, or first node
  const contextNode = nodes.find((n) => n.id === selectedNodeId)
    || nodes.find((n) => n.isRoot)
    || nodes[0];

  if (!contextNode) return null;

  // Get edges for this context node
  const contextEdges = edges.filter(
    (e) => e.source === contextNode.id || e.target === contextNode.id
  );

  // Filter by direction relative to the context node
  // INFLOW: edge target === contextNode (someone sends TO us)
  // OUTFLOW: edge source === contextNode (we send TO someone)
  const relevantEdges = contextEdges.filter((e) => {
    if (activeTab === "in") return e.target === contextNode.id;
    return e.source === contextNode.id;
  });

  // Group by counterparty
  type FlowGroup = {
    counterpartyId: string;
    totalValue: number;
    count: number;
    chain: string;
  };

  const flowMap = new Map<string, FlowGroup>();
  for (const edge of relevantEdges) {
    // Counterparty is the OTHER side
    const counterpartyId = activeTab === "in" ? edge.source : edge.target;
    const existing = flowMap.get(counterpartyId);
    if (existing) {
      existing.totalValue += edge.totalValue;
      existing.count += edge.transferCount;
    } else {
      flowMap.set(counterpartyId, {
        counterpartyId,
        totalValue: edge.totalValue,
        count: edge.transferCount,
        chain: edge.chain,
      });
    }
  }

  const sortedFlows = [...flowMap.values()].sort((a, b) => b.totalValue - a.totalValue);
  const totalPages = Math.max(1, Math.ceil(sortedFlows.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = sortedFlows.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // Copy address helper
  const handleCopy = (addr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  // Is a node currently visible on the graph?
  const isNodeIncluded = (nodeId: string) => {
    if (includedNodeIds.length === 0) return true; // all visible when no filter
    return includedNodeIds.includes(nodeId);
  };

  // Toggle visibility of a counterparty node
  const handleToggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleIncludedNode(nodeId);
  };

  // Context node display name
  const contextName = contextNode.label === shortenAddress(contextNode.address)
    ? 'Unknown'
    : contextNode.label;

  return (
    <div
      className="flex flex-col rounded-t-lg md:rounded-lg overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {/* ── VIEWING: [Entity Info] ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-black/40">
        <span className="text-[10px] text-slate-500 tracking-widest uppercase flex-shrink-0">VIEWING:</span>
        {contextNode.iconUrl ? (
          <img src={contextNode.iconUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
            style={{
              backgroundColor: ENTITY_TYPE_COLORS[contextNode.type] || '#64748b',
              color: '#000',
            }}
          >
            {contextName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-slate-200 font-medium truncate">
          {contextName} ({shortenAddress(contextNode.address, 4)})
        </span>
        <button
          onClick={toggleFlowPanel}
          className="ml-auto w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* ── Section Label ── */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] text-slate-500 tracking-widest uppercase">
          TOGGLE VISIBLE TRACE NODES:
        </span>
      </div>

      {/* ── Tabs + Pagination ── */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex gap-0">
          <button
            onClick={() => switchTab("in")}
            className={`px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-all rounded-l ${
              activeTab === "in"
                ? "bg-white/10 text-slate-200"
                : "bg-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            INFLOWS
          </button>
          <button
            onClick={() => switchTab("out")}
            className={`px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-all rounded-r ${
              activeTab === "out"
                ? "bg-white/10 text-slate-200"
                : "bg-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            OUTFLOWS
          </button>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>
          <span className="text-slate-500 font-mono tabular-nums">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Flow List ── */}
      <div className="overflow-y-auto max-h-[28rem] custom-scrollbar">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
            <span className="text-xl opacity-20">∅</span>
            <span className="text-xs">No {activeTab === "in" ? "inflows" : "outflows"} found</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {pageItems.map((flow, i) => {
              const counterpartyNode = nodes.find((n) => n.id === flow.counterpartyId);
              const addr = counterpartyNode?.address || flow.counterpartyId;
              const name = counterpartyNode?.label || shortenAddress(addr);
              const isKnownEntity = name !== shortenAddress(addr);
              const nodeVisible = isNodeIncluded(flow.counterpartyId);

              return (
                <div
                  key={flow.counterpartyId}
                  className="group flex items-center justify-between px-4 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => selectNode(flow.counterpartyId)}
                >
                  {/* Left: Icon + Name + Address */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Entity Icon */}
                    <div className="relative flex-shrink-0 w-6 h-6">
                      {counterpartyNode?.iconUrl ? (
                        <img src={counterpartyNode.iconUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: ENTITY_TYPE_COLORS[counterpartyNode?.type || 'unknown'] || '#475569',
                            color: '#000',
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name (Entity Name + Shortened Addr) or just Addr */}
                    <span className="text-sm text-slate-200 truncate">
                      {isKnownEntity
                        ? `${name} (${shortenAddress(addr, 4)})`
                        : shortenAddress(addr, 6)
                      }
                    </span>

                    {/* Copy button */}
                    <button
                      onClick={(e) => handleCopy(addr, e)}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-slate-400 transition-opacity flex-shrink-0"
                      title="Copy address"
                    >
                      {copiedAddr === addr ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Right: Value + Toggle button */}
                  <div className="flex items-center gap-3 pl-3 flex-shrink-0">
                    <span className="text-sm font-medium text-slate-200 tabular-nums">
                      {formatValue(flow.totalValue)}
                    </span>

                    {/* Toggle node visibility: green ⊕ (add/show) or red ⊖ (remove/hide) */}
                    <button
                      onClick={(e) => handleToggleNode(flow.counterpartyId, e)}
                      className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${nodeVisible
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-black"
                        }
                      `}
                      title={nodeVisible ? "Hide from graph" : "Show on graph"}
                    >
                      {nodeVisible ? "+" : "−"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── NEW TRACE Button ── */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={() => {
            resetTrace();
            toggleFlowPanel();
          }}
          className="w-full py-2.5 rounded-lg text-sm font-bold tracking-wider uppercase transition-all bg-teal-600 hover:bg-teal-500 text-white"
        >
          NEW TRACE
        </button>
      </div>
    </div>
  );
}
