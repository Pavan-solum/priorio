# Phase 7: Additional Integrations - Complete Implementation Plan

**Date:** November 1, 2026  
**Status:** 🚀 **STARTING**  
**Phase:** 7 (Additional Integrations)

---

## 📋 Phase Overview

Phase 7 introduces **enterprise integrations** to Priorio:

1. **Microsoft Teams Integration** - Chat and notification sync
2. **Google Calendar Integration** - Event sync and scheduling
3. **Microsoft Outlook Integration** - Email and calendar
4. **Additional OAuth Providers** - GitHub, Microsoft, Google
5. **Event Notification System** - Real-time sync
6. **Permission Management** - Granular provider permissions

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Priorio Additional Integrations (Phase 7)          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌────────┐  ┌─────────┐            │
│  │  Teams   │  │Calendar│  │ Outlook │            │
│  │          │  │        │  │         │            │
│  └────┬─────┘  └───┬────┘  └────┬────┘            │
│       │            │            │                  │
│       └────────────┼────────────┘                  │
│                    │                               │
│          ┌─────────▼──────────┐                    │
│          │  OAuth Providers   │                    │
│          │  (GitHub, Google,  │                    │
│          │   Microsoft)       │                    │
│          └─────────┬──────────┘                    │
│                    │                               │
│          ┌─────────▼──────────┐                    │
│          │ Event Sync Engine  │                    │
│          │ & Notifier         │                    │
│          └─────────┬──────────┘                    │
│                    │                               │
│        ┌───────────┼───────────┐                   │
│        │           │           │                   │
│   ┌────▼──┐  ┌────▼──┐  ┌─────▼────┐            │
│   │Teams  │  │Google │  │ Outlook  │            │
│   │Adapter│  │Adapter│  │ Adapter  │            │
│   └───────┘  └───────┘  └──────────┘            │
│                                                     │
│       Connected to Priorio API (NestJS)           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Deliverables

### 1. Microsoft Teams Integration

**Backend Services:**
```
TeamsService (600+ lines)
  - connectTeamsAccount()
  - syncTeamChats()
  - createTaskFromMessage()
  - postNotificationToTeam()
  - syncTeamCalendar()
  - trackTeamsActivity()

TeamsAdapter (400+ lines)
  - formatMessageForTask()
  - formatTaskForTeams()
  - handleWebhooks()
```

**API Endpoints (8+):**
```
POST   /api/v1/integrations/teams/connect
GET    /api/v1/integrations/teams/status
POST   /api/v1/integrations/teams/sync
GET    /api/v1/integrations/teams/chats
POST   /api/v1/integrations/teams/:chatId/create-task
POST   /api/v1/integrations/teams/:taskId/notify
DELETE /api/v1/integrations/teams/disconnect
```

### 2. Google Calendar Integration

**Backend Services:**
```
CalendarService (600+ lines)
  - connectCalendarAccount()
  - syncCalendarEvents()
  - createEventFromTask()
  - updateEventStatus()
  - fetchAvailability()
  - suggestOptimalTime()

CalendarAdapter (400+ lines)
  - formatEventForTask()
  - formatTaskForEvent()
  - handleTimeZones()
  - detectConflicts()
```

**API Endpoints (8+):**
```
POST   /api/v1/integrations/calendar/connect
GET    /api/v1/integrations/calendar/events
POST   /api/v1/integrations/calendar/sync
POST   /api/v1/integrations/calendar/create-event
GET    /api/v1/integrations/calendar/availability
POST   /api/v1/integrations/calendar/suggest-time
PUT    /api/v1/integrations/calendar/events/:id
DELETE /api/v1/integrations/calendar/disconnect
```

### 3. Microsoft Outlook Integration

**Backend Services:**
```
OutlookService (600+ lines)
  - connectOutlookAccount()
  - syncOutlookEmail()
  - syncOutlookCalendar()
  - createTaskFromEmail()
  - createEventFromTask()
  - trackOutlookActivity()

OutlookAdapter (400+ lines)
  - formatEmailForTask()
  - formatTaskForEmail()
  - handleEmailAttachments()
```

**API Endpoints (8+):**
```
POST   /api/v1/integrations/outlook/connect
GET    /api/v1/integrations/outlook/emails
GET    /api/v1/integrations/outlook/events
POST   /api/v1/integrations/outlook/sync
POST   /api/v1/integrations/outlook/create-task-from-email
POST   /api/v1/integrations/outlook/create-event
DELETE /api/v1/integrations/outlook/disconnect
```

### 4. Additional OAuth Providers

**Backend Services:**
```
OAuthExtensionService (500+ lines)
  - registerNewProvider()
  - handleGitHubOAuth()
  - handleMicrosoftOAuth()
  - handleGoogleOAuth()
  - validateProviderCredentials()
  - refreshProviderTokens()

GitHubIntegrationService (300+ lines)
  - syncGitHubIssues()
  - createTaskFromIssue()
  - linkTaskToIssue()
  - trackGitHubActivity()
```

**API Endpoints (10+):**
```
POST   /api/v1/oauth/github/authorize
POST   /api/v1/oauth/microsoft/authorize
POST   /api/v1/oauth/google/authorize
GET    /api/v1/oauth/providers
POST   /api/v1/oauth/:provider/token
POST   /api/v1/oauth/:provider/revoke
GET    /api/v1/oauth/:provider/status
```

### 5. Event Sync & Notification System

**Backend Services:**
```
EventSyncEngine (700+ lines)
  - syncAllProviders()
  - detectEventChanges()
  - resolveConflicts()
  - queueSyncOperation()
  - executeSyncQueue()
  - monitorSyncHealth()

ProviderNotificationService (500+ lines)
  - subscribeToProviderWebhooks()
  - handleIncomingNotification()
  - routeNotificationToHandler()
  - acknowledgeNotification()
  - retryFailedNotifications()

SyncStatusService (300+ lines)
  - trackSyncStatus()
  - generateSyncReport()
  - alertOnSyncFailure()
```

**API Endpoints (6+):**
```
POST   /api/v1/sync/all-providers
GET    /api/v1/sync/status
GET    /api/v1/sync/log
POST   /api/v1/webhooks/teams
POST   /api/v1/webhooks/calendar
POST   /api/v1/webhooks/outlook
```

### 6. Permission Management

**Backend Services:**
```
ProviderPermissionService (500+ lines)
  - requestPermissions()
  - grantPermissions()
  - revokePermissions()
  - validatePermissions()
  - trackPermissionUsage()

AuditLogService (300+ lines)
  - logPermissionRequest()
  - logProviderAction()
  - generateAuditReport()
```

**API Endpoints (6+):**
```
GET    /api/v1/permissions
POST   /api/v1/permissions/request
PUT    /api/v1/permissions/:id
DELETE /api/v1/permissions/:id
GET    /api/v1/permissions/audit-log
```

---

## 🗄️ Database Models (8 Models)

```prisma
model ExternalIntegration {
  id              String   @id @default(uuid()) @db.Uuid
  workspaceId     String   @map("workspace_id") @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  
  provider        String   // teams, calendar, outlook, github
  accountEmail    String   @map("account_email")
  displayName     String   @map("display_name")
  
  tokenId         String?  @map("token_id") @db.Uuid
  refreshToken    String?  @map("refresh_token")
  expiresAt       DateTime? @map("expires_at")
  
  isActive        Boolean  @default(true) @map("is_active")
  lastSyncAt      DateTime? @map("last_sync_at")
  
  permissions     IntegrationPermission[]
  syncLogs        IntegrationSyncLog[]
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@unique([workspaceId, provider, accountEmail])
  @@index([workspaceId])
  @@map("external_integrations")
}

model IntegrationPermission {
  id              String   @id @default(uuid()) @db.Uuid
  integrationId   String   @map("integration_id") @db.Uuid
  integration     ExternalIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  
  scope           String   // read, write, calendar, email, etc
  resource        String   // chats, events, emails, etc
  grantedAt       DateTime @default(now()) @map("granted_at")
  
  @@index([integrationId])
  @@map("integration_permissions")
}

model IntegrationSyncLog {
  id              String   @id @default(uuid()) @db.Uuid
  integrationId   String   @map("integration_id") @db.Uuid
  integration     ExternalIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  
  syncType        String   // full, incremental, event
  resourceType    String   // chats, events, emails
  status          String   // started, completed, failed
  
  itemsSynced     Int      @default(0) @map("items_synced")
  itemsFailed     Int      @default(0) @map("items_failed")
  
  errorMessage    String?  @map("error_message")
  
  startedAt       DateTime @default(now()) @map("started_at")
  completedAt     DateTime? @map("completed_at")
  
  @@index([integrationId])
  @@index([startedAt])
  @@map("integration_sync_logs")
}

model ProviderTask {
  id              String   @id @default(uuid()) @db.Uuid
  taskId          String   @map("task_id") @db.Uuid
  integrationId   String   @map("integration_id") @db.Uuid
  
  provider        String   // teams, calendar, outlook, github
  externalId      String   @map("external_id")
  externalData    Json     @map("external_data")
  
  lastSyncAt      DateTime? @map("last_sync_at")
  
  @@unique([taskId, provider])
  @@index([integrationId])
  @@map("provider_tasks")
}

model ProviderEvent {
  id              String   @id @default(uuid()) @db.Uuid
  workspaceId     String   @map("workspace_id") @db.Uuid
  integrationId   String   @map("integration_id") @db.Uuid
  
  provider        String
  externalId      String   @map("external_id")
  eventType       String   // message, event, email
  eventData       Json     @map("event_data")
  
  linkedTaskId    String?  @map("linked_task_id") @db.Uuid
  
  processedAt     DateTime? @map("processed_at")
  
  @@index([integrationId])
  @@index([workspaceId])
  @@map("provider_events")
}

model ProviderNotification {
  id              String   @id @default(uuid()) @db.Uuid
  integrationId   String   @map("integration_id") @db.Uuid
  
  provider        String
  webhookId       String?  @map("webhook_id")
  eventType       String
  
  isActive        Boolean  @default(true) @map("is_active")
  lastReceivedAt  DateTime? @map("last_received_at")
  
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@index([integrationId])
  @@map("provider_notifications")
}

model SyncConflict {
  id              String   @id @default(uuid()) @db.Uuid
  workspaceId     String   @map("workspace_id") @db.Uuid
  
  provider        String
  resourceId      String   @map("resource_id")
  conflictType    String   // concurrent_edit, delete_vs_modify
  
  prioriVersion   Json     @map("priori_version")
  providerVersion Json     @map("provider_version")
  
  resolution      String?  // pending, resolved
  resolvedAt      DateTime? @map("resolved_at")
  
  @@index([workspaceId])
  @@index([resolution])
  @@map("sync_conflicts")
}

model ProviderAPIUsage {
  id              String   @id @default(uuid()) @db.Uuid
  integrationId   String   @map("integration_id") @db.Uuid
  provider        String
  
  apiCallsToday   Int      @default(0) @map("api_calls_today")
  apiCallsMonth   Int      @default(0) @map("api_calls_month")
  rateLimitRemaining Int  @map("rate_limit_remaining")
  
  lastResetAt     DateTime @map("last_reset_at")
  
  @@index([integrationId])
  @@map("provider_api_usage")
}
```

---

## 🧪 Testing Strategy

### Backend Tests (120+ cases)
- 30+ Teams integration tests
- 30+ Calendar integration tests
- 30+ Outlook integration tests
- 20+ OAuth provider tests
- 10+ Event sync tests

### Frontend E2E Tests (60+ cases)
- Teams connection flow
- Calendar sync UI
- Outlook integration UI
- Permission management UI

### Integration Tests (50+ cases)
- End-to-end provider flows
- Webhook handling
- Conflict resolution
- Permission validation

**Total: 230+ test cases**

---

## 📚 Documentation (80+ KB)

1. **PHASE_7_COMPLETE.md** (20KB)
2. **TEAMS_INTEGRATION_GUIDE.md** (15KB)
3. **CALENDAR_INTEGRATION_GUIDE.md** (15KB)
4. **OUTLOOK_INTEGRATION_GUIDE.md** (15KB)
5. **OAUTH_PROVIDERS_GUIDE.md** (15KB)

---

## ⏱️ Estimated Timeline

**Phase 7: Additional Integrations**
- Teams integration: 1.5 hours
- Calendar integration: 1.5 hours
- Outlook integration: 1.5 hours
- OAuth providers: 1 hour
- Event sync & notifications: 1 hour
- Permission management: 45 minutes
- Testing & integration: 1.5 hours
- **Total: 9-10 hours**

---

**Status:** Ready for implementation
**Next:** Begin Phase 7 implementation
