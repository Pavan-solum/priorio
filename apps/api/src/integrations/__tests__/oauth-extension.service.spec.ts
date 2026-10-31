import { Test, TestingModule } from '@nestjs/testing';
import { OAuthExtensionService } from '../providers/oauth-extension.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  mockGitHubTokens,
  mockOutlookTokens,
  mockOAuthConfig,
  mockIntegration,
} from '../../__tests__/fixtures/mock-data';
import { BadRequestException } from '@nestjs/common';

jest.mock('axios');

describe('OAuthExtensionService', () => {
  let service: OAuthExtensionService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthExtensionService,
        {
          provide: PrismaService,
          useValue: {
            oauthProvider: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            providerCredential: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OAuthExtensionService>(OAuthExtensionService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Registration', () => {
    it('should register new OAuth provider', async () => {
      jest
        .spyOn(prismaService.oauthProvider, 'create')
        .mockResolvedValue(mockOAuthConfig as any);

      const result = await service.registerNewProvider(mockOAuthConfig as any);

      expect(result).toBeDefined();
      expect(prismaService.oauthProvider.create).toHaveBeenCalled();
    });

    it('should register provider with custom scopes', async () => {
      const configWithScopes = {
        ...mockOAuthConfig,
        scopes: ['custom:read', 'custom:write', 'admin'],
      };

      jest
        .spyOn(prismaService.oauthProvider, 'create')
        .mockResolvedValue(configWithScopes as any);

      const result = await service.registerNewProvider(
        configWithScopes as any,
      );

      expect(result).toBeDefined();
    });

    it('should validate required fields on provider registration', async () => {
      const invalidConfig = {
        provider: 'github',
        clientId: 'test',
      };

      await expect(
        service.registerNewProvider(invalidConfig as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('OAuth Flows', () => {
    it('should handle complete GitHub OAuth flow', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValueOnce({
          data: mockGitHubTokens,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user123',
            login: 'testuser',
            email: 'test@example.com',
          },
        });

      const result = await service.handleGitHubOAuth(
        'auth_code_123',
        'state_value',
      );

      expect(result).toBeDefined();
    });

    it('should handle GitHub OAuth with scope request', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValueOnce({
          data: { ...mockGitHubTokens, scope: 'repo,read:user,user:email' },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user123',
            login: 'testuser',
            email: 'test@example.com',
          },
        });

      const result = await service.handleGitHubOAuth(
        'auth_code_123',
        'state_value',
      );

      expect(result).toBeDefined();
    });

    it('should handle Microsoft OAuth for Teams and Outlook', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValueOnce({
          data: mockOutlookTokens,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user123',
            mail: 'test@company.com',
            displayName: 'Test User',
          },
        });

      const result = await service.handleMicrosoftOAuth(
        'auth_code_456',
        'state_value',
      );

      expect(result).toBeDefined();
    });

    it('should handle GitHub OAuth error', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockRejectedValue(new Error('Invalid authorization code'));

      await expect(
        service.handleGitHubOAuth('invalid_code', 'state'),
      ).rejects.toThrow();
    });
  });

  describe('Token Management', () => {
    it('should validate provider credentials', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          status: 200,
          data: { id: 'user123', login: 'testuser' },
        });

      const result = await service.validateProviderCredentials(
        mockGitHubTokens.accessToken,
        'github',
      );

      expect(result).toBe(true);
    });

    it('should detect expired credentials', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockRejectedValue(
          new Error('Token expired'),
        );

      const result = await service.validateProviderCredentials(
        'expired_token',
        'github',
      );

      expect(result).toBe(false);
    });

    it('should refresh provider tokens', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: {
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            expires_in: 3600,
          },
        });

      const result = await service.refreshProviderTokens(
        'refresh_token_value',
        'github',
      );

      expect(result).toBeDefined();
    });

    it('should encrypt tokens for storage', async () => {
      const encrypted = (service as any).encryptToken(
        mockGitHubTokens.accessToken,
      );

      expect(encrypted).not.toBe(mockGitHubTokens.accessToken);
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt tokens for use', async () => {
      const token = mockGitHubTokens.accessToken;
      const encrypted = (service as any).encryptToken(token);
      const decrypted = (service as any).decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });
  });
});
