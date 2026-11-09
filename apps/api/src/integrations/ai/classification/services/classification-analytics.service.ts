import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AnalyticsQueryDto } from '../dto';

/**
 * Classification Analytics Service
 * Tracks and analyzes classification performance metrics
 */
@Injectable()
export class ClassificationAnalyticsService {
  private readonly logger = new Logger(ClassificationAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get metrics for taxonomy
   */
  async getMetrics(
    taxonomyId: string,
    workspaceId: string,
    query?: AnalyticsQueryDto,
  ) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const where: any = { taxonomyId };

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query?.classifierId) {
      where.classifierId = query.classifierId;
    }

    if (query?.startDate || query?.endDate) {
      where.recordedAt = {};
      if (query.startDate) {
        where.recordedAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.recordedAt.lte = query.endDate;
      }
    }

    const metrics = await this.prisma.classificationMetric.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    return metrics;
  }

  /**
   * Get analytics summary for taxonomy
   */
  async getAnalyticsSummary(taxonomyId: string, workspaceId: string) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const metrics = await this.prisma.classificationMetric.findMany({
      where: { taxonomyId },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });

    if (metrics.length === 0) {
      throw new NotFoundException('No metrics found for taxonomy');
    }

    // Calculate aggregate metrics
    const totalTP = metrics.reduce((sum, m) => sum + m.truePositives, 0);
    const totalFP = metrics.reduce((sum, m) => sum + m.falsePositives, 0);
    const totalFN = metrics.reduce((sum, m) => sum + m.falseNegatives, 0);
    const totalTN = metrics.reduce((sum, m) => sum + m.trueNegatives, 0);

    const totalSamples = totalTP + totalFP + totalFN + totalTN;
    const accuracy = totalSamples > 0
      ? (totalTP + totalTN) / totalSamples
      : 0;
    const precision = totalTP + totalFP > 0
      ? totalTP / (totalTP + totalFP)
      : 0;
    const recall = totalTP + totalFN > 0
      ? totalTP / (totalTP + totalFN)
      : 0;
    const f1Score = precision + recall > 0
      ? 2 * ((precision * recall) / (precision + recall))
      : 0;

    // Category-level metrics
    const categoryMetrics = await this.getCategoryMetrics(taxonomyId);

    // Confusion matrix
    const confusionMatrix = await this.buildConfusionMatrix(taxonomyId);

    return {
      totalSamples,
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
      categoryMetrics,
      confusionMatrix,
      recordedAt: new Date(),
    };
  }

  /**
   * Compare classifiers
   */
  async compareClassifiers(taxonomyId: string, workspaceId: string) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const classifiers = await this.prisma.classifier.findMany({
      where: { taxonomyId },
      orderBy: { version: 'desc' },
      take: 5,
    });

    if (classifiers.length === 0) {
      throw new NotFoundException('No classifiers found for taxonomy');
    }

    const comparisons = await Promise.all(
      classifiers.map(async (clf) => {
        const metrics = await this.prisma.classificationMetric.findMany({
          where: { classifierId: clf.id },
          take: 1000,
        });

        const totalTP = metrics.reduce((sum, m) => sum + m.truePositives, 0);
        const totalFP = metrics.reduce((sum, m) => sum + m.falsePositives, 0);
        const totalFN = metrics.reduce((sum, m) => sum + m.falseNegatives, 0);

        const precision = totalTP + totalFP > 0
          ? totalTP / (totalTP + totalFP)
          : 0;
        const recall = totalTP + totalFN > 0
          ? totalTP / (totalTP + totalFN)
          : 0;
        const f1Score = precision + recall > 0
          ? 2 * ((precision * recall) / (precision + recall))
          : 0;

        return {
          classifierId: clf.id,
          version: clf.version,
          accuracy: clf.accuracy || 0,
          precision: Math.round(precision * 10000) / 10000,
          recall: Math.round(recall * 10000) / 10000,
          f1Score: Math.round(f1Score * 10000) / 10000,
        };
      }),
    );

    const bestClassifier = comparisons.reduce((best, current) =>
      current.f1Score > best.f1Score ? current : best,
    );

    return {
      classifiers: comparisons,
      recommendation: `Classifier v${bestClassifier.version} is recommended with F1 score of ${bestClassifier.f1Score}`,
    };
  }

  /**
   * Get category-level metrics
   */
  private async getCategoryMetrics(taxonomyId: string) {
    const categories = await this.prisma.classificationCategory.findMany({
      where: { taxonomyId },
    });

    return Promise.all(
      categories.map(async (category) => {
        const metrics = await this.prisma.classificationMetric.findMany({
          where: { categoryId: category.id },
          take: 1000,
        });

        const totalTP = metrics.reduce((sum, m) => sum + m.truePositives, 0);
        const totalFP = metrics.reduce((sum, m) => sum + m.falsePositives, 0);
        const totalFN = metrics.reduce((sum, m) => sum + m.falseNegatives, 0);

        const precision = totalTP + totalFP > 0
          ? totalTP / (totalTP + totalFP)
          : 0;
        const recall = totalTP + totalFN > 0
          ? totalTP / (totalTP + totalFN)
          : 0;
        const f1Score = precision + recall > 0
          ? 2 * ((precision * recall) / (precision + recall))
          : 0;

        return {
          category: category.name,
          precision: Math.round(precision * 10000) / 10000,
          recall: Math.round(recall * 10000) / 10000,
          f1Score: Math.round(f1Score * 10000) / 10000,
          support: metrics.length,
        };
      }),
    );
  }

  /**
   * Build confusion matrix
   */
  private async buildConfusionMatrix(taxonomyId: string): Promise<Record<string, Record<string, number>>> {
    const categories = await this.prisma.classificationCategory.findMany({
      where: { taxonomyId },
    });

    const matrix: Record<string, Record<string, number>> = {};

    for (const cat of categories) {
      matrix[cat.name] = {};
      for (const cat2 of categories) {
        matrix[cat.name][cat2.name] = 0;
      }
    }

    return matrix;
  }

  /**
   * Validate taxonomy exists and belongs to workspace
   */
  private async validateTaxonomy(taxonomyId: string, workspaceId: string) {
    const taxonomy = await this.prisma.classificationTaxonomy.findUnique({
      where: { id: taxonomyId },
    });

    if (!taxonomy) {
      throw new NotFoundException(`Taxonomy ${taxonomyId} not found`);
    }

    if (taxonomy.workspaceId !== workspaceId) {
      throw new BadRequestException('Unauthorized');
    }

    return taxonomy;
  }
}
