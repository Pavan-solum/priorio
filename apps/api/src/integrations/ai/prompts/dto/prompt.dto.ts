import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';

// Enums
export enum PromptOperation {
  CLASSIFY = 'classify',
  SUMMARIZE = 'summarize',
  EXTRACT = 'extract',
  SUGGEST = 'suggest',
}

export enum ABTestStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  WINNER_SELECTED = 'winner_selected',
}

export enum ABTestWinner {
  CONTROL = 'control',
  TREATMENT = 'treatment',
}

// Create Prompt Template DTO
export class CreatePromptTemplateDto {
  @IsString()
  name: string;

  @IsEnum(PromptOperation)
  operation: PromptOperation;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  variables: string[] = [];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];
}

// Update Prompt Template DTO
export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Create Prompt Version DTO
export class CreatePromptVersionDto {
  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  changelog?: string;

  @IsOptional()
  @IsString()
  author?: string;
}

// Activate Version DTO
export class ActivateVersionDto {
  @IsString()
  versionId: string;
}

// Start A/B Test DTO
export class StartABTestDto {
  @IsString()
  controlVersionId: string;

  @IsString()
  treatmentVersionId: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  sampleSize?: number;
}

// Record Metric DTO
export class RecordPromptMetricDto {
  @IsEnum(PromptOperation)
  operation: PromptOperation;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy?: number;

  @IsNumber()
  @Min(0)
  latencyMs: number;

  @IsNumber()
  @Min(0)
  tokenCount: number;

  @IsNumber()
  @Min(0)
  costUsd: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  userRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  relevance?: number;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

// Select Winner DTO
export class SelectWinnerDto {
  @IsEnum(ABTestWinner)
  winner: ABTestWinner;
}

// Response DTOs
export class PromptTemplateResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  operation: string;
  description?: string;
  category?: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PromptVersionResponseDto {
  id: string;
  templateId: string;
  version: number;
  content: string;
  variables: string[];
  isActive: boolean;
  description?: string;
  changelog?: string;
  author?: string;
  createdAt: Date;
}

export class ABTestResponseDto {
  id: string;
  templateId: string;
  controlVersionId: string;
  treatmentVersionId: string;
  status: string;
  winner?: string;
  sampleSize?: number;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PromptMetricResponseDto {
  id: string;
  templateId: string;
  versionId: string;
  operation: string;
  success: boolean;
  accuracy?: number;
  latencyMs: number;
  tokenCount: number;
  costUsd: number;
  userRating?: number;
  relevance?: number;
  taskId?: string;
  userId?: string;
  recordedAt: Date;
}

// Analytics Response DTOs
export class VersionComparisonDto {
  versionId: string;
  version: number;
  totalExecutions: number;
  successRate: number;
  averageLatencyMs: number;
  averageCostUsd: number;
  averageAccuracy?: number;
  averageRelevance?: number;
}

export class EffectivenessScoreDto {
  templateId: string;
  templateName: string;
  operation: string;
  overallScore: number; // 0-100
  successRate: number;
  averageLatencyMs: number;
  averageCostUsd: number;
  totalExecutions: number;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export class ABTestResultsDto {
  testId: string;
  templateId: string;
  status: string;
  controlVersion: {
    versionId: string;
    version: number;
    samples: number;
    successRate: number;
    averageLatencyMs: number;
    averageCostUsd: number;
  };
  treatmentVersion: {
    versionId: string;
    version: number;
    samples: number;
    successRate: number;
    averageLatencyMs: number;
    averageCostUsd: number;
  };
  statisticalSignificance: number; // 0-1
  recommendedWinner: 'control' | 'treatment' | 'inconclusive';
  winner?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RecommendationDto {
  type: 'increase_specificity' | 'reduce_length' | 'add_examples' | 'improve_clarity' | 'optimize_for_cost';
  description: string;
  potentialImpact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  actionableSteps: string[];
}

export class PromptOptimizationRecommendationsDto {
  templateId: string;
  templateName: string;
  operation: string;
  recommendations: RecommendationDto[];
  overallHealthScore: number; // 0-100
}
