/**
 * Telegram Bot Provider
 * تكامل مع Telegram للإشعارات والتنبيهات
 * ملاحظة: Telegram يستخدم Bot Token بدلاً من OAuth
 */

import { OAuthProvider, OAuthTokens, registerProvider } from "./base";

class TelegramProvider extends OAuthProvider {
  constructor() {
    super({
      name: "Telegram",
      nameAr: "تيليجرام",
      icon: "📱",
      color: "bg-blue-500",
      scopes: [],
      authUrl: "",
      tokenUrl: "",
      clientId: process.env.TELEGRAM_BOT_TOKEN || "",
      clientSecret: "",
      redirectUri: "",
    });
  }

  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || this.config.clientId;
  }

  /**
   * Telegram uses Login Widget instead of OAuth
   * Returns the widget configuration
   */
  getAuthUrl(state: string): string {
    // Telegram uses a widget-based auth
    // Return URL to our custom auth page
    return `/api/integrations/telegram/auth?state=${state}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    // Telegram login widget returns user data directly
    // Code here is actually the telegram user data hash
    return {
      accessToken: code,
      tokenType: "telegram",
    };
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    // Telegram tokens don't expire
    throw new Error("Telegram tokens don't need refresh");
  }

  async getUserProfile(): Promise<Record<string, unknown>> {
    // Get bot info
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/getMe`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Telegram bot info: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result || {};
  }

  async revokeToken(): Promise<void> {
    // Telegram bot tokens can't be revoked programmatically
  }

  /**
   * Send message to a chat
   */
  async sendMessage(chatId: string, text: string, options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    disableNotification?: boolean;
  }): Promise<unknown> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode || "HTML",
          disable_notification: options?.disableNotification || false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send Telegram message: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send trading alert
   */
  async sendTradingAlert(chatId: string, alert: {
    symbol: string;
    type: "buy" | "sell" | "alert";
    price: number;
    message: string;
  }): Promise<unknown> {
    const emoji = alert.type === "buy" ? "🟢" : alert.type === "sell" ? "🔴" : "⚠️";
    const text = `
${emoji} <b>${alert.type.toUpperCase()} Signal</b>

📊 <b>Symbol:</b> ${alert.symbol}
💰 <b>Price:</b> $${alert.price.toLocaleString()}
📝 <b>Message:</b> ${alert.message}

⏰ ${new Date().toLocaleString("ar-SA")}
    `.trim();

    return this.sendMessage(chatId, text, { parseMode: "HTML" });
  }

  /**
   * Send whale alert
   */
  async sendWhaleAlert(chatId: string, alert: {
    symbol: string;
    amount: number;
    amountUsd: number;
    from: string;
    to: string;
    type: "exchange_inflow" | "exchange_outflow" | "whale_transfer";
  }): Promise<unknown> {
    const emoji = alert.type === "exchange_inflow" ? "🔴" : alert.type === "exchange_outflow" ? "🟢" : "🐋";
    const typeText = {
      exchange_inflow: "تدفق للمنصة",
      exchange_outflow: "خروج من المنصة",
      whale_transfer: "تحويل حوت",
    }[alert.type];

    const text = `
${emoji} <b>تنبيه حوت - ${typeText}</b>

📊 <b>العملة:</b> ${alert.symbol}
💰 <b>الكمية:</b> ${alert.amount.toLocaleString()} ${alert.symbol}
💵 <b>القيمة:</b> $${alert.amountUsd.toLocaleString()}
📤 <b>من:</b> <code>${alert.from.slice(0, 10)}...</code>
📥 <b>إلى:</b> <code>${alert.to.slice(0, 10)}...</code>

⏰ ${new Date().toLocaleString("ar-SA")}
    `.trim();

    return this.sendMessage(chatId, text, { parseMode: "HTML" });
  }
}

registerProvider("telegram", new TelegramProvider());
export { TelegramProvider };
