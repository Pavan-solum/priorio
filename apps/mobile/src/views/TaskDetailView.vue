<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton></IonBackButton>
        </IonButtons>
        <IonTitle>{{ task?.title || 'Task Details' }}</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="toggleMenu">
            <IonIcon slot="icon-only" :icon="ellipsisVertical"></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent></IonRefresherContent>
      </IonRefresher>

      <div v-if="task" class="task-detail">
        <!-- Main Task Info -->
        <IonCard>
          <IonCardContent>
            <!-- Status Toggle -->
            <div class="task-status-section">
              <IonCheckbox
                :checked="task.status === 'COMPLETED'"
                @ionChange="updateTaskStatus"
              ></IonCheckbox>
              <div class="status-info">
                <p>Status: <strong>{{ task.status }}</strong></p>
              </div>
            </div>

            <!-- Title (editable) -->
            <div class="editable-field">
              <label>Title</label>
              <IonInput
                v-model="editingTask.title"
                placeholder="Task title"
                @ionBlur="autoSaveField('title')"
              ></IonInput>
            </div>

            <!-- Description (editable) -->
            <div class="editable-field">
              <label>Description</label>
              <IonTextarea
                v-model="editingTask.description"
                placeholder="Add details..."
                rows="4"
                @ionBlur="autoSaveField('description')"
              ></IonTextarea>
            </div>

            <!-- Priority -->
            <div class="editable-field">
              <label>Priority</label>
              <IonSelect
                v-model="editingTask.priority"
                interface="popover"
                @ionChange="autoSaveField('priority')"
              >
                <IonSelectOption value="HIGH">High</IonSelectOption>
                <IonSelectOption value="MEDIUM">Medium</IonSelectOption>
                <IonSelectOption value="LOW">Low</IonSelectOption>
              </IonSelect>
            </div>

            <!-- Due Date -->
            <div class="editable-field">
              <label>Due Date</label>
              <div class="due-date-input">
                <IonDatetime
                  v-model="editingTask.dueAt"
                  presentation="date"
                  @ionChange="autoSaveField('dueAt')"
                ></IonDatetime>
                <IonButton
                  fill="clear"
                  size="small"
                  @click="editingTask.dueAt = undefined"
                >
                  Clear
                </IonButton>
              </div>
            </div>

            <!-- Tags -->
            <div class="editable-field">
              <label>Tags</label>
              <div class="tags-input">
                <IonChip
                  v-for="tag in editingTask.tags"
                  :key="tag"
                  @click="removeTag(tag)"
                >
                  {{ tag }}
                  <IonIcon icon="close"></IonIcon>
                </IonChip>
                <input
                  v-model="newTag"
                  type="text"
                  placeholder="Add tag..."
                  @keydown.enter="addTag"
                  @keydown.comma="addTag"
                  class="tag-input"
                />
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <!-- Subtasks Section -->
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Subtasks</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItemSliding v-for="subtask in editingTask.subtasks" :key="subtask.id">
                <IonItem>
                  <IonCheckbox
                    :checked="subtask.completed"
                    @ionChange="toggleSubtask(subtask)"
                  ></IonCheckbox>
                  <IonLabel :class="{ completed: subtask.completed }">
                    {{ subtask.title }}
                  </IonLabel>
                </IonItem>
                <IonItemOptions>
                  <IonItemOption color="danger" @click="removeSubtask(subtask.id)">
                    <IonIcon slot="icon-only" :icon="trash"></IonIcon>
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            </IonList>

            <!-- Add Subtask -->
            <div class="add-subtask">
              <IonInput
                v-model="newSubtaskTitle"
                placeholder="Add subtask..."
                @keydown.enter="addSubtask"
              ></IonInput>
              <IonButton
                fill="clear"
                size="small"
                @click="addSubtask"
                :disabled="!newSubtaskTitle.trim()"
              >
                <IonIcon slot="icon-only" :icon="addCircleOutline"></IonIcon>
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        <!-- Reminders Section -->
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Reminders</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItemSliding v-for="reminder in editingTask.reminders" :key="reminder.id">
                <IonItem>
                  <div class="reminder-info">
                    <IonLabel>
                      <h3>{{ formatReminderTime(reminder.time) }}</h3>
                      <p>{{ reminder.type }}</p>
                    </IonLabel>
                  </div>
                </IonItem>
                <IonItemOptions>
                  <IonItemOption color="danger" @click="removeReminder(reminder.id)">
                    <IonIcon slot="icon-only" :icon="trash"></IonIcon>
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            </IonList>

            <!-- Add Reminder -->
            <div class="add-reminder">
              <IonSelect v-model="reminderType" interface="popover">
                <IonSelectOption value="NOTIFICATION">Notification</IonSelectOption>
                <IonSelectOption value="EMAIL">Email</IonSelectOption>
                <IonSelectOption value="SMS">SMS</IonSelectOption>
              </IonSelect>
              <IonDatetime
                v-model="reminderTime"
                presentation="time-date"
              ></IonDatetime>
              <IonButton fill="clear" size="small" @click="addReminder">
                <IonIcon slot="icon-only" :icon="addCircleOutline"></IonIcon>
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        <!-- Auto-save Status -->
        <div v-if="autoSaveStatus" :class="['auto-save-status', autoSaveStatus]">
          {{ autoSaveStatus === 'saved' ? '✓ Saved' : '⟳ Saving...' }}
        </div>
      </div>

      <div v-else class="loading">
        <IonSpinner></IonSpinner>
      </div>
    </IonContent>

    <!-- Action Menu -->
    <IonPopover :is-open="menuOpen" @didDismiss="menuOpen = false">
      <IonContent>
        <IonList>
          <IonItem button @click="duplicateTask">
            <IonIcon slot="start" :icon="copy"></IonIcon>
            <IonLabel>Duplicate</IonLabel>
          </IonItem>
          <IonItem button @click="shareTask">
            <IonIcon slot="start" :icon="share"></IonIcon>
            <IonLabel>Share</IonLabel>
          </IonItem>
          <IonItem button color="danger" @click="deleteTask">
            <IonIcon slot="start" :icon="trash"></IonIcon>
            <IonLabel>Delete</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPopover>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonChip,
  IonList,
  IonItemSliding,
  IonItem,
  IonLabel,
  IonItemOptions,
  IonItemOption,
  IonPopover,
  IonSpinner,
  RefresherEventDetail,
} from '@ionic/vue';
import {
  ellipsisVertical,
  trash,
  addCircleOutline,
  copy,
  share,
} from 'ionicons/icons';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTaskStore } from '../stores/task';

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();

const taskId = route.params.id as string;
const task = ref<any>(null);
const editingTask = reactive<any>({});
const menuOpen = ref(false);
const autoSaveStatus = ref<'saved' | 'saving' | null>(null);
const newSubtaskTitle = ref('');
const newTag = ref('');
const reminderType = ref('NOTIFICATION');
const reminderTime = ref('');

/**
 * Load task details
 */
const loadTask = async () => {
  try {
    const data = await taskStore.getTask(taskId);
    task.value = data;
    Object.assign(editingTask, { ...data });
  } catch (error) {
    console.error('Error loading task:', error);
  }
};

/**
 * Handle refresh
 */
const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
  try {
    await loadTask();
  } finally {
    event.detail.complete();
  }
};

/**
 * Toggle menu
 */
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

/**
 * Auto-save field
 */
const autoSaveField = async (field: string) => {
  autoSaveStatus.value = 'saving';
  try {
    await taskStore.updateTask(taskId, {
      [field]: editingTask[field],
    });
    autoSaveStatus.value = 'saved';
    setTimeout(() => {
      autoSaveStatus.value = null;
    }, 2000);
  } catch (error) {
    console.error('Auto-save error:', error);
    autoSaveStatus.value = null;
  }
};

/**
 * Update task status
 */
const updateTaskStatus = async () => {
  const newStatus = task.value.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
  editingTask.status = newStatus;
  await autoSaveField('status');
};

/**
 * Add subtask
 */
const addSubtask = async () => {
  if (!newSubtaskTitle.value.trim()) return;
  editingTask.subtasks.push({
    id: Math.random().toString(),
    title: newSubtaskTitle.value,
    completed: false,
  });
  newSubtaskTitle.value = '';
  await autoSaveField('subtasks');
};

/**
 * Toggle subtask
 */
const toggleSubtask = (subtask: any) => {
  subtask.completed = !subtask.completed;
  autoSaveField('subtasks');
};

/**
 * Remove subtask
 */
const removeSubtask = (id: string) => {
  editingTask.subtasks = editingTask.subtasks.filter((s: any) => s.id !== id);
  autoSaveField('subtasks');
};

/**
 * Add tag
 */
const addTag = () => {
  if (!newTag.value.trim()) return;
  if (!editingTask.tags) editingTask.tags = [];
  editingTask.tags.push(newTag.value.trim());
  newTag.value = '';
  autoSaveField('tags');
};

/**
 * Remove tag
 */
const removeTag = (tag: string) => {
  editingTask.tags = editingTask.tags.filter((t: string) => t !== tag);
  autoSaveField('tags');
};

/**
 * Add reminder
 */
const addReminder = async () => {
  if (!reminderTime.value) return;
  editingTask.reminders.push({
    id: Math.random().toString(),
    time: reminderTime.value,
    type: reminderType.value,
  });
  reminderTime.value = '';
  await autoSaveField('reminders');
};

/**
 * Remove reminder
 */
const removeReminder = (id: string) => {
  editingTask.reminders = editingTask.reminders.filter((r: any) => r.id !== id);
  autoSaveField('reminders');
};

/**
 * Format reminder time
 */
const formatReminderTime = (time: string): string => {
  return new Date(time).toLocaleString();
};

/**
 * Duplicate task
 */
const duplicateTask = async () => {
  try {
    await taskStore.duplicateTask(taskId);
    menuOpen.value = false;
  } catch (error) {
    console.error('Duplicate error:', error);
  }
};

/**
 * Share task
 */
const shareTask = () => {
  // TODO: Implement sharing
  menuOpen.value = false;
};

/**
 * Delete task
 */
const deleteTask = async () => {
  try {
    await taskStore.deleteTask(taskId);
    router.back();
  } catch (error) {
    console.error('Delete error:', error);
  }
};

onMounted(() => {
  loadTask();
});
</script>

<style scoped>
.task-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.task-status-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.status-info {
  flex: 1;
}

.status-info p {
  margin: 0;
}

.editable-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.editable-field label {
  font-weight: 600;
  font-size: 12px;
  color: var(--ion-color-medium);
  text-transform: uppercase;
}

.due-date-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.due-date-input ion-datetime {
  flex: 1;
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-input {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 4px;
  font-size: 14px;
}

.add-subtask,
.add-reminder {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.add-subtask ion-input,
.add-reminder ion-select,
.add-reminder ion-datetime {
  flex: 1;
}

.reminder-info {
  flex: 1;
}

.auto-save-status {
  position: fixed;
  bottom: 60px;
  right: 16px;
  padding: 12px 16px;
  background: var(--ion-color-success);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  z-index: 100;
}

.auto-save-status.saving {
  background: var(--ion-color-warning);
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.completed {
  text-decoration: line-through;
  color: var(--ion-color-medium);
}
</style>
