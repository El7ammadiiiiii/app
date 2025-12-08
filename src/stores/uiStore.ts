// =============================================================================
// 🎨 CCCWAYS Canvas - UI Store
// متجر واجهة المستخدم
// =============================================================================

"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// ═══════════════════════════════════════════════════════════════════════════
// أنواع اللوحات
// ═══════════════════════════════════════════════════════════════════════════

export type PanelType = 
  | "properties"
  | "layers"
  | "assets"
  | "history"
  | "ai"
  | "comments"
  | "settings";

export type ModalType = 
  | "export"
  | "import"
  | "share"
  | "settings"
  | "shortcuts"
  | "templates"
  | null;

// ═══════════════════════════════════════════════════════════════════════════
// حالة الواجهة
// ═══════════════════════════════════════════════════════════════════════════

interface UIState {
  // اللوحات
  activePanels: PanelType[];
  panelWidth: Record<PanelType, number>;
  
  // النوافذ المنبثقة
  activeModal: ModalType;
  
  // شريط الأدوات
  isToolbarExpanded: boolean;
  isToolbarFloating: boolean;
  toolbarPosition: { x: number; y: number };
  
  // القوائم المنسدلة
  activeDropdown: string | null;
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  };
  
  // التوست والإشعارات
  toasts: Toast[];
  
  // الحالة العامة
  theme: "light" | "dark" | "system";
  language: "ar" | "en";
  isFullscreen: boolean;
  isMobile: boolean;
  
  // التلميحات
  showTooltips: boolean;
  showShortcuts: boolean;
  
  // مؤشر التحميل
  isLoading: boolean;
  loadingMessage: string;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  action?: () => void;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// الإجراءات
// ═══════════════════════════════════════════════════════════════════════════

interface UIActions {
  // اللوحات
  togglePanel: (panel: PanelType) => void;
  openPanel: (panel: PanelType) => void;
  closePanel: (panel: PanelType) => void;
  setPanelWidth: (panel: PanelType, width: number) => void;
  
  // النوافذ
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  
  // شريط الأدوات
  toggleToolbarExpanded: () => void;
  setToolbarFloating: (floating: boolean) => void;
  setToolbarPosition: (position: { x: number; y: number }) => void;
  
  // القوائم
  setActiveDropdown: (id: string | null) => void;
  openContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;
  
  // التوست
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // الإعدادات
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLanguage: (language: "ar" | "en") => void;
  toggleFullscreen: () => void;
  setIsMobile: (isMobile: boolean) => void;
  
  // التلميحات
  toggleTooltips: () => void;
  toggleShortcuts: () => void;
  
  // التحميل
  setLoading: (isLoading: boolean, message?: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// الحالة الابتدائية
// ═══════════════════════════════════════════════════════════════════════════

const initialState: UIState = {
  activePanels: ["properties"],
  panelWidth: {
    properties: 280,
    layers: 250,
    assets: 280,
    history: 250,
    ai: 320,
    comments: 300,
    settings: 320,
  },
  activeModal: null,
  isToolbarExpanded: true,
  isToolbarFloating: false,
  toolbarPosition: { x: 0, y: 0 },
  activeDropdown: null,
  contextMenu: {
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
  },
  toasts: [],
  theme: "dark",
  language: "ar",
  isFullscreen: false,
  isMobile: false,
  showTooltips: true,
  showShortcuts: true,
  isLoading: false,
  loadingMessage: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// إنشاء المتجر
// ═══════════════════════════════════════════════════════════════════════════

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  immer((set, get) => ({
    ...initialState,

    // ─────────────────────────────────────────────────────────────────────
    // اللوحات
    // ─────────────────────────────────────────────────────────────────────
    
    togglePanel: (panel) => {
      set((state) => {
        const index = state.activePanels.indexOf(panel);
        if (index === -1) {
          state.activePanels.push(panel);
        } else {
          state.activePanels.splice(index, 1);
        }
      });
    },

    openPanel: (panel) => {
      set((state) => {
        if (!state.activePanels.includes(panel)) {
          state.activePanels.push(panel);
        }
      });
    },

    closePanel: (panel) => {
      set((state) => {
        state.activePanels = state.activePanels.filter(p => p !== panel);
      });
    },

    setPanelWidth: (panel, width) => {
      set((state) => {
        state.panelWidth[panel] = Math.max(200, Math.min(500, width));
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // النوافذ
    // ─────────────────────────────────────────────────────────────────────
    
    openModal: (modal) => {
      set((state) => {
        state.activeModal = modal;
      });
    },

    closeModal: () => {
      set((state) => {
        state.activeModal = null;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // شريط الأدوات
    // ─────────────────────────────────────────────────────────────────────
    
    toggleToolbarExpanded: () => {
      set((state) => {
        state.isToolbarExpanded = !state.isToolbarExpanded;
      });
    },

    setToolbarFloating: (floating) => {
      set((state) => {
        state.isToolbarFloating = floating;
      });
    },

    setToolbarPosition: (position) => {
      set((state) => {
        state.toolbarPosition = position;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // القوائم
    // ─────────────────────────────────────────────────────────────────────
    
    setActiveDropdown: (id) => {
      set((state) => {
        state.activeDropdown = id;
      });
    },

    openContextMenu: (x, y, items) => {
      set((state) => {
        state.contextMenu = { isOpen: true, x, y, items };
      });
    },

    closeContextMenu: () => {
      set((state) => {
        state.contextMenu.isOpen = false;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // التوست
    // ─────────────────────────────────────────────────────────────────────
    
    addToast: (toast) => {
      const id = `toast_${Date.now()}`;
      set((state) => {
        state.toasts.push({ ...toast, id });
      });
      
      // إزالة تلقائية
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      }
    },

    removeToast: (id) => {
      set((state) => {
        state.toasts = state.toasts.filter(t => t.id !== id);
      });
    },

    clearToasts: () => {
      set((state) => {
        state.toasts = [];
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // الإعدادات
    // ─────────────────────────────────────────────────────────────────────
    
    setTheme: (theme) => {
      set((state) => {
        state.theme = theme;
      });
    },

    setLanguage: (language) => {
      set((state) => {
        state.language = language;
      });
    },

    toggleFullscreen: () => {
      set((state) => {
        state.isFullscreen = !state.isFullscreen;
      });
    },

    setIsMobile: (isMobile) => {
      set((state) => {
        state.isMobile = isMobile;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // التلميحات
    // ─────────────────────────────────────────────────────────────────────
    
    toggleTooltips: () => {
      set((state) => {
        state.showTooltips = !state.showTooltips;
      });
    },

    toggleShortcuts: () => {
      set((state) => {
        state.showShortcuts = !state.showShortcuts;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // التحميل
    // ─────────────────────────────────────────────────────────────────────
    
    setLoading: (isLoading, message = "") => {
      set((state) => {
        state.isLoading = isLoading;
        state.loadingMessage = message;
      });
    },
  }))
);

// ═══════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════

export const selectActivePanels = (state: UIStore) => state.activePanels;
export const selectActiveModal = (state: UIStore) => state.activeModal;
export const selectTheme = (state: UIStore) => state.theme;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectIsLoading = (state: UIStore) => state.isLoading;
