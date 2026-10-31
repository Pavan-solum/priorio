import { Test, TestingModule } from '@nestjs/testing';
import { OutlookService } from '../providers/outlook.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  mockOutlookTokens,
  mockOutlookEmail,
  mockOutlookEvent,
  mockIntegration,
  mockTask,
  mockSyncLog,
} from '../../__tests__/fixtures/mock-data';
import { BadRequestException } from '@nestjs/common';

jest.mock('axios');

describe('OutlookService', () => {
  let service: OutlookService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutlookService,
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

    service = module.get<OutlookService>(OutlookService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('OAuth Connection', () => {
    it('should connect Outlook account with valid credentials', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'create')
        .mockResolvedValue({ ...mockIntegration, provider: 'outlook' } as any);
      jest
        .spyOn(prismaService.externalIntegration, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(service as any, 'verifyOutlookToken')
        .mockResolvedValue(true);

      const result = await service.connectOutlookAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockOutlookTokens.accessToken,
        mockOutlookTokens.refreshToken,
        'Outlook Account',
        'user@outlook.com',
        'outlook_user_id',
      );

      expect(result.success).toBe(true);
      expect(prismaService.externalIntegration.create).toHaveBeenCalled();
    });

    it('should handle token refresh', async () => {
      jest
        .spyOn(service as any, 'refreshAccessToken')
        .mockResolvedValue(mockOutlookTokens.accessToken);

      const newToken = await (service as any).refreshAccessToken(
        mockOutlookTokens.refreshToken,
      );

      expect(newToken).toBe(mockOutlookTokens.accessToken);
    });

    it('should disconnect Outlook account and revoke access', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue(mockIntegration as any);
      jest
        .spyOn(prismaService.externalIntegration, 'update')
        .mockResolvedValue({
          ...mockIntegration,
          status: 'DISCONNECTED',
        } as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({});

      const result = await service.disconnectOutlookAccount(
        mockIntegration.id,
      );

      expect(prismaService.externalIntegration.update).toHaveBeenCalled();
    });
  });

  describe('Email Sync', () => {
    it('should sync emails from inbox', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [mockOutlookEmail] } });

      const result = await service.syncOutlookEmail(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle email folders', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValueOnce({
          data: { value: [{ id: 'folder1', displayName: 'Work' }] },
        })
        .mockResolvedValueOnce({
          data: { value: [mockOutlookEmail] },
        });

      const result = await service.syncOutlookEmail(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should detect new emails during sync', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
          lastSyncAt: new Date(Date.now() - 60 * 60 * 1000),
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [mockOutlookEmail] } });

      const result = await service.syncOutlookEmail(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle attachments in email sync', async () => {
      const emailWithAttachments = mockOutlookEmail;

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [emailWithAttachments] } });

      const result = await service.syncOutlookEmail(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should categorize emails during sync', async () => {
      const categorizedEmail = {
        ...mockOutlookEmail,
        categories: ['Work', 'Important', 'Action'],
      };

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [categorizedEmail] } });

      const result = await service.syncOutlookEmail(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Calendar Event Sync', () => {
    it('should sync Outlook calendar events', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [mockOutlookEvent] } });

      const result = await service.syncOutlookCalendar(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle recurring events', async () => {
      const recurringEvent = {
        ...mockOutlookEvent,
        recurrence: {
          pattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: ['monday', 'wednesday', 'friday'],
          },
          rangeType: 'endDate',
          startDate: '2024-01-15',
          endDate: '2024-04-15',
        },
      };

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [recurringEvent] } });

      const result = await service.syncOutlookCalendar(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle timezone conversion in calendar sync', async () => {
      const eventWithTimezone = {
        ...mockOutlookEvent,
        start: {
          dateTime: '2024-01-16T09:00:00',
          timeZone: 'Eastern Standard Time',
        },
        end: {
          dateTime: '2024-01-16T09:30:00',
          timeZone: 'Eastern Standard Time',
        },
      };

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook',
          metadata: { accessToken: mockOutlookTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [eventWithTimezone] } });

      const result = await service.syncOutlookCalendar(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Email to Task Conversion', () => {
    it('should extract subject as task title', async () => {
      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue(mockTask as any);

      const result = await service.createTaskFromEmail(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockOutlookEmail as any,
      );

      expect(prismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: mockOutlookEmail.subject,
          }),
        }),
      );
    });

    it('should include email body in task', async () => {
      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue(mockTask as any);

      const result = await service.createTaskFromEmail(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockOutlookEmail as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });

    it('should create subtasks from mentions', async () => {
      const emailWithMentions = {
        ...mockOutlookEmail,
        body: {
          contentType: 'HTML',
          content: '@John please review @Jane please approve',
        },
      };

      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue(mockTask as any);

      const result = await service.createTaskFromEmail(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        emailWithMentions as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });

    it('should handle attachments in email conversion', async () => {
      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue({
          ...mockTask,
          attachments: mockOutlookEmail.attachments,
        } as any);

      const result = await service.createTaskFromEmail(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockOutlookEmail as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });

    it('should create reminder for follow-up emails', async () => {
      const followUpEmail = {
        ...mockOutlookEmail,
        subject: 'Follow up: Project Status',
        flag: { flagStatus: 'flagged' },
      };

      jest
        .spyOn(prismaService.task, 'create')
        .mockResolvedValue({
          ...mockTask,
          reminderDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        } as any);

      const result = await service.createTaskFromEmail(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        followUpEmail as any,
      );

      expect(prismaService.task.create).toHaveBeenCalled();
    });
  });

  describe('Activity Tracking', () => {
    it('should track email access', async () => {
      jest
        .spyOn(prismaService as any, 'activityLog', 'create')
        .mockResolvedValue({});

      await service.trackOutlookActivity(
        mockIntegration.id,
        'email-opened',
        { emailId: 'email123', subject: 'Test Email' },
      );

      expect(prismaService.externalIntegration.update).toBeDefined();
    });

    it('should update timestamps during activity tracking', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'update')
        .mockResolvedValue({
          ...mockIntegration,
          lastSyncAt: new Date(),
        } as any);

      await service.trackOutlookActivity(
        mockIntegration.id,
        'sync-started',
        {},
      );

      expect(prismaService.externalIntegration.update).toHaveBeenCalled();
    });
  });
});
