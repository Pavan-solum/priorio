export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  displayName: string;
  picture?: string;
}

export interface IOAuthProvider {
  /**
   * Get the authorization URL for user consent
   */
  getAuthorizationUrl(state: string, scopes: string[]): string;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForToken(code: string): Promise<OAuthToken>;

  /**
   * Refresh expired access token
   */
  refreshToken(refreshToken: string): Promise<OAuthToken>;

  /**
   * Get user info from provider
   */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;

  /**
   * Revoke access token at provider
   */
  revokeToken(refreshToken: string): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
