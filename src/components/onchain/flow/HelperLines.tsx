/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HelperLines — Snap-alignment visual guides during drag       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo } from "react";
import { useStore as useReactFlowStore } from "@xyflow/react";

interface HelperLinesProps {
  horizontal?: number | null;
  vertical?: number | null;
}

/**
 * Draws thin dashed helper lines across the entire viewport when
 * a node is being dragged and its position aligns with another node.
 */
function HelperLinesComponent({ horizontal, vertical }: HelperLinesProps) {
  const transform = useReactFlowStore((s) => s.transform);
  const width = useReactFlowStore((s) => s.width);
  const height = useReactFlowStore((s) => s.height);

  if (horizontal == null && vertical == null) return null;

  const [tx, ty, zoom] = transform;

  return (
    <svg
      className="cw-helper-lines"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {horizontal != null && (
        <line
          x1={0}
          y1={horizontal * zoom + ty}
          x2={width}
          y2={horizontal * zoom + ty}
          stroke="#597ef7"
          strokeWidth={1}
          strokeDasharray="4 3"
          strokeOpacity={0.6}
        />
      )}
      {vertical != null && (
        <line
          x1={vertical * zoom + tx}
          y1={0}
          x2={vertical * zoom + tx}
          y2={height}
          stroke="#597ef7"
          strokeWidth={1}
          strokeDasharray="4 3"
          strokeOpacity={0.6}
        />
      )}
    </svg>
  );
}

/* ─── Alignment detection helpers ─── */

interface NodeRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Given the node being dragged and all other nodes, return
 * the nearest horizontal and vertical alignment lines (within threshold).
 */
export function getHelperLines(
  dragged: NodeRect,
  nodes: NodeRect[],
  threshold = 5
): { horizontal: number | null; vertical: number | null; snapX: number; snapY: number } {
  let horizontal: number | null = null;
  let vertical: number | null = null;
  let snapX = dragged.x;
  let snapY = dragged.y;
  let minDH = threshold;
  let minDV = threshold;

  const dCX = dragged.x + dragged.width / 2;
  const dCY = dragged.y + dragged.height / 2;

  for (const n of nodes) {
    if (n.id === dragged.id) continue;

    const nCX = n.x + n.width / 2;
    const nCY = n.y + n.height / 2;

    // Horizontal alignment (center Y match)
    const dh = Math.abs(dCY - nCY);
    if (dh < minDH) {
      minDH = dh;
      horizontal = nCY;
      snapY = nCY - dragged.height / 2;
    }

    // Top alignment
    const dht = Math.abs(dragged.y - n.y);
    if (dht < minDH) {
      minDH = dht;
      horizontal = n.y + n.height / 2;
      snapY = n.y;
    }

    // Vertical alignment (center X match)
    const dv = Math.abs(dCX - nCX);
    if (dv < minDV) {
      minDV = dv;
      vertical = nCX;
      snapX = nCX - dragged.width / 2;
    }

    // Left alignment
    const dvl = Math.abs(dragged.x - n.x);
    if (dvl < minDV) {
      minDV = dvl;
      vertical = n.x + n.width / 2;
      snapX = n.x;
    }
  }

  return { horizontal, vertical, snapX, snapY };
}

export default memo(HelperLinesComponent);
