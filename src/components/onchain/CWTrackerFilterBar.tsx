/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWTrackerFilterBar — Bottom filter bar                      ║
 * ║  Chain filter, token filter, value range, date range          ║
 * ║  Quick toggles for suspicious and cross-chain                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import { getMSChainIconUrl } from "@/lib/onchain/cwtracker-types";

export function CWTrackerFilterBar() {
  const filter = useCWTrackerStore((s) => s.filter);
  const setFilter = useCWTrackerStore((s) => s.setFilter);
  const getUniqueChains = useCWTrackerStore((s) => s.getUniqueChains);
  const getUniqueTokens = useCWTrackerStore((s) => s.getUniqueTokens);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const edges = useCWTrackerStore((s) => s.edges);

  const chains = useMemo(() => getUniqueChains(), [nodes.length]); // eslint-disable-line
  const tokens = useMemo(() => getUniqueTokens(), [edges.length]); // eslint-disable-line

  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);

  const toggleChain = useCallback(
    (chain: string) => {
      const current = filter.chains;
      const next = current.includes(chain)
        ? current.filter((c) => c !== chain)
        : [...current, chain];
      setFilter({ chains: next });
    },
    [filter.chains, setFilter]
  );

  const toggleToken = useCallback(
    (token: string) => {
      const current = filter.tokens;
      const next = current.includes(token)
        ? current.filter((t) => t !== token)
        : [...current, token];
      setFilter({ tokens: next });
    },
    [filter.tokens, setFilter]
  );

  const clearFilters = useCallback(() => {
    setFilter({
      chains: [],
      entityTypes: [],
      tokens: [],
      minValue: 0,
      maxValue: Infinity,
      searchText: "",
      suspiciousOnly: false,
      crossChainOnly: false,
    });
  }, [setFilter]);

  const hasActiveFilters =
    filter.chains.length > 0 ||
    filter.tokens.length > 0 ||
    filter.minValue > 0 ||
    filter.suspiciousOnly ||
    filter.crossChainOnly ||
    filter.searchText.length > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto">
      {/* ── Chain filter ── */}
      <div className="relative">
        <FilterChip
          label={
            filter.chains.length > 0
              ? `Chains (${filter.chains.length})`
              : "All Chains"
          }
          active={filter.chains.length > 0}
          onClick={() => {
            setShowChainDropdown(!showChainDropdown);
            setShowTokenDropdown(false);
          }}
        />
        {showChainDropdown && (
          <DropdownPanel onClose={() => setShowChainDropdown(false)}>
            {chains.map((chain) => (
              <DropdownItem
                key={chain}
                label={chain}
                icon={
                  <img
                    src={getMSChainIconUrl(chain)}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                }
                checked={filter.chains.includes(chain)}
                onClick={() => toggleChain(chain)}
              />
            ))}
          </DropdownPanel>
        )}
      </div>

      {/* ── Token filter ── */}
      <div className="relative">
        <FilterChip
          label={
            filter.tokens.length > 0
              ? `Tokens (${filter.tokens.length})`
              : "All Tokens"
          }
          active={filter.tokens.length > 0}
          onClick={() => {
            setShowTokenDropdown(!showTokenDropdown);
            setShowChainDropdown(false);
          }}
        />
        {showTokenDropdown && (
          <DropdownPanel onClose={() => setShowTokenDropdown(false)}>
            {tokens.map((token) => (
              <DropdownItem
                key={token}
                label={token}
                icon={<span className="text-xs">🪙</span>}
                checked={filter.tokens.includes(token)}
                onClick={() => toggleToken(token)}
              />
            ))}
          </DropdownPanel>
        )}
      </div>

      {/* ── Quick toggles ── */}
      <FilterChip
        label="⚠️ Suspicious"
        active={filter.suspiciousOnly}
        onClick={() => setFilter({ suspiciousOnly: !filter.suspiciousOnly })}
      />
      <FilterChip
        label="🌉 Cross-chain"
        active={filter.crossChainOnly}
        onClick={() => setFilter({ crossChainOnly: !filter.crossChainOnly })}
      />

      {/* ── Search ── */}
      <div className="flex-1 max-w-[200px]">
        <input
          type="text"
          value={filter.searchText}
          onChange={(e) => setFilter({ searchText: e.target.value })}
          placeholder="Filter nodes..."
          className="w-full h-6 px-2 rounded text-[11px] bg-white/5 border border-teal-600/15 text-slate-300 placeholder:text-slate-500 outline-none focus:border-teal-400/30 transition-colors"
        />
      </div>

      {/* ── Clear ── */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-[10px] text-teal-400/70 hover:text-teal-300 transition-colors px-2"
        >
          Clear all
        </button>
      )}

      {/* ── Stats ── */}
      <div className="ml-auto text-[10px] text-slate-500 hidden md:flex items-center gap-3">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} edges</span>
        <span>{chains.length} chains</span>
      </div>
    </div>
  );
}

/* ── Filter Chip ── */
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1 h-6 px-2 rounded-full text-[11px] whitespace-nowrap transition-all
        ${
          active
            ? "bg-teal-500/20 text-teal-300 border border-teal-400/30"
            : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/8 hover:text-slate-300"
        }
      `}
    >
      {label}
    </button>
  );
}

/* ── Dropdown Panel ── */
function DropdownPanel({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute bottom-full mb-1 left-0 z-50 min-w-[180px] max-h-[240px] overflow-y-auto rounded-lg py-1"
        style={{
          background: "rgba(29,62,59,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(20,184,166,0.2)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </>
  );
}

/* ── Dropdown Item ── */
function DropdownItem({
  label,
  icon,
  checked,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <label
      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={onClick}
    >
      <div
        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
          checked
            ? "bg-teal-500/30 border-teal-400/50"
            : "bg-transparent border-slate-500/30"
        }`}
      >
        {checked && <span className="text-teal-400 text-[9px]">✓</span>}
      </div>
      {icon}
      <span className="text-xs text-slate-300 capitalize">{label}</span>
    </label>
  );
}
