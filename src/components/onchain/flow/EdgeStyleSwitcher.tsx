/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EdgeStyleSwitcher — Toggle between edge routing modes        ║
 * ║  Orthogonal / Smooth / Straight / Flow / Animated SVG         ║
 * ║  Smart: applies to selected edge only, else to ALL edges      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useCallback } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import type { EdgeRoutingMode } from "./constants";

/** Maps EdgeRoutingMode → MSEdge.edgeType value for per-edge override */
const MODE_TO_EDGE_TYPE: Record<EdgeRoutingMode, string> = {
  orthogonal: "default",
  smoothstep: "smooth",
  straight: "straight",
  bezier: "animated",
  animatedSvg: "animatedSvg",
};

interface ModeOption {
  mode: EdgeRoutingMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const MODES: ModeOption[] = [
  {
    mode: "orthogonal",
    label: "90°",
    icon: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path d="M2 8H8V14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={2} cy={8} r={1.5} fill="currentColor" />
        <circle cx={8} cy={14} r={1.5} fill="currentColor" />
      </svg>
    ),
    description: "Orthogonal 90° edges",
  },
  {
    mode: "smoothstep",
    label: "Curve",
    icon: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path d="M2 12C2 6 14 10 14 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={2} cy={12} r={1.5} fill="currentColor" />
        <circle cx={14} cy={4} r={1.5} fill="currentColor" />
      </svg>
    ),
    description: "Smooth curved edges",
  },
  {
    mode: "straight",
    label: "Line",
    icon: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <line x1={2} y1={12} x2={14} y2={4} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={2} cy={12} r={1.5} fill="currentColor" />
        <circle cx={14} cy={4} r={1.5} fill="currentColor" />
      </svg>
    ),
    description: "Straight line edges",
  },
  {
    mode: "bezier",
    label: "Flow",
    icon: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path d="M2 12C8 12 8 4 14 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3 2" />
        <circle cx={2} cy={12} r={1.5} fill="currentColor" />
        <circle cx={14} cy={4} r={1.5} fill="currentColor" />
      </svg>
    ),
    description: "Animated flow edges",
  },
  {
    mode: "animatedSvg",
    label: "SVG",
    icon: (
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <path d="M2 12 Q8 12 8 8 Q8 4 14 4" stroke="#ff0073" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={8} cy={8} r={2.5} fill="#ff0073" opacity={0.9} />
        <circle cx={2} cy={12} r={1.5} fill="currentColor" />
        <circle cx={14} cy={4} r={1.5} fill="currentColor" />
      </svg>
    ),
    description: "Animated SVG smooth-step",
  },
];

function EdgeStyleSwitcherComponent() {
  const edgeRoutingMode = useCWTrackerStore((s) => s.edgeRoutingMode);
  const setEdgeRoutingMode = useCWTrackerStore((s) => s.setEdgeRoutingMode);
  const selectedEdgeId = useCWTrackerStore((s) => s.selectedEdgeId);
  const updateEdge = useCWTrackerStore((s) => s.updateEdge);

  const handleSelect = useCallback(
    (mode: EdgeRoutingMode) => {
      if (selectedEdgeId) {
        // Apply to selected edge only
        updateEdge(selectedEdgeId, { edgeType: MODE_TO_EDGE_TYPE[mode] as any });
      } else {
        // Apply to all edges globally
        setEdgeRoutingMode(mode);
      }
    },
    [selectedEdgeId, updateEdge, setEdgeRoutingMode]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: "#1f1f1f",
        border: "1px solid #333",
        borderRadius: 8,
        padding: 4,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#888",
          padding: "2px 6px",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        Edge Style
        {selectedEdgeId && (
          <span
            style={{
              fontSize: 8,
              color: "#597ef7",
              background: "rgba(89,126,247,0.15)",
              padding: "1px 4px",
              borderRadius: 3,
            }}
          >
            ● Selected
          </span>
        )}
      </div>
      {MODES.map((opt) => {
        const isActive = selectedEdgeId
          ? false // when an edge is selected, no global mode highlight
          : edgeRoutingMode === opt.mode;
        return (
          <button
            key={opt.mode}
            onClick={() => handleSelect(opt.mode)}
            title={opt.description}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              background: isActive ? "#333" : "transparent",
              border: isActive ? "1px solid #555" : "1px solid transparent",
              borderRadius: 6,
              color: isActive ? "#fff" : "#999",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "Inter, sans-serif",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              if (!isActive) e.currentTarget.style.background = "#2a2a2a";
            }}
            onMouseOut={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(EdgeStyleSwitcherComponent);
