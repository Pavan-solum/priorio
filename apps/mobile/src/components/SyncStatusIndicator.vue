<template>
  <div class="sync-status-indicator">
    <!-- Status Icon -->
    <div class="status-icon" :class="statusClass">
      <IonIcon v-if="syncStatus === 'syncing'" :icon="refreshCircleOutline" class="spin"></IonIcon>
      <IonIcon v-else-if="syncStatus === 'completed'" :icon="checkmarkCircleOutline"></IonIcon>
      <IonIcon v-else-if="syncStatus === 'error'" :icon="closeCircleOutline"></IonIcon>
      <IonIcon v-else :icon="syncOutline"></IonIcon>
    </div>

    <!-- Status Text -->
    <div class="status-text">
      <p class="status-label">{{ statusLabel }}</p>
      <p v-if="syncStatus === 'syncing'" class="progress-info">
        {{ processedItems }} / {{ totalItems }} items
      </p>
      <p v-if="lastSync" class="last-sync">
        Last sync: {{ formatLastSync(lastSync) }}
      </p>
    </div>

    <!-- Progress Bar -->
    <div v-if="syncStatus === 'syncing'" class="progress-bar">
      <IonProgressBar :value="progressPercent" type="determinate"></IonProgressBar>
    </div>

    <!-- Error Details -->
    <div v-if="syncStatus === 'error' && error" class="error-details">
      <p class="error-message">{{ error }}</p>
      <IonButton size="small" fill="outline" @click="emit('retry')">
        Retry Sync
      </IonButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IonIcon,
  IonProgressBar,
  IonButton,
} from '@ionic/vue';
import {
  syncOutline,
  refreshCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { defineProps, defineEmits, computed } from 'vue';
import { useSyncStore } from '../stores/sync';

interface Props {
  showDetails?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
});

const emit = defineEmits<{
  retry: [];
}>();

const syncStore = useSyncStore();

/**
 * Computed properties for sync status
 */
const syncStatus = computed(() => syncStore.status);
const processedItems = computed(() => syncStore.processedItems);
const totalItems = computed(() => syncStore.totalItems || 1);
const lastSync = computed(() => syncStore.lastSync);
const error = computed(() => syncStore.error);

const statusClass = computed(() => ({
  syncing: syncStatus.value === 'syncing',
  completed: syncStatus.value === 'completed',
  error: syncStatus.value === 'error',
  idle: syncStatus.value === 'idle',
}));

const statusLabel = computed(() => {
  switch (syncStatus.value) {
    case 'syncing':
      return 'Syncing...';
    case 'completed':
      return 'Sync completed';
    case 'error':
      return 'Sync failed';
    default:
      return 'Ready to sync';
  }
});

const progressPercent = computed(() => {
  if (totalItems.value === 0) return 0;
  return processedItems.value / totalItems.value;
});

/**
 * Format last sync time
 */
const formatLastSync = (date: Date | null): string => {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};
</script>

<style scoped>
.sync-status-indicator {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--ion-color-light);
  border-radius: 8px;
  border: 1px solid var(--ion-color-light-shade);
}

.status-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
}

.status-icon.syncing {
  color: var(--ion-color-primary);
}

.status-icon.syncing ion-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-icon.completed {
  color: var(--ion-color-success);
}

.status-icon.error {
  color: var(--ion-color-danger);
}

.status-icon.idle {
  color: var(--ion-color-medium);
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-weight: 600;
  margin: 0;
  font-size: 16px;
}

.progress-info {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
}

.last-sync {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
}

.progress-bar {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
}

.error-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ion-color-light-shade);
}

.error-message {
  font-size: 12px;
  color: var(--ion-color-danger);
  margin: 0;
  line-height: 1.4;
}

.error-details ion-button {
  align-self: flex-start;
}
</style>
