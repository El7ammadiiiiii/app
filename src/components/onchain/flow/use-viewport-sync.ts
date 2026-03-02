/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  use-viewport-sync — Bidirectional viewport sync               ║
 * ║  Keeps zustand store zoom/pan in sync with React Flow          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReactFlow, type Viewport } from "@xyflow/react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

/**
 * Synchronises the React Flow viewport with the zustand store.
 * Store → React Flow: when fitToView is triggered or zoom buttons pressed.
 * React Flow → Store: on every viewport change.
 */
export function useViewportSync() {
  const { setViewport, fitView, getViewport } = useReactFlow();
  const isAdjusting = useRef(false);
  const prevStoreZoom = useRef<number | null>(null);

  /* ── React Flow → Store ── */
  const onViewportChange = useCallback(
    (vp: Viewport) => {
      if (isAdjusting.current) return;
      const store = useCWTrackerStore.getState();
      if (
        Math.abs(store.zoom - vp.zoom) > 0.001 ||
        Math.abs(store.panX - vp.x) > 0.5 ||
        Math.abs(store.panY - vp.y) > 0.5
      ) {
        useCWTrackerStore.setState({
          zoom: vp.zoom,
          panX: vp.x,
          panY: vp.y,
        });
      }
    },
    []
  );

  /* ── Store → React Flow ── */
  useEffect(() => {
    const unsub = useCWTrackerStore.subscribe((state, prevState) => {
      const { zoom, panX, panY } = state;
      const prev = prevState;

      // fitToView: zoom=1, panX=0, panY=0
      if (zoom === 1 && panX === 0 && panY === 0 && (prev.zoom !== 1 || prev.panX !== 0 || prev.panY !== 0)) {
        isAdjusting.current = true;
        fitView({ padding: 0.2, maxZoom: 1.5, duration: 300 }).then(() => {
          isAdjusting.current = false;
          const vp = getViewport();
          useCWTrackerStore.setState({ zoom: vp.zoom, panX: vp.x, panY: vp.y });
        });
        return;
      }

      // Incremental zoom from MSZoomBar buttons
      if (Math.abs(zoom - prev.zoom) > 0.001 && (panX === prev.panX && panY === prev.panY)) {
        isAdjusting.current = true;
        const vp = getViewport();
        setViewport({ x: vp.x, y: vp.y, zoom }, { duration: 150 });
        setTimeout(() => { isAdjusting.current = false; }, 200);
      }
    });
    return unsub;
  }, [fitView, getViewport, setViewport]);

  return { onViewportChange };
}

/**
 * useFitViewOnCommand — DEPRECATED: consolidated into useViewportSync.
 * Kept as no-op for backward compat.
 */
export function useFitViewOnCommand() {
  // Consolidated into useViewportSync — no-op
}
