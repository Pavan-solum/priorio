import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';

/**
 * DTO for calendar event
 */
export class CalendarEventDto {
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsEmail()
  organizer?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({ each: true })
  attendees?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

/**
 * DTO for connecting calendar account
 */
export class ConnectCalendarAccountDto {
  @IsNotEmpty()
  @IsEnum(['google', 'microsoft'])
  provider: 'google' | 'microsoft';

  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsNotEmpty()
  @IsString()
  displayName: string;

  @IsNotEmpty()
  @IsEmail()
  externalEmail: string;

  @IsNotEmpty()
  @IsString()
  externalAccountId: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

/**
 * DTO for creating event from task
 */
export class CreateEventFromTaskDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsUUID()
  taskId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsArray()
  @IsEmail({ each: true })
  attendees?: string[];

  @IsOptional()
  @IsString()
  location?: string;
}

/**
 * DTO for fetching availability
 */
export class FetchAvailabilityDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

/**
 * DTO for suggesting optimal time
 */
export class SuggestOptimalTimeDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number; // in minutes

  @IsOptional()
  @IsArray()
  @IsEmail({ each: true })
  attendees?: string[];

  @IsOptional()
  @IsString()
  preferredHours?: string; // format: "9-17"

  @IsOptional()
  excludeWeekends?: boolean;

  @IsOptional()
  @IsDateString()
  rangeStart?: string;

  @IsOptional()
  @IsDateString()
  rangeEnd?: string;
}

/**
 * DTO for calendar sync
 */
export class CalendarSyncDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}
