import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { SyncService } from './sync.service';
import { OfflineTaskService } from './offline-task.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceResponseDto,
  InitiateSyncDto,
  SyncStatusResponseDto,
  CreateOfflineTaskDto,
  OfflineTaskResponseDto,
  ConflictResolutionDto,
  SyncConflictResponseDto,
} from './dto';

@ApiTags('Device Management')
@ApiBearerAuth()
@Controller('device-management')
export class DeviceManagementController {
  constructor(
    private deviceService: DeviceService,
    private syncService: SyncService,
    private offlineTaskService: OfflineTaskService,
    private conflictResolutionService: ConflictResolutionService,
  ) {}

  // ============================================================================
  // DEVICE ENDPOINTS
  // ============================================================================

  /**
   * Register a new device
   */
  @Post('devices/register')
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 201, type: DeviceResponseDto })
  async registerDevice(
    @Body() createDeviceDto: CreateDeviceDto,
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ): Promise<DeviceResponseDto> {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.deviceService.registerDevice(userId, workspaceId, createDeviceDto);
  }

  /**
   * Get device information
   */
  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get device information' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  async getDeviceInfo(@Param('deviceId') deviceId: string): Promise<DeviceResponseDto> {
    return this.deviceService.getDeviceInfo(deviceId);
  }

  /**
   * List devices for a workspace
   */
  @Get('workspaces/:workspaceId/devices')
  @ApiOperation({ summary: 'List devices for a workspace' })
  @ApiResponse({ status: 200, type: [DeviceResponseDto] })
  async listDevices(
    @Param('workspaceId') workspaceId: string,
    @Query('platform') platform?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<any> {
    return this.deviceService.listDevices(workspaceId, {
      platform: platform as any,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit,
      offset,
    });
  }

  /**
   * Update device status
   */
  @Put('devices/:deviceId')
  @ApiOperation({ summary: 'Update device status and information' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  async updateDeviceStatus(
    @Param('deviceId') deviceId: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.deviceService.updateDeviceStatus(deviceId, updateDeviceDto);
  }

  /**
   * Deregister a device
   */
  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Deregister a device' })
  @ApiResponse({ status: 200 })
  async deregisterDevice(@Param('deviceId') deviceId: string): Promise<any> {
    return this.deviceService.deregisterDevice(deviceId);
  }

  /**
   * Get device sync history
   */
  @Get('devices/:deviceId/sync-history')
  @ApiOperation({ summary: 'Get device sync history' })
  @ApiResponse({ status: 200 })
  async getDeviceSyncHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<any> {
    return this.deviceService.getDeviceSyncHistory(deviceId, limit, offset);
  }

  /**
   * Check device health
   */
  @Get('devices/:deviceId/health')
  @ApiOperation({ summary: 'Check device health and connectivity' })
  @ApiResponse({ status: 200 })
  async checkDeviceHealth(@Param('deviceId') deviceId: string): Promise<any> {
    return this.deviceService.checkDeviceHealth(deviceId);
  }

  /**
   * Get devices needing sync
   */
  @Get('workspaces/:workspaceId/devices-needing-sync')
  @ApiOperation({ summary: 'Get devices that need to sync' })
  @ApiResponse({ status: 200, type: [DeviceResponseDto] })
  async getDevicesNeedingSync(
    @Param('workspaceId') workspaceId: string,
    @Query('maxAge') maxAge: number = 60000,
  ): Promise<DeviceResponseDto[]> {
    return this.deviceService.getDevicesNeedingSync(workspaceId, maxAge);
  }

  // ============================================================================
  // SYNC ENDPOINTS
  // ============================================================================

  /**
   * Initiate sync for a device
   */
  @Post('devices/:deviceId/sync')
  @ApiOperation({ summary: 'Initiate sync for a device' })
  @ApiResponse({ status: 200, type: SyncStatusResponseDto })
  async initiateSync(
    @Param('deviceId') deviceId: string,
    @Body() initiateSyncDto: InitiateSyncDto,
  ): Promise<SyncStatusResponseDto> {
    return this.syncService.initiateSync(deviceId, initiateSyncDto);
  }

  /**
   * Complete sync operation
   */
  @Post('sync/:syncLogId/complete')
  @ApiOperation({ summary: 'Complete sync operation' })
  @ApiResponse({ status: 200, type: SyncStatusResponseDto })
  async completeSyncOperation(
    @Param('syncLogId') syncLogId: string,
    @Body() result: any,
  ): Promise<SyncStatusResponseDto> {
    return this.syncService.completeSyncOperation(syncLogId, result);
  }

  /**
   * Get device sync status
   */
  @Get('devices/:deviceId/sync-status')
  @ApiOperation({ summary: 'Get device sync status' })
  @ApiResponse({ status: 200, type: SyncStatusResponseDto })
  async getDeviceSyncStatus(@Param('deviceId') deviceId: string): Promise<SyncStatusResponseDto> {
    return this.syncService.getDeviceSyncStatus(deviceId);
  }

  /**
   * Get workspace sync statistics
   */
  @Get('workspaces/:workspaceId/sync-stats')
  @ApiOperation({ summary: 'Get workspace sync statistics' })
  @ApiResponse({ status: 200 })
  async getSyncStatistics(@Param('workspaceId') workspaceId: string): Promise<any> {
    return this.syncService.getSyncStatistics(workspaceId);
  }

  /**
   * Cleanup old sync logs
   */
  @Post('workspaces/:workspaceId/cleanup-sync-logs')
  @ApiOperation({ summary: 'Cleanup old sync logs' })
  @ApiResponse({ status: 200 })
  async cleanupOldSyncLogs(
    @Param('workspaceId') workspaceId: string,
    @Query('retentionDays') retentionDays: number = 30,
  ): Promise<any> {
    return this.syncService.cleanupOldSyncLogs(workspaceId, retentionDays);
  }

  // ============================================================================
  // OFFLINE TASK ENDPOINTS
  // ============================================================================

  /**
   * Create an offline task
   */
  @Post('devices/:deviceId/offline-tasks')
  @ApiOperation({ summary: 'Create an offline task' })
  @ApiResponse({ status: 201, type: OfflineTaskResponseDto })
  async createOfflineTask(
    @Param('deviceId') deviceId: string,
    @Body() createOfflineTaskDto: CreateOfflineTaskDto,
    @Query('workspaceId') workspaceId: string,
  ): Promise<OfflineTaskResponseDto> {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    return this.offlineTaskService.createOfflineTask(deviceId, workspaceId, createOfflineTaskDto);
  }

  /**
   * Sync offline tasks
   */
  @Post('devices/:deviceId/sync-offline-tasks')
  @ApiOperation({ summary: 'Sync offline tasks for a device' })
  @ApiResponse({ status: 200 })
  async syncOfflineTasks(
    @Param('deviceId') deviceId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any> {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }

    return this.offlineTaskService.syncOfflineTasks(deviceId, workspaceId);
  }

  /**
   * Get offline tasks for a device
   */
  @Get('devices/:deviceId/offline-tasks')
  @ApiOperation({ summary: 'Get offline tasks for a device' })
  @ApiResponse({ status: 200, type: [OfflineTaskResponseDto] })
  async getOfflineTasks(
    @Param('deviceId') deviceId: string,
    @Query('synced') synced?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<any> {
    return this.offlineTaskService.getOfflineTasks(deviceId, {
      synced: synced === 'true' ? true : synced === 'false' ? false : undefined,
      limit,
      offset,
    });
  }

  /**
   * Mark offline task as synced
   */
  @Put('offline-tasks/:offlineTaskId/synced')
  @ApiOperation({ summary: 'Mark offline task as synced' })
  @ApiResponse({ status: 200, type: OfflineTaskResponseDto })
  async markAsSynced(@Param('offlineTaskId') offlineTaskId: string): Promise<OfflineTaskResponseDto> {
    return this.offlineTaskService.markAsSynced(offlineTaskId);
  }

  /**
   * Get offline task statistics
   */
  @Get('workspaces/:workspaceId/offline-task-stats')
  @ApiOperation({ summary: 'Get offline task statistics' })
  @ApiResponse({ status: 200 })
  async getOfflineTaskStats(@Param('workspaceId') workspaceId: string): Promise<any> {
    return this.offlineTaskService.getOfflineTaskStats(workspaceId);
  }

  /**
   * Clear old offline tasks
   */
  @Post('workspaces/:workspaceId/clear-offline-tasks')
  @ApiOperation({ summary: 'Clear old offline tasks' })
  @ApiResponse({ status: 200 })
  async clearOldOfflineTasks(
    @Param('workspaceId') workspaceId: string,
    @Query('retentionDays') retentionDays: number = 30,
  ): Promise<any> {
    return this.offlineTaskService.clearOldOfflineTasks(workspaceId, retentionDays);
  }

  // ============================================================================
  // CONFLICT RESOLUTION ENDPOINTS
  // ============================================================================

  /**
   * Get unresolved conflicts
   */
  @Get('workspaces/:workspaceId/conflicts')
  @ApiOperation({ summary: 'Get unresolved conflicts' })
  @ApiResponse({ status: 200, type: [SyncConflictResponseDto] })
  async getUnresolvedConflicts(
    @Param('workspaceId') workspaceId: string,
    @Query('itemType') itemType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<any> {
    return this.conflictResolutionService.getUnresolvedConflicts(workspaceId, {
      itemType,
      limit,
      offset,
    });
  }

  /**
   * Resolve a conflict
   */
  @Post('conflicts/:conflictId/resolve')
  @ApiOperation({ summary: 'Resolve a conflict' })
  @ApiResponse({ status: 200, type: SyncConflictResponseDto })
  async resolveConflict(
    @Param('conflictId') conflictId: string,
    @Body() resolutionDto: ConflictResolutionDto,
  ): Promise<SyncConflictResponseDto> {
    return this.conflictResolutionService.resolveConflictManually(conflictId, resolutionDto);
  }

  /**
   * Get conflict by ID
   */
  @Get('conflicts/:conflictId')
  @ApiOperation({ summary: 'Get conflict by ID' })
  @ApiResponse({ status: 200, type: SyncConflictResponseDto })
  async getConflictById(@Param('conflictId') conflictId: string): Promise<SyncConflictResponseDto> {
    return this.conflictResolutionService.getConflictById(conflictId);
  }

  /**
   * Get conflict statistics
   */
  @Get('workspaces/:workspaceId/conflict-stats')
  @ApiOperation({ summary: 'Get conflict statistics' })
  @ApiResponse({ status: 200 })
  async getConflictStatistics(@Param('workspaceId') workspaceId: string): Promise<any> {
    return this.conflictResolutionService.getConflictStatistics(workspaceId);
  }

  /**
   * Auto-resolve identical conflicts
   */
  @Post('workspaces/:workspaceId/auto-resolve-conflicts')
  @ApiOperation({ summary: 'Auto-resolve identical conflicts' })
  @ApiResponse({ status: 200 })
  async autoResolveConflicts(@Param('workspaceId') workspaceId: string): Promise<any> {
    return this.conflictResolutionService.autoResolveIdenticalConflicts(workspaceId);
  }
}
