/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSActionBar — CWTracker top action bar (100% parity)       ║
 * ║  Two rows:                                                    ║
 * ║  1. Nav bar: back + title + chain badges                     ║
 * ║  2. Graph action bar: save, share, edit, download, mode      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import { getMSChainIconUrl } from "@/lib/onchain/cwtracker-types";

/* ── Tooltip wrapper ── */
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

/* ── Icon button ── */
function IBtn({
  icon,
  size = 20,
  tip,
  onClick,
  disabled,
  active,
}: {
  icon: string;
  size?: number;
  tip?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-8 h-8 rounded transition-colors
        ${active ? "bg-[var(--action-hover)] text-[var(--default-color)]" : "text-[var(--desc-color)] hover:bg-[var(--action-hover)] hover:text-white"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <i className={`iconfont ${icon}`} style={{ fontSize: size }} />
    </button>
  );
  return tip ? <Tip text={tip}>{btn}</Tip> : btn;
}

/* ── Divider ── */
function Divider() {
  return <div className="w-px h-5 bg-[var(--default-border-color)] mx-1" />;
}

interface MSActionBarProps {
  onSearchOpen?: () => void;
  onExportSVG?: () => void;
  onExportPNG?: () => void;
  onExportJSON?: () => void;
  onShare?: () => void;
}

export function MSActionBar({
  onSearchOpen,
  onExportSVG,
  onExportPNG,
  onExportJSON,
  onShare,
}: MSActionBarProps) {
  const title = useCWTrackerStore((s) => s.title);
  const setTitle = useCWTrackerStore((s) => s.setTitle);
  const rootChain = useCWTrackerStore((s) => s.rootChain);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const edges = useCWTrackerStore((s) => s.edges);
  const getUniqueChains = useCWTrackerStore((s) => s.getUniqueChains);
  const chains = useMemo(() => getUniqueChains(), [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showExport, setShowExport] = useState(false);

  const handleTitleSave = useCallback(() => {
    if (editValue.trim()) setTitle(editValue.trim());
    setIsEditing(false);
  }, [editValue, setTitle]);

  return (
    <div>
      {/* ═══ Action Bar ═══ */}
      <div className="index_graphDataAction__yKrL2">
        {/* Left side: Save, Share, Edit, Download */}
        <div className="flex items-center gap-1">
          <IBtn icon="icon-share" size={18} tip="Share" onClick={onShare} />
          
          {/* Edit title */}
          {isEditing ? (
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="bg-transparent border border-[var(--default-color)] rounded px-2 py-0.5 text-white text-xs outline-none w-40"
              autoFocus
            />
          ) : (
            <IBtn
              icon="icon-edit"
              size={16}
              tip="Edit title"
              onClick={() => {
                setEditValue(title);
                setIsEditing(true);
              }}
            />
          )}

          <Divider />

          {/* Export dropdown */}
          <div className="relative">
            <IBtn
              icon="icon-download-image"
              size={18}
              tip="Export image"
              onClick={onExportPNG}
            />
          </div>
          <div className="relative">
            <IBtn
              icon="icon-Data-download"
              size={18}
              tip="Export data"
              onClick={() => setShowExport(!showExport)}
            />
            {showExport && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--dropdown-bgc)] border border-[var(--default-border-color)] rounded-md shadow-lg z-50 min-w-[140px]">
                <button
                  onClick={() => { onExportSVG?.(); setShowExport(false); }}
                  className="block w-full text-left px-3 py-2 text-xs text-[var(--desc-color)] hover:bg-[var(--dropdown-hover)] hover:text-white"
                >
                  Export SVG
                </button>
                <button
                  onClick={() => { onExportJSON?.(); setShowExport(false); }}
                  className="block w-full text-left px-3 py-2 text-xs text-[var(--desc-color)] hover:bg-[var(--dropdown-hover)] hover:text-white"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Chain badges + stats */}
        <div className="flex items-center gap-1">
          <Divider />
          {/* Chain badges */}
          {chains.length > 0 && (
            <div className="flex items-center gap-1 mr-1">
              {chains.map((c) => (
                <img key={c} src={getMSChainIconUrl(c)} alt={c} className="w-4 h-4 rounded-full opacity-80" />
              ))}
            </div>
          )}
          <Divider />
          <span className="text-[10px] sm:text-xs text-white/50 tabular-nums whitespace-nowrap">
            {nodes.length} addresses · {edges.length} transfers
          </span>
        </div>
      </div>
    </div>
  );
}
