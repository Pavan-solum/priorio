import { Test, TestingModule } from '@nestjs/testing';
import { PromptService } from '../prompt.service';
import { PrismaService } from 'prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PromptOperation } from '../dto/prompt.dto';

describe('PromptService', () => {
  let service: PromptService;
  let prisma: PrismaService;

  const mockPrismaService = {
    promptTemplate: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    promptVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    promptMetric: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    describe('createTemplate', () => {
      it('should create a new prompt template', async () => {
        const workspaceId = 'workspace-1';
        const dto = {
          name: 'classify_task',
          operation: PromptOperation.CLASSIFY,
          content: 'Classify the following task: {taskTitle}',
          variables: ['taskTitle'],
          description: 'Task classifier',
          category: 'work',
          tags: ['ai', 'task'],
        };

        const mockTemplate = {
          id: 'template-1',
          workspaceId,
          name: dto.name,
          operation: dto.operation,
          description: dto.description,
          category: dto.category,
          tags: dto.tags,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: [
            {
              id: 'version-1',
              templateId: 'template-1',
              version: 1,
              content: dto.content,
              variables: dto.variables,
              isActive: true,
              description: 'Initial version',
              changelog: null,
              author: 'system',
              createdAt: new Date(),
            },
          ],
        };

        (prisma.promptTemplate.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.promptTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

        const result = await service.createTemplate(workspaceId, dto);

        expect(result).toEqual({
          id: 'template-1',
          workspaceId,
          name: dto.name,
          operation: dto.operation,
          description: dto.description,
          category: dto.category,
          tags: dto.tags,
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });

        expect(prisma.promptTemplate.findUnique).toHaveBeenCalledWith({
          where: {
            workspaceId_name: {
              workspaceId,
              name: dto.name,
            },
          },
        });
      });

      it('should throw ConflictException if template already exists', async () => {
        const workspaceId = 'workspace-1';
        const dto = {
          name: 'classify_task',
          operation: PromptOperation.CLASSIFY,
          content: 'Classify task',
          variables: [],
        };

        (prisma.promptTemplate.findUnique as jest.Mock).mockResolvedValue({
          id: 'existing-1',
        });

        await expect(service.createTemplate(workspaceId, dto)).rejects.toThrow(ConflictException);
      });
    });

    describe('getTemplate', () => {
      it('should return template by ID', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
          description: 'Task classifier',
          category: 'work',
          tags: ['ai'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: [],
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

        const result = await service.getTemplate(templateId, workspaceId);

        expect(result).toEqual({
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
          description: 'Task classifier',
          category: 'work',
          tags: ['ai'],
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        });
      });

      it('should throw NotFoundException if template not found', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(service.getTemplate(templateId, workspaceId)).rejects.toThrow(NotFoundException);
      });
    });

    describe('listTemplates', () => {
      it('should list all templates for workspace', async () => {
        const workspaceId = 'workspace-1';

        const mockTemplates = [
          {
            id: 'template-1',
            workspaceId,
            name: 'classify_task',
            operation: 'classify',
            isActive: true,
            versions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'template-2',
            workspaceId,
            name: 'summarize_task',
            operation: 'summarize',
            isActive: true,
            versions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        (prisma.promptTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

        const result = await service.listTemplates(workspaceId);

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('classify_task');
        expect(result[1].name).toBe('summarize_task');
      });

      it('should filter by operation', async () => {
        const workspaceId = 'workspace-1';
        const operation = 'classify';

        const mockTemplates = [
          {
            id: 'template-1',
            workspaceId,
            name: 'classify_task',
            operation,
            isActive: true,
            versions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        (prisma.promptTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

        const result = await service.listTemplates(workspaceId, operation);

        expect(result).toHaveLength(1);
        expect(result[0].operation).toBe('classify');
      });
    });

    describe('updateTemplate', () => {
      it('should update template metadata', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';
        const dto = {
          description: 'Updated description',
          tags: ['ai', 'new'],
        };

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
          description: 'Updated description',
          category: 'work',
          tags: ['ai', 'new'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: [],
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

        const result = await service.updateTemplate(templateId, workspaceId, dto);

        expect(result.description).toBe('Updated description');
        expect(result.tags).toEqual(['ai', 'new']);
      });
    });

    describe('deleteTemplate', () => {
      it('should soft delete template', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue({
          id: templateId,
          workspaceId,
        });
        (prisma.promptTemplate.update as jest.Mock).mockResolvedValue({});

        await service.deleteTemplate(templateId, workspaceId);

        expect(prisma.promptTemplate.update).toHaveBeenCalledWith({
          where: { id: templateId },
          data: { isActive: false },
        });
      });
    });
  });

  describe('Version Management', () => {
    describe('createVersion', () => {
      it('should create new version with incremented version number', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';
        const dto = {
          content: 'New prompt content',
          variables: ['var1'],
          description: 'Version 2',
          changelog: 'Improved clarity',
          author: 'user-1',
        };

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          versions: [
            { version: 1 },
            { version: 2 },
          ],
        };

        const mockVersion = {
          id: 'version-3',
          templateId,
          version: 3,
          content: dto.content,
          variables: dto.variables,
          isActive: false,
          description: dto.description,
          changelog: dto.changelog,
          author: dto.author,
          createdAt: new Date(),
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptVersion.create as jest.Mock).mockResolvedValue(mockVersion);

        const result = await service.createVersion(templateId, workspaceId, dto);

        expect(result.version).toBe(3);
        expect(result.content).toBe(dto.content);
        expect(result.isActive).toBe(false);
      });
    });

    describe('activateVersion', () => {
      it('should activate version and deactivate others', async () => {
        const versionId = 'version-2';
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockVersion = {
          id: versionId,
          templateId,
          template: { workspaceId },
          version: 2,
          isActive: false,
          content: 'Prompt content',
          variables: [],
          createdAt: new Date(),
        };

        (prisma.promptVersion.findFirst as jest.Mock).mockResolvedValue(mockVersion);
        (prisma.promptVersion.updateMany as jest.Mock).mockResolvedValue({});
        (prisma.promptVersion.update as jest.Mock).mockResolvedValue({
          ...mockVersion,
          isActive: true,
        });

        const result = await service.activateVersion(versionId, workspaceId);

        expect(result.isActive).toBe(true);
        expect(prisma.promptVersion.updateMany).toHaveBeenCalledWith({
          where: {
            templateId,
            id: { not: versionId },
          },
          data: { isActive: false },
        });
      });
    });

    describe('rollbackVersion', () => {
      it('should rollback to previous version', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          versions: [
            { id: 'version-3', version: 3, isActive: true },
            { id: 'version-2', version: 2, isActive: false },
          ],
        };

        const mockPreviousVersion = {
          id: 'version-2',
          templateId,
          version: 2,
          isActive: true,
          content: 'Previous content',
          variables: [],
          createdAt: new Date(),
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptVersion.updateMany as jest.Mock).mockResolvedValue({});
        (prisma.promptVersion.update as jest.Mock).mockResolvedValue(mockPreviousVersion);

        const result = await service.rollbackVersion(templateId, workspaceId);

        expect(result.version).toBe(2);
        expect(result.isActive).toBe(true);
      });

      it('should throw error if insufficient version history', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          versions: [{ id: 'version-1', version: 1 }],
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

        await expect(service.rollbackVersion(templateId, workspaceId)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('Metrics & Analytics', () => {
    describe('recordMetric', () => {
      it('should record execution metric', async () => {
        const versionId = 'version-1';
        const workspaceId = 'workspace-1';
        const dto = {
          operation: PromptOperation.CLASSIFY,
          success: true,
          accuracy: 0.95,
          latencyMs: 150,
          tokenCount: 45,
          costUsd: 0.002,
          userRating: 5,
          relevance: 0.98,
          taskId: 'task-1',
          userId: 'user-1',
        };

        const mockVersion = {
          id: versionId,
          templateId: 'template-1',
          template: { workspaceId },
        };

        const mockMetric = {
          id: 'metric-1',
          templateId: 'template-1',
          versionId,
          ...dto,
          recordedAt: new Date(),
        };

        (prisma.promptVersion.findFirst as jest.Mock).mockResolvedValue(mockVersion);
        (prisma.promptMetric.create as jest.Mock).mockResolvedValue(mockMetric);

        const result = await service.recordMetric(versionId, workspaceId, dto);

        expect(result.success).toBe(true);
        expect(result.accuracy).toBe(0.95);
        expect(result.latencyMs).toBe(150);
      });
    });

    describe('getMetrics', () => {
      it('should retrieve metrics for template', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
        };

        const mockMetrics = [
          {
            id: 'metric-1',
            templateId,
            versionId: 'version-1',
            operation: 'classify',
            success: true,
            accuracy: 0.95,
            latencyMs: 150,
            tokenCount: 45,
            costUsd: 0.002,
            recordedAt: new Date(),
          },
          {
            id: 'metric-2',
            templateId,
            versionId: 'version-1',
            operation: 'classify',
            success: true,
            accuracy: 0.92,
            latencyMs: 160,
            tokenCount: 48,
            costUsd: 0.002,
            recordedAt: new Date(),
          },
        ];

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock).mockResolvedValue(mockMetrics);

        const result = await service.getMetrics(templateId, workspaceId);

        expect(result).toHaveLength(2);
        expect(result[0].success).toBe(true);
        expect(result[0].accuracy).toBe(0.95);
      });
    });

    describe('getActivePrompt', () => {
      it('should return active prompt template', async () => {
        const operation = 'classify';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: 'template-1',
          workspaceId,
          operation,
          name: 'classify_task',
          isActive: true,
          versions: [
            {
              id: 'version-1',
              version: 1,
              content: 'Classify the task: {taskTitle}',
              variables: ['taskTitle'],
              isActive: true,
            },
          ],
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

        const result = await service.getActivePrompt(operation, workspaceId);

        expect(result.templateId).toBe('template-1');
        expect(result.versionId).toBe('version-1');
        expect(result.content).toBe('Classify the task: {taskTitle}');
      });
    });

    describe('resolveTemplate', () => {
      it('should substitute variables in template', async () => {
        const templateName = 'classify_task';
        const workspaceId = 'workspace-1';
        const variables = {
          taskTitle: 'Fix login bug',
          description: 'User cannot login with email',
        };

        const mockPrompt = {
          templateId: 'template-1',
          versionId: 'version-1',
          version: 1,
          content: 'Classify: {taskTitle} - {description}',
          variables: ['taskTitle', 'description'],
        };

        jest.spyOn(service, 'getActivePrompt').mockResolvedValue(mockPrompt);

        const result = await service.resolveTemplate(templateName, workspaceId, variables);

        expect(result).toBe('Classify: Fix login bug - User cannot login with email');
      });
    });
  });
});
