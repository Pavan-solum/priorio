import { Test, TestingModule } from '@nestjs/testing';
import { DailyPlannerService } from '../daily-planner.service';
import { PrismaService } from '../../../../prisma/prisma.service';

describe('DailyPlannerService', () => {
  let service: DailyPlannerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    task: {
      findMany: jest.fn(),
    },
    dailyPlan: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyPlannerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DailyPlannerService>(DailyPlannerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDailyPlan', () => {
    it('should generate a daily plan for a user', async () => {
      const userId = 'user-123';
      const workspaceId = 'workspace-123';
      const date = new Date();

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          priority: 'HIGH',
          dueAt: date,
        },
        {
          id: 'task-2',
          title: 'Task 2',
          priority: 'MEDIUM',
          dueAt: date,
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.dailyPlan.upsert.mockResolvedValue({
        id: 'plan-123',
        planDate: date,
        taskIds: ['task-1', 'task-2'],
        timeBlocks: [],
        breaks: [],
        metrics: {},
      });

      const result = await service.generateDailyPlan(userId, date, workspaceId);

      expect(result).toBeDefined();
      expect(result.taskIds).toContain('task-1');
      expect(result.taskIds).toContain('task-2');
    });

    it('should return empty plan when no tasks', async () => {
      const userId = 'user-123';
      const workspaceId = 'workspace-123';
      const date = new Date();

      mockPrismaService.task.findMany.mockResolvedValue([]);

      const result = await service.generateDailyPlan(userId, date, workspaceId);

      expect(result.taskIds).toEqual([]);
      expect(result.timeBlocks).toEqual([]);
    });
  });

  describe('optimizeTaskOrder', () => {
    it('should sort tasks by priority', async () => {
      const tasks = [
        { id: '1', title: 'Low', priority: 'LOW', dueAt: new Date() },
        { id: '2', title: 'High', priority: 'HIGH', dueAt: new Date() },
        { id: '3', title: 'Critical', priority: 'CRITICAL', dueAt: new Date() },
      ];

      const result = await service.optimizeTaskOrder(tasks);

      expect(result[0].priority).toBe('CRITICAL');
      expect(result[1].priority).toBe('HIGH');
      expect(result[2].priority).toBe('LOW');
    });
  });

  describe('estimateTimeBlocks', () => {
    it('should estimate time blocks for tasks', async () => {
      const tasks = [
        { id: '1', title: 'Task 1', priority: 'HIGH' },
        { id: '2', title: 'Task 2', priority: 'MEDIUM' },
      ];

      const historicalData = {
        avgTaskDuration: 30,
        completionRate: 0.7,
      };

      const result = await service.estimateTimeBlocks(tasks, historicalData);

      expect(result.length).toBe(2);
      expect(result[0].estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('suggestBreaks', () => {
    it('should suggest breaks for long workdays', () => {
      const timeBlocks = [
        {
          taskId: '1',
          taskTitle: 'Task 1',
          estimatedDuration: 120,
          startTime: '09:00',
          endTime: '11:00',
          priority: 'HIGH',
        },
        {
          taskId: '2',
          taskTitle: 'Task 2',
          estimatedDuration: 120,
          startTime: '11:00',
          endTime: '13:00',
          priority: 'MEDIUM',
        },
      ];

      const result = service.suggestBreaks([], timeBlocks);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('predictCompletability', () => {
    it('should calculate completion probability', async () => {
      const plan = {
        timeBlocks: [
          {
            taskId: '1',
            estimatedDuration: 30,
            priority: 'HIGH',
          },
          {
            taskId: '2',
            estimatedDuration: 45,
            priority: 'MEDIUM',
          },
        ],
      };

      const result = await service.predictCompletability(plan);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeHistoricalPerformance', () => {
    it('should analyze user performance history', async () => {
      const userId = 'user-123';

      mockPrismaService.task.findMany.mockResolvedValueOnce([]); // completed tasks
      mockPrismaService.task.findMany.mockResolvedValueOnce([]); // all tasks

      const result = await service.analyzeHistoricalPerformance(userId);

      expect(result).toHaveProperty('avgTaskDuration');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('totalTasksCompleted');
    });
  });

  describe('getDailyPlan', () => {
    it('should retrieve a daily plan', async () => {
      const userId = 'user-123';
      const date = new Date();

      mockPrismaService.dailyPlan.findUnique.mockResolvedValue({
        id: 'plan-123',
        planDate: date,
        taskIds: ['task-1'],
      });

      const result = await service.getDailyPlan(userId, date);

      expect(result).toBeDefined();
      expect(result.id).toBe('plan-123');
    });
  });

  describe('executeDailyPlan', () => {
    it('should mark plan as executed', async () => {
      const planId = 'plan-123';

      mockPrismaService.dailyPlan.update.mockResolvedValue({
        id: planId,
        isExecuted: true,
      });

      const result = await service.executeDailyPlan(planId);

      expect(result.isExecuted).toBe(true);
    });
  });

  describe('getDailyPlansRange', () => {
    it('should retrieve plans in date range', async () => {
      const userId = 'user-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.dailyPlan.findMany.mockResolvedValue([
        { id: 'plan-1', planDate: new Date('2024-01-15') },
        { id: 'plan-2', planDate: new Date('2024-01-20') },
      ]);

      const result = await service.getDailyPlansRange(userId, startDate, endDate);

      expect(result.length).toBe(2);
    });
  });

  describe('deleteDailyPlan', () => {
    it('should delete a daily plan', async () => {
      const planId = 'plan-123';

      mockPrismaService.dailyPlan.delete.mockResolvedValue({
        id: planId,
      });

      const result = await service.deleteDailyPlan(planId);

      expect(result.id).toBe(planId);
    });
  });

  describe('updateDailyPlan', () => {
    it('should update a daily plan', async () => {
      const planId = 'plan-123';
      const updateData = { isExecuted: true };

      mockPrismaService.dailyPlan.update.mockResolvedValue({
        id: planId,
        ...updateData,
      });

      const result = await service.updateDailyPlan(planId, updateData);

      expect(result.id).toBe(planId);
      expect(result.isExecuted).toBe(true);
    });
  });
});
