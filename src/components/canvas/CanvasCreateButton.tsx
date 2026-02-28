"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 8.0 — Canvas Toggle Button (Smart Single Toggle)
 * ═══════════════════════════════════════════════════════════════
 * Single toggle that opens/closes Canvas panel.
 * AI models auto-detect Canvas type via Function Calling —
 * no dropdown needed. This button just toggles visibility.
 */

import { motion } from "framer-motion";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";

export function CanvasCreateButton() {
  const isOpen = useCanvasStore((s) => s.isOpen);
  const closeCanvas = useCanvasStore((s) => s.closeCanvas);
  const openCanvas = useCanvasStore((s) => s.openCanvas);
  const activeArtifactId = useCanvasStore((s) => s.activeArtifactId);
  const artifacts = useCanvasStore((s) => s.artifacts);
  const lastArtifact = artifacts.length > 0 ? artifacts[artifacts.length - 1] : null;

  const handleToggle = () => {
    if (isOpen) {
      closeCanvas();
    } else if (lastArtifact) {
      // Re-open the last artifact
      openCanvas({
        id: lastArtifact.id,
        title: lastArtifact.title,
        type: lastArtifact.type,
        language: lastArtifact.language,
        initialContent: lastArtifact.content,
      });
    }
    // If no artifact exists, Canvas will be opened automatically by AI via FC
  };

  const hasArtifact = !!lastArtifact;

  return (
    <motion.button
      onClick={handleToggle}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium",
        "border transition-all duration-200",
        isOpen
          ? "bg-teal-500/20 text-teal-300 border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
          : hasArtifact
            ? "bg-white/[0.06] text-white/70 border-white/[0.12] hover:bg-teal-500/10 hover:text-teal-300 hover:border-teal-500/20"
            : "bg-white/[0.04] text-white/40 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60"
      )}
      aria-label={isOpen ? "إغلاق Canvas" : "فتح Canvas"}
      title={isOpen ? "إغلاق Canvas" : hasArtifact ? "فتح Canvas" : "Canvas — يفتح تلقائياً بالذكاء الاصطناعي"}
    >
      {isOpen ? (
        <PanelRightClose className="w-3.5 h-3.5" />
      ) : (
        <PanelRightOpen className="w-3.5 h-3.5" />
      )}
      <span>Canvas</span>
      {hasArtifact && !isOpen && (
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
      )}
    </motion.button>
  );
}
