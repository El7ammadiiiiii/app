import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { AuthProfile } from "@/types/auth";
import { serverEnv } from "@/lib/env";

const SESSION_COOKIE = "CCWAYS_session";
const REFRESH_COOKIE = "CCWAYS_refresh";

export const createSession = async (profile: AuthProfile, refreshToken: string) => {
  const token = jwt.sign(profile, serverEnv.SESSION_SECRET, { expiresIn: "2h" });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 2,
    path: "/",
  });
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
};

export const destroySession = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
};

export const readRefreshToken = async () => (await cookies()).get(REFRESH_COOKIE)?.value;

export const readSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, serverEnv.SESSION_SECRET) as AuthProfile;
  } catch {
    return null;
  }
};

export interface Session {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const profile = jwt.verify(sessionCookie.value, serverEnv.SESSION_SECRET) as AuthProfile;
    return {
      user: {
        uid: profile.googleUid,
        email: profile.email,
        name: profile.fullName,
      }
    };
  } catch {
    return null;
  }
}
