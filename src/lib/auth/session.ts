import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { AuthProfile } from "@/types/auth";
import { serverEnv } from "@/lib/env";

const SESSION_COOKIE = "cccways_session";
const REFRESH_COOKIE = "cccways_refresh";

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
