/**
 * ═══════════════════════════════════════════════════════════════
 * useToolCallCanvasHandler — Function Calling → Canvas Bridge
 * ═══════════════════════════════════════════════════════════════
 *
 * Processes tool_call_start / tool_call_delta / tool_call_end
 * block events from the SSE stream.  When the tool is `open_canvas`,
 * incrementally parses the JSON arguments and:
 *   1. Opens the Canvas panel with the correct type
 *   2. Streams the `content` field in real-time into the Canvas editor
 *
 * Usage in chat-area:
 *   const { handleToolEvent, reset } = useToolCallCanvasHandler();
 *   // inside SSE loop:
 *   case 'tool_call_start':
 *   case 'tool_call_delta':
 *   case 'tool_call_end':
 *     handleToolEvent(parsed);
 *     break;
 */

import { useRef, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { resolveCanvasType, CanvasType } from '@/store/canvasStore';
import { isCanvasToolCall } from '@/lib/ai/tools/canvasToolDefinition';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ToolCallAccumulator {
  toolCallId: string;
  toolName: string;
  rawJson: string;           // accumulated JSON string from deltas
  parsed: boolean;           // whether we successfully extracted type
  canvasType: CanvasType | null;
  title: string;
  contentStartIndex: number; // index in rawJson where "content":"…" value starts
  canvasOpened: boolean;     // whether we already called openCanvas
  contentBuffer: string;     // accumulated content streamed so far
}

interface BlockEvent {
  type: string;
  data: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// Incremental JSON field extractor
// ═══════════════════════════════════════════════════════════════

/**
 * Extract a simple string field from a partially-received JSON string.
 * Works even if the JSON is incomplete — useful for streaming.
 * Returns null if the field hasn't appeared yet.
 */
function extractField( json: string, field: string ): string | null {
  // Look for "field":"value" or "field": "value"
  const pattern = `"${field}"\\s*:\\s*"`;
  const regex = new RegExp( pattern );
  const match = regex.exec( json );
  if ( !match ) return null;

  const startIdx = match.index + match[0].length;
  // Find the closing quote (handle escaped quotes)
  let end = startIdx;
  let escaped = false;
  while ( end < json.length ) {
    if ( escaped ) { escaped = false; end++; continue; }
    if ( json[end] === '\\' ) { escaped = true; end++; continue; }
    if ( json[end] === '"' ) break;
    end++;
  }
  // If we hit the end without closing quote, return partial value
  return json.slice( startIdx, end );
}

/**
 * Find the start index of "content":"..." value in JSON.
 * Returns -1 if not found yet.
 */
function findContentValueStart( json: string ): number {
  const pattern = /"content"\s*:\s*"/;
  const match = pattern.exec( json );
  if ( !match ) return -1;
  return match.index + match[0].length;
}

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════

export function useToolCallCanvasHandler( chatId?: string ) {
  const accRef = useRef<ToolCallAccumulator | null>( null );
  const store = useCanvasStore;

  /**
   * Process a single tool-related block event.
   * Returns true if the event was consumed (caller should not process further).
   */
  const handleToolEvent = useCallback( ( event: BlockEvent ): boolean => {
    const { type, data } = event;

    // ── tool_call_start ──
    if ( type === 'tool_call_start' ) {
      const toolName = data.toolName || '';
      if ( !isCanvasToolCall( toolName ) ) return false;

      accRef.current = {
        toolCallId: data.toolCallId || `tc_${Date.now()}`,
        toolName,
        rawJson: data.input || '',  // Google sends full args in start
        parsed: false,
        canvasType: null,
        title: '',
        contentStartIndex: -1,
        canvasOpened: false,
        contentBuffer: '',
      };

      // If Google sent full args in one shot, process immediately
      if ( data.input ) {
        processAccumulated();
      }

      return true;
    }

    // ── tool_call_delta ──
    if ( type === 'tool_call_delta' ) {
      if ( !accRef.current ) return false;
      const acc = accRef.current;

      // Append incremental JSON
      acc.rawJson += ( data.input || '' );

      // Try to extract canvas_type + title early
      if ( !acc.parsed ) {
        const typeVal = extractField( acc.rawJson, 'canvas_type' );
        if ( typeVal ) {
          acc.canvasType = resolveCanvasType( typeVal );
          acc.parsed = true;
        }
        const titleVal = extractField( acc.rawJson, 'title' );
        if ( titleVal ) {
          acc.title = titleVal;
        }
      }

      // Open canvas as soon as we have the type
      if ( acc.parsed && !acc.canvasOpened ) {
        openCanvasPanel( acc );
      }

      // Stream content incrementally
      if ( acc.canvasOpened ) {
        streamContentDelta( acc );
      }

      return true;
    }

    // ── tool_call_end ──
    if ( type === 'tool_call_end' ) {
      if ( !accRef.current ) return false;
      const acc = accRef.current;

      // Final processing — extract any remaining fields
      processAccumulated();

      // Finalize streaming
      if ( acc.canvasOpened ) {
        store.getState().setIsStreaming( false );
      }

      accRef.current = null;
      return true;
    }

    return false;
  }, [ chatId ] );

  /**
   * Process the full accumulated JSON — used for Google (all-at-once)
   * and for tool_call_end finalization.
   */
  function processAccumulated() {
    const acc = accRef.current;
    if ( !acc ) return;

    // Try full JSON parse
    try {
      const args = JSON.parse( acc.rawJson );
      if ( args.canvas_type && !acc.parsed ) {
        acc.canvasType = resolveCanvasType( args.canvas_type );
        acc.parsed = true;
      }
      if ( args.title ) acc.title = args.title;

      if ( acc.parsed && !acc.canvasOpened ) {
        openCanvasPanel( acc );
      }

      // Set full content at once
      if ( args.content && acc.canvasOpened ) {
        const state = store.getState();
        state.updateContent( args.content );
        acc.contentBuffer = args.content;
      }
    } catch {
      // Still incomplete JSON — normal during streaming
    }
  }

  /**
   * Open the Canvas panel with the resolved type.
   */
  function openCanvasPanel( acc: ToolCallAccumulator ) {
    const state = store.getState();
    const id = `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Determine language for code types
    let language = 'plaintext';
    if ( acc.canvasType === 'CODE_EDITOR' as CanvasType ) {
      // Try to extract language from title or content hints
      const langHint = extractField( acc.rawJson, 'language' );
      language = langHint || 'typescript';
    } else if ( acc.canvasType === 'WEB_PAGE' as CanvasType ) {
      language = 'html';
    }

    state.openCanvas({
      id,
      title: acc.title || 'Canvas',
      type: acc.canvasType!,
      language,
      initialContent: '',
      model: undefined,
    });
    state.setIsStreaming( true );
    acc.canvasOpened = true;

    // If we have a chatId, also create an artifact for persistence
    if ( chatId ) {
      state.createArtifact({
        title: acc.title || 'Canvas',
        type: acc.canvasType!,
        language,
        content: '',
        chatId,
      });
    }
  }

  /**
   * Stream content field incrementally into the Canvas editor.
   * We track our position in the raw JSON to extract new content chars.
   */
  function streamContentDelta( acc: ToolCallAccumulator ) {
    // Find where content value starts in the JSON
    if ( acc.contentStartIndex === -1 ) {
      acc.contentStartIndex = findContentValueStart( acc.rawJson );
      if ( acc.contentStartIndex === -1 ) return; // content field not started yet
    }

    // Extract as much content as we have so far
    const startIdx = acc.contentStartIndex;
    let end = startIdx;
    let escaped = false;

    while ( end < acc.rawJson.length ) {
      if ( escaped ) { escaped = false; end++; continue; }
      if ( acc.rawJson[end] === '\\' ) { escaped = true; end++; continue; }
      if ( acc.rawJson[end] === '"' ) break; // closing quote
      end++;
    }

    const currentContent = acc.rawJson.slice( startIdx, end )
      .replace( /\\n/g, '\n' )
      .replace( /\\t/g, '\t' )
      .replace( /\\"/g, '"' )
      .replace( /\\\\/g, '\\' );

    // Only update if we have new content
    if ( currentContent.length > acc.contentBuffer.length ) {
      acc.contentBuffer = currentContent;
      const state = store.getState();
      state.updateContent( currentContent );
    }
  }

  /**
   * Reset — call when starting a new message or on error.
   */
  const reset = useCallback( () => {
    if ( accRef.current?.canvasOpened ) {
      store.getState().setIsStreaming( false );
    }
    accRef.current = null;
  }, [] );

  /**
   * Check if we're currently accumulating a canvas tool call.
   */
  const isActive = useCallback( () => !!accRef.current, [] );

  return { handleToolEvent, reset, isActive };
}
