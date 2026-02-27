"use client";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, ensureAnonymousAuth, isFirebaseConfigured } from "@/lib/firebase/client";

// ════════════════════════════════════════════════
// User Profile — Firestore Document Shape
// ════════════════════════════════════════════════
export interface UserProfileDoc {
  displayName: string;
  email: string;
  photoUrl: string;
  plan: "free" | "pro" | "enterprise";
  phone: string;
  occupation: string;
  preferredName: string;
  additionalInfo: string;
  customInstructions: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

const COLLECTION = "users";

const defaultProfile: Omit<UserProfileDoc, "createdAt" | "updatedAt"> = {
  displayName: "",
  email: "",
  photoUrl: "",
  plan: "free",
  phone: "",
  occupation: "",
  preferredName: "",
  additionalInfo: "",
  customInstructions: "",
};

// ════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════

async function getAuthUid(): Promise<string | null> {
  const user = await ensureAnonymousAuth();
  return user?.uid ?? null;
}

function profileRef(uid: string) {
  return doc(db!, COLLECTION, uid);
}

// ════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════

/** Get the current user's profile. Creates if not exists. */
export async function getProfile(): Promise<UserProfileDoc | null> {
  if (!isFirebaseConfigured || !db) return null;
  const uid = await getAuthUid();
  if (!uid) return null;

  const snap = await getDoc(profileRef(uid));
  if (snap.exists()) {
    return snap.data() as UserProfileDoc;
  }

  // Auto-create profile on first visit
  const newProfile: UserProfileDoc = {
    ...defaultProfile,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(profileRef(uid), newProfile);
  return newProfile;
}

/** Update one or more profile fields. */
export async function updateProfile(
  data: Partial<Omit<UserProfileDoc, "createdAt" | "updatedAt">>
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  const uid = await getAuthUid();
  if (!uid) return false;

  try {
    await updateDoc(profileRef(uid), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch {
    // Document may not exist yet — create it with merge
    try {
      await setDoc(
        profileRef(uid),
        { ...data, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
        { merge: true }
      );
      return true;
    } catch {
      return false;
    }
  }
}

/** Get profile field value. */
export async function getProfileField<K extends keyof UserProfileDoc>(
  field: K
): Promise<UserProfileDoc[K] | null> {
  const profile = await getProfile();
  return profile ? profile[field] : null;
}
