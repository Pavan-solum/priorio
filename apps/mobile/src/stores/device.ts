import { defineStore } from 'pinia';
import { ref } from 'vue';

interface DeviceInfo {
  id: string;
  deviceId: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceName: string;
  syncStatus: string;
  lastSyncAt?: Date;
  isActive: boolean;
}

export const useDeviceStore = defineStore('device', () => {
  const currentDevice = ref<DeviceInfo | null>(null);
  const currentWorkspace = ref<any>(null);
  const isRegistered = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  function setDevice(device: DeviceInfo | null) {
    currentDevice.value = device;
    isRegistered.value = !!device;
  }

  function setWorkspace(workspace: any) {
    currentWorkspace.value = workspace;
  }

  function updateDeviceStatus(status: string) {
    if (currentDevice.value) {
      currentDevice.value.syncStatus = status;
    }
  }

  function updateLastSync(date: Date) {
    if (currentDevice.value) {
      currentDevice.value.lastSyncAt = date;
    }
  }

  function setLoading(isLoading: boolean) {
    loading.value = isLoading;
  }

  function setError(errorMsg: string | null) {
    error.value = errorMsg;
  }

  function clearDevice() {
    currentDevice.value = null;
    currentWorkspace.value = null;
    isRegistered.value = false;
  }

  return {
    // State
    currentDevice,
    currentWorkspace,
    isRegistered,
    loading,
    error,

    // Actions
    setDevice,
    setWorkspace,
    updateDeviceStatus,
    updateLastSync,
    setLoading,
    setError,
    clearDevice,
  };
});
