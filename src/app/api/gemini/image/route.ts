import { NextRequest, NextResponse } from 'next/server';
import {
    generateImageFromText,
    editImageWithText,
    transferStyle,
    composeImages,
    type ImageGenerationResult,
} from '@/services/geminiImageService';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST ( request: NextRequest )
{
    try
    {
        const body = await request.json();
        const { type, prompt, options = {} } = body as {
            type: string;
            prompt: string;
            options?: Record<string, any>;
        };

        if ( !type || !prompt )
        {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: type, prompt' },
                { status: 400 }
            );
        }

        let result: ImageGenerationResult;

        switch ( type )
        {
            case 'text-to-image':
                result = await generateImageFromText( prompt, {
                    resolution: options.resolution,
                    aspectRatio: options.aspectRatio,
                    mode: options.mode,
                    negativePrompt: options.negativePrompt,
                    numberOfImages: options.numberOfImages,
                } );
                break;

            case 'image-editing':
                if ( !options.inputImage )
                {
                    return NextResponse.json(
                        { success: false, error: 'Missing inputImage for image-editing' },
                        { status: 400 }
                    );
                }
                result = await editImageWithText( options.inputImage, prompt, {
                    resolution: options.resolution,
                    aspectRatio: options.aspectRatio,
                    mode: options.mode,
                    negativePrompt: options.negativePrompt,
                } );
                break;

            case 'style-transfer':
                if ( !options.referenceImages || options.referenceImages.length === 0 )
                {
                    return NextResponse.json(
                        { success: false, error: 'Missing referenceImages for style-transfer' },
                        { status: 400 }
                    );
                }
                result = await transferStyle( prompt, options.referenceImages, {
                    resolution: options.resolution,
                    aspectRatio: options.aspectRatio,
                    mode: options.mode,
                } );
                break;

            case 'composition':
                if ( !options.sourceImages || options.sourceImages.length < 2 )
                {
                    return NextResponse.json(
                        { success: false, error: 'Need at least 2 images for composition' },
                        { status: 400 }
                    );
                }
                result = await composeImages( prompt, options.sourceImages, {
                    resolution: options.resolution,
                    aspectRatio: options.aspectRatio,
                    mode: options.mode,
                } );
                break;

            default:
                return NextResponse.json(
                    { success: false, error: `Unsupported generation type: ${ type }` },
                    { status: 400 }
                );
        }

        if ( !result.success )
        {
            return NextResponse.json(
                { success: false, error: result.error || 'Image generation failed' },
                { status: 500 }
            );
        }

        return NextResponse.json( result );
    }
    catch ( error: unknown )
    {
        console.error( '[Gemini Image API] Error:', error );
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
