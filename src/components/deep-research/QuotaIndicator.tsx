/**
 * 💰 Quota Indicator Component
 * عرض الرصيد المتبقي من عمليات البحث
 */

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Clock, 
  Crown,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserQuota } from '@/types/deepResearch';

// =============================================================================
// 🎯 Types
// =============================================================================

interface QuotaIndicatorProps {
  quota: UserQuota | null;
  remainingSearches: number;
  timeUntilReset: string;
  onUpgrade?: () => void;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// 🎯 Main Component
// =============================================================================

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  quota,
  remainingSearches,
  timeUntilReset,
  onUpgrade,
  compact = false,
  className,
}) => {
  const isPremium = quota?.isPremium ?? false;
  const isExhausted = remainingSearches <= 0;
  const isLow = remainingSearches === 1;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isExhausted 
          ? "bg-red-500/10 text-red-500"
          : isLow
            ? "bg-amber-500/10 text-amber-500"
            : "bg-primary/10 text-primary",
        className
      )}>
        <Sparkles className="w-3 h-3" />
        <span>{remainingSearches} متبقي</span>
        {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border",
        isExhausted 
          ? "bg-red-500/5 border-red-500/20"
          : "bg-muted/30 border-border/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isExhausted ? "bg-red-500/10" : "bg-primary/10"
          )}>
            <Sparkles className={cn(
              "w-4 h-4",
              isExhausted ? "text-red-500" : "text-primary"
            )} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              رصيد البحث التفصيلي
            </h4>
            <p className="text-xs text-muted-foreground">
              {isPremium ? 'اشتراك مميز' : 'الخطة المجانية'}
            </p>
          </div>
        </div>
        
        {isPremium && (
          <Crown className="w-5 h-5 text-amber-500" />
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">المستخدم</span>
          <span className={cn(
            "font-medium",
            isExhausted ? "text-red-500" : "text-foreground"
          )}>
            {quota?.used || 0} / {quota?.limit || 3}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ 
              width: `${((quota?.used || 0) / (quota?.limit || 3)) * 100}%` 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isExhausted 
                ? "bg-red-500"
                : isLow
                  ? "bg-amber-500"
                  : "bg-primary"
            )}
          />
        </div>
      </div>

      {/* Status */}
      {isExhausted ? (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-500">
              استنفذت حصتك
            </p>
            <p className="text-xs text-red-500/70">
              يتجدد الرصيد خلال {timeUntilReset}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            يتجدد خلال {timeUntilReset}
          </span>
        </div>
      )}

      {/* Upgrade button (for free users) */}
      {!isPremium && onUpgrade && (
        <button
          onClick={onUpgrade}
          className={cn(
            "w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium",
            "bg-gradient-to-r from-amber-500 to-orange-500",
            "text-white hover:opacity-90 transition-opacity",
            "flex items-center justify-center gap-2"
          )}
        >
          <Crown className="w-4 h-4" />
          ترقية للاشتراك المميز
        </button>
      )}
    </motion.div>
  );
};

export default QuotaIndicator;
