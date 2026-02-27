"use client";

import { useCanvasStore } from '@/store/canvasStore';
import { CanvasPanel } from '@/components/canvas/CanvasPanel';
import { CanvasErrorBoundary } from '@/components/canvas/CanvasErrorBoundary';
import { CanvasInlineEditToolbar } from '@/components/canvas/CanvasInlineEditToolbar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useResizable } from '@/hooks/useResizable';
import { ReactNode, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CanvasLayoutProps {
  children: ReactNode;
}

/**
 * CSS Grid layout (Gemini pattern) — with functional drag-to-resize.
 * Desktop: dynamic ratio via useResizable hook, persisted to localStorage.
 * Mobile (<960px): canvas goes fullscreen, chat hidden.
 * Animation: canvas scales from 0.6→1 over 500ms with Gemini's cubic-bezier.
 */
export function CanvasLayout({ children }: CanvasLayoutProps) {
  const isOpen = useCanvasStore(s => s.isOpen);
  const activeArtifactId = useCanvasStore(s => s.activeArtifactId);
  const [isMounted, setIsMounted] = useState(false);
  const { width } = useMediaQuery();
  const { containerRef, startResize, resetSize, gridTemplate } = useResizable();

  // C.3: Track closing state for exit animation
  const [isClosing, setIsClosing] = useState(false);
  const prevOpen = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // C.3: Detect close transition
  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      setIsClosing(true);
      const timer = setTimeout(() => setIsClosing(false), 400);
      return () => clearTimeout(timer);
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  if (!isMounted) return <>{children}</>;

  const canvasActive = (isOpen || isClosing) && !!activeArtifactId;
  const isMobileCanvas = width < 960;

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full canvas-grid-layout",
        canvasActive && !isMobileCanvas && "canvas-grid-layout--active",
        canvasActive && isMobileCanvas && "canvas-grid-layout--mobile",
      )}
      style={canvasActive && !isMobileCanvas ? { gridTemplateColumns: gridTemplate } : undefined}
    >
      {/* Chat Area */}
      <div className={cn(
        "h-full min-w-0 overflow-hidden",
        canvasActive && isMobileCanvas && "hidden"
      )}>
        {children}
      </div>

      {/* Separator — desktop only, with drag-to-resize */}
      {canvasActive && !isMobileCanvas && (
        <div
          className="canvas-separator cursor-col-resize"
          onMouseDown={startResize}
          onTouchStart={startResize}
          onDoubleClick={resetSize}
          title="اسحب لتغيير الحجم — انقر مرتين للاستعادة"
        />
      )}

      {/* Canvas Panel */}
      {canvasActive && (
        <div className={cn(
          "h-full min-w-0 overflow-hidden",
          isOpen && !isClosing && "canvas-panel-enter",
          isClosing && "canvas-panel-exit"
        )}>
          <CanvasErrorBoundary>
            <CanvasPanel />
          </CanvasErrorBoundary>
        </div>
      )}

      {/* Inline Edit Toolbar — floating, renders above editors */}
      <CanvasInlineEditToolbar />
    </div>
  );
}
