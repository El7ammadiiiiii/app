/**
 * ═══════════════════════════════════════════════════════════════
 * Canvas Tool Definition — Function Calling for Intelligent UI Routing
 * ═══════════════════════════════════════════════════════════════
 *
 * تعريف أداة open_canvas لنظام Function Calling
 * يُرسل للنموذج ضمن tools array في طلب API
 * النموذج يقرر تلقائياً متى يفتح Canvas وأي نوع يستخدم
 *
 * @version 1.0.0
 */

type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'mistral' | 'meta' | 'alibaba' | 'amazon' | 'vertexMeta' | 'vertexMistral' | 'vertexGoogle';

// ═══════════════════════════════════════════════════════════════
// Tool schema — shared definition
// ═══════════════════════════════════════════════════════════════

const CANVAS_TOOL_NAME = 'open_canvas';

const CANVAS_TOOL_DESCRIPTION = `يفتح مساحة عمل مخصصة (Canvas) بناءً على طلب المستخدم ويكتب المحتوى الأولي بداخلها. يجب استخدام هذه الدالة عندما يكون الهدف الأساسي للمستخدم هو إنشاء محتوى منظم أو تفاعلي يتجاوز مجرد الرد النصي في الدردشة، مثل: كتابة كود (>10 أسطر)، مستند طويل (>500 كلمة)، تصميم صفحة ويب، عرض تقديمي، تقرير بحثي، رسم بياني، أو أي محتوى بنيوي.`;

const CANVAS_TYPE_ENUM = [
  'document',
  'code_editor',
  'web_page',
  'slides',
  'audio_summary',
  'custom_task',
  'deep_research',
  'chart_analysis',
  'data_visualization',
  'mind_map',
  'sketch_pad',
  'spreadsheet',
] as const;

const CANVAS_TYPE_DESCRIPTION = `نوع Canvas المطلوب:
- document: مستند نصي غني (مقال، تقرير، تحليل)
- code_editor: محرر كود (TypeScript, Python, أي لغة)
- web_page: صفحة ويب HTML/CSS/JS مع معاينة حية
- slides: عرض تقديمي بالشرائح (فواصل ---)
- audio_summary: نص ملخص جاهز للتحويل الصوتي
- custom_task: مهمة مخصصة أو هيكلة مشروع
- deep_research: تقرير بحثي معمق مع مصادر
- chart_analysis: تحليل فني مع رسوم بيانية
- data_visualization: تمثيل بيانات مرئي (dashboard, charts)
- mind_map: خريطة ذهنية لتنظيم أفكار
- sketch_pad: تخطيط سريع أو رسم توضيحي
- spreadsheet: جداول بيانات تفاعلية`;

const CONTENT_DESCRIPTION = `المحتوى الكامل الذي سيُعرض في Canvas. يجب أن يكون:
- لـ code_editor/web_page: كود كامل جاهز للتشغيل
- لـ document/deep_research: نص Markdown منسق بالكامل
- لـ slides: شرائح مفصولة بـ ---
- لـ data_visualization/chart_analysis: كود HTML/JSX مع مكتبات رسم
يجب أن يكون المحتوى مكتملاً وقابلاً للعرض مباشرة.`;

const TITLE_DESCRIPTION = 'عنوان قصير وواضح بالعربية يصف محتوى Canvas';

// ═══════════════════════════════════════════════════════════════
// Provider-formatted tool definitions
// ═══════════════════════════════════════════════════════════════

/** JSON Schema used by OpenAI-compatible providers */
const OPENAI_TOOL = {
  type: 'function' as const,
  function: {
    name: CANVAS_TOOL_NAME,
    description: CANVAS_TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        canvas_type: {
          type: 'string',
          enum: [...CANVAS_TYPE_ENUM],
          description: CANVAS_TYPE_DESCRIPTION,
        },
        content: {
          type: 'string',
          description: CONTENT_DESCRIPTION,
        },
        title: {
          type: 'string',
          description: TITLE_DESCRIPTION,
        },
      },
      required: ['canvas_type', 'content'],
    },
  },
};

/** Anthropic tool format */
const ANTHROPIC_TOOL = {
  name: CANVAS_TOOL_NAME,
  description: CANVAS_TOOL_DESCRIPTION,
  input_schema: {
    type: 'object',
    properties: {
      canvas_type: {
        type: 'string',
        enum: [...CANVAS_TYPE_ENUM],
        description: CANVAS_TYPE_DESCRIPTION,
      },
      content: {
        type: 'string',
        description: CONTENT_DESCRIPTION,
      },
      title: {
        type: 'string',
        description: TITLE_DESCRIPTION,
      },
    },
    required: ['canvas_type', 'content'],
  },
};

/** Google (Gemini) functionDeclarations format */
const GOOGLE_TOOL = {
  functionDeclarations: [
    {
      name: CANVAS_TOOL_NAME,
      description: CANVAS_TOOL_DESCRIPTION,
      parameters: {
        type: 'OBJECT',
        properties: {
          canvas_type: {
            type: 'STRING',
            enum: [...CANVAS_TYPE_ENUM],
            description: CANVAS_TYPE_DESCRIPTION,
          },
          content: {
            type: 'STRING',
            description: CONTENT_DESCRIPTION,
          },
          title: {
            type: 'STRING',
            description: TITLE_DESCRIPTION,
          },
        },
        required: ['canvas_type', 'content'],
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get the open_canvas tool definition formatted for a specific provider.
 * Returns the tools array/object to merge into the API request body.
 */
export function getCanvasToolDefinition(provider: Provider): {
  tools?: any[];
  toolConfig?: any;
  tool_choice?: string;
} {
  switch (provider) {
    case 'openai':
    case 'xai':
    case 'deepseek':
    case 'mistral':
    case 'meta':
    case 'vertexMeta':
    case 'vertexMistral':
      return {
        tools: [OPENAI_TOOL],
        tool_choice: 'auto',
      };

    case 'anthropic':
      return {
        tools: [ANTHROPIC_TOOL],
      };

    case 'google':
    case 'vertexGoogle':
      return {
        tools: [GOOGLE_TOOL],
        toolConfig: {
          functionCallingConfig: { mode: 'AUTO' },
        },
      };

    case 'alibaba':
      // Alibaba (DashScope) uses OpenAI-like format
      return {
        tools: [OPENAI_TOOL],
        tool_choice: 'auto',
      };

    default:
      return {
        tools: [OPENAI_TOOL],
        tool_choice: 'auto',
      };
  }
}

/** Check if a tool_call_start event is for our canvas tool */
export function isCanvasToolCall(toolName: string): boolean {
  return toolName === CANVAS_TOOL_NAME;
}

export { CANVAS_TOOL_NAME };
