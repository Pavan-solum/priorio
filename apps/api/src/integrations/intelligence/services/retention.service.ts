import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * RetentionService
 * Manages data retention and automatic cleanup policies
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Apply a retention policy
   * @param policyId - Policy ID
   * @returns Execution result
   */
  async applyRetentionPolicy(policyId: string): Promise<any> {
    try {
      const policy = await this.prisma.retentionPolicy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        throw new BadRequestException('Policy not found');
      }

      if (!policy.isActive) {
        throw new BadRequestException('Policy is not active');
      }

      const workspaceId = policy.workspaceId;
      const retentionDays = policy.retentionDays;

      let deletedCount = 0;
      let archivedCount = 0;

      // Apply policy based on data type
      switch (policy.dataType.toLowerCase()) {
        case 'conversations':
          ({ deletedCount, archivedCount } = await this.purgeConversations(
            workspaceId,
            retentionDays,
            policy.archiveOldData,
          ));
          break;

        case 'messages':
          ({ deletedCount, archivedCount } = await this.purgeMessages(
            workspaceId,
            retentionDays,
            policy.archiveOldData,
          ));
          break;

        case 'knowledge':
          ({ deletedCount, archivedCount } = await this.purgeKnowledge(
            workspaceId,
            retentionDays,
            policy.archiveOldData,
          ));
          break;

        case 'embeddings':
          deletedCount = await this.prisma.knowledgeVector.deleteMany({
            where: {
              workspaceId,
              createdAt: {
                lt: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000),
              },
            },
          }).then((r) => r.count);
          break;

        default:
          throw new BadRequestException(`Unknown data type: ${policy.dataType}`);
      }

      // Update policy execution timestamp
      await this.prisma.retentionPolicy.update({
        where: { id: policyId },
        data: {
          lastExecutedAt: new Date(),
          nextExecuteAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });

      const result = {
        policyId,
        dataType: policy.dataType,
        deletedCount,
        archivedCount,
        executedAt: new Date(),
      };

      this.logger.log(`Policy ${policyId} executed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error applying retention policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Purge conversations based on retention days
   * @param workspaceId - Workspace ID
   * @param retentionDays - Retention days
   * @param archive - Whether to archive before deletion
   * @returns Counts of deleted and archived items
   */
  private async purgeConversations(
    workspaceId: string,
    retentionDays: number,
    archive: boolean,
  ): Promise<{ deletedCount: number; archivedCount: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let archivedCount = 0;

    if (archive) {
      const result = await this.prisma.conversation.updateMany({
        where: {
          workspaceId,
          createdAt: { lt: cutoffDate },
          isArchived: false,
        },
        data: { isArchived: true },
      });
      archivedCount = result.count;
    }

    const result = await this.prisma.conversation.deleteMany({
      where: {
        workspaceId,
        createdAt: { lt: cutoffDate },
        isArchived: true, // Only delete archived conversations
      },
    });

    return {
      deletedCount: result.count,
      archivedCount,
    };
  }

  /**
   * Purge messages based on retention days
   * @param workspaceId - Workspace ID
   * @param retentionDays - Retention days
   * @param archive - Whether to archive before deletion
   * @returns Counts of deleted and archived items
   */
  private async purgeMessages(
    workspaceId: string,
    retentionDays: number,
    archive: boolean,
  ): Promise<{ deletedCount: number; archivedCount: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Messages can be deleted directly
    const result = await this.prisma.conversationMessage.deleteMany({
      where: {
        conversation: {
          workspaceId,
        },
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      deletedCount: result.count,
      archivedCount: 0,
    };
  }

  /**
   * Purge knowledge entries based on retention days
   * @param workspaceId - Workspace ID
   * @param retentionDays - Retention days
   * @param archive - Whether to archive before deletion
   * @returns Counts of deleted and archived items
   */
  private async purgeKnowledge(
    workspaceId: string,
    retentionDays: number,
    archive: boolean,
  ): Promise<{ deletedCount: number; archivedCount: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let archivedCount = 0;

    if (archive) {
      const result = await this.prisma.knowledge.updateMany({
        where: {
          workspaceId,
          createdAt: { lt: cutoffDate },
          isArchived: false,
        },
        data: { isArchived: true },
      });
      archivedCount = result.count;
    }

    const result = await this.prisma.knowledge.deleteMany({
      where: {
        workspaceId,
        createdAt: { lt: cutoffDate },
        isArchived: true, // Only delete archived entries
      },
    });

    return {
      deletedCount: result.count,
      archivedCount,
    };
  }

  /**
   * Schedule cleanup for all active policies in a workspace
   * @param workspaceId - Workspace ID
   * @returns Scheduled policies
   */
  async scheduleCleanup(workspaceId: string): Promise<any[]> {
    try {
      const policies = await this.prisma.retentionPolicy.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
      });

      const scheduled = [];

      for (const policy of policies) {
        // Check if policy needs execution
        const now = new Date();
        if (!policy.nextExecuteAt || policy.nextExecuteAt <= now) {
          scheduled.push(policy);
        }
      }

      this.logger.log(`Scheduled ${scheduled.length} policies for cleanup`);
      return scheduled;
    } catch (error) {
      this.logger.error(`Error scheduling cleanup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive old entries without deletion
   * @param days - Number of days old
   * @param workspaceId - Workspace ID
   * @returns Count of archived entries
   */
  async archiveOldEntries(days: number, workspaceId: string): Promise<number> {
    try {
      if (days < 1) {
        throw new BadRequestException('Days must be at least 1');
      }

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Archive old conversations
      const conversationResult = await this.prisma.conversation.updateMany({
        where: {
          workspaceId,
          createdAt: { lt: cutoffDate },
          isArchived: false,
        },
        data: { isArchived: true },
      });

      // Archive old knowledge entries
      const knowledgeResult = await this.prisma.knowledge.updateMany({
        where: {
          workspaceId,
          createdAt: { lt: cutoffDate },
          isArchived: false,
        },
        data: { isArchived: true },
      });

      const totalArchived = conversationResult.count + knowledgeResult.count;
      this.logger.log(`Archived ${totalArchived} entries older than ${days} days`);

      return totalArchived;
    } catch (error) {
      this.logger.error(`Error archiving old entries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Purge expired content
   * @returns Count of purged items
   */
  async purgeExpiredContent(): Promise<number> {
    try {
      // Delete archived conversations older than 30 days
      const result = await this.prisma.conversation.deleteMany({
        where: {
          isArchived: true,
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      this.logger.log(`Purged ${result.count} expired conversations`);
      return result.count;
    } catch (error) {
      this.logger.error(`Error purging expired content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate retention report for a workspace
   * @param workspaceId - Workspace ID
   * @returns Retention statistics
   */
  async generateRetentionReport(workspaceId: string): Promise<any> {
    try {
      const [
        totalConversations,
        archivedConversations,
        totalKnowledge,
        archivedKnowledge,
        totalMessages,
        policies,
      ] = await Promise.all([
        this.prisma.conversation.count({ where: { workspaceId } }),
        this.prisma.conversation.count({ where: { workspaceId, isArchived: true } }),
        this.prisma.knowledge.count({ where: { workspaceId } }),
        this.prisma.knowledge.count({ where: { workspaceId, isArchived: true } }),
        this.prisma.conversationMessage.count({
          where: { conversation: { workspaceId } },
        }),
        this.prisma.retentionPolicy.findMany({
          where: { workspaceId },
        }),
      ]);

      return {
        workspace: {
          id: workspaceId,
          reportGeneratedAt: new Date(),
        },
        conversations: {
          total: totalConversations,
          archived: archivedConversations,
          active: totalConversations - archivedConversations,
          archivedPercentage: Math.round((archivedConversations / Math.max(totalConversations, 1)) * 100),
        },
        knowledge: {
          total: totalKnowledge,
          archived: archivedKnowledge,
          active: totalKnowledge - archivedKnowledge,
          archivedPercentage: Math.round((archivedKnowledge / Math.max(totalKnowledge, 1)) * 100),
        },
        messages: {
          total: totalMessages,
        },
        policies: {
          total: policies.length,
          active: policies.filter((p) => p.isActive).length,
          lastExecuted: policies
            .map((p) => ({ id: p.id, lastExecutedAt: p.lastExecutedAt }))
            .sort(
              (a, b) =>
                (b.lastExecutedAt?.getTime() || 0) - (a.lastExecutedAt?.getTime() || 0),
            )[0],
        },
        estimatedStorageReduction: Math.round((archivedKnowledge + archivedConversations) * 0.5),
      };
    } catch (error) {
      this.logger.error(`Error generating retention report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a retention policy
   * @param data - Policy data
   * @returns Created policy
   */
  async createPolicy(data: any): Promise<any> {
    try {
      if (!data.name || !data.dataType || !data.retentionDays) {
        throw new BadRequestException('Name, dataType, and retentionDays are required');
      }

      return await this.prisma.retentionPolicy.create({
        data: {
          workspaceId: data.workspaceId,
          name: data.name,
          description: data.description,
          dataType: data.dataType,
          retentionDays: data.retentionDays,
          archiveOldData: data.archiveOldData ?? true,
          autoExecute: data.autoExecute ?? true,
          isActive: data.isActive ?? true,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating retention policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a retention policy
   * @param policyId - Policy ID
   * @param data - Update data
   * @returns Updated policy
   */
  async updatePolicy(policyId: string, data: any): Promise<any> {
    try {
      return await this.prisma.retentionPolicy.update({
        where: { id: policyId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating retention policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a retention policy
   * @param policyId - Policy ID
   * @returns Deleted policy
   */
  async deletePolicy(policyId: string): Promise<any> {
    try {
      return await this.prisma.retentionPolicy.delete({
        where: { id: policyId },
      });
    } catch (error) {
      this.logger.error(`Error deleting retention policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all policies for a workspace
   * @param workspaceId - Workspace ID
   * @returns Array of policies
   */
  async getPolicies(workspaceId: string): Promise<any[]> {
    try {
      return await this.prisma.retentionPolicy.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error getting policies: ${error.message}`);
      throw error;
    }
  }
}
