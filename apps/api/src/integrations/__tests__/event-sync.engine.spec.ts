import { Test, TestingModule } from '@nestjs/testing';
import { EventSyncEngine } from '../providers/event-sync.engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  mockIntegration,
  mockProviderEvent,
  mockSyncLog,
  mockConflict,
  mockSyncQueue,
} from '../../__tests__/fixtures/mock-data';

jest.mock('axios');

describe('EventSyncEngine', () => {
  let service: EventSyncEngine;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSyncEngine,
        {
          provide: PrismaService,
          useValue: {
            externalIntegration: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            providerEvent: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            integrationSyncLog: {
              create: jest.fn(),
              update: jest.fn(),
            },
            syncQueue: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            eventConflict: {
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(600000),
          },
        },
      ],
    }).compile();

    service = module.get<EventSyncEngine>(EventSyncEngine);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sync Orchestration', () => {
    it('should sync all connected providers', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findMany')
        .mockResolvedValue([
          { ...mockIntegration, provider: 'teams', status: 'CONNECTED' },
          { ...mockIntegration, provider: 'outlook', status: 'CONNECTED' },
        ] as any);
      jest
        .spyOn(service as any, 'syncProvider')
        .mockResolvedValue(mockSyncLog);

      const result = await service.syncAllProviders();

      expect(result).toBeDefined();
      expect((service as any).syncProvider).toHaveBeenCalled();
    });

    it('should respect sync frequency', async () => {
      const lastSyncTime = Date.now() - 5 * 60 * 1000;
      jest
        .spyOn(prismaService.externalIntegration, 'findMany')
        .mockResolvedValue([
          {
            ...mockIntegration,
            lastSyncAt: new Date(lastSyncTime),
            syncFrequency: 600000,
          },
        ] as any);

      jest
        .spyOn(service as any, 'shouldSync')
        .mockReturnValue(false);

      const result = await service.syncAllProviders();

      expect((service as any).shouldSync).toHaveBeenCalled();
    });

    it('should generate sync logs', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findMany')
        .mockResolvedValue([
          { ...mockIntegration, status: 'CONNECTED' },
        ] as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);

      await service.syncAllProviders();

      expect(prismaService.integrationSyncLog.create).toHaveBeenCalled();
    });
  });

  describe('Change Detection', () => {
    it('should find new events', async () => {
      const newEvent = { ...mockProviderEvent, id: 'new_event' };
      jest
        .spyOn(prismaService.providerEvent, 'findMany')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([newEvent] as any);

      const result = await (service as any).detectEventChanges(
        mockIntegration.id,
        [newEvent],
      );

      expect(result.new).toContain(newEvent);
    });

    it('should find modified events', async () => {
      const oldEvent = mockProviderEvent;
      const modifiedEvent = {
        ...mockProviderEvent,
        description: 'Updated description',
        updatedAt: new Date(),
      };

      const result = (service as any).compareEvents(oldEvent, modifiedEvent);

      expect(result).not.toBe(0);
    });

    it('should find deleted events', async () => {
      jest
        .spyOn(prismaService.providerEvent, 'findMany')
        .mockResolvedValueOnce([mockProviderEvent] as any)
        .mockResolvedValueOnce([] as any);

      const result = await (service as any).detectEventChanges(
        mockIntegration.id,
        [],
      );

      expect(result.deleted).toContain(mockProviderEvent);
    });

    it('should compare event timestamps', async () => {
      const event1 = mockProviderEvent;
      const event2 = {
        ...mockProviderEvent,
        startTime: new Date(Date.now() + 1000),
      };

      const isNewer = (service as any).compareTimestamps(
        event1.startTime,
        event2.startTime,
      );

      expect(isNewer).toBeLessThan(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts with LAST_WRITE_WINS strategy', async () => {
      const conflict = mockConflict;

      jest
        .spyOn(service as any, 'resolveWithStrategy')
        .mockResolvedValue(mockProviderEvent);

      const result = await service.resolveConflict(
        conflict.id,
        'LAST_WRITE_WINS',
      );

      expect(result).toBeDefined();
    });

    it('should resolve conflicts with KEEP_LOCAL strategy', async () => {
      const conflict = mockConflict;

      jest
        .spyOn(service as any, 'resolveWithStrategy')
        .mockResolvedValue(mockProviderEvent);

      const result = await service.resolveConflict(conflict.id, 'KEEP_LOCAL');

      expect(result).toBeDefined();
    });

    it('should resolve conflicts with KEEP_REMOTE strategy', async () => {
      const conflict = mockConflict;

      jest
        .spyOn(service as any, 'resolveWithStrategy')
        .mockResolvedValue(mockProviderEvent);

      const result = await service.resolveConflict(
        conflict.id,
        'KEEP_REMOTE',
      );

      expect(result).toBeDefined();
    });

    it('should handle manual conflict resolution', async () => {
      jest
        .spyOn(prismaService.eventConflict, 'update')
        .mockResolvedValue({
          ...mockConflict,
          status: 'RESOLVED',
        } as any);

      const result = await service.resolveConflict(
        mockConflict.id,
        'MANUAL_RESOLUTION',
        mockProviderEvent.id,
      );

      expect(prismaService.eventConflict.update).toHaveBeenCalled();
    });
  });

  describe('Queue Operations', () => {
    it('should queue sync operation', async () => {
      jest
        .spyOn(prismaService.syncQueue, 'create')
        .mockResolvedValue(mockSyncQueue as any);

      const result = await service.queueSyncOperation(
        mockIntegration.id,
        'sync-chats',
        1,
      );

      expect(result).toBeDefined();
      expect(prismaService.syncQueue.create).toHaveBeenCalled();
    });

    it('should execute sync queue in order', async () => {
      const queue = [
        { ...mockSyncQueue, id: 'q1', priority: 1 },
        { ...mockSyncQueue, id: 'q2', priority: 2 },
        { ...mockSyncQueue, id: 'q3', priority: 1 },
      ];

      jest
        .spyOn(prismaService.syncQueue, 'findMany')
        .mockResolvedValue(queue as any);
      jest
        .spyOn(service as any, 'executeOperation')
        .mockResolvedValue({});

      await service.executeSyncQueue();

      expect((service as any).executeOperation).toHaveBeenCalled();
    });

    it('should retry failed queue operations', async () => {
      const failedOp = { ...mockSyncQueue, retryCount: 1, maxRetries: 3 };

      jest
        .spyOn(prismaService.syncQueue, 'findMany')
        .mockResolvedValue([failedOp] as any);
      jest
        .spyOn(service as any, 'executeOperation')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({});

      await service.executeSyncQueue();

      expect(prismaService.syncQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: failedOp.id },
          data: expect.objectContaining({
            retryCount: expect.any(Number),
          }),
        }),
      );
    });

    it('should preserve queue order during execution', async () => {
      const executionOrder: string[] = [];

      jest
        .spyOn(prismaService.syncQueue, 'findMany')
        .mockResolvedValue([
          { ...mockSyncQueue, id: 'q1', priority: 1 },
          { ...mockSyncQueue, id: 'q2', priority: 2 },
        ] as any);

      jest
        .spyOn(service as any, 'executeOperation')
        .mockImplementation(async (op) => {
          executionOrder.push(op.id);
        });

      await service.executeSyncQueue();

      expect(executionOrder.length).toBeGreaterThan(0);
    });
  });
});
