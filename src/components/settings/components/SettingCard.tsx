"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SettingCardProps
{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function SettingCard ( {
  icon,
  title,
  description,
  children,
  className,
  onClick,
  disabled = false,
}: SettingCardProps )
{
  const Wrapper = onClick ? motion.button : "div";

  return (
    <Wrapper
      onClick={ onClick }
      disabled={ disabled }
      className={ cn(
        "w-full flex items-center justify-between py-3 px-1 border-b border-white/6 last:border-0 gap-4",
        onClick && "cursor-pointer hover:bg-white/5 rounded-lg px-2 -mx-1 transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className
      ) }
    >
      {/* Control on the left (in RTL) or right (in LTR) */ }
      { children && <div className="shrink-0 order-first">{ children }</div> }

      {/* Label on the right (in RTL) or left (in LTR) */ }
      <div className="flex items-center gap-3 flex-1 min-w-0 text-right justify-end">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white/90 leading-relaxed">{ title }</h3>
          { description && (
            <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">
              { description }
            </p>
          ) }
        </div>
        { icon && (
          <span className="text-white/50 [&>svg]:!w-4 [&>svg]:!h-4 shrink-0">
            { icon }
          </span>
        ) }
      </div>
    </Wrapper>
  );
}
