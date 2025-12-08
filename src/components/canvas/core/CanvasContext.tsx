// =============================================================================
// 📦 CCCWAYS Canvas - Canvas Context
// سياق React للكانفاس
// =============================================================================

"use client";

import React, { createContext, useContext, useRef, useCallback, useMemo } from "react";
import type { CanvasElement, Point, Viewport, CanvasTool } from "@/types/canvas";
import type { CollaboratorInfo } from "@/types/collaboration";
import { useCanvas } from "@/hooks/canvas/useCanvas";
import { useViewport } from "@/hooks/canvas/useViewport";
import { useHistory } from "@/hooks/canvas/useHistory";
import { useSelection } from "@/hooks/canvas/useSelection";
import { useKeyboard } from "@/hooks/canvas/useKeyboard";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface CanvasContextValue {
  // Canvas ref
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Element operations
  elements: CanvasElement[];
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;

  // Selection
  selectedIds: string[];
  selectedElements: CanvasElement[];
  selectElement: (id: string, options?: { additive?: boolean; toggle?: boolean }) => void;
  deselectAll: () => void;
  selectAll: () => void;
  isSelected: (id: string) => boolean;

  // Viewport
  viewport: Viewport;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (zoom: number) => void;
  pan: (dx: number, dy: number) => void;
  fitContent: () => void;
  centerOn: (point: Point) => void;
  screenToWorld: (point: Point) => Point;
  worldToScreen: (point: Point) => Point;

  // Tools
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;

  // History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // State
  isDrawing: boolean;
  isDragging: boolean;
  setIsDrawing: (value: boolean) => void;
  setIsDragging: (value: boolean) => void;

  // Collaboration
  collaborators: CollaboratorInfo[];
  isConnected: boolean;
}

// =============================================================================
// 🔧 Context Creation
// =============================================================================

const CanvasContext = createContext<CanvasContextValue | null>(null);

// =============================================================================
// 🎣 Hook
// =============================================================================

export function useCanvasContext(): CanvasContextValue {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvasContext must be used within CanvasProvider");
  }
  return context;
}

// =============================================================================
// 🏠 Provider Props
// =============================================================================

export interface CanvasProviderProps {
  children: React.ReactNode;
  initialElements?: CanvasElement[];
  readOnly?: boolean;
  collaborators?: CollaboratorInfo[];
  isConnected?: boolean;
}

// =============================================================================
// 🏠 Provider Component
// =============================================================================

export function CanvasProvider({
  children,
  initialElements = [],
  readOnly = false,
  collaborators = [],
  isConnected = false,
}: CanvasProviderProps) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const canvas = useCanvas();
  const viewportHook = useViewport();
  const history = useHistory();
  const selection = useSelection();

  // Keyboard shortcuts (auto-registers)
  useKeyboard();

  // =============================================================================
  // 📦 Context Value
  // =============================================================================

  const contextValue = useMemo<CanvasContextValue>(
    () => ({
      // Refs
      canvasRef,
      containerRef,

      // Elements
      elements: canvas.elements,
      addElement: readOnly ? () => {} : (element: CanvasElement) => canvas.createShape(
        (element as any).shapeType || 'rectangle',
        { x: element.x, y: element.y },
        { width: element.width, height: element.height },
        element
      ),
      updateElement: readOnly ? () => {} : canvas.updateElement,
      deleteElement: readOnly ? () => {} : canvas.deleteElement,

      // Selection
      selectedIds: selection.selectedIds,
      selectedElements: selection.selectedElements,
      selectElement: selection.select,
      deselectAll: selection.deselectAll,
      selectAll: selection.selectAll,
      isSelected: selection.isSelected,

      // Viewport
      viewport: viewportHook.viewport,
      zoomIn: viewportHook.zoomIn,
      zoomOut: viewportHook.zoomOut,
      setZoom: viewportHook.setZoom,
      pan: viewportHook.pan,
      fitContent: viewportHook.fitContent,
      centerOn: viewportHook.centerOn,
      screenToWorld: viewportHook.screenToWorld,
      worldToScreen: viewportHook.worldToScreen,

      // Tools
      activeTool: canvas.activeTool,
      setActiveTool: readOnly ? () => {} : canvas.setActiveTool,

      // History
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      undo: readOnly ? () => {} : history.undo,
      redo: readOnly ? () => {} : history.redo,

      // State
      isDrawing: canvas.isDrawing,
      isDragging: canvas.isDragging,
      setIsDrawing: canvas.setIsDrawing,
      setIsDragging: canvas.setIsDragging,

      // Collaboration
      collaborators,
      isConnected,
    }),
    [
      canvas,
      viewportHook,
      history,
      selection,
      readOnly,
      collaborators,
      isConnected,
    ]
  );

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
}

// =============================================================================
// 📤 Exports
// =============================================================================

export { CanvasContext };
