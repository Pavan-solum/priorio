import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { PromptService } from './prompt.service';
import { PromptOptimizerService } from './prompt-optimizer.service';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  CreatePromptVersionDto,
  ActivateVersionDto,
  StartABTestDto,
  RecordPromptMetricDto,
  SelectWinnerDto,
  PromptOperation,
} from './dto/prompt.dto';

@Controller('api/integrations/ai/prompts')
export class PromptController {
  private readonly logger = new Logger(PromptController.name);

  constructor(
    private readonly promptService: PromptService,
    private readonly optimizerService: PromptOptimizerService,
  ) {}

  /**
   * Prompt Template Management
   */

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Req() req: any, @Body() dto: CreatePromptTemplateDto) {
    const workspaceId = req.workspaceId; // From middleware/guard
    this.logger.log(`Creating prompt template: ${dto.name}`);
    return this.promptService.createTemplate(workspaceId, dto);
  }

  @Get()
  async listTemplates(
    @Req() req: any,
    @Query('operation') operation?: PromptOperation,
    @Query('isActive') isActive?: boolean,
  ) {
    const workspaceId = req.workspaceId;
    return this.promptService.listTemplates(workspaceId, operation, isActive);
  }

  @Get(':templateId')
  async getTemplate(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    return this.promptService.getTemplate(templateId, workspaceId);
  }

  @Put(':templateId')
  async updateTemplate(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Body() dto: UpdatePromptTemplateDto,
  ) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Updating prompt template: ${templateId}`);
    return this.promptService.updateTemplate(templateId, workspaceId, dto);
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Deleting prompt template: ${templateId}`);
    await this.promptService.deleteTemplate(templateId, workspaceId);
  }

  /**
   * Version Management
   */

  @Post(':templateId/versions')
  @HttpCode(HttpStatus.CREATED)
  async createVersion(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Body() dto: CreatePromptVersionDto,
  ) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Creating new version for template: ${templateId}`);
    return this.promptService.createVersion(templateId, workspaceId, dto);
  }

  @Get(':templateId/versions')
  async listVersions(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    return this.promptService.listVersions(templateId, workspaceId);
  }

  @Get(':templateId/versions/:versionId')
  async getVersion(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
  ) {
    const workspaceId = req.workspaceId;
    return this.promptService.getVersion(versionId, workspaceId);
  }

  @Post(':templateId/versions/:versionId/activate')
  async activateVersion(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
  ) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Activating version ${versionId} for template ${templateId}`);
    return this.promptService.activateVersion(versionId, workspaceId);
  }

  @Post(':templateId/rollback')
  async rollbackVersion(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Rolling back template: ${templateId}`);
    return this.promptService.rollbackVersion(templateId, workspaceId);
  }

  /**
   * Metrics & Recording
   */

  @Post(':templateId/versions/:versionId/metrics')
  @HttpCode(HttpStatus.CREATED)
  async recordMetric(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Body() dto: RecordPromptMetricDto,
  ) {
    const workspaceId = req.workspaceId;
    this.logger.debug(`Recording metric for version: ${versionId}`);
    return this.promptService.recordMetric(versionId, workspaceId, dto);
  }

  @Get(':templateId/metrics')
  async getMetrics(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Query('operation') operation?: string,
    @Query('limit') limit: number = 100,
  ) {
    const workspaceId = req.workspaceId;
    return this.promptService.getMetrics(templateId, workspaceId, operation, limit);
  }

  /**
   * A/B Testing
   */

  @Post(':templateId/ab-tests')
  @HttpCode(HttpStatus.CREATED)
  async startABTest(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Body() dto: StartABTestDto,
  ) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Starting A/B test for template: ${templateId}`);
    return this.optimizerService.startABTest(
      templateId,
      workspaceId,
      dto.controlVersionId,
      dto.treatmentVersionId,
      dto.sampleSize,
    );
  }

  @Get('ab-tests/:testId')
  async getABTest(@Req() req: any, @Param('testId') testId: string) {
    const workspaceId = req.workspaceId;
    return this.optimizerService.getABTest(testId, workspaceId);
  }

  @Get('ab-tests/:testId/results')
  async getABTestResults(@Req() req: any, @Param('testId') testId: string) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Analyzing A/B test: ${testId}`);
    return this.optimizerService.analyzeABTest(testId, workspaceId);
  }

  @Post('ab-tests/:testId/select-winner')
  async selectWinner(
    @Req() req: any,
    @Param('testId') testId: string,
    @Body() dto: SelectWinnerDto,
  ) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Selecting winner for A/B test: ${testId} - ${dto.winner}`);
    return this.optimizerService.selectWinner(testId, workspaceId, dto.winner);
  }

  /**
   * Analytics & Optimization
   */

  @Get(':templateId/effectiveness')
  async getEffectiveness(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    return this.optimizerService.getEffectiveness(templateId, workspaceId);
  }

  @Get(':templateId/comparison')
  async compareVersions(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    return this.optimizerService.compareVersions(templateId, workspaceId);
  }

  @Get(':templateId/recommendations')
  async getRecommendations(@Req() req: any, @Param('templateId') templateId: string) {
    const workspaceId = req.workspaceId;
    this.logger.log(`Getting optimization recommendations for template: ${templateId}`);
    return this.optimizerService.getRecommendations(templateId, workspaceId);
  }
}
