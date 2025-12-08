// =============================================================================
// 📦 CCCWAYS Canvas - Virtual Viewport
// مكون العرض الافتراضي للأداء العالي
// =============================================================================

"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvasStore";
import { useViewport } from "@/hooks/canvas/useViewport";
import type { CanvasElement, Bounds, Point, Viewport } from "@/types/canvas";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface VirtualViewportProps {
  children: React.ReactNode;
  className?: string;
  overscan?: number; // Extra area to render outside viewport
  chunkSize?: number; // Size of spatial chunks for optimization
  onVisibleElementsChange?: (elements: CanvasElement[]) => void;
}

interface SpatialChunk {
  bounds: Bounds;
  elementIds: string[];
}

// =============================================================================
// 🎨 Component
// =============================================================================

export function VirtualViewport({
  children,
  className,
  overscan = 100,
  chunkSize = 500,
  onVisibleElementsChange,
}: VirtualViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store
  const elementsRecord = useCanvasStore((state) => state.elements);
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);
  const viewport = useCanvasStore((state) => state.viewport);

  // Hooks
  const { getVisibleBounds, isElementVisible } = useViewport();

  // =============================================================================
  // 📊 Spatial Indexing
  // =============================================================================

  /**
   * Create spatial chunks for efficient lookups
   */
  const spatialIndex = useMemo(() => {
    const chunks: Map<string, SpatialChunk> = new Map();

    elements.forEach((element) => {
      // Calculate which chunks this element belongs to
      const startChunkX = Math.floor(element.x / chunkSize);
      const startChunkY = Math.floor(element.y / chunkSize);
      const endChunkX = Math.floor((element.x + element.width) / chunkSize);
      const endChunkY = Math.floor((element.y + element.height) / chunkSize);

      // Add element to all chunks it overlaps
      for (let cx = startChunkX; cx <= endChunkX; cx++) {
        for (let cy = startChunkY; cy <= endChunkY; cy++) {
          const key = `${cx},${cy}`;

          if (!chunks.has(key)) {
            chunks.set(key, {
              bounds: {
                x: cx * chunkSize,
                y: cy * chunkSize,
                width: chunkSize,
                height: chunkSize,
              },
              elementIds: [],
            });
          }

          chunks.get(key)!.elementIds.push(element.id);
        }
      }
    });

    return chunks;
  }, [elements, chunkSize]);

  // =============================================================================
  // 🔍 Visible Elements Calculation
  // =============================================================================

  /**
   * Get elements visible in current viewport
   */
  const visibleElements = useMemo(() => {
    const viewBounds = getVisibleBounds();

    // Expand bounds by overscan
    const expandedBounds: Bounds = {
      x: viewBounds.x - overscan,
      y: viewBounds.y - overscan,
      width: viewBounds.width + overscan * 2,
      height: viewBounds.height + overscan * 2,
    };

    // Find chunks that intersect with expanded bounds
    const startChunkX = Math.floor(expandedBounds.x / chunkSize);
    const startChunkY = Math.floor(expandedBounds.y / chunkSize);
    const endChunkX = Math.floor(
      (expandedBounds.x + expandedBounds.width) / chunkSize
    );
    const endChunkY = Math.floor(
      (expandedBounds.y + expandedBounds.height) / chunkSize
    );

    const visibleIds = new Set<string>();

    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        const chunk = spatialIndex.get(`${cx},${cy}`);
        if (chunk) {
          chunk.elementIds.forEach((id) => visibleIds.add(id));
        }
      }
    }

    // Filter to actual visible elements
    return elements.filter(
      (el) =>
        visibleIds.has(el.id) &&
        isElementVisible({
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
        })
    );
  }, [elements, spatialIndex, getVisibleBounds, isElementVisible, overscan, chunkSize]);

  // Notify parent of visible elements change
  useEffect(() => {
    onVisibleElementsChange?.(visibleElements);
  }, [visibleElements, onVisibleElementsChange]);

  // =============================================================================
  // 📐 Transform Style
  // =============================================================================

  const transformStyle = useMemo(
    () => ({
      transform: `translate(${-viewport.x * viewport.zoom}px, ${-viewport.y * viewport.zoom}px) scale(${viewport.zoom})`,
      transformOrigin: "0 0",
    }),
    [viewport]
  );

  // =============================================================================
  // 📊 Performance Stats
  // =============================================================================

  const stats = useMemo(
    () => ({
      totalElements: elements.length,
      visibleElements: visibleElements.length,
      chunksCount: spatialIndex.size,
      cullRatio:
        elements.length > 0
          ? ((elements.length - visibleElements.length) / elements.length) * 100
          : 0,
    }),
    [elements.length, visibleElements.length, spatialIndex.size]
  );

  // =============================================================================
  // 🎨 Render
  // =============================================================================

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden",
        className
      )}
    >
      {/* Transformed content layer */}
      <div
        className="absolute inset-0 will-change-transform"
        style={transformStyle}
      >
        {children}
      </div>

      {/* Debug overlay (development only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-2 right-2 p-2 bg-black/70 text-white text-xs rounded-lg font-mono space-y-0.5">
          <div>العناصر الكلية: {stats.totalElements}</div>
          <div>العناصر المرئية: {stats.visibleElements}</div>
          <div>نسبة الإخفاء: {stats.cullRatio.toFixed(1)}%</div>
          <div>القطع: {stats.chunksCount}</div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 🔧 Utility: Windowed List for Large Element Lists
// =============================================================================

export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={scrollRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 📤 Exports
// =============================================================================

export default VirtualViewport;
