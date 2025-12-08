/**
 * 🧠 Thinking Steps Component
 * عرض مراحل التفكير مع animations
 */

"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Eye, 
  Lightbulb,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResearchStep, ThinkingPhase } from '@/types/deepResearch';

// =============================================================================
// 🎯 Types
// =============================================================================

interface ThinkingStepsProps {
  steps: ResearchStep[];
  currentPhase?: ThinkingPhase;
  className?: string;
}

// =============================================================================
// 🎨 Phase Config
// =============================================================================

const PHASE_CONFIG: Record<ThinkingPhase, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  thought: {
    icon: Brain,
    label: 'تفكير',
    labelEn: 'Thinking',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'تحليل السؤال وتفكيكه',
  },
  action: {
    icon: Zap,
    label: 'تنفيذ',
    labelEn: 'Acting',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'البحث في المصادر',
  },
  observation: {
    icon: Eye,
    label: 'ملاحظة',
    labelEn: 'Observing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'تحليل النتائج',
  },
  reflection: {
    icon: Lightbulb,
    label: 'تأمل',
    labelEn: 'Reflecting',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'تجميع المعلومات',
  },
};

// =============================================================================
// 🧩 Components
// =============================================================================

const StepCard: React.FC<{
  step: ResearchStep;
  index: number;
  isActive: boolean;
  isComplete: boolean;
}> = ({ step, index, isActive, isComplete }) => {
  const config = PHASE_CONFIG[step.phase];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={cn(
        "relative flex gap-3 p-3 rounded-xl border transition-all duration-300",
        isActive && "border-primary/50 bg-primary/5 shadow-sm",
        isComplete && "border-border/50 bg-muted/30",
        !isActive && !isComplete && "border-transparent"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        config.bgColor
      )}>
        {isActive ? (
          <Loader2 className={cn("w-5 h-5 animate-spin", config.color)} />
        ) : isComplete ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Icon className={cn("w-5 h-5", config.color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-semibold text-sm", config.color)}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {config.labelEn}
          </span>
          {step.duration && (
            <span className="text-xs text-muted-foreground mr-auto">
              {(step.duration / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        
        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {step.content}
        </p>

        {/* Metadata */}
        {step.metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {step.metadata.toolUsed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                🔧 {step.metadata.toolUsed}
              </span>
            )}
            {step.metadata.resultsCount !== undefined && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                📊 {step.metadata.resultsCount} نتيجة
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connection line */}
      {index > 0 && (
        <div className="absolute -top-3 left-[1.25rem] w-0.5 h-3 bg-border" />
      )}
    </motion.div>
  );
};

// =============================================================================
// 🎯 Main Component
// =============================================================================

export const ThinkingSteps: React.FC<ThinkingStepsProps> = ({
  steps,
  currentPhase,
  className,
}) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          مراحل التفكير
        </span>
        <span className="text-xs text-muted-foreground">
          ReAct Loop
        </span>
      </div>

      {/* Steps */}
      <AnimatePresence mode="popLayout">
        {steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isActive={currentPhase === step.phase && index === steps.length - 1}
            isComplete={step.duration !== undefined}
          />
        ))}
      </AnimatePresence>

      {/* Current phase indicator */}
      {currentPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-muted-foreground pt-2"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>
            جاري: {PHASE_CONFIG[currentPhase].description}...
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default ThinkingSteps;
