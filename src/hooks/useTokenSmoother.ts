"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * ── Wave 2.1: Token Smoother / Word Pacing ──
 * 
 * Instead of dumping all tokens at once, this hook buffers incoming text
 * and reveals 2 words every 30ms — matching Perplexity's approach.
 * 
 * Usage:
 *   const { displayedText, newWordIndices, feedText, reset } = useTokenSmoother();
 *   // Call feedText(rawContent) whenever chatContent changes
 *   // displayedText = the paced output to render
 *   // newWordIndices = Set of word indices that just appeared (for fade animation)
 */

const WORDS_PER_FRAME = 2;
const FRAME_INTERVAL_MS = 30;

export function useTokenSmoother ()
{
  const [ displayedText, setDisplayedText ] = useState( "" );
  const [ newWordIndices, setNewWordIndices ] = useState<Set<number>>( new Set() );

  const fullTextRef = useRef( "" );
  const revealedCountRef = useRef( 0 ); // how many words have been revealed
  const timerRef = useRef<ReturnType<typeof setInterval> | null>( null );
  const isStreamingRef = useRef( false );

  // Split text into words preserving whitespace for accurate reconstruction
  const splitWords = useCallback( ( text: string ): string[] =>
  {
    // Split on word boundaries but keep the delimiters (whitespace/newlines)
    return text.split( /(\s+)/ ).filter( Boolean );
  }, [] );

  const stopTimer = useCallback( () =>
  {
    if ( timerRef.current )
    {
      clearInterval( timerRef.current );
      timerRef.current = null;
    }
  }, [] );

  const startTimer = useCallback( () =>
  {
    if ( timerRef.current ) return; // already running

    timerRef.current = setInterval( () =>
    {
      const allTokens = splitWords( fullTextRef.current );
      const totalTokens = allTokens.length;

      if ( revealedCountRef.current >= totalTokens )
      {
        // Caught up — if stream ended, stop. Otherwise keep polling.
        if ( !isStreamingRef.current )
        {
          stopTimer();
        }
        return;
      }

      // Reveal next batch of words
      const newCount = Math.min( revealedCountRef.current + WORDS_PER_FRAME, totalTokens );
      const newIndices = new Set<number>();
      for ( let i = revealedCountRef.current; i < newCount; i++ )
      {
        // Only track actual words (not whitespace tokens)
        if ( allTokens[ i ].trim() ) newIndices.add( i );
      }

      revealedCountRef.current = newCount;
      const revealed = allTokens.slice( 0, newCount ).join( "" );

      setDisplayedText( revealed );
      setNewWordIndices( newIndices );

      // Clear "new" state after animation duration (300ms)
      if ( newIndices.size > 0 )
      {
        setTimeout( () =>
        {
          setNewWordIndices( prev =>
          {
            const next = new Set( prev );
            newIndices.forEach( i => next.delete( i ) );
            return next;
          } );
        }, 350 );
      }
    }, FRAME_INTERVAL_MS );
  }, [ splitWords, stopTimer ] );

  /**
   * Feed new raw text from the stream. Call this every time chatContent changes.
   * The smoother will buffer and pace the output.
   */
  const feedText = useCallback( ( rawText: string ) =>
  {
    fullTextRef.current = rawText;
    isStreamingRef.current = true;
    startTimer();
  }, [ startTimer ] );

  /**
   * Call when streaming ends — flush remaining words quickly.
   */
  const finishStream = useCallback( () =>
  {
    isStreamingRef.current = false;
    // If all words already revealed, stop immediately
    const allTokens = splitWords( fullTextRef.current );
    if ( revealedCountRef.current >= allTokens.length )
    {
      stopTimer();
      setDisplayedText( fullTextRef.current );
    }
    // Otherwise the timer will catch up and stop itself
  }, [ splitWords, stopTimer ] );

  /**
   * Hard reset — for new messages
   */
  const reset = useCallback( () =>
  {
    stopTimer();
    fullTextRef.current = "";
    revealedCountRef.current = 0;
    isStreamingRef.current = false;
    setDisplayedText( "" );
    setNewWordIndices( new Set() );
  }, [ stopTimer ] );

  // Cleanup on unmount
  useEffect( () =>
  {
    return () => stopTimer();
  }, [ stopTimer ] );

  return {
    /** The paced text to display */
    displayedText,
    /** Set of word-token indices that just appeared (for CSS fade) */
    newWordIndices,
    /** All word tokens (including whitespace) for rendering with spans */
    allTokens: splitWords( fullTextRef.current ),
    /** Feed raw streaming text */
    feedText,
    /** Signal stream ended */
    finishStream,
    /** Hard reset */
    reset,
  };
}
