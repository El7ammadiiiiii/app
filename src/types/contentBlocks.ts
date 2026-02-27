/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 6.3 — Typed Content Blocks
 * ═══════════════════════════════════════════════════════════════
 * Discriminated union of content block types for rich message rendering.
 * Each block has a `type` discriminator and type-specific properties.
 */

// ═══ Content Block Types ═══
export type ContentBlock =
  | TextBlock
  | CodeBlock
  | ImageBlock
  | ChartBlock
  | TableBlock
  | CanvasRefBlock
  | ThinkingBlock
  | ToolCallBlock
  | ErrorBlock
  | CitationBlock
  | WidgetBlock;

export interface TextBlock {
  type: "text";
  id: string;
  content: string;
  /** Optional formatting: "markdown" | "plain" */
  format?: "markdown" | "plain";
}

export interface CodeBlock {
  type: "code";
  id: string;
  language: string;
  content: string;
  filename?: string;
  /** Line highlight ranges, e.g. [[1,3], [7,7]] */
  highlights?: [number, number][];
}

export interface ImageBlock {
  type: "image";
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface ChartBlock {
  type: "chart";
  id: string;
  /** Chart.js or custom chart config */
  chartType: "line" | "bar" | "pie" | "scatter" | "candlestick";
  data: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface TableBlock {
  type: "table";
  id: string;
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface CanvasRefBlock {
  type: "canvas_ref";
  id: string;
  artifactId: string;
  title: string;
  canvasType: string;
}

export interface ThinkingBlock {
  type: "thinking";
  id: string;
  content: string;
  /** Duration in ms */
  duration?: number;
}

export interface ToolCallBlock {
  type: "tool_call";
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "completed" | "error";
}

export interface ErrorBlock {
  type: "error";
  id: string;
  message: string;
  code?: string;
}

export interface CitationBlock {
  type: "citation";
  id: string;
  sources: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
}

// ── Wave 7.4: GenUI Widget Block ──
export type WidgetKind = "price_chart" | "token_swap" | "portfolio";

export interface WidgetBlock {
  type: "widget";
  id: string;
  widgetKind: WidgetKind;
  /** Token symbol, e.g. "BTC", "ETH" */
  symbol?: string;
  /** Additional widget-specific props */
  props: Record<string, unknown>;
}

// ═══ Utilities ═══

/** Generate a unique block ID */
export function genBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Parse a plain text message into content blocks (simple heuristic) */
export function parseTextToBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({
          type: "text",
          id: genBlockId(),
          content: textContent,
          format: "markdown",
        });
      }
    }

    // Code block
    blocks.push({
      type: "code",
      id: genBlockId(),
      language: match[1] || "text",
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      blocks.push({
        type: "text",
        id: genBlockId(),
        content: remaining,
        format: "markdown",
      });
    }
  }

  // If no blocks parsed, wrap entire text
  if (blocks.length === 0) {
    blocks.push({
      type: "text",
      id: genBlockId(),
      content: text,
      format: "markdown",
    });
  }

  return blocks;
}

/** Check if a content block array has any code */
export function hasCodeBlocks(blocks: ContentBlock[]): boolean {
  return blocks.some((b) => b.type === "code");
}

/** Extract plain text from content blocks */
export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "text":
          return b.content;
        case "code":
          return `\`\`\`${b.language}\n${b.content}\n\`\`\``;
        case "image":
          return `[Image: ${b.alt || b.url}]`;
        case "table":
          return `[Table: ${b.caption || `${b.headers.length} columns`}]`;
        case "thinking":
          return `[Thinking: ${b.content.slice(0, 50)}...]`;
        case "tool_call":
          return `[Tool: ${b.toolName}]`;
        case "error":
          return `[Error: ${b.message}]`;
        case "citation":
          return b.sources.map((s) => `[${s.title}](${s.url})`).join(", ");
        case "canvas_ref":
          return `[Canvas: ${b.title}]`;
        case "chart":
          return `[Chart: ${b.chartType}]`;
        case "widget":
          return `[Widget: ${b.widgetKind}${b.symbol ? ` - ${b.symbol}` : ''}]`;
        default:
          return "";
      }
    })
    .join("\n\n");
}
