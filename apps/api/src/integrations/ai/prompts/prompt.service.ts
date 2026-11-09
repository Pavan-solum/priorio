import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  CreatePromptVersionDto,
  RecordPromptMetricDto,
  PromptTemplateResponseDto,
  PromptVersionResponseDto,
  PromptMetricResponseDto,
} from './dto/prompt.dto';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new prompt template
   */
  async createTemplate(
    workspaceId: string,
    dto: CreatePromptTemplateDto,
  ): Promise<PromptTemplateResponseDto> {
    // Check if template with same name exists in workspace
    const existing = await this.prisma.promptTemplate.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Prompt template "${dto.name}" already exists in this workspace`);
    }

    // Create template with first version
    const template = await this.prisma.promptTemplate.create({
      data: {
        workspaceId,
        name: dto.name,
        operation: dto.operation,
        description: dto.description,
        category: dto.category,
        tags: dto.tags || [],
        versions: {
          create: {
            version: 1,
            content: dto.content,
            variables: dto.variables || [],
            isActive: true,
            author: 'system',
            description: 'Initial version',
          },
        },
      },
      include: {
        versions: true,
      },
    });

    this.logger.log(`Created prompt template: ${template.id} (${template.name})`);
    return this.mapTemplateToResponse(template);
  }

  /**
   * Get prompt template by ID
   */
  async getTemplate(templateId: string, workspaceId: string): Promise<PromptTemplateResponseDto> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: {
        id: templateId,
        workspaceId,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    return this.mapTemplateToResponse(template);
  }

  /**
   * List all prompt templates for workspace
   */
  async listTemplates(
    workspaceId: string,
    operation?: string,
    isActive?: boolean,
  ): Promise<PromptTemplateResponseDto[]> {
    const templates = await this.prisma.promptTemplate.findMany({
      where: {
        workspaceId,
        ...(operation && { operation }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map(t => this.mapTemplateToResponse(t));
  }

  /**
   * Update prompt template metadata
   */
  async updateTemplate(
    templateId: string,
    workspaceId: string,
    dto: UpdatePromptTemplateDto,
  ): Promise<PromptTemplateResponseDto> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    const updated = await this.prisma.promptTemplate.update({
      where: { id: templateId },
      data: {
        description: dto.description ?? template.description,
        category: dto.category ?? template.category,
        tags: dto.tags ?? template.tags,
        isActive: dto.isActive ?? template.isActive,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    this.logger.log(`Updated prompt template: ${templateId}`);
    return this.mapTemplateToResponse(updated);
  }

  /**
   * Delete prompt template (soft delete by marking inactive)
   */
  async deleteTemplate(templateId: string, workspaceId: string): Promise<void> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    await this.prisma.promptTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    this.logger.log(`Deleted prompt template: ${templateId}`);
  }

  /**
   * Create new version of prompt template
   */
  async createVersion(
    templateId: string,
    workspaceId: string,
    dto: CreatePromptVersionDto,
  ): Promise<PromptVersionResponseDto> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
      include: { versions: true },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    // Get next version number
    const maxVersion = template.versions.reduce((max, v) => Math.max(max, v.version), 0);
    const nextVersion = maxVersion + 1;

    const version = await this.prisma.promptVersion.create({
      data: {
        templateId,
        version: nextVersion,
        content: dto.content,
        variables: dto.variables || [],
        description: dto.description,
        changelog: dto.changelog,
        author: dto.author || 'system',
        isActive: false, // Don't auto-activate
      },
    });

    this.logger.log(`Created prompt version ${nextVersion} for template ${templateId}`);
    return this.mapVersionToResponse(version);
  }

  /**
   * Get specific version
   */
  async getVersion(versionId: string, workspaceId: string): Promise<PromptVersionResponseDto> {
    const version = await this.prisma.promptVersion.findFirst({
      where: {
        id: versionId,
        template: { workspaceId },
      },
    });

    if (!version) {
      throw new NotFoundException(`Prompt version ${versionId} not found`);
    }

    return this.mapVersionToResponse(version);
  }

  /**
   * List versions for a template
   */
  async listVersions(templateId: string, workspaceId: string): Promise<PromptVersionResponseDto[]> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    const versions = await this.prisma.promptVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
    });

    return versions.map(v => this.mapVersionToResponse(v));
  }

  /**
   * Activate a specific version (deactivate others)
   */
  async activateVersion(versionId: string, workspaceId: string): Promise<PromptVersionResponseDto> {
    const version = await this.prisma.promptVersion.findFirst({
      where: {
        id: versionId,
        template: { workspaceId },
      },
      include: { template: true },
    });

    if (!version) {
      throw new NotFoundException(`Prompt version ${versionId} not found`);
    }

    // Deactivate all other versions for this template
    await this.prisma.promptVersion.updateMany({
      where: {
        templateId: version.templateId,
        id: { not: versionId },
      },
      data: { isActive: false },
    });

    // Activate this version
    const activated = await this.prisma.promptVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    });

    this.logger.log(`Activated prompt version ${versionId} for template ${version.templateId}`);
    return this.mapVersionToResponse(activated);
  }

  /**
   * Get active prompt for an operation
   */
  async getActivePrompt(
    operation: string,
    workspaceId: string,
    templateName?: string,
  ): Promise<{
    templateId: string;
    versionId: string;
    version: number;
    content: string;
    variables: string[];
  }> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: {
        workspaceId,
        operation,
        isActive: true,
        ...(templateName && { name: templateName }),
      },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!template || !template.versions.length) {
      throw new NotFoundException(
        `No active prompt template found for operation "${operation}" ${templateName ? `(${templateName})` : ''}`,
      );
    }

    const version = template.versions[0];
    return {
      templateId: template.id,
      versionId: version.id,
      version: version.version,
      content: version.content,
      variables: version.variables,
    };
  }

  /**
   * Resolve template by substituting variables
   */
  async resolveTemplate(
    templateName: string,
    workspaceId: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const prompt = await this.getActivePrompt('classify', workspaceId, templateName);

    let resolved = prompt.content;

    // Substitute all variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      resolved = resolved.replace(new RegExp(placeholder, 'g'), value || '');
    }

    return resolved;
  }

  /**
   * Record metric for prompt execution
   */
  async recordMetric(
    versionId: string,
    workspaceId: string,
    dto: RecordPromptMetricDto,
  ): Promise<PromptMetricResponseDto> {
    const version = await this.prisma.promptVersion.findFirst({
      where: {
        id: versionId,
        template: { workspaceId },
      },
      include: { template: true },
    });

    if (!version) {
      throw new NotFoundException(`Prompt version ${versionId} not found`);
    }

    const metric = await this.prisma.promptMetric.create({
      data: {
        templateId: version.templateId,
        versionId,
        operation: dto.operation,
        success: dto.success,
        accuracy: dto.accuracy,
        latencyMs: dto.latencyMs,
        tokenCount: dto.tokenCount,
        costUsd: dto.costUsd,
        userRating: dto.userRating,
        relevance: dto.relevance,
        taskId: dto.taskId,
        userId: dto.userId,
      },
    });

    this.logger.debug(`Recorded metric for version ${versionId}: success=${dto.success}`);
    return this.mapMetricToResponse(metric);
  }

  /**
   * Get metrics for a template
   */
  async getMetrics(
    templateId: string,
    workspaceId: string,
    operation?: string,
    limit: number = 100,
  ): Promise<PromptMetricResponseDto[]> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template ${templateId} not found`);
    }

    const metrics = await this.prisma.promptMetric.findMany({
      where: {
        templateId,
        ...(operation && { operation }),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return metrics.map(m => this.mapMetricToResponse(m));
  }

  /**
   * Rollback to previous version
   */
  async rollbackVersion(templateId: string, workspaceId: string): Promise<PromptVersionResponseDto> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { id: templateId, workspaceId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 2,
        },
      },
    });

    if (!template || template.versions.length < 2) {
      throw new BadRequestException('Cannot rollback: insufficient version history');
    }

    const previousVersion = template.versions[1];

    // Activate previous version
    await this.prisma.promptVersion.updateMany({
      where: { templateId },
      data: { isActive: false },
    });

    const activated = await this.prisma.promptVersion.update({
      where: { id: previousVersion.id },
      data: { isActive: true },
    });

    this.logger.log(`Rolled back prompt template ${templateId} to version ${previousVersion.version}`);
    return this.mapVersionToResponse(activated);
  }

  /**
   * Private helper methods
   */

  private mapTemplateToResponse(template: any): PromptTemplateResponseDto {
    return {
      id: template.id,
      workspaceId: template.workspaceId,
      name: template.name,
      operation: template.operation,
      description: template.description,
      category: template.category,
      tags: template.tags || [],
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private mapVersionToResponse(version: any): PromptVersionResponseDto {
    return {
      id: version.id,
      templateId: version.templateId,
      version: version.version,
      content: version.content,
      variables: version.variables || [],
      isActive: version.isActive,
      description: version.description,
      changelog: version.changelog,
      author: version.author,
      createdAt: version.createdAt,
    };
  }

  private mapMetricToResponse(metric: any): PromptMetricResponseDto {
    return {
      id: metric.id,
      templateId: metric.templateId,
      versionId: metric.versionId,
      operation: metric.operation,
      success: metric.success,
      accuracy: metric.accuracy,
      latencyMs: metric.latencyMs,
      tokenCount: metric.tokenCount,
      costUsd: metric.costUsd,
      userRating: metric.userRating,
      relevance: metric.relevance,
      taskId: metric.taskId,
      userId: metric.userId,
      recordedAt: metric.recordedAt,
    };
  }
}
