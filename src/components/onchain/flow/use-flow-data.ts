/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  use-flow-data — Convert MSNode/MSEdge → React Flow nodes/edges║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import type { MSNode, MSEdge, MSAnnotation } from "@/lib/onchain/cwtracker-types";
import { NODE_W, NODE_H, EXPANDED_NODE_EXTRA_H } from "./constants";
import type { CWEdgeData } from "./CWEdge";
import type { AnnotationData } from "./AnnotationNode";
import type { EdgeRoutingMode } from "./constants";

/* ── Map edge routing mode → React Flow edge type string ── */
function getEdgeType(mode: EdgeRoutingMode): string {
  switch (mode) {
    case "orthogonal":
      return "cwEdge";
    case "smoothstep":
      return "cwSmoothEdge";
    case "straight":
      return "cwStraightEdge";
    case "bezier":
      return "cwAnimatedEdge";
    case "animatedSvg":
      return "cwAnimatedSVGEdge";
    default:
      return "cwEdge";
  }
}

/* ── Convert MSNode[] → React Flow Node[] ── */
export function msNodesToFlowNodes(
  nodes: MSNode[],
  activatedNodeIds: Set<string>,
  expandedActionId?: string | null
): Node[] {
  return nodes
    .filter((n) => n.isVisibleOnCanvas !== false)
    .map((n) => {
      const isExpanded = expandedActionId === n.id;
      return {
        id: n.id,
        type: n.isContract && n.type === "contract" ? "cwGroupNode" : "cwNode",
        position: { x: n.x, y: n.y },
        data: {
          ...n,
          isActivated: activatedNodeIds.has(n.id),
          isExpandedActions: isExpanded,
        },
        width: NODE_W,
        height: isExpanded ? NODE_H + EXPANDED_NODE_EXTRA_H : NODE_H,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: true,
        selectable: true,
        // Preserve selection state
        selected: n.isSelected,
      };
    });
}

/* ── Convert MSEdge[] → React Flow Edge[] ── */
export function msEdgesToFlowEdges(
  edges: MSEdge[],
  activatedNodeIds: Set<string>,
  edgeRoutingMode: EdgeRoutingMode,
  edgeRoutes?: Map<string, { x: number; y: number }[]>,
  nodes?: MSNode[]
): Edge[] {
  // Build a position lookup for dynamic handle selection
  const posMap = new Map<string, { x: number; y: number }>();
  if (nodes) {
    for (const n of nodes) {
      posMap.set(n.id, { x: n.x, y: n.y });
    }
  }

  return edges
    .filter((e) => {
      // Only show edges whose source is activated
      if (!activatedNodeIds.has(e.source)) return false;
      // Respect visibility toggle
      if (e.isVisible === false) return false;
      return true;
    })
    .map((e, idx) => {
      // Dynamic handle selection based on relative node positions
      // source = the sender, target = the receiver
      // Arrow points toward receiver (target), so edge goes source → target
      let sourceHandle = "right";   // default: send from right
      let targetHandle = "left";    // default: receive on left

      const srcPos = posMap.get(e.source);
      const tgtPos = posMap.get(e.target);
      if (srcPos && tgtPos) {
        if (srcPos.x > tgtPos.x + NODE_W / 2) {
          // Source is to the RIGHT of target → send from left, receive on right
          sourceHandle = "left-out";
          targetHandle = "right-in";
        }
        // else: source is left of or roughly same X as target → normal right→left
      }

      const edgeData: CWEdgeData = {
        msEdgeId: e.id,
        routePoints: edgeRoutes?.get(e.id),
        color: e.customColor || e.color,
        customWidth: e.customWidth,
        customDash: e.customDash,
        isCrossChain: e.isCrossChain,
        edgeIndex: idx,
        amountLabel: e.amountLabel,
        totalValue: e.totalValue,
        tokenSymbol: e.tokenSymbol,
        latestTimestamp: e.latestTimestamp,
        targetType: "", // filled in by store if needed
        details: e.details?.map((d) => ({ timestamp: d.timestamp })),
        customArrowSize: e.customArrowSize,
      };

      /* Per-edge type override: MSEdge.edgeType → routing mode mapping */
      const perEdgeTypeMap: Record<string, EdgeRoutingMode> = {
        animated: "bezier",
        smooth: "smoothstep",
        straight: "straight",
        default: "orthogonal",
        animatedSvg: "animatedSvg",
      };
      const resolvedType = e.edgeType && perEdgeTypeMap[e.edgeType]
        ? getEdgeType(perEdgeTypeMap[e.edgeType])
        : getEdgeType(edgeRoutingMode);

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: resolvedType,
        data: edgeData,
        sourceHandle,
        targetHandle,
        animated: edgeRoutingMode === "bezier",
        selected: e.isSelected,
      };
    });
}

/* ── Convert MSAnnotation[] → React Flow Node[] (annotation type) ── */
export function msAnnotationsToFlowNodes(annotations: MSAnnotation[]): Node[] {
  return annotations
    .filter((a) => a.x != null && a.y != null)
    .map((a) => ({
      id: `annotation-${a.id}`,
      type: "annotationNode",
      position: { x: a.x!, y: a.y! },
      data: {
        annotationId: a.id,
        text: a.text,
        color: a.color || "#bd7c40",
      } as AnnotationData,
      draggable: true,
      selectable: false,
    }));
}

/* ── Combined hook ── */
export function useFlowData(
  nodes: MSNode[],
  edges: MSEdge[],
  annotations: MSAnnotation[],
  activatedNodeIds: Set<string>,
  edgeRoutingMode: EdgeRoutingMode,
  edgeRoutes?: Map<string, { x: number; y: number }[]>,
  expandedActionId?: string | null
) {
  const flowNodes = useMemo(
    () => [
      ...msNodesToFlowNodes(nodes, activatedNodeIds, expandedActionId),
      ...msAnnotationsToFlowNodes(annotations),
    ],
    [nodes, activatedNodeIds, annotations, expandedActionId]
  );

  const flowEdges = useMemo(
    () => msEdgesToFlowEdges(edges, activatedNodeIds, edgeRoutingMode, edgeRoutes, nodes),
    [edges, activatedNodeIds, edgeRoutingMode, edgeRoutes, nodes]
  );

  return { flowNodes, flowEdges };
}
