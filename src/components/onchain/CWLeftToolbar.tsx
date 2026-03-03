/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWLeftToolbar — Unified left vertical floating toolbar      ║
 * ║  Merges: MSRightToolbar + EdgeStyleSwitcher                  ║
 * ║  Collapsible on mobile, beautiful dark glass design          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useState, useCallback } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { EdgeRoutingMode } from "./flow/constants";

/* ── Mode → edgeType mapping (from EdgeStyleSwitcher) ── */
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
}

const EDGE_MODES: ModeOption[] = [
  {
    mode: "orthogonal",
    label: "90°",
    icon: (
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <path d="M2 8H8V14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    mode: "smoothstep",
    label: "Curve",
    icon: (
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <path d="M2 12C2 6 14 10 14 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: "straight",
    label: "Line",
    icon: (
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <line x1={2} y1={12} x2={14} y2={4} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: "bezier",
    label: "Flow",
    icon: (
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <path d="M2 12C8 12 8 4 14 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    mode: "animatedSvg",
    label: "SVG",
    icon: (
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <path d="M2 12 Q8 12 8 8 Q8 4 14 4" stroke="#ff0073" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={8} cy={8} r={2} fill="#ff0073" opacity={0.9} />
      </svg>
    ),
  },
];

/* ── Tooltip ── */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 px-2 py-1 text-xs bg-black/80 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  );
}

/* ── Icon button ── */
function IBtn({
  icon,
  size = 18,
  tip,
  onClick,
  disabled,
  active,
  mobile,
}: {
  icon: string;
  size?: number;
  tip?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  mobile?: boolean;
}) {
  const dim = mobile ? 32 : 36;
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded transition-colors
        ${active ? "text-white bg-white/15" : "text-white/60 hover:text-white hover:bg-white/10"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ width: dim, height: dim }}
    >
      <i className={`iconfont ${icon}`} style={{ fontSize: size }} />
    </button>
  );
  return tip ? <Tip text={tip}>{btn}</Tip> : btn;
}

function CWLeftToolbarInner() {
  const { isMobile } = useMediaQuery();
  const [collapsed, setCollapsed] = useState(false);
  const [edgeStylesOpen, setEdgeStylesOpen] = useState(false);

  /* Store actions */
  const undo = useCWTrackerStore((s) => s.undo);
  const redo = useCWTrackerStore((s) => s.redo);
  const undoStack = useCWTrackerStore((s) => s.undoStack);
  const redoStack = useCWTrackerStore((s) => s.redoStack);
  const edgeStyleEdgeId = useCWTrackerStore((s) => s.edgeStyleEdgeId);
  const openEdgeStylePicker = useCWTrackerStore((s) => s.openEdgeStylePicker);
  const closeEdgeStylePicker = useCWTrackerStore((s) => s.closeEdgeStylePicker);
  const edgeRoutingMode = useCWTrackerStore((s) => s.edgeRoutingMode);
  const setEdgeRoutingMode = useCWTrackerStore((s) => s.setEdgeRoutingMode);
  const selectedEdgeId = useCWTrackerStore((s) => s.selectedEdgeId);
  const updateEdge = useCWTrackerStore((s) => s.updateEdge);
  const controlMode = useCWTrackerStore((s) => s.controlMode);
  const setControlMode = useCWTrackerStore((s) => s.setControlMode);

  const handleEdgeModeSelect = useCallback(
    (mode: EdgeRoutingMode) => {
      if (selectedEdgeId) {
        updateEdge(selectedEdgeId, { edgeType: MODE_TO_EDGE_TYPE[mode] as any });
      } else {
        setEdgeRoutingMode(mode);
      }
    },
    [selectedEdgeId, updateEdge, setEdgeRoutingMode]
  );

  /* Mobile: collapsed state shows only a toggle button */
  if (isMobile && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white"
        style={{
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}
      >
        <i className="iconfont icon-more_dotted" style={{ fontSize: 16 }} />
      </button>
    );
  }

  const btnSize = isMobile ? 14 : 18;

  return (
    <div
      className="flex flex-col items-center rounded-lg gap-0.5"
      style={{
        width: isMobile ? 36 : 44,
        padding: isMobile ? "4px 2px" : "6px 4px",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Collapse button — mobile only */}
      {isMobile && (
        <button
          onClick={() => setCollapsed(true)}
          className="flex items-center justify-center w-full h-5 text-white/40 hover:text-white/70 transition-colors"
        >
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Style / Color picker */}
      <IBtn
        icon="icon-color_select"
        size={btnSize}
        tip="Style settings"
        mobile={isMobile}
        onClick={() => {
          if (edgeStyleEdgeId) closeEdgeStylePicker();
          else openEdgeStylePicker("__global__");
        }}
      />

      {/* Draw Edge */}
      <IBtn
        icon="icon-link-03"
        size={btnSize}
        tip="Draw edge"
        mobile={isMobile}
        active={controlMode === "draw_edge"}
        onClick={() => setControlMode(controlMode === "draw_edge" ? "select" : "draw_edge")}
      />

      {/* Divider */}
      <div className="w-5 h-px bg-white/20 mx-auto my-0.5" />

      {/* Undo */}
      <IBtn
        icon="icon-laststep"
        size={btnSize - 2}
        tip="Undo"
        mobile={isMobile}
        onClick={undo}
        disabled={undoStack.length === 0}
      />

      {/* Redo */}
      <IBtn
        icon="icon-nextstep"
        size={btnSize - 2}
        tip="Redo"
        mobile={isMobile}
        onClick={redo}
        disabled={redoStack.length === 0}
      />

      {/* Divider */}
      <div className="w-5 h-px bg-white/20 mx-auto my-0.5" />

      {/* Edge Routing toggle */}
      <Tip text="Edge routing">
        <button
          onClick={() => setEdgeStylesOpen(!edgeStylesOpen)}
          className={`flex items-center justify-center rounded transition-colors ${
            edgeStylesOpen ? "text-white bg-white/15" : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36 }}
        >
          <svg width={btnSize} height={btnSize} viewBox="0 0 16 16" fill="none">
            <path d="M2 12C2 6 14 10 14 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={2} cy={12} r={1.5} fill="currentColor" />
            <circle cx={14} cy={4} r={1.5} fill="currentColor" />
          </svg>
        </button>
      </Tip>

      {/* Edge routing modes (expanded) */}
      {edgeStylesOpen && (
        <div className="flex flex-col items-center gap-0.5 py-1">
          {selectedEdgeId && (
            <div className="text-[7px] text-blue-400 mb-0.5">●sel</div>
          )}
          {EDGE_MODES.map((opt) => {
            const isActive = !selectedEdgeId && edgeRoutingMode === opt.mode;
            return (
              <Tip key={opt.mode} text={opt.label}>
                <button
                  onClick={() => handleEdgeModeSelect(opt.mode)}
                  className={`flex items-center justify-center rounded transition-all ${
                    isActive ? "text-white bg-white/15 border border-white/20" : "text-white/50 hover:text-white hover:bg-white/8 border border-transparent"
                  }`}
                  style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32 }}
                >
                  {opt.icon}
                </button>
              </Tip>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const CWLeftToolbar = memo(CWLeftToolbarInner);
