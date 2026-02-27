/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALTRA STORE (Zustand)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * إدارة حالة محرك الاستدلال المتقدم
 * يدعم SSE streaming مع cursor-based reconnection
 * 
 * @version 1.0.0
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type
{
    AltraPhase,
    AltraProgress,
    AltraCitation,
    AltraSource,
    AltraBlock,
    QueryCategory,
} from '@/lib/ai/altra/AltraOrchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AltraState
{
    // حالة المعالجة
    isProcessing: boolean;
    currentQuery: string | null;
    progress: AltraProgress | null;

    // التصنيف والتحليل
    category: QueryCategory | null;
    subQueries: string[];
    reasoning: string | null;

    // النتائج
    synthesis: string | null;
    citations: AltraCitation[];
    sources: AltraSource[];
    blocks: AltraBlock[];

    // بيانات وصفية
    metadata: {
        totalSources: number;
        uniqueSources: number;
        searchQueries: number;
        duration: number;
    } | null;

    // الأخطاء
    error: string | null;

    // عرض UI
    isPanelOpen: boolean;
    activeTab: 'result' | 'sources' | 'reasoning' | 'pipeline';
}

export interface AltraActions
{
    // بدء عملية جديدة
    startAltra: ( query: string, conversationId?: string ) => Promise<void>;

    // إلغاء
    cancelAltra: () => void;

    // تحديث التقدم
    updateProgress: ( progress: AltraProgress ) => void;

    // التحكم بالـ UI
    openPanel: () => void;
    closePanel: () => void;
    togglePanel: () => void;
    setActiveTab: ( tab: AltraState[ 'activeTab' ] ) => void;

    // إعادة التعيين
    reset: () => void;
    clearError: () => void;
}

type AltraStore = AltraState & AltraActions;

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

const initialState: AltraState = {
    isProcessing: false,
    currentQuery: null,
    progress: null,
    category: null,
    subQueries: [],
    reasoning: null,
    synthesis: null,
    citations: [],
    sources: [],
    blocks: [],
    metadata: null,
    error: null,
    isPanelOpen: false,
    activeTab: 'result',
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL VARIABLES
// ═══════════════════════════════════════════════════════════════════════════════

let abortController: AbortController | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function getAuthToken (): Promise<string | null>
{
    try
    {
        const { getAuth } = await import( 'firebase/auth' );
        const { auth } = await import( '@/lib/firebase/client' );
        const user = getAuth( auth ).currentUser;
        if ( user )
        {
            return await user.getIdToken();
        }
    } catch
    {
        console.warn( '[AltraStore] Failed to get auth token' );
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useAltraStore = create<AltraStore>()(
    devtools(
        ( set, get ) => ( {
            ...initialState,

            // ─────────────────────────────────────────────────────────────────
            // START ALTRA
            // ─────────────────────────────────────────────────────────────────

            startAltra: async ( query: string, conversationId?: string ) =>
            {
                const token = await getAuthToken();

                if ( !token )
                {
                    set( { error: 'يجب تسجيل الدخول لاستخدام ALTRA' } );
                    return;
                }

                // إلغاء أي عملية سابقة
                if ( abortController )
                {
                    abortController.abort();
                }

                abortController = new AbortController();

                set( {
                    isProcessing: true,
                    currentQuery: query,
                    progress: {
                        phase: 'classify',
                        message: 'جاري التحضير...',
                        progress: 0,
                    },
                    category: null,
                    subQueries: [],
                    reasoning: null,
                    synthesis: null,
                    citations: [],
                    sources: [],
                    blocks: [],
                    metadata: null,
                    error: null,
                    isPanelOpen: true,
                    activeTab: 'pipeline',
                } );

                try
                {
                    const response = await fetch( '/api/altra', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${ token }`,
                        },
                        body: JSON.stringify( {
                            query,
                            conversationId,
                        } ),
                        signal: abortController.signal,
                    } );

                    if ( !response.ok )
                    {
                        const error = await response.json();
                        throw new Error( error.error || 'فشل في بدء ALTRA' );
                    }

                    // ─── قراءة SSE Stream ───
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if ( !reader )
                    {
                        throw new Error( 'No response body' );
                    }

                    let buffer = '';
                    let lastEventId = '';

                    while ( true )
                    {
                        const { done, value } = await reader.read();

                        if ( done ) break;

                        buffer += decoder.decode( value, { stream: true } );

                        // معالجة الأحداث
                        const lines = buffer.split( '\n\n' );
                        buffer = lines.pop() || '';

                        for ( const eventBlock of lines )
                        {
                            // استخراج ID والبيانات
                            let eventId = '';
                            let eventData = '';

                            for ( const line of eventBlock.split( '\n' ) )
                            {
                                if ( line.startsWith( 'id: ' ) )
                                {
                                    eventId = line.slice( 4 );
                                } else if ( line.startsWith( 'data: ' ) )
                                {
                                    eventData = line.slice( 6 );
                                }
                            }

                            if ( eventId ) lastEventId = eventId;

                            if ( !eventData ) continue;

                            try
                            {
                                const message = JSON.parse( eventData );

                                switch ( message.type )
                                {
                                    case 'altra_progress':
                                        {
                                            const progressData = message.data;
                                            set( {
                                                progress: {
                                                    phase: progressData.phase,
                                                    message: progressData.message,
                                                    progress: progressData.progress,
                                                    details: progressData.details,
                                                },
                                            } );

                                            // تحديث التصنيف عند الحصول عليه
                                            if ( progressData.details?.category )
                                            {
                                                set( { category: progressData.details.category } );
                                            }

                                            // تحديث الاستعلامات الفرعية
                                            if ( progressData.details?.subQueries )
                                            {
                                                set( { subQueries: progressData.details.subQueries } );
                                            }
                                        }
                                        break;

                                    case 'altra_reasoning':
                                        set( {
                                            reasoning: message.data.reasoning,
                                            category: message.data.category,
                                            subQueries: message.data.subQueries || [],
                                        } );
                                        break;

                                    case 'altra_result':
                                        set( {
                                            synthesis: message.data.synthesis,
                                            citations: message.data.citations || [],
                                            blocks: message.data.blocks || [],
                                            sources: message.data.sources || [],
                                            metadata: message.data.metadata || null,
                                            isProcessing: false,
                                            progress: {
                                                phase: 'complete',
                                                message: 'اكتمل',
                                                progress: 100,
                                            },
                                            activeTab: 'result',
                                        } );
                                        break;

                                    case 'altra_error':
                                        set( {
                                            error: message.data.message,
                                            isProcessing: false,
                                        } );
                                        break;

                                    case 'altra_done':
                                        set( { isProcessing: false } );
                                        break;
                                }
                            } catch ( parseError )
                            {
                                console.warn( '[AltraStore] Failed to parse SSE event:', parseError );
                            }
                        }
                    }

                } catch ( error )
                {
                    if ( ( error as Error ).name === 'AbortError' )
                    {
                        set( {
                            isProcessing: false,
                            progress: null,
                        } );
                        return;
                    }

                    const errorMsg = error instanceof Error ? error.message : 'خطأ غير متوقع';
                    console.error( '[AltraStore] Error:', errorMsg );
                    set( {
                        error: errorMsg,
                        isProcessing: false,
                    } );
                }
            },

            // ─────────────────────────────────────────────────────────────────
            // CANCEL
            // ─────────────────────────────────────────────────────────────────

            cancelAltra: () =>
            {
                if ( abortController )
                {
                    abortController.abort();
                    abortController = null;
                }

                set( {
                    isProcessing: false,
                    progress: null,
                } );
            },

            // ─────────────────────────────────────────────────────────────────
            // PROGRESS
            // ─────────────────────────────────────────────────────────────────

            updateProgress: ( progress: AltraProgress ) =>
            {
                set( { progress } );
            },

            // ─────────────────────────────────────────────────────────────────
            // UI CONTROLS
            // ─────────────────────────────────────────────────────────────────

            openPanel: () => set( { isPanelOpen: true } ),
            closePanel: () => set( { isPanelOpen: false } ),
            togglePanel: () => set( ( state ) => ( { isPanelOpen: !state.isPanelOpen } ) ),
            setActiveTab: ( tab ) => set( { activeTab: tab } ),

            // ─────────────────────────────────────────────────────────────────
            // RESET
            // ─────────────────────────────────────────────────────────────────

            reset: () =>
            {
                if ( abortController )
                {
                    abortController.abort();
                    abortController = null;
                }
                set( initialState );
            },

            clearError: () => set( { error: null } ),
        } ),
        { name: 'altra-store' }
    )
);
