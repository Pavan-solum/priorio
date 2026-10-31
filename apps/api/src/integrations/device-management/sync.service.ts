import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncStatus, Priority, Prisma } from '@prisma/client';
import { InitiateSyncDto, SyncStatusResponseDto, SyncConflict } from './dto';
import { ConflictResolutionService } from './conflict-resolution.service';
import { OfflineTaskService } from './offline-task.service';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private conflictResolution: ConflictResolutionService,
    private offlineTask: OfflineTaskService,
  ) {}

  /**
   * Initiate a sync operation for a device
   */
  async initiateSync(deviceId: string, initiateSyncDto: InitiateSyncDto): Promise<SyncStatusResponseDto> {
    // Get device
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Check if already syncing
    if (device.syncStatus === 'IN_PROGRESS') {
      throw new BadRequestException('Sync already in progress for this device');
    }

    // Create sync log entry
    const syncLog = await this.prisma.deviceSyncLog.create({
      data: {
        deviceId: device.id,
        workspaceId: device.workspaceId,
        syncStatus: 'IN_PROGRESS',
        itemsProcessed: 0,
        itemsFailed: 0,
        conflictsFound: 0,
        metadata: {
          clientTimestamp: initiateSyncDto.clientTimestamp,
          requestId: this.generateRequestId(),
          deviceInfo: initiateSyncDto.deviceInfo || {},
        },
      },
    });

    // Update device status
    await this.prisma.deviceInfo.update({
      where: { id: device.id },
      data: {
        syncStatus: 'IN_PROGRESS',
        lastActivityAt: new Date(),
      },
    });

    return {
      syncLogId: syncLog.id,
      status: 'IN_PROGRESS',
      itemsProcessed: 0,
      itemsFailed: 0,
      conflictsFound: 0,
      message: 'Sync initiated successfully',
    };
  }

  /**
   * Process offline tasks during sync
   */
  async processOfflineTasks(
    syncLogId: string,
    workspaceId: string,
  ): Promise<{
    processed: number;
    failed: number;
    conflicts: number;
  }> {
    const syncLog = await this.prisma.deviceSyncLog.findUnique({
      where: { id: syncLogId },
    });

    if (!syncLog) {
      throw new NotFoundException('Sync log not found');
    }

    // Get offline tasks for the device
    const offlineTasks = await this.prisma.offlineTask.findMany({
      where: {
        deviceId: syncLog.deviceId,
        syncedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    for (const offlineTask of offlineTasks) {
      try {
        const result = await this.processOfflineTask(offlineTask, syncLog.id);
        if (result.conflict) {
          conflicts++;
        } else {
          processed++;
        }
      } catch (error) {
        failed++;
        // Log the error
        await this.prisma.offlineTask.update({
          where: { id: offlineTask.id },
          data: {
            lastSyncError: error instanceof Error ? error.message : 'Unknown error',
            syncAttempts: { increment: 1 },
          },
        });
      }
    }

    // Update sync log
    await this.prisma.deviceSyncLog.update({
      where: { id: syncLogId },
      data: {
        itemsProcessed: { increment: processed },
        itemsFailed: { increment: failed },
        conflictsFound: { increment: conflicts },
      },
    });

    return { processed, failed, conflicts };
  }

  /**
   * Process a single offline task
   */
  private async processOfflineTask(
    offlineTask: any,
    syncLogId: string,
  ): Promise<{ conflict: boolean }> {
    const operation = offlineTask.operation.toUpperCase();

    if (operation === 'CREATE') {
      // Create the task on the server
      const taskData = offlineTask.taskData as Record<string, unknown>;
      await this.prisma.task.create({
        data: {
          workspaceId: offlineTask.workspaceId,
          createdById: taskData.createdById as string,
          title: taskData.title as string,
          description: taskData.description as string,
          priority: (taskData.priority || 'MEDIUM') as Priority,
          dueAt: taskData.dueAt ? new Date(taskData.dueAt as string) : null,
          timezone: taskData.timezone as string || 'UTC',
        },
      });
    } else if (operation === 'UPDATE') {
      // Check for conflicts
      if (offlineTask.taskId) {
        const serverTask = await this.prisma.task.findUnique({
          where: { id: offlineTask.taskId },
        });

        if (serverTask && serverTask.updatedAt > offlineTask.updatedAt) {
          // Conflict detected
          await this.conflictResolution.detectConflicts(
            offlineTask.workspaceId,
            'task',
            offlineTask.taskId,
            offlineTask.taskData,
            serverTask,
          );
          return { conflict: true };
        }
      }

      // Apply update
      if (offlineTask.taskId) {
        const updateData = offlineTask.taskData as Record<string, unknown>;
        await this.prisma.task.update({
          where: { id: offlineTask.taskId },
          data: {
            title: updateData.title as string || undefined,
            description: updateData.description as string || undefined,
            priority: (updateData.priority as Priority) || undefined,
            dueAt: updateData.dueAt ? new Date(updateData.dueAt as string) : undefined,
          },
        });
      }
    } else if (operation === 'DELETE') {
      // Delete the task
      if (offlineTask.taskId) {
        await this.prisma.task.delete({
          where: { id: offlineTask.taskId },
        });
      }
    }

    // Mark as synced
    await this.prisma.offlineTask.update({
      where: { id: offlineTask.id },
      data: {
        syncedAt: new Date(),
        syncAttempts: { increment: 1 },
      },
    });

    return { conflict: false };
  }

  /**
   * Resolve conflicts during sync
   */
  async resolveConflicts(workspaceId: string): Promise<{
    resolved: number;
    pending: number;
  }> {
    const conflicts = await this.prisma.syncConflict.findMany({
      where: {
        workspaceId,
        resolvedAt: null,
      },
    });

    let resolved = 0;
    let pending = conflicts.length;

    for (const conflict of conflicts) {
      try {
        await this.conflictResolution.resolveConflict(conflict.id, conflict.strategy);
        resolved++;
        pending--;
      } catch (error) {
        // Conflict still pending
      }
    }

    return { resolved, pending };
  }

  /**
   * Log sync operation
   */
  async logSyncOperation(
    deviceId: string,
    workspaceId: string,
    operation: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.deviceSyncLog.create({
      data: {
        deviceId: device.id,
        workspaceId,
        syncStatus: (details.status as SyncStatus) || 'PENDING',
        itemsProcessed: (details.itemsProcessed as number) || 0,
        itemsFailed: (details.itemsFailed as number) || 0,
        conflictsFound: (details.conflictsFound as number) || 0,
        duration: (details.duration as number) || null,
        errorMessage: (details.errorMessage as string) || null,
        metadata: {
          operation,
          ...details,
        },
      },
    });
  }

  /**
   * Get device sync status
   */
  async getDeviceSyncStatus(deviceId: string): Promise<SyncStatusResponseDto> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Get latest sync log
    const latestSync = await this.prisma.deviceSyncLog.findFirst({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
    });

    // Count pending sync queue items
    const pendingItems = await this.prisma.syncQueueItem.count({
      where: {
        deviceId: device.id,
        status: 'PENDING',
      },
    });

    return {
      syncLogId: latestSync?.id,
      status: device.syncStatus,
      itemsProcessed: latestSync?.itemsProcessed || 0,
      itemsFailed: latestSync?.itemsFailed || 0,
      conflictsFound: latestSync?.conflictsFound || 0,
      pendingItems,
      lastSyncAt: device.lastSyncAt,
      message: `Device sync status: ${device.syncStatus}`,
    };
  }

  /**
   * Complete sync operation
   */
  async completeSyncOperation(
    syncLogId: string,
    result: {
      status: SyncStatus;
      itemsProcessed: number;
      itemsFailed: number;
      conflictsFound: number;
      duration: number;
      errorMessage?: string;
    },
  ): Promise<SyncStatusResponseDto> {
    const syncLog = await this.prisma.deviceSyncLog.findUnique({
      where: { id: syncLogId },
    });

    if (!syncLog) {
      throw new NotFoundException('Sync log not found');
    }

    // Update sync log
    const updatedSyncLog = await this.prisma.deviceSyncLog.update({
      where: { id: syncLogId },
      data: {
        syncStatus: result.status,
        itemsProcessed: result.itemsProcessed,
        itemsFailed: result.itemsFailed,
        conflictsFound: result.conflictsFound,
        duration: result.duration,
        errorMessage: result.errorMessage || null,
        completedAt: new Date(),
      },
    });

    // Update device status
    await this.prisma.deviceInfo.update({
      where: { id: syncLog.deviceId },
      data: {
        syncStatus: result.status,
        lastSyncAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    return {
      syncLogId: updatedSyncLog.id,
      status: updatedSyncLog.syncStatus,
      itemsProcessed: updatedSyncLog.itemsProcessed,
      itemsFailed: updatedSyncLog.itemsFailed,
      conflictsFound: updatedSyncLog.conflictsFound,
      message: `Sync completed with status: ${result.status}`,
    };
  }

  /**
   * Get sync statistics for workspace
   */
  async getSyncStatistics(workspaceId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalDevices, activeDevices, syncedLast24h, failedSyncs, avgSyncTime] = await Promise.all([
      this.prisma.deviceInfo.count({ where: { workspaceId } }),
      this.prisma.deviceInfo.count({
        where: { workspaceId, isActive: true },
      }),
      this.prisma.deviceSyncLog.count({
        where: {
          workspaceId,
          syncStatus: 'COMPLETED',
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.deviceSyncLog.count({
        where: {
          workspaceId,
          syncStatus: 'FAILED',
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.getAverageSyncTime(workspaceId),
    ]);

    return {
      totalDevices,
      activeDevices,
      syncedLast24h,
      failedSyncs,
      averageSyncTimeMs: avgSyncTime,
      syncSuccessRate: totalDevices > 0 ? ((syncedLast24h / (syncedLast24h + failedSyncs)) * 100).toFixed(2) : 0,
    };
  }

  /**
   * Get average sync time for workspace
   */
  private async getAverageSyncTime(workspaceId: string): Promise<number> {
    const result = await this.prisma.deviceSyncLog.aggregateRaw({
      pipeline: [
        {
          $match: {
            workspaceId: new (require('mongodb')).ObjectId(workspaceId),
            duration: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
          },
        },
      ],
    } as any);

    return (result?.[0]?.avgDuration || 0) as number;
  }

  /**
   * Clean up old sync logs
   */
  async cleanupOldSyncLogs(workspaceId: string, retentionDays: number = 30): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.deviceSyncLog.deleteMany({
      where: {
        workspaceId,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }

  // Helper methods

  private generateRequestId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
