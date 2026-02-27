/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWTrackerLayout — CWTracker 100% parity layout shell       ║
 * ║  Structure from DOM capture: full-viewport container with    ║
 * ║  absolute-positioned floating panels over SVG canvas.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

interface CWTrackerLayoutProps {
  /** Top action bar (MSActionBar) */
  actionBar: React.ReactNode;
  /** Floating graph toolbar top-left (MSGraphToolbar) */
  graphToolbar: React.ReactNode;
  /** Right vertical toolbar (MSRightToolbar) */
  rightToolbar: React.ReactNode;
  /** Bottom-right zoom controls (MSZoomBar) */
  zoomBar: React.ReactNode;
  /** SVG graph canvas (MSGraphCanvas) */
  graph: React.ReactNode;
  /** Address detail sidebar left (MSAddressDetail) */
  addressDetail?: React.ReactNode;
  /** InterChain Tracker bottom panel (MSInterChainTracker) */
  interChainTracker?: React.ReactNode;
  /** Edge style picker overlay */
  edgeStylePicker?: React.ReactNode;
  /** Edge list bottom panel (MSEdgeList) */
  edgeList?: React.ReactNode;
  /** Children (modals, overlays) */
  children?: React.ReactNode;
}

export function CWTrackerLayout({
  actionBar,
  graphToolbar,
  rightToolbar,
  zoomBar,
  graph,
  addressDetail,
  interChainTracker,
  edgeStylePicker,
  edgeList,
  children,
}: CWTrackerLayoutProps) {
  const sidebarOpen = useCWTrackerStore((s) => s.sidebarOpen);
  const nodeDetailNodeId = useCWTrackerStore((s) => s.nodeDetailNodeId);
  const interChainOpen = useCWTrackerStore((s) => s.interChainOpen);
  const edgeListOpen = useCWTrackerStore((s) => s.edgeListOpen);

  return (
    <div
      className="index_container__221Ty no-select"
      data-theme="dark"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* ───── Top Action Bar (Nav + Graph Actions) ───── */}
      <div className="flex-shrink-0 z-20 w-full">
        {actionBar}
      </div>

      {/* ───── Main Canvas Area ───── */}
      <div className="flex-1 relative overflow-hidden w-full h-full">
        {/* SVG Graph Canvas — full area */}
        <div className="absolute inset-0 z-0">
          {graph}
        </div>

        {/* Floating Graph Toolbar — top-left */}
        <div className="absolute left-4 top-4 z-10">
          {graphToolbar}
        </div>

        {/* Floating Right Toolbar — right side */}
        <div className="absolute right-4 top-4 z-10">
          {rightToolbar}
        </div>

        {/* Floating Zoom Bar — bottom-right */}
        <div className="absolute right-4 bottom-4 z-10">
          {zoomBar}
        </div>

        {/* Address Detail Sidebar — left overlay */}
        {sidebarOpen && nodeDetailNodeId && (
          <div className="index_addressDetail__IpPiN">
            {addressDetail}
          </div>
        )}

        {/* Edge Style Picker — floating overlay */}
        {edgeStylePicker}

        {/* InterChain Tracker — bottom panel */}
        {interChainOpen && (
          <div className="index_container__MJ_aS">
            {interChainTracker}
          </div>
        )}

        {/* Edge List — bottom panel */}
        {edgeListOpen && edgeList}
      </div>

      {/* Children (search overlay, modals) */}
      {children}
    </div>
  );
}
