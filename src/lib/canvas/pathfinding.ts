// =============================================================================
// 🔗 CCCWAYS Canvas - Pathfinding
// إيجاد مسارات الروابط الذكية
// =============================================================================

import type { Point, Bounds, CanvasElement } from "@/types/canvas";
import { getDistance, addPoints, subtractPoints } from "./math";
import { boundsOverlap } from "./collision";

// ═══════════════════════════════════════════════════════════════════════════
// أنواع المسارات
// ═══════════════════════════════════════════════════════════════════════════

export type PathType = "straight" | "curved" | "elbow";

export interface PathOptions {
  type: PathType;
  padding: number;
  cornerRadius: number;
  avoidElements: CanvasElement[];
}

// ═══════════════════════════════════════════════════════════════════════════
// نقاط الاتصال
// ═══════════════════════════════════════════════════════════════════════════

export type ConnectionSide = "top" | "right" | "bottom" | "left" | "center";

export interface ConnectionPoint {
  point: Point;
  side: ConnectionSide;
}

export function getConnectionPoints(bounds: Bounds): Record<ConnectionSide, Point> {
  return {
    top: { x: bounds.x + bounds.width / 2, y: bounds.y },
    right: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    bottom: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    left: { x: bounds.x, y: bounds.y + bounds.height / 2 },
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
  };
}

export function getNearestConnectionPoint(
  point: Point,
  bounds: Bounds
): ConnectionPoint {
  const points = getConnectionPoints(bounds);
  let nearest: ConnectionPoint = { point: points.center, side: "center" };
  let minDist = Infinity;
  
  for (const [side, p] of Object.entries(points) as [ConnectionSide, Point][]) {
    const dist = getDistance(point, p);
    if (dist < minDist) {
      minDist = dist;
      nearest = { point: p, side };
    }
  }
  
  return nearest;
}

// ═══════════════════════════════════════════════════════════════════════════
// حساب المسارات
// ═══════════════════════════════════════════════════════════════════════════

export function calculatePath(
  start: ConnectionPoint,
  end: ConnectionPoint,
  options: Partial<PathOptions> = {}
): Point[] {
  const { type = "elbow", padding = 20, cornerRadius = 0 } = options;
  
  switch (type) {
    case "straight":
      return [start.point, end.point];
    case "curved":
      return calculateCurvedPath(start, end);
    case "elbow":
      return calculateElbowPath(start, end, padding);
    default:
      return [start.point, end.point];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// المسار المنحني
// ═══════════════════════════════════════════════════════════════════════════

function calculateCurvedPath(start: ConnectionPoint, end: ConnectionPoint): Point[] {
  const dx = end.point.x - start.point.x;
  const dy = end.point.y - start.point.y;
  
  const controlOffset = Math.max(Math.abs(dx), Math.abs(dy)) * 0.5;
  
  // نقاط التحكم بناءً على اتجاه الخروج والدخول
  const cp1 = getControlPoint(start.point, start.side, controlOffset);
  const cp2 = getControlPoint(end.point, getOppositeSide(end.side), controlOffset);
  
  // إنشاء نقاط على المنحنى
  const points: Point[] = [];
  const steps = 20;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push(cubicBezierPoint(start.point, cp1, cp2, end.point, t));
  }
  
  return points;
}

function getControlPoint(point: Point, side: ConnectionSide, offset: number): Point {
  switch (side) {
    case "top":
      return { x: point.x, y: point.y - offset };
    case "bottom":
      return { x: point.x, y: point.y + offset };
    case "left":
      return { x: point.x - offset, y: point.y };
    case "right":
      return { x: point.x + offset, y: point.y };
    default:
      return point;
  }
}

function getOppositeSide(side: ConnectionSide): ConnectionSide {
  switch (side) {
    case "top": return "bottom";
    case "bottom": return "top";
    case "left": return "right";
    case "right": return "left";
    default: return "center";
  }
}

function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// المسار الكوعي (Elbow)
// ═══════════════════════════════════════════════════════════════════════════

function calculateElbowPath(
  start: ConnectionPoint,
  end: ConnectionPoint,
  padding: number
): Point[] {
  const points: Point[] = [start.point];
  
  const dx = end.point.x - start.point.x;
  const dy = end.point.y - start.point.y;
  
  // تحديد استراتيجية المسار بناءً على الاتجاهات
  if (isHorizontal(start.side) && isHorizontal(end.side)) {
    // أفقي إلى أفقي
    const midX = start.point.x + dx / 2;
    points.push({ x: midX, y: start.point.y });
    points.push({ x: midX, y: end.point.y });
  } else if (isVertical(start.side) && isVertical(end.side)) {
    // عمودي إلى عمودي
    const midY = start.point.y + dy / 2;
    points.push({ x: start.point.x, y: midY });
    points.push({ x: end.point.x, y: midY });
  } else if (isHorizontal(start.side)) {
    // أفقي إلى عمودي
    points.push({ x: end.point.x, y: start.point.y });
  } else {
    // عمودي إلى أفقي
    points.push({ x: start.point.x, y: end.point.y });
  }
  
  points.push(end.point);
  
  return points;
}

function isHorizontal(side: ConnectionSide): boolean {
  return side === "left" || side === "right";
}

function isVertical(side: ConnectionSide): boolean {
  return side === "top" || side === "bottom";
}

// ═══════════════════════════════════════════════════════════════════════════
// تجنب العناصر (A* مبسط)
// ═══════════════════════════════════════════════════════════════════════════

export function calculateAvoidingPath(
  start: Point,
  end: Point,
  obstacles: Bounds[],
  gridSize: number = 20
): Point[] {
  // إذا لا يوجد عوائق، خط مستقيم
  if (obstacles.length === 0) {
    return [start, end];
  }
  
  // تبسيط: خط مستقيم إذا لا يتقاطع مع عوائق
  if (!pathIntersectsObstacles(start, end, obstacles)) {
    return [start, end];
  }
  
  // A* مبسط
  const path = findPathAStar(start, end, obstacles, gridSize);
  
  return path.length > 0 ? path : [start, end];
}

function pathIntersectsObstacles(start: Point, end: Point, obstacles: Bounds[]): boolean {
  const steps = Math.ceil(getDistance(start, end) / 10);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
    
    for (const obs of obstacles) {
      if (
        point.x >= obs.x &&
        point.x <= obs.x + obs.width &&
        point.y >= obs.y &&
        point.y <= obs.y + obs.height
      ) {
        return true;
      }
    }
  }
  
  return false;
}

interface AStarNode {
  point: Point;
  g: number; // تكلفة من البداية
  h: number; // تقدير للنهاية
  f: number; // g + h
  parent: AStarNode | null;
}

function findPathAStar(
  start: Point,
  end: Point,
  obstacles: Bounds[],
  gridSize: number
): Point[] {
  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();
  
  const startNode: AStarNode = {
    point: start,
    g: 0,
    h: getDistance(start, end),
    f: getDistance(start, end),
    parent: null,
  };
  
  openSet.push(startNode);
  
  const directions = [
    { x: 0, y: -gridSize },  // أعلى
    { x: gridSize, y: 0 },   // يمين
    { x: 0, y: gridSize },   // أسفل
    { x: -gridSize, y: 0 },  // يسار
    { x: gridSize, y: -gridSize },  // قطري
    { x: gridSize, y: gridSize },
    { x: -gridSize, y: gridSize },
    { x: -gridSize, y: -gridSize },
  ];
  
  let iterations = 0;
  const maxIterations = 500;
  
  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // الحصول على العقدة ذات أقل f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    // التحقق من الوصول
    if (getDistance(current.point, end) < gridSize) {
      return reconstructPath(current, end);
    }
    
    const key = `${current.point.x},${current.point.y}`;
    if (closedSet.has(key)) continue;
    closedSet.add(key);
    
    // استكشاف الجيران
    for (const dir of directions) {
      const neighbor: Point = {
        x: current.point.x + dir.x,
        y: current.point.y + dir.y,
      };
      
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(neighborKey)) continue;
      
      // التحقق من العوائق
      if (pointInObstacles(neighbor, obstacles)) continue;
      
      const g = current.g + getDistance(current.point, neighbor);
      const h = getDistance(neighbor, end);
      
      const existingNode = openSet.find(
        n => n.point.x === neighbor.x && n.point.y === neighbor.y
      );
      
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = g + h;
          existingNode.parent = current;
        }
      } else {
        openSet.push({
          point: neighbor,
          g,
          h,
          f: g + h,
          parent: current,
        });
      }
    }
  }
  
  return [start, end];
}

function pointInObstacles(point: Point, obstacles: Bounds[]): boolean {
  for (const obs of obstacles) {
    if (
      point.x >= obs.x &&
      point.x <= obs.x + obs.width &&
      point.y >= obs.y &&
      point.y <= obs.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}

function reconstructPath(node: AStarNode, end: Point): Point[] {
  const path: Point[] = [end];
  let current: AStarNode | null = node;
  
  while (current) {
    path.unshift(current.point);
    current = current.parent;
  }
  
  // تبسيط المسار
  return simplifyPath(path);
}

function simplifyPath(path: Point[]): Point[] {
  if (path.length <= 2) return path;
  
  const simplified: Point[] = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = path[i];
    const next = path[i + 1];
    
    // إذا تغير الاتجاه، أضف النقطة
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    
    if (dx1 !== dx2 || dy1 !== dy2) {
      simplified.push(curr);
    }
  }
  
  simplified.push(path[path.length - 1]);
  
  return simplified;
}

// ═══════════════════════════════════════════════════════════════════════════
// تحديث مسار الرابط ديناميكياً
// ═══════════════════════════════════════════════════════════════════════════

export function updateConnectorPath(
  startElement: CanvasElement | null,
  endElement: CanvasElement | null,
  startPoint: Point,
  endPoint: Point,
  pathType: PathType = "elbow"
): Point[] {
  let startConnection: ConnectionPoint;
  let endConnection: ConnectionPoint;
  
  if (startElement) {
    const bounds = {
      x: startElement.x,
      y: startElement.y,
      width: startElement.width,
      height: startElement.height,
    };
    startConnection = getNearestConnectionPoint(endPoint, bounds);
  } else {
    startConnection = { point: startPoint, side: "center" };
  }
  
  if (endElement) {
    const bounds = {
      x: endElement.x,
      y: endElement.y,
      width: endElement.width,
      height: endElement.height,
    };
    endConnection = getNearestConnectionPoint(startPoint, bounds);
  } else {
    endConnection = { point: endPoint, side: "center" };
  }
  
  return calculatePath(startConnection, endConnection, { type: pathType });
}
