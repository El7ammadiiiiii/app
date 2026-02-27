import { NextRequest, NextResponse } from 'next/server';
import
    {
        generateVideoFromText,
        generateVideoFromImage,
        generateVideoWithReferences,
        generateVideoWithInterpolation,
        extendVideo,
        type VideoGenerationOptions
    } from '@/services/veoService';

export async function POST ( request: NextRequest )
{
    try
    {
        const body = await request.json();
        const { type, prompt, options } = body as {
            type: VideoGenerationOptions[ 'type' ];
            prompt: string;
            options?: Partial<VideoGenerationOptions>;
        };

        // Validate required fields
        if ( !type || !prompt )
        {
            return NextResponse.json(
                { error: 'Missing required fields: type and prompt' },
                { status: 400 }
            );
        }

        let result;

        // Route to appropriate generation method based on type
        switch ( type )
        {
            case 'text-to-video':
                result = await generateVideoFromText( prompt, {
                    aspectRatio: options?.aspectRatio,
                    resolution: options?.resolution,
                    duration: options?.duration,
                } );
                break;

            case 'image-to-video':
                if ( !options?.image )
                {
                    return NextResponse.json(
                        { error: 'Image required for image-to-video generation' },
                        { status: 400 }
                    );
                }
                result = await generateVideoFromImage( options.image, prompt, {
                    aspectRatio: options.aspectRatio,
                    resolution: options.resolution,
                    duration: options.duration,
                } );
                break;

            case 'video-with-references':
                if ( !options?.referenceImages || options.referenceImages.length === 0 )
                {
                    return NextResponse.json(
                        { error: 'Reference images required for reference-based generation' },
                        { status: 400 }
                    );
                }
                result = await generateVideoWithReferences( prompt, options.referenceImages, {
                    aspectRatio: options.aspectRatio,
                    resolution: options.resolution,
                    duration: options.duration,
                } );
                break;

            case 'video-interpolation':
                if ( !options?.startFrame || !options?.endFrame )
                {
                    return NextResponse.json(
                        { error: 'Start and end frames required for interpolation' },
                        { status: 400 }
                    );
                }
                result = await generateVideoWithInterpolation(
                    options.startFrame,
                    options.endFrame,
                    prompt,
                    {
                        aspectRatio: options.aspectRatio,
                        resolution: options.resolution,
                        duration: options.duration,
                    }
                );
                break;

            case 'video-extension':
                if ( !options?.videoData )
                {
                    return NextResponse.json(
                        { error: 'Video data required for extension' },
                        { status: 400 }
                    );
                }
                result = await extendVideo(
                    options.videoData,
                    prompt,
                    options.extensionDuration,
                    {
                        aspectRatio: options.aspectRatio,
                        resolution: options.resolution,
                    }
                );
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown generation type: ${ type }` },
                    { status: 400 }
                );
        }

        // Check if generation failed
        if ( result.status === 'failed' )
        {
            return NextResponse.json(
                { error: result.error || 'Video generation failed' },
                { status: 500 }
            );
        }

        return NextResponse.json( result );
    } catch ( error )
    {
        console.error( 'Video generation API error:', error );
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
