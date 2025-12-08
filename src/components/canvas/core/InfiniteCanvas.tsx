// =============================================================================
// 📦 CCCWAYS Canvas - Infinite Canvas Component
// المكون الرئيسي للكانفاس اللانهائي
// =============================================================================

"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { useGestures } from "@/hooks/canvas/useGestures";
import { useViewport } from "@/hooks/canvas/useViewport";
import { useSelection } from "@/hooks/canvas/useSelection";
import { renderCanvas, drawElement, type RendererOptions } from "@/lib/canvas/renderer";
import { findElementAtPoint, getElementsInSelection } from "@/lib/canvas/collision";
import type { Point, CanvasElement, Bounds, CanvasTool } from "@/types/canvas";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface InfiniteCanvasProps {
  className?: string;
  width?: number;
  height?: number;
  readOnly?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  backgroundColor?: string;
  roomId?: string;
  userName?: string;
  userColor?: string;
  showToolbar?: boolean;
  showProperties?: boolean;
  showLayers?: boolean;
  showAI?: boolean;
  showPresence?: boolean;
  gridStyle?: 'dots' | 'lines' | 'none';
  onElementSelect?: (elementIds: string[]) => void;
  onElementCreate?: (element: CanvasElement) => void;
  onElementUpdate?: (elementId: string, updates: Partial<CanvasElement>) => void;
  onElementDelete?: (elementId: string) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
}

export interface InfiniteCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
  render: () => void;
  exportImage: (format?: "png" | "jpeg" | "svg") => string;
  centerContent: () => void;
  zoomTo: (zoom: number) => void;
}

// =============================================================================
// 🎨 Component
// =============================================================================

export const InfiniteCanvas = forwardRef<InfiniteCanvasRef, InfiniteCanvasProps>(
  (
    {
      className,
      width,
      height,
      readOnly = false,
      showGrid = true,
      gridSize = 20,
      backgroundColor = "#ffffff",
      onElementSelect,
      onElementCreate,
      onElementUpdate,
      onElementDelete,
      onViewportChange,
    },
    ref
  ) => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isRenderingRef = useRef(false);

    // State
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [isHovering, setIsHovering] = useState(false);
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

    // Store
    const elementsRecord = useCanvasStore((state) => state.elements);
    const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);
    const selectedIds = useCanvasStore((state) => state.selectedIds);
    const setSelectedIds = useCanvasStore((state) => state.setSelectedIds);
    const viewport = useCanvasStore((state) => state.viewport);
    const setViewport = useCanvasStore((state) => state.setViewport);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const storeShowGrid = useCanvasStore((state) => state.showGrid);
    const isDrawing = useCanvasStore((state) => state.isDrawing);
    const setIsDrawing = useCanvasStore((state) => state.setIsDrawing);
    const isDragging = useCanvasStore((state) => state.isDragging);
    const setIsDragging = useCanvasStore((state) => state.setIsDragging);
    const updateElement = useCanvasStore((state) => state.updateElement);

    // Hooks
    const { screenToWorld, worldToScreen, pan, zoomToPoint, fitContent } = useViewport();
    const { startSelectionBox, updateSelectionBox, endSelectionBox, selectionBox } = useSelection();

    // =============================================================================
    // 📐 Resize Observer
    // =============================================================================

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width: w, height: h } = entry.contentRect;
          setCanvasSize({
            width: width || w,
            height: height || h,
          });
          // Only update viewport zoom, x, y since viewport doesn't have width/height
        }
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, [width, height, setViewport]);

    // =============================================================================
    // 🎨 Render Loop
    // =============================================================================

    const render = useCallback(() => {
      if (isRenderingRef.current) return;
      isRenderingRef.current = true;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx) {
        isRenderingRef.current = false;
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save context state
      ctx.save();

      // Apply viewport transform
      ctx.translate(-viewport.x * viewport.zoom, -viewport.y * viewport.zoom);
      ctx.scale(viewport.zoom, viewport.zoom);

      // Draw grid
      const shouldShowGrid = showGrid || storeShowGrid;
      if (shouldShowGrid) {
        renderCanvas({
          ctx,
          viewport,
          pixelRatio: window.devicePixelRatio || 1,
          showGrid: true,
          gridSize: gridSize,
          selectedIds,
          hoveredId: hoveredElementId,
        });
      }

      // Sort elements by z-index (use 0 if not defined)
      const sortedElements = [...elements].sort((a: CanvasElement, b: CanvasElement) => (a.zIndex || 0) - (b.zIndex || 0));

      // Draw elements
      sortedElements.forEach((element: CanvasElement) => {
        if (!element.visible) return;

        const isSelected = selectedIds.includes(element.id);
        const isHovered = hoveredElementId === element.id;

        // Draw element using imported function
        drawElement(ctx, element, viewport, isSelected, isHovered);

        // Draw hover effect
        if (isHovered && !isSelected) {
          ctx.strokeStyle = "#6366f140";
          ctx.lineWidth = 2 / viewport.zoom;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
        }
      });

      // Draw selection box
      if (selectionBox && selectionBox.bounds.width > 0 && selectionBox.bounds.height > 0) {
        ctx.fillStyle = "#6366f120";
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 1 / viewport.zoom;
        ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
        ctx.fillRect(
          selectionBox.bounds.x,
          selectionBox.bounds.y,
          selectionBox.bounds.width,
          selectionBox.bounds.height
        );
        ctx.strokeRect(
          selectionBox.bounds.x,
          selectionBox.bounds.y,
          selectionBox.bounds.width,
          selectionBox.bounds.height
        );
        ctx.setLineDash([]);
      }

      // Restore context
      ctx.restore();

      isRenderingRef.current = false;
    }, [
      elements,
      selectedIds,
      viewport,
      showGrid,
      storeShowGrid,
      gridSize,
      backgroundColor,
      hoveredElementId,
      selectionBox,
    ]);

    // Animation loop
    useEffect(() => {
      const animate = () => {
        render();
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [render]);

    // =============================================================================
    // 🖱️ Mouse/Touch Handlers
    // =============================================================================

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (readOnly) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenPoint: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const worldPoint = screenToWorld(screenPoint);

        canvas.setPointerCapture(e.pointerId);

        switch (activeTool) {
          case "select": {
            // Check if clicking on an element
            const elementOrder = elements.map((el: CanvasElement) => el.id);
            const clickedElement = findElementAtPoint(
              elements,
              worldPoint,
              elementOrder
            );

            if (clickedElement) {
              if (e.shiftKey) {
                // Toggle selection
                if (selectedIds.includes(clickedElement.id)) {
                  setSelectedIds(selectedIds.filter((id) => id !== clickedElement.id));
                } else {
                  setSelectedIds([...selectedIds, clickedElement.id]);
                }
              } else {
                // Single select or start drag
                if (!selectedIds.includes(clickedElement.id)) {
                  setSelectedIds([clickedElement.id]);
                }
                setIsDragging(true);
              }
            } else {
              // Start selection box
              if (!e.shiftKey) {
                setSelectedIds([]);
              }
              startSelectionBox(worldPoint);
            }
            break;
          }

          case "hand": {
            setIsDragging(true);
            break;
          }

          case "freehand": {
            // Start drawing would be handled here
            setIsDrawing(true);
            break;
          }

          // Other tools...
        }

        onElementSelect?.(selectedIds);
      },
      [
        readOnly,
        activeTool,
        elements,
        selectedIds,
        viewport.zoom,
        screenToWorld,
        setSelectedIds,
        setIsDragging,
        setIsDrawing,
        startSelectionBox,
        onElementSelect,
      ]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenPoint: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const worldPoint = screenToWorld(screenPoint);

        // Update cursor based on hover
        if (!isDragging && !isDrawing) {
          const elementOrder = elements.map((el: CanvasElement) => el.id);
          const hoveredElement = findElementAtPoint(
            elements,
            worldPoint,
            elementOrder
          );
          setHoveredElementId(hoveredElement?.id || null);
        }

        // Handle dragging
        if (isDragging) {
          if (activeTool === "hand") {
            // Pan viewport
            pan(-e.movementX, -e.movementY);
          } else if (activeTool === "select" && selectedIds.length > 0) {
            // Move selected elements
            const delta = {
              x: e.movementX / viewport.zoom,
              y: e.movementY / viewport.zoom,
            };

            selectedIds.forEach((id) => {
              const element = elements.find((el) => el.id === id);
              if (element && !element.locked) {
                updateElement(id, {
                  x: element.x + delta.x,
                  y: element.y + delta.y,
                });
              }
            });
          }
        }

        // Update selection box
        if (selectionBox) {
          updateSelectionBox(worldPoint);
        }
      },
      [
        isDragging,
        isDrawing,
        activeTool,
        selectedIds,
        elements,
        viewport.zoom,
        screenToWorld,
        pan,
        updateElement,
        selectionBox,
        updateSelectionBox,
      ]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.releasePointerCapture(e.pointerId);

        // End selection box
        if (selectionBox) {
          endSelectionBox({ additive: e.shiftKey });
        }

        setIsDragging(false);
        setIsDrawing(false);
      },
      [selectionBox, endSelectionBox, setIsDragging, setIsDrawing]
    );

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenPoint: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const worldPoint = screenToWorld(screenPoint);

        if (e.ctrlKey || e.metaKey) {
          // Zoom
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          zoomToPoint(worldPoint, viewport.zoom * zoomFactor);
        } else {
          // Pan
          pan(e.deltaX, e.deltaY);
        }

        onViewportChange?.({
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        });
      },
      [screenToWorld, zoomToPoint, pan, viewport, onViewportChange]
    );

    // =============================================================================
    // 🔧 Imperative Handle
    // =============================================================================

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getContext: () => canvasRef.current?.getContext("2d") || null,
      render,
      exportImage: (format = "png") => {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        return canvas.toDataURL(`image/${format}`);
      },
      centerContent: () => fitContent(),
      zoomTo: (zoom: number) => setViewport({ zoom }),
    }));

    // =============================================================================
    // 🎨 Cursor Style
    // =============================================================================

    const getCursor = useCallback(() => {
      if (isDragging && activeTool === "hand") return "grabbing";
      if (activeTool === "hand") return "grab";
      if (activeTool === "select" && hoveredElementId) return "move";
      if (activeTool === "text") return "text";
      if (activeTool === "freehand" || activeTool === "eraser") return "crosshair";
      return "default";
    }, [activeTool, isDragging, hoveredElementId]);

    // =============================================================================
    // 🎨 Render
    // =============================================================================

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative w-full h-full overflow-hidden",
          "bg-gray-100 dark:bg-gray-900",
          className
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Main Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="absolute inset-0"
          style={{ cursor: getCursor() }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* Overlay Canvas for UI elements */}
        <canvas
          ref={overlayCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Zoom Indicator */}
        <AnimatePresence>
          {isHovering && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm rounded-lg"
            >
              {Math.round(viewport.zoom * 100)}%
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection Count */}
        <AnimatePresence>
          {selectedIds.length > 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg shadow-lg"
            >
              {selectedIds.length} عناصر محددة
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

InfiniteCanvas.displayName = "InfiniteCanvas";

export default InfiniteCanvas;
