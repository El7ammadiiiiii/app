/**
 * Archive Types - أنواع نظام الأرشفة
 * 
 * يتضمن:
 * - المحادثات المؤرشفة
 * - الرسائل
 * - إعدادات الأرشفة
 * - خيارات الفلترة والترتيب
 */

// المحادثة المؤرشفة
export interface ArchivedConversation {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  allowBotAccess: boolean;
  messagesCount?: number;
  lastMessage?: string;
  tags?: string[];
}

// رسالة في المحادثة
export interface ArchivedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isResearch?: boolean;
  attachments?: MessageAttachment[];
}

// مرفقات الرسالة
export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'link';
  url: string;
  name: string;
  size?: number;
}

// إعدادات الأرشفة
export interface ArchiveSettings {
  // الأرشفة التلقائية
  autoArchive: boolean;
  autoArchiveAfterDays: number; // أرشفة بعد X يوم من عدم النشاط
  
  // السماح للبوت
  allowBotAccessByDefault: boolean;
  
  // الحذف التلقائي
  autoDelete: boolean;
  deleteAfterDays: number | null; // null = لا تحذف أبداً
  
  // النسخ الاحتياطي
  enableLocalBackup: boolean;
}

// إعدادات افتراضية للأرشفة
export const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = {
  autoArchive: false,
  autoArchiveAfterDays: 30,
  allowBotAccessByDefault: true,
  autoDelete: false,
  deleteAfterDays: null,
  enableLocalBackup: true,
};

// فلترة الأرشيف
export type ArchiveFilterBy = 
  | 'all'           // جميع المحادثات المؤرشفة
  | 'recent'        // الأحدث أولاً
  | 'oldest'        // الأقدم أولاً
  | 'with-bot-access'  // التي يمكن للبوت الوصول إليها
  | 'pinned';       // المثبتة

// ترتيب الأرشيف
export type ArchiveSortBy = 
  | 'archivedAt'    // تاريخ الأرشفة
  | 'createdAt'     // تاريخ الإنشاء
  | 'updatedAt'     // تاريخ آخر تحديث
  | 'title'         // العنوان
  | 'messagesCount'; // عدد الرسائل

// حالة الأرشفة
export type ArchiveStatus = 
  | 'idle'
  | 'loading'
  | 'archiving'
  | 'unarchiving'
  | 'deleting'
  | 'error';

// نتيجة البحث في الأرشيف
export interface ArchiveSearchResult {
  conversation: ArchivedConversation;
  matchingMessages: ArchivedMessage[];
  relevanceScore: number;
}

// سياق الأرشيف للبوت
export interface ArchiveContext {
  conversationId: string;
  title: string;
  summary: string;
  relevantMessages: ArchivedMessage[];
  usedAt: Date;
}

// إحصائيات الأرشيف
export interface ArchiveStats {
  totalArchived: number;
  totalMessages: number;
  oldestArchive: Date | null;
  newestArchive: Date | null;
  withBotAccess: number;
  storageUsed: number; // بالبايت
}

// خيارات تصدير الأرشيف
export interface ExportOptions {
  format: 'json' | 'markdown' | 'txt' | 'pdf';
  includeAttachments: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  conversationIds?: string[];
}

// نتيجة التصدير
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  downloadUrl?: string;
  error?: string;
}
