/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SmartSearchInput — Address/entity search overlay             ║
 * ║  Searches through graph nodes, known entities, CSV labels    ║
 * ║  Ctrl+K shortcut, teal glass theme                           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  getMSEntityColor,
  getMSEntityIcon,
  getMSChainIconUrl,
  msShortenAddress,
  MS_ENTITY_TYPE_LABELS,
  type MSNode,
} from "@/lib/onchain/cwtracker-types";

interface SmartSearchInputProps {
  onSelect: (address: string, chain: string) => void;
  onClose: () => void;
}

export function SmartSearchInput({ onSelect, onClose }: SmartSearchInputProps) {
  const nodes = useCWTrackerStore((s) => s.nodes);
  const selectNode = useCWTrackerStore((s) => s.selectNode);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return nodes.slice(0, 15);
    const q = query.toLowerCase();
    return nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.address.toLowerCase().includes(q) ||
          (n.subLabel?.toLowerCase().includes(q) ?? false) ||
          n.type.toLowerCase().includes(q) ||
          n.chain.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, nodes]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[selectedIdx];
        if (item) {
          selectNode(item.id);
          onSelect(item.address, item.chain);
        }
      }
    },
    [results, selectedIdx, selectNode, onSelect]
  );

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "rgba(29,62,59,0.95)",
        backdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(20,184,166,0.25)",
        boxShadow:
          "0 24px 64px rgba(0,0,0,0.6), 0 0 20px rgba(20,184,166,0.1)",
      }}
    >
      {/* ── Search Input ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-teal-600/15">
        <span className="text-teal-400/60">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIdx(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search address, label, chain, entity type..."
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none font-mono"
        />
        <kbd className="px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-white/5 border border-white/10">
          ESC
        </kbd>
      </div>

      {/* ── Results ── */}
      <div className="max-h-[340px] overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-2xl opacity-20 mb-2">🔍</span>
            <p className="text-xs text-slate-500">No results found</p>
            {query.startsWith("0x") && query.length >= 10 && (
              <button
                className="mt-2 text-[10px] text-teal-400 hover:underline"
                onClick={() => onSelect(query, "ethereum")}
              >
                Add as new address →
              </button>
            )}
          </div>
        ) : (
          results.map((node, idx) => (
            <SearchResultItem
              key={node.id}
              node={node}
              isSelected={idx === selectedIdx}
              onClick={() => {
                selectNode(node.id);
                onSelect(node.address, node.chain);
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-teal-600/10 text-[9px] text-slate-500">
        <span>{results.length} results</span>
        <div className="flex items-center gap-3">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}

/* ── Search Result Item ── */
function SearchResultItem({
  node,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  node: MSNode;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const entityColor = getMSEntityColor(node.type);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-all ${
        isSelected ? "bg-teal-500/10" : "hover:bg-white/3"
      }`}
      style={{
        borderLeft: isSelected ? `2px solid ${entityColor}` : "2px solid transparent",
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {/* Entity icon */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded text-sm"
        style={{ background: `${entityColor}15` }}
      >
        {getMSEntityIcon(node.type)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-200 font-medium truncate">
            {node.label}
          </span>
          {node.isRoot && (
            <span className="text-[8px] text-teal-400 bg-teal-500/10 px-1 py-0 rounded">
              ROOT
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <img
            src={getMSChainIconUrl(node.chain)}
            alt=""
            className="w-3 h-3 rounded-full"
          />
          <span className="text-[10px] text-slate-500 font-mono">
            {msShortenAddress(node.address)}
          </span>
          <span
            className="text-[9px] px-1 rounded capitalize"
            style={{ color: entityColor, background: `${entityColor}10` }}
          >
            {MS_ENTITY_TYPE_LABELS[node.type]}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        <div className="text-[10px] text-slate-400">{node.txCount} tx</div>
        <div className="text-[9px] text-slate-500 capitalize">{node.chain}</div>
      </div>
    </div>
  );
}
