import { Test, TestingModule } from '@nestjs/testing';
import { AndroidNotificationsService } from '../android-notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AuditLogsService } from '../../../audit-logs/audit-logs.service';

describe('AndroidNotificationsService', () => {
  let service: AndroidNotificationsService;
  let prisma: PrismaService;
  let tasks: TasksService;
  let auditLogs: AuditLogsService;

  const mockWorkspaceId = '00000000-0000-0000-0000-000000000001';
  const mockUserId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AndroidNotificationsService,
        {
          provide: PrismaService,
          useValue: {
            androidNotification: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: TasksService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AndroidNotificationsService>(AndroidNotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    tasks = module.get<TasksService>(TasksService);
    auditLogs = module.get<AuditLogsService>(AuditLogsService);
  });

  describe('registerDevice', () => {
    it('should register an Android device', async () => {
      const dto = {
        deviceId: 'device-123',
        deviceName: 'Pixel 6',
        fcmToken: 'FCM_TOKEN',
      };

      const result = await service.registerDevice(mockWorkspaceId, mockUserId, dto);

      expect(result).toBeDefined();
      expect(result.id).toBe(dto.deviceId);
      expect(result.status).toBe('active');
      expect(auditLogs.log).toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      const dto = { deviceName: 'Pixel 6' } as any;

      await expect(service.registerDevice(mockWorkspaceId, mockUserId, dto)).rejects.toThrow();
    });
  });

  describe('captureNotification', () => {
    it('should capture notification from Android device', async () => {
      const dto = {
        title: 'Meeting reminder',
        body: 'Standup in 10 minutes',
        appPackage: 'com.google.android.calendar',
        timestamp: new Date(),
      };

      const mockNotification = {
        id: 'notif-1',
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
        ...dto,
        taskId: null,
        dismissed: false,
        createdAt: new Date(),
      };

      jest.spyOn(prisma.androidNotification, 'create').mockResolvedValue(mockNotification as any);

      const result = await service.captureNotification(mockWorkspaceId, mockUserId, dto);

      expect(result).toBeDefined();
      expect(result.notificationId).toBe('notif-1');
      expect(result.status).toBe('captured');
    });

    it('should reject missing required fields', async () => {
      const dto = { body: 'Test' } as any;

      await expect(service.captureNotification(mockWorkspaceId, mockUserId, dto)).rejects.toThrow();
    });

    it('should auto-create task for supported apps', async () => {
      const dto = {
        title: 'Calendar event',
        body: 'Team standup',
        appPackage: 'com.google.android.calendar',
        timestamp: new Date(),
      };

      const mockNotification = {
        id: 'notif-1',
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
        ...dto,
        taskId: null,
        dismissed: false,
        createdAt: new Date(),
      };

      const mockTask = {
        id: 'task-1',
        workspaceId: mockWorkspaceId,
        title: dto.title,
      };

      jest.spyOn(prisma.androidNotification, 'create').mockResolvedValue(mockNotification as any);
      jest.spyOn(tasks, 'create').mockResolvedValue(mockTask as any);
      jest.spyOn(prisma.androidNotification, 'update').mockResolvedValue({
        ...mockNotification,
        taskId: 'task-1',
      } as any);

      const result = await service.captureNotification(mockWorkspaceId, mockUserId, dto);

      expect(result.taskId).toBe('task-1');
      expect(tasks.create).toHaveBeenCalled();
    });

    it('should not auto-create task for unsupported apps', async () => {
      const dto = {
        title: 'Unknown app notification',
        body: 'Some notification',
        appPackage: 'com.unknown.app',
        timestamp: new Date(),
      };

      const mockNotification = {
        id: 'notif-1',
        workspaceId: mockWorkspaceId,
        userId: mockUserId,
        ...dto,
        taskId: null,
        dismissed: false,
        createdAt: new Date(),
      };

      jest.spyOn(prisma.androidNotification, 'create').mockResolvedValue(mockNotification as any);

      const result = await service.captureNotification(mockWorkspaceId, mockUserId, dto);

      expect(result.taskId).toBeUndefined();
      expect(tasks.create).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('should retrieve notifications for user', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          title: 'Test',
          appPackage: 'com.test',
          dismissed: false,
        },
      ];

      jest
        .spyOn(prisma.androidNotification, 'findMany')
        .mockResolvedValue(mockNotifications as any);

      const result = await service.getNotifications(mockWorkspaceId, mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('should filter dismissed notifications', async () => {
      jest.spyOn(prisma.androidNotification, 'findMany').mockResolvedValue([] as any);

      await service.getNotifications(mockWorkspaceId, mockUserId, { dismissed: false });

      expect(prisma.androidNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dismissed: false,
          }),
        }),
      );
    });

    it('should respect limit parameter', async () => {
      jest.spyOn(prisma.androidNotification, 'findMany').mockResolvedValue([] as any);

      await service.getNotifications(mockWorkspaceId, mockUserId, { limit: 10 });

      expect(prisma.androidNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss a notification', async () => {
      const notificationId = 'notif-1';
      const mockNotification = {
        id: notificationId,
        workspaceId: mockWorkspaceId,
        dismissed: false,
      };

      jest.spyOn(prisma.androidNotification, 'findUnique').mockResolvedValue(mockNotification as any);
      jest.spyOn(prisma.androidNotification, 'update').mockResolvedValue({
        ...mockNotification,
        dismissed: true,
      } as any);

      const result = await service.dismissNotification(mockWorkspaceId, notificationId);

      expect(result.message).toContain('dismissed');
      expect(prisma.androidNotification.update).toHaveBeenCalled();
    });

    it('should reject non-existent notification', async () => {
      jest.spyOn(prisma.androidNotification, 'findUnique').mockResolvedValue(null);

      await expect(service.dismissNotification(mockWorkspaceId, 'non-existent')).rejects.toThrow();
    });

    it('should reject wrong workspace', async () => {
      const mockNotification = {
        id: 'notif-1',
        workspaceId: 'other-workspace',
        dismissed: false,
      };

      jest.spyOn(prisma.androidNotification, 'findUnique').mockResolvedValue(mockNotification as any);

      await expect(service.dismissNotification(mockWorkspaceId, 'notif-1')).rejects.toThrow();
    });
  });

  describe('setPermissionPreferences', () => {
    it('should set permission preferences', async () => {
      const prefs = {
        allowedApps: ['com.google.android.calendar'],
        autoCreateTasks: true,
      };

      const result = await service.setPermissionPreferences(mockWorkspaceId, mockUserId, prefs);

      expect(result.message).toContain('updated');
      expect(auditLogs.log).toHaveBeenCalled();
    });

    it('should reject apps in both allowed and disallowed lists', async () => {
      const prefs = {
        allowedApps: ['com.google.android.calendar'],
        disallowedApps: ['com.google.android.calendar'],
      };

      await expect(
        service.setPermissionPreferences(mockWorkspaceId, mockUserId, prefs),
      ).rejects.toThrow();
    });
  });

  describe('security', () => {
    it('should enforce workspace isolation', async () => {
      const mockNotification = {
        id: 'notif-1',
        workspaceId: 'other-workspace',
      };

      jest.spyOn(prisma.androidNotification, 'findUnique').mockResolvedValue(mockNotification as any);

      await expect(service.dismissNotification(mockWorkspaceId, 'notif-1')).rejects.toThrow();
    });

    it('should log all operations', async () => {
      const dto = {
        title: 'Test',
        body: 'Test',
        appPackage: 'com.test',
        timestamp: new Date(),
      };

      jest.spyOn(prisma.androidNotification, 'create').mockResolvedValue({
        id: 'notif-1',
        ...dto,
      } as any);

      await service.captureNotification(mockWorkspaceId, mockUserId, dto);

      expect(auditLogs.log).toHaveBeenCalled();
    });
  });

  describe('auto-task creation', () => {
    const supportedApps = [
      'com.google.android.calendar',
      'com.google.android.apps.tasks',
      'com.microsoft.office.outlook',
      'com.slack',
    ];

    supportedApps.forEach((appPackage) => {
      it(`should auto-create tasks for ${appPackage}`, async () => {
        const dto = {
          title: 'Test notification',
          body: 'Test body',
          appPackage,
          timestamp: new Date(),
        };

        jest.spyOn(prisma.androidNotification, 'create').mockResolvedValue({
          id: 'notif-1',
          ...dto,
        } as any);
        jest.spyOn(tasks, 'create').mockResolvedValue({ id: 'task-1' } as any);

        await service.captureNotification(mockWorkspaceId, mockUserId, dto);

        expect(tasks.create).toHaveBeenCalled();
      });
    });
  });
});
