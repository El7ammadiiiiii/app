/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING STEP
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * عرض خطوة واحدة من مسار التفكير
 * مع أيقونة ملونة حسب النوع وحالة واضحة
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, X, ChevronRight, AlertCircle } from 'lucide-react';
// import { ReasoningStep as ReasoningStepType, StepStatus, STEP_CONFIG, formatDuration } from '@/types/reasoning';
import { useReasoningStore } from '@/store/reasoningStore';
import { cn } from '@/lib/utils';

// Temporary local definitions to fix missing module error
export enum StepStatus
{
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface ReasoningStepType
{
  id: string;
  type: string;
  title: string;
  status: StepStatus;
  content?: string;
  description?: string;
  progress?: number;
  duration?: number;
  error?: {
    code: string;
    message: string;
  };
}

export const STEP_CONFIG: Record<string, { icon: React.ReactNode }> = {
  default: { icon: <div className="w-4 h-4 bg-gray-500 rounded-full" /> },
  // Add other types as needed based on usage, defaulting to a generic config for now to prevent crashes
};

// Proxy handler to avoid undefined errors for unknown step types
const STEP_CONFIG_PROXY = new Proxy( STEP_CONFIG, {
  get: ( target, prop ) => target[ prop as string ] || target.default,
} );

export const formatDuration = ( ms: number ): string =>
{
  if ( ms < 1000 ) return `${ ms }ms`;
  return `${ ( ms / 1000 ).toFixed( 1 ) }s`;
};

interface ReasoningStepProps
{
  step: ReasoningStepType;
  messageId: string;
  index: number;
  isLast: boolean;
  className?: string;
}

const ReasoningStep = memo( function ReasoningStep ( {
  step,
  messageId,
  index,
  isLast,
  className,
}: ReasoningStepProps )
{
  const { toggleStepExpanded } = useReasoningStore();
  const displayState = useReasoningStore( ( state ) => state.displayStates.get( messageId ) );
  const isExpanded = displayState?.expandedSteps?.has( step.id ) ?? false;
  // Use the proxy or fallback to ensure config exists
  const config = ( STEP_CONFIG as any )[ step.type ] || { icon: <AlertCircle className="w-4 h-4" /> };

  const handleToggle = useCallback( () =>
  {
    if ( step.content || step.description )
    {
      toggleStepExpanded( messageId, step.id );
    }
  }, [ toggleStepExpanded, messageId, step.id, step.content, step.description ] );

  // أيقونة الحالة
  const StatusIcon = () =>
  {
    switch ( step.status )
    {
      case StepStatus.COMPLETED:
        return (
          <motion.div
            initial={ { scale: 0 } }
            animate={ { scale: 1 } }
            className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <Check className="w-2.5 h-2.5 text-emerald-400" />
          </motion.div>
        );
      case StepStatus.RUNNING:
        return (
          <motion.div
            animate={ { rotate: 360 } }
            transition={ { duration: 1, repeat: Infinity, ease: 'linear' } }
          >
            <Loader2 className="w-4 h-4 text-primary" />
          </motion.div>
        );
      case StepStatus.FAILED:
        return (
          <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-2.5 h-2.5 text-red-400" />
          </div>
        );
      case StepStatus.SKIPPED:
        return (
          <div className="w-4 h-4 rounded-full bg-gray-500/20 flex items-center justify-center">
            <span className="text-[8px] text-gray-400">—</span>
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-white/10 border border-white/20" />
        );
    }
  };

  const hasExpandableContent = step.content || step.description || step.error;
  const connectorClass = step.status === StepStatus.COMPLETED
    ? 'bg-[linear-gradient(to_bottom,_rgba(16,185,129,0.5),_rgba(16,185,129,0.1))]'
    : 'bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.1),_rgba(255,255,255,0.05))]';

  return (
    <div className={ cn( 'relative', className ) }>
      {/* Timeline Connector */ }
      { !isLast && (
        <div
          className={ `absolute left-[1.1rem] top-8 bottom-0 w-px ${ connectorClass }` }
        />
      ) }

      {/* Step Content */ }
      <motion.div
        initial={ { opacity: 0, x: -10 } }
        animate={ { opacity: 1, x: 0 } }
        transition={ { delay: index * 0.1 } }
        className={ cn(
          'relative flex items-start gap-3 py-2 px-3 rounded-lg',
          'transition-all duration-200',
          hasExpandableContent && 'cursor-pointer hover:bg-white/[0.03]',
          isExpanded && 'bg-white/[0.02]',
        ) }
        onClick={ handleToggle }
      >
        {/* Step Number & Status */ }
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <StatusIcon />
        </div>

        {/* Main Content */ }
        <div className="flex-1 min-w-0">
          {/* Header Row */ }
          <div className="flex items-center justify-between gap-2">
            {/* Type Icon & Title */ }
            <div className="flex items-center gap-2 min-w-0">
              {/* Type Icon */ }
              <span
                className={ cn(
                  'text-sm shrink-0',
                  step.status === StepStatus.PENDING && 'grayscale opacity-50'
                ) }
              >
                { config.icon }
              </span>

              {/* Title */ }
              <span
                className={ cn(
                  'text-sm font-medium truncate transition-colors',
                  step.status === StepStatus.COMPLETED && 'text-foreground',
                  step.status === StepStatus.RUNNING && 'text-primary',
                  step.status === StepStatus.FAILED && 'text-red-400',
                  step.status === StepStatus.PENDING && 'text-muted-foreground/50',
                  step.status === StepStatus.SKIPPED && 'text-muted-foreground/40 line-through',
                ) }
              >
                { step.title }
              </span>

              {/* Expand Arrow */ }
              { hasExpandableContent && (
                <motion.div
                  animate={ { rotate: isExpanded ? 90 : 0 } }
                  transition={ { duration: 0.2 } }
                  className="text-muted-foreground/40"
                >
                  <ChevronRight className="w-3 h-3" />
                </motion.div>
              ) }
            </div>

            {/* Duration */ }
            <div className="flex items-center gap-2 shrink-0">
              { step.status === StepStatus.RUNNING && step.progress !== undefined && (
                <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={ { width: 0 } }
                    animate={ { width: `${ step.progress }%` } }
                  />
                </div>
              ) }

              { step.duration !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  { formatDuration( step.duration ) }
                </span>
              ) }
            </div>
          </div>

          {/* Expanded Content */ }
          <AnimatePresence>
            { isExpanded && hasExpandableContent && (
              <motion.div
                initial={ { height: 0, opacity: 0 } }
                animate={ { height: 'auto', opacity: 1 } }
                exit={ { height: 0, opacity: 0 } }
                transition={ { duration: 0.2 } }
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {/* Description */ }
                  { step.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      { step.description }
                    </p>
                  ) }

                  {/* Content */ }
                  { step.content && (
                    <div className="p-2 rounded-md bg-black/20 border border-white/5">
                      <pre className="text-xs text-muted-foreground/80 whitespace-pre-wrap font-mono">
                        { step.content }
                      </pre>
                    </div>
                  ) }

                  {/* Error */ }
                  { step.error && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-400">
                          { step.error.code }
                        </p>
                        <p className="text-xs text-red-300/80 mt-0.5">
                          { step.error.message }
                        </p>
                      </div>
                    </div>
                  ) }
                </div>
              </motion.div>
            ) }
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
} );

export default ReasoningStep;
