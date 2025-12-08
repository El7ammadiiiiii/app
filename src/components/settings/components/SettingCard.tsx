"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SettingCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function SettingCard({
  icon,
  title,
  description,
  children,
  className,
  onClick,
  disabled = false,
}: SettingCardProps) {
  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full bg-card border border-border rounded-lg p-2.5 sm:p-3 text-right",
        "hover:border-primary/30 transition-all duration-200",
        "flex items-center justify-between gap-2.5 sm:gap-3",
        onClick && "cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      whileHover={onClick && !disabled ? { scale: 1.005 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.995 } : undefined}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
        {icon && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">{icon}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 text-right">
          <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </Wrapper>
  );
}
