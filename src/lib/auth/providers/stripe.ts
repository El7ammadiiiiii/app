/**
 * Stripe Integration Provider
 * تكامل مع Stripe للمدفوعات
 * ملاحظة: Stripe يستخدم API Keys بدلاً من OAuth
 */

import { OAuthProvider, OAuthTokens, registerProvider } from "./base";

class StripeProvider extends OAuthProvider {
  constructor() {
    super({
      name: "Stripe",
      nameAr: "سترايب",
      icon: "💳",
      color: "bg-indigo-500",
      scopes: ["read_write"],
      authUrl: "https://connect.stripe.com/oauth/authorize",
      tokenUrl: "https://connect.stripe.com/oauth/token",
      clientId: process.env.STRIPE_CLIENT_ID || "",
      clientSecret: process.env.STRIPE_SECRET_KEY || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/integrations/stripe/callback`,
    });
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
      state,
    });

    return `${this.config.authUrl}?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_secret: this.config.clientSecret,
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async getUserProfile(accessToken: string): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
  }

  async revokeToken(token: string): Promise<void> {
    await fetch("https://connect.stripe.com/oauth/deauthorize", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        stripe_user_id: token,
      }),
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
    };
  }
}

registerProvider("stripe", new StripeProvider());
export { StripeProvider };
