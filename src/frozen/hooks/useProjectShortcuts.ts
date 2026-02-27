"use client";

import { useEffect, useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";

/**
 * Hook للتعامل مع اختصارات لوحة المفاتيح لنظام المشاريع
 */
export function useProjectShortcuts() {
  const {
    openQuickSwitcher,
    closeQuickSwitcher,
    isQuickSwitcherOpen,
    openCreateModal,
    closeCreateModal,
    isCreateModalOpen,
    openSettings,
    closeSettings,
    isSettingsOpen,
    activeProjectId,
    createChat,
  } = useProjectStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + K - فتح Quick Switcher
      if (cmdKey && event.key === "k") {
        event.preventDefault();
        if (isQuickSwitcherOpen) {
          closeQuickSwitcher();
        } else {
          openQuickSwitcher();
        }
        return;
      }

      // Ctrl/Cmd + Shift + N - مشروع جديد
      if (cmdKey && event.shiftKey && event.key === "N") {
        event.preventDefault();
        if (!isCreateModalOpen) {
          openCreateModal();
        }
        return;
      }

      // Ctrl/Cmd + N - محادثة جديدة (إذا كان هناك مشروع نشط)
      if (cmdKey && !event.shiftKey && event.key === "n") {
        event.preventDefault();
        if (activeProjectId) {
          createChat(activeProjectId);
        } else {
          openCreateModal();
        }
        return;
      }

      // Ctrl/Cmd + , - الإعدادات
      if (cmdKey && event.key === ",") {
        event.preventDefault();
        if (activeProjectId) {
          if (isSettingsOpen) {
            closeSettings();
          } else {
            openSettings();
          }
        }
        return;
      }

      // Escape - إغلاق النوافذ
      if (event.key === "Escape") {
        if (isQuickSwitcherOpen) {
          event.preventDefault();
          closeQuickSwitcher();
          return;
        }
        if (isCreateModalOpen) {
          event.preventDefault();
          closeCreateModal();
          return;
        }
        if (isSettingsOpen) {
          event.preventDefault();
          closeSettings();
          return;
        }
      }
    },
    [
      isQuickSwitcherOpen,
      isCreateModalOpen,
      isSettingsOpen,
      activeProjectId,
      openQuickSwitcher,
      closeQuickSwitcher,
      openCreateModal,
      closeCreateModal,
      openSettings,
      closeSettings,
      createChat,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // إرجاع الدوال للاستخدام المباشر
  return {
    openQuickSwitcher,
    openCreateModal,
    openSettings,
  };
}

/**
 * قائمة الاختصارات المتاحة
 */
export const KEYBOARD_SHORTCUTS = [
  {
    keys: ["Ctrl", "K"],
    macKeys: ["⌘", "K"],
    description: "فتح البحث السريع",
  },
  {
    keys: ["Ctrl", "Shift", "N"],
    macKeys: ["⌘", "⇧", "N"],
    description: "إنشاء مشروع جديد",
  },
  {
    keys: ["Ctrl", "N"],
    macKeys: ["⌘", "N"],
    description: "محادثة جديدة",
  },
  {
    keys: ["Ctrl", ","],
    macKeys: ["⌘", ","],
    description: "إعدادات المشروع",
  },
  {
    keys: ["Escape"],
    macKeys: ["Esc"],
    description: "إغلاق النافذة الحالية",
  },
];
