"use client";

import { create } from "zustand";
import type { AuthProfile } from "@/types/auth";

type AuthState = {
  profile: AuthProfile | null;
  loading: boolean;
  setProfile: (profile: AuthProfile | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  loading: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
