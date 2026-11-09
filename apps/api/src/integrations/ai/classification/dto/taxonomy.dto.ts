import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/**
 * Create Taxonomy DTO
 * Request body for creating a new taxonomy
 */
export class CreateTaxonomyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Update Taxonomy DTO
 * Request body for updating a taxonomy
 */
export class UpdateTaxonomyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Create Category DTO
 * Request body for creating a classification category
 */
export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  rules?: string[];

  @IsOptional()
  @IsArray()
  exampleKeywords?: string[];
}

/**
 * Update Category DTO
 * Request body for updating a category
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  rules?: string[];

  @IsOptional()
  @IsArray()
  exampleKeywords?: string[];
}

/**
 * List Taxonomies Response DTO
 */
export class TaxonomyResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isActive: boolean;
  categoryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Taxonomy Detail Response DTO
 */
export class TaxonomyDetailDto {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isActive: boolean;
  categories: CategoryResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category Response DTO
 */
export class CategoryResponseDto {
  id: string;
  taxonomyId: string;
  name: string;
  description?: string;
  rules: string[];
  exampleKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}
