"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "../store/settingsStore";

export function SaveIndicator() {
  const saveStatus = useSettingsStore((s) => s._saveStatus);

  const content = {
    idle: null,
    saving: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      text: "جاري الحفظ...",
      color: "text-muted-foreground",
    },
    saved: {
      icon: <Check className="w-4 h-4" />,
      text: "تم الحفظ",
      color: "text-primary",
    },
    error: {
      icon: <X className="w-4 h-4" />,
      text: "خطأ في الحفظ",
      color: "text-destructive",
    },
  };

  const current = content[saveStatus];

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed bottom-20 left-1/2 -translate-x-1/2 z-40",
            "bg-card border border-border rounded-full",
            "px-4 py-2 shadow-lg",
            "flex items-center gap-2"
          )}
        >
          <span className={current.color}>{current.icon}</span>
          <span className={cn("text-sm font-medium", current.color)}>
            {current.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
