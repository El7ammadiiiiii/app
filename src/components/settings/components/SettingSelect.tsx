"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SettingSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function SettingSelect({
  value,
  onValueChange,
  options,
  placeholder = "اختر...",
  disabled = false,
  label,
  description,
  className,
}: SettingSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-2 text-right">
          <span className="font-medium text-foreground">{label}</span>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      
      <div ref={selectRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2.5",
            "bg-card border border-border rounded-lg text-right",
            "hover:border-primary/30 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "border-primary/50"
          )}
        >
          <div className="flex items-center gap-2 flex-1">
            {selectedOption?.icon}
            <span className={cn(
              selectedOption ? "text-foreground" : "text-muted-foreground"
            )}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-50 w-full mt-1",
                "bg-card border border-border rounded-lg shadow-lg",
                "max-h-60 overflow-auto"
              )}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5",
                    "text-right hover:bg-muted/50 transition-colors",
                    option.value === value && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {option.icon}
                    <div>
                      <span className="block">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
