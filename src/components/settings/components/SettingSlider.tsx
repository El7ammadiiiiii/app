"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SettingSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  description?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function SettingSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  label,
  description,
  showValue = true,
  valueFormatter = (v) => String(v),
  className,
}: SettingSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          <div className="text-right flex-1">
            {label && (
              <span className="font-medium text-foreground">{label}</span>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {showValue && (
            <span className="text-sm font-medium text-primary mr-3">
              {valueFormatter(value)}
            </span>
          )}
        </div>
      )}
      
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          disabled={disabled}
          className={cn(
            "absolute w-full h-6 opacity-0 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
        />
        
        <motion.div
          className={cn(
            "absolute w-5 h-5 bg-primary rounded-full shadow-md",
            "pointer-events-none",
            "border-2 border-white dark:border-card"
          )}
          initial={false}
          animate={{ left: `calc(${percentage}% - 10px)` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}
