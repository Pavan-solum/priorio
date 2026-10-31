import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import {
  IOAuthProvider,
  OAuthProviderConfig,
  OAuthToken,
  OAuthUserInfo,
} from './provider.interface';

@Injectable()
export class GoogleOAuthProvider implements IOAuthProvider {
  private readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
  private readonly GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

  constructor(private config: OAuthProviderConfig) {}

  getAuthorizationUrl(state: string, scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUrl,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthToken> {
    try {
      const response = await axios.post(this.GOOGLE_TOKEN_URL, {
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUrl,
        grant_type: 'authorization_code',
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope,
      };
    } catch (error) {
      throw new BadRequestException('Failed to exchange code for token: ' + error.message);
    }
  }

  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    try {
      const response = await axios.post(this.GOOGLE_TOKEN_URL, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      throw new BadRequestException('Failed to refresh token: ' + error.message);
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const response = await axios.get(this.GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id,
        email: response.data.email,
        displayName: response.data.name,
        picture: response.data.picture,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch user info: ' + error.message);
    }
  }

  async revokeToken(refreshToken: string): Promise<void> {
    try {
      await axios.post(this.GOOGLE_REVOKE_URL, null, {
        params: {
          token: refreshToken,
        },
      });
    } catch (error) {
      throw new BadRequestException('Failed to revoke token: ' + error.message);
    }
  }

  getProviderName(): string {
    return 'google';
  }
}
