/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSAddressDetail — CWTracker address detail sidebar            ║
 * ║  750px, absolute left, Tabs: Related Address / Transfer       ║
 * ║  v4: solid bg, LTR, fixed columns, chains dropdown,          ║
 * ║      risk badge, data explorer link, date/hash fixes          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  type MSNode,
  type MSEdge,
  type MSSidebarSubTab,
  type MSRiskLevel,
  MS_COLORS,
  getMSRiskColor,
  getMSRiskLabel,
  getMSChainIconUrl,
  msShortenAddress,
  msFormatTokenAmount,
  getMSEntityIconClass,
  getMSEntityTypeLabel,
  getMSTokenColor,
  getMSEntityColor,
  getMSTokenIconUrl,
  getBlockExplorerUrl,
  msFormatValue,
} from "@/lib/onchain/cwtracker-types";

/* ── Helpers ── */
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

/** Format date to YYYY-MM-DD HH:mm:ss (CW-style) */
function formatDateCW(ms: number): string {
  if (!ms || ms <= 0) return "\u2014";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "\u2014";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Parse a timestamp string robustly — handles ISO, unix-seconds, etc. */
function parseTimestamp(ts: string | undefined | null): number {
  if (!ts) return 0;
  // Try as number (unix seconds or ms)
  const num = Number(ts);
  if (!isNaN(num) && num > 0) {
    return num > 1e12 ? num : num * 1000; // normalize to ms
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/* ════════════════════════════════════════════════════════════════
   SHARED TOOLTIP — reusable hover tooltip using group-hover pattern
   ════════════════════════════════════════════════════════════════ */

function CellTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[var(--default-border-color)] shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap text-xs">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#1a1a1a]" />
    </div>
  );
}

function AddressTooltip({ label, address, chain }: { label: string; address: string; chain: string }) {
  return (
    <div className="flex flex-col gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <img src={getMSChainIconUrl(chain)} alt="" className="w-4 h-4 rounded-full" />
        <span className="text-white font-medium">{label}</span>
        <button onClick={() => copyToClipboard(label)} className="text-white/40 hover:text-white"><i className="iconfont icon-copy" style={{ fontSize: 11 }} /></button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-white/50 font-mono text-[11px]">{address}</span>
        <button onClick={() => copyToClipboard(address)} className="text-white/40 hover:text-white"><i className="iconfont icon-copy" style={{ fontSize: 11 }} /></button>
        <a href={getBlockExplorerUrl(chain, address)} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
          <i className="iconfont icon-data_explorer" style={{ fontSize: 11 }} />
        </a>
      </div>
    </div>
  );
}

function TxHashTooltip({ hash, chain }: { hash: string; chain: string }) {
  const explorerBase = getBlockExplorerUrl(chain, "").replace(/\/address\/$/, "");
  return (
    <div className="flex items-center gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <span className="text-white/80 font-mono text-[11px]">{hash}</span>
      <button onClick={() => copyToClipboard(hash)} className="text-white/40 hover:text-white"><i className="iconfont icon-copy" style={{ fontSize: 11 }} /></button>
      <a href={`${explorerBase}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
        <i className="iconfont icon-data_explorer" style={{ fontSize: 11 }} />
      </a>
    </div>
  );
}

function TokenTooltip({ symbol, chain }: { symbol: string; chain: string }) {
  const iconUrl = getMSTokenIconUrl(symbol);
  return (
    <div className="flex items-center gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      {iconUrl ? <img src={iconUrl} alt="" className="w-4 h-4 rounded-full" /> : (
        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: `${getMSTokenColor(symbol)}30`, color: getMSTokenColor(symbol) }}>{symbol.charAt(0)}</span>
      )}
      <span className="text-white font-medium">{symbol}</span>
      <button onClick={() => copyToClipboard(symbol)} className="text-white/40 hover:text-white"><i className="iconfont icon-copy" style={{ fontSize: 11 }} /></button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ACTIVE CHAINS DROPDOWN — per-chain info popup (CW-style)
   ════════════════════════════════════════════════════════════════ */

function ActiveChainsDropdown({ node }: { node: MSNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!node.activeChains || node.activeChains.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--default-border-color)] bg-[var(--primary-background)] hover:border-[var(--default-color)] transition-colors text-[11px] text-[var(--desc-color)]"
      >
        <span>Active on {node.activeChains.length} chain{node.activeChains.length > 1 ? "s" : ""}</span>
        <div className="flex items-center gap-0.5 ml-0.5">
          {node.activeChains.slice(0, 4).map((c) => (
            <img key={c} src={getMSChainIconUrl(c)} alt={c} className="w-3.5 h-3.5 rounded-full" />
          ))}
          {node.activeChains.length > 4 && <span className="text-[9px] text-white/40">+{node.activeChains.length - 4}</span>}
        </div>
        <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown popup */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#1d1d1d] border border-[var(--default-border-color)] rounded-lg shadow-xl min-w-[260px] py-1.5">
          {node.activeChains.map((chainName) => {
            const firstSeen = node.chainFirstSeen?.[chainName] || node.firstSeen || "";
            const balances = node.chainBalances?.[chainName];
            const displayBalance = balances && balances.length > 0
              ? `$${msFormatValue(balances.reduce((s, b) => s + b.usdValue, 0))}`
              : "$0";
            const firstSeenDate = firstSeen
              ? (() => { const d = new Date(firstSeen); return isNaN(d.getTime()) ? "" : `Since ${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()
              : "";

            return (
              <div key={chainName} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors">
                <img src={getMSChainIconUrl(chainName)} alt={chainName} className="w-5 h-5 rounded-full flex-shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-white text-xs font-medium capitalize">{chainName}</span>
                  {firstSeenDate && <span className="text-[10px] text-white/40">{firstSeenDate}</span>}
                </div>
                <span className="text-white text-xs font-medium tabular-nums">{displayBalance}</span>
                <div className="flex items-center gap-1 ml-1">
                  <a href={getBlockExplorerUrl(chainName, node.address)} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white transition-colors" title="Block Explorer">
                    <i className="iconfont icon-data_explorer" style={{ fontSize: 11 }} />
                  </a>
                  <button onClick={() => copyToClipboard(node.address)} className="text-white/30 hover:text-white transition-colors" title="Copy address">
                    <i className="iconfont icon-copy" style={{ fontSize: 11 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HEADER — Entity badge, risk pill, balance, chains dropdown, explorer
   CW-style layout
   ════════════════════════════════════════════════════════════════ */

function DetailHeader({
  node,
  onClose,
  onEditLabel,
  totalTransfers,
  totalKnownTransfers,
  relatedCount,
}: {
  node: MSNode;
  onClose: () => void;
  onEditLabel: () => void;
  totalTransfers: number;
  totalKnownTransfers: number;
  relatedCount: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(node.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fmtBalance = (v: number | undefined | null) => {
    if (v == null || v <= 0) return "--";
    return "$" + msFormatValue(v);
  };

  return (
    <div className="px-4 py-3 border-b border-[var(--default-border-color)]">
      {/* Row 1: Chain icon + label + pencil + icons + close */}
      <div className="flex items-center gap-2.5">
        <img src={getMSChainIconUrl(node.chain)} alt={node.chain} className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-medium truncate">{node.label}</span>
            <button onClick={(e) => { e.stopPropagation(); onEditLabel(); }} className="flex-shrink-0 text-white/30 hover:text-white transition-colors" title="Edit label">
              <i className="iconfont icon-editPen" style={{ fontSize: 12 }} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-white/50 font-mono truncate">{node.address}</span>
            <button onClick={handleCopy} className="flex-shrink-0 text-white/40 hover:text-white transition-colors" title="Copy address">
              <i className={`iconfont ${copied ? "icon-success" : "icon-copy"}`} style={{ fontSize: 11 }} />
            </button>
            <a href={getBlockExplorerUrl(node.chain, node.address)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-white/40 hover:text-white transition-colors" title="Block Explorer">
              <i className="iconfont icon-data_explorer" style={{ fontSize: 11 }} />
            </a>
          </div>
        </div>
        <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0">
          <i className="iconfont icon-close" style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Row 2: Entity type badge + Risk Analysis badge */}
      <div className="flex items-center gap-2 mt-2.5">
        <span
          className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide"
          style={{ color: getMSEntityColor(node.type), backgroundColor: `${getMSEntityColor(node.type)}20` }}
        >
          {getMSEntityTypeLabel(node.type)}
        </span>
        {/* Risk Analysis badge — always visible */}
        <span
          className="text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1"
          style={{
            color: node.riskLevel && node.riskLevel !== "unknown" && node.riskLevel !== "no_risk"
              ? getMSRiskColor(node.riskLevel)
              : "var(--default-color)",
            backgroundColor: node.riskLevel && node.riskLevel !== "unknown" && node.riskLevel !== "no_risk"
              ? `${getMSRiskColor(node.riskLevel)}15`
              : "rgba(189,124,64,0.12)",
          }}
        >
          {node.riskLevel && node.riskLevel !== "unknown" && node.riskLevel !== "no_risk" && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getMSRiskColor(node.riskLevel) }} />
          )}
          {node.riskLevel && node.riskLevel !== "unknown" && node.riskLevel !== "no_risk"
            ? getMSRiskLabel(node.riskLevel)
            : "Risk Analysis"}
        </span>
      </div>

      {/* Row 3: Balance pills + Active chains dropdown */}
      <div className="flex flex-wrap items-center gap-2 mt-2.5">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--default-border-color)] bg-[var(--primary-background)] text-[11px] text-[var(--desc-color)]">
          <span>Ether Balance:</span>
          <span className="text-white/70">{fmtBalance(node.balanceUSD)}</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--default-border-color)] bg-[var(--primary-background)] text-[11px] text-[var(--desc-color)]">
          <span>Total value on <span className="capitalize">{node.chain}</span>:</span>
          <span className="text-white/70">{fmtBalance(node.totalValueUSD ?? node.balanceUSD)}</span>
        </div>
        <ActiveChainsDropdown node={node} />
      </div>

      {/* Row 4: Transfer counter with Data Explorer link */}
      <div className="mt-2.5 text-[11px] text-[var(--desc-color)] flex items-center gap-1 flex-wrap">
        <span>
          <span className="text-[var(--default-color)] font-medium">{totalTransfers}</span>
          {" "}out of{" "}
          <span className="text-white/60 font-medium">{totalKnownTransfers}</span>
          {" "}transfers have been retrieved.
        </span>
        {totalTransfers < totalKnownTransfers && (
          <span className="flex items-center gap-1">
            Use{" "}
            <i className="iconfont icon-data_explorer text-[var(--default-color)]" style={{ fontSize: 12 }} />
            <span className="text-[var(--default-color)] font-medium underline cursor-pointer hover:text-white transition-colors">
              Data Explorer
            </span>
            {" "}to get more.
          </span>
        )}
        <span className="relative group inline-flex items-center ml-0.5 cursor-help">
          <svg width="12" height="12" viewBox="0 0 16 16" className="text-white/30">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <text x="8" y="12" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">?</text>
          </svg>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#1a1a1a] border border-[var(--default-border-color)] shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[10px] text-white whitespace-nowrap">
            Only on-graph transfers are shown. Use Data Explorer for full history.
          </div>
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FLOATING SELECTION TOOLBAR — "Add to canvas" / "Remove from canvas"
   ════════════════════════════════════════════════════════════════ */
function SelectionToolbar({
  count,
  onAddToCanvas,
  onRemoveFromCanvas,
  onClear,
}: {
  count: number;
  onAddToCanvas: () => void;
  onRemoveFromCanvas: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[100] rounded-lg border border-[var(--default-border-color)] bg-[var(--secondary-background)] px-3 py-2 shadow-md"
      style={{ top: 10 }}
    >
      <div className="flex w-max items-center gap-3 text-xs font-semibold text-neutral-200">
        <span>{count} Selected</span>
        <button
          type="button"
          onClick={onAddToCanvas}
          className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-white bg-[var(--default-color)] hover:bg-[var(--default-color-hover)] transition-colors"
        >
          <i className="iconfont icon-eye" style={{ fontSize: 14, lineHeight: "14px", verticalAlign: "middle" }} />
          <span>Add to canvas</span>
        </button>
        <button
          type="button"
          onClick={onRemoveFromCanvas}
          className="inline-flex items-center gap-1.5 rounded border border-[var(--default-border-color)] px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-[var(--default-color)] transition-colors"
        >
          <i className="iconfont icon-eye-off" style={{ fontSize: 14, lineHeight: "14px", verticalAlign: "middle" }} />
          <span>Remove from canvas</span>
        </button>
        <i
          className="iconfont icon-close cursor-pointer text-neutral-500 hover:text-[var(--default-color)] transition-colors"
          style={{ fontSize: 14, lineHeight: "14px" }}
          onClick={onClear}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 1 — Related Address (table-layout:fixed, CW columns)
   Columns: ☐ | 👁 | Counterparty | Risk | Direction ⓘ | Token | Transfer
   ════════════════════════════════════════════════════════════════ */

interface RelatedAddress {
  nodeId: string;
  address: string;
  label: string;
  chain: string;
  type: string;
  riskLevel?: string;
  direction: "IN" | "OUT" | "IN/OUT";
  tokens: string[];
  transferCount: number;
  totalTransferCount: number;
  isVisibleOnCanvas: boolean;
}

function RelatedAddressTab({
  data,
  searchText,
  onAddressClick,
  onToggleVisibility,
  checkedIds,
  onToggleCheck,
  onToggleAll,
  onViewTransfers,
}: {
  data: RelatedAddress[];
  searchText: string;
  onAddressClick: (nodeId: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  checkedIds: Set<string>;
  onToggleCheck: (nodeId: string) => void;
  onToggleAll: () => void;
  onViewTransfers: (address: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!searchText) return data;
    const q = searchText.toLowerCase();
    return data.filter(
      (d) =>
        d.address.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q)
    );
  }, [data, searchText]);

  const allChecked = filtered.length > 0 && filtered.every((d) => checkedIds.has(d.nodeId));

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-[var(--placeholder-color)]">
        No related addresses
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 32 }} />
          <col style={{ width: 28 }} />
          <col />
          <col style={{ width: 50 }} />
          <col style={{ width: 76 }} />
          <col style={{ width: 60 }} />
          <col style={{ width: 80 }} />
        </colgroup>
        <thead className="sticky top-0 bg-[var(--secondary-background)] z-10">
          <tr className="text-left text-[var(--desc-color)]">
            <th className="pl-3 pr-1 py-2">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={onToggleAll}
                className="accent-[var(--default-color)] w-3 h-3 cursor-pointer"
              />
            </th>
            <th className="px-1 py-2 font-normal"> </th>
            <th className="px-2 py-2 font-normal">
              <span className="flex items-center gap-1">Counterparty <span className="text-white/20">&diams;</span></span>
            </th>
            <th className="px-2 py-2 font-normal text-center">
              <span className="flex items-center justify-center gap-0.5">Risk <span className="text-white/20">&diams;</span></span>
            </th>
            <th className="px-2 py-2 font-normal text-center">
              <span className="flex items-center justify-center gap-0.5">
                Direction
                <span className="relative group inline-flex items-center cursor-help ml-0.5">
                  <svg width="11" height="11" viewBox="0 0 16 16" className="text-white/30">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <text x="8" y="12" textAnchor="middle" fontSize="9" fill="currentColor">i</text>
                  </svg>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#1a1a1a] border border-[var(--default-border-color)] shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[10px] text-white whitespace-nowrap">
                    Flow direction relative to this address
                  </div>
                </span>
              </span>
            </th>
            <th className="px-2 py-2 font-normal text-center">Token</th>
            <th className="px-2 py-2 font-normal text-right">Transfer</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.nodeId}
              className="border-t border-[var(--default-border-color)] hover:bg-[var(--table-hover)] cursor-pointer transition-colors"
              onClick={() => onAddressClick(row.nodeId)}
            >
              {/* Checkbox */}
              <td className="pl-3 pr-1 py-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={checkedIds.has(row.nodeId)}
                  onChange={() => onToggleCheck(row.nodeId)}
                  className="accent-[var(--default-color)] w-3 h-3 cursor-pointer"
                />
              </td>
              {/* Eye icon */}
              <td className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onToggleVisibility(row.nodeId)}
                  className={`${row.isVisibleOnCanvas ? "text-[var(--default-color)]" : "text-white/20"} hover:text-white transition-colors`}
                  title={row.isVisibleOnCanvas ? "Hide on canvas" : "Show on canvas"}
                >
                  <i className="iconfont icon-eye" style={{ fontSize: 13 }} />
                </button>
              </td>
              {/* Counterparty — two-line with hover tooltip */}
              <td className="px-2 py-1.5 overflow-hidden">
                <div className="relative group">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img src={getMSChainIconUrl(row.chain)} className="w-4 h-4 rounded-full flex-shrink-0" alt="" />
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="text-white font-medium truncate leading-tight">
                        {row.label !== row.address ? row.label : msShortenAddress(row.address, 6)}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono leading-tight truncate">
                        {msShortenAddress(row.address, 6)}
                      </span>
                    </div>
                  </div>
                  <CellTip>
                    <AddressTooltip label={row.label !== row.address ? row.label : msShortenAddress(row.address, 8)} address={row.address} chain={row.chain} />
                  </CellTip>
                </div>
              </td>
              {/* Risk — colored circle */}
              <td className="px-2 py-2 text-center">
                {row.riskLevel && row.riskLevel !== "unknown" ? (
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: getMSRiskColor(row.riskLevel as MSRiskLevel) }}
                    title={getMSRiskLabel(row.riskLevel as MSRiskLevel)}
                  />
                ) : null}
              </td>
              {/* Direction — styled badge */}
              <td className="px-2 py-2 text-center">
                {row.direction === "IN/OUT" ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium">
                    <span className="text-[#ef4444]">OUT</span>
                    <span className="text-white/30">/</span>
                    <span className="text-[#24c197]">IN</span>
                  </span>
                ) : (
                  <span
                    className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      color: row.direction === "OUT" ? "#ef4444" : "#24c197",
                      backgroundColor: row.direction === "OUT" ? "rgba(239,68,68,0.12)" : "rgba(36,193,151,0.12)",
                    }}
                  >
                    {row.direction}
                  </span>
                )}
              </td>
              {/* Token — icons */}
              <td className="px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-0.5">
                  {row.tokens.slice(0, 3).map((t) => {
                    const iconUrl = getMSTokenIconUrl(t);
                    return (
                      <div key={t} className="relative group/tok">
                        {iconUrl ? (
                          <img src={iconUrl} alt={t} className="w-4 h-4 rounded-full" />
                        ) : (
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{ backgroundColor: `${getMSTokenColor(t)}30`, color: getMSTokenColor(t) }}
                          >
                            {t.charAt(0)}
                          </span>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#1a1a1a] border border-[var(--default-border-color)] shadow-lg z-50 opacity-0 group-hover/tok:opacity-100 transition-opacity pointer-events-none text-[10px] text-white whitespace-nowrap">
                          {t}
                        </div>
                      </div>
                    );
                  })}
                  {row.tokens.length > 3 && (
                    <span className="text-[10px] text-white/30">+{row.tokens.length - 3}</span>
                  )}
                </div>
              </td>
              {/* Transfer — count + >> with tooltip */}
              <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="relative group/xfer inline-flex items-center gap-1">
                  <span className="text-[var(--default-color)] text-[11px] tabular-nums">{row.transferCount}</span>
                  <span className="text-white/30 text-[11px] tabular-nums">/{row.totalTransferCount}</span>
                  <button
                    onClick={() => onViewTransfers(row.address)}
                    className="text-white/40 hover:text-[var(--default-color)] transition-colors ml-0.5"
                    title="View Transfers"
                  >
                    <span className="text-[11px] font-bold">&gt;&gt;</span>
                  </button>
                  <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded bg-[#1a1a1a] border border-[var(--default-border-color)] shadow-lg z-50 opacity-0 group-hover/xfer:opacity-100 transition-opacity pointer-events-none text-[10px] text-white whitespace-nowrap">
                    View Transfers
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer: X on canvas / Y total */}
      <div className="sticky bottom-0 px-4 py-1.5 text-[10px] text-[var(--placeholder-color)] bg-[var(--secondary-background)] border-t border-[var(--default-border-color)]">
        {filtered.filter(r => r.isVisibleOnCanvas).length} on canvas / {filtered.length} total
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 2 — Transfer (table-layout:fixed, CW columns, dates+hashes)
   Columns: ☐ | 👁 | Date ⇅ | Tx Hash | Counterparty | Amount ⇅ | Token
   ════════════════════════════════════════════════════════════════ */

interface TransferRow {
  edgeId: string;
  txHash: string;
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
  amount: string;
  rawAmount: number;
  token: string;
  date: string;
  dateMs: number;
  chain: string;
  flowDirection: "IN" | "OUT";
  counterpartyAddress: string;
  counterpartyLabel: string;
  counterpartyChain: string;
}

type SortKey = "date" | "amount";
type SortDir = "asc" | "desc" | null;

function TransferTab({
  data,
  searchText,
  totalTransfers,
  checkedIds,
  onToggleCheck,
  onToggleAll,
  onToggleVisibility,
  isCounterpartyVisible,
}: {
  data: TransferRow[];
  searchText: string;
  totalTransfers: number;
  checkedIds: Set<string>;
  onToggleCheck: (key: string) => void;
  onToggleAll: () => void;
  onToggleVisibility: (address: string) => void;
  isCounterpartyVisible: (address: string) => boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc");
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let rows = data;
    if (searchText) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.txHash.toLowerCase().includes(q) ||
          d.counterpartyAddress.toLowerCase().includes(q) ||
          d.counterpartyLabel.toLowerCase().includes(q) ||
          d.from.toLowerCase().includes(q) ||
          d.to.toLowerCase().includes(q)
      );
    }
    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => {
        const mult = sortDir === "asc" ? 1 : -1;
        if (sortKey === "date") return mult * (a.dateMs - b.dateMs);
        if (sortKey === "amount") return mult * (a.rawAmount - b.rawAmount);
        return 0;
      });
    }
    return rows;
  }, [data, searchText, sortKey, sortDir]);

  const allChecked = filtered.length > 0 && filtered.every((_, i) => checkedIds.has(`tx-${i}`));

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
    <span className="inline-flex flex-col ml-1 -space-y-0.5">
      <svg width="8" height="5" viewBox="0 0 8 5" className={active && dir === "asc" ? "text-[var(--default-color)]" : "text-white/20"}>
        <path d="M4 0L7.5 5H0.5L4 0Z" fill="currentColor" />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" className={active && dir === "desc" ? "text-[var(--default-color)]" : "text-white/20"}>
        <path d="M4 5L0.5 0H7.5L4 5Z" fill="currentColor" />
      </svg>
    </span>
  );

  if (filtered.length === 0 && !searchText) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-[var(--placeholder-color)]">
        No transfers
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 32 }} />
            <col style={{ width: 28 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 110 }} />
            <col />
            <col style={{ width: 100 }} />
            <col style={{ width: 65 }} />
          </colgroup>
          <thead className="sticky top-0 bg-[var(--secondary-background)] z-10">
            <tr className="text-left text-[var(--desc-color)]">
              <th className="pl-3 pr-1 py-2">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleAll}
                  className="accent-[var(--default-color)] w-3 h-3 cursor-pointer"
                />
              </th>
              <th className="px-1 py-2 font-normal"> </th>
              <th
                className="px-2 py-2 font-normal cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => toggleSort("date")}
              >
                <span className="flex items-center">
                  Date
                  <SortIcon active={sortKey === "date"} dir={sortKey === "date" ? sortDir : null} />
                </span>
              </th>
              <th className="px-2 py-2 font-normal">Tx Hash</th>
              <th className="px-2 py-2 font-normal">Counterparty</th>
              <th
                className="px-2 py-2 font-normal text-right cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => toggleSort("amount")}
              >
                <span className="flex items-center justify-end">
                  Amount
                  <SortIcon active={sortKey === "amount"} dir={sortKey === "amount" ? sortDir : null} />
                </span>
              </th>
              <th className="px-2 py-2 font-normal">Token</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const rowKey = `tx-${i}`;
              return (
                <tr
                  key={row.edgeId + i}
                  className="border-t border-[var(--default-border-color)] hover:bg-[var(--table-hover)] transition-colors"
                >
                  {/* Checkbox */}
                  <td className="pl-3 pr-1 py-2">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(rowKey)}
                      onChange={() => onToggleCheck(rowKey)}
                      className="accent-[var(--default-color)] w-3 h-3 cursor-pointer"
                    />
                  </td>
                  {/* Eye — toggle counterparty on canvas */}
                  <td className="px-1 py-2">
                    <button
                      onClick={() => onToggleVisibility(row.counterpartyAddress)}
                      className={`${isCounterpartyVisible(row.counterpartyAddress) ? "text-[var(--default-color)]" : "text-white/20"} hover:text-white transition-colors`}
                      title={isCounterpartyVisible(row.counterpartyAddress) ? "Hide from canvas" : "Show on canvas"}
                    >
                      <i className="iconfont icon-eye" style={{ fontSize: 13 }} />
                    </button>
                  </td>
                  {/* Date — YYYY-MM-DD HH:mm:ss */}
                  <td className="px-2 py-2 text-[var(--desc-color)] whitespace-nowrap overflow-hidden text-ellipsis tabular-nums text-[11px]">
                    {formatDateCW(row.dateMs)}
                  </td>
                  {/* Tx Hash — truncated with hover tooltip */}
                  <td className="px-2 py-2 overflow-hidden">
                    <div className="relative group">
                      <span className="font-mono text-[var(--default-color)] truncate block text-[11px]">
                        {row.txHash ? msShortenAddress(row.txHash, 6) : "\u2014"}
                      </span>
                      {row.txHash && (
                        <CellTip>
                          <TxHashTooltip hash={row.txHash} chain={row.chain} />
                        </CellTip>
                      )}
                    </div>
                  </td>
                  {/* Counterparty — two-line with hover tooltip */}
                  <td className="px-2 py-1.5 overflow-hidden">
                    <div className="relative group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img src={getMSChainIconUrl(row.counterpartyChain)} className="w-4 h-4 rounded-full flex-shrink-0" alt="" />
                        <div className="flex flex-col min-w-0 overflow-hidden">
                          <span className="text-white font-medium truncate leading-tight">
                            {row.counterpartyLabel !== row.counterpartyAddress ? row.counterpartyLabel : msShortenAddress(row.counterpartyAddress, 6)}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono leading-tight truncate">
                            {msShortenAddress(row.counterpartyAddress, 6)}
                          </span>
                        </div>
                      </div>
                      <CellTip>
                        <AddressTooltip
                          label={row.counterpartyLabel !== row.counterpartyAddress ? row.counterpartyLabel : msShortenAddress(row.counterpartyAddress, 8)}
                          address={row.counterpartyAddress}
                          chain={row.counterpartyChain}
                        />
                      </CellTip>
                    </div>
                  </td>
                  {/* Amount with +/- color + hover tooltip */}
                  <td className="px-2 py-2 text-right overflow-hidden">
                    <div className="relative group inline-block">
                      <span className={`tabular-nums ${row.flowDirection === "IN" ? "text-[#24c197]" : "text-[#ef4444]"}`}>
                        {row.flowDirection === "IN" ? "+" : "-"}{row.amount}
                      </span>
                      <CellTip>
                        <div className="flex items-center gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                          <span className="text-white font-mono">{row.rawAmount.toLocaleString(undefined, { maximumFractionDigits: 18 })}</span>
                          <span className="text-white/50">{row.token}</span>
                          <button onClick={() => copyToClipboard(String(row.rawAmount))} className="text-white/40 hover:text-white"><i className="iconfont icon-copy" style={{ fontSize: 11 }} /></button>
                        </div>
                      </CellTip>
                    </div>
                  </td>
                  {/* Token — icon + symbol */}
                  <td className="px-2 py-2 overflow-hidden">
                    <div className="relative group/tok">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const iconUrl = getMSTokenIconUrl(row.token);
                          return iconUrl ? (
                            <img src={iconUrl} alt={row.token} className="w-4 h-4 rounded-full flex-shrink-0" />
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                              style={{ backgroundColor: `${getMSTokenColor(row.token)}30`, color: getMSTokenColor(row.token) }}
                            >
                              {row.token.charAt(0)}
                            </span>
                          );
                        })()}
                        <span className="text-white/60 truncate">{row.token}</span>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#1a1a1a] border border-[var(--default-border-color)] shadow-lg z-50 opacity-0 group-hover/tok:opacity-100 transition-opacity pointer-events-none text-[10px] text-white whitespace-nowrap">
                        {row.token}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: X on canvas / Y total */}
      <div className="px-4 py-1.5 text-[10px] text-[var(--placeholder-color)] border-t border-[var(--default-border-color)]">
        {filtered.length} on canvas / {data.length} total
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN SIDEBAR — dir="ltr" enforced
   ════════════════════════════════════════════════════════════════ */

export function MSAddressDetail() {
  const nodeDetailNodeId = useCWTrackerStore((s) => s.nodeDetailNodeId);
  const closeNodeDetail = useCWTrackerStore((s) => s.closeNodeDetail);
  const toggleSidebar = useCWTrackerStore((s) => s.toggleSidebar);
  const sidebarSubTab = useCWTrackerStore((s) => s.sidebarSubTab);
  const setSidebarSubTab = useCWTrackerStore((s) => s.setSidebarSubTab);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const edges = useCWTrackerStore((s) => s.edges);
  const selectNode = useCWTrackerStore((s) => s.selectNode);
  const updateNode = useCWTrackerStore((s) => s.updateNode);
  const toggleNodeVisibility = useCWTrackerStore((s) => s.toggleNodeVisibility);

  const [searchText, setSearchText] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [transferCheckedIds, setTransferCheckedIds] = useState<Set<string>>(new Set());
  const [editingLabel, setEditingLabel] = useState(false);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [transferFilterAddress, setTransferFilterAddress] = useState("");

  const node = useMemo(
    () => nodes.find((n) => n.id === nodeDetailNodeId),
    [nodes, nodeDetailNodeId]
  );

  /* ── Label editing ── */
  const startEditLabel = useCallback(() => {
    if (node) {
      setEditLabelValue(node.label);
      setEditingLabel(true);
    }
  }, [node]);

  const commitEditLabel = useCallback(() => {
    if (node && editLabelValue.trim()) {
      updateNode(node.id, { label: editLabelValue.trim() });
    }
    setEditingLabel(false);
  }, [node, editLabelValue, updateNode]);

  /* ── Checkbox handlers — Related Address tab ── */
  const handleToggleCheck = useCallback((nodeId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setCheckedIds((prev) => {
      const allIds = relatedAddresses.map((r) => r.nodeId);
      const allChecked = allIds.every((id) => prev.has(id));
      if (allChecked) return new Set();
      return new Set(allIds);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Checkbox handlers — Transfer tab ── */
  const handleTransferToggleCheck = useCallback((key: string) => {
    setTransferCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleTransferToggleAll = useCallback(() => {
    setTransferCheckedIds((prev) => {
      if (prev.size > 0) return new Set();
      return new Set(transfers.map((_, i) => `tx-${i}`));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Bulk: Add/Remove from canvas — Related Address tab ── */
  const handleBulkAddToCanvas = useCallback(() => {
    checkedIds.forEach((nodeId) => {
      const n = nodes.find((nd) => nd.id === nodeId);
      if (n && n.isVisibleOnCanvas === false) {
        toggleNodeVisibility(nodeId);
      }
    });
    setCheckedIds(new Set());
  }, [checkedIds, nodes, toggleNodeVisibility]);

  const handleBulkRemoveFromCanvas = useCallback(() => {
    checkedIds.forEach((nodeId) => {
      const n = nodes.find((nd) => nd.id === nodeId);
      if (n && n.isVisibleOnCanvas !== false) {
        toggleNodeVisibility(nodeId);
      }
    });
    setCheckedIds(new Set());
  }, [checkedIds, nodes, toggleNodeVisibility]);

  const handleClearChecked = useCallback(() => {
    setCheckedIds(new Set());
  }, []);

  /* ── Compute transfers (with counterparty fields) — robust date/hash ── */
  const transfers = useMemo((): TransferRow[] => {
    if (!node) return [];
    const rows: TransferRow[] = [];

    for (const edge of edges) {
      if (edge.source !== node.id && edge.target !== node.id) continue;
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      const flowDir: "IN" | "OUT" = edge.target === node.id ? "IN" : "OUT";
      const counterparty = flowDir === "IN" ? src : tgt;

      for (const detail of edge.details) {
        const ts = parseTimestamp(detail.timestamp);
        rows.push({
          edgeId: edge.id,
          txHash: detail.txHash || "",
          from: src.address,
          fromLabel: src.label,
          to: tgt.address,
          toLabel: tgt.label,
          amount: msFormatTokenAmount(detail.value, detail.tokenSymbol),
          rawAmount: detail.value,
          token: detail.tokenSymbol,
          date: formatDateCW(ts),
          dateMs: ts,
          chain: detail.chain || edge.chain || node.chain,
          flowDirection: flowDir,
          counterpartyAddress: counterparty.address,
          counterpartyLabel: counterparty.label,
          counterpartyChain: counterparty.chain,
        });
      }

      // Fallback: edge with no detail entries — still show a row
      if (edge.details.length === 0) {
        const ts = parseTimestamp(edge.latestTimestamp);
        rows.push({
          edgeId: edge.id,
          txHash: "",
          from: src.address,
          fromLabel: src.label,
          to: tgt.address,
          toLabel: tgt.label,
          amount: edge.valueLabel || msFormatTokenAmount(edge.totalValue, edge.tokenSymbol),
          rawAmount: edge.totalValue,
          token: edge.tokenSymbol,
          date: formatDateCW(ts),
          dateMs: ts,
          chain: edge.chain || node.chain,
          flowDirection: flowDir,
          counterpartyAddress: counterparty.address,
          counterpartyLabel: counterparty.label,
          counterpartyChain: counterparty.chain,
        });
      }
    }

    // Sort by date descending by default
    rows.sort((a, b) => b.dateMs - a.dateMs);
    return rows;
  }, [node, nodes, edges]);

  /* ── Bulk: Add/Remove from canvas — Transfer tab ── */
  const handleTransferBulkAddToCanvas = useCallback(() => {
    const nodeIdsToShow = new Set<string>();
    transferCheckedIds.forEach((key) => {
      const idx = parseInt(key.replace("tx-", ""), 10);
      const row = transfers[idx];
      if (!row) return;
      const cNode = nodes.find((n) => n.address === row.counterpartyAddress);
      if (cNode && cNode.isVisibleOnCanvas === false) {
        nodeIdsToShow.add(cNode.id);
      }
    });
    nodeIdsToShow.forEach((nid) => toggleNodeVisibility(nid));
    setTransferCheckedIds(new Set());
  }, [transferCheckedIds, transfers, nodes, toggleNodeVisibility]);

  const handleTransferBulkRemoveFromCanvas = useCallback(() => {
    const nodeIdsToHide = new Set<string>();
    transferCheckedIds.forEach((key) => {
      const idx = parseInt(key.replace("tx-", ""), 10);
      const row = transfers[idx];
      if (!row) return;
      const cNode = nodes.find((n) => n.address === row.counterpartyAddress);
      if (cNode && cNode.isVisibleOnCanvas !== false) {
        nodeIdsToHide.add(cNode.id);
      }
    });
    nodeIdsToHide.forEach((nid) => toggleNodeVisibility(nid));
    setTransferCheckedIds(new Set());
  }, [transferCheckedIds, transfers, nodes, toggleNodeVisibility]);

  const handleTransferClearChecked = useCallback(() => {
    setTransferCheckedIds(new Set());
  }, []);

  /* ── Transfer tab: toggle counterparty visibility ── */
  const handleTransferToggleVisibility = useCallback((address: string) => {
    const cNode = nodes.find((n) => n.address === address);
    if (cNode) toggleNodeVisibility(cNode.id);
  }, [nodes, toggleNodeVisibility]);

  const isCounterpartyVisible = useCallback((address: string): boolean => {
    const cNode = nodes.find((n) => n.address === address);
    return cNode ? cNode.isVisibleOnCanvas !== false : false;
  }, [nodes]);

  /* ── View Transfers for a specific counterparty (>> click) ── */
  const handleViewTransfers = useCallback((address: string) => {
    setTransferFilterAddress(address);
    setSearchText(address);
    setSidebarSubTab("2");
  }, [setSidebarSubTab]);

  /* ── Tab switching — clear filter when manually switching ── */
  const handleTabSwitch = useCallback((tab: MSSidebarSubTab) => {
    if (tab === "1") {
      setTransferFilterAddress("");
      setSearchText("");
    }
    setSidebarSubTab(tab);
  }, [setSidebarSubTab]);

  /* ── Compute related addresses (with transfer count + visibility) ── */
  const relatedAddresses = useMemo((): RelatedAddress[] => {
    if (!node) return [];
    const result: RelatedAddress[] = [];
    const seen = new Set<string>();

    // Compute total transfers for this node
    const totalTx = edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .reduce((sum, e) => sum + Math.max(e.details.length, 1), 0);

    for (const edge of edges) {
      let neighborId: string | null = null;
      let dir: "IN" | "OUT" | null = null;

      if (edge.source === node.id) {
        neighborId = edge.target;
        dir = "OUT";
      } else if (edge.target === node.id) {
        neighborId = edge.source;
        dir = "IN";
      }
      if (!neighborId || !dir) continue;

      const neighbor = nodes.find((n) => n.id === neighborId);
      if (!neighbor) continue;

      if (seen.has(neighbor.id)) {
        const existing = result.find((r) => r.nodeId === neighbor.id);
        if (existing && existing.direction !== dir) {
          existing.direction = "IN/OUT";
        }
        if (existing && !existing.tokens.includes(edge.tokenSymbol)) {
          existing.tokens.push(edge.tokenSymbol);
        }
        if (existing) {
          existing.transferCount += edge.transferCount || 1;
        }
        continue;
      }

      seen.add(neighbor.id);
      result.push({
        nodeId: neighbor.id,
        address: neighbor.address,
        label: neighbor.label,
        chain: neighbor.chain,
        type: neighbor.type,
        riskLevel: neighbor.riskLevel,
        direction: dir,
        tokens: edge.tokenSymbol ? [edge.tokenSymbol] : [],
        transferCount: edge.transferCount || 1,
        totalTransferCount: totalTx,
        isVisibleOnCanvas: neighbor.isVisibleOnCanvas !== false,
      });
    }

    return result;
  }, [node, nodes, edges]);

  /* Total transfer count for the status message */
  const totalTransferCount = useMemo(() => {
    if (!node) return 0;
    return edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .reduce((sum, e) => sum + Math.max(e.details.length, 1), 0);
  }, [node, edges]);

  /* Total known transfers (from API or fallback to loaded count) */
  const totalKnownTransfers = useMemo(() => {
    if (!node) return 0;
    return node.totalKnownTransfers ?? totalTransferCount;
  }, [node, totalTransferCount]);

  const handleClose = useCallback(() => {
    closeNodeDetail();
    toggleSidebar();
  }, [closeNodeDetail, toggleSidebar]);

  const handleAddressClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      useCWTrackerStore.getState().openNodeDetail(nodeId);
    },
    [selectNode]
  );

  if (!node) return null;

  /* Effective search: use transferFilterAddress when it's set and on Transfer tab */
  const effectiveSearch = sidebarSubTab === "2" && transferFilterAddress ? transferFilterAddress : searchText;

  return (
    <div dir="ltr" className="flex flex-col h-full" style={{ direction: "ltr", textAlign: "left" }}>
      {/* ─── Header ─── */}
      <DetailHeader
        node={node}
        onClose={handleClose}
        onEditLabel={startEditLabel}
        totalTransfers={totalTransferCount}
        totalKnownTransfers={totalKnownTransfers}
        relatedCount={relatedAddresses.length}
      />

      {/* ─── Inline label editor overlay ─── */}
      {editingLabel && (
        <div className="px-4 py-2 border-b border-[var(--default-border-color)] bg-[var(--primary-background)]">
          <input
            autoFocus
            value={editLabelValue}
            onChange={(e) => setEditLabelValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEditLabel();
              if (e.key === "Escape") setEditingLabel(false);
            }}
            onBlur={commitEditLabel}
            className="w-full bg-transparent border border-[var(--default-color)] rounded px-2 py-1 text-xs text-white outline-none"
            placeholder="Enter label..."
          />
        </div>
      )}

      {/* ─── Tab Bar + Search ─── */}
      <div className="flex items-center border-b border-[var(--default-border-color)] px-4">
        <div className="flex items-center gap-0 flex-shrink-0">
          <button
            onClick={() => handleTabSwitch("1")}
            className={`px-3 py-2.5 text-xs border-b-2 transition-colors ${
              sidebarSubTab === "1"
                ? "text-[var(--default-color)] border-[var(--default-color)]"
                : "text-[var(--desc-color)] border-transparent hover:text-white"
            }`}
          >
            Related Address
          </button>
          <button
            onClick={() => handleTabSwitch("2")}
            className={`px-3 py-2.5 text-xs border-b-2 transition-colors ${
              sidebarSubTab === "2"
                ? "text-[var(--default-color)] border-[var(--default-color)]"
                : "text-[var(--desc-color)] border-transparent hover:text-white"
            }`}
          >
            Transfer
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end ml-2">
          <div className="relative">
            <i
              className="iconfont icon-search-lg absolute left-2 top-1/2 -translate-y-1/2 text-[var(--placeholder-color)]"
              style={{ fontSize: 12 }}
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setTransferFilterAddress(""); }}
              placeholder={sidebarSubTab === "1" ? "Address/Label" : "Address/Label/Hash"}
              className="bg-[var(--primary-background)] border border-[var(--default-border-color)] rounded-md pl-7 pr-2 py-1 text-xs text-white placeholder:text-[var(--input-placeholder-text-color)] outline-none focus:border-[var(--default-color)] w-[180px] transition-colors"
            />
          </div>
          {/* Filter button */}
          <button className="ml-2 flex items-center justify-center w-7 h-7 rounded bg-[var(--default-color)] hover:bg-[var(--default-color-hover)] text-white transition-colors" title="Filter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Transfer count sub-header (Transfer tab only) ─── */}
      {sidebarSubTab === "2" && (
        <div className="px-4 py-1.5 text-[10px] text-[var(--desc-color)] border-b border-[var(--default-border-color)] bg-[var(--secondary-background)]">
          Showing <span className="text-[var(--default-color)]">{transfers.length}</span> out of {totalKnownTransfers} transfers
        </div>
      )}

      {/* ─── Tab Content ─── */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Floating selection toolbar */}
        {sidebarSubTab === "1" ? (
          <SelectionToolbar
            count={checkedIds.size}
            onAddToCanvas={handleBulkAddToCanvas}
            onRemoveFromCanvas={handleBulkRemoveFromCanvas}
            onClear={handleClearChecked}
          />
        ) : (
          <SelectionToolbar
            count={transferCheckedIds.size}
            onAddToCanvas={handleTransferBulkAddToCanvas}
            onRemoveFromCanvas={handleTransferBulkRemoveFromCanvas}
            onClear={handleTransferClearChecked}
          />
        )}

        {sidebarSubTab === "1" ? (
          <RelatedAddressTab
            data={relatedAddresses}
            searchText={searchText}
            onAddressClick={handleAddressClick}
            onToggleVisibility={toggleNodeVisibility}
            checkedIds={checkedIds}
            onToggleCheck={handleToggleCheck}
            onToggleAll={handleToggleAll}
            onViewTransfers={handleViewTransfers}
          />
        ) : (
          <TransferTab
            data={transfers}
            searchText={effectiveSearch}
            totalTransfers={totalKnownTransfers}
            checkedIds={transferCheckedIds}
            onToggleCheck={handleTransferToggleCheck}
            onToggleAll={handleTransferToggleAll}
            onToggleVisibility={handleTransferToggleVisibility}
            isCounterpartyVisible={isCounterpartyVisible}
          />
        )}
      </div>

      {/* ─── Footer Summary ─── */}
      <div className="flex items-center justify-end px-4 py-2 border-t border-[var(--default-border-color)] text-[10px] text-[var(--placeholder-color)]">
        <span>
          Chain: {node.chain} · Txs: {node.txCount}
        </span>
      </div>
    </div>
  );
}
