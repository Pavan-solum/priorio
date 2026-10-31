import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassificationAnalyticsService } from '../services';
import { AnalyticsQueryDto } from '../dto';

@ApiTags('Classification - Analytics')
@ApiBearerAuth()
@Controller('integrations/classification/analytics')
export class ClassificationAnalyticsController {
  constructor(private analyticsService: ClassificationAnalyticsService) {}

  /**
   * Get metrics for taxonomy
   */
  @Get(':taxonomyId/metrics')
  @ApiOperation({ summary: 'Get classification metrics' })
  async getMetrics(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Query() query?: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getMetrics(taxonomyId, req.workspace.id, query);
  }

  /**
   * Get analytics summary
   */
  @Get(':taxonomyId/summary')
  @ApiOperation({ summary: 'Get analytics summary' })
  async getAnalyticsSummary(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
  ) {
    return this.analyticsService.getAnalyticsSummary(taxonomyId, req.workspace.id);
  }

  /**
   * Compare classifiers
   */
  @Get(':taxonomyId/compare')
  @ApiOperation({ summary: 'Compare classifiers' })
  async compareClassifiers(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
  ) {
    return this.analyticsService.compareClassifiers(taxonomyId, req.workspace.id);
  }
}
