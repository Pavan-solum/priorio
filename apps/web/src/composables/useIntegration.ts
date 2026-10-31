import { ref, computed } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { ProviderType, ProviderIntegration, ConnectionStatus } from '@/stores/integrationStore'

/**
 * Composable for managing integration provider connections and state
 */
export function useIntegration() {
  const store = useIntegrationStore()
  const connecting = ref(false)
  const disconnecting = ref(false)

  /**
   * Connect a provider
   */
  const connectProvider = async (provider: ProviderType, credentials?: Record<string, any>): Promise<boolean> => {
    connecting.value = true
    try {
      // Call backend API to connect provider
      const response = await fetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        throw new Error(`Failed to connect ${provider}`)
      }

      const data = await response.json()
      const integration: ProviderIntegration = {
        id: data.id,
        provider,
        account: data.account || '',
        email: data.email,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        syncProgress: 0,
        permissions: data.permissions || [],
      }

      store.addProvider(integration)
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      store.setError(message)
      console.error(`Error connecting ${provider}:`, err)
      return false
    } finally {
      connecting.value = false
    }
  }

  /**
   * Disconnect a provider
   */
  const disconnectProvider = async (provider: ProviderType): Promise<boolean> => {
    disconnecting.value = true
    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to disconnect ${provider}`)
      }

      store.removeProvider(provider)
      store.setError(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnection failed'
      store.setError(message)
      console.error(`Error disconnecting ${provider}:`, err)
      return false
    } finally {
      disconnecting.value = false
    }
  }

  /**
   * Refresh provider status
   */
  const refreshProvider = async (provider: ProviderType): Promise<void> => {
    try {
      const response = await fetch(`/api/integrations/${provider}/status`)
      const data = await response.json()
      store.updateProviderStatus(provider, data.status as ConnectionStatus, data.error)
    } catch (err) {
      console.error(`Error refreshing ${provider}:`, err)
    }
  }

  /**
   * Get all providers
   */
  const getAllProviders = (): ProviderIntegration[] => {
    return store.providers
  }

  /**
   * Get connected providers only
   */
  const getConnectedProviders = () => store.connectedProviders

  /**
   * Get provider by type
   */
  const getProvider = (type: ProviderType) => store.getProvider(type)

  /**
   * Check if provider is connected
   */
  const isConnected = (provider: ProviderType): boolean => {
    const prov = store.getProvider(provider)
    return prov ? prov.status === 'connected' : false
  }

  return {
    connecting,
    disconnecting,
    connectProvider,
    disconnectProvider,
    refreshProvider,
    getAllProviders,
    getConnectedProviders,
    getProvider,
    isConnected,
  }
}
