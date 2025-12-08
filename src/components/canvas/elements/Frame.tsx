// =============================================================================
// 🖼️ CCCWAYS Canvas - الإطار (Frame Component)
// إطار لتجميع العناصر مع عنوان ودعم التخطيط
// =============================================================================

"use client";

import React, { 
  useCallback, 
  useRef, 
  useState, 
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo 
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Frame as FrameIcon,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit3,
  Layers,
  Grid3X3,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { 
  FrameElement, 
  Point, 
  Bounds,
  CanvasElement 
} from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface FrameProps {
  element: FrameElement;
  children?: React.ReactNode;
  childElements?: CanvasElement[];
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  isCollapsed?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  onDragStart?: (id: string, point: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onDragEnd?: (id: string) => void;
  onResize?: (id: string, bounds: Bounds) => void;
  onToggleCollapse?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onContextMenu?: (id: string, point: Point) => void;
  onChildDrop?: (frameId: string, childId: string) => void;
  showHeader?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  className?: string;
  dir?: "rtl" | "ltr";
}

interface FrameRef {
  focus: () => void;
  getChildIds: () => string[];
  getBounds: () => Bounds;
}

interface FrameStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  headerColor?: string;
  headerTextColor?: string;
  padding?: number;
  gap?: number;
  layout?: "free" | "horizontal" | "vertical" | "grid";
  gridColumns?: number;
}

// =============================================================================
// 🎨 FRAME PRESETS
// =============================================================================

const FRAME_PRESETS = {
  default: {
    name: "Default",
    nameAr: "افتراضي",
    width: 400,
    height: 300,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e5e7eb",
      headerColor: "#f3f4f6",
    },
  },
  mobile: {
    name: "Mobile",
    nameAr: "جوال",
    width: 375,
    height: 812,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#1f2937",
      borderRadius: 40,
    },
  },
  tablet: {
    name: "Tablet",
    nameAr: "لوحي",
    width: 768,
    height: 1024,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#1f2937",
      borderRadius: 20,
    },
  },
  desktop: {
    name: "Desktop",
    nameAr: "سطح المكتب",
    width: 1440,
    height: 900,
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#d1d5db",
    },
  },
  presentation: {
    name: "Presentation",
    nameAr: "عرض تقديمي",
    width: 1920,
    height: 1080,
    style: {
      backgroundColor: "#1f2937",
      borderColor: "#374151",
      headerColor: "#374151",
      headerTextColor: "#ffffff",
    },
  },
};

// =============================================================================
// 🔧 FRAME HEADER
// =============================================================================

interface FrameHeaderProps {
  title: string;
  isEditing: boolean;
  isCollapsed: boolean;
  isLocked: boolean;
  isVisible: boolean;
  onTitleChange: (title: string) => void;
  onTitleClick: () => void;
  onTitleBlur: () => void;
  onToggleCollapse: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onMenuClick: () => void;
  style?: Partial<FrameStyle>;
  isArabic?: boolean;
  className?: string;
}

const FrameHeader: React.FC<FrameHeaderProps> = ({
  title,
  isEditing,
  isCollapsed,
  isLocked,
  isVisible,
  onTitleChange,
  onTitleClick,
  onTitleBlur,
  onToggleCollapse,
  onToggleLock,
  onToggleVisibility,
  onMenuClick,
  style,
  isArabic = false,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-t-md",
        "cursor-move select-none",
        className
      )}
      style={{
        backgroundColor: style?.headerColor ?? "#f3f4f6",
        color: style?.headerTextColor ?? "#374151",
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        className="p-0.5 hover:bg-black/10 rounded transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Frame icon */}
      <FrameIcon className="w-3.5 h-3.5 opacity-60" />

      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              onTitleBlur();
            }
          }}
          className="flex-1 px-1 py-0.5 text-xs font-medium bg-white border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-400"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-xs font-medium truncate cursor-text"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onTitleClick();
          }}
        >
          {title || (isArabic ? "إطار بدون عنوان" : "Untitled Frame")}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={cn(
            "p-0.5 rounded transition-colors",
            isVisible ? "hover:bg-black/10" : "bg-black/10"
          )}
          title={isArabic ? (isVisible ? "إخفاء" : "إظهار") : (isVisible ? "Hide" : "Show")}
        >
          {isVisible ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          className={cn(
            "p-0.5 rounded transition-colors",
            isLocked ? "bg-black/10" : "hover:bg-black/10"
          )}
          title={isArabic ? (isLocked ? "فتح القفل" : "قفل") : (isLocked ? "Unlock" : "Lock")}
        >
          {isLocked ? (
            <Lock className="w-3 h-3" />
          ) : (
            <Unlock className="w-3 h-3" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick();
          }}
          className="p-0.5 hover:bg-black/10 rounded transition-colors"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// 🎯 MAIN FRAME COMPONENT
// =============================================================================

export const Frame = forwardRef<FrameRef, FrameProps>(
  (
    {
      element,
      children,
      childElements = [],
      isSelected = false,
      isHovered = false,
      isLocked: propLocked,
      isCollapsed: propCollapsed,
      zoom = 1,
      onSelect,
      onDoubleClick,
      onTitleChange,
      onDragStart,
      onDrag,
      onDragEnd,
      onResize,
      onToggleCollapse,
      onToggleLock,
      onToggleVisibility,
      onDelete,
      onDuplicate,
      onContextMenu,
      onChildDrop,
      showHeader = true,
      showGrid = false,
      gridSize = 20,
      className,
      dir = "ltr",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(element.name || "");
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(propCollapsed ?? false);
    const [isLocked, setIsLocked] = useState(propLocked ?? element.locked ?? false);
    const [isVisible, setIsVisible] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Derive bounds safely
    const bounds: Bounds = element.bounds ?? {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
    
    const { style = {} } = element;
    const frameStyle = style as FrameStyle;
    const isArabic = dir === "rtl";

    // Sync with props
    useEffect(() => {
      if (propLocked !== undefined) setIsLocked(propLocked);
    }, [propLocked]);

    useEffect(() => {
      if (propCollapsed !== undefined) setIsCollapsed(propCollapsed);
    }, [propCollapsed]);

    useEffect(() => {
      setLocalTitle(element.name || "");
    }, [element.name]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => containerRef.current?.focus(),
      getChildIds: () => element.children || element.childIds || [],
      getBounds: () => bounds,
    }));

    // Handle title change
    const handleTitleChange = useCallback((newTitle: string) => {
      setLocalTitle(newTitle);
    }, []);

    const handleTitleBlur = useCallback(() => {
      setIsEditingTitle(false);
      if (localTitle !== element.name) {
        onTitleChange?.(element.id, localTitle);
      }
    }, [element.id, element.name, localTitle, onTitleChange]);

    // Handle collapse toggle
    const handleToggleCollapse = useCallback(() => {
      setIsCollapsed((prev) => !prev);
      onToggleCollapse?.(element.id);
    }, [element.id, onToggleCollapse]);

    // Handle lock toggle
    const handleToggleLock = useCallback(() => {
      setIsLocked((prev) => !prev);
      onToggleLock?.(element.id);
    }, [element.id, onToggleLock]);

    // Handle visibility toggle
    const handleToggleVisibility = useCallback(() => {
      setIsVisible((prev) => !prev);
      onToggleVisibility?.(element.id);
    }, [element.id, onToggleVisibility]);

    // Handle mouse down (header drag)
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (isLocked || isEditingTitle) return;
        e.stopPropagation();

        const point = { x: e.clientX, y: e.clientY };
        setDragStart(point);
        setIsDragging(true);

        onSelect?.(element.id, e.shiftKey || e.ctrlKey);
        onDragStart?.(element.id, point);
      },
      [element.id, isLocked, isEditingTitle, onSelect, onDragStart]
    );

    // Handle mouse move
    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging || !dragStart) return;

        const delta = {
          x: (e.clientX - dragStart.x) / zoom,
          y: (e.clientY - dragStart.y) / zoom,
        };

        onDrag?.(element.id, delta);
        setDragStart({ x: e.clientX, y: e.clientY });
      },
      [isDragging, dragStart, zoom, element.id, onDrag]
    );

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        onDragEnd?.(element.id);
      }
    }, [isDragging, element.id, onDragEnd]);

    // Set up global mouse events when dragging
    useEffect(() => {
      if (isDragging) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Handle double click
    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDoubleClick?.(element.id);
      },
      [element.id, onDoubleClick]
    );

    // Handle context menu
    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(element.id, { x: e.clientX, y: e.clientY });
      },
      [element.id, onContextMenu]
    );

    // Handle drag over (for dropping children)
    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const childId = e.dataTransfer.getData("elementId");
        if (childId && childId !== element.id) {
          onChildDrop?.(element.id, childId);
        }
      },
      [element.id, onChildDrop]
    );

    // Container styles
    const containerStyle: React.CSSProperties = {
      position: "absolute",
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: isCollapsed ? "auto" : bounds.height,
      backgroundColor: frameStyle.backgroundColor ?? "#ffffff",
      borderColor: frameStyle.borderColor ?? "#e5e7eb",
      borderWidth: frameStyle.borderWidth ?? 1,
      borderStyle: "solid",
      borderRadius: frameStyle.borderRadius ?? 8,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      opacity: isVisible ? 1 : 0.5,
    };

    // Content styles based on layout
    const contentStyle: React.CSSProperties = useMemo(() => {
      const layout = frameStyle.layout ?? "free";
      const padding = frameStyle.padding ?? 16;
      const gap = frameStyle.gap ?? 8;

      const baseStyle: React.CSSProperties = {
        padding,
        minHeight: isCollapsed ? 0 : 100,
      };

      switch (layout) {
        case "horizontal":
          return {
            ...baseStyle,
            display: "flex",
            flexDirection: "row",
            gap,
            flexWrap: "wrap",
          };
        case "vertical":
          return {
            ...baseStyle,
            display: "flex",
            flexDirection: "column",
            gap,
          };
        case "grid":
          return {
            ...baseStyle,
            display: "grid",
            gridTemplateColumns: `repeat(${frameStyle.gridColumns ?? 3}, 1fr)`,
            gap,
          };
        default:
          return {
            ...baseStyle,
            position: "relative",
          };
      }
    }, [frameStyle, isCollapsed]);

    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={containerStyle}
        className={cn(
          "select-none overflow-hidden",
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          isHovered && !isSelected && "ring-1 ring-blue-300",
          isDragOver && "ring-2 ring-green-500",
          isLocked && "opacity-80",
          className
        )}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        dir={dir}
      >
        {/* Header */}
        {showHeader && (
          <div onMouseDown={handleMouseDown}>
            <FrameHeader
              title={localTitle}
              isEditing={isEditingTitle}
              isCollapsed={isCollapsed}
              isLocked={isLocked}
              isVisible={isVisible}
              onTitleChange={handleTitleChange}
              onTitleClick={() => setIsEditingTitle(true)}
              onTitleBlur={handleTitleBlur}
              onToggleCollapse={handleToggleCollapse}
              onToggleLock={handleToggleLock}
              onToggleVisibility={handleToggleVisibility}
              onMenuClick={() => setShowMenu(!showMenu)}
              style={frameStyle}
              isArabic={isArabic}
            />
          </div>
        )}

        {/* Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={contentStyle}
              className="relative"
            >
              {/* Grid overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #94a3b8 1px, transparent 1px),
                      linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  }}
                />
              )}

              {/* Child elements or children */}
              {children}

              {/* Empty state */}
              {!children && childElements.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  <div className="text-center">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{isArabic ? "اسحب العناصر هنا" : "Drop elements here"}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute top-8 right-2 z-50 py-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[150px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onDuplicate?.(element.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Copy className="w-4 h-4" />
                {isArabic ? "نسخ" : "Duplicate"}
              </button>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit3 className="w-4 h-4" />
                {isArabic ? "إعادة التسمية" : "Rename"}
              </button>
              <button
                onClick={() => {
                  onDelete?.(element.id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                {isArabic ? "حذف" : "Delete"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resize handles */}
        {isSelected && !isLocked && !isCollapsed && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ns-resize" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ns-resize" />
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ew-resize" />
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ew-resize" />
          </>
        )}
      </motion.div>
    );
  }
);

Frame.displayName = "Frame";

export default Frame;
export { FrameHeader, FRAME_PRESETS };
export type { FrameProps, FrameRef, FrameStyle };
