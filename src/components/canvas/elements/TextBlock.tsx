// =============================================================================
// 📝 CCCWAYS Canvas - مكون النص (Text Block Component)
// مكون نص قابل للتحرير مع دعم التنسيق
// =============================================================================

"use client";

import React, { 
  useCallback, 
  useMemo, 
  useRef, 
  useState, 
  useEffect,
  forwardRef,
  useImperativeHandle 
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { 
  TextElement, 
  Point, 
  Bounds,
  TextStyle 
} from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface TextBlockProps {
  element: TextElement;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  isEditing?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  onStyleChange?: (id: string, style: Partial<TextStyle>) => void;
  onDragStart?: (id: string, point: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onDragEnd?: (id: string) => void;
  onResize?: (id: string, bounds: Bounds) => void;
  onContextMenu?: (id: string, point: Point) => void;
  onEditStart?: (id: string) => void;
  onEditEnd?: (id: string) => void;
  autoResize?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  placeholder?: string;
  placeholderAr?: string;
  className?: string;
  dir?: "rtl" | "ltr" | "auto";
}

interface TextBlockRef {
  focus: () => void;
  blur: () => void;
  selectAll: () => void;
  getContent: () => string;
  setContent: (text: string) => void;
}

// =============================================================================
// 🔧 TEXT UTILITIES
// =============================================================================

/**
 * حساب حجم النص تلقائياً
 */
const measureText = (
  text: string,
  style: TextStyle,
  maxWidth?: number
): { width: number; height: number } => {
  if (typeof document === "undefined") {
    return { width: 100, height: 24 };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return { width: 100, height: 24 };

  const fontWeight = style.fontWeight ?? "normal";
  const fontSize = style.fontSize ?? 16;
  const fontFamily = style.fontFamily ?? "Inter, sans-serif";
  const lineHeight = style.lineHeight ?? 1.5;

  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const lines = text.split("\n");
  let maxLineWidth = 0;

  for (const line of lines) {
    const metrics = context.measureText(line);
    maxLineWidth = Math.max(maxLineWidth, metrics.width);
  }

  // Apply max width constraint
  if (maxWidth && maxLineWidth > maxWidth) {
    maxLineWidth = maxWidth;
  }

  const height = lines.length * fontSize * lineHeight;

  return {
    width: maxLineWidth + 20, // Padding
    height: height + 16, // Padding
  };
};

/**
 * تحويل النص إلى HTML مع دعم Markdown البسيط
 */
const textToHtml = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, "<del>$1</del>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br />");
};

// =============================================================================
// 🎨 FONT FAMILIES
// =============================================================================

const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter", labelAr: "إنتر" },
  { value: "Cairo, sans-serif", label: "Cairo", labelAr: "القاهرة" },
  { value: "Tajawal, sans-serif", label: "Tajawal", labelAr: "تجول" },
  { value: "Arial, sans-serif", label: "Arial", labelAr: "أريال" },
  { value: "Georgia, serif", label: "Georgia", labelAr: "جورجيا" },
  { value: "monospace", label: "Monospace", labelAr: "ثابت العرض" },
  { value: "cursive", label: "Cursive", labelAr: "مائل" },
];

// =============================================================================
// 🎯 MAIN TEXT BLOCK COMPONENT
// =============================================================================

export const TextBlock = forwardRef<TextBlockRef, TextBlockProps>(
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
      onStyleChange,
      onDragStart,
      onDrag,
      onDragEnd,
      onResize,
      onContextMenu,
      onEditStart,
      onEditEnd,
      autoResize = true,
      minWidth = 50,
      minHeight = 24,
      maxWidth = 500,
      placeholder = "Type something...",
      placeholderAr = "اكتب شيئاً...",
      className,
      dir = "auto",
    },
    ref
  ) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(initialEditing);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [localText, setLocalText] = useState(element.content || element.text || "");

    // Derive bounds and style safely
    const bounds: Bounds = element.bounds ?? {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
    
    // Create a default TextStyle from element properties
    const style: TextStyle = {
      fontFamily: element.style?.fontFamily ?? element.textOptions?.fontFamily ?? "Inter, sans-serif",
      fontSize: element.style?.fontSize ?? element.textOptions?.fontSize ?? 16,
      fontWeight: element.style?.fontWeight ?? element.textOptions?.fontWeight ?? "normal",
      fontStyle: element.style?.fontStyle ?? "normal",
      textDecoration: element.style?.textDecoration ?? "none",
      color: element.style?.color ?? element.textOptions?.color ?? "#000000",
      textAlign: element.style?.textAlign ?? element.textOptions?.textAlign ?? "left",
      lineHeight: element.style?.lineHeight ?? element.textOptions?.lineHeight ?? 1.5,
      letterSpacing: element.style?.letterSpacing ?? 0,
      backgroundColor: element.style?.backgroundColor ?? "transparent",
      padding: element.style?.padding ?? 8,
      borderRadius: element.style?.borderRadius ?? 0,
    } as TextStyle;

    const content = element.content || element.text || "";

    // Sync with external editing state
    useEffect(() => {
      setIsEditing(initialEditing);
    }, [initialEditing]);

    // Sync local text with element content
    useEffect(() => {
      setLocalText(content || "");
    }, [content]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (textRef.current) {
          textRef.current.focus();
        }
      },
      blur: () => {
        if (textRef.current) {
          textRef.current.blur();
        }
      },
      selectAll: () => {
        if (textRef.current) {
          const range = document.createRange();
          range.selectNodeContents(textRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      },
      getContent: () => localText,
      setContent: (text: string) => setLocalText(text),
    }));

    // Handle text input
    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        const newText = (e.target as HTMLDivElement).innerText;
        setLocalText(newText);
        onTextChange?.(element.id, newText);

        // Auto resize if enabled
        if (autoResize && textRef.current) {
          const size = measureText(newText, style, maxWidth);
          if (
            size.width !== bounds.width ||
            size.height !== bounds.height
          ) {
            onResize?.(element.id, {
              ...bounds,
              width: Math.max(minWidth, size.width),
              height: Math.max(minHeight, size.height),
            });
          }
        }
      },
      [
        element.id,
        onTextChange,
        autoResize,
        style,
        maxWidth,
        bounds,
        minWidth,
        minHeight,
        onResize,
      ]
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
        
        if (isEditing) {
          // Allow text selection when editing
          return;
        }

        e.stopPropagation();
        e.preventDefault();

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
          // Focus after state update
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

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!isEditing) return;

        // Bold
        if ((e.ctrlKey || e.metaKey) && e.key === "b") {
          e.preventDefault();
          onStyleChange?.(element.id, {
            fontWeight: style.fontWeight === "bold" ? "normal" : "bold",
          });
        }

        // Italic
        if ((e.ctrlKey || e.metaKey) && e.key === "i") {
          e.preventDefault();
          onStyleChange?.(element.id, {
            fontStyle: style.fontStyle === "italic" ? "normal" : "italic",
          });
        }

        // Underline
        if ((e.ctrlKey || e.metaKey) && e.key === "u") {
          e.preventDefault();
          onStyleChange?.(element.id, {
            textDecoration:
              style.textDecoration === "underline" ? "none" : "underline",
          });
        }

        // Escape to exit editing
        if (e.key === "Escape") {
          setIsEditing(false);
          textRef.current?.blur();
          onEditEnd?.(element.id);
        }
      },
      [isEditing, element.id, style, onStyleChange, onEditEnd]
    );

    // Text styles
    const textStyles: React.CSSProperties = useMemo(
      () => ({
        fontFamily: style.fontFamily ?? "Inter, sans-serif",
        fontSize: style.fontSize ?? 16,
        fontWeight: style.fontWeight ?? "normal",
        fontStyle: style.fontStyle ?? "normal",
        textDecoration: style.textDecoration ?? "none",
        color: style.color ?? "#000000",
        textAlign: (style.textAlign as React.CSSProperties["textAlign"]) ?? "left",
        lineHeight: style.lineHeight ?? 1.5,
        letterSpacing: style.letterSpacing ?? 0,
        backgroundColor: style.backgroundColor ?? "transparent",
        padding: style.padding ?? 8,
        borderRadius: style.borderRadius ?? 0,
      }),
      [style]
    );

    // Container styles
    const containerStyle: React.CSSProperties = {
      position: "absolute",
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth,
      minHeight,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      cursor: isLocked
        ? "not-allowed"
        : isEditing
        ? "text"
        : isDragging
        ? "grabbing"
        : "grab",
    };

    const isRTL = dir === "rtl" || (dir === "auto" && /[\u0600-\u06FF]/.test(localText));
    const placeholderText = isRTL ? placeholderAr : placeholder;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={containerStyle}
        className={cn(
          "select-none",
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          isHovered && !isSelected && "ring-1 ring-blue-300",
          isLocked && "opacity-70",
          className
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <div
          ref={textRef}
          contentEditable={isEditing && !isLocked}
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={textStyles}
          dir={isRTL ? "rtl" : "ltr"}
          className={cn(
            "w-full h-full outline-none overflow-hidden",
            "whitespace-pre-wrap break-words",
            isEditing && "ring-2 ring-blue-400 ring-inset",
            !localText && "text-gray-400"
          )}
          data-placeholder={placeholderText}
        >
          {localText || (isEditing ? "" : placeholderText)}
        </div>

        {/* Lock indicator */}
        {isLocked && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center text-[8px]">
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

TextBlock.displayName = "TextBlock";

export default TextBlock;
export { measureText, textToHtml, FONT_FAMILIES };
export type { TextBlockProps, TextBlockRef };
