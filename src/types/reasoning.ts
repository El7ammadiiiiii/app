/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * أنواع البيانات الخاصة بنظام التفكير الشفاف
 * 
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * أنواع الخطوات في مسار التفكير
 */
export enum StepType {
  THINKING = 'thinking',
  SEARCHING = 'searching',
  CONTEXT = 'context',
  ANALYZING = 'analyzing',
  REASONING = 'reasoning',
  GENERATING = 'generating',
  VALIDATING = 'validating',
  TOOL_CALL = 'tool_call',
  ERROR = 'error',
}

/**
 * حالة الخطوة
 */
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * حالة مسار التفكير
 */
export enum TraceStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * مستوى تعقيد المهمة
 */
export enum TaskComplexity {
  QUICK = 'quick',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  RESEARCH = 'research',
}

/**
 * نوع المصدر
 */
export enum SourceType {
  FILE = 'file',
  WEB = 'web',
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
  API = 'api',
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * خطوة في مسار التفكير
 */
export interface ReasoningStep {
  id: string;
  type: StepType;
  status: StepStatus;
  title: string;
  titleEn?: string;
  description?: string;
  content?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  progress?: number;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * مصدر معلومات
 */
export interface ReasoningSource {
  id: string;
  type: SourceType;
  name: string;
  path?: string;
  url?: string;
  relevance: number;
  snippet?: string;
  excerpt?: string;
  usedInSteps?: string[];
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * حدث في مسار التفكير
 */
export interface ReasoningEvent {
  id: string;
  traceId: string;
  type: string;
  timestamp: number;
  sequence: number;
  data?: Record<string, unknown>;
}

/**
 * ملخص مسار التفكير
 */
export interface TraceSummary {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  averageStepDuration: number;
  complexity: TaskComplexity;
  sourcesCount: number;
}

/**
 * مسار التفكير الكامل
 */
export interface ReasoningTrace {
  id: string;
  messageId: string;
  status: TraceStatus;
  complexity: TaskComplexity;
  query: string;
  steps: ReasoningStep[];
  sources: ReasoningSource[];
  events: ReasoningEvent[];
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  error?: {
    code: string;
    message: string;
  };
  summary?: TraceSummary;
}

/**
 * حالة العرض للرسالة
 */
export interface ReasoningDisplayState {
  messageId: string;
  isLiveVisible: boolean;
  isPanelOpen: boolean;
  expandedSteps: Set<string>;
}

/**
 * حالة الإعادة
 */
export interface ReplayState {
  isActive: boolean;
  isPaused: boolean;
  currentEventIndex: number;
  speed: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إعدادات كل نوع خطوة
 */
export const STEP_CONFIG: Record<StepType, {
  icon: string;
  color: string;
  label: string;
  labelEn: string;
}> = {
  [StepType.THINKING]: {
    icon: '🧠',
    color: '#A78BFA',
    label: 'تفكير',
    labelEn: 'Thinking',
  },
  [StepType.SEARCHING]: {
    icon: '🔍',
    color: '#60A5FA',
    label: 'بحث',
    labelEn: 'Searching',
  },
  [StepType.CONTEXT]: {
    icon: '📋',
    color: '#34D399',
    label: 'سياق',
    labelEn: 'Context',
  },
  [StepType.ANALYZING]: {
    icon: '📊',
    color: '#F472B6',
    label: 'تحليل',
    labelEn: 'Analyzing',
  },
  [StepType.REASONING]: {
    icon: '💡',
    color: '#FBBF24',
    label: 'استنتاج',
    labelEn: 'Reasoning',
  },
  [StepType.GENERATING]: {
    icon: '✨',
    color: '#818CF8',
    label: 'توليد',
    labelEn: 'Generating',
  },
  [StepType.VALIDATING]: {
    icon: '✅',
    color: '#10B981',
    label: 'تحقق',
    labelEn: 'Validating',
  },
  [StepType.TOOL_CALL]: {
    icon: '🔧',
    color: '#F59E0B',
    label: 'أداة',
    labelEn: 'Tool',
  },
  [StepType.ERROR]: {
    icon: '❌',
    color: '#EF4444',
    label: 'خطأ',
    labelEn: 'Error',
  },
};

/**
 * توقيتات حسب التعقيد (بالمللي ثانية)
 */
export const COMPLEXITY_TIMING: Record<TaskComplexity, {
  min: number;
  max: number;
  stepDelay: [number, number];
  stepDuration: [number, number];
}> = {
  [TaskComplexity.QUICK]: {
    min: 1000,
    max: 2000,
    stepDelay: [200, 500],
    stepDuration: [300, 800],
  },
  [TaskComplexity.MEDIUM]: {
    min: 2000,
    max: 4000,
    stepDelay: [300, 700],
    stepDuration: [500, 1500],
  },
  [TaskComplexity.HEAVY]: {
    min: 3000,
    max: 6000,
    stepDelay: [400, 900],
    stepDuration: [800, 2500],
  },
  [TaskComplexity.RESEARCH]: {
    min: 5000,
    max: 10000,
    stepDelay: [500, 1200],
    stepDuration: [1000, 4000],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * توليد معرف فريد
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * تحديد مستوى التعقيد من النص
 */
export function detectComplexity(query: string): TaskComplexity {
  const lowercaseQuery = query.toLowerCase();
  
  // كلمات تدل على البحث العميق
  const researchKeywords = ['ابحث', 'بحث عميق', 'تحليل شامل', 'research', 'deep analysis', 'comprehensive'];
  if (researchKeywords.some(kw => lowercaseQuery.includes(kw))) {
    return TaskComplexity.RESEARCH;
  }
  
  // كلمات تدل على مهمة ثقيلة
  const heavyKeywords = ['اكتب', 'أنشئ', 'برمج', 'صمم', 'create', 'build', 'design', 'implement'];
  if (heavyKeywords.some(kw => lowercaseQuery.includes(kw))) {
    return TaskComplexity.HEAVY;
  }
  
  // كلمات تدل على مهمة متوسطة
  const mediumKeywords = ['اشرح', 'وضح', 'قارن', 'explain', 'compare', 'describe'];
  if (mediumKeywords.some(kw => lowercaseQuery.includes(kw))) {
    return TaskComplexity.MEDIUM;
  }
  
  // الباقي سريع
  return TaskComplexity.QUICK;
}

/**
 * حساب ملخص المسار
 */
export function calculateSummary(trace: ReasoningTrace): TraceSummary {
  const completedSteps = trace.steps.filter(s => s.status === StepStatus.COMPLETED).length;
  const failedSteps = trace.steps.filter(s => s.status === StepStatus.FAILED).length;
  const totalDuration = trace.totalDuration || (trace.endTime ? trace.endTime - trace.startTime : 0);
  
  const stepDurations = trace.steps
    .filter(s => s.duration !== undefined)
    .map(s => s.duration!);
  
  const averageStepDuration = stepDurations.length > 0
    ? stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length
    : 0;

  return {
    totalSteps: trace.steps.length,
    completedSteps,
    failedSteps,
    totalDuration,
    averageStepDuration,
    complexity: trace.complexity,
    sourcesCount: trace.sources.length,
  };
}

/**
 * تنسيق المدة الزمنية
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
