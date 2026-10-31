<template>
  <div class="outlook-email-card" :class="{ unread: email.unread }">
    <!-- Header with sender and actions -->
    <div class="card-header">
      <div class="sender-info">
        <img
          v-if="email.avatar"
          :src="email.avatar"
          :alt="email.from"
          class="avatar"
        />
        <div v-else class="avatar-fallback">{{ getInitials(email.from) }}</div>
        <div class="sender-details">
          <h4 class="sender-name">{{ email.from }}</h4>
          <p class="sender-email">{{ email.fromEmail }}</p>
        </div>
      </div>
      <div class="header-actions">
        <button
          @click="emitToggleStar"
          class="btn-icon"
          :class="{ starred: email.starred }"
          :aria-label="email.starred ? 'Unstar email' : 'Star email'"
        >
          ⭐
        </button>
      </div>
    </div>

    <!-- Subject -->
    <div class="email-subject">
      <h3>{{ email.subject }}</h3>
      <span class="timestamp">{{ formatTime(email.timestamp) }}</span>
    </div>

    <!-- Unread badge -->
    <div v-if="email.unread" class="unread-badge">Unread</div>

    <!-- Preview -->
    <div class="email-preview">
      <p>{{ email.preview }}</p>
    </div>

    <!-- Attachments indicator -->
    <div v-if="email.hasAttachments" class="attachments-indicator">
      <span class="attachment-icon">📎</span>
      <span>{{ email.attachmentCount }} attachment{{ email.attachmentCount !== 1 ? 's' : '' }}</span>
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
        aria-label="Reply to email"
      >
        Reply
      </button>
      <button
        @click="emitMarkRead"
        v-if="email.unread"
        class="btn btn-secondary"
        aria-label="Mark as read"
      >
        Mark Read
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EmailMessage } from '@/stores/integrationStore'

/**
 * Props for OutlookEmailCard
 */
interface Props {
  email: EmailMessage
}

defineProps<Props>()

/**
 * Events emitted by component
 */
defineEmits<{
  toggleStar: []
  convertTask: []
  reply: []
  markRead: []
}>()

const emit = defineEmits<{
  toggleStar: []
  convertTask: []
  reply: []
  markRead: []
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
 * Emit toggle star event
 */
const emitToggleStar = () => {
  emit('toggleStar')
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

/**
 * Emit mark as read event
 */
const emitMarkRead = () => {
  emit('markRead')
}
</script>

<style scoped>
.outlook-email-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-color);
  transition: all 0.2s ease;
  position: relative;
}

.outlook-email-card.unread {
  background: var(--unread-bg);
  border-color: var(--primary-color);
}

.outlook-email-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.sender-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--avatar-bg);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
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

.sender-email {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.btn-icon:hover {
  opacity: 1;
}

.btn-icon.starred {
  opacity: 1;
}

.email-subject {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.email-subject h3 {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
}

.timestamp {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.unread-badge {
  display: inline-block;
  padding: 2px 6px;
  background: var(--primary-color);
  color: white;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.email-preview {
  margin-bottom: 12px;
  padding: 8px;
  background: var(--preview-bg);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
}

.email-preview p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.attachments-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding: 6px 8px;
  background: var(--attachment-bg);
  border-radius: 4px;
}

.attachment-icon {
  font-size: 1rem;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  min-width: 80px;
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
  --unread-bg: #f5f5f5;
  --preview-bg: #f0f0f0;
  --attachment-bg: #eeeeee;
  --avatar-bg: #0078d4;
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
    --unread-bg: #3a3a3a;
    --preview-bg: #424242;
    --attachment-bg: #505050;
    --avatar-bg: #0099ff;
    --secondary-bg: #424242;
    --secondary-hover: #505050;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}
</style>
