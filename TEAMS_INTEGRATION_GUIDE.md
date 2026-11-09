# Priorio Teams Integration Guide

**Version**: 7.0  
**Date**: November 2024  
**Status**: Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Features](#features)
4. [API Endpoints](#api-endpoints)
5. [Integration Examples](#integration-examples)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

Priorio's Teams integration enables seamless synchronization between Microsoft Teams and your task management system. Convert Teams messages to tasks, create tasks from chats, and keep your team synchronized across both platforms.

### Key Features

- **Message-to-Task Conversion**: Convert Teams messages to actionable tasks
- **Task Notifications**: Send task updates and notifications to Teams channels
- **Chat Synchronization**: Real-time sync of relevant conversations
- **Team Activity Tracking**: Monitor team activities and assignments
- **Bidirectional Sync**: Keep Teams and Priorio always in sync

---

## Setup Instructions

### Step 1: Register Azure AD Application

**Prerequisites**:
- Azure AD tenant access
- Admin permissions

**Process**:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: Priorio Teams App
   - **Supported account types**: Multitenant
   - **Redirect URI**: Web - `https://api.priorio.app/oauth/teams/callback`

5. Click **Register**

### Step 2: Configure Client Credentials

1. In **Certificates & secrets**, create a new client secret:
   - Click **New client secret**
   - Set expiry to 24 months
   - Copy the value immediately
   - Store securely in environment variables

2. Note the **Application (client) ID** and **Directory (tenant) ID**

### Step 3: Configure API Permissions

1. In **API permissions**, click **Add a permission**
2. Select **Microsoft Graph**
3. Add these **Delegated permissions**:

```
Channel.ReadBasic.All
Channel.Read.All
ChannelMessage.Read.All
Chat.Read
Chat.ReadWrite
Team.ReadBasic.All
User.Read
Mail.Read (for linked email)
Calendar.Read (for availability)
```

4. Click **Grant admin consent**

### Step 4: Configure OAuth Settings

In Priorio admin console, go to **Integrations** → **OAuth Providers**:

```typescript
{
  "teams": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "tenantId": "YOUR_TENANT_ID",
    "redirectUri": "https://api.priorio.app/oauth/teams/callback",
    "scopes": [
      "Channel.ReadBasic.All",
      "ChannelMessage.Read.All",
      "Chat.Read",
      "Team.ReadBasic.All",
      "User.Read"
    ]
  }
}
```

### Step 5: Configure Webhooks (Optional)

For real-time updates instead of polling:

1. In Priorio admin, enable **Teams Webhooks**
2. Configure webhook endpoint: `https://api.priorio.app/webhooks/teams`
3. In Azure AD app, add **Redirect URI**: `https://api.priorio.app/webhooks/teams`

---

## Features

### 1. Chat Synchronization

**Real-Time Sync**:
- Monitor specific Teams channels or chats
- Sync new messages to Priorio
- Create tasks from important messages
- Maintain conversation history

**Setup**:
```
1. Connect Teams account in Priorio
2. Select channels/chats to sync
3. Configure sync frequency (Real-time/Hourly/Daily)
4. Choose sync direction (One-way/Bidirectional)
```

**Configuration Example**:
```typescript
interface TeamsSyncConfig {
  channelId: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  bidirectional: boolean;
  messageFilter?: {
    keywords?: string[];
    mentionsMe?: boolean;
    hasAttachments?: boolean;
  };
  taskDefaults?: {
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    assignee?: string;
  };
}
```

### 2. Message to Task Conversion

**Create Task from Message**:
```
1. User right-clicks Teams message
2. Select "Create Priorio Task"
3. Configure task details
4. Task created with message content as description
5. Link back to Teams message included
```

**Automatic Conversion**:
- Flag important messages with special keywords
- Auto-create tasks from flagged messages
- Apply custom rules based on sender, channel, keywords

**Example Trigger**:
```
Message: "@bot Action: Review deployment process"
→ Automatically creates task with:
  - Title: "Review deployment process"
  - Description: [Full message text + attachments]
  - Priority: High (from @bot mention)
  - Tags: ["action", "deployment"]
  - Link back to Teams: [Click to open message]
```

### 3. Task Notifications in Teams

**Notification Types**:
- Task assigned to you
- Task due date approaching
- Task status changed
- Comment on task
- Task completed

**Configuration**:
```typescript
interface TeamsNotificationConfig {
  taskCreated?: {
    enabled: boolean;
    channel?: string;
  };
  taskAssigned?: {
    enabled: boolean;
    dmUser: boolean;
  };
  taskDueDate?: {
    enabled: boolean;
    minutesBefore: number;
  };
  taskCompleted?: {
    enabled: boolean;
    channel?: string;
  };
}
```

**Notification Example**:
```
Channel: #project-updates

🎯 Task Assigned
────────────────
Title: Implement authentication
Assigned to: John Doe
Priority: High
Due: Nov 7, 2024
👉 [View in Priorio] [Accept] [Decline]
```

### 4. Activity Tracking

**Track Team Activities**:
- Who created/updated tasks
- Which messages created which tasks
- Sync conflicts and resolutions
- Error logs and retries

**Activity Log Format**:
```
Nov 1, 10:15 AM - User: john@company.com
  Action: Message to task conversion
  Message: "Review deployment process"
  Task: #123 - Implement auth
  Status: Success
```

### 5. Team Collaboration

**Shared Tasks**:
- Create tasks visible to entire team
- Assign to Teams members
- Mention teams in task comments
- Automatic team notifications

**Thread Integration**:
- Link Priorio task to Teams thread
- Bidirectional thread sync
- Comments sync between platforms

---

## API Endpoints

### Teams Connection

#### 1. Get OAuth URL for Teams
```
GET /integrations/teams/auth-url

Response (200):
{
  "authUrl": "https://login.microsoftonline.com/...",
  "state": "state-token-123"
}
```

#### 2. Connect Teams Account
```
POST /integrations/teams/connect

Request:
{
  "code": "authorization_code_from_oauth",
  "state": "state-token-123"
}

Response (200):
{
  "integration": {
    "id": "integ-teams-1",
    "provider": "teams",
    "accountName": "user@company.com",
    "status": "active",
    "connectedAt": "2024-11-01T10:00:00Z"
  }
}
```

#### 3. Get Teams Channels
```
GET /integrations/teams/channels

Response (200):
{
  "channels": [
    {
      "id": "channel-1",
      "name": "general",
      "teamName": "Engineering",
      "type": "standard",
      "memberCount": 25
    },
    {
      "id": "channel-2",
      "name": "announcements",
      "teamName": "Engineering",
      "type": "standard"
    }
  ]
}
```

#### 4. Configure Channel Sync
```
POST /integrations/teams/channels/{channelId}/sync-config

Request:
{
  "enabled": true,
  "syncFrequency": "realtime",
  "bidirectional": true,
  "messageFilter": {
    "keywords": ["action", "task"],
    "mentionsMe": true
  }
}

Response (200):
{
  "channelId": "channel-1",
  "syncConfigured": true,
  "nextSync": "2024-11-01T10:05:00Z"
}
```

### Message Operations

#### 1. Get Channel Messages
```
GET /integrations/teams/channels/{channelId}/messages?limit=50

Response (200):
{
  "messages": [
    {
      "id": "msg-1",
      "from": {
        "name": "John Doe",
        "email": "john@company.com"
      },
      "text": "We need to review the deployment process",
      "createdAt": "2024-11-01T09:30:00Z",
      "reactions": [{"emoji": "👍", "count": 3}]
    }
  ]
}
```

#### 2. Convert Message to Task
```
POST /integrations/teams/messages/{messageId}/create-task

Request:
{
  "title": "Review deployment process",
  "priority": "high",
  "tags": ["process", "deployment"],
  "assignee": "john@company.com"
}

Response (201):
{
  "taskId": "task-456",
  "linkedMessageId": "msg-1",
  "title": "Review deployment process",
  "teamsLink": "https://teams.microsoft.com/.../msg-1"
}
```

#### 3. Send Message to Teams
```
POST /integrations/teams/channels/{channelId}/send-message

Request:
{
  "text": "Task #456 has been completed: Implement authentication",
  "format": "plain" | "html" | "markdown"
}

Response (201):
{
  "messageId": "teams-msg-789",
  "sentAt": "2024-11-01T10:00:00Z"
}
```

### Task Notifications

#### 1. Enable Task Notifications
```
POST /integrations/teams/notifications/enable

Request:
{
  "taskCreated": true,
  "taskAssigned": true,
  "taskDueDate": true,
  "dueMinutesBefore": 60,
  "notificationChannel": "channel-1"
}

Response (200):
{
  "notificationsEnabled": true,
  "configuration": { "..." }
}
```

#### 2. Send Task Update to Teams
```
POST /integrations/teams/tasks/{taskId}/notify

Request:
{
  "type": "task_completed",
  "message": "Task completed successfully",
  "channelId": "channel-1"
}

Response (201):
{
  "notificationId": "notif-123",
  "sentAt": "2024-11-01T10:00:00Z"
}
```

### Team Management

#### 1. Get Teams
```
GET /integrations/teams/teams

Response (200):
{
  "teams": [
    {
      "id": "team-1",
      "name": "Engineering",
      "description": "Engineering team",
      "memberCount": 25,
      "channels": 12
    }
  ]
}
```

#### 2. Get Team Members
```
GET /integrations/teams/teams/{teamId}/members

Response (200):
{
  "members": [
    {
      "id": "user-123",
      "email": "john@company.com",
      "name": "John Doe",
      "role": "owner"
    }
  ]
}
```

---

## Integration Examples

### Example 1: Connect Teams Account

```typescript
import { PriorioClient } from '@priorio/sdk';

const client = new PriorioClient({
  apiKey: 'your-api-key'
});

async function connectTeams() {
  try {
    // Step 1: Get auth URL
    const { authUrl } = await client.integrations.teams.getAuthUrl();
    
    console.log('Visit:', authUrl);
    // User logs in and gets redirected with code
    
    // Step 2: Exchange code for connection
    const code = 'code-from-redirect';
    const integration = await client.integrations.teams.connect({ code });
    
    console.log('Teams connected:', integration.accountName);
    console.log('Integration ID:', integration.id);
    
    return integration;
  } catch (error) {
    console.error('Failed to connect Teams:', error.message);
  }
}

connectTeams();
```

### Example 2: Sync Channel to Tasks

```typescript
async function syncChannelToTasks() {
  try {
    // Get channels
    const { channels } = await client.integrations.teams.getChannels();
    
    const generalChannel = channels.find(c => c.name === 'general');
    
    // Configure sync
    await client.integrations.teams.configureChannelSync(
      generalChannel.id,
      {
        enabled: true,
        syncFrequency: 'realtime',
        bidirectional: true,
        messageFilter: {
          keywords: ['action', 'task', 'todo'],
          mentionsMe: true
        },
        taskDefaults: {
          priority: 'medium',
          tags: ['from-teams']
        }
      }
    );
    
    console.log('Channel sync configured');
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}
```

### Example 3: Create Task from Message

```typescript
async function messageToTask() {
  try {
    // Get recent messages
    const { messages } = await client.integrations.teams
      .getChannelMessages('channel-1', { limit: 10 });
    
    // Find important message
    const message = messages.find(m => 
      m.text.includes('action') || m.text.includes('important')
    );
    
    if (message) {
      // Convert to task
      const task = await client.integrations.teams.convertMessageToTask(
        message.id,
        {
          title: message.text.substring(0, 100),
          priority: 'high',
          tags: ['teams-sync'],
          assignee: message.from.email
        }
      );
      
      console.log('Task created:', task.id);
      console.log('Teams message linked:', message.id);
    }
  } catch (error) {
    console.error('Conversion failed:', error.message);
  }
}
```

### Example 4: Send Task Notification

```typescript
async function notifyTaskUpdate() {
  try {
    await client.integrations.teams.sendTaskNotification(
      'task-456',
      {
        type: 'task_completed',
        message: 'Authentication implementation completed',
        channelId: 'channel-1'
      }
    );
    
    console.log('Notification sent to Teams');
  } catch (error) {
    console.error('Notification failed:', error.message);
  }
}
```

### Example 5: Post Message to Team

```typescript
async function postToTeams() {
  try {
    const messageId = await client.integrations.teams.sendMessage(
      'channel-1',
      {
        text: '🎯 Daily standup\nPlease share your updates',
        format: 'markdown'
      }
    );
    
    console.log('Message posted:', messageId);
  } catch (error) {
    console.error('Post failed:', error.message);
  }
}
```

---

## Troubleshooting

### Issue: "Unauthorized" when connecting Teams

**Solution**:
1. Verify Client ID and Secret are correct
2. Check that app has Teams admin consent
3. Verify redirect URI matches exactly
4. Ensure user has Teams license

### Issue: Messages not syncing

**Solution**:
1. Check channel sync is enabled
2. Verify OAuth scopes include ChannelMessage.Read.All
3. Check rate limits: 100 requests/minute per app
4. Verify bot has access to channel
5. Check sync logs in Priorio admin

### Issue: Task notifications not appearing

**Solution**:
1. Enable notifications in Teams settings
2. Check notification channel is correct
3. Verify Teams app has channel access
4. Check notification type is enabled
5. Review error logs

### Issue: Bidirectional sync conflicts

**Solution**:
1. Last-write-wins resolution by default
2. Check conflict logs in Priorio admin
3. Manual resolution available for critical conflicts
4. Configure conflict resolution strategy in settings

### Issue: Rate limits exceeded

**Solution**:
1. Reduce sync frequency
2. Use webhooks instead of polling
3. Implement exponential backoff
4. Batch operations when possible
5. Contact Microsoft for increased limits

---

## Best Practices

### 1. OAuth Security

✅ DO:
- Store secrets in environment variables
- Use HTTPS for all redirects
- Implement CSRF protection (state parameter)
- Refresh tokens regularly
- Revoke unused integrations

❌ DON'T:
- Hardcode secrets in code
- Log tokens or credentials
- Share Client Secret
- Use HTTP for callbacks
- Skip state validation

### 2. Sync Optimization

✅ DO:
- Use real-time webhooks when available
- Batch update operations
- Implement incremental sync
- Cache frequently accessed data
- Monitor sync logs

❌ DON'T:
- Poll continuously
- Sync all history repeatedly
- Ignore rate limits
- Sync to unmonitored channels
- Update without validation

### 3. Message Handling

✅ DO:
- Validate message format before conversion
- Preserve original message content
- Link back to Teams for reference
- Handle rich text properly
- Validate sender permissions

❌ DON'T:
- Modify message content
- Create duplicate tasks
- Lose conversation context
- Process deleted messages
- Ignore sender identity

### 4. Error Recovery

✅ DO:
- Implement retry logic with exponential backoff
- Log all errors for debugging
- Notify users of sync failures
- Queue failed operations
- Monitor integration health

❌ DON'T:
- Ignore failures silently
- Retry without limits
- Lose failed transaction data
- Skip error logging
- Assume success without verification

### 5. Team Collaboration

✅ DO:
- Respect team privacy and permissions
- Use appropriate channels for notifications
- Mention relevant team members
- Provide context in messages
- Follow team communication norms

❌ DON'T:
- Spam channels
- Notify unnecessary recipients
- Bypass permission checks
- Create duplicate messages
- Overwhelm users with updates

---

## Support

For Teams integration issues:
1. Check troubleshooting section above
2. Review sync logs in admin console
3. Verify OAuth configuration
4. Check Microsoft Teams API status
5. Contact support team

---

**Document Version**: 7.0  
**Last Updated**: November 2024  
**Status**: Complete
