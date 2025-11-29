import { NextResponse } from "next/server";

import { exchangeCodeForTokens, fetchGoogleProfile } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { findUserByEmail, upsertUserProfile } from "@/lib/firestore/users";
import type { AuthProfile } from "@/types/auth";

export async function POST(request: Request) {
  const { code } = await request.json();
  if (!code) {
    return NextResponse.json({ message: "Missing authorization code" }, { status: 400 });
  }
  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleProfile = await fetchGoogleProfile(tokens.access_token);
    const profile: AuthProfile = {
      googleUid: googleProfile.id,
      email: googleProfile.email,
      fullName: googleProfile.name,
      photoUrl: googleProfile.picture,
    };

    const existing = await findUserByEmail(profile.email);
    const docId = existing?.id ?? profile.googleUid;
    await upsertUserProfile(profile, { accessToken: tokens.access_token, refreshToken: tokens.refresh_token }, docId);
    await createSession(profile, tokens.refresh_token);

    return NextResponse.json({ profile }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Google callback error", error);
    return NextResponse.json({ message: "Google authentication failed" }, { status: 500 });
  }
}
