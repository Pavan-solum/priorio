# Desktop Client Development Guide

## Setup & Installation

### Prerequisites
- Node.js 18+
- Rust 1.60+ (for Tauri)
- pnpm or npm
- C++ build tools (Windows) / Xcode (macOS) / build-essential (Linux)

### Installation Steps

```bash
# Install dependencies
cd apps/desktop
pnpm install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Start development server
pnpm run dev
```

## Project Structure

```
apps/desktop/
├── src/
│   ├── components/          # Vue components
│   │   ├── MainTaskList.vue
│   │   ├── QuickCreateTask.vue
│   │   ├── SyncStatus.vue
│   │   └── ConflictUI.vue
│   ├── services/            # TypeScript services
│   │   ├── TauriWindowService.ts
│   │   ├── SecureStorageService.ts
│   │   ├── NotificationService.ts
│   │   ├── FileService.ts
│   │   └── IpcService.ts
│   ├── stores/              # Pinia state
│   ├── App.vue
│   └── main.ts
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   ├── db.rs
│   │   └── utils.rs
│   └── Cargo.toml
├── package.json
├── tauri.conf.json
└── tsconfig.json
```

## Tauri Configuration

### tauri.conf.json

Main application configuration:

```json
{
  "app": {
    "windows": [{
      "title": "Priorio",
      "width": 1200,
      "height": 800,
      "minWidth": 800,
      "minHeight": 600,
      "resizable": true
    }]
  },
  "tauri": {
    "allowlist": {
      "window": { "all": true },
      "fs": { "all": true },
      "notification": { "all": true },
      "dialog": { "all": true }
    }
  }
}
```

## Service Usage

### TauriWindowService

```typescript
import { TauriWindowService } from '@/services/TauriWindowService';

// Show/hide window
await TauriWindowService.showWindow();
await TauriWindowService.hideWindow();

// Window management
await TauriWindowService.toggleMaximize();
await TauriWindowService.minimizeWindow();

// Get window info
const size = await TauriWindowService.getWindowSize();
const position = await TauriWindowService.getWindowPosition();

// Event listeners
const unlisten = await TauriWindowService.onWindowEvent(
  'resize',
  (payload) => console.log('Resized:', payload)
);
```

### SecureStorageService

```typescript
import { SecureStorageService } from '@/services/SecureStorageService';

// Store token
await SecureStorageService.setAuthToken('token-value');

// Retrieve token
const token = await SecureStorageService.getAuthToken();

// Store credentials
await SecureStorageService.setApiCredentials('user', 'pass');

// Encryption/Decryption
const encrypted = SecureStorageService.encrypt('data');
const decrypted = SecureStorageService.decrypt(encrypted);

// Hashing
const hash = SecureStorageService.hash('password');

// Generate key
const key = SecureStorageService.generateKey(32);
```

### NotificationService

```typescript
import { NotificationService } from '@/services/NotificationService';

// Send notification
await NotificationService.sendNotification({
  title: 'Task Reminder',
  body: 'Your task is due in 10 minutes',
  urgency: 'critical',
  sound: true,
});

// Task reminder
await NotificationService.notifyTaskReminder(
  'Complete report',
  'Due today at 5 PM'
);

// Sync notifications
await NotificationService.notifySyncComplete(42);
await NotificationService.notifySyncError('Network error');

// Get notification history
const notifications = await NotificationService.getNotifications();

// Clear notifications
await NotificationService.clearNotification(notificationId);
await NotificationService.clearAllNotifications();
```

### FileService

```typescript
import { FileService } from '@/services/FileService';

// Pick file
const file = await FileService.pickFile({
  filters: [{ name: 'JSON', extensions: ['json'] }],
});

// Pick multiple files
const files = await FileService.pickFiles({
  filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
});

// Pick directory
const dir = await FileService.pickDirectory();

// Read file
const content = await FileService.readFile('/path/to/file.txt');

// Write file
await FileService.writeFile('/path/to/file.txt', 'content');

// Delete file
await FileService.deleteFile('/path/to/file.txt');

// Export data
await FileService.exportData({ tasks: [...] }, 'backup.json');

// Import data
const result = await FileService.importData();
if (result) {
  console.log('Imported from:', result.path);
  console.log('Data:', result.data);
}

// Open file with default app
await FileService.openFile('/path/to/document.pdf');
```

### IpcService

```typescript
import { IpcService } from '@/services/IpcService';

// Send message
const result = await IpcService.sendMessage('some_command', {
  data: 'value'
});

// Listen for messages
const unlisten = await IpcService.onMessage('event_name', (payload) => {
  console.log('Received:', payload);
});

// Sync operations
const { syncId, status } = await IpcService.startSync();

// Get sync status
const syncStatus = await IpcService.getSyncStatus(syncId);

// Listen to sync events
await IpcService.onSyncProgress((progress) => {
  console.log(`Synced ${progress.processedItems}/${progress.totalItems}`);
});

await IpcService.onSyncComplete((result) => {
  console.log(`Sync completed: ${result.itemsSynced} items`);
});

await IpcService.onSyncError((error) => {
  console.error('Sync error:', error);
});
```

## IPC Communication

### Frontend to Backend

```typescript
// TypeScript (Frontend)
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke('my_command', { arg: 'value' });
```

```rust
// Rust (Backend - main.rs)
#[tauri::command]
async fn my_command(arg: String) -> Result<String, String> {
    Ok(format!("Hello, {}", arg))
}
```

### Backend to Frontend

```rust
// Emit event from Rust
app_handle.emit_all("my_event", payload)?;
```

```typescript
// Listen in TypeScript
import { listen } from '@tauri-apps/api/event';

await listen('my_event', (event) => {
  console.log('Event:', event.payload);
});
```

## Building for Production

### Development Build

```bash
pnpm run dev
```

### Production Build

```bash
pnpm run build
```

Output locations:
- **Windows:** `src-tauri/target/release/priorio-desktop.exe`
- **macOS:** `src-tauri/target/release/bundle/macos/Priorio.app`
- **Linux:** `src-tauri/target/release/bundle/deb/priorio-desktop_*.deb`

### Release Build

```bash
pnpm run build:release
```

Creates optimized, signed binaries for distribution.

## Rust Development

### Adding Rust Commands

Create in `src-tauri/src/commands/`:

```rust
// my_feature.rs
#[tauri::command]
pub async fn my_feature(input: String) -> Result<String, String> {
    // Implementation
    Ok(result)
}
```

Register in `main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::my_feature::my_feature,
])
```

### Database Queries

```rust
// Using SQLx
let task = sqlx::query_as::<_, Task>(
    "SELECT * FROM tasks WHERE id = ?"
)
.bind(id)
.fetch_one(&pool)
.await?;
```

## Components

### MainTaskList

Display tasks with sorting/filtering:

```vue
<template>
  <MainTaskList 
    :tasks="tasks"
    @task-click="handleTaskClick"
    @task-complete="handleTaskComplete"
  />
</template>
```

### QuickCreateTask

Fast task input:

```vue
<template>
  <QuickCreateTask 
    @task-created="handleTaskCreated"
  />
</template>
```

### SyncStatus

Real-time sync indicator:

```vue
<template>
  <SyncStatus 
    :status="syncStatus"
    :progress="syncProgress"
    @retry="handleRetry"
  />
</template>
```

### ConflictUI

Conflict resolution UI:

```vue
<template>
  <ConflictUI 
    :conflict="conflict"
    @resolved="handleResolved"
  />
</template>
```

## System Tray Integration

### Tray Menu

```rust
// In main.rs
let tray_menu = SystemTrayMenu::new()
    .add_item(MenuItem::new("Show", "show"))
    .add_item(MenuItem::new("Sync", "sync"))
    .add_native_item(PredefinedMenuItem::Separator)
    .add_item(MenuItem::new("Quit", "quit"));

SystemTray::new().with_menu(tray_menu)
```

### Handle Tray Events

```rust
fn handle_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                    }
                }
                "sync" => {
                    // Trigger sync
                }
                "quit" => std::process::exit(0),
                _ => {}
            }
        }
        _ => {}
    }
}
```

## Keyboard Shortcuts

Register global shortcuts:

```typescript
import { GlobalShortcutManager } from '@tauri-apps/api/globalShortcut';

await GlobalShortcutManager.register('Ctrl+K', () => {
  // Quick create task
});

await GlobalShortcutManager.register('Ctrl+L', () => {
  // Toggle sidebar
});
```

## Data Persistence

### Local Storage (Frontend)

```typescript
// Simple key-value
localStorage.setItem('key', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('key'));

// With Pinia
const store = useTaskStore();
store.$subscribe((mutation, state) => {
  localStorage.setItem('tasks', JSON.stringify(state.tasks));
});
```

### SQLite (Backend)

```rust
// Initialize in main.rs
let pool = sqlx::sqlite::SqlitePoolOptions::new()
    .connect("sqlite:./priorio.db")
    .await?;

// Query
let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks")
    .fetch_all(&pool)
    .await?;
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const HeavyComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
);
```

### Image Optimization

```html
<!-- Use WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.png" alt="description">
</picture>
```

### Debouncing

```typescript
import { debounce } from 'lodash-es';

const handleSearch = debounce((query: string) => {
  // Search
}, 300);
```

## Debugging

### Tauri DevTools

```bash
pnpm run dev
# DevTools will be available in development
```

### Rust Logging

```rust
println!("Info: {:?}", value);
eprintln!("Error: {:?}", error);
```

### Frontend DevTools

- Press `F12` to open DevTools
- DevTools shortcut: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)

## Troubleshooting

### Common Issues

1. **Build fails on Windows**
   ```bash
   # Install Visual Studio Build Tools
   # Or use: https://visualstudio.microsoft.com/downloads/
   ```

2. **Tauri not found**
   ```bash
   cargo install tauri-cli
   ```

3. **Database connection error**
   ```bash
   # Ensure database file is writable
   chmod 644 ./priorio.db
   ```

## Resources

- [Tauri Documentation](https://tauri.app)
- [Vue 3 Guide](https://vuejs.org)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLx Documentation](https://github.com/launchbadge/sqlx)

---

**Last Updated:** 2024
**Version:** 1.0.0
