"use client";

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useVeoStore, getVideoTypeLabel, getStatusColor, getStatusIcon, formatDuration, formatFileSize } from '@/store/veoStore';
import { fileToBase64 } from '@/services/clientFileUtils';

// Icons
const VideoIcon = () => (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const UploadIcon = () => (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CloseIcon = () => (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const PlayIcon = () => (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
    </svg>
);

export interface VideoGeneratorToolProps
{
    onClose?: () => void;
}

export function VideoGeneratorTool ( { onClose }: VideoGeneratorToolProps )
{
    const { videos, addVideo, updateVideo, removeVideo, isGenerating } = useVeoStore();

    // Form state
    const [ generationType, setGenerationType ] = useState<'text-to-video' | 'image-to-video' | 'video-with-references' | 'video-interpolation' | 'video-extension'>( 'text-to-video' );
    const [ prompt, setPrompt ] = useState( '' );
    const [ aspectRatio, setAspectRatio ] = useState<'16:9' | '9:16' | '1:1'>( '16:9' );
    const [ resolution, setResolution ] = useState<'4k' | '1080p' | '720p'>( '1080p' );
    const [ duration, setDuration ] = useState( 8 );

    // File uploads
    const [ imageFile, setImageFile ] = useState<File | null>( null );
    const [ videoFile, setVideoFile ] = useState<File | null>( null );
    const [ referenceFiles, setReferenceFiles ] = useState<File[]>( [] );
    const [ startFrameFile, setStartFrameFile ] = useState<File | null>( null );
    const [ endFrameFile, setEndFrameFile ] = useState<File | null>( null );
    const [ extensionDuration, setExtensionDuration ] = useState( 4 );

    // UI state
    const [ activeTab, setActiveTab ] = useState<'generate' | 'history'>( 'generate' );
    const [ selectedVideo, setSelectedVideo ] = useState<string | null>( null );

    // Refs
    const imageInputRef = useRef<HTMLInputElement>( null );
    const videoInputRef = useRef<HTMLInputElement>( null );
    const referenceInputRef = useRef<HTMLInputElement>( null );
    const startFrameInputRef = useRef<HTMLInputElement>( null );
    const endFrameInputRef = useRef<HTMLInputElement>( null );

    // Poll for video status updates
    useEffect( () =>
    {
        const interval = setInterval( async () =>
        {
            const pendingVideos = videos.filter( v => v.status === 'pending' || v.status === 'processing' );

            for ( const video of pendingVideos )
            {
                try
                {
                    const response = await fetch( `/api/veo/status/${ video.operationName }` );
                    const data = await response.json();

                    if ( data.status !== video.status )
                    {
                        updateVideo( video.id, {
                            status: data.status,
                            videoUrl: data.videoUrl,
                            error: data.error,
                            metadata: data.metadata
                        } );
                    }
                } catch ( error )
                {
                    console.error( 'Failed to check video status:', error );
                }
            }
        }, 5000 ); // Check every 5 seconds

        return () => clearInterval( interval );
    }, [ videos, updateVideo ] );

    const handleGenerate = async () =>
    {
        if ( !prompt.trim() )
        {
            alert( 'Please enter a prompt' );
            return;
        }

        try
        {
            let options: any = {
                aspectRatio,
                resolution,
                duration,
            };

            // Handle type-specific file uploads
            if ( generationType === 'image-to-video' )
            {
                if ( !imageFile )
                {
                    alert( 'Please upload an image' );
                    return;
                }
                options.image = await fileToBase64( imageFile );
            } else if ( generationType === 'video-with-references' )
            {
                if ( referenceFiles.length === 0 )
                {
                    alert( 'Please upload reference images' );
                    return;
                }
                options.referenceImages = await Promise.all(
                    referenceFiles.map( file => fileToBase64( file ) )
                );
            } else if ( generationType === 'video-interpolation' )
            {
                if ( !startFrameFile || !endFrameFile )
                {
                    alert( 'Please upload start and end frames' );
                    return;
                }
                options.startFrame = await fileToBase64( startFrameFile );
                options.endFrame = await fileToBase64( endFrameFile );
            } else if ( generationType === 'video-extension' )
            {
                if ( !videoFile )
                {
                    alert( 'Please upload a video' );
                    return;
                }
                options.videoData = await fileToBase64( videoFile );
                options.extensionDuration = extensionDuration;
            }

            // Call API
            const response = await fetch( '/api/veo/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify( {
                    type: generationType,
                    prompt,
                    options,
                } ),
            } );

            const data = await response.json();

            if ( !response.ok )
            {
                throw new Error( data.error || 'Failed to generate video' );
            }

            // Add to store
            const videoId = addVideo( {
                operationName: data.operationName,
                type: generationType,
                prompt,
                status: data.status,
                metadata: data.metadata,
            } );

            // Switch to history tab
            setActiveTab( 'history' );
            setSelectedVideo( videoId );

            // Clear form
            setPrompt( '' );
            setImageFile( null );
            setVideoFile( null );
            setReferenceFiles( [] );
            setStartFrameFile( null );
            setEndFrameFile( null );
        } catch ( error )
        {
            console.error( 'Generation error:', error );
            alert( error instanceof Error ? error.message : 'Failed to generate video' );
        }
    };

    const renderGenerationForm = () =>
    {
        return (
            <div className="space-y-4">
                {/* Generation Type */ }
                <div>
                    <label className="block text-sm font-medium mb-2">Generation Type</label>
                    <select
                        value={ generationType }
                        onChange={ ( e ) => setGenerationType( e.target.value as any ) }
                        className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                    >
                        <option value="text-to-video">Text to Video</option>
                        <option value="image-to-video">Image to Video</option>
                        <option value="video-with-references">With Reference Images</option>
                        <option value="video-interpolation">Frame Interpolation</option>
                        <option value="video-extension">Extend Video</option>
                    </select>
                </div>

                {/* Prompt */ }
                <div>
                    <label className="block text-sm font-medium mb-2">Prompt</label>
                    <textarea
                        value={ prompt }
                        onChange={ ( e ) => setPrompt( e.target.value ) }
                        placeholder="Describe the video you want to generate..."
                        className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm resize-none backdrop-blur-sm focus:border-[#244743] focus:outline-none placeholder:text-white/40"
                        rows={ 4 }
                    />
                </div>

                {/* File Uploads */ }
                { generationType === 'image-to-video' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Upload Image</label>
                        <input
                            ref={ imageInputRef }
                            type="file"
                            accept="image/*"
                            onChange={ ( e ) => setImageFile( e.target.files?.[ 0 ] || null ) }
                            className="hidden"
                        />
                        <button
                            onClick={ () => imageInputRef.current?.click() }
                            className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <UploadIcon />
                            <span>{ imageFile ? imageFile.name : 'Choose Image' }</span>
                        </button>
                    </div>
                ) }

                { generationType === 'video-with-references' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Reference Images (Multiple)</label>
                        <input
                            ref={ referenceInputRef }
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={ ( e ) => setReferenceFiles( Array.from( e.target.files || [] ) ) }
                            className="hidden"
                        />
                        <button
                            onClick={ () => referenceInputRef.current?.click() }
                            className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <UploadIcon />
                            <span>{ referenceFiles.length > 0 ? `${ referenceFiles.length } files selected` : 'Choose Images' }</span>
                        </button>
                    </div>
                ) }

                { generationType === 'video-interpolation' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-2">Start Frame</label>
                            <input
                                ref={ startFrameInputRef }
                                type="file"
                                accept="image/*"
                                onChange={ ( e ) => setStartFrameFile( e.target.files?.[ 0 ] || null ) }
                                className="hidden"
                            />
                            <button
                                onClick={ () => startFrameInputRef.current?.click() }
                                className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <UploadIcon />
                                <span>{ startFrameFile ? startFrameFile.name : 'Choose Start Frame' }</span>
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">End Frame</label>
                            <input
                                ref={ endFrameInputRef }
                                type="file"
                                accept="image/*"
                                onChange={ ( e ) => setEndFrameFile( e.target.files?.[ 0 ] || null ) }
                                className="hidden"
                            />
                            <button
                                onClick={ () => endFrameInputRef.current?.click() }
                                className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <UploadIcon />
                                <span>{ endFrameFile ? endFrameFile.name : 'Choose End Frame' }</span>
                            </button>
                        </div>
                    </div>
                ) }

                { generationType === 'video-extension' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-2">Upload Video</label>
                            <input
                                ref={ videoInputRef }
                                type="file"
                                accept="video/*"
                                onChange={ ( e ) => setVideoFile( e.target.files?.[ 0 ] || null ) }
                                className="hidden"
                            />
                            <button
                                onClick={ () => videoInputRef.current?.click() }
                                className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <UploadIcon />
                                <span>{ videoFile ? videoFile.name : 'Choose Video' }</span>
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Extension Duration: { extensionDuration }s</label>
                            <input
                                type="range"
                                min="2"
                                max="8"
                                step="1"
                                value={ extensionDuration }
                                onChange={ ( e ) => setExtensionDuration( parseInt( e.target.value ) ) }
                                className="w-full"
                            />
                        </div>
                    </div>
                ) }

                {/* Settings */ }
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                        <select
                            value={ aspectRatio }
                            onChange={ ( e ) => setAspectRatio( e.target.value as any ) }
                            className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                        >
                            <option value="16:9">16:9</option>
                            <option value="9:16">9:16</option>
                            <option value="1:1">1:1</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Resolution</label>
                        <select
                            value={ resolution }
                            onChange={ ( e ) => setResolution( e.target.value as any ) }
                            className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                        >
                            <option value="4k">4K</option>
                            <option value="1080p">1080p</option>
                            <option value="720p">720p</option>
                        </select>
                    </div>

                    { generationType !== 'video-extension' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Duration: { duration }s</label>
                            <input
                                type="range"
                                min="4"
                                max="16"
                                step="1"
                                value={ duration }
                                onChange={ ( e ) => setDuration( parseInt( e.target.value ) ) }
                                className="w-full"
                            />
                        </div>
                    ) }
                </div>

                {/* Generate Button */ }
                <button
                    onClick={ handleGenerate }
                    disabled={ isGenerating || !prompt.trim() }
                    className={ cn(
                        "w-full px-4 py-3 rounded-lg font-medium transition-colors",
                        isGenerating || !prompt.trim()
                            ? "bg-white/5 text-white/40 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#244743] to-[#244743] hover:from-[#244743]/90 hover:to-[#244743]/90 text-white shadow-lg shadow-[#244743]/20"
                    ) }
                >
                    { isGenerating ? 'Generating...' : 'Generate Video' }
                </button>
            </div>
        );
    };

    const renderHistory = () =>
    {
        if ( videos.length === 0 )
        {
            return (
                <div className="text-center py-12 text-white/60">
                    <VideoIcon />
                    <p className="mt-2">No videos generated yet</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                { videos.map( ( video ) => (
                    <div
                        key={ video.id }
                        className={ cn(
                            "p-4 rounded-lg border cursor-pointer transition-colors",
                            selectedVideo === video.id
                                ? "bg-white/10 border-white/30"
                                : "bg-white/5 border-white/10 hover:bg-white/8"
                        ) }
                        onClick={ () => setSelectedVideo( video.id ) }
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={ cn( "px-2 py-0.5 rounded text-xs border", getStatusColor( video.status ) ) }>
                                        { getStatusIcon( video.status ) } { video.status }
                                    </span>
                                    <span className="text-xs text-white/60">{ getVideoTypeLabel( video.type ) }</span>
                                </div>
                                <p className="text-sm truncate">{ video.prompt }</p>
                            </div>
                            <button
                                onClick={ ( e ) =>
                                {
                                    e.stopPropagation();
                                    removeVideo( video.id );
                                } }
                                className="text-white/40 hover:text-white/80 transition-colors"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        { video.metadata && (
                            <div className="flex gap-3 text-xs text-white/60 mt-2">
                                <span>{ video.metadata.resolution }</span>
                                <span>{ video.metadata.aspectRatio }</span>
                                <span>{ formatDuration( video.metadata.duration ) }</span>
                                { video.metadata.fileSize && <span>{ formatFileSize( video.metadata.fileSize ) }</span> }
                            </div>
                        ) }

                        { video.status === 'completed' && video.videoUrl && (
                            <div className="mt-3 space-y-2">
                                <video
                                    src={ video.videoUrl }
                                    controls
                                    className="w-full rounded-lg"
                                    style={ { maxHeight: '200px' } }
                                />
                                <a
                                    href={ video.videoUrl }
                                    download={ `veo-video-${ video.id }.mp4` }
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                                    onClick={ ( e ) => e.stopPropagation() }
                                >
                                    <DownloadIcon />
                                    <span>Download</span>
                                </a>
                            </div>
                        ) }

                        { video.status === 'failed' && video.error && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                                { video.error }
                            </div>
                        ) }
                    </div>
                ) ) }
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={ ( e ) => e.target === e.currentTarget && onClose?.() }
        >
            <div className="w-[95vw] max-w-[320px] sm:max-w-sm lg:max-w-md bg-gradient-to-br from-[#244743]/90 via-[#244743]/80 to-[#244743]/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col border border-white/10">
                {/* Header */ }
                <div className="flex items-center justify-between p-2 sm:p-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <VideoIcon />
                        <h2 className="text-sm sm:text-base font-bold">Generate Video - Veo 3.1</h2>
                    </div>
                    <button
                        onClick={ onClose }
                        className="text-white/60 hover:text-white transition-colors p-1"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Tabs */ }
                <div className="flex border-b border-white/10">
                    <button
                        onClick={ () => setActiveTab( 'generate' ) }
                        className={ cn(
                            "flex-1 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors",
                            activeTab === 'generate'
                                ? "text-white border-b-2 border-[#244743]"
                                : "text-white/60 hover:text-white"
                        ) }
                    >
                        Generate
                    </button>
                    <button
                        onClick={ () => setActiveTab( 'history' ) }
                        className={ cn(
                            "flex-1 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative",
                            activeTab === 'history'
                                ? "text-white border-b-2 border-[#244743]"
                                : "text-white/60 hover:text-white"
                        ) }
                    >
                        History
                        { videos.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-[#244743] rounded-full text-xs">
                                { videos.length }
                            </span>
                        ) }
                    </button>
                </div>

                {/* Content */ }
                <div className="p-3 sm:p-4 max-h-[60vh] overflow-y-auto">
                    { activeTab === 'generate' ? renderGenerationForm() : renderHistory() }
                </div>
            </div>
        </div>
    );
}
