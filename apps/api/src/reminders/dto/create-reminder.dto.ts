import { IsString, IsOptional, IsISO8601 } from 'class-validator'

export class CreateReminderDto {
  @IsString()
  title: string

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  recurrence?: string
}
