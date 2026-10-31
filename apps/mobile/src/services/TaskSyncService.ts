import axios, { AxiosInstance } from 'axios';
import { Storage } from '@capacitor/storage';
import { useDeviceStore } from '../stores/device';
import { useSyncStore } from '../stores/sync';

/**
 * TaskSyncService - Offline-first sync engine
 * Handles syncing tasks between device and server
 */
export class TaskSyncService {
  private api: AxiosInstance;
  private deviceStore = useDeviceStore();
  private syncStore = useSyncStore();
  private syncInProgress = false;

  constructor(apiBaseUrl: string, token: string) {
    this.api = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Start sync operation
   */
  async startSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    this.syncStore.setStatus('syncing');

    try {
      const device = this.deviceStore.currentDevice;
      if (!device) {
        throw new Error('Device not registered');
      }

      // Initiate sync on server
      const syncResponse = await this.api.post(`/device-management/devices/${device.deviceId}/sync`, {
        clientTimestamp: Date.now(),
        deviceInfo: {
          platform: device.platform,
          appVersion: device.appVersion,
        },
      });

      const syncLogId = syncResponse.data.syncLogId;

      // Process offline tasks
      await this.processOfflineTasks(syncLogId);

      // Complete sync
      await this.completeSyncOperation(syncLogId);

      this.syncStore.setStatus('completed');
      this.syncStore.setLastSync(new Date());
    } catch (error) {
      console.error('Sync error:', error);
      this.syncStore.setStatus('error');
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process offline tasks during sync
   */
  private async processOfflineTasks(syncLogId: string): Promise<void> {
    try {
      const device = this.deviceStore.currentDevice;
      if (!device) return;

      const response = await this.api.post(
        `/device-management/devices/${device.deviceId}/sync-offline-tasks`,
        {
          workspaceId: this.deviceStore.currentWorkspace?.id,
        },
      );

      const { synced, failed } = response.data;

      this.syncStore.addProcessedItems(synced.length);
      this.syncStore.addFailedItems(failed.length);

      // Update offline task cache
      await this.updateOfflineTasksCache();
    } catch (error) {
      console.error('Error processing offline tasks:', error);
    }
  }

  /**
   * Complete sync operation
   */
  private async completeSyncOperation(syncLogId: string): Promise<void> {
    try {
      const startTime = Date.now();

      await this.api.post(`/device-management/sync/${syncLogId}/complete`, {
        status: 'COMPLETED',
        itemsProcessed: this.syncStore.processedItems,
        itemsFailed: this.syncStore.failedItems,
        conflictsFound: this.syncStore.conflictsFound,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error('Error completing sync:', error);
    }
  }

  /**
   * Create offline task
   */
  async createOfflineTask(
    workspaceId: string,
    taskData: Record<string, unknown>,
  ): Promise<void> {
    try {
      const device = this.deviceStore.currentDevice;
      if (!device) {
        throw new Error('Device not registered');
      }

      await this.api.post(
        `/device-management/devices/${device.deviceId}/offline-tasks?workspaceId=${workspaceId}`,
        {
          operation: 'CREATE',
          taskData,
        },
      );

      // Save to local storage
      await this.cacheOfflineTask({
        operation: 'CREATE',
        taskData,
      });
    } catch (error) {
      console.error('Error creating offline task:', error);
      throw error;
    }
  }

  /**
   * Update offline task
   */
  async updateOfflineTask(
    taskId: string,
    workspaceId: string,
    taskData: Record<string, unknown>,
  ): Promise<void> {
    try {
      const device = this.deviceStore.currentDevice;
      if (!device) {
        throw new Error('Device not registered');
      }

      await this.api.post(
        `/device-management/devices/${device.deviceId}/offline-tasks?workspaceId=${workspaceId}`,
        {
          taskId,
          operation: 'UPDATE',
          taskData,
        },
      );

      await this.cacheOfflineTask({
        taskId,
        operation: 'UPDATE',
        taskData,
      });
    } catch (error) {
      console.error('Error updating offline task:', error);
      throw error;
    }
  }

  /**
   * Delete offline task
   */
  async deleteOfflineTask(taskId: string, workspaceId: string): Promise<void> {
    try {
      const device = this.deviceStore.currentDevice;
      if (!device) {
        throw new Error('Device not registered');
      }

      await this.api.post(
        `/device-management/devices/${device.deviceId}/offline-tasks?workspaceId=${workspaceId}`,
        {
          taskId,
          operation: 'DELETE',
          taskData: { id: taskId },
        },
      );

      await this.cacheOfflineTask({
        taskId,
        operation: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting offline task:', error);
      throw error;
    }
  }

  /**
   * Get offline tasks from cache
   */
  async getOfflineTasks(): Promise<any[]> {
    try {
      const { value } = await Storage.getItem('offlineTasks');
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Error getting offline tasks:', error);
      return [];
    }
  }

  /**
   * Cache offline task locally
   */
  private async cacheOfflineTask(task: any): Promise<void> {
    try {
      const tasks = await this.getOfflineTasks();
      tasks.push({
        ...task,
        timestamp: Date.now(),
      });
      await Storage.setItem('offlineTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error caching offline task:', error);
    }
  }

  /**
   * Update offline tasks cache after sync
   */
  private async updateOfflineTasksCache(): Promise<void> {
    try {
      await Storage.setItem('offlineTasks', JSON.stringify([]));
    } catch (error) {
      console.error('Error updating offline tasks cache:', error);
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<any> {
    try {
      const device = this.deviceStore.currentDevice;
      if (!device) {
        throw new Error('Device not registered');
      }

      const response = await this.api.get(
        `/device-management/devices/${device.deviceId}/sync-status`,
      );

      return response.data;
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Handle sync conflicts
   */
  async resolveConflict(
    conflictId: string,
    resolution: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.api.post(
        `/device-management/conflicts/${conflictId}/resolve`,
        { resolution },
      );

      this.syncStore.removeConflict(conflictId);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }
}
