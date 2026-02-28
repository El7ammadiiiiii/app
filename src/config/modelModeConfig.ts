/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODEL & MODE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نظام موحد لإدارة إعدادات النماذج والأوضاع
 * يربط كل نموذج بإعدادات مخصصة لكل وضع (mode)
 * 
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ChatMode =
    | "normal chat"
    | "thinking"
    | "deep research"  // بحث عميق متعدد المصادر
    | "agent"
    | "coder"
    | "cways altra";   // محرك استدلال متقدم

/**
 * نوع التفكير — مستوحى من أنظمة الاستدلال المتقدمة
 * none: بدون تفكير | auto: النظام يقرر | reasoning: تفكير دائم | pro: استدلال متعدد المراحل
 */
export type ReasoningType = "none" | "auto" | "reasoning" | "pro";

/**
 * عمق التفكير — 4 مستويات
 * min: أدنى | standard: عادي | extended: موسّع | max: أقصى
 */
export type ThinkingDepth = "min" | "standard" | "extended" | "max";

export type ModelName =
    | "gemini-3-pro-preview"
    | "gemini-3-flash-preview"
    | "gpt-5.2-2025-12-11"
    | "gpt-5.1-2025-11-13"
    | "gpt-5-mini-2025-08-07"
    | "kimi-k2.5"
    | "claude-opus-4-6"
    | "claude-sonnet-4-6"
    | "claude-haiku-4-5"
    | "grok-4-1-fast-reasoning"
    | "qwen3-max"
    | "DeepSeek-V3.2"
    | "mistral-medium-3"
    | "mistral-ocr-latest"
    | "llama-4-maverick"
    | "gemini-3.1-pro-preview"
    | "nova-2-pro-v1"
    | "gemini3 pro"
    | "gemini 3 flash"
    | "gemini 3.1 pro"
    | "gpt 5.2"
    | "gpt 5"
    | "claude opus 4.6"
    | "claude sonnet 4.6"
    | "claude Haiku 4.5"
    | "grok-4.1"
    | "fast grok"
    | "gpt-5.1"
    | "deepseek v3.1"
    | "llama 4"
    | "amazon-nova"
    | "gpt-5.3-codex"
    | "gpt-5.2-codex"
    | "gpt-5.1-codex-max"
    | "codestral-2"
    | "Qwen3-Coder-Plus"
    | "DeepSeek-V3.2-Speciale"
    | "llama-3.3-70b-versatile"
    | "claude-sonnet-4-6-coder"
    | "kimi-k2.5-CODE"
    | "grok-code-fast-1"
    | "gemini-3-coder";

/** @deprecated استخدم ThinkingDepth بدلاً منه */
export type ReasoningEffort = "low" | "medium" | "high";

export interface ModeConfig
{
    /** اسم النموذج الفعلي للـ API */
    apiModel: string;

    /** مستوى التفكير (reasoning) */
    reasoningEffort?: ReasoningEffort;

    /** هل يدعم البحث */
    searchEnabled?: boolean;

    /** هل يعمل كـ Agent */
    agentMode?: boolean;

    /** الأدوات المفعّلة تلقائياً */
    enabledTools?: string[];

    /** إعدادات إضافية */
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}

export interface ModelConfig
{
    /** اسم النموذج كما يظهر في الواجهة */
    displayName: ModelName;

    /** المزود (Provider) */
    provider: "google" | "openai" | "anthropic" | "xai" | "alibaba" | "deepseek" | "mistral" | "meta" | "amazon" | "vertexMeta" | "vertexMistral" | "vertexGoogle";

    /** إعدادات لكل وضع */
    modes: Partial<Record<ChatMode, ModeConfig>>;

    /** هل متاح حالياً */
    available: boolean;

    /** وصف مختصر */
    description?: string;

    /** هل النموذج يدعم Function Calling (tool calling) لفتح Canvas تلقائياً */
    supportsToolCalling?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE CONFIGURATIONS - إعدادات الأنماط العامة
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModeSettings
{
    description: string;
    /** @deprecated استخدم reasoningType + thinkingDepth */
    reasoningEffort: ReasoningEffort;
    /** نوع التفكير: none/auto/reasoning/pro */
    reasoningType: ReasoningType;
    /** العمق الافتراضي للتفكير */
    defaultDepth: ThinkingDepth;
    /** نطاق العمق المسموح للوضع — null = دائماً الافتراضي */
    depthRange: [ThinkingDepth, ThinkingDepth] | null;
    showThinkingSteps: boolean;
    searchEnabled: boolean;
    searchType?: "tavily" | "deep_research" | "altra";
    agentMode: boolean;
    enabledTools: string[];
    autoCanvas: boolean;
    /** نوع الكانفاس الافتراضي لهذا الوضع */
    canvasType?: import('@/store/canvasStore').CanvasType;
    systemPromptAddition?: string;
    temperature: number;
    maxTokens: number;
}

/**
 * إعدادات الأنماط الستة
 * كل نمط له سلوك محدد وأدوات مفعّلة
 */
export const MODE_CONFIGS: Record<ChatMode, ModeSettings> = {
    "normal chat": {
        description: "محادثة سريعة بدون overhead تفكير",
        reasoningEffort: "low",
        reasoningType: "none",
        defaultDepth: "min",
        depthRange: null,
        showThinkingSteps: false,
        searchEnabled: false,
        agentMode: false,
        enabledTools: [],
        autoCanvas: false,
        temperature: 0.7,
        maxTokens: 8192,
    },
    "thinking": {
        description: "تفكير عميق مع إظهار خطوات التحليل — تحكم كامل بالعمق",
        reasoningEffort: "high",
        reasoningType: "reasoning",
        defaultDepth: "extended",
        depthRange: ["min", "max"],
        showThinkingSteps: true,
        searchEnabled: false,
        agentMode: false,
        enabledTools: [ "Thinking" ],
        autoCanvas: false,
        temperature: 0.3,
        maxTokens: 32768,
    },
    "deep research": {
        description: "بحث عميق من 80+ مصدر — ينشئ تقرير بحثي تفاعلي في Canvas",
        reasoningEffort: "medium",
        reasoningType: "auto",
        defaultDepth: "standard",
        depthRange: ["standard", "max"],
        showThinkingSteps: true,
        searchEnabled: true,
        searchType: "deep_research",
        agentMode: false,
        enabledTools: [ "Deep Research", "Thinking", "Canvas" ],
        autoCanvas: true,
        canvasType: 'DEEP_RESEARCH',
        temperature: 0.4,
        maxTokens: 65536,
    },
    "agent": {
        description: "وكيل ذكي — يقرر عمق التفكير حسب تعقيد المهمة",
        reasoningEffort: "medium",
        reasoningType: "auto",
        defaultDepth: "standard",
        depthRange: ["min", "extended"],
        showThinkingSteps: true,
        searchEnabled: true,
        searchType: "tavily",
        agentMode: true,
        enabledTools: [ "Search", "Thinking", "Code Execution", "File Operations" ],
        autoCanvas: false,
        temperature: 0.4,
        maxTokens: 32768,
    },
    "coder": {
        description: "مطور برمجي — تفكير دائم بالكود مع عمق متغير",
        reasoningEffort: "medium",
        reasoningType: "reasoning",
        defaultDepth: "standard",
        depthRange: ["min", "max"],
        showThinkingSteps: true,
        searchEnabled: false,
        agentMode: false,
        enabledTools: [ "Canvas", "Code Execution" ],
        autoCanvas: true,
        canvasType: 'CODE_EDITOR',
        temperature: 0.2,
        maxTokens: 32768,
    },
    "cways altra": {
        description: "محرك استدلال متقدم — أقصى استدلال متعدد المراحل",
        reasoningEffort: "high",
        reasoningType: "pro",
        defaultDepth: "max",
        depthRange: ["extended", "max"],
        showThinkingSteps: true,
        searchEnabled: true,
        searchType: "altra",
        agentMode: false,
        enabledTools: [ "Search", "Thinking", "Deep Research" ],
        autoCanvas: false,
        temperature: 0.3,
        maxTokens: 65536,
    },
};

/**
 * الحصول على إعدادات النمط
 */
export function getModeSettings ( mode: ChatMode ): ModeSettings
{
    return MODE_CONFIGS[ mode ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL CALLING SUPPORT — determines which models support Function Calling
// ═══════════════════════════════════════════════════════════════════════════════

/** Models that DO NOT reliably support function calling */
const NO_TOOL_CALLING_MODELS: Set<string> = new Set([
    'llama-4-maverick',
    'llama-3.3-70b-versatile',
    'nova-2-pro-v1',
]);

/** Providers that don't support tool calling at all */
const NO_TOOL_CALLING_PROVIDERS: Set<string> = new Set([
    'amazon',  // Bedrock has limited tool support
]);

/**
 * Check if a model supports Function Calling (tool calling) for Canvas.
 * Uses a deny-list approach: all models support it EXCEPT known exceptions.
 */
export function modelSupportsToolCalling(modelKey: string): boolean {
    if (NO_TOOL_CALLING_MODELS.has(modelKey)) return false;
    const config = MODEL_CONFIGS[modelKey as ModelName];
    if (!config) return false;
    if (config.supportsToolCalling !== undefined) return config.supportsToolCalling;
    if (NO_TOOL_CALLING_PROVIDERS.has(config.provider)) return false;
    return true; // Most modern models support function calling
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const MODEL_CONFIGS: Record<ModelName, ModelConfig> = {
    // ─────────────────────────────────────────────────────────────────────────────
    // GOOGLE MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "gemini-3-pro-preview": {
        displayName: "gemini-3-pro-preview",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3 Pro Preview - أحدث نموذج من Google",
        modes: {
            "normal chat": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "gemini-3-flash-preview": {
        displayName: "gemini-3-flash-preview",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3 Flash Preview - سريع وفعال",
        modes: {
            "normal chat": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "low",
                temperature: 0.8,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "medium",
                temperature: 0.4,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.6,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
        },
    },

    "gemini-3.1-pro-preview": {
        displayName: "gemini-3.1-pro-preview",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3.1 Pro Preview - أحدث إصدار من Google عبر Vertex AI",
        modes: {
            "normal chat": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // NEW MODELS - UPDATED WITH CORRECT API NAMES
    // ═══════════════════════════════════════════════════════════════════════════════

    "kimi-k2.5": {
        displayName: "kimi-k2.5",
        provider: "alibaba",
        available: true,
        description: "Kimi K2.5 - نموذج متقدم من Moonshot AI",
        modes: {
            "normal chat": {
                apiModel: "kimi-k2.5",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "kimi-k2.5",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "kimi-k2.5",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "kimi-k2.5",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "claude-opus-4-6": {
        displayName: "Claude Opus 4.6",
        provider: "anthropic",
        available: true,
        description: "Claude Opus 4.6 - أقوى نموذج Anthropic مع Adaptive Thinking",
        modes: {
            "normal chat": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                maxTokens: 128000,
            },
            "deep research": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking" ],
                maxTokens: 128000,
            },
            "agent": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking", "Code Execution" ],
                maxTokens: 128000,
            },
            "coder": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                maxTokens: 128000,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
            "cways altra": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking", "Deep Research" ],
                maxTokens: 128000,
            },
        },
    },

    "claude-sonnet-4-6": {
        displayName: "Claude Sonnet 4.6",
        provider: "anthropic",
        available: true,
        description: "Claude Sonnet 4.6 - متوازن وقوي مع Adaptive Thinking",
        modes: {
            "normal chat": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "high",
                maxTokens: 64000,
            },
            "deep research": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                maxTokens: 64000,
            },
            "agent": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                maxTokens: 64000,
            },
            "coder": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                maxTokens: 64000,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
            "cways altra": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking", "Deep Research" ],
                maxTokens: 64000,
            },
        },
    },

    "claude-haiku-4-5": {
        displayName: "claude-haiku-4-5",
        provider: "anthropic",
        available: true,
        description: "Claude Haiku 4.5 - سريع وخفيف",
        modes: {
            "normal chat": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "low",
                temperature: 0.8,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "high",
                temperature: 0.4,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.6,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
        },
    },

    "grok-4-1-fast-reasoning": {
        displayName: "grok-4-1-fast-reasoning",
        provider: "xai",
        available: true,
        description: "Grok 4.1 Fast - نموذج xAI سريع",
        modes: {
            "normal chat": {
                apiModel: "grok-4-1-fast-reasoning",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "grok-4-1-fast-reasoning",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "grok-4-1-fast-reasoning",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "grok-4-1-fast-reasoning",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "DeepSeek-V3.2": {
        displayName: "DeepSeek-V3.2",
        provider: "deepseek",
        available: true,
        description: "DeepSeek V3.2 - نموذج متخصص في البرمجة",
        modes: {
            "normal chat": {
                apiModel: "DeepSeek-V3.2",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "DeepSeek-V3.2",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "DeepSeek-V3.2",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "DeepSeek-V3.2",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    "mistral-medium-3": {
        displayName: "mistral-medium-3",
        provider: "vertexMistral",
        available: true,
        description: "Mistral Medium 3 - نموذج متعدد المهام عبر Vertex AI",
        modes: {
            "normal chat": {
                apiModel: "mistral-medium-3",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "mistral-medium-3",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "mistral-medium-3",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "mistral-medium-3",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "llama-4-maverick": {
        displayName: "llama-4-maverick",
        provider: "vertexMeta",
        available: true,
        description: "Llama 4 Maverick - نموذج Meta عبر Vertex AI",
        modes: {
            "normal chat": {
                apiModel: "llama-4-maverick-17b-128e-instruct-maas",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "llama-4-maverick-17b-128e-instruct-maas",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "deep research": {
                apiModel: "llama-4-maverick-17b-128e-instruct-maas",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "llama-4-maverick-17b-128e-instruct-maas",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "nova-2-pro-v1": {
        displayName: "nova-2-pro-v1",
        provider: "amazon",
        available: true,
        description: "Amazon Nova 2 Pro - نموذج AWS المتقدم",
        modes: {
            "normal chat": {
                apiModel: "nova-2-pro-v1",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "nova-2-pro-v1",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "nova-2-pro-v1",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "nova-2-pro-v1",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "gemini3 pro": {
        displayName: "gemini3 pro",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3 Pro - أقوى نموذج من Google",
        modes: {
            "normal chat": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "gemini 3 flash": {
        displayName: "gemini 3 flash",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3 Flash - سريع وفعال",
        modes: {
            "normal chat": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "low",
                temperature: 0.8,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "high",
                temperature: 0.4,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.6,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "gemini-3-flash-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
        },
    },

    "gemini 3.1 pro": {
        displayName: "gemini 3.1 pro",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3.1 Pro - أحدث إصدار من Google عبر Vertex AI",
        modes: {
            "normal chat": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "gemini-3.1-pro-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 16384,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // OPENAI MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "gpt-5.2-2025-12-11": {
        displayName: "gpt-5.2-2025-12-11",
        provider: "openai",
        available: true,
        description: "GPT-5.2 (Dec 2025) - أحدث إصدار من OpenAI",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.2-2025-12-11",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "gpt-5.2-2025-12-11",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "gpt-5.2-2025-12-11",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gpt-5.2-2025-12-11",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    "gpt-5.1-2025-11-13": {
        displayName: "gpt-5.1-2025-11-13",
        provider: "openai",
        available: true,
        description: "GPT-5.1 (Nov 2025) - نموذج متطور",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.1-2025-11-13",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "gpt-5.1-2025-11-13",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "gpt-5.1-2025-11-13",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gpt-5.1-2025-11-13",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    "gpt-5-mini-2025-08-07": {
        displayName: "gpt-5-mini-2025-08-07",
        provider: "openai",
        available: true,
        description: "GPT-5 Mini (Aug 2025) - سريع وفعال",
        modes: {
            "normal chat": {
                apiModel: "gpt-5-mini-2025-08-07",
                reasoningEffort: "low",
                temperature: 0.8,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "gpt-5-mini-2025-08-07",
                reasoningEffort: "medium",
                temperature: 0.3,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "gpt-5-mini-2025-08-07",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.6,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "gpt-5-mini-2025-08-07",
                reasoningEffort: "low",
                agentMode: true,
                enabledTools: [ "Research", "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
        },
    },

    "gpt 5.2": {
        displayName: "gpt 5.2",
        provider: "openai",
        available: true,
        description: "GPT-5.2 - أحدث نموذج من OpenAI",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.2",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "gpt-5.2",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "gpt-5.2-search",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gpt-5.2",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    "gpt 5": {
        displayName: "gpt 5",
        provider: "openai",
        available: true,
        description: "GPT-5 - نموذج متطور",
        modes: {
            "normal chat": {
                apiModel: "gpt-5",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "gpt-5",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "gpt-5-search",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gpt-5",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    "gpt-5.1": {
        displayName: "gpt-5.1",
        provider: "openai",
        available: true,
        description: "GPT-5.1 - إصدار محسّن",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.1",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "gpt-5.1",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "gpt-5.1-search",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "gpt-5.1",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ANTHROPIC MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "claude opus 4.6": {
        displayName: "Claude Opus 4.6",
        provider: "anthropic",
        available: true,
        description: "Claude Opus 4.6 - أقوى نموذج Anthropic مع Adaptive Thinking",
        modes: {
            "normal chat": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                maxTokens: 128000,
            },
            "deep research": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking" ],
                maxTokens: 128000,
            },
            "agent": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking", "Code Execution" ],
                maxTokens: 128000,
            },
            "coder": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                maxTokens: 128000,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
            "cways altra": {
                apiModel: "claude-opus-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking", "Deep Research" ],
                maxTokens: 128000,
            },
        },
    },

    "claude sonnet 4.6": {
        displayName: "Claude Sonnet 4.6",
        provider: "anthropic",
        available: true,
        description: "Claude Sonnet 4.6 - متوازن وقوي مع Adaptive Thinking",
        modes: {
            "normal chat": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "high",
                maxTokens: 64000,
            },
            "deep research": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                maxTokens: 64000,
            },
            "agent": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                maxTokens: 64000,
            },
            "coder": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                maxTokens: 64000,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
            "cways altra": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking", "Deep Research" ],
                maxTokens: 64000,
            },
        },
    },

    "claude Haiku 4.5": {
        displayName: "claude Haiku 4.5",
        provider: "anthropic",
        available: true,
        description: "Claude Haiku 4.5 - سريع وخفيف",
        modes: {
            "normal chat": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "low",
                temperature: 0.8,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "high",
                temperature: 0.4,
                maxTokens: 16384,
            },
            "deep research": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.6,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "claude-haiku-4-5",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // XAI MODELS (GROK)
    // ─────────────────────────────────────────────────────────────────────────────
    "grok-4.1": {
        displayName: "grok-4.1",
        provider: "xai",
        available: true,
        description: "Grok 4.1 - نموذج xAI المتقدم",
        modes: {
            "normal chat": {
                apiModel: "grok-2-1212",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "grok-2-1212",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "grok-2-1212",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "grok-2-1212",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    "fast grok": {
        displayName: "fast grok",
        provider: "xai",
        available: true,
        description: "Fast Grok - نسخة سريعة",
        modes: {
            "normal chat": {
                apiModel: "grok-fast",
                reasoningEffort: "low",
                temperature: 0.8,
                maxTokens: 8192,
            },
            "thinking": {
                apiModel: "grok-fast",
                reasoningEffort: "high",
                temperature: 0.4,
                maxTokens: 16384,
            },            "deep research": {
                apiModel: "grok-fast",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.6,
                maxTokens: 8192,
            },
            "agent": {
                apiModel: "grok-fast",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ALIBABA MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "qwen3-max": {
        displayName: "qwen3-max",
        provider: "alibaba",
        available: true,
        description: "Qwen 3 Max - نموذج Alibaba المتقدم",
        modes: {
            "normal chat": {
                apiModel: "qwen-max-3.0",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "qwen-max-3.0",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "qwen-max-3.0",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "qwen-max-3.0",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // DEEPSEEK MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "deepseek v3.1": {
        displayName: "deepseek v3.1",
        provider: "deepseek",
        available: true,
        description: "DeepSeek V3.1 - نموذج متخصص في البرمجة",
        modes: {
            "normal chat": {
                apiModel: "deepseek-chat",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "deepseek-chat",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "deepseek-chat",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "deepseek-chat",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // MISTRAL MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────────
    // META MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "llama 4": {
        displayName: "llama 4",
        provider: "meta",
        available: true,
        description: "Llama 4 - نموذج Meta مفتوح المصدر",
        modes: {
            "normal chat": {
                apiModel: "llama-4-405b",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "llama-4-405b",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "llama-4-405b",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "llama-4-405b",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // AMAZON MODELS
    // ─────────────────────────────────────────────────────────────────────────────
    "amazon-nova": {
        displayName: "amazon-nova",
        provider: "amazon",
        available: true,
        description: "Amazon Nova - نموذج AWS",
        modes: {
            "normal chat": {
                apiModel: "amazon-nova-pro",
                reasoningEffort: "low",
                temperature: 0.7,
                maxTokens: 16384,
            },
            "thinking": {
                apiModel: "amazon-nova-pro",
                reasoningEffort: "high",
                temperature: 0.3,
                maxTokens: 32768,
            },            "deep research": {
                apiModel: "amazon-nova-pro",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.5,
                maxTokens: 16384,
            },
            "agent": {
                apiModel: "amazon-nova-pro",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "Thinking" ],
                temperature: 0.4,
                maxTokens: 32768,
            },
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // CODING-SPECIALIZED MODELS
    // ═══════════════════════════════════════════════════════════════════════════════

    "gpt-5.3-codex": {
        displayName: "gpt-5.3-codex",
        provider: "openai",
        available: true,
        description: "GPT 5.3 Codex - أحدث نموذج OpenAI للبرمجة",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.3-codex",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "gpt-5.3-codex",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "gpt-5.3-codex",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "gpt-5.3-codex",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "gpt-5.3-codex",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "gpt-5.2-codex": {
        displayName: "gpt-5.2-codex",
        provider: "openai",
        available: true,
        description: "GPT 5.2 Codex - متخصص في كتابة الأكواد",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.2-codex",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "gpt-5.2-codex",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "gpt-5.2-codex",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "gpt-5.2-codex",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "gpt-5.2-codex",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "gpt-5.1-codex-max": {
        displayName: "gpt-5.1-codex-max",
        provider: "openai",
        available: true,
        description: "GPT 5.1 Codex Max - أقصى أداء برمجي",
        modes: {
            "normal chat": {
                apiModel: "gpt-5.1-codex-max",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "gpt-5.1-codex-max",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "gpt-5.1-codex-max",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "gpt-5.1-codex-max",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "gpt-5.1-codex-max",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "codestral-2": {
        displayName: "codestral-2",
        provider: "vertexMistral",
        available: true,
        description: "Codestral 2 - نموذج Mistral المتخصص في البرمجة عبر Vertex AI",
        modes: {
            "normal chat": {
                apiModel: "codestral-2",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "codestral-2",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "codestral-2",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "codestral-2",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "codestral-2",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "Qwen3-Coder-Plus": {
        displayName: "Qwen3-Coder-Plus",
        provider: "alibaba",
        available: true,
        description: "Qwen3 Coder Plus - متخصص في البرمجة من Alibaba",
        modes: {
            "normal chat": {
                apiModel: "qwen-coder-plus",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "qwen-coder-plus",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "qwen-coder-plus",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "qwen-coder-plus",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "qwen-coder-plus",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "DeepSeek-V3.2-Speciale": {
        displayName: "DeepSeek-V3.2-Speciale",
        provider: "deepseek",
        available: true,
        description: "DeepSeek V3.2 Speciale - نسخة خاصة للبرمجة",
        modes: {
            "normal chat": {
                apiModel: "deepseek-coder",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "deepseek-coder",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "deepseek-coder",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "deepseek-coder",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "deepseek-coder",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "llama-3.3-70b-versatile": {
        displayName: "llama-3.3-70b-versatile",
        provider: "meta",
        available: true,
        description: "Llama 3.3 70B Versatile - متعدد الاستخدامات",
        modes: {
            "normal chat": {
                apiModel: "llama-3.3-70b-versatile",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "llama-3.3-70b-versatile",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "llama-3.3-70b-versatile",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "llama-3.3-70b-versatile",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "llama-3.3-70b-versatile",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "claude-sonnet-4-6-coder": {
        displayName: "Claude Sonnet 4.6 Coder",
        provider: "anthropic",
        available: true,
        description: "Claude Sonnet 4.6 Coder - متخصص في البرمجة مع Adaptive Thinking",
        modes: {
            "normal chat": {
                apiModel: "claude-sonnet-4-6",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "high",
                maxTokens: 64000,
            },
            "deep research": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                maxTokens: 64000,
            },
            "agent": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                maxTokens: 64000,
            },
            "coder": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "medium",
                maxTokens: 64000,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
            "cways altra": {
                apiModel: "claude-sonnet-4-6",
                reasoningEffort: "high",
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking", "Deep Research", "CodeAnalysis" ],
                maxTokens: 64000,
            },
        },
    },

    "kimi-k2.5-CODE": {
        displayName: "kimi-k2.5-CODE",
        provider: "alibaba",
        available: true,
        description: "Kimi K2.5 CODE - نسخة البرمجة",
        modes: {
            "normal chat": {
                apiModel: "moonshot-v1-128k",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "moonshot-v1-128k",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "moonshot-v1-128k",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "moonshot-v1-128k",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "moonshot-v1-128k",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "grok-code-fast-1": {
        displayName: "grok-code-fast-1",
        provider: "xai",
        available: true,
        description: "Grok Code Fast 1 - سريع ومتخصص في البرمجة",
        modes: {
            "normal chat": {
                apiModel: "grok-2-1212",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "grok-2-1212",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "grok-2-1212",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "grok-2-1212",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "grok-2-1212",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "gemini-3-coder": {
        displayName: "gemini-3-coder",
        provider: "vertexGoogle",
        available: true,
        description: "Gemini 3 Coder - متخصص في البرمجة",
        modes: {
            "normal chat": {
                apiModel: "gemini-3-pro-preview",
                temperature: 0.3,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "high",
                temperature: 0.2,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.3,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "gemini-3-pro-preview",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "CodeAnalysis", "Thinking" ],
                temperature: 0.3,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "gemini-3-pro-preview",
                temperature: 0.2,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "CodeAnalysis" ],
            },
        },
    },

    "mistral-ocr-latest": {
        displayName: "mistral-ocr-latest",
        provider: "vertexMistral",
        available: true,
        description: "Mistral OCR 25.05 - استخراج النصوص من المستندات والصور عبر Vertex AI",
        modes: {
            "normal chat": {
                apiModel: "mistral-ocr-2505",
                temperature: 0.1,
                maxTokens: 32768,
            },
            "thinking": {
                apiModel: "mistral-ocr-2505",
                reasoningEffort: "high",
                temperature: 0.1,
                maxTokens: 65536,
            },            "deep research": {
                apiModel: "mistral-ocr-2505",
                reasoningEffort: "medium",
                searchEnabled: true,
                enabledTools: [ "Search" ],
                temperature: 0.1,
                maxTokens: 32768,
            },
            "agent": {
                apiModel: "mistral-ocr-2505",
                reasoningEffort: "medium",
                agentMode: true,
                enabledTools: [ "Research", "Search", "OCR" ],
                temperature: 0.1,
                maxTokens: 65536,
            },
            "coder": {
                apiModel: "mistral-ocr-2505",
                temperature: 0.1,
                maxTokens: 65536,
                enabledTools: [ "Canvas", "OCR" ],
            },
        },
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * الحصول على إعدادات نموذج ووضع معين
 */
export function getModeConfig (
    modelName: ModelName,
    mode: ChatMode
): ModeConfig | null
{
    const model = MODEL_CONFIGS[ modelName ];
    if ( !model || !model.available )
    {
        console.warn( `Model ${ modelName } not available` );
        return null;
    }

    // ALTRA يعتمد على إعدادات deep research مع رفع مستوى الاستدلال
    if ( mode === "cways altra" && !model.modes[ mode ] )
    {
        const baseConfig = model.modes[ "deep research" ];
        if ( baseConfig )
        {
            return {
                ...baseConfig,
                reasoningEffort: "high" as ReasoningEffort,
                maxTokens: 65536,
                temperature: 0.3,
                searchEnabled: true,
                enabledTools: [ "Search", "Thinking", "Deep Research" ],
            };
        }
    }

    return model.modes[ mode ] ?? null;
}

/**
 * الحصول على جميع النماذج المتاحة
 */
export function getAvailableModels (): ModelName[]
{
    return Object.entries( MODEL_CONFIGS )
        .filter( ( [ _, config ] ) => config.available )
        .map( ( [ name ] ) => name as ModelName );
}

/**
 * الحصول على النماذج حسب المزود
 */
export function getModelsByProvider (
    provider: ModelConfig[ "provider" ]
): ModelName[]
{
    return Object.entries( MODEL_CONFIGS )
        .filter( ( [ _, config ] ) => config.provider === provider && config.available )
        .map( ( [ name ] ) => name as ModelName );
}

/**
 * التحقق من دعم النموذج لوضع معين
 */
export function isModeSupported (
    modelName: ModelName,
    mode: ChatMode
): boolean
{
    const model = MODEL_CONFIGS[ modelName ];
    return model?.available && !!model.modes[ mode ];
}

/**
 * الحصول على الأدوات المفعّلة لنموذج ووضع
 */
export function getEnabledTools (
    modelName: ModelName,
    mode: ChatMode
): string[]
{
    const config = getModeConfig( modelName, mode );
    return config?.enabledTools || [];
}

/**
 * بناء payload للـ API مع دعم نظام التفكير الجديد
 */
export function buildAPIPayload (
    modelName: ModelName,
    mode: ChatMode,
    messages: any[],
    overrides?: Partial<ModeConfig> & { thinkingDepth?: ThinkingDepth }
)
{
    const config = getModeConfig( modelName, mode );
    if ( !config )
    {
        throw new Error( `Configuration not found for ${ modelName } in ${ mode } mode` );
    }

    const modeSettings = MODE_CONFIGS[ mode ];
    const depth = overrides?.thinkingDepth
        ? clampThinkingDepth( mode, overrides.thinkingDepth )
        : modeSettings.defaultDepth;

    return {
        model: config.apiModel,
        messages,
        temperature: overrides?.temperature ?? config.temperature,
        max_tokens: overrides?.maxTokens ?? config.maxTokens,
        top_p: overrides?.topP ?? config.topP,
        // إضافة معلومات التفكير الجديدة
        _reasoning: {
            type: modeSettings.reasoningType,
            depth,
        },
        // إضافة reasoning effort للتوافق العكسي
        ...( config.reasoningEffort && {
            reasoning: { effort: config.reasoningEffort },
        } ),
        // إضافة search capabilities إذا مفعّل
        ...( config.searchEnabled && {
            search_enabled: true,
        } ),
        // إضافة agent mode إذا مفعّل
        ...( config.agentMode && {
            agent_mode: true,
            tools: config.enabledTools,
        } ),
    };
}

/**
 * الحصول على وصف النموذج
 */
export function getModelDescription ( modelName: ModelName ): string
{
    return MODEL_CONFIGS[ modelName ]?.description || modelName;
}

/**
 * @deprecated استخدم getModeThinkingConfig بدلاً
 * تحويل mode إلى reasoning effort (للتوافق العكسي)
 */
export function getReasoningEffortForMode ( mode: ChatMode ): ReasoningEffort
{
    switch ( mode )
    {
        case "normal chat":
            return "low";
        case "thinking":
            return "high";
        case "deep research":
            return "medium";
        case "agent":
            return "medium";
        case "coder":
            return "medium";
        case "cways altra":
            return "high";
        default:
            return "low";
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// THINKING DEPTH SYSTEM — نظام عمق التفكير
// ═════════════════════════════════════════════════════════════════════════════

/** ترتيب مستويات العمق — للمقارنة والتحقق */
export const THINKING_DEPTH_ORDER: ThinkingDepth[] = ["min", "standard", "extended", "max"];

/** وصف كل مستوى */
export const THINKING_DEPTH_META: Record<ThinkingDepth, { label: string; labelAr: string; description: string; icon: string }> = {
    min: {
        label: "Min",
        labelAr: "أدنى",
        description: "إجابة سريعة بدون تفكير عميق",
        icon: "⚡",
    },
    standard: {
        label: "Standard",
        labelAr: "عادي",
        description: "تفكير متوازن — الافتراضي لأغلب المهام",
        icon: "🧠",
    },
    extended: {
        label: "Extended",
        labelAr: "موسّع",
        description: "تفكير معمّق للمسائل المعقدة",
        icon: "🔬",
    },
    max: {
        label: "Max",
        labelAr: "أقصى",
        description: "استدلال كامل متعدد المراحل",
        icon: "🚀",
    },
};

/** خريطة عمق التفكير لعدد tokens التفكير — يُستخدم للمزودين اللي يدعمون budget_tokens */
export const THINKING_DEPTH_TOKENS: Record<ThinkingDepth, number> = {
    min: 1024,
    standard: 4096,
    extended: 10000,
    max: 32000,
};

/**
 * الحصول على إعدادات التفكير للوضع
 */
export function getModeThinkingConfig ( mode: ChatMode )
{
    const settings = MODE_CONFIGS[ mode ];
    return {
        reasoningType: settings.reasoningType,
        defaultDepth: settings.defaultDepth,
        depthRange: settings.depthRange,
        showThinkingSteps: settings.showThinkingSteps,
    };
}

/**
 * التحقق من صحة عمق التفكير ضمن النطاق المسموح للوضع
 */
export function clampThinkingDepth ( mode: ChatMode, depth: ThinkingDepth ): ThinkingDepth
{
    const settings = MODE_CONFIGS[ mode ];
    if ( !settings.depthRange ) return settings.defaultDepth;

    const [ minAllowed, maxAllowed ] = settings.depthRange;
    const order = THINKING_DEPTH_ORDER;
    const depthIdx = order.indexOf( depth );
    const minIdx = order.indexOf( minAllowed );
    const maxIdx = order.indexOf( maxAllowed );

    if ( depthIdx < minIdx ) return minAllowed;
    if ( depthIdx > maxIdx ) return maxAllowed;
    return depth;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * تحليل ذكي لتعقيد الرسالة — يحدد عمق التفكير تلقائياً
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * يحلل النص بـ heuristics متعددة:
 * 1. طول الرسالة
 * 2. عدد الأسئلة/المتطلبات
 * 3. كلمات مفتاحية تدل على التعقيد
 * 4. طلب مقارنة/تحليل/تصميم
 * 5. وجود كود أو بيانات تقنية
 */
export function analyzeQueryComplexity ( query: string, mode: ChatMode ): ThinkingDepth
{
    const settings = MODE_CONFIGS[ mode ];

    // normal chat = دائماً min
    if ( settings.reasoningType === "none" ) return "min";

    // cways altra = دائماً max
    if ( settings.reasoningType === "pro" ) return "max";

    let score = 0;
    const text = query.trim().toLowerCase();
    const len = text.length;

    // ── 1. طول الرسالة ──
    if ( len > 500 ) score += 3;
    else if ( len > 200 ) score += 2;
    else if ( len > 80 ) score += 1;

    // ── 2. عدد الأسئلة/النقاط ──
    const questionMarks = ( text.match( /[?؟]/g ) || [] ).length;
    const numberedItems = ( text.match( /^\s*\d+[\.\)]/gm ) || [] ).length;
    const bulletItems = ( text.match( /^\s*[-•*]/gm ) || [] ).length;
    const multiItems = questionMarks + numberedItems + bulletItems;
    if ( multiItems >= 4 ) score += 3;
    else if ( multiItems >= 2 ) score += 2;
    else if ( multiItems >= 1 ) score += 1;

    // ── 3. كلمات تدل على تحليل عميق (عربي + إنجليزي) ──
    const deepPatterns = /(?:تحليل|حلل|قارن|مقارنة|اشرح بالتفصيل|بالتفصيل|تفصيلي|معمق|شامل|خطوة بخطوة|صمم|معمارية|architecture|analyze|compare|contrast|in-?depth|comprehensive|step[- ]by[- ]step|detailed|explain why|pros and cons|trade-?offs|design|evaluate|assess|critique)/i;
    if ( deepPatterns.test( text ) ) score += 3;

    // ── 4. كلمات تقنية/متخصصة ──
    const techPatterns = /(?:algorithm|api|database|schema|sql|regex|docker|kubernetes|terraform|microservice|pipeline|oauth|jwt|websocket|GraphQL|REST|mutex|deadlock|race condition|big-?o|complexity|recursion|dynamic programming|خوارزم|قاعدة بيانات|معمارية|تشفير|بروتوكول)/i;
    if ( techPatterns.test( text ) ) score += 2;

    // ── 5. وجود كود ──
    const hasCode = /```|function\s|const\s|import\s|class\s|def\s|async\s|=>|SELECT\s|CREATE\s/i.test( text );
    if ( hasCode ) score += 2;

    // ── 6. طلب إبداعي معقد ──
    const creativeComplex = /(?:اكتب مقال|اكتب بحث|draft|write a|create a plan|خطة عمل|business plan|write an essay|research paper|white paper)/i;
    if ( creativeComplex.test( text ) ) score += 2;

    // ── 7. كلمات تدل على بساطة (تخفض الدرجة) ──
    const simplePatterns = /^(?:ما هو|ما هي|what is|who is|ترجم|translate|كم|how much|how many|عرّف|define|ما معنى|ما عاصمة|hi|hello|مرحبا|شكرا|thanks)/i;
    if ( simplePatterns.test( text ) && len < 100 ) score -= 2;

    // ── تحويل الدرجة إلى عمق ──
    let depth: ThinkingDepth;
    if ( score <= 1 ) depth = "min";
    else if ( score <= 4 ) depth = "standard";
    else if ( score <= 7 ) depth = "extended";
    else depth = "max";

    // ── تقييد ضمن نطاق الوضع ──
    return clampThinkingDepth( mode, depth );
}

/**
 * موديلات Anthropic التي تدعم Adaptive Thinking
 * حسب التوثيق الرسمي: Opus 4.6 و Sonnet 4.6
 */
const ANTHROPIC_ADAPTIVE_MODELS = [ "claude-opus-4-6", "claude-sonnet-4-6" ];

/**
 * تحويل ThinkingDepth إلى effort level حسب Anthropic API
 * max متاح فقط لـ Opus 4.6 — Sonnet يقف عند high
 */
function depthToAnthropicEffort ( depth: ThinkingDepth, apiModel: string ): "low" | "medium" | "high" | "max"
{
    switch ( depth )
    {
        case "min": return "low";
        case "standard": return "medium";
        case "extended": return "high";
        case "max":
            // max متاح فقط لـ Opus 4.6 حسب توثيق Anthropic
            return apiModel.includes( "opus" ) ? "max" : "high";
    }
}

/**
 * تحويل ThinkingDepth لصيغة كل مزود — يُستخدم في buildProviderPayload
 *
 * Anthropic Adaptive Thinking (Opus 4.6 / Sonnet 4.6):
 *   - thinking: { type: "adaptive" }
 *   - output_config: { effort: "low" | "medium" | "high" | "max" }
 *   - بدون temperature (يتعارض مع التفكير)
 *
 * Anthropic Legacy (Haiku 4.5 وأقدم):
 *   - thinking: { type: "enabled", budget_tokens: N }
 */
export function getProviderReasoningParams (
    provider: ModelConfig["provider"],
    reasoningType: ReasoningType,
    depth: ThinkingDepth,
    modelName?: string
): Record<string, any>
{
    // تحديد apiModel من اسم الموديل
    const apiModel = modelName ? ( MODEL_CONFIGS[ modelName as ModelName ]?.modes?.[ "normal chat" ]?.apiModel || modelName ) : "";
    const isAdaptiveModel = provider === "anthropic" && ANTHROPIC_ADAPTIVE_MODELS.some( m => apiModel.includes( m ) || modelName?.includes( m ) );

    // ═══ Anthropic Adaptive Models (Opus 4.6 / Sonnet 4.6) ═══
    // دائماً يرسلون thinking: {type: "adaptive"} حتى في normal chat
    // الموديل نفسه يقرر متى يفكر — عند effort: "low" يتجاوز التفكير للأسئلة البسيطة تلقائياً
    if ( isAdaptiveModel )
    {
        const effort = reasoningType === "none"
            ? "low"  // normal chat = effort low — الموديل يقرر إذا يحتاج يفكر
            : depthToAnthropicEffort( depth, apiModel );

        return {
            thinking: { type: "adaptive" },
            output_config: { effort },
            _isAdaptive: true,
        };
    }

    // بدون تفكير — للمزودين الآخرين وموديلات Anthropic القديمة (Haiku)
    if ( reasoningType === "none" ) return {};

    const tokens = THINKING_DEPTH_TOKENS[ depth ];

    switch ( provider )
    {
        case "openai":
            // OpenAI o-series: reasoning_effort = low/medium/high
            return {
                reasoning_effort: depth === "min" ? "low" : depth === "standard" ? "medium" : "high",
            };

        case "anthropic":
            // Legacy — Haiku 4.5 وأقدم: budget_tokens
            return {
                thinking: {
                    type: "enabled",
                    budget_tokens: tokens,
                },
            };

        case "google":
            // Google: generationConfig.thinkingConfig
            return {
                thinkingConfig: {
                    thinkingBudget: tokens,
                },
            };

        case "xai":
            // xAI/Grok: reasoning_effort
            return {
                reasoning_effort: depth === "min" ? "low" : depth === "standard" ? "medium" : "high",
            };

        case "deepseek":
            // DeepSeek: يدعم reasoning مثل OpenAI
            return {
                reasoning: { effort: depth === "min" ? "low" : depth === "standard" ? "medium" : "high" },
            };

        default:
            // Generic fallback
            return {
                reasoning: { effort: depth === "min" ? "low" : depth === "standard" ? "medium" : "high" },
            };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default MODEL_CONFIGS;
