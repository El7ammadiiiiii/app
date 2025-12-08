"use client";

import { motion } from "framer-motion";
import { PROJECT_EMOJIS } from "@/types/project";

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  size?: "sm" | "md" | "lg";
}

export function EmojiPicker({ selectedEmoji, onSelect, size = "md" }: EmojiPickerProps) {
  const sizeClasses = {
    sm: "text-lg p-1.5 w-8 h-8",
    md: "text-xl p-2 w-10 h-10",
    lg: "text-2xl p-2.5 w-12 h-12",
  };

  return (
    <div className="grid grid-cols-8 gap-1 p-2 max-h-48 overflow-y-auto">
      {PROJECT_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={`
            ${sizeClasses[size]}
            rounded-lg flex items-center justify-center
            transition-all duration-200
            ${selectedEmoji === emoji 
              ? "bg-accent ring-2 ring-accent-foreground/20 scale-110" 
              : "hover:bg-accent/50 hover:scale-105"
            }
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Emoji Display Component
// ═══════════════════════════════════════════════════════════════

interface EmojiDisplayProps {
  emoji: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function EmojiDisplay({ emoji, size = "md", className = "" }: EmojiDisplayProps) {
  const sizeClasses = {
    xs: "text-sm",
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl",
  };

  return (
    <span className={`${sizeClasses[size]} ${className}`} role="img">
      {emoji}
    </span>
  );
}
