<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Tasks</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="showFilters = !showFilters">
            <IonIcon :icon="funnel"></IonIcon>
          </IonButton>
          <IonButton @click="startSync">
            <IonIcon :icon="refreshCircle"></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <SyncStatusIndicator v-if="syncStore.isSyncing" />

      <div v-if="showFilters" class="filters">
        <IonSegment v-model="selectedFilter">
          <IonSegmentButton value="all">All</IonSegmentButton>
          <IonSegmentButton value="pending">Pending</IonSegmentButton>
          <IonSegmentButton value="completed">Completed</IonSegmentButton>
          <IonSegmentButton value="high">High Priority</IonSegmentButton>
        </IonSegment>
      </div>

      <div v-if="filteredTasks.length === 0" class="empty-state">
        <p>No tasks found</p>
      </div>

      <IonList v-else>
        <TaskCard
          v-for="task in filteredTasks"
          :key="task.id"
          :task="task"
          @click="selectTask(task)"
          @edit="editTask(task)"
          @delete="deleteTask(task.id)"
          @toggle="toggleTaskStatus(task)"
        />
      </IonList>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton @click="showNewTaskModal = true">
          <IonIcon :icon="add"></IonIcon>
        </IonFabButton>
      </IonFab>
    </IonContent>

    <!-- New Task Modal -->
    <IonModal :is-open="showNewTaskModal" @didDismiss="showNewTaskModal = false">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton @click="showNewTaskModal = false">Cancel</IonButton>
          </IonButtons>
          <IonTitle>New Task</IonTitle>
          <IonButtons slot="end">
            <IonButton @click="createNewTask" strong>Create</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonInput
          v-model="newTask.title"
          placeholder="Task title"
          class="ion-margin"
        ></IonInput>
        <IonTextarea
          v-model="newTask.description"
          placeholder="Description"
          class="ion-margin"
        ></IonTextarea>
        <IonSelect v-model="newTask.priority" class="ion-margin">
          <IonSelectOption value="LOW">Low</IonSelectOption>
          <IonSelectOption value="MEDIUM">Medium</IonSelectOption>
          <IonSelectOption value="HIGH">High</IonSelectOption>
          <IonSelectOption value="CRITICAL">Critical</IonSelectOption>
        </IonSelect>
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
  IonList,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
} from '@ionic/vue';
import {
  add,
  funnel,
  refreshCircle,
} from 'ionicons/icons';
import { ref, computed } from 'vue';
import { useTaskStore } from '../stores/task';
import { useSyncStore } from '../stores/sync';
import TaskCard from '../components/TaskCard.vue';
import SyncStatusIndicator from '../components/SyncStatusIndicator.vue';

const taskStore = useTaskStore();
const syncStore = useSyncStore();

const showNewTaskModal = ref(false);
const showFilters = ref(false);
const selectedFilter = ref('all');

const newTask = ref({
  title: '',
  description: '',
  priority: 'MEDIUM',
});

const filteredTasks = computed(() => {
  switch (selectedFilter.value) {
    case 'pending':
      return taskStore.pendingTasks;
    case 'completed':
      return taskStore.completedTasks;
    case 'high':
      return taskStore.highPriorityTasks;
    default:
      return taskStore.tasks;
  }
});

function selectTask(task: any) {
  taskStore.setSelectedTask(task);
}

function editTask(task: any) {
  // Navigate to edit view
}

function deleteTask(id: string) {
  taskStore.deleteTask(id);
}

function toggleTaskStatus(task: any) {
  const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
  taskStore.updateTask(task.id, { status: newStatus });
}

function createNewTask() {
  if (!newTask.value.title) return;

  const task = {
    id: Date.now().toString(),
    ...newTask.value,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  };

  taskStore.addTask(task);
  showNewTaskModal.value = false;

  // Reset form
  newTask.value = {
    title: '',
    description: '',
    priority: 'MEDIUM',
  };
}

function startSync() {
  // Call sync service
}
</script>

<style scoped>
.filters {
  padding: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
