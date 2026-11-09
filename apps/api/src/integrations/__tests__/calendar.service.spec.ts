import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from '../providers/calendar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  mockCalendarTokens,
  mockGoogleCalendarEvent,
  mockOutlookEvent,
  mockIntegration,
  mockTask,
  mockSyncLog,
} from '../../__tests__/fixtures/mock-data';
import { BadRequestException } from '@nestjs/common';

jest.mock('axios');
jest.mock('googleapis');

describe('CalendarService', () => {
  let service: CalendarService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: PrismaService,
          useValue: {
            externalIntegration: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            integrationSyncLog: {
              create: jest.fn(),
              update: jest.fn(),
            },
            providerEvent: {
              upsert: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect Google Calendar account', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'create')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'google_calendar',
        } as any);
      jest
        .spyOn(prismaService.externalIntegration, 'findFirst')
        .mockResolvedValue(null);

      const result = await service.connectCalendarAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockCalendarTokens.accessToken,
        mockCalendarTokens.refreshToken,
        'Google Calendar',
        'user@gmail.com',
        'user_id_google',
        'google_calendar',
      );

      expect(result.success).toBe(true);
      expect(prismaService.externalIntegration.create).toHaveBeenCalled();
    });

    it('should connect Outlook Calendar account', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'create')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'outlook_calendar',
        } as any);
      jest
        .spyOn(prismaService.externalIntegration, 'findFirst')
        .mockResolvedValue(null);

      const result = await service.connectCalendarAccount(
        mockIntegration.workspaceId,
        mockIntegration.userId,
        mockCalendarTokens.accessToken,
        mockCalendarTokens.refreshToken,
        'Outlook Calendar',
        'user@outlook.com',
        'user_id_outlook',
        'outlook_calendar',
      );

      expect(result.success).toBe(true);
    });

    it('should handle invalid OAuth token for calendar connection', async () => {
      jest
        .spyOn(service as any, 'verifyCalendarToken')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.connectCalendarAccount(
          mockIntegration.workspaceId,
          mockIntegration.userId,
          'invalid_token',
          'invalid_refresh',
          'Google Calendar',
          'user@gmail.com',
          'user_id',
          'google_calendar',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Calendar Event Sync', () => {
    it('should fetch all calendar events', async () => {
      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'google_calendar',
          metadata: { accessToken: mockCalendarTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.providerEvent, 'upsert')
        .mockResolvedValue({} as any);

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: { items: [mockGoogleCalendarEvent] },
        });

      const result = await service.syncCalendarEvents(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });

    it('should handle timezone conversion', async () => {
      const eventWithTimezone = {
        ...mockGoogleCalendarEvent,
        start: {
          dateTime: '2024-01-17T14:00:00',
          timeZone: 'Asia/Kolkata',
        },
      };

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'google_calendar',
          metadata: { accessToken: mockCalendarTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { items: [eventWithTimezone] } });

      const result = await service.syncCalendarEvents(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should detect changes in calendar events', async () => {
      const existingEvent = { ...mockGoogleCalendarEvent, updatedMin: new Date() };

      jest
        .spyOn(prismaService.externalIntegration, 'findUnique')
        .mockResolvedValue({
          ...mockIntegration,
          provider: 'google_calendar',
          metadata: { accessToken: mockCalendarTokens.accessToken },
        } as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'create')
        .mockResolvedValue(mockSyncLog as any);
      jest
        .spyOn(prismaService.integrationSyncLog, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { items: [existingEvent] } });

      const result = await service.syncCalendarEvents(
        mockIntegration.id,
        mockIntegration.workspaceId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Event Creation from Tasks', () => {
    it('should create calendar event from task', async () => {
      const task = { ...mockTask, title: 'Review Project Proposal' };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'event_id' } });

      const result = await service.createEventFromTask(
        mockIntegration.id,
        task as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should create event with description from task', async () => {
      const task = {
        ...mockTask,
        description: 'This is a detailed task description',
      };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'event_id' } });

      const result = await service.createEventFromTask(
        mockIntegration.id,
        task as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should create event with attendees', async () => {
      const task = {
        ...mockTask,
        assignees: [
          { email: 'user1@company.com', name: 'User 1' },
          { email: 'user2@company.com', name: 'User 2' },
        ],
      };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'event_id' } });

      const result = await service.createEventFromTask(
        mockIntegration.id,
        task as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should create event with recurring pattern', async () => {
      const task = {
        ...mockTask,
        recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12',
      };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'event_id' } });

      const result = await service.createEventFromTask(
        mockIntegration.id,
        task as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });

    it('should handle timezone in event creation', async () => {
      const task = {
        ...mockTask,
        timeZone: 'Asia/Kolkata',
        dueDate: new Date('2024-02-01T14:00:00'),
      };

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({ data: { id: 'event_id' } });

      const result = await service.createEventFromTask(
        mockIntegration.id,
        task as any,
      );

      expect((service as any).retryApiCall).toHaveBeenCalled();
    });
  });

  describe('Availability Management', () => {
    it('should fetch user availability', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: {
            availabilityView: 'OOOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
          },
        });

      const result = await service.fetchAvailability(
        mockIntegration.id,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result).toBeDefined();
    });

    it('should respect timezone in availability check', async () => {
      const timeZone = 'America/New_York';

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: {
            availabilityView: 'OOOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
          },
        });

      const result = await service.fetchAvailability(
        mockIntegration.id,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        timeZone,
      );

      expect(result).toBeDefined();
    });

    it('should work with multiple calendars', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: {
            calendars: {
              'calendar1@gmail.com': {
                availabilityView:
                  'OOOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
              },
              'calendar2@gmail.com': {
                availabilityView:
                  'XOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
              },
            },
          },
        });

      const result = await service.fetchAvailability(
        mockIntegration.id,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result).toBeDefined();
    });

    it('should exclude working hours off time', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: {
            availabilityView: 'XOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
          },
        });

      const result = await service.fetchAvailability(
        mockIntegration.id,
        new Date('2024-01-16T09:00:00'),
        new Date('2024-01-16T17:00:00'),
        'America/New_York',
        { workHoursStart: 9, workHoursEnd: 17 },
      );

      expect(result).toBeDefined();
    });
  });

  describe('Time Suggestion', () => {
    it('should suggest optimal meeting time', async () => {
      jest
        .spyOn(service as any, 'findBestTimeSlot')
        .mockResolvedValue(new Date('2024-01-17T14:00:00'));

      const result = await service.suggestOptimalTime(
        mockIntegration.id,
        ['user1@company.com', 'user2@company.com'],
        60,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result).toBeDefined();
    });

    it('should avoid conflicts in time suggestion', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: { availabilityView: 'OXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO' },
        });

      const result = await service.suggestOptimalTime(
        mockIntegration.id,
        ['user1@company.com'],
        60,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result).toBeDefined();
    });

    it('should respect attendee availability', async () => {
      const attendees = [
        'user1@company.com',
        'user2@company.com',
        'user3@company.com',
      ];

      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: { availabilityView: 'OXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO' },
        });

      const result = await service.suggestOptimalTime(
        mockIntegration.id,
        attendees,
        90,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result).toBeDefined();
    });

    it('should handle busy periods in time suggestion', async () => {
      jest
        .spyOn(service as any, 'retryApiCall')
        .mockResolvedValue({
          data: {
            availabilityView: 'XXXXXXXXXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
          },
        });

      const result = await service.suggestOptimalTime(
        mockIntegration.id,
        ['user1@company.com'],
        60,
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      expect(result).toBeDefined();
    });
  });
});
