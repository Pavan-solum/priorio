<template>
  <div class="providers-integrations-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-content">
        <h1>Connected Integrations</h1>
        <p class="subtitle">Manage your provider connections and permissions</p>
      </div>
      <div class="header-stats">
        <div class="stat-card">
          <span class="stat-label">Connected</span>
          <span class="stat-value">{{ store.connectedCount }} / {{ store.providers.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Syncing</span>
          <span class="stat-value">{{ syncingCount }}</span>
        </div>
        <div class="stat-card error">
          <span class="stat-label">Errors</span>
          <span class="stat-value">{{ store.providersWithErrors.length }}</span>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="store.loading" class="loading-state">
      <p>Loading integrations...</p>
    </div>

    <!-- Error message -->
    <div v-if="store.error" class="error-banner">
      <span class="error-icon">⚠</span>
      <p>{{ store.error }}</p>
      <button @click="clearError" class="close-btn">✕</button>
    </div>

    <!-- Filters and search -->
    <div class="filters-section">
      <div class="filter-group">
        <button
          v-for="status in ['all', 'connected', 'disconnected', 'error', 'syncing']"
          :key="status"
          @click="selectedFilter = status"
          :class="['filter-btn', { active: selectedFilter === status }]"
        >
          {{ formatFilterLabel(status) }}
        </button>
      </div>
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search providers..."
        class="search-input"
      />
    </div>

    <!-- Providers grid -->
    <div v-if="filteredProviders.length > 0" class="providers-grid">
      <ProviderCard
        v-for="provider in filteredProviders"
        :key="provider.provider"
        :provider="provider"
        @connect="handleConnect(provider.provider)"
        @disconnect="handleDisconnect(provider.provider)"
        @sync="handleSync(provider.provider)"
        @settings="handleSettings(provider.provider)"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">🔌</div>
      <h3>No providers found</h3>
      <p>{{ getEmptyMessage() }}</p>
    </div>

    <!-- Available providers section -->
    <div v-if="disconnectedProviders.length > 0" class="available-section">
      <h2>Available Providers</h2>
      <p class="section-description">Connect these providers to enhance your workflow</p>
      <div class="available-grid">
        <div
          v-for="provider in availableProvidersData"
          :key="provider.type"
          class="available-provider-card"
        >
          <div class="provider-icon">
            <i :class="getIconClass(provider.type)"></i>
          </div>
          <h4>{{ provider.name }}</h4>
          <p>{{ provider.description }}</p>
          <button
            @click="handleConnect(provider.type)"
            class="btn btn-primary"
            :aria-label="`Connect ${provider.name}`"
          >
            Connect
          </button>
        </div>
      </div>
    </div>

    <!-- Audit log section -->
    <div v-if="auditEntries.length > 0" class="audit-section">
      <div class="audit-header">
        <h3>Recent Activity</h3>
        <button @click="toggleAuditLog" class="toggle-btn">
          {{ showAuditLog ? '▼' : '▶' }}
        </button>
      </div>
      <div v-if="showAuditLog" class="audit-log">
        <div
          v-for="entry in auditEntries"
          :key="entry.id"
          class="audit-entry"
          :class="`status-${entry.status}`"
        >
          <span class="audit-time">{{ formatTime(entry.timestamp) }}</span>
          <span class="audit-action">{{ entry.action }}</span>
          <span class="audit-provider">{{ entry.provider }}</span>
          <span class="audit-status">{{ entry.status === 'success' ? '✓' : '✕' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ProviderCard from '@/components/integrations/ProviderCard.vue'
import { useIntegrationStore } from '@/stores/integrationStore'
import { useIntegration } from '@/composables/useIntegration'
import { useSync } from '@/composables/useSync'
import { useProviders } from '@/composables/useProviders'
import type { ProviderType } from '@/stores/integrationStore'

const store = useIntegrationStore()
const { connectProvider, disconnectProvider } = useIntegration()
const { startSync } = useSync()
const { getDisconnected, getAllAvailable } = useProviders()

const selectedFilter = ref('all')
const searchQuery = ref('')
const showAuditLog = ref(false)

/**
 * Get icon class for provider type
 */
const iconMap: Record<string, string> = {
  teams: 'mdi mdi-microsoft-teams',
  outlook: 'mdi mdi-microsoft-outlook',
  calendar: 'mdi mdi-calendar',
  github: 'mdi mdi-github',
  slack: 'mdi mdi-slack',
  discord: 'mdi mdi-discord',
}

const getIconClass = (type: string): string => iconMap[type] || 'mdi mdi-cloud'

/**
 * Count providers by syncing status
 */
const syncingCount = computed(() => {
  return store.providers.filter(p => p.status === 'syncing').length
})

/**
 * Get filtered providers based on search and filter
 */
const filteredProviders = computed(() => {
  let filtered = store.providers

  if (selectedFilter.value !== 'all') {
    filtered = filtered.filter(p => p.status === selectedFilter.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.provider.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query) ||
      p.account.toLowerCase().includes(query)
    )
  }

  return filtered
})

/**
 * Get disconnected providers
 */
const disconnectedProviders = computed(() => getDisconnected())

/**
 * Get available providers data
 */
const availableProvidersData = computed(() => getAllAvailable().filter(p =>
  disconnectedProviders.value.some(d => d.type === p.type)
))

/**
 * Get audit log entries
 */
const auditEntries = computed(() => store.getAuditLog(undefined, 10))

/**
 * Format filter label
 */
const formatFilterLabel = (status: string): string => {
  const labels: Record<string, string> = {
    all: 'All',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Errors',
    syncing: 'Syncing',
  }
  return labels[status] || status
}

/**
 * Format time for audit log
 */
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  return date.toLocaleDateString()
}

/**
 * Get empty state message
 */
const getEmptyMessage = (): string => {
  if (searchQuery.value) return 'No providers match your search'
  if (selectedFilter.value !== 'all') return `No ${selectedFilter.value} providers`
  return 'No integrations connected yet. Add one to get started!'
}

/**
 * Handle provider connect
 */
const handleConnect = async (provider: ProviderType): Promise<void> => {
  store.setLoading(true)
  try {
    const success = await connectProvider(provider)
    if (success) {
      store.addAuditEntry({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Connected ${provider}`,
        provider,
        status: 'success',
      })
    }
  } finally {
    store.setLoading(false)
  }
}

/**
 * Handle provider disconnect
 */
const handleDisconnect = async (provider: ProviderType): Promise<void> => {
  if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return

  store.setLoading(true)
  try {
    const success = await disconnectProvider(provider)
    if (success) {
      store.addAuditEntry({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Disconnected ${provider}`,
        provider,
        status: 'success',
      })
    }
  } finally {
    store.setLoading(false)
  }
}

/**
 * Handle provider sync
 */
const handleSync = async (provider: ProviderType): Promise<void> => {
  store.addAuditEntry({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: `Started sync for ${provider}`,
    provider,
    status: 'success',
  })

  const success = await startSync(provider)
  
  store.addAuditEntry({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: `Completed sync for ${provider}`,
    provider,
    status: success ? 'success' : 'failure',
  })
}

/**
 * Handle provider settings
 */
const handleSettings = (provider: ProviderType): void => {
  store.selectProvider(provider)
  // TODO: Open settings modal
}

/**
 * Clear error message
 */
const clearError = (): void => {
  store.setError(null)
}

/**
 * Toggle audit log visibility
 */
const toggleAuditLog = (): void => {
  showAuditLog.value = !showAuditLog.value
}

/**
 * Load providers on mount
 */
onMounted(async () => {
  store.setLoading(true)
  try {
    const response = await fetch('/api/integrations/providers')
    const data = await response.json()
    store.initializeProviders(data)
  } catch (err) {
    console.error('Error loading providers:', err)
  } finally {
    store.setLoading(false)
  }
})
</script>

<style scoped>
.providers-integrations-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.view-header {
  margin-bottom: 32px;
}

.header-content {
  margin-bottom: 20px;
}

.header-content h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  margin: 8px 0 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.header-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 12px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-card.error {
  border-color: rgba(244, 67, 54, 0.3);
  background: rgba(244, 67, 54, 0.05);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  margin-bottom: 24px;
  color: #f44336;
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-banner p {
  margin: 0;
  flex: 1;
  font-size: 0.95rem;
}

.close-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.filters-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  border-radius: 20px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.filter-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.filter-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--surface-color);
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
}

.available-section {
  margin-bottom: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.available-section h2 {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.section-description {
  margin: 0 0 16px;
  color: var(--text-secondary);
}

.available-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.available-provider-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
  text-align: center;
  transition: all 0.2s ease;
}

.available-provider-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.provider-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  color: var(--primary-color);
}

.available-provider-card h4 {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.available-provider-card p {
  margin: 0 0 12px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.audit-section {
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.audit-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.toggle-btn:hover {
  color: var(--text-primary);
}

.audit-log {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-color);
}

.audit-entry {
  display: grid;
  grid-template-columns: 80px 1fr 120px 30px;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.85rem;
}

.audit-entry:last-child {
  border-bottom: none;
}

.audit-entry.status-failure {
  background: rgba(244, 67, 54, 0.05);
}

.audit-time {
  color: var(--text-secondary);
  font-weight: 500;
}

.audit-action {
  color: var(--text-primary);
}

.audit-provider {
  color: var(--text-secondary);
  text-transform: capitalize;
}

.audit-status {
  text-align: center;
  font-weight: 600;
}

.audit-entry.status-success .audit-status {
  color: #4caf50;
}

.audit-entry.status-failure .audit-status {
  color: #f44336;
}

/* CSS Variables */
:root {
  --primary-color: #2196f3;
  --border-color: #e0e0e0;
  --surface-color: #fafafa;
  --text-primary: #212121;
  --text-secondary: #666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #90caf9;
    --border-color: #424242;
    --surface-color: #303030;
    --text-primary: #fff;
    --text-secondary: #bbb;
  }
}

@media (max-width: 768px) {
  .providers-grid {
    grid-template-columns: 1fr;
  }

  .available-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .filters-section {
    flex-direction: column;
  }

  .search-input {
    min-width: auto;
  }

  .header-stats {
    grid-template-columns: 1fr;
  }
}
</style>
