import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * EventSyncEngine: Central sync orchestration across all providers
 * - Sync all providers
 * - Detect event changes
 * - Resolve sync conflicts
 * - Queue sync operations
 * - Execute sync queue
 */
@Injectable()
export class EventSyncEngine {
  private readonly logger = new Logger(EventSyncEngine.name);
  private syncInProgress = new Map<string, boolean>();
  private readonly maxQueueSize = 10000;
  private readonly batchSize = 100;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Orchestrate syncing across all providers
   */
  async syncAllProviders(workspaceId: string): Promise<any> {
    try {
      if (this.syncInProgress.get(workspaceId)) {
        return {
          success: false,
          message: 'Sync already in progress for this workspace',
        };
      }

      this.syncInProgress.set(workspaceId, true);

      const integrations = await this.prisma.externalIntegration.findMany({
        where: {
          workspaceId,
          status: 'CONNECTED',
        },
      });

      const results = [];

      for (const integration of integrations) {
        try {
          const syncLog = await this.prisma.integrationSyncLog.create({
            data: {
              integrationId: integration.id,
              syncType: 'full',
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
          });

          // Sync based on provider type
          let itemsProcessed = 0;
          let itemsSucceeded = 0;

          // For brevity, just update sync log - actual sync would call respective services
          await this.prisma.integrationSyncLog.update({
            where: { id: syncLog.id },
            data: {
              status: 'COMPLETED',
              itemsProcessed,
              itemsSucceeded,
              completedAt: new Date(),
              durationMs: Date.now() - syncLog.startedAt.getTime(),
            },
          });

          // Update next sync time
          await this.prisma.externalIntegration.update({
            where: { id: integration.id },
            data: {
              lastSyncedAt: new Date(),
              nextSyncAt: new Date(
                Date.now() + integration.syncFrequency * 1000,
              ),
            },
          });

          results.push({
            integrationId: integration.id,
            provider: integration.provider,
            status: 'SUCCESS',
            itemsProcessed,
            itemsSucceeded,
          });
        } catch (error) {
          this.logger.error(
            `Failed to sync provider ${integration.provider}: ${error.message}`,
          );
          results.push({
            integrationId: integration.id,
            provider: integration.provider,
            status: 'FAILED',
            error: error.message,
          });
        }
      }

      this.syncInProgress.delete(workspaceId);

      this.logger.log(
        `Sync completed for workspace ${workspaceId}. Results: ${results.length} providers`,
      );

      return {
        success: true,
        results,
        totalProviders: integrations.length,
      };
    } catch (error) {
      this.syncInProgress.delete(workspaceId);
      this.logger.error(`Failed to sync all providers: ${error.message}`);
      throw new InternalServerErrorException('Failed to sync all providers');
    }
  }

  /**
   * Detect changes between local and remote events
   */
  async detectEventChanges(
    integrationId: string,
    remoteEvents: any[],
  ): Promise<any> {
    try {
      const localEvents = await this.prisma.providerEvent.findMany({
        where: { integrationId },
      });

      const localMap = new Map(
        localEvents.map((e) => [e.externalEventId, e]),
      );
      const changes = {
        added: [],
        modified: [],
        deleted: [],
      };

      // Find added/modified events
      for (const remoteEvent of remoteEvents) {
        const localEvent = localMap.get(remoteEvent.id);

        if (!localEvent) {
          changes.added.push(remoteEvent);
        } else {
          // Compare for modifications (simplified)
          if (
            localEvent.title !== remoteEvent.summary ||
            localEvent.description !== remoteEvent.description
          ) {
            changes.modified.push({
              local: localEvent,
              remote: remoteEvent,
            });
          }
        }
      }

      // Find deleted events
      const remoteIds = new Set(remoteEvents.map((e) => e.id));
      for (const [id, localEvent] of localMap) {
        if (!remoteIds.has(id)) {
          changes.deleted.push(localEvent);
        }
      }

      return {
        success: true,
        changes,
        summary: {
          added: changes.added.length,
          modified: changes.modified.length,
          deleted: changes.deleted.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to detect event changes: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to detect event changes',
      );
    }
  }

  /**
   * Resolve sync conflicts with multiple strategies
   */
  async resolveConflicts(
    workspaceId: string,
    strategy: 'LAST_WRITE_WINS' | 'LOCAL_WINS' | 'REMOTE_WINS' | 'MANUAL' = 'LAST_WRITE_WINS',
  ): Promise<any> {
    try {
      const conflicts = await this.prisma.syncConflict.findMany({
        where: {
          workspaceId,
          resolvedAt: null,
        },
      });

      let resolved = 0;

      for (const conflict of conflicts) {
        try {
          let resolution: any;

          if (strategy === 'LAST_WRITE_WINS') {
            const localUpdated = new Date(conflict.localData.updatedAt);
            const remoteUpdated = new Date(conflict.remoteData.updatedAt);
            resolution =
              localUpdated > remoteUpdated
                ? conflict.localData
                : conflict.remoteData;
          } else if (strategy === 'LOCAL_WINS') {
            resolution = conflict.localData;
          } else if (strategy === 'REMOTE_WINS') {
            resolution = conflict.remoteData;
          }

          if (resolution) {
            await this.prisma.syncConflict.update({
              where: { id: conflict.id },
              data: {
                strategy,
                resolution,
                resolvedAt: new Date(),
              },
            });

            resolved++;
          }
        } catch (error) {
          this.logger.warn(`Failed to resolve conflict ${conflict.id}`);
        }
      }

      this.logger.log(`Resolved ${resolved}/${conflicts.length} conflicts`);

      return {
        success: true,
        resolved,
        total: conflicts.length,
      };
    } catch (error) {
      this.logger.error(`Failed to resolve conflicts: ${error.message}`);
      throw new InternalServerErrorException('Failed to resolve conflicts');
    }
  }

  /**
   * Queue sync operation for async processing
   */
  async queueSyncOperation(
    workspaceId: string,
    deviceId: string,
    operation: {
      itemType: string;
      itemId: string;
      operation: 'CREATE' | 'UPDATE' | 'DELETE';
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      payload: any;
    },
  ): Promise<any> {
    try {
      // Check queue size
      const queueCount = await this.prisma.syncQueueItem.count({
        where: {
          workspaceId,
          status: 'PENDING',
        },
      });

      if (queueCount >= this.maxQueueSize) {
        throw new BadRequestException('Sync queue is full');
      }

      const queueItem = await this.prisma.syncQueueItem.create({
        data: {
          workspaceId,
          deviceId,
          itemType: operation.itemType,
          itemId: operation.itemId,
          operation: operation.operation,
          priority: operation.priority || 'MEDIUM',
          status: 'PENDING',
          payload: operation.payload,
          maxRetries: 3,
        },
      });

      this.logger.log(
        `Operation queued: ${operation.operation} ${operation.itemType} ${operation.itemId}`,
      );

      return {
        success: true,
        queueItemId: queueItem.id,
        position: queueCount + 1,
      };
    } catch (error) {
      this.logger.error(`Failed to queue sync operation: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to queue sync operation',
      );
    }
  }

  /**
   * Execute queued sync operations in batches
   */
  async executeSyncQueue(
    workspaceId: string,
    maxBatchSize: number = this.batchSize,
  ): Promise<any> {
    try {
      // Fetch pending items
      const queueItems = await this.prisma.syncQueueItem.findMany({
        where: {
          workspaceId,
          status: 'PENDING',
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: maxBatchSize,
      });

      if (queueItems.length === 0) {
        return { success: true, processed: 0 };
      }

      let processed = 0;
      let succeeded = 0;

      for (const item of queueItems) {
        try {
          // Process based on operation type
          await this.processQueueItem(item);

          // Mark as processed
          await this.prisma.syncQueueItem.update({
            where: { id: item.id },
            data: {
              status: 'COMPLETED',
              processedAt: new Date(),
            },
          });

          succeeded++;
        } catch (error) {
          this.logger.warn(
            `Failed to process queue item ${item.id}: ${error.message}`,
          );

          // Increment retry count
          const newRetryCount = item.retryCount + 1;

          if (newRetryCount >= item.maxRetries) {
            await this.prisma.syncQueueItem.update({
              where: { id: item.id },
              data: {
                status: 'FAILED',
                errorMessage: error.message,
                retryCount: newRetryCount,
              },
            });
          } else {
            await this.prisma.syncQueueItem.update({
              where: { id: item.id },
              data: {
                retryCount: newRetryCount,
              },
            });
          }
        }

        processed++;
      }

      this.logger.log(
        `Executed ${processed} sync operations: ${succeeded} succeeded`,
      );

      return {
        success: true,
        processed,
        succeeded,
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute sync queue: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to execute sync queue');
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(item: any): Promise<void> {
    // Simplified implementation - would delegate to appropriate service
    switch (item.operation) {
      case 'CREATE':
        this.logger.debug(`Creating ${item.itemType} ${item.itemId}`);
        break;
      case 'UPDATE':
        this.logger.debug(`Updating ${item.itemType} ${item.itemId}`);
        break;
      case 'DELETE':
        this.logger.debug(`Deleting ${item.itemType} ${item.itemId}`);
        break;
    }
  }
}
