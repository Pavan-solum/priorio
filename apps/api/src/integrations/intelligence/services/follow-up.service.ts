import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface FollowUpStats {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
  completionRate: number;
}

/**
 * FollowUpService
 * Manages follow-up tasks and automatic follow-up creation
 */
@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a follow-up for a task or message
   * @param sourceMessageId - Source message ID
   * @param dueDate - Due date for follow-up
   * @param workspaceId - Workspace ID
   * @returns Created follow-up
   */
  async createFollowUp(
    sourceMessageId: string,
    dueDate: Date,
    workspaceId: string,
  ): Promise<any> {
    try {
      if (!sourceMessageId) {
        throw new BadRequestException('Source message ID is required');
      }

      if (!dueDate) {
        throw new BadRequestException('Due date is required');
      }

      // Verify message exists
      const message = await this.prisma.message.findUnique({
        where: { id: sourceMessageId },
      });

      if (!message) {
        throw new BadRequestException('Source message not found');
      }

      // Check if follow-up already exists
      const existingFollowUp = await this.prisma.followUp.findFirst({
        where: {
          workspaceId,
          sourceMessageId,
        },
      });

      if (existingFollowUp) {
        throw new BadRequestException('Follow-up already exists for this message');
      }

      const followUp = await this.prisma.followUp.create({
        data: {
          workspaceId,
          sourceMessageId,
          expectedResponseAt: dueDate,
          status: 'pending',
        },
      });

      this.logger.log(`Follow-up created: ${followUp.id}`);
      return followUp;
    } catch (error) {
      this.logger.error(`Error creating follow-up: ${error.message}`);
      throw error;
    }
  }

  /**
   * Automatically create follow-ups based on message content
   * @param taskId - Task ID
   * @param workspaceId - Workspace ID
   * @returns Created follow-up
   */
  async autoCreateFollowUps(taskId: string, workspaceId: string): Promise<any> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { sourceMessage: true },
      });

      if (!task || !task.sourceMessage) {
        throw new BadRequestException('Task or source message not found');
      }

      // Check if follow-up keywords are present in task title/description
      const followUpKeywords = [
        'follow up',
        'check in',
        'update',
        'status',
        'progress',
      ];
      const lowerContent = `${task.title} ${task.description}`.toLowerCase();
      const hasFollowUpKeyword = followUpKeywords.some((keyword) =>
        lowerContent.includes(keyword),
      );

      if (!hasFollowUpKeyword) {
        return null;
      }

      // Create follow-up 3 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      return await this.createFollowUp(
        task.sourceMessage.id,
        dueDate,
        workspaceId,
      );
    } catch (error) {
      this.logger.error(`Error auto-creating follow-ups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track the status of a follow-up
   * @param followUpId - Follow-up ID
   * @returns Follow-up status
   */
  async trackFollowUpStatus(followUpId: string): Promise<any> {
    try {
      const followUp = await this.prisma.followUp.findUnique({
        where: { id: followUpId },
        include: { sourceMessage: true },
      });

      if (!followUp) {
        throw new BadRequestException('Follow-up not found');
      }

      // Check if overdue
      const now = new Date();
      const isOverdue =
        followUp.expectedResponseAt && followUp.expectedResponseAt < now;

      return {
        ...followUp,
        isOverdue,
        daysUntilDue: followUp.expectedResponseAt
          ? Math.ceil(
              (followUp.expectedResponseAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      };
    } catch (error) {
      this.logger.error(`Error tracking follow-up status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suggest follow-ups for a task
   * @param taskId - Task ID
   * @returns Follow-up suggestions
   */
  async suggestFollowUps(taskId: string): Promise<any[]> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new BadRequestException('Task not found');
      }

      const suggestions = [];

      // Suggest follow-up after 1 week
      if (
        task.status === 'IN_PROGRESS' ||
        task.status === 'PENDING'
      ) {
        const oneWeekLater = new Date();
        oneWeekLater.setDate(oneWeekLater.getDate() + 7);

        suggestions.push({
          type: 'weekly_check_in',
          dueDate: oneWeekLater,
          reason: 'Check progress on task',
          priority: 'MEDIUM',
        });
      }

      // Suggest follow-up after task completion
      if (task.status === 'COMPLETED' && task.completedAt) {
        const threeWeeksLater = new Date();
        threeWeeksLater.setDate(threeWeeksLater.getDate() + 21);

        suggestions.push({
          type: 'post_completion_review',
          dueDate: threeWeeksLater,
          reason: 'Review outcomes and results',
          priority: 'LOW',
        });
      }

      // Suggest follow-up if due date is approaching
      if (task.dueAt) {
        const now = new Date();
        const daysDue = Math.ceil(
          (task.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDue <= 3 && daysDue > 0 && task.status !== 'COMPLETED') {
          const dayBeforeDue = new Date(task.dueAt);
          dayBeforeDue.setDate(dayBeforeDue.getDate() - 1);

          suggestions.push({
            type: 'pre_due_reminder',
            dueDate: dayBeforeDue,
            reason: 'Reminder before task due date',
            priority: 'HIGH',
          });
        }
      }

      return suggestions;
    } catch (error) {
      this.logger.error(`Error suggesting follow-ups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Escalate overdue follow-ups
   * @returns Escalated follow-ups
   */
  async escalateOverdueFollowUps(): Promise<any[]> {
    try {
      const now = new Date();

      // Find overdue follow-ups
      const overdueFollowUps = await this.prisma.followUp.findMany({
        where: {
          status: 'pending',
          expectedResponseAt: {
            lt: now,
          },
        },
      });

      this.logger.log(`Found ${overdueFollowUps.length} overdue follow-ups`);

      // Update status to escalated for those more than 3 days overdue
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const escalatedCount = await this.prisma.followUp.updateMany({
        where: {
          status: 'pending',
          expectedResponseAt: {
            lt: threeDaysAgo,
          },
        },
        data: {
          status: 'escalated',
        },
      });

      this.logger.log(`Escalated ${escalatedCount.count} follow-ups`);

      return overdueFollowUps.slice(0, 10); // Return first 10 for notification
    } catch (error) {
      this.logger.error(`Error escalating overdue follow-ups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get follow-up statistics for a workspace
   * @param workspaceId - Workspace ID
   * @returns Follow-up statistics
   */
  async getFollowUpStats(workspaceId: string): Promise<FollowUpStats> {
    try {
      const now = new Date();

      const [total, pending, overdue, completed] = await Promise.all([
        this.prisma.followUp.count({
          where: { workspaceId },
        }),
        this.prisma.followUp.count({
          where: {
            workspaceId,
            status: 'pending',
          },
        }),
        this.prisma.followUp.count({
          where: {
            workspaceId,
            status: 'pending',
            expectedResponseAt: {
              lt: now,
            },
          },
        }),
        this.prisma.followUp.count({
          where: {
            workspaceId,
            status: 'completed',
          },
        }),
      ]);

      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        pending,
        overdue,
        completed,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Error getting follow-up stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all follow-ups for a workspace
   * @param workspaceId - Workspace ID
   * @param limit - Limit number of results
   * @param offset - Offset for pagination
   * @returns Array of follow-ups
   */
  async getFollowUps(
    workspaceId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      return await this.prisma.followUp.findMany({
        where: { workspaceId },
        include: { sourceMessage: true },
        orderBy: [
          { expectedResponseAt: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error(`Error getting follow-ups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get overdue follow-ups for a workspace
   * @param workspaceId - Workspace ID
   * @returns Array of overdue follow-ups
   */
  async getOverdueFollowUps(workspaceId: string): Promise<any[]> {
    try {
      const now = new Date();

      return await this.prisma.followUp.findMany({
        where: {
          workspaceId,
          status: 'pending',
          expectedResponseAt: {
            lt: now,
          },
        },
        include: { sourceMessage: true },
        orderBy: { expectedResponseAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Error getting overdue follow-ups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update follow-up status
   * @param followUpId - Follow-up ID
   * @param status - New status
   * @returns Updated follow-up
   */
  async updateFollowUpStatus(
    followUpId: string,
    status: string,
  ): Promise<any> {
    try {
      if (!['pending', 'completed', 'cancelled', 'escalated'].includes(status)) {
        throw new BadRequestException('Invalid status');
      }

      return await this.prisma.followUp.update({
        where: { id: followUpId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating follow-up status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete a follow-up
   * @param followUpId - Follow-up ID
   * @returns Completed follow-up
   */
  async completeFollowUp(followUpId: string): Promise<any> {
    try {
      return await this.updateFollowUpStatus(followUpId, 'completed');
    } catch (error) {
      this.logger.error(`Error completing follow-up: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a follow-up
   * @param followUpId - Follow-up ID
   * @returns Deleted follow-up
   */
  async deleteFollowUp(followUpId: string): Promise<any> {
    try {
      return await this.prisma.followUp.delete({
        where: { id: followUpId },
      });
    } catch (error) {
      this.logger.error(`Error deleting follow-up: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update follow-up details
   * @param followUpId - Follow-up ID
   * @param data - Update data
   * @returns Updated follow-up
   */
  async updateFollowUp(followUpId: string, data: any): Promise<any> {
    try {
      return await this.prisma.followUp.update({
        where: { id: followUpId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating follow-up: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get follow-ups by status
   * @param workspaceId - Workspace ID
   * @param status - Status filter
   * @returns Array of follow-ups
   */
  async getFollowUpsByStatus(workspaceId: string, status: string): Promise<any[]> {
    try {
      return await this.prisma.followUp.findMany({
        where: {
          workspaceId,
          status,
        },
        include: { sourceMessage: true },
        orderBy: { expectedResponseAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error getting follow-ups by status: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get follow-up by ID
   * @param followUpId - Follow-up ID
   * @returns Follow-up
   */
  async getFollowUpById(followUpId: string): Promise<any> {
    try {
      return await this.prisma.followUp.findUnique({
        where: { id: followUpId },
        include: { sourceMessage: true },
      });
    } catch (error) {
      this.logger.error(`Error getting follow-up: ${error.message}`);
      throw error;
    }
  }
}
