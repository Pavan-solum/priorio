import { IsString, IsOptional, IsISO8601, IsEnum } from 'class-validator'

enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export class QueryTasksDto {
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsISO8601()
  dueBefore?: string

  @IsOptional()
  @IsISO8601()
  dueAfter?: string

  @IsOptional()
  @IsString()
  search?: string
}
