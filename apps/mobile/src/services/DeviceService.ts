import { Device } from '@capacitor/device';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './StorageService';

/**
 * DeviceService - Device registration and management
 */
export class DeviceService {
  private api: AxiosInstance;
  private storage: StorageService;
  private deviceInfo: any = null;

  constructor(apiBaseUrl: string, token: string, storage: StorageService) {
    this.storage = storage;
    this.api = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Register device on the backend
   */
  async registerDevice(workspaceId: string): Promise<any> {
    try {
      // Get device info
      const deviceInfo = await this.getDeviceInfo();

      // Create device ID if not exists
      let deviceId = await this.storage.getItem<string>('device_id');
      if (!deviceId) {
        deviceId = uuidv4();
        await this.storage.setItem('device_id', deviceId, false);
      }

      // Register on backend
      const response = await this.api.post(
        `/device-management/devices/register?workspaceId=${workspaceId}`,
        {
          platform: deviceInfo.platform,
          osVersion: deviceInfo.osVersion,
          appVersion: deviceInfo.appVersion,
          deviceId: deviceId,
          deviceName: deviceInfo.model,
          capabilities: {
            offlineSupport: true,
            backgroundSyncSupport: true,
            pushNotificationSupport: true,
            encryptionSupport: true,
            batteryOptimized: false,
            syncFrequencyMs: 60000, // 1 minute
          },
        },
      );

      // Save device info
      this.deviceInfo = response.data;
      await this.storage.setItem('device_info', this.deviceInfo, false);

      return response.data;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Get cached device info
   */
  async getCachedDeviceInfo(): Promise<any> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    return await this.storage.getItem('device_info');
  }

  /**
   * Get device details from Capacitor
   */
  private async getDeviceInfo(): Promise<any> {
    try {
      const info = await Device.getInfo();
      const id = await Device.getId();

      return {
        platform: info.platform,
        osVersion: info.osVersion,
        appVersion: '1.0.0', // Get from package.json in production
        model: info.model,
        uuid: id.uuid,
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      throw error;
    }
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(status: string): Promise<any> {
    try {
      const deviceInfo = await this.getCachedDeviceInfo();
      if (!deviceInfo?.deviceId) {
        throw new Error('Device not registered');
      }

      const response = await this.api.put(
        `/device-management/devices/${deviceInfo.deviceId}`,
        {
          syncStatus: status,
          lastActivityAt: new Date(),
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error updating device status:', error);
      throw error;
    }
  }

  /**
   * Get device health
   */
  async getDeviceHealth(): Promise<any> {
    try {
      const deviceInfo = await this.getCachedDeviceInfo();
      if (!deviceInfo?.deviceId) {
        throw new Error('Device not registered');
      }

      const response = await this.api.get(
        `/device-management/devices/${deviceInfo.deviceId}/health`,
      );

      return response.data;
    } catch (error) {
      console.error('Error getting device health:', error);
      throw error;
    }
  }

  /**
   * Deregister device
   */
  async deregisterDevice(): Promise<void> {
    try {
      const deviceInfo = await this.getCachedDeviceInfo();
      if (deviceInfo?.deviceId) {
        await this.api.delete(
          `/device-management/devices/${deviceInfo.deviceId}`,
        );
      }

      this.deviceInfo = null;
      await this.storage.removeItem('device_info');
      await this.storage.removeItem('device_id');
    } catch (error) {
      console.error('Error deregistering device:', error);
    }
  }

  /**
   * Get device capabilities
   */
  async getDeviceCapabilities(): Promise<any> {
    const deviceInfo = await this.getCachedDeviceInfo();
    return deviceInfo?.capabilities || {};
  }

  /**
   * Check battery status
   */
  async checkBatteryOptimization(): Promise<boolean> {
    try {
      // In production, use native battery optimization checks
      const info = await Device.getBatteryInfo();
      return !info.isCharging && info.level < 0.2; // Low battery and not charging
    } catch (error) {
      console.error('Error checking battery:', error);
      return false;
    }
  }

  /**
   * Get device ID
   */
  async getDeviceId(): Promise<string> {
    const deviceInfo = await this.getCachedDeviceInfo();
    if (deviceInfo?.deviceId) {
      return deviceInfo.deviceId;
    }

    // Fallback: try to get from storage
    const deviceId = await this.storage.getItem<string>('device_id');
    return deviceId || '';
  }
}
