"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsHeaderProps {
  title: string;
  description?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose?: () => void;
  showSearch?: boolean;
}

export function SettingsHeader({
  title,
  description,
  searchQuery,
  onSearchChange,
  onClose,
  showSearch = true,
}: SettingsHeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 p-3 border-b border-[var(--glass-border)] sticky top-0 z-10 bg-[var(--glass-bg)] backdrop-blur-xl"
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {showSearch && (
          <motion.div 
            className="relative"
            animate={{ width: isSearchFocused ? 200 : 140 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="بحث..."
              className={cn(
                "w-full pr-8 pl-8 py-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg",
                "text-xs text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "transition-all duration-200"
              )}
            />
            {/* Keyboard shortcut hint */}
            <AnimatePresence>
              {!searchQuery && !isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
                >
                  <kbd className="text-[9px] bg-muted px-1 py-0.5 rounded text-muted-foreground font-mono">
                    ⌘K
                  </kbd>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Clear button */}
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => onSearchChange("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {onClose && (
          <motion.button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
