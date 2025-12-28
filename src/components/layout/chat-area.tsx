"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  MicOff,
  PhoneCall,
  Share2,
  Star,
  RefreshCw,
  Trash2,
  Maximize2,
  Minimize2,
  Bot,
  Sparkles,
  GraduationCap,
  Search,
  Plus,
  Camera,
  Paperclip,
  Activity,
  Database,
  Code2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasParser } from "@/hooks/useCanvasParser";
import { useCanvasStore, CanvasType } from "@/store/canvasStore";
import { useProjectStore } from "@/store/projectStore";
import { ProjectHeader } from "@/components/projects";
import { useSound } from "@/lib/sounds";
import { useMounted } from "@/hooks/use-mounted";
// Project types imported from store
import { DeepResearchPanel } from "@/components/deep-research";
import { WebSearchPanel } from "@/components/web-search";

// Message interface is defined in projectStore
type MessageRole = "user" | "assistant";

interface DemoMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "1",
    role: "user" as MessageRole,
    content: "مرحباً، أريد تحليلاً لسوق العملات الرقمية اليوم.",
    timestamp: Date.now() - 100000,
  },
  {
    id: "2",
    role: "assistant" as MessageRole,
    content: "أهلاً بك! بالتأكيد. يشهد السوق اليوم تقلبات ملحوظة مع اتجاه عام للصعود في العملات الرئيسية.\n\n**أبرز النقاط:**\n- **Bitcoin (BTC):** يتداول فوق مستوى 65,000$ مع دعم قوي.\n- **Ethereum (ETH):** يظهر إشارات إيجابية بعد التحديث الأخير.\n\nهل تود التركيز على عملة محددة؟",
    timestamp: Date.now() - 80000,
  },
  {
    id: "3",
    role: "user" as MessageRole,
    content: "نعم، ماذا عن Solana؟",
    timestamp: Date.now() - 60000,
  },
  {
    id: "4",
    role: "assistant" as MessageRole,
    content: "عملة **Solana (SOL)** تظهر أداءً ممتازاً:\n\n1. **السعر الحالي:** 145$\n2. **حجم التداول:** مرتفع بنسبة 15% عن الأمس.\n3. **المؤشرات الفنية:** مؤشر RSI يشير إلى منطقة شراء قوية.\n\nأنصح بمراقبة مستوى المقاومة عند 150$.",
    timestamp: Date.now() - 40000,
  }
];

interface ChatAreaProps {
  activeAgent: "general" | "institute";
  onAgentChange: (agent: "general" | "institute") => void;
}

export function ChatArea({ }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportConsent, setReportConsent] = useState(false);
  const [isDeepResearchOpen, setIsDeepResearchOpen] = useState(false);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const overlayActive = showPlusMenu || isAgentMenuOpen;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const agentButtonRef = useRef<HTMLButtonElement>(null);
  const mounted = useMounted();

  // Project Store Integration
  const {
    getActiveProject,
    getActiveChat,
    addMessage,
    updateMessage,
    createChat,
    createProject,
    setActiveChat,
    deleteChat,
    activeProjectId,
    activeChatId,
    projects,
    closeCreateModal,
    closeQuickSwitcher,
    closeSettings,
  } = useProjectStore();
  
  // Canvas Parser Integration
  const { processChunk, chatContent } = useCanvasParser();
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Sync chatContent to store
  useEffect(() => {
    if (streamingMessageId && activeChatId) {
      updateMessage(activeChatId, streamingMessageId, { content: chatContent });
    }
  }, [chatContent, streamingMessageId, activeChatId, updateMessage]);

  const { playSound } = useSound();
  const { 
    openCanvas, 
    closeCanvas, 
    isOpen: isCanvasOpen,
    isModeActive,
    activeModeType,
    enableMode,
    disableMode
  } = useCanvasStore();

  const activeProject = getActiveProject();
  const activeChat = getActiveChat();

  const conversationLink =
    typeof window !== "undefined" && activeChatId
      ? `${window.location.origin}/chat/${activeChatId}`
      : activeChatId
      ? `/chat/${activeChatId}`
      : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (showPlusMenu && !plusMenuRef.current?.contains(target) && !plusButtonRef.current?.contains(target)) {
        setShowPlusMenu(false);
      }

      if (isAgentMenuOpen && !agentMenuRef.current?.contains(target) && !agentButtonRef.current?.contains(target)) {
        setIsAgentMenuOpen(false);
      }

      if (isTopMenuOpen && topMenuRef.current && !topMenuRef.current.contains(target)) {
        setIsTopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPlusMenu, isAgentMenuOpen, isTopMenuOpen]);

  // استخدم الرسائل من المحادثة النشطة في Zustand أو الرسائل التجريبية
  const messages = activeChat?.messages?.length ? activeChat.messages : DEMO_MESSAGES;

  const handleSend = () => {
    if (!message.trim()) return;
    
    // Disable canvas mode when sending
    if (isModeActive) {
      disableMode();
    }

    if (activeChatId) {
      // Add user message
      addMessage(activeChatId, {
        role: "user",
        content: message.trim(),
      });
      
      // Add placeholder assistant message
      const assistantMsg = addMessage(activeChatId, {
        role: "assistant",
        content: "...",
      });
      setStreamingMessageId(assistantMsg.id);
      
      // Check if this is a demo request or if Canvas mode was active
      const isDemo = message.toLowerCase().includes("canvas") || 
                    message.toLowerCase().includes("code") || 
                    isModeActive;

      // Simulate streaming with XML for Canvas (Only for demo/testing)
      const demoXML = isDemo ? `حسناً، سأقوم بإنشاء مكون React لك في الـ Canvas.

<canvas_action>
<type>${activeModeType}</type>
<language>typescript</language>
<title>UserProfile.tsx</title>
<content>
import React from 'react';

interface UserProfileProps {
  name: string;
  role: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ name, role }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-slate-800">
      <h2 className="text-xl font-bold text-primary">{name}</h2>
      <p className="text-gray-500 dark:text-gray-400">{role}</p>
    </div>
  );
};
</content>
</canvas_action>

هذا هو المكون المطلوب. يمكنك رؤيته الآن في الشاشة الجانبية.` : `هذا رد تجريبي. لتجربة نظام Canvas، اختر الأداة من القائمة أو اكتب "canvas" في رسالتك.`;

      let i = 0;
      const interval = setInterval(() => {
        const chunk = demoXML.slice(i, i + 5);
        processChunk(chunk);
        i += 5;
        if (i >= demoXML.length) {
          clearInterval(interval);
          setStreamingMessageId(null);
        }
      }, 30);
      
      playSound("click");
    }
    
    setMessage("");
    setShowPlusMenu(false);
    setIsAgentMenuOpen(false);
  };

  // Handle inserting deep research results into chat
  const handleInsertResearch = (content: string) => {
    if (activeChatId) {
      // Add research result as assistant message
      addMessage(activeChatId, {
        role: "assistant",
        content: content,
      });
      playSound("click");
    }
  };

  // Handle inserting web search results into chat
  const handleInsertWebSearch = (content: string) => {
    if (activeChatId) {
      addMessage(activeChatId, {
        role: "assistant",
        content: content,
      });
      playSound("click");
    }
  };

  // Toggle Canvas Mode - تفعيل/إيقاف وضع Canvas (Gemini Style)
  const handleToggleCanvasMode = (type: CanvasType = 'CODE') => {
    if (isModeActive && activeModeType === type) {
      disableMode();
    } else {
      enableMode(type);
    }
    setShowPlusMenu(false);
    playSound('click');
  };

  // Handle edit request from canvas message
  const handleCanvasEditRequest = (_messageId: string, _editPrompt: string, _selectedText?: string) => {
    // Here you would call your AI API to edit the canvas content
    // For now, this is a placeholder
    
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Create new chat
  const _handleCreateChat = () => {
    // Close any open modals
    closeCreateModal();
    closeQuickSwitcher();
    closeSettings();
    setIsTopMenuOpen(false);
    setShowPlusMenu(false);

    if (activeProjectId) {
      const newChat = createChat(activeProjectId, "محادثة جديدة");
      setActiveChat(newChat.id);
      playSound("click");
    }
  };

  // Delete current chat
  const _handleDeleteChat = () => {
    if (!activeChatId) return;
    deleteChat(activeChatId);
    setActiveChat(null);
    setIsTopMenuOpen(false);
  };

  // Share chat to social media
  const _shareCurrentChat = (channel: "whatsapp" | "email" | "twitter" | "instagram") => {
    if (!activeChatId || !conversationLink) return;
    const text = `مشاركة محادثة #${activeChatId}`;

    const openWindow = (url: string) => {
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    };

    switch (channel) {
      case "whatsapp":
        openWindow(`https://wa.me/?text=${encodeURIComponent(`${text}\n${conversationLink}`)}`);
        break;
      case "email":
        openWindow(`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(conversationLink)}`);
        break;
      case "twitter":
        openWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${conversationLink}`)}`);
        break;
      case "instagram":
        openWindow(`https://www.instagram.com/?url=${encodeURIComponent(conversationLink)}`);
        break;
      default:
        break;
    }
    setIsTopMenuOpen(false);
  };

  const handleReportSubmit = () => {
    if (!reportText.trim() || !reportConsent) return;
    
    setReportText("");
    setReportConsent(false);
    setIsReportOpen(false);
    setIsTopMenuOpen(false);
  };

  const _closeCanvasMenu = () => {};

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative chat-container min-h-0">
      {/* Project Header أعلى منطقة الرسائل */}
      {activeProject && (
        <ProjectHeader />
      )}

      {/* Report dialog - Refined */}
      <AnimatePresence>
        {isReportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 theme-bg"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-3xl border border-white/[0.08] shadow-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-5 space-y-4 theme-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">الإبلاغ عن مشكلة</div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">سيتم إرفاق رابط المحادثة وبيانات حسابك تلقائياً</p>
                </div>
                <button onClick={() => setIsReportOpen(false)} className="p-2 rounded-2xl hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors">✕</button>
              </div>

              <div className="text-sm text-muted-foreground">رابط المحادثة: <span className="text-primary break-all">{conversationLink || "غير متوفر"}</span></div>

              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-border/50 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] p-3.5 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all resize-none"
                placeholder="اكتب الشكوى بالتفصيل..."
              />

              <label className="flex items-center gap-2.5 text-[13px] text-muted-foreground cursor-pointer select-none">
                <input type="checkbox" checked={reportConsent} onChange={(e) => setReportConsent(e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
                أوافق على أن يطّلع مسؤول النظام على محتوى المحادثة للتحقق
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setIsReportOpen(false)} className="btn-professional ghost px-4 py-2.5 rounded-2xl border border-border/50 dark:border-white/[0.08] text-[13px] font-medium hover:bg-muted/60 dark:hover:bg-white/[0.06] transition-colors">إلغاء</button>
                <button
                  onClick={handleReportSubmit}
                  disabled={!reportText.trim() || !reportConsent}
                  className={cn(
                    "btn-professional solid px-5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all",
                    reportText.trim() && reportConsent
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  )}
                >
                  إرسال البلاغ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area - Refined */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">ابدأ محادثة جديدة...</p>
          </div>
        ) : (
          messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              "flex gap-4 max-w-3xl mx-auto group",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}> 
              {/* Message Content */}
              <div
                className={cn(
                  "px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-lg"
                    : "bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] text-foreground rounded-3xl"
                )}
              >
                {msg.content}
              </div>

                  {/* Actions - Refined */}
                  <div className={cn(
                    "flex items-center gap-0.5 mt-2.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-0.5">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-primary transition-all text-[11px] font-medium" title="طلب صياغة أطول">
                          <Maximize2 className="w-4 h-4" />
                          <span>أطول</span>
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors text-[12px] font-semibold" title="طلب صياغة مختصرة">
                          <Minimize2 className="w-4 h-4" />
                          <span>أقصر</span>
                        </button>
                      </div>
                    )}
                    <button className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-amber-400 transition-all" title="مفضلة">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    {msg.role === "assistant" && (
                      <button className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all" title="إعادة توليد">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all" title="مشاركة">
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-destructive transition-all" title="حذف">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
            </div>
          </motion.div>
        ))
      )}
      </div>

      {/* Input Area - Professional - Fixed at bottom */}
      <div className="input-container mt-auto z-40 shrink-0">
        <div className="w-full">
          <div
            className={cn(
              "relative flex flex-col px-5 pt-5 pb-14 min-h-[140px] rounded-t-2xl border-t transition-all duration-300 bg-gradient-to-b from-white/[0.08] via-[#081820]/95 to-[#081820] backdrop-blur-2xl animate-shimmer",
              overlayActive
                ? "shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-white/[0.15]"
                : isModeActive 
                  ? "border-primary/40 shadow-[0_0_30px_rgba(13,148,136,0.1)]"
                  : "border-white/[0.08] hover:border-white/[0.12] focus-within:border-primary/30 focus-within:shadow-[0_0_30px_rgba(13,148,136,0.15)]"
            )}
          >

            {/* Overlays */}
            <AnimatePresence>
              {showPlusMenu && (
                <motion.div
                  key="plus-menu"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  drag="y"
                  dragElastic={{ top: 0, bottom: 0.22 }}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 40) setShowPlusMenu(false);
                  }}
                  ref={plusMenuRef}
                  className="absolute inset-0 rounded-t-2xl border-t border-white/[0.15] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] text-foreground z-50 p-6 flex items-center justify-center bg-gradient-to-b from-white/[0.08] via-[#081820]/95 to-[#081820] backdrop-blur-2xl animate-shimmer"
                >
                  <div className="flex items-center justify-center gap-3 w-full">
                    {[
                      { icon: Camera, label: "الكاميرا", action: () => {} },
                      { icon: Sparkles, label: "بحث تفصيلي", action: () => { setIsDeepResearchOpen(true); setShowPlusMenu(false); } },
                      { icon: Search, label: "البحث في الويب", action: () => { setIsWebSearchOpen(true); setShowPlusMenu(false); } },
                      { icon: Paperclip, label: "إرفاق ملف", action: () => {} },
                      { icon: Code2, label: "Canvas", action: () => { handleToggleCanvasMode('CODE'); setShowPlusMenu(false); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex flex-col items-center gap-2.5 px-4 py-3.5 rounded-3xl bg-muted/50 dark:bg-white/[0.04] border border-border/30 dark:border-white/[0.06] hover:border-primary/40 dark:hover:border-primary/30 hover:bg-muted/70 dark:hover:bg-white/[0.08] transition-all text-foreground group"
                      >
                        <item.icon className="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
                        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
</AnimatePresence>
<AnimatePresence>
  {isAgentMenuOpen && (
                <motion.div
                  key="agent-menu"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 140 }}
                  dragElastic={{ top: 0, bottom: 0.22 }}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 40) setIsAgentMenuOpen(false);
                  }}
                  ref={agentMenuRef}
                  className="absolute inset-0 rounded-t-2xl border-t border-white/[0.15] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] text-foreground z-50 p-6 flex items-center justify-center bg-gradient-to-b from-white/[0.08] via-[#081820]/95 to-[#081820] backdrop-blur-2xl animate-shimmer"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-3xl">
                    {[
                      { label: "الأيجنت العام", icon: Bot },
                      { label: "أيجنت التحليل الأساسي والأون تشين", icon: Database },
                      { label: "أيجنت التحليل الفني", icon: Activity },
                      { label: "معهد CCCWAYS التعليمي", icon: GraduationCap },
                    ].map((item) => (
                      <button
                        key={item.label}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-muted dark:bg-white/[0.05] border border-border dark:border-white/[0.08] hover:border-primary/40 hover:bg-muted/80 dark:hover:bg-white/[0.1] text-foreground transition-colors shadow-sm"
                        onClick={() => setIsAgentMenuOpen(false)}
                      >
                        <item.icon className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!overlayActive && (
              <>
                {/* Input Field - Refined */}
                <textarea
                  dir="rtl"
                  ref={inputRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={isModeActive ? "صف ما تريد إنشاءه في Canvas..." : "إسأل cccways"}
                  rows={3}
                  className={cn(
                    "w-full flex-1 min-h-[100px] max-h-[240px] py-3.5 px-4 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none appearance-none resize-none custom-scrollbar placeholder:text-muted-foreground/50 text-[15px] leading-[1.7] text-right placeholder:text-right text-foreground/90 font-normal transition-all",
                    isModeActive && "border-primary/20 bg-primary/[0.02]"
                  )}
                  style={{ height: "auto" }}
                />

                {/* Bottom actions pinned - Refined */}
                <div className="absolute inset-x-5 bottom-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      ref={plusButtonRef}
                      onClick={() => setShowPlusMenu((v) => !v)}
                      className="p-2.5 rounded-xl hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all"
                      title="المزيد"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    <button
                      ref={agentButtonRef}
                      onClick={() => {
                        setIsAgentMenuOpen((v) => !v);
                        setShowPlusMenu(false);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border/30 dark:border-white/[0.06] hover:border-primary/40 dark:hover:border-primary/30 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-all"
                    >
                      agent
                    </button>
                    
                    {/* Canvas Mode Badge - Gemini Style */}
                    <AnimatePresence>
                      {isModeActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary"
                        >
                          <Code2 className="w-4 h-4" />
                          <span className="text-[13px] font-medium">
                            Canvas
                          </span>
                          <button 
                            onClick={() => disableMode()}
                            className="ml-1 -mr-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all duration-200",
                        isRecording
                          ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30"
                          : "hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground"
                      )}
                      title="تحويل الصوت لنص"
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {!message.trim() && (
                      <button
                        className="p-2.5 rounded-xl hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all"
                        title="مكالمة مع الأيجنت"
                      >
                        <PhoneCall className="w-5 h-5" />
                      </button>
                    )}

                    {message.trim() && (
                      <button
                        onClick={handleSend}
                        className="p-2.5 rounded-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Deep Research Panel */}
      <DeepResearchPanel
        isOpen={isDeepResearchOpen}
        onClose={() => setIsDeepResearchOpen(false)}
        onInsertToChat={handleInsertResearch}
        userId="anonymous"
      />

      {/* Web Search Panel */}
      <WebSearchPanel
        isOpen={isWebSearchOpen}
        onClose={() => setIsWebSearchOpen(false)}
        onInsertToChat={handleInsertWebSearch}
      />
    </div>
  );
}

export default ChatArea;
