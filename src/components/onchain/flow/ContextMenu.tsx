/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ContextMenu — Right-click context menu for canvas/nodes      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { memo, useCallback, useRef, useEffect } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

export interface ContextMenuData {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
}

interface ContextMenuProps {
  data: ContextMenuData;
  onClose: () => void;
  onAddAnnotation?: (x: number, y: number) => void;
}

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
  isDanger?: boolean;
  dividerAfter?: boolean;
}

function ContextMenuComponent({ data, onClose, onAddAnnotation }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  const copyNode = useCWTrackerStore((s) => s.copyNode);
  const pasteNode = useCWTrackerStore((s) => s.pasteNode);
  const removeNode = useCWTrackerStore((s) => s.removeNode);
  const removeEdge = useCWTrackerStore((s) => s.removeEdge);
  const selectNode = useCWTrackerStore((s) => s.selectNode);
  const selectEdge = useCWTrackerStore((s) => s.selectEdge);
  const openEdgeStylePicker = useCWTrackerStore((s) => s.openEdgeStylePicker);
  const addAnnotation = useCWTrackerStore((s) => s.addAnnotation);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const items: MenuItem[] = [];

  if (data.nodeId) {
    items.push(
      {
        label: "Select Node",
        icon: "◎",
        action: () => {
          selectNode(data.nodeId!);
          onClose();
        },
      },
      {
        label: "Copy Node",
        icon: "⧉",
        action: () => {
          copyNode(data.nodeId!);
          onClose();
        },
      },
      {
        label: "Style",
        icon: "◐",
        action: () => {
          selectNode(data.nodeId!);
          // Will open node style picker via the existing UI
          onClose();
        },
        dividerAfter: true,
      },
      {
        label: "Delete Node",
        icon: "✕",
        action: () => {
          removeNode(data.nodeId!);
          onClose();
        },
        isDanger: true,
      }
    );
  } else if (data.edgeId) {
    items.push(
      {
        label: "Select Edge",
        icon: "◎",
        action: () => {
          selectEdge(data.edgeId!);
          onClose();
        },
      },
      {
        label: "Edge Style",
        icon: "◐",
        action: () => {
          openEdgeStylePicker(data.edgeId!);
          onClose();
        },
        dividerAfter: true,
      },
      {
        label: "Delete Edge",
        icon: "✕",
        action: () => {
          removeEdge(data.edgeId!);
          onClose();
        },
        isDanger: true,
      }
    );
  } else {
    // Canvas context menu
    items.push(
      {
        label: "Paste Node",
        icon: "⧉",
        action: () => {
          pasteNode(data.x, data.y);
          onClose();
        },
      },
      {
        label: "Add Memo",
        icon: "📝",
        action: () => {
          if (onAddAnnotation) {
            onAddAnnotation(data.x, data.y);
          } else {
            addAnnotation({ x: data.x, y: data.y, text: "Note…", color: "#bd7c40" });
          }
          onClose();
        },
        dividerAfter: true,
      },
      {
        label: "Fit View",
        icon: "⊞",
        action: () => {
          useCWTrackerStore.getState().fitToView();
          onClose();
        },
      }
    );
  }

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: data.x,
        top: data.y,
        zIndex: 10000,
        background: "#1f1f1f",
        border: "1px solid #333",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        padding: "4px 0",
        minWidth: 160,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <button
            onClick={item.action}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: item.isDanger ? "#ff4d4f" : "#ddd",
              cursor: "pointer",
              fontSize: 12,
              textAlign: "left",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#333";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ width: 16, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
          {item.dividerAfter && (
            <div
              style={{
                height: 1,
                background: "#333",
                margin: "2px 8px",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default memo(ContextMenuComponent);
