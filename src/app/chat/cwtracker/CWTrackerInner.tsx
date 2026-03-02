/**
 * CWTrackerInner — client-only MetaSleuth page body
 * Loaded via next/dynamic with ssr:false so Zustand selectors never run server-side
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toPng, toSvg } from "html-to-image";
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
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  /* ── Export as PNG (html-to-image on .react-flow) ── */
  const handleExportPNG = useCallback(() => {
    const el = document.querySelector(".react-flow") as HTMLElement | null;
    if (!el) { showToast("No graph to export"); return; }
    toPng(el, {
      backgroundColor: "#0a0a0a",
      pixelRatio: 2,
      filter: (node) => !(node as HTMLElement)?.classList?.contains("react-flow__minimap"),
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.download = "cwtracker-graph.png";
      a.href = dataUrl;
      a.click();
      showToast("PNG exported ✓");
    }).catch(() => showToast("Export failed"));
  }, [showToast]);

  /* ── Export as SVG ── */
  const handleExportSVG = useCallback(() => {
    const el = document.querySelector(".react-flow") as HTMLElement | null;
    if (!el) { showToast("No graph to export"); return; }
    toSvg(el, {
      backgroundColor: "#0a0a0a",
      filter: (node) => !(node as HTMLElement)?.classList?.contains("react-flow__minimap"),
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.download = "cwtracker-graph.svg";
      a.href = dataUrl;
      a.click();
      showToast("SVG exported ✓");
    }).catch(() => showToast("Export failed"));
  }, [showToast]);

  /* ── Export as JSON ── */
  const handleExportJSON = useCallback(() => {
    const snapshot = useCWTrackerStore.getState().getSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = "cwtracker-data.json";
    a.href = URL.createObjectURL(blob);
    a.click();
  }, []);

  /* ── Share (copy link with root address) ── */
  const handleShare = useCallback(() => {
    const root = useCWTrackerStore.getState().nodes.find((n) => n.isRoot);
    let url = window.location.href.split("?")[0];
    if (root?.address) url += `?address=${root.address}&chain=${root.chain || "ethereum"}`;
    navigator.clipboard.writeText(url).then(
      () => showToast("Link copied ✓"),
      () => showToast("Copy failed")
    );
  }, [showToast]);

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
  /* ── Auto-load from URL query params ── */
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const addr = params.get("address");
    const chain = params.get("chain") || "ethereum";
    if (addr && addr.length >= 10) {
      initTrace(addr, chain, `Trace ${addr.slice(0, 6)}...`);
      const rootNode = useCWTrackerStore.getState().nodes.find((n) => n.isRoot);
      if (rootNode) {
        useCWTrackerStore.getState().expandNodeDirection(rootNode.id, "both");
      }
    }
  }, [initTrace]);

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
        // initTrace is synchronous — expand immediately
        const rootNode = useCWTrackerStore.getState().nodes.find((n) => n.isRoot);
        if (rootNode) {
          useCWTrackerStore.getState().expandNodeDirection(rootNode.id, "both");
        }
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

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-xl bg-black/80 border border-white/10 text-sm text-white/90 shadow-2xl backdrop-blur-md animate-[fadeInUp_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </CWTrackerLayout>
  );
}
