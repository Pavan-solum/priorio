# Mobile Client Development Guide

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm or pnpm
- Ionic CLI
- Capacitor CLI
- iOS/Android development tools

### Installation Steps

```bash
# Install dependencies
cd apps/mobile
pnpm install

# Add native platforms
ionic capacitor add ios
ionic capacitor add android

# Start development server
pnpm run dev
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── components/          # Reusable Vue components
│   │   ├── TaskCard.vue
│   │   ├── SyncStatusIndicator.vue
│   │   ├── OfflineBadge.vue
│   │   ├── NotificationBadge.vue
│   │   ├── ConflictResolver.vue
│   │   └── QuickCreateTask.vue
│   ├── views/               # Page components
│   │   ├── TaskListView.vue
│   │   ├── TaskDetailView.vue
│   │   ├── InboxView.vue
│   │   ├── RemindersView.vue
│   │   └── SettingsView.vue
│   ├── services/            # Business logic
│   │   ├── TaskSyncService.ts
│   │   ├── NotificationService.ts
│   │   ├── StorageService.ts
│   │   ├── AuthService.ts
│   │   └── DeviceService.ts
│   ├── stores/              # Pinia state
│   │   ├── task.ts
│   │   ├── auth.ts
│   │   ├── sync.ts
│   │   └── device.ts
│   ├── utils/               # Utilities
│   ├── App.vue              # Root component
│   └── main.ts              # App entry
├── capacitor.config.ts      # Capacitor config
├── package.json
└── tsconfig.json
```

## Component Usage Examples

### SyncStatusIndicator

```vue
<template>
  <div>
    <SyncStatusIndicator 
      @retry="retrySync"
      :showDetails="true"
    />
  </div>
</template>

<script setup lang="ts">
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue';

const retrySync = async () => {
  // Trigger sync retry
};
</script>
```

### QuickCreateTask

```vue
<template>
  <QuickCreateTask />
</template>

<script setup lang="ts">
import QuickCreateTask from '@/components/QuickCreateTask.vue';
</script>
```

### ConflictResolver

```vue
<template>
  <ConflictResolver
    :isOpen="showConflict"
    :conflict="conflictData"
    @close="showConflict = false"
    @resolved="handleResolved"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ConflictResolver from '@/components/ConflictResolver.vue';

const showConflict = ref(false);
const conflictData = ref(null);

const handleResolved = (resolution: string) => {
  console.log('Conflict resolved with:', resolution);
};
</script>
```

## State Management (Pinia Stores)

### Task Store

```typescript
import { useTaskStore } from '@/stores/task';

const taskStore = useTaskStore();

// Access tasks
const tasks = taskStore.tasks;

// Create task
await taskStore.createTask({
  title: 'New Task',
  priority: 'MEDIUM',
  status: 'TODO',
});

// Update task
await taskStore.updateTask(taskId, {
  status: 'COMPLETED',
});

// Delete task
await taskStore.deleteTask(taskId);
```

### Auth Store

```typescript
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

// Login
await authStore.login(email, password);

// Check if authenticated
if (authStore.isAuthenticated) {
  // User is logged in
}

// Logout
await authStore.logout();

// Get user info
const user = authStore.user;
```

### Sync Store

```typescript
import { useSyncStore } from '@/stores/sync';

const syncStore = useSyncStore();

// Get sync status
const status = syncStore.status; // 'idle', 'syncing', 'completed', 'error'

// Get last sync time
const lastSync = syncStore.lastSync;

// Add items to progress
syncStore.addProcessedItems(10);
```

## Service Integration

### TaskSyncService

```typescript
import { TaskSyncService } from '@/services/TaskSyncService';

const syncService = new TaskSyncService(
  'http://api.priorio.app',
  authToken
);

// Start sync
await syncService.startSync();

// Get sync status
const status = await syncService.getSyncStatus();

// Cancel sync
await syncService.cancelSync();
```

### NotificationService

```typescript
import { NotificationService } from '@/services/NotificationService';

// Send local notification
await NotificationService.sendNotification({
  title: 'Task Reminder',
  body: 'Your task is due soon',
});

// Schedule notification
await NotificationService.scheduleNotification({
  title: 'Reminder',
  body: 'Check your tasks',
  at: new Date('2024-12-31 10:00:00'),
});
```

### StorageService

```typescript
import { StorageService } from '@/services/StorageService';

// Set value
await StorageService.setItem('key', 'value');

// Get value
const value = await StorageService.getItem('key');

// Remove value
await StorageService.removeItem('key');

// Clear all
await StorageService.clear();
```

## Views Explained

### TaskDetailView

Full task management with:
- Title and description editing
- Status toggling
- Priority selection
- Due date picker
- Subtasks (add/toggle/delete)
- Tags/labels
- Reminders
- Auto-save on blur

### InboxView

Message management with:
- Smart filtering
- Search functionality
- Thread view
- Message replies
- Task conversion
- Infinite scroll
- Swipe actions

### RemindersView

Reminder management with:
- Categorized view (upcoming/snoozed/completed)
- Create/edit modals
- Snooze presets
- Recurring reminders
- Associated tasks

### SettingsView

Comprehensive settings with:
- Account management
- Device settings
- Sync preferences
- Notification control
- Theme selection
- Storage info
- Data export/import

## Styling Guidelines

### Using Ionic Components

```vue
<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>My Page</IonTitle>
      </IonToolbar>
    </IonHeader>
    
    <IonContent :fullscreen="true">
      <!-- Content here -->
    </IonContent>
  </IonPage>
</template>
```

### Custom CSS

All components use scoped CSS with CSS variables:

```css
:root {
  --ion-color-primary: #3880ff;
  --ion-color-success: #2dd36f;
  --ion-color-danger: #eb445c;
}
```

## Platform-Specific Code

### iOS-only Code

```typescript
import { Platform } from '@ionic/vue';

const platform = inject(Platform);

if (platform.is('ios')) {
  // iOS specific code
}
```

### Android-only Code

```typescript
if (platform.is('android')) {
  // Android specific code
}
```

## Network Status Handling

```typescript
import { Network } from '@capacitor/network';

// Check current status
const status = await Network.getStatus();

// Listen to changes
Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    // Back online
  } else {
    // Gone offline
  }
});
```

## Building for Production

### iOS Build

```bash
# Build for iOS
ionic capacitor build ios

# Open in Xcode
open ios/App/App.xcworkspace

# Build and upload to App Store
# Follow Xcode's Archive and Upload steps
```

### Android Build

```bash
# Build for Android
ionic capacitor build android

# Open in Android Studio
open android

# Build signed APK/AAB for Play Store
# In Android Studio: Build > Generate Signed Bundle / APK
```

## Debugging

### Console Logging

```typescript
console.log('Message', data);
console.warn('Warning', error);
console.error('Error', error);
```

### Remote Debugging

#### iOS
- Safari > Develop > [Device] > [App]

#### Android
- Chrome: chrome://inspect

### Capacitor Logging

```typescript
import { CapacitorException } from '@capacitor/core';

try {
  // Native operation
} catch (error) {
  if (error instanceof CapacitorException) {
    console.error('Capacitor error:', error.message);
  }
}
```

## Testing

### Unit Tests

```bash
pnpm run test:unit
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Component Tests

```vue
<script setup lang="ts">
import { render, screen } from '@vue/test-utils';
import MyComponent from './MyComponent.vue';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(MyComponent);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
</script>
```

## Performance Tips

1. **Lazy Load:** Use `import()` for large components
2. **Virtual Lists:** Use `IonVirtualScroll` for long lists
3. **Image Optimization:** Compress and lazy-load images
4. **Debounce:** Debounce input events
5. **Memoize:** Use computed for expensive calculations

## Troubleshooting

### Common Issues

1. **Platform not detected**
   ```typescript
   // Use @capacitor/device instead
   import { Device } from '@capacitor/device';
   ```

2. **Storage not working**
   ```typescript
   // Check Capacitor plugin permissions
   // iOS: Info.plist
   // Android: AndroidManifest.xml
   ```

3. **Notifications not showing**
   ```typescript
   // Ensure permissions granted
   // Check notification channel (Android)
   ```

## Resources

- [Ionic Documentation](https://ionicframework.com/docs)
- [Vue 3 Guide](https://vuejs.org/)
- [Capacitor Docs](https://capacitorjs.com)
- [Pinia Docs](https://pinia.vuejs.org)

---

**Last Updated:** 2024
**Version:** 1.0.0
