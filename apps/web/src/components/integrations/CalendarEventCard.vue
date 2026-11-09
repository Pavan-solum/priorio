<template>
  <div class="calendar-event-card">
    <!-- Header -->
    <div class="card-header">
      <h4 class="event-title">{{ event.title }}</h4>
      <span class="calendar-badge">{{ event.calendar }}</span>
    </div>

    <!-- Time and location -->
    <div class="event-details">
      <div class="detail-item">
        <span class="detail-icon">🕒</span>
        <div>
          <p class="detail-label">Time</p>
          <p class="detail-value">{{ formatDateTime(event.startTime) }}</p>
          <p v-if="duration" class="detail-duration">Duration: {{ duration }} min</p>
        </div>
      </div>

      <div v-if="event.location" class="detail-item">
        <span class="detail-icon">📍</span>
        <div>
          <p class="detail-label">Location</p>
          <p class="detail-value">{{ event.location }}</p>
        </div>
      </div>

      <div class="detail-item">
        <span class="detail-icon">👤</span>
        <div>
          <p class="detail-label">Organizer</p>
          <p class="detail-value">{{ event.organizer }}</p>
        </div>
      </div>
    </div>

    <!-- Attendees -->
    <div v-if="event.attendees.length > 0" class="attendees-section">
      <p class="attendees-label">Attendees ({{ event.attendees.length }})</p>
      <div class="attendees-list">
        <div v-for="attendee in event.attendees" :key="attendee.email" class="attendee">
          <img
            v-if="attendee.avatar"
            :src="attendee.avatar"
            :alt="attendee.name"
            class="attendee-avatar"
          />
          <div v-else class="attendee-avatar-fallback">{{ getInitials(attendee.name) }}</div>
          <div class="attendee-info">
            <p class="attendee-name">{{ attendee.name }}</p>
            <p class="attendee-status">{{ formatStatus(attendee.status) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Description -->
    <div v-if="event.description" class="description-section">
      <p class="description-text">{{ event.description }}</p>
    </div>

    <!-- Actions -->
    <div class="card-actions">
      <button
        @click="emitCreateTask"
        class="btn btn-primary"
        aria-label="Create task from event"
      >
        Create Task
      </button>
      <button
        @click="emitEdit"
        class="btn btn-secondary"
        aria-label="Edit event"
      >
        Edit
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent } from '@/stores/integrationStore'

/**
 * Props for CalendarEventCard
 */
interface Props {
  event: CalendarEvent
}

const props = defineProps<Props>()

/**
 * Events emitted by component
 */
const emit = defineEmits<{
  createTask: []
  edit: []
}>()

/**
 * Calculate event duration in minutes
 */
const duration = computed(() => {
  const start = new Date(props.event.startTime).getTime()
  const end = new Date(props.event.endTime).getTime()
  return Math.round((end - start) / (1000 * 60))
})

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
 * Format date and time
 */
const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const dateString = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString()
  const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return `${dateString} at ${timeString}`
}

/**
 * Format attendee status
 */
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    accepted: '✓ Accepted',
    declined: '✕ Declined',
    tentative: '? Tentative',
    needs_action: 'Awaiting response',
  }
  return statusMap[status] || status
}

/**
 * Emit create task event
 */
const emitCreateTask = () => {
  emit('createTask')
}

/**
 * Emit edit event
 */
const emitEdit = () => {
  emit('edit')
}
</script>

<style scoped>
.calendar-event-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-color);
  transition: all 0.2s ease;
}

.calendar-event-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.event-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  word-break: break-word;
}

.calendar-badge {
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

.event-details {
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  background: var(--detail-bg);
  border-radius: 4px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.detail-item div {
  flex: 1;
  min-width: 0;
}

.detail-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  margin: 4px 0 0;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.detail-duration {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.attendees-section {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.attendees-label {
  margin: 0 0 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.attendees-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attendee {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: var(--attendee-bg);
  border-radius: 4px;
}

.attendee-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.attendee-avatar-fallback {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--avatar-bg);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.attendee-info {
  flex: 1;
  min-width: 0;
}

.attendee-name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.attendee-status {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.description-section {
  margin-bottom: 12px;
  padding: 8px;
  background: var(--description-bg);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
}

.description-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
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
  --primary-color: #1976d2;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --detail-bg: #f5f5f5;
  --attendee-bg: #eeeeee;
  --description-bg: #f5f5f5;
  --badge-bg: rgba(25, 118, 210, 0.1);
  --badge-color: #1976d2;
  --avatar-bg: #1976d2;
  --secondary-bg: #f5f5f5;
  --secondary-hover: #eeeeee;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #64b5f6;
    --border-color: #424242;
    --surface-color: #303030;
    --detail-bg: #424242;
    --attendee-bg: #505050;
    --description-bg: #424242;
    --badge-bg: rgba(100, 181, 246, 0.1);
    --badge-color: #64b5f6;
    --avatar-bg: #64b5f6;
    --secondary-bg: #424242;
    --secondary-hover: #505050;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}
</style>
