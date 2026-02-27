/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSZoomBar — CWTracker bottom-right zoom controls            ║
 * ║  Zoom in/out + center view + zoom percentage display          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

export function MSZoomBar() {
  const zoom = useCWTrackerStore((s) => s.zoom);
  const setZoom = useCWTrackerStore((s) => s.setZoom);
  const fitToView = useCWTrackerStore((s) => s.fitToView);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg px-1 py-0.5"
      style={{
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Zoom out */}
      <button
        onClick={() => setZoom(zoom - 0.1)}
        disabled={zoom <= 0.1}
        className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <i className="iconfont icon-reduce" style={{ fontSize: 16 }} />
      </button>

      {/* Zoom percentage */}
      <span className="text-xs text-white/70 w-10 text-center tabular-nums">
        {zoomPercent}%
      </span>

      {/* Zoom in */}
      <button
        onClick={() => setZoom(zoom + 0.1)}
        disabled={zoom >= 3}
        className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <i className="iconfont icon-enlarge" style={{ fontSize: 16 }} />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-white/20 mx-0.5" />

      {/* Fit to view / center */}
      <button
        onClick={fitToView}
        className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Center view"
      >
        <i className="iconfont icon-view_center" style={{ fontSize: 18 }} />
      </button>
    </div>
  );
}
