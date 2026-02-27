"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.2 — SlideViewer Renderer
 * ═══════════════════════════════════════════════════════════════
 * Renders SLIDES canvas type. Content split by `---` separator.
 * Navigation buttons + keyboard arrows + slide counter.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SlideViewer() {
  const { versions, currentVersionIndex, isStreaming } = useCanvasStore();
  const content = versions[currentVersionIndex]?.content || "";
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Parse slides by `---` separator (horizontal rule)
  const slides = useMemo(() => {
    if (!content.trim()) return [""];
    return content
      .split(/\n---\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [content]);

  // Clamp current slide
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlide]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const slideContent = slides[currentSlide] || "";

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        isFullscreen && "fixed inset-0 z-50 bg-[#0a0a1a]"
      )}
      role="region"
      aria-label="عرض الشرائح"
      aria-roledescription="slideshow"
    >
      {/* Slide content area */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-8 overflow-auto">
        <div
          className={cn(
            "w-full max-w-3xl mx-auto",
            "bg-white/[0.03] border border-white/[0.08] rounded-2xl",
            "p-10 min-h-[320px] flex flex-col justify-center",
            "prose prose-invert prose-lg max-w-none",
            "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-teal-400 [&_h1]:mb-6",
            "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white/90",
            "[&_ul]:space-y-2 [&_li]:text-white/70",
            "[&_p]:text-white/70 [&_p]:leading-relaxed",
            isStreaming && "border-teal-500/30 shadow-lg shadow-teal-500/5"
          )}
          role="group"
          aria-roledescription="slide"
          aria-label={`شريحة ${currentSlide + 1} من ${slides.length}`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{slideContent}</ReactMarkdown>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06] bg-white/[0.02]">
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="p-2 hover:bg-white/[0.08] rounded-lg disabled:opacity-30 transition-colors"
          aria-label="الشريحة السابقة"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Slide dots */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="الشرائح">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  i === currentSlide
                    ? "bg-teal-400 w-6"
                    : "bg-white/20 hover:bg-white/40"
                )}
                role="tab"
                aria-selected={i === currentSlide}
                aria-label={`شريحة ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-xs text-white/40 font-mono">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label={isFullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={goNext}
            disabled={currentSlide === slides.length - 1}
            className="p-2 hover:bg-white/[0.08] rounded-lg disabled:opacity-30 transition-colors"
            aria-label="الشريحة التالية"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
