<template>
  <IonModal
    :is-open="isOpen"
    @didDismiss="emit('close')"
    css-class="conflict-resolver-modal"
  >
    <IonHeader>
      <IonToolbar>
        <IonTitle>Resolve Conflict</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="emit('close')">
            <IonIcon slot="icon-only" :icon="closeOutline"></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <div class="conflict-resolver">
        <!-- Conflict Info -->
        <div class="conflict-info">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{{ conflict?.title || 'Conflict' }}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div class="conflict-details">
                <p><strong>Resource:</strong> {{ conflict?.resourceType }}</p>
                <p><strong>ID:</strong> <code>{{ conflict?.resourceId }}</code></p>
                <p><strong>Conflict Type:</strong> {{ conflict?.conflictType }}</p>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        <!-- Local vs Remote Comparison -->
        <div class="comparison-section">
          <h3>Choose Version</h3>

          <!-- Local Version -->
          <div class="version-card local-version">
            <div class="version-header">
              <h4>Local Version</h4>
              <span class="version-time">
                {{ formatDate(conflict?.localVersion?.timestamp) }}
              </span>
            </div>
            <div class="version-content">
              <div v-for="(value, key) in conflict?.localVersion?.data" :key="key" class="field">
                <strong>{{ key }}:</strong>
                <span>{{ JSON.stringify(value) }}</span>
              </div>
            </div>
            <IonButton
              expand="block"
              fill="outline"
              color="primary"
              @click="selectResolution('local')"
              :disabled="selectedResolution === 'local'"
            >
              <IonIcon slot="start" v-if="selectedResolution === 'local'" :icon="checkmarkOutline"></IonIcon>
              Keep Local
            </IonButton>
          </div>

          <!-- Remote Version -->
          <div class="version-card remote-version">
            <div class="version-header">
              <h4>Remote Version</h4>
              <span class="version-time">
                {{ formatDate(conflict?.remoteVersion?.timestamp) }}
              </span>
            </div>
            <div class="version-content">
              <div v-for="(value, key) in conflict?.remoteVersion?.data" :key="key" class="field">
                <strong>{{ key }}:</strong>
                <span>{{ JSON.stringify(value) }}</span>
              </div>
            </div>
            <IonButton
              expand="block"
              fill="outline"
              color="success"
              @click="selectResolution('remote')"
              :disabled="selectedResolution === 'remote'"
            >
              <IonIcon slot="start" v-if="selectedResolution === 'remote'" :icon="checkmarkOutline"></IonIcon>
              Keep Remote
            </IonButton>
          </div>

          <!-- Merge Option (if available) -->
          <div v-if="canMerge" class="version-card merge-version">
            <div class="version-header">
              <h4>Merge</h4>
              <span class="badge">Auto-merge available</span>
            </div>
            <p class="merge-description">
              Combine both versions intelligently
            </p>
            <IonButton
              expand="block"
              fill="outline"
              color="secondary"
              @click="selectResolution('merge')"
              :disabled="selectedResolution === 'merge'"
            >
              <IonIcon slot="start" v-if="selectedResolution === 'merge'" :icon="checkmarkOutline"></IonIcon>
              Merge Versions
            </IonButton>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <IonButton expand="block" fill="clear" @click="emit('close')">
            Cancel
          </IonButton>
          <IonButton
            expand="block"
            :disabled="!selectedResolution || isResolving"
            @click="resolveConflict"
          >
            <IonSpinner v-if="isResolving" name="crescent"></IonSpinner>
            {{ isResolving ? 'Resolving...' : 'Apply Resolution' }}
          </IonButton>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          <IonIcon :icon="alertCircleOutline"></IonIcon>
          <span>{{ error }}</span>
        </div>
      </div>
    </IonContent>
  </IonModal>
</template>

<script setup lang="ts">
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
} from '@ionic/vue';
import {
  closeOutline,
  checkmarkOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { ref, computed, defineProps, defineEmits, watch } from 'vue';
import axios from 'axios';

interface ConflictData {
  id: string;
  title: string;
  resourceType: string;
  resourceId: string;
  conflictType: string;
  localVersion: {
    timestamp: Date;
    data: Record<string, any>;
  };
  remoteVersion: {
    timestamp: Date;
    data: Record<string, any>;
  };
  canMerge?: boolean;
}

interface Props {
  isOpen: boolean;
  conflict: ConflictData | null;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  conflict: null,
});

const emit = defineEmits<{
  close: [];
  resolved: [resolution: string];
}>();

const selectedResolution = ref<'local' | 'remote' | 'merge' | null>(null);
const isResolving = ref(false);
const error = ref<string | null>(null);

/**
 * Computed property for merge capability
 */
const canMerge = computed(() => props.conflict?.canMerge ?? false);

/**
 * Select resolution strategy
 */
const selectResolution = (strategy: 'local' | 'remote' | 'merge') => {
  selectedResolution.value = strategy;
  error.value = null;
};

/**
 * Resolve conflict
 */
const resolveConflict = async () => {
  if (!selectedResolution.value || !props.conflict) return;

  isResolving.value = true;
  error.value = null;

  try {
    const response = await axios.post(
      `/api/sync/conflicts/${props.conflict.id}/resolve`,
      {
        resolution: selectedResolution.value,
      },
    );

    if (response.status === 200) {
      emit('resolved', selectedResolution.value);
      selectedResolution.value = null;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to resolve conflict';
    console.error('Conflict resolution error:', err);
  } finally {
    isResolving.value = false;
  }
};

/**
 * Format date
 */
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
};

/**
 * Reset when modal is closed
 */
watch(
  () => props.isOpen,
  (newVal) => {
    if (!newVal) {
      selectedResolution.value = null;
      error.value = null;
    }
  },
);
</script>

<style scoped>
.conflict-resolver {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

.conflict-info {
  margin-bottom: 8px;
}

.conflict-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conflict-details p {
  margin: 0;
  font-size: 13px;
}

.conflict-details code {
  background: var(--ion-color-step-50);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.comparison-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-section h3 {
  margin: 0;
  font-size: 16px;
}

.version-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--ion-color-step-100);
  border-radius: 8px;
  background: var(--ion-color-step-50);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-header h4 {
  margin: 0;
  font-size: 14px;
}

.version-time {
  font-size: 11px;
  color: var(--ion-color-medium);
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

.version-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.field strong {
  color: var(--ion-color-dark);
}

.field span {
  color: var(--ion-color-medium);
  word-break: break-all;
}

.merge-description {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--ion-color-danger-tint);
  color: var(--ion-color-danger);
  border-radius: 8px;
  font-size: 13px;
}

::v-deep(.conflict-resolver-modal) {
  --width: 100%;
  --height: 90%;
  --border-radius: 16px 16px 0 0;
}

@media (min-width: 768px) {
  ::v-deep(.conflict-resolver-modal) {
    --width: 600px;
    --height: 90%;
    --border-radius: 12px;
  }
}
</style>
