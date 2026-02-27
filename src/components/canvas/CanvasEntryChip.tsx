"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CanvasType, CANVAS_TYPE_META } from "@/store/canvasStore";
import { getCanvasIcon } from "./canvasIcons";

interface CanvasEntryChipProps
{
  artifactId: string;
  title: string;
  type: CanvasType;
  createdAt: number;
  onOpen: ( artifactId: string ) => void;
}

/**
 * Gemini-style entry chip that appears inside the chat after closing a canvas artifact.
 * Shows the artifact name, creation date, and an "فتح" (Open) button to reopen it.
 * Supports all 12+ canvas types with unique icons and accent colors.
 */
export const CanvasEntryChip = memo( function CanvasEntryChip ( {
  artifactId,
  title,
  type,
  createdAt,
  onOpen,
}: CanvasEntryChipProps )
{
  const formattedDate = new Intl.DateTimeFormat( "ar", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  } ).format( new Date( createdAt ) );

  const meta = CANVAS_TYPE_META[ type ] || CANVAS_TYPE_META.CODE;
  const Icon = getCanvasIcon( type );

  return (
    <motion.div
      initial={ { opacity: 0, y: 8 } }
      animate={ { opacity: 1, y: 0 } }
      transition={ { duration: 0.25, ease: "easeOut" } }
      className={ cn(
        "flex items-center gap-3 px-4 py-3 mt-2 mb-1",
        "rounded-2xl border border-white/[0.08]",
        "bg-white/[0.04] hover:bg-white/[0.07]",
        "transition-colors duration-150 select-none",
        "max-w-sm w-full backdrop-blur-sm"
      ) }
    >
      {/* Icon */}
      <div className={ cn( "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", meta.bgClass ) }>
        <Icon className="w-5 h-5" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/90 truncate">
          { title }
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/[0.06]" style={ { color: meta.color } }>
            { meta.label }
          </span>
          <span className="text-[11px] text-white/40">
            { formattedDate }
          </span>
        </div>
      </div>

      {/* Open button */}
      <motion.button
        type="button"
        whileTap={ { scale: 0.95 } }
        onClick={ () => onOpen( artifactId ) }
        className={ cn(
          "px-4 py-1.5 rounded-xl text-sm font-semibold",
          "bg-gradient-to-r from-teal-600 to-teal-700",
          "text-white shadow-lg shadow-teal-900/30",
          "hover:from-teal-500 hover:to-teal-600",
          "transition-all duration-150 shrink-0"
        ) }
      >
        فتح
      </motion.button>
    </motion.div>
  );
} );
