"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 6.2 — Feature Flags via Firebase Remote Config
 * ═══════════════════════════════════════════════════════════════
 * Provides `useFeatureFlags()` hook + `FeatureFlagProvider` component.
 * Falls back to local defaults when Remote Config is unavailable.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ═══ Default Feature Flags (local fallbacks) ═══
export interface FeatureFlags {
  /** Enable canvas collaborative editing (yjs) */
  canvas_collab: boolean;
  /** Enable code execution (Pyodide sandbox) */
  code_execution: boolean;
  /** Enable push notifications */
  push_notifications: boolean;
  /** Enable canvas publish/share feature */
  canvas_publish: boolean;
  /** Enable deep research mode */
  deep_research: boolean;
  /** Enable Altra agent */
  altra_agent: boolean;
  /** Enable video generation tool */
  video_generation: boolean;
  /** Enable image generation tool */
  image_generation: boolean;
  /** Max canvas artifacts per user */
  max_canvas_artifacts: number;
  /** Rate limit per minute for API calls */
  api_rate_limit: number;
  /** Enable OCR tool */
  ocr_tool: boolean;
  /** Enable canvas slides renderer */
  canvas_slides: boolean;
  /** Enable canvas map renderer */
  canvas_map: boolean;
  /** Enable canvas email renderer */
  canvas_email: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  canvas_collab: false,
  code_execution: false,
  push_notifications: true,
  canvas_publish: true,
  deep_research: true,
  altra_agent: true,
  video_generation: true,
  image_generation: true,
  max_canvas_artifacts: 100,
  api_rate_limit: 60,
  ocr_tool: true,
  canvas_slides: true,
  canvas_map: true,
  canvas_email: true,
};

interface FeatureFlagState {
  flags: FeatureFlags;
  isLoaded: boolean;
  lastFetched: number;
  /** Initialize flags — try Remote Config, fall back to defaults */
  initialize: () => Promise<void>;
  /** Get a specific flag value */
  getFlag: <K extends keyof FeatureFlags>(key: K) => FeatureFlags[K];
  /** Override a flag locally (for testing/admin) */
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void;
}

export const useFeatureFlags = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      flags: { ...DEFAULT_FLAGS },
      isLoaded: false,
      lastFetched: 0,

      initialize: async () => {
        try {
          // Dynamic import to avoid SSR issues
          const { getApp } = await import("firebase/app");
          const { getRemoteConfig, fetchAndActivate, getAll } = await import(
            "firebase/remote-config"
          );

          const app = getApp();
          const remoteConfig = getRemoteConfig(app);

          // Set minimum fetch interval (12 hours for production)
          remoteConfig.settings.minimumFetchIntervalMillis =
            process.env.NODE_ENV === "development" ? 60000 : 43200000;

          // Set defaults
          remoteConfig.defaultConfig = DEFAULT_FLAGS as Record<string, string | number | boolean>;

          await fetchAndActivate(remoteConfig);

          const allValues = getAll(remoteConfig);
          const fetchedFlags: Partial<FeatureFlags> = {};

          for (const [key, value] of Object.entries(allValues)) {
            if (key in DEFAULT_FLAGS) {
              const defaultValue = DEFAULT_FLAGS[key as keyof FeatureFlags];
              if (typeof defaultValue === "boolean") {
                (fetchedFlags as any)[key] = value.asBoolean();
              } else if (typeof defaultValue === "number") {
                (fetchedFlags as any)[key] = value.asNumber();
              } else {
                (fetchedFlags as any)[key] = value.asString();
              }
            }
          }

          set({
            flags: { ...DEFAULT_FLAGS, ...fetchedFlags },
            isLoaded: true,
            lastFetched: Date.now(),
          });

          console.log("[FeatureFlags] Remote Config loaded", fetchedFlags);
        } catch (e) {
          // Fallback to defaults — this is fine, Remote Config may not be set up
          console.warn("[FeatureFlags] Remote Config unavailable, using defaults:", e);
          set({ isLoaded: true, lastFetched: Date.now() });
        }
      },

      getFlag: (key) => get().flags[key],

      setFlag: (key, value) => {
        set({ flags: { ...get().flags, [key]: value } });
      },
    }),
    {
      name: "ccways-feature-flags",
      partialize: (state) => ({
        flags: state.flags,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
