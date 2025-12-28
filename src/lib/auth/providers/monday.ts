/**
 * Monday.com OAuth Provider
 * تكامل مع Monday.com لإدارة المشاريع
 */

import { OAuthProvider, OAuthTokens, registerProvider } from "./base";

class MondayProvider extends OAuthProvider {
  constructor() {
    super({
      name: "Monday",
      nameAr: "مونداي",
      icon: "📋",
      color: "bg-red-500",
      scopes: ["me:read", "boards:read", "boards:write"],
      authUrl: "https://auth.monday.com/oauth2/authorize",
      tokenUrl: "https://auth.monday.com/oauth2/token",
      clientId: process.env.MONDAY_CLIENT_ID || "",
      clientSecret: process.env.MONDAY_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/integrations/monday/callback`,
    });
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
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
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });
    const data = await res.json();
    return { accessToken: data.access_token };
  }

  async getUserProfile(accessToken: string): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { Authorization: accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ me { id name email } }" }),
    });
    const data = await res.json();
    return data.data?.me || {};
  }

  async revokeToken(_token: string): Promise<void> {}
  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error("Monday tokens do not expire");
  }
}

registerProvider("monday", new MondayProvider());
export { MondayProvider };
