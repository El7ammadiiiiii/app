/**
 * Alpaca Trading Provider
 * تكامل مع Alpaca للتداول
 */

import { OAuthProvider, OAuthTokens, registerProvider } from "./base";

class AlpacaProvider extends OAuthProvider {
  constructor() {
    super({
      name: "Alpaca",
      nameAr: "ألباكا",
      icon: "📈",
      color: "bg-yellow-500",
      scopes: ["account:write", "trading", "data"],
      authUrl: "https://app.alpaca.markets/oauth/authorize",
      tokenUrl: "https://api.alpaca.markets/oauth/token",
      clientId: process.env.ALPACA_CLIENT_ID || "",
      clientSecret: process.env.ALPACA_CLIENT_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/integrations/alpaca/callback`,
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
    return { accessToken: data.access_token };
  }

  async getUserProfile(accessToken: string): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.alpaca.markets/v2/account", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json();
  }

  async revokeToken(_token: string): Promise<void> {}
  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error("Alpaca tokens do not support refresh");
  }
}

registerProvider("alpaca", new AlpacaProvider());
export { AlpacaProvider };
