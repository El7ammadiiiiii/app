"use client";

import { motion } from "framer-motion";
import { PROJECT_COLORS, type ProjectColor } from "@/types/project";
import { Check } from "lucide-react";

interface ColorPickerProps
{
  selectedColor: ProjectColor;
  onSelect: ( color: ProjectColor ) => void;
  size?: "sm" | "md" | "lg";
}

export function ColorPicker ( { selectedColor, onSelect, size = "md" }: ColorPickerProps )
{
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const checkSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  const colors = Object.entries( PROJECT_COLORS ) as [ ProjectColor, { bg: string; text: string; border: string } ][];

  return (
    <div className="flex flex-wrap gap-2">
      { colors.map( ( [ colorName, colorClasses ] ) => (
        <motion.button
          key={ colorName }
          type="button"
          onClick={ () => onSelect( colorName ) }
          className={ `
            ${ sizeClasses[ size ] }
            rounded-full ${ colorClasses.bg }
            flex items-center justify-center
            transition-all duration-200
            ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900
            ${ selectedColor === colorName
              ? "ring-gray-400 dark:ring-zinc-500 scale-110"
              : "ring-transparent hover:ring-gray-300 dark:hover:ring-zinc-600"
            }
          `}
          whileHover={ { scale: 1.1 } }
          whileTap={ { scale: 0.9 } }
          title={ colorName }
        >
          { selectedColor === colorName && (
            <motion.div
              initial={ { scale: 0 } }
              animate={ { scale: 1 } }
              className="text-white drop-shadow-sm"
            >
              <Check size={ checkSizes[ size ] } strokeWidth={ 3 } />
            </motion.div>
          ) }
        </motion.button>
      ) ) }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Color Badge Component
// ═══════════════════════════════════════════════════════════════

interface ColorBadgeProps
{
  color: ProjectColor;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function ColorBadge ( { color, size = "md", className = "", children }: ColorBadgeProps )
{
  const colorClasses = PROJECT_COLORS[ color ];

  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <span
      className={ `
        ${ sizeClasses[ size ] } 
        ${ colorClasses.bg } 
        rounded-full inline-flex items-center justify-center
        ${ className }
      `}
    >
      { children }
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Color Strip Component (for cards)
// ═══════════════════════════════════════════════════════════════

interface ColorStripProps
{
  color: ProjectColor;
  position?: "top" | "left" | "right" | "bottom";
  thickness?: number;
}

export function ColorStrip ( { color, position = "right", thickness = 4 }: ColorStripProps )
{
  const colorClasses = PROJECT_COLORS[ color ];

  const thicknessToken = String( thickness ).replace( /[^a-z0-9_-]/gi, "_" );
  const thicknessClass = `color-strip-${ position }-${ thicknessToken }`;
  const thicknessStyle = `.${ thicknessClass }{${ position === "top" || position === "bottom" ? "height" : "width"
    }:${ thickness }px;}`;

  const positionClasses = {
    top: "w-full top-0 left-0 right-0",
    bottom: "w-full bottom-0 left-0 right-0",
    left: "h-full top-0 bottom-0 left-0",
    right: "h-full top-0 bottom-0 right-0",
  };

  return (
    <>
      <style>{ thicknessStyle }</style>
      <div
        className={ `absolute ${ colorClasses.bg } ${ positionClasses[ position ] } ${ thicknessClass } rounded-full` }
      />
    </>
  );
}
