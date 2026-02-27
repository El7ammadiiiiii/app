"use client";

/**
 * ── Wave 3.1: Firestore Chat Service ──
 * 
 * CRUD operations for conversations collection in Firestore.
 * Write-through: writes go to both Zustand (instant) and Firestore (async).
 * Load-on-mount: hydrates from Firestore on app start.
 */

import { db, ensureAnonymousAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import
{
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { Chat, ChatMessage } from "@/store/chatStore";

const CONVERSATIONS_COLLECTION = "conversations";
const CANVAS_ARTIFACTS_COLLECTION = "canvas_artifacts";

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function chatToFirestore ( chat: Chat )
{
  return {
    id: chat.id,
    title: chat.title,
    messages: chat.messages.map( msgToFirestore ),
    createdAt: chat.createdAt instanceof Date ? Timestamp.fromDate( chat.createdAt ) : chat.createdAt,
    updatedAt: serverTimestamp(),
    isPinned: chat.isPinned,
    isArchived: chat.isArchived,
    isBranch: chat.isBranch || false,
    branchFromId: chat.branchFromId || null,
    branchFromMessageId: chat.branchFromMessageId || null,
  };
}

function msgToFirestore ( msg: ChatMessage )
{
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp instanceof Date ? Timestamp.fromDate( msg.timestamp ) : msg.timestamp,
    attachments: msg.attachments || [],
    metadata: msg.metadata || {},
  };
}

function firestoreToChat ( data: any ): Chat
{
  return {
    id: data.id,
    title: data.title || "Untitled",
    messages: ( data.messages || [] ).map( firestoreToMessage ),
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    isPinned: data.isPinned || false,
    isArchived: data.isArchived || false,
    isBranch: data.isBranch || false,
    branchFromId: data.branchFromId || undefined,
    branchFromMessageId: data.branchFromMessageId || undefined,
  };
}

function firestoreToMessage ( data: any ): ChatMessage
{
  return {
    id: data.id,
    role: data.role,
    content: data.content || "",
    timestamp: data.timestamp?.toDate?.() || new Date(),
    attachments: data.attachments,
    metadata: data.metadata,
  };
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export const FirestoreChatService = {

  /** Check if Firebase is ready */
  isReady (): boolean
  {
    return isFirebaseConfigured && !!db;
  },

  /** Load all conversations for the current anonymous user */
  async loadAll (): Promise<Chat[]>
  {
    if ( !this.isReady() || !db ) return [];
    try
    {
      const user = await ensureAnonymousAuth();
      if ( !user ) return [];

      const q = query(
        collection( db, CONVERSATIONS_COLLECTION ),
        where( "userId", "==", user.uid ),
        orderBy( "updatedAt", "desc" )
      );
      const snapshot = await getDocs( q );
      return snapshot.docs.map( d => firestoreToChat( d.data() ) );
    } catch ( error )
    {
      console.warn( "[FirestoreChatService] loadAll failed:", error );
      return [];
    }
  },

  /** Save or update a single conversation */
  async saveChat ( chat: Chat ): Promise<void>
  {
    if ( !this.isReady() || !db ) return;
    try
    {
      const user = await ensureAnonymousAuth();
      if ( !user ) return;

      const ref = doc( db, CONVERSATIONS_COLLECTION, chat.id );
      await setDoc( ref, {
        ...chatToFirestore( chat ),
        userId: user.uid,
      }, { merge: true } );
    } catch ( error )
    {
      console.warn( "[FirestoreChatService] saveChat failed:", error );
    }
  },

  /** Delete a conversation */
  async deleteChat ( chatId: string ): Promise<void>
  {
    if ( !this.isReady() || !db ) return;
    try
    {
      await deleteDoc( doc( db, CONVERSATIONS_COLLECTION, chatId ) );
    } catch ( error )
    {
      console.warn( "[FirestoreChatService] deleteChat failed:", error );
    }
  },

  /** Update only specific fields of a conversation */
  async updateChat ( chatId: string, updates: Partial<Chat> ): Promise<void>
  {
    if ( !this.isReady() || !db ) return;
    try
    {
      const ref = doc( db, CONVERSATIONS_COLLECTION, chatId );
      const data: any = { ...updates, updatedAt: serverTimestamp() };
      // Convert messages if present
      if ( data.messages ) data.messages = data.messages.map( msgToFirestore );
      if ( data.createdAt instanceof Date ) data.createdAt = Timestamp.fromDate( data.createdAt );
      delete data.updatedAt; // let serverTimestamp handle it
      await updateDoc( ref, { ...data, updatedAt: serverTimestamp() } );
    } catch ( error )
    {
      console.warn( "[FirestoreChatService] updateChat failed:", error );
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// Canvas Artifacts Firestore Service (Wave 3.2)
// ═══════════════════════════════════════════════════════════════

export const FirestoreCanvasService = {

  isReady (): boolean
  {
    return isFirebaseConfigured && !!db;
  },

  /** Load all canvas artifacts for the current user */
  async loadAll (): Promise<any[]>
  {
    if ( !this.isReady() || !db ) return [];
    try
    {
      const user = await ensureAnonymousAuth();
      if ( !user ) return [];

      const q = query(
        collection( db, CANVAS_ARTIFACTS_COLLECTION ),
        where( "userId", "==", user.uid ),
        orderBy( "updatedAt", "desc" )
      );
      const snapshot = await getDocs( q );
      return snapshot.docs.map( d =>
      {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
        };
      } );
    } catch ( error )
    {
      console.warn( "[FirestoreCanvasService] loadAll failed:", error );
      return [];
    }
  },

  /** Save or update a canvas artifact */
  async saveArtifact ( artifact: any ): Promise<void>
  {
    if ( !this.isReady() || !db ) return;
    try
    {
      const user = await ensureAnonymousAuth();
      if ( !user ) return;

      const ref = doc( db, CANVAS_ARTIFACTS_COLLECTION, artifact.id );
      await setDoc( ref, {
        ...artifact,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        createdAt: artifact.createdAt || serverTimestamp(),
      }, { merge: true } );
    } catch ( error )
    {
      console.warn( "[FirestoreCanvasService] saveArtifact failed:", error );
    }
  },

  /** Delete a canvas artifact */
  async deleteArtifact ( artifactId: string ): Promise<void>
  {
    if ( !this.isReady() || !db ) return;
    try
    {
      await deleteDoc( doc( db, CANVAS_ARTIFACTS_COLLECTION, artifactId ) );
    } catch ( error )
    {
      console.warn( "[FirestoreCanvasService] deleteArtifact failed:", error );
    }
  },
};
