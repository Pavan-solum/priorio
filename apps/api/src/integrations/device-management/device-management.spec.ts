import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from './device.service';
import { SyncService } from './sync.service';
import { OfflineTaskService } from './offline-task.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Device Management Services', () => {
  let deviceService: DeviceService;
  let syncService: SyncService;
  let offlineTaskService: OfflineTaskService;
  let conflictResolutionService: ConflictResolutionService;
  let prismaService: PrismaService;
  let module: TestingModule;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
    },
    deviceInfo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deviceSyncLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    offlineTask: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
    },
    syncQueueItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    syncConflict: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DeviceService,
        SyncService,
        OfflineTaskService,
        ConflictResolutionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    deviceService = module.get<DeviceService>(DeviceService);
    syncService = module.get<SyncService>(SyncService);
    offlineTaskService = module.get<OfflineTaskService>(OfflineTaskService);
    conflictResolutionService = module.get<ConflictResolutionService>(ConflictResolutionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // DEVICE SERVICE TESTS
  // ============================================================================

  describe('DeviceService', () => {
    it('should be defined', () => {
      expect(deviceService).toBeDefined();
    });

    it('should register a device successfully', async () => {
      const userId = 'user-1';
      const workspaceId = 'workspace-1';
      const createDeviceDto = {
        platform: 'IOS',
        osVersion: '15.0',
        appVersion: '1.0.0',
        deviceId: 'device-1',
        deviceName: 'iPhone',
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId });
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: 'member-1' });
      mockPrisma.deviceInfo.findUnique.mockResolvedValue(null);
      mockPrisma.deviceInfo.create.mockResolvedValue({
        id: 'device-id',
        ...createDeviceDto,
        userId,
        workspaceId,
        syncStatus: 'PENDING',
        isActive: true,
        capabilities: {},
        lastSyncAt: null,
        lastActivityAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await deviceService.registerDevice(userId, workspaceId, createDeviceDto);

      expect(result).toHaveProperty('id');
      expect(result.platform).toBe('IOS');
      expect(mockPrisma.deviceInfo.create).toHaveBeenCalled();
    });

    it('should get device info successfully', async () => {
      const deviceId = 'device-1';
      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
        platform: 'ANDROID',
        syncStatus: 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await deviceService.getDeviceInfo(deviceId);

      expect(result).toBeDefined();
      expect(mockPrisma.deviceInfo.findUnique).toHaveBeenCalledWith({
        where: { deviceId },
      });
    });

    it('should list devices for workspace', async () => {
      const workspaceId = 'workspace-1';
      mockPrisma.deviceInfo.findMany.mockResolvedValue([
        {
          id: 'device-1',
          platform: 'IOS',
          lastActivityAt: null,
        },
      ]);
      mockPrisma.deviceInfo.count.mockResolvedValue(1);

      const result = await deviceService.listDevices(workspaceId);

      expect(result.devices).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.deviceInfo.findMany).toHaveBeenCalled();
    });

    it('should update device status', async () => {
      const deviceId = 'device-1';
      const updateDto = { syncStatus: 'COMPLETED' };

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
      });

      mockPrisma.deviceInfo.update.mockResolvedValue({
        id: 'device-id',
        deviceId,
        syncStatus: 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await deviceService.updateDeviceStatus(deviceId, updateDto);

      expect(result.syncStatus).toBe('COMPLETED');
      expect(mockPrisma.deviceInfo.update).toHaveBeenCalled();
    });

    it('should deregister device successfully', async () => {
      const deviceId = 'device-1';

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
      });

      mockPrisma.deviceSyncLog.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.offlineTask.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.syncQueueItem.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.deviceInfo.delete.mockResolvedValue({ id: 'device-id' });

      const result = await deviceService.deregisterDevice(deviceId);

      expect(result.success).toBe(true);
      expect(mockPrisma.deviceInfo.delete).toHaveBeenCalled();
    });

    it('should check device health', async () => {
      const deviceId = 'device-1';
      const now = new Date();

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
        isActive: true,
        syncStatus: 'COMPLETED',
        lastSyncAt: now,
        lastActivityAt: now,
      });

      mockPrisma.deviceSyncLog.findFirst.mockResolvedValue({
        syncStatus: 'COMPLETED',
      });

      const result = await deviceService.checkDeviceHealth(deviceId);

      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('metrics');
    });
  });

  // ============================================================================
  // SYNC SERVICE TESTS
  // ============================================================================

  describe('SyncService', () => {
    it('should be defined', () => {
      expect(syncService).toBeDefined();
    });

    it('should initiate sync successfully', async () => {
      const deviceId = 'device-1';
      const initiateSyncDto = { clientTimestamp: Date.now() };

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
        workspaceId: 'workspace-1',
        syncStatus: 'PENDING',
      });

      mockPrisma.deviceSyncLog.create.mockResolvedValue({
        id: 'sync-log-1',
        syncStatus: 'IN_PROGRESS',
      });

      mockPrisma.deviceInfo.update.mockResolvedValue({
        syncStatus: 'IN_PROGRESS',
      });

      const result = await syncService.initiateSync(deviceId, initiateSyncDto);

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.deviceSyncLog.create).toHaveBeenCalled();
    });

    it('should get device sync status', async () => {
      const deviceId = 'device-1';

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
        syncStatus: 'COMPLETED',
        lastSyncAt: new Date(),
      });

      mockPrisma.deviceSyncLog.findFirst.mockResolvedValue({
        id: 'sync-log-1',
        itemsProcessed: 10,
        itemsFailed: 0,
        conflictsFound: 0,
      });

      mockPrisma.syncQueueItem.count.mockResolvedValue(5);

      const result = await syncService.getDeviceSyncStatus(deviceId);

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.deviceSyncLog.findFirst).toHaveBeenCalled();
    });

    it('should complete sync operation', async () => {
      const syncLogId = 'sync-log-1';
      const result = {
        status: 'COMPLETED' as any,
        itemsProcessed: 10,
        itemsFailed: 0,
        conflictsFound: 0,
        duration: 5000,
      };

      mockPrisma.deviceSyncLog.findUnique.mockResolvedValue({
        id: syncLogId,
        deviceId: 'device-id',
      });

      mockPrisma.deviceSyncLog.update.mockResolvedValue({
        id: syncLogId,
        syncStatus: 'COMPLETED',
      });

      mockPrisma.deviceInfo.update.mockResolvedValue({
        syncStatus: 'COMPLETED',
      });

      const syncResult = await syncService.completeSyncOperation(syncLogId, result);

      expect(syncResult.status).toBe('COMPLETED');
      expect(mockPrisma.deviceSyncLog.update).toHaveBeenCalled();
    });

    it('should get sync statistics', async () => {
      const workspaceId = 'workspace-1';

      mockPrisma.deviceInfo.count.mockResolvedValue(10);
      mockPrisma.deviceSyncLog.count.mockResolvedValueOnce(8); // synced
      mockPrisma.deviceSyncLog.count.mockResolvedValueOnce(2); // failed

      const stats = await syncService.getSyncStatistics(workspaceId);

      expect(stats).toHaveProperty('totalDevices');
      expect(stats).toHaveProperty('activeDevices');
    });
  });

  // ============================================================================
  // OFFLINE TASK SERVICE TESTS
  // ============================================================================

  describe('OfflineTaskService', () => {
    it('should be defined', () => {
      expect(offlineTaskService).toBeDefined();
    });

    it('should create offline task successfully', async () => {
      const deviceId = 'device-1';
      const workspaceId = 'workspace-1';
      const createOfflineTaskDto = {
        operation: 'CREATE',
        taskData: {
          title: 'Test Task',
          description: 'Test Description',
        },
      };

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
      });

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: workspaceId,
      });

      mockPrisma.offlineTask.create.mockResolvedValue({
        id: 'offline-task-1',
        ...createOfflineTaskDto,
        deviceId: 'device-id',
        workspaceId,
        syncedAt: null,
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await offlineTaskService.createOfflineTask(
        deviceId,
        workspaceId,
        createOfflineTaskDto,
      );

      expect(result.operation).toBe('CREATE');
      expect(mockPrisma.offlineTask.create).toHaveBeenCalled();
    });

    it('should get offline tasks', async () => {
      const deviceId = 'device-1';

      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
      });

      mockPrisma.offlineTask.findMany.mockResolvedValue([
        {
          id: 'offline-task-1',
          operation: 'CREATE',
          syncedAt: null,
        },
      ]);

      mockPrisma.offlineTask.count.mockResolvedValue(1);

      const result = await offlineTaskService.getOfflineTasks(deviceId);

      expect(result.tasks).toHaveLength(1);
      expect(result.pending).toBe(1);
      expect(mockPrisma.offlineTask.findMany).toHaveBeenCalled();
    });

    it('should mark offline task as synced', async () => {
      const offlineTaskId = 'offline-task-1';

      mockPrisma.offlineTask.findUnique.mockResolvedValue({
        id: offlineTaskId,
        syncAttempts: 1,
      });

      mockPrisma.offlineTask.update.mockResolvedValue({
        id: offlineTaskId,
        syncedAt: new Date(),
        syncAttempts: 2,
      });

      const result = await offlineTaskService.markAsSynced(offlineTaskId);

      expect(result.syncedAt).toBeDefined();
      expect(mockPrisma.offlineTask.update).toHaveBeenCalled();
    });

    it('should get offline task statistics', async () => {
      const workspaceId = 'workspace-1';

      mockPrisma.offlineTask.count.mockResolvedValueOnce(10); // total
      mockPrisma.offlineTask.count.mockResolvedValueOnce(5); // synced
      mockPrisma.offlineTask.count.mockResolvedValueOnce(3); // pending
      mockPrisma.offlineTask.count.mockResolvedValueOnce(2); // failed
      mockPrisma.offlineTask.aggregate.mockResolvedValue({
        _avg: { syncAttempts: 1.5 },
      });

      const stats = await offlineTaskService.getOfflineTaskStats(workspaceId);

      expect(stats.totalOfflineTasks).toBe(10);
      expect(stats.syncedTasks).toBe(5);
      expect(stats.pendingTasks).toBe(3);
    });
  });

  // ============================================================================
  // CONFLICT RESOLUTION SERVICE TESTS
  // ============================================================================

  describe('ConflictResolutionService', () => {
    it('should be defined', () => {
      expect(conflictResolutionService).toBeDefined();
    });

    it('should detect conflicts', async () => {
      const workspaceId = 'workspace-1';
      const localData = { title: 'Local Title' };
      const remoteData = { title: 'Remote Title' };

      mockPrisma.syncConflict.findFirst.mockResolvedValue(null);

      mockPrisma.syncConflict.create.mockResolvedValue({
        id: 'conflict-1',
        workspaceId,
        itemType: 'task',
        itemId: 'task-1',
        localData,
        remoteData,
        strategy: 'MANUAL_RESOLUTION',
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await conflictResolutionService.detectConflicts(
        workspaceId,
        'task',
        'task-1',
        localData,
        remoteData,
      );

      expect(result.itemType).toBe('task');
      expect(result.strategy).toBe('MANUAL_RESOLUTION');
      expect(mockPrisma.syncConflict.create).toHaveBeenCalled();
    });

    it('should resolve conflict with strategy', async () => {
      const conflictId = 'conflict-1';
      const conflictData = {
        id: conflictId,
        workspaceId: 'workspace-1',
        itemType: 'task',
        itemId: 'task-1',
        localData: { title: 'Local' },
        remoteData: { title: 'Remote' },
        strategy: 'LAST_WRITE_WINS',
        resolvedAt: null,
      };

      mockPrisma.syncConflict.findUnique.mockResolvedValue(conflictData);
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        title: 'Remote',
      });

      mockPrisma.deviceInfo.findMany.mockResolvedValue([
        { id: 'device-1' },
      ]);

      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-1',
      });

      mockPrisma.syncConflict.update.mockResolvedValue({
        ...conflictData,
        resolvedAt: new Date(),
      });

      const result = await conflictResolutionService.resolveConflict(
        conflictId,
        'LAST_WRITE_WINS' as any,
      );

      expect(result.resolvedAt).toBeDefined();
      expect(mockPrisma.syncConflict.update).toHaveBeenCalled();
    });

    it('should get unresolved conflicts', async () => {
      const workspaceId = 'workspace-1';

      mockPrisma.syncConflict.findMany.mockResolvedValue([
        {
          id: 'conflict-1',
          itemType: 'task',
          resolvedAt: null,
        },
      ]);

      mockPrisma.syncConflict.count.mockResolvedValue(1);

      const result = await conflictResolutionService.getUnresolvedConflicts(workspaceId);

      expect(result.conflicts).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should get conflict statistics', async () => {
      const workspaceId = 'workspace-1';

      mockPrisma.syncConflict.count.mockResolvedValueOnce(10); // total
      mockPrisma.syncConflict.count.mockResolvedValueOnce(3); // unresolved

      const stats = await conflictResolutionService.getConflictStatistics(workspaceId);

      expect(stats.totalConflicts).toBe(10);
      expect(stats.unresolvedConflicts).toBe(3);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle complete sync flow', async () => {
      const deviceId = 'device-1';
      const workspaceId = 'workspace-1';

      // Register device
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId });
      mockPrisma.workspaceMember.findUnique.mockResolvedValue({ id: 'member-1' });
      mockPrisma.deviceInfo.findUnique.mockResolvedValue(null);
      mockPrisma.deviceInfo.create.mockResolvedValue({
        id: 'device-id',
        deviceId,
        syncStatus: 'PENDING',
      });

      const device = await deviceService.registerDevice('user-1', workspaceId, {
        platform: 'IOS',
        osVersion: '15.0',
        appVersion: '1.0.0',
        deviceId,
      });

      expect(device.deviceId).toBe(deviceId);

      // Initiate sync
      mockPrisma.deviceInfo.findUnique.mockResolvedValue({
        id: 'device-id',
        deviceId,
        workspaceId,
        syncStatus: 'PENDING',
      });

      mockPrisma.deviceSyncLog.create.mockResolvedValue({
        id: 'sync-log-1',
        syncStatus: 'IN_PROGRESS',
      });

      mockPrisma.deviceInfo.update.mockResolvedValue({
        syncStatus: 'IN_PROGRESS',
      });

      const syncStatus = await syncService.initiateSync(deviceId, {
        clientTimestamp: Date.now(),
      });

      expect(syncStatus.status).toBe('IN_PROGRESS');
    });
  });
});
