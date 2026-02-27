/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ELK Layout Engine — replaces dagre with real edge routing   ║
 * ║  Runs in a Web Worker for performance (1.5MB engine).        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import ELK, { type ElkNode, type ElkExtendedEdge, type ElkPort, type ElkLabel } from "elkjs/lib/elk.bundled.js";
import type { MSNode, MSEdge } from "@/lib/onchain/cwtracker-types";
import { MS_NODE } from "@/lib/onchain/cwtracker-types";
import type { EdgeRoutingMode } from "./constants";

/* ── Singleton ELK instance ── */
let elkInstance: InstanceType<typeof ELK> | null = null;

function getElk(): InstanceType<typeof ELK> {
  if (!elkInstance) {
    elkInstance = new ELK();
  }
  return elkInstance;
}

/* ── ELK routing mode → algorithm option ── */
function getEdgeRoutingOption(mode: EdgeRoutingMode): string {
  switch (mode) {
    case "orthogonal":  return "ORTHOGONAL";
    case "smoothstep":  return "SPLINES";
    case "bezier":      return "SPLINES";
    case "straight":    return "POLYLINE";
    default:            return "ORTHOGONAL";
  }
}

/* ── Types for layout result ── */
export interface ElkLayoutResult {
  /** Updated MSNode[] with positions from ELK */
  nodes: MSNode[];
  /** Edge route data keyed by edge ID */
  edgeRoutes: Map<
    string,
    {
      routePoints: { x: number; y: number }[];
      labelX: number;
      labelY: number;
      labelW: number;
      labelH: number;
    }
  >;
}

/**
 * Run ELK layout on CWTracker graph data.
 *
 * @param nodes      All MSNode[]
 * @param edges      All MSEdge[]
 * @param rootId     Root node ID (for connected-component filtering)
 * @param visibleEdgeIds  Set of visible edge IDs (progressive reveal)
 * @param spacing    Spacing parameter (default 580, maps to ranksep)
 * @param routingMode  Edge routing algorithm
 * @returns Promise<ElkLayoutResult>
 */
export async function msElkLayout(
  nodes: MSNode[],
  edges: MSEdge[],
  rootId: string,
  visibleEdgeIds?: Set<string>,
  spacing?: number,
  routingMode: EdgeRoutingMode = "orthogonal"
): Promise<ElkLayoutResult> {
  const elk = getElk();

  if (nodes.length === 0) {
    return { nodes: [], edgeRoutes: new Map() };
  }

  const LABEL_W = 280;
  const LABEL_H = 28;
  const NODE_W = MS_NODE.width;   // 280
  const NODE_H = MS_NODE.height;  // 72

  // Scaling from spacing param
  const defaultSpacing = MS_NODE.defaultSpacing || 580;
  const scale = spacing ? spacing / defaultSpacing : 1;
  const ranksep = Math.round(200 * scale);
  const nodesep = Math.round(70 * scale);

  // Determine connected nodes (same logic as dagre version)
  const connectedNodeIds = new Set<string>();
  connectedNodeIds.add(rootId);
  const edgeSet = visibleEdgeIds instanceof Set ? visibleEdgeIds : null;
  for (const e of edges) {
    if (!edgeSet || edgeSet.has(e.id)) {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    }
  }

  // Build ELK children (nodes)
  const elkChildren: ElkNode[] = [];
  const nodeIdSet = new Set<string>();

  for (const n of nodes) {
    if (!connectedNodeIds.has(n.id)) continue;
    nodeIdSet.add(n.id);

    // 4 ports: left-in (WEST), left-out (WEST), right-out (EAST), right-in (EAST)
    const ports: ElkPort[] = [
      {
        id: `${n.id}_left`,
        properties: {
          "port.side": "WEST",
          "port.index": "0",
        },
      },
      {
        id: `${n.id}_left_out`,
        properties: {
          "port.side": "WEST",
          "port.index": "1",
        },
      },
      {
        id: `${n.id}_right`,
        properties: {
          "port.side": "EAST",
          "port.index": "2",
        },
      },
      {
        id: `${n.id}_right_in`,
        properties: {
          "port.side": "EAST",
          "port.index": "3",
        },
      },
    ];

    elkChildren.push({
      id: n.id,
      width: NODE_W,
      height: NODE_H,
      ports,
      properties: {
        "portConstraints": "FIXED_SIDE",
      },
    });
  }

  // Build ELK edges with smart port selection based on existing node positions
  // Build position lookup from input nodes (pre-layout positions)
  const prePosMap = new Map<string, number>();
  for (const n of nodes) {
    if (nodeIdSet.has(n.id)) {
      prePosMap.set(n.id, n.x ?? 0);
    }
  }

  const elkEdges: ElkExtendedEdge[] = [];
  for (const e of edges) {
    if (edgeSet && !edgeSet.has(e.id)) continue;
    if (!nodeIdSet.has(e.source) || !nodeIdSet.has(e.target)) continue;

    const labels: ElkLabel[] = [
      {
        id: `label_${e.id}`,
        text: e.amountLabel || e.valueLabel || "",
        width: LABEL_W,
        height: LABEL_H,
      },
    ];

    // Decide port direction: if source is to the right of target, edge goes "backwards"
    const srcX = prePosMap.get(e.source) ?? 0;
    const tgtX = prePosMap.get(e.target) ?? 0;
    const isBackward = srcX > tgtX + NODE_W / 2;

    elkEdges.push({
      id: e.id,
      sources: [isBackward ? `${e.source}_left_out` : `${e.source}_right`],
      targets: [isBackward ? `${e.target}_right_in` : `${e.target}_left`],
      labels,
    });
  }

  // ELK graph with layout options
  const elkGraph: ElkNode = {
    id: "root",
    children: elkChildren,
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.edgeRouting": getEdgeRoutingOption(routingMode),

      // Spacing
      "elk.layered.spacing.nodeNodeBetweenLayers": String(ranksep),
      "elk.layered.spacing.nodeNode": String(nodesep),
      "elk.layered.spacing.edgeEdge": "25",
      "elk.layered.spacing.edgeNode": "25",
      "elk.spacing.portPort": "10",

      // Margins
      "elk.padding": "[top=60,left=60,bottom=60,right=60]",

      // Label placement
      "elk.edgeLabels.placement": "CENTER",

      // Port alignment
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",

      // Cycle breaking
      "elk.layered.cycleBreaking.strategy": "GREEDY",

      // Edge label side selection — center
      "elk.layered.edgeLabels.sideSelection": "ALWAYS_DOWN",

      // Merge edges at same node
      "elk.layered.mergeEdges": "false",

      // Node ordering for consistency
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
  };

  // Run ELK layout (async — runs in separate thread)
  const result = await elk.layout(elkGraph);

  // Map positions back to MSNode[]
  const positionMap = new Map<string, { x: number; y: number }>();
  for (const child of result.children ?? []) {
    positionMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  const updatedNodes = nodes.map((n) => {
    const pos = positionMap.get(n.id);
    if (!pos) {
      return { ...n, x: -9999, y: -9999 };
    }
    // ELK returns top-left coordinates directly (unlike dagre which returns center)
    const x = pos.x;
    const y = pos.y;
    const gridX = Math.round(x / (MS_NODE.gridSpacingX || 360));
    const gridY = Math.round(y / (MS_NODE.gridSpacingY || 120));
    return { ...n, x, y, gridX, gridY };
  });

  // Map edge routes
  const edgeRoutes = new Map<
    string,
    {
      routePoints: { x: number; y: number }[];
      labelX: number;
      labelY: number;
      labelW: number;
      labelH: number;
    }
  >();

  for (const elkEdge of result.edges ?? []) {
    const sections = (elkEdge as any).sections;
    if (!sections || sections.length === 0) continue;

    const section = sections[0];
    const routePoints: { x: number; y: number }[] = [];

    // Start point
    if (section.startPoint) {
      routePoints.push({ x: section.startPoint.x, y: section.startPoint.y });
    }

    // Bend points
    if (section.bendPoints) {
      for (const bp of section.bendPoints) {
        routePoints.push({ x: bp.x, y: bp.y });
      }
    }

    // End point
    if (section.endPoint) {
      routePoints.push({ x: section.endPoint.x, y: section.endPoint.y });
    }

    // Label position from ELK native labels
    let labelX = 0;
    let labelY = 0;
    let labelW = LABEL_W;
    let labelH = LABEL_H;

    const elkLabels = (elkEdge as any).labels;
    if (elkLabels && elkLabels.length > 0) {
      const lbl = elkLabels[0];
      labelX = lbl.x ?? 0;
      labelY = lbl.y ?? 0;
      labelW = lbl.width ?? LABEL_W;
      labelH = lbl.height ?? LABEL_H;
    } else if (routePoints.length >= 2) {
      // Fallback: midpoint of route
      const mid = Math.floor(routePoints.length / 2);
      labelX = routePoints[mid].x - LABEL_W / 2;
      labelY = routePoints[mid].y - LABEL_H / 2;
    }

    edgeRoutes.set(elkEdge.id, { routePoints, labelX, labelY, labelW, labelH });
  }

  return { nodes: updatedNodes, edgeRoutes };
}
