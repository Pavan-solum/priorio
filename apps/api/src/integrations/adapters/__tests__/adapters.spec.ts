import { Test, TestingModule } from '@nestjs/testing';
import { TeamsAdapter } from '../teams.adapter';
import { CalendarAdapter } from '../calendar.adapter';
import { OutlookAdapter } from '../outlook.adapter';
import {
  mockTeamsMessage,
  mockTeamsChat,
  mockGoogleCalendarEvent,
  mockOutlookEvent,
  mockOutlookEmail,
} from '../../../__tests__/fixtures/mock-data';

describe('Adapters', () => {
  let teamsAdapter: TeamsAdapter;
  let calendarAdapter: CalendarAdapter;
  let outlookAdapter: OutlookAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamsAdapter, CalendarAdapter, OutlookAdapter],
    }).compile();

    teamsAdapter = module.get<TeamsAdapter>(TeamsAdapter);
    calendarAdapter = module.get<CalendarAdapter>(CalendarAdapter);
    outlookAdapter = module.get<OutlookAdapter>(OutlookAdapter);
  });

  describe('TeamsAdapter', () => {
    it('should format Teams message to standard format', () => {
      const formatted = teamsAdapter.formatMessage(mockTeamsMessage as any);

      expect(formatted).toHaveProperty('id');
      expect(formatted).toHaveProperty('title');
      expect(formatted).toHaveProperty('content');
      expect(formatted).toHaveProperty('sender');
      expect(formatted).toHaveProperty('timestamp');
    });

    it('should convert Teams events', () => {
      const converted = teamsAdapter.convertEvent(mockTeamsChat as any);

      expect(converted).toBeDefined();
      expect(converted.title).toBe(mockTeamsChat.topic);
    });

    it('should map Teams users to Priorio users', () => {
      const mapped = teamsAdapter.mapUser({
        id: 'user123',
        displayName: 'John Doe',
        userPrincipalName: 'john@company.com',
      } as any);

      expect(mapped).toHaveProperty('externalId');
      expect(mapped).toHaveProperty('displayName');
      expect(mapped).toHaveProperty('email');
    });

    it('should extract action URLs from adaptive cards', () => {
      const card = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              type: 'AdaptiveCard',
              body: [
                {
                  type: 'Action.OpenUrl',
                  title: 'View Task',
                  url: 'https://app.example.com/tasks/123',
                },
              ],
            },
          },
        ],
      };

      const urls = teamsAdapter.extractActionUrls(card as any);

      expect(urls).toBeDefined();
      expect(Array.isArray(urls)).toBe(true);
    });
  });

  describe('CalendarAdapter', () => {
    it('should normalize Google Calendar events', () => {
      const normalized = calendarAdapter.normalizeGoogleEvent(
        mockGoogleCalendarEvent as any,
      );

      expect(normalized).toHaveProperty('id');
      expect(normalized).toHaveProperty('title');
      expect(normalized).toHaveProperty('startTime');
      expect(normalized).toHaveProperty('endTime');
      expect(normalized).toHaveProperty('attendees');
    });

    it('should normalize Outlook Calendar events', () => {
      const normalized = calendarAdapter.normalizeOutlookEvent(
        mockOutlookEvent as any,
      );

      expect(normalized).toHaveProperty('id');
      expect(normalized).toHaveProperty('title');
      expect(normalized).toHaveProperty('startTime');
      expect(normalized).toHaveProperty('endTime');
    });

    it('should convert timezone using moment-timezone', () => {
      const converted = calendarAdapter.convertTimezone(
        '2024-01-17T14:00:00',
        'Asia/Kolkata',
        'America/New_York',
      );

      expect(converted).toBeDefined();
      expect(typeof converted).toBe('string');
    });

    it('should calculate free time slots', () => {
      const availability = {
        availabilityView: 'OXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
      };

      const slots = calendarAdapter.calculateFreeSlots(
        availability as any,
        new Date('2024-01-16T08:00:00'),
        new Date('2024-01-16T18:00:00'),
      );

      expect(Array.isArray(slots)).toBe(true);
    });

    it('should check availability for specific time', () => {
      const available = calendarAdapter.isTimeAvailable(
        {
          availabilityView: 'OOOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXOXO',
        } as any,
        new Date('2024-01-16T14:00:00'),
      );

      expect(typeof available).toBe('boolean');
    });

    it('should compute meeting duration', () => {
      const duration = calendarAdapter.computeDuration(
        new Date('2024-01-16T14:00:00'),
        new Date('2024-01-16T15:30:00'),
      );

      expect(duration).toBe(90);
    });

    it('should format events for display', () => {
      const formatted = calendarAdapter.formatEventForDisplay(
        mockGoogleCalendarEvent as any,
      );

      expect(formatted).toHaveProperty('title');
      expect(formatted).toHaveProperty('displayTime');
      expect(formatted).toHaveProperty('attendeeCount');
    });
  });

  describe('OutlookAdapter', () => {
    it('should format emails for display', () => {
      const formatted = outlookAdapter.formatEmail(mockOutlookEmail as any);

      expect(formatted).toHaveProperty('id');
      expect(formatted).toHaveProperty('subject');
      expect(formatted).toHaveProperty('from');
      expect(formatted).toHaveProperty('preview');
    });

    it('should extract actionable items from email', () => {
      const email = {
        ...mockOutlookEmail,
        body: {
          contentType: 'HTML',
          content:
            'Please review the document. Action needed by Friday. TODO: Update status.',
        },
      };

      const items = outlookAdapter.extractActionableItems(email as any);

      expect(Array.isArray(items)).toBe(true);
    });

    it('should categorize emails', () => {
      const categories = outlookAdapter.categorizeEmail(mockOutlookEmail as any);

      expect(typeof categories).toBe('string');
      expect(['meeting', 'action', 'notification', 'spam']).toContain(
        categories,
      );
    });

    it('should extract attachment metadata', () => {
      const metadata = outlookAdapter.extractAttachmentMetadata(
        mockOutlookEmail as any,
      );

      expect(Array.isArray(metadata)).toBe(true);
      if (metadata.length > 0) {
        expect(metadata[0]).toHaveProperty('name');
        expect(metadata[0]).toHaveProperty('size');
      }
    });

    it('should format emails for task creation', () => {
      const taskData = outlookAdapter.formatEmailForTaskCreation(
        mockOutlookEmail as any,
      );

      expect(taskData).toHaveProperty('title');
      expect(taskData).toHaveProperty('description');
      expect(taskData).toHaveProperty('source');
    });

    it('should extract email signatures', () => {
      const email = {
        ...mockOutlookEmail,
        body: {
          contentType: 'HTML',
          content:
            'Message content<br/>--<br/>John Smith<br/>Manager<br/>Company Inc.',
        },
      };

      const signature = outlookAdapter.extractSignature(email as any);

      expect(signature).toBeDefined();
    });

    it('should detect if response is needed', () => {
      const needsResponse = outlookAdapter.needsResponse(
        mockOutlookEmail as any,
      );

      expect(typeof needsResponse).toBe('boolean');
    });

    it('should analyze email thread participants', () => {
      const participants = outlookAdapter.analyzeThreadParticipants(
        mockOutlookEmail as any,
      );

      expect(Array.isArray(participants)).toBe(true);
      if (participants.length > 0) {
        expect(participants[0]).toHaveProperty('email');
      }
    });
  });
});
