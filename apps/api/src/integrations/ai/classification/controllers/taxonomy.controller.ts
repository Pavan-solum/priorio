import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxonomyService } from '../services';
import { CreateTaxonomyDto, UpdateTaxonomyDto } from '../dto';

@ApiTags('Classification - Taxonomy')
@ApiBearerAuth()
@Controller('integrations/classification/taxonomies')
export class TaxonomyController {
  constructor(private taxonomyService: TaxonomyService) {}

  /**
   * Create a new taxonomy
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new taxonomy' })
  async createTaxonomy(
    @Req() req: any,
    @Body() dto: CreateTaxonomyDto,
  ) {
    return this.taxonomyService.createTaxonomy(req.workspace.id, dto);
  }

  /**
   * List all taxonomies
   */
  @Get()
  @ApiOperation({ summary: 'List taxonomies for workspace' })
  async listTaxonomies(@Req() req: any) {
    return this.taxonomyService.listTaxonomies(req.workspace.id);
  }

  /**
   * Get taxonomy by ID
   */
  @Get(':taxonomyId')
  @ApiOperation({ summary: 'Get taxonomy by ID' })
  async getTaxonomy(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
  ) {
    return this.taxonomyService.getTaxonomy(taxonomyId, req.workspace.id);
  }

  /**
   * Update taxonomy
   */
  @Put(':taxonomyId')
  @ApiOperation({ summary: 'Update taxonomy' })
  async updateTaxonomy(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
    @Body() dto: UpdateTaxonomyDto,
  ) {
    return this.taxonomyService.updateTaxonomy(taxonomyId, req.workspace.id, dto);
  }

  /**
   * Delete taxonomy
   */
  @Delete(':taxonomyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete taxonomy' })
  async deleteTaxonomy(
    @Req() req: any,
    @Param('taxonomyId') taxonomyId: string,
  ) {
    return this.taxonomyService.deleteTaxonomy(taxonomyId, req.workspace.id);
  }
}
