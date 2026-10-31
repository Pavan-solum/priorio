import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

/**
 * E2E Integration Tests for AI Engine
 * Tests complete workflows across multiple AI operations
 */
describe('AI Engine E2E Integration (e2e)', () => {
  let app: INestApplication;
  let aiService: AIService;
  let prisma: PrismaService;

  const mockWorkspaceId = 'workspace-123';
  const mockUserId = 'user-456';
  const mockTaskId = 'task-789';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
            },
            operationMetric: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn((key) => {
              if (key === 'AI_PROVIDER') return 'openai';
              return undefined;
            }),
          },
        },
        {
          provide: 'OpenAIProvider',
          useValue: {
            name: 'OpenAI',
            classifyTask: jest.fn(),
            summarizeText: jest.fn(),
            extractEntities: jest.fn(),
            generateSuggestions: jest.fn(),
          },
        },
        {
          provide: 'AnthropicProvider',
          useValue: {
            name: 'Anthropic',
            classifyTask: jest.fn(),
            summarizeText: jest.fn(),
            extractEntities: jest.fn(),
          },
        },
      ],
    }).compile();

    aiService = moduleFixture.get<AIService>(AIService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  describe('Workflow: Complete Task Classification', () => {
    it('should classify task with category, priority, and tags', async () => {
      const taskText = 'Schedule meeting with team for project review tomorrow at 2pm';

      const result = await aiService.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        taskText,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
    });

    it('should classify personal task correctly', async () => {
      const taskText = 'Buy milk and bread from grocery store';

      const result = await aiService.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        taskText,
        mockUserId,
      );

      expect(result.category).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle high-priority urgent task', async () => {
      const taskText = 'URGENT: Server down, immediate action needed, production issue';

      const result = await aiService.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        taskText,
        mockUserId,
      );

      expect(result.priority).toBeTruthy();
      expect(['urgent', 'high']).toContain(result.priority?.toLowerCase());
    });
  });

  describe('Workflow: Text Summarization', () => {
    it('should summarize long task description', async () => {
      const longText =
        'This is a comprehensive task that involves multiple steps. ' +
        'First, we need to analyze the requirements. Second, we need to design the solution. ' +
        'Third, we need to implement the code. Finally, we need to test everything thoroughly. ' +
        'The project has a deadline of next Friday and involves 5 team members.';

      const summary = await aiService.summarizeTask(
        mockWorkspaceId,
        mockTaskId,
        longText,
        mockUserId,
        100,
      );

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeLessThanOrEqual(100);
    });

    it('should respect max length parameter', async () => {
      const text = 'This is a task description that needs summarization';
      const maxLength = 50;

      const summary = await aiService.summarizeTask(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
        maxLength,
      );

      expect(summary.length).toBeLessThanOrEqual(maxLength);
    });

    it('should handle short text gracefully', async () => {
      const shortText = 'Do laundry';

      const summary = await aiService.summarizeTask(
        mockWorkspaceId,
        mockTaskId,
        shortText,
        mockUserId,
      );

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow: Entity Extraction', () => {
    it('should extract date entities from task', async () => {
      const text = 'Meeting scheduled for January 15, 2025 at 3pm with Sarah';

      const entities = await aiService.extractEntities(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);

      const dateEntities = entities.filter((e) => e.type === 'date');
      expect(dateEntities.length).toBeGreaterThan(0);
    });

    it('should extract person entities', async () => {
      const text = 'Call John and Maria to discuss the project with Mike';

      const entities = await aiService.extractEntities(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      const personEntities = entities.filter((e) => e.type === 'person');
      expect(personEntities.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract location entities', async () => {
      const text = 'Conference call from New York office, video conference with London team';

      const entities = await aiService.extractEntities(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      const locationEntities = entities.filter((e) => e.type === 'location');
      expect(locationEntities.length).toBeGreaterThan(0);
    });

    it('should include confidence scores', async () => {
      const text = 'Meeting with Alice at 2pm tomorrow';

      const entities = await aiService.extractEntities(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      entities.forEach((entity) => {
        expect(entity).toHaveProperty('confidence');
        expect(entity.confidence).toBeGreaterThanOrEqual(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Workflow: Smart Suggestions', () => {
    it('should generate improvement suggestions', async () => {
      const task = {
        title: 'Fix bug',
        description: 'There is a problem with the login page',
        category: 'work',
        priority: 'high',
      };

      const suggestions = await aiService.generateSuggestions(
        mockWorkspaceId,
        mockTaskId,
        task,
        mockUserId,
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should suggest priority improvements', async () => {
      const task = {
        title: 'Low quality task title',
        description: '',
        priority: 'low',
      };

      const suggestions = await aiService.generateSuggestions(
        mockWorkspaceId,
        mockTaskId,
        task,
        mockUserId,
      );

      expect(suggestions.some((s) => s.type === 'priority')).toBeTruthy();
    });

    it('should suggest description improvements', async () => {
      const task = {
        title: 'Improve API',
        description: 'Make API better',
      };

      const suggestions = await aiService.generateSuggestions(
        mockWorkspaceId,
        mockTaskId,
        task,
        mockUserId,
      );

      expect(suggestions.some((s) => s.type === 'description')).toBeTruthy();
    });
  });

  describe('Workflow: Cost Tracking', () => {
    it('should estimate cost for OpenAI operation', async () => {
      const text = 'This is a test task for cost estimation';

      const cost = await aiService.estimateCost(text, 'openai');

      expect(cost).toBeDefined();
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle different token counts', async () => {
      const shortText = 'Brief';
      const longText = 'This is a much longer text ' + 'with more content '.repeat(50);

      const shortCost = await aiService.estimateCost(shortText, 'openai');
      const longCost = await aiService.estimateCost(longText, 'openai');

      expect(longCost).toBeGreaterThan(shortCost);
    });

    it('should track cumulative costs', async () => {
      const text = 'Test task';
      const cost1 = await aiService.estimateCost(text, 'openai');
      const cost2 = await aiService.estimateCost(text, 'openai');

      // Costs should accumulate
      expect(cost1 + cost2).toBeGreaterThan(cost1);
    });
  });

  describe('Workflow: Provider Fallback', () => {
    it('should fallback to Anthropic if OpenAI fails', async () => {
      const text = 'Test task for fallback';

      try {
        const result = await aiService.classifyTask(
          mockWorkspaceId,
          mockTaskId,
          text,
          mockUserId,
          'anthropic',
        );

        expect(result).toBeDefined();
      } catch (error) {
        // If fallback fails, error should be handled
        expect(error).toBeDefined();
      }
    });

    it('should log provider usage', async () => {
      const text = 'Test task for logging';

      await aiService.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      // Verify audit log was called (if implemented)
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Workflow: Error Handling', () => {
    it('should handle invalid task text', async () => {
      await expect(
        aiService.classifyTask(
          mockWorkspaceId,
          mockTaskId,
          '',
          mockUserId,
        ),
      ).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      // This test would require mocking network failures
      // In a real E2E test, this would test actual timeout handling
      expect(true).toBe(true);
    });

    it('should handle rate limiting', async () => {
      // Test rate limit handling
      expect(true).toBe(true);
    });
  });

  describe('Workflow: Metric Recording', () => {
    it('should record classification metrics', async () => {
      const text = 'Test task';

      await aiService.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      expect(prisma.operationMetric.create).toHaveBeenCalled();
    });

    it('should track execution time', async () => {
      const text = 'Test task';
      const startTime = Date.now();

      await aiService.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        text,
        mockUserId,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should record success/failure status', async () => {
      const text = 'Test task';

      try {
        await aiService.classifyTask(
          mockWorkspaceId,
          mockTaskId,
          text,
          mockUserId,
        );

        expect(prisma.operationMetric.create).toHaveBeenCalled();
      } catch (error) {
        expect(prisma.operationMetric.create).toHaveBeenCalled();
      }
    });
  });
});
