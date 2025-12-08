// =============================================================================
// 📦 CCCWAYS Canvas - useGestures Hook
// Hook للتعامل مع إيماءات اللمس والماوس
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { Point } from "@/types/canvas";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface GestureState {
  isDragging: boolean;
  isPinching: boolean;
  isPanning: boolean;
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  delta: Point;
  pinchScale: number;
  pinchCenter: Point | null;
}

export interface GestureCallbacks {
  onDragStart?: (point: Point, event: PointerEvent) => void;
  onDrag?: (point: Point, delta: Point, event: PointerEvent) => void;
  onDragEnd?: (point: Point, event: PointerEvent) => void;
  onPinchStart?: (center: Point, scale: number) => void;
  onPinch?: (center: Point, scale: number, delta: number) => void;
  onPinchEnd?: () => void;
  onPanStart?: (point: Point) => void;
  onPan?: (delta: Point) => void;
  onPanEnd?: () => void;
  onDoubleTap?: (point: Point) => void;
  onLongPress?: (point: Point) => void;
  onWheel?: (delta: Point, point: Point) => void;
}

export interface GestureOptions {
  enablePinch?: boolean;
  enablePan?: boolean;
  enableDrag?: boolean;
  enableWheel?: boolean;
  enableDoubleTap?: boolean;
  enableLongPress?: boolean;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
}

const DEFAULT_OPTIONS: GestureOptions = {
  enablePinch: true,
  enablePan: true,
  enableDrag: true,
  enableWheel: true,
  enableDoubleTap: true,
  enableLongPress: true,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.01,
};

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [gestureState, setGestureState] = useState<GestureState>({
    isDragging: false,
    isPinching: false,
    isPanning: false,
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    delta: { x: 0, y: 0 },
    pinchScale: 1,
    pinchCenter: null,
  });

  // Refs for tracking
  const pointersRef = useRef<Map<number, PointerEvent>>(new Map());
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const lastPinchDistanceRef = useRef<number>(0);

  // Store for viewport
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);

  // =============================================================================
  // 🔧 Utility Functions
  // =============================================================================

  /**
   * الحصول على نقطة من الحدث
   */
  const getPointFromEvent = useCallback(
    (e: PointerEvent | MouseEvent | Touch): Point => {
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [elementRef]
  );

  /**
   * حساب المسافة بين نقطتين
   */
  const getDistance = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * حساب نقطة الوسط
   */
  const getMidpoint = (p1: Point, p2: Point): Point => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  // =============================================================================
  // 📱 Pointer Events
  // =============================================================================

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      pointersRef.current.set(e.pointerId, e);
      const point = getPointFromEvent(e);
      startPointRef.current = point;

      // Check for pinch (2 fingers)
      if (pointersRef.current.size === 2 && opts.enablePinch) {
        const pointers = Array.from(pointersRef.current.values());
        const p1 = getPointFromEvent(pointers[0]);
        const p2 = getPointFromEvent(pointers[1]);
        const center = getMidpoint(p1, p2);
        const distance = getDistance(p1, p2);

        lastPinchDistanceRef.current = distance;

        setGestureState((prev) => ({
          ...prev,
          isPinching: true,
          pinchCenter: center,
          pinchScale: 1,
        }));

        callbacks.onPinchStart?.(center, 1);
        return;
      }

      // Single pointer - check for pan or drag
      if (pointersRef.current.size === 1) {
        // Check for double tap
        if (opts.enableDoubleTap) {
          const now = Date.now();
          if (now - lastTapRef.current < (opts.doubleTapDelay || 300)) {
            callbacks.onDoubleTap?.(point);
            lastTapRef.current = 0;
            return;
          }
          lastTapRef.current = now;
        }

        // Start long press timer
        if (opts.enableLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            callbacks.onLongPress?.(point);
          }, opts.longPressDelay || 500);
        }

        // Check if middle button or space+drag for pan
        if (e.button === 1 && opts.enablePan) {
          setGestureState((prev) => ({
            ...prev,
            isPanning: true,
            startPoint: point,
            currentPoint: point,
          }));
          callbacks.onPanStart?.(point);
        } else if (opts.enableDrag) {
          setGestureState((prev) => ({
            ...prev,
            isDragging: true,
            startPoint: point,
            currentPoint: point,
            delta: { x: 0, y: 0 },
          }));
          callbacks.onDragStart?.(point, e);
        }
      }
    },
    [callbacks, opts, getPointFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      pointersRef.current.set(e.pointerId, e);
      const point = getPointFromEvent(e);

      // Clear long press timer on move
      if (longPressTimerRef.current && startPointRef.current) {
        const moved = getDistance(point, startPointRef.current);
        if (moved > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      // Handle pinch
      if (gestureState.isPinching && pointersRef.current.size === 2) {
        const pointers = Array.from(pointersRef.current.values());
        const p1 = getPointFromEvent(pointers[0]);
        const p2 = getPointFromEvent(pointers[1]);
        const center = getMidpoint(p1, p2);
        const distance = getDistance(p1, p2);

        if (lastPinchDistanceRef.current > 0) {
          const scale = distance / lastPinchDistanceRef.current;
          const deltaScale = scale - gestureState.pinchScale;

          if (Math.abs(deltaScale) > (opts.pinchThreshold || 0.01)) {
            setGestureState((prev) => ({
              ...prev,
              pinchScale: scale,
              pinchCenter: center,
            }));
            callbacks.onPinch?.(center, scale, deltaScale);
          }
        }
        return;
      }

      // Handle panning
      if (gestureState.isPanning && gestureState.startPoint) {
        const delta = {
          x: point.x - gestureState.currentPoint!.x,
          y: point.y - gestureState.currentPoint!.y,
        };

        setGestureState((prev) => ({
          ...prev,
          currentPoint: point,
          delta,
        }));

        callbacks.onPan?.(delta);
        return;
      }

      // Handle dragging
      if (gestureState.isDragging && gestureState.startPoint) {
        const delta = {
          x: point.x - gestureState.currentPoint!.x,
          y: point.y - gestureState.currentPoint!.y,
        };

        setGestureState((prev) => ({
          ...prev,
          currentPoint: point,
          delta,
        }));

        callbacks.onDrag?.(point, delta, e);
      }
    },
    [callbacks, opts, gestureState, getPointFromEvent]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      const point = getPointFromEvent(e);

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Handle pinch end
      if (gestureState.isPinching) {
        if (pointersRef.current.size < 2) {
          setGestureState((prev) => ({
            ...prev,
            isPinching: false,
            pinchScale: 1,
            pinchCenter: null,
          }));
          callbacks.onPinchEnd?.();
        }
        return;
      }

      // Handle pan end
      if (gestureState.isPanning) {
        setGestureState((prev) => ({
          ...prev,
          isPanning: false,
          startPoint: null,
          currentPoint: null,
        }));
        callbacks.onPanEnd?.();
        return;
      }

      // Handle drag end
      if (gestureState.isDragging) {
        setGestureState((prev) => ({
          ...prev,
          isDragging: false,
          startPoint: null,
          currentPoint: null,
          delta: { x: 0, y: 0 },
        }));
        callbacks.onDragEnd?.(point, e);
      }
    },
    [callbacks, gestureState, getPointFromEvent]
  );

  const handlePointerCancel = useCallback(
    (e: PointerEvent) => {
      handlePointerUp(e);
    },
    [handlePointerUp]
  );

  // =============================================================================
  // 🖱️ Wheel Event
  // =============================================================================

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!opts.enableWheel) return;
      e.preventDefault();

      const point = getPointFromEvent(e as any);
      const delta = {
        x: e.deltaX,
        y: e.deltaY,
      };

      callbacks.onWheel?.(delta, point);
    },
    [callbacks, opts.enableWheel, getPointFromEvent]
  );

  // =============================================================================
  // 🔌 Event Listeners
  // =============================================================================

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerCancel);
    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerCancel);
      element.removeEventListener("wheel", handleWheel);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [
    elementRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleWheel,
  ]);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    gestureState,
    reset: () => {
      pointersRef.current.clear();
      setGestureState({
        isDragging: false,
        isPinching: false,
        isPanning: false,
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        delta: { x: 0, y: 0 },
        pinchScale: 1,
        pinchCenter: null,
      });
    },
  };
}

// =============================================================================
// 🔧 Helper Hook for Pan & Zoom
// =============================================================================

export function usePanZoom(
  elementRef: React.RefObject<HTMLElement>,
  options?: {
    minZoom?: number;
    maxZoom?: number;
    zoomSpeed?: number;
  }
) {
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);

  const opts = {
    minZoom: 0.1,
    maxZoom: 10,
    zoomSpeed: 0.001,
    ...options,
  };

  const callbacks: GestureCallbacks = {
    onPan: (delta) => {
      setViewport({
        x: viewport.x - delta.x / viewport.zoom,
        y: viewport.y - delta.y / viewport.zoom,
      });
    },

    onPinch: (center, scale) => {
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return;

      const worldPoint = {
        x: viewport.x + center.x / viewport.zoom,
        y: viewport.y + center.y / viewport.zoom,
      };

      const newZoom = Math.max(
        opts.minZoom,
        Math.min(opts.maxZoom, viewport.zoom * scale)
      );

      setViewport({
        x: worldPoint.x - center.x / newZoom,
        y: worldPoint.y - center.y / newZoom,
        zoom: newZoom,
      });
    },

    onWheel: (delta, point) => {
      // Zoom with scroll
      if (delta.y !== 0) {
        const worldPoint = {
          x: viewport.x + point.x / viewport.zoom,
          y: viewport.y + point.y / viewport.zoom,
        };

        const zoomDelta = -delta.y * opts.zoomSpeed;
        const newZoom = Math.max(
          opts.minZoom,
          Math.min(opts.maxZoom, viewport.zoom * (1 + zoomDelta))
        );

        setViewport({
          x: worldPoint.x - point.x / newZoom,
          y: worldPoint.y - point.y / newZoom,
          zoom: newZoom,
        });
      }

      // Pan with horizontal scroll
      if (delta.x !== 0) {
        setViewport({
          x: viewport.x + delta.x / viewport.zoom,
        });
      }
    },
  };

  return useGestures(elementRef, callbacks, {
    enablePinch: true,
    enablePan: true,
    enableWheel: true,
    enableDrag: false,
  });
}
