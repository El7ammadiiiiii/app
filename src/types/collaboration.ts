// =============================================================================
// 🤝 CCCWAYS Canvas - Collaboration Types
// نظام التعاون الفوري - تعريفات الأنواع
// =============================================================================

import type { Point, CanvasElement } from './canvas';

// ═══════════════════════════════════════════════════════════════════════════
// المستخدم المتعاون
// ═══════════════════════════════════════════════════════════════════════════

export interface CollaboratorInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastSeen: Date;
  cursor?: Point | null;
  currentTool?: string;
  lastActiveAt?: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  pressure?: number;
}

export interface CollaboratorCursor {
  userId: string;
  position: Point;
  tool: string;
  timestamp: number;
}

export interface CollaboratorSelection {
  userId: string;
  selectedIds: string[];
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// حالة الوعي (Awareness)
// ═══════════════════════════════════════════════════════════════════════════

export interface AwarenessState {
  user: CollaboratorInfo;
  cursor: Point | null;
  selectedIds: string[];
  activeTool: string;
  isTyping: boolean;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  } | null;
  lastActivity: number;
  // Compatibility aliases
  id?: string;
  name?: string;
  color?: string;
  currentTool?: string;
  lastActiveAt?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// الغرفة (Room)
// ═══════════════════════════════════════════════════════════════════════════

export interface CanvasRoom {
  id: string;
  name: string;
  ownerId: string;
  members: RoomMember[];
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  permissions: RoomPermissions;
}

export interface RoomSettings {
  isPublic: boolean;
  allowAnonymous: boolean;
  maxMembers: number;
  autoSave: boolean;
  autoSaveInterval: number;
  showCursors: boolean;
  showNames: boolean;
  allowComments: boolean;
  allowVoice: boolean;
}

export interface RoomPermissions {
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  canDelete: boolean;
  canExport: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// التعليقات
// ═══════════════════════════════════════════════════════════════════════════

export interface Comment {
  id: string;
  elementId?: string;
  position: Point;
  text: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  resolved: boolean;
  replies: CommentReply[];
  reactions: CommentReaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentReply {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: Date;
}

export interface CommentReaction {
  emoji: string;
  userIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// أحداث التعاون
// ═══════════════════════════════════════════════════════════════════════════

export type CollaborationEventType = 
  | 'user:join'
  | 'user:leave'
  | 'cursor:move'
  | 'selection:change'
  | 'element:create'
  | 'element:update'
  | 'element:delete'
  | 'comment:add'
  | 'comment:resolve'
  | 'viewport:change'
  | 'sync:complete';

export interface CollaborationEvent<T = unknown> {
  type: CollaborationEventType;
  userId: string;
  timestamp: number;
  data: T;
}

// ═══════════════════════════════════════════════════════════════════════════
// حالة الاتصال
// ═══════════════════════════════════════════════════════════════════════════

export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  latency: number;
  lastSync: Date | null;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// مزامنة البيانات
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  elementId: string;
  data: Partial<CanvasElement>;
  timestamp: number;
  userId: string;
}

export interface SyncState {
  pendingOperations: SyncOperation[];
  lastSyncedAt: Date | null;
  conflictCount: number;
  isSyncing: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ألوان المتعاونين
// ═══════════════════════════════════════════════════════════════════════════

export const COLLABORATOR_COLORS = [
  '#ef4444', // أحمر
  '#f97316', // برتقالي
  '#eab308', // أصفر
  '#22c55e', // أخضر
  '#14b8a6', // تركوازي
  '#3b82f6', // أزرق
  '#8b5cf6', // بنفسجي
  '#ec4899', // وردي
  '#06b6d4', // سماوي
  '#84cc16', // ليموني
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// مساعدات التعاون
// ═══════════════════════════════════════════════════════════════════════════

export function getRandomCollaboratorColor(): string {
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
