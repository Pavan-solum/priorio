<template>
  <div class="calendar-integration-view">
    <div class="view-header">
      <h1>Calendar Integration</h1>
      <div class="header-controls">
        <input v-model="selectedDate" type="date" class="date-input" />
        <button @click="loadEvents" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      <span>⚠ {{ error }}</span>
      <button @click="error = null" class="close-btn">✕</button>
    </div>

    <div class="content-grid">
      <!-- Calendar view -->
      <div class="calendar-section">
        <div class="section-header">
          <h3>Upcoming Events</h3>
          <span class="event-count">{{ upcomingEvents.length }} events</span>
        </div>
        <div class="events-list">
          <div v-if="loading" class="loading-state">Loading events...</div>
          <div v-else-if="upcomingEvents.length > 0">
            <CalendarEventCard
              v-for="event in upcomingEvents"
              :key="event.id"
              :event="event"
              @createTask="handleCreateTask(event)"
              @edit="handleEdit(event)"
            />
          </div>
          <div v-else class="empty-state">No events for this period</div>
        </div>
      </div>

      <!-- Free slots view -->
      <div class="slots-section">
        <div class="section-header">
          <h3>Available Time Slots</h3>
          <span class="slot-count">{{ freeSlots.length }} slots</span>
        </div>
        <div class="slots-list">
          <div
            v-for="slot in freeSlots"
            :key="`${slot.start.getTime()}`"
            class="time-slot"
          >
            <span class="slot-time">
              {{ formatTime(slot.start) }} - {{ formatTime(slot.end) }}
            </span>
            <button class="btn-small">Use</button>
          </div>
        </div>
      </div>

      <!-- Calendars sidebar -->
      <div class="calendars-panel">
        <div class="section-header">
          <h3>Calendars</h3>
        </div>
        <div class="calendars-list">
          <label
            v-for="cal in availableCalendars"
            :key="cal"
            class="calendar-checkbox"
          >
            <input type="checkbox" :value="cal" v-model="selectedCalendars" />
            <span>{{ cal }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Task modal -->
    <div v-if="showTaskModal" class="modal-overlay" @click="showTaskModal = false">
      <div class="modal" @click.stop>
        <h3>Create Task from Event</h3>
        <div class="form-group">
          <label>Title</label>
          <input v-model="taskForm.title" type="text" />
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input v-model="taskForm.dueDate" type="date" />
        </div>
        <div class="form-actions">
          <button @click="showTaskModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="saveTask" class="btn btn-primary">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CalendarEventCard from '@/components/integrations/CalendarEventCard.vue'
import { useCalendarEvents } from '@/composables/useCalendarEvents'
import type { CalendarEvent } from '@/stores/integrationStore'

const {
  loadingEvents: loading,
  loadEvents,
  getUpcoming,
  getFreeSlots,
  getCalendars,
} = useCalendarEvents()

const error = ref<string | null>(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const showTaskModal = ref(false)
const selectedCalendars = ref<string[]>([])

const taskForm = ref({
  title: '',
  dueDate: '',
})

const upcomingEvents = computed(() => getUpcoming(10))
const availableCalendars = computed(() => getCalendars())

const freeSlots = computed(() => {
  const date = new Date(selectedDate.value)
  return getFreeSlots(date, 30)
})

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const handleCreateTask = (event: CalendarEvent): void => {
  taskForm.value.title = event.title
  taskForm.value.dueDate = event.startTime.split('T')[0]
  showTaskModal.value = true
}

const handleEdit = (event: CalendarEvent): void => {
  // TODO: Open edit modal
}

const saveTask = async (): Promise<void> => {
  // TODO: Create task via API
  showTaskModal.value = false
  taskForm.value = { title: '', dueDate: '' }
}

onMounted(async () => {
  await loadEvents()
})
</script>

<style scoped>
.calendar-integration-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.view-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header-controls {
  display: flex;
  gap: 12px;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--surface-color);
  color: var(--text-primary);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  margin-bottom: 16px;
  color: #f44336;
}

.close-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 16px;
}

.calendar-section,
.slots-section,
.calendars-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.event-count,
.slot-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: var(--badge-bg);
  padding: 2px 8px;
  border-radius: 12px;
}

.events-list,
.slots-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.time-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--item-bg);
  border-radius: 4px;
  font-size: 0.9rem;
}

.slot-time {
  font-weight: 500;
  color: var(--text-primary);
}

.btn-small {
  padding: 4px 8px;
  font-size: 0.75rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.calendars-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.calendar-checkbox input {
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface-color);
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin: 0 0 16px;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-secondary {
  background: var(--border-color);
  color: var(--text-primary);
}

/* CSS Variables */
:root {
  --primary-color: #1976d2;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --item-bg: #f5f5f5;
  --badge-bg: rgba(25, 118, 210, 0.1);
  --input-bg: #ffffff;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #64b5f6;
    --border-color: #424242;
    --surface-color: #303030;
    --item-bg: #424242;
    --badge-bg: rgba(100, 181, 246, 0.1);
    --input-bg: #424242;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
