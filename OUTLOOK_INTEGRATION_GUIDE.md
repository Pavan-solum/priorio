# Priorio Outlook Integration Guide

**Version**: 7.0  
**Date**: November 2024  
**Status**: Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Email Features](#email-features)
4. [Calendar Features](#calendar-features)
5. [API Endpoints](#api-endpoints)
6. [Code Examples](#code-examples)
7. [Permission Requirements](#permission-requirements)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Priorio's Outlook integration enables comprehensive synchronization of both email and calendar data from Microsoft Outlook. Create tasks from emails, sync calendar availability, and maintain full bidirectional sync with Outlook.

### Supported Features

- **Email Sync**: Inbox, folders, labels, and attachments
- **Email-to-Task**: Convert emails to actionable tasks
- **Calendar Sync**: Events, recurrence, availability
- **Attachment Handling**: Download and link attachments
- **Search and Filter**: Advanced email search capabilities
- **Read Status**: Track read/unread emails
- **Spam Handling**: Automatic spam folder management

### Requirements

- Microsoft 365 account or Outlook.com
- Azure AD application registration
- OAuth 2.0 configuration
- Appropriate scopes granted

---

## Setup Instructions

### Step 1: Register Azure AD Application

**Prerequisites**:
- Azure AD tenant access
- Admin permissions

**Process**:

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Select **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in details:
   - **Name**: Priorio Outlook Integration
   - **Supported account types**: Multitenant
   - **Redirect URI**: 
     - Web: `https://api.priorio.app/oauth/outlook/callback`
     - Web: `https://app.priorio.app/oauth/outlook/callback`

5. Click **Register**

### Step 2: Configure Client Credentials

1. In **Certificates & secrets**:
   - Click **New client secret**
   - Set description: Priorio Outlook Integration
   - Set expiry: 24 months
   - Click **Add**
   - **Copy the value immediately** (won't be shown again)

2. Note these values:
   - **Application (Client) ID**
   - **Directory (Tenant) ID**
   - **Client Secret** (just created)

3. Store securely in environment variables:
```bash
OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_TENANT_ID=your-tenant-id
```

### Step 3: Configure API Permissions

1. In **API permissions** tab:
   - Click **Add a permission**
   - Select **Microsoft Graph**
   - Choose **Delegated permissions**

2. Add these permissions:

**Email Permissions**:
```
Mail.Read
Mail.ReadWrite
Mail.Send
MailboxSettings.Read
MailboxSettings.ReadWrite
```

**Calendar Permissions**:
```
Calendar.Read
Calendar.ReadWrite
Calendars.Manage (optional, for creating events)
```

**User Permissions**:
```
User.Read
Contacts.Read (for address book)
```

3. Click **Grant admin consent for your organization**
4. Verify all permissions show "✓ Granted"

### Step 4: Configure Redirect URIs

1. Go to **Authentication** tab
2. Under **Redirect URIs**, add both:
   - `https://api.priorio.app/oauth/outlook/callback`
   - `https://app.priorio.app/oauth/outlook/callback`

3. Under **Advanced settings**:
   - Set **Treat application as public client**: No
   - Click **Save**

### Step 5: Configure in Priorio

In Priorio admin console, update OAuth settings:

```json
{
  "outlook": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "tenantId": "YOUR_TENANT_ID",
    "redirectUri": "https://api.priorio.app/oauth/outlook/callback",
    "scopes": [
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "Calendar.Read",
      "Calendar.ReadWrite",
      "User.Read",
      "MailboxSettings.Read"
    ]
  }
}
```

---

## Email Features

### 1. Email Synchronization

**What Gets Synced**:
- Email messages (sender, subject, body, date)
- Message headers and metadata
- Conversation threads
- Attachments (file info, size)
- Read/unread status
- Folder structure
- Labels and categories

**Sync Configuration**:

```typescript
interface EmailSyncConfig {
  foldersToSync?: string[]; // "Inbox", "Sent", etc.
  syncAttachments: boolean;
  attachmentSizeLimit: number; // bytes
  downloadAttachments: boolean;
  preserveFolderStructure: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  messageFilter?: {
    from?: string[];
    subject?: string;
    since?: Date;
    hasAttachments?: boolean;
    isUnread?: boolean;
  };
}
```

**Supported Folders**:
- Inbox
- Sent Items
- Drafts
- Deleted Items
- Junk Email
- Archive
- Custom folders

### 2. Email-to-Task Conversion

**Convert Individual Email**:
```
1. User opens email in Outlook or Priorio
2. Clicks "Create Priorio Task"
3. Task created with:
   - Subject as task title
   - Email body as description
   - Sender as context
   - Attachments linked
   - Link back to email
```

**Automatic Conversion**:
- Flag emails with special keywords
- Emails from specific senders → auto-create tasks
- Email categories → task tags
- Email priority → task priority

**Configuration**:

```typescript
interface EmailToTaskConfig {
  enabled: boolean;
  triggerConditions?: {
    keywords?: string[]; // ["action", "urgent"]
    fromAddresses?: string[];
    categories?: string[];
    hasAttachments?: boolean;
    importance?: 'high' | 'normal' | 'low';
  };
  taskDefaults?: {
    priority?: 'high' | 'medium' | 'low';
    tags?: string[];
    category?: string;
  };
  includeAttachments: boolean;
  archiveAfterConversion: boolean;
}
```

### 3. Folder Management

**Sync Folders**:
```typescript
interface FolderConfig {
  folderId: string;
  name: string;
  parentId?: string;
  syncEnabled: boolean;
  taskCategory?: string;
  autoCreateTasks: boolean;
}
```

**Supported Operations**:
- List all folders
- Create new folder
- Move messages between folders
- Delete messages
- Archive messages
- Set folder permissions

### 4. Search and Filter

**Search Parameters**:

```typescript
interface EmailSearchParams {
  query: string; // "from:john@example.com subject:important"
  from?: string[];
  to?: string[];
  subject?: string;
  bodyContains?: string;
  since?: Date;
  until?: Date;
  hasAttachments?: boolean;
  isUnread?: boolean;
  categories?: string[];
  importance?: 'high' | 'normal' | 'low';
  limit?: number;
  offset?: number;
}
```

**Query Syntax**:
```
from:sender@example.com          # From specific sender
subject:"meeting notes"          # Exact subject match
has:attachment                   # Has attachments
is:unread                        # Unread messages
category:Work                    # Specific category
importance:high                  # High importance
```

### 5. Attachment Handling

**Attachment Information**:

```typescript
interface AttachmentInfo {
  id: string;
  filename: string;
  size: number; // bytes
  mimeType: string;
  isInline: boolean;
  createdAt: Date;
  downloadUrl: string;
}
```

**Operations**:
- Download attachments
- List attachments
- Link to task
- Preview in UI
- Scan for malware (optional)

---

## Calendar Features

### 1. Event Synchronization

**What Gets Synced**:
- Event title and description
- Start and end times
- Event location
- Attendees and RSVP status
- Organizer information
- Recurrence rules
- Reminders and notifications
- Categories/color coding

**Event Sync Configuration**:

```typescript
interface CalendarSyncConfig {
  calendarId: string;
  enabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  bidirectional: boolean;
  eventFilter?: {
    categories?: string[];
    organizers?: string[];
    minDuration?: number;
    excludeDeclined?: boolean;
  };
}
```

### 2. Recurrence Handling

**Supported Patterns**:
- Daily, Weekly, Monthly, Yearly
- Custom patterns (e.g., every 2 weeks)
- Exceptions to recurring events
- End dates and occurrence limits

**Recurrence Example**:
```typescript
interface RecurrenceRule {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // repeat every N days/weeks/months
  daysOfWeek?: string[]; // ["monday", "wednesday"]
  dayOfMonth?: number; // 15
  month?: number; // 1-12
  firstDayOfWeek?: string; // "sunday"
  numberOfOccurrences?: number;
  recurrenceTimeZone?: string;
  endDate?: Date;
}
```

### 3. Organizer Information

**Track Event Details**:
```typescript
interface EventOrganizer {
  name: string;
  email: string;
  status?: 'organizer' | 'attendee';
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'notResponded';
}
```

---

## API Endpoints

### Email Operations

#### 1. Connect Outlook Account
```
POST /integrations/outlook/connect

Request:
{
  "code": "auth-code-from-oauth",
  "scopes": ["Mail.Read", "Calendar.Read"]
}

Response (200):
{
  "integration": {
    "id": "integ-outlook-1",
    "provider": "outlook",
    "accountName": "user@company.com",
    "mailboxes": ["Inbox"],
    "status": "active",
    "connectedAt": "2024-11-01T10:00:00Z"
  }
}
```

#### 2. Get Emails
```
GET /integrations/outlook/emails?folder=Inbox&limit=50&unread=false

Response (200):
{
  "emails": [
    {
      "id": "msg-1",
      "from": "sender@example.com",
      "subject": "Project Update",
      "receivedAt": "2024-11-01T09:30:00Z",
      "isRead": true,
      "categories": ["Work"],
      "importance": "normal",
      "hasAttachments": true,
      "attachmentCount": 2,
      "previewText": "Here's the latest project update..."
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

#### 3. Get Email Detail
```
GET /integrations/outlook/emails/{emailId}

Response (200):
{
  "id": "msg-1",
  "from": "sender@example.com",
  "to": ["user@company.com"],
  "cc": ["manager@company.com"],
  "subject": "Q4 Planning",
  "bodyText": "Let's discuss Q4 planning...",
  "bodyHtml": "<p>Let's discuss Q4 planning...</p>",
  "receivedAt": "2024-11-01T09:30:00Z",
  "importance": "high",
  "categories": ["Work", "Important"],
  "attachments": [
    {
      "id": "att-1",
      "filename": "q4-plan.xlsx",
      "size": 250000,
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  ]
}
```

#### 4. Convert Email to Task
```
POST /integrations/outlook/emails/{emailId}/create-task

Request:
{
  "title": "Review Q4 Planning",
  "priority": "high",
  "tags": ["planning", "quarterly"],
  "dueDate": "2024-11-07T17:00:00Z",
  "includeAttachments": true
}

Response (201):
{
  "taskId": "task-456",
  "title": "Review Q4 Planning",
  "linkedEmailId": "msg-1",
  "attachments": [
    {
      "filename": "q4-plan.xlsx",
      "linkedAs": "task-attachment"
    }
  ]
}
```

#### 5. Search Emails
```
POST /integrations/outlook/emails/search

Request:
{
  "query": "from:john@example.com subject:important",
  "limit": 50,
  "filters": {
    "since": "2024-11-01",
    "hasAttachments": true,
    "importance": "high"
  }
}

Response (200):
{
  "results": [
    {
      "id": "msg-1",
      "from": "john@example.com",
      "subject": "Important: Deployment",
      "matchContext": "subject contains 'important'"
    }
  ],
  "totalMatches": 5
}
```

#### 6. Get Attachments
```
GET /integrations/outlook/emails/{emailId}/attachments

Response (200):
{
  "attachments": [
    {
      "id": "att-1",
      "filename": "report.pdf",
      "size": 1200000,
      "mimeType": "application/pdf",
      "downloadUrl": "/integrations/outlook/attachments/att-1/download"
    }
  ]
}
```

### Calendar Operations

#### 1. Get Calendar Events
```
GET /integrations/outlook/calendar/events?from=2024-11-01&to=2024-11-30

Response (200):
{
  "events": [
    {
      "id": "event-1",
      "subject": "Team Standup",
      "start": "2024-11-01T09:00:00Z",
      "end": "2024-11-01T09:30:00Z",
      "organizer": "manager@company.com",
      "attendees": [
        {
          "email": "user@company.com",
          "name": "John Doe",
          "status": "accepted"
        }
      ],
      "isRecurring": true,
      "recurrencePattern": "daily",
      "categories": ["Work"],
      "isOnlineMeeting": false
    }
  ]
}
```

#### 2. Create Calendar Event
```
POST /integrations/outlook/calendar/events

Request:
{
  "subject": "Project Review",
  "start": "2024-11-15T10:00:00Z",
  "end": "2024-11-15T11:00:00Z",
  "body": "Quarterly project review",
  "location": "Conference Room A",
  "attendees": [
    {
      "email": "john@example.com",
      "name": "John Doe",
      "type": "required"
    }
  ],
  "isOnlineMeeting": true,
  "reminderMinutesBeforeStart": 15
}

Response (201):
{
  "eventId": "event-new",
  "subject": "Project Review",
  "start": "2024-11-15T10:00:00Z",
  "webLink": "https://outlook.office365.com/..."
}
```

#### 3. Update Calendar Event
```
PATCH /integrations/outlook/calendar/events/{eventId}

Request:
{
  "subject": "Project Review (Rescheduled)",
  "start": "2024-11-16T10:00:00Z",
  "end": "2024-11-16T11:00:00Z"
}

Response (200):
{
  "eventId": "event-new",
  "updated": true
}
```

---

## Code Examples

### Example 1: Connect Outlook Account

```typescript
import { PriorioClient } from '@priorio/sdk';

const client = new PriorioClient({ apiKey: 'key' });

async function connectOutlook() {
  try {
    // Get auth URL
    const { authUrl } = await client.integrations.outlook.getAuthUrl();
    console.log('Visit:', authUrl);
    
    // User authorizes and gets code
    const code = 'code-from-redirect';
    
    // Connect
    const integration = await client.integrations.outlook.connect({ code });
    
    console.log('Connected to:', integration.accountName);
    console.log('Integration ID:', integration.id);
    
    return integration.id;
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

connectOutlook();
```

### Example 2: Sync Emails to Tasks

```typescript
async function syncEmailsToTasks(integrationId: string) {
  try {
    // Get unread emails
    const { emails } = await client.integrations.outlook.getEmails(
      integrationId,
      {
        folder: 'Inbox',
        unread: true,
        limit: 50
      }
    );
    
    console.log(`Found ${emails.length} unread emails`);
    
    // Convert high-priority emails to tasks
    for (const email of emails) {
      if (email.importance === 'high') {
        const task = await client.integrations.outlook.convertEmailToTask(
          integrationId,
          email.id,
          {
            title: email.subject,
            priority: 'high',
            tags: ['from-outlook', ...email.categories],
            includeAttachments: true
          }
        );
        
        console.log(`Created task: ${task.taskId}`);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}
```

### Example 3: Search and Convert Emails

```typescript
async function searchAndConvert() {
  try {
    // Search for important emails
    const results = await client.integrations.outlook.searchEmails(
      integrationId,
      {
        query: 'from:boss@company.com importance:high',
        limit: 20
      }
    );
    
    console.log(`Found ${results.results.length} matching emails`);
    
    // Create task for each
    for (const result of results.results) {
      const emailDetail = await client.integrations.outlook.getEmail(
        integrationId,
        result.id
      );
      
      // Get attachments
      const { attachments } = await client.integrations.outlook
        .getAttachments(integrationId, result.id);
      
      const task = await client.tasks.create({
        title: emailDetail.subject,
        description: emailDetail.bodyText,
        priority: 'high',
        tags: emailDetail.categories,
        linkedEmailId: result.id,
        linkedAttachments: attachments.map(a => ({
          filename: a.filename,
          size: a.size,
          mimeType: a.mimeType
        }))
      });
      
      console.log(`Created task ${task.id} with ${attachments.length} attachments`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Example 4: Sync Calendar and Create Events

```typescript
async function syncCalendarAndCreateEvent() {
  try {
    // Get calendar availability
    const events = await client.integrations.outlook.getCalendarEvents(
      integrationId,
      {
        from: new Date('2024-11-02'),
        to: new Date('2024-11-07')
      }
    );
    
    console.log(`Calendar has ${events.length} events`);
    
    // Find free slots
    const busyTimes = events.map(e => ({
      start: new Date(e.start),
      end: new Date(e.end)
    }));
    
    // Create new event
    const newEvent = await client.integrations.outlook.createCalendarEvent(
      integrationId,
      {
        subject: 'Project Planning',
        start: new Date('2024-11-15T14:00:00Z'),
        end: new Date('2024-11-15T15:00:00Z'),
        body: 'Q4 project planning meeting',
        location: 'Conference Room A',
        attendees: [
          { email: 'john@example.com', name: 'John Doe' },
          { email: 'jane@example.com', name: 'Jane Smith' }
        ]
      }
    );
    
    console.log('Event created:', newEvent.eventId);
    console.log('Join:', newEvent.webLink);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## Permission Requirements

### Email Permissions Table

| Permission | Purpose | Required | Scope |
|-----------|---------|----------|-------|
| Mail.Read | Read emails | Yes | User's mailbox only |
| Mail.ReadWrite | Read/write emails | No | Modify emails |
| Mail.Send | Send emails | No | Send notifications |
| MailboxSettings.Read | Read mailbox settings | Yes | User settings |
| MailboxSettings.ReadWrite | Modify mailbox settings | No | Change settings |

### Calendar Permissions Table

| Permission | Purpose | Required |
|-----------|---------|----------|
| Calendar.Read | Read calendar events | Yes |
| Calendar.ReadWrite | Read/write calendar | No |
| Calendars.Manage | Manage multiple calendars | No |

### User Permissions Table

| Permission | Purpose | Required |
|-----------|---------|----------|
| User.Read | Read user profile | Yes |
| Contacts.Read | Access contacts | No |

---

## Best Practices

### Email Management

✅ DO:
- Regularly clean up old emails
- Use meaningful folder structures
- Apply categories for organization
- Handle attachments securely
- Archive processed emails

❌ DON'T:
- Store sensitive data in emails
- Create overly nested folders
- Download all attachments indiscriminately
- Keep drafts permanently
- Ignore spam

### Calendar Coordination

✅ DO:
- Keep calendar updated
- Set accurate time zones
- Include location details
- Add attendee information
- Set appropriate reminders

❌ DON'T:
- Double-book time
- Schedule without checking availability
- Forget time zone conversions
- Spam attendees
- Create duplicate events

### Security

✅ DO:
- Encrypt connection credentials
- Use HTTPS for downloads
- Validate all input
- Audit email access
- Revoke tokens when needed

❌ DON'T:
- Share credentials
- Store passwords in code
- Download from untrusted emails
- Ignore security warnings
- Process malicious files

---

## Troubleshooting

### Issue: "Access Denied" errors

**Solution**:
1. Verify permissions granted in Azure AD
2. Check admin hasn't revoked access
3. Confirm user has Outlook license
4. Re-authenticate with updated scopes

### Issue: Emails not appearing

**Solution**:
1. Check folder selection
2. Verify sync is enabled
3. Check date filters
4. Look in Junk folder
5. Manually trigger sync

### Issue: Calendar events not syncing

**Solution**:
1. Verify Calendar.Read permission
2. Check calendar access
3. Confirm time zone settings
4. Look for recurring event issues
5. Check event filter settings

### Issue: Attachment download fails

**Solution**:
1. Verify file size is under limit
2. Check MIME type is supported
3. Ensure storage space available
4. Test with different attachment
5. Check malware scan service

---

**Document Version**: 7.0  
**Last Updated**: November 2024  
**Status**: Complete and Production Ready
