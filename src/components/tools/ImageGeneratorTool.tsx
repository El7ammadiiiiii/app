"use client";

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useGeminiImageStore, getImageTypeLabel, getModeLabel, getResolutionLabel, formatImageSize, estimateFileSize } from '@/store/geminiImageStore';
import { downloadDataUrl, fileToBase64 } from '@/services/clientFileUtils';

// Icons
const ImageIcon = () => (
    <svg className="size-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
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

const SparklesIcon = () => (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

export interface ImageGeneratorToolProps
{
    onClose?: () => void;
}

export function ImageGeneratorTool ( { onClose }: ImageGeneratorToolProps )
{
    const { images, addImage, removeImage, isGenerating } = useGeminiImageStore();

    // Form state
    const [ generationType, setGenerationType ] = useState<'text-to-image' | 'image-editing' | 'style-transfer' | 'composition'>( 'text-to-image' );
    const [ prompt, setPrompt ] = useState( '' );
    const [ resolution, setResolution ] = useState<'4k' | '2k' | '1080p' | '720p'>( '4k' );
    const [ aspectRatio, setAspectRatio ] = useState<'1:1' | '16:9' | '9:16' | '3:2' | '2:3' | '4:3' | '3:4'>( '1:1' );
    const [ mode, setMode ] = useState<'realistic' | 'illustration' | 'sticker' | 'minimalist' | 'commercial' | 'comic' | 'artistic'>( 'realistic' );
    const [ numberOfImages, setNumberOfImages ] = useState( 1 );
    const [ negativePrompt, setNegativePrompt ] = useState( '' );

    // File uploads
    const [ inputImage, setInputImage ] = useState<File | null>( null );
    const [ referenceImages, setReferenceImages ] = useState<File[]>( [] );
    const [ sourceImages, setSourceImages ] = useState<File[]>( [] );

    // UI state
    const [ activeTab, setActiveTab ] = useState<'generate' | 'history'>( 'generate' );
    const [ generating, setGenerating ] = useState( false );

    // Refs
    const inputImageRef = useRef<HTMLInputElement>( null );
    const referenceImagesRef = useRef<HTMLInputElement>( null );
    const sourceImagesRef = useRef<HTMLInputElement>( null );

    const handleGenerate = async () =>
    {
        if ( !prompt.trim() )
        {
            alert( 'الرجاء إدخال وصف للصورة / Please enter a prompt' );
            return;
        }

        setGenerating( true );

        try
        {
            let result: any;

            switch ( generationType )
            {
                case 'text-to-image':
                    {
                        const response = await fetch( '/api/gemini/image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify( {
                                type: 'text-to-image',
                                prompt,
                                options: {
                                    resolution,
                                    aspectRatio,
                                    mode,
                                    negativePrompt: negativePrompt || undefined,
                                    numberOfImages,
                                },
                            } ),
                        } );
                        result = await response.json();
                        if ( !response.ok ) throw new Error( result?.error || 'Failed to generate image' );
                    }
                    break;

                case 'image-editing':
                    if ( !inputImage )
                    {
                        alert( 'الرجاء رفع صورة للتعديل / Please upload an image to edit' );
                        setGenerating( false );
                        return;
                    }
                    {
                        const imageBase64 = await fileToBase64( inputImage );
                        const response = await fetch( '/api/gemini/image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify( {
                                type: 'image-editing',
                                prompt,
                                options: {
                                    inputImage: imageBase64,
                                    resolution,
                                    aspectRatio,
                                    mode,
                                    negativePrompt: negativePrompt || undefined,
                                },
                            } ),
                        } );
                        result = await response.json();
                        if ( !response.ok ) throw new Error( result?.error || 'Failed to edit image' );
                    }
                    break;

                case 'style-transfer':
                    if ( referenceImages.length === 0 )
                    {
                        alert( 'الرجاء رفع صور مرجعية / Please upload reference images' );
                        setGenerating( false );
                        return;
                    }
                    {
                        const refImagesBase64 = await Promise.all(
                            referenceImages.map( file => fileToBase64( file ) )
                        );
                        const response = await fetch( '/api/gemini/image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify( {
                                type: 'style-transfer',
                                prompt,
                                options: {
                                    referenceImages: refImagesBase64,
                                    resolution,
                                    aspectRatio,
                                    mode,
                                },
                            } ),
                        } );
                        result = await response.json();
                        if ( !response.ok ) throw new Error( result?.error || 'Failed to transfer style' );
                    }
                    break;

                case 'composition':
                    if ( sourceImages.length < 2 )
                    {
                        alert( 'الرجاء رفع صورتين على الأقل / Please upload at least 2 images' );
                        setGenerating( false );
                        return;
                    }
                    {
                        const srcImagesBase64 = await Promise.all(
                            sourceImages.map( file => fileToBase64( file ) )
                        );
                        const response = await fetch( '/api/gemini/image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify( {
                                type: 'composition',
                                prompt,
                                options: {
                                    sourceImages: srcImagesBase64,
                                    resolution,
                                    aspectRatio,
                                    mode,
                                },
                            } ),
                        } );
                        result = await response.json();
                        if ( !response.ok ) throw new Error( result?.error || 'Failed to compose images' );
                    }
                    break;
            }

            if ( result && result.success && result.images )
            {
                addImage( {
                    type: generationType,
                    prompt,
                    images: result.images,
                    resolution,
                    aspectRatio,
                    mode,
                    negativePrompt: negativePrompt || undefined,
                    thinkingProcess: result.metadata?.thinkingProcess
                } );

                setActiveTab( 'history' );
                setPrompt( '' );
                setNegativePrompt( '' );
                setInputImage( null );
                setReferenceImages( [] );
                setSourceImages( [] );
            } else
            {
                alert( result?.error || 'Failed to generate image' );
            }
        } catch ( error )
        {
            console.error( 'Generation error:', error );
            alert( error instanceof Error ? error.message : 'خطأ في التوليد / Generation failed' );
        } finally
        {
            setGenerating( false );
        }
    };

    const renderGenerationForm = () =>
    {
        return (
            <div className="space-y-4">
                {/* Generation Type */ }
                <div>
                    <label className="block text-sm font-medium mb-2">نوع التوليد | Generation Type</label>
                    <select
                        value={ generationType }
                        onChange={ ( e ) => setGenerationType( e.target.value as any ) }
                        className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                    >
                        <option value="text-to-image">Text to Image | نص إلى صورة</option>
                        <option value="image-editing">Image Editing | تعديل الصورة</option>
                        <option value="style-transfer">Style Transfer | نقل الأسلوب</option>
                        <option value="composition">Image Composition | دمج الصور</option>
                    </select>
                </div>

                {/* Prompt */ }
                <div>
                    <label className="block text-sm font-medium mb-2">الوصف | Prompt</label>
                    <textarea
                        value={ prompt }
                        onChange={ ( e ) => setPrompt( e.target.value ) }
                        placeholder="صف الصورة التي تريد إنشاءها بالتفصيل... / Describe the image you want to create in detail..."
                        className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm resize-none backdrop-blur-sm focus:border-[#244743] focus:outline-none placeholder:text-white/40"
                        rows={ 4 }
                    />
                </div>

                {/* File uploads based on type */ }
                { generationType === 'image-editing' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">رفع الصورة | Upload Image</label>
                        <input
                            ref={ inputImageRef }
                            type="file"
                            accept="image/*"
                            onChange={ ( e ) => setInputImage( e.target.files?.[ 0 ] || null ) }
                            className="hidden"
                        />
                        <button
                            onClick={ () => inputImageRef.current?.click() }
                            className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <UploadIcon />
                            <span>{ inputImage ? inputImage.name : 'اختر صورة / Choose Image' }</span>
                        </button>
                    </div>
                ) }

                { generationType === 'style-transfer' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">صور مرجعية | Reference Images</label>
                        <input
                            ref={ referenceImagesRef }
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={ ( e ) => setReferenceImages( Array.from( e.target.files || [] ) ) }
                            className="hidden"
                        />
                        <button
                            onClick={ () => referenceImagesRef.current?.click() }
                            className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <UploadIcon />
                            <span>{ referenceImages.length > 0 ? `${ referenceImages.length } صور محددة / files selected` : 'اختر صور / Choose Images' }</span>
                        </button>
                    </div>
                ) }

                { generationType === 'composition' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">صور المصدر | Source Images (2+)</label>
                        <input
                            ref={ sourceImagesRef }
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={ ( e ) => setSourceImages( Array.from( e.target.files || [] ) ) }
                            className="hidden"
                        />
                        <button
                            onClick={ () => sourceImagesRef.current?.click() }
                            className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm hover:bg-[#244743]/50 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <UploadIcon />
                            <span>{ sourceImages.length > 0 ? `${ sourceImages.length } صور محددة / files selected` : 'اختر صور / Choose Images' }</span>
                        </button>
                    </div>
                ) }

                {/* Settings Grid */ }
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-2">الدقة | Resolution</label>
                        <select
                            value={ resolution }
                            onChange={ ( e ) => setResolution( e.target.value as any ) }
                            className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                        >
                            <option value="4k">4K (Ultra HD)</option>
                            <option value="2k">2K (QHD)</option>
                            <option value="1080p">1080p (Full HD)</option>
                            <option value="720p">720p (HD)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">نسبة العرض | Aspect Ratio</label>
                        <select
                            value={ aspectRatio }
                            onChange={ ( e ) => setAspectRatio( e.target.value as any ) }
                            className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                        >
                            <option value="1:1">مربع | Square (1:1)</option>
                            <option value="16:9">أفقي | Landscape (16:9)</option>
                            <option value="9:16">عمودي | Portrait (9:16)</option>
                            <option value="3:2">3:2</option>
                            <option value="2:3">2:3</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">النمط | Style Mode</label>
                        <select
                            value={ mode }
                            onChange={ ( e ) => setMode( e.target.value as any ) }
                            className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                        >
                            <option value="realistic">واقعي | Realistic</option>
                            <option value="illustration">رسوم | Illustration</option>
                            <option value="sticker">ملصقات | Sticker</option>
                            <option value="minimalist">بسيط | Minimalist</option>
                            <option value="commercial">تجاري | Commercial</option>
                            <option value="comic">كوميك | Comic</option>
                            <option value="artistic">فني | Artistic</option>
                        </select>
                    </div>

                    { generationType === 'text-to-image' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">عدد الصور | Number</label>
                            <select
                                value={ numberOfImages }
                                onChange={ ( e ) => setNumberOfImages( parseInt( e.target.value ) ) }
                                className="w-full px-3 py-2 bg-[#244743]/60 border border-[#244743]/40 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none"
                            >
                                <option value="1">1 صورة | Image</option>
                                <option value="2">2 صور | Images</option>
                                <option value="3">3 صور | Images</option>
                                <option value="4">4 صور | Images</option>
                            </select>
                        </div>
                    ) }
                </div>

                {/* Negative Prompt */ }
                <div>
                    <label className="block text-sm font-medium mb-2">استبعاد (اختياري) | Negative Prompt (Optional)</label>
                    <input
                        type="text"
                        value={ negativePrompt }
                        onChange={ ( e ) => setNegativePrompt( e.target.value ) }
                        placeholder="ما تريد تجنبه في الصورة... / What to avoid..."
                        className="w-full px-3 py-2 bg-[#244743]/40 border border-[#244743]/30 rounded-lg text-sm backdrop-blur-sm focus:border-[#244743] focus:outline-none placeholder:text-white/40"
                    />
                </div>

                {/* Generate Button */ }
                <button
                    onClick={ handleGenerate }
                    disabled={ generating || !prompt.trim() }
                    className={ cn(
                        "w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                        generating || !prompt.trim()
                            ? "bg-white/5 text-white/40 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#244743] to-[#244743] hover:from-[#244743]/90 hover:to-[#244743]/90 text-white shadow-lg shadow-[#244743]/20"
                    ) }
                >
                    <SparklesIcon />
                    <span>{ generating ? 'جاري التوليد... / Generating...' : 'توليد الصورة / Generate Image' }</span>
                </button>
            </div>
        );
    };

    const renderHistory = () =>
    {
        if ( images.length === 0 )
        {
            return (
                <div className="text-center py-12 text-white/60">
                    <ImageIcon />
                    <p className="mt-2">لا توجد صور مولدة بعد / No images generated yet</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 gap-4">
                { images.map( ( img ) => (
                    <div key={ img.id } className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:border-white/30 transition-colors">
                        <div className="aspect-square relative bg-black/20">
                            { img.images[ 0 ] && (
                                <img
                                    src={ img.images[ 0 ].url }
                                    alt={ img.prompt }
                                    className="w-full h-full object-cover"
                                />
                            ) }
                            { img.images.length > 1 && (
                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 rounded text-xs">
                                    { img.images.length } صور / images
                                </div>
                            ) }
                        </div>
                        <div className="p-3">
                            <p className="text-sm line-clamp-2 mb-2">{ img.prompt }</p>
                            <div className="flex gap-2 text-xs text-white/60 mb-2">
                                <span className="px-2 py-0.5 bg-white/10 rounded">{ getResolutionLabel( img.resolution ) }</span>
                                <span className="px-2 py-0.5 bg-white/10 rounded">{ img.aspectRatio }</span>
                                <span className="px-2 py-0.5 bg-white/10 rounded">{ getModeLabel( img.mode ) }</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                { img.images.map( ( image, idx ) => (
                                    <button
                                        key={ idx }
                                        onClick={ () => downloadDataUrl( image.url, `gemini-${ img.id }-${ idx }.png` ) }
                                        className="flex-1 min-w-[80px] px-2 py-1.5 bg-[#244743]/20 hover:bg-[#244743]/30 rounded text-xs flex items-center justify-center gap-1"
                                    >
                                        <DownloadIcon />
                                        { img.images.length > 1 ? `#${ idx + 1 }` : 'تحميل / Download' }
                                    </button>
                                ) ) }
                                <button
                                    onClick={ () => removeImage( img.id ) }
                                    className="px-2 py-1.5 bg-[#244743]/20 hover:bg-[#244743]/30 rounded text-xs"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>
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
            <div className="w-[95vw] max-w-[340px] sm:max-w-md lg:max-w-lg bg-gradient-to-br from-[#244743]/90 via-[#244743]/80 to-[#244743]/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col border border-white/10">
                {/* Header */ }
                <div className="flex items-center justify-between p-2 sm:p-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <ImageIcon />
                        <div>
                            <h2 className="text-sm sm:text-base font-bold">توليد الصور | Generate Images</h2>
                            <p className="text-[9px] sm:text-[10px] text-white/60">Gemini 3 Pro - 4K Resolution</p>
                        </div>
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
                        توليد | Generate
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
                        السجل | History
                        { images.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-[#244743] rounded-full text-xs">
                                { images.length }
                            </span>
                        ) }
                    </button>
                </div>

                {/* Content */ }
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    { activeTab === 'generate' ? renderGenerationForm() : renderHistory() }
                </div>
            </div>
        </div>
    );
}
