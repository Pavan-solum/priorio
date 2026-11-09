# Priorio Phase 7 - Complete System Documentation

**Date**: November 2024  
**Version**: 7.0  
**Author**: Priorio Development Team

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Feature Descriptions](#feature-descriptions)
4. [API Documentation](#api-documentation)
5. [Database Models](#database-models)
6. [Service Architecture](#service-architecture)
7. [Data Flow](#data-flow)
8. [Error Handling](#error-handling)
9. [Security](#security)
10. [Performance Optimization](#performance-optimization)
11. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

Priorio is an intelligent task management and synchronization platform integrating multiple productivity services including Microsoft Teams, Outlook, Google Calendar, and GitHub. The system uses a microservices architecture with a real-time sync engine.

### System Design

```
┌─────────────────────────────────────────────────────┐
│              Frontend Layer (Web + Mobile)           │
│  React/Next.js (Web) | React Native (Mobile)        │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│           API Gateway & Authentication              │
│  Express.js | JWT | OAuth 2.0 | Role-Based Access  │
└─────────────────────────────────────────────────────┘
                          ↓
┌────────────────┬─────────────────────┬──────────────┐
│  Task Service  │  Sync Service       │  Auth Svc    │
│  (Task CRUD)   │  (Real-time Sync)   │  (OAuth2)    │
└────────────────┴─────────────────────┴──────────────┘
         ↓              ↓                    ↓
    ┌─────────────────────────────────────────────────┐
    │  External Integrations Layer                     │
    ├─────────────────────────────────────────────────┤
    │ Teams API | Outlook API | Google Calendar API   │
    │ GitHub API | Gmail API | Slack API              │
    └─────────────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────────────┐
    │  Database Layer (PostgreSQL + Redis Cache)      │
    ├─────────────────────────────────────────────────┤
    │ Tasks | Users | Integrations | Sync Logs        │
    └─────────────────────────────────────────────────┘
```

### Core Technologies

- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React, Next.js, React Native
- **Database**: PostgreSQL, Redis
- **Authentication**: OAuth 2.0, JWT
- **Real-time**: WebSocket, Server-Sent Events
- **Deployment**: Docker, Kubernetes

---

## System Components

### 1. Backend Services

#### Task Service
- Handles CRUD operations for tasks
- Manages task status, priority, assignments
- Provides filtering and search capabilities
- Implements soft deletes for data integrity

#### Sync Service
- Real-time synchronization with external services
- Bidirectional sync with Teams, Outlook, Google Calendar
- Conflict resolution algorithms
- Rate limiting and batch operations

#### Authentication Service
- OAuth 2.0 provider integration
- JWT token management
- Role-based access control (RBAC)
- Multi-tenant support

#### Notification Service
- Push notifications
- Email notifications
- In-app notifications
- Webhook delivery

#### Calendar Service
- Calendar event management
- Availability calculation
- Time zone handling
- Multi-calendar support

#### Email Service
- Email synchronization
- Email-to-task conversion
- Attachment handling
- Folder management

### 2. Frontend Applications

#### Web Dashboard
- React/Next.js application
- Real-time task updates
- Integration management UI
- User settings and preferences

#### Mobile App
- React Native application
- Offline capabilities
- Push notifications
- Native integrations

#### Desktop Client
- Electron-based application
- System tray integration
- Local caching
- Background sync

---

## Feature Descriptions

### 1. Microsoft Teams Integration

**Capabilities**:
- Synchronize Teams messages to tasks
- Create tasks from Teams chats
- Send task updates to Teams channels
- Team notifications and mentions
- Activity tracking

**Setup**: Register Azure AD app, configure OAuth scopes

### 2. Outlook Integration

**Email Features**:
- Sync emails to task inbox
- Convert emails to tasks
- Template-based task creation
- Attachment support
- Folder management

**Calendar Features**:
- Sync calendar events
- Show calendar availability
- Suggest meeting times
- Recurring event support
- Multi-calendar sync

### 3. Google Calendar Integration

**Features**:
- Real-time event sync
- Availability calculation
- Time zone handling
- Multi-calendar support
- Event creation from tasks

### 4. GitHub Integration

**Features**:
- Sync issues as tasks
- Link pull requests to tasks
- Track deployment status
- Auto-close resolved issues
- Repository filtering

### 5. Gmail Integration

**Features**:
- Email label sync
- Email-to-task conversion
- Attachment management
- Search and filter
- Auto-labeling

### 6. Slack Integration

**Features**:
- Channel-based task tracking
- Slack message to task conversion
- Notification routing
- Bot commands
- Thread linking

---

## API Documentation

### Base URL
```
Production: https://api.priorio.app/v1
Development: http://localhost:3000/v1
```

### Authentication

All API requests require Bearer token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Task Endpoints

#### 1. Create Task
```
POST /tasks
Content-Type: application/json

Request:
{
  "title": "Implement user auth",
  "description": "Add JWT authentication to API",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59Z",
  "assignee": "user-id",
  "tags": ["backend", "security"],
  "integrations": {
    "github": { "issueId": "123", "repo": "priorio/api" }
  }
}

Response (201):
{
  "id": "task-123",
  "title": "Implement user auth",
  "status": "pending",
  "createdAt": "2024-11-01T10:00:00Z",
  "updatedAt": "2024-11-01T10:00:00Z",
  "_links": {
    "self": "/tasks/task-123",
    "updates": "/tasks/task-123/updates"
  }
}
```

#### 2. Get Tasks
```
GET /tasks?status=pending&priority=high&limit=50&offset=0

Response (200):
{
  "data": [
    { "id": "task-1", "title": "...", "status": "pending" },
    { "id": "task-2", "title": "...", "status": "in_progress" }
  ],
  "pagination": {
    "total": 250,
    "limit": 50,
    "offset": 0
  }
}
```

#### 3. Update Task
```
PATCH /tasks/task-123
Content-Type: application/json

Request:
{
  "status": "completed",
  "completedAt": "2024-11-01T15:30:00Z"
}

Response (200):
{
  "id": "task-123",
  "status": "completed",
  "updatedAt": "2024-11-01T15:30:00Z"
}
```

#### 4. Delete Task
```
DELETE /tasks/task-123

Response (204): No Content
```

### Sync Endpoints

#### 1. Get Sync Status
```
GET /sync/status

Response (200):
{
  "lastSync": "2024-11-01T10:15:00Z",
  "nextSync": "2024-11-01T10:20:00Z",
  "providers": {
    "teams": { "status": "synced", "lastSync": "2024-11-01T10:15:00Z" },
    "outlook": { "status": "syncing", "progress": 75 },
    "github": { "status": "error", "error": "Rate limit exceeded" }
  }
}
```

#### 2. Trigger Manual Sync
```
POST /sync/trigger

Request:
{
  "providers": ["teams", "outlook", "github"]
}

Response (202):
{
  "syncId": "sync-456",
  "status": "queued",
  "statusUrl": "/sync/sync-456/status"
}
```

#### 3. Get Sync History
```
GET /sync/history?limit=20

Response (200):
{
  "data": [
    {
      "id": "sync-456",
      "status": "completed",
      "startedAt": "2024-11-01T10:15:00Z",
      "completedAt": "2024-11-01T10:16:30Z",
      "provider": "teams",
      "itemsProcessed": 15,
      "itemsSynced": 12
    }
  ]
}
```

### Integration Endpoints

#### 1. Connect Integration
```
POST /integrations/{provider}/connect

Request:
{
  "code": "auth_code_from_oauth",
  "redirectUri": "http://localhost:3000/callback"
}

Response (200):
{
  "integration": {
    "id": "integ-789",
    "provider": "teams",
    "accountName": "user@company.com",
    "connectedAt": "2024-11-01T10:00:00Z",
    "status": "active"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600
}
```

#### 2. List Connected Integrations
```
GET /integrations?status=active

Response (200):
{
  "data": [
    {
      "id": "integ-1",
      "provider": "teams",
      "accountName": "user@company.com",
      "status": "active",
      "connectedAt": "2024-11-01T10:00:00Z"
    }
  ]
}
```

#### 3. Disconnect Integration
```
DELETE /integrations/{integrationId}

Response (204): No Content
```

### Calendar Endpoints

#### 1. Get Calendar Events
```
GET /calendar/events?from=2024-11-01&to=2024-11-30

Response (200):
{
  "data": [
    {
      "id": "event-1",
      "title": "Team Meeting",
      "startTime": "2024-11-01T10:00:00Z",
      "endTime": "2024-11-01T11:00:00Z",
      "provider": "outlook",
      "attendees": [{"email": "user@company.com", "status": "accepted"}]
    }
  ]
}
```

#### 2. Suggest Meeting Time
```
POST /calendar/suggest-meeting-time

Request:
{
  "attendees": ["user1@example.com", "user2@example.com"],
  "duration": 60,
  "dateRange": {
    "from": "2024-11-02",
    "to": "2024-11-07"
  },
  "preferredHours": { "start": 9, "end": 17 }
}

Response (200):
{
  "suggestions": [
    {
      "startTime": "2024-11-02T14:00:00Z",
      "endTime": "2024-11-02T15:00:00Z",
      "confidence": 0.95,
      "conflicts": []
    }
  ]
}
```

### Email Endpoints

#### 1. Get Emails
```
GET /email/messages?folder=inbox&limit=50

Response (200):
{
  "data": [
    {
      "id": "msg-1",
      "from": "sender@example.com",
      "subject": "Project Update",
      "receivedAt": "2024-11-01T09:30:00Z",
      "hasAttachments": true
    }
  ]
}
```

#### 2. Convert Email to Task
```
POST /email/messages/{messageId}/convert-to-task

Request:
{
  "title": "Action Required: Project Update",
  "priority": "high",
  "tags": ["project"]
}

Response (201):
{
  "taskId": "task-789",
  "title": "Action Required: Project Update",
  "linkedMessageId": "msg-1"
}
```

### User Endpoints

#### 1. Get Current User
```
GET /users/me

Response (200):
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "timezone": "UTC",
  "preferences": {
    "notifications": "all",
    "taskSort": "dueDate",
    "theme": "light"
  }
}
```

#### 2. Update User Settings
```
PATCH /users/me/settings

Request:
{
  "timezone": "America/New_York",
  "notifications": "important_only",
  "taskSort": "priority"
}

Response (200):
{
  "settings": { "timezone": "America/New_York", "..." }
}
```

---

## Database Models

### 1. User Model
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'user',
  timezone VARCHAR DEFAULT 'UTC',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP NULL,
  INDEX(email),
  INDEX(createdAt)
);
```

### 2. Task Model
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'pending',
  priority VARCHAR DEFAULT 'medium',
  dueDate TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP NULL,
  INDEX(userId, status),
  INDEX(dueDate),
  INDEX(createdAt)
);
```

### 3. Integration Model
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  provider VARCHAR NOT NULL,
  accountId VARCHAR NOT NULL,
  accountName VARCHAR,
  accessToken TEXT ENCRYPTED,
  refreshToken TEXT ENCRYPTED,
  scopes TEXT ARRAY,
  status VARCHAR DEFAULT 'active',
  lastSyncedAt TIMESTAMP NULL,
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId, provider, accountId),
  INDEX(userId, provider),
  INDEX(expiresAt)
);
```

### 4. SyncLog Model
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  integrationId UUID REFERENCES integrations(id),
  provider VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  itemsProcessed INT DEFAULT 0,
  itemsSynced INT DEFAULT 0,
  itemsFailed INT DEFAULT 0,
  errorMessage TEXT NULL,
  startedAt TIMESTAMP DEFAULT NOW(),
  completedAt TIMESTAMP NULL,
  durationMs INT,
  INDEX(integrationId, provider),
  INDEX(startedAt),
  INDEX(status)
);
```

### 5. TaskTag Model
```sql
CREATE TABLE task_tags (
  taskId UUID REFERENCES tasks(id),
  tag VARCHAR NOT NULL,
  PRIMARY KEY (taskId, tag),
  INDEX(tag)
);
```

### 6. ExternalTaskMapping Model
```sql
CREATE TABLE external_task_mappings (
  id UUID PRIMARY KEY,
  taskId UUID REFERENCES tasks(id),
  provider VARCHAR NOT NULL,
  externalId VARCHAR NOT NULL,
  externalUrl VARCHAR,
  lastSyncedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(taskId, provider),
  UNIQUE(provider, externalId),
  INDEX(taskId, provider)
);
```

### 7. CalendarEvent Model
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  integrationId UUID REFERENCES integrations(id),
  externalId VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP NOT NULL,
  organizer VARCHAR,
  attendees JSONB,
  isRecurring BOOLEAN DEFAULT FALSE,
  recurrenceRule VARCHAR,
  lastSyncedAt TIMESTAMP DEFAULT NOW(),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  INDEX(integrationId),
  INDEX(startTime),
  INDEX(externalId)
);
```

### 8. NotificationLog Model
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  type VARCHAR NOT NULL,
  channel VARCHAR NOT NULL,
  title VARCHAR,
  message TEXT,
  status VARCHAR DEFAULT 'pending',
  sentAt TIMESTAMP NULL,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(userId, status),
  INDEX(createdAt)
);
```

---

## Service Architecture

### Data Flow Patterns

#### Request Flow
```
User Request
    ↓
API Gateway (Auth, CORS, Rate Limit)
    ↓
Route Handler (Validation)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Database / Cache
    ↓
Response
```

#### Sync Flow
```
Trigger Sync (Manual/Scheduled)
    ↓
Queue Sync Job
    ↓
Fetch Data from External API
    ↓
Transform to Internal Model
    ↓
Detect Changes/Conflicts
    ↓
Upsert to Database
    ↓
Emit Events (WebSocket, Webhooks)
    ↓
Log Sync Status
    ↓
Cache Update (Redis)
```

### Service Interactions

```
Frontend
    ↓ (HTTP/WebSocket)
API Gateway
    ├─→ Task Service ←──┐
    ├─→ Sync Service ←──┤→ External APIs
    ├─→ Auth Service    │
    ├─→ Calendar Service│
    └─→ Email Service ←─┘
    ↓
Database (PostgreSQL) + Cache (Redis)
```

---

## Data Flow

### Task Creation Flow

```
1. User creates task via UI
   ↓
2. POST /tasks request
   ↓
3. Validate task data
   ↓
4. Store in database
   ↓
5. Emit task.created event
   ↓
6. If linked to integration:
   - Create external task in linked service
   - Store mapping in external_task_mappings
   ↓
7. Return task with ID
   ↓
8. Broadcast update via WebSocket
```

### Sync Flow

```
1. Scheduled/Manual sync trigger
   ↓
2. Get active integrations for user
   ↓
3. For each integration:
   - Get access token (refresh if needed)
   - Fetch items from external API
   - Transform to internal format
   - Get local changes since last sync
   ↓
4. Conflict Resolution:
   - External newer → Update local
   - Local newer → Queue for upload
   - Both changed → Manual review flag
   ↓
5. Batch upsert to database
   ↓
6. Update external_task_mappings
   ↓
7. Update sync_logs with status
   ↓
8. Emit sync.completed event
   ↓
9. Notify user of conflicts/errors
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Task retrieved |
| 201 | Created | Task created |
| 202 | Accepted | Sync queued |
| 204 | No Content | Task deleted |
| 400 | Bad Request | Invalid task data |
| 401 | Unauthorized | Missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Task doesn't exist |
| 409 | Conflict | Sync conflict detected |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |
| 503 | Unavailable | Service temporarily down |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_TASK_DATA",
    "message": "Task title is required",
    "details": {
      "field": "title",
      "reason": "missing_required_field"
    },
    "timestamp": "2024-11-01T10:00:00Z",
    "requestId": "req-123"
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| TOKEN_EXPIRED | JWT token expired | Refresh token |
| INTEGRATION_DISCONNECTED | Integration no longer connected | Reconnect integration |
| SYNC_CONFLICT | Conflicting changes detected | Manual review required |
| RATE_LIMIT_EXCEEDED | API rate limit hit | Retry after delay |
| EXTERNAL_API_ERROR | External service error | Check service status |
| INVALID_PERMISSIONS | Insufficient permissions | Check role/access |
| INVALID_TIMEZONE | Invalid timezone format | Use IANA timezone |
| DUPLICATE_INTEGRATION | Integration already connected | Disconnect existing |

---

## Security

### Authentication

**OAuth 2.0 Flow**:
1. Redirect user to provider login
2. Provider returns authorization code
3. Exchange code for access token
4. Store encrypted tokens in database
5. Use refresh token to get new access tokens

**JWT Tokens**:
- Issued on successful login
- Expires after 1 hour
- Refresh tokens expire after 30 days
- Include user ID and role in claims
- Signed with HS256 algorithm

### Authorization

**Role-Based Access Control**:
- User: Can manage own tasks and integrations
- Admin: Can manage all users and system settings
- Viewer: Read-only access to shared tasks

**Task Access Rules**:
- Creator can edit/delete own tasks
- Assigned users have read access
- Shared tasks inherit permissions
- Team members see team tasks

### Data Protection

**Encryption**:
- OAuth tokens encrypted with AES-256
- Sensitive data encrypted at rest
- HTTPS for all API communication
- TLS 1.2+ required

**Security Headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

**Input Validation**:
- Sanitize all user input
- Validate email formats
- Limit string lengths
- Escape special characters
- Use prepared statements

### Token Management

**Access Token**:
- Short-lived (1 hour)
- Contains user ID, role, scopes
- Included in Authorization header
- Validated on every request

**Refresh Token**:
- Long-lived (30 days)
- Stored securely in HttpOnly cookies
- Used to obtain new access tokens
- Can be revoked immediately

---

## Performance Optimization

### Caching Strategy

**Redis Cache**:
- User session data (1 hour TTL)
- Task list filters (15 min TTL)
- Integration status (5 min TTL)
- Calendar availability (1 hour TTL)
- API response caching (varies by endpoint)

**Cache Invalidation**:
- Event-driven invalidation
- Time-based expiration
- Manual cache clear on integration changes

### Database Optimization

**Indexing**:
```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(createdAt);

-- Tasks table
CREATE INDEX idx_tasks_user_status ON tasks(userId, status);
CREATE INDEX idx_tasks_duedate ON tasks(dueDate);
CREATE INDEX idx_tasks_created ON tasks(createdAt);

-- Integrations table
CREATE INDEX idx_integrations_user ON integrations(userId, provider);
CREATE INDEX idx_integrations_expires ON integrations(expiresAt);

-- Sync logs
CREATE INDEX idx_synclogs_integ ON sync_logs(integrationId, provider);
CREATE INDEX idx_synclogs_status ON sync_logs(status, startedAt);
```

**Query Optimization**:
- Use pagination (50 items default)
- Lazy-load relationships
- Use select specific fields
- Batch database operations
- Monitor slow queries

### API Rate Limiting

**Limits Per User**:
- 100 requests/minute for regular endpoints
- 10 requests/minute for sync endpoints
- 1000 requests/hour overall

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1635768000
```

### Sync Optimization

**Batch Processing**:
- Process 1000 items per batch
- Parallel processing for independent tasks
- Queue for async operations

**Incremental Sync**:
- Track last sync timestamp
- Only fetch changed items
- Delta sync when available

**Webhook Integration**:
- Real-time updates from external services
- Reduce polling frequency
- Immediate consistency

---

## Deployment Guide

### Environment Configuration

**Required Environment Variables**:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/priorio
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=3600

# OAuth Providers
GITHUB_CLIENT_ID=your-github-id
GITHUB_CLIENT_SECRET=your-github-secret

MICROSOFT_CLIENT_ID=your-microsoft-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret

GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret

# API
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=production

# Frontend
REACT_APP_API_URL=https://api.priorio.app
REACT_APP_OAUTH_REDIRECT=https://app.priorio.app/callback
```

### Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker Compose**:
```yaml
version: '3.8'

services:
  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/priorio
      REDIS_URL: redis://cache:6379
    ports:
      - "3000:3000"
    depends_on:
      - db
      - cache

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: priorio
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Database Migrations

**Migration File Pattern**:
```typescript
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email').unique().notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('users');
}
```

**Run Migrations**:
```bash
npm run migrate:latest
npm run migrate:rollback
npm run migrate:status
```

### Health Checks

**Health Check Endpoint**:
```bash
GET /health

Response (200):
{
  "status": "healthy",
  "timestamp": "2024-11-01T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "github": "operational",
    "outlook": "operational"
  }
}
```

---

## Summary

Priorio Phase 7 represents a complete, production-ready task management and synchronization platform. The system is built with modern technologies, comprehensive error handling, robust security measures, and optimized for performance at scale.

For questions or support, contact the development team.

---

**Document Version**: 7.0  
**Last Updated**: November 2024  
**Status**: Complete and Production Ready
