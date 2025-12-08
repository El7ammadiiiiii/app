"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SettingGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingGroup({
  title,
  description,
  children,
  className,
}: SettingGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-right">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        {description && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}
