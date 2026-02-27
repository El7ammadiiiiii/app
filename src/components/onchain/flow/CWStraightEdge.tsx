/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWStraightEdge — Simple straight-line edge                   ║
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
import { computeArrowPoints } from "./edge-utils";
import { getEdgeEntityColor } from "./node-shapes";
import { EDGE_WIDTH, ARROW_SIZE, ANIMATED_DOT_COLOR } from "./constants";
import { markerUrlForEdge, SELECTED_MARKER_URL } from "./EdgeMarkerDefs";
import EdgeActionBar from "./EdgeActionBar";

import type { CWEdgeData } from "./CWEdge";

function CWStraightEdgeComponent({
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

  const [pathD, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const arrowPointsStr = useMemo(() => {
    return computeArrowPoints(
      [
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
      ],
      ARROW_SIZE,
      ARROW_SIZE / 2.5
    );
  }, [sourceX, sourceY, targetX, targetY]);

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
  const markerEnd = selected
    ? SELECTED_MARKER_URL
    : markerUrlForEdge(data.msEdgeId);

  return (
    <>
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
      <EdgeLabelRenderer>
        <div
          className="cw-edge-label nodrag nopan"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute",
            transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 8}px)`,
            pointerEvents: "all",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color, fontWeight: 600 }}>{ordinalStr} </span>
          <span style={{ color: "#fff" }}>{amountStr}</span>

          {/* Hover action buttons */}
          {(isHovered || selected) && (
            <EdgeActionBar msEdgeId={data.msEdgeId} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CWStraightEdgeComponent);
