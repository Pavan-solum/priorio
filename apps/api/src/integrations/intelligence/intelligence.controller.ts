import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DailyPlannerService } from './services/daily-planner.service';
import { FollowUpService } from './services/follow-up.service';
import { CitedAssistantService } from './services/cited-assistant.service';
import { DocumentRetrieverService } from './services/document-retriever.service';
import { KnowledgeService } from './services/knowledge.service';
import { EmbeddingService } from './services/embedding.service';
import { RetentionService } from './services/retention.service';
import { AssistantMemoryService } from './services/assistant-memory.service';
import {
  CreateDailyPlanDTO,
  UpdateDailyPlanDTO,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  ChatQueryDTO,
  CreateKnowledgeDTO,
  UpdateKnowledgeDTO,
  SearchKnowledgeDTO,
  CreateRetentionPolicyDTO,
  UpdateRetentionPolicyDTO,
} from './dto';

/**
 * IntelligenceController
 * REST API for Phase 6 Intelligence features
 */
@Controller('intelligence')
@UseGuards(AuthGuard('jwt'))
export class IntelligenceController {
  constructor(
    private dailyPlannerService: DailyPlannerService,
    private followUpService: FollowUpService,
    private assistantService: CitedAssistantService,
    private documentRetriever: DocumentRetrieverService,
    private knowledgeService: KnowledgeService,
    private embeddingService: EmbeddingService,
    private retentionService: RetentionService,
    private memoryService: AssistantMemoryService,
  ) {}

  // ===== DAILY PLANNER ENDPOINTS =====

  /**
   * GET /intelligence/plans - Get all daily plans
   */
  @Get('plans')
  async getPlans(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: number = 30,
  ) {
    const userId = req.user.id;
    const workspaceId = req.user.workspaceId;

    if (startDate && endDate) {
      return this.dailyPlannerService.getDailyPlansRange(
        userId,
        new Date(startDate),
        new Date(endDate),
      );
    }

    // Return last 30 days by default
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - limit);

    return this.dailyPlannerService.getDailyPlansRange(userId, start, end);
  }

  /**
   * POST /intelligence/plans - Generate new daily plan
   */
  @Post('plans')
  @HttpCode(201)
  async createPlan(@Request() req, @Body() body: CreateDailyPlanDTO) {
    const workspaceId = req.user.workspaceId;
    return this.dailyPlannerService.generateDailyPlan(
      body.userId,
      body.planDate,
      workspaceId,
    );
  }

  /**
   * GET /intelligence/plans/:id - Get specific daily plan
   */
  @Get('plans/:id')
  async getPlan(@Request() req, @Param('id') planId: string) {
    return this.dailyPlannerService.getDailyPlan(req.user.id, new Date());
  }

  /**
   * PUT /intelligence/plans/:id - Update daily plan
   */
  @Put('plans/:id')
  async updatePlan(
    @Request() req,
    @Param('id') planId: string,
    @Body() body: UpdateDailyPlanDTO,
  ) {
    return this.dailyPlannerService.updateDailyPlan(planId, body);
  }

  /**
   * DELETE /intelligence/plans/:id - Delete daily plan
   */
  @Delete('plans/:id')
  async deletePlan(@Request() req, @Param('id') planId: string) {
    return this.dailyPlannerService.deleteDailyPlan(planId);
  }

  /**
   * POST /intelligence/plans/:id/execute - Mark plan as executed
   */
  @Post('plans/:id/execute')
  async executePlan(@Request() req, @Param('id') planId: string) {
    return this.dailyPlannerService.executeDailyPlan(planId);
  }

  // ===== FOLLOW-UP ENDPOINTS =====

  /**
   * GET /intelligence/followups - Get all follow-ups
   */
  @Get('followups')
  async getFollowUps(
    @Request() req,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.followUpService.getFollowUps(workspaceId, limit, offset);
  }

  /**
   * POST /intelligence/followups - Create follow-up
   */
  @Post('followups')
  @HttpCode(201)
  async createFollowUp(@Request() req, @Body() body: CreateFollowUpDTO) {
    const workspaceId = req.user.workspaceId;
    return this.followUpService.createFollowUp(
      body.sourceMessageId,
      body.dueDate,
      workspaceId,
    );
  }

  /**
   * PUT /intelligence/followups/:id - Update follow-up
   */
  @Put('followups/:id')
  async updateFollowUp(
    @Request() req,
    @Param('id') followUpId: string,
    @Body() body: UpdateFollowUpDTO,
  ) {
    return this.followUpService.updateFollowUp(followUpId, body);
  }

  /**
   * GET /intelligence/followups/stats - Get follow-up statistics
   */
  @Get('followups/stats')
  async getFollowUpStats(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.followUpService.getFollowUpStats(workspaceId);
  }

  /**
   * POST /intelligence/followups/:id/complete - Mark follow-up complete
   */
  @Post('followups/:id/complete')
  async completeFollowUp(@Request() req, @Param('id') followUpId: string) {
    return this.followUpService.completeFollowUp(followUpId);
  }

  /**
   * DELETE /intelligence/followups/:id - Delete follow-up
   */
  @Delete('followups/:id')
  async deleteFollowUp(@Request() req, @Param('id') followUpId: string) {
    return this.followUpService.deleteFollowUp(followUpId);
  }

  /**
   * GET /intelligence/followups/overdue - Get overdue follow-ups
   */
  @Get('followups/overdue')
  async getOverdueFollowUps(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.followUpService.getOverdueFollowUps(workspaceId);
  }

  // ===== ASSISTANT / CHAT ENDPOINTS =====

  /**
   * POST /intelligence/assistant/chat - Send chat message
   */
  @Post('assistant/chat')
  @HttpCode(201)
  async chat(@Request() req, @Body() body: ChatQueryDTO) {
    const userId = req.user.id;
    const workspaceId = req.user.workspaceId;

    // Store user message first if conversation exists
    if (body.conversationId) {
      await this.assistantService.storeUserMessage(body.conversationId, body.query);
    }

    return this.assistantService.generateResponse({
      query: body.query,
      context: body.context,
      conversationId: body.conversationId,
      userId,
      workspaceId,
    });
  }

  /**
   * GET /intelligence/assistant/history/:conversationId - Get conversation history
   */
  @Get('assistant/history/:conversationId')
  async getConversationHistory(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.assistantService.getConversationHistory(conversationId, limit);
  }

  /**
   * GET /intelligence/assistant/conversations - Get user conversations
   */
  @Get('assistant/conversations')
  async getConversations(@Request() req, @Query('limit') limit: number = 20) {
    const userId = req.user.id;
    return this.memoryService.getConversationTimeline(userId, limit);
  }

  /**
   * DELETE /intelligence/assistant/:conversationId - Delete conversation
   */
  @Delete('assistant/:conversationId')
  async deleteConversation(@Request() req, @Param('conversationId') conversationId: string) {
    return this.assistantService.deleteConversation(conversationId);
  }

  // ===== KNOWLEDGE BASE ENDPOINTS =====

  /**
   * GET /intelligence/knowledge - Get all knowledge entries
   */
  @Get('knowledge')
  async getKnowledge(
    @Request() req,
    @Query('category') category?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.getAllKnowledge(workspaceId, category, limit, offset);
  }

  /**
   * POST /intelligence/knowledge - Create knowledge entry
   */
  @Post('knowledge')
  @HttpCode(201)
  async createKnowledge(@Request() req, @Body() body: CreateKnowledgeDTO) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.createKnowledgeEntry(
      body.title,
      body.content,
      body.category,
      workspaceId,
      body.source,
    );
  }

  /**
   * GET /intelligence/knowledge/search - Search knowledge
   */
  @Get('knowledge/search')
  async searchKnowledge(
    @Request() req,
    @Query() query: SearchKnowledgeDTO,
  ) {
    const workspaceId = req.user.workspaceId;

    if (query.category) {
      return this.knowledgeService.getByCategory(workspaceId, query.category);
    }

    if (query.tag) {
      return this.knowledgeService.getByTag(workspaceId, query.tag);
    }

    return this.knowledgeService.searchKnowledge(
      query.query,
      workspaceId,
      query.limit || 10,
    );
  }

  /**
   * GET /intelligence/knowledge/:id - Get knowledge by ID
   */
  @Get('knowledge/:id')
  async getKnowledgeById(@Request() req, @Param('id') knowledgeId: string) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.getKnowledgeById(knowledgeId, workspaceId);
  }

  /**
   * PUT /intelligence/knowledge/:id - Update knowledge
   */
  @Put('knowledge/:id')
  async updateKnowledge(
    @Request() req,
    @Param('id') knowledgeId: string,
    @Body() body: UpdateKnowledgeDTO,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.updateEntry(knowledgeId, body.content, workspaceId);
  }

  /**
   * DELETE /intelligence/knowledge/:id - Delete knowledge
   */
  @Delete('knowledge/:id')
  async deleteKnowledge(@Request() req, @Param('id') knowledgeId: string) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.deleteEntry(knowledgeId, workspaceId);
  }

  /**
   * POST /intelligence/knowledge/:id/tags - Add tags to knowledge
   */
  @Post('knowledge/:id/tags')
  async addTags(
    @Request() req,
    @Param('id') knowledgeId: string,
    @Body() body: { tags: string[] },
  ) {
    const workspaceId = req.user.workspaceId;

    if (!body.tags || !Array.isArray(body.tags)) {
      throw new BadRequestException('Tags must be an array');
    }

    return this.knowledgeService.tagEntry(knowledgeId, body.tags, workspaceId);
  }

  /**
   * GET /intelligence/knowledge/categories - Get all categories
   */
  @Get('knowledge/categories')
  async getCategories(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.getCategories(workspaceId);
  }

  /**
   * GET /intelligence/knowledge/tags - Get all tags
   */
  @Get('knowledge/tags')
  async getTags(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.knowledgeService.getTags(workspaceId);
  }

  // ===== SEMANTIC SEARCH ENDPOINTS =====

  /**
   * POST /intelligence/search/semantic - Semantic search
   */
  @Post('search/semantic')
  async semanticSearch(
    @Request() req,
    @Body() body: { query: string; limit?: number; threshold?: number },
  ) {
    const workspaceId = req.user.workspaceId;

    if (!body.query) {
      throw new BadRequestException('Query is required');
    }

    return this.documentRetriever.semanticSearch(
      body.query,
      body.limit || 10,
      workspaceId,
    );
  }

  /**
   * GET /intelligence/search/popular - Get popular documents
   */
  @Get('search/popular')
  async getPopularDocuments(
    @Request() req,
    @Query('limit') limit: number = 10,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.documentRetriever.getPopularDocuments(workspaceId, limit);
  }

  /**
   * GET /intelligence/search/recent - Get recent documents
   */
  @Get('search/recent')
  async getRecentDocuments(
    @Request() req,
    @Query('limit') limit: number = 10,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.documentRetriever.getRecentDocuments(workspaceId, limit);
  }

  // ===== RETENTION POLICY ENDPOINTS =====

  /**
   * GET /intelligence/retention/policies - Get retention policies
   */
  @Get('retention/policies')
  async getRetentionPolicies(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.retentionService.getPolicies(workspaceId);
  }

  /**
   * POST /intelligence/retention/policies - Create retention policy
   */
  @Post('retention/policies')
  @HttpCode(201)
  async createRetentionPolicy(
    @Request() req,
    @Body() body: CreateRetentionPolicyDTO,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.retentionService.createPolicy({
      ...body,
      workspaceId,
    });
  }

  /**
   * PUT /intelligence/retention/policies/:id - Update retention policy
   */
  @Put('retention/policies/:id')
  async updateRetentionPolicy(
    @Request() req,
    @Param('id') policyId: string,
    @Body() body: UpdateRetentionPolicyDTO,
  ) {
    return this.retentionService.updatePolicy(policyId, body);
  }

  /**
   * DELETE /intelligence/retention/policies/:id - Delete retention policy
   */
  @Delete('retention/policies/:id')
  async deleteRetentionPolicy(@Request() req, @Param('id') policyId: string) {
    return this.retentionService.deletePolicy(policyId);
  }

  /**
   * POST /intelligence/retention/execute/:id - Execute retention policy
   */
  @Post('retention/execute/:id')
  async executeRetentionPolicy(@Request() req, @Param('id') policyId: string) {
    return this.retentionService.applyRetentionPolicy(policyId);
  }

  /**
   * GET /intelligence/retention/report - Get retention report
   */
  @Get('retention/report')
  async getRetentionReport(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.retentionService.generateRetentionReport(workspaceId);
  }

  // ===== MEMORY & STATS ENDPOINTS =====

  /**
   * GET /intelligence/memory/stats - Get memory statistics
   */
  @Get('memory/stats')
  async getMemoryStats(@Request() req) {
    const userId = req.user.id;
    return this.memoryService.getMemoryStats(userId);
  }

  /**
   * GET /intelligence/memory/timeline - Get conversation timeline
   */
  @Get('memory/timeline')
  async getMemoryTimeline(
    @Request() req,
    @Query('limit') limit: number = 30,
  ) {
    const userId = req.user.id;
    return this.memoryService.getConversationTimeline(userId, limit);
  }

  /**
   * POST /intelligence/memory/search - Search memories
   */
  @Post('memory/search')
  async searchMemories(
    @Request() req,
    @Body() body: { query: string },
  ) {
    const userId = req.user.id;

    if (!body.query) {
      throw new BadRequestException('Search query is required');
    }

    return this.memoryService.searchMemories(userId, body.query);
  }

  /**
   * GET /intelligence/assistant/quality - Get response quality metrics
   */
  @Get('assistant/quality')
  async getQualityMetrics(@Request() req) {
    return this.assistantService.improveResponseQuality();
  }

  /**
   * GET /intelligence/embeddings/stats - Get embedding statistics
   */
  @Get('embeddings/stats')
  async getEmbeddingStats(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.embeddingService.getEmbeddingStats(workspaceId);
  }
}
