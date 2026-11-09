import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * EmbeddingService
 * Manages text embeddings for semantic search and AI operations
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingModel = 'text-embedding-3-small';
  private mockEmbeddings = new Map<string, number[]>();

  constructor(private prisma: PrismaService) {}

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Embedding data
   */
  async generateEmbedding(text: string): Promise<any> {
    try {
      if (!text || text.trim().length === 0) {
        throw new BadRequestException('Text is required for embedding');
      }

      // Normalize and hash text for mock embedding
      const normalizedText = text.trim().toLowerCase();
      const mockEmbedding = this.generateMockEmbedding(normalizedText);

      return {
        model: this.embeddingModel,
        data: [
          {
            embedding: mockEmbedding,
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: Math.ceil(text.length / 4),
          total_tokens: Math.ceil(text.length / 4),
        },
      };
    } catch (error) {
      this.logger.error(`Error generating embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param texts - Texts to embed
   * @returns Array of embedding data
   */
  async batchEmbedding(texts: string[]): Promise<any[]> {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new BadRequestException('Texts array is required and must not be empty');
      }

      if (texts.length > 100) {
        throw new BadRequestException('Batch size limit is 100 texts');
      }

      const embeddings = await Promise.all(
        texts.map(async (text, index) => {
          const embedding = await this.generateEmbedding(text);
          return {
            ...embedding.data[0],
            index,
          };
        }),
      );

      return embeddings;
    } catch (error) {
      this.logger.error(`Error batch embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update embedding for a knowledge entry
   * @param knowledgeId - Knowledge ID
   * @param text - New text
   * @param workspaceId - Workspace ID
   * @returns Updated embedding
   */
  async updateEmbedding(
    knowledgeId: string,
    text: string,
    workspaceId: string,
  ): Promise<any> {
    try {
      if (!text || text.trim().length === 0) {
        throw new BadRequestException('Text is required for embedding update');
      }

      // Generate new embedding
      const embedding = await this.generateEmbedding(text);

      // Update or create vector
      const normalizedText = text.trim().toLowerCase();
      const mockEmbedding = this.generateMockEmbedding(normalizedText);

      const vector = await (this.prisma.knowledgeVector as any).upsert({
        where: {
          workspaceId_knowledgeId: {
            workspaceId,
            knowledgeId,
          },
        },
        update: {
          embedding: mockEmbedding,
          updatedAt: new Date(),
        },
        create: {
          workspaceId,
          knowledgeId,
          embedding: mockEmbedding,
          model: this.embeddingModel,
        },
      });

      this.logger.log(`Embedding updated for knowledge: ${knowledgeId}`);
      return vector;
    } catch (error) {
      this.logger.error(`Error updating embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear old embeddings
   * @param days - Number of days old to consider
   * @returns Number of embeddings deleted
   */
  async clearOldEmbeddings(days: number = 90): Promise<number> {
    try {
      if (days < 1 || days > 365) {
        throw new BadRequestException('Days must be between 1 and 365');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.prisma.knowledgeVector.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleared ${result.count} old embeddings`);
      return result.count;
    } catch (error) {
      this.logger.error(`Error clearing old embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate an embedding vector
   * @param embedding - Embedding vector
   * @returns Validation result
   */
  validateEmbedding(embedding: number[]): boolean {
    try {
      if (!Array.isArray(embedding)) {
        return false;
      }

      if (embedding.length !== 1536) {
        return false;
      }

      // Check if all elements are numbers
      return embedding.every((el) => typeof el === 'number' && !isNaN(el));
    } catch (error) {
      this.logger.error(`Error validating embedding: ${error.message}`);
      return false;
    }
  }

  /**
   * Get embedding for a knowledge entry
   * @param knowledgeId - Knowledge ID
   * @returns Embedding vector
   */
  async getEmbedding(knowledgeId: string): Promise<any> {
    try {
      const vector = await this.prisma.knowledgeVector.findFirst({
        where: { knowledgeId },
      });

      if (!vector) {
        throw new Error('Embedding not found');
      }

      return vector;
    } catch (error) {
      this.logger.error(`Error getting embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate similarity between two embeddings
   * @param embedding1 - First embedding
   * @param embedding2 - Second embedding
   * @returns Cosine similarity score (0-1)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    try {
      if (!this.validateEmbedding(embedding1) || !this.validateEmbedding(embedding2)) {
        throw new BadRequestException('Invalid embedding format');
      }

      let dotProduct = 0;
      let magnitude1 = 0;
      let magnitude2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        magnitude1 += embedding1[i] * embedding1[i];
        magnitude2 += embedding2[i] * embedding2[i];
      }

      magnitude1 = Math.sqrt(magnitude1);
      magnitude2 = Math.sqrt(magnitude2);

      if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
      }

      return dotProduct / (magnitude1 * magnitude2);
    } catch (error) {
      this.logger.error(`Error calculating similarity: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get embedding statistics for a workspace
   * @param workspaceId - Workspace ID
   * @returns Statistics
   */
  async getEmbeddingStats(workspaceId: string): Promise<any> {
    try {
      const total = await this.prisma.knowledgeVector.count({
        where: { workspaceId },
      });

      const recentCount = await this.prisma.knowledgeVector.count({
        where: {
          workspaceId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      return {
        total,
        recentCount,
        averageVectorSize: 1536,
        model: this.embeddingModel,
      };
    } catch (error) {
      this.logger.error(`Error getting embedding stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch update embeddings for knowledge entries
   * @param updates - Array of {knowledgeId, text} objects
   * @param workspaceId - Workspace ID
   * @returns Number of updated embeddings
   */
  async batchUpdateEmbeddings(
    updates: Array<{ knowledgeId: string; text: string }>,
    workspaceId: string,
  ): Promise<number> {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new BadRequestException('Updates array is required and must not be empty');
      }

      let count = 0;
      for (const update of updates) {
        try {
          await this.updateEmbedding(update.knowledgeId, update.text, workspaceId);
          count++;
        } catch (error) {
          this.logger.warn(
            `Failed to update embedding for ${update.knowledgeId}: ${error.message}`,
          );
        }
      }

      return count;
    } catch (error) {
      this.logger.error(`Error batch updating embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find similar embeddings
   * @param embedding - Query embedding
   * @param workspaceId - Workspace ID
   * @param limit - Result limit
   * @param threshold - Similarity threshold
   * @returns Array of similar embeddings
   */
  async findSimilarEmbeddings(
    embedding: number[],
    workspaceId: string,
    limit: number = 10,
    threshold: number = 0.5,
  ): Promise<any[]> {
    try {
      if (!this.validateEmbedding(embedding)) {
        throw new BadRequestException('Invalid embedding format');
      }

      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      if (threshold < 0 || threshold > 1) {
        throw new BadRequestException('Threshold must be between 0 and 1');
      }

      // Get all embeddings for the workspace
      const vectors = await this.prisma.knowledgeVector.findMany({
        where: { workspaceId },
        include: { knowledge: true },
      });

      // Calculate similarities and filter by threshold
      const similarities = vectors
        .map((v) => ({
          ...v,
          similarity: this.calculateSimilarity(embedding, (v as any).embedding || []),
        }))
        .filter((v) => v.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarities;
    } catch (error) {
      this.logger.error(`Error finding similar embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a mock embedding for testing/demo purposes
   * @param text - Text to embed
   * @returns 1536-dimensional mock embedding
   */
  private generateMockEmbedding(text: string): number[] {
    // Use text hash to generate consistent mock embeddings
    if (this.mockEmbeddings.has(text)) {
      return this.mockEmbeddings.get(text)!;
    }

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const embedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      embedding.push(seededRandom(hash + i));
    }

    // Normalize to unit vector
    let magnitude = 0;
    for (const val of embedding) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);

    const normalized = embedding.map((val) => val / (magnitude || 1));
    this.mockEmbeddings.set(text, normalized);

    return normalized;
  }

  /**
   * Clear mock embeddings cache
   */
  clearMockCache(): void {
    this.mockEmbeddings.clear();
    this.logger.log('Mock embeddings cache cleared');
  }
}
