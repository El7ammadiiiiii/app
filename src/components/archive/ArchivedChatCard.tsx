"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  Pin, 
  PinOff,
  Bot,
  BotOff,
  MoreVertical,
  MessageSquare,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { ArchivedConversation } from '@/types/archive';
import { cn } from '@/lib/utils';

interface ArchivedChatCardProps {
  chat: ArchivedConversation;
  isSelected: boolean;
  onSelect: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleBotAccess: () => void;
}

export function ArchivedChatCard({
  chat,
  isSelected,
  onSelect,
  onUnarchive,
  onDelete,
  onTogglePin,
  onToggleBotAccess,
}: ArchivedChatCardProps) {
  const [showActions, setShowActions] = React.useState(false);

  // تنسيق التاريخ
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
    
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        "group relative p-4 rounded-xl border cursor-pointer transition-all duration-200",
        isSelected
          ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10"
          : "theme-card border-border hover:bg-muted/50 hover:border-border/80"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* أيقونة الأرشيف */}
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            chat.allowBotAccess 
              ? "bg-green-500/10 text-green-500" 
              : "bg-muted text-muted-foreground"
          )}>
            <Archive className="w-4 h-4" />
          </div>
          
          {/* العنوان */}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm text-foreground truncate">
              {chat.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(chat.archivedAt)}</span>
              {chat.messagesCount && chat.messagesCount > 0 && (
                <>
                  <span>•</span>
                  <MessageSquare className="w-3 h-3" />
                  <span>{chat.messagesCount}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {chat.isPinned && (
            <div className="p-1 rounded bg-yellow-500/10" title="مثبت">
              <Pin className="w-3 h-3 text-yellow-500" />
            </div>
          )}
          {chat.allowBotAccess && (
            <div className="p-1 rounded bg-green-500/10" title="البوت يمكنه القراءة">
              <Bot className="w-3 h-3 text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Last Message Preview */}
      {chat.lastMessage && (
        <p className="text-xs text-muted-foreground line-clamp-2 mr-10">
          {chat.lastMessage}
        </p>
      )}

      {/* Actions (on hover) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: showActions ? 1 : 0, 
          scale: showActions ? 1 : 0.95 
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 theme-card border border-border rounded-lg p-1 shadow-lg"
      >
        {/* استعادة */}
        <button
          onClick={(e) => { e.stopPropagation(); onUnarchive(); }}
          className="p-1.5 rounded-md hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-colors"
          title="استعادة من الأرشيف"
        >
          <ArchiveRestore className="w-4 h-4" />
        </button>

        {/* تثبيت */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            chat.isPinned
              ? "bg-yellow-500/10 text-yellow-500"
              : "hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500"
          )}
          title={chat.isPinned ? "إلغاء التثبيت" : "تثبيت"}
        >
          {chat.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>

        {/* صلاحية البوت */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBotAccess(); }}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            chat.allowBotAccess
              ? "bg-green-500/10 text-green-500"
              : "hover:bg-muted text-muted-foreground"
          )}
          title={chat.allowBotAccess ? "منع البوت من القراءة" : "السماح للبوت بالقراءة"}
        >
          {chat.allowBotAccess ? <Bot className="w-4 h-4" /> : <BotOff className="w-4 h-4" />}
        </button>

        {/* حذف */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="حذف نهائياً"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Selection Arrow */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2"
        >
          <ChevronLeft className="w-5 h-5 text-primary" />
        </motion.div>
      )}
    </motion.div>
  );
}

export default ArchivedChatCard;
