// =============================================================================
// 🎨 CCCWAYS Canvas - Renderer
// محرك الرسم الأساسي
// =============================================================================

import type { 
  CanvasElement, 
  Point, 
  Viewport, 
  StrokeOptions, 
  FillOptions,
  ShapeType,
} from "@/types/canvas";
import { getPolygonPoints, getStarPoints } from "./math";

// ═══════════════════════════════════════════════════════════════════════════
// أنواع المحرك
// ═══════════════════════════════════════════════════════════════════════════

export interface RendererOptions {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  pixelRatio: number;
  showGrid: boolean;
  gridSize: number;
  selectedIds: string[];
  hoveredId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// التحويل من إحداثيات العالم للشاشة
// ═══════════════════════════════════════════════════════════════════════════

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) * viewport.zoom,
    y: (point.y - viewport.y) * viewport.zoom,
  };
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: point.x / viewport.zoom + viewport.x,
    y: point.y / viewport.zoom + viewport.y,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم الشبكة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * الدالة الرئيسية للرسم على الكانفاس
 */
export function renderCanvas(options: RendererOptions): void {
  const { ctx, showGrid } = options;
  
  if (showGrid) {
    drawGrid(options);
  }
}

export function drawGrid(options: RendererOptions): void {
  const { ctx, viewport, gridSize, pixelRatio } = options;
  const canvas = ctx.canvas;
  const width = canvas.width / pixelRatio;
  const height = canvas.height / pixelRatio;
  
  const scaledGridSize = gridSize * viewport.zoom;
  
  // تجاهل الشبكة الصغيرة جداً
  if (scaledGridSize < 5) return;
  
  const offsetX = (viewport.x * viewport.zoom) % scaledGridSize;
  const offsetY = (viewport.y * viewport.zoom) % scaledGridSize;
  
  ctx.save();
  ctx.strokeStyle = "rgba(128, 128, 128, 0.15)";
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  
  // الخطوط العمودية
  for (let x = -offsetX; x < width; x += scaledGridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  
  // الخطوط الأفقية
  for (let y = -offsetY; y < height; y += scaledGridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  
  ctx.stroke();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم العناصر
// ═══════════════════════════════════════════════════════════════════════════

export function drawElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport,
  isSelected: boolean,
  isHovered: boolean
): void {
  if (!element.visible) return;
  
  ctx.save();
  
  // تطبيق التحويلات
  const screenPos = worldToScreen({ x: element.x, y: element.y }, viewport);
  const screenWidth = element.width * viewport.zoom;
  const screenHeight = element.height * viewport.zoom;
  
  ctx.translate(
    screenPos.x + screenWidth / 2,
    screenPos.y + screenHeight / 2
  );
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.translate(-screenWidth / 2, -screenHeight / 2);
  
  ctx.globalAlpha = element.opacity;
  
  // رسم حسب النوع
  switch (element.type) {
    case "shape":
      drawShape(ctx, element, screenWidth, screenHeight);
      break;
    case "freehand":
      drawFreehand(ctx, element, viewport);
      break;
    case "text":
      drawText(ctx, element, screenWidth, screenHeight, viewport);
      break;
    case "sticky":
      drawStickyNote(ctx, element, screenWidth, screenHeight, viewport);
      break;
    case "image":
      drawImage(ctx, element, screenWidth, screenHeight);
      break;
    case "connector":
      drawConnector(ctx, element, viewport);
      break;
    case "frame":
      drawFrame(ctx, element, screenWidth, screenHeight, viewport);
      break;
    case "embed":
      drawEmbed(ctx, element, screenWidth, screenHeight);
      break;
    case "comment":
      drawComment(ctx, element, viewport);
      break;
  }
  
  ctx.restore();
  
  // رسم التحديد
  if (isSelected) {
    drawSelectionBox(ctx, screenPos, screenWidth, screenHeight, element.rotation);
  }
  
  // رسم التمويه
  if (isHovered && !isSelected) {
    drawHoverBox(ctx, screenPos, screenWidth, screenHeight, element.rotation);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم الأشكال
// ═══════════════════════════════════════════════════════════════════════════

function drawShape(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  width: number,
  height: number
): void {
  if (element.type !== "shape") return;
  
  const { stroke, fill, shapeType } = element;
  
  ctx.beginPath();
  
  switch (shapeType) {
    case "rectangle":
      const radius = (element.cornerRadius || 0) * (width / element.width);
      if (radius > 0) {
        roundRect(ctx, 0, 0, width, height, radius);
      } else {
        ctx.rect(0, 0, width, height);
      }
      break;
      
    case "ellipse":
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
      
    case "triangle":
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      break;
      
    case "diamond":
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width, height / 2);
      ctx.lineTo(width / 2, height);
      ctx.lineTo(0, height / 2);
      ctx.closePath();
      break;
      
    case "hexagon":
      const hexPoints = getPolygonPoints(
        { x: width / 2, y: height / 2 },
        Math.min(width, height) / 2,
        6
      );
      ctx.moveTo(hexPoints[0].x, hexPoints[0].y);
      hexPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      break;
      
    case "star":
      const starPoints = getStarPoints(
        { x: width / 2, y: height / 2 },
        Math.min(width, height) / 2,
        Math.min(width, height) / 4,
        5
      );
      ctx.moveTo(starPoints[0].x, starPoints[0].y);
      starPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      break;
      
    case "line":
    case "arrow":
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      break;
  }
  
  // تعبئة
  if (fill.style !== "none") {
    applyFill(ctx, fill, width, height);
    ctx.fill();
  }
  
  // حد
  if (stroke.width > 0) {
    applyStroke(ctx, stroke);
    ctx.stroke();
  }
  
  // رأس السهم
  if (shapeType === "arrow") {
    drawArrowHead(ctx, { x: width, y: height / 2 }, 0, stroke);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم المسار الحر
// ═══════════════════════════════════════════════════════════════════════════

function drawFreehand(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport
): void {
  if (element.type !== "freehand" || element.points.length < 2) return;
  
  const { stroke, points } = element;
  
  ctx.beginPath();
  
  const firstPoint = worldToScreen(points[0], viewport);
  ctx.moveTo(
    firstPoint.x - element.x * viewport.zoom,
    firstPoint.y - element.y * viewport.zoom
  );
  
  for (let i = 1; i < points.length; i++) {
    const point = worldToScreen(points[i], viewport);
    ctx.lineTo(
      point.x - element.x * viewport.zoom,
      point.y - element.y * viewport.zoom
    );
  }
  
  applyStroke(ctx, stroke);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم النص
// ═══════════════════════════════════════════════════════════════════════════

function drawText(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  width: number,
  height: number,
  viewport: Viewport
): void {
  if (element.type !== "text") return;
  
  const { text, textOptions } = element;
  const fontSize = textOptions.fontSize * viewport.zoom;
  
  ctx.font = `${textOptions.fontWeight} ${textOptions.fontStyle} ${fontSize}px ${getFontFamily(textOptions.fontFamily)}`;
  ctx.fillStyle = textOptions.color;
  ctx.textAlign = textOptions.textAlign as CanvasTextAlign;
  ctx.textBaseline = "top";
  
  const lines = text.split("\n");
  const lineHeight = fontSize * textOptions.lineHeight;
  
  let x = 0;
  if (textOptions.textAlign === "center") x = width / 2;
  else if (textOptions.textAlign === "right") x = width;
  
  lines.forEach((line, i) => {
    ctx.fillText(line, x, i * lineHeight);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم الملاحظة اللاصقة
// ═══════════════════════════════════════════════════════════════════════════

function drawStickyNote(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  width: number,
  height: number,
  viewport: Viewport
): void {
  if (element.type !== "sticky") return;
  
  const { text, textOptions, noteColor } = element;
  const radius = 8 * viewport.zoom;
  
  // الخلفية
  ctx.fillStyle = noteColor;
  ctx.beginPath();
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.fill();
  
  // ظل خفيف
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
  ctx.shadowBlur = 10 * viewport.zoom;
  ctx.shadowOffsetY = 2 * viewport.zoom;
  
  // النص
  const padding = 12 * viewport.zoom;
  const fontSize = textOptions.fontSize * viewport.zoom;
  
  ctx.font = `${fontSize}px ${getFontFamily(textOptions.fontFamily)}`;
  ctx.fillStyle = textOptions.color;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  
  // تقسيم النص لأسطر
  const maxWidth = width - padding * 2;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * textOptions.lineHeight;
  
  ctx.shadowColor = "transparent";
  
  lines.forEach((line, i) => {
    ctx.fillText(line, width - padding, padding + i * lineHeight);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم الصورة
// ═══════════════════════════════════════════════════════════════════════════

function drawImage(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  width: number,
  height: number
): void {
  if (element.type !== "image") return;
  
  // placeholder للصورة
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);
  
  // أيقونة الصورة
  ctx.fillStyle = "#999";
  ctx.font = `${Math.min(width, height) / 4}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🖼️", width / 2, height / 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم الرابط
// ═══════════════════════════════════════════════════════════════════════════

function drawConnector(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport
): void {
  if (element.type !== "connector" || element.path.length < 2) return;
  
  const { stroke, path, startArrow, endArrow } = element;
  
  ctx.beginPath();
  
  const points = path.map(p => ({
    x: (p.x - element.x) * viewport.zoom,
    y: (p.y - element.y) * viewport.zoom,
  }));
  
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  applyStroke(ctx, stroke);
  ctx.stroke();
  
  // رؤوس الأسهم
  if (startArrow !== "none") {
    const angle = Math.atan2(
      points[0].y - points[1].y,
      points[0].x - points[1].x
    );
    drawArrowHead(ctx, points[0], angle, stroke);
  }
  
  if (endArrow !== "none") {
    const last = points.length - 1;
    const angle = Math.atan2(
      points[last].y - points[last - 1].y,
      points[last].x - points[last - 1].x
    );
    drawArrowHead(ctx, points[last], angle, stroke);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم الإطار
// ═══════════════════════════════════════════════════════════════════════════

function drawFrame(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  width: number,
  height: number,
  viewport: Viewport
): void {
  if (element.type !== "frame") return;
  
  // الخلفية
  if (element.backgroundColor) {
    ctx.fillStyle = element.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }
  
  // الحد
  ctx.strokeStyle = "#00D4B4";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(0, 0, width, height);
  ctx.setLineDash([]);
  
  // العنوان
  if (element.showName && element.name) {
    const fontSize = 12 * viewport.zoom;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "#00D4B4";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(element.name, width - 4, -4);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم المحتوى المضمن
// ═══════════════════════════════════════════════════════════════════════════

function drawEmbed(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  width: number,
  height: number
): void {
  if (element.type !== "embed") return;
  
  // placeholder
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);
  
  ctx.fillStyle = "#666";
  ctx.font = `${Math.min(width, height) / 6}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📎 محتوى مضمن", width / 2, height / 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم التعليق
// ═══════════════════════════════════════════════════════════════════════════

function drawComment(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport
): void {
  if (element.type !== "comment") return;
  
  const size = 32 * viewport.zoom;
  
  // الدائرة
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = element.resolved ? "#22c55e" : "#f97316";
  ctx.fill();
  
  // الأيقونة
  ctx.fillStyle = "white";
  ctx.font = `${size * 0.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💬", size / 2, size / 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════════════════

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function applyStroke(ctx: CanvasRenderingContext2D, stroke: StrokeOptions): void {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.globalAlpha *= stroke.opacity;
  
  switch (stroke.style) {
    case "dashed":
      ctx.setLineDash([stroke.width * 4, stroke.width * 2]);
      break;
    case "dotted":
      ctx.setLineDash([stroke.width, stroke.width * 2]);
      break;
    default:
      ctx.setLineDash([]);
  }
}

function applyFill(
  ctx: CanvasRenderingContext2D,
  fill: FillOptions,
  width: number,
  height: number
): void {
  ctx.globalAlpha *= fill.opacity;
  
  switch (fill.style) {
    case "solid":
      ctx.fillStyle = fill.color;
      break;
    case "semi":
      ctx.fillStyle = fill.color + "80"; // 50% opacity
      break;
    case "hatch":
      ctx.fillStyle = createHatchPattern(ctx, fill.color);
      break;
    case "cross":
      ctx.fillStyle = createCrossPattern(ctx, fill.color);
      break;
    default:
      ctx.fillStyle = "transparent";
  }
}

function createHatchPattern(
  ctx: CanvasRenderingContext2D,
  color: string
): CanvasPattern | string {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const patternCtx = canvas.getContext("2d")!;
  
  patternCtx.strokeStyle = color;
  patternCtx.lineWidth = 1;
  patternCtx.beginPath();
  patternCtx.moveTo(0, 8);
  patternCtx.lineTo(8, 0);
  patternCtx.stroke();
  
  return ctx.createPattern(canvas, "repeat") || color;
}

function createCrossPattern(
  ctx: CanvasRenderingContext2D,
  color: string
): CanvasPattern | string {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const patternCtx = canvas.getContext("2d")!;
  
  patternCtx.strokeStyle = color;
  patternCtx.lineWidth = 1;
  patternCtx.beginPath();
  patternCtx.moveTo(0, 8);
  patternCtx.lineTo(8, 0);
  patternCtx.moveTo(0, 0);
  patternCtx.lineTo(8, 8);
  patternCtx.stroke();
  
  return ctx.createPattern(canvas, "repeat") || color;
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  tip: Point,
  angle: number,
  stroke: StrokeOptions
): void {
  const size = stroke.width * 4;
  
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size, size / 2);
  ctx.closePath();
  
  ctx.fillStyle = stroke.color;
  ctx.fill();
  ctx.restore();
}

function getFontFamily(family: string): string {
  switch (family) {
    case "hand":
      return '"Comic Sans MS", cursive';
    case "mono":
      return '"Fira Code", "Consolas", monospace';
    case "serif":
      return '"Georgia", serif';
    default:
      return '"Segoe UI", "Noto Sans Arabic", sans-serif';
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم التحديد والتمويه
// ═══════════════════════════════════════════════════════════════════════════

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  pos: Point,
  width: number,
  height: number,
  rotation: number
): void {
  ctx.save();
  ctx.translate(pos.x + width / 2, pos.y + height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);
  
  // الإطار
  ctx.strokeStyle = "#00D4B4";
  ctx.lineWidth = 2;
  ctx.strokeRect(-2, -2, width + 4, height + 4);
  
  // المقابض
  const handleSize = 8;
  const handles = [
    { x: -handleSize / 2, y: -handleSize / 2 },
    { x: width / 2 - handleSize / 2, y: -handleSize / 2 },
    { x: width - handleSize / 2, y: -handleSize / 2 },
    { x: -handleSize / 2, y: height / 2 - handleSize / 2 },
    { x: width - handleSize / 2, y: height / 2 - handleSize / 2 },
    { x: -handleSize / 2, y: height - handleSize / 2 },
    { x: width / 2 - handleSize / 2, y: height - handleSize / 2 },
    { x: width - handleSize / 2, y: height - handleSize / 2 },
  ];
  
  ctx.fillStyle = "white";
  ctx.strokeStyle = "#00D4B4";
  ctx.lineWidth = 1;
  
  handles.forEach(h => {
    ctx.fillRect(h.x, h.y, handleSize, handleSize);
    ctx.strokeRect(h.x, h.y, handleSize, handleSize);
  });
  
  // مقبض الدوران
  ctx.beginPath();
  ctx.arc(width / 2, -20, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

function drawHoverBox(
  ctx: CanvasRenderingContext2D,
  pos: Point,
  width: number,
  height: number,
  rotation: number
): void {
  ctx.save();
  ctx.translate(pos.x + width / 2, pos.y + height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);
  
  ctx.strokeStyle = "#00D4B4";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(-2, -2, width + 4, height + 4);
  ctx.setLineDash([]);
  
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// رسم مستطيل التحديد
// ═══════════════════════════════════════════════════════════════════════════

export function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point
): void {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  
  ctx.fillStyle = "rgba(0, 212, 180, 0.1)";
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = "#00D4B4";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);
}
