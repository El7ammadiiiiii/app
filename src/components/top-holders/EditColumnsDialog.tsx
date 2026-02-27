"use client";

import React, { useState, useCallback } from "react";
import { X, GripVertical, Check } from "lucide-react";
import
{
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import
{
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Column Definitions ─────────────────────────────────────────────
export interface ColumnDef
{
    id: string;
    label: string;
    group?: string;
    removable: boolean; // Project & Ticker are not removable
}

export const ALL_COLUMNS: ColumnDef[] = [
    { id: "project_name", label: "Project", group: undefined, removable: false },
    { id: "token_symbol", label: "Ticker", group: undefined, removable: false },
    { id: "account_address", label: "Tokenholder address", group: undefined, removable: true },
    { id: "account_title", label: "Tokenholder title", group: undefined, removable: true },
    { id: "chain_name", label: "Chain", group: undefined, removable: true },
    { id: "token_address", label: "Token address", group: undefined, removable: true },
    // Value group
    { id: "account_balance_usd", label: "Value – Latest", group: "Value", removable: true },
    { id: "account_balance_usd_ath", label: "Value – All-time high", group: "Value", removable: true },
    { id: "account_balance_usd_1d_change", label: "Value – 1d change", group: "Value", removable: true },
    { id: "account_balance_usd_7d_change", label: "Value – 7d change", group: "Value", removable: true },
    { id: "account_balance_usd_30d_change", label: "Value – 30d change", group: "Value", removable: true },
    { id: "account_balance_usd_90d_change", label: "Value – 90d change", group: "Value", removable: true },
    { id: "account_balance_usd_180d_change", label: "Value – 180d change", group: "Value", removable: true },
    { id: "account_balance_usd_365d_change", label: "Value – 365d change", group: "Value", removable: true },
    // Ownership group
    { id: "ownership_percentage", label: "Ownership – Latest", group: "Ownership", removable: true },
    { id: "ownership_percentage_ath", label: "Ownership – All-time high", group: "Ownership", removable: true },
    { id: "ownership_percentage_1d_change", label: "Ownership – 1d change", group: "Ownership", removable: true },
    { id: "ownership_percentage_7d_change", label: "Ownership – 7d change", group: "Ownership", removable: true },
    { id: "ownership_percentage_30d_change", label: "Ownership – 30d change", group: "Ownership", removable: true },
    { id: "ownership_percentage_90d_change", label: "Ownership – 90d change", group: "Ownership", removable: true },
    { id: "ownership_percentage_180d_change", label: "Ownership – 180d change", group: "Ownership", removable: true },
    { id: "ownership_percentage_365d_change", label: "Ownership – 365d change", group: "Ownership", removable: true },
    // Quantity group
    { id: "account_balance_native", label: "Quantity – Latest", group: "Quantity", removable: true },
    { id: "account_balance_native_ath", label: "Quantity – All-time high", group: "Quantity", removable: true },
    { id: "account_balance_native_1d_change", label: "Quantity – 1d change", group: "Quantity", removable: true },
    { id: "account_balance_native_7d_change", label: "Quantity – 7d change", group: "Quantity", removable: true },
    { id: "account_balance_native_30d_change", label: "Quantity – 30d change", group: "Quantity", removable: true },
    { id: "account_balance_native_90d_change", label: "Quantity – 90d change", group: "Quantity", removable: true },
    { id: "account_balance_native_180d_change", label: "Quantity – 180d change", group: "Quantity", removable: true },
    { id: "account_balance_native_365d_change", label: "Quantity – 365d change", group: "Quantity", removable: true },
    // Other
    { id: "position_creation_timestamp", label: "Holding period", group: undefined, removable: true },
    { id: "transaction_count_sum", label: "Transaction count", group: undefined, removable: true },
];

export const DEFAULT_SELECTED_COLUMNS = [
    "project_name",
    "token_symbol",
    "account_address",
    "account_title",
    "chain_name",
    "account_balance_usd",
    "ownership_percentage",
    "position_creation_timestamp",
    "transaction_count_sum",
    "account_balance_native",
    "ownership_percentage_ath",
    "account_balance_usd_ath",
];

// ─── Sortable Item ──────────────────────────────────────────────────
function SortableItem ( {
    col,
    onRemove,
}: {
    col: ColumnDef;
    onRemove: ( id: string ) => void;
} )
{
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable( { id: col.id } );

    const style = {
        transform: CSS.Transform.toString( transform ),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div
            ref={ setNodeRef }
            style={ style }
            className={ `
        flex items-center gap-2 px-3 py-2 rounded-lg
        ${ isDragging ? "bg-white/[0.12] ring-1 ring-amber-500/40" : "bg-white/[0.04] hover:bg-white/[0.06]" }
        transition-colors group
      `}
        >
            <button
                { ...attributes }
                { ...listeners }
                className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40 touch-none"
                aria-label="Drag to reorder"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </button>

            <span className="flex-1 text-sm text-white/80 truncate select-none">
                { col.label }
            </span>

            { col.removable && (
                <button
                    onClick={ () => onRemove( col.id ) }
                    className="p-0.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 
                     opacity-0 group-hover:opacity-100 transition-all"
                    aria-label={ `Remove ${ col.label }` }
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            ) }
        </div>
    );
}

// ─── Main Dialog ────────────────────────────────────────────────────
interface EditColumnsDialogProps
{
    isOpen: boolean;
    onClose: () => void;
    selectedColumns: string[];
    onApply: ( columns: string[] ) => void;
}

export default function EditColumnsDialog ( {
    isOpen,
    onClose,
    selectedColumns,
    onApply,
}: EditColumnsDialogProps )
{
    const [ localColumns, setLocalColumns ] = useState<string[]>( selectedColumns );

    // Reset when dialog opens
    React.useEffect( () =>
    {
        if ( isOpen ) setLocalColumns( selectedColumns );
    }, [ isOpen, selectedColumns ] );

    const sensors = useSensors(
        useSensor( PointerSensor, { activationConstraint: { distance: 5 } } ),
        useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } )
    );

    const handleDragEnd = useCallback( ( event: DragEndEvent ) =>
    {
        const { active, over } = event;
        if ( over && active.id !== over.id )
        {
            setLocalColumns( ( prev ) =>
            {
                const oldIdx = prev.indexOf( active.id as string );
                const newIdx = prev.indexOf( over.id as string );
                return arrayMove( prev, oldIdx, newIdx );
            } );
        }
    }, [] );

    const handleRemove = useCallback( ( id: string ) =>
    {
        setLocalColumns( ( prev ) => prev.filter( ( c ) => c !== id ) );
    }, [] );

    const handleAdd = useCallback( ( id: string ) =>
    {
        setLocalColumns( ( prev ) => ( prev.includes( id ) ? prev : [ ...prev, id ] ) );
    }, [] );

    const handleRemoveAll = useCallback( () =>
    {
        // Keep non-removable columns
        setLocalColumns( ( prev ) =>
            prev.filter( ( id ) =>
            {
                const col = ALL_COLUMNS.find( ( c ) => c.id === id );
                return col && !col.removable;
            } )
        );
    }, [] );

    const handleApply = useCallback( () =>
    {
        onApply( localColumns );
        onClose();
    }, [ localColumns, onApply, onClose ] );

    // Group the available columns 
    const availableGroups = React.useMemo( () =>
    {
        const groups: Record<string, ColumnDef[]> = { "": [] };
        for ( const col of ALL_COLUMNS )
        {
            if ( !col.removable && localColumns.includes( col.id ) ) continue; // skip pinned
            const g = col.group || "";
            if ( !groups[ g ] ) groups[ g ] = [];
            groups[ g ].push( col );
        }
        return groups;
    }, [ localColumns ] );

    const selectedDefs = localColumns
        .map( ( id ) => ALL_COLUMNS.find( ( c ) => c.id === id ) )
        .filter( Boolean ) as ColumnDef[];

    if ( !isOpen ) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */ }
            <div className="absolute inset-0 bg-black/60" onClick={ onClose } />

            {/* Dialog */ }
            <div className="relative w-[95vw] md:w-[60vw] max-w-[960px] h-[70vh] md:h-[20vh] min-h-[400px] max-h-[85vh] bg-[#425a58] border border-white/[0.08] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */ }
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                    <h3 className="text-base font-semibold text-white">Edit columns</h3>
                    <button
                        onClick={ onClose }
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */ }
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row text-sm">
                    {/* Left: All columns */ }
                    <div className="w-full md:w-[45%] border-b md:border-b-0 md:border-r border-white/[0.06] overflow-y-auto p-4 max-h-[30vh] md:max-h-none">
                        <h4 className="text-[11px] font-medium text-white/50 uppercase tracking-wider mb-3">
                            All columns
                        </h4>

                        { Object.entries( availableGroups ).map( ( [ group, cols ] ) => (
                            <div key={ group || "__ungrouped" } className="mb-3">
                                { group && (
                                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1 mt-2">
                                        { group }
                                    </div>
                                ) }
                                { cols.map( ( col ) =>
                                {
                                    const isAdded = localColumns.includes( col.id );
                                    return (
                                        <button
                                            key={ col.id }
                                            onClick={ () =>
                                                isAdded ? handleRemove( col.id ) : handleAdd( col.id )
                                            }
                                            disabled={ !col.removable && isAdded }
                                            className={ `
                        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left mb-1
                        ${ isAdded
                                                    ? "bg-black/20 text-white/60"
                                                    : "bg-black/10 text-white/40 hover:text-white/70 hover:bg-black/30"
                                                }
                        transition-colors text-xs disabled:opacity-50
                      `}
                                        >
                                            <span className="truncate">{ col.label }</span>
                                            { isAdded && (
                                                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 flex-shrink-0">
                                                    Added <Check className="w-3 h-3" />
                                                </span>
                                            ) }
                                        </button>
                                    );
                                } ) }
                            </div>
                        ) ) }
                    </div>

                    {/* Right: Selected columns (sortable) */ }
                    <div className="w-full md:w-[55%] overflow-y-auto p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
                                Selected columns ({ localColumns.length })
                            </h4>
                            <button
                                onClick={ handleRemoveAll }
                                className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                            >
                                Remove all
                            </button>
                        </div>


                        <DndContext
                            sensors={ sensors }
                            collisionDetection={ closestCenter }
                            onDragEnd={ handleDragEnd }
                        >
                            <SortableContext
                                items={ localColumns }
                                strategy={ verticalListSortingStrategy }
                            >
                                <div className="flex flex-col gap-1.5">
                                    { selectedDefs.map( ( col ) => (
                                        <SortableItem
                                            key={ col.id }
                                            col={ col }
                                            onRemove={ handleRemove }
                                        />
                                    ) ) }
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>

                {/* Footer */ }
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-white/[0.08]">
                    <button
                        onClick={ onClose }
                        className="px-4 py-2 text-sm text-white/60 hover:text-white/80 rounded-lg
                       border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={ handleApply }
                        className="px-4 py-2 text-sm font-medium text-white bg-[#1b3531] hover:bg-[#2a4a45]
                       rounded-lg transition-colors shadow-lg shadow-black/20 border border-white/10"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
