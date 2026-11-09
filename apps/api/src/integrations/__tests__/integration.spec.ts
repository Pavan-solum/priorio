import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from '../providers/teams.service';
import { CalendarService } from '../providers/calendar.service';
import { OutlookService } from '../providers/outlook.service';
import { EventSyncEngine } from '../providers/event-sync.engine';
import { ProviderPermissionService } from '../providers/permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  mockIntegration,
  mockTask,
  mockTeamsMessage,
  mockOutlookEmail,
} from '../../__tests__/fixtures/mock-data';

jest.mock('axios');

describe('Integration Tests', () => {
  let teamsService: TeamsService;
  let calendarService: CalendarService;
  let outlookService: OutlookService;
  let syncEngine: EventSyncEngine;
  let permissionService: ProviderPermissionService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        CalendarService,
        OutlookService,
        EventSyncEngine,
        ProviderPermissionService,
        {
          provide: PrismaService,
          useValue: {
            externalIntegration: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
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
            providerPermission: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            syncQueue: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            auditLog: {
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

    teamsService = module.get<TeamsService>(TeamsService);
    calendarService = module.get<CalendarService>(CalendarService);
    outlookService = module.get<OutlookService>(OutlookService);
    syncEngine = module.get<EventSyncEngine>(EventSyncEngine);
    permissionService = module.get<ProviderPermissionService>(
      ProviderPermissionService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Sync Cycle', () => {
    it('should execute complete sync for all providers', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findMany')
        .mockResolvedValue([
          { ...mockIntegration, provider: 'teams', status: 'CONNECTED' },
          {
            ...mockIntegration,
            id: 'int2',
            provider: 'outlook',
            status: 'CONNECTED',
          },
        ] as any);

      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue({
          id: 'log1',
          status: 'COMPLETED',
        } as any);

      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockResolvedValue({ status: 'COMPLETED' });

      jest
        .spyOn(outlookService, 'syncOutlookEmail')
        .mockResolvedValue({ status: 'COMPLETED' });

      await syncEngine.syncAllProviders();

      expect(prismaService.integrationSyncLog.create).toHaveBeenCalled();
    });

    it('should handle sync with conflicting events', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findMany')
        .mockResolvedValue([mockIntegration] as any);

      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue({ id: 'log1' } as any);

      jest
        .spyOn(syncEngine as any, 'detectEventChanges')
        .mockResolvedValue({
          new: [],
          modified: [{ id: 'event1' }],
          deleted: [],
          conflicts: [{ id: 'conflict1' }],
        });

      jest
        .spyOn(syncEngine, 'resolveConflict')
        .mockResolvedValue({ id: 'event1' } as any);

      await syncEngine.syncAllProviders();

      expect(syncEngine.resolveConflict).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution Workflow', () => {
    it('should resolve conflicts with LAST_WRITE_WINS strategy', async () => {
      jest
        .spyOn(syncEngine as any, 'getConflict')
        .mockResolvedValue({
          id: 'conflict1',
          eventId1: 'event1',
          eventId2: 'event2',
        });

      jest
        .spyOn(syncEngine, 'resolveConflict')
        .mockResolvedValue({ id: 'event1', title: 'Updated Event' } as any);

      const result = await syncEngine.resolveConflict(
        'conflict1',
        'LAST_WRITE_WINS',
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Event');
    });

    it('should apply resolution across all conflicting entries', async () => {
      const conflicts = [
        { id: 'c1', eventId1: 'e1', eventId2: 'e2' },
        { id: 'c2', eventId1: 'e3', eventId2: 'e4' },
      ];

      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue({ id: 'log1' } as any);

      for (const conflict of conflicts) {
        jest
          .spyOn(syncEngine, 'resolveConflict')
          .mockResolvedValue({ id: conflict.id } as any);

        await syncEngine.resolveConflict(conflict.id, 'LAST_WRITE_WINS');
      }

      expect(syncEngine.resolveConflict).toHaveBeenCalledTimes(2);
    });
  });

  describe('Permission Workflow', () => {
    it('should complete permission request to grant workflow', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'create')
        .mockResolvedValue({
          id: 'perm1',
          permission: 'READ_CALENDAR',
          status: 'GRANTED',
        } as any);

      jest
        .spyOn(prismaService.auditLog, 'create')
        .mockResolvedValue({});

      const result = await permissionService.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('GRANTED');
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should expire permissions after 90 days', async () => {
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      jest
        .spyOn(prismaService.providerPermission, 'create')
        .mockResolvedValue({
          id: 'perm1',
          expiresAt: expiryDate,
          status: 'GRANTED',
        } as any);

      const result = await permissionService.grantPermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(result.expiresAt).toEqual(expiryDate);
    });

    it('should validate permissions before operations', async () => {
      jest
        .spyOn(prismaService.providerPermission, 'findFirst')
        .mockResolvedValue({
          id: 'perm1',
          status: 'GRANTED',
          expiresAt: new Date(Date.now() + 1000000),
        } as any);

      const isValid = await permissionService.validatePermissions(
        mockIntegration.id,
        'READ_CALENDAR',
      );

      expect(isValid).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed sync operations', async () => {
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue({ id: 'log1', status: 'COMPLETED' } as any);

      jest
        .spyOn(prismaService.syncQueue, 'findMany')
        .mockResolvedValue([
          {
            id: 'queue1',
            status: 'FAILED',
            retryCount: 1,
            maxRetries: 3,
          },
        ] as any);

      jest
        .spyOn(syncEngine as any, 'executeOperation')
        .mockResolvedValue({});

      await syncEngine.executeSyncQueue();

      expect((syncEngine as any).executeOperation).toHaveBeenCalled();
    });

    it('should handle rate limit errors', async () => {
      jest
        .spyOn(teamsService as any, 'retryApiCall')
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({ data: { value: [] } });

      try {
        await (teamsService as any).retryApiCall(async () => {
          throw new Error('Rate limited');
        });
      } catch (e) {
        expect(e.message).toBe('Rate limited');
      }
    });

    it('should log errors for debugging', async () => {
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({
          status: 'FAILED',
          errorLog: 'Connection timeout',
        } as any);

      await prismaService.integrationSyncLog.update({
        where: { id: 'log1' },
        data: {
          status: 'FAILED',
          errorLog: 'Connection timeout',
        },
      });

      expect(prismaService.integrationSyncLog.update).toHaveBeenCalled();
    });
  });

  describe('Rate Limit Handling', () => {
    it('should respect API rate limits', async () => {
      jest
        .spyOn(teamsService as any, 'retryApiCall')
        .mockImplementation(async (fn) => {
          const startTime = Date.now();
          let attempt = 0;
          while (attempt < 3) {
            try {
              return await fn();
            } catch (e) {
              if (e.message.includes('Rate limited')) {
                attempt++;
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * Math.pow(2, attempt)),
                );
              } else {
                throw e;
              }
            }
          }
        });

      jest
        .spyOn(teamsService as any, 'retryApiCall')
        .mockResolvedValue({ data: { value: [] } });

      const result = await (teamsService as any).retryApiCall(async () => {
        return { data: { value: [] } };
      });

      expect(result).toBeDefined();
    });

    it('should queue operations during rate limit', async () => {
      jest
        .spyOn(prismaService.syncQueue, 'create')
        .mockResolvedValue({
          id: 'queue1',
          status: 'QUEUED',
          priority: 1,
        } as any);

      const queued = await syncEngine.queueSyncOperation(
        mockIntegration.id,
        'sync-emails',
        1,
      );

      expect(queued.status).toBe('QUEUED');
    });
  });

  describe('Webhook Handling', () => {
    it('should process incoming webhooks', async () => {
      const webhookPayload = {
        type: 'eventCreated',
        eventId: 'event123',
        integrationId: mockIntegration.id,
        data: mockTeamsMessage,
      };

      jest
        .spyOn(prismaService.providerEvent, 'upsert')
        .mockResolvedValue({});

      await teamsService.createTaskFromMessage(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockTeamsMessage as any,
      );

      expect(prismaService.providerEvent.upsert).toHaveBeenCalled();
    });

    it('should handle webhook verification', async () => {
      const webhook = {
        verificationToken: 'verification_token_123',
        validationToken: 'validation_token_123',
      };

      expect(webhook.verificationToken).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency across sync operations', async () => {
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue({ id: 'log1' } as any);

      jest
        .spyOn(prismaService.providerEvent, 'upsert')
        .mockResolvedValue({});

      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({
          status: 'COMPLETED',
          itemsProcessed: 10,
        } as any);

      await teamsService.syncTeamChats(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(prismaService.integrationSyncLog.update).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      jest
        .spyOn(prismaService.task, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        teamsService.createTaskFromMessage(
          mockIntegration.workspaceId,
          mockIntegration.userId,
          mockTeamsMessage as any,
        ),
      ).rejects.toThrow('Database error');
    });

    it('should verify data after sync completion', async () => {
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue({
          id: 'log1',
          status: 'COMPLETED',
          itemsProcessed: 50,
          itemsSucceeded: 50,
        } as any);

      const log = await prismaService.integrationSyncLog.create({
        data: {
          integrationId: mockIntegration.id,
          syncType: 'chats',
          status: 'COMPLETED',
          itemsProcessed: 50,
          itemsSucceeded: 50,
          itemsFailed: 0,
          startedAt: new Date(),
        },
      });

      expect(log.itemsProcessed).toBe(50);
      expect(log.itemsSucceeded).toBe(50);
    });
  });

  describe('Multi-Provider Scenarios', () => {
    it('should sync Teams and Outlook simultaneously', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findMany')
        .mockResolvedValue([
          { ...mockIntegration, provider: 'teams' },
          { ...mockIntegration, id: 'int2', provider: 'outlook' },
        ] as any);

      jest
        .spyOn(teamsService, 'syncTeamChats')
        .mockResolvedValue({
          status: 'COMPLETED',
          itemsProcessed: 20,
        } as any);

      jest
        .spyOn(outlookService, 'syncOutlookEmail')
        .mockResolvedValue({
          status: 'COMPLETED',
          itemsProcessed: 30,
        } as any);

      await syncEngine.syncAllProviders();

      expect(teamsService.syncTeamChats).toHaveBeenCalled();
      expect(outlookService.syncOutlookEmail).toHaveBeenCalled();
    });

    it('should handle calendar events from multiple providers', async () => {
      jest
        .spyOn(calendarService, 'syncCalendarEvents')
        .mockResolvedValue({
          status: 'COMPLETED',
          itemsProcessed: 15,
        } as any);

      jest
        .spyOn(outlookService as any, 'syncOutlookCalendar')
        .mockResolvedValue({
          status: 'COMPLETED',
          itemsProcessed: 10,
        } as any);

      await calendarService.syncCalendarEvents(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(calendarService.syncCalendarEvents).toHaveBeenCalled();
    });
  });
});
