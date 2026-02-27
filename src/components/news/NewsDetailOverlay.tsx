'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { NewsItem } from '@/lib/news/types';
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';

type ExportMode = 'none' | 'png' | 'pdf';

const getSafePixelRatio = () =>
{
  if ( typeof window === 'undefined' ) return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min( 2, dpr );
};

const formatFilename = ( item: NewsItem, suffix: string ) =>
{
  const date = new Date( item.publishedAtMs || Date.now() );
  const y = date.getUTCFullYear();
  const m = String( date.getUTCMonth() + 1 ).padStart( 2, '0' );
  const d = String( date.getUTCDate() ).padStart( 2, '0' );
  const safeTitle = item.title
    .slice( 0, 60 )
    .replace( /[^a-zA-Z0-9\-_ ]/g, '' )
    .trim()
    .replace( /\s+/g, '-' );
  return `news-${ item.source.id }-${ y }${ m }${ d }-${ safeTitle }-${ suffix }`;
};

function formatEnglishDateTime ( iso: string ): string
{
  const dt = new Date( iso );
  try
  {
    return new Intl.DateTimeFormat( 'en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    } ).format( dt );
  } catch
  {
    return dt.toUTCString();
  }
}

export function NewsDetailOverlay ( { item, isOpen, onClose }: { item: NewsItem | null; isOpen: boolean; onClose: () => void } )
{
  const exportRef = useRef<HTMLDivElement>( null );
  const pushedStateRef = useRef( false );
  const closingRef = useRef( false );
  const [ exportMode, setExportMode ] = useState<ExportMode>( 'none' );
  const [ isExporting, setIsExporting ] = useState( false );

  const dateLabel = useMemo( () => ( item ? formatEnglishDateTime( item.publishedAt ) : '' ), [ item ] );

  useEffect( () =>
  {
    if ( !isOpen ) return;

    if ( !pushedStateRef.current )
    {
      window.history.pushState( { overlay: 'news-detail', id: item?.id }, '', window.location.href );
      pushedStateRef.current = true;
    }

    const handlePopState = () =>
    {
      if ( !pushedStateRef.current ) return;
      pushedStateRef.current = false;
      if ( closingRef.current ) closingRef.current = false;
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
  }, [ isOpen, onClose, item?.id ] );

  const closeOverlay = () =>
  {
    if ( !pushedStateRef.current )
    {
      onClose();
      return;
    }
    closingRef.current = true;
    window.history.back();
  };

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
      },
    } );

    return dataUrl;
  };

  const handleSaveImage = async () =>
  {
    if ( !item || isExporting ) return;
    setIsExporting( true );
    setExportMode( 'png' );

    try
    {
      await new Promise( requestAnimationFrame );
      const dataUrl = await captureExportSurface( 'png' );
      if ( !dataUrl ) return;
      const link = document.createElement( 'a' );
      link.download = `${ formatFilename( item, 'image' ) }.png`;
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
    if ( !item || isExporting ) return;
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

      pdf.save( `${ formatFilename( item, 'export' ) }.pdf` );
    } finally
    {
      setExportMode( 'none' );
      setIsExporting( false );
    }
  };

  if ( !isOpen || !item ) return null;

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
          <button
            onClick={ closeOverlay }
            style={ {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#173532',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
            } }
            aria-label="Close"
          >
            <X size={ 18 } />
            Close
          </button>

          <div style={ { display: 'flex', alignItems: 'center', gap: '10px' } }>
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
                    border: '1px solid rgba(20, 184, 166, 0.35)',
                    color: '#fff',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    opacity: isExporting ? 0.75 : 1,
                  } }
                >
                  { isExporting ? <Loader2 size={ 18 } className="animate-spin" /> : <Download size={ 18 } /> }
                  Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="overlay-dropdown">
                <DropdownMenuItem onClick={ handleSaveImage } disabled={ isExporting }>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Save as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={ handleSavePdf } disabled={ isExporting }>
                  <FileText className="mr-2 h-4 w-4" />
                  Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          style={ {
            flex: 1,
            overflow: 'auto',
            padding: '16px',
          } }
        >
          <div
            ref={ exportRef }
            style={ {
              maxWidth: '980px',
              margin: '0 auto',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: exportMode === 'pdf' ? '#ffffff' : 'rgba(255,255,255,0.04)',
              color: exportMode === 'pdf' ? '#111827' : '#ffffff',
              padding: '18px',
            } }
          >
            <div style={ { display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' } }>
              <div
                style={ {
                  width: '220px',
                  height: '140px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: exportMode === 'pdf' ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.12)',
                  background: exportMode === 'pdf' ? '#f3f4f6' : 'rgba(255,255,255,0.06)',
                  flexShrink: 0,
                } }
              >
                { item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ item.imageUrl } alt={ item.title } style={ { width: '100%', height: '100%', objectFit: 'cover' } } />
                ) : (
                  <div style={ { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 } }>
                    <ImageIcon size={ 28 } />
                  </div>
                ) }
              </div>

              <div style={ { flex: 1, minWidth: '280px' } }>
                <div style={ { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }>
                  <div
                    style={ {
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: exportMode === 'pdf' ? '#e5e7eb' : 'rgba(34, 211, 238, 0.12)',
                      border: exportMode === 'pdf' ? '1px solid #d1d5db' : '1px solid rgba(34, 211, 238, 0.25)',
                      fontSize: '12px',
                      fontWeight: 800,
                    } }
                  >
                    { item.source.name }
                  </div>
                  <div style={ { fontSize: '12px', opacity: exportMode === 'pdf' ? 0.8 : 0.75 } }>
                    { dateLabel }
                  </div>
                </div>

                <h2 style={ { marginTop: '10px', fontSize: '20px', fontWeight: 900, lineHeight: 1.2 } }>{ item.title }</h2>

                { item.excerpt ? (
                  <p style={ { marginTop: '12px', fontSize: '14px', lineHeight: 1.7, opacity: exportMode === 'pdf' ? 0.9 : 0.85 } }>
                    { item.excerpt }
                  </p>
                ) : null }

                <div style={ { marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' } }>
                  <a
                    href={ item.url }
                    target="_blank"
                    rel="noreferrer"
                    style={ {
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: exportMode === 'pdf' ? '#111827' : 'rgba(255,255,255,0.06)',
                      border: exportMode === 'pdf' ? '1px solid #111827' : '1px solid rgba(255,255,255,0.12)',
                      color: exportMode === 'pdf' ? '#ffffff' : '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: '13px',
                    } }
                  >
                    Open original article
                  </a>
                </div>
              </div>
            </div>

            <div
              style={ {
                marginTop: '16px',
                borderTop: exportMode === 'pdf' ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.10)',
                paddingTop: '12px',
                fontSize: '11px',
                opacity: exportMode === 'pdf' ? 0.75 : 0.65,
                lineHeight: 1.5,
              } }
            >
              Note: This view shows a short excerpt (not the full republished article).
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal( overlayContent, document.body );
}
