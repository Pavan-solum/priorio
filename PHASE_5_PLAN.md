# Phase 5: Cross-Platform - Complete Implementation Plan

**Date:** October 31, 2026  
**Status:** 🚀 **STARTING**  
**Phase:** 5 (Cross-Platform Mobile & Desktop)

---

## 📋 Phase Overview

Phase 5 introduces **cross-platform applications** to Priorio:

1. **Mobile Client** - Ionic Vue + Capacitor (iOS & Android)
2. **Desktop Client** - Tauri (Windows, macOS, Linux)
3. **Device Management** - Registration, sync, notifications
4. **Cross-Device Sync** - Synchronized data across platforms

---

## 🎯 Phase 5 Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│  Priorio Cross-Platform System (Phase 5)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐    │
│  │   Web      │  │   Mobile    │  │   Desktop    │    │
│  │  (Vue 3)   │  │ (Ionic Vue) │  │   (Tauri)    │    │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘    │
│        │                 │                 │             │
│        └─────────────────┼─────────────────┘             │
│                          │                              │
│                  ┌───────▼────────┐                     │
│                  │  Device Manager │                    │
│                  │  & Sync Engine  │                    │
│                  └───────┬────────┘                     │
│                          │                              │
│                  ┌───────▼────────┐                     │
│                  │  Priorio API   │                     │
│                  │  (NestJS)      │                     │
│                  └───────┬────────┘                     │
│                          │                              │
│        ┌─────────────────┼─────────────────┐            │
│        │                 │                 │             │
│  ┌─────▼────┐  ┌────────▼────────┐ ┌──────▼──────┐    │
│  │PostgreSQL│  │     Redis       │ │  Cloud Sync │    │
│  │ Database │  │   (Sessions)    │ │   Service   │    │
│  └──────────┘  └─────────────────┘ └─────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Deliverables

### 1. Mobile Client (Ionic Vue + Capacitor)
```
Features:
  ✅ Task management (view, create, edit, delete)
  ✅ Inbox with filtering and sorting
  ✅ Reminders with push notifications
  ✅ Offline-first sync
  ✅ Camera integration (Android/iOS)
  ✅ Native notifications
  ✅ Biometric authentication
  
Platforms:
  ✅ Android (Capacitor)
  ✅ iOS (Capacitor)
  
Structure:
  apps/mobile/
  ├── src/
  │   ├── components/
  │   ├── views/
  │   ├── services/
  │   ├── stores/
  │   └── App.vue
  ├── capacitor.config.ts
  ├── package.json
  └── build/
```

### 2. Desktop Client (Tauri)
```
Features:
  ✅ Full task management UI
  ✅ Tray application behavior
  ✅ Secure local storage (keyring)
  ✅ System notifications
  ✅ Window management
  ✅ File drag & drop
  ✅ Context menu integration
  
Platforms:
  ✅ Windows
  ✅ macOS
  ✅ Linux
  
Structure:
  apps/desktop/
  ├── src-tauri/
  │   ├── src/
  │   │   ├── main.rs
  │   │   └── commands/
  │   └── tauri.conf.json
  ├── src/
  │   ├── components/
  │   ├── views/
  │   └── App.vue
  ├── package.json
  └── build/
```

### 3. Device Management Service
```
Features:
  ✅ Device registration
  ✅ Device tracking
  ✅ Cross-device sync
  ✅ Offline-first capability
  ✅ Conflict resolution
  ✅ Data reconciliation
  
Models:
  ✅ Device entity
  ✅ DeviceSyncLog
  ✅ OfflineTasks
  ✅ SyncQueue
```

### 4. Testing Suite
```
✅ Mobile E2E tests (Cypress)
✅ Desktop E2E tests (Tauri test driver)
✅ API integration tests
✅ Offline sync tests
✅ Cross-device sync tests
```

---

## 🗄️ Database Models (Phase 5)

```prisma
model Device {
  id                String   @id @default(uuid()) @db.Uuid
  workspaceId       String   @map("workspace_id") @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  
  name              String   // "iPhone", "MacBook Pro", etc
  type              String   // mobile, desktop, web
  platform          String   // ios, android, windows, macos, linux
  osVersion         String   @map("os_version")
  appVersion        String   @map("app_version")
  deviceId          String   @unique @map("device_id")
  
  // Device capabilities
  supportsNotifications Boolean @default(true) @map("supports_notifications")
  supportsOfflineMode Boolean @default(true) @map("supports_offline_mode")
  
  // Last sync
  lastSyncAt        DateTime? @map("last_sync_at")
  lastSeenAt        DateTime @default(now()) @map("last_seen_at")
  isActive          Boolean  @default(true) @map("is_active")
  
  // Relationships
  syncLogs          DeviceSyncLog[]
  offlineTasks      OfflineTask[]
  syncQueue         SyncQueueItem[]
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  @@unique([workspaceId, deviceId])
  @@index([workspaceId])
  @@index([userId])
  @@map("devices")
}

model DeviceSyncLog {
  id                String   @id @default(uuid()) @db.Uuid
  deviceId          String   @map("device_id") @db.Uuid
  device            Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  
  syncType          String   // "full", "incremental", "conflict_resolution"
  status            String   // "started", "completed", "failed"
  
  itemsSynced       Int      @default(0) @map("items_synced")
  itemsFailed       Int      @default(0) @map("items_failed")
  
  dataSize          Int      @map("data_size")
  duration          Int      @map("duration") // milliseconds
  
  errorMessage      String?  @map("error_message")
  
  startedAt         DateTime @default(now()) @map("started_at")
  completedAt       DateTime? @map("completed_at")
  
  @@index([deviceId])
  @@index([startedAt])
  @@map("device_sync_logs")
}

model OfflineTask {
  id                String   @id @default(uuid()) @db.Uuid
  deviceId          String   @map("device_id") @db.Uuid
  device            Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  
  taskId            String?  @map("task_id") @db.Uuid
  
  // Offline copy
  title             String
  description       String?
  status            String   // PENDING, IN_PROGRESS, COMPLETED
  priority          String
  
  // Sync state
  isSynced          Boolean  @default(false) @map("is_synced")
  localVersion      Int      @default(1) @map("local_version")
  serverVersion     Int?     @map("server_version")
  
  operation         String   // create, update, delete
  
  createdOfflineAt  DateTime @default(now()) @map("created_offline_at")
  syncedAt          DateTime? @map("synced_at")
  
  @@index([deviceId])
  @@index([taskId])
  @@map("offline_tasks")
}

model SyncQueueItem {
  id                String   @id @default(uuid()) @db.Uuid
  deviceId          String   @map("device_id") @db.Uuid
  device            Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  
  resourceType      String   // "task", "reminder", "note"
  resourceId        String   @map("resource_id")
  
  operation         String   // create, update, delete
  payload           Json
  
  status            String   @default("pending") // pending, synced, failed
  retryCount        Int      @default(0) @map("retry_count")
  maxRetries        Int      @default(3) @map("max_retries")
  
  failureReason     String?  @map("failure_reason")
  
  createdAt         DateTime @default(now()) @map("created_at")
  syncedAt          DateTime? @map("synced_at")
  
  @@index([deviceId])
  @@index([status])
  @@map("sync_queue_items")
}
```

---

## 📱 Mobile Client Structure

### Key Components
```typescript
// Views
- TaskListView - Main task list with offline sync
- TaskDetailView - Task editing with auto-sync
- InboxView - Inbox with smart filtering
- RemindersView - Reminders with push notifications
- SettingsView - Device settings & auth

// Services
- TaskSyncService - Offline-first sync engine
- NotificationService - Push notifications
- StorageService - Local storage with encryption
- AuthService - Device authentication
- DeviceService - Device registration & management

// Stores (Pinia)
- TaskStore - Task state management
- AuthStore - Authentication state
- SyncStore - Sync status tracking
- DeviceStore - Device information
```

### Capabilities
- **Offline-First** - Work without internet
- **Auto-Sync** - Sync when connectivity restored
- **Camera** - Photo capture for tasks
- **Push Notifications** - Real-time alerts
- **Biometric Auth** - Fingerprint/Face ID
- **Local Storage** - Encrypted SQLite

---

## 🖥️ Desktop Client Structure

### Key Components
```typescript
// Views
- MainWindow - Primary task management UI
- TrayWindow - Quick task creation from tray
- SettingsWindow - Application settings
- DeviceSettingsWindow - Sync configuration

// Services
- TauriWindowService - Window management
- SecureStorageService - Keyring integration
- NotificationService - System notifications
- FileService - File operations
- IpcService - Tauri IPC communication

// Tauri Commands
- sync_tasks - Trigger task sync
- get_device_info - Get device information
- save_secure_data - Store in system keyring
- show_notification - Display system notification
- get_file_path - File picker integration
```

### Features
- **Tray Application** - Minimize to system tray
- **Keyboard Shortcuts** - Global shortcuts (Cmd+K to create)
- **Secure Storage** - macOS Keychain, Windows Credential Manager
- **System Notifications** - Native desktop notifications
- **Multi-Window** - Main + settings + quick actions
- **Dark Mode** - Native theme support

---

## 🔄 Cross-Device Sync Strategy

### Sync Flow
```
1. Local Change
   User modifies task on mobile
   ↓
2. Queue Operation
   Store in SyncQueueItem with uuid
   Update OfflineTask
   ↓
3. When Online
   Send to API with device ID
   Wait for conflict resolution
   ↓
4. Server Processing
   Apply change to database
   Update lastSyncAt
   ↓
5. Propagate to Other Devices
   Send sync notification to other devices
   Each device pulls latest data
   ↓
6. Conflict Resolution
   If concurrent edits: use lastModifiedAt
   If concurrent deletes: delete wins
   If create/delete: delete wins
```

### Conflict Resolution Rules
```
Rule 1: Last-Write-Wins
  If two devices modify same field:
  Use timestamp-based resolution
  
Rule 2: Delete Wins
  If one device deletes, others create:
  Delete operation takes precedence
  
Rule 3: Collection Merge
  For lists/arrays:
  Merge non-conflicting items
  For conflicts: last-write-wins
  
Rule 4: User Notification
  Show conflict resolution UI
  Allow user to choose version
```

---

## 🧪 Testing Strategy

### Mobile E2E Tests (Cypress)
```
✅ Task CRUD operations (offline & online)
✅ Sync functionality
✅ Push notification handling
✅ Authentication flow
✅ Offline-first experience
✅ Camera integration
```

### Desktop E2E Tests
```
✅ Window management
✅ Tray behavior
✅ Keyboard shortcuts
✅ File operations
✅ Sync operations
✅ Settings persistence
```

### API Integration Tests
```
✅ Device registration
✅ Cross-device sync
✅ Conflict resolution
✅ Offline-first operations
✅ Sync queue processing
```

---

## 📊 Success Criteria

- ✅ Mobile app builds for iOS & Android
- ✅ Desktop app builds for Windows, macOS, Linux
- ✅ Offline-first sync working seamlessly
- ✅ Cross-device sync functional
- ✅ Conflict resolution working
- ✅ Push notifications working
- ✅ All E2E tests passing
- ✅ Performance targets met
- ✅ Production-ready deployment

---

## ⏱️ Estimated Timeline

**Phase 5: Cross-Platform Development**
- Mobile client: 1-1.5 hours
- Desktop client: 1-1.5 hours
- Device management: 1 hour
- Testing & integration: 1-1.5 hours
- **Total: 4-5 hours**

---

**Status:** Ready for implementation
**Next:** Begin Phase 5 implementation
