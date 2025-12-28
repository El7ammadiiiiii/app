/**
 * Integration Status Route
 * الحصول على حالة جميع التكاملات
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase/admin";
import { getServerSession } from "@/lib/auth/session";
import { providerRegistry } from "@/lib/auth/providers";

// Import all providers to register them
import "@/lib/auth/providers/canva";
import "@/lib/auth/providers/stripe";
import "@/lib/auth/providers/monday";
import "@/lib/auth/providers/telegram";
import "@/lib/auth/providers/alpaca";
import "@/lib/auth/providers/discord";
import "@/lib/auth/providers/twitter";

export interface IntegrationStatus {
  provider: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  isConnected: boolean;
  connectedAt?: Date;
  profile?: Record<string, unknown>;
  expiresAt?: Date;
  scopes?: string[];
}

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all user integrations from Firestore
    const db = getDb();
    const integrationsSnapshot = await db
      .collection("users")
      .doc(session.user.uid)
      .collection("integrations")
      .get();

    const connectedIntegrations = new Map<string, unknown>();
    integrationsSnapshot.forEach((doc) => {
      connectedIntegrations.set(doc.id, {
        ...doc.data(),
        connectedAt: doc.data().connectedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
      });
    });

    // Build status for all available providers
    const statuses: IntegrationStatus[] = [];

    for (const [type, provider] of providerRegistry) {
      const config = provider.getConfig();
      const connected = connectedIntegrations.get(type);

      statuses.push({
        provider: type,
        name: config.name,
        nameAr: config.nameAr,
        icon: config.icon,
        color: config.color,
        isConnected: !!connected,
        // @ts-expect-error - dynamic access
        connectedAt: connected?.connectedAt,
        // @ts-expect-error - dynamic access
        profile: connected?.profile,
        // @ts-expect-error - dynamic access
        expiresAt: connected?.expiresAt,
        // @ts-expect-error - dynamic access
        scopes: connected?.scopes,
      });
    }

    return NextResponse.json({
      integrations: statuses,
      userId: session.user.uid,
    });
  } catch (error) {
    console.error("Get integrations status error:", error);
    return NextResponse.json(
      { error: "Failed to get integrations status" },
      { status: 500 }
    );
  }
}
