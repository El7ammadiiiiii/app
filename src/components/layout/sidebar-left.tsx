"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTheme } from "next-themes";
import {
  User,
  Star,
  Bookmark,
  FolderKanban,
  GraduationCap,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  Plus,
  Crown,
  Sparkles,
  History,
  Search,
  Menu,
  X,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Pin,
  MoreHorizontal,
  Archive,
  Award,
  Command,
  Coffee,
  Flower2,
  Eclipse,
  Trash2,
  Share2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS } from "@/types/project";
import { ProjectCard, ProjectChatList } from "@/components/projects";
import { useSound } from "@/lib/sounds";
import { ArchivePanel } from "@/components/archive";
import { ShareModal } from "@/components/share";

// Types
interface ShareState {
  isOpen: boolean;
  id: string;
  title: string;
  type: "chat" | "project";
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { id: string; label: string; icon?: React.ReactNode }[];
}

interface SidebarLeftProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onOpenSettings?: () => void;
}

export function SidebarLeft({ isOpen, onToggle, isMobile = false, onOpenSettings }: SidebarLeftProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(["projects", "conversations"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [shareModal, setShareModal] = useState<ShareState>({ isOpen: false, id: "", title: "", type: "chat" });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { playSound } = useSound();

  // Close menu when clicking anywhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };
    // Use click instead of mousedown to close on any click
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  // Close the entire sidebar when user clicks anywhere outside it (desktop & mobile)
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        onToggle();
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [isOpen, onToggle]);

  // Project Store
  const {
    projects,
    activeProjectId,
    setActiveProject,
    getFilteredProjects,
    getPinnedProjects,
    openCreateModal,
    closeCreateModal,
    openQuickSwitcher,
    closeQuickSwitcher,
    getProjectChats,
    createProject,
    closeSettings,
    deleteProject,
    updateProject,
    archiveProject,
  } = useProjectStore();

  const filteredProjects = getFilteredProjects();
  const pinnedProjects = getPinnedProjects();
  const activeProject = projects.find(p => p.id === activeProjectId);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Get all chats for conversations list
  const allChats = useProjectStore((state) => state.chats);
  const createChat = useProjectStore((state) => state.createChat);
  const setActiveChat = useProjectStore((state) => state.setActiveChat);
  const activeChatId = useProjectStore((state) => state.activeChatId);
  const deleteChat = useProjectStore((state) => state.deleteChat);
  const updateChat = useProjectStore((state) => state.updateChat);

  // Menu actions
  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setOpenMenuId(null);
    playSound("click");
  };

  const handleArchiveProject = (projectId: string) => {
    archiveProject(projectId);
    setOpenMenuId(null);
    playSound("click");
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    updateProject(projectId, { name: newName });
    setEditingId(null);
    setEditingName("");
    playSound("click");
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
    setOpenMenuId(null);
    playSound("click");
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    updateChat(chatId, { title: newTitle });
    setEditingId(null);
    setEditingName("");
    playSound("click");
  };

  const handleShare = (id: string, title: string, type: "chat" | "project") => {
    setShareModal({
      isOpen: true,
      id,
      title,
      type,
    });
    setOpenMenuId(null);
    playSound("click");
  };

  // Static sidebar items (non-project items)
  const staticItems: SidebarItem[] = [
    {
      id: "favorites",
      label: "المفضلة",
      icon: <Star className="w-5 h-5" />,
      badge: projects.filter(p => p.isFavorite).length || undefined,
    },
    {
      id: "institute",
      label: "معهد CCCWAYS",
      icon: <GraduationCap className="w-5 h-5" />,
      children: [
        { id: "edu-chats", label: "المحادثات التعليمية" },
        { id: "certificates", label: "شهاداتي" },
      ],
    },
  ];

  // Handle new chat creation
  const handleNewChat = () => {
    // Close any open modals
    closeCreateModal();
    closeQuickSwitcher();
    closeSettings();
    setIsArchiveOpen(false);
    
    // Create a new chat in the active project or first project
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
    
    // Close sidebar on mobile
    if (isMobile && onToggle) {
      onToggle();
    }
    
    playSound("click");
  };

  const sidebarVariants: Variants = {
    open: {
      width: isMobile ? 280 : 280,
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 400, damping: 35 },
    },
    closed: {
      width: 0,
      opacity: 0,
      x: 280,
      transition: { type: "spring", stiffness: 400, damping: 35 },
    },
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        variants={sidebarVariants}
        initial={false}
        animate={isOpen ? "open" : "closed"}
        className={cn(
          "fixed right-0 z-50",
          "flex flex-col",
          "sidebar-professional",
          "bg-white/5 backdrop-blur-xl border-l border-white/10",
          "shadow-[-4px_0_32px_rgba(0,0,0,0.4)]",
          // Mobile: full height from top, Desktop: below header
          isMobile ? "top-0 h-full bg-[#051014] border-l-0" : "top-[65px] h-[calc(100vh-65px)]"
        )}
      >
        {/* Header - Refined */}
        <div className="flex items-center justify-between p-5 border-b border-border/20 dark:border-white/[0.04]">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/15 dark:to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                  <Crown className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm tracking-wide text-foreground">CCCWAYS</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <X className="w-4.5 h-4.5" />
          </motion.button>
        </div>

        {/* New Chat Button - Professional */}
        <div className="px-3 py-3">
          <motion.button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                     bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/5
                     border border-primary/20 dark:border-primary/15
                     hover:from-primary/15 hover:to-primary/10 dark:hover:from-primary/20 dark:hover:to-primary/10
                     text-primary font-medium transition-all duration-300 text-sm
                     shadow-sm shadow-primary/5"
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            <span>دردشة جديدة</span>
          </motion.button>
        </div>

        {/* Search - Refined */}
        <div className="px-3 py-2">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors" />
            <input
              type="text"
              placeholder="البحث في الدردشات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl 
                       bg-muted/20 dark:bg-white/[0.03] 
                       border border-border/30 dark:border-white/[0.06] 
                       text-sm text-foreground 
                       focus:outline-none focus:border-primary/30 focus:bg-muted/30 dark:focus:bg-white/[0.05]
                       placeholder:text-muted-foreground/40 
                       transition-all duration-200"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent dark:via-white/[0.06]" />

        {/* Navigation - Professional */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 custom-scrollbar">
          
          {/* 1. Section: المشروعات */}
          <div className="section-header flex items-center justify-between px-2 py-2 mb-1">
            <span className="section-title text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/60">المشروعات</span>
            <motion.button
              onClick={() => {
                openCreateModal();
                playSound("click");
              }}
              className="p-1 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/50 hover:text-primary transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Projects List */}
          <div className="space-y-0.5">
            {projects.filter(p => !p.isArchived).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground/50">
                <p className="text-xs">لا توجد مشروعات</p>
              </div>
            ) : (
              projects
                .filter(p => !p.isArchived)
                .map((project) => (
                  <div key={project.id} className="relative group">
                    {editingId === `project-${project.id}` ? (
                      <div className="flex items-center gap-2 py-2 px-3">
                        <span className="text-base">{project.emoji || "📁"}</span>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameProject(project.id, editingName);
                            if (e.key === "Escape") { setEditingId(null); setEditingName(""); }
                          }}
                          onBlur={() => handleRenameProject(project.id, editingName)}
                          className="flex-1 bg-muted/30 dark:bg-white/[0.05] border border-border/50 dark:border-white/[0.08] rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-primary/40"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <motion.button
                        onClick={() => {
                          setActiveProject(project.id);
                          if (isMobile && onToggle) onToggle();
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 py-2 px-3 rounded-xl text-sm transition-all duration-200 text-right",
                          activeProjectId === project.id
                            ? "bg-primary/8 dark:bg-primary/12 text-foreground border border-primary/15 dark:border-primary/20 shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] hover:text-foreground border border-transparent"
                        )}
                      >
                        <span className="text-base">{project.emoji || "📁"}</span>
                        <span className="truncate flex-1 font-medium">{project.name}</span>
                        <motion.div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === `project-${project.id}` ? null : `project-${project.id}`);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted/60 dark:hover:bg-white/[0.08] transition-all"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </motion.div>
                      </motion.button>
                    )}
                    
                    {/* Dropdown Menu - Refined */}
                    <AnimatePresence>
                      {openMenuId === `project-${project.id}` && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="dropdown-refined absolute left-0 top-full mt-1.5 z-50 border border-white/[0.08] rounded-xl shadow-lg shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-1 min-w-[160px] theme-dropdown"
                        >
                          <button
                            onClick={() => {
                              setEditingId(`project-${project.id}`);
                              setEditingName(project.name);
                              setOpenMenuId(null);
                            }}
                            className="dropdown-item w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/60 dark:hover:bg-white/[0.06] hover:text-foreground rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>إعادة تسمية</span>
                          </button>
                          <button
                            onClick={() => handleShare(project.id, project.name, "project")}
                            className="dropdown-item w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/60 dark:hover:bg-white/[0.06] hover:text-foreground rounded-lg transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>مشاركة</span>
                          </button>
                          <button
                            onClick={() => handleArchiveProject(project.id)}
                            className="dropdown-item w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/60 dark:hover:bg-white/[0.06] hover:text-foreground rounded-lg transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>أرشفة</span>
                          </button>
                          <div className="dropdown-divider h-px bg-border/40 dark:bg-white/[0.06] my-1 mx-2" />
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="dropdown-item w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
            )}
          </div>

          {/* Divider */}
          <div className="my-4 mx-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent dark:via-white/[0.05]" />

          {/* 2. المفضلة */}
          <motion.button
            onClick={() => toggleExpand("favorites")}
            className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] hover:text-foreground transition-all duration-200"
          >
            <Star className="w-4 h-4 opacity-50" />
            <span className="font-medium">المفضلة</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 mr-auto transition-transform duration-200",
              expandedItems.includes("favorites") && "rotate-180"
            )} />
          </motion.button>

          {/* Favorites Submenu */}
          <AnimatePresence>
            {expandedItems.includes("favorites") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mr-4 space-y-0.5"
              >
                <div className="text-center py-2 text-muted-foreground/50 text-xs">
                  لا توجد عناصر مفضلة
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="my-3 h-px bg-border/30" />

          {/* 4. معهد CCCWAYS */}
          <motion.button
            onClick={() => toggleExpand("cccways-institute")}
            className="w-full flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <GraduationCap className="w-4 h-4 opacity-60" />
            <span>معهد CCCWAYS</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 mr-auto transition-transform",
              expandedItems.includes("cccways-institute") && "rotate-180"
            )} />
          </motion.button>

          {/* CCCWAYS Institute Submenu */}
          <AnimatePresence>
            {expandedItems.includes("cccways-institute") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mr-4 space-y-0.5"
              >
                {/* شهاداتي */}
                <motion.button
                  className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Award className="w-3.5 h-3.5 opacity-60" />
                  <span>شهاداتي</span>
                </motion.button>

                {/* محادثات المعهد */}
                <motion.button
                  onClick={() => toggleExpand("institute-chats")}
                  className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 opacity-60" />
                  <span>محادثات المعهد</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 mr-auto transition-transform",
                    expandedItems.includes("institute-chats") && "rotate-180"
                  )} />
                </motion.button>

                {/* Institute Chats List */}
                <AnimatePresence>
                  {expandedItems.includes("institute-chats") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mr-4 space-y-0.5"
                    >
                      <div className="text-center py-2 text-muted-foreground/50 text-xs">
                        لا توجد محادثات بعد
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="my-3 h-px bg-border/30" />

          {/* 5. المحادثات السابقة */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground/70">المحادثات السابقة</span>
            <motion.button
              onClick={handleNewChat}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground"
              whileTap={{ scale: 0.95 }}
              title="محادثة جديدة"
            >
              <Plus className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Conversations List */}
          <div className="space-y-0.5">
            {allChats.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground/60">
                <p className="text-xs">لا توجد محادثات بعد</p>
              </div>
            ) : (
              allChats
                .filter(chat => 
                  !searchQuery || 
                  chat.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 30)
                .map((chat) => (
                  <div key={chat.id} className="relative group">
                    {editingId === `chat-${chat.id}` ? (
                      <div className="flex items-center gap-2 py-2 px-2.5">
                        <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameChat(chat.id, editingName);
                            if (e.key === "Escape") { setEditingId(null); setEditingName(""); }
                          }}
                          onBlur={() => handleRenameChat(chat.id, editingName)}
                          className="flex-1 bg-muted/50 border border-border rounded px-2 py-0.5 text-sm focus:outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <motion.button
                        onClick={() => {
                          setActiveChat(chat.id);
                          setActiveProject(chat.projectId);
                          if (isMobile && onToggle) onToggle();
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm transition-colors text-right",
                          activeChatId === chat.id
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                        <span className="truncate flex-1">{chat.title}</span>
                        <motion.div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === `chat-${chat.id}` ? null : `chat-${chat.id}`);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </motion.div>
                      </motion.button>
                    )}
                    
                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {openMenuId === `chat-${chat.id}` && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
                        >
                          <button
                            onClick={() => {
                              setEditingId(`chat-${chat.id}`);
                              setEditingName(chat.title);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>إعادة تسمية</span>
                          </button>
                          <button
                            onClick={() => handleShare(chat.id, chat.title, "chat")}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>مشاركة</span>
                          </button>
                          <button
                            onClick={() => {
                              // Archive chat - TODO: implement archiveChat
                              setOpenMenuId(null);
                              playSound("click");
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>أرشفة</span>
                          </button>
                          <div className="h-px bg-border my-1" />
                          <button
                            onClick={() => handleDeleteChat(chat.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
            )}
          </div>

        </div>

        {/* Modern Footer */}
        <ModernFooter isOpen={isOpen} onOpenSettings={onOpenSettings} />
      </motion.aside>

      {/* Archive Panel */}
      <ArchivePanel
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        userId="anonymous"
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, id: "", title: "", type: "chat" })}
        title={shareModal.type === "chat" ? "مشاركة المحادثة" : "مشاركة المشروع"}
        shareUrl={`https://cccways.com/share/${shareModal.type}/${shareModal.id}`}
        shareText={shareModal.title}
        type={shareModal.type}
      />
    </>
  );
}

// Modern Footer Component
function ModernFooter({ isOpen, onOpenSettings }: { isOpen: boolean; onOpenSettings?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { id: "light", icon: Sun, label: "فاتح" },
    { id: "normal", icon: Monitor, label: "عادي" },
    { id: "dark", icon: Moon, label: "داكن" },
  ];

  if (!isOpen) {
    // Collapsed state - minimal icons
    return (
      <div className="p-3 border-t border-white/[0.06] flex flex-col items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className="relative group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 
                        flex items-center justify-center text-white text-sm font-bold shadow-lg 
                        shadow-emerald-500/25 ring-2 ring-white/10">
            A
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full 
                        border-2 border-background" />
        </motion.div>
        
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          transition={{ duration: 0.3 }}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground 
                   hover:bg-white/[0.05] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-3 border-t border-white/[0.06]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glassmorphism Card */}
      <motion.div
        animate={{ 
          boxShadow: isHovered 
            ? "0 8px 32px rgba(16, 185, 129, 0.15)" 
            : "0 4px 16px rgba(0, 0, 0, 0.1)"
        }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-3 theme-card"
      >
        {/* Animated Background Gradient */}
        <motion.div
          animate={{ 
            opacity: isHovered ? 0.15 : 0.05,
            scale: isHovered ? 1.2 : 1
          }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 blur-2xl"
        />

        {/* Content */}
        <div className="relative z-10 space-y-3">
          {/* User Row */}
          <div className="flex items-center gap-3">
            {/* Avatar with Status */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative shrink-0"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 
                            flex items-center justify-center text-white font-bold text-base
                            shadow-lg shadow-emerald-500/30 ring-2 ring-white/20">
                A
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full 
                          border-2 border-background shadow-lg shadow-emerald-400/50"
              />
            </motion.div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground truncate">Ahmed Ali</span>
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </div>
              <div className="text-[11px] text-muted-foreground/70 truncate">ahmed@cccways.com</div>
            </div>

            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground 
                       hover:bg-white/[0.08] transition-all"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Theme Switcher - Pill Style */}
          {typeof window !== "undefined" ? (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
              {themes.map((t) => (
                <motion.button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all",
                    theme === t.id
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 shadow-inner"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </motion.button>
              ))}
            </div>
          ) : null}

          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.01, x: -2 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl
                     bg-red-500/10 border border-red-500/20 text-red-400 
                     hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300
                     transition-all text-sm font-medium group"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>تسجيل الخروج</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
