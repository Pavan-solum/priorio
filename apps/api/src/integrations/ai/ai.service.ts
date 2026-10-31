import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  AIProvider,
  Classification,
  Entity,
  Suggestion,
  AIOperationMetrics,
} from './providers/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * AI Service
 * Orchestrates AI operations across multiple providers
 * Handles provider selection, cost tracking, and audit logging
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private openai: OpenAIProvider,
    private anthropic: AnthropicProvider,
  ) {
    this.initializeProviders();
    this.defaultProvider = this.config.get('AI_PROVIDER', 'openai');
  }

  /**
   * Initialize available AI providers
   */
  private initializeProviders() {
    this.providers.set('openai', this.openai);
    this.providers.set('anthropic', this.anthropic);
    this.logger.log(`Initialized AI providers: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Classify a task using AI
   */
  async classifyTask(
    workspaceId: string,
    taskId: string,
    text: string,
    userId: string = 'system',
    provider?: string,
  ): Promise<Classification> {
    const aiProvider = this.getProvider(provider);
    const startTime = Date.now();

    try {
      this.logger.log(`Classifying task ${taskId} with ${aiProvider.name}`);

      const classification = await aiProvider.classifyTask(text);

      await this.logAIOperation(workspaceId, userId, 'AI_CLASSIFY', taskId, {
        provider: aiProvider.name,
        success: true,
        classification,
        executionTime: Date.now() - startTime,
      });

      return classification;
    } catch (error) {
      this.logger.error(`Classification failed for task ${taskId}:`, error);

      await this.logAIOperation(workspaceId, userId, 'AI_CLASSIFY', taskId, {
        provider: aiProvider.name,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Summarize task text using AI
   */
  async summarizeTask(
    workspaceId: string,
    taskId: string,
    text: string,
    userId: string = 'system',
    maxLength?: number,
    provider?: string,
  ): Promise<string> {
    const aiProvider = this.getProvider(provider);
    const startTime = Date.now();

    try {
      this.logger.log(`Summarizing task ${taskId} with ${aiProvider.name}`);

      const summary = await aiProvider.summarizeText(text, maxLength);

      await this.logAIOperation(workspaceId, userId, 'AI_SUMMARIZE', taskId, {
        provider: aiProvider.name,
        success: true,
        summaryLength: summary.length,
        executionTime: Date.now() - startTime,
      });

      return summary;
    } catch (error) {
      this.logger.error(`Summarization failed for task ${taskId}:`, error);

      await this.logAIOperation(workspaceId, userId, 'AI_SUMMARIZE', taskId, {
        provider: aiProvider.name,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Extract entities from task text using AI
   */
  async extractEntities(
    workspaceId: string,
    taskId: string,
    text: string,
    userId: string = 'system',
    provider?: string,
  ): Promise<Entity[]> {
    const aiProvider = this.getProvider(provider);
    const startTime = Date.now();

    try {
      this.logger.log(`Extracting entities from task ${taskId} with ${aiProvider.name}`);

      const entities = await aiProvider.extractEntities(text);

      await this.logAIOperation(workspaceId, userId, 'AI_EXTRACT_ENTITIES', taskId, {
        provider: aiProvider.name,
        success: true,
        entityCount: entities.length,
        executionTime: Date.now() - startTime,
      });

      return entities;
    } catch (error) {
      this.logger.error(`Entity extraction failed for task ${taskId}:`, error);

      await this.logAIOperation(workspaceId, userId, 'AI_EXTRACT_ENTITIES', taskId, {
        provider: aiProvider.name,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Generate AI suggestions for task improvements
   */
  async suggestImprovements(
    workspaceId: string,
    taskId: string,
    task: Record<string, any>,
    userId: string = 'system',
    provider?: string,
  ): Promise<Suggestion[]> {
    const aiProvider = this.getProvider(provider);
    const startTime = Date.now();

    try {
      this.logger.log(`Generating suggestions for task ${taskId} with ${aiProvider.name}`);

      const suggestions = await aiProvider.generateSuggestions(task);

      await this.logAIOperation(workspaceId, userId, 'AI_SUGGEST', taskId, {
        provider: aiProvider.name,
        success: true,
        suggestionCount: suggestions.length,
        executionTime: Date.now() - startTime,
      });

      return suggestions;
    } catch (error) {
      this.logger.error(`Suggestion generation failed for task ${taskId}:`, error);

      await this.logAIOperation(workspaceId, userId, 'AI_SUGGEST', taskId, {
        provider: aiProvider.name,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Check AI provider health
   */
  async checkProviderHealth(provider?: string): Promise<boolean> {
    const aiProvider = this.getProvider(provider);

    try {
      const isHealthy = await aiProvider.validateConnection();

      if (isHealthy) {
        this.logger.log(`Provider ${aiProvider.name} is healthy`);
      } else {
        this.logger.warn(`Provider ${aiProvider.name} is unhealthy`);
      }

      return isHealthy;
    } catch (error) {
      this.logger.error(`Health check failed for provider ${aiProvider.name}:`, error);
      return false;
    }
  }

  /**
   * Estimate cost of an AI operation
   */
  async estimateCost(
    prompt: string,
    provider?: string,
  ): Promise<{ cost: number; provider: string; model: string }> {
    const aiProvider = this.getProvider(provider);

    try {
      const cost = await aiProvider.estimateCost(prompt);

      return {
        cost,
        provider: aiProvider.name,
        model: aiProvider.model,
      };
    } catch (error) {
      this.logger.error(`Cost estimation failed for provider ${aiProvider.name}:`, error);
      throw error;
    }
  }

  /**
   * List all available AI providers
   */
  async listAvailableProviders(): Promise<Array<{ name: string; model: string; available: boolean }>> {
    const providers = [];

    for (const [name, provider] of this.providers) {
      const available = await this.checkProviderHealth(name).catch(() => false);
      providers.push({
        name,
        model: provider.model,
        available,
      });
    }

    return providers;
  }

  /**
   * Get provider instance by name
   */
  private getProvider(provider?: string): AIProvider {
    const selectedProvider = provider || this.defaultProvider;
    const aiProvider = this.providers.get(selectedProvider);

    if (!aiProvider) {
      throw new BadRequestException(
        `AI provider '${selectedProvider}' not supported. Available: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }

    return aiProvider;
  }

  /**
   * Log AI operation for audit trail and analytics
   */
  private async logAIOperation(
    workspaceId: string,
    userId: string,
    action: string,
    resourceId: string,
    details: Record<string, any>,
  ) {
    try {
      await this.auditLogs.log({
        workspaceId,
        userId,
        action,
        resourceType: 'task',
        resourceId,
        details,
        status: details.success ? 'success' : 'error',
      });
    } catch (error) {
      this.logger.error(`Failed to log AI operation:`, error);
      // Don't throw - logging failure shouldn't crash the operation
    }
  }
}
