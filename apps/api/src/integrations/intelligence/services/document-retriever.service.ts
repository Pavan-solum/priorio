import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

interface SearchResult {
  knowledgeId: string;
  title: string;
  content: string;
  category: string;
  source?: string;
  relevanceScore: number;
}

/**
 * DocumentRetrieverService
 * Retrieves relevant documents using semantic search and ranking
 */
@Injectable()
export class DocumentRetrieverService {
  private readonly logger = new Logger(DocumentRetrieverService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Semantic search for knowledge entries
   * @param query - Search query
   * @param limit - Result limit
   * @param workspaceId - Workspace ID
   * @returns Array of search results
   */
  async semanticSearch(
    query: string,
    limit: number,
    workspaceId: string,
  ): Promise<SearchResult[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Search query is required');
      }

      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const queryVector = queryEmbedding.data[0].embedding;

      // Get all knowledge vectors for the workspace
      const vectors = await this.prisma.knowledgeVector.findMany({
        where: { workspaceId },
        include: { knowledge: true },
      });

      // Calculate similarities
      const results = vectors
        .map((v) => ({
          knowledgeId: v.knowledgeId,
          title: v.knowledge.title,
          content: v.knowledge.content,
          category: v.knowledge.category,
          source: v.knowledge.source,
          relevanceScore: this.embeddingService.calculateSimilarity(
            queryVector,
            v.embedding as any,
          ),
        }))
        .filter((r) => r.relevanceScore > 0) // Only results with some similarity
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return results;
    } catch (error) {
      this.logger.error(`Error performing semantic search: ${error.message}`);
      throw error;
    }
  }

  /**
   * Semantic search with score threshold
   * @param query - Search query
   * @param threshold - Minimum relevance score
   * @param workspaceId - Workspace ID
   * @returns Array of search results above threshold
   */
  async semanticSearchWithScore(
    query: string,
    threshold: number,
    workspaceId: string,
  ): Promise<SearchResult[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Search query is required');
      }

      if (threshold < 0 || threshold > 1) {
        throw new BadRequestException('Threshold must be between 0 and 1');
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const queryVector = queryEmbedding.data[0].embedding;

      // Get all knowledge vectors
      const vectors = await this.prisma.knowledgeVector.findMany({
        where: { workspaceId },
        include: { knowledge: true },
      });

      // Filter by threshold and sort
      const results = vectors
        .map((v) => ({
          knowledgeId: v.knowledgeId,
          title: v.knowledge.title,
          content: v.knowledge.content,
          category: v.knowledge.category,
          source: v.knowledge.source,
          relevanceScore: this.embeddingService.calculateSimilarity(
            queryVector,
            v.embedding as any,
          ),
        }))
        .filter((r) => r.relevanceScore >= threshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      return results;
    } catch (error) {
      this.logger.error(`Error performing semantic search with score: ${error.message}`);
      throw error;
    }
  }

  /**
   * Multi-vector search with multiple queries
   * @param queries - Array of search queries
   * @param workspaceId - Workspace ID
   * @returns Combined and deduplicated search results
   */
  async multiVectorSearch(queries: string[], workspaceId: string): Promise<SearchResult[]> {
    try {
      if (!Array.isArray(queries) || queries.length === 0) {
        throw new BadRequestException('Queries array is required and must not be empty');
      }

      if (queries.length > 10) {
        throw new BadRequestException('Maximum 10 queries allowed');
      }

      // Perform semantic search for each query
      const allResults: Map<string, SearchResult> = new Map();

      for (const query of queries) {
        try {
          const results = await this.semanticSearch(query, 5, workspaceId);

          for (const result of results) {
            if (allResults.has(result.knowledgeId)) {
              // Average the relevance scores
              const existing = allResults.get(result.knowledgeId)!;
              existing.relevanceScore = (existing.relevanceScore + result.relevanceScore) / 2;
            } else {
              allResults.set(result.knowledgeId, result);
            }
          }
        } catch (error) {
          this.logger.warn(`Error searching for query "${query}": ${error.message}`);
        }
      }

      // Sort by relevance score and return
      return Array.from(allResults.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10);
    } catch (error) {
      this.logger.error(`Error performing multi-vector search: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rank documents by relevance
   * @param documents - Documents to rank
   * @param query - Query for ranking
   * @returns Ranked documents
   */
  async rankDocuments(documents: any[], query?: string): Promise<any[]> {
    try {
      if (!Array.isArray(documents) || documents.length === 0) {
        throw new BadRequestException('Documents array is required and must not be empty');
      }

      if (!query) {
        // Return documents sorted by access count if no query
        return documents.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
      }

      // Rank based on query match
      return documents.sort((a, b) => {
        const aScore = this.calculateDocumentScore(a, query);
        const bScore = this.calculateDocumentScore(b, query);
        return bScore - aScore;
      });
    } catch (error) {
      this.logger.error(`Error ranking documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate a score for a document based on query
   * @param document - Document to score
   * @param query - Query for scoring
   * @returns Score value
   */
  private calculateDocumentScore(document: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Title match (higher weight)
    if (document.title?.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Content match
    if (document.content?.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Tag match
    if (Array.isArray(document.tags)) {
      if (document.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        score += 3;
      }
    }

    // Boost by access count
    score += (document.accessCount || 0) * 0.1;

    return score;
  }

  /**
   * Format documents as citations
   * @param documents - Documents to format
   * @returns Formatted citations
   */
  formatCitations(documents: any[]): any[] {
    try {
      if (!Array.isArray(documents)) {
        throw new BadRequestException('Documents must be an array');
      }

      return documents.map((doc, index) => ({
        id: doc.knowledgeId || doc.id,
        title: doc.title,
        url: doc.source || null,
        content: doc.content ? doc.content.substring(0, 200) : '',
        position: index + 1,
        relevanceScore: doc.relevanceScore || 0,
      }));
    } catch (error) {
      this.logger.error(`Error formatting citations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deduplicate search results
   * @param results - Results to deduplicate
   * @returns Deduplicated results
   */
  deduplicateResults(results: SearchResult[]): SearchResult[] {
    try {
      if (!Array.isArray(results)) {
        throw new BadRequestException('Results must be an array');
      }

      const seen = new Set<string>();
      const deduplicated: SearchResult[] = [];

      for (const result of results) {
        const key = `${result.knowledgeId}`;

        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(result);
        }
      }

      return deduplicated;
    } catch (error) {
      this.logger.error(`Error deduplicating results: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get popular documents
   * @param workspaceId - Workspace ID
   * @param limit - Result limit
   * @returns Most accessed documents
   */
  async getPopularDocuments(workspaceId: string, limit: number = 10): Promise<any[]> {
    try {
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      return await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          isArchived: false,
        },
        orderBy: { accessCount: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting popular documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent documents
   * @param workspaceId - Workspace ID
   * @param limit - Result limit
   * @returns Recently updated documents
   */
  async getRecentDocuments(workspaceId: string, limit: number = 10): Promise<any[]> {
    try {
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      return await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          isArchived: false,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting recent documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search and filter documents
   * @param workspaceId - Workspace ID
   * @param filters - Filter criteria
   * @returns Filtered documents
   */
  async searchAndFilter(workspaceId: string, filters: any): Promise<any[]> {
    try {
      const where: any = {
        workspaceId,
        isArchived: false,
      };

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.tag) {
        where.tags = { has: filters.tag.toLowerCase() };
      }

      if (filters.query) {
        where.OR = [
          { title: { contains: filters.query, mode: 'insensitive' } },
          { content: { contains: filters.query, mode: 'insensitive' } },
        ];
      }

      return await this.prisma.knowledge.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: filters.limit || 20,
      });
    } catch (error) {
      this.logger.error(`Error searching and filtering documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get documents by source
   * @param workspaceId - Workspace ID
   * @param source - Source URL or identifier
   * @returns Documents from source
   */
  async getBySource(workspaceId: string, source: string): Promise<any[]> {
    try {
      return await this.prisma.knowledge.findMany({
        where: {
          workspaceId,
          source,
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error getting documents by source: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get document statistics for a workspace
   * @param workspaceId - Workspace ID
   * @returns Statistics object
   */
  async getDocumentStats(workspaceId: string): Promise<any> {
    try {
      const [total, byCategory, mostAccessed, recentlyUpdated] = await Promise.all([
        this.prisma.knowledge.count({
          where: { workspaceId, isArchived: false },
        }),
        this.prisma.knowledge.groupBy({
          by: ['category'],
          where: { workspaceId, isArchived: false },
          _count: true,
        }),
        this.getPopularDocuments(workspaceId, 5),
        this.getRecentDocuments(workspaceId, 5),
      ]);

      return {
        total,
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        mostAccessed,
        recentlyUpdated,
      };
    } catch (error) {
      this.logger.error(`Error getting document statistics: ${error.message}`);
      throw error;
    }
  }
}
