// =============================================================================
// 🔷 CCCWAYS Canvas - مكون الشكل (Shape Component)
// مكون متعدد الاستخدامات لجميع أنواع الأشكال
// =============================================================================

"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { 
  ShapeElement, 
  ShapeType, 
  Point, 
  Bounds,
  ShapeStyle 
} from "@/types/canvas";

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ShapeProps {
  element: ShapeElement;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  isEditing?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onDragStart?: (id: string, point: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onDragEnd?: (id: string) => void;
  onResize?: (id: string, bounds: Bounds) => void;
  onRotate?: (id: string, angle: number) => void;
  onContextMenu?: (id: string, point: Point) => void;
  renderMode?: "canvas" | "svg" | "dom";
  className?: string;
}

interface ShapePathProps {
  shapeType: ShapeType;
  width: number;
  height: number;
  cornerRadius?: number;
  points?: number;
  innerRadius?: number;
}

// =============================================================================
// 🔧 SHAPE PATH GENERATORS
// =============================================================================

const generateShapePath = ({
  shapeType,
  width,
  height,
  cornerRadius = 0,
  points = 5,
  innerRadius = 0.4,
}: ShapePathProps): string => {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  switch (shapeType) {
    case "rectangle": {
      if (cornerRadius === 0) {
        return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
      }
      const r = Math.min(cornerRadius, width / 2, height / 2);
      return `
        M ${r} 0
        L ${width - r} 0
        Q ${width} 0 ${width} ${r}
        L ${width} ${height - r}
        Q ${width} ${height} ${width - r} ${height}
        L ${r} ${height}
        Q 0 ${height} 0 ${height - r}
        L 0 ${r}
        Q 0 0 ${r} 0
        Z
      `;
    }

    case "ellipse": {
      return `
        M ${cx} 0
        A ${rx} ${ry} 0 1 1 ${cx} ${height}
        A ${rx} ${ry} 0 1 1 ${cx} 0
        Z
      `;
    }

    case "triangle": {
      return `M ${cx} 0 L ${width} ${height} L 0 ${height} Z`;
    }

    case "diamond": {
      return `M ${cx} 0 L ${width} ${cy} L ${cx} ${height} L 0 ${cy} Z`;
    }

    case "star": {
      const outerRadius = Math.min(rx, ry);
      const innerR = outerRadius * innerRadius;
      const angleStep = Math.PI / points;
      let path = "";

      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerR;
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }

    case "polygon": {
      const radius = Math.min(rx, ry);
      const angleStep = (2 * Math.PI) / points;
      let path = "";

      for (let i = 0; i < points; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }

    case "hexagon": {
      const size = Math.min(width, height) / 2;
      const h = size * Math.sqrt(3) / 2;
      return `
        M ${cx} ${cy - size}
        L ${cx + h} ${cy - size / 2}
        L ${cx + h} ${cy + size / 2}
        L ${cx} ${cy + size}
        L ${cx - h} ${cy + size / 2}
        L ${cx - h} ${cy - size / 2}
        Z
      `;
    }

    case "pentagon": {
      const radius = Math.min(rx, ry);
      const angleStep = (2 * Math.PI) / 5;
      let path = "";

      for (let i = 0; i < 5; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }

    case "octagon": {
      const size = Math.min(width, height);
      const s = size * 0.293; // (1 - 1/sqrt(2)) / 2
      return `
        M ${s} 0
        L ${size - s} 0
        L ${size} ${s}
        L ${size} ${size - s}
        L ${size - s} ${size}
        L ${s} ${size}
        L 0 ${size - s}
        L 0 ${s}
        Z
      `;
    }

    case "parallelogram": {
      const skew = width * 0.2;
      return `M ${skew} 0 L ${width} 0 L ${width - skew} ${height} L 0 ${height} Z`;
    }

    case "trapezoid": {
      const offset = width * 0.15;
      return `M ${offset} 0 L ${width - offset} 0 L ${width} ${height} L 0 ${height} Z`;
    }

    case "arrow-right": {
      const arrowWidth = width * 0.6;
      const arrowHeight = height * 0.3;
      return `
        M 0 ${arrowHeight}
        L ${arrowWidth} ${arrowHeight}
        L ${arrowWidth} 0
        L ${width} ${cy}
        L ${arrowWidth} ${height}
        L ${arrowWidth} ${height - arrowHeight}
        L 0 ${height - arrowHeight}
        Z
      `;
    }

    case "arrow-left": {
      const arrowWidth = width * 0.6;
      const arrowHeight = height * 0.3;
      return `
        M ${width} ${arrowHeight}
        L ${width - arrowWidth} ${arrowHeight}
        L ${width - arrowWidth} 0
        L 0 ${cy}
        L ${width - arrowWidth} ${height}
        L ${width - arrowWidth} ${height - arrowHeight}
        L ${width} ${height - arrowHeight}
        Z
      `;
    }

    case "callout": {
      const tailWidth = width * 0.1;
      const tailHeight = height * 0.2;
      return `
        M 0 0
        L ${width} 0
        L ${width} ${height - tailHeight}
        L ${width * 0.3 + tailWidth} ${height - tailHeight}
        L ${width * 0.2} ${height}
        L ${width * 0.3} ${height - tailHeight}
        L 0 ${height - tailHeight}
        Z
      `;
    }

    case "cloud": {
      // Simplified cloud shape using bezier curves
      return `
        M ${width * 0.2} ${height * 0.7}
        Q ${width * 0.05} ${height * 0.6} ${width * 0.15} ${height * 0.45}
        Q ${width * 0.1} ${height * 0.2} ${width * 0.35} ${height * 0.25}
        Q ${width * 0.4} ${height * 0.05} ${width * 0.55} ${height * 0.15}
        Q ${width * 0.75} ${height * 0.05} ${width * 0.85} ${height * 0.3}
        Q ${width * 1.0} ${height * 0.4} ${width * 0.9} ${height * 0.6}
        Q ${width * 0.95} ${height * 0.8} ${width * 0.75} ${height * 0.75}
        Q ${width * 0.5} ${height * 0.9} ${width * 0.2} ${height * 0.7}
        Z
      `;
    }

    case "heart": {
      return `
        M ${cx} ${height * 0.9}
        C ${width * 0.1} ${height * 0.55} 0 ${height * 0.3} ${cx} ${height * 0.2}
        C ${width} ${height * 0.3} ${width * 0.9} ${height * 0.55} ${cx} ${height * 0.9}
        Z
      `;
    }

    case "cross": {
      const armWidth = width * 0.35;
      const armOffset = (width - armWidth) / 2;
      return `
        M ${armOffset} 0
        L ${width - armOffset} 0
        L ${width - armOffset} ${armOffset}
        L ${width} ${armOffset}
        L ${width} ${height - armOffset}
        L ${width - armOffset} ${height - armOffset}
        L ${width - armOffset} ${height}
        L ${armOffset} ${height}
        L ${armOffset} ${height - armOffset}
        L 0 ${height - armOffset}
        L 0 ${armOffset}
        L ${armOffset} ${armOffset}
        Z
      `;
    }

    default:
      return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
  }
};

// =============================================================================
// 🎨 SHAPE SVG COMPONENT
// =============================================================================

interface ShapeSVGProps {
  shapeType: ShapeType;
  width: number;
  height: number;
  style: ShapeStyle;
  cornerRadius?: number;
  points?: number;
  innerRadius?: number;
}

const ShapeSVG: React.FC<ShapeSVGProps> = ({
  shapeType,
  width,
  height,
  style,
  cornerRadius,
  points,
  innerRadius,
}) => {
  const path = useMemo(
    () =>
      generateShapePath({
        shapeType,
        width,
        height,
        cornerRadius,
        points,
        innerRadius,
      }),
    [shapeType, width, height, cornerRadius, points, innerRadius]
  );

  // Generate gradient if needed
  const gradientId = `gradient-${shapeType}-${Date.now()}`;
  const hasGradient = style.gradientColors && style.gradientColors.length > 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {hasGradient && (
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2={style.gradientAngle === 0 ? "100%" : "0%"}
            y2={style.gradientAngle === 0 ? "0%" : "100%"}
          >
            {style.gradientColors!.map((color, index) => (
              <stop
                key={index}
                offset={`${(index / (style.gradientColors!.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
        </defs>
      )}

      <path
        d={path}
        fill={hasGradient ? `url(#${gradientId})` : String(style.fill)}
        fillOpacity={style.fillOpacity ?? 1}
        stroke={String(style.stroke)}
        strokeWidth={style.strokeWidth ?? 2}
        strokeOpacity={style.strokeOpacity ?? 1}
        strokeDasharray={
          style.strokeStyle === "dashed"
            ? "8 4"
            : style.strokeStyle === "dotted"
            ? "2 2"
            : undefined
        }
        strokeLinecap={style.strokeLinecap ?? "round"}
        strokeLinejoin={style.strokeLinejoin ?? "round"}
      />
    </svg>
  );
};

// =============================================================================
// 🎯 MAIN SHAPE COMPONENT
// =============================================================================

export const Shape: React.FC<ShapeProps> = ({
  element,
  isSelected = false,
  isHovered = false,
  isLocked = false,
  isEditing = false,
  zoom = 1,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onResize,
  onRotate,
  onContextMenu,
  renderMode = "svg",
  className,
}) => {
  const shapeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Derive bounds from element position
  const bounds: Bounds = element.bounds ?? {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };

  const { shapeType, rotation = 0, fill, stroke, opacity = 1 } = element;
  
  // Get style with fallbacks from element properties
  const elementStyle = element.style;

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
  React.useEffect(() => {
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

  // Style calculations - use element properties with fallback to style
  const getFillColor = (): string => {
    if (elementStyle?.fill) {
      return typeof elementStyle.fill === 'string' ? elementStyle.fill : elementStyle.fill.color;
    }
    return typeof fill === 'string' ? fill : fill.color;
  };

  const getStrokeColor = (): string => {
    if (elementStyle?.stroke) {
      return typeof elementStyle.stroke === 'string' ? elementStyle.stroke : elementStyle.stroke.color;
    }
    return typeof stroke === 'string' ? stroke : stroke.color;
  };

  const shapeStyle: ShapeStyle = {
    fill: getFillColor(),
    fillOpacity: elementStyle?.fillOpacity ?? opacity ?? 1,
    stroke: getStrokeColor(),
    strokeWidth: elementStyle?.strokeWidth ?? (typeof stroke === 'object' ? stroke.width : 2),
    strokeOpacity: elementStyle?.strokeOpacity ?? 1,
    strokeStyle: elementStyle?.strokeStyle ?? (typeof stroke === 'object' ? stroke.style : 'solid'),
    strokeLinecap: elementStyle?.strokeLinecap ?? 'round',
    strokeLinejoin: elementStyle?.strokeLinejoin ?? 'round',
    gradientColors: elementStyle?.gradientColors,
    gradientAngle: elementStyle?.gradientAngle,
    shadow: elementStyle?.shadow,
  };

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: "center center",
    cursor: isLocked ? "not-allowed" : isDragging ? "grabbing" : "grab",
    filter: elementStyle?.shadow
      ? `drop-shadow(${elementStyle.shadow.offsetX}px ${elementStyle.shadow.offsetY}px ${elementStyle.shadow.blur}px ${elementStyle.shadow.color})`
      : undefined,
  };

  return (
    <motion.div
      ref={shapeRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={containerStyle}
      className={cn(
        "select-none pointer-events-auto",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isHovered && !isSelected && "ring-1 ring-blue-300",
        isLocked && "opacity-70",
        className
      )}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      whileHover={{ scale: isLocked ? 1 : 1.02 }}
    >
      <ShapeSVG
        shapeType={shapeType}
        width={bounds.width}
        height={bounds.height}
        style={shapeStyle}
        cornerRadius={(element as any).cornerRadius}
        points={(element as any).points}
        innerRadius={(element as any).innerRadius}
      />

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center text-[8px]">
          🔒
        </div>
      )}

      {/* Selection handles (only when selected) */}
      {isSelected && !isLocked && (
        <>
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize" />

          {/* Edge handles */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ns-resize" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ns-resize" />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ew-resize" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border-2 border-blue-500 rounded-sm cursor-ew-resize" />

          {/* Rotation handle */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-grab" />
          <div className="absolute -top-5 left-1/2 w-px h-4 bg-blue-500" />
        </>
      )}
    </motion.div>
  );
};

export default Shape;
export { ShapeSVG, generateShapePath };
export type { ShapeProps, ShapeSVGProps, ShapePathProps };
