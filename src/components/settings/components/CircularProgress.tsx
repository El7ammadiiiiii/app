"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

interface CircularProgressProps
{
  value: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
}

export function CircularProgress ( {
  value,
  size = 64,
  strokeWidth = 5,
  showValue = true,
  className,
}: CircularProgressProps )
{
  const radius = ( size - strokeWidth ) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ( value / 100 ) * circumference;

  const getColor = ( val: number ) =>
  {
    if ( val < 50 ) return "text-destructive";
    if ( val < 80 ) return "text-secondary";
    return "text-primary";
  };

  return (
    <div className={ cn( "relative inline-flex", className ) }>
      <svg width={ size } height={ size } className="transform -rotate-90">
        {/* Background circle */ }
        <circle
          cx={ size / 2 }
          cy={ size / 2 }
          r={ radius }
          fill="none"
          stroke="currentColor"
          strokeWidth={ strokeWidth }
          className="text-muted"
        />
        {/* Progress circle */ }
        <motion.circle
          cx={ size / 2 }
          cy={ size / 2 }
          r={ radius }
          fill="none"
          stroke="currentColor"
          strokeWidth={ strokeWidth }
          strokeLinecap="round"
          strokeDasharray={ circumference }
          initial={ { strokeDashoffset: circumference } }
          animate={ { strokeDashoffset: offset } }
          transition={ { duration: 1, ease: "easeOut" } }
          className={ cn( getColor( value ) ) }
        />
      </svg>
      { showValue && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={ { opacity: 0, scale: 0.5 } }
          animate={ { opacity: 1, scale: 1 } }
          transition={ { delay: 0.5, duration: 0.3 } }
        >
          <span className={ cn( "text-xs font-bold", getColor( value ) ) }>
            { Math.round( value ) }%
          </span>
        </motion.div>
      ) }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Profile Completion Card - LinkedIn/GitHub Style
// ═══════════════════════════════════════════════════════════════
interface CompletionItem
{
  id: string;
  label: string;
  completed: boolean;
  action?: () => void;
  priority?: "high" | "medium" | "low";
}

interface ProfileCompletionCardProps
{
  items: CompletionItem[];
  className?: string;
}

export function ProfileCompletionCard ( { items, className }: ProfileCompletionCardProps )
{
  const completedCount = items.filter( i => i.completed ).length;
  const totalCount = items.length;
  const percentage = Math.round( ( completedCount / totalCount ) * 100 );
  const incompleteItems = items.filter( i => !i.completed ).slice( 0, 3 );

  const getMessage = ( pct: number ) =>
  {
    if ( pct === 100 ) return "ملفك الشخصي مكتمل! 🎉";
    if ( pct >= 75 ) return "أنت قريب جداً من الإكمال!";
    if ( pct >= 50 ) return "ملفك جيد، لكن يمكن تحسينه";
    return "أكمل ملفك للحصول على تجربة أفضل";
  };

  return (
    <motion.div
      initial={ { opacity: 0, y: 10 } }
      animate={ { opacity: 1, y: 0 } }
      className={ cn(
        "bg-white/8 backdrop-blur-lg",
        "border border-white/10 rounded-xl p-3 sm:p-4",
        className
      ) }
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Progress Ring */ }
        <CircularProgress value={ percentage } size={ 56 } strokeWidth={ 4 } />

        {/* Info */ }
        <div className="flex-1 min-w-0 text-right">
          <h4 className="text-sm font-semibold text-white/90">اكتمال الملف الشخصي</h4>
          <p className="text-xs text-white/60 mt-0.5">{ getMessage( percentage ) }</p>
        </div>
      </div>

      {/* Suggestions */ }
      { incompleteItems.length > 0 && (
        <motion.div
          initial={ { opacity: 0, height: 0 } }
          animate={ { opacity: 1, height: "auto" } }
          className="mt-3 pt-3 border-t border-white/8 space-y-1.5"
        >
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
            اقتراحات للإكمال
          </p>
          { incompleteItems.map( ( item, index ) => (
            <motion.button
              key={ item.id }
              initial={ { opacity: 0, x: 10 } }
              animate={ { opacity: 1, x: 0 } }
              transition={ { delay: index * 0.1 } }
              onClick={ item.action }
              className={ cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-right",
                "bg-white/5 hover:bg-white/10 transition-colors text-xs",
                "group"
              ) }
            >
              <AlertCircle className="w-3.5 h-3.5 text-white/40 group-hover:text-teal-400 transition-colors" />
              <span className="flex-1 text-white/70 group-hover:text-white/90 transition-colors">
                { item.label }
              </span>
              { item.priority === "high" && (
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                  مهم
                </span>
              ) }
            </motion.button>
          ) ) }
        </motion.div>
      ) }

      {/* Completed Badge */ }
      { percentage === 100 && (
        <motion.div
          initial={ { opacity: 0, scale: 0.8 } }
          animate={ { opacity: 1, scale: 1 } }
          className="mt-3 flex items-center justify-center gap-2 text-teal-400"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-medium">جميع البيانات مكتملة</span>
        </motion.div>
      ) }
    </motion.div>
  );
}
