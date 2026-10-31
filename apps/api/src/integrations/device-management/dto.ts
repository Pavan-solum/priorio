export class CreateDeviceDto {
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceName?: string;
  deviceId: string;
  capabilities?: Partial<DeviceCapabilities>;
}

export class UpdateDeviceDto {
  deviceName?: string;
  syncStatus?: string;
  isActive?: boolean;
  lastSyncAt?: string | Date;
  lastActivityAt?: string | Date;
  appVersion?: string;
  osVersion?: string;
  capabilities?: Partial<DeviceCapabilities>;
}

export class DeviceResponseDto {
  id: string;
  deviceId: string;
  userId: string;
  workspaceId: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceName: string;
  syncStatus: string;
  lastSyncAt: Date | null;
  lastActivityAt: Date | null;
  isActive: boolean;
  capabilities: DeviceCapabilities;
  createdAt: Date;
  updatedAt: Date;
}

export class DeviceCapabilities {
  maxStorageBytes: number;
  syncFrequencyMs: number;
  offlineSupport: boolean;
  backgroundSyncSupport: boolean;
  pushNotificationSupport: boolean;
  encryptionSupport: boolean;
  batteryOptimized: boolean;
  customFields: Record<string, unknown>;
}

export class InitiateSyncDto {
  clientTimestamp: number;
  deviceInfo?: Record<string, unknown>;
}

export class SyncStatusResponseDto {
  syncLogId?: string;
  status: string;
  itemsProcessed: number;
  itemsFailed: number;
  conflictsFound: number;
  pendingItems?: number;
  lastSyncAt?: Date | null;
  message: string;
}

export class CreateOfflineTaskDto {
  taskId?: string;
  operation: string;
  taskData: Record<string, unknown>;
}

export class OfflineTaskResponseDto {
  id: string;
  deviceId: string;
  workspaceId: string;
  taskId: string | null;
  operation: string;
  taskData: Record<string, unknown>;
  syncedAt: Date | null;
  syncAttempts: number;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ConflictResolutionDto {
  resolution: Record<string, unknown>;
}

export class SyncConflictResponseDto {
  id: string;
  workspaceId: string;
  itemType: string;
  itemId: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  strategy: string;
  resolution: Record<string, unknown> | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncConflict {
  id: string;
  workspaceId: string;
  itemType: string;
  itemId: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  strategy: string;
}

export interface DeviceSyncLogDto {
  id: string;
  deviceId: string;
  workspaceId: string;
  syncStatus: string;
  itemsProcessed: number;
  itemsFailed: number;
  conflictsFound: number;
  duration: number | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}
