import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GoogleOAuthProvider } from './providers/google-provider';
import { IOAuthProvider } from './providers/provider.interface';
import { OAuthConnectionEntity } from './entities/oauth-connection.entity';
import Redis from 'ioredis';

@Injectable()
export class OAuthService {
  private providers: Map<string, IOAuthProvider> = new Map();
  private redis: Redis;
  private readonly STATE_TTL = 600; // 10 minutes

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private auditLogs: AuditLogsService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeProviders();
  }

  private initializeProviders() {
    // Google OAuth
    const googleProvider = new GoogleOAuthProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUrl: process.env.OAUTH_REDIRECT_URL || 'http://localhost:3001/api/integrations/oauth/callback',
    });
    this.providers.set('google', googleProvider);
  }

  /**
   * Generate authorization URL for user consent
   */
  async authorize(
    workspaceId: string,
    userId: string,
    provider: string,
    scopes: string[],
  ): Promise<{ authorizationUrl: string; state: string }> {
    const providerImpl = this.providers.get(provider);
    if (!providerImpl) {
      throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    const state = this.encryption.generateRandomString(32);
    const stateData = {
      workspaceId,
      userId,
      provider,
      scopes,
      timestamp: Date.now(),
    };

    // Store state in Redis with TTL
    await this.redis.setex(
      `oauth:state:${state}`,
      this.STATE_TTL,
      JSON.stringify(stateData),
    );

    const authorizationUrl = providerImpl.getAuthorizationUrl(state, scopes);

    return {
      authorizationUrl,
      state,
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ connectionId: string; message: string }> {
    // Retrieve and validate state
    const stateData = await this.redis.get(`oauth:state:${state}`);
    if (!stateData) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    const { workspaceId, userId, provider, scopes } = JSON.parse(stateData);

    // Clean up state
    await this.redis.del(`oauth:state:${state}`);

    const providerImpl = this.providers.get(provider);
    if (!providerImpl) {
      throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    // Exchange code for tokens
    const tokens = await providerImpl.exchangeCodeForToken(code);
    const userInfo = await providerImpl.getUserInfo(tokens.accessToken);

    // Encrypt tokens before storage
    const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? this.encryption.encrypt(tokens.refreshToken)
      : null;

    // Store or update OAuth connection
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null;

    const connection = await this.prisma.oAuthConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider,
        },
      },
      create: {
        workspaceId,
        provider,
        userId: userInfo.id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scopes,
        metadata: {
          email: userInfo.email,
          displayName: userInfo.displayName,
          picture: userInfo.picture,
        },
      },
      update: {
        userId: userInfo.id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scopes,
        metadata: {
          email: userInfo.email,
          displayName: userInfo.displayName,
          picture: userInfo.picture,
        },
        revokedAt: null,
      },
    });

    // Audit log
    await this.auditLogs.log({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'OAUTH_CONNECTION' as any,
      entityId: connection.id,
      changes: {
        provider: { old: null, new: provider },
        scopes: { old: null, new: scopes },
      },
    });

    return {
      connectionId: connection.id,
      message: `Successfully connected ${provider}`,
    };
  }

  /**
   * List OAuth connections for workspace
   */
  async listConnections(workspaceId: string): Promise<OAuthConnectionEntity[]> {
    const connections = await this.prisma.oAuthConnection.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: 'desc' },
    });

    return connections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      userId: conn.userId,
      scopes: conn.scopes,
      connectedAt: conn.connectedAt,
      lastSyncAt: conn.lastSyncAt,
      revokedAt: conn.revokedAt,
      status: conn.revokedAt
        ? 'revoked'
        : conn.expiresAt && conn.expiresAt < new Date()
          ? 'expired'
          : 'active',
    }));
  }

  /**
   * Get a single OAuth connection
   */
  async getConnection(connectionId: string): Promise<OAuthConnectionEntity> {
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('OAuth connection not found');
    }

    return {
      id: connection.id,
      provider: connection.provider,
      userId: connection.userId,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      revokedAt: connection.revokedAt,
      status: connection.revokedAt
        ? 'revoked'
        : connection.expiresAt && connection.expiresAt < new Date()
          ? 'expired'
          : 'active',
    };
  }

  /**
   * Refresh an OAuth token
   */
  async refreshAccessToken(connectionId: string): Promise<{ expiresAt: Date }> {
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('OAuth connection not found');
    }

    if (!connection.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    if (connection.revokedAt) {
      throw new BadRequestException('OAuth connection has been revoked');
    }

    const provider = this.providers.get(connection.provider);
    if (!provider) {
      throw new BadRequestException(`Provider ${connection.provider} is not supported`);
    }

    // Decrypt refresh token
    const decryptedRefreshToken = this.encryption.decrypt(connection.refreshToken);

    // Get new access token
    const tokens = await provider.refreshToken(decryptedRefreshToken);

    const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken);
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null;

    const updated = await this.prisma.oAuthConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encryptedAccessToken,
        expiresAt,
      },
    });

    // Audit log
    await this.auditLogs.log({
      workspaceId: connection.workspaceId,
      userId: connection.userId,
      action: 'UPDATE',
      entityType: 'OAUTH_CONNECTION' as any,
      entityId: connectionId,
      changes: {
        accessToken: { old: 'encrypted', new: 'encrypted' },
      },
    });

    return { expiresAt: updated.expiresAt };
  }

  /**
   * Revoke an OAuth connection
   */
  async revokeConnection(connectionId: string): Promise<{ message: string }> {
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('OAuth connection not found');
    }

    const provider = this.providers.get(connection.provider);
    if (!provider && connection.refreshToken) {
      try {
        const decryptedRefreshToken = this.encryption.decrypt(connection.refreshToken);
        await provider.revokeToken(decryptedRefreshToken);
      } catch (error) {
        console.error(`Failed to revoke token with provider: ${error.message}`);
      }
    }

    await this.prisma.oAuthConnection.update({
      where: { id: connectionId },
      data: { revokedAt: new Date() },
    });

    // Audit log
    await this.auditLogs.log({
      workspaceId: connection.workspaceId,
      userId: connection.userId,
      action: 'DELETE',
      entityType: 'OAUTH_CONNECTION' as any,
      entityId: connectionId,
      changes: {
        revokedAt: { old: null, new: new Date() },
      },
    });

    return { message: 'OAuth connection revoked successfully' };
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(connectionId: string): Promise<string> {
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('OAuth connection not found');
    }

    if (connection.revokedAt) {
      throw new BadRequestException('OAuth connection has been revoked');
    }

    // Check if token is expired and refresh if needed
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      await this.refreshAccessToken(connectionId);
      const refreshed = await this.prisma.oAuthConnection.findUnique({
        where: { id: connectionId },
      });
      return this.encryption.decrypt(refreshed.accessToken);
    }

    return this.encryption.decrypt(connection.accessToken);
  }
}
