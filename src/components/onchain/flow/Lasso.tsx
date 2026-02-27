/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Lasso — Freehand lasso selection for React Flow canvas      ║
 * ║  Draw a freehand shape to select nodes inside it             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useRef, useState, useCallback, type PointerEvent } from "react";
import {
  useReactFlow,
  useViewport,
  useStoreApi,
  type Node,
} from "@xyflow/react";
import { pointsToPath } from "./path-utils";
import { NODE_W, NODE_H, ANIMATED_DOT_COLOR } from "./constants";

/* ─────────── geometry helpers ─────────── */

/** Point-in-polygon test (ray-casting algorithm) */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if a rectangle (node) is fully inside the polygon */
function rectFullyInsidePolygon(
  x: number, y: number, w: number, h: number,
  polygon: [number, number][]
): boolean {
  return (
    pointInPolygon(x, y, polygon) &&
    pointInPolygon(x + w, y, polygon) &&
    pointInPolygon(x, y + h, polygon) &&
    pointInPolygon(x + w, y + h, polygon)
  );
}

/** Check if a rectangle partially overlaps the polygon (any corner inside) */
function rectPartiallyInsidePolygon(
  x: number, y: number, w: number, h: number,
  polygon: [number, number][]
): boolean {
  return (
    pointInPolygon(x, y, polygon) ||
    pointInPolygon(x + w, y, polygon) ||
    pointInPolygon(x, y + h, polygon) ||
    pointInPolygon(x + w, y + h, polygon) ||
    pointInPolygon(x + w / 2, y + h / 2, polygon)
  );
}

/* ─────────── Lasso component ─────────── */

interface LassoProps {
  /** When true, nodes are selected if any part overlaps the lasso; otherwise must be fully inside */
  partial?: boolean;
}

export function Lasso({ partial = false }: LassoProps) {
  const storeApi = useStoreApi();
  const { screenToFlowPosition } = useReactFlow();
  const viewport = useViewport();

  const [isDrawing, setIsDrawing] = useState(false);
  const [svgPath, setSvgPath] = useState("");
  const pointsRef = useRef<[number, number, number][]>([]);
  const flowPointsRef = useRef<[number, number][]>([]);

  const handlePointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      // Only primary button
      if (e.button !== 0) return;
      // Don't intercept clicks on nodes / edges / controls
      const target = e.target as HTMLElement;
      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__edge") ||
        target.closest(".react-flow__controls") ||
        target.closest(".react-flow__panel") ||
        target.closest(".react-flow__minimap")
      ) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      pointsRef.current = [[e.clientX, e.clientY, e.pressure]];
      flowPointsRef.current = [];

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      flowPointsRef.current.push([flowPos.x, flowPos.y]);

      setSvgPath(pointsToPath([[e.clientX, e.clientY, e.pressure]], viewport.zoom));
    },
    [screenToFlowPosition, viewport.zoom],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (!isDrawing) return;

      pointsRef.current.push([e.clientX, e.clientY, e.pressure]);
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      flowPointsRef.current.push([flowPos.x, flowPos.y]);

      setSvgPath(pointsToPath(pointsRef.current, viewport.zoom));
    },
    [isDrawing, screenToFlowPosition, viewport.zoom],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setSvgPath("");

    const polygon = flowPointsRef.current;
    if (polygon.length < 3) return;

    // Get all nodes from the React Flow store
    const { nodeLookup, triggerNodeChanges } = storeApi.getState();
    const nodes: Node[] = Array.from(nodeLookup.values());

    const changes = nodes.map((node) => {
      const x = node.position.x;
      const y = node.position.y;
      const w = (node as any).measured?.width ?? (node as any).width ?? NODE_W;
      const h = (node as any).measured?.height ?? (node as any).height ?? NODE_H;

      const isInside = partial
        ? rectPartiallyInsidePolygon(x, y, w, h, polygon)
        : rectFullyInsidePolygon(x, y, w, h, polygon);

      return {
        id: node.id,
        type: "select" as const,
        selected: isInside,
      };
    });

    triggerNodeChanges(changes);
    pointsRef.current = [];
    flowPointsRef.current = [];
  }, [isDrawing, partial, storeApi]);

  return (
    <svg
      className="react-flow__lasso-svg"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 4,
        cursor: "crosshair",
        touchAction: "none",
      }}
    >
      {svgPath && (
        <path
          d={svgPath}
          fill={`${ANIMATED_DOT_COLOR}22`}
          stroke={ANIMATED_DOT_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        />
      )}
    </svg>
  );
}

export default Lasso;
