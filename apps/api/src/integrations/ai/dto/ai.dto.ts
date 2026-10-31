import { IsString, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';

/**
 * Classify Task DTO
 * Request body for task classification
 */
export class ClassifyTaskDto {
  @IsString()
  workspaceId: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

/**
 * Summarize Text DTO
 * Request body for text summarization
 */
export class SummarizeTextDto {
  @IsString()
  workspaceId: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  maxLength?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Suggest Improvements DTO
 * Request body for generating suggestions
 */
export class SuggestImprovementsDto {
  @IsString()
  workspaceId: string;

  @IsObject()
  task: {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    [key: string]: any;
  };

  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Estimate Cost DTO
 * Request body for cost estimation
 */
export class EstimateCostDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

/**
 * Batch Classify DTO
 * Request body for bulk classification
 */
export class BatchClassifyDto {
  @IsString()
  workspaceId: string;

  tasks: Array<{
    id: string;
    text: string;
  }>;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
