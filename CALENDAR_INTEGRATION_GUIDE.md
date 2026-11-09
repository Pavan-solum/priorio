# Priorio Calendar Integration Guide

**Version**: 7.0  
**Date**: November 2024  
**Status**: Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Features](#features)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

Priorio's Calendar integration supports both Google Calendar and Microsoft Outlook Calendar, enabling seamless synchronization of events, availability tracking, and intelligent meeting time suggestions.

### Supported Calendar Systems

- **Google Calendar** - Personal, workspace, and shared calendars
- **Microsoft Outlook Calendar** - Personal, shared, and delegated calendars
- **Multi-Calendar Support** - Sync from multiple calendars simultaneously

### Key Benefits

- **Availability Sync**: Automatically block calendar time for tasks
- **Meeting Suggestions**: Intelligent algorithm to find best meeting times
- **Time Zone Handling**: Automatic conversion and management
- **Conflict Detection**: Identify overlapping events
- **Recurring Events**: Full support for event recurrence

---

## Setup Instructions

### Google Calendar Setup

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project:
   - **Project name**: Priorio Calendar Integration
   - Click **Create**

3. Enable Google Calendar API:
   - Search for "Google Calendar API"
   - Click **Enable**

#### Step 2: Configure OAuth Credentials

1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Select **Web application**
3. Configure:
   - **Name**: Priorio Calendar
   - **Authorized JavaScript origins**: `https://app.priorio.app`
   - **Authorized redirect URIs**: 
     - `https://api.priorio.app/oauth/google-calendar/callback`
     - `https://api.priorio.app/oauth/google/callback`

4. Click **Create**
5. Download JSON credentials

#### Step 3: Configure in Priorio

Add to environment or admin console:

```bash
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=https://api.priorio.app/oauth/google-calendar/callback
```

### Outlook Calendar Setup

#### Step 1: Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   - **Name**: Priorio Calendar
   - **Redirect URI**: Web - `https://api.priorio.app/oauth/outlook-calendar/callback`

#### Step 2: Configure Permissions

1. **API permissions** → **Add a permission**
2. Select **Microsoft Graph**
3. Add **Delegated permissions**:

```
Calendar.Read
Calendar.ReadWrite
User.Read
```

4. Grant admin consent

#### Step 3: Add Credentials

1. **Certificates & secrets** → **New client secret**
2. Store securely in environment

#### Step 4: Configure in Priorio

```bash
MICROSOFT_CALENDAR_CLIENT_ID=your-client-id
MICROSOFT_CALENDAR_CLIENT_SECRET=your-client-secret
MICROSOFT_CALENDAR_TENANT_ID=your-tenant-id
MICROSOFT_CALENDAR_REDIRECT_URI=https://api.priorio.app/oauth/outlook-calendar/callback
```

---

## Features

### 1. Event Synchronization

**Real-Time Calendar Sync**:
- Bi-directional sync with calendars
- New events appear within 5 minutes
- Updates propagate automatically
- Deletion sync support
- Recurrence handling

**Sync Configuration**:

```typescript
interface CalendarSyncConfig {
  calendarId: string;
  enabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  bidirectional: boolean;
  eventFilter?: {
    eventTypes?: ('meeting' | 'busy' | 'free' | 'out_of_office')[];
    organizers?: string[];
    attendees?: string[];
    minDuration?: number;
  };
  taskIntegration?: {
    createTasksFromEvents: boolean;
    excludeOwnEvents: boolean;
    defaultTaskPriority: 'low' | 'medium' | 'high';
  };
}
```

### 2. Availability Calculation

**Time Zone Handling**:
- User timezone automatically detected
- Convert meeting times across zones
- Display in local and UTC
- DST handling automatic

**Availability Scoring**:

```
Algorithm:
1. Get all calendar events in date range
2. Convert to user timezone
3. Calculate busy blocks
4. Rate each time slot:
   - Available = 100%
   - Busy = 0%
   - Tentative = 50%
   - Out of office = 0%
5. Return scored availability
```

**Query Format**:

```typescript
interface AvailabilityQuery {
  calendarId: string;
  from: Date;
  to: Date;
  timezone: string;
  minSlotDuration: number; // minutes
  excludeDeclined?: boolean;
  excludeTentative?: boolean;
}
```

### 3. Multi-Calendar Support

**Sync Multiple Calendars**:
- Primary calendar (always synced)
- Additional shared calendars
- Delegated calendars
- Team calendars

**Manage Calendars**:
```typescript
interface CalendarInfo {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'shared' | 'delegated';
  owner: string;
  timezone: string;
  canEdit: boolean;
  eventCount: number;
  lastSyncedAt: Date;
}
```

### 4. Meeting Time Suggestion

**Intelligent Algorithm**:

```
For each suggested time slot:
1. Check availability for all attendees
2. Avoid early morning / late evening
3. Prefer lunch hour spacing
4. Account for travel time (15min default)
5. Score by:
   - Attendee count free (weight: 40%)
   - Preferred hours (weight: 30%)
   - Meeting distance from other meetings (weight: 20%)
   - Day of week preference (weight: 10%)
6. Return top 5 suggestions
```

**Suggestion Request**:

```typescript
interface MeetingSuggestionRequest {
  attendees: string[]; // email addresses
  duration: number; // minutes
  dateRange: {
    from: Date;
    to: Date;
  };
  preferredHours?: {
    start: number; // 9
    end: number; // 17
  };
  excludeDays?: number[]; // 0=Sunday, 6=Saturday
  minDaySpacing?: number; // minutes between meetings
  timezone: string;
}
```

### 5. Task-Calendar Integration

**Create Calendar Events from Tasks**:
- Auto-block calendar time
- Sync task status to calendar
- Link calendar event to task

**Configuration**:

```typescript
interface TaskCalendarConfig {
  autoCreateEvents: boolean;
  blockTime: boolean;
  eventDuration: number; // minutes
  eventCategory: string; // "Work", "Personal"
  eventReminders?: number[]; // [15, 60] = 15 min, 1 hour
  updateEventOnTaskChange: boolean;
}
```

---

## API Endpoints

### Google Calendar

#### 1. Connect Google Calendar
```
POST /integrations/google-calendar/connect

Request:
{
  "code": "auth-code-from-oauth",
  "calendarId": "primary" // optional
}

Response (200):
{
  "integration": {
    "id": "integ-gcal-1",
    "provider": "google_calendar",
    "accountName": "user@gmail.com",
    "calendars": [
      {
        "id": "primary",
        "name": "John Doe",
        "timezone": "America/New_York"
      }
    ]
  }
}
```

#### 2. Get Google Calendars
```
GET /integrations/google-calendar/calendars

Response (200):
{
  "calendars": [
    {
      "id": "primary",
      "name": "Primary Calendar",
      "description": "Default calendar",
      "timezone": "America/New_York",
      "canEdit": true
    }
  ]
}
```

#### 3. Get Google Calendar Events
```
GET /integrations/google-calendar/events?from=2024-11-01&to=2024-11-30&calendarId=primary

Response (200):
{
  "events": [
    {
      "id": "event-1",
      "title": "Team Meeting",
      "startTime": "2024-11-01T10:00:00Z",
      "endTime": "2024-11-01T11:00:00Z",
      "organizer": "john@example.com",
      "attendees": [
        { "email": "jane@example.com", "status": "accepted" }
      ],
      "isRecurring": false,
      "calendar": "primary"
    }
  ]
}
```

### Outlook Calendar

#### 1. Connect Outlook Calendar
```
POST /integrations/outlook-calendar/connect

Request:
{
  "code": "auth-code-from-oauth",
  "calendarId": "calendar" // optional
}

Response (200):
{
  "integration": {
    "id": "integ-outlook-1",
    "provider": "outlook_calendar",
    "accountName": "user@company.com",
    "calendars": [
      {
        "id": "calendar",
        "name": "Calendar",
        "timezone": "America/New_York"
      }
    ]
  }
}
```

#### 2. Get Outlook Calendars
```
GET /integrations/outlook-calendar/calendars

Response (200):
{
  "calendars": [
    {
      "id": "calendar",
      "name": "Calendar",
      "timezone": "America/New_York",
      "canEdit": true,
      "owner": "user@company.com"
    }
  ]
}
```

#### 3. Get Outlook Calendar Events
```
GET /integrations/outlook-calendar/events?from=2024-11-01&to=2024-11-30

Response (200):
{
  "events": [
    {
      "id": "event-1",
      "title": "Team Standup",
      "startTime": "2024-11-01T09:00:00Z",
      "endTime": "2024-11-01T09:30:00Z",
      "organizer": "john@company.com",
      "categories": ["Work"],
      "isRecurring": true,
      "recurrencePattern": "daily"
    }
  ]
}
```

### Availability Endpoints

#### 1. Get Availability
```
GET /calendar/availability?from=2024-11-02&to=2024-11-07&timezone=America/New_York

Response (200):
{
  "availability": [
    {
      "date": "2024-11-02",
      "slots": [
        { "time": "09:00", "available": true, "score": 1.0 },
        { "time": "10:00", "available": false, "score": 0.0 },
        { "time": "14:00", "available": true, "score": 0.9 }
      ]
    }
  ]
}
```

#### 2. Suggest Meeting Time
```
POST /calendar/suggest-meeting-time

Request:
{
  "attendees": ["john@example.com", "jane@example.com"],
  "duration": 60,
  "dateRange": {
    "from": "2024-11-02",
    "to": "2024-11-07"
  },
  "preferredHours": { "start": 9, "end": 17 },
  "timezone": "America/New_York"
}

Response (200):
{
  "suggestions": [
    {
      "startTime": "2024-11-02T14:00:00Z",
      "endTime": "2024-11-02T15:00:00Z",
      "confidence": 0.95,
      "availableAttendees": 2,
      "conflicts": []
    },
    {
      "startTime": "2024-11-03T10:00:00Z",
      "endTime": "2024-11-03T11:00:00Z",
      "confidence": 0.87,
      "availableAttendees": 2,
      "conflicts": []
    }
  ]
}
```

### Event Operations

#### 1. Create Calendar Event
```
POST /calendar/events

Request:
{
  "calendarId": "primary",
  "title": "Project Review",
  "description": "Quarterly project review meeting",
  "startTime": "2024-11-15T10:00:00Z",
  "endTime": "2024-11-15T11:00:00Z",
  "attendees": ["john@example.com", "jane@example.com"],
  "location": "Conference Room A",
  "reminders": [15, 60],
  "provider": "google" | "outlook"
}

Response (201):
{
  "eventId": "event-new",
  "title": "Project Review",
  "calendarLink": "https://calendar.google.com/..."
}
```

#### 2. Update Calendar Event
```
PATCH /calendar/events/{eventId}

Request:
{
  "title": "Project Review (Rescheduled)",
  "startTime": "2024-11-15T14:00:00Z",
  "endTime": "2024-11-15T15:00:00Z"
}

Response (200):
{
  "eventId": "event-new",
  "updated": true
}
```

---

## Usage Examples

### Example 1: Connect Google Calendar

```typescript
import { PriorioClient } from '@priorio/sdk';

const client = new PriorioClient({ apiKey: 'key' });

async function connectGoogleCalendar() {
  try {
    // Get auth URL
    const { authUrl } = await client.calendar.google.getAuthUrl();
    console.log('Visit:', authUrl);
    
    // After user authorizes (gets code)
    const code = 'code-from-redirect';
    const integration = await client.calendar.google.connect({ code });
    
    console.log('Connected to:', integration.accountName);
    
    // List calendars
    const { calendars } = await client.calendar.google.getCalendars();
    console.log('Calendars:', calendars.map(c => c.name));
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Example 2: Get Availability

```typescript
async function checkAvailability() {
  try {
    const availability = await client.calendar.getAvailability({
      from: new Date('2024-11-02'),
      to: new Date('2024-11-07'),
      timezone: 'America/New_York',
      minSlotDuration: 60
    });
    
    // Find best available slot
    const bestDay = availability.find(day =>
      day.slots.some(slot => slot.score > 0.8)
    );
    
    if (bestDay) {
      const bestSlot = bestDay.slots
        .filter(s => s.score > 0.8)
        .sort((a, b) => b.score - a.score)[0];
      
      console.log(`Best time: ${bestDay.date} at ${bestSlot.time}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Example 3: Suggest Meeting Time

```typescript
async function suggestMeetingTime() {
  try {
    const suggestions = await client.calendar.suggestMeetingTime({
      attendees: [
        'john@example.com',
        'jane@example.com',
        'bob@example.com'
      ],
      duration: 60,
      dateRange: {
        from: new Date('2024-11-02'),
        to: new Date('2024-11-07')
      },
      preferredHours: { start: 9, end: 17 },
      timezone: 'America/New_York'
    });
    
    console.log('Top suggestion:');
    console.log(`Time: ${suggestions[0].startTime}`);
    console.log(`Confidence: ${(suggestions[0].confidence * 100).toFixed(0)}%`);
    console.log(`All attendees available: ${suggestions[0].conflicts.length === 0}`);
    
    // Share with team
    const attendeeList = ['john@example.com', 'jane@example.com', 'bob@example.com'];
    console.log(`Invite: ${attendeeList.join(', ')}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Example 4: Create Event and Link to Task

```typescript
async function createEventFromTask(taskId: string) {
  try {
    // Get task
    const task = await client.tasks.get(taskId);
    
    // Create calendar event
    const event = await client.calendar.createEvent({
      calendarId: 'primary',
      title: task.title,
      description: task.description,
      startTime: new Date(task.dueDate),
      endTime: new Date(new Date(task.dueDate).getTime() + 60 * 60000), // +1 hour
      provider: 'google'
    });
    
    // Update task with event link
    await client.tasks.update(taskId, {
      calendarEventId: event.eventId,
      calendarLink: event.calendarLink
    });
    
    console.log('Event created and linked to task');
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## Troubleshooting

### Issue: "Cannot access calendar"

**Solution**:
1. Verify OAuth scopes include Calendar.Read
2. Check user has access to calendar
3. Confirm calendar ID is correct
4. Verify access token hasn't expired

### Issue: Events not syncing

**Solution**:
1. Check calendar sync is enabled
2. Verify last sync time is recent
3. Check API rate limits
4. Review error logs
5. Manually trigger sync

### Issue: Time zone conversion errors

**Solution**:
1. Use IANA timezone format (e.g., "America/New_York")
2. Verify user timezone in settings
3. Check recurring event rules
4. Confirm calendar timezone

### Issue: Meeting suggestions not accurate

**Solution**:
1. Verify all attendees have integrated calendars
2. Increase date range for more options
3. Adjust preferred hours
4. Check attendee calendars for availability
5. Ensure time zone is correct

---

## Best Practices

### 1. Calendar Sync

✅ DO:
- Enable bi-directional sync
- Set realistic sync frequency
- Monitor sync logs
- Handle conflicts properly
- Test with multiple calendars

❌ DON'T:
- Sync sensitive calendars without permission
- Create duplicate events
- Ignore time zone issues
- Poll constantly (use webhooks)
- Skip error handling

### 2. Availability Management

✅ DO:
- Mark "Out of Office" time
- Maintain accurate calendars
- Update availability frequently
- Communicate schedule changes
- Account for preparation time

❌ DON'T:
- Suggest times without checking calendar
- Ignore tentative meetings
- Forget time zone conversions
- Overbook calendars
- Ignore recurring events

### 3. Privacy and Permissions

✅ DO:
- Only sync allowed calendars
- Respect privacy settings
- Get explicit user consent
- Honor calendar sharing rules
- Audit access regularly

❌ DON'T:
- Share calendar without permission
- Expose private event details
- Sync to unauthorized systems
- Bypass permission checks
- Store calendar data insecurely

---

**Document Version**: 7.0  
**Last Updated**: November 2024  
**Status**: Complete
