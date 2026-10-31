import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';

/**
 * DTO for sync status
 */
export class SyncStatusDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;
}

/**
 * DTO for sync operation
 */
export class QueueSyncOperationDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsUUID()
  deviceId: string;

  @IsNotEmpty()
  @IsString()
  itemType: string;

  @IsNotEmpty()
  @IsUUID()
  itemId: string;

  @IsNotEmpty()
  @IsEnum(['CREATE', 'UPDATE', 'DELETE'])
  operation: 'CREATE' | 'UPDATE' | 'DELETE';

  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsNotEmpty()
  payload: any;
}

/**
 * DTO for executing sync queue
 */
export class ExecuteSyncQueueDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsOptional()
  @IsNumber()
  maxBatchSize?: number;
}

/**
 * DTO for conflict resolution
 */
export class ResolveConflictsDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsOptional()
  @IsEnum(['LAST_WRITE_WINS', 'LOCAL_WINS', 'REMOTE_WINS', 'MANUAL'])
  strategy?: 'LAST_WRITE_WINS' | 'LOCAL_WINS' | 'REMOTE_WINS' | 'MANUAL';
}

/**
 * DTO for sync health check
 */
export class SyncHealthCheckDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;
}

/**
 * DTO for sync report
 */
export class SyncReportDto {
  @IsNotEmpty()
  @IsUUID()
  integrationId: string;

  @IsOptional()
  @IsNumber()
  days?: number;
}

/**
 * DTO for workspace sync status
 */
export class WorkspaceSyncStatusDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}
