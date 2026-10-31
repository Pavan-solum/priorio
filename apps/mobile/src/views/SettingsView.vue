<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Settings</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent></IonRefresherContent>
      </IonRefresher>

      <div class="settings-container">
        <!-- Account Section -->
        <div class="settings-section">
          <IonListHeader>
            <IonLabel>Account</IonLabel>
          </IonListHeader>
          <IonList>
            <IonItem button @click="editProfile">
              <IonLabel>
                <h3>Profile</h3>
                <p>{{ userEmail }}</p>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>

            <IonItem button @click="openAuthModal">
              <IonLabel>
                <h3>Authentication</h3>
                <p>Manage security settings</p>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>

            <IonItem button @click="manageSubscription">
              <IonLabel>
                <h3>Subscription</h3>
                <p>{{ subscriptionStatus }}</p>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>
          </IonList>
        </div>

        <!-- Device & Sync Section -->
        <div class="settings-section">
          <IonListHeader>
            <IonLabel>Device & Sync</IonLabel>
          </IonListHeader>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Device Name</h3>
                <p>{{ deviceName }}</p>
              </IonLabel>
              <IonButton slot="end" fill="clear" size="small" @click="editDeviceName">
                Edit
              </IonButton>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Auto Sync</h3>
                <p>{{ autoSyncEnabled ? 'Enabled' : 'Disabled' }}</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="autoSyncEnabled"
                @ionChange="updateAutoSync"
              ></IonToggle>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Sync Interval</h3>
                <p>{{ syncInterval }}s</p>
              </IonLabel>
              <IonSelect slot="end" v-model="syncInterval" @ionChange="updateSyncInterval">
                <IonSelectOption value="30">30 seconds</IonSelectOption>
                <IonSelectOption value="60">1 minute</IonSelectOption>
                <IonSelectOption value="300">5 minutes</IonSelectOption>
                <IonSelectOption value="600">10 minutes</IonSelectOption>
                <IonSelectOption value="1800">30 minutes</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem button @click="manageDevices">
              <IonLabel>
                <h3>Manage Devices</h3>
                <p>View all connected devices</p>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>

            <IonItem button @click="syncNow">
              <IonLabel>
                <h3>Sync Now</h3>
                <p v-if="lastSyncTime">Last: {{ formatDate(lastSyncTime) }}</p>
                <p v-else>Never synced</p>
              </IonLabel>
              <IonButton slot="end" fill="clear">
                <IonIcon :icon="refreshOutline"></IonIcon>
              </IonButton>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Offline Mode</h3>
                <p>Work offline and sync later</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="offlineMode"
                @ionChange="updateOfflineMode"
              ></IonToggle>
            </IonItem>
          </IonList>
        </div>

        <!-- Notifications Section -->
        <div class="settings-section">
          <IonListHeader>
            <IonLabel>Notifications</IonLabel>
          </IonListHeader>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Push Notifications</h3>
                <p>Reminders and updates</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="notificationSettings.pushEnabled"
                @ionChange="updateNotifications"
              ></IonToggle>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Email Notifications</h3>
                <p>Daily digest</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="notificationSettings.emailEnabled"
                @ionChange="updateNotifications"
              ></IonToggle>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Task Reminders</h3>
                <p>Alert before due time</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="notificationSettings.taskRemindersEnabled"
                @ionChange="updateNotifications"
              ></IonToggle>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Sound</h3>
                <p>{{ notificationSettings.soundEnabled ? 'On' : 'Off' }}</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="notificationSettings.soundEnabled"
                @ionChange="updateNotifications"
              ></IonToggle>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Vibration</h3>
                <p>{{ notificationSettings.vibrationEnabled ? 'On' : 'Off' }}</p>
              </IonLabel>
              <IonToggle
                slot="end"
                v-model="notificationSettings.vibrationEnabled"
                @ionChange="updateNotifications"
              ></IonToggle>
            </IonItem>
          </IonList>
        </div>

        <!-- Preferences Section -->
        <div class="settings-section">
          <IonListHeader>
            <IonLabel>Preferences</IonLabel>
          </IonListHeader>
          <IonList>
            <IonItem>
              <IonLabel position="floating">Default Priority</IonLabel>
              <IonSelect slot="end" v-model="preferences.defaultPriority">
                <IonSelectOption value="HIGH">High</IonSelectOption>
                <IonSelectOption value="MEDIUM">Medium</IonSelectOption>
                <IonSelectOption value="LOW">Low</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Theme</h3>
                <p>{{ theme }}</p>
              </IonLabel>
              <IonSelect slot="end" v-model="theme" @ionChange="updateTheme">
                <IonSelectOption value="light">Light</IonSelectOption>
                <IonSelectOption value="dark">Dark</IonSelectOption>
                <IonSelectOption value="auto">Auto</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Language</h3>
                <p>{{ language }}</p>
              </IonLabel>
              <IonSelect slot="end" v-model="language">
                <IonSelectOption value="en">English</IonSelectOption>
                <IonSelectOption value="es">Spanish</IonSelectOption>
                <IonSelectOption value="fr">French</IonSelectOption>
                <IonSelectOption value="de">German</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h3>Date Format</h3>
                <p>{{ dateFormat }}</p>
              </IonLabel>
              <IonSelect slot="end" v-model="dateFormat">
                <IonSelectOption value="MM/DD/YYYY">MM/DD/YYYY</IonSelectOption>
                <IonSelectOption value="DD/MM/YYYY">DD/MM/YYYY</IonSelectOption>
                <IonSelectOption value="YYYY-MM-DD">YYYY-MM-DD</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>
        </div>

        <!-- Storage Section -->
        <div class="settings-section">
          <IonListHeader>
            <IonLabel>Storage</IonLabel>
          </IonListHeader>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Storage Used</h3>
                <div class="storage-bar">
                  <div class="storage-used" :style="{ width: storagePercent + '%' }"></div>
                </div>
                <p class="storage-info">{{ usedStorage }} / {{ totalStorage }}</p>
              </IonLabel>
            </IonItem>

            <IonItem button @click="clearCache">
              <IonLabel>
                <h3>Clear Cache</h3>
                <p>Remove cached data</p>
              </IonLabel>
              <IonButton slot="end" fill="clear" color="warning">
                Clear
              </IonButton>
            </IonItem>

            <IonItem button @click="exportData">
              <IonLabel>
                <h3>Export Data</h3>
                <p>Download all your data</p>
              </IonLabel>
              <IonIcon slot="end" :icon="downloadOutline"></IonIcon>
            </IonItem>
          </IonList>
        </div>

        <!-- About Section -->
        <div class="settings-section">
          <IonListHeader>
            <IonLabel>About</IonLabel>
          </IonListHeader>
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>App Version</h3>
                <p>{{ appVersion }}</p>
              </IonLabel>
            </IonItem>

            <IonItem button @click="checkUpdates">
              <IonLabel>
                <h3>Check for Updates</h3>
                <p>Latest version available</p>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>

            <IonItem button @click="openTerms">
              <IonLabel>
                <h3>Terms of Service</h3>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>

            <IonItem button @click="openPrivacy">
              <IonLabel>
                <h3>Privacy Policy</h3>
              </IonLabel>
              <IonIcon slot="end" :icon="chevronForwardOutline"></IonIcon>
            </IonItem>
          </IonList>
        </div>

        <!-- Logout Section -->
        <div class="settings-section">
          <IonButton expand="block" color="danger" @click="logout">
            <IonIcon slot="start" :icon="logOutOutline"></IonIcon>
            Logout
          </IonButton>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonListHeader,
  IonLabel,
  IonList,
  IonItem,
  IonIcon,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonButton,
  RefresherEventDetail,
} from '@ionic/vue';
import {
  chevronForwardOutline,
  refreshOutline,
  downloadOutline,
  logOutOutline,
} from 'ionicons/icons';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useDeviceStore } from '../stores/device';
import axios from 'axios';

const router = useRouter();
const authStore = useAuthStore();
const deviceStore = useDeviceStore();

const userEmail = ref('user@example.com');
const subscriptionStatus = ref('Free');
const deviceName = ref('Mobile Device');
const autoSyncEnabled = ref(true);
const syncInterval = ref('60');
const lastSyncTime = ref<Date | null>(null);
const offlineMode = ref(false);
const appVersion = ref('1.0.0');
const theme = ref('auto');
const language = ref('en');
const dateFormat = ref('MM/DD/YYYY');
const usedStorage = ref('245 MB');
const totalStorage = ref('1 GB');

const notificationSettings = ref({
  pushEnabled: true,
  emailEnabled: true,
  taskRemindersEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
});

const preferences = ref({
  defaultPriority: 'MEDIUM',
});

/**
 * Computed properties
 */
const storagePercent = computed(() => 24.5); // 245/1000 * 100

/**
 * Load settings
 */
const loadSettings = async () => {
  try {
    const response = await axios.get('/api/settings');
    const settings = response.data;

    userEmail.value = settings.email || userEmail.value;
    subscriptionStatus.value = settings.subscriptionStatus || subscriptionStatus.value;
    deviceName.value = settings.deviceName || deviceName.value;
    autoSyncEnabled.value = settings.autoSyncEnabled ?? autoSyncEnabled.value;
    syncInterval.value = settings.syncInterval || syncInterval.value;
    lastSyncTime.value = settings.lastSyncTime ? new Date(settings.lastSyncTime) : null;
    offlineMode.value = settings.offlineMode ?? offlineMode.value;
    theme.value = settings.theme || theme.value;
    language.value = settings.language || language.value;
    dateFormat.value = settings.dateFormat || dateFormat.value;

    Object.assign(notificationSettings.value, settings.notifications);
    Object.assign(preferences.value, settings.preferences);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

/**
 * Edit profile
 */
const editProfile = () => {
  // TODO: Implement profile editor
  console.log('Edit profile');
};

/**
 * Open auth modal
 */
const openAuthModal = () => {
  // TODO: Implement auth settings
  console.log('Auth settings');
};

/**
 * Manage subscription
 */
const manageSubscription = () => {
  // TODO: Implement subscription management
  console.log('Manage subscription');
};

/**
 * Edit device name
 */
const editDeviceName = () => {
  // TODO: Implement device name editor
  console.log('Edit device name');
};

/**
 * Update auto sync
 */
const updateAutoSync = async () => {
  try {
    await axios.patch('/api/settings', { autoSyncEnabled: autoSyncEnabled.value });
  } catch (error) {
    console.error('Error updating auto sync:', error);
  }
};

/**
 * Update sync interval
 */
const updateSyncInterval = async () => {
  try {
    await axios.patch('/api/settings', { syncInterval: syncInterval.value });
  } catch (error) {
    console.error('Error updating sync interval:', error);
  }
};

/**
 * Manage devices
 */
const manageDevices = () => {
  router.push('/devices');
};

/**
 * Sync now
 */
const syncNow = async () => {
  try {
    await deviceStore.syncNow();
    lastSyncTime.value = new Date();
  } catch (error) {
    console.error('Error syncing:', error);
  }
};

/**
 * Update offline mode
 */
const updateOfflineMode = async () => {
  try {
    await axios.patch('/api/settings', { offlineMode: offlineMode.value });
  } catch (error) {
    console.error('Error updating offline mode:', error);
  }
};

/**
 * Update notifications
 */
const updateNotifications = async () => {
  try {
    await axios.patch('/api/settings', { notifications: notificationSettings.value });
  } catch (error) {
    console.error('Error updating notifications:', error);
  }
};

/**
 * Update theme
 */
const updateTheme = () => {
  // Apply theme change
  document.documentElement.setAttribute('color-scheme', theme.value);
};

/**
 * Clear cache
 */
const clearCache = async () => {
  try {
    await axios.post('/api/storage/cache/clear');
    // Show toast
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Export data
 */
const exportData = async () => {
  try {
    const response = await axios.get('/api/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `priorio-export-${Date.now()}.zip`;
    a.click();
  } catch (error) {
    console.error('Error exporting data:', error);
  }
};

/**
 * Check for updates
 */
const checkUpdates = () => {
  // TODO: Implement update checking
  console.log('Check updates');
};

/**
 * Open terms of service
 */
const openTerms = () => {
  window.open('https://priorio.app/terms', '_blank');
};

/**
 * Open privacy policy
 */
const openPrivacy = () => {
  window.open('https://priorio.app/privacy', '_blank');
};

/**
 * Logout
 */
const logout = async () => {
  try {
    await authStore.logout();
    router.push('/login');
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

/**
 * Format date
 */
const formatDate = (date: Date): string => {
  return date.toLocaleString();
};

/**
 * Handle refresh
 */
const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
  try {
    await loadSettings();
  } finally {
    event.detail.complete();
  }
};

// Load settings on mount
loadSettings();
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 32px;
}

.settings-section {
  margin-bottom: 8px;
}

.storage-bar {
  width: 100%;
  height: 6px;
  background: var(--ion-color-step-100);
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0 4px 0;
}

.storage-used {
  height: 100%;
  background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-success));
  transition: width 0.3s ease;
}

.storage-info {
  margin: 0;
  font-size: 12px;
  color: var(--ion-color-medium);
}

::v-deep(ion-list-header) {
  margin-top: 0;
}
</style>
