import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for Outlook email
 */
export class OutlookEmailDto {
  @IsNotEmpty()
  @IsString()
  emailId: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  bodyPreview?: string;

  @IsNotEmpty()
  @IsEmail()
  from: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  to?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsNotEmpty()
  @IsDateString()
  receivedDateTime: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

/**
 * DTO for creating task from email
 */
export class CreateTaskFromEmailDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsString()
  emailId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

/**
 * DTO for connecting Outlook account
 */
export class ConnectOutlookAccountDto {
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
}

/**
 * DTO for Outlook email sync
 */
export class OutlookEmailSyncDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}

/**
 * DTO for Outlook calendar sync
 */
export class OutlookCalendarSyncDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}
