import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateTrainingDatasetDto, CreateTrainingExampleDto, BulkAddExamplesDto } from '../dto';

/**
 * Training Data Service
 * Manages training datasets and examples for classifiers
 */
@Injectable()
export class TrainingDataService {
  private readonly logger = new Logger(TrainingDataService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new training dataset
   */
  async createTrainingDataset(
    taxonomyId: string,
    workspaceId: string,
    dto: CreateTrainingDatasetDto,
  ) {
    const taxonomy = await this.validateTaxonomy(taxonomyId, workspaceId);

    // Get next version number
    const lastVersion = await this.prisma.trainingDataset.findFirst({
      where: { taxonomyId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    this.logger.log(`Creating training dataset v${nextVersion} for taxonomy ${taxonomyId}`);

    const dataset = await this.prisma.trainingDataset.create({
      data: {
        taxonomyId,
        version: nextVersion,
        description: dto.description,
        size: dto.examples.length,
        trainingExamples: {
          createMany: {
            data: dto.examples,
          },
        },
      },
      include: {
        trainingExamples: true,
      },
    });

    this.logger.log(`Training dataset v${nextVersion} created with ${dataset.size} examples`);
    return dataset;
  }

  /**
   * Get training dataset
   */
  async getTrainingDataset(datasetId: string, taxonomyId: string, workspaceId: string) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const dataset = await this.prisma.trainingDataset.findUnique({
      where: { id: datasetId },
      include: {
        trainingExamples: true,
      },
    });

    if (!dataset || dataset.taxonomyId !== taxonomyId) {
      throw new NotFoundException(`Training dataset ${datasetId} not found`);
    }

    return dataset;
  }

  /**
   * List training datasets for taxonomy
   */
  async listTrainingDatasets(taxonomyId: string, workspaceId: string) {
    await this.validateTaxonomy(taxonomyId, workspaceId);

    const datasets = await this.prisma.trainingDataset.findMany({
      where: { taxonomyId },
      include: {
        trainingExamples: { take: 3 },
      },
      orderBy: { version: 'desc' },
    });

    return datasets;
  }

  /**
   * Add examples to training dataset
   */
  async addExamples(
    datasetId: string,
    taxonomyId: string,
    workspaceId: string,
    dto: BulkAddExamplesDto,
  ) {
    const dataset = await this.getTrainingDataset(datasetId, taxonomyId, workspaceId);

    const examples = await this.prisma.trainingExample.createMany({
      data: dto.examples.map((ex) => ({
        datasetId,
        text: ex.text,
        category: ex.category,
        confidence: ex.confidence || 1.0,
      })),
    });

    // Update dataset size
    await this.prisma.trainingDataset.update({
      where: { id: datasetId },
      data: {
        size: dataset.size + dto.examples.length,
      },
    });

    this.logger.log(`Added ${dto.examples.length} examples to dataset ${datasetId}`);

    return {
      datasetId,
      examplesAdded: examples.count,
      totalSize: dataset.size + dto.examples.length,
    };
  }

  /**
   * Get training examples for dataset
   */
  async getExamples(
    datasetId: string,
    taxonomyId: string,
    workspaceId: string,
    skip = 0,
    take = 100,
  ) {
    const dataset = await this.getTrainingDataset(datasetId, taxonomyId, workspaceId);

    const examples = await this.prisma.trainingExample.findMany({
      where: { datasetId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.trainingExample.count({
      where: { datasetId },
    });

    return {
      datasetId,
      examples,
      pagination: {
        skip,
        take,
        total,
        pages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Delete training dataset
   */
  async deleteTrainingDataset(
    datasetId: string,
    taxonomyId: string,
    workspaceId: string,
  ) {
    const dataset = await this.getTrainingDataset(datasetId, taxonomyId, workspaceId);

    // Check if dataset is used by active classifier
    const activeClassifier = await this.prisma.classifier.findUnique({
      where: {
        taxonomyId_version: { taxonomyId, version: dataset.version },
      },
    });

    if (activeClassifier?.isActive) {
      throw new BadRequestException(
        'Cannot delete dataset used by active classifier',
      );
    }

    await this.prisma.trainingDataset.delete({
      where: { id: datasetId },
    });

    this.logger.log(`Training dataset ${datasetId} deleted`);
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
