<template>
  <div class="offline-badge" v-if="isOffline || hasPendingSync">
    <IonChip :color="isOffline ? 'danger' : 'warning'">
      <IonIcon :icon="cloudOfflineOutline"></IonIcon>
      <IonLabel>
        {{ isOffline ? 'Offline' : `${pendingCount} pending` }}
      </IonLabel>
    </IonChip>
  </div>
</template>

<script setup lang="ts">
import {
  IonChip,
  IonIcon,
  IonLabel,
} from '@ionic/vue';
import { cloudOfflineOutline } from 'ionicons/icons';
import { defineProps, computed, onMounted, onUnmounted, ref } from 'vue';
import { useDeviceStore } from '../stores/device';

interface Props {
  showPendingCount?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showPendingCount: true,
});

const deviceStore = useDeviceStore();
const isOffline = ref(false);
const pendingCount = ref(0);

/**
 * Monitor offline status and pending sync items
 */
onMounted(() => {
  updateOfflineStatus();
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOfflineStatus);
  window.removeEventListener('offline', updateOfflineStatus);
});

/**
 * Update offline status
 */
const updateOfflineStatus = () => {
  isOffline.value = !navigator.onLine;
};

/**
 * Computed property for pending sync count
 */
const hasPendingSync = computed(() => pendingCount.value > 0);

/**
 * Monitor pending items from device store
 */
const monitorPendingItems = async () => {
  try {
    const device = deviceStore.currentDevice;
    if (!device) return;

    const response = await fetch(`/api/device-management/devices/${device.deviceId}/pending-items`);
    if (response.ok) {
      const data = await response.json();
      pendingCount.value = data.count || 0;
    }
  } catch (error) {
    console.error('Error monitoring pending items:', error);
  }
};

// Poll for pending items every 5 seconds
const pollInterval = setInterval(monitorPendingItems, 5000);

onUnmounted(() => {
  clearInterval(pollInterval);
});
</script>

<style scoped>
.offline-badge {
  display: inline-flex;
}

::v-deep(.ion-chip) {
  font-size: 12px;
  padding: 4px 12px;
  height: auto;
}

::v-deep(.ion-chip ion-icon) {
  margin-right: 4px;
}
</style>
