"use client";

import * as React from "react";
import useTimeout from '@/hooks/useTimeout';
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// Tooltip Component - Stripe/GitHub Style
// ═══════════════════════════════════════════════════════════════
interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  variant?: "default" | "info" | "warning";
  showIcon?: boolean;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  variant = "default",
  showIcon = true,
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => {
    setHovering(false);
    setIsOpen(false);
  };

  // Open tooltip after a short hover delay; useTimeout cleans up automatically
  useTimeout(() => setIsOpen(true), hovering ? 200 : undefined, [hovering]);

  const getIcon = () => {
    switch (variant) {
      case "info": return <Info className="w-3.5 h-3.5" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "info":
        return "bg-info/90 text-info-foreground border border-info/20 shadow-lg";
      case "warning":
        return "bg-warning/90 text-warning-foreground border border-warning/20 shadow-lg";
      default:
        return "overlay-popover";
    }
  };

  const getPositionStyles = () => {
    switch (side) {
      case "top": return "bottom-full left-1/2 -translate-x-1/2 mb-2";
      case "bottom": return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left": return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right": return "left-full top-1/2 -translate-y-1/2 ml-2";
    }
  };

  const getArrowPositionStyles = () => {
    switch (side) {
      case "top":
        return "top-full left-1/2 -translate-x-1/2 -mt-1";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 -mb-1";
      case "left":
        return "left-full top-1/2 -translate-y-1/2 -ml-1";
      case "right":
        return "right-full top-1/2 -translate-y-1/2 -mr-1";
    }
  };

  const getArrowVariantStyles = () => {
    switch (variant) {
      case "info":
        return "bg-info/90 border-info/20";
      case "warning":
        return "bg-warning/90 border-warning/20";
      default:
        return "bg-[var(--overlay-bg)] border-[var(--overlay-border)]";
    }
  };

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children || (
        <button
          type="button"
          aria-label={content}
          className={cn(
            "p-0.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {showIcon ? getIcon() : <span className="sr-only">{content}</span>}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: side === "top" ? 4 : side === "bottom" ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 px-2.5 py-1.5 rounded-md text-xs",
              "whitespace-nowrap max-w-[200px] text-center",
              getVariantStyles(),
              getPositionStyles()
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                "absolute w-2.5 h-2.5 rotate-45 border",
                getArrowPositionStyles(),
                getArrowVariantStyles()
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Help Icon with Tooltip - Inline Helper
// ═══════════════════════════════════════════════════════════════
interface HelpIconProps {
  text: string;
  variant?: "default" | "info" | "warning";
  className?: string;
}

export function HelpIcon({ text, variant = "default", className }: HelpIconProps) {
  return (
    <Tooltip content={text} variant={variant} className={className} />
  );
}
