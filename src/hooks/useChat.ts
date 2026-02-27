/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHAT HOOK WITH MODEL/MODE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Hook موحد للتعامل مع API الدردشة
 * يدعم جميع النماذج والأوضاع
 * 
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import
    {
        getModeConfig,
        getEnabledTools,
        type ChatMode,
        type ModelName
    } from '@/config/modelModeConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message
{
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface UseChatOptions
{
    model: ModelName;
    mode: ChatMode;
    onStream?: ( chunk: string ) => void;
    onComplete?: ( fullResponse: string ) => void;
    onError?: ( error: Error ) => void;
}

interface UseChatReturn
{
    sendMessage: ( messages: Message[] ) => Promise<void>;
    isLoading: boolean;
    error: Error | null;
    abort: () => void;
    config: ReturnType<typeof getModeConfig>;
    enabledTools: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useChat ( {
    model,
    mode,
    onStream,
    onComplete,
    onError,
}: UseChatOptions ): UseChatReturn
{
    const [ isLoading, setIsLoading ] = useState( false );
    const [ error, setError ] = useState<Error | null>( null );
    const [ abortController, setAbortController ] = useState<AbortController | null>( null );

    // الحصول على التكوين
    const config = getModeConfig( model, mode );
    const enabledTools = getEnabledTools( model, mode );

    /**
     * إرسال رسالة
     */
    const sendMessage = useCallback( async ( messages: Message[] ) =>
    {
        if ( !config )
        {
            const err = new Error( `Invalid model/mode: ${ model }/${ mode }` );
            setError( err );
            onError?.( err );
            return;
        }

        // إنشاء AbortController جديد
        const controller = new AbortController();
        setAbortController( controller );
        setIsLoading( true );
        setError( null );

        try
        {
            const response = await fetch( '/api/chat/unified', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( {
                    model,
                    mode,
                    messages,
                    stream: !!onStream,
                } ),
                signal: controller.signal,
            } );

            if ( !response.ok )
            {
                const errorData = await response.json();
                throw new Error( errorData.error || 'Request failed' );
            }

            // معالجة الاستجابة
            if ( onStream && response.body )
            {
                // Streaming mode
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';

                while ( true )
                {
                    const { done, value } = await reader.read();
                    if ( done ) break;

                    const chunk = decoder.decode( value, { stream: true } );
                    fullResponse += chunk;
                    onStream( chunk );
                }

                onComplete?.( fullResponse );
            } else
            {
                // Non-streaming mode
                const data = await response.json();
                const content = extractContent( data, config.apiModel );
                onComplete?.( content );
            }

        } catch ( err: any )
        {
            if ( err.name === 'AbortError' )
            {
                console.log( 'Request aborted' );
            } else
            {
                setError( err );
                onError?.( err );
            }
        } finally
        {
            setIsLoading( false );
            setAbortController( null );
        }
    }, [ model, mode, config, onStream, onComplete, onError ] );

    /**
     * إلغاء الطلب
     */
    const abort = useCallback( () =>
    {
        if ( abortController )
        {
            abortController.abort();
            setAbortController( null );
            setIsLoading( false );
        }
    }, [ abortController ] );

    return {
        sendMessage,
        isLoading,
        error,
        abort,
        config,
        enabledTools,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * استخراج المحتوى من الاستجابة حسب المزود
 */
function extractContent ( data: any, apiModel: string ): string
{
    // OpenAI / xAI / DeepSeek / Mistral format
    if ( data.choices?.[ 0 ]?.message?.content )
    {
        return data.choices[ 0 ].message.content;
    }

    // Anthropic format
    if ( data.content?.[ 0 ]?.text )
    {
        return data.content[ 0 ].text;
    }

    // Google format
    if ( data.candidates?.[ 0 ]?.content?.parts?.[ 0 ]?.text )
    {
        return data.candidates[ 0 ].content.parts[ 0 ].text;
    }

    // Alibaba format
    if ( data.output?.text )
    {
        return data.output.text;
    }

    // Fallback
    return JSON.stringify( data );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default useChat;
