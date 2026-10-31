import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface ConversationSummary {
  id: string;
  title: string;
  summary: string;
  messageCount: number;
  keyPoints: string[];
  createdAt: Date;
  lastMessageAt?: Date;
}

/**
 * AssistantMemoryService
 * Manages conversation memory and long-term context for the assistant
 */
@Injectable()
export class AssistantMemoryService {
  private readonly logger = new Logger(AssistantMemoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Store a conversation with summarization
   * @param userId - User ID
   * @param conversation - Conversation data
   * @param workspaceId - Workspace ID
   * @returns Stored conversation
   */
  async storeConversation(
    userId: string,
    conversation: any,
    workspaceId: string,
  ): Promise<any> {
    try {
      if (!conversation.title) {
        throw new BadRequestException('Conversation title is required');
      }

      // Check if conversation already exists
      const existing = await this.prisma.conversation.findFirst({
        where: {
          id: conversation.id,
          workspaceId,
        },
      });

      let stored;

      if (existing) {
        // Update existing conversation
        stored = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            title: conversation.title,
            summary: conversation.summary,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new conversation
        stored = await this.prisma.conversation.create({
          data: {
            workspaceId,
            userId,
            title: conversation.title,
            summary: conversation.summary,
          },
        });
      }

      this.logger.log(`Conversation stored: ${stored.id}`);
      return stored;
    } catch (error) {
      this.logger.error(`Error storing conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve conversation history with context
   * @param conversationId - Conversation ID
   * @param limit - Number of messages to retrieve
   * @returns Conversation messages with context
   */
  async retrieveHistory(conversationId: string, limit: number = 50): Promise<any> {
    try {
      if (limit < 1 || limit > 200) {
        throw new BadRequestException('Limit must be between 1 and 200');
      }

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            include: { sources: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          },
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      return {
        ...conversation,
        messages: conversation.messages.reverse(), // Return in chronological order
        context: {
          messageCount: conversation.messageCount,
          summary: conversation.summary,
          lastMessageAt: conversation.lastMessageAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error retrieving history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Manage long-term memory by analyzing conversation patterns
   * @param userId - User ID
   * @returns Memory insights
   */
  async manageLongTermMemory(userId: string): Promise<any> {
    try {
      // Get recent conversations
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Analyze patterns
      const patterns = this.analyzePatterns(conversations);

      // Identify key topics
      const keyTopics = this.extractKeyTopics(conversations);

      // Calculate engagement metrics
      const engagement = this.calculateEngagement(conversations);

      return {
        userId,
        totalConversations: conversations.length,
        patterns,
        keyTopics,
        engagement,
        recommendations: this.generateRecommendations(patterns, keyTopics),
      };
    } catch (error) {
      this.logger.error(`Error managing long-term memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Summarize a conversation
   * @param conversationId - Conversation ID
   * @returns Conversation summary
   */
  async summarizeConversation(conversationId: string): Promise<ConversationSummary> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Extract key points
      const keyPoints = this.extractKeyPoints(conversation.messages);

      // Generate summary
      const summary = this.generateSummary(conversation.messages, keyPoints);

      // Update conversation with summary
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          summary,
          updatedAt: new Date(),
        },
      });

      return {
        id: conversation.id,
        title: conversation.title,
        summary,
        messageCount: conversation.messageCount,
        keyPoints,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
      };
    } catch (error) {
      this.logger.error(`Error summarizing conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract key points from conversation
   * @param conversation - Conversation with messages
   * @returns Array of key points
   */
  extractKeyPoints(conversation: any): string[] {
    try {
      const keyPoints: string[] = [];
      const messages = Array.isArray(conversation)
        ? conversation
        : conversation.messages || [];

      for (const message of messages) {
        if (message.role === 'assistant') {
          // Extract sentences containing important keywords
          const sentences = message.content.split(/[.!?]+/);
          const important = sentences.filter(
            (s: string) =>
              s.toLowerCase().includes('important') ||
              s.toLowerCase().includes('key') ||
              s.toLowerCase().includes('must') ||
              s.toLowerCase().includes('should') ||
              s.toLowerCase().includes('requirement') ||
              s.toLowerCase().includes('action'),
          );

          keyPoints.push(
            ...important.map((s: string) => s.trim()).filter((s) => s.length > 0),
          );
        }
      }

      // Remove duplicates and limit to top 5
      return [...new Set(keyPoints)].slice(0, 5);
    } catch (error) {
      this.logger.error(`Error extracting key points: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate a summary of the conversation
   * @param messages - Conversation messages
   * @param keyPoints - Extracted key points
   * @returns Summary text
   */
  private generateSummary(messages: any[], keyPoints: string[]): string {
    try {
      if (messages.length === 0) {
        return 'No messages in conversation';
      }

      const userMessages = messages.filter((m) => m.role === 'user');
      const assistantMessages = messages.filter((m) => m.role === 'assistant');

      let summary = `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant responses.\n\n`;

      if (keyPoints.length > 0) {
        summary += `Key Points:\n`;
        keyPoints.forEach((point, i) => {
          summary += `${i + 1}. ${point}\n`;
        });
      }

      return summary;
    } catch (error) {
      this.logger.error(`Error generating summary: ${error.message}`);
      return 'Summary generation failed';
    }
  }

  /**
   * Analyze conversation patterns
   * @param conversations - Array of conversations
   * @returns Pattern analysis
   */
  private analyzePatterns(conversations: any[]): any {
    try {
      const patterns = {
        averageMessagesPerConversation: 0,
        averageConversationLength: 0,
        mostCommonTopics: [] as string[],
        frequencyDistribution: {} as Record<string, number>,
      };

      if (conversations.length === 0) {
        return patterns;
      }

      const totalMessages = conversations.reduce(
        (sum, c) => sum + c.messageCount,
        0,
      );
      patterns.averageMessagesPerConversation = Math.round(totalMessages / conversations.length);

      // Calculate average length (in characters)
      const totalLength = conversations.reduce(
        (sum, c) => sum + (c.summary?.length || 0),
        0,
      );
      patterns.averageConversationLength = Math.round(totalLength / conversations.length);

      return patterns;
    } catch (error) {
      this.logger.error(`Error analyzing patterns: ${error.message}`);
      return {};
    }
  }

  /**
   * Extract key topics from conversations
   * @param conversations - Array of conversations
   * @returns Array of topics
   */
  private extractKeyTopics(conversations: any[]): string[] {
    try {
      const topics: Record<string, number> = {};

      for (const conv of conversations) {
        const title = conv.title.toLowerCase();
        const words = title.split(/[\s\-_]+/);

        for (const word of words) {
          if (word.length > 3) {
            topics[word] = (topics[word] || 0) + 1;
          }
        }
      }

      // Get top 5 topics by frequency
      return Object.entries(topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);
    } catch (error) {
      this.logger.error(`Error extracting key topics: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate engagement metrics
   * @param conversations - Array of conversations
   * @returns Engagement metrics
   */
  private calculateEngagement(conversations: any[]): any {
    try {
      if (conversations.length === 0) {
        return {
          totalConversations: 0,
          activePercentage: 0,
          engagementScore: 0,
        };
      }

      const active = conversations.filter((c) => c.messageCount > 1).length;
      const activePercentage = Math.round((active / conversations.length) * 100);

      // Calculate engagement score (0-100)
      const avgMessages = conversations.reduce(
        (sum, c) => sum + c.messageCount,
        0,
      ) / conversations.length;
      const engagementScore = Math.min(Math.round(avgMessages * 10), 100);

      return {
        totalConversations: conversations.length,
        activeConversations: active,
        activePercentage,
        engagementScore,
      };
    } catch (error) {
      this.logger.error(`Error calculating engagement: ${error.message}`);
      return {};
    }
  }

  /**
   * Generate recommendations based on patterns
   * @param patterns - Pattern analysis
   * @param topics - Key topics
   * @returns Array of recommendations
   */
  private generateRecommendations(patterns: any, topics: string[]): string[] {
    const recommendations: string[] = [];

    if (patterns.averageMessagesPerConversation < 3) {
      recommendations.push(
        'Consider asking more follow-up questions to deepen conversations',
      );
    }

    if (topics.length > 0) {
      recommendations.push(
        `Focus on topics like: ${topics.join(', ')} based on your conversation history`,
      );
    }

    if (patterns.averageConversationLength > 1000) {
      recommendations.push('Consider breaking down complex topics into shorter conversations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your conversation patterns look healthy!');
    }

    return recommendations;
  }

  /**
   * Get memory statistics for a user
   * @param userId - User ID
   * @returns Memory statistics
   */
  async getMemoryStats(userId: string): Promise<any> {
    try {
      const [conversations, totalMessages] = await Promise.all([
        this.prisma.conversation.findMany({
          where: { userId },
        }),
        this.prisma.conversationMessage.count({
          where: { conversation: { userId } },
        }),
      ]);

      return {
        userId,
        totalConversations: conversations.length,
        totalMessages,
        averageMessagesPerConversation: conversations.length
          ? Math.round(totalMessages / conversations.length)
          : 0,
        archivedConversations: conversations.filter((c) => c.isArchived).length,
        memoryUsageEstimate: {
          bytes: Math.round(totalMessages * 500),
          megabytes: Math.round((totalMessages * 500) / (1024 * 1024) * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting memory stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old conversation memories
   * @param userId - User ID
   * @param days - Older than X days
   * @returns Count of cleaned up conversations
   */
  async cleanupOldMemories(userId: string, days: number = 90): Promise<number> {
    try {
      if (days < 1 || days > 365) {
        throw new BadRequestException('Days must be between 1 and 365');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Archive old conversations instead of deleting
      const result = await this.prisma.conversation.updateMany({
        where: {
          userId,
          createdAt: { lt: cutoffDate },
          isArchived: false,
        },
        data: { isArchived: true },
      });

      this.logger.log(`Archived ${result.count} old conversations for user ${userId}`);
      return result.count;
    } catch (error) {
      this.logger.error(`Error cleaning up old memories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's conversation timeline
   * @param userId - User ID
   * @param limit - Number of conversations
   * @returns Timeline data
   */
  async getConversationTimeline(userId: string, limit: number = 30): Promise<any[]> {
    try {
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          messageCount: true,
          createdAt: true,
          lastMessageAt: true,
        },
      });

      return conversations.reverse(); // Return in chronological order
    } catch (error) {
      this.logger.error(`Error getting conversation timeline: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search through conversation memories
   * @param userId - User ID
   * @param query - Search query
   * @returns Matching conversations
   */
  async searchMemories(userId: string, query: string): Promise<any[]> {
    try {
      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Search query is required');
      }

      return await this.prisma.conversation.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    } catch (error) {
      this.logger.error(`Error searching memories: ${error.message}`);
      throw error;
    }
  }
}
