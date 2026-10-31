import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrainingDataService } from '../services';
import { CreateTrainingDatasetDto, BulkAddExamplesDto } from '../dto';

@ApiTags('Classification - Training Data')
@ApiBearerAuth()
@Controller('integrations/classification/training-data')
export class TrainingDataController {
  constructor(private trainingDataService: TrainingDataService) {}

  /**
   * Create training dataset
   */
  @Post(':taxonomyId/datasets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new training dataset' })
  async createTrainingDataset(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Body() dto: CreateTrainingDatasetDto,
  ) {
    return this.trainingDataService.createTrainingDataset(
      taxonomyId,
      req.workspace.id,
      dto,
    );
  }

  /**
   * List training datasets
   */
  @Get(':taxonomyId/datasets')
  @ApiOperation({ summary: 'List training datasets for taxonomy' })
  async listTrainingDatasets(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
  ) {
    return this.trainingDataService.listTrainingDatasets(taxonomyId, req.workspace.id);
  }

  /**
   * Get training dataset
   */
  @Get(':taxonomyId/datasets/:datasetId')
  @ApiOperation({ summary: 'Get training dataset by ID' })
  async getTrainingDataset(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Param('datasetId') datasetId: string,
  ) {
    return this.trainingDataService.getTrainingDataset(
      datasetId,
      taxonomyId,
      req.workspace.id,
    );
  }

  /**
   * Add examples to dataset
   */
  @Post(':taxonomyId/datasets/:datasetId/examples')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add training examples to dataset' })
  async addExamples(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Param('datasetId') datasetId: string,
    @Body() dto: BulkAddExamplesDto,
  ) {
    return this.trainingDataService.addExamples(
      datasetId,
      taxonomyId,
      req.workspace.id,
      dto,
    );
  }

  /**
   * Delete training dataset
   */
  @Delete(':taxonomyId/datasets/:datasetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete training dataset' })
  async deleteTrainingDataset(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Param('datasetId') datasetId: string,
  ) {
    return this.trainingDataService.deleteTrainingDataset(
      datasetId,
      taxonomyId,
      req.workspace.id,
    );
  }
}
