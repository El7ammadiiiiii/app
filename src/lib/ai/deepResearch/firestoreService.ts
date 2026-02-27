/**
 * Deep Research Firestore Service
 * خدمة حفظ واسترجاع البحث العميق من Firestore
 * ⚠️ SERVER-ONLY: هذا الملف يستخدم firebase-admin
 */

import 'server-only';

import { getDb } from '@/lib/firebase/admin';
import type {
    DeepResearchResult,
    ResearchProgress,
    StoredResearch,
    ResearchHistoryItem,
} from './types';

// Re-export types for API routes
export type { StoredResearch, ResearchHistoryItem };

// ====== المجموعات ======

const COLLECTION_NAME = 'deep_research';

// ====== الدوال ======

/**
 * إنشاء بحث جديد
 */
export async function createResearch (
    userId: string,
    query: string,
    conversationId?: string
): Promise<string>
{
    const db = getDb();
    const docRef = db.collection( COLLECTION_NAME ).doc();

    const now = new Date();

    await docRef.set( {
        id: docRef.id,
        userId,
        conversationId,
        query,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    } );

    return docRef.id;
}

/**
 * تحديث حالة البحث
 */
export async function updateResearchStatus (
    researchId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    progress?: ResearchProgress
): Promise<void>
{
    const db = getDb();
    const docRef = db.collection( COLLECTION_NAME ).doc( researchId );

    const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
    };

    if ( progress )
    {
        updateData.progress = progress;
    }

    if ( status === 'completed' )
    {
        updateData.completedAt = new Date();
    }

    await docRef.update( updateData );
}

/**
 * حفظ نتيجة البحث
 */
export async function saveResearchResult (
    researchId: string,
    result: DeepResearchResult
): Promise<void>
{
    const db = getDb();
    const docRef = db.collection( COLLECTION_NAME ).doc( researchId );

    await docRef.update( {
        result: {
            id: result.id,
            originalQuery: result.originalQuery,
            queries: result.queries,
            // حفظ أول 100 مصدر فقط للتوفير
            uniqueSources: result.uniqueSources.slice( 0, 100 ).map( s => ( {
                id: s.id,
                title: s.title,
                url: s.url,
                snippet: s.snippet?.slice( 0, 300 ),
                domain: s.domain,
                source: s.source,
                relevanceScore: s.relevanceScore,
            } ) ),
            // حفظ ملخص المحتوى المستخرج
            extractedContent: result.extractedContent.slice( 0, 20 ).map( c => ( {
                url: c.url,
                title: c.title,
                content: c.content.slice( 0, 2000 ), // أول 2000 حرف
                wordCount: c.wordCount,
            } ) ),
            synthesis: result.synthesis,
            citations: result.citations.slice( 0, 50 ),
            metadata: result.metadata,
        },
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
    } );
}

/**
 * استرجاع بحث بالمعرف
 */
export async function getResearch ( researchId: string ): Promise<StoredResearch | null>
{
    const db = getDb();
    const doc = await db.collection( COLLECTION_NAME ).doc( researchId ).get();

    if ( !doc.exists )
    {
        return null;
    }

    return doc.data() as StoredResearch;
}

/**
 * استرجاع تاريخ البحث للمستخدم
 */
export async function getUserResearchHistory (
    userId: string,
    limit = 20
): Promise<ResearchHistoryItem[]>
{
    const db = getDb();

    const snapshot = await db
        .collection( COLLECTION_NAME )
        .where( 'userId', '==', userId )
        .orderBy( 'createdAt', 'desc' )
        .limit( limit )
        .get();

    return snapshot.docs.map( doc =>
    {
        const data = doc.data();
        return {
            id: doc.id,
            query: data.query,
            sourcesCount: data.result?.metadata?.uniqueSources || 0,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
            duration: data.result?.metadata?.duration,
        };
    } );
}

/**
 * استرجاع بحث بالمحادثة
 */
export async function getResearchByConversation (
    conversationId: string
): Promise<StoredResearch[]>
{
    const db = getDb();

    const snapshot = await db
        .collection( COLLECTION_NAME )
        .where( 'conversationId', '==', conversationId )
        .orderBy( 'createdAt', 'desc' )
        .get();

    return snapshot.docs.map( doc => doc.data() as StoredResearch );
}

/**
 * حذف بحث
 */
export async function deleteResearch ( researchId: string ): Promise<void>
{
    const db = getDb();
    await db.collection( COLLECTION_NAME ).doc( researchId ).delete();
}

/**
 * حذف جميع أبحاث المستخدم
 */
export async function deleteUserResearchHistory ( userId: string ): Promise<number>
{
    const db = getDb();

    const snapshot = await db
        .collection( COLLECTION_NAME )
        .where( 'userId', '==', userId )
        .get();

    const batch = db.batch();
    snapshot.docs.forEach( doc =>
    {
        batch.delete( doc.ref );
    } );

    await batch.commit();
    return snapshot.size;
}

/**
 * البحث في التاريخ
 */
export async function searchResearchHistory (
    userId: string,
    searchQuery: string,
    limit = 10
): Promise<ResearchHistoryItem[]>
{
    // بحث بسيط - يمكن تحسينه باستخدام Algolia أو مماثل
    const history = await getUserResearchHistory( userId, 100 );

    const lowerQuery = searchQuery.toLowerCase();

    return history
        .filter( item => item.query.toLowerCase().includes( lowerQuery ) )
        .slice( 0, limit );
}

export default {
    createResearch,
    updateResearchStatus,
    saveResearchResult,
    getResearch,
    getUserResearchHistory,
    getResearchByConversation,
    deleteResearch,
    deleteUserResearchHistory,
    searchResearchHistory,
};
