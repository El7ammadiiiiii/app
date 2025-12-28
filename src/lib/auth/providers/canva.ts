/**
 * Canva OAuth Provider
 * تكامل مع Canva للتصميم
 */

import { OAuthProvider, OAuthTokens, registerProvider } from "./base";

class CanvaProvider extends OAuthProvider {
  constructor() {
    super({
      name: "Canva",
      nameAr: "كانفا",
      icon: "🎨",
      color: "bg-purple-500",
      scopes: ["design:content:read", "design:content:write"],
      authUrl: "https://www.canva.com/api/oauth/authorize",
      tokenUrl: "https://www.canva.com/api/oauth/token",
      clientId: process.env.CANVA_CLIENT_ID || "",
      clientSecret: process.env.CANVA_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/integrations/canva/callback`,
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
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async getUserProfile(accessToken: string): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.canva.com/rest/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
  }

  async revokeToken(_token: string): Promise<void> {
    // Canva doesn't have a revoke endpoint
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
}

registerProvider("canva", new CanvaProvider());
export { CanvaProvider };
