import { ref, computed } from 'vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import type { ProviderType, ProviderIntegration } from '@/stores/integrationStore'

/**
 * Composable for managing providers list
 */
export function useProviders() {
  const store = useIntegrationStore()
  const loadingProviders = ref(false)
  const availableProviders = ref<Array<{ type: ProviderType; name: string; icon: string; description: string }>>([
    { type: 'teams', name: 'Microsoft Teams', icon: 'mdi-microsoft-teams', description: 'Chat and collaboration' },
    { type: 'outlook', name: 'Outlook', icon: 'mdi-microsoft-outlook', description: 'Email and calendar' },
    { type: 'calendar', name: 'Google Calendar', icon: 'mdi-calendar', description: 'Calendar events' },
    { type: 'github', name: 'GitHub', icon: 'mdi-github', description: 'Code repositories' },
    { type: 'slack', name: 'Slack', icon: 'mdi-slack', description: 'Team messaging' },
    { type: 'discord', name: 'Discord', icon: 'mdi-discord', description: 'Community chat' },
  ])

  /**
   * Get all available providers
   */
  const getAllAvailable = () => availableProviders.value

  /**
   * Get connected providers
   */
  const getConnected = (): ProviderIntegration[] => {
    return store.connectedProviders
  }

  /**
   * Get disconnected providers
   */
  const getDisconnected = (): Array<{ type: ProviderType; name: string; icon: string; description: string }> => {
    const connected = store.connectedProviders.map(p => p.provider)
    return availableProviders.value.filter(p => !connected.includes(p.type))
  }

  /**
   * Get provider details by type
   */
  const getProviderDetails = (type: ProviderType) => {
    return availableProviders.value.find(p => p.type === type)
  }

  /**
   * Get provider by type from store
   */
  const getProvider = (type: ProviderType): ProviderIntegration | undefined => {
    return store.getProvider(type)
  }

  /**
   * Load all providers from backend
   */
  const loadProviders = async (): Promise<void> => {
    loadingProviders.value = true
    try {
      const response = await fetch('/api/integrations/providers')
      const data = await response.json()
      store.initializeProviders(data)
      store.setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load providers'
      store.setError(message)
      console.error('Error loading providers:', err)
    } finally {
      loadingProviders.value = false
    }
  }

  /**
   * Get provider status
   */
  const getStatus = (type: ProviderType) => {
    const provider = store.getProvider(type)
    return provider?.status || 'disconnected'
  }

  /**
   * Get connected count
   */
  const getConnectedCount = (): number => {
    return store.connectedCount
  }

  /**
   * Get total provider count
   */
  const getTotalCount = (): number => {
    return store.providers.length
  }

  /**
   * Get provider error
   */
  const getError = (type: ProviderType): string | undefined => {
    return store.getProvider(type)?.error
  }

  /**
   * Get last sync time for provider
   */
  const getLastSync = (type: ProviderType): Date | null => {
    const provider = store.getProvider(type)
    return provider?.lastSyncAt ? new Date(provider.lastSyncAt) : null
  }

  /**
   * Check provider connectivity
   */
  const checkConnectivity = async (type: ProviderType): Promise<boolean> => {
    try {
      const response = await fetch(`/api/integrations/${type}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get stats for all providers
   */
  const getStats = () => {
    return store.getProviderStats()
  }

  /**
   * Search providers
   */
  const searchProviders = (query: string): typeof availableProviders.value => {
    const lowerQuery = query.toLowerCase()
    return availableProviders.value.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get providers by category (mock implementation)
   */
  const getByCategory = (category: 'communication' | 'productivity' | 'development') => {
    const categories: Record<string, ProviderType[]> = {
      communication: ['teams', 'slack', 'discord'],
      productivity: ['outlook', 'calendar'],
      development: ['github'],
    }
    const types = categories[category] || []
    return availableProviders.value.filter(p => types.includes(p.type))
  }

  return {
    loadingProviders,
    availableProviders,
    getAllAvailable,
    getConnected,
    getDisconnected,
    getProviderDetails,
    getProvider,
    loadProviders,
    getStatus,
    getConnectedCount,
    getTotalCount,
    getError,
    getLastSync,
    checkConnectivity,
    getStats,
    searchProviders,
    getByCategory,
  }
}
