import { ref } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { ProviderType, SyncStatus } from '@/stores/integrationStore'

/**
 * Composable for managing sync operations
 */
export function useSync() {
  const store = useIntegrationStore()
  const syncing = ref(false)
  const syncProgress = ref(0)

  /**
   * Start sync for a provider
   */
  const startSync = async (provider: ProviderType): Promise<boolean> => {
    syncing.value = true
    syncProgress.value = 0
    store.startSyncFor(provider)

    try {
      const response = await fetch(`/api/integrations/${provider}/sync`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Sync failed for ${provider}`)
      }

      // Simulate progress updates (in real app, use WebSocket or polling)
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        syncProgress.value = i
        store.updateSyncProgress(provider, i)
      }

      const syncStatus: SyncStatus = {
        provider,
        status: 'success',
        progress: 100,
        itemsProcessed: 0,
        totalItems: 0,
        lastSyncAt: new Date().toISOString(),
      }

      store.updateSyncStatus(provider, syncStatus)
      store.completeSyncFor(provider)
      store.setError(null)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      store.setError(message)
      
      const syncStatus: SyncStatus = {
        provider,
        status: 'error',
        progress: syncProgress.value,
        itemsProcessed: 0,
        totalItems: 0,
        error: message,
        lastSyncAt: new Date().toISOString(),
      }
      
      store.updateSyncStatus(provider, syncStatus)
      console.error(`Error syncing ${provider}:`, err)
      return false
    } finally {
      syncing.value = false
    }
  }

  /**
   * Cancel ongoing sync
   */
  const cancelSync = (provider: ProviderType): void => {
    syncing.value = false
    syncProgress.value = 0
    store.updateSyncProgress(provider, 0)
  }

  /**
   * Get sync status for provider
   */
  const getSyncStatus = (provider: ProviderType) => {
    return store.getSyncStatus(provider)
  }

  /**
   * Get all sync statuses
   */
  const getAllSyncStatuses = () => {
    return Array.from(store.syncStatuses.values())
  }

  /**
   * Force full sync
   */
  const fullSync = async (providers?: ProviderType[]): Promise<Map<ProviderType, boolean>> => {
    const results = new Map<ProviderType, boolean>()
    const providersToSync = providers || store.connectedProviders.map(p => p.provider)

    for (const provider of providersToSync) {
      const success = await startSync(provider)
      results.set(provider, success)
    }

    return results
  }

  /**
   * Get last sync time for provider
   */
  const getLastSyncTime = (provider: ProviderType): Date | null => {
    const prov = store.getProvider(provider)
    return prov?.lastSyncAt ? new Date(prov.lastSyncAt) : null
  }

  /**
   * Check if provider needs sync
   */
  const needsSync = (provider: ProviderType, intervalMinutes: number = 60): boolean => {
    const lastSync = getLastSyncTime(provider)
    if (!lastSync) return true
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60)
    return diffMinutes > intervalMinutes
  }

  return {
    syncing,
    syncProgress,
    startSync,
    cancelSync,
    getSyncStatus,
    getAllSyncStatuses,
    fullSync,
    getLastSyncTime,
    needsSync,
  }
}
