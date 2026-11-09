import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateTaxonomyDto, UpdateTaxonomyDto, CreateCategoryDto, UpdateCategoryDto } from '../dto';

/**
 * Taxonomy Service
 * Manages custom taxonomies and their categories
 */
@Injectable()
export class TaxonomyService {
  private readonly logger = new Logger(TaxonomyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new taxonomy
   */
  async createTaxonomy(
    workspaceId: string,
    dto: CreateTaxonomyDto,
  ) {
    this.logger.log(`Creating taxonomy "${dto.name}" for workspace ${workspaceId}`);

    const existing = await this.prisma.classificationTaxonomy.findUnique({
      where: {
        workspaceId_name: { workspaceId, name: dto.name },
      },
    });

    if (existing) {
      throw new BadRequestException(`Taxonomy "${dto.name}" already exists`);
    }

    const taxonomy = await this.prisma.classificationTaxonomy.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
      },
      include: {
        categories: true,
      },
    });

    this.logger.log(`Taxonomy "${dto.name}" created with ID ${taxonomy.id}`);
    return taxonomy;
  }

  /**
   * Get taxonomy by ID
   */
  async getTaxonomy(taxonomyId: string, workspaceId: string) {
    const taxonomy = await this.prisma.classificationTaxonomy.findUnique({
      where: { id: taxonomyId },
      include: {
        categories: true,
        classifiers: { take: 1, orderBy: { version: 'desc' } },
        metrics: { take: 10, orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!taxonomy) {
      throw new NotFoundException(`Taxonomy ${taxonomyId} not found`);
    }

    if (taxonomy.workspaceId !== workspaceId) {
      throw new BadRequestException('Unauthorized');
    }

    return taxonomy;
  }

  /**
   * List all taxonomies for a workspace
   */
  async listTaxonomies(workspaceId: string) {
    const taxonomies = await this.prisma.classificationTaxonomy.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { categories: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return taxonomies.map((t) => ({
      id: t.id,
      workspaceId: t.workspaceId,
      name: t.name,
      description: t.description,
      isActive: t.isActive,
      categoryCount: t._count.categories,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * Update taxonomy
   */
  async updateTaxonomy(
    taxonomyId: string,
    workspaceId: string,
    dto: UpdateTaxonomyDto,
  ) {
    const taxonomy = await this.getTaxonomy(taxonomyId, workspaceId);

    const updated = await this.prisma.classificationTaxonomy.update({
      where: { id: taxonomyId },
      data: {
        name: dto.name ?? taxonomy.name,
        description: dto.description ?? taxonomy.description,
        isActive: dto.isActive ?? taxonomy.isActive,
      },
      include: { categories: true },
    });

    this.logger.log(`Taxonomy ${taxonomyId} updated`);
    return updated;
  }

  /**
   * Delete taxonomy
   */
  async deleteTaxonomy(taxonomyId: string, workspaceId: string) {
    await this.getTaxonomy(taxonomyId, workspaceId);

    await this.prisma.classificationTaxonomy.delete({
      where: { id: taxonomyId },
    });

    this.logger.log(`Taxonomy ${taxonomyId} deleted`);
  }

  /**
   * Create a category in taxonomy
   */
  async createCategory(
    taxonomyId: string,
    workspaceId: string,
    dto: CreateCategoryDto,
  ) {
    await this.getTaxonomy(taxonomyId, workspaceId);

    const category = await this.prisma.classificationCategory.create({
      data: {
        taxonomyId,
        name: dto.name,
        description: dto.description,
        rules: dto.rules || [],
        exampleKeywords: dto.exampleKeywords || [],
      },
    });

    this.logger.log(`Category "${dto.name}" created for taxonomy ${taxonomyId}`);
    return category;
  }

  /**
   * Get category
   */
  async getCategory(categoryId: string, taxonomyId: string, workspaceId: string) {
    await this.getTaxonomy(taxonomyId, workspaceId);

    const category = await this.prisma.classificationCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.taxonomyId !== taxonomyId) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    taxonomyId: string,
    workspaceId: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.getCategory(categoryId, taxonomyId, workspaceId);

    const updated = await this.prisma.classificationCategory.update({
      where: { id: categoryId },
      data: {
        name: dto.name ?? category.name,
        description: dto.description ?? category.description,
        rules: dto.rules ?? category.rules,
        exampleKeywords: dto.exampleKeywords ?? category.exampleKeywords,
      },
    });

    this.logger.log(`Category ${categoryId} updated`);
    return updated;
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string, taxonomyId: string, workspaceId: string) {
    await this.getCategory(categoryId, taxonomyId, workspaceId);

    await this.prisma.classificationCategory.delete({
      where: { id: categoryId },
    });

    this.logger.log(`Category ${categoryId} deleted`);
  }
}
