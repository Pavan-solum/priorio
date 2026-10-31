# Phase 7 Quick Reference Guide

## File Structure
```
apps/api/src/integrations/
├── providers/                          # Core provider services
│   ├── teams.service.ts               # Teams integration (600+ lines)
│   ├── calendar.service.ts            # Google/Outlook Calendar (600+ lines)
│   ├── outlook.service.ts             # Outlook email + calendar (600+ lines)
│   ├── oauth-extension.service.ts     # OAuth management (500+ lines)
│   ├── event-sync.engine.ts           # Sync orchestration (700+ lines)
│   └── permission.service.ts          # Permission management (500+ lines)
├── adapters/                           # Data normalization services
│   ├── teams.adapter.ts               # Teams message/event formatting
│   ├── calendar.adapter.ts            # Calendar event normalization
│   ├── outlook.adapter.ts             # Email formatting
│   ├── provider-notification.service.ts  # Webhook handling
│   └── sync-status.service.ts         # Sync monitoring
├── dtos/                               # Data transfer objects
│   ├── teams-chat.dto.ts
│   ├── calendar-event.dto.ts
│   ├── outlook-email.dto.ts
│   ├── oauth-token.dto.ts
│   ├── permission.dto.ts
│   ├── sync-status.dto.ts
│   ├── provider-event.dto.ts
│   └── index.ts
├── providers.controller.ts             # 40+ REST endpoints
└── integrations.module.ts              # Updated module
```

## Service Responsibilities

### TeamsService
- OAuth: `connectTeamsAccount()`, `disconnectTeamsAccount()`
- Sync: `syncTeamChats()`
- Create: `createTaskFromMessage()`
- Notify: `postNotificationToTeam()`
- Track: `trackTeamsActivity()`

### CalendarService
- OAuth: `connectCalendarAccount()`
- Sync: `syncCalendarEvents()`
- Create: `createEventFromTask()`
- Availability: `fetchAvailability()`, `suggestOptimalTime()`

### OutlookService
- OAuth: `connectOutlookAccount()`, `disconnectOutlookAccount()`
- Email: `syncOutlookEmail()`, `createTaskFromEmail()`
- Calendar: `syncOutlookCalendar()`
- Track: `trackOutlookActivity()`

### OAuthExtensionService
- Register: `registerNewProvider()`
- OAuth Flows: `handleGitHubOAuth()`, `handleMicrosoftOAuth()`
- Validation: `validateProviderCredentials()`
- Refresh: `refreshProviderTokens()`

### EventSyncEngine
- Sync: `syncAllProviders()`
- Detect: `detectEventChanges()`
- Resolve: `resolveConflicts()`
- Queue: `queueSyncOperation()`, `executeSyncQueue()`

### ProviderPermissionService
- Request: `requestPermissions()`
- Grant: `grantPermissions()`
- Revoke: `revokePermissions()`
- Validate: `validatePermissions()`
- List: `listPermissions()`
- Monitor: `getExpiringPermissions()`, `renewPermissions()`

## Key Constants

### Sync Configuration
```typescript
maxRetries = 3;                    // API retry attempts
retryDelay = 1000;                 // Base retry delay (ms)
maxQueueSize = 10000;              // Max queued operations
batchSize = 100;                   // Sync batch size
```

### Permission Defaults
```typescript
syncFrequency = 600;               // Default: 10 minutes (seconds)
permissionExpiry = 90 days;        // Default expiry
defaultWorkHours = "9-17";         // Calendar working hours
excludeWeekends = true;            // Skip weekend slots
```

### Timezone
```typescript
defaultTimezone = "UTC";
workHoursStart = 9;                // 9 AM
workHoursEnd = 17;                 // 5 PM
```

## Common Patterns

### Service Injection
```typescript
constructor(
  private prisma: PrismaService,
  private configService: ConfigService,
) {}
```

### Error Handling
```typescript
try {
  // Operation
  return { success: true, data };
} catch (error) {
  this.logger.error(`Failed: ${error.message}`);
  throw new BadRequestException('Error message');
}
```

### Retry Logic
```typescript
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
```

### Token Encryption
```typescript
// Encrypt
private encryptToken(token: string): string {
  const key = this.configService.get('ENCRYPTION_KEY', 'default-key');
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt
private decryptToken(encryptedToken: string): string {
  const key = this.configService.get('ENCRYPTION_KEY', 'default-key');
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

## Endpoint Patterns

### Connection (OAuth)
```
POST /integrations/{provider}/connect
GET  /integrations/{provider}/account/:integrationId
POST /integrations/{provider}/disconnect/:integrationId
```

### Sync
```
POST /integrations/{provider}/sync
GET  /integrations/{provider}/{resource}/:integrationId
```

### Creation (from message/email)
```
POST /integrations/{provider}/message-to-task
POST /integrations/{provider}/email-to-task
POST /integrations/calendar/create-event
```

### Management
```
POST /integrations/oauth/register-provider
POST /integrations/oauth/{provider}/callback
POST /integrations/oauth/refresh-token/:integrationId
POST /integrations/oauth/validate/:integrationId
```

### Sync Engine
```
POST /integrations/sync/all/:workspaceId
GET  /integrations/sync/status/:integrationId
POST /integrations/sync/detect-changes
POST /integrations/sync/resolve-conflicts/:workspaceId
POST /integrations/sync/queue
POST /integrations/sync/execute-queue/:workspaceId
```

### Permissions
```
POST /integrations/permissions/request
POST /integrations/permissions/grant
POST /integrations/permissions/revoke
GET  /integrations/permissions/list/:integrationId
POST /integrations/permissions/validate
GET  /integrations/permissions/expiring/:workspaceId
```

## Database Models Used

| Model | Purpose |
|-------|---------|
| `ExternalIntegration` | Provider account connections |
| `IntegrationPermission` | Granular permission tracking |
| `IntegrationSyncLog` | Sync operation history |
| `ProviderTask` | Task-event mapping |
| `ProviderEvent` | External events |
| `ProviderNotification` | Webhook subscriptions |
| `ProviderAPIUsage` | Rate limit tracking |
| `SyncConflict` | Conflict tracking |
| `SyncQueueItem` | Async operations |
| `AuditLog` | Compliance/audit trail |

## Key Decisions

1. **Token Encryption** - AES-256-CBC for all sensitive tokens at rest
2. **Retry Strategy** - Exponential backoff with jitter
3. **Sync Model** - Pull-based with webhook supplements
4. **Conflict Resolution** - LAST_WRITE_WINS as default, with alternatives
5. **Permission Expiry** - 90 days with auto-renewal capability
6. **Timezone Handling** - Moment-timezone for accuracy
7. **Queue Processing** - Batch-based for efficiency
8. **Error Logging** - Structured logging for monitoring

## Testing Checklist

- [ ] OAuth flows for all providers
- [ ] Token refresh and expiry
- [ ] Sync operations (full, incremental, per-type)
- [ ] Conflict detection and resolution
- [ ] Permission grants and revocation
- [ ] Calendar availability calculation
- [ ] Meeting time suggestions
- [ ] Email-to-task conversion
- [ ] Message-to-task conversion
- [ ] Webhook subscription/renewal
- [ ] Sync queue processing
- [ ] Error handling and retry logic
- [ ] Encryption/decryption
- [ ] Timezone conversions
- [ ] Rate limit tracking
- [ ] Audit logging
- [ ] Performance metrics

## Deployment Considerations

1. **Environment Variables** - Set OAuth credentials and encryption key
2. **Database** - Run Prisma migrations for Phase 7 models
3. **Secrets** - Store encryption keys securely
4. **Rate Limiting** - Configure per-provider limits
5. **Monitoring** - Set up logging and alerting
6. **Webhook URLs** - Configure callback URLs
7. **Timezone** - Set server timezone to UTC
8. **Dependencies** - Install moment-timezone, axios

## Performance Optimization

1. Batch sync operations for efficiency
2. Cache provider metadata
3. Use queue system for async operations
4. Implement pagination for large result sets
5. Monitor API usage and adjust sync frequency
6. Use connection pooling for database
7. Implement response compression
8. Add rate limiting per provider

## Security Checklist

- [ ] All tokens encrypted at rest
- [ ] HTTPS enforced for all API calls
- [ ] JWT auth on all endpoints
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection via content headers
- [ ] Rate limiting implemented
- [ ] Audit logs for permission changes
- [ ] Regular security review scheduled
