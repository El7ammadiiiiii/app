// =============================================================================
// ✏️ CCCWAYS Canvas - مسار الرسم الحر (Freehand Path Component)
// مكون لرسم المسارات الحرة والخطوط
// =============================================================================

"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { 
  FreehandElement, 
  Point, 
  Bounds,
  PathStyle 
} from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface FreehandPathProps {
  element: FreehandElement;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  isDrawing?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onDragStart?: (id: string, point: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onDragEnd?: (id: string) => void;
  onPointAdd?: (id: string, point: Point) => void;
  onContextMenu?: (id: string, point: Point) => void;
  smoothing?: number;
  pressureSensitivity?: boolean;
  className?: string;
}

interface PathPoint extends Point {
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  timestamp?: number;
}

// =============================================================================
// 🔧 PATH UTILITIES
// =============================================================================

/**
 * تحويل نقاط إلى مسار SVG سلس
 */
const pointsToSmoothPath = (
  points: PathPoint[],
  smoothing: number = 0.2
): string => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Build smooth path using quadratic bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Control points
    const cp1x = curr.x - (next.x - prev.x) * smoothing;
    const cp1y = curr.y - (next.y - prev.y) * smoothing;
    const cp2x = curr.x + (next.x - prev.x) * smoothing;
    const cp2y = curr.y + (next.y - prev.y) * smoothing;

    if (i === 1) {
      path += ` Q ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
    } else {
      const prevCp = {
        x: points[i - 1].x + (curr.x - points[i - 2].x) * smoothing,
        y: points[i - 1].y + (curr.y - points[i - 2].y) * smoothing,
      };
      path += ` C ${prevCp.x} ${prevCp.y} ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
    }
  }

  // End point
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  path += ` L ${last.x} ${last.y}`;

  return path;
};

/**
 * تحويل نقاط إلى مسار متعرج (خط مستقيم بين كل نقطتين)
 */
const pointsToLinearPath = (points: PathPoint[]): string => {
  if (points.length === 0) return "";
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
};

/**
 * حساب حدود المسار
 */
const calculatePathBounds = (points: PathPoint[]): Bounds => {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * تبسيط المسار (تقليل عدد النقاط)
 */
const simplifyPath = (
  points: PathPoint[],
  tolerance: number = 1
): PathPoint[] => {
  if (points.length <= 2) return points;

  // Douglas-Peucker algorithm
  const findFurthest = (
    points: PathPoint[],
    start: number,
    end: number
  ): { index: number; distance: number } => {
    let maxDistance = 0;
    let maxIndex = start;

    const line = {
      x1: points[start].x,
      y1: points[start].y,
      x2: points[end].x,
      y2: points[end].y,
    };

    for (let i = start + 1; i < end; i++) {
      const distance = pointToLineDistance(points[i], line);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    return { index: maxIndex, distance: maxDistance };
  };

  const pointToLineDistance = (
    point: Point,
    line: { x1: number; y1: number; x2: number; y2: number }
  ): number => {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return Math.sqrt(
        (point.x - line.x1) ** 2 + (point.y - line.y1) ** 2
      );
    }

    return (
      Math.abs(dy * point.x - dx * point.y + line.x2 * line.y1 - line.y2 * line.x1) /
      length
    );
  };

  const simplifyRecursive = (
    points: PathPoint[],
    start: number,
    end: number,
    tolerance: number,
    result: PathPoint[]
  ): void => {
    const { index, distance } = findFurthest(points, start, end);

    if (distance > tolerance) {
      simplifyRecursive(points, start, index, tolerance, result);
      result.push(points[index]);
      simplifyRecursive(points, index, end, tolerance, result);
    }
  };

  const result: PathPoint[] = [points[0]];
  simplifyRecursive(points, 0, points.length - 1, tolerance, result);
  result.push(points[points.length - 1]);

  return result;
};

/**
 * حساب عرض الخط بناءً على الضغط
 */
const calculateStrokeWidth = (
  baseWidth: number,
  pressure: number = 0.5,
  sensitivity: number = 0.5
): number => {
  const minWidth = baseWidth * 0.5;
  const maxWidth = baseWidth * 1.5;
  const width = minWidth + (maxWidth - minWidth) * pressure * sensitivity;
  return Math.max(minWidth, Math.min(maxWidth, width));
};

// =============================================================================
// 🎨 PATH STROKE STYLES
// =============================================================================

type StrokeStyle = "solid" | "dashed" | "dotted" | "marker" | "highlighter" | "brush";

const getStrokeDashArray = (style: StrokeStyle): string | undefined => {
  switch (style) {
    case "dashed":
      return "10 5";
    case "dotted":
      return "2 4";
    default:
      return undefined;
  }
};

const getStrokeLinecap = (style: StrokeStyle): "round" | "butt" | "square" => {
  switch (style) {
    case "marker":
    case "brush":
      return "round";
    case "highlighter":
      return "butt";
    default:
      return "round";
  }
};

// =============================================================================
// 🎯 MAIN FREEHAND PATH COMPONENT
// =============================================================================

export const FreehandPath: React.FC<FreehandPathProps> = ({
  element,
  isSelected = false,
  isHovered = false,
  isLocked = false,
  isDrawing = false,
  zoom = 1,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onPointAdd,
  onContextMenu,
  smoothing = 0.2,
  pressureSensitivity = true,
  className,
}) => {
  const pathRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const { points, smoothing: elementSmoothing } = element;
  
  // Get style from element properties
  const strokeColor = typeof element.stroke === 'string' ? element.stroke : element.stroke.color;
  const strokeWidth = typeof element.stroke === 'object' ? element.stroke.width : 3;
  const strokeStyle: StrokeStyle = typeof element.stroke === 'object' && element.stroke.style 
    ? element.stroke.style as StrokeStyle 
    : 'solid';
  const elementOpacity = element.opacity ?? 1;

  // Calculate bounds from element or derive from points
  const bounds: Bounds = element.bounds ?? {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };

  // Generate SVG path
  const svgPath = useMemo(() => {
    const pathPoints = points as PathPoint[];
    const effectiveSmoothing = elementSmoothing ?? smoothing;
    if (strokeStyle === "marker" || effectiveSmoothing > 0) {
      return pointsToSmoothPath(pathPoints, effectiveSmoothing);
    }
    return pointsToLinearPath(pathPoints);
  }, [points, strokeStyle, elementSmoothing, smoothing]);

  // Calculate bounds if not provided
  const pathBounds = useMemo(() => {
    if (bounds.width > 0 && bounds.height > 0) return bounds;
    return calculatePathBounds(points as PathPoint[]);
  }, [bounds, points]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isLocked) return;
      e.stopPropagation();

      const point = { x: e.clientX, y: e.clientY };
      setDragStart(point);
      setIsDragging(true);

      onSelect?.(element.id, e.shiftKey || e.ctrlKey);
      onDragStart?.(element.id, point);
    },
    [element.id, isLocked, onSelect, onDragStart]
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

  // SVG container style
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: pathBounds.x - strokeWidth,
    top: pathBounds.y - strokeWidth,
    width: pathBounds.width + strokeWidth * 2,
    height: pathBounds.height + strokeWidth * 2,
    cursor: isLocked ? "not-allowed" : isDragging ? "grabbing" : "grab",
    pointerEvents: "all",
  };

  // Translate path to local coordinates
  const translatedPath = useMemo(() => {
    const offsetX = -pathBounds.x + strokeWidth;
    const offsetY = -pathBounds.y + strokeWidth;
    
    return svgPath.replace(
      /([ML])\s*([\d.-]+)\s*([\d.-]+)/g,
      (match, cmd, x, y) => {
        return `${cmd} ${parseFloat(x) + offsetX} ${parseFloat(y) + offsetY}`;
      }
    ).replace(
      /([QC])\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)\s*([\d.-]+)/g,
      (match, cmd, x1, y1, x2, y2) => {
        return `${cmd} ${parseFloat(x1) + offsetX} ${parseFloat(y1) + offsetY} ${parseFloat(x2) + offsetX} ${parseFloat(y2) + offsetY}`;
      }
    );
  }, [svgPath, pathBounds, strokeWidth]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isDrawing ? 0.7 : 1 }}
      exit={{ opacity: 0 }}
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
      <svg
        ref={pathRef}
        width="100%"
        height="100%"
        className="overflow-visible"
        style={{ opacity: elementOpacity }}
      >
        {/* Glow effect for highlighter */}
        {strokeStyle === "highlighter" && (
          <defs>
            <filter id={`glow-${element.id}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        )}

        {/* Main path */}
        <path
          d={translatedPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={getStrokeDashArray(strokeStyle)}
          strokeLinecap={getStrokeLinecap(strokeStyle)}
          strokeLinejoin="round"
          filter={strokeStyle === "highlighter" ? `url(#glow-${element.id})` : undefined}
          opacity={strokeStyle === "highlighter" ? 0.5 : 1}
        />

        {/* Selection hit area (invisible, larger than stroke) */}
        <path
          d={translatedPath}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(strokeWidth + 10, 20)}
          pointerEvents="stroke"
        />
      </svg>

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center text-[8px]">
          🔒
        </div>
      )}

      {/* Selection handles */}
      {isSelected && !isLocked && (
        <>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-move" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-move" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-move" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-move" />
        </>
      )}
    </motion.div>
  );
};

export default FreehandPath;
export { 
  pointsToSmoothPath, 
  pointsToLinearPath, 
  calculatePathBounds, 
  simplifyPath,
  calculateStrokeWidth 
};
export type { FreehandPathProps, PathPoint, StrokeStyle };
