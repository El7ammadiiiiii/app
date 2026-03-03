/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSEdgeStylePicker — CWTracker edge/node style controls      ║
 * ║  Context-aware: shows node controls when node selected,       ║
 * ║  edge controls when edge selected, global when neither.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useCallback } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";

/* ── Color palette (CWTracker-parity) ── */
const PALETTE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#64748b",
  "#ffffff", "#b5b4b2", "#bd7c40", "#335cd2",
];

/* ── Line style options ── */
const LINE_STYLES: { value: "solid" | "dashed" | "dotted"; label: string; svg: React.ReactNode }[] = [
  {
    value: "solid",
    label: "Solid",
    svg: (
      <svg width="20" height="10" viewBox="0 0 20 10">
        <line x1="0" y1="5" x2="20" y2="5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: "dashed",
    label: "Dashed",
    svg: (
      <svg width="20" height="10" viewBox="0 0 20 10">
        <line x1="0" y1="5" x2="20" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="4,3" />
      </svg>
    ),
  },
  {
    value: "dotted",
    label: "Dotted",
    svg: (
      <svg width="20" height="10" viewBox="0 0 20 10">
        <line x1="0" y1="5" x2="20" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="1,3" />
      </svg>
    ),
  },
];

/* ── Node shape options ── */
type NodeShape = "rect" | "rect_no_r" | "ellipse" | "diamond" | "pentagon" | "house" | "box3d" | "doubleoctagon";
const NODE_SHAPES: { value: NodeShape; label: string; svg: React.ReactNode }[] = [
  {
    value: "rect",
    label: "Rounded Rect",
    svg: <svg width="22" height="16" viewBox="0 0 22 16"><rect x="1" y="1" width="20" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    value: "rect_no_r",
    label: "Rectangle",
    svg: <svg width="22" height="16" viewBox="0 0 22 16"><rect x="1" y="1" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    value: "ellipse",
    label: "Ellipse",
    svg: <svg width="22" height="16" viewBox="0 0 22 16"><ellipse cx="11" cy="8" rx="10" ry="7" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    value: "diamond",
    label: "Diamond",
    svg: <svg width="22" height="16" viewBox="0 0 22 16"><polygon points="11,1 21,8 11,15 1,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    value: "pentagon",
    label: "Pentagon",
    svg: <svg width="22" height="16" viewBox="0 0 22 16"><polygon points="11,1 21,6 17,15 5,15 1,6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    value: "house",
    label: "House",
    svg: <svg width="22" height="16" viewBox="0 0 22 16"><polygon points="11,1 21,7 21,15 1,15 1,7" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    value: "box3d",
    label: "3D Box",
    svg: (
      <svg width="22" height="16" viewBox="0 0 22 16">
        <polygon points="3,3 17,3 19,1 19,13 17,15 3,15" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="17" y1="3" x2="17" y2="15" stroke="currentColor" strokeWidth="1" />
        <line x1="3" y1="3" x2="19" y2="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    value: "doubleoctagon",
    label: "Double Octagon",
    svg: (
      <svg width="22" height="16" viewBox="0 0 22 16">
        <polygon points="6,1 16,1 21,5 21,11 16,15 6,15 1,11 1,5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="7,3 15,3 19,6 19,10 15,13 7,13 3,10 3,6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      </svg>
    ),
  },
];

export function MSEdgeStylePicker() {
  const edgeStyleEdgeId = useCWTrackerStore((s) => s.edgeStyleEdgeId);
  const closeEdgeStylePicker = useCWTrackerStore((s) => s.closeEdgeStylePicker);
  const updateEdge = useCWTrackerStore((s) => s.updateEdge);
  const updateNode = useCWTrackerStore((s) => s.updateNode);
  const edges = useCWTrackerStore((s) => s.edges);
  const nodes = useCWTrackerStore((s) => s.nodes);
  const selectedNodeId = useCWTrackerStore((s) => s.selectedNodeId);
  const edgeRoutingMode = useCWTrackerStore((s) => s.edgeRoutingMode);
  const setEdgeRoutingMode = useCWTrackerStore((s) => s.setEdgeRoutingMode);
  const snapToGrid = useCWTrackerStore((s) => s.snapToGrid);
  const setSnapToGrid = useCWTrackerStore((s) => s.setSnapToGrid);
  const toggleMinimap = useCWTrackerStore((s) => s.toggleMinimap);
  const showMinimap = useCWTrackerStore((s) => s.showMinimap);

  // Determine context: node selected? edge selected? or global?
  const isNodeContext = !!selectedNodeId && edgeStyleEdgeId === "__global__";
  const isEdgeContext = !!edgeStyleEdgeId && edgeStyleEdgeId !== "__global__";
  const isGlobalContext = edgeStyleEdgeId === "__global__" && !selectedNodeId;

  const selectedNode = isNodeContext ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = isEdgeContext ? edges.find((e) => e.id === edgeStyleEdgeId) : null;

  /* ── Edge color handler — selected edge only ── */
  const handleEdgeColorChange = useCallback(
    (color: string) => {
      if (isEdgeContext && edgeStyleEdgeId) {
        updateEdge(edgeStyleEdgeId, { customColor: color });
      } else {
        for (const e of edges) {
          updateEdge(e.id, { customColor: color });
        }
      }
    },
    [isEdgeContext, edgeStyleEdgeId, edges, updateEdge]
  );

  /* ── Edge dash handler — selected edge only ── */
  const handleDashChange = useCallback(
    (dash: "solid" | "dashed" | "dotted") => {
      if (isEdgeContext && edgeStyleEdgeId) {
        updateEdge(edgeStyleEdgeId, { customDash: dash });
      } else {
        for (const e of edges) {
          updateEdge(e.id, { customDash: dash });
        }
      }
    },
    [isEdgeContext, edgeStyleEdgeId, edges, updateEdge]
  );

  /* ── Node color handler ── */
  const handleNodeColorChange = useCallback(
    (color: string) => {
      if (selectedNodeId) {
        updateNode(selectedNodeId, { customColor: color });
      }
    },
    [selectedNodeId, updateNode]
  );

  /* ── Node text color handler ── */
  const handleNodeTextColorChange = useCallback(
    (color: string) => {
      if (selectedNodeId) {
        updateNode(selectedNodeId, { customTextColor: color });
      }
    },
    [selectedNodeId, updateNode]
  );

  /* ── Node shape handler ── */
  const handleNodeShapeChange = useCallback(
    (shape: NodeShape) => {
      if (selectedNodeId) {
        updateNode(selectedNodeId, { customShape: shape });
      }
    },
    [selectedNodeId, updateNode]
  );

  /* ── Edge width handler — selected edge only ── */
  const handleWidthChange = useCallback(
    (width: number) => {
      const clamped = Math.max(2, Math.min(15, width));
      if (isEdgeContext && edgeStyleEdgeId) {
        updateEdge(edgeStyleEdgeId, { customWidth: clamped });
      } else {
        for (const e of edges) {
          updateEdge(e.id, { customWidth: clamped });
        }
      }
    },
    [isEdgeContext, edgeStyleEdgeId, edges, updateEdge]
  );

  /* ── Arrow size handler ── */
  const handleArrowSizeChange = useCallback(
    (size: number) => {
      const clamped = Math.max(6, Math.min(24, size));
      if (isEdgeContext && edgeStyleEdgeId) {
        updateEdge(edgeStyleEdgeId, { customArrowSize: clamped });
      } else {
        for (const e of edges) {
          updateEdge(e.id, { customArrowSize: clamped });
        }
      }
    },
    [isEdgeContext, edgeStyleEdgeId, edges, updateEdge]
  );

  /* ── Edge routing mode handler (per-edge aware) ── */
  const handleEdgeRoutingChange = useCallback(
    (mode: string) => {
      const modeToEdgeType: Record<string, string> = {
        orthogonal: "default",
        smoothstep: "smooth",
        straight: "straight",
        bezier: "animated",
        animatedSvg: "animatedSvg",
      };
      if (isEdgeContext && edgeStyleEdgeId) {
        // Apply to this edge only
        updateEdge(edgeStyleEdgeId, { edgeType: modeToEdgeType[mode] as any });
      } else {
        // Apply globally
        setEdgeRoutingMode(mode as any);
      }
    },
    [isEdgeContext, edgeStyleEdgeId, updateEdge, setEdgeRoutingMode]
  );

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    if (isNodeContext && selectedNodeId) {
      updateNode(selectedNodeId, { customColor: undefined, customTextColor: undefined, customShape: undefined });
    } else if (isEdgeContext && edgeStyleEdgeId) {
      updateEdge(edgeStyleEdgeId, { customColor: undefined, customDash: undefined, customWidth: undefined, customArrowSize: undefined, edgeType: undefined });
    } else {
      for (const e of edges) {
        updateEdge(e.id, { customColor: undefined, customDash: undefined, customWidth: undefined, customArrowSize: undefined });
      }
    }
  }, [isNodeContext, isEdgeContext, selectedNodeId, edgeStyleEdgeId, edges, updateEdge, updateNode]);

  if (!edgeStyleEdgeId) return null;

  const currentEdgeDash = selectedEdge?.customDash || "solid";
  const currentEdgeColor = selectedEdge?.customColor || "";
  const currentEdgeWidth = selectedEdge?.customWidth ?? 3;
  const currentArrowSize = selectedEdge?.customArrowSize ?? 12;
  const currentNodeColor = selectedNode?.customColor || "";
  const currentNodeTextColor = selectedNode?.customTextColor || "";
  const currentNodeShape = selectedNode?.customShape || "rect";

  const title = isNodeContext
    ? "Node Style"
    : isEdgeContext
    ? "Edge Style"
    : "Global Style";

  return (
    <div className="index_styleControls__dOfSS">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white font-medium">{title}</span>
        <button
          onClick={closeEdgeStylePicker}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ═══ NODE CONTEXT: Node Color + Text Color + Shape ═══ */}
      {isNodeContext && (
        <>
          {/* Node Background Color */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Node Color</div>
            <div className="grid grid-cols-5 gap-1.5">
              {PALETTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleNodeColorChange(color)}
                  className={`w-6 h-6 rounded-sm border transition-all ${
                    currentNodeColor === color
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Text Color</div>
            <div className="grid grid-cols-5 gap-1.5">
              {PALETTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleNodeTextColorChange(color)}
                  className={`w-6 h-6 rounded-sm border transition-all ${
                    currentNodeTextColor === color
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Node Shape */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Shape</div>
            <div className="grid grid-cols-4 gap-1.5">
              {NODE_SHAPES.map((shape) => (
                <button
                  key={shape.value}
                  onClick={() => handleNodeShapeChange(shape.value)}
                  className={`flex items-center justify-center h-8 rounded border transition-colors ${
                    currentNodeShape === shape.value
                      ? "border-[var(--default-color)] bg-[var(--action-hover)] text-[var(--default-color)]"
                      : "border-[var(--default-border-color)] text-[var(--desc-color)] hover:text-white hover:border-white/30"
                  }`}
                  title={shape.label}
                >
                  {shape.svg}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ EDGE / GLOBAL CONTEXT: Color + Line Style ═══ */}
      {(isEdgeContext || isGlobalContext) && (
        <>
          {/* Edge Routing Mode */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Edge Routing</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                  { mode: "orthogonal", label: "90°" },
                  { mode: "smoothstep", label: "Curve" },
                  { mode: "straight", label: "Line" },
                  { mode: "bezier", label: "Flow" },
                  { mode: "animatedSvg", label: "SVG" },
                ]).map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => handleEdgeRoutingChange(opt.mode)}
                  className={`flex items-center justify-center px-2 h-7 rounded border text-xs transition-colors ${
                    edgeRoutingMode === opt.mode
                      ? "border-[var(--default-color)] bg-[var(--action-hover)] text-[var(--default-color)]"
                      : "border-[var(--default-border-color)] text-[var(--desc-color)] hover:text-white hover:border-white/30"
                  }`}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Settings */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Canvas</div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[10px] text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="accent-[var(--default-color)]"
                />
                Snap
              </label>
              <label className="flex items-center gap-1 text-[10px] text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMinimap}
                  onChange={() => toggleMinimap()}
                  className="accent-[var(--default-color)]"
                />
                Minimap
              </label>
            </div>
          </div>

          {/* Color Palette */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Color</div>
            <div className="grid grid-cols-5 gap-1.5">
              {PALETTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleEdgeColorChange(color)}
                  className={`w-6 h-6 rounded-sm border transition-all ${
                    currentEdgeColor === color
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Line Style */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Line Style</div>
            <div className="flex items-center gap-1.5">
              {LINE_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => handleDashChange(style.value)}
                  className={`flex items-center justify-center w-9 h-7 rounded border transition-colors ${
                    currentEdgeDash === style.value
                      ? "border-[var(--default-color)] bg-[var(--action-hover)] text-[var(--default-color)]"
                      : "border-[var(--default-border-color)] text-[var(--desc-color)] hover:text-white hover:border-white/30"
                  }`}
                  title={style.label}
                >
                  {style.svg}
                </button>
              ))}
            </div>
          </div>

          {/* Edge Width */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Width</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={15}
                step={1}
                value={currentEdgeWidth}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-14 h-7 text-center text-xs text-white bg-white/10 border border-white/15 rounded focus:border-[var(--default-color)] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <input
                type="range"
                min={2}
                max={15}
                step={1}
                value={currentEdgeWidth}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="flex-1 h-1 accent-[var(--default-color)] cursor-pointer"
              />
              <span className="text-[10px] text-white/60 min-w-[20px] text-right">{currentEdgeWidth}px</span>
            </div>
          </div>

          {/* Arrow Size */}
          <div className="mb-3">
            <div className="text-[10px] text-white/70 mb-1.5">Arrow Size</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={6}
                max={24}
                step={1}
                value={currentArrowSize}
                onChange={(e) => handleArrowSizeChange(Number(e.target.value))}
                className="w-14 h-7 text-center text-xs text-white bg-white/10 border border-white/15 rounded focus:border-[var(--default-color)] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <input
                type="range"
                min={6}
                max={24}
                step={1}
                value={currentArrowSize}
                onChange={(e) => handleArrowSizeChange(Number(e.target.value))}
                className="flex-1 h-1 accent-[var(--default-color)] cursor-pointer"
              />
              <span className="text-[10px] text-white/60 min-w-[20px] text-right">{currentArrowSize}px</span>
            </div>
          </div>
        </>
      )}

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="w-full text-center text-[10px] text-[var(--default-color)] hover:text-white py-1 rounded border border-[var(--default-border-color)] hover:border-[var(--default-color)] transition-colors"
      >
        Reset to default
      </button>
    </div>
  );
}
