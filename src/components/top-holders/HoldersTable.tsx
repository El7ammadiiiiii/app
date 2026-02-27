"use client";

import React, { useMemo, useState } from "react";
import
    {
        useReactTable,
        getCoreRowModel,
        getSortedRowModel,
        flexRender,
        type ColumnDef,
        type SortingState,
    } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Copy, Check } from "lucide-react";
import { ALL_COLUMNS } from "./EditColumnsDialog";

// ─── Helpers ─────────────────────────────────────────────────────────
function formatUSD ( v: any ): string
{
    if ( v == null || v === "" ) return "–";
    const n = typeof v === "string" ? parseFloat( v ) : v;
    if ( isNaN( n ) ) return "–";
    if ( Math.abs( n ) >= 1e9 ) return `$${ ( n / 1e9 ).toFixed( 2 ) }B`;
    if ( Math.abs( n ) >= 1e6 ) return `$${ ( n / 1e6 ).toFixed( 2 ) }M`;
    if ( Math.abs( n ) >= 1e3 ) return `$${ ( n / 1e3 ).toFixed( 1 ) }K`;
    return `$${ n.toFixed( 2 ) }`;
}

function formatNumber ( v: any ): string
{
    if ( v == null || v === "" ) return "–";
    const n = typeof v === "string" ? parseFloat( v ) : v;
    if ( isNaN( n ) ) return "–";
    if ( Math.abs( n ) >= 1e9 ) return `${ ( n / 1e9 ).toFixed( 2 ) }B`;
    if ( Math.abs( n ) >= 1e6 ) return `${ ( n / 1e6 ).toFixed( 2 ) }M`;
    if ( Math.abs( n ) >= 1e3 ) return `${ ( n / 1e3 ).toFixed( 1 ) }K`;
    return n.toLocaleString( undefined, { maximumFractionDigits: 2 } );
}

function formatPercent ( v: any ): string
{
    if ( v == null || v === "" ) return "–";
    const n = typeof v === "string" ? parseFloat( v ) : v;
    if ( isNaN( n ) ) return "–";
    return `${ ( n * 100 ).toFixed( 2 ) }%`;
}

function formatChange ( v: any ): React.ReactNode
{
    if ( v == null || v === "" ) return <span className="text-white/20">–</span>;
    const n = typeof v === "string" ? parseFloat( v ) : v;
    if ( isNaN( n ) ) return <span className="text-white/20">–</span>;
    const pct = ( n * 100 ).toFixed( 2 );
    if ( n > 0 ) return <span className="text-emerald-400">+{ pct }%</span>;
    if ( n < 0 ) return <span className="text-red-400">{ pct }%</span>;
    return <span className="text-white/40">0%</span>;
}

function formatTimeAgo ( v: any ): string
{
    if ( !v ) return "–";
    const d = new Date( v );
    if ( isNaN( d.getTime() ) ) return "–";
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor( diffMs / 86400000 );
    if ( days > 365 ) return `${ Math.floor( days / 365 ) }y ${ Math.floor( ( days % 365 ) / 30 ) }m`;
    if ( days > 30 ) return `${ Math.floor( days / 30 ) }m ${ days % 30 }d`;
    return `${ days }d`;
}

function shortenAddress ( addr: string ): string
{
    if ( !addr || addr.length < 10 ) return addr || "–";
    return `${ addr.slice( 0, 6 ) }...${ addr.slice( -4 ) }`;
}

// ─── Address Cell ────────────────────────────────────────────────────
function AddressCell ( { value }: { value: string } )
{
    const [ copied, setCopied ] = useState( false );

    const handleCopy = async () =>
    {
        if ( !value ) return;
        try
        {
            await navigator.clipboard.writeText( value );
            setCopied( true );
            setTimeout( () => setCopied( false ), 1500 );
        } catch { }
    };

    if ( !value ) return <span className="text-white/20">–</span>;

    return (
        <div className="flex items-center gap-1.5 group/addr">
            <span className="font-mono text-xs text-amber-400/80">
                { shortenAddress( value ) }
            </span>
            <button
                onClick={ handleCopy }
                className="opacity-0 group-hover/addr:opacity-100 p-0.5 rounded text-white/20 hover:text-white/60 transition-all"
                title="Copy address"
            >
                { copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" /> }
            </button>
        </div>
    );
}

// ─── Get cell renderer for different data types ──────────────────────
function getCellContent ( colId: string, value: any ): React.ReactNode
{
    // Addresses
    if ( colId === "account_address" || colId === "token_address" )
    {
        return <AddressCell value={ value } />;
    }

    // USD values
    if ( colId.includes( "balance_usd" ) && !colId.includes( "change" ) )
    {
        return <span className="font-medium text-white/90">{ formatUSD( value ) }</span>;
    }

    // Native token amounts
    if ( colId.includes( "balance_native" ) && !colId.includes( "change" ) )
    {
        return <span className="text-white/70">{ formatNumber( value ) }</span>;
    }

    // Change columns
    if ( colId.includes( "_change" ) )
    {
        return formatChange( value );
    }

    // Percentages
    if ( colId.includes( "ownership" ) && !colId.includes( "change" ) )
    {
        return <span className="text-white/70">{ formatPercent( value ) }</span>;
    }

    // Time
    if ( colId === "position_creation_timestamp" )
    {
        return <span className="text-white/60">{ formatTimeAgo( value ) }</span>;
    }

    // Transaction count
    if ( colId === "transaction_count_sum" )
    {
        return <span className="text-white/70">{ formatNumber( value ) }</span>;
    }

    // Text columns
    return <span className="text-white/70 truncate">{ value || "–" }</span>;
}

// ─── Main Component ──────────────────────────────────────────────────
interface HoldersTableProps
{
    holders: any[];
    visibleColumns: string[];
    projectName?: string;
    loading?: boolean;
}

export default function HoldersTable ( {
    holders,
    visibleColumns,
    projectName,
    loading = false,
}: HoldersTableProps )
{
    const [ sorting, setSorting ] = useState<SortingState>( [
        { id: "account_balance_usd", desc: true },
    ] );

    // Build column definitions from visibleColumns
    const columns = useMemo<ColumnDef<any>[]>( () =>
    {
        // Add rank as first column
        const cols: ColumnDef<any>[] = [
            {
                id: "__rank",
                header: "#",
                size: 50,
                cell: ( { row } ) => (
                    <span className="text-white/30 text-xs font-mono">
                        { row.index + 1 }
                    </span>
                ),
                enableSorting: false,
            },
        ];

        for ( const colId of visibleColumns )
        {
            const def = ALL_COLUMNS.find( ( c ) => c.id === colId );
            if ( !def ) continue;

            cols.push( {
                id: colId,
                accessorKey: colId,
                header: ( { column } ) =>
                {
                    const sorted = column.getIsSorted();
                    return (
                        <button
                            onClick={ column.getToggleSortingHandler() }
                            className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors w-full"
                        >
                            <span className="truncate text-left">{ def.label }</span>
                            { sorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            ) : sorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-40 flex-shrink-0" />
                            ) }
                        </button>
                    );
                },
                cell: ( { getValue } ) => getCellContent( colId, getValue() ),
                size: colId.includes( "address" ) ? 160 : colId.includes( "change" ) ? 100 : 130,
            } );
        }

        return cols;
    }, [ visibleColumns ] );

    const table = useReactTable( {
        data: holders,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    } );

    if ( loading )
    {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-sm text-white/40">جاري التحميل...</span>
                </div>
            </div>
        );
    }

    if ( holders.length === 0 )
    {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="text-4xl mb-3">👑</div>
                    <h3 className="text-lg font-medium text-white/60 mb-1">
                        اختر عملة من القائمة
                    </h3>
                    <p className="text-sm text-white/30">
                        سيتم عرض أكبر 200 حامل للعملة المختارة
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col">
            {/* Table header info */ }
            { projectName && (
                <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.05] flex items-center gap-2">
                    <span className="text-xs text-white/40">
                        { projectName } — { holders.length } holders
                    </span>
                </div>
            ) }

            {/* Scrollable table */ }
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <table className="w-full min-w-[800px]">
                    <thead className="sticky top-0 z-10">
                        { table.getHeaderGroups().map( ( hg ) => (
                            <tr key={ hg.id } className="bg-[#0c0c14] border-b border-white/[0.08]">
                                { hg.headers.map( ( header ) => (
                                    <th
                                        key={ header.id }
                                        className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider
                               text-white/40 whitespace-nowrap group/th"
                                        style={ { width: header.getSize() } }
                                    >
                                        { header.isPlaceholder
                                            ? null
                                            : flexRender( header.column.columnDef.header, header.getContext() ) }
                                    </th>
                                ) ) }
                            </tr>
                        ) ) }
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        { table.getRowModel().rows.map( ( row ) => (
                            <tr
                                key={ row.id }
                                className="hover:bg-white/[0.03] transition-colors"
                            >
                                { row.getVisibleCells().map( ( cell ) => (
                                    <td
                                        key={ cell.id }
                                        className="px-3 py-2 text-sm whitespace-nowrap"
                                        style={ { width: cell.column.getSize() } }
                                    >
                                        { flexRender( cell.column.columnDef.cell, cell.getContext() ) }
                                    </td>
                                ) ) }
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            </div>
        </div>
    );
}
