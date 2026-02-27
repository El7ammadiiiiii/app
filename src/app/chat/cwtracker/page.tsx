/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  /chat/cwtracker — CWTracker 100% parity fund-flow tracer     ║
 * ║  Wires all new MS* components into CWTrackerLayout            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import dynamic from "next/dynamic";
import React from "react";
import "@/styles/cwtracker-base.css";

/* ── SSR-free: Zustand v5 + Immer selectors must never run server-side ── */
const CWTrackerInner = dynamic(() => import("./CWTrackerInner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        background: "transparent",
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#555",
        fontFamily: "Inter, sans-serif",
      }}
    >
      Loading CWTracker...
    </div>
  ),
});

export default function CWTrackerPage() {
  return <CWTrackerInner />;
}
