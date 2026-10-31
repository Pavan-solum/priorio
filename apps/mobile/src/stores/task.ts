import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  synced?: boolean;
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const selectedTask = ref<Task | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const pendingTasks = computed(() =>
    tasks.value.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS'),
  );

  const completedTasks = computed(() =>
    tasks.value.filter(t => t.status === 'COMPLETED'),
  );

  const highPriorityTasks = computed(() =>
    tasks.value.filter(t => ['CRITICAL', 'HIGH'].includes(t.priority)),
  );

  const unsyncedTasks = computed(() =>
    tasks.value.filter(t => !t.synced),
  );

  // Actions
  function addTask(task: Task) {
    tasks.value.push(task);
  }

  function updateTask(id: string, updates: Partial<Task>) {
    const index = tasks.value.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates };
    }
  }

  function deleteTask(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id);
  }

  function setTasks(newTasks: Task[]) {
    tasks.value = newTasks;
  }

  function setSelectedTask(task: Task | null) {
    selectedTask.value = task;
  }

  function setLoading(isLoading: boolean) {
    loading.value = isLoading;
  }

  function setError(errorMsg: string | null) {
    error.value = errorMsg;
  }

  function markAsSynced(id: string) {
    const task = tasks.value.find(t => t.id === id);
    if (task) {
      task.synced = true;
    }
  }

  return {
    // State
    tasks,
    selectedTask,
    loading,
    error,

    // Getters
    pendingTasks,
    completedTasks,
    highPriorityTasks,
    unsyncedTasks,

    // Actions
    addTask,
    updateTask,
    deleteTask,
    setTasks,
    setSelectedTask,
    setLoading,
    setError,
    markAsSynced,
  };
});
