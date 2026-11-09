import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * SyncStatusService: Track sync status and generate reports
 * - Track sync status for each integration
 * - Generate status reports
 * - Calculate performance metrics
 */
@Injectable()
export class SyncStatusService {
  private readonly logger = new Logger(SyncStatusService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get sync status for an integration
   */
  async getSyncStatus(integrationId: string): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
        include: {
          syncLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      const lastSync = integration.syncLogs[0];
      const status = {
        integrationId,
        provider: integration.provider,
        connectionStatus: integration.status,
        lastSyncedAt: integration.lastSyncedAt,
        nextSyncAt: integration.nextSyncAt,
        syncFrequency: integration.syncFrequency,
        lastSyncStatus: lastSync?.status || 'NEVER',
        lastSyncDuration: lastSync?.durationMs,
        lastSyncItemsProcessed: lastSync?.itemsProcessed || 0,
        lastSyncItemsSucceeded: lastSync?.itemsSucceeded || 0,
        lastSyncError: lastSync?.errorMessage,
        recentSyncs: integration.syncLogs.map((log) => ({
          status: log.status,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          duration: log.durationMs,
          itemsProcessed: log.itemsProcessed,
          itemsSucceeded: log.itemsSucceeded,
          itemsFailed: log.itemsFailed,
        })),
      };

      return {
        success: true,
        status,
      };
    } catch (error) {
      this.logger.error(`Failed to get sync status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sync status for all integrations in workspace
   */
  async getWorkspaceSyncStatus(workspaceId: string): Promise<any> {
    try {
      const integrations = await this.prisma.externalIntegration.findMany({
        where: { workspaceId },
        include: {
          syncLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const statuses = integrations.map((integration) => {
        const lastSync = integration.syncLogs[0];
        return {
          integrationId: integration.id,
          provider: integration.provider,
          connectionStatus: integration.status,
          lastSyncedAt: integration.lastSyncedAt,
          nextSyncAt: integration.nextSyncAt,
          lastSyncStatus: lastSync?.status || 'NEVER',
          lastSyncError: lastSync?.errorMessage,
        };
      });

      const summary = {
        totalIntegrations: integrations.length,
        connectedCount: integrations.filter(
          (i) => i.status === 'CONNECTED',
        ).length,
        disconnectedCount: integrations.filter(
          (i) => i.status === 'DISCONNECTED',
        ).length,
        lastSyncSuccessCount: statuses.filter(
          (s) => s.lastSyncStatus === 'COMPLETED',
        ).length,
        lastSyncFailureCount: statuses.filter(
          (s) => s.lastSyncStatus === 'FAILED',
        ).length,
      };

      return {
        success: true,
        summary,
        integrations: statuses,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get workspace sync status: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate detailed sync report
   */
  async generateSyncReport(
    integrationId: string,
    days: number = 7,
  ): Promise<any> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const syncLogs = await this.prisma.integrationSyncLog.findMany({
        where: {
          integrationId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = {
        totalSyncs: syncLogs.length,
        successfulSyncs: syncLogs.filter((l) => l.status === 'COMPLETED').length,
        failedSyncs: syncLogs.filter((l) => l.status === 'FAILED').length,
        totalItemsProcessed: syncLogs.reduce(
          (sum, l) => sum + (l.itemsProcessed || 0),
          0,
        ),
        totalItemsSucceeded: syncLogs.reduce(
          (sum, l) => sum + (l.itemsSucceeded || 0),
          0,
        ),
        totalItemsFailed: syncLogs.reduce(
          (sum, l) => sum + (l.itemsFailed || 0),
          0,
        ),
        averageDuration:
          syncLogs.reduce((sum, l) => sum + (l.durationMs || 0), 0) /
          syncLogs.length,
        successRate:
          (syncLogs.filter((l) => l.status === 'COMPLETED').length /
            syncLogs.length) *
          100,
      };

      const syncByType: Record<string, any> = {};
      for (const log of syncLogs) {
        if (!syncByType[log.syncType]) {
          syncByType[log.syncType] = {
            count: 0,
            successful: 0,
            failed: 0,
          };
        }
        syncByType[log.syncType].count++;
        if (log.status === 'COMPLETED') {
          syncByType[log.syncType].successful++;
        } else {
          syncByType[log.syncType].failed++;
        }
      }

      return {
        success: true,
        report: {
          period: `Last ${days} days`,
          generatedAt: new Date(),
          metrics,
          syncByType,
          recentLogs: syncLogs.slice(0, 20),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate sync report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate performance metrics for sync operations
   */
  async calculatePerformanceMetrics(
    integrationId: string,
  ): Promise<any> {
    try {
      const syncLogs = await this.prisma.integrationSyncLog.findMany({
        where: { integrationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      if (syncLogs.length === 0) {
        return {
          success: true,
          metrics: null,
          message: 'No sync history available',
        };
      }

      const durations = syncLogs
        .map((l) => l.durationMs)
        .filter((d): d is number => typeof d === 'number');
      const throughputs = syncLogs
        .filter((l) => typeof l.itemsProcessed === 'number' && typeof l.durationMs === 'number' && l.durationMs > 0)
        .map((l) => ((l.itemsProcessed ?? 0) / (l.durationMs ?? 1)) * 1000); // items per second

      const metrics = {
        averageDuration: this.calculateAverage(durations),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        medianDuration: this.calculateMedian(durations),
        averageThroughput: this.calculateAverage(throughputs),
        maxThroughput: Math.max(...throughputs),
        minThroughput: Math.min(...throughputs),
        errorRate:
          (syncLogs.filter((l) => l.status === 'FAILED').length /
            syncLogs.length) *
          100,
        totalItemsSynced: syncLogs.reduce(
          (sum, l) => sum + (l.itemsSucceeded || 0),
          0,
        ),
      };

      return {
        success: true,
        metrics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate performance metrics: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get sync health status
   */
  async getSyncHealth(integrationId: string): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      const recentLogs = await this.prisma.integrationSyncLog.findMany({
        where: { integrationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      let health = 'HEALTHY';
      let issues = [];

      // Check if sync is overdue
      if (
        integration.nextSyncAt &&
        integration.nextSyncAt < new Date()
      ) {
        health = 'UNHEALTHY';
        issues.push('Sync is overdue');
      }

      // Check recent failures
      const recentFailures = recentLogs.filter(
        (l) => l.status === 'FAILED',
      ).length;
      if (recentFailures >= 3) {
        health = 'UNHEALTHY';
        issues.push(`${recentFailures} recent sync failures`);
      } else if (recentFailures >= 1) {
        health = 'DEGRADED';
        issues.push(`${recentFailures} recent sync failures`);
      }

      // Check token expiry
      const meta = (integration.metadata as Record<string, any>) || {};
      if (typeof meta.expiresIn === 'number') {
        const expiresAt = new Date(
          integration.updatedAt.getTime() +
            meta.expiresIn * 1000,
        );
        if (expiresAt < new Date()) {
          health = 'UNHEALTHY';
          issues.push('Access token expired');
        } else if (expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
          health = 'DEGRADED';
          issues.push('Access token expiring soon');
        }
      }

      return {
        success: true,
        health,
        issues,
        lastSyncedAt: integration.lastSyncedAt,
        nextSyncAt: integration.nextSyncAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get sync health: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}
