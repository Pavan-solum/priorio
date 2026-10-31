import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntelligenceController } from './intelligence.controller';
import { DailyPlannerService } from './services/daily-planner.service';
import { FollowUpService } from './services/follow-up.service';
import { CitedAssistantService } from './services/cited-assistant.service';
import { DocumentRetrieverService } from './services/document-retriever.service';
import { KnowledgeService } from './services/knowledge.service';
import { EmbeddingService } from './services/embedding.service';
import { RetentionService } from './services/retention.service';
import { AssistantMemoryService } from './services/assistant-memory.service';

/**
 * IntelligenceModule
 * Phase 6 Intelligence Features
 * Includes: Daily Planner, Follow-ups, AI Assistant, Knowledge Base, Memory Management
 */
@Module({
  imports: [PrismaModule],
  controllers: [IntelligenceController],
  providers: [
    DailyPlannerService,
    FollowUpService,
    CitedAssistantService,
    DocumentRetrieverService,
    KnowledgeService,
    EmbeddingService,
    RetentionService,
    AssistantMemoryService,
  ],
  exports: [
    DailyPlannerService,
    FollowUpService,
    CitedAssistantService,
    DocumentRetrieverService,
    KnowledgeService,
    EmbeddingService,
    RetentionService,
    AssistantMemoryService,
  ],
})
export class IntelligenceModule {}
