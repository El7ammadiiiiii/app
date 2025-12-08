// =============================================================================
// 📦 CCCWAYS Canvas - useViewport Hook
// Hook للتحكم في منطقة العرض والتكبير والتصغير
// =============================================================================

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { Point, Viewport, Bounds, CanvasElement } from "@/types/canvas";
import { CANVAS_DEFAULTS } from "@/types/canvas";

// =============================================================================
// ⚙️ Constants
// =============================================================================

const ZOOM_SPEED = 0.1;
const PAN_SPEED = 1;
const ANIMATION_DURATION = 300;
const MIN_ZOOM = CANVAS_DEFAULTS.viewport.minZoom;
const MAX_ZOOM = CANVAS_DEFAULTS.viewport.maxZoom;

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useViewport() {
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const elementsRecord = useCanvasStore((state) => state.elements);
  
  // Convert elements record to array
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);

  const animationRef = useRef<number | null>(null);

  // =============================================================================
  // 🔍 Zoom Operations
  // =============================================================================

  /**
   * تكبير بمقدار محدد
   */
  const zoomIn = useCallback(
    (amount: number = ZOOM_SPEED) => {
      const newZoom = Math.min(
        viewport.zoom + amount,
        MAX_ZOOM
      );
      setViewport({ zoom: newZoom });
    },
    [viewport.zoom, setViewport]
  );

  /**
   * تصغير بمقدار محدد
   */
  const zoomOut = useCallback(
    (amount: number = ZOOM_SPEED) => {
      const newZoom = Math.max(
        viewport.zoom - amount,
        MIN_ZOOM
      );
      setViewport({ zoom: newZoom });
    },
    [viewport.zoom, setViewport]
  );

  /**
   * تعيين مستوى التكبير
   */
  const setZoom = useCallback(
    (zoom: number) => {
      const clampedZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, zoom)
      );
      setViewport({ zoom: clampedZoom });
    },
    [setViewport]
  );

  /**
   * التكبير نحو نقطة محددة
   */
  const zoomToPoint = useCallback(
    (point: Point, newZoom: number) => {
      const clampedZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, newZoom)
      );

      // Calculate offset to keep the point fixed
      const zoomRatio = clampedZoom / viewport.zoom;
      const newX = point.x - (point.x - viewport.x) * zoomRatio;
      const newY = point.y - (point.y - viewport.y) * zoomRatio;

      setViewport({
        x: newX,
        y: newY,
        zoom: clampedZoom,
      });
    },
    [viewport, setViewport]
  );

  /**
   * إعادة تعيين التكبير
   */
  const resetZoom = useCallback(() => {
    setViewport({ zoom: 1 });
  }, [setViewport]);

  /**
   * ملاءمة المحتوى
   */
  const fitContent = useCallback(
    (padding: number = 50, viewportSize: { width: number; height: number } = { width: 1920, height: 1080 }) => {
      if (elements.length === 0) {
        setViewport({ x: 0, y: 0, zoom: 1 });
        return;
      }

      // Calculate bounds of all elements
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      elements.forEach((el: CanvasElement) => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });

      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;

      const zoomX = viewportSize.width / contentWidth;
      const zoomY = viewportSize.height / contentHeight;
      const zoom = Math.min(zoomX, zoomY, 1);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setViewport({
        x: centerX - viewportSize.width / zoom / 2,
        y: centerY - viewportSize.height / zoom / 2,
        zoom: Math.max(MIN_ZOOM, Math.min(1, zoom)),
      });
    },
    [elements, setViewport]
  );

  /**
   * ملاءمة العناصر المحددة
   */
  const fitSelection = useCallback(
    (selectedIds: string[], padding: number = 50, viewportSize: { width: number; height: number } = { width: 1920, height: 1080 }) => {
      const selectedElements = elements.filter((el: CanvasElement) =>
        selectedIds.includes(el.id)
      );

      if (selectedElements.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedElements.forEach((el: CanvasElement) => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });

      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;

      const zoomX = viewportSize.width / contentWidth;
      const zoomY = viewportSize.height / contentHeight;
      const zoom = Math.min(zoomX, zoomY, 2);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      animateViewport({
        x: centerX - viewportSize.width / zoom / 2,
        y: centerY - viewportSize.height / zoom / 2,
        zoom: Math.max(MIN_ZOOM, zoom),
      });
    },
    [elements]
  );

  // =============================================================================
  // 🔄 Pan Operations
  // =============================================================================

  /**
   * تحريك العرض
   */
  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      setViewport({
        x: viewport.x + deltaX / viewport.zoom,
        y: viewport.y + deltaY / viewport.zoom,
      });
    },
    [viewport, setViewport]
  );

  /**
   * تعيين موضع العرض
   */
  const setPosition = useCallback(
    (x: number, y: number) => {
      setViewport({ x, y });
    },
    [setViewport]
  );

  /**
   * التمركز على نقطة
   */
  const centerOn = useCallback(
    (point: Point, viewportSize: { width: number; height: number } = { width: 1920, height: 1080 }) => {
      setViewport({
        x: point.x - viewportSize.width / viewport.zoom / 2,
        y: point.y - viewportSize.height / viewport.zoom / 2,
      });
    },
    [viewport, setViewport]
  );

  /**
   * التمركز على عنصر
   */
  const centerOnElement = useCallback(
    (elementId: string) => {
      const element = elements.find((el: CanvasElement) => el.id === elementId);
      if (element) {
        centerOn({
          x: element.x + element.width / 2,
          y: element.y + element.height / 2,
        });
      }
    },
    [elements, centerOn]
  );

  /**
   * إعادة تعيين الموضع
   */
  const resetPosition = useCallback(() => {
    setViewport({ x: 0, y: 0 });
  }, [setViewport]);

  /**
   * إعادة تعيين الكل
   */
  const reset = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, [setViewport]);

  // =============================================================================
  // 🎬 Animation
  // =============================================================================

  /**
   * تحريك viewport بسلاسة
   */
  const animateViewport = useCallback(
    (
      target: Partial<Viewport>,
      duration: number = ANIMATION_DURATION
    ) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const startViewport = { ...viewport };
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const newViewport: Partial<Viewport> = {};

        if (target.x !== undefined) {
          newViewport.x = startViewport.x + (target.x - startViewport.x) * eased;
        }
        if (target.y !== undefined) {
          newViewport.y = startViewport.y + (target.y - startViewport.y) * eased;
        }
        if (target.zoom !== undefined) {
          newViewport.zoom =
            startViewport.zoom + (target.zoom - startViewport.zoom) * eased;
        }

        setViewport(newViewport);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [viewport, setViewport]
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // =============================================================================
  // 🔧 Coordinate Conversion
  // =============================================================================

  /**
   * تحويل من إحداثيات الشاشة إلى إحداثيات العالم
   */
  const screenToWorld = useCallback(
    (screenPoint: Point): Point => {
      return {
        x: viewport.x + screenPoint.x / viewport.zoom,
        y: viewport.y + screenPoint.y / viewport.zoom,
      };
    },
    [viewport]
  );

  /**
   * تحويل من إحداثيات العالم إلى إحداثيات الشاشة
   */
  const worldToScreen = useCallback(
    (worldPoint: Point): Point => {
      return {
        x: (worldPoint.x - viewport.x) * viewport.zoom,
        y: (worldPoint.y - viewport.y) * viewport.zoom,
      };
    },
    [viewport]
  );

  /**
   * الحصول على حدود العرض المرئية
   */
  const getVisibleBounds = useCallback((viewportSize: { width: number; height: number } = { width: 1920, height: 1080 }): Bounds => {
    return {
      x: viewport.x,
      y: viewport.y,
      width: viewportSize.width / viewport.zoom,
      height: viewportSize.height / viewport.zoom,
    };
  }, [viewport]);

  /**
   * التحقق مما إذا كان العنصر مرئياً
   */
  const isElementVisible = useCallback(
    (element: { x: number; y: number; width: number; height: number }): boolean => {
      const bounds = getVisibleBounds();
      return !(
        element.x + element.width < bounds.x ||
        element.x > bounds.x + bounds.width ||
        element.y + element.height < bounds.y ||
        element.y > bounds.y + bounds.height
      );
    },
    [getVisibleBounds]
  );

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    // State
    viewport,

    // Zoom
    zoomIn,
    zoomOut,
    setZoom,
    zoomToPoint,
    resetZoom,
    fitContent,
    fitSelection,

    // Pan
    pan,
    setPosition,
    centerOn,
    centerOnElement,
    resetPosition,
    reset,

    // Animation
    animateViewport,

    // Coordinate conversion
    screenToWorld,
    worldToScreen,
    getVisibleBounds,
    isElementVisible,
  };
}

// =============================================================================
// 🔧 Utility Functions
// =============================================================================

/**
 * Easing function
 */
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
