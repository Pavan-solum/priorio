import {
  Injectable,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * ProviderNotificationService: Handles webhook subscriptions and notifications
 * - Register webhook subscriptions
 * - Handle webhook events
 * - Retry logic for failed deliveries
 * - Event routing to appropriate handlers
 */
@Injectable()
export class ProviderNotificationService {
  private readonly logger = new Logger(ProviderNotificationService.name);
  private webhookClient: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor() {
    this.webhookClient = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Register webhook subscription with provider
   */
  async registerWebhookSubscription(
    provider: string,
    webhookUrl: string,
    eventTypes: string[],
    accessToken: string,
  ): Promise<any> {
    try {
      let subscriptionUrl: string;
      let subscriptionPayload: any;

      if (provider === 'microsoft') {
        subscriptionUrl = 'https://graph.microsoft.com/v1.0/subscriptions';
        subscriptionPayload = {
          changeType: 'created,updated,deleted',
          notificationUrl: webhookUrl,
          resource: '/me/mailFolders(\'inbox\')/messages',
          expirationDateTime: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
          ).toISOString(),
        };
      } else if (provider === 'google') {
        subscriptionUrl = 'https://www.googleapis.com/gmail/v1/users/me/watch';
        subscriptionPayload = {
          topicName: `projects/priorio/topics/${eventTypes[0]}`,
        };
      } else {
        subscriptionUrl = `https://api.${provider}.com/webhooks`;
        subscriptionPayload = {
          url: webhookUrl,
          events: eventTypes,
          active: true,
        };
      }

      const response = await this.retryApiCall(() =>
        this.webhookClient.post(subscriptionUrl, subscriptionPayload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      const subscription = {
        webhookId: response.data.id || `webhook_${Date.now()}`,
        subscriptionId: response.data.subscriptionId || response.data.id,
        eventTypes,
        webhookUrl,
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      this.logger.log(
        `Webhook subscription registered for ${provider}: ${subscription.webhookId}`,
      );

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to register webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle incoming webhook event
   */
  async handleWebhookEvent(payload: any, provider: string): Promise<any> {
    try {
      this.logger.debug(
        `Received webhook event from ${provider}`,
      );

      const event = {
        provider,
        timestamp: new Date(),
        eventType: this.extractEventType(payload, provider),
        data: payload,
        processed: false,
      };

      // Route to appropriate handler
      const routedHandler = this.routeWebhookEvent(event);

      return {
        success: true,
        eventId: payload.id || `event_${Date.now()}`,
        handler: routedHandler,
        message: 'Webhook event received and queued for processing',
      };
    } catch (error) {
      this.logger.error(`Failed to handle webhook event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract event type from webhook payload
   */
  private extractEventType(payload: any, provider: string): string {
    if (provider === 'microsoft') {
      if (payload.value?.[0]?.changeType) {
        return `email_${payload.value[0].changeType}`;
      }
    } else if (provider === 'google') {
      return payload.eventType || 'message';
    } else if (provider === 'github') {
      return payload.action || 'event';
    }

    return 'unknown';
  }

  /**
   * Route webhook event to appropriate handler
   */
  private routeWebhookEvent(event: any): string {
    const { provider, eventType, data } = event;

    if (eventType.includes('email') || eventType.includes('message')) {
      return 'EMAIL_HANDLER';
    } else if (eventType.includes('calendar') || eventType.includes('event')) {
      return 'CALENDAR_HANDLER';
    } else if (eventType.includes('chat') || eventType.includes('conversation')) {
      return 'CHAT_HANDLER';
    } else if (provider === 'github') {
      return 'GITHUB_HANDLER';
    }

    return 'GENERIC_HANDLER';
  }

  /**
   * Renew expiring webhook subscriptions
   */
  async renewWebhookSubscription(
    subscriptionId: string,
    provider: string,
    accessToken: string,
  ): Promise<any> {
    try {
      let renewUrl: string;
      let renewPayload: any;

      if (provider === 'microsoft') {
        renewUrl = `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`;
        renewPayload = {
          expirationDateTime: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
          ).toISOString(),
        };
      } else {
        throw new Error('Renewal not supported for this provider');
      }

      const response = await this.retryApiCall(() =>
        this.webhookClient.patch(renewUrl, renewPayload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      this.logger.log(`Webhook subscription renewed: ${subscriptionId}`);

      return {
        success: true,
        subscriptionId,
        expirationDateTime: response.data.expirationDateTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to renew webhook subscription: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Unsubscribe from webhook
   */
  async unsubscribeWebhook(
    subscriptionId: string,
    provider: string,
    accessToken: string,
  ): Promise<any> {
    try {
      let unsubscribeUrl: string;

      if (provider === 'microsoft') {
        unsubscribeUrl = `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`;
      } else {
        unsubscribeUrl = `https://api.${provider}.com/webhooks/${subscriptionId}`;
      }

      await this.retryApiCall(() =>
        this.webhookClient.delete(unsubscribeUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      this.logger.log(`Webhook unsubscribed: ${subscriptionId}`);

      return {
        success: true,
        message: 'Webhook subscription removed',
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle webhook retry with exponential backoff
   */
  async retryWebhookDelivery(
    webhookUrl: string,
    payload: any,
    attempt = 1,
  ): Promise<any> {
    try {
      const response = await this.webhookClient.post(webhookUrl, payload);
      return response.data;
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        const delayMs = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.retryWebhookDelivery(webhookUrl, payload, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response?.status);
  }

  /**
   * Retry API call with exponential backoff
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        const delayMs = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.retryApiCall(apiCall, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}
