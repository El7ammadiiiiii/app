// =============================================================================
// 📦 CCCWAYS Canvas - useSelection Hook
// Hook للتعامل مع التحديد المتعدد
// =============================================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { CanvasElement, Point, Bounds } from "@/types/canvas";
import { boundsOverlap, getRotatedBounds } from "@/lib/canvas/collision";

// Helper function
function pointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface SelectionBox {
  startPoint: Point;
  endPoint: Point;
  bounds: Bounds;
}

export interface SelectionInfo {
  selectedIds: string[];
  selectedElements: CanvasElement[];
  bounds: Bounds | null;
  center: Point | null;
  count: number;
  hasSelection: boolean;
  isSingleSelection: boolean;
  isMultiSelection: boolean;
}

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useSelection() {
  // Store
  const elementsRecord = useCanvasStore((state) => state.elements);
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const setSelectedIds = useCanvasStore((state) => state.setSelectedIds);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const viewport = useCanvasStore((state) => state.viewport);

  // Ref for tracking selection start
  const selectionStartRef = useRef<Point | null>(null);

  // =============================================================================
  // 📊 Selection Info
  // =============================================================================

  /**
   * معلومات التحديد الحالي
   */
  const selectionInfo = useMemo((): SelectionInfo => {
    const selectedElements = elements.filter((el: CanvasElement) =>
      selectedIds.includes(el.id)
    );

    let bounds: Bounds | null = null;
    let center: Point | null = null;

    if (selectedElements.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedElements.forEach((el: CanvasElement) => {
        const elBounds = el.rotation
          ? getRotatedBounds(el, el.rotation)
          : { x: el.x, y: el.y, width: el.width, height: el.height };

        minX = Math.min(minX, elBounds.x);
        minY = Math.min(minY, elBounds.y);
        maxX = Math.max(maxX, elBounds.x + elBounds.width);
        maxY = Math.max(maxY, elBounds.y + elBounds.height);
      });

      bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };

      center = {
        x: minX + (maxX - minX) / 2,
        y: minY + (maxY - minY) / 2,
      };
    }

    return {
      selectedIds,
      selectedElements,
      bounds,
      center,
      count: selectedElements.length,
      hasSelection: selectedElements.length > 0,
      isSingleSelection: selectedElements.length === 1,
      isMultiSelection: selectedElements.length > 1,
    };
  }, [elements, selectedIds]);

  // =============================================================================
  // 🔍 Selection Operations
  // =============================================================================

  /**
   * تحديد عنصر
   */
  const select = useCallback(
    (elementId: string, options?: { additive?: boolean; toggle?: boolean }) => {
      const { additive = false, toggle = false } = options || {};

      if (toggle) {
        if (selectedIds.includes(elementId)) {
          setSelectedIds(selectedIds.filter((id) => id !== elementId));
        } else {
          setSelectedIds([...selectedIds, elementId]);
        }
      } else if (additive) {
        if (!selectedIds.includes(elementId)) {
          setSelectedIds([...selectedIds, elementId]);
        }
      } else {
        setSelectedIds([elementId]);
      }
    },
    [selectedIds, setSelectedIds]
  );

  /**
   * تحديد عناصر متعددة
   */
  const selectMultiple = useCallback(
    (elementIds: string[], options?: { additive?: boolean }) => {
      const { additive = false } = options || {};

      if (additive) {
        const newIds = [...new Set([...selectedIds, ...elementIds])];
        setSelectedIds(newIds);
      } else {
        setSelectedIds(elementIds);
      }
    },
    [selectedIds, setSelectedIds]
  );

  /**
   * إلغاء تحديد عنصر
   */
  const deselect = useCallback(
    (elementId: string) => {
      setSelectedIds(selectedIds.filter((id) => id !== elementId));
    },
    [selectedIds, setSelectedIds]
  );

  /**
   * إلغاء تحديد الكل
   */
  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  /**
   * تحديد الكل
   */
  const selectAll = useCallback(() => {
    const visibleElements = elements.filter((el: CanvasElement) => el.visible && !el.locked);
    setSelectedIds(visibleElements.map((el: CanvasElement) => el.id));
  }, [elements, setSelectedIds]);

  /**
   * تحديد الكل في الطبقة الحالية
   */
  const selectAllInLayer = useCallback(
    (layerId: string) => {
      const layerElements = elements.filter(
        (el: CanvasElement) => el.layerId === layerId && el.visible && !el.locked
      );
      setSelectedIds(layerElements.map((el: CanvasElement) => el.id));
    },
    [elements, setSelectedIds]
  );

  /**
   * عكس التحديد
   */
  const invertSelection = useCallback(() => {
    const visibleElements = elements.filter((el: CanvasElement) => el.visible && !el.locked);
    const newSelection = visibleElements
      .filter((el: CanvasElement) => !selectedIds.includes(el.id))
      .map((el: CanvasElement) => el.id);
    setSelectedIds(newSelection);
  }, [elements, selectedIds, setSelectedIds]);

  // =============================================================================
  // 📦 Selection Box Operations
  // =============================================================================

  /**
   * بدء مربع التحديد
   */
  const startSelectionBox = useCallback(
    (point: Point) => {
      selectionStartRef.current = point;
      setSelectionBox({
        startPoint: point,
        endPoint: point,
        bounds: {
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
        },
      });
    },
    [setSelectionBox]
  );

  /**
   * تحديث مربع التحديد
   */
  const updateSelectionBox = useCallback(
    (point: Point) => {
      if (!selectionStartRef.current) return;

      const start = selectionStartRef.current;
      const box: SelectionBox = {
        startPoint: start,
        endPoint: point,
        bounds: {
          x: Math.min(start.x, point.x),
          y: Math.min(start.y, point.y),
          width: Math.abs(point.x - start.x),
          height: Math.abs(point.y - start.y),
        }
      };

      setSelectionBox(box);
    },
    [setSelectionBox]
  );

  /**
   * إنهاء مربع التحديد
   */
  const endSelectionBox = useCallback(
    (options?: { additive?: boolean }) => {
      const { additive = false } = options || {};

      if (selectionBox && selectionBox.bounds.width > 5 && selectionBox.bounds.height > 5) {
        // Find elements inside selection box
        const selectedElements = elements.filter((el: CanvasElement) => {
          if (el.locked || !el.visible) return false;

          const elBounds: Bounds = {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
          };

          return boundsOverlap(selectionBox.bounds, elBounds);
        });

        const newIds = selectedElements.map((el: CanvasElement) => el.id);

        if (additive) {
          const combined = [...new Set([...selectedIds, ...newIds])];
          setSelectedIds(combined);
        } else {
          setSelectedIds(newIds);
        }
      }

      selectionStartRef.current = null;
      setSelectionBox(null);
    },
    [elements, selectionBox, selectedIds, setSelectedIds, setSelectionBox]
  );

  /**
   * إلغاء مربع التحديد
   */
  const cancelSelectionBox = useCallback(() => {
    selectionStartRef.current = null;
    setSelectionBox(null);
  }, [setSelectionBox]);

  // =============================================================================
  // 🔍 Element Queries
  // =============================================================================

  /**
   * التحقق مما إذا كان العنصر محدداً
   */
  const isSelected = useCallback(
    (elementId: string): boolean => {
      return selectedIds.includes(elementId);
    },
    [selectedIds]
  );

  /**
   * الحصول على العنصر الأول المحدد
   */
  const getFirstSelected = useCallback((): CanvasElement | null => {
    if (selectedIds.length === 0) return null;
    return elements.find((el: CanvasElement) => el.id === selectedIds[0]) || null;
  }, [elements, selectedIds]);

  /**
   * الحصول على العناصر المحددة حسب النوع
   */
  const getSelectedByType = useCallback(
    (type: string): CanvasElement[] => {
      return selectionInfo.selectedElements.filter((el: CanvasElement) => el.type === type);
    },
    [selectionInfo.selectedElements]
  );

  // =============================================================================
  // 🔧 Selection Helpers
  // =============================================================================

  /**
   * تحريك التحديد بين العناصر
   */
  const selectNext = useCallback(() => {
    if (elements.length === 0) return;

    if (selectedIds.length === 0) {
      setSelectedIds([elements[0].id]);
    } else {
      const lastSelectedId = selectedIds[selectedIds.length - 1];
      const currentIndex = elements.findIndex((el: CanvasElement) => el.id === lastSelectedId);
      const nextIndex = (currentIndex + 1) % elements.length;
      setSelectedIds([elements[nextIndex].id]);
    }
  }, [elements, selectedIds, setSelectedIds]);

  /**
   * تحريك التحديد للخلف
   */
  const selectPrevious = useCallback(() => {
    if (elements.length === 0) return;

    if (selectedIds.length === 0) {
      setSelectedIds([elements[elements.length - 1].id]);
    } else {
      const firstSelectedId = selectedIds[0];
      const currentIndex = elements.findIndex((el: CanvasElement) => el.id === firstSelectedId);
      const prevIndex = (currentIndex - 1 + elements.length) % elements.length;
      setSelectedIds([elements[prevIndex].id]);
    }
  }, [elements, selectedIds, setSelectedIds]);

  /**
   * تحديد العناصر المتشابهة
   */
  const selectSimilar = useCallback(() => {
    if (selectionInfo.selectedElements.length === 0) return;

    const types = new Set(selectionInfo.selectedElements.map((el: CanvasElement) => el.type));
    const similarElements = elements.filter(
      (el: CanvasElement) => types.has(el.type) && el.visible && !el.locked
    );
    setSelectedIds(similarElements.map((el: CanvasElement) => el.id));
  }, [elements, selectionInfo.selectedElements, setSelectedIds]);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    // State
    ...selectionInfo,
    selectionBox,

    // Selection operations
    select,
    selectMultiple,
    deselect,
    deselectAll,
    selectAll,
    selectAllInLayer,
    invertSelection,

    // Selection box
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    cancelSelectionBox,

    // Queries
    isSelected,
    getFirstSelected,
    getSelectedByType,

    // Helpers
    selectNext,
    selectPrevious,
    selectSimilar,
  };
}
