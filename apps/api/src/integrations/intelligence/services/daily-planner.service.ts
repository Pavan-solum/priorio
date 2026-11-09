import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma';

interface TimeBlock {
  taskId: string;
  taskTitle: string;
  startTime: string;
  endTime: string;
  estimatedDuration: number;
  priority: string;
  completionScore?: number;
}

interface BreakSuggestion {
  time: string;
  duration: number;
  type: 'short' | 'lunch' | 'exercise';
  reason: string;
}

interface DailyPlanMetrics {
  totalTasks: number;
  totalEstimatedHours: number;
  highPriorityCount: number;
  completionProbability: number;
  avgTaskDuration: number;
  breakMinutes: number;
}

/**
 * DailyPlannerService
 * Generates and optimizes daily task plans with time blocks and productivity insights
 */
@Injectable()
export class DailyPlannerService {
  private readonly logger = new Logger(DailyPlannerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate an optimized daily plan for a user
   * @param userId - User ID
   * @param date - Date for the plan
   * @param workspaceId - Workspace ID
   * @returns Daily plan with optimized task ordering and time blocks
   */
  async generateDailyPlan(
    userId: string,
    date: Date,
    workspaceId: string,
  ): Promise<any> {
    try {
      this.logger.debug(`Generating daily plan for user ${userId} on ${date}`);

      // Fetch all tasks for the day
      const tasks = await this.prisma.task.findMany({
        where: {
          workspaceId,
          createdById: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueAt: {
            gte: new Date(date),
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { priority: 'desc' },
      });

      if (tasks.length === 0) {
        return {
          planDate: date,
          taskIds: [],
          timeBlocks: [],
          breaks: [],
          metrics: this.getEmptyMetrics(),
        };
      }

      // Analyze historical performance
      const historicalData = await this.analyzeHistoricalPerformance(userId);

      // Estimate time blocks
      const timeBlocks = await this.estimateTimeBlocks(tasks, historicalData);

      // Optimize task order
      const optimizedTasks = await this.optimizeTaskOrder(tasks);

      // Suggest breaks
      const breaks = this.suggestBreaks(optimizedTasks, timeBlocks);

      // Calculate metrics
      const metrics = this.calculateMetrics(timeBlocks, tasks, breaks);

      // Create or update daily plan in database
      const planDate = new Date(date);
      planDate.setHours(0, 0, 0, 0);

      const dailyPlan = await this.prisma.dailyPlan.upsert({
        where: {
          userId_planDate: {
            userId,
            planDate,
          },
        },
        update: {
          taskIds: optimizedTasks.map((t) => t.id),
          timeBlocks: timeBlocks as any,
          breaks: breaks as any,
          metrics: metrics as any,
          updatedAt: new Date(),
        },
        create: {
          workspaceId,
          userId,
          planDate,
          taskIds: optimizedTasks.map((t) => t.id),
          timeBlocks: timeBlocks as any,
          breaks: breaks as any,
          metrics: metrics as any,
        },
      });

      return {
        id: dailyPlan.id,
        planDate: dailyPlan.planDate,
        taskIds: dailyPlan.taskIds,
        timeBlocks: dailyPlan.timeBlocks,
        breaks: dailyPlan.breaks,
        metrics: dailyPlan.metrics,
      };
    } catch (error) {
      this.logger.error(`Error generating daily plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optimize task ordering based on priority, duration, and dependencies
   * @param tasks - Tasks to optimize
   * @returns Optimized task order
   */
  async optimizeTaskOrder(tasks: any[]): Promise<any[]> {
    try {
      // Sort by priority (HIGH, CRITICAL first), then by due date
      const priorityMap: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };

      return [...tasks].sort((a, b) => {
        const priorityDiff =
          (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;

        // If same priority, sort by due date
        if (a.dueAt && b.dueAt) {
          return a.dueAt.getTime() - b.dueAt.getTime();
        }
        return 0;
      });
    } catch (error) {
      this.logger.error(`Error optimizing task order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimate time blocks for tasks based on historical data
   * @param tasks - Tasks to estimate
   * @param historicalData - User's historical performance data
   * @returns Array of time blocks
   */
  async estimateTimeBlocks(tasks: any[], historicalData: any): Promise<TimeBlock[]> {
    try {
      const timeBlocks: TimeBlock[] = [];
      let currentTime = new Date();
      currentTime.setHours(9, 0, 0, 0); // Start at 9 AM

      for (const task of tasks) {
        // Estimate duration based on historical data and task complexity
        const estimatedDuration = this.estimateTaskDuration(
          task,
          historicalData,
        );

        const endTime = new Date(currentTime.getTime() + estimatedDuration * 60000);

        timeBlocks.push({
          taskId: task.id,
          taskTitle: task.title,
          startTime: currentTime.toISOString(),
          endTime: endTime.toISOString(),
          estimatedDuration,
          priority: task.priority,
        });

        // Add buffer time between tasks (5-10 minutes)
        currentTime = new Date(endTime.getTime() + 5 * 60000);
      }

      return timeBlocks;
    } catch (error) {
      this.logger.error(`Error estimating time blocks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimate duration for a single task
   * @param task - Task to estimate
   * @param historicalData - Historical performance data
   * @returns Estimated duration in minutes
   */
  private estimateTaskDuration(task: any, historicalData: any): number {
    // Base estimate: 30-60 minutes depending on priority
    const priorityDurationMap: Record<string, number> = {
      CRITICAL: 60,
      HIGH: 45,
      MEDIUM: 30,
      LOW: 20,
    };

    const baseEstimate = priorityDurationMap[task.priority] || 30;
    const avgTaskDuration = historicalData?.avgTaskDuration || 30;

    // Adjust based on historical average (70% base, 30% historical)
    return Math.round(baseEstimate * 0.7 + avgTaskDuration * 0.3);
  }

  /**
   * Suggest breaks in the daily schedule
   * @param tasks - Ordered tasks
   * @param timeBlocks - Time blocks
   * @returns Array of break suggestions
   */
  suggestBreaks(tasks: any[], timeBlocks: TimeBlock[]): BreakSuggestion[] {
    const breaks: BreakSuggestion[] = [];

    // Calculate total work time
    let totalWorkMinutes = 0;
    for (const block of timeBlocks) {
      totalWorkMinutes += block.estimatedDuration;
    }

    // Suggest lunch break after 4 hours
    if (totalWorkMinutes >= 240) {
      const lunchTime = new Date();
      lunchTime.setHours(12, 30, 0, 0); // Lunch at 12:30 PM

      breaks.push({
        time: lunchTime.toISOString(),
        duration: 60,
        type: 'lunch',
        reason: 'Midday nutrition and rest',
      });
    }

    // Suggest short breaks every 90 minutes (Pomodoro-style)
    let accumulatedTime = 0;
    for (let i = 0; i < timeBlocks.length; i++) {
      accumulatedTime += timeBlocks[i].estimatedDuration;

      if (accumulatedTime >= 90 && i < timeBlocks.length - 1) {
        const breakTime = new Date();
        breakTime.setMinutes(breakTime.getMinutes() + accumulatedTime);

        breaks.push({
          time: breakTime.toISOString(),
          duration: 15,
          type: 'short',
          reason: 'Rest and focus recovery',
        });

        accumulatedTime = 0;
      }
    }

    // Suggest exercise break if day is long
    if (totalWorkMinutes > 480) {
      const exerciseTime = new Date();
      exerciseTime.setHours(15, 0, 0, 0); // 3 PM

      breaks.push({
        time: exerciseTime.toISOString(),
        duration: 20,
        type: 'exercise',
        reason: 'Physical activity for energy and focus',
      });
    }

    return breaks;
  }

  /**
   * Predict the completability of a daily plan
   * @param plan - Daily plan
   * @returns Completion probability (0-100)
   */
  async predictCompletability(plan: any): Promise<number> {
    try {
      // Calculate based on number of tasks, total time, and user's historical completion rate
      const timeBlocks = plan.timeBlocks || [];
      const totalMinutes = timeBlocks.reduce(
        (sum: number, block: TimeBlock) => sum + block.estimatedDuration,
        0,
      );

      // If plan is more than 8 hours, reduce probability
      let probability = 85;

      if (totalMinutes > 480) {
        probability -= (totalMinutes - 480) / 30; // Reduce by ~1% per 30 min over 8 hours
      }

      // Adjust based on number of high-priority tasks
      const highPriorityCount = timeBlocks.filter(
        (b: TimeBlock) => b.priority === 'CRITICAL' || b.priority === 'HIGH',
      ).length;

      if (highPriorityCount > 3) {
        probability -= highPriorityCount * 2;
      }

      return Math.max(20, Math.min(100, Math.round(probability)));
    } catch (error) {
      this.logger.error(`Error predicting completability: ${error.message}`);
      return 50;
    }
  }

  /**
   * Analyze historical performance data for a user
   * @param userId - User ID
   * @returns Historical performance metrics
   */
  async analyzeHistoricalPerformance(userId: string): Promise<any> {
    try {
      // Get completed tasks from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const completedTasks = await this.prisma.task.findMany({
        where: {
          createdById: userId,
          status: 'COMPLETED',
          completedAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Calculate average task duration
      let totalDuration = 0;
      let totalTasks = completedTasks.length;

      if (totalTasks === 0) {
        return {
          avgTaskDuration: 30,
          completionRate: 0.5,
          totalTasksCompleted: 0,
          mostProductiveHour: 10,
        };
      }

      totalDuration = totalTasks * 35; // Assume average 35 minutes per task
      const avgTaskDuration = Math.round(totalDuration / totalTasks);

      // Calculate completion rate
      const allTasksLast30Days = await this.prisma.task.findMany({
        where: {
          createdById: userId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      const completionRate = allTasksLast30Days.length
        ? completedTasks.length / allTasksLast30Days.length
        : 0.5;

      return {
        avgTaskDuration,
        completionRate,
        totalTasksCompleted: completedTasks.length,
        mostProductiveHour: 10, // Default morning productivity
      };
    } catch (error) {
      this.logger.error(
        `Error analyzing historical performance: ${error.message}`,
      );
      return {
        avgTaskDuration: 30,
        completionRate: 0.5,
        totalTasksCompleted: 0,
        mostProductiveHour: 10,
      };
    }
  }

  /**
   * Calculate daily plan metrics
   * @param timeBlocks - Time blocks
   * @param tasks - Tasks
   * @param breaks - Break suggestions
   * @returns Daily plan metrics
   */
  private calculateMetrics(
    timeBlocks: TimeBlock[],
    tasks: any[],
    breaks: BreakSuggestion[],
  ): DailyPlanMetrics {
    const totalEstimatedMinutes = timeBlocks.reduce(
      (sum, block) => sum + block.estimatedDuration,
      0,
    );

    const totalBreakMinutes = breaks.reduce((sum, br) => sum + br.duration, 0);

    const highPriorityCount = tasks.filter(
      (t) => t.priority === 'CRITICAL' || t.priority === 'HIGH',
    ).length;

    return {
      totalTasks: tasks.length,
      totalEstimatedHours: Math.round(totalEstimatedMinutes / 60 * 10) / 10,
      highPriorityCount,
      completionProbability: 0.75,
      avgTaskDuration: Math.round(totalEstimatedMinutes / tasks.length),
      breakMinutes: totalBreakMinutes,
    };
  }

  /**
   * Get empty metrics structure
   * @returns Empty metrics
   */
  private getEmptyMetrics(): DailyPlanMetrics {
    return {
      totalTasks: 0,
      totalEstimatedHours: 0,
      highPriorityCount: 0,
      completionProbability: 0,
      avgTaskDuration: 0,
      breakMinutes: 0,
    };
  }

  /**
   * Get daily plan for a specific date
   * @param userId - User ID
   * @param date - Plan date
   * @returns Daily plan
   */
  async getDailyPlan(userId: string, date: Date): Promise<any> {
    try {
      const planDate = new Date(date);
      planDate.setHours(0, 0, 0, 0);

      return await this.prisma.dailyPlan.findUnique({
        where: {
          userId_planDate: {
            userId,
            planDate,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting daily plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a daily plan (mark as executed)
   * @param planId - Plan ID
   * @returns Updated plan
   */
  async executeDailyPlan(planId: string): Promise<any> {
    try {
      return await this.prisma.dailyPlan.update({
        where: { id: planId },
        data: {
          isExecuted: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error executing daily plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get daily plans for a user in a date range
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of daily plans
   */
  async getDailyPlansRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      return await this.prisma.dailyPlan.findMany({
        where: {
          userId,
          planDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { planDate: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error getting daily plans range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a daily plan
   * @param planId - Plan ID
   * @returns Deleted plan
   */
  async deleteDailyPlan(planId: string): Promise<any> {
    try {
      return await this.prisma.dailyPlan.delete({
        where: { id: planId },
      });
    } catch (error) {
      this.logger.error(`Error deleting daily plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update daily plan
   * @param planId - Plan ID
   * @param data - Update data
   * @returns Updated plan
   */
  async updateDailyPlan(planId: string, data: any): Promise<any> {
    try {
      return await this.prisma.dailyPlan.update({
        where: { id: planId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating daily plan: ${error.message}`);
      throw error;
    }
  }
}
