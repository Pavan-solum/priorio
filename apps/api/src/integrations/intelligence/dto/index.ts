import { IsString, IsOptional, IsArray, IsNumber, IsDate, IsUUID, IsEnum } from 'class-validator';

// Daily Planner DTOs
export class DailyPlanDTO {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsDate()
  planDate: Date;

  @IsArray()
  taskIds: string[];

  @IsOptional()
  timeBlocks: any[];

  @IsOptional()
  breaks: any[];

  @IsOptional()
  metrics: any;
}

export class CreateDailyPlanDTO {
  @IsUUID()
  userId: string;

  @IsDate()
  planDate: Date;

  @IsArray()
  taskIds: string[];
}

export class UpdateDailyPlanDTO {
  @IsOptional()
  @IsArray()
  taskIds?: string[];

  @IsOptional()
  timeBlocks?: any[];

  @IsOptional()
  breaks?: any[];
}

// Follow-up DTOs
export class FollowUpDTO {
  @IsUUID()
  id: string;

  @IsUUID()
  sourceMessageId: string;

  @IsDate()
  @IsOptional()
  expectedResponseAt?: Date;

  @IsString()
  status: string;
}

export class CreateFollowUpDTO {
  @IsUUID()
  sourceMessageId: string;

  @IsDate()
  dueDate: Date;
}

export class UpdateFollowUpDTO {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDate()
  expectedResponseAt?: Date;
}

// Assistant Message DTOs
export class AssistantMessageDTO {
  @IsUUID()
  id: string;

  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  sources?: any[];

  @IsDate()
  createdAt: Date;
}

export class ChatQueryDTO {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  context?: any;
}

export class ChatResponseDTO {
  @IsUUID()
  id: string;

  @IsUUID()
  conversationId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  sources?: any[];

  @IsOptional()
  metadata?: any;
}

// Knowledge DTOs
export class KnowledgeDTO {
  @IsUUID()
  id: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  category: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateKnowledgeDTO {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateKnowledgeDTO {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class SearchKnowledgeDTO {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}

// Retention Policy DTOs
export class RetentionPolicyDTO {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  dataType: string;

  @IsNumber()
  retentionDays: number;

  @IsOptional()
  archiveOldData?: boolean;

  @IsOptional()
  autoExecute?: boolean;

  @IsOptional()
  isActive?: boolean;
}

export class CreateRetentionPolicyDTO {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  dataType: string;

  @IsNumber()
  retentionDays: number;

  @IsOptional()
  archiveOldData?: boolean;

  @IsOptional()
  autoExecute?: boolean;

  @IsOptional()
  isActive?: boolean;
}

export class UpdateRetentionPolicyDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  retentionDays?: number;

  @IsOptional()
  archiveOldData?: boolean;

  @IsOptional()
  autoExecute?: boolean;

  @IsOptional()
  isActive?: boolean;
}
