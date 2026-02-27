"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModalType } from "../types/settings";

interface ConfirmModalProps
{
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

export function ConfirmModal ( {
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
}: ConfirmModalProps )
{
  const [ inputValue, setInputValue ] = React.useState( "" );

  const canConfirm = requireInput ? inputValue === requireInput : true;

  const icons = {
    danger: <AlertTriangle className="w-6 h-6" />,
    warning: <AlertCircle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  };

  const iconColors = {
    danger: "bg-red-500/20 text-red-400",
    warning: "bg-amber-500/20 text-amber-400",
    info: "bg-emerald-500/20 text-emerald-400",
  };

  const buttonColors = {
    danger: "bg-red-500/30 text-red-300 hover:bg-red-500/40 border border-red-500/30",
    warning: "bg-amber-500/30 text-amber-300 hover:bg-amber-500/40 border border-amber-500/30",
    info: "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/30",
  };

  React.useEffect( () =>
  {
    if ( !isOpen ) setInputValue( "" );
  }, [ isOpen ] );

  return (
    <AnimatePresence>
      { isOpen && (
        <>
          {/* Overlay */ }
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            onClick={ onClose }
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */ }
          <motion.div
            initial={ { opacity: 0, scale: 0.95 } }
            animate={ { opacity: 1, scale: 1 } }
            exit={ { opacity: 0, scale: 0.95 } }
            transition={ { duration: 0.2, ease: "easeOut" } }
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={ cn(
                "rounded-2xl p-5 sm:p-6 w-full max-w-md relative",
                "bg-[#1a3a36] border border-white/10",
                "shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
              ) }
              onClick={ ( e ) => e.stopPropagation() }
            >
              {/* Close Button - Right side in RTL */ }
              <button
                onClick={ onClose }
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */ }
              <div className={ cn(
                "w-12 h-12 rounded-full mx-auto flex items-center justify-center",
                iconColors[ type ]
              ) }>
                { icons[ type ] }
              </div>

              {/* Title */ }
              <h2 className="text-xl font-bold text-white/95 text-center mt-4">
                { title }
              </h2>

              {/* Description */ }
              <p className="text-white/60 text-center mt-2 leading-relaxed">
                { description }
              </p>

              {/* Required Input */ }
              { requireInput && (
                <div className="mt-4">
                  <p className="text-sm text-white/50 text-center mb-2">
                    اكتب <strong className="text-white/90">"{ requireInput }"</strong> للتأكيد
                  </p>
                  <input
                    type="text"
                    value={ inputValue }
                    onChange={ ( e ) => setInputValue( e.target.value ) }
                    placeholder={ requireInput }
                    className={ cn(
                      "w-full px-3 py-2 bg-white/8 border border-white/10 rounded-lg",
                      "text-center text-white/90 placeholder:text-white/40",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    ) }
                    dir="ltr"
                  />
                </div>
              ) }

              {/* Actions */ }
              <div className="flex gap-3 mt-6">
                <button
                  onClick={ onClose }
                  disabled={ loading }
                  className={ cn(
                    "flex-1 px-4 py-2.5 rounded-lg font-medium",
                    "bg-white/10 text-white/90 hover:bg-white/15 border border-white/10",
                    "transition-colors",
                    loading && "opacity-50 cursor-not-allowed"
                  ) }
                >
                  { cancelText }
                </button>
                <button
                  onClick={ onConfirm }
                  disabled={ !canConfirm || loading }
                  className={ cn(
                    "flex-1 px-4 py-2.5 rounded-lg font-medium",
                    buttonColors[ type ],
                    "transition-colors",
                    ( !canConfirm || loading ) && "opacity-50 cursor-not-allowed"
                  ) }
                >
                  { loading ? "جاري التنفيذ..." : confirmText }
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) }
    </AnimatePresence>
  );
}
