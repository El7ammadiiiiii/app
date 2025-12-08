// =============================================================================
// 📦 CCCWAYS Canvas - Awareness System
// نظام الوعي للتعاون في الوقت الفعلي
// =============================================================================

import type { Awareness } from "y-protocols/awareness";
import type { Point } from "@/types/canvas";
import type {
  CollaboratorInfo,
  AwarenessState,
  CursorPosition,
} from "@/types/collaboration";
import { COLLABORATOR_COLORS } from "@/types/collaboration";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface LocalAwarenessState extends AwarenessState {
  clientId: number;
}

export interface AwarenessChange {
  added: number[];
  updated: number[];
  removed: number[];
}

export interface AwarenessCallbacks {
  onCollaboratorJoin?: (collaborator: CollaboratorInfo) => void;
  onCollaboratorLeave?: (collaboratorId: string) => void;
  onCursorMove?: (collaboratorId: string, cursor: CursorPosition) => void;
  onSelectionChange?: (collaboratorId: string, selectedIds: string[]) => void;
  onStateChange?: (states: Map<string, AwarenessState>) => void;
}

// =============================================================================
// 🎨 Color Management
// =============================================================================

const usedColors = new Set<string>();

/**
 * الحصول على لون فريد للمستخدم
 */
export function getUniqueColor(): string {
  for (const color of COLLABORATOR_COLORS) {
    if (!usedColors.has(color)) {
      usedColors.add(color);
      return color;
    }
  }
  // If all colors used, generate random
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
}

/**
 * تحرير لون مستخدم
 */
export function releaseColor(color: string): void {
  usedColors.delete(color);
}

/**
 * إعادة تعيين الألوان المستخدمة
 */
export function resetColors(): void {
  usedColors.clear();
}

// =============================================================================
// 📡 Awareness Manager
// =============================================================================

export class AwarenessManager {
  private awareness: Awareness;
  private userId: string;
  private userName: string;
  private userColor: string;
  private callbacks: AwarenessCallbacks;
  private changeHandler: ((change: AwarenessChange) => void) | null = null;
  private throttledCursorUpdate: ReturnType<typeof setTimeout> | null = null;
  private lastCursorPosition: Point | null = null;

  constructor(
    awareness: Awareness,
    userId: string,
    userName: string,
    callbacks?: AwarenessCallbacks
  ) {
    this.awareness = awareness;
    this.userId = userId;
    this.userName = userName;
    this.userColor = getUniqueColor();
    this.callbacks = callbacks || {};

    this.initialize();
  }

  /**
   * تهيئة نظام الوعي
   */
  private initialize(): void {
    // Set local state
    const localState: AwarenessState = {
      user: {
        id: this.userId,
        name: this.userName,
        color: this.userColor,
        isOnline: true,
        lastSeen: new Date(),
      },
      cursor: null,
      selectedIds: [],
      activeTool: "select",
      isTyping: false,
      viewport: null,
      lastActivity: Date.now(),
      // Compatibility fields
      id: this.userId,
      name: this.userName,
      color: this.userColor,
      currentTool: "select",
      lastActiveAt: Date.now(),
    };
    this.awareness.setLocalState(localState);

    // Setup change listener
    this.changeHandler = (change: AwarenessChange) => {
      this.handleAwarenessChange(change);
    };

    this.awareness.on("change", this.changeHandler);
  }

  /**
   * معالجة تغييرات الوعي
   */
  private handleAwarenessChange(change: AwarenessChange): void {
    const states = this.getStates();

    // Handle new collaborators
    for (const clientId of change.added) {
      const state = this.awareness.getStates().get(clientId);
      if (state && state.id !== this.userId) {
        const collaborator = this.stateToCollaborator(state, clientId);
        this.callbacks.onCollaboratorJoin?.(collaborator);
      }
    }

    // Handle updated collaborators
    for (const clientId of change.updated) {
      const state = this.awareness.getStates().get(clientId);
      if (state && state.id !== this.userId) {
        if (state.cursor) {
          this.callbacks.onCursorMove?.(state.id, state.cursor);
        }
        if (state.selectedIds) {
          this.callbacks.onSelectionChange?.(state.id, state.selectedIds);
        }
      }
    }

    // Handle removed collaborators
    for (const clientId of change.removed) {
      // We need to track client IDs to user IDs mapping
      // For now, emit the clientId as string
      this.callbacks.onCollaboratorLeave?.(String(clientId));
    }

    // Notify general state change
    this.callbacks.onStateChange?.(states);
  }

  /**
   * تحويل حالة إلى معلومات متعاون
   */
  private stateToCollaborator(
    state: Record<string, any>,
    clientId: number
  ): CollaboratorInfo {
    return {
      id: state.id || String(clientId),
      name: state.name || 'Unknown',
      color: state.color || '#888888',
      cursor: state.cursor || null,
      currentTool: state.currentTool || state.activeTool || "select",
      lastActiveAt: state.lastActiveAt || state.lastActivity || Date.now(),
      isOnline: true,
      lastSeen: new Date(),
    };
  }

  /**
   * الحصول على جميع الحالات
   */
  getStates(): Map<string, AwarenessState> {
    const statesMap = new Map<string, AwarenessState>();
    this.awareness.getStates().forEach((state: Record<string, any>, clientId) => {
      if (state && state.id) {
        statesMap.set(state.id, state as AwarenessState);
      }
    });
    return statesMap;
  }

  /**
   * الحصول على قائمة المتعاونين
   */
  getCollaborators(): CollaboratorInfo[] {
    const collaborators: CollaboratorInfo[] = [];
    this.awareness.getStates().forEach((state, clientId) => {
      if (state && state.id && state.id !== this.userId) {
        collaborators.push(this.stateToCollaborator(state, clientId));
      }
    });
    return collaborators;
  }

  /**
   * تحديث موضع المؤشر
   */
  updateCursor(position: Point): void {
    // Throttle cursor updates to 60fps
    if (this.throttledCursorUpdate) {
      this.lastCursorPosition = position;
      return;
    }

    this.setCursor(position);

    this.throttledCursorUpdate = setTimeout(() => {
      if (this.lastCursorPosition) {
        this.setCursor(this.lastCursorPosition);
        this.lastCursorPosition = null;
      }
      this.throttledCursorUpdate = null;
    }, 16); // ~60fps
  }

  /**
   * تعيين موضع المؤشر
   */
  private setCursor(position: Point): void {
    this.awareness.setLocalStateField("cursor", {
      x: position.x,
      y: position.y,
      timestamp: Date.now(),
    } as CursorPosition);
    this.awareness.setLocalStateField("lastActiveAt", Date.now());
  }

  /**
   * إخفاء المؤشر
   */
  hideCursor(): void {
    this.awareness.setLocalStateField("cursor", null);
  }

  /**
   * تحديث العناصر المحددة
   */
  updateSelection(selectedIds: string[]): void {
    this.awareness.setLocalStateField("selectedIds", selectedIds);
    this.awareness.setLocalStateField("lastActiveAt", Date.now());
  }

  /**
   * تحديث حالة الكتابة
   */
  setTyping(isTyping: boolean): void {
    this.awareness.setLocalStateField("isTyping", isTyping);
    this.awareness.setLocalStateField("lastActiveAt", Date.now());
  }

  /**
   * تحديث الأداة الحالية
   */
  setCurrentTool(tool: string): void {
    this.awareness.setLocalStateField("currentTool", tool);
    this.awareness.setLocalStateField("lastActiveAt", Date.now());
  }

  /**
   * تحديث منطقة العرض
   */
  updateViewport(viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  }): void {
    this.awareness.setLocalStateField("viewport", viewport);
  }

  /**
   * تحديث الحالة المحلية
   */
  updateLocalState(updates: Partial<AwarenessState>): void {
    const currentState = this.awareness.getLocalState() || {};
    Object.entries(updates).forEach(([key, value]) => {
      this.awareness.setLocalStateField(key, value);
    });
    this.awareness.setLocalStateField("lastActiveAt", Date.now());
  }

  /**
   * الحصول على الحالة المحلية
   */
  getLocalState(): AwarenessState | null {
    return this.awareness.getLocalState() as AwarenessState | null;
  }

  /**
   * الحصول على معرف العميل المحلي
   */
  getLocalClientId(): number {
    return this.awareness.clientID;
  }

  /**
   * التحقق مما إذا كان عنصر محدد بواسطة متعاون آخر
   */
  isElementSelectedByOther(elementId: string): CollaboratorInfo | null {
    let selector: CollaboratorInfo | null = null;
    this.awareness.getStates().forEach((state, clientId) => {
      if (
        state &&
        state.id !== this.userId &&
        state.selectedIds?.includes(elementId)
      ) {
        selector = this.stateToCollaborator(state, clientId);
      }
    });
    return selector;
  }

  /**
   * الحصول على جميع العناصر المحددة من المتعاونين الآخرين
   */
  getOthersSelectedElements(): Map<string, CollaboratorInfo> {
    const selections = new Map<string, CollaboratorInfo>();
    this.awareness.getStates().forEach((state, clientId) => {
      if (state && state.id !== this.userId && state.selectedIds) {
        const collaborator = this.stateToCollaborator(state, clientId);
        state.selectedIds.forEach((elementId: string) => {
          selections.set(elementId, collaborator);
        });
      }
    });
    return selections;
  }

  /**
   * تنظيف
   */
  destroy(): void {
    if (this.changeHandler) {
      this.awareness.off("change", this.changeHandler);
      this.changeHandler = null;
    }
    if (this.throttledCursorUpdate) {
      clearTimeout(this.throttledCursorUpdate);
      this.throttledCursorUpdate = null;
    }
    releaseColor(this.userColor);
    this.awareness.setLocalState(null);
  }
}

// =============================================================================
// 🔧 Utility Functions
// =============================================================================

/**
 * إنشاء مدير وعي
 */
export function createAwarenessManager(
  awareness: Awareness,
  userId: string,
  userName: string,
  callbacks?: AwarenessCallbacks
): AwarenessManager {
  return new AwarenessManager(awareness, userId, userName, callbacks);
}

/**
 * حساب المسافة بين مؤشرين
 */
export function getCursorDistance(
  cursor1: CursorPosition,
  cursor2: CursorPosition
): number {
  const dx = cursor1.x - cursor2.x;
  const dy = cursor1.y - cursor2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * التحقق مما إذا كان المتعاون نشطًا
 */
export function isCollaboratorActive(
  collaborator: CollaboratorInfo,
  thresholdMs: number = 30000
): boolean {
  const lastActive = collaborator.lastActiveAt || 0;
  return Date.now() - lastActive < thresholdMs;
}

/**
 * تصفية المتعاونين النشطين
 */
export function filterActiveCollaborators(
  collaborators: CollaboratorInfo[],
  thresholdMs: number = 30000
): CollaboratorInfo[] {
  return collaborators.filter((c) => isCollaboratorActive(c, thresholdMs));
}

/**
 * فرز المتعاونين حسب آخر نشاط
 */
export function sortCollaboratorsByActivity(
  collaborators: CollaboratorInfo[]
): CollaboratorInfo[] {
  return [...collaborators].sort(
    (a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0)
  );
}

// =============================================================================
// 📤 Export
// =============================================================================

export const AwarenessSystem = {
  getUniqueColor,
  releaseColor,
  resetColors,
  AwarenessManager,
  createAwarenessManager,
  getCursorDistance,
  isCollaboratorActive,
  filterActiveCollaborators,
  sortCollaboratorsByActivity,
};
