/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTO CANVAS DETECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fallback detector — if the AI did NOT use <canvas_action> XML tags,
 * this hook analyzes the final response to decide if it should be
 * auto-migrated into a Canvas artifact.
 *
 * Thresholds:
 *   • Code block > 10 lines  → open as CODE canvas
 *   • Response > 500 words   → open as TEXT canvas
 *
 * @version 1.0.0
 */

import { useCallback } from 'react';
import { useCanvasStore, type CanvasType } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';

interface DetectionResult
{
  shouldOpen: boolean;
  type: CanvasType;
  language: string;
  title: string;
  content: string;
}

/**
 * Analyze text for auto-canvas eligibility.
 * Returns detection result without side effects.
 */
export function detectAutoCanvas ( text: string ): DetectionResult | null
{
  if ( !text || text.length < 50 ) return null;

  // Already handled by XML parser
  if ( text.includes( '<canvas_action>' ) ) return null;

  // ─── CODE detection: markdown code blocks > 10 lines ───
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let largestBlock = { lang: 'typescript', code: '', lines: 0 };

  let match;
  while ( ( match = codeBlockRegex.exec( text ) ) !== null )
  {
    const lang = match[ 1 ] || 'typescript';
    const code = match[ 2 ].trim();
    const lineCount = code.split( '\n' ).length;

    if ( lineCount > largestBlock.lines )
    {
      largestBlock = { lang, code, lines: lineCount };
    }
  }

  if ( largestBlock.lines > 10 )
  {
    // Determine canvas type based on language
    const webLangs = [ 'html', 'jsx', 'tsx', 'javascript', 'typescript', 'js', 'ts' ];
    const isDataViz = largestBlock.code.includes( 'Chart' ) || largestBlock.code.includes( 'chart' )
      || largestBlock.code.includes( 'graph' ) || largestBlock.code.includes( 'visualization' );

    return {
      shouldOpen: true,
      type: isDataViz ? 'DATA_VIZ' : 'CODE_EDITOR',
      language: normalizeLanguage( largestBlock.lang ),
      title: extractTitle( text ) || 'كود',
      content: largestBlock.code,
    };
  }

  // ─── TEXT detection: > 500 words ───
  const wordCount = text.split( /\s+/ ).filter( Boolean ).length;
  if ( wordCount > 500 )
  {
    return {
      shouldOpen: true,
      type: 'DOCUMENT',
      language: 'markdown',
      title: extractTitle( text ) || 'مستند',
      content: text,
    };
  }

  return null;
}

/** Normalize language aliases */
function normalizeLanguage ( lang: string ): string
{
  const map: Record<string, string> = {
    js: 'javascript', ts: 'typescript', py: 'python',
    rb: 'ruby', sh: 'bash', yml: 'yaml', md: 'markdown',
  };
  return map[ lang.toLowerCase() ] || lang.toLowerCase();
}

/** Extract a title from the first heading or first sentence */
function extractTitle ( text: string ): string
{
  // Try markdown heading
  const headingMatch = text.match( /^#+\s+(.+)/m );
  if ( headingMatch ) return headingMatch[ 1 ].slice( 0, 50 );

  // Try first line
  const firstLine = text.split( '\n' ).find( l => l.trim().length > 5 );
  if ( firstLine ) return firstLine.trim().slice( 0, 50 );

  return '';
}

/**
 * Hook for auto-canvas detection and creation.
 * Call `checkAndOpen(responseText)` after streaming completes.
 */
export function useAutoCanvasDetector ()
{
  const { createArtifact, isOpen } = useCanvasStore();

  const checkAndOpen = useCallback( ( responseText: string, messageId?: string ): string | null =>
  {
    // Don't auto-open if canvas is already open
    if ( isOpen ) return null;

    const result = detectAutoCanvas( responseText );
    if ( !result || !result.shouldOpen ) return null;

    const activeChatId = useChatStore.getState().activeChatId;
    if ( !activeChatId ) return null;

    const artifactId = createArtifact( {
      title: result.title,
      type: result.type,
      language: result.language,
      content: result.content,
      chatId: activeChatId,
      messageId,
    } );

    return artifactId;
  }, [ createArtifact, isOpen ] );

  return { checkAndOpen, detectAutoCanvas };
}
