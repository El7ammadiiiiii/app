"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Send,
  Mic,
  MicOff,
  PhoneCall,
  MoreHorizontal,
  Copy,
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
  ChevronDown,
  Camera,
  Paperclip,
  Activity,
  Database,
  GitBranch,
  FolderKanban,
  MessageSquarePlus,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import { ProjectHeader, useConfetti } from "@/components/projects";
import { useSound } from "@/lib/sounds";
import { PROJECT_COLORS } from "@/types/project";
import { DeepResearchPanel } from "@/components/deep-research";
import { WebSearchPanel } from "@/components/web-search";
import { CanvasPanel } from "@/components/canvas/CanvasPanel";

// Types
interface CanvasNote {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  type: 'code' | 'design' | 'diagram' | 'text';
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  isCanvas?: boolean;
}

interface ChatAreaProps {
  activeAgent: "general" | "institute";
  onAgentChange: (agent: "general" | "institute") => void;
}

export function ChatArea({ activeAgent, onAgentChange }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showCanvasMenu, setShowCanvasMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isCanvasPanelOpen, setIsCanvasPanelOpen] = useState(false);
  const [isDeepResearchOpen, setIsDeepResearchOpen] = useState(false);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportConsent, setReportConsent] = useState(false);
  const overlayActive = showPlusMenu || isAgentMenuOpen;
  const [canvasNotes, setCanvasNotes] = useState<CanvasNote[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const agentButtonRef = useRef<HTMLButtonElement>(null);

  // Project Store Integration
  const {
    getActiveProject,
    getActiveChat,
    addMessage,
    createChat,
    createProject,
    getProjectChats,
    setActiveChat,
    deleteChat,
    activeProjectId,
    activeChatId,
    projects,
    closeCreateModal,
    closeQuickSwitcher,
    closeSettings,
  } = useProjectStore();
  const { playSound } = useSound();
  const { celebrate } = useConfetti();

  const activeProject = getActiveProject();
  const activeChat = getActiveChat();
  const projectColor = activeProject ? PROJECT_COLORS[activeProject.color] : null;
  const projectChats = activeProject ? getProjectChats(activeProject.id) : [];

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

  // استخدم الرسائل من المحادثة النشطة في Zustand
  const messages = activeChat?.messages || [];

  const handleSend = () => {
    if (!message.trim()) return;
    
    // إذا كان هناك مشروع ومحادثة نشطة، احفظ الرسالة في Store
    if (activeChatId) {
      addMessage(activeChatId, {
        role: "user",
        content: message.trim(),
      });
      playSound("click");
    }
    
    setMessage("");
    setShowPlusMenu(false);
    setIsAgentMenuOpen(false);
    closeCanvasMenu();
  };

  // Handle inserting deep research results into chat
  const handleInsertResearch = (content: string, researchData?: any) => {
    if (activeChatId) {
      // Add research result as assistant message
      addMessage(activeChatId, {
        role: "assistant",
        content: content,
        isResearch: true,
        researchData: researchData,
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

  const handleAddCanvasNote = () => {
    const baseText = message.trim() || "ملاحظة كانفاس جديدة";
    const nextId = canvasNotes.length + 1;
    setCanvasNotes((prev) => [
      ...prev,
      {
        id: `canvas-${nextId}`,
        title: `Canvas #${nextId}`,
        content: baseText,
        timestamp: new Date(),
        type: 'text' as const,
      },
    ]);
  };

  // Handle canvas creation from CanvasPanel
  const handleCanvasCreated = (canvas: CanvasNote) => {
    setCanvasNotes((prev) => [...prev, canvas]);
    setIsCanvasActive(true); // Show canvas menu after creation
    
    // Insert canvas content as assistant message
    if (activeChatId) {
      addMessage(activeChatId, {
        role: "assistant",
        content: canvas.content,
        isCanvas: true,
      });
      playSound("click");
    }
  };

  // Handle inserting canvas to chat
  const handleInsertCanvas = (content: string) => {
    if (activeChatId) {
      addMessage(activeChatId, {
        role: "assistant",
        content: content,
        isCanvas: true,
      });
      playSound("click");
    }
    setIsCanvasPanelOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateChat = () => {
    // Close any open modals
    closeCreateModal();
    closeQuickSwitcher();
    closeSettings();
    setIsTopMenuOpen(false);
    setShowPlusMenu(false);
    setIsAgentMenuOpen(false);
    
    let targetProjectId = activeProjectId || projects[0]?.id;
    
    // If no project exists, create a default one
    if (!targetProjectId) {
      const defaultProject = createProject({
        name: "محادثاتي",
        description: "محادثات عامة مع المساعد الذكي",
        color: "turquoise",
        emoji: "💬",
      });
      targetProjectId = defaultProject.id;
    }
    
    const newChat = createChat(targetProjectId, "محادثة جديدة");
    setActiveChat(newChat.id);
    playSound("click");
  };

  const handleDeleteChat = () => {
    if (!activeChatId) return;
    deleteChat(activeChatId);
    setActiveChat(null);
    setIsTopMenuOpen(false);
  };

  const shareCurrentChat = (channel: "whatsapp" | "email" | "twitter" | "instagram") => {
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
    console.info("Report submitted", {
      chatId: activeChatId,
      link: conversationLink,
      message: reportText,
      consent: reportConsent,
    });
    setReportText("");
    setReportConsent(false);
    setIsReportOpen(false);
    setIsTopMenuOpen(false);
  };

  const toggleCanvasMenu = () => setShowCanvasMenu((v) => !v);

  const closeCanvasMenu = () => setShowCanvasMenu(false);

  return (
    <div className="flex flex-col h-full relative">
      {/* Project Header أعلى منطقة الرسائل */}
      {activeProject && (
        <ProjectHeader />
      )}

      {/* Top bar with new chat button and actions */}
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* More Options Button (three dots) */}
          <button
            onClick={() => setIsTopMenuOpen((v) => !v)}
            className="h-9 w-9 rounded-full border border-border bg-background/60 hover:border-primary/50 flex items-center justify-center transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Canvas Menu Button - Only shows when canvas is active */}
          {(isCanvasActive || canvasNotes.length > 0) && (
            <motion.button
              onClick={() => setIsCanvasPanelOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors relative"
              title="Canvas"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">Canvas</span>
              {canvasNotes.length > 0 && (
                <span className="w-5 h-5 bg-purple-500/20 text-purple-500 text-xs font-semibold rounded-full flex items-center justify-center">
                  {canvasNotes.length}
                </span>
              )}
            </motion.button>
          )}
        </div>

        {/* CCCWAYS Logo - Center */}
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xl font-bold tracking-widest dark:text-gray-400 light:text-black normal:text-gray-500"
            dir="ltr"
          >
            CCCWAYS
          </motion.span>
        </div>

        <div className="flex items-center gap-3">
          {/* New Chat Icon Button - Same style as three dots */}
          <motion.button
            onClick={handleCreateChat}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-9 w-9 rounded-full border border-border bg-background/60 hover:border-primary/50 flex items-center justify-center transition-colors"
            title="محادثة جديدة"
          >
            <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        <AnimatePresence>
          {isTopMenuOpen && (
            <motion.div
              ref={topMenuRef}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-full mt-2 right-4 min-w-[220px] rounded-xl border border-border bg-card shadow-xl p-2"
            >
              <div className="text-xs text-muted-foreground px-2 py-1">مشاركة</div>
              <div className="grid grid-cols-2 gap-2 px-2">
                <button onClick={() => shareCurrentChat("whatsapp")} className="px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-sm">واتساب</button>
                <button onClick={() => shareCurrentChat("email")} className="px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-sm">بريد</button>
                <button onClick={() => shareCurrentChat("twitter")} className="px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-sm">تويتر</button>
                <button onClick={() => shareCurrentChat("instagram")} className="px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-sm">إنستاغرام</button>
              </div>

              <div className="border-t border-border/70 my-2" />

              <button
                onClick={handleDeleteChat}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm"
              >
                <Trash2 className="w-4 h-4" />
                حذف المحادثة
              </button>

              <button
                onClick={() => setIsReportOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-500/10 text-amber-500 text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                الإبلاغ عن مشكلة
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report dialog */}
      <AnimatePresence>
        {isReportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-card border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">الإبلاغ عن مشكلة</div>
                  <p className="text-xs text-muted-foreground">سيتم إرفاق رابط المحادثة وبيانات حسابك تلقائياً</p>
                </div>
                <button onClick={() => setIsReportOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="text-sm text-muted-foreground">رابط المحادثة: <span className="text-primary break-all">{conversationLink || "غير متوفر"}</span></div>

              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-muted/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="اكتب الشكوى بالتفصيل..."
              />

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={reportConsent} onChange={(e) => setReportConsent(e.target.checked)} />
                أوافق على أن يطّلع مسؤول النظام على محتوى المحادثة للتحقق
              </label>

              <div className="flex justify-end gap-2">
                <button onClick={() => setIsReportOpen(false)} className="px-3 py-2 rounded-lg border border-border text-sm">إلغاء</button>
                <button
                  onClick={handleReportSubmit}
                  disabled={!reportText.trim() || !reportConsent}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm",
                    reportText.trim() && reportConsent
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  إرسال البلاغ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4 max-w-3xl mx-auto group",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}> 
              {/* Message Bubble */}
              <div className={cn(
                "relative p-5 rounded-2xl w-full transition-shadow",
                msg.role === "assistant"
                  ? "bg-card border border-border rounded-tl-none shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:bg-[rgba(11,14,17,0.75)] dark:backdrop-blur-xl dark:border-white/[0.08] dark:shadow-[0_8px_32px_rgba(0,0,0,0.37)]"
                  : "bg-primary/10 border border-primary/20 rounded-tr-none dark:bg-primary/15 dark:border-primary/30"
              )}>
                {/* Content */}
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed whitespace-pre-wrap font-medium text-foreground">
                  {msg.content}
                </div>
              </div>

              {/* Actions */}
              <div className={cn(
                "flex items-center gap-1 mt-2 px-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1">
                    <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors text-[12px] font-semibold" title="طلب صياغة أطول">
                      <Maximize2 className="w-4 h-4" />
                      <span>أطول</span>
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors text-[12px] font-semibold" title="طلب صياغة مختصرة">
                      <Minimize2 className="w-4 h-4" />
                      <span>أقصر</span>
                    </button>
                  </div>
                )}
                <button className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-yellow-400 transition-colors" title="مفضلة">
                  <Star className="w-4 h-4" />
                </button>
                {msg.role === "assistant" && (
                  <button className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="إعادة توليد">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="مشاركة">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-destructive transition-colors" title="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-0 z-20">
        <div className="w-full">
          <div
            className={cn(
              "relative flex flex-col px-4 pt-4 pb-12 min-h-[110px] rounded-t-[32px] rounded-b-none border border-b-0 transition-all duration-300",
              overlayActive
                ? "bg-card shadow-[0_-4px_16px_rgba(0,0,0,0.06)] border-border dark:bg-[rgba(11,14,17,0.85)] dark:backdrop-blur-xl dark:border-white/[0.08] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.3)]"
                : "bg-muted/30 border-border/50 hover:shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:bg-[rgba(11,14,17,0.6)] dark:backdrop-blur-lg dark:border-white/[0.05] focus-within:bg-card dark:focus-within:bg-[rgba(11,14,17,0.85)] hover:border-border dark:hover:border-white/[0.08] focus-within:border-primary/30"
            )}
          >

            {/* Overlays */}
            <AnimatePresence>
              {showPlusMenu && (
                <motion.div
                  key="plus-menu"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 140 }}
                  dragElastic={{ top: 0, bottom: 0.22 }}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 40) setShowPlusMenu(false);
                  }}
                  ref={plusMenuRef}
                  className="absolute -top-7 inset-x-[-12px] rounded-[24px] bg-card border border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-foreground z-40 p-5 min-h-[180px] h-[200px] flex items-center justify-center dark:bg-[rgba(11,14,17,0.9)] dark:backdrop-blur-2xl dark:border-white/[0.1] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-center justify-center gap-3 w-full">
                    {[
                      { icon: Camera, label: "الكاميرا", action: () => {} },
                      { icon: Sparkles, label: "بحث تفصيلي", action: () => { setIsDeepResearchOpen(true); setShowPlusMenu(false); } },
                      { icon: Search, label: "البحث في الويب", action: () => { setIsWebSearchOpen(true); setShowPlusMenu(false); } },
                      { icon: Paperclip, label: "إرفاق ملف", action: () => {} },
                      { icon: Bot, label: "canvas", action: () => { setIsCanvasPanelOpen(true); setShowPlusMenu(false); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-muted dark:bg-white/[0.05] border border-border dark:border-white/[0.08] hover:border-primary/50 dark:hover:border-primary/40 hover:bg-muted/80 dark:hover:bg-white/[0.1] transition-colors text-foreground"
                      >
                        <item.icon className="w-6 h-6 text-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 140 }}
                  dragElastic={{ top: 0, bottom: 0.22 }}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 40) setIsAgentMenuOpen(false);
                  }}
                  ref={agentMenuRef}
                  className="absolute -top-7 inset-x-[-12px] rounded-[24px] bg-card border border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-foreground z-40 p-5 min-h-[180px] h-[200px] flex items-center justify-center dark:bg-[rgba(11,14,17,0.9)] dark:backdrop-blur-2xl dark:border-white/[0.1] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
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
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted dark:bg-white/[0.05] border border-border dark:border-white/[0.08] hover:border-primary/40 hover:bg-muted/80 dark:hover:bg-white/[0.1] text-foreground transition-colors shadow-sm"
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

            {/* Input Field - fills area from فوق زر + إلى أسفل الصندوق */}
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
              placeholder="إسأل cccways"
              rows={3}
              className="w-full flex-1 min-h-[100px] max-h-[240px] py-3 px-3 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none appearance-none resize-none custom-scrollbar placeholder:text-muted-foreground text-base leading-relaxed text-right placeholder:text-right text-foreground"
              style={{ height: "auto" }}
            />

            {/* Bottom actions pinned */}
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  ref={plusButtonRef}
                  onClick={() => setShowPlusMenu((v) => !v)}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="المزيد"
                >
                  <Plus className="w-5 h-5" />
                </button>

                <button
                  ref={agentButtonRef}
                  onClick={() => {
                    setIsAgentMenuOpen((v) => !v);
                    setShowPlusMenu(false);
                    closeCanvasMenu();
                  }}
                  className="px-3 py-2 rounded-xl bg-muted border border-border hover:border-primary/50 text-sm font-semibold text-foreground transition-colors"
                >
                  agent
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "p-2 rounded-xl transition-all duration-200",
                    isRecording
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title="تحويل الصوت لنص"
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {!message.trim() && (
                  <button
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="مكالمة مع الأيجنت"
                  >
                    <PhoneCall className="w-5 h-5" />
                  </button>
                )}

                {message.trim() && (
                  <button
                    onClick={handleSend}
                    className="p-2 rounded-xl transition-all duration-200 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
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

      {/* Canvas Panel */}
      <CanvasPanel
        isOpen={isCanvasPanelOpen}
        onClose={() => setIsCanvasPanelOpen(false)}
        onInsertToChat={handleInsertCanvas}
        onCanvasCreated={handleCanvasCreated}
      />
    </div>
  );
}
