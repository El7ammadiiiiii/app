/**
 * Google Veo 3.0 Video Generation Service via Vertex AI (server-only)
 *
 * NOTE: This module must not be imported by client components.
 * It reads its API key from environment variables.
 */

const VEO_API_KEY = process.env.VEO_API_KEY ?? process.env.VERTEX_GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY;
const VEO_API_BASE = 'https://us-central1-aiplatform.googleapis.com/v1/projects/ccways-5a160/locations/us-central1/publishers/google/models';
const VEO_OPERATIONS_BASE = 'https://us-central1-aiplatform.googleapis.com/v1';
const VEO_MODEL = 'veo-3.0-generate-preview';

function requireVeoApiKey ()
{
    if ( !VEO_API_KEY )
    {
        throw new Error( 'VEO API key not configured (set VEO_API_KEY or GOOGLE_API_KEY)' );
    }
}

export interface VideoGenerationOptions
{
    type: 'text-to-video' | 'image-to-video' | 'video-with-references' | 'video-interpolation' | 'video-extension';
    prompt: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    resolution?: '4k' | '1080p' | '720p';
    duration?: number; // 4-16 seconds
    image?: string; // base64 for image-to-video
    referenceImages?: string[]; // base64 array for reference-based
    videoData?: string; // base64 for extension
    startFrame?: string; // base64 for interpolation start
    endFrame?: string; // base64 for interpolation end
    extensionDuration?: number; // seconds to extend
}

export interface VideoGenerationResult
{
    operationName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    metadata?: {
        duration: number;
        resolution: string;
        aspectRatio: string;
        fileSize?: number;
    };
}

type VeoOperationResponse = { name: string } & Record<string, unknown>;

async function postVeo ( action: string, body: unknown ): Promise<VeoOperationResponse>
{
    requireVeoApiKey();
    const response = await fetch( `${ VEO_API_BASE }/${ VEO_MODEL }:${ action }`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': VEO_API_KEY!,
        },
        body: JSON.stringify( body ),
    } );

    if ( !response.ok )
    {
        const error = await response.json().catch( () => ( {} ) );
        throw new Error( error?.error?.message || 'Veo request failed' );
    }

    return ( await response.json() ) as VeoOperationResponse;
}

export async function generateVideoFromText (
    prompt: string,
    options: {
        aspectRatio?: '16:9' | '9:16' | '1:1';
        resolution?: '4k' | '1080p' | '720p';
        duration?: number;
    } = {}
): Promise<VideoGenerationResult>
{
    const { aspectRatio = '16:9', resolution = '1080p', duration = 8 } = options;

    try
    {
        const data = await postVeo( 'generate', {
            prompt,
            config: {
                aspectRatio,
                resolution,
                duration,
                enableDialogue: true,
                enableSoundEffects: true,
                cinematicQuality: true,
            },
        } );

        return {
            operationName: data.name,
            status: 'pending',
            metadata: { duration, resolution, aspectRatio },
        };
    } catch ( error )
    {
        console.error( 'Video generation error:', error );
        return {
            operationName: '',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function generateVideoFromImage (
    imageBase64: string,
    prompt: string,
    options: {
        aspectRatio?: '16:9' | '9:16' | '1:1';
        resolution?: '4k' | '1080p' | '720p';
        duration?: number;
    } = {}
): Promise<VideoGenerationResult>
{
    const { aspectRatio = '16:9', resolution = '1080p', duration = 8 } = options;

    try
    {
        const data = await postVeo( 'generateFromImage', {
            image: imageBase64,
            prompt,
            config: {
                aspectRatio,
                resolution,
                duration,
                enableDialogue: true,
                enableSoundEffects: true,
                cinematicQuality: true,
            },
        } );

        return {
            operationName: data.name,
            status: 'pending',
            metadata: { duration, resolution, aspectRatio },
        };
    } catch ( error )
    {
        console.error( 'Image-to-video error:', error );
        return {
            operationName: '',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function generateVideoWithReferences (
    prompt: string,
    referenceImages: string[],
    options: {
        aspectRatio?: '16:9' | '9:16' | '1:1';
        resolution?: '4k' | '1080p' | '720p';
        duration?: number;
    } = {}
): Promise<VideoGenerationResult>
{
    const { aspectRatio = '16:9', resolution = '1080p', duration = 8 } = options;

    try
    {
        const data = await postVeo( 'generateWithReferences', {
            prompt,
            referenceImages,
            config: {
                aspectRatio,
                resolution,
                duration,
                enableDialogue: true,
                enableSoundEffects: true,
                cinematicQuality: true,
            },
        } );

        return {
            operationName: data.name,
            status: 'pending',
            metadata: { duration, resolution, aspectRatio },
        };
    } catch ( error )
    {
        console.error( 'Reference video generation error:', error );
        return {
            operationName: '',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function generateVideoWithInterpolation (
    startFrameBase64: string,
    endFrameBase64: string,
    prompt: string,
    options: {
        aspectRatio?: '16:9' | '9:16' | '1:1';
        resolution?: '4k' | '1080p' | '720p';
        duration?: number;
    } = {}
): Promise<VideoGenerationResult>
{
    const { aspectRatio = '16:9', resolution = '1080p', duration = 8 } = options;

    try
    {
        const data = await postVeo( 'interpolate', {
            startFrame: startFrameBase64,
            endFrame: endFrameBase64,
            prompt,
            config: {
                aspectRatio,
                resolution,
                duration,
                enableDialogue: true,
                enableSoundEffects: true,
                cinematicQuality: true,
            },
        } );

        return {
            operationName: data.name,
            status: 'pending',
            metadata: { duration, resolution, aspectRatio },
        };
    } catch ( error )
    {
        console.error( 'Video interpolation error:', error );
        return {
            operationName: '',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function extendVideo (
    videoBase64: string,
    prompt: string,
    extensionDuration: number = 4,
    options: {
        aspectRatio?: '16:9' | '9:16' | '1:1';
        resolution?: '4k' | '1080p' | '720p';
    } = {}
): Promise<VideoGenerationResult>
{
    const { aspectRatio = '16:9', resolution = '1080p' } = options;

    try
    {
        const data = await postVeo( 'extend', {
            video: videoBase64,
            prompt,
            config: {
                aspectRatio,
                resolution,
                extensionDuration,
                enableDialogue: true,
                enableSoundEffects: true,
                cinematicQuality: true,
            },
        } );

        return {
            operationName: data.name,
            status: 'pending',
            metadata: { duration: extensionDuration, resolution, aspectRatio },
        };
    } catch ( error )
    {
        console.error( 'Video extension error:', error );
        return {
            operationName: '',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function checkVideoStatus ( operationName: string ): Promise<VideoGenerationResult>
{
    try
    {
        requireVeoApiKey();
        const response = await fetch( `${ VEO_OPERATIONS_BASE }/${ operationName }`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': VEO_API_KEY!,
            },
        } );

        if ( !response.ok )
        {
            const error = await response.json().catch( () => ( {} ) );
            throw new Error( error?.error?.message || 'Failed to check video status' );
        }

        const data = await response.json();

        if ( data?.done )
        {
            if ( data?.error )
            {
                return {
                    operationName,
                    status: 'failed',
                    error: data.error.message || 'Video generation failed',
                };
            }

            return {
                operationName,
                status: 'completed',
                videoUrl: data.response?.videoUrl,
                metadata: data.response?.metadata,
            };
        }

        return { operationName, status: 'processing' };
    } catch ( error )
    {
        console.error( 'Status check error:', error );
        return {
            operationName,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
