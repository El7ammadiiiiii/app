"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Video, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "../store/settingsStore";

interface ImproveModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImproveModelModal({ isOpen, onClose }: ImproveModelModalProps) {
  const { 
    improveModelForAll, 
    updateSetting 
  } = useSettingsStore();
  
  const [includeAudio, setIncludeAudio] = React.useState(false);
  const [includeVideo, setIncludeVideo] = React.useState(false);

  const handleSave = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center theme-bg p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md theme-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">تحسين النموذج</h2>
              
              {/* Main Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">تحسين النموذج للجميع</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    اسمح باستخدام محتواك لتحسين نماذجنا وتدريبها، مما يجعل أفضل لك ولكل من يستخدمه. ونحن نتخذ إجراءات لحماية خصوصيتك.{" "}
                    <a href="#" className="text-primary hover:underline">تعرف على المزيد</a>
                  </p>
                </div>
                <button
                  onClick={() => updateSetting("improveModelForAll", !improveModelForAll)}
                  className={cn(
                    "relative w-12 h-7 rounded-full transition-colors",
                    improveModelForAll ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all",
                      improveModelForAll ? "right-1" : "right-6"
                    )}
                  />
                </button>
              </div>
              
              {/* Voice Mode Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">وضع الصوت</h3>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">تضمين التسجيلات الصوتية</span>
                  </div>
                  <button
                    onClick={() => setIncludeAudio(!includeAudio)}
                    className={cn(
                      "relative w-12 h-7 rounded-full transition-colors",
                      includeAudio ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all",
                        includeAudio ? "right-1" : "right-6"
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Video className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">تضمين تسجيلات الفيديو</span>
                  </div>
                  <button
                    onClick={() => setIncludeVideo(!includeVideo)}
                    className={cn(
                      "relative w-12 h-7 rounded-full transition-colors",
                      includeVideo ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all",
                        includeVideo ? "right-1" : "right-6"
                      )}
                    />
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  قم بتضمين تسجيلات الصوت والفيديو من "وضع الصوت" ليتم استخدامها في تدريب نماذجنا. تندرج النصوص والملفات الأخرى ضمن "تحسين النموذج للجميع".{" "}
                  <a href="#" className="text-primary hover:underline">تعرف على المزيد</a>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end p-4 border-t border-border bg-muted/30">
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                تم
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
