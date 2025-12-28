"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  MessageSquare, 
  Pin, 
  MoreHorizontal, 
  Trash2, 
  GitBranch,
  Edit3
} from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import type { ProjectChat } from "@/types/project";
import { useSound } from "@/lib/sounds";

interface ProjectChatListProps {
  projectId: string;
}

export function ProjectChatList({ projectId }: ProjectChatListProps) {
  const { getProjectChats, createChat, activeChatId, setActiveChat } = useProjectStore();
  const { playSound } = useSound();
  
  const chats = getProjectChats(projectId);
  const pinnedChats = chats.filter(c => c.isPinned);
  const normalChats = chats.filter(c => !c.isPinned);

  const handleNewChat = () => {
    createChat(projectId);
    playSound("click");
  };

  return (
    <div className="space-y-4">
      {/* زر محادثة جديدة */}
      <motion.button
        onClick={handleNewChat}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 
                 rounded-xl border-2 border-dashed border-border
                 hover:border-primary/50 hover:bg-accent/50
                 transition-all text-sm font-medium"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Plus size={18} />
        محادثة جديدة
      </motion.button>

      {/* المحادثات المثبتة */}
      {pinnedChats.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2 px-2">
            <Pin size={12} />
            مثبتة
          </h4>
          <div className="space-y-1">
            {pinnedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                onSelect={() => setActiveChat(chat.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* المحادثات العادية */}
      {normalChats.length > 0 && (
        <div className="space-y-1">
          {pinnedChats.length > 0 && (
            <h4 className="text-xs font-medium text-muted-foreground px-2 pt-2">
              المحادثات
            </h4>
          )}
          <AnimatePresence>
            {normalChats.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <ChatItem
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  onSelect={() => setActiveChat(chat.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* حالة فارغة */}
      {chats.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="mx-auto h-10 w-10 opacity-50 mb-3" />
          <p className="text-sm">لا توجد محادثات</p>
          <p className="text-xs mt-1">ابدأ محادثة جديدة</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Chat Item Component
// ═══════════════════════════════════════════════════════════════

interface ChatItemProps {
  chat: ProjectChat;
  isActive: boolean;
  onSelect: () => void;
}

function ChatItem({ chat, isActive, onSelect }: ChatItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  
  const { updateChat, deleteChat, pinChat } = useProjectStore();
  const { playSound } = useSound();

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    pinChat(chat.id);
    playSound("click");
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف "${chat.title}"؟`)) {
      deleteChat(chat.id);
      playSound("projectDelete");
    }
    setShowMenu(false);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveRename = () => {
    if (editTitle.trim() && editTitle !== chat.title) {
      updateChat(chat.id, { title: editTitle.trim() });
      playSound("success");
    }
    setIsEditing(false);
  };

  const lastMessage = chat.messages[chat.messages.length - 1];
  const formattedDate = new Date(chat.updatedAt).toLocaleDateString("ar", {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      onClick={onSelect}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200
        ${isActive 
          ? "bg-primary/10 border border-primary/20" 
          : "hover:bg-accent/50"
        }
      `}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* أيقونة المحادثة */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
        ${isActive ? "bg-primary/20" : "bg-muted"}
      `}>
        {chat.isBranch ? (
          <GitBranch size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
        ) : (
          <MessageSquare size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
        )}
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="w-full theme-surface px-2 py-1 rounded border border-primary 
                     focus:outline-none text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <p className={`text-sm truncate ${isActive ? "font-medium" : ""}`}>
              {chat.title}
            </p>
            {lastMessage && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {lastMessage.content.slice(0, 50)}...
              </p>
            )}
          </>
        )}
      </div>

      {/* التاريخ وأيقونات */}
      <div className="flex items-center gap-2">
        {chat.isPinned && (
          <Pin size={12} className="text-primary flex-shrink-0" />
        )}
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formattedDate}
        </span>
        
        {/* القائمة */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 
                     hover:bg-accent transition-all"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }} 
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-6 left-0 z-50 min-w-[140px] bg-popover border border-border 
                         rounded-xl shadow-xl overflow-hidden"
              >
                <div className="py-1">
                  <button
                    onClick={handleRename}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Edit3 size={14} />
                    إعادة تسمية
                  </button>
                  <button
                    onClick={handlePin}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Pin size={14} />
                    {chat.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm 
                             text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
