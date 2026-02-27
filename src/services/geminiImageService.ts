/**
 * Google Gemini 3 Pro Image Generation Service via Vertex AI
 * Provides comprehensive 4K image generation and editing capabilities
 */

const GEMINI_API_KEY = process.env.GEMINI_IMAGE_API_KEY
    ?? process.env.VERTEX_GOOGLE_API_KEY
    ?? process.env.GOOGLE_API_KEY;
const GEMINI_API_BASE = 'https://us-central1-aiplatform.googleapis.com/v1/projects/ccways-5a160/locations/us-central1/publishers/google/models';
const GEMINI_MODEL = 'gemini-3-pro-image-preview';

function requireGeminiImageApiKey ()
{
    if ( !GEMINI_API_KEY )
    {
        throw new Error( 'Gemini image API key not configured (set GEMINI_IMAGE_API_KEY / VERTEX_GOOGLE_API_KEY / GOOGLE_API_KEY)' );
    }
}

/** Shared helper for Gemini image API calls via Vertex AI */
async function fetchGeminiImage ( body: unknown ): Promise<Response>
{
    requireGeminiImageApiKey();
    const url = `${ GEMINI_API_BASE }/${ GEMINI_MODEL }:generateContent`;
    return fetch( url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY!,
        },
        body: JSON.stringify( body ),
    } );
}

export interface ImageGenerationOptions
{
    type: 'text-to-image' | 'image-editing' | 'multi-turn-editing' | 'style-transfer' | 'composition' | 'character-360' | 'image-to-image-text';
    prompt: string;
    resolution?: '4k' | '2k' | '1080p' | '720p';
    aspectRatio?: '1:1' | '16:9' | '9:16' | '3:2' | '2:3' | '4:3' | '3:4' | '21:9' | '9:21';
    mode?: 'realistic' | 'illustration' | 'sticker' | 'minimalist' | 'commercial' | 'comic' | 'artistic';
    inputImage?: string; // base64 for editing
    referenceImages?: string[]; // for style transfer or composition
    maskImage?: string; // for semantic masking
    negativePrompt?: string;
    seed?: number;
    numberOfImages?: number; // 1-4
    conversationHistory?: ConversationTurn[];
}

export interface ConversationTurn
{
    role: 'user' | 'model';
    content: string;
    image?: string; // base64
}

export interface ImageGenerationResult
{
    success: boolean;
    images?: GeneratedImage[];
    error?: string;
    metadata?: {
        resolution: string;
        aspectRatio: string;
        mode: string;
        thinkingProcess?: string;
    };
}

export interface GeneratedImage
{
    url: string;
    base64?: string;
    width: number;
    height: number;
    mimeType: string;
}

type GeminiInlineData = {
    mimeType: string;
    data: string;
};

type GeminiRequestPart =
    | { text: string }
    | { inlineData: GeminiInlineData };

/**
 * Get resolution dimensions for different quality settings
 */
export function getImageResolution ( resolution: string = '4k' ): { width: number; height: number }
{
    const resolutions: Record<string, { width: number; height: number }> = {
        '4k': { width: 4096, height: 4096 },
        '2k': { width: 2048, height: 2048 },
        '1080p': { width: 1920, height: 1080 },
        '720p': { width: 1280, height: 720 }
    };
    return resolutions[ resolution ] || resolutions[ '4k' ];
}

/**
 * Apply aspect ratio to base resolution
 */
export function applyAspectRatio ( baseResolution: { width: number; height: number }, aspectRatio: string ): { width: number; height: number }
{
    const ratios: Record<string, { w: number; h: number }> = {
        '1:1': { w: 1, h: 1 },
        '16:9': { w: 16, h: 9 },
        '9:16': { w: 9, h: 16 },
        '3:2': { w: 3, h: 2 },
        '2:3': { w: 2, h: 3 },
        '4:3': { w: 4, h: 3 },
        '3:4': { w: 3, h: 4 },
        '21:9': { w: 21, h: 9 },
        '9:21': { w: 9, h: 21 }
    };

    const ratio = ratios[ aspectRatio ] || ratios[ '1:1' ];
    const totalPixels = baseResolution.width * baseResolution.height;
    const aspectValue = ratio.w / ratio.h;

    const height = Math.sqrt( totalPixels / aspectValue );
    const width = height * aspectValue;

    return {
        width: Math.round( width ),
        height: Math.round( height )
    };
}

/**
 * Generate image from text prompt (Text-to-Image)
 */
export async function generateImageFromText (
    prompt: string,
    options: Partial<ImageGenerationOptions> = {}
): Promise<ImageGenerationResult>
{
    const {
        resolution = '4k',
        aspectRatio = '1:1',
        mode = 'realistic',
        numberOfImages = 1,
        // NOTE: negativePrompt/seed currently not supported by this API payload.
        // Keeping them in ImageGenerationOptions for future compatibility.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        negativePrompt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        seed
    } = options;

    try
    {
        requireGeminiImageApiKey();
        const dims = applyAspectRatio( getImageResolution( resolution ), aspectRatio );

        const response = await fetchGeminiImage( {
            contents: [ {
                role: 'user',
                parts: [ {
                    text: prompt
                } ]
            } ],
            generationConfig: {
                temperature: 1.0,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                responseModalities: [ 'IMAGE' ],
                ...( numberOfImages ? { candidateCount: Math.max( 1, Math.min( 4, numberOfImages ) ) } : {} )
            }
        } );

        if ( !response.ok )
        {
            const error = await response.json();
            throw new Error( error.error?.message || 'Failed to generate image' );
        }

        const data = await response.json();
        const images: GeneratedImage[] = [];
        let thinkingProcess = '';

        // Parse response: collect images across all candidates
        if ( Array.isArray( data.candidates ) )
        {
            for ( const candidate of data.candidates )
            {
                const parts = candidate?.content?.parts;
                if ( !Array.isArray( parts ) ) continue;

                for ( const part of parts )
                {
                    if ( part?.thought )
                    {
                        thinkingProcess = part?.text || thinkingProcess;
                    }

                    if ( part?.inlineData )
                    {
                        images.push( {
                            base64: part.inlineData.data,
                            url: `data:${ part.inlineData.mimeType };base64,${ part.inlineData.data }`,
                            width: dims.width,
                            height: dims.height,
                            mimeType: part.inlineData.mimeType
                        } );
                    }
                }
            }
        }

        if ( images.length === 0 )
        {
            throw new Error( 'No images generated' );
        }

        return {
            success: true,
            images,
            metadata: {
                resolution,
                aspectRatio,
                mode,
                thinkingProcess
            }
        };
    } catch ( error )
    {
        console.error( 'Image generation error:', error );
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Edit image with text prompt (Image-to-Image Editing)
 */
export async function editImageWithText (
    imageBase64: string,
    prompt: string,
    options: Partial<ImageGenerationOptions> = {}
): Promise<ImageGenerationResult>
{
    const {
        resolution = '4k',
        aspectRatio = '1:1',
        mode = 'realistic',
        maskImage
    } = options;

    try
    {
        requireGeminiImageApiKey();
        const dims = applyAspectRatio( getImageResolution( resolution ), aspectRatio );

        const parts: GeminiRequestPart[] = [
            {
                text: prompt
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: imageBase64
                }
            }
        ];

        // Add mask if provided (for semantic masking)
        if ( maskImage )
        {
            parts.push( {
                inlineData: {
                    mimeType: 'image/png',
                    data: maskImage
                }
            } );
        }

        const response = await fetchGeminiImage( {
            contents: [ {
                role: 'user',
                parts
            } ],
            generationConfig: {
                temperature: 1.0,
                responseModalities: [ 'IMAGE' ],
                candidateCount: 1
            }
        } );

        if ( !response.ok )
        {
            const error = await response.json();
            throw new Error( error.error?.message || 'Failed to edit image' );
        }

        const data = await response.json();
        const images: GeneratedImage[] = [];

        if ( Array.isArray( data.candidates ) )
        {
            for ( const candidate of data.candidates )
            {
                const parts = candidate?.content?.parts;
                if ( !Array.isArray( parts ) ) continue;
                for ( const part of parts )
                {
                    if ( part?.inlineData )
                    {
                        images.push( {
                            base64: part.inlineData.data,
                            url: `data:${ part.inlineData.mimeType };base64,${ part.inlineData.data }`,
                            width: dims.width,
                            height: dims.height,
                            mimeType: part.inlineData.mimeType
                        } );
                    }
                }
            }
        }

        if ( images.length === 0 )
        {
            throw new Error( 'No images generated' );
        }

        return {
            success: true,
            images,
            metadata: {
                resolution,
                aspectRatio,
                mode
            }
        };
    } catch ( error )
    {
        console.error( 'Image editing error:', error );
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Multi-turn conversation editing
 */
export async function continueConversationEditing (
    conversationHistory: ConversationTurn[],
    newPrompt: string,
    newImage?: string,
    options: Partial<ImageGenerationOptions> = {}
): Promise<ImageGenerationResult>
{
    const {
        resolution = '4k',
        aspectRatio = '1:1',
        mode = 'realistic',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        negativePrompt
    } = options;

    try
    {
        requireGeminiImageApiKey();
        const dims = applyAspectRatio( getImageResolution( resolution ), aspectRatio );

        // Build conversation contents
        const contents = conversationHistory.map( turn => ( {
            role: turn.role,
            parts: [
                { text: turn.content },
                ...( turn.image ? [ {
                    inlineData: {
                        mimeType: 'image/png',
                        data: turn.image
                    }
                } ] : [] )
            ]
        } ) );

        // Add new turn
        const newParts: GeminiRequestPart[] = [ { text: newPrompt } ];
        if ( newImage )
        {
            newParts.push( {
                inlineData: {
                    mimeType: 'image/png',
                    data: newImage
                }
            } );
        }
        contents.push( {
            role: 'user',
            parts: newParts
        } );

        const response = await fetchGeminiImage( {
            contents,
            generationConfig: {
                temperature: 1.0,
                responseModalities: [ 'IMAGE', 'TEXT' ],
                candidateCount: 1
            }
        } );

        if ( !response.ok )
        {
            const error = await response.json();
            throw new Error( error.error?.message || 'Failed to continue conversation' );
        }

        const data = await response.json();
        const images: GeneratedImage[] = [];

        if ( Array.isArray( data.candidates ) )
        {
            for ( const candidate of data.candidates )
            {
                const parts = candidate?.content?.parts;
                if ( !Array.isArray( parts ) ) continue;
                for ( const part of parts )
                {
                    if ( part?.inlineData )
                    {
                        images.push( {
                            base64: part.inlineData.data,
                            url: `data:${ part.inlineData.mimeType };base64,${ part.inlineData.data }`,
                            width: dims.width,
                            height: dims.height,
                            mimeType: part.inlineData.mimeType
                        } );
                    }
                }
            }
        }

        return {
            success: true,
            images,
            metadata: {
                resolution,
                aspectRatio,
                mode
            }
        };
    } catch ( error )
    {
        console.error( 'Conversation editing error:', error );
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Style transfer using reference images
 */
export async function transferStyle (
    contentPrompt: string,
    referenceImages: string[],
    options: Partial<ImageGenerationOptions> = {}
): Promise<ImageGenerationResult>
{
    const {
        resolution = '4k',
        aspectRatio = '1:1',
        mode = 'artistic'
    } = options;

    try
    {
        requireGeminiImageApiKey();
        const dims = applyAspectRatio( getImageResolution( resolution ), aspectRatio );

        const parts: GeminiRequestPart[] = [
            { text: contentPrompt }
        ];

        // Add reference images
        referenceImages.forEach( img =>
        {
            parts.push( {
                inlineData: {
                    mimeType: 'image/png',
                    data: img
                }
            } );
        } );

        const response = await fetchGeminiImage( {
            contents: [ {
                role: 'user',
                parts
            } ],
            generationConfig: {
                temperature: 1.0,
                responseModalities: [ 'IMAGE' ],
                candidateCount: 1
            }
        } );

        if ( !response.ok )
        {
            const error = await response.json();
            throw new Error( error.error?.message || 'Failed to transfer style' );
        }

        const data = await response.json();
        const images: GeneratedImage[] = [];

        if ( Array.isArray( data.candidates ) )
        {
            for ( const candidate of data.candidates )
            {
                const parts = candidate?.content?.parts;
                if ( !Array.isArray( parts ) ) continue;
                for ( const part of parts )
                {
                    if ( part?.inlineData )
                    {
                        images.push( {
                            base64: part.inlineData.data,
                            url: `data:${ part.inlineData.mimeType };base64,${ part.inlineData.data }`,
                            width: dims.width,
                            height: dims.height,
                            mimeType: part.inlineData.mimeType
                        } );
                    }
                }
            }
        }

        return {
            success: true,
            images,
            metadata: {
                resolution,
                aspectRatio,
                mode
            }
        };
    } catch ( error )
    {
        console.error( 'Style transfer error:', error );
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Compose multiple images into one
 */
export async function composeImages (
    compositionPrompt: string,
    sourceImages: string[],
    options: Partial<ImageGenerationOptions> = {}
): Promise<ImageGenerationResult>
{
    const {
        resolution = '4k',
        aspectRatio = '16:9',
        mode = 'realistic'
    } = options;

    try
    {
        requireGeminiImageApiKey();
        const dims = applyAspectRatio( getImageResolution( resolution ), aspectRatio );

        const parts: GeminiRequestPart[] = [
            { text: compositionPrompt }
        ];

        sourceImages.forEach( img =>
        {
            parts.push( {
                inlineData: {
                    mimeType: 'image/png',
                    data: img
                }
            } );
        } );

        const response = await fetchGeminiImage( {
            contents: [ {
                role: 'user',
                parts
            } ],
            generationConfig: {
                temperature: 1.0,
                responseModalities: [ 'IMAGE' ],
                candidateCount: 1
            }
        } );

        if ( !response.ok )
        {
            const error = await response.json();
            throw new Error( error.error?.message || 'Failed to compose images' );
        }

        const data = await response.json();
        const images: GeneratedImage[] = [];

        if ( Array.isArray( data.candidates ) )
        {
            for ( const candidate of data.candidates )
            {
                const parts = candidate?.content?.parts;
                if ( !Array.isArray( parts ) ) continue;
                for ( const part of parts )
                {
                    if ( part?.inlineData )
                    {
                        images.push( {
                            base64: part.inlineData.data,
                            url: `data:${ part.inlineData.mimeType };base64,${ part.inlineData.data }`,
                            width: dims.width,
                            height: dims.height,
                            mimeType: part.inlineData.mimeType
                        } );
                    }
                }
            }
        }

        return {
            success: true,
            images,
            metadata: {
                resolution,
                aspectRatio,
                mode
            }
        };
    } catch ( error )
    {
        console.error( 'Image composition error:', error );
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

