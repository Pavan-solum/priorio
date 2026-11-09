import { Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment-timezone';

/**
 * CalendarAdapter: Normalizes calendar events and handles timezone conversion
 * - Event normalization
 * - Timezone conversion
 * - Availability calculation
 */
@Injectable()
export class CalendarAdapter {
  private readonly logger = new Logger(CalendarAdapter.name);

  /**
   * Normalize Google Calendar event
   */
  normalizeGoogleCalendarEvent(event: any): any {
    return {
      id: event.id,
      source: 'google-calendar',
      title: event.summary,
      description: event.description,
      startTime: new Date(event.start.dateTime || event.start.date),
      endTime: new Date(event.end.dateTime || event.end.date),
      organizer: {
        email: event.organizer?.email,
        name: event.organizer?.displayName,
      },
      attendees: event.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
        optional: a.optional || false,
      })) || [],
      location: event.location,
      isAllDay: !event.start.dateTime,
      isRecurring: !!event.recurringEventId,
      url: event.htmlLink,
      metadata: {
        conference: event.conferenceData?.conferenceSolution?.name,
        conferenceUrl: event.conferenceData?.entryPoints?.[0]?.uri,
        attachments: event.attachments || [],
      },
    };
  }

  /**
   * Normalize Outlook Calendar event
   */
  normalizeOutlookCalendarEvent(event: any): any {
    return {
      id: event.id,
      source: 'outlook-calendar',
      title: event.subject,
      description: event.bodyPreview,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      organizer: {
        email: event.organizer?.emailAddress?.address,
        name: event.organizer?.emailAddress?.name,
      },
      attendees: event.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        status: a.status?.response,
        optional: a.type === 'optional',
      })) || [],
      location: event.location?.displayName,
      isAllDay: event.isAllDay,
      isRecurring: !!event.recurrence,
      url: event.webLink,
      isOnlineMeeting: event.isOnlineMeeting,
      metadata: {
        conferenceUrl: event.isOnlineMeeting ? event.onlineMeeting?.joinUrl : null,
        categories: event.categories || [],
        reminderMinutes: event.reminderMinutesBeforeStart,
      },
    };
  }

  /**
   * Convert timezone for event
   */
  convertEventTimezone(
    event: any,
    fromTimezone: string,
    toTimezone: string,
  ): any {
    const startTime = moment(event.startTime)
      .tz(fromTimezone)
      .tz(toTimezone);
    const endTime = moment(event.endTime)
      .tz(fromTimezone)
      .tz(toTimezone);

    return {
      ...event,
      startTime: startTime.toDate(),
      endTime: endTime.toDate(),
      timezone: toTimezone,
      displayTimeRange: `${startTime.format('MMM D, h:mm A')} - ${endTime.format('h:mm A')} ${toTimezone}`,
    };
  }

  /**
   * Calculate free time slots
   */
  calculateFreeSlots(
    busyPeriods: any[],
    startDate: Date,
    endDate: Date,
    timezone: string,
    slotDuration: number = 30, // minutes
  ): any[] {
    const slots: any[] = [];
    const workStartHour = 9;
    const workEndHour = 17;

    let current = moment(startDate).tz(timezone).startOf('day');
    const end = moment(endDate).tz(timezone).endOf('day');

    while (current.isBefore(end)) {
      if (current.day() !== 0 && current.day() !== 6) {
        const dayStart = current
          .clone()
          .hour(workStartHour)
          .minute(0);
        const dayEnd = current
          .clone()
          .hour(workEndHour)
          .minute(0);

        // Find free slots for this day
        let currentSlotStart = dayStart.clone();

        for (const busy of busyPeriods) {
          const busyStart = moment(busy.startTime).tz(timezone);
          const busyEnd = moment(busy.endTime).tz(timezone);

          if (busyStart.isSame(currentSlotStart, 'day')) {
            const gapBefore = busyStart.diff(currentSlotStart, 'minutes');

            if (gapBefore >= slotDuration) {
              slots.push({
                start: currentSlotStart.toDate(),
                end: busyStart.toDate(),
                duration: gapBefore,
              });
            }

            currentSlotStart = busyEnd.clone();
          }
        }

        // Add final slot if any
        const finalGap = dayEnd.diff(currentSlotStart, 'minutes');
        if (finalGap >= slotDuration) {
          slots.push({
            start: currentSlotStart.toDate(),
            end: dayEnd.toDate(),
            duration: finalGap,
          });
        }
      }

      current.add(1, 'day');
    }

    return slots;
  }

  /**
   * Check availability for time slot
   */
  isSlotAvailable(
    slot: { start: Date; end: Date },
    busyPeriods: any[],
  ): boolean {
    const slotStart = moment(slot.start);
    const slotEnd = moment(slot.end);

    for (const busy of busyPeriods) {
      const busyStart = moment(busy.startTime);
      const busyEnd = moment(busy.endTime);

      if (slotStart.isBefore(busyEnd) && slotEnd.isAfter(busyStart)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate meeting duration in hours
   */
  getMeetingDuration(event: any): number {
    const start = moment(event.startTime);
    const end = moment(event.endTime);
    return end.diff(start, 'hours', true);
  }

  /**
   * Find overlapping events
   */
  findOverlappingEvents(event: any, events: any[]): any[] {
    const eventStart = moment(event.startTime);
    const eventEnd = moment(event.endTime);

    return events.filter((e) => {
      const eStart = moment(e.startTime);
      const eEnd = moment(e.endTime);

      return (
        eventStart.isBefore(eEnd) && eventEnd.isAfter(eStart)
      );
    });
  }

  /**
   * Format event for display
   */
  formatEventForDisplay(
    event: any,
    timezone: string = 'UTC',
  ): any {
    const start = moment(event.startTime).tz(timezone);
    const end = moment(event.endTime).tz(timezone);
    const duration = end.diff(start, 'minutes');

    return {
      ...event,
      displayTitle: event.title,
      displayTime: `${start.format('h:mm A')} - ${end.format('h:mm A')}`,
      displayDate: start.format('MMM D, YYYY'),
      displayDateTime: start.format('ddd MMM D, YYYY h:mm A'),
      duration,
      durationFormatted: this.formatDuration(duration),
      timezone,
      badges: [
        event.isAllDay ? 'All Day' : null,
        event.isRecurring ? 'Recurring' : null,
        event.isOnlineMeeting ? 'Online' : null,
      ].filter(Boolean),
    };
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Validate calendar event
   */
  validateCalendarEvent(event: any): boolean {
    return !!(
      event.id &&
      event.title &&
      event.startTime &&
      event.endTime &&
      new Date(event.startTime) < new Date(event.endTime)
    );
  }
}
