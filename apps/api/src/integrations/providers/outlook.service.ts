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
 * OutlookService: Handles Microsoft Outlook integration
 * - Connect Outlook accounts (emails + calendar)
 * - Sync emails
 * - Sync calendar events
 * - Convert emails to tasks
 * - Track Outlook activity
 */
@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);
  private outlookClient: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.initializeOutlookClient();
  }

  /**
   * Initialize Microsoft Graph API client
   */
  private initializeOutlookClient(): void {
    this.outlookClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
    });
  }

  /**
   * Connect Outlook account using OAuth
   */
  async connectOutlookAccount(
    workspaceId: string,
    userId: string,
    accessToken: string,
    refreshToken: string,
    displayName: string,
    externalEmail: string,
    externalAccountId: string,
  ): Promise<any> {
    try {
      // Verify token validity
      await this.verifyOutlookToken(accessToken);

      const existing = await this.prisma.externalIntegration.findFirst({
        where: {
          workspaceId,
          userId,
          provider: 'outlook',
          externalAccountId,
        },
      });

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
              provider: 'outlook',
              displayName,
              externalAccountId,
              externalEmail,
              status: 'CONNECTED',
              metadata: encryptedTokens,
              syncFrequency: 600, // 10 minutes
            },
          });

      this.logger.log(
        `Outlook account connected for workspace ${workspaceId}, user ${userId}`,
      );

      return {
        success: true,
        integrationId: integration.id,
        message: 'Outlook account connected successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to connect Outlook account: ${error.message}`);
      throw new BadRequestException('Failed to connect Outlook account');
    }
  }

  /**
   * Sync emails from Outlook
   */
  async syncOutlookEmail(
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

      const syncLog = await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          syncType: 'emails',
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
        // Fetch emails from Inbox
        const emailsResponse = await this.retryApiCall(() =>
          this.outlookClient.get('/me/mailFolders/inbox/messages', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { $top: 100, $orderby: 'receivedDateTime desc' },
          }),
        );

        const emails = emailsResponse.data.value || [];

        for (const email of emails) {
          itemsProcessed++;
          try {
            // Store email as provider event
            await this.prisma.providerEvent.upsert({
              where: {
                integrationId_externalEventId: {
                  integrationId,
                  externalEventId: email.id,
                },
              },
              create: {
                integrationId,
                externalEventId: email.id,
                type: 'email',
                title: email.subject,
                description: email.bodyPreview,
                startTime: new Date(email.receivedDateTime),
                organizer: email.from?.emailAddress?.address,
                metadata: {
                  from: email.from?.emailAddress?.address,
                  to: email.toRecipients?.map((r: any) => r.emailAddress?.address),
                  cc: email.ccRecipients?.map((r: any) => r.emailAddress?.address),
                  hasAttachments: email.hasAttachments,
                  categories: email.categories,
                  isRead: email.isRead,
                  importance: email.importance,
                },
              },
              update: {
                description: email.bodyPreview,
                processedAt: new Date(),
              },
            });

            itemsSucceeded++;
          } catch (error) {
            this.logger.warn(
              `Failed to store email ${email.id}: ${error.message}`,
            );
          }
        }

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

        await this.prisma.externalIntegration.update({
          where: { id: integrationId },
          data: {
            lastSyncedAt: new Date(),
            nextSyncAt: new Date(Date.now() + integration.syncFrequency * 1000),
          },
        });

        this.logger.log(
          `Outlook emails synced: ${itemsSucceeded}/${itemsProcessed} emails`,
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
      this.logger.error(`Failed to sync Outlook emails: ${error.message}`);
      throw new InternalServerErrorException('Failed to sync Outlook emails');
    }
  }

  /**
   * Sync calendar events from Outlook
   */
  async syncOutlookCalendar(
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

      const syncLog = await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          syncType: 'calendar',
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
        // Fetch calendar events
        const eventsResponse = await this.retryApiCall(() =>
          this.outlookClient.get('/me/calendarview', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              startDateTime: new Date().toISOString(),
              endDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              $top: 100,
            },
          }),
        );

        const events = eventsResponse.data.value || [];

        for (const event of events) {
          itemsProcessed++;
          try {
            await this.prisma.providerEvent.upsert({
              where: {
                integrationId_externalEventId: {
                  integrationId,
                  externalEventId: event.id,
                },
              },
              create: {
                integrationId,
                externalEventId: event.id,
                type: 'meeting',
                title: event.subject,
                description: event.bodyPreview,
                startTime: new Date(event.start.dateTime),
                endTime: new Date(event.end.dateTime),
                organizer: event.organizer?.emailAddress?.address,
                attendees: event.attendees?.map(
                  (a: any) => a.emailAddress?.address,
                ) || [],
                location: event.location?.displayName,
                metadata: {
                  isRecurring: event.recurrence !== null,
                  isCancelled: event.isCancelled,
                  isOnlineMeeting: event.isOnlineMeeting,
                },
              },
              update: {
                description: event.bodyPreview,
                processedAt: new Date(),
              },
            });

            itemsSucceeded++;
          } catch (error) {
            this.logger.warn(
              `Failed to store calendar event ${event.id}: ${error.message}`,
            );
          }
        }

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

        await this.prisma.externalIntegration.update({
          where: { id: integrationId },
          data: {
            lastSyncedAt: new Date(),
            nextSyncAt: new Date(Date.now() + integration.syncFrequency * 1000),
          },
        });

        this.logger.log(
          `Outlook calendar events synced: ${itemsSucceeded}/${itemsProcessed} events`,
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
      this.logger.error(
        `Failed to sync Outlook calendar: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to sync Outlook calendar',
      );
    }
  }

  /**
   * Create Priorio task from Outlook email
   */
  async createTaskFromEmail(
    integrationId: string,
    emailId: string,
    taskData?: {
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

      // Check if task already exists from this email
      const existing = await this.prisma.providerTask.findFirst({
        where: {
          integrationId,
          externalTaskId: emailId,
        },
      });

      if (existing) {
        return { taskId: existing.taskId, message: 'Task already exists' };
      }

      // Fetch email details
      const metadata = (integration.metadata as Record<string, any>) || {};
      const accessToken = this.decryptToken(
        metadata.accessToken,
      );

      const emailResponse = await this.retryApiCall(() =>
        this.outlookClient.get(`/me/messages/${emailId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      const email = emailResponse.data;

      // Create task in Priorio
      const task = await this.prisma.task.create({
        data: {
          workspaceId: integration.workspaceId,
          createdById: integration.userId,
          title:
            taskData?.title ||
            `Task from Email: ${email.subject}`,
          description:
            taskData?.description ||
            `From: ${email.from?.emailAddress?.address}\n\n${email.bodyPreview}`,
          priority: (taskData?.priority || 'MEDIUM').toUpperCase() as any,
          dueAt: taskData?.dueDate ? new Date(taskData.dueDate) : undefined,
          status: 'PENDING',
        },
      });

      // Map external task to Priorio task
      await this.prisma.providerTask.create({
        data: {
          integrationId,
          taskId: task.id,
          externalTaskId: emailId,
          provider: 'outlook',
          externalStatus: 'created',
          syncDirection: 'bidirectional',
          metadata: {
            sourceEmail: {
              from: email.from?.emailAddress?.address,
              subject: email.subject,
            },
          },
        },
      });

      this.logger.log(`Task created from Outlook email ${emailId}`);

      return {
        success: true,
        taskId: task.id,
        message: 'Task created from email',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create task from email: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to create task from email',
      );
    }
  }

  /**
   * Track Outlook user activity
   */
  async trackOutlookActivity(
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

      // Fetch user mailbox statistics
      const statsResponse = await this.retryApiCall(() =>
        this.outlookClient.get('/me/mailboxSettings', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      // Fetch recent sent items
      const sentResponse = await this.retryApiCall(() =>
        this.outlookClient.get('/me/mailFolders/sentitems/messages', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { $top: 10, $orderby: 'sentDateTime desc' },
        }),
      );

      const activity = {
        timeZone: statsResponse.data.timeZone,
        lastActivity: new Date(),
        recentSentEmails: sentResponse.data.value?.length || 0,
      };

      // Store activity in metadata
      await this.prisma.externalIntegration.update({
        where: { id: integrationId },
        data: {
          metadata: {
            ...metadata,
            lastActivity: activity,
          },
        },
      });

      return {
        success: true,
        activity,
      };
    } catch (error) {
      this.logger.error(
        `Failed to track Outlook activity: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to track Outlook activity',
      );
    }
  }

  /**
   * Disconnect Outlook account
   */
  async disconnectOutlookAccount(integrationId: string): Promise<any> {
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

      this.logger.log(`Outlook account disconnected: ${integrationId}`);

      return {
        success: true,
        message: 'Outlook account disconnected successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to disconnect Outlook account: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to disconnect Outlook account',
      );
    }
  }

  /**
   * Verify Outlook OAuth token validity
   */
  private async verifyOutlookToken(accessToken: string): Promise<boolean> {
    try {
      const response = await this.retryApiCall(() =>
        this.outlookClient.get('/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      return !!response.data.id;
    } catch (error) {
      this.logger.error(
        `Outlook token verification failed: ${error.message}`,
      );
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
