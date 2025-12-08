"use client";

import * as React from "react";
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
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(true), 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  const getIcon = () => {
    switch (variant) {
      case "info": return <Info className="w-3.5 h-3.5" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "info": return "bg-info/90 text-info-foreground border-info/20";
      case "warning": return "bg-warning/90 text-warning-foreground border-warning/20";
      default: return "bg-popover text-popover-foreground border-border";
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

  const getArrowStyles = () => {
    switch (side) {
      case "top": return "top-full left-1/2 -translate-x-1/2 border-t-popover border-x-transparent border-b-transparent";
      case "bottom": return "bottom-full left-1/2 -translate-x-1/2 border-b-popover border-x-transparent border-t-transparent";
      case "left": return "left-full top-1/2 -translate-y-1/2 border-l-popover border-y-transparent border-r-transparent";
      case "right": return "right-full top-1/2 -translate-y-1/2 border-r-popover border-y-transparent border-l-transparent";
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
          className={cn(
            "p-0.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {getIcon()}
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
              "border shadow-lg",
              "whitespace-nowrap max-w-[200px] text-center",
              getVariantStyles(),
              getPositionStyles()
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                "absolute w-0 h-0 border-4",
                getArrowStyles()
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
