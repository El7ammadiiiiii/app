import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors";
  const variants: Record<string, string> = {
    default: "bg-foreground text-background",
    secondary: "bg-muted text-foreground border border-border/60",
    outline: "border border-border text-foreground",
  };

  return <span className={cn(base, variants[variant], className)} {...props} />;
}
