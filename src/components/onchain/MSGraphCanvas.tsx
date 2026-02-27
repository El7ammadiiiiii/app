/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSGraphCanvas — React Flow + ELK powered graph canvas       ║
 * ║  Full replacement of the old SVG canvas with React Flow v12  ║
 * ║  Features: orthogonal/smooth/straight/animated edges,        ║
 * ║  custom nodes, ELK layout, minimap, context menu,            ║
 * ║  helper lines, snap-to-grid, keyboard shortcuts              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import type { MSNode, MSEdge } from "@/lib/onchain/cwtracker-types";

/* ── Flow components ── */
import CWNode from "./flow/CWNode";
import CWGroupNode from "./flow/CWGroupNode";
import AnnotationNode from "./flow/AnnotationNode";
import CWEdge from "./flow/CWEdge";
import CWAnimatedEdge from "./flow/CWAnimatedEdge";
import CWSmoothEdge from "./flow/CWSmoothEdge";
import CWStraightEdge from "./flow/CWStraightEdge";
import CWAnimatedSVGEdge from "./flow/CWAnimatedSVGEdge";
import CWConnectionLine from "./flow/CWConnectionLine";
import EdgeStyleSwitcher from "./flow/EdgeStyleSwitcher";
import EdgeMarkerDefs from "./flow/EdgeMarkerDefs";
import ContextMenu, { type ContextMenuData } from "./flow/ContextMenu";
import HelperLines, { getHelperLines } from "./flow/HelperLines";
import { useFlowData } from "./flow/use-flow-data";
import { useViewportSync, useFitViewOnCommand } from "./flow/use-viewport-sync";
import { MIN_ZOOM, MAX_ZOOM, SNAP_GRID, NODE_W, NODE_H } from "./flow/constants";
import Lasso from "./flow/Lasso";

/* ── Node types registry (stable reference) ── */
const nodeTypes = {
  cwNode: CWNode,
  cwGroupNode: CWGroupNode,
  annotationNode: AnnotationNode,
};

/* ── Edge types registry (stable reference) ── */
const edgeTypes = {
  cwEdge: CWEdge,
  cwAnimatedEdge: CWAnimatedEdge,
  cwSmoothEdge: CWSmoothEdge,
  cwStraightEdge: CWStraightEdge,
  cwAnimatedSVGEdge: CWAnimatedSVGEdge,
};

/* ── Default edge options ── */
const defaultEdgeOptions = {
  type: "cwEdge",
  animated: false,
};

/* ════════════════════════════════════════════════════════════════
   PROPS
   ════════════════════════════════════════════════════════════════ */

interface MSGraphCanvasProps {
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeExpand?: (nodeId: string) => void;
  onNodeRemove?: (nodeId: string) => void;
}

/* ════════════════════════════════════════════════════════════════
   INNER COMPONENT (needs ReactFlowProvider)
   ════════════════════════════════════════════════════════════════ */

function MSGraphCanvasInner({
  onNodeClick,
  onEdgeClick,
  onNodeExpand,
  onNodeRemove,
}: MSGraphCanvasProps) {
  const reactFlowInstance = useReactFlow();

  /* ── Store selectors ── */
  const storeNodes = useCWTrackerStore((s) => s.nodes);
  const storeEdges = useCWTrackerStore((s) => s.edges);
  const storeAnnotations = useCWTrackerStore((s) => s.annotations);
  const activatedNodeIds = useCWTrackerStore((s) => s.activatedNodeIds);
  const edgeRoutingMode = useCWTrackerStore((s) => s.edgeRoutingMode);
  const edgeRoutes = useCWTrackerStore((s) => s.edgeRoutes);
  const snapToGrid = useCWTrackerStore((s) => s.snapToGrid);
  const showMinimap = useCWTrackerStore((s) => s.showMinimap);
  const bgVariant = useCWTrackerStore((s) => s.bgVariant);
  const isLayouting = useCWTrackerStore((s) => s.isLayouting);
  const controlMode = useCWTrackerStore((s) => s.controlMode);
  const nodeHoverActionsId = useCWTrackerStore((s) => s.nodeHoverActionsId);

  /* ── Lasso state (default OFF → Selection Mode so pan/click work immediately) ── */
  const [isLassoActive, setIsLassoActive] = useState(false);
  const [lassoPartial, setLassoPartial] = useState(false);

  /* Actions */
  const selectNode = useCWTrackerStore((s) => s.selectNode);
  const selectEdge = useCWTrackerStore((s) => s.selectEdge);
  const hoverNode = useCWTrackerStore((s) => s.hoverNode);
  const hoverEdge = useCWTrackerStore((s) => s.hoverEdge);
  const updateNode = useCWTrackerStore((s) => s.updateNode);
  const removeNode = useCWTrackerStore((s) => s.removeNode);
  const addAnnotation = useCWTrackerStore((s) => s.addAnnotation);
  const activateNode = useCWTrackerStore((s) => s.activateNode);
  const addEdges = useCWTrackerStore((s) => s.addEdges);

  /* ── Viewport sync ── */
  const { onViewportChange } = useViewportSync();
  useFitViewOnCommand();

  /* ── Convert store data → React Flow format ── */
  const { flowNodes, flowEdges } = useFlowData(
    storeNodes,
    storeEdges,
    storeAnnotations,
    activatedNodeIds,
    edgeRoutingMode,
    edgeRoutes,
    nodeHoverActionsId
  );

  /* ── Local state ── */
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [helperH, setHelperH] = useState<number | null>(null);
  const [helperV, setHelperV] = useState<number | null>(null);

  /* ── Node changes (dragging, selection, deletion) ── */
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // React Flow manages its own node state for drag; we sync position back to store
      for (const change of changes) {
        if (change.type === "position" && change.position && change.id && !change.id.startsWith("annotation-")) {
          updateNode(change.id, {
            x: change.position.x,
            y: change.position.y,
          });
        }
        if (change.type === "select" && change.id && !change.id.startsWith("annotation-")) {
          selectNode(change.selected ? change.id : null);
        }
        if (change.type === "remove" && change.id) {
          if (change.id.startsWith("annotation-")) {
            const annoId = change.id.replace("annotation-", "");
            useCWTrackerStore.getState().removeAnnotation(annoId);
          } else {
            removeNode(change.id);
            onNodeRemove?.(change.id);
          }
        }
      }
    },
    [updateNode, selectNode, removeNode, onNodeRemove]
  );

  /* ── Edge changes ── */
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "select" && change.id) {
          selectEdge(change.selected ? change.id : null);
        }
        if (change.type === "remove" && change.id) {
          useCWTrackerStore.getState().removeEdge(change.id);
        }
      }
    },
    [selectEdge]
  );

  /* ── New connection (draw-edge mode) ── */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdge: MSEdge = {
        id: `custom_${connection.source}_${connection.target}_${Date.now()}`,
        source: connection.source,
        target: connection.target,
        chain: "",
        direction: "out",
        isCurve: false,
        curveOffset: 0,
        totalValue: 0,
        valueLabel: "",
        tokenSymbol: "",
        transferCount: 0,
        color: "#597ef7",
        isHighlighted: false,
        isSelected: false,
        details: [],
        isSuspicious: false,
        isCrossChain: false,
        isCustom: true,
      };
      addEdges([newEdge]);
    },
    [addEdges]
  );

  /* ── Node click ── */
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id.startsWith("annotation-")) return;
      selectNode(node.id);
      onNodeClick?.(node.id);
    },
    [selectNode, onNodeClick]
  );

  /* ── Edge click ── */
  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      selectEdge(edge.id);
      onEdgeClick?.(edge.id);
    },
    [selectEdge, onEdgeClick]
  );

  /* ── Node drag (helper lines) ── */
  const handleNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      if (!node.measured?.width || !node.measured?.height) return;
      const allNodes = reactFlowInstance.getNodes().map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        width: (n.measured?.width ?? NODE_W),
        height: (n.measured?.height ?? NODE_H),
      }));
      const dragged = {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.measured.width,
        height: node.measured.height,
      };
      const { horizontal, vertical } = getHelperLines(dragged, allNodes);
      setHelperH(horizontal);
      setHelperV(vertical);
    },
    [reactFlowInstance]
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      setHelperH(null);
      setHelperV(null);
      // Sync final position back to store
      if (node.id && !node.id.startsWith("annotation-")) {
        updateNode(node.id, {
          x: node.position.x,
          y: node.position.y,
        });
      }
    },
    [updateNode]
  );

  /* ── Context menu ── */
  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const pos = reactFlowInstance.screenToFlowPosition({
        x: (event as React.MouseEvent).clientX,
        y: (event as React.MouseEvent).clientY,
      });
      setContextMenu({
        x: (event as React.MouseEvent).clientX,
        y: (event as React.MouseEvent).clientY,
        ...pos,
      });
    },
    [reactFlowInstance]
  );

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        x: (event as unknown as React.MouseEvent).clientX,
        y: (event as unknown as React.MouseEvent).clientY,
        nodeId: node.id,
      });
    },
    []
  );

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Delete selected
      if (event.key === "Delete" || event.key === "Backspace") {
        const state = useCWTrackerStore.getState();
        if (state.selectedNodeId) {
          removeNode(state.selectedNodeId);
        }
        if (state.selectedEdgeId) {
          useCWTrackerStore.getState().removeEdge(state.selectedEdgeId);
        }
      }
      // Ctrl+Z undo
      if (event.ctrlKey && event.key === "z") {
        useCWTrackerStore.getState().undo();
      }
      // Ctrl+Y redo
      if (event.ctrlKey && event.key === "y") {
        useCWTrackerStore.getState().redo();
      }
      // Ctrl+A select all
      if (event.ctrlKey && event.key === "a") {
        event.preventDefault();
        const nodeIds = useCWTrackerStore.getState().nodes.map((n) => n.id);
        useCWTrackerStore.getState().batchSelectRelated(nodeIds);
      }
    },
    [removeNode]
  );

  /* ── Background variant mapping ── */
  const bgVariantMap: Record<string, BackgroundVariant> = {
    dots: BackgroundVariant.Dots,
    lines: BackgroundVariant.Lines,
    cross: BackgroundVariant.Cross,
  };

  /* ── Determine if draw-edge mode ── */
  const isConnectMode = controlMode === "draw_edge";

  return (
    <div
      className="w-full h-full relative"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onViewportChange={onViewportChange}
        connectionLineComponent={CWConnectionLine}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid={snapToGrid}
        snapGrid={SNAP_GRID}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={["Delete", "Backspace"]}
        panOnDrag={!isConnectMode && !isLassoActive}
        connectOnClick={isConnectMode}
        nodesDraggable={!isConnectMode}
        proOptions={{ hideAttribution: true }}
        style={{
          background: "#0a0a0a",
        }}
      >
        {/* Background */}
        {bgVariant !== "none" && (
          <Background
            variant={bgVariantMap[bgVariant] || BackgroundVariant.Dots}
            color="#333"
            gap={20}
            size={1}
          />
        )}

        {/* SVG Marker definitions for per-edge arrow color/size */}
        <EdgeMarkerDefs />

        {/* Minimap */}
        {showMinimap && (
          <MiniMap
            nodeStrokeColor="#444"
            nodeColor="#1a1a1a"
            nodeBorderRadius={4}
            maskColor="rgba(0,0,0,0.7)"
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 8,
            }}
          />
        )}

        {/* Controls (zoom buttons) */}
        <Controls
          showInteractive={false}
          style={{
            background: "#1f1f1f",
            border: "1px solid #333",
            borderRadius: 8,
          }}
        />

        {/* Lasso freehand selection overlay */}
        {isLassoActive && !isConnectMode && <Lasso partial={lassoPartial} />}

        {/* Lasso / Selection mode toggle (top-left) */}
        <Panel position="top-left">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#1f1f1f",
              border: "1px solid #333",
              borderRadius: 24,
              padding: 3,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
            }}
          >
            <button
              onClick={() => setIsLassoActive(true)}
              style={{
                padding: "6px 18px",
                borderRadius: 20,
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
                color: isLassoActive ? "#fff" : "#999",
                background: isLassoActive ? "#ff0073" : "transparent",
              }}
            >
              Lasso Mode
            </button>
            <button
              onClick={() => setIsLassoActive(false)}
              style={{
                padding: "6px 18px",
                borderRadius: 20,
                border: isLassoActive ? "none" : "1px solid #ff0073",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
                color: isLassoActive ? "#999" : "#ff0073",
                background: "transparent",
              }}
            >
              Selection Mode
            </button>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#ccc",
                fontSize: 13,
                cursor: "pointer",
                marginRight: 8,
              }}
            >
              <input
                type="checkbox"
                checked={lassoPartial}
                onChange={() => setLassoPartial((p) => !p)}
                style={{
                  accentColor: "#ff0073",
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                }}
              />
              Partial selection
            </label>
          </div>
        </Panel>

        {/* Edge style switcher panel (bottom-left) */}
        <Panel position="bottom-left">
          <EdgeStyleSwitcher />
        </Panel>

        {/* Layout loading indicator */}
        {isLayouting && (
          <Panel position="top-center">
            <div
              style={{
                background: "#1f1f1f",
                border: "1px solid #444",
                borderRadius: 8,
                padding: "6px 16px",
                color: "#fff",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                className="animate-spin"
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid #555",
                  borderTopColor: "#597ef7",
                  borderRadius: "50%",
                }}
              />
              Calculating layout…
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Helper lines overlay */}
      <HelperLines horizontal={helperH} vertical={helperV} />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          data={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddAnnotation={(x, y) => {
            addAnnotation({
              id: `anno_${Date.now()}`,
              targetId: "",
              targetType: "node",
              text: "Note…",
              color: "#bd7c40",
              x,
              y,
              createdAt: new Date().toISOString(),
            });
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPORTED WRAPPER — with ReactFlowProvider
   ════════════════════════════════════════════════════════════════ */

export function MSGraphCanvas(props: MSGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <MSGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default MSGraphCanvas;
