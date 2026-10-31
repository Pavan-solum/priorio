<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Reminders</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="openCreateModal">
            <IonIcon slot="icon-only" :icon="addCircleOutline"></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent></IonRefresherContent>
      </IonRefresher>

      <!-- Empty State -->
      <div v-if="reminders.length === 0" class="empty-state">
        <IonIcon :icon="notificationsOutline" size="large"></IonIcon>
        <h2>No Reminders</h2>
        <p>Create one to stay on track</p>
        <IonButton @click="openCreateModal">Create Reminder</IonButton>
      </div>

      <!-- Reminders List -->
      <IonList v-else>
        <!-- Upcoming Reminders -->
        <div v-if="upcomingReminders.length > 0">
          <IonListHeader>
            <IonLabel>Upcoming</IonLabel>
          </IonListHeader>

          <IonItemSliding v-for="reminder in upcomingReminders" :key="reminder.id">
            <IonItem :class="{ unread: !reminder.sent }" button @click="openReminder(reminder)">
              <div class="reminder-content">
                <div class="reminder-header">
                  <h3>{{ reminder.title }}</h3>
                  <span v-if="reminder.recurring" class="badge">{{ reminder.recurring }}</span>
                </div>
                <p class="reminder-description">{{ reminder.description }}</p>
                <div class="reminder-meta">
                  <span class="due-time">
                    <IonIcon :icon="timeOutline"></IonIcon>
                    {{ formatReminderTime(reminder.scheduledTime) }}
                  </span>
                  <span class="task-name" v-if="reminder.taskId">
                    Task: {{ getTaskName(reminder.taskId) }}
                  </span>
                </div>
              </div>
            </IonItem>

            <IonItemOptions side="start">
              <IonItemOption color="success" @click="snoozeReminder(reminder)">
                <IonIcon slot="icon-only" :icon="pauseOutline"></IonIcon>
              </IonItemOption>
            </IonItemOptions>

            <IonItemOptions side="end">
              <IonItemOption color="danger" @click="deleteReminder(reminder.id)">
                <IonIcon slot="icon-only" :icon="trash"></IonIcon>
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        </div>

        <!-- Snoozed Reminders -->
        <div v-if="snoozedReminders.length > 0">
          <IonListHeader>
            <IonLabel>Snoozed</IonLabel>
          </IonListHeader>

          <IonItemSliding v-for="reminder in snoozedReminders" :key="reminder.id">
            <IonItem button @click="openReminder(reminder)">
              <div class="reminder-content">
                <h3>{{ reminder.title }} (Snoozed)</h3>
                <p>Resumes: {{ formatReminderTime(reminder.resumeTime) }}</p>
              </div>
            </IonItem>

            <IonItemOptions>
              <IonItemOption color="success" @click="resumeReminder(reminder)">
                <IonIcon slot="icon-only" :icon="playOutline"></IonIcon>
              </IonItemOption>
              <IonItemOption color="danger" @click="deleteReminder(reminder.id)">
                <IonIcon slot="icon-only" :icon="trash"></IonIcon>
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        </div>

        <!-- Completed Reminders -->
        <div v-if="completedReminders.length > 0">
          <IonListHeader>
            <IonLabel>Completed</IonLabel>
          </IonListHeader>

          <IonItemSliding v-for="reminder in completedReminders" :key="reminder.id">
            <IonItem button @click="openReminder(reminder)">
              <div class="reminder-content">
                <h3 class="completed">{{ reminder.title }}</h3>
                <p>Completed: {{ formatDate(reminder.completedAt) }}</p>
              </div>
            </IonItem>

            <IonItemOptions>
              <IonItemOption color="danger" @click="deleteReminder(reminder.id)">
                <IonIcon slot="icon-only" :icon="trash"></IonIcon>
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        </div>
      </IonList>
    </IonContent>

    <!-- Create/Edit Reminder Modal -->
    <IonModal :is-open="modalOpen" @didDismiss="closeModal" css-class="reminder-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{{ editingReminder ? 'Edit Reminder' : 'New Reminder' }}</IonTitle>
          <IonButtons slot="end">
            <IonButton @click="closeModal">
              <IonIcon slot="icon-only" :icon="closeOutline"></IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div class="reminder-form">
          <!-- Title -->
          <IonItem>
            <IonLabel position="floating">Title</IonLabel>
            <IonInput v-model="formData.title" placeholder="Reminder title"></IonInput>
          </IonItem>

          <!-- Description -->
          <IonItem>
            <IonLabel position="floating">Description</IonLabel>
            <IonTextarea
              v-model="formData.description"
              placeholder="Add details..."
              rows="3"
            ></IonTextarea>
          </IonItem>

          <!-- Scheduled Time -->
          <IonItem>
            <IonLabel position="floating">Scheduled Time</IonLabel>
            <IonDatetime
              v-model="formData.scheduledTime"
              presentation="date-time"
            ></IonDatetime>
          </IonItem>

          <!-- Notification Type -->
          <IonItem>
            <IonLabel position="floating">Notification Type</IonLabel>
            <IonSelect v-model="formData.notificationType">
              <IonSelectOption value="NOTIFICATION">Push Notification</IonSelectOption>
              <IonSelectOption value="EMAIL">Email</IonSelectOption>
              <IonSelectOption value="SMS">SMS</IonSelectOption>
              <IonSelectOption value="BOTH">Push + Email</IonSelectOption>
            </IonSelect>
          </IonItem>

          <!-- Associated Task -->
          <IonItem>
            <IonLabel position="floating">Associated Task (optional)</IonLabel>
            <IonSelect v-model="formData.taskId">
              <IonSelectOption value="">None</IonSelectOption>
              <IonSelectOption v-for="task in availableTasks" :key="task.id" :value="task.id">
                {{ task.title }}
              </IonSelectOption>
            </IonSelect>
          </IonItem>

          <!-- Recurring -->
          <IonItem>
            <IonLabel>Recurring</IonLabel>
            <IonSelect v-model="formData.recurring" slot="end">
              <IonSelectOption value="">None</IonSelectOption>
              <IonSelectOption value="DAILY">Daily</IonSelectOption>
              <IonSelectOption value="WEEKLY">Weekly</IonSelectOption>
              <IonSelectOption value="MONTHLY">Monthly</IonSelectOption>
              <IonSelectOption value="YEARLY">Yearly</IonSelectOption>
            </IonSelect>
          </IonItem>

          <!-- Active Toggle -->
          <IonItem>
            <IonLabel>Active</IonLabel>
            <IonToggle v-model="formData.active" slot="end"></IonToggle>
          </IonItem>

          <!-- Snooze Presets -->
          <div class="section">
            <h3>Snooze Presets</h3>
            <div class="snooze-presets">
              <IonButton
                v-for="preset in snoozePresets"
                :key="preset.minutes"
                fill="outline"
                size="small"
                @click="setSnoozePreset(preset.minutes)"
              >
                {{ preset.label }}
              </IonButton>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <IonButton expand="block" fill="clear" @click="closeModal">
              Cancel
            </IonButton>
            <IonButton expand="block" @click="saveReminder" :disabled="isSaving">
              <IonSpinner v-if="isSaving" name="crescent"></IonSpinner>
              {{ isSaving ? 'Saving...' : 'Save Reminder' }}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>

    <!-- Reminder Detail Modal -->
    <IonModal :is-open="detailOpen" @didDismiss="closeDetail" css-class="reminder-detail-modal">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton @click="closeDetail">
              <IonIcon slot="icon-only" :icon="chevronBackOutline"></IonIcon>
            </IonButton>
          </IonButtons>
          <IonTitle>{{ selectedReminder?.title }}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div v-if="selectedReminder" class="detail-content">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{{ selectedReminder.title }}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div class="detail-fields">
                <p v-if="selectedReminder.description">
                  <strong>Description:</strong><br />
                  {{ selectedReminder.description }}
                </p>
                <p>
                  <strong>Scheduled:</strong><br />
                  {{ formatDate(selectedReminder.scheduledTime) }}
                </p>
                <p>
                  <strong>Type:</strong><br />
                  {{ selectedReminder.notificationType }}
                </p>
                <p v-if="selectedReminder.recurring">
                  <strong>Recurring:</strong><br />
                  {{ selectedReminder.recurring }}
                </p>
              </div>

              <div class="action-buttons">
                <IonButton expand="block" fill="outline" @click="snoozeReminder(selectedReminder)">
                  <IonIcon slot="start" :icon="pauseOutline"></IonIcon>
                  Snooze
                </IonButton>
                <IonButton expand="block" @click="editReminder(selectedReminder)">
                  <IonIcon slot="start" :icon="pencilOutline"></IonIcon>
                  Edit
                </IonButton>
                <IonButton expand="block" color="danger" @click="deleteAndCloseDetail">
                  <IonIcon slot="start" :icon="trash"></IonIcon>
                  Delete
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonModal>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonListHeader,
  IonLabel,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonModal,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonToggle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  RefresherEventDetail,
} from '@ionic/vue';
import {
  addCircleOutline,
  notificationsOutline,
  timeOutline,
  pauseOutline,
  playOutline,
  trash,
  closeOutline,
  chevronBackOutline,
  pencilOutline,
} from 'ionicons/icons';
import { ref, computed } from 'vue';
import axios from 'axios';
import { useTaskStore } from '../stores/task';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  scheduledTime: Date;
  notificationType: 'NOTIFICATION' | 'EMAIL' | 'SMS' | 'BOTH';
  taskId?: string;
  recurring?: string;
  active: boolean;
  sent: boolean;
  completedAt?: Date;
  resumeTime?: Date;
}

interface SnoozePreset {
  label: string;
  minutes: number;
}

const taskStore = useTaskStore();
const reminders = ref<Reminder[]>([]);
const modalOpen = ref(false);
const detailOpen = ref(false);
const editingReminder = ref<Reminder | null>(null);
const selectedReminder = ref<Reminder | null>(null);
const isSaving = ref(false);

const formData = ref({
  title: '',
  description: '',
  scheduledTime: '',
  notificationType: 'NOTIFICATION',
  taskId: '',
  recurring: '',
  active: true,
});

const snoozePresets: SnoozePreset[] = [
  { label: '5 mins', minutes: 5 },
  { label: '15 mins', minutes: 15 },
  { label: '30 mins', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: 'Tomorrow', minutes: 1440 },
];

/**
 * Available tasks for association
 */
const availableTasks = computed(() => taskStore.tasks.filter(t => t.status !== 'COMPLETED'));

/**
 * Categorize reminders
 */
const upcomingReminders = computed(() =>
  reminders.value.filter(r => r.active && !r.sent && !r.resumeTime)
);

const snoozedReminders = computed(() => reminders.value.filter(r => r.resumeTime));

const completedReminders = computed(() => reminders.value.filter(r => !r.active || r.sent));

/**
 * Load reminders
 */
const loadReminders = async () => {
  try {
    const response = await axios.get('/api/reminders');
    reminders.value = response.data.map((r: any) => ({
      ...r,
      scheduledTime: new Date(r.scheduledTime),
      completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
      resumeTime: r.resumeTime ? new Date(r.resumeTime) : undefined,
    }));
  } catch (error) {
    console.error('Error loading reminders:', error);
  }
};

/**
 * Open create modal
 */
const openCreateModal = () => {
  editingReminder.value = null;
  formData.value = {
    title: '',
    description: '',
    scheduledTime: new Date().toISOString(),
    notificationType: 'NOTIFICATION',
    taskId: '',
    recurring: '',
    active: true,
  };
  modalOpen.value = true;
};

/**
 * Edit reminder
 */
const editReminder = (reminder: Reminder) => {
  editingReminder.value = reminder;
  formData.value = {
    title: reminder.title,
    description: reminder.description || '',
    scheduledTime: reminder.scheduledTime.toISOString(),
    notificationType: reminder.notificationType,
    taskId: reminder.taskId || '',
    recurring: reminder.recurring || '',
    active: reminder.active,
  };
  detailOpen.value = false;
  modalOpen.value = true;
};

/**
 * Save reminder
 */
const saveReminder = async () => {
  if (!formData.value.title) return;

  isSaving.value = true;
  try {
    if (editingReminder.value) {
      await axios.put(`/api/reminders/${editingReminder.value.id}`, formData.value);
    } else {
      await axios.post('/api/reminders', formData.value);
    }
    await loadReminders();
    closeModal();
  } catch (error) {
    console.error('Error saving reminder:', error);
  } finally {
    isSaving.value = false;
  }
};

/**
 * Close modal
 */
const closeModal = () => {
  modalOpen.value = false;
  editingReminder.value = null;
};

/**
 * Open reminder detail
 */
const openReminder = (reminder: Reminder) => {
  selectedReminder.value = reminder;
  detailOpen.value = true;
};

/**
 * Close detail modal
 */
const closeDetail = () => {
  detailOpen.value = false;
  selectedReminder.value = null;
};

/**
 * Snooze reminder
 */
const snoozeReminder = async (reminder: Reminder) => {
  try {
    const snoozeUntil = new Date(Date.now() + 15 * 60000); // 15 minutes
    await axios.post(`/api/reminders/${reminder.id}/snooze`, {
      until: snoozeUntil,
    });
    await loadReminders();
  } catch (error) {
    console.error('Error snoozing reminder:', error);
  }
};

/**
 * Resume snoozed reminder
 */
const resumeReminder = async (reminder: Reminder) => {
  try {
    await axios.post(`/api/reminders/${reminder.id}/resume`);
    await loadReminders();
  } catch (error) {
    console.error('Error resuming reminder:', error);
  }
};

/**
 * Delete reminder
 */
const deleteReminder = async (id: string) => {
  try {
    await axios.delete(`/api/reminders/${id}`);
    reminders.value = reminders.value.filter(r => r.id !== id);
  } catch (error) {
    console.error('Error deleting reminder:', error);
  }
};

/**
 * Delete and close detail
 */
const deleteAndCloseDetail = async () => {
  if (selectedReminder.value) {
    await deleteReminder(selectedReminder.value.id);
    closeDetail();
  }
};

/**
 * Set snooze preset
 */
const setSnoozePreset = (minutes: number) => {
  const date = new Date(Date.now() + minutes * 60000);
  formData.value.scheduledTime = date.toISOString();
};

/**
 * Get task name
 */
const getTaskName = (taskId: string): string => {
  const task = taskStore.tasks.find(t => t.id === taskId);
  return task?.title || 'Unknown task';
};

/**
 * Format reminder time
 */
const formatReminderTime = (date: Date): string => {
  return new Date(date).toLocaleString();
};

/**
 * Format date
 */
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString();
};

/**
 * Handle refresh
 */
const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
  try {
    await loadReminders();
  } finally {
    event.detail.complete();
  }
};

// Load reminders on mount
loadReminders();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 150px);
  color: var(--ion-color-medium);
  text-align: center;
}

.reminder-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
  width: 100%;
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reminder-header h3 {
  margin: 0;
  font-weight: 600;
}

.badge {
  display: inline-block;
  background: var(--ion-color-secondary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
}

.reminder-description {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 13px;
}

.reminder-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.due-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-name {
  font-weight: 500;
}

.unread {
  background-color: rgba(var(--ion-color-primary-rgb), 0.05);
  border-left: 3px solid var(--ion-color-primary);
}

.completed {
  text-decoration: line-through;
  color: var(--ion-color-medium);
}

.reminder-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.section {
  margin: 16px 0;
}

.section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.snooze-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.detail-content {
  padding: 16px 0;
}

.detail-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-fields p {
  margin: 0;
  font-size: 13px;
}

.detail-fields strong {
  color: var(--ion-color-dark);
}

::v-deep(.reminder-modal) {
  --width: 100%;
  --height: 90%;
  --border-radius: 16px 16px 0 0;
}

::v-deep(.reminder-detail-modal) {
  --width: 100%;
  --height: 70%;
  --border-radius: 16px 16px 0 0;
}

@media (min-width: 768px) {
  ::v-deep(.reminder-modal),
  ::v-deep(.reminder-detail-modal) {
    --width: 500px;
    --height: 90%;
    --border-radius: 12px;
  }
}
</style>
