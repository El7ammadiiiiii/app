import { OAuth2Client } from "google-auth-library";

import { serverEnv } from "@/lib/env";
import type { GoogleTokenPayload } from "@/types/auth";

let oauthClient: OAuth2Client | null = null;

export const getOAuthClient = () => {
  if (!oauthClient) {
    oauthClient = new OAuth2Client({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
      redirectUri: serverEnv.GOOGLE_REDIRECT_URI,
    });
  }
  return oauthClient;
};

export const exchangeCodeForTokens = async (code: string): Promise<GoogleTokenPayload> => {
  const client = getOAuthClient();
  const { tokens } = await client.getToken({ code, redirect_uri: serverEnv.GOOGLE_REDIRECT_URI });
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google did not return access/refresh tokens");
  }
  return tokens as GoogleTokenPayload;
};

export const refreshAccessToken = async (refreshToken: string): Promise<GoogleTokenPayload> => {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Unable to refresh access token");
  }
  return credentials as GoogleTokenPayload;
};

export const fetchGoogleProfile = async (accessToken: string) => {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch Google profile");
  }
  return (await response.json()) as { id: string; email: string; name: string; picture?: string };
};
