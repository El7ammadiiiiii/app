"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModalType } from "../types/settings";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: ModalType;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  requireInput?: string;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  description,
  confirmText,
  cancelText = "إلغاء",
  requireInput,
  loading = false,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = React.useState("");

  const canConfirm = requireInput ? inputValue === requireInput : true;

  const icons = {
    danger: <AlertTriangle className="w-6 h-6" />,
    warning: <AlertCircle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  };

  const iconColors = {
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-secondary/10 text-secondary",
    info: "bg-primary/10 text-primary",
  };

  const buttonColors = {
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    warning: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    info: "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  React.useEffect(() => {
    if (!isOpen) setInputValue("");
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={cn(
                "theme-card border border-border rounded-2xl p-6 w-full max-w-md",
                "shadow-2xl"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className={cn(
                "w-12 h-12 rounded-full mx-auto flex items-center justify-center",
                iconColors[type]
              )}>
                {icons[type]}
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-foreground text-center mt-4">
                {title}
              </h2>

              {/* Description */}
              <p className="text-muted-foreground text-center mt-2 leading-relaxed">
                {description}
              </p>

              {/* Required Input */}
              {requireInput && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    اكتب <strong className="text-foreground">"{requireInput}"</strong> للتأكيد
                  </p>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={requireInput}
                    className={cn(
                      "w-full px-3 py-2 bg-muted border border-border rounded-lg",
                      "text-center text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50"
                    )}
                    dir="ltr"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-lg font-medium",
                    "bg-muted text-foreground hover:bg-muted/80",
                    "transition-colors",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!canConfirm || loading}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-lg font-medium",
                    buttonColors[type],
                    "transition-colors",
                    (!canConfirm || loading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? "جاري التنفيذ..." : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
