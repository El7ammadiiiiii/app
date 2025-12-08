"use client";

import { motion } from "framer-motion";
import { 
  MoreHorizontal, 
  Pin, 
  Star, 
  Archive, 
  Copy, 
  Trash2, 
  MessageSquare, 
  FileText,
  Settings
} from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS, type Project } from "@/types/project";
import { useSound } from "@/lib/sounds";

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  isCompact?: boolean;
  onSelect?: () => void;
}

export function ProjectCard({ project, isActive, isCompact, onSelect }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { 
    setActiveProject, 
    pinProject, 
    favoriteProject, 
    archiveProject, 
    duplicateProject, 
    deleteProject,
    openSettings 
  } = useProjectStore();
  const { playSound } = useSound();

  const colorClasses = PROJECT_COLORS[project.color];

  const handleClick = () => {
    setActiveProject(project.id);
    playSound("click");
    onSelect?.();
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    pinProject(project.id);
    playSound("click");
    setShowMenu(false);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    favoriteProject(project.id);
    playSound("click");
    setShowMenu(false);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    archiveProject(project.id);
    playSound("click");
    setShowMenu(false);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateProject(project.id);
    playSound("success");
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف "${project.name}"؟`)) {
      deleteProject(project.id);
      playSound("projectDelete");
    }
    setShowMenu(false);
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveProject(project.id);
    openSettings();
    setShowMenu(false);
  };

  // العرض المختصر (للقائمة الجانبية)
  if (isCompact) {
    return (
      <motion.div
        onClick={handleClick}
        className={`
          group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
          transition-all duration-200
          ${isActive 
            ? `bg-accent ${colorClasses.border} border-r-2` 
            : "hover:bg-accent/50"
          }
        `}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* الإيموجي */}
        <span className="text-lg">{project.emoji}</span>
        
        {/* الاسم */}
        <span className={`flex-1 text-sm truncate ${isActive ? "font-medium" : ""}`}>
          {project.name}
        </span>

        {/* أيقونات الحالة */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {project.isPinned && <Pin size={12} className="text-primary" />}
          {project.isFavorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
        </div>

        {/* عدد المحادثات */}
        {project.chatsCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {project.chatsCount}
          </span>
        )}
      </motion.div>
    );
  }

  // العرض الكامل (للشبكة)
  return (
    <motion.div
      onClick={handleClick}
      className={`
        relative group p-4 rounded-2xl border cursor-pointer
        transition-all duration-200 overflow-hidden
        ${isActive 
          ? `border-primary bg-primary/5 shadow-lg shadow-primary/10` 
          : "border-border hover:border-primary/30 hover:shadow-md"
        }
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* شريط اللون */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colorClasses.bg}`} />

      {/* القائمة */}
      <div className="absolute top-3 left-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 
                   hover:bg-accent transition-all"
        >
          <MoreHorizontal size={16} />
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
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute top-8 left-0 z-50 min-w-[180px] bg-popover border border-border 
                       rounded-xl shadow-xl overflow-hidden"
            >
              <div className="py-1">
                <MenuItem icon={Pin} label={project.isPinned ? "إلغاء التثبيت" : "تثبيت"} onClick={handlePin} />
                <MenuItem icon={Star} label={project.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"} onClick={handleFavorite} />
                <MenuItem icon={Settings} label="الإعدادات" onClick={handleSettings} />
                <MenuItem icon={Copy} label="نسخ المشروع" onClick={handleDuplicate} />
                <div className="h-px bg-border my-1" />
                <MenuItem icon={Archive} label={project.isArchived ? "إلغاء الأرشفة" : "أرشفة"} onClick={handleArchive} />
                <MenuItem icon={Trash2} label="حذف" onClick={handleDelete} destructive />
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* أيقونات الحالة */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {project.isPinned && (
          <span className="p-1 rounded-lg bg-primary/10">
            <Pin size={12} className="text-primary" />
          </span>
        )}
        {project.isFavorite && (
          <span className="p-1 rounded-lg bg-yellow-500/10">
            <Star size={12} className="text-yellow-500 fill-yellow-500" />
          </span>
        )}
      </div>

      {/* المحتوى */}
      <div className="mt-6 space-y-3">
        {/* الإيموجي والاسم */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{project.emoji}</span>
          <h3 className="font-semibold text-lg truncate">{project.name}</h3>
        </div>

        {/* الوصف */}
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}

        {/* الإحصائيات */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={14} />
            <span>{project.chatsCount} محادثة</span>
          </div>
          {project.filesCount > 0 && (
            <div className="flex items-center gap-1.5">
              <FileText size={14} />
              <span>{project.filesCount} ملف</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Menu Item Component
// ═══════════════════════════════════════════════════════════════

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  destructive?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, destructive }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
        ${destructive 
          ? "text-destructive hover:bg-destructive/10" 
          : "hover:bg-accent"
        }
      `}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
