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
import { routeToRoundedPath, computeMidArrow, formatTimestamp } from "./edge-utils";
import { getEdgeEntityColor } from "./node-shapes";
import { EDGE_WIDTH } from "./constants";
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
  const color = data.color || getEdgeEntityColor(data.sourceType || "", data.targetType || "");
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

  /* ── Mid-edge directional arrow ── */
  const midArrow = useMemo(() => {
    const pts =
      routePoints && routePoints.length >= 2
        ? routePoints
        : [
            { x: sourceX, y: sourceY },
            { x: targetX, y: targetY },
          ];
    return computeMidArrow(pts);
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  /* ── Label position ── */
  const labelPos = useMemo(() => {
    if (routePoints && routePoints.length >= 2) {
      const mid = Math.floor(routePoints.length / 2);
      return { x: routePoints[mid].x, y: routePoints[mid].y };
    }
    return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
  }, [routePoints, sourceX, sourceY, targetX, targetY]);

  const amountStr =
    data.amountLabel ||
    msFormatTokenAmount(data.totalValue ?? 0, data.tokenSymbol ?? "");
  const ts =
    data.latestTimestamp || (data.details?.[0]?.timestamp);
  const dateStr = formatTimestamp(ts);

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
        style={{ pointerEvents: "none" }}
      />
      {/* ★ 3 animated flowing balls — source → target */}
      {[0, 0.8, 1.6].map((delay, i) => (
        <circle key={i} r={3} fill={activeColor} opacity={[0.9, 0.7, 0.5][i]}>
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
            transform: `translate(-50%, -50%) translate(${labelPos.x}px,${labelPos.y}px)`,
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

          {/* Hover action buttons */}
          {(isHovered || selected) && (
            <EdgeActionBar msEdgeId={data.msEdgeId} />
          )}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

export default memo(CWAnimatedEdgeComponent);
