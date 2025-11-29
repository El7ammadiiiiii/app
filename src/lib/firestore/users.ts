import { FieldValue } from "firebase-admin/firestore";

import { getDb } from "@/lib/firebase/admin";
import { encryptToken } from "@/lib/security/tokens";
import { serverEnv } from "@/lib/env";
import type { AuthProfile, StoredAuthProfile } from "@/types/auth";

const COLLECTION = "users";

export const upsertUserProfile = async (
  payload: AuthProfile,
  tokens: { accessToken: string; refreshToken: string },
  docId?: string,
) => {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(docId ?? payload.googleUid);
  const encryptedAccess = encryptToken(tokens.accessToken, serverEnv.TOKEN_ENCRYPTION_KEY);
  const encryptedRefresh = encryptToken(tokens.refreshToken, serverEnv.TOKEN_ENCRYPTION_KEY);

  await docRef.set(
    {
      ...payload,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const findUserByEmail = async (email: string): Promise<StoredAuthProfile | null> => {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as StoredAuthProfile) };
};

export const findUserByGoogleUid = async (uid: string): Promise<StoredAuthProfile | null> => {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as StoredAuthProfile) };
};
