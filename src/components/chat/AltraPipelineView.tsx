"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAltraStore } from "@/stores/altraStore";
import type { AltraPhase } from "@/lib/ai/altra/AltraOrchestrator";

// ═══════════════════════════════════════════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const PhaseIcons: Record<AltraPhase, JSX.Element> = {
    classify: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h10M4 18h6" strokeLinecap="round" />
        </svg>
    ),
    decompose: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M16 3h5v5M14 10l7-7M8 14l-7 7M3 16v5h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    search: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
    ),
    collect: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
    ),
    reason: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2a8 8 0 0 0-8 8c0 3.37 2.1 6.25 5 7.47V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.53c2.9-1.22 5-4.1 5-7.47a8 8 0 0 0-8-8z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 22h4" strokeLinecap="round" />
        </svg>
    ),
    synthesize: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 3l1.91 5.87h6.18l-5 3.64 1.91 5.87L12 14.74l-5 3.64 1.91-5.87-5-3.64h6.18z" strokeLinejoin="round" />
        </svg>
    ),
    complete: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    error: (
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
        </svg>
    ),
};

const PhaseLabels: Record<AltraPhase, string> = {
    classify: "تصنيف",
    decompose: "تحليل",
    search: "بحث",
    collect: "تجميع",
    reason: "استنتاج",
    synthesize: "تركيب",
    complete: "مكتمل",
    error: "خطأ",
};

const PIPELINE_PHASES: AltraPhase[] = [
    "classify",
    "decompose",
    "search",
    "collect",
    "reason",
    "synthesize",
];

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getPhaseStatus (
    phase: AltraPhase,
    currentPhase: AltraPhase | null
): "pending" | "active" | "complete" | "error"
{
    if ( !currentPhase ) return "pending";
    if ( currentPhase === "error" ) return "error";
    if ( currentPhase === "complete" ) return "complete";

    const currentIndex = PIPELINE_PHASES.indexOf( currentPhase );
    const phaseIndex = PIPELINE_PHASES.indexOf( phase );

    if ( phaseIndex < currentIndex ) return "complete";
    if ( phaseIndex === currentIndex ) return "active";
    return "pending";
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AltraPipelineView ()
{
    const {
        isProcessing,
        progress,
        category,
        subQueries,
        synthesis,
        citations,
        sources,
        metadata,
        error,
        isPanelOpen,
        activeTab,
        reasoning,
        closePanel,
        setActiveTab,
        cancelAltra,
    } = useAltraStore();

    const currentPhase = progress?.phase || null;

    // لا تعرض شيئاً إذا اللوحة مغلقة
    if ( !isPanelOpen ) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-sm font-semibold text-zinc-200">ALTRA Engine</span>
                    {isProcessing && (
                        <span className="text-xs text-zinc-500">
                            {progress?.progress || 0}%
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isProcessing && (
                        <button
                            onClick={cancelAltra}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/30 hover:border-red-400/50 transition-colors"
                        >
                            إلغاء
                        </button>
                    )}
                    <button
                        onClick={closePanel}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-zinc-800">
                {( [ "pipeline", "result", "sources", "reasoning" ] as const ).map( ( tab ) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab( tab )}
                        className={cn(
                            "flex-1 py-2 text-xs font-medium transition-colors",
                            activeTab === tab
                                ? "text-violet-400 border-b-2 border-violet-500"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {tab === "pipeline" ? "المسار" :
                            tab === "result" ? "النتيجة" :
                                tab === "sources" ? `المصادر (${citations.length})` :
                                    "التحليل"}
                    </button>
                ) )}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">
                {/* Error */}
                {error && (
                    <div className="m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Tab: Pipeline */}
                {activeTab === "pipeline" && (
                    <div className="p-4 space-y-1">
                        {PIPELINE_PHASES.map( ( phase, index ) =>
                        {
                            const status = getPhaseStatus( phase, currentPhase );
                            return (
                                <div key={phase} className="flex items-start gap-3">
                                    {/* Timeline line */}
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                                                status === "complete" && "bg-green-500/20 border-green-500 text-green-400",
                                                status === "active" && "bg-violet-500/20 border-violet-500 text-violet-400 animate-pulse",
                                                status === "pending" && "bg-zinc-800 border-zinc-700 text-zinc-600",
                                                status === "error" && "bg-red-500/20 border-red-500 text-red-400",
                                            )}
                                        >
                                            {PhaseIcons[ phase ]}
                                        </div>
                                        {index < PIPELINE_PHASES.length - 1 && (
                                            <div
                                                className={cn(
                                                    "w-0.5 h-8 transition-colors duration-500",
                                                    status === "complete" ? "bg-green-500/40" : "bg-zinc-800",
                                                )}
                                            />
                                        )}
                                    </div>

                                    {/* Phase info */}
                                    <div className="pt-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "text-sm font-medium",
                                                    status === "complete" && "text-green-400",
                                                    status === "active" && "text-violet-300",
                                                    status === "pending" && "text-zinc-600",
                                                    status === "error" && "text-red-400",
                                                )}
                                            >
                                                {PhaseLabels[ phase ]}
                                            </span>
                                            {status === "active" && (
                                                <span className="text-xs text-zinc-500">
                                                    {progress?.message}
                                                </span>
                                            )}
                                        </div>

                                        {/* Phase details */}
                                        {status === "active" && progress?.details && (
                                            <div className="mt-1 text-xs text-zinc-500 space-y-0.5">
                                                {progress.details.category && (
                                                    <div>التصنيف: <span className="text-violet-400">{progress.details.category}</span></div>
                                                )}
                                                {progress.details.sourcesFound !== undefined && (
                                                    <div>المصادر: <span className="text-violet-400">{progress.details.sourcesFound}</span></div>
                                                )}
                                                {progress.details.currentQuery && (
                                                    <div className="truncate">يبحث: <span className="text-zinc-400">{progress.details.currentQuery}</span></div>
                                                )}
                                            </div>
                                        )}

                                        {/* Sub-queries display */}
                                        {phase === "decompose" && status === "complete" && subQueries.length > 0 && (
                                            <div className="mt-1 space-y-0.5">
                                                {subQueries.map( ( q, i ) => (
                                                    <div key={i} className="text-xs text-zinc-500 truncate">
                                                        → {q}
                                                    </div>
                                                ) )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        } )}

                        {/* Progress bar */}
                        {isProcessing && (
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${progress?.progress || 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Metadata when complete */}
                        {metadata && !isProcessing && (
                            <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-2">
                                <div className="bg-zinc-900 rounded-lg p-2">
                                    <div className="text-xs text-zinc-500">المصادر</div>
                                    <div className="text-sm font-semibold text-zinc-200">{metadata.uniqueSources}</div>
                                </div>
                                <div className="bg-zinc-900 rounded-lg p-2">
                                    <div className="text-xs text-zinc-500">الاستعلامات</div>
                                    <div className="text-sm font-semibold text-zinc-200">{metadata.searchQueries}</div>
                                </div>
                                <div className="bg-zinc-900 rounded-lg p-2">
                                    <div className="text-xs text-zinc-500">المدة</div>
                                    <div className="text-sm font-semibold text-zinc-200">{( metadata.duration / 1000 ).toFixed( 1 )}s</div>
                                </div>
                                <div className="bg-zinc-900 rounded-lg p-2">
                                    <div className="text-xs text-zinc-500">إجمالي المصادر</div>
                                    <div className="text-sm font-semibold text-zinc-200">{metadata.totalSources}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Result */}
                {activeTab === "result" && (
                    <div className="p-4">
                        {synthesis ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <div
                                    className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: formatSynthesis( synthesis ) }}
                                />
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-500 text-center py-8">
                                {isProcessing ? "جاري المعالجة..." : "لا توجد نتائج بعد"}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Sources */}
                {activeTab === "sources" && (
                    <div className="p-4 space-y-2">
                        {citations.length > 0 ? (
                            citations.map( ( citation ) => (
                                <a
                                    key={citation.id}
                                    href={citation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="flex-shrink-0 w-5 h-5 rounded bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center font-mono">
                                            {citation.id}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm text-zinc-200 group-hover:text-violet-300 truncate transition-colors">
                                                {citation.title}
                                            </div>
                                            <div className="text-xs text-zinc-600 mt-0.5">
                                                {citation.domain}
                                            </div>
                                            {citation.snippet && (
                                                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                                    {citation.snippet}
                                                </div>
                                            )}
                                        </div>
                                        <svg className="size-3.5 text-zinc-600 group-hover:text-violet-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </a>
                            ) )
                        ) : (
                            <div className="text-sm text-zinc-500 text-center py-8">
                                {isProcessing ? "جاري البحث عن المصادر..." : "لا توجد مصادر"}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Reasoning */}
                {activeTab === "reasoning" && (
                    <div className="p-4">
                        {reasoning ? (
                            <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                                {reasoning}
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-500 text-center py-8">
                                {isProcessing ? "جاري التحليل..." : "لا يوجد تحليل"}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatSynthesis ( text: string ): string
{
    // تحويل Markdown بسيط إلى HTML
    return text
        .replace( /## (.+)/g, '<h3 class="text-base font-semibold text-zinc-100 mt-4 mb-2">$1</h3>' )
        .replace( /\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>' )
        .replace( /\n/g, '<br />' );
}
