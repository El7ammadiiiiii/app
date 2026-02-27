import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VideoGeneration
{
    id: string;
    operationName: string;
    type: 'text-to-video' | 'image-to-video' | 'video-with-references' | 'video-interpolation' | 'video-extension';
    prompt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    metadata?: {
        duration: number;
        resolution: string;
        aspectRatio: string;
        fileSize?: number;
    };
    createdAt: string;
    completedAt?: string;
}

interface VeoStore
{
    // State
    videos: VideoGeneration[];
    activeVideoId: string | null;
    isGenerating: boolean;

    // Actions
    addVideo: ( video: Omit<VideoGeneration, 'id' | 'createdAt'> ) => string;
    updateVideo: ( id: string, updates: Partial<VideoGeneration> ) => void;
    removeVideo: ( id: string ) => void;
    setActiveVideo: ( id: string | null ) => void;
    clearVideos: () => void;
    getVideo: ( id: string ) => VideoGeneration | undefined;
    getVideosByStatus: ( status: VideoGeneration[ 'status' ] ) => VideoGeneration[];
}

export const useVeoStore = create<VeoStore>()(
    persist(
        ( set, get ) => ( {
            // Initial state
            videos: [],
            activeVideoId: null,
            isGenerating: false,

            // Add new video generation
            addVideo: ( video ) =>
            {
                const id = `video_${ Date.now() }_${ Math.random().toString( 36 ).substr( 2, 9 ) }`;
                const newVideo: VideoGeneration = {
                    ...video,
                    id,
                    createdAt: new Date().toISOString(),
                };

                set( ( state ) => ( {
                    videos: [ newVideo, ...state.videos ],
                    activeVideoId: id,
                    isGenerating: true,
                } ) );

                return id;
            },

            // Update video generation
            updateVideo: ( id, updates ) =>
            {
                set( ( state ) =>
                {
                    const videos = state.videos.map( ( video ) =>
                        video.id === id
                            ? {
                                ...video,
                                ...updates,
                                completedAt:
                                    updates.status === 'completed' || updates.status === 'failed'
                                        ? new Date().toISOString()
                                        : video.completedAt,
                            }
                            : video
                    );

                    // Update isGenerating status
                    const hasGenerating = videos.some(
                        ( v ) => v.status === 'pending' || v.status === 'processing'
                    );

                    return {
                        videos,
                        isGenerating: hasGenerating,
                    };
                } );
            },

            // Remove video
            removeVideo: ( id ) =>
            {
                set( ( state ) => ( {
                    videos: state.videos.filter( ( v ) => v.id !== id ),
                    activeVideoId: state.activeVideoId === id ? null : state.activeVideoId,
                } ) );
            },

            // Set active video
            setActiveVideo: ( id ) =>
            {
                set( { activeVideoId: id } );
            },

            // Clear all videos
            clearVideos: () =>
            {
                set( {
                    videos: [],
                    activeVideoId: null,
                    isGenerating: false,
                } );
            },

            // Get specific video
            getVideo: ( id ) =>
            {
                return get().videos.find( ( v ) => v.id === id );
            },

            // Get videos by status
            getVideosByStatus: ( status ) =>
            {
                return get().videos.filter( ( v ) => v.status === status );
            },
        } ),
        {
            name: 'veo-store',
            partialize: ( state ) => ( {
                videos: state.videos,
                // Don't persist activeVideoId and isGenerating
            } ),
        }
    )
);

// Helper functions for UI
export function getVideoTypeLabel ( type: VideoGeneration[ 'type' ] ): string
{
    const labels = {
        'text-to-video': 'Text to Video',
        'image-to-video': 'Image to Video',
        'video-with-references': 'With References',
        'video-interpolation': 'Interpolation',
        'video-extension': 'Extension',
    };
    return labels[ type ] || type;
}

export function getStatusColor ( status: VideoGeneration[ 'status' ] ): string
{
    const colors = {
        pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        completed: 'bg-green-500/10 text-green-500 border-green-500/20',
        failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[ status ] || colors.pending;
}

export function getStatusIcon ( status: VideoGeneration[ 'status' ] ): string
{
    const icons = {
        pending: '⏳',
        processing: '🔄',
        completed: '✅',
        failed: '❌',
    };
    return icons[ status ] || '⏳';
}

export function formatDuration ( seconds: number ): string
{
    if ( seconds < 60 )
    {
        return `${ seconds }s`;
    }
    const minutes = Math.floor( seconds / 60 );
    const remainingSeconds = seconds % 60;
    return `${ minutes }m ${ remainingSeconds }s`;
}

export function formatFileSize ( bytes: number | undefined ): string
{
    if ( !bytes ) return 'Unknown';

    const units = [ 'B', 'KB', 'MB', 'GB' ];
    let size = bytes;
    let unitIndex = 0;

    while ( size >= 1024 && unitIndex < units.length - 1 )
    {
        size /= 1024;
        unitIndex++;
    }

    return `${ size.toFixed( 2 ) } ${ units[ unitIndex ] }`;
}
