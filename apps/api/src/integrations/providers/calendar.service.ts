import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as moment from 'moment-timezone';

/**
 * CalendarService: Handles Google Calendar and Outlook Calendar integration
 * - Connect calendar accounts
 * - Sync calendar events
 * - Create calendar events from Priorio tasks
 * - Fetch user availability
 * - AI-powered time slot suggestion
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private calendarClient: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeCalendarClient();
  }

  /**
   * Initialize calendar API client
   */
  private initializeCalendarClient(): void {
    this.calendarClient = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Connect calendar account (Google or Outlook)
   */
  async connectCalendarAccount(
    workspaceId: string,
    userId: string,
    provider: 'google' | 'microsoft',
    accessToken: string,
    refreshToken: string,
    displayName: string,
    externalEmail: string,
    externalAccountId: string,
    timezone?: string,
  ): Promise<any> {
    try {
      // Verify token validity
      await this.verifyCalendarToken(provider, accessToken);

      const existing = await this.prisma.externalIntegration.findFirst({
        where: {
          workspaceId,
          userId,
          provider: provider === 'google' ? 'calendar-google' : 'calendar-outlook',
          externalAccountId,
        },
      });

      // Store encrypted tokens and timezone
      const encryptedTokens = {
        accessToken: this.encryptToken(accessToken),
        refreshToken: refreshToken ? this.encryptToken(refreshToken) : null,
        tokenType: 'Bearer',
        timezone: timezone || 'UTC',
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
              provider: provider === 'google' ? 'calendar-google' : 'calendar-outlook',
              displayName,
              externalAccountId,
              externalEmail,
              status: 'CONNECTED',
              metadata: encryptedTokens,
              syncFrequency: 1800, // 30 minutes
            },
          });

      this.logger.log(
        `${provider.toUpperCase()} Calendar connected for user ${userId}`,
      );

      return {
        success: true,
        integrationId: integration.id,
        message: `${provider} calendar account connected successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to connect ${provider} calendar: ${error.message}`,
      );
      throw new BadRequestException(`Failed to connect ${provider} calendar`);
    }
  }

  /**
   * Sync calendar events from provider
   */
  async syncCalendarEvents(
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

      const provider = integration.provider.includes('google')
        ? 'google'
        : 'microsoft';

      const syncLog = await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          syncType: 'events',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      const accessToken = this.decryptToken(
        integration.metadata.accessToken,
      );
      let itemsProcessed = 0;
      let itemsSucceeded = 0;

      try {
        const events = await this.fetchProviderEvents(
          provider,
          accessToken,
          integration.metadata.timezone,
        );

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
                title: event.summary,
                description: event.description,
                startTime: new Date(event.start.dateTime),
                endTime: new Date(event.end.dateTime),
                organizer: event.organizer?.email,
                attendees: event.attendees?.map((a) => a.email) || [],
                location: event.location,
                metadata: {
                  googleCalendarId: event.id,
                  isRecurring: !!event.recurrence,
                  timezone: integration.metadata.timezone,
                },
              },
              update: {
                description: event.description,
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
          `Calendar events synced: ${itemsSucceeded}/${itemsProcessed} events`,
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
        `Failed to sync calendar events: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to sync calendar events');
    }
  }

  /**
   * Create calendar event from Priorio task
   */
  async createEventFromTask(
    integrationId: string,
    taskId: string,
    eventData: {
      title?: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      attendees?: string[];
      location?: string;
    },
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        throw new UnauthorizedException('Integration not connected');
      }

      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new BadRequestException('Task not found');
      }

      const provider = integration.provider.includes('google')
        ? 'google'
        : 'microsoft';
      const accessToken = this.decryptToken(
        integration.metadata.accessToken,
      );
      const timezone = integration.metadata.timezone || 'UTC';

      const eventPayload = {
        summary: eventData.title || task.title,
        description: eventData.description || task.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: timezone,
        },
        attendees: eventData.attendees?.map((email) => ({
          email,
        })) || [],
        location: eventData.location,
      };

      let externalEventId: string;

      if (provider === 'google') {
        const response = await this.retryApiCall(() =>
          this.calendarClient.post(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            eventPayload,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
        );
        externalEventId = response.data.id;
      } else {
        const response = await this.retryApiCall(() =>
          this.calendarClient.post(
            'https://graph.microsoft.com/v1.0/me/events',
            {
              ...eventPayload,
              isReminderOn: true,
              reminderMinutesBeforeStart: 15,
            },
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
        );
        externalEventId = response.data.id;
      }

      // Map task to external event
      await this.prisma.providerTask.create({
        data: {
          integrationId,
          taskId,
          externalTaskId: externalEventId,
          provider,
          externalStatus: 'created',
          syncDirection: 'bidirectional',
          metadata: { eventType: 'calendar' },
        },
      });

      this.logger.log(`Calendar event created from task ${taskId}`);

      return {
        success: true,
        externalEventId,
        message: 'Calendar event created from task',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create calendar event: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to create calendar event',
      );
    }
  }

  /**
   * Fetch user availability for a given date range
   */
  async fetchAvailability(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        throw new UnauthorizedException('Integration not connected');
      }

      const provider = integration.provider.includes('google')
        ? 'google'
        : 'microsoft';
      const accessToken = this.decryptToken(
        integration.metadata.accessToken,
      );
      const timezone = integration.metadata.timezone || 'UTC';

      // Fetch events in date range
      const events = await this.retryApiCall(() =>
        this.fetchProviderEventsByRange(
          provider,
          accessToken,
          startDate,
          endDate,
          timezone,
        ),
      );

      // Calculate free time slots
      const availableSlots = this.calculateAvailableSlots(
        events,
        startDate,
        endDate,
        timezone,
      );

      return {
        success: true,
        availableSlots,
        busyPeriods: events.map((e) => ({
          start: e.start.dateTime,
          end: e.end.dateTime,
          title: e.summary,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch availability: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch availability');
    }
  }

  /**
   * Suggest optimal time slot for a meeting using AI logic
   */
  async suggestOptimalTime(
    integrationId: string,
    duration: number, // minutes
    attendees: string[],
    preferences?: {
      preferredHours?: { start: number; end: number };
      excludeWeekends?: boolean;
      dateRange?: { start: Date; end: Date };
    },
  ): Promise<any> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || integration.status !== 'CONNECTED') {
        throw new UnauthorizedException('Integration not connected');
      }

      const startDate = preferences?.dateRange?.start || new Date();
      const endDate =
        preferences?.dateRange?.end ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const timezone = integration.metadata.timezone || 'UTC';

      // Get availability for primary user
      const availability = await this.fetchAvailability(
        integrationId,
        startDate,
        endDate,
      );

      // Score available slots based on preferences
      const scoredSlots = availability.availableSlots.map((slot) => {
        let score = 100;

        // Prefer morning over evening
        const hour = moment(slot.start)
          .tz(timezone)
          .hour();
        if (hour < 9) score -= 20;
        if (hour > 17) score -= 30;

        // Prefer mid-week over edges
        const day = moment(slot.start).day();
        if (day === 0 || day === 6) score -= 40; // weekends

        // Prefer mid-day
        if (hour >= 10 && hour <= 14) score += 20;

        return { ...slot, score };
      });

      // Return top 5 suggestions sorted by score
      const suggestions = scoredSlots
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        success: true,
        suggestedTimes: suggestions,
        bestOption: suggestions[0],
      };
    } catch (error) {
      this.logger.error(`Failed to suggest optimal time: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to suggest optimal time',
      );
    }
  }

  /**
   * Fetch events from provider
   */
  private async fetchProviderEvents(
    provider: string,
    accessToken: string,
    timezone: string,
  ): Promise<any[]> {
    if (provider === 'google') {
      const response = await this.retryApiCall(() =>
        this.calendarClient.get(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              timeMin: new Date().toISOString(),
              maxResults: 250,
              singleEvents: true,
              orderBy: 'startTime',
            },
          },
        ),
      );
      return response.data.items || [];
    } else {
      const response = await this.retryApiCall(() =>
        this.calendarClient.get(
          'https://graph.microsoft.com/v1.0/me/calendarview',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              startDateTime: new Date().toISOString(),
              endDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              $top: 250,
            },
          },
        ),
      );
      return response.data.value || [];
    }
  }

  /**
   * Fetch events by date range from provider
   */
  private async fetchProviderEventsByRange(
    provider: string,
    accessToken: string,
    startDate: Date,
    endDate: Date,
    timezone: string,
  ): Promise<any[]> {
    if (provider === 'google') {
      const response = await this.retryApiCall(() =>
        this.calendarClient.get(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              timeMin: startDate.toISOString(),
              timeMax: endDate.toISOString(),
              maxResults: 250,
              singleEvents: true,
              orderBy: 'startTime',
            },
          },
        ),
      );
      return response.data.items || [];
    } else {
      const response = await this.retryApiCall(() =>
        this.calendarClient.get(
          'https://graph.microsoft.com/v1.0/me/calendarview',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              startDateTime: startDate.toISOString(),
              endDateTime: endDate.toISOString(),
              $top: 250,
            },
          },
        ),
      );
      return response.data.value || [];
    }
  }

  /**
   * Calculate available time slots from busy periods
   */
  private calculateAvailableSlots(
    events: any[],
    startDate: Date,
    endDate: Date,
    timezone: string,
  ): any[] {
    const slots: any[] = [];
    const workStartHour = 9;
    const workEndHour = 17;

    let current = moment(startDate).tz(timezone).startOf('day');
    const end = moment(endDate).tz(timezone).endOf('day');

    while (current.isBefore(end)) {
      // Skip weekends
      if (current.day() !== 0 && current.day() !== 6) {
        const dayStart = current
          .clone()
          .hour(workStartHour)
          .minute(0)
          .second(0);
        const dayEnd = current
          .clone()
          .hour(workEndHour)
          .minute(0)
          .second(0);

        // Check for conflicts
        const dayEvents = events.filter((e) => {
          const eventStart = moment(e.start.dateTime).tz(timezone);
          const eventEnd = moment(e.end.dateTime).tz(timezone);
          return (
            eventStart.isBefore(dayEnd) && eventEnd.isAfter(dayStart)
          );
        });

        if (dayEvents.length === 0) {
          slots.push({
            start: dayStart.toDate(),
            end: dayEnd.toDate(),
            duration: 480, // 8 hours
          });
        } else {
          // Calculate gaps between events
          let lastEnd = dayStart.clone();
          const sortedEvents = dayEvents.sort((a, b) =>
            moment(a.start.dateTime).diff(moment(b.start.dateTime)),
          );

          for (const event of sortedEvents) {
            const eventStart = moment(event.start.dateTime).tz(timezone);
            if (eventStart.diff(lastEnd, 'minutes') >= 30) {
              slots.push({
                start: lastEnd.toDate(),
                end: eventStart.toDate(),
                duration: eventStart.diff(lastEnd, 'minutes'),
              });
            }
            lastEnd = moment(event.end.dateTime).tz(timezone);
          }

          if (lastEnd.isBefore(dayEnd)) {
            slots.push({
              start: lastEnd.toDate(),
              end: dayEnd.toDate(),
              duration: dayEnd.diff(lastEnd, 'minutes'),
            });
          }
        }
      }

      current.add(1, 'day');
    }

    return slots;
  }

  /**
   * Verify calendar OAuth token validity
   */
  private async verifyCalendarToken(
    provider: string,
    accessToken: string,
  ): Promise<boolean> {
    try {
      if (provider === 'google') {
        await this.retryApiCall(() =>
          this.calendarClient.get(
            'https://www.googleapis.com/calendar/v3/calendars/primary',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          ),
        );
      } else {
        await this.retryApiCall(() =>
          this.calendarClient.get(
            'https://graph.microsoft.com/v1.0/me/calendars',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          ),
        );
      }
      return true;
    } catch (error) {
      this.logger.error(
        `${provider} calendar token verification failed: ${error.message}`,
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
    const key = this.configService.get('ENCRYPTION_KEY', 'default-key');
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt encrypted token
   */
  private decryptToken(encryptedToken: string): string {
    const key = this.configService.get('ENCRYPTION_KEY', 'default-key');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
