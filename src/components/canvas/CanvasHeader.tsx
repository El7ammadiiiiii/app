import { useState, useEffect, useCallback } from 'react';
import useTimeout from '@/hooks/useTimeout';
import { useCanvasStore, CANVAS_TYPE_META } from '@/store/canvasStore';
import { ChevronLeft, ChevronRight, X, Copy, Check, Download, ArrowRight, Share2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportMenu } from './ExportMenu';
import { useCollaborativeCanvas } from '@/hooks/useCollaborativeCanvas';
import { CollabPresenceAvatars } from './CollabPresenceAvatars';

export function CanvasHeader ()
{
  const { title, type, versions, currentVersionIndex, setVersion, closeCanvas, isStreaming } = useCanvasStore();
  const currentVersion = versions[ currentVersionIndex ];
  const meta = CANVAS_TYPE_META[ type ];

  const [ isExportOpen, setIsExportOpen ] = useState( false );
  const [ copied, setCopied ] = useState( false );
  const [ showCloseConfirm, setShowCloseConfirm ] = useState( false );
  const [ shareUrl, setShareUrl ] = useState<string | null>( null );
  const [ isPublishing, setIsPublishing ] = useState( false );

  // Wave 6.5: Collaborative editing presence
  const { peers, isConnected } = useCollaborativeCanvas();

  // Track unsaved changes — compare current content to last saved
  const activeArtifactId = useCanvasStore( s => s.activeArtifactId );
  const artifacts = useCanvasStore( s => s.artifacts );
  const savedContent = artifacts.find( a => a.id === activeArtifactId )?.content || '';
  const currentContent = currentVersion?.content || '';
  const isDirty = currentContent !== savedContent && currentContent.length > 0;

  const handleCopyContent = async () =>
  {
    if ( currentVersion?.content )
    {
      await navigator.clipboard.writeText( currentVersion.content );
      setCopied( true );
    }
  };
  useTimeout( () => setCopied( false ), copied ? 2000 : undefined, [ copied ] );

  // Close with unsaved changes check
  const handleClose = useCallback( () =>
  {
    if ( isDirty && !isStreaming )
    {
      setShowCloseConfirm( true );
    } else
    {
      closeCanvas();
    }
  }, [ isDirty, isStreaming, closeCanvas ] );

  // Wave 5.4: Publish & Share handler
  const handlePublish = useCallback( async () =>
  {
    if ( !currentContent || isPublishing ) return;
    setIsPublishing( true );
    try
    {
      const res = await fetch( '/api/canvas/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( { title, type, language: 'markdown', content: currentContent } ),
      } );
      const data = await res.json();
      if ( data.url )
      {
        const fullUrl = `${ window.location.origin }${ data.url }`;
        setShareUrl( fullUrl );
        await navigator.clipboard.writeText( fullUrl );
      }
    } catch ( e )
    {
      console.error( 'Publish failed:', e );
    }
    setIsPublishing( false );
  }, [ currentContent, isPublishing, title, type ] );

  // Keyboard shortcuts: Escape to close, Ctrl+S to copy
  useEffect( () =>
  {
    const handleKeyDown = ( e: KeyboardEvent ) =>
    {
      // Escape — close canvas
      if ( e.key === 'Escape' )
      {
        e.preventDefault();
        handleClose();
      }
      // Ctrl+S / Cmd+S — copy content (prevent browser save)
      if ( ( e.ctrlKey || e.metaKey ) && e.key === 's' )
      {
        e.preventDefault();
        handleCopyContent();
      }
    };
    window.addEventListener( 'keydown', handleKeyDown );
    return () => window.removeEventListener( 'keydown', handleKeyDown );
  }, [ handleClose ] );

  return (
    <>
      <div role="toolbar" aria-label="شريط أدوات اللوحة" className="flex items-center justify-between p-3 h-14 border-b border-white/[0.06] glass-lite glass-lite--sheen relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm">{ title }</h2>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                style={ {
                  color: meta?.color || '#2dd4bf',
                  borderColor: `${ meta?.color || '#2dd4bf' }30`,
                  backgroundColor: `${ meta?.color || '#2dd4bf' }10`,
                } }
              >
                { meta?.label || type }
              </span>
            </div>
            { currentVersion && (
              <span className="text-[10px] text-muted-foreground">
                { new Date( currentVersion.timestamp ).toLocaleTimeString() }
              </span>
            ) }
          </div>

          { versions.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg p-0.5 glass-lite glass-lite--sheen">
              <button
                disabled={ currentVersionIndex >= versions.length - 1 }
                onClick={ () => setVersion( currentVersionIndex + 1 ) }
                className="p-1 hover:bg-white/10 rounded-md disabled:opacity-30 transition-colors"
                aria-label="الإصدار السابق"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-2 min-w-[2rem] text-center">
                v{ currentVersion?.version }
              </span>
              <button
                disabled={ currentVersionIndex <= 0 }
                onClick={ () => setVersion( currentVersionIndex - 1 ) }
                className="p-1 hover:bg-white/10 rounded-md disabled:opacity-30 transition-colors"
                aria-label="الإصدار التالي"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ) }
        </div>

        <div className="flex items-center gap-2">
          {/* Wave 6.5: Collab presence avatars */}
          <CollabPresenceAvatars peers={ peers } isConnected={ isConnected } />

          {/* Mobile: back to chat button */}
          <button
            onClick={ handleClose }
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground md:hidden"
            title="العودة للشات"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Wave 5.4: Share / Publish */}
          <button
            onClick={ handlePublish }
            disabled={ isPublishing || !currentContent }
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
            title={ shareUrl ? 'تم النسخ!' : 'مشاركة' }
          >
            { shareUrl ? <Link2 className="w-4 h-4 text-teal-400" /> : <Share2 className="w-4 h-4" /> }
          </button>

          {/* Export */}
          <div className="relative">
            <button
              onClick={ () => setIsExportOpen( !isExportOpen ) }
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              title="تصدير"
            >
              <Download className="w-4 h-4" />
            </button>
            { isExportOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={ () => setIsExportOpen( false ) }
                />
                <ExportMenu onClose={ () => setIsExportOpen( false ) } />
              </>
            ) }
          </div>

          {/* Copy Content */}
          <button
            onClick={ handleCopyContent }
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="نسخ المحتوى (Ctrl+S)"
          >
            { copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" /> }
          </button>

          {/* Close */}
          <button onClick={ handleClose } aria-label="إغلاق اللوحة" className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Unsaved Changes Confirmation */}
      { showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-backdrop p-4">
          <div className="w-full max-w-sm overlay-modal rounded-xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-center">هل تريد حفظ التغييرات؟</h3>
            <p className="text-sm text-muted-foreground text-center">
              لديك تغييرات غير محفوظة في هذا الـ Canvas
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={ () => { setShowCloseConfirm( false ); closeCanvas( true ); } }
              >
                إغلاق بدون حفظ
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-500"
                onClick={ () => {
                  setShowCloseConfirm( false );
                  // Explicitly save current content before closing
                  if ( activeArtifactId && currentContent ) {
                    useCanvasStore.getState().updateArtifact( activeArtifactId, currentContent );
                  }
                  closeCanvas();
                } }
              >
                حفظ وإغلاق
              </Button>
            </div>
            <button
              onClick={ () => setShowCloseConfirm( false ) }
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) }
    </>
  );
}
