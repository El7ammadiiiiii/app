/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSGraphToolbar — CWTracker floating top-left toolbar       ║
 * ║  Filter Address ▼ | Filter Token ▼ | Add Address/Tx         ║
 * ║  | memo | route | watermark | search                         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

/* ── Tooltip ── */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs bg-black/80 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  );
}

interface MSGraphToolbarProps {
  onSearchOpen?: () => void;
  onAddAddress?: () => void;
  onMemo?: () => void;
  onRoute?: () => void;
  onToggleWatermark?: () => void;
}

export function MSGraphToolbar({ onSearchOpen, onAddAddress, onMemo, onRoute, onToggleWatermark }: MSGraphToolbarProps) {
  const nodes = useCWTrackerStore((s) => s.nodes);
  const edges = useCWTrackerStore((s) => s.edges);
  const getUniqueChains = useCWTrackerStore((s) => s.getUniqueChains);
  const getUniqueTokens = useCWTrackerStore((s) => s.getUniqueTokens);
  const chains = useMemo(() => getUniqueChains(), [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => getUniqueTokens(), [edges.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const filter = useCWTrackerStore((s) => s.filter);
  const setFilter = useCWTrackerStore((s) => s.setFilter);

  const [addressDropdown, setAddressDropdown] = useState(false);
  const [tokenDropdown, setTokenDropdown] = useState(false);
  const addrRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);

  /* close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addrRef.current && !addrRef.current.contains(e.target as Node)) setAddressDropdown(false);
      if (tokenRef.current && !tokenRef.current.contains(e.target as Node)) setTokenDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  return (
    <div
      className="flex items-center h-11 rounded-lg px-2 gap-1"
      style={{
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* ── Address Filter ── */}
      <div ref={addrRef} className="relative">
        <button
          onClick={() => setAddressDropdown(!addressDropdown)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="iconfont icon-filter" style={{ fontSize: 14 }} />
          <span>Address</span>
          <i className="iconfont icon-arrow_down" style={{ fontSize: 10 }} />
        </button>
        {addressDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--dropdown-bgc)] border border-[var(--default-border-color)] rounded-md shadow-lg z-50 min-w-[160px] py-1 max-h-[240px] overflow-y-auto">
            {chains.length === 0 && (
              <div className="px-3 py-2 text-xs text-[var(--placeholder-color)]">No chains</div>
            )}
            {chains.map((c) => (
              <button
                key={c}
                onClick={() => toggleChain(c)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[var(--dropdown-hover)] transition-colors ${
                  filter.chains.includes(c) ? "text-[var(--default-color)]" : "text-[var(--desc-color)]"
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border ${
                  filter.chains.includes(c)
                    ? "bg-[var(--default-color)] border-[var(--default-color)]"
                    : "border-[var(--default-border-color)]"
                }`} />
                {c}
              </button>
            ))}
            {filter.chains.length > 0 && (
              <button
                onClick={() => setFilter({ chains: [] })}
                className="w-full px-3 py-1.5 text-xs text-[var(--default-color)] hover:bg-[var(--dropdown-hover)] border-t border-[var(--default-border-color)]"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Token Filter ── */}
      <div ref={tokenRef} className="relative">
        <button
          onClick={() => setTokenDropdown(!tokenDropdown)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="iconfont icon-filter" style={{ fontSize: 14 }} />
          <span>Token</span>
          <i className="iconfont icon-arrow_down" style={{ fontSize: 10 }} />
        </button>
        {tokenDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--dropdown-bgc)] border border-[var(--default-border-color)] rounded-md shadow-lg z-50 min-w-[160px] py-1 max-h-[240px] overflow-y-auto">
            {tokens.length === 0 && (
              <div className="px-3 py-2 text-xs text-[var(--placeholder-color)]">No tokens</div>
            )}
            {tokens.map((t) => (
              <button
                key={t}
                onClick={() => toggleToken(t)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[var(--dropdown-hover)] transition-colors ${
                  filter.tokens.includes(t) ? "text-[var(--default-color)]" : "text-[var(--desc-color)]"
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border ${
                  filter.tokens.includes(t)
                    ? "bg-[var(--default-color)] border-[var(--default-color)]"
                    : "border-[var(--default-border-color)]"
                }`} />
                {t}
              </button>
            ))}
            {filter.tokens.length > 0 && (
              <button
                onClick={() => setFilter({ tokens: [] })}
                className="w-full px-3 py-1.5 text-xs text-[var(--default-color)] hover:bg-[var(--dropdown-hover)] border-t border-[var(--default-border-color)]"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Add Address / Tx ── */}
      <button
        onClick={onAddAddress || onSearchOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <i className="iconfont icon-add_no_bgc" style={{ fontSize: 14 }} />
        <span>Add Address / Tx</span>
      </button>

      {/* ── Divider ── */}
      <div className="w-px h-5 bg-white/20 mx-1" />

      {/* ── Memo ── */}
      <Tip text="Memo">
        <button
          onClick={onMemo}
          className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="iconfont icon-memo" style={{ fontSize: 18 }} />
        </button>
      </Tip>

      {/* ── Route ── */}
      <Tip text="Route tracing">
        <button
          onClick={onRoute}
          className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="iconfont icon-route" style={{ fontSize: 20 }} />
        </button>
      </Tip>

      {/* ── Watermark ── */}
      <Tip text="Toggle watermark">
        <button
          onClick={onToggleWatermark}
          className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="iconfont icon-watermark" style={{ fontSize: 20 }} />
        </button>
      </Tip>

      {/* ── Search ── */}
      <Tip text="Search">
        <button
          onClick={onSearchOpen}
          className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="iconfont icon-search-lg" style={{ fontSize: 20 }} />
        </button>
      </Tip>
    </div>
  );
}
