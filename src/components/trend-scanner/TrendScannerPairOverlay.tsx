'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { TrendScannerPairContent } from '@/app/chat/trend-scanner/[pair]/page';
import
{
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TrendScannerPairOverlayProps
{
    symbol: string;
    isOpen: boolean;
    onClose: () => void;
}

type ExportMode = 'none' | 'png' | 'pdf';

const getSafePixelRatio = () =>
{
    if ( typeof window === 'undefined' ) return 2;
    const dpr = window.devicePixelRatio || 1;
    return Math.min( 2, dpr );
};

const formatFilename = ( symbol: string, suffix: string ) =>
{
    const normalized = symbol.replace( '/', '' ).toUpperCase();
    return `trend-${ normalized }-${ suffix }`;
};

export function TrendScannerPairOverlay ( { symbol, isOpen, onClose }: TrendScannerPairOverlayProps )
{
    const exportRef = useRef<HTMLDivElement>( null );
    const pushedStateRef = useRef( false );
    const closingRef = useRef( false );
    const [ exportMode, setExportMode ] = useState<ExportMode>( 'none' );
    const [ isExporting, setIsExporting ] = useState( false );

    const closeOverlay = useCallback( () =>
    {
        if ( !pushedStateRef.current )
        {
            onClose();
            return;
        }
        closingRef.current = true;
        window.history.back();
    }, [ onClose ] );

    useEffect( () =>
    {
        if ( !isOpen ) return;

        if ( !pushedStateRef.current )
        {
            window.history.pushState( { overlay: 'trend-scanner-pair', symbol }, '', window.location.href );
            pushedStateRef.current = true;
        }

        const handlePopState = () =>
        {
            if ( !pushedStateRef.current ) return;
            pushedStateRef.current = false;
            if ( closingRef.current )
            {
                closingRef.current = false;
            }
            onClose();
        };

        const handleEscape = ( e: KeyboardEvent ) =>
        {
            if ( e.key === 'Escape' ) closeOverlay();
        };

        window.addEventListener( 'popstate', handlePopState );
        window.addEventListener( 'keydown', handleEscape );
        document.body.style.overflow = 'hidden';

        return () =>
        {
            window.removeEventListener( 'popstate', handlePopState );
            window.removeEventListener( 'keydown', handleEscape );
            document.body.style.overflow = '';
        };
    }, [ closeOverlay, isOpen, onClose, symbol ] );

    const captureExportSurface = async ( mode: ExportMode ) =>
    {
        const node = exportRef.current;
        if ( !node ) return null;

        const exportWidth = node.scrollWidth;
        const exportHeight = node.scrollHeight;

        const dataUrl = await toPng( node, {
            cacheBust: true,
            backgroundColor: mode === 'pdf' ? '#ffffff' : undefined,
            pixelRatio: getSafePixelRatio(),
            width: exportWidth,
            height: exportHeight,
            style: {
                width: `${ exportWidth }px`,
                height: `${ exportHeight }px`,
            },
            filter: ( target ) =>
            {
                if ( !( target instanceof HTMLElement ) ) return true;
                return target.dataset.exportHide !== 'true';
            }
        } );

        return dataUrl;
    };

    const handleSaveImage = async () =>
    {
        if ( isExporting ) return;
        setIsExporting( true );
        setExportMode( 'png' );

        try
        {
            await new Promise( requestAnimationFrame );
            const dataUrl = await captureExportSurface( 'png' );
            if ( !dataUrl ) return;
            const link = document.createElement( 'a' );
            link.download = `${ formatFilename( symbol, 'image' ) }.png`;
            link.href = dataUrl;
            link.click();
        } finally
        {
            setExportMode( 'none' );
            setIsExporting( false );
        }
    };

    const handleSavePdf = async () =>
    {
        if ( isExporting ) return;
        setIsExporting( true );
        setExportMode( 'pdf' );

        try
        {
            await new Promise( requestAnimationFrame );
            const dataUrl = await captureExportSurface( 'pdf' );
            if ( !dataUrl ) return;

            const { jsPDF } = await import( 'jspdf' );
            const pdf = new jsPDF( { orientation: 'portrait', unit: 'pt', format: 'a4' } );
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const img = new Image();
            img.src = dataUrl;

            await new Promise<void>( ( resolve ) =>
            {
                img.onload = () => resolve();
            } );

            const imgWidth = pageWidth;
            const imgHeight = ( img.height * pageWidth ) / img.width;
            let remainingHeight = imgHeight;
            let position = 0;

            while ( remainingHeight > 0 )
            {
                pdf.addImage( dataUrl, 'PNG', 0, position, imgWidth, imgHeight );
                remainingHeight -= pageHeight;
                position -= pageHeight;
                if ( remainingHeight > 0 ) pdf.addPage();
            }

            pdf.save( `${ formatFilename( symbol, 'export' ) }.pdf` );
        } finally
        {
            setExportMode( 'none' );
            setIsExporting( false );
        }
    };

    if ( !isOpen ) return null;

    // Render overlay using React Portal to escape any parent stacking contexts
    const overlayContent = (
        <div
            className="overlay-modal-root"
            style={ {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999999,
                isolation: 'isolate',
            } }
        >
            {/* Dark backdrop - click to close */ }
            <div
                style={ {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                } }
                onClick={ closeOverlay }
            />

            {/* Modal Card - Full screen with 8px margin */ }
            <div
                style={ {
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    right: '8px',
                    bottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    background: 'linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)',
                    border: '2px solid rgba(20, 184, 166, 0.4)',
                    boxShadow: '0 0 60px rgba(0, 0, 0, 0.9)',
                    overflow: 'hidden',
                } }
            >
                {/* ===== HEADER BAR ===== */ }
                <div
                    data-export-hide="true"
                    style={ {
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#264a46',
                        borderBottom: '1px solid rgba(20, 184, 166, 0.3)',
                        minHeight: '56px',
                    } }
                >
                    {/* Left: Close Button */ }
                    <button
                        onClick={ closeOverlay }
                        style={ {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#173532',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                        } }
                    >
                        <X className="w-5 h-5" />
                        Close
                    </button>

                    {/* Center: Symbol Name */ }
                    <div style={ {
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '18px',
                        letterSpacing: '0.5px',
                    } }>
                        { symbol.replace( 'USDT', ' / USDT' ) }
                    </div>

                    {/* Right: Export Button */ }
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                disabled={ isExporting }
                                style={ {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#173532',
                                    border: '1px solid rgba(20, 184, 166, 0.3)',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                } }
                            >
                                { isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" /> }
                                Export
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-44 border"
                            style={ { zIndex: 9999999, backgroundColor: '#264a46', borderColor: 'rgba(20, 184, 166, 0.3)' } }
                        >
                            <DropdownMenuItem
                                onClick={ handleSavePdf }
                                className="flex items-center gap-2 text-sm text-white cursor-pointer"
                                style={ { backgroundColor: 'transparent' } }
                            >
                                <FileText className="w-4 h-4 text-emerald-400" />
                                Save as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={ handleSaveImage }
                                className="flex items-center gap-2 text-sm text-white cursor-pointer"
                                style={ { backgroundColor: 'transparent' } }
                            >
                                <ImageIcon className="w-4 h-4 text-cyan-400" />
                                Save as Image
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* ===== SCROLLABLE CONTENT ===== */ }
                <div
                    ref={ exportRef }
                    style={ {
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        background: 'linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)',
                        minHeight: 0,
                    } }
                >
                    <div style={ { padding: '16px', maxWidth: '1600px', margin: '0 auto' } }>
                        <TrendScannerPairContent
                            symbol={ symbol }
                            embedded
                            showBackButton={ false }
                            onClose={ closeOverlay }
                            exportMode={ exportMode }
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    // Use createPortal to render at document.body level, escaping all parent stacking contexts
    if ( typeof document !== 'undefined' )
    {
        return createPortal( overlayContent, document.body );
    }

    return overlayContent;
}

export default TrendScannerPairOverlay;
