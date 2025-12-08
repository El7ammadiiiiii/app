// =============================================================================
// 📌 CCCWAYS Canvas - ملاحظة لاصقة (Sticky Note Component)
// ملاحظات لاصقة ملونة مع دعم التحرير والتنسيق
// =============================================================================

"use client";

import React, { 
  useCallback, 
  useRef, 
  useState, 
  useEffect,
  forwardRef,
  useImperativeHandle 
} from "react";
import { motion } from "framer-motion";
import { 
  Pin,
  Trash2,
  Copy,
  Palette,
  MoreVertical,
  Check,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { 
  StickyElement, 
  Point, 
  Bounds 
} from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface StickyNoteProps {
  element: StickyElement;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  isEditing?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onDragStart?: (id: string, point: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onDragEnd?: (id: string) => void;
  onResize?: (id: string, bounds: Bounds) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onContextMenu?: (id: string, point: Point) => void;
  onEditStart?: (id: string) => void;
  onEditEnd?: (id: string) => void;
  showToolbar?: boolean;
  autoResize?: boolean;
  className?: string;
  dir?: "rtl" | "ltr";
}

interface StickyNoteRef {
  focus: () => void;
  blur: () => void;
  getContent: () => string;
}

// =============================================================================
// 🎨 STICKY NOTE COLORS
// =============================================================================

const STICKY_COLORS = [
  { name: "Yellow", nameAr: "أصفر", bg: "#fef08a", text: "#854d0e" },
  { name: "Pink", nameAr: "وردي", bg: "#fda4af", text: "#9f1239" },
  { name: "Blue", nameAr: "أزرق", bg: "#93c5fd", text: "#1e40af" },
  { name: "Green", nameAr: "أخضر", bg: "#86efac", text: "#166534" },
  { name: "Orange", nameAr: "برتقالي", bg: "#fed7aa", text: "#9a3412" },
  { name: "Purple", nameAr: "بنفسجي", bg: "#d8b4fe", text: "#6b21a8" },
  { name: "Cyan", nameAr: "سماوي", bg: "#67e8f9", text: "#0e7490" },
  { name: "Gray", nameAr: "رمادي", bg: "#e5e7eb", text: "#374151" },
];

const DEFAULT_STICKY_COLOR = STICKY_COLORS[0];

// =============================================================================
// 🎨 COLOR PICKER
// =============================================================================

interface ColorPickerProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  currentColor,
  onColorSelect,
  onClose,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={cn(
        "absolute z-50 p-2 bg-white rounded-lg shadow-xl border border-gray-200",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-4 gap-1">
        {STICKY_COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => {
              onColorSelect(color.bg);
              onClose();
            }}
            className={cn(
              "w-6 h-6 rounded-full transition-transform hover:scale-110",
              currentColor === color.bg && "ring-2 ring-offset-1 ring-gray-600"
            )}
            style={{ backgroundColor: color.bg }}
            title={color.name}
          >
            {currentColor === color.bg && (
              <Check className="w-3 h-3 m-auto" style={{ color: color.text }} />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// =============================================================================
// 🔧 STICKY TOOLBAR
// =============================================================================

interface StickyToolbarProps {
  onDelete?: () => void;
  onDuplicate?: () => void;
  onColorClick?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  isArabic?: boolean;
  className?: string;
}

const StickyToolbar: React.FC<StickyToolbarProps> = ({
  onDelete,
  onDuplicate,
  onColorClick,
  onPin,
  isPinned = false,
  isArabic = false,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className={cn(
        "absolute -top-8 right-0 flex items-center gap-1 px-1 py-0.5",
        "bg-white rounded-md shadow-lg border border-gray-200",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onColorClick}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title={isArabic ? "تغيير اللون" : "Change color"}
      >
        <Palette className="w-3.5 h-3.5 text-gray-600" />
      </button>
      <button
        onClick={onDuplicate}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title={isArabic ? "نسخ" : "Duplicate"}
      >
        <Copy className="w-3.5 h-3.5 text-gray-600" />
      </button>
      <button
        onClick={onPin}
        className={cn(
          "p-1 hover:bg-gray-100 rounded transition-colors",
          isPinned && "bg-blue-100"
        )}
        title={isArabic ? "تثبيت" : "Pin"}
      >
        <Pin className={cn("w-3.5 h-3.5", isPinned ? "text-blue-600" : "text-gray-600")} />
      </button>
      <button
        onClick={onDelete}
        className="p-1 hover:bg-red-100 rounded transition-colors"
        title={isArabic ? "حذف" : "Delete"}
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500" />
      </button>
    </motion.div>
  );
};

// =============================================================================
// 🎯 MAIN STICKY NOTE COMPONENT
// =============================================================================

export const StickyNote = forwardRef<StickyNoteRef, StickyNoteProps>(
  (
    {
      element,
      isSelected = false,
      isHovered = false,
      isLocked = false,
      isEditing: initialEditing = false,
      zoom = 1,
      onSelect,
      onDoubleClick,
      onTextChange,
      onColorChange,
      onDragStart,
      onDrag,
      onDragEnd,
      onResize,
      onDelete,
      onDuplicate,
      onContextMenu,
      onEditStart,
      onEditEnd,
      showToolbar = true,
      autoResize = false,
      className,
      dir = "ltr",
    },
    ref
  ) => {
    const textRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isEditing, setIsEditing] = useState(initialEditing);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [localText, setLocalText] = useState(element.content || element.text || "");
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    // Derive bounds safely
    const bounds: Bounds = element.bounds ?? {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
    
    const color = element.color || element.noteColor;
    const isArabic = dir === "rtl";

    // Get color info
    const colorInfo = STICKY_COLORS.find((c) => c.bg === color) || DEFAULT_STICKY_COLOR;

    // Sync with external editing state
    useEffect(() => {
      setIsEditing(initialEditing);
      if (initialEditing && textRef.current) {
        textRef.current.focus();
      }
    }, [initialEditing]);

    // Sync local text with element content
    useEffect(() => {
      setLocalText(element.content || element.text || "");
    }, [element.content, element.text]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => textRef.current?.focus(),
      blur: () => textRef.current?.blur(),
      getContent: () => localText,
    }));

    // Handle text change
    const handleTextChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setLocalText(newText);
        onTextChange?.(element.id, newText);
      },
      [element.id, onTextChange]
    );

    // Handle focus
    const handleFocus = useCallback(() => {
      setIsEditing(true);
      onEditStart?.(element.id);
    }, [element.id, onEditStart]);

    // Handle blur
    const handleBlur = useCallback(() => {
      setIsEditing(false);
      onEditEnd?.(element.id);
    }, [element.id, onEditEnd]);

    // Handle mouse down
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (isLocked) return;
        
        // If clicking on the textarea during editing, don't drag
        if (isEditing && e.target === textRef.current) {
          return;
        }

        e.stopPropagation();

        const point = { x: e.clientX, y: e.clientY };
        setDragStart(point);
        setIsDragging(true);

        onSelect?.(element.id, e.shiftKey || e.ctrlKey);
        onDragStart?.(element.id, point);
      },
      [element.id, isLocked, isEditing, onSelect, onDragStart]
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
        if (!isLocked) {
          setIsEditing(true);
          onDoubleClick?.(element.id);
          setTimeout(() => textRef.current?.focus(), 0);
        }
      },
      [element.id, isLocked, onDoubleClick]
    );

    // Handle context menu
    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        if (!isEditing) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(element.id, { x: e.clientX, y: e.clientY });
        }
      },
      [element.id, isEditing, onContextMenu]
    );

    // Handle color change
    const handleColorChange = useCallback(
      (newColor: string) => {
        onColorChange?.(element.id, newColor);
      },
      [element.id, onColorChange]
    );

    // Container styles
    const containerStyle: React.CSSProperties = {
      position: "absolute",
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      backgroundColor: colorInfo.bg,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      cursor: isLocked
        ? "not-allowed"
        : isEditing
        ? "text"
        : isDragging
        ? "grabbing"
        : "grab",
    };

    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
        style={containerStyle}
        className={cn(
          "rounded-sm shadow-md select-none",
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          isHovered && !isSelected && "ring-1 ring-blue-300",
          isLocked && "opacity-70",
          className
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        whileHover={{ scale: isLocked ? 1 : 1.01 }}
        dir={dir}
      >
        {/* Fold effect */}
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderStyle: "solid",
            borderWidth: "0 16px 16px 0",
            borderColor: `transparent ${adjustBrightness(colorInfo.bg, -15)} transparent transparent`,
          }}
        />

        {/* Toolbar */}
        {showToolbar && (isSelected || isHovered) && !isEditing && !isLocked && (
          <StickyToolbar
            onDelete={() => onDelete?.(element.id)}
            onDuplicate={() => onDuplicate?.(element.id)}
            onColorClick={() => setShowColorPicker(!showColorPicker)}
            onPin={() => setIsPinned(!isPinned)}
            isPinned={isPinned}
            isArabic={isArabic}
          />
        )}

        {/* Color Picker */}
        {showColorPicker && (
          <ColorPicker
            currentColor={colorInfo.bg}
            onColorSelect={handleColorChange}
            onClose={() => setShowColorPicker(false)}
            className="-top-16 right-0"
          />
        )}

        {/* Content */}
        <div className="relative w-full h-full p-3">
          <textarea
            ref={textRef}
            value={localText}
            onChange={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isArabic ? "اكتب ملاحظتك..." : "Write your note..."}
            readOnly={isLocked}
            className={cn(
              "w-full h-full bg-transparent resize-none outline-none",
              "text-sm font-medium placeholder:opacity-50",
              !isEditing && "pointer-events-none cursor-inherit"
            )}
            style={{
              color: colorInfo.text,
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <Pin className="w-4 h-4 text-red-500 fill-red-500 transform -rotate-45" />
          </div>
        )}

        {/* Lock indicator */}
        {isLocked && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-gray-800/80 text-white rounded-full flex items-center justify-center text-[8px]">
            🔒
          </div>
        )}

        {/* Selection handles */}
        {isSelected && !isLocked && !isEditing && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
          </>
        )}
      </motion.div>
    );
  }
);

StickyNote.displayName = "StickyNote";

// =============================================================================
// 🔧 HELPERS
// =============================================================================

/**
 * تعديل سطوع اللون
 */
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

export default StickyNote;
export { ColorPicker, StickyToolbar, STICKY_COLORS, adjustBrightness };
export type { StickyNoteProps, StickyNoteRef };
