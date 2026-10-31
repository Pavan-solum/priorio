import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Priority } from '@prisma/client';
import { CreateOfflineTaskDto, OfflineTaskResponseDto } from './dto';

@Injectable()
export class OfflineTaskService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an offline task
   */
  async createOfflineTask(
    deviceId: string,
    workspaceId: string,
    createOfflineTaskDto: CreateOfflineTaskDto,
  ): Promise<OfflineTaskResponseDto> {
    // Validate device exists
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Validate workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Validate task data
    const taskData = createOfflineTaskDto.taskData as Record<string, unknown>;
    if (!taskData.title) {
      throw new BadRequestException('Task title is required');
    }

    // Create offline task
    const offlineTask = await this.prisma.offlineTask.create({
      data: {
        deviceId: device.id,
        workspaceId,
        taskId: createOfflineTaskDto.taskId || null,
        operation: createOfflineTaskDto.operation.toUpperCase(),
        taskData,
      },
    });

    return this.mapToResponseDto(offlineTask);
  }

  /**
   * Sync offline tasks to server
   */
  async syncOfflineTasks(
    deviceId: string,
    workspaceId: string,
  ): Promise<{
    synced: OfflineTaskResponseDto[];
    failed: OfflineTaskResponseDto[];
    totalItems: number;
  }> {
    // Get device
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Get unsynced tasks
    const unsyncdTasks = await this.prisma.offlineTask.findMany({
      where: {
        deviceId: device.id,
        syncedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    const synced: OfflineTaskResponseDto[] = [];
    const failed: OfflineTaskResponseDto[] = [];

    for (const offlineTask of unsyncdTasks) {
      try {
        await this.applyOfflineTask(offlineTask, workspaceId);
        await this.prisma.offlineTask.update({
          where: { id: offlineTask.id },
          data: {
            syncedAt: new Date(),
            syncAttempts: { increment: 1 },
          },
        });
        synced.push(this.mapToResponseDto(offlineTask));
      } catch (error) {
        failed.push(this.mapToResponseDto(offlineTask));
        await this.prisma.offlineTask.update({
          where: { id: offlineTask.id },
          data: {
            lastSyncError: error instanceof Error ? error.message : 'Sync failed',
            syncAttempts: { increment: 1 },
          },
        });
      }
    }

    return {
      synced,
      failed,
      totalItems: unsyncdTasks.length,
    };
  }

  /**
   * Apply an offline task to the server
   */
  private async applyOfflineTask(offlineTask: any, workspaceId: string): Promise<void> {
    const operation = (offlineTask.operation as string).toUpperCase();
    const taskData = offlineTask.taskData as Record<string, unknown>;

    if (operation === 'CREATE') {
      await this.prisma.task.create({
        data: {
          workspaceId,
          createdById: taskData.createdById as string,
          title: taskData.title as string,
          description: (taskData.description as string) || null,
          priority: ((taskData.priority as Priority) || 'MEDIUM') as Priority,
          dueAt: taskData.dueAt ? new Date(taskData.dueAt as string) : null,
          timezone: (taskData.timezone as string) || 'UTC',
        },
      });
    } else if (operation === 'UPDATE' && offlineTask.taskId) {
      await this.prisma.task.update({
        where: { id: offlineTask.taskId },
        data: {
          title: (taskData.title as string) || undefined,
          description: (taskData.description as string) || undefined,
          priority: (taskData.priority as Priority) || undefined,
          dueAt: taskData.dueAt ? new Date(taskData.dueAt as string) : undefined,
          status: (taskData.status as string) || undefined,
        },
      });
    } else if (operation === 'DELETE' && offlineTask.taskId) {
      await this.prisma.task.delete({
        where: { id: offlineTask.taskId },
      });
    } else {
      throw new BadRequestException(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Get offline tasks for a device
   */
  async getOfflineTasks(
    deviceId: string,
    filters?: {
      synced?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    tasks: OfflineTaskResponseDto[];
    total: number;
    synced: number;
    pending: number;
  }> {
    // Get device
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const limit = Math.min(filters?.limit || 20, 100);
    const offset = filters?.offset || 0;

    const where: any = { deviceId: device.id };

    if (typeof filters?.synced === 'boolean') {
      if (filters.synced) {
        where.syncedAt = { not: null };
      } else {
        where.syncedAt = null;
      }
    }

    const [tasks, total, synced, pending] = await Promise.all([
      this.prisma.offlineTask.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.offlineTask.count({ where }),
      this.prisma.offlineTask.count({ where: { deviceId: device.id, syncedAt: { not: null } } }),
      this.prisma.offlineTask.count({ where: { deviceId: device.id, syncedAt: null } }),
    ]);

    return {
      tasks: tasks.map(t => this.mapToResponseDto(t)),
      total,
      synced,
      pending,
    };
  }

  /**
   * Mark an offline task as synced
   */
  async markAsSynced(offlineTaskId: string): Promise<OfflineTaskResponseDto> {
    const offlineTask = await this.prisma.offlineTask.findUnique({
      where: { id: offlineTaskId },
    });

    if (!offlineTask) {
      throw new NotFoundException('Offline task not found');
    }

    const updated = await this.prisma.offlineTask.update({
      where: { id: offlineTaskId },
      data: {
        syncedAt: new Date(),
        syncAttempts: { increment: 1 },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Mark an offline task as failed
   */
  async markAsFailed(offlineTaskId: string, errorMessage: string): Promise<OfflineTaskResponseDto> {
    const offlineTask = await this.prisma.offlineTask.findUnique({
      where: { id: offlineTaskId },
    });

    if (!offlineTask) {
      throw new NotFoundException('Offline task not found');
    }

    const updated = await this.prisma.offlineTask.update({
      where: { id: offlineTaskId },
      data: {
        lastSyncError: errorMessage,
        syncAttempts: { increment: 1 },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete offline task
   */
  async deleteOfflineTask(offlineTaskId: string): Promise<{ success: boolean }> {
    const offlineTask = await this.prisma.offlineTask.findUnique({
      where: { id: offlineTaskId },
    });

    if (!offlineTask) {
      throw new NotFoundException('Offline task not found');
    }

    await this.prisma.offlineTask.delete({
      where: { id: offlineTaskId },
    });

    return { success: true };
  }

  /**
   * Get offline task statistics
   */
  async getOfflineTaskStats(workspaceId: string): Promise<{
    totalOfflineTasks: number;
    syncedTasks: number;
    pendingTasks: number;
    failedTasks: number;
    averageSyncAttempts: number;
  }> {
    const totalOfflineTasks = await this.prisma.offlineTask.count({
      where: { workspaceId },
    });

    const syncedTasks = await this.prisma.offlineTask.count({
      where: {
        workspaceId,
        syncedAt: { not: null },
      },
    });

    const pendingTasks = await this.prisma.offlineTask.count({
      where: {
        workspaceId,
        syncedAt: null,
        syncAttempts: { lt: 3 },
      },
    });

    const failedTasks = await this.prisma.offlineTask.count({
      where: {
        workspaceId,
        syncAttempts: { gte: 3 },
      },
    });

    // Calculate average sync attempts
    const avgResult = await this.prisma.offlineTask.aggregate({
      where: { workspaceId },
      _avg: { syncAttempts: true },
    });

    return {
      totalOfflineTasks,
      syncedTasks,
      pendingTasks,
      failedTasks,
      averageSyncAttempts: avgResult._avg.syncAttempts || 0,
    };
  }

  /**
   * Clear old offline tasks
   */
  async clearOldOfflineTasks(workspaceId: string, retentionDays: number = 30): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.offlineTask.deleteMany({
      where: {
        workspaceId,
        syncedAt: { not: null, lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }

  /**
   * Get offline tasks that need retry
   */
  async getTasksNeedingRetry(workspaceId: string, maxRetries: number = 3): Promise<OfflineTaskResponseDto[]> {
    const tasks = await this.prisma.offlineTask.findMany({
      where: {
        workspaceId,
        syncedAt: null,
        syncAttempts: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return tasks.map(t => this.mapToResponseDto(t));
  }

  // Helper methods

  private mapToResponseDto(offlineTask: any): OfflineTaskResponseDto {
    return {
      id: offlineTask.id,
      deviceId: offlineTask.deviceId,
      workspaceId: offlineTask.workspaceId,
      taskId: offlineTask.taskId,
      operation: offlineTask.operation,
      taskData: offlineTask.taskData,
      syncedAt: offlineTask.syncedAt,
      syncAttempts: offlineTask.syncAttempts,
      lastSyncError: offlineTask.lastSyncError,
      createdAt: offlineTask.createdAt,
      updatedAt: offlineTask.updatedAt,
    };
  }
}
