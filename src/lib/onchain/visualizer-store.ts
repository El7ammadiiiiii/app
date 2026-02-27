/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Visualizer Zustand Store                                       ║
 * ║  Central state management for Entity + Token visualizer modes   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ControlMode,
  EntityVisualizerState,
  FlowDirection,
  GraphData,
  HiddenTypes,
  InfoObject,
  TokenVisualizerState,
  TransferFilter,
  Transfer,
  TokenHolder,
  VizNode,
} from './visualizer-types';
import {
  DEFAULT_ENTITY_FILTER,
  DEFAULT_TOKEN_FILTER,
  LEGEND_CATEGORIES,
} from './visualizer-types';

/* ═══════════════════════ Visualizer Mode ════════════════════════ */

export type VisualizerMode = 'empty' | 'entity' | 'token';

/* ═══════════════════════ Store Shape ════════════════════════════ */

export interface VisualizerStore {
  /* ── Mode ── */
  mode: VisualizerMode;
  setMode: (mode: VisualizerMode) => void;

  /* ── Control Mode ── */
  controlMode: ControlMode;
  setControlMode: (m: ControlMode) => void;

  /* ── Entity State ── */
  entityState: EntityVisualizerState;
  setEntityState: (s: EntityVisualizerState) => void;
  setEntityBase: (base: string[]) => void;
  addToBase: (id: string) => void;
  removeFromBase: (id: string) => void;
  setEntityFilter: (f: TransferFilter) => void;

  /* ── Token State ── */
  tokenState: TokenVisualizerState;
  setTokenState: (s: TokenVisualizerState) => void;
  setTokenFilter: (f: TransferFilter) => void;
  setTokenHolders: (h: TokenHolder[]) => void;

  /* ── Graph Data ── */
  graphData: GraphData;
  setGraphData: (d: GraphData) => void;

  /* ── Transfers (fetched) ── */
  transfers: Transfer[];
  setTransfers: (t: Transfer[]) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;

  /* ── Drawer ── */
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  toggleDrawer: () => void;

  /* ── Info Panel ── */
  infoObject: InfoObject;
  setInfoObject: (o: InfoObject) => void;

  /* ── Hidden Types ── */
  hiddenTypes: HiddenTypes;
  setHiddenTypes: (h: HiddenTypes) => void;
  toggleEntityType: (types: string[]) => void;

  /* ── Flow Direction ── */
  flowDirection: FlowDirection;
  setFlowDirection: (f: FlowDirection) => void;

  /* ── Expanded Entities ── */
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;

  /* ── Fixed Nodes ── */
  fixNode: (node: VizNode) => void;
  unfixNode: (node: VizNode) => void;
  freezeAll: (nodes: VizNode[]) => void;
  unfreezeAll: (nodes: VizNode[]) => void;

  /* ── Reset ── */
  reset: () => void;
}

/* ═══════════════════════ Initial Hidden Types ══════════════════ */

function initHiddenTypes(): HiddenTypes {
  return LEGEND_CATEGORIES.reduce((acc, cat) => {
    cat.types.forEach((t) => {
      acc[t] = false;
    });
    return acc;
  }, {} as HiddenTypes);
}

/* ═══════════════════════ Store Implementation ══════════════════ */

export const useVisualizerStore = create<VisualizerStore>()(
  immer((set) => ({
    /* ── Mode ── */
    mode: 'empty',
    setMode: (mode) => set((s) => { s.mode = mode; }),

    /* ── Control Mode ── */
    controlMode: 'default',
    setControlMode: (m) => set((s) => { s.controlMode = m; }),

    /* ── Entity State ── */
    entityState: {
      filter: { ...DEFAULT_ENTITY_FILTER },
      base: [],
      manuallyFixed: {},
    },
    setEntityState: (state) => set((s) => { s.entityState = state; }),
    setEntityBase: (base) =>
      set((s) => {
        s.entityState.base = base;
      }),
    addToBase: (id) =>
      set((s) => {
        if (!s.entityState.base.includes(id)) {
          s.entityState.base.push(id);
        }
      }),
    removeFromBase: (id) =>
      set((s) => {
        s.entityState.base = s.entityState.base.filter((b) => b !== id);
      }),
    setEntityFilter: (f) =>
      set((s) => {
        s.entityState.filter = f;
      }),

    /* ── Token State ── */
    tokenState: {
      filter: { ...DEFAULT_TOKEN_FILTER },
      holders: [],
      manuallyFixed: {},
    },
    setTokenState: (state) => set((s) => { s.tokenState = state; }),
    setTokenFilter: (f) =>
      set((s) => {
        s.tokenState.filter = f;
      }),
    setTokenHolders: (h) =>
      set((s) => {
        s.tokenState.holders = h;
      }),

    /* ── Graph Data ── */
    graphData: { nodes: [], links: [] },
    setGraphData: (d) => set((s) => { s.graphData = d; }),

    /* ── Transfers ── */
    transfers: [],
    setTransfers: (t) => set((s) => { s.transfers = t; }),
    isLoading: false,
    setIsLoading: (v) => set((s) => { s.isLoading = v; }),
    error: null,
    setError: (e) => set((s) => { s.error = e; }),

    /* ── Drawer ── */
    drawerOpen: false,
    setDrawerOpen: (v) => set((s) => { s.drawerOpen = v; }),
    toggleDrawer: () => set((s) => { s.drawerOpen = !s.drawerOpen; }),

    /* ── Info Panel ── */
    infoObject: null,
    setInfoObject: (o) => set((s) => { s.infoObject = o; }),

    /* ── Hidden Types ── */
    hiddenTypes: initHiddenTypes(),
    setHiddenTypes: (h) => set((s) => { s.hiddenTypes = h; }),
    toggleEntityType: (types) =>
      set((s) => {
        const isAnyHidden = types.some((t) => s.hiddenTypes[t]);
        types.forEach((t) => {
          s.hiddenTypes[t] = !isAnyHidden;
        });
      }),

    /* ── Flow Direction ── */
    flowDirection: 'all',
    setFlowDirection: (f) => set((s) => { s.flowDirection = f; }),

    /* ── Expanded ── */
    expanded: {},
    toggleExpanded: (id) =>
      set((s) => {
        s.expanded[id] = !s.expanded[id];
      }),

    /* ── Fix / Unfix ── */
    fixNode: (node) =>
      set((s) => {
        const x = node.x != null ? Math.round(node.x) : 0;
        const y = node.y != null ? Math.round(node.y) : 0;
        node.fx = x;
        node.fy = y;
        if (s.mode === 'entity') {
          s.entityState.manuallyFixed[node.id] = { fx: x, fy: y };
        } else {
          s.tokenState.manuallyFixed[node.id] = { fx: x, fy: y };
        }
      }),
    unfixNode: (node) =>
      set((s) => {
        node.fx = undefined;
        node.fy = undefined;
        if (s.mode === 'entity') {
          delete s.entityState.manuallyFixed[node.id];
        } else {
          delete s.tokenState.manuallyFixed[node.id];
        }
      }),
    freezeAll: (nodes) =>
      set(() => {
        nodes.forEach((n) => {
          n.fx = n.x;
          n.fy = n.y;
        });
      }),
    unfreezeAll: (nodes) =>
      set((s) => {
        const fixed =
          s.mode === 'entity' ? s.entityState.manuallyFixed : s.tokenState.manuallyFixed;
        nodes.forEach((n) => {
          if (n.id && fixed[n.id]) {
            n.fx = fixed[n.id].fx;
            n.fy = fixed[n.id].fy;
          } else {
            n.fx = undefined;
            n.fy = undefined;
          }
        });
      }),

    /* ── Reset ── */
    reset: () =>
      set((s) => {
        s.mode = 'empty';
        s.controlMode = 'default';
        s.entityState = { filter: { ...DEFAULT_ENTITY_FILTER }, base: [], manuallyFixed: {} };
        s.tokenState = { filter: { ...DEFAULT_TOKEN_FILTER }, holders: [], manuallyFixed: {} };
        s.graphData = { nodes: [], links: [] };
        s.transfers = [];
        s.isLoading = false;
        s.error = null;
        s.drawerOpen = false;
        s.infoObject = null;
        s.hiddenTypes = initHiddenTypes();
        s.flowDirection = 'all';
        s.expanded = {};
      }),
  })),
);
