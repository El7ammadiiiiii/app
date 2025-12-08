// =============================================================================
// 📦 CCCWAYS Canvas - Canvas Renderer
// محرك العرض (WebGL/Canvas2D Hybrid)
// =============================================================================

"use client";

import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import type { CanvasElement, Point, Viewport, ShapeType } from "@/types/canvas";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface CanvasRendererProps {
  className?: string;
  width: number;
  height: number;
  useWebGL?: boolean;
  antiAlias?: boolean;
  pixelRatio?: number;
}

export interface RenderLayer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  visible: boolean;
  opacity: number;
}

// =============================================================================
// 🎨 Component
// =============================================================================

export function CanvasRendererComponent({
  className,
  width,
  height,
  useWebGL = false,
  antiAlias = true,
  pixelRatio = window?.devicePixelRatio || 1,
}: CanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Store
  const elementsRecord = useCanvasStore((state) => state.elements);
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);
  const viewport = useCanvasStore((state) => state.viewport);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const gridSize = useCanvasStore((state) => state.gridSize);

  // =============================================================================
  // 📐 Canvas Setup
  // =============================================================================

  useEffect(() => {
    const canvases = [
      mainCanvasRef.current,
      gridCanvasRef.current,
      overlayCanvasRef.current,
    ].filter(Boolean) as HTMLCanvasElement[];

    canvases.forEach((canvas) => {
      // Set display size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Set actual size in memory (scaled for pixel ratio)
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;

      // Scale context
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(pixelRatio, pixelRatio);
        if (antiAlias) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }
      }
    });
  }, [width, height, pixelRatio, antiAlias]);

  // =============================================================================
  // 🎨 Grid Rendering
  // =============================================================================

  const renderGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !showGrid) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply viewport transform
    ctx.translate(-viewport.x * viewport.zoom, -viewport.y * viewport.zoom);
    ctx.scale(viewport.zoom, viewport.zoom);

    const currentGridSize = gridSize || 20;
    const color = "#e5e7eb";

    // Calculate visible grid range
    const startX = Math.floor(viewport.x / currentGridSize) * currentGridSize;
    const startY = Math.floor(viewport.y / currentGridSize) * currentGridSize;
    const endX = viewport.x + width / viewport.zoom;
    const endY = viewport.y + height / viewport.zoom;

    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5 / viewport.zoom;
    ctx.beginPath();

    // Vertical lines
    for (let x = startX; x <= endX; x += currentGridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += currentGridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }

    ctx.stroke();

    // Major grid lines (every 5th line)
    if (viewport.zoom > 0.5) {
      const majorGridSize = currentGridSize * 5;
      const majorStartX = Math.floor(viewport.x / majorGridSize) * majorGridSize;
      const majorStartY = Math.floor(viewport.y / majorGridSize) * majorGridSize;

      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.beginPath();

      for (let x = majorStartX; x <= endX; x += majorGridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }

      for (let y = majorStartY; y <= endY; y += majorGridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }

      ctx.stroke();
    }

    ctx.restore();
  }, [viewport, width, height, showGrid, gridSize]);

  // =============================================================================
  // 🎨 Elements Rendering
  // =============================================================================

  const renderElements = useCallback(() => {
    const canvas = mainCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply viewport transform
    ctx.translate(-viewport.x * viewport.zoom, -viewport.y * viewport.zoom);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Sort by z-index (use 0 if not defined)
    const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // Render each element
    sorted.forEach((element) => {
      if (!element.visible) return;
      renderElement(ctx, element, selectedIds.includes(element.id));
    });

    ctx.restore();
  }, [elements, viewport, selectedIds, width, height]);

  // =============================================================================
  // 🔧 Element Rendering Functions
  // =============================================================================

  const renderElement = (
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    isSelected: boolean
  ) => {
    ctx.save();

    // Apply element rotation
    if (element.rotation) {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Apply opacity
    if (element.fill?.opacity !== undefined) {
      ctx.globalAlpha = element.fill.opacity;
    }

    // Render based on type
    switch (element.type) {
      case "shape":
        renderShape(ctx, element as any);
        break;
      case "text":
        renderText(ctx, element as any);
        break;
      case "sticky":
        renderStickyNote(ctx, element as any);
        break;
      case "image":
        renderImage(ctx, element as any);
        break;
      case "connector":
        renderConnector(ctx, element as any);
        break;
      case "freehand":
        renderFreehand(ctx, element as any);
        break;
      case "frame":
        renderFrame(ctx, element as any);
        break;
    }

    // Draw selection
    if (isSelected) {
      drawSelection(ctx, element);
    }

    ctx.restore();
  };

  const renderShape = (ctx: CanvasRenderingContext2D, element: any) => {
    const { x, y, width: w, height: h, shapeType, cornerRadius, fill, stroke } = element;

    ctx.beginPath();

    switch (shapeType as ShapeType) {
      case "rectangle":
        if (cornerRadius && cornerRadius > 0) {
          roundedRect(ctx, x, y, w, h, cornerRadius);
        } else {
          ctx.rect(x, y, w, h);
        }
        break;

      case "circle":
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;

      case "triangle":
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        break;

      case "diamond":
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        break;

      case "hexagon":
        const hx = w / 4;
        ctx.moveTo(x + hx, y);
        ctx.lineTo(x + w - hx, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w - hx, y + h);
        ctx.lineTo(x + hx, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        break;

      case "star":
        drawStar(ctx, x + w / 2, y + h / 2, 5, w / 2, w / 4);
        break;

      case "arrow":
        drawArrow(ctx, x, y + h / 2, x + w, y + h / 2, h / 3);
        break;

      default:
        ctx.rect(x, y, w, h);
    }

    // Fill
    if (fill?.color) {
      ctx.fillStyle = fill.color;
      ctx.fill();
    }

    // Stroke
    if (stroke?.color && stroke.width > 0) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      if (stroke.style === "dashed") {
        ctx.setLineDash([stroke.width * 3, stroke.width * 2]);
      } else if (stroke.style === "dotted") {
        ctx.setLineDash([stroke.width, stroke.width]);
      }
      ctx.stroke();
    }
  };

  const renderText = (ctx: CanvasRenderingContext2D, element: any) => {
    const { x, y, width: w, height: h, content, textOptions, fill } = element;
    const opts = textOptions || {};

    ctx.font = `${opts.fontStyle || "normal"} ${opts.fontWeight || "normal"} ${opts.fontSize || 16}px ${opts.fontFamily || "Cairo"}`;
    ctx.fillStyle = fill?.color || "#000000";
    ctx.textAlign = opts.textAlign || "right";
    ctx.textBaseline = "top";

    // Word wrap
    const lines = wrapText(ctx, content || "", w);
    const lineHeight = (opts.fontSize || 16) * (opts.lineHeight || 1.5);

    lines.forEach((line, index) => {
      const textX = opts.textAlign === "center" ? x + w / 2 : opts.textAlign === "right" ? x + w : x;
      ctx.fillText(line, textX, y + index * lineHeight);
    });
  };

  const renderStickyNote = (ctx: CanvasRenderingContext2D, element: any) => {
    const { x, y, width: w, height: h, content, color } = element;

    // Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Background
    ctx.fillStyle = color || "#fef3c7";
    roundedRect(ctx, x, y, w, h, 4);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";

    // Fold effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.beginPath();
    ctx.moveTo(x + w - 20, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + 20);
    ctx.closePath();
    ctx.fill();

    // Content
    if (content) {
      ctx.font = "14px Cairo";
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "right";

      const lines = wrapText(ctx, content, w - 20);
      lines.slice(0, 8).forEach((line, index) => {
        ctx.fillText(line, x + w - 10, y + 15 + index * 20);
      });
    }
  };

  const renderImage = (ctx: CanvasRenderingContext2D, element: any) => {
    const { x, y, width: w, height: h, src, loaded, imageData } = element;

    if (imageData && loaded) {
      ctx.drawImage(imageData, x, y, w, h);
    } else {
      // Placeholder
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#e5e7eb";
      ctx.strokeRect(x, y, w, h);

      // Icon
      ctx.fillStyle = "#9ca3af";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🖼️", x + w / 2, y + h / 2);
    }
  };

  const renderConnector = (ctx: CanvasRenderingContext2D, element: any) => {
    const { startPoint, endPoint, stroke, connectorType, startArrow, endArrow } = element;

    ctx.beginPath();
    ctx.strokeStyle = stroke?.color || "#000000";
    ctx.lineWidth = stroke?.width || 2;

    ctx.moveTo(startPoint.x, startPoint.y);

    if (connectorType === "curved") {
      const midX = (startPoint.x + endPoint.x) / 2;
      ctx.bezierCurveTo(
        midX, startPoint.y,
        midX, endPoint.y,
        endPoint.x, endPoint.y
      );
    } else if (connectorType === "elbow") {
      const midX = (startPoint.x + endPoint.x) / 2;
      ctx.lineTo(midX, startPoint.y);
      ctx.lineTo(midX, endPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
    } else {
      ctx.lineTo(endPoint.x, endPoint.y);
    }

    ctx.stroke();

    // Draw arrows
    if (endArrow === "arrow") {
      drawArrowHead(ctx, endPoint, startPoint, stroke?.color || "#000000");
    }
  };

  const renderFreehand = (ctx: CanvasRenderingContext2D, element: any) => {
    const { points, stroke } = element;
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke?.color || "#000000";
    ctx.lineWidth = stroke?.width || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
  };

  const renderFrame = (ctx: CanvasRenderingContext2D, element: any) => {
    const { x, y, width: w, height: h, name, backgroundColor, showName, stroke } = element;

    // Background
    ctx.fillStyle = backgroundColor || "#ffffff";
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = stroke?.color || "#6366f1";
    ctx.lineWidth = stroke?.width || 2;
    ctx.strokeRect(x, y, w, h);

    // Name
    if (showName !== false && name) {
      ctx.font = "bold 12px Cairo";
      ctx.fillStyle = stroke?.color || "#6366f1";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(name, x + w - 8, y - 4);
    }
  };

  // =============================================================================
  // 🔧 Selection
  // =============================================================================

  const drawSelection = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    const { x, y, width: w, height: h } = element;
    const handleSize = 8 / viewport.zoom;
    const padding = 2 / viewport.zoom;

    // Selection border
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(x - padding, y - padding, w + padding * 2, h + padding * 2);

    // Handles
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1 / viewport.zoom;

    const handles = [
      { x: x - handleSize / 2, y: y - handleSize / 2 }, // Top-left
      { x: x + w / 2 - handleSize / 2, y: y - handleSize / 2 }, // Top-center
      { x: x + w - handleSize / 2, y: y - handleSize / 2 }, // Top-right
      { x: x + w - handleSize / 2, y: y + h / 2 - handleSize / 2 }, // Right-center
      { x: x + w - handleSize / 2, y: y + h - handleSize / 2 }, // Bottom-right
      { x: x + w / 2 - handleSize / 2, y: y + h - handleSize / 2 }, // Bottom-center
      { x: x - handleSize / 2, y: y + h - handleSize / 2 }, // Bottom-left
      { x: x - handleSize / 2, y: y + h / 2 - handleSize / 2 }, // Left-center
    ];

    handles.forEach((handle) => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  };

  // =============================================================================
  // 🔧 Helper Functions
  // =============================================================================

  const roundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rotation = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(
        cx + Math.cos(rotation) * outerRadius,
        cy + Math.sin(rotation) * outerRadius
      );
      rotation += step;
      ctx.lineTo(
        cx + Math.cos(rotation) * innerRadius,
        cy + Math.sin(rotation) * innerRadius
      );
      rotation += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    headSize: number
  ) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX - headSize * Math.cos(angle), toY - headSize * Math.sin(angle));

    // Arrow head
    ctx.lineTo(
      toX - headSize * Math.cos(angle - Math.PI / 6),
      toY - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(toX, toY);
    ctx.lineTo(
      toX - headSize * Math.cos(angle + Math.PI / 6),
      toY - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
  };

  const drawArrowHead = (
    ctx: CanvasRenderingContext2D,
    to: Point,
    from: Point,
    color: string
  ) => {
    const headSize = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headSize * Math.cos(angle - Math.PI / 6),
      to.y - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headSize * Math.cos(angle + Math.PI / 6),
      to.y - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // =============================================================================
  // 🔄 Render Loop
  // =============================================================================

  useEffect(() => {
    let frameId: number;

    const render = () => {
      renderGrid();
      renderElements();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [renderGrid, renderElements]);

  // =============================================================================
  // 🎨 Render
  // =============================================================================

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ width, height }}
    >
      {/* Grid layer */}
      <canvas
        ref={gridCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Main elements layer */}
      <canvas ref={mainCanvasRef} className="absolute inset-0" />

      {/* Overlay layer */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
}

export default CanvasRendererComponent;
