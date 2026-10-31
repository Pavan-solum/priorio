import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentRetrieverService } from './document-retriever.service';
import { EmbeddingService } from './embedding.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  createdAt: Date;
}

interface GenerateResponseParams {
  query: string;
  context?: any;
  conversationId?: string;
  userId: string;
  workspaceId: string;
}

/**
 * CitedAssistantService
 * AI assistant with citation tracking and knowledge retrieval
 */
@Injectable()
export class CitedAssistantService {
  private readonly logger = new Logger(CitedAssistantService.name);
  private citationCount = 0;
  private responseCount = 0;

  constructor(
    private prisma: PrismaService,
    private documentRetriever: DocumentRetrieverService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Generate a response with citations
   * @param params - Generation parameters
   * @returns Response with sources
   */
  async generateResponse(params: GenerateResponseParams): Promise<any> {
    try {
      const { query, context, conversationId: providedConversationId, userId, workspaceId } = params;

      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Query is required');
      }

      // Retrieve relevant documents
      const relevantDocuments = await this.retrieveRelevantDocuments(query, 5, workspaceId);

      // Generate response based on context
      const response = this.generateResponseText(query, relevantDocuments, context);

      // Generate citations
      const citations = await this.generateCitations(response, relevantDocuments);

      // Get or create conversation
      let conversationId = providedConversationId;
      if (!conversationId) {
        const conversation = await this.prisma.conversation.create({
          data: {
            workspaceId,
            userId,
            title: query.substring(0, 50),
          },
        });
        conversationId = conversation.id;
      }

      // Store assistant message
      const messageResponse = await this.prisma.conversationMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: response,
          metadata: {
            sourceCount: citations.length,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      // Create citations
      for (const citation of citations) {
        await this.prisma.citedSource.create({
          data: {
            messageId: messageResponse.id,
            knowledgeId: citation.knowledgeId,
            title: citation.title,
            url: citation.url,
            content: citation.content,
            relevanceScore: citation.relevanceScore,
            position: citation.position,
          },
        });
      }

      this.responseCount++;

      return {
        id: messageResponse.id,
        conversationId,
        content: response,
        sources: citations,
        metadata: {
          sourceCount: citations.length,
          confidenceScore: this.calculateConfidenceScore(citations),
          generatedAt: messageResponse.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve relevant documents for a query
   * @param query - Search query
   * @param topK - Number of results
   * @param workspaceId - Workspace ID
   * @returns Array of relevant documents
   */
  async retrieveRelevantDocuments(
    query: string,
    topK: number,
    workspaceId: string,
  ): Promise<any[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Query is required');
      }

      if (topK < 1 || topK > 20) {
        throw new BadRequestException('topK must be between 1 and 20');
      }

      return await this.documentRetriever.semanticSearch(query, topK, workspaceId);
    } catch (error) {
      this.logger.error(`Error retrieving relevant documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate response text based on query and context
   * @param query - User query
   * @param documents - Relevant documents
   * @param context - Additional context
   * @returns Generated response
   */
  private generateResponseText(query: string, documents: any[], context?: any): string {
    try {
      let response = '';

      // Generate response based on query type
      if (this.isQuestionQuery(query)) {
        response = this.generateAnswerResponse(query, documents);
      } else if (this.isSummaryQuery(query)) {
        response = this.generateSummaryResponse(query, documents);
      } else if (this.isExplanationQuery(query)) {
        response = this.generateExplanationResponse(query, documents);
      } else {
        response = this.generateGenericResponse(query, documents);
      }

      return response;
    } catch (error) {
      this.logger.error(`Error generating response text: ${error.message}`);
      return `I found information about "${query}" but encountered an error while generating a response.`;
    }
  }

  /**
   * Generate answer response
   * @param query - Question
   * @param documents - Supporting documents
   * @returns Answer text
   */
  private generateAnswerResponse(query: string, documents: any[]): string {
    if (documents.length === 0) {
      return `Based on available information, I don't have specific details about "${query}". Please provide more context or check the knowledge base.`;
    }

    const topDoc = documents[0];
    let response = `Based on the knowledge base: ${topDoc.title}\n\n`;
    response += topDoc.content.substring(0, 300);

    if (documents.length > 1) {
      response += `\n\nAdditional relevant information can be found in: ${documents
        .slice(1, 3)
        .map((d) => d.title)
        .join(', ')}`;
    }

    return response;
  }

  /**
   * Generate summary response
   * @param query - Summary request
   * @param documents - Documents to summarize
   * @returns Summary text
   */
  private generateSummaryResponse(query: string, documents: any[]): string {
    if (documents.length === 0) {
      return `No information found to summarize for "${query}".`;
    }

    let summary = `Summary of ${query}:\n\n`;
    const topDocs = documents.slice(0, 3);

    for (const doc of topDocs) {
      summary += `• ${doc.title}: ${doc.content.substring(0, 150)}...\n`;
    }

    return summary;
  }

  /**
   * Generate explanation response
   * @param query - Explanation request
   * @param documents - Supporting documents
   * @returns Explanation text
   */
  private generateExplanationResponse(query: string, documents: any[]): string {
    if (documents.length === 0) {
      return `I don't have enough information to explain "${query}". Try refining your question.`;
    }

    let explanation = `Explanation:\n\n`;
    const topDoc = documents[0];
    explanation += topDoc.content.substring(0, 500);

    return explanation;
  }

  /**
   * Generate generic response
   * @param query - Query
   * @param documents - Supporting documents
   * @returns Generic response
   */
  private generateGenericResponse(query: string, documents: any[]): string {
    if (documents.length === 0) {
      return `I found no information about "${query}". Please try a different search term.`;
    }

    let response = `Regarding "${query}":\n\n`;
    response += documents[0].content.substring(0, 400);

    return response;
  }

  /**
   * Check if query is a question
   * @param query - Query text
   * @returns True if question
   */
  private isQuestionQuery(query: string): boolean {
    return query.trim().endsWith('?') || query.toLowerCase().startsWith('what') ||
           query.toLowerCase().startsWith('how') || query.toLowerCase().startsWith('why');
  }

  /**
   * Check if query is a summary request
   * @param query - Query text
   * @returns True if summary request
   */
  private isSummaryQuery(query: string): boolean {
    return query.toLowerCase().includes('summarize') ||
           query.toLowerCase().includes('summary') ||
           query.toLowerCase().includes('overview');
  }

  /**
   * Check if query is an explanation request
   * @param query - Query text
   * @returns True if explanation request
   */
  private isExplanationQuery(query: string): boolean {
    return query.toLowerCase().includes('explain') ||
           query.toLowerCase().includes('tell me about');
  }

  /**
   * Generate citations from response and sources
   * @param response - Generated response
   * @param sources - Source documents
   * @returns Array of citations
   */
  async generateCitations(response: string, sources: any[]): Promise<any[]> {
    try {
      const citations: any[] = [];
      let position = 1;

      for (const source of sources) {
        // Check if source content is mentioned in response
        if (this.isSourceMentioned(response, source)) {
          citations.push({
            knowledgeId: source.knowledgeId,
            title: source.title,
            url: source.source,
            content: source.content,
            relevanceScore: source.relevanceScore,
            position: position++,
          });

          this.citationCount++;
        }
      }

      // If no direct mentions, use top sources
      if (citations.length === 0 && sources.length > 0) {
        const topSources = sources.slice(0, Math.min(3, sources.length));
        position = 1;

        for (const source of topSources) {
          citations.push({
            knowledgeId: source.knowledgeId,
            title: source.title,
            url: source.source,
            content: source.content,
            relevanceScore: source.relevanceScore,
            position: position++,
          });
        }
      }

      return citations;
    } catch (error) {
      this.logger.error(`Error generating citations: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if source is mentioned in response
   * @param response - Response text
   * @param source - Source document
   * @returns True if mentioned
   */
  private isSourceMentioned(response: string, source: any): boolean {
    const titleLower = source.title.toLowerCase();
    const responseLower = response.toLowerCase();

    return (
      responseLower.includes(titleLower) ||
      responseLower.includes(source.title.split(' ')[0].toLowerCase())
    );
  }

  /**
   * Validate citations
   * @param citations - Citations to validate
   * @returns Validation result
   */
  async validateCitations(citations: any[]): Promise<any> {
    try {
      if (!Array.isArray(citations)) {
        throw new BadRequestException('Citations must be an array');
      }

      const validatedCitations = [];
      let invalidCount = 0;

      for (const citation of citations) {
        if (citation.knowledgeId) {
          const knowledge = await this.prisma.knowledge.findUnique({
            where: { id: citation.knowledgeId },
          });

          if (knowledge) {
            validatedCitations.push({
              ...citation,
              valid: true,
            });
          } else {
            validatedCitations.push({
              ...citation,
              valid: false,
            });
            invalidCount++;
          }
        }
      }

      return {
        total: citations.length,
        valid: validatedCitations.length - invalidCount,
        invalid: invalidCount,
        citations: validatedCitations,
      };
    } catch (error) {
      this.logger.error(`Error validating citations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track source usage
   * @param source - Source to track
   * @returns Tracking result
   */
  async trackSourceUsage(source: any): Promise<void> {
    try {
      if (!source.knowledgeId) {
        return;
      }

      // Increment access count
      await this.prisma.knowledge.update({
        where: { id: source.knowledgeId },
        data: {
          accessCount: { increment: 1 },
        },
      });

      this.logger.debug(`Tracked usage for knowledge: ${source.knowledgeId}`);
    } catch (error) {
      this.logger.error(`Error tracking source usage: ${error.message}`);
    }
  }

  /**
   * Improve response quality based on feedback
   * @returns Quality metrics
   */
  async improveResponseQuality(): Promise<any> {
    try {
      // Calculate quality metrics
      const avgCitationsPerResponse = this.citationCount / Math.max(this.responseCount, 1);
      const citationQualityScore = Math.min(avgCitationsPerResponse * 10, 100);

      return {
        totalResponses: this.responseCount,
        totalCitations: this.citationCount,
        avgCitationsPerResponse: Math.round(avgCitationsPerResponse * 10) / 10,
        qualityScore: Math.round(citationQualityScore),
      };
    } catch (error) {
      this.logger.error(`Error calculating quality metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate confidence score based on citations
   * @param citations - Citations
   * @returns Confidence score (0-100)
   */
  private calculateConfidenceScore(citations: any[]): number {
    if (citations.length === 0) return 30;

    const avgRelevance = citations.reduce((sum, c) => sum + (c.relevanceScore || 0), 0) /
                        citations.length;
    const citationBoost = Math.min(citations.length * 10, 40);

    return Math.round(Math.min(avgRelevance * 100 + citationBoost, 100));
  }

  /**
   * Get conversation history
   * @param conversationId - Conversation ID
   * @param limit - Message limit
   * @returns Array of messages
   */
  async getConversationHistory(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      if (limit < 1 || limit > 200) {
        throw new BadRequestException('Limit must be between 1 and 200');
      }

      const messages = await this.prisma.conversationMessage.findMany({
        where: { conversationId },
        include: { sources: true },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        sources: m.sources,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Error getting conversation history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store user message in conversation
   * @param conversationId - Conversation ID
   * @param content - Message content
   * @returns Created message
   */
  async storeUserMessage(conversationId: string, content: string): Promise<any> {
    try {
      if (!content || content.trim().length === 0) {
        throw new BadRequestException('Message content is required');
      }

      const message = await this.prisma.conversationMessage.create({
        data: {
          conversationId,
          role: 'user',
          content,
        },
      });

      // Update conversation message count and timestamp
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
        },
      });

      return message;
    } catch (error) {
      this.logger.error(`Error storing user message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   * @param conversationId - Conversation ID
   * @returns Conversation
   */
  async getConversation(conversationId: string): Promise<any> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            include: { sources: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Error getting conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive conversation
   * @param conversationId - Conversation ID
   * @returns Archived conversation
   */
  async archiveConversation(conversationId: string): Promise<any> {
    try {
      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isArchived: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error archiving conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete conversation
   * @param conversationId - Conversation ID
   * @returns Deleted conversation
   */
  async deleteConversation(conversationId: string): Promise<any> {
    try {
      return await this.prisma.conversation.delete({
        where: { id: conversationId },
      });
    } catch (error) {
      this.logger.error(`Error deleting conversation: ${error.message}`);
      throw error;
    }
  }
}
