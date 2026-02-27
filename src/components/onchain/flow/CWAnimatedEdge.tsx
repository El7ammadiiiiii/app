/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWAnimatedEdge — Animated edge with SVG <animateMotion> dot ║
 * ║  Uses circles that follow the edge path indefinitely         ║
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
import { routeToRoundedPath, computeArrowPoints } from "./edge-utils";
import { getEdgeEntityColor } from "./node-shapes";
import { EDGE_WIDTH, ARROW_SIZE, ANIMATED_DOT_COLOR } from "./constants";
import { markerUrlForEdge, SELECTED_MARKER_URL } from "./EdgeMarkerDefs";
import EdgeActionBar from "./EdgeActionBar";

import type { CWEdgeData } from "./CWEdge";

/* ─────────── component ─────────── */

function CWAnimatedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps & { data: CWEdgeData }) {
  const hoveredEdgeId = useCWTrackerStore((s) => s.hoveredEdgeId);
  const hoverEdge = useCWTrackerStore((s) => s.hoverEdge);
  const selectEdge = useCWTrackerStore((s) => s.selectEdge);

  const isHovered = hoveredEdgeId === data.msEdgeId;

  const routePoints = data.routePoints;
  const color = data.color || getEdgeEntityColor(data.targetType || "");
  const baseWidth = data.customWidth ?? EDGE_WIDTH;
  const strokeWidth = isHovered || selected ? baseWidth + 1.5 : baseWidth;

  /* ── Edge path ── */
  const pathD = useMemo(() => {
    if (routePoints && routePoints.length >= 2) {
      return routeToRoundedPath(routePoints, 8);
    }
    const [d] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    return d;
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Arrowhead ── */
  const arrowPointsStr = useMemo(() => {
    const pts =
      routePoints && routePoints.length >= 2
        ? routePoints
        : [
            { x: sourceX, y: sourceY },
            { x: targetX, y: targetY },
          ];
    return computeArrowPoints(pts, ARROW_SIZE, ARROW_SIZE / 2.5);
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Label position ── */
  const labelPos = useMemo(() => {
    if (routePoints && routePoints.length >= 2) {
      const mid = Math.floor(routePoints.length / 2);
      return { x: routePoints[mid].x, y: routePoints[mid].y };
    }
    return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  const ordinalStr = `[${data.edgeIndex + 1}]`;
  const amountStr =
    data.amountLabel ||
    msFormatTokenAmount(data.totalValue ?? 0, data.tokenSymbol ?? "");

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
  const dotRadius = Math.max(5, strokeWidth * 1.5);
  const markerEnd = selected
    ? SELECTED_MARKER_URL
    : markerUrlForEdge(data.msEdgeId);

  return (
    <>
      {/* Hit area */}
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

      {/* Base edge (semi-transparent) */}
      <path
        d={pathD}
        fill="none"
        stroke={activeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={0.4}
        markerEnd={markerEnd}
        style={{ pointerEvents: "none" }}
      />

      {/* ★ Primary animated dot — SVG <animateMotion> */}
      <circle r={dotRadius} fill={ANIMATED_DOT_COLOR} opacity={0.9}>
        <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
      </circle>
      {/* ★ Trailing dot (smaller, offset) */}
      <circle r={dotRadius * 0.6} fill={ANIMATED_DOT_COLOR} opacity={0.5}>
        <animateMotion dur="2s" repeatCount="indefinite" path={pathD} begin="0.7s" />
      </circle>

      {/* Arrowhead */}
      {arrowPointsStr && (
        <polygon
          fill={activeColor}
          stroke={activeColor}
          strokeWidth={baseWidth * 0.5}
          strokeLinejoin="round"
          points={arrowPointsStr}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Label */}
      <EdgeLabelRenderer>
        <div
          className="cw-edge-label nodrag nopan"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute",
            transform: `translate(-50%, -100%) translate(${labelPos.x}px,${labelPos.y - 8}px)`,
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
          <span style={{ color, fontWeight: 600 }}>{ordinalStr} </span>
          <span style={{ color: "#fff" }}>{amountStr}</span>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: ANIMATED_DOT_COLOR,
              marginLeft: 6,
              verticalAlign: "middle",
            }}
          />

          {/* Hover action buttons */}
          {(isHovered || selected) && (
            <EdgeActionBar msEdgeId={data.msEdgeId} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CWAnimatedEdgeComponent);
