/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWTRACKER Store — Zustand + Immer state management         ║
 * ║  Manages graph nodes, edges, flows, annotations, undo/redo   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

enableMapSet();
import {
  type MSNode,
  type MSEdge,
  type MSFlow,
  type MSAnnotation,
  type MSDisplayOptions,
  type MSFilter,
  type MSControlMode,
  type MSSidebarTab,
  type MSSidebarSubTab,
  type MSSnapshot,
  DEFAULT_MS_DISPLAY,
  DEFAULT_MS_FILTER,
  msAssignGridPositions,
  msDagreLayout,
  msGridToPixel,
  normalizeAddressKey,
  MS_NODE,
} from "./cwtracker-types";

/* ────────────────────────────── STATE ────────────────────────────── */

interface CWTrackerState {
  /** Unique trace ID */
  uuid: string;
  /** Title for this trace session */
  title: string;
  /** Root address being traced */
  rootAddress: string;
  /** Root chain */
  rootChain: string;

  /* ── Graph data ── */
  nodes: MSNode[];
  edges: MSEdge[];
  flows: MSFlow[];
  annotations: MSAnnotation[];

  /* ── Selection ── */
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;

  /* ── UI state ── */
  sidebarOpen: boolean;
  sidebarTab: MSSidebarTab;
  controlMode: MSControlMode;
  displayOptions: MSDisplayOptions;
  filter: MSFilter;
  isPopulating: boolean;

  /* ── CWTracker Panels ── */
  /** Edge List bottom drawer */
  edgeListOpen: boolean;
  edgeListEdgeId: string | null;
  /** Edge Style Picker floating panel */
  edgeStyleEdgeId: string | null;
  /** Node Detail right panel (Related Address / Transfer tabs) */
  nodeDetailNodeId: string | null;
  /** Advanced Analyze modal */
  advancedAnalyzeOpen: boolean;
  advancedAnalyzeNodeId: string | null;

  /* ── CWTracker New State ── */
  /** Sidebar sub-tab: "1" = Related Address, "2" = Transfer */
  sidebarSubTab: MSSidebarSubTab;
  /** Node spacing for horizontal spacing slider (380-780, default 580) */
  nodeSpacing: number;
  /** InterChain Tracker panel open */
  interChainOpen: boolean;
  /** The node ID whose hover action bar is currently shown */
  nodeHoverActionsId: string | null;
  /** The edge ID whose action overlay is shown */
  edgeActionEdgeId: string | null;

  /* ── Zoom & Pan ── */
  zoom: number;
  panX: number;
  panY: number;

  /** Set of node IDs whose outgoing edges are visible (progressive reveal) */
  activatedNodeIds: Set<string>;

  /* ── Undo/Redo ── */
  undoStack: string[];
  redoStack: string[];

  /* ── React Flow + ELK (new) ── */
  /** Whether ELK layout is currently running */
  isLayouting: boolean;
  /** Current edge routing mode */
  edgeRoutingMode: "orthogonal" | "smoothstep" | "bezier" | "straight" | "animatedSvg";
  /** Whether snap-to-grid is enabled */
  snapToGrid: boolean;
  /** Whether minimap is visible */
  showMinimap: boolean;
  /** Background variant: "dots" | "lines" | "cross" | "none" */
  bgVariant: "dots" | "lines" | "cross" | "none";
  /** ELK-computed edge routes: Map<edgeId, routePoints[]> */
  edgeRoutes: Map<string, { x: number; y: number }[]>;
  /** Clipboard node ID for copy/paste */
  clipboardNodeId: string | null;
}

/* ────────────────────────────── ACTIONS ────────────────────────────── */

interface CWTrackerActions {
  /* ── Init ── */
  initTrace: (address: string, chain: string, title?: string) => void;
  loadCSVData: (nodes: MSNode[], edges: MSEdge[]) => void;
  resetTrace: () => void;
  loadSnapshot: (snap: MSSnapshot) => void;

  /* ── Node CRUD ── */
  addNodes: (nodes: MSNode[]) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, patch: Partial<MSNode>) => void;
  expandNode: (id: string) => void;
  pruneNode: (id: string) => void;
  setNodeBalance: (id: string, balanceUSD: number, balanceRaw?: string, balanceToken?: string) => void;

  /* ── Edge CRUD ── */
  addEdges: (edges: MSEdge[]) => void;
  removeEdge: (id: string) => void;
  updateEdge: (id: string, patch: Partial<MSEdge>) => void;

  /* ── Selection ── */
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  hoverEdge: (id: string | null) => void;

  /* ── CWTracker Panel actions ── */
  openEdgeList: (edgeId?: string) => void;
  closeEdgeList: () => void;
  openEdgeStylePicker: (edgeId: string) => void;
  closeEdgeStylePicker: () => void;
  openNodeDetail: (nodeId: string) => void;
  closeNodeDetail: () => void;
  openAdvancedAnalyze: (nodeId: string) => void;
  closeAdvancedAnalyze: () => void;
  /** Expand node in a specific direction (INCOMING left / OUTGOING right) */
  expandNodeDirection: (nodeId: string, direction: "left" | "right" | "both") => void;
  /** Re-run dagre layout on current graph */
  relayout: () => void;

  /* ── CWTracker New Actions ── */
  setSidebarSubTab: (tab: MSSidebarSubTab) => void;
  setNodeSpacing: (spacing: number) => void;
  toggleInterChain: () => void;
  setNodeHoverActionsId: (id: string | null) => void;
  setEdgeActionEdgeId: (id: string | null) => void;

  /* ── Annotations ── */
  addAnnotation: (anno: MSAnnotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, patch: Partial<MSAnnotation>) => void;

  /* ── Flows ── */
  addFlow: (flow: MSFlow) => void;
  removeFlow: (id: string) => void;

  /* ── Display ── */
  setDisplayOptions: (patch: Partial<MSDisplayOptions>) => void;
  setFilter: (patch: Partial<MSFilter>) => void;
  setControlMode: (mode: MSControlMode) => void;
  setSidebarTab: (tab: MSSidebarTab) => void;
  toggleSidebar: () => void;
  setTitle: (title: string) => void;

  /* ── Zoom/Pan ── */
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  fitToView: () => void;

  /* ── Undo/Redo ── */
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;

  /* ── Computed ── */
  getFilteredNodes: () => MSNode[];
  getFilteredEdges: () => MSEdge[];
  getSelectedNode: () => MSNode | undefined;
  getSelectedEdge: () => MSEdge | undefined;
  getNodeById: (id: string) => MSNode | undefined;
  getEdgeById: (id: string) => MSEdge | undefined;
  getNodeEdges: (nodeId: string) => MSEdge[];
  getAdjacentNodes: (nodeId: string) => MSNode[];
  getUniqueChains: () => string[];
  getUniqueTokens: () => string[];
  getSnapshot: () => MSSnapshot;

  /* ── Activated nodes (progressive edge reveal) ── */
  activateNode: (nodeId: string) => void;
  isNodeActivated: (nodeId: string) => boolean;

  /* ── Visibility / Batch (CWTracker-parity) ── */
  toggleNodeVisibility: (nodeId: string) => void;
  toggleEdgeVisibility: (edgeId: string) => void;
  batchSelectRelated: (nodeIds: string[]) => void;
  exportEdgeListData: (format: "csv" | "json") => string;

  /* ── React Flow + ELK (new) ── */
  setEdgeRoutingMode: (mode: "orthogonal" | "smoothstep" | "bezier" | "straight" | "animatedSvg") => void;
  setSnapToGrid: (enabled: boolean) => void;
  toggleMinimap: () => void;
  setBgVariant: (variant: "dots" | "lines" | "cross" | "none") => void;
  /** Run ELK layout asynchronously and update node positions + edge routes */
  runElkLayout: () => Promise<void>;
  /** Copy a node to clipboard */
  copyNode: (nodeId: string) => void;
  /** Paste node at position */
  pasteNode: (x: number, y: number) => void;
}

/* ────────────────────────────── INITIAL STATE ────────────────────────────── */

const MAX_UNDO = 50;

function genId(): string {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const initialState: CWTrackerState = {
  uuid: "",
  title: "",
  rootAddress: "",
  rootChain: "",
  nodes: [],
  edges: [],
  flows: [],
  annotations: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
  hoveredEdgeId: null,
  sidebarOpen: true,
  sidebarTab: "overview",
  controlMode: "select",
  displayOptions: { ...DEFAULT_MS_DISPLAY },
  filter: { ...DEFAULT_MS_FILTER },
  isPopulating: false,
  edgeListOpen: false,
  edgeListEdgeId: null,
  edgeStyleEdgeId: null,
  nodeDetailNodeId: null,
  advancedAnalyzeOpen: false,
  advancedAnalyzeNodeId: null,
  sidebarSubTab: "1",
  nodeSpacing: MS_NODE.defaultSpacing,
  interChainOpen: false,
  nodeHoverActionsId: null,
  edgeActionEdgeId: null,
  activatedNodeIds: new Set<string>(),
  zoom: 1,
  panX: 0,
  panY: 0,
  undoStack: [],
  redoStack: [],
  isLayouting: false,
  edgeRoutingMode: "orthogonal",
  snapToGrid: false,
  showMinimap: true,
  bgVariant: "dots",
  edgeRoutes: new Map(),
  clipboardNodeId: null,
};

/* ────────────────────────────── STORE ────────────────────────────── */

export const useCWTrackerStore = create<CWTrackerState & CWTrackerActions>()(
  immer((set, get) => ({
    ...initialState,

    /* ═══════════════════════════ INIT ═══════════════════════════ */

    initTrace(address, chain, title) {
      set((s) => {
        Object.assign(s, { ...initialState });
        s.uuid = genId();
        s.rootAddress = address;
        s.rootChain = chain;
        s.title = title || `Trace ${address.slice(0, 10)}...`;

        const rootNode: MSNode = {
          id: `node_root`,
          label: title || address.slice(0, 10) + "...",
          subLabel: address,
          type: "wallet",
          address,
          chain,
          gridX: 0,
          gridY: 0,
          x: 0,
          y: 0,
          isRoot: true,
          isSelected: false,
          isExpanded: false,
          isLoading: false,
          isContract: false,
          isPruned: false,
          isDragging: false,
          flowsIn: 0,
          flowsOut: 0,
          txCount: 0,
          balanceUSD: 0,
          balanceRaw: "0",
          balanceToken: chain === "ethereum" ? "ETH" : chain === "bsc" ? "BNB" : "ETH",
          totalValueUSD: 0,
          activeChains: [chain],
          chainBalances: { [chain]: [{ token: chain === "ethereum" ? "ETH" : chain === "bsc" ? "BNB" : "ETH", amount: 0, usdValue: 0 }] },
          chainFirstSeen: { [chain]: new Date().toISOString() },
          totalKnownTransfers: 0,
        };
        s.nodes = [rootNode];
        s.edges = [];
        s.flows = [];
        s.annotations = [];
        s.activatedNodeIds = new Set(["node_root"]);
      });
    },

    loadCSVData(nodes, edges) {
      set((s) => {
        // Note: do NOT overwrite s.pushUndo inside immer draft — it permanently kills undo

        // Deduplicate nodes by address key
        const existing = new Set(s.nodes.map((n) => normalizeAddressKey(n.address, n.chain)));
        const newNodes = nodes.filter(
          (n) => !existing.has(normalizeAddressKey(n.address, n.chain))
        );

        // Merge with root: update root if it matches
        for (const n of newNodes) {
          if (normalizeAddressKey(n.address, n.chain) === normalizeAddressKey(s.rootAddress, s.rootChain)) {
            // Update root node with CSV data
            const root = s.nodes.find((r) => r.isRoot);
            if (root) {
              root.label = n.label || root.label;
              root.type = n.type || root.type;
              root.flowsIn = n.flowsIn;
              root.flowsOut = n.flowsOut;
              root.txCount = n.txCount;
              root.tags = n.tags;
            }
            continue;
          }
          s.nodes.push(n);
        }

        // Add edges
        s.edges.push(...edges);

        // Ensure root is activated
        const rootId = s.nodes.find((n) => n.isRoot)?.id || s.nodes[0]?.id;
        if (rootId) {
          s.activatedNodeIds = new Set([rootId]);
        }

        // Re-layout with dagre (only visible edges)
        if (rootId) {
          const visibleEdgeIds = new Set(
            s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
          );
          s.nodes = msDagreLayout(s.nodes, s.edges, rootId, visibleEdgeIds, s.nodeSpacing) as any;
        }

        s.isPopulating = false;
      });
      // Run ELK for refined edge routes
      get().runElkLayout();
    },

    resetTrace() {
      set((s) => {
        Object.assign(s, { ...initialState });
      });
    },

    loadSnapshot(snap) {
      set((s) => {
        s.uuid = snap.uuid;
        s.title = snap.title;
        s.rootAddress = snap.rootAddress;
        s.rootChain = snap.rootChain;
        s.nodes = snap.nodes as any;
        s.edges = snap.edges as any;
        s.flows = snap.flows as any;
        s.annotations = snap.annotations as any;
        s.displayOptions = snap.displayOptions as any;
        s.filter = snap.filter as any;
        s.zoom = snap.zoom;
        s.panX = snap.panX;
        s.panY = snap.panY;
      });
    },

    /* ═══════════════════════════ NODE CRUD ═══════════════════════════ */

    addNodes(nodes) {
      set((s) => {
        get().pushUndo();
        const existing = new Set(s.nodes.map((n) => normalizeAddressKey(n.address, n.chain)));
        const newNodes = nodes.filter(
          (n) => !existing.has(normalizeAddressKey(n.address, n.chain))
        );
        s.nodes.push(...(newNodes as any));

        // Re-layout with dagre (visible edges only)
        const rootId = s.nodes.find((n) => n.isRoot)?.id;
        if (rootId) {
          const visibleEdgeIds = new Set(
            s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
          );
          s.nodes = msDagreLayout(s.nodes, s.edges, rootId, visibleEdgeIds, s.nodeSpacing) as any;
        }
      });
      get().runElkLayout();
    },

    removeNode(id) {
      set((s) => {
        get().pushUndo();
        s.nodes = s.nodes.filter((n) => n.id !== id) as any;
        s.edges = s.edges.filter((e) => e.source !== id && e.target !== id) as any;
        if (s.selectedNodeId === id) s.selectedNodeId = null;
      });
    },

    updateNode(id, patch) {
      set((s) => {
        const node = s.nodes.find((n) => n.id === id);
        if (node) Object.assign(node, patch);
      });
    },

    expandNode(id) {
      const state = get();
      const node = state.nodes.find((n) => n.id === id);
      if (node) {
        if (!node.isExpanded) {
          state.expandNodeDirection(id, "both");
        } else {
          set((s) => {
            const n = s.nodes.find((n) => n.id === id);
            if (n) n.isExpanded = false;
          });
        }
      }
    },

    pruneNode(id) {
      set((s) => {
        get().pushUndo();
        const node = s.nodes.find((n) => n.id === id);
        if (node) node.isPruned = true;
      });
    },

    setNodeBalance(id, balanceUSD, balanceRaw, balanceToken) {
      set((s) => {
        const node = s.nodes.find((n) => n.id === id);
        if (node) {
          node.balanceUSD = balanceUSD;
          if (balanceRaw) node.balanceRaw = balanceRaw;
          if (balanceToken) node.balanceToken = balanceToken;
        }
      });
    },

    /* ═══════════════════════════ EDGE CRUD ═══════════════════════════ */

    addEdges(edges) {
      set((s) => {
        get().pushUndo();
        const existingIds = new Set(s.edges.map((e) => e.id));
        const newEdges = edges.filter((e) => !existingIds.has(e.id));
        s.edges.push(...(newEdges as any));
      });
    },

    removeEdge(id) {
      set((s) => {
        get().pushUndo();
        s.edges = s.edges.filter((e) => e.id !== id) as any;
        if (s.selectedEdgeId === id) s.selectedEdgeId = null;
      });
    },

    updateEdge(id, patch) {
      set((s) => {
        const edge = s.edges.find((e) => e.id === id);
        if (edge) Object.assign(edge, patch);
      });
    },

    /* ═══════════════════════════ SELECTION ═══════════════════════════ */

    selectNode(id) {
      set((s) => {
        // Deselect previous
        for (const n of s.nodes) n.isSelected = false;
        if (id) {
          const node = s.nodes.find((n) => n.id === id);
          if (node) node.isSelected = true;
        }
        s.selectedNodeId = id;
        s.selectedEdgeId = null;
        if (id) s.sidebarTab = "details";
      });
    },

    selectEdge(id) {
      set((s) => {
        for (const e of s.edges) e.isSelected = false;
        if (id) {
          const edge = s.edges.find((e) => e.id === id);
          if (edge) edge.isSelected = true;
        }
        s.selectedEdgeId = id;
        s.selectedNodeId = null;
      });
    },

    hoverNode(id) {
      set((s) => {
        s.hoveredNodeId = id;
      });
    },

    hoverEdge(id) {
      set((s) => {
        s.hoveredEdgeId = id;
      });
    },

    /* ═══════════════════════ CWTRACKER PANELS ═══════════════════════ */

    openEdgeList(edgeId) {
      set((s) => {
        s.edgeListOpen = true;
        s.edgeListEdgeId = edgeId ?? null;
      });
    },

    closeEdgeList() {
      set((s) => {
        s.edgeListOpen = false;
        s.edgeListEdgeId = null;
      });
    },

    openEdgeStylePicker(edgeId) {
      set((s) => {
        s.edgeStyleEdgeId = edgeId;
      });
    },

    closeEdgeStylePicker() {
      set((s) => {
        s.edgeStyleEdgeId = null;
      });
    },

    openNodeDetail(nodeId) {
      set((s) => {
        s.nodeDetailNodeId = nodeId;
        s.sidebarOpen = true;
        s.sidebarTab = "details";
      });
    },

    closeNodeDetail() {
      set((s) => {
        s.nodeDetailNodeId = null;
      });
    },

    openAdvancedAnalyze(nodeId) {
      set((s) => {
        s.advancedAnalyzeOpen = true;
        s.advancedAnalyzeNodeId = nodeId;
      });
    },

    closeAdvancedAnalyze() {
      set((s) => {
        s.advancedAnalyzeOpen = false;
        s.advancedAnalyzeNodeId = null;
      });
    },

    /* ═══════════════════════════ NEW CWTRACKER ACTIONS ═══════════════════════════ */

    setSidebarSubTab(tab) {
      set((s) => {
        s.sidebarSubTab = tab;
      });
    },

    setNodeSpacing(spacing) {
      set((s) => {
        s.nodeSpacing = Math.max(MS_NODE.minSpacing, Math.min(MS_NODE.maxSpacing, spacing));
        // Auto-relayout with new spacing
        const rootId = s.nodes.find((n) => n.isRoot)?.id || s.nodes[0]?.id;
        if (rootId) {
          const visibleEdgeIds = new Set(
            s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
          );
          s.nodes = msDagreLayout(s.nodes, s.edges, rootId, visibleEdgeIds, s.nodeSpacing) as any;
        }
      });
      get().runElkLayout();
    },

    toggleInterChain() {
      set((s) => {
        s.interChainOpen = !s.interChainOpen;
      });
    },

    setNodeHoverActionsId(id) {
      set((s) => {
        s.nodeHoverActionsId = id;
      });
    },

    setEdgeActionEdgeId(id) {
      set((s) => {
        s.edgeActionEdgeId = id;
      });
    },

    /* ═══════════════════════════ ACTIVATED NODES ═══════════════════════════ */

    activateNode(nodeId) {
      set((s) => {
        s.activatedNodeIds = new Set(s.activatedNodeIds);
        s.activatedNodeIds.add(nodeId);
        // Relayout with updated visible edges
        const rootId = s.nodes.find((n) => n.isRoot)?.id || s.nodes[0]?.id;
        if (rootId) {
          const visibleEdgeIds = new Set(
            s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
          );
          s.nodes = msDagreLayout(s.nodes, s.edges, rootId, visibleEdgeIds, s.nodeSpacing) as any;
        }
      });
      get().runElkLayout();
    },

    isNodeActivated(nodeId) {
      return get().activatedNodeIds.has(nodeId);
    },

    expandNodeDirection(nodeId, direction) {
      set((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.expandDirection = direction === "left" && node.expandDirection === "right"
            ? "both"
            : direction === "right" && node.expandDirection === "left"
            ? "both"
            : direction;
          node.isExpanded = true;
          node.isLoading = true;
        }
        // Activate this node so its outgoing edges become visible
        s.activatedNodeIds = new Set(s.activatedNodeIds);
        s.activatedNodeIds.add(nodeId);
      });

      // Fetch OmniChain data in the background
      import("./omnichain-api").then(({ fetchOmniChainData }) => {
        const state = get();
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        fetchOmniChainData(node.id, node.address, {
          directions: {
            in: direction === "left" || direction === "both",
            out: direction === "right" || direction === "both",
          }
        }).then(({ nodes, edges }) => {
          set((s) => {
            const targetNode = s.nodes.find((n) => n.id === nodeId);
            if (targetNode) targetNode.isLoading = false;

            // Add new nodes
            nodes.forEach((n) => {
              if (!s.nodes.find((existing) => existing.id === n.id)) {
                s.nodes.push(n as any);
              }
            });

            // Add new edges
            edges.forEach((e) => {
              if (!s.edges.find((existing) => existing.id === e.id)) {
                s.edges.push(e as any);
              }
            });

            // Relayout with visible edges
            const rootId = s.nodes.find((n) => n.isRoot)?.id || s.nodes[0]?.id;
            if (rootId) {
              const visibleEdgeIds = new Set(
                s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
              );
              s.nodes = msDagreLayout(s.nodes, s.edges, rootId, visibleEdgeIds, s.nodeSpacing) as any;
            }
          });
          get().runElkLayout();
        }).catch((err) => {
          console.error("Failed to fetch OmniChain data:", err);
          set((s) => {
            const targetNode = s.nodes.find((n) => n.id === nodeId);
            if (targetNode) targetNode.isLoading = false;
          });
        });
      });
    },

    relayout() {
      set((s) => {
        const rootId = s.nodes.find((n) => n.isRoot)?.id || s.nodes[0]?.id;
        if (rootId) {
          const visibleEdgeIds = new Set(
            s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
          );
          s.nodes = msDagreLayout(s.nodes, s.edges, rootId, visibleEdgeIds, s.nodeSpacing) as any;
        }
      });
      // Also run ELK for edge routes refinement
      get().runElkLayout();
    },

    /* ═══════════════════════════ ANNOTATIONS ═══════════════════════════ */

    addAnnotation(anno) {
      set((s) => {
        s.annotations.push(anno as any);
      });
    },

    removeAnnotation(id) {
      set((s) => {
        s.annotations = s.annotations.filter((a) => a.id !== id) as any;
      });
    },

    updateAnnotation(id, patch) {
      set((s) => {
        const anno = s.annotations.find((a) => a.id === id);
        if (anno) Object.assign(anno, patch);
      });
    },

    /* ═══════════════════════════ FLOWS ═══════════════════════════ */

    addFlow(flow) {
      set((s) => {
        s.flows.push(flow as any);
      });
    },

    removeFlow(id) {
      set((s) => {
        s.flows = s.flows.filter((f) => f.id !== id) as any;
      });
    },

    /* ═══════════════════════════ DISPLAY ═══════════════════════════ */

    setDisplayOptions(patch) {
      set((s) => {
        Object.assign(s.displayOptions, patch);
      });
    },

    setFilter(patch) {
      set((s) => {
        Object.assign(s.filter, patch);
      });
    },

    setControlMode(mode) {
      set((s) => {
        s.controlMode = mode;
      });
    },

    setSidebarTab(tab) {
      set((s) => {
        s.sidebarTab = tab;
      });
    },

    toggleSidebar() {
      set((s) => {
        s.sidebarOpen = !s.sidebarOpen;
      });
    },

    setTitle(title) {
      set((s) => {
        s.title = title;
      });
    },

    /* ═══════════════════════════ ZOOM/PAN ═══════════════════════════ */

    setZoom(zoom) {
      set((s) => {
        s.zoom = Math.max(0.05, Math.min(3, zoom));
      });
    },

    setPan(x, y) {
      set((s) => {
        s.panX = x;
        s.panY = y;
      });
    },

    fitToView() {
      const { nodes } = get();
      if (nodes.length === 0) return;

      const xs = nodes.map((n) => n.x);
      const ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + MS_NODE.width;
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + MS_NODE.height;
      const width = maxX - minX || 1;
      const height = maxY - minY || 1;

      set((s) => {
        s.zoom = Math.min(1, Math.min(1200 / width, 800 / height) * 0.85);
        s.panX = -(minX + width / 2) * s.zoom + 600;
        s.panY = -(minY + height / 2) * s.zoom + 400;
      });
    },

    /* ═══════════════════════════ UNDO/REDO ═══════════════════════════ */

    pushUndo() {
      set((s) => {
        const snapshot = JSON.stringify({
          nodes: s.nodes,
          edges: s.edges,
          flows: s.flows,
          annotations: s.annotations,
          selectedNodeId: s.selectedNodeId,
          selectedEdgeId: s.selectedEdgeId,
        });
        s.undoStack.push(snapshot);
        if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();
        s.redoStack = [];
      });
    },

    undo() {
      set((s) => {
        if (s.undoStack.length === 0) return;
        // Save current state to redo
        const current = JSON.stringify({
          nodes: s.nodes,
          edges: s.edges,
          flows: s.flows,
          annotations: s.annotations,
          selectedNodeId: s.selectedNodeId,
          selectedEdgeId: s.selectedEdgeId,
        });
        s.redoStack.push(current);

        const prev = JSON.parse(s.undoStack.pop()!);
        s.nodes = prev.nodes;
        s.edges = prev.edges;
        s.flows = prev.flows;
        s.annotations = prev.annotations;
        s.selectedNodeId = prev.selectedNodeId;
        s.selectedEdgeId = prev.selectedEdgeId;
      });
    },

    redo() {
      set((s) => {
        if (s.redoStack.length === 0) return;
        const current = JSON.stringify({
          nodes: s.nodes,
          edges: s.edges,
          flows: s.flows,
          annotations: s.annotations,
          selectedNodeId: s.selectedNodeId,
          selectedEdgeId: s.selectedEdgeId,
        });
        s.undoStack.push(current);

        const next = JSON.parse(s.redoStack.pop()!);
        s.nodes = next.nodes;
        s.edges = next.edges;
        s.flows = next.flows;
        s.annotations = next.annotations;
        s.selectedNodeId = next.selectedNodeId;
        s.selectedEdgeId = next.selectedEdgeId;
      });
    },

    /* ═══════════════════════════ COMPUTED ═══════════════════════════ */

    getFilteredNodes() {
      const { nodes, filter } = get();
      return nodes.filter((n) => {
        if (n.isPruned) return false;
        if (filter.chains.length > 0 && !filter.chains.includes(n.chain)) return false;
        if (filter.entityTypes.length > 0 && !filter.entityTypes.includes(n.type)) return false;
        if (filter.searchText) {
          const q = filter.searchText.toLowerCase();
          const match =
            n.label.toLowerCase().includes(q) ||
            n.address.toLowerCase().includes(q) ||
            (n.subLabel?.toLowerCase().includes(q) ?? false);
          if (!match) return false;
        }
        return true;
      });
    },

    getFilteredEdges() {
      const { edges, filter, activatedNodeIds } = get();
      const filteredNodeIds = new Set(get().getFilteredNodes().map((n) => n.id));
      return edges.filter((e) => {
        if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;
        // Progressive reveal: only show edges from activated nodes
        if (!activatedNodeIds.has(e.source)) return false;
        if (filter.chains.length > 0 && !filter.chains.includes(e.chain)) return false;
        if (filter.tokens.length > 0 && !filter.tokens.includes(e.tokenSymbol)) return false;
        if (e.totalValue < filter.minValue) return false;
        if (filter.maxValue < Infinity && e.totalValue > filter.maxValue) return false;
        if (filter.suspiciousOnly && !e.isSuspicious) return false;
        if (filter.crossChainOnly && !e.isCrossChain) return false;
        return true;
      });
    },

    getSelectedNode() {
      const { nodes, selectedNodeId } = get();
      return selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined;
    },

    getSelectedEdge() {
      const { edges, selectedEdgeId } = get();
      return selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : undefined;
    },

    getNodeById(id) {
      return get().nodes.find((n) => n.id === id);
    },

    getEdgeById(id) {
      return get().edges.find((e) => e.id === id);
    },

    getNodeEdges(nodeId) {
      return get().edges.filter((e) => e.source === nodeId || e.target === nodeId);
    },

    getAdjacentNodes(nodeId) {
      const { nodes, edges } = get();
      const neighborIds = new Set<string>();
      for (const e of edges) {
        if (e.source === nodeId) neighborIds.add(e.target);
        if (e.target === nodeId) neighborIds.add(e.source);
      }
      return nodes.filter((n) => neighborIds.has(n.id));
    },

    getUniqueChains() {
      const chains = new Set(get().nodes.map((n) => n.chain));
      return Array.from(chains).sort();
    },

    getUniqueTokens() {
      const tokens = new Set(get().edges.map((e) => e.tokenSymbol).filter(Boolean));
      return Array.from(tokens).sort();
    },

    getSnapshot(): MSSnapshot {
      const s = get();
      return {
        uuid: s.uuid,
        title: s.title,
        rootAddress: s.rootAddress,
        rootChain: s.rootChain,
        nodes: JSON.parse(JSON.stringify(s.nodes)),
        edges: JSON.parse(JSON.stringify(s.edges)),
        flows: JSON.parse(JSON.stringify(s.flows)),
        annotations: JSON.parse(JSON.stringify(s.annotations)),
        displayOptions: { ...s.displayOptions },
        filter: { ...s.filter },
        zoom: s.zoom,
        panX: s.panX,
        panY: s.panY,
        savedAt: new Date().toISOString(),
      };
    },

    /* ═══════════════════ VISIBILITY / BATCH ═══════════════════ */

    toggleNodeVisibility(nodeId) {
      set((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.isVisibleOnCanvas = node.isVisibleOnCanvas === false ? true : false;
        }
      });
    },

    toggleEdgeVisibility(edgeId) {
      set((s) => {
        const edge = s.edges.find((e) => e.id === edgeId);
        if (edge) {
          edge.isVisible = edge.isVisible === false ? true : false;
        }
      });
    },

    batchSelectRelated(nodeIds) {
      set((s) => {
        for (const n of s.nodes) {
          n.isSelected = nodeIds.includes(n.id);
        }
      });
    },

    exportEdgeListData(format) {
      const { nodes, edges } = get();
      const rows = edges.map((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        return {
          from: src?.label ?? e.source,
          fromAddress: src?.address ?? e.source,
          to: tgt?.label ?? e.target,
          toAddress: tgt?.address ?? e.target,
          totalAmount: e.totalValue,
          token: e.tokenSymbol,
          chain: e.chain,
          transferCount: e.transferCount,
          txHashes: e.details.map((d) => d.txHash).join(";"),
        };
      });

      if (format === "json") {
        return JSON.stringify(rows, null, 2);
      }
      // CSV
      const headers = Object.keys(rows[0] ?? {}).join(",");
      const csvRows = rows.map((r) =>
        Object.values(r)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`) 
          .join(",")
      );
      return [headers, ...csvRows].join("\n");
    },

    /* ═══════════════════ REACT FLOW + ELK (new) ═══════════════════ */

    setEdgeRoutingMode(mode) {
      set((s) => {
        s.edgeRoutingMode = mode;
      });
      // Re-run ELK layout with new routing mode
      get().runElkLayout();
    },

    setSnapToGrid(enabled) {
      set((s) => {
        s.snapToGrid = enabled;
      });
    },

    toggleMinimap() {
      set((s) => {
        s.showMinimap = !s.showMinimap;
      });
    },

    setBgVariant(variant) {
      set((s) => {
        s.bgVariant = variant;
      });
    },

    async runElkLayout() {
      const state = get();
      const rootId = state.nodes.find((n) => n.isRoot)?.id || state.nodes[0]?.id;
      if (!rootId || state.nodes.length === 0) return;

      set((s) => { s.isLayouting = true; });

      try {
        const { msElkLayout } = await import("@/components/onchain/flow/elk-layout");

        const visibleEdges = state.edges.filter(
          (e) => state.activatedNodeIds.has(e.source) && e.isVisible !== false
        );
        const visibleEdgeIds = new Set(visibleEdges.map((e) => e.id));

        const result = await msElkLayout(
          state.nodes.filter((n) => n.isVisibleOnCanvas !== false),
          state.edges,
          rootId,
          visibleEdgeIds,
          state.nodeSpacing,
          state.edgeRoutingMode as any
        );

        set((s) => {
          // Update node positions from ELK
          for (const laid of result.nodes) {
            const node = s.nodes.find((n) => n.id === laid.id);
            if (node) {
              node.x = laid.x;
              node.y = laid.y;
            }
          }
          // Store edge routes
          s.edgeRoutes = result.edgeRoutes;
          s.isLayouting = false;
        });
      } catch (err) {
        console.error("[CWTracker] ELK layout failed:", err);
        // Fallback to dagre
        set((s) => {
          const visibleEdgeIds = new Set(
            s.edges.filter((e: MSEdge) => s.activatedNodeIds.has(e.source)).map((e: MSEdge) => e.id)
          );
          s.nodes = msDagreLayout(s.nodes, s.edges, rootId!, visibleEdgeIds, s.nodeSpacing) as any;
          s.isLayouting = false;
        });
      }
    },

    copyNode(nodeId) {
      set((s) => {
        s.clipboardNodeId = nodeId;
      });
    },

    pasteNode(x, y) {
      const { clipboardNodeId, nodes } = get();
      if (!clipboardNodeId) return;
      const src = nodes.find((n) => n.id === clipboardNodeId);
      if (!src) return;

      const newId = genId();
      const clone: MSNode = {
        ...JSON.parse(JSON.stringify(src)),
        id: newId,
        x,
        y,
        gridX: 0,
        gridY: 0,
        isRoot: false,
        isSelected: false,
        isExpanded: false,
        isLoading: false,
        isDragging: false,
        label: `${src.label} (copy)`,
      };

      set((s) => {
        s.nodes.push(clone as any);
      });
    },
  }))
);
