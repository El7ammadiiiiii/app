/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AnnotationNode — Free-positioned memo/annotation card       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

export interface AnnotationData {
  annotationId: string;
  text: string;
  color: string;
}

type AnnotationProps = NodeProps & { data: AnnotationData };

function AnnotationNodeComponent({ id, data }: AnnotationProps) {
  const updateAnnotation = useCWTrackerStore((s) => s.updateAnnotation);
  const removeAnnotation = useCWTrackerStore((s) => s.removeAnnotation);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const txt = e.target.textContent?.trim() || "";
      if (txt) {
        updateAnnotation(data.annotationId, { text: txt });
      } else {
        removeAnnotation(data.annotationId);
      }
    },
    [data.annotationId, updateAnnotation, removeAnnotation]
  );

  return (
    <div
      className="cw-annotation-node"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${data.color || "#bd7c40"}`,
        borderRadius: 8,
        padding: "6px 10px",
        minHeight: 32,
        minWidth: 80,
        maxWidth: 200,
        position: "relative",
      }}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        style={{
          color: "#fff",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          outline: "none",
          minHeight: 18,
          wordBreak: "break-word",
        }}
      >
        {data.text}
      </div>
      <button
        onClick={() => removeAnnotation(data.annotationId)}
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#333",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          fontSize: 10,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default memo(AnnotationNodeComponent);
