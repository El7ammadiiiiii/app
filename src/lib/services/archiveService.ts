/**
 * Archive Service - خدمة الأرشفة
 * 
 * تتعامل مع Firestore لإدارة المحادثات المؤرشفة
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { 
  ArchivedConversation, 
  ArchivedMessage, 
  ArchiveStats,
  ArchiveSearchResult,
  ArchiveContext
} from '@/types/archive';

// Collection names
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

// ============================================
// Utility Functions
// ============================================

/**
 * تحويل Firestore Timestamp إلى Date
 */
const convertTimestamp = (timestamp: Timestamp | null | undefined): Date | null => {
  if (!timestamp) return null;
  return timestamp.toDate();
};

/**
 * تحويل مستند Firestore إلى ArchivedConversation
 */
const docToConversation = (docId: string, data: DocumentData): ArchivedConversation => ({
  id: docId,
  userId: data.userId || '',
  projectId: data.projectId || '',
  title: data.title || 'محادثة بدون عنوان',
  isArchived: data.isArchived || false,
  archivedAt: convertTimestamp(data.archivedAt),
  createdAt: convertTimestamp(data.createdAt) || new Date(),
  updatedAt: convertTimestamp(data.updatedAt) || new Date(),
  isPinned: data.isPinned || false,
  allowBotAccess: data.allowBotAccess ?? true,
  messagesCount: data.messagesCount || 0,
  lastMessage: data.lastMessage || '',
  tags: data.tags || [],
});

/**
 * تحويل مستند Firestore إلى ArchivedMessage
 */
const docToMessage = (docId: string, data: DocumentData): ArchivedMessage => ({
  id: docId,
  role: data.role || 'user',
  content: data.content || '',
  timestamp: convertTimestamp(data.timestamp) || new Date(),
  isResearch: data.isResearch || false,
  attachments: data.attachments || [],
});

// ============================================
// Conversation CRUD Operations
// ============================================

/**
 * جلب جميع المحادثات المؤرشفة للمستخدم
 */
export async function getArchivedConversations(userId: string): Promise<ArchivedConversation[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('userId', '==', userId),
    where('isArchived', '==', true),
    orderBy('archivedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToConversation(doc.id, doc.data()));
}

/**
 * جلب جميع المحادثات النشطة (غير المؤرشفة)
 */
export async function getActiveConversations(userId: string): Promise<ArchivedConversation[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('userId', '==', userId),
    where('isArchived', '==', false),
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToConversation(doc.id, doc.data()));
}

/**
 * جلب محادثة واحدة
 */
export async function getConversation(conversationId: string): Promise<ArchivedConversation | null> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  return docToConversation(docSnap.id, docSnap.data());
}

/**
 * إنشاء محادثة جديدة
 */
export async function createConversation(
  userId: string, 
  projectId: string, 
  title: string
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
    userId,
    projectId,
    title,
    isArchived: false,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isPinned: false,
    allowBotAccess: true,
    messagesCount: 0,
    lastMessage: '',
    tags: [],
  });
  
  return docRef.id;
}

/**
 * أرشفة محادثة
 */
export async function archiveConversation(conversationId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(docRef, {
    isArchived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * إلغاء أرشفة محادثة (استعادة)
 */
export async function unarchiveConversation(conversationId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(docRef, {
    isArchived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * حذف محادثة نهائياً مع جميع رسائلها
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const batch = writeBatch(db);
  
  // حذف جميع الرسائل أولاً
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
  const messagesSnapshot = await getDocs(messagesRef);
  
  messagesSnapshot.docs.forEach(msgDoc => {
    batch.delete(msgDoc.ref);
  });
  
  // حذف المحادثة
  batch.delete(doc(db, CONVERSATIONS_COLLECTION, conversationId));
  
  await batch.commit();
}

/**
 * أرشفة عدة محادثات دفعة واحدة
 */
export async function bulkArchiveConversations(conversationIds: string[]): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const batch = writeBatch(db);
  
  conversationIds.forEach(id => {
    const docRef = doc(db, CONVERSATIONS_COLLECTION, id);
    batch.update(docRef, {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
}

/**
 * تحديث عنوان المحادثة
 */
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

/**
 * تبديل حالة التثبيت
 */
export async function togglePinConversation(conversationId: string, isPinned: boolean): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(docRef, {
    isPinned,
    updatedAt: serverTimestamp(),
  });
}

/**
 * تحديث إعداد السماح للبوت بالقراءة
 */
export async function updateBotAccess(conversationId: string, allowAccess: boolean): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');
  
  const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(docRef, {
    allowBotAccess: allowAccess,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Message Operations
// ============================================

/**
 * جلب رسائل محادثة
 */
export async function getConversationMessages(conversationId: string): Promise<ArchivedMessage[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToMessage(doc.id, doc.data()));
}

/**
 * إضافة رسالة جديدة
 */
export async function addMessage(
  conversationId: string,
  message: Omit<ArchivedMessage, 'id' | 'timestamp'>
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');
  
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
  
  const docRef = await addDoc(messagesRef, {
    ...message,
    timestamp: serverTimestamp(),
  });
  
  // تحديث المحادثة
  const convRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(convRef, {
    updatedAt: serverTimestamp(),
    lastMessage: message.content.substring(0, 100),
  });
  
  return docRef.id;
}

// ============================================
// Bot Context Operations (للبوت لقراءة الأرشيف)
// ============================================

/**
 * جلب المحادثات التي يُسمح للبوت بالوصول إليها
 */
export async function getBotAccessibleConversations(userId: string): Promise<ArchivedConversation[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('userId', '==', userId),
    where('allowBotAccess', '==', true),
    limit(50) // حد أقصى للأداء
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToConversation(doc.id, doc.data()));
}

/**
 * البحث في الأرشيف للبوت
 */
export async function searchArchiveForContext(
  userId: string, 
  searchQuery: string,
  maxResults: number = 5
): Promise<ArchiveSearchResult[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  // جلب المحادثات المتاحة
  const conversations = await getBotAccessibleConversations(userId);
  const results: ArchiveSearchResult[] = [];
  const queryLower = searchQuery.toLowerCase();
  
  for (const conv of conversations) {
    // البحث في العنوان
    const titleMatch = conv.title.toLowerCase().includes(queryLower);
    
    // البحث في الرسائل
    const messages = await getConversationMessages(conv.id);
    const matchingMessages = messages.filter(msg => 
      msg.content.toLowerCase().includes(queryLower)
    );
    
    if (titleMatch || matchingMessages.length > 0) {
      // حساب درجة الصلة
      let score = 0;
      if (titleMatch) score += 10;
      score += matchingMessages.length * 2;
      
      results.push({
        conversation: conv,
        matchingMessages: matchingMessages.slice(0, 3), // أول 3 رسائل مطابقة
        relevanceScore: score,
      });
    }
    
    if (results.length >= maxResults) break;
  }
  
  // ترتيب حسب الصلة
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * بناء سياق من الأرشيف للبوت
 */
export async function buildContextFromArchive(
  userId: string,
  currentQuery: string,
  maxContextLength: number = 2000
): Promise<ArchiveContext[]> {
  if (!db) throw new Error('Firebase not initialized');
  
  const searchResults = await searchArchiveForContext(userId, currentQuery, 3);
  const contexts: ArchiveContext[] = [];
  
  for (const result of searchResults) {
    const summary = result.matchingMessages
      .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
      .join('\n');
    
    if (summary.length > 0) {
      contexts.push({
        conversationId: result.conversation.id,
        title: result.conversation.title,
        summary: summary.substring(0, maxContextLength),
        relevantMessages: result.matchingMessages,
        usedAt: new Date(),
      });
    }
  }
  
  return contexts;
}

// ============================================
// Statistics
// ============================================

/**
 * جلب إحصائيات الأرشيف
 */
export async function getArchiveStats(userId: string): Promise<ArchiveStats> {
  if (!db) throw new Error('Firebase not initialized');
  
  const archived = await getArchivedConversations(userId);
  const withBotAccess = archived.filter(c => c.allowBotAccess).length;
  
  let totalMessages = 0;
  let oldestDate: Date | null = null;
  let newestDate: Date | null = null;
  
  for (const conv of archived) {
    const messages = await getConversationMessages(conv.id);
    totalMessages += messages.length;
    
    if (conv.archivedAt) {
      if (!oldestDate || conv.archivedAt < oldestDate) {
        oldestDate = conv.archivedAt;
      }
      if (!newestDate || conv.archivedAt > newestDate) {
        newestDate = conv.archivedAt;
      }
    }
  }
  
  return {
    totalArchived: archived.length,
    totalMessages,
    oldestArchive: oldestDate,
    newestArchive: newestDate,
    withBotAccess,
    storageUsed: 0, // يمكن حسابه لاحقاً
  };
}
