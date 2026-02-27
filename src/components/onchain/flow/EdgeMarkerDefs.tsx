/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EdgeMarkerDefs — SVG <marker> definitions for edge arrows   ║
 * ║  Generates a unique marker per edge (color + size) plus a    ║
 * ║  shared "selected" marker in selection-blue.                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import { ARROW_SIZE } from "./constants";

/* ── Default & selected colors ── */
const SELECTED_MARKER_COLOR = "#597ef7";
const DEFAULT_MARKER_COLOR = "#ffffff";

/* ── Marker ID helpers (import these in edge components) ── */
export function markerIdForEdge(edgeId: string): string {
  return `cw-marker-${edgeId}`;
}
export function markerUrlForEdge(edgeId: string): string {
  return `url(#cw-marker-${edgeId})`;
}
export const SELECTED_MARKER_ID = "cw-marker-selected";
export const SELECTED_MARKER_URL = `url(#${SELECTED_MARKER_ID})`;

/**
 * Renders ONE <marker> element.
 * Arrow shape: closed triangle matching the reference "ArrowClosed" style.
 */
function ArrowMarker({
  id,
  color,
  size,
}: {
  id: string;
  color: string;
  size: number;
}) {
  const halfW = size / 2;
  return (
    <marker
      id={id}
      markerWidth={size}
      markerHeight={size}
      viewBox={`-${halfW} -${halfW} ${size} ${size}`}
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
      refX="0"
      refY="0"
    >
      <polyline
        strokeLinecap="round"
        strokeLinejoin="round"
        points={`-${halfW * 0.8},-${halfW * 0.6} 0,0 -${halfW * 0.8},${halfW * 0.6} -${halfW * 0.8},-${halfW * 0.6}`}
        style={{
          strokeWidth: 1,
          stroke: color,
          fill: color,
        }}
      />
    </marker>
  );
}

function EdgeMarkerDefsComponent() {
  const edges = useCWTrackerStore((s) => s.edges);

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* ── Shared selected marker (blue) ── */}
        <ArrowMarker
          id={SELECTED_MARKER_ID}
          color={SELECTED_MARKER_COLOR}
          size={ARROW_SIZE + 4}
        />

        {/* ── Per-edge markers ── */}
        {edges.map((e) => {
          const color = e.customColor || e.color || DEFAULT_MARKER_COLOR;
          const size = e.customArrowSize ?? ARROW_SIZE;
          return (
            <ArrowMarker
              key={e.id}
              id={markerIdForEdge(e.id)}
              color={color}
              size={size}
            />
          );
        })}
      </defs>
    </svg>
  );
}

export default memo(EdgeMarkerDefsComponent);
