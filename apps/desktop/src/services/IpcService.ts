import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

/**
 * IPC Service
 * Handles inter-process communication between frontend and backend
 */
export class IpcService {
  private static listeners: Map<string, Function[]> = new Map();

  /**
   * Send message to backend
   */
  static async sendMessage<T = any>(channel: string, payload?: any): Promise<T> {
    try {
      return await invoke<T>(channel, payload || {});
    } catch (error) {
      console.error(`Error sending message on channel: ${channel}`, error);
      throw error;
    }
  }

  /**
   * Listen for messages from backend
   */
  static async onMessage<T = any>(
    channel: string,
    callback: (payload: T) => void
  ): Promise<() => void> {
    try {
      return await listen<T>(channel, (event) => {
        callback(event.payload);
      });
    } catch (error) {
      console.error(`Error listening to channel: ${channel}`, error);
      throw error;
    }
  }

  /**
   * Register local message handler
   */
  static registerHandler(channel: string, handler: (payload?: any) => void): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)!.push(handler);
  }

  /**
   * Emit local message
   */
  static emit(channel: string, payload?: any): void {
    const handlers = this.listeners.get(channel);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  /**
   * Remove handler
   */
  static removeHandler(channel: string, handler: Function): void {
    const handlers = this.listeners.get(channel);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Clear all handlers for channel
   */
  static clearHandlers(channel: string): void {
    this.listeners.delete(channel);
  }

  // Specific message types

  /**
   * Start sync operation
   */
  static async startSync(): Promise<{ syncId: string; status: string }> {
    return this.sendMessage('start_sync');
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(syncId: string): Promise<SyncStatus> {
    return this.sendMessage('get_sync_status', { syncId });
  }

  /**
   * Cancel sync
   */
  static async cancelSync(syncId: string): Promise<boolean> {
    return this.sendMessage('cancel_sync', { syncId });
  }

  /**
   * Register device
   */
  static async registerDevice(deviceInfo: DeviceInfo): Promise<{ deviceId: string }> {
    return this.sendMessage('register_device', deviceInfo);
  }

  /**
   * Get device info
   */
  static async getDeviceInfo(): Promise<DeviceInfo> {
    return this.sendMessage('get_device_info');
  }

  /**
   * Listen for sync progress
   */
  static async onSyncProgress(callback: (progress: SyncProgress) => void): Promise<() => void> {
    return this.onMessage('sync_progress', callback);
  }

  /**
   * Listen for sync complete
   */
  static async onSyncComplete(callback: (result: SyncResult) => void): Promise<() => void> {
    return this.onMessage('sync_complete', callback);
  }

  /**
   * Listen for sync error
   */
  static async onSyncError(callback: (error: SyncError) => void): Promise<() => void> {
    return this.onMessage('sync_error', callback);
  }

  /**
   * Listen for notification
   */
  static async onNotification(callback: (notification: Notification) => void): Promise<() => void> {
    return this.onMessage('notification', callback);
  }

  /**
   * Listen for window event
   */
  static async onWindowEvent(callback: (event: WindowEvent) => void): Promise<() => void> {
    return this.onMessage('window_event', callback);
  }
}

// Type definitions

export interface SyncStatus {
  syncId: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  progress: number;
  processedItems: number;
  totalItems: number;
  startTime?: Date;
  endTime?: Date;
}

export interface SyncProgress {
  syncId: string;
  progress: number;
  processedItems: number;
  totalItems: number;
  currentItem?: string;
}

export interface SyncResult {
  syncId: string;
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  duration: number;
}

export interface SyncError {
  syncId: string;
  error: string;
  code?: string;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceName: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  lastSync?: Date;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
}

export interface WindowEvent {
  type: 'show' | 'hide' | 'focus' | 'blur' | 'close';
  timestamp: Date;
}
