import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TasksService } from '../../tasks/tasks.service';
import { Priority, TaskStatus } from '../../tasks/dto/create-task.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

interface RegisterDeviceDto {
  deviceId: string;
  deviceName: string;
  fcmToken?: string;
}

interface CaptureNotificationDto {
  title: string;
  body: string;
  appPackage: string;
  timestamp: Date;
}

@Injectable()
export class AndroidNotificationsService {
  constructor(
    private prisma: PrismaService,
    private tasksService: TasksService,
    private auditLogs: AuditLogsService,
  ) {}

  /**
   * Register Android device
   */
  async registerDevice(
    workspaceId: string,
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ id: string; status: string }> {
    // In a real implementation, this would store device info
    // For now, we'll just validate and return a device ID

    if (!dto.deviceId || !dto.deviceName) {
      throw new BadRequestException('deviceId and deviceName are required');
    }

    // TODO: Store device info in database
    // For now, return simulated response
    const deviceRecord = {
      id: dto.deviceId,
      workspaceId,
      userId,
      deviceName: dto.deviceName,
      fcmToken: dto.fcmToken,
      registeredAt: new Date(),
    };

    await this.auditLogs.log({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'ANDROID_DEVICE' as any,
      entityId: dto.deviceId,
      changes: {
        deviceName: { old: null, new: dto.deviceName },
      },
    });

    return {
      id: dto.deviceId,
      status: 'active',
    };
  }

  /**
   * Capture notification and optionally create task
   */
  async captureNotification(
    workspaceId: string,
    userId: string,
    dto: CaptureNotificationDto,
  ): Promise<{ taskId?: string; notificationId: string; status: string }> {
    if (!dto.title || !dto.appPackage) {
      throw new BadRequestException('title and appPackage are required');
    }

    // Store notification in database
    const notification = await this.prisma.androidNotification.create({
      data: {
        workspaceId,
        userId,
        title: dto.title,
        body: dto.body,
        appPackage: dto.appPackage,
        timestamp: dto.timestamp || new Date(),
      },
    });

    let taskId: string | undefined;

    // Auto-create task for specific apps
    const autoCreateApps = [
      'com.google.android.calendar', // Google Calendar
      'com.google.android.apps.tasks', // Google Tasks
      'com.microsoft.office.outlook', // Outlook
      'com.slack', // Slack
    ];

    if (autoCreateApps.includes(dto.appPackage)) {
      try {
        const task = await this.tasksService.create(workspaceId, userId, {
          title: dto.title,
          description: dto.body,
          priority: Priority.MEDIUM,
          status: TaskStatus.PENDING,
          dueAt: undefined,
        });
        taskId = task.id;

        // Link task to notification
        await this.prisma.androidNotification.update({
          where: { id: notification.id },
          data: { taskId },
        });
      } catch (error) {
        console.error('Failed to create task from notification:', error);
      }
    }

    await this.auditLogs.log({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'ANDROID_NOTIFICATION' as any,
      entityId: notification.id,
      changes: {
        title: { old: null, new: dto.title },
        appPackage: { old: null, new: dto.appPackage },
      },
    });

    return {
      taskId,
      notificationId: notification.id,
      status: 'captured',
    };
  }

  /**
   * Get notifications
   */
  async getNotifications(
    workspaceId: string,
    userId: string,
    filters?: { dismissed?: boolean; limit?: number },
  ): Promise<any[]> {
    const notifications = await this.prisma.androidNotification.findMany({
      where: {
        workspaceId,
        userId,
        dismissed: filters?.dismissed ?? false,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
    });

    return notifications;
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(
    workspaceId: string,
    notificationId: string,
  ): Promise<{ message: string }> {
    const notification = await this.prisma.androidNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.workspaceId !== workspaceId) {
      throw new BadRequestException('Notification does not belong to this workspace');
    }

    await this.prisma.androidNotification.update({
      where: { id: notificationId },
      data: { dismissed: true },
    });

    return { message: 'Notification dismissed' };
  }

  /**
   * Set permission preferences
   */
  async setPermissionPreferences(
    workspaceId: string,
    userId: string,
    preferences: {
      allowedApps?: string[];
      disallowedApps?: string[];
      autoCreateTasks?: boolean;
    },
  ): Promise<{ message: string }> {
    // TODO: Store preferences in database
    // For now, just validate and return success

    if (preferences.allowedApps && preferences.disallowedApps) {
      const overlap = preferences.allowedApps.filter((app) =>
        preferences.disallowedApps?.includes(app),
      );
      if (overlap.length > 0) {
        throw new BadRequestException(
          `Apps cannot be both allowed and disallowed: ${overlap.join(', ')}`,
        );
      }
    }

    await this.auditLogs.log({
      workspaceId,
      userId,
      action: 'UPDATE',
      entityType: 'ANDROID_PERMISSIONS' as any,
      entityId: userId,
      changes: {
        preferences: { old: null, new: preferences },
      },
    });

    return { message: 'Permissions updated successfully' };
  }
}
