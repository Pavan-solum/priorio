import { IsString, IsNotEmpty } from 'class-validator';

export class TriggerGmailSyncDto {
  @IsNotEmpty()
  @IsString()
  connectionId: string;
}

export class GmailSyncStatusResponseDto {
  syncId: string;
  status: 'in_progress' | 'completed' | 'failed';
  processedCount: number;
  tasksCreatedCount: number;
  startedAt: Date;
  completedAt?: Date;
}

export class GmailSyncHistoryDto {
  id: string;
  historyId: string;
  lastSyncAt: Date;
  totalEmails: number;
  tasksCreated: number;
  lastError?: string;
}
