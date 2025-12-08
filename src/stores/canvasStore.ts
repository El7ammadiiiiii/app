// =============================================================================
// 🎯 CCCWAYS Canvas - Main Zustand Store
// المتجر الرئيسي للكانفاس مع Immer
// =============================================================================

"use client";

import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import type {
  CanvasState,
  CanvasElement,
  CanvasTool,
  ShapeType,
  Viewport,
  Layer,
  Point,
  StrokeOptions,
  FillOptions,
  HistoryEntry,
  HistoryActionType,
  CANVAS_DEFAULTS,
} from "@/types/canvas";

// ═══════════════════════════════════════════════════════════════════════════
// واجهة الإجراءات
// ═══════════════════════════════════════════════════════════════════════════

interface CanvasActions {
  // ─── العناصر ───
  addElement: (element: Omit<CanvasElement, "id" | "createdAt" | "updatedAt">) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => string[];
  
  // ─── التحديد ───
  setSelectedIds: (ids: string[]) => void;
  selectElements: (ids: string[]) => void; // alias for setSelectedIds
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setHoveredId: (id: string | null) => void;
  
  // ─── الأداة ───
  setActiveTool: (tool: CanvasTool) => void;
  setActiveShapeType: (shapeType: ShapeType) => void;
  
  // ─── العرض ───
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  panTo: (point: Point) => void;
  
  // ─── الأنماط ───
  setDefaultStroke: (stroke: Partial<StrokeOptions>) => void;
  setDefaultFill: (fill: Partial<FillOptions>) => void;
  
  // ─── الطبقات ───
  addLayer: (name?: string) => string;
  deleteLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayer: (id: string | null) => void;
  moveElementToLayer: (elementId: string, layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  
  // ─── الترتيب ───
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;
  
  // ─── التاريخ ───
  undo: () => void;
  redo: () => void;
  saveToHistory: (actionType: HistoryActionType, description: string) => void;
  clearHistory: () => void;
  
  // ─── الشبكة ───
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToElements: () => void;
  
  // ─── الحالة ───
  setIsDrawing: (isDrawing: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  setIsResizing: (isResizing: boolean) => void;
  
  // ─── الحفظ والتحميل ───
  saveCanvas: () => void;
  loadCanvas: (data: Partial<CanvasState>) => void;
  clearCanvas: () => void;
  
  // ─── Getters ───
  getElement: (id: string) => CanvasElement | undefined;
  getSelectedElements: () => CanvasElement[];
  getVisibleElements: () => CanvasElement[];
  getElementsByLayer: (layerId: string) => CanvasElement[];
  
  // ─── التاريخ (State) ───
  history: HistoryEntry[];
  historyIndex: number;
  
  // ─── اسم الكانفاس ───
  canvasName: string;
  setCanvasName: (name: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// الحالة الابتدائية
// ═══════════════════════════════════════════════════════════════════════════

const defaultLayer: Layer = {
  id: "default-layer",
  name: "الطبقة الأساسية",
  visible: true,
  locked: false,
  opacity: 1,
  color: "#00D4B4",
  elementIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const initialState: CanvasState = {
  elements: {},
  elementOrder: [],
  layers: [defaultLayer],
  activeLayerId: "default-layer",
  selectedIds: [],
  selectedElementIds: [], // alias for selectedIds
  hoveredId: null,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 10,
  },
  // Viewport aliases for easier access
  viewportOffset: { x: 0, y: 0 },
  zoom: 1,
  activeTool: "select",
  activeShapeType: "rectangle",
  defaultStroke: {
    color: "#1e1e1e",
    width: 2,
    style: "solid",
    opacity: 1,
  },
  defaultFill: {
    color: "#ffffff",
    style: "solid",
    opacity: 1,
  },
  defaultText: {
    fontFamily: "normal",
    fontSize: 16,
    fontWeight: "normal",
    fontStyle: "normal",
    textAlign: "center",
    lineHeight: 1.5,
    color: "#1e1e1e",
  },
  isDrawing: false,
  isDragging: false,
  isPanning: false,
  isResizing: false,
  canUndo: false,
  canRedo: false,
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  snapToElements: true,
  isLoading: false,
  lastSaved: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// التاريخ (للـ Undo/Redo)
// ═══════════════════════════════════════════════════════════════════════════

const MAX_HISTORY_SIZE = 50;
let historyStore: HistoryEntry[] = [];
let historyIndexStore = -1;

// ═══════════════════════════════════════════════════════════════════════════
// إنشاء المتجر
// ═══════════════════════════════════════════════════════════════════════════

type CanvasStore = CanvasState & CanvasActions & {
  history: HistoryEntry[];
  historyIndex: number;
  canvasName: string;
};

export const useCanvasStore = create<CanvasStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,
      
      // History state
      history: historyStore,
      historyIndex: historyIndexStore,
      canvasName: 'Untitled Canvas',

      // ─────────────────────────────────────────────────────────────────────
      // العناصر
      // ─────────────────────────────────────────────────────────────────────
      
      addElement: (element) => {
        const id = uuidv4();
        const now = new Date();
        const layerId = get().activeLayerId || "default-layer";
        
        set((state) => {
          const newElement = {
            ...element,
            id,
            layerId,
            createdAt: now,
            updatedAt: now,
          } as CanvasElement;
          
          state.elements[id] = newElement;
          state.elementOrder.push(id);
          
          // إضافة للطبقة
          const layer = state.layers.find(l => l.id === layerId);
          if (layer) {
            layer.elementIds.push(id);
          }
        });
        
        get().saveToHistory("create", "إضافة عنصر جديد");
        return id;
      },

      updateElement: (id, updates) => {
        set((state) => {
          if (state.elements[id]) {
            Object.assign(state.elements[id], {
              ...updates,
              updatedAt: new Date(),
            });
          }
        });
      },

      deleteElement: (id) => {
        set((state) => {
          const element = state.elements[id];
          if (element) {
            // إزالة من الطبقة
            const layer = state.layers.find(l => l.id === element.layerId);
            if (layer) {
              layer.elementIds = layer.elementIds.filter(eId => eId !== id);
            }
            
            delete state.elements[id];
            state.elementOrder = state.elementOrder.filter(eId => eId !== id);
            state.selectedIds = state.selectedIds.filter(sId => sId !== id);
          }
        });
        get().saveToHistory("delete", "حذف عنصر");
      },

      deleteElements: (ids) => {
        ids.forEach(id => get().deleteElement(id));
      },

      duplicateElements: (ids) => {
        const newIds: string[] = [];
        const offset = 20;
        
        ids.forEach(id => {
          const element = get().elements[id];
          if (element) {
            const newElement = {
              ...element,
              x: element.x + offset,
              y: element.y + offset,
            };
            delete (newElement as any).id;
            delete (newElement as any).createdAt;
            delete (newElement as any).updatedAt;
            
            const newId = get().addElement(newElement as any);
            newIds.push(newId);
          }
        });
        
        return newIds;
      },

      // ─────────────────────────────────────────────────────────────────────
      // التحديد
      // ─────────────────────────────────────────────────────────────────────
      
      setSelectedIds: (ids) => {
        set((state) => {
          state.selectedIds = ids;
          state.selectedElementIds = ids; // sync alias
        });
      },

      // alias for setSelectedIds
      selectElements: (ids) => {
        set((state) => {
          state.selectedIds = ids;
          state.selectedElementIds = ids; // sync alias
        });
      },

      addToSelection: (id) => {
        set((state) => {
          if (!state.selectedIds.includes(id)) {
            state.selectedIds.push(id);
            state.selectedElementIds = [...state.selectedIds]; // sync alias
          }
        });
      },

      removeFromSelection: (id) => {
        set((state) => {
          state.selectedIds = state.selectedIds.filter(sId => sId !== id);
          state.selectedElementIds = [...state.selectedIds]; // sync alias
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedIds = [];
          state.selectedElementIds = []; // sync alias
        });
      },

      selectAll: () => {
        set((state) => {
          state.selectedIds = [...state.elementOrder];
          state.selectedElementIds = [...state.elementOrder]; // sync alias
        });
      },

      setHoveredId: (id) => {
        set((state) => {
          state.hoveredId = id;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الأداة
      // ─────────────────────────────────────────────────────────────────────
      
      setActiveTool: (tool) => {
        set((state) => {
          state.activeTool = tool;
          // مسح التحديد عند تغيير الأداة (باستثناء select)
          if (tool !== "select") {
            state.selectedIds = [];
          }
        });
      },

      setActiveShapeType: (shapeType) => {
        set((state) => {
          state.activeShapeType = shapeType;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // العرض
      // ─────────────────────────────────────────────────────────────────────
      
      setViewport: (viewport) => {
        set((state) => {
          Object.assign(state.viewport, viewport);
          // تقييد الزوم
          state.viewport.zoom = Math.max(
            state.viewport.minZoom,
            Math.min(state.viewport.maxZoom, state.viewport.zoom)
          );
        });
      },

      zoomIn: () => {
        set((state) => {
          state.viewport.zoom = Math.min(
            state.viewport.maxZoom,
            state.viewport.zoom * 1.2
          );
        });
      },

      zoomOut: () => {
        set((state) => {
          state.viewport.zoom = Math.max(
            state.viewport.minZoom,
            state.viewport.zoom / 1.2
          );
        });
      },

      zoomToFit: () => {
        // حساب الحدود لكل العناصر
        const elements = Object.values(get().elements);
        if (elements.length === 0) {
          get().resetZoom();
          return;
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        elements.forEach(el => {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + el.width);
          maxY = Math.max(maxY, el.y + el.height);
        });
        
        const padding = 50;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        
        // افتراض أن viewport هو 1000x800
        const viewportWidth = 1000;
        const viewportHeight = 800;
        
        const zoom = Math.min(
          viewportWidth / contentWidth,
          viewportHeight / contentHeight,
          1
        );
        
        set((state) => {
          state.viewport.zoom = zoom;
          state.viewport.x = minX - padding;
          state.viewport.y = minY - padding;
        });
      },

      resetZoom: () => {
        set((state) => {
          state.viewport.zoom = 1;
          state.viewport.x = 0;
          state.viewport.y = 0;
        });
      },

      panTo: (point) => {
        set((state) => {
          state.viewport.x = point.x;
          state.viewport.y = point.y;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الأنماط
      // ─────────────────────────────────────────────────────────────────────
      
      setDefaultStroke: (stroke) => {
        set((state) => {
          Object.assign(state.defaultStroke, stroke);
        });
      },

      setDefaultFill: (fill) => {
        set((state) => {
          Object.assign(state.defaultFill, fill);
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الطبقات
      // ─────────────────────────────────────────────────────────────────────
      
      addLayer: (name) => {
        const id = uuidv4();
        const now = new Date();
        
        set((state) => {
          state.layers.push({
            id,
            name: name || `طبقة ${state.layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 1,
            color: "#00D4B4",
            elementIds: [],
            createdAt: now,
            updatedAt: now,
          });
          state.activeLayerId = id;
        });
        
        return id;
      },

      deleteLayer: (id) => {
        set((state) => {
          if (state.layers.length <= 1) return; // لا يمكن حذف آخر طبقة
          
          const layer = state.layers.find(l => l.id === id);
          if (layer) {
            // حذف عناصر الطبقة
            layer.elementIds.forEach(eId => {
              delete state.elements[eId];
              state.elementOrder = state.elementOrder.filter(oId => oId !== eId);
            });
            
            state.layers = state.layers.filter(l => l.id !== id);
            
            // تعيين طبقة نشطة جديدة
            if (state.activeLayerId === id) {
              state.activeLayerId = state.layers[0]?.id || null;
            }
          }
        });
      },

      updateLayer: (id, updates) => {
        set((state) => {
          const layer = state.layers.find(l => l.id === id);
          if (layer) {
            Object.assign(layer, updates, { updatedAt: new Date() });
          }
        });
      },

      setActiveLayer: (id) => {
        set((state) => {
          state.activeLayerId = id;
        });
      },

      moveElementToLayer: (elementId, layerId) => {
        set((state) => {
          const element = state.elements[elementId];
          if (element) {
            // إزالة من الطبقة القديمة
            const oldLayer = state.layers.find(l => l.id === element.layerId);
            if (oldLayer) {
              oldLayer.elementIds = oldLayer.elementIds.filter(id => id !== elementId);
            }
            
            // إضافة للطبقة الجديدة
            const newLayer = state.layers.find(l => l.id === layerId);
            if (newLayer) {
              newLayer.elementIds.push(elementId);
              element.layerId = layerId;
            }
          }
        });
      },

      reorderLayers: (fromIndex, toIndex) => {
        set((state) => {
          const [layer] = state.layers.splice(fromIndex, 1);
          state.layers.splice(toIndex, 0, layer);
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الترتيب
      // ─────────────────────────────────────────────────────────────────────
      
      bringToFront: (ids) => {
        set((state) => {
          const remaining = state.elementOrder.filter(id => !ids.includes(id));
          state.elementOrder = [...remaining, ...ids];
        });
      },

      sendToBack: (ids) => {
        set((state) => {
          const remaining = state.elementOrder.filter(id => !ids.includes(id));
          state.elementOrder = [...ids, ...remaining];
        });
      },

      bringForward: (ids) => {
        set((state) => {
          ids.forEach(id => {
            const index = state.elementOrder.indexOf(id);
            if (index < state.elementOrder.length - 1) {
              [state.elementOrder[index], state.elementOrder[index + 1]] = 
              [state.elementOrder[index + 1], state.elementOrder[index]];
            }
          });
        });
      },

      sendBackward: (ids) => {
        set((state) => {
          ids.forEach(id => {
            const index = state.elementOrder.indexOf(id);
            if (index > 0) {
              [state.elementOrder[index], state.elementOrder[index - 1]] = 
              [state.elementOrder[index - 1], state.elementOrder[index]];
            }
          });
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // التاريخ
      // ─────────────────────────────────────────────────────────────────────
      
      saveToHistory: (actionType, description) => {
        const state = get();
        const entry: HistoryEntry = {
          id: uuidv4(),
          type: actionType,
          timestamp: new Date(),
          elements: JSON.parse(JSON.stringify(state.elements)),
          selectedIds: [...state.selectedIds],
          description,
        };
        
        // قطع التاريخ المستقبلي
        historyStore = historyStore.slice(0, historyIndexStore + 1);
        historyStore.push(entry);
        
        // تقييد حجم التاريخ
        if (historyStore.length > MAX_HISTORY_SIZE) {
          historyStore = historyStore.slice(-MAX_HISTORY_SIZE);
        }
        
        historyIndexStore = historyStore.length - 1;
        
        set((state) => {
          state.canUndo = historyIndexStore > 0;
          state.canRedo = false;
          state.history = historyStore;
          state.historyIndex = historyIndexStore;
        });
      },

      undo: () => {
        if (historyIndexStore > 0) {
          historyIndexStore--;
          const entry = historyStore[historyIndexStore];
          
          set((state) => {
            state.elements = JSON.parse(JSON.stringify(entry.elements));
            state.elementOrder = Object.keys(entry.elements);
            state.selectedIds = entry.selectedIds;
            state.canUndo = historyIndexStore > 0;
            state.canRedo = true;
            state.history = historyStore;
            state.historyIndex = historyIndexStore;
          });
        }
      },

      redo: () => {
        if (historyIndexStore < historyStore.length - 1) {
          historyIndexStore++;
          const entry = historyStore[historyIndexStore];
          
          set((state) => {
            state.elements = JSON.parse(JSON.stringify(entry.elements));
            state.elementOrder = Object.keys(entry.elements);
            state.selectedIds = entry.selectedIds;
            state.canUndo = true;
            state.canRedo = historyIndexStore < historyStore.length - 1;
            state.history = historyStore;
            state.historyIndex = historyIndexStore;
          });
        }
      },

      clearHistory: () => {
        historyStore = [];
        historyIndexStore = -1;
        set((state) => {
          state.canUndo = false;
          state.canRedo = false;
          state.history = historyStore;
          state.historyIndex = historyIndexStore;
        });
      },

      setCanvasName: (name) => {
        set((state) => {
          state.canvasName = name;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الشبكة
      // ─────────────────────────────────────────────────────────────────────
      
      toggleGrid: () => {
        set((state) => {
          state.showGrid = !state.showGrid;
        });
      },

      toggleSnapToGrid: () => {
        set((state) => {
          state.snapToGrid = !state.snapToGrid;
        });
      },

      setGridSize: (size) => {
        set((state) => {
          state.gridSize = size;
        });
      },

      toggleSnapToElements: () => {
        set((state) => {
          state.snapToElements = !state.snapToElements;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الحالة
      // ─────────────────────────────────────────────────────────────────────
      
      setIsDrawing: (isDrawing) => {
        set((state) => {
          state.isDrawing = isDrawing;
        });
      },

      setIsDragging: (isDragging) => {
        set((state) => {
          state.isDragging = isDragging;
        });
      },

      setIsPanning: (isPanning) => {
        set((state) => {
          state.isPanning = isPanning;
        });
      },

      setIsResizing: (isResizing) => {
        set((state) => {
          state.isResizing = isResizing;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // الحفظ والتحميل
      // ─────────────────────────────────────────────────────────────────────
      
      saveCanvas: () => {
        set((state) => {
          state.lastSaved = new Date();
        });
        // يمكن إضافة منطق الحفظ للخادم هنا
      },

      loadCanvas: (data) => {
        set((state) => {
          Object.assign(state, data);
        });
      },

      clearCanvas: () => {
        historyStore = [];
        historyIndexStore = -1;
        set((state) => {
          state.elements = {};
          state.elementOrder = [];
          state.selectedIds = [];
          state.layers = [defaultLayer];
          state.activeLayerId = "default-layer";
          state.history = historyStore;
          state.historyIndex = historyIndexStore;
          state.canUndo = false;
          state.canRedo = false;
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // Getters
      // ─────────────────────────────────────────────────────────────────────
      
      getElement: (id) => {
        return get().elements[id];
      },

      getSelectedElements: () => {
        const state = get();
        return state.selectedIds
          .map(id => state.elements[id])
          .filter(Boolean);
      },

      getVisibleElements: () => {
        const state = get();
        const visibleLayerIds = state.layers
          .filter(l => l.visible)
          .map(l => l.id);
        
        return state.elementOrder
          .map(id => state.elements[id])
          .filter(el => el && el.visible && visibleLayerIds.includes(el.layerId));
      },

      getElementsByLayer: (layerId) => {
        const state = get();
        const layer = state.layers.find(l => l.id === layerId);
        if (!layer) return [];
        
        return layer.elementIds
          .map(id => state.elements[id])
          .filter(Boolean);
      },
    }))
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// Selectors للأداء
// ═══════════════════════════════════════════════════════════════════════════

export const selectElements = (state: CanvasStore) => state.elements;
export const selectSelectedIds = (state: CanvasStore) => state.selectedIds;
export const selectViewport = (state: CanvasStore) => state.viewport;
export const selectActiveTool = (state: CanvasStore) => state.activeTool;
export const selectLayers = (state: CanvasStore) => state.layers;
export const selectShowGrid = (state: CanvasStore) => state.showGrid;
export const selectIsDrawing = (state: CanvasStore) => state.isDrawing;
