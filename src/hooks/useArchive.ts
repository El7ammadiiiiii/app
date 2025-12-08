"use client";

/**
 * useArchive Hook - إدارة حالة الأرشفة
 * 
 * يوفر:
 * - جلب المحادثات المؤرشفة والنشطة
 * - أرشفة واستعادة المحادثات
 * - حذف المحادثات
 * - إدارة صلاحيات البوت
 * - البحث في الأرشيف
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getArchivedConversations, 
  getActiveConversations,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  getConversationMessages,
  updateBotAccess,
  togglePinConversation,
  updateConversationTitle,
  bulkArchiveConversations,
  searchArchiveForContext,
  getArchiveStats
} from '@/lib/services/archiveService';
import { 
  ArchivedConversation, 
  ArchivedMessage,
  ArchiveStatus,
  ArchiveStats,
  ArchiveSearchResult,
  ArchiveFilterBy
} from '@/types/archive';

interface UseArchiveReturn {
  // State
  archivedChats: ArchivedConversation[];
  activeChats: ArchivedConversation[];
  selectedChat: ArchivedConversation | null;
  selectedMessages: ArchivedMessage[];
  status: ArchiveStatus;
  error: string | null;
  stats: ArchiveStats | null;
  searchResults: ArchiveSearchResult[];
  filterBy: ArchiveFilterBy;
  
  // Actions
  loadArchivedChats: () => Promise<void>;
  loadActiveChats: () => Promise<void>;
  archive: (chatId: string) => Promise<void>;
  unarchive: (chatId: string) => Promise<void>;
  deletePermanently: (chatId: string) => Promise<void>;
  bulkArchive: (chatIds: string[]) => Promise<void>;
  selectChat: (chat: ArchivedConversation | null) => Promise<void>;
  toggleBotAccess: (chatId: string, allow: boolean) => Promise<void>;
  togglePin: (chatId: string, isPinned: boolean) => Promise<void>;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  searchArchive: (query: string) => Promise<void>;
  loadStats: () => Promise<void>;
  setFilterBy: (filter: ArchiveFilterBy) => void;
  clearSelection: () => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useArchive(userId: string): UseArchiveReturn {
  // State
  const [archivedChats, setArchivedChats] = useState<ArchivedConversation[]>([]);
  const [activeChats, setActiveChats] = useState<ArchivedConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ArchivedConversation | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<ArchivedMessage[]>([]);
  const [status, setStatus] = useState<ArchiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [searchResults, setSearchResults] = useState<ArchiveSearchResult[]>([]);
  const [filterBy, setFilterBy] = useState<ArchiveFilterBy>('all');

  // ============================================
  // Load Operations
  // ============================================

  const loadArchivedChats = useCallback(async () => {
    if (!userId) return;
    
    setStatus('loading');
    setError(null);
    
    try {
      const chats = await getArchivedConversations(userId);
      setArchivedChats(chats);
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في تحميل المحادثات المؤرشفة';
      setError(message);
      setStatus('error');
    }
  }, [userId]);

  const loadActiveChats = useCallback(async () => {
    if (!userId) return;
    
    try {
      const chats = await getActiveConversations(userId);
      setActiveChats(chats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في تحميل المحادثات';
      setError(message);
    }
  }, [userId]);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    
    try {
      const archiveStats = await getArchiveStats(userId);
      setStats(archiveStats);
    } catch (err) {
      console.error('Failed to load archive stats:', err);
    }
  }, [userId]);

  // ============================================
  // Archive Operations
  // ============================================

  const archive = useCallback(async (chatId: string) => {
    setStatus('archiving');
    setError(null);
    
    try {
      await archiveConversation(chatId);
      
      // تحديث القوائم
      setActiveChats(prev => prev.filter(c => c.id !== chatId));
      const archivedChat = activeChats.find(c => c.id === chatId);
      if (archivedChat) {
        setArchivedChats(prev => [{
          ...archivedChat,
          isArchived: true,
          archivedAt: new Date()
        }, ...prev]);
      }
      
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في أرشفة المحادثة';
      setError(message);
      setStatus('error');
    }
  }, [activeChats]);

  const unarchive = useCallback(async (chatId: string) => {
    setStatus('unarchiving');
    setError(null);
    
    try {
      await unarchiveConversation(chatId);
      
      // تحديث القوائم
      setArchivedChats(prev => prev.filter(c => c.id !== chatId));
      const restoredChat = archivedChats.find(c => c.id === chatId);
      if (restoredChat) {
        setActiveChats(prev => [{
          ...restoredChat,
          isArchived: false,
          archivedAt: null
        }, ...prev]);
      }
      
      // إلغاء التحديد إذا كانت المحادثة المحددة
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setSelectedMessages([]);
      }
      
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في استعادة المحادثة';
      setError(message);
      setStatus('error');
    }
  }, [archivedChats, selectedChat]);

  const deletePermanently = useCallback(async (chatId: string) => {
    setStatus('deleting');
    setError(null);
    
    try {
      await deleteConversation(chatId);
      
      setArchivedChats(prev => prev.filter(c => c.id !== chatId));
      setActiveChats(prev => prev.filter(c => c.id !== chatId));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setSelectedMessages([]);
      }
      
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في حذف المحادثة';
      setError(message);
      setStatus('error');
    }
  }, [selectedChat]);

  const bulkArchive = useCallback(async (chatIds: string[]) => {
    setStatus('archiving');
    setError(null);
    
    try {
      await bulkArchiveConversations(chatIds);
      await loadArchivedChats();
      await loadActiveChats();
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في أرشفة المحادثات';
      setError(message);
      setStatus('error');
    }
  }, [loadArchivedChats, loadActiveChats]);

  // ============================================
  // Selection & View
  // ============================================

  const selectChat = useCallback(async (chat: ArchivedConversation | null) => {
    if (!chat) {
      setSelectedChat(null);
      setSelectedMessages([]);
      return;
    }
    
    setSelectedChat(chat);
    setStatus('loading');
    
    try {
      const messages = await getConversationMessages(chat.id);
      setSelectedMessages(messages);
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في تحميل الرسائل';
      setError(message);
      setStatus('error');
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedChat(null);
    setSelectedMessages([]);
  }, []);

  // ============================================
  // Update Operations
  // ============================================

  const toggleBotAccess = useCallback(async (chatId: string, allow: boolean) => {
    try {
      await updateBotAccess(chatId, allow);
      
      setArchivedChats(prev => 
        prev.map(c => c.id === chatId ? { ...c, allowBotAccess: allow } : c)
      );
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, allowBotAccess: allow } : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في تحديث الإعدادات';
      setError(message);
    }
  }, [selectedChat]);

  const togglePin = useCallback(async (chatId: string, isPinned: boolean) => {
    try {
      await togglePinConversation(chatId, isPinned);
      
      const updateList = (list: ArchivedConversation[]) =>
        list.map(c => c.id === chatId ? { ...c, isPinned } : c);
      
      setArchivedChats(updateList);
      setActiveChats(updateList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في تثبيت المحادثة';
      setError(message);
    }
  }, []);

  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    try {
      await updateConversationTitle(chatId, newTitle);
      
      const updateList = (list: ArchivedConversation[]) =>
        list.map(c => c.id === chatId ? { ...c, title: newTitle } : c);
      
      setArchivedChats(updateList);
      setActiveChats(updateList);
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, title: newTitle } : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في إعادة تسمية المحادثة';
      setError(message);
    }
  }, [selectedChat]);

  // ============================================
  // Search
  // ============================================

  const searchArchive = useCallback(async (query: string) => {
    if (!userId || !query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setStatus('loading');
    
    try {
      const results = await searchArchiveForContext(userId, query, 10);
      setSearchResults(results);
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في البحث';
      setError(message);
      setStatus('error');
    }
  }, [userId]);

  // ============================================
  // Utility
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadArchivedChats(),
      loadActiveChats(),
      loadStats()
    ]);
  }, [loadArchivedChats, loadActiveChats, loadStats]);

  // ============================================
  // Filter Logic
  // ============================================

  const getFilteredChats = useCallback(() => {
    let filtered = [...archivedChats];
    
    switch (filterBy) {
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.archivedAt?.getTime() || 0;
          const dateB = b.archivedAt?.getTime() || 0;
          return dateB - dateA;
        });
        break;
      case 'oldest':
        filtered.sort((a, b) => {
          const dateA = a.archivedAt?.getTime() || 0;
          const dateB = b.archivedAt?.getTime() || 0;
          return dateA - dateB;
        });
        break;
      case 'with-bot-access':
        filtered = filtered.filter(c => c.allowBotAccess);
        break;
      case 'pinned':
        filtered = filtered.filter(c => c.isPinned);
        break;
    }
    
    return filtered;
  }, [archivedChats, filterBy]);

  // ============================================
  // Effects
  // ============================================

  // Load on mount
  useEffect(() => {
    if (userId) {
      loadArchivedChats();
      loadActiveChats();
    }
  }, [userId, loadArchivedChats, loadActiveChats]);

  // ============================================
  // Return
  // ============================================

  return {
    // State
    archivedChats: getFilteredChats(),
    activeChats,
    selectedChat,
    selectedMessages,
    status,
    error,
    stats,
    searchResults,
    filterBy,
    
    // Actions
    loadArchivedChats,
    loadActiveChats,
    archive,
    unarchive,
    deletePermanently,
    bulkArchive,
    selectChat,
    toggleBotAccess,
    togglePin,
    renameChat,
    searchArchive,
    loadStats,
    setFilterBy,
    clearSelection,
    clearError,
    refresh,
  };
}

export default useArchive;
