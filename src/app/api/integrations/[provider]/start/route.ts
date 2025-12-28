/**
 * Integration Start Route
 * بدء عملية OAuth لمزود معين
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider, ProviderType } from "@/lib/auth/providers";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerName } = await params;
    const provider = getProvider(providerName as ProviderType);

    if (!provider) {
      return NextResponse.json(
        { error: "Unknown provider", provider: providerName },
        { status: 400 }
      );
    }

    // Generate state for CSRF protection
    const state = uuidv4();
    
    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set(`oauth_state_${providerName}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Generate authorization URL
    const authUrl = provider.getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Integration start error:", error);
    return NextResponse.json(
      { error: "Failed to start integration" },
      { status: 500 }
    );
  }
}
