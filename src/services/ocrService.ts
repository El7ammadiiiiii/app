/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OCR SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * خدمة لاستخراج النصوص من المستندات باستخدام Mistral OCR
 * يعمل في الخلفية مع جميع النماذج
 * 
 * @version 1.0.0
 */

export interface OCRResult
{
    success: boolean;
    text?: string;
    error?: string;
    confidence?: number;
    pageCount?: number;
    wordCount?: number;
    estimatedTokens?: number;
}

export interface OCRContext
{
    id: string;
    text: string;
    filename: string;
    pageCount: number;
    wordCount: number;
    estimatedTokens: number;
    extractedAt: number;
    confidence: number;
}

export interface OCRContext
{
    id: string;
    text: string;
    filename: string;
    pageCount: number;
    wordCount: number;
    estimatedTokens: number;
    extractedAt: number;
    confidence: number;
}

/**
 * استخراج النص من صورة أو PDF
 */
export async function extractTextFromImage (
    imageBase64: string,
    imageType: string = 'image/png'
): Promise<OCRResult>
{
    try
    {
        const MISTRAL_OCR_API_KEY = process.env.NEXT_PUBLIC_MISTRAL_OCR_API_KEY || process.env.MISTRAL_OCR_API_KEY;

        if ( !MISTRAL_OCR_API_KEY )
        {
            return {
                success: false,
                error: 'Mistral OCR API key not configured'
            };
        }

        const MISTRAL_API_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

        const response = await fetch( MISTRAL_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ MISTRAL_OCR_API_KEY }`
            },
            body: JSON.stringify( {
                model: 'pixtral-12b-2409',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Extract all text from this image. Return ONLY the extracted text, nothing else. Maintain the original formatting and structure.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${ imageType };base64,${ imageBase64 }`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 32768
            } )
        } );

        if ( !response.ok )
        {
            const errorData = await response.text();
            return {
                success: false,
                error: `OCR API error: ${ response.status } - ${ errorData }`
            };
        }

        const data = await response.json();
        const extractedText = data.choices?.[ 0 ]?.message?.content || '';

        return {
            success: true,
            text: extractedText,
            confidence: 0.95 // يمكن حسابها من response إذا توفرت
        };

    } catch ( error )
    {
        console.error( 'OCR extraction error:', error );
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * معالجة عدة صور
 */
export async function extractTextFromMultipleImages (
    images: Array<{ base64: string; type: string }>
): Promise<OCRResult>
{
    try
    {
        const results = await Promise.all(
            images.map( img => extractTextFromImage( img.base64, img.type ) )
        );

        const successResults = results.filter( r => r.success );

        if ( successResults.length === 0 )
        {
            return {
                success: false,
                error: 'Failed to extract text from any image'
            };
        }

        const combinedText = successResults
            .map( ( r, index ) => `--- صفحة ${ index + 1 } ---\n${ r.text }` )
            .join( '\n\n' );

        return {
            success: true,
            text: combinedText,
            confidence: successResults.reduce( ( sum, r ) => sum + ( r.confidence || 0 ), 0 ) / successResults.length
        };

    } catch ( error )
    {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * تحديد ما إذا كان الملف يحتاج OCR
 */
export function needsOCR ( fileType: string ): boolean
{
    const ocrTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
        'application/pdf'
    ];

    return ocrTypes.includes( fileType.toLowerCase() );
}

/**
 * تحويل ملف إلى base64
 */
export function fileToBase64 ( file: File ): Promise<string>
{
    return new Promise( ( resolve, reject ) =>
    {
        const reader = new FileReader();
        reader.onload = () =>
        {
            const result = reader.result as string;
            const base64 = result.split( ',' )[ 1 ];
            resolve( base64 );
        };
        reader.onerror = reject;
        reader.readAsDataURL( file );
    } );
}

/**
 * تحليل النص المستخرج وحساب الإحصائيات
 */
export function analyzeExtractedText ( text: string )
{
    const words = text.trim().split( /\s+/ ).filter( w => w.length > 0 ).length;
    const chars = text.length;
    const lines = text.split( '\n' ).length;

    // تقدير عدد الـ tokens (تقريبي: 1 token ≈ 4 chars)
    const estimatedTokens = Math.ceil( chars / 4 );

    return {
        wordCount: words,
        charCount: chars,
        lineCount: lines,
        estimatedTokens,
        summary: `${ words.toLocaleString( 'ar-SA' ) } كلمة • ${ lines } سطر • ~${ estimatedTokens.toLocaleString( 'ar-SA' ) } token`
    };
}

/**
 * إنشاء رسالة نظام للسياق (System Message)
 */
export function createOCRSystemMessage ( context: OCRContext ): string
{
    return `[DOCUMENT CONTEXT]
Filename: ${ context.filename }
Pages: ${ context.pageCount }
Words: ${ context.wordCount }
Confidence: ${ ( context.confidence * 100 ).toFixed( 1 ) }%

Extracted Text:
---
${ context.text }
---

The user has uploaded this document. Analyze and respond to their questions about it.`;
}

/**
 * إنشاء badge للعرض في الواجهة
 */
export function createOCRBadge ( context: OCRContext ): string
{
    const stats = analyzeExtractedText( context.text );
    return `📄 ${ context.filename } • ${ stats.summary }`;
}
