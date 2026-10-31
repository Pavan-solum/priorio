import { Test, TestingModule } from '@nestjs/testing';
import { PromptOptimizerService } from '../prompt-optimizer.service';
import { PrismaService } from 'prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PromptOptimizerService', () => {
  let service: PromptOptimizerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    promptTemplate: {
      findFirst: jest.fn(),
    },
    promptVersion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    aBTest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    promptMetric: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptOptimizerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PromptOptimizerService>(PromptOptimizerService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('A/B Testing', () => {
    describe('startABTest', () => {
      it('should start A/B test between two versions', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';
        const controlVersionId = 'version-1';
        const treatmentVersionId = 'version-2';
        const sampleSize = 100;

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
        };

        const mockControlVersion = {
          id: controlVersionId,
          templateId,
          version: 1,
        };

        const mockTreatmentVersion = {
          id: treatmentVersionId,
          templateId,
          version: 2,
        };

        const mockABTest = {
          id: 'test-1',
          templateId,
          controlVersionId,
          treatmentVersionId,
          sampleSize,
          status: 'running',
          winner: null,
          startDate: new Date(),
          endDate: null,
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptVersion.findFirst as jest.Mock)
          .mockResolvedValueOnce(mockControlVersion)
          .mockResolvedValueOnce(mockTreatmentVersion);
        (prisma.aBTest.create as jest.Mock).mockResolvedValue(mockABTest);

        const result = await service.startABTest(
          templateId,
          workspaceId,
          controlVersionId,
          treatmentVersionId,
          sampleSize,
        );

        expect(result.id).toBe('test-1');
        expect(result.status).toBe('running');
        expect(result.controlVersionId).toBe(controlVersionId);
        expect(result.treatmentVersionId).toBe(treatmentVersionId);
      });

      it('should throw error if template not found', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(
          service.startABTest(templateId, workspaceId, 'version-1', 'version-2'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw error if versions are the same', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';
        const versionId = 'version-1';

        const mockTemplate = { id: templateId, workspaceId };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptVersion.findFirst as jest.Mock).mockResolvedValue({
          id: versionId,
          templateId,
        });

        await expect(
          service.startABTest(templateId, workspaceId, versionId, versionId),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('selectWinner', () => {
      it('should select winner and activate winning version', async () => {
        const testId = 'test-1';
        const workspaceId = 'workspace-1';
        const winner = 'control';

        const mockTest = {
          id: testId,
          templateId: 'template-1',
          controlVersionId: 'version-1',
          treatmentVersionId: 'version-2',
          status: 'running',
          winner: null,
          startDate: new Date(),
          endDate: null,
        };

        const mockUpdatedTest = {
          ...mockTest,
          status: 'winner_selected',
          winner,
          endDate: new Date(),
        };

        jest.spyOn(service, 'getABTest').mockResolvedValue(mockTest);
        (prisma.aBTest.update as jest.Mock).mockResolvedValue(mockUpdatedTest);
        (prisma.promptVersion.updateMany as jest.Mock).mockResolvedValue({});
        (prisma.promptVersion.update as jest.Mock).mockResolvedValue({});

        const result = await service.selectWinner(testId, workspaceId, winner);

        expect(result.winner).toBe('control');
        expect(result.status).toBe('winner_selected');
      });
    });
  });

  describe('Analytics', () => {
    describe('getEffectiveness', () => {
      it('should calculate effectiveness score', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
        };

        const mockMetrics = [
          {
            id: 'metric-1',
            success: true,
            accuracy: 0.95,
            latencyMs: 150,
            costUsd: 0.002,
            recordedAt: new Date(Date.now() - 1000 * 60 * 60),
          },
          {
            id: 'metric-2',
            success: true,
            accuracy: 0.92,
            latencyMs: 160,
            costUsd: 0.002,
            recordedAt: new Date(),
          },
        ];

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock).mockResolvedValue(mockMetrics);

        const result = await service.getEffectiveness(templateId, workspaceId);

        expect(result.templateId).toBe(templateId);
        expect(result.templateName).toBe('classify_task');
        expect(result.operation).toBe('classify');
        expect(result.successRate).toBe(1.0);
        expect(result.overallScore).toBeGreaterThan(0);
        expect(result.totalExecutions).toBe(2);
      });

      it('should return zero metrics for template with no metrics', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
        };

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.getEffectiveness(templateId, workspaceId);

        expect(result.totalExecutions).toBe(0);
        expect(result.overallScore).toBe(0);
        expect(result.successRate).toBe(0);
      });
    });

    describe('compareVersions', () => {
      it('should compare performance of all versions', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          versions: [
            { id: 'version-1', version: 1 },
            { id: 'version-2', version: 2 },
          ],
        };

        const mockMetricsV1 = [
          {
            success: true,
            accuracy: 0.90,
            latencyMs: 150,
            costUsd: 0.002,
          },
          {
            success: true,
            accuracy: 0.92,
            latencyMs: 160,
            costUsd: 0.002,
          },
        ];

        const mockMetricsV2 = [
          {
            success: true,
            accuracy: 0.95,
            latencyMs: 140,
            costUsd: 0.003,
          },
        ];

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock)
          .mockResolvedValueOnce(mockMetricsV1)
          .mockResolvedValueOnce(mockMetricsV2);

        const result = await service.compareVersions(templateId, workspaceId);

        expect(result).toHaveLength(2);
        expect(result[0].version).toBe(2); // Sorted descending
        expect(result[1].version).toBe(1);
        expect(result[0].successRate).toBe(1.0);
        expect(result[1].successRate).toBe(1.0);
      });
    });

    describe('getRecommendations', () => {
      it('should provide recommendations for low success rate', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
        };

        const mockMetrics = [
          { success: false, latencyMs: 100, costUsd: 0.001 },
          { success: false, latencyMs: 110, costUsd: 0.001 },
          { success: true, latencyMs: 100, costUsd: 0.001 },
        ];

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock).mockResolvedValue(mockMetrics);

        const result = await service.getRecommendations(templateId, workspaceId);

        expect(result.templateId).toBe(templateId);
        expect(result.templateName).toBe('classify_task');
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations[0].type).toBe('increase_specificity');
        expect(result.recommendations[0].potentialImpact).toBe('high');
      });

      it('should provide recommendations for high latency', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
        };

        const mockMetrics = [
          { success: true, latencyMs: 1500, costUsd: 0.001 },
          { success: true, latencyMs: 1600, costUsd: 0.001 },
        ];

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock).mockResolvedValue(mockMetrics);

        const result = await service.getRecommendations(templateId, workspaceId);

        const latencyRec = result.recommendations.find(r => r.type === 'reduce_length');
        expect(latencyRec).toBeDefined();
        expect(latencyRec?.potentialImpact).toBe('medium');
      });

      it('should provide recommendations for high cost', async () => {
        const templateId = 'template-1';
        const workspaceId = 'workspace-1';

        const mockTemplate = {
          id: templateId,
          workspaceId,
          name: 'classify_task',
          operation: 'classify',
        };

        const mockMetrics = [
          { success: true, latencyMs: 100, costUsd: 0.02 },
          { success: true, latencyMs: 100, costUsd: 0.025 },
        ];

        (prisma.promptTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
        (prisma.promptMetric.findMany as jest.Mock).mockResolvedValue(mockMetrics);

        const result = await service.getRecommendations(templateId, workspaceId);

        const costRec = result.recommendations.find(r => r.type === 'optimize_for_cost');
        expect(costRec).toBeDefined();
        expect(costRec?.potentialImpact).toBe('medium');
      });
    });

    describe('analyzeABTest', () => {
      it('should analyze A/B test results', async () => {
        const testId = 'test-1';
        const workspaceId = 'workspace-1';

        const mockTest = {
          id: testId,
          templateId: 'template-1',
          controlVersionId: 'version-1',
          treatmentVersionId: 'version-2',
          controlVersion: { version: 1 },
          treatmentVersion: { version: 2 },
          status: 'running',
          winner: null,
          startDate: new Date(),
          endDate: null,
        };

        const controlMetrics = [
          { success: true, latencyMs: 150, costUsd: 0.002 },
          { success: true, latencyMs: 160, costUsd: 0.002 },
        ];

        const treatmentMetrics = [
          { success: true, latencyMs: 140, costUsd: 0.003 },
          { success: true, latencyMs: 145, costUsd: 0.003 },
        ];

        jest.spyOn(service, 'getABTest').mockResolvedValue(mockTest);
        (prisma.promptMetric.findMany as jest.Mock)
          .mockResolvedValueOnce(controlMetrics)
          .mockResolvedValueOnce(treatmentMetrics);

        const result = await service.analyzeABTest(testId, workspaceId);

        expect(result.testId).toBe(testId);
        expect(result.controlVersion.samples).toBe(2);
        expect(result.treatmentVersion.samples).toBe(2);
        expect(result.controlVersion.successRate).toBe(1.0);
        expect(result.treatmentVersion.successRate).toBe(1.0);
      });
    });
  });

  describe('Helper Methods', () => {
    describe('calculateStats', () => {
      it('should calculate statistics from metrics', () => {
        const metrics = [
          { success: true, latencyMs: 100, costUsd: 0.001, accuracy: 0.9 },
          { success: true, latencyMs: 110, costUsd: 0.001, accuracy: 0.95 },
          { success: false, latencyMs: 120, costUsd: 0.001, accuracy: null },
        ];

        // Access private method through any type casting
        const stats = (service as any).calculateStats(metrics);

        expect(stats.successRate).toBeCloseTo(0.667, 2);
        expect(stats.averageLatency).toBeCloseTo(110, 1);
        expect(stats.averageCost).toBeCloseTo(0.001, 3);
        expect(stats.averageAccuracy).toBeCloseTo(0.925, 2);
      });
    });

    describe('calculateEffectivenessScore', () => {
      it('should calculate effectiveness score (0-100)', () => {
        const stats = {
          successRate: 0.9,
          averageLatency: 150,
          averageCost: 0.002,
          averageAccuracy: 0.85,
        };

        const score = (service as any).calculateEffectivenessScore(stats);

        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should give lower score for low success rate', () => {
        const poorStats = {
          successRate: 0.5,
          averageLatency: 100,
          averageCost: 0.001,
          averageAccuracy: 0.5,
        };

        const goodStats = {
          successRate: 0.95,
          averageLatency: 100,
          averageCost: 0.001,
          averageAccuracy: 0.95,
        };

        const poorScore = (service as any).calculateEffectivenessScore(poorStats);
        const goodScore = (service as any).calculateEffectivenessScore(goodStats);

        expect(goodScore).toBeGreaterThan(poorScore);
      });
    });

    describe('determineWinner', () => {
      it('should select control if higher success rate', () => {
        const controlStats = { successRate: 0.95, averageCost: 0.002 };
        const treatmentStats = { successRate: 0.85, averageCost: 0.001 };

        const winner = (service as any).determineWinner(controlStats, treatmentStats, 0.8);

        expect(winner).toBe('control');
      });

      it('should select treatment if higher success rate', () => {
        const controlStats = { successRate: 0.85, averageCost: 0.002 };
        const treatmentStats = { successRate: 0.95, averageCost: 0.003 };

        const winner = (service as any).determineWinner(controlStats, treatmentStats, 0.8);

        expect(winner).toBe('treatment');
      });

      it('should select lower cost if success rates similar', () => {
        const controlStats = { successRate: 0.9, averageCost: 0.001 };
        const treatmentStats = { successRate: 0.91, averageCost: 0.003 };

        const winner = (service as any).determineWinner(controlStats, treatmentStats, 0.8);

        expect(winner).toBe('control');
      });

      it('should return inconclusive if low significance', () => {
        const controlStats = { successRate: 0.9, averageCost: 0.001 };
        const treatmentStats = { successRate: 0.91, averageCost: 0.003 };

        const winner = (service as any).determineWinner(controlStats, treatmentStats, 0.2);

        expect(winner).toBe('inconclusive');
      });
    });
  });
});
