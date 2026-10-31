import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { PromptOptimizerService } from './prompt-optimizer.service';
import { PromptController } from './prompt.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [PromptController],
  providers: [PromptService, PromptOptimizerService, PrismaService],
  exports: [PromptService, PromptOptimizerService],
})
export class PromptsModule {}
