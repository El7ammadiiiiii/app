/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWEdge — Main custom edge for React Flow (90° orthogonal)   ║
 * ║  Reads ELK route points from edge.data.routePoints           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useMemo, useCallback } from "react";
import {
  type EdgeProps,
  EdgeLabelRenderer,
  getStraightPath,
} from "@xyflow/react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import { msFormatTokenAmount } from "@/lib/onchain/cwtracker-types";
import {
  routeToRoundedPath,
  computeArrowPoints,
  formatTimestamp,
} from "./edge-utils";
import { getEdgeEntityColor } from "./node-shapes";
import { EDGE_WIDTH, LABEL_W, LABEL_H, ARROW_SIZE, ANIMATED_DOT_COLOR } from "./constants";
import { markerUrlForEdge, SELECTED_MARKER_URL } from "./EdgeMarkerDefs";
import EdgeActionBar from "./EdgeActionBar";

/* ─────────── edge data type ─────────── */

export interface CWEdgeData {
  /** ELK-computed route points (start + bends + end) */
  routePoints?: { x: number; y: number }[];
  /** Original MSEdge id */
  msEdgeId: string;
  /** Edge color (custom or entity-based) */
  color?: string;
  /** Custom width */
  customWidth?: number;
  /** Custom dash: "solid" | "dashed" | "dotted" */
  customDash?: "solid" | "dashed" | "dotted";
  /** Cross-chain transfers */
  isCrossChain?: boolean;
  /** Original edge index (ordinal) */
  edgeIndex: number;
  /** Formatted amount */
  amountLabel?: string;
  /** Total value */
  totalValue?: number;
  /** Token symbol */
  tokenSymbol?: string;
  /** Timestamp */
  latestTimestamp?: string;
  /** Target node type for entity color */
  targetType?: string;
  /** Custom arrowhead / marker size */
  customArrowSize?: number;
  /** Edge details */
  details?: { timestamp?: string }[];
  [key: string]: unknown;
}

/* ─────────── component ─────────── */

function CWEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps & { data: CWEdgeData }) {
  /* ── Store ── */
  const hoveredEdgeId = useCWTrackerStore((s) => s.hoveredEdgeId);
  const hoverEdge = useCWTrackerStore((s) => s.hoverEdge);
  const selectEdge = useCWTrackerStore((s) => s.selectEdge);

  const isHovered = hoveredEdgeId === data.msEdgeId;

  /* ── Edge path ── */
  const routePoints = data.routePoints;
  const color = data.color || getEdgeEntityColor(data.targetType || "");
  const baseWidth = data.customWidth ?? EDGE_WIDTH;
  const strokeWidth = isHovered || selected ? baseWidth + 1.5 : baseWidth;

  const dashArray =
    data.customDash === "dashed"
      ? "8,4"
      : data.customDash === "dotted"
        ? "2,4"
        : data.isCrossChain
          ? "5,2"
          : undefined;

  const pathD = useMemo(() => {
    if (routePoints && routePoints.length >= 2) {
      return routeToRoundedPath(routePoints, 8);
    }
    // Fallback: straight line from source to target
    const [d] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    return d;
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Arrowhead ── */
  const arrowPointsStr = useMemo(() => {
    const pts = routePoints && routePoints.length >= 2
      ? routePoints
      : [
          { x: sourceX, y: sourceY },
          { x: targetX, y: targetY },
        ];
    return computeArrowPoints(pts, ARROW_SIZE, ARROW_SIZE / 2.5);
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Label positioning: midpoint of route ── */
  const labelPos = useMemo(() => {
    if (routePoints && routePoints.length >= 2) {
      const mid = Math.floor(routePoints.length / 2);
      return {
        x: routePoints[mid].x,
        y: routePoints[mid].y,
      };
    }
    return {
      x: (sourceX + targetX) / 2,
      y: (sourceY + targetY) / 2,
    };
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Label angle: follow edge direction at midpoint ── */
  const labelAngle = useMemo(() => {
    const pts = routePoints && routePoints.length >= 2
      ? routePoints
      : [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }];
    if (pts.length < 2) return 0;
    const mid = Math.floor(pts.length / 2);
    const p1 = pts[Math.max(0, mid - 1)];
    const p2 = pts[Math.min(pts.length - 1, mid)];
    let deg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    // Clamp to ±90 so text is never upside-down
    if (deg > 90) deg -= 180;
    if (deg < -90) deg += 180;
    return deg;
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Label text ── */
  const ordinalStr = `[${data.edgeIndex + 1}]`;
  const amountStr =
    data.amountLabel ||
    msFormatTokenAmount(data.totalValue ?? 0, data.tokenSymbol ?? "");
  const ts =
    data.latestTimestamp || (data.details?.[0]?.timestamp);
  const dateStr = formatTimestamp(ts);
  const labelText = dateStr ? `[${dateStr}] ${amountStr}` : amountStr;

  /* ── Handlers ── */
  const handleMouseEnter = useCallback(() => hoverEdge(data.msEdgeId), [data.msEdgeId, hoverEdge]);
  const handleMouseLeave = useCallback(() => hoverEdge(null), [hoverEdge]);
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectEdge(data.msEdgeId);
    },
    [data.msEdgeId, selectEdge]
  );

  const activeColor = selected ? "#597ef7" : color;
  const markerEnd = selected
    ? SELECTED_MARKER_URL
    : markerUrlForEdge(data.msEdgeId);

  return (
    <>
      {/* Hit area (wide transparent path for easy clicking) */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, strokeWidth + 10)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      />
      {/* Visible edge */}
      <path
        d={pathD}
        fill="none"
        stroke={activeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        markerEnd={markerEnd}
        className="react-flow__edge-path"
        style={{ pointerEvents: "none" }}
      />
      {/* ★ Animated dot — flow direction indicator */}
      <circle r={Math.max(3.5, strokeWidth)} fill={ANIMATED_DOT_COLOR} opacity={0.75}>
        <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} />
      </circle>
      {/* Arrowhead */}
      {arrowPointsStr && (
        <polygon
          fill={activeColor}
          stroke={activeColor}
          strokeWidth={baseWidth * 0.5}
          points={arrowPointsStr}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Edge label via EdgeLabelRenderer */}
      <EdgeLabelRenderer>
        <div
          className="cw-edge-label nodrag nopan"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute",
            transform: `translate(-50%, -100%) translate(${labelPos.x}px,${labelPos.y - 8}px) rotate(${labelAngle}deg)`,
            pointerEvents: "all",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            userSelect: "none",
            whiteSpace: "nowrap",
            background: "rgba(14,14,14,0.82)",
            padding: "1px 8px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Label text */}
          <span style={{ color, fontWeight: 600 }}>{ordinalStr} </span>
          <span style={{ color: "#fff" }}>{labelText}</span>

          {/* Hover action buttons (shared component) */}
          {(isHovered || selected) && (
            <EdgeActionBar msEdgeId={data.msEdgeId} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CWEdgeComponent);
