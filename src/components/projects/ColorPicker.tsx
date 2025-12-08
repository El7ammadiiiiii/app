"use client";

import { motion } from "framer-motion";
import { PROJECT_COLORS, type ProjectColor } from "@/types/project";
import { Check } from "lucide-react";

interface ColorPickerProps {
  selectedColor: ProjectColor;
  onSelect: (color: ProjectColor) => void;
  size?: "sm" | "md" | "lg";
}

export function ColorPicker({ selectedColor, onSelect, size = "md" }: ColorPickerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const checkSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  };

  const colors = Object.entries(PROJECT_COLORS) as [ProjectColor, { bg: string; text: string; border: string }][];

  return (
    <div className="grid grid-cols-6 gap-2 p-2">
      {colors.map(([colorName, colorClasses]) => (
        <motion.button
          key={colorName}
          type="button"
          onClick={() => onSelect(colorName)}
          className={`
            ${sizeClasses[size]}
            rounded-full ${colorClasses.bg}
            flex items-center justify-center
            transition-all duration-200
            ${selectedColor === colorName 
              ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/30 scale-110" 
              : "hover:scale-110"
            }
          `}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          title={colorName}
        >
          {selectedColor === colorName && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-white drop-shadow-md"
            >
              <Check size={checkSizes[size]} strokeWidth={3} />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Color Badge Component
// ═══════════════════════════════════════════════════════════════

interface ColorBadgeProps {
  color: ProjectColor;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function ColorBadge({ color, size = "md", className = "", children }: ColorBadgeProps) {
  const colorClasses = PROJECT_COLORS[color];
  
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <span 
      className={`
        ${sizeClasses[size]} 
        ${colorClasses.bg} 
        rounded-full inline-flex items-center justify-center
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Color Strip Component (for cards)
// ═══════════════════════════════════════════════════════════════

interface ColorStripProps {
  color: ProjectColor;
  position?: "top" | "left" | "right" | "bottom";
  thickness?: number;
}

export function ColorStrip({ color, position = "right", thickness = 4 }: ColorStripProps) {
  const colorClasses = PROJECT_COLORS[color];
  
  const positionClasses = {
    top: `h-[${thickness}px] w-full top-0 left-0 right-0`,
    bottom: `h-[${thickness}px] w-full bottom-0 left-0 right-0`,
    left: `w-[${thickness}px] h-full top-0 bottom-0 left-0`,
    right: `w-[${thickness}px] h-full top-0 bottom-0 right-0`,
  };

  return (
    <div 
      className={`absolute ${colorClasses.bg} ${positionClasses[position]} rounded-full`}
      style={{
        [position === "top" || position === "bottom" ? "height" : "width"]: `${thickness}px`,
      }}
    />
  );
}
