import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';

/**
 * DTO for generic provider event
 */
export class ProviderEventDto {
  @IsNotEmpty()
  @IsString()
  externalEventId: string;

  @IsNotEmpty()
  @IsEnum([
    'email',
    'chat-message',
    'meeting',
    'reminder',
    'task-update',
    'notification',
  ])
  type:
    | 'email'
    | 'chat-message'
    | 'meeting'
    | 'reminder'
    | 'task-update'
    | 'notification';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  organizer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for provider event sync
 */
export class ProviderEventSyncDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsNotEmpty()
  @IsArray()
  events: ProviderEventDto[];

  @IsOptional()
  @IsString()
  syncToken?: string;
}

/**
 * DTO for webhook payload
 */
export class WebhookPayloadDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsNotEmpty()
  @IsString()
  eventType: string;

  @IsNotEmpty()
  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

/**
 * DTO for webhook registration
 */
export class WebhookRegistrationDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsNotEmpty()
  @IsString()
  webhookUrl: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  eventTypes: string[];

  @IsNotEmpty()
  @IsString()
  accessToken: string;
}

/**
 * DTO for webhook renewal
 */
export class WebhookRenewalDto {
  @IsNotEmpty()
  @IsString()
  subscriptionId: string;

  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsNotEmpty()
  @IsString()
  accessToken: string;
}
