import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { ClassifyTaskDto, SummarizeTextDto, SuggestImprovementsDto } from './dto/ai.dto';

/**
 * AI Controller
 * Endpoints for AI-powered task operations
 * - Classification: categorize and prioritize tasks
 * - Summarization: condense task descriptions
 * - Entity Extraction: extract dates, people, locations
 * - Suggestions: generate improvement recommendations
 */
@Controller('api/integrations/ai')
export class AIController {
  constructor(private aiService: AIService) {}

  /**
   * POST /api/integrations/ai/classify/:taskId
   * Classify a task using AI
   * Returns: category, priority, tags, confidence
   */
  @Post('classify/:taskId')
  @HttpCode(HttpStatus.OK)
  async classifyTask(
    @Param('taskId') taskId: string,
    @Body() dto: ClassifyTaskDto,
    @Query('provider') provider?: string,
  ) {
    if (!taskId || !dto.text) {
      throw new BadRequestException('taskId and text are required');
    }

    try {
      const classification = await this.aiService.classifyTask(
        dto.workspaceId,
        taskId,
        dto.text,
        dto.userId || 'system',
        provider,
      );

      return {
        success: true,
        data: classification,
        message: 'Task classified successfully',
        taskId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Classification failed',
        taskId,
      };
    }
  }

  /**
   * POST /api/integrations/ai/summarize/:taskId
   * Summarize task text
   * Returns: summary string
   */
  @Post('summarize/:taskId')
  @HttpCode(HttpStatus.OK)
  async summarizeTask(
    @Param('taskId') taskId: string,
    @Body() dto: SummarizeTextDto,
    @Query('provider') provider?: string,
  ) {
    if (!taskId || !dto.text) {
      throw new BadRequestException('taskId and text are required');
    }

    try {
      const summary = await this.aiService.summarizeTask(
        dto.workspaceId,
        taskId,
        dto.text,
        dto.userId || 'system',
        dto.maxLength || 100,
        provider,
      );

      return {
        success: true,
        data: { summary },
        message: 'Task summarized successfully',
        taskId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Summarization failed',
        taskId,
      };
    }
  }

  /**
   * POST /api/integrations/ai/extract-entities/:taskId
   * Extract entities from task text
   * Returns: array of entities (dates, people, locations, etc.)
   */
  @Post('extract-entities/:taskId')
  @HttpCode(HttpStatus.OK)
  async extractEntities(
    @Param('taskId') taskId: string,
    @Body() dto: ClassifyTaskDto,
    @Query('provider') provider?: string,
  ) {
    if (!taskId || !dto.text) {
      throw new BadRequestException('taskId and text are required');
    }

    try {
      const entities = await this.aiService.extractEntities(
        dto.workspaceId,
        taskId,
        dto.text,
        dto.userId || 'system',
        provider,
      );

      return {
        success: true,
        data: { entities },
        message: 'Entities extracted successfully',
        taskId,
        count: entities.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Entity extraction failed',
        taskId,
      };
    }
  }

  /**
   * POST /api/integrations/ai/suggest/:taskId
   * Generate AI suggestions for task improvements
   * Returns: array of suggestions
   */
  @Post('suggest/:taskId')
  @HttpCode(HttpStatus.OK)
  async suggestImprovements(
    @Param('taskId') taskId: string,
    @Body() dto: SuggestImprovementsDto,
    @Query('provider') provider?: string,
  ) {
    if (!taskId) {
      throw new BadRequestException('taskId is required');
    }

    try {
      const suggestions = await this.aiService.suggestImprovements(
        dto.workspaceId,
        taskId,
        dto.task,
        dto.userId || 'system',
        provider,
      );

      return {
        success: true,
        data: { suggestions },
        message: 'Suggestions generated successfully',
        taskId,
        count: suggestions.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Suggestion generation failed',
        taskId,
      };
    }
  }

  /**
   * GET /api/integrations/ai/health
   * Check AI provider health
   * Returns: health status for selected provider
   */
  @Get('health')
  async checkHealth(@Query('provider') provider?: string) {
    try {
      const isHealthy = await this.aiService.checkProviderHealth(provider);

      return {
        success: true,
        data: { healthy: isHealthy },
        message: isHealthy ? 'AI provider is healthy' : 'AI provider is unavailable',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Health check failed',
      };
    }
  }

  /**
   * GET /api/integrations/ai/providers
   * List all available AI providers and their status
   */
  @Get('providers')
  async listProviders() {
    try {
      const providers = await this.aiService.listAvailableProviders();

      const available = providers.filter((p) => p.available);
      const unavailable = providers.filter((p) => !p.available);

      return {
        success: true,
        data: { providers, available: available.length, unavailable: unavailable.length },
        message: `${available.length} provider(s) available`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Provider listing failed',
      };
    }
  }

  /**
   * POST /api/integrations/ai/estimate-cost
   * Estimate cost of an AI operation
   * Returns: estimated cost in USD
   */
  @Post('estimate-cost')
  @HttpCode(HttpStatus.OK)
  async estimateCost(@Body('prompt') prompt: string, @Query('provider') provider?: string) {
    if (!prompt) {
      throw new BadRequestException('prompt is required');
    }

    try {
      const costData = await this.aiService.estimateCost(prompt, provider);

      return {
        success: true,
        data: costData,
        message: 'Cost estimated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Cost estimation failed',
      };
    }
  }

  /**
   * POST /api/integrations/ai/batch-classify
   * Classify multiple tasks in a single request
   * Useful for bulk operations
   */
  @Post('batch-classify')
  @HttpCode(HttpStatus.OK)
  async batchClassify(
    @Body() dto: { workspaceId: string; tasks: Array<{ id: string; text: string }> },
    @Query('provider') provider?: string,
  ) {
    if (!dto.workspaceId || !Array.isArray(dto.tasks) || dto.tasks.length === 0) {
      throw new BadRequestException('workspaceId and tasks array are required');
    }

    const results = [];
    const errors = [];

    for (const task of dto.tasks) {
      try {
        const classification = await this.aiService.classifyTask(
          dto.workspaceId,
          task.id,
          task.text,
          'system',
          provider,
        );

        results.push({
          taskId: task.id,
          success: true,
          classification,
        });
      } catch (error) {
        errors.push({
          taskId: task.id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      data: { results, errors },
      message: `Classified ${results.length} tasks${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      summary: {
        total: dto.tasks.length,
        succeeded: results.length,
        failed: errors.length,
      },
    };
  }
}
