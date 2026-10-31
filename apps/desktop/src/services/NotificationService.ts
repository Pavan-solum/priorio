import { invoke } from '@tauri-apps/api/tauri';

/**
 * Notification Service
 * Manages native system notifications
 */
export class NotificationService {
  /**
   * Send notification
   */
  static async sendNotification(options: NotificationOptions): Promise<void> {
    try {
      await invoke('send_notification', {
        title: options.title,
        body: options.body,
        iconPath: options.iconPath,
        sound: options.sound ?? true,
        urgency: options.urgency ?? 'normal',
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Show task reminder notification
   */
  static async notifyTaskReminder(taskTitle: string, taskDescription?: string): Promise<void> {
    await this.sendNotification({
      title: 'Task Reminder',
      body: `${taskTitle}${taskDescription ? '\n' + taskDescription : ''}`,
      urgency: 'critical',
      sound: true,
    });
  }

  /**
   * Show sync notification
   */
  static async notifySyncComplete(itemsCount: number): Promise<void> {
    await this.sendNotification({
      title: 'Sync Complete',
      body: `${itemsCount} items synced successfully`,
    });
  }

  /**
   * Show sync error notification
   */
  static async notifySyncError(error: string): Promise<void> {
    await this.sendNotification({
      title: 'Sync Failed',
      body: error,
      urgency: 'critical',
    });
  }

  /**
   * Show update available notification
   */
  static async notifyUpdateAvailable(version: string): Promise<void> {
    await this.sendNotification({
      title: 'Update Available',
      body: `Priorio ${version} is ready to download`,
    });
  }

  /**
   * Get notifications history
   */
  static async getNotifications(): Promise<Notification[]> {
    try {
      const notifications = await invoke<Notification[]>('get_notifications');
      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Clear notification
   */
  static async clearNotification(id: string): Promise<void> {
    try {
      await invoke('clear_notification', { id });
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await invoke('clear_all_notifications');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }
}

export interface NotificationOptions {
  title: string;
  body: string;
  iconPath?: string;
  sound?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}
