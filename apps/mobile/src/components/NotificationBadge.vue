<template>
  <div class="notification-badge">
    <!-- Badge with count -->
    <div v-if="totalCount > 0" class="badge-container">
      <IonButton fill="clear" size="small" @click="toggleNotificationPanel">
        <IonIcon slot="icon-only" :icon="notificationsOutline"></IonIcon>
        <span v-if="unreadCount > 0" class="badge-count">{{ unreadCount }}</span>
      </IonButton>
    </div>

    <!-- Notification Panel -->
    <IonModal
      :is-open="panelOpen"
      @didDismiss="panelOpen = false"
      css-class="notification-panel"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notifications ({{ unreadCount }} unread)</IonTitle>
          <IonButtons slot="end">
            <IonButton @click="panelOpen = false">
              <IonIcon slot="icon-only" :icon="closeOutline"></IonIcon>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent class="notification-list">
        <div v-if="notifications.length === 0" class="empty-state">
          <IonIcon :icon="notificationsOffOutline"></IonIcon>
          <p>No notifications</p>
        </div>

        <IonList v-else>
          <IonItemSliding v-for="notif in notifications" :key="notif.id">
            <IonItem
              :class="{ unread: !notif.read }"
              @click="markAsRead(notif)"
            >
              <div class="notification-content">
                <h3 class="notification-title">{{ notif.title }}</h3>
                <p class="notification-message">{{ notif.message }}</p>
                <span class="notification-time">{{ formatTime(notif.createdAt) }}</span>
              </div>
            </IonItem>

            <IonItemOptions>
              <IonItemOption color="danger" @click="deleteNotification(notif.id)">
                <IonIcon slot="icon-only" :icon="trash"></IonIcon>
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        </IonList>

        <!-- Mark All as Read -->
        <div v-if="unreadCount > 0" class="action-buttons">
          <IonButton expand="block" fill="outline" @click="markAllAsRead">
            Mark all as read
          </IonButton>
          <IonButton expand="block" fill="outline" color="danger" @click="clearAll">
            Clear all
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  </div>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonList,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
} from '@ionic/vue';
import {
  notificationsOutline,
  closeOutline,
  notificationsOffOutline,
  trash,
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Storage } from '@capacitor/storage';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  type?: string;
}

const panelOpen = ref(false);
const notifications = ref<Notification[]>([]);

/**
 * Computed properties
 */
const totalCount = computed(() => notifications.value.length);
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

/**
 * Toggle notification panel
 */
const toggleNotificationPanel = () => {
  panelOpen.value = !panelOpen.value;
};

/**
 * Load notifications from storage
 */
const loadNotifications = async () => {
  try {
    const { value } = await Storage.get({ key: 'notifications' });
    if (value) {
      const data = JSON.parse(value);
      notifications.value = data.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
};

/**
 * Save notifications to storage
 */
const saveNotifications = async () => {
  try {
    await Storage.set({
      key: 'notifications',
      value: JSON.stringify(notifications.value),
    });
  } catch (error) {
    console.error('Error saving notifications:', error);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notif: Notification) => {
  notif.read = true;
  await saveNotifications();
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async () => {
  notifications.value.forEach(n => {
    n.read = true;
  });
  await saveNotifications();
};

/**
 * Delete single notification
 */
const deleteNotification = async (id: string) => {
  notifications.value = notifications.value.filter(n => n.id !== id);
  await saveNotifications();
};

/**
 * Clear all notifications
 */
const clearAll = async () => {
  notifications.value = [];
  await saveNotifications();
};

/**
 * Format notification time
 */
const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return d.toLocaleDateString();
};

/**
 * Listen for new notifications
 */
const setupNotificationListener = () => {
  document.addEventListener('notification-received', (event: any) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title: event.detail.title || 'Notification',
      message: event.detail.message || '',
      read: false,
      createdAt: new Date(),
      type: event.detail.type,
    };
    notifications.value.unshift(newNotif);
    saveNotifications();
  });
};

onMounted(() => {
  loadNotifications();
  setupNotificationListener();
});

onUnmounted(() => {
  document.removeEventListener('notification-received', setupNotificationListener);
});
</script>

<style scoped>
.notification-badge {
  position: relative;
  display: inline-block;
}

.badge-container {
  position: relative;
}

.badge-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--ion-color-danger);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.notification-list {
  background: var(--ion-background-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--ion-color-medium);
  text-align: center;
}

.empty-state ion-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.notification-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.notification-title {
  font-weight: 600;
  margin: 0;
  font-size: 14px;
}

.notification-message {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 13px;
  line-height: 1.4;
}

.notification-time {
  font-size: 11px;
  color: var(--ion-color-medium-shade);
}

.unread {
  background-color: rgba(var(--ion-color-primary-rgb), 0.05);
  border-left: 3px solid var(--ion-color-primary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--ion-color-step-100);
}

::v-deep(.notification-panel) {
  --width: 100%;
  --height: 70%;
  --border-radius: 16px 16px 0 0;
}

@media (min-width: 768px) {
  ::v-deep(.notification-panel) {
    --width: 400px;
    --height: 100%;
    --border-radius: 0;
  }
}
</style>
