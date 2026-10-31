import { IsString, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';

/**
 * Create Training Example DTO
 * Request body for adding training examples
 */
export class CreateTrainingExampleDto {
  @IsString()
  text: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

/**
 * Create Training Dataset DTO
 * Request body for creating a new training dataset
 */
export class CreateTrainingDatasetDto {
  @IsString()
  description?: string;

  @IsArray()
  examples: CreateTrainingExampleDto[];
}

/**
 * Bulk Add Training Examples DTO
 */
export class BulkAddExamplesDto {
  @IsArray()
  examples: CreateTrainingExampleDto[];
}

/**
 * Training Example Response DTO
 */
export class TrainingExampleResponseDto {
  id: string;
  datasetId: string;
  text: string;
  category: string;
  confidence: number;
  createdAt: Date;
}

/**
 * Training Dataset Response DTO
 */
export class TrainingDatasetResponseDto {
  id: string;
  taxonomyId: string;
  version: number;
  description?: string;
  size: number;
  examples: TrainingExampleResponseDto[];
  createdAt: Date;
}

/**
 * Training Dataset Summary DTO
 */
export class TrainingDatasetSummaryDto {
  id: string;
  taxonomyId: string;
  version: number;
  description?: string;
  size: number;
  createdAt: Date;
}
