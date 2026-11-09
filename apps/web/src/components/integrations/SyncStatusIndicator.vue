<template>
  <div class="sync-status-indicator">
    <!-- Header -->
    <div class="indicator-header">
      <div class="status-badge" :class="`status-${status}`">
        <span v-if="status === 'idle'" class="icon">●</span>
        <span v-else-if="status === 'syncing'" class="icon spinning">⟳</span>
        <span v-else-if="status === 'error'" class="icon">⚠</span>
        <span v-else class="icon">✓</span>
        <span class="status-text">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="status === 'syncing'" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>

    <!-- Items Count -->
    <div v-if="status === 'syncing' || itemsProcessed > 0" class="items-info">
      <p class="items-text">
        {{ itemsProcessed }} of {{ totalItems }} items processed
      </p>
    </div>

    <!-- Error Message -->
    <div v-if="error && status === 'error'" class="error-message">
      <span class="error-icon">⚠</span>
      <p>{{ error }}</p>
      <button @click="retrySync" class="btn-retry">
        Retry
      </button>
    </div>

    <!-- Last Sync Info -->
    <div class="sync-info">
      <div v-if="lastSyncTime" class="sync-time">
        <span class="label">Last synced:</span>
        <span class="time">{{ formatTime(lastSyncTime) }}</span>
      </div>
      <div v-if="nextSyncTime" class="sync-time">
        <span class="label">Next sync:</span>
        <span class="time">{{ formatTime(nextSyncTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Props for SyncStatusIndicator
 */
interface Props {
  status: 'idle' | 'syncing' | 'error' | 'success'
  progress?: number
  itemsProcessed?: number
  totalItems?: number
  error?: string | null
  lastSyncTime?: string | null
  nextSyncTime?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  itemsProcessed: 0,
  totalItems: 0,
})

/**
 * Get status label
 */
const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    idle: 'Ready to sync',
    syncing: 'Syncing...',
    error: 'Sync failed',
    success: 'Synced successfully',
  }
  return labels[props.status] || props.status
})

/**
 * Format time display
 */
const formatTime = (time: string): string => {
  const date = new Date(time)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  return date.toLocaleDateString()
}

/**
 * Retry sync
 */
const retrySync = () => {
  emit('retry')
}

const emit = defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.sync-status-indicator {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-color);
}

.indicator-header {
  margin-bottom: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.status-idle {
  background: rgba(158, 158, 158, 0.1);
  color: #9e9e9e;
}

.status-badge.status-syncing {
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
}

.status-badge.status-error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.status-badge.status-success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.icon {
  display: inline-block;
  font-size: 1rem;
}

.icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-container {
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #1976d2);
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
  text-align: right;
}

.items-info {
  margin-bottom: 12px;
}

.items-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.error-message {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f44336;
}

.error-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.error-message p {
  margin: 0;
  font-size: 0.875rem;
  flex: 1;
}

.btn-retry {
  padding: 4px 8px;
  font-size: 0.75rem;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-retry:hover {
  background: #d32f2f;
}

.sync-info {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
  font-size: 0.875rem;
}

.sync-time {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.sync-time:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
}

.time {
  color: var(--text-primary);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .sync-status-indicator {
    --border-color: #424242;
    --surface-color: #303030;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}

/* Light mode */
@media (prefers-color-scheme: light) {
  .sync-status-indicator {
    --border-color: #e0e0e0;
    --surface-color: #fafafa;
    --text-primary: #212121;
    --text-secondary: #666;
  }
}
</style>
