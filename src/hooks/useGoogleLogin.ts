"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";

interface GoogleStartResponse {
  clientId: string;
  scope: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup" | "redirect";
            callback: (response: { code?: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

export const useGoogleLogin = () => {
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);

  return useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google/start");
      if (!res.ok) throw new Error("Unable to start Google flow");
      const config = (await res.json()) as GoogleStartResponse;
      const google = window.google;
      if (!google?.accounts?.oauth2) {
        throw new Error("Google Identity Services not loaded");
      }
      const client = google.accounts.oauth2.initCodeClient({
        client_id: config.clientId,
        scope: config.scope,
        ux_mode: "popup",
        callback: async (response) => {
          if (response.error || !response.code) {
            console.error("Google auth error", response.error);
            setLoading(false);
            return;
          }
          const tokenRes = await fetch("/api/auth/google/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: response.code }),
          });
          if (!tokenRes.ok) {
            console.error("Failed to complete Google login");
            setLoading(false);
            return;
          }
          const data = await tokenRes.json();
          setProfile(data.profile);
          setLoading(false);
        },
      });
      client.requestCode();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [setLoading, setProfile]);
};
