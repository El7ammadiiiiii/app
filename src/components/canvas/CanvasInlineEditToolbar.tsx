/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANVAS INLINE EDIT TOOLBAR — B.3 fix
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Floating glass-morphism toolbar replacing window.prompt()
 * Appears above selected text in Monaco/TipTap editors
 * Dispatches 'canvas:inline-edit-submit' with the edit instruction
 *
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Send } from 'lucide-react';

interface InlineEditPosition
{
  x: number;
  y: number;
  text: string;
}

export function CanvasInlineEditToolbar ()
{
  const [ position, setPosition ] = useState<InlineEditPosition | null>( null );
  const [ editPrompt, setEditPrompt ] = useState( '' );
  const [ isVisible, setIsVisible ] = useState( false );
  const inputRef = useRef<HTMLInputElement>( null );
  const toolbarRef = useRef<HTMLDivElement>( null );

  // Listen for selection events from Monaco/TipTap
  useEffect( () =>
  {
    const handleSelectionRequest = ( event: Event ) =>
    {
      const { x, y, text } = ( event as CustomEvent<InlineEditPosition> ).detail;
      setPosition( { x, y, text } );
      setIsVisible( true );
      setEditPrompt( '' );
      // Focus input after render
      setTimeout( () => inputRef.current?.focus(), 50 );
    };

    const handleClickOutside = ( e: MouseEvent ) =>
    {
      if ( toolbarRef.current && !toolbarRef.current.contains( e.target as Node ) )
      {
        handleClose();
      }
    };

    window.addEventListener( 'canvas:show-inline-edit', handleSelectionRequest );
    document.addEventListener( 'mousedown', handleClickOutside );

    return () =>
    {
      window.removeEventListener( 'canvas:show-inline-edit', handleSelectionRequest );
      document.removeEventListener( 'mousedown', handleClickOutside );
    };
  }, [] );

  const handleClose = useCallback( () =>
  {
    setIsVisible( false );
    setPosition( null );
    setEditPrompt( '' );
  }, [] );

  const handleSubmit = useCallback( () =>
  {
    if ( !editPrompt.trim() || !position ) return;

    // Dispatch the edit event for chat-area to handle
    window.dispatchEvent( new CustomEvent( 'canvas:inline-edit-submit', {
      detail: {
        text: position.text,
        prompt: editPrompt.trim(),
      }
    } ) );

    handleClose();
  }, [ editPrompt, position, handleClose ] );

  const handleKeyDown = useCallback( ( e: React.KeyboardEvent ) =>
  {
    if ( e.key === 'Enter' && !e.shiftKey )
    {
      e.preventDefault();
      handleSubmit();
    }
    if ( e.key === 'Escape' )
    {
      handleClose();
    }
  }, [ handleSubmit, handleClose ] );

  if ( !isVisible || !position ) return null;

  // Calculate position — clamp to viewport
  const left = Math.max( 16, Math.min( position.x - 150, window.innerWidth - 340 ) );
  const top = Math.max( 16, position.y - 60 );

  return (
    <div
      ref={ toolbarRef }
      className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-150"
      style={ { left, top } }
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl
        bg-black/70 backdrop-blur-2xl border border-white/[0.12]
        shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
        min-w-[300px] max-w-[400px]"
      >
        <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />

        <input
          ref={ inputRef }
          type="text"
          value={ editPrompt }
          onChange={ e => setEditPrompt( e.target.value ) }
          onKeyDown={ handleKeyDown }
          placeholder="ماذا تريد تعديله؟"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40
            outline-none border-none min-w-0"
          dir="rtl"
        />

        <button
          onClick={ handleSubmit }
          disabled={ !editPrompt.trim() }
          className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          title="تنفيذ"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={ handleClose }
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60
            hover:text-white transition-colors shrink-0"
          title="إلغاء"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected text preview */}
      <div className="mt-1 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-xl
        border border-white/[0.08] text-[11px] text-white/50 truncate max-w-[400px]"
        dir="ltr"
      >
        { position.text.length > 80 ? position.text.slice( 0, 80 ) + '...' : position.text }
      </div>
    </div>
  );
}
