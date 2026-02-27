/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THINKING SYSTEM TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نظام التفكير المُستوحى من Gemini - يعمل فقط مع Chatbot (ليس Agents)
 * 
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مستويات التفكير (Gemini-inspired)
 */
export enum ThinkingLevel
{
  MINIMAL = 'minimal',  // Grok + GPT 5 mini
  LOW = 'low',          // DeepSeek
  MEDIUM = 'medium',    // Gemini 2.5 + Claude Haiku 4.5
  HIGH = 'high',        // GPT 5.1 + Claude Opus 4.6 + Gemini 3
}

/**
 * مراحل التفكير
 */
export enum ThinkingPhase
{
  ANALYZING = 'analyzing',           // تحليل السؤال
  RESEARCHING = 'researching',       // البحث عن المعلومات
  REASONING = 'reasoning',           // الاستدلال المنطقي
  PLANNING = 'planning',             // التخطيط للإجابة
  VALIDATING = 'validating',         // التحقق من الدقة
  SYNTHESIZING = 'synthesizing',     // تجميع المعلومات
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * نماذج Chatbot المدعومة
 */
export type ChatbotModel =
  | 'ChatGPT 5.1'
  | 'ChatGPT 5 mini'
  | 'Gemini 3'
  | 'Gemini 2.5'
  | 'Claude Opus 4.6'
  | 'Claude Sonnet 4.6'
  | 'Claude Haiku 4.5'
  | 'Grok'
  | 'DeepSeek';

/**
 * أدوات التفكير العميق
 */
export type DeepThinkingTool = 'Thinking' | 'Canvas';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * خطوة تفكير واحدة
 */
export interface ThinkingStep
{
  id: string;
  phase: ThinkingPhase;
  content: string;
  timestamp: number;
  duration?: number; // بالميلي ثانية
}

/**
 * ملخص التفكير الكامل
 */
export interface ThinkingSummary
{
  messageId: string;
  level: ThinkingLevel;
  steps: ThinkingStep[];
  totalDuration: number;
  isComplete: boolean;
  isExpanded: boolean; // هل الملخص مفتوح/مطوي
  error?: string;
}

/**
 * حالة جلسة التفكير
 */
export interface ThinkingSession
{
  messageId: string;
  model: ChatbotModel;
  level: ThinkingLevel;
  query: string;
  summary: ThinkingSummary;
  startTime: number;
  endTime?: number;
}

/**
 * حدث SSE للتفكير
 */
export interface ThinkingSSEEvent
{
  type: 'step' | 'summary' | 'complete' | 'error';
  data: {
    messageId: string;
    step?: ThinkingStep;
    summary?: string;
    error?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * خريطة النماذج ومستويات التفكير
 */
export const MODEL_THINKING_LEVELS: Record<ChatbotModel, ThinkingLevel> = {
  'Grok': ThinkingLevel.MINIMAL,
  'ChatGPT 5 mini': ThinkingLevel.MINIMAL,
  'DeepSeek': ThinkingLevel.LOW,
  'Gemini 2.5': ThinkingLevel.MEDIUM,
  'Claude Haiku 4.5': ThinkingLevel.MEDIUM,
  'ChatGPT 5.1': ThinkingLevel.HIGH,
  'Claude Opus 4.6': ThinkingLevel.HIGH,
  'Claude Sonnet 4.6': ThinkingLevel.MEDIUM,
  'Gemini 3': ThinkingLevel.HIGH,
};

/**
 * مدة كل مستوى تفكير (بالثواني)
 */
export const THINKING_DURATIONS: Record<ThinkingLevel, { min: number; max: number }> = {
  [ ThinkingLevel.MINIMAL ]: { min: 1, max: 2 },
  [ ThinkingLevel.LOW ]: { min: 3, max: 4 },
  [ ThinkingLevel.MEDIUM ]: { min: 5, max: 7 },
  [ ThinkingLevel.HIGH ]: { min: 8, max: 12 },
};

/**
 * عدد الخطوات لكل مستوى
 */
export const THINKING_STEPS_COUNT: Record<ThinkingLevel, number> = {
  [ ThinkingLevel.MINIMAL ]: 2,
  [ ThinkingLevel.LOW ]: 3,
  [ ThinkingLevel.MEDIUM ]: 5,
  [ ThinkingLevel.HIGH ]: 8,
};

/**
 * نصوص المراحل بالعربية (افتراضية - تُستخدم عندما لا يوجد نص خاص بالوضع)
 */
export const PHASE_TEXTS: Record<ThinkingPhase, string> = {
  [ ThinkingPhase.ANALYZING ]: 'تحليل السؤال',
  [ ThinkingPhase.RESEARCHING ]: 'البحث عن المعلومات',
  [ ThinkingPhase.REASONING ]: 'الاستدلال المنطقي',
  [ ThinkingPhase.PLANNING ]: 'التخطيط للإجابة',
  [ ThinkingPhase.VALIDATING ]: 'التحقق من الدقة',
  [ ThinkingPhase.SYNTHESIZING ]: 'تجميع المعلومات',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE-SPECIFIC THINKING TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * أنواع الأوضاع المدعومة
 */
export type ThinkingMode = 'normal chat' | 'thinking' | 'deep research' | 'agent' | 'coder' | 'cways altra';

/**
 * نصوص المراحل المخصصة لكل وضع
 * كل وضع له تسميات مختلفة تعكس طبيعة عمله
 */
export const MODE_PHASE_TEXTS: Record<ThinkingMode, Record<ThinkingPhase, string>> = {
  "normal chat": {
    [ ThinkingPhase.ANALYZING ]: 'فهم الطلب',
    [ ThinkingPhase.RESEARCHING ]: 'جمع المعلومات',
    [ ThinkingPhase.REASONING ]: 'صياغة الرد',
    [ ThinkingPhase.PLANNING ]: 'تنظيم الإجابة',
    [ ThinkingPhase.VALIDATING ]: 'مراجعة النتيجة',
    [ ThinkingPhase.SYNTHESIZING ]: 'تجميع الرد',
  },
  "thinking": {
    [ ThinkingPhase.ANALYZING ]: 'تفكيك المسألة',
    [ ThinkingPhase.RESEARCHING ]: 'استكشاف الزوايا',
    [ ThinkingPhase.REASONING ]: 'بناء سلسلة الاستدلال',
    [ ThinkingPhase.PLANNING ]: 'هيكلة الحجج',
    [ ThinkingPhase.VALIDATING ]: 'فحص المنطق والثغرات',
    [ ThinkingPhase.SYNTHESIZING ]: 'تركيب الاستنتاج النهائي',
  },
  "deep research": {
    [ ThinkingPhase.ANALYZING ]: 'تحليل السؤال البحثي',
    [ ThinkingPhase.RESEARCHING ]: 'مسح المصادر والمراجع',
    [ ThinkingPhase.REASONING ]: 'تقاطع النتائج والأدلة',
    [ ThinkingPhase.PLANNING ]: 'ترتيب محاور التقرير',
    [ ThinkingPhase.VALIDATING ]: 'مراجعة علمية ودقة المعلومات',
    [ ThinkingPhase.SYNTHESIZING ]: 'كتابة التقرير النهائي',
  },
  "agent": {
    [ ThinkingPhase.ANALYZING ]: 'فهم المهمة والمتطلبات',
    [ ThinkingPhase.RESEARCHING ]: 'البحث في المصادر والأدوات',
    [ ThinkingPhase.REASONING ]: 'تحديد خطة التنفيذ',
    [ ThinkingPhase.PLANNING ]: 'تجهيز خطوات العمل',
    [ ThinkingPhase.VALIDATING ]: 'اختبار النتائج',
    [ ThinkingPhase.SYNTHESIZING ]: 'تجميع المخرجات النهائية',
  },
  "coder": {
    [ ThinkingPhase.ANALYZING ]: 'تحليل المتطلبات البرمجية',
    [ ThinkingPhase.RESEARCHING ]: 'مراجعة الكود والمكتبات',
    [ ThinkingPhase.REASONING ]: 'تصميم الحل المعماري',
    [ ThinkingPhase.PLANNING ]: 'هيكلة الكود والملفات',
    [ ThinkingPhase.VALIDATING ]: 'فحص الأخطاء والحواف',
    [ ThinkingPhase.SYNTHESIZING ]: 'توليد الكود النهائي',
  },
  "cways altra": {
    [ ThinkingPhase.ANALYZING ]: 'تحليل متعدد المسارات',
    [ ThinkingPhase.RESEARCHING ]: 'بحث عميق بالتوازي',
    [ ThinkingPhase.REASONING ]: 'استدلال متسلسل متعدد المراحل',
    [ ThinkingPhase.PLANNING ]: 'تقييم الفرضيات المتنافسة',
    [ ThinkingPhase.VALIDATING ]: 'تحقق متبادل بين المسارات',
    [ ThinkingPhase.SYNTHESIZING ]: 'تركيب الاستنتاج الأعلى ثقة',
  },
};

/**
 * ترتيب المراحل لكل وضع + عمق
 * يحدد أي مراحل تظهر (وبأي ترتيب) حسب عمق التفكير
 *
 * min    → 2 خطوات (أساسية)
 * standard→ 3 خطوات
 * extended→ 5 خطوات
 * max    → 6 خطوات (كل المراحل)
 */
export type ThinkingDepthKey = 'min' | 'standard' | 'extended' | 'max';

export const MODE_PHASE_SEQUENCE: Record<ThinkingMode, Record<ThinkingDepthKey, ThinkingPhase[]>> = {
  "normal chat": {
    min:      [ ThinkingPhase.ANALYZING, ThinkingPhase.SYNTHESIZING ],
    standard: [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING, ThinkingPhase.SYNTHESIZING ],
    extended: [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
    max:      [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
  },
  "thinking": {
    min:      [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING ],
    standard: [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING, ThinkingPhase.SYNTHESIZING ],
    extended: [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
    max:      [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
  },
  "deep research": {
    min:      [ ThinkingPhase.RESEARCHING, ThinkingPhase.SYNTHESIZING ],
    standard: [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.SYNTHESIZING ],
    extended: [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
    max:      [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
  },
  "agent": {
    min:      [ ThinkingPhase.ANALYZING, ThinkingPhase.PLANNING ],
    standard: [ ThinkingPhase.ANALYZING, ThinkingPhase.PLANNING, ThinkingPhase.SYNTHESIZING ],
    extended: [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
    max:      [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
  },
  "coder": {
    min:      [ ThinkingPhase.ANALYZING, ThinkingPhase.SYNTHESIZING ],
    standard: [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING, ThinkingPhase.SYNTHESIZING ],
    extended: [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
    max:      [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
  },
  "cways altra": {
    min:      [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING ],
    standard: [ ThinkingPhase.ANALYZING, ThinkingPhase.REASONING, ThinkingPhase.VALIDATING ],
    extended: [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
    max:      [ ThinkingPhase.ANALYZING, ThinkingPhase.RESEARCHING, ThinkingPhase.REASONING, ThinkingPhase.PLANNING, ThinkingPhase.VALIDATING, ThinkingPhase.SYNTHESIZING ],
  },
};

/**
 * الحصول على نص المرحلة حسب الوضع
 */
export function getModePhaseText ( mode: ThinkingMode, phase: ThinkingPhase ): string
{
  return MODE_PHASE_TEXTS[ mode ]?.[ phase ] ?? PHASE_TEXTS[ phase ] ?? phase;
}

/**
 * الحصول على تسلسل المراحل حسب الوضع والعمق
 */
export function getModePhases ( mode: ThinkingMode, depth: ThinkingDepthKey ): ThinkingPhase[]
{
  return MODE_PHASE_SEQUENCE[ mode ]?.[ depth ] ?? MODE_PHASE_SEQUENCE[ "thinking" ][ depth ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * الحصول على مستوى التفكير بناءً على النموذج والأدوات النشطة
 * 
 * @param model - النموذج المُختار
 * @param activeTools - الأدوات النشطة
 * @returns مستوى التفكير
 */
export function getThinkingLevel (
  model: ChatbotModel,
  activeTools: string[]
): ThinkingLevel
{
  // إذا كانت أداة Thinking أو Canvas نشطة → فرض التفكير العميق
  const hasDeepThinkingTool = activeTools.some(
    tool => tool === 'Thinking' || tool === 'Canvas'
  );

  if ( hasDeepThinkingTool )
  {
    return ThinkingLevel.HIGH;
  }

  // إرجاع المستوى الافتراضي للنموذج
  return MODEL_THINKING_LEVELS[ model ] || ThinkingLevel.LOW;
}

/**
 * هل يجب تفعيل نظام التفكير؟
 * 
 * @param isChatbotMode - هل نحن في وضع Chatbot (ليس Agents)
 * @param model - النموذج المُختار
 * @returns true إذا يجب تفعيل التفكير
 */
export function shouldEnableThinking (
  isChatbotMode: boolean,
  model: ChatbotModel
): boolean
{
  // التفكير يعمل فقط في وضع Chatbot
  return isChatbotMode && !!MODEL_THINKING_LEVELS[ model ];
}

/**
 * توليد ID فريد للخطوة
 */
export function generateStepId (): string
{
  return `step_${ Date.now() }_${ Math.random().toString( 36 ).substr( 2, 9 ) }`;
}

/**
 * حساب مدة التفكير الكلية
 */
export function calculateTotalDuration ( steps: ThinkingStep[] ): number
{
  return steps.reduce( ( total, step ) => total + ( step.duration || 0 ), 0 );
}
