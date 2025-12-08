// =============================================================================
// 📐 CCCWAYS Canvas - Math Utilities
// الحسابات الهندسية والرياضية
// =============================================================================

import type { Point, Bounds, Transform } from "@/types/canvas";

// ═══════════════════════════════════════════════════════════════════════════
// عمليات النقاط
// ═══════════════════════════════════════════════════════════════════════════

export function addPoints(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtractPoints(p1: Point, p2: Point): Point {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function multiplyPoint(p: Point, factor: number): Point {
  return { x: p.x * factor, y: p.y * factor };
}

export function dividePoint(p: Point, factor: number): Point {
  return { x: p.x / factor, y: p.y / factor };
}

export function negatePoint(p: Point): Point {
  return { x: -p.x, y: -p.y };
}

export function normalizePoint(p: Point): Point {
  const length = getPointLength(p);
  if (length === 0) return { x: 0, y: 0 };
  return { x: p.x / length, y: p.y / length };
}

export function getPointLength(p: Point): number {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

export function getDistance(p1: Point, p2: Point): number {
  return getPointLength(subtractPoints(p2, p1));
}

export function getMidpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(p1: Point, p2: Point, t: number): Point {
  return { x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════════════════
// الزوايا والدوران
// ═══════════════════════════════════════════════════════════════════════════

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const radians = degreesToRadians(angle);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function getAngle(p1: Point, p2: Point): number {
  return radiansToDegrees(Math.atan2(p2.y - p1.y, p2.x - p1.x));
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// الحدود (Bounds)
// ═══════════════════════════════════════════════════════════════════════════

export function getBoundsFromPoints(points: Point[]): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getBoundsCenter(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getBoundsCorners(bounds: Bounds): Point[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function mergeBounds(bounds: Bounds[]): Bounds {
  if (bounds.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function boundsContainsPoint(bounds: Bounds, point: Point): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function boundsContainsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// التحويلات (Transforms)
// ═══════════════════════════════════════════════════════════════════════════

export function applyTransform(point: Point, transform: Transform): Point {
  // تطبيق التدوير
  const rotated = rotatePoint(
    { x: point.x * transform.scaleX, y: point.y * transform.scaleY },
    { x: 0, y: 0 },
    transform.rotation
  );
  
  // تطبيق الإزاحة
  return addPoints(rotated, { x: transform.x, y: transform.y });
}

export function invertTransform(point: Point, transform: Transform): Point {
  // عكس الإزاحة
  const translated = subtractPoints(point, { x: transform.x, y: transform.y });
  
  // عكس التدوير
  const rotated = rotatePoint(translated, { x: 0, y: 0 }, -transform.rotation);
  
  // عكس المقياس
  return {
    x: rotated.x / transform.scaleX,
    y: rotated.y / transform.scaleY,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// الشبكة والمحاذاة
// ═══════════════════════════════════════════════════════════════════════════

export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function snapValue(value: number, snapSize: number): number {
  return Math.round(value / snapSize) * snapSize;
}

// ═══════════════════════════════════════════════════════════════════════════
// المنحنيات
// ═══════════════════════════════════════════════════════════════════════════

export function getBezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
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

export function getQuadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// تبسيط المسارات
// ═══════════════════════════════════════════════════════════════════════════

export function simplifyPath(points: Point[], tolerance: number = 1): Point[] {
  if (points.length <= 2) return points;
  
  // خوارزمية Douglas-Peucker
  function douglasPeucker(start: number, end: number): Point[] {
    let maxDist = 0;
    let maxIndex = 0;
    
    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    if (maxDist > tolerance) {
      const left = douglasPeucker(start, maxIndex);
      const right = douglasPeucker(maxIndex, end);
      return [...left.slice(0, -1), ...right];
    } else {
      return [points[start], points[end]];
    }
  }
  
  return douglasPeucker(0, points.length - 1);
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  if (dx === 0 && dy === 0) {
    return getDistance(point, lineStart);
  }
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  
  const closest = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
  
  return getDistance(point, closest);
}

// ═══════════════════════════════════════════════════════════════════════════
// تنعيم المسارات
// ═══════════════════════════════════════════════════════════════════════════

export function smoothPath(points: Point[], smoothing: number = 0.2): Point[] {
  if (points.length < 3) return points;
  
  const result: Point[] = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    result.push({
      x: curr.x + smoothing * (prev.x + next.x - 2 * curr.x),
      y: curr.y + smoothing * (prev.y + next.y - 2 * curr.y),
    });
  }
  
  result.push(points[points.length - 1]);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// الأشكال الهندسية
// ═══════════════════════════════════════════════════════════════════════════

export function getPolygonPoints(
  center: Point,
  radius: number,
  sides: number,
  rotation: number = 0
): Point[] {
  const points: Point[] = [];
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = degreesToRadians(rotation) - Math.PI / 2;
  
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  
  return points;
}

export function getStarPoints(
  center: Point,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation: number = 0
): Point[] {
  const result: Point[] = [];
  const angleStep = Math.PI / points;
  const startAngle = degreesToRadians(rotation) - Math.PI / 2;
  
  for (let i = 0; i < points * 2; i++) {
    const angle = startAngle + i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    result.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  
  return result;
}

export function getArrowPoints(
  start: Point,
  end: Point,
  headLength: number = 20,
  headAngle: number = 30
): { line: Point[]; head: Point[] } {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headAngleRad = degreesToRadians(headAngle);
  
  const headPoint1 = {
    x: end.x - headLength * Math.cos(angle - headAngleRad),
    y: end.y - headLength * Math.sin(angle - headAngleRad),
  };
  
  const headPoint2 = {
    x: end.x - headLength * Math.cos(angle + headAngleRad),
    y: end.y - headLength * Math.sin(angle + headAngleRad),
  };
  
  return {
    line: [start, end],
    head: [headPoint1, end, headPoint2],
  };
}
