import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsDateString,
} from 'class-validator';

/**
 * DTO for Teams chat message
 */
export class TeamsChatMessageDto {
  @IsNotEmpty()
  @IsString()
  chatId: string;

  @IsNotEmpty()
  @IsString()
  messageId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsEmail()
  sender: string;

  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

/**
 * DTO for creating task from Teams message
 */
export class CreateTaskFromTeamsMessageDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsString()
  messageId: string;

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
 * DTO for Teams notification
 */
export class TeamsNotificationDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high';
}

/**
 * DTO for Teams sync
 */
export class TeamsSyncDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}

/**
 * DTO for Teams account connection
 */
export class ConnectTeamsAccountDto {
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
