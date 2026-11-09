import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceInfo, DevicePlatform, Prisma } from '../../../generated/prisma';
import { CreateDeviceDto, UpdateDeviceDto, DeviceResponseDto, DeviceCapabilities } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new device for a user
   */
  async registerDevice(
    userId: string,
    workspaceId: string,
    createDeviceDto: CreateDeviceDto,
  ): Promise<DeviceResponseDto> {
    // Validate inputs
    if (!userId || !workspaceId) {
      throw new BadRequestException('userId and workspaceId are required');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is member of workspace
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    if (!membership) {
      throw new BadRequestException('User is not a member of this workspace');
    }

    // Check if device already exists
    const existingDevice = await this.prisma.deviceInfo.findUnique({
      where: { deviceId: createDeviceDto.deviceId },
    });
    if (existingDevice) {
      throw new ConflictException('Device is already registered');
    }

    // Create device
    const device = await this.prisma.deviceInfo.create({
      data: {
        userId,
        workspaceId,
        platform: createDeviceDto.platform as DevicePlatform,
        osVersion: createDeviceDto.osVersion,
        appVersion: createDeviceDto.appVersion,
        deviceName: createDeviceDto.deviceName,
        deviceId: createDeviceDto.deviceId,
        capabilities: this.normalizeCapabilities(createDeviceDto.capabilities || {}) as any,
        syncStatus: 'PENDING',
        isActive: true,
      },
    });

    return this.mapToResponseDto(device);
  }

  /**
   * Get device information
   */
  async getDeviceInfo(deviceId: string): Promise<DeviceResponseDto> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.mapToResponseDto(device);
  }

  /**
   * List all devices for a workspace
   */
  async listDevices(
    workspaceId: string,
    filters?: {
      platform?: DevicePlatform;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    devices: DeviceResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    const limit = Math.min(filters?.limit || 20, 100);
    const offset = filters?.offset || 0;

    const where: Prisma.DeviceInfoWhereInput = {
      workspaceId,
    };

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (typeof filters?.isActive === 'boolean') {
      where.isActive = filters.isActive;
    }

    const [devices, total] = await Promise.all([
      this.prisma.deviceInfo.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { lastActivityAt: 'desc' },
      }),
      this.prisma.deviceInfo.count({ where }),
    ]);

    return {
      devices: devices.map(d => this.mapToResponseDto(d)),
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update device status and info
   */
  async updateDeviceStatus(
    deviceId: string,
    updateDto: UpdateDeviceDto,
  ): Promise<DeviceResponseDto> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updateData: Prisma.DeviceInfoUpdateInput = {};

    if (updateDto.deviceName !== undefined) {
      updateData.deviceName = updateDto.deviceName;
    }

    if (updateDto.syncStatus !== undefined) {
      updateData.syncStatus = updateDto.syncStatus as any;
    }

    if (updateDto.isActive !== undefined) {
      updateData.isActive = updateDto.isActive;
    }

    if (updateDto.lastSyncAt !== undefined) {
      updateData.lastSyncAt = new Date(updateDto.lastSyncAt);
    }

    if (updateDto.lastActivityAt !== undefined) {
      updateData.lastActivityAt = new Date(updateDto.lastActivityAt);
    }

    if (updateDto.appVersion !== undefined) {
      updateData.appVersion = updateDto.appVersion;
    }

    if (updateDto.osVersion !== undefined) {
      updateData.osVersion = updateDto.osVersion;
    }

    if (updateDto.capabilities) {
      updateData.capabilities = this.normalizeCapabilities(
        updateDto.capabilities as Record<string, unknown>,
      ) as any;
    }

    // Always update the timestamp
    updateData.updatedAt = new Date();

    const updated = await this.prisma.deviceInfo.update({
      where: { id: device.id },
      data: updateData,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Deregister a device
   */
  async deregisterDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Delete associated sync logs and offline tasks
    await Promise.all([
      this.prisma.deviceSyncLog.deleteMany({
        where: { deviceId: device.id },
      }),
      this.prisma.offlineTask.deleteMany({
        where: { deviceId: device.id },
      }),
      this.prisma.syncQueueItem.deleteMany({
        where: { deviceId: device.id },
      }),
    ]);

    // Delete the device
    await this.prisma.deviceInfo.delete({
      where: { id: device.id },
    });

    return {
      success: true,
      message: 'Device deregistered successfully',
    };
  }

  /**
   * Get device sync history
   */
  async getDeviceSyncHistory(
    deviceId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    logs: any[];
    total: number;
  }> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const [logs, total] = await Promise.all([
      this.prisma.deviceSyncLog.findMany({
        where: { deviceId: device.id },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deviceSyncLog.count({ where: { deviceId: device.id } }),
    ]);

    return { logs, total };
  }

  /**
   * Check device health and connectivity
   */
  async checkDeviceHealth(deviceId: string): Promise<{
    isHealthy: boolean;
    status: string;
    lastSync: Date | null;
    syncStatus: string;
    metrics: Record<string, unknown>;
  }> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Get last sync log
    const lastSync = await this.prisma.deviceSyncLog.findFirst({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate health metrics
    const lastSyncTime = device.lastSyncAt ? new Date().getTime() - device.lastSyncAt.getTime() : null;
    const lastActivityTime = device.lastActivityAt ? new Date().getTime() - device.lastActivityAt.getTime() : null;

    const isHealthy =
      device.isActive &&
      device.syncStatus === 'COMPLETED' &&
      (!lastActivityTime || lastActivityTime < 24 * 60 * 60 * 1000); // 24 hours

    const status = device.isActive
      ? lastSync?.syncStatus === 'FAILED'
        ? 'sync_error'
        : 'online'
      : 'offline';

    return {
      isHealthy,
      status,
      lastSync: device.lastSyncAt,
      syncStatus: device.syncStatus,
      metrics: {
        lastSyncTimeAgo: lastSyncTime ? Math.floor(lastSyncTime / 1000) : null,
        lastActivityTimeAgo: lastActivityTime ? Math.floor(lastActivityTime / 1000) : null,
        appVersion: device.appVersion,
        osVersion: device.osVersion,
        platform: device.platform,
      },
    };
  }

  /**
   * Bulk update device statuses
   */
  async bulkUpdateDeviceStatus(
    workspaceId: string,
    deviceIds: string[],
    status: string,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const deviceId of deviceIds) {
      try {
        await this.updateDeviceStatus(deviceId, { syncStatus: status as any });
        updated++;
      } catch {
        failed++;
      }
    }

    return { updated, failed };
  }

  /**
   * Get devices needing sync
   */
  async getDevicesNeedingSync(workspaceId: string, maxAge: number = 60000): Promise<DeviceResponseDto[]> {
    const cutoffTime = new Date(new Date().getTime() - maxAge);

    const devices = await this.prisma.deviceInfo.findMany({
      where: {
        workspaceId,
        isActive: true,
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: cutoffTime } },
          { syncStatus: { in: ['PENDING', 'FAILED'] } },
        ],
      },
      orderBy: { lastSyncAt: 'asc' },
    });

    return devices.map(d => this.mapToResponseDto(d));
  }

  /**
   * Generate device token for authentication
   */
  async generateDeviceToken(deviceId: string): Promise<string> {
    const device = await this.prisma.deviceInfo.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    return token;
  }

  // Helper methods

  private normalizeCapabilities(capabilities: Record<string, unknown>): Prisma.JsonValue {
    const normalized: DeviceCapabilities = {
      maxStorageBytes: capabilities.maxStorageBytes as number || 10 * 1024 * 1024, // 10MB default
      syncFrequencyMs: capabilities.syncFrequencyMs as number || 60000, // 1 minute default
      offlineSupport: capabilities.offlineSupport as boolean || true,
      backgroundSyncSupport: capabilities.backgroundSyncSupport as boolean || false,
      pushNotificationSupport: capabilities.pushNotificationSupport as boolean || true,
      encryptionSupport: capabilities.encryptionSupport as boolean || true,
      batteryOptimized: capabilities.batteryOptimized as boolean || false,
      customFields: {},
    };

    // Add any custom fields
    Object.keys(capabilities).forEach(key => {
      if (!['maxStorageBytes', 'syncFrequencyMs', 'offlineSupport', 'backgroundSyncSupport', 
            'pushNotificationSupport', 'encryptionSupport', 'batteryOptimized'].includes(key)) {
        (normalized.customFields as Record<string, unknown>)[key] = capabilities[key];
      }
    });

    return normalized as any;
  }

  private mapToResponseDto(device: DeviceInfo): DeviceResponseDto {
    return {
      id: device.id,
      deviceId: device.deviceId,
      userId: device.userId,
      workspaceId: device.workspaceId,
      platform: device.platform,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      deviceName: device.deviceName || 'Unknown Device',
      syncStatus: device.syncStatus,
      lastSyncAt: device.lastSyncAt,
      lastActivityAt: device.lastActivityAt,
      isActive: device.isActive,
      capabilities: device.capabilities as unknown as DeviceCapabilities,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
