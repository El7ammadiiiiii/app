// =============================================================================
// 📦 CCCWAYS Canvas - useCollaboration Hook
// Hook للتعاون في الوقت الفعلي
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useCollaborationStore } from "@/stores/collaborationStore";
import { useCanvasStore } from "@/stores/canvasStore";
import type { Point } from "@/types/canvas";
import type {
  CollaboratorInfo,
  CollaboratorCursor,
  AwarenessState,
  CanvasRoom,
  Comment,
} from "@/types/collaboration";
import {
  setupCanvasCRDT,
  destroyCanvasCRDT,
  addElement,
  updateElement,
  deleteElement,
  getAllElements,
  observeElements,
  type CanvasYDoc,
} from "@/lib/crdt/yjs-setup";
import {
  AwarenessManager,
  createAwarenessManager,
} from "@/lib/crdt/awareness";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface CollaborationConfig {
  websocketUrl: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor?: string;
  enablePersistence?: boolean;
}

export interface CollaborationState {
  isConnected: boolean;
  isConnecting: boolean;
  isSynced: boolean;
  error: Error | null;
  collaborators: CollaboratorInfo[];
  cursorPositions: Map<string, Point>;
}

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useCollaboration(config?: CollaborationConfig) {
  // Stores
  const collaborators = useCollaborationStore((state) => state.collaborators);
  const connectionStatus = useCollaborationStore((state) => state.connectionStatus);
  const cursors = useCollaborationStore((state) => state.cursors);
  const comments = useCollaborationStore((state) => state.comments);
  const setCollaborator = useCollaborationStore((state) => state.setCollaborator);
  const removeCollaborator = useCollaborationStore((state) => state.removeCollaborator);
  const updateCursor = useCollaborationStore((state) => state.updateCursor);
  const setConnectionStatus = useCollaborationStore((state) => state.setConnectionStatus);
  const addComment = useCollaborationStore((state) => state.addComment);
  const resolveComment = useCollaborationStore((state) => state.resolveComment);
  const clearCollaborators = useCollaborationStore((state) => state.clearCollaborators);

  // Canvas store
  const elements = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const viewport = useCanvasStore((state) => state.viewport);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const addElementToStore = useCanvasStore((state) => state.addElement);
  const updateElementInStore = useCanvasStore((state) => state.updateElement);
  const deleteElementFromStore = useCanvasStore((state) => state.deleteElement);

  // Local state for room
  const [currentRoom, setCurrentRoom] = useState<CanvasRoom | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const crdtRef = useRef<CanvasYDoc | null>(null);
  const awarenessRef = useRef<AwarenessManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // =============================================================================
  // 🔌 Connection
  // =============================================================================

  /**
   * الاتصال بالغرفة
   */
  const connect = useCallback(
    async (roomConfig?: CollaborationConfig) => {
      const cfg = roomConfig || config;
      if (!cfg) {
        setError(new Error("Configuration required"));
        return;
      }

      if (crdtRef.current) {
        console.warn("Already connected");
        return;
      }

      setIsConnecting(true);
      setConnectionStatus("connecting");
      setError(null);

      try {
        // Setup CRDT
        const crdt = setupCanvasCRDT(
          {
            websocketUrl: cfg.websocketUrl,
            roomId: cfg.roomId,
            userId: cfg.userId,
            userName: cfg.userName,
            userColor: cfg.userColor || "#6366f1",
            enablePersistence: cfg.enablePersistence,
          },
          {
            onConnect: () => {
              setConnectionStatus("connected");
              setIsConnecting(false);
            },
            onDisconnect: () => {
              setConnectionStatus("disconnected");
            },
            onSynced: () => {
              setIsSynced(true);
              // Load elements from CRDT
              const crdtElements = getAllElements(crdt);
              // Add each element to store
              Object.values(crdtElements).forEach((el) => addElementToStore(el));
            },
            onError: (err) => {
              setError(err);
              setConnectionStatus("error");
            },
          }
        );

        crdtRef.current = crdt;

        // Setup awareness manager
        if (crdt.provider) {
          const awareness = createAwarenessManager(
            crdt.provider.awareness,
            cfg.userId,
            cfg.userName,
            {
              onCollaboratorJoin: (collaborator) => {
                const awarenessState: AwarenessState = {
                  user: collaborator,
                  cursor: collaborator.cursor || null,
                  selectedIds: [],
                  activeTool: collaborator.currentTool || "select",
                  isTyping: false,
                  viewport: null,
                  lastActivity: Date.now(),
                };
                setCollaborator(collaborator.id, awarenessState);
              },
              onCollaboratorLeave: (collaboratorId) => {
                removeCollaborator(collaboratorId);
              },
              onCursorMove: (collaboratorId, cursorPos) => {
                const cursor: CollaboratorCursor = {
                  userId: collaboratorId,
                  position: cursorPos,
                  tool: activeTool,
                  timestamp: Date.now(),
                };
                updateCursor(collaboratorId, cursor);
              },
              onStateChange: (states) => {
                // Clear and re-add all collaborators
                clearCollaborators();
                states.forEach((state, id) => {
                  if (id !== cfg.userId) {
                    setCollaborator(id, state);
                  }
                });
              },
            }
          );
          awarenessRef.current = awareness;
        }

        // Observe element changes
        unsubscribeRef.current = observeElements(
          crdt,
          (added, updated, deleted) => {
            added.forEach((el) => addElementToStore(el));
            updated.forEach((el) => updateElementInStore(el.id, el));
            deleted.forEach((id) => deleteElementFromStore(id));
          }
        );

        // Set room info
        setCurrentRoom({
          id: cfg.roomId,
          name: `غرفة ${cfg.roomId}`,
          ownerId: cfg.userId,
          members: [{
            userId: cfg.userId,
            role: 'owner',
            joinedAt: new Date(),
            permissions: {
              canEdit: true,
              canComment: true,
              canInvite: true,
              canDelete: true,
              canExport: true,
            }
          }],
          settings: {
            isPublic: false,
            allowAnonymous: false,
            maxMembers: 10,
            autoSave: true,
            autoSaveInterval: 30000,
            showCursors: true,
            showNames: true,
            allowComments: true,
            allowVoice: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (err) {
        setError(err as Error);
        setConnectionStatus("error");
        setIsConnecting(false);
      }
    },
    [config, setConnectionStatus, setCollaborator, removeCollaborator, updateCursor, clearCollaborators, setCurrentRoom, addElementToStore, updateElementInStore, deleteElementFromStore, activeTool]
  );

  /**
   * قطع الاتصال
   */
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (awarenessRef.current) {
      awarenessRef.current.destroy();
      awarenessRef.current = null;
    }

    if (crdtRef.current) {
      destroyCanvasCRDT(crdtRef.current);
      crdtRef.current = null;
    }

    setConnectionStatus("disconnected");
    setIsSynced(false);
    clearCollaborators();
    setCurrentRoom(null);
  }, [setConnectionStatus, clearCollaborators, setCurrentRoom]);

  // =============================================================================
  // 📡 Awareness Updates
  // =============================================================================

  /**
   * تحديث موضع المؤشر
   */
  const broadcastCursor = useCallback(
    (position: Point) => {
      if (awarenessRef.current) {
        awarenessRef.current.updateCursor(position);
      }
    },
    []
  );

  /**
   * تحديث العناصر المحددة
   */
  const broadcastSelection = useCallback(
    (ids: string[]) => {
      if (awarenessRef.current) {
        awarenessRef.current.updateSelection(ids);
      }
    },
    []
  );

  /**
   * تحديث حالة الكتابة
   */
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (awarenessRef.current) {
        awarenessRef.current.setTyping(isTyping);
      }
    },
    []
  );

  /**
   * تحديث الأداة الحالية
   */
  const broadcastTool = useCallback(
    (tool: string) => {
      if (awarenessRef.current) {
        awarenessRef.current.setCurrentTool(tool);
      }
    },
    []
  );

  // Broadcast selection changes
  useEffect(() => {
    broadcastSelection(selectedIds);
  }, [selectedIds, broadcastSelection]);

  // Broadcast tool changes
  useEffect(() => {
    broadcastTool(activeTool);
  }, [activeTool, broadcastTool]);

  // =============================================================================
  // 📝 Element Sync
  // =============================================================================

  /**
   * إضافة عنصر مع المزامنة
   */
  const syncAddElement = useCallback(
    (element: any) => {
      if (crdtRef.current) {
        addElement(crdtRef.current, element, config?.userId);
      }
    },
    [config?.userId]
  );

  /**
   * تحديث عنصر مع المزامنة
   */
  const syncUpdateElement = useCallback(
    (elementId: string, updates: any) => {
      if (crdtRef.current) {
        updateElement(crdtRef.current, elementId, updates, config?.userId);
      }
    },
    [config?.userId]
  );

  /**
   * حذف عنصر مع المزامنة
   */
  const syncDeleteElement = useCallback(
    (elementId: string) => {
      if (crdtRef.current) {
        deleteElement(crdtRef.current, elementId, config?.userId);
      }
    },
    [config?.userId]
  );

  // =============================================================================
  // 💬 Comments
  // =============================================================================

  /**
   * إضافة تعليق
   */
  const addNewComment = useCallback(
    (content: string, position: Point, elementId?: string) => {
      const comment: Comment = {
        id: uuidv4(),
        text: content,
        position,
        elementId,
        authorId: config?.userId || "anonymous",
        authorName: config?.userName || "مجهول",
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        replies: [],
        reactions: [],
      };

      addComment(comment);

      // Sync comment if connected
      if (crdtRef.current) {
        // Add comment to CRDT metadata
        const metadata = crdtRef.current.metadata;
        const commentsArray = metadata.get("comments") || [];
        metadata.set("comments", [...commentsArray, comment]);
      }

      return comment;
    },
    [config?.userId, config?.userName, addComment]
  );

  /**
   * حل تعليق
   */
  const resolveCommentById = useCallback(
    (commentId: string) => {
      resolveComment(commentId);

      // Sync to CRDT
      if (crdtRef.current) {
        const metadata = crdtRef.current.metadata;
        const commentsArray = metadata.get("comments") || [];
        const updated = commentsArray.map((c: Comment) =>
          c.id === commentId ? { ...c, resolved: true } : c
        );
        metadata.set("comments", updated);
      }
    },
    [resolveComment]
  );

  // =============================================================================
  // 🧹 Cleanup
  // =============================================================================

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    // State
    isConnected: connectionStatus === "connected",
    isConnecting,
    isSynced,
    error,
    collaborators,
    cursors,
    comments,
    currentRoom,
    connectionStatus,

    // Connection
    connect,
    disconnect,

    // Awareness
    broadcastCursor,
    broadcastSelection,
    broadcastTyping,
    broadcastTool,

    // Element sync
    syncAddElement,
    syncUpdateElement,
    syncDeleteElement,

    // Comments
    addComment: addNewComment,
    resolveComment: resolveCommentById,
  };
}
