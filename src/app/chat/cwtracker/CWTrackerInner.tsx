/**
 * CWTrackerInner — client-only MetaSleuth page body
 * Loaded via next/dynamic with ssr:false so Zustand selectors never run server-side
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import { CWTrackerLayout } from "@/components/onchain/CWTrackerLayout";
import { MSActionBar } from "@/components/onchain/MSActionBar";
import { MSGraphToolbar } from "@/components/onchain/MSGraphToolbar";
import { MSRightToolbar } from "@/components/onchain/MSRightToolbar";
import { MSZoomBar } from "@/components/onchain/MSZoomBar";
import { MSGraphCanvas } from "@/components/onchain/MSGraphCanvas";
import { MSAddressDetail } from "@/components/onchain/MSAddressDetail";
import { MSInterChainTracker } from "@/components/onchain/MSInterChainTracker";
import { MSEdgeStylePicker } from "@/components/onchain/MSEdgeStylePicker";
import { MSEdgeList } from "@/components/onchain/MSEdgeList";
import { SmartSearchInput } from "@/components/onchain/SmartSearchInput";
import { autoSave } from "@/lib/onchain/persistence";

export default function CWTrackerInner() {
  const initTrace = useCWTrackerStore((s) => s.initTrace);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const selectNode = useCWTrackerStore((s) => s.selectNode);

  const [searchOpen, setSearchOpen] = useState(false);
  const [watermarkOn, setWatermarkOn] = useState(false);

  /* ── Export as PNG ── */
  const handleExportPNG = useCallback(() => {
    const svg = document.querySelector("svg.canvas-bg") as SVGSVGElement | null;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const rect = svg.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#1f2124";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.download = "cwtracker-graph.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  }, []);

  /* ── Export as SVG ── */
  const handleExportSVG = useCallback(() => {
    const svg = document.querySelector("svg.canvas-bg") as SVGSVGElement | null;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.download = "cwtracker-graph.svg";
    a.href = URL.createObjectURL(blob);
    a.click();
  }, []);

  /* ── Export as JSON ── */
  const handleExportJSON = useCallback(() => {
    const snapshot = useCWTrackerStore.getState().getSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = "cwtracker-data.json";
    a.href = URL.createObjectURL(blob);
    a.click();
  }, []);

  /* ── Share (copy link) ── */
  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).catch(() => {});
  }, []);

  /* ── Toggle watermark ── */
  const handleToggleWatermark = useCallback(() => {
    setWatermarkOn((prev) => !prev);
  }, []);

  /* ── Auto-save on state changes ── */
  useEffect(() => {
    // Clear any stale demo data from localStorage on first mount
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith("cwtracker:")) localStorage.removeItem(key);
      }
    } catch { /* ignore */ }

    const unsub = useCWTrackerStore.subscribe((state) => {
      if (state.nodes.length > 0) {
        const snapshot = useCWTrackerStore.getState().getSnapshot();
        autoSave(snapshot);
      }
    });
    return unsub;
  }, []);

  /* ── Canvas starts empty — user searches to begin ── */
  // No auto-restore from localStorage; user initiates traces via search.

  /* ── Callbacks ── */
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      useCWTrackerStore.getState().openNodeDetail(nodeId);
    },
    [selectNode]
  );

  const handleEdgeClick = useCallback((edgeId: string) => {
    useCWTrackerStore.getState().selectEdge(edgeId);
    useCWTrackerStore.getState().openEdgeList(edgeId);
  }, []);

  const handleNodeRemove = useCallback((nodeId: string) => {
    useCWTrackerStore.getState().removeNode(nodeId);
  }, []);

  const handleSearchSelect = useCallback(
    (address: string, chain: string) => {
      const existing = nodes.find(
        (n) => n.address?.toLowerCase() === address.toLowerCase()
      );
      if (existing) {
        selectNode(existing.id);
        useCWTrackerStore.getState().openNodeDetail(existing.id);
      } else {
        initTrace(address, chain, `Trace ${address.slice(0, 6)}...`);
        setTimeout(() => {
          const rootNode = useCWTrackerStore.getState().nodes.find((n) => n.isRoot);
          if (rootNode) {
            useCWTrackerStore.getState().expandNodeDirection(rootNode.id, "both");
          }
        }, 500);
      }
      setSearchOpen(false);
    },
    [nodes, selectNode, initTrace]
  );

  return (
    <CWTrackerLayout
      actionBar={
        <MSActionBar
          onSearchOpen={() => setSearchOpen(true)}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportJSON={handleExportJSON}
          onShare={handleShare}
        />
      }
      graphToolbar={
        <MSGraphToolbar
          onSearchOpen={() => setSearchOpen(true)}
          onAddAddress={() => setSearchOpen(true)}
          onMemo={() => {
            const mode = useCWTrackerStore.getState().controlMode;
            useCWTrackerStore.getState().setControlMode(mode === "annotate" ? "select" : "annotate");
          }}
          onToggleWatermark={handleToggleWatermark}
        />
      }
      rightToolbar={<MSRightToolbar />}
      zoomBar={<MSZoomBar />}
      graph={
        <MSGraphCanvas
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeRemove={handleNodeRemove}
        />
      }
      addressDetail={<MSAddressDetail />}
      interChainTracker={<MSInterChainTracker />}
      edgeStylePicker={<MSEdgeStylePicker />}
      edgeList={<MSEdgeList />}
    >
      {/* ── Search Overlay ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl mx-4">
            <SmartSearchInput
              onSelect={handleSearchSelect}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}
    </CWTrackerLayout>
  );
}
