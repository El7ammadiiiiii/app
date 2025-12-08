"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Archive, AlertTriangle } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS, type ProjectColor } from "@/types/project";
import { EmojiPicker } from "./EmojiPicker";
import { ColorPicker } from "./ColorPicker";
import { useSound } from "@/lib/sounds";

export function ProjectSettings() {
  const { 
    isSettingsOpen, 
    closeSettings, 
    getActiveProject, 
    updateProject,
    deleteProject,
    archiveProject
  } = useProjectStore();
  const { playSound } = useSound();
  
  const project = getActiveProject();
  
  const [name, setName] = useState(project?.name || "");
  const [emoji, setEmoji] = useState(project?.emoji || "📁");
  const [color, setColor] = useState<ProjectColor>(project?.color || "turquoise");
  const [description, setDescription] = useState(project?.description || "");
  const [instructions, setInstructions] = useState(project?.instructions || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // تحديث الحالة عند فتح الإعدادات
  const initializeState = () => {
    if (project) {
      setName(project.name);
      setEmoji(project.emoji);
      setColor(project.color);
      setDescription(project.description || "");
      setInstructions(project.instructions || "");
      setHasChanges(false);
    }
  };

  // تتبع التغييرات
  const handleChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  // حفظ التغييرات
  const handleSave = () => {
    if (!project || !name.trim()) return;

    updateProject(project.id, {
      name: name.trim(),
      emoji,
      color,
      description: description.trim(),
      instructions: instructions.trim(),
    });

    playSound("success");
    setHasChanges(false);
    closeSettings();
  };

  // حذف المشروع
  const handleDelete = () => {
    if (!project) return;
    
    deleteProject(project.id);
    playSound("projectDelete");
    closeSettings();
  };

  // أرشفة المشروع
  const handleArchive = () => {
    if (!project) return;
    
    archiveProject(project.id);
    playSound("click");
    closeSettings();
  };

  // إغلاق مع تحذير
  const handleClose = () => {
    if (hasChanges) {
      if (confirm("لديك تغييرات غير محفوظة. هل تريد الإغلاق؟")) {
        closeSettings();
      }
    } else {
      closeSettings();
    }
  };

  if (!project) return null;

  const colorClasses = PROJECT_COLORS[color];

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-r border-border 
                     shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative">
              {/* شريط اللون */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${colorClasses.bg}`} />
              
              <div className="flex items-center justify-between p-5 pt-6 border-b border-border">
                <h2 className="text-lg font-semibold">إعدادات المشروع</h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* الإيموجي والاسم */}
              <div className="flex gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-border 
                             hover:border-primary/50 transition-colors flex items-center justify-center
                             text-3xl hover:bg-accent/50"
                  >
                    {emoji}
                  </button>
                  
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute top-18 right-0 z-10 bg-popover border border-border 
                                 rounded-xl shadow-xl min-w-[280px]"
                      >
                        <EmojiPicker
                          selectedEmoji={emoji}
                          onSelect={(e) => {
                            handleChange(setEmoji, e);
                            setShowEmojiPicker(false);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">اسم المشروع</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleChange(setName, e.target.value)}
                    placeholder="اسم المشروع..."
                    className="w-full h-12 px-4 rounded-xl border border-border bg-card
                             focus:border-primary focus:ring-2 focus:ring-primary/20 
                             outline-none transition-all"
                  />
                </div>
              </div>

              {/* لون المشروع */}
              <div className="space-y-2">
                <label className="text-sm font-medium">لون المشروع</label>
                <ColorPicker 
                  selectedColor={color} 
                  onSelect={(c) => handleChange(setColor, c)} 
                />
              </div>

              {/* الوصف */}
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => handleChange(setDescription, e.target.value)}
                  placeholder="وصف مختصر للمشروع..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card
                           focus:border-primary focus:ring-2 focus:ring-primary/20 
                           outline-none transition-all"
                />
              </div>

              {/* التعليمات */}
              <div className="space-y-2">
                <label className="text-sm font-medium">تعليمات مخصصة</label>
                <textarea
                  value={instructions}
                  onChange={(e) => handleChange(setInstructions, e.target.value)}
                  placeholder="أضف تعليمات خاصة لهذا المشروع..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card
                           focus:border-primary focus:ring-2 focus:ring-primary/20 
                           outline-none transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  سيتم تطبيق هذه التعليمات على جميع المحادثات في هذا المشروع
                </p>
              </div>

              {/* منطقة الخطر */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle size={16} />
                  منطقة الخطر
                </h4>
                
                <div className="space-y-2">
                  <button
                    onClick={handleArchive}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 
                             rounded-xl border border-border hover:bg-accent
                             transition-colors text-sm font-medium"
                  >
                    <Archive size={16} />
                    {project.isArchived ? "إلغاء الأرشفة" : "أرشفة المشروع"}
                  </button>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 
                               rounded-xl border border-destructive/30 text-destructive
                               hover:bg-destructive/10 transition-colors text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      حذف المشروع
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3"
                    >
                      <p className="text-sm text-center">
                        هل أنت متأكد؟ سيتم حذف جميع المحادثات والملفات.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-4 py-2 rounded-lg border border-border 
                                   hover:bg-accent transition-colors text-sm"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground 
                                   hover:bg-destructive/90 transition-colors text-sm font-medium"
                        >
                          حذف نهائي
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
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
                onClick={handleSave}
                disabled={!name.trim() || !hasChanges}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground 
                         hover:bg-primary/90 transition-colors font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Save size={16} />
                حفظ التغييرات
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
