"use client";

import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  Settings, 
  MoreHorizontal,
  FileText,
  MessageSquare,
  Info
} from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS } from "@/types/project";
import { EmojiDisplay } from "./EmojiPicker";

export function ProjectHeader() {
  const [showInfo, setShowInfo] = useState(false);
  
  const { 
    getActiveProject, 
    setActiveProject, 
    openSettings,
    getProjectChats,
    getProjectFiles
  } = useProjectStore();
  
  const project = getActiveProject();
  
  if (!project) return null;

  const colorClasses = PROJECT_COLORS[project.color];
  const chats = getProjectChats(project.id);
  const files = getProjectFiles(project.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* شريط اللون */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colorClasses.bg}`} />

      <div className="flex items-center justify-between p-4 pt-5 border-b border-border theme-card/50">
        {/* معلومات المشروع */}
        <div className="flex items-center gap-3">
          {/* زر العودة */}
          <motion.button
            onClick={() => setActiveProject(null)}
            className="p-2 rounded-2xl hover:bg-accent transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} />
          </motion.button>

          {/* الإيموجي والاسم */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowInfo(!showInfo)}
          >
            <div className={`
              w-10 h-10 rounded-2xl ${colorClasses.bg}/20 
              flex items-center justify-center
            `}>
              <EmojiDisplay emoji={project.emoji} size="md" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{project.name}</h2>
              {project.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* الإحصائيات والأزرار */}
        <div className="flex items-center gap-3">
          {/* إحصائيات */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={14} />
              <span>{chats.length}</span>
            </div>
            {files.length > 0 && (
              <div className="flex items-center gap-1.5">
                <FileText size={14} />
                <span>{files.length}</span>
              </div>
            )}
          </div>

          {/* زر المعلومات */}
          <motion.button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-2xl transition-colors ${showInfo ? "bg-accent" : "hover:bg-accent"}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Info size={18} />
          </motion.button>

          {/* زر الإعدادات */}
          <motion.button
            onClick={openSettings}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </div>

      {/* لوحة المعلومات */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-border bg-muted/30 overflow-hidden"
        >
          <div className="p-4 space-y-4">
            {/* التعليمات */}
            {project.instructions && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Settings size={14} />
                  تعليمات المشروع
                </h4>
                <p className={`text-sm p-3 rounded-lg ${colorClasses.bg}/10 ${colorClasses.border} border`}>
                  {project.instructions}
                </p>
              </div>
            )}

            {/* معلومات إضافية */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">تاريخ الإنشاء</span>
                <p className="font-medium">
                  {new Date(project.createdAt).toLocaleDateString("ar")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">آخر تحديث</span>
                <p className="font-medium">
                  {new Date(project.updatedAt).toLocaleDateString("ar")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">المحادثات</span>
                <p className="font-medium">{chats.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">الملفات</span>
                <p className="font-medium">{files.length}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
