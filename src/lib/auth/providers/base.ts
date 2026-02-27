/**
 * Base OAuth Provider
 */

export type ProviderType =
  | 'canva'
  | 'stripe'
  | 'monday'
  | 'telegram'
  | 'alpaca'
  | 'discord'
  | 'twitter'
  | 'centralized'
  | 'bybit'
  | 'mexc'
  | 'coinbase'
  | 'kucoin'
  | 'okx'
  | 'bitget'
  | 'bingx'
  | 'phemex'
  | 'htx'
  | 'gate'
  | 'cryptocom'
  | 'kraken'
  | 'vercel'
  | 'coingecko'
  | 'tradingview';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface ProviderConfig {
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export abstract class OAuthProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  getConfig(): ProviderConfig {
    return this.config;
  }

  abstract getAuthUrl(state: string): string;
  abstract exchangeCode(code: string): Promise<OAuthTokens>;
  abstract getUserProfile(accessToken: string): Promise<Record<string, unknown>>;
  abstract revokeToken(token: string): Promise<void>;
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
}

// Provider registry
export const providerRegistry = new Map<ProviderType, OAuthProvider>();

export function registerProvider(type: ProviderType, provider: OAuthProvider): void {
  providerRegistry.set(type, provider);
}

export function getProvider(type: ProviderType): OAuthProvider | undefined {
  return providerRegistry.get(type);
}
