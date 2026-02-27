/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OCR API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * نقطة نهاية لاستخراج النصوص من المستندات
 * يعمل في الخلفية مع جميع النماذج
 * 
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

const MISTRAL_OCR_API_KEY = process.env.MISTRAL_OCR_API_KEY;
const MISTRAL_API_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

interface OCRRequestBody
{
    images: Array<{ base64: string; type: string }> | { base64: string; type: string };
    mode?: 'single' | 'multiple';
}

export async function POST ( request: NextRequest )
{
    try
    {
        const body: OCRRequestBody = await request.json();
        const { images, mode = 'single' } = body;

        if ( !MISTRAL_OCR_API_KEY )
        {
            return NextResponse.json(
                { error: 'Mistral OCR API key not configured' },
                { status: 500 }
            );
        }

        if ( !images || ( Array.isArray( images ) && images.length === 0 ) )
        {
            return NextResponse.json(
                { error: 'No images provided' },
                { status: 400 }
            );
        }

        // تحويل إلى array إذا لم يكن
        const imageArray = Array.isArray( images ) ? images : [ images ];

        // معالجة الصور
        if ( mode === 'multiple' && imageArray.length > 1 )
        {
            // معالجة عدة صور
            const results = await Promise.all(
                imageArray.map( async ( img, index ) =>
                {
                    const result = await extractText( img.base64, img.type );
                    return {
                        ...result,
                        pageNumber: index + 1
                    };
                } )
            );

            const successResults = results.filter( r => r.success );

            if ( successResults.length === 0 )
            {
                return NextResponse.json(
                    { error: 'Failed to extract text from any image' },
                    { status: 500 }
                );
            }

            const combinedText = successResults
                .map( r => `--- صفحة ${ r.pageNumber } ---\n${ r.text }` )
                .join( '\n\n' );

            const avgConfidence = successResults.reduce( ( sum, r ) => sum + ( r.confidence || 0 ), 0 ) / successResults.length;

            return NextResponse.json( {
                success: true,
                text: combinedText,
                confidence: avgConfidence,
                pages: successResults.length
            } );
        } else
        {
            // صورة واحدة
            const result = await extractText( imageArray[ 0 ].base64, imageArray[ 0 ].type );

            if ( !result.success )
            {
                return NextResponse.json(
                    { error: result.error },
                    { status: 500 }
                );
            }

            return NextResponse.json( {
                success: true,
                text: result.text,
                confidence: result.confidence
            } );
        }

    } catch ( error )
    {
        console.error( 'OCR API error:', error );
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// دالة مساعدة لاستخراج النص
async function extractText ( base64: string, imageType: string )
{
    try
    {
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
                                text: 'استخرج جميع النصوص من هذه الصورة. أعد النص المستخرج فقط دون أي إضافات. حافظ على التنسيق والهيكلة الأصلية.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${ imageType };base64,${ base64 }`
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
            const errorText = await response.text();
            return {
                success: false,
                error: `OCR API error: ${ response.status } - ${ errorText }`
            };
        }

        const data = await response.json();
        const extractedText = data.choices?.[ 0 ]?.message?.content || '';

        return {
            success: true,
            text: extractedText,
            confidence: 0.95
        };

    } catch ( error )
    {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
