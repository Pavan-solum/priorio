import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassifierService } from '../services';
import { TrainClassifierDto, ClassifyTextDto, BatchClassifyDto } from '../dto';

@ApiTags('Classification - Classifier')
@ApiBearerAuth()
@Controller('integrations/classification/classifiers')
export class ClassifierController {
  constructor(private classifierService: ClassifierService) {}

  /**
   * Train a new classifier
   */
  @Post(':taxonomyId/train')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Train new classifier' })
  async trainClassifier(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Body() dto: TrainClassifierDto,
  ) {
    return this.classifierService.trainClassifier(
      taxonomyId,
      req.workspace.id,
      dto,
    );
  }

  /**
   * Activate classifier
   */
  @Post(':taxonomyId/classifiers/:classifierId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate classifier' })
  async activateClassifier(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Param('classifierId') classifierId: string,
  ) {
    return this.classifierService.activateClassifier(
      classifierId,
      taxonomyId,
      req.workspace.id,
    );
  }

  /**
   * Classify text
   */
  @Post(':taxonomyId/classify')
  @ApiOperation({ summary: 'Classify text using active classifier' })
  async classifyText(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Body() dto: ClassifyTextDto,
  ) {
    return this.classifierService.classifyText(
      taxonomyId,
      req.workspace.id,
      dto,
    );
  }

  /**
   * Batch classify
   */
  @Post(':taxonomyId/batch-classify')
  @ApiOperation({ summary: 'Batch classify multiple texts' })
  async batchClassify(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Body() dto: BatchClassifyDto,
  ) {
    return this.classifierService.batchClassify(
      taxonomyId,
      req.workspace.id,
      dto,
    );
  }

  /**
   * List classifiers
   */
  @Get(':taxonomyId/list')
  @ApiOperation({ summary: 'List classifiers for taxonomy' })
  async listClassifiers(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
  ) {
    return this.classifierService.listClassifiers(taxonomyId, req.workspace.id);
  }
}
