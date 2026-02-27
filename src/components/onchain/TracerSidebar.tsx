/**
 * TracerSidebar — Tabbed sidebar with autocomplete address search
 * Tabs: Inputs (search/add), Analysis, Flows, Settings
 * Desktop: fixed 30em column | Mobile: overlay with collapse
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTracerStore } from "@/lib/onchain/tracer-store";
import { detectInput } from "@/lib/onchain/addressDetector";
import type { SidebarTab, EntityType, GlobalFilter } from "@/lib/onchain/tracer-types";
import { ENTITY_TYPE_COLORS, shortenAddress, formatValue } from "@/lib/onchain/tracer-types";
import { useAddressSearch, CATEGORY_COLORS } from "@/hooks/useAddressSearch";
import type { AddressSuggestion } from "@/hooks/useAddressSearch";

interface TracerSidebarProps {
  chains: Array<{ chainUid: string; displayName: string }>;
  onTrace: (address: string, chain: string) => void;
  onExpand: (nodeId: string, direction: "in" | "out" | "both") => void;
}

export function TracerSidebar({ chains, onTrace, onExpand }: TracerSidebarProps) {
  const sidebarTab = useTracerStore((s) => s.sidebarTab);
  const setSidebarTab = useTracerStore((s) => s.setSidebarTab);

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: "inputs", label: "Inputs" },
    { key: "analysis", label: "Analysis" },
    { key: "flows", label: "Flows" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid rgba(20,184,166,0.12)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSidebarTab(tab.key)}
            className={`
              flex-1 py-2.5 text-xs font-medium tracking-wider uppercase transition-all
              ${sidebarTab === tab.key
                ? "text-teal-400"
                : "text-slate-500 hover:text-slate-300"
              }
            `}
            style={{
              borderBottom: sidebarTab === tab.key ? '2px solid rgba(20,184,166,0.7)' : '2px solid transparent',
              background: sidebarTab === tab.key ? 'rgba(20,184,166,0.05)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === "inputs" && (
          <InputsTab chains={chains} onTrace={onTrace} />
        )}
        {sidebarTab === "analysis" && <AnalysisTab onExpand={onExpand} />}
        {sidebarTab === "flows" && <FlowsTab />}
        {sidebarTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

/* ═══════════════════ Inputs Tab ═══════════════════ */

function InputsTab({
  onTrace,
}: {
  chains?: Array<{ chainUid: string; displayName: string }>;
  onTrace: (address: string, chain: string) => void;
}) {
  const [address, setAddress] = useState("");
  const [direction, setDirection] = useState<"both" | "in" | "out">("both");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isLoading = useTracerStore((s) => s.isLoading);
  const nodes = useTracerStore((s) => s.nodes);

  // Autocomplete search
  const { sections, isLoading: isSearching } = useAddressSearch(address);

  // Flatten suggestions for keyboard navigation
  const flatSuggestions = React.useMemo(() => {
    const flat: AddressSuggestion[] = [];
    for (const sec of sections) {
      for (const item of sec.items) flat.push(item);
    }
    return flat;
  }, [sections]);

  const uniqueNodes = React.useMemo(() => {
    const byAddress = new Map<string, import("@/lib/onchain/tracer-types").TraceNode>();
    for (const node of nodes) {
      const key = normalizeNodeAddress(node.address || node.id);
      const existing = byAddress.get(key);
      if (!existing) {
        byAddress.set(key, node);
        continue;
      }
      if (node.isRoot && !existing.isRoot) {
        byAddress.set(key, node);
        continue;
      }
      const existingScore = Number(Boolean(existing.iconUrl)) + Number(Boolean(existing.balance));
      const nextScore = Number(Boolean(node.iconUrl)) + Number(Boolean(node.balance));
      if (nextScore > existingScore) byAddress.set(key, node);
    }
    return Array.from(byAddress.values());
  }, [nodes]);

  // Auto-detect chain from typed address
  const detectedInfo = React.useMemo(() => {
    const trimmed = address.trim();
    if (!trimmed || trimmed.length < 6) return null;
    const d = detectInput(trimmed);
    if (d.confidence === 'none') return null;
    return d;
  }, [address]);

  const handleTrace = useCallback(() => {
    const trimmed = address.trim();
    if (!trimmed) return;
    const detection = detectInput(trimmed);
    const chain = detection.suggestedChainUid || "eip155:1";
    onTrace(trimmed, chain);
  }, [address, onTrace]);

  // Select a suggestion → auto-trace
  const selectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    setAddress(suggestion.address);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    const detection = detectInput(suggestion.address);
    const chain = detection.suggestedChainUid || "eip155:1";
    onTrace(suggestion.address, chain);
  }, [onTrace]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll('[data-suggestion-item]');
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && flatSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatSuggestions.length - 1
        );
        return;
      }
      if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(flatSuggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        return;
      }
    }
    if (e.key === "Enter" && !isLoading) handleTrace();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // Track flat index for keyboard nav across sections
  let flatIdx = -1;

  return (
    <div className="p-4 space-y-4">
      {/* ── Search input with autocomplete ── */}
      <div className="space-y-2">
        <div className="relative">
          {/* Search icon + input row */}
          <div
            className="flex items-center gap-2 rounded-md overflow-hidden bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
          >
            {/* Search icon */}
            <span
              className="pl-3 text-white/40 flex-shrink-0 cursor-pointer"
              onClick={() => inputRef.current?.focus()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>

            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (address.trim().length >= 2 && flatSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="ADD AN ADDRESS"
              className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-white/90 placeholder:text-white/25 outline-none font-mono"
              style={{ caretColor: '#5eead4' }}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
            />

            {/* Clear button */}
            {address && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setAddress(""); setShowSuggestions(false); setSelectedIndex(-1); }}
                className="pr-3 text-white/30 hover:text-white/60 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {/* Loading spinner */}
            {isSearching && (
              <span className="pr-3">
                <span className="block w-3.5 h-3.5 border-2 border-white/20 border-t-teal-400 rounded-full animate-spin" />
              </span>
            )}
          </div>

          {/* ── Suggestions dropdown ── */}
          {showSuggestions && sections.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full z-50 overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/10 border-t-0 rounded-b-md shadow-2xl custom-scrollbar"
              style={{
                maxHeight: '24rem',
                paddingBottom: '0.8rem',
              }}
            >
              {sections.map((sec) => (
                <div key={sec.section}>
                  {/* Section header */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1.5 select-none">
                    <span 
                      className="font-mono text-[10px] font-bold tracking-widest uppercase"
                      style={{
                        color: CATEGORY_COLORS[sec.section]?.text || '#94a3b8',
                      }}
                    >
                      {sec.section}
                    </span>
                  </div>

                  {/* Suggestion items */}
                  <div className="px-1">
                    {sec.items.map((item) => {
                      flatIdx++;
                      const idx = flatIdx;
                      const isSelected = idx === selectedIndex;
                      
                      return (
                        <div
                          key={`${item.address}-${idx}`}
                          data-suggestion-item
                          onMouseDown={() => selectSuggestion(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`
                            group flex items-center justify-between px-2 py-2 rounded-md cursor-pointer transition-all duration-150 relative
                            ${isSelected ? "bg-teal-500/10" : "hover:bg-white/5"}
                          `}
                        >
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-teal-500 rounded-r-full" />
                          )}

                          {/* Left: display text + icon */}
                          <div className="flex items-center gap-3 min-w-0 pl-1">
                            {/* Icon */}
                            <div className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
                              {item.hasIcon ? (
                                <img
                                  src={`/icons/entities/${item.slug}.png`}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black ring-1 ring-white/10"
                                  style={{
                                    backgroundColor: CATEGORY_COLORS[item.category]?.text || '#94a3b8',
                                  }}
                                >
                                  {item.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="hidden absolute inset-0 rounded-full bg-slate-800 flex items-center justify-center text-[8px] text-white font-mono border border-white/10">
                                ?
                              </div>
                            </div>
                            
                            {/* Text */}
                            <div className="truncate font-mono text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                              {item.display}
                              {/* Label badge if matched by label */}
                              {item.matchField === "label" && (
                                <span className="ml-2 px-1.5 py-0.5 text-[0.65em] rounded bg-white/10 text-white/50 group-hover:bg-white/20 transition-colors">
                                  LABEL MATCH
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Category dot */}
                          <div
                             className="w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2 opacity-50 group-hover:opacity-100 transition-opacity"
                             style={{
                               backgroundColor: CATEGORY_COLORS[item.category]?.text || '#555'
                             }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auto-detected chain badge */}
      {detectedInfo && !showSuggestions && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{
          background: 'rgba(20,184,166,0.08)',
          border: '1px solid rgba(20,184,166,0.2)',
        }}>
          <span className="text-teal-400">&#x26D3;</span>
          <span className="text-slate-300">
            Detected: <span className="text-teal-300 font-medium">{detectedInfo.chainFamily || detectedInfo.suggestedChainUid || 'EVM'}</span>
          </span>
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
            detectedInfo.confidence === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
            detectedInfo.confidence === 'medium' ? 'bg-amber-500/15 text-amber-400' :
            'bg-slate-500/15 text-slate-400'
          }`}>
            {detectedInfo.confidence}
          </span>
        </div>
      )}

      {/* Direction */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 uppercase tracking-wider">
          Direction
        </label>
        <div className="flex gap-1">
          {(["both", "in", "out"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`
                flex-1 py-1.5 rounded-lg text-xs font-medium uppercase transition-all
                ${direction === d
                  ? d === "in"
                    ? "text-emerald-400"
                    : d === "out"
                    ? "text-red-400"
                    : "text-teal-300"
                  : "text-slate-500 hover:text-slate-300"
                }
              `}
              style={{
                background: direction === d
                  ? d === "in"
                    ? "rgba(16,185,129,0.12)"
                    : d === "out"
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(20,184,166,0.15)"
                  : "rgba(29,62,59,0.35)",
                border: direction === d
                  ? d === "in"
                    ? "1px solid rgba(16,185,129,0.25)"
                    : d === "out"
                    ? "1px solid rgba(239,68,68,0.25)"
                    : "1px solid rgba(20,184,166,0.3)"
                  : "1px solid rgba(20,184,166,0.1)",
              }}
            >
              {d === "both" ? "Both" : d === "in" ? "↓ In" : "↑ Out"}
            </button>
          ))}
        </div>
      </div>

      {/* Trace button */}
      <button
        onClick={handleTrace}
        disabled={isLoading || !address.trim()}
        className="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{
          background: isLoading
            ? 'rgba(20,184,166,0.15)'
            : 'linear-gradient(135deg, rgba(20,184,166,0.4) 0%, rgba(16,140,126,0.5) 100%)',
          color: isLoading ? 'rgba(148,163,184,0.7)' : '#e2e8f0',
          border: '1px solid rgba(20,184,166,0.3)',
          boxShadow: isLoading ? 'none' : '0 2px 12px rgba(20,184,166,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          cursor: isLoading ? 'wait' : undefined,
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            Tracing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <img src="/icons/tracer/trace_address_icon_1.svg" alt="" className="w-4 h-4" />
            Trace Address
          </span>
        )}
      </button>

      {/* Active nodes list */}
      {uniqueNodes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Nodes ({uniqueNodes.length})
            </span>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {uniqueNodes.map((node) => (
              <NodeListItem key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Analysis Tab ═══════════════════ */

function AnalysisTab({
  onExpand,
}: {
  onExpand: (nodeId: string, direction: "in" | "out" | "both") => void;
}) {
  const selectedNodeId = useTracerStore((s) => s.selectedNodeId);
  const nodes = useTracerStore((s) => s.nodes);
  const edges = useTracerStore((s) => s.edges);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-500 text-sm">
          Select a node to view analysis
        </p>
        <img
          src="/icons/tracer/visualizeIcon.svg"
          alt=""
          className="w-12 h-12 mx-auto mt-4 opacity-20"
        />
      </div>
    );
  }

  const nodeEdges = edges.filter(
    (e) => e.source === selectedNode.id || e.target === selectedNode.id
  );
  const inEdges = nodeEdges.filter((e) => e.target === selectedNode.id);
  const outEdges = nodeEdges.filter((e) => e.source === selectedNode.id);
  const totalIn = inEdges.reduce((s, e) => s + e.totalValue, 0);
  const totalOut = outEdges.reduce((s, e) => s + e.totalValue, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Selected node info */}
      <div className="bg-slate-800/50 rounded p-3 space-y-2">
        <div className="flex items-center gap-2">
          {selectedNode.iconUrl && (
            <img src={selectedNode.iconUrl} alt="" className="w-8 h-8 rounded" />
          )}
          <div className="min-w-0">
            <div className="text-sm text-slate-200 font-medium truncate">
              {selectedNode.label}
            </div>
            <div className="text-xs text-slate-500 font-mono truncate" dir="ltr">
              {selectedNode.address}
            </div>
          </div>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: `${ENTITY_TYPE_COLORS[selectedNode.type]}20`,
              color: ENTITY_TYPE_COLORS[selectedNode.type],
            }}
          >
            {selectedNode.type}
          </span>
          {selectedNode.chainIconUrl && (
            <img src={selectedNode.chainIconUrl} alt="" className="w-4 h-4" />
          )}
          <span className="text-xs text-slate-500">{selectedNode.chain}</span>
        </div>
      </div>

      {/* Flow summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-3 text-center">
          <div className="text-xs text-emerald-400">↓ Incoming</div>
          <div className="text-sm text-emerald-300 font-medium mt-1">
            {formatValue(totalIn)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {inEdges.length} edges
          </div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded p-3 text-center">
          <div className="text-xs text-red-400">↑ Outgoing</div>
          <div className="text-sm text-red-300 font-medium mt-1">
            {formatValue(totalOut)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {outEdges.length} edges
          </div>
        </div>
      </div>

      {/* Balance */}
      {selectedNode.balance && (
        <div className="bg-slate-800/50 rounded p-3">
          <div className="text-xs text-slate-400 uppercase">Balance</div>
          <div className="text-lg text-slate-200 font-medium mt-1">
            {selectedNode.balance.formatted}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={() => onExpand(selectedNode.id, "both")}
          disabled={selectedNode.isExpanded || selectedNode.isLoading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <img src="/icons/tracer/expandIcon.svg" alt="" className="w-4 h-4" />
          Expand Node
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onExpand(selectedNode.id, "in")}
            className="flex-1 py-1.5 rounded text-xs border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            ↓ Expand In
          </button>
          <button
            onClick={() => onExpand(selectedNode.id, "out")}
            className="flex-1 py-1.5 rounded text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            ↑ Expand Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Flows Tab ═══════════════════ */

function FlowsTab() {
  const flows = useTracerStore((s) => s.flows);
  const edges = useTracerStore((s) => s.edges);
  const nodes = useTracerStore((s) => s.nodes);

  const topEdges = [...edges]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 20);

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-slate-400 uppercase tracking-wider">
        Top Flows ({edges.length} total)
      </div>

      {topEdges.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          No flows yet. Start tracing to see flows.
        </p>
      ) : (
        <div className="space-y-2">
          {topEdges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            return (
              <div
                key={edge.id}
                className="bg-slate-800/50 rounded p-2.5 space-y-1 hover:bg-slate-800/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate max-w-[40%]">
                    {sourceNode?.label || shortenAddress(edge.source)}
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-300 truncate max-w-[40%]">
                    {targetNode?.label || shortenAddress(edge.target)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {edge.transferCount} txs · {edge.tokenSymbol || "ETH"}
                  </span>
                  <span className="text-slate-200 font-medium">
                    {edge.valueLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Settings Tab ═══════════════════ */

function SettingsTab() {
  const displayOptions = useTracerStore((s) => s.displayOptions);
  const setDisplayOptions = useTracerStore((s) => s.setDisplayOptions);
  const filter = useTracerStore((s) => s.filter);
  const setFilter = useTracerStore((s) => s.setFilter);

  const entityTypes: EntityType[] = [
    "exchange", "protocol", "exploiter", "bridge", "institution",
    "lending", "dex", "token", "wallet",
  ];

  const toggleEntityFilter = (type: EntityType) => {
    const current = filter.entityTypes;
    if (current.includes(type)) {
      setFilter({ entityTypes: current.filter((t) => t !== type) });
    } else {
      setFilter({ entityTypes: [...current, type] });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Entity type filters */}
      <div className="space-y-2 rounded-lg p-3" style={{
        background: 'linear-gradient(135deg, rgba(29,62,59,0.75) 0%, rgba(24,52,49,0.65) 100%)',
        border: '1px solid rgba(20,184,166,0.15)',
        backdropFilter: 'blur(10px)',
      }}>
        <label className="text-xs text-slate-400 uppercase tracking-wider">
          Entity Types
        </label>
        <div className="flex flex-wrap gap-1.5">
          {entityTypes.map((type) => {
            const active = filter.entityTypes.length === 0 || filter.entityTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleEntityFilter(type)}
                className={`
                  px-2 py-1 rounded text-xs font-medium capitalize transition-all
                  ${active
                    ? "border"
                    : "opacity-30 border border-transparent"
                  }
                `}
                style={{
                  backgroundColor: active ? `${ENTITY_TYPE_COLORS[type]}15` : undefined,
                  color: ENTITY_TYPE_COLORS[type],
                  borderColor: active ? `${ENTITY_TYPE_COLORS[type]}40` : undefined,
                }}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min value filter */}
      <div className="space-y-2 rounded-lg p-3" style={{
        background: 'linear-gradient(135deg, rgba(29,62,59,0.75) 0%, rgba(24,52,49,0.65) 100%)',
        border: '1px solid rgba(20,184,166,0.15)',
        backdropFilter: 'blur(10px)',
      }}>
        <label className="text-xs text-slate-400 uppercase tracking-wider">
          Minimum Value
        </label>
        <input
          type="number"
          value={filter.minValue ?? ""}
          onChange={(e) =>
            setFilter({
              minValue: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="No minimum"
          className="w-full rounded px-3 py-2 text-sm text-slate-100 outline-none"
          style={{
            background: 'rgba(29,62,59,0.58)',
            border: '1px solid rgba(20,184,166,0.25)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
          }}
        />
      </div>

      {/* Layout mode */}
      <div className="space-y-2 rounded-lg p-3" style={{
        background: 'linear-gradient(135deg, rgba(29,62,59,0.75) 0%, rgba(24,52,49,0.65) 100%)',
        border: '1px solid rgba(20,184,166,0.15)',
        backdropFilter: 'blur(10px)',
      }}>
        <label className="text-xs text-slate-400 uppercase tracking-wider">
          Layout Mode
        </label>
        <div className="flex gap-1">
          {(["grid", "force"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDisplayOptions({ layoutMode: mode })}
              className={`
                flex-1 py-1.5 rounded text-xs font-medium capitalize
                ${displayOptions.layoutMode === mode
                  ? "text-teal-200 border"
                  : "text-slate-400 border"
                }
              `}
              style={displayOptions.layoutMode === mode ? {
                background: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(13,148,136,0.12) 100%)',
                borderColor: 'rgba(20,184,166,0.45)',
                boxShadow: '0 0 0 1px rgba(20,184,166,0.15) inset',
              } : {
                background: 'rgba(29,62,59,0.45)',
                borderColor: 'rgba(20,184,166,0.18)',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Node List Item ═══════════════════ */

function NodeListItem({
  node,
}: {
  node: import("@/lib/onchain/tracer-types").TraceNode;
}) {
  const selectNode = useTracerStore((s) => s.selectNode);
  const selectedNodeId = useTracerStore((s) => s.selectedNodeId);
  const isSelected = selectedNodeId === node.id;

  return (
    <button
      onClick={() => selectNode(node.id)}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors
        ${isSelected
          ? "border"
          : "hover:bg-slate-800/50 border border-transparent"
        }
      `}
      style={isSelected ? {
        background: 'linear-gradient(135deg, rgba(20,184,166,0.16) 0%, rgba(13,148,136,0.08) 100%)',
        borderColor: 'rgba(20,184,166,0.42)',
      } : undefined}
    >
      {node.iconUrl ? (
        <img src={node.iconUrl} alt="" className="w-5 h-5 rounded flex-shrink-0" />
      ) : (
        <div
          className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: ENTITY_TYPE_COLORS[node.type] }}
        >
          {node.label.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-300 truncate">{node.label}</div>
        <div className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
          {shortenAddress(node.address)}
        </div>
        {node.balance?.formatted && (
          <div className="text-[10px] text-emerald-400 font-medium truncate" dir="ltr">
            {node.balance.formatted}
          </div>
        )}
      </div>
      {node.isRoot && (
        <span className="text-[9px] text-teal-300 bg-teal-500/15 px-1 py-0.5 rounded shrink-0 border border-teal-400/25">
          ROOT
        </span>
      )}
      {node.isLoading && (
        <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
      )}
    </button>
  );
}

function normalizeNodeAddress(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const lowered = raw.toLowerCase();
  const hexMatch = lowered.match(/0x[a-f0-9]{8,}/);
  if (hexMatch) return hexMatch[0];

  if (raw.includes(":")) {
    const parts = raw.split(":").filter(Boolean);
    const last = parts[parts.length - 1]?.trim();
    if (last && !/^\d+$/.test(last) && last.length >= 8) {
      return last.toLowerCase();
    }
  }

  return lowered;
}
