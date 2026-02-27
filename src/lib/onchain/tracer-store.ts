/**
 * Tracer Store — Zustand state management
 * Mirrors cways-tracker internal state: nodes, edges, undo/redo, auto-populate, display options
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TraceNode,
  TraceEdge,
  TraceFlow,
  TraceObject,
  TraceSnapshot,
  GraphDisplayOptions,
  GlobalFilter,
  SidebarTab,
  EntityType,
} from './tracer-types';
import {
  DEFAULT_DISPLAY_OPTIONS,
  DEFAULT_GLOBAL_FILTER,
  assignGridPositions,
  shortenAddress,
  getEntityColor,
  getChainIconUrl,
  TRACER_CONSTANTS,
} from './tracer-types';

/* ─────────── Store State Interface ─────────── */

interface TracerState {
  /* ── Core Data ── */
  uuid: string | null;
  title: string;
  rootAddress: string;
  rootChain: string;
  nodes: TraceNode[];
  edges: TraceEdge[];
  flows: TraceFlow[];

  /* ── Selection ── */
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  fixedNodeIds: string[];
  includedNodeIds: string[];

  /* ── Display ── */
  displayOptions: GraphDisplayOptions;
  filter: GlobalFilter;
  sidebarTab: SidebarTab;
  sidebarOpen: boolean;
  flowPanelOpen: boolean;
  controlMode: 'default' | 'expand' | 'add' | 'remove' | 'fix';

  /* ── Zoom & Pan ── */
  zoom: number;
  panX: number;
  panY: number;

  /* ── Undo/Redo ── */
  undoStack: TraceSnapshot[];
  redoStack: TraceSnapshot[];

  /* ── Status ── */
  isLoading: boolean;
  isPopulating: boolean;
  error: string | null;
  populateIntervalId: ReturnType<typeof setInterval> | null;

  /* ── Trace List ── */
  savedTraces: Array<{
    uuid: string;
    title: string;
    rootAddress: string;
    updatedAt: number;
  }>;
}

/* ─────────── Store Actions Interface ─────────── */

interface TracerActions {
  /* ── Core Actions ── */
  /** Initialize a new trace from an address */
  initTrace: (address: string, chain: string, label?: string) => void;
  /** Load an existing trace */
  loadTrace: (trace: TraceObject) => void;
  /** Reset the entire store */
  resetTrace: () => void;

  /* ── Node Operations ── */
  addNodes: (nodes: TraceNode[]) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<TraceNode>) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  setNodeLoading: (nodeId: string, loading: boolean) => void;
  setNodeExpanded: (nodeId: string, expanded: boolean) => void;
  toggleNodeFixed: (nodeId: string) => void;
  toggleIncludedNode: (nodeId: string) => void;

  /* ── Edge Operations ── */
  addEdges: (edges: TraceEdge[]) => void;
  removeEdge: (edgeId: string) => void;
  selectEdge: (edgeId: string | null) => void;
  highlightEdge: (edgeId: string, highlight: boolean) => void;

  /* ── Flow Operations ── */
  addFlows: (flows: TraceFlow[]) => void;
  clearFlows: () => void;

  /* ── Populate (auto-refresh) ── */
  handlePopulateResult: (newNodes: TraceNode[], newEdges: TraceEdge[]) => void;
  setPopulating: (populating: boolean) => void;
  setPopulateIntervalId: (id: ReturnType<typeof setInterval> | null) => void;

  /* ── Display ── */
  setDisplayOptions: (options: Partial<GraphDisplayOptions>) => void;
  setFilter: (filter: Partial<GlobalFilter>) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void;
  toggleFlowPanel: () => void;
  setControlMode: (mode: 'default' | 'expand' | 'add' | 'remove' | 'fix') => void;

  /* ── Zoom/Pan ── */
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  /* ── Undo/Redo ── */
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  /* ── Status ── */
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUuid: (uuid: string) => void;
  setTitle: (title: string) => void;

  /* ── Traces List ── */
  setSavedTraces: (traces: TracerState['savedTraces']) => void;

  /* ── Layout ── */
  recalculateLayout: () => void;

  /* ── Computed helpers ── */
  getFilteredNodes: () => TraceNode[];
  getFilteredEdges: () => TraceEdge[];
  getNodeById: (id: string) => TraceNode | undefined;
  getEdgesForNode: (nodeId: string) => TraceEdge[];
}

/* ─────────── Initial State ─────────── */

const initialState: TracerState = {
  uuid: null,
  title: '',
  rootAddress: '',
  rootChain: '',
  nodes: [],
  edges: [],
  flows: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  hoveredNodeId: null,
  fixedNodeIds: [],
  includedNodeIds: [],
  displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  filter: { ...DEFAULT_GLOBAL_FILTER },
  sidebarTab: 'inputs',
  sidebarOpen: true,
  flowPanelOpen: false,
  controlMode: 'default',
  zoom: 1,
  panX: 0,
  panY: 0,
  undoStack: [],
  redoStack: [],
  isLoading: false,
  isPopulating: false,
  error: null,
  populateIntervalId: null,
  savedTraces: [],
};

/* ─────────── Store Implementation ─────────── */

export const useTracerStore = create<TracerState & TracerActions>()(
  immer((set, get) => ({
    ...initialState,

    /* ── Core Actions ── */

    initTrace: (address, chain, label) => {
      set(state => {
        Object.assign(state, { ...initialState });
        state.rootAddress = address;
        state.rootChain = chain;
        state.title = label || shortenAddress(address);

        const rootNode: TraceNode = {
          id: address.toLowerCase(),
          label: label || shortenAddress(address),
          subLabel: chain,
          type: 'unknown',
          address: address.toLowerCase(),
          chain,
          gridX: 0,
          gridY: 0,
          x: TRACER_CONSTANTS.xShift,
          y: TRACER_CONSTANTS.yShift,
          isRoot: true,
          isSelected: false,
          isExpanded: false,
          isLoading: false,
          flowsIn: 0,
          flowsOut: 0,
          chainIconUrl: getChainIconUrl(chain),
        };

        state.nodes = [rootNode];
        state.edges = [];
        state.fixedNodeIds = [];
        state.includedNodeIds = [];
        state.undoStack = [];
        state.redoStack = [];
        state.sidebarTab = 'inputs';
      });
    },

    loadTrace: (trace) => {
      set(state => {
        state.uuid = trace.uuid;
        state.title = trace.title;
        state.rootAddress = trace.rootAddress;
        state.rootChain = trace.rootChain;
        state.nodes = trace.nodes;
        state.edges = trace.edges;
        state.displayOptions = trace.displayOptions;
        state.filter = trace.filter;
        state.undoStack = trace.undoStack || [];
        state.redoStack = trace.redoStack || [];
      });
    },

    resetTrace: () => {
      const { populateIntervalId } = get();
      if (populateIntervalId) {
        clearInterval(populateIntervalId);
      }
      set(() => ({ ...initialState }));
    },

    /* ── Node Operations ── */

    addNodes: (newNodes) => {
      set(state => {
        const existingIds = new Set(state.nodes.map(n => n.id));
        const existingAddressKeys = new Set(state.nodes.map(n => normalizeNodeAddressKey(n.address || n.id)));
        const toAdd = newNodes.filter(n => {
          const idKey = n.id;
          const addressKey = normalizeNodeAddressKey(n.address || n.id);
          return !existingIds.has(idKey) && !existingAddressKeys.has(addressKey);
        });
        if (toAdd.length > 0) {
          state.nodes.push(...toAdd);
          // Recalculate grid positions
          const rootId = state.nodes.find(n => n.isRoot)?.id;
          if (rootId) {
            state.nodes = assignGridPositions(state.nodes, state.edges, rootId);
          }
        }
      });
    },

    removeNode: (nodeId) => {
      set(state => {
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        if (state.selectedNodeId === nodeId) state.selectedNodeId = null;
        if (state.hoveredNodeId === nodeId) state.hoveredNodeId = null;
      });
    },

    updateNode: (nodeId, updates) => {
      set(state => {
        const idx = state.nodes.findIndex(n => n.id === nodeId);
        if (idx !== -1) {
          Object.assign(state.nodes[idx], updates);
        }
      });
    },

    selectNode: (nodeId) => {
      set(state => {
        // Deselect previous
        for (const node of state.nodes) {
          node.isSelected = node.id === nodeId;
        }
        state.selectedNodeId = nodeId;
        state.selectedEdgeId = null;
      });
    },

    hoverNode: (nodeId) => {
      set(state => {
        state.hoveredNodeId = nodeId;
      });
    },

    setNodeLoading: (nodeId, loading) => {
      set(state => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) node.isLoading = loading;
      });
    },

    setNodeExpanded: (nodeId, expanded) => {
      set(state => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) node.isExpanded = expanded;
      });
    },

    toggleNodeFixed: (nodeId) => {
      set(state => {
        if (state.fixedNodeIds.includes(nodeId)) {
          state.fixedNodeIds = state.fixedNodeIds.filter(id => id !== nodeId);
        } else {
          state.fixedNodeIds.push(nodeId);
        }
      });
    },

    toggleIncludedNode: (nodeId) => {
      set(state => {
        if (state.includedNodeIds.includes(nodeId)) {
          state.includedNodeIds = state.includedNodeIds.filter(id => id !== nodeId);
        } else {
          state.includedNodeIds.push(nodeId);
        }
      });
    },

    /* ── Edge Operations ── */

    addEdges: (newEdges) => {
      set(state => {
        const existingIds = new Set(state.edges.map(e => e.id));
        const toAdd = newEdges.filter(e => !existingIds.has(e.id));
        if (toAdd.length > 0) {
          state.edges.push(...toAdd);
          // Recalculate grid positions now that edges exist for BFS adjacency
          const rootId = state.nodes.find(n => n.isRoot)?.id;
          if (rootId) {
            state.nodes = assignGridPositions(state.nodes, state.edges, rootId);
          }
        }
      });
    },

    removeEdge: (edgeId) => {
      set(state => {
        state.edges = state.edges.filter(e => e.id !== edgeId);
        if (state.selectedEdgeId === edgeId) state.selectedEdgeId = null;
      });
    },

    selectEdge: (edgeId) => {
      set(state => {
        state.selectedEdgeId = edgeId;
        state.selectedNodeId = null;
      });
    },

    highlightEdge: (edgeId, highlight) => {
      set(state => {
        const edge = state.edges.find(e => e.id === edgeId);
        if (edge) edge.isHighlighted = highlight;
      });
    },

    /* ── Flow Operations ── */

    addFlows: (newFlows) => {
      set(state => {
        state.flows.push(...newFlows);
      });
    },

    clearFlows: () => {
      set(state => {
        state.flows = [];
      });
    },

    /* ── Populate ── */

    handlePopulateResult: (newNodes, newEdges) => {
      set(state => {
        // Add new nodes
        const existingNodeIds = new Set(state.nodes.map(n => n.id));
        const existingAddressKeys = new Set(state.nodes.map(n => normalizeNodeAddressKey(n.address || n.id)));
        const nodesToAdd = newNodes.filter(n => {
          const idKey = n.id;
          const addressKey = normalizeNodeAddressKey(n.address || n.id);
          return !existingNodeIds.has(idKey) && !existingAddressKeys.has(addressKey);
        });
        state.nodes.push(...nodesToAdd);

        // Add new edges
        const existingEdgeIds = new Set(state.edges.map(e => e.id));
        const edgesToAdd = newEdges.filter(e => !existingEdgeIds.has(e.id));
        state.edges.push(...edgesToAdd);

        // Recalculate layout
        const rootId = state.nodes.find(n => n.isRoot)?.id;
        if (rootId) {
          state.nodes = assignGridPositions(state.nodes, state.edges, rootId);
        }
      });
    },

    setPopulating: (populating) => {
      set(state => { state.isPopulating = populating; });
    },

    setPopulateIntervalId: (id) => {
      set(state => { state.populateIntervalId = id; });
    },

    /* ── Display ── */

    setDisplayOptions: (options) => {
      set(state => {
        Object.assign(state.displayOptions, options);
      });
    },

    setFilter: (filter) => {
      set(state => {
        Object.assign(state.filter, filter);
      });
    },

    setSidebarTab: (tab) => {
      set(state => { state.sidebarTab = tab; });
    },

    toggleSidebar: () => {
      set(state => { state.sidebarOpen = !state.sidebarOpen; });
    },

    toggleFlowPanel: () => {
      set(state => { state.flowPanelOpen = !state.flowPanelOpen; });
    },

    setControlMode: (mode) => {
      set(state => { state.controlMode = mode; });
    },

    /* ── Zoom/Pan ── */

    setZoom: (zoom) => {
      set(state => {
        state.zoom = Math.max(TRACER_CONSTANTS.minZoom, Math.min(TRACER_CONSTANTS.maxZoom, zoom));
      });
    },

    setPan: (x, y) => {
      set(state => { state.panX = x; state.panY = y; });
    },

    /* ── Undo/Redo ── */

    pushSnapshot: () => {
      set(state => {
        const snapshot: TraceSnapshot = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
          timestamp: Date.now(),
        };
        state.undoStack.push(snapshot);
        // Limit stack size
        if (state.undoStack.length > 50) {
          state.undoStack.shift();
        }
        // Clear redo on new action
        state.redoStack = [];
      });
    },

    undo: () => {
      set(state => {
        if (state.undoStack.length === 0) return;

        // Save current state to redo
        const currentSnapshot: TraceSnapshot = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
          timestamp: Date.now(),
        };
        state.redoStack.push(currentSnapshot);

        // Pop last undo
        const previous = state.undoStack.pop()!;
        state.nodes = previous.nodes;
        state.edges = previous.edges;
      });
    },

    redo: () => {
      set(state => {
        if (state.redoStack.length === 0) return;

        // Save current to undo
        const currentSnapshot: TraceSnapshot = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
          timestamp: Date.now(),
        };
        state.undoStack.push(currentSnapshot);

        // Pop last redo
        const next = state.redoStack.pop()!;
        state.nodes = next.nodes;
        state.edges = next.edges;
      });
    },

    /* ── Status ── */

    setLoading: (loading) => set(state => { state.isLoading = loading; }),
    setError: (error) => set(state => { state.error = error; }),
    setUuid: (uuid) => set(state => { state.uuid = uuid; }),
    setTitle: (title) => set(state => { state.title = title; }),

    /* ── Traces List ── */

    setSavedTraces: (traces) => set(state => { state.savedTraces = traces; }),

    /* ── Layout ── */

    recalculateLayout: () => {
      set(state => {
        const rootId = state.nodes.find(n => n.isRoot)?.id;
        if (rootId) {
          state.nodes = assignGridPositions(state.nodes, state.edges, rootId);
        }
      });
    },

    /* ── Computed helpers ── */

    getFilteredNodes: () => {
      const { nodes, filter, includedNodeIds } = get();
      return nodes.filter(node => {
        if (includedNodeIds.length > 0 && !node.isRoot && !includedNodeIds.includes(node.id)) return false;
        if (filter.chains.length > 0 && !filter.chains.includes(node.chain)) return false;
        if (filter.entityTypes.length > 0 && !filter.entityTypes.includes(node.type)) return false;
        if (filter.searchQuery) {
          const q = filter.searchQuery.toLowerCase();
          if (!node.label.toLowerCase().includes(q) &&
              !node.address.toLowerCase().includes(q) &&
              !(node.subLabel?.toLowerCase().includes(q))) return false;
        }
        return true;
      });
    },

    getFilteredEdges: () => {
      const { edges, filter, nodes } = get();
      const visibleNodeIds = new Set(
        get().getFilteredNodes().map(n => n.id)
      );

      return edges.filter(edge => {
        if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return false;
        if (filter.chains.length > 0 && !filter.chains.includes(edge.chain)) return false;
        if (filter.direction !== 'both' && edge.direction !== filter.direction) return false;
        if (filter.minValue !== undefined && edge.totalValue < filter.minValue) return false;
        if (filter.maxValue !== undefined && edge.totalValue > filter.maxValue) return false;
        return true;
      });
    },

    getNodeById: (id) => {
      return get().nodes.find(n => n.id === id);
    },

    getEdgesForNode: (nodeId) => {
      return get().edges.filter(e => e.source === nodeId || e.target === nodeId);
    },
  }))
);

function normalizeNodeAddressKey(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const lowered = raw.toLowerCase();
  const hexMatch = lowered.match(/0x[a-f0-9]{8,}/);
  if (hexMatch) return hexMatch[0];

  if (raw.includes(':')) {
    const parts = raw.split(':').filter(Boolean);
    const last = parts[parts.length - 1]?.trim();
    if (last && !/^\d+$/.test(last) && last.length >= 8) {
      return last.toLowerCase();
    }
  }

  return lowered;
}
