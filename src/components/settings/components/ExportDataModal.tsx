"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Mail, Clock, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

export function ExportDataModal({ isOpen, onClose, userId, userEmail }: ExportDataModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [exported, setExported] = React.useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      if (db && userId) {
        // Create export request in Firebase
        const exportRef = doc(collection(db, "users", userId, "exports"));
        await setDoc(exportRef, {
          requestedAt: Timestamp.now(),
          status: "pending",
          email: userEmail,
        });
      }
      
      setExported(true);
    } catch (error) {
      console.error("Error requesting export:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setExported(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1a3a36] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                هل أنت متأكد من رغبتك في تصدير البيانات؟
              </h2>
              
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <FileArchive className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>.سيتم تضمين تفاصيل حسابك ودردشاتك في عملية التصدير</p>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>سيتم إرسال البيانات إلى عنوان البريد الإلكتروني المسجل في صورة ملف قابل للتنزيل.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>.ستنتهي صلاحية رابط التنزيل خلال 24 ساعة من استلامك له</p>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>.قد تستغرق المعالجة بعض الوقت. سيتم إعلامك عندما يكون جاهزاً</p>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-foreground">
                للمتابعة، اضغط على "تأكيد التصدير" أدناه.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleExport}
                disabled={loading || exported}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  exported
                    ? "bg-green-500 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  (loading || exported) && "opacity-80"
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التصدير...
                  </span>
                ) : exported ? (
                  "تم إرسال الطلب ✓"
                ) : (
                  "تأكيد التصدير"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
