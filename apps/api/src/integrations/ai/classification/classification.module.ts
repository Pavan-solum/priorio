import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIService } from '../ai.service';
import {
  TaxonomyService,
  TrainingDataService,
  ClassifierService,
  ClassificationAnalyticsService,
} from './services';
import {
  TaxonomyController,
  TrainingDataController,
  ClassifierController,
  ClassificationAnalyticsController,
} from './controllers';

/**
 * Classification Module
 * Provides comprehensive taxonomy-based classification services
 */
@Module({
  imports: [ConfigModule],
  providers: [
    TaxonomyService,
    TrainingDataService,
    ClassifierService,
    ClassificationAnalyticsService,
    PrismaService,
    AIService,
  ],
  controllers: [
    TaxonomyController,
    TrainingDataController,
    ClassifierController,
    ClassificationAnalyticsController,
  ],
  exports: [
    TaxonomyService,
    TrainingDataService,
    ClassifierService,
    ClassificationAnalyticsService,
  ],
})
export class ClassificationModule {}
