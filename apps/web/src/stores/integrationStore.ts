import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Integration provider types
 */
export type ProviderType = 'teams' | 'outlook' | 'calendar' | 'github' | 'slack' | 'discord'

/**
 * Integration connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'pending'

/**
 * Permission scope interface
 */
export interface PermissionScope {
  id: string
  name: string
  description: string
  required: boolean
  granted: boolean
  expiresAt?: string
}

/**
 * Provider integration details
 */
export interface ProviderIntegration {
  id: string
  provider: ProviderType
  account: string
  email?: string
  status: ConnectionStatus
  connectedAt: string
  lastSyncAt?: string
  nextSyncAt?: string
  syncProgress: number
  error?: string
  permissions: PermissionScope[]
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  provider: ProviderType
  status: 'success' | 'failure'
  details?: string
}

/**
 * Sync status interface
 */
export interface SyncStatus {
  provider: ProviderType
  status: 'idle' | 'syncing' | 'error' | 'success'
  progress: number
  itemsProcessed: number
  totalItems: number
  error?: string
  lastSyncAt: string
  nextSyncAt?: string
}

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  calendar: string
  attendees: CalendarAttendee[]
  location?: string
  organizer: string
  description?: string
}

/**
 * Calendar attendee interface
 */
export interface CalendarAttendee {
  name: string
  email: string
  avatar?: string
  status: 'accepted' | 'declined' | 'tentative' | 'needs_action'
}

/**
 * Email message interface
 */
export interface EmailMessage {
  id: string
  from: string
  fromEmail: string
  avatar?: string
  subject: string
  preview: string
  timestamp: string
  unread: boolean
  starred: boolean
  hasAttachments: boolean
  attachmentCount: number
  threadId?: string
}

/**
 * Teams message interface
 */
export interface TeamsMessage {
  id: string
  sender: string
  senderEmail: string
  avatar?: string
  timestamp: string
  content: string
  attachments: MessageAttachment[]
  replies: number
  likes: number
  channel: string
}

/**
 * Message attachment interface
 */
export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
}

/**
 * Integration store state
 */
interface IntegrationState {
  providers: ProviderIntegration[]
  selectedProvider: ProviderType | null
  syncStatuses: Map<ProviderType, SyncStatus>
  auditLog: AuditLogEntry[]
  calendarEvents: CalendarEvent[]
  emails: EmailMessage[]
  teamsMessages: TeamsMessage[]
  loading: boolean
  error: string | null
  cacheExpiry: Map<string, number>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Pinia store for managing all integrations
 */
export const useIntegrationStore = defineStore('integration', () => {
  // State
  const providers = ref<ProviderIntegration[]>([])
  const selectedProvider = ref<ProviderType | null>(null)
  const syncStatuses = ref<Map<ProviderType, SyncStatus>>(new Map())
  const auditLog = ref<AuditLogEntry[]>([])
  const calendarEvents = ref<CalendarEvent[]>([])
  const emails = ref<EmailMessage[]>([])
  const teamsMessages = ref<TeamsMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cacheExpiry = ref<Map<string, number>>(new Map())

  // Getters
  /**
   * Get all connected providers
   */
  const connectedProviders = computed(() => 
    providers.value.filter(p => p.status === 'connected')
  )

  /**
   * Get providers by status
   */
  const providersByStatus = computed(() => (status: ConnectionStatus) =>
    providers.value.filter(p => p.status === status)
  )

  /**
   * Get provider by type
   */
  const getProvider = computed(() => (type: ProviderType) =>
    providers.value.find(p => p.provider === type)
  )

  /**
   * Get permissions for a provider
   */
  const getProviderPermissions = computed(() => (type: ProviderType) => {
    const provider = providers.value.find(p => p.provider === type)
    return provider?.permissions || []
  })

  /**
   * Get sync status for a provider
   */
  const getSyncStatus = computed(() => (type: ProviderType) =>
    syncStatuses.value.get(type)
  )

  /**
   * Get total connected integrations count
   */
  const connectedCount = computed(() => connectedProviders.value.length)

  /**
   * Get providers with sync errors
   */
  const providersWithErrors = computed(() =>
    providers.value.filter(p => p.error || p.status === 'error')
  )

  /**
   * Get pending permissions
   */
  const pendingPermissions = computed(() => {
    const pending: Array<{ provider: ProviderType; scope: PermissionScope }> = []
    providers.value.forEach(provider => {
      provider.permissions.forEach(scope => {
        if (!scope.granted) {
          pending.push({ provider: provider.provider, scope })
        }
      })
    })
    return pending
  })

  /**
   * Check if data is cached and not expired
   */
  const isCached = (key: string): boolean => {
    const expiry = cacheExpiry.value.get(key)
    return expiry ? expiry > Date.now() : false
  }

  /**
   * Set cache expiry
   */
  const setCache = (key: string): void => {
    cacheExpiry.value.set(key, Date.now() + CACHE_DURATION)
  }

  // Actions
  /**
   * Initialize providers
   */
  const initializeProviders = (data: ProviderIntegration[]): void => {
    providers.value = data
  }

  /**
   * Add or update a provider
   */
  const addProvider = (provider: ProviderIntegration): void => {
    const index = providers.value.findIndex(p => p.provider === provider.provider)
    if (index > -1) {
      providers.value[index] = provider
    } else {
      providers.value.push(provider)
    }
  }

  /**
   * Remove a provider
   */
  const removeProvider = (type: ProviderType): void => {
    providers.value = providers.value.filter(p => p.provider !== type)
  }

  /**
   * Update provider status
   */
  const updateProviderStatus = (type: ProviderType, status: ConnectionStatus, error?: string): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      provider.status = status
      provider.error = error
      if (status === 'connected' && error) {
        provider.error = undefined
      }
    }
  }

  /**
   * Update sync progress
   */
  const updateSyncProgress = (type: ProviderType, progress: number): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      provider.syncProgress = progress
    }
  }

  /**
   * Complete sync for provider
   */
  const completeSyncFor = (type: ProviderType): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      provider.lastSyncAt = new Date().toISOString()
      provider.syncProgress = 100
      provider.status = 'connected'
    }
  }

  /**
   * Start syncing for provider
   */
  const startSyncFor = (type: ProviderType): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      provider.status = 'syncing'
      provider.syncProgress = 0
    }
  }

  /**
   * Update permissions for provider
   */
  const updatePermissions = (type: ProviderType, permissions: PermissionScope[]): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      provider.permissions = permissions
    }
  }

  /**
   * Grant permission
   */
  const grantPermission = (type: ProviderType, scopeId: string): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      const scope = provider.permissions.find(s => s.id === scopeId)
      if (scope) {
        scope.granted = true
      }
    }
  }

  /**
   * Revoke permission
   */
  const revokePermission = (type: ProviderType, scopeId: string): void => {
    const provider = providers.value.find(p => p.provider === type)
    if (provider) {
      const scope = provider.permissions.find(s => s.id === scopeId)
      if (scope) {
        scope.granted = false
      }
    }
  }

  /**
   * Update sync status
   */
  const updateSyncStatus = (type: ProviderType, status: SyncStatus): void => {
    syncStatuses.value.set(type, status)
  }

  /**
   * Add audit log entry
   */
  const addAuditEntry = (entry: AuditLogEntry): void => {
    auditLog.value.unshift(entry)
  }

  /**
   * Get audit log for provider
   */
  const getAuditLog = (type?: ProviderType, limit: number = 50): AuditLogEntry[] => {
    let log = auditLog.value
    if (type) {
      log = log.filter(entry => entry.provider === type)
    }
    return log.slice(0, limit)
  }

  /**
   * Update calendar events
   */
  const updateCalendarEvents = (events: CalendarEvent[]): void => {
    calendarEvents.value = events
    setCache('calendar_events')
  }

  /**
   * Add calendar event
   */
  const addCalendarEvent = (event: CalendarEvent): void => {
    calendarEvents.value.push(event)
  }

  /**
   * Remove calendar event
   */
  const removeCalendarEvent = (id: string): void => {
    calendarEvents.value = calendarEvents.value.filter(e => e.id !== id)
  }

  /**
   * Get upcoming calendar events
   */
  const getUpcomingEvents = (limit: number = 10): CalendarEvent[] => {
    return calendarEvents.value
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limit)
  }

  /**
   * Update emails
   */
  const updateEmails = (messages: EmailMessage[]): void => {
    emails.value = messages
    setCache('emails')
  }

  /**
   * Add email
   */
  const addEmail = (email: EmailMessage): void => {
    emails.value.unshift(email)
  }

  /**
   * Toggle email star
   */
  const toggleEmailStar = (id: string): void => {
    const email = emails.value.find(e => e.id === id)
    if (email) {
      email.starred = !email.starred
    }
  }

  /**
   * Mark email as read
   */
  const markEmailAsRead = (id: string): void => {
    const email = emails.value.find(e => e.id === id)
    if (email) {
      email.unread = false
    }
  }

  /**
   * Get unread emails count
   */
  const getUnreadEmailsCount = (): number => {
    return emails.value.filter(e => e.unread).length
  }

  /**
   * Update Teams messages
   */
  const updateTeamsMessages = (messages: TeamsMessage[]): void => {
    teamsMessages.value = messages
    setCache('teams_messages')
  }

  /**
   * Add Teams message
   */
  const addTeamsMessage = (message: TeamsMessage): void => {
    teamsMessages.value.unshift(message)
  }

  /**
   * Get Teams messages by channel
   */
  const getTeamsMessagesByChannel = (channel: string): TeamsMessage[] => {
    return teamsMessages.value.filter(m => m.channel === channel)
  }

  /**
   * Select provider
   */
  const selectProvider = (type: ProviderType | null): void => {
    selectedProvider.value = type
  }

  /**
   * Set loading state
   */
  const setLoading = (isLoading: boolean): void => {
    loading.value = isLoading
  }

  /**
   * Set error
   */
  const setError = (errorMessage: string | null): void => {
    error.value = errorMessage
  }

  /**
   * Clear all data
   */
  const clearAll = (): void => {
    providers.value = []
    selectedProvider.value = null
    syncStatuses.value.clear()
    auditLog.value = []
    calendarEvents.value = []
    emails.value = []
    teamsMessages.value = []
    error.value = null
  }

  /**
   * Get provider stats
   */
  const getProviderStats = () => ({
    total: providers.value.length,
    connected: connectedProviders.value.length,
    syncing: providers.value.filter(p => p.status === 'syncing').length,
    errors: providersWithErrors.value.length,
    lastSync: providers.value
      .filter(p => p.lastSyncAt)
      .map(p => new Date(p.lastSyncAt!).getTime())
      .reduce((max, curr) => curr > max ? curr : max, 0) || 0,
  })

  return {
    // State
    providers,
    selectedProvider,
    syncStatuses,
    auditLog,
    calendarEvents,
    emails,
    teamsMessages,
    loading,
    error,
    cacheExpiry,

    // Computed
    connectedProviders,
    providersByStatus,
    getProvider,
    getProviderPermissions,
    getSyncStatus,
    connectedCount,
    providersWithErrors,
    pendingPermissions,
    isCached,

    // Actions
    initializeProviders,
    addProvider,
    removeProvider,
    updateProviderStatus,
    updateSyncProgress,
    completeSyncFor,
    startSyncFor,
    updatePermissions,
    grantPermission,
    revokePermission,
    updateSyncStatus,
    addAuditEntry,
    getAuditLog,
    updateCalendarEvents,
    addCalendarEvent,
    removeCalendarEvent,
    getUpcomingEvents,
    updateEmails,
    addEmail,
    toggleEmailStar,
    markEmailAsRead,
    getUnreadEmailsCount,
    updateTeamsMessages,
    addTeamsMessage,
    getTeamsMessagesByChannel,
    selectProvider,
    setLoading,
    setError,
    clearAll,
    getProviderStats,
    setCache,
  }
})
