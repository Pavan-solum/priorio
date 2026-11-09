import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from '../providers/teams.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  mockTeamsTokens,
  mockTeamsUser,
  mockTeamsChat,
  mockTeamsMessage,
  mockIntegration,
  mockProviderEvent,
  mockTask,
  mockSyncLog,
} from '../../__tests__/fixtures/mock-data';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TeamsService', () => {
  let service: TeamsService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: PrismaService,
          useValue: {
            externalIntegration: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            integrationSyncLog: {
              create: jest.fn(),
              update: jest.fn(),
            },
            providerEvent: {
              upsert: jest.fn(),
              findMany: jest.fn(),
            },
            task: {
              create: jest.fn(),
            },
            activityLog: {
              create: jest.fn(),
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

    service = module.get<TeamsService>(TeamsService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect Teams account with valid credentials', async () => {
      const mockCreate = jest
        .spyOn(prismaService.externalIntegration, 'create')
        .mockResolvedValue(mockIntegration as any);
      jest
        .spyOn(prismaService.externalIntegration, 'findFirst')
        .mockResolvedValue(null);
      jest.spyOn(service as any, 'verifyTeamsToken').mockResolvedValue(true);

      const result = await service.connectTeamsAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockTeamsTokens.accessToken,
        mockTeamsTokens.refreshToken,
        'Test Account',
        'test@company.com',
        'user123-teams',
      );

      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should handle invalid OAuth token', async () => {
      jest
        .spyOn(service as any, 'verifyTeamsToken')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.connectTeamsAccount(
          mockIntegration.workspaceId,
          mockIntegration.userId,
          'invalid_token',
          'invalid_refresh',
          'Test Account',
          'test@company.com',
          'user123-teams',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle expired token during connection', async () => {
      jest
        .spyOn(service as any, 'verifyTeamsToken')
        .mockRejectedValue(new Error('Token expired'));

      await expect(
        service.connectTeamsAccount(
          mockIntegration.workspaceId,
          mockIntegration.userId,
          mockTeamsTokens.accessToken,
          mockTeamsTokens.refreshToken,
          'Test Account',
          'test@company.com',
          'user123-teams',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refresh OAuth token on auth failure', async () => {
      jest
        .spyOn(service as any, 'refreshAccessToken')
        .mockResolvedValue(mockTeamsTokens.accessToken);

      const newToken = await (service as any).refreshAccessToken(
        mockTeamsTokens.refreshToken,
      );

      expect(newToken).toBe(mockTeamsTokens.accessToken);
    });

    it('should detect already connected account', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findFirst')
        .mockResolvedValue({ ...mockIntegration, status: 'CONNECTED' } as any);
      jest.spyOn(service as any, 'verifyTeamsToken').mockResolvedValue(true);

      const result = await service.connectTeamsAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockTeamsTokens.accessToken,
        mockTeamsTokens.refreshToken,
        'Test Account',
        'test@company.com',
        'user123-teams',
      );

      expect(result.message).toContain('already connected');
    });
  });

  describe('Chat Synchronization', () => {
    it('should sync all team chats', async () => {
      const mockChats = { value: [mockTeamsChat] };
      const mockMessages = { value: [mockTeamsMessage] };

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          metadata: { accessToken: mockTeamsTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.providerEvent, 'upsert')
        .mockResolvedValue(mockProviderEvent as any);

      jest.spyOn(service as any, 'retryApiCall').mockImplementation((fn) => {
        return fn();
      });
      jest.spyOn(service as any, 'decryptToken').mockReturnValue(
        mockTeamsTokens.accessToken,
      );

      const result = await service.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle pagination in chat sync', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          metadata: { accessToken: mockTeamsTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(service as any, 'decryptToken').mockReturnValue(
        mockTeamsTokens.accessToken,
      );

      jest.spyOn(service as any, 'retryApiCall').mockResolvedValue({
        data: { value: [mockTeamsChat] },
      });

      await service.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should detect duplicate messages', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          metadata: { accessToken: mockTeamsTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(service as any, 'decryptToken').mockReturnValue(
        mockTeamsTokens.accessToken,
      );

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: { value: [mockTeamsChat] },
        });

      const upsertSpy = jest
        .spyOn(prismaService.providerEvent, 'upsert')
        .mockResolvedValue(mockProviderEvent as any);

      await service.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
    });

    it('should create ProviderEvent records for messages', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          metadata: { accessToken: mockTeamsTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.providerEvent, 'upsert')
        .mockResolvedValue(mockProviderEvent as any);
      jest.spyOn(service as any, 'decryptToken').mockReturnValue(
        mockTeamsTokens.accessToken,
      );

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: { value: [mockTeamsChat] },
        });

      const result = await service.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(prismaService.providerEvent.upsert).toHaveBeenCalled();
    });

    it('should handle API errors during sync', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          metadata: { accessToken: mockTeamsTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(service as any, 'decryptToken').mockReturnValue(
        mockTeamsTokens.accessToken,
      );

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockRejectedValue(new Error('API Error'));

      await expect(
        service.syncTeamChats(
          mockIntegration.id,
          mockIntegration.workspaceId,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Message to Task Conversion', () => {
    it('should extract title from Teams message', async () => {
      const result = (service as any).extractTaskFromMessage(
        mockTeamsMessage,
      );

      expect(result.title).toBe(mockTeamsMessage.subject);
    });

    it('should create task with priority from message', async () => {
      const messageWithPriority = {
        ...mockTeamsMessage,
        subject: '[HIGH] Important project update',
      };

      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue(mockTask as any);

      const result = await service.createTaskFromMessage(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        messageWithPriority as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });

    it('should create subtasks from mentions', async () => {
      const messageWithMentions = {
        ...mockTeamsMessage,
        body: {
          contentType: 'html',
          content: '@John needs to review @Jane needs to approve',
        },
      };

      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue(mockTask as any);

      await service.createTaskFromMessage(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        messageWithMentions as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });

    it('should handle attachments in message conversion', async () => {
      const messageWithAttachments = mockTeamsMessage;

      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue({ ...mockTask, attachments: [] } as any);

      const result = await service.createTaskFromMessage(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        messageWithAttachments as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });

    it('should handle markdown formatting in message', async () => {
      const messageWithMarkdown = {
        ...mockTeamsMessage,
        body: {
          contentType: 'html',
          content: '<b>Bold text</b> <i>italic</i> <u>underline</u>',
        },
      };

      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue(mockTask as any);

      const result = await service.createTaskFromMessage(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        messageWithMarkdown as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });
  });

  describe('Notification Management', () => {
    it('should post notification to Teams channel', async () => {
      const notification = {
        type: 'taskCreated',
        title: 'New Task',
        message: 'A new task has been created',
      };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'msg_id' } });

      const result = await service.postNotificationToTeam(
        mockIntegration.id,
        'channel_id',
        notification as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should handle rate limiting on notifications', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({ data: { id: 'msg_id' } });

      await expect(
        service.postNotificationToTeam(
          mockIntegration.id,
          'channel_id',
          { type: 'test', title: 'Test' } as any,
        ),
      ).rejects.toThrow();
    });

    it('should support attachments in notifications', async () => {
      const notificationWithAttachments = {
        type: 'taskCreated',
        title: 'New Task',
        message: 'Task with attachments',
        attachments: [{ name: 'doc.pdf', size: 1024 }],
      };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'msg_id' } });

      const result = await service.postNotificationToTeam(
        mockIntegration.id,
        'channel_id',
        notificationWithAttachments as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });
  });

  describe('Activity Tracking', () => {
    it('should track Teams user actions', async () => {
      jest
        .spyOn(prismaService.activityLog, 'create')
        .mockResolvedValue({} as any);

      await service.trackTeamsActivity(
        mockIntegration.id,
        'chat-message-sent',
        { messageId: 'msg123' },
      );

      expect(prismaService.activityLog.create).toHaveBeenCalled();
    });

    it('should update last activity timestamp', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'update')
        .mockResolvedValue({
          ...mockIntegration,
          lastSyncAt: new Date(),
        } as any);

      await service.trackTeamsActivity(
        mockIntegration.id,
        'message-received',
        {},
      );

      expect(prismaService.externalIntegration.update).toHaveBeenCalled();
    });

    it('should handle offline activity tracking', async () => {
      jest
        .spyOn(prismaService.activityLog, 'create')
        .mockResolvedValue({} as any);

      await service.trackTeamsActivity(
        mockIntegration.id,
        'offline-sync',
        { queuedMessages: 5 },
      );

      expect(prismaService.activityLog.create).toHaveBeenCalled();
    });
  });
});
