import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { ClassificationModule } from './classification/classification.module';

/**
 * AI Module
 * Integrates AI capabilities into Priorio
 * Supports multiple AI providers (OpenAI, Anthropic)
 * Features: classification, summarization, entity extraction, suggestions
 * Phase 4.3: Classification Service with custom taxonomies
 */
@Module({
  imports: [
    ConfigModule,
    AuditLogsModule,
    ClassificationModule,
  ],
  providers: [AIService, OpenAIProvider, AnthropicProvider],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}
