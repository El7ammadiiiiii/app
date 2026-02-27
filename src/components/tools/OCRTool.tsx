"use client";

import { useState, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type InputMethod = 'file' | 'url';
type DocumentType = 'pdf' | 'image';

interface OCRResult
{
    success: boolean;
    text: string;
    pageCount: number;
    tables?: Array<{ id: string; content: string }>;
    images?: Array<{ id: string; image_base64?: string }>;
    hyperlinks?: Array<{ text: string; url: string }>;
}

interface OCRToolProps
{
    onClose: () => void;
    onResult?: ( result: OCRResult ) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const CopyIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OCRTool ( { onClose, onResult }: OCRToolProps )
{
    const [ inputMethod, setInputMethod ] = useState<InputMethod>( 'file' );
    const [ documentType, setDocumentType ] = useState<DocumentType>( 'pdf' );
    const [ url, setUrl ] = useState( '' );
    const [ isProcessing, setIsProcessing ] = useState( false );
    const [ result, setResult ] = useState<OCRResult | null>( null );
    const [ error, setError ] = useState<string | null>( null );
    const [ copied, setCopied ] = useState( false );
    const [ options, setOptions ] = useState( {
        tableFormat: 'markdown' as 'html' | 'markdown' | null,
        extractHeader: false,
        extractFooter: false,
        includeImageBase64: false
    } );

    const fileInputRef = useRef<HTMLInputElement>( null );
    const largeFileInputRef = useRef<HTMLInputElement>( null );

    // ═══════════════════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════

    const handleFileUpload = async ( e: React.ChangeEvent<HTMLInputElement> ) =>
    {
        const file = e.target.files?.[ 0 ];
        if ( !file ) return;

        setIsProcessing( true );
        setError( null );
        setResult( null );

        try
        {
            const base64 = await fileToBase64( file );
            const isPDF = file.type === 'application/pdf';

            const response = await fetch( '/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( {
                    type: isPDF ? 'document_base64' : 'image_base64',
                    base64,
                    ...options
                } )
            } );

            const data = await response.json();

            if ( data.success )
            {
                setResult( data );
                onResult?.( data );
            } else
            {
                setError( data.error || 'فشل استخراج النص' );
            }
        } catch ( err )
        {
            setError( err instanceof Error ? err.message : 'خطأ غير معروف' );
        } finally
        {
            setIsProcessing( false );
            e.target.value = '';
        }
    };

    const handleUrlSubmit = async () =>
    {
        if ( !url.trim() ) return;

        setIsProcessing( true );
        setError( null );
        setResult( null );

        try
        {
            const isPDF = documentType === 'pdf';

            const response = await fetch( '/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( {
                    type: isPDF ? 'document_url' : 'image_url',
                    [ isPDF ? 'documentUrl' : 'imageUrl' ]: url,
                    ...options
                } )
            } );

            const data = await response.json();

            if ( data.success )
            {
                setResult( data );
                onResult?.( data );
            } else
            {
                setError( data.error || 'فشل استخراج النص' );
            }
        } catch ( err )
        {
            setError( err instanceof Error ? err.message : 'خطأ غير معروف' );
        } finally
        {
            setIsProcessing( false );
        }
    };

    const handleLargeFileUpload = async ( e: React.ChangeEvent<HTMLInputElement> ) =>
    {
        const file = e.target.files?.[ 0 ];
        if ( !file ) return;

        setIsProcessing( true );
        setError( null );
        setResult( null );

        try
        {
            const formData = new FormData();
            formData.append( 'file', file );

            const response = await fetch( '/api/ocr', {
                method: 'PUT',
                body: formData
            } );

            const data = await response.json();

            if ( data.success )
            {
                setResult( data );
                onResult?.( data );
            } else
            {
                setError( data.error || 'فشل استخراج النص' );
            }
        } catch ( err )
        {
            setError( err instanceof Error ? err.message : 'خطأ غير معروف' );
        } finally
        {
            setIsProcessing( false );
            e.target.value = '';
        }
    };

    const copyToClipboard = async () =>
    {
        if ( result?.text )
        {
            await navigator.clipboard.writeText( result.text );
            setCopied( true );
            setTimeout( () => setCopied( false ), 2000 );
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════════

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={ ( e ) => e.target === e.currentTarget && onClose?.() }
        >
            <div className="w-[95vw] max-w-[320px] sm:max-w-sm lg:max-w-md bg-gradient-to-br from-[#244743]/90 via-[#244743]/80 to-[#244743]/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden max-h-[80vh] flex flex-col">
                {/* Header */ }
                <div className="flex items-center justify-between px-2 sm:px-3 py-2 border-b border-white/10 bg-gradient-to-r from-[#244743]/10 to-[#244743]/10">
                    <div className="flex items-center gap-2">
                        <div className="p-1 sm:p-1.5 bg-[#244743]/20 rounded-lg">
                            <svg className="w-4 h-4 text-[#244743]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                <path d="M7 8h8" />
                                <path d="M7 12h10" />
                                <path d="M7 16h6" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-semibold text-white">Mistral OCR</h2>
                            <p className="text-[9px] sm:text-[10px] text-gray-400">استخراج النصوص من المستندات والصور</p>
                        </div>
                    </div>
                    <button
                        onClick={ onClose }
                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */ }
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
                    {/* Input Method Tabs */ }
                    <div className="flex gap-1 p-0.5 bg-[#244743]/40 rounded-lg border border-[#244743]/30">
                        <button
                            onClick={ () => setInputMethod( 'file' ) }
                            className={ `flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${ inputMethod === 'file'
                                ? 'bg-[#244743] text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }` }
                        >
                            📁 رفع ملف
                        </button>
                        <button
                            onClick={ () => setInputMethod( 'url' ) }
                            className={ `flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${ inputMethod === 'url'
                                ? 'bg-[#244743] text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }` }
                        >
                            🔗 رابط URL
                        </button>
                    </div>

                    {/* Input Area */ }
                    { inputMethod === 'file' ? (
                        <div className="space-y-3">
                            <input
                                ref={ fileInputRef }
                                type="file"
                                accept="image/*,application/pdf,.docx,.pptx"
                                onChange={ handleFileUpload }
                                className="hidden"
                            />
                            <button
                                onClick={ () => fileInputRef.current?.click() }
                                disabled={ isProcessing }
                                className="w-full py-6 sm:py-8 border-2 border-dashed border-[#244743]/40 rounded-xl hover:border-[#244743]/50 hover:bg-[#244743]/5 transition-all flex flex-col items-center gap-2 group bg-[#244743]/20"
                            >
                                <div className="p-3 bg-[#244743]/40 rounded-full group-hover:bg-[#244743]/10 transition-colors">
                                    <UploadIcon />
                                </div>
                                <div className="text-center">
                                    <span className="text-gray-300 text-sm font-medium">اضغط لرفع ملف</span>
                                    <p className="text-[10px] text-gray-500 mt-1">PDF, Image, DOCX, PPTX</p>
                                </div>
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-xs text-gray-500">أو للملفات الكبيرة</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            <input
                                ref={ largeFileInputRef }
                                type="file"
                                accept="application/pdf,.docx,.pptx"
                                onChange={ handleLargeFileUpload }
                                className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:bg-[#244743] file:text-white file:font-medium hover:file:bg-[#244743]/90 file:cursor-pointer file:transition-colors"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <select
                                    value={ documentType }
                                    onChange={ ( e ) => setDocumentType( e.target.value as DocumentType ) }
                                    className="bg-[#244743]/60 border border-[#244743]/40 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#244743] focus:ring-1 focus:ring-[#244743] outline-none backdrop-blur-sm"
                                >
                                    <option value="pdf">📄 PDF</option>
                                    <option value="image">🖼️ صورة</option>
                                </select>
                                <input
                                    type="url"
                                    value={ url }
                                    onChange={ ( e ) => setUrl( e.target.value ) }
                                    placeholder="https://example.com/document.pdf"
                                    className="flex-1 bg-[#244743]/40 border border-[#244743]/30 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#244743] focus:ring-1 focus:ring-[#244743] outline-none backdrop-blur-sm"
                                />
                            </div>
                            <button
                                onClick={ handleUrlSubmit }
                                disabled={ isProcessing || !url.trim() }
                                className="w-full py-3 bg-[#244743] hover:bg-[#244743]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#244743]/20"
                            >
                                { isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        جاري المعالجة...
                                    </>
                                ) : (
                                    <>🔍 استخراج النص</>
                                ) }
                            </button>
                        </div>
                    ) }

                    {/* Options */ }
                    <div className="flex flex-wrap gap-4 p-4 bg-[#244743]/30 rounded-xl border border-[#244743]/20 backdrop-blur-sm">
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                            <input
                                type="checkbox"
                                checked={ options.extractHeader }
                                onChange={ ( e ) => setOptions( o => ( { ...o, extractHeader: e.target.checked } ) ) }
                                className="w-4 h-4 rounded border-[#244743] bg-[#244743]/50 text-[#244743] focus:ring-[#244743]"
                            />
                            استخراج الرأس
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                            <input
                                type="checkbox"
                                checked={ options.extractFooter }
                                onChange={ ( e ) => setOptions( o => ( { ...o, extractFooter: e.target.checked } ) ) }
                                className="w-4 h-4 rounded border-[#244743] bg-[#244743]/50 text-[#244743] focus:ring-[#244743]"
                            />
                            استخراج التذييل
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                            <input
                                type="checkbox"
                                checked={ options.includeImageBase64 }
                                onChange={ ( e ) => setOptions( o => ( { ...o, includeImageBase64: e.target.checked } ) ) }
                                className="w-4 h-4 rounded border-[#244743] bg-[#244743]/50 text-[#244743] focus:ring-[#244743]"
                            />
                            تضمين الصور
                        </label>
                        <select
                            value={ options.tableFormat || 'null' }
                            onChange={ ( e ) => setOptions( o => ( { ...o, tableFormat: e.target.value === 'null' ? null : e.target.value as 'html' | 'markdown' } ) ) }
                            className="bg-[#244743]/60 border border-[#244743]/40 rounded-lg px-3 py-1.5 text-sm text-gray-400 focus:border-[#244743] outline-none backdrop-blur-sm"
                        >
                            <option value="null">جداول: inline</option>
                            <option value="markdown">جداول: Markdown</option>
                            <option value="html">جداول: HTML</option>
                        </select>
                    </div>

                    {/* Processing Indicator */ }
                    { isProcessing && inputMethod === 'file' && (
                        <div className="flex items-center justify-center gap-3 py-6">
                            <div className="w-6 h-6 border-2 border-[#244743]/30 border-t-[#244743] rounded-full animate-spin"></div>
                            <span className="text-gray-400">جاري استخراج النص من المستند...</span>
                        </div>
                    ) }

                    {/* Error */ }
                    { error && (
                        <div className="p-4 bg-[#244743]/10 border border-[#244743]/20 rounded-xl text-[#244743] text-sm flex items-start gap-3">
                            <span className="text-lg">❌</span>
                            <span>{ error }</span>
                        </div>
                    ) }

                    {/* Result */ }
                    { result && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-[#244743]">✅</span>
                                    <span className="text-sm text-gray-300">
                                        تم استخراج <strong className="text-white">{ result.pageCount }</strong> صفحة
                                        { result.tables && result.tables.length > 0 && (
                                            <> • <strong className="text-white">{ result.tables.length }</strong> جدول</>
                                        ) }
                                        { result.hyperlinks && result.hyperlinks.length > 0 && (
                                            <> • <strong className="text-white">{ result.hyperlinks.length }</strong> رابط</>
                                        ) }
                                    </span>
                                </div>
                                <button
                                    onClick={ copyToClipboard }
                                    className={ `px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${ copied
                                        ? 'bg-[#244743] text-white'
                                        : 'bg-[#244743] hover:bg-[#244743]/90 text-white'
                                        }` }
                                >
                                    { copied ? <><CheckIcon /> تم النسخ</> : <><CopyIcon /> نسخ</> }
                                </button>
                            </div>
                            <div className="max-h-72 overflow-y-auto p-4 bg-black/40 rounded-xl border border-white/10">
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed" dir="auto">
                                    { result.text }
                                </pre>
                            </div>
                        </div>
                    ) }
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fileToBase64 ( file: File ): Promise<string>
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

export default OCRTool;
