"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * UltraResearchRenderer — Gemini Deep Research Style Canvas
 * ═══════════════════════════════════════════════════════════════
 *
 * 3-tab Canvas renderer for ULTRA_RESEARCH / CWAYS Altra:
 *   النتيجة (Result) · المصادر (Sources) · التحليل (Analysis)
 *
 * Renders inside the Canvas panel with a professional look
 * matching Gemini's Deep Research output UI.
 *
 * @version 1.0.0
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, BookOpen, BarChart3, ExternalLink, Copy, Check,
  Sparkles, TrendingUp, Lightbulb, Layers, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ParsedSection {
  type: "heading" | "paragraph" | "list" | "blockquote" | "table" | "code" | "divider";
  level?: number;
  content: string;
  items?: string[];
  rows?: string[][];
}

interface ParsedSource {
  title: string;
  url?: string;
  snippet?: string;
  domain?: string;
}

interface ParsedAnalysis {
  label: string;
  value: string;
  icon: "trend" | "insight" | "layer" | "arrow";
}

// ═══════════════════════════════════════════════════════════════
// Content Parser
// ═══════════════════════════════════════════════════════════════

function parseMarkdownContent( raw: string ): {
  sections: ParsedSection[];
  sources: ParsedSource[];
  analysisPoints: ParsedAnalysis[];
} {
  const sections: ParsedSection[] = [];
  const sources: ParsedSource[] = [];
  const analysisPoints: ParsedAnalysis[] = [];

  if ( !raw ) return { sections, sources, analysisPoints };

  const lines = raw.split( "\n" );
  let inSourcesSection = false;
  let inAnalysisSection = false;
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushList = () => {
    if ( listItems.length ) {
      sections.push( { type: "list", content: "", items: [ ...listItems ] } );
      listItems = [];
    }
  };
  const flushTable = () => {
    if ( tableRows.length ) {
      sections.push( { type: "table", content: "", rows: [ ...tableRows ] } );
      tableRows = [];
      inTable = false;
    }
  };

  for ( let i = 0; i < lines.length; i++ ) {
    const line = lines[i];
    const trimmed = line.trim();

    // Heading detection
    const headingMatch = trimmed.match( /^(#{1,4})\s+(.+)$/ );
    if ( headingMatch ) {
      flushList();
      flushTable();
      const level = headingMatch[1].length;
      const text = headingMatch[2];

      // Detect special sections
      if ( /مصادر|مراجع|sources|references/i.test( text ) ) {
        inSourcesSection = true;
        inAnalysisSection = false;
      } else if ( /تحليل|analysis|insights|استنتاج/i.test( text ) ) {
        inAnalysisSection = true;
        inSourcesSection = false;
      } else {
        inSourcesSection = false;
        inAnalysisSection = false;
      }

      sections.push( { type: "heading", level, content: text } );
      continue;
    }

    // Divider
    if ( /^---+$/.test( trimmed ) || /^\*\*\*+$/.test( trimmed ) ) {
      flushList();
      flushTable();
      sections.push( { type: "divider", content: "" } );
      continue;
    }

    // Table row
    if ( trimmed.startsWith( "|" ) && trimmed.endsWith( "|" ) ) {
      flushList();
      // Skip separator rows
      if ( /^\|[\s\-:|]+\|$/.test( trimmed ) ) continue;
      const cells = trimmed.split( "|" ).filter( c => c.trim() ).map( c => c.trim() );
      tableRows.push( cells );
      inTable = true;
      continue;
    } else if ( inTable ) {
      flushTable();
    }

    // List item
    if ( /^[-*•]\s+/.test( trimmed ) || /^\d+[\.)]\s+/.test( trimmed ) ) {
      const itemText = trimmed.replace( /^[-*•]\s+/, "" ).replace( /^\d+[\.)]\s+/, "" );

      // Try to extract source from list items in sources section
      if ( inSourcesSection ) {
        const urlMatch = itemText.match( /\[([^\]]+)\]\(([^)]+)\)/ );
        if ( urlMatch ) {
          const domain = (() => { try { return new URL( urlMatch[2] ).hostname; } catch { return ""; } })();
          sources.push( { title: urlMatch[1], url: urlMatch[2], snippet: itemText.replace( urlMatch[0], "" ).trim(), domain } );
        } else {
          sources.push( { title: itemText, snippet: "" } );
        }
      }

      // Try to extract analysis points
      if ( inAnalysisSection ) {
        const boldMatch = itemText.match( /\*\*([^*]+)\*\*[:\s]*(.*)/ );
        if ( boldMatch ) {
          analysisPoints.push( {
            label: boldMatch[1],
            value: boldMatch[2] || itemText,
            icon: analysisPoints.length % 4 === 0 ? "trend" : analysisPoints.length % 4 === 1 ? "insight" : analysisPoints.length % 4 === 2 ? "layer" : "arrow",
          } );
        }
      }

      listItems.push( itemText );
      continue;
    } else {
      flushList();
    }

    // Blockquote
    if ( trimmed.startsWith( ">" ) ) {
      sections.push( { type: "blockquote", content: trimmed.slice( 1 ).trim() } );
      continue;
    }

    // Code block
    if ( trimmed.startsWith( "```" ) ) {
      flushList();
      let codeContent = "";
      i++;
      while ( i < lines.length && !lines[i].trim().startsWith( "```" ) ) {
        codeContent += lines[i] + "\n";
        i++;
      }
      sections.push( { type: "code", content: codeContent.trim() } );
      continue;
    }

    // Paragraph
    if ( trimmed ) {
      // Check for inline source links
      if ( inSourcesSection ) {
        const urlMatch = trimmed.match( /\[([^\]]+)\]\(([^)]+)\)/ );
        if ( urlMatch ) {
          const domain = (() => { try { return new URL( urlMatch[2] ).hostname; } catch { return ""; } })();
          sources.push( { title: urlMatch[1], url: urlMatch[2], snippet: trimmed.replace( urlMatch[0], "" ).trim(), domain } );
        }
      }
      sections.push( { type: "paragraph", content: trimmed } );
    }
  }

  flushList();
  flushTable();

  return { sections, sources, analysisPoints };
}

// ═══════════════════════════════════════════════════════════════
// Inline Markdown Renderer
// ═══════════════════════════════════════════════════════════════

function renderInlineMarkdown( text: string ): React.ReactNode {
  // Bold, italic, inline code, links
  const parts = text.split( /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/ );
  return parts.map( ( part, i ) => {
    if ( part.startsWith( "**" ) && part.endsWith( "**" ) ) {
      return <strong key={i} className="text-white/95 font-semibold">{part.slice( 2, -2 )}</strong>;
    }
    if ( part.startsWith( "_" ) && part.endsWith( "_" ) ) {
      return <em key={i} className="text-white/70 italic">{part.slice( 1, -1 )}</em>;
    }
    if ( part.startsWith( "`" ) && part.endsWith( "`" ) ) {
      return <code key={i} className="text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice( 1, -1 )}</code>;
    }
    const linkMatch = part.match( /\[([^\]]+)\]\(([^)]+)\)/ );
    if ( linkMatch ) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">{linkMatch[1]}</a>;
    }
    return part;
  } );
}

// ═══════════════════════════════════════════════════════════════
// Tab Components
// ═══════════════════════════════════════════════════════════════

function ResultTab( { sections }: { sections: ParsedSection[] } ) {
  return (
    <div className="space-y-4 px-6 py-5">
      {sections.map( ( section, i ) => {
        switch ( section.type ) {
          case "heading":
            const Tag = ( `h${section.level || 2}` ) as keyof JSX.IntrinsicElements;
            return (
              <Tag key={i} className={cn(
                "font-bold text-white/95",
                section.level === 1 && "text-2xl mt-6 mb-3 bg-gradient-to-l from-teal-400 to-cyan-300 bg-clip-text text-transparent",
                section.level === 2 && "text-xl mt-5 mb-2",
                section.level === 3 && "text-lg mt-4 mb-1.5 text-white/85",
                section.level === 4 && "text-base mt-3 mb-1 text-white/80",
              )}>
                {renderInlineMarkdown( section.content )}
              </Tag>
            );
          case "paragraph":
            return (
              <p key={i} className="text-sm text-white/70 leading-relaxed">
                {renderInlineMarkdown( section.content )}
              </p>
            );
          case "list":
            return (
              <ul key={i} className="space-y-1.5 mr-4">
                {section.items?.map( ( item, j ) => (
                  <li key={j} className="text-sm text-white/70 leading-relaxed flex gap-2">
                    <span className="text-teal-400/60 mt-1 shrink-0">•</span>
                    <span>{renderInlineMarkdown( item )}</span>
                  </li>
                ) )}
              </ul>
            );
          case "blockquote":
            return (
              <blockquote key={i} className="border-r-2 border-teal-500/40 pr-4 mr-2 text-sm text-white/60 italic">
                {renderInlineMarkdown( section.content )}
              </blockquote>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-white/[0.08]">
                <table className="w-full text-sm">
                  <thead>
                    {section.rows && section.rows[0] && (
                      <tr className="bg-white/[0.04]">
                        {section.rows[0].map( ( cell, c ) => (
                          <th key={c} className="px-3 py-2 text-right text-xs font-semibold text-white/70 border-b border-white/[0.06]">
                            {renderInlineMarkdown( cell )}
                          </th>
                        ) )}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {section.rows?.slice( 1 ).map( ( row, r ) => (
                      <tr key={r} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        {row.map( ( cell, c ) => (
                          <td key={c} className="px-3 py-2 text-xs text-white/60">
                            {renderInlineMarkdown( cell )}
                          </td>
                        ) )}
                      </tr>
                    ) )}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <pre key={i} className="bg-[#0d1117] border border-white/[0.06] rounded-lg p-4 overflow-x-auto">
                <code className="text-xs font-mono text-green-300/80 whitespace-pre">{section.content}</code>
              </pre>
            );
          case "divider":
            return <hr key={i} className="border-white/[0.06] my-4" />;
          default:
            return null;
        }
      } )}
    </div>
  );
}

function SourcesTab( { sources }: { sources: ParsedSource[] } ) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>( null );

  const handleCopy = ( url: string, idx: number ) => {
    navigator.clipboard.writeText( url );
    setCopiedIdx( idx );
    setTimeout( () => setCopiedIdx( null ), 2000 );
  };

  if ( sources.length === 0 ) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-white/30">
        <BookOpen className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">لم يتم العثور على مصادر في التقرير</p>
        <p className="text-xs mt-1 text-white/20">المصادر ستظهر هنا عند توفرها</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
        <BookOpen className="w-3.5 h-3.5" />
        <span>{sources.length} مصدر</span>
      </div>
      {sources.map( ( source, i ) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className={cn(
            "group flex items-start gap-3 p-3 rounded-xl",
            "bg-white/[0.03] border border-white/[0.06]",
            "hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-teal-400">{i + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white/85 leading-snug">
              {renderInlineMarkdown( source.title )}
            </div>
            {source.domain && (
              <div className="text-[11px] text-white/35 mt-0.5">{source.domain}</div>
            )}
            {source.snippet && (
              <p className="text-xs text-white/45 mt-1 line-clamp-2">{source.snippet}</p>
            )}
          </div>
          {source.url && (
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleCopy( source.url!, i )}
                className="p-1 rounded hover:bg-white/[0.08]"
                title="نسخ الرابط"
              >
                {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
              </button>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/[0.08]">
                <ExternalLink className="w-3.5 h-3.5 text-white/40" />
              </a>
            </div>
          )}
        </motion.div>
      ) )}
    </div>
  );
}

function AnalysisTab( { analysisPoints, sections }: { analysisPoints: ParsedAnalysis[]; sections: ParsedSection[] } ) {
  const iconMap = {
    trend: TrendingUp,
    insight: Lightbulb,
    layer: Layers,
    arrow: ArrowRight,
  };

  // If no explicit analysis points found, try to extract key findings from sections
  const points = analysisPoints.length > 0 ? analysisPoints : sections
    .filter( s => s.type === "heading" && ( s.level === 2 || s.level === 3 ) )
    .slice( 0, 8 )
    .map( ( s, i ) => ( {
      label: s.content,
      value: sections.find( ( ss, j ) => j > sections.indexOf( s ) && ss.type === "paragraph" )?.content || "",
      icon: ( [ "trend", "insight", "layer", "arrow" ] as const )[i % 4],
    } ) );

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Summary Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/15">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-semibold text-teal-300">ملخص التحليل</span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          {sections.find( s => s.type === "paragraph" )?.content || "التحليل قيد الإعداد..."}
        </p>
      </div>

      {/* Analysis Points Grid */}
      <div className="grid gap-3">
        {points.map( ( point, i ) => {
          const Icon = iconMap[point.icon];
          const colors = [
            { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
            { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
            { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
            { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
          ];
          const color = colors[i % colors.length];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl",
                "bg-white/[0.02] border border-white/[0.06]",
                "hover:bg-white/[0.04] transition-colors duration-200"
              )}
            >
              <div className={cn( "w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color.bg, color.border, "border" )}>
                <Icon className={cn( "w-4 h-4", color.text )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/85">{renderInlineMarkdown( point.label )}</div>
                {point.value && (
                  <p className="text-xs text-white/50 mt-1 line-clamp-3">{renderInlineMarkdown( point.value )}</p>
                )}
              </div>
            </motion.div>
          );
        } )}
      </div>

      {points.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-white/30">
          <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">التحليل قيد الإعداد...</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Renderer
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { id: "result", label: "النتيجة", icon: FileText },
  { id: "sources", label: "المصادر", icon: BookOpen },
  { id: "analysis", label: "التحليل", icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]["id"];

export function UltraResearchRenderer() {
  const [ activeTab, setActiveTab ] = useState<TabId>( "result" );
  const versions = useCanvasStore( s => s.versions );
  const currentVersionIndex = useCanvasStore( s => s.currentVersionIndex );
  const isStreaming = useCanvasStore( s => s.isStreaming );

  const content = versions[currentVersionIndex]?.content || "";

  const parsed = useMemo( () => parseMarkdownContent( content ), [ content ] );

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Tab Header */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        {TABS.map( ( tab ) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tab.id === "sources" ? parsed.sources.length : tab.id === "analysis" ? parsed.analysisPoints.length : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab( tab.id )}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-teal-500/15 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.1)]"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  isActive ? "bg-teal-500/25 text-teal-300" : "bg-white/[0.06] text-white/30"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        } )}

        {isStreaming && (
          <div className="flex items-center gap-1.5 mr-auto text-xs text-teal-400/60">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>جارٍ الكتابة...</span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResultTab sections={parsed.sections} />
            </motion.div>
          )}
          {activeTab === "sources" && (
            <motion.div
              key="sources"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SourcesTab sources={parsed.sources} />
            </motion.div>
          )}
          {activeTab === "analysis" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <AnalysisTab analysisPoints={parsed.analysisPoints} sections={parsed.sections} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
