/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.2 — Block Stream Transformer
 * ═══════════════════════════════════════════════════════════════
 *
 * TransformStream that converts raw provider SSE into a unified
 * block-level event protocol.
 *
 * Input:  raw SSE bytes from providers (OpenAI, Anthropic, Google, etc.)
 * Output: normalized SSE with typed events:
 *   - message_start   { id, model, timestamp }
 *   - text_delta       { content }
 *   - thinking_delta  { content }
 *   - tool_call_start { toolName, toolCallId }
 *   - tool_call_delta { input }
 *   - canvas_action   { action, identifier, type, content }
 *   - error           { message, code? }
 *   - message_done    { finishReason, usage? }
 */

export type BlockEventType =
  | 'message_start'
  | 'text_delta'
  | 'thinking_delta'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'canvas_action'
  | 'error'
  | 'message_done';

export interface BlockEvent {
  type: BlockEventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'mistral' | 'meta' | 'alibaba' | 'amazon' | 'vertexMeta' | 'vertexMistral' | 'vertexGoogle';

/**
 * Create a TransformStream that normalizes raw provider SSE
 * into our unified block-event protocol.
 */
export function createBlockTransformer(provider: Provider, model?: string): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let sseBuffer = '';
  let sentStart = false;

  function sendSSE(controller: TransformStreamDefaultController<Uint8Array>, event: BlockEvent) {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(encoder.encode(line));
  }

  return new TransformStream({
    transform(chunk, controller) {
      sseBuffer += decoder.decode(chunk, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      // Emit message_start once
      if (!sentStart) {
        sentStart = true;
        sendSSE(controller, {
          type: 'message_start',
          data: { id: crypto.randomUUID(), model: model || 'unknown', timestamp: Date.now() },
        });
      }

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          sendSSE(controller, { type: 'message_done', data: { finishReason: 'stop' } });
          continue;
        }

        try {
          const parsed = JSON.parse(raw);
          const events = normalizeProviderEvent(provider, parsed);
          for (const evt of events) {
            sendSSE(controller, evt);
          }
        } catch {
          // Non-JSON raw text — treat as text_delta
          if (raw) {
            sendSSE(controller, { type: 'text_delta', data: { content: raw } });
          }
        }
      }
    },

    flush(controller) {
      // Process any remaining buffer
      if (sseBuffer.trim()) {
        const remaining = sseBuffer.trim();
        if (remaining.startsWith('data: ')) {
          const raw = remaining.slice(6).trim();
          if (raw !== '[DONE]') {
            try {
              const parsed = JSON.parse(raw);
              const events = normalizeProviderEvent(provider, parsed);
              for (const evt of events) {
                sendSSE(controller, evt);
              }
            } catch {
              if (raw) {
                sendSSE(controller, { type: 'text_delta', data: { content: raw } });
              }
            }
          }
        }
      }
      // Always send message_done at end
      sendSSE(controller, { type: 'message_done', data: { finishReason: 'end_of_stream' } });
    },
  });
}

// ═══ Provider-specific normalizers ═══

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProviderEvent(provider: Provider, parsed: any): BlockEvent[] {
  switch (provider) {
    case 'openai':
    case 'xai':
    case 'deepseek':
    case 'mistral':
    case 'meta':
    case 'vertexMeta':
    case 'vertexMistral':
      return normalizeOpenAIFormat(parsed);
    case 'anthropic':
      return normalizeAnthropicFormat(parsed);
    case 'google':
    case 'vertexGoogle':
      return normalizeGoogleFormat(parsed);
    case 'alibaba':
      return normalizeAlibabaFormat(parsed);
    case 'amazon':
      return normalizeOpenAIFormat(parsed);
    default:
      return normalizeOpenAIFormat(parsed);
  }
}

/**
 * OpenAI-compatible format (also used by xai, deepseek, mistral, meta)
 * { choices: [{ delta: { content, role, tool_calls }, finish_reason }], usage }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOpenAIFormat(parsed: any): BlockEvent[] {
  const events: BlockEvent[] = [];
  const choice = parsed?.choices?.[0];
  if (!choice) return events;

  const delta = choice.delta;
  if (!delta) return events;

  // Text content
  if (delta.content) {
    events.push({ type: 'text_delta', data: { content: delta.content } });
  }

  // Reasoning / thinking content (OpenAI o-series, DeepSeek reasoning)
  if (delta.reasoning_content) {
    events.push({ type: 'thinking_delta', data: { content: delta.reasoning_content } });
  }

  // Tool calls
  if (delta.tool_calls) {
    for (const tc of delta.tool_calls) {
      if (tc.function?.name) {
        events.push({
          type: 'tool_call_start',
          data: { toolCallId: tc.id || tc.index, toolName: tc.function.name },
        });
      }
      if (tc.function?.arguments) {
        events.push({
          type: 'tool_call_delta',
          data: { toolCallId: tc.id || tc.index, input: tc.function.arguments },
        });
      }
    }
  }

  // Finish reason
  if (choice.finish_reason) {
    events.push({
      type: 'message_done',
      data: {
        finishReason: choice.finish_reason,
        usage: parsed.usage || undefined,
      },
    });
  }

  return events;
}

/**
 * Anthropic format
 * Event-based: content_block_start, content_block_delta, content_block_stop,
 * message_start, message_delta, message_stop
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAnthropicFormat(parsed: any): BlockEvent[] {
  const events: BlockEvent[] = [];

  // Anthropic uses a `type` field at the top level
  switch (parsed.type) {
    case 'content_block_start': {
      const cb = parsed.content_block;
      if (cb?.type === 'tool_use') {
        events.push({
          type: 'tool_call_start',
          data: { toolCallId: cb.id, toolName: cb.name },
        });
      }
      break;
    }
    case 'content_block_delta': {
      const delta = parsed.delta;
      if (delta?.type === 'text_delta') {
        events.push({ type: 'text_delta', data: { content: delta.text } });
      } else if (delta?.type === 'thinking_delta') {
        events.push({ type: 'thinking_delta', data: { content: delta.thinking } });
      } else if (delta?.type === 'input_json_delta') {
        events.push({
          type: 'tool_call_delta',
          data: { input: delta.partial_json },
        });
      }
      break;
    }
    case 'message_delta': {
      if (parsed.delta?.stop_reason) {
        events.push({
          type: 'message_done',
          data: {
            finishReason: parsed.delta.stop_reason,
            usage: parsed.usage || undefined,
          },
        });
      }
      break;
    }
    case 'message_stop':
      events.push({ type: 'message_done', data: { finishReason: 'end_turn' } });
      break;
    case 'error':
      events.push({ type: 'error', data: { message: parsed.error?.message || 'Unknown error' } });
      break;
    default:
      // For Anthropic raw content passthrough
      if (parsed.content) {
        events.push({ type: 'text_delta', data: { content: parsed.content } });
      }
      break;
  }

  return events;
}

/**
 * Google (Gemini) format
 * { candidates: [{ content: { parts: [{ text }] }, finishReason }] }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGoogleFormat(parsed: any): BlockEvent[] {
  const events: BlockEvent[] = [];
  const candidate = parsed?.candidates?.[0];
  if (!candidate) return events;

  // Text parts
  const parts = candidate.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.text) {
        events.push({ type: 'text_delta', data: { content: part.text } });
      }
      if (part.thought) {
        events.push({ type: 'thinking_delta', data: { content: part.thought } });
      }
      if (part.functionCall) {
        events.push({
          type: 'tool_call_start',
          data: { toolName: part.functionCall.name, input: JSON.stringify(part.functionCall.args) },
        });
      }
    }
  }

  // Finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    events.push({
      type: 'message_done',
      data: { finishReason: candidate.finishReason },
    });
  }

  return events;
}

/**
 * Alibaba (Dashscope) format
 * { output: { text }, usage }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAlibabaFormat(parsed: any): BlockEvent[] {
  const events: BlockEvent[] = [];

  const text = parsed?.output?.text;
  if (text) {
    events.push({ type: 'text_delta', data: { content: text } });
  }

  if (parsed?.output?.finish_reason === 'stop') {
    events.push({
      type: 'message_done',
      data: { finishReason: 'stop', usage: parsed.usage },
    });
  }

  return events;
}
