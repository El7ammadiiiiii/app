/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANVAS EDIT API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * API لتعديل Canvas content بالذكاء الاصطناعي
 * مثل نظام Claude Canvas
 * 
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { getModeConfig, buildAPIPayload, MODEL_CONFIGS, type ModelName } from '@/config/modelModeConfig';

interface EditRequest
{
    canvasId: string;
    currentContent: string;
    selectedText?: string;
    editPrompt: string;
    messageId: string;
    model: ModelName;
}

export async function POST ( request: NextRequest )
{
    try
    {
        const body: EditRequest = await request.json();
        const { currentContent, selectedText, editPrompt, model } = body;

        if ( !editPrompt || !model )
        {
            return new Response( 'Missing required fields', { status: 400 } );
        }

        // Get model configuration
        const config = getModeConfig( model, 'normal chat' );
        if ( !config )
        {
            return new Response( 'Invalid model', { status: 400 } );
        }

        // Build AI prompt for editing
        const systemPrompt = `You are a code/text editor AI. When given content and edit instructions:
1. Apply the requested changes precisely
2. Maintain code style and formatting
3. Only modify what's necessary
4. Return ONLY the modified content, no explanations
5. If editing a selection, return the entire updated content`;

        const userPrompt = selectedText
            ? `Current content:\n\`\`\`\n${ currentContent }\n\`\`\`\n\nSelected text:\n\`\`\`\n${ selectedText }\n\`\`\`\n\nEdit instruction: ${ editPrompt }\n\nProvide the complete updated content:`
            : `Current content:\n\`\`\`\n${ currentContent }\n\`\`\`\n\nEdit instruction: ${ editPrompt }\n\nProvide the complete updated content:`;

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: userPrompt },
        ];

        // Call AI API
        const payload = buildAPIPayload( model, 'normal chat', messages );

        // Get API endpoint and key based on provider
        const provider = MODEL_CONFIGS[ model as ModelName ]?.provider;

        // Handle specific model API keys
        let apiKey: string | undefined;
        const keyMap: Record<string, string | undefined> = {
            'gemini-3-pro-preview': process.env.GEMINI_3_PRO_API_KEY,
            'gemini-3-flash-preview': process.env.GEMINI_3_FLASH_API_KEY,
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
            'mistral-large-latest': process.env.MISTRAL_LARGE_API_KEY,
            'mistral-ocr-latest': process.env.MISTRAL_OCR_API_KEY,
            'llama-4-maverick': process.env.LLAMA_4_API_KEY,
            'nova-2-pro-v1': process.env.NOVA_2_PRO_API_KEY,
            // Coding-specialized models
            'gpt-5.2-codex': process.env.GPT_5_2_CODEX_API_KEY,
            'gpt-5.1-codex-max': process.env.GPT_5_1_CODEX_MAX_API_KEY,
            'devstral-medium-latest': process.env.DEVSTRAL_MEDIUM_API_KEY,
            'Qwen3-Coder-Plus': process.env.QWEN3_CODER_PLUS_API_KEY,
            'DeepSeek-V3.2-Speciale': process.env.DEEPSEEK_V32_SPECIALE_API_KEY,
            'llama-3.3-70b-versatile': process.env.LLAMA_33_70B_API_KEY,
            'claude-sonnet-4-6-coder': process.env.CLAUDE_SONNET_46_CODER_API_KEY,
            'kimi-k2.5-CODE': process.env.KIMI_K25_CODE_API_KEY,
            'grok-code-fast-1': process.env.GROK_CODE_FAST_1_API_KEY,
            'gemini-3-coder': process.env.GEMINI_3_CODER_API_KEY,
        };

        apiKey = keyMap[ model ] || process.env[ `${ provider.toUpperCase() }_API_KEY` ];

        if ( !apiKey )
        {
            return new Response( `${ provider } API key not configured`, { status: 500 } );
        }

        // For simplicity, we'll use a unified approach
        // In production, use the unified API route
        const apiEndpoints: Record<string, string> = {
            google: 'https://generativelanguage.googleapis.com/v1beta/models',
            openai: 'https://api.openai.com/v1/chat/completions',
            anthropic: 'https://api.anthropic.com/v1/messages',
            xai: 'https://api.x.ai/v1/chat/completions',
            deepseek: 'https://api.deepseek.com/v1/chat/completions',
        };

        const endpoint = apiEndpoints[ provider ];
        if ( !endpoint )
        {
            return new Response( `Provider ${ provider } not supported`, { status: 500 } );
        }

        // Make API call (simplified for OpenAI-compatible APIs)
        const response = await fetch( endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ apiKey }`,
            },
            body: JSON.stringify( {
                model: payload.model,
                messages: payload.messages,
                stream: true,
                temperature: 0.3, // Lower temperature for precise edits
                max_tokens: 4000,
            } ),
        } );

        if ( !response.ok )
        {
            const error = await response.text();
            console.error( 'AI API error:', error );
            return new Response( 'AI API error', { status: 500 } );
        }

        // Stream the response — re-wrap as proper SSE format for client compatibility
        const encoder = new TextEncoder();
        const stream = new ReadableStream( {
            async start ( controller )
            {
                const reader = response.body?.getReader();
                if ( !reader )
                {
                    controller.enqueue( encoder.encode( 'data: [DONE]\n\n' ) );
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = '';

                try
                {
                    while ( true )
                    {
                        const { done, value } = await reader.read();
                        if ( done ) break;

                        buffer += decoder.decode( value, { stream: true } );
                        const lines = buffer.split( '\n' );
                        buffer = lines.pop() || '';

                        for ( const line of lines )
                        {
                            if ( line.startsWith( 'data: ' ) )
                            {
                                const data = line.slice( 6 );
                                if ( data === '[DONE]' ) continue;

                                try
                                {
                                    const parsed = JSON.parse( data );
                                    const content = parsed.choices?.[ 0 ]?.delta?.content || '';
                                    if ( content )
                                    {
                                        // Re-wrap as SSE JSON so client can parse it
                                        controller.enqueue( encoder.encode( `data: ${JSON.stringify({ content })}\n\n` ) );
                                    }
                                } catch ( e )
                                {
                                    // Ignore parse errors
                                }
                            }
                        }
                    }

                    controller.enqueue( encoder.encode( 'data: [DONE]\n\n' ) );
                    controller.close();
                } catch ( error )
                {
                    console.error( 'Stream error:', error );
                    controller.error( error );
                }
            },
        } );

        return new Response( stream, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        } );
    } catch ( error )
    {
        console.error( 'Canvas edit API error:', error );
        return new Response( 'Internal server error', { status: 500 } );
    }
}
