/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWNode — Custom React Flow node for CWTracker addresses    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, NodeResizer } from "@xyflow/react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  MS_COLORS,
  getMSChainIconUrl,
  getMSChainBgColor,
  getBlockExplorerUrl,
  msShortenAddress,
  getMSExchangeIconUrl,
  type MSNode,
} from "@/lib/onchain/cwtracker-types";
import { NODE_W, NODE_H, NODE_R, SVG_ICON } from "./constants";

export interface CWNodeData extends MSNode {
  flowUSD?: number;
  isPinnedExpanded?: boolean;
}

type CWNodeProps = NodeProps & { data: CWNodeData };

/* ── Floating Action Button (icon only, smooth small circle) ── */
function FAB({
  icon,
  stroke,
  title,
  onClick,
  badge,
}: {
  icon: string;
  stroke?: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        padding: 0,
        background: "rgba(29,43,40,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(38,74,70,0.4)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        transition: "all 0.15s ease",
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(38,74,70,0.95)"; e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(38,74,70,0.4)"; }}
      onMouseOut={(e) => { e.currentTarget.style.background = "rgba(29,43,40,0.92)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"; }}
    >
      <svg width={11} height={11} viewBox="0 0 16 16">
        <path d={icon} fill="none" stroke={stroke || "#b0c4c0"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {badge}
    </button>
  );
}

function CWNodeComponent({ id, data, selected }: CWNodeProps) {
  const node = data;
  const isHovered = useCWTrackerStore((s) => s.hoveredNodeId === id);
  const hoveredEdgeId = useCWTrackerStore((s) => s.hoveredEdgeId);
  const edges = useCWTrackerStore((s) => s.edges);
  const hoverNode = useCWTrackerStore((s) => s.hoverNode);
  const expandNodeDirection = useCWTrackerStore((s) => s.expandNodeDirection);
  const openFindRelationship = useCWTrackerStore((s) => s.openFindRelationship);
  const openNodeDetail = useCWTrackerStore((s) => s.openNodeDetail);
  const updateNode = useCWTrackerStore((s) => s.updateNode);

  const [editingLabel, setEditingLabel] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alertOn, setAlertOn] = useState(false);

  const isEdgeConnected = hoveredEdgeId
    ? edges.some((e) => e.id === hoveredEdgeId && (e.source === id || e.target === id))
    : false;

  const showGlow = isHovered || selected || isEdgeConnected;
  // Show floating buttons on hover or click-pinned
  const showButtons = isHovered || selected || isPinnedExpanded;

  // Dim node when an edge is hovered and this node is NOT connected to it
  const dimmedByEdge = hoveredEdgeId != null && !isEdgeConnected && !isHovered;

  const fill = node.customColor || (node.isRoot ? MS_COLORS.nodeRootFill : MS_COLORS.nodeFill);
  const strokeColor = node.isRoot
    ? MS_COLORS.selectedBorder
    : selected
    ? MS_COLORS.selectedBorder
    : isEdgeConnected
    ? MS_COLORS.edgeHighlight
    : MS_COLORS.nodeStroke;
  const strokeW = node.isRoot || selected || isEdgeConnected ? 3 : 1;
  const textColor = node.customTextColor || MS_COLORS.textPrimary;

  const isBridge = node.customShape === "doubleoctagon" || !!node.crossChainInfo;
  const isDanger = node.riskLevel === "high" || node.riskLevel === "critical";

  const startEdit = useCallback(() => {
    setEditingLabel(true);
    setEditValue(node.label);
  }, [node.label]);

  const commitEdit = useCallback(() => {
    if (editValue.trim()) {
      updateNode(id, { label: editValue.trim() });
    }
    setEditingLabel(false);
  }, [id, editValue, updateNode]);

  const handleCopyAddress = useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      if (node.address) {
        navigator.clipboard.writeText(node.address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }
    },
    [node.address]
  );

  const handleOpenExplorer = useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      const url = getBlockExplorerUrl(node.chain || "", node.address);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    },
    [node.chain, node.address]
  );

  const handleNodeClick = useCallback(() => {
    setIsPinnedExpanded((p) => !p);
  }, []);

  return (
    <div
      className="cw-node-wrapper"
      style={{
        /* Outer wrapper: wider + taller for floating buttons + safe mouse gap */
        width: NODE_W + 72,
        minHeight: NODE_H + 80,
        padding: "36px 36px 36px 36px",
        position: "relative",
        boxSizing: "border-box",
        opacity: dimmedByEdge ? 0.15 : 1,
        transition: "opacity 0.2s ease",
      }}
      onMouseEnter={() => hoverNode(id)}
      onMouseLeave={() => hoverNode(null)}
      onClick={handleNodeClick}
    >
      {/* ── Floating buttons ABOVE the card ── */}
      {showButtons && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
            zIndex: 20,
          }}
        >
          {/* Copy */}
          <FAB
            icon={SVG_ICON.copy}
            stroke={copied ? "#24c197" : "#b0c4c0"}
            title="Copy address"
            onClick={handleCopyAddress}
            badge={copied ? (
              <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: "#24c197", color: "#fff", fontSize: 7, padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap", pointerEvents: "none" }}>
                ✓
              </div>
            ) : undefined}
          />
          {/* Explorer */}
          <FAB
            icon={SVG_ICON.explorer}
            title="View on block explorer"
            onClick={handleOpenExplorer}
          />
          {/* Address ID / Node detail */}
          <FAB
            icon={SVG_ICON.addressId}
            stroke="#7b9ef7"
            title="Address details"
            onClick={(e) => { e.stopPropagation(); openNodeDetail(id); }}
          />
        </div>
      )}

      {/* ── Expand buttons OUTSIDE the card ── */}
      {showButtons && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); expandNodeDirection(id, "left"); }}
            title="Expand Incoming"
            style={{
              position: "absolute",
              left: 6,
              top: 36 + NODE_H / 2 - 10,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(29,43,40,0.92)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(38,74,70,0.4)",
              color: "#b0c4c0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(38,74,70,0.95)"; e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(38,74,70,0.4)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(29,43,40,0.92)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"; }}
          >
            <svg width={10} height={10} viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="#b0c4c0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); expandNodeDirection(id, "right"); }}
            title="Expand Outgoing"
            style={{
              position: "absolute",
              right: 6,
              top: 36 + NODE_H / 2 - 10,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(29,43,40,0.92)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(38,74,70,0.4)",
              color: "#b0c4c0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(38,74,70,0.95)"; e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(38,74,70,0.4)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(29,43,40,0.92)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"; }}
          >
            <svg width={10} height={10} viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#b0c4c0" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>
      )}

      {/* ── Inner visible card — compact: icon + label + address ── */}
      <div
        className={`cw-node ${showGlow ? "cw-node-glow" : ""} ${isBridge ? "cw-node-bridge" : ""}`}
        style={{
          width: NODE_W,
          height: NODE_H,
          background: fill,
          border: `${strokeW}px solid ${isBridge ? "#bd7c4060" : strokeColor}`,
          borderRadius: NODE_R,
          position: "relative",
          filter: showGlow ? "drop-shadow(0 0 8px rgba(189,124,64,0.5))" : undefined,
        }}
      >
        {/* Handles — 4 for bidirectional */}
        <Handle type="target" position={Position.Left} id="left" style={{ background: "#555", width: 8, height: 8, border: "2px solid #888" }} />
        <Handle type="source" position={Position.Left} id="left-out" style={{ background: "#555", width: 8, height: 8, border: "2px solid #888", top: "60%" }} />
        <Handle type="source" position={Position.Right} id="right" style={{ background: "#555", width: 8, height: 8, border: "2px solid #888" }} />
        <Handle type="target" position={Position.Right} id="right-in" style={{ background: "#555", width: 8, height: 8, border: "2px solid #888", top: "60%" }} />

        {/* Chain badge — top right corner */}
        <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#1d2b28", border: "1px solid #264a46", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
          <img src={getMSChainIconUrl(node.chain || "")} width={12} height={12} alt="" style={{ borderRadius: "50%" }} draggable={false} />
        </div>

        {/* Entity/Exchange badge — top left corner (only for exchanges/defi) */}
        {(node.type === "exchange" || node.type === "defi") && (node.entityIconUrl || node.entitySlug) && (
          <div style={{ position: "absolute", top: -6, left: -6, width: 18, height: 18, borderRadius: "50%", background: "#1d2b28", border: "1px solid #264a46", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            <img 
              src={node.entityIconUrl || getMSExchangeIconUrl(node.entitySlug) || ""} 
              width={12} height={12} alt="" style={{ borderRadius: "50%" }} draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Risk badge */}
        {isDanger && (
          <div style={{ position: "absolute", top: -10, right: 14, width: 16, height: 16, borderRadius: "50%", background: node.riskLevel === "critical" ? "#D60473" : "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", zIndex: 11 }}>
            !
          </div>
        )}

        {/* Alert badge */}
        {alertOn && (
          <div style={{ position: "absolute", top: -8, left: 14, width: 16, height: 16, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, zIndex: 11 }}>
            🔔
          </div>
        )}

        {/* Main content — entity icon + name + address */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", height: NODE_H, overflow: "hidden", fontFamily: "Inter, sans-serif" }}>
          {/* Main icon — Entity logo for exchanges/defi, Chain icon for others */}
          <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: getMSChainBgColor(node.chain || "") + "2E", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {(node.type === "exchange" || node.type === "defi") && (node.entityIconUrl || node.entitySlug) ? (
              <img 
                src={node.entityIconUrl || getMSExchangeIconUrl(node.entitySlug) || getMSChainIconUrl(node.chain || "")} 
                width={20} height={20} alt="" style={{ borderRadius: "50%" }} draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).src = getMSChainIconUrl(node.chain || ""); }}
              />
            ) : (
              <img src={getMSChainIconUrl(node.chain || "")} width={20} height={20} alt="" style={{ borderRadius: "50%" }} draggable={false} />
            )}
          </div>

          {/* Text — Name above Address */}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            {/* Entity Name / Label */}
            {editingLabel ? (
              <input
                autoFocus
                value={editValue}
                onChange={(ev) => setEditValue(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === "Enter") commitEdit(); if (ev.key === "Escape") setEditingLabel(false); }}
                onBlur={commitEdit}
                onClick={(ev) => ev.stopPropagation()}
                style={{ width: "100%", fontSize: 12, fontWeight: 600, color: textColor, background: "rgba(255,255,255,0.1)", border: `1px solid ${MS_COLORS.primary}`, borderRadius: 3, padding: "1px 4px", outline: "none", fontFamily: "Inter, sans-serif" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4, lineHeight: "16px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                  {node.entityName || node.label}
                </span>
                {node.isRoot && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: MS_COLORS.primary, flexShrink: 0 }}>ROOT</span>
                )}
                {isBridge && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.44)", background: "rgba(255,255,255,0.063)", borderRadius: 3, padding: "1px 4px", flexShrink: 0 }}>Bridge</span>
                )}
              </div>
            )}

            {/* Address */}
            <div style={{ marginTop: 1, lineHeight: "13px" }}>
              <span style={{ fontFamily: "Menlo, Monaco, monospace", fontSize: 9, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                {msShortenAddress(node.address || "")}
              </span>
            </div>
          </div>
        </div>

        {/* Loading spinner */}
        {node.isLoading && (
          <div style={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)" }}>
            <div className="w-4 h-4 border-2 border-[var(--default-color)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Resizer */}
        <NodeResizer minWidth={NODE_W} minHeight={NODE_H} isVisible={selected || false} lineStyle={{ borderColor: MS_COLORS.primary }} handleStyle={{ background: MS_COLORS.primary, width: 8, height: 8 }} />
      </div>

      {/* ── Floating buttons BELOW the card ── */}
      {showButtons && (
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
            zIndex: 20,
          }}
        >
          {/* Rename */}
          <FAB
            icon={SVG_ICON.pencil}
            title="Rename"
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
          />
          {/* Find Relationship */}
          <FAB
            icon="M6.5 2a4.5 4.5 0 013.58 7.2l3.6 3.6-.7.7-3.6-3.6A4.5 4.5 0 116.5 2z"
            title="Find Relationship"
            onClick={(e) => { e.stopPropagation(); openFindRelationship(id); }}
          />
          {/* Alert toggle */}
          <FAB
            icon={SVG_ICON.bell}
            stroke={alertOn ? "#f59e0b" : undefined}
            title={alertOn ? "Alert ON — click to disable" : "Set alert"}
            onClick={(e) => { e.stopPropagation(); setAlertOn(!alertOn); }}
          />
        </div>
      )}
    </div>
  );
}

export default memo(CWNodeComponent);
