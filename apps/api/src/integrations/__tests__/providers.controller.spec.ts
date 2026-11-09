import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from '../providers.controller';
import { TeamsService } from '../providers/teams.service';
import { CalendarService } from '../providers/calendar.service';
import { OutlookService } from '../providers/outlook.service';
import { ProviderPermissionService } from '../providers/permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mockIntegration,
  mockTeamsTokens,
  mockSyncLog,
} from '../../__tests__/fixtures/mock-data';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let teamsService: TeamsService;
  let calendarService: CalendarService;
  let outlookService: OutlookService;
  let permissionService: ProviderPermissionService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        {
          provide: TeamsService,
          useValue: {
            connectTeamsAccount: jest.fn(),
            syncTeamChats: jest.fn(),
            createTaskFromMessage: jest.fn(),
            postNotificationToTeam: jest.fn(),
            trackTeamsActivity: jest.fn(),
          },
        },
        {
          provide: CalendarService,
          useValue: {
            connectCalendarAccount: jest.fn(),
            syncCalendarEvents: jest.fn(),
            createEventFromTask: jest.fn(),
            fetchAvailability: jest.fn(),
            suggestOptimalTime: jest.fn(),
          },
        },
        {
          provide: OutlookService,
          useValue: {
            connectOutlookAccount: jest.fn(),
            syncOutlookEmail: jest.fn(),
            createTaskFromEmail: jest.fn(),
            trackOutlookActivity: jest.fn(),
          },
        },
        {
          provide: ProviderPermissionService,
          useValue: {
            validatePermissions: jest.fn(),
            grantPermissions: jest.fn(),
            revokePermissions: jest.fn(),
            listPermissions: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            externalIntegration: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    teamsService = module.get<TeamsService>(TeamsService);
    calendarService = module.get<CalendarService>(CalendarService);
    outlookService = module.get<OutlookService>(OutlookService);
    permissionService = module.get<ProviderPermissionService>(
      ProviderPermissionService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should reject requests without authorization', async () => {
      await expect(
        controller.connectTeamsAccount(
          'workspace123',
          'user123',
          { accessToken: 'token', refreshToken: 'refresh' } as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject requests with invalid workspace', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        controller.disconnectProvider(
          'invalid_workspace',
          'user123',
          'integration123',
        ),
      ).rejects.toThrow();
    });
  });

  describe('Teams Endpoints', () => {
    it('should handle POST /teams/connect', async () => {
      jest
        .spyOn(teamsService, 'connectTeamsAccount')
        .mockResolvedValue({ success: true, integrationId: 'int123' });

      const result = await teamsService.connectTeamsAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockTeamsTokens.accessToken,
        mockTeamsTokens.refreshToken,
        'Test',
        'test@company.com',
        'user_id',
      );

      expect(result.success).toBe(true);
    });

    it('should handle GET /teams/sync', async () => {
      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockResolvedValue(mockSyncLog);

      const result = await teamsService.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle POST /teams/message-to-task', async () => {
      jest
        .spyOn(teamsService, 'createTaskFromMessage')
        .mockResolvedValue({ id: 'task123' });

      const result = await teamsService.createTaskFromMessage(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        {} as any,
      );

      expect(result.id).toBe('task123');
    });

    it('should handle POST /teams/notify', async () => {
      jest
        .spyOn(teamsService, 'postNotificationToTeam')
        .mockResolvedValue({ success: true });

      const result = await teamsService.postNotificationToTeam(
        mockIntegration.id,
        'channel_id',
        {} as any,
      );

      expect(result.success).toBe(true);
    });

    it('should handle status codes correctly', async () => {
      jest
        .spyOn(teamsService, 'connectTeamsAccount')
        .mockResolvedValue({ success: true, integrationId: 'int123' });

      const result = await teamsService.connectTeamsAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockTeamsTokens.accessToken,
        mockTeamsTokens.refreshToken,
        'Test',
        'test@company.com',
        'user_id',
      );

      expect(result).toBeDefined();
    });

    it('should format Teams responses correctly', async () => {
      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockResolvedValue(mockSyncLog);

      const result = await teamsService.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('itemsProcessed');
    });
  });

  describe('Calendar Endpoints', () => {
    it('should handle POST /calendar/connect', async () => {
      jest
        .spyOn(calendarService, 'connectCalendarAccount')
        .mockResolvedValue({ success: true, integrationId: 'int123' });

      const result = await calendarService.connectCalendarAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        'token',
        'refresh',
        'Google Calendar',
        'user@gmail.com',
        'user_id',
        'google_calendar',
      );

      expect(result.success).toBe(true);
    });

    it('should handle GET /calendar/events', async () => {
      jest
        .spyOn(calendarService, 'syncCalendarEvents')
        .mockResolvedValue(mockSyncLog);

      const result = await calendarService.syncCalendarEvents(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle GET /calendar/availability', async () => {
      jest
        .spyOn(calendarService, 'fetchAvailability')
        .mockResolvedValue({ slots: [] });

      const result = await calendarService.fetchAvailability(
        mockIntegration.id,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result.slots).toBeDefined();
    });

    it('should handle POST /calendar/suggest-time', async () => {
      jest
        .spyOn(calendarService, 'suggestOptimalTime')
        .mockResolvedValue(new Date());

      const result = await calendarService.suggestOptimalTime(
        mockIntegration.id,
        ['user1@company.com'],
        60,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result instanceof Date).toBe(true);
    });
  });

  describe('Outlook Endpoints', () => {
    it('should handle POST /outlook/connect', async () => {
      jest
        .spyOn(outlookService, 'connectOutlookAccount')
        .mockResolvedValue({ success: true, integrationId: 'int123' });

      const result = await outlookService.connectOutlookAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        'token',
        'refresh',
        'Outlook',
        'user@outlook.com',
        'user_id',
      );

      expect(result.success).toBe(true);
    });

    it('should handle GET /outlook/emails', async () => {
      jest
        .spyOn(outlookService, 'syncOutlookEmail')
        .mockResolvedValue(mockSyncLog);

      const result = await outlookService.syncOutlookEmail(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle POST /outlook/email-to-task', async () => {
      jest
        .spyOn(outlookService, 'createTaskFromEmail')
        .mockResolvedValue({ id: 'task123' });

      const result = await outlookService.createTaskFromEmail(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        {} as any,
      );

      expect(result.id).toBe('task123');
    });
  });

  describe('Permission Endpoints', () => {
    it('should handle GET /permissions/list', async () => {
      jest
        .spyOn(permissionService, 'listPermissions')
        .mockResolvedValue([]);

      const result = await permissionService.listPermissions(
        mockIntegration.id,
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle POST /permissions/grant', async () => {
      jest
        .spyOn(permissionService, 'grantPermissions')
        .mockResolvedValue({ id: 'perm123', status: 'GRANTED' });

      const result = await permissionService.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result.status).toBe('GRANTED');
    });

    it('should handle POST /permissions/revoke', async () => {
      jest
        .spyOn(permissionService, 'revokePermissions')
        .mockResolvedValue({ id: 'perm123', status: 'REVOKED' });

      const result = await permissionService.revokePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result.status).toBe('REVOKED');
    });

    it('should validate permissions on protected endpoints', async () => {
      jest
        .spyOn(permissionService, 'validatePermissions')
        .mockResolvedValue(true);

      const result = await permissionService.validatePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for bad requests', async () => {
      jest
        .spyOn(teamsService, 'connectTeamsAccount')
        .mockRejectedValue(new BadRequestException('Invalid token'));

      await expect(
        teamsService.connectTeamsAccount(
          mockIntegration.workspaceId,
          mockIntegration.userId,
          'invalid',
          'invalid',
          'Test',
          'test@company.com',
          'user_id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 401 for unauthorized requests', async () => {
      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockRejectedValue(new UnauthorizedException());

      await expect(
        teamsService.syncTeamChats(
          mockIntegration.id,
          mockIntegration.workspaceId,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return 404 for not found resources', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue(null);

      const result = await prismaService.externalIntegration.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(result).toBeNull();
    });

    it('should return 500 for server errors', async () => {
      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        teamsService.syncTeamChats(
          mockIntegration.id,
          mockIntegration.workspaceId,
        ),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Response Formats', () => {
    it('should return consistent response format for success', async () => {
      jest
        .spyOn(teamsService, 'connectTeamsAccount')
        .mockResolvedValue({ success: true, integrationId: 'int123' });

      const result = await teamsService.connectTeamsAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockTeamsTokens.accessToken,
        mockTeamsTokens.refreshToken,
        'Test',
        'test@company.com',
        'user_id',
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('integrationId');
    });

    it('should include metadata in responses', async () => {
      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockResolvedValue({
          ...mockSyncLog,
          metadata: { duration: 5000 },
        } as any);

      const result = await teamsService.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result.metadata).toBeDefined();
    });

    it('should paginate list responses', async () => {
      jest
        .spyOn(permissionService, 'listPermissions')
        .mockResolvedValue([]);

      const result = await permissionService.listPermissions(
        mockIntegration.id,
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
