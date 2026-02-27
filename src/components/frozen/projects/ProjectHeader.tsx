"use client";

import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  Settings, 
  MoreHorizontal,
  FileText,
  MessageSquare,
  Info,
  Share2, 
  CornerUpRight, 
  Pin, 
  Archive, 
  Flag, 
  Trash2,
  Plus,
  Users,
  FolderInput
} from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS } from "@/types/project";
import { EmojiDisplay } from "./EmojiPicker";
import { ShareModal } from "@/components/share/ShareModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSound } from "@/lib/sounds";

export function ProjectHeader() {
  const [showInfo, setShowInfo] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { playSound } = useSound();
  
  const { 
    getActiveProject, 
    setActiveProject, 
    openSettings,
    getProjectChats,
    getProjectFiles,
    createChat,
    setActiveChat,
    getActiveChat,
    pinChat,
    archiveChat,
    deleteChat,
    moveChat
  } = useProjectStore();
  
  const project = getActiveProject();
  const activeChat = getActiveChat();
  
  if (!project) return null;

  const colorClasses = PROJECT_COLORS[project.color];
  const chats = getProjectChats(project.id);
  const files = getProjectFiles(project.id);

  const handleNewChat = () => {
    const newChat = createChat(project.id, "محادثة جديدة");
    setActiveChat(newChat.id);
    playSound("click");
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
    playSound("click");
  };

  const handleStartGroupChat = () => {
    console.log("Start Group Chat");
    playSound("click");
  };

  const handleMoveToProject = () => {
    console.log("Move to Project");
    playSound("click");
  };

  const handlePinChat = () => {
    if (activeChat) {
      pinChat(activeChat.id);
      playSound("click");
    }
  };

  const handleArchiveChat = () => {
    if (activeChat) {
      archiveChat(activeChat.id);
      playSound("click");
    }
  };

  const handleReport = () => {
    if (activeChat) {
      const subject = `Report Chat: ${activeChat.title}`;
      const body = `Chat ID: ${activeChat.id}\nProject ID: ${project.id}\n\nPlease describe the issue:\n`;
      window.open(`mailto:alhammadiiebrahim@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      playSound("click");
    }
  };

  const handleDeleteChat = () => {
    if (activeChat) {
      deleteChat(activeChat.id);
      setActiveChat(null);
      playSound("click");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-0 left-0 right-0 z-20 backdrop-blur-xl bg-background/60"
    >
      {/* شريط اللون - تمت إزالته لطلب المستخدم */}
      {/* <div className={`absolute top-0 left-0 right-0 h-0.5 ${colorClasses.bg}`} /> */}

      <div className="flex items-center justify-between px-3 py-1.5">
        {/* معلومات المشروع */}
        <div className="flex items-center gap-2">
          {/* زر العودة */}
          <motion.button
            onClick={() => setActiveProject(null)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={16} />
          </motion.button>

          {/* الإيموجي والاسم */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowInfo(!showInfo)}
          >
            <div className={`
              w-7 h-7 rounded-lg ${colorClasses.bg}/20 
              flex items-center justify-center
            `}>
              <EmojiDisplay emoji={project.emoji} size="sm" />
            </div>
            <div>
              <h2 className="font-medium text-sm">{project.name}</h2>
              {project.description && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* الإحصائيات والأزرار */}
        <div className="flex items-center gap-0.5 bg-background/80 backdrop-blur-md border border-border/50 shadow-sm rounded-full p-1">
          {/* زر محادثة جديدة */}
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="محادثة جديدة"
          >
            <Plus size={16} />
          </button>

          {/* زر المشاركة */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Share2 size={14} />
            <span className="text-xs font-medium">مشاركة</span>
          </button>

          {/* قائمة المزيد */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>مشاركة</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleStartGroupChat}>
                <Users className="mr-2 h-4 w-4" />
                <span>بدء محادثة جماعية</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleMoveToProject} disabled={!activeChat}>
                <FolderInput className="mr-2 h-4 w-4" />
                <span>نقل إلى المشروع</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handlePinChat} disabled={!activeChat}>
                <Pin className="mr-2 h-4 w-4" />
                <span>تثبيت الدردشة</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleArchiveChat} disabled={!activeChat}>
                <Archive className="mr-2 h-4 w-4" />
                <span>أرشفة</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleReport} disabled={!activeChat}>
                <Flag className="mr-2 h-4 w-4" />
                <span>إبلاغ</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleDeleteChat} 
                disabled={!activeChat}
                className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/20"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>حذف</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />

      {/* لوحة المعلومات الجانبية */}

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
