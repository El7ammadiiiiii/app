import { NextResponse } from "next/server";

import { refreshAccessToken, fetchGoogleProfile } from "@/lib/auth/google";
import { readRefreshToken, readSession, createSession } from "@/lib/auth/session";
import { upsertUserProfile } from "@/lib/firestore/users";
import type { AuthProfile } from "@/types/auth";

export async function POST(request: Request) {
  const { refreshToken: bodyToken } = await request.json().catch(() => ({ refreshToken: undefined }));
  const cookieToken = await readRefreshToken();
  const refreshToken = bodyToken ?? cookieToken;
  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }
  try {
    const tokens = await refreshAccessToken(refreshToken);
    let profile = await readSession() as AuthProfile | null;
    if (!profile) {
      const googleProfile = await fetchGoogleProfile(tokens.access_token);
      profile = {
        googleUid: googleProfile.id,
        email: googleProfile.email,
        fullName: googleProfile.name,
        photoUrl: googleProfile.picture,
      };
    }
    await upsertUserProfile(profile, {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? refreshToken,
    });
    await createSession(profile, tokens.refresh_token ?? refreshToken);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Refresh error", error);
    return NextResponse.json({ message: "Unable to refresh session" }, { status: 401 });
  }
}
