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
  computeMidArrow,
  formatTimestamp,
} from "./edge-utils";
import { getEdgeEntityColor } from "./node-shapes";
import { EDGE_WIDTH } from "./constants";
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
  /** Source node type for entity color */
  sourceType?: string;
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
  const color = data.color || getEdgeEntityColor(data.sourceType || "", data.targetType || "");
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

  /* ── Mid-edge directional arrow ── */
  const midArrow = useMemo(() => {
    const pts = routePoints && routePoints.length >= 2
      ? routePoints
      : [
          { x: sourceX, y: sourceY },
          { x: targetX, y: targetY },
        ];
    return computeMidArrow(pts);
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

  /* ── Label text — split into date and value ── */
  const amountStr =
    data.amountLabel ||
    msFormatTokenAmount(data.totalValue ?? 0, data.tokenSymbol ?? "");
  const ts =
    data.latestTimestamp || (data.details?.[0]?.timestamp);
  const dateStr = formatTimestamp(ts);

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
  const dimmed = hoveredEdgeId != null && hoveredEdgeId !== data.msEdgeId && !isHovered;

  return (
    <g opacity={dimmed ? 0.12 : 1} style={{ transition: "opacity 0.2s ease" }}>
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
        className="react-flow__edge-path"
        style={{ pointerEvents: "none" }}
      />
      {/* ★ 3 animated flowing balls — source → target */}
      {[0, 0.8, 1.6].map((delay, i) => (
        <circle
          key={i}
          r={3}
          fill={activeColor}
          opacity={[0.9, 0.7, 0.5][i]}
        >
          <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin={`${delay}s`} />
        </circle>
      ))}
      {/* ★ Mid-edge directional arrow */}
      {midArrow && (
        <polygon
          points="-6,-4 6,0 -6,4"
          fill={activeColor}
          transform={`translate(${midArrow.mx},${midArrow.my}) rotate(${midArrow.angle})`}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Edge labels — date above, value below */}
      <EdgeLabelRenderer>
        <div
          className="cw-edge-label nodrag nopan"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelPos.x}px,${labelPos.y}px) rotate(${labelAngle}deg)`,
            pointerEvents: "all",
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            userSelect: "none",
            whiteSpace: "nowrap",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          {/* Date/time — above edge */}
          {dateStr && (
            <span style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 10,
              background: "rgba(14,14,14,0.82)",
              padding: "0px 6px",
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {dateStr}
            </span>
          )}
          {/* Value — below edge */}
          <span style={{
            color: "#22c55e",
            fontWeight: 600,
            fontSize: 11,
            background: "rgba(14,14,14,0.82)",
            padding: "0px 6px",
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            → {amountStr}
          </span>

          {/* Hover action buttons (shared component) */}
          {(isHovered || selected) && (
            <EdgeActionBar msEdgeId={data.msEdgeId} />
          )}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

export default memo(CWEdgeComponent);
