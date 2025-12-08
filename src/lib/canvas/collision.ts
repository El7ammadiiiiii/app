// =============================================================================
// 💥 CCCWAYS Canvas - Collision Detection
// كشف التصادم والتقاطعات
// =============================================================================

import type { Point, Bounds, CanvasElement } from "@/types/canvas";
import { getDistance, rotatePoint, getBoundsCorners } from "./math";

// ═══════════════════════════════════════════════════════════════════════════
// كشف النقطة داخل العناصر
// ═══════════════════════════════════════════════════════════════════════════

export function pointInElement(point: Point, element: CanvasElement): boolean {
  // تحويل النقطة لإحداثيات العنصر المحلية (مع مراعاة الدوران)
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  
  const localPoint = element.rotation
    ? rotatePoint(point, center, -element.rotation)
    : point;
  
  switch (element.type) {
    case "shape":
      return pointInShape(localPoint, element);
    case "freehand":
      return pointNearPath(localPoint, element.points, element.stroke.width);
    case "text":
    case "sticky":
    case "frame":
    case "embed":
      return pointInRectangle(localPoint, element);
    case "image":
      return pointInRectangle(localPoint, element);
    case "connector":
      return pointNearPath(localPoint, element.path, element.stroke.width + 10);
    case "comment":
      return pointInCircle(localPoint, { x: element.x, y: element.y }, 16);
    default:
      return pointInRectangle(localPoint, element);
  }
}

function pointInShape(point: Point, element: CanvasElement): boolean {
  if (element.type !== "shape") return false;
  
  const bounds: Bounds = {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
  
  switch (element.shapeType) {
    case "rectangle":
    case "diamond":
      return pointInRectangle(point, bounds);
    case "ellipse":
      return pointInEllipse(point, bounds);
    case "triangle":
      return pointInTriangle(point, bounds);
    case "hexagon":
      return pointInPolygon(point, getHexagonPoints(bounds));
    case "star":
      return pointInPolygon(point, getStarPoints(bounds));
    case "line":
    case "arrow":
      return pointNearLine(point, element.points || [], element.stroke.width + 10);
    default:
      return pointInRectangle(point, bounds);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// كشف النقطة داخل الأشكال الأساسية
// ═══════════════════════════════════════════════════════════════════════════

export function pointInRectangle(point: Point, rect: Bounds): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function pointInCircle(point: Point, center: Point, radius: number): boolean {
  return getDistance(point, center) <= radius;
}

export function pointInEllipse(point: Point, bounds: Bounds): boolean {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  
  if (rx === 0 || ry === 0) return false;
  
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  
  return dx * dx + dy * dy <= 1;
}

export function pointInTriangle(point: Point, bounds: Bounds): boolean {
  const p1 = { x: bounds.x + bounds.width / 2, y: bounds.y };
  const p2 = { x: bounds.x, y: bounds.y + bounds.height };
  const p3 = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
  
  return pointInPolygon(point, [p1, p2, p3]);
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  
  return inside;
}

export function pointNearLine(
  point: Point,
  linePoints: Point[],
  threshold: number
): boolean {
  if (linePoints.length < 2) return false;
  
  for (let i = 0; i < linePoints.length - 1; i++) {
    if (pointToLineDistance(point, linePoints[i], linePoints[i + 1]) <= threshold) {
      return true;
    }
  }
  
  return false;
}

export function pointNearPath(
  point: Point,
  path: Point[],
  threshold: number
): boolean {
  return pointNearLine(point, path, threshold);
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return getDistance(point, lineStart);
  }
  
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const closest = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
  
  return getDistance(point, closest);
}

// ═══════════════════════════════════════════════════════════════════════════
// نقاط الأشكال
// ═══════════════════════════════════════════════════════════════════════════

function getHexagonPoints(bounds: Bounds): Point[] {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  
  const points: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }
  return points;
}

function getStarPoints(bounds: Bounds): Point[] {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const outerR = Math.min(bounds.width, bounds.height) / 2;
  const innerR = outerR * 0.4;
  
  const points: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return points;
}

// ═══════════════════════════════════════════════════════════════════════════
// تصادم الحدود
// ═══════════════════════════════════════════════════════════════════════════

export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function boundsContains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function getElementBounds(element: CanvasElement): Bounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export function getRotatedBounds(bounds: Bounds, rotation: number): Bounds {
  if (rotation === 0) return bounds;
  
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  
  const corners = getBoundsCorners(bounds).map(corner =>
    rotatePoint(corner, center, rotation)
  );
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// التحديد بالسحب
// ═══════════════════════════════════════════════════════════════════════════

export function getElementsInSelection(
  elements: CanvasElement[],
  selectionBounds: Bounds,
  mode: "intersect" | "contain" = "intersect"
): CanvasElement[] {
  return elements.filter(element => {
    const elementBounds = getRotatedBounds(
      getElementBounds(element),
      element.rotation
    );
    
    if (mode === "contain") {
      return boundsContains(selectionBounds, elementBounds);
    } else {
      return boundsOverlap(selectionBounds, elementBounds);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// مقابض تغيير الحجم
// ═══════════════════════════════════════════════════════════════════════════

export type ResizeHandle = 
  | "nw" | "n" | "ne"
  | "w" | "e"
  | "sw" | "s" | "se"
  | "rotation";

export function getResizeHandleAtPoint(
  point: Point,
  bounds: Bounds,
  rotation: number = 0,
  handleSize: number = 10
): ResizeHandle | null {
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  
  // تحويل النقطة للإحداثيات المحلية
  const localPoint = rotation
    ? rotatePoint(point, center, -rotation)
    : point;
  
  const handles: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: "nw", x: bounds.x, y: bounds.y },
    { handle: "n", x: bounds.x + bounds.width / 2, y: bounds.y },
    { handle: "ne", x: bounds.x + bounds.width, y: bounds.y },
    { handle: "w", x: bounds.x, y: bounds.y + bounds.height / 2 },
    { handle: "e", x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    { handle: "sw", x: bounds.x, y: bounds.y + bounds.height },
    { handle: "s", x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    { handle: "se", x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { handle: "rotation", x: bounds.x + bounds.width / 2, y: bounds.y - 25 },
  ];
  
  for (const { handle, x, y } of handles) {
    if (pointInCircle(localPoint, { x, y }, handleSize)) {
      return handle;
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// البحث عن العنصر تحت النقطة
// ═══════════════════════════════════════════════════════════════════════════

export function findElementAtPoint(
  elements: CanvasElement[],
  point: Point,
  order: string[] // ترتيب العناصر من الخلف للأمام
): CanvasElement | null {
  // البحث من الأمام للخلف
  for (let i = order.length - 1; i >= 0; i--) {
    const element = elements.find(e => e.id === order[i]);
    if (element && element.visible && !element.locked && pointInElement(point, element)) {
      return element;
    }
  }
  return null;
}

export function findAllElementsAtPoint(
  elements: CanvasElement[],
  point: Point
): CanvasElement[] {
  return elements.filter(
    element => element.visible && pointInElement(point, element)
  );
}
