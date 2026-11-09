import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuthService } from '../oauth/oauth.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { TasksService } from '../../tasks/tasks.service';
import { Priority, TaskStatus } from '../../tasks/dto/create-task.dto';
import { google } from 'googleapis';
import Redis from 'ioredis';

interface GmailEmail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body?: { data: string } }>;
    body?: { data: string };
  };
  internalDate: string;
}

interface ParsedEmail {
  googleMessageId: string;
  googleThreadId: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
  receivedAt: Date;
  labels: string[];
}

@Injectable()
export class GmailSyncService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private oauthService: OAuthService,
    private auditLogs: AuditLogsService,
    private tasksService: TasksService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Initiate Gmail sync for a workspace
   */
  async initiateSync(connectionId: string, workspaceId: string): Promise<{ syncId: string }> {
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('OAuth connection not found');
    }

    if (connection.provider !== 'google') {
      throw new BadRequestException('Connection is not a Google OAuth connection');
    }

    const syncId = this._generateId();
    const syncData = {
      connectionId,
      workspaceId,
      startedAt: new Date(),
      status: 'in_progress',
      processedCount: 0,
      tasksCreatedCount: 0,
    };

    // Store sync state in Redis
    await this.redis.setex(
      `gmail:sync:${syncId}`,
      3600, // 1 hour TTL
      JSON.stringify(syncData),
    );

    // Start async sync in background
    this._performSync(syncId, connectionId, workspaceId).catch((error) => {
      console.error(`Gmail sync ${syncId} failed:`, error);
    });

    return { syncId };
  }

  /**
   * Get sync status
   */
  async getSyncStatus(syncId: string): Promise<any> {
    const syncData = await this.redis.get(`gmail:sync:${syncId}`);

    if (!syncData) {
      throw new NotFoundException('Sync not found or expired');
    }

    return JSON.parse(syncData);
  }

  /**
   * Get sync history
   */
  async getSyncHistory(workspaceId: string): Promise<any[]> {
    const syncs = await this.prisma.gmailSync.findMany({
      where: { workspaceId },
      orderBy: { lastSyncAt: 'desc' },
      take: 20,
    });

    return syncs.map((sync) => ({
      id: sync.id,
      historyId: sync.historyId,
      lastSyncAt: sync.lastSyncAt,
      totalEmails: sync.totalEmails,
      tasksCreated: sync.tasksCreated,
      lastError: sync.lastError,
    }));
  }

  /**
   * Perform Gmail sync (background task)
   */
  private async _performSync(
    syncId: string,
    connectionId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      const accessToken = await this.oauthService.getAccessToken(connectionId);
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth });

      // Get or create sync checkpoint
      let gmailSync = await this.prisma.gmailSync.findUnique({
        where: { workspaceId },
      });

      const historyId = gmailSync?.historyId || '1';
      let emails: GmailEmail[] = [];
      let tasksCreated = 0;

      // Fetch emails
      if (historyId === '1') {
        // First sync - fetch recent emails
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread from:(.)',
          maxResults: 50,
        });

        emails = (response.data.messages || []) as unknown as GmailEmail[];
      } else {
        // Incremental sync - fetch history since last sync
        const response = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: historyId,
          historyTypes: ['messageAdded'],
        });

        const historyItems = response.data.history || [];
        const messageIds = new Set<string>();

        for (const item of historyItems) {
          if (item.messages) {
            for (const msg of item.messages) {
              if (msg.id) messageIds.add(msg.id);
            }
          }
        }

        // Fetch full message details
        for (const messageId of messageIds) {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
          });
          emails.push(msg.data as GmailEmail);
        }
      }

      // Process emails
      for (const email of emails) {
        const processedEmail = this._parseEmail(email);

        // Check for duplicates
        const existingTask = await this.prisma.task.findFirst({
          where: {
            workspaceId,
            description: { contains: processedEmail.googleMessageId },
          },
        });

        if (!existingTask) {
          // Create task from email
          await this.tasksService.create(workspaceId, '00000000-0000-0000-0000-000000000001', {
            title: processedEmail.subject || `Email from ${processedEmail.from}`,
            description: `${processedEmail.body}\n\n[GoogleMessageId: ${processedEmail.googleMessageId}]`,
            priority: Priority.MEDIUM,
            status: TaskStatus.PENDING,
          });

          tasksCreated++;
        }
      }

      // Update sync checkpoint
      const latestEmail = emails[0];
      if (latestEmail && latestEmail.internalDate) {
        gmailSync = await this.prisma.gmailSync.upsert({
          where: { workspaceId },
          create: {
            workspaceId,
            historyId: latestEmail.id,
            totalEmails: emails.length,
            tasksCreated,
          },
          update: {
            historyId: latestEmail.id,
            totalEmails: { increment: emails.length },
            tasksCreated: { increment: tasksCreated },
            lastSyncAt: new Date(),
          },
        });
      }

      // Audit log
      await this.auditLogs.log({
        workspaceId,
        userId: 'system-user',
        action: 'CREATE',
        entityType: 'GMAIL_SYNC' as any,
        entityId: gmailSync?.id || syncId,
        changes: {
          emailsProcessed: { old: null, new: emails.length },
          tasksCreated: { old: null, new: tasksCreated },
        },
      });

      // Update sync status
      const syncData = {
        connectionId,
        workspaceId,
        startedAt: new Date(),
        status: 'completed',
        processedCount: emails.length,
        tasksCreatedCount: tasksCreated,
        completedAt: new Date(),
      };

      await this.redis.setex(`gmail:sync:${syncId}`, 3600, JSON.stringify(syncData));
    } catch (error) {
      console.error(`Gmail sync failed: ${error.message}`);

      const gmailSync = await this.prisma.gmailSync.findUnique({
        where: { workspaceId },
      });

      if (gmailSync) {
        await this.prisma.gmailSync.update({
          where: { workspaceId },
          data: { lastError: error.message },
        });
      }

      throw error;
    }
  }

  /**
   * Parse email from Gmail API response
   */
  private _parseEmail(email: GmailEmail): ParsedEmail {
    const headers = email.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '(No subject)';
    const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';

    let body = email.snippet || '';

    if (email.payload?.parts) {
      for (const part of email.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString();
          break;
        }
      }
    } else if (email.payload?.body?.data) {
      body = Buffer.from(email.payload.body.data, 'base64').toString();
    }

    return {
      googleMessageId: email.id,
      googleThreadId: email.threadId,
      subject: this._sanitizeSubject(subject),
      from,
      body: body.substring(0, 500), // Limit to 500 chars
      snippet: email.snippet,
      receivedAt: new Date(parseInt(email.internalDate)),
      labels: email.labelIds || [],
    };
  }

  /**
   * Sanitize email subject
   */
  private _sanitizeSubject(subject: string): string {
    return subject
      .replace(/^(Re|Fwd|RE|FWD):\s*/i, '')
      .trim()
      .substring(0, 200);
  }

  /**
   * Generate unique ID
   */
  private _generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
