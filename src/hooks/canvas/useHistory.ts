// =============================================================================
// 📦 CCCWAYS Canvas - useHistory Hook
// Hook للتحكم في التراجع والإعادة
// =============================================================================

import { useCallback, useEffect, useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { HistoryEntry, HistoryActionType } from "@/types/canvas";

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useHistory() {
  // Store selectors - canUndo/canRedo are booleans, not functions
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const canUndoState = useCanvasStore((state) => state.canUndo);
  const canRedoState = useCanvasStore((state) => state.canRedo);

  // =============================================================================
  // 🔄 Operations
  // =============================================================================

  /**
   * تراجع خطوة واحدة
   */
  const undoStep = useCallback(() => {
    if (canUndoState) {
      undo();
      return true;
    }
    return false;
  }, [canUndoState, undo]);

  /**
   * إعادة خطوة واحدة
   */
  const redoStep = useCallback(() => {
    if (canRedoState) {
      redo();
      return true;
    }
    return false;
  }, [canRedoState, redo]);

  /**
   * تراجع عدة خطوات
   */
  const undoMultiple = useCallback(
    (steps: number) => {
      for (let i = 0; i < steps; i++) {
        if (!canUndoState) break;
        undo();
      }
    },
    [canUndoState, undo]
  );

  /**
   * إعادة عدة خطوات
   */
  const redoMultiple = useCallback(
    (steps: number) => {
      for (let i = 0; i < steps; i++) {
        if (!canRedoState) break;
        redo();
      }
    },
    [canRedoState, redo]
  );

  // =============================================================================
  // ⌨️ Keyboard Shortcuts
  // =============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoStep();
      }

      // Check for Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (Redo)
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        redoStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStep, redoStep]);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    // Checks
    canUndo: canUndoState,
    canRedo: canRedoState,

    // Operations
    undo: undoStep,
    redo: redoStep,
    undoMultiple,
    redoMultiple,
  };
}

// =============================================================================
// 🔧 History Entry Helpers
// =============================================================================

/**
 * الحصول على وصف الإدخال بالعربية
 */
export function getHistoryEntryDescription(entry: HistoryEntry): string {
  const elementCount = Object.keys(entry.elements).length;
  
  switch (entry.type) {
    case "create":
      return `إضافة ${elementCount} عنصر`;
    case "update":
      return `تعديل ${elementCount} عنصر`;
    case "delete":
      return `حذف ${elementCount} عنصر`;
    case "move":
      return `نقل ${elementCount} عنصر`;
    case "style":
      return `تغيير نمط ${elementCount} عنصر`;
    case "resize":
      return `تغيير حجم ${elementCount} عنصر`;
    case "rotate":
      return `تدوير ${elementCount} عنصر`;
    case "group":
      return `تجميع عناصر`;
    case "ungroup":
      return `فك تجميع`;
    case "layer":
      return `تغيير الطبقة`;
    case "paste":
      return `لصق ${elementCount} عنصر`;
    case "import":
      return `استيراد ${elementCount} عنصر`;
    default:
      return entry.description || `عملية غير معروفة`;
  }
}

/**
 * الحصول على أيقونة الإدخال
 */
export function getHistoryEntryIcon(type: HistoryActionType): string {
  switch (type) {
    case "create":
      return "➕";
    case "update":
      return "✏️";
    case "delete":
      return "🗑️";
    case "move":
      return "↔️";
    case "style":
      return "🎨";
    case "resize":
      return "📐";
    case "rotate":
      return "🔄";
    case "group":
      return "📦";
    case "ungroup":
      return "📭";
    case "layer":
      return "📚";
    case "paste":
      return "📋";
    case "import":
      return "📥";
    default:
      return "❓";
  }
}

/**
 * تنسيق الوقت
 */
export function formatHistoryTime(timestamp: Date | number): string {
  const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const now = Date.now();
  const diff = now - time;

  if (diff < 60000) {
    return "الآن";
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `منذ ${minutes} دقيقة`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `منذ ${hours} ساعة`;
  } else {
    const date = new Date(time);
    return date.toLocaleDateString("ar-SA");
  }
}
