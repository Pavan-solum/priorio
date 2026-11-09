import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, Classification, Entity, Suggestion } from './ai-provider.interface';

/**
 * OpenAI Provider Implementation
 * Integrates with OpenAI API (GPT-4, GPT-3.5-Turbo) for AI operations
 */
@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  readonly name = 'openai';
  readonly model: string;
  private client: any;
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY') || '';
    this.model = config.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview';

    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - provider will not work');
    } else {
      this.initializeClient();
    }
  }

  private initializeClient() {
    // Dynamic import to avoid errors if openai package not installed
    try {
      const OpenAI = require('openai').default;
      this.client = new OpenAI({ apiKey: this.apiKey });
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI client', error);
    }
  }

  async classifyTask(text: string, context?: Record<string, any>): Promise<Classification> {
    if (!this.client) {
      throw new BadRequestException('OpenAI client not initialized - missing API key');
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0].message.content.trim();
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
      throw new BadRequestException(`OpenAI classification failed: ${error.message}`);
    }
  }

  async summarizeText(text: string, maxLength: number = 100): Promise<string> {
    if (!this.client) {
      throw new BadRequestException('OpenAI client not initialized - missing API key');
    }

    const prompt = `Summarize this text in ${maxLength} characters or less:
"${text}"

Respond with ONLY the summary, no additional text, formatting, or explanation.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 150,
      });

      const summary = response.choices[0].message.content.trim();

      // Ensure summary doesn't exceed max length
      if (summary.length > maxLength) {
        return summary.substring(0, maxLength - 3) + '...';
      }

      return summary;
    } catch (error) {
      this.logger.error('Summarization failed:', error);
      throw new BadRequestException(`OpenAI summarization failed: ${error.message}`);
    }
  }

  async extractEntities(text: string): Promise<Entity[]> {
    if (!this.client) {
      throw new BadRequestException('OpenAI client not initialized - missing API key');
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      });

      const content = response.choices[0].message.content.trim();

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
      throw new BadRequestException(`OpenAI entity extraction failed: ${error.message}`);
    }
  }

  async generateSuggestions(task: Record<string, any>): Promise<Suggestion[]> {
    if (!this.client) {
      throw new BadRequestException('OpenAI client not initialized - missing API key');
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
      });

      const content = response.choices[0].message.content.trim();

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
      throw new BadRequestException(`OpenAI suggestion generation failed: ${error.message}`);
    }
  }

  async validateConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Simple test by listing models
      await this.client.models.retrieve('gpt-4-turbo-preview');
      this.logger.log('OpenAI connection validated successfully');
      return true;
    } catch (error) {
      this.logger.error('OpenAI connection validation failed:', error);
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
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const pricing = pricingMap[selectedModel] || { input: 0.01, output: 0.03 };

    const cost =
      (estimatedInputTokens / 1000) * pricing.input +
      (estimatedOutputTokens / 1000) * pricing.output;

    return cost;
  }
}
