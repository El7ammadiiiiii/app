// =============================================================================
// 📦 CCCWAYS Canvas - useKeyboard Hook
// Hook للتعامل مع اختصارات لوحة المفاتيح
// =============================================================================

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import type { CanvasTool, CanvasElement } from "@/types/canvas";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: "selection" | "tools" | "editing" | "view" | "file" | "other";
}

export interface KeyboardOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  ignoreInputs?: boolean;
}

const DEFAULT_OPTIONS: KeyboardOptions = {
  enabled: true,
  preventDefault: true,
  stopPropagation: false,
  ignoreInputs: true,
};

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useKeyboard(
  customShortcuts?: KeyboardShortcut[],
  options?: KeyboardOptions
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Store actions
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setSelectedIds = useCanvasStore((state) => state.setSelectedIds);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const elementsRecord = useCanvasStore((state) => state.elements);
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const canUndoState = useCanvasStore((state) => state.canUndo);
  const canRedoState = useCanvasStore((state) => state.canRedo);
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);

  // UI Store
  const togglePanel = useUIStore((state) => state.togglePanel);
  const setToolbarPosition = useUIStore((state) => state.setToolbarPosition);
  const addToast = useUIStore((state) => state.addToast);

  // Pressed keys ref
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const isSpaceDownRef = useRef(false);

  // =============================================================================
  // 🔧 Default Shortcuts
  // =============================================================================

  const defaultShortcuts: KeyboardShortcut[] = [
    // Tools
    {
      key: "v",
      action: () => setActiveTool("select"),
      description: "أداة التحديد",
      category: "tools",
    },
    {
      key: "h",
      action: () => setActiveTool("pan"),
      description: "أداة اليد",
      category: "tools",
    },
    {
      key: "r",
      action: () => setActiveTool("shape"),
      description: "أداة الشكل",
      category: "tools",
    },
    {
      key: "o",
      action: () => setActiveTool("shape"),
      description: "أداة الدائرة",
      category: "tools",
    },
    {
      key: "l",
      action: () => setActiveTool("connector"),
      description: "أداة الخط",
      category: "tools",
    },
    {
      key: "p",
      action: () => setActiveTool("draw"),
      description: "أداة الرسم الحر",
      category: "tools",
    },
    {
      key: "t",
      action: () => setActiveTool("text"),
      description: "أداة النص",
      category: "tools",
    },
    {
      key: "n",
      action: () => setActiveTool("sticky"),
      description: "ملاحظة لاصقة",
      category: "tools",
    },
    {
      key: "f",
      action: () => setActiveTool("frame"),
      description: "أداة الإطار",
      category: "tools",
    },
    {
      key: "e",
      action: () => setActiveTool("eraser"),
      description: "أداة الممحاة",
      category: "tools",
    },

    // Selection
    {
      key: "a",
      ctrl: true,
      action: () => {
        const allIds = elements
          .filter((el: CanvasElement) => el.visible && !el.locked)
          .map((el: CanvasElement) => el.id);
        setSelectedIds(allIds);
      },
      description: "تحديد الكل",
      category: "selection",
    },
    {
      key: "d",
      ctrl: true,
      action: () => setSelectedIds([]),
      description: "إلغاء التحديد",
      category: "selection",
    },
    {
      key: "Escape",
      action: () => {
        setSelectedIds([]);
        setActiveTool("select");
      },
      description: "إلغاء / إغلاق",
      category: "selection",
    },

    // Editing
    {
      key: "Delete",
      action: () => {
        selectedIds.forEach((id) => deleteElement(id));
        setSelectedIds([]);
      },
      description: "حذف المحدد",
      category: "editing",
    },
    {
      key: "Backspace",
      action: () => {
        selectedIds.forEach((id) => deleteElement(id));
        setSelectedIds([]);
      },
      description: "حذف المحدد",
      category: "editing",
    },
    {
      key: "z",
      ctrl: true,
      action: () => {
        if (canUndoState) undo();
      },
      description: "تراجع",
      category: "editing",
    },
    {
      key: "z",
      ctrl: true,
      shift: true,
      action: () => {
        if (canRedoState) redo();
      },
      description: "إعادة",
      category: "editing",
    },
    {
      key: "y",
      ctrl: true,
      action: () => {
        if (canRedoState) redo();
      },
      description: "إعادة",
      category: "editing",
    },

    // View
    {
      key: "=",
      ctrl: true,
      action: () => {
        setViewport({ zoom: Math.min(viewport.zoom * 1.2, 10) });
      },
      description: "تكبير",
      category: "view",
    },
    {
      key: "-",
      ctrl: true,
      action: () => {
        setViewport({ zoom: Math.max(viewport.zoom / 1.2, 0.1) });
      },
      description: "تصغير",
      category: "view",
    },
    {
      key: "0",
      ctrl: true,
      action: () => {
        setViewport({ zoom: 1, x: 0, y: 0 });
      },
      description: "إعادة تعيين العرض",
      category: "view",
    },
    {
      key: "1",
      ctrl: true,
      action: () => {
        setViewport({ zoom: 1 });
      },
      description: "تكبير 100%",
      category: "view",
    },
    {
      key: "g",
      ctrl: true,
      action: () => {
        toggleGrid();
      },
      description: "إظهار/إخفاء الشبكة",
      category: "view",
    },

    // Panels
    {
      key: "\\",
      ctrl: true,
      action: () => togglePanel("layers"),
      description: "لوحة الطبقات",
      category: "view",
    },
    {
      key: "i",
      ctrl: true,
      action: () => togglePanel("properties"),
      description: "لوحة الخصائص",
      category: "view",
    },
  ];

  // Combine shortcuts
  const allShortcuts = [...defaultShortcuts, ...(customShortcuts || [])];

  // =============================================================================
  // 📡 Event Handler
  // =============================================================================

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!opts.enabled) return;

      // Ignore if typing in input
      if (opts.ignoreInputs) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Track pressed keys
      pressedKeysRef.current.add(e.key.toLowerCase());

      // Handle space for pan mode
      if (e.code === "Space" && !isSpaceDownRef.current) {
        isSpaceDownRef.current = true;
        setActiveTool("pan");
        e.preventDefault();
        return;
      }

      // Find matching shortcut
      const shortcut = allShortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = !!s.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!s.shift === e.shiftKey;
        const altMatch = !!s.alt === e.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        if (opts.preventDefault) {
          e.preventDefault();
        }
        if (opts.stopPropagation) {
          e.stopPropagation();
        }
        shortcut.action();
      }
    },
    [opts, allShortcuts, setActiveTool]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key.toLowerCase());

      // Release space
      if (e.code === "Space" && isSpaceDownRef.current) {
        isSpaceDownRef.current = false;
        setActiveTool("select");
      }
    },
    [setActiveTool]
  );

  // =============================================================================
  // 🔌 Event Listeners
  // =============================================================================

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    shortcuts: allShortcuts,
    pressedKeys: pressedKeysRef.current,
    isSpaceDown: isSpaceDownRef.current,
  };
}

// =============================================================================
// 🔧 Shortcut Helpers
// =============================================================================

/**
 * تنسيق اختصار لوحة المفاتيح
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");

  // Format key name
  let key = shortcut.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join(" + ");
}

/**
 * الحصول على الاختصارات حسب الفئة
 */
export function getShortcutsByCategory(
  shortcuts: KeyboardShortcut[],
  category: KeyboardShortcut["category"]
): KeyboardShortcut[] {
  return shortcuts.filter((s) => s.category === category);
}

/**
 * ترجمة فئة الاختصار
 */
export function getCategoryLabel(category: KeyboardShortcut["category"]): string {
  const labels: Record<KeyboardShortcut["category"], string> = {
    selection: "التحديد",
    tools: "الأدوات",
    editing: "التحرير",
    view: "العرض",
    file: "الملف",
    other: "أخرى",
  };
  return labels[category];
}
