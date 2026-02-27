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
 * Store → React Flow: when store fitToView is triggered.
 * React Flow → Store: on every viewport change.
 */
export function useViewportSync() {
  const { setViewport, fitView, getViewport } = useReactFlow();
  const isAdjusting = useRef(false);

  /* ── React Flow → Store ── */
  const onViewportChange = useCallback(
    (vp: Viewport) => {
      if (isAdjusting.current) return;
      const store = useCWTrackerStore.getState();
      // Only update if significantly different to avoid loops
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

  /* ── Store → React Flow (fitToView command) ── */
  useEffect(() => {
    const unsub = useCWTrackerStore.subscribe(
      (state) => state.zoom,
      (zoom, prevZoom) => {
        // If store's fitToView was called (zoom reset to 1), trigger React Flow fitView
        // This is a heuristic; fitToView sets zoom=1, panX=0, panY=0
        const state = useCWTrackerStore.getState();
        if (zoom === 1 && state.panX === 0 && state.panY === 0 && prevZoom !== 1) {
          isAdjusting.current = true;
          fitView({ padding: 0.2, maxZoom: 1.5, duration: 300 }).then(() => {
            isAdjusting.current = false;
            // Sync back the actual viewport
            const vp = getViewport();
            useCWTrackerStore.setState({
              zoom: vp.zoom,
              panX: vp.x,
              panY: vp.y,
            });
          });
        }
      }
    );
    return unsub;
  }, [fitView, getViewport]);

  return { onViewportChange };
}

/**
 * Hook to trigger fitView from the store's fitToView action.
 * Call this in the canvas component.
 */
export function useFitViewOnCommand() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Override the store's fitToView to use React Flow's fitView
    const originalFitToView = useCWTrackerStore.getState().fitToView;

    // We can't easily override store actions, so instead we subscribe
    // to detect when fitToView is likely called (zoom=1, panX=0, panY=0)
    const unsub = useCWTrackerStore.subscribe((state, prevState) => {
      if (
        state.zoom === 1 &&
        state.panX === 0 &&
        state.panY === 0 &&
        (prevState.zoom !== 1 || prevState.panX !== 0 || prevState.panY !== 0)
      ) {
        fitView({ padding: 0.2, maxZoom: 1.5, duration: 300 });
      }
    });
    return unsub;
  }, [fitView]);
}
