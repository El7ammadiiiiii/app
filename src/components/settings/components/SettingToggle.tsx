"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SettingToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  description?: string;
}

export function SettingToggle({
  checked,
  onCheckedChange,
  disabled = false,
  size = "md",
  label,
  description,
}: SettingToggleProps) {
  const sizes = {
    sm: { track: "w-8 h-4", thumb: "w-3 h-3", translate: "translate-x-4" },
    md: { track: "w-11 h-6", thumb: "w-5 h-5", translate: "translate-x-5" },
    lg: { track: "w-14 h-7", thumb: "w-6 h-6", translate: "translate-x-7" },
  };

  const { track, thumb, translate } = sizes[size];

  const toggle = (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        track,
        "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <motion.span
        className={cn(
          thumb,
          "pointer-events-none block rounded-full bg-white shadow-lg ring-0",
          "absolute top-0.5"
        )}
        initial={false}
        animate={{
          x: checked ? (size === "sm" ? 16 : size === "md" ? 20 : 28) : 2,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <div className="flex-1 text-right">
        <span className="font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {toggle}
    </div>
  );
}
