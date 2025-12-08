"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Archive, 
  Search, 
  Filter,
  Loader2,
  AlertCircle,
  MessageSquare,
  Bot,
  Calendar,
  Trash2,
  ArchiveRestore,
  ChevronDown,
  Clock,
  Pin,
  SlidersHorizontal
} from 'lucide-react';
import { useArchive } from '@/hooks/useArchive';
import { ArchivedChatCard } from './ArchivedChatCard';
import { ArchivedMessage, ArchiveFilterBy } from '@/types/archive';
import { cn } from '@/lib/utils';

interface ArchivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onInsertToChat?: (content: string) => void;
}

export function ArchivePanel({ isOpen, onClose, userId, onInsertToChat }: ArchivePanelProps) {
  const {
    archivedChats,
    selectedChat,
    selectedMessages,
    status,
    error,
    stats,
    filterBy,
    selectChat,
    unarchive,
    deletePermanently,
    toggleBotAccess,
    togglePin,
    searchArchive,
    setFilterBy,
    loadStats,
    clearError,
    refresh
  } = useArchive(userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Load stats on open
  React.useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchArchive(query);
    }
  };

  // Handle delete confirmation
  const handleDelete = (chatId: string) => {
    if (confirmDelete === chatId) {
      deletePermanently(chatId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(chatId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  // Format date
  const formatMessageDate = (date: Date): string => {
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterOptions: { value: ArchiveFilterBy; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'الكل', icon: <Archive className="w-4 h-4" /> },
    { value: 'recent', label: 'الأحدث', icon: <Clock className="w-4 h-4" /> },
    { value: 'oldest', label: 'الأقدم', icon: <Calendar className="w-4 h-4" /> },
    { value: 'pinned', label: 'المثبتة', icon: <Pin className="w-4 h-4" /> },
    { value: 'with-bot-access', label: 'متاحة للبوت', icon: <Bot className="w-4 h-4" /> },
  ];

  const isLoading = status === 'loading' || status === 'archiving' || status === 'unarchiving';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-2xl bg-card 
                       border-r border-border z-50 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 
                               flex items-center justify-center">
                  <Archive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">الأرشيف</h2>
                  <p className="text-xs text-muted-foreground">
                    {stats ? `${stats.totalArchived} محادثة • ${stats.totalMessages} رسالة` : 'جاري التحميل...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="تحديث"
                >
                  <Loader2 className={cn("w-5 h-5 text-muted-foreground", isLoading && "animate-spin")} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="px-6 py-4 border-b border-border space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="ابحث في الأرشيف..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-muted border border-border 
                           text-sm text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  dir="rtl"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                           hover:bg-muted text-muted-foreground transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>الفلترة</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showFilters && "rotate-180"
                  )} />
                </button>
                
                <span className="text-xs text-muted-foreground">
                  {archivedChats.length} محادثة
                </span>
              </div>

              {/* Filter Options */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-wrap gap-2 overflow-hidden"
                  >
                    {filterOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFilterBy(option.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          filterBy === option.value
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                        )}
                      >
                        {option.icon}
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-6 mt-4 flex items-center gap-3 p-3 rounded-xl bg-destructive/10 
                           border border-destructive/30 text-destructive"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm flex-1">{error}</p>
                <button onClick={clearError} className="p-1 hover:bg-destructive/20 rounded">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Chats List */}
              <div className={cn(
                "flex-shrink-0 border-l border-border overflow-y-auto p-4 space-y-2 transition-all",
                selectedChat ? "w-1/2" : "w-full"
              )}>
                {isLoading && archivedChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">جاري تحميل الأرشيف...</p>
                  </div>
                ) : archivedChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Archive className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">لا توجد محادثات مؤرشفة</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      عند أرشفة محادثة، ستظهر هنا ويمكنك الوصول إليها في أي وقت
                    </p>
                  </div>
                ) : (
                  archivedChats.map(chat => (
                    <ArchivedChatCard
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChat?.id === chat.id}
                      onSelect={() => selectChat(chat)}
                      onUnarchive={() => unarchive(chat.id)}
                      onDelete={() => handleDelete(chat.id)}
                      onTogglePin={() => togglePin(chat.id, !chat.isPinned)}
                      onToggleBotAccess={() => toggleBotAccess(chat.id, !chat.allowBotAccess)}
                    />
                  ))
                )}
              </div>

              {/* Messages Preview */}
              <AnimatePresence>
                {selectedChat && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '50%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex-1 flex flex-col overflow-hidden bg-muted/30"
                  >
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{selectedChat.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedMessages.length} رسالة
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => unarchive(selectedChat.id)}
                          className="p-2 rounded-lg hover:bg-green-500/10 text-muted-foreground 
                                   hover:text-green-500 transition-colors"
                          title="استعادة"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(selectedChat.id)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            confirmDelete === selectedChat.id
                              ? "bg-destructive text-destructive-foreground"
                              : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          )}
                          title={confirmDelete === selectedChat.id ? "اضغط مرة أخرى للتأكيد" : "حذف"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => selectChat(null)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedMessages.map((msg, index) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            "max-w-[85%] p-3 rounded-xl",
                            msg.role === 'user'
                              ? "mr-auto bg-primary/10 border border-primary/20 rounded-tl-none"
                              : "ml-auto bg-card border border-border rounded-tr-none"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs font-medium",
                              msg.role === 'user' ? "text-primary" : "text-muted-foreground"
                            )}>
                              {msg.role === 'user' ? 'أنت' : 'المساعد'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageDate(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                          
                          {/* Insert to chat button */}
                          {onInsertToChat && msg.role === 'assistant' && (
                            <button
                              onClick={() => onInsertToChat(msg.content)}
                              className="mt-2 flex items-center gap-1 px-2 py-1 rounded text-xs
                                       text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>إدراج في المحادثة</span>
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {stats && (
                  <>
                    <span className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {stats.withBotAccess} متاحة للبوت
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                الأرشيف محفوظ بشكل آمن في السحابة
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ArchivePanel;
