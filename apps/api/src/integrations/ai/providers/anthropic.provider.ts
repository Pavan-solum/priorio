import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, Classification, Entity, Suggestion } from './ai-provider.interface';

/**
 * Anthropic Provider Implementation
 * Integrates with Anthropic API (Claude) for AI operations
 */
@Injectable()
export class AnthropicProvider implements AIProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  readonly name = 'anthropic';
  readonly model: string;
  private client: any;
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('ANTHROPIC_API_KEY') || '';
    this.model = config.get<string>('ANTHROPIC_MODEL') || 'claude-3-sonnet-20240229';

    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - provider will not work');
    } else {
      this.initializeClient();
    }
  }

  private initializeClient() {
    // Dynamic import to avoid errors if anthropic package not installed
    try {
      const Anthropic = require('@anthropic-ai/sdk').default;
      this.client = new Anthropic({ apiKey: this.apiKey });
    } catch (error) {
      this.logger.error('Failed to initialize Anthropic client', error);
    }
  }

  async classifyTask(text: string, context?: Record<string, any>): Promise<Classification> {
    if (!this.client) {
      throw new BadRequestException('Anthropic client not initialized - missing API key');
    }

    const prompt = `Analyze this task and provide classification:
"${text}"

${context ? `Context: ${JSON.stringify(context)}` : ''}

Return a valid JSON object with exactly these fields:
- category: string (one of: work, personal, health, finance, learning, admin, other)
- priority: string (one of: low, medium, high, urgent)
- tags: array of strings (2-4 relevant tags)
- confidence: number between 0 and 1
- reasoning: string (brief explanation)

Respond with ONLY the JSON object, no additional text.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = (response.content[0] as any).text.trim();
      const classification = JSON.parse(content);

      // Validate response structure
      if (!classification.category || !classification.priority || !Array.isArray(classification.tags)) {
        throw new Error('Invalid classification response structure');
      }

      return {
        category: classification.category,
        priority: classification.priority as 'low' | 'medium' | 'high' | 'urgent',
        tags: classification.tags,
        confidence: Math.min(1, Math.max(0, classification.confidence || 0.8)),
        reasoning: classification.reasoning,
      };
    } catch (error) {
      this.logger.error('Classification failed:', error);
      throw new BadRequestException(`Anthropic classification failed: ${error.message}`);
    }
  }

  async summarizeText(text: string, maxLength: number = 100): Promise<string> {
    if (!this.client) {
      throw new BadRequestException('Anthropic client not initialized - missing API key');
    }

    const prompt = `Summarize this text in ${maxLength} characters or less:
"${text}"

Respond with ONLY the summary, no additional text, formatting, or explanation.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      });

      const summary = (response.content[0] as any).text.trim();

      // Ensure summary doesn't exceed max length
      if (summary.length > maxLength) {
        return summary.substring(0, maxLength - 3) + '...';
      }

      return summary;
    } catch (error) {
      this.logger.error('Summarization failed:', error);
      throw new BadRequestException(`Anthropic summarization failed: ${error.message}`);
    }
  }

  async extractEntities(text: string): Promise<Entity[]> {
    if (!this.client) {
      throw new BadRequestException('Anthropic client not initialized - missing API key');
    }

    const prompt = `Extract entities from this text:
"${text}"

Return a valid JSON array with objects having exactly these fields:
- type: string (one of: date, person, location, organization, custom)
- value: string (the extracted entity)
- confidence: number between 0 and 1
- metadata: object (optional additional info)

Only include high confidence entities (confidence >= 0.7).
If no entities found, return empty array [].

Respond with ONLY the JSON array, no additional text.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = (response.content[0] as any).text.trim();

      // Handle empty array case
      if (content === '[]') {
        return [];
      }

      const entities = JSON.parse(content);

      // Validate and filter entities
      return Array.isArray(entities)
        ? entities
            .filter((e) => e.confidence >= 0.7)
            .map((e) => ({
              type: e.type as any,
              value: e.value,
              confidence: Math.min(1, Math.max(0, e.confidence)),
              metadata: e.metadata,
            }))
        : [];
    } catch (error) {
      this.logger.error('Entity extraction failed:', error);
      throw new BadRequestException(`Anthropic entity extraction failed: ${error.message}`);
    }
  }

  async generateSuggestions(task: Record<string, any>): Promise<Suggestion[]> {
    if (!this.client) {
      throw new BadRequestException('Anthropic client not initialized - missing API key');
    }

    const prompt = `Suggest improvements for this task:
Title: ${task.title || 'N/A'}
Description: ${task.description || 'N/A'}
${task.category ? `Category: ${task.category}` : ''}
${task.priority ? `Priority: ${task.priority}` : ''}

Return a valid JSON array with 2-3 objects having exactly these fields:
- type: string (one of: improve, split, category, deadline, priority)
- text: string (the suggestion)
- reason: string (why this helps)
- actionable: boolean
- difficulty: string (low, medium, or high)
- impact: string (low, medium, or high)

Focus on high-value, actionable suggestions only.
Respond with ONLY the JSON array, no additional text.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = (response.content[0] as any).text.trim();

      // Handle empty array case
      if (content === '[]') {
        return [];
      }

      const suggestions = JSON.parse(content);

      return Array.isArray(suggestions)
        ? suggestions.map((s) => ({
            type: s.type as any,
            text: s.text,
            reason: s.reason,
            actionable: s.actionable ?? true,
            difficulty: s.difficulty,
            impact: s.impact,
          }))
        : [];
    } catch (error) {
      this.logger.error('Suggestion generation failed:', error);
      throw new BadRequestException(`Anthropic suggestion generation failed: ${error.message}`);
    }
  }

  async validateConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Simple test by making a minimal request
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });

      this.logger.log('Anthropic connection validated successfully');
      return true;
    } catch (error) {
      this.logger.error('Anthropic connection validation failed:', error);
      return false;
    }
  }

  async estimateCost(prompt: string, model?: string): Promise<number> {
    const selectedModel = model || this.model;

    // Token estimation: roughly 1 token per 4 characters for English
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    // Assume roughly 2x output for completions
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens / 2);

    // Pricing (as of 2024) - update as needed
    const pricingMap: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const pricing = pricingMap[selectedModel] || { input: 0.003, output: 0.015 };

    const cost =
      (estimatedInputTokens / 1000) * pricing.input +
      (estimatedOutputTokens / 1000) * pricing.output;

    return cost;
  }
}
