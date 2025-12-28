/**
 * Integration Webhooks Route
 * معالجة webhooks من التطبيقات الخارجية
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/firebase/admin";

// Webhook handlers for different providers
type WebhookHandler = (payload: unknown, headers: Headers) => Promise<{
  success: boolean;
  message?: string;
}>;

const webhookHandlers: Record<string, WebhookHandler> = {
  /**
   * Stripe webhook handler
   */
  stripe: async (payload: unknown, headers: Headers) => {
    const signature = headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    // Verify signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    // In production, use Stripe SDK to verify
    // const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    const event = payload as { type: string; data: { object: unknown } };

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        // Handle successful payment
        
        break;
      case "customer.subscription.updated":
        // Handle subscription update
        
        break;
      case "customer.subscription.deleted":
        // Handle subscription cancellation
        
        break;
    }

    return { success: true, message: `Processed ${event.type}` };
  },

  /**
   * Telegram webhook handler
   */
  telegram: async (payload: unknown) => {
    const update = payload as {
      message?: {
        chat: { id: number };
        from: { id: number; username?: string };
        text?: string;
      };
      callback_query?: {
        id: string;
        from: { id: number };
        data?: string;
      };
    };

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";
      const userId = update.message.from.id;

      // Handle /start command
      if (text.startsWith("/start")) {
        // Link telegram user with app user
        const linkToken = text.replace("/start ", "").trim();
        if (linkToken) {
          // Find user with this link token and update their telegram chat ID
          const db = getDb();
          const usersSnapshot = await db
            .collection("users")
            .where("telegramLinkToken", "==", linkToken)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({
              telegramChatId: chatId.toString(),
              telegramUserId: userId.toString(),
              telegramUsername: update.message.from.username || null,
              telegramLinkedAt: new Date(),
            });
            
            return { success: true, message: "Telegram linked successfully" };
          }
        }
      }

      // Handle other commands
      if (text === "/alerts") {
        // Return user's active alerts
        return { success: true, message: "Alerts command processed" };
      }
    }

    return { success: true };
  },

  /**
   * Discord webhook handler
   */
  discord: async (payload: unknown, headers: Headers) => {
    const signature = headers.get("x-signature-ed25519");
    const timestamp = headers.get("x-signature-timestamp");

    if (!signature || !timestamp) {
      throw new Error("Missing Discord signature");
    }

    // Verify signature using Discord public key
    // In production, use discord-interactions package

    const interaction = payload as {
      type: number;
      data?: { name: string; options?: unknown[] };
    };

    // Type 1 = PING
    if (interaction.type === 1) {
      return { success: true, message: "PONG" };
    }

    // Type 2 = APPLICATION_COMMAND
    if (interaction.type === 2) {
      const commandName = interaction.data?.name;
      
      // Handle slash commands
    }

    return { success: true };
  },

  /**
   * Alpaca webhook handler (trade updates)
   */
  alpaca: async (payload: unknown) => {
    const event = payload as {
      event: string;
      order?: {
        id: string;
        symbol: string;
        side: string;
        qty: string;
        filled_qty: string;
        status: string;
      };
    };

    

    // Handle trade updates
    if (event.event === "fill" && event.order) {
      // Order filled - could trigger notification
      
    }

    return { success: true, message: `Processed ${event.event}` };
  },
};

export async function POST(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get("provider");
    
    if (!provider || !webhookHandlers[provider]) {
      return NextResponse.json(
        { error: "Unknown webhook provider" },
        { status: 400 }
      );
    }

    // Parse payload based on content type
    const contentType = request.headers.get("content-type") || "";
    let payload: unknown;

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData);
    } else {
      payload = await request.text();
    }

    // Call provider-specific handler
    const handler = webhookHandlers[provider];
    const result = await handler(payload, request.headers);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha512" = "sha256"
): boolean {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
