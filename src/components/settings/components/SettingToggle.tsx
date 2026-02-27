"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingToggleProps
{
  checked: boolean;
  onCheckedChange: ( checked: boolean ) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  description?: string;
}

export function SettingToggle ( {
  checked,
  onCheckedChange,
  disabled = false,
  size = "md",
  label,
  description,
}: SettingToggleProps )
{
  const sizes = {
    sm: { track: "w-8 h-[18px]", thumb: "w-3.5 h-3.5", translate: 14 },
    md: { track: "w-[42px] h-[24px]", thumb: "w-[18px] h-[18px]", translate: 18 },
    lg: { track: "w-12 h-7", thumb: "w-5 h-5", translate: 22 },
  };

  const { track, thumb } = sizes[ size ];

  const toggle = (
    <button
      role="switch"
      aria-checked={ checked }
      disabled={ disabled }
      onClick={ () => onCheckedChange( !checked ) }
      className={ cn(
        track,
        "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 items-center",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1",
        checked ? "bg-teal-500" : "bg-white/20",
        disabled && "opacity-50 cursor-not-allowed"
      ) }
    >
      <motion.span
        className={ cn(
          thumb,
          "pointer-events-none flex items-center justify-center rounded-full bg-white shadow-sm ring-0",
          "absolute left-0.5"
        ) }
        initial={ false }
        animate={ {
          x: checked ? sizes[ size ].translate : 0,
        } }
        transition={ { type: "spring", stiffness: 500, damping: 30 } }
      >
        { checked && (
          <Check className="w-2.5 h-2.5 text-teal-600 stroke-[3]" />
        ) }
      </motion.span>
    </button>
  );

  if ( !label ) return toggle;

  return (
    <div className="flex items-center justify-between gap-5 w-full">
      { toggle }
      <div className="flex-1 text-right">
        <span className="text-sm font-medium text-white/90 leading-relaxed">{ label }</span>
        { description && (
          <p className="text-xs text-white/50 mt-1 leading-relaxed">{ description }</p>
        ) }
      </div>
    </div>
  );
}
