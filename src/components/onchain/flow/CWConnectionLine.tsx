/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWConnectionLine — Temporary line while drawing a new edge  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo } from "react";
import type { ConnectionLineComponentProps } from "@xyflow/react";

function CWConnectionLineComponent({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  return (
    <g>
      {/* Glow */}
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="#597ef7"
        strokeWidth={4}
        strokeOpacity={0.3}
        strokeLinecap="round"
      />
      {/* Main line */}
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="#597ef7"
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeLinecap="round"
        style={{
          animation: "cwFlowDash 0.8s linear infinite",
        }}
      />
      {/* Target circle */}
      <circle
        cx={toX}
        cy={toY}
        r={4}
        fill="#597ef7"
        stroke="#fff"
        strokeWidth={1}
      />
    </g>
  );
}

export default memo(CWConnectionLineComponent);
