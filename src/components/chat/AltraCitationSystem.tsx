"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AltraCitation } from "@/lib/ai/altra/AltraOrchestrator";

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE CITATION - رقم مرجعي قابل للنقر
// ═══════════════════════════════════════════════════════════════════════════════

interface InlineCitationProps
{
    citation: AltraCitation;
    compact?: boolean;
}

export function InlineCitation ( { citation, compact = true }: InlineCitationProps )
{
    const [ showPreview, setShowPreview ] = useState( false );
    const timeoutRef = useRef<NodeJS.Timeout | null>( null );
    const containerRef = useRef<HTMLSpanElement>( null );

    const handleMouseEnter = useCallback( () =>
    {
        timeoutRef.current = setTimeout( () => setShowPreview( true ), 300 );
    }, [] );

    const handleMouseLeave = useCallback( () =>
    {
        if ( timeoutRef.current ) clearTimeout( timeoutRef.current );
        setShowPreview( false );
    }, [] );

    useEffect( () =>
    {
        return () =>
        {
            if ( timeoutRef.current ) clearTimeout( timeoutRef.current );
        };
    }, [] );

    return (
        <span
            ref={containerRef}
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "inline-flex items-center justify-center rounded font-mono transition-colors",
                    compact
                        ? "w-4 h-4 text-[10px] bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                        : "px-1.5 py-0.5 text-xs bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 gap-1"
                )}
                title={citation.title}
            >
                {compact ? citation.id : `[${citation.id}]`}
            </a>

            {/* Hover Preview */}
            {showPreview && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-72 p-3 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="text-sm text-zinc-200 font-medium line-clamp-2 mb-1">
                        {citation.title}
                    </div>
                    <div className="text-xs text-violet-400 mb-1.5">
                        {citation.domain}
                    </div>
                    {citation.snippet && (
                        <div className="text-xs text-zinc-500 line-clamp-3">
                            {citation.snippet}
                        </div>
                    )}
                    <div className="text-[10px] text-zinc-600 mt-2 truncate">
                        {citation.url}
                    </div>
                </div>
            )}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CITATION GROUP - مجموعة المراجع
// ═══════════════════════════════════════════════════════════════════════════════

interface CitationGroupProps
{
    citations: AltraCitation[];
    maxVisible?: number;
}

export function CitationGroup ( { citations, maxVisible = 10 }: CitationGroupProps )
{
    const [ expanded, setExpanded ] = useState( false );

    const visible = expanded ? citations : citations.slice( 0, maxVisible );
    const hasMore = citations.length > maxVisible;

    if ( citations.length === 0 ) return null;

    return (
        <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
                <svg className="size-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                <span className="text-xs font-medium text-zinc-400">
                    المصادر ({citations.length})
                </span>
            </div>

            <div className="space-y-1.5">
                {visible.map( ( citation ) => (
                    <a
                        key={citation.id}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors group"
                    >
                        <span className="flex-shrink-0 w-5 h-5 rounded bg-violet-500/15 text-violet-400 text-[10px] flex items-center justify-center font-mono mt-0.5">
                            {citation.id}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs text-zinc-300 group-hover:text-violet-300 truncate transition-colors">
                                {citation.title}
                            </div>
                            <div className="text-[10px] text-zinc-600 truncate">
                                {citation.domain}
                            </div>
                        </div>
                    </a>
                ) )}
            </div>

            {hasMore && (
                <button
                    onClick={() => setExpanded( !expanded )}
                    className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                    {expanded
                        ? "عرض أقل"
                        : `عرض ${citations.length - maxVisible} مصدر إضافي`}
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CITATION STRIP - شريط المصادر الأفقي
// ═══════════════════════════════════════════════════════════════════════════════

interface CitationStripProps
{
    citations: AltraCitation[];
    maxVisible?: number;
}

export function CitationStrip ( { citations, maxVisible = 6 }: CitationStripProps )
{
    if ( citations.length === 0 ) return null;

    const visible = citations.slice( 0, maxVisible );
    const remaining = citations.length - maxVisible;

    return (
        <div className="flex items-center gap-1.5 flex-wrap py-2">
            {visible.map( ( citation ) => (
                <a
                    key={citation.id}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors group"
                    title={citation.title}
                >
                    <img
                        src={`https://www.google.com/s2/favicons?domain=${citation.domain}&sz=16`}
                        alt=""
                        className="w-3 h-3 rounded-sm"
                        loading="lazy"
                    />
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 max-w-[120px] truncate transition-colors">
                        {citation.domain}
                    </span>
                </a>
            ) )}
            {remaining > 0 && (
                <span className="text-[10px] text-zinc-600 px-1">
                    +{remaining}
                </span>
            )}
        </div>
    );
}
