import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EncryptionService } from '../oauth/encryption.service';

/**
 * TeamsService: Handles Microsoft Teams integration
 * - Connect Teams accounts using OAuth
 * - Sync team chats and messages
 * - Create Priorio tasks from Teams messages
 * - Send notifications to Teams channels
 * - Track Teams activity
 */
@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  private teamsClient: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.initializeTeamsClient();
  }

  /**
   * Initialize Microsoft Graph API client with auth headers
   */
  private initializeTeamsClient(): void {
    this.teamsClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
    });
  }

  /**
   * Connect Teams account using OAuth token
   */
  async connectTeamsAccount(
    workspaceId: string,
    userId: string,
    accessToken: string,
    refreshToken: string,
    displayName: string,
    externalEmail: string,
    externalAccountId: string,
  ): Promise<any> {
    try {
      // Verify token validity with a simple API call
      await this.verifyTeamsToken(accessToken);

      // Check if integration already exists
      const existing = await this.prisma.externalIntegration.findFirst({
        where: {
          workspaceId,
          userId,
          provider: 'teams',
          externalAccountId,
        },
      });

      if (existing && existing.status === 'CONNECTED') {
        return { success: true, message: 'Teams account already connected' };
      }

      // Store encrypted tokens in metadata
      const encryptedTokens = {
        accessToken: this.encryptToken(accessToken),
        refreshToken: refreshToken ? this.encryptToken(refreshToken) : null,
        tokenType: 'Bearer',
      };

      const integration = existing
        ? await this.prisma.externalIntegration.update({
            where: { id: existing.id },
            data: {
              status: 'CONNECTED',
              displayName,
              externalEmail,
              metadata: encryptedTokens,
              updatedAt: new Date(),
            },
          })
        : await this.prisma.externalIntegration.create({
            data: {
              workspaceId,
              userId,
              provider: 'teams',
              displayName,
              externalAccountId,
              externalEmail,
              status: 'CONNECTED',
              metadata: encryptedTokens,
              syncFrequency: 600, // 10 minutes
            },
          });

      this.logger.log(
        `Teams account connected for workspace ${workspaceId}, user ${userId}`,
      );

      return {
        success: true,
        integrationId: integration.id,
        message: 'Teams account connected successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to connect Teams account: ${error.message}`);
      throw new BadRequestException('Failed to connect Teams account');
    }
  }

  /**
   * Sync team chats from Teams to local database
   */
  async syncTeamChats(
    integrationId: string,
    workspaceId: string,
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        throw new UnauthorizedException('Integration not connected');
      }

      // Create sync log entry
      const syncLog = await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          syncType: 'chats',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      const metadata = (integration.metadata as Record<string, any>) || {};
      const accessToken = this.decryptToken(
        metadata.accessToken,
      );
      let itemsProcessed = 0;
      let itemsSucceeded = 0;

      try {
        // Fetch chats from Teams
        const chatsResponse = await this.retryApiCall(() =>
          this.teamsClient.get('/me/chats', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { $top: 50 },
          }),
        );

        const chats = chatsResponse.data.value || [];

        for (const chat of chats) {
          try {
            // Fetch messages for each chat
            const messagesResponse = await this.retryApiCall(() =>
              this.teamsClient.get(`/chats/${chat.id}/messages`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { $top: 100 },
              }),
            );

            const messages = messagesResponse.data.value || [];

            for (const message of messages) {
              itemsProcessed++;
              try {
                // Store message as provider event
                await this.prisma.providerEvent.upsert({
                  where: {
                    integrationId_externalEventId: {
                      integrationId,
                      externalEventId: message.id,
                    },
                  },
                  create: {
                    integrationId,
                    externalEventId: message.id,
                    type: 'chat-message',
                    title: message.subject || 'Teams Chat Message',
                    description: message.body?.content,
                    startTime: new Date(message.createdDateTime),
                    metadata: {
                      chatId: chat.id,
                      senderId: message.from?.user?.id,
                      senderName: message.from?.user?.displayName,
                      senderEmail: message.from?.user?.userPrincipalName,
                    },
                  },
                  update: {
                    description: message.body?.content,
                    processedAt: new Date(),
                  },
                });

                itemsSucceeded++;
              } catch (error) {
                this.logger.warn(
                  `Failed to store chat message ${message.id}: ${error.message}`,
                );
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch chat messages for ${chat.id}`);
          }
        }

        // Update sync log
        await this.prisma.integrationSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'COMPLETED',
            itemsProcessed,
            itemsSucceeded,
            completedAt: new Date(),
            durationMs: Date.now() - syncLog.startedAt.getTime(),
          },
        });

        // Update last sync time
        await this.prisma.externalIntegration.update({
          where: { id: integrationId },
          data: {
            lastSyncedAt: new Date(),
            nextSyncAt: new Date(Date.now() + integration.syncFrequency * 1000),
          },
        });

        this.logger.log(
          `Teams chats synced: ${itemsSucceeded}/${itemsProcessed} messages`,
        );

        return {
          success: true,
          itemsProcessed,
          itemsSucceeded,
        };
      } catch (error) {
        await this.prisma.integrationSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            completedAt: new Date(),
            durationMs: Date.now() - syncLog.startedAt.getTime(),
          },
        });

        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to sync Teams chats: ${error.message}`);
      throw new InternalServerErrorException('Failed to sync Teams chats');
    }
  }

  /**
   * Create a Priorio task from a Teams message
   */
  async createTaskFromMessage(
    integrationId: string,
    messageData: {
      chatId: string;
      messageId: string;
      content: string;
      sender: string;
      timestamp: Date;
    },
    taskData: {
      title?: string;
      description?: string;
      priority?: string;
      dueDate?: Date;
    },
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      // Check if task already exists from this message
      const existing = await this.prisma.providerTask.findFirst({
        where: {
          integrationId,
          externalTaskId: messageData.messageId,
        },
      });

      if (existing) {
        return { taskId: existing.taskId, message: 'Task already exists' };
      }

      // Create task in Priorio
      const task = await this.prisma.task.create({
        data: {
          workspaceId: integration.workspaceId,
          createdById: integration.userId,
          title: taskData.title || `Task from Teams: ${messageData.sender}`,
          description:
            taskData.description ||
            `Created from Teams message:\n\n${messageData.content}`,
          priority: (taskData.priority || 'MEDIUM').toUpperCase() as any,
          dueAt: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
          status: 'PENDING',
        },
      });

      // Map external task to Priorio task
      await this.prisma.providerTask.create({
        data: {
          integrationId,
          taskId: task.id,
          externalTaskId: messageData.messageId,
          provider: 'teams',
          externalStatus: 'created',
          syncDirection: 'bidirectional',
          metadata: {
            sourceMessage: messageData,
          },
        },
      });

      this.logger.log(
        `Task created from Teams message ${messageData.messageId}`,
      );

      return {
        success: true,
        taskId: task.id,
        message: 'Task created from Teams message',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create task from message: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to create task from Teams message',
      );
    }
  }

  /**
   * Post notification to Teams channel
   */
  async postNotificationToTeam(
    integrationId: string,
    channelId: string,
    notification: {
      title: string;
      message: string;
      actionUrl?: string;
      priority?: string;
    },
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        throw new UnauthorizedException('Integration not connected');
      }

      const metadata = (integration.metadata as Record<string, any>) || {};
      const accessToken = this.decryptToken(
        metadata.accessToken,
      );

      // Build adaptive card payload for Teams
      const cardPayload = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              body: [
                {
                  type: 'TextBlock',
                  text: notification.title,
                  weight: 'bolder',
                  size: 'large',
                },
                {
                  type: 'TextBlock',
                  text: notification.message,
                  wrap: true,
                },
              ],
              actions: notification.actionUrl
                ? [
                    {
                      type: 'Action.OpenUrl',
                      title: 'View',
                      url: notification.actionUrl,
                    },
                  ]
                : [],
            },
          },
        ],
      };

      const response = await this.retryApiCall(() =>
        this.teamsClient.post(`/teams/${channelId}/messages`, cardPayload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      // Record notification in database
      await this.prisma.providerNotification.create({
        data: {
          integrationId,
          webhookId: `notif_${Date.now()}`,
          eventType: 'notification',
          webhookUrl: 'internal',
          subscriptionId: `sub_${Date.now()}`,
          status: 'ACTIVE',
          metadata: {
            title: notification.title,
            message: notification.message,
            channelId,
          },
        },
      });

      this.logger.log(
        `Notification posted to Teams channel ${channelId}`,
      );

      return {
        success: true,
        messageId: response.data.id,
        message: 'Notification posted to Teams channel',
      };
    } catch (error) {
      this.logger.error(`Failed to post Teams notification: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to post notification to Teams',
      );
    }
  }

  /**
   * Track Teams user activity
   */
  async trackTeamsActivity(
    integrationId: string,
    workspaceId: string,
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        throw new UnauthorizedException('Integration not connected');
      }

      const metadata = (integration.metadata as Record<string, any>) || {};
      const accessToken = this.decryptToken(
        metadata.accessToken,
      );

      // Fetch user presence information
      const presenceResponse = await this.retryApiCall(() =>
        this.teamsClient.get('/me/presence', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      const presence = presenceResponse.data;

      // Store activity in metadata
      await this.prisma.externalIntegration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...metadata,
            lastActivity: {
              availability: presence.availability,
              activity: presence.activity,
              timestamp: new Date(),
            },
          },
        },
      });

      return {
        success: true,
        presence: {
          availability: presence.availability,
          activity: presence.activity,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to track Teams activity: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to track Teams activity',
      );
    }
  }

  /**
   * Disconnect Teams account
   */
  async disconnectTeamsAccount(integrationId: string): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      // Revoke permissions in database
      await this.prisma.integrationPermission.updateMany({
        where: { integrationId },
        data: { revokedAt: new Date() },
      });

      // Update integration status
      await this.prisma.externalIntegration.update({
        where: { id: integrationId },
        data: {
          status: 'DISCONNECTED',
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Teams account disconnected: ${integrationId}`);

      return {
        success: true,
        message: 'Teams account disconnected successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to disconnect Teams account: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to disconnect Teams account',
      );
    }
  }

  /**
   * Verify Teams OAuth token validity
   */
  private async verifyTeamsToken(accessToken: string): Promise<boolean> {
    try {
      const response = await this.retryApiCall(() =>
        this.teamsClient.get('/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      return !!response.data.id;
    } catch (error) {
      this.logger.error(`Teams token verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Retry API calls with exponential backoff
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
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response?.status);
  }

  /**
   * Encrypt sensitive token data
   */
  private encryptToken(token: string): string {
    return this.encryptionService.encrypt(token);
  }

  /**
   * Decrypt encrypted token
   */
  private decryptToken(encryptedToken: string): string {
    return this.encryptionService.decrypt(encryptedToken);
  }
}
