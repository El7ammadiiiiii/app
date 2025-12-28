/**
 * Disconnect Integration Route
 * فصل التكامل وإلغاء الصلاحيات
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider, ProviderType } from "@/lib/auth/providers";
import { getDb } from "@/lib/firebase/admin";
import { getServerSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerName } = await params;

    // Get current user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get provider
    const provider = getProvider(providerName as ProviderType);
    if (!provider) {
      return NextResponse.json(
        { error: "Unknown provider" },
        { status: 400 }
      );
    }

    // Get integration from Firestore
    const db = getDb();
    const integrationRef = db
      .collection("users")
      .doc(session.user.uid)
      .collection("integrations")
      .doc(providerName);

    const integrationDoc = await integrationRef.get();

    if (integrationDoc.exists) {
      const integrationData = integrationDoc.data();

      // Try to revoke token at provider
      if (integrationData?.accessToken) {
        try {
          await provider.revokeToken(integrationData.accessToken);
        } catch (revokeError) {
          console.warn(`Could not revoke ${providerName} token:`, revokeError);
        }
      }

      // Delete integration from Firestore
      await integrationRef.delete();
    }

    return NextResponse.json({
      success: true,
      message: `${providerName} integration disconnected`,
    });
  } catch (error) {
    console.error("Disconnect integration error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  return POST(request, { params });
}
