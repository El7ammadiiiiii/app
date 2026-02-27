/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRANSPARENT REASONING ENGINE - Zustand Store
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * إدارة حالة مسارات التفكير مع دعم Mock Simulation
 * 
 * @version 1.0.0
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  ReasoningTrace,
  ReasoningStep,
  ReasoningSource,
  ReasoningEvent,
  ReasoningDisplayState,
  ReplayState,
  TraceSummary,
  StepType,
  StepStatus,
  TraceStatus,
  TaskComplexity,
  SourceType,
  STEP_CONFIG,
  COMPLEXITY_TIMING,
  generateId,
  detectComplexity,
  calculateSummary,
  formatDuration,
} from '../types/reasoning';

// ═══════════════════════════════════════════════════════════════════════════════
// STORE STATE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface ReasoningState {
  // === Data ===
  traces: Map<string, ReasoningTrace>;        // messageId -> Trace
  displayStates: Map<string, ReasoningDisplayState>;
  
  // === Active State ===
  activeTraceId: string | null;
  activeSimulations: Set<string>;             // messageIds with running simulations
  
  // === Replay ===
  replayState: ReplayState;
  isReplayAvailable: boolean;                 // معطل حالياً
  
  // === Settings ===
  settings: {
    defaultExpanded: boolean;
    showDurations: boolean;
    animateSteps: boolean;
    detailLevel: 'basic' | 'detailed' | 'debug';
  };
  
  // === Actions ===
  // Trace Management
  startTrace: (messageId: string, query: string) => string;
  getTrace: (messageId: string) => ReasoningTrace | undefined;
  completeTrace: (messageId: string, error?: { code: string; message: string }) => void;
  cancelTrace: (messageId: string) => void;
  
  // Step Management
  addStep: (messageId: string, step: Partial<ReasoningStep>) => string;
  updateStep: (messageId: string, stepId: string, updates: Partial<ReasoningStep>) => void;
  completeStep: (messageId: string, stepId: string, content?: string) => void;
  failStep: (messageId: string, stepId: string, error: { code: string; message: string }) => void;
  
  // Source Management
  addSource: (messageId: string, source: Partial<ReasoningSource>) => string;
  
  // UI State
  togglePanel: (messageId: string) => void;
  setLiveVisible: (messageId: string, visible: boolean) => void;
  toggleStepExpanded: (messageId: string, stepId: string) => void;
  getDisplayState: (messageId: string) => ReasoningDisplayState;
  
  // Simulation
  startMockSimulation: (messageId: string, query: string) => void;
  stopSimulation: (messageId: string) => void;
  
  // Replay (معطل)
  startReplay: (messageId: string) => void;
  pauseReplay: () => void;
  seekReplay: (eventIndex: number) => void;
  
  // Utilities
  getSummary: (messageId: string) => TraceSummary | null;
  clearTrace: (messageId: string) => void;
  clearAllTraces: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SIMULATION DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * قوالب الخطوات حسب التعقيد
 */
const STEP_TEMPLATES: Record<TaskComplexity, Array<{ type: StepType; title: string; titleEn: string }>> = {
  [TaskComplexity.QUICK]: [
    { type: StepType.THINKING, title: 'فهم الطلب', titleEn: 'Understanding request' },
    { type: StepType.GENERATING, title: 'توليد الرد', titleEn: 'Generating response' },
    { type: StepType.VALIDATING, title: 'مراجعة النتيجة', titleEn: 'Validating result' },
  ],
  [TaskComplexity.MEDIUM]: [
    { type: StepType.THINKING, title: 'تحليل الطلب', titleEn: 'Analyzing request' },
    { type: StepType.CONTEXT, title: 'جمع السياق', titleEn: 'Gathering context' },
    { type: StepType.GENERATING, title: 'صياغة الرد', titleEn: 'Crafting response' },
    { type: StepType.VALIDATING, title: 'التحقق النهائي', titleEn: 'Final validation' },
  ],
  [TaskComplexity.HEAVY]: [
    { type: StepType.THINKING, title: 'فهم المتطلبات', titleEn: 'Understanding requirements' },
    { type: StepType.SEARCHING, title: 'البحث في المصادر', titleEn: 'Searching sources' },
    { type: StepType.CONTEXT, title: 'تجميع البيانات', titleEn: 'Collecting data' },
    { type: StepType.ANALYZING, title: 'تحليل النتائج', titleEn: 'Analyzing results' },
    { type: StepType.GENERATING, title: 'بناء الرد', titleEn: 'Building response' },
    { type: StepType.VALIDATING, title: 'مراجعة شاملة', titleEn: 'Comprehensive review' },
  ],
  [TaskComplexity.RESEARCH]: [
    { type: StepType.THINKING, title: 'تحليل السؤال البحثي', titleEn: 'Analyzing research question' },
    { type: StepType.SEARCHING, title: 'بحث أولي', titleEn: 'Initial search' },
    { type: StepType.CONTEXT, title: 'جمع المراجع', titleEn: 'Gathering references' },
    { type: StepType.ANALYZING, title: 'تحليل عميق', titleEn: 'Deep analysis' },
    { type: StepType.REASONING, title: 'استنتاج النتائج', titleEn: 'Drawing conclusions' },
    { type: StepType.TOOL_CALL, title: 'أدوات متخصصة', titleEn: 'Specialized tools' },
    { type: StepType.GENERATING, title: 'كتابة التقرير', titleEn: 'Writing report' },
    { type: StepType.VALIDATING, title: 'مراجعة علمية', titleEn: 'Scientific review' },
  ],
};

/**
 * مصادر وهمية للعرض
 */
const MOCK_SOURCES: Array<Partial<ReasoningSource>> = [
  { type: SourceType.FILE, name: 'config.ts', path: '/src/config.ts', relevance: 95 },
  { type: SourceType.FILE, name: 'utils.ts', path: '/src/lib/utils.ts', relevance: 87 },
  { type: SourceType.KNOWLEDGE, name: 'TypeScript Best Practices', relevance: 82 },
  { type: SourceType.WEB, name: 'React Documentation', url: 'https://react.dev', relevance: 78 },
  { type: SourceType.CONTEXT, name: 'Previous conversation', relevance: 90 },
  { type: SourceType.API, name: 'OpenAI API', relevance: 75 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

// Store للـ simulation intervals
const simulationIntervals: Map<string, NodeJS.Timeout[]> = new Map();

export const useReasoningStore = create<ReasoningState>()(
  devtools(
    (set, get) => ({
      // === Initial State ===
      traces: new Map(),
      displayStates: new Map(),
      activeTraceId: null,
      activeSimulations: new Set(),
      replayState: {
        isActive: false,
        isPaused: false,
        currentEventIndex: 0,
        speed: 1,
      },
      isReplayAvailable: false, // معطل حالياً
      settings: {
        defaultExpanded: false,
        showDurations: true,
        animateSteps: true,
        detailLevel: 'detailed',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // TRACE MANAGEMENT
      // ═══════════════════════════════════════════════════════════════════════

      startTrace: (messageId: string, query: string) => {
        const traceId = generateId('trace');
        const complexity = detectComplexity(query);
        
        const trace: ReasoningTrace = {
          id: traceId,
          messageId,
          status: TraceStatus.RUNNING,
          complexity,
          query,
          steps: [],
          sources: [],
          events: [],
          startTime: Date.now(),
        };

        // Event: trace.started
        const startEvent: ReasoningEvent = {
          id: generateId('event'),
          traceId,
          type: 'trace.started',
          timestamp: Date.now(),
          sequence: 0,
          data: { query, complexity },
        };
        trace.events.push(startEvent);

        set((state) => {
          const newTraces = new Map(state.traces);
          newTraces.set(messageId, trace);
          
          const newDisplayStates = new Map(state.displayStates);
          newDisplayStates.set(messageId, {
            messageId,
            isLiveVisible: true,
            isPanelOpen: false,
            expandedSteps: new Set(),
          });
          
          return {
            traces: newTraces,
            displayStates: newDisplayStates,
            activeTraceId: traceId,
          };
        });

        return traceId;
      },

      getTrace: (messageId: string) => {
        return get().traces.get(messageId);
      },

      completeTrace: (messageId: string, error?) => {
        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          const endTime = Date.now();
          const updatedTrace: ReasoningTrace = {
            ...trace,
            status: error ? TraceStatus.FAILED : TraceStatus.COMPLETED,
            endTime,
            totalDuration: endTime - trace.startTime,
            error,
            summary: calculateSummary({ ...trace, endTime, totalDuration: endTime - trace.startTime }),
          };

          // Event: trace.completed/failed
          const completeEvent: ReasoningEvent = {
            id: generateId('event'),
            traceId: trace.id,
            type: error ? 'trace.failed' : 'trace.completed',
            timestamp: endTime,
            sequence: trace.events.length,
            data: { duration: updatedTrace.totalDuration, error },
          };
          updatedTrace.events.push(completeEvent);

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, updatedTrace);

          // تحديث display state - إخفاء الفقاعة الحية
          const newDisplayStates = new Map(state.displayStates);
          const displayState = newDisplayStates.get(messageId);
          if (displayState) {
            newDisplayStates.set(messageId, {
              ...displayState,
              isLiveVisible: false,
            });
          }

          // إزالة من الـ active simulations
          const newActiveSimulations = new Set(state.activeSimulations);
          newActiveSimulations.delete(messageId);

          return {
            traces: newTraces,
            displayStates: newDisplayStates,
            activeSimulations: newActiveSimulations,
            activeTraceId: null,
          };
        });
      },

      cancelTrace: (messageId: string) => {
        get().stopSimulation(messageId);
        
        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          const updatedTrace: ReasoningTrace = {
            ...trace,
            status: TraceStatus.CANCELLED,
            endTime: Date.now(),
          };

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, updatedTrace);

          return { traces: newTraces };
        });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // STEP MANAGEMENT
      // ═══════════════════════════════════════════════════════════════════════

      addStep: (messageId: string, stepData: Partial<ReasoningStep>) => {
        const stepId = generateId('step');
        
        const step: ReasoningStep = {
          id: stepId,
          type: stepData.type || StepType.THINKING,
          status: StepStatus.RUNNING,
          title: stepData.title || STEP_CONFIG[stepData.type || StepType.THINKING].label,
          titleEn: stepData.titleEn,
          description: stepData.description,
          content: stepData.content,
          startTime: Date.now(),
          progress: 0,
          metadata: stepData.metadata,
        };

        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          // Event: step.started
          const stepEvent: ReasoningEvent = {
            id: generateId('event'),
            traceId: trace.id,
            type: 'step.started',
            timestamp: Date.now(),
            sequence: trace.events.length,
            data: { stepId, type: step.type, title: step.title },
          };

          const updatedTrace: ReasoningTrace = {
            ...trace,
            steps: [...trace.steps, step],
            events: [...trace.events, stepEvent],
          };

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, updatedTrace);

          return { traces: newTraces };
        });

        return stepId;
      },

      updateStep: (messageId: string, stepId: string, updates: Partial<ReasoningStep>) => {
        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          const updatedSteps = trace.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          );

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, { ...trace, steps: updatedSteps });

          return { traces: newTraces };
        });
      },

      completeStep: (messageId: string, stepId: string, content?: string) => {
        const endTime = Date.now();

        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          const updatedSteps = trace.steps.map((step) => {
            if (step.id === stepId) {
              return {
                ...step,
                status: StepStatus.COMPLETED,
                endTime,
                duration: endTime - step.startTime,
                content: content || step.content,
                progress: 100,
              };
            }
            return step;
          });

          // Event: step.completed
          const step = trace.steps.find((s) => s.id === stepId);
          const stepEvent: ReasoningEvent = {
            id: generateId('event'),
            traceId: trace.id,
            type: 'step.completed',
            timestamp: endTime,
            sequence: trace.events.length,
            data: { 
              stepId, 
              duration: step ? endTime - step.startTime : 0,
            },
          };

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, {
            ...trace,
            steps: updatedSteps,
            events: [...trace.events, stepEvent],
          });

          return { traces: newTraces };
        });
      },

      failStep: (messageId: string, stepId: string, error: { code: string; message: string }) => {
        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          const updatedSteps = trace.steps.map((step) =>
            step.id === stepId
              ? { ...step, status: StepStatus.FAILED, error, endTime: Date.now() }
              : step
          );

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, { ...trace, steps: updatedSteps });

          return { traces: newTraces };
        });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // SOURCE MANAGEMENT
      // ═══════════════════════════════════════════════════════════════════════

      addSource: (messageId: string, sourceData: Partial<ReasoningSource>) => {
        const sourceId = generateId('source');

        const source: ReasoningSource = {
          id: sourceId,
          type: sourceData.type || SourceType.FILE,
          name: sourceData.name || 'Unknown',
          path: sourceData.path,
          url: sourceData.url,
          excerpt: sourceData.excerpt,
          relevance: sourceData.relevance || 80,
          usedInSteps: sourceData.usedInSteps || [],
          timestamp: Date.now(),
          metadata: sourceData.metadata,
        };

        set((state) => {
          const trace = state.traces.get(messageId);
          if (!trace) return state;

          // Event: source.found
          const sourceEvent: ReasoningEvent = {
            id: generateId('event'),
            traceId: trace.id,
            type: 'source.found',
            timestamp: Date.now(),
            sequence: trace.events.length,
            data: { sourceId, type: source.type, name: source.name },
          };

          const newTraces = new Map(state.traces);
          newTraces.set(messageId, {
            ...trace,
            sources: [...trace.sources, source],
            events: [...trace.events, sourceEvent],
          });

          return { traces: newTraces };
        });

        return sourceId;
      },

      // ═══════════════════════════════════════════════════════════════════════
      // UI STATE MANAGEMENT
      // ═══════════════════════════════════════════════════════════════════════

      togglePanel: (messageId: string) => {
        set((state) => {
          const newDisplayStates = new Map(state.displayStates);
          const current = newDisplayStates.get(messageId);
          
          if (current) {
            newDisplayStates.set(messageId, {
              ...current,
              isPanelOpen: !current.isPanelOpen,
            });
          } else {
            newDisplayStates.set(messageId, {
              messageId,
              isLiveVisible: false,
              isPanelOpen: true,
              expandedSteps: new Set(),
            });
          }

          return { displayStates: newDisplayStates };
        });
      },

      setLiveVisible: (messageId: string, visible: boolean) => {
        set((state) => {
          const newDisplayStates = new Map(state.displayStates);
          const current = newDisplayStates.get(messageId);
          
          if (current) {
            newDisplayStates.set(messageId, { ...current, isLiveVisible: visible });
          }

          return { displayStates: newDisplayStates };
        });
      },

      toggleStepExpanded: (messageId: string, stepId: string) => {
        set((state) => {
          const newDisplayStates = new Map(state.displayStates);
          const current = newDisplayStates.get(messageId);
          
          if (current) {
            const newExpandedSteps = new Set(current.expandedSteps);
            if (newExpandedSteps.has(stepId)) {
              newExpandedSteps.delete(stepId);
            } else {
              newExpandedSteps.add(stepId);
            }
            newDisplayStates.set(messageId, { ...current, expandedSteps: newExpandedSteps });
          }

          return { displayStates: newDisplayStates };
        });
      },

      getDisplayState: (messageId: string) => {
        const state = get().displayStates.get(messageId);
        return state || {
          messageId,
          isLiveVisible: false,
          isPanelOpen: false,
          expandedSteps: new Set(),
        };
      },

      // ═══════════════════════════════════════════════════════════════════════
      // MOCK SIMULATION
      // ═══════════════════════════════════════════════════════════════════════

      startMockSimulation: (messageId: string, query: string) => {
        const { startTrace, addStep, completeStep, addSource, completeTrace } = get();
        
        // بدء الـ trace
        startTrace(messageId, query);
        
        // تحديد التعقيد والتوقيت
        const complexity = detectComplexity(query);
        const timing = COMPLEXITY_TIMING[complexity];
        const steps = STEP_TEMPLATES[complexity];
        const totalTime = timing.min + Math.random() * (timing.max - timing.min);
        const stepTime = totalTime / steps.length;

        // تسجيل الـ simulation
        set((state) => {
          const newActiveSimulations = new Set(state.activeSimulations);
          newActiveSimulations.add(messageId);
          return { activeSimulations: newActiveSimulations };
        });

        // تخزين intervals للتنظيف
        const intervals: NodeJS.Timeout[] = [];
        simulationIntervals.set(messageId, intervals);

        // تنفيذ الخطوات بالتتابع
        let currentDelay = 0;

        steps.forEach((stepTemplate, index) => {
          // بدء الخطوة
          const startTimeout = setTimeout(() => {
            if (!get().activeSimulations.has(messageId)) return;
            
            const stepId = addStep(messageId, {
              type: stepTemplate.type,
              title: stepTemplate.title,
              titleEn: stepTemplate.titleEn,
            });

            // إضافة مصادر عشوائية في خطوات معينة
            if (stepTemplate.type === StepType.SEARCHING || stepTemplate.type === StepType.CONTEXT) {
              const randomSources = MOCK_SOURCES
                .sort(() => Math.random() - 0.5)
                .slice(0, 1 + Math.floor(Math.random() * 2));
              
              randomSources.forEach((source, i) => {
                setTimeout(() => {
                  if (!get().activeSimulations.has(messageId)) return;
                  addSource(messageId, { ...source, usedInSteps: [stepId] });
                }, i * 300);
              });
            }

            // إكمال الخطوة
            const stepDuration = stepTime * (0.7 + Math.random() * 0.6);
            const completeTimeout = setTimeout(() => {
              if (!get().activeSimulations.has(messageId)) return;
              completeStep(messageId, stepId);
              
              // إكمال الـ trace بعد آخر خطوة
              if (index === steps.length - 1) {
                setTimeout(() => {
                  completeTrace(messageId);
                }, 200);
              }
            }, stepDuration);
            
            intervals.push(completeTimeout);
          }, currentDelay);
          
          intervals.push(startTimeout);
          currentDelay += stepTime;
        });
      },

      stopSimulation: (messageId: string) => {
        // تنظيف intervals
        const intervals = simulationIntervals.get(messageId);
        if (intervals) {
          intervals.forEach((interval) => clearTimeout(interval));
          simulationIntervals.delete(messageId);
        }

        set((state) => {
          const newActiveSimulations = new Set(state.activeSimulations);
          newActiveSimulations.delete(messageId);
          return { activeSimulations: newActiveSimulations };
        });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // REPLAY (معطل حالياً)
      // ═══════════════════════════════════════════════════════════════════════

      startReplay: (_messageId: string) => {
        // TODO: تفعيل لاحقاً
        console.log('Replay feature coming soon!');
      },

      pauseReplay: () => {
        // TODO: تفعيل لاحقاً
      },

      seekReplay: (_eventIndex: number) => {
        // TODO: تفعيل لاحقاً
      },

      // ═══════════════════════════════════════════════════════════════════════
      // UTILITIES
      // ═══════════════════════════════════════════════════════════════════════

      getSummary: (messageId: string) => {
        const trace = get().traces.get(messageId);
        if (!trace) return null;
        return trace.summary || calculateSummary(trace);
      },

      clearTrace: (messageId: string) => {
        get().stopSimulation(messageId);
        
        set((state) => {
          const newTraces = new Map(state.traces);
          newTraces.delete(messageId);
          
          const newDisplayStates = new Map(state.displayStates);
          newDisplayStates.delete(messageId);

          return { traces: newTraces, displayStates: newDisplayStates };
        });
      },

      clearAllTraces: () => {
        // تنظيف كل simulations
        simulationIntervals.forEach((intervals, messageId) => {
          intervals.forEach((interval) => clearTimeout(interval));
        });
        simulationIntervals.clear();

        set({
          traces: new Map(),
          displayStates: new Map(),
          activeTraceId: null,
          activeSimulations: new Set(),
        });
      },
    }),
    { name: 'reasoning-store' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTOR HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export const useTrace = (messageId: string) => {
  return useReasoningStore((state) => state.traces.get(messageId));
};

export const useDisplayState = (messageId: string) => {
  return useReasoningStore((state) => state.displayStates.get(messageId));
};

export const useIsSimulating = (messageId: string) => {
  return useReasoningStore((state) => state.activeSimulations.has(messageId));
};

export const useTraceSummary = (messageId: string) => {
  const trace = useReasoningStore((state) => state.traces.get(messageId));
  if (!trace) return null;
  return trace.summary || calculateSummary(trace);
};
