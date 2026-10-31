/**
 * AI Provider Interface
 * Abstract contract for AI service providers (OpenAI, Anthropic, etc.)
 * Defines common operations for task classification, summarization, and entity extraction
 */

export interface AIProvider {
  readonly name: string;
  readonly model: string;

  // Core AI operations
  classifyTask(text: string, context?: Record<string, any>): Promise<Classification>;
  summarizeText(text: string, maxLength?: number): Promise<string>;
  extractEntities(text: string): Promise<Entity[]>;
  generateSuggestions(task: Record<string, any>): Promise<Suggestion[]>;

  // Provider health and management
  validateConnection(): Promise<boolean>;
  estimateCost(prompt: string, model?: string): Promise<number>;
}

/**
 * Task Classification Result
 * AI analysis output for categorizing and prioritizing tasks
 */
export interface Classification {
  /** Task category (work, personal, health, finance, etc.) */
  category: string;

  /** Priority level for the task */
  priority: 'low' | 'medium' | 'high' | 'urgent';

  /** Suggested tags for categorization */
  tags: string[];

  /** Confidence score (0-1) of the classification */
  confidence: number;

  /** Explanation of the classification reasoning */
  reasoning?: string;
}

/**
 * Extracted Entity
 * Named entity recognized in task text
 */
export interface Entity {
  /** Type of entity (date, person, location, etc.) */
  type: 'date' | 'person' | 'location' | 'organization' | 'custom';

  /** Extracted entity value */
  value: string;

  /** Confidence score (0-1) of the extraction */
  confidence: number;

  /** Entity context or additional metadata */
  metadata?: Record<string, any>;
}

/**
 * AI-Generated Suggestion
 * Actionable improvement suggestion for a task
 */
export interface Suggestion {
  /** Type of suggestion */
  type: 'improve' | 'split' | 'category' | 'deadline' | 'priority';

  /** Suggested action text */
  text: string;

  /** Reasoning behind the suggestion */
  reason: string;

  /** Whether the suggestion is actionable */
  actionable: boolean;

  /** Implementation difficulty (low, medium, high) */
  difficulty?: 'low' | 'medium' | 'high';

  /** Estimated impact (low, medium, high) */
  impact?: 'low' | 'medium' | 'high';
}

/**
 * AI Operation Telemetry
 * Cost and latency tracking for AI operations
 */
export interface AIOperationMetrics {
  /** Operation type (classify, summarize, extract, suggest) */
  operationType: string;

  /** AI provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Input tokens count */
  inputTokens: number;

  /** Output tokens count */
  outputTokens: number;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Estimated cost in USD */
  cost: number;

  /** Success or failure status */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * AI Provider Configuration
 * Configuration for AI provider initialization
 */
export interface AIProviderConfig {
  /** Provider name (openai, anthropic, etc.) */
  name: string;

  /** API key for authentication */
  apiKey: string;

  /** Model to use */
  model: string;

  /** Default temperature (0-1) for generation */
  temperature?: number;

  /** Maximum tokens per request */
  maxTokens?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}
