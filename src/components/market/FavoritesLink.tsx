"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

// ============================================
// FavoritesLink Component
// ============================================

interface FavoritesLinkProps {
  count: number;
  href?: string;
  className?: string;
}

export function FavoritesLink({ 
  count, 
  href = "/chat/trend-scanner/favorites",
  className = "" 
}: FavoritesLinkProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center gap-2
          px-4 py-2.5
          bg-gradient-to-r from-yellow-500/10 to-amber-500/10
          hover:from-yellow-500/20 hover:to-amber-500/20
          border border-yellow-500/30
          hover:border-yellow-500/50
          rounded-xl
          cursor-pointer
          transition-all duration-200
          ${className}
        `}
      >
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        <span className="text-sm font-medium text-yellow-400/90">
          المفضلة
        </span>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="
              min-w-[20px] h-5
              flex items-center justify-center
              px-1.5
              bg-yellow-500/20
              text-yellow-400
              text-xs font-bold
              rounded-full
            "
          >
            {count}
          </motion.span>
        )}
      </motion.div>
    </Link>
  );
}

// ============================================
// Compact Favorites Button (for mobile)
// ============================================

interface CompactFavoritesButtonProps {
  count: number;
  href?: string;
}

export function CompactFavoritesButton({ 
  count, 
  href = "/chat/trend-scanner/favorites" 
}: CompactFavoritesButtonProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="
          relative
          p-2.5
          bg-yellow-500/10
          hover:bg-yellow-500/20
          border border-yellow-500/30
          rounded-xl
          cursor-pointer
          transition-all duration-200
        "
      >
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="
              absolute -top-1.5 -right-1.5
              min-w-[18px] h-[18px]
              flex items-center justify-center
              px-1
              bg-yellow-500
              text-black
              text-[10px] font-bold
              rounded-full
            "
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </motion.div>
    </Link>
  );
}

export default FavoritesLink;
