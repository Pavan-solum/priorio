import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

/**
 * KnowledgeService
 * Manages knowledge base entries with tagging and categorization
 */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Create a new knowledge entry
   * @param title - Entry title
   * @param content - Entry content
   * @param category - Entry category
   * @param workspaceId - Workspace ID
   * @param source - Source URL or reference
   * @returns Created knowledge entry
   */
  async createKnowledgeEntry(
    title: string,
    content: string,
    category: string,
    workspaceId: string,
    source?: string,
  ): Promise<any> {
    try {
      if (!title || !content) {
        throw new BadRequestException('Title and content are required');
      }

      if (!category) {
        throw new BadRequestException('Category is required');
      }

      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Create knowledge entry
      const knowledge = await this.prisma.knowledge.create({
        data: {
          workspaceId,
          title,
          content,
          category,
          source,
          tags: [],
        },
      });

      // Create vector embedding
      if (embedding) {
        await this.prisma.knowledgeVector.create({
          data: {
            workspaceId,
            knowledgeId: knowledge.id,
            embedding: embedding.data[0].embedding,
            model: embedding.model,
          },
        });

        // Link the vector to the knowledge entry
        await this.prisma.knowledge.update({
          where: { id: knowledge.id },
          data: {
            vectorEmbeddingId: knowledge.id, // Will be updated after vector creation
          },
        });
      }

      this.logger.log(`Knowledge entry created: ${knowledge.id}`);
      return knowledge;
    } catch (error) {
      this.logger.error(`Error creating knowledge entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a knowledge entry
   * @param id - Knowledge entry ID
   * @param content - New content
   * @param workspaceId - Workspace ID
   * @returns Updated knowledge entry
   */
  async updateEntry(
    id: string,
    content: string,
    workspaceId: string,
  ): Promise<any> {
    try {
      if (!content) {
        throw new BadRequestException('Content is required');
      }

      // Verify ownership
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id },
      });

      if (!knowledge || knowledge.workspaceId !== workspaceId) {
        throw new NotFoundException('Knowledge entry not found');
      }

      // Generate new embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Update content
      const updated = await this.prisma.knowledge.update({
        where: { id },
        data: {
          content,
          updatedAt: new Date(),
        },
      });

      // Update vector embedding if exists
      if (embedding && knowledge.vectorEmbeddingId) {
        await this.prisma.knowledgeVector.update({
          where: {
            workspaceId_knowledgeId: {
              workspaceId,
              knowledgeId: id,
            },
          },
          data: {
            embedding: embedding.data[0].embedding,
            updatedAt: new Date(),
          },
        });
      }

      this.logger.log(`Knowledge entry updated: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating knowledge entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a knowledge entry
   * @param id - Knowledge entry ID
   * @param workspaceId - Workspace ID
   * @returns Deleted knowledge entry
   */
  async deleteEntry(id: string, workspaceId: string): Promise<any> {
    try {
      // Verify ownership
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id },
      });

      if (!knowledge || knowledge.workspaceId !== workspaceId) {
        throw new NotFoundException('Knowledge entry not found');
      }

      // Delete vector embedding
      await this.prisma.knowledgeVector.deleteMany({
        where: {
          workspaceId,
          knowledgeId: id,
        },
      });

      // Delete knowledge entry
      const deleted = await this.prisma.knowledge.delete({
        where: { id },
      });

      this.logger.log(`Knowledge entry deleted: ${id}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting knowledge entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Categorize a knowledge entry based on content
   * @param content - Entry content
   * @returns Suggested category
   */
  async categorizeEntry(content: string): Promise<string> {
    try {
      if (!content) {
        return 'general';
      }

      // Simple categorization based on keywords
      const lowerContent = content.toLowerCase();

      const categoryKeywords: Record<string, string[]> = {
        technical: [
          'code',
          'api',
          'database',
          'server',
          'deployment',
          'bug',
          'error',
        ],
        project: [
          'project',
          'milestone',
          'deadline',
          'deliverable',
          'sprint',
          'release',
        ],
        process: [
          'workflow',
          'process',
          'procedure',
          'guideline',
          'standard',
          'policy',
        ],
        health: [
          'health',
          'fitness',
          'exercise',
          'nutrition',
          'wellness',
          'medical',
        ],
        work: [
          'meeting',
          'task',
          'assignment',
          'responsibility',
          'team',
          'collaboration',
        ],
      };

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some((keyword) => lowerContent.includes(keyword))) {
          return category;
        }
      }

      return 'general';
    } catch (error) {
      this.logger.error(`Error categorizing entry: ${error.message}`);
      return 'general';
    }
  }

  /**
   * Tag a knowledge entry
   * @param id - Knowledge entry ID
   * @param tags - Tags to add
   * @param workspaceId - Workspace ID
   * @returns Updated knowledge entry
   */
  async tagEntry(id: string, tags: string[], workspaceId: string): Promise<any> {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new BadRequestException('Tags must be a non-empty array');
      }

      // Verify ownership
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id },
      });

      if (!knowledge || knowledge.workspaceId !== workspaceId) {
        throw new NotFoundException('Knowledge entry not found');
      }

      // Normalize and deduplicate tags
      const normalizedTags = [...new Set(tags.map((t) => t.toLowerCase()))];

      const updated = await this.prisma.knowledge.update({
        where: { id },
        data: {
          tags: normalizedTags,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Tags added to knowledge entry: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error tagging entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search knowledge entries by query
   * @param query - Search query
   * @param workspaceId - Workspace ID
   * @param limit - Result limit
   * @returns Search results
   */
  async searchKnowledge(
    query: string,
    workspaceId: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Search query is required');
      }

      // Full-text search on title and content
      const results = await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { tags: { has: query.toLowerCase() } },
          ],
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });

      return results;
    } catch (error) {
      this.logger.error(`Error searching knowledge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all knowledge entries for a workspace
   * @param workspaceId - Workspace ID
   * @param category - Optional category filter
   * @param limit - Result limit
   * @param offset - Pagination offset
   * @returns Array of knowledge entries
   */
  async getAllKnowledge(
    workspaceId: string,
    category?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      const where: any = {
        workspaceId,
        isArchived: false,
      };

      if (category) {
        where.category = category;
      }

      return await this.prisma.knowledge.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error(`Error getting all knowledge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get knowledge by category
   * @param workspaceId - Workspace ID
   * @param category - Category
   * @returns Array of knowledge entries
   */
  async getByCategory(workspaceId: string, category: string): Promise<any[]> {
    try {
      return await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          category,
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error getting knowledge by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get knowledge by tag
   * @param workspaceId - Workspace ID
   * @param tag - Tag
   * @returns Array of knowledge entries
   */
  async getByTag(workspaceId: string, tag: string): Promise<any[]> {
    try {
      const normalizedTag = tag.toLowerCase();

      return await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          tags: { has: normalizedTag },
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error getting knowledge by tag: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get knowledge by ID
   * @param id - Knowledge ID
   * @param workspaceId - Workspace ID
   * @returns Knowledge entry
   */
  async getKnowledgeById(id: string, workspaceId: string): Promise<any> {
    try {
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id },
      });

      if (!knowledge || knowledge.workspaceId !== workspaceId) {
        throw new NotFoundException('Knowledge entry not found');
      }

      // Increment access count
      await this.prisma.knowledge.update({
        where: { id },
        data: {
          accessCount: { increment: 1 },
        },
      });

      return knowledge;
    } catch (error) {
      this.logger.error(`Error getting knowledge by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive a knowledge entry
   * @param id - Knowledge ID
   * @param workspaceId - Workspace ID
   * @returns Updated knowledge entry
   */
  async archiveKnowledge(id: string, workspaceId: string): Promise<any> {
    try {
      // Verify ownership
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id },
      });

      if (!knowledge || knowledge.workspaceId !== workspaceId) {
        throw new NotFoundException('Knowledge entry not found');
      }

      return await this.prisma.knowledge.update({
        where: { id },
        data: {
          isArchived: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error archiving knowledge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unarchive a knowledge entry
   * @param id - Knowledge ID
   * @param workspaceId - Workspace ID
   * @returns Updated knowledge entry
   */
  async unarchiveKnowledge(id: string, workspaceId: string): Promise<any> {
    try {
      // Verify ownership
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id },
      });

      if (!knowledge || knowledge.workspaceId !== workspaceId) {
        throw new NotFoundException('Knowledge entry not found');
      }

      return await this.prisma.knowledge.update({
        where: { id },
        data: {
          isArchived: false,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error unarchiving knowledge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all categories for a workspace
   * @param workspaceId - Workspace ID
   * @returns Array of categories
   */
  async getCategories(workspaceId: string): Promise<string[]> {
    try {
      const knowledge = await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          isArchived: false,
        },
        select: { category: true },
        distinct: ['category'],
      });

      return knowledge.map((k) => k.category);
    } catch (error) {
      this.logger.error(`Error getting categories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all tags for a workspace
   * @param workspaceId - Workspace ID
   * @returns Array of tags
   */
  async getTags(workspaceId: string): Promise<string[]> {
    try {
      const knowledge = await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          isArchived: false,
          tags: { not: { equals: [] } },
        },
        select: { tags: true },
      });

      const allTags = new Set<string>();
      for (const entry of knowledge) {
        entry.tags.forEach((tag) => allTags.add(tag));
      }

      return Array.from(allTags).sort();
    } catch (error) {
      this.logger.error(`Error getting tags: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count knowledge entries by category
   * @param workspaceId - Workspace ID
   * @returns Object with category counts
   */
  async countByCategory(workspaceId: string): Promise<Record<string, number>> {
    try {
      const knowledge = await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          isArchived: false,
        },
        select: { category: true },
      });

      const counts: Record<string, number> = {};
      for (const entry of knowledge) {
        counts[entry.category] = (counts[entry.category] || 0) + 1;
      }

      return counts;
    } catch (error) {
      this.logger.error(`Error counting by category: ${error.message}`);
      throw error;
    }
  }
}
