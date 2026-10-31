import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSyncStore = defineStore('sync', () => {
  const status = ref<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const lastSyncAt = ref<Date | null>(null);
  const nextSyncAt = ref<Date | null>(null);
  const processedItems = ref(0);
  const failedItems = ref(0);
  const conflictsFound = ref(0);
  const syncError = ref<string | null>(null);
  const isSyncing = computed(() => status.value === 'syncing');

  // Actions
  function setStatus(newStatus: 'idle' | 'syncing' | 'completed' | 'error') {
    status.value = newStatus;
  }

  function setLastSync(date: Date) {
    lastSyncAt.value = date;
  }

  function setNextSync(date: Date | null) {
    nextSyncAt.value = date;
  }

  function addProcessedItems(count: number = 1) {
    processedItems.value += count;
  }

  function addFailedItems(count: number = 1) {
    failedItems.value += count;
  }

  function incrementConflicts(count: number = 1) {
    conflictsFound.value += count;
  }

  function setSyncError(error: string | null) {
    syncError.value = error;
  }

  function reset() {
    status.value = 'idle';
    processedItems.value = 0;
    failedItems.value = 0;
    conflictsFound.value = 0;
    syncError.value = null;
  }

  function removeConflict(conflictId: string) {
    if (conflictsFound.value > 0) {
      conflictsFound.value--;
    }
  }

  return {
    // State
    status,
    lastSyncAt,
    nextSyncAt,
    processedItems,
    failedItems,
    conflictsFound,
    syncError,
    isSyncing,

    // Actions
    setStatus,
    setLastSync,
    setNextSync,
    addProcessedItems,
    addFailedItems,
    incrementConflicts,
    setSyncError,
    reset,
    removeConflict,
  };
});
