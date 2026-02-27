/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWGroupNode — Collapsible group node for target zones       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { MS_COLORS } from "./constants";

export interface CWGroupData {
  label: string;
  color?: string;
}

type CWGroupProps = NodeProps & { data: CWGroupData };

function CWGroupNodeComponent({ data, selected }: CWGroupProps) {
  return (
    <div
      className="cw-group-node"
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 10,
        border: `1px dashed ${data.color || "rgba(189,124,64,0.2)"}`,
        background: "transparent",
        position: "relative",
        pointerEvents: "none",
      }}
    >
      {data.label && (
        <div
          style={{
            position: "absolute",
            top: -20,
            left: 8,
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "Inter, sans-serif",
            pointerEvents: "none",
          }}
        >
          {data.label}
        </div>
      )}
    </div>
  );
}

export default memo(CWGroupNodeComponent);
