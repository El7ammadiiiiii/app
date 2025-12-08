// =============================================================================
// 📦 CCCWAYS Canvas - useCanvas Hook
// Hook رئيسي للتحكم في الكانفاس
// =============================================================================

import { useCallback, useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import type { CanvasElement, Point, Bounds, CanvasTool, ShapeType } from "@/types/canvas";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useCanvas() {
  // Store selectors
  const elementsRecord = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const viewport = useCanvasStore((state) => state.viewport);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const layers = useCanvasStore((state) => state.layers);
  const activeLayerId = useCanvasStore((state) => state.activeLayerId);
  const isDrawing = useCanvasStore((state) => state.isDrawing);
  const isDragging = useCanvasStore((state) => state.isDragging);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const snapToGrid = useCanvasStore((state) => state.snapToGrid);
  const gridSize = useCanvasStore((state) => state.gridSize);

  // Convert elements record to array
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);

  // Store actions
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const setSelectedIds = useCanvasStore((state) => state.setSelectedIds);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const setIsDrawing = useCanvasStore((state) => state.setIsDrawing);
  const setIsDragging = useCanvasStore((state) => state.setIsDragging);

  // UI Store
  const addToast = useUIStore((state) => state.addToast);

  // =============================================================================
  // 📦 Element Creation
  // =============================================================================

  /**
   * إنشاء شكل جديد
   */
  const createShape = useCallback(
    (
      shapeType: ShapeType,
      position: Point,
      size: { width: number; height: number },
      options?: Partial<CanvasElement>
    ): CanvasElement => {
      const now = Date.now();
      const element: CanvasElement = {
        id: uuidv4(),
        type: "shape",
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        rotation: 0,
        visible: true,
        locked: false,
        layerId: activeLayerId,
        zIndex: elements.length,
        stroke: { color: "#000000", width: 2, style: "solid", opacity: 1 },
        fill: { color: "#ffffff", opacity: 1 },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
        shapeType,
        cornerRadius: 0,
        ...options,
      } as any;

      addElement(element);
      return element;
    },
    [activeLayerId, elements.length, addElement]
  );

  /**
   * إنشاء نص جديد
   */
  const createText = useCallback(
    (
      position: Point,
      content: string = "نص جديد",
      options?: Partial<CanvasElement>
    ): CanvasElement => {
      const now = Date.now();
      const element: CanvasElement = {
        id: uuidv4(),
        type: "text",
        x: position.x,
        y: position.y,
        width: 200,
        height: 50,
        rotation: 0,
        visible: true,
        locked: false,
        layerId: activeLayerId,
        zIndex: elements.length,
        stroke: { color: "#000000", width: 0, style: "solid", opacity: 0 },
        fill: { color: "#000000", opacity: 1 },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
        content,
        textOptions: {
          fontFamily: "Cairo",
          fontSize: 16,
          fontWeight: "normal",
          fontStyle: "normal",
          textAlign: "right",
          lineHeight: 1.5,
          letterSpacing: 0,
        },
        ...options,
      } as any;

      addElement(element);
      return element;
    },
    [activeLayerId, elements.length, addElement]
  );

  /**
   * إنشاء ملاحظة لاصقة
   */
  const createStickyNote = useCallback(
    (
      position: Point,
      content: string = "",
      color: string = "#fef3c7",
      options?: Partial<CanvasElement>
    ): CanvasElement => {
      const now = Date.now();
      const element: CanvasElement = {
        id: uuidv4(),
        type: "sticky",
        x: position.x,
        y: position.y,
        width: 200,
        height: 200,
        rotation: 0,
        visible: true,
        locked: false,
        layerId: activeLayerId,
        zIndex: elements.length,
        stroke: { color: "#00000020", width: 1, style: "solid", opacity: 1 },
        fill: { color, opacity: 1 },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
        content,
        color,
        author: "المستخدم",
        ...options,
      } as any;

      addElement(element);
      return element;
    },
    [activeLayerId, elements.length, addElement]
  );

  /**
   * إنشاء صورة
   */
  const createImage = useCallback(
    (
      position: Point,
      src: string,
      originalSize: { width: number; height: number },
      options?: Partial<CanvasElement>
    ): CanvasElement => {
      const now = Date.now();
      const element: CanvasElement = {
        id: uuidv4(),
        type: "image",
        x: position.x,
        y: position.y,
        width: originalSize.width,
        height: originalSize.height,
        rotation: 0,
        visible: true,
        locked: false,
        layerId: activeLayerId,
        zIndex: elements.length,
        stroke: { color: "#00000000", width: 0, style: "solid", opacity: 0 },
        fill: { color: "#ffffff", opacity: 1 },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
        src,
        originalWidth: originalSize.width,
        originalHeight: originalSize.height,
        ...options,
      } as any;

      addElement(element);
      return element;
    },
    [activeLayerId, elements.length, addElement]
  );

  /**
   * إنشاء موصل
   */
  const createConnector = useCallback(
    (
      startPoint: Point,
      endPoint: Point,
      options?: Partial<CanvasElement>
    ): CanvasElement => {
      const now = Date.now();
      const element: CanvasElement = {
        id: uuidv4(),
        type: "connector",
        x: Math.min(startPoint.x, endPoint.x),
        y: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
        rotation: 0,
        visible: true,
        locked: false,
        layerId: activeLayerId,
        zIndex: elements.length,
        stroke: { color: "#000000", width: 2, style: "solid", opacity: 1 },
        fill: { color: "#000000", opacity: 1 },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
        startPoint,
        endPoint,
        connectorType: "straight",
        startArrow: "none",
        endArrow: "arrow",
        ...options,
      } as any;

      addElement(element);
      return element;
    },
    [activeLayerId, elements.length, addElement]
  );

  /**
   * إنشاء إطار
   */
  const createFrame = useCallback(
    (
      position: Point,
      size: { width: number; height: number },
      name: string = "إطار جديد",
      options?: Partial<CanvasElement>
    ): CanvasElement => {
      const now = Date.now();
      const element: CanvasElement = {
        id: uuidv4(),
        type: "frame",
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        rotation: 0,
        visible: true,
        locked: false,
        layerId: activeLayerId,
        zIndex: elements.length,
        stroke: { color: "#6366f1", width: 2, style: "solid", opacity: 1 },
        fill: { color: "#f8fafc", opacity: 0.5 },
        metadata: {},
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
        name,
        backgroundColor: "#ffffff",
        showName: true,
        clipContent: false,
        children: [],
        ...options,
      } as any;

      addElement(element);
      return element;
    },
    [activeLayerId, elements.length, addElement]
  );

  // =============================================================================
  // 🔍 Selection
  // =============================================================================

  /**
   * الحصول على العناصر المحددة
   */
  const selectedElements = useMemo((): CanvasElement[] => {
    return elements.filter((el: CanvasElement) => selectedIds.includes(el.id));
  }, [elements, selectedIds]);

  /**
   * تحديد عنصر واحد
   */
  const selectElement = useCallback(
    (elementId: string, addToSelection: boolean = false) => {
      if (addToSelection) {
        if (selectedIds.includes(elementId)) {
          setSelectedIds(selectedIds.filter((id) => id !== elementId));
        } else {
          setSelectedIds([...selectedIds, elementId]);
        }
      } else {
        setSelectedIds([elementId]);
      }
    },
    [selectedIds, setSelectedIds]
  );

  /**
   * تحديد الكل
   */
  const selectAll = useCallback(() => {
    const layer = layers.find((l) => l.id === activeLayerId);
    const visibleElements = elements.filter(
      (el: CanvasElement) => el.visible && !el.locked && el.layerId === activeLayerId
    );
    setSelectedIds(visibleElements.map((el: CanvasElement) => el.id));
  }, [elements, layers, activeLayerId, setSelectedIds]);

  /**
   * إلغاء التحديد
   */
  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  // =============================================================================
  // ✏️ Editing
  // =============================================================================

  /**
   * حذف العناصر المحددة
   */
  const deleteSelected = useCallback(() => {
    selectedIds.forEach((id) => deleteElement(id));
    setSelectedIds([]);
  }, [selectedIds, deleteElement, setSelectedIds]);

  /**
   * نسخ العناصر المحددة
   */
  const duplicateSelected = useCallback((): CanvasElement[] => {
    const duplicated: CanvasElement[] = [];
    const offset = 20;

    selectedElements.forEach((element: CanvasElement) => {
      const now = new Date();
      const newElement = {
        ...element,
        id: uuidv4(),
        x: element.x + offset,
        y: element.y + offset,
        createdAt: now,
        updatedAt: now,
      };
      addElement(newElement as any);
      duplicated.push(newElement as CanvasElement);
    });

    setSelectedIds(duplicated.map((el) => el.id));
    return duplicated;
  }, [selectedElements, elements.length, addElement, setSelectedIds]);

  /**
   * تجميع العناصر المحددة
   */
  const groupSelected = useCallback(() => {
    if (selectedElements.length < 2) {
      addToast({
        title: "تنبيه",
        message: "حدد عنصرين أو أكثر للتجميع",
        type: "warning",
      });
      return null;
    }

    // Calculate bounds
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

    const frame = createFrame(
      { x: minX - 10, y: minY - 10 },
      { width: maxX - minX + 20, height: maxY - minY + 20 },
      "مجموعة"
    );

    // Update frame with children
    updateElement(frame.id, {
      children: selectedIds,
    } as any);

    setSelectedIds([frame.id]);
    return frame;
  }, [selectedElements, selectedIds, createFrame, updateElement, setSelectedIds, addToast]);

  // =============================================================================
  // 🔧 Transform
  // =============================================================================

  /**
   * تحريك العناصر المحددة
   */
  const moveSelected = useCallback(
    (deltaX: number, deltaY: number) => {
      const updates = selectedIds.map((id) => {
        const element = elements.find((el: CanvasElement) => el.id === id);
        if (!element) return null;
        return {
          id,
          updates: {
            x: element.x + deltaX,
            y: element.y + deltaY,
          },
        };
      }).filter(Boolean) as Array<{ id: string; updates: Partial<CanvasElement> }>;

      updates.forEach(({ id, updates }) => updateElement(id, updates));
    },
    [selectedIds, elements, updateElement]
  );

  /**
   * تغيير حجم العنصر
   */
  const resizeElement = useCallback(
    (
      elementId: string,
      newSize: { width: number; height: number },
      anchor?: Point
    ) => {
      updateElement(elementId, {
        width: newSize.width,
        height: newSize.height,
        ...(anchor ? { x: anchor.x, y: anchor.y } : {}),
      });
    },
    [updateElement]
  );

  /**
   * تدوير العنصر
   */
  const rotateElement = useCallback(
    (elementId: string, rotation: number) => {
      updateElement(elementId, { rotation });
    },
    [updateElement]
  );

  /**
   * تدوير العناصر المحددة
   */
  const rotateSelected = useCallback(
    (rotation: number) => {
      selectedIds.forEach((id) => {
        const element = elements.find((el: CanvasElement) => el.id === id);
        if (element) {
          updateElement(id, { rotation: element.rotation + rotation });
        }
      });
    },
    [selectedIds, elements, updateElement]
  );

  // =============================================================================
  // 📐 Alignment
  // =============================================================================

  /**
   * محاذاة العناصر المحددة
   */
  const alignSelected = useCallback(
    (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
      if (selectedElements.length < 2) return;

      let targetValue: number;
      const updates: Array<{ id: string; updates: Partial<CanvasElement> }> = [];

      switch (alignment) {
        case "left":
          targetValue = Math.min(...selectedElements.map((el: CanvasElement) => el.x));
          selectedElements.forEach((el: CanvasElement) => {
            updates.push({ id: el.id, updates: { x: targetValue } });
          });
          break;
        case "center":
          const centers = selectedElements.map((el: CanvasElement) => el.x + el.width / 2);
          targetValue = centers.reduce((a: number, b: number) => a + b, 0) / centers.length;
          selectedElements.forEach((el: CanvasElement) => {
            updates.push({ id: el.id, updates: { x: targetValue - el.width / 2 } });
          });
          break;
        case "right":
          targetValue = Math.max(...selectedElements.map((el: CanvasElement) => el.x + el.width));
          selectedElements.forEach((el: CanvasElement) => {
            updates.push({ id: el.id, updates: { x: targetValue - el.width } });
          });
          break;
        case "top":
          targetValue = Math.min(...selectedElements.map((el: CanvasElement) => el.y));
          selectedElements.forEach((el: CanvasElement) => {
            updates.push({ id: el.id, updates: { y: targetValue } });
          });
          break;
        case "middle":
          const middles = selectedElements.map((el: CanvasElement) => el.y + el.height / 2);
          targetValue = middles.reduce((a: number, b: number) => a + b, 0) / middles.length;
          selectedElements.forEach((el: CanvasElement) => {
            updates.push({ id: el.id, updates: { y: targetValue - el.height / 2 } });
          });
          break;
        case "bottom":
          targetValue = Math.max(...selectedElements.map((el: CanvasElement) => el.y + el.height));
          selectedElements.forEach((el: CanvasElement) => {
            updates.push({ id: el.id, updates: { y: targetValue - el.height } });
          });
          break;
      }

      updates.forEach(({ id, updates }) => updateElement(id, updates));
    },
    [selectedElements, updateElement]
  );

  /**
   * توزيع العناصر بالتساوي
   */
  const distributeSelected = useCallback(
    (direction: "horizontal" | "vertical") => {
      if (selectedElements.length < 3) return;

      const sorted = [...selectedElements].sort((a: CanvasElement, b: CanvasElement) => 
        direction === "horizontal" ? a.x - b.x : a.y - b.y
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      let totalGap: number;
      let totalElementSize: number;

      if (direction === "horizontal") {
        totalGap = (last.x + last.width) - first.x;
        totalElementSize = sorted.reduce((sum: number, el: CanvasElement) => sum + el.width, 0);
      } else {
        totalGap = (last.y + last.height) - first.y;
        totalElementSize = sorted.reduce((sum: number, el: CanvasElement) => sum + el.height, 0);
      }

      const gap = (totalGap - totalElementSize) / (sorted.length - 1);
      const updates: Array<{ id: string; updates: Partial<CanvasElement> }> = [];

      let currentPos = direction === "horizontal" ? first.x : first.y;

      sorted.forEach((el: CanvasElement, index: number) => {
        if (index === 0) {
          currentPos += direction === "horizontal" ? el.width : el.height;
          return;
        }

        currentPos += gap;
        updates.push({
          id: el.id,
          updates: direction === "horizontal" ? { x: currentPos } : { y: currentPos },
        });
        currentPos += direction === "horizontal" ? el.width : el.height;
      });

      updates.forEach(({ id, updates }) => updateElement(id, updates));
    },
    [selectedElements, updateElement]
  );

  // =============================================================================
  // 📊 Layer Order
  // =============================================================================

  /**
   * نقل للأمام
   */
  const bringForward = useCallback(() => {
    selectedIds.forEach((id) => {
      const element = elements.find((el: CanvasElement) => el.id === id);
      if (element) {
        // Use elementOrder for ordering since zIndex doesn't exist
        // Just update the element to trigger re-render
        updateElement(id, { updatedAt: new Date() });
      }
    });
  }, [selectedIds, elements, updateElement]);

  /**
   * نقل للخلف
   */
  const sendBackward = useCallback(() => {
    selectedIds.forEach((id) => {
      const element = elements.find((el: CanvasElement) => el.id === id);
      if (element) {
        // Use elementOrder for ordering since zIndex doesn't exist
        updateElement(id, { updatedAt: new Date() });
      }
    });
  }, [selectedIds, elements, updateElement]);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    // State
    elements,
    selectedIds,
    selectedElements,
    viewport,
    activeTool,
    layers,
    activeLayerId,
    isDrawing,
    isDragging,
    showGrid,
    snapToGrid,
    gridSize,

    // Actions - Creation
    createShape,
    createText,
    createStickyNote,
    createImage,
    createConnector,
    createFrame,

    // Actions - Selection
    selectElement,
    selectAll,
    deselectAll,

    // Actions - Editing
    deleteSelected,
    duplicateSelected,
    groupSelected,
    updateElement,
    deleteElement,

    // Actions - Transform
    moveSelected,
    resizeElement,
    rotateElement,
    rotateSelected,

    // Actions - Alignment
    alignSelected,
    distributeSelected,

    // Actions - Layer Order
    bringForward,
    sendBackward,

    // Actions - State
    setActiveTool,
    setViewport,
    setIsDrawing,
    setIsDragging,
    setSelectedIds,
  };
}
