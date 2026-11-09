import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ABTestResultsDto,
  VersionComparisonDto,
  EffectivenessScoreDto,
  PromptOptimizationRecommendationsDto,
  RecommendationDto,
  ABTestWinner,
} from './dto/prompt.dto';

@Injectable()
export class PromptOptimizerService {
  private readonly logger = new Logger(PromptOptimizerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start an A/B test between two versions
   */
  async startABTest(
    templateId: string,
    workspaceId: string,
    controlVersionId: string,
    treatmentVersionId: string,
    sampleSize?: number,
  ): Promise<any> {
    // Verify template exists and belongs to workspace
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    // Verify both versions exist and belong to template
    const controlVersion = await this.prisma.promptVersion.findFirst({
      where: { id: controlVersionId, templateId },
    });

    const treatmentVersion = await this.prisma.promptVersion.findFirst({
      where: { id: treatmentVersionId, templateId },
    });

    if (!controlVersion || !treatmentVersion) {
      throw new NotFoundException('One or both versions not found in this template');
    }

    if (controlVersionId === treatmentVersionId) {
      throw new BadRequestException('Control and treatment versions must be different');
    }

    // Create A/B test
    const test = await this.prisma.aBTest.create({
      data: {
        templateId,
        controlVersionId,
        treatmentVersionId,
        sampleSize,
        status: 'running',
      },
    });

    this.logger.log(`Started A/B test ${test.id} for template ${templateId}`);
    return test;
  }

  /**
   * Get A/B test details
   */
  async getABTest(testId: string, workspaceId: string): Promise<any> {
    const test = await this.prisma.aBTest.findFirst({
      where: {
        id: testId,
        template: { workspaceId },
      },
      include: {
        controlVersion: true,
        treatmentVersion: true,
        metrics: true,
      },
    });

    if (!test) {
      throw new NotFoundException(`A/B test ${testId} not found`);
    }

    return test;
  }

  /**
   * Analyze A/B test results
   */
  async analyzeABTest(testId: string, workspaceId: string): Promise<ABTestResultsDto> {
    const test = await this.getABTest(testId, workspaceId);

    // Get metrics for control and treatment versions
    const controlMetrics = await this.prisma.promptMetric.findMany({
      where: {
        versionId: test.controlVersionId,
        abTestId: testId,
      },
    });

    const treatmentMetrics = await this.prisma.promptMetric.findMany({
      where: {
        versionId: test.treatmentVersionId,
        abTestId: testId,
      },
    });

    // Calculate statistics for control
    const controlStats = this.calculateStats(controlMetrics);
    // Calculate statistics for treatment
    const treatmentStats = this.calculateStats(treatmentMetrics);

    // Calculate statistical significance using chi-square test
    const significance = this.calculateSignificance(controlMetrics, treatmentMetrics);

    // Determine recommended winner
    const recommendedWinner = this.determineWinner(controlStats, treatmentStats, significance);

    return {
      testId,
      templateId: test.templateId,
      status: test.status,
      controlVersion: {
        versionId: test.controlVersionId,
        version: test.controlVersion.version,
        samples: controlMetrics.length,
        successRate: controlStats.successRate,
        averageLatencyMs: controlStats.averageLatency,
        averageCostUsd: controlStats.averageCost,
      },
      treatmentVersion: {
        versionId: test.treatmentVersionId,
        version: test.treatmentVersion.version,
        samples: treatmentMetrics.length,
        successRate: treatmentStats.successRate,
        averageLatencyMs: treatmentStats.averageLatency,
        averageCostUsd: treatmentStats.averageCost,
      },
      statisticalSignificance: significance,
      recommendedWinner,
      winner: test.winner,
      createdAt: test.startDate,
      updatedAt: test.endDate || new Date(),
    };
  }

  /**
   * Select winner and apply to template
   */
  async selectWinner(testId: string, workspaceId: string, winner: ABTestWinner): Promise<any> {
    const test = await this.getABTest(testId, workspaceId);

    if (!['control', 'treatment'].includes(winner)) {
      throw new BadRequestException('Winner must be "control" or "treatment"');
    }

    const winningVersionId = winner === 'control' ? test.controlVersionId : test.treatmentVersionId;

    // Update test status
    const updated = await this.prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: 'winner_selected',
        winner,
        endDate: new Date(),
      },
    });

    // Activate winning version
    await this.prisma.promptVersion.updateMany({
      where: { templateId: test.templateId },
      data: { isActive: false },
    });

    await this.prisma.promptVersion.update({
      where: { id: winningVersionId },
      data: { isActive: true },
    });

    this.logger.log(`Selected winner for A/B test ${testId}: ${winner}`);
    return updated;
  }

  /**
   * Get effectiveness score for template
   */
  async getEffectiveness(templateId: string, workspaceId: string): Promise<EffectivenessScoreDto> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    const metrics = await this.prisma.promptMetric.findMany({
      where: { templateId },
      orderBy: { recordedAt: 'asc' },
    });

    if (!metrics.length) {
      return {
        templateId,
        templateName: template.name,
        operation: template.operation,
        overallScore: 0,
        successRate: 0,
        averageLatencyMs: 0,
        averageCostUsd: 0,
        totalExecutions: 0,
        recentTrend: 'stable',
      };
    }

    const stats = this.calculateStats(metrics);

    // Determine trend by comparing recent vs older metrics
    const midpoint = Math.floor(metrics.length / 2);
    const recentMetrics = metrics.slice(midpoint);
    const olderMetrics = metrics.slice(0, midpoint);

    const recentStats = this.calculateStats(recentMetrics);
    const olderStats = this.calculateStats(olderMetrics);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentStats.successRate > olderStats.successRate + 0.05) {
      trend = 'improving';
    } else if (recentStats.successRate < olderStats.successRate - 0.05) {
      trend = 'declining';
    }

    // Calculate overall effectiveness score (0-100)
    const overallScore = this.calculateEffectivenessScore(stats);

    return {
      templateId,
      templateName: template.name,
      operation: template.operation,
      overallScore,
      successRate: stats.successRate,
      averageLatencyMs: stats.averageLatency,
      averageCostUsd: stats.averageCost,
      totalExecutions: metrics.length,
      recentTrend: trend,
    };
  }

  /**
   * Compare versions of a template
   */
  async compareVersions(templateId: string, workspaceId: string): Promise<VersionComparisonDto[]> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
      include: { versions: true },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    const comparisons: VersionComparisonDto[] = [];

    for (const version of template.versions) {
      const metrics = await this.prisma.promptMetric.findMany({
        where: { versionId: version.id },
      });

      if (metrics.length > 0) {
        const stats = this.calculateStats(metrics);
        comparisons.push({
          versionId: version.id,
          version: version.version,
          totalExecutions: metrics.length,
          successRate: stats.successRate,
          averageLatencyMs: stats.averageLatency,
          averageCostUsd: stats.averageCost,
          averageAccuracy: stats.averageAccuracy,
          averageRelevance: stats.averageRelevance,
        });
      }
    }

    return comparisons.sort((a, b) => b.version - a.version);
  }

  /**
   * Get optimization recommendations
   */
  async getRecommendations(templateId: string, workspaceId: string): Promise<PromptOptimizationRecommendationsDto> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    const metrics = await this.prisma.promptMetric.findMany({
      where: { templateId },
    });

    const stats = this.calculateStats(metrics);
    const recommendations: RecommendationDto[] = [];

    // Recommendation 1: Low success rate
    if (stats.successRate < 0.7) {
      recommendations.push({
        type: 'increase_specificity',
        description: 'Current prompt has low success rate. Adding more specific instructions may help.',
        potentialImpact: 'high',
        confidence: 0.8,
        actionableSteps: [
          'Add example inputs and expected outputs',
          'Clarify edge cases and constraints',
          'Specify output format more explicitly',
        ],
      });
    }

    // Recommendation 2: High latency
    if (stats.averageLatency > 1000) {
      recommendations.push({
        type: 'reduce_length',
        description: 'Prompts are verbose and causing slow responses. Reduce verbosity.',
        potentialImpact: 'medium',
        confidence: 0.7,
        actionableSteps: [
          'Remove redundant instructions',
          'Use concise language',
          'Consider breaking into sub-tasks',
        ],
      });
    }

    // Recommendation 3: Low accuracy/confidence
    if ((stats.averageAccuracy || 0) < 0.6) {
      recommendations.push({
        type: 'add_examples',
        description: 'Model accuracy is low. Adding examples can improve performance.',
        potentialImpact: 'high',
        confidence: 0.85,
        actionableSteps: [
          'Add 2-3 worked examples',
          'Show correct and incorrect outputs',
          'Provide reasoning behind examples',
        ],
      });
    }

    // Recommendation 4: High cost
    if (stats.averageCost > 0.01) {
      recommendations.push({
        type: 'optimize_for_cost',
        description: 'Operations are expensive. Consider using more efficient prompts.',
        potentialImpact: 'medium',
        confidence: 0.7,
        actionableSteps: [
          'Use simpler model if accuracy allows',
          'Reduce prompt length without losing quality',
          'Batch similar operations',
        ],
      });
    }

    // Recommendation 5: Improvement plateau
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'improve_clarity',
        description: 'Current prompt is performing well. Minor refinements may help further.',
        potentialImpact: 'low',
        confidence: 0.6,
        actionableSteps: [
          'Run A/B tests with slight variations',
          'Collect user feedback on outputs',
          'Monitor performance trends',
        ],
      });
    }

    const healthScore = this.calculateEffectivenessScore(stats);

    return {
      templateId,
      templateName: template.name,
      operation: template.operation,
      recommendations,
      overallHealthScore: healthScore,
    };
  }

  /**
   * Private helper methods
   */

  private calculateStats(metrics: any[]) {
    if (!metrics.length) {
      return {
        successRate: 0,
        averageLatency: 0,
        averageCost: 0,
        averageAccuracy: 0,
        averageRelevance: 0,
      };
    }

    const successCount = metrics.filter(m => m.success).length;
    const totalLatency = metrics.reduce((sum, m) => sum + (m.latencyMs || 0), 0);
    const totalCost = metrics.reduce((sum, m) => sum + (m.costUsd || 0), 0);
    const accuracies = metrics.filter(m => m.accuracy !== null).map(m => m.accuracy);
    const relevances = metrics.filter(m => m.relevance !== null).map(m => m.relevance);

    return {
      successRate: successCount / metrics.length,
      averageLatency: totalLatency / metrics.length,
      averageCost: totalCost / metrics.length,
      averageAccuracy: accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 0,
      averageRelevance: relevances.length > 0 ? relevances.reduce((a, b) => a + b, 0) / relevances.length : 0,
    };
  }

  private calculateSignificance(controlMetrics: any[], treatmentMetrics: any[]): number {
    if (!controlMetrics.length || !treatmentMetrics.length) {
      return 0;
    }

    // Simple chi-square test for success rates
    const controlSuccesses = controlMetrics.filter(m => m.success).length;
    const treatmentSuccesses = treatmentMetrics.filter(m => m.success).length;

    const controlFailures = controlMetrics.length - controlSuccesses;
    const treatmentFailures = treatmentMetrics.length - treatmentSuccesses;

    const total = controlMetrics.length + treatmentMetrics.length;

    const expectedControl = (controlMetrics.length / total) * (controlSuccesses + treatmentSuccesses);
    const expectedTreatment = (treatmentMetrics.length / total) * (controlSuccesses + treatmentSuccesses);

    const chiSquare =
      Math.pow(controlSuccesses - expectedControl, 2) / expectedControl +
      Math.pow(treatmentSuccesses - expectedTreatment, 2) / expectedTreatment;

    // Convert chi-square to p-value (simplified, assuming 1 degree of freedom)
    // P-value < 0.05 is typically considered significant
    const pValue = Math.exp(-chiSquare / 2);
    const significance = 1 - pValue; // Return as 0-1 confidence

    return Math.min(significance, 1);
  }

  private determineWinner(
    controlStats: any,
    treatmentStats: any,
    significance: number,
  ): 'control' | 'treatment' | 'inconclusive' {
    // If not statistically significant, inconclusive
    if (significance < 0.5) {
      return 'inconclusive';
    }

    // Compare by success rate first, then by cost (prefer lower cost for same success)
    if (Math.abs(controlStats.successRate - treatmentStats.successRate) > 0.05) {
      return controlStats.successRate > treatmentStats.successRate ? 'control' : 'treatment';
    }

    // If success rates similar, prefer lower cost
    return controlStats.averageCost < treatmentStats.averageCost ? 'control' : 'treatment';
  }

  private calculateEffectivenessScore(stats: any): number {
    // Score based on success rate (50%), latency (25%), cost (15%), accuracy (10%)
    const successScore = stats.successRate * 50;
    const latencyScore = Math.max(0, 25 - (stats.averageLatency / 100)); // Penalize high latency
    const costScore = Math.max(0, 15 - stats.averageCost * 1000); // Penalize high cost
    const accuracyScore = (stats.averageAccuracy || 0) * 10;

    return Math.min(100, Math.max(0, successScore + latencyScore + costScore + accuracyScore));
  }
}
