/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EdgeActionBar — Shared hover toolbar for all edge types     ║
 * ║  Provides: Style picker (◐), Edge list (☰), Delete (✕),     ║
 * ║  and Edge type switching (≋) with 5 options.                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useState, useCallback } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

const actionBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  border: "none",
  borderRadius: 4,
  background: "transparent",
  color: "#999",
  cursor: "pointer",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const EDGE_TYPE_OPTIONS = [
  { label: "┘", type: "default", tip: "Orthogonal" },
  { label: "~", type: "smooth", tip: "Smooth" },
  { label: "/", type: "straight", tip: "Straight" },
  { label: "≋", type: "animated", tip: "Flow" },
  { label: "◉", type: "animatedSvg", tip: "Animated SVG" },
] as const;

interface EdgeActionBarProps {
  msEdgeId: string;
}

function EdgeActionBarComponent({ msEdgeId }: EdgeActionBarProps) {
  const openEdgeStylePicker = useCWTrackerStore((s) => s.openEdgeStylePicker);
  const openEdgeList = useCWTrackerStore((s) => s.openEdgeList);
  const removeEdge = useCWTrackerStore((s) => s.removeEdge);
  const updateEdge = useCWTrackerStore((s) => s.updateEdge);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const handleStyleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openEdgeStylePicker(msEdgeId);
    },
    [msEdgeId, openEdgeStylePicker]
  );

  const handleListClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openEdgeList(msEdgeId);
    },
    [msEdgeId, openEdgeList]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeEdge(msEdgeId);
    },
    [msEdgeId, removeEdge]
  );

  const handleTypeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowTypeMenu((v) => !v);
    },
    []
  );

  return (
    <div
      style={{
        position: "absolute",
        top: -30,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "#2a2a2a",
        border: "1px solid #444",
        borderRadius: 6,
        padding: "2px 6px",
        height: 26,
      }}
    >
      {/* Style picker */}
      <button
        onClick={handleStyleClick}
        style={actionBtnStyle}
        title="Edge Style"
        onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
      >
        ◐
      </button>
      {/* Edge list */}
      <button
        onClick={handleListClick}
        style={actionBtnStyle}
        title="Edge Transactions"
        onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
      >
        ☰
      </button>
      {/* Delete */}
      <button
        onClick={handleDeleteClick}
        style={actionBtnStyle}
        title="Delete Edge"
        onMouseOver={(e) => (e.currentTarget.style.color = "#ff4d4f")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
      >
        ✕
      </button>
      {/* Type switcher */}
      <div style={{ position: "relative" }}>
        <button
          onClick={handleTypeToggle}
          style={actionBtnStyle}
          title="Edge display type"
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
        >
          ≋
        </button>
        {showTypeMenu && (
          <div
            style={{
              position: "absolute",
              top: -34,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 2,
              background: "#1f1f1f",
              border: "1px solid #555",
              borderRadius: 5,
              padding: "2px 4px",
              zIndex: 100,
            }}
          >
            {EDGE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                title={opt.tip}
                onClick={(ev) => {
                  ev.stopPropagation();
                  updateEdge(msEdgeId, { edgeType: opt.type as any });
                  setShowTypeMenu(false);
                }}
                style={{
                  ...actionBtnStyle,
                  fontSize: 13,
                  color: "#ccc",
                  width: 24,
                  height: 24,
                }}
                onMouseOver={(ev) => (ev.currentTarget.style.color = "#fff")}
                onMouseOut={(ev) => (ev.currentTarget.style.color = "#ccc")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EdgeActionBarComponent);
