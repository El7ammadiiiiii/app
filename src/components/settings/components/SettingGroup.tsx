"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SettingGroupProps
{
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingGroup ( {
  title,
  description,
  children,
  className,
}: SettingGroupProps )
{
  return (
    <div className={ cn( "mb-6 last:mb-0", className ) }>
      <div className="text-right mb-3 px-1">
        <h3 className="text-sm font-semibold text-white/85">
          { title }
        </h3>
        { description && (
          <p className="text-xs text-white/50 mt-1 leading-relaxed">{ description }</p>
        ) }
      </div>
      <div className="flex flex-col gap-0.5">
        { children }
      </div>
    </div>
  );
}
