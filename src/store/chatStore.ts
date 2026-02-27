"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { FirestoreChatService } from "@/lib/services/firestoreChatService";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
export interface ChatMessage
{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    attachments?: {
        type: "image" | "file" | "code";
        url?: string;
        name?: string;
        content?: string;
    }[];
    metadata?: {
        model?: string;
        tokens?: number;
        reasoning?: string;
        sources?: string[];
        canvasArtifactId?: string;
    };
}

export interface Chat
{
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    isPinned: boolean;
    isArchived: boolean;
    isBranch?: boolean;
    branchFromId?: string;
    branchFromMessageId?: string;
}

interface ChatStoreState
{
    chats: Chat[];
    activeChatId: string | null;
    searchQuery: string;
    soundEnabled: boolean;
}

interface ChatStoreActions
{
    // ─── المحادثات ───
    createChat: ( title?: string ) => Chat;
    updateChat: ( id: string, updates: Partial<Chat> ) => void;
    deleteChat: ( id: string ) => void;
    archiveChat: ( id: string ) => void;
    pinChat: ( id: string ) => void;
    setActiveChat: ( id: string | null ) => void;

    // ─── الرسائل ───
    addMessage: ( chatId: string, message: Omit<ChatMessage, "id" | "timestamp"> ) => ChatMessage;
    updateMessage: ( chatId: string, messageId: string, updates: Partial<ChatMessage> ) => void;

    // ─── البحث ───
    setSearchQuery: ( query: string ) => void;

    // ─── الإعدادات ───
    toggleSound: () => void;

    // ─── Getters ───
    getActiveChat: () => Chat | null;
    getFilteredChats: () => Chat[];
    searchChats: ( query: string ) => Chat[];

    // ─── Wave 3.1: Firestore sync ───
    hydrateFromFirestore: () => Promise<void>;
    _syncToFirestore: ( chat: Chat ) => void;
}

type ChatStore = ChatStoreState & ChatStoreActions;

// ═══════════════════════════════════════════════════════════════
// Initial State
// ═══════════════════════════════════════════════════════════════
const initialState: ChatStoreState = {
    chats: [],
    activeChatId: null,
    searchQuery: "",
    soundEnabled: true,
};

// ═══════════════════════════════════════════════════════════════
// Chat Store
// ═══════════════════════════════════════════════════════════════
export const useChatStore = create<ChatStore>()(
    persist(
        ( set, get ) => ( {
            ...initialState,

            // ═══════════════════════════════════════════════════════════
            // المحادثات
            // ═══════════════════════════════════════════════════════════
            createChat: ( title?: string ) =>
            {
                const chatCount = get().chats.length;

                const newChat: Chat = {
                    id: uuidv4(),
                    title: title || `محادثة جديدة`,
                    messages: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isPinned: false,
                    isArchived: false,
                };

                set( ( state ) => ( {
                    chats: [ ...state.chats, newChat ],
                    activeChatId: newChat.id,
                } ) );

                // Wave 3.1: async Firestore write
                get()._syncToFirestore( newChat );

                return newChat;
            },

            updateChat: ( id: string, updates: Partial<Chat> ) =>
            {
                set( ( state ) => ( {
                    chats: state.chats.map( ( c ) =>
                        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
                    ),
                } ) );
                // Wave 3.1: sync
                const chat = get().chats.find( c => c.id === id );
                if ( chat ) get()._syncToFirestore( chat );
            },

            deleteChat: ( id: string ) =>
            {
                set( ( state ) => ( {
                    chats: state.chats.filter( ( c ) => c.id !== id ),
                    activeChatId: state.activeChatId === id ? null : state.activeChatId,
                } ) );
                // Wave 3.1: delete from Firestore
                FirestoreChatService.deleteChat( id );
            },

            archiveChat: ( id: string ) =>
            {
                set( ( state ) => ( {
                    chats: state.chats.map( ( c ) =>
                        c.id === id ? { ...c, isArchived: !c.isArchived, updatedAt: new Date() } : c
                    ),
                } ) );
                const chat = get().chats.find( c => c.id === id );
                if ( chat ) get()._syncToFirestore( chat );
            },

            pinChat: ( id: string ) =>
            {
                set( ( state ) => ( {
                    chats: state.chats.map( ( c ) =>
                        c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date() } : c
                    ),
                } ) );
                const chat = get().chats.find( c => c.id === id );
                if ( chat ) get()._syncToFirestore( chat );
            },

            setActiveChat: ( id: string | null ) =>
            {
                set( { activeChatId: id } );
            },

            // ═══════════════════════════════════════════════════════════
            // الرسائل
            // ═══════════════════════════════════════════════════════════
            addMessage: ( chatId: string, message: Omit<ChatMessage, "id" | "timestamp"> ) =>
            {
                const newMessage: ChatMessage = {
                    ...message,
                    id: uuidv4(),
                    timestamp: new Date(),
                };

                set( ( state ) => ( {
                    chats: state.chats.map( ( c ) =>
                        c.id === chatId
                            ? {
                                ...c,
                                messages: [ ...c.messages, newMessage ],
                                updatedAt: new Date(),
                                title: c.messages.length === 0 && message.role === "user"
                                    ? message.content.slice( 0, 50 ) + ( message.content.length > 50 ? "..." : "" )
                                    : c.title,
                            }
                            : c
                    ),
                } ) );

                // Wave 3.1: sync after adding message
                const chat = get().chats.find( c => c.id === chatId );
                if ( chat ) get()._syncToFirestore( chat );

                return newMessage;
            },

            updateMessage: ( chatId: string, messageId: string, updates: Partial<ChatMessage> ) =>
            {
                set( ( state ) => ( {
                    chats: state.chats.map( ( c ) =>
                        c.id === chatId
                            ? {
                                ...c,
                                messages: c.messages.map( ( m ) =>
                                    m.id === messageId ? { ...m, ...updates } : m
                                ),
                                updatedAt: new Date(),
                            }
                            : c
                    ),
                } ) );
                // Note: updateMessage is called on every streaming chunk.
                // Firestore sync happens when streaming ends (via the final save in chat-area).
            },

            // ═══════════════════════════════════════════════════════════
            // البحث
            // ═══════════════════════════════════════════════════════════
            setSearchQuery: ( query: string ) =>
            {
                set( { searchQuery: query } );
            },

            // ═══════════════════════════════════════════════════════════
            // الإعدادات
            // ═══════════════════════════════════════════════════════════
            toggleSound: () =>
            {
                set( ( state ) => ( { soundEnabled: !state.soundEnabled } ) );
            },

            // ═══════════════════════════════════════════════════════════
            // Getters
            // ═══════════════════════════════════════════════════════════
            getActiveChat: () =>
            {
                const { chats, activeChatId } = get();
                return chats.find( ( c ) => c.id === activeChatId ) || null;
            },

            getFilteredChats: () =>
            {
                const { chats, searchQuery } = get();
                if ( !searchQuery ) return chats.filter( c => !c.isArchived );

                return chats.filter(
                    ( c ) =>
                        !c.isArchived &&
                        ( c.title.toLowerCase().includes( searchQuery.toLowerCase() ) ||
                            c.messages.some( ( m ) =>
                                m.content.toLowerCase().includes( searchQuery.toLowerCase() )
                            ) )
                );
            },

            searchChats: ( query: string ) =>
            {
                const { chats } = get();
                if ( !query ) return chats;

                return chats.filter(
                    ( c ) =>
                        c.title.toLowerCase().includes( query.toLowerCase() ) ||
                        c.messages.some( ( m ) =>
                            m.content.toLowerCase().includes( query.toLowerCase() )
                        )
                );
            },

            // ═══════════════════════════════════════════════════════════
            // Wave 3.1: Firestore Sync
            // ═══════════════════════════════════════════════════════════
            hydrateFromFirestore: async () =>
            {
                if ( !FirestoreChatService.isReady() ) return;
                try
                {
                    const cloudChats = await FirestoreChatService.loadAll();
                    if ( cloudChats.length === 0 ) return;

                    const localChats = get().chats;
                    // Merge: cloud chats that don't exist locally get added
                    const localIds = new Set( localChats.map( c => c.id ) );
                    const newChats = cloudChats.filter( c => !localIds.has( c.id ) );
                    // For existing chats, use the one with later updatedAt
                    const mergedLocal = localChats.map( local =>
                    {
                        const cloud = cloudChats.find( c => c.id === local.id );
                        if ( !cloud ) return local;
                        return new Date( cloud.updatedAt ) > new Date( local.updatedAt ) ? cloud : local;
                    } );

                    set( { chats: [ ...mergedLocal, ...newChats ] } );
                    console.log( `[ChatStore] Hydrated ${ newChats.length } new + ${ mergedLocal.length } merged from Firestore` );
                } catch ( error )
                {
                    console.warn( "[ChatStore] Firestore hydration failed:", error );
                }
            },

            // Debounced write-through (fire-and-forget)
            _syncToFirestore: ( chat: Chat ) =>
            {
                // Use a microtask to avoid blocking UI
                queueMicrotask( () =>
                {
                    FirestoreChatService.saveChat( chat ).catch( () => { } );
                } );
            },
        } ),
        {
            name: "chat-store",
            partialize: ( state ) => ( {
                chats: state.chats,
                activeChatId: state.activeChatId,
                soundEnabled: state.soundEnabled,
            } ),
        }
    )
);

// Legacy compatibility - re-export with old name
export const useProjectStore = useChatStore;
