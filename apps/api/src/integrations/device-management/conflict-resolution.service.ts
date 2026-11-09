import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictResolutionStrategy } from '../../../generated/prisma';
import { ConflictResolutionDto, SyncConflictResponseDto } from './dto';

@Injectable()
export class ConflictResolutionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflicts(
    workspaceId: string,
    itemType: string,
    itemId: string,
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>,
  ): Promise<SyncConflictResponseDto> {
    // Check if conflict already exists
    const existingConflict = await this.prisma.syncConflict.findFirst({
      where: {
        workspaceId,
        itemType,
        itemId,
        resolvedAt: null,
      },
    });

    if (existingConflict) {
      // Update with new data
      const updated = await this.prisma.syncConflict.update({
        where: { id: existingConflict.id },
        data: {
          localData: localData as any,
          remoteData: remoteData as any,
          updatedAt: new Date(),
        },
      });

      return this.mapToResponseDto(updated);
    }

    // Create new conflict
    const conflict = await this.prisma.syncConflict.create({
      data: {
        workspaceId,
        itemType,
        itemId,
        localData: localData as any,
        remoteData: remoteData as any,
        strategy: 'MANUAL_RESOLUTION',
      },
    });

    return this.mapToResponseDto(conflict);
  }

  /**
   * Resolve a conflict using specified strategy
   */
  async resolveConflict(conflictId: string, strategy?: ConflictResolutionStrategy): Promise<SyncConflictResponseDto> {
    const conflict = await this.prisma.syncConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      throw new NotFoundException('Conflict not found');
    }

    if (conflict.resolvedAt) {
      throw new BadRequestException('Conflict already resolved');
    }

    const resolutionStrategy = strategy || conflict.strategy;
    let resolution: Record<string, unknown>;

    if (resolutionStrategy === 'LAST_WRITE_WINS') {
      resolution = (conflict.remoteData as Record<string, unknown>) || {}; // Remote is assumed to be latest
    } else if (resolutionStrategy === 'KEEP_LOCAL') {
      resolution = (conflict.localData as Record<string, unknown>) || {};
    } else if (resolutionStrategy === 'KEEP_REMOTE') {
      resolution = (conflict.remoteData as Record<string, unknown>) || {};
    } else {
      // MANUAL_RESOLUTION requires explicit resolution data
      throw new BadRequestException('Manual resolution requires explicit resolution data');
    }

    // Apply resolution
    await this.applyResolution(conflict, resolution);

    // Update conflict record
    const updated = await this.prisma.syncConflict.update({
      where: { id: conflictId },
      data: {
        strategy: resolutionStrategy,
        resolution: resolution as any,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Manually resolve a conflict with custom resolution data
   */
  async resolveConflictManually(
    conflictId: string,
    resolutionDto: ConflictResolutionDto,
  ): Promise<SyncConflictResponseDto> {
    const conflict = await this.prisma.syncConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      throw new NotFoundException('Conflict not found');
    }

    if (conflict.resolvedAt) {
      throw new BadRequestException('Conflict already resolved');
    }

    // Validate resolution data
    if (!resolutionDto.resolution) {
      throw new BadRequestException('Resolution data is required');
    }

    // Apply resolution
    await this.applyResolution(conflict, resolutionDto.resolution);

    // Update conflict record
    const updated = await this.prisma.syncConflict.update({
      where: { id: conflictId },
      data: {
        strategy: 'MANUAL_RESOLUTION',
        resolution: resolutionDto.resolution as any,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Apply resolution to the conflict item
   */
  async applyResolution(conflict: any, resolution: Record<string, unknown>): Promise<void> {
    const { itemType, itemId, workspaceId } = conflict;

    if (itemType === 'task') {
      // Check if task exists
      const task = await this.prisma.task.findUnique({
        where: { id: itemId },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Apply resolution data
      await this.prisma.task.update({
        where: { id: itemId },
        data: {
          title: (resolution.title as string) || undefined,
          description: (resolution.description as string) || undefined,
          status: (resolution.status as any) || undefined,
          priority: (resolution.priority as any) || undefined,
          dueAt: resolution.dueAt ? new Date(resolution.dueAt as string) : undefined,
        },
      });
    } else if (itemType === 'reminder') {
      // Handle reminder conflict
      const reminder = await this.prisma.reminder.findUnique({
        where: { id: itemId },
      });

      if (!reminder) {
        throw new NotFoundException('Reminder not found');
      }

      await this.prisma.reminder.update({
        where: { id: itemId },
        data: {
          title: (resolution.title as string) || undefined,
          scheduledAt: resolution.scheduledAt ? new Date(resolution.scheduledAt as string) : undefined,
          recurrence: (resolution.recurrence as string) || undefined,
        },
      });
    } else if (itemType === 'note') {
      // Handle note conflict
      const note = await this.prisma.note.findUnique({
        where: { id: itemId },
      });

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      await this.prisma.note.update({
        where: { id: itemId },
        data: {
          content: (resolution.content as string) || undefined,
          title: (resolution.title as string) || undefined,
        },
      });
    }

    // Notify devices about the resolution
    await this.notifyDevices(workspaceId, itemType, itemId, resolution);
  }

  /**
   * Notify devices about conflict resolution
   */
  async notifyDevices(
    workspaceId: string,
    itemType: string,
    itemId: string,
    resolution: Record<string, unknown>,
  ): Promise<void> {
    // Create notifications for all active devices
    const devices = await this.prisma.deviceInfo.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: { id: true },
    });

    for (const device of devices) {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          deviceId: device.id,
          dedupeKey: `conflict_resolved_${itemType}_${itemId}`,
          title: 'Conflict Resolved',
          body: `A conflict on ${itemType} "${itemId}" has been automatically resolved.`,
          metadata: {
            itemType,
            itemId,
            resolution,
          } as any,
        } as any,
      });
    }
  }

  /**
   * Get unresolved conflicts
   */
  async getUnresolvedConflicts(
    workspaceId: string,
    filters?: {
      itemType?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    conflicts: SyncConflictResponseDto[];
    total: number;
  }> {
    const limit = Math.min(filters?.limit || 20, 100);
    const offset = filters?.offset || 0;

    const where: any = {
      workspaceId,
      resolvedAt: null,
    };

    if (filters?.itemType) {
      where.itemType = filters.itemType;
    }

    const [conflicts, total] = await Promise.all([
      this.prisma.syncConflict.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.syncConflict.count({ where }),
    ]);

    return {
      conflicts: conflicts.map(c => this.mapToResponseDto(c)),
      total,
    };
  }

  /**
   * Get resolved conflicts
   */
  async getResolvedConflicts(
    workspaceId: string,
    filters?: {
      itemType?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    conflicts: SyncConflictResponseDto[];
    total: number;
  }> {
    const limit = Math.min(filters?.limit || 20, 100);
    const offset = filters?.offset || 0;

    const where: any = {
      workspaceId,
      resolvedAt: { not: null },
    };

    if (filters?.itemType) {
      where.itemType = filters.itemType;
    }

    const [conflicts, total] = await Promise.all([
      this.prisma.syncConflict.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { resolvedAt: 'desc' },
      }),
      this.prisma.syncConflict.count({ where }),
    ]);

    return {
      conflicts: conflicts.map(c => this.mapToResponseDto(c)),
      total,
    };
  }

  /**
   * Get conflict by ID
   */
  async getConflictById(conflictId: string): Promise<SyncConflictResponseDto> {
    const conflict = await this.prisma.syncConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      throw new NotFoundException('Conflict not found');
    }

    return this.mapToResponseDto(conflict);
  }

  /**
   * Get conflict statistics
   */
  async getConflictStatistics(workspaceId: string): Promise<{
    totalConflicts: number;
    unresolvedConflicts: number;
    resolvedConflicts: number;
    conflictsByType: Record<string, number>;
    conflictsByStrategy: Record<string, number>;
  }> {
    const totalConflicts = await this.prisma.syncConflict.count({
      where: { workspaceId },
    });

    const unresolvedConflicts = await this.prisma.syncConflict.count({
      where: { workspaceId, resolvedAt: null },
    });

    const resolvedConflicts = totalConflicts - unresolvedConflicts;

    // Get conflicts by type
    const conflictsByType: Record<string, number> = {};
    const typeResults = await (this.prisma.syncConflict as any).groupBy({
      by: ['itemType'],
      where: { workspaceId },
      _count: true,
    });

    typeResults.forEach((result: any) => {
      conflictsByType[result.itemType] = result._count;
    });

    // Get conflicts by strategy
    const conflictsByStrategy: Record<string, number> = {};
    const strategyResults = await (this.prisma.syncConflict as any).groupBy({
      by: ['strategy'],
      where: { workspaceId, resolvedAt: { not: null } },
      _count: true,
    });

    strategyResults.forEach((result: any) => {
      conflictsByStrategy[result.strategy] = result._count;
    });

    return {
      totalConflicts,
      unresolvedConflicts,
      resolvedConflicts,
      conflictsByType,
      conflictsByStrategy,
    };
  }

  /**
   * Auto-resolve conflicts with identical data
   */
  async autoResolveIdenticalConflicts(workspaceId: string): Promise<{ resolved: number }> {
    const conflicts = await this.prisma.syncConflict.findMany({
      where: {
        workspaceId,
        resolvedAt: null,
      },
    });

    let resolved = 0;

    for (const conflict of conflicts) {
      // Check if local and remote data are identical
      if (JSON.stringify(conflict.localData) === JSON.stringify(conflict.remoteData)) {
        try {
          await this.resolveConflict(conflict.id, 'KEEP_REMOTE');
          resolved++;
        } catch (error) {
          // Failed to resolve, continue
        }
      }
    }

    return { resolved };
  }

  // Helper methods

  private mapToResponseDto(conflict: any): SyncConflictResponseDto {
    return {
      id: conflict.id,
      workspaceId: conflict.workspaceId,
      itemType: conflict.itemType,
      itemId: conflict.itemId,
      localData: conflict.localData,
      remoteData: conflict.remoteData,
      strategy: conflict.strategy,
      resolution: conflict.resolution,
      resolvedAt: conflict.resolvedAt,
      createdAt: conflict.createdAt,
      updatedAt: conflict.updatedAt,
    };
  }
}
