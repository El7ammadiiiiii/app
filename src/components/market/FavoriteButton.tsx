"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

// ============================================
// FavoriteButton Component
// ============================================

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({ 
  isFavorite, 
  onToggle, 
  size = "md",
  className = "" 
}: FavoriteButtonProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const buttonSizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation(); // Prevent row click
        onToggle();
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      className={`
        ${buttonSizeClasses[size]}
        rounded-lg
        transition-all duration-200
        hover:bg-yellow-500/10
        focus:outline-none focus:ring-2 focus:ring-yellow-500/30
        ${className}
      `}
      title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      <Star
        className={`
          ${sizeClasses[size]}
          transition-all duration-200
          ${isFavorite 
            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]" 
            : "text-muted-foreground/40 hover:text-yellow-400/70"
          }
        `}
      />
    </motion.button>
  );
}

// ============================================
// Inline Favorite Star (for table rows)
// ============================================

interface InlineFavoriteStarProps {
  isFavorite: boolean;
  onToggle: () => void;
}

export function InlineFavoriteStar({ isFavorite, onToggle }: InlineFavoriteStarProps) {
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.85 }}
      className="p-1 -ml-1 mr-1 rounded transition-colors hover:bg-yellow-500/10"
      title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      <Star
        className={`
          w-4 h-4
          transition-all duration-200
          ${isFavorite 
            ? "fill-yellow-400 text-yellow-400" 
            : "text-muted-foreground/30 hover:text-yellow-400/60"
          }
        `}
      />
    </motion.button>
  );
}

export default FavoriteButton;
