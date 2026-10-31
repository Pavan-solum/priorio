# Phase 3 Development: Integrations

**Phase Goal:** Build external integrations with OAuth, Gmail sync, and Android notifications

**Timeline:** Sprint-based implementation with security-first approach

---

## 📋 Phase 3 Tasks Overview

### Task Group 1: OAuth Infrastructure (Foundation)
- [ ] **3.1** Create OAuth module with provider abstraction
  - Support multiple OAuth 2.0 providers (Google, Microsoft, etc.)
  - Abstract provider implementation with strategy pattern
  - Status: `pending`
  
- [ ] **3.2** Implement secure token encryption
  - Server-side AES-256 encryption for OAuth tokens
  - Token refresh mechanism with automatic rotation
  - Secure storage in database with audit logging
  - Status: `pending`

- [ ] **3.3** Build OAuth connection lifecycle
  - Authorization initiation endpoint
  - Callback handler with CSRF protection
  - Token exchange and storage
  - Connection revocation
  - Status: `pending`

- [ ] **3.4** Add provider review & compliance
  - Google OAuth consent screen setup
  - Microsoft Azure app registration
  - Documentation for future providers
  - Status: `pending`

### Task Group 2: Gmail Integration
- [ ] **3.5** Design Gmail sync architecture
  - Checkpoint system for incremental sync
  - Deduplication logic
  - Retry mechanism for failed syncs
  - Status: `pending`

- [ ] **3.6** Implement Gmail API client
  - Authentication with OAuth tokens
  - Message fetching with filtering
  - Label management
  - Status: `pending`

- [ ] **3.7** Build Gmail-to-Task conversion
  - Parse email headers and body
  - Create tasks from emails
  - Link task back to original email
  - Status: `pending`

- [ ] **3.8** Add sync checkpoint & deduplication
  - Track sync progress (historyId)
  - Prevent duplicate task creation
  - Handle email updates and deletes
  - Status: `pending`

- [ ] **3.9** Implement revocation handling
  - Graceful handling of revoked access
  - Notification to user
  - Cleanup of cached data
  - Status: `pending`

### Task Group 3: Android Notifications
- [ ] **3.10** Create notification-listener prototype
  - Android notification capture service
  - Listen for incoming notifications
  - Filter and categorize notifications
  - Status: `pending`

- [ ] **3.11** Build permission education UI
  - Permission request flow
  - Explanation of data usage
  - Privacy guarantees
  - Status: `pending`

- [ ] **3.12** Implement opt-in capture mechanism
  - User consent management
  - Settings for notification types
  - Data retention policies
  - Status: `pending`

- [ ] **3.13** Add notification-to-task creation
  - Parse notification content
  - Create quick tasks from notifications
  - Link task metadata
  - Status: `pending`

### Task Group 4: Testing & Documentation
- [ ] **3.14** Write OAuth integration tests
  - Unit tests for token encryption
  - Integration tests for auth flow
  - Provider-specific test cases
  - Status: `pending`

- [ ] **3.15** Write Gmail sync tests
  - Unit tests for email parsing
  - Integration tests with Gmail API
  - Edge cases and error handling
  - Status: `pending`

- [ ] **3.16** Write Android integration tests
  - Notification listener tests
  - Permission handling tests
  - End-to-end tests
  - Status: `pending`

- [ ] **3.17** Document Phase 3 implementation
  - OAuth setup guide
  - Gmail sync architecture
  - Android integration guide
  - API contracts
  - Status: `pending`

---

## 🏗️ Architecture Overview

### OAuth Module Structure

```
apps/api/src/integrations/
├── oauth/
│   ├── oauth.module.ts
│   ├── oauth.service.ts
│   ├── oauth.controller.ts
│   ├── providers/
│   │   ├── provider.interface.ts
│   │   ├── google-provider.ts
│   │   └── microsoft-provider.ts
│   ├── dto/
│   │   ├── authorize.dto.ts
│   │   └── token-refresh.dto.ts
│   └── entities/
│       └── oauth-connection.entity.ts
├── gmail/
│   ├── gmail.module.ts
│   ├── gmail.service.ts
│   ├── gmail.controller.ts
│   └── gmail-sync.service.ts
└── android-notifications/
    ├── android-notifications.module.ts
    ├── android-notifications.service.ts
    └── android-notifications.controller.ts
```

### Database Schema Updates

New tables to add to `infrastructure/database/schema.prisma`:

```prisma
model OAuthConnection {
  id        String   @id @default(cuid())
  workspaceId String
  workspace Workspace @relation(fields: [workspaceId], references: [id])
  
  provider  String   // "google", "microsoft", etc.
  userId    String   // OAuth provider's user ID
  
  accessToken String  // AES-256 encrypted
  refreshToken String? // AES-256 encrypted
  expiresAt   DateTime?
  
  scopes    String[] // "gmail.readonly", "calendar", etc.
  
  connectedAt DateTime @default(now())
  lastSyncAt  DateTime?
  revokedAt   DateTime?
  
  metadata    Json    // Provider-specific metadata
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([workspaceId, provider])
  @@index([revokedAt])
}

model GmailSync {
  id        String   @id @default(cuid())
  workspaceId String
  workspace Workspace @relation(fields: [workspaceId], references: [id])
  
  historyId   String  // Gmail's historyId for checkpoint
  lastSyncAt  DateTime @default(now())
  
  totalEmails    Int @default(0)
  tasksCreated   Int @default(0)
  lastError      String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([workspaceId])
  @@index([lastSyncAt])
}

model AndroidNotification {
  id        String   @id @default(cuid())
  workspaceId String
  workspace Workspace @relation(fields: [workspaceId], references: [id])
  userId    String
  
  title     String
  body      String
  appPackage String
  timestamp DateTime
  
  taskId    String?
  task      Task? @relation(fields: [taskId], references: [id])
  
  dismissed Boolean @default(false)
  
  createdAt DateTime @default(now())
  
  @@index([workspaceId, userId])
  @@index([dismissed])
}
```

### Security Model

1. **Token Encryption**
   - Master key stored in environment variable
   - AES-256-GCM encryption for OAuth tokens
   - IV generated per token
   - Tokens encrypted before database storage

2. **OAuth Flow**
   - PKCE (Proof Key for Code Exchange) for public clients
   - CSRF tokens for callback validation
   - State parameter stored in Redis with TTL
   - Never store authorization codes

3. **Data Access**
   - Workspace isolation enforced in all queries
   - OAuth scopes validated before API calls
   - User consent logged in audit trail

4. **Revocation**
   - Provider-side revocation monitoring
   - Graceful degradation when access revoked
   - Automatic retry disabled for revoked tokens

---

## 🔌 API Contracts

### OAuth Endpoints

#### 1. Authorize with Provider
```
POST /api/integrations/oauth/authorize
Content-Type: application/json

{
  "provider": "google",
  "scopes": ["gmail.readonly", "calendar.readonly"]
}

Response 200:
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "csrf-token-here"
}
```

#### 2. OAuth Callback
```
GET /api/integrations/oauth/callback?code=...&state=...

Response 302 Redirect to:
/integrations/success?connectionId=...
```

#### 3. List OAuth Connections
```
GET /api/integrations/oauth/connections

Response 200:
{
  "connections": [
    {
      "id": "...",
      "provider": "google",
      "connectedAt": "2026-10-31T...",
      "lastSyncAt": "2026-10-31T...",
      "scopes": ["gmail.readonly"],
      "status": "active"
    }
  ]
}
```

#### 4. Revoke OAuth Connection
```
DELETE /api/integrations/oauth/connections/{id}

Response 200:
{
  "message": "Connection revoked successfully"
}
```

### Gmail Sync Endpoints

#### 1. Trigger Gmail Sync
```
POST /api/integrations/gmail/sync
Content-Type: application/json

{
  "connectionId": "..."
}

Response 202 Accepted:
{
  "syncId": "...",
  "status": "queued"
}
```

#### 2. Get Sync Status
```
GET /api/integrations/gmail/sync/{syncId}

Response 200:
{
  "syncId": "...",
  "status": "in_progress",
  "progress": {
    "totalEmails": 1250,
    "processedEmails": 450,
    "tasksCreated": 23
  }
}
```

#### 3. List Gmail Sync History
```
GET /api/integrations/gmail/sync-history

Response 200:
{
  "syncs": [
    {
      "id": "...",
      "status": "completed",
      "startedAt": "2026-10-31T...",
      "completedAt": "2026-10-31T...",
      "totalEmails": 1250,
      "tasksCreated": 23
    }
  ]
}
```

### Android Notifications Endpoints

#### 1. Register Android Device
```
POST /api/integrations/android/register
Content-Type: application/json

{
  "deviceId": "...",
  "deviceName": "Pixel 6",
  "fcmToken": "..."
}

Response 201:
{
  "id": "...",
  "status": "active"
}
```

#### 2. Capture Notification
```
POST /api/integrations/android/notifications
Content-Type: application/json

{
  "title": "Meeting reminder",
  "body": "Team standup in 10 minutes",
  "appPackage": "com.google.android.calendar",
  "timestamp": "2026-10-31T..."
}

Response 200:
{
  "taskId": "...",
  "status": "created"
}
```

#### 3. List Captured Notifications
```
GET /api/integrations/android/notifications?dismissed=false

Response 200:
{
  "notifications": [...]
}
```

---

## 🔐 Security Checklist

Before Phase 3 is considered complete:

- [ ] All OAuth tokens encrypted at rest
- [ ] PKCE flow implemented for public clients
- [ ] CSRF protection on all OAuth endpoints
- [ ] Rate limiting on auth attempts
- [ ] Audit logging for all permission changes
- [ ] Workspace isolation verified in tests
- [ ] Scopes validated before API calls
- [ ] Revocation handling tested
- [ ] No tokens logged or exposed in errors
- [ ] Data retention policies documented
- [ ] Privacy policy updated
- [ ] Third-party API TOS reviewed

---

## 📦 Dependencies to Install

```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.x",
    "googleapis": "^140.x",
    "jsonwebtoken": "^9.x",
    "crypto": "builtin",
    "axios": "^1.x"
  },
  "devDependencies": {
    "@google-cloud/storage": "^7.x",
    "nock": "^13.x"
  }
}
```

---

## 🎯 Implementation Strategy

### Phase 3.1: OAuth Foundation (Week 1)
1. Create OAuth module structure
2. Implement token encryption service
3. Build OAuth connection entity and database migration
4. Create provider abstraction interface

### Phase 3.2: OAuth Providers (Week 2)
1. Implement Google OAuth provider
2. Create authorization flow endpoints
3. Add callback handler
4. Build connection management endpoints

### Phase 3.3: Gmail Integration (Week 3-4)
1. Implement Gmail API client
2. Create sync mechanism with checkpoints
3. Build deduplication logic
4. Add Gmail-to-Task conversion

### Phase 3.4: Android Notifications (Week 5)
1. Build Android notification listener prototype
2. Implement permission UI
3. Create notification capture endpoints
4. Add notification-to-task conversion

### Phase 3.5: Testing & Documentation (Week 6)
1. Write comprehensive tests
2. Document all components
3. Create provider setup guides
4. Security audit

---

## 🚀 Getting Started

To start Phase 3, follow these steps:

```bash
# 1. Create new branch
git checkout -b phase-3-integrations

# 2. Install dependencies
pnpm install googleapis axios @google-cloud/storage

# 3. Update Prisma schema
# - Add OAuthConnection model
# - Add GmailSync model
# - Add AndroidNotification model

# 4. Generate Prisma client
pnpm --filter @priorio/api prisma:generate

# 5. Create migration
pnpm --filter @priorio/api prisma:migrate dev --name add_integrations

# 6. Create OAuth module
cd apps/api/src/integrations
mkdir -p oauth/{providers,dto,entities}
mkdir -p gmail
mkdir -p android-notifications
```

---

## ✅ Success Criteria

Phase 3 is complete when:

1. **OAuth**
   - ✅ User can authorize with Google/Microsoft
   - ✅ Tokens securely stored and encrypted
   - ✅ Connection can be revoked
   - ✅ Token refresh works automatically
   - ✅ All operations audit logged

2. **Gmail Sync**
   - ✅ User can trigger sync from UI
   - ✅ Emails converted to tasks
   - ✅ Deduplication prevents duplicates
   - ✅ Sync progress trackable
   - ✅ Revocation handled gracefully

3. **Android Notifications**
   - ✅ Device can register for notifications
   - ✅ Notifications captured and stored
   - ✅ Notifications converted to tasks
   - ✅ Permission requests handled properly
   - ✅ User has full control

4. **Testing & Documentation**
   - ✅ 80%+ code coverage for OAuth
   - ✅ Integration tests passing
   - ✅ End-to-end tests passing
   - ✅ All APIs documented
   - ✅ Setup guides provided

---

## 📚 References

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Docs](https://developers.google.com/gmail/api/guides)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OWASP OAuth 2.0 Security](https://oauth.net/2/)
- [Android Notification Compat](https://developer.android.com/develop/ui/views/notifications)

---

**Created:** 2026-10-31
**Last Updated:** 2026-10-31
**Phase Status:** Ready to start
**Priority:** Medium (depends on Phase 2 completion)
