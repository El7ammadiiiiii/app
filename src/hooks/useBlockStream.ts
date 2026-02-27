'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.2 — useBlockStream Hook
 * ═══════════════════════════════════════════════════════════════
 *
 * Client-side hook for consuming block-level SSE events.
 * Replaces raw SSE parsing in chat-area.tsx with typed dispatch.
 *
 * Usage:
 *   const { processBlockStream } = useBlockStream({ onTextDelta, onThinkingDelta, ... });
 *   await processBlockStream(response);
 */

import { useCallback, useRef } from 'react';
import type { BlockEvent, BlockEventType } from '@/lib/sse/blockStreamTransformer';

export interface BlockStreamHandlers {
  onMessageStart?: (data: { id: string; model: string; timestamp: number }) => void;
  onTextDelta?: (content: string) => void;
  onThinkingDelta?: (content: string) => void;
  onToolCallStart?: (data: { toolCallId: string; toolName: string }) => void;
  onToolCallDelta?: (data: { toolCallId?: string; input: string }) => void;
  onCanvasAction?: (data: { action: string; identifier?: string; type?: string; content?: string }) => void;
  onError?: (data: { message: string; code?: string }) => void;
  onMessageDone?: (data: { finishReason: string; usage?: Record<string, number> }) => void;
}

export function useBlockStream(handlers: BlockStreamHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  /**
   * Process a streaming Response that emits block-level SSE events.
   * Reads the stream, parses typed events, and dispatches to handlers.
   */
  const processBlockStream = useCallback(async (response: Response): Promise<void> => {
    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback: non-streaming response
      try {
        const data = await response.json();
        const text = data?.content ?? data?.text ?? data?.message ?? '';
        if (text) {
          handlersRef.current.onTextDelta?.(text);
        }
      } catch {
        handlersRef.current.onError?.({ message: 'Failed to read response' });
      }
      handlersRef.current.onMessageDone?.({ finishReason: 'fallback' });
      return;
    }

    const decoder = new TextDecoder();
    let sseBuffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();

          // Legacy [DONE] sentinel
          if (raw === '[DONE]') {
            handlersRef.current.onMessageDone?.({ finishReason: 'stop' });
            continue;
          }

          try {
            const parsed = JSON.parse(raw);

            // ── New block-event protocol ──
            if (parsed.type && typeof parsed.data === 'object') {
              dispatchBlockEvent(parsed as BlockEvent, handlersRef.current);
              continue;
            }

            // ── Legacy: raw provider format (backward compat) ──
            const chunkText = parsed?.content
              ?? parsed?.choices?.[0]?.delta?.content
              ?? '';

            if (chunkText) {
              handlersRef.current.onTextDelta?.(chunkText);
            }

            // Legacy finish
            const finish = parsed?.choices?.[0]?.finish_reason;
            if (finish) {
              handlersRef.current.onMessageDone?.({ finishReason: finish, usage: parsed.usage });
            }
          } catch {
            // Non-JSON — raw text passthrough
            if (raw) {
              handlersRef.current.onTextDelta?.(raw);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  return { processBlockStream };
}

/** Dispatch a typed BlockEvent to the appropriate handler */
function dispatchBlockEvent(event: BlockEvent, handlers: BlockStreamHandlers) {
  const dispatch: Record<BlockEventType, (() => void) | undefined> = {
    message_start: () => handlers.onMessageStart?.(event.data as any),
    text_delta: () => handlers.onTextDelta?.(event.data.content),
    thinking_delta: () => handlers.onThinkingDelta?.(event.data.content),
    tool_call_start: () => handlers.onToolCallStart?.(event.data as any),
    tool_call_delta: () => handlers.onToolCallDelta?.(event.data as any),
    canvas_action: () => handlers.onCanvasAction?.(event.data as any),
    error: () => handlers.onError?.(event.data as any),
    message_done: () => handlers.onMessageDone?.(event.data as any),
  };

  dispatch[event.type]?.();
}
