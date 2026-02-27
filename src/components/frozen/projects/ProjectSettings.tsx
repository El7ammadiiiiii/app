"use client";

import { useState, useEffect } from "react";
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
  
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState<ProjectColor>("turquoise");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // تحديث الحالة عند فتح الإعدادات أو تغيير المشروع
  useEffect(() => {
    if (isSettingsOpen && project) {
      setName(project.name);
      setEmoji(project.emoji);
      setColor(project.color);
      setDescription(project.description || "");
      setInstructions(project.instructions || "");
      setHasChanges(false);
    }
  }, [isSettingsOpen, project?.id]);

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
            className="fixed inset-0 overlay-backdrop z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-4 right-4 bottom-4 w-[320px] overlay-panel
                     rounded-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative">
              {/* شريط اللون */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${colorClasses.bg} rounded-t-2xl`} />
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white">إعدادات المشروع</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-zinc-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* الإيموجي والاسم */}
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-10 h-10 rounded-lg border border-white/20 
                             hover:border-white/40 transition-colors flex items-center justify-center
                             text-xl hover:bg-white/5"
                  >
                    {emoji}
                  </button>
                  
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute top-12 right-0 z-10 bg-zinc-800 border border-white/10 
                                 rounded-xl shadow-xl min-w-[240px]"
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

                <div className="flex-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleChange(setName, e.target.value)}
                    placeholder="اسم المشروع..."
                    className="w-full h-10 px-3 rounded-lg overlay-input text-sm"
                  />
                </div>
              </div>

              {/* لون المشروع */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium overlay-label">لون المشروع</label>
                <ColorPicker 
                  selectedColor={color} 
                  onSelect={(c) => handleChange(setColor, c)}
                  size="sm"
                />
              </div>

              {/* الوصف */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium overlay-label">الوصف</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => handleChange(setDescription, e.target.value)}
                  placeholder="وصف مختصر للمشروع..."
                  className="w-full h-9 px-3 rounded-lg overlay-input text-sm"
                />
              </div>

              {/* التعليمات */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium overlay-label">تعليمات مخصصة</label>
                <textarea
                  value={instructions}
                  onChange={(e) => handleChange(setInstructions, e.target.value)}
                  placeholder="أضف تعليمات خاصة لهذا المشروع..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg overlay-input text-sm resize-none"
                />
                <p className="text-[10px] overlay-text-muted">
                  سيتم تطبيق هذه التعليمات على جميع المحادثات في هذا المشروع
                </p>
              </div>

              {/* منطقة الخطر */}
              <div className="space-y-2 pt-3 overlay-divider">
                <h4 className="text-xs font-medium text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  منطقة الخطر
                </h4>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleArchive}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 
                             rounded-lg overlay-btn-secondary text-xs font-medium"
                  >
                    <Archive size={12} />
                    {project.isArchived ? "إلغاء" : "أرشفة"}
                  </button>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 
                               rounded-lg overlay-btn-danger text-xs font-medium"
                    >
                      <Trash2 size={12} />
                      حذف
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 p-2 rounded-lg border border-red-500/30 bg-red-500/5 space-y-2"
                    >
                      <p className="text-[10px] text-center overlay-text-muted">
                        هل أنت متأكد؟
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-2 py-1 rounded overlay-btn-secondary text-[10px]"
                        >
                          لا
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 px-2 py-1 rounded bg-red-500 text-white 
                                   hover:bg-red-600 transition-colors text-[10px] font-medium"
                        >
                          نعم
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 overlay-divider">
              <motion.button
                onClick={handleSave}
                disabled={!name.trim() || !hasChanges}
                className="px-4 py-2 rounded-lg bg-white text-zinc-900 
                         hover:bg-zinc-100 transition-colors text-xs font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-1.5"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Save size={12} />
                حفظ
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
