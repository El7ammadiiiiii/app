/**
 * Deep Research Panel V2
 * لوحة عرض نتائج البحث العميق
 */

"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDeepResearchStore } from "@/stores/deepResearchStore";
import type { Citation } from "@/lib/ai/deepResearch/DeepResearchOrchestratorV2";

// ====== الأيقونات ======

const XIcon = () => (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

const SearchIcon = () => (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);

const SourceIcon = () => (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);

const HistoryIcon = () => (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const TrashIcon = () => (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

// ====== المكون الرئيسي ======

export function DeepResearchPanel ()
{
    const {
        isPanelOpen,
        closePanel,
        isResearching,
        progress,
        synthesis,
        citations,
        currentQuery,
        error,
        clearError,
        activeTab,
        setActiveTab,
        history,
        historyLoading,
        loadHistory,
        loadResearch,
        deleteFromHistory,
    } = useDeepResearchStore();

    // تحميل التاريخ عند فتح اللوحة
    useEffect( () =>
    {
        if ( isPanelOpen && activeTab === 'history' )
        {
            loadHistory();
        }
    }, [ isPanelOpen, activeTab, loadHistory ] );

    if ( !isPanelOpen )
    {
        return null;
    }

    return (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-[#0a0a0a] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col">
            {/* الهيدر */ }
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <SearchIcon />
                        <h2 className="text-sm font-semibold text-white">Deep Research</h2>
                    </div>
                    { isResearching && (
                        <div className="flex items-center gap-2 text-xs text-blue-400">
                            <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full" />
                            <span>{ progress?.progress || 0 }%</span>
                        </div>
                    ) }
                </div>
                <button
                    onClick={ closePanel }
                    className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white transition-colors"
                    aria-label="Close panel"
                >
                    <XIcon />
                </button>
            </div>

            {/* التبويبات */ }
            <div className="flex border-b border-white/[0.08]">
                <button
                    onClick={ () => setActiveTab( 'result' ) }
                    className={ cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors",
                        activeTab === 'result'
                            ? "text-white border-b-2 border-blue-500"
                            : "text-white/50 hover:text-white/80"
                    ) }
                >
                    <SearchIcon />
                    <span>النتائج</span>
                </button>
                <button
                    onClick={ () => setActiveTab( 'sources' ) }
                    className={ cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors",
                        activeTab === 'sources'
                            ? "text-white border-b-2 border-blue-500"
                            : "text-white/50 hover:text-white/80"
                    ) }
                >
                    <SourceIcon />
                    <span>المصادر ({ citations.length })</span>
                </button>
                <button
                    onClick={ () => setActiveTab( 'history' ) }
                    className={ cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors",
                        activeTab === 'history'
                            ? "text-white border-b-2 border-blue-500"
                            : "text-white/50 hover:text-white/80"
                    ) }
                >
                    <HistoryIcon />
                    <span>التاريخ</span>
                </button>
            </div>

            {/* المحتوى */ }
            <div className="flex-1 overflow-y-auto">
                {/* رسالة الخطأ */ }
                { error && (
                    <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-red-400">{ error }</p>
                            <button onClick={ clearError } className="text-red-400 hover:text-red-300">
                                <XIcon />
                            </button>
                        </div>
                    </div>
                ) }

                {/* حالة البحث */ }
                { isResearching && progress && (
                    <div className="p-4 border-b border-white/[0.08]">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-white/60">{ progress.message }</span>
                                <span className="text-blue-400 font-medium">{ progress.progress }%</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                    style={ { width: `${ progress.progress }%` } }
                                />
                            </div>
                            { progress.details && (
                                <div className="flex flex-wrap gap-2 text-[10px]">
                                    { progress.details.wave && (
                                        <span className="px-2 py-0.5 bg-white/[0.05] rounded text-white/50">
                                            { progress.details.wave === 'api' ? 'API Wave' : 'Crawler Wave' }
                                        </span>
                                    ) }
                                    { progress.details.engine && (
                                        <span className="px-2 py-0.5 bg-white/[0.05] rounded text-white/50">
                                            { progress.details.engine }
                                        </span>
                                    ) }
                                    { progress.details.sourcesFound !== undefined && (
                                        <span className="px-2 py-0.5 bg-green-500/10 rounded text-green-400">
                                            { progress.details.sourcesFound } مصدر
                                        </span>
                                    ) }
                                </div>
                            ) }
                        </div>
                    </div>
                ) }

                {/* تبويب النتائج */ }
                { activeTab === 'result' && (
                    <div className="p-4">
                        { currentQuery && (
                            <div className="mb-4 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                                <p className="text-xs text-white/40 mb-1">السؤال</p>
                                <p className="text-sm text-white/90">{ currentQuery }</p>
                            </div>
                        ) }

                        { synthesis ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <div
                                    className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={ {
                                        __html: formatSynthesis( synthesis )
                                    } }
                                />
                            </div>
                        ) : !isResearching ? (
                            <div className="text-center py-12">
                                <SearchIcon />
                                <p className="mt-3 text-sm text-white/40">
                                    ابدأ بحثاً عميقاً للحصول على نتائج شاملة
                                </p>
                            </div>
                        ) : null }
                    </div>
                ) }

                {/* تبويب المصادر */ }
                { activeTab === 'sources' && (
                    <div className="p-4 space-y-2">
                        { citations.length > 0 ? (
                            citations.map( ( citation ) => (
                                <CitationCard key={ citation.id } citation={ citation } />
                            ) )
                        ) : (
                            <div className="text-center py-12">
                                <SourceIcon />
                                <p className="mt-3 text-sm text-white/40">
                                    لا توجد مصادر بعد
                                </p>
                            </div>
                        ) }
                    </div>
                ) }

                {/* تبويب التاريخ */ }
                { activeTab === 'history' && (
                    <div className="p-4 space-y-2">
                        { historyLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full" />
                            </div>
                        ) : history.length > 0 ? (
                            history.map( ( item ) => (
                                <div
                                    key={ item.id }
                                    className="p-3 bg-white/[0.03] hover:bg-white/[0.05] rounded-lg border border-white/[0.06] transition-colors cursor-pointer group"
                                    onClick={ () => loadResearch( item.id ) }
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/90 truncate">{ item.query }</p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                                                <span>{ item.sourcesCount } مصدر</span>
                                                <span>•</span>
                                                <span>{ new Date( item.createdAt ).toLocaleDateString( 'ar' ) }</span>
                                                { item.duration && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{ Math.round( item.duration / 1000 ) }ث</span>
                                                    </>
                                                ) }
                                            </div>
                                        </div>
                                        <button
                                            onClick={ ( e ) =>
                                            {
                                                e.stopPropagation();
                                                deleteFromHistory( item.id );
                                            } }
                                            className="p-1 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
                                            aria-label="Delete"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            ) )
                        ) : (
                            <div className="text-center py-12">
                                <HistoryIcon />
                                <p className="mt-3 text-sm text-white/40">
                                    لا يوجد تاريخ بحث
                                </p>
                            </div>
                        ) }
                    </div>
                ) }
            </div>
        </div>
    );
}

// ====== مكون بطاقة المصدر ======

function CitationCard ( { citation }: { citation: Citation } )
{
    return (
        <a
            href={ citation.url }
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 bg-white/[0.03] hover:bg-white/[0.05] rounded-lg border border-white/[0.06] transition-colors group"
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400 font-medium">
                    { citation.id }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                        <h4 className="text-sm text-white/90 font-medium line-clamp-2 flex-1">
                            { citation.title }
                        </h4>
                        <ExternalLinkIcon />
                    </div>
                    <p className="text-[10px] text-blue-400 mt-1 truncate">
                        { citation.domain }
                    </p>
                    { citation.snippet && (
                        <p className="text-xs text-white/50 mt-2 line-clamp-2">
                            { citation.snippet }
                        </p>
                    ) }
                </div>
            </div>
        </a>
    );
}

// ====== دالة تنسيق النص ======

function formatSynthesis ( text: string ): string
{
    // تحويل Markdown البسيط لـ HTML
    return text
        // العناوين
        .replace( /^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>' )
        .replace( /^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>' )
        .replace( /^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>' )
        // القوائم
        .replace( /^\d+\. (.+)$/gm, '<li class="ml-4 text-white/80">$1</li>' )
        .replace( /^- (.+)$/gm, '<li class="ml-4 text-white/80">$1</li>' )
        // الروابط
        .replace( /\[(\d+)\]/g, '<sup class="text-blue-400 text-[10px]">[$1]</sup>' )
        // النص الغامق
        .replace( /\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>' )
        // الفواصل
        .replace( /---/g, '<hr class="my-4 border-white/10" />' )
        // الفقرات
        .replace( /\n\n/g, '</p><p class="mb-3">' )
        // تغليف
        .replace( /^/, '<p class="mb-3">' )
        .replace( /$/, '</p>' );
}

export default DeepResearchPanel;
