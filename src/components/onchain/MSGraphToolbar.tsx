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
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
}

export function MSGraphToolbar({ onSearchOpen, onAddAddress }: MSGraphToolbarProps) {
  const nodes = useCWTrackerStore((s) => s.nodes);
  const edges = useCWTrackerStore((s) => s.edges);
  const getUniqueChains = useCWTrackerStore((s) => s.getUniqueChains);
  const getUniqueTokens = useCWTrackerStore((s) => s.getUniqueTokens);
  const chains = useMemo(() => getUniqueChains(), [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => getUniqueTokens(), [edges.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const filter = useCWTrackerStore((s) => s.filter);
  const setFilter = useCWTrackerStore((s) => s.setFilter);
  const { isMobile } = useMediaQuery();

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
      className={`flex items-center rounded-lg ${
        isMobile ? "h-7 px-0.5 gap-0" : "h-10 sm:h-11 px-1.5 sm:px-2 gap-0.5 sm:gap-1"
      }`}
      style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        maxWidth: isMobile ? "calc(100vw - 56px)" : undefined,
        overflow: "hidden",
      }}
    >
      {/* ── Address Filter ── */}
      <div ref={addrRef} className="relative">
        <button
          onClick={() => setAddressDropdown(!addressDropdown)}
          className={`flex items-center gap-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${
            isMobile ? "px-1.5 py-1 text-[10px]" : "gap-1.5 px-2.5 py-1.5 text-xs"
          }`}
        >
          <i className="iconfont icon-filter" style={{ fontSize: isMobile ? 12 : 14 }} />
          {!isMobile && <span>Address</span>}
          <i className="iconfont icon-arrow_down" style={{ fontSize: isMobile ? 8 : 10 }} />
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
          className={`flex items-center gap-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${
            isMobile ? "px-1.5 py-1 text-[10px]" : "gap-1.5 px-2.5 py-1.5 text-xs"
          }`}
        >
          <i className="iconfont icon-filter" style={{ fontSize: isMobile ? 12 : 14 }} />
          {!isMobile && <span>Token</span>}
          <i className="iconfont icon-arrow_down" style={{ fontSize: isMobile ? 8 : 10 }} />
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
        className={`flex items-center gap-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ${
          isMobile ? "px-1.5 py-1 text-[10px]" : "gap-1.5 px-2.5 py-1.5 text-xs"
        }`}
      >
        <i className="iconfont icon-add_no_bgc" style={{ fontSize: isMobile ? 12 : 14 }} />
        {!isMobile && <span>Add Address / Tx</span>}
      </button>

      {/* ── Divider ── */}
      <div className={`bg-white/20 mx-1 ${isMobile ? "w-px h-4" : "w-px h-5"}`} />

      {/* ── Search ── */}
      <Tip text="Search">
        <button
          onClick={onSearchOpen}
          className={`flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors ${
            isMobile ? "w-6 h-6" : "w-8 h-8"
          }`}
        >
          <i className="iconfont icon-search-lg" style={{ fontSize: isMobile ? 16 : 20 }} />
        </button>
      </Tip>
    </div>
  );
}
