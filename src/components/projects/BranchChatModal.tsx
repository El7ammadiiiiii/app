"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitBranch, MessageSquare } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import type { ProjectChat, ChatMessage } from "@/types/project";
import { useSound } from "@/lib/sounds";

interface BranchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ProjectChat | null;
}

export function BranchChatModal({ isOpen, onClose, chat }: BranchChatModalProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [branchTitle, setBranchTitle] = useState("");
  
  const { branchChat } = useProjectStore();
  const { playSound } = useSound();

  if (!chat) return null;

  const handleBranch = () => {
    if (!selectedMessageId) return;

    branchChat(chat.id, selectedMessageId, branchTitle.trim() || undefined);
    playSound("success");
    onClose();
    setBranchTitle("");
    setSelectedMessageId(null);
  };

  const handleClose = () => {
    onClose();
    setBranchTitle("");
    setSelectedMessageId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-[600px] md:max-h-[80vh] theme-card border border-border rounded-2xl 
                       shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 
                              flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">تفريع المحادثة</h2>
                  <p className="text-sm text-muted-foreground">اختر نقطة البداية للمحادثة الجديدة</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* اسم الفرع */}
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المحادثة الجديدة (اختياري)</label>
                <input
                  type="text"
                  value={branchTitle}
                  onChange={(e) => setBranchTitle(e.target.value)}
                  placeholder={`فرع من: ${chat.title}`}
                    className="w-full px-4 py-3 rounded-xl border border-border theme-card
                             focus:border-primary focus:ring-2 focus:ring-primary/20 
                             outline-none transition-all"
                />
              </div>

              {/* قائمة الرسائل */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  اختر الرسالة للتفريع منها ({chat.messages.length} رسالة)
                </label>
                <p className="text-xs text-muted-foreground">
                  سيتم نسخ جميع الرسائل حتى الرسالة المختارة إلى المحادثة الجديدة
                </p>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto border border-border rounded-xl p-2">
                  {chat.messages.map((message, index) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      index={index}
                      isSelected={selectedMessageId === message.id}
                      onSelect={() => setSelectedMessageId(message.id)}
                    />
                  ))}
                </div>
              </div>

              {/* معلومات التفريع */}
              {selectedMessageId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch size={16} className="text-primary" />
                    <span>
                      سيتم نسخ{" "}
                      <strong>
                        {chat.messages.findIndex((m) => m.id === selectedMessageId) + 1}
                      </strong>{" "}
                      رسالة إلى المحادثة الجديدة
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/30">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-border hover:bg-accent 
                         transition-colors font-medium"
              >
                إلغاء
              </button>
              <motion.button
                onClick={handleBranch}
                disabled={!selectedMessageId}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground 
                         hover:bg-primary/90 transition-colors font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GitBranch size={16} />
                إنشاء فرع جديد
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// Message Item Component
// ═══════════════════════════════════════════════════════════════

interface MessageItemProps {
  message: ChatMessage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function MessageItem({ message, index, isSelected, onSelect }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <motion.button
      onClick={onSelect}
      className={`
        w-full text-right p-3 rounded-xl transition-all
        ${isSelected 
          ? "bg-primary/10 border-2 border-primary" 
          : "border-2 border-transparent hover:bg-accent/50"
        }
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-3">
        {/* رقم الرسالة */}
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
          ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}
        `}>
          {index + 1}
        </div>

        {/* محتوى الرسالة */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${isUser ? "text-primary" : "text-muted-foreground"}`}>
              {isUser ? "أنت" : "المساعد"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString("ar", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </span>
          </div>
          <p className="text-sm line-clamp-2">{message.content}</p>
        </div>

        {/* علامة الاختيار */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <MessageSquare size={12} className="text-primary-foreground" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
