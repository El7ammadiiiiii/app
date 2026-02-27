// ========================================
// OrderBookHeatmap — Main Canvas Component
// WebGL heatmap + Canvas 2D overlay + data polling + interaction
// ========================================
'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { HeatmapWebGLRenderer } from './WebGLRenderer';
import { AggregationMerger } from './AggregationMerger';
import { snapshotToTextureData, extractMetadata } from './PackedSnapshot';
import { useHeatmapStore } from './heatmapStore';
import { HeatmapColumn, VPVRLevel, MAX_FPS } from './types';
import { fastApiClient } from '@/lib/services/fastApiClient';

// Polling interval in ms (will be replaced by WebSocket later)
const POLL_INTERVAL = 1500;

export function OrderBookHeatmap() {
  // Refs
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HeatmapWebGLRenderer | null>(null);
  const mergerRef = useRef<AggregationMerger>(new AggregationMerger());
  const animFrameRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const columnIndexRef = useRef<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });

  // Mouse state
  const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, priceMin: 0, priceMax: 0 });

  // Store
  const {
    selectedExchanges,
    selectedSymbol,
    sensitivity,
    grouping,
    showVPVR,
    showTrades,
    columns,
    trades,
    vpvrLevels,
    priceMin,
    priceMax,
    autoFitPrice,
    addColumn,
    setConnected,
    setLoading,
    setError,
    setExchangeCount,
    setLatestMetadata,
    setResolvedGrouping,
    setVPVRLevels,
    setPriceRange,
    setFps,
    reset,
  } = useHeatmapStore();

  // ============ INITIALIZATION ============

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;

    const renderer = new HeatmapWebGLRenderer();
    const success = renderer.init(glCanvas);

    if (!success) {
      setError('WebGL2 غير مدعوم في هذا المتصفح');
      return;
    }

    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // ============ RESIZE OBSERVER ============

  useEffect(() => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    if (!container || !renderer) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.resize(width, height);

          // Also resize overlay canvas
          const overlay = overlayCanvasRef.current;
          if (overlay) {
            overlay.width = width;
            overlay.height = height;
            overlay.style.width = `${width}px`;
            overlay.style.height = `${height}px`;
          }
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ============ DATA POLLING ============

  const fetchOrderBook = useCallback(async () => {
    try {
      const exchangeParam = selectedExchanges.join(',');
      let data: { success: boolean; bids?: unknown[]; asks?: unknown[]; data?: unknown[]; error?: string };

      try {
        // PRIMARY: FastAPI orderbook
        data = await fastApiClient.getOrderbook(selectedSymbol, exchangeParam, 200) as typeof data;
      } catch {
        // FALLBACK: old Next.js API route
        const res = await fetch(
          `/api/orderbook-heatmap?symbol=${selectedSymbol}&exchanges=${exchangeParam}&limit=200`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }

      if (!data.success) {
        throw new Error(data.error || 'API error');
      }

      const merger = mergerRef.current;
      merger.setActiveExchanges(selectedExchanges);
      merger.setGrouping(grouping);

      // Process multi-exchange response
      if (Array.isArray(data.data)) {
        for (const book of data.data) {
          if (book.error || !book.bids || book.bids.length === 0) continue;
          merger.updateExchange(
            book.exchange || 'unknown',
            book.bids.map((b: { price: number; quantity: number }) => [b.price, b.quantity] as [number, number]),
            book.asks.map((a: { price: number; quantity: number }) => [a.price, a.quantity] as [number, number]),
            true
          );
        }
      }

      // Merge and create snapshot
      const snapshot = merger.mergeAll();
      if (!snapshot) return;

      const textureData = snapshotToTextureData(snapshot);
      const metadata = extractMetadata(snapshot, textureData);

      const colIndex = columnIndexRef.current++;
      const column: HeatmapColumn = {
        timestamp: Date.now(),
        textureOffset: colIndex,
        metadata,
        textureData: textureData.data,
      };

      // Upload to GPU
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.uploadColumn(colIndex, column);
        renderer.grouping = merger.resolvedGrouping;
        renderer.currentPrice = snapshot.basePrice;

        // Auto sensitivity based on data
        if (sensitivity.max <= 1) {
          useHeatmapStore.getState().setSensitivity({
            min: snapshot.minAmount * 0.1,
            max: snapshot.maxAmount * 0.5,
          });
        }
      }

      // Update store
      addColumn(column);
      setLatestMetadata(metadata);
      setResolvedGrouping(merger.resolvedGrouping);
      setExchangeCount(merger.activeCount);
      setConnected(true);
      setError(null);

      // Calculate VPVR from visible columns
      if (showVPVR) {
        calculateVPVR();
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      console.error('[OrderBookHeatmap] Fetch error:', msg);
    }
  }, [selectedExchanges, selectedSymbol, grouping, sensitivity, showVPVR]);

  // Start/stop polling
  useEffect(() => {
    setLoading(true);
    reset();
    columnIndexRef.current = 0;
    mergerRef.current = new AggregationMerger();

    // Initial fetch
    fetchOrderBook().then(() => setLoading(false));

    // Polling
    pollTimerRef.current = setInterval(fetchOrderBook, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [selectedExchanges, selectedSymbol, grouping]);

  // ============ VPVR CALCULATION ============

  const calculateVPVR = useCallback(() => {
    const cols = useHeatmapStore.getState().columns;
    if (cols.length === 0) return;

    const volumeMap = new Map<number, { bid: number; ask: number }>();
    const groupingVal = useHeatmapStore.getState().resolvedGrouping;

    for (const col of cols) {
      const data = col.textureData;
      for (let i = 0; i < data.length; i += 2) {
        const price = data[i];
        const amount = data[i + 1];
        if (Math.abs(amount) < 0.001) continue;

        // Round price to grouping
        const bucket = Math.floor(price / groupingVal) * groupingVal;
        const existing = volumeMap.get(bucket) || { bid: 0, ask: 0 };

        if (amount < 0) {
          existing.bid += Math.abs(amount);
        } else {
          existing.ask += amount;
        }
        volumeMap.set(bucket, existing);
      }
    }

    const levels: VPVRLevel[] = Array.from(volumeMap.entries())
      .map(([price, vol]) => ({
        price,
        bidVolume: vol.bid,
        askVolume: vol.ask,
        totalVolume: vol.bid + vol.ask,
      }))
      .sort((a, b) => a.price - b.price);

    setVPVRLevels(levels);
  }, []);

  // ============ RENDER LOOP ============

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    let running = true;
    const frameInterval = 1000 / MAX_FPS;

    const render = (time: number) => {
      if (!running) return;

      // FPS counter
      fpsCounterRef.current.frames++;
      if (time - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = time;
      }

      // Update renderer state from store
      const state = useHeatmapStore.getState();
      renderer.sensitivity = state.sensitivity;
      renderer.viewport = {
        priceMin: state.priceMin,
        priceMax: state.priceMax,
        timeMin: 0,
        timeMax: 1,
      };

      // Draw WebGL heatmap
      renderer.draw(state.columns, state.trades, state.vpvrLevels, state.showVPVR, state.showTrades);

      // Draw 2D overlays
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        const ctx = overlayCanvas.getContext('2d');
        if (ctx) {
          renderer.drawOverlays(
            ctx,
            state.columns,
            state.trades,
            state.vpvrLevels,
            state.showVPVR,
            state.showTrades,
            mousePos.x,
            mousePos.y,
            isHovering
          );
        }
      }

      renderer.markRedrawn();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mousePos, isHovering]);

  // ============ MOUSE INTERACTION ============

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Drag to pan price
    if (isDragging) {
      const deltaY = e.clientY - dragStartRef.current.y;
      const priceRange = dragStartRef.current.priceMax - dragStartRef.current.priceMin;
      const priceDelta = (deltaY / rect.height) * priceRange;

      setPriceRange(
        dragStartRef.current.priceMin + priceDelta,
        dragStartRef.current.priceMax + priceDelta
      );
      useHeatmapStore.getState().setAutoFitPrice(false);
    }
  }, [isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      priceMin: useHeatmapStore.getState().priceMin,
      priceMax: useHeatmapStore.getState().priceMax,
    };
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setIsDragging(false);
  }, []);

  // Zoom (scroll wheel)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const state = useHeatmapStore.getState();
    const range = state.priceMax - state.priceMin;
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    // Zoom centered on mouse position
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseYNorm = (e.clientY - rect.top) / rect.height;
    const priceAtMouse = state.priceMax - mouseYNorm * range;

    const newRange = range * zoomFactor;
    const newMin = priceAtMouse - mouseYNorm * newRange;
    const newMax = priceAtMouse + (1 - mouseYNorm) * newRange;

    setPriceRange(newMin, newMax);
    state.setAutoFitPrice(false);
  }, []);

  // Double-click to reset zoom
  const handleDoubleClick = useCallback(() => {
    useHeatmapStore.getState().setAutoFitPrice(true);
  }, []);

  // ============ RENDER ============

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] bg-[#141f1f] rounded-lg overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: isDragging ? 'grabbing' : isHovering ? 'crosshair' : 'default' }}
    >
      {/* WebGL Canvas (heatmap rendering) */}
      <canvas
        ref={glCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Canvas 2D Overlay (axes, labels, crosshair, VPVR, trades) */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Loading State */}
      {useHeatmapStore.getState().isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white/60 text-sm">جاري التحميل...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {useHeatmapStore.getState().error && (
        <div className="absolute top-2 left-2 right-2 bg-red-500/20 border border-red-500/30 rounded px-3 py-2 text-red-400 text-xs z-10">
          {useHeatmapStore.getState().error}
        </div>
      )}
    </div>
  );
}
