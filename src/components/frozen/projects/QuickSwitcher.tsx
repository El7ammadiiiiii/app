"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FolderKanban, MessageSquare, Command, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS } from "@/types/project";
import { useSound } from "@/lib/sounds";

export function QuickSwitcher() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isQuickSwitcherOpen,
    closeQuickSwitcher,
    projects,
    chats,
    setActiveProject,
    setActiveChat,
  } = useProjectStore();
  const { playSound } = useSound();

  // البحث في المشاريع والمحادثات
  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      // إظهار أحدث المشاريع والمحادثات
      const recentProjects = [...projects]
        .filter((p) => !p.isArchived)
        .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
        .slice(0, 5)
        .map((p) => ({ type: "project" as const, item: p }));

      const recentChats = [...chats]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map((c) => ({ type: "chat" as const, item: c }));

      return [...recentProjects, ...recentChats];
    }

    // البحث
    const matchedProjects = projects
      .filter(
        (p) =>
          !p.isArchived &&
          (p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query))
      )
      .map((p) => ({ type: "project" as const, item: p }));

    const matchedChats = chats
      .filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.messages.some((m) => m.content.toLowerCase().includes(query))
      )
      .map((c) => ({ type: "chat" as const, item: c }));

    return [...matchedProjects, ...matchedChats].slice(0, 10);
  }, [searchQuery, projects, chats]);

  // إعادة تعيين الفهرس عند تغير النتائج
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  // التركيز على حقل البحث عند الفتح
  useEffect(() => {
    if (isQuickSwitcherOpen) {
      inputRef.current?.focus();
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isQuickSwitcherOpen]);

  // معالجة لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuickSwitcherOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          handleSelect(selectedIndex);
          break;
        case "Escape":
          e.preventDefault();
          closeQuickSwitcher();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuickSwitcherOpen, selectedIndex, searchResults, closeQuickSwitcher]);

  // تحديد عنصر
  const handleSelect = (index: number) => {
    const result = searchResults[index];
    if (!result) return;

    if (result.type === "project") {
      setActiveProject(result.item.id);
      setActiveChat(null);
    } else {
      const project = projects.find((p) => p.id === result.item.projectId);
      if (project) {
        setActiveProject(project.id);
      }
      setActiveChat(result.item.id);
    }

    playSound("click");
    closeQuickSwitcher();
  };

  // الحصول على اسم المشروع للمحادثة
  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || "";
  };

  return (
    <AnimatePresence>
      {isQuickSwitcherOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuickSwitcher}
            className="fixed inset-0 overlay-backdrop z-50"
          />

          {/* Switcher */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 w-[90%] max-w-xl 
                       overlay-modal rounded-2xl z-50 overflow-hidden"
          >
            {/* حقل البحث */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search size={20} className="text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في المشاريع والمحادثات..."
                className="flex-1 bg-transparent outline-none text-lg"
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd>
              </div>
            </div>

            {/* النتائج */}
            <div className="max-h-[400px] overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {/* عنوان القسم */}
                  {!searchQuery && (
                    <p className="text-xs text-muted-foreground px-3 py-2">الأخيرة</p>
                  )}

                  {/* العناصر */}
                  {searchResults.map((result, index) => (
                    <motion.button
                      key={`${result.type}-${result.item.id}`}
                      onClick={() => handleSelect(index)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors
                        ${selectedIndex === index ? "bg-accent" : "hover:bg-accent/50"}
                      `}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      {result.type === "project" ? (
                        <>
                          {/* أيقونة المشروع */}
                          <div
                            className={`
                              w-10 h-10 rounded-xl flex items-center justify-center text-xl
                              ${PROJECT_COLORS[result.item.color].bg}/20
                            `}
                          >
                            {result.item.emoji}
                          </div>
                          <div className="flex-1 text-right">
                            <p className="font-medium">{result.item.name}</p>
                            {result.item.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {result.item.description}
                              </p>
                            )}
                          </div>
                          <FolderKanban size={16} className="text-muted-foreground" />
                        </>
                      ) : (
                        <>
                          {/* أيقونة المحادثة */}
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <MessageSquare size={18} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 text-right">
                            <p className="font-medium">{result.item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {getProjectName(result.item.projectId)}
                            </p>
                          </div>
                          <MessageSquare size={16} className="text-muted-foreground" />
                        </>
                      )}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="mx-auto h-10 w-10 opacity-50 mb-3" />
                  <p>لا توجد نتائج</p>
                </div>
              )}
            </div>

            {/* تلميحات لوحة المفاتيح */}
            <div className="flex items-center justify-center gap-4 p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <ArrowUp size={14} />
                <ArrowDown size={14} />
                <span>للتنقل</span>
              </div>
              <div className="flex items-center gap-1">
                <CornerDownLeft size={14} />
                <span>للاختيار</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted">Ctrl</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-muted">K</kbd>
                <span>للفتح/الإغلاق</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
