/**
 * OAuth Callback Route
 * معالجة callback من OAuth providers
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider, ProviderType } from "@/lib/auth/providers";
import { cookies } from "next/headers";
import { getDb } from "@/lib/firebase/admin";
import { getServerSession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerName } = await params;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get("error_description") || error;
      console.error(`OAuth error from ${providerName}:`, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    // Validate code
    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=no_code", request.url)
      );
    }

    // Validate state (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get(`oauth_state_${providerName}`)?.value;

    if (!state || state !== storedState) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=invalid_state", request.url)
      );
    }

    // Clear state cookie
    cookieStore.delete(`oauth_state_${providerName}`);

    // Get provider
    const provider = getProvider(providerName as ProviderType);
    if (!provider) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=unknown_provider", request.url)
      );
    }

    // Get current user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.redirect(
        new URL("/login?redirect=/settings/integrations", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await provider.exchangeCode(code);

    // Get user profile from provider
    let providerProfile: Record<string, unknown> = {};
    try {
      providerProfile = await provider.getUserProfile(tokens.accessToken);
    } catch (profileError) {
      console.warn(`Could not fetch ${providerName} profile:`, profileError);
    }

    // Save integration to Firestore
    const db = getDb();
    const integrationRef = db
      .collection("users")
      .doc(session.user.uid)
      .collection("integrations")
      .doc(providerName);

    await integrationRef.set({
      provider: providerName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      expiresAt: tokens.expiresAt || null,
      scopes: provider.getConfig().scopes,
      connectedAt: new Date(),
      isActive: true,
      profile: providerProfile,
      metadata: {
        tokenType: tokens.tokenType,
        scope: tokens.scope,
      },
    });

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      new URL(`/settings/integrations?success=${providerName}`, request.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=callback_failed", request.url)
    );
  }
}
