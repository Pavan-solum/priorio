import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * Train Classifier DTO
 * Request body for training a classifier
 */
export class TrainClassifierDto {
  @IsNumber()
  trainingDatasetVersion: number;

  @IsOptional()
  @IsString()
  modelType?: string; // "prompt", "fine-tuned", "ensemble"
}

/**
 * Classify Text DTO
 * Request body for classifying text
 */
export class ClassifyTextDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsNumber()
  topK?: number; // Return top K predictions
}

/**
 * Batch Classify DTO
 * Request body for batch classification
 */
export class BatchClassifyDto {
  texts: Array<{
    id: string;
    text: string;
  }>;

  @IsOptional()
  @IsNumber()
  topK?: number;
}

/**
 * Classifier Response DTO
 */
export class ClassifierResponseDto {
  id: string;
  taxonomyId: string;
  trainingDatasetId: string;
  version: number;
  modelType: string;
  isActive: boolean;
  accuracy?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Classification Result DTO
 */
export class ClassificationResultDto {
  category: string;
  confidence: number;
  alternatives?: Array<{
    category: string;
    confidence: number;
  }>;
}

/**
 * Batch Classification Result DTO
 */
export class BatchClassificationResultDto {
  results: Array<{
    id: string;
    classification: ClassificationResultDto;
  }>;
}
