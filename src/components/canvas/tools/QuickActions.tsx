// =============================================================================
// ⚡ CCCWAYS Canvas - إجراءات سريعة (Quick Actions)
// قائمة إجراءات سريعة تظهر عند التحديد أو النقر بالزر الأيمن
// =============================================================================

"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  MoveUp,
  MoveDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Layers,
  Group,
  Ungroup,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Palette,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  RotateCcw,
  Link2,
  Unlink2,
  Sparkles,
  MessageSquare,
  Download,
  Edit3,
  MoreHorizontal,
  ChevronRight,
  Maximize2,
  Minimize2,
  Grid3X3,
  Ruler,
  Type,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Point, CanvasElement } from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface QuickActionsProps {
  position: Point;
  selectedElements: CanvasElement[];
  onAction: (action: QuickActionType, data?: any) => void;
  onClose: () => void;
  isContextMenu?: boolean;
  showAlignmentTools?: boolean;
  showAIOptions?: boolean;
  className?: string;
  dir?: "rtl" | "ltr";
}

type QuickActionType =
  | "copy"
  | "paste"
  | "cut"
  | "delete"
  | "duplicate"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignTop"
  | "alignMiddle"
  | "alignBottom"
  | "distributeHorizontally"
  | "distributeVertically"
  | "bringToFront"
  | "sendToBack"
  | "bringForward"
  | "sendBackward"
  | "group"
  | "ungroup"
  | "lock"
  | "unlock"
  | "hide"
  | "show"
  | "flipHorizontal"
  | "flipVertical"
  | "rotateCW"
  | "rotateCCW"
  | "link"
  | "unlink"
  | "comment"
  | "aiSuggest"
  | "aiStyle"
  | "aiDescribe"
  | "export"
  | "editText"
  | "replaceImage"
  | "fitToContent"
  | "matchSize";

interface ActionItem {
  id: QuickActionType;
  icon: React.ComponentType<any>;
  label: string;
  labelAr: string;
  shortcut?: string;
  variant?: "default" | "danger";
  requiresMultiple?: boolean;
  hideWhenLocked?: boolean;
  showOnTypes?: string[];
}

interface ActionGroup {
  id: string;
  label: string;
  labelAr: string;
  items: ActionItem[];
  icon?: React.ComponentType<any>;
}

// =============================================================================
// 🔧 ACTION DEFINITIONS
// =============================================================================

const ACTION_GROUPS: ActionGroup[] = [
  {
    id: "clipboard",
    label: "Clipboard",
    labelAr: "الحافظة",
    items: [
      { id: "copy", icon: Copy, label: "Copy", labelAr: "نسخ", shortcut: "Ctrl+C" },
      { id: "cut", icon: Scissors, label: "Cut", labelAr: "قص", shortcut: "Ctrl+X" },
      { id: "paste", icon: Clipboard, label: "Paste", labelAr: "لصق", shortcut: "Ctrl+V" },
      { id: "duplicate", icon: Copy, label: "Duplicate", labelAr: "تكرار", shortcut: "Ctrl+D" },
      { id: "delete", icon: Trash2, label: "Delete", labelAr: "حذف", shortcut: "Del", variant: "danger" },
    ],
  },
  {
    id: "alignment",
    label: "Align",
    labelAr: "محاذاة",
    icon: AlignCenter,
    items: [
      { id: "alignLeft", icon: AlignLeft, label: "Align Left", labelAr: "محاذاة يسار", requiresMultiple: true },
      { id: "alignCenter", icon: AlignCenter, label: "Align Center", labelAr: "محاذاة وسط", requiresMultiple: true },
      { id: "alignRight", icon: AlignRight, label: "Align Right", labelAr: "محاذاة يمين", requiresMultiple: true },
      { id: "alignTop", icon: AlignStartVertical, label: "Align Top", labelAr: "محاذاة أعلى", requiresMultiple: true },
      { id: "alignMiddle", icon: AlignCenterVertical, label: "Align Middle", labelAr: "محاذاة منتصف", requiresMultiple: true },
      { id: "alignBottom", icon: AlignEndVertical, label: "Align Bottom", labelAr: "محاذاة أسفل", requiresMultiple: true },
    ],
  },
  {
    id: "distribute",
    label: "Distribute",
    labelAr: "توزيع",
    icon: Grid3X3,
    items: [
      { id: "distributeHorizontally", icon: Ruler, label: "Distribute Horizontally", labelAr: "توزيع أفقي", requiresMultiple: true },
      { id: "distributeVertically", icon: Ruler, label: "Distribute Vertically", labelAr: "توزيع عمودي", requiresMultiple: true },
      { id: "matchSize", icon: Maximize2, label: "Match Size", labelAr: "مطابقة الحجم", requiresMultiple: true },
    ],
  },
  {
    id: "order",
    label: "Order",
    labelAr: "الترتيب",
    icon: Layers,
    items: [
      { id: "bringToFront", icon: ArrowUpToLine, label: "Bring to Front", labelAr: "إحضار للأمام", shortcut: "Ctrl+]" },
      { id: "sendToBack", icon: ArrowDownToLine, label: "Send to Back", labelAr: "إرسال للخلف", shortcut: "Ctrl+[" },
      { id: "bringForward", icon: MoveUp, label: "Bring Forward", labelAr: "تقديم" },
      { id: "sendBackward", icon: MoveDown, label: "Send Backward", labelAr: "تأخير" },
    ],
  },
  {
    id: "grouping",
    label: "Group",
    labelAr: "تجميع",
    icon: Group,
    items: [
      { id: "group", icon: Group, label: "Group", labelAr: "تجميع", shortcut: "Ctrl+G", requiresMultiple: true },
      { id: "ungroup", icon: Ungroup, label: "Ungroup", labelAr: "فك التجميع", shortcut: "Ctrl+Shift+G" },
    ],
  },
  {
    id: "transform",
    label: "Transform",
    labelAr: "تحويل",
    icon: RotateCw,
    items: [
      { id: "flipHorizontal", icon: FlipHorizontal, label: "Flip Horizontal", labelAr: "قلب أفقي" },
      { id: "flipVertical", icon: FlipVertical, label: "Flip Vertical", labelAr: "قلب عمودي" },
      { id: "rotateCW", icon: RotateCw, label: "Rotate 90° CW", labelAr: "تدوير 90° مع عقارب الساعة" },
      { id: "rotateCCW", icon: RotateCcw, label: "Rotate 90° CCW", labelAr: "تدوير 90° عكس عقارب الساعة" },
    ],
  },
  {
    id: "visibility",
    label: "Visibility",
    labelAr: "الرؤية",
    icon: Eye,
    items: [
      { id: "lock", icon: Lock, label: "Lock", labelAr: "قفل", shortcut: "Ctrl+L" },
      { id: "unlock", icon: Unlock, label: "Unlock", labelAr: "فتح القفل" },
      { id: "hide", icon: EyeOff, label: "Hide", labelAr: "إخفاء", shortcut: "Ctrl+H" },
      { id: "show", icon: Eye, label: "Show", labelAr: "إظهار" },
    ],
  },
  {
    id: "connections",
    label: "Connections",
    labelAr: "الاتصالات",
    icon: Link2,
    items: [
      { id: "link", icon: Link2, label: "Create Link", labelAr: "إنشاء رابط" },
      { id: "unlink", icon: Unlink2, label: "Remove Link", labelAr: "إزالة الرابط" },
    ],
  },
  {
    id: "ai",
    label: "AI Actions",
    labelAr: "إجراءات الذكاء الاصطناعي",
    icon: Sparkles,
    items: [
      { id: "aiSuggest", icon: Sparkles, label: "AI Suggest", labelAr: "اقتراح ذكي" },
      { id: "aiStyle", icon: Palette, label: "AI Style", labelAr: "تنسيق ذكي" },
      { id: "aiDescribe", icon: MessageSquare, label: "AI Describe", labelAr: "وصف ذكي" },
    ],
  },
  {
    id: "element",
    label: "Element Actions",
    labelAr: "إجراءات العنصر",
    items: [
      { id: "editText", icon: Edit3, label: "Edit Text", labelAr: "تحرير النص", showOnTypes: ["text", "sticky"] },
      { id: "replaceImage", icon: Image, label: "Replace Image", labelAr: "استبدال الصورة", showOnTypes: ["image"] },
      { id: "fitToContent", icon: Minimize2, label: "Fit to Content", labelAr: "ملاءمة للمحتوى" },
      { id: "comment", icon: MessageSquare, label: "Add Comment", labelAr: "إضافة تعليق" },
      { id: "export", icon: Download, label: "Export", labelAr: "تصدير", shortcut: "Ctrl+E" },
    ],
  },
];

// =============================================================================
// 🔘 ACTION BUTTON COMPONENT
// =============================================================================

interface ActionButtonProps {
  action: ActionItem;
  onClick: () => void;
  disabled?: boolean;
  isArabic?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  onClick,
  disabled = false,
  isArabic = false,
}) => {
  const Icon = action.icon;

  return (
    <motion.button
      whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors rounded",
        disabled && "opacity-50 cursor-not-allowed",
        action.variant === "danger" && "text-red-600 hover:bg-red-50"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">
        {isArabic ? action.labelAr : action.label}
      </span>
      {action.shortcut && (
        <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">
          {action.shortcut}
        </span>
      )}
    </motion.button>
  );
};

// =============================================================================
// 📁 SUBMENU COMPONENT
// =============================================================================

interface SubmenuProps {
  group: ActionGroup;
  onAction: (action: QuickActionType) => void;
  selectedElements: CanvasElement[];
  isArabic?: boolean;
}

const Submenu: React.FC<SubmenuProps> = ({
  group,
  onAction,
  selectedElements,
  isArabic = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const Icon = group.icon || MoreHorizontal;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isActionDisabled = (action: ActionItem): boolean => {
    if (action.requiresMultiple && selectedElements.length < 2) return true;
    if (action.showOnTypes && selectedElements.length > 0) {
      return !selectedElements.some((el) => action.showOnTypes!.includes(el.type));
    }
    return false;
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors rounded">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">
          {isArabic ? group.labelAr : group.label}
        </span>
        <ChevronRight className="w-3 h-3 text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={cn(
              "absolute z-50 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-xl py-1",
              isArabic ? "right-full mr-1" : "left-full ml-1",
              "top-0"
            )}
          >
            {group.items.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onClick={() => onAction(action.id)}
                disabled={isActionDisabled(action)}
                isArabic={isArabic}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// 🎯 MAIN QUICK ACTIONS COMPONENT
// =============================================================================

export const QuickActions: React.FC<QuickActionsProps> = ({
  position,
  selectedElements,
  onAction,
  onClose,
  isContextMenu = false,
  showAlignmentTools = true,
  showAIOptions = true,
  className,
  dir = "ltr",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const isArabic = dir === "rtl";

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      if (position.x + rect.width > viewportWidth) {
        newX = position.x - rect.width;
      }

      if (position.y + rect.height > viewportHeight) {
        newY = position.y - rect.height;
      }

      setAdjustedPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
    }
  }, [position]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleAction = useCallback(
    (actionType: QuickActionType) => {
      onAction(actionType);
      onClose();
    },
    [onAction, onClose]
  );

  const isActionDisabled = (action: ActionItem): boolean => {
    if (action.requiresMultiple && selectedElements.length < 2) return true;
    if (action.hideWhenLocked && selectedElements.some((el) => el.locked)) return true;
    if (action.showOnTypes && selectedElements.length > 0) {
      return !selectedElements.some((el) => action.showOnTypes!.includes(el.type));
    }
    return false;
  };

  // Filter visible groups based on settings
  const visibleGroups = useMemo(() => {
    return ACTION_GROUPS.filter((group) => {
      if (!showAlignmentTools && (group.id === "alignment" || group.id === "distribute")) {
        return false;
      }
      if (!showAIOptions && group.id === "ai") {
        return false;
      }
      return true;
    });
  }, [showAlignmentTools, showAIOptions]);

  // Primary actions (always visible without submenu)
  const primaryGroup = ACTION_GROUPS.find((g) => g.id === "clipboard");

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: "fixed",
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      className={cn(
        "z-50 min-w-[200px] max-w-[280px] bg-white border border-gray-200 rounded-xl shadow-2xl py-1 overflow-hidden",
        className
      )}
      dir={dir}
    >
      {/* Selection Info */}
      {selectedElements.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="text-xs text-gray-500">
            {isArabic
              ? `${selectedElements.length} عنصر محدد`
              : `${selectedElements.length} element${selectedElements.length > 1 ? "s" : ""} selected`}
          </div>
        </div>
      )}

      {/* Primary Actions (Clipboard) */}
      {primaryGroup && (
        <div className="py-1 border-b border-gray-100">
          {primaryGroup.items.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onClick={() => handleAction(action.id)}
              disabled={isActionDisabled(action)}
              isArabic={isArabic}
            />
          ))}
        </div>
      )}

      {/* Other Groups as Submenus */}
      <div className="py-1">
        {visibleGroups
          .filter((g: ActionGroup) => g.id !== "clipboard")
          .map((group: ActionGroup) => (
            <Submenu
              key={group.id}
              group={group}
              onAction={handleAction}
              selectedElements={selectedElements}
              isArabic={isArabic}
            />
          ))}
      </div>
    </motion.div>
  );
};

// =============================================================================
// 🎯 FLOATING QUICK BAR (Alternative compact version)
// =============================================================================

interface QuickBarProps {
  selectedElements: CanvasElement[];
  onAction: (action: QuickActionType) => void;
  position: Point;
  className?: string;
  dir?: "rtl" | "ltr";
}

export const QuickBar: React.FC<QuickBarProps> = ({
  selectedElements,
  onAction,
  position,
  className,
  dir = "ltr",
}) => {
  const quickActions: ActionItem[] = [
    { id: "copy", icon: Copy, label: "Copy", labelAr: "نسخ" },
    { id: "duplicate", icon: Copy, label: "Duplicate", labelAr: "تكرار" },
    { id: "delete", icon: Trash2, label: "Delete", labelAr: "حذف", variant: "danger" },
    { id: "bringToFront", icon: ArrowUpToLine, label: "To Front", labelAr: "للأمام" },
    { id: "sendToBack", icon: ArrowDownToLine, label: "To Back", labelAr: "للخلف" },
    { id: "group", icon: Group, label: "Group", labelAr: "تجميع", requiresMultiple: true },
    { id: "lock", icon: Lock, label: "Lock", labelAr: "قفل" },
    { id: "aiSuggest", icon: Sparkles, label: "AI", labelAr: "ذكاء" },
  ];

  const isArabic = dir === "rtl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y - 50,
        transform: "translateX(-50%)",
      }}
      className={cn(
        "flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-xl",
        className
      )}
      dir={dir}
    >
      {quickActions.map((action) => {
        const Icon = action.icon;
        const disabled = action.requiresMultiple && selectedElements.length < 2;

        return (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              disabled
                ? "opacity-50 cursor-not-allowed"
                : action.variant === "danger"
                ? "hover:bg-red-100 text-red-600"
                : "hover:bg-gray-100 text-gray-600"
            )}
            title={isArabic ? action.labelAr : action.label}
          >
            <Icon className="w-4 h-4" />
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default QuickActions;
export type { QuickActionsProps, QuickActionType, QuickBarProps };
