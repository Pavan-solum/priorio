# Phase 4: AI Engine - Development Plan

**Date:** October 31, 2026  
**Status:** 🚀 **IN PROGRESS**  
**Phase:** 4 (AI Engine)  
**Focus:** Provider abstraction, versioned prompts, structured schemas, and evaluation

---

## 📋 Phase Overview

Phase 4 introduces AI-powered intelligence to Priorio. The AI engine will:
- Classify and categorize tasks automatically
- Summarize long task descriptions
- Extract dates and entities from text
- Suggest task improvements
- Support multiple AI providers (OpenAI, Anthropic, etc.)

**Roadmap Structure:**
- Phase 4.1: Provider Abstraction & Service Architecture
- Phase 4.2: Prompt Management & Versioning
- Phase 4.3: Classification & Summarization Services
- Phase 4.4: Testing & Evaluation Framework

---

## 🎯 Phase 4.1: Provider Abstraction & Service Architecture

### Deliverables
1. **AI Provider Interface** - Abstract contract for AI providers
2. **OpenAI Provider Implementation** - Chat completions with GPT-4
3. **Anthropic Provider Implementation** - Claude API integration
4. **AI Service** - Core orchestration layer
5. **Configuration & Secrets Management**

### Files to Create

#### 1. Provider Interface
**File:** `apps/api/src/integrations/ai/providers/ai-provider.interface.ts`
```typescript
export interface AIProvider {
  name: string;
  model: string;
  
  // Core methods
  classifyTask(text: string, context?: object): Promise<Classification>;
  summarizeText(text: string, maxLength?: number): Promise<string>;
  extractEntities(text: string): Promise<Entity[]>;
  generateSuggestions(task: Task): Promise<Suggestion[]>;
  
  // Health check
  validateConnection(): Promise<boolean>;
  
  // Cost tracking
  estimateCost(prompt: string, model: string): Promise<number>;
}

export interface Classification {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  confidence: number;
}

export interface Entity {
  type: 'date' | 'person' | 'location' | 'organization' | 'custom';
  value: string;
  confidence: number;
}

export interface Suggestion {
  type: 'improve' | 'split' | 'category' | 'deadline';
  text: string;
  reason: string;
  actionable: boolean;
}
```

#### 2. OpenAI Provider
**File:** `apps/api/src/integrations/ai/providers/openai.provider.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIProvider, Classification, Entity, Suggestion } from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  model = 'gpt-4';
  private client: OpenAI;
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get('OPENAI_API_KEY');
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  async classifyTask(text: string, context?: object): Promise<Classification> {
    const prompt = `
Analyze this task and provide classification:
"${text}"

Return JSON with:
- category: string (work, personal, health, finance, etc)
- priority: 'low' | 'medium' | 'high' | 'urgent'
- tags: string[]
- confidence: 0-1
    `;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  }

  async summarizeText(text: string, maxLength: number = 100): Promise<string> {
    const prompt = `Summarize this text in ${maxLength} characters or less:
"${text}"

Provide only the summary, no additional text.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    return response.choices[0].message.content;
  }

  async extractEntities(text: string): Promise<Entity[]> {
    const prompt = `Extract entities from this text:
"${text}"

Return JSON array with objects:
- type: 'date' | 'person' | 'location' | 'organization' | 'custom'
- value: string
- confidence: 0-1

Only include high confidence entities (>0.7).`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  }

  async generateSuggestions(task: any): Promise<Suggestion[]> {
    const prompt = `Suggest improvements for this task:
Title: ${task.title}
Description: ${task.description}

Return JSON array with:
- type: 'improve' | 'split' | 'category' | 'deadline'
- text: string
- reason: string
- actionable: boolean

Suggest 2-3 high-value improvements only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.models.retrieve('gpt-4');
      return true;
    } catch (error) {
      return false;
    }
  }

  estimateCost(prompt: string, model: string = this.model): Promise<number> {
    // GPT-4: $0.03 per 1K input tokens, $0.06 per 1K output tokens
    // Rough estimate: 1 token ≈ 4 chars
    const estimatedTokens = prompt.length / 4;
    const estimatedCost = (estimatedTokens / 1000) * 0.03;
    return Promise.resolve(estimatedCost);
  }
}
```

#### 3. Anthropic Provider
**File:** `apps/api/src/integrations/ai/providers/anthropic.provider.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, Classification, Entity, Suggestion } from './ai-provider.interface';

@Injectable()
export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  model = 'claude-3-sonnet-20240229';
  private client: Anthropic;
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get('ANTHROPIC_API_KEY');
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  async classifyTask(text: string, context?: object): Promise<Classification> {
    const prompt = `Analyze this task and provide classification:
"${text}"

Return JSON with:
- category: string (work, personal, health, finance, etc)
- priority: 'low' | 'medium' | 'high' | 'urgent'
- tags: string[]
- confidence: 0-1`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = (response.content[0] as any).text;
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  }

  async summarizeText(text: string, maxLength: number = 100): Promise<string> {
    const prompt = `Summarize this text in ${maxLength} characters or less:
"${text}"

Provide only the summary, no additional text.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    return (response.content[0] as any).text;
  }

  async extractEntities(text: string): Promise<Entity[]> {
    const prompt = `Extract entities from this text:
"${text}"

Return JSON array with objects:
- type: 'date' | 'person' | 'location' | 'organization' | 'custom'
- value: string
- confidence: 0-1

Only include high confidence entities (>0.7).`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = (response.content[0] as any).text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch[0]);
  }

  async generateSuggestions(task: any): Promise<Suggestion[]> {
    const prompt = `Suggest improvements for this task:
Title: ${task.title}
Description: ${task.description}

Return JSON array with:
- type: 'improve' | 'split' | 'category' | 'deadline'
- text: string
- reason: string
- actionable: boolean

Suggest 2-3 high-value improvements only.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = (response.content[0] as any).text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch[0]);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  estimateCost(prompt: string, model: string = this.model): Promise<number> {
    // Claude 3 Sonnet: $0.003 per 1K input tokens, $0.015 per 1K output tokens
    const estimatedTokens = prompt.length / 4;
    const estimatedCost = (estimatedTokens / 1000) * 0.003;
    return Promise.resolve(estimatedCost);
  }
}
```

#### 4. AI Service
**File:** `apps/api/src/integrations/ai/ai.service.ts`
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AIProvider, Classification, Entity, Suggestion } from './providers/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Injectable()
export class AIService {
  private providers: Map<string, AIProvider> = new Map();

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private openai: OpenAIProvider,
    private anthropic: AnthropicProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    this.providers.set('openai', this.openai);
    this.providers.set('anthropic', this.anthropic);
  }

  async classifyTask(
    workspaceId: string,
    taskId: string,
    text: string,
    provider?: string,
  ): Promise<Classification> {
    const aiProvider = this.getProvider(provider);
    
    try {
      const classification = await aiProvider.classifyTask(text);
      
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_CLASSIFY',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, classification },
        status: 'success',
      });

      return classification;
    } catch (error) {
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_CLASSIFY',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, error: error.message },
        status: 'error',
      });
      throw error;
    }
  }

  async summarizeTask(
    workspaceId: string,
    taskId: string,
    text: string,
    maxLength?: number,
    provider?: string,
  ): Promise<string> {
    const aiProvider = this.getProvider(provider);
    
    try {
      const summary = await aiProvider.summarizeText(text, maxLength);
      
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_SUMMARIZE',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name },
        status: 'success',
      });

      return summary;
    } catch (error) {
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_SUMMARIZE',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, error: error.message },
        status: 'error',
      });
      throw error;
    }
  }

  async extractEntities(
    workspaceId: string,
    taskId: string,
    text: string,
    provider?: string,
  ): Promise<Entity[]> {
    const aiProvider = this.getProvider(provider);
    
    try {
      const entities = await aiProvider.extractEntities(text);
      
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_EXTRACT_ENTITIES',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, count: entities.length },
        status: 'success',
      });

      return entities;
    } catch (error) {
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_EXTRACT_ENTITIES',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, error: error.message },
        status: 'error',
      });
      throw error;
    }
  }

  async suggestImprovements(
    workspaceId: string,
    taskId: string,
    task: any,
    provider?: string,
  ): Promise<Suggestion[]> {
    const aiProvider = this.getProvider(provider);
    
    try {
      const suggestions = await aiProvider.generateSuggestions(task);
      
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_SUGGEST',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, count: suggestions.length },
        status: 'success',
      });

      return suggestions;
    } catch (error) {
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'AI_SUGGEST',
        resourceType: 'task',
        resourceId: taskId,
        details: { provider: aiProvider.name, error: error.message },
        status: 'error',
      });
      throw error;
    }
  }

  async checkProviderHealth(provider?: string): Promise<boolean> {
    const aiProvider = this.getProvider(provider);
    return aiProvider.validateConnection();
  }

  async getProviderCost(prompt: string, provider?: string): Promise<number> {
    const aiProvider = this.getProvider(provider);
    return aiProvider.estimateCost(prompt);
  }

  private getProvider(provider?: string): AIProvider {
    const selectedProvider = provider || this.config.get('AI_PROVIDER', 'openai');
    const aiProvider = this.providers.get(selectedProvider);
    
    if (!aiProvider) {
      throw new BadRequestException(`AI provider '${selectedProvider}' not supported`);
    }
    
    return aiProvider;
  }

  async listAvailableProviders(): Promise<string[]> {
    return Array.from(this.providers.keys());
  }
}
```

#### 5. AI Module
**File:** `apps/api/src/integrations/ai/ai.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  imports: [ConfigModule],
  providers: [AIService, OpenAIProvider, AnthropicProvider],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}
```

#### 6. AI Controller
**File:** `apps/api/src/integrations/ai/ai.controller.ts`
```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { Workspace } from '../../../decorators/workspace.decorator';

@Controller('api/integrations/ai')
export class AIController {
  constructor(private aiService: AIService) {}

  @Post('classify/:taskId')
  @HttpCode(HttpStatus.OK)
  async classifyTask(
    @Workspace() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body('text') text: string,
    @Query('provider') provider?: string,
  ) {
    const classification = await this.aiService.classifyTask(workspaceId, taskId, text, provider);
    
    return {
      success: true,
      data: classification,
      message: 'Task classified successfully',
    };
  }

  @Post('summarize/:taskId')
  @HttpCode(HttpStatus.OK)
  async summarizeTask(
    @Workspace() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body('text') text: string,
    @Body('maxLength') maxLength?: number,
    @Query('provider') provider?: string,
  ) {
    const summary = await this.aiService.summarizeTask(workspaceId, taskId, text, maxLength, provider);
    
    return {
      success: true,
      data: { summary },
      message: 'Task summarized successfully',
    };
  }

  @Post('extract-entities/:taskId')
  @HttpCode(HttpStatus.OK)
  async extractEntities(
    @Workspace() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body('text') text: string,
    @Query('provider') provider?: string,
  ) {
    const entities = await this.aiService.extractEntities(workspaceId, taskId, text, provider);
    
    return {
      success: true,
      data: { entities },
      message: 'Entities extracted successfully',
    };
  }

  @Post('suggest/:taskId')
  @HttpCode(HttpStatus.OK)
  async suggestImprovements(
    @Workspace() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() task: any,
    @Query('provider') provider?: string,
  ) {
    const suggestions = await this.aiService.suggestImprovements(workspaceId, taskId, task, provider);
    
    return {
      success: true,
      data: { suggestions },
      message: 'Suggestions generated successfully',
    };
  }

  @Get('health')
  async checkHealth(@Query('provider') provider?: string) {
    const isHealthy = await this.aiService.checkProviderHealth(provider);
    
    return {
      success: true,
      data: { healthy: isHealthy },
      message: isHealthy ? 'AI provider is healthy' : 'AI provider is unavailable',
    };
  }

  @Get('providers')
  async listProviders() {
    const providers = await this.aiService.listAvailableProviders();
    
    return {
      success: true,
      data: { providers },
      message: 'Available AI providers',
    };
  }

  @Post('estimate-cost')
  @HttpCode(HttpStatus.OK)
  async estimateCost(
    @Body('prompt') prompt: string,
    @Query('provider') provider?: string,
  ) {
    const cost = await this.aiService.getProviderCost(prompt, provider);
    
    return {
      success: true,
      data: { cost },
      message: 'Cost estimated successfully',
    };
  }
}
```

---

### Dependencies to Install

```bash
npm install openai @anthropic-ai/sdk
npm install --save-dev @types/openai
```

### Environment Variables Required

```env
# AI Provider Selection
AI_PROVIDER=openai  # or 'anthropic'

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# AI Costs & Limits
AI_MAX_REQUESTS_PER_MINUTE=60
AI_MAX_TOKENS_PER_REQUEST=2000
AI_COST_LIMIT_PER_DAY=10
```

---

## 🗂️ File Structure

```
apps/api/src/integrations/ai/
├── providers/
│   ├── ai-provider.interface.ts
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   └── index.ts
├── __tests__/
│   ├── ai.service.spec.ts
│   ├── openai.provider.spec.ts
│   └── anthropic.provider.spec.ts
├── ai.service.ts
├── ai.controller.ts
├── ai.module.ts
└── index.ts
```

---

## ✅ Success Criteria for Phase 4.1

- [x] Provider interface defined with all methods
- [ ] OpenAI provider fully implemented
- [ ] Anthropic provider fully implemented
- [ ] AI Service orchestration layer created
- [ ] AI Controller with all endpoints
- [ ] Module integration with main app
- [ ] Environment configuration validated
- [ ] Unit tests (20+ test cases)
- [ ] Integration tests with mock APIs
- [ ] Documentation complete

---

**Status:** Ready to implement  
**Estimated Time:** 2-3 hours  
**Priority:** HIGH - Core AI infrastructure

Next: Create the files and implement Phase 4.1
