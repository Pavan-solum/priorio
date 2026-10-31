import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../ai.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../../audit-logs/audit-logs.service';

describe('AIService', () => {
  let service: AIService;
  let openaiProvider: OpenAIProvider;
  let anthropicProvider: AnthropicProvider;
  let prisma: PrismaService;
  let auditLogs: AuditLogsService;
  let config: ConfigService;

  const mockWorkspaceId = '00000000-0000-0000-0000-000000000001';
  const mockTaskId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              const config = {
                AI_PROVIDER: 'openai',
                OPENAI_API_KEY: 'sk-test',
                OPENAI_MODEL: 'gpt-4-turbo-preview',
                ANTHROPIC_API_KEY: 'sk-ant-test',
                ANTHROPIC_MODEL: 'claude-3-sonnet-20240229',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            aiOperation: {
              create: jest.fn(),
              findMany: jest.fn(),
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
          provide: OpenAIProvider,
          useValue: {
            name: 'openai',
            model: 'gpt-4-turbo-preview',
            classifyTask: jest.fn(),
            summarizeText: jest.fn(),
            extractEntities: jest.fn(),
            generateSuggestions: jest.fn(),
            validateConnection: jest.fn(),
            estimateCost: jest.fn(),
          },
        },
        {
          provide: AnthropicProvider,
          useValue: {
            name: 'anthropic',
            model: 'claude-3-sonnet-20240229',
            classifyTask: jest.fn(),
            summarizeText: jest.fn(),
            extractEntities: jest.fn(),
            generateSuggestions: jest.fn(),
            validateConnection: jest.fn(),
            estimateCost: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    openaiProvider = module.get<OpenAIProvider>(OpenAIProvider);
    anthropicProvider = module.get<AnthropicProvider>(AnthropicProvider);
    prisma = module.get<PrismaService>(PrismaService);
    auditLogs = module.get<AuditLogsService>(AuditLogsService);
    config = module.get<ConfigService>(ConfigService);
  });

  describe('classifyTask', () => {
    it('should classify a task with default provider', async () => {
      const text = 'Review project proposal for Q4 2026';
      const mockClassification = {
        category: 'work',
        priority: 'high' as const,
        tags: ['review', 'project'],
        confidence: 0.92,
        reasoning: 'Business task requiring review',
      };

      jest.spyOn(openaiProvider, 'classifyTask').mockResolvedValue(mockClassification);

      const result = await service.classifyTask(mockWorkspaceId, mockTaskId, text);

      expect(result).toEqual(mockClassification);
      expect(openaiProvider.classifyTask).toHaveBeenCalledWith(text);
      expect(auditLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: mockWorkspaceId,
          action: 'AI_CLASSIFY',
          status: 'success',
        }),
      );
    });

    it('should classify with specific provider', async () => {
      const text = 'Schedule meeting with team';
      const mockClassification = {
        category: 'work',
        priority: 'medium' as const,
        tags: ['meeting', 'team'],
        confidence: 0.85,
        reasoning: 'Team coordination task',
      };

      jest.spyOn(anthropicProvider, 'classifyTask').mockResolvedValue(mockClassification);

      const result = await service.classifyTask(
        mockWorkspaceId,
        mockTaskId,
        text,
        'system',
        'anthropic',
      );

      expect(result).toEqual(mockClassification);
      expect(anthropicProvider.classifyTask).toHaveBeenCalledWith(text);
    });

    it('should log errors on classification failure', async () => {
      const text = 'Test task';
      const error = new Error('API error');

      jest.spyOn(openaiProvider, 'classifyTask').mockRejectedValue(error);

      await expect(service.classifyTask(mockWorkspaceId, mockTaskId, text)).rejects.toThrow();

      expect(auditLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          details: expect.objectContaining({
            error: 'API error',
          }),
        }),
      );
    });
  });

  describe('summarizeTask', () => {
    it('should summarize task text', async () => {
      const text = 'Write a comprehensive report on market analysis for the upcoming presentation';
      const summary = 'Write market analysis report';

      jest.spyOn(openaiProvider, 'summarizeText').mockResolvedValue(summary);

      const result = await service.summarizeTask(mockWorkspaceId, mockTaskId, text);

      expect(result).toEqual(summary);
      expect(openaiProvider.summarizeText).toHaveBeenCalledWith(text, undefined);
      expect(auditLogs.log).toHaveBeenCalled();
    });

    it('should respect max length parameter', async () => {
      const text = 'Long task description';
      const maxLength = 50;

      jest.spyOn(openaiProvider, 'summarizeText').mockResolvedValue('Shortened');

      await service.summarizeTask(mockWorkspaceId, mockTaskId, text, 'system', maxLength);

      expect(openaiProvider.summarizeText).toHaveBeenCalledWith(text, maxLength);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from task text', async () => {
      const text = 'Meet John Smith on 2026-11-15 at New York office';
      const mockEntities = [
        { type: 'person' as const, value: 'John Smith', confidence: 0.95 },
        { type: 'date' as const, value: '2026-11-15', confidence: 0.99 },
        { type: 'location' as const, value: 'New York', confidence: 0.92 },
      ];

      jest.spyOn(openaiProvider, 'extractEntities').mockResolvedValue(mockEntities);

      const result = await service.extractEntities(mockWorkspaceId, mockTaskId, text);

      expect(result).toEqual(mockEntities);
      expect(openaiProvider.extractEntities).toHaveBeenCalledWith(text);
      expect(auditLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            entityCount: 3,
          }),
        }),
      );
    });

    it('should handle empty entity list', async () => {
      const text = 'Simple task';

      jest.spyOn(openaiProvider, 'extractEntities').mockResolvedValue([]);

      const result = await service.extractEntities(mockWorkspaceId, mockTaskId, text);

      expect(result).toEqual([]);
    });
  });

  describe('suggestImprovements', () => {
    it('should generate task improvement suggestions', async () => {
      const task = {
        title: 'Project review',
        description: 'Review the project proposal',
      };

      const mockSuggestions = [
        {
          type: 'improve' as const,
          text: 'Add deadline to make it more actionable',
          reason: 'Tasks with deadlines have higher completion rates',
          actionable: true,
          difficulty: 'low' as const,
          impact: 'high' as const,
        },
      ];

      jest.spyOn(openaiProvider, 'generateSuggestions').mockResolvedValue(mockSuggestions);

      const result = await service.suggestImprovements(mockWorkspaceId, mockTaskId, task);

      expect(result).toEqual(mockSuggestions);
      expect(openaiProvider.generateSuggestions).toHaveBeenCalledWith(task);
    });

    it('should handle no suggestions case', async () => {
      const task = { title: 'Already optimal task' };

      jest.spyOn(openaiProvider, 'generateSuggestions').mockResolvedValue([]);

      const result = await service.suggestImprovements(mockWorkspaceId, mockTaskId, task);

      expect(result).toEqual([]);
    });
  });

  describe('checkProviderHealth', () => {
    it('should check OpenAI provider health', async () => {
      jest.spyOn(openaiProvider, 'validateConnection').mockResolvedValue(true);

      const result = await service.checkProviderHealth('openai');

      expect(result).toBe(true);
      expect(openaiProvider.validateConnection).toHaveBeenCalled();
    });

    it('should check Anthropic provider health', async () => {
      jest.spyOn(anthropicProvider, 'validateConnection').mockResolvedValue(true);

      const result = await service.checkProviderHealth('anthropic');

      expect(result).toBe(true);
      expect(anthropicProvider.validateConnection).toHaveBeenCalled();
    });

    it('should return false for unavailable provider', async () => {
      jest.spyOn(openaiProvider, 'validateConnection').mockResolvedValue(false);

      const result = await service.checkProviderHealth('openai');

      expect(result).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for AI operation', async () => {
      const prompt = 'Classify this task';
      const estimatedCost = 0.0015;

      jest.spyOn(openaiProvider, 'estimateCost').mockResolvedValue(estimatedCost);

      const result = await service.estimateCost(prompt);

      expect(result).toEqual({
        cost: estimatedCost,
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
      });
    });
  });

  describe('listAvailableProviders', () => {
    it('should list all available AI providers', async () => {
      jest.spyOn(openaiProvider, 'validateConnection').mockResolvedValue(true);
      jest.spyOn(anthropicProvider, 'validateConnection').mockResolvedValue(false);

      const result = await service.listAvailableProviders();

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'openai',
          available: true,
        }),
      );

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'anthropic',
          available: false,
        }),
      );
    });
  });

  describe('provider selection', () => {
    it('should throw error for unsupported provider', async () => {
      await expect(
        service.classifyTask(mockWorkspaceId, mockTaskId, 'test', 'system', 'unsupported'),
      ).rejects.toThrow('not supported');
    });

    it('should use default provider when not specified', async () => {
      const mockClassification = {
        category: 'personal',
        priority: 'low' as const,
        tags: ['personal'],
        confidence: 0.8,
      };

      jest.spyOn(openaiProvider, 'classifyTask').mockResolvedValue(mockClassification);

      await service.classifyTask(mockWorkspaceId, mockTaskId, 'test task');

      expect(openaiProvider.classifyTask).toHaveBeenCalled();
    });
  });

  describe('audit logging', () => {
    it('should log all successful AI operations', async () => {
      const mockClassification = {
        category: 'work',
        priority: 'high' as const,
        tags: ['work'],
        confidence: 0.9,
      };

      jest.spyOn(openaiProvider, 'classifyTask').mockResolvedValue(mockClassification);

      await service.classifyTask(mockWorkspaceId, mockTaskId, 'test');

      expect(auditLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: mockWorkspaceId,
          userId: 'system',
          action: 'AI_CLASSIFY',
          status: 'success',
        }),
      );
    });

    it('should include execution metrics in logs', async () => {
      const mockClassification = {
        category: 'work',
        priority: 'high' as const,
        tags: [],
        confidence: 0.9,
      };

      jest.spyOn(openaiProvider, 'classifyTask').mockResolvedValue(mockClassification);

      await service.classifyTask(mockWorkspaceId, mockTaskId, 'test');

      expect(auditLogs.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            executionTime: expect.any(Number),
            provider: 'openai',
          }),
        }),
      );
    });
  });
});
