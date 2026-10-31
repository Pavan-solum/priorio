<template>
  <div class="provider-card" :class="{ connected: isConnected }">
    <!-- Header with provider icon and status -->
    <div class="card-header">
      <div class="provider-info">
        <div class="provider-icon">
          <i :class="iconClass"></i>
        </div>
        <div class="provider-details">
          <h3 class="provider-name">{{ provider.provider }}</h3>
          <p class="provider-account">{{ provider.email || provider.account }}</p>
        </div>
      </div>
      <div class="status-indicator" :class="`status-${provider.status}`">
        <span class="status-dot"></span>
        <span class="status-text">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Sync information -->
    <div v-if="isConnected" class="sync-info">
      <div class="sync-item">
        <span class="label">Last synced:</span>
        <span class="value">{{ lastSyncDisplay }}</span>
      </div>
      <div v-if="provider.nextSyncAt" class="sync-item">
        <span class="label">Next sync:</span>
        <span class="value">{{ nextSyncDisplay }}</span>
      </div>
    </div>

    <!-- Progress bar -->
    <div v-if="provider.status === 'syncing'" class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${provider.syncProgress}%` }"></div>
      </div>
      <span class="progress-percent">{{ provider.syncProgress }}%</span>
    </div>

    <!-- Error display -->
    <div v-if="provider.error" class="error-section">
      <span class="error-icon">⚠</span>
      <p class="error-text">{{ provider.error }}</p>
    </div>

    <!-- Action buttons -->
    <div class="card-actions">
      <button
        v-if="isConnected"
        @click="emitSync"
        :disabled="provider.status === 'syncing'"
        class="btn btn-sync"
        :aria-label="`Sync ${provider.provider}`"
      >
        <span v-if="provider.status === 'syncing'">Syncing...</span>
        <span v-else>Sync</span>
      </button>
      <button
        v-if="isConnected"
        @click="emitDisconnect"
        class="btn btn-secondary"
        :aria-label="`Disconnect ${provider.provider}`"
      >
        Disconnect
      </button>
      <button
        v-else
        @click="emitConnect"
        class="btn btn-primary"
        :aria-label="`Connect ${provider.provider}`"
      >
        Connect
      </button>
      <button
        @click="emitSettings"
        class="btn btn-icon"
        :aria-label="`Settings for ${provider.provider}`"
      >
        ⚙
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProviderIntegration } from '@/stores/integrationStore'

/**
 * Props for ProviderCard
 */
interface Props {
  provider: ProviderIntegration
}

defineProps<Props>()

/**
 * Events emitted by component
 */
defineEmits<{
  connect: []
  disconnect: []
  sync: []
  settings: []
}>()

/**
 * Map provider types to icon classes
 */
const iconMap: Record<string, string> = {
  teams: 'mdi mdi-microsoft-teams',
  outlook: 'mdi mdi-microsoft-outlook',
  calendar: 'mdi mdi-calendar',
  github: 'mdi mdi-github',
  slack: 'mdi mdi-slack',
  discord: 'mdi mdi-discord',
}

const emit = defineEmits<{
  connect: []
  disconnect: []
  sync: []
  settings: []
}>()

/**
 * Get icon class for provider
 */
const iconClass = computed(() => iconMap[props.provider.provider] || 'mdi mdi-cloud')

/**
 * Check if provider is connected
 */
const isConnected = computed(() => props.provider.status === 'connected')

/**
 * Get status label
 */
const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    syncing: 'Syncing',
    pending: 'Pending',
  }
  return labels[props.provider.status] || 'Unknown'
})

/**
 * Format last sync time
 */
const lastSyncDisplay = computed(() => {
  if (!props.provider.lastSyncAt) return 'Never'
  const date = new Date(props.provider.lastSyncAt)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  return date.toLocaleDateString()
})

/**
 * Format next sync time
 */
const nextSyncDisplay = computed(() => {
  if (!props.provider.nextSyncAt) return '-'
  const date = new Date(props.provider.nextSyncAt)
  const now = new Date()
  const diffMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60))

  if (diffMinutes < 0) return 'overdue'
  if (diffMinutes < 1) return 'in seconds'
  if (diffMinutes < 60) return `in ${diffMinutes}m`
  if (diffMinutes < 1440) return `in ${Math.floor(diffMinutes / 60)}h`
  return date.toLocaleDateString()
})

/**
 * Emit connect event
 */
const emitConnect = () => {
  emit('connect')
}

/**
 * Emit disconnect event
 */
const emitDisconnect = () => {
  emit('disconnect')
}

/**
 * Emit sync event
 */
const emitSync = () => {
  emit('sync')
}

/**
 * Emit settings event
 */
const emitSettings = () => {
  emit('settings')
}
</script>

<style scoped>
.provider-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--surface-color);
  transition: all 0.3s ease;
}

.provider-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.provider-card.connected {
  background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-alt) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.provider-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--icon-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--primary-color);
}

.provider-details {
  min-width: 0;
}

.provider-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: capitalize;
}

.provider-account {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-indicator.status-connected {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.status-indicator.status-disconnected {
  background: rgba(158, 158, 158, 0.1);
  color: #9e9e9e;
}

.status-indicator.status-error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.status-indicator.status-syncing {
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-indicator.status-syncing .status-dot {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sync-info {
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 0;
  margin-bottom: 12px;
}

.sync-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.sync-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
}

.value {
  color: var(--text-primary);
}

.progress-section {
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #1976d2);
  transition: width 0.3s ease;
}

.progress-percent {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: right;
}

.error-section {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  color: #f44336;
}

.error-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.error-text {
  margin: 0;
  font-size: 0.875rem;
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  min-width: 80px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-sync {
  background: #4caf50;
  color: white;
  flex: 1;
}

.btn-sync:hover:not(:disabled) {
  background: #388e3c;
}

.btn-secondary {
  background: var(--border-color);
  color: var(--text-primary);
  flex: 1;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-color-hover);
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 36px;
  min-width: 36px;
  padding: 8px;
  flex-shrink: 0;
}

.btn-icon:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* CSS Variables */
:root {
  --primary-color: #2196f3;
  --border-color: #e0e0e0;
  --border-color-hover: #bbb;
  --surface-color: #fafafa;
  --surface-alt: #f5f5f5;
  --icon-bg: rgba(33, 150, 243, 0.1);
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #90caf9;
    --border-color: #424242;
    --border-color-hover: #555;
    --surface-color: #303030;
    --surface-alt: #424242;
    --icon-bg: rgba(144, 202, 249, 0.1);
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}
</style>
