'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { EXCHANGE_LABELS, EXCHANGE_PRIORITY } from '@/lib/services/exchangeRegistry';
import
    {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuTrigger,
    } from '@/components/ui/dropdown-menu';

export type ViewMode = 'list' | 'grid';

export interface CheckboxOption
{
    id: string;
    label: string;
}

interface ScannerToolbarProps
{
    symbols: CheckboxOption[];
    timeframes: CheckboxOption[];
    selectedSymbols: string[];
    selectedTimeframes: string[];
    selectedExchanges: string[];
    onSymbolToggle: ( id: string ) => void;
    onTimeframeToggle: ( id: string ) => void;
    onExchangeToggle: ( id: string ) => void;
    viewMode: ViewMode;
    onViewModeChange: ( mode: ViewMode ) => void;
    exchangeOptions?: CheckboxOption[];
}

const defaultExchangeOptions: CheckboxOption[] = EXCHANGE_PRIORITY.map( ( id ) => ( {
    id,
    label: EXCHANGE_LABELS[ id ]?.name ?? id,
} ) );

function CheckboxList ( {
    options,
    selectedIds,
    onToggle,
    emptyLabel,
}: {
    options: CheckboxOption[];
    selectedIds: string[];
    onToggle: ( id: string ) => void;
    emptyLabel: string;
} )
{
    if ( !options.length )
    {
        return (
            <div className="p-3 text-xs text-gray-500">{ emptyLabel }</div>
        );
    }

    return (
        <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-2 space-y-1">
            { options.map( ( opt ) => (
                <label
                    key={ opt.id }
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                    <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border border-white/20 bg-transparent text-cyan-500 focus:ring-1 focus:ring-cyan-400/60"
                        checked={ selectedIds.includes( opt.id ) }
                        onChange={ () => onToggle( opt.id ) }
                    />
                    <span className="text-xs text-gray-300 font-medium">
                        { opt.label }
                    </span>
                </label>
            ) ) }
        </div>
    );
}

export function ScannerToolbar ( {
    symbols,
    timeframes,
    selectedSymbols,
    selectedTimeframes,
    selectedExchanges,
    onSymbolToggle,
    onTimeframeToggle,
    onExchangeToggle,
    viewMode,
    onViewModeChange,
    exchangeOptions = defaultExchangeOptions,
}: ScannerToolbarProps )
{
    return (
        <div className="flex flex-wrap items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title="العملات"
                        aria-label="العملات"
                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                        العملات
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-0 overlay-dropdown w-60 overflow-hidden">
                    <CheckboxList
                        options={ symbols }
                        selectedIds={ selectedSymbols }
                        onToggle={ onSymbolToggle }
                        emptyLabel="لا توجد عملات متاحة"
                    />
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title="الفريمات"
                        aria-label="الفريمات"
                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                        الفريمات
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-0 overlay-dropdown w-60 overflow-hidden">
                    <CheckboxList
                        options={ timeframes }
                        selectedIds={ selectedTimeframes }
                        onToggle={ onTimeframeToggle }
                        emptyLabel="لا توجد فريمات"
                    />
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title="المنصات"
                        aria-label="المنصات"
                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                        المنصات
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-0 overlay-dropdown w-60 overflow-hidden">
                    <CheckboxList
                        options={ exchangeOptions }
                        selectedIds={ selectedExchanges }
                        onToggle={ onExchangeToggle }
                        emptyLabel="لا توجد منصات"
                    />
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 ml-auto">
                <button
                    onClick={ () => onViewModeChange( 'grid' ) }
                    title="عرض قوالب"
                    aria-label="عرض قوالب"
                    className={ `px-2 py-1 rounded-md transition-all text-[10px] font-bold ${ viewMode === 'grid'
                            ? 'bg-white/10 text-cyan-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                        }` }
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={ () => onViewModeChange( 'list' ) }
                    title="عرض طولي"
                    aria-label="عرض طولي"
                    className={ `px-2 py-1 rounded-md transition-all text-[10px] font-bold ${ viewMode === 'list'
                            ? 'bg-white/10 text-cyan-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                        }` }
                >
                    <List className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export default ScannerToolbar;
