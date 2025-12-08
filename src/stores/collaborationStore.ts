// =============================================================================
// 🤝 CCCWAYS Canvas - Collaboration Store
// متجر التعاون الفوري
// =============================================================================

"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  CollaboratorInfo,
  CollaboratorCursor,
  AwarenessState,
  ConnectionStatus,
  Comment,
  SyncOperation,
} from "@/types/collaboration";

// ═══════════════════════════════════════════════════════════════════════════
// حالة التعاون
// ═══════════════════════════════════════════════════════════════════════════

interface CollaborationState {
  // المستخدم الحالي
  currentUser: CollaboratorInfo | null;
  
  // المتعاونون
  collaborators: Map<string, AwarenessState>;
  remoteUsers: CollaboratorInfo[];  // Alias for collaborators as array
  
  // المؤشرات
  cursors: Map<string, CollaboratorCursor>;
  
  // حالة الاتصال
  connectionStatus: ConnectionStatus;
  isConnected: boolean;  // Derived from connectionStatus
  roomId: string | null;
  latency: number;
  
  // التعليقات
  comments: Comment[];
  activeCommentId: string | null;
  
  // المزامنة
  pendingOperations: SyncOperation[];
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  
  // الإعدادات
  showCursors: boolean;
  showNames: boolean;
  showComments: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// الإجراءات
// ═══════════════════════════════════════════════════════════════════════════

interface CollaborationActions {
  // المستخدم
  setCurrentUser: (user: CollaboratorInfo) => void;
  updateCurrentUser: (updates: Partial<CollaboratorInfo>) => void;
  
  // المتعاونون
  setCollaborator: (userId: string, state: AwarenessState) => void;
  removeCollaborator: (userId: string) => void;
  clearCollaborators: () => void;
  
  // المؤشرات
  updateCursor: (userId: string, cursor: CollaboratorCursor) => void;
  removeCursor: (userId: string) => void;
  
  // الاتصال
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLatency: (latency: number) => void;
  setRoomId: (roomId: string | null) => void;
  
  // التعليقات
  addComment: (comment: Comment) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  setActiveComment: (id: string | null) => void;
  
  // المزامنة
  addPendingOperation: (operation: SyncOperation) => void;
  clearPendingOperations: () => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSynced: (date: Date) => void;
  
  // الإعدادات
  toggleShowCursors: () => void;
  toggleShowNames: () => void;
  toggleShowComments: () => void;
  
  // Getters
  getCollaboratorsList: () => AwarenessState[];
  getOnlineCount: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// الحالة الابتدائية
// ═══════════════════════════════════════════════════════════════════════════

const initialState: CollaborationState = {
  currentUser: null,
  collaborators: new Map(),
  remoteUsers: [],
  cursors: new Map(),
  connectionStatus: "disconnected",
  isConnected: false,
  roomId: null,
  latency: 0,
  comments: [],
  activeCommentId: null,
  pendingOperations: [],
  lastSyncedAt: null,
  isSyncing: false,
  showCursors: true,
  showNames: true,
  showComments: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// إنشاء المتجر
// ═══════════════════════════════════════════════════════════════════════════

type CollaborationStore = CollaborationState & CollaborationActions;

export const useCollaborationStore = create<CollaborationStore>()(
  immer((set, get) => ({
    ...initialState,

    // ─────────────────────────────────────────────────────────────────────
    // المستخدم
    // ─────────────────────────────────────────────────────────────────────
    
    setCurrentUser: (user) => {
      set((state) => {
        state.currentUser = user;
      });
    },

    updateCurrentUser: (updates) => {
      set((state) => {
        if (state.currentUser) {
          Object.assign(state.currentUser, updates);
        }
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // المتعاونون
    // ─────────────────────────────────────────────────────────────────────
    
    setCollaborator: (userId, awarenessState) => {
      set((state) => {
        state.collaborators.set(userId, awarenessState);
        // تحديث remoteUsers
        state.remoteUsers = Array.from(state.collaborators.values()).map(a => a.user);
      });
    },

    removeCollaborator: (userId) => {
      set((state) => {
        state.collaborators.delete(userId);
        state.cursors.delete(userId);
        // تحديث remoteUsers
        state.remoteUsers = Array.from(state.collaborators.values()).map(a => a.user);
      });
    },

    clearCollaborators: () => {
      set((state) => {
        state.collaborators.clear();
        state.cursors.clear();
        state.remoteUsers = [];
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // المؤشرات
    // ─────────────────────────────────────────────────────────────────────
    
    updateCursor: (userId, cursor) => {
      set((state) => {
        state.cursors.set(userId, cursor);
      });
    },

    removeCursor: (userId) => {
      set((state) => {
        state.cursors.delete(userId);
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // الاتصال
    // ─────────────────────────────────────────────────────────────────────
    
    setConnectionStatus: (status) => {
      set((state) => {
        state.connectionStatus = status;
        state.isConnected = status === 'connected';
      });
    },

    setLatency: (latency) => {
      set((state) => {
        state.latency = latency;
      });
    },

    setRoomId: (roomId) => {
      set((state) => {
        state.roomId = roomId;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // التعليقات
    // ─────────────────────────────────────────────────────────────────────
    
    addComment: (comment) => {
      set((state) => {
        state.comments.push(comment);
      });
    },

    updateComment: (id, updates) => {
      set((state) => {
        const index = state.comments.findIndex(c => c.id === id);
        if (index !== -1) {
          Object.assign(state.comments[index], updates);
        }
      });
    },

    deleteComment: (id) => {
      set((state) => {
        state.comments = state.comments.filter(c => c.id !== id);
      });
    },

    resolveComment: (id) => {
      set((state) => {
        const comment = state.comments.find(c => c.id === id);
        if (comment) {
          comment.resolved = true;
        }
      });
    },

    setActiveComment: (id) => {
      set((state) => {
        state.activeCommentId = id;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // المزامنة
    // ─────────────────────────────────────────────────────────────────────
    
    addPendingOperation: (operation) => {
      set((state) => {
        state.pendingOperations.push(operation);
      });
    },

    clearPendingOperations: () => {
      set((state) => {
        state.pendingOperations = [];
      });
    },

    setSyncing: (isSyncing) => {
      set((state) => {
        state.isSyncing = isSyncing;
      });
    },

    setLastSynced: (date) => {
      set((state) => {
        state.lastSyncedAt = date;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // الإعدادات
    // ─────────────────────────────────────────────────────────────────────
    
    toggleShowCursors: () => {
      set((state) => {
        state.showCursors = !state.showCursors;
      });
    },

    toggleShowNames: () => {
      set((state) => {
        state.showNames = !state.showNames;
      });
    },

    toggleShowComments: () => {
      set((state) => {
        state.showComments = !state.showComments;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // Getters
    // ─────────────────────────────────────────────────────────────────────
    
    getCollaboratorsList: () => {
      return Array.from(get().collaborators.values());
    },

    getOnlineCount: () => {
      return Array.from(get().collaborators.values())
        .filter(c => c.user.isOnline).length;
    },
  }))
);

// ═══════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════

export const selectCollaborators = (state: CollaborationStore) => 
  Array.from(state.collaborators.values());

export const selectCursors = (state: CollaborationStore) => 
  Array.from(state.cursors.values());

export const selectConnectionStatus = (state: CollaborationStore) => 
  state.connectionStatus;

export const selectComments = (state: CollaborationStore) => 
  state.comments;
