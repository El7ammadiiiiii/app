"use client";

/**
 * ── Wave 3: Firestore Hydrator ──
 * ── Wave 6.2: Feature Flags initialization ──
 * 
 * Runs once on mount to hydrate Zustand stores from Firestore
 * and initialize feature flags from Firebase Remote Config.
 * Place in layout above {children} — renders nothing.
 */

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useFeatureFlags } from "@/store/featureFlagStore";

export default function FirestoreHydrator ()
{
  const hydrated = useRef( false );

  useEffect( () =>
  {
    if ( hydrated.current ) return;
    hydrated.current = true;

    // Hydrate chats from Firestore (merge with localStorage)
    const chatHydrate = useChatStore.getState().hydrateFromFirestore;
    if ( typeof chatHydrate === "function" )
    {
      chatHydrate().catch( ( e: unknown ) =>
        console.warn( "[FirestoreHydrator] chat hydration failed:", e )
      );
    }

    // Hydrate canvas artifacts from Firestore
    const canvasHydrate = useCanvasStore.getState().hydrateArtifactsFromFirestore;
    if ( typeof canvasHydrate === "function" )
    {
      canvasHydrate().catch( ( e: unknown ) =>
        console.warn( "[FirestoreHydrator] canvas hydration failed:", e )
      );
    }

    // Wave 6.2: Initialize feature flags from Firebase Remote Config
    useFeatureFlags.getState().initialize().catch( ( e: unknown ) =>
      console.warn( "[FirestoreHydrator] feature flags init failed:", e )
    );
  }, [] );

  return null;
}
