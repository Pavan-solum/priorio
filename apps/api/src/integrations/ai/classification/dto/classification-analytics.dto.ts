import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * Classification Analytics Query DTO
 */
export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  classifierId?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;
}

/**
 * Metric Response DTO
 */
export class MetricResponseDto {
  id: string;
  taxonomyId: string;
  categoryId: string;
  classifierId?: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  recordedAt: Date;
}

/**
 * Analytics Summary DTO
 */
export class AnalyticsSummaryDto {
  totalSamples: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  categoryMetrics: Array<{
    category: string;
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
  }>;
  confusionMatrix: Record<string, Record<string, number>>;
  recordedAt: Date;
}

/**
 * Classifier Comparison DTO
 */
export class ClassifierComparisonDto {
  classifiers: Array<{
    classifierId: string;
    version: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  }>;
  recommendation: string;
}
