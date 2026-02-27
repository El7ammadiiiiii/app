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
  getMSRiskColor,
  getMSRiskLabel,
  getBlockExplorerUrl,
  msShortenAddress,
  msFormatValue,
  type MSNode,
} from "@/lib/onchain/cwtracker-types";
import { NODE_W, NODE_H, NODE_R, EXPANDED_NODE_EXTRA_H, SVG_ICON, APPROX_TOKEN_USD } from "./constants";

export interface CWNodeData extends MSNode {
  flowUSD?: number;
  isPinnedExpanded?: boolean;
}

type CWNodeProps = NodeProps & { data: CWNodeData };

function CWNodeComponent({ id, data, selected }: CWNodeProps) {
  const node = data;
  const isHovered = useCWTrackerStore((s) => s.hoveredNodeId === id);
  const hoveredEdgeId = useCWTrackerStore((s) => s.hoveredEdgeId);
  const edges = useCWTrackerStore((s) => s.edges);
  const hoverNode = useCWTrackerStore((s) => s.hoverNode);
  const expandNodeDirection = useCWTrackerStore((s) => s.expandNodeDirection);
  const openAdvancedAnalyze = useCWTrackerStore((s) => s.openAdvancedAnalyze);
  const openNodeDetail = useCWTrackerStore((s) => s.openNodeDetail);
  const removeNode = useCWTrackerStore((s) => s.removeNode);
  const updateNode = useCWTrackerStore((s) => s.updateNode);

  const [editingLabel, setEditingLabel] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isEdgeConnected = hoveredEdgeId
    ? edges.some((e) => e.id === hoveredEdgeId && (e.source === id || e.target === id))
    : false;

  const showGlow = isHovered || selected || isEdgeConnected;
  const showExpanded = isHovered || selected || isPinnedExpanded;
  const visualHeight = showExpanded ? NODE_H + EXPANDED_NODE_EXTRA_H : NODE_H;

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

  const usd = node.balanceUSD ?? node.totalValueUSD ?? node.flowUSD;

  return (
    <div
      className="cw-node-wrapper"
      style={{
        /* Outer wrapper: wider interaction area so + buttons stay hovered */
        width: NODE_W + 72,
        height: visualHeight + 20,
        padding: "10px 36px",
        position: "relative",
        boxSizing: "border-box",
      }}
      onMouseEnter={() => hoverNode(id)}
      onMouseLeave={() => hoverNode(null)}
    >
      {/* ── Expand "+" buttons OUTSIDE the card, INSIDE the hover wrapper ── */}
      {showExpanded && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              expandNodeDirection(id, "left");
            }}
            title="Expand Incoming"
            style={{
              position: "absolute",
              left: 4,
              top: 10 + NODE_H / 2 - 12,
              width: 24,
              height: 24,
              borderRadius: 6,
              background: MS_COLORS.primary,
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              expandNodeDirection(id, "right");
            }}
            title="Expand Outgoing"
            style={{
              position: "absolute",
              right: 4,
              top: 10 + NODE_H / 2 - 12,
              width: 24,
              height: 24,
              borderRadius: 6,
              background: MS_COLORS.primary,
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}
          >
            +
          </button>
        </>
      )}

      {/* ── Inner visible card ── */}
    <div
      className={`cw-node ${showGlow ? "cw-node-glow" : ""} ${isBridge ? "cw-node-bridge" : ""}`}
      style={{
        width: NODE_W,
        height: visualHeight,
        background: fill,
        border: `${strokeW}px solid ${isBridge ? "#bd7c4060" : strokeColor}`,
        borderRadius: NODE_R,
        position: "relative",
        transition: "height 0.15s ease",
        filter: showGlow ? "drop-shadow(0 0 8px rgba(189,124,64,0.5))" : undefined,
      }}
    >
      {/* Handles — 4 handles for bidirectional edge routing */}
      {/* Left side: receive (target) & send (source) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: "#555", width: 8, height: 8, border: "2px solid #888" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-out"
        style={{ background: "#555", width: 8, height: 8, border: "2px solid #888", top: "60%" }}
      />
      {/* Right side: send (source) & receive (target) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: "#555", width: 8, height: 8, border: "2px solid #888" }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        style={{ background: "#555", width: 8, height: 8, border: "2px solid #888", top: "60%" }}
      />

      {/* Risk badge */}
      {isDanger && (
        <div
          style={{
            position: "absolute",
            top: -10,
            right: -4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: node.riskLevel === "critical" ? "#D60473" : "#FF3B30",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            zIndex: 10,
          }}
        >
          !
        </div>
      )}

      {/* Main content */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 10px 8px 12px",
          height: NODE_H,
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Chain icon */}
        <div
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: getMSChainBgColor(node.chain || "") + "2E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={getMSChainIconUrl(node.chain || "")}
            width={22}
            height={22}
            alt=""
            style={{ borderRadius: "50%" }}
            draggable={false}
          />
        </div>

        {/* Text column */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {/* Label */}
          {editingLabel ? (
            <input
              autoFocus
              value={editValue}
              onChange={(ev) => setEditValue(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") commitEdit();
                if (ev.key === "Escape") setEditingLabel(false);
              }}
              onBlur={commitEdit}
              onClick={(ev) => ev.stopPropagation()}
              style={{
                width: "100%",
                fontSize: 13,
                fontWeight: 600,
                color: textColor,
                background: "rgba(255,255,255,0.1)",
                border: `1px solid ${MS_COLORS.primary}`,
                borderRadius: 3,
                padding: "1px 4px",
                outline: "none",
                fontFamily: "Inter, sans-serif",
              }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4, lineHeight: "18px" }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: textColor,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: isBridge ? 120 : 170,
                }}
              >
                {node.label}
              </span>
              {node.isRoot && (
                <span style={{ fontSize: 9, fontWeight: 700, color: MS_COLORS.primary, flexShrink: 0 }}>
                  ROOT
                </span>
              )}
              {isBridge && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.44)",
                    background: "rgba(255,255,255,0.063)",
                    borderRadius: 3,
                    padding: "1px 6px",
                    flexShrink: 0,
                  }}
                >
                  Bridge
                </span>
              )}
              {node.riskLevel && node.riskLevel !== "unknown" && !isDanger && (
                <span
                  style={{
                    fontSize: 9,
                    color: getMSRiskColor(node.riskLevel),
                    marginLeft: "auto",
                    flexShrink: 0,
                  }}
                >
                  {getMSRiskLabel(node.riskLevel)}
                </span>
              )}
            </div>
          )}

          {/* Address */}
          <div style={{ marginTop: 1, lineHeight: "14px" }}>
            <span
              style={{
                fontFamily: "Menlo, Monaco, monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.55)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
              }}
            >
              {node.address || ""}
            </span>
          </div>

          {/* USD balance */}
          {usd != null && usd > 0 && (
            <div style={{ marginTop: 1, fontSize: 11, fontWeight: 700, color: "#24c197", lineHeight: "14px" }}>
              ≈ {msFormatValue(usd)}
            </div>
          )}
        </div>

        {/* Icon column — Copy address & Open explorer */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 2,
            opacity: isHovered || selected ? 1 : 0.5,
          }}
        >
          {/* Copy full wallet address */}
          <div style={{ position: "relative" }}>
            <svg
              width={14}
              height={14}
              viewBox="0 0 16 16"
              style={{ cursor: "pointer" }}
              onClick={handleCopyAddress}
            >
              <title>Copy full address</title>
              <path
                d={SVG_ICON.copy}
                fill="none"
                stroke={copied ? "#24c197" : "#999"}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {copied && (
              <div
                style={{
                  position: "absolute",
                  top: -22,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#24c197",
                  color: "#fff",
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 20,
                }}
              >
                Copied!
              </div>
            )}
          </div>
          {/* Open block explorer */}
          <svg
            width={14}
            height={14}
            viewBox="0 0 16 16"
            style={{ cursor: "pointer" }}
            onClick={handleOpenExplorer}
          >
            <title>View on block explorer</title>
            <path
              d={SVG_ICON.explorer}
              fill="none"
              stroke="#999"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Expanded action bar */}
      {showExpanded && (
        <div
          style={{
            display: "flex",
            gap: 3,
            padding: "4px 6px",
            height: EXPANDED_NODE_EXTRA_H,
            alignItems: "center",
          }}
        >
          {/* Analyze */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAdvancedAnalyze(id);
            }}
            style={{
              flex: 1,
              height: 28,
              background: MS_COLORS.primary,
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Analyze
          </button>

          {/* Settings — opens node detail sidebar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openNodeDetail(id);
            }}
            title="Node details &amp; settings"
            style={{
              width: 30,
              height: 28,
              background: MS_COLORS.primary,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16">
              <path d={SVG_ICON.sliders} fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </button>

          {/* Edit */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
            title="Edit name tag"
            style={{
              width: 28,
              height: 28,
              background: "#30313580",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16">
              <path
                d={SVG_ICON.pencil}
                fill="none"
                stroke="#cfcfcf"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeNode(id);
            }}
            title="Remove this node"
            style={{
              width: 28,
              height: 28,
              background: "#30313580",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16">
              <path
                d={SVG_ICON.trash}
                fill="none"
                stroke="#ff4d4f"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

        </div>
      )}

      {/* Loading spinner */}
      {node.isLoading && (
        <div
          style={{
            position: "absolute",
            bottom: -28,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="w-5 h-5 border-2 border-[var(--default-color)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Resizer for node */}
      <NodeResizer
        minWidth={NODE_W}
        minHeight={NODE_H}
        isVisible={selected || false}
        lineStyle={{ borderColor: MS_COLORS.primary }}
        handleStyle={{ background: MS_COLORS.primary, width: 8, height: 8 }}
      />
    </div>
    </div>
  );
}

export default memo(CWNodeComponent);
