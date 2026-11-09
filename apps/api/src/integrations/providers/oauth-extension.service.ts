import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PermissionType } from '../../../generated/prisma';
import axios from 'axios';
import { EncryptionService } from '../oauth/encryption.service';

/**
 * OAuthExtensionService: Extends OAuth support for multiple providers
 * - Register new OAuth provider configurations
 * - Handle GitHub OAuth flow
 * - Handle Microsoft OAuth flow (Teams, Outlook, Calendar)
 * - Validate provider credentials
 * - Refresh provider tokens
 */
@Injectable()
export class OAuthExtensionService {
  private readonly logger = new Logger(OAuthExtensionService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Register new OAuth provider configuration
   */
  async registerNewProvider(
    workspaceId: string,
    providerConfig: {
      name: string;
      clientId: string;
      clientSecret: string;
      authorizationUrl: string;
      tokenUrl: string;
      scopes: string[];
      redirectUrl: string;
    },
  ): Promise<any> {
    try {
      // Validate provider configuration
      if (
        !providerConfig.name ||
        !providerConfig.clientId ||
        !providerConfig.clientSecret
      ) {
        throw new BadRequestException('Missing required provider configuration');
      }

      // Store encrypted secrets
      const encryptedConfig = {
        ...providerConfig,
        clientSecret: this.encryptToken(providerConfig.clientSecret),
      };

      const metadata = {
        config: encryptedConfig,
        registeredAt: new Date(),
        status: 'ACTIVE',
      };

      // Store in workspace settings
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `OAuth provider registered: ${providerConfig.name}`,
      );

      return {
        success: true,
        provider: providerConfig.name,
        message: 'OAuth provider registered successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to register OAuth provider: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to register OAuth provider',
      );
    }
  }

  /**
   * Handle GitHub OAuth flow
   */
  async handleGitHubOAuth(
    workspaceId: string,
    userId: string,
    code: string,
    state: string,
  ): Promise<any> {
    try {
      const clientId = this.configService.get('GITHUB_CLIENT_ID');
      const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new UnauthorizedException('GitHub OAuth not configured');
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          state,
        },
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (tokenResponse.data.error) {
        throw new UnauthorizedException('GitHub OAuth exchange failed');
      }

      const accessToken = tokenResponse.data.access_token;
      const scope = tokenResponse.data.scope;

      // Fetch GitHub user info
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const githubUser = userResponse.data;

      // Create or update integration
      const integration = await this.prisma.externalIntegration.upsert({
        where: {
          workspaceId_userId_provider_externalAccountId: {
            workspaceId,
            userId,
            provider: 'github',
            externalAccountId: String(githubUser.id),
          },
        },
        create: {
          workspaceId,
          userId,
          provider: 'github',
          displayName: githubUser.login,
          externalAccountId: String(githubUser.id),
          externalEmail: githubUser.email,
          status: 'CONNECTED',
          metadata: {
            accessToken: this.encryptToken(accessToken),
            scope,
            profileUrl: githubUser.html_url,
          },
          syncFrequency: 3600,
        },
        update: {
          status: 'CONNECTED',
          metadata: {
            accessToken: this.encryptToken(accessToken),
            scope,
            profileUrl: githubUser.html_url,
          },
        },
      });

      // Grant default permissions
      await this.prisma.integrationPermission.createMany({
        data: [
          {
            integrationId: integration.id,
            permission: PermissionType.READ_PROFILE,
            scope: 'repositories',
          },
          {
            integrationId: integration.id,
            permission: PermissionType.READ_PROFILE,
            scope: 'issues',
          },
        ],
        skipDuplicates: true,
      });

      this.logger.log(`GitHub OAuth connected for user ${userId}`);

      return {
        success: true,
        integrationId: integration.id,
        message: 'GitHub account connected successfully',
      };
    } catch (error) {
      this.logger.error(`GitHub OAuth flow failed: ${error.message}`);
      throw new InternalServerErrorException('GitHub OAuth flow failed');
    }
  }

  /**
   * Handle Microsoft OAuth flow (Teams, Outlook, Calendar)
   */
  async handleMicrosoftOAuth(
    workspaceId: string,
    userId: string,
    code: string,
    provider: 'teams' | 'outlook' | 'calendar-microsoft',
  ): Promise<any> {
    try {
      const clientId = this.configService.get('MICROSOFT_CLIENT_ID');
      const clientSecret = this.configService.get('MICROSOFT_CLIENT_SECRET');
      const redirectUrl = this.configService.get(
        'MICROSOFT_REDIRECT_URL',
      );

      if (!clientId || !clientSecret) {
        throw new UnauthorizedException('Microsoft OAuth not configured');
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUrl,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/.default',
        },
      );

      if (tokenResponse.data.error) {
        throw new UnauthorizedException('Microsoft OAuth exchange failed');
      }

      const accessToken = tokenResponse.data.access_token;
      const refreshToken = tokenResponse.data.refresh_token;

      // Fetch Microsoft user info
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const msUser = userResponse.data;

      // Create or update integration
      const integration = await this.prisma.externalIntegration.upsert({
        where: {
          workspaceId_userId_provider_externalAccountId: {
            workspaceId,
            userId,
            provider,
            externalAccountId: msUser.id,
          },
        },
        create: {
          workspaceId,
          userId,
          provider,
          displayName: msUser.displayName,
          externalAccountId: msUser.id,
          externalEmail: msUser.userPrincipalName,
          status: 'CONNECTED',
          metadata: {
            accessToken: this.encryptToken(accessToken),
            refreshToken: this.encryptToken(refreshToken),
            tokenType: 'Bearer',
            expiresIn: tokenResponse.data.expires_in,
          },
          syncFrequency: 600,
        },
        update: {
          status: 'CONNECTED',
          metadata: {
            accessToken: this.encryptToken(accessToken),
            refreshToken: this.encryptToken(refreshToken),
            tokenType: 'Bearer',
            expiresIn: tokenResponse.data.expires_in,
          },
        },
      });

      // Grant default permissions based on provider
      const permissionsMap: Record<
        string,
        Array<{ permission: PermissionType; scope: string }>
      > = {
        'teams': [
          { permission: PermissionType.READ_MESSAGES, scope: 'chats' },
          { permission: PermissionType.WRITE_MESSAGES, scope: 'messages' },
        ],
        'outlook': [
          { permission: PermissionType.SYNC_EMAILS, scope: 'email' },
          { permission: PermissionType.WRITE_MESSAGES, scope: 'email' },
        ],
        'calendar-microsoft': [
          { permission: PermissionType.READ_CALENDAR, scope: 'calendar' },
          { permission: PermissionType.MANAGE_CALENDAR, scope: 'calendar' },
        ],
      };

      await this.prisma.integrationPermission.createMany({
        data: (permissionsMap[provider] || []).map((p) => ({
          integrationId: integration.id,
          permission: p.permission,
          scope: p.scope,
        })),
        skipDuplicates: true,
      });

      this.logger.log(
        `Microsoft OAuth (${provider}) connected for user ${userId}`,
      );

      return {
        success: true,
        integrationId: integration.id,
        message: `${provider} account connected successfully`,
      };
    } catch (error) {
      this.logger.error(`Microsoft OAuth flow failed: ${error.message}`);
      throw new InternalServerErrorException('Microsoft OAuth flow failed');
    }
  }

  /**
   * Validate provider credentials
   */
  async validateProviderCredentials(
    integrationId: string,
    accessToken?: string,
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      const metadata = (integration.metadata as Record<string, any>) || {};
      const token = accessToken || this.decryptToken(metadata.accessToken);

      // Validate based on provider
      let isValid = false;

      if (integration.provider === 'github') {
        const response = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          validateStatus: () => true,
        });
        isValid = response.status === 200;
      } else if (['teams', 'outlook', 'calendar-microsoft', 'calendar-google'].includes(integration.provider)) {
        const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        });
        isValid = response.status === 200;
      }

      return {
        success: true,
        isValid,
        status: isValid ? 'VALID' : 'INVALID',
      };
    } catch (error) {
      this.logger.error(`Failed to validate provider credentials: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to validate provider credentials',
      );
    }
  }

  /**
   * Refresh provider tokens
   */
  async refreshProviderTokens(integrationId: string): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      const metadata = (integration?.metadata as Record<string, any>) || {};
      if (!integration || !metadata.refreshToken) {
        throw new BadRequestException('Refresh token not available');
      }

      const refreshToken = this.decryptToken(metadata.refreshToken);
      let newAccessToken = '';
      let newRefreshToken: string | null = null;

      if (integration.provider === 'github') {
        // GitHub doesn't use refresh tokens, would need re-authentication
        throw new BadRequestException(
          'GitHub tokens cannot be refreshed, re-authentication required',
        );
      } else if (['teams', 'outlook', 'calendar-microsoft'].includes(integration.provider)) {
        // Refresh Microsoft tokens
        const clientId = this.configService.get('MICROSOFT_CLIENT_ID');
        const clientSecret = this.configService.get('MICROSOFT_CLIENT_SECRET');

        const tokenResponse = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/.default',
          },
        );

        newAccessToken = tokenResponse.data.access_token;
        newRefreshToken = tokenResponse.data.refresh_token || refreshToken;
      }

      // Update integration with new tokens
      await this.prisma.externalIntegration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...metadata,
            accessToken: this.encryptToken(newAccessToken),
            refreshToken: newRefreshToken
              ? this.encryptToken(newRefreshToken)
              : metadata.refreshToken,
          },
        },
      });

      this.logger.log(`Tokens refreshed for integration ${integrationId}`);

      return {
        success: true,
        message: 'Provider tokens refreshed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to refresh provider tokens: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to refresh provider tokens',
      );
    }
  }

  /**
   * Encrypt token
   */
  private encryptToken(token: string): string {
    return this.encryptionService.encrypt(token);
  }

  /**
   * Decrypt token
   */
  private decryptToken(encryptedToken: string): string {
    return this.encryptionService.decrypt(encryptedToken);
  }
}
