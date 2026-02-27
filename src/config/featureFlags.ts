/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FEATURE FLAGS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نظام بسيط لإدارة الميزات - مبني على نمط features[] array
 * يتيح تفعيل/تعطيل الميزات بشكل مركزي
 * 
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeatureFlag
{
    /** معرف الميزة */
    id: string;
    /** اسم عرض الميزة */
    label: string;
    /** وصف مختصر */
    description: string;
    /** هل الميزة مفعّلة */
    enabled: boolean;
    /** إصدار الإضافة */
    version?: string;
    /** تاريخ التفعيل */
    enabledSince?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURES: FeatureFlag[] = [
    {
        id: "altra_mode",
        label: "ALTRA Mode",
        description: "محرك استدلال متقدم مع تصنيف وتحليل وبحث متوازي",
        enabled: true,
        version: "1.0.0",
        enabledSince: "2025-01-01",
    },
    {
        id: "deep_research",
        label: "Deep Research",
        description: "بحث عميق من 80+ مصدر",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "coder_mode",
        label: "Coder Mode",
        description: "مطور برمجي متقدم مع Canvas",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "agent_mode",
        label: "Agent Mode",
        description: "وكيل ذكي مع أدوات متقدمة",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "thinking_mode",
        label: "Thinking Mode",
        description: "تفكير عميق مع إظهار الخطوات",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "web_search",
        label: "Web Search",
        description: "بحث سريع في الإنترنت",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "firebase_sync",
        label: "Firebase Sync",
        description: "مزامنة المحادثات مع Firebase",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "sse_streaming",
        label: "SSE Streaming",
        description: "بث مباشر للإجابات عبر Server-Sent Events",
        enabled: true,
        version: "1.0.0",
    },
    {
        id: "citation_system",
        label: "Citation System",
        description: "نظام الاستشهاد والمراجع المرقّمة",
        enabled: true,
        version: "1.0.0",
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * التحقق مما إذا كانت ميزة مفعّلة
 */
export function hasFeature ( featureId: string ): boolean
{
    const feature = FEATURES.find( f => f.id === featureId );
    return feature?.enabled ?? false;
}

/**
 * الحصول على جميع الميزات
 */
export function getFeatures (): FeatureFlag[]
{
    return [ ...FEATURES ];
}

/**
 * الحصول على الميزات المفعّلة فقط
 */
export function getEnabledFeatures (): FeatureFlag[]
{
    return FEATURES.filter( f => f.enabled );
}

/**
 * الحصول على معرفات الميزات المفعّلة
 */
export function getEnabledFeatureIds (): string[]
{
    return FEATURES.filter( f => f.enabled ).map( f => f.id );
}

/**
 * الحصول على ميزة بمعرّفها
 */
export function getFeature ( featureId: string ): FeatureFlag | undefined
{
    return FEATURES.find( f => f.id === featureId );
}

export default FEATURES;
