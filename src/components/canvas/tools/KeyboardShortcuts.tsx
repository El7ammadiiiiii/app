// =============================================================================
// ⌨️ CCCWAYS Canvas - اختصارات لوحة المفاتيح (Keyboard Shortcuts)
// عرض ودليل اختصارات لوحة المفاتيح
// =============================================================================

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MousePointer2,
  Hand,
  Square,
  Pencil,
  Type,
  Image,
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Group,
  Save,
  Download,
  Upload,
  Share2,
  Grid3X3,
  Lock,
  Eye,
  Sparkles,
  Command,
  Option,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Delete,
  Space,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcutPress?: (shortcut: ShortcutDefinition) => void;
  customShortcuts?: ShortcutDefinition[];
  showSearch?: boolean;
  allowCustomization?: boolean;
  className?: string;
  dir?: "rtl" | "ltr";
}

interface ShortcutDefinition {
  id: string;
  keys: string[];
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  category: string;
  action?: () => void;
  isCustom?: boolean;
  isDisabled?: boolean;
}

interface ShortcutCategory {
  id: string;
  label: string;
  labelAr: string;
  icon: React.ComponentType<any>;
  shortcuts: ShortcutDefinition[];
}

// =============================================================================
// 🔧 SHORTCUT DEFINITIONS
// =============================================================================

const DEFAULT_SHORTCUTS: ShortcutCategory[] = [
  {
    id: "tools",
    label: "Tools",
    labelAr: "الأدوات",
    icon: MousePointer2,
    shortcuts: [
      { id: "select", keys: ["V"], label: "Select Tool", labelAr: "أداة التحديد", category: "tools" },
      { id: "pan", keys: ["H"], label: "Pan Tool", labelAr: "أداة التحريك", category: "tools" },
      { id: "rectangle", keys: ["R"], label: "Rectangle", labelAr: "مستطيل", category: "tools" },
      { id: "ellipse", keys: ["O"], label: "Ellipse", labelAr: "دائرة", category: "tools" },
      { id: "triangle", keys: ["T"], label: "Triangle", labelAr: "مثلث", category: "tools" },
      { id: "line", keys: ["L"], label: "Line", labelAr: "خط", category: "tools" },
      { id: "arrow", keys: ["A"], label: "Arrow", labelAr: "سهم", category: "tools" },
      { id: "draw", keys: ["D"], label: "Draw", labelAr: "رسم حر", category: "tools" },
      { id: "text", keys: ["X"], label: "Text", labelAr: "نص", category: "tools" },
      { id: "sticky", keys: ["N"], label: "Sticky Note", labelAr: "ملاحظة لاصقة", category: "tools" },
      { id: "image", keys: ["I"], label: "Image", labelAr: "صورة", category: "tools" },
      { id: "frame", keys: ["F"], label: "Frame", labelAr: "إطار", category: "tools" },
      { id: "connector", keys: ["C"], label: "Connector", labelAr: "موصل", category: "tools" },
      { id: "comment", keys: ["M"], label: "Comment", labelAr: "تعليق", category: "tools" },
      { id: "eraser", keys: ["E"], label: "Eraser", labelAr: "ممحاة", category: "tools" },
    ],
  },
  {
    id: "editing",
    label: "Editing",
    labelAr: "التحرير",
    icon: Scissors,
    shortcuts: [
      { id: "undo", keys: ["Ctrl", "Z"], label: "Undo", labelAr: "تراجع", category: "editing" },
      { id: "redo", keys: ["Ctrl", "Y"], label: "Redo", labelAr: "إعادة", category: "editing" },
      { id: "redo-alt", keys: ["Ctrl", "Shift", "Z"], label: "Redo (Alt)", labelAr: "إعادة (بديل)", category: "editing" },
      { id: "copy", keys: ["Ctrl", "C"], label: "Copy", labelAr: "نسخ", category: "editing" },
      { id: "paste", keys: ["Ctrl", "V"], label: "Paste", labelAr: "لصق", category: "editing" },
      { id: "cut", keys: ["Ctrl", "X"], label: "Cut", labelAr: "قص", category: "editing" },
      { id: "duplicate", keys: ["Ctrl", "D"], label: "Duplicate", labelAr: "تكرار", category: "editing" },
      { id: "delete", keys: ["Delete"], label: "Delete", labelAr: "حذف", category: "editing" },
      { id: "delete-alt", keys: ["Backspace"], label: "Delete (Alt)", labelAr: "حذف (بديل)", category: "editing" },
      { id: "select-all", keys: ["Ctrl", "A"], label: "Select All", labelAr: "تحديد الكل", category: "editing" },
      { id: "deselect", keys: ["Escape"], label: "Deselect", labelAr: "إلغاء التحديد", category: "editing" },
    ],
  },
  {
    id: "view",
    label: "View & Navigation",
    labelAr: "العرض والتنقل",
    icon: ZoomIn,
    shortcuts: [
      { id: "zoom-in", keys: ["Ctrl", "+"], label: "Zoom In", labelAr: "تكبير", category: "view" },
      { id: "zoom-out", keys: ["Ctrl", "-"], label: "Zoom Out", labelAr: "تصغير", category: "view" },
      { id: "zoom-100", keys: ["Ctrl", "0"], label: "Zoom to 100%", labelAr: "تكبير 100%", category: "view" },
      { id: "zoom-fit", keys: ["Ctrl", "1"], label: "Fit to Screen", labelAr: "ملء الشاشة", category: "view" },
      { id: "zoom-selection", keys: ["Ctrl", "2"], label: "Zoom to Selection", labelAr: "تكبير للتحديد", category: "view" },
      { id: "pan-mode", keys: ["Space"], label: "Hold to Pan", labelAr: "اضغط للتحريك", category: "view" },
      { id: "scroll-zoom", keys: ["Ctrl", "Scroll"], label: "Zoom with Scroll", labelAr: "تكبير بالتمرير", category: "view" },
      { id: "toggle-grid", keys: ["Ctrl", "'"], label: "Toggle Grid", labelAr: "تبديل الشبكة", category: "view" },
      { id: "fullscreen", keys: ["F11"], label: "Fullscreen", labelAr: "ملء الشاشة", category: "view" },
    ],
  },
  {
    id: "layers",
    label: "Layers & Order",
    labelAr: "الطبقات والترتيب",
    icon: Layers,
    shortcuts: [
      { id: "bring-front", keys: ["Ctrl", "]"], label: "Bring to Front", labelAr: "إحضار للأمام", category: "layers" },
      { id: "send-back", keys: ["Ctrl", "["], label: "Send to Back", labelAr: "إرسال للخلف", category: "layers" },
      { id: "bring-forward", keys: ["Ctrl", "Shift", "]"], label: "Bring Forward", labelAr: "تقديم", category: "layers" },
      { id: "send-backward", keys: ["Ctrl", "Shift", "["], label: "Send Backward", labelAr: "تأخير", category: "layers" },
      { id: "group", keys: ["Ctrl", "G"], label: "Group", labelAr: "تجميع", category: "layers" },
      { id: "ungroup", keys: ["Ctrl", "Shift", "G"], label: "Ungroup", labelAr: "فك التجميع", category: "layers" },
      { id: "lock", keys: ["Ctrl", "L"], label: "Lock/Unlock", labelAr: "قفل/فتح", category: "layers" },
    ],
  },
  {
    id: "alignment",
    label: "Alignment",
    labelAr: "المحاذاة",
    icon: Grid3X3,
    shortcuts: [
      { id: "align-left", keys: ["Alt", "A"], label: "Align Left", labelAr: "محاذاة يسار", category: "alignment" },
      { id: "align-center", keys: ["Alt", "C"], label: "Align Center", labelAr: "محاذاة وسط", category: "alignment" },
      { id: "align-right", keys: ["Alt", "D"], label: "Align Right", labelAr: "محاذاة يمين", category: "alignment" },
      { id: "align-top", keys: ["Alt", "W"], label: "Align Top", labelAr: "محاذاة أعلى", category: "alignment" },
      { id: "align-middle", keys: ["Alt", "E"], label: "Align Middle", labelAr: "محاذاة منتصف", category: "alignment" },
      { id: "align-bottom", keys: ["Alt", "S"], label: "Align Bottom", labelAr: "محاذاة أسفل", category: "alignment" },
    ],
  },
  {
    id: "movement",
    label: "Movement",
    labelAr: "التحريك",
    icon: ArrowUp,
    shortcuts: [
      { id: "move-up", keys: ["↑"], label: "Move Up", labelAr: "تحريك لأعلى", category: "movement" },
      { id: "move-down", keys: ["↓"], label: "Move Down", labelAr: "تحريك لأسفل", category: "movement" },
      { id: "move-left", keys: ["←"], label: "Move Left", labelAr: "تحريك لليسار", category: "movement" },
      { id: "move-right", keys: ["→"], label: "Move Right", labelAr: "تحريك لليمين", category: "movement" },
      { id: "move-fast", keys: ["Shift", "Arrow"], label: "Move 10px", labelAr: "تحريك 10 بكسل", category: "movement" },
      { id: "nudge", keys: ["Ctrl", "Arrow"], label: "Nudge 1px", labelAr: "تحريك 1 بكسل", category: "movement" },
    ],
  },
  {
    id: "file",
    label: "File",
    labelAr: "ملف",
    icon: Save,
    shortcuts: [
      { id: "save", keys: ["Ctrl", "S"], label: "Save", labelAr: "حفظ", category: "file" },
      { id: "save-as", keys: ["Ctrl", "Shift", "S"], label: "Save As", labelAr: "حفظ باسم", category: "file" },
      { id: "export", keys: ["Ctrl", "E"], label: "Export", labelAr: "تصدير", category: "file" },
      { id: "import", keys: ["Ctrl", "I"], label: "Import", labelAr: "استيراد", category: "file" },
      { id: "print", keys: ["Ctrl", "P"], label: "Print", labelAr: "طباعة", category: "file" },
    ],
  },
  {
    id: "ai",
    label: "AI Features",
    labelAr: "ميزات الذكاء الاصطناعي",
    icon: Sparkles,
    shortcuts: [
      { id: "ai-assistant", keys: ["Ctrl", "Space"], label: "Open AI Assistant", labelAr: "فتح المساعد الذكي", category: "ai" },
      { id: "ai-suggest", keys: ["Ctrl", "Shift", "Space"], label: "AI Suggestions", labelAr: "اقتراحات ذكية", category: "ai" },
      { id: "ai-generate", keys: ["Ctrl", "G"], label: "Generate with AI", labelAr: "إنشاء بالذكاء الاصطناعي", category: "ai" },
    ],
  },
];

// =============================================================================
// 🔑 KEY DISPLAY COMPONENT
// =============================================================================

interface KeyProps {
  keyName: string;
  size?: "sm" | "md" | "lg";
}

const Key: React.FC<KeyProps> = ({ keyName, size = "md" }) => {
  const sizeClasses = {
    sm: "min-w-[20px] h-5 text-[10px] px-1",
    md: "min-w-[24px] h-6 text-xs px-1.5",
    lg: "min-w-[28px] h-7 text-sm px-2",
  };

  // Special key icons
  const getKeyContent = () => {
    switch (keyName.toLowerCase()) {
      case "ctrl":
      case "control":
        return <span>Ctrl</span>;
      case "alt":
        return <span>Alt</span>;
      case "shift":
        return <span>⇧</span>;
      case "cmd":
      case "command":
        return <Command className="w-3 h-3" />;
      case "option":
        return <Option className="w-3 h-3" />;
      case "enter":
      case "return":
        return <CornerDownLeft className="w-3 h-3" />;
      case "delete":
      case "backspace":
        return <Delete className="w-3 h-3" />;
      case "space":
        return <Space className="w-3 h-3" />;
      case "↑":
        return <ArrowUp className="w-3 h-3" />;
      case "↓":
        return <ArrowDown className="w-3 h-3" />;
      case "←":
        return <ArrowLeft className="w-3 h-3" />;
      case "→":
        return <ArrowRight className="w-3 h-3" />;
      case "scroll":
        return <span>🖱️</span>;
      default:
        return <span>{keyName}</span>;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-medium",
        "bg-gray-100 border border-gray-300 rounded shadow-sm",
        "text-gray-700",
        sizeClasses[size]
      )}
    >
      {getKeyContent()}
    </span>
  );
};

// =============================================================================
// 🔧 SHORTCUT ROW COMPONENT
// =============================================================================

interface ShortcutRowProps {
  shortcut: ShortcutDefinition;
  isArabic?: boolean;
  onEdit?: () => void;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({
  shortcut,
  isArabic = false,
  onEdit,
}) => {
  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-lg",
        shortcut.isDisabled && "opacity-50"
      )}
    >
      <div className="flex-1">
        <span className="text-sm text-gray-700">
          {isArabic ? shortcut.labelAr : shortcut.label}
        </span>
        {shortcut.description && (
          <p className="text-xs text-gray-400 mt-0.5">
            {isArabic ? shortcut.descriptionAr : shortcut.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={index}>
            <Key keyName={key} size="sm" />
            {index < shortcut.keys.length - 1 && (
              <span className="text-gray-400 text-xs">+</span>
            )}
          </React.Fragment>
        ))}
        {shortcut.isCustom && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded">
            Custom
          </span>
        )}
      </div>
    </motion.div>
  );
};

// =============================================================================
// 🎯 MAIN KEYBOARD SHORTCUTS COMPONENT
// =============================================================================

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  isOpen,
  onClose,
  onShortcutPress,
  customShortcuts = [],
  showSearch = true,
  allowCustomization = false,
  className,
  dir = "ltr",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    DEFAULT_SHORTCUTS.map((c) => c.id)
  );

  const isArabic = dir === "rtl";

  // Merge default and custom shortcuts
  const allShortcuts = useMemo(() => {
    return DEFAULT_SHORTCUTS.map((category) => ({
      ...category,
      shortcuts: [
        ...category.shortcuts,
        ...customShortcuts.filter((s) => s.category === category.id),
      ],
    }));
  }, [customShortcuts]);

  // Filter shortcuts based on search
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return allShortcuts;

    return allShortcuts
      .map((category) => ({
        ...category,
        shortcuts: category.shortcuts.filter(
          (shortcut) =>
            shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shortcut.labelAr.includes(searchQuery) ||
            shortcut.keys.some((key) =>
              key.toLowerCase().includes(searchQuery.toLowerCase())
            )
        ),
      }))
      .filter((category) => category.shortcuts.length > 0);
  }, [allShortcuts, searchQuery]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            "relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          dir={dir}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Keyboard className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {isArabic ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isArabic ? "بحث عن اختصار..." : "Search shortcuts..."
                  }
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4">
            {filteredShortcuts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {isArabic
                    ? "لم يتم العثور على اختصارات"
                    : "No shortcuts found"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredShortcuts.map((category) => {
                  const Icon = category.icon;
                  const isExpanded = expandedCategories.includes(category.id);

                  return (
                    <div
                      key={category.id}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-gray-500" />
                        <span className="flex-1 text-sm font-medium text-gray-700 text-left">
                          {isArabic ? category.labelAr : category.label}
                        </span>
                        <span className="text-xs text-gray-400 mr-2">
                          {category.shortcuts.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-gray-100">
                              {category.shortcuts.map((shortcut) => (
                                <ShortcutRow
                                  key={shortcut.id}
                                  shortcut={shortcut}
                                  isArabic={isArabic}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {isArabic
                  ? "اضغط ? لإظهار هذه القائمة"
                  : "Press ? to show this menu"}
              </span>
              {allowCustomization && (
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  {isArabic ? "تخصيص الاختصارات" : "Customize Shortcuts"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// =============================================================================
// 📦 SHORTCUT HINT COMPONENT
// =============================================================================

interface ShortcutHintProps {
  keys: string[];
  label?: string;
  className?: string;
}

const ShortcutHintComponent: React.FC<ShortcutHintProps> = ({
  keys,
  label,
  className,
}) => {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {label && <span className="text-xs text-gray-500 mr-1">{label}</span>}
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Key keyName={key} size="sm" />
          {index < keys.length - 1 && (
            <span className="text-gray-400 text-[10px]">+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
};

export default KeyboardShortcuts;
export { Key, ShortcutHintComponent as ShortcutHint };
export type { KeyboardShortcutsProps, ShortcutDefinition, ShortcutCategory };
