/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * useResizable — C.1 fix: Functional drag-to-resize
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Hook for draggable resize separator between chat and canvas panels.
 * Persists width to localStorage like ChatGPT (oai/apps/canmoreSidebarWidth).
 *
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizableOptions
{
  /** Minimum width for the left panel (chat) */
  minLeftWidth?: number;
  /** Minimum width for the right panel (canvas) */
  minRightWidth?: number;
  /** localStorage key for persisting the chat width ratio */
  storageKey?: string;
  /** Default ratio of the left panel (0-1) */
  defaultRatio?: number;
}

export function useResizable ( options: UseResizableOptions = {} )
{
  const {
    minLeftWidth = 360,
    minRightWidth = 400,
    storageKey = 'nexus-canvas-width-ratio',
    defaultRatio = 0.38,
  } = options;

  const [ ratio, setRatio ] = useState<number>( () =>
  {
    if ( typeof window === 'undefined' ) return defaultRatio;
    const saved = localStorage.getItem( storageKey );
    return saved ? parseFloat( saved ) : defaultRatio;
  } );

  const isDragging = useRef( false );
  const containerRef = useRef<HTMLDivElement | null>( null );

  const startResize = useCallback( ( e: React.MouseEvent | React.TouchEvent ) =>
  {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [] );

  useEffect( () =>
  {
    const handleMouseMove = ( e: MouseEvent ) =>
    {
      if ( !isDragging.current || !containerRef.current ) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calculate new ratio, clamped between min widths
      const minRatio = minLeftWidth / containerWidth;
      const maxRatio = 1 - ( minRightWidth / containerWidth );

      const newRatio = Math.max( minRatio, Math.min( maxRatio, mouseX / containerWidth ) );
      setRatio( newRatio );
    };

    const handleTouchMove = ( e: TouchEvent ) =>
    {
      if ( !isDragging.current || !containerRef.current || !e.touches[ 0 ] ) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const touchX = e.touches[ 0 ].clientX - containerRect.left;

      const minRatio = minLeftWidth / containerWidth;
      const maxRatio = 1 - ( minRightWidth / containerWidth );

      const newRatio = Math.max( minRatio, Math.min( maxRatio, touchX / containerWidth ) );
      setRatio( newRatio );
    };

    const handleEnd = () =>
    {
      if ( isDragging.current )
      {
        isDragging.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        // Persist to localStorage
        localStorage.setItem( storageKey, ratio.toString() );
      }
    };

    window.addEventListener( 'mousemove', handleMouseMove );
    window.addEventListener( 'mouseup', handleEnd );
    window.addEventListener( 'touchmove', handleTouchMove );
    window.addEventListener( 'touchend', handleEnd );

    return () =>
    {
      window.removeEventListener( 'mousemove', handleMouseMove );
      window.removeEventListener( 'mouseup', handleEnd );
      window.removeEventListener( 'touchmove', handleTouchMove );
      window.removeEventListener( 'touchend', handleEnd );
    };
  }, [ minLeftWidth, minRightWidth, ratio, storageKey ] );

  // Save ratio changes
  useEffect( () =>
  {
    if ( isDragging.current )
    {
      localStorage.setItem( storageKey, ratio.toString() );
    }
  }, [ ratio, storageKey ] );

  // Double-click to reset
  const resetSize = useCallback( () =>
  {
    setRatio( defaultRatio );
    localStorage.setItem( storageKey, defaultRatio.toString() );
  }, [ defaultRatio, storageKey ] );

  // Build grid template from ratio
  const gridTemplate = `${ ratio * 100 }fr 6px ${ ( 1 - ratio ) * 100 }fr`;

  return {
    containerRef,
    startResize,
    resetSize,
    ratio,
    gridTemplate,
    isDragging: isDragging.current,
  };
}
