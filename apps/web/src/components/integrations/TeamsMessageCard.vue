<template>
  <div class="teams-message-card">
    <!-- Header with sender info -->
    <div class="card-header">
      <div class="sender-info">
        <img
          v-if="message.avatar"
          :src="message.avatar"
          :alt="message.sender"
          class="avatar"
        />
        <div v-else class="avatar-fallback">{{ getInitials(message.sender) }}</div>
        <div class="sender-details">
          <h4 class="sender-name">{{ message.sender }}</h4>
          <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
        </div>
      </div>
      <span class="channel-badge">{{ message.channel }}</span>
    </div>

    <!-- Message content -->
    <div class="message-content">
      <p>{{ message.content }}</p>
    </div>

    <!-- Attachments -->
    <div v-if="message.attachments.length > 0" class="attachments">
      <div v-for="attachment in message.attachments" :key="attachment.id" class="attachment-item">
        <span class="attachment-icon">📎</span>
        <a :href="attachment.url" class="attachment-name">{{ attachment.name }}</a>
        <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
      </div>
    </div>

    <!-- Engagement metrics -->
    <div class="engagement">
      <div class="metric">
        <span class="metric-icon">👍</span>
        <span class="metric-value">{{ message.likes }}</span>
      </div>
      <div class="metric">
        <span class="metric-icon">💬</span>
        <span class="metric-value">{{ message.replies }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="card-actions">
      <button
        @click="emitConvertTask"
        class="btn btn-primary"
        aria-label="Convert to task"
      >
        Convert to Task
      </button>
      <button
        @click="emitReply"
        class="btn btn-secondary"
        aria-label="Reply to message"
      >
        Reply
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TeamsMessage } from '@/stores/integrationStore'

/**
 * Props for TeamsMessageCard
 */
interface Props {
  message: TeamsMessage
}

defineProps<Props>()

/**
 * Events emitted by component
 */
defineEmits<{
  convertTask: []
  reply: []
}>()

const emit = defineEmits<{
  convertTask: []
  reply: []
}>()

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format timestamp
 */
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  return date.toLocaleDateString()
}

/**
 * Format file size
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Emit convert to task event
 */
const emitConvertTask = () => {
  emit('convertTask')
}

/**
 * Emit reply event
 */
const emitReply = () => {
  emit('reply')
}
</script>

<style scoped>
.teams-message-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-color);
  transition: all 0.2s ease;
}

.teams-message-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.sender-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-fallback {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--avatar-bg);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.sender-details {
  flex: 1;
  min-width: 0;
}

.sender-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.timestamp {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.channel-badge {
  display: inline-block;
  padding: 4px 8px;
  background: var(--badge-bg);
  color: var(--badge-color);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.message-content {
  margin-bottom: 12px;
  padding: 8px;
  background: var(--content-bg);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
}

.message-content p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.attachments {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--attachment-bg);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.attachment-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.attachment-name {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.attachment-name:hover {
  text-decoration: underline;
}

.attachment-size {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.engagement {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.metric {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.metric-icon {
  font-size: 1rem;
}

.metric-value {
  color: var(--text-primary);
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--secondary-hover);
}

/* CSS Variables */
:root {
  --primary-color: #0078d4;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --content-bg: #f5f5f5;
  --attachment-bg: #eeeeee;
  --badge-bg: rgba(0, 120, 212, 0.1);
  --badge-color: #0078d4;
  --avatar-bg: #2196f3;
  --secondary-bg: #f5f5f5;
  --secondary-hover: #eeeeee;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #0099ff;
    --border-color: #424242;
    --surface-color: #303030;
    --content-bg: #424242;
    --attachment-bg: #505050;
    --badge-bg: rgba(0, 153, 255, 0.1);
    --badge-color: #0099ff;
    --avatar-bg: #0099ff;
    --secondary-bg: #424242;
    --secondary-hover: #505050;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}
</style>
