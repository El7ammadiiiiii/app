"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsRowType = "dropdown" | "switch" | "action" | "navigation" | "custom";

export interface SettingsRowProps {
  type?: SettingsRowType;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Render the control (toggle/select/button/etc) */
  control?: React.ReactNode;
  /** When provided, the whole row becomes clickable */
  onClick?: () => void;
  disabled?: boolean;
  /** Optional trailing element (e.g., chevron) */
  trailing?: React.ReactNode;
  className?: string;
}

export function SettingsRow({
  title,
  description,
  icon,
  control,
  onClick,
  disabled = false,
  trailing,
  className,
}: SettingsRowProps) {
  const clickable = Boolean(onClick) && !disabled;

  const Root: any = clickable ? "button" : "div";

  return (
    <Root
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      disabled={clickable ? disabled : undefined}
      className={cn(
        "settings-row",
        clickable && "settings-row--clickable",
        disabled && "settings-row--disabled",
        className
      )}
    >
      {/* Control slot (edge-opposite to text via logical margin) */}
      {(control || trailing) && (
        <div className="settings-row__control flex items-center gap-2">
          {control}
          {trailing}
        </div>
      )}

      {/* Text + icon */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="settings-row__text text-right">
          <div className="settings-row__title">{title}</div>
          {description ? <div className="settings-row__desc">{description}</div> : null}
        </div>

        {icon ? (
          <span className="settings-row__icon">{icon}</span>
        ) : null}
      </div>
    </Root>
  );
}

export function SettingsNavigationChevron() {
  return <ChevronLeft className="settings-row__icon settings-row__icon--mirror" />;
}
