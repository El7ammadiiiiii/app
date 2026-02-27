import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedImageRecord
{
    id: string;
    type: 'text-to-image' | 'image-editing' | 'style-transfer' | 'composition' | 'multi-turn-editing';
    prompt: string;
    images: {
        url: string;
        base64?: string;
        width: number;
        height: number;
        mimeType: string;
    }[];
    resolution: string;
    aspectRatio: string;
    mode: string;
    negativePrompt?: string;
    createdAt: string;
    conversationHistory?: {
        role: 'user' | 'model';
        content: string;
        image?: string;
    }[];
    thinkingProcess?: string;
}

interface GeminiImageStore
{
    // State
    images: GeneratedImageRecord[];
    activeImageId: string | null;
    isGenerating: boolean;

    // Actions
    addImage: ( image: Omit<GeneratedImageRecord, 'id' | 'createdAt'> ) => string;
    updateImage: ( id: string, updates: Partial<GeneratedImageRecord> ) => void;
    removeImage: ( id: string ) => void;
    setActiveImage: ( id: string | null ) => void;
    clearImages: () => void;
    getImage: ( id: string ) => GeneratedImageRecord | undefined;
    getImagesByType: ( type: GeneratedImageRecord[ 'type' ] ) => GeneratedImageRecord[];
}

export const useGeminiImageStore = create<GeminiImageStore>()(
    persist(
        ( set, get ) => ( {
            // Initial state
            images: [],
            activeImageId: null,
            isGenerating: false,

            // Add new image generation
            addImage: ( image ) =>
            {
                const id = `img_${ Date.now() }_${ Math.random().toString( 36 ).substr( 2, 9 ) }`;
                const newImage: GeneratedImageRecord = {
                    ...image,
                    id,
                    createdAt: new Date().toISOString(),
                };

                set( ( state ) => ( {
                    images: [ newImage, ...state.images ],
                    activeImageId: id,
                    isGenerating: false,
                } ) );

                return id;
            },

            // Update image record
            updateImage: ( id, updates ) =>
            {
                set( ( state ) => ( {
                    images: state.images.map( ( img ) =>
                        img.id === id ? { ...img, ...updates } : img
                    ),
                } ) );
            },

            // Remove image
            removeImage: ( id ) =>
            {
                set( ( state ) => ( {
                    images: state.images.filter( ( img ) => img.id !== id ),
                    activeImageId: state.activeImageId === id ? null : state.activeImageId,
                } ) );
            },

            // Set active image
            setActiveImage: ( id ) =>
            {
                set( { activeImageId: id } );
            },

            // Clear all images
            clearImages: () =>
            {
                set( {
                    images: [],
                    activeImageId: null,
                    isGenerating: false,
                } );
            },

            // Get specific image
            getImage: ( id ) =>
            {
                return get().images.find( ( img ) => img.id === id );
            },

            // Get images by type
            getImagesByType: ( type ) =>
            {
                return get().images.filter( ( img ) => img.type === type );
            },
        } ),
        {
            name: 'gemini-image-store',
            partialize: ( state ) => ( {
                images: state.images,
                // Don't persist activeImageId and isGenerating
            } ),
        }
    )
);

// Helper functions for UI
export function getImageTypeLabel ( type: GeneratedImageRecord[ 'type' ] ): string
{
    const labels = {
        'text-to-image': 'Text to Image',
        'image-editing': 'Image Editing',
        'style-transfer': 'Style Transfer',
        'composition': 'Image Composition',
        'multi-turn-editing': 'Multi-turn Editing',
    };
    return labels[ type ] || type;
}

export function getModeLabel ( mode: string ): string
{
    const labels: Record<string, string> = {
        realistic: 'Realistic',
        illustration: 'Illustration',
        sticker: 'Sticker',
        minimalist: 'Minimalist',
        commercial: 'Commercial',
        comic: 'Comic',
        artistic: 'Artistic',
    };
    return labels[ mode ] || mode;
}

export function getResolutionLabel ( resolution: string ): string
{
    const labels: Record<string, string> = {
        '4k': '4K (Ultra HD)',
        '2k': '2K (QHD)',
        '1080p': '1080p (Full HD)',
        '720p': '720p (HD)',
    };
    return labels[ resolution ] || resolution;
}

export function formatImageSize ( width: number, height: number ): string
{
    return `${ width } × ${ height }`;
}

export function estimateFileSize ( width: number, height: number ): string
{
    // Rough estimate: PNG ~4 bytes per pixel
    const bytes = width * height * 4;
    const mb = bytes / ( 1024 * 1024 );
    return `~${ mb.toFixed( 1 ) } MB`;
}
