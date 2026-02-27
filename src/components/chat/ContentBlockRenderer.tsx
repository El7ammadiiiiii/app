"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 6.3 — Content Block Renderer
 * ═══════════════════════════════════════════════════════════════
 * Renders a list of ContentBlock[] with type-specific components.
 */

import { memo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/types/contentBlocks";
import { renderWidget } from "@/components/widgets/WidgetRegistry";
import {
  Code2, Image as ImageIcon, BarChart3, Table2,
  Brain, Wrench, AlertTriangle, ExternalLink, Presentation,
  Copy, Check,
} from "lucide-react";

const REMARK_PLUGINS = [remarkGfm, remarkMath] as any[];
const REHYPE_PLUGINS = [rehypeHighlight, rehypeKatex] as any[];

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

export const ContentBlockRenderer = memo(function ContentBlockRenderer({
  blocks,
  className,
}: ContentBlockRendererProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block) => (
        <BlockSwitch key={block.id} block={block} />
      ))}
    </div>
  );
});

function BlockSwitch({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlockView block={block} />;
    case "code":
      return <CodeBlockView block={block} />;
    case "image":
      return <ImageBlockView block={block} />;
    case "table":
      return <TableBlockView block={block} />;
    case "thinking":
      return <ThinkingBlockView block={block} />;
    case "tool_call":
      return <ToolCallBlockView block={block} />;
    case "error":
      return <ErrorBlockView block={block} />;
    case "citation":
      return <CitationBlockView block={block} />;
    case "canvas_ref":
      return <CanvasRefBlockView block={block} />;
    case "chart":
      return <ChartBlockView block={block} />;
    case "widget":
      return renderWidget(block);
    default:
      return null;
  }
}

// ═══ Individual block renderers ═══

function TextBlockView({ block }: { block: ContentBlock & { type: "text" } }) {
  if (block.format === "markdown" || !block.format) {
    return (
      <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
          {block.content}
        </ReactMarkdown>
      </div>
    );
  }
  return (
    <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
      {block.content}
    </div>
  );
}

function CodeBlockView({ block }: { block: ContentBlock & { type: "code" } }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [block.content]);

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.03]">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3 h-3 text-cyan-400/60" />
          <span className="text-[10px] font-mono text-white/40">
            {block.filename || block.language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white/30 hover:text-white/60"
          aria-label="نسخ الكود"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className={cn("text-xs font-mono text-white/70 leading-relaxed", block.language && `language-${block.language}`)}>
          {block.content}
        </code>
      </pre>
    </div>
  );
}

function ImageBlockView({ block }: { block: ContentBlock & { type: "image" } }) {
  return (
    <figure className="space-y-1.5">
      <div className="rounded-xl overflow-hidden border border-white/[0.08]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url}
          alt={block.alt || ""}
          width={block.width}
          height={block.height}
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
      {block.caption && (
        <figcaption className="text-[11px] text-white/40 text-center">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function TableBlockView({ block }: { block: ContentBlock & { type: "table" } }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08]" role="table" aria-label={block.caption}>
      {block.caption && (
        <div className="px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center gap-1.5">
            <Table2 className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/50">{block.caption}</span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.03]">
              {block.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-right text-white/60 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-white/50">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThinkingBlockView({ block }: { block: ContentBlock & { type: "thinking" } }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-3.5 h-3.5 text-violet-400/60" />
        <span className="text-[10px] font-medium text-violet-400/60">تفكير</span>
        {block.duration && (
          <span className="text-[10px] text-white/20 font-mono">{(block.duration / 1000).toFixed(1)}s</span>
        )}
      </div>
      <div className="text-xs text-white/40 leading-relaxed whitespace-pre-wrap">
        {block.content}
      </div>
    </div>
  );
}

function ToolCallBlockView({ block }: { block: ContentBlock & { type: "tool_call" } }) {
  const statusColors = {
    pending: "text-yellow-400/60",
    running: "text-blue-400/60",
    completed: "text-green-400/60",
    error: "text-red-400/60",
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2">
        <Wrench className={cn("w-3.5 h-3.5", statusColors[block.status])} />
        <span className="text-xs font-medium text-white/60">{block.toolName}</span>
        <span className={cn("text-[10px]", statusColors[block.status])}>
          {block.status === "completed" ? "✓" : block.status === "running" ? "⟳" : block.status === "error" ? "✗" : "⏳"}
        </span>
      </div>
      {block.output && (
        <div className="mt-2 text-xs text-white/40 font-mono bg-white/[0.02] rounded-lg px-3 py-2 overflow-x-auto">
          {block.output}
        </div>
      )}
    </div>
  );
}

function ErrorBlockView({ block }: { block: ContentBlock & { type: "error" } }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3" role="alert">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span className="text-xs font-medium text-red-400">خطأ{block.code ? ` (${block.code})` : ""}</span>
      </div>
      <p className="mt-1 text-xs text-red-300/60">{block.message}</p>
    </div>
  );
}

function CitationBlockView({ block }: { block: ContentBlock & { type: "citation" } }) {
  return (
    <div className="flex flex-wrap gap-2">
      {block.sources.map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="truncate max-w-[180px]">{source.title}</span>
        </a>
      ))}
    </div>
  );
}

function CanvasRefBlockView({ block }: { block: ContentBlock & { type: "canvas_ref" } }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
      <Presentation className="w-4 h-4 text-teal-400/60" />
      <span className="text-xs font-medium text-white/70">{block.title}</span>
      <span className="text-[10px] text-white/30">{block.canvasType}</span>
    </div>
  );
}

function ChartBlockView({ block }: { block: ContentBlock & { type: "chart" } }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-orange-400/60" />
        <span className="text-xs text-white/50">{block.chartType} chart</span>
      </div>
      <div className="h-48 flex items-center justify-center text-white/20 text-xs">
        رسم بياني — {block.chartType}
      </div>
    </div>
  );
}
