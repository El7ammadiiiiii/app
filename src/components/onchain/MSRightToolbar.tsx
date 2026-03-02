/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSRightToolbar — CWTracker right vertical floating toolbar ║
 * ║  color_select | auto_layout | spacing slider | undo/redo     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

/* ── Tooltip ── */
function Tip({ text, children, side = "left" }: { text: string; children: React.ReactNode; side?: "left" | "right" }) {
  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${
          side === "left" ? "right-full mr-2" : "left-full ml-2"
        } px-2 py-1 text-xs bg-black/80 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`}
      >
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
}: {
  icon: string;
  size?: number;
  tip?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-10 h-10 rounded transition-colors
        text-white/60 hover:text-white hover:bg-white/10
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <i className={`iconfont ${icon}`} style={{ fontSize: size }} />
    </button>
  );
  return tip ? <Tip text={tip}>{btn}</Tip> : btn;
}

/* ── Divider ── */
function HDivider() {
  return <div className="w-5 h-px bg-white/20 mx-auto" />;
}

export function MSRightToolbar() {
  const undo = useCWTrackerStore((s) => s.undo);
  const redo = useCWTrackerStore((s) => s.redo);
  const undoStack = useCWTrackerStore((s) => s.undoStack);
  const redoStack = useCWTrackerStore((s) => s.redoStack);
  const edgeStyleEdgeId = useCWTrackerStore((s) => s.edgeStyleEdgeId);
  const openEdgeStylePicker = useCWTrackerStore((s) => s.openEdgeStylePicker);
  const closeEdgeStylePicker = useCWTrackerStore((s) => s.closeEdgeStylePicker);

  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 rounded-lg w-12"
      style={{
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Color / Style picker */}
      <IBtn
        icon="icon-color_select"
        size={20}
        tip="Style settings"
        onClick={() => {
          if (edgeStyleEdgeId) closeEdgeStylePicker();
          else openEdgeStylePicker("__global__");
        }}
      />

      {/* Draw Edge */}
      <IBtn
        icon="icon-link-03"
        size={20}
        tip="Draw edge"
        onClick={() => {
          const mode = useCWTrackerStore.getState().controlMode;
          useCWTrackerStore.getState().setControlMode(mode === "draw_edge" ? "select" : "draw_edge");
        }}
      />

      <HDivider />

      {/* Undo */}
      <IBtn
        icon="icon-laststep"
        size={18}
        tip="Undo"
        onClick={undo}
        disabled={undoStack.length === 0}
      />

      {/* Redo */}
      <IBtn
        icon="icon-nextstep"
        size={18}
        tip="Redo"
        onClick={redo}
        disabled={redoStack.length === 0}
      />
    </div>
  );
}
