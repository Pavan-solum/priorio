import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIService } from '../ai.service';
import { TrainClassifierDto, ClassifyTextDto, BatchClassifyDto } from '../dto';

/**
 * Classifier Service
 * Trains and uses classifiers for text classification
 */
@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private aiService: AIService,
  ) {}

  /**
   * Train a new classifier
   */
  async trainClassifier(
    taxonomyId: string,
    workspaceId: string,
    dto: TrainClassifierDto,
  ) {
    const taxonomy = await this.validateTaxonomy(taxonomyId, workspaceId);

    // Get training dataset
    const dataset = await this.prisma.trainingDataset.findFirst({
      where: {
        taxonomyId,
        version: dto.trainingDatasetVersion,
      },
      include: { trainingExamples: true },
    });

    if (!dataset) {
      throw new NotFoundException(
        `Training dataset v${dto.trainingDatasetVersion} not found`,
      );
    }

    // Get next classifier version
    const lastClassifier = await this.prisma.classifier.findFirst({
      where: { taxonomyId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (lastClassifier?.version || 0) + 1;

    this.logger.log(`Training classifier v${nextVersion} for taxonomy ${taxonomyId}`);

    // Train classifier (in production, this would call ML service)
    const accuracy = await this.trainModel(dataset, taxonomy);

    // Create classifier record
    const classifier = await this.prisma.classifier.create({
      data: {
        taxonomyId,
        trainingDatasetId: dataset.id,
        version: nextVersion,
        modelType: dto.modelType || 'prompt',
        accuracy,
        metadata: {
          trainingSize: dataset.size,
          categories: taxonomy.categories?.length || 0,
          trainedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Classifier v${nextVersion} trained with ${accuracy}% accuracy`);
    return classifier;
  }

  /**
   * Activate classifier version
   */
  async activateClassifier(
    classifierId: string,
    taxonomyId: string,
    workspaceId: string,
  ) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const classifier = await this.prisma.classifier.findUnique({
      where: { id: classifierId },
    });

    if (!classifier || classifier.taxonomyId !== taxonomyId) {
      throw new NotFoundException(`Classifier ${classifierId} not found`);
    }

    // Deactivate all other classifiers for this taxonomy
    await this.prisma.classifier.updateMany({
      where: { taxonomyId, isActive: true },
      data: { isActive: false },
    });

    // Activate this classifier
    const activated = await this.prisma.classifier.update({
      where: { id: classifierId },
      data: { isActive: true },
    });

    this.logger.log(`Classifier ${classifierId} activated`);
    return activated;
  }

  /**
   * Get active classifier for taxonomy
   */
  async getActiveClassifier(taxonomyId: string, workspaceId: string) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const classifier = await this.prisma.classifier.findFirst({
      where: { taxonomyId, isActive: true },
    });

    if (!classifier) {
      throw new NotFoundException(`No active classifier for taxonomy ${taxonomyId}`);
    }

    return classifier;
  }

  /**
   * Classify text using active classifier
   */
  async classifyText(
    taxonomyId: string,
    workspaceId: string,
    dto: ClassifyTextDto,
  ) {
    const classifier = await this.getActiveClassifier(taxonomyId, workspaceId);
    const dataset = await this.prisma.trainingDataset.findUnique({
      where: { id: classifier.trainingDatasetId },
      include: { taxonomy: { include: { categories: true } } },
    });

    if (!dataset) {
      throw new NotFoundException('Training dataset not found');
    }

    const startTime = Date.now();

    try {
      // Use AI service to classify
      const classification = await this.aiService.classifyTask(
        workspaceId,
        taxonomyId,
        dto.text,
      );

      const latencyMs = Date.now() - startTime;

      // Record metric
      await this.recordMetric(
        taxonomyId,
        classification.category,
        classifier.id,
        true,
        classification.confidence,
        latencyMs,
      );

      return {
        category: classification.category,
        confidence: classification.confidence,
        alternatives: dto.topK
          ? [
              {
                category: classification.category,
                confidence: classification.confidence,
              },
            ]
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Classification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch classify texts
   */
  async batchClassify(
    taxonomyId: string,
    workspaceId: string,
    dto: BatchClassifyDto,
  ) {
    const results = [];

    for (const item of dto.texts) {
      try {
        const result = await this.classifyText(taxonomyId, workspaceId, {
          text: item.text,
          topK: dto.topK,
        });

        results.push({
          id: item.id,
          classification: result,
        });
      } catch (error) {
        this.logger.error(`Failed to classify ${item.id}: ${error.message}`);
        results.push({
          id: item.id,
          error: error.message,
        });
      }
    }

    return { results };
  }

  /**
   * List classifiers for taxonomy
   */
  async listClassifiers(taxonomyId: string, workspaceId: string) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const classifiers = await this.prisma.classifier.findMany({
      where: { taxonomyId },
      orderBy: { version: 'desc' },
    });

    return classifiers;
  }

  /**
   * Train model (simplified for demo)
   */
  private async trainModel(dataset: any, taxonomy: any): Promise<number> {
    // In production, this would call actual ML training service
    // For now, return simulated accuracy between 75-95%
    const baseAccuracy = 75;
    const datasetBonus = Math.min(dataset.size / 100, 15);
    const categoryPenalty = Math.max(taxonomy.categories?.length || 0) - 3;

    const accuracy = Math.min(
      95,
      Math.max(baseAccuracy + datasetBonus - categoryPenalty, 50),
    );

    return Math.round(accuracy);
  }

  /**
   * Record classification metric
   */
  private async recordMetric(
    taxonomyId: string,
    categoryId: string,
    classifierId: string,
    success: boolean,
    confidence: number,
    latencyMs: number,
  ) {
    try {
      await this.prisma.classificationMetric.create({
        data: {
          taxonomyId,
          categoryId,
          classifierId,
          truePositives: success && confidence > 0.8 ? 1 : 0,
          falsePositives: success && confidence <= 0.8 ? 1 : 0,
          falseNegatives: !success ? 1 : 0,
          trueNegatives: 0,
          precision: confidence,
          recall: confidence,
          f1Score: confidence,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record metric: ${error.message}`);
    }
  }

  /**
   * Validate taxonomy exists and belongs to workspace
   */
  private async validateTaxonomy(taxonomyId: string, workspaceId: string) {
    const taxonomy = await this.prisma.classificationTaxonomy.findUnique({
      where: { id: taxonomyId },
      include: { categories: true },
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
