import { PushNotifications } from '@capacitor/push-notifications';
import axios, { AxiosInstance } from 'axios';

/**
 * NotificationService - Push notification handling
 */
export class NotificationService {
  private api: AxiosInstance;
  private listeners: Map<string, Function[]> = new Map();

  constructor(apiBaseUrl: string, token: string) {
    this.api = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      // Register for push notifications
      await PushNotifications.requestPermissions();
      await PushNotifications.register();

      // Set up listeners
      PushNotifications.addListener('registration', (token: any) => {
        console.log('Push registration token received:', token.value);
        this.onTokenRefresh(token.value);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        this.handleNotification(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        this.handleNotificationAction(notification);
      });
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Handle notification received
   */
  private handleNotification(notification: any): void {
    const { title, body, data } = notification.message;

    console.log('Notification received:', {
      title,
      body,
      data,
    });

    // Emit event to listeners
    this.emit('notification_received', {
      title,
      body,
      data,
      timestamp: Date.now(),
    });

    // Handle specific notification types
    if (data?.type === 'task_reminder') {
      this.emit('task_reminder', data);
    } else if (data?.type === 'sync_complete') {
      this.emit('sync_complete', data);
    }
  }

  /**
   * Handle notification action
   */
  private handleNotificationAction(notification: any): void {
    const { actionId, inputValue } = notification.actionPerformed;

    if (actionId === 'open_app') {
      this.emit('notification_action', {
        action: 'open_app',
        data: notification.notification.data,
      });
    }
  }

  /**
   * Token refresh handler
   */
  private async onTokenRefresh(token: string): Promise<void> {
    try {
      // Save token to backend
      await this.api.post('/notifications/register-token', {
        token,
        platform: 'fcm',
      });
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    delaySeconds: number = 0,
  ): Promise<void> {
    try {
      await PushNotifications.createChannel({
        id: 'default',
        name: 'Default',
        description: 'Default notifications',
        importance: 5,
        visibility: 1,
      });

      await PushNotifications.sendNotifications([
        {
          title,
          body,
          id: Math.floor(Math.random() * 10000),
          extra: data,
          scheduledTime: new Date(Date.now() + delaySeconds * 1000),
        },
      ]);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Subscribe to notification events
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from notification events
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  /**
   * Schedule reminder notification
   */
  async scheduleReminder(
    reminderId: string,
    title: string,
    time: Date,
  ): Promise<void> {
    const delaySeconds = Math.max(
      0,
      Math.floor((time.getTime() - Date.now()) / 1000),
    );

    await this.sendLocalNotification(
      'Reminder',
      title,
      { reminderId, type: 'reminder' },
      delaySeconds,
    );
  }
}
