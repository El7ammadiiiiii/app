// =============================================================================
// 🔗 CCCWAYS Canvas - الموصل (Connector Component)
// موصلات ذكية بين العناصر مع دعم أنماط متعددة
// =============================================================================

"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { 
  ConnectorElement, 
  Point, 
  Bounds,
  ConnectorStyle,
  ConnectorType 
} from "@/types/canvas";

// Helper function to extract stroke color
const getStrokeColor = (stroke: string | { color?: string; width?: number } | undefined, fallback: string = "#374151"): string => {
  if (!stroke) return fallback;
  if (typeof stroke === 'string') return stroke;
  return stroke.color ?? fallback;
};

// Helper function to extract stroke width
const getStrokeWidth = (stroke: string | { color?: string; width?: number } | undefined, fallback: number = 2): number => {
  if (!stroke || typeof stroke === 'string') return fallback;
  return stroke.width ?? fallback;
};

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ConnectorProps {
  element: ConnectorElement;
  isSelected?: boolean;
  isHovered?: boolean;
  isLocked?: boolean;
  zoom?: number;
  onSelect?: (id: string, addToSelection?: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onPointMove?: (id: string, pointIndex: 0 | 1, point: Point) => void;
  onStyleChange?: (id: string, style: Partial<ConnectorStyle>) => void;
  onContextMenu?: (id: string, point: Point) => void;
  showHandles?: boolean;
  className?: string;
}

interface ArrowHeadProps {
  point: Point;
  angle: number;
  style: ArrowStyle;
  color: string;
  size: number;
}

type ArrowStyle = "none" | "arrow" | "triangle" | "diamond" | "circle" | "square";
type LineStyle = "solid" | "dashed" | "dotted";

// =============================================================================
// 🔧 PATH GENERATORS
// =============================================================================

/**
 * إنشاء مسار موصل مستقيم
 */
const createStraightPath = (start: Point, end: Point): string => {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
};

/**
 * إنشاء مسار موصل منحني (Bezier)
 */
const createCurvedPath = (
  start: Point,
  end: Point,
  curvature: number = 0.5
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  
  // Control points
  const cx1 = start.x + dx * curvature;
  const cy1 = start.y;
  const cx2 = end.x - dx * curvature;
  const cy2 = end.y;
  
  return `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
};

/**
 * إنشاء مسار موصل متعرج (Orthogonal)
 */
const createOrthogonalPath = (
  start: Point,
  end: Point,
  startDirection: "horizontal" | "vertical" = "horizontal"
): string => {
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  
  if (startDirection === "horizontal") {
    return `M ${start.x} ${start.y} L ${mx} ${start.y} L ${mx} ${end.y} L ${end.x} ${end.y}`;
  } else {
    return `M ${start.x} ${start.y} L ${start.x} ${my} L ${end.x} ${my} L ${end.x} ${end.y}`;
  }
};

/**
 * إنشاء مسار موصل منحني بزاوية (Elbow)
 */
const createElbowPath = (
  start: Point,
  end: Point,
  radius: number = 10
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  if (Math.abs(dx) < radius * 2 || Math.abs(dy) < radius * 2) {
    return createStraightPath(start, end);
  }
  
  const mx = start.x + dx / 2;
  const dirX = dx > 0 ? 1 : -1;
  const dirY = dy > 0 ? 1 : -1;
  
  return `
    M ${start.x} ${start.y}
    L ${mx - radius * dirX} ${start.y}
    Q ${mx} ${start.y} ${mx} ${start.y + radius * dirY}
    L ${mx} ${end.y - radius * dirY}
    Q ${mx} ${end.y} ${mx + radius * dirX} ${end.y}
    L ${end.x} ${end.y}
  `;
};

/**
 * إنشاء مسار موصل متموج (Wavy)
 */
const createWavyPath = (
  start: Point,
  end: Point,
  amplitude: number = 10,
  frequency: number = 4
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  let path = `M ${start.x} ${start.y}`;
  const step = length / (frequency * 2);
  
  for (let i = 0; i < frequency * 2; i++) {
    const t = (i + 1) / (frequency * 2);
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    const perpX = -Math.sin(angle) * amplitude * (i % 2 === 0 ? 1 : -1);
    const perpY = Math.cos(angle) * amplitude * (i % 2 === 0 ? 1 : -1);
    
    if (i === frequency * 2 - 1) {
      path += ` L ${end.x} ${end.y}`;
    } else {
      path += ` Q ${x + perpX} ${y + perpY}, ${x} ${y}`;
    }
  }
  
  return path;
};

/**
 * حساب زاوية الخط عند نقطة معينة
 */
const calculateAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
};

// =============================================================================
// 🔷 ARROW HEAD COMPONENT
// =============================================================================

const ArrowHead: React.FC<ArrowHeadProps> = ({
  point,
  angle,
  style,
  color,
  size,
}) => {
  if (style === "none") return null;

  const transform = `translate(${point.x}, ${point.y}) rotate(${angle})`;
  
  const renderArrowShape = () => {
    switch (style) {
      case "arrow":
        return (
          <path
            d={`M ${-size} ${-size / 2} L 0 0 L ${-size} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "triangle":
        return (
          <path
            d={`M ${-size} ${-size / 2} L 0 0 L ${-size} ${size / 2} Z`}
            fill={color}
            stroke={color}
          />
        );
      case "diamond":
        return (
          <path
            d={`M ${-size} 0 L ${-size / 2} ${-size / 2} L 0 0 L ${-size / 2} ${size / 2} Z`}
            fill={color}
            stroke={color}
          />
        );
      case "circle":
        return <circle cx={-size / 2} cy={0} r={size / 2} fill={color} />;
      case "square":
        return (
          <rect
            x={-size}
            y={-size / 2}
            width={size}
            height={size}
            fill={color}
          />
        );
      default:
        return null;
    }
  };

  return <g transform={transform}>{renderArrowShape()}</g>;
};

// =============================================================================
// 🔗 CONNECTION POINT
// =============================================================================

interface ConnectionPointProps {
  point: Point;
  isActive?: boolean;
  isDragging?: boolean;
  onDragStart?: (point: Point) => void;
  onDrag?: (delta: Point) => void;
  onDragEnd?: () => void;
  className?: string;
}

const ConnectionPoint: React.FC<ConnectionPointProps> = ({
  point,
  isActive = false,
  isDragging = false,
  onDragStart,
  onDrag,
  onDragEnd,
  className,
}) => {
  const [localDragging, setLocalDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const startPoint = { x: e.clientX, y: e.clientY };
      setDragStart(startPoint);
      setLocalDragging(true);
      onDragStart?.(point);
    },
    [point, onDragStart]
  );

  useEffect(() => {
    if (localDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (dragStart) {
          const delta = {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          };
          onDrag?.(delta);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      };

      const handleMouseUp = () => {
        setLocalDragging(false);
        setDragStart(null);
        onDragEnd?.();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [localDragging, dragStart, onDrag, onDragEnd]);

  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={6}
      fill={isActive ? "#3b82f6" : "#ffffff"}
      stroke="#3b82f6"
      strokeWidth={2}
      className={cn(
        "cursor-move transition-all",
        localDragging && "fill-blue-500",
        className
      )}
      onMouseDown={handleMouseDown}
    />
  );
};

// =============================================================================
// 🎯 MAIN CONNECTOR COMPONENT
// =============================================================================

export const Connector: React.FC<ConnectorProps> = ({
  element,
  isSelected = false,
  isHovered = false,
  isLocked = false,
  zoom = 1,
  onSelect,
  onDoubleClick,
  onPointMove,
  onStyleChange,
  onContextMenu,
  showHandles = true,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<0 | 1 | null>(null);

  const { startPoint, endPoint, style, connectorType = "straight" } = element;

  // Generate path based on connector type
  const pathData = useMemo(() => {
    switch (connectorType) {
      case "curved":
        return createCurvedPath(startPoint, endPoint, style?.curvature ?? 0.5);
      case "orthogonal":
        return createOrthogonalPath(startPoint, endPoint);
      case "elbow":
        return createElbowPath(startPoint, endPoint, style?.cornerRadius ?? 10);
      case "wavy":
        return createWavyPath(startPoint, endPoint);
      case "straight":
      default:
        return createStraightPath(startPoint, endPoint);
    }
  }, [startPoint, endPoint, connectorType, style]);

  // Calculate bounds
  const bounds = useMemo((): Bounds => {
    const padding = 20;
    const minX = Math.min(startPoint.x, endPoint.x) - padding;
    const minY = Math.min(startPoint.y, endPoint.y) - padding;
    const maxX = Math.max(startPoint.x, endPoint.x) + padding;
    const maxY = Math.max(startPoint.y, endPoint.y) + padding;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [startPoint, endPoint]);

  // Arrow angles
  const startAngle = useMemo(
    () => calculateAngle(endPoint, startPoint),
    [startPoint, endPoint]
  );
  const endAngle = useMemo(
    () => calculateAngle(startPoint, endPoint),
    [startPoint, endPoint]
  );

  // Handle selection
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(element.id, e.shiftKey || e.ctrlKey);
    },
    [element.id, onSelect]
  );

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

  // Handle point drag
  const handlePointDrag = useCallback(
    (pointIndex: 0 | 1, delta: Point) => {
      if (isLocked) return;
      const currentPoint = pointIndex === 0 ? startPoint : endPoint;
      const newPoint = {
        x: currentPoint.x + delta.x / zoom,
        y: currentPoint.y + delta.y / zoom,
      };
      onPointMove?.(element.id, pointIndex, newPoint);
    },
    [element.id, startPoint, endPoint, zoom, isLocked, onPointMove]
  );

  const strokeStyle = style?.strokeStyle ?? "solid";
  const strokeDasharray =
    strokeStyle === "dashed"
      ? "8 4"
      : strokeStyle === "dotted"
      ? "2 4"
      : undefined;

  return (
    <motion.svg
      ref={svgRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
      className={cn(className)}
    >
      {/* Hit area (invisible, for easier selection) */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: "stroke", cursor: isLocked ? "not-allowed" : "pointer" }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Main path */}
      <motion.path
        d={pathData}
        fill="none"
        stroke={getStrokeColor(style?.stroke)}
        strokeWidth={style?.strokeWidth ?? getStrokeWidth(style?.stroke)}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ 
          pathLength: 1,
          stroke: isSelected ? "#3b82f6" : getStrokeColor(style?.stroke)
        }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: "none" }}
      />

      {/* Start arrow */}
      {style?.startArrow && style.startArrow !== "none" && (
        <ArrowHead
          point={startPoint}
          angle={startAngle}
          style={style.startArrow as ArrowStyle}
          color={getStrokeColor(style?.stroke)}
          size={style?.arrowSize ?? 10}
        />
      )}

      {/* End arrow */}
      {style?.endArrow && style.endArrow !== "none" && (
        <ArrowHead
          point={endPoint}
          angle={endAngle}
          style={style.endArrow as ArrowStyle}
          color={getStrokeColor(style?.stroke)}
          size={style?.arrowSize ?? 10}
        />
      )}

      {/* Connection points */}
      {showHandles && isSelected && !isLocked && (
        <>
          <ConnectionPoint
            point={startPoint}
            isActive={hoveredPoint === 0}
            onDrag={(delta) => handlePointDrag(0, delta)}
          />
          <ConnectionPoint
            point={endPoint}
            isActive={hoveredPoint === 1}
            onDrag={(delta) => handlePointDrag(1, delta)}
          />
        </>
      )}

      {/* Label (if exists) */}
      {element.label && (
        <text
          x={(startPoint.x + endPoint.x) / 2}
          y={(startPoint.y + endPoint.y) / 2 - 10}
          textAnchor="middle"
          fill={getStrokeColor(style?.stroke)}
          fontSize={12}
          fontWeight={500}
        >
          {element.label}
        </text>
      )}
    </motion.svg>
  );
};

export default Connector;
export { 
  ArrowHead, 
  ConnectionPoint,
  createStraightPath,
  createCurvedPath,
  createOrthogonalPath,
  createElbowPath,
  createWavyPath,
  calculateAngle 
};
export type { ConnectorProps, ArrowStyle, LineStyle };
