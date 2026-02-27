/**
 * Deep Research Store (Zustand)
 * إدارة حالة البحث العميق
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DeepResearchResult, ResearchProgress, Citation, ResearchHistoryItem } from '@/lib/ai/deepResearch/types';

// ====== أهداف البحث ======

export type ResearchGoal =
    | 'general'
    | 'travel'
    | 'lifestyle'
    | 'growth'
    | 'shopping'
    | 'learning'
    | 'events'
    | 'local'
    | 'health'
    | 'finance'
    | 'market'
    | 'business'
    | 'science_technology';

export const RESEARCH_GOAL_META: Record<ResearchGoal, { label: string; labelAr: string; icon: string }> = {
    general: { label: 'General', labelAr: 'عام', icon: '🔍' },
    travel: { label: 'Travel', labelAr: 'سفر', icon: '✈️' },
    lifestyle: { label: 'Lifestyle', labelAr: 'نمط حياة', icon: '🎯' },
    growth: { label: 'Growth', labelAr: 'نمو', icon: '📈' },
    shopping: { label: 'Shopping', labelAr: 'تسوّق', icon: '🛒' },
    learning: { label: 'Learning', labelAr: 'تعلّم', icon: '📚' },
    events: { label: 'Events', labelAr: 'أحداث', icon: '🎪' },
    local: { label: 'Local', labelAr: 'محلي', icon: '📍' },
    health: { label: 'Health', labelAr: 'صحة', icon: '🏥' },
    finance: { label: 'Finance', labelAr: 'مالية', icon: '💰' },
    market: { label: 'Market', labelAr: 'سوق', icon: '📊' },
    business: { label: 'Business', labelAr: 'أعمال', icon: '🏢' },
    science_technology: { label: 'Science & Tech', labelAr: 'علوم وتكنولوجيا', icon: '🔬' },
};

/**
 * تصنيف تلقائي للهدف البحثي بناءً على الاستعلام
 */
export function classifyResearchGoal ( query: string ): ResearchGoal
{
    const q = query.toLowerCase();

    const patterns: Array<[ResearchGoal, RegExp]> = [
        ['travel', /(سفر|رحلة|طيران|فندق|سياح|travel|flight|hotel|tourism|destination|trip|vacation|booking)/],
        ['health', /(صحة|علاج|مرض|دواء|طب|أعراض|تشخيص|health|medical|disease|treatment|symptom|diagnosis|medicine|doctor|therapy)/],
        ['finance', /(مال|استثمار|بنك|أسهم|عملة|بتكوين|فوركس|finance|invest|stock|crypto|bitcoin|forex|trading|portfolio|roi)/],
        ['market', /(سوق|تحليل السوق|منافس|market analysis|competitor|market share|market research|trend analysis)/],
        ['business', /(شركة|أعمال|مشروع|إدارة|تسويق|business|company|startup|management|marketing|strategy|revenue|enterprise)/],
        ['science_technology', /(تكنولوجيا|علم|بحث علمي|ذكاء اصطناعي|ai|ml|technology|science|research|algorithm|quantum|neural|blockchain|programming)/],
        ['learning', /(تعلم|دراسة|كورس|منهج|جامعة|learn|study|course|tutorial|education|university|exam|certificate)/],
        ['shopping', /(شراء|منتج|مقارنة|سعر|أفضل|buy|product|compare|price|review|best|recommendation|deal)/],
        ['events', /(حدث|مؤتمر|مهرجان|فعالية|event|conference|festival|concert|webinar|meetup)/],
        ['local', /(مطعم|مقهى|قريب|منطقة|حي|restaurant|cafe|nearby|local|neighborhood|city guide)/],
        ['lifestyle', /(نمط حياة|تغذية|رياضة|لياقة|موضة|lifestyle|diet|fitness|exercise|fashion|wellness|routine)/],
        ['growth', /(نمو|تطوير ذات|مهارات|مسيرة|growth|self-improvement|career|skills|personal development|productivity)/],
    ];

    for ( const [ goal, pattern ] of patterns )
    {
        if ( pattern.test( q ) ) return goal;
    }

    return 'general';
}

// ====== الأنواع ======

export interface DeepResearchState
{
    // حالة البحث الحالي
    isResearching: boolean;
    currentResearchId: string | null;
    currentQuery: string | null;
    researchGoal: ResearchGoal;
    progress: ResearchProgress | null;

    // النتائج
    result: DeepResearchResult | null;
    synthesis: string | null;
    citations: Citation[];

    // التاريخ
    history: ResearchHistoryItem[];
    historyLoading: boolean;

    // الأخطاء
    error: string | null;

    // عرض UI
    isPanelOpen: boolean;
    activeTab: 'result' | 'sources' | 'history';
}

export interface DeepResearchActions
{
    // بدء بحث جديد
    startResearch: ( query: string, conversationId?: string ) => Promise<void>;

    // إلغاء البحث
    cancelResearch: () => void;

    // تحديث التقدم
    updateProgress: ( progress: ResearchProgress ) => void;

    // تعيين النتيجة
    setResult: ( result: Partial<{
        synthesis: string;
        citations: Citation[];
        metadata: DeepResearchResult[ 'metadata' ];
    }> ) => void;

    // تحميل التاريخ
    loadHistory: () => Promise<void>;

    // تحميل بحث من التاريخ
    loadResearch: ( researchId: string ) => Promise<void>;

    // حذف من التاريخ
    deleteFromHistory: ( researchId: string ) => Promise<void>;

    // مسح التاريخ
    clearHistory: () => Promise<void>;

    // التحكم بالـ UI
    openPanel: () => void;
    closePanel: () => void;
    togglePanel: () => void;
    setActiveTab: ( tab: 'result' | 'sources' | 'history' ) => void;

    // إعادة التعيين
    reset: () => void;
    clearError: () => void;
}

type DeepResearchStore = DeepResearchState & DeepResearchActions;

// ====== الحالة الأولية ======

const initialState: DeepResearchState = {
    isResearching: false,
    currentResearchId: null,
    currentQuery: null,
    researchGoal: 'general',
    progress: null,
    result: null,
    synthesis: null,
    citations: [],
    history: [],
    historyLoading: false,
    error: null,
    isPanelOpen: false,
    activeTab: 'result',
};

// ====== المتغيرات الداخلية ======

let abortController: AbortController | null = null;
let eventSource: EventSource | null = null;

// ====== الدوال المساعدة ======

async function getAuthToken (): Promise<string | null>
{
    // استخدام authStore للحصول على التوكن
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
        console.warn( 'Failed to get auth token' );
    }
    return null;
}

// ====== المتجر ======

export const useDeepResearchStore = create<DeepResearchStore>()(
    devtools(
        ( set, get ) => ( {
            ...initialState,

            startResearch: async ( query: string, conversationId?: string ) =>
            {
                const token = await getAuthToken();

                if ( !token )
                {
                    set( { error: 'يجب تسجيل الدخول للبحث العميق' } );
                    return;
                }

                // إلغاء أي بحث سابق
                if ( abortController )
                {
                    abortController.abort();
                }
                if ( eventSource )
                {
                    eventSource.close();
                }

                abortController = new AbortController();

                // تصنيف تلقائي للهدف البحثي
                const goal = classifyResearchGoal( query );

                set( {
                    isResearching: true,
                    currentQuery: query,
                    currentResearchId: null,
                    researchGoal: goal,
                    progress: {
                        phase: 'query_generation',
                        message: 'جاري التحضير...',
                        progress: 0,
                    },
                    result: null,
                    synthesis: null,
                    citations: [],
                    error: null,
                    isPanelOpen: true,
                    activeTab: 'result',
                } );

                try
                {
                    const response = await fetch( '/api/deep-research', {
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
                        throw new Error( error.error || 'فشل في بدء البحث' );
                    }

                    // قراءة SSE stream
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if ( !reader )
                    {
                        throw new Error( 'No response body' );
                    }

                    let buffer = '';

                    while ( true )
                    {
                        const { done, value } = await reader.read();

                        if ( done ) break;

                        buffer += decoder.decode( value, { stream: true } );

                        // معالجة الأحداث
                        const lines = buffer.split( '\n\n' );
                        buffer = lines.pop() || '';

                        for ( const line of lines )
                        {
                            if ( line.startsWith( 'data: ' ) )
                            {
                                try
                                {
                                    const data = JSON.parse( line.slice( 6 ) );

                                    switch ( data.type )
                                    {
                                        case 'progress':
                                            set( {
                                                currentResearchId: data.data.researchId,
                                                progress: {
                                                    phase: data.data.phase,
                                                    message: data.data.message,
                                                    progress: data.data.progress,
                                                    details: data.data.details,
                                                },
                                            } );
                                            break;

                                        case 'result':
                                            set( {
                                                synthesis: data.data.synthesis,
                                                citations: data.data.citations || [],
                                                isResearching: false,
                                                progress: {
                                                    phase: 'complete',
                                                    message: 'اكتمل البحث',
                                                    progress: 100,
                                                },
                                            } );
                                            break;

                                        case 'error':
                                            set( {
                                                error: data.data.message,
                                                isResearching: false,
                                            } );
                                            break;

                                        case 'done':
                                            set( { isResearching: false } );
                                            break;
                                    }
                                } catch ( e )
                                {
                                    console.warn( 'Failed to parse SSE data:', line );
                                }
                            }
                        }
                    }

                } catch ( error )
                {
                    if ( error instanceof Error && error.name === 'AbortError' )
                    {
                        set( {
                            isResearching: false,
                            progress: null,
                        } );
                    } else
                    {
                        set( {
                            error: error instanceof Error ? error.message : 'خطأ غير معروف',
                            isResearching: false,
                        } );
                    }
                }
            },

            cancelResearch: () =>
            {
                if ( abortController )
                {
                    abortController.abort();
                    abortController = null;
                }
                if ( eventSource )
                {
                    eventSource.close();
                    eventSource = null;
                }
                set( {
                    isResearching: false,
                    progress: null,
                } );
            },

            updateProgress: ( progress: ResearchProgress ) =>
            {
                set( { progress } );
            },

            setResult: ( result ) =>
            {
                set( {
                    synthesis: result.synthesis || null,
                    citations: result.citations || [],
                } );
            },

            loadHistory: async () =>
            {
                const token = await getAuthToken();
                if ( !token ) return;

                set( { historyLoading: true } );

                try
                {
                    const response = await fetch( '/api/deep-research/history', {
                        headers: {
                            'Authorization': `Bearer ${ token }`,
                        },
                    } );

                    if ( response.ok )
                    {
                        const data = await response.json();
                        set( { history: data.history || [] } );
                    }
                } catch ( error )
                {
                    console.error( 'Failed to load history:', error );
                } finally
                {
                    set( { historyLoading: false } );
                }
            },

            loadResearch: async ( researchId: string ) =>
            {
                const token = await getAuthToken();
                if ( !token ) return;

                try
                {
                    const response = await fetch( `/api/deep-research/${ researchId }`, {
                        headers: {
                            'Authorization': `Bearer ${ token }`,
                        },
                    } );

                    if ( response.ok )
                    {
                        const data = await response.json();
                        const research = data.research;

                        if ( research?.result )
                        {
                            set( {
                                currentResearchId: researchId,
                                currentQuery: research.query,
                                synthesis: research.result.synthesis,
                                citations: research.result.citations || [],
                                isPanelOpen: true,
                                activeTab: 'result',
                            } );
                        }
                    }
                } catch ( error )
                {
                    console.error( 'Failed to load research:', error );
                }
            },

            deleteFromHistory: async ( researchId: string ) =>
            {
                const token = await getAuthToken();
                if ( !token ) return;

                try
                {
                    await fetch( `/api/deep-research/${ researchId }`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${ token }`,
                        },
                    } );

                    set( state => ( {
                        history: state.history.filter( h => h.id !== researchId ),
                    } ) );
                } catch ( error )
                {
                    console.error( 'Failed to delete research:', error );
                }
            },

            clearHistory: async () =>
            {
                const token = await getAuthToken();
                if ( !token ) return;

                try
                {
                    await fetch( '/api/deep-research/history', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${ token }`,
                        },
                    } );

                    set( { history: [] } );
                } catch ( error )
                {
                    console.error( 'Failed to clear history:', error );
                }
            },

            openPanel: () => set( { isPanelOpen: true } ),
            closePanel: () => set( { isPanelOpen: false } ),
            togglePanel: () => set( state => ( { isPanelOpen: !state.isPanelOpen } ) ),
            setActiveTab: ( tab ) => set( { activeTab: tab } ),

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
        { name: 'deep-research-store' }
    )
);

export default useDeepResearchStore;
