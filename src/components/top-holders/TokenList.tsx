"use client";

import React, { useState, useMemo } from "react";
import { Search, X, ChevronRight, Loader2 } from "lucide-react";

export interface TokenProject
{
    id: string;
    name: string;
    symbol: string;
    chain: string;
    logo_url: string;
    holders_count: number;
    crawled_at: string | null;
}

interface TokenListProps
{
    projects: TokenProject[];
    selectedId: string | null;
    onSelect: ( project: TokenProject ) => void;
    isOpen: boolean;
    onClose: () => void;
    loading?: boolean;
}

export default function TokenList ( {
    projects,
    selectedId,
    onSelect,
    isOpen,
    onClose,
    loading = false,
}: TokenListProps )
{
    const [ search, setSearch ] = useState( "" );

    const filtered = useMemo( () =>
    {
        if ( !search.trim() ) return projects;
        const q = search.toLowerCase();
        return projects.filter(
            ( p ) =>
                p.name.toLowerCase().includes( q ) ||
                p.symbol.toLowerCase().includes( q ) ||
                p.id.toLowerCase().includes( q )
        );
    }, [ projects, search ] );

    return (
        <>
            {/* Overlay on mobile */ }
            { isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={ onClose }
                />
            ) }

            {/* Panel */ }
            <aside
                className={ `
          absolute top-0 left-0 h-full z-40
          w-[85vw] sm:w-[50vw] max-w-[280px]
          bg-[#1b3531] border-r border-white/[0.08]
          transform transition-transform duration-300 ease-in-out
          ${ isOpen ? "translate-x-0" : "-translate-x-full" }
          flex flex-col
          lg:relative lg:top-0 lg:h-full lg:z-auto lg:translate-x-0
          ${ isOpen ? "lg:flex" : "lg:hidden" }
        `}
            >
                {/* Header */ }
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                    <h2 className="text-sm font-semibold text-white/80">
                        العملات ({ projects.length })
                    </h2>
                    <button
                        onClick={ onClose }
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */ }
                <div className="px-3 py-2 border-b border-white/[0.05]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو الرمز..."
                            value={ search }
                            onChange={ ( e ) => setSearch( e.target.value ) }
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg
                         pl-9 pr-3 py-2 text-sm text-white placeholder-white/30
                         focus:outline-none focus:border-white/20 focus:bg-white/[0.06]
                         transition-colors"
                            dir="rtl"
                        />
                        { search && (
                            <button
                                onClick={ () => setSearch( "" ) }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        ) }
                    </div>
                </div>

                {/* List */ }
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    { loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-white/30 text-sm">
                            { search ? "لا توجد نتائج" : "لا توجد عملات" }
                        </div>
                    ) : (
                        <div className="py-1">
                            { filtered.map( ( project ) =>
                            {
                                const isSelected = project.id === selectedId;
                                return (
                                    <button
                                        key={ project.id }
                                        onClick={ () =>
                                        {
                                            onSelect( project );
                                            onClose();
                                        } }
                                        className={ `
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      transition-colors group
                      ${ isSelected
                                                ? "bg-amber-500/10 border-r-2 border-amber-500"
                                                : "hover:bg-white/[0.04] border-r-2 border-transparent"
                                            }
                    `}
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                                                    { project.logo_url ? (
                                                        <img
                                                            src={ project.logo_url }
                                                            alt={ project.name }
                                                            className="w-full h-full object-cover"
                                                            onError={ ( e ) =>
                                                                ( ( e.target as HTMLImageElement ).style.display = "none" )
                                                            }
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full h-full text-[8px] text-white/50">
                                                            ?
                                                        </div>
                                                    ) }
                                                </div>
                                                <span
                                                    className={ `text-sm font-medium truncate ${ isSelected ? "text-amber-400" : "text-white/80"
                                                        }` }
                                                >
                                                    { project.name }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-white/30 truncate pl-7">
                                                { project.symbol && (
                                                    <span className="uppercase flex-shrink-0">
                                                        { project.symbol }
                                                    </span>
                                                ) }
                                                { project.chain && (
                                                    <>
                                                        <span className="text-white/10">•</span>
                                                        <span>{ project.chain }</span>
                                                    </>
                                                ) }
                                            </div>
                                        </div>

                                        {/* Arrow */ }
                                        <ChevronRight
                                            className={ `w-3.5 h-3.5 flex-shrink-0 transition-colors ${ isSelected
                                                ? "text-amber-400"
                                                : "text-white/10 group-hover:text-white/30"
                                                }` }
                                        />
                                    </button>
                                );
                            } ) }
                        </div>
                    ) }
                </div>

                {/* Footer */ }
                <div className="px-4 py-2 border-t border-white/[0.05] text-[10px] text-white/20 text-center">
                    عرض { filtered.length } من { projects.length } عملة
                </div>
            </aside>
        </>
    );
}
