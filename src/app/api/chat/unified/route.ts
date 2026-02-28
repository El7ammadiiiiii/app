/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED CHAT API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نقطة نهاية موحدة لجميع النماذج والأوضاع
 * يستخدم modelModeConfig للحصول على الإعدادات الصحيحة
 * 
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import
{
    getModeConfig,
    buildAPIPayload,
    type ChatMode,
    type ModelName,
    type ThinkingDepth,
    MODEL_CONFIGS,
    MODE_CONFIGS,
    getProviderReasoningParams,
    clampThinkingDepth,
    analyzeQueryComplexity,
    modelSupportsToolCalling,
} from '@/config/modelModeConfig';
import { createBlockTransformer } from '@/lib/sse/blockStreamTransformer';
import { getCanvasToolDefinition } from '@/lib/ai/tools/canvasToolDefinition';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatRequest
{
    model: ModelName;
    mode: ChatMode;
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    stream?: boolean;
    thinkingDepth?: ThinkingDepth;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const API_ENDPOINTS = {
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    xai: 'https://api.x.ai/v1/chat/completions',
    alibaba: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
    meta: 'https://api.together.xyz/v1/chat/completions', // أو أي endpoint آخر
    vertexMeta: 'https://us-east5-aiplatform.googleapis.com/v1beta1/projects/ccways-5a160/locations/us-east5/endpoints/openapi/chat/completions',
    vertexMistral: 'https://us-central1-aiplatform.googleapis.com/v1/projects/ccways-5a160/locations/us-central1/publishers/mistralai/models',
    vertexGoogle: 'https://us-central1-aiplatform.googleapis.com/v1/projects/ccways-5a160/locations/us-central1/publishers/google/models',
    amazon: 'https://bedrock-runtime.us-east-1.amazonaws.com/model', // AWS Bedrock
};

// API Keys (يجب وضعها في .env)
const API_KEYS = {
    google: process.env.GOOGLE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    xai: process.env.XAI_API_KEY,
    alibaba: process.env.ALIBABA_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    meta: process.env.META_API_KEY,
    vertexMeta: process.env.VERTEX_AI_API_KEY,
    vertexMistral: process.env.VERTEX_MISTRAL_API_KEY,
    vertexGoogle: process.env.VERTEX_GOOGLE_API_KEY,
    amazon: process.env.AWS_ACCESS_KEY_ID,
    // Specific model keys
    'gemini-3-pro-preview': process.env.VERTEX_GEMINI3_PRO_API_KEY,
    'gemini-3-flash-preview': process.env.VERTEX_GEMINI3_FLASH_API_KEY,
    'gemini-3.1-pro-preview': process.env.VERTEX_GEMINI31_PRO_API_KEY,
    'gpt-5.2-2025-12-11': process.env.GPT_5_2_API_KEY,
    'gpt-5.1-2025-11-13': process.env.GPT_5_1_API_KEY,
    'gpt-5-mini-2025-08-07': process.env.GPT_5_MINI_API_KEY,
    'kimi-k2.5': process.env.KIMI_K25_API_KEY,
    'claude-opus-4-6': process.env.CLAUDE_OPUS_46_API_KEY,
    'claude-sonnet-4-6': process.env.CLAUDE_SONNET_46_API_KEY,
    'claude-haiku-4-5': process.env.CLAUDE_HAIKU_45_API_KEY,
    'grok-4-1-fast-reasoning': process.env.GROK_41_FAST_API_KEY,
    'qwen3-max': process.env.QWEN3_MAX_API_KEY,
    'DeepSeek-V3.2': process.env.DEEPSEEK_V32_API_KEY,
    'mistral-medium-3': process.env.VERTEX_MISTRAL_MEDIUM3_API_KEY,
    'mistral-ocr-latest': process.env.VERTEX_MISTRAL_OCR_API_KEY,
    'llama-4-maverick': process.env.VERTEX_AI_API_KEY,
    'nova-2-pro-v1': process.env.NOVA_2_PRO_API_KEY,
    // Coding-specialized model keys
    'gpt-5.3-codex': process.env.GPT_53_CODEX_API_KEY,
    'gpt-5.2-codex': process.env.GPT_5_2_CODEX_API_KEY,
    'gpt-5.1-codex-max': process.env.GPT_5_1_CODEX_MAX_API_KEY,
    'codestral-2': process.env.VERTEX_CODESTRAL2_API_KEY,
    'Qwen3-Coder-Plus': process.env.QWEN3_CODER_PLUS_API_KEY,
    'DeepSeek-V3.2-Speciale': process.env.DEEPSEEK_V32_SPECIALE_API_KEY,
    'llama-3.3-70b-versatile': process.env.LLAMA_33_70B_API_KEY,
    'claude-sonnet-4-6-coder': process.env.CLAUDE_SONNET_46_CODER_API_KEY,
    'kimi-k2.5-CODE': process.env.KIMI_K25_CODE_API_KEY,
    'grok-code-fast-1': process.env.GROK_CODE_FAST_1_API_KEY,
    'gemini-3-coder': process.env.VERTEX_GEMINI3_CODER_API_KEY,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER-SPECIFIC API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function callGoogleAPI ( payload: any, stream: boolean, reasoningParams?: Record<string, any>, canvasTools?: any )
{
    // Get API key for specific model or default
    const apiKey = API_KEYS[ payload.model as keyof typeof API_KEYS ] || API_KEYS.google;
    if ( !apiKey ) throw new Error( 'Google API key not configured' );

    const url = `${ API_ENDPOINTS.google }/${ payload.model }:${ stream ? 'streamGenerateContent' : 'generateContent' }?key=${ apiKey }`;

    // تحويل الرسائل لصيغة Google
    const contents = payload.messages.map( ( msg: any ) => ( {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [ { text: msg.content } ],
    } ) );

    const requestBody: any = {
        contents,
        generationConfig: {
            temperature: payload.temperature,
            maxOutputTokens: payload.max_tokens,
            topP: payload.top_p,
            // Google thinkingConfig — يُمرر فقط إذا موجود
            ...( reasoningParams?.thinkingConfig && {
                thinkingConfig: reasoningParams.thinkingConfig,
            } ),
        },
    };

    // Canvas Function Calling tools
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.toolConfig ) {
            requestBody.toolConfig = canvasTools.toolConfig;
        }
    }

    const response = await fetch( url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callOpenAIAPI ( payload: any, stream: boolean, reasoningParams?: Record<string, any>, canvasTools?: any )
{
    // Get API key for specific model or default
    const apiKey = API_KEYS[ payload.model as keyof typeof API_KEYS ] || API_KEYS.openai;
    if ( !apiKey ) throw new Error( 'OpenAI API key not configured' );

    // إزالة الحقول الداخلية وإضافة reasoning بصيغة OpenAI
    const { _reasoning, reasoning, ...cleanPayload } = payload;
    const requestBody: any = {
        ...cleanPayload,
        ...( reasoningParams || {} ),
        stream,
    };

    // Canvas Function Calling tools
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }

    const response = await fetch( API_ENDPOINTS.openai, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ apiKey }`,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callAnthropicAPI ( payload: any, stream: boolean, reasoningParams?: Record<string, any>, canvasTools?: any )
{
    // مفتاح خاص بالموديل مع fallback للمفتاح العام
    const modelKey = API_KEYS[ payload.model as keyof typeof API_KEYS ];
    const apiKey = modelKey || API_KEYS.anthropic;
    if ( !apiKey ) throw new Error( 'Anthropic API key not configured' );

    // فصل system message
    const systemMessage = payload.messages.find( ( m: any ) => m.role === 'system' );
    const messages = payload.messages.filter( ( m: any ) => m.role !== 'system' );

    // Adaptive Thinking: حذف temperature عند تفعيل التفكير (يتعارض حسب توثيق Anthropic)
    const isThinkingEnabled = !!reasoningParams?.thinking;
    const isAdaptive = !!reasoningParams?._isAdaptive;

    // بناء body الطلب
    const requestBody: Record<string, any> = {
        model: payload.model,
        messages,
        max_tokens: payload.max_tokens,
        stream,
        ...( systemMessage && { system: systemMessage.content } ),
    };

    // temperature: يُضاف فقط إذا التفكير غير مفعّل (تعارض حسب توثيق Anthropic)
    if ( !isThinkingEnabled && payload.temperature !== undefined )
    {
        requestBody.temperature = payload.temperature;
    }

    // Anthropic Thinking params
    if ( reasoningParams?.thinking )
    {
        requestBody.thinking = reasoningParams.thinking;
    }

    // Adaptive Thinking: output_config مع effort parameter
    if ( reasoningParams?.output_config )
    {
        requestBody.output_config = reasoningParams.output_config;
    }

    // Canvas Function Calling tools
    if ( canvasTools?.tools ) {
        requestBody.tools = [ ...( requestBody.tools || [] ), ...canvasTools.tools ];
    }

    const response = await fetch( API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callXAIAPI ( payload: any, stream: boolean, reasoningParams?: Record<string, any>, canvasTools?: any )
{
    const apiKey = API_KEYS.xai;
    if ( !apiKey ) throw new Error( 'xAI API key not configured' );

    const { _reasoning, reasoning, ...cleanPayload } = payload;
    const requestBody: any = {
        ...cleanPayload,
        ...( reasoningParams || {} ),
        stream,
    };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }
    const response = await fetch( API_ENDPOINTS.xai, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ apiKey }`,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callAlibabaAPI ( payload: any, stream: boolean, canvasTools?: any )
{
    const apiKey = API_KEYS.alibaba;
    if ( !apiKey ) throw new Error( 'Alibaba API key not configured' );

    const requestBody: any = {
        model: payload.model,
        input: {
            messages: payload.messages,
        },
        parameters: {
            temperature: payload.temperature,
            max_tokens: payload.max_tokens,
            incremental_output: stream,
        },
    };
    if ( canvasTools?.tools ) {
        requestBody.input.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.input.tool_choice = canvasTools.tool_choice;
    }
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ apiKey }`,
    };
    if ( stream ) {
        headers[ 'X-DashScope-SSE' ] = 'enable';
    }
    const response = await fetch( API_ENDPOINTS.alibaba, {
        method: 'POST',
        headers,
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callDeepSeekAPI ( payload: any, stream: boolean, reasoningParams?: Record<string, any>, canvasTools?: any )
{
    const apiKey = API_KEYS.deepseek;
    if ( !apiKey ) throw new Error( 'DeepSeek API key not configured' );

    const { _reasoning, reasoning, ...cleanPayload } = payload;
    const requestBody: any = {
        ...cleanPayload,
        ...( reasoningParams || {} ),
        stream,
    };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }
    const response = await fetch( API_ENDPOINTS.deepseek, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ apiKey }`,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callMistralAPI ( payload: any, stream: boolean, canvasTools?: any )
{
    const apiKey = API_KEYS.mistral;
    if ( !apiKey ) throw new Error( 'Mistral API key not configured' );

    const requestBody: any = { ...payload, stream };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }
    const response = await fetch( API_ENDPOINTS.mistral, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ apiKey }`,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callMetaAPI ( payload: any, stream: boolean, canvasTools?: any )
{
    const apiKey = API_KEYS.meta;
    if ( !apiKey ) throw new Error( 'Meta API key not configured' );

    const requestBody: any = { ...payload, stream };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }
    const response = await fetch( API_ENDPOINTS.meta, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ apiKey }`,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callVertexMetaAPI ( payload: any, stream: boolean, canvasTools?: any )
{
    const apiKey = API_KEYS.vertexMeta || API_KEYS[ payload.model as keyof typeof API_KEYS ];
    if ( !apiKey ) throw new Error( 'Vertex AI API key not configured' );

    const requestBody: any = {
        model: `meta/${ payload.model }`,
        messages: payload.messages,
        max_tokens: payload.max_tokens || 16384,
        temperature: payload.temperature || 0.7,
        stream,
        extra_body: {
            google: {
                model_safety_settings: {
                    enabled: false,
                    llama_guard_settings: {},
                },
            },
        },
    };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }
    const response = await fetch( API_ENDPOINTS.vertexMeta, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callVertexGoogleAPI ( payload: any, stream: boolean, reasoningParams?: Record<string, any>, canvasTools?: any )
{
    const apiKey = API_KEYS[ payload.model as keyof typeof API_KEYS ] || API_KEYS.vertexGoogle;
    if ( !apiKey ) throw new Error( 'Vertex AI Google API key not configured' );

    const url = `${ API_ENDPOINTS.vertexGoogle }/${ payload.model }:${ stream ? 'streamGenerateContent' : 'generateContent' }`;

    // تحويل الرسائل لصيغة Google
    const contents = payload.messages.map( ( msg: any ) => ( {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [ { text: msg.content } ],
    } ) );

    const requestBody: any = {
        contents,
        generationConfig: {
            temperature: payload.temperature,
            maxOutputTokens: payload.max_tokens,
            topP: payload.top_p,
            ...( reasoningParams?.thinkingConfig && {
                thinkingConfig: reasoningParams.thinkingConfig,
            } ),
        },
    };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.toolConfig ) requestBody.toolConfig = canvasTools.toolConfig;
    }
    const response = await fetch( url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callVertexMistralAPI ( payload: any, stream: boolean, canvasTools?: any )
{
    const apiKey = API_KEYS[ payload.model as keyof typeof API_KEYS ] || API_KEYS.vertexMistral;
    if ( !apiKey ) throw new Error( 'Vertex AI Mistral API key not configured' );

    const modelName = payload.model;
    const action = stream ? 'streamRawPredict' : 'rawPredict';
    const url = `${ API_ENDPOINTS.vertexMistral }/${ modelName }:${ action }`;

    const requestBody: any = {
        model: modelName,
        messages: payload.messages,
        max_tokens: payload.max_tokens || 16384,
        temperature: payload.temperature || 0.7,
        stream,
    };
    if ( canvasTools?.tools ) {
        requestBody.tools = canvasTools.tools;
        if ( canvasTools.tool_choice ) requestBody.tool_choice = canvasTools.tool_choice;
    }
    const response = await fetch( url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify( requestBody ),
    } );

    return response;
}

async function callAmazonAPI ( payload: any, stream: boolean ): Promise<Response>
{
    const apiKey = API_KEYS.amazon;
    if ( !apiKey ) throw new Error( 'Amazon API key not configured' );

    // AWS Bedrock requires special handling
    // This is a placeholder - actual implementation needs AWS SDK
    throw new Error( 'Amazon Bedrock integration requires AWS SDK setup' );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL NAME RESOLVER - maps ChatInputBox display names → MODEL_CONFIGS keys
// ═══════════════════════════════════════════════════════════════════════════════

// Display names from ChatInputBox → MODEL_CONFIGS keys
const DISPLAY_NAME_MAP: Record<string, ModelName> = {
    // General models (ChatInputBox display → config key)
    "gemini 3 pro": "gemini3 pro" as ModelName,
    "gemini 3 flash": "gemini 3 flash" as ModelName,
    "gemini 3.1 pro": "gemini 3.1 pro" as ModelName,
    "gpt 5.2": "gpt 5.2" as ModelName,
    "gpt 5": "gpt 5" as ModelName,
    "claude opus 4.6": "claude opus 4.6" as ModelName,
    "claude sonnet 4.6": "claude sonnet 4.6" as ModelName,
    "claude haiku 4.5": "claude Haiku 4.5" as ModelName,
    "grok-4.1": "grok-4.1" as ModelName,
    "fast grok": "fast grok" as ModelName,
    "gpt-5.1": "gpt-5.1" as ModelName,
    "qwen3-max": "qwen3-max" as ModelName,
    "deepseek v3.1": "deepseek v3.1" as ModelName,
    "mistral-medium-3": "mistral-medium-3" as ModelName,
    "llama 4": "llama 4" as ModelName,
    "amazon-nova": "amazon-nova" as ModelName,
    // Coder models (ChatInputBox display → config key)
    "gpt 5.2 codex": "gpt-5.2-codex" as ModelName,
    "gpt 5.3 codex": "gpt-5.3-codex" as ModelName,
    "gpt 5.1 codex max": "gpt-5.1-codex-max" as ModelName,
    "codestral-2": "codestral-2" as ModelName,
    "qwen3 coder": "Qwen3-Coder-Plus" as ModelName,
    "deepseek coder": "DeepSeek-V3.2-Speciale" as ModelName,
    "llama coder": "llama-3.3-70b-versatile" as ModelName,
    "claude sonnet 4.6 coder": "claude-sonnet-4-6-coder" as ModelName,
    "kimi k2.5 coder": "kimi-k2.5-CODE" as ModelName,
    "grok coder": "grok-code-fast-1" as ModelName,
    "gemini 3 coder": "gemini-3-coder" as ModelName,
};

function resolveModelName ( raw: string ): ModelName
{
    // Direct hit (exact match with config key)
    if ( MODEL_CONFIGS[ raw as ModelName ] ) return raw as ModelName;

    // Display name lookup (case-insensitive)
    const lower = raw.toLowerCase();
    const mapped = DISPLAY_NAME_MAP[ lower ];
    if ( mapped && MODEL_CONFIGS[ mapped ] ) return mapped;

    // Case-insensitive fallback search through all config keys
    for ( const key of Object.keys( MODEL_CONFIGS ) )
    {
        if ( key.toLowerCase() === lower ) return key as ModelName;
    }

    // Final fallback: return as-is
    return raw as ModelName;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST ( request: NextRequest )
{
    try
    {
        const body: ChatRequest = await request.json();
        const { model: rawModel, mode, messages, stream = false, thinkingDepth } = body;

        // التحقق من صحة المدخلات
        if ( !rawModel || !mode || !messages )
        {
            return NextResponse.json(
                { error: 'Missing required fields: model, mode, messages' },
                { status: 400 }
            );
        }

        // Resolve display name → MODEL_CONFIGS key (case-insensitive)
        const model = resolveModelName( rawModel );

        // الحصول على التكوين
        const config = getModeConfig( model, mode );
        if ( !config )
        {
            return NextResponse.json(
                { error: `Invalid model/mode combination: ${ model }/${ mode }` },
                { status: 400 }
            );
        }

        // ALTRA Mode - يُعالج بشكل منفصل عبر /api/altra
        if ( mode === "cways altra" )
        {
            return NextResponse.json(
                {
                    redirect: '/api/altra',
                    message: 'ALTRA mode uses dedicated SSE endpoint at /api/altra',
                    mode: 'cways altra',
                },
                { status: 200 }
            );
        }

        // بناء payload مع عمق التفكير
        const payload = buildAPIPayload( model, mode, messages, thinkingDepth ? { thinkingDepth } : undefined );

        // الحصول على المزود
        const modelConfig = MODEL_CONFIGS[ model ];
        const provider = modelConfig.provider;

        // حساب reasoning params خاصة بالمزود
        const modeSettings = MODE_CONFIGS[ mode ];
        const lastUserMessage = messages.filter( ( m: any ) => m.role === 'user' ).pop()?.content ?? '';
        const effectiveDepth = thinkingDepth
            ? clampThinkingDepth( mode, thinkingDepth )
            : analyzeQueryComplexity( lastUserMessage, mode );
        const reasoningParams = getProviderReasoningParams( provider, modeSettings.reasoningType, effectiveDepth, model );

        // Canvas Tool Calling — inject tools for models that support it
        const useToolCalling = modelSupportsToolCalling( model );
        const canvasTools = useToolCalling ? getCanvasToolDefinition( provider ) : null;

        // استدعاء API المناسب
        let response: Response;

        switch ( provider )
        {
            case 'google':
                response = await callGoogleAPI( payload, stream, reasoningParams, canvasTools );
                break;
            case 'openai':
                response = await callOpenAIAPI( payload, stream, reasoningParams, canvasTools );
                break;
            case 'anthropic':
                response = await callAnthropicAPI( payload, stream, reasoningParams, canvasTools );
                break;
            case 'xai':
                response = await callXAIAPI( payload, stream, reasoningParams, canvasTools );
                break;
            case 'alibaba':
                response = await callAlibabaAPI( payload, stream, canvasTools );
                break;
            case 'deepseek':
                response = await callDeepSeekAPI( payload, stream, reasoningParams, canvasTools );
                break;
            case 'mistral':
                response = await callMistralAPI( payload, stream, canvasTools );
                break;
            case 'meta':
                response = await callMetaAPI( payload, stream, canvasTools );
                break;
            case 'amazon':
                response = await callAmazonAPI( payload, stream );
                break;
            case 'vertexMeta':
                response = await callVertexMetaAPI( payload, stream, canvasTools );
                break;
            case 'vertexGoogle':
                response = await callVertexGoogleAPI( payload, stream, reasoningParams, canvasTools );
                break;
            case 'vertexMistral':
                response = await callVertexMistralAPI( payload, stream, canvasTools );
                break;
            default:
                return NextResponse.json(
                    { error: `Unsupported provider: ${ provider }` },
                    { status: 400 }
                );
        }

        // إرجاع الاستجابة
        if ( stream )
        {
            // Wave 7.2: pipe raw provider SSE through block-level normalizer
            const blockStream = response.body
                ? response.body.pipeThrough( createBlockTransformer( provider, model ) )
                : response.body;

            return new Response( blockStream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            } );
        } else
        {
            // للـ non-streaming، نعيد JSON
            const data = await response.json();
            return NextResponse.json( data );
        }

    } catch ( error: any )
    {
        console.error( 'Chat API Error:', error );
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET HANDLER (للمعلومات)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET ()
{
    return NextResponse.json( {
        status: 'ok',
        version: '1.0.0',
        description: 'Unified Chat API - supports all models and modes',
        supportedProviders: Object.keys( API_ENDPOINTS ),
    } );
}
