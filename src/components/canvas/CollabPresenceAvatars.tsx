'use client';

import { memo } from 'react';
import type { CollabPeer } from '@/hooks/useCollaborativeCanvas';

interface Props {
  peers: CollabPeer[];
  isConnected: boolean;
}

/**
 * Wave 6.5 — Collaborative presence indicator.
 * Shows colored avatars for connected collaborators.
 */
export const CollabPresenceAvatars = memo(function CollabPresenceAvatars({ peers, isConnected }: Props) {
  if (!isConnected && peers.length === 0) return null;

  return (
    <div className="flex items-center gap-1" aria-label="مستخدمون متصلون" role="status">
      {/* Connection dot */}
      <span
        className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`}
        title={isConnected ? 'متصل' : 'جاري الاتصال...'}
      />

      {/* Peer avatars — stacked with negative margin */}
      <div className="flex -space-x-1.5 rtl:space-x-reverse">
        {peers.slice(0, 5).map((peer) => (
          <div
            key={peer.clientId}
            className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: peer.color }}
            title={peer.name}
          >
            {peer.name.charAt(0)}
          </div>
        ))}
        {peers.length > 5 && (
          <div
            className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground"
            title={`+${peers.length - 5} آخرون`}
          >
            +{peers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
});
