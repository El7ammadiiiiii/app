'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCanvasStore } from '@/store/canvasStore';
import { useFeatureFlags } from '@/store/featureFlagStore';

/* ─────────────────────────────────────────────────────
 * Wave 6.5 · Collaborative Editing via Yjs
 * ─────────────────────────────────────────────────────
 *
 * Architecture:
 *   Y.Doc  ← shared CRDT document per artifact
 *       ↳ yText("code")    → bound to Monaco via y-monaco
 *       ↳ yXmlFragment("richtext") → bound to TipTap via @tiptap/extension-collaboration
 *       ↳ awareness        → cursor colors, user names
 *
 *   WebsocketProvider connects to a y-websocket server.
 *   If no server is available, the hook degrades gracefully
 *   (local-only Y.Doc, no sync).
 *
 * Usage in editors:
 *   const { yDoc, yText, yXmlFragment, provider, awareness, isConnected }
 *     = useCollaborativeCanvas();
 *
 *   // In CodeEditor  → pass yText to MonacoBinding
 *   // In TextEditor  → pass yXmlFragment to Collaboration extension
 * ───────────────────────────────────────────────────── */

// Random user colors for awareness cursors
const COLLAB_COLORS = [
  '#2dd4bf', '#f472b6', '#facc15', '#60a5fa', '#a78bfa',
  '#fb923c', '#4ade80', '#f87171', '#38bdf8', '#c084fc',
];

function randomColor(): string {
  return COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
}

function randomName(): string {
  const names = ['مستخدم', 'محرر', 'متابع', 'مشارك', 'زائر'];
  return `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 100)}`;
}

export interface CollaborativeState {
  /** The shared Y.Doc — null if collab is disabled */
  yDoc: Y.Doc | null;
  /** Y.Text for code editors (Monaco) */
  yText: Y.Text | null;
  /** Y.XmlFragment for rich-text editors (TipTap) */
  yXmlFragment: Y.XmlFragment | null;
  /** WebSocket provider — null if offline or disabled */
  provider: WebsocketProvider | null;
  /** Awareness protocol instance for cursor sharing */
  awareness: WebsocketProvider['awareness'] | null;
  /** Whether WebSocket connection is established */
  isConnected: boolean;
  /** List of connected peers */
  peers: CollabPeer[];
  /** Clean up & disconnect */
  disconnect: () => void;
}

export interface CollabPeer {
  clientId: number;
  name: string;
  color: string;
}

// Default WebSocket server URL — configure via env var
const WS_URL = process.env.NEXT_PUBLIC_YJS_WS_URL || 'ws://localhost:1234';

export function useCollaborativeCanvas(): CollaborativeState {
  const artId = useCanvasStore(s => s.artifactId);
  const flags = useFeatureFlags(s => s.flags);
  const isEnabled = flags.canvas_collab;

  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<CollabPeer[]>([]);

  // Stable user identity for this session
  const userMeta = useMemo(() => ({
    name: randomName(),
    color: randomColor(),
  }), []);

  // Room name — one room per artifact
  const roomName = artId ? `ccways-canvas-${artId}` : null;

  // Setup Y.Doc + Provider when room changes
  useEffect(() => {
    if (!isEnabled || !roomName) {
      // Clean up if disabled or no artifact open
      providerRef.current?.destroy();
      yDocRef.current?.destroy();
      providerRef.current = null;
      yDocRef.current = null;
      setIsConnected(false);
      setPeers([]);
      return;
    }

    const doc = new Y.Doc();
    yDocRef.current = doc;

    let provider: WebsocketProvider | null = null;

    try {
      provider = new WebsocketProvider(WS_URL, roomName, doc, {
        connect: true,
        // Auto-reconnect with exponential backoff
        maxBackoffTime: 10000,
      });
      providerRef.current = provider;

      // Set awareness local state
      provider.awareness.setLocalStateField('user', userMeta);

      // Connection status
      provider.on('status', ({ status }: { status: string }) => {
        setIsConnected(status === 'connected');
      });

      // Peer awareness changes
      const updatePeers = () => {
        const states = provider!.awareness.getStates();
        const peerList: CollabPeer[] = [];
        states.forEach((state, clientId) => {
          if (state.user && clientId !== doc.clientID) {
            peerList.push({
              clientId,
              name: state.user.name || 'مجهول',
              color: state.user.color || '#888',
            });
          }
        });
        setPeers(peerList);
      };

      provider.awareness.on('change', updatePeers);
    } catch {
      // Silently degrade — local-only editing
      console.warn('[collab] WebSocket connection failed, operating in local mode');
    }

    return () => {
      provider?.destroy();
      doc.destroy();
      providerRef.current = null;
      yDocRef.current = null;
      setIsConnected(false);
      setPeers([]);
    };
  }, [isEnabled, roomName, userMeta]);

  // Getter for yText (code editing shared type)
  const yText = useMemo(() => {
    return yDocRef.current?.getText('code') ?? null;
  }, [yDocRef.current]);

  // Getter for yXmlFragment (rich-text shared type)
  const yXmlFragment = useMemo(() => {
    return yDocRef.current?.getXmlFragment('richtext') ?? null;
  }, [yDocRef.current]);

  const disconnect = useCallback(() => {
    providerRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  return {
    yDoc: yDocRef.current,
    yText,
    yXmlFragment,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness ?? null,
    isConnected,
    peers,
    disconnect,
  };
}

/* ─────────────────────────────────────────────────────
 * Presence Avatars Component → see CollabPresenceAvatars.tsx
 * ───────────────────────────────────────────────────── */
