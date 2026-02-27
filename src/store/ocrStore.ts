/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OCR CONTEXT STORE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * إدارة سياق OCR للمستندات المستخرجة
 * يعمل في الخلفية ويوفر النص للنماذج دون إزدحام الواجهة
 * 
 * @version 1.0.0
 */

import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OCRContext
{
    id: string;
    text: string;
    filename: string;
    pageCount: number;
    wordCount: number;
    estimatedTokens: number;
    extractedAt: number;
    confidence: number;
}

interface OCRStore
{
    // State
    contexts: Map<string, OCRContext>;
    activeContextId: string | null;
    isProcessing: boolean;

    // Actions
    addContext: ( context: OCRContext ) => void;
    removeContext: ( id: string ) => void;
    getActiveContext: () => OCRContext | null;
    setActiveContext: ( id: string | null ) => void;
    clearAll: () => void;
    setProcessing: ( processing: boolean ) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const useOCRStore = create<OCRStore>( ( set, get ) => ( {
    // Initial State
    contexts: new Map(),
    activeContextId: null,
    isProcessing: false,

    // Add new OCR context
    addContext: ( context ) =>
    {
        set( ( state ) =>
        {
            const newContexts = new Map( state.contexts );
            newContexts.set( context.id, context );
            return {
                contexts: newContexts,
                activeContextId: context.id,
                isProcessing: false
            };
        } );
    },

    // Remove context
    removeContext: ( id ) =>
    {
        set( ( state ) =>
        {
            const newContexts = new Map( state.contexts );
            newContexts.delete( id );
            return {
                contexts: newContexts,
                activeContextId: state.activeContextId === id ? null : state.activeContextId
            };
        } );
    },

    // Get active context
    getActiveContext: () =>
    {
        const { contexts, activeContextId } = get();
        return activeContextId ? contexts.get( activeContextId ) || null : null;
    },

    // Set active context
    setActiveContext: ( id ) => set( { activeContextId: id } ),

    // Clear all contexts
    clearAll: () => set( {
        contexts: new Map(),
        activeContextId: null,
        isProcessing: false
    } ),

    // Set processing state
    setProcessing: ( processing ) => set( { isProcessing: processing } )
} ) );

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format file size
 */
export function formatFileSize ( bytes: number ): string
{
    if ( bytes < 1024 ) return `${ bytes } B`;
    if ( bytes < 1024 * 1024 ) return `${ ( bytes / 1024 ).toFixed( 1 ) } KB`;
    return `${ ( bytes / ( 1024 * 1024 ) ).toFixed( 1 ) } MB`;
}

/**
 * Format number with locale
 */
export function formatNumber ( num: number ): string
{
    return num.toLocaleString( 'ar-SA' );
}

/**
 * Create display badge text
 */
export function createContextBadge ( context: OCRContext ): string
{
    return `📄 ${ context.filename } • ${ formatNumber( context.wordCount ) } كلمة • ${ context.pageCount } ${ context.pageCount === 1 ? 'صفحة' : 'صفحات' }`;
}

/**
 * Create detailed stats text
 */
export function createContextStats ( context: OCRContext ): string
{
    return `~${ formatNumber( context.estimatedTokens ) } token • ثقة ${ ( context.confidence * 100 ).toFixed( 0 ) }%`;
}
